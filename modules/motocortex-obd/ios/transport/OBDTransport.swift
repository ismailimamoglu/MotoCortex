import Foundation

protocol OBDTransport: AnyObject {
    func connect(target: String, completion: @escaping (Bool) -> Void)
    func disconnect()
    func write(data: String)
    func setOnDataReceivedListener(listener: @escaping (String) -> Void)
}
