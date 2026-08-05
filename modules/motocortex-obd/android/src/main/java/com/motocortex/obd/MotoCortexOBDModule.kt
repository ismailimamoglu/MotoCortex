package com.motocortex.obd

import com.motocortex.obd.session.OBDSessionManager
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.nio.ByteBuffer
import kotlinx.coroutines.runBlocking

class MotoCortexOBDModule : Module() {
    private var _sessionManager: OBDSessionManager? = null

    private val sessionManager: OBDSessionManager
        get() {
            if (_sessionManager == null) {
                val ctx = appContext.reactContext ?: throw IllegalStateException("OBD Module: ReactContext not ready")
                val manager = OBDSessionManager(ctx)
                manager.setOnStateChangedListener { state ->
                    sendEvent("onConnectionStateChanged", mapOf("state" to state))
                }
                manager.setTelemetryListener { data ->
                    parseAndMutateTelemetry(data)
                }
                _sessionManager = manager
            }
            return _sessionManager!!
        }

    // Direct ByteBuffer for Zero-Allocation JSI Ring Buffer
    // RPM (Int, 4 bytes) at 0
    // Speed (Int, 4 bytes) at 4
    // Coolant (Int, 4 bytes) at 8
    // Throttle (Int, 4 bytes) at 12
    // Voltage (Double, 8 bytes) at 16
    private val telemetryBuffer: ByteBuffer = ByteBuffer.allocateDirect(64)

    override fun definition() = ModuleDefinition {
        Name("MotoCortexOBDModule")

        Events("onConnectionStateChanged")

        OnCreate {
            // Deferred initialization to avoid accessing ReactContext during initial module registration
        }

        AsyncFunction("connectDeviceAsync") { type: String, target: String ->
            sessionManager.connect(type, target)
        }

        AsyncFunction("disconnectDeviceAsync") {
            sessionManager.disconnect()
        }

        AsyncFunction("writeCommandAsync") { command: String ->
            val q = sessionManager.queue ?: throw IllegalStateException("OBD Module: Device not connected")
            runBlocking {
                q.enqueue(command, 1000L).await()
            }
        }

        Function("abortPendingCommands") {
            sessionManager.queue?.abortPendingCommands()
        }

        /**
         * Returns a direct reference to the ByteBuffer (maps to ArrayBuffer in JS).
         * Bypasses event bridging to support 20 Hz updates without allocation overhead.
         */
        Function("getTelemetryBuffer") {
            telemetryBuffer
        }
    }

    private fun parseAndMutateTelemetry(data: String) {
        try {
            val cleanData = data.replace(" ", "").trim()
            if (cleanData.startsWith("410C")) { // Engine RPM
                val hexVal = cleanData.substring(4, 8)
                val rpm = (hexVal.toInt(16)) / 4
                telemetryBuffer.putInt(0, rpm)
            } else if (cleanData.startsWith("410D")) { // Vehicle Speed
                val hexVal = cleanData.substring(4, 6)
                val speed = hexVal.toInt(16)
                telemetryBuffer.putInt(4, speed)
            } else if (cleanData.startsWith("4105")) { // Coolant Temperature
                val hexVal = cleanData.substring(4, 6)
                val coolant = hexVal.toInt(16) - 40
                telemetryBuffer.putInt(8, coolant)
            } else if (cleanData.startsWith("4111")) { // Throttle Position
                val hexVal = cleanData.substring(4, 6)
                val throttle = (hexVal.toInt(16) * 100) / 255
                telemetryBuffer.putInt(12, throttle)
            } else if (cleanData.startsWith("4142")) { // Voltage
                val hexVal = cleanData.substring(4, 8)
                val voltage = hexVal.toInt(16) / 1000.0
                telemetryBuffer.putDouble(16, voltage)
            }
        } catch (e: Exception) {
            // Silently ignore malformed frames on noisy raw streams
        }
    }
}
