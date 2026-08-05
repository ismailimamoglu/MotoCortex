package com.motocortex.obd

import java.net.DatagramPacket
import java.net.DatagramSocket
import java.net.InetAddress
import java.net.SocketTimeoutException
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

/**
 * MotoCortex v10.0 - Native DoIP (ISO 13400) UDP 13400 Vehicle Discovery Engine
 * Implements ISO 13400-2 Vehicle Identification & Discovery Broadcast Handling
 */
object DoIpUdpDiscovery {

    private const val DOIP_UDP_PORT = 13400
    private const val HEADER_LENGTH = 8
    private const val PROTOCOL_VERSION: Byte = 0x02
    private const val INVERSE_VERSION: Byte = 0xFD.toByte()
    private const val VEHICLE_ID_REQUEST_TYPE: Short = 0x0001
    private const val VEHICLE_ANNOUNCEMENT_TYPE: Short = 0x0004

    data class DiscoveredVehicle(
        val ipAddress: String,
        val vin: String,
        val logicalAddress: Int,
        val eid: String,
        val gid: String
    )

    /**
     * Sends ISO 13400 UDP Vehicle Identification Request on port 13400 and listens for replies.
     */
    suspend fun discoverVehicles(timeoutMs: Int = 3000): List<DiscoveredVehicle> = withContext(Dispatchers.IO) {
        val discoveredList = mutableListOf<DiscoveredVehicle>()
        var socket: DatagramSocket? = null

        try {
            socket = DatagramSocket()
            socket.broadcast = true
            socket.soTimeout = timeoutMs

            // Construct ISO 13400 Vehicle Identification Request payload
            // Header: [Version (0x02), Inverse (0xFD), PayloadType (0x0001), Length (0x00, 0x00)]
            val requestHeader = byteArrayOf(
                PROTOCOL_VERSION,
                INVERSE_VERSION,
                (VEHICLE_ID_REQUEST_TYPE.toInt() shr 8).toByte(),
                (VEHICLE_ID_REQUEST_TYPE.toInt() and 0xFF).toByte(),
                0x00, 0x00, 0x00, 0x00
            )

            val broadcastAddr = InetAddress.getByName("255.255.255.255")
            val sendPacket = DatagramPacket(requestHeader, requestHeader.size, broadcastAddr, DOIP_UDP_PORT)
            socket.send(sendPacket)

            val receiveBuffer = ByteArray(512)
            val startTime = System.currentTimeMillis()

            while (System.currentTimeMillis() - startTime < timeoutMs) {
                try {
                    val receivePacket = DatagramPacket(receiveBuffer, receiveBuffer.size)
                    socket.receive(receivePacket)

                    val data = receivePacket.data
                    val length = receivePacket.length

                    if (length >= HEADER_LENGTH + 17) {
                        val ver = data[0]
                        val payloadType = ((data[2].toInt() and 0xFF) shl 8) or (data[3].toInt() and 0xFF)

                        if (ver == PROTOCOL_VERSION && payloadType == VEHICLE_ANNOUNCEMENT_TYPE.toInt()) {
                            // Extract VIN (17 ASCII bytes starting at offset 8)
                            val vinBytes = data.copyOfRange(8, 25)
                            val vinStr = String(vinBytes, Charsets.US_ASCII).trim()

                            // Logical Address at offset 25-26
                            val logicalAddr = ((data[25].toInt() and 0xFF) shl 8) or (data[26].toInt() and 0xFF)
                            val ip = receivePacket.address.hostAddress ?: "127.0.0.1"

                            val vehicle = DiscoveredVehicle(
                                ipAddress = ip,
                                vin = vinStr,
                                logicalAddress = logicalAddr,
                                eid = "EID-${ip}",
                                gid = "GID-DEFAULT"
                            )
                            if (discoveredList.none { it.ipAddress == ip }) {
                                discoveredList.add(vehicle)
                            }
                        }
                    }
                } catch (e: SocketTimeoutException) {
                    break
                }
            }
        } catch (e: Exception) {
            e.printStackTrace()
        } finally {
            socket?.close()
        }

        return@withContext discoveredList
    }
}
