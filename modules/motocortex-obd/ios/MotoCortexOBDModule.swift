import ExpoModulesCore

public class MotoCortexOBDModule: Module {
  private let sessionManager = OBDSessionManager()
  // Direct Data Buffer for JSI Zero-Allocation Ring Buffer mapping
  private var telemetryBuffer = Data(count: 64)

  public func definition() -> ModuleDefinition {
    Name("MotoCortexOBDModule")

    Events("onConnectionStateChanged")

    OnCreate {
      self.sessionManager.setOnStateChangedListener { [weak self] state in
        self?.sendEvent("onConnectionStateChanged", [
          "state": state
        ])
      }

      self.sessionManager.setTelemetryListener { [weak self] data in
        self?.parseAndMutateTelemetry(data)
      }
    }

    AsyncFunction("connectDeviceAsync") { (type: String, target: String) async -> Bool in
      return await withCheckedContinuation { continuation in
        self.sessionManager.connect(type: type, target: target) { success in
          continuation.resume(returning: success)
        }
      }
    }

    AsyncFunction("disconnectDeviceAsync") {
      self.sessionManager.disconnect()
    }

    AsyncFunction("writeCommandAsync") { (command: String) async throws -> String in
      guard let q = self.sessionManager.queue else {
        throw NSError(domain: "OBD", code: -1, userInfo: [NSLocalizedDescriptionKey: "OBD Module: Device not connected"])
      }
      return try await withCheckedThrowingContinuation { continuation in
        q.enqueue(commandString: command, timeoutMs: 1000) { result in
          switch result {
          case .success(let response):
            continuation.resume(returning: response)
          case .failure(let error):
            continuation.resume(throwing: error)
          }
        }
      }
    }

    Function("abortPendingCommands") {
      self.sessionManager.queue?.abortPendingCommands()
    }

    /**
     * Returns a direct JSI buffer pointer mapping (maps to ArrayBuffer in JS).
     */
    Function("getTelemetryBuffer") { () -> Data in
      return self.telemetryBuffer
    }
  }

  private func parseAndMutateTelemetry(_ data: String) {
    let cleanData = data.replacingOccurrences(of: " ", with: "").trimmingCharacters(in: .whitespacesAndNewlines)
    guard cleanData.count >= 6 else { return }
    
    telemetryBuffer.withUnsafeMutableBytes { (bufferPointer: UnsafeMutableRawBufferPointer) in
      guard let baseAddress = bufferPointer.baseAddress else { return }
      
      if cleanData.hasPrefix("410C") && cleanData.count >= 8 { // RPM
        let hexVal = String(cleanData.prefix(8).suffix(4))
        if let val = Int(hexVal, radix: 16) {
          let rpm = Int32(val / 4)
          baseAddress.storeBytes(of: rpm.littleEndian, toByteOffset: 0, as: Int32.self)
        }
      } else if cleanData.hasPrefix("410D") && cleanData.count >= 6 { // Speed
        let hexVal = String(cleanData.prefix(6).suffix(2))
        if let val = Int(hexVal, radix: 16) {
          let speed = Int32(val)
          baseAddress.storeBytes(of: speed.littleEndian, toByteOffset: 4, as: Int32.self)
        }
      } else if cleanData.hasPrefix("4105") && cleanData.count >= 6 { // Coolant Temperature
        let hexVal = String(cleanData.prefix(6).suffix(2))
        if let val = Int(hexVal, radix: 16) {
          let coolant = Int32(val - 40)
          baseAddress.storeBytes(of: coolant.littleEndian, toByteOffset: 8, as: Int32.self)
        }
      } else if cleanData.hasPrefix("4111") && cleanData.count >= 6 { // Throttle Position
        let hexVal = String(cleanData.prefix(6).suffix(2))
        if let val = Int(hexVal, radix: 16) {
          let throttle = Int32((val * 100) / 255)
          baseAddress.storeBytes(of: throttle.littleEndian, toByteOffset: 12, as: Int32.self)
        }
      } else if cleanData.hasPrefix("4142") && cleanData.count >= 8 { // Voltage
        let hexVal = String(cleanData.prefix(8).suffix(4))
        if let val = Int(hexVal, radix: 16) {
          let voltage = Double(val) / 1000.0
          baseAddress.storeBytes(of: voltage.bitPattern.littleEndian, toByteOffset: 16, as: UInt64.self)
        }
      }
    }
  }
}
