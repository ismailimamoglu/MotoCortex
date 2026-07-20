package com.motocortex.obd.transport

import kotlinx.coroutines.*
import java.io.InputStream
import java.io.OutputStream
import java.net.InetSocketAddress
import java.net.Socket

class WiFiTransport : OBDTransport {
    private var socket: Socket? = null
    private var inputStream: InputStream? = null
    private var outputStream: OutputStream? = null
    private var dataListener: ((String) -> Unit)? = null
    private val scope = CoroutineScope(Dispatchers.IO + SupervisorJob())
    private var readJob: Job? = null

    override fun connect(target: String): Boolean {
        // Target format: "IP:PORT" (e.g. "192.168.0.10:35000")
        try {
            disconnect()
            val parts = target.split(":")
            val ip = parts[0]
            val port = if (parts.size > 1) parts[1].toInt() else 35000

            val currentSocket = Socket()
            currentSocket.keepAlive = true
            currentSocket.tcpNoDelay = true // Enforce noDelay to disable Nagle's algorithm

            currentSocket.connect(InetSocketAddress(ip, port), 5000)
            socket = currentSocket
            inputStream = currentSocket.getInputStream()
            outputStream = currentSocket.getOutputStream()

            startListening()
            return true
        } catch (e: Exception) {
            System.err.println("[WiFiTransport] Connection failed: ${e.message}")
            disconnect()
            return false
        }
    }

    override fun disconnect() {
        readJob?.cancel()
        try { inputStream?.close() } catch (e: Exception) {}
        try { outputStream?.close() } catch (e: Exception) {}
        try { socket?.close() } catch (e: Exception) {}
        inputStream = null
        outputStream = null
        socket = null
    }

    override fun write(data: String) {
        val out = outputStream ?: throw IllegalStateException("WiFiTransport: Not connected")
        val command = if (data.endsWith("\r")) data else data + "\r"
        out.write(command.toByteArray(Charsets.UTF_8))
        out.flush()
    }

    override fun setOnDataReceivedListener(listener: (String) -> Unit) {
        dataListener = listener
    }

    private fun startListening() {
        readJob = scope.launch {
            val buffer = ByteArray(1024)
            val stream = inputStream ?: return@launch
            while (isActive) {
                try {
                    val readBytes = stream.read(buffer)
                    if (readBytes == -1) {
                        break
                    }
                    if (readBytes > 0) {
                        val response = String(buffer, 0, readBytes, Charsets.UTF_8)
                        dataListener?.invoke(response)
                    }
                } catch (e: Exception) {
                    break
                }
            }
        }
    }
}
