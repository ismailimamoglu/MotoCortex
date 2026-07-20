// src/hooks/useBluetooth.ts  
// MotoCortex v7.9.9 - Production-Grade Global Handshake & Restoration Engine

import React, { useState, useEffect, useCallback, useRef } from 'react';  
import { Alert, Platform, AppState, PermissionsAndroid } from 'react-native';  
import { useTranslation } from 'react-i18next';  
import i18n from '../i18n';  
import AsyncStorage from '@react-native-async-storage/async-storage';  
import BluetoothService from '../api/BluetoothService';  
import { BluetoothPermissionError } from '../api/BluetoothService';  
import OBDCommandQueue, { preciseSleep, waitForELMPrompt } from '../api/OBDCommandQueue';  
import { useBluetoothStore, DiagnosticDtcArray, ConnectionStep } from '../store/useBluetoothStore';  
import { useAppStore } from '../store/useAppStore';  
import { ADAPTER_COMMANDS } from '../api/commands';  
import { CapabilityDiscoveryManager } from '../core/connection/CapabilityDiscoveryManager';  
import { VehicleProfileDB } from '../core/pids/VehicleProfileDB';  
import { ProtocolCircuitBreaker } from '../core/connection/ProtocolCircuitBreaker';  
import { TransportRateLimiter } from '../core/transport/TransportRateLimiter';  
import { prefetchDtcChunks } from '../data/dtcDictionary'; // Sabitlenen Import Modülü
import { getMakeFromVin } from '../utils/vinDecoder';  
import RNFS from 'react-native-fs';  
import { preloadDynamicDtc } from '../data/dtcStorage';  
import { useTelemetryStore } from '../store/useTelemetryStore';  
import { calculateSessionHash } from '../utils/crypto';  
import { bindVinToRegisteredVehicle } from '../store/garageStore';  
import { ConnectionStateMachine, ConnectionState } from '../core/connection/ConnectionStateMachine';  
import { ProtocolNegotiator } from '../core/connection/ProtocolNegotiator';  
import { PollingOrchestrator } from '../core/connection/PollingOrchestrator';  
import { ProtocolEngine } from '../core/connection/ProtocolEngine';
import CommandScheduler from '../core/queue/CommandScheduler';

export const useBluetooth = () => {  
   const { i18n: reactI18n } = useTranslation();  
   const t = useCallback((key: string, options?: any) => i18n.t(key, options) as string, [reactI18n.language]);

   const isInitializationMutexLocked = useRef(false);
   const softRecoveryAttempts = useRef(0);

   const status = useBluetoothStore(s => s.status);  
   const adapterStatus = useBluetoothStore(s => s.adapterStatus);  
   const ecuStatus = useBluetoothStore(s => s.ecuStatus);  
   const connectionState = useBluetoothStore(s => s.connectionState);  
   const deviceName = useBluetoothStore(s => s.deviceName);  
   const deviceId = useBluetoothStore(s => s.deviceId);  
   const lastResponse = useBluetoothStore(s => s.lastResponse);  
   const error = useBluetoothStore(s => s.error);  
   const setStatus = useBluetoothStore(s => s.setStatus);  
   const setAdapterStatus = useBluetoothStore(s => s.setAdapterStatus);  
   const setEcuStatus = useBluetoothStore(s => s.setEcuStatus);  
   const setDevice = useBluetoothStore(s => s.setDevice);  
   const setLastResponse = useBluetoothStore(s => s.setLastResponse);  
   const setError = useBluetoothStore(s => s.setError);  
   const logs = useBluetoothStore(s => s.logs);  
   const clearLogs = useBluetoothStore(s => s.clearLogs);  
   const reset = useBluetoothStore(s => s.reset);  
   const lastDeviceId = useBluetoothStore(s => s.lastDeviceId);  
   const lastDeviceName = useBluetoothStore(s => s.lastDeviceName);  
   const setLastDevice = useBluetoothStore(s => s.setLastDevice);  
   const isCloneDevice = useBluetoothStore(s => s.isCloneDevice);  
   const isPollingActive = useBluetoothStore(s => s.isPollingActive);
   const isRecoveryActive = useBluetoothStore(s => s.status === 'error');

   const dtcs = useBluetoothStore(s => s.dtcs);
   const vin = useBluetoothStore(s => s.vin);
   const odometer = useBluetoothStore(s => s.odometer);
   const distanceSinceCleared = useBluetoothStore(s => s.distanceSinceCleared);
   const distanceMilOn = useBluetoothStore(s => s.distanceMilOn);
   const isDiagnosticMode = useBluetoothStore(s => s.isDiagnosticMode);
   const isAdaptationRunning = useBluetoothStore(s => s.isAdaptationRunning);
   const protocol = useBluetoothStore(s => s.protocol);
   const adapterCapabilityScore = useBluetoothStore(s => s.adapterCapabilityScore);

   const updateStep = useCallback((id: string, status: 'idle' | 'pending' | 'success' | 'failed', progress: number) => {  
       const steps = useBluetoothStore.getState().connectionSteps.map(step =>  
           step.id === id ? { ...step, status } : step  
       );  
       useBluetoothStore.getState().setSensorData({ connectionSteps: steps, connectionProgress: progress });  
   }, []);

   const sendCommand = useCallback(async (cmd: string) => {  
       if (useBluetoothStore.getState().status !== 'connected') {  
           setError('Not connected'); return;  
       }  
       try {  
           const res = await OBDCommandQueue.add(cmd);  
           setLastResponse(res); return res;  
       } catch (e) {  
           setError(e instanceof Error ? e.message : String(e)); throw e;  
       }  
   }, [setError, setLastResponse]);

    const startPolling = useCallback(() => {  
        const supported = useBluetoothStore.getState().supportedPids;
        PollingOrchestrator.startPolling(supported);  
        useBluetoothStore.getState().setSensorData({ isPollingActive: true });  
    }, []);

    const stopPolling = useCallback(() => {  
        PollingOrchestrator.stopPolling();  
        useBluetoothStore.getState().setSensorData({ isPollingActive: false });  
    }, []);

   const verifyHandshakeResponse = (rawResponse: string, sentCommand: string): boolean => {  
       if (!rawResponse) return false;  
       const clean = rawResponse.toUpperCase().replace(/\s+/g, '');  
       const isHardNegative = clean.includes('CANERROR') || clean.includes('NODATA') || clean.includes('BUSBUSY') || clean.includes('BUSERROR');  
       if (isHardNegative) return false;

       const expectedModeEcho = sentCommand.startsWith('01') ? '41' : '49';  
       const pidHex = sentCommand.replace(/\s+/g, '').slice(-2).toUpperCase();  
       const targetPattern = expectedModeEcho + pidHex;

       return clean.includes(targetPattern) || rawResponse.toUpperCase().includes('BUS INIT');  
   };

   const triggerTelemetryEnqueue = useCallback(async () => {  
       const btState = useBluetoothStore.getState();  
       const telemetryState = useTelemetryStore.getState();  
       if (btState.status !== 'connected' || !telemetryState.activeSessionVehicle) return;

       const { brand, model, year } = telemetryState.activeSessionVehicle;  
       const protocol = useAppStore.getState().isSimulationMode ? 'SIMULATED_OBD' : 'ISO_15765_4_CAN';  
       const session_hash = await calculateSessionHash(  
           Platform.OS === 'android' ? useAppStore.getState().appUserId : useAppStore.getState().deviceUuid,  
           brand, model, year, btState.dtcs || [], new Date().toISOString().split('T')[0], telemetryState.sessionDynamicKey || ''  
       );

       telemetryState.enqueueTelemetry({  
           brand, model, year, protocol, ecu_id: btState.ecuId || 'UNKNOWN_ECU',  
           dtc_codes: btState.dtcs || [], session_hash, engine_rpm: btState.rpm !== null ? Math.round(btState.rpm) : 0,  
           coolant_temp: btState.coolant !== null ? btState.coolant : 0.0, throttle_pos: btState.throttle !== null ? btState.throttle : 0.0,  
           is_simulated: useAppStore.getState().isSimulationMode  
       });  
   }, []);

    const handleVinReceived = useCallback(async (vin: string) => {  
        if (!vin) return;  
        const { VehicleIdentityService } = require('../services/VehicleIdentityService');
        const profile = await VehicleIdentityService.decodeVehicleFromVin(vin);
        
        const btStore = useBluetoothStore.getState();
        btStore.setSuggestedVehicleProfile(profile);
        btStore.setSensorData({ vehicleMake: profile.make });  

        const telemetryState = useTelemetryStore.getState();  
        if (telemetryState.activeSessionVehicle) {  
            telemetryState.setActiveSessionVehicle({ ...telemetryState.activeSessionVehicle, vin });  
            await bindVinToRegisteredVehicle(telemetryState.activeSessionVehicle.brand, telemetryState.activeSessionVehicle.model, telemetryState.activeSessionVehicle.year, vin);  
        }  
        await preloadDynamicDtc(profile.make);  
    }, []);

   const initializeAndCheckEcu = async () => {  
       if (isInitializationMutexLocked.current) return;  
       isInitializationMutexLocked.current = true;

       let initSuccess = false;  
       if (useAppStore.getState().isSimulationMode) {  
           useBluetoothStore.getState().addLog('DIAG: Simulation mode bypass in initializeAndCheckEcu');  
           ConnectionStateMachine.transitionTo(ConnectionState.TELEMETRY_ACTIVE);  
           setEcuStatus('connected'); isInitializationMutexLocked.current = false; return;  
       }

       clearLogs();
       ProtocolEngine.resetSession();  
       useBluetoothStore.getState().addLog(`HANDSHAKE_START: timestamp=${Date.now()}`);  
       setEcuStatus('connecting'); setError(null);  
       ConnectionStateMachine.transitionTo(ConnectionState.INITIALIZING);

       ProtocolCircuitBreaker.reset();  
       TransportRateLimiter.cleanup();

       const initialSteps: ConnectionStep[] = [  
           { id: 'adapter', labelKey: 'connection.stepAdapter', defaultLabel: 'Adapter Connection & Cap Score', status: 'pending' },  
           { id: 'protocol', labelKey: 'connection.stepProtocol', defaultLabel: 'OBD2 Protocol Negotiation', status: 'idle' },  
           { id: 'handshake', labelKey: 'connection.stepHandshake', defaultLabel: 'ECU Communication Verification', status: 'idle' },  
           { id: 'stabilization', labelKey: 'connection.stepStabilization', defaultLabel: 'Active Telemetry Loop Stabilization', status: 'idle' }  
       ];         useBluetoothStore.getState().setSensorData({ connectionSteps: initialSteps, connectionProgress: 10 });

        try {  
            useBluetoothStore.getState().setConnectionStatusText('connection.statusProfiling');
            OBDCommandQueue.clear(new Error('RETRY_INIT_FLUSH'));  
            await preciseSleep(550); 

            await ProtocolNegotiator.runBenchmark();  
            await ProtocolNegotiator.applyPostResetConfig();  
            TransportRateLimiter.initialize();

            updateStep('adapter', 'success', 25);  
            updateStep('protocol', 'pending', 35);  
            useBluetoothStore.getState().setConnectionStatusText('connection.statusScanningCan');
            ConnectionStateMachine.transitionTo(ConnectionState.PROTOCOL_SCANNING);            
           let ecuConnected = false;  
           let rpmRes = '';

           try {  
               if (ProtocolCircuitBreaker.isBlacklisted("0")) throw new Error("BLACKLISTED");  
               useBluetoothStore.getState().addLog('DIAG: Trying Auto Protocol (AT SP 0)...');  
               await OBDCommandQueue.add("AT SP 0", 2000);

               const testCommand = "01 00";  
               const initRes = await OBDCommandQueue.add(testCommand, 6000);  
               ecuConnected = verifyHandshakeResponse(initRes, testCommand);

               if (!ecuConnected) {  
                   useBluetoothStore.getState().addLog(`PROTOCOL=SP0, COMMAND=${testCommand}, RAW=${initRes || 'NULL'}`);  
                   throw new Error("PROTOCOL_FAILED");  
               }

               const selectedProtocol = await OBDCommandQueue.add("AT DP", 5000);  
               useBluetoothStore.getState().setProtocol(selectedProtocol ? selectedProtocol.trim() : 'UNKNOWN');  
           } catch (e) {  
               ProtocolCircuitBreaker.recordFailure("0");  
               useBluetoothStore.getState().addLog('DIAG: AT SP 0 failed or invalid, executing CAN-first fallback ring (SP 6 -> SP 7 -> SP 5 -> SP 4 -> SP 3)...');

               // 1. Try CAN-Bus fallback first (SP 6 -> SP 7)
               const canProtocols = ["6", "7"];
               for (const proto of canProtocols) {
                   if (ecuConnected) break;
                   const protocolCmd = `AT SP ${proto}`;
                   if (ProtocolCircuitBreaker.isBlacklisted(protocolCmd)) continue;

                   try {
                       OBDCommandQueue.setAtomicLock(true);
                       OBDCommandQueue.clear(new Error('CAN_FALLBACK_RESET'));
                       await preciseSleep(250);

                       const atzRes = await OBDCommandQueue.add("AT WS", 2000);
                       // Rule mandate: Enforce asynchronous drain/flush of serial buffer + 500ms cooldown
                       BluetoothService.clearBuffer();
                       await preciseSleep(500);

                       if ((atzRes || '').toUpperCase().trim() === 'STOPPED') {
                           await waitForELMPrompt(1500); await preciseSleep(2000); BluetoothService.clearBuffer();
                       } else {
                           await waitForELMPrompt();
                       }
                       OBDCommandQueue.flushRxBuffer();
                       await OBDCommandQueue.add(ADAPTER_COMMANDS.ECHO_OFF, 1000);
                       await OBDCommandQueue.add("ATL0", 1000);
                       await OBDCommandQueue.add("ATS0", 1000);

                       useBluetoothStore.getState().addLog(`DIAG: Testing CAN Protocol ATSP${proto}...`);
                       const spRes = await OBDCommandQueue.add(protocolCmd, 2000);
                       
                       // PROTOCOL-LEVEL CLONE BLOCK: Check if ATSP returns '?'
                       if ((spRes || '').trim() === '?') {
                           useBluetoothStore.getState().addLog(`CLONE_BLOCK: Protocol ATSP${proto} returned '?'. Non-CAN clone device detected. Skipping CAN fallback.`);
                           ProtocolCircuitBreaker.recordFailure(protocolCmd);
                           OBDCommandQueue.setAtomicLock(false);
                           break; // Skip the rest of CAN fallback (break the CAN loop)
                       }

                       const initRes = await OBDCommandQueue.add("01 0C", 8000);
                       OBDCommandQueue.setAtomicLock(false);
                       ecuConnected = verifyHandshakeResponse(initRes, "01 0C");

                       if (ecuConnected) {
                           const selectedProtocol = await OBDCommandQueue.add("AT DP", 5000);
                           useBluetoothStore.getState().setProtocol(selectedProtocol ? selectedProtocol.trim() : 'UNKNOWN');
                           break;
                       } else {
                           ProtocolCircuitBreaker.recordFailure(protocolCmd);
                       }
                   } catch (err: any) {
                       useBluetoothStore.getState().addLog(`DIAG_ERROR: CAN fallback failed for proto ${proto}: ${err?.message || err}`);
                       OBDCommandQueue.setAtomicLock(false);
                       ProtocolCircuitBreaker.recordFailure(protocolCmd);
                   }
               }

               // 2. Try K-Line fallback (SP 5 -> SP 4 -> SP 3)
               if (!ecuConnected) {
                   useBluetoothStore.getState().setConnectionStatusText('connection.statusScanningKline');
                   useBluetoothStore.getState().addLog('DIAG: CAN fallback failed or skipped. Executing K-Line fallback (SP 5 -> SP 4 -> SP 3)...');
                   const targetAddresses = VehicleProfileDB.getKLineAddressUnion();
                   const klineProtocols = ["5", "4", "3"];

                   for (const address of targetAddresses) {
                       if (ecuConnected) break;
                       const addressHex = address.toString(16).toUpperCase().padStart(2, '0');

                       for (const proto of klineProtocols) {
                           const protoKey = `${proto}_0x${addressHex}`;
                           if (ProtocolCircuitBreaker.isBlacklisted(protoKey)) continue;
                           try {
                               useBluetoothStore.getState().addLog(`DIAG: Scanning K-Line Address 0x${addressHex} Protocol ATSP${proto}...`);
                               OBDCommandQueue.setAtomicLock(true);
                               OBDCommandQueue.clear(new Error('KLINE_SCAN_RESET'));
                               await preciseSleep(250);

                               const atzResKLine = await OBDCommandQueue.add("AT WS", 2000);
                               // Rule mandate: Enforce asynchronous drain/flush of serial buffer + 500ms cooldown
                               BluetoothService.clearBuffer();
                               await preciseSleep(500);

                               const atzCleanKLine = (atzResKLine || '').toUpperCase().trim();
                               if (atzCleanKLine === 'STOPPED' || atzCleanKLine === '') {
                                   await waitForELMPrompt(1500);
                                   await preciseSleep(2000);
                                   BluetoothService.clearBuffer();
                               } else {
                                   await waitForELMPrompt();
                               }
                               OBDCommandQueue.flushRxBuffer();

                               await OBDCommandQueue.add("AT E0", 1000);
                               await OBDCommandQueue.add("AT ST 96", 1000);
                               await OBDCommandQueue.add(`AT SP ${proto}`, 1000);
                               await preciseSleep(300);
                               await OBDCommandQueue.add(`AT IIA ${addressHex}`, 1000);

                               if (proto === '3') {
                                   let swInterbyteActive = false;
                                   try {
                                       const atIbRes = await OBDCommandQueue.add("AT IB 10", 1000);
                                       if ((atIbRes || '').toUpperCase().trim().includes('?')) swInterbyteActive = true;
                                   } catch { swInterbyteActive = true; }
                                   if (swInterbyteActive) await preciseSleep(10);
                                   await OBDCommandQueue.add("AT SI", 4000);
                                   await preciseSleep(300);
                               } else {
                                   await preciseSleep(150);
                               }

                               const klineHandshakeCmd = "01 00";
                               const initRes = await OBDCommandQueue.add(klineHandshakeCmd, 8000);
                               OBDCommandQueue.setAtomicLock(false);

                               ecuConnected = verifyHandshakeResponse(initRes, klineHandshakeCmd);
                               if (ecuConnected) {
                                   useBluetoothStore.getState().setProtocol(`ISO 14230-4 (KWP, 0x${addressHex})`);
                                   break;
                               } else {
                                   ProtocolCircuitBreaker.recordFailure(protoKey);
                               }
                           } catch (scanErr: any) {
                               useBluetoothStore.getState().addLog(`DIAG_ERROR: K-Line fallback failed for address ${addressHex} proto ${proto}: ${scanErr?.message || scanErr}`);
                               OBDCommandQueue.setAtomicLock(false);
                               ProtocolCircuitBreaker.recordFailure(protoKey);
                           }
                       }
                   }
               }

               if (!ecuConnected) {
                   updateStep('protocol', 'failed', 35);
                   throw new Error("ALL_PROTOCOLS_FAILED");
               }
           }

           updateStep('protocol', 'success', 50);  
           updateStep('handshake', 'pending', 60);  
           useBluetoothStore.getState().setConnectionStatusText('connection.statusHandshake');
           ConnectionStateMachine.transitionTo(ConnectionState.ECU_HANDSHAKE);  
           await preciseSleep(250);

           try {  
               rpmRes = await OBDCommandQueue.add(ADAPTER_COMMANDS.RPM, 5000);  
           } catch (rpmErr) {}

           updateStep('handshake', 'success', 75);  
           updateStep('stabilization', 'pending', 80);
           useBluetoothStore.getState().setConnectionStatusText('connection.statusStabilization');

           const connectedProtocol = useBluetoothStore.getState().protocol || '';  
           const pUpper = connectedProtocol.toUpperCase();
           const isCan = pUpper.includes('CAN') || connectedProtocol.includes('6') || connectedProtocol.includes('7');  
           useBluetoothStore.getState().setSensorData({ guardTime: isCan ? 100 : 200 });

           // Dynamically inject ATAT0 and ATST 96 for legacy ISO/KWP (3, 4, 5) protocols (Ensure CAN protocols are excluded)
           const isLegacyIsoKwp = !isCan && (pUpper.includes('KWP') || pUpper.includes('ISO 14230') || pUpper.includes('ISO 9141') || pUpper.includes('3') || pUpper.includes('4') || pUpper.includes('5'));
           if (isLegacyIsoKwp) {
               useBluetoothStore.getState().addLog('LEGACY_PROFILE_INJECTION: Injecting ATAT0 and ATST 96 for slow protocols.');
               try {
                   await OBDCommandQueue.add('AT AT0', 1500);
                   await OBDCommandQueue.add('AT ST 96', 1500);
               } catch (injErr) {
                   useBluetoothStore.getState().addLog(`LEGACY_PROFILE_INJECTION_WARN: Injection failed: ${injErr}`);
               }
           } else {
               try {
                   await OBDCommandQueue.add('AT AT1', 1500);
               } catch {}
           }

           ConnectionStateMachine.transitionTo(ConnectionState.TELEMETRY_ACTIVE);  
           useTelemetryStore.getState().setSessionDynamicKey(ProtocolEngine.getRelativeLogicalTimestamp().toString());  
           setLastResponse(rpmRes);  
           setError(null);

           if (isCan) {  
               try { await OBDCommandQueue.add('AT ST 32', 1000); } catch (e) { }  
           }

           await Promise.race([
               CapabilityDiscoveryManager.discoverSupportedPids(),
               new Promise((_, reject) => setTimeout(() => reject(new Error('CAPABILITY_DISCOVERY_TIMEOUT')), 15000))
           ]).catch(err => {
               useBluetoothStore.getState().addLog(`DIAG_WARN: PID Discovery stalled or timed out: ${err.message}`);
           });

            setEcuStatus('connected');
            updateStep('stabilization', 'success', 100);  
            useBluetoothStore.getState().setConnectionStatusText(null);
            startPolling();  
            initSuccess = true;  
            setTimeout(() => {
                runDiagnostics().catch(err => {
                    useBluetoothStore.getState().addLog(`DIAG_WARN: Auto diagnostics failed: ${err?.message || err}`);
                });
            }, 1000);
        } catch (e) {  
           updateStep('stabilization', 'failed', useBluetoothStore.getState().connectionProgress);  
           useBluetoothStore.getState().addLog(`HANDSHAKE_END: Failed. error=${e instanceof Error ? e.message : String(e)}`);  
           setEcuStatus('error');  
           setError('ECU Connection Failed: ' + (e instanceof Error ? e.message : String(e)));  
           ConnectionStateMachine.transitionTo(ConnectionState.HARDWARE_FATAL, 'ECU_HANDSHAKE_FAILED');  
       } finally {  
           if (!initSuccess) {  
               await Promise.race([  
                   BluetoothService.shutdownCurrentSocket(),  
                   new Promise(resolve => setTimeout(resolve, 800))  
               ]);  
           }  
           useBluetoothStore.getState().setConnectingDeviceId(null);  
           useBluetoothStore.getState().setConnectionStatusText(null);
           isInitializationMutexLocked.current = false;  
       }  
   };

   const connect = useCallback(async (selectedId: string, selectedName: string = 'Device') => {  
        const currentStatus = useBluetoothStore.getState().status;  
        if (currentStatus === 'connecting' || currentStatus === 'connected') return;

        // Reset the CommandScheduler mode and queues to start the new connection fresh
        CommandScheduler.reset();

        BluetoothService.onDisconnect(() => { });  
        useBluetoothStore.getState().setConnectingDeviceId(selectedId);  
        setStatus('connecting'); setAdapterStatus('connecting'); setEcuStatus('disconnected');

        const connected = await BluetoothService.connect(selectedId);  
        if (connected) {  
            setDevice(selectedName, selectedId); setLastDevice(selectedName, selectedId);  
            ConnectionStateMachine.transitionTo(ConnectionState.ADAPTER_CONNECTING);

            // Send ATZ and AT0 reset sequence to guarantee adapter start state
            try {
                await OBDCommandQueue.add('ATZ', 1500, 'HIGH_PRIORITY_AD_HOC');
                await OBDCommandQueue.add('AT0', 500, 'HIGH_PRIORITY_AD_HOC');
            } catch (e) {
                useBluetoothStore.getState().addLog(`CONNECT_RESET: Initial reset commands timed out/failed. Proceeding anyway: ${e}`);
            }

            BluetoothService.onDisconnect(async () => {  
                try {
                    await OBDCommandQueue.add('ATZ', 500, 'HIGH_PRIORITY_AD_HOC');
                } catch (e) {}

                OBDCommandQueue.clear(new Error('CONNECTION_LOST'));  
                stopPolling();  
                reset();

                let reconnected = false;  
                for (let attempt = 1; attempt <= 3; attempt++) {  
                    await preciseSleep(1000 * attempt);  
                    if (await BluetoothService.connect(selectedId)) { reconnected = true; break; }  
                }

                if (reconnected) {  
                    useBluetoothStore.getState().setSensorData({ status: 'connected', adapterStatus: 'connected' });  
                    initializeAndCheckEcu();  
                } else {  
                    ConnectionStateMachine.transitionTo(ConnectionState.DISCONNECTED);  
                }  
            });

            setStatus('connected'); setAdapterStatus('connected');  
            preciseSleep(1000).then(() => initializeAndCheckEcu());  
        }  
    }, []);

   const runDiagnostics = useCallback(async () => {  
       if (status !== 'connected') return;  
       useBluetoothStore.getState().setDiagnosticMode(true);         const wasPollingActive = useBluetoothStore.getState().isPollingActive;  
       stopPolling();  
       OBDCommandQueue.clear(new Error('DIAGNOSTICS_START'));

       const connectedProtocol = useBluetoothStore.getState().protocol || '';  
       const pUpper = connectedProtocol.toUpperCase();  
       const isSlowKLine = pUpper.includes('KWP') || pUpper.includes('ISO 14230') || pUpper.includes('3') || pUpper.includes('4') || pUpper.includes('5');  
       const vinCooldownMs = isSlowKLine ? 300 : (useBluetoothStore.getState().isCloneDevice ?? false ? 100 : 0);

       if (vinCooldownMs > 0) await preciseSleep(vinCooldownMs);

       try {  
           let vin = '';  
           await sendCommand(ADAPTER_COMMANDS.READ_VIN);  
           vin = useBluetoothStore.getState().vin || '';

           if (!vin || vin.toUpperCase().includes('ERROR') || vin === 'UNAVAILABLE') {  
               const kwpVin = await OBDCommandQueue.add('22 F1 90', 5000);  
               const cleanRes = kwpVin.toUpperCase().replace(/\s+/g, '');  
               const marker = '62F190';  
               const idx = cleanRes.indexOf(marker);  
               if (idx !== -1) {  
                   let vinAscii = '';  
                   const payload = cleanRes.substring(idx + marker.length);  
                   for (let i = 0; i < payload.length; i += 2) {  
                       const charCode = parseInt(payload.substring(i, i + 2), 16);  
                       if (charCode >= 32 && charCode <= 126) vinAscii += String.fromCharCode(charCode);  
                   }  
                   vin = vinAscii.trim().substring(0, 17);  
               }  
           }  
           if (vin && vin !== 'UNAVAILABLE') {  
               useBluetoothStore.getState().setSensorData({ vin });  
               await handleVinReceived(vin);  
           }  
           await sendCommand(ADAPTER_COMMANDS.READ_DTC);  
       } catch (e) {  
           setError("Diagnostics Failed");  
       } finally {  
           useBluetoothStore.getState().setDiagnosticMode(false);  
           if (wasPollingActive) startPolling();  
       }  
   }, [status, sendCommand, startPolling, stopPolling, handleVinReceived]);

   const proGuardAction = useCallback((action: () => void) => {  
       if (!useAppStore.getState().isPro) {  
           useBluetoothStore.getState().setPaywallContext('ACTION_LOCKED');  
           Alert.alert(t('paywall.proRequiredTitle'), t('paywall.proRequiredDesc'));  
           throw new Error('PRO_REQUIRED');  
       }  
       action();  
   }, [t]);

   const clearDiagnostics = useCallback(async () => {  
       if (status !== 'connected') return;  
       try { proGuardAction(() => { }); } catch { return; }  
       useBluetoothStore.getState().setDiagnosticMode(true);  
       stopPolling();  
       try {  
           await sendCommand(ADAPTER_COMMANDS.CLEAR_DTC);  
           await preciseSleep(500);  
           useBluetoothStore.getState().setSensorData({ dtcs: [] });  
       } catch { } finally {  
           useBluetoothStore.getState().setDiagnosticMode(false);  
           startPolling();  
       }  
   }, [status, sendCommand, startPolling, stopPolling, proGuardAction]);

   const runAdaptationRoutine = useCallback(async (type: 'fuel' | 'ecu') => {  
       if (status !== 'connected') return;  
       try { proGuardAction(() => { }); } catch { return; }  
       useBluetoothStore.getState().setSensorData({ isAdaptationRunning: true });  
       stopPolling();  
       try {  
           await preciseSleep(800);  
           if (type === 'fuel') await sendCommand(ADAPTER_COMMANDS.CLEAR_DTC);  
           else await sendCommand(ADAPTER_COMMANDS.ECU_RESET);  
       } catch { } finally {  
           useBluetoothStore.getState().setSensorData({ isAdaptationRunning: false });  
           startPolling();  
       }  
   }, [status, sendCommand, startPolling, stopPolling, proGuardAction]);

    const enableBluetooth = useCallback(async () => {
        try {
            return await BluetoothService.enableBluetooth();
        } catch (e) {
            setError(e instanceof Error ? e.message : String(e));
            return false;
        }
    }, [setError]);  

    const scanDevices = useCallback(async () => {
        try {
            setStatus('scanning');
            const devices = await BluetoothService.scanDevices();
            setStatus('disconnected');
            return devices;
        } catch (e) {
            setStatus('error');
            setError(e instanceof Error ? e.message : String(e));
            return [];
        }
    }, [setError, setStatus]);  

    const disconnect = useCallback(async () => {  
        stopPolling();  
        try {
            await OBDCommandQueue.add('ATZ', 500, 'HIGH_PRIORITY_AD_HOC');
        } catch (e) {}
        OBDCommandQueue.clear(new Error('MANUAL_DISCONNECT'));  
        await BluetoothService.disconnect();  
        reset();  
        if (useAppStore.getState().isSimulationMode) {
            useAppStore.getState().toggleSimulationMode();
        }
    }, [reset, stopPolling]);  
    const retryEcu = useCallback(() => { if (adapterStatus === 'connected') initializeAndCheckEcu(); }, [adapterStatus]);

   useEffect(() => {  
       let intervalId: any = null;  
       const isWatchdogNeeded = connectionState === 'TELEMETRY_ACTIVE';  
       if (isWatchdogNeeded && isPollingActive && !isRecoveryActive) {  
           intervalId = setInterval(() => {  
               const state = useBluetoothStore.getState();  
               const lastSuccess = state.lastSuccessfulResponseAt;  
               
               if (lastSuccess && (Date.now() - lastSuccess < 1000)) {
                   softRecoveryAttempts.current = 0; 
               } else if (lastSuccess && (Date.now() - lastSuccess > state.watchdogTimeoutLimit)) {  
                   if (softRecoveryAttempts.current < 3) {
                       softRecoveryAttempts.current++;
                       useBluetoothStore.getState().addLog(`WATCHDOG: Stall detected. Executing Soft Recovery ${softRecoveryAttempts.current}/3`);
                       startPolling(); 
                   } else {
                       useBluetoothStore.getState().addLog(`WATCHDOG: Soft recovery exhausted. Triggering Hard Re-Initialization Protocol.`);
                       softRecoveryAttempts.current = 0;
                       initializeAndCheckEcu(); 
                   }
               }  
           }, 1000);  
       }  
       return () => { if (intervalId) clearInterval(intervalId); };  
   }, [connectionState, isPollingActive, isRecoveryActive]);

   const bgKeepAliveTimerRef = useRef<NodeJS.Timeout | null>(null);

   useEffect(() => {  
       const subscription = AppState.addEventListener('change', async (nextAppState) => {  
           if (nextAppState.match(/inactive|background/)) {  
               stopPolling();  
               // Start Background Keep-Alive Heartbeat if connected so BLE socket isn't closed by OS/ELM327
               const currentStatus = useBluetoothStore.getState().status;
               if (currentStatus === 'connected') {
                   if (bgKeepAliveTimerRef.current) clearInterval(bgKeepAliveTimerRef.current);
                   bgKeepAliveTimerRef.current = setInterval(async () => {
                       try {
                           await OBDCommandQueue.add('AT\r', 1500);
                       } catch (e) {
                           // Silence background ping errors
                       }
                   }, 4000);
               }
           } else if (nextAppState === 'active') {  
               if (bgKeepAliveTimerRef.current) {
                   clearInterval(bgKeepAliveTimerRef.current);
                   bgKeepAliveTimerRef.current = null;
               }

               const currentStatus = useBluetoothStore.getState().status;
               if (currentStatus === 'connected') {  
                   try {  
                       await OBDCommandQueue.add('\r', 2500);   
                       startPolling();  
                   } catch (e) {  
                       // Active ping failed — disconnect & auto-reconnect
                       disconnect();  
                       const savedDevice = await BluetoothService.getLastDevice();
                       if (savedDevice?.id) {
                           useBluetoothStore.getState().addLog(`BACKGROUND RECOVERY: Reconnecting to ${savedDevice.name || savedDevice.id}`);
                           connect(savedDevice.id, savedDevice.name);
                       }
                   }  
               } else {
                   // Auto-reconnect automatically when returning to foreground if disconnected
                   const savedDevice = await BluetoothService.getLastDevice();
                   if (savedDevice?.id && currentStatus !== 'connecting') {
                       useBluetoothStore.getState().addLog(`BACKGROUND RECOVERY: Auto-reconnecting to ${savedDevice.name || savedDevice.id}`);
                       connect(savedDevice.id, savedDevice.name);
                   }
               }
           }  
       });  

       return () => {
           subscription.remove();
           if (bgKeepAliveTimerRef.current) clearInterval(bgKeepAliveTimerRef.current);
       };  
   }, [status, startPolling, stopPolling, disconnect, connect]);

    useEffect(() => {  
        BluetoothService.getLastDevice().then(saved => {  
            if (saved) setLastDevice(saved.name, saved.id);  
        });  
    }, [setLastDevice]);

    useEffect(() => {
        OBDCommandQueue.onKLineFallback(() => {
            useBluetoothStore.getState().addLog(`FALLBACK: OBD engine requested K-Line fallback. Blacklisting ATSP6/7 and re-initializing.`);
            ProtocolCircuitBreaker.recordFailure("AT SP 6");
            ProtocolCircuitBreaker.recordFailure("AT SP 7");
            initializeAndCheckEcu();
        });
        OBDCommandQueue.onVoltageReceived((voltage) => {
            useBluetoothStore.getState().setSensorData({ voltage });
        });
    }, []);

    return {  
        status, adapterStatus, ecuStatus, connectionState, deviceName, deviceId, error, enableBluetooth, scanDevices, connect, disconnect, sendCommand, retryEcu, logs, clearLogs, startPolling, stopPolling, runDiagnostics, clearDiagnostics, runAdaptationRoutine, proGuardAction,  
        dtcs, vin, odometer, distanceSinceCleared, distanceMilOn, isDiagnosticMode, isAdaptationRunning, lastDeviceId, lastDeviceName, isCloneDevice, protocol, adapterCapabilityScore,
        isBatchQuerySupported: true  
    };  
};