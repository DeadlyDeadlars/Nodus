package com.nodus.p2p

import android.app.*
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.IBinder
import android.util.Log
import androidx.core.app.NotificationCompat

class NodusService : Service(), NodeEventListener {
    companion object {
        private const val TAG = "NodusService"
        private const val CHANNEL_ID = "nodus_p2p_channel"
        private const val NOTIFICATION_ID = 1
        
        private var instance: NodusService? = null
        private var moduleListener: NodeEventListener? = null
        
        fun getInstance(): NodusService? = instance
        fun setModuleListener(listener: NodeEventListener?) { moduleListener = listener }
        
        fun start(context: Context) {
            val intent = Intent(context, NodusService::class.java)
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                context.startForegroundService(intent)
            } else {
                context.startService(intent)
            }
        }
        
        fun stop(context: Context) {
            context.stopService(Intent(context, NodusService::class.java))
        }
    }

    private lateinit var node: NodusNode
    private var peerId: String? = null
    private var connectedCount = 0

    override fun onCreate() {
        super.onCreate()
        instance = this
        createNotificationChannel()
        startForeground(NOTIFICATION_ID, createNotification("Запуск ноды..."))
        
        node = NodusNode(this)
        node.addListener(this)
        node.start()
        
        Log.i(TAG, "Service created, node starting...")
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        return START_STICKY
    }

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onDestroy() {
        instance = null
        node.removeListener(this)
        node.destroy()
        super.onDestroy()
        Log.i(TAG, "Service destroyed")
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                "NODUS P2P",
                NotificationManager.IMPORTANCE_LOW
            ).apply {
                description = "P2P нода работает в фоне"
                setShowBadge(false)
            }
            getSystemService(NotificationManager::class.java)?.createNotificationChannel(channel)
        }
    }

    private fun createNotification(status: String): Notification {
        val intent = packageManager.getLaunchIntentForPackage(packageName)
        val pendingIntent = PendingIntent.getActivity(
            this, 0, intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        
        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("NODUS")
            .setContentText(status)
            .setSmallIcon(android.R.drawable.ic_dialog_info)
            .setContentIntent(pendingIntent)
            .setOngoing(true)
            .setSilent(true)
            .build()
    }

    private fun updateNotification(status: String) {
        getSystemService(NotificationManager::class.java)
            ?.notify(NOTIFICATION_ID, createNotification(status))
    }

    // NodeEventListener
    override fun onNodeStarted(peerId: String, addresses: List<String>) {
        this.peerId = peerId
        updateNotification("Нода активна • ${peerId.take(8)}...")
        Log.i(TAG, "Node started with ID: $peerId")
        moduleListener?.onNodeStarted(peerId, addresses)
    }

    override fun onPeerDiscovered(peer: PeerInfo) {
        Log.i(TAG, "Peer discovered: ${peer.peerId} (${peer.username ?: "unknown"})")
        moduleListener?.onPeerDiscovered(peer)
    }

    override fun onPeerConnected(peerId: String) {
        connectedCount++
        updateNotification("Подключено: $connectedCount • ${this.peerId?.take(8)}...")
        Log.i(TAG, "Peer connected: $peerId")
        moduleListener?.onPeerConnected(peerId)
    }

    override fun onPeerDisconnected(peerId: String) {
        connectedCount = maxOf(0, connectedCount - 1)
        updateNotification("Подключено: $connectedCount • ${this.peerId?.take(8)}...")
        Log.i(TAG, "Peer disconnected: $peerId")
        moduleListener?.onPeerDisconnected(peerId)
    }

    override fun onMessageReceived(message: NodusMessage) {
        Log.i(TAG, "Message received from ${message.from}: ${message.type}")
        moduleListener?.onMessageReceived(message)
        showMessageNotification(message)
    }

    override fun onMessageSent(messageId: String, success: Boolean) {
        Log.i(TAG, "Message sent: $messageId, success: $success")
        moduleListener?.onMessageSent(messageId, success)
    }

    override fun onMessageDelivered(messageId: String) {
        Log.i(TAG, "Message delivered: $messageId")
        moduleListener?.onMessageDelivered(messageId)
    }

    override fun onMessageRead(messageId: String) {
        Log.i(TAG, "Message read: $messageId")
        moduleListener?.onMessageRead(messageId)
    }

    override fun onTyping(peerId: String, isTyping: Boolean) {
        Log.d(TAG, "Typing: $peerId = $isTyping")
        moduleListener?.onTyping(peerId, isTyping)
    }

    override fun onError(error: String) {
        Log.e(TAG, "Node error: $error")
        moduleListener?.onError(error)
    }

    private fun showMessageNotification(message: NodusMessage) {
        val peer = node.getPeerInfo(message.from)
        val title = peer?.alias ?: peer?.username ?: message.from.take(12)
        val text = when (message.type) {
            "voice" -> "🎤 Голосовое сообщение"
            "video" -> "📹 Видеосообщение"
            "file" -> "📎 Файл"
            else -> message.content.take(100)
        }
        
        val intent = packageManager.getLaunchIntentForPackage(packageName)?.apply {
            putExtra("chatId", message.from)
        }
        val pendingIntent = PendingIntent.getActivity(
            this, message.from.hashCode(), intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        
        val notification = NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle(title)
            .setContentText(text)
            .setSmallIcon(android.R.drawable.ic_dialog_email)
            .setContentIntent(pendingIntent)
            .setAutoCancel(true)
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .build()
        
        getSystemService(NotificationManager::class.java)
            ?.notify(message.from.hashCode(), notification)
    }

    // Public API
    fun getNode(): NodusNode = node
    fun getPeerId(): String? = peerId
}
