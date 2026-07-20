package com.motocortex.obd.queue

import com.motocortex.obd.transport.OBDTransport
import kotlinx.coroutines.*
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import java.util.concurrent.ConcurrentLinkedQueue

class OBDCommandQueue(private val transport: OBDTransport) {
    private val queue = ConcurrentLinkedQueue<OBDCommand>()
    private val mutex = Mutex()
    private val scope = CoroutineScope(Dispatchers.IO + SupervisorJob())
    private var processingJob: Job? = null
    
    private var currentResponseHandler: CompletableDeferred<String>? = null
    private val responseBuffer = StringBuilder()

    init {
        transport.setOnDataReceivedListener { data ->
            synchronized(responseBuffer) {
                responseBuffer.append(data)
                // ELM327 responses end with standard prompt char '>'
                if (responseBuffer.contains(">")) {
                    val fullResponse = responseBuffer.toString()
                    responseBuffer.clear()
                    currentResponseHandler?.complete(fullResponse)
                }
            }
        }
    }

    data class OBDCommand(
        val commandString: String,
        val responseDeferred: CompletableDeferred<String>,
        val timeoutMs: Long = 1000L
    )

    fun startProcessing() {
        if (processingJob != null) return
        processingJob = scope.launch {
            while (isActive) {
                val command = queue.poll()
                if (command != null) {
                    executeCommandWithMutex(command)
                } else {
                    delay(10) // wait for next command in queue
                }
            }
        }
    }

    fun stopProcessing() {
        processingJob?.cancel()
        processingJob = null
        flush()
    }

    private suspend fun executeCommandWithMutex(command: OBDCommand) {
        // Enforce mutex auto-release guarantee under try-finally block
        try {
            mutex.withLock {
                currentResponseHandler = command.responseDeferred
                synchronized(responseBuffer) { responseBuffer.clear() }
                
                transport.write(command.commandString)
                
                withTimeout(command.timeoutMs) {
                    command.responseDeferred.await()
                }
            }
        } catch (e: TimeoutCancellationException) {
            command.responseDeferred.completeExceptionally(e)
            System.err.println("[OBDCommandQueue] Command ${command.commandString} timed out.")
        } catch (e: Exception) {
            command.responseDeferred.completeExceptionally(e)
            System.err.println("[OBDCommandQueue] Command ${command.commandString} error: ${e.message}")
        } finally {
            currentResponseHandler = null
        }
    }

    /**
     * Immediately clears all pending commands in the queue.
     * Required for ELMIdentifierGate fails and Cranking Recovery.
     */
    fun flush() {
        queue.clear()
        currentResponseHandler?.let {
            if (it.isActive) {
                it.completeExceptionally(CancellationException("Queue flushed due to recovery/abort."))
            }
        }
        currentResponseHandler = null
        synchronized(responseBuffer) { responseBuffer.clear() }
    }

    /**
     * Abort pending commands and cancel execution immediately.
     */
    fun abortPendingCommands() {
        flush()
        System.out.println("[OBDCommandQueue] Pending commands aborted successfully.")
    }

    fun enqueue(commandString: String, timeoutMs: Long = 1000L): Deferred<String> {
        val deferred = CompletableDeferred<String>()
        queue.add(OBDCommand(commandString, deferred, timeoutMs))
        return deferred
    }
}
