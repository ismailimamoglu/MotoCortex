-------------------------------------
Translated Report (Full Report Below)
-------------------------------------
Process:             MotoCortex [3564]
Path:                /Users/USER/Library/Developer/CoreSimulator/Devices/D90D7F2D-2DF3-4611-8356-BDEDCC12E373/data/Containers/Bundle/Application/A35321C8-ED14-4756-A028-000C4006D4E2/MotoCortex.app/MotoCortex
Identifier:          com.ismail.motocortexv2
Version:             1.2.0 (53)
Code Type:           ARM-64 (Native)
Role:                Foreground
Parent Process:      launchd_sim [2981]
Coalition:           com.apple.CoreSimulator.SimDevice.D90D7F2D-2DF3-4611-8356-BDEDCC12E373 [1553]
Responsible Process: SimulatorTrampoline [2783]
User ID:             501

Date/Time:           2026-09-03 21:24:31.3585 +0300
Launch Time:         2026-09-03 09:18:41.5454 +0300
Hardware Model:      Mac16,10
OS Version:          macOS 26.6.2 (25G83)
Release Type:        User

Crash Reporter Key:  3D338F32-AE74-8406-89A9-2E77384557C6
Incident Identifier: 02539125-A4E3-4788-A2C2-B8F7734F9FA9

Time Awake Since Boot: 44000 seconds

System Integrity Protection: enabled

Triggered by Thread: 9  com.facebook.react.JavaScript

Exception Type:    EXC_BAD_ACCESS (SIGSEGV)
Exception Subtype: KERN_INVALID_ADDRESS at 0x0000000000000000
Exception Codes:   0x0000000000000001, 0x0000000000000000

Termination Reason:  Namespace SIGNAL, Code 11, Segmentation fault: 11
Terminating Process: exc handler [3564]


VM Region Info: 0 is not in any region.  Bytes before following region: 4365533184
      REGION TYPE                    START - END         [ VSIZE] PRT/MAX SHRMOD  REGION DETAIL
      UNUSED SPACE AT START
--->  
      __TEXT                      10434c000-104350000    [   16K] r-x/r-x SM=COW  /Users/USER/Library/Developer/CoreSimulator/Devices/D90D7F2D-2DF3-4611-8356-BDEDCC12E373/data/Containers/Bundle/Application/A35321C8-ED14-4756-A028-000C4006D4E2/MotoCortex.app/MotoCortex

Thread 0::  Dispatch queue: com.apple.main-thread
0   libsystem_kernel.dylib        	       0x10469cb70 mach_msg2_trap + 8
1   libsystem_kernel.dylib        	       0x1046ade84 mach_msg2_internal + 72
2   libsystem_kernel.dylib        	       0x1046a4c44 mach_msg_overwrite + 484
3   libsystem_kernel.dylib        	       0x10469cef0 mach_msg + 20
4   CoreFoundation                	       0x1804227c0 __CFRunLoopServiceMachPort + 156
5   CoreFoundation                	       0x180421978 __CFRunLoopRun + 1128
6   CoreFoundation                	       0x18041c904 _CFRunLoopRunSpecificWithOptions + 496
7   GraphicsServices              	       0x1933599c0 GSEventRunModal + 116
8   UIKitCore                     	       0x1864a54cc -[UIApplication _run] + 776
9   UIKitCore                     	       0x186b9f910 UIApplicationMain + 120
10  MotoCortex.debug.dylib        	       0x10891f458 __debug_main_executable_dylib_entry_point + 96 (main.m:7)
11  dyld_sim                      	       0x1045eb0e4 start_sim + 20
12  dyld                          	       0x10440c4e4 start + 6992

Thread 1:: com.apple.uikit.eventfetch-thread
0   libsystem_kernel.dylib        	       0x10469cb70 mach_msg2_trap + 8
1   libsystem_kernel.dylib        	       0x1046ade84 mach_msg2_internal + 72
2   libsystem_kernel.dylib        	       0x1046a4c44 mach_msg_overwrite + 484
3   libsystem_kernel.dylib        	       0x10469cef0 mach_msg + 20
4   CoreFoundation                	       0x1804227c0 __CFRunLoopServiceMachPort + 156
5   CoreFoundation                	       0x180421978 __CFRunLoopRun + 1128
6   CoreFoundation                	       0x18041c904 _CFRunLoopRunSpecificWithOptions + 496
7   Foundation                    	       0x18112fa4c -[NSRunLoop(NSRunLoop) runMode:beforeDate:] + 208
8   Foundation                    	       0x18112fc68 -[NSRunLoop(NSRunLoop) runUntilDate:] + 60
9   UIKitCore                     	       0x1861d7ad4 -[UIEventFetcher threadMain] + 404
10  Foundation                    	       0x181154edc __NSThread__start__ + 716
11  libsystem_pthread.dylib       	       0x10459e63c _pthread_start + 104
12  libsystem_pthread.dylib       	       0x104599a34 thread_start + 8

Thread 2:: com.google.firebase.crashlytics.MachExceptionServer
0   libsystem_kernel.dylib        	       0x1046a02f8 write + 8
1   MotoCortex.debug.dylib        	       0x108ebb0b8 FIRCLSSDKFileLog + 784 (FIRCLSInternalLogging.c:86)
2   MotoCortex.debug.dylib        	       0x108ebdf48 FIRCLSMachExceptionReply + 320 (FIRCLSMachException.c:295)
3   MotoCortex.debug.dylib        	       0x108ebd864 FIRCLSMachExceptionServer + 100 (FIRCLSMachException.c:181)
4   libsystem_pthread.dylib       	       0x10459e63c _pthread_start + 104
5   libsystem_pthread.dylib       	       0x104599a34 thread_start + 8

Thread 3:: com.facebook.SocketRocket.NetworkThread
0   libsystem_kernel.dylib        	       0x10469cb70 mach_msg2_trap + 8
1   libsystem_kernel.dylib        	       0x1046ade84 mach_msg2_internal + 72
2   libsystem_kernel.dylib        	       0x1046a4c44 mach_msg_overwrite + 484
3   libsystem_kernel.dylib        	       0x10469cef0 mach_msg + 20
4   CoreFoundation                	       0x1804227c0 __CFRunLoopServiceMachPort + 156
5   CoreFoundation                	       0x180421978 __CFRunLoopRun + 1128
6   CoreFoundation                	       0x18041c904 _CFRunLoopRunSpecificWithOptions + 496
7   Foundation                    	       0x18112fa4c -[NSRunLoop(NSRunLoop) runMode:beforeDate:] + 208
8   MotoCortex.debug.dylib        	       0x109e7aeb0 -[SRRunLoopThread main] + 268 (SRRunLoopThread.m:71)
9   Foundation                    	       0x181154edc __NSThread__start__ + 716
10  libsystem_pthread.dylib       	       0x10459e63c _pthread_start + 104
11  libsystem_pthread.dylib       	       0x104599a34 thread_start + 8

Thread 4:: com.apple.NSURLConnectionLoader
0   libsystem_kernel.dylib        	       0x10469cb70 mach_msg2_trap + 8
1   libsystem_kernel.dylib        	       0x1046ade84 mach_msg2_internal + 72
2   libsystem_kernel.dylib        	       0x1046a4c44 mach_msg_overwrite + 484
3   libsystem_kernel.dylib        	       0x10469cef0 mach_msg + 20
4   CoreFoundation                	       0x1804227c0 __CFRunLoopServiceMachPort + 156
5   CoreFoundation                	       0x180421978 __CFRunLoopRun + 1128
6   CoreFoundation                	       0x18041c904 _CFRunLoopRunSpecificWithOptions + 496
7   CFNetwork                     	       0x184fb8020 +[__CFN_CoreSchedulingSetRunnable _run:] + 368
8   Foundation                    	       0x181154edc __NSThread__start__ + 716
9   libsystem_pthread.dylib       	       0x10459e63c _pthread_start + 104
10  libsystem_pthread.dylib       	       0x104599a34 thread_start + 8

Thread 5:: com.apple.CFSocket.private
0   libsystem_kernel.dylib        	       0x1046a6fb4 __select + 8
1   CoreFoundation                	       0x180430b8c __CFSocketManager + 680
2   libsystem_pthread.dylib       	       0x10459e63c _pthread_start + 104
3   libsystem_pthread.dylib       	       0x104599a34 thread_start + 8

Thread 6:: com.apple.CFNetwork.CustomProtocols
0   libsystem_kernel.dylib        	       0x10469cb70 mach_msg2_trap + 8
1   libsystem_kernel.dylib        	       0x1046ade84 mach_msg2_internal + 72
2   libsystem_kernel.dylib        	       0x1046a4c44 mach_msg_overwrite + 484
3   libsystem_kernel.dylib        	       0x10469cef0 mach_msg + 20
4   CoreFoundation                	       0x1804227c0 __CFRunLoopServiceMachPort + 156
5   CoreFoundation                	       0x180421978 __CFRunLoopRun + 1128
6   CoreFoundation                	       0x18041c904 _CFRunLoopRunSpecificWithOptions + 496
7   CFNetwork                     	       0x184fb8020 +[__CFN_CoreSchedulingSetRunnable _run:] + 368
8   Foundation                    	       0x181154edc __NSThread__start__ + 716
9   libsystem_pthread.dylib       	       0x10459e63c _pthread_start + 104
10  libsystem_pthread.dylib       	       0x104599a34 thread_start + 8

Thread 7:: com.apple.CFStream.LegacyThread
0   libsystem_kernel.dylib        	       0x10469cb70 mach_msg2_trap + 8
1   libsystem_kernel.dylib        	       0x1046ade84 mach_msg2_internal + 72
2   libsystem_kernel.dylib        	       0x1046a4c44 mach_msg_overwrite + 484
3   libsystem_kernel.dylib        	       0x10469cef0 mach_msg + 20
4   CoreFoundation                	       0x1804227c0 __CFRunLoopServiceMachPort + 156
5   CoreFoundation                	       0x180421978 __CFRunLoopRun + 1128
6   CoreFoundation                	       0x18041c904 _CFRunLoopRunSpecificWithOptions + 496
7   CoreFoundation                	       0x1804403a4 _legacyStreamRunLoop_workThread + 260
8   libsystem_pthread.dylib       	       0x10459e63c _pthread_start + 104
9   libsystem_pthread.dylib       	       0x104599a34 thread_start + 8

Thread 8:: com.apple.UIKit.inProcessAnimationManager
0   libsystem_kernel.dylib        	       0x10469caec semaphore_wait_trap + 8
1   libdispatch.dylib             	       0x180187d60 _dispatch_sema4_wait + 24
2   libdispatch.dylib             	       0x1801883c0 _dispatch_semaphore_wait_slow + 128
3   UIKitCore                     	       0x185729634 0x185289000 + 4851252
4   UIKitCore                     	       0x18572d494 0x185289000 + 4867220
5   UIKitCore                     	       0x1853d4730 0x185289000 + 1357616
6   Foundation                    	       0x181154edc __NSThread__start__ + 716
7   libsystem_pthread.dylib       	       0x10459e63c _pthread_start + 104
8   libsystem_pthread.dylib       	       0x104599a34 thread_start + 8

Thread 9 Crashed:: com.facebook.react.JavaScript
0   hermes                        	       0x104f009a4 facebook::hermes::detail::hermesFatalErrorHandler(void*, std::__1::basic_string<char, std::__1::char_traits<char>, std::__1::allocator<char>> const&, bool) + 28
1   hermes                        	       0x105208a98 llvh::report_fatal_error(llvh::Twine const&, bool) + 260
2   hermes                        	       0x105208b64 llvh::report_fatal_error(std::__1::basic_string<char, std::__1::char_traits<char>, std::__1::allocator<char>> const&, bool) + 32
3   hermes                        	       0x1051f2cd4 hermes::hermes_fatal(llvh::StringRef, std::__1::error_code) + 156
4   hermes                        	       0x104fc2154 hermes::vm::GCBase::oom(std::__1::error_code) + 152
5   hermes                        	       0x10509c400 hermes::vm::HadesGC::OldGen::alloc(unsigned int) + 380
6   hermes                        	       0x1050a2630 hermes::vm::HadesGC::EvacAcceptor<false>::acceptHeap(hermes::vm::CompressedPointer, void*) + 92
7   hermes                        	       0x1050a3794 hermes::vm::SlotVisitor<hermes::vm::HadesGC::EvacAcceptor<false>>::visitFields(char*, hermes::vm::Metadata::SlotOffsets const&) + 224
8   hermes                        	       0x10509cff4 void hermes::vm::HadesGC::youngGenEvacuateImpl<hermes::vm::HadesGC::EvacAcceptor<false>>(hermes::vm::HadesGC::EvacAcceptor<false>&, bool) + 296
9   hermes                        	       0x105099788 hermes::vm::HadesGC::youngGenCollection(std::__1::basic_string<char, std::__1::char_traits<char>, std::__1::allocator<char>>, bool) + 780
10  hermes                        	       0x10509c1ec hermes::vm::HadesGC::allocSlow(unsigned int) + 152
11  hermes                        	       0x104fe5374 hermes::vm::JSArray::createNoAllocPropStorage(hermes::vm::Runtime&, hermes::vm::Handle<hermes::vm::JSObject>, hermes::vm::Handle<hermes::vm::HiddenClass>, unsigned int, unsigned int) + 152
12  hermes                        	       0x104fd9578 hermes::vm::CallResult<hermes::vm::HermesValue, (hermes::vm::detail::CallResultSpecialize)2> hermes::vm::Interpreter::interpretFunction<false, false>(hermes::vm::Runtime&, hermes::vm::InterpreterState&) + 16896
13  hermes                        	       0x104fd5344 hermes::vm::Runtime::interpretFunctionImpl(hermes::vm::CodeBlock*) + 132
14  hermes                        	       0x104fbbe84 hermes::vm::JSFunction::_callImpl(hermes::vm::Handle<hermes::vm::Callable>, hermes::vm::Runtime&) + 40
15  hermes                        	       0x104fba124 hermes::vm::Callable::executeCall3(hermes::vm::Handle<hermes::vm::Callable>, hermes::vm::Runtime&, hermes::vm::Handle<hermes::vm::HermesValue>, hermes::vm::HermesValue, hermes::vm::HermesValue, hermes::vm::HermesValue, bool) + 200
16  hermes                        	       0x104ffe258 hermes::vm::JSMapImpl<(hermes::vm::CellKind)47>::forEach(hermes::vm::Handle<hermes::vm::JSMapImpl<(hermes::vm::CellKind)47>>, hermes::vm::Runtime&, hermes::vm::Handle<hermes::vm::Callable>, hermes::vm::Handle<hermes::vm::HermesValue>) + 204
17  hermes                        	       0x10506f604 hermes::vm::setPrototypeForEach(void*, hermes::vm::Runtime&, hermes::vm::NativeArgs) + 252
18  hermes                        	       0x104fbbbb0 hermes::vm::NativeFunction::_nativeCall(hermes::vm::NativeFunction*, hermes::vm::Runtime&) + 144
19  hermes                        	       0x104fd5c80 hermes::vm::CallResult<hermes::vm::HermesValue, (hermes::vm::detail::CallResultSpecialize)2> hermes::vm::Interpreter::interpretFunction<false, false>(hermes::vm::Runtime&, hermes::vm::InterpreterState&) + 2312
20  hermes                        	       0x104fd5344 hermes::vm::Runtime::interpretFunctionImpl(hermes::vm::CodeBlock*) + 132
21  hermes                        	       0x104fbbe84 hermes::vm::JSFunction::_callImpl(hermes::vm::Handle<hermes::vm::Callable>, hermes::vm::Runtime&) + 40
22  hermes                        	       0x104fba81c hermes::vm::Callable::executeCall(hermes::vm::Handle<hermes::vm::Callable>, hermes::vm::Runtime&, hermes::vm::Handle<hermes::vm::HermesValue>, hermes::vm::Handle<hermes::vm::HermesValue>, hermes::vm::Handle<hermes::vm::JSObject>) + 1348
23  hermes                        	       0x10507b04c hermes::vm::functionPrototypeApply(void*, hermes::vm::Runtime&, hermes::vm::NativeArgs) + 320
24  hermes                        	       0x104fbbbb0 hermes::vm::NativeFunction::_nativeCall(hermes::vm::NativeFunction*, hermes::vm::Runtime&) + 144
25  hermes                        	       0x104fd5c80 hermes::vm::CallResult<hermes::vm::HermesValue, (hermes::vm::detail::CallResultSpecialize)2> hermes::vm::Interpreter::interpretFunction<false, false>(hermes::vm::Runtime&, hermes::vm::InterpreterState&) + 2312
26  hermes                        	       0x104fd5344 hermes::vm::Runtime::interpretFunctionImpl(hermes::vm::CodeBlock*) + 132
27  hermes                        	       0x104fbbe84 hermes::vm::JSFunction::_callImpl(hermes::vm::Handle<hermes::vm::Callable>, hermes::vm::Runtime&) + 40
28  hermes                        	       0x104fba81c hermes::vm::Callable::executeCall(hermes::vm::Handle<hermes::vm::Callable>, hermes::vm::Runtime&, hermes::vm::Handle<hermes::vm::HermesValue>, hermes::vm::Handle<hermes::vm::HermesValue>, hermes::vm::Handle<hermes::vm::JSObject>) + 1348
29  hermes                        	       0x10507b04c hermes::vm::functionPrototypeApply(void*, hermes::vm::Runtime&, hermes::vm::NativeArgs) + 320
30  hermes                        	       0x104fbbbb0 hermes::vm::NativeFunction::_nativeCall(hermes::vm::NativeFunction*, hermes::vm::Runtime&) + 144
31  hermes                        	       0x104fd5c80 hermes::vm::CallResult<hermes::vm::HermesValue, (hermes::vm::detail::CallResultSpecialize)2> hermes::vm::Interpreter::interpretFunction<false, false>(hermes::vm::Runtime&, hermes::vm::InterpreterState&) + 2312
32  hermes                        	       0x104fd5344 hermes::vm::Runtime::interpretFunctionImpl(hermes::vm::CodeBlock*) + 132
33  hermes                        	       0x104fbbe84 hermes::vm::JSFunction::_callImpl(hermes::vm::Handle<hermes::vm::Callable>, hermes::vm::Runtime&) + 40
34  hermes                        	       0x104fbb6d4 hermes::vm::BoundFunction::_boundCall(hermes::vm::BoundFunction*, hermes::inst::Inst const*, hermes::vm::Runtime&) + 584
35  hermes                        	       0x104f07860 facebook::hermes::HermesRuntimeImpl::call(facebook::jsi::Function const&, facebook::jsi::Value const&, facebook::jsi::Value const*, unsigned long) + 744
36  MotoCortex.debug.dylib        	       0x1093fe910 facebook::jsi::RuntimeDecorator<facebook::jsi::Runtime, facebook::jsi::Runtime>::call(facebook::jsi::Function const&, facebook::jsi::Value const&, facebook::jsi::Value const*, unsigned long) + 76 (decorator.h:347)
37  MotoCortex.debug.dylib        	       0x10a009078 facebook::jsi::WithRuntimeDecorator<facebook::react::(anonymous namespace)::ReentrancyCheck, facebook::jsi::Runtime, facebook::jsi::Runtime>::call(facebook::jsi::Function const&, facebook::jsi::Value const&, facebook::jsi::Value const*, unsigned long) + 88 (decorator.h:820)
38  MotoCortex.debug.dylib        	       0x108bd9b1c facebook::jsi::Function::call(facebook::jsi::Runtime&, facebook::jsi::Value const*, unsigned long) const + 100 (jsi-inl.h:264)
39  MotoCortex.debug.dylib        	       0x108bd9a6c facebook::jsi::Function::call(facebook::jsi::Runtime&, std::initializer_list<facebook::jsi::Value>) const + 112 (jsi-inl.h:269)
40  MotoCortex.debug.dylib        	       0x109f7eaec facebook::jsi::Value facebook::jsi::Function::call<std::__1::basic_string<char, std::__1::char_traits<char>, std::__1::allocator<char>> const&, std::__1::basic_string<char, std::__1::char_traits<char>, std::__1::allocator<char>> const&, facebook::jsi::Value>(facebook::jsi::Runtime&, std::__1::basic_string<char, std::__1::char_traits<char>, std::__1::allocator<char>> const&, std::__1::basic_string<char, std::__1::char_traits<char>, std::__1::allocator<char>> const&, facebook::jsi::Value&&) const + 228 (jsi-inl.h:277)
41  MotoCortex.debug.dylib        	       0x109f7e998 facebook::react::JSIExecutor::callFunction(std::__1::basic_string<char, std::__1::char_traits<char>, std::__1::allocator<char>> const&, std::__1::basic_string<char, std::__1::char_traits<char>, std::__1::allocator<char>> const&, folly::dynamic const&)::$_0::operator()() const + 140 (JSIExecutor.cpp:240)
42  MotoCortex.debug.dylib        	       0x109f7e900 std::__1::__invoke_result_impl<void, facebook::react::JSIExecutor::callFunction(std::__1::basic_string<char, std::__1::char_traits<char>, std::__1::allocator<char>> const&, std::__1::basic_string<char, std::__1::char_traits<char>, std::__1::allocator<char>> const&, folly::dynamic const&)::$_0&>::type std::__1::__invoke[abi:dee210106]<facebook::react::JSIExecutor::callFunction(std::__1::basic_string<char, std::__1::char_traits<char>, std::__1::allocator<char>> const&, std::__1::basic_string<char, std::__1::char_traits<char>, std::__1::allocator<char>> const&, folly::dynamic const&)::$_0&>(facebook::react::JSIExecutor::callFunction(std::__1::basic_string<char, std::__1::char_traits<char>, std::__1::allocator<char>> const&, std::__1::basic_string<char, std::__1::char_traits<char>, std::__1::allocator<char>> const&, folly::dynamic const&)::$_0&) + 24 (invoke.h:87)
43  MotoCortex.debug.dylib        	       0x109f7e8dc void std::__1::__invoke_void_return_wrapper<void, true>::__call[abi:dee210106]<facebook::react::JSIExecutor::callFunction(std::__1::basic_string<char, std::__1::char_traits<char>, std::__1::allocator<char>> const&, std::__1::basic_string<char, std::__1::char_traits<char>, std::__1::allocator<char>> const&, folly::dynamic const&)::$_0&>(facebook::react::JSIExecutor::callFunction(std::__1::basic_string<char, std::__1::char_traits<char>, std::__1::allocator<char>> const&, std::__1::basic_string<char, std::__1::char_traits<char>, std::__1::allocator<char>> const&, folly::dynamic const&)::$_0&) + 24 (invoke.h:342)
44  MotoCortex.debug.dylib        	       0x109f7e8b8 void std::__1::__invoke_r[abi:dee210106]<void, facebook::react::JSIExecutor::callFunction(std::__1::basic_string<char, std::__1::char_traits<char>, std::__1::allocator<char>> const&, std::__1::basic_string<char, std::__1::char_traits<char>, std::__1::allocator<char>> const&, folly::dynamic const&)::$_0&>(facebook::react::JSIExecutor::callFunction(std::__1::basic_string<char, std::__1::char_traits<char>, std::__1::allocator<char>> const&, std::__1::basic_string<char, std::__1::char_traits<char>, std::__1::allocator<char>> const&, folly::dynamic const&)::$_0&) + 24 (invoke.h:348)
45  MotoCortex.debug.dylib        	       0x109f7e76c std::__1::__function::__func<facebook::react::JSIExecutor::callFunction(std::__1::basic_string<char, std::__1::char_traits<char>, std::__1::allocator<char>> const&, std::__1::basic_string<char, std::__1::char_traits<char>, std::__1::allocator<char>> const&, folly::dynamic const&)::$_0, void ()>::operator()() + 28 (function.h:174)
46  MotoCortex.debug.dylib        	       0x108beeb48 std::__1::__function::__value_func<void ()>::operator()[abi:dee210106]() const + 60 (function.h:274)
47  MotoCortex.debug.dylib        	       0x108beeb00 std::__1::function<void ()>::operator()() const + 24 (function.h:772)
48  MotoCortex.debug.dylib        	       0x1094b476c facebook::react::JSIExecutor::defaultTimeoutInvoker(std::__1::function<void ()> const&, std::__1::function<std::__1::basic_string<char, std::__1::char_traits<char>, std::__1::allocator<char>> ()>) + 28 (JSIExecutor.h:107)
49  MotoCortex.debug.dylib        	       0x1094b4d44 std::__1::__invoke_result_impl<void, void (*&)(std::__1::function<void ()> const&, std::__1::function<std::__1::basic_string<char, std::__1::char_traits<char>, std::__1::allocator<char>> ()>), std::__1::function<void ()> const&, std::__1::function<std::__1::basic_string<char, std::__1::char_traits<char>, std::__1::allocator<char>> ()>>::type std::__1::__invoke[abi:dee210106]<void (*&)(std::__1::function<void ()> const&, std::__1::function<std::__1::basic_string<char, std::__1::char_traits<char>, std::__1::allocator<char>> ()>), std::__1::function<void ()> const&, std::__1::function<std::__1::basic_string<char, std::__1::char_traits<char>, std::__1::allocator<char>> ()>>(void (*&)(std::__1::function<void ()> const&, std::__1::function<std::__1::basic_string<char, std::__1::char_traits<char>, std::__1::allocator<char>> ()>), std::__1::function<void ()> const&, std::__1::function<std::__1::basic_string<char, std::__1::char_traits<char>, std::__1::allocator<char>> ()>&&) + 92 (invoke.h:87)
50  MotoCortex.debug.dylib        	       0x1094b4cdc void std::__1::__invoke_void_return_wrapper<void, true>::__call[abi:dee210106]<void (*&)(std::__1::function<void ()> const&, std::__1::function<std::__1::basic_string<char, std::__1::char_traits<char>, std::__1::allocator<char>> ()>), std::__1::function<void ()> const&, std::__1::function<std::__1::basic_string<char, std::__1::char_traits<char>, std::__1::allocator<char>> ()>>(void (*&)(std::__1::function<void ()> const&, std::__1::function<std::__1::basic_string<char, std::__1::char_traits<char>, std::__1::allocator<char>> ()>), std::__1::function<void ()> const&, std::__1::function<std::__1::basic_string<char, std::__1::char_traits<char>, std::__1::allocator<char>> ()>&&) + 40 (invoke.h:342)
51  MotoCortex.debug.dylib        	       0x1094b4ca8 void std::__1::__invoke_r[abi:dee210106]<void, void (*&)(std::__1::function<void ()> const&, std::__1::function<std::__1::basic_string<char, std::__1::char_traits<char>, std::__1::allocator<char>> ()>), std::__1::function<void ()> const&, std::__1::function<std::__1::basic_string<char, std::__1::char_traits<char>, std::__1::allocator<char>> ()>>(void (*&)(std::__1::function<void ()> const&, std::__1::function<std::__1::basic_string<char, std::__1::char_traits<char>, std::__1::allocator<char>> ()>), std::__1::function<void ()> const&, std::__1::function<std::__1::basic_string<char, std::__1::char_traits<char>, std::__1::allocator<char>> ()>&&) + 40 (invoke.h:348)
52  MotoCortex.debug.dylib        	       0x1094b4b20 std::__1::__function::__func<void (*)(std::__1::function<void ()> const&, std::__1::function<std::__1::basic_string<char, std::__1::char_traits<char>, std::__1::allocator<char>> ()>), void (std::__1::function<void ()> const&, std::__1::function<std::__1::basic_string<char, std::__1::char_traits<char>, std::__1::allocator<char>> ()>)>::operator()(std::__1::function<void ()> const&, std::__1::function<std::__1::basic_string<char, std::__1::char_traits<char>, std::__1::allocator<char>> ()>&&) + 44 (function.h:174)
53  MotoCortex.debug.dylib        	       0x109f7e464 std::__1::__function::__value_func<void (std::__1::function<void ()> const&, std::__1::function<std::__1::basic_string<char, std::__1::char_traits<char>, std::__1::allocator<char>> ()>)>::operator()[abi:dee210106](std::__1::function<void ()> const&, std::__1::function<std::__1::basic_string<char, std::__1::char_traits<char>, std::__1::allocator<char>> ()>&&) const + 76 (function.h:274)
54  MotoCortex.debug.dylib        	       0x109f778e4 std::__1::function<void (std::__1::function<void ()> const&, std::__1::function<std::__1::basic_string<char, std::__1::char_traits<char>, std::__1::allocator<char>> ()>)>::operator()(std::__1::function<void ()> const&, std::__1::function<std::__1::basic_string<char, std::__1::char_traits<char>, std::__1::allocator<char>> ()>) const + 40 (function.h:772)
55  MotoCortex.debug.dylib        	       0x109f77514 facebook::react::JSIExecutor::callFunction(std::__1::basic_string<char, std::__1::char_traits<char>, std::__1::allocator<char>> const&, std::__1::basic_string<char, std::__1::char_traits<char>, std::__1::allocator<char>> const&, folly::dynamic const&) + 316 (JSIExecutor.cpp:238)
56  MotoCortex.debug.dylib        	       0x109eac8b0 facebook::react::NativeToJsBridge::callFunction(std::__1::basic_string<char, std::__1::char_traits<char>, std::__1::allocator<char>>&&, std::__1::basic_string<char, std::__1::char_traits<char>, std::__1::allocator<char>>&&, folly::dynamic&&)::$_0::operator()(facebook::react::JSExecutor*) const + 636 (NativeToJsBridge.cpp:205)
57  MotoCortex.debug.dylib        	       0x109eac628 std::__1::__invoke_result_impl<void, facebook::react::NativeToJsBridge::callFunction(std::__1::basic_string<char, std::__1::char_traits<char>, std::__1::allocator<char>>&&, std::__1::basic_string<char, std::__1::char_traits<char>, std::__1::allocator<char>>&&, folly::dynamic&&)::$_0&, facebook::react::JSExecutor*>::type std::__1::__invoke[abi:dee210106]<facebook::react::NativeToJsBridge::callFunction(std::__1::basic_string<char, std::__1::char_traits<char>, std::__1::allocator<char>>&&, std::__1::basic_string<char, std::__1::char_traits<char>, std::__1::allocator<char>>&&, folly::dynamic&&)::$_0&, facebook::react::JSExecutor*>(facebook::react::NativeToJsBridge::callFunction(std::__1::basic_string<char, std::__1::char_traits<char>, std::__1::allocator<char>>&&, std::__1::basic_string<char, std::__1::char_traits<char>, std::__1::allocator<char>>&&, folly::dynamic&&)::$_0&, facebook::react::JSExecutor*&&) + 36 (invoke.h:87)
58  MotoCortex.debug.dylib        	       0x109eac5f8 void std::__1::__invoke_void_return_wrapper<void, true>::__call[abi:dee210106]<facebook::react::NativeToJsBridge::callFunction(std::__1::basic_string<char, std::__1::char_traits<char>, std::__1::allocator<char>>&&, std::__1::basic_string<char, std::__1::char_traits<char>, std::__1::allocator<char>>&&, folly::dynamic&&)::$_0&, facebook::react::JSExecutor*>(facebook::react::NativeToJsBridge::callFunction(std::__1::basic_string<char, std::__1::char_traits<char>, std::__1::allocator<char>>&&, std::__1::basic_string<char, std::__1::char_traits<char>, std::__1::allocator<char>>&&, folly::dynamic&&)::$_0&, facebook::react::JSExecutor*&&) + 32 (invoke.h:342)
59  MotoCortex.debug.dylib        	       0x109eac5cc void std::__1::__invoke_r[abi:dee210106]<void, facebook::react::NativeToJsBridge::callFunction(std::__1::basic_string<char, std::__1::char_traits<char>, std::__1::allocator<char>>&&, std::__1::basic_string<char, std::__1::char_traits<char>, std::__1::allocator<char>>&&, folly::dynamic&&)::$_0&, facebook::react::JSExecutor*>(facebook::react::NativeToJsBridge::callFunction(std::__1::basic_string<char, std::__1::char_traits<char>, std::__1::allocator<char>>&&, std::__1::basic_string<char, std::__1::char_traits<char>, std::__1::allocator<char>>&&, folly::dynamic&&)::$_0&, facebook::react::JSExecutor*&&) + 32 (invoke.h:348)
60  MotoCortex.debug.dylib        	       0x109eac2c0 std::__1::__function::__func<facebook::react::NativeToJsBridge::callFunction(std::__1::basic_string<char, std::__1::char_traits<char>, std::__1::allocator<char>>&&, std::__1::basic_string<char, std::__1::char_traits<char>, std::__1::allocator<char>>&&, folly::dynamic&&)::$_0, void (facebook::react::JSExecutor*)>::operator()(facebook::react::JSExecutor*&&) + 36 (function.h:174)
61  MotoCortex.debug.dylib        	       0x109eaf1dc std::__1::__function::__value_func<void (facebook::react::JSExecutor*)>::operator()[abi:dee210106](facebook::react::JSExecutor*&&) const + 68 (function.h:274)
62  MotoCortex.debug.dylib        	       0x109eaf174 std::__1::function<void (facebook::react::JSExecutor*)>::operator()(facebook::react::JSExecutor*) const + 36 (function.h:772)
63  MotoCortex.debug.dylib        	       0x109eaf140 facebook::react::NativeToJsBridge::runOnExecutorQueue(std::__1::function<void (facebook::react::JSExecutor*)>&&)::$_0::operator()() const + 92 (NativeToJsBridge.cpp:308)
64  MotoCortex.debug.dylib        	       0x109eaf0d8 std::__1::__invoke_result_impl<void, facebook::react::NativeToJsBridge::runOnExecutorQueue(std::__1::function<void (facebook::react::JSExecutor*)>&&)::$_0&>::type std::__1::__invoke[abi:dee210106]<facebook::react::NativeToJsBridge::runOnExecutorQueue(std::__1::function<void (facebook::react::JSExecutor*)>&&)::$_0&>(facebook::react::NativeToJsBridge::runOnExecutorQueue(std::__1::function<void (facebook::react::JSExecutor*)>&&)::$_0&) + 24 (invoke.h:87)
65  MotoCortex.debug.dylib        	       0x109eaf0b4 void std::__1::__invoke_void_return_wrapper<void, true>::__call[abi:dee210106]<facebook::react::NativeToJsBridge::runOnExecutorQueue(std::__1::function<void (facebook::react::JSExecutor*)>&&)::$_0&>(facebook::react::NativeToJsBridge::runOnExecutorQueue(std::__1::function<void (facebook::react::JSExecutor*)>&&)::$_0&) + 24 (invoke.h:342)
66  MotoCortex.debug.dylib        	       0x109eaf090 void std::__1::__invoke_r[abi:dee210106]<void, facebook::react::NativeToJsBridge::runOnExecutorQueue(std::__1::function<void (facebook::react::JSExecutor*)>&&)::$_0&>(facebook::react::NativeToJsBridge::runOnExecutorQueue(std::__1::function<void (facebook::react::JSExecutor*)>&&)::$_0&) + 24 (invoke.h:348)
67  MotoCortex.debug.dylib        	       0x109eaec2c std::__1::__function::__func<facebook::react::NativeToJsBridge::runOnExecutorQueue(std::__1::function<void (facebook::react::JSExecutor*)>&&)::$_0, void ()>::operator()() + 28 (function.h:174)
68  MotoCortex.debug.dylib        	       0x108beeb48 std::__1::__function::__value_func<void ()>::operator()[abi:dee210106]() const + 60 (function.h:274)
69  MotoCortex.debug.dylib        	       0x108beeb00 std::__1::function<void ()>::operator()() const + 24 (function.h:772)
70  MotoCortex.debug.dylib        	       0x1094c4e5c facebook::react::tryAndReturnError(std::__1::function<void ()> const&) + 24 (RCTCxxUtils.mm:73)
71  MotoCortex.debug.dylib        	       0x1094ee0f8 facebook::react::RCTMessageThread::tryFunc(std::__1::function<void ()> const&) + 36 (RCTMessageThread.mm:68)
72  MotoCortex.debug.dylib        	       0x1094eff38 facebook::react::RCTMessageThread::runOnQueue(std::__1::function<void ()>&&)::$_0::operator()() const + 80 (RCTMessageThread.mm:81)
73  MotoCortex.debug.dylib        	       0x1094efedc std::__1::__invoke_result_impl<void, facebook::react::RCTMessageThread::runOnQueue(std::__1::function<void ()>&&)::$_0&>::type std::__1::__invoke[abi:dee210106]<facebook::react::RCTMessageThread::runOnQueue(std::__1::function<void ()>&&)::$_0&>(facebook::react::RCTMessageThread::runOnQueue(std::__1::function<void ()>&&)::$_0&) + 24 (invoke.h:87)
74  MotoCortex.debug.dylib        	       0x1094efeb8 void std::__1::__invoke_void_return_wrapper<void, true>::__call[abi:dee210106]<facebook::react::RCTMessageThread::runOnQueue(std::__1::function<void ()>&&)::$_0&>(facebook::react::RCTMessageThread::runOnQueue(std::__1::function<void ()>&&)::$_0&) + 24 (invoke.h:342)
75  MotoCortex.debug.dylib        	       0x1094efe94 void std::__1::__invoke_r[abi:dee210106]<void, facebook::react::RCTMessageThread::runOnQueue(std::__1::function<void ()>&&)::$_0&>(facebook::react::RCTMessageThread::runOnQueue(std::__1::function<void ()>&&)::$_0&) + 24 (invoke.h:348)
76  MotoCortex.debug.dylib        	       0x1094efbd0 std::__1::__function::__func<facebook::react::RCTMessageThread::runOnQueue(std::__1::function<void ()>&&)::$_0, void ()>::operator()() + 28 (function.h:174)
77  MotoCortex.debug.dylib        	       0x108beeb48 std::__1::__function::__value_func<void ()>::operator()[abi:dee210106]() const + 60 (function.h:274)
78  MotoCortex.debug.dylib        	       0x108beeb00 std::__1::function<void ()>::operator()() const + 24 (function.h:772)
79  MotoCortex.debug.dylib        	       0x1094ede98 invocation function for block in facebook::react::RCTMessageThread::runAsync(std::__1::function<void ()>) + 48 (RCTMessageThread.mm:44)
80  CoreFoundation                	       0x180422d28 __CFRUNLOOP_IS_CALLING_OUT_TO_A_BLOCK__ + 20
81  CoreFoundation                	       0x1804224b4 __CFRunLoopDoBlocks + 340
82  CoreFoundation                	       0x180421df8 __CFRunLoopRun + 2280
83  CoreFoundation                	       0x18041c904 _CFRunLoopRunSpecificWithOptions + 496
84  MotoCortex.debug.dylib        	       0x1094a129c +[RCTCxxBridge runRunLoop] + 772 (RCTCxxBridge.mm:350)
85  Foundation                    	       0x181154edc __NSThread__start__ + 716
86  libsystem_pthread.dylib       	       0x10459e63c _pthread_start + 104
87  libsystem_pthread.dylib       	       0x104599a34 thread_start + 8

Thread 10:: hades
0   libsystem_kernel.dylib        	       0x1046a002c __psynch_cvwait + 8
1   libsystem_pthread.dylib       	       0x10459eb00 _pthread_cond_wait + 972
2   libc++.1.dylib                	       0x180300604 std::__1::condition_variable::wait(std::__1::unique_lock<std::__1::mutex>&) + 28
3   hermes                        	       0x10509f1a0 hermes::vm::HadesGC::Executor::worker() + 112
4   hermes                        	       0x10509f104 void* std::__1::__thread_proxy[abi:v160006]<std::__1::tuple<std::__1::unique_ptr<std::__1::__thread_struct, std::__1::default_delete<std::__1::__thread_struct>>, hermes::vm::HadesGC::Executor::Executor()::'lambda'()>>(void*) + 44
5   libsystem_pthread.dylib       	       0x10459e63c _pthread_start + 104
6   libsystem_pthread.dylib       	       0x104599a34 thread_start + 8

Thread 11:: hades
0   libsystem_kernel.dylib        	       0x1046a002c __psynch_cvwait + 8
1   libsystem_pthread.dylib       	       0x10459eb00 _pthread_cond_wait + 972
2   libc++.1.dylib                	       0x180300604 std::__1::condition_variable::wait(std::__1::unique_lock<std::__1::mutex>&) + 28
3   hermes                        	       0x10509f1a0 hermes::vm::HadesGC::Executor::worker() + 112
4   hermes                        	       0x10509f104 void* std::__1::__thread_proxy[abi:v160006]<std::__1::tuple<std::__1::unique_ptr<std::__1::__thread_struct, std::__1::default_delete<std::__1::__thread_struct>>, hermes::vm::HadesGC::Executor::Executor()::'lambda'()>>(void*) + 44
5   libsystem_pthread.dylib       	       0x10459e63c _pthread_start + 104
6   libsystem_pthread.dylib       	       0x104599a34 thread_start + 8

Thread 12:


Thread 9 crashed with ARM Thread State (64-bit):
    x0: 0x0000000000000000   x1: 0x000000016c5933e0   x2: 0x0000000000000000   x3: 0x00000001119dac52
    x4: 0x0000000008315bb0   x5: 0x0000000000000010   x6: 0x07fa77d300417ac3   x7: 0x0000000000000000
    x8: 0x0000000000000000   x9: 0x000000000000002a  x10: 0x614d203d20656761  x11: 0x7320706165682078
   x12: 0x2078614d203d2065  x13: 0x7a69732070616568  x14: 0x7865207361772065  x15: 0x0029646564656563
   x16: 0x00000001043b70b0  x17: 0xffffffffb00007ff  x18: 0x0000000000000000  x19: 0x000000016c593478
   x20: 0x0000000000000001  x21: 0x0000000000000000  x22: 0x000000010527d8c0  x23: 0x0000000104f00988
   x24: 0x000000010527f93c  x25: 0x0000000000000060  x26: 0x000000010527ef78  x27: 0x0000000000000000
   x28: 0x00000000003e7fe8   fp: 0x000000016c593460   lr: 0x0000000105208a98
    sp: 0x000000016c5933b0   pc: 0x0000000104f009a4 cpsr: 0x80000000
   far: 0x0000000000000000  esr: 0x92000046 (Data Abort) byte write Translation fault

Binary Images:
       0x10434c000 -        0x10434ffff com.ismail.motocortexv2 (1.2.0) <f4cc10dd-9f97-363b-b4a0-a00392681e22> /Users/USER/Library/Developer/CoreSimulator/Devices/D90D7F2D-2DF3-4611-8356-BDEDCC12E373/data/Containers/Bundle/Application/A35321C8-ED14-4756-A028-000C4006D4E2/MotoCortex.app/MotoCortex
       0x1045e0000 -        0x10462ffff dyld_sim (*) <ba544d9a-46ab-3c59-a00f-aba1479d2079> /Volumes/VOLUME/*/dyld_sim
       0x10891c000 -        0x10a3b7fff MotoCortex.debug.dylib (*) <abe639d9-2540-3fb5-9ccc-9af8bb4743aa> /Users/USER/Library/Developer/CoreSimulator/Devices/D90D7F2D-2DF3-4611-8356-BDEDCC12E373/data/Containers/Bundle/Application/A35321C8-ED14-4756-A028-000C4006D4E2/MotoCortex.app/MotoCortex.debug.dylib
       0x1047a8000 -        0x104837fff io.vlcn.crsqlite (*) <01bd5c62-4036-30bd-94be-6a5b43f03062> /Users/USER/Library/Developer/CoreSimulator/Devices/D90D7F2D-2DF3-4611-8356-BDEDCC12E373/data/Containers/Bundle/Application/A35321C8-ED14-4756-A028-000C4006D4E2/MotoCortex.app/Frameworks/crsqlite.framework/crsqlite
       0x104efc000 -        0x10526bfff dev.hermesengine.iphonesimulator (0.12.0) <15c2519b-0ac7-3032-b055-957892e423e1> /Users/USER/Library/Developer/CoreSimulator/Devices/D90D7F2D-2DF3-4611-8356-BDEDCC12E373/data/Containers/Bundle/Application/A35321C8-ED14-4756-A028-000C4006D4E2/MotoCortex.app/Frameworks/hermes.framework/hermes
       0x104374000 -        0x104377fff com.apple.ap.AdServices (1.0) <c2debbc1-6233-343e-a73e-300e4d0d0a0e> /Volumes/VOLUME/*/AdServices.framework/AdServices
       0x104544000 -        0x104563fff com.apple.MetricKit (1.0) <bab62ede-1a12-3fe6-b4fd-8476487573d7> /Volumes/VOLUME/*/MetricKit.framework/MetricKit
       0x105548000 -        0x1057a3fff com.apple.StoreKit.SwiftUI (1.0) <5400b057-b7fc-35f2-addd-38399a1bf545> /Volumes/VOLUME/*/_StoreKit_SwiftUI.framework/_StoreKit_SwiftUI
       0x104388000 -        0x10438bfff libswiftDataDetection.dylib (*) <3119af59-1eaa-3731-a7cb-c21c556b63c0> /Volumes/VOLUME/*/libswiftDataDetection.dylib
       0x10439c000 -        0x10439ffff libswiftUIKit.dylib (*) <710be927-bac3-3b9e-b7ce-dbe0c5e8e2a5> /Volumes/VOLUME/*/libswiftUIKit.dylib
       0x1043a8000 -        0x1043abfff libswiftFileProvider.dylib (*) <8c7e08c0-69a9-3be9-8f41-60c74fba8e5c> /Volumes/VOLUME/*/libswiftFileProvider.dylib
       0x1043b4000 -        0x1043bffff libsystem_platform.dylib (*) <7e129155-1748-370c-8edc-d762067a6d9f> /usr/lib/system/libsystem_platform.dylib
       0x10469c000 -        0x1046d7fff libsystem_kernel.dylib (*) <26cfe427-c180-3145-8d46-de3129b1cd2a> /usr/lib/system/libsystem_kernel.dylib
       0x104598000 -        0x1045a7fff libsystem_pthread.dylib (*) <85a501d2-0b0e-3dea-b121-b24119d80cfe> /usr/lib/system/libsystem_pthread.dylib
       0x104974000 -        0x10497ffff libobjc-trampolines.dylib (*) <75fa6778-178f-394f-9c63-711780430596> /Volumes/VOLUME/*/libobjc-trampolines.dylib
       0x111490000 -        0x1114cbfff com.apple.AutoFillUI (1.0) <0155fed7-c13b-3bcb-aa74-bc433cfb14e0> /Volumes/VOLUME/*/AutoFillUI.framework/AutoFillUI
       0x1043ec000 -        0x10449ffff dyld (*) <74e52480-c2bd-3c8d-812d-95fe2b74a096> /usr/lib/dyld
       0x18038f000 -        0x1807c04ff com.apple.CoreFoundation (6.9) <e74d7b62-0aac-3013-a55b-f15135d4bd2e> /Volumes/VOLUME/*/CoreFoundation.framework/CoreFoundation
       0x193357000 -        0x19335ed9f com.apple.GraphicsServices (1.0) <95c64786-b053-33db-914f-5fa4b6cb8122> /Volumes/VOLUME/*/GraphicsServices.framework/GraphicsServices
       0x185289000 -        0x18757573f com.apple.UIKitCore (1.0) <12463677-be34-38f7-9e11-3421bbf362fc> /Volumes/VOLUME/*/UIKitCore.framework/UIKitCore
               0x0 - 0xffffffffffffffff ??? (*) <00000000-0000-0000-0000-000000000000> ???
       0x180840000 -        0x1815f8ddf com.apple.Foundation (6.9) <2cc9fce0-08f9-3a0d-8a2f-6db229462de5> /Volumes/VOLUME/*/Foundation.framework/Foundation
       0x180105000 -        0x180107da8 libsystem_blocks.dylib (*) <a5fdf1ff-b793-3574-8903-d24571eacd25> /Volumes/VOLUME/*/libsystem_blocks.dylib
       0x184db7000 -        0x18512ab7f com.apple.CFNetwork (1.0) <799e3578-e022-31f3-86af-938cea488909> /Volumes/VOLUME/*/CFNetwork.framework/CFNetwork
       0x180185000 -        0x1801ca3bf libdispatch.dylib (*) <42b50931-38d5-3a5d-90ef-0fd7239c408d> /Volumes/VOLUME/*/libdispatch.dylib
       0x1802e0000 -        0x18036909f libc++.1.dylib (*) <fd646c4c-99c5-3828-8199-3a66a48ff1a1> /Volumes/VOLUME/*/libc++.1.dylib

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

-----------
Full Report
-----------

{"app_name":"MotoCortex","timestamp":"2026-09-03 21:24:35.00 +0300","app_version":"1.2.0","slice_uuid":"f4cc10dd-9f97-363b-b4a0-a00392681e22","build_version":"53","platform":7,"bundleID":"com.ismail.motocortexv2","share_with_app_devs":1,"is_first_party":0,"bug_type":"309","os_version":"macOS 26.6.2 (25G83)","roots_installed":0,"name":"MotoCortex","incident_id":"02539125-A4E3-4788-A2C2-B8F7734F9FA9"}
{
  "uptime" : 44000,
  "procRole" : "Foreground",
  "version" : 2,
  "userID" : 501,
  "deployVersion" : 210,
  "modelCode" : "Mac16,10",
  "coalitionID" : 1553,
  "osVersion" : {
    "train" : "macOS 26.6.2",
    "build" : "25G83",
    "releaseType" : "User"
  },
  "captureTime" : "2026-09-03 21:24:31.3585 +0300",
  "codeSigningMonitor" : 2,
  "incident" : "02539125-A4E3-4788-A2C2-B8F7734F9FA9",
  "pid" : 3564,
  "translated" : false,
  "cpuType" : "ARM-64",
  "procLaunch" : "2026-09-03 09:18:41.5454 +0300",
  "procStartAbsTime" : 28230145733,
  "procExitAbsTime" : 1073413467145,
  "procName" : "MotoCortex",
  "procPath" : "\/Users\/USER\/Library\/Developer\/CoreSimulator\/Devices\/D90D7F2D-2DF3-4611-8356-BDEDCC12E373\/data\/Containers\/Bundle\/Application\/A35321C8-ED14-4756-A028-000C4006D4E2\/MotoCortex.app\/MotoCortex",
  "bundleInfo" : {"CFBundleShortVersionString":"1.2.0","CFBundleVersion":"53","CFBundleIdentifier":"com.ismail.motocortexv2"},
  "storeInfo" : {"deviceIdentifierForVendor":"C154DD74-D435-5949-A32C-B14FD08F1B31","thirdParty":true},
  "parentProc" : "launchd_sim",
  "parentPid" : 2981,
  "coalitionName" : "com.apple.CoreSimulator.SimDevice.D90D7F2D-2DF3-4611-8356-BDEDCC12E373",
  "crashReporterKey" : "3D338F32-AE74-8406-89A9-2E77384557C6",
  "appleIntelligenceStatus" : {"state":"available"},
  "developerMode" : 1,
  "responsiblePid" : 2783,
  "responsibleProc" : "SimulatorTrampoline",
  "codeSigningID" : "com.ismail.motocortexv2",
  "codeSigningTeamID" : "",
  "codeSigningFlags" : 570425857,
  "codeSigningValidationCategory" : 10,
  "codeSigningTrustLevel" : 4294967295,
  "codeSigningAuxiliaryInfo" : 0,
  "instructionByteStream" : {"beforePC":"AAAAAAAAAAAAAAAA6BsAsAKpRPliAAC04AMBqkAAH9YIAIDSSQWAUg==","atPC":"CQEAucADX9Y\/AALxIwEAVAgAQPnJ+IPSiXeg8il4wPIp4+PyHwEJ6w=="},
  "bootSessionUUID" : "956C678C-6760-4F52-9F1E-99D48E059688",
  "sip" : "enabled",
  "vmRegionInfo" : "0 is not in any region.  Bytes before following region: 4365533184\n      REGION TYPE                    START - END         [ VSIZE] PRT\/MAX SHRMOD  REGION DETAIL\n      UNUSED SPACE AT START\n--->  \n      __TEXT                      10434c000-104350000    [   16K] r-x\/r-x SM=COW  \/Users\/USER\/Library\/Developer\/CoreSimulator\/Devices\/D90D7F2D-2DF3-4611-8356-BDEDCC12E373\/data\/Containers\/Bundle\/Application\/A35321C8-ED14-4756-A028-000C4006D4E2\/MotoCortex.app\/MotoCortex",
  "exception" : {"codes":"0x0000000000000001, 0x0000000000000000","rawCodes":[1,0],"type":"EXC_BAD_ACCESS","signal":"SIGSEGV","subtype":"KERN_INVALID_ADDRESS at 0x0000000000000000"},
  "termination" : {"flags":0,"code":11,"namespace":"SIGNAL","indicator":"Segmentation fault: 11","byProc":"exc handler","byPid":3564},
  "vmregioninfo" : "0 is not in any region.  Bytes before following region: 4365533184\n      REGION TYPE                    START - END         [ VSIZE] PRT\/MAX SHRMOD  REGION DETAIL\n      UNUSED SPACE AT START\n--->  \n      __TEXT                      10434c000-104350000    [   16K] r-x\/r-x SM=COW  \/Users\/USER\/Library\/Developer\/CoreSimulator\/Devices\/D90D7F2D-2DF3-4611-8356-BDEDCC12E373\/data\/Containers\/Bundle\/Application\/A35321C8-ED14-4756-A028-000C4006D4E2\/MotoCortex.app\/MotoCortex",
  "extMods" : {"caller":{"thread_create":0,"thread_set_state":0,"task_for_pid":0},"system":{"thread_create":0,"thread_set_state":0,"task_for_pid":0},"targeted":{"thread_create":0,"thread_set_state":0,"task_for_pid":0},"warnings":0},
  "faultingThread" : 9,
  "threads" : [{"id":37809,"threadState":{"x":[{"value":268451845},{"value":21592279046},{"value":8589934592},{"value":27500675596288},{"value":0},{"value":27500675596288},{"value":2},{"value":4294967295},{"value":0},{"value":17179869184},{"value":0},{"value":2},{"value":0},{"value":0},{"value":6403},{"value":3072},{"value":18446744073709551569},{"value":6446253880,"symbolLocation":0,"symbol":"-[__NSArrayM objectAtIndex:]"},{"value":0},{"value":4294967295},{"value":2},{"value":27500675596288},{"value":0},{"value":27500675596288},{"value":21592279046},{"value":6101339672},{"value":8589934592},{"value":18446744073709550527},{"value":4369285120,"symbolLocation":0,"symbol":"_libkernel_string_functions"}],"flavor":"ARM_THREAD_STATE64","lr":{"value":4369079940},"cpsr":{"value":0},"fp":{"value":6101339520},"sp":{"value":6101339440},"esr":{"value":1442840704,"description":"(Syscall)"},"pc":{"value":4369009520},"far":{"value":0}},"queue":"com.apple.main-thread","frames":[{"imageOffset":2928,"symbol":"mach_msg2_trap","symbolLocation":8,"imageIndex":12},{"imageOffset":73348,"symbol":"mach_msg2_internal","symbolLocation":72,"imageIndex":12},{"imageOffset":35908,"symbol":"mach_msg_overwrite","symbolLocation":484,"imageIndex":12},{"imageOffset":3824,"symbol":"mach_msg","symbolLocation":20,"imageIndex":12},{"imageOffset":604096,"symbol":"__CFRunLoopServiceMachPort","symbolLocation":156,"imageIndex":17},{"imageOffset":600440,"symbol":"__CFRunLoopRun","symbolLocation":1128,"imageIndex":17},{"imageOffset":579844,"symbol":"_CFRunLoopRunSpecificWithOptions","symbolLocation":496,"imageIndex":17},{"imageOffset":10688,"symbol":"GSEventRunModal","symbolLocation":116,"imageIndex":18},{"imageOffset":18990284,"symbol":"-[UIApplication _run]","symbolLocation":776,"imageIndex":19},{"imageOffset":26306832,"symbol":"UIApplicationMain","symbolLocation":120,"imageIndex":19},{"imageOffset":13400,"sourceLine":7,"sourceFile":"main.m","symbol":"__debug_main_executable_dylib_entry_point","imageIndex":2,"symbolLocation":96},{"imageOffset":45284,"symbol":"start_sim","symbolLocation":20,"imageIndex":1},{"imageOffset":132324,"symbol":"start","symbolLocation":6992,"imageIndex":16}]},{"id":37890,"name":"com.apple.uikit.eventfetch-thread","threadState":{"x":[{"value":268451845},{"value":21592279046},{"value":8589934592},{"value":47291884896256},{"value":0},{"value":47291884896256},{"value":2},{"value":4294967295},{"value":0},{"value":17179869184},{"value":0},{"value":2},{"value":0},{"value":0},{"value":11011},{"value":3072},{"value":18446744073709551569},{"value":6447881108,"symbolLocation":0,"symbol":"-[NSConstantDate timeIntervalSinceReferenceDate]"},{"value":0},{"value":4294967295},{"value":2},{"value":47291884896256},{"value":0},{"value":47291884896256},{"value":21592279046},{"value":6104194440},{"value":8589934592},{"value":18446744073709550527},{"value":4369285120,"symbolLocation":0,"symbol":"_libkernel_string_functions"}],"flavor":"ARM_THREAD_STATE64","lr":{"value":4369079940},"cpsr":{"value":0},"fp":{"value":6104194288},"sp":{"value":6104194208},"esr":{"value":1442840704,"description":"(Syscall)"},"pc":{"value":4369009520},"far":{"value":0}},"frames":[{"imageOffset":2928,"symbol":"mach_msg2_trap","symbolLocation":8,"imageIndex":12},{"imageOffset":73348,"symbol":"mach_msg2_internal","symbolLocation":72,"imageIndex":12},{"imageOffset":35908,"symbol":"mach_msg_overwrite","symbolLocation":484,"imageIndex":12},{"imageOffset":3824,"symbol":"mach_msg","symbolLocation":20,"imageIndex":12},{"imageOffset":604096,"symbol":"__CFRunLoopServiceMachPort","symbolLocation":156,"imageIndex":17},{"imageOffset":600440,"symbol":"__CFRunLoopRun","symbolLocation":1128,"imageIndex":17},{"imageOffset":579844,"symbol":"_CFRunLoopRunSpecificWithOptions","symbolLocation":496,"imageIndex":17},{"imageOffset":9370188,"symbol":"-[NSRunLoop(NSRunLoop) runMode:beforeDate:]","symbolLocation":208,"imageIndex":21},{"imageOffset":9370728,"symbol":"-[NSRunLoop(NSRunLoop) runUntilDate:]","symbolLocation":60,"imageIndex":21},{"imageOffset":16050900,"symbol":"-[UIEventFetcher threadMain]","symbolLocation":404,"imageIndex":19},{"imageOffset":9522908,"symbol":"__NSThread__start__","symbolLocation":716,"imageIndex":21},{"imageOffset":26172,"symbol":"_pthread_start","symbolLocation":104,"imageIndex":13},{"imageOffset":6708,"symbol":"thread_start","symbolLocation":8,"imageIndex":13}]},{"id":37909,"name":"com.google.firebase.crashlytics.MachExceptionServer","threadState":{"x":[{"value":24},{"value":0},{"value":24},{"value":4365961446},{"value":10771855359776},{"value":0},{"value":0},{"value":0},{"value":4464588906},{"value":4372348600},{"value":0},{"value":77381408},{"value":2508},{"value":0},{"value":0},{"value":0},{"value":4},{"value":6443522852,"symbolLocation":0,"symbol":"-[__NSStackBlock__ release]"},{"value":0},{"value":6109380608},{"value":0},{"value":0},{"value":0},{"value":0},{"value":0},{"value":0},{"value":0},{"value":0},{"value":0}],"flavor":"ARM_THREAD_STATE64","lr":{"value":4444631224},"cpsr":{"value":1073741824},"fp":{"value":4372348576},"sp":{"value":4372348368},"esr":{"value":1442840704,"description":"(Syscall)"},"pc":{"value":4369023736},"far":{"value":0}},"frames":[{"imageOffset":17144,"symbol":"write","symbolLocation":8,"imageIndex":12},{"imageOffset":5894328,"sourceLine":86,"sourceFile":"FIRCLSInternalLogging.c","symbol":"FIRCLSSDKFileLog","imageIndex":2,"symbolLocation":784},{"imageOffset":5906248,"sourceLine":295,"sourceFile":"FIRCLSMachException.c","symbol":"FIRCLSMachExceptionReply","imageIndex":2,"symbolLocation":320},{"imageOffset":5904484,"sourceLine":181,"sourceFile":"FIRCLSMachException.c","symbol":"FIRCLSMachExceptionServer","imageIndex":2,"symbolLocation":100},{"imageOffset":26172,"symbol":"_pthread_start","symbolLocation":104,"imageIndex":13},{"imageOffset":6708,"symbol":"thread_start","symbolLocation":8,"imageIndex":13}]},{"id":38349,"name":"com.facebook.SocketRocket.NetworkThread","threadState":{"x":[{"value":268451845},{"value":21592279046},{"value":8589934592},{"value":117746528419840},{"value":0},{"value":117746528419840},{"value":2},{"value":4294967295},{"value":0},{"value":17179869184},{"value":0},{"value":2},{"value":0},{"value":0},{"value":27415},{"value":3072},{"value":18446744073709551569},{"value":6447881108,"symbolLocation":0,"symbol":"-[NSConstantDate timeIntervalSinceReferenceDate]"},{"value":0},{"value":4294967295},{"value":2},{"value":117746528419840},{"value":0},{"value":117746528419840},{"value":21592279046},{"value":6110518616},{"value":8589934592},{"value":18446744073709550527},{"value":4369285120,"symbolLocation":0,"symbol":"_libkernel_string_functions"}],"flavor":"ARM_THREAD_STATE64","lr":{"value":4369079940},"cpsr":{"value":0},"fp":{"value":6110518464},"sp":{"value":6110518384},"esr":{"value":1442840704,"description":"(Syscall)"},"pc":{"value":4369009520},"far":{"value":0}},"frames":[{"imageOffset":2928,"symbol":"mach_msg2_trap","symbolLocation":8,"imageIndex":12},{"imageOffset":73348,"symbol":"mach_msg2_internal","symbolLocation":72,"imageIndex":12},{"imageOffset":35908,"symbol":"mach_msg_overwrite","symbolLocation":484,"imageIndex":12},{"imageOffset":3824,"symbol":"mach_msg","symbolLocation":20,"imageIndex":12},{"imageOffset":604096,"symbol":"__CFRunLoopServiceMachPort","symbolLocation":156,"imageIndex":17},{"imageOffset":600440,"symbol":"__CFRunLoopRun","symbolLocation":1128,"imageIndex":17},{"imageOffset":579844,"symbol":"_CFRunLoopRunSpecificWithOptions","symbolLocation":496,"imageIndex":17},{"imageOffset":9370188,"symbol":"-[NSRunLoop(NSRunLoop) runMode:beforeDate:]","symbolLocation":208,"imageIndex":21},{"imageOffset":22408880,"sourceLine":71,"sourceFile":"SRRunLoopThread.m","symbol":"-[SRRunLoopThread main]","imageIndex":2,"symbolLocation":268},{"imageOffset":9522908,"symbol":"__NSThread__start__","symbolLocation":716,"imageIndex":21},{"imageOffset":26172,"symbol":"_pthread_start","symbolLocation":104,"imageIndex":13},{"imageOffset":6708,"symbol":"thread_start","symbolLocation":8,"imageIndex":13}]},{"id":38350,"name":"com.apple.NSURLConnectionLoader","threadState":{"x":[{"value":268451845},{"value":21592279046},{"value":8589934592},{"value":158342559301632},{"value":0},{"value":158342559301632},{"value":2},{"value":4294967295},{"value":0},{"value":17179869184},{"value":0},{"value":2},{"value":0},{"value":0},{"value":36867},{"value":3072},{"value":18446744073709551569},{"value":6444053628,"symbolLocation":0,"symbol":"-[OS_dispatch_object dealloc]"},{"value":0},{"value":4294967295},{"value":2},{"value":158342559301632},{"value":0},{"value":158342559301632},{"value":21592279046},{"value":6111092040},{"value":8589934592},{"value":18446744073709550527},{"value":4369285120,"symbolLocation":0,"symbol":"_libkernel_string_functions"}],"flavor":"ARM_THREAD_STATE64","lr":{"value":4369079940},"cpsr":{"value":0},"fp":{"value":6111091888},"sp":{"value":6111091808},"esr":{"value":1442840704,"description":"(Syscall)"},"pc":{"value":4369009520},"far":{"value":0}},"frames":[{"imageOffset":2928,"symbol":"mach_msg2_trap","symbolLocation":8,"imageIndex":12},{"imageOffset":73348,"symbol":"mach_msg2_internal","symbolLocation":72,"imageIndex":12},{"imageOffset":35908,"symbol":"mach_msg_overwrite","symbolLocation":484,"imageIndex":12},{"imageOffset":3824,"symbol":"mach_msg","symbolLocation":20,"imageIndex":12},{"imageOffset":604096,"symbol":"__CFRunLoopServiceMachPort","symbolLocation":156,"imageIndex":17},{"imageOffset":600440,"symbol":"__CFRunLoopRun","symbolLocation":1128,"imageIndex":17},{"imageOffset":579844,"symbol":"_CFRunLoopRunSpecificWithOptions","symbolLocation":496,"imageIndex":17},{"imageOffset":2101280,"symbol":"+[__CFN_CoreSchedulingSetRunnable _run:]","symbolLocation":368,"imageIndex":23},{"imageOffset":9522908,"symbol":"__NSThread__start__","symbolLocation":716,"imageIndex":21},{"imageOffset":26172,"symbol":"_pthread_start","symbolLocation":104,"imageIndex":13},{"imageOffset":6708,"symbol":"thread_start","symbolLocation":8,"imageIndex":13}]},{"id":38351,"name":"com.apple.CFSocket.private","threadState":{"x":[{"value":4},{"value":0},{"value":4409068320},{"value":0},{"value":0},{"value":0},{"value":26738688},{"value":0},{"value":6111670496},{"value":0},{"value":4580662272},{"value":31},{"value":13},{"value":4580662464},{"value":72057602419196713,"symbolLocation":72057594037927937,"symbol":"OBJC_CLASS_$___NSCFArray"},{"value":8381268776,"symbolLocation":0,"symbol":"OBJC_CLASS_$___NSCFArray"},{"value":93},{"value":6446696768,"symbolLocation":0,"symbol":"-[__NSCFArray objectAtIndex:]"},{"value":0},{"value":4419602208},{"value":8381288448,"symbolLocation":792,"symbol":"__last_exception_os_log_pack__"},{"value":64},{"value":8381291584,"symbolLocation":0,"symbol":"__CFActiveSocketsLock"},{"value":0},{"value":4409068320},{"value":4419556176},{"value":4409068304},{"value":0},{"value":4419556128}],"flavor":"ARM_THREAD_STATE64","lr":{"value":6446844812},"cpsr":{"value":1610612736},"fp":{"value":6111670208},"sp":{"value":6111636432},"esr":{"value":1442840704,"description":"(Syscall)"},"pc":{"value":4369051572},"far":{"value":0}},"frames":[{"imageOffset":44980,"symbol":"__select","symbolLocation":8,"imageIndex":12},{"imageOffset":662412,"symbol":"__CFSocketManager","symbolLocation":680,"imageIndex":17},{"imageOffset":26172,"symbol":"_pthread_start","symbolLocation":104,"imageIndex":13},{"imageOffset":6708,"symbol":"thread_start","symbolLocation":8,"imageIndex":13}]},{"id":38354,"name":"com.apple.CFNetwork.CustomProtocols","threadState":{"x":[{"value":268451845},{"value":21592279046},{"value":8589934592},{"value":167138652323840},{"value":0},{"value":167138652323840},{"value":2},{"value":4294967295},{"value":0},{"value":17179869184},{"value":0},{"value":2},{"value":0},{"value":0},{"value":38915},{"value":3072},{"value":18446744073709551569},{"value":6444053628,"symbolLocation":0,"symbol":"-[OS_dispatch_object dealloc]"},{"value":0},{"value":4294967295},{"value":2},{"value":167138652323840},{"value":0},{"value":167138652323840},{"value":21592279046},{"value":6113336648},{"value":8589934592},{"value":18446744073709550527},{"value":4369285120,"symbolLocation":0,"symbol":"_libkernel_string_functions"}],"flavor":"ARM_THREAD_STATE64","lr":{"value":4369079940},"cpsr":{"value":0},"fp":{"value":6113336496},"sp":{"value":6113336416},"esr":{"value":1442840704,"description":"(Syscall)"},"pc":{"value":4369009520},"far":{"value":0}},"frames":[{"imageOffset":2928,"symbol":"mach_msg2_trap","symbolLocation":8,"imageIndex":12},{"imageOffset":73348,"symbol":"mach_msg2_internal","symbolLocation":72,"imageIndex":12},{"imageOffset":35908,"symbol":"mach_msg_overwrite","symbolLocation":484,"imageIndex":12},{"imageOffset":3824,"symbol":"mach_msg","symbolLocation":20,"imageIndex":12},{"imageOffset":604096,"symbol":"__CFRunLoopServiceMachPort","symbolLocation":156,"imageIndex":17},{"imageOffset":600440,"symbol":"__CFRunLoopRun","symbolLocation":1128,"imageIndex":17},{"imageOffset":579844,"symbol":"_CFRunLoopRunSpecificWithOptions","symbolLocation":496,"imageIndex":17},{"imageOffset":2101280,"symbol":"+[__CFN_CoreSchedulingSetRunnable _run:]","symbolLocation":368,"imageIndex":23},{"imageOffset":9522908,"symbol":"__NSThread__start__","symbolLocation":716,"imageIndex":21},{"imageOffset":26172,"symbol":"_pthread_start","symbolLocation":104,"imageIndex":13},{"imageOffset":6708,"symbol":"thread_start","symbolLocation":8,"imageIndex":13}]},{"id":38359,"name":"com.apple.CFStream.LegacyThread","threadState":{"x":[{"value":268451845},{"value":21592279046},{"value":8589934592},{"value":275990303473664},{"value":0},{"value":275990303473664},{"value":2},{"value":4294967295},{"value":0},{"value":17179869184},{"value":0},{"value":2},{"value":0},{"value":0},{"value":64259},{"value":3072},{"value":18446744073709551569},{"value":18446744072367376383},{"value":0},{"value":4294967295},{"value":2},{"value":275990303473664},{"value":0},{"value":275990303473664},{"value":21592279046},{"value":6114484232},{"value":8589934592},{"value":18446744073709550527},{"value":4369285120,"symbolLocation":0,"symbol":"_libkernel_string_functions"}],"flavor":"ARM_THREAD_STATE64","lr":{"value":4369079940},"cpsr":{"value":0},"fp":{"value":6114484080},"sp":{"value":6114484000},"esr":{"value":1442840704,"description":"(Syscall)"},"pc":{"value":4369009520},"far":{"value":0}},"frames":[{"imageOffset":2928,"symbol":"mach_msg2_trap","symbolLocation":8,"imageIndex":12},{"imageOffset":73348,"symbol":"mach_msg2_internal","symbolLocation":72,"imageIndex":12},{"imageOffset":35908,"symbol":"mach_msg_overwrite","symbolLocation":484,"imageIndex":12},{"imageOffset":3824,"symbol":"mach_msg","symbolLocation":20,"imageIndex":12},{"imageOffset":604096,"symbol":"__CFRunLoopServiceMachPort","symbolLocation":156,"imageIndex":17},{"imageOffset":600440,"symbol":"__CFRunLoopRun","symbolLocation":1128,"imageIndex":17},{"imageOffset":579844,"symbol":"_CFRunLoopRunSpecificWithOptions","symbolLocation":496,"imageIndex":17},{"imageOffset":725924,"symbol":"_legacyStreamRunLoop_workThread","symbolLocation":260,"imageIndex":17},{"imageOffset":26172,"symbol":"_pthread_start","symbolLocation":104,"imageIndex":13},{"imageOffset":6708,"symbol":"thread_start","symbolLocation":8,"imageIndex":13}]},{"id":122195,"name":"com.apple.UIKit.inProcessAnimationManager","threadState":{"x":[{"value":14},{"value":18446744073709551615},{"value":17179869187},{"value":1},{"value":17179869187},{"value":3},{"value":17179869187},{"value":3},{"value":55603},{"value":18446744073709551615},{"value":4404258496},{"value":3},{"value":2},{"value":4404258512},{"value":8381067688,"symbolLocation":0,"symbol":"OBJC_CLASS_$_OS_dispatch_semaphore"},{"value":8381067688,"symbolLocation":0,"symbol":"OBJC_CLASS_$_OS_dispatch_semaphore"},{"value":18446744073709551580},{"value":0},{"value":0},{"value":4582806352},{"value":4582806288},{"value":18446744073709551615},{"value":4693134400},{"value":4582806288},{"value":0},{"value":0},{"value":0},{"value":0},{"value":0}],"flavor":"ARM_THREAD_STATE64","lr":{"value":6444055904},"cpsr":{"value":1610612736},"fp":{"value":6103624784},"sp":{"value":6103624768},"esr":{"value":1442840704,"description":"(Syscall)"},"pc":{"value":4369009388},"far":{"value":0}},"frames":[{"imageOffset":2796,"symbol":"semaphore_wait_trap","symbolLocation":8,"imageIndex":12},{"imageOffset":11616,"symbol":"_dispatch_sema4_wait","symbolLocation":24,"imageIndex":24},{"imageOffset":13248,"symbol":"_dispatch_semaphore_wait_slow","symbolLocation":128,"imageIndex":24},{"imageOffset":4851252,"imageIndex":19},{"imageOffset":4867220,"imageIndex":19},{"imageOffset":1357616,"imageIndex":19},{"imageOffset":9522908,"symbol":"__NSThread__start__","symbolLocation":716,"imageIndex":21},{"imageOffset":26172,"symbol":"_pthread_start","symbolLocation":104,"imageIndex":13},{"imageOffset":6708,"symbol":"thread_start","symbolLocation":8,"imageIndex":13}]},{"triggered":true,"id":449730,"name":"com.facebook.react.JavaScript","threadState":{"x":[{"value":0},{"value":6112752608},{"value":0},{"value":4590513234},{"value":137452464},{"value":16},{"value":574903650569255619},{"value":0},{"value":0},{"value":42},{"value":7011295641794340705},{"value":8295754077231915128},{"value":2339726990300225637},{"value":8820707928343405928},{"value":8675375937127653477},{"value":11650860683978083},{"value":4365971632,"symbolLocation":0,"symbol":"_platform_memmove"},{"value":18446744072367376383},{"value":0},{"value":6112752760},{"value":1},{"value":0},{"value":4381464768,"symbolLocation":0,"symbol":"_MergedGlobals"},{"value":4377807240,"symbolLocation":0,"symbol":"facebook::hermes::detail::hermesFatalErrorHandler(void*, std::__1::basic_string<char, std::__1::char_traits<char>, std::__1::allocator<char>> const&, bool)"},{"value":4381473084,"symbolLocation":2500,"symbol":"hermes::vm::Metadata::metadataTable"},{"value":96},{"value":4381470584,"symbolLocation":0,"symbol":"hermes::vm::Metadata::metadataTable"},{"value":0},{"value":4095976}],"flavor":"ARM_THREAD_STATE64","lr":{"value":4380986008},"cpsr":{"value":2147483648},"fp":{"value":6112752736},"sp":{"value":6112752560},"esr":{"value":2449473606,"description":"(Data Abort) byte write Translation fault"},"pc":{"value":4377807268,"matchesCrashFrame":1},"far":{"value":0}},"frames":[{"imageOffset":18852,"symbol":"facebook::hermes::detail::hermesFatalErrorHandler(void*, std::__1::basic_string<char, std::__1::char_traits<char>, std::__1::allocator<char>> const&, bool)","symbolLocation":28,"imageIndex":4},{"imageOffset":3197592,"symbol":"llvh::report_fatal_error(llvh::Twine const&, bool)","symbolLocation":260,"imageIndex":4},{"imageOffset":3197796,"symbol":"llvh::report_fatal_error(std::__1::basic_string<char, std::__1::char_traits<char>, std::__1::allocator<char>> const&, bool)","symbolLocation":32,"imageIndex":4},{"imageOffset":3108052,"symbol":"hermes::hermes_fatal(llvh::StringRef, std::__1::error_code)","symbolLocation":156,"imageIndex":4},{"imageOffset":811348,"symbol":"hermes::vm::GCBase::oom(std::__1::error_code)","symbolLocation":152,"imageIndex":4},{"imageOffset":1704960,"symbol":"hermes::vm::HadesGC::OldGen::alloc(unsigned int)","symbolLocation":380,"imageIndex":4},{"imageOffset":1730096,"symbol":"hermes::vm::HadesGC::EvacAcceptor<false>::acceptHeap(hermes::vm::CompressedPointer, void*)","symbolLocation":92,"imageIndex":4},{"imageOffset":1734548,"symbol":"hermes::vm::SlotVisitor<hermes::vm::HadesGC::EvacAcceptor<false>>::visitFields(char*, hermes::vm::Metadata::SlotOffsets const&)","symbolLocation":224,"imageIndex":4},{"imageOffset":1708020,"symbol":"void hermes::vm::HadesGC::youngGenEvacuateImpl<hermes::vm::HadesGC::EvacAcceptor<false>>(hermes::vm::HadesGC::EvacAcceptor<false>&, bool)","symbolLocation":296,"imageIndex":4},{"imageOffset":1693576,"symbol":"hermes::vm::HadesGC::youngGenCollection(std::__1::basic_string<char, std::__1::char_traits<char>, std::__1::allocator<char>>, bool)","symbolLocation":780,"imageIndex":4},{"imageOffset":1704428,"symbol":"hermes::vm::HadesGC::allocSlow(unsigned int)","symbolLocation":152,"imageIndex":4},{"imageOffset":955252,"symbol":"hermes::vm::JSArray::createNoAllocPropStorage(hermes::vm::Runtime&, hermes::vm::Handle<hermes::vm::JSObject>, hermes::vm::Handle<hermes::vm::HiddenClass>, unsigned int, unsigned int)","symbolLocation":152,"imageIndex":4},{"imageOffset":906616,"symbol":"hermes::vm::CallResult<hermes::vm::HermesValue, (hermes::vm::detail::CallResultSpecialize)2> hermes::vm::Interpreter::interpretFunction<false, false>(hermes::vm::Runtime&, hermes::vm::InterpreterState&)","symbolLocation":16896,"imageIndex":4},{"imageOffset":889668,"symbol":"hermes::vm::Runtime::interpretFunctionImpl(hermes::vm::CodeBlock*)","symbolLocation":132,"imageIndex":4},{"imageOffset":786052,"symbol":"hermes::vm::JSFunction::_callImpl(hermes::vm::Handle<hermes::vm::Callable>, hermes::vm::Runtime&)","symbolLocation":40,"imageIndex":4},{"imageOffset":778532,"symbol":"hermes::vm::Callable::executeCall3(hermes::vm::Handle<hermes::vm::Callable>, hermes::vm::Runtime&, hermes::vm::Handle<hermes::vm::HermesValue>, hermes::vm::HermesValue, hermes::vm::HermesValue, hermes::vm::HermesValue, bool)","symbolLocation":200,"imageIndex":4},{"imageOffset":1057368,"symbol":"hermes::vm::JSMapImpl<(hermes::vm::CellKind)47>::forEach(hermes::vm::Handle<hermes::vm::JSMapImpl<(hermes::vm::CellKind)47>>, hermes::vm::Runtime&, hermes::vm::Handle<hermes::vm::Callable>, hermes::vm::Handle<hermes::vm::HermesValue>)","symbolLocation":204,"imageIndex":4},{"imageOffset":1521156,"symbol":"hermes::vm::setPrototypeForEach(void*, hermes::vm::Runtime&, hermes::vm::NativeArgs)","symbolLocation":252,"imageIndex":4},{"imageOffset":785328,"symbol":"hermes::vm::NativeFunction::_nativeCall(hermes::vm::NativeFunction*, hermes::vm::Runtime&)","symbolLocation":144,"imageIndex":4},{"imageOffset":892032,"symbol":"hermes::vm::CallResult<hermes::vm::HermesValue, (hermes::vm::detail::CallResultSpecialize)2> hermes::vm::Interpreter::interpretFunction<false, false>(hermes::vm::Runtime&, hermes::vm::InterpreterState&)","symbolLocation":2312,"imageIndex":4},{"imageOffset":889668,"symbol":"hermes::vm::Runtime::interpretFunctionImpl(hermes::vm::CodeBlock*)","symbolLocation":132,"imageIndex":4},{"imageOffset":786052,"symbol":"hermes::vm::JSFunction::_callImpl(hermes::vm::Handle<hermes::vm::Callable>, hermes::vm::Runtime&)","symbolLocation":40,"imageIndex":4},{"imageOffset":780316,"symbol":"hermes::vm::Callable::executeCall(hermes::vm::Handle<hermes::vm::Callable>, hermes::vm::Runtime&, hermes::vm::Handle<hermes::vm::HermesValue>, hermes::vm::Handle<hermes::vm::HermesValue>, hermes::vm::Handle<hermes::vm::JSObject>)","symbolLocation":1348,"imageIndex":4},{"imageOffset":1568844,"symbol":"hermes::vm::functionPrototypeApply(void*, hermes::vm::Runtime&, hermes::vm::NativeArgs)","symbolLocation":320,"imageIndex":4},{"imageOffset":785328,"symbol":"hermes::vm::NativeFunction::_nativeCall(hermes::vm::NativeFunction*, hermes::vm::Runtime&)","symbolLocation":144,"imageIndex":4},{"imageOffset":892032,"symbol":"hermes::vm::CallResult<hermes::vm::HermesValue, (hermes::vm::detail::CallResultSpecialize)2> hermes::vm::Interpreter::interpretFunction<false, false>(hermes::vm::Runtime&, hermes::vm::InterpreterState&)","symbolLocation":2312,"imageIndex":4},{"imageOffset":889668,"symbol":"hermes::vm::Runtime::interpretFunctionImpl(hermes::vm::CodeBlock*)","symbolLocation":132,"imageIndex":4},{"imageOffset":786052,"symbol":"hermes::vm::JSFunction::_callImpl(hermes::vm::Handle<hermes::vm::Callable>, hermes::vm::Runtime&)","symbolLocation":40,"imageIndex":4},{"imageOffset":780316,"symbol":"hermes::vm::Callable::executeCall(hermes::vm::Handle<hermes::vm::Callable>, hermes::vm::Runtime&, hermes::vm::Handle<hermes::vm::HermesValue>, hermes::vm::Handle<hermes::vm::HermesValue>, hermes::vm::Handle<hermes::vm::JSObject>)","symbolLocation":1348,"imageIndex":4},{"imageOffset":1568844,"symbol":"hermes::vm::functionPrototypeApply(void*, hermes::vm::Runtime&, hermes::vm::NativeArgs)","symbolLocation":320,"imageIndex":4},{"imageOffset":785328,"symbol":"hermes::vm::NativeFunction::_nativeCall(hermes::vm::NativeFunction*, hermes::vm::Runtime&)","symbolLocation":144,"imageIndex":4},{"imageOffset":892032,"symbol":"hermes::vm::CallResult<hermes::vm::HermesValue, (hermes::vm::detail::CallResultSpecialize)2> hermes::vm::Interpreter::interpretFunction<false, false>(hermes::vm::Runtime&, hermes::vm::InterpreterState&)","symbolLocation":2312,"imageIndex":4},{"imageOffset":889668,"symbol":"hermes::vm::Runtime::interpretFunctionImpl(hermes::vm::CodeBlock*)","symbolLocation":132,"imageIndex":4},{"imageOffset":786052,"symbol":"hermes::vm::JSFunction::_callImpl(hermes::vm::Handle<hermes::vm::Callable>, hermes::vm::Runtime&)","symbolLocation":40,"imageIndex":4},{"imageOffset":784084,"symbol":"hermes::vm::BoundFunction::_boundCall(hermes::vm::BoundFunction*, hermes::inst::Inst const*, hermes::vm::Runtime&)","symbolLocation":584,"imageIndex":4},{"imageOffset":47200,"symbol":"facebook::hermes::HermesRuntimeImpl::call(facebook::jsi::Function const&, facebook::jsi::Value const&, facebook::jsi::Value const*, unsigned long)","symbolLocation":744,"imageIndex":4},{"imageOffset":11413776,"sourceLine":347,"sourceFile":"decorator.h","symbol":"facebook::jsi::RuntimeDecorator<facebook::jsi::Runtime, facebook::jsi::Runtime>::call(facebook::jsi::Function const&, facebook::jsi::Value const&, facebook::jsi::Value const*, unsigned long)","imageIndex":2,"symbolLocation":76},{"imageOffset":24039544,"sourceLine":820,"sourceFile":"decorator.h","symbol":"facebook::jsi::WithRuntimeDecorator<facebook::react::(anonymous namespace)::ReentrancyCheck, facebook::jsi::Runtime, facebook::jsi::Runtime>::call(facebook::jsi::Function const&, facebook::jsi::Value const&, facebook::jsi::Value const*, unsigned long)","imageIndex":2,"symbolLocation":88},{"imageOffset":2874140,"sourceLine":264,"sourceFile":"jsi-inl.h","symbol":"facebook::jsi::Function::call(facebook::jsi::Runtime&, facebook::jsi::Value const*, unsigned long) const","imageIndex":2,"symbolLocation":100},{"imageOffset":2873964,"sourceLine":269,"sourceFile":"jsi-inl.h","symbol":"facebook::jsi::Function::call(facebook::jsi::Runtime&, std::initializer_list<facebook::jsi::Value>) const","imageIndex":2,"symbolLocation":112},{"imageOffset":23472876,"sourceLine":277,"sourceFile":"jsi-inl.h","symbol":"facebook::jsi::Value facebook::jsi::Function::call<std::__1::basic_string<char, std::__1::char_traits<char>, std::__1::allocator<char>> const&, std::__1::basic_string<char, std::__1::char_traits<char>, std::__1::allocator<char>> const&, facebook::jsi::Value>(facebook::jsi::Runtime&, std::__1::basic_string<char, std::__1::char_traits<char>, std::__1::allocator<char>> const&, std::__1::basic_string<char, std::__1::char_traits<char>, std::__1::allocator<char>> const&, facebook::jsi::Value&&) const","imageIndex":2,"symbolLocation":228},{"imageOffset":23472536,"sourceLine":240,"sourceFile":"JSIExecutor.cpp","symbol":"facebook::react::JSIExecutor::callFunction(std::__1::basic_string<char, std::__1::char_traits<char>, std::__1::allocator<char>> const&, std::__1::basic_string<char, std::__1::char_traits<char>, std::__1::allocator<char>> const&, folly::dynamic const&)::$_0::operator()() const","imageIndex":2,"symbolLocation":140},{"imageOffset":23472384,"sourceLine":87,"sourceFile":"invoke.h","symbol":"std::__1::__invoke_result_impl<void, facebook::react::JSIExecutor::callFunction(std::__1::basic_string<char, std::__1::char_traits<char>, std::__1::allocator<char>> const&, std::__1::basic_string<char, std::__1::char_traits<char>, std::__1::allocator<char>> const&, folly::dynamic const&)::$_0&>::type std::__1::__invoke[abi:dee210106]<facebook::react::JSIExecutor::callFunction(std::__1::basic_string<char, std::__1::char_traits<char>, std::__1::allocator<char>> const&, std::__1::basic_string<char, std::__1::char_traits<char>, std::__1::allocator<char>> const&, folly::dynamic const&)::$_0&>(facebook::react::JSIExecutor::callFunction(std::__1::basic_string<char, std::__1::char_traits<char>, std::__1::allocator<char>> const&, std::__1::basic_string<char, std::__1::char_traits<char>, std::__1::allocator<char>> const&, folly::dynamic const&)::$_0&)","imageIndex":2,"symbolLocation":24},{"imageOffset":23472348,"sourceLine":342,"sourceFile":"invoke.h","symbol":"void std::__1::__invoke_void_return_wrapper<void, true>::__call[abi:dee210106]<facebook::react::JSIExecutor::callFunction(std::__1::basic_string<char, std::__1::char_traits<char>, std::__1::allocator<char>> const&, std::__1::basic_string<char, std::__1::char_traits<char>, std::__1::allocator<char>> const&, folly::dynamic const&)::$_0&>(facebook::react::JSIExecutor::callFunction(std::__1::basic_string<char, std::__1::char_traits<char>, std::__1::allocator<char>> const&, std::__1::basic_string<char, std::__1::char_traits<char>, std::__1::allocator<char>> const&, folly::dynamic const&)::$_0&)","imageIndex":2,"symbolLocation":24},{"imageOffset":23472312,"sourceLine":348,"sourceFile":"invoke.h","symbol":"void std::__1::__invoke_r[abi:dee210106]<void, facebook::react::JSIExecutor::callFunction(std::__1::basic_string<char, std::__1::char_traits<char>, std::__1::allocator<char>> const&, std::__1::basic_string<char, std::__1::char_traits<char>, std::__1::allocator<char>> const&, folly::dynamic const&)::$_0&>(facebook::react::JSIExecutor::callFunction(std::__1::basic_string<char, std::__1::char_traits<char>, std::__1::allocator<char>> const&, std::__1::basic_string<char, std::__1::char_traits<char>, std::__1::allocator<char>> const&, folly::dynamic const&)::$_0&)","imageIndex":2,"symbolLocation":24},{"imageOffset":23471980,"sourceLine":174,"sourceFile":"function.h","symbol":"std::__1::__function::__func<facebook::react::JSIExecutor::callFunction(std::__1::basic_string<char, std::__1::char_traits<char>, std::__1::allocator<char>> const&, std::__1::basic_string<char, std::__1::char_traits<char>, std::__1::allocator<char>> const&, folly::dynamic const&)::$_0, void ()>::operator()()","imageIndex":2,"symbolLocation":28},{"imageOffset":2960200,"sourceLine":274,"sourceFile":"function.h","symbol":"std::__1::__function::__value_func<void ()>::operator()[abi:dee210106]() const","imageIndex":2,"symbolLocation":60},{"imageOffset":2960128,"sourceLine":772,"sourceFile":"function.h","symbol":"std::__1::function<void ()>::operator()() const","imageIndex":2,"symbolLocation":24},{"imageOffset":12158828,"sourceLine":107,"sourceFile":"JSIExecutor.h","symbol":"facebook::react::JSIExecutor::defaultTimeoutInvoker(std::__1::function<void ()> const&, std::__1::function<std::__1::basic_string<char, std::__1::char_traits<char>, std::__1::allocator<char>> ()>)","imageIndex":2,"symbolLocation":28},{"imageOffset":12160324,"sourceLine":87,"sourceFile":"invoke.h","symbol":"std::__1::__invoke_result_impl<void, void (*&)(std::__1::function<void ()> const&, std::__1::function<std::__1::basic_string<char, std::__1::char_traits<char>, std::__1::allocator<char>> ()>), std::__1::function<void ()> const&, std::__1::function<std::__1::basic_string<char, std::__1::char_traits<char>, std::__1::allocator<char>> ()>>::type std::__1::__invoke[abi:dee210106]<void (*&)(std::__1::function<void ()> const&, std::__1::function<std::__1::basic_string<char, std::__1::char_traits<char>, std::__1::allocator<char>> ()>), std::__1::function<void ()> const&, std::__1::function<std::__1::basic_string<char, std::__1::char_traits<char>, std::__1::allocator<char>> ()>>(void (*&)(std::__1::function<void ()> const&, std::__1::function<std::__1::basic_string<char, std::__1::char_traits<char>, std::__1::allocator<char>> ()>), std::__1::function<void ()> const&, std::__1::function<std::__1::basic_string<char, std::__1::char_traits<char>, std::__1::allocator<char>> ()>&&)","imageIndex":2,"symbolLocation":92},{"imageOffset":12160220,"sourceLine":342,"sourceFile":"invoke.h","symbol":"void std::__1::__invoke_void_return_wrapper<void, true>::__call[abi:dee210106]<void (*&)(std::__1::function<void ()> const&, std::__1::function<std::__1::basic_string<char, std::__1::char_traits<char>, std::__1::allocator<char>> ()>), std::__1::function<void ()> const&, std::__1::function<std::__1::basic_string<char, std::__1::char_traits<char>, std::__1::allocator<char>> ()>>(void (*&)(std::__1::function<void ()> const&, std::__1::function<std::__1::basic_string<char, std::__1::char_traits<char>, std::__1::allocator<char>> ()>), std::__1::function<void ()> const&, std::__1::function<std::__1::basic_string<char, std::__1::char_traits<char>, std::__1::allocator<char>> ()>&&)","imageIndex":2,"symbolLocation":40},{"imageOffset":12160168,"sourceLine":348,"sourceFile":"invoke.h","symbol":"void std::__1::__invoke_r[abi:dee210106]<void, void (*&)(std::__1::function<void ()> const&, std::__1::function<std::__1::basic_string<char, std::__1::char_traits<char>, std::__1::allocator<char>> ()>), std::__1::function<void ()> const&, std::__1::function<std::__1::basic_string<char, std::__1::char_traits<char>, std::__1::allocator<char>> ()>>(void (*&)(std::__1::function<void ()> const&, std::__1::function<std::__1::basic_string<char, std::__1::char_traits<char>, std::__1::allocator<char>> ()>), std::__1::function<void ()> const&, std::__1::function<std::__1::basic_string<char, std::__1::char_traits<char>, std::__1::allocator<char>> ()>&&)","imageIndex":2,"symbolLocation":40},{"imageOffset":12159776,"sourceLine":174,"sourceFile":"function.h","symbol":"std::__1::__function::__func<void (*)(std::__1::function<void ()> const&, std::__1::function<std::__1::basic_string<char, std::__1::char_traits<char>, std::__1::allocator<char>> ()>), void (std::__1::function<void ()> const&, std::__1::function<std::__1::basic_string<char, std::__1::char_traits<char>, std::__1::allocator<char>> ()>)>::operator()(std::__1::function<void ()> const&, std::__1::function<std::__1::basic_string<char, std::__1::char_traits<char>, std::__1::allocator<char>> ()>&&)","imageIndex":2,"symbolLocation":44},{"imageOffset":23471204,"sourceLine":274,"sourceFile":"function.h","symbol":"std::__1::__function::__value_func<void (std::__1::function<void ()> const&, std::__1::function<std::__1::basic_string<char, std::__1::char_traits<char>, std::__1::allocator<char>> ()>)>::operator()[abi:dee210106](std::__1::function<void ()> const&, std::__1::function<std::__1::basic_string<char, std::__1::char_traits<char>, std::__1::allocator<char>> ()>&&) const","imageIndex":2,"symbolLocation":76},{"imageOffset":23443684,"sourceLine":772,"sourceFile":"function.h","symbol":"std::__1::function<void (std::__1::function<void ()> const&, std::__1::function<std::__1::basic_string<char, std::__1::char_traits<char>, std::__1::allocator<char>> ()>)>::operator()(std::__1::function<void ()> const&, std::__1::function<std::__1::basic_string<char, std::__1::char_traits<char>, std::__1::allocator<char>> ()>) const","imageIndex":2,"symbolLocation":40},{"imageOffset":23442708,"sourceLine":238,"sourceFile":"JSIExecutor.cpp","symbol":"facebook::react::JSIExecutor::callFunction(std::__1::basic_string<char, std::__1::char_traits<char>, std::__1::allocator<char>> const&, std::__1::basic_string<char, std::__1::char_traits<char>, std::__1::allocator<char>> const&, folly::dynamic const&)","imageIndex":2,"symbolLocation":316},{"imageOffset":22612144,"sourceLine":205,"sourceFile":"NativeToJsBridge.cpp","symbol":"facebook::react::NativeToJsBridge::callFunction(std::__1::basic_string<char, std::__1::char_traits<char>, std::__1::allocator<char>>&&, std::__1::basic_string<char, std::__1::char_traits<char>, std::__1::allocator<char>>&&, folly::dynamic&&)::$_0::operator()(facebook::react::JSExecutor*) const","imageIndex":2,"symbolLocation":636},{"imageOffset":22611496,"sourceLine":87,"sourceFile":"invoke.h","symbol":"std::__1::__invoke_result_impl<void, facebook::react::NativeToJsBridge::callFunction(std::__1::basic_string<char, std::__1::char_traits<char>, std::__1::allocator<char>>&&, std::__1::basic_string<char, std::__1::char_traits<char>, std::__1::allocator<char>>&&, folly::dynamic&&)::$_0&, facebook::react::JSExecutor*>::type std::__1::__invoke[abi:dee210106]<facebook::react::NativeToJsBridge::callFunction(std::__1::basic_string<char, std::__1::char_traits<char>, std::__1::allocator<char>>&&, std::__1::basic_string<char, std::__1::char_traits<char>, std::__1::allocator<char>>&&, folly::dynamic&&)::$_0&, facebook::react::JSExecutor*>(facebook::react::NativeToJsBridge::callFunction(std::__1::basic_string<char, std::__1::char_traits<char>, std::__1::allocator<char>>&&, std::__1::basic_string<char, std::__1::char_traits<char>, std::__1::allocator<char>>&&, folly::dynamic&&)::$_0&, facebook::react::JSExecutor*&&)","imageIndex":2,"symbolLocation":36},{"imageOffset":22611448,"sourceLine":342,"sourceFile":"invoke.h","symbol":"void std::__1::__invoke_void_return_wrapper<void, true>::__call[abi:dee210106]<facebook::react::NativeToJsBridge::callFunction(std::__1::basic_string<char, std::__1::char_traits<char>, std::__1::allocator<char>>&&, std::__1::basic_string<char, std::__1::char_traits<char>, std::__1::allocator<char>>&&, folly::dynamic&&)::$_0&, facebook::react::JSExecutor*>(facebook::react::NativeToJsBridge::callFunction(std::__1::basic_string<char, std::__1::char_traits<char>, std::__1::allocator<char>>&&, std::__1::basic_string<char, std::__1::char_traits<char>, std::__1::allocator<char>>&&, folly::dynamic&&)::$_0&, facebook::react::JSExecutor*&&)","imageIndex":2,"symbolLocation":32},{"imageOffset":22611404,"sourceLine":348,"sourceFile":"invoke.h","symbol":"void std::__1::__invoke_r[abi:dee210106]<void, facebook::react::NativeToJsBridge::callFunction(std::__1::basic_string<char, std::__1::char_traits<char>, std::__1::allocator<char>>&&, std::__1::basic_string<char, std::__1::char_traits<char>, std::__1::allocator<char>>&&, folly::dynamic&&)::$_0&, facebook::react::JSExecutor*>(facebook::react::NativeToJsBridge::callFunction(std::__1::basic_string<char, std::__1::char_traits<char>, std::__1::allocator<char>>&&, std::__1::basic_string<char, std::__1::char_traits<char>, std::__1::allocator<char>>&&, folly::dynamic&&)::$_0&, facebook::react::JSExecutor*&&)","imageIndex":2,"symbolLocation":32},{"imageOffset":22610624,"sourceLine":174,"sourceFile":"function.h","symbol":"std::__1::__function::__func<facebook::react::NativeToJsBridge::callFunction(std::__1::basic_string<char, std::__1::char_traits<char>, std::__1::allocator<char>>&&, std::__1::basic_string<char, std::__1::char_traits<char>, std::__1::allocator<char>>&&, folly::dynamic&&)::$_0, void (facebook::react::JSExecutor*)>::operator()(facebook::react::JSExecutor*&&)","imageIndex":2,"symbolLocation":36},{"imageOffset":22622684,"sourceLine":274,"sourceFile":"function.h","symbol":"std::__1::__function::__value_func<void (facebook::react::JSExecutor*)>::operator()[abi:dee210106](facebook::react::JSExecutor*&&) const","imageIndex":2,"symbolLocation":68},{"imageOffset":22622580,"sourceLine":772,"sourceFile":"function.h","symbol":"std::__1::function<void (facebook::react::JSExecutor*)>::operator()(facebook::react::JSExecutor*) const","imageIndex":2,"symbolLocation":36},{"imageOffset":22622528,"sourceLine":308,"sourceFile":"NativeToJsBridge.cpp","symbol":"facebook::react::NativeToJsBridge::runOnExecutorQueue(std::__1::function<void (facebook::react::JSExecutor*)>&&)::$_0::operator()() const","imageIndex":2,"symbolLocation":92},{"imageOffset":22622424,"sourceLine":87,"sourceFile":"invoke.h","symbol":"std::__1::__invoke_result_impl<void, facebook::react::NativeToJsBridge::runOnExecutorQueue(std::__1::function<void (facebook::react::JSExecutor*)>&&)::$_0&>::type std::__1::__invoke[abi:dee210106]<facebook::react::NativeToJsBridge::runOnExecutorQueue(std::__1::function<void (facebook::react::JSExecutor*)>&&)::$_0&>(facebook::react::NativeToJsBridge::runOnExecutorQueue(std::__1::function<void (facebook::react::JSExecutor*)>&&)::$_0&)","imageIndex":2,"symbolLocation":24},{"imageOffset":22622388,"sourceLine":342,"sourceFile":"invoke.h","symbol":"void std::__1::__invoke_void_return_wrapper<void, true>::__call[abi:dee210106]<facebook::react::NativeToJsBridge::runOnExecutorQueue(std::__1::function<void (facebook::react::JSExecutor*)>&&)::$_0&>(facebook::react::NativeToJsBridge::runOnExecutorQueue(std::__1::function<void (facebook::react::JSExecutor*)>&&)::$_0&)","imageIndex":2,"symbolLocation":24},{"imageOffset":22622352,"sourceLine":348,"sourceFile":"invoke.h","symbol":"void std::__1::__invoke_r[abi:dee210106]<void, facebook::react::NativeToJsBridge::runOnExecutorQueue(std::__1::function<void (facebook::react::JSExecutor*)>&&)::$_0&>(facebook::react::NativeToJsBridge::runOnExecutorQueue(std::__1::function<void (facebook::react::JSExecutor*)>&&)::$_0&)","imageIndex":2,"symbolLocation":24},{"imageOffset":22621228,"sourceLine":174,"sourceFile":"function.h","symbol":"std::__1::__function::__func<facebook::react::NativeToJsBridge::runOnExecutorQueue(std::__1::function<void (facebook::react::JSExecutor*)>&&)::$_0, void ()>::operator()()","imageIndex":2,"symbolLocation":28},{"imageOffset":2960200,"sourceLine":274,"sourceFile":"function.h","symbol":"std::__1::__function::__value_func<void ()>::operator()[abi:dee210106]() const","imageIndex":2,"symbolLocation":60},{"imageOffset":2960128,"sourceLine":772,"sourceFile":"function.h","symbol":"std::__1::function<void ()>::operator()() const","imageIndex":2,"symbolLocation":24},{"imageOffset":12226140,"sourceLine":73,"sourceFile":"RCTCxxUtils.mm","symbol":"facebook::react::tryAndReturnError(std::__1::function<void ()> const&)","imageIndex":2,"symbolLocation":24},{"imageOffset":12394744,"sourceLine":68,"sourceFile":"RCTMessageThread.mm","symbol":"facebook::react::RCTMessageThread::tryFunc(std::__1::function<void ()> const&)","imageIndex":2,"symbolLocation":36},{"imageOffset":12402488,"sourceLine":81,"sourceFile":"RCTMessageThread.mm","symbol":"facebook::react::RCTMessageThread::runOnQueue(std::__1::function<void ()>&&)::$_0::operator()() const","imageIndex":2,"symbolLocation":80},{"imageOffset":12402396,"sourceLine":87,"sourceFile":"invoke.h","symbol":"std::__1::__invoke_result_impl<void, facebook::react::RCTMessageThread::runOnQueue(std::__1::function<void ()>&&)::$_0&>::type std::__1::__invoke[abi:dee210106]<facebook::react::RCTMessageThread::runOnQueue(std::__1::function<void ()>&&)::$_0&>(facebook::react::RCTMessageThread::runOnQueue(std::__1::function<void ()>&&)::$_0&)","imageIndex":2,"symbolLocation":24},{"imageOffset":12402360,"sourceLine":342,"sourceFile":"invoke.h","symbol":"void std::__1::__invoke_void_return_wrapper<void, true>::__call[abi:dee210106]<facebook::react::RCTMessageThread::runOnQueue(std::__1::function<void ()>&&)::$_0&>(facebook::react::RCTMessageThread::runOnQueue(std::__1::function<void ()>&&)::$_0&)","imageIndex":2,"symbolLocation":24},{"imageOffset":12402324,"sourceLine":348,"sourceFile":"invoke.h","symbol":"void std::__1::__invoke_r[abi:dee210106]<void, facebook::react::RCTMessageThread::runOnQueue(std::__1::function<void ()>&&)::$_0&>(facebook::react::RCTMessageThread::runOnQueue(std::__1::function<void ()>&&)::$_0&)","imageIndex":2,"symbolLocation":24},{"imageOffset":12401616,"sourceLine":174,"sourceFile":"function.h","symbol":"std::__1::__function::__func<facebook::react::RCTMessageThread::runOnQueue(std::__1::function<void ()>&&)::$_0, void ()>::operator()()","imageIndex":2,"symbolLocation":28},{"imageOffset":2960200,"sourceLine":274,"sourceFile":"function.h","symbol":"std::__1::__function::__value_func<void ()>::operator()[abi:dee210106]() const","imageIndex":2,"symbolLocation":60},{"imageOffset":2960128,"sourceLine":772,"sourceFile":"function.h","symbol":"std::__1::function<void ()>::operator()() const","imageIndex":2,"symbolLocation":24},{"imageOffset":12394136,"sourceLine":44,"sourceFile":"RCTMessageThread.mm","symbol":"invocation function for block in facebook::react::RCTMessageThread::runAsync(std::__1::function<void ()>)","imageIndex":2,"symbolLocation":48},{"imageOffset":605480,"symbol":"__CFRUNLOOP_IS_CALLING_OUT_TO_A_BLOCK__","symbolLocation":20,"imageIndex":17},{"imageOffset":603316,"symbol":"__CFRunLoopDoBlocks","symbolLocation":340,"imageIndex":17},{"imageOffset":601592,"symbol":"__CFRunLoopRun","symbolLocation":2280,"imageIndex":17},{"imageOffset":579844,"symbol":"_CFRunLoopRunSpecificWithOptions","symbolLocation":496,"imageIndex":17},{"imageOffset":12079772,"sourceLine":350,"sourceFile":"RCTCxxBridge.mm","symbol":"+[RCTCxxBridge runRunLoop]","imageIndex":2,"symbolLocation":772},{"imageOffset":9522908,"symbol":"__NSThread__start__","symbolLocation":716,"imageIndex":21},{"imageOffset":26172,"symbol":"_pthread_start","symbolLocation":104,"imageIndex":13},{"imageOffset":6708,"symbol":"thread_start","symbolLocation":8,"imageIndex":13}]},{"id":449731,"name":"hades","threadState":{"x":[{"value":260},{"value":0},{"value":92416},{"value":0},{"value":0},{"value":160},{"value":0},{"value":0},{"value":6113914536},{"value":0},{"value":0},{"value":2},{"value":2},{"value":0},{"value":0},{"value":0},{"value":305},{"value":18446744072367376383},{"value":0},{"value":5023120000},{"value":5023120064},{"value":6113915104},{"value":0},{"value":0},{"value":92416},{"value":92417},{"value":92672},{"value":0},{"value":0}],"flavor":"ARM_THREAD_STATE64","lr":{"value":4367969024},"cpsr":{"value":1610612736},"fp":{"value":6113914656},"sp":{"value":6113914512},"esr":{"value":1442840704,"description":"(Syscall)"},"pc":{"value":4369023020},"far":{"value":0}},"frames":[{"imageOffset":16428,"symbol":"__psynch_cvwait","symbolLocation":8,"imageIndex":12},{"imageOffset":27392,"symbol":"_pthread_cond_wait","symbolLocation":972,"imageIndex":13},{"imageOffset":132612,"symbol":"std::__1::condition_variable::wait(std::__1::unique_lock<std::__1::mutex>&)","symbolLocation":28,"imageIndex":25},{"imageOffset":1716640,"symbol":"hermes::vm::HadesGC::Executor::worker()","symbolLocation":112,"imageIndex":4},{"imageOffset":1716484,"symbol":"void* std::__1::__thread_proxy[abi:v160006]<std::__1::tuple<std::__1::unique_ptr<std::__1::__thread_struct, std::__1::default_delete<std::__1::__thread_struct>>, hermes::vm::HadesGC::Executor::Executor()::'lambda'()>>(void*)","symbolLocation":44,"imageIndex":4},{"imageOffset":26172,"symbol":"_pthread_start","symbolLocation":104,"imageIndex":13},{"imageOffset":6708,"symbol":"thread_start","symbolLocation":8,"imageIndex":13}]},{"id":449764,"name":"hades","threadState":{"x":[{"value":260},{"value":0},{"value":0},{"value":0},{"value":0},{"value":160},{"value":0},{"value":0},{"value":6101905064},{"value":0},{"value":0},{"value":2},{"value":2},{"value":0},{"value":0},{"value":0},{"value":305},{"value":0},{"value":0},{"value":4667482176},{"value":4667482240},{"value":6101905632},{"value":0},{"value":0},{"value":0},{"value":1},{"value":256},{"value":0},{"value":0}],"flavor":"ARM_THREAD_STATE64","lr":{"value":4367969024},"cpsr":{"value":1610612736},"fp":{"value":6101905184},"sp":{"value":6101905040},"esr":{"value":1442840704,"description":"(Syscall)"},"pc":{"value":4369023020},"far":{"value":0}},"frames":[{"imageOffset":16428,"symbol":"__psynch_cvwait","symbolLocation":8,"imageIndex":12},{"imageOffset":27392,"symbol":"_pthread_cond_wait","symbolLocation":972,"imageIndex":13},{"imageOffset":132612,"symbol":"std::__1::condition_variable::wait(std::__1::unique_lock<std::__1::mutex>&)","symbolLocation":28,"imageIndex":25},{"imageOffset":1716640,"symbol":"hermes::vm::HadesGC::Executor::worker()","symbolLocation":112,"imageIndex":4},{"imageOffset":1716484,"symbol":"void* std::__1::__thread_proxy[abi:v160006]<std::__1::tuple<std::__1::unique_ptr<std::__1::__thread_struct, std::__1::default_delete<std::__1::__thread_struct>>, hermes::vm::HadesGC::Executor::Executor()::'lambda'()>>(void*)","symbolLocation":44,"imageIndex":4},{"imageOffset":26172,"symbol":"_pthread_start","symbolLocation":104,"imageIndex":13},{"imageOffset":6708,"symbol":"thread_start","symbolLocation":8,"imageIndex":13}]},{"id":964655,"frames":[],"threadState":{"x":[{"value":6107066368},{"value":82755},{"value":6106529792},{"value":0},{"value":409604},{"value":18446744073709551615},{"value":0},{"value":0},{"value":0},{"value":0},{"value":0},{"value":0},{"value":0},{"value":0},{"value":0},{"value":0},{"value":0},{"value":0},{"value":0},{"value":0},{"value":0},{"value":0},{"value":0},{"value":0},{"value":0},{"value":0},{"value":0},{"value":0},{"value":0}],"flavor":"ARM_THREAD_STATE64","lr":{"value":0},"cpsr":{"value":0},"fp":{"value":0},"sp":{"value":6107066368},"esr":{"value":1442840704,"description":"(Syscall)"},"pc":{"value":4367948320},"far":{"value":0}}}],
  "usedImages" : [
  {
    "source" : "P",
    "arch" : "arm64",
    "base" : 4365533184,
    "CFBundleShortVersionString" : "1.2.0",
    "CFBundleIdentifier" : "com.ismail.motocortexv2",
    "size" : 16384,
    "uuid" : "f4cc10dd-9f97-363b-b4a0-a00392681e22",
    "path" : "\/Users\/USER\/Library\/Developer\/CoreSimulator\/Devices\/D90D7F2D-2DF3-4611-8356-BDEDCC12E373\/data\/Containers\/Bundle\/Application\/A35321C8-ED14-4756-A028-000C4006D4E2\/MotoCortex.app\/MotoCortex",
    "name" : "MotoCortex",
    "CFBundleVersion" : "53"
  },
  {
    "source" : "P",
    "arch" : "arm64",
    "base" : 4368236544,
    "size" : 327680,
    "uuid" : "ba544d9a-46ab-3c59-a00f-aba1479d2079",
    "path" : "\/Volumes\/VOLUME\/*\/dyld_sim",
    "name" : "dyld_sim"
  },
  {
    "source" : "P",
    "arch" : "arm64",
    "base" : 4438736896,
    "size" : 27901952,
    "uuid" : "abe639d9-2540-3fb5-9ccc-9af8bb4743aa",
    "path" : "\/Users\/USER\/Library\/Developer\/CoreSimulator\/Devices\/D90D7F2D-2DF3-4611-8356-BDEDCC12E373\/data\/Containers\/Bundle\/Application\/A35321C8-ED14-4756-A028-000C4006D4E2\/MotoCortex.app\/MotoCortex.debug.dylib",
    "name" : "MotoCortex.debug.dylib"
  },
  {
    "source" : "P",
    "arch" : "arm64",
    "base" : 4370104320,
    "CFBundleIdentifier" : "io.vlcn.crsqlite",
    "size" : 589824,
    "uuid" : "01bd5c62-4036-30bd-94be-6a5b43f03062",
    "path" : "\/Users\/USER\/Library\/Developer\/CoreSimulator\/Devices\/D90D7F2D-2DF3-4611-8356-BDEDCC12E373\/data\/Containers\/Bundle\/Application\/A35321C8-ED14-4756-A028-000C4006D4E2\/MotoCortex.app\/Frameworks\/crsqlite.framework\/crsqlite",
    "name" : "crsqlite"
  },
  {
    "source" : "P",
    "arch" : "arm64",
    "base" : 4377788416,
    "CFBundleShortVersionString" : "0.12.0",
    "CFBundleIdentifier" : "dev.hermesengine.iphonesimulator",
    "size" : 3604480,
    "uuid" : "15c2519b-0ac7-3032-b055-957892e423e1",
    "path" : "\/Users\/USER\/Library\/Developer\/CoreSimulator\/Devices\/D90D7F2D-2DF3-4611-8356-BDEDCC12E373\/data\/Containers\/Bundle\/Application\/A35321C8-ED14-4756-A028-000C4006D4E2\/MotoCortex.app\/Frameworks\/hermes.framework\/hermes",
    "name" : "hermes",
    "CFBundleVersion" : "0.12.0"
  },
  {
    "source" : "P",
    "arch" : "arm64",
    "base" : 4365697024,
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
    "base" : 4367597568,
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
    "base" : 4384391168,
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
    "base" : 4365778944,
    "size" : 16384,
    "uuid" : "3119af59-1eaa-3731-a7cb-c21c556b63c0",
    "path" : "\/Volumes\/VOLUME\/*\/libswiftDataDetection.dylib",
    "name" : "libswiftDataDetection.dylib"
  },
  {
    "source" : "P",
    "arch" : "arm64",
    "base" : 4365860864,
    "size" : 16384,
    "uuid" : "710be927-bac3-3b9e-b7ce-dbe0c5e8e2a5",
    "path" : "\/Volumes\/VOLUME\/*\/libswiftUIKit.dylib",
    "name" : "libswiftUIKit.dylib"
  },
  {
    "source" : "P",
    "arch" : "arm64",
    "base" : 4365910016,
    "size" : 16384,
    "uuid" : "8c7e08c0-69a9-3be9-8f41-60c74fba8e5c",
    "path" : "\/Volumes\/VOLUME\/*\/libswiftFileProvider.dylib",
    "name" : "libswiftFileProvider.dylib"
  },
  {
    "source" : "P",
    "arch" : "arm64",
    "base" : 4365959168,
    "size" : 49152,
    "uuid" : "7e129155-1748-370c-8edc-d762067a6d9f",
    "path" : "\/usr\/lib\/system\/libsystem_platform.dylib",
    "name" : "libsystem_platform.dylib"
  },
  {
    "source" : "P",
    "arch" : "arm64",
    "base" : 4369006592,
    "size" : 245760,
    "uuid" : "26cfe427-c180-3145-8d46-de3129b1cd2a",
    "path" : "\/usr\/lib\/system\/libsystem_kernel.dylib",
    "name" : "libsystem_kernel.dylib"
  },
  {
    "source" : "P",
    "arch" : "arm64",
    "base" : 4367941632,
    "size" : 65536,
    "uuid" : "85a501d2-0b0e-3dea-b121-b24119d80cfe",
    "path" : "\/usr\/lib\/system\/libsystem_pthread.dylib",
    "name" : "libsystem_pthread.dylib"
  },
  {
    "source" : "P",
    "arch" : "arm64",
    "base" : 4371988480,
    "size" : 49152,
    "uuid" : "75fa6778-178f-394f-9c63-711780430596",
    "path" : "\/Volumes\/VOLUME\/*\/libobjc-trampolines.dylib",
    "name" : "libobjc-trampolines.dylib"
  },
  {
    "source" : "P",
    "arch" : "arm64",
    "base" : 4584964096,
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
    "base" : 4366188544,
    "size" : 737280,
    "uuid" : "74e52480-c2bd-3c8d-812d-95fe2b74a096",
    "path" : "\/usr\/lib\/dyld",
    "name" : "dyld"
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
    "base" : 6443520000,
    "size" : 11689,
    "uuid" : "a5fdf1ff-b793-3574-8903-d24571eacd25",
    "path" : "\/Volumes\/VOLUME\/*\/libsystem_blocks.dylib",
    "name" : "libsystem_blocks.dylib"
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
    "base" : 6444044288,
    "size" : 283584,
    "uuid" : "42b50931-38d5-3a5d-90ef-0fd7239c408d",
    "path" : "\/Volumes\/VOLUME\/*\/libdispatch.dylib",
    "name" : "libdispatch.dylib"
  },
  {
    "source" : "P",
    "arch" : "arm64",
    "base" : 6445465600,
    "size" : 561312,
    "uuid" : "fd646c4c-99c5-3828-8199-3a66a48ff1a1",
    "path" : "\/Volumes\/VOLUME\/*\/libc++.1.dylib",
    "name" : "libc++.1.dylib"
  }
],
  "sharedCache" : {
  "base" : 6442450944,
  "size" : 3385917440,
  "uuid" : "6aac9222-ef8b-395b-bee6-39194dfba095"
},
  "legacyInfo" : {
  "threadTriggered" : {
    "name" : "com.facebook.react.JavaScript"
  }
},
  "logWritingSignature" : "a816af14b3c4be71ba393ca409565725982a33d8",
  "bug_type" : "309",
  "roots_installed" : 0,
  "trmStatus" : 8192,
  "trialInfo" : {
  "rollouts" : [
    {
      "rolloutId" : "699d4a6bb3c59721f0815d4a",
      "factorPackIds" : [
        "6a1e847dfae8a60fe3d88f20",
        "6a1e847ffae8a60fe3d88f21",
        "6a1e847fe5700036461dd986",
        "6a1e848059a97e607a107573"
      ],
      "deploymentId" : 240000047
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

Model: Mac16,10, BootROM 18000.161.10, proc 10:4:6:0 processors, 16 GB, SMC 
Graphics: Apple M4, Apple M4, Built-In
Display: CBA242Y, 1920 x 1080 (1080p FHD - Full High Definition), Main, MirrorOff, Online
Memory Module: LPDDR5, Micron
AirPort: spairport_wireless_card_type_wifi (0x14E4, 0x4388), wl0: Jul 10 2026 02:27:19 version 23.50.20.2.41.51.209 FWID 01-446b83ed
IO80211_driverkit-1566.5 "IO80211_driverkit-1566.5" Jul 31 2026 19:08:25
AirPort: 
Bluetooth: Version (null), 0 services, 0 devices, 0 incoming serial ports
Network Service: Wi-Fi, AirPort, en1
Thunderbolt Bus: Mac mini, Apple Inc.
Thunderbolt Bus: Mac mini, Apple Inc.
Thunderbolt Bus: Mac mini, Apple Inc.
