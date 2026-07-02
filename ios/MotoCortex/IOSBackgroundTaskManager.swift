import Foundation
import UIKit

@objc(IOSBackgroundTaskManager)
class IOSBackgroundTaskManager: NSObject {
  private var backgroundTaskId: UIBackgroundTaskIdentifier = .invalid

  @objc
  func beginBackgroundTask(_ resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    if backgroundTaskId == .invalid {
      backgroundTaskId = UIApplication.shared.beginBackgroundTask(withName: "MotoCortexBackgroundFlush") { [weak self] in
        guard let self = self else { return }
        UIApplication.shared.endBackgroundTask(self.backgroundTaskId)
        self.backgroundTaskId = .invalid
      }
      resolve(backgroundTaskId.rawValue)
    } else {
      resolve(backgroundTaskId.rawValue)
    }
  }

  @objc
  func endBackgroundTask(_ resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    if backgroundTaskId != .invalid {
      UIApplication.shared.endBackgroundTask(backgroundTaskId)
      backgroundTaskId = .invalid
    }
    resolve(true)
  }

  @objc
  static func requiresMainQueueSetup() -> Bool {
    return true
  }
}
