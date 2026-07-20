package com.motocortex.obd.transport

interface OBDTransport {
    fun connect(target: String): Boolean
    fun disconnect()
    fun write(data: String)
    fun setOnDataReceivedListener(listener: (String) -> Unit)
}
