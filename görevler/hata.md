-------------------------------------
Translated Report (Full Report Below)
-------------------------------------
Process:             MotoCortex [44751]
Path:                /Users/USER/Library/Developer/CoreSimulator/Devices/D90D7F2D-2DF3-4611-8356-BDEDCC12E373/data/Containers/Bundle/Application/B96FADAA-9DF9-499D-836B-3A35BD3BAE61/MotoCortex.app/MotoCortex
Identifier:          com.ismail.motocortexv2
Version:             1.1.0 (41)
Code Type:           ARM-64 (Native)
Role:                Foreground
Parent Process:      launchd_sim [44170]
Coalition:           com.apple.CoreSimulator.SimDevice.D90D7F2D-2DF3-4611-8356-BDEDCC12E373 [4006]
Responsible Process: SimulatorTrampoline [4118]
User ID:             501

Date/Time:           2026-07-30 16:53:02.7390 +0300
Launch Time:         2026-07-30 16:44:41.1678 +0300
Hardware Model:      Mac16,10
OS Version:          macOS 26.5.2 (25F84)
Release Type:        User

Crash Reporter Key:  3D338F32-AE74-8406-89A9-2E77384557C6
Incident Identifier: 07E59EA4-B057-4371-A422-2276E9902722

Time Awake Since Boot: 26000 seconds

System Integrity Protection: enabled

Triggered by Thread: 0, Dispatch Queue: com.apple.main-thread

Exception Type:    EXC_CRASH (SIGABRT)
Exception Codes:   0x0000000000000000, 0x0000000000000000

Termination Reason:  Namespace SIGNAL, Code 6, Abort trap: 6
Terminating Process: MotoCortex [44751]


Thread 0 Crashed::  Dispatch queue: com.apple.main-thread
0   libsystem_kernel.dylib        	       0x10011088c __pthread_kill + 8
1   libsystem_pthread.dylib       	       0x10053a338 pthread_kill + 264
2   libsystem_c.dylib             	       0x18017ba08 __abort + 120
3   libsystem_c.dylib             	       0x18017b990 abort + 128
4   libsystem_c.dylib             	       0x18017ad5c __assert_rtn + 268
5   MotoCortex.debug.dylib        	       0x105b62c3c facebook::react::jsinspector_modern::HostTarget::registerInstance(facebook::react::jsinspector_modern::InstanceTargetDelegate&) + 124
6   MotoCortex.debug.dylib        	       0x105ad1e00 facebook::react::Instance::initializeBridge(std::__1::unique_ptr<facebook::react::InstanceCallback, std::__1::default_delete<facebook::react::InstanceCallback>>, std::__1::shared_ptr<facebook::react::JSExecutorFactory>, std::__1::shared_ptr<facebook::react::MessageQueueThread>, std::__1::shared_ptr<facebook::react::ModuleRegistry>, facebook::react::jsinspector_modern::HostTarget*)::$_0::operator()()::'lambda'(facebook::react::jsinspector_modern::HostTarget&)::operator()(facebook::react::jsinspector_modern::HostTarget&) const + 60
7   MotoCortex.debug.dylib        	       0x105ad1db8 std::__1::__invoke_result_impl<void, facebook::react::Instance::initializeBridge(std::__1::unique_ptr<facebook::react::InstanceCallback, std::__1::default_delete<facebook::react::InstanceCallback>>, std::__1::shared_ptr<facebook::react::JSExecutorFactory>, std::__1::shared_ptr<facebook::react::MessageQueueThread>, std::__1::shared_ptr<facebook::react::ModuleRegistry>, facebook::react::jsinspector_modern::HostTarget*)::$_0::operator()()::'lambda'(facebook::react::jsinspector_modern::HostTarget&)&, facebook::react::jsinspector_modern::HostTarget&>::type std::__1::__invoke[abi:dee210106]<facebook::react::Instance::initializeBridge(std::__1::unique_ptr<facebook::react::InstanceCallback, std::__1::default_delete<facebook::react::InstanceCallback>>, std::__1::shared_ptr<facebook::react::JSExecutorFactory>, std::__1::shared_ptr<facebook::react::MessageQueueThread>, std::__1::shared_ptr<facebook::react::ModuleRegistry>, facebook::react::jsinspector_modern::HostTarget*)::$_0::operator()()::'lambda'(facebook::react::jsinspector_modern::HostTarget&)&, facebook::react::jsinspector_modern::HostTarget&>(facebook::react::Instance::initializeBridge(std::__1::unique_ptr<facebook::react::InstanceCallback, std::__1::default_delete<facebook::react::InstanceCallback>>, std::__1::shared_ptr<facebook::react::JSExecutorFactory>, std::__1::shared_ptr<facebook::react::MessageQueueThread>, std::__1::shared_ptr<facebook::react::ModuleRegistry>, facebook::react::jsinspector_modern::HostTarget*)::$_0::operator()()::'lambda'(facebook::react::jsinspector_modern::HostTarget&)&, facebook::react::jsinspector_modern::HostTarget&) + 32
8   MotoCortex.debug.dylib        	       0x105ad1d8c void std::__1::__invoke_void_return_wrapper<void, true>::__call[abi:dee210106]<facebook::react::Instance::initializeBridge(std::__1::unique_ptr<facebook::react::InstanceCallback, std::__1::default_delete<facebook::react::InstanceCallback>>, std::__1::shared_ptr<facebook::react::JSExecutorFactory>, std::__1::shared_ptr<facebook::react::MessageQueueThread>, std::__1::shared_ptr<facebook::react::ModuleRegistry>, facebook::react::jsinspector_modern::HostTarget*)::$_0::operator()()::'lambda'(facebook::react::jsinspector_modern::HostTarget&)&, facebook::react::jsinspector_modern::HostTarget&>(facebook::react::Instance::initializeBridge(std::__1::unique_ptr<facebook::react::InstanceCallback, std::__1::default_delete<facebook::react::InstanceCallback>>, std::__1::shared_ptr<facebook::react::JSExecutorFactory>, std::__1::shared_ptr<facebook::react::MessageQueueThread>, std::__1::shared_ptr<facebook::react::ModuleRegistry>, facebook::react::jsinspector_modern::HostTarget*)::$_0::operator()()::'lambda'(facebook::react::jsinspector_modern::HostTarget&)&, facebook::react::jsinspector_modern::HostTarget&) + 32
9   MotoCortex.debug.dylib        	       0x105ad1d60 void std::__1::__invoke_r[abi:dee210106]<void, facebook::react::Instance::initializeBridge(std::__1::unique_ptr<facebook::react::InstanceCallback, std::__1::default_delete<facebook::react::InstanceCallback>>, std::__1::shared_ptr<facebook::react::JSExecutorFactory>, std::__1::shared_ptr<facebook::react::MessageQueueThread>, std::__1::shared_ptr<facebook::react::ModuleRegistry>, facebook::react::jsinspector_modern::HostTarget*)::$_0::operator()()::'lambda'(facebook::react::jsinspector_modern::HostTarget&)&, facebook::react::jsinspector_modern::HostTarget&>(facebook::react::Instance::initializeBridge(std::__1::unique_ptr<facebook::react::InstanceCallback, std::__1::default_delete<facebook::react::InstanceCallback>>, std::__1::shared_ptr<facebook::react::JSExecutorFactory>, std::__1::shared_ptr<facebook::react::MessageQueueThread>, std::__1::shared_ptr<facebook::react::ModuleRegistry>, facebook::react::jsinspector_modern::HostTarget*)::$_0::operator()()::'lambda'(facebook::react::jsinspector_modern::HostTarget&)&, facebook::react::jsinspector_modern::HostTarget&) + 32
10  MotoCortex.debug.dylib        	       0x105ad1c0c std::__1::__function::__func<facebook::react::Instance::initializeBridge(std::__1::unique_ptr<facebook::react::InstanceCallback, std::__1::default_delete<facebook::react::InstanceCallback>>, std::__1::shared_ptr<facebook::react::JSExecutorFactory>, std::__1::shared_ptr<facebook::react::MessageQueueThread>, std::__1::shared_ptr<facebook::react::ModuleRegistry>, facebook::react::jsinspector_modern::HostTarget*)::$_0::operator()()::'lambda'(facebook::react::jsinspector_modern::HostTarget&), void (facebook::react::jsinspector_modern::HostTarget&)>::operator()(facebook::react::jsinspector_modern::HostTarget&) + 36
11  MotoCortex.debug.dylib        	       0x10546dbc0 std::__1::__function::__value_func<void (facebook::react::jsinspector_modern::HostTarget&)>::operator()[abi:dee210106](facebook::react::jsinspector_modern::HostTarget&) const + 68
12  MotoCortex.debug.dylib        	       0x10546db58 std::__1::function<void (facebook::react::jsinspector_modern::HostTarget&)>::operator()(facebook::react::jsinspector_modern::HostTarget&) const + 32
13  MotoCortex.debug.dylib        	       0x10546d9f8 auto std::__1::function<void (std::__1::function<void (facebook::react::jsinspector_modern::HostTarget&)>&&)> facebook::react::jsinspector_modern::makeScopedExecutor<facebook::react::jsinspector_modern::HostTarget>(std::__1::shared_ptr<facebook::react::jsinspector_modern::HostTarget>, std::__1::function<void (std::__1::function<void ()>&&)>)::'lambda'(facebook::react::jsinspector_modern::HostTarget&&)::operator()<std::__1::function<void (facebook::react::jsinspector_modern::HostTarget&)>>(facebook::react::jsinspector_modern::HostTarget&&) const::'lambda'()::operator()() const + 96
14  MotoCortex.debug.dylib        	       0x10546d98c std::__1::__invoke_result_impl<void, auto std::__1::function<void (std::__1::function<void (facebook::react::jsinspector_modern::HostTarget&)>&&)> facebook::react::jsinspector_modern::makeScopedExecutor<facebook::react::jsinspector_modern::HostTarget>(std::__1::shared_ptr<facebook::react::jsinspector_modern::HostTarget>, std::__1::function<void (std::__1::function<void ()>&&)>)::'lambda'(facebook::react::jsinspector_modern::HostTarget&&)::operator()<std::__1::function<void (facebook::react::jsinspector_modern::HostTarget&)>>(facebook::react::jsinspector_modern::HostTarget&&) const::'lambda'()&>::type std::__1::__invoke[abi:dee210106]<auto std::__1::function<void (std::__1::function<void (facebook::react::jsinspector_modern::HostTarget&)>&&)> facebook::react::jsinspector_modern::makeScopedExecutor<facebook::react::jsinspector_modern::HostTarget>(std::__1::shared_ptr<facebook::react::jsinspector_modern::HostTarget>, std::__1::function<void (std::__1::function<void ()>&&)>)::'lambda'(facebook::react::jsinspector_modern::HostTarget&&)::operator()<std::__1::function<void (facebook::react::jsinspector_modern::HostTarget&)>>(facebook::react::jsinspector_modern::HostTarget&&) const::'lambda'()&>(auto std::__1::function<void (std::__1::function<void (facebook::react::jsinspector_modern::HostTarget&)>&&)> facebook::react::jsinspector_modern::makeScopedExecutor<facebook::react::jsinspector_modern::HostTarget>(std::__1::shared_ptr<facebook::react::jsinspector_modern::HostTarget>, std::__1::function<void (std::__1::function<void ()>&&)>)::'lambda'(facebook::react::jsinspector_modern::HostTarget&&)::operator()<std::__1::function<void (facebook::react::jsinspector_modern::HostTarget&)>>(facebook::react::jsinspector_modern::HostTarget&&) const::'lambda'()&&&...) + 24
15  MotoCortex.debug.dylib        	       0x10546d968 void std::__1::__invoke_void_return_wrapper<void, true>::__call[abi:dee210106]<auto std::__1::function<void (std::__1::function<void (facebook::react::jsinspector_modern::HostTarget&)>&&)> facebook::react::jsinspector_modern::makeScopedExecutor<facebook::react::jsinspector_modern::HostTarget>(std::__1::shared_ptr<facebook::react::jsinspector_modern::HostTarget>, std::__1::function<void (std::__1::function<void ()>&&)>)::'lambda'(facebook::react::jsinspector_modern::HostTarget&&)::operator()<std::__1::function<void (facebook::react::jsinspector_modern::HostTarget&)>>(facebook::react::jsinspector_modern::HostTarget&&) const::'lambda'()&>(auto std::__1::function<void (std::__1::function<void (facebook::react::jsinspector_modern::HostTarget&)>&&)> facebook::react::jsinspector_modern::makeScopedExecutor<facebook::react::jsinspector_modern::HostTarget>(std::__1::shared_ptr<facebook::react::jsinspector_modern::HostTarget>, std::__1::function<void (std::__1::function<void ()>&&)>)::'lambda'(facebook::react::jsinspector_modern::HostTarget&&)::operator()<std::__1::function<void (facebook::react::jsinspector_modern::HostTarget&)>>(facebook::react::jsinspector_modern::HostTarget&&) const::'lambda'()&) + 24
16  MotoCortex.debug.dylib        	       0x10546d944 facebook::react::jsinspector_modern::HostTarget std::__1::__invoke_r[abi:dee210106]<void, auto std::__1::function<void (std::__1::function<void (facebook::react::jsinspector_modern::HostTarget&)>&&)> facebook::react::jsinspector_modern::makeScopedExecutor<facebook::react::jsinspector_modern::HostTarget>(std::__1::shared_ptr<facebook::react::jsinspector_modern::HostTarget>, std::__1::function<void (std::__1::function<void ()>&&)>)::'lambda'(facebook::react::jsinspector_modern::HostTarget&&)::operator()<std::__1::function<void (facebook::react::jsinspector_modern::HostTarget&)>>(facebook::react::jsinspector_modern::HostTarget&&) const::'lambda'()&>(auto std::__1::function<void (std::__1::function<void (facebook::react::jsinspector_modern::HostTarget&)>&&)> facebook::react::jsinspector_modern::makeScopedExecutor<facebook::react::jsinspector_modern::HostTarget>(std::__1::shared_ptr<facebook::react::jsinspector_modern::HostTarget>, std::__1::function<void (std::__1::function<void ()>&&)>)::'lambda'(facebook::react::jsinspector_modern::HostTarget&&)::operator()<std::__1::function<void (facebook::react::jsinspector_modern::HostTarget&)>>(facebook::react::jsinspector_modern::HostTarget&&) const::'lambda'()&) + 24
17  MotoCortex.debug.dylib        	       0x10546d57c std::__1::__function::__func<auto std::__1::function<void (std::__1::function<void (facebook::react::jsinspector_modern::HostTarget&)>&&)> facebook::react::jsinspector_modern::makeScopedExecutor<facebook::react::jsinspector_modern::HostTarget>(std::__1::shared_ptr<facebook::react::jsinspector_modern::HostTarget>, std::__1::function<void (std::__1::function<void ()>&&)>)::'lambda'(facebook::react::jsinspector_modern::HostTarget&&)::operator()<std::__1::function<void (facebook::react::jsinspector_modern::HostTarget&)>>(facebook::react::jsinspector_modern::HostTarget&&) const::'lambda'(), void ()>::operator()() + 28
18  MotoCortex.debug.dylib        	       0x10482fec8 std::__1::__function::__value_func<void ()>::operator()[abi:dee210106]() const + 60
19  MotoCortex.debug.dylib        	       0x10482fe80 std::__1::function<void ()>::operator()() const + 24
20  MotoCortex.debug.dylib        	       0x1050bfb38 ___ZZ18-[RCTBridge setUp]ENK3$_0clINSt3__18functionIFvvEEEEEDaT__block_invoke + 28
21  MotoCortex.debug.dylib        	       0x105197920 __RCTExecuteOnMainQueue_block_invoke + 40
22  libdispatch.dylib             	       0x1801866a0 _dispatch_call_block_and_release + 24
23  libdispatch.dylib             	       0x1801a0e98 _dispatch_client_callout + 12
24  libdispatch.dylib             	       0x1801bd748 <deduplicated_symbol> + 24
25  libdispatch.dylib             	       0x180195d34 _dispatch_main_queue_drain + 1172
26  libdispatch.dylib             	       0x180195890 _dispatch_main_queue_callback_4CF + 40
27  CoreFoundation                	       0x180422a94 __CFRUNLOOP_IS_SERVICING_THE_MAIN_DISPATCH_QUEUE__ + 12
28  CoreFoundation                	       0x180421c6c __CFRunLoopRun + 1884
29  CoreFoundation                	       0x18041c904 _CFRunLoopRunSpecificWithOptions + 496
30  GraphicsServices              	       0x1933599c0 GSEventRunModal + 116
31  UIKitCore                     	       0x1864a54cc -[UIApplication _run] + 776
32  UIKitCore                     	       0x186b9f910 UIApplicationMain + 120
33  MotoCortex.debug.dylib        	       0x104593458 __debug_main_executable_dylib_entry_point + 96 (main.m:7)
34  dyld_sim                      	       0x1002d30e4 start_sim + 20
35  dyld                          	       0x1001a7e00 start + 6992

Thread 1:: com.apple.uikit.eventfetch-thread
0   libsystem_kernel.dylib        	       0x100108b70 mach_msg2_trap + 8
1   libsystem_kernel.dylib        	       0x100119e5c mach_msg2_internal + 72
2   libsystem_kernel.dylib        	       0x100110c44 mach_msg_overwrite + 484
3   libsystem_kernel.dylib        	       0x100108ef0 mach_msg + 20
4   CoreFoundation                	       0x1804227c0 __CFRunLoopServiceMachPort + 156
5   CoreFoundation                	       0x180421978 __CFRunLoopRun + 1128
6   CoreFoundation                	       0x18041c904 _CFRunLoopRunSpecificWithOptions + 496
7   Foundation                    	       0x18112fa4c -[NSRunLoop(NSRunLoop) runMode:beforeDate:] + 208
8   Foundation                    	       0x18112fc68 -[NSRunLoop(NSRunLoop) runUntilDate:] + 60
9   UIKitCore                     	       0x1861d7ad4 -[UIEventFetcher threadMain] + 404
10  Foundation                    	       0x181154edc __NSThread__start__ + 716
11  libsystem_pthread.dylib       	       0x10053a63c _pthread_start + 104
12  libsystem_pthread.dylib       	       0x100535a34 thread_start + 8

Thread 2:: com.google.firebase.crashlytics.MachExceptionServer
0   libsystem_kernel.dylib        	       0x100108b70 mach_msg2_trap + 8
1   libsystem_kernel.dylib        	       0x100119e5c mach_msg2_internal + 72
2   libsystem_kernel.dylib        	       0x100110c44 mach_msg_overwrite + 484
3   libsystem_kernel.dylib        	       0x100108ef0 mach_msg + 20
4   MotoCortex.debug.dylib        	       0x104afeeb8 FIRCLSMachExceptionReadMessage + 80
5   MotoCortex.debug.dylib        	       0x104afedf0 FIRCLSMachExceptionServer + 52
6   libsystem_pthread.dylib       	       0x10053a63c _pthread_start + 104
7   libsystem_pthread.dylib       	       0x100535a34 thread_start + 8

Thread 3:: com.apple.NSURLConnectionLoader
0   libsystem_kernel.dylib        	       0x100108b70 mach_msg2_trap + 8
1   libsystem_kernel.dylib        	       0x100119e5c mach_msg2_internal + 72
2   libsystem_kernel.dylib        	       0x100110c44 mach_msg_overwrite + 484
3   libsystem_kernel.dylib        	       0x100108ef0 mach_msg + 20
4   CoreFoundation                	       0x1804227c0 __CFRunLoopServiceMachPort + 156
5   CoreFoundation                	       0x180421978 __CFRunLoopRun + 1128
6   CoreFoundation                	       0x18041c904 _CFRunLoopRunSpecificWithOptions + 496
7   CFNetwork                     	       0x184fb8020 +[__CFN_CoreSchedulingSetRunnable _run:] + 368
8   Foundation                    	       0x181154edc __NSThread__start__ + 716
9   libsystem_pthread.dylib       	       0x10053a63c _pthread_start + 104
10  libsystem_pthread.dylib       	       0x100535a34 thread_start + 8

Thread 4:: com.facebook.SocketRocket.NetworkThread
0   libsystem_kernel.dylib        	       0x100108b70 mach_msg2_trap + 8
1   libsystem_kernel.dylib        	       0x100119e5c mach_msg2_internal + 72
2   libsystem_kernel.dylib        	       0x100110c44 mach_msg_overwrite + 484
3   libsystem_kernel.dylib        	       0x100108ef0 mach_msg + 20
4   CoreFoundation                	       0x1804227c0 __CFRunLoopServiceMachPort + 156
5   CoreFoundation                	       0x180421978 __CFRunLoopRun + 1128
6   CoreFoundation                	       0x18041c904 _CFRunLoopRunSpecificWithOptions + 496
7   Foundation                    	       0x18112fa4c -[NSRunLoop(NSRunLoop) runMode:beforeDate:] + 208
8   MotoCortex.debug.dylib        	       0x105aba810 -[SRRunLoopThread main] + 268
9   Foundation                    	       0x181154edc __NSThread__start__ + 716
10  libsystem_pthread.dylib       	       0x10053a63c _pthread_start + 104
11  libsystem_pthread.dylib       	       0x100535a34 thread_start + 8

Thread 5:: com.apple.CFSocket.private
0   libsystem_kernel.dylib        	       0x100112fb4 __select + 8
1   CoreFoundation                	       0x180430b8c __CFSocketManager + 680
2   libsystem_pthread.dylib       	       0x10053a63c _pthread_start + 104
3   libsystem_pthread.dylib       	       0x100535a34 thread_start + 8

Thread 6:: com.apple.CFNetwork.CustomProtocols
0   libsystem_kernel.dylib        	       0x100108b70 mach_msg2_trap + 8
1   libsystem_kernel.dylib        	       0x100119e5c mach_msg2_internal + 72
2   libsystem_kernel.dylib        	       0x100110c44 mach_msg_overwrite + 484
3   libsystem_kernel.dylib        	       0x100108ef0 mach_msg + 20
4   CoreFoundation                	       0x1804227c0 __CFRunLoopServiceMachPort + 156
5   CoreFoundation                	       0x180421978 __CFRunLoopRun + 1128
6   CoreFoundation                	       0x18041c904 _CFRunLoopRunSpecificWithOptions + 496
7   CFNetwork                     	       0x184fb8020 +[__CFN_CoreSchedulingSetRunnable _run:] + 368
8   Foundation                    	       0x181154edc __NSThread__start__ + 716
9   libsystem_pthread.dylib       	       0x10053a63c _pthread_start + 104
10  libsystem_pthread.dylib       	       0x100535a34 thread_start + 8

Thread 7:: com.apple.CFStream.LegacyThread
0   libsystem_kernel.dylib        	       0x100108b70 mach_msg2_trap + 8
1   libsystem_kernel.dylib        	       0x100119e5c mach_msg2_internal + 72
2   libsystem_kernel.dylib        	       0x100110c44 mach_msg_overwrite + 484
3   libsystem_kernel.dylib        	       0x100108ef0 mach_msg + 20
4   CoreFoundation                	       0x1804227c0 __CFRunLoopServiceMachPort + 156
5   CoreFoundation                	       0x180421978 __CFRunLoopRun + 1128
6   CoreFoundation                	       0x18041c904 _CFRunLoopRunSpecificWithOptions + 496
7   CoreFoundation                	       0x1804403a4 _legacyStreamRunLoop_workThread + 260
8   libsystem_pthread.dylib       	       0x10053a63c _pthread_start + 104
9   libsystem_pthread.dylib       	       0x100535a34 thread_start + 8

Thread 8:: com.apple.UIKit.inProcessAnimationManager
0   libsystem_kernel.dylib        	       0x100108aec semaphore_wait_trap + 8
1   libdispatch.dylib             	       0x180187d60 _dispatch_sema4_wait + 24
2   libdispatch.dylib             	       0x1801883c0 _dispatch_semaphore_wait_slow + 128
3   UIKitCore                     	       0x185729634 0x185289000 + 4851252
4   UIKitCore                     	       0x18572d494 0x185289000 + 4867220
5   UIKitCore                     	       0x1853d4730 0x185289000 + 1357616
6   Foundation                    	       0x181154edc __NSThread__start__ + 716
7   libsystem_pthread.dylib       	       0x10053a63c _pthread_start + 104
8   libsystem_pthread.dylib       	       0x100535a34 thread_start + 8

Thread 9:: com.facebook.react.JavaScript
0   libsystem_kernel.dylib        	       0x10010a788 __ulock_wait + 8
1   libdispatch.dylib             	       0x180188190 _dlock_wait + 52
2   libdispatch.dylib             	       0x180187e20 _dispatch_wait_on_address + 132
3   libdispatch.dylib             	       0x1801884c8 _dispatch_group_wait_slow + 52
4   MotoCortex.debug.dylib        	       0x1050eb2ec __26-[RCTCxxBridge invalidate]_block_invoke + 1564
5   MotoCortex.debug.dylib        	       0x104828fbc std::__1::__invoke_result_impl<void, void () block_pointer __strong&>::type std::__1::__invoke[abi:dee210106]<void () block_pointer __strong&>(void () block_pointer __strong&&&...) + 32
6   MotoCortex.debug.dylib        	       0x104828eac std::__1::__function::__func<void () block_pointer __strong, void ()>::operator()() + 28
7   MotoCortex.debug.dylib        	       0x10482fec8 std::__1::__function::__value_func<void ()>::operator()[abi:dee210106]() const + 60
8   MotoCortex.debug.dylib        	       0x10482fe80 std::__1::function<void ()>::operator()() const + 24
9   MotoCortex.debug.dylib        	       0x1051047a8 facebook::react::tryAndReturnError(std::__1::function<void ()> const&) + 24
10  MotoCortex.debug.dylib        	       0x1050e0dc8 -[RCTCxxBridge _tryAndHandleError:] + 84
11  Foundation                    	       0x18115524c __NSThreadPerformPerform + 124
12  CoreFoundation                	       0x180422f5c __CFRUNLOOP_IS_CALLING_OUT_TO_A_SOURCE0_PERFORM_FUNCTION__ + 24
13  CoreFoundation                	       0x180422ea4 __CFRunLoopDoSource0 + 168
14  CoreFoundation                	       0x180422634 __CFRunLoopDoSources0 + 220
15  CoreFoundation                	       0x180421808 __CFRunLoopRun + 760
16  CoreFoundation                	       0x18041c904 _CFRunLoopRunSpecificWithOptions + 496
17  MotoCortex.debug.dylib        	       0x1050e0be8 +[RCTCxxBridge runRunLoop] + 772
18  Foundation                    	       0x181154edc __NSThread__start__ + 716
19  libsystem_pthread.dylib       	       0x10053a63c _pthread_start + 104
20  libsystem_pthread.dylib       	       0x100535a34 thread_start + 8

Thread 10:: hades
0   libsystem_kernel.dylib        	       0x10010c02c __psynch_cvwait + 8
1   libsystem_pthread.dylib       	       0x10053ab00 _pthread_cond_wait + 972
2   libc++.1.dylib                	       0x180300604 std::__1::condition_variable::wait(std::__1::unique_lock<std::__1::mutex>&) + 28
3   hermes                        	       0x100c7b1a0 hermes::vm::HadesGC::Executor::worker() + 112
4   hermes                        	       0x100c7b104 void* std::__1::__thread_proxy[abi:v160006]<std::__1::tuple<std::__1::unique_ptr<std::__1::__thread_struct, std::__1::default_delete<std::__1::__thread_struct>>, hermes::vm::HadesGC::Executor::Executor()::'lambda'()>>(void*) + 44
5   libsystem_pthread.dylib       	       0x10053a63c _pthread_start + 104
6   libsystem_pthread.dylib       	       0x100535a34 thread_start + 8

Thread 11:: hades
0   libsystem_kernel.dylib        	       0x10010c02c __psynch_cvwait + 8
1   libsystem_pthread.dylib       	       0x10053ab00 _pthread_cond_wait + 972
2   libc++.1.dylib                	       0x180300604 std::__1::condition_variable::wait(std::__1::unique_lock<std::__1::mutex>&) + 28
3   hermes                        	       0x100c7b1a0 hermes::vm::HadesGC::Executor::worker() + 112
4   hermes                        	       0x100c7b104 void* std::__1::__thread_proxy[abi:v160006]<std::__1::tuple<std::__1::unique_ptr<std::__1::__thread_struct, std::__1::default_delete<std::__1::__thread_struct>>, hermes::vm::HadesGC::Executor::Executor()::'lambda'()>>(void*) + 44
5   libsystem_pthread.dylib       	       0x10053a63c _pthread_start + 104
6   libsystem_pthread.dylib       	       0x100535a34 thread_start + 8

Thread 12::  Dispatch queue: com.apple.NSURLSession-delegate
0   libsystem_kernel.dylib        	       0x100108b70 mach_msg2_trap + 8
1   libsystem_kernel.dylib        	       0x100119e5c mach_msg2_internal + 72
2   libsystem_kernel.dylib        	       0x100110c44 mach_msg_overwrite + 484
3   libsystem_kernel.dylib        	       0x100108ef0 mach_msg + 20
4   CoreFoundation                	       0x1804227c0 __CFRunLoopServiceMachPort + 156
5   CoreFoundation                	       0x180421978 __CFRunLoopRun + 1128
6   CoreFoundation                	       0x18041c904 _CFRunLoopRunSpecificWithOptions + 496
7   CoreFoundation                	       0x1804429dc boundPairRead + 296
8   CoreFoundation                	       0x18043dfe0 CFReadStreamRead + 304
9   MotoCortex.debug.dylib        	       0x105142418 -[RCTMultipartStreamReader readAllPartsWithCompletionCallback:progressCallback:] + 1112
10  MotoCortex.debug.dylib        	       0x10514136c -[RCTMultipartDataTask URLSession:streamTask:didBecomeInputStream:outputStream:] + 308
11  CFNetwork                     	       0x184dc7df8 __98-[__NSCFURLSessionDelegateWrapper streamTask:didBecomeInputStream:outputStream:completionHandler:]_block_invoke + 32
12  libdispatch.dylib             	       0x1801866a0 _dispatch_call_block_and_release + 24
13  libdispatch.dylib             	       0x1801a0e98 _dispatch_client_callout + 12
14  libdispatch.dylib             	       0x18018f724 _dispatch_lane_serial_drain + 984
15  libdispatch.dylib             	       0x1801901e8 _dispatch_lane_invoke + 396
16  libdispatch.dylib             	       0x18019aec0 _dispatch_root_queue_drain_deferred_wlh + 288
17  libdispatch.dylib             	       0x18019a608 _dispatch_workloop_worker_thread + 692
18  libsystem_pthread.dylib       	       0x100536c28 _pthread_wqthread + 288
19  libsystem_pthread.dylib       	       0x100535a28 start_wqthread + 8

Thread 13::  Dispatch queue: com.apple.NSURLSession-delegate
0   libsystem_kernel.dylib        	       0x100108b70 mach_msg2_trap + 8
1   libsystem_kernel.dylib        	       0x100119e5c mach_msg2_internal + 72
2   libsystem_kernel.dylib        	       0x10010b994 vm_copy + 112
3   Foundation                    	       0x180aaba64 specialized static __DataStorage.move(_:_:_:) + 164
4   Foundation                    	       0x180a9af1c __DataStorage.init(bytes:length:) + 232
5   Foundation                    	       0x180f64010 specialized Data.init(referencing:) + 288
6   Foundation                    	       0x180f627d0 static Data._unconditionallyBridgeFromObjectiveC(_:) + 32
7   MotoCortex.debug.dylib        	       0x1048eacbc @objc ExpoRequestInterceptorProtocol.urlSession(_:dataTask:didReceive:) + 108
8   MotoCortex.debug.dylib        	       0x10492cc34 partial apply + 36
9   MotoCortex.debug.dylib        	       0x10492cc84 thunk for @escaping @callee_guaranteed (@unowned NSURLSession, @unowned NSURLSessionDataTask, @unowned NSData) -> () + 68
10  MotoCortex.debug.dylib        	       0x10492cba8 URLSessionSessionDelegateProxy.urlSession(_:dataTask:didReceive:) + 400
11  MotoCortex.debug.dylib        	       0x10492cd88 @objc URLSessionSessionDelegateProxy.urlSession(_:dataTask:didReceive:) + 156
12  CFNetwork                     	       0x184dc676c __77-[__NSCFURLSessionDelegateWrapper dataTask:didReceiveData:completionHandler:]_block_invoke_3 + 32
13  libdispatch.dylib             	       0x1801866a0 _dispatch_call_block_and_release + 24
14  libdispatch.dylib             	       0x1801a0e98 _dispatch_client_callout + 12
15  libdispatch.dylib             	       0x18018f724 _dispatch_lane_serial_drain + 984
16  libdispatch.dylib             	       0x1801901e8 _dispatch_lane_invoke + 396
17  libdispatch.dylib             	       0x18019aec0 _dispatch_root_queue_drain_deferred_wlh + 288
18  libdispatch.dylib             	       0x18019a608 _dispatch_workloop_worker_thread + 692
19  libsystem_pthread.dylib       	       0x100536c28 _pthread_wqthread + 288
20  libsystem_pthread.dylib       	       0x100535a28 start_wqthread + 8

Thread 14:
0   CoreFoundation                	       0x1803ae4b8 __CFFromUTF8 + 204
1   CoreFoundation                	       0x18046ac44 __CFStringDecodeByteStream3 + 2156
2   CoreFoundation                	       0x1804481d8 __CFStringCreateImmutableFunnel3 + 772
3   MotoCortex.debug.dylib        	       0x105ac2c68 validate_dispatch_data_partial_string + 1376
4   MotoCortex.debug.dylib        	       0x105ac233c -[SRWebSocket _innerPumpScanner] + 1752
5   MotoCortex.debug.dylib        	       0x105ac2d84 -[SRWebSocket _pumpScanner] + 84
6   MotoCortex.debug.dylib        	       0x105ac3b70 -[SRWebSocket safeHandleEvent:stream:] + 1236
7   MotoCortex.debug.dylib        	       0x105ac3680 __34-[SRWebSocket stream:handleEvent:]_block_invoke_4 + 64
8   libdispatch.dylib             	       0x1801866a0 _dispatch_call_block_and_release + 24
9   libdispatch.dylib             	       0x1801a0e98 _dispatch_client_callout + 12
10  libdispatch.dylib             	       0x18018f724 _dispatch_lane_serial_drain + 984
11  libdispatch.dylib             	       0x1801901e8 _dispatch_lane_invoke + 396
12  libdispatch.dylib             	       0x18019aec0 _dispatch_root_queue_drain_deferred_wlh + 288
13  libdispatch.dylib             	       0x18019a608 _dispatch_workloop_worker_thread + 692
14  libsystem_pthread.dylib       	       0x100536c28 _pthread_wqthread + 288
15  libsystem_pthread.dylib       	       0x100535a28 start_wqthread + 8

Thread 15:: com.facebook.react.JavaScript
0   libsystem_kernel.dylib        	       0x10010a788 __ulock_wait + 8
1   libdispatch.dylib             	       0x180187f0c _dispatch_thread_main_event_wait_slow + 72
2   libdispatch.dylib             	       0x180196da0 __DISPATCH_WAIT_FOR_QUEUE__ + 484
3   libdispatch.dylib             	       0x180196824 _dispatch_sync_f_slow + 156
4   MotoCortex.debug.dylib        	       0x1051979e8 RCTUnsafeExecuteOnMainQueueSync + 188
5   MotoCortex.debug.dylib        	       0x1050357f0 -[REAKeyboardEventObserver cleanupListeners] + 108
6   CoreFoundation                	       0x1803eca4c __CFNOTIFICATIONCENTER_IS_CALLING_OUT_TO_AN_OBSERVER__ + 140
7   CoreFoundation                	       0x1803ec970 ___CFXRegistrationPost_block_invoke + 88
8   CoreFoundation                	       0x1803ebe5c _CFXRegistrationPost + 408
9   CoreFoundation                	       0x1803eb844 _CFXNotificationPost + 696
10  Foundation                    	       0x1810e2d7c -[NSNotificationCenter postNotificationName:object:userInfo:] + 88
11  MotoCortex.debug.dylib        	       0x1050eb40c __26-[RCTCxxBridge invalidate]_block_invoke + 1852
12  MotoCortex.debug.dylib        	       0x104828fbc std::__1::__invoke_result_impl<void, void () block_pointer __strong&>::type std::__1::__invoke[abi:dee210106]<void () block_pointer __strong&>(void () block_pointer __strong&&&...) + 32
13  MotoCortex.debug.dylib        	       0x104828eac std::__1::__function::__func<void () block_pointer __strong, void ()>::operator()() + 28
14  MotoCortex.debug.dylib        	       0x10482fec8 std::__1::__function::__value_func<void ()>::operator()[abi:dee210106]() const + 60
15  MotoCortex.debug.dylib        	       0x10482fe80 std::__1::function<void ()>::operator()() const + 24
16  MotoCortex.debug.dylib        	       0x1051047a8 facebook::react::tryAndReturnError(std::__1::function<void ()> const&) + 24
17  MotoCortex.debug.dylib        	       0x1050e0dc8 -[RCTCxxBridge _tryAndHandleError:] + 84
18  Foundation                    	       0x18115524c __NSThreadPerformPerform + 124
19  CoreFoundation                	       0x180422f5c __CFRUNLOOP_IS_CALLING_OUT_TO_A_SOURCE0_PERFORM_FUNCTION__ + 24
20  CoreFoundation                	       0x180422ea4 __CFRunLoopDoSource0 + 168
21  CoreFoundation                	       0x180422634 __CFRunLoopDoSources0 + 220
22  CoreFoundation                	       0x180421808 __CFRunLoopRun + 760
23  CoreFoundation                	       0x18041c904 _CFRunLoopRunSpecificWithOptions + 496
24  MotoCortex.debug.dylib        	       0x1050e0be8 +[RCTCxxBridge runRunLoop] + 772
25  Foundation                    	       0x181154edc __NSThread__start__ + 716
26  libsystem_pthread.dylib       	       0x10053a63c _pthread_start + 104
27  libsystem_pthread.dylib       	       0x100535a34 thread_start + 8

Thread 16:: hades
0   libsystem_kernel.dylib        	       0x10010c02c __psynch_cvwait + 8
1   libsystem_pthread.dylib       	       0x10053ab00 _pthread_cond_wait + 972
2   libc++.1.dylib                	       0x180300604 std::__1::condition_variable::wait(std::__1::unique_lock<std::__1::mutex>&) + 28
3   hermes                        	       0x100c7b1a0 hermes::vm::HadesGC::Executor::worker() + 112
4   hermes                        	       0x100c7b104 void* std::__1::__thread_proxy[abi:v160006]<std::__1::tuple<std::__1::unique_ptr<std::__1::__thread_struct, std::__1::default_delete<std::__1::__thread_struct>>, hermes::vm::HadesGC::Executor::Executor()::'lambda'()>>(void*) + 44
5   libsystem_pthread.dylib       	       0x10053a63c _pthread_start + 104
6   libsystem_pthread.dylib       	       0x100535a34 thread_start + 8

Thread 17:: com.facebook.react.JavaScript
0   libsystem_kernel.dylib        	       0x10010c02c __psynch_cvwait + 8
1   libsystem_pthread.dylib       	       0x10053ab00 _pthread_cond_wait + 972
2   libc++.1.dylib                	       0x180300604 std::__1::condition_variable::wait(std::__1::unique_lock<std::__1::mutex>&) + 28
3   MotoCortex.debug.dylib        	       0x105ad0b48 void std::__1::condition_variable::wait[abi:dee210106]<facebook::react::Instance::initializeBridge(std::__1::unique_ptr<facebook::react::InstanceCallback, std::__1::default_delete<facebook::react::InstanceCallback>>, std::__1::shared_ptr<facebook::react::JSExecutorFactory>, std::__1::shared_ptr<facebook::react::MessageQueueThread>, std::__1::shared_ptr<facebook::react::ModuleRegistry>, facebook::react::jsinspector_modern::HostTarget*)::$_0::operator()()::'lambda'()>(std::__1::unique_lock<std::__1::mutex>&, facebook::react::Instance::initializeBridge(std::__1::unique_ptr<facebook::react::InstanceCallback, std::__1::default_delete<facebook::react::InstanceCallback>>, std::__1::shared_ptr<facebook::react::JSExecutorFactory>, std::__1::shared_ptr<facebook::react::MessageQueueThread>, std::__1::shared_ptr<facebook::react::ModuleRegistry>, facebook::react::jsinspector_modern::HostTarget*)::$_0::operator()()::'lambda'()) + 64
4   MotoCortex.debug.dylib        	       0x105ad08c4 facebook::react::Instance::initializeBridge(std::__1::unique_ptr<facebook::react::InstanceCallback, std::__1::default_delete<facebook::react::InstanceCallback>>, std::__1::shared_ptr<facebook::react::JSExecutorFactory>, std::__1::shared_ptr<facebook::react::MessageQueueThread>, std::__1::shared_ptr<facebook::react::ModuleRegistry>, facebook::react::jsinspector_modern::HostTarget*)::$_0::operator()() + 308
5   MotoCortex.debug.dylib        	       0x105ad0784 std::__1::__invoke_result_impl<void, facebook::react::Instance::initializeBridge(std::__1::unique_ptr<facebook::react::InstanceCallback, std::__1::default_delete<facebook::react::InstanceCallback>>, std::__1::shared_ptr<facebook::react::JSExecutorFactory>, std::__1::shared_ptr<facebook::react::MessageQueueThread>, std::__1::shared_ptr<facebook::react::ModuleRegistry>, facebook::react::jsinspector_modern::HostTarget*)::$_0&>::type std::__1::__invoke[abi:dee210106]<facebook::react::Instance::initializeBridge(std::__1::unique_ptr<facebook::react::InstanceCallback, std::__1::default_delete<facebook::react::InstanceCallback>>, std::__1::shared_ptr<facebook::react::JSExecutorFactory>, std::__1::shared_ptr<facebook::react::MessageQueueThread>, std::__1::shared_ptr<facebook::react::ModuleRegistry>, facebook::react::jsinspector_modern::HostTarget*)::$_0&>(facebook::react::Instance::initializeBridge(std::__1::unique_ptr<facebook::react::InstanceCallback, std::__1::default_delete<facebook::react::InstanceCallback>>, std::__1::shared_ptr<facebook::react::JSExecutorFactory>, std::__1::shared_ptr<facebook::react::MessageQueueThread>, std::__1::shared_ptr<facebook::react::ModuleRegistry>, facebook::react::jsinspector_modern::HostTarget*)::$_0&) + 24
6   MotoCortex.debug.dylib        	       0x105ad0760 void std::__1::__invoke_void_return_wrapper<void, true>::__call[abi:dee210106]<facebook::react::Instance::initializeBridge(std::__1::unique_ptr<facebook::react::InstanceCallback, std::__1::default_delete<facebook::react::InstanceCallback>>, std::__1::shared_ptr<facebook::react::JSExecutorFactory>, std::__1::shared_ptr<facebook::react::MessageQueueThread>, std::__1::shared_ptr<facebook::react::ModuleRegistry>, facebook::react::jsinspector_modern::HostTarget*)::$_0&>(facebook::react::Instance::initializeBridge(std::__1::unique_ptr<facebook::react::InstanceCallback, std::__1::default_delete<facebook::react::InstanceCallback>>, std::__1::shared_ptr<facebook::react::JSExecutorFactory>, std::__1::shared_ptr<facebook::react::MessageQueueThread>, std::__1::shared_ptr<facebook::react::ModuleRegistry>, facebook::react::jsinspector_modern::HostTarget*)::$_0&) + 24
7   MotoCortex.debug.dylib        	       0x105ad073c void std::__1::__invoke_r[abi:dee210106]<void, facebook::react::Instance::initializeBridge(std::__1::unique_ptr<facebook::react::InstanceCallback, std::__1::default_delete<facebook::react::InstanceCallback>>, std::__1::shared_ptr<facebook::react::JSExecutorFactory>, std::__1::shared_ptr<facebook::react::MessageQueueThread>, std::__1::shared_ptr<facebook::react::ModuleRegistry>, facebook::react::jsinspector_modern::HostTarget*)::$_0&>(facebook::react::Instance::initializeBridge(std::__1::unique_ptr<facebook::react::InstanceCallback, std::__1::default_delete<facebook::react::InstanceCallback>>, std::__1::shared_ptr<facebook::react::JSExecutorFactory>, std::__1::shared_ptr<facebook::react::MessageQueueThread>, std::__1::shared_ptr<facebook::react::ModuleRegistry>, facebook::react::jsinspector_modern::HostTarget*)::$_0&) + 24
8   MotoCortex.debug.dylib        	       0x105ad0514 std::__1::__function::__func<facebook::react::Instance::initializeBridge(std::__1::unique_ptr<facebook::react::InstanceCallback, std::__1::default_delete<facebook::react::InstanceCallback>>, std::__1::shared_ptr<facebook::react::JSExecutorFactory>, std::__1::shared_ptr<facebook::react::MessageQueueThread>, std::__1::shared_ptr<facebook::react::ModuleRegistry>, facebook::react::jsinspector_modern::HostTarget*)::$_0, void ()>::operator()() + 28
9   MotoCortex.debug.dylib        	       0x10482fec8 std::__1::__function::__value_func<void ()>::operator()[abi:dee210106]() const + 60
10  MotoCortex.debug.dylib        	       0x10482fe80 std::__1::function<void ()>::operator()() const + 24
11  MotoCortex.debug.dylib        	       0x1051047a8 facebook::react::tryAndReturnError(std::__1::function<void ()> const&) + 24
12  MotoCortex.debug.dylib        	       0x10512da44 facebook::react::RCTMessageThread::tryFunc(std::__1::function<void ()> const&) + 36
13  MotoCortex.debug.dylib        	       0x10512fee4 facebook::react::RCTMessageThread::runOnQueueSync(std::__1::function<void ()>&&)::$_0::operator()() const + 64
14  MotoCortex.debug.dylib        	       0x10512fe98 std::__1::__invoke_result_impl<void, facebook::react::RCTMessageThread::runOnQueueSync(std::__1::function<void ()>&&)::$_0&>::type std::__1::__invoke[abi:dee210106]<facebook::react::RCTMessageThread::runOnQueueSync(std::__1::function<void ()>&&)::$_0&>(facebook::react::RCTMessageThread::runOnQueueSync(std::__1::function<void ()>&&)::$_0&) + 24
15  MotoCortex.debug.dylib        	       0x10512fe74 void std::__1::__invoke_void_return_wrapper<void, true>::__call[abi:dee210106]<facebook::react::RCTMessageThread::runOnQueueSync(std::__1::function<void ()>&&)::$_0&>(facebook::react::RCTMessageThread::runOnQueueSync(std::__1::function<void ()>&&)::$_0&) + 24
16  MotoCortex.debug.dylib        	       0x10512fe50 void std::__1::__invoke_r[abi:dee210106]<void, facebook::react::RCTMessageThread::runOnQueueSync(std::__1::function<void ()>&&)::$_0&>(facebook::react::RCTMessageThread::runOnQueueSync(std::__1::function<void ()>&&)::$_0&) + 24
17  MotoCortex.debug.dylib        	       0x10512fbd8 std::__1::__function::__func<facebook::react::RCTMessageThread::runOnQueueSync(std::__1::function<void ()>&&)::$_0, void ()>::operator()() + 28
18  MotoCortex.debug.dylib        	       0x10482fec8 std::__1::__function::__value_func<void ()>::operator()[abi:dee210106]() const + 60
19  MotoCortex.debug.dylib        	       0x10482fe80 std::__1::function<void ()>::operator()() const + 24
20  MotoCortex.debug.dylib        	       0x10512d858 facebook::react::RCTMessageThread::runSync(std::__1::function<void ()>) + 96
21  MotoCortex.debug.dylib        	       0x10512dd00 facebook::react::RCTMessageThread::runOnQueueSync(std::__1::function<void ()>&&) + 132
22  MotoCortex.debug.dylib        	       0x105acd908 facebook::react::Instance::initializeBridge(std::__1::unique_ptr<facebook::react::InstanceCallback, std::__1::default_delete<facebook::react::InstanceCallback>>, std::__1::shared_ptr<facebook::react::JSExecutorFactory>, std::__1::shared_ptr<facebook::react::MessageQueueThread>, std::__1::shared_ptr<facebook::react::ModuleRegistry>, facebook::react::jsinspector_modern::HostTarget*) + 204
23  MotoCortex.debug.dylib        	       0x1050e5750 -[RCTCxxBridge _initializeBridgeLocked:parentInspectorTarget:] + 204
24  MotoCortex.debug.dylib        	       0x1050e50b4 -[RCTCxxBridge _initializeBridge:parentInspectorTarget:] + 716
25  MotoCortex.debug.dylib        	       0x1050e27c0 __21-[RCTCxxBridge start]_block_invoke.110 + 88
26  MotoCortex.debug.dylib        	       0x104828fbc std::__1::__invoke_result_impl<void, void () block_pointer __strong&>::type std::__1::__invoke[abi:dee210106]<void () block_pointer __strong&>(void () block_pointer __strong&&&...) + 32
27  MotoCortex.debug.dylib        	       0x104828eac std::__1::__function::__func<void () block_pointer __strong, void ()>::operator()() + 28
28  MotoCortex.debug.dylib        	       0x10482fec8 std::__1::__function::__value_func<void ()>::operator()[abi:dee210106]() const + 60
29  MotoCortex.debug.dylib        	       0x10482fe80 std::__1::function<void ()>::operator()() const + 24
30  MotoCortex.debug.dylib        	       0x1051047a8 facebook::react::tryAndReturnError(std::__1::function<void ()> const&) + 24
31  MotoCortex.debug.dylib        	       0x1050e0dc8 -[RCTCxxBridge _tryAndHandleError:] + 84
32  Foundation                    	       0x18115524c __NSThreadPerformPerform + 124
33  CoreFoundation                	       0x180422f5c __CFRUNLOOP_IS_CALLING_OUT_TO_A_SOURCE0_PERFORM_FUNCTION__ + 24
34  CoreFoundation                	       0x180422ea4 __CFRunLoopDoSource0 + 168
35  CoreFoundation                	       0x180422634 __CFRunLoopDoSources0 + 220
36  CoreFoundation                	       0x180421808 __CFRunLoopRun + 760
37  CoreFoundation                	       0x18041c904 _CFRunLoopRunSpecificWithOptions + 496
38  MotoCortex.debug.dylib        	       0x1050e0be8 +[RCTCxxBridge runRunLoop] + 772
39  Foundation                    	       0x181154edc __NSThread__start__ + 716
40  libsystem_pthread.dylib       	       0x10053a63c _pthread_start + 104
41  libsystem_pthread.dylib       	       0x100535a34 thread_start + 8

Thread 18:: hades
0   libsystem_kernel.dylib        	       0x10010c02c __psynch_cvwait + 8
1   libsystem_pthread.dylib       	       0x10053ab00 _pthread_cond_wait + 972
2   libc++.1.dylib                	       0x180300604 std::__1::condition_variable::wait(std::__1::unique_lock<std::__1::mutex>&) + 28
3   hermes                        	       0x100c7b1a0 hermes::vm::HadesGC::Executor::worker() + 112
4   hermes                        	       0x100c7b104 void* std::__1::__thread_proxy[abi:v160006]<std::__1::tuple<std::__1::unique_ptr<std::__1::__thread_struct, std::__1::default_delete<std::__1::__thread_struct>>, hermes::vm::HadesGC::Executor::Executor()::'lambda'()>>(void*) + 44
5   libsystem_pthread.dylib       	       0x10053a63c _pthread_start + 104
6   libsystem_pthread.dylib       	       0x100535a34 thread_start + 8

Thread 19::  Dispatch queue: com.apple.NSURLSession-work
0   libsystem_platform.dylib      	       0x10048f114 _platform_memmove + 100
1   libdispatch.dylib             	       0x1801b6a7c dispatch_data_create + 184
2   Foundation                    	       0x18106049c ___NSDataCreateDispatchDataFromData_block_invoke + 152
3   Foundation                    	       0x181058478 -[NSData(NSData) enumerateByteRangesUsingBlock:] + 112
4   Foundation                    	       0x18105a30c _NSDataCreateDispatchDataFromData + 136
5   CFNetwork                     	       0x184f1cf04 URLConnectionLoader::protocolDidLoadData(__CFData const*, long long) + 460
6   CFNetwork                     	       0x184f242bc invocation function for block in URLConnectionLoader_Classic::protocolDidLoadData(__CFData const*, long long) + 28
7   CFNetwork                     	       0x184f159a8 invocation function for block in URLConnectionInstanceData::withWorkQueueAsync(void () block_pointer) const + 28
8   libdispatch.dylib             	       0x1801866a0 _dispatch_call_block_and_release + 24
9   libdispatch.dylib             	       0x1801a0e98 _dispatch_client_callout + 12
10  libdispatch.dylib             	       0x18018f724 _dispatch_lane_serial_drain + 984
11  libdispatch.dylib             	       0x1801901e8 _dispatch_lane_invoke + 396
12  libdispatch.dylib             	       0x18019aec0 _dispatch_root_queue_drain_deferred_wlh + 288
13  libdispatch.dylib             	       0x18019a608 _dispatch_workloop_worker_thread + 692
14  libsystem_pthread.dylib       	       0x100536c28 _pthread_wqthread + 288
15  libsystem_pthread.dylib       	       0x100535a28 start_wqthread + 8

Thread 20::  Dispatch queue: com.apple.NSURLSession-delegate
0   libsystem_kernel.dylib        	       0x100108b70 mach_msg2_trap + 8
1   libsystem_kernel.dylib        	       0x100119e5c mach_msg2_internal + 72
2   libsystem_kernel.dylib        	       0x100110c44 mach_msg_overwrite + 484
3   libsystem_kernel.dylib        	       0x100108ef0 mach_msg + 20
4   CoreFoundation                	       0x1804227c0 __CFRunLoopServiceMachPort + 156
5   CoreFoundation                	       0x180421978 __CFRunLoopRun + 1128
6   CoreFoundation                	       0x18041c904 _CFRunLoopRunSpecificWithOptions + 496
7   CoreFoundation                	       0x1804429dc boundPairRead + 296
8   CoreFoundation                	       0x18043dfe0 CFReadStreamRead + 304
9   MotoCortex.debug.dylib        	       0x105142418 -[RCTMultipartStreamReader readAllPartsWithCompletionCallback:progressCallback:] + 1112
10  MotoCortex.debug.dylib        	       0x10514136c -[RCTMultipartDataTask URLSession:streamTask:didBecomeInputStream:outputStream:] + 308
11  CFNetwork                     	       0x184dc7df8 __98-[__NSCFURLSessionDelegateWrapper streamTask:didBecomeInputStream:outputStream:completionHandler:]_block_invoke + 32
12  libdispatch.dylib             	       0x1801866a0 _dispatch_call_block_and_release + 24
13  libdispatch.dylib             	       0x1801a0e98 _dispatch_client_callout + 12
14  libdispatch.dylib             	       0x18018f724 _dispatch_lane_serial_drain + 984
15  libdispatch.dylib             	       0x1801901e8 _dispatch_lane_invoke + 396
16  libdispatch.dylib             	       0x18019aec0 _dispatch_root_queue_drain_deferred_wlh + 288
17  libdispatch.dylib             	       0x18019a608 _dispatch_workloop_worker_thread + 692
18  libsystem_pthread.dylib       	       0x100536c28 _pthread_wqthread + 288
19  libsystem_pthread.dylib       	       0x100535a28 start_wqthread + 8

Thread 21:

Thread 22::  Dispatch queue: com.apple.NSURLSession-work
0   libsystem_platform.dylib      	       0x10048f114 _platform_memmove + 100
1   libdispatch.dylib             	       0x1801b74f8 ___dispatch_data_flatten_block_invoke + 28
2   libdispatch.dylib             	       0x1801b7134 _dispatch_data_apply + 168
3   libdispatch.dylib             	       0x1801b7054 _dispatch_data_flatten + 128
4   libdispatch.dylib             	       0x1801c0f08 dispatch_data_create_map + 140
5   CFNetwork                     	       0x184f9288c __78-[__NSCFURLLocalStreamTaskFromDataTask _onqueue_ioTickFromDataTaskConversion:]_block_invoke + 192
6   CFNetwork                     	       0x184f8ebd4 -[__NSCFURLLocalStreamTask _onqueue_ioTick] + 2932
7   CFNetwork                     	       0x184f927bc -[__NSCFURLLocalStreamTaskFromDataTask _onqueue_ioTickFromDataTaskConversion:] + 120
8   libdispatch.dylib             	       0x1801866a0 _dispatch_call_block_and_release + 24
9   libdispatch.dylib             	       0x1801a0e98 _dispatch_client_callout + 12
10  libdispatch.dylib             	       0x18018f724 _dispatch_lane_serial_drain + 984
11  libdispatch.dylib             	       0x1801901e8 _dispatch_lane_invoke + 396
12  libdispatch.dylib             	       0x18019aec0 _dispatch_root_queue_drain_deferred_wlh + 288
13  libdispatch.dylib             	       0x18019a608 _dispatch_workloop_worker_thread + 692
14  libsystem_pthread.dylib       	       0x100536c28 _pthread_wqthread + 288
15  libsystem_pthread.dylib       	       0x100535a28 start_wqthread + 8

Thread 23:

Thread 24:


Thread 0 crashed with ARM Thread State (64-bit):
    x0: 0x0000000000000000   x1: 0x0000000000000000   x2: 0x0000000000000000   x3: 0x0000000000000000
    x4: 0x0000000000000000   x5: 0x0000000000989680   x6: 0x00000001024e0280   x7: 0x00000000ffffffff
    x8: 0x0000000100241e00   x9: 0x410ad3b5ae5a2c24  x10: 0x00000000000003e8  x11: 0x00000000fffffffd
   x12: 0x0000000000000000  x13: 0x0000000000000000  x14: 0x0000000000000000  x15: 0x0000000000000000
   x16: 0x0000000000000148  x17: 0x00000001804da644  x18: 0x0000000000000000  x19: 0x0000000000000006
   x20: 0x0000000000000103  x21: 0x0000000100241ee0  x22: 0x000000010095c000  x23: 0x0000000105e5be9a
   x24: 0x00000001f38db000  x25: 0x0000000103268740  x26: 0x000000010d3f1040  x27: 0x0000000000000000
   x28: 0x0000000000000114   fp: 0x000000016fdd8930   lr: 0x000000010053a338
    sp: 0x000000016fdd8910   pc: 0x000000010011088c cpsr: 0x40000000
   far: 0x0000000000000000  esr: 0x56000080 (Syscall)

Binary Images:
       0x100024000 -        0x100027fff com.ismail.motocortexv2 (1.1.0) <f4cc10dd-9f97-363b-b4a0-a00392681e22> /Users/USER/Library/Developer/CoreSimulator/Devices/D90D7F2D-2DF3-4611-8356-BDEDCC12E373/data/Containers/Bundle/Application/B96FADAA-9DF9-499D-836B-3A35BD3BAE61/MotoCortex.app/MotoCortex
       0x1002c8000 -        0x100317fff dyld_sim (*) <ba544d9a-46ab-3c59-a00f-aba1479d2079> /Volumes/VOLUME/*/dyld_sim
       0x104590000 -        0x105fe3fff MotoCortex.debug.dylib (*) <8012d4dd-7c45-3a2f-b711-1d05bed48eaa> /Users/USER/Library/Developer/CoreSimulator/Devices/D90D7F2D-2DF3-4611-8356-BDEDCC12E373/data/Containers/Bundle/Application/B96FADAA-9DF9-499D-836B-3A35BD3BAE61/MotoCortex.app/MotoCortex.debug.dylib
       0x100384000 -        0x100413fff io.vlcn.crsqlite (*) <01bd5c62-4036-30bd-94be-6a5b43f03062> /Users/USER/Library/Developer/CoreSimulator/Devices/D90D7F2D-2DF3-4611-8356-BDEDCC12E373/data/Containers/Bundle/Application/B96FADAA-9DF9-499D-836B-3A35BD3BAE61/MotoCortex.app/Frameworks/crsqlite.framework/crsqlite
       0x100ad8000 -        0x100e47fff dev.hermesengine.iphonesimulator (0.12.0) <15c2519b-0ac7-3032-b055-957892e423e1> /Users/USER/Library/Developer/CoreSimulator/Devices/D90D7F2D-2DF3-4611-8356-BDEDCC12E373/data/Containers/Bundle/Application/B96FADAA-9DF9-499D-836B-3A35BD3BAE61/MotoCortex.app/Frameworks/hermes.framework/hermes
       0x10004c000 -        0x10004ffff com.apple.ap.AdServices (1.0) <c2debbc1-6233-343e-a73e-300e4d0d0a0e> /Volumes/VOLUME/*/AdServices.framework/AdServices
       0x1000b4000 -        0x1000d3fff com.apple.MetricKit (1.0) <bab62ede-1a12-3fe6-b4fd-8476487573d7> /Volumes/VOLUME/*/MetricKit.framework/MetricKit
       0x101124000 -        0x10137ffff com.apple.StoreKit.SwiftUI (1.0) <5400b057-b7fc-35f2-addd-38399a1bf545> /Volumes/VOLUME/*/_StoreKit_SwiftUI.framework/_StoreKit_SwiftUI
       0x100060000 -        0x100063fff libswiftDataDetection.dylib (*) <3119af59-1eaa-3731-a7cb-c21c556b63c0> /Volumes/VOLUME/*/libswiftDataDetection.dylib
       0x100074000 -        0x100077fff libswiftUIKit.dylib (*) <710be927-bac3-3b9e-b7ce-dbe0c5e8e2a5> /Volumes/VOLUME/*/libswiftUIKit.dylib
       0x100080000 -        0x100083fff libswiftFileProvider.dylib (*) <8c7e08c0-69a9-3be9-8f41-60c74fba8e5c> /Volumes/VOLUME/*/libswiftFileProvider.dylib
       0x10048c000 -        0x100497fff libsystem_platform.dylib (*) <0831b8d2-190f-31fc-9eb6-ea8ba11fe47b> /usr/lib/system/libsystem_platform.dylib
       0x100108000 -        0x100143fff libsystem_kernel.dylib (*) <2144ef57-8439-3be2-88a3-7d67766bcb03> /usr/lib/system/libsystem_kernel.dylib
       0x100534000 -        0x100543fff libsystem_pthread.dylib (*) <1e522024-387b-3d18-81ca-f4559198954b> /usr/lib/system/libsystem_pthread.dylib
       0x10063c000 -        0x100647fff libobjc-trampolines.dylib (*) <75fa6778-178f-394f-9c63-711780430596> /Volumes/VOLUME/*/libobjc-trampolines.dylib
       0x11670c000 -        0x116747fff com.apple.AutoFillUI (1.0) <0155fed7-c13b-3bcb-aa74-bc433cfb14e0> /Volumes/VOLUME/*/AutoFillUI.framework/AutoFillUI
       0x100188000 -        0x10022ffff dyld (*) <f924bdd3-4365-3466-9580-8b1b3fa8f857> /usr/lib/dyld
       0x180108000 -        0x1801842b7 libsystem_c.dylib (*) <05f4b01b-e685-39fa-93f3-de10cd9b511a> /Volumes/VOLUME/*/libsystem_c.dylib
       0x180185000 -        0x1801ca3bf libdispatch.dylib (*) <42b50931-38d5-3a5d-90ef-0fd7239c408d> /Volumes/VOLUME/*/libdispatch.dylib
       0x18038f000 -        0x1807c04ff com.apple.CoreFoundation (6.9) <e74d7b62-0aac-3013-a55b-f15135d4bd2e> /Volumes/VOLUME/*/CoreFoundation.framework/CoreFoundation
       0x193357000 -        0x19335ed9f com.apple.GraphicsServices (1.0) <95c64786-b053-33db-914f-5fa4b6cb8122> /Volumes/VOLUME/*/GraphicsServices.framework/GraphicsServices
       0x185289000 -        0x18757573f com.apple.UIKitCore (1.0) <12463677-be34-38f7-9e11-3421bbf362fc> /Volumes/VOLUME/*/UIKitCore.framework/UIKitCore
               0x0 - 0xffffffffffffffff ??? (*) <00000000-0000-0000-0000-000000000000> ???
       0x180840000 -        0x1815f8ddf com.apple.Foundation (6.9) <2cc9fce0-08f9-3a0d-8a2f-6db229462de5> /Volumes/VOLUME/*/Foundation.framework/Foundation
       0x184db7000 -        0x18512ab7f com.apple.CFNetwork (1.0) <799e3578-e022-31f3-86af-938cea488909> /Volumes/VOLUME/*/CFNetwork.framework/CFNetwork
       0x180038000 -        0x180074943 libobjc.A.dylib (*) <727c4040-5e6d-3dae-b22c-9a337d46c34f> /Volumes/VOLUME/*/libobjc.A.dylib
       0x1802e0000 -        0x18036909f libc++.1.dylib (*) <fd646c4c-99c5-3828-8199-3a66a48ff1a1> /Volumes/VOLUME/*/libc++.1.dylib
       0x180105000 -        0x180107da8 libsystem_blocks.dylib (*) <a5fdf1ff-b793-3574-8903-d24571eacd25> /Volumes/VOLUME/*/libsystem_blocks.dylib

External Modification Summary:
  Calls made by other processes targeting this process:
    task_for_pid: 0
    thread_create: 0
    thread_set_state: 0
  Calls made by this process:
    task_for_pid: 0
    thread_create: 0
    thread_set_state: 0
  Calls made by all processes on this machine:
    task_for_pid: 0
    thread_create: 0
    thread_set_state: 0

VM Region Summary:
ReadOnly portion of Libraries: Total=1.9G resident=0K(0%) swapped_out_or_unallocated=1.9G(100%)
Writable regions: Total=366.6M written=2131K(1%) resident=1827K(0%) swapped_out=304K(0%) unallocated=364.5M(99%)

                                VIRTUAL   REGION 
REGION TYPE                        SIZE    COUNT (non-coalesced) 
===========                     =======  ======= 
Activity Tracing                   256K        1 
CG raster data                    1600K       30 
CoreAnimation                     1856K       40 
Foundation                        1840K        2 
IOSurface                         4096K        1 
Kernel Alloc Once                   32K        1 
MALLOC                           268.7M       74 
MALLOC guard page                 3712K        4 
Mach message                        16K        1 
SQLite page cache                 2304K       18 
STACK GUARD                       56.4M       24 
Stack                             21.7M       25 
VM_ALLOCATE                       64.7M       56 
__AUTH_CONST                        32K        1 
__DATA                            53.9M      885 
__DATA_CONST                     115.2M      912 
__DATA_DIRTY                       155K       14 
__FONT_DATA                        2352        1 
__LINKEDIT                       751.0M       18 
__OBJC_RO                         55.6M        1 
__OBJC_RW                         2332K        1 
__TEXT                             1.1G      927 
__TPRO_CONST                       164K        3 
dyld private memory                3.0G       18 
mapped file                      306.9M       28 
page table in kernel              1827K        1 
shared memory                       16K        1 
===========                     =======  ======= 
TOTAL                              5.8G     3088 


-----------
Full Report
-----------

{"app_name":"MotoCortex","timestamp":"2026-07-30 16:53:05.00 +0300","app_version":"1.1.0","slice_uuid":"f4cc10dd-9f97-363b-b4a0-a00392681e22","build_version":"41","platform":7,"bundleID":"com.ismail.motocortexv2","share_with_app_devs":1,"is_first_party":0,"bug_type":"309","os_version":"macOS 26.5.2 (25F84)","roots_installed":0,"name":"MotoCortex","incident_id":"07E59EA4-B057-4371-A422-2276E9902722"}
{
  "uptime" : 26000,
  "procRole" : "Foreground",
  "version" : 2,
  "userID" : 501,
  "deployVersion" : 210,
  "modelCode" : "Mac16,10",
  "coalitionID" : 4006,
  "osVersion" : {
    "train" : "macOS 26.5.2",
    "build" : "25F84",
    "releaseType" : "User"
  },
  "captureTime" : "2026-07-30 16:53:02.7390 +0300",
  "codeSigningMonitor" : 2,
  "incident" : "07E59EA4-B057-4371-A422-2276E9902722",
  "pid" : 44751,
  "translated" : false,
  "cpuType" : "ARM-64",
  "procLaunch" : "2026-07-30 16:44:41.1678 +0300",
  "procStartAbsTime" : 634775373033,
  "procExitAbsTime" : 646811396354,
  "procName" : "MotoCortex",
  "procPath" : "\/Users\/USER\/Library\/Developer\/CoreSimulator\/Devices\/D90D7F2D-2DF3-4611-8356-BDEDCC12E373\/data\/Containers\/Bundle\/Application\/B96FADAA-9DF9-499D-836B-3A35BD3BAE61\/MotoCortex.app\/MotoCortex",
  "bundleInfo" : {"CFBundleShortVersionString":"1.1.0","CFBundleVersion":"41","CFBundleIdentifier":"com.ismail.motocortexv2"},
  "storeInfo" : {"deviceIdentifierForVendor":"C154DD74-D435-5949-A32C-B14FD08F1B31","thirdParty":true},
  "parentProc" : "launchd_sim",
  "parentPid" : 44170,
  "coalitionName" : "com.apple.CoreSimulator.SimDevice.D90D7F2D-2DF3-4611-8356-BDEDCC12E373",
  "crashReporterKey" : "3D338F32-AE74-8406-89A9-2E77384557C6",
  "appleIntelligenceStatus" : {"state":"available"},
  "developerMode" : 1,
  "responsiblePid" : 4118,
  "responsibleProc" : "SimulatorTrampoline",
  "codeSigningID" : "com.ismail.motocortexv2",
  "codeSigningTeamID" : "",
  "codeSigningFlags" : 570425857,
  "codeSigningValidationCategory" : 10,
  "codeSigningTrustLevel" : 4294967295,
  "codeSigningAuxiliaryInfo" : 0,
  "instructionByteStream" : {"beforePC":"4wAAVP17v6n9AwCRIOP\/l78DAJH9e8GowANf1sADX9YQKYDSARAA1A==","atPC":"4wAAVP17v6n9AwCRFuP\/l78DAJH9e8GowANf1sADX9ZwCoDSARAA1A=="},
  "bootSessionUUID" : "D981E1F5-44BC-488A-A01F-45584342C17E",
  "sip" : "enabled",
  "exception" : {"codes":"0x0000000000000000, 0x0000000000000000","rawCodes":[0,0],"type":"EXC_CRASH","signal":"SIGABRT"},
  "termination" : {"flags":0,"code":6,"namespace":"SIGNAL","indicator":"Abort trap: 6","byProc":"MotoCortex","byPid":44751},
  "extMods" : {"caller":{"thread_create":0,"thread_set_state":0,"task_for_pid":0},"system":{"thread_create":0,"thread_set_state":0,"task_for_pid":0},"targeted":{"thread_create":0,"thread_set_state":0,"task_for_pid":0},"warnings":0},
  "faultingThread" : 0,
  "threads" : [{"triggered":true,"id":584100,"threadState":{"x":[{"value":0},{"value":0},{"value":0},{"value":0},{"value":0},{"value":10000000},{"value":4333634176},{"value":4294967295},{"value":4297334272,"symbolLocation":0,"symbol":"_main_thread"},{"value":4686791139500108836},{"value":1000},{"value":4294967293},{"value":0},{"value":0},{"value":0},{"value":0},{"value":328},{"value":6447539780,"symbolLocation":0,"symbol":"-[__NSCFType release]"},{"value":0},{"value":6},{"value":259},{"value":4297334496,"symbolLocation":224,"symbol":"_main_thread"},{"value":4304781312},{"value":4393909914},{"value":8381116416,"symbolLocation":56,"symbol":"_OBJC_PROTOCOL_$_OS_xpc_fd"},{"value":4347823936},{"value":4517204032},{"value":0},{"value":276}],"flavor":"ARM_THREAD_STATE64","lr":{"value":4300448568},"cpsr":{"value":1073741824},"fp":{"value":6171756848},"sp":{"value":6171756816},"esr":{"value":1442840704,"description":"(Syscall)"},"pc":{"value":4296083596,"matchesCrashFrame":1},"far":{"value":0}},"queue":"com.apple.main-thread","frames":[{"imageOffset":34956,"symbol":"__pthread_kill","symbolLocation":8,"imageIndex":12},{"imageOffset":25400,"symbol":"pthread_kill","symbolLocation":264,"imageIndex":13},{"imageOffset":473608,"symbol":"__abort","symbolLocation":120,"imageIndex":17},{"imageOffset":473488,"symbol":"abort","symbolLocation":128,"imageIndex":17},{"imageOffset":470364,"symbol":"__assert_rtn","symbolLocation":268,"imageIndex":17},{"imageOffset":22883388,"symbol":"facebook::react::jsinspector_modern::HostTarget::registerInstance(facebook::react::jsinspector_modern::InstanceTargetDelegate&)","symbolLocation":124,"imageIndex":2},{"imageOffset":22289920,"symbol":"facebook::react::Instance::initializeBridge(std::__1::unique_ptr<facebook::react::InstanceCallback, std::__1::default_delete<facebook::react::InstanceCallback>>, std::__1::shared_ptr<facebook::react::JSExecutorFactory>, std::__1::shared_ptr<facebook::react::MessageQueueThread>, std::__1::shared_ptr<facebook::react::ModuleRegistry>, facebook::react::jsinspector_modern::HostTarget*)::$_0::operator()()::'lambda'(facebook::react::jsinspector_modern::HostTarget&)::operator()(facebook::react::jsinspector_modern::HostTarget&) const","symbolLocation":60,"imageIndex":2},{"imageOffset":22289848,"symbol":"std::__1::__invoke_result_impl<void, facebook::react::Instance::initializeBridge(std::__1::unique_ptr<facebook::react::InstanceCallback, std::__1::default_delete<facebook::react::InstanceCallback>>, std::__1::shared_ptr<facebook::react::JSExecutorFactory>, std::__1::shared_ptr<facebook::react::MessageQueueThread>, std::__1::shared_ptr<facebook::react::ModuleRegistry>, facebook::react::jsinspector_modern::HostTarget*)::$_0::operator()()::'lambda'(facebook::react::jsinspector_modern::HostTarget&)&, facebook::react::jsinspector_modern::HostTarget&>::type std::__1::__invoke[abi:dee210106]<facebook::react::Instance::initializeBridge(std::__1::unique_ptr<facebook::react::InstanceCallback, std::__1::default_delete<facebook::react::InstanceCallback>>, std::__1::shared_ptr<facebook::react::JSExecutorFactory>, std::__1::shared_ptr<facebook::react::MessageQueueThread>, std::__1::shared_ptr<facebook::react::ModuleRegistry>, facebook::react::jsinspector_modern::HostTarget*)::$_0::operator()()::'lambda'(facebook::react::jsinspector_modern::HostTarget&)&, facebook::react::jsinspector_modern::HostTarget&>(facebook::react::Instance::initializeBridge(std::__1::unique_ptr<facebook::react::InstanceCallback, std::__1::default_delete<facebook::react::InstanceCallback>>, std::__1::shared_ptr<facebook::react::JSExecutorFactory>, std::__1::shared_ptr<facebook::react::MessageQueueThread>, std::__1::shared_ptr<facebook::react::ModuleRegistry>, facebook::react::jsinspector_modern::HostTarget*)::$_0::operator()()::'lambda'(facebook::react::jsinspector_modern::HostTarget&)&, facebook::react::jsinspector_modern::HostTarget&)","symbolLocation":32,"imageIndex":2},{"imageOffset":22289804,"symbol":"void std::__1::__invoke_void_return_wrapper<void, true>::__call[abi:dee210106]<facebook::react::Instance::initializeBridge(std::__1::unique_ptr<facebook::react::InstanceCallback, std::__1::default_delete<facebook::react::InstanceCallback>>, std::__1::shared_ptr<facebook::react::JSExecutorFactory>, std::__1::shared_ptr<facebook::react::MessageQueueThread>, std::__1::shared_ptr<facebook::react::ModuleRegistry>, facebook::react::jsinspector_modern::HostTarget*)::$_0::operator()()::'lambda'(facebook::react::jsinspector_modern::HostTarget&)&, facebook::react::jsinspector_modern::HostTarget&>(facebook::react::Instance::initializeBridge(std::__1::unique_ptr<facebook::react::InstanceCallback, std::__1::default_delete<facebook::react::InstanceCallback>>, std::__1::shared_ptr<facebook::react::JSExecutorFactory>, std::__1::shared_ptr<facebook::react::MessageQueueThread>, std::__1::shared_ptr<facebook::react::ModuleRegistry>, facebook::react::jsinspector_modern::HostTarget*)::$_0::operator()()::'lambda'(facebook::react::jsinspector_modern::HostTarget&)&, facebook::react::jsinspector_modern::HostTarget&)","symbolLocation":32,"imageIndex":2},{"imageOffset":22289760,"symbol":"void std::__1::__invoke_r[abi:dee210106]<void, facebook::react::Instance::initializeBridge(std::__1::unique_ptr<facebook::react::InstanceCallback, std::__1::default_delete<facebook::react::InstanceCallback>>, std::__1::shared_ptr<facebook::react::JSExecutorFactory>, std::__1::shared_ptr<facebook::react::MessageQueueThread>, std::__1::shared_ptr<facebook::react::ModuleRegistry>, facebook::react::jsinspector_modern::HostTarget*)::$_0::operator()()::'lambda'(facebook::react::jsinspector_modern::HostTarget&)&, facebook::react::jsinspector_modern::HostTarget&>(facebook::react::Instance::initializeBridge(std::__1::unique_ptr<facebook::react::InstanceCallback, std::__1::default_delete<facebook::react::InstanceCallback>>, std::__1::shared_ptr<facebook::react::JSExecutorFactory>, std::__1::shared_ptr<facebook::react::MessageQueueThread>, std::__1::shared_ptr<facebook::react::ModuleRegistry>, facebook::react::jsinspector_modern::HostTarget*)::$_0::operator()()::'lambda'(facebook::react::jsinspector_modern::HostTarget&)&, facebook::react::jsinspector_modern::HostTarget&)","symbolLocation":32,"imageIndex":2},{"imageOffset":22289420,"symbol":"std::__1::__function::__func<facebook::react::Instance::initializeBridge(std::__1::unique_ptr<facebook::react::InstanceCallback, std::__1::default_delete<facebook::react::InstanceCallback>>, std::__1::shared_ptr<facebook::react::JSExecutorFactory>, std::__1::shared_ptr<facebook::react::MessageQueueThread>, std::__1::shared_ptr<facebook::react::ModuleRegistry>, facebook::react::jsinspector_modern::HostTarget*)::$_0::operator()()::'lambda'(facebook::react::jsinspector_modern::HostTarget&), void (facebook::react::jsinspector_modern::HostTarget&)>::operator()(facebook::react::jsinspector_modern::HostTarget&)","symbolLocation":36,"imageIndex":2},{"imageOffset":15588288,"symbol":"std::__1::__function::__value_func<void (facebook::react::jsinspector_modern::HostTarget&)>::operator()[abi:dee210106](facebook::react::jsinspector_modern::HostTarget&) const","symbolLocation":68,"imageIndex":2},{"imageOffset":15588184,"symbol":"std::__1::function<void (facebook::react::jsinspector_modern::HostTarget&)>::operator()(facebook::react::jsinspector_modern::HostTarget&) const","symbolLocation":32,"imageIndex":2},{"imageOffset":15587832,"symbol":"auto std::__1::function<void (std::__1::function<void (facebook::react::jsinspector_modern::HostTarget&)>&&)> facebook::react::jsinspector_modern::makeScopedExecutor<facebook::react::jsinspector_modern::HostTarget>(std::__1::shared_ptr<facebook::react::jsinspector_modern::HostTarget>, std::__1::function<void (std::__1::function<void ()>&&)>)::'lambda'(facebook::react::jsinspector_modern::HostTarget&&)::operator()<std::__1::function<void (facebook::react::jsinspector_modern::HostTarget&)>>(facebook::react::jsinspector_modern::HostTarget&&) const::'lambda'()::operator()() const","symbolLocation":96,"imageIndex":2},{"imageOffset":15587724,"symbol":"std::__1::__invoke_result_impl<void, auto std::__1::function<void (std::__1::function<void (facebook::react::jsinspector_modern::HostTarget&)>&&)> facebook::react::jsinspector_modern::makeScopedExecutor<facebook::react::jsinspector_modern::HostTarget>(std::__1::shared_ptr<facebook::react::jsinspector_modern::HostTarget>, std::__1::function<void (std::__1::function<void ()>&&)>)::'lambda'(facebook::react::jsinspector_modern::HostTarget&&)::operator()<std::__1::function<void (facebook::react::jsinspector_modern::HostTarget&)>>(facebook::react::jsinspector_modern::HostTarget&&) const::'lambda'()&>::type std::__1::__invoke[abi:dee210106]<auto std::__1::function<void (std::__1::function<void (facebook::react::jsinspector_modern::HostTarget&)>&&)> facebook::react::jsinspector_modern::makeScopedExecutor<facebook::react::jsinspector_modern::HostTarget>(std::__1::shared_ptr<facebook::react::jsinspector_modern::HostTarget>, std::__1::function<void (std::__1::function<void ()>&&)>)::'lambda'(facebook::react::jsinspector_modern::HostTarget&&)::operator()<std::__1::function<void (facebook::react::jsinspector_modern::HostTarget&)>>(facebook::react::jsinspector_modern::HostTarget&&) const::'lambda'()&>(auto std::__1::function<void (std::__1::function<void (facebook::react::jsinspector_modern::HostTarget&)>&&)> facebook::react::jsinspector_modern::makeScopedExecutor<facebook::react::jsinspector_modern::HostTarget>(std::__1::shared_ptr<facebook::react::jsinspector_modern::HostTarget>, std::__1::function<void (std::__1::function<void ()>&&)>)::'lambda'(facebook::react::jsinspector_modern::HostTarget&&)::operator()<std::__1::function<void (facebook::react::jsinspector_modern::HostTarget&)>>(facebook::react::jsinspector_modern::HostTarget&&) const::'lambda'()&&&...)","symbolLocation":24,"imageIndex":2},{"imageOffset":15587688,"symbol":"void std::__1::__invoke_void_return_wrapper<void, true>::__call[abi:dee210106]<auto std::__1::function<void (std::__1::function<void (facebook::react::jsinspector_modern::HostTarget&)>&&)> facebook::react::jsinspector_modern::makeScopedExecutor<facebook::react::jsinspector_modern::HostTarget>(std::__1::shared_ptr<facebook::react::jsinspector_modern::HostTarget>, std::__1::function<void (std::__1::function<void ()>&&)>)::'lambda'(facebook::react::jsinspector_modern::HostTarget&&)::operator()<std::__1::function<void (facebook::react::jsinspector_modern::HostTarget&)>>(facebook::react::jsinspector_modern::HostTarget&&) const::'lambda'()&>(auto std::__1::function<void (std::__1::function<void (facebook::react::jsinspector_modern::HostTarget&)>&&)> facebook::react::jsinspector_modern::makeScopedExecutor<facebook::react::jsinspector_modern::HostTarget>(std::__1::shared_ptr<facebook::react::jsinspector_modern::HostTarget>, std::__1::function<void (std::__1::function<void ()>&&)>)::'lambda'(facebook::react::jsinspector_modern::HostTarget&&)::operator()<std::__1::function<void (facebook::react::jsinspector_modern::HostTarget&)>>(facebook::react::jsinspector_modern::HostTarget&&) const::'lambda'()&)","symbolLocation":24,"imageIndex":2},{"imageOffset":15587652,"symbol":"facebook::react::jsinspector_modern::HostTarget std::__1::__invoke_r[abi:dee210106]<void, auto std::__1::function<void (std::__1::function<void (facebook::react::jsinspector_modern::HostTarget&)>&&)> facebook::react::jsinspector_modern::makeScopedExecutor<facebook::react::jsinspector_modern::HostTarget>(std::__1::shared_ptr<facebook::react::jsinspector_modern::HostTarget>, std::__1::function<void (std::__1::function<void ()>&&)>)::'lambda'(facebook::react::jsinspector_modern::HostTarget&&)::operator()<std::__1::function<void (facebook::react::jsinspector_modern::HostTarget&)>>(facebook::react::jsinspector_modern::HostTarget&&) const::'lambda'()&>(auto std::__1::function<void (std::__1::function<void (facebook::react::jsinspector_modern::HostTarget&)>&&)> facebook::react::jsinspector_modern::makeScopedExecutor<facebook::react::jsinspector_modern::HostTarget>(std::__1::shared_ptr<facebook::react::jsinspector_modern::HostTarget>, std::__1::function<void (std::__1::function<void ()>&&)>)::'lambda'(facebook::react::jsinspector_modern::HostTarget&&)::operator()<std::__1::function<void (facebook::react::jsinspector_modern::HostTarget&)>>(facebook::react::jsinspector_modern::HostTarget&&) const::'lambda'()&)","symbolLocation":24,"imageIndex":2},{"imageOffset":15586684,"symbol":"std::__1::__function::__func<auto std::__1::function<void (std::__1::function<void (facebook::react::jsinspector_modern::HostTarget&)>&&)> facebook::react::jsinspector_modern::makeScopedExecutor<facebook::react::jsinspector_modern::HostTarget>(std::__1::shared_ptr<facebook::react::jsinspector_modern::HostTarget>, std::__1::function<void (std::__1::function<void ()>&&)>)::'lambda'(facebook::react::jsinspector_modern::HostTarget&&)::operator()<std::__1::function<void (facebook::react::jsinspector_modern::HostTarget&)>>(facebook::react::jsinspector_modern::HostTarget&&) const::'lambda'(), void ()>::operator()()","symbolLocation":28,"imageIndex":2},{"imageOffset":2752200,"symbol":"std::__1::__function::__value_func<void ()>::operator()[abi:dee210106]() const","symbolLocation":60,"imageIndex":2},{"imageOffset":2752128,"symbol":"std::__1::function<void ()>::operator()() const","symbolLocation":24,"imageIndex":2},{"imageOffset":11729720,"symbol":"___ZZ18-[RCTBridge setUp]ENK3$_0clINSt3__18functionIFvvEEEEEDaT__block_invoke","symbolLocation":28,"imageIndex":2},{"imageOffset":12613920,"symbol":"__RCTExecuteOnMainQueue_block_invoke","symbolLocation":40,"imageIndex":2},{"imageOffset":5792,"symbol":"_dispatch_call_block_and_release","symbolLocation":24,"imageIndex":18},{"imageOffset":114328,"symbol":"_dispatch_client_callout","symbolLocation":12,"imageIndex":18},{"imageOffset":231240,"symbol":"<deduplicated_symbol>","symbolLocation":24,"imageIndex":18},{"imageOffset":68916,"symbol":"_dispatch_main_queue_drain","symbolLocation":1172,"imageIndex":18},{"imageOffset":67728,"symbol":"_dispatch_main_queue_callback_4CF","symbolLocation":40,"imageIndex":18},{"imageOffset":604820,"symbol":"__CFRUNLOOP_IS_SERVICING_THE_MAIN_DISPATCH_QUEUE__","symbolLocation":12,"imageIndex":19},{"imageOffset":601196,"symbol":"__CFRunLoopRun","symbolLocation":1884,"imageIndex":19},{"imageOffset":579844,"symbol":"_CFRunLoopRunSpecificWithOptions","symbolLocation":496,"imageIndex":19},{"imageOffset":10688,"symbol":"GSEventRunModal","symbolLocation":116,"imageIndex":20},{"imageOffset":18990284,"symbol":"-[UIApplication _run]","symbolLocation":776,"imageIndex":21},{"imageOffset":26306832,"symbol":"UIApplicationMain","symbolLocation":120,"imageIndex":21},{"imageOffset":13400,"sourceLine":7,"sourceFile":"main.m","symbol":"__debug_main_executable_dylib_entry_point","imageIndex":2,"symbolLocation":96},{"imageOffset":45284,"symbol":"start_sim","symbolLocation":20,"imageIndex":1},{"imageOffset":130560,"symbol":"start","symbolLocation":6992,"imageIndex":16}]},{"id":584125,"name":"com.apple.uikit.eventfetch-thread","threadState":{"x":[{"value":268451845},{"value":21592279046},{"value":8589934592},{"value":46192373268480},{"value":0},{"value":46192373268480},{"value":2},{"value":4294967295},{"value":0},{"value":17179869184},{"value":0},{"value":2},{"value":0},{"value":0},{"value":10755},{"value":3072},{"value":18446744073709551569},{"value":6447881108,"symbolLocation":0,"symbol":"-[NSConstantDate timeIntervalSinceReferenceDate]"},{"value":0},{"value":4294967295},{"value":2},{"value":46192373268480},{"value":0},{"value":46192373268480},{"value":21592279046},{"value":6174612872},{"value":8589934592},{"value":18446744073709550527},{"value":4296327168,"symbolLocation":0,"symbol":"_libkernel_string_functions"}],"flavor":"ARM_THREAD_STATE64","lr":{"value":4296121948},"cpsr":{"value":0},"fp":{"value":6174612720},"sp":{"value":6174612640},"esr":{"value":1442840704,"description":"(Syscall)"},"pc":{"value":4296051568},"far":{"value":0}},"frames":[{"imageOffset":2928,"symbol":"mach_msg2_trap","symbolLocation":8,"imageIndex":12},{"imageOffset":73308,"symbol":"mach_msg2_internal","symbolLocation":72,"imageIndex":12},{"imageOffset":35908,"symbol":"mach_msg_overwrite","symbolLocation":484,"imageIndex":12},{"imageOffset":3824,"symbol":"mach_msg","symbolLocation":20,"imageIndex":12},{"imageOffset":604096,"symbol":"__CFRunLoopServiceMachPort","symbolLocation":156,"imageIndex":19},{"imageOffset":600440,"symbol":"__CFRunLoopRun","symbolLocation":1128,"imageIndex":19},{"imageOffset":579844,"symbol":"_CFRunLoopRunSpecificWithOptions","symbolLocation":496,"imageIndex":19},{"imageOffset":9370188,"symbol":"-[NSRunLoop(NSRunLoop) runMode:beforeDate:]","symbolLocation":208,"imageIndex":23},{"imageOffset":9370728,"symbol":"-[NSRunLoop(NSRunLoop) runUntilDate:]","symbolLocation":60,"imageIndex":23},{"imageOffset":16050900,"symbol":"-[UIEventFetcher threadMain]","symbolLocation":404,"imageIndex":21},{"imageOffset":9522908,"symbol":"__NSThread__start__","symbolLocation":716,"imageIndex":23},{"imageOffset":26172,"symbol":"_pthread_start","symbolLocation":104,"imageIndex":13},{"imageOffset":6708,"symbol":"thread_start","symbolLocation":8,"imageIndex":13}]},{"id":584138,"name":"com.google.firebase.crashlytics.MachExceptionServer","threadState":{"x":[{"value":268451845},{"value":17179869190},{"value":0},{"value":0},{"value":0},{"value":128655745351680},{"value":92},{"value":0},{"value":0},{"value":17179869184},{"value":92},{"value":0},{"value":0},{"value":0},{"value":29955},{"value":92},{"value":18446744073709551569},{"value":0},{"value":0},{"value":0},{"value":92},{"value":128655745351680},{"value":0},{"value":0},{"value":17179869190},{"value":4301864788},{"value":0},{"value":18446744073709550527},{"value":4296327168,"symbolLocation":0,"symbol":"_libkernel_string_functions"}],"flavor":"ARM_THREAD_STATE64","lr":{"value":4296121948},"cpsr":{"value":0},"fp":{"value":4301864336},"sp":{"value":4301864256},"esr":{"value":1442840704,"description":"(Syscall)"},"pc":{"value":4296051568},"far":{"value":0}},"frames":[{"imageOffset":2928,"symbol":"mach_msg2_trap","symbolLocation":8,"imageIndex":12},{"imageOffset":73308,"symbol":"mach_msg2_internal","symbolLocation":72,"imageIndex":12},{"imageOffset":35908,"symbol":"mach_msg_overwrite","symbolLocation":484,"imageIndex":12},{"imageOffset":3824,"symbol":"mach_msg","symbolLocation":20,"imageIndex":12},{"imageOffset":5697208,"symbol":"FIRCLSMachExceptionReadMessage","symbolLocation":80,"imageIndex":2},{"imageOffset":5697008,"symbol":"FIRCLSMachExceptionServer","symbolLocation":52,"imageIndex":2},{"imageOffset":26172,"symbol":"_pthread_start","symbolLocation":104,"imageIndex":13},{"imageOffset":6708,"symbol":"thread_start","symbolLocation":8,"imageIndex":13}]},{"id":584400,"name":"com.apple.NSURLConnectionLoader","threadState":{"x":[{"value":268451845},{"value":21592279046},{"value":8589934592},{"value":117866787504128},{"value":0},{"value":117866787504128},{"value":2},{"value":4294967295},{"value":0},{"value":17179869184},{"value":0},{"value":2},{"value":0},{"value":0},{"value":27443},{"value":3072},{"value":18446744073709551569},{"value":6442840916,"symbolLocation":0,"symbol":"-[NSObject dealloc]"},{"value":0},{"value":4294967295},{"value":2},{"value":117866787504128},{"value":0},{"value":117866787504128},{"value":21592279046},{"value":6180363592},{"value":8589934592},{"value":18446744073709550527},{"value":4296327168,"symbolLocation":0,"symbol":"_libkernel_string_functions"}],"flavor":"ARM_THREAD_STATE64","lr":{"value":4296121948},"cpsr":{"value":0},"fp":{"value":6180363440},"sp":{"value":6180363360},"esr":{"value":1442840704,"description":"(Syscall)"},"pc":{"value":4296051568},"far":{"value":0}},"frames":[{"imageOffset":2928,"symbol":"mach_msg2_trap","symbolLocation":8,"imageIndex":12},{"imageOffset":73308,"symbol":"mach_msg2_internal","symbolLocation":72,"imageIndex":12},{"imageOffset":35908,"symbol":"mach_msg_overwrite","symbolLocation":484,"imageIndex":12},{"imageOffset":3824,"symbol":"mach_msg","symbolLocation":20,"imageIndex":12},{"imageOffset":604096,"symbol":"__CFRunLoopServiceMachPort","symbolLocation":156,"imageIndex":19},{"imageOffset":600440,"symbol":"__CFRunLoopRun","symbolLocation":1128,"imageIndex":19},{"imageOffset":579844,"symbol":"_CFRunLoopRunSpecificWithOptions","symbolLocation":496,"imageIndex":19},{"imageOffset":2101280,"symbol":"+[__CFN_CoreSchedulingSetRunnable _run:]","symbolLocation":368,"imageIndex":24},{"imageOffset":9522908,"symbol":"__NSThread__start__","symbolLocation":716,"imageIndex":23},{"imageOffset":26172,"symbol":"_pthread_start","symbolLocation":104,"imageIndex":13},{"imageOffset":6708,"symbol":"thread_start","symbolLocation":8,"imageIndex":13}]},{"id":584467,"name":"com.facebook.SocketRocket.NetworkThread","threadState":{"x":[{"value":268451845},{"value":21592279046},{"value":8589934592},{"value":170437187207168},{"value":0},{"value":170437187207168},{"value":2},{"value":4294967295},{"value":0},{"value":17179869184},{"value":0},{"value":2},{"value":0},{"value":0},{"value":39683},{"value":3072},{"value":18446744073709551569},{"value":6447881108,"symbolLocation":0,"symbol":"-[NSConstantDate timeIntervalSinceReferenceDate]"},{"value":0},{"value":4294967295},{"value":2},{"value":170437187207168},{"value":0},{"value":170437187207168},{"value":21592279046},{"value":6180937048},{"value":8589934592},{"value":18446744073709550527},{"value":4296327168,"symbolLocation":0,"symbol":"_libkernel_string_functions"}],"flavor":"ARM_THREAD_STATE64","lr":{"value":4296121948},"cpsr":{"value":0},"fp":{"value":6180936896},"sp":{"value":6180936816},"esr":{"value":1442840704,"description":"(Syscall)"},"pc":{"value":4296051568},"far":{"value":0}},"frames":[{"imageOffset":2928,"symbol":"mach_msg2_trap","symbolLocation":8,"imageIndex":12},{"imageOffset":73308,"symbol":"mach_msg2_internal","symbolLocation":72,"imageIndex":12},{"imageOffset":35908,"symbol":"mach_msg_overwrite","symbolLocation":484,"imageIndex":12},{"imageOffset":3824,"symbol":"mach_msg","symbolLocation":20,"imageIndex":12},{"imageOffset":604096,"symbol":"__CFRunLoopServiceMachPort","symbolLocation":156,"imageIndex":19},{"imageOffset":600440,"symbol":"__CFRunLoopRun","symbolLocation":1128,"imageIndex":19},{"imageOffset":579844,"symbol":"_CFRunLoopRunSpecificWithOptions","symbolLocation":496,"imageIndex":19},{"imageOffset":9370188,"symbol":"-[NSRunLoop(NSRunLoop) runMode:beforeDate:]","symbolLocation":208,"imageIndex":23},{"imageOffset":22194192,"symbol":"-[SRRunLoopThread main]","symbolLocation":268,"imageIndex":2},{"imageOffset":9522908,"symbol":"__NSThread__start__","symbolLocation":716,"imageIndex":23},{"imageOffset":26172,"symbol":"_pthread_start","symbolLocation":104,"imageIndex":13},{"imageOffset":6708,"symbol":"thread_start","symbolLocation":8,"imageIndex":13}]},{"id":584470,"name":"com.apple.CFSocket.private","threadState":{"x":[{"value":4},{"value":0},{"value":4337191968},{"value":0},{"value":0},{"value":0},{"value":17592404672512},{"value":0},{"value":6181515488},{"value":0},{"value":4562798592},{"value":31},{"value":13},{"value":4562798784},{"value":72057602419196713,"symbolLocation":72057594037927937,"symbol":"OBJC_CLASS_$___NSCFArray"},{"value":8381268776,"symbolLocation":0,"symbol":"OBJC_CLASS_$___NSCFArray"},{"value":93},{"value":6446696768,"symbolLocation":0,"symbol":"-[__NSCFArray objectAtIndex:]"},{"value":0},{"value":4347377200},{"value":8381288448,"symbolLocation":792,"symbol":"__last_exception_os_log_pack__"},{"value":64},{"value":8381291584,"symbolLocation":0,"symbol":"__CFActiveSocketsLock"},{"value":0},{"value":4337191968},{"value":4348050480},{"value":4337191952},{"value":0},{"value":4348050432}],"flavor":"ARM_THREAD_STATE64","lr":{"value":6446844812},"cpsr":{"value":1610612736},"fp":{"value":6181515200},"sp":{"value":6181481424},"esr":{"value":1442840704,"description":"(Syscall)"},"pc":{"value":4296093620},"far":{"value":0}},"frames":[{"imageOffset":44980,"symbol":"__select","symbolLocation":8,"imageIndex":12},{"imageOffset":662412,"symbol":"__CFSocketManager","symbolLocation":680,"imageIndex":19},{"imageOffset":26172,"symbol":"_pthread_start","symbolLocation":104,"imageIndex":13},{"imageOffset":6708,"symbol":"thread_start","symbolLocation":8,"imageIndex":13}]},{"id":584473,"name":"com.apple.CFNetwork.CustomProtocols","threadState":{"x":[{"value":268451845},{"value":21592279046},{"value":8589934592},{"value":157243047673856},{"value":0},{"value":157243047673856},{"value":2},{"value":4294967295},{"value":0},{"value":17179869184},{"value":0},{"value":2},{"value":0},{"value":0},{"value":36611},{"value":3072},{"value":18446744073709551569},{"value":4},{"value":0},{"value":4294967295},{"value":2},{"value":157243047673856},{"value":0},{"value":157243047673856},{"value":21592279046},{"value":6183181640},{"value":8589934592},{"value":18446744073709550527},{"value":4296327168,"symbolLocation":0,"symbol":"_libkernel_string_functions"}],"flavor":"ARM_THREAD_STATE64","lr":{"value":4296121948},"cpsr":{"value":0},"fp":{"value":6183181488},"sp":{"value":6183181408},"esr":{"value":1442840704,"description":"(Syscall)"},"pc":{"value":4296051568},"far":{"value":0}},"frames":[{"imageOffset":2928,"symbol":"mach_msg2_trap","symbolLocation":8,"imageIndex":12},{"imageOffset":73308,"symbol":"mach_msg2_internal","symbolLocation":72,"imageIndex":12},{"imageOffset":35908,"symbol":"mach_msg_overwrite","symbolLocation":484,"imageIndex":12},{"imageOffset":3824,"symbol":"mach_msg","symbolLocation":20,"imageIndex":12},{"imageOffset":604096,"symbol":"__CFRunLoopServiceMachPort","symbolLocation":156,"imageIndex":19},{"imageOffset":600440,"symbol":"__CFRunLoopRun","symbolLocation":1128,"imageIndex":19},{"imageOffset":579844,"symbol":"_CFRunLoopRunSpecificWithOptions","symbolLocation":496,"imageIndex":19},{"imageOffset":2101280,"symbol":"+[__CFN_CoreSchedulingSetRunnable _run:]","symbolLocation":368,"imageIndex":24},{"imageOffset":9522908,"symbol":"__NSThread__start__","symbolLocation":716,"imageIndex":23},{"imageOffset":26172,"symbol":"_pthread_start","symbolLocation":104,"imageIndex":13},{"imageOffset":6708,"symbol":"thread_start","symbolLocation":8,"imageIndex":13}]},{"id":584476,"name":"com.apple.CFStream.LegacyThread","threadState":{"x":[{"value":268451845},{"value":21592279046},{"value":8589934592},{"value":192427419762688},{"value":0},{"value":192427419762688},{"value":2},{"value":4294967295},{"value":0},{"value":17179869184},{"value":0},{"value":2},{"value":0},{"value":0},{"value":44803},{"value":3072},{"value":18446744073709551569},{"value":4516270392},{"value":0},{"value":4294967295},{"value":2},{"value":192427419762688},{"value":0},{"value":192427419762688},{"value":21592279046},{"value":6184329224},{"value":8589934592},{"value":18446744073709550527},{"value":4296327168,"symbolLocation":0,"symbol":"_libkernel_string_functions"}],"flavor":"ARM_THREAD_STATE64","lr":{"value":4296121948},"cpsr":{"value":0},"fp":{"value":6184329072},"sp":{"value":6184328992},"esr":{"value":1442840704,"description":"(Syscall)"},"pc":{"value":4296051568},"far":{"value":0}},"frames":[{"imageOffset":2928,"symbol":"mach_msg2_trap","symbolLocation":8,"imageIndex":12},{"imageOffset":73308,"symbol":"mach_msg2_internal","symbolLocation":72,"imageIndex":12},{"imageOffset":35908,"symbol":"mach_msg_overwrite","symbolLocation":484,"imageIndex":12},{"imageOffset":3824,"symbol":"mach_msg","symbolLocation":20,"imageIndex":12},{"imageOffset":604096,"symbol":"__CFRunLoopServiceMachPort","symbolLocation":156,"imageIndex":19},{"imageOffset":600440,"symbol":"__CFRunLoopRun","symbolLocation":1128,"imageIndex":19},{"imageOffset":579844,"symbol":"_CFRunLoopRunSpecificWithOptions","symbolLocation":496,"imageIndex":19},{"imageOffset":725924,"symbol":"_legacyStreamRunLoop_workThread","symbolLocation":260,"imageIndex":19},{"imageOffset":26172,"symbol":"_pthread_start","symbolLocation":104,"imageIndex":13},{"imageOffset":6708,"symbol":"thread_start","symbolLocation":8,"imageIndex":13}]},{"id":585032,"name":"com.apple.UIKit.inProcessAnimationManager","threadState":{"x":[{"value":14},{"value":18446744073709551615},{"value":17179869187},{"value":1},{"value":17179869187},{"value":3},{"value":17179869187},{"value":3},{"value":85251},{"value":18446744073709551615},{"value":4347826752},{"value":3},{"value":2},{"value":4347826768},{"value":8381067688,"symbolLocation":0,"symbol":"OBJC_CLASS_$_OS_dispatch_semaphore"},{"value":8381067688,"symbolLocation":0,"symbol":"OBJC_CLASS_$_OS_dispatch_semaphore"},{"value":18446744073709551580},{"value":0},{"value":0},{"value":4672792880},{"value":4672792816},{"value":18446744073709551615},{"value":4571826816},{"value":4672792816},{"value":0},{"value":0},{"value":0},{"value":0},{"value":0}],"flavor":"ARM_THREAD_STATE64","lr":{"value":6444055904},"cpsr":{"value":1610612736},"fp":{"value":6177483856},"sp":{"value":6177483840},"esr":{"value":1442840704,"description":"(Syscall)"},"pc":{"value":4296051436},"far":{"value":0}},"frames":[{"imageOffset":2796,"symbol":"semaphore_wait_trap","symbolLocation":8,"imageIndex":12},{"imageOffset":11616,"symbol":"_dispatch_sema4_wait","symbolLocation":24,"imageIndex":18},{"imageOffset":13248,"symbol":"_dispatch_semaphore_wait_slow","symbolLocation":128,"imageIndex":18},{"imageOffset":4851252,"imageIndex":21},{"imageOffset":4867220,"imageIndex":21},{"imageOffset":1357616,"imageIndex":21},{"imageOffset":9522908,"symbol":"__NSThread__start__","symbolLocation":716,"imageIndex":23},{"imageOffset":26172,"symbol":"_pthread_start","symbolLocation":104,"imageIndex":13},{"imageOffset":6708,"symbol":"thread_start","symbolLocation":8,"imageIndex":13}]},{"id":594137,"name":"com.facebook.react.JavaScript","threadState":{"x":[{"value":18446744073709551612},{"value":0},{"value":0},{"value":10000000},{"value":16},{"value":0},{"value":0},{"value":1027},{"value":9999999},{"value":916},{"value":4294967252},{"value":4294967253},{"value":4346617632},{"value":4651661632},{"value":144115196457120809,"symbolLocation":144115188075855873,"symbol":"OBJC_CLASS_$___NSArrayM"},{"value":8381264936,"symbolLocation":0,"symbol":"OBJC_CLASS_$___NSArrayM"},{"value":515},{"value":2},{"value":0},{"value":0},{"value":1},{"value":10000000},{"value":4346617636},{"value":2361183241434822607},{"value":1000},{"value":4294967295},{"value":10000000},{"value":53127},{"value":0}],"flavor":"ARM_THREAD_STATE64","lr":{"value":6444056976},"cpsr":{"value":2147483648},"fp":{"value":6176282768},"sp":{"value":6176282736},"esr":{"value":1442840704,"description":"(Syscall)"},"pc":{"value":4296058760},"far":{"value":0}},"frames":[{"imageOffset":10120,"symbol":"__ulock_wait","symbolLocation":8,"imageIndex":12},{"imageOffset":12688,"symbol":"_dlock_wait","symbolLocation":52,"imageIndex":18},{"imageOffset":11808,"symbol":"_dispatch_wait_on_address","symbolLocation":132,"imageIndex":18},{"imageOffset":13512,"symbol":"_dispatch_group_wait_slow","symbolLocation":52,"imageIndex":18},{"imageOffset":11907820,"symbol":"__26-[RCTCxxBridge invalidate]_block_invoke","symbolLocation":1564,"imageIndex":2},{"imageOffset":2723772,"symbol":"std::__1::__invoke_result_impl<void, void () block_pointer __strong&>::type std::__1::__invoke[abi:dee210106]<void () block_pointer __strong&>(void () block_pointer __strong&&&...)","symbolLocation":32,"imageIndex":2},{"imageOffset":2723500,"symbol":"std::__1::__function::__func<void () block_pointer __strong, void ()>::operator()()","symbolLocation":28,"imageIndex":2},{"imageOffset":2752200,"symbol":"std::__1::__function::__value_func<void ()>::operator()[abi:dee210106]() const","symbolLocation":60,"imageIndex":2},{"imageOffset":2752128,"symbol":"std::__1::function<void ()>::operator()() const","symbolLocation":24,"imageIndex":2},{"imageOffset":12011432,"symbol":"facebook::react::tryAndReturnError(std::__1::function<void ()> const&)","symbolLocation":24,"imageIndex":2},{"imageOffset":11865544,"symbol":"-[RCTCxxBridge _tryAndHandleError:]","symbolLocation":84,"imageIndex":2},{"imageOffset":9523788,"symbol":"__NSThreadPerformPerform","symbolLocation":124,"imageIndex":23},{"imageOffset":606044,"symbol":"__CFRUNLOOP_IS_CALLING_OUT_TO_A_SOURCE0_PERFORM_FUNCTION__","symbolLocation":24,"imageIndex":19},{"imageOffset":605860,"symbol":"__CFRunLoopDoSource0","symbolLocation":168,"imageIndex":19},{"imageOffset":603700,"symbol":"__CFRunLoopDoSources0","symbolLocation":220,"imageIndex":19},{"imageOffset":600072,"symbol":"__CFRunLoopRun","symbolLocation":760,"imageIndex":19},{"imageOffset":579844,"symbol":"_CFRunLoopRunSpecificWithOptions","symbolLocation":496,"imageIndex":19},{"imageOffset":11865064,"symbol":"+[RCTCxxBridge runRunLoop]","symbolLocation":772,"imageIndex":2},{"imageOffset":9522908,"symbol":"__NSThread__start__","symbolLocation":716,"imageIndex":23},{"imageOffset":26172,"symbol":"_pthread_start","symbolLocation":104,"imageIndex":13},{"imageOffset":6708,"symbol":"thread_start","symbolLocation":8,"imageIndex":13}]},{"id":594139,"name":"hades","threadState":{"x":[{"value":260},{"value":0},{"value":4608},{"value":0},{"value":0},{"value":160},{"value":0},{"value":0},{"value":6176861864},{"value":0},{"value":0},{"value":2},{"value":2},{"value":0},{"value":0},{"value":0},{"value":305},{"value":0},{"value":0},{"value":4587560640},{"value":4587560704},{"value":6176862432},{"value":0},{"value":0},{"value":4608},{"value":4609},{"value":4864},{"value":0},{"value":0}],"flavor":"ARM_THREAD_STATE64","lr":{"value":4300450560},"cpsr":{"value":1610612736},"fp":{"value":6176861984},"sp":{"value":6176861840},"esr":{"value":1442840704,"description":"(Syscall)"},"pc":{"value":4296065068},"far":{"value":0}},"frames":[{"imageOffset":16428,"symbol":"__psynch_cvwait","symbolLocation":8,"imageIndex":12},{"imageOffset":27392,"symbol":"_pthread_cond_wait","symbolLocation":972,"imageIndex":13},{"imageOffset":132612,"symbol":"std::__1::condition_variable::wait(std::__1::unique_lock<std::__1::mutex>&)","symbolLocation":28,"imageIndex":26},{"imageOffset":1716640,"symbol":"hermes::vm::HadesGC::Executor::worker()","symbolLocation":112,"imageIndex":4},{"imageOffset":1716484,"symbol":"void* std::__1::__thread_proxy[abi:v160006]<std::__1::tuple<std::__1::unique_ptr<std::__1::__thread_struct, std::__1::default_delete<std::__1::__thread_struct>>, hermes::vm::HadesGC::Executor::Executor()::'lambda'()>>(void*)","symbolLocation":44,"imageIndex":4},{"imageOffset":26172,"symbol":"_pthread_start","symbolLocation":104,"imageIndex":13},{"imageOffset":6708,"symbol":"thread_start","symbolLocation":8,"imageIndex":13}]},{"id":594148,"name":"hades","threadState":{"x":[{"value":260},{"value":0},{"value":0},{"value":0},{"value":0},{"value":160},{"value":0},{"value":0},{"value":6178057896},{"value":0},{"value":0},{"value":2},{"value":2},{"value":0},{"value":0},{"value":0},{"value":305},{"value":0},{"value":0},{"value":4610240128},{"value":4610240192},{"value":6178058464},{"value":0},{"value":0},{"value":0},{"value":1},{"value":256},{"value":0},{"value":0}],"flavor":"ARM_THREAD_STATE64","lr":{"value":4300450560},"cpsr":{"value":1610612736},"fp":{"value":6178058016},"sp":{"value":6178057872},"esr":{"value":1442840704,"description":"(Syscall)"},"pc":{"value":4296065068},"far":{"value":0}},"frames":[{"imageOffset":16428,"symbol":"__psynch_cvwait","symbolLocation":8,"imageIndex":12},{"imageOffset":27392,"symbol":"_pthread_cond_wait","symbolLocation":972,"imageIndex":13},{"imageOffset":132612,"symbol":"std::__1::condition_variable::wait(std::__1::unique_lock<std::__1::mutex>&)","symbolLocation":28,"imageIndex":26},{"imageOffset":1716640,"symbol":"hermes::vm::HadesGC::Executor::worker()","symbolLocation":112,"imageIndex":4},{"imageOffset":1716484,"symbol":"void* std::__1::__thread_proxy[abi:v160006]<std::__1::tuple<std::__1::unique_ptr<std::__1::__thread_struct, std::__1::default_delete<std::__1::__thread_struct>>, hermes::vm::HadesGC::Executor::Executor()::'lambda'()>>(void*)","symbolLocation":44,"imageIndex":4},{"imageOffset":26172,"symbol":"_pthread_start","symbolLocation":104,"imageIndex":13},{"imageOffset":6708,"symbol":"thread_start","symbolLocation":8,"imageIndex":13}]},{"id":597198,"threadState":{"x":[{"value":268451845},{"value":21592279046},{"value":8589934592},{"value":556468847771648},{"value":0},{"value":556468847771648},{"value":2},{"value":4294967295},{"value":0},{"value":17179869184},{"value":0},{"value":2},{"value":0},{"value":0},{"value":129563},{"value":3072},{"value":18446744073709551569},{"value":6442840916,"symbolLocation":0,"symbol":"-[NSObject dealloc]"},{"value":0},{"value":4294967295},{"value":2},{"value":556468847771648},{"value":0},{"value":556468847771648},{"value":21592279046},{"value":6172312856},{"value":8589934592},{"value":18446744073709550527},{"value":4296327168,"symbolLocation":0,"symbol":"_libkernel_string_functions"}],"flavor":"ARM_THREAD_STATE64","lr":{"value":4296121948},"cpsr":{"value":0},"fp":{"value":6172312704},"sp":{"value":6172312624},"esr":{"value":1442840704,"description":"(Syscall)"},"pc":{"value":4296051568},"far":{"value":0}},"queue":"com.apple.NSURLSession-delegate","frames":[{"imageOffset":2928,"symbol":"mach_msg2_trap","symbolLocation":8,"imageIndex":12},{"imageOffset":73308,"symbol":"mach_msg2_internal","symbolLocation":72,"imageIndex":12},{"imageOffset":35908,"symbol":"mach_msg_overwrite","symbolLocation":484,"imageIndex":12},{"imageOffset":3824,"symbol":"mach_msg","symbolLocation":20,"imageIndex":12},{"imageOffset":604096,"symbol":"__CFRunLoopServiceMachPort","symbolLocation":156,"imageIndex":19},{"imageOffset":600440,"symbol":"__CFRunLoopRun","symbolLocation":1128,"imageIndex":19},{"imageOffset":579844,"symbol":"_CFRunLoopRunSpecificWithOptions","symbolLocation":496,"imageIndex":19},{"imageOffset":735708,"symbol":"boundPairRead","symbolLocation":296,"imageIndex":19},{"imageOffset":716768,"symbol":"CFReadStreamRead","symbolLocation":304,"imageIndex":19},{"imageOffset":12264472,"symbol":"-[RCTMultipartStreamReader readAllPartsWithCompletionCallback:progressCallback:]","symbolLocation":1112,"imageIndex":2},{"imageOffset":12260204,"symbol":"-[RCTMultipartDataTask URLSession:streamTask:didBecomeInputStream:outputStream:]","symbolLocation":308,"imageIndex":2},{"imageOffset":69112,"symbol":"__98-[__NSCFURLSessionDelegateWrapper streamTask:didBecomeInputStream:outputStream:completionHandler:]_block_invoke","symbolLocation":32,"imageIndex":24},{"imageOffset":5792,"symbol":"_dispatch_call_block_and_release","symbolLocation":24,"imageIndex":18},{"imageOffset":114328,"symbol":"_dispatch_client_callout","symbolLocation":12,"imageIndex":18},{"imageOffset":42788,"symbol":"_dispatch_lane_serial_drain","symbolLocation":984,"imageIndex":18},{"imageOffset":45544,"symbol":"_dispatch_lane_invoke","symbolLocation":396,"imageIndex":18},{"imageOffset":89792,"symbol":"_dispatch_root_queue_drain_deferred_wlh","symbolLocation":288,"imageIndex":18},{"imageOffset":87560,"symbol":"_dispatch_workloop_worker_thread","symbolLocation":692,"imageIndex":18},{"imageOffset":11304,"symbol":"_pthread_wqthread","symbolLocation":288,"imageIndex":13},{"imageOffset":6696,"symbol":"start_wqthread","symbolLocation":8,"imageIndex":13}]},{"id":597320,"threadState":{"x":[{"value":0},{"value":8589934595},{"value":240518173971},{"value":372335009858051},{"value":20645907791872},{"value":372335009857536},{"value":44},{"value":0},{"value":4296257536},{"value":5368430592},{"value":13176245766935396352},{"value":1802240},{"value":0},{"value":32769},{"value":4},{"value":4653416448},{"value":18446744073709551569},{"value":18446744072367376383},{"value":0},{"value":0},{"value":44},{"value":372335009857536},{"value":20645907791872},{"value":372335009858051},{"value":8589934595},{"value":6172894504},{"value":240518173971},{"value":18446744073709550527},{"value":16973826}],"flavor":"ARM_THREAD_STATE64","lr":{"value":4296121948},"cpsr":{"value":1073741824},"fp":{"value":6172894480},"sp":{"value":6172894400},"esr":{"value":1442840704,"description":"(Syscall)"},"pc":{"value":4296051568},"far":{"value":0}},"queue":"com.apple.NSURLSession-delegate","frames":[{"imageOffset":2928,"symbol":"mach_msg2_trap","symbolLocation":8,"imageIndex":12},{"imageOffset":73308,"symbol":"mach_msg2_internal","symbolLocation":72,"imageIndex":12},{"imageOffset":14740,"symbol":"vm_copy","symbolLocation":112,"imageIndex":12},{"imageOffset":2538084,"symbol":"specialized static __DataStorage.move(_:_:_:)","symbolLocation":164,"imageIndex":23},{"imageOffset":2469660,"symbol":"__DataStorage.init(bytes:length:)","symbolLocation":232,"imageIndex":23},{"imageOffset":7487504,"symbol":"specialized Data.init(referencing:)","symbolLocation":288,"imageIndex":23},{"imageOffset":7481296,"symbol":"static Data._unconditionallyBridgeFromObjectiveC(_:)","symbolLocation":32,"imageIndex":23},{"imageOffset":3517628,"symbol":"@objc ExpoRequestInterceptorProtocol.urlSession(_:dataTask:didReceive:)","symbolLocation":108,"imageIndex":2},{"imageOffset":3787828,"symbol":"partial apply","symbolLocation":36,"imageIndex":2},{"imageOffset":3787908,"symbol":"thunk for @escaping @callee_guaranteed (@unowned NSURLSession, @unowned NSURLSessionDataTask, @unowned NSData) -> ()","symbolLocation":68,"imageIndex":2},{"imageOffset":3787688,"symbol":"URLSessionSessionDelegateProxy.urlSession(_:dataTask:didReceive:)","symbolLocation":400,"imageIndex":2},{"imageOffset":3788168,"symbol":"@objc URLSessionSessionDelegateProxy.urlSession(_:dataTask:didReceive:)","symbolLocation":156,"imageIndex":2},{"imageOffset":63340,"symbol":"__77-[__NSCFURLSessionDelegateWrapper dataTask:didReceiveData:completionHandler:]_block_invoke_3","symbolLocation":32,"imageIndex":24},{"imageOffset":5792,"symbol":"_dispatch_call_block_and_release","symbolLocation":24,"imageIndex":18},{"imageOffset":114328,"symbol":"_dispatch_client_callout","symbolLocation":12,"imageIndex":18},{"imageOffset":42788,"symbol":"_dispatch_lane_serial_drain","symbolLocation":984,"imageIndex":18},{"imageOffset":45544,"symbol":"_dispatch_lane_invoke","symbolLocation":396,"imageIndex":18},{"imageOffset":89792,"symbol":"_dispatch_root_queue_drain_deferred_wlh","symbolLocation":288,"imageIndex":18},{"imageOffset":87560,"symbol":"_dispatch_workloop_worker_thread","symbolLocation":692,"imageIndex":18},{"imageOffset":11304,"symbol":"_pthread_wqthread","symbolLocation":288,"imageIndex":13},{"imageOffset":6696,"symbol":"start_wqthread","symbolLocation":8,"imageIndex":13}]},{"id":597392,"frames":[{"imageOffset":128184,"symbol":"__CFFromUTF8","symbolLocation":204,"imageIndex":19},{"imageOffset":900164,"symbol":"__CFStringDecodeByteStream3","symbolLocation":2156,"imageIndex":19},{"imageOffset":758232,"symbol":"__CFStringCreateImmutableFunnel3","symbolLocation":772,"imageIndex":19},{"imageOffset":22228072,"symbol":"validate_dispatch_data_partial_string","symbolLocation":1376,"imageIndex":2},{"imageOffset":22225724,"symbol":"-[SRWebSocket _innerPumpScanner]","symbolLocation":1752,"imageIndex":2},{"imageOffset":22228356,"symbol":"-[SRWebSocket _pumpScanner]","symbolLocation":84,"imageIndex":2},{"imageOffset":22231920,"symbol":"-[SRWebSocket safeHandleEvent:stream:]","symbolLocation":1236,"imageIndex":2},{"imageOffset":22230656,"symbol":"__34-[SRWebSocket stream:handleEvent:]_block_invoke_4","symbolLocation":64,"imageIndex":2},{"imageOffset":5792,"symbol":"_dispatch_call_block_and_release","symbolLocation":24,"imageIndex":18},{"imageOffset":114328,"symbol":"_dispatch_client_callout","symbolLocation":12,"imageIndex":18},{"imageOffset":42788,"symbol":"_dispatch_lane_serial_drain","symbolLocation":984,"imageIndex":18},{"imageOffset":45544,"symbol":"_dispatch_lane_invoke","symbolLocation":396,"imageIndex":18},{"imageOffset":89792,"symbol":"_dispatch_root_queue_drain_deferred_wlh","symbolLocation":288,"imageIndex":18},{"imageOffset":87560,"symbol":"_dispatch_workloop_worker_thread","symbolLocation":692,"imageIndex":18},{"imageOffset":11304,"symbol":"_pthread_wqthread","symbolLocation":288,"imageIndex":13},{"imageOffset":6696,"symbol":"start_wqthread","symbolLocation":8,"imageIndex":13}],"threadState":{"x":[{"value":0},{"value":4527767552},{"value":1852978},{"value":5007998976},{"value":1852978},{"value":6173449936},{"value":0},{"value":0},{"value":1599500},{"value":0},{"value":55296},{"value":0},{"value":0},{"value":4294967224},{"value":6448413028,"symbolLocation":0,"symbol":"offsetsFromUTF8"},{"value":65533},{"value":4299737060,"symbolLocation":0,"symbol":"os_unfair_lock_unlock"},{"value":6460575712,"symbolLocation":0,"symbol":"-[NSPlaceholderString initWithBytesNoCopy:length:encoding:freeWhenDone:]"},{"value":0},{"value":4527767552},{"value":6173449936},{"value":1852978},{"value":89651},{"value":0},{"value":32},{"value":4529530879},{"value":0},{"value":1},{"value":6448412771,"symbolLocation":0,"symbol":"trailingBytesForUTF8"}],"flavor":"ARM_THREAD_STATE64","lr":{"value":6447082564},"cpsr":{"value":2147483648},"fp":{"value":6173449920},"sp":{"value":6173449760},"esr":{"value":1442840704,"description":"(Syscall)"},"pc":{"value":6446310584},"far":{"value":0}}},{"id":597394,"name":"com.facebook.react.JavaScript","threadState":{"x":[{"value":18446744073709551612},{"value":0},{"value":257},{"value":0},{"value":8381071296,"symbolLocation":0,"symbol":"_dispatch_main_q"},{"value":18},{"value":6179147268},{"value":6179147256},{"value":1},{"value":3},{"value":4517203526},{"value":4517203520},{"value":6179146838},{"value":8381071344,"symbolLocation":48,"symbol":"_dispatch_main_q"},{"value":8381078056,"symbolLocation":0,"symbol":"_NSConcreteStackBlock"},{"value":8381078056,"symbolLocation":0,"symbol":"_NSConcreteStackBlock"},{"value":515},{"value":6443522848,"symbolLocation":0,"symbol":"-[__NSStackBlock__ retain]"},{"value":0},{"value":6179146928},{"value":1},{"value":17409},{"value":6179146880},{"value":6444113948,"symbolLocation":0,"symbol":"_dispatch_main_queue_push"},{"value":18},{"value":269312},{"value":0},{"value":4853313044697},{"value":0}],"flavor":"ARM_THREAD_STATE64","lr":{"value":6444056332},"cpsr":{"value":1073741824},"fp":{"value":6179146752},"sp":{"value":6179146720},"esr":{"value":1442840704,"description":"(Syscall)"},"pc":{"value":4296058760},"far":{"value":0}},"frames":[{"imageOffset":10120,"symbol":"__ulock_wait","symbolLocation":8,"imageIndex":12},{"imageOffset":12044,"symbol":"_dispatch_thread_main_event_wait_slow","symbolLocation":72,"imageIndex":18},{"imageOffset":73120,"symbol":"__DISPATCH_WAIT_FOR_QUEUE__","symbolLocation":484,"imageIndex":18},{"imageOffset":71716,"symbol":"_dispatch_sync_f_slow","symbolLocation":156,"imageIndex":18},{"imageOffset":12614120,"symbol":"RCTUnsafeExecuteOnMainQueueSync","symbolLocation":188,"imageIndex":2},{"imageOffset":11163632,"symbol":"-[REAKeyboardEventObserver cleanupListeners]","symbolLocation":108,"imageIndex":2},{"imageOffset":383564,"symbol":"__CFNOTIFICATIONCENTER_IS_CALLING_OUT_TO_AN_OBSERVER__","symbolLocation":140,"imageIndex":19},{"imageOffset":383344,"symbol":"___CFXRegistrationPost_block_invoke","symbolLocation":88,"imageIndex":19},{"imageOffset":380508,"symbol":"_CFXRegistrationPost","symbolLocation":408,"imageIndex":19},{"imageOffset":378948,"symbol":"_CFXNotificationPost","symbolLocation":696,"imageIndex":19},{"imageOffset":9055612,"symbol":"-[NSNotificationCenter postNotificationName:object:userInfo:]","symbolLocation":88,"imageIndex":23},{"imageOffset":11908108,"symbol":"__26-[RCTCxxBridge invalidate]_block_invoke","symbolLocation":1852,"imageIndex":2},{"imageOffset":2723772,"symbol":"std::__1::__invoke_result_impl<void, void () block_pointer __strong&>::type std::__1::__invoke[abi:dee210106]<void () block_pointer __strong&>(void () block_pointer __strong&&&...)","symbolLocation":32,"imageIndex":2},{"imageOffset":2723500,"symbol":"std::__1::__function::__func<void () block_pointer __strong, void ()>::operator()()","symbolLocation":28,"imageIndex":2},{"imageOffset":2752200,"symbol":"std::__1::__function::__value_func<void ()>::operator()[abi:dee210106]() const","symbolLocation":60,"imageIndex":2},{"imageOffset":2752128,"symbol":"std::__1::function<void ()>::operator()() const","symbolLocation":24,"imageIndex":2},{"imageOffset":12011432,"symbol":"facebook::react::tryAndReturnError(std::__1::function<void ()> const&)","symbolLocation":24,"imageIndex":2},{"imageOffset":11865544,"symbol":"-[RCTCxxBridge _tryAndHandleError:]","symbolLocation":84,"imageIndex":2},{"imageOffset":9523788,"symbol":"__NSThreadPerformPerform","symbolLocation":124,"imageIndex":23},{"imageOffset":606044,"symbol":"__CFRUNLOOP_IS_CALLING_OUT_TO_A_SOURCE0_PERFORM_FUNCTION__","symbolLocation":24,"imageIndex":19},{"imageOffset":605860,"symbol":"__CFRunLoopDoSource0","symbolLocation":168,"imageIndex":19},{"imageOffset":603700,"symbol":"__CFRunLoopDoSources0","symbolLocation":220,"imageIndex":19},{"imageOffset":600072,"symbol":"__CFRunLoopRun","symbolLocation":760,"imageIndex":19},{"imageOffset":579844,"symbol":"_CFRunLoopRunSpecificWithOptions","symbolLocation":496,"imageIndex":19},{"imageOffset":11865064,"symbol":"+[RCTCxxBridge runRunLoop]","symbolLocation":772,"imageIndex":2},{"imageOffset":9522908,"symbol":"__NSThread__start__","symbolLocation":716,"imageIndex":23},{"imageOffset":26172,"symbol":"_pthread_start","symbolLocation":104,"imageIndex":13},{"imageOffset":6708,"symbol":"thread_start","symbolLocation":8,"imageIndex":13}]},{"id":597395,"name":"hades","threadState":{"x":[{"value":260},{"value":0},{"value":0},{"value":0},{"value":0},{"value":160},{"value":0},{"value":0},{"value":6174043816},{"value":0},{"value":0},{"value":2},{"value":2},{"value":0},{"value":0},{"value":0},{"value":305},{"value":0},{"value":0},{"value":4522114816},{"value":4522114880},{"value":6174044384},{"value":0},{"value":0},{"value":0},{"value":1},{"value":256},{"value":0},{"value":0}],"flavor":"ARM_THREAD_STATE64","lr":{"value":4300450560},"cpsr":{"value":1610612736},"fp":{"value":6174043936},"sp":{"value":6174043792},"esr":{"value":1442840704,"description":"(Syscall)"},"pc":{"value":4296065068},"far":{"value":0}},"frames":[{"imageOffset":16428,"symbol":"__psynch_cvwait","symbolLocation":8,"imageIndex":12},{"imageOffset":27392,"symbol":"_pthread_cond_wait","symbolLocation":972,"imageIndex":13},{"imageOffset":132612,"symbol":"std::__1::condition_variable::wait(std::__1::unique_lock<std::__1::mutex>&)","symbolLocation":28,"imageIndex":26},{"imageOffset":1716640,"symbol":"hermes::vm::HadesGC::Executor::worker()","symbolLocation":112,"imageIndex":4},{"imageOffset":1716484,"symbol":"void* std::__1::__thread_proxy[abi:v160006]<std::__1::tuple<std::__1::unique_ptr<std::__1::__thread_struct, std::__1::default_delete<std::__1::__thread_struct>>, hermes::vm::HadesGC::Executor::Executor()::'lambda'()>>(void*)","symbolLocation":44,"imageIndex":4},{"imageOffset":26172,"symbol":"_pthread_start","symbolLocation":104,"imageIndex":13},{"imageOffset":6708,"symbol":"thread_start","symbolLocation":8,"imageIndex":13}]},{"id":597396,"name":"com.facebook.react.JavaScript","threadState":{"x":[{"value":260},{"value":0},{"value":0},{"value":0},{"value":0},{"value":160},{"value":0},{"value":0},{"value":6182605288},{"value":0},{"value":0},{"value":2},{"value":2},{"value":0},{"value":0},{"value":0},{"value":305},{"value":6443522852,"symbolLocation":0,"symbol":"-[__NSStackBlock__ release]"},{"value":0},{"value":6182605768},{"value":6182605720},{"value":6182613216},{"value":0},{"value":0},{"value":0},{"value":1},{"value":256},{"value":130591},{"value":0}],"flavor":"ARM_THREAD_STATE64","lr":{"value":4300450560},"cpsr":{"value":1610612736},"fp":{"value":6182605408},"sp":{"value":6182605264},"esr":{"value":1442840704,"description":"(Syscall)"},"pc":{"value":4296065068},"far":{"value":0}},"frames":[{"imageOffset":16428,"symbol":"__psynch_cvwait","symbolLocation":8,"imageIndex":12},{"imageOffset":27392,"symbol":"_pthread_cond_wait","symbolLocation":972,"imageIndex":13},{"imageOffset":132612,"symbol":"std::__1::condition_variable::wait(std::__1::unique_lock<std::__1::mutex>&)","symbolLocation":28,"imageIndex":26},{"imageOffset":22285128,"symbol":"void std::__1::condition_variable::wait[abi:dee210106]<facebook::react::Instance::initializeBridge(std::__1::unique_ptr<facebook::react::InstanceCallback, std::__1::default_delete<facebook::react::InstanceCallback>>, std::__1::shared_ptr<facebook::react::JSExecutorFactory>, std::__1::shared_ptr<facebook::react::MessageQueueThread>, std::__1::shared_ptr<facebook::react::ModuleRegistry>, facebook::react::jsinspector_modern::HostTarget*)::$_0::operator()()::'lambda'()>(std::__1::unique_lock<std::__1::mutex>&, facebook::react::Instance::initializeBridge(std::__1::unique_ptr<facebook::react::InstanceCallback, std::__1::default_delete<facebook::react::InstanceCallback>>, std::__1::shared_ptr<facebook::react::JSExecutorFactory>, std::__1::shared_ptr<facebook::react::MessageQueueThread>, std::__1::shared_ptr<facebook::react::ModuleRegistry>, facebook::react::jsinspector_modern::HostTarget*)::$_0::operator()()::'lambda'())","symbolLocation":64,"imageIndex":2},{"imageOffset":22284484,"symbol":"facebook::react::Instance::initializeBridge(std::__1::unique_ptr<facebook::react::InstanceCallback, std::__1::default_delete<facebook::react::InstanceCallback>>, std::__1::shared_ptr<facebook::react::JSExecutorFactory>, std::__1::shared_ptr<facebook::react::MessageQueueThread>, std::__1::shared_ptr<facebook::react::ModuleRegistry>, facebook::react::jsinspector_modern::HostTarget*)::$_0::operator()()","symbolLocation":308,"imageIndex":2},{"imageOffset":22284164,"symbol":"std::__1::__invoke_result_impl<void, facebook::react::Instance::initializeBridge(std::__1::unique_ptr<facebook::react::InstanceCallback, std::__1::default_delete<facebook::react::InstanceCallback>>, std::__1::shared_ptr<facebook::react::JSExecutorFactory>, std::__1::shared_ptr<facebook::react::MessageQueueThread>, std::__1::shared_ptr<facebook::react::ModuleRegistry>, facebook::react::jsinspector_modern::HostTarget*)::$_0&>::type std::__1::__invoke[abi:dee210106]<facebook::react::Instance::initializeBridge(std::__1::unique_ptr<facebook::react::InstanceCallback, std::__1::default_delete<facebook::react::InstanceCallback>>, std::__1::shared_ptr<facebook::react::JSExecutorFactory>, std::__1::shared_ptr<facebook::react::MessageQueueThread>, std::__1::shared_ptr<facebook::react::ModuleRegistry>, facebook::react::jsinspector_modern::HostTarget*)::$_0&>(facebook::react::Instance::initializeBridge(std::__1::unique_ptr<facebook::react::InstanceCallback, std::__1::default_delete<facebook::react::InstanceCallback>>, std::__1::shared_ptr<facebook::react::JSExecutorFactory>, std::__1::shared_ptr<facebook::react::MessageQueueThread>, std::__1::shared_ptr<facebook::react::ModuleRegistry>, facebook::react::jsinspector_modern::HostTarget*)::$_0&)","symbolLocation":24,"imageIndex":2},{"imageOffset":22284128,"symbol":"void std::__1::__invoke_void_return_wrapper<void, true>::__call[abi:dee210106]<facebook::react::Instance::initializeBridge(std::__1::unique_ptr<facebook::react::InstanceCallback, std::__1::default_delete<facebook::react::InstanceCallback>>, std::__1::shared_ptr<facebook::react::JSExecutorFactory>, std::__1::shared_ptr<facebook::react::MessageQueueThread>, std::__1::shared_ptr<facebook::react::ModuleRegistry>, facebook::react::jsinspector_modern::HostTarget*)::$_0&>(facebook::react::Instance::initializeBridge(std::__1::unique_ptr<facebook::react::InstanceCallback, std::__1::default_delete<facebook::react::InstanceCallback>>, std::__1::shared_ptr<facebook::react::JSExecutorFactory>, std::__1::shared_ptr<facebook::react::MessageQueueThread>, std::__1::shared_ptr<facebook::react::ModuleRegistry>, facebook::react::jsinspector_modern::HostTarget*)::$_0&)","symbolLocation":24,"imageIndex":2},{"imageOffset":22284092,"symbol":"void std::__1::__invoke_r[abi:dee210106]<void, facebook::react::Instance::initializeBridge(std::__1::unique_ptr<facebook::react::InstanceCallback, std::__1::default_delete<facebook::react::InstanceCallback>>, std::__1::shared_ptr<facebook::react::JSExecutorFactory>, std::__1::shared_ptr<facebook::react::MessageQueueThread>, std::__1::shared_ptr<facebook::react::ModuleRegistry>, facebook::react::jsinspector_modern::HostTarget*)::$_0&>(facebook::react::Instance::initializeBridge(std::__1::unique_ptr<facebook::react::InstanceCallback, std::__1::default_delete<facebook::react::InstanceCallback>>, std::__1::shared_ptr<facebook::react::JSExecutorFactory>, std::__1::shared_ptr<facebook::react::MessageQueueThread>, std::__1::shared_ptr<facebook::react::ModuleRegistry>, facebook::react::jsinspector_modern::HostTarget*)::$_0&)","symbolLocation":24,"imageIndex":2},{"imageOffset":22283540,"symbol":"std::__1::__function::__func<facebook::react::Instance::initializeBridge(std::__1::unique_ptr<facebook::react::InstanceCallback, std::__1::default_delete<facebook::react::InstanceCallback>>, std::__1::shared_ptr<facebook::react::JSExecutorFactory>, std::__1::shared_ptr<facebook::react::MessageQueueThread>, std::__1::shared_ptr<facebook::react::ModuleRegistry>, facebook::react::jsinspector_modern::HostTarget*)::$_0, void ()>::operator()()","symbolLocation":28,"imageIndex":2},{"imageOffset":2752200,"symbol":"std::__1::__function::__value_func<void ()>::operator()[abi:dee210106]() const","symbolLocation":60,"imageIndex":2},{"imageOffset":2752128,"symbol":"std::__1::function<void ()>::operator()() const","symbolLocation":24,"imageIndex":2},{"imageOffset":12011432,"symbol":"facebook::react::tryAndReturnError(std::__1::function<void ()> const&)","symbolLocation":24,"imageIndex":2},{"imageOffset":12180036,"symbol":"facebook::react::RCTMessageThread::tryFunc(std::__1::function<void ()> const&)","symbolLocation":36,"imageIndex":2},{"imageOffset":12189412,"symbol":"facebook::react::RCTMessageThread::runOnQueueSync(std::__1::function<void ()>&&)::$_0::operator()() const","symbolLocation":64,"imageIndex":2},{"imageOffset":12189336,"symbol":"std::__1::__invoke_result_impl<void, facebook::react::RCTMessageThread::runOnQueueSync(std::__1::function<void ()>&&)::$_0&>::type std::__1::__invoke[abi:dee210106]<facebook::react::RCTMessageThread::runOnQueueSync(std::__1::function<void ()>&&)::$_0&>(facebook::react::RCTMessageThread::runOnQueueSync(std::__1::function<void ()>&&)::$_0&)","symbolLocation":24,"imageIndex":2},{"imageOffset":12189300,"symbol":"void std::__1::__invoke_void_return_wrapper<void, true>::__call[abi:dee210106]<facebook::react::RCTMessageThread::runOnQueueSync(std::__1::function<void ()>&&)::$_0&>(facebook::react::RCTMessageThread::runOnQueueSync(std::__1::function<void ()>&&)::$_0&)","symbolLocation":24,"imageIndex":2},{"imageOffset":12189264,"symbol":"void std::__1::__invoke_r[abi:dee210106]<void, facebook::react::RCTMessageThread::runOnQueueSync(std::__1::function<void ()>&&)::$_0&>(facebook::react::RCTMessageThread::runOnQueueSync(std::__1::function<void ()>&&)::$_0&)","symbolLocation":24,"imageIndex":2},{"imageOffset":12188632,"symbol":"std::__1::__function::__func<facebook::react::RCTMessageThread::runOnQueueSync(std::__1::function<void ()>&&)::$_0, void ()>::operator()()","symbolLocation":28,"imageIndex":2},{"imageOffset":2752200,"symbol":"std::__1::__function::__value_func<void ()>::operator()[abi:dee210106]() const","symbolLocation":60,"imageIndex":2},{"imageOffset":2752128,"symbol":"std::__1::function<void ()>::operator()() const","symbolLocation":24,"imageIndex":2},{"imageOffset":12179544,"symbol":"facebook::react::RCTMessageThread::runSync(std::__1::function<void ()>)","symbolLocation":96,"imageIndex":2},{"imageOffset":12180736,"symbol":"facebook::react::RCTMessageThread::runOnQueueSync(std::__1::function<void ()>&&)","symbolLocation":132,"imageIndex":2},{"imageOffset":22272264,"symbol":"facebook::react::Instance::initializeBridge(std::__1::unique_ptr<facebook::react::InstanceCallback, std::__1::default_delete<facebook::react::InstanceCallback>>, std::__1::shared_ptr<facebook::react::JSExecutorFactory>, std::__1::shared_ptr<facebook::react::MessageQueueThread>, std::__1::shared_ptr<facebook::react::ModuleRegistry>, facebook::react::jsinspector_modern::HostTarget*)","symbolLocation":204,"imageIndex":2},{"imageOffset":11884368,"symbol":"-[RCTCxxBridge _initializeBridgeLocked:parentInspectorTarget:]","symbolLocation":204,"imageIndex":2},{"imageOffset":11882676,"symbol":"-[RCTCxxBridge _initializeBridge:parentInspectorTarget:]","symbolLocation":716,"imageIndex":2},{"imageOffset":11872192,"symbol":"__21-[RCTCxxBridge start]_block_invoke.110","symbolLocation":88,"imageIndex":2},{"imageOffset":2723772,"symbol":"std::__1::__invoke_result_impl<void, void () block_pointer __strong&>::type std::__1::__invoke[abi:dee210106]<void () block_pointer __strong&>(void () block_pointer __strong&&&...)","symbolLocation":32,"imageIndex":2},{"imageOffset":2723500,"symbol":"std::__1::__function::__func<void () block_pointer __strong, void ()>::operator()()","symbolLocation":28,"imageIndex":2},{"imageOffset":2752200,"symbol":"std::__1::__function::__value_func<void ()>::operator()[abi:dee210106]() const","symbolLocation":60,"imageIndex":2},{"imageOffset":2752128,"symbol":"std::__1::function<void ()>::operator()() const","symbolLocation":24,"imageIndex":2},{"imageOffset":12011432,"symbol":"facebook::react::tryAndReturnError(std::__1::function<void ()> const&)","symbolLocation":24,"imageIndex":2},{"imageOffset":11865544,"symbol":"-[RCTCxxBridge _tryAndHandleError:]","symbolLocation":84,"imageIndex":2},{"imageOffset":9523788,"symbol":"__NSThreadPerformPerform","symbolLocation":124,"imageIndex":23},{"imageOffset":606044,"symbol":"__CFRUNLOOP_IS_CALLING_OUT_TO_A_SOURCE0_PERFORM_FUNCTION__","symbolLocation":24,"imageIndex":19},{"imageOffset":605860,"symbol":"__CFRunLoopDoSource0","symbolLocation":168,"imageIndex":19},{"imageOffset":603700,"symbol":"__CFRunLoopDoSources0","symbolLocation":220,"imageIndex":19},{"imageOffset":600072,"symbol":"__CFRunLoopRun","symbolLocation":760,"imageIndex":19},{"imageOffset":579844,"symbol":"_CFRunLoopRunSpecificWithOptions","symbolLocation":496,"imageIndex":19},{"imageOffset":11865064,"symbol":"+[RCTCxxBridge runRunLoop]","symbolLocation":772,"imageIndex":2},{"imageOffset":9522908,"symbol":"__NSThread__start__","symbolLocation":716,"imageIndex":23},{"imageOffset":26172,"symbol":"_pthread_start","symbolLocation":104,"imageIndex":13},{"imageOffset":6708,"symbol":"thread_start","symbolLocation":8,"imageIndex":13}]},{"id":597397,"name":"hades","threadState":{"x":[{"value":260},{"value":0},{"value":0},{"value":0},{"value":0},{"value":160},{"value":0},{"value":0},{"value":6175190696},{"value":0},{"value":0},{"value":2},{"value":2},{"value":0},{"value":0},{"value":0},{"value":305},{"value":0},{"value":0},{"value":4522108672},{"value":4522108736},{"value":6175191264},{"value":0},{"value":0},{"value":0},{"value":1},{"value":256},{"value":0},{"value":0}],"flavor":"ARM_THREAD_STATE64","lr":{"value":4300450560},"cpsr":{"value":1610612736},"fp":{"value":6175190816},"sp":{"value":6175190672},"esr":{"value":1442840704,"description":"(Syscall)"},"pc":{"value":4296065068},"far":{"value":0}},"frames":[{"imageOffset":16428,"symbol":"__psynch_cvwait","symbolLocation":8,"imageIndex":12},{"imageOffset":27392,"symbol":"_pthread_cond_wait","symbolLocation":972,"imageIndex":13},{"imageOffset":132612,"symbol":"std::__1::condition_variable::wait(std::__1::unique_lock<std::__1::mutex>&)","symbolLocation":28,"imageIndex":26},{"imageOffset":1716640,"symbol":"hermes::vm::HadesGC::Executor::worker()","symbolLocation":112,"imageIndex":4},{"imageOffset":1716484,"symbol":"void* std::__1::__thread_proxy[abi:v160006]<std::__1::tuple<std::__1::unique_ptr<std::__1::__thread_struct, std::__1::default_delete<std::__1::__thread_struct>>, hermes::vm::HadesGC::Executor::Executor()::'lambda'()>>(void*)","symbolLocation":44,"imageIndex":4},{"imageOffset":26172,"symbol":"_pthread_start","symbolLocation":104,"imageIndex":13},{"imageOffset":6708,"symbol":"thread_start","symbolLocation":8,"imageIndex":13}]},{"id":597398,"threadState":{"x":[{"value":5016387584},{"value":5004230688},{"value":1360264},{"value":5016813568},{"value":18446744073696968704},{"value":32},{"value":0},{"value":0},{"value":2314885436530640718},{"value":7017490165746638880},{"value":4189021028987392884},{"value":2325069435940053536},{"value":16150506647762268005},{"value":12656487751795911332},{"value":11880668048958596576},{"value":2308706285864214716},{"value":4299747504,"symbolLocation":0,"symbol":"_platform_memmove"},{"value":6458583580,"symbolLocation":0,"symbol":"@objc __NSSwiftData.length.getter"},{"value":0},{"value":0},{"value":1786312},{"value":5003804672},{"value":1786312},{"value":5016387584},{"value":2215591936},{"value":4662379328},{"value":0},{"value":0},{"value":16973826}],"flavor":"ARM_THREAD_STATE64","lr":{"value":6444247676},"cpsr":{"value":536870912},"fp":{"value":6179792336},"sp":{"value":6179792288},"esr":{"value":2449473611,"description":"(Data Abort) byte write Access flag fault"},"pc":{"value":4299747604},"far":{"value":5016813568}},"queue":"com.apple.NSURLSession-work","frames":[{"imageOffset":12564,"symbol":"_platform_memmove","symbolLocation":100,"imageIndex":11},{"imageOffset":203388,"symbol":"dispatch_data_create","symbolLocation":184,"imageIndex":18},{"imageOffset":8520860,"symbol":"___NSDataCreateDispatchDataFromData_block_invoke","symbolLocation":152,"imageIndex":23},{"imageOffset":8488056,"symbol":"-[NSData(NSData) enumerateByteRangesUsingBlock:]","symbolLocation":112,"imageIndex":23},{"imageOffset":8495884,"symbol":"_NSDataCreateDispatchDataFromData","symbolLocation":136,"imageIndex":23},{"imageOffset":1466116,"symbol":"URLConnectionLoader::protocolDidLoadData(__CFData const*, long long)","symbolLocation":460,"imageIndex":24},{"imageOffset":1495740,"symbol":"invocation function for block in URLConnectionLoader_Classic::protocolDidLoadData(__CFData const*, long long)","symbolLocation":28,"imageIndex":24},{"imageOffset":1436072,"symbol":"invocation function for block in URLConnectionInstanceData::withWorkQueueAsync(void () block_pointer) const","symbolLocation":28,"imageIndex":24},{"imageOffset":5792,"symbol":"_dispatch_call_block_and_release","symbolLocation":24,"imageIndex":18},{"imageOffset":114328,"symbol":"_dispatch_client_callout","symbolLocation":12,"imageIndex":18},{"imageOffset":42788,"symbol":"_dispatch_lane_serial_drain","symbolLocation":984,"imageIndex":18},{"imageOffset":45544,"symbol":"_dispatch_lane_invoke","symbolLocation":396,"imageIndex":18},{"imageOffset":89792,"symbol":"_dispatch_root_queue_drain_deferred_wlh","symbolLocation":288,"imageIndex":18},{"imageOffset":87560,"symbol":"_dispatch_workloop_worker_thread","symbolLocation":692,"imageIndex":18},{"imageOffset":11304,"symbol":"_pthread_wqthread","symbolLocation":288,"imageIndex":13},{"imageOffset":6696,"symbol":"start_wqthread","symbolLocation":8,"imageIndex":13}]},{"id":597399,"threadState":{"x":[{"value":268451845},{"value":21592279046},{"value":8589934592},{"value":390442591977472},{"value":0},{"value":390442591977472},{"value":2},{"value":4294967295},{"value":0},{"value":17179869184},{"value":0},{"value":2},{"value":0},{"value":0},{"value":90907},{"value":3072},{"value":18446744073709551569},{"value":6442840916,"symbolLocation":0,"symbol":"-[NSObject dealloc]"},{"value":0},{"value":4294967295},{"value":2},{"value":390442591977472},{"value":0},{"value":390442591977472},{"value":21592279046},{"value":6183748888},{"value":8589934592},{"value":18446744073709550527},{"value":4296327168,"symbolLocation":0,"symbol":"_libkernel_string_functions"}],"flavor":"ARM_THREAD_STATE64","lr":{"value":4296121948},"cpsr":{"value":0},"fp":{"value":6183748736},"sp":{"value":6183748656},"esr":{"value":1442840704,"description":"(Syscall)"},"pc":{"value":4296051568},"far":{"value":0}},"queue":"com.apple.NSURLSession-delegate","frames":[{"imageOffset":2928,"symbol":"mach_msg2_trap","symbolLocation":8,"imageIndex":12},{"imageOffset":73308,"symbol":"mach_msg2_internal","symbolLocation":72,"imageIndex":12},{"imageOffset":35908,"symbol":"mach_msg_overwrite","symbolLocation":484,"imageIndex":12},{"imageOffset":3824,"symbol":"mach_msg","symbolLocation":20,"imageIndex":12},{"imageOffset":604096,"symbol":"__CFRunLoopServiceMachPort","symbolLocation":156,"imageIndex":19},{"imageOffset":600440,"symbol":"__CFRunLoopRun","symbolLocation":1128,"imageIndex":19},{"imageOffset":579844,"symbol":"_CFRunLoopRunSpecificWithOptions","symbolLocation":496,"imageIndex":19},{"imageOffset":735708,"symbol":"boundPairRead","symbolLocation":296,"imageIndex":19},{"imageOffset":716768,"symbol":"CFReadStreamRead","symbolLocation":304,"imageIndex":19},{"imageOffset":12264472,"symbol":"-[RCTMultipartStreamReader readAllPartsWithCompletionCallback:progressCallback:]","symbolLocation":1112,"imageIndex":2},{"imageOffset":12260204,"symbol":"-[RCTMultipartDataTask URLSession:streamTask:didBecomeInputStream:outputStream:]","symbolLocation":308,"imageIndex":2},{"imageOffset":69112,"symbol":"__98-[__NSCFURLSessionDelegateWrapper streamTask:didBecomeInputStream:outputStream:completionHandler:]_block_invoke","symbolLocation":32,"imageIndex":24},{"imageOffset":5792,"symbol":"_dispatch_call_block_and_release","symbolLocation":24,"imageIndex":18},{"imageOffset":114328,"symbol":"_dispatch_client_callout","symbolLocation":12,"imageIndex":18},{"imageOffset":42788,"symbol":"_dispatch_lane_serial_drain","symbolLocation":984,"imageIndex":18},{"imageOffset":45544,"symbol":"_dispatch_lane_invoke","symbolLocation":396,"imageIndex":18},{"imageOffset":89792,"symbol":"_dispatch_root_queue_drain_deferred_wlh","symbolLocation":288,"imageIndex":18},{"imageOffset":87560,"symbol":"_dispatch_workloop_worker_thread","symbolLocation":692,"imageIndex":18},{"imageOffset":11304,"symbol":"_pthread_wqthread","symbolLocation":288,"imageIndex":13},{"imageOffset":6696,"symbol":"start_wqthread","symbolLocation":8,"imageIndex":13}]},{"id":597400,"frames":[],"threadState":{"x":[{"value":6184906752},{"value":90131},{"value":6184370176},{"value":0},{"value":409604},{"value":18446744073709551615},{"value":0},{"value":0},{"value":0},{"value":0},{"value":0},{"value":0},{"value":0},{"value":0},{"value":0},{"value":0},{"value":0},{"value":0},{"value":0},{"value":0},{"value":0},{"value":0},{"value":0},{"value":0},{"value":0},{"value":0},{"value":0},{"value":0},{"value":0}],"flavor":"ARM_THREAD_STATE64","lr":{"value":0},"cpsr":{"value":0},"fp":{"value":0},"sp":{"value":6184906752},"esr":{"value":1442840704,"description":"(Syscall)"},"pc":{"value":4300429856},"far":{"value":0}}},{"id":597401,"threadState":{"x":[{"value":4952126907},{"value":4993534565},{"value":868302},{"value":4952195072},{"value":41339461},{"value":5},{"value":0},{"value":0},{"value":8390045994248926069},{"value":8390047166775846248},{"value":6998705293059126304},{"value":2337214414100718692},{"value":8030569546402701422},{"value":7008840644008110438},{"value":2308793137040482676},{"value":2314885530818453536},{"value":4299747504,"symbolLocation":0,"symbol":"_platform_memmove"},{"value":6446253880,"symbolLocation":0,"symbol":"-[__NSArrayM objectAtIndex:]"},{"value":0},{"value":6444250332,"symbolLocation":0,"symbol":"___dispatch_data_flatten_block_invoke"},{"value":6185346024},{"value":177595},{"value":4335442832},{"value":4335442936},{"value":2},{"value":8382783488,"symbolLocation":0,"symbol":"OBJC_IVAR_$___NSURLSessionLocal._proxySession"},{"value":8382783488,"symbolLocation":0,"symbol":"OBJC_IVAR_$___NSURLSessionLocal._proxySession"},{"value":0},{"value":16973826}],"flavor":"ARM_THREAD_STATE64","lr":{"value":6444250360},"cpsr":{"value":536870912},"fp":{"value":6185345936},"sp":{"value":6185345936},"esr":{"value":2449473611,"description":"(Data Abort) byte write Access flag fault"},"pc":{"value":4299747604},"far":{"value":4952195072}},"queue":"com.apple.NSURLSession-work","frames":[{"imageOffset":12564,"symbol":"_platform_memmove","symbolLocation":100,"imageIndex":11},{"imageOffset":206072,"symbol":"___dispatch_data_flatten_block_invoke","symbolLocation":28,"imageIndex":18},{"imageOffset":205108,"symbol":"_dispatch_data_apply","symbolLocation":168,"imageIndex":18},{"imageOffset":204884,"symbol":"_dispatch_data_flatten","symbolLocation":128,"imageIndex":18},{"imageOffset":245512,"symbol":"dispatch_data_create_map","symbolLocation":140,"imageIndex":18},{"imageOffset":1947788,"symbol":"__78-[__NSCFURLLocalStreamTaskFromDataTask _onqueue_ioTickFromDataTaskConversion:]_block_invoke","symbolLocation":192,"imageIndex":24},{"imageOffset":1932244,"symbol":"-[__NSCFURLLocalStreamTask _onqueue_ioTick]","symbolLocation":2932,"imageIndex":24},{"imageOffset":1947580,"symbol":"-[__NSCFURLLocalStreamTaskFromDataTask _onqueue_ioTickFromDataTaskConversion:]","symbolLocation":120,"imageIndex":24},{"imageOffset":5792,"symbol":"_dispatch_call_block_and_release","symbolLocation":24,"imageIndex":18},{"imageOffset":114328,"symbol":"_dispatch_client_callout","symbolLocation":12,"imageIndex":18},{"imageOffset":42788,"symbol":"_dispatch_lane_serial_drain","symbolLocation":984,"imageIndex":18},{"imageOffset":45544,"symbol":"_dispatch_lane_invoke","symbolLocation":396,"imageIndex":18},{"imageOffset":89792,"symbol":"_dispatch_root_queue_drain_deferred_wlh","symbolLocation":288,"imageIndex":18},{"imageOffset":87560,"symbol":"_dispatch_workloop_worker_thread","symbolLocation":692,"imageIndex":18},{"imageOffset":11304,"symbol":"_pthread_wqthread","symbolLocation":288,"imageIndex":13},{"imageOffset":6696,"symbol":"start_wqthread","symbolLocation":8,"imageIndex":13}]},{"id":597402,"frames":[],"threadState":{"x":[{"value":6186053632},{"value":56615},{"value":6185517056},{"value":0},{"value":409604},{"value":18446744073709551615},{"value":0},{"value":0},{"value":0},{"value":0},{"value":0},{"value":0},{"value":0},{"value":0},{"value":0},{"value":0},{"value":0},{"value":0},{"value":0},{"value":0},{"value":0},{"value":0},{"value":0},{"value":0},{"value":0},{"value":0},{"value":0},{"value":0},{"value":0}],"flavor":"ARM_THREAD_STATE64","lr":{"value":0},"cpsr":{"value":0},"fp":{"value":0},"sp":{"value":6186053632},"esr":{"value":1442840704,"description":"(Syscall)"},"pc":{"value":4300429856},"far":{"value":0}}},{"id":597403,"frames":[],"threadState":{"x":[{"value":6186627072},{"value":0},{"value":6186090496},{"value":0},{"value":278532},{"value":18446744073709551615},{"value":0},{"value":0},{"value":0},{"value":0},{"value":0},{"value":0},{"value":0},{"value":0},{"value":0},{"value":0},{"value":0},{"value":0},{"value":0},{"value":0},{"value":0},{"value":0},{"value":0},{"value":0},{"value":0},{"value":0},{"value":0},{"value":0},{"value":0}],"flavor":"ARM_THREAD_STATE64","lr":{"value":0},"cpsr":{"value":0},"fp":{"value":0},"sp":{"value":6186627072},"esr":{"value":0},"pc":{"value":4300429856},"far":{"value":0}}}],
  "usedImages" : [
  {
    "source" : "P",
    "arch" : "arm64",
    "base" : 4295114752,
    "CFBundleShortVersionString" : "1.1.0",
    "CFBundleIdentifier" : "com.ismail.motocortexv2",
    "size" : 16384,
    "uuid" : "f4cc10dd-9f97-363b-b4a0-a00392681e22",
    "path" : "\/Users\/USER\/Library\/Developer\/CoreSimulator\/Devices\/D90D7F2D-2DF3-4611-8356-BDEDCC12E373\/data\/Containers\/Bundle\/Application\/B96FADAA-9DF9-499D-836B-3A35BD3BAE61\/MotoCortex.app\/MotoCortex",
    "name" : "MotoCortex",
    "CFBundleVersion" : "41"
  },
  {
    "source" : "P",
    "arch" : "arm64",
    "base" : 4297883648,
    "size" : 327680,
    "uuid" : "ba544d9a-46ab-3c59-a00f-aba1479d2079",
    "path" : "\/Volumes\/VOLUME\/*\/dyld_sim",
    "name" : "dyld_sim"
  },
  {
    "source" : "P",
    "arch" : "arm64",
    "base" : 4367908864,
    "size" : 27607040,
    "uuid" : "8012d4dd-7c45-3a2f-b711-1d05bed48eaa",
    "path" : "\/Users\/USER\/Library\/Developer\/CoreSimulator\/Devices\/D90D7F2D-2DF3-4611-8356-BDEDCC12E373\/data\/Containers\/Bundle\/Application\/B96FADAA-9DF9-499D-836B-3A35BD3BAE61\/MotoCortex.app\/MotoCortex.debug.dylib",
    "name" : "MotoCortex.debug.dylib"
  },
  {
    "source" : "P",
    "arch" : "arm64",
    "base" : 4298653696,
    "CFBundleIdentifier" : "io.vlcn.crsqlite",
    "size" : 589824,
    "uuid" : "01bd5c62-4036-30bd-94be-6a5b43f03062",
    "path" : "\/Users\/USER\/Library\/Developer\/CoreSimulator\/Devices\/D90D7F2D-2DF3-4611-8356-BDEDCC12E373\/data\/Containers\/Bundle\/Application\/B96FADAA-9DF9-499D-836B-3A35BD3BAE61\/MotoCortex.app\/Frameworks\/crsqlite.framework\/crsqlite",
    "name" : "crsqlite"
  },
  {
    "source" : "P",
    "arch" : "arm64",
    "base" : 4306337792,
    "CFBundleShortVersionString" : "0.12.0",
    "CFBundleIdentifier" : "dev.hermesengine.iphonesimulator",
    "size" : 3604480,
    "uuid" : "15c2519b-0ac7-3032-b055-957892e423e1",
    "path" : "\/Users\/USER\/Library\/Developer\/CoreSimulator\/Devices\/D90D7F2D-2DF3-4611-8356-BDEDCC12E373\/data\/Containers\/Bundle\/Application\/B96FADAA-9DF9-499D-836B-3A35BD3BAE61\/MotoCortex.app\/Frameworks\/hermes.framework\/hermes",
    "name" : "hermes",
    "CFBundleVersion" : "0.12.0"
  },
  {
    "source" : "P",
    "arch" : "arm64",
    "base" : 4295278592,
    "CFBundleShortVersionString" : "1.0",
    "CFBundleIdentifier" : "com.apple.ap.AdServices",
    "size" : 16384,
    "uuid" : "c2debbc1-6233-343e-a73e-300e4d0d0a0e",
    "path" : "\/Volumes\/VOLUME\/*\/AdServices.framework\/AdServices",
    "name" : "AdServices",
    "CFBundleVersion" : "1"
  },
  {
    "source" : "P",
    "arch" : "arm64",
    "base" : 4295704576,
    "CFBundleShortVersionString" : "1.0",
    "CFBundleIdentifier" : "com.apple.MetricKit",
    "size" : 131072,
    "uuid" : "bab62ede-1a12-3fe6-b4fd-8476487573d7",
    "path" : "\/Volumes\/VOLUME\/*\/MetricKit.framework\/MetricKit",
    "name" : "MetricKit",
    "CFBundleVersion" : "1"
  },
  {
    "source" : "P",
    "arch" : "arm64",
    "base" : 4312940544,
    "CFBundleShortVersionString" : "1.0",
    "CFBundleIdentifier" : "com.apple.StoreKit.SwiftUI",
    "size" : 2473984,
    "uuid" : "5400b057-b7fc-35f2-addd-38399a1bf545",
    "path" : "\/Volumes\/VOLUME\/*\/_StoreKit_SwiftUI.framework\/_StoreKit_SwiftUI",
    "name" : "_StoreKit_SwiftUI",
    "CFBundleVersion" : "1"
  },
  {
    "source" : "P",
    "arch" : "arm64",
    "base" : 4295360512,
    "size" : 16384,
    "uuid" : "3119af59-1eaa-3731-a7cb-c21c556b63c0",
    "path" : "\/Volumes\/VOLUME\/*\/libswiftDataDetection.dylib",
    "name" : "libswiftDataDetection.dylib"
  },
  {
    "source" : "P",
    "arch" : "arm64",
    "base" : 4295442432,
    "size" : 16384,
    "uuid" : "710be927-bac3-3b9e-b7ce-dbe0c5e8e2a5",
    "path" : "\/Volumes\/VOLUME\/*\/libswiftUIKit.dylib",
    "name" : "libswiftUIKit.dylib"
  },
  {
    "source" : "P",
    "arch" : "arm64",
    "base" : 4295491584,
    "size" : 16384,
    "uuid" : "8c7e08c0-69a9-3be9-8f41-60c74fba8e5c",
    "path" : "\/Volumes\/VOLUME\/*\/libswiftFileProvider.dylib",
    "name" : "libswiftFileProvider.dylib"
  },
  {
    "source" : "P",
    "arch" : "arm64",
    "base" : 4299735040,
    "size" : 49152,
    "uuid" : "0831b8d2-190f-31fc-9eb6-ea8ba11fe47b",
    "path" : "\/usr\/lib\/system\/libsystem_platform.dylib",
    "name" : "libsystem_platform.dylib"
  },
  {
    "source" : "P",
    "arch" : "arm64",
    "base" : 4296048640,
    "size" : 245760,
    "uuid" : "2144ef57-8439-3be2-88a3-7d67766bcb03",
    "path" : "\/usr\/lib\/system\/libsystem_kernel.dylib",
    "name" : "libsystem_kernel.dylib"
  },
  {
    "source" : "P",
    "arch" : "arm64",
    "base" : 4300423168,
    "size" : 65536,
    "uuid" : "1e522024-387b-3d18-81ca-f4559198954b",
    "path" : "\/usr\/lib\/system\/libsystem_pthread.dylib",
    "name" : "libsystem_pthread.dylib"
  },
  {
    "source" : "P",
    "arch" : "arm64",
    "base" : 4301504512,
    "size" : 49152,
    "uuid" : "75fa6778-178f-394f-9c63-711780430596",
    "path" : "\/Volumes\/VOLUME\/*\/libobjc-trampolines.dylib",
    "name" : "libobjc-trampolines.dylib"
  },
  {
    "source" : "P",
    "arch" : "arm64",
    "base" : 4671455232,
    "CFBundleShortVersionString" : "1.0",
    "CFBundleIdentifier" : "com.apple.AutoFillUI",
    "size" : 245760,
    "uuid" : "0155fed7-c13b-3bcb-aa74-bc433cfb14e0",
    "path" : "\/Volumes\/VOLUME\/*\/AutoFillUI.framework\/AutoFillUI",
    "name" : "AutoFillUI",
    "CFBundleVersion" : "1"
  },
  {
    "source" : "P",
    "arch" : "arm64e",
    "base" : 4296572928,
    "size" : 688128,
    "uuid" : "f924bdd3-4365-3466-9580-8b1b3fa8f857",
    "path" : "\/usr\/lib\/dyld",
    "name" : "dyld"
  },
  {
    "source" : "P",
    "arch" : "arm64",
    "base" : 6443532288,
    "size" : 508600,
    "uuid" : "05f4b01b-e685-39fa-93f3-de10cd9b511a",
    "path" : "\/Volumes\/VOLUME\/*\/libsystem_c.dylib",
    "name" : "libsystem_c.dylib"
  },
  {
    "source" : "P",
    "arch" : "arm64",
    "base" : 6444044288,
    "size" : 283584,
    "uuid" : "42b50931-38d5-3a5d-90ef-0fd7239c408d",
    "path" : "\/Volumes\/VOLUME\/*\/libdispatch.dylib",
    "name" : "libdispatch.dylib"
  },
  {
    "source" : "P",
    "arch" : "arm64",
    "base" : 6446182400,
    "CFBundleShortVersionString" : "6.9",
    "CFBundleIdentifier" : "com.apple.CoreFoundation",
    "size" : 4396288,
    "uuid" : "e74d7b62-0aac-3013-a55b-f15135d4bd2e",
    "path" : "\/Volumes\/VOLUME\/*\/CoreFoundation.framework\/CoreFoundation",
    "name" : "CoreFoundation",
    "CFBundleVersion" : "5026.5.4"
  },
  {
    "source" : "P",
    "arch" : "arm64",
    "base" : 6764720128,
    "CFBundleShortVersionString" : "1.0",
    "CFBundleIdentifier" : "com.apple.GraphicsServices",
    "size" : 32160,
    "uuid" : "95c64786-b053-33db-914f-5fa4b6cb8122",
    "path" : "\/Volumes\/VOLUME\/*\/GraphicsServices.framework\/GraphicsServices",
    "name" : "GraphicsServices",
    "CFBundleVersion" : "1.0"
  },
  {
    "source" : "P",
    "arch" : "arm64",
    "base" : 6528995328,
    "CFBundleShortVersionString" : "1.0",
    "CFBundleIdentifier" : "com.apple.UIKitCore",
    "size" : 36620096,
    "uuid" : "12463677-be34-38f7-9e11-3421bbf362fc",
    "path" : "\/Volumes\/VOLUME\/*\/UIKitCore.framework\/UIKitCore",
    "name" : "UIKitCore",
    "CFBundleVersion" : "9126.5.5.2.103"
  },
  {
    "size" : 0,
    "source" : "A",
    "base" : 0,
    "uuid" : "00000000-0000-0000-0000-000000000000"
  },
  {
    "source" : "P",
    "arch" : "arm64",
    "base" : 6451101696,
    "CFBundleShortVersionString" : "6.9",
    "CFBundleIdentifier" : "com.apple.Foundation",
    "size" : 14388704,
    "uuid" : "2cc9fce0-08f9-3a0d-8a2f-6db229462de5",
    "path" : "\/Volumes\/VOLUME\/*\/Foundation.framework\/Foundation",
    "name" : "Foundation",
    "CFBundleVersion" : "5026.5.4"
  },
  {
    "source" : "P",
    "arch" : "arm64",
    "base" : 6523940864,
    "CFBundleShortVersionString" : "1.0",
    "CFBundleIdentifier" : "com.apple.CFNetwork",
    "size" : 3619712,
    "uuid" : "799e3578-e022-31f3-86af-938cea488909",
    "path" : "\/Volumes\/VOLUME\/*\/CFNetwork.framework\/CFNetwork",
    "name" : "CFNetwork",
    "CFBundleVersion" : "3860.600.12"
  },
  {
    "source" : "P",
    "arch" : "arm64",
    "base" : 6442680320,
    "size" : 248132,
    "uuid" : "727c4040-5e6d-3dae-b22c-9a337d46c34f",
    "path" : "\/Volumes\/VOLUME\/*\/libobjc.A.dylib",
    "name" : "libobjc.A.dylib"
  },
  {
    "source" : "P",
    "arch" : "arm64",
    "base" : 6445465600,
    "size" : 561312,
    "uuid" : "fd646c4c-99c5-3828-8199-3a66a48ff1a1",
    "path" : "\/Volumes\/VOLUME\/*\/libc++.1.dylib",
    "name" : "libc++.1.dylib"
  },
  {
    "source" : "P",
    "arch" : "arm64",
    "base" : 6443520000,
    "size" : 11689,
    "uuid" : "a5fdf1ff-b793-3574-8903-d24571eacd25",
    "path" : "\/Volumes\/VOLUME\/*\/libsystem_blocks.dylib",
    "name" : "libsystem_blocks.dylib"
  }
],
  "sharedCache" : {
  "base" : 6442450944,
  "size" : 3385917440,
  "uuid" : "1a6ee8cf-7c8b-3a7a-9245-80c8c3e83e01"
},
  "vmSummary" : "ReadOnly portion of Libraries: Total=1.9G resident=0K(0%) swapped_out_or_unallocated=1.9G(100%)\nWritable regions: Total=366.6M written=2131K(1%) resident=1827K(0%) swapped_out=304K(0%) unallocated=364.5M(99%)\n\n                                VIRTUAL   REGION \nREGION TYPE                        SIZE    COUNT (non-coalesced) \n===========                     =======  ======= \nActivity Tracing                   256K        1 \nCG raster data                    1600K       30 \nCoreAnimation                     1856K       40 \nFoundation                        1840K        2 \nIOSurface                         4096K        1 \nKernel Alloc Once                   32K        1 \nMALLOC                           268.7M       74 \nMALLOC guard page                 3712K        4 \nMach message                        16K        1 \nSQLite page cache                 2304K       18 \nSTACK GUARD                       56.4M       24 \nStack                             21.7M       25 \nVM_ALLOCATE                       64.7M       56 \n__AUTH_CONST                        32K        1 \n__DATA                            53.9M      885 \n__DATA_CONST                     115.2M      912 \n__DATA_DIRTY                       155K       14 \n__FONT_DATA                        2352        1 \n__LINKEDIT                       751.0M       18 \n__OBJC_RO                         55.6M        1 \n__OBJC_RW                         2332K        1 \n__TEXT                             1.1G      927 \n__TPRO_CONST                       164K        3 \ndyld private memory                3.0G       18 \nmapped file                      306.9M       28 \npage table in kernel              1827K        1 \nshared memory                       16K        1 \n===========                     =======  ======= \nTOTAL                              5.8G     3088 \n",
  "legacyInfo" : {
  "threadTriggered" : {
    "queue" : "com.apple.main-thread"
  }
},
  "logWritingSignature" : "32096a7890fb916fc8883558f53c1be416db9d5b",
  "roots_installed" : 0,
  "bug_type" : "309",
  "trmStatus" : 8192,
  "trialInfo" : {
  "rollouts" : [
    {
      "rolloutId" : "5ffde50ce2aacd000d47a95f",
      "factorPackIds" : [

      ],
      "deploymentId" : 240000553
    },
    {
      "rolloutId" : "695fd05d8ca5554688521e5e",
      "factorPackIds" : [
        "695fd08781fcd20ded79c1d3",
        "695fd0d28ca5554688521e5f",
        "695fd09c8774dc09015a80e9",
        "695fd0b18774dc09015a80ea"
      ],
      "deploymentId" : 3
    }
  ],
  "experiments" : [

  ]
}
}

Model: Mac16,10, BootROM 18000.121.3, proc 10:4:6:0 processors, 16 GB, SMC 
Graphics: Apple M4, Apple M4, Built-In
Display: CBA242Y, 1920 x 1080 (1080p FHD - Full High Definition), Main, MirrorOff, Online
Memory Module: LPDDR5, Micron
AirPort: spairport_wireless_card_type_wifi (0x14E4, 0x4388), wl0: Feb  2 2026 19:39:59 version 23.50.20.0.41.51.208 FWID 01-010dcc74
IO80211_driverkit-1561.3 "IO80211_driverkit-1561.3" Apr 18 2026 17:42:26
AirPort: 
Bluetooth: Version (null), 0 services, 0 devices, 0 incoming serial ports
Network Service: Wi-Fi, AirPort, en1
Thunderbolt Bus: Mac mini, Apple Inc.
Thunderbolt Bus: Mac mini, Apple Inc.
Thunderbolt Bus: Mac mini, Apple Inc.
