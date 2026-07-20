package com.motocortex.obd.transport

import android.bluetooth.BluetoothAdapter
import android.bluetooth.BluetoothDevice
import android.bluetooth.BluetoothSocket
import kotlinx.coroutines.*
import java.io.InputStream
import java.io.OutputStream
import java.util.UUID

class ClassicTransport : OBDTransport {
    private var socket: BluetoothSocket? = null
    private var inputStream: InputStream? = null
    private var outputStream: OutputStream? = null
    private var dataListener: ((String) -> Unit)? = null
    private val scope = CoroutineScope(Dispatchers.IO + SupervisorJob())
    private var readJob: Job? = null

    private val SPP_UUID = UUID.fromString("00001101-0000-1000-8000-00805F9B34FB")

    override fun connect(target: String): Boolean {
        // target is the Bluetooth MAC Address
        try {
            disconnect()
            val adapter = BluetoothAdapter.getDefaultAdapter() ?: throw IllegalStateException("Bluetooth not supported")
            if (!adapter.isEnabled) throw IllegalStateException("Bluetooth is disabled")

            val device = adapter.getRemoteDevice(target)
            var socketCreated: BluetoothSocket? = null

            // Method 1: Standard RFCOMM socket creation
            try {
                socketCreated = device.createRfcommSocketToServiceRecord(SPP_UUID)
                socketCreated.connect()
            } catch (e: Exception) {
                System.err.println("[ClassicTransport] Standard RFCOMM failed, attempting Reflection Fallback...")
                try {
                    // Method 2: Reflection Fallback on port 1 (often used by clone/cheap ELM327 devices)
                    val method = device.javaClass.getMethod("createRfcommSocket", Int::class.javaPrimitiveType)
                    socketCreated = method.invoke(device, 1) as BluetoothSocket
                    socketCreated.connect()
                } catch (reflectEx: Exception) {
                    System.err.println("[ClassicTransport] Reflection Fallback failed: ${reflectEx.message}")
                    throw reflectEx
                }
            }

            socket = socketCreated
            inputStream = socketCreated?.inputStream
            outputStream = socketCreated?.outputStream

            startListening()
            return true
        } catch (e: Exception) {
            System.err.println("[ClassicTransport] Connection failed: ${e.message}")
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
        val out = outputStream ?: throw IllegalStateException("ClassicTransport: Not connected")
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
