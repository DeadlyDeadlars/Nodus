package com.nodus.p2p

import android.content.Context
import android.util.Log
import io.libp2p.core.Host
import io.libp2p.core.PeerId
import io.libp2p.core.Stream
import io.libp2p.core.crypto.PrivKey
import io.libp2p.core.dsl.host
import io.libp2p.core.multiformats.Multiaddr
import io.libp2p.core.multiformats.Protocol
import io.libp2p.security.noise.NoiseXXSecureChannel
import io.libp2p.transport.tcp.TcpTransport
import io.libp2p.core.mux.StreamMuxerProtocol
import io.libp2p.protocol.Ping
import io.libp2p.discovery.MDnsDiscovery
import kotlinx.coroutines.*
import java.io.File
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.CopyOnWriteArrayList
import com.google.gson.Gson
import javax.crypto.Cipher
import javax.crypto.spec.GCMParameterSpec
import javax.crypto.spec.SecretKeySpec
import java.security.SecureRandom
import android.util.Base64
import java.net.InetAddress

data class NodusMessage(
    val id: String,
    val from: String,
    val to: String,
    val content: String,
    val timestamp: Long,
    val type: String = "text",
    val encrypted: Boolean = true,
    val replyTo: String? = null
)

enum class NodeRole {
    USER,      // Обычный пользователь
    RELAY,     // Помогает передавать трафик
    BOOTSTRAP  // Помогает находить пиров
}

data class PeerInfo(
    val peerId: String,
    var username: String? = null,
    var alias: String? = null,
    var avatar: String? = null,
    var bio: String? = null,
    var publicKey: String? = null,
    var lastSeen: Long = System.currentTimeMillis(),
    var isOnline: Boolean = false,
    var addresses: MutableList<String> = mutableListOf()
)

data class UserProfile(
    val peerId: String,
    val username: String?,
    val alias: String?,
    val avatar: String?,
    val bio: String?,
    val publicKey: String
)

interface NodeEventListener {
    fun onNodeStarted(peerId: String, addresses: List<String>)
    fun onPeerDiscovered(peer: PeerInfo)
    fun onPeerConnected(peerId: String)
    fun onPeerDisconnected(peerId: String)
    fun onMessageReceived(message: NodusMessage)
    fun onMessageSent(messageId: String, success: Boolean)
    fun onMessageDelivered(messageId: String)
    fun onMessageRead(messageId: String)
    fun onTyping(peerId: String, isTyping: Boolean)
    fun onError(error: String)
}

class NodusNode(private val context: Context) {
    companion object {
        private const val TAG = "NodusNode"
        private const val KEY_FILE = "nodus_key.dat"
        private const val PROFILE_FILE = "nodus_profile.json"
        private const val PEERS_FILE = "nodus_peers.json"
        private const val ROLE_FILE = "nodus_role.txt"
        private const val DEFAULT_PORT = 4001
        
        val BOOTSTRAP_NODES = listOf(
            "/dnsaddr/bootstrap.libp2p.io/p2p/QmNnooDu7bfjPFoTZYxMNLWUQJyrVwtbZg5gBMjTezGAJN",
            "/dnsaddr/bootstrap.libp2p.io/p2p/QmQCU2EcMqAqQPR2i9bChDtGNJchTbq5TbXJJ16u19uLTa",
            "/dnsaddr/bootstrap.libp2p.io/p2p/QmbLHAnMoJPWSCR5Zhtx6BHJX9KiKNN6tpvbUcqanj75Nb"
        )
        
        // Public relay nodes for NAT traversal
        val RELAY_NODES = listOf(
            "/ip4/147.75.195.153/tcp/4001/p2p/QmW9m57aiBDHAkKj9nmFSEn7ZqrcF1fZS4bipsTCHburei",
            "/ip4/147.75.70.221/tcp/4001/p2p/Qme8g49gm3q4Acp7xWBKg3nAa9fxZ1YmyDJdyGgoG6LsXh"
        )
    }

    private var host: Host? = null
    private var privateKey: PrivKey? = null
    private var mdnsDiscovery: MDnsDiscovery? = null
    private var signalingClient: SignalingClient? = null
    var relayClient: RelayClient? = null
        private set
    private val scope = CoroutineScope(Dispatchers.IO + SupervisorJob())
    private val listeners = CopyOnWriteArrayList<NodeEventListener>()
    private val connectedPeers = ConcurrentHashMap<String, NodusProtocolController>()
    private val knownPeers = ConcurrentHashMap<String, PeerInfo>()
    private val pendingMessages = ConcurrentHashMap<String, WireMessage>()
    private val sharedSecrets = ConcurrentHashMap<String, ByteArray>()
    private val gson = Gson()
    private var userProfile: UserProfile? = null
    private var nodusProtocol: NodusProtocol? = null
    
    // Node role
    private var _nodeRole: NodeRole = NodeRole.USER
    val nodeRole: NodeRole get() = _nodeRole
    
    // Relay stats
    private var relayedMessages: Long = 0
    private var relayedBytes: Long = 0
    
    // Bootstrap stats  
    private var peerRequests: Long = 0
    
    val peerId: String? get() = host?.peerId?.toBase58()
    val isRunning: Boolean get() = host != null
    val addresses: List<String> get() = host?.listenAddresses()?.map { it.toString() } ?: emptyList()
    
    fun getRelayStats(): Pair<Long, Long> = Pair(relayedMessages, relayedBytes)
    fun getBootstrapStats(): Long = peerRequests

    fun addListener(listener: NodeEventListener) = listeners.add(listener)
    fun removeListener(listener: NodeEventListener) = listeners.remove(listener)
    
    fun setNodeRole(role: NodeRole) {
        _nodeRole = role
        // Save role
        try {
            File(context.filesDir, ROLE_FILE).writeText(role.name)
        } catch (e: Exception) {
            Log.w(TAG, "Failed to save role", e)
        }
        Log.i(TAG, "Node role set to: $role")
    }
    
    private fun loadNodeRole(): NodeRole {
        return try {
            val file = File(context.filesDir, ROLE_FILE)
            if (file.exists()) {
                NodeRole.valueOf(file.readText().trim())
            } else {
                NodeRole.USER
            }
        } catch (e: Exception) {
            NodeRole.USER
        }
    }

    fun start() {
        scope.launch {
            try {
                privateKey = loadOrCreateKey()
                _nodeRole = loadNodeRole()
                loadPeers()
                
                nodusProtocol = NodusProtocol { message, stream ->
                    handleIncomingMessage(message, stream)
                }
                
                host = host {
                    identity { privateKey!! }
                    transports { add(::TcpTransport) }
                    secureChannels { add(::NoiseXXSecureChannel) }
                    muxers { + StreamMuxerProtocol.Mplex }
                    protocols { 
                        + Ping()
                        add(nodusProtocol!!)
                    }
                    network { 
                        listen("/ip4/0.0.0.0/tcp/0")
                    }
                }
                
                host?.start()?.get()
                
                // Start mDNS discovery for local network
                startMdnsDiscovery()
                
                val myPeerId = host?.peerId?.toBase58() ?: "unknown"
                val myAddresses = addresses
                Log.i(TAG, "Node started: $myPeerId (role: $_nodeRole)")
                Log.i(TAG, "Listening on: $myAddresses")
                
                listeners.forEach { it.onNodeStarted(myPeerId, myAddresses) }
                
                // Start signaling client for peer discovery
                signalingClient = SignalingClient(this@NodusNode).also { it.start() }
                
                // Start relay client for message delivery through NAT
                relayClient = RelayClient(this@NodusNode).also { it.start() }
                
                // Connect to bootstrap and known peers
                connectToBootstrap()
                reconnectKnownPeers()
                
                // Start heartbeat
                startHeartbeat()
                
                // Start role-specific services
                when (_nodeRole) {
                    NodeRole.RELAY -> startRelayService()
                    NodeRole.BOOTSTRAP -> startBootstrapService()
                    NodeRole.USER -> { /* No extra services */ }
                }
                
            } catch (e: Exception) {
                Log.e(TAG, "Failed to start node", e)
                listeners.forEach { it.onError(e.message ?: "Unknown error") }
            }
        }
    }
    
    private fun startRelayService() {
        Log.i(TAG, "Starting RELAY service...")
        // Relay nodes accept relay requests and forward traffic
        // The relay protocol handler
        scope.launch {
            while (isActive) {
                delay(60_000)
                Log.i(TAG, "Relay stats: $relayedMessages messages, $relayedBytes bytes relayed")
            }
        }
    }
    
    private fun startBootstrapService() {
        Log.i(TAG, "Starting BOOTSTRAP service...")
        // Bootstrap nodes respond to peer discovery requests
        // They maintain a list of known peers and share it
        scope.launch {
            while (isActive) {
                delay(60_000)
                Log.i(TAG, "Bootstrap stats: $peerRequests peer requests served")
            }
        }
    }

    private fun startMdnsDiscovery() {
        try {
            mdnsDiscovery = MDnsDiscovery(host!!, "_nodus._udp.local", 60, null)
            mdnsDiscovery?.newPeerFoundListeners?.add { peerInfo ->
                val peerId = peerInfo.peerId.toBase58()
                Log.i(TAG, "mDNS discovered peer: $peerId")
                
                val info = knownPeers.getOrPut(peerId) { PeerInfo(peerId) }
                info.addresses.clear()
                info.addresses.addAll(peerInfo.addresses.map { it.toString() })
                info.isOnline = true
                info.lastSeen = System.currentTimeMillis()
                
                listeners.forEach { it.onPeerDiscovered(info) }
                
                // Auto-connect to discovered peers
                scope.launch {
                    connectToPeerById(peerId)
                }
            }
            mdnsDiscovery?.start()
            Log.i(TAG, "mDNS discovery started")
        } catch (e: Exception) {
            Log.w(TAG, "mDNS discovery failed to start", e)
        }
    }

    private fun startHeartbeat() {
        scope.launch {
            while (isActive) {
                delay(30_000) // Every 30 seconds
                
                // Check connected peers
                connectedPeers.forEach { (peerId, controller) ->
                    try {
                        // Send ping/presence
                        val presence = WireMessage(
                            id = System.currentTimeMillis().toString(),
                            type = "presence",
                            from = this@NodusNode.peerId ?: return@forEach,
                            to = peerId,
                            content = "online",
                            timestamp = System.currentTimeMillis()
                        )
                        controller.send(presence)
                    } catch (e: Exception) {
                        Log.w(TAG, "Heartbeat failed for $peerId", e)
                        handlePeerDisconnected(peerId)
                    }
                }
                
                // Retry pending messages
                retryPendingMessages()
                
                // Save peers periodically
                savePeers()
            }
        }
    }

    private fun retryPendingMessages() {
        // Pending messages handled in sendMessage now
    }

    fun stop() {
        scope.launch {
            try {
                savePeers()
                signalingClient?.stop()
                relayClient?.stop()
                mdnsDiscovery?.stop()
                connectedPeers.values.forEach { it.close() }
                connectedPeers.clear()
                host?.stop()?.get()
                host = null
                Log.i(TAG, "Node stopped")
            } catch (e: Exception) {
                Log.e(TAG, "Error stopping node", e)
            }
        }
    }
    
    fun getProfile(): UserProfile? = userProfile
    
    fun getPublicKeyBase64(): String {
        return try {
            android.util.Base64.encodeToString(privateKey?.publicKey()?.raw(), android.util.Base64.NO_WRAP)
        } catch (e: Exception) { "" }
    }
    
    fun getPrivateKeyBytes(): ByteArray {
        return try {
            privateKey?.raw() ?: ByteArray(0)
        } catch (e: Exception) { ByteArray(0) }
    }
    
    fun notifyMessageReceived(message: NodusMessage) {
        listeners.forEach { it.onMessageReceived(message) }
    }

    private fun loadOrCreateKey(): PrivKey {
        val keyFile = File(context.filesDir, KEY_FILE)
        return if (keyFile.exists()) {
            val bytes = keyFile.readBytes()
            io.libp2p.crypto.keys.unmarshalEd25519PrivateKey(bytes)
        } else {
            val (priv, _) = io.libp2p.crypto.keys.generateEd25519KeyPair()
            keyFile.writeBytes(priv.bytes())
            priv
        }
    }

    private fun loadPeers() {
        try {
            val file = File(context.filesDir, PEERS_FILE)
            if (file.exists()) {
                val json = file.readText()
                val peers = gson.fromJson(json, Array<PeerInfo>::class.java)
                peers?.forEach { knownPeers[it.peerId] = it }
                Log.i(TAG, "Loaded ${knownPeers.size} known peers")
            }
        } catch (e: Exception) {
            Log.w(TAG, "Failed to load peers", e)
        }
    }

    private fun savePeers() {
        try {
            val file = File(context.filesDir, PEERS_FILE)
            val json = gson.toJson(knownPeers.values.toList())
            file.writeText(json)
        } catch (e: Exception) {
            Log.w(TAG, "Failed to save peers", e)
        }
    }

    fun setProfile(username: String?, alias: String?, avatar: String?, bio: String?) {
        val pubKeyBytes = privateKey?.publicKey()?.bytes() ?: return
        val pubKeyBase64 = Base64.encodeToString(pubKeyBytes, Base64.NO_WRAP)
        
        userProfile = UserProfile(
            peerId = peerId ?: return,
            username = username,
            alias = alias,
            avatar = avatar,
            bio = bio,
            publicKey = pubKeyBase64
        )
        
        // Save profile
        try {
            val file = File(context.filesDir, PROFILE_FILE)
            file.writeText(gson.toJson(userProfile))
        } catch (e: Exception) {
            Log.w(TAG, "Failed to save profile", e)
        }
        
        // Broadcast profile to connected peers
        broadcastProfile()
    }

    private fun broadcastProfile() {
        val profile = userProfile ?: return
        connectedPeers.forEach { (peerId, controller) ->
            val message = WireMessage(
                id = System.currentTimeMillis().toString(),
                type = "profile",
                from = this.peerId ?: return@forEach,
                to = peerId,
                content = gson.toJson(profile),
                timestamp = System.currentTimeMillis()
            )
            controller.send(message)
        }
    }

    private suspend fun connectToBootstrap() {
        // Connect to bootstrap nodes
        BOOTSTRAP_NODES.forEach { addr ->
            try {
                val multiaddr = Multiaddr(addr)
                host?.network?.connect(multiaddr)?.get()
                Log.i(TAG, "Connected to bootstrap: $addr")
            } catch (e: Exception) {
                Log.w(TAG, "Failed to connect to bootstrap: $addr")
            }
        }
        
        // Connect to relay nodes for NAT traversal
        RELAY_NODES.forEach { addr ->
            try {
                val multiaddr = Multiaddr(addr)
                host?.network?.connect(multiaddr)?.get()
                Log.i(TAG, "Connected to relay: $addr")
            } catch (e: Exception) {
                Log.w(TAG, "Failed to connect to relay: $addr")
            }
        }
    }

    private fun reconnectKnownPeers() {
        knownPeers.forEach { (peerId, info) ->
            if (info.addresses.isNotEmpty()) {
                scope.launch {
                    try {
                        connectToPeerById(peerId)
                    } catch (e: Exception) {
                        Log.w(TAG, "Failed to reconnect to $peerId")
                    }
                }
            }
        }
    }

    fun connectToPeer(multiaddr: String): Boolean {
        return try {
            scope.launch {
                var connected = false
                
                // Try direct connection first
                try {
                    val addr = Multiaddr(multiaddr)
                    val connection = host?.network?.connect(addr)?.get()
                    
                    if (connection != null) {
                        val remotePeerId = connection.secureSession().remoteId.toBase58()
                        
                        val streamPromise = host?.newStream<NodusProtocolController>(
                            listOf(NodusProtocol.PROTOCOL_ID),
                            connection.secureSession().remoteId,
                            addr
                        )
                        
                        val controller = streamPromise?.controller?.get()
                        
                        if (controller != null) {
                            connectedPeers[remotePeerId] = controller
                            
                            val info = knownPeers.getOrPut(remotePeerId) { PeerInfo(remotePeerId) }
                            info.addresses.add(multiaddr)
                            info.isOnline = true
                            info.lastSeen = System.currentTimeMillis()
                            
                            listeners.forEach { it.onPeerConnected(remotePeerId) }
                            broadcastProfile()
                            
                            Log.i(TAG, "Connected to peer (direct): $remotePeerId")
                            connected = true
                        }
                    }
                } catch (e: Exception) {
                    Log.w(TAG, "Direct connection failed, trying relay...")
                }
                
                // If direct failed, try via relay
                if (!connected) {
                    val peerIdStr = extractPeerId(multiaddr)
                    if (peerIdStr != null) {
                        for (relayAddr in RELAY_NODES) {
                            try {
                                // Circuit relay address format: /relay-addr/p2p-circuit/p2p/target-peer
                                val relayedAddr = "$relayAddr/p2p-circuit/p2p/$peerIdStr"
                                val addr = Multiaddr(relayedAddr)
                                val connection = host?.network?.connect(addr)?.get()
                                
                                if (connection != null) {
                                    val remotePeerId = connection.secureSession().remoteId.toBase58()
                                    
                                    val streamPromise = host?.newStream<NodusProtocolController>(
                                        listOf(NodusProtocol.PROTOCOL_ID),
                                        connection.secureSession().remoteId,
                                        addr
                                    )
                                    
                                    val controller = streamPromise?.controller?.get()
                                    
                                    if (controller != null) {
                                        connectedPeers[remotePeerId] = controller
                                        
                                        val info = knownPeers.getOrPut(remotePeerId) { PeerInfo(remotePeerId) }
                                        info.addresses.add(relayedAddr)
                                        info.isOnline = true
                                        info.lastSeen = System.currentTimeMillis()
                                        
                                        listeners.forEach { it.onPeerConnected(remotePeerId) }
                                        broadcastProfile()
                                        
                                        Log.i(TAG, "Connected to peer (relay): $remotePeerId")
                                        connected = true
                                        break
                                    }
                                }
                            } catch (e: Exception) {
                                Log.w(TAG, "Relay connection failed: ${e.message}")
                            }
                        }
                    }
                }
                
                if (!connected) {
                    listeners.forEach { it.onError("Не удалось подключиться к пиру") }
                }
            }
            true
        } catch (e: Exception) {
            Log.e(TAG, "Failed to connect to peer", e)
            listeners.forEach { it.onError("Connection failed: ${e.message}") }
            false
        }
    }
    
    private fun extractPeerId(multiaddr: String): String? {
        // Extract peer ID from multiaddr like /ip4/.../p2p/QmXxx or just QmXxx
        return if (multiaddr.contains("/p2p/")) {
            multiaddr.substringAfterLast("/p2p/")
        } else if (multiaddr.startsWith("Qm") || multiaddr.startsWith("12D3")) {
            multiaddr
        } else {
            null
        }
    }

    private suspend fun connectToPeerById(targetPeerId: String) {
        if (connectedPeers.containsKey(targetPeerId)) return
        
        val info = knownPeers[targetPeerId] ?: return
        for (addr in info.addresses) {
            try {
                if (connectToPeer(addr)) return
            } catch (e: Exception) {
                continue
            }
        }
    }

    private fun handleIncomingMessage(wireMessage: WireMessage, stream: Stream) {
        val remotePeerId = stream.remotePeerId().toBase58()
        Log.d(TAG, "Received ${wireMessage.type} from $remotePeerId")
        
        when (wireMessage.type) {
            "text", "voice", "video", "file" -> {
                // Check if this message is for us or needs relaying
                if (wireMessage.to == peerId) {
                    // Message is for us
                    val content = if (wireMessage.metadata?.get("encrypted") == "true") {
                        decryptContent(wireMessage.content, remotePeerId) ?: wireMessage.content
                    } else {
                        wireMessage.content
                    }
                    
                    val message = NodusMessage(
                        id = wireMessage.id,
                        from = wireMessage.from,
                        to = wireMessage.to,
                        content = content,
                        timestamp = wireMessage.timestamp,
                        type = wireMessage.type,
                        replyTo = wireMessage.replyTo
                    )
                    
                    listeners.forEach { it.onMessageReceived(message) }
                    sendAck(remotePeerId, wireMessage.id, "delivered")
                } else if (_nodeRole == NodeRole.RELAY) {
                    // We are a relay - forward the message
                    relayMessage(wireMessage)
                }
            }
            
            "relay" -> {
                // Relay request - only handle if we are a relay node
                if (_nodeRole == NodeRole.RELAY) {
                    handleRelayRequest(wireMessage, stream)
                }
            }
            
            "peer_request" -> {
                // Peer discovery request - only handle if we are a bootstrap node
                if (_nodeRole == NodeRole.BOOTSTRAP) {
                    handlePeerRequest(wireMessage, stream)
                }
            }
            
            "peer_list" -> {
                // Received peer list from bootstrap node
                handlePeerList(wireMessage)
            }
            
            "search_request" -> {
                // Someone is searching for a user
                handleSearchRequest(wireMessage, stream)
            }
            
            "search_result" -> {
                // Received search results
                handleSearchResult(wireMessage)
            }
            
            "ack" -> {
                val ackType = wireMessage.metadata?.get("ackType")
                val messageId = wireMessage.content
                
                pendingMessages.remove(messageId)
                
                when (ackType) {
                    "delivered" -> listeners.forEach { it.onMessageDelivered(messageId) }
                    "read" -> listeners.forEach { it.onMessageRead(messageId) }
                }
            }
            
            "typing" -> {
                val isTyping = wireMessage.content == "true"
                listeners.forEach { it.onTyping(remotePeerId, isTyping) }
            }
            
            "profile" -> {
                try {
                    val profile = gson.fromJson(wireMessage.content, UserProfile::class.java)
                    val info = knownPeers.getOrPut(remotePeerId) { PeerInfo(remotePeerId) }
                    info.username = profile.username
                    info.alias = profile.alias
                    info.avatar = profile.avatar
                    info.bio = profile.bio
                    info.publicKey = profile.publicKey
                    info.isOnline = true
                    info.lastSeen = System.currentTimeMillis()
                    
                    deriveSharedSecret(remotePeerId, profile.publicKey)
                    
                    listeners.forEach { it.onPeerDiscovered(info) }
                    savePeers()
                } catch (e: Exception) {
                    Log.w(TAG, "Failed to parse profile", e)
                }
            }
            
            "presence" -> {
                val info = knownPeers.getOrPut(remotePeerId) { PeerInfo(remotePeerId) }
                info.isOnline = wireMessage.content == "online"
                info.lastSeen = System.currentTimeMillis()
            }
        }
    }
    
    // RELAY NODE FUNCTIONS
    private fun relayMessage(message: WireMessage) {
        val targetPeerId = message.to
        val controller = connectedPeers[targetPeerId]
        
        if (controller != null) {
            // Forward the message
            val relayedMessage = message.copy(
                metadata = (message.metadata ?: emptyMap()) + ("relayed_by" to (peerId ?: ""))
            )
            if (controller.send(relayedMessage)) {
                relayedMessages++
                relayedBytes += message.content.length
                Log.i(TAG, "Relayed message from ${message.from} to ${message.to}")
            }
        } else {
            Log.w(TAG, "Cannot relay - target peer $targetPeerId not connected")
        }
    }
    
    private fun handleRelayRequest(message: WireMessage, stream: Stream) {
        // Someone wants us to relay their messages
        val requesterPeerId = stream.remotePeerId().toBase58()
        Log.i(TAG, "Relay request from $requesterPeerId")
        
        // Send confirmation
        val response = WireMessage(
            id = System.currentTimeMillis().toString(),
            type = "relay_confirm",
            from = peerId ?: return,
            to = requesterPeerId,
            content = "accepted",
            timestamp = System.currentTimeMillis()
        )
        connectedPeers[requesterPeerId]?.send(response)
    }
    
    // BOOTSTRAP NODE FUNCTIONS
    private fun handlePeerRequest(message: WireMessage, stream: Stream) {
        val requesterPeerId = stream.remotePeerId().toBase58()
        peerRequests++
        Log.i(TAG, "Peer request from $requesterPeerId")
        
        // Send list of known online peers
        val onlinePeers = knownPeers.values
            .filter { it.isOnline && it.peerId != requesterPeerId }
            .take(20)
            .map { mapOf(
                "peerId" to it.peerId,
                "addresses" to it.addresses,
                "username" to it.username,
                "alias" to it.alias
            )}
        
        val response = WireMessage(
            id = System.currentTimeMillis().toString(),
            type = "peer_list",
            from = peerId ?: return,
            to = requesterPeerId,
            content = gson.toJson(onlinePeers),
            timestamp = System.currentTimeMillis()
        )
        connectedPeers[requesterPeerId]?.send(response)
    }
    
    private fun handlePeerList(message: WireMessage) {
        try {
            val type = object : com.google.gson.reflect.TypeToken<Array<Map<String, Any>>>() {}.type
            val peers: Array<Map<String, Any>>? = gson.fromJson(message.content, type)
            peers?.forEach { peerData ->
                val peerId = peerData["peerId"] as? String ?: return@forEach
                if (peerId == this.peerId) return@forEach
                
                val info = knownPeers.getOrPut(peerId) { PeerInfo(peerId) }
                (peerData["addresses"] as? List<*>)?.forEach { addr ->
                    val addrStr = addr as? String ?: return@forEach
                    if (addrStr !in info.addresses) info.addresses.add(addrStr)
                }
                info.username = peerData["username"] as? String
                info.alias = peerData["alias"] as? String
                
                listeners.forEach { it.onPeerDiscovered(info) }
            }
            Log.i(TAG, "Received ${peers?.size ?: 0} peers from bootstrap")
        } catch (e: Exception) {
            Log.w(TAG, "Failed to parse peer list", e)
        }
    }
    
    private fun handleSearchRequest(message: WireMessage, stream: Stream) {
        val query = message.content.lowercase()
        val requesterPeerId = stream.remotePeerId().toBase58()
        
        // Search in our known peers
        val results = knownPeers.values.filter {
            it.username?.lowercase()?.contains(query) == true ||
            it.alias?.lowercase()?.contains(query) == true
        }.take(10).map { mapOf(
            "peerId" to it.peerId,
            "username" to it.username,
            "alias" to it.alias,
            "avatar" to it.avatar,
            "bio" to it.bio,
            "isOnline" to it.isOnline,
            "addresses" to it.addresses
        )}
        
        // Also check if our own profile matches
        val myResults = if (userProfile?.username?.lowercase()?.contains(query) == true ||
                           userProfile?.alias?.lowercase()?.contains(query) == true) {
            listOf(mapOf(
                "peerId" to peerId,
                "username" to userProfile?.username,
                "alias" to userProfile?.alias,
                "avatar" to userProfile?.avatar,
                "bio" to userProfile?.bio,
                "isOnline" to true,
                "addresses" to addresses
            ))
        } else emptyList()
        
        val allResults = myResults + results
        
        if (allResults.isNotEmpty()) {
            val response = WireMessage(
                id = System.currentTimeMillis().toString(),
                type = "search_result",
                from = peerId ?: return,
                to = requesterPeerId,
                content = gson.toJson(allResults),
                timestamp = System.currentTimeMillis()
            )
            connectedPeers[requesterPeerId]?.send(response)
        }
        
        Log.i(TAG, "Search request for '$query' from $requesterPeerId, found ${allResults.size} results")
    }
    
    private fun handleSearchResult(message: WireMessage) {
        try {
            val type = object : com.google.gson.reflect.TypeToken<List<Map<String, Any>>>() {}.type
            val results: List<Map<String, Any>>? = gson.fromJson(message.content, type)
            results?.forEach { peerData ->
                val peerId = peerData["peerId"] as? String ?: return@forEach
                if (peerId == this.peerId) return@forEach
                
                val info = knownPeers.getOrPut(peerId) { PeerInfo(peerId) }
                info.username = peerData["username"] as? String
                info.alias = peerData["alias"] as? String
                info.avatar = peerData["avatar"] as? String
                info.bio = peerData["bio"] as? String
                info.isOnline = peerData["isOnline"] as? Boolean ?: false
                (peerData["addresses"] as? List<*>)?.forEach { addr ->
                    val addrStr = addr as? String ?: return@forEach
                    if (addrStr !in info.addresses) info.addresses.add(addrStr)
                }
                
                listeners.forEach { it.onPeerDiscovered(info) }
            }
            Log.i(TAG, "Received ${results?.size ?: 0} search results")
        } catch (e: Exception) {
            Log.w(TAG, "Failed to parse search results", e)
        }
    }
    
    fun requestPeersFromBootstrap() {
        // Ask connected bootstrap nodes for peer list
        scope.launch {
            connectedPeers.forEach { (peerId, controller) ->
                val request = WireMessage(
                    id = System.currentTimeMillis().toString(),
                    type = "peer_request",
                    from = this@NodusNode.peerId ?: return@forEach,
                    to = peerId,
                    content = "",
                    timestamp = System.currentTimeMillis()
                )
                controller.send(request)
            }
        }
    }
    
    fun searchByUsername(username: String) {
        val query = username.lowercase().trim().removePrefix("@")
        if (query.isEmpty()) return
        
        Log.d(TAG, "Searching for: $query")
        
        scope.launch {
            // Search in known peers first
            val localResults = knownPeers.values.filter { 
                it.username?.lowercase()?.contains(query) == true ||
                it.alias?.lowercase()?.contains(query) == true
            }
            Log.d(TAG, "Local results: ${localResults.size}")
            localResults.forEach { listeners.forEach { l -> l.onPeerDiscovered(it) } }
            
            // Search via relay server
            val relayResults = relayClient?.searchByUsername(query) ?: emptyList()
            Log.d(TAG, "Relay results: ${relayResults.size}")
            relayResults.forEach { peer ->
                if (peer.peerId != peerId) {
                    knownPeers[peer.peerId] = peer
                    listeners.forEach { l -> l.onPeerDiscovered(peer) }
                }
            }
        }
    }

    private fun sendAck(toPeerId: String, messageId: String, ackType: String) {
        val controller = connectedPeers[toPeerId] ?: return
        val ack = WireMessage(
            id = System.currentTimeMillis().toString(),
            type = "ack",
            from = peerId ?: return,
            to = toPeerId,
            content = messageId,
            timestamp = System.currentTimeMillis(),
            metadata = mapOf("ackType" to ackType)
        )
        controller.send(ack)
    }

    private fun handlePeerDisconnected(targetPeerId: String) {
        connectedPeers.remove(targetPeerId)
        knownPeers[targetPeerId]?.isOnline = false
        listeners.forEach { it.onPeerDisconnected(targetPeerId) }
    }

    fun sendMessage(toPeerId: String, content: String, type: String = "text", replyTo: String? = null): String {
        val messageId = "${System.currentTimeMillis()}_${(0..9999).random()}"
        
        scope.launch {
            val controller = connectedPeers[toPeerId]
            
            if (controller != null) {
                // Direct connection - use encryption
                val (encryptedContent, isEncrypted) = encryptContent(content, toPeerId)
                val wireMessage = WireMessage(
                    id = messageId,
                    type = type,
                    from = peerId ?: return@launch,
                    to = toPeerId,
                    content = encryptedContent,
                    timestamp = System.currentTimeMillis(),
                    replyTo = replyTo,
                    metadata = if (isEncrypted) mapOf("encrypted" to "true") else null
                )
                val success = controller.send(wireMessage)
                listeners.forEach { it.onMessageSent(messageId, success) }
            } else {
                // No direct connection - use relay without encryption
                val success = relayClient?.sendMessage(toPeerId, content, type) != null
                Log.i(TAG, "Message sent via relay to $toPeerId: $success")
                listeners.forEach { it.onMessageSent(messageId, success) }
            }
        }
        
        return messageId
    }

    fun sendTyping(toPeerId: String, isTyping: Boolean) {
        val controller = connectedPeers[toPeerId] ?: return
        val message = WireMessage(
            id = System.currentTimeMillis().toString(),
            type = "typing",
            from = peerId ?: return,
            to = toPeerId,
            content = isTyping.toString(),
            timestamp = System.currentTimeMillis()
        )
        controller.send(message)
    }

    fun markAsRead(fromPeerId: String, messageId: String) {
        sendAck(fromPeerId, messageId, "read")
    }

    // E2E Encryption using X25519 + AES-GCM
    private fun deriveSharedSecret(targetPeerId: String, theirPublicKeyBase64: String) {
        try {
            // For now, use a simple key derivation
            // In production, use proper X25519 key exchange
            val theirPubKey = Base64.decode(theirPublicKeyBase64, Base64.NO_WRAP)
            val myPrivKey = privateKey?.bytes() ?: return
            
            // Simple shared secret derivation (XOR + hash)
            val combined = ByteArray(32)
            for (i in 0 until minOf(32, theirPubKey.size, myPrivKey.size)) {
                combined[i] = (theirPubKey[i].toInt() xor myPrivKey[i].toInt()).toByte()
            }
            
            val digest = java.security.MessageDigest.getInstance("SHA-256")
            sharedSecrets[targetPeerId] = digest.digest(combined)
            
            Log.d(TAG, "Derived shared secret for $targetPeerId")
        } catch (e: Exception) {
            Log.w(TAG, "Failed to derive shared secret", e)
        }
    }

    private fun encryptContent(content: String, toPeerId: String): Pair<String, Boolean> {
        val secret = sharedSecrets[toPeerId] ?: return Pair(content, false)
        
        return try {
            val iv = ByteArray(12)
            SecureRandom().nextBytes(iv)
            
            val cipher = Cipher.getInstance("AES/GCM/NoPadding")
            val keySpec = SecretKeySpec(secret, "AES")
            val gcmSpec = GCMParameterSpec(128, iv)
            cipher.init(Cipher.ENCRYPT_MODE, keySpec, gcmSpec)
            
            val encrypted = cipher.doFinal(content.toByteArray(Charsets.UTF_8))
            val combined = iv + encrypted
            
            Pair(Base64.encodeToString(combined, Base64.NO_WRAP), true)
        } catch (e: Exception) {
            Log.w(TAG, "Encryption failed", e)
            Pair(content, false)
        }
    }

    private fun decryptContent(encryptedContent: String, fromPeerId: String): String? {
        val secret = sharedSecrets[fromPeerId] ?: return null
        
        return try {
            val combined = Base64.decode(encryptedContent, Base64.NO_WRAP)
            val iv = combined.copyOfRange(0, 12)
            val encrypted = combined.copyOfRange(12, combined.size)
            
            val cipher = Cipher.getInstance("AES/GCM/NoPadding")
            val keySpec = SecretKeySpec(secret, "AES")
            val gcmSpec = GCMParameterSpec(128, iv)
            cipher.init(Cipher.DECRYPT_MODE, keySpec, gcmSpec)
            
            String(cipher.doFinal(encrypted), Charsets.UTF_8)
        } catch (e: Exception) {
            Log.w(TAG, "Decryption failed", e)
            null
        }
    }

    fun getConnectedPeers(): List<String> = connectedPeers.keys.toList()
    fun getKnownPeers(): List<PeerInfo> = knownPeers.values.toList()
    fun getPeerInfo(targetPeerId: String): PeerInfo? = knownPeers[targetPeerId]
    fun isConnected(targetPeerId: String): Boolean = connectedPeers.containsKey(targetPeerId)

    fun addPeer(targetPeerId: String, address: String? = null) {
        val info = knownPeers.getOrPut(targetPeerId) { PeerInfo(targetPeerId) }
        if (address != null && address !in info.addresses) {
            info.addresses.add(address)
        }
        savePeers()
        
        // Try to connect
        scope.launch {
            connectToPeerById(targetPeerId)
        }
    }

    fun removePeer(targetPeerId: String) {
        connectedPeers[targetPeerId]?.close()
        connectedPeers.remove(targetPeerId)
        knownPeers.remove(targetPeerId)
        sharedSecrets.remove(targetPeerId)
        savePeers()
    }

    fun destroy() {
        stop()
        scope.cancel()
    }
}
