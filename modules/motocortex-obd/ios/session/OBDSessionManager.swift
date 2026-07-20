import Foundation

class OBDSessionManager {
    enum ConnectionState: String {
        case disconnected = "DISCONNECTED"
        case connecting = "CONNECTING"
        case connected = "CONNECTED"
        case reconnecting = "RECONNECTING"
    }

    private(set) var currentState = ConnectionState.disconnected {
        didSet {
            onStateChangedListener?(currentState.rawValue)
        }
    }

    private var transport: OBDTransport?
    private(set) var queue: OBDCommandQueue?

    private var onStateChangedListener: ((String) -> Void)?
    private var telemetryListener: ((String) -> Void)?

    private let sessionQueue = DispatchQueue(label: "com.motocortex.obd.session")
    private var heartbeatTimer: Timer?
    private var lastActivityTime = Date()

    private var currentType: String?
    private var currentTarget: String?

    func setOnStateChangedListener(listener: @escaping (String) -> Void) {
        onStateChangedListener = listener
    }

    func setTelemetryListener(listener: @escaping (String) -> Void) {
        telemetryListener = listener
    }

    func connect(type: String, target: String, completion: @escaping (Bool) -> Void) {
        currentType = type
        currentTarget = target
        currentState = .connecting

        let newTransport: OBDTransport
        switch type.lowercased() {
        case "ble":
            newTransport = BLETransport()
        case "wifi":
            newTransport = WiFiTransport()
        default:
            currentState = .disconnected
            completion(false)
            return
        }

        transport = newTransport
        let obdQueue = OBDCommandQueue(transport: newTransport)
        queue = obdQueue

        newTransport.connect(target: target) { [weak self] success in
            guard let self = self else { return }
            if success {
                obdQueue.startProcessing()
                self.currentState = .connected
                self.startHeartbeat()
                self.setupDataLogging()
                completion(true)
            } else {
                self.currentState = .disconnected
                completion(false)
            }
        }
    }

    func disconnect() {
        stopHeartbeat()
        queue?.stopProcessing()
        transport?.disconnect()
        queue = nil
        transport = nil
        currentState = .disconnected
    }

    private func setupDataLogging() {
        transport?.setOnDataReceivedListener { [weak self] data in
            guard let self = self else { return }
            self.lastActivityTime = Date()
            self.telemetryListener?(data)
        }
    }

    /**
     * Cranking Recovery (Warm-Start):
     * Triggered on Broken Pipe / voltage drops during cranking.
     * Flushes queue and restarts socket within 500ms cooldown.
     */
    func triggerCrankingRecovery() {
        if currentState == .reconnecting { return }
        print("[OBDSessionManager] Cranking detected! Initiating 500ms Warm-Start...")
        currentState = .reconnecting
        
        // Immediately flush the queue (clean-state)
        queue?.flush()
        
        sessionQueue.asyncAfter(deadline: .now() + 0.5) { [weak self] in
            guard let self = self, let type = self.currentType, let target = self.currentTarget else { return }
            self.connect(type: type, target: target) { reconnected in
                if !reconnected {
                    print("[OBDSessionManager] Cranking Recovery failed. Retrying in 2 seconds...")
                    self.sessionQueue.asyncAfter(deadline: .now() + 2.0) {
                        if self.currentState == .reconnecting {
                            self.connect(type: type, target: target) { _ in }
                        }
                    }
                }
            }
        }
    }

    private func startHeartbeat() {
        stopHeartbeat()
        DispatchQueue.main.async { [weak self] in
            guard let self = self else { return }
            self.heartbeatTimer = Timer.scheduledTimer(withTimeInterval: 1.0, repeats: true) { _ in
                self.sessionQueue.async {
                    let now = Date()
                    if now.timeIntervalSince(self.lastActivityTime) >= 30.0 && self.currentState == .connected {
                        if let q = self.queue {
                            print("[OBDSessionManager] Sending Keep-Alive (AT RV)...")
                            q.enqueue(commandString: "AT RV", timeoutMs: 1000) { result in
                                switch result {
                                case .success:
                                    self.lastActivityTime = Date()
                                case .failure:
                                    self.triggerCrankingRecovery()
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    private func stopHeartbeat() {
        DispatchQueue.main.async { [weak self] in
            self?.heartbeatTimer?.invalidate()
            self?.heartbeatTimer = nil
        }
    }
}
