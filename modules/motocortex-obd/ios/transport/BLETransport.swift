import Foundation
import CoreBluetooth

class BLETransport: NSObject, OBDTransport, CBCentralManagerDelegate, CBPeripheralDelegate {
    private var centralManager: CBCentralManager?
    private var peripheral: CBPeripheral?
    private var writeCharacteristic: CBCharacteristic?
    private var dataListener: ((String) -> Void)?
    private var connectCompletion: ((Bool) -> Void)?

    private let SERVICE_UUID = CBUUID(string: "0000ffe0-0000-1000-8000-00805f9b34fb")
    private let CHARACTERISTIC_UUID = CBUUID(string: "0000ffe1-0000-1000-8000-00805f9b34fb")

    override init() {
        super.init()
    }

    func connect(target: String, completion: @escaping (Bool) -> Void) {
        disconnect()
        connectCompletion = completion
        centralManager = CBCentralManager(delegate: self, queue: nil)
    }

    func disconnect() {
        if let manager = centralManager, let per = peripheral {
            manager.cancelPeripheralConnection(per)
        }
        peripheral = nil
        writeCharacteristic = nil
        centralManager = nil
    }

    func write(data: String) {
        guard let per = peripheral, let char = writeCharacteristic else {
            print("[BLETransport] Write failed: Peripheral or Characteristic is nil.")
            return
        }
        let command = data.hasSuffix("\r") ? data : data + "\r"
        if let payload = command.data(using: .utf8) {
            per.writeValue(payload, for: char, type: .withoutResponse)
        }
    }

    func setOnDataReceivedListener(listener: @escaping (String) -> Void) {
        dataListener = listener
    }

    // MARK: - CBCentralManagerDelegate
    func centralManagerDidUpdateState(_ central: CBCentralManager) {
        if central.state == .poweredOn {
            central.scanForPeripherals(withServices: nil, options: nil)
        } else {
            connectCompletion?(false)
            connectCompletion = nil
        }
    }

    func centralManager(_ central: CBCentralManager, didDiscover peripheral: CBPeripheral, advertisementData: [String : Any], rssi RSSI: NSNumber) {
        self.peripheral = peripheral
        peripheral.delegate = self
        central.stopScan()
        central.connect(peripheral, options: nil)
    }

    func centralManager(_ central: CBCentralManager, didConnect peripheral: CBPeripheral) {
        print("[BLETransport] Connected successfully, discovering services...")
        peripheral.discoverServices([SERVICE_UUID])
    }

    func centralManager(_ central: CBCentralManager, didFailToConnect peripheral: CBPeripheral, error: Error?) {
        connectCompletion?(false)
        connectCompletion = nil
    }

    // MARK: - CBPeripheralDelegate
    func peripheral(_ peripheral: CBPeripheral, didDiscoverServices error: Error?) {
        if let services = peripheral.services {
            for service in services {
                if service.uuid == SERVICE_UUID {
                    peripheral.discoverCharacteristics([CHARACTERISTIC_UUID], for: service)
                    return
                }
            }
        }
        connectCompletion?(false)
        connectCompletion = nil
    }

    func peripheral(_ peripheral: CBPeripheral, didDiscoverCharacteristicsFor service: CBService, error: Error?) {
        if let characteristics = service.characteristics {
            for characteristic in characteristics {
                if characteristic.uuid == CHARACTERISTIC_UUID {
                    writeCharacteristic = characteristic
                    peripheral.setNotifyValue(true, for: characteristic)
                    print("[BLETransport] Characteristic notification enabled.")
                    connectCompletion?(true)
                    connectCompletion = nil
                    return
                }
            }
        }
        connectCompletion?(false)
        connectCompletion = nil
    }

    func peripheral(_ peripheral: CBPeripheral, didUpdateValueFor characteristic: CBCharacteristic, error: Error?) {
        if characteristic.uuid == CHARACTERISTIC_UUID, let value = characteristic.value {
            if let response = String(data: value, encoding: .utf8) {
                dataListener?(response)
            }
        }
    }
}
