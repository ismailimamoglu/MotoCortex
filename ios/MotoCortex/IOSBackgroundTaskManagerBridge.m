#import <React/RCTBridgeModule.h>

@interface RCT_EXTERN_MODULE(IOSBackgroundTaskManager, NSObject)
RCT_EXTERN_METHOD(beginBackgroundTask:(RCTPromiseResolveBlock)resolve rejecter:(RCTPromiseRejectBlock)reject)
RCT_EXTERN_METHOD(endBackgroundTask:(RCTPromiseResolveBlock)resolve rejecter:(RCTPromiseRejectBlock)reject)
@end
