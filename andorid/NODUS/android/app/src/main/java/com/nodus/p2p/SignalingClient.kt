package com.nodus.p2p

import android.util.Log
import kotlinx.coroutines.*
import org.json.JSONArray
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL

class SignalingClient(private val node: NodusNode) {
    companion object {
        private const val TAG = "SignalingClient"
        // TODO: Replace with your deployed server URL
        private const val SERVER_URL = "https://nodus-n3pp.onrender.com"
    }

    private var job: Job? = null
    private val scope = CoroutineScope(Dispatchers.IO + SupervisorJob())

    fun start() {
        job = scope.launch {
            while (isActive) {
                try {
                    register()
                    fetchAndConnect()
                } catch (e: Exception) {
                    Log.w(TAG, "Signaling error: ${e.message}")
                }
                delay(30000)
            }
        }
    }

    fun stop() {
        job?.cancel()
    }

    private fun register() {
        val peerId = node.peerId ?: return
        val port = node.addresses.firstOrNull()?.let { 
            Regex("/tcp/(\\d+)").find(it)?.groupValues?.get(1) 
        } ?: "0"
        val username = node.getProfile()?.username
        val role = node.nodeRole.name.lowercase()
        
        // Get real IP addresses
        val realAddresses = mutableListOf<String>()
        try {
            java.net.NetworkInterface.getNetworkInterfaces()?.toList()?.forEach { iface ->
                if (iface.isUp && !iface.isLoopback) {
                    iface.inetAddresses?.toList()?.forEach { addr ->
                        if (!addr.isLoopbackAddress && addr is java.net.Inet4Address) {
                            val ip = addr.hostAddress ?: return@forEach
                            // Skip emulator internal IPs
                            if (!ip.startsWith("10.0.2.")) {
                                realAddresses.add("/ip4/$ip/tcp/$port/p2p/$peerId")
                            }
                        }
                    }
                }
            }
        } catch (e: Exception) { }
        
        // If no valid addresses (emulator), skip registration
        if (realAddresses.isEmpty()) {
            Log.w(TAG, "No valid external IP, skipping signaling registration")
            return
        }

        val json = JSONObject().apply {
            put("peerId", peerId)
            put("addresses", JSONArray(realAddresses))
            put("username", username ?: "")
            put("role", role)
        }

        post("$SERVER_URL/peer", json.toString())
        Log.d(TAG, "Registered: $peerId (role: $role)")
    }

    private fun fetchAndConnect() {
        val response = get("$SERVER_URL/peers") ?: return
        val peers = JSONArray(response)
        val myId = node.peerId

        for (i in 0 until peers.length()) {
            val p = peers.getJSONObject(i)
            val peerId = p.getString("peerId")
            if (peerId == myId) continue
            if (node.isConnected(peerId)) continue

            val addrs = p.getJSONArray("addresses")
            for (j in 0 until addrs.length()) {
                val addr = addrs.getString(j)
                if (addr.isNotEmpty() && !addr.contains("::")) {
                    Log.d(TAG, "Trying to connect to $peerId via $addr")
                    if (node.connectToPeer(addr)) {
                        Log.i(TAG, "Connected to $peerId")
                        break
                    }
                }
            }
        }
    }

    fun searchByUsername(username: String): List<PeerInfo> {
        val response = get("$SERVER_URL/search?q=$username") ?: return emptyList()
        val results = mutableListOf<PeerInfo>()
        val arr = JSONArray(response)
        
        for (i in 0 until arr.length()) {
            val p = arr.getJSONObject(i)
            results.add(PeerInfo(
                peerId = p.getString("peerId"),
                username = p.optString("username"),
                addresses = mutableListOf<String>().apply {
                    val addrs = p.getJSONArray("addresses")
                    for (j in 0 until addrs.length()) add(addrs.getString(j))
                }
            ))
        }
        return results
    }

    private fun post(url: String, body: String): String? {
        return try {
            val conn = URL(url).openConnection() as HttpURLConnection
            conn.requestMethod = "POST"
            conn.setRequestProperty("Content-Type", "application/json")
            conn.doOutput = true
            conn.connectTimeout = 10000
            conn.outputStream.write(body.toByteArray())
            conn.inputStream.bufferedReader().readText()
        } catch (e: Exception) { null }
    }

    private fun get(url: String): String? {
        return try {
            val conn = URL(url).openConnection() as HttpURLConnection
            conn.connectTimeout = 10000
            conn.inputStream.bufferedReader().readText()
        } catch (e: Exception) { null }
    }
}
