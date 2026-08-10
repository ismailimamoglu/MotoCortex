package com.motocortex.obd.transport

import android.bluetooth.BluetoothAdapter
import android.bluetooth.BluetoothGatt
import android.bluetooth.BluetoothGattCallback
import android.bluetooth.BluetoothGattCharacteristic
import android.bluetooth.BluetoothGattDescriptor
import android.bluetooth.BluetoothProfile
import android.content.Context
import kotlinx.coroutines.*
import java.util.UUID

class BLETransport(private val context: Context) : OBDTransport {
    private var bluetoothGatt: BluetoothGatt? = null
    private var writeCharacteristic: BluetoothGattCharacteristic? = null
    private var dataListener: ((String) -> Unit)? = null
    private var isConnectedPromise = CompletableDeferred<Boolean>()

    // Standard SPP-over-BLE candidate UUIDs (ELM327, Veepeak, Vgate, STN2120, OBDLink)
    private val CANDIDATE_SERVICE_UUIDS = listOf(
        UUID.fromString("0000ffe0-0000-1000-8000-00805f9b34fb"),
        UUID.fromString("0000fff0-0000-1000-8000-00805f9b34fb"),
        UUID.fromString("000018f0-0000-1000-8000-00805f9b34fb"),
        UUID.fromString("e7810001-4415-4641-a544-a5c3ed6f6345")
    )
    private val CLIENT_CHARACTERISTIC_CONFIG = UUID.fromString("00002902-0000-1000-8000-00805f9b34fb")

    private val gattCallback = object : BluetoothGattCallback() {
        override fun onConnectionStateChange(gatt: BluetoothGatt, status: Int, newState: Int) {
            if (status == BluetoothGatt.GATT_SUCCESS) {
                if (newState == BluetoothProfile.STATE_CONNECTED) {
                    System.out.println("[BLETransport] Connected, negotiating MTU to 512...")
                    // Step 1: Request MTU negotiation before discovery to allow large payloads
                    gatt.requestMtu(512)
                } else if (newState == BluetoothProfile.STATE_DISCONNECTED) {
                    System.out.println("[BLETransport] Disconnected.")
                    isConnectedPromise.complete(false)
                    disconnect()
                }
            } else {
                System.err.println("[BLETransport] Connection error state. status=$status newState=$newState")
                isConnectedPromise.complete(false)
                disconnect()
            }
        }

        override fun onMtuChanged(gatt: BluetoothGatt, mtu: Int, status: Int) {
            System.out.println("[BLETransport] MTU Negotiated: size=$mtu, status=$status")
            // Step 2: Discover services after MTU negotiation
            gatt.discoverServices()
        }

        override fun onServicesDiscovered(gatt: BluetoothGatt, status: Int) {
            if (status == BluetoothGatt.GATT_SUCCESS) {
                var foundChar: BluetoothGattCharacteristic? = null
                
                // Dynamic candidate discovery
                for (serviceUuid in CANDIDATE_SERVICE_UUIDS) {
                    val service = gatt.getService(serviceUuid)
                    if (service != null) {
                        for (ch in service.characteristics) {
                            val props = ch.properties
                            val isWritable = (props and (BluetoothGattCharacteristic.PROPERTY_WRITE or BluetoothGattCharacteristic.PROPERTY_WRITE_NO_RESPONSE)) != 0
                            val isNotifiable = (props and (BluetoothGattCharacteristic.PROPERTY_NOTIFY or BluetoothGattCharacteristic.PROPERTY_INDICATE)) != 0
                            if (isWritable || isNotifiable) {
                                foundChar = ch
                                break
                            }
                        }
                    }
                    if (foundChar != null) break
                }

                // Fallback: search all discovered GATT services for writable/notify characteristic
                if (foundChar == null) {
                    for (service in gatt.services) {
                        for (ch in service.characteristics) {
                            val props = ch.properties
                            val isWritable = (props and (BluetoothGattCharacteristic.PROPERTY_WRITE or BluetoothGattCharacteristic.PROPERTY_WRITE_NO_RESPONSE)) != 0
                            val isNotifiable = (props and (BluetoothGattCharacteristic.PROPERTY_NOTIFY or BluetoothGattCharacteristic.PROPERTY_INDICATE)) != 0
                            if (isWritable && isNotifiable) {
                                foundChar = ch
                                break
                            }
                        }
                        if (foundChar != null) break
                    }
                }

                if (foundChar != null) {
                    writeCharacteristic = foundChar
                    // Step 3: Enable notification
                    gatt.setCharacteristicNotification(foundChar, true)
                    val descriptor = foundChar.getDescriptor(CLIENT_CHARACTERISTIC_CONFIG)
                    descriptor?.let {
                        it.value = BluetoothGattDescriptor.ENABLE_NOTIFICATION_VALUE
                        gatt.writeDescriptor(it)
                    }
                    System.out.println("[BLETransport] GATT service and characteristic configured: ${foundChar.uuid}")
                    isConnectedPromise.complete(true)
                } else {
                    System.err.println("[BLETransport] Target characteristic not found in any service.")
                    isConnectedPromise.complete(false)
                }
            } else {
                System.err.println("[BLETransport] Service discovery failed status=$status")
                isConnectedPromise.complete(false)
            }
        }

        override fun onCharacteristicChanged(gatt: BluetoothGatt, characteristic: BluetoothGattCharacteristic) {
            if (writeCharacteristic != null && characteristic.uuid == writeCharacteristic?.uuid) {
                val rawData = characteristic.value
                val dataString = String(rawData, Charsets.UTF_8)
                dataListener?.invoke(dataString)
            }
        }
    }

    override fun connect(target: String): Boolean = runBlocking {
        try {
            disconnect()
            val adapter = BluetoothAdapter.getDefaultAdapter() ?: throw IllegalStateException("Bluetooth not supported")
            val device = adapter.getRemoteDevice(target)
            
            isConnectedPromise = CompletableDeferred()
            bluetoothGatt = device.connectGatt(context, false, gattCallback)
            
            withTimeoutOrNull(7000) {
                isConnectedPromise.await()
            } ?: false
        } catch (e: Exception) {
            System.err.println("[BLETransport] GATT connect failed: ${e.message}")
            disconnect()
            false
        }
    }

    override fun disconnect() {
        try {
            bluetoothGatt?.let {
                it.disconnect()
                it.close()
            }
        } catch (e: Exception) {}
        bluetoothGatt = null
        writeCharacteristic = null
    }

    override fun write(data: String) {
        val gatt = bluetoothGatt ?: throw IllegalStateException("BLETransport: GATT not connected")
        val char = writeCharacteristic ?: throw IllegalStateException("BLETransport: Characteristic not found")
        val command = if (data.endsWith("\r")) data else data + "\r"
        
        char.value = command.toByteArray(Charsets.UTF_8)
        char.writeType = BluetoothGattCharacteristic.WRITE_TYPE_NO_RESPONSE
        gatt.writeCharacteristic(char)
    }

    override fun setOnDataReceivedListener(listener: (String) -> Unit) {
        dataListener = listener
    }
}
