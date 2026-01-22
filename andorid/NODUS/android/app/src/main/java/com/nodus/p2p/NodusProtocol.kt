package com.nodus.p2p

import io.libp2p.core.Stream
import io.libp2p.core.multistream.StrictProtocolBinding
import io.libp2p.protocol.ProtocolHandler
import io.libp2p.protocol.ProtocolMessageHandler
import java.util.concurrent.CompletableFuture
import io.netty.buffer.ByteBuf
import io.netty.buffer.Unpooled
import com.google.gson.Gson
import android.util.Log
import java.nio.charset.StandardCharsets

data class WireMessage(
    val id: String,
    val type: String,  // "text", "voice", "video", "file", "profile", "ack", "typing", "read"
    val from: String,
    val to: String,
    val content: String,
    val timestamp: Long,
    val replyTo: String? = null,
    val metadata: Map<String, String>? = null
)

class NodusProtocolHandler(
    private val onMessage: (WireMessage, Stream) -> Unit
) : ProtocolHandler<NodusProtocolController>(Long.MAX_VALUE, Long.MAX_VALUE) {
    
    override fun onStartInitiator(stream: Stream): CompletableFuture<NodusProtocolController> {
        val controller = NodusProtocolController()
        controller.stream = stream
        stream.pushHandler(MessageHandler(controller, onMessage))
        return CompletableFuture.completedFuture(controller)
    }

    override fun onStartResponder(stream: Stream): CompletableFuture<NodusProtocolController> {
        val controller = NodusProtocolController()
        controller.stream = stream
        stream.pushHandler(MessageHandler(controller, onMessage))
        return CompletableFuture.completedFuture(controller)
    }
}

class NodusProtocol(
    onMessage: (WireMessage, Stream) -> Unit
) : StrictProtocolBinding<NodusProtocolController>(
    PROTOCOL_ID,
    NodusProtocolHandler(onMessage)
) {
    companion object {
        const val PROTOCOL_ID = "/nodus/1.0.0"
    }
}

class NodusProtocolController {
    var stream: Stream? = null
    private val gson = Gson()

    fun send(message: WireMessage): Boolean {
        return try {
            val json = gson.toJson(message)
            val bytes = json.toByteArray(StandardCharsets.UTF_8)
            val lengthPrefix = ByteArray(4)
            lengthPrefix[0] = (bytes.size shr 24).toByte()
            lengthPrefix[1] = (bytes.size shr 16).toByte()
            lengthPrefix[2] = (bytes.size shr 8).toByte()
            lengthPrefix[3] = bytes.size.toByte()
            
            val buf = Unpooled.wrappedBuffer(lengthPrefix + bytes)
            stream?.writeAndFlush(buf)
            true
        } catch (e: Exception) {
            Log.e("NodusProtocol", "Failed to send message", e)
            false
        }
    }

    fun close() {
        stream?.close()
    }
}

class MessageHandler(
    private val controller: NodusProtocolController,
    private val onMessage: (WireMessage, Stream) -> Unit
) : ProtocolMessageHandler<ByteBuf> {
    
    private val gson = Gson()
    private var buffer = ByteArray(0)
    
    override fun onMessage(stream: Stream, msg: ByteBuf) {
        try {
            val bytes = ByteArray(msg.readableBytes())
            msg.readBytes(bytes)
            buffer += bytes
            
            while (buffer.size >= 4) {
                val length = ((buffer[0].toInt() and 0xFF) shl 24) or
                            ((buffer[1].toInt() and 0xFF) shl 16) or
                            ((buffer[2].toInt() and 0xFF) shl 8) or
                            (buffer[3].toInt() and 0xFF)
                
                if (buffer.size < 4 + length) break
                
                val json = String(buffer, 4, length, StandardCharsets.UTF_8)
                buffer = buffer.copyOfRange(4 + length, buffer.size)
                
                val message = gson.fromJson(json, WireMessage::class.java)
                onMessage(message, stream)
            }
        } catch (e: Exception) {
            Log.e("MessageHandler", "Error processing message", e)
        }
    }

    override fun onClosed(stream: Stream) {
        Log.d("MessageHandler", "Stream closed: ${stream.remotePeerId()}")
    }

    override fun onException(cause: Throwable?) {
        Log.e("MessageHandler", "Stream exception", cause)
    }
}
