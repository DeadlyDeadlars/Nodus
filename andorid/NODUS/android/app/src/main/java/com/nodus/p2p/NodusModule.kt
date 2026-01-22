package com.nodus.p2p

import com.facebook.react.bridge.*
import com.facebook.react.modules.core.DeviceEventManagerModule

class NodusModule(private val reactContext: ReactApplicationContext) : 
    ReactContextBaseJavaModule(reactContext), NodeEventListener {

    companion object {
        const val NAME = "NodusP2P"
    }

    override fun getName() = NAME

    override fun initialize() {
        super.initialize()
        NodusService.setModuleListener(this)
        android.util.Log.i("NodusModule", "Module initialized, listener set")
    }

    override fun invalidate() {
        NodusService.setModuleListener(null)
        super.invalidate()
    }

    private fun emit(event: String, data: WritableMap) {
        if (reactContext.hasActiveReactInstance()) {
            reactContext.getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                .emit(event, data)
        }
    }

    @ReactMethod
    fun start() {
        NodusService.start(reactContext)
    }

    @ReactMethod
    fun stop() {
        NodusService.stop(reactContext)
    }

    @ReactMethod
    fun getPeerId(promise: Promise) {
        promise.resolve(NodusService.getInstance()?.getPeerId())
    }

    @ReactMethod
    fun getAddresses(promise: Promise) {
        val addresses = NodusService.getInstance()?.getNode()?.addresses ?: emptyList()
        val array = Arguments.createArray()
        addresses.forEach { array.pushString(it) }
        promise.resolve(array)
    }

    @ReactMethod
    fun isRunning(promise: Promise) {
        promise.resolve(NodusService.getInstance()?.getNode()?.isRunning ?: false)
    }

    @ReactMethod
    fun getNodeInfo(promise: Promise) {
        val node = NodusService.getInstance()?.getNode()
        val map = Arguments.createMap().apply {
            putString("peerId", node?.peerId)
            putBoolean("isRunning", node?.isRunning ?: false)
            putString("role", node?.nodeRole?.name?.lowercase() ?: "user")
            val addrs = Arguments.createArray()
            node?.addresses?.forEach { addrs.pushString(it) }
            putArray("addresses", addrs)
        }
        promise.resolve(map)
    }

    @ReactMethod
    fun setProfile(username: String?, alias: String?, avatar: String?, bio: String?) {
        NodusService.getInstance()?.getNode()?.setProfile(username, alias, avatar, bio)
    }

    @ReactMethod
    fun connectToPeer(multiaddr: String, promise: Promise) {
        val success = NodusService.getInstance()?.getNode()?.connectToPeer(multiaddr) ?: false
        promise.resolve(success)
    }

    @ReactMethod
    fun addPeer(peerId: String, address: String?) {
        NodusService.getInstance()?.getNode()?.addPeer(peerId, address)
    }

    @ReactMethod
    fun removePeer(peerId: String) {
        NodusService.getInstance()?.getNode()?.removePeer(peerId)
    }

    @ReactMethod
    fun sendMessage(toPeerId: String, content: String, type: String, replyTo: String?, promise: Promise) {
        val messageId = NodusService.getInstance()?.getNode()?.sendMessage(toPeerId, content, type, replyTo)
        promise.resolve(messageId)
    }

    @ReactMethod
    fun sendTyping(toPeerId: String, isTyping: Boolean) {
        NodusService.getInstance()?.getNode()?.sendTyping(toPeerId, isTyping)
    }

    @ReactMethod
    fun markAsRead(fromPeerId: String, messageId: String) {
        NodusService.getInstance()?.getNode()?.markAsRead(fromPeerId, messageId)
    }

    @ReactMethod
    fun getConnectedPeers(promise: Promise) {
        val peers = NodusService.getInstance()?.getNode()?.getConnectedPeers() ?: emptyList()
        val array = Arguments.createArray()
        peers.forEach { array.pushString(it) }
        promise.resolve(array)
    }

    @ReactMethod
    fun getKnownPeers(promise: Promise) {
        val peers = NodusService.getInstance()?.getNode()?.getKnownPeers() ?: emptyList()
        val array = Arguments.createArray()
        peers.forEach { peer ->
            val map = Arguments.createMap().apply {
                putString("peerId", peer.peerId)
                putString("username", peer.username)
                putString("alias", peer.alias)
                putString("avatar", peer.avatar)
                putString("bio", peer.bio)
                putBoolean("isOnline", peer.isOnline)
                putDouble("lastSeen", peer.lastSeen.toDouble())
                val addrs = Arguments.createArray()
                peer.addresses.forEach { addrs.pushString(it) }
                putArray("addresses", addrs)
            }
            array.pushMap(map)
        }
        promise.resolve(array)
    }

    @ReactMethod
    fun getPeerInfo(peerId: String, promise: Promise) {
        val peer = NodusService.getInstance()?.getNode()?.getPeerInfo(peerId)
        if (peer != null) {
            val map = Arguments.createMap().apply {
                putString("peerId", peer.peerId)
                putString("username", peer.username)
                putString("alias", peer.alias)
                putString("avatar", peer.avatar)
                putString("bio", peer.bio)
                putBoolean("isOnline", peer.isOnline)
                putDouble("lastSeen", peer.lastSeen.toDouble())
            }
            promise.resolve(map)
        } else {
            promise.resolve(null)
        }
    }

    @ReactMethod
    fun isConnected(peerId: String, promise: Promise) {
        promise.resolve(NodusService.getInstance()?.getNode()?.isConnected(peerId) ?: false)
    }

    @ReactMethod
    fun setNodeRole(role: String) {
        val nodeRole = when (role) {
            "relay" -> NodeRole.RELAY
            "bootstrap" -> NodeRole.BOOTSTRAP
            else -> NodeRole.USER
        }
        NodusService.getInstance()?.getNode()?.setNodeRole(nodeRole)
    }

    @ReactMethod
    fun getNodeRole(promise: Promise) {
        val role = NodusService.getInstance()?.getNode()?.nodeRole?.name?.lowercase() ?: "user"
        promise.resolve(role)
    }

    @ReactMethod
    fun getNodeStats(promise: Promise) {
        val node = NodusService.getInstance()?.getNode()
        val (relayedMessages, relayedBytes) = node?.getRelayStats() ?: Pair(0L, 0L)
        val peerRequests = node?.getBootstrapStats() ?: 0L
        
        val stats = Arguments.createMap().apply {
            putDouble("relayedMessages", relayedMessages.toDouble())
            putDouble("relayedBytes", relayedBytes.toDouble())
            putDouble("peerRequests", peerRequests.toDouble())
        }
        promise.resolve(stats)
    }

    @ReactMethod
    fun syncProfile(fingerprint: String, username: String?, alias: String?, avatar: String?, bio: String?) {
        NodusService.getInstance()?.getNode()?.relayClient?.saveProfile(fingerprint, username, alias, avatar, bio)
    }

    @ReactMethod
    fun restoreProfile(fingerprint: String, promise: Promise) {
        val profile = NodusService.getInstance()?.getNode()?.relayClient?.getProfile(fingerprint)
        if (profile != null) {
            val map = Arguments.createMap().apply {
                putString("username", profile["username"])
                putString("alias", profile["alias"])
                putString("avatar", profile["avatar"])
                putString("bio", profile["bio"])
            }
            promise.resolve(map)
        } else {
            promise.resolve(null)
        }
    }

    @ReactMethod
    fun requestPeers() {
        NodusService.getInstance()?.getNode()?.requestPeersFromBootstrap()
    }

    @ReactMethod
    fun searchByUsername(username: String) {
        NodusService.getInstance()?.getNode()?.searchByUsername(username)
    }

    @ReactMethod
    fun addListener(eventName: String) {}

    @ReactMethod
    fun removeListeners(count: Int) {}

    // NodeEventListener implementation
    override fun onNodeStarted(peerId: String, addresses: List<String>) {
        val addrs = Arguments.createArray()
        addresses.forEach { addrs.pushString(it) }
        emit("onNodeStarted", Arguments.createMap().apply { 
            putString("peerId", peerId)
            putArray("addresses", addrs)
        })
    }

    override fun onPeerDiscovered(peer: PeerInfo) {
        emit("onPeerDiscovered", Arguments.createMap().apply {
            putString("peerId", peer.peerId)
            putString("username", peer.username)
            putString("alias", peer.alias)
            putString("avatar", peer.avatar)
            putString("bio", peer.bio)
            putBoolean("isOnline", peer.isOnline)
            putDouble("lastSeen", peer.lastSeen.toDouble())
        })
    }

    override fun onPeerConnected(peerId: String) {
        emit("onPeerConnected", Arguments.createMap().apply { putString("peerId", peerId) })
    }

    override fun onPeerDisconnected(peerId: String) {
        emit("onPeerDisconnected", Arguments.createMap().apply { putString("peerId", peerId) })
    }

    override fun onMessageReceived(message: NodusMessage) {
        android.util.Log.i("NodusModule", "Emitting onMessageReceived: ${message.from}")
        emit("onMessageReceived", Arguments.createMap().apply {
            putString("id", message.id)
            putString("from", message.from)
            putString("to", message.to)
            putString("content", message.content)
            putDouble("timestamp", message.timestamp.toDouble())
            putString("type", message.type)
            putString("replyTo", message.replyTo)
        })
    }

    override fun onMessageSent(messageId: String, success: Boolean) {
        emit("onMessageSent", Arguments.createMap().apply {
            putString("messageId", messageId)
            putBoolean("success", success)
        })
    }

    override fun onMessageDelivered(messageId: String) {
        emit("onMessageDelivered", Arguments.createMap().apply { putString("messageId", messageId) })
    }

    override fun onMessageRead(messageId: String) {
        emit("onMessageRead", Arguments.createMap().apply { putString("messageId", messageId) })
    }

    override fun onTyping(peerId: String, isTyping: Boolean) {
        emit("onTyping", Arguments.createMap().apply {
            putString("peerId", peerId)
            putBoolean("isTyping", isTyping)
        })
    }

    override fun onError(error: String) {
        emit("onError", Arguments.createMap().apply { putString("error", error) })
    }
}
