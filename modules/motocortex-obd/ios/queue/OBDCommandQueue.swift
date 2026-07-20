import Foundation

class OBDCommandQueue {
    private let transport: OBDTransport
    private var queue: [OBDCommand] = []
    private let queueLock = NSLock()
    private let processingQueue = DispatchQueue(label: "com.motocortex.obd.queue", qos: .userInitiated)
    private var isProcessing = false
    
    private var currentResponseHandler: ((String) -> Void)?
    private var currentFailureHandler: ((Error) -> Void)?
    private var responseBuffer = ""

    struct OBDCommand {
        let commandString: String
        let completion: (Result<String, Error>) -> Void
        let timeoutMs: Int
    }

    init(transport: OBDTransport) {
        self.transport = transport
        self.transport.setOnDataReceivedListener { [weak self] data in
            guard let self = self else { return }
            self.queueLock.lock()
            self.responseBuffer.append(data)
            if self.responseBuffer.contains(">") {
                let fullResponse = self.responseBuffer
                self.responseBuffer = ""
                self.currentResponseHandler?(fullResponse)
            }
            self.queueLock.unlock()
        }
    }

    func startProcessing() {
        queueLock.lock()
        defer { queueLock.unlock() }
        if isProcessing { return }
        isProcessing = true
        processNext()
    }

    func stopProcessing() {
        queueLock.lock()
        isProcessing = false
        queueLock.unlock()
        flush()
    }

    private func processNext() {
        processingQueue.async { [weak self] in
            guard let self = self else { return }
            self.queueLock.lock()
            if !self.isProcessing || self.queue.isEmpty {
                self.queueLock.unlock()
                return
            }
            let command = self.queue.removeFirst()
            self.queueLock.unlock()

            self.executeCommand(command) {
                self.processNext()
            }
        }
    }

    private func executeCommand(_ command: OBDCommand, completionHandler: @escaping () -> Void) {
        let semaphore = DispatchSemaphore(value: 0)
        
        queueLock.lock()
        currentResponseHandler = { response in
            command.completion(.success(response))
            semaphore.signal()
        }
        currentFailureHandler = { error in
            command.completion(.failure(error))
            semaphore.signal()
        }
        responseBuffer = ""
        transport.write(data: command.commandString)
        queueLock.unlock()

        let timeout = DispatchTime.now() + .milliseconds(command.timeoutMs)
        if semaphore.wait(timeout: timeout) == .timedOut {
            command.completion(.failure(NSError(domain: "OBDCommandQueue", code: -1, userInfo: [NSLocalizedDescriptionKey: "Command timed out"])))
        }

        queueLock.lock()
        currentResponseHandler = nil
        currentFailureHandler = nil
        queueLock.unlock()

        completionHandler()
    }

    /**
     * Flushes the entire queue. Clears all pending commands.
     * Used for Cranking Recovery and Abort gates.
     */
    func flush() {
        queueLock.lock()
        defer { queueLock.unlock() }
        for cmd in queue {
            cmd.completion(.failure(NSError(domain: "OBDCommandQueue", code: -2, userInfo: [NSLocalizedDescriptionKey: "Queue flushed"])))
        }
        queue.removeAll()
        currentFailureHandler?(NSError(domain: "OBDCommandQueue", code: -2, userInfo: [NSLocalizedDescriptionKey: "Queue flushed"]))
        currentResponseHandler = nil
        currentFailureHandler = nil
        responseBuffer = ""
    }

    func abortPendingCommands() {
        flush()
        print("[OBDCommandQueue] Pending commands aborted.")
    }

    func enqueue(commandString: String, timeoutMs: Int = 1000, completion: @escaping (Result<String, Error>) -> Void) {
        queueLock.lock()
        queue.append(OBDCommand(commandString: commandString, completion: completion, timeoutMs: timeoutMs))
        queueLock.unlock()
        startProcessing()
    }
}
