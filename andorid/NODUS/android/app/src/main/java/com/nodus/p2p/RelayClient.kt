package com.nodus.p2p

import android.util.Base64
import android.util.Log
import kotlinx.coroutines.*
import org.json.JSONArray
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL
import javax.crypto.Cipher
import javax.crypto.spec.GCMParameterSpec
import javax.crypto.spec.SecretKeySpec
import java.security.MessageDigest

class RelayClient(private val node: NodusNode) {
    companion object {
        private const val TAG = "RelayClient"
        private const val RELAY_URL = "http://bibliotekaznanyi.online/relay.php"
    }

    private var job: Job? = null
    private val scope = CoroutineScope(Dispatchers.IO + SupervisorJob())
    private val peerPublicKeys = mutableMapOf<String, String>()

    fun start() {
        job = scope.launch {
            while (isActive) {
                try {
                    register()
                    pollMessages()
                } catch (e: Exception) {
                    Log.w(TAG, "Relay error: ${e.message}")
                }
                delay(3000)
            }
        }
    }

    fun stop() {
        job?.cancel()
    }

    private fun register() {
        val peerId = node.peerId ?: return
        val username = node.getProfile()?.username ?: ""
        val publicKey = node.getPublicKeyBase64()

        val json = JSONObject().apply {
            put("peerId", peerId)
            put("username", username)
            put("publicKey", publicKey)
        }

        post("$RELAY_URL?action=register", json.toString())
    }

    private fun pollMessages() {
        val peerId = node.peerId ?: return
        val json = JSONObject().apply { put("peerId", peerId) }
        
        val response = post("$RELAY_URL?action=poll", json.toString()) ?: return
        val messages = JSONArray(response)
        
        for (i in 0 until messages.length()) {
            val m = messages.getJSONObject(i)
            val fromPeerId = m.getString("from")
            val encryptedContent = m.getString("content")
            
            // Decrypt message
            val content = decryptMessage(encryptedContent, fromPeerId) ?: encryptedContent
            
            val msg = NodusMessage(
                id = m.getString("id"),
                from = fromPeerId,
                to = m.getString("to"),
                content = content,
                timestamp = m.getLong("timestamp") * 1000,
                type = m.optString("type", "text")
            )
            node.notifyMessageReceived(msg)
        }
    }

    fun sendMessage(to: String, content: String, type: String = "text"): String? {
        val peerId = node.peerId ?: return null
        val id = System.currentTimeMillis().toString()
        
        // Get recipient's public key and encrypt
        val recipientKey = getPublicKey(to)
        val encryptedContent = if (recipientKey != null) {
            encryptMessage(content, to, recipientKey) ?: content
        } else content
        
        val json = JSONObject().apply {
            put("id", id)
            put("from", peerId)
            put("to", to)
            put("content", encryptedContent)
            put("type", type)
        }

        val response = post("$RELAY_URL?action=send", json.toString())
        return if (response?.contains("ok") == true) id else null
    }

    private fun getPublicKey(peerId: String): String? {
        peerPublicKeys[peerId]?.let { return it }
        
        val json = JSONObject().apply { put("peerId", peerId) }
        val response = post("$RELAY_URL?action=getPublicKey", json.toString()) ?: return null
        
        return try {
            val obj = JSONObject(response)
            if (obj.optBoolean("ok")) {
                val key = obj.getString("publicKey")
                if (key.isNotEmpty()) {
                    peerPublicKeys[peerId] = key
                    key
                } else null
            } else null
        } catch (e: Exception) { null }
    }

    private fun encryptMessage(content: String, toPeerId: String, theirPublicKey: String): String? {
        return try {
            val sharedSecret = deriveSharedSecret(theirPublicKey)
            val iv = ByteArray(12).also { java.security.SecureRandom().nextBytes(it) }
            val cipher = Cipher.getInstance("AES/GCM/NoPadding")
            cipher.init(Cipher.ENCRYPT_MODE, SecretKeySpec(sharedSecret, "AES"), GCMParameterSpec(128, iv))
            val encrypted = cipher.doFinal(content.toByteArray())
            Base64.encodeToString(iv + encrypted, Base64.NO_WRAP)
        } catch (e: Exception) {
            Log.w(TAG, "Encrypt error: ${e.message}")
            null
        }
    }

    private fun decryptMessage(encrypted: String, fromPeerId: String): String? {
        return try {
            val theirPublicKey = getPublicKey(fromPeerId) ?: return null
            val sharedSecret = deriveSharedSecret(theirPublicKey)
            val data = Base64.decode(encrypted, Base64.NO_WRAP)
            if (data.size < 13) return null
            val iv = data.copyOfRange(0, 12)
            val ciphertext = data.copyOfRange(12, data.size)
            val cipher = Cipher.getInstance("AES/GCM/NoPadding")
            cipher.init(Cipher.DECRYPT_MODE, SecretKeySpec(sharedSecret, "AES"), GCMParameterSpec(128, iv))
            String(cipher.doFinal(ciphertext))
        } catch (e: Exception) {
            Log.w(TAG, "Decrypt error: ${e.message}")
            null
        }
    }

    private fun deriveSharedSecret(theirPublicKey: String): ByteArray {
        val myPublic = node.getPublicKeyBase64()
        val theirKey = theirPublicKey
        // Sort keys to ensure same order on both sides
        val keys = listOf(myPublic, theirKey).sorted()
        val combined = (keys[0] + keys[1]).toByteArray()
        return MessageDigest.getInstance("SHA-256").digest(combined)
    }

    fun searchByUsername(username: String): List<PeerInfo> {
        val response = get("$RELAY_URL?action=search&q=$username") ?: return emptyList()
        val results = mutableListOf<PeerInfo>()
        val arr = JSONArray(response)
        
        for (i in 0 until arr.length()) {
            val p = arr.getJSONObject(i)
            val peerId = p.getString("peerId")
            val pubKey = p.optString("publicKey", "")
            if (pubKey.isNotEmpty()) peerPublicKeys[peerId] = pubKey
            results.add(PeerInfo(peerId = peerId, username = p.optString("username")))
        }
        return results
    }

    fun getOnlinePeers(): List<PeerInfo> {
        val response = get("$RELAY_URL?action=peers") ?: return emptyList()
        val results = mutableListOf<PeerInfo>()
        val arr = JSONArray(response)
        
        for (i in 0 until arr.length()) {
            val p = arr.getJSONObject(i)
            val peerId = p.getString("peerId")
            val pubKey = p.optString("publicKey", "")
            if (pubKey.isNotEmpty()) peerPublicKeys[peerId] = pubKey
            results.add(PeerInfo(peerId = peerId, username = p.optString("username"), isOnline = true))
        }
        return results
    }

    fun saveProfile(fingerprint: String, username: String?, alias: String?, avatar: String?, bio: String?) {
        val json = JSONObject().apply {
            put("fingerprint", fingerprint)
            put("username", username ?: "")
            put("alias", alias ?: "")
            put("avatar", avatar ?: "")
            put("bio", bio ?: "")
        }
        post("$RELAY_URL?action=saveProfile", json.toString())
        Log.d(TAG, "Profile saved to relay")
    }

    fun getProfile(fingerprint: String): Map<String, String>? {
        val json = JSONObject().apply { put("fingerprint", fingerprint) }
        val response = post("$RELAY_URL?action=getProfile", json.toString()) ?: return null
        return try {
            val obj = JSONObject(response)
            if (obj.optBoolean("ok")) {
                val profile = obj.getJSONObject("profile")
                mapOf(
                    "username" to profile.optString("username"),
                    "alias" to profile.optString("alias"),
                    "avatar" to profile.optString("avatar"),
                    "bio" to profile.optString("bio")
                )
            } else null
        } catch (e: Exception) { null }
    }

    private fun post(url: String, body: String): String? {
        return try {
            val conn = URL(url).openConnection() as HttpURLConnection
            conn.requestMethod = "POST"
            conn.setRequestProperty("Content-Type", "application/json")
            conn.doOutput = true
            conn.connectTimeout = 10000
            conn.readTimeout = 10000
            conn.outputStream.write(body.toByteArray())
            conn.inputStream.bufferedReader().readText()
        } catch (e: Exception) {
            Log.w(TAG, "POST error: ${e.message}")
            null
        }
    }

    private fun get(url: String): String? {
        return try {
            val conn = URL(url).openConnection() as HttpURLConnection
            conn.connectTimeout = 10000
            conn.readTimeout = 10000
            conn.inputStream.bufferedReader().readText()
        } catch (e: Exception) {
            Log.w(TAG, "GET error: ${e.message}")
            null
        }
    }
}
