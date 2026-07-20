package com.motocortex.obd.session

import android.content.Context
import com.motocortex.obd.queue.OBDCommandQueue
import com.motocortex.obd.transport.BLETransport
import com.motocortex.obd.transport.ClassicTransport
import com.motocortex.obd.transport.WiFiTransport
import com.motocortex.obd.transport.OBDTransport
import kotlinx.coroutines.*

class OBDSessionManager(private val context: Context) {
    enum class ConnectionState {
        DISCONNECTED,
        CONNECTING,
        CONNECTED,
        RECONNECTING
    }

    var currentState = ConnectionState.DISCONNECTED
        private set(value) {
            field = value
            onStateChangedListener?.invoke(value.name)
        }

    private var transport: OBDTransport? = null
    var queue: OBDCommandQueue? = null
        private set

    private var onStateChangedListener: ((String) -> Unit)? = null
    private var telemetryListener: ((String) -> Unit)? = null

    private val scope = CoroutineScope(Dispatchers.IO + SupervisorJob())
    private var heartbeatJob: Job? = null
    private var lastActivityTime = System.currentTimeMillis()

    private var currentType: String? = null
    private var currentTarget: String? = null

    fun setOnStateChangedListener(listener: (String) -> Unit) {
        onStateChangedListener = listener
    }

    fun setTelemetryListener(listener: (String) -> Unit) {
        telemetryListener = listener
    }

    fun connect(type: String, target: String): Boolean = runBlocking {
        currentType = type
        currentTarget = target
        currentState = ConnectionState.CONNECTING

        val newTransport = when (type.lowercase()) {
            "bluetooth" -> ClassicTransport()
            "ble" -> BLETransport(context)
            "wifi" -> WiFiTransport()
            else -> {
                currentState = ConnectionState.DISCONNECTED
                return@runBlocking false
            }
        }

        transport = newTransport
        val obdQueue = OBDCommandQueue(newTransport)
        queue = obdQueue

        val connected = withContext(Dispatchers.IO) {
            newTransport.connect(target)
        }

        if (connected) {
            obdQueue.startProcessing()
            currentState = ConnectionState.CONNECTED
            startHeartbeat()
            setupDataLogging()
            true
        } else {
            currentState = ConnectionState.DISCONNECTED
            false
        }
    }

    fun disconnect() {
        stopHeartbeat()
        queue?.stopProcessing()
        transport?.disconnect()
        queue = null
        transport = null
        currentState = ConnectionState.DISCONNECTED
    }

    private fun setupDataLogging() {
        transport?.setOnDataReceivedListener { data ->
            lastActivityTime = System.currentTimeMillis()
            telemetryListener?.invoke(data)
        }
    }

    /**
     * Cranking Recovery (Warm-Start):
     * Triggered on Broken Pipe / voltage drops during cranking.
     * Flushes queue and restarts socket within 500ms cooldown.
     */
    fun triggerCrankingRecovery() {
        if (currentState == ConnectionState.RECONNECTING) return
        System.err.println("[OBDSessionManager] Cranking detected! Initiating 500ms Warm-Start...")
        currentState = ConnectionState.RECONNECTING
        
        // Immediately flush the queue to start with a clean state on reconnect
        queue?.flush()
        
        scope.launch {
            delay(500) // Cooldown 500ms before warm-starting socket
            val type = currentType ?: return@launch
            val target = currentTarget ?: return@launch
            
            val reconnected = connect(type, target)
            if (!reconnected) {
                System.err.println("[OBDSessionManager] Cranking Recovery failed. Retrying in 2 seconds...")
                delay(2000)
                if (currentState == ConnectionState.RECONNECTING) {
                    connect(type, target)
                }
            }
        }
    }

    private fun startHeartbeat() {
        stopHeartbeat()
        heartbeatJob = scope.launch {
            while (isActive) {
                delay(1000)
                val now = System.currentTimeMillis()
                // Heartbeat ping (keep-alive) if idle for 30 seconds
                if (now - lastActivityTime >= 30000 && currentState == ConnectionState.CONNECTED) {
                    val q = queue
                    if (q != null) {
                        try {
                            System.out.println("[OBDSessionManager] Sending Keep-Alive (AT RV)...")
                            q.enqueue("AT RV", 1000L).await()
                            lastActivityTime = System.currentTimeMillis()
                        } catch (e: Exception) {
                            // If heartbeat fails, initiate Cranking Recovery
                            triggerCrankingRecovery()
                        }
                    }
                }
            }
        }
    }

    private fun stopHeartbeat() {
        heartbeatJob?.cancel()
        heartbeatJob = null
    }
}
