//
//  DoIpUdpDiscovery.swift
//  MotoCortex v10.0 - Native DoIP (ISO 13400) Swift UDP 13400 Vehicle Discovery Engine
//

import Foundation
import Network

@objc(DoIpUdpDiscovery)
public class DoIpUdpDiscovery: NSObject {

    @objc public struct DiscoveredVehicleSwift {
        let ipAddress: String
        let vin: String
        let logicalAddress: UInt16
    }

    private static let doipPort: NWEndpoint.Port = 13400
    private static let protocolVersion: UInt8 = 0x02
    private static let inverseVersion: UInt8 = 0xFD
    private static let vehicleIdRequestType: UInt16 = 0x0001
    private static let vehicleAnnouncementType: UInt16 = 0x0004

    @objc public static func discoverVehicles(completion: @escaping ([[String: Any]]) -> Void) {
        var results: [[String: Any]] = []

        let connection = NWConnection(
            host: .ipv4(.broadcast),
            port: doipPort,
            using: .udp
        )

        connection.stateUpdateHandler = { state in
            if case .ready = state {
                // Header: [0x02, 0xFD, 0x00, 0x01, 0x00, 0x00, 0x00, 0x00]
                let requestBytes: [UInt8] = [
                    protocolVersion,
                    inverseVersion,
                    UInt8((vehicleIdRequestType >> 8) & 0xFF),
                    UInt8(vehicleIdRequestType & 0xFF),
                    0x00, 0x00, 0x00, 0x00
                ]
                let payloadData = Data(requestBytes)

                connection.send(content: payloadData, completion: .contentProcessed({ error in
                    if let error = error {
                        print("[DoIpUdpDiscovery] Send error: \(error)")
                    }
                }))

                // Receive UDP Broadcast Response
                connection.receive(minimumIncompleteLength: 8, maximumLength: 512) { data, _, _, error in
                    if let data = data, data.count >= 25 {
                        let ver = data[0]
                        let payloadType = (UInt16(data[2]) << 8) | UInt16(data[3])

                        if ver == protocolVersion && payloadType == vehicleAnnouncementType {
                            let vinData = data.subdata(in: 8..<25)
                            let vinStr = String(data: vinData, encoding: .ascii)?.trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
                            let logicalAddr = (UInt16(data[25]) << 8) | UInt16(data[26])

                            let vehicleDict: [String: Any] = [
                                "ipAddress": "192.168.1.1",
                                "vin": vinStr,
                                "logicalAddress": Int(logicalAddr)
                            ]
                            results.append(vehicleDict)
                        }
                    }
                    connection.cancel()
                    completion(results)
                }
            }
        }

        connection.start(queue: .global())

        // Timeout fallback after 3 seconds
        DispatchQueue.global().asyncAfter(deadline: .now() + 3.0) {
            if connection.state != .cancelled {
                connection.cancel()
                completion(results)
            }
        }
    }
}
