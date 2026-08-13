-------------------------------------
Translated Report (Full Report Below)
-------------------------------------
Process:             MotoCortex [13291]
Path:                /Users/USER/Library/Developer/CoreSimulator/Devices/D90D7F2D-2DF3-4611-8356-BDEDCC12E373/data/Containers/Bundle/Application/B96FADAA-9DF9-499D-836B-3A35BD3BAE61/MotoCortex.app/MotoCortex
Identifier:          com.ismail.motocortexv2
Version:             1.1.0 (41)
Code Type:           ARM-64 (Native)
Role:                Foreground
Parent Process:      launchd_sim [12751]
Coalition:           com.apple.CoreSimulator.SimDevice.D90D7F2D-2DF3-4611-8356-BDEDCC12E373 [3338]
Responsible Process: SimulatorTrampoline [12561]
User ID:             501

Date/Time:           2026-08-12 21:16:59.4571 +0300
Launch Time:         2026-08-12 13:48:42.3970 +0300
Hardware Model:      Mac16,10
OS Version:          macOS 26.5.2 (25F84)
Release Type:        User

Crash Reporter Key:  3D338F32-AE74-8406-89A9-2E77384557C6
Incident Identifier: 8FE9B5C8-92F7-455D-ABBB-25DE7A6760ED

Time Awake Since Boot: 43000 seconds

System Integrity Protection: enabled

Triggered by Thread: 5  com.facebook.react.JavaScript

Exception Type:    EXC_BAD_ACCESS (SIGSEGV)
Exception Subtype: KERN_INVALID_ADDRESS at 0x0000000000000000
Exception Codes:   0x0000000000000001, 0x0000000000000000

Termination Reason:  Namespace SIGNAL, Code 11, Segmentation fault: 11
Terminating Process: exc handler [13291]


VM Region Info: 0 is not in any region.  Bytes before following region: 4299653120
      REGION TYPE                    START - END         [ VSIZE] PRT/MAX SHRMOD  REGION DETAIL
      UNUSED SPACE AT START
--->  
      __TEXT                      100478000-10047c000    [   16K] r-x/r-x SM=COW  /Users/USER/Library/Developer/CoreSimulator/Devices/D90D7F2D-2DF3-4611-8356-BDEDCC12E373/data/Containers/Bundle/Application/B96FADAA-9DF9-499D-836B-3A35BD3BAE61/MotoCortex.app/MotoCortex

Thread 0::  Dispatch queue: com.apple.main-thread
0   libsystem_kernel.dylib        	       0x100638b70 mach_msg2_trap + 8
1   libsystem_kernel.dylib        	       0x100649e5c mach_msg2_internal + 72
2   libsystem_kernel.dylib        	       0x100640c44 mach_msg_overwrite + 484
3   libsystem_kernel.dylib        	       0x100638ef0 mach_msg + 20
4   CoreFoundation                	       0x1804227c0 __CFRunLoopServiceMachPort + 156
5   CoreFoundation                	       0x180421978 __CFRunLoopRun + 1128
6   CoreFoundation                	       0x18041c904 _CFRunLoopRunSpecificWithOptions + 496
7   GraphicsServices              	       0x1933599c0 GSEventRunModal + 116
8   UIKitCore                     	       0x1864a54cc -[UIApplication _run] + 776
9   UIKitCore                     	       0x186b9f910 UIApplicationMain + 120
10  MotoCortex.debug.dylib        	       0x104a9f458 __debug_main_executable_dylib_entry_point + 96 (main.m:7)
11  dyld_sim                      	       0x1005330e4 start_sim + 20
12  dyld                          	       0x10076fe00 start + 6992

Thread 1:: com.apple.uikit.eventfetch-thread
0   libsystem_kernel.dylib        	       0x100638b70 mach_msg2_trap + 8
1   libsystem_kernel.dylib        	       0x100649e5c mach_msg2_internal + 72
2   libsystem_kernel.dylib        	       0x100640c44 mach_msg_overwrite + 484
3   libsystem_kernel.dylib        	       0x100638ef0 mach_msg + 20
4   CoreFoundation                	       0x1804227c0 __CFRunLoopServiceMachPort + 156
5   CoreFoundation                	       0x180421978 __CFRunLoopRun + 1128
6   CoreFoundation                	       0x18041c904 _CFRunLoopRunSpecificWithOptions + 496
7   Foundation                    	       0x18112fa4c -[NSRunLoop(NSRunLoop) runMode:beforeDate:] + 208
8   Foundation                    	       0x18112fc68 -[NSRunLoop(NSRunLoop) runUntilDate:] + 60
9   UIKitCore                     	       0x1861d7ad4 -[UIEventFetcher threadMain] + 404
10  Foundation                    	       0x181154edc __NSThread__start__ + 716
11  libsystem_pthread.dylib       	       0x10099e63c _pthread_start + 104
12  libsystem_pthread.dylib       	       0x100999a34 thread_start + 8

Thread 2:: com.google.firebase.crashlytics.MachExceptionServer
0   libsystem_kernel.dylib        	       0x10063c2f8 write + 8
1   MotoCortex.debug.dylib        	       0x1050084ec FIRCLSSDKFileLog + 392
2   MotoCortex.debug.dylib        	       0x10500b504 FIRCLSMachExceptionReply + 320
3   MotoCortex.debug.dylib        	       0x10500ae20 FIRCLSMachExceptionServer + 100
4   libsystem_pthread.dylib       	       0x10099e63c _pthread_start + 104
5   libsystem_pthread.dylib       	       0x100999a34 thread_start + 8

Thread 3:: com.facebook.SocketRocket.NetworkThread
0   libsystem_kernel.dylib        	       0x100638b70 mach_msg2_trap + 8
1   libsystem_kernel.dylib        	       0x100649e5c mach_msg2_internal + 72
2   libsystem_kernel.dylib        	       0x100640c44 mach_msg_overwrite + 484
3   libsystem_kernel.dylib        	       0x100638ef0 mach_msg + 20
4   CoreFoundation                	       0x1804227c0 __CFRunLoopServiceMachPort + 156
5   CoreFoundation                	       0x180421978 __CFRunLoopRun + 1128
6   CoreFoundation                	       0x18041c904 _CFRunLoopRunSpecificWithOptions + 496
7   Foundation                    	       0x18112fa4c -[NSRunLoop(NSRunLoop) runMode:beforeDate:] + 208
8   MotoCortex.debug.dylib        	       0x105fc6810 -[SRRunLoopThread main] + 268
9   Foundation                    	       0x181154edc __NSThread__start__ + 716
10  libsystem_pthread.dylib       	       0x10099e63c _pthread_start + 104
11  libsystem_pthread.dylib       	       0x100999a34 thread_start + 8

Thread 4:: com.apple.NSURLConnectionLoader
0   libsystem_kernel.dylib        	       0x100638b70 mach_msg2_trap + 8
1   libsystem_kernel.dylib        	       0x100649e5c mach_msg2_internal + 72
2   libsystem_kernel.dylib        	       0x100640c44 mach_msg_overwrite + 484
3   libsystem_kernel.dylib        	       0x100638ef0 mach_msg + 20
4   CoreFoundation                	       0x1804227c0 __CFRunLoopServiceMachPort + 156
5   CoreFoundation                	       0x180421978 __CFRunLoopRun + 1128
6   CoreFoundation                	       0x18041c904 _CFRunLoopRunSpecificWithOptions + 496
7   CFNetwork                     	       0x184fb8020 +[__CFN_CoreSchedulingSetRunnable _run:] + 368
8   Foundation                    	       0x181154edc __NSThread__start__ + 716
9   libsystem_pthread.dylib       	       0x10099e63c _pthread_start + 104
10  libsystem_pthread.dylib       	       0x100999a34 thread_start + 8

Thread 5 Crashed:: com.facebook.react.JavaScript
0   hermes                        	       0x100fe89a4 facebook::hermes::detail::hermesFatalErrorHandler(void*, std::__1::basic_string<char, std::__1::char_traits<char>, std::__1::allocator<char>> const&, bool) + 28
1   hermes                        	       0x1012f0a98 llvh::report_fatal_error(llvh::Twine const&, bool) + 260
2   hermes                        	       0x1012f0b64 llvh::report_fatal_error(std::__1::basic_string<char, std::__1::char_traits<char>, std::__1::allocator<char>> const&, bool) + 32
3   hermes                        	       0x1012dacd4 hermes::hermes_fatal(llvh::StringRef, std::__1::error_code) + 156
4   hermes                        	       0x1010aa154 hermes::vm::GCBase::oom(std::__1::error_code) + 152
5   hermes                        	       0x101184400 hermes::vm::HadesGC::OldGen::alloc(unsigned int) + 380
6   hermes                        	       0x10118ae38 void hermes::vm::HadesGC::scanDirtyCardsForSegment<false>(hermes::vm::SlotVisitor<hermes::vm::HadesGC::EvacAcceptor<false>>&, hermes::vm::HadesGC::HeapSegment&) + 752
7   hermes                        	       0x101184f6c void hermes::vm::HadesGC::youngGenEvacuateImpl<hermes::vm::HadesGC::EvacAcceptor<false>>(hermes::vm::HadesGC::EvacAcceptor<false>&, bool) + 160
8   hermes                        	       0x101181788 hermes::vm::HadesGC::youngGenCollection(std::__1::basic_string<char, std::__1::char_traits<char>, std::__1::allocator<char>>, bool) + 780
9   hermes                        	       0x1011841ec hermes::vm::HadesGC::allocSlow(unsigned int) + 152
10  hermes                        	       0x1010ca0e0 hermes::vm::Environment* hermes::vm::GCBase::makeA<hermes::vm::Environment, false, (hermes::vm::HasFinalizer)0, (hermes::vm::LongLived)0, hermes::vm::Runtime&, hermes::vm::Handle<hermes::vm::Environment>&, unsigned int&>(unsigned int, hermes::vm::Runtime&, hermes::vm::Handle<hermes::vm::Environment>&, unsigned int&) + 212
11  hermes                        	       0x1010bf2f4 hermes::vm::CallResult<hermes::vm::HermesValue, (hermes::vm::detail::CallResultSpecialize)2> hermes::vm::Interpreter::interpretFunction<false, false>(hermes::vm::Runtime&, hermes::vm::InterpreterState&) + 8060
12  hermes                        	       0x1010bd344 hermes::vm::Runtime::interpretFunctionImpl(hermes::vm::CodeBlock*) + 132
13  hermes                        	       0x1010a3e84 hermes::vm::JSFunction::_callImpl(hermes::vm::Handle<hermes::vm::Callable>, hermes::vm::Runtime&) + 40
14  hermes                        	       0x1010a2124 hermes::vm::Callable::executeCall3(hermes::vm::Handle<hermes::vm::Callable>, hermes::vm::Runtime&, hermes::vm::Handle<hermes::vm::HermesValue>, hermes::vm::HermesValue, hermes::vm::HermesValue, hermes::vm::HermesValue, bool) + 200
15  hermes                        	       0x1010e6258 hermes::vm::JSMapImpl<(hermes::vm::CellKind)47>::forEach(hermes::vm::Handle<hermes::vm::JSMapImpl<(hermes::vm::CellKind)47>>, hermes::vm::Runtime&, hermes::vm::Handle<hermes::vm::Callable>, hermes::vm::Handle<hermes::vm::HermesValue>) + 204
16  hermes                        	       0x101157604 hermes::vm::setPrototypeForEach(void*, hermes::vm::Runtime&, hermes::vm::NativeArgs) + 252
17  hermes                        	       0x1010a3bb0 hermes::vm::NativeFunction::_nativeCall(hermes::vm::NativeFunction*, hermes::vm::Runtime&) + 144
18  hermes                        	       0x1010bdc80 hermes::vm::CallResult<hermes::vm::HermesValue, (hermes::vm::detail::CallResultSpecialize)2> hermes::vm::Interpreter::interpretFunction<false, false>(hermes::vm::Runtime&, hermes::vm::InterpreterState&) + 2312
19  hermes                        	       0x1010bd344 hermes::vm::Runtime::interpretFunctionImpl(hermes::vm::CodeBlock*) + 132
20  hermes                        	       0x1010a3e84 hermes::vm::JSFunction::_callImpl(hermes::vm::Handle<hermes::vm::Callable>, hermes::vm::Runtime&) + 40
21  hermes                        	       0x1010a281c hermes::vm::Callable::executeCall(hermes::vm::Handle<hermes::vm::Callable>, hermes::vm::Runtime&, hermes::vm::Handle<hermes::vm::HermesValue>, hermes::vm::Handle<hermes::vm::HermesValue>, hermes::vm::Handle<hermes::vm::JSObject>) + 1348
22  hermes                        	       0x10116304c hermes::vm::functionPrototypeApply(void*, hermes::vm::Runtime&, hermes::vm::NativeArgs) + 320
23  hermes                        	       0x1010a3bb0 hermes::vm::NativeFunction::_nativeCall(hermes::vm::NativeFunction*, hermes::vm::Runtime&) + 144
24  hermes                        	       0x1010bdc80 hermes::vm::CallResult<hermes::vm::HermesValue, (hermes::vm::detail::CallResultSpecialize)2> hermes::vm::Interpreter::interpretFunction<false, false>(hermes::vm::Runtime&, hermes::vm::InterpreterState&) + 2312
25  hermes                        	       0x1010bd344 hermes::vm::Runtime::interpretFunctionImpl(hermes::vm::CodeBlock*) + 132
26  hermes                        	       0x1010a3e84 hermes::vm::JSFunction::_callImpl(hermes::vm::Handle<hermes::vm::Callable>, hermes::vm::Runtime&) + 40
27  hermes                        	       0x1010a281c hermes::vm::Callable::executeCall(hermes::vm::Handle<hermes::vm::Callable>, hermes::vm::Runtime&, hermes::vm::Handle<hermes::vm::HermesValue>, hermes::vm::Handle<hermes::vm::HermesValue>, hermes::vm::Handle<hermes::vm::JSObject>) + 1348
28  hermes                        	       0x10116304c hermes::vm::functionPrototypeApply(void*, hermes::vm::Runtime&, hermes::vm::NativeArgs) + 320
29  hermes                        	       0x1010a3bb0 hermes::vm::NativeFunction::_nativeCall(hermes::vm::NativeFunction*, hermes::vm::Runtime&) + 144
30  hermes                        	       0x1010bdc80 hermes::vm::CallResult<hermes::vm::HermesValue, (hermes::vm::detail::CallResultSpecialize)2> hermes::vm::Interpreter::interpretFunction<false, false>(hermes::vm::Runtime&, hermes::vm::InterpreterState&) + 2312
31  hermes                        	       0x1010bd344 hermes::vm::Runtime::interpretFunctionImpl(hermes::vm::CodeBlock*) + 132
32  hermes                        	       0x1010a3e84 hermes::vm::JSFunction::_callImpl(hermes::vm::Handle<hermes::vm::Callable>, hermes::vm::Runtime&) + 40
33  hermes                        	       0x1010a36d4 hermes::vm::BoundFunction::_boundCall(hermes::vm::BoundFunction*, hermes::inst::Inst const*, hermes::vm::Runtime&) + 584
34  hermes                        	       0x100fef860 facebook::hermes::HermesRuntimeImpl::call(facebook::jsi::Function const&, facebook::jsi::Value const&, facebook::jsi::Value const*, unsigned long) + 744
35  MotoCortex.debug.dylib        	       0x10554a25c facebook::jsi::RuntimeDecorator<facebook::jsi::Runtime, facebook::jsi::Runtime>::call(facebook::jsi::Function const&, facebook::jsi::Value const&, facebook::jsi::Value const*, unsigned long) + 76
36  MotoCortex.debug.dylib        	       0x10614cc00 facebook::jsi::WithRuntimeDecorator<facebook::react::(anonymous namespace)::ReentrancyCheck, facebook::jsi::Runtime, facebook::jsi::Runtime>::call(facebook::jsi::Function const&, facebook::jsi::Value const&, facebook::jsi::Value const*, unsigned long) + 88
37  MotoCortex.debug.dylib        	       0x104d26e9c facebook::jsi::Function::call(facebook::jsi::Runtime&, facebook::jsi::Value const*, unsigned long) const + 100
38  MotoCortex.debug.dylib        	       0x104d26dec facebook::jsi::Function::call(facebook::jsi::Runtime&, std::initializer_list<facebook::jsi::Value>) const + 112
39  MotoCortex.debug.dylib        	       0x1060ca44c facebook::jsi::Value facebook::jsi::Function::call<std::__1::basic_string<char, std::__1::char_traits<char>, std::__1::allocator<char>> const&, std::__1::basic_string<char, std::__1::char_traits<char>, std::__1::allocator<char>> const&, facebook::jsi::Value>(facebook::jsi::Runtime&, std::__1::basic_string<char, std::__1::char_traits<char>, std::__1::allocator<char>> const&, std::__1::basic_string<char, std::__1::char_traits<char>, std::__1::allocator<char>> const&, facebook::jsi::Value&&) const + 228
40  MotoCortex.debug.dylib        	       0x1060ca2f8 facebook::react::JSIExecutor::callFunction(std::__1::basic_string<char, std::__1::char_traits<char>, std::__1::allocator<char>> const&, std::__1::basic_string<char, std::__1::char_traits<char>, std::__1::allocator<char>> const&, folly::dynamic const&)::$_0::operator()() const + 140
41  MotoCortex.debug.dylib        	       0x1060ca260 std::__1::__invoke_result_impl<void, facebook::react::JSIExecutor::callFunction(std::__1::basic_string<char, std::__1::char_traits<char>, std::__1::allocator<char>> const&, std::__1::basic_string<char, std::__1::char_traits<char>, std::__1::allocator<char>> const&, folly::dynamic const&)::$_0&>::type std::__1::__invoke[abi:dee210106]<facebook::react::JSIExecutor::callFunction(std::__1::basic_string<char, std::__1::char_traits<char>, std::__1::allocator<char>> const&, std::__1::basic_string<char, std::__1::char_traits<char>, std::__1::allocator<char>> const&, folly::dynamic const&)::$_0&>(facebook::react::JSIExecutor::callFunction(std::__1::basic_string<char, std::__1::char_traits<char>, std::__1::allocator<char>> const&, std::__1::basic_string<char, std::__1::char_traits<char>, std::__1::allocator<char>> const&, folly::dynamic const&)::$_0&) + 24
42  MotoCortex.debug.dylib        	       0x1060ca23c void std::__1::__invoke_void_return_wrapper<void, true>::__call[abi:dee210106]<facebook::react::JSIExecutor::callFunction(std::__1::basic_string<char, std::__1::char_traits<char>, std::__1::allocator<char>> const&, std::__1::basic_string<char, std::__1::char_traits<char>, std::__1::allocator<char>> const&, folly::dynamic const&)::$_0&>(facebook::react::JSIExecutor::callFunction(std::__1::basic_string<char, std::__1::char_traits<char>, std::__1::allocator<char>> const&, std::__1::basic_string<char, std::__1::char_traits<char>, std::__1::allocator<char>> const&, folly::dynamic const&)::$_0&) + 24
43  MotoCortex.debug.dylib        	       0x1060ca218 void std::__1::__invoke_r[abi:dee210106]<void, facebook::react::JSIExecutor::callFunction(std::__1::basic_string<char, std::__1::char_traits<char>, std::__1::allocator<char>> const&, std::__1::basic_string<char, std::__1::char_traits<char>, std::__1::allocator<char>> const&, folly::dynamic const&)::$_0&>(facebook::react::JSIExecutor::callFunction(std::__1::basic_string<char, std::__1::char_traits<char>, std::__1::allocator<char>> const&, std::__1::basic_string<char, std::__1::char_traits<char>, std::__1::allocator<char>> const&, folly::dynamic const&)::$_0&) + 24
44  MotoCortex.debug.dylib        	       0x1060ca0cc std::__1::__function::__func<facebook::react::JSIExecutor::callFunction(std::__1::basic_string<char, std::__1::char_traits<char>, std::__1::allocator<char>> const&, std::__1::basic_string<char, std::__1::char_traits<char>, std::__1::allocator<char>> const&, folly::dynamic const&)::$_0, void ()>::operator()() + 28
45  MotoCortex.debug.dylib        	       0x104d3bec8 std::__1::__function::__value_func<void ()>::operator()[abi:dee210106]() const + 60
46  MotoCortex.debug.dylib        	       0x104d3be80 std::__1::function<void ()>::operator()() const + 24
47  MotoCortex.debug.dylib        	       0x1056000b8 facebook::react::JSIExecutor::defaultTimeoutInvoker(std::__1::function<void ()> const&, std::__1::function<std::__1::basic_string<char, std::__1::char_traits<char>, std::__1::allocator<char>> ()>) + 28
48  MotoCortex.debug.dylib        	       0x105600690 std::__1::__invoke_result_impl<void, void (*&)(std::__1::function<void ()> const&, std::__1::function<std::__1::basic_string<char, std::__1::char_traits<char>, std::__1::allocator<char>> ()>), std::__1::function<void ()> const&, std::__1::function<std::__1::basic_string<char, std::__1::char_traits<char>, std::__1::allocator<char>> ()>>::type std::__1::__invoke[abi:dee210106]<void (*&)(std::__1::function<void ()> const&, std::__1::function<std::__1::basic_string<char, std::__1::char_traits<char>, std::__1::allocator<char>> ()>), std::__1::function<void ()> const&, std::__1::function<std::__1::basic_string<char, std::__1::char_traits<char>, std::__1::allocator<char>> ()>>(void (*&)(std::__1::function<void ()> const&, std::__1::function<std::__1::basic_string<char, std::__1::char_traits<char>, std::__1::allocator<char>> ()>), std::__1::function<void ()> const&, std::__1::function<std::__1::basic_string<char, std::__1::char_traits<char>, std::__1::allocator<char>> ()>&&) + 92
49  MotoCortex.debug.dylib        	       0x105600628 void std::__1::__invoke_void_return_wrapper<void, true>::__call[abi:dee210106]<void (*&)(std::__1::function<void ()> const&, std::__1::function<std::__1::basic_string<char, std::__1::char_traits<char>, std::__1::allocator<char>> ()>), std::__1::function<void ()> const&, std::__1::function<std::__1::basic_string<char, std::__1::char_traits<char>, std::__1::allocator<char>> ()>>(void (*&)(std::__1::function<void ()> const&, std::__1::function<std::__1::basic_string<char, std::__1::char_traits<char>, std::__1::allocator<char>> ()>), std::__1::function<void ()> const&, std::__1::function<std::__1::basic_string<char, std::__1::char_traits<char>, std::__1::allocator<char>> ()>&&) + 40
50  MotoCortex.debug.dylib        	       0x1056005f4 void std::__1::__invoke_r[abi:dee210106]<void, void (*&)(std::__1::function<void ()> const&, std::__1::function<std::__1::basic_string<char, std::__1::char_traits<char>, std::__1::allocator<char>> ()>), std::__1::function<void ()> const&, std::__1::function<std::__1::basic_string<char, std::__1::char_traits<char>, std::__1::allocator<char>> ()>>(void (*&)(std::__1::function<void ()> const&, std::__1::function<std::__1::basic_string<char, std::__1::char_traits<char>, std::__1::allocator<char>> ()>), std::__1::function<void ()> const&, std::__1::function<std::__1::basic_string<char, std::__1::char_traits<char>, std::__1::allocator<char>> ()>&&) + 40
51  MotoCortex.debug.dylib        	       0x10560046c std::__1::__function::__func<void (*)(std::__1::function<void ()> const&, std::__1::function<std::__1::basic_string<char, std::__1::char_traits<char>, std::__1::allocator<char>> ()>), void (std::__1::function<void ()> const&, std::__1::function<std::__1::basic_string<char, std::__1::char_traits<char>, std::__1::allocator<char>> ()>)>::operator()(std::__1::function<void ()> const&, std::__1::function<std::__1::basic_string<char, std::__1::char_traits<char>, std::__1::allocator<char>> ()>&&) + 44
52  MotoCortex.debug.dylib        	       0x1060c9dc4 std::__1::__function::__value_func<void (std::__1::function<void ()> const&, std::__1::function<std::__1::basic_string<char, std::__1::char_traits<char>, std::__1::allocator<char>> ()>)>::operator()[abi:dee210106](std::__1::function<void ()> const&, std::__1::function<std::__1::basic_string<char, std::__1::char_traits<char>, std::__1::allocator<char>> ()>&&) const + 76
53  MotoCortex.debug.dylib        	       0x1060c3244 std::__1::function<void (std::__1::function<void ()> const&, std::__1::function<std::__1::basic_string<char, std::__1::char_traits<char>, std::__1::allocator<char>> ()>)>::operator()(std::__1::function<void ()> const&, std::__1::function<std::__1::basic_string<char, std::__1::char_traits<char>, std::__1::allocator<char>> ()>) const + 40
54  MotoCortex.debug.dylib        	       0x1060c2e74 facebook::react::JSIExecutor::callFunction(std::__1::basic_string<char, std::__1::char_traits<char>, std::__1::allocator<char>> const&, std::__1::basic_string<char, std::__1::char_traits<char>, std::__1::allocator<char>> const&, folly::dynamic const&) + 316
55  MotoCortex.debug.dylib        	       0x105ff8210 facebook::react::NativeToJsBridge::callFunction(std::__1::basic_string<char, std::__1::char_traits<char>, std::__1::allocator<char>>&&, std::__1::basic_string<char, std::__1::char_traits<char>, std::__1::allocator<char>>&&, folly::dynamic&&)::$_0::operator()(facebook::react::JSExecutor*) const + 636
56  MotoCortex.debug.dylib        	       0x105ff7f88 std::__1::__invoke_result_impl<void, facebook::react::NativeToJsBridge::callFunction(std::__1::basic_string<char, std::__1::char_traits<char>, std::__1::allocator<char>>&&, std::__1::basic_string<char, std::__1::char_traits<char>, std::__1::allocator<char>>&&, folly::dynamic&&)::$_0&, facebook::react::JSExecutor*>::type std::__1::__invoke[abi:dee210106]<facebook::react::NativeToJsBridge::callFunction(std::__1::basic_string<char, std::__1::char_traits<char>, std::__1::allocator<char>>&&, std::__1::basic_string<char, std::__1::char_traits<char>, std::__1::allocator<char>>&&, folly::dynamic&&)::$_0&, facebook::react::JSExecutor*>(facebook::react::NativeToJsBridge::callFunction(std::__1::basic_string<char, std::__1::char_traits<char>, std::__1::allocator<char>>&&, std::__1::basic_string<char, std::__1::char_traits<char>, std::__1::allocator<char>>&&, folly::dynamic&&)::$_0&, facebook::react::JSExecutor*&&) + 36
57  MotoCortex.debug.dylib        	       0x105ff7f58 void std::__1::__invoke_void_return_wrapper<void, true>::__call[abi:dee210106]<facebook::react::NativeToJsBridge::callFunction(std::__1::basic_string<char, std::__1::char_traits<char>, std::__1::allocator<char>>&&, std::__1::basic_string<char, std::__1::char_traits<char>, std::__1::allocator<char>>&&, folly::dynamic&&)::$_0&, facebook::react::JSExecutor*>(facebook::react::NativeToJsBridge::callFunction(std::__1::basic_string<char, std::__1::char_traits<char>, std::__1::allocator<char>>&&, std::__1::basic_string<char, std::__1::char_traits<char>, std::__1::allocator<char>>&&, folly::dynamic&&)::$_0&, facebook::react::JSExecutor*&&) + 32
58  MotoCortex.debug.dylib        	       0x105ff7f2c void std::__1::__invoke_r[abi:dee210106]<void, facebook::react::NativeToJsBridge::callFunction(std::__1::basic_string<char, std::__1::char_traits<char>, std::__1::allocator<char>>&&, std::__1::basic_string<char, std::__1::char_traits<char>, std::__1::allocator<char>>&&, folly::dynamic&&)::$_0&, facebook::react::JSExecutor*>(facebook::react::NativeToJsBridge::callFunction(std::__1::basic_string<char, std::__1::char_traits<char>, std::__1::allocator<char>>&&, std::__1::basic_string<char, std::__1::char_traits<char>, std::__1::allocator<char>>&&, folly::dynamic&&)::$_0&, facebook::react::JSExecutor*&&) + 32
59  MotoCortex.debug.dylib        	       0x105ff7c20 std::__1::__function::__func<facebook::react::NativeToJsBridge::callFunction(std::__1::basic_string<char, std::__1::char_traits<char>, std::__1::allocator<char>>&&, std::__1::basic_string<char, std::__1::char_traits<char>, std::__1::allocator<char>>&&, folly::dynamic&&)::$_0, void (facebook::react::JSExecutor*)>::operator()(facebook::react::JSExecutor*&&) + 36
60  MotoCortex.debug.dylib        	       0x105ffab3c std::__1::__function::__value_func<void (facebook::react::JSExecutor*)>::operator()[abi:dee210106](facebook::react::JSExecutor*&&) const + 68
61  MotoCortex.debug.dylib        	       0x105ffaad4 std::__1::function<void (facebook::react::JSExecutor*)>::operator()(facebook::react::JSExecutor*) const + 36
62  MotoCortex.debug.dylib        	       0x105ffaaa0 facebook::react::NativeToJsBridge::runOnExecutorQueue(std::__1::function<void (facebook::react::JSExecutor*)>&&)::$_0::operator()() const + 92
63  MotoCortex.debug.dylib        	       0x105ffaa38 std::__1::__invoke_result_impl<void, facebook::react::NativeToJsBridge::runOnExecutorQueue(std::__1::function<void (facebook::react::JSExecutor*)>&&)::$_0&>::type std::__1::__invoke[abi:dee210106]<facebook::react::NativeToJsBridge::runOnExecutorQueue(std::__1::function<void (facebook::react::JSExecutor*)>&&)::$_0&>(facebook::react::NativeToJsBridge::runOnExecutorQueue(std::__1::function<void (facebook::react::JSExecutor*)>&&)::$_0&) + 24
64  MotoCortex.debug.dylib        	       0x105ffaa14 void std::__1::__invoke_void_return_wrapper<void, true>::__call[abi:dee210106]<facebook::react::NativeToJsBridge::runOnExecutorQueue(std::__1::function<void (facebook::react::JSExecutor*)>&&)::$_0&>(facebook::react::NativeToJsBridge::runOnExecutorQueue(std::__1::function<void (facebook::react::JSExecutor*)>&&)::$_0&) + 24
65  MotoCortex.debug.dylib        	       0x105ffa9f0 void std::__1::__invoke_r[abi:dee210106]<void, facebook::react::NativeToJsBridge::runOnExecutorQueue(std::__1::function<void (facebook::react::JSExecutor*)>&&)::$_0&>(facebook::react::NativeToJsBridge::runOnExecutorQueue(std::__1::function<void (facebook::react::JSExecutor*)>&&)::$_0&) + 24
66  MotoCortex.debug.dylib        	       0x105ffa58c std::__1::__function::__func<facebook::react::NativeToJsBridge::runOnExecutorQueue(std::__1::function<void (facebook::react::JSExecutor*)>&&)::$_0, void ()>::operator()() + 28
67  MotoCortex.debug.dylib        	       0x104d3bec8 std::__1::__function::__value_func<void ()>::operator()[abi:dee210106]() const + 60
68  MotoCortex.debug.dylib        	       0x104d3be80 std::__1::function<void ()>::operator()() const + 24
69  MotoCortex.debug.dylib        	       0x1056107a8 facebook::react::tryAndReturnError(std::__1::function<void ()> const&) + 24
70  MotoCortex.debug.dylib        	       0x105639a44 facebook::react::RCTMessageThread::tryFunc(std::__1::function<void ()> const&) + 36
71  MotoCortex.debug.dylib        	       0x10563b884 facebook::react::RCTMessageThread::runOnQueue(std::__1::function<void ()>&&)::$_0::operator()() const + 80
72  MotoCortex.debug.dylib        	       0x10563b828 std::__1::__invoke_result_impl<void, facebook::react::RCTMessageThread::runOnQueue(std::__1::function<void ()>&&)::$_0&>::type std::__1::__invoke[abi:dee210106]<facebook::react::RCTMessageThread::runOnQueue(std::__1::function<void ()>&&)::$_0&>(facebook::react::RCTMessageThread::runOnQueue(std::__1::function<void ()>&&)::$_0&) + 24
73  MotoCortex.debug.dylib        	       0x10563b804 void std::__1::__invoke_void_return_wrapper<void, true>::__call[abi:dee210106]<facebook::react::RCTMessageThread::runOnQueue(std::__1::function<void ()>&&)::$_0&>(facebook::react::RCTMessageThread::runOnQueue(std::__1::function<void ()>&&)::$_0&) + 24
74  MotoCortex.debug.dylib        	       0x10563b7e0 void std::__1::__invoke_r[abi:dee210106]<void, facebook::react::RCTMessageThread::runOnQueue(std::__1::function<void ()>&&)::$_0&>(facebook::react::RCTMessageThread::runOnQueue(std::__1::function<void ()>&&)::$_0&) + 24
75  MotoCortex.debug.dylib        	       0x10563b51c std::__1::__function::__func<facebook::react::RCTMessageThread::runOnQueue(std::__1::function<void ()>&&)::$_0, void ()>::operator()() + 28
76  MotoCortex.debug.dylib        	       0x104d3bec8 std::__1::__function::__value_func<void ()>::operator()[abi:dee210106]() const + 60
77  MotoCortex.debug.dylib        	       0x104d3be80 std::__1::function<void ()>::operator()() const + 24
78  MotoCortex.debug.dylib        	       0x1056397e4 invocation function for block in facebook::react::RCTMessageThread::runAsync(std::__1::function<void ()>) + 48
79  CoreFoundation                	       0x180422d28 __CFRUNLOOP_IS_CALLING_OUT_TO_A_BLOCK__ + 20
80  CoreFoundation                	       0x1804224b4 __CFRunLoopDoBlocks + 340
81  CoreFoundation                	       0x180421df8 __CFRunLoopRun + 2280
82  CoreFoundation                	       0x18041c904 _CFRunLoopRunSpecificWithOptions + 496
83  MotoCortex.debug.dylib        	       0x1055ecbe8 +[RCTCxxBridge runRunLoop] + 772
84  Foundation                    	       0x181154edc __NSThread__start__ + 716
85  libsystem_pthread.dylib       	       0x10099e63c _pthread_start + 104
86  libsystem_pthread.dylib       	       0x100999a34 thread_start + 8

Thread 6:: com.apple.CFNetwork.CustomProtocols
0   libsystem_kernel.dylib        	       0x100638b70 mach_msg2_trap + 8
1   libsystem_kernel.dylib        	       0x100649e5c mach_msg2_internal + 72
2   libsystem_kernel.dylib        	       0x100640c44 mach_msg_overwrite + 484
3   libsystem_kernel.dylib        	       0x100638ef0 mach_msg + 20
4   CoreFoundation                	       0x1804227c0 __CFRunLoopServiceMachPort + 156
5   CoreFoundation                	       0x180421978 __CFRunLoopRun + 1128
6   CoreFoundation                	       0x18041c904 _CFRunLoopRunSpecificWithOptions + 496
7   CFNetwork                     	       0x184fb8020 +[__CFN_CoreSchedulingSetRunnable _run:] + 368
8   Foundation                    	       0x181154edc __NSThread__start__ + 716
9   libsystem_pthread.dylib       	       0x10099e63c _pthread_start + 104
10  libsystem_pthread.dylib       	       0x100999a34 thread_start + 8

Thread 7:: hades
0   libsystem_kernel.dylib        	       0x10063c02c __psynch_cvwait + 8
1   libsystem_pthread.dylib       	       0x10099eb00 _pthread_cond_wait + 972
2   libc++.1.dylib                	       0x180300604 std::__1::condition_variable::wait(std::__1::unique_lock<std::__1::mutex>&) + 28
3   hermes                        	       0x1011871a0 hermes::vm::HadesGC::Executor::worker() + 112
4   hermes                        	       0x101187104 void* std::__1::__thread_proxy[abi:v160006]<std::__1::tuple<std::__1::unique_ptr<std::__1::__thread_struct, std::__1::default_delete<std::__1::__thread_struct>>, hermes::vm::HadesGC::Executor::Executor()::'lambda'()>>(void*) + 44
5   libsystem_pthread.dylib       	       0x10099e63c _pthread_start + 104
6   libsystem_pthread.dylib       	       0x100999a34 thread_start + 8

Thread 8:: com.apple.CFSocket.private
0   libsystem_kernel.dylib        	       0x100642fb4 __select + 8
1   CoreFoundation                	       0x180430b8c __CFSocketManager + 680
2   libsystem_pthread.dylib       	       0x10099e63c _pthread_start + 104
3   libsystem_pthread.dylib       	       0x100999a34 thread_start + 8

Thread 9:: com.apple.CFStream.LegacyThread
0   libsystem_kernel.dylib        	       0x100638b70 mach_msg2_trap + 8
1   libsystem_kernel.dylib        	       0x100649e5c mach_msg2_internal + 72
2   libsystem_kernel.dylib        	       0x100640c44 mach_msg_overwrite + 484
3   libsystem_kernel.dylib        	       0x100638ef0 mach_msg + 20
4   CoreFoundation                	       0x1804227c0 __CFRunLoopServiceMachPort + 156
5   CoreFoundation                	       0x180421978 __CFRunLoopRun + 1128
6   CoreFoundation                	       0x18041c904 _CFRunLoopRunSpecificWithOptions + 496
7   CoreFoundation                	       0x1804403a4 _legacyStreamRunLoop_workThread + 260
8   libsystem_pthread.dylib       	       0x10099e63c _pthread_start + 104
9   libsystem_pthread.dylib       	       0x100999a34 thread_start + 8

Thread 10:: hades
0   libsystem_kernel.dylib        	       0x10063c02c __psynch_cvwait + 8
1   libsystem_pthread.dylib       	       0x10099eb00 _pthread_cond_wait + 972
2   libc++.1.dylib                	       0x180300604 std::__1::condition_variable::wait(std::__1::unique_lock<std::__1::mutex>&) + 28
3   hermes                        	       0x1011871a0 hermes::vm::HadesGC::Executor::worker() + 112
4   hermes                        	       0x101187104 void* std::__1::__thread_proxy[abi:v160006]<std::__1::tuple<std::__1::unique_ptr<std::__1::__thread_struct, std::__1::default_delete<std::__1::__thread_struct>>, hermes::vm::HadesGC::Executor::Executor()::'lambda'()>>(void*) + 44
5   libsystem_pthread.dylib       	       0x10099e63c _pthread_start + 104
6   libsystem_pthread.dylib       	       0x100999a34 thread_start + 8

Thread 11:

Thread 12:

Thread 13:

Thread 14:


Thread 5 crashed with ARM Thread State (64-bit):
    x0: 0x0000000000000000   x1: 0x000000017034f3e0   x2: 0x0000000000000000   x3: 0x0000000102ceb122
    x4: 0x000000000c90a2b0   x5: 0x0000000000000020   x6: 0x00e8f74700419b10   x7: 0x0000000000000000
    x8: 0x0000000000000000   x9: 0x000000000000002a  x10: 0x2073617720657a69  x11: 0x6465646565637865
   x12: 0x2078614d203d2065  x13: 0x7a69732070616568  x14: 0x7865207361772065  x15: 0x0029646564656563
   x16: 0x00000001004e30b0  x17: 0xffffffffb00007ff  x18: 0x0000000000000000  x19: 0x000000017034f478
   x20: 0x0000000000000001  x21: 0x0000000000000000  x22: 0x00000001013658c0  x23: 0x0000000100fe8988
   x24: 0x000000017034f8c8  x25: 0x000000017034f958  x26: 0x0000007000038c68  x27: 0x0000000606af7160
   x28: 0x00000000003e7fd8   fp: 0x000000017034f460   lr: 0x00000001012f0a98
    sp: 0x000000017034f3b0   pc: 0x0000000100fe89a4 cpsr: 0x80000000
   far: 0x0000000000000000  esr: 0x92000046 (Data Abort) byte write Translation fault

Binary Images:
       0x100478000 -        0x10047bfff com.ismail.motocortexv2 (1.1.0) <f4cc10dd-9f97-363b-b4a0-a00392681e22> /Users/USER/Library/Developer/CoreSimulator/Devices/D90D7F2D-2DF3-4611-8356-BDEDCC12E373/data/Containers/Bundle/Application/B96FADAA-9DF9-499D-836B-3A35BD3BAE61/MotoCortex.app/MotoCortex
       0x100528000 -        0x100577fff dyld_sim (*) <ba544d9a-46ab-3c59-a00f-aba1479d2079> /Volumes/VOLUME/*/dyld_sim
       0x104a9c000 -        0x1064effff MotoCortex.debug.dylib (*) <8012d4dd-7c45-3a2f-b711-1d05bed48eaa> /Users/USER/Library/Developer/CoreSimulator/Devices/D90D7F2D-2DF3-4611-8356-BDEDCC12E373/data/Containers/Bundle/Application/B96FADAA-9DF9-499D-836B-3A35BD3BAE61/MotoCortex.app/MotoCortex.debug.dylib
       0x100890000 -        0x10091ffff io.vlcn.crsqlite (*) <01bd5c62-4036-30bd-94be-6a5b43f03062> /Users/USER/Library/Developer/CoreSimulator/Devices/D90D7F2D-2DF3-4611-8356-BDEDCC12E373/data/Containers/Bundle/Application/B96FADAA-9DF9-499D-836B-3A35BD3BAE61/MotoCortex.app/Frameworks/crsqlite.framework/crsqlite
       0x100fe4000 -        0x101353fff dev.hermesengine.iphonesimulator (0.12.0) <15c2519b-0ac7-3032-b055-957892e423e1> /Users/USER/Library/Developer/CoreSimulator/Devices/D90D7F2D-2DF3-4611-8356-BDEDCC12E373/data/Containers/Bundle/Application/B96FADAA-9DF9-499D-836B-3A35BD3BAE61/MotoCortex.app/Frameworks/hermes.framework/hermes
       0x1004a0000 -        0x1004a3fff com.apple.ap.AdServices (1.0) <c2debbc1-6233-343e-a73e-300e4d0d0a0e> /Volumes/VOLUME/*/AdServices.framework/AdServices
       0x1005e4000 -        0x100603fff com.apple.MetricKit (1.0) <bab62ede-1a12-3fe6-b4fd-8476487573d7> /Volumes/VOLUME/*/MetricKit.framework/MetricKit
       0x101630000 -        0x10188bfff com.apple.StoreKit.SwiftUI (1.0) <5400b057-b7fc-35f2-addd-38399a1bf545> /Volumes/VOLUME/*/_StoreKit_SwiftUI.framework/_StoreKit_SwiftUI
       0x1004b4000 -        0x1004b7fff libswiftDataDetection.dylib (*) <3119af59-1eaa-3731-a7cb-c21c556b63c0> /Volumes/VOLUME/*/libswiftDataDetection.dylib
       0x1004c8000 -        0x1004cbfff libswiftUIKit.dylib (*) <710be927-bac3-3b9e-b7ce-dbe0c5e8e2a5> /Volumes/VOLUME/*/libswiftUIKit.dylib
       0x1004d4000 -        0x1004d7fff libswiftFileProvider.dylib (*) <8c7e08c0-69a9-3be9-8f41-60c74fba8e5c> /Volumes/VOLUME/*/libswiftFileProvider.dylib
       0x1004e0000 -        0x1004ebfff libsystem_platform.dylib (*) <0831b8d2-190f-31fc-9eb6-ea8ba11fe47b> /usr/lib/system/libsystem_platform.dylib
       0x100638000 -        0x100673fff libsystem_kernel.dylib (*) <2144ef57-8439-3be2-88a3-7d67766bcb03> /usr/lib/system/libsystem_kernel.dylib
       0x100998000 -        0x1009a7fff libsystem_pthread.dylib (*) <1e522024-387b-3d18-81ca-f4559198954b> /usr/lib/system/libsystem_pthread.dylib
       0x100a94000 -        0x100a9ffff libobjc-trampolines.dylib (*) <75fa6778-178f-394f-9c63-711780430596> /Volumes/VOLUME/*/libobjc-trampolines.dylib
       0x100750000 -        0x1007f7fff dyld (*) <f924bdd3-4365-3466-9580-8b1b3fa8f857> /usr/lib/dyld
       0x18038f000 -        0x1807c04ff com.apple.CoreFoundation (6.9) <e74d7b62-0aac-3013-a55b-f15135d4bd2e> /Volumes/VOLUME/*/CoreFoundation.framework/CoreFoundation
       0x193357000 -        0x19335ed9f com.apple.GraphicsServices (1.0) <95c64786-b053-33db-914f-5fa4b6cb8122> /Volumes/VOLUME/*/GraphicsServices.framework/GraphicsServices
       0x185289000 -        0x18757573f com.apple.UIKitCore (1.0) <12463677-be34-38f7-9e11-3421bbf362fc> /Volumes/VOLUME/*/UIKitCore.framework/UIKitCore
               0x0 - 0xffffffffffffffff ??? (*) <00000000-0000-0000-0000-000000000000> ???
       0x180840000 -        0x1815f8ddf com.apple.Foundation (6.9) <2cc9fce0-08f9-3a0d-8a2f-6db229462de5> /Volumes/VOLUME/*/Foundation.framework/Foundation
       0x180105000 -        0x180107da8 libsystem_blocks.dylib (*) <a5fdf1ff-b793-3574-8903-d24571eacd25> /Volumes/VOLUME/*/libsystem_blocks.dylib
       0x180038000 -        0x180074943 libobjc.A.dylib (*) <727c4040-5e6d-3dae-b22c-9a337d46c34f> /Volumes/VOLUME/*/libobjc.A.dylib
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

VM Region Summary:
ReadOnly portion of Libraries: Total=1.9G resident=0K(0%) swapped_out_or_unallocated=1.9G(100%)
Writable regions: Total=3.2G written=5286K(0%) resident=4342K(0%) swapped_out=944K(0%) unallocated=3.2G(100%)

                                VIRTUAL   REGION 
REGION TYPE                        SIZE    COUNT (non-coalesced) 
===========                     =======  ======= 
Activity Tracing                   256K        1 
CG raster data                    1696K       33 
CoreAnimation                     1920K       47 
Foundation                          16K        1 
IOSurface                         4096K        1 
Kernel Alloc Once                   32K        1 
MALLOC                           214.5M       57 
MALLOC guard page                 3904K        4 
Mach message                        16K        1 
SQLite page cache                 1152K        9 
STACK GUARD                       56.2M       14 
Stack                             15.4M       15 
VM_ALLOCATE                        3.0G     2318 
__AUTH_CONST                        32K        1 
__DATA                            53.8M      882 
__DATA_CONST                     115.0M      909 
__DATA_DIRTY                       155K       14 
__FONT_DATA                        2352        1 
__LINKEDIT                       750.7M       17 
__OBJC_RO                         55.6M        1 
__OBJC_RW                         2332K        1 
__TEXT                             1.1G      924 
__TPRO_CONST                       164K        3 
dyld private memory                3.0G       16 
mapped file                       61.3M       15 
page table in kernel              4342K        1 
shared memory                       16K        1 
===========                     =======  ======= 
TOTAL                              8.4G     5288 


-----------
Full Report
-----------

{"app_name":"MotoCortex","timestamp":"2026-08-12 21:17:03.00 +0300","app_version":"1.1.0","slice_uuid":"f4cc10dd-9f97-363b-b4a0-a00392681e22","build_version":"41","platform":7,"bundleID":"com.ismail.motocortexv2","share_with_app_devs":1,"is_first_party":0,"bug_type":"309","os_version":"macOS 26.5.2 (25F84)","roots_installed":0,"name":"MotoCortex","incident_id":"8FE9B5C8-92F7-455D-ABBB-25DE7A6760ED"}
{
  "uptime" : 43000,
  "procRole" : "Foreground",
  "version" : 2,
  "userID" : 501,
  "deployVersion" : 210,
  "modelCode" : "Mac16,10",
  "coalitionID" : 3338,
  "osVersion" : {
    "train" : "macOS 26.5.2",
    "build" : "25F84",
    "releaseType" : "User"
  },
  "captureTime" : "2026-08-12 21:16:59.4571 +0300",
  "codeSigningMonitor" : 2,
  "incident" : "8FE9B5C8-92F7-455D-ABBB-25DE7A6760ED",
  "pid" : 13291,
  "translated" : false,
  "cpuType" : "ARM-64",
  "procLaunch" : "2026-08-12 13:48:42.3970 +0300",
  "procStartAbsTime" : 405474709634,
  "procExitAbsTime" : 1050999661594,
  "procName" : "MotoCortex",
  "procPath" : "\/Users\/USER\/Library\/Developer\/CoreSimulator\/Devices\/D90D7F2D-2DF3-4611-8356-BDEDCC12E373\/data\/Containers\/Bundle\/Application\/B96FADAA-9DF9-499D-836B-3A35BD3BAE61\/MotoCortex.app\/MotoCortex",
  "bundleInfo" : {"CFBundleShortVersionString":"1.1.0","CFBundleVersion":"41","CFBundleIdentifier":"com.ismail.motocortexv2"},
  "storeInfo" : {"deviceIdentifierForVendor":"C154DD74-D435-5949-A32C-B14FD08F1B31","thirdParty":true},
  "parentProc" : "launchd_sim",
  "parentPid" : 12751,
  "coalitionName" : "com.apple.CoreSimulator.SimDevice.D90D7F2D-2DF3-4611-8356-BDEDCC12E373",
  "crashReporterKey" : "3D338F32-AE74-8406-89A9-2E77384557C6",
  "appleIntelligenceStatus" : {"state":"available"},
  "developerMode" : 1,
  "responsiblePid" : 12561,
  "responsibleProc" : "SimulatorTrampoline",
  "codeSigningID" : "com.ismail.motocortexv2",
  "codeSigningTeamID" : "",
  "codeSigningFlags" : 570425857,
  "codeSigningValidationCategory" : 10,
  "codeSigningTrustLevel" : 4294967295,
  "codeSigningAuxiliaryInfo" : 0,
  "instructionByteStream" : {"beforePC":"AAAAAAAAAAAAAAAA6BsAsAKpRPliAAC04AMBqkAAH9YIAIDSSQWAUg==","atPC":"CQEAucADX9Y\/AALxIwEAVAgAQPnJ+IPSiXeg8il4wPIp4+PyHwEJ6w=="},
  "bootSessionUUID" : "8133FB6C-14AB-480E-AD75-DB88E46BBD0F",
  "sip" : "enabled",
  "vmRegionInfo" : "0 is not in any region.  Bytes before following region: 4299653120\n      REGION TYPE                    START - END         [ VSIZE] PRT\/MAX SHRMOD  REGION DETAIL\n      UNUSED SPACE AT START\n--->  \n      __TEXT                      100478000-10047c000    [   16K] r-x\/r-x SM=COW  \/Users\/USER\/Library\/Developer\/CoreSimulator\/Devices\/D90D7F2D-2DF3-4611-8356-BDEDCC12E373\/data\/Containers\/Bundle\/Application\/B96FADAA-9DF9-499D-836B-3A35BD3BAE61\/MotoCortex.app\/MotoCortex",
  "exception" : {"codes":"0x0000000000000001, 0x0000000000000000","rawCodes":[1,0],"type":"EXC_BAD_ACCESS","signal":"SIGSEGV","subtype":"KERN_INVALID_ADDRESS at 0x0000000000000000"},
  "termination" : {"flags":0,"code":11,"namespace":"SIGNAL","indicator":"Segmentation fault: 11","byProc":"exc handler","byPid":13291},
  "vmregioninfo" : "0 is not in any region.  Bytes before following region: 4299653120\n      REGION TYPE                    START - END         [ VSIZE] PRT\/MAX SHRMOD  REGION DETAIL\n      UNUSED SPACE AT START\n--->  \n      __TEXT                      100478000-10047c000    [   16K] r-x\/r-x SM=COW  \/Users\/USER\/Library\/Developer\/CoreSimulator\/Devices\/D90D7F2D-2DF3-4611-8356-BDEDCC12E373\/data\/Containers\/Bundle\/Application\/B96FADAA-9DF9-499D-836B-3A35BD3BAE61\/MotoCortex.app\/MotoCortex",
  "extMods" : {"caller":{"thread_create":0,"thread_set_state":0,"task_for_pid":0},"system":{"thread_create":0,"thread_set_state":0,"task_for_pid":0},"targeted":{"thread_create":0,"thread_set_state":0,"task_for_pid":0},"warnings":0},
  "faultingThread" : 5,
  "threads" : [{"id":317308,"threadState":{"x":[{"value":268451845},{"value":21592279046},{"value":8589934592},{"value":23102629085184},{"value":0},{"value":23102629085184},{"value":2},{"value":4294967295},{"value":0},{"value":17179869184},{"value":0},{"value":2},{"value":0},{"value":0},{"value":5379},{"value":3072},{"value":18446744073709551569},{"value":6446253880,"symbolLocation":0,"symbol":"-[__NSArrayM objectAtIndex:]"},{"value":0},{"value":4294967295},{"value":2},{"value":23102629085184},{"value":0},{"value":23102629085184},{"value":21592279046},{"value":6167219736},{"value":8589934592},{"value":18446744073709550527},{"value":4301766656,"symbolLocation":0,"symbol":"_libkernel_string_functions"}],"flavor":"ARM_THREAD_STATE64","lr":{"value":4301561436},"cpsr":{"value":0},"fp":{"value":6167219584},"sp":{"value":6167219504},"esr":{"value":1442840704,"description":"(Syscall)"},"pc":{"value":4301491056},"far":{"value":0}},"queue":"com.apple.main-thread","frames":[{"imageOffset":2928,"symbol":"mach_msg2_trap","symbolLocation":8,"imageIndex":12},{"imageOffset":73308,"symbol":"mach_msg2_internal","symbolLocation":72,"imageIndex":12},{"imageOffset":35908,"symbol":"mach_msg_overwrite","symbolLocation":484,"imageIndex":12},{"imageOffset":3824,"symbol":"mach_msg","symbolLocation":20,"imageIndex":12},{"imageOffset":604096,"symbol":"__CFRunLoopServiceMachPort","symbolLocation":156,"imageIndex":16},{"imageOffset":600440,"symbol":"__CFRunLoopRun","symbolLocation":1128,"imageIndex":16},{"imageOffset":579844,"symbol":"_CFRunLoopRunSpecificWithOptions","symbolLocation":496,"imageIndex":16},{"imageOffset":10688,"symbol":"GSEventRunModal","symbolLocation":116,"imageIndex":17},{"imageOffset":18990284,"symbol":"-[UIApplication _run]","symbolLocation":776,"imageIndex":18},{"imageOffset":26306832,"symbol":"UIApplicationMain","symbolLocation":120,"imageIndex":18},{"imageOffset":13400,"sourceLine":7,"sourceFile":"main.m","symbol":"__debug_main_executable_dylib_entry_point","imageIndex":2,"symbolLocation":96},{"imageOffset":45284,"symbol":"start_sim","symbolLocation":20,"imageIndex":1},{"imageOffset":130560,"symbol":"start","symbolLocation":6992,"imageIndex":15}]},{"id":317377,"name":"com.apple.uikit.eventfetch-thread","threadState":{"x":[{"value":268451845},{"value":21592279046},{"value":8589934592},{"value":69282117451776},{"value":2162692},{"value":69282117451776},{"value":2},{"value":4294967295},{"value":0},{"value":17179869184},{"value":0},{"value":2},{"value":0},{"value":0},{"value":16131},{"value":3072},{"value":18446744073709551569},{"value":18446744072367376383},{"value":0},{"value":4294967295},{"value":2},{"value":69282117451776},{"value":2162692},{"value":69282117451776},{"value":21592279046},{"value":6170074504},{"value":8589934592},{"value":18446744073709550527},{"value":4301766656,"symbolLocation":0,"symbol":"_libkernel_string_functions"}],"flavor":"ARM_THREAD_STATE64","lr":{"value":4301561436},"cpsr":{"value":0},"fp":{"value":6170074352},"sp":{"value":6170074272},"esr":{"value":1442840704,"description":"(Syscall)"},"pc":{"value":4301491056},"far":{"value":0}},"frames":[{"imageOffset":2928,"symbol":"mach_msg2_trap","symbolLocation":8,"imageIndex":12},{"imageOffset":73308,"symbol":"mach_msg2_internal","symbolLocation":72,"imageIndex":12},{"imageOffset":35908,"symbol":"mach_msg_overwrite","symbolLocation":484,"imageIndex":12},{"imageOffset":3824,"symbol":"mach_msg","symbolLocation":20,"imageIndex":12},{"imageOffset":604096,"symbol":"__CFRunLoopServiceMachPort","symbolLocation":156,"imageIndex":16},{"imageOffset":600440,"symbol":"__CFRunLoopRun","symbolLocation":1128,"imageIndex":16},{"imageOffset":579844,"symbol":"_CFRunLoopRunSpecificWithOptions","symbolLocation":496,"imageIndex":16},{"imageOffset":9370188,"symbol":"-[NSRunLoop(NSRunLoop) runMode:beforeDate:]","symbolLocation":208,"imageIndex":20},{"imageOffset":9370728,"symbol":"-[NSRunLoop(NSRunLoop) runUntilDate:]","symbolLocation":60,"imageIndex":20},{"imageOffset":16050900,"symbol":"-[UIEventFetcher threadMain]","symbolLocation":404,"imageIndex":18},{"imageOffset":9522908,"symbol":"__NSThread__start__","symbolLocation":716,"imageIndex":20},{"imageOffset":26172,"symbol":"_pthread_start","symbolLocation":104,"imageIndex":13},{"imageOffset":6708,"symbol":"thread_start","symbolLocation":8,"imageIndex":13}]},{"id":317386,"name":"com.google.firebase.crashlytics.MachExceptionServer","threadState":{"x":[{"value":1},{"value":0},{"value":1},{"value":4300081382},{"value":10771789692704},{"value":0},{"value":0},{"value":0},{"value":4398779133},{"value":9},{"value":0},{"value":11714336},{"value":2508},{"value":0},{"value":0},{"value":0},{"value":4},{"value":6443522852,"symbolLocation":0,"symbol":"-[__NSStackBlock__ release]"},{"value":0},{"value":6174113792},{"value":0},{"value":0},{"value":0},{"value":0},{"value":0},{"value":0},{"value":0},{"value":0},{"value":0}],"flavor":"ARM_THREAD_STATE64","lr":{"value":4378887404},"cpsr":{"value":0},"fp":{"value":4306681504},"sp":{"value":4306681296},"esr":{"value":1442840704,"description":"(Syscall)"},"pc":{"value":4301505272},"far":{"value":0}},"frames":[{"imageOffset":17144,"symbol":"write","symbolLocation":8,"imageIndex":12},{"imageOffset":5686508,"symbol":"FIRCLSSDKFileLog","symbolLocation":392,"imageIndex":2},{"imageOffset":5698820,"symbol":"FIRCLSMachExceptionReply","symbolLocation":320,"imageIndex":2},{"imageOffset":5697056,"symbol":"FIRCLSMachExceptionServer","symbolLocation":100,"imageIndex":2},{"imageOffset":26172,"symbol":"_pthread_start","symbolLocation":104,"imageIndex":13},{"imageOffset":6708,"symbol":"thread_start","symbolLocation":8,"imageIndex":13}]},{"id":317799,"name":"com.facebook.SocketRocket.NetworkThread","threadState":{"x":[{"value":268451845},{"value":21592279046},{"value":8589934592},{"value":177137336188928},{"value":0},{"value":177137336188928},{"value":2},{"value":4294967295},{"value":0},{"value":17179869184},{"value":0},{"value":2},{"value":0},{"value":0},{"value":41243},{"value":3072},{"value":18446744073709551569},{"value":6442840916,"symbolLocation":0,"symbol":"-[NSObject dealloc]"},{"value":0},{"value":4294967295},{"value":2},{"value":177137336188928},{"value":0},{"value":177137336188928},{"value":21592279046},{"value":6175825240},{"value":8589934592},{"value":18446744073709550527},{"value":4301766656,"symbolLocation":0,"symbol":"_libkernel_string_functions"}],"flavor":"ARM_THREAD_STATE64","lr":{"value":4301561436},"cpsr":{"value":0},"fp":{"value":6175825088},"sp":{"value":6175825008},"esr":{"value":1442840704,"description":"(Syscall)"},"pc":{"value":4301491056},"far":{"value":0}},"frames":[{"imageOffset":2928,"symbol":"mach_msg2_trap","symbolLocation":8,"imageIndex":12},{"imageOffset":73308,"symbol":"mach_msg2_internal","symbolLocation":72,"imageIndex":12},{"imageOffset":35908,"symbol":"mach_msg_overwrite","symbolLocation":484,"imageIndex":12},{"imageOffset":3824,"symbol":"mach_msg","symbolLocation":20,"imageIndex":12},{"imageOffset":604096,"symbol":"__CFRunLoopServiceMachPort","symbolLocation":156,"imageIndex":16},{"imageOffset":600440,"symbol":"__CFRunLoopRun","symbolLocation":1128,"imageIndex":16},{"imageOffset":579844,"symbol":"_CFRunLoopRunSpecificWithOptions","symbolLocation":496,"imageIndex":16},{"imageOffset":9370188,"symbol":"-[NSRunLoop(NSRunLoop) runMode:beforeDate:]","symbolLocation":208,"imageIndex":20},{"imageOffset":22194192,"symbol":"-[SRRunLoopThread main]","symbolLocation":268,"imageIndex":2},{"imageOffset":9522908,"symbol":"__NSThread__start__","symbolLocation":716,"imageIndex":20},{"imageOffset":26172,"symbol":"_pthread_start","symbolLocation":104,"imageIndex":13},{"imageOffset":6708,"symbol":"thread_start","symbolLocation":8,"imageIndex":13}]},{"id":317800,"name":"com.apple.NSURLConnectionLoader","threadState":{"x":[{"value":268451845},{"value":21592279046},{"value":8589934592},{"value":152845001162752},{"value":0},{"value":152845001162752},{"value":2},{"value":4294967295},{"value":0},{"value":17179869184},{"value":0},{"value":2},{"value":0},{"value":0},{"value":35587},{"value":3072},{"value":18446744073709551569},{"value":6444053628,"symbolLocation":0,"symbol":"-[OS_dispatch_object dealloc]"},{"value":0},{"value":4294967295},{"value":2},{"value":152845001162752},{"value":0},{"value":152845001162752},{"value":21592279046},{"value":6176398664},{"value":8589934592},{"value":18446744073709550527},{"value":4301766656,"symbolLocation":0,"symbol":"_libkernel_string_functions"}],"flavor":"ARM_THREAD_STATE64","lr":{"value":4301561436},"cpsr":{"value":0},"fp":{"value":6176398512},"sp":{"value":6176398432},"esr":{"value":1442840704,"description":"(Syscall)"},"pc":{"value":4301491056},"far":{"value":0}},"frames":[{"imageOffset":2928,"symbol":"mach_msg2_trap","symbolLocation":8,"imageIndex":12},{"imageOffset":73308,"symbol":"mach_msg2_internal","symbolLocation":72,"imageIndex":12},{"imageOffset":35908,"symbol":"mach_msg_overwrite","symbolLocation":484,"imageIndex":12},{"imageOffset":3824,"symbol":"mach_msg","symbolLocation":20,"imageIndex":12},{"imageOffset":604096,"symbol":"__CFRunLoopServiceMachPort","symbolLocation":156,"imageIndex":16},{"imageOffset":600440,"symbol":"__CFRunLoopRun","symbolLocation":1128,"imageIndex":16},{"imageOffset":579844,"symbol":"_CFRunLoopRunSpecificWithOptions","symbolLocation":496,"imageIndex":16},{"imageOffset":2101280,"symbol":"+[__CFN_CoreSchedulingSetRunnable _run:]","symbolLocation":368,"imageIndex":23},{"imageOffset":9522908,"symbol":"__NSThread__start__","symbolLocation":716,"imageIndex":20},{"imageOffset":26172,"symbol":"_pthread_start","symbolLocation":104,"imageIndex":13},{"imageOffset":6708,"symbol":"thread_start","symbolLocation":8,"imageIndex":13}]},{"triggered":true,"id":317801,"name":"com.facebook.react.JavaScript","threadState":{"x":[{"value":0},{"value":6177485792},{"value":0},{"value":4342067490},{"value":210805424},{"value":32},{"value":65574078915910416},{"value":0},{"value":0},{"value":42},{"value":2338319795807943273},{"value":7234298763096062053},{"value":2339726990300225637},{"value":8820707928343405928},{"value":8675375937127653477},{"value":11650860683978083},{"value":4300091568,"symbolLocation":0,"symbol":"_platform_memmove"},{"value":18446744072367376383},{"value":0},{"value":6177485944},{"value":1},{"value":0},{"value":4315306176,"symbolLocation":0,"symbol":"_MergedGlobals"},{"value":4311648648,"symbolLocation":0,"symbol":"facebook::hermes::detail::hermesFatalErrorHandler(void*, std::__1::basic_string<char, std::__1::char_traits<char>, std::__1::allocator<char>> const&, bool)"},{"value":6177487048},{"value":6177487192},{"value":481036569704},{"value":25881964896},{"value":4095960}],"flavor":"ARM_THREAD_STATE64","lr":{"value":4314827416},"cpsr":{"value":2147483648},"fp":{"value":6177485920},"sp":{"value":6177485744},"esr":{"value":2449473606,"description":"(Data Abort) byte write Translation fault"},"pc":{"value":4311648676,"matchesCrashFrame":1},"far":{"value":0}},"frames":[{"imageOffset":18852,"symbol":"facebook::hermes::detail::hermesFatalErrorHandler(void*, std::__1::basic_string<char, std::__1::char_traits<char>, std::__1::allocator<char>> const&, bool)","symbolLocation":28,"imageIndex":4},{"imageOffset":3197592,"symbol":"llvh::report_fatal_error(llvh::Twine const&, bool)","symbolLocation":260,"imageIndex":4},{"imageOffset":3197796,"symbol":"llvh::report_fatal_error(std::__1::basic_string<char, std::__1::char_traits<char>, std::__1::allocator<char>> const&, bool)","symbolLocation":32,"imageIndex":4},{"imageOffset":3108052,"symbol":"hermes::hermes_fatal(llvh::StringRef, std::__1::error_code)","symbolLocation":156,"imageIndex":4},{"imageOffset":811348,"symbol":"hermes::vm::GCBase::oom(std::__1::error_code)","symbolLocation":152,"imageIndex":4},{"imageOffset":1704960,"symbol":"hermes::vm::HadesGC::OldGen::alloc(unsigned int)","symbolLocation":380,"imageIndex":4},{"imageOffset":1732152,"symbol":"void hermes::vm::HadesGC::scanDirtyCardsForSegment<false>(hermes::vm::SlotVisitor<hermes::vm::HadesGC::EvacAcceptor<false>>&, hermes::vm::HadesGC::HeapSegment&)","symbolLocation":752,"imageIndex":4},{"imageOffset":1707884,"symbol":"void hermes::vm::HadesGC::youngGenEvacuateImpl<hermes::vm::HadesGC::EvacAcceptor<false>>(hermes::vm::HadesGC::EvacAcceptor<false>&, bool)","symbolLocation":160,"imageIndex":4},{"imageOffset":1693576,"symbol":"hermes::vm::HadesGC::youngGenCollection(std::__1::basic_string<char, std::__1::char_traits<char>, std::__1::allocator<char>>, bool)","symbolLocation":780,"imageIndex":4},{"imageOffset":1704428,"symbol":"hermes::vm::HadesGC::allocSlow(unsigned int)","symbolLocation":152,"imageIndex":4},{"imageOffset":942304,"symbol":"hermes::vm::Environment* hermes::vm::GCBase::makeA<hermes::vm::Environment, false, (hermes::vm::HasFinalizer)0, (hermes::vm::LongLived)0, hermes::vm::Runtime&, hermes::vm::Handle<hermes::vm::Environment>&, unsigned int&>(unsigned int, hermes::vm::Runtime&, hermes::vm::Handle<hermes::vm::Environment>&, unsigned int&)","symbolLocation":212,"imageIndex":4},{"imageOffset":897780,"symbol":"hermes::vm::CallResult<hermes::vm::HermesValue, (hermes::vm::detail::CallResultSpecialize)2> hermes::vm::Interpreter::interpretFunction<false, false>(hermes::vm::Runtime&, hermes::vm::InterpreterState&)","symbolLocation":8060,"imageIndex":4},{"imageOffset":889668,"symbol":"hermes::vm::Runtime::interpretFunctionImpl(hermes::vm::CodeBlock*)","symbolLocation":132,"imageIndex":4},{"imageOffset":786052,"symbol":"hermes::vm::JSFunction::_callImpl(hermes::vm::Handle<hermes::vm::Callable>, hermes::vm::Runtime&)","symbolLocation":40,"imageIndex":4},{"imageOffset":778532,"symbol":"hermes::vm::Callable::executeCall3(hermes::vm::Handle<hermes::vm::Callable>, hermes::vm::Runtime&, hermes::vm::Handle<hermes::vm::HermesValue>, hermes::vm::HermesValue, hermes::vm::HermesValue, hermes::vm::HermesValue, bool)","symbolLocation":200,"imageIndex":4},{"imageOffset":1057368,"symbol":"hermes::vm::JSMapImpl<(hermes::vm::CellKind)47>::forEach(hermes::vm::Handle<hermes::vm::JSMapImpl<(hermes::vm::CellKind)47>>, hermes::vm::Runtime&, hermes::vm::Handle<hermes::vm::Callable>, hermes::vm::Handle<hermes::vm::HermesValue>)","symbolLocation":204,"imageIndex":4},{"imageOffset":1521156,"symbol":"hermes::vm::setPrototypeForEach(void*, hermes::vm::Runtime&, hermes::vm::NativeArgs)","symbolLocation":252,"imageIndex":4},{"imageOffset":785328,"symbol":"hermes::vm::NativeFunction::_nativeCall(hermes::vm::NativeFunction*, hermes::vm::Runtime&)","symbolLocation":144,"imageIndex":4},{"imageOffset":892032,"symbol":"hermes::vm::CallResult<hermes::vm::HermesValue, (hermes::vm::detail::CallResultSpecialize)2> hermes::vm::Interpreter::interpretFunction<false, false>(hermes::vm::Runtime&, hermes::vm::InterpreterState&)","symbolLocation":2312,"imageIndex":4},{"imageOffset":889668,"symbol":"hermes::vm::Runtime::interpretFunctionImpl(hermes::vm::CodeBlock*)","symbolLocation":132,"imageIndex":4},{"imageOffset":786052,"symbol":"hermes::vm::JSFunction::_callImpl(hermes::vm::Handle<hermes::vm::Callable>, hermes::vm::Runtime&)","symbolLocation":40,"imageIndex":4},{"imageOffset":780316,"symbol":"hermes::vm::Callable::executeCall(hermes::vm::Handle<hermes::vm::Callable>, hermes::vm::Runtime&, hermes::vm::Handle<hermes::vm::HermesValue>, hermes::vm::Handle<hermes::vm::HermesValue>, hermes::vm::Handle<hermes::vm::JSObject>)","symbolLocation":1348,"imageIndex":4},{"imageOffset":1568844,"symbol":"hermes::vm::functionPrototypeApply(void*, hermes::vm::Runtime&, hermes::vm::NativeArgs)","symbolLocation":320,"imageIndex":4},{"imageOffset":785328,"symbol":"hermes::vm::NativeFunction::_nativeCall(hermes::vm::NativeFunction*, hermes::vm::Runtime&)","symbolLocation":144,"imageIndex":4},{"imageOffset":892032,"symbol":"hermes::vm::CallResult<hermes::vm::HermesValue, (hermes::vm::detail::CallResultSpecialize)2> hermes::vm::Interpreter::interpretFunction<false, false>(hermes::vm::Runtime&, hermes::vm::InterpreterState&)","symbolLocation":2312,"imageIndex":4},{"imageOffset":889668,"symbol":"hermes::vm::Runtime::interpretFunctionImpl(hermes::vm::CodeBlock*)","symbolLocation":132,"imageIndex":4},{"imageOffset":786052,"symbol":"hermes::vm::JSFunction::_callImpl(hermes::vm::Handle<hermes::vm::Callable>, hermes::vm::Runtime&)","symbolLocation":40,"imageIndex":4},{"imageOffset":780316,"symbol":"hermes::vm::Callable::executeCall(hermes::vm::Handle<hermes::vm::Callable>, hermes::vm::Runtime&, hermes::vm::Handle<hermes::vm::HermesValue>, hermes::vm::Handle<hermes::vm::HermesValue>, hermes::vm::Handle<hermes::vm::JSObject>)","symbolLocation":1348,"imageIndex":4},{"imageOffset":1568844,"symbol":"hermes::vm::functionPrototypeApply(void*, hermes::vm::Runtime&, hermes::vm::NativeArgs)","symbolLocation":320,"imageIndex":4},{"imageOffset":785328,"symbol":"hermes::vm::NativeFunction::_nativeCall(hermes::vm::NativeFunction*, hermes::vm::Runtime&)","symbolLocation":144,"imageIndex":4},{"imageOffset":892032,"symbol":"hermes::vm::CallResult<hermes::vm::HermesValue, (hermes::vm::detail::CallResultSpecialize)2> hermes::vm::Interpreter::interpretFunction<false, false>(hermes::vm::Runtime&, hermes::vm::InterpreterState&)","symbolLocation":2312,"imageIndex":4},{"imageOffset":889668,"symbol":"hermes::vm::Runtime::interpretFunctionImpl(hermes::vm::CodeBlock*)","symbolLocation":132,"imageIndex":4},{"imageOffset":786052,"symbol":"hermes::vm::JSFunction::_callImpl(hermes::vm::Handle<hermes::vm::Callable>, hermes::vm::Runtime&)","symbolLocation":40,"imageIndex":4},{"imageOffset":784084,"symbol":"hermes::vm::BoundFunction::_boundCall(hermes::vm::BoundFunction*, hermes::inst::Inst const*, hermes::vm::Runtime&)","symbolLocation":584,"imageIndex":4},{"imageOffset":47200,"symbol":"facebook::hermes::HermesRuntimeImpl::call(facebook::jsi::Function const&, facebook::jsi::Value const&, facebook::jsi::Value const*, unsigned long)","symbolLocation":744,"imageIndex":4},{"imageOffset":11199068,"symbol":"facebook::jsi::RuntimeDecorator<facebook::jsi::Runtime, facebook::jsi::Runtime>::call(facebook::jsi::Function const&, facebook::jsi::Value const&, facebook::jsi::Value const*, unsigned long)","symbolLocation":76,"imageIndex":2},{"imageOffset":23792640,"symbol":"facebook::jsi::WithRuntimeDecorator<facebook::react::(anonymous namespace)::ReentrancyCheck, facebook::jsi::Runtime, facebook::jsi::Runtime>::call(facebook::jsi::Function const&, facebook::jsi::Value const&, facebook::jsi::Value const*, unsigned long)","symbolLocation":88,"imageIndex":2},{"imageOffset":2666140,"symbol":"facebook::jsi::Function::call(facebook::jsi::Runtime&, facebook::jsi::Value const*, unsigned long) const","symbolLocation":100,"imageIndex":2},{"imageOffset":2665964,"symbol":"facebook::jsi::Function::call(facebook::jsi::Runtime&, std::initializer_list<facebook::jsi::Value>) const","symbolLocation":112,"imageIndex":2},{"imageOffset":23258188,"symbol":"facebook::jsi::Value facebook::jsi::Function::call<std::__1::basic_string<char, std::__1::char_traits<char>, std::__1::allocator<char>> const&, std::__1::basic_string<char, std::__1::char_traits<char>, std::__1::allocator<char>> const&, facebook::jsi::Value>(facebook::jsi::Runtime&, std::__1::basic_string<char, std::__1::char_traits<char>, std::__1::allocator<char>> const&, std::__1::basic_string<char, std::__1::char_traits<char>, std::__1::allocator<char>> const&, facebook::jsi::Value&&) const","symbolLocation":228,"imageIndex":2},{"imageOffset":23257848,"symbol":"facebook::react::JSIExecutor::callFunction(std::__1::basic_string<char, std::__1::char_traits<char>, std::__1::allocator<char>> const&, std::__1::basic_string<char, std::__1::char_traits<char>, std::__1::allocator<char>> const&, folly::dynamic const&)::$_0::operator()() const","symbolLocation":140,"imageIndex":2},{"imageOffset":23257696,"symbol":"std::__1::__invoke_result_impl<void, facebook::react::JSIExecutor::callFunction(std::__1::basic_string<char, std::__1::char_traits<char>, std::__1::allocator<char>> const&, std::__1::basic_string<char, std::__1::char_traits<char>, std::__1::allocator<char>> const&, folly::dynamic const&)::$_0&>::type std::__1::__invoke[abi:dee210106]<facebook::react::JSIExecutor::callFunction(std::__1::basic_string<char, std::__1::char_traits<char>, std::__1::allocator<char>> const&, std::__1::basic_string<char, std::__1::char_traits<char>, std::__1::allocator<char>> const&, folly::dynamic const&)::$_0&>(facebook::react::JSIExecutor::callFunction(std::__1::basic_string<char, std::__1::char_traits<char>, std::__1::allocator<char>> const&, std::__1::basic_string<char, std::__1::char_traits<char>, std::__1::allocator<char>> const&, folly::dynamic const&)::$_0&)","symbolLocation":24,"imageIndex":2},{"imageOffset":23257660,"symbol":"void std::__1::__invoke_void_return_wrapper<void, true>::__call[abi:dee210106]<facebook::react::JSIExecutor::callFunction(std::__1::basic_string<char, std::__1::char_traits<char>, std::__1::allocator<char>> const&, std::__1::basic_string<char, std::__1::char_traits<char>, std::__1::allocator<char>> const&, folly::dynamic const&)::$_0&>(facebook::react::JSIExecutor::callFunction(std::__1::basic_string<char, std::__1::char_traits<char>, std::__1::allocator<char>> const&, std::__1::basic_string<char, std::__1::char_traits<char>, std::__1::allocator<char>> const&, folly::dynamic const&)::$_0&)","symbolLocation":24,"imageIndex":2},{"imageOffset":23257624,"symbol":"void std::__1::__invoke_r[abi:dee210106]<void, facebook::react::JSIExecutor::callFunction(std::__1::basic_string<char, std::__1::char_traits<char>, std::__1::allocator<char>> const&, std::__1::basic_string<char, std::__1::char_traits<char>, std::__1::allocator<char>> const&, folly::dynamic const&)::$_0&>(facebook::react::JSIExecutor::callFunction(std::__1::basic_string<char, std::__1::char_traits<char>, std::__1::allocator<char>> const&, std::__1::basic_string<char, std::__1::char_traits<char>, std::__1::allocator<char>> const&, folly::dynamic const&)::$_0&)","symbolLocation":24,"imageIndex":2},{"imageOffset":23257292,"symbol":"std::__1::__function::__func<facebook::react::JSIExecutor::callFunction(std::__1::basic_string<char, std::__1::char_traits<char>, std::__1::allocator<char>> const&, std::__1::basic_string<char, std::__1::char_traits<char>, std::__1::allocator<char>> const&, folly::dynamic const&)::$_0, void ()>::operator()()","symbolLocation":28,"imageIndex":2},{"imageOffset":2752200,"symbol":"std::__1::__function::__value_func<void ()>::operator()[abi:dee210106]() const","symbolLocation":60,"imageIndex":2},{"imageOffset":2752128,"symbol":"std::__1::function<void ()>::operator()() const","symbolLocation":24,"imageIndex":2},{"imageOffset":11944120,"symbol":"facebook::react::JSIExecutor::defaultTimeoutInvoker(std::__1::function<void ()> const&, std::__1::function<std::__1::basic_string<char, std::__1::char_traits<char>, std::__1::allocator<char>> ()>)","symbolLocation":28,"imageIndex":2},{"imageOffset":11945616,"symbol":"std::__1::__invoke_result_impl<void, void (*&)(std::__1::function<void ()> const&, std::__1::function<std::__1::basic_string<char, std::__1::char_traits<char>, std::__1::allocator<char>> ()>), std::__1::function<void ()> const&, std::__1::function<std::__1::basic_string<char, std::__1::char_traits<char>, std::__1::allocator<char>> ()>>::type std::__1::__invoke[abi:dee210106]<void (*&)(std::__1::function<void ()> const&, std::__1::function<std::__1::basic_string<char, std::__1::char_traits<char>, std::__1::allocator<char>> ()>), std::__1::function<void ()> const&, std::__1::function<std::__1::basic_string<char, std::__1::char_traits<char>, std::__1::allocator<char>> ()>>(void (*&)(std::__1::function<void ()> const&, std::__1::function<std::__1::basic_string<char, std::__1::char_traits<char>, std::__1::allocator<char>> ()>), std::__1::function<void ()> const&, std::__1::function<std::__1::basic_string<char, std::__1::char_traits<char>, std::__1::allocator<char>> ()>&&)","symbolLocation":92,"imageIndex":2},{"imageOffset":11945512,"symbol":"void std::__1::__invoke_void_return_wrapper<void, true>::__call[abi:dee210106]<void (*&)(std::__1::function<void ()> const&, std::__1::function<std::__1::basic_string<char, std::__1::char_traits<char>, std::__1::allocator<char>> ()>), std::__1::function<void ()> const&, std::__1::function<std::__1::basic_string<char, std::__1::char_traits<char>, std::__1::allocator<char>> ()>>(void (*&)(std::__1::function<void ()> const&, std::__1::function<std::__1::basic_string<char, std::__1::char_traits<char>, std::__1::allocator<char>> ()>), std::__1::function<void ()> const&, std::__1::function<std::__1::basic_string<char, std::__1::char_traits<char>, std::__1::allocator<char>> ()>&&)","symbolLocation":40,"imageIndex":2},{"imageOffset":11945460,"symbol":"void std::__1::__invoke_r[abi:dee210106]<void, void (*&)(std::__1::function<void ()> const&, std::__1::function<std::__1::basic_string<char, std::__1::char_traits<char>, std::__1::allocator<char>> ()>), std::__1::function<void ()> const&, std::__1::function<std::__1::basic_string<char, std::__1::char_traits<char>, std::__1::allocator<char>> ()>>(void (*&)(std::__1::function<void ()> const&, std::__1::function<std::__1::basic_string<char, std::__1::char_traits<char>, std::__1::allocator<char>> ()>), std::__1::function<void ()> const&, std::__1::function<std::__1::basic_string<char, std::__1::char_traits<char>, std::__1::allocator<char>> ()>&&)","symbolLocation":40,"imageIndex":2},{"imageOffset":11945068,"symbol":"std::__1::__function::__func<void (*)(std::__1::function<void ()> const&, std::__1::function<std::__1::basic_string<char, std::__1::char_traits<char>, std::__1::allocator<char>> ()>), void (std::__1::function<void ()> const&, std::__1::function<std::__1::basic_string<char, std::__1::char_traits<char>, std::__1::allocator<char>> ()>)>::operator()(std::__1::function<void ()> const&, std::__1::function<std::__1::basic_string<char, std::__1::char_traits<char>, std::__1::allocator<char>> ()>&&)","symbolLocation":44,"imageIndex":2},{"imageOffset":23256516,"symbol":"std::__1::__function::__value_func<void (std::__1::function<void ()> const&, std::__1::function<std::__1::basic_string<char, std::__1::char_traits<char>, std::__1::allocator<char>> ()>)>::operator()[abi:dee210106](std::__1::function<void ()> const&, std::__1::function<std::__1::basic_string<char, std::__1::char_traits<char>, std::__1::allocator<char>> ()>&&) const","symbolLocation":76,"imageIndex":2},{"imageOffset":23228996,"symbol":"std::__1::function<void (std::__1::function<void ()> const&, std::__1::function<std::__1::basic_string<char, std::__1::char_traits<char>, std::__1::allocator<char>> ()>)>::operator()(std::__1::function<void ()> const&, std::__1::function<std::__1::basic_string<char, std::__1::char_traits<char>, std::__1::allocator<char>> ()>) const","symbolLocation":40,"imageIndex":2},{"imageOffset":23228020,"symbol":"facebook::react::JSIExecutor::callFunction(std::__1::basic_string<char, std::__1::char_traits<char>, std::__1::allocator<char>> const&, std::__1::basic_string<char, std::__1::char_traits<char>, std::__1::allocator<char>> const&, folly::dynamic const&)","symbolLocation":316,"imageIndex":2},{"imageOffset":22397456,"symbol":"facebook::react::NativeToJsBridge::callFunction(std::__1::basic_string<char, std::__1::char_traits<char>, std::__1::allocator<char>>&&, std::__1::basic_string<char, std::__1::char_traits<char>, std::__1::allocator<char>>&&, folly::dynamic&&)::$_0::operator()(facebook::react::JSExecutor*) const","symbolLocation":636,"imageIndex":2},{"imageOffset":22396808,"symbol":"std::__1::__invoke_result_impl<void, facebook::react::NativeToJsBridge::callFunction(std::__1::basic_string<char, std::__1::char_traits<char>, std::__1::allocator<char>>&&, std::__1::basic_string<char, std::__1::char_traits<char>, std::__1::allocator<char>>&&, folly::dynamic&&)::$_0&, facebook::react::JSExecutor*>::type std::__1::__invoke[abi:dee210106]<facebook::react::NativeToJsBridge::callFunction(std::__1::basic_string<char, std::__1::char_traits<char>, std::__1::allocator<char>>&&, std::__1::basic_string<char, std::__1::char_traits<char>, std::__1::allocator<char>>&&, folly::dynamic&&)::$_0&, facebook::react::JSExecutor*>(facebook::react::NativeToJsBridge::callFunction(std::__1::basic_string<char, std::__1::char_traits<char>, std::__1::allocator<char>>&&, std::__1::basic_string<char, std::__1::char_traits<char>, std::__1::allocator<char>>&&, folly::dynamic&&)::$_0&, facebook::react::JSExecutor*&&)","symbolLocation":36,"imageIndex":2},{"imageOffset":22396760,"symbol":"void std::__1::__invoke_void_return_wrapper<void, true>::__call[abi:dee210106]<facebook::react::NativeToJsBridge::callFunction(std::__1::basic_string<char, std::__1::char_traits<char>, std::__1::allocator<char>>&&, std::__1::basic_string<char, std::__1::char_traits<char>, std::__1::allocator<char>>&&, folly::dynamic&&)::$_0&, facebook::react::JSExecutor*>(facebook::react::NativeToJsBridge::callFunction(std::__1::basic_string<char, std::__1::char_traits<char>, std::__1::allocator<char>>&&, std::__1::basic_string<char, std::__1::char_traits<char>, std::__1::allocator<char>>&&, folly::dynamic&&)::$_0&, facebook::react::JSExecutor*&&)","symbolLocation":32,"imageIndex":2},{"imageOffset":22396716,"symbol":"void std::__1::__invoke_r[abi:dee210106]<void, facebook::react::NativeToJsBridge::callFunction(std::__1::basic_string<char, std::__1::char_traits<char>, std::__1::allocator<char>>&&, std::__1::basic_string<char, std::__1::char_traits<char>, std::__1::allocator<char>>&&, folly::dynamic&&)::$_0&, facebook::react::JSExecutor*>(facebook::react::NativeToJsBridge::callFunction(std::__1::basic_string<char, std::__1::char_traits<char>, std::__1::allocator<char>>&&, std::__1::basic_string<char, std::__1::char_traits<char>, std::__1::allocator<char>>&&, folly::dynamic&&)::$_0&, facebook::react::JSExecutor*&&)","symbolLocation":32,"imageIndex":2},{"imageOffset":22395936,"symbol":"std::__1::__function::__func<facebook::react::NativeToJsBridge::callFunction(std::__1::basic_string<char, std::__1::char_traits<char>, std::__1::allocator<char>>&&, std::__1::basic_string<char, std::__1::char_traits<char>, std::__1::allocator<char>>&&, folly::dynamic&&)::$_0, void (facebook::react::JSExecutor*)>::operator()(facebook::react::JSExecutor*&&)","symbolLocation":36,"imageIndex":2},{"imageOffset":22407996,"symbol":"std::__1::__function::__value_func<void (facebook::react::JSExecutor*)>::operator()[abi:dee210106](facebook::react::JSExecutor*&&) const","symbolLocation":68,"imageIndex":2},{"imageOffset":22407892,"symbol":"std::__1::function<void (facebook::react::JSExecutor*)>::operator()(facebook::react::JSExecutor*) const","symbolLocation":36,"imageIndex":2},{"imageOffset":22407840,"symbol":"facebook::react::NativeToJsBridge::runOnExecutorQueue(std::__1::function<void (facebook::react::JSExecutor*)>&&)::$_0::operator()() const","symbolLocation":92,"imageIndex":2},{"imageOffset":22407736,"symbol":"std::__1::__invoke_result_impl<void, facebook::react::NativeToJsBridge::runOnExecutorQueue(std::__1::function<void (facebook::react::JSExecutor*)>&&)::$_0&>::type std::__1::__invoke[abi:dee210106]<facebook::react::NativeToJsBridge::runOnExecutorQueue(std::__1::function<void (facebook::react::JSExecutor*)>&&)::$_0&>(facebook::react::NativeToJsBridge::runOnExecutorQueue(std::__1::function<void (facebook::react::JSExecutor*)>&&)::$_0&)","symbolLocation":24,"imageIndex":2},{"imageOffset":22407700,"symbol":"void std::__1::__invoke_void_return_wrapper<void, true>::__call[abi:dee210106]<facebook::react::NativeToJsBridge::runOnExecutorQueue(std::__1::function<void (facebook::react::JSExecutor*)>&&)::$_0&>(facebook::react::NativeToJsBridge::runOnExecutorQueue(std::__1::function<void (facebook::react::JSExecutor*)>&&)::$_0&)","symbolLocation":24,"imageIndex":2},{"imageOffset":22407664,"symbol":"void std::__1::__invoke_r[abi:dee210106]<void, facebook::react::NativeToJsBridge::runOnExecutorQueue(std::__1::function<void (facebook::react::JSExecutor*)>&&)::$_0&>(facebook::react::NativeToJsBridge::runOnExecutorQueue(std::__1::function<void (facebook::react::JSExecutor*)>&&)::$_0&)","symbolLocation":24,"imageIndex":2},{"imageOffset":22406540,"symbol":"std::__1::__function::__func<facebook::react::NativeToJsBridge::runOnExecutorQueue(std::__1::function<void (facebook::react::JSExecutor*)>&&)::$_0, void ()>::operator()()","symbolLocation":28,"imageIndex":2},{"imageOffset":2752200,"symbol":"std::__1::__function::__value_func<void ()>::operator()[abi:dee210106]() const","symbolLocation":60,"imageIndex":2},{"imageOffset":2752128,"symbol":"std::__1::function<void ()>::operator()() const","symbolLocation":24,"imageIndex":2},{"imageOffset":12011432,"symbol":"facebook::react::tryAndReturnError(std::__1::function<void ()> const&)","symbolLocation":24,"imageIndex":2},{"imageOffset":12180036,"symbol":"facebook::react::RCTMessageThread::tryFunc(std::__1::function<void ()> const&)","symbolLocation":36,"imageIndex":2},{"imageOffset":12187780,"symbol":"facebook::react::RCTMessageThread::runOnQueue(std::__1::function<void ()>&&)::$_0::operator()() const","symbolLocation":80,"imageIndex":2},{"imageOffset":12187688,"symbol":"std::__1::__invoke_result_impl<void, facebook::react::RCTMessageThread::runOnQueue(std::__1::function<void ()>&&)::$_0&>::type std::__1::__invoke[abi:dee210106]<facebook::react::RCTMessageThread::runOnQueue(std::__1::function<void ()>&&)::$_0&>(facebook::react::RCTMessageThread::runOnQueue(std::__1::function<void ()>&&)::$_0&)","symbolLocation":24,"imageIndex":2},{"imageOffset":12187652,"symbol":"void std::__1::__invoke_void_return_wrapper<void, true>::__call[abi:dee210106]<facebook::react::RCTMessageThread::runOnQueue(std::__1::function<void ()>&&)::$_0&>(facebook::react::RCTMessageThread::runOnQueue(std::__1::function<void ()>&&)::$_0&)","symbolLocation":24,"imageIndex":2},{"imageOffset":12187616,"symbol":"void std::__1::__invoke_r[abi:dee210106]<void, facebook::react::RCTMessageThread::runOnQueue(std::__1::function<void ()>&&)::$_0&>(facebook::react::RCTMessageThread::runOnQueue(std::__1::function<void ()>&&)::$_0&)","symbolLocation":24,"imageIndex":2},{"imageOffset":12186908,"symbol":"std::__1::__function::__func<facebook::react::RCTMessageThread::runOnQueue(std::__1::function<void ()>&&)::$_0, void ()>::operator()()","symbolLocation":28,"imageIndex":2},{"imageOffset":2752200,"symbol":"std::__1::__function::__value_func<void ()>::operator()[abi:dee210106]() const","symbolLocation":60,"imageIndex":2},{"imageOffset":2752128,"symbol":"std::__1::function<void ()>::operator()() const","symbolLocation":24,"imageIndex":2},{"imageOffset":12179428,"symbol":"invocation function for block in facebook::react::RCTMessageThread::runAsync(std::__1::function<void ()>)","symbolLocation":48,"imageIndex":2},{"imageOffset":605480,"symbol":"__CFRUNLOOP_IS_CALLING_OUT_TO_A_BLOCK__","symbolLocation":20,"imageIndex":16},{"imageOffset":603316,"symbol":"__CFRunLoopDoBlocks","symbolLocation":340,"imageIndex":16},{"imageOffset":601592,"symbol":"__CFRunLoopRun","symbolLocation":2280,"imageIndex":16},{"imageOffset":579844,"symbol":"_CFRunLoopRunSpecificWithOptions","symbolLocation":496,"imageIndex":16},{"imageOffset":11865064,"symbol":"+[RCTCxxBridge runRunLoop]","symbolLocation":772,"imageIndex":2},{"imageOffset":9522908,"symbol":"__NSThread__start__","symbolLocation":716,"imageIndex":20},{"imageOffset":26172,"symbol":"_pthread_start","symbolLocation":104,"imageIndex":13},{"imageOffset":6708,"symbol":"thread_start","symbolLocation":8,"imageIndex":13}]},{"id":317802,"name":"com.apple.CFNetwork.CustomProtocols","threadState":{"x":[{"value":268451845},{"value":21592279046},{"value":8589934592},{"value":166039140696064},{"value":0},{"value":166039140696064},{"value":2},{"value":4294967295},{"value":0},{"value":17179869184},{"value":0},{"value":2},{"value":0},{"value":0},{"value":38659},{"value":3072},{"value":18446744073709551569},{"value":6444053628,"symbolLocation":0,"symbol":"-[OS_dispatch_object dealloc]"},{"value":0},{"value":4294967295},{"value":2},{"value":166039140696064},{"value":0},{"value":166039140696064},{"value":21592279046},{"value":6178069832},{"value":8589934592},{"value":18446744073709550527},{"value":4301766656,"symbolLocation":0,"symbol":"_libkernel_string_functions"}],"flavor":"ARM_THREAD_STATE64","lr":{"value":4301561436},"cpsr":{"value":0},"fp":{"value":6178069680},"sp":{"value":6178069600},"esr":{"value":1442840704,"description":"(Syscall)"},"pc":{"value":4301491056},"far":{"value":0}},"frames":[{"imageOffset":2928,"symbol":"mach_msg2_trap","symbolLocation":8,"imageIndex":12},{"imageOffset":73308,"symbol":"mach_msg2_internal","symbolLocation":72,"imageIndex":12},{"imageOffset":35908,"symbol":"mach_msg_overwrite","symbolLocation":484,"imageIndex":12},{"imageOffset":3824,"symbol":"mach_msg","symbolLocation":20,"imageIndex":12},{"imageOffset":604096,"symbol":"__CFRunLoopServiceMachPort","symbolLocation":156,"imageIndex":16},{"imageOffset":600440,"symbol":"__CFRunLoopRun","symbolLocation":1128,"imageIndex":16},{"imageOffset":579844,"symbol":"_CFRunLoopRunSpecificWithOptions","symbolLocation":496,"imageIndex":16},{"imageOffset":2101280,"symbol":"+[__CFN_CoreSchedulingSetRunnable _run:]","symbolLocation":368,"imageIndex":23},{"imageOffset":9522908,"symbol":"__NSThread__start__","symbolLocation":716,"imageIndex":20},{"imageOffset":26172,"symbol":"_pthread_start","symbolLocation":104,"imageIndex":13},{"imageOffset":6708,"symbol":"thread_start","symbolLocation":8,"imageIndex":13}]},{"id":317804,"name":"hades","threadState":{"x":[{"value":260},{"value":0},{"value":97536},{"value":0},{"value":0},{"value":160},{"value":0},{"value":0},{"value":6178647720},{"value":0},{"value":0},{"value":2},{"value":2},{"value":0},{"value":0},{"value":0},{"value":305},{"value":18446744072367376383},{"value":0},{"value":4346732032},{"value":4346732096},{"value":6178648288},{"value":0},{"value":0},{"value":97536},{"value":97537},{"value":97792},{"value":0},{"value":0}],"flavor":"ARM_THREAD_STATE64","lr":{"value":4305054464},"cpsr":{"value":1610612736},"fp":{"value":6178647840},"sp":{"value":6178647696},"esr":{"value":1442840704,"description":"(Syscall)"},"pc":{"value":4301504556},"far":{"value":0}},"frames":[{"imageOffset":16428,"symbol":"__psynch_cvwait","symbolLocation":8,"imageIndex":12},{"imageOffset":27392,"symbol":"_pthread_cond_wait","symbolLocation":972,"imageIndex":13},{"imageOffset":132612,"symbol":"std::__1::condition_variable::wait(std::__1::unique_lock<std::__1::mutex>&)","symbolLocation":28,"imageIndex":25},{"imageOffset":1716640,"symbol":"hermes::vm::HadesGC::Executor::worker()","symbolLocation":112,"imageIndex":4},{"imageOffset":1716484,"symbol":"void* std::__1::__thread_proxy[abi:v160006]<std::__1::tuple<std::__1::unique_ptr<std::__1::__thread_struct, std::__1::default_delete<std::__1::__thread_struct>>, hermes::vm::HadesGC::Executor::Executor()::'lambda'()>>(void*)","symbolLocation":44,"imageIndex":4},{"imageOffset":26172,"symbol":"_pthread_start","symbolLocation":104,"imageIndex":13},{"imageOffset":6708,"symbol":"thread_start","symbolLocation":8,"imageIndex":13}]},{"id":317805,"name":"com.apple.CFSocket.private","threadState":{"x":[{"value":4},{"value":0},{"value":4341369760},{"value":0},{"value":0},{"value":0},{"value":67108864},{"value":0},{"value":6179221728},{"value":8381268776,"symbolLocation":0,"symbol":"OBJC_CLASS_$___NSCFArray"},{"value":68719476728},{"value":15},{"value":13},{"value":4339410624},{"value":72057602419196713,"symbolLocation":72057594037927937,"symbol":"OBJC_CLASS_$___NSCFArray"},{"value":8381268776,"symbolLocation":0,"symbol":"OBJC_CLASS_$___NSCFArray"},{"value":93},{"value":6446696768,"symbolLocation":0,"symbol":"-[__NSCFArray objectAtIndex:]"},{"value":0},{"value":4346540656},{"value":8381288448,"symbolLocation":792,"symbol":"__last_exception_os_log_pack__"},{"value":64},{"value":8381291584,"symbolLocation":0,"symbol":"__CFActiveSocketsLock"},{"value":0},{"value":4341369760},{"value":4365091968},{"value":4341369776},{"value":0},{"value":4365091920}],"flavor":"ARM_THREAD_STATE64","lr":{"value":6446844812},"cpsr":{"value":1610612736},"fp":{"value":6179221440},"sp":{"value":6179187664},"esr":{"value":1442840704,"description":"(Syscall)"},"pc":{"value":4301533108},"far":{"value":0}},"frames":[{"imageOffset":44980,"symbol":"__select","symbolLocation":8,"imageIndex":12},{"imageOffset":662412,"symbol":"__CFSocketManager","symbolLocation":680,"imageIndex":16},{"imageOffset":26172,"symbol":"_pthread_start","symbolLocation":104,"imageIndex":13},{"imageOffset":6708,"symbol":"thread_start","symbolLocation":8,"imageIndex":13}]},{"id":317812,"name":"com.apple.CFStream.LegacyThread","threadState":{"x":[{"value":268451845},{"value":21592279046},{"value":8589934592},{"value":270492745334784},{"value":0},{"value":270492745334784},{"value":2},{"value":4294967295},{"value":0},{"value":17179869184},{"value":0},{"value":2},{"value":0},{"value":0},{"value":62979},{"value":3072},{"value":18446744073709551569},{"value":4364963128},{"value":0},{"value":4294967295},{"value":2},{"value":270492745334784},{"value":0},{"value":270492745334784},{"value":21592279046},{"value":6179790856},{"value":8589934592},{"value":18446744073709550527},{"value":4301766656,"symbolLocation":0,"symbol":"_libkernel_string_functions"}],"flavor":"ARM_THREAD_STATE64","lr":{"value":4301561436},"cpsr":{"value":0},"fp":{"value":6179790704},"sp":{"value":6179790624},"esr":{"value":1442840704,"description":"(Syscall)"},"pc":{"value":4301491056},"far":{"value":0}},"frames":[{"imageOffset":2928,"symbol":"mach_msg2_trap","symbolLocation":8,"imageIndex":12},{"imageOffset":73308,"symbol":"mach_msg2_internal","symbolLocation":72,"imageIndex":12},{"imageOffset":35908,"symbol":"mach_msg_overwrite","symbolLocation":484,"imageIndex":12},{"imageOffset":3824,"symbol":"mach_msg","symbolLocation":20,"imageIndex":12},{"imageOffset":604096,"symbol":"__CFRunLoopServiceMachPort","symbolLocation":156,"imageIndex":16},{"imageOffset":600440,"symbol":"__CFRunLoopRun","symbolLocation":1128,"imageIndex":16},{"imageOffset":579844,"symbol":"_CFRunLoopRunSpecificWithOptions","symbolLocation":496,"imageIndex":16},{"imageOffset":725924,"symbol":"_legacyStreamRunLoop_workThread","symbolLocation":260,"imageIndex":16},{"imageOffset":26172,"symbol":"_pthread_start","symbolLocation":104,"imageIndex":13},{"imageOffset":6708,"symbol":"thread_start","symbolLocation":8,"imageIndex":13}]},{"id":319469,"name":"hades","threadState":{"x":[{"value":260},{"value":0},{"value":0},{"value":0},{"value":0},{"value":160},{"value":0},{"value":0},{"value":6167785128},{"value":0},{"value":0},{"value":2},{"value":2},{"value":0},{"value":0},{"value":0},{"value":305},{"value":0},{"value":0},{"value":4613279680},{"value":4613279744},{"value":6167785696},{"value":0},{"value":0},{"value":0},{"value":1},{"value":256},{"value":0},{"value":0}],"flavor":"ARM_THREAD_STATE64","lr":{"value":4305054464},"cpsr":{"value":1610612736},"fp":{"value":6167785248},"sp":{"value":6167785104},"esr":{"value":1442840704,"description":"(Syscall)"},"pc":{"value":4301504556},"far":{"value":0}},"frames":[{"imageOffset":16428,"symbol":"__psynch_cvwait","symbolLocation":8,"imageIndex":12},{"imageOffset":27392,"symbol":"_pthread_cond_wait","symbolLocation":972,"imageIndex":13},{"imageOffset":132612,"symbol":"std::__1::condition_variable::wait(std::__1::unique_lock<std::__1::mutex>&)","symbolLocation":28,"imageIndex":25},{"imageOffset":1716640,"symbol":"hermes::vm::HadesGC::Executor::worker()","symbolLocation":112,"imageIndex":4},{"imageOffset":1716484,"symbol":"void* std::__1::__thread_proxy[abi:v160006]<std::__1::tuple<std::__1::unique_ptr<std::__1::__thread_struct, std::__1::default_delete<std::__1::__thread_struct>>, hermes::vm::HadesGC::Executor::Executor()::'lambda'()>>(void*)","symbolLocation":44,"imageIndex":4},{"imageOffset":26172,"symbol":"_pthread_start","symbolLocation":104,"imageIndex":13},{"imageOffset":6708,"symbol":"thread_start","symbolLocation":8,"imageIndex":13}]},{"id":779826,"frames":[],"threadState":{"x":[{"value":6170652672},{"value":46839},{"value":6170116096},{"value":0},{"value":409604},{"value":18446744073709551615},{"value":0},{"value":0},{"value":0},{"value":0},{"value":0},{"value":0},{"value":0},{"value":0},{"value":0},{"value":0},{"value":0},{"value":0},{"value":0},{"value":0},{"value":0},{"value":0},{"value":0},{"value":0},{"value":0},{"value":0},{"value":0},{"value":0},{"value":0}],"flavor":"ARM_THREAD_STATE64","lr":{"value":0},"cpsr":{"value":0},"fp":{"value":0},"sp":{"value":6170652672},"esr":{"value":1442840704,"description":"(Syscall)"},"pc":{"value":4305033760},"far":{"value":0}}},{"id":780728,"frames":[],"threadState":{"x":[{"value":6168932352},{"value":44787},{"value":6168395776},{"value":0},{"value":409604},{"value":18446744073709551615},{"value":0},{"value":0},{"value":0},{"value":0},{"value":0},{"value":0},{"value":0},{"value":0},{"value":0},{"value":0},{"value":0},{"value":0},{"value":0},{"value":0},{"value":0},{"value":0},{"value":0},{"value":0},{"value":0},{"value":0},{"value":0},{"value":0},{"value":0}],"flavor":"ARM_THREAD_STATE64","lr":{"value":0},"cpsr":{"value":0},"fp":{"value":0},"sp":{"value":6168932352},"esr":{"value":1442840704,"description":"(Syscall)"},"pc":{"value":4305033760},"far":{"value":0}}},{"id":780730,"frames":[],"threadState":{"x":[{"value":6171226112},{"value":47163},{"value":6170689536},{"value":0},{"value":409604},{"value":18446744073709551615},{"value":0},{"value":0},{"value":0},{"value":0},{"value":0},{"value":0},{"value":0},{"value":0},{"value":0},{"value":0},{"value":0},{"value":0},{"value":0},{"value":0},{"value":0},{"value":0},{"value":0},{"value":0},{"value":0},{"value":0},{"value":0},{"value":0},{"value":0}],"flavor":"ARM_THREAD_STATE64","lr":{"value":0},"cpsr":{"value":0},"fp":{"value":0},"sp":{"value":6171226112},"esr":{"value":1442840704,"description":"(Syscall)"},"pc":{"value":4305033760},"far":{"value":0}}},{"id":780874,"frames":[],"threadState":{"x":[{"value":6168358912},{"value":56543},{"value":6167822336},{"value":0},{"value":409604},{"value":18446744073709551615},{"value":0},{"value":0},{"value":0},{"value":0},{"value":0},{"value":0},{"value":0},{"value":0},{"value":0},{"value":0},{"value":0},{"value":0},{"value":0},{"value":0},{"value":0},{"value":0},{"value":0},{"value":0},{"value":0},{"value":0},{"value":0},{"value":0},{"value":0}],"flavor":"ARM_THREAD_STATE64","lr":{"value":0},"cpsr":{"value":0},"fp":{"value":0},"sp":{"value":6168358912},"esr":{"value":1442840704,"description":"(Syscall)"},"pc":{"value":4305033760},"far":{"value":0}}}],
  "usedImages" : [
  {
    "source" : "P",
    "arch" : "arm64",
    "base" : 4299653120,
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
    "base" : 4300374016,
    "size" : 327680,
    "uuid" : "ba544d9a-46ab-3c59-a00f-aba1479d2079",
    "path" : "\/Volumes\/VOLUME\/*\/dyld_sim",
    "name" : "dyld_sim"
  },
  {
    "source" : "P",
    "arch" : "arm64",
    "base" : 4373200896,
    "size" : 27607040,
    "uuid" : "8012d4dd-7c45-3a2f-b711-1d05bed48eaa",
    "path" : "\/Users\/USER\/Library\/Developer\/CoreSimulator\/Devices\/D90D7F2D-2DF3-4611-8356-BDEDCC12E373\/data\/Containers\/Bundle\/Application\/B96FADAA-9DF9-499D-836B-3A35BD3BAE61\/MotoCortex.app\/MotoCortex.debug.dylib",
    "name" : "MotoCortex.debug.dylib"
  },
  {
    "source" : "P",
    "arch" : "arm64",
    "base" : 4303945728,
    "CFBundleIdentifier" : "io.vlcn.crsqlite",
    "size" : 589824,
    "uuid" : "01bd5c62-4036-30bd-94be-6a5b43f03062",
    "path" : "\/Users\/USER\/Library\/Developer\/CoreSimulator\/Devices\/D90D7F2D-2DF3-4611-8356-BDEDCC12E373\/data\/Containers\/Bundle\/Application\/B96FADAA-9DF9-499D-836B-3A35BD3BAE61\/MotoCortex.app\/Frameworks\/crsqlite.framework\/crsqlite",
    "name" : "crsqlite"
  },
  {
    "source" : "P",
    "arch" : "arm64",
    "base" : 4311629824,
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
    "base" : 4299816960,
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
    "base" : 4301144064,
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
    "base" : 4318232576,
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
    "base" : 4299898880,
    "size" : 16384,
    "uuid" : "3119af59-1eaa-3731-a7cb-c21c556b63c0",
    "path" : "\/Volumes\/VOLUME\/*\/libswiftDataDetection.dylib",
    "name" : "libswiftDataDetection.dylib"
  },
  {
    "source" : "P",
    "arch" : "arm64",
    "base" : 4299980800,
    "size" : 16384,
    "uuid" : "710be927-bac3-3b9e-b7ce-dbe0c5e8e2a5",
    "path" : "\/Volumes\/VOLUME\/*\/libswiftUIKit.dylib",
    "name" : "libswiftUIKit.dylib"
  },
  {
    "source" : "P",
    "arch" : "arm64",
    "base" : 4300029952,
    "size" : 16384,
    "uuid" : "8c7e08c0-69a9-3be9-8f41-60c74fba8e5c",
    "path" : "\/Volumes\/VOLUME\/*\/libswiftFileProvider.dylib",
    "name" : "libswiftFileProvider.dylib"
  },
  {
    "source" : "P",
    "arch" : "arm64",
    "base" : 4300079104,
    "size" : 49152,
    "uuid" : "0831b8d2-190f-31fc-9eb6-ea8ba11fe47b",
    "path" : "\/usr\/lib\/system\/libsystem_platform.dylib",
    "name" : "libsystem_platform.dylib"
  },
  {
    "source" : "P",
    "arch" : "arm64",
    "base" : 4301488128,
    "size" : 245760,
    "uuid" : "2144ef57-8439-3be2-88a3-7d67766bcb03",
    "path" : "\/usr\/lib\/system\/libsystem_kernel.dylib",
    "name" : "libsystem_kernel.dylib"
  },
  {
    "source" : "P",
    "arch" : "arm64",
    "base" : 4305027072,
    "size" : 65536,
    "uuid" : "1e522024-387b-3d18-81ca-f4559198954b",
    "path" : "\/usr\/lib\/system\/libsystem_pthread.dylib",
    "name" : "libsystem_pthread.dylib"
  },
  {
    "source" : "P",
    "arch" : "arm64",
    "base" : 4306059264,
    "size" : 49152,
    "uuid" : "75fa6778-178f-394f-9c63-711780430596",
    "path" : "\/Volumes\/VOLUME\/*\/libobjc-trampolines.dylib",
    "name" : "libobjc-trampolines.dylib"
  },
  {
    "source" : "P",
    "arch" : "arm64e",
    "base" : 4302635008,
    "size" : 688128,
    "uuid" : "f924bdd3-4365-3466-9580-8b1b3fa8f857",
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
    "base" : 6442680320,
    "size" : 248132,
    "uuid" : "727c4040-5e6d-3dae-b22c-9a337d46c34f",
    "path" : "\/Volumes\/VOLUME\/*\/libobjc.A.dylib",
    "name" : "libobjc.A.dylib"
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
  "uuid" : "1a6ee8cf-7c8b-3a7a-9245-80c8c3e83e01"
},
  "vmSummary" : "ReadOnly portion of Libraries: Total=1.9G resident=0K(0%) swapped_out_or_unallocated=1.9G(100%)\nWritable regions: Total=3.2G written=5286K(0%) resident=4342K(0%) swapped_out=944K(0%) unallocated=3.2G(100%)\n\n                                VIRTUAL   REGION \nREGION TYPE                        SIZE    COUNT (non-coalesced) \n===========                     =======  ======= \nActivity Tracing                   256K        1 \nCG raster data                    1696K       33 \nCoreAnimation                     1920K       47 \nFoundation                          16K        1 \nIOSurface                         4096K        1 \nKernel Alloc Once                   32K        1 \nMALLOC                           214.5M       57 \nMALLOC guard page                 3904K        4 \nMach message                        16K        1 \nSQLite page cache                 1152K        9 \nSTACK GUARD                       56.2M       14 \nStack                             15.4M       15 \nVM_ALLOCATE                        3.0G     2318 \n__AUTH_CONST                        32K        1 \n__DATA                            53.8M      882 \n__DATA_CONST                     115.0M      909 \n__DATA_DIRTY                       155K       14 \n__FONT_DATA                        2352        1 \n__LINKEDIT                       750.7M       17 \n__OBJC_RO                         55.6M        1 \n__OBJC_RW                         2332K        1 \n__TEXT                             1.1G      924 \n__TPRO_CONST                       164K        3 \ndyld private memory                3.0G       16 \nmapped file                       61.3M       15 \npage table in kernel              4342K        1 \nshared memory                       16K        1 \n===========                     =======  ======= \nTOTAL                              8.4G     5288 \n",
  "legacyInfo" : {
  "threadTriggered" : {
    "name" : "com.facebook.react.JavaScript"
  }
},
  "logWritingSignature" : "f1351769a37793970e24e505d0a370ec2f76b828",
  "roots_installed" : 0,
  "bug_type" : "309",
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
      "deploymentId" : 240000041
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
