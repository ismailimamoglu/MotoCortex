import Foundation
import CoreBluetooth

class BLETransport: NSObject, OBDTransport, CBCentralManagerDelegate, CBPeripheralDelegate {
    private var centralManager: CBCentralManager?
    private var peripheral: CBPeripheral?
    private var writeCharacteristic: CBCharacteristic?
    private var notifyCharacteristic: CBCharacteristic?
    private var dataListener: ((String) -> Void)?
    private var connectCompletion: ((Bool) -> Void)?
    private var targetIdentifier: String = ""

    private let KNOWN_SERVICE_UUIDS: [CBUUID] = [
        CBUUID(string: "0000ffe0-0000-1000-8000-00805f9b34fb"), // HM-10 / ELM327 / Vgate
        CBUUID(string: "0000fff0-0000-1000-8000-00805f9b34fb"), // UniCarScan
        CBUUID(string: "000018f0-0000-1000-8000-00805f9b34fb"), // Veepeak
        CBUUID(string: "e7810a71-73ae-499d-8c15-faa9aef0c3f2")  // vLinker / STN2120 / OBDLink
    ]

    override init() {
        super.init()
    }

    func connect(target: String, completion: @escaping (Bool) -> Void) {
        disconnect()
        self.targetIdentifier = target.trimmingCharacters(in: .whitespacesAndNewlines)
        self.connectCompletion = completion
        self.centralManager = CBCentralManager(delegate: self, queue: nil)
    }

    func disconnect() {
        if let manager = centralManager, let per = peripheral {
            manager.cancelPeripheralConnection(per)
        }
        peripheral = nil
        writeCharacteristic = nil
        notifyCharacteristic = nil
        centralManager = nil
        targetIdentifier = ""
    }

    func write(data: String) {
        guard let per = peripheral, let char = writeCharacteristic else {
            print("[BLETransport] Write failed: Peripheral or Characteristic is nil.")
            return
        }
        let command = data.hasSuffix("\r") ? data : data + "\r"
        if let payload = command.data(using: .utf8) {
            let writeType: CBCharacteristicWriteType = char.properties.contains(.writeWithoutResponse) ? .withoutResponse : .withResponse
            per.writeValue(payload, for: char, type: writeType)
        }
    }

    func setOnDataReceivedListener(listener: @escaping (String) -> Void) {
        dataListener = listener
    }

    // MARK: - CBCentralManagerDelegate
    func centralManagerDidUpdateState(_ central: CBCentralManager) {
        if central.state == .poweredOn {
            print("[BLETransport] Scanning for BLE peripherals matching target: '\(targetIdentifier)'...")
            central.scanForPeripherals(withServices: nil, options: nil)
        } else {
            connectCompletion?(false)
            connectCompletion = nil
        }
    }

    func centralManager(_ central: CBCentralManager, didDiscover peripheral: CBPeripheral, advertisementData: [String : Any], rssi RSSI: NSNumber) {
        let peripheralName = peripheral.name ?? advertisementData[CBAdvertisementDataLocalNameKey] as? String ?? ""
        let peripheralUuid = peripheral.identifier.uuidString

        // Target filtering: Match by UUID or Name if targetIdentifier is specified
        if !targetIdentifier.isEmpty && targetIdentifier.lowercased() != "any" {
            let matchesUuid = peripheralUuid.caseInsensitiveCompare(targetIdentifier) == .orderedSame
            let matchesName = !peripheralName.isEmpty && peripheralName.lowercased().contains(targetIdentifier.lowercased())
            if !matchesUuid && !matchesName {
                return // Ignore non-matching peripherals
            }
        }

        print("[BLETransport] Target matched: \(peripheralName) [\(peripheralUuid)]. Connecting...")
        self.peripheral = peripheral
        peripheral.delegate = self
        central.stopScan()
        central.connect(peripheral, options: nil)
    }

    func centralManager(_ central: CBCentralManager, didConnect peripheral: CBPeripheral) {
        print("[BLETransport] Connected successfully, discovering all GATT services...")
        peripheral.discoverServices(nil) // Discover all services for Greedy GATT resolution
    }

    func centralManager(_ central: CBCentralManager, didFailToConnect peripheral: CBPeripheral, error: Error?) {
        print("[BLETransport] Failed to connect: \(String(describing: error))")
        connectCompletion?(false)
        connectCompletion = nil
    }

    // MARK: - CBPeripheralDelegate
    func peripheral(_ peripheral: CBPeripheral, didDiscoverServices error: Error?) {
        guard let services = peripheral.services, error == nil else {
            connectCompletion?(false)
            connectCompletion = nil
            return
        }

        print("[BLETransport] Discovered \(services.count) services. Querying characteristics...")
        for service in services {
            // Ignore standard generic access/attribute services
            let uuidStr = service.uuid.uuidString.lowercased()
            if uuidStr.contains("1800") || uuidStr.contains("1801") || uuidStr.contains("180a") {
                continue
            }
            peripheral.discoverCharacteristics(nil, for: service)
        }
    }

    func peripheral(_ peripheral: CBPeripheral, didDiscoverCharacteristicsFor service: CBService, error: Error?) {
        guard let characteristics = service.characteristics, error == nil else { return }

        for characteristic in characteristics {
            let props = characteristic.properties
            let isWritable = props.contains(.write) || props.contains(.writeWithoutResponse)
            let isNotifiable = props.contains(.notify) || props.contains(.indicate)

            if isWritable && writeCharacteristic == nil {
                writeCharacteristic = characteristic
                print("[BLETransport] Found Writable Characteristic: \(characteristic.uuid) on Service \(service.uuid)")
            }
            if isNotifiable && notifyCharacteristic == nil {
                notifyCharacteristic = characteristic
                peripheral.setNotifyValue(true, for: characteristic)
                print("[BLETransport] Found Notifiable Characteristic: \(characteristic.uuid) on Service \(service.uuid)")
            }
        }

        if writeCharacteristic != nil && notifyCharacteristic != nil && connectCompletion != nil {
            print("[BLETransport] Greedy GATT Auto-Discovery Complete. Ready for communication.")
            connectCompletion?(true)
            connectCompletion = nil
        }
    }

    func peripheral(_ peripheral: CBPeripheral, didUpdateValueFor characteristic: CBCharacteristic, error: Error?) {
        if let value = characteristic.value, error == nil {
            if let response = String(data: value, encoding: .utf8) {
                dataListener?(response)
            }
        }
    }
}

