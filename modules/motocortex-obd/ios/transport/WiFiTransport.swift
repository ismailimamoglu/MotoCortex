import Foundation
import Network

class WiFiTransport: OBDTransport {
    private var connection: NWConnection?
    private var dataListener: ((String) -> Void)?
    private let queue = DispatchQueue(label: "com.motocortex.obd.wifi")

    func connect(target: String, completion: @escaping (Bool) -> Void) {
        disconnect()
        let parts = target.components(separatedBy: ":")
        let ip = parts[0]
        let port = parts.count > 1 ? UInt16(parts[1]) ?? 35000 : 35000

        let host = NWEndpoint.Host(ip)
        let endpointPort = NWEndpoint.Port(rawValue: port) ?? NWEndpoint.Port(35000)

        // Configure TCP parameters with keep-alive and no-delay (Nagle algorithm disabled)
        let tcpParams = NWParameters.tcp
        if let tcpProtocolOptions = tcpParams.defaultProtocolStack.transportProtocol as? NWProtocolTCP.Options {
            tcpProtocolOptions.noDelay = true
            tcpProtocolOptions.enableKeepalive = true
            tcpProtocolOptions.keepaliveIdle = 30
        }

        let currentConnection = NWConnection(host: host, port: endpointPort, using: tcpParams)
        connection = currentConnection

        currentConnection.stateUpdateHandler = { state in
            switch state {
            case .ready:
                print("[WiFiTransport] Connected successfully.")
                self.startListening()
                completion(true)
            case .failed(let error):
                print("[WiFiTransport] Connection failed: \(error)")
                completion(false)
                self.disconnect()
            case .cancelled:
                completion(false)
            default:
                break
            }
        }
        currentConnection.start(queue: queue)
    }

    func disconnect() {
        connection?.cancel()
        connection = nil
    }

    func write(data: String) {
        guard let conn = connection else {
            print("[WiFiTransport] Write failed: Connection is nil.")
            return
        }
        let command = data.hasSuffix("\r") ? data : data + "\r"
        if let payload = command.data(using: .utf8) {
            conn.send(content: payload, completion: .contentProcessed({ error in
                if let err = error {
                    print("[WiFiTransport] Send failed: \(err)")
                }
            }))
        }
    }

    func setOnDataReceivedListener(listener: @escaping (String) -> Void) {
        dataListener = listener
    }

    private func startListening() {
        receiveNextChunk()
    }

    private func receiveNextChunk() {
        guard let conn = connection else { return }
        conn.receive(minimumIncompleteLength: 1, maximumLength: 1024) { [weak self] (data, _, isComplete, error) in
            guard let self = self else { return }
            if let payload = data, !payload.isEmpty {
                if let response = String(data: payload, encoding: .utf8) {
                    self.dataListener?(response)
                }
            }
            if isComplete {
                self.disconnect()
            } else if error == nil {
                self.receiveNextChunk()
            } else {
                self.disconnect()
            }
        }
    }
}
