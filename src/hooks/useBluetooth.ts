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
import { useAppStore, clearDemoDtcs } from '../store/useAppStore';  
import { ADAPTER_COMMANDS } from '../api/commands';  
import { CapabilityDiscoveryManager } from '../core/connection/CapabilityDiscoveryManager';  
import { ModuleDiscoveryManager } from '../core/connection/ModuleDiscoveryManager';  
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
import { EcuIdentificationManager } from '../core/connection/EcuIdentificationManager';
import CommandScheduler from '../core/queue/CommandScheduler';
import { klineKeepAlive } from '../core/protocol/KlineKeepAliveManager';
import { ConnectionDiagnosticsManager } from '../services/ConnectionDiagnosticsManager';

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
   const getLastResponse = useCallback(() => useBluetoothStore.getState().lastResponse, []);
   const error = useBluetoothStore(s => s.error);  
   const setStatus = useBluetoothStore(s => s.setStatus);  
   const setAdapterStatus = useBluetoothStore(s => s.setAdapterStatus);  
   const setEcuStatus = useBluetoothStore(s => s.setEcuStatus);  
   const setDevice = useBluetoothStore(s => s.setDevice);  
   const setLastResponse = useBluetoothStore(s => s.setLastResponse);  
   const setError = useBluetoothStore(s => s.setError);  
   const getLogs = useCallback(() => useBluetoothStore.getState().logs, []);
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
           const res = await OBDCommandQueue.add(cmd, 2000, 'HIGH_PRIORITY_AD_HOC');  
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

    const verifyHandshakeResponse = (rawResponse: string, sentCommand?: string): boolean => {  
        if (!rawResponse) return false;  
        const clean = rawResponse.toUpperCase().replace(/\s+/g, '');  
        const isHardNegative = clean.includes('CANERROR') || clean.includes('NODATA') || clean.includes('BUSBUSY') || clean.includes('BUSERROR') || clean.includes('UNABLETOCONNECT') || clean.includes('ERROR') || clean.includes('STOPPED') || clean.includes('?');  
        if (isHardNegative) return false;

        // Pozitif ECU motor yanıtı veya KWP el sıkışması
        return clean.includes('4100') ||
               clean.includes('410C') ||
               clean.includes('410D') ||
               clean.includes('4105') ||
               clean.includes('4111') ||
               clean.includes('41') ||
               clean.includes('5001') ||
               clean.includes('5003') ||
               clean.includes('62F190') ||
               clean.includes('OK');  
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
        if (!vin || vin.length < 11) return;  
        useBluetoothStore.getState().setSensorData({ vin });  
        try {  
            const { decodeVin } = require('../utils/vinDecoder');
            const { GarageVehicleRegistry } = require('../store/garageStore');
            const info = decodeVin(vin);  
            if (info && info.make) {  
                useBluetoothStore.getState().setSensorData({ ecuId: `${info.make}_${info.year || ''}` });  
            }  
            await GarageVehicleRegistry.saveRegisteredVehicle({
                brand: info.make || 'Unknown',
                model: info.model || 'Unknown',
                year: info.year || 2024,
                vin,
                wmi: info.wmi || vin.substring(0, 3),
                fuelType: info.fuelType || 'gasoline',
                batteryHealthPct: null,
                dpfSootLevelPct: null,
                savedAt: new Date().toISOString(),
                colorIndex: Math.floor(Math.random() * 5),
            });
        } catch {  
            // Ignore decode failures  
        }  
    }, []);

    const initializeAndCheckEcu = useCallback(async () => {  
       if (isInitializationMutexLocked.current) return;  
       isInitializationMutexLocked.current = true;
       let initSuccess = false;

       if (useAppStore.getState().isSimulationMode) {  
           useBluetoothStore.getState().addLog('DIAG: Simulation mode bypass in initializeAndCheckEcu');  
           ConnectionStateMachine.transitionTo(ConnectionState.TELEMETRY_ACTIVE);  
           setEcuStatus('connected'); isInitializationMutexLocked.current = false; return;  
       }

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
            OBDCommandQueue.resetStallCounter();
            await preciseSleep(150); 

            TransportRateLimiter.initialize();

            updateStep('adapter', 'success', 25);  
            updateStep('protocol', 'pending', 35);  

            // =========================================================================
            // 🏆 GOLD-STANDARD ELM327 INITIALIZATION (Copilot / Claude / Lovable Standard)
            // =========================================================================
            useBluetoothStore.getState().setConnectionStatusText('connection.statusScanningCan');
            ConnectionStateMachine.transitionTo(ConnectionState.PROTOCOL_SCANNING);            
            let ecuConnected = false;  
            let rpmRes = '';

            // 1. Temel Reset ve Gürültü Kapatma (Prompt Tabanlı + 250ms Settle)
            await OBDCommandQueue.add("ATZ", 1500).catch(() => '');
            await preciseSleep(250); // Mikrodenetleyici dinlenme (drain) süresi
            await OBDCommandQueue.add("ATE0", 800).catch(() => '');
            await OBDCommandQueue.add("ATL0", 800).catch(() => '');
            await OBDCommandQueue.add("ATS0", 800).catch(() => '');
            await OBDCommandQueue.add("ATH0", 800).catch(() => ''); // Headers OFF: Evrensel Başlık Filtresi
            await OBDCommandQueue.add("ATAT1", 800).catch(() => ''); // Adaptive timing mode 1
            await OBDCommandQueue.add("ATST FF", 1000).catch(() => ''); // Güvenli Yanıt Süresi (1024ms)

            // 2. Dinamik Hedef Protokol Belirleme (TelemetryStore & GarageStore Çift Doğrulama)
            const telemetryVehicle = useTelemetryStore.getState().activeSessionVehicle;
            let activeBrand = telemetryVehicle?.brand || '';
            let activeModel = telemetryVehicle?.model || '';
            let activeYear = telemetryVehicle?.year || 2024;
            let activeFuel = telemetryVehicle?.fuelType;

            if (!activeBrand) {
                try {
                    const { useGarageStore } = require('../store/garageStore');
                    const selectedGarageCar = useGarageStore.getState().selectedVehicle;
                    if (selectedGarageCar) {
                        activeBrand = selectedGarageCar.brand || '';
                        activeModel = selectedGarageCar.model || '';
                        activeYear = selectedGarageCar.year || 2024;
                        activeFuel = selectedGarageCar.fuelType;
                    }
                } catch {}
            }

            const profile = VehicleProfileDB.matchProfileByMakeModelYear(
                activeBrand,
                activeModel,
                activeYear,
                activeFuel
            );
            const targetProtocol = profile?.protocol || '6';
            const isKLine = targetProtocol === '3' || targetProtocol === '4' || targetProtocol === '5' ||
                            activeBrand.toLowerCase().includes('dacia') ||
                            (activeBrand.toLowerCase().includes('renault') && activeYear <= 2014);
            const targetSp = isKLine ? 'ATSP5' : (targetProtocol === '6' ? 'ATSP6' : `ATSP${targetProtocol}`);

            useBluetoothStore.getState().addLog(`PROTOCOL_ENGINE: Probing target SP [${targetSp}] for ${profile.make} ${profile.model} (Brand: ${activeBrand || 'Default'})...`);

            // ADIM 1: HEDEFLENEN PROTOKOL İLE HIZLI SORGULAMA (1-2 Saniye)
            await OBDCommandQueue.add(targetSp, 1500).catch(() => '');
            if (isKLine) {
                await OBDCommandQueue.add("ATST FF", 1000).catch(() => '');
            }
            await preciseSleep(60);

            let res = await OBDCommandQueue.add("01 00", 3000).catch(() => '');
            ecuConnected = verifyHandshakeResponse(res, "01 00");

            if (!ecuConnected) {
                // İkincil hızlı sorgu: Devir (01 0C)
                const rpmProbe = await OBDCommandQueue.add("01 0C", 2500).catch(() => '');
                ecuConnected = verifyHandshakeResponse(rpmProbe, "01 0C");
            }

            // ADIM 2: HEDEF YANIT VERMEZSE DOĞRUDAN DAHİLİ ATSP0 (OTOMATİK ARAMA) DEVREYE GİRER
            if (!ecuConnected) {
                useBluetoothStore.getState().addLog('PROTOCOL_ENGINE: Primary target unconfirmed. Engaging ELM327 Native Auto-Search (ATSP0)...');
                await OBDCommandQueue.add("ATSP0", 1500).catch(() => '');
                await preciseSleep(60);

                let autoRes = await OBDCommandQueue.add("01 00", 4000).catch(() => '');
                ecuConnected = verifyHandshakeResponse(autoRes, "01 00");

                if (!ecuConnected) {
                    const rpmAuto = await OBDCommandQueue.add("01 0C", 3000).catch(() => '');
                    ecuConnected = verifyHandshakeResponse(rpmAuto, "01 0C");
                }
            }

            // ADIM 3: BAĞLANTI DURUMUNUN KAYDI VE TELEMETRİYE GEÇİŞ
            if (ecuConnected) {
                const dpnRes = await OBDCommandQueue.add("ATDPN", 1500).catch(() => '');
                const cleanDpn = (dpnRes || '').replace(/[\r\n>]/g, '').trim();
                const protocolName = `OBD-II Standard [DPN ${cleanDpn || targetProtocol}]`;
                useBluetoothStore.getState().setProtocol(protocolName);
                useBluetoothStore.getState().addLog(`PROTOCOL_ENGINE_SUCCESS: Connected via ${protocolName}`);
            } else {
                updateStep('protocol', 'failed', 35);
                try {
                    const vRes = await OBDCommandQueue.add("ATRV", 2000).catch(() => '');
                    const cleanV = (vRes || '').replace(/[^\d.]/g, '');
                    if (cleanV) {
                        const parsedV = parseFloat(cleanV);
                        if (!isNaN(parsedV) && parsedV < 12.0 && parsedV > 0) {
                            useBluetoothStore.getState().addLog(`IGNITION_DIAG: Low battery voltage (${parsedV}V). Vehicle ignition may be OFF.`);
                            useBluetoothStore.getState().setConnectionStatusText('connection.ecuNoResponse');
                        }
                    }
                } catch (vErr) {}
                throw new Error("ALL_PROTOCOLS_FAILED");
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
           
           // Dynamically inject ATAT0 and ATST96 for legacy ISO/KWP (3, 4, 5) protocols (Ensure CAN protocols are excluded)
           const isLegacyIsoKwp = !isCan && (pUpper.includes('KWP') || pUpper.includes('ISO 14230') || pUpper.includes('ISO 9141') || pUpper.includes('3') || pUpper.includes('4') || pUpper.includes('5'));
           if (isLegacyIsoKwp) {
               useBluetoothStore.getState().addLog('LEGACY_PROFILE_INJECTION: Injecting ATAT0 and ATST96 for slow protocols.');
               try {
                   await OBDCommandQueue.add('ATAT0', 1500);
                   await OBDCommandQueue.add('ATST96', 1500);
               } catch (injErr) {
                   useBluetoothStore.getState().addLog(`LEGACY_PROFILE_INJECTION_WARN: Injection failed: ${injErr}`);
               }
           } else {
               try {
                   await OBDCommandQueue.add('ATAT2', 1500);
               } catch {}
           }

           ConnectionStateMachine.transitionTo(ConnectionState.TELEMETRY_ACTIVE);  
           useTelemetryStore.getState().setSessionDynamicKey(ProtocolEngine.getRelativeLogicalTimestamp().toString());  
           setLastResponse(rpmRes);  
           setError(null);

           if (isCan) {  
               try { await OBDCommandQueue.add('ATST32', 1000); } catch (e) { }  
           }

           await Promise.race([
               CapabilityDiscoveryManager.discoverSupportedPids(),
               new Promise((_, reject) => setTimeout(() => reject(new Error('CAPABILITY_DISCOVERY_TIMEOUT')), 15000))
           ]).catch(err => {
               useBluetoothStore.getState().addLog(`DIAG_WARN: PID Discovery stalled or timed out: ${err.message}`);
           });

           if (isCan) {
               await ModuleDiscoveryManager.discoverModules().catch(err => {
                   useBluetoothStore.getState().addLog(`DIAG_WARN: Module discovery skipped or timed out: ${err?.message || err}`);
               });
               await CapabilityDiscoveryManager.probeUdsServices().catch(err => {
                   useBluetoothStore.getState().addLog(`DIAG_WARN: UDS probing skipped: ${err?.message || err}`);
               });
           }

             setEcuStatus('connected');
             updateStep('stabilization', 'success', 100);  
             useBluetoothStore.getState().setConnectionStatusText(null);
             
             // Autonomous Zero-Friction Vehicle Profiling:
             // Ensure active session vehicle is registered even if VIN cannot be read from hardware
             const currentTelemetryState = useTelemetryStore.getState();
             if (!currentTelemetryState.activeSessionVehicle) {
                 const category = useBluetoothStore.getState().selectedCategoryByUser || 'PASSENGER_CAR';
                 const defaultBrand = category === 'MOTORCYCLE' ? 'Motosiklet' : (category === 'HEAVY_DUTY_TRUCK' ? 'Ağır Ticari' : 'OBD-II Standart');
                 const defaultModel = category === 'MOTORCYCLE' ? 'Euro 5 (OBD2)' : (category === 'HEAVY_DUTY_TRUCK' ? 'J1939 (24V)' : 'Binek Araç (CAN)');
                 const fallbackVehicle = {
                     brand: defaultBrand,
                     model: defaultModel,
                     year: new Date().getFullYear(),
                     vin: 'OBD2_GENERIC'
                 };
                 currentTelemetryState.setActiveSessionVehicle(fallbackVehicle);
                 const { saveRegisteredVehicle } = require('../store/garageStore');
                 saveRegisteredVehicle(fallbackVehicle).catch(() => {});
             } else {
                 const { saveRegisteredVehicle } = require('../store/garageStore');
                 saveRegisteredVehicle(currentTelemetryState.activeSessionVehicle).catch(() => {});
             }

             startPolling();  
             initSuccess = true;  

             // Record Connection Success Diagnostic
             ConnectionDiagnosticsManager.recordDiagnostic({
                 adapterName: useBluetoothStore.getState().deviceName || 'OBD2 Adapter',
                 status: 'SUCCESS',
                 protocol: useBluetoothStore.getState().protocol || 'AUTOMATIC',
                 chipType: useBluetoothStore.getState().isCloneDevice ? 'CLONE_ELM327' : 'STANDARD_ELM327',
                 vehicleInfo: currentTelemetryState.activeSessionVehicle || undefined,
                 recentLogs: useBluetoothStore.getState().logs,
             }).catch(() => {});

             setTimeout(() => {
                 runDiagnostics().catch(err => {
                     useBluetoothStore.getState().addLog(`DIAG_WARN: Auto diagnostics failed: ${err?.message || err}`);
                 });
             }, 1000);
        } catch (e) {  
           updateStep('stabilization', 'failed', useBluetoothStore.getState().connectionProgress);  
           const errorReasonStr = e instanceof Error ? e.message : String(e);
           useBluetoothStore.getState().addLog(`HANDSHAKE_END: Failed. error=${errorReasonStr}`);  
           setEcuStatus('error');  
           setError('ECU Connection Failed: ' + errorReasonStr);  
           ConnectionStateMachine.transitionTo(ConnectionState.HARDWARE_FATAL, 'ECU_HANDSHAKE_FAILED');  

           // Record Connection Handshake Failure Diagnostic with recent terminal trace logs
           ConnectionDiagnosticsManager.recordDiagnostic({
               adapterName: useBluetoothStore.getState().deviceName || 'Unknown Adapter',
               status: 'FAILED',
               errorReason: errorReasonStr,
               failureStage: 'HANDSHAKE',
               protocol: useBluetoothStore.getState().protocol || 'UNKNOWN',
               recentLogs: useBluetoothStore.getState().logs,
           }).catch(() => {});
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
    }, []);

   const connect = useCallback(async (selectedId: string, selectedName: string = 'Device') => {  
        const currentStatus = useBluetoothStore.getState().status;  
        if (currentStatus === 'connecting' || currentStatus === 'connected') return;

        // Start diagnostic session tracking
        ConnectionDiagnosticsManager.startSession(selectedName);

        // Reset the CommandScheduler mode and queues to start the new connection fresh
        CommandScheduler.reset();

        BluetoothService.onDisconnect(() => { });  
        useBluetoothStore.getState().setConnectingDeviceId(selectedId);  
        setStatus('connecting'); setAdapterStatus('connecting'); setEcuStatus('disconnected');

        const connected = await BluetoothService.connect(selectedId);  
        if (connected) {  
            setDevice(selectedName, selectedId); setLastDevice(selectedName, selectedId);  
            ConnectionStateMachine.transitionTo(ConnectionState.ADAPTER_CONNECTING);

            BluetoothService.onDisconnect(async () => {  
                try {
                    await OBDCommandQueue.add('ATZ', 500, 'HIGH_PRIORITY_AD_HOC');
                } catch (e) {}

                // Record dropped socket diagnostic
                ConnectionDiagnosticsManager.recordDiagnostic({
                    adapterName: selectedName,
                    status: 'FAILED',
                    errorReason: 'SOCKET_DISCONNECTED',
                    failureStage: 'SOCKET_DROP',
                    recentLogs: useBluetoothStore.getState().logs,
                }).catch(() => {});

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
            preciseSleep(200).then(() => initializeAndCheckEcu());  
        } else {
            // Record BLE / Socket Connect failure
            ConnectionDiagnosticsManager.recordDiagnostic({
                adapterName: selectedName,
                status: 'FAILED',
                errorReason: 'BLE_OR_SOCKET_CONNECT_REJECTED',
                failureStage: 'BLE_CONNECT',
                recentLogs: useBluetoothStore.getState().logs,
            }).catch(() => {});
            setStatus('disconnected');
            setAdapterStatus('disconnected');
            useBluetoothStore.getState().setConnectingDeviceId(null);
        }  
    }, []);

   const runDiagnostics = useCallback(async () => {  
       const isSim = useAppStore.getState().isSimulationMode;
       if (status !== 'connected' && !isSim) return;  
       useBluetoothStore.getState().setDiagnosticMode(true);

       if (isSim) {
         try {
           await preciseSleep(1200);
           const currentDtcs = useBluetoothStore.getState().dtcs;
           const simDtcs = currentDtcs.length > 0 ? currentDtcs : ['P0113', 'P0102'];
           const simVin = useBluetoothStore.getState().vin || 'WVWZZZ1KZAW123456';

           useBluetoothStore.getState().setSensorData({
             vin: simVin,
             odometer: 124566,
             dtcs: simDtcs,
             distanceSinceCleared: 342,
             distanceMilOn: 45,
           });
           await handleVinReceived(simVin);
         } catch (e) {
           console.warn('[runDiagnostics] Simulation scan failed:', e);
         } finally {
           useBluetoothStore.getState().setDiagnosticMode(false);
         }
         return;
       }

       const wasPollingActive = useBluetoothStore.getState().isPollingActive;  
       stopPolling();  
       OBDCommandQueue.clear(new Error('DIAGNOSTICS_START'));

       const connectedProtocol = useBluetoothStore.getState().protocol || '';  
       const pUpper = connectedProtocol.toUpperCase();  
       const isSlowKLine = pUpper.includes('KWP') || pUpper.includes('ISO 14230') || pUpper.includes('3') || pUpper.includes('4') || pUpper.includes('5');  
       const vinCooldownMs = isSlowKLine ? 300 : (useBluetoothStore.getState().isCloneDevice ?? false ? 100 : 0);

       if (vinCooldownMs > 0) await preciseSleep(vinCooldownMs);

       try {  
            OBDCommandQueue.flushRxBuffer();
            let vin = await EcuIdentificationManager.readVin().catch(() => null);  
            if (!vin) {
                vin = useBluetoothStore.getState().vin || '';
            }

            if (vin && vin !== 'UNAVAILABLE') {  
                useBluetoothStore.getState().setSensorData({ vin });  
                await handleVinReceived(vin);  
            }  

            // Sequentially query Mode 03 (Confirmed DTCs) and Mode 07 (Pending DTCs)
            OBDCommandQueue.flushRxBuffer();
            await sendCommand(ADAPTER_COMMANDS.READ_DTC).catch(() => '');  
            await preciseSleep(100);
            await sendCommand('07').catch(() => '');  
       } catch (e) {  
           setError("Diagnostics Failed");  
       } finally {  
           useBluetoothStore.getState().setDiagnosticMode(false);  
           if (wasPollingActive) startPolling();  
       }  
   }, [status, sendCommand, startPolling, stopPolling, handleVinReceived]);

    const proGuardAction = useCallback((action: () => void) => {  
        const isSim = useAppStore.getState().isSimulationMode;
        if (isSim || useAppStore.getState().isPro) {  
            action();  
            return;  
        }  
        useBluetoothStore.getState().setPaywallContext('ACTION_LOCKED');  
        Alert.alert(t('paywall.proRequiredTitle'), t('paywall.proRequiredDesc'));  
        throw new Error('PRO_REQUIRED');  
    }, [t]);

   const clearDiagnostics = useCallback(async () => {  
        const isSim = useAppStore.getState().isSimulationMode;
        if (status !== 'connected' && !isSim) return;  

        const btState = useBluetoothStore.getState();
        const currentRpm = btState.rpm ?? 0;
        const currentSpeed = btState.speed ?? 0;

        if (currentRpm > 0 || currentSpeed > 0) {
            Alert.alert(
                t('safety.engineRunningTitle', { defaultValue: 'Motor Çalışıyor Güvenlik Kilidi' }),
                t('safety.engineRunningDesc', { defaultValue: 'Güvenlik nedeniyle arıza kodları yalnızca kontak açık ancak motor çalışmıyorken silinebilir.' })
            );
            return;
        }

        try { proGuardAction(() => { }); } catch { return; }  
        useBluetoothStore.getState().setDiagnosticMode(true);  
        if (!isSim) stopPolling();  
        try {  
            if (!isSim) {
                // 1. Wake up bus / prevent K-Line idle timeout before clearing
                await klineKeepAlive.wakeupBusBeforeClear();
                await preciseSleep(100);

                // 2. Send Mode 04 (Clear DTCs)
                const res04 = await sendCommand(ADAPTER_COMMANDS.CLEAR_DTC);  
                await preciseSleep(300);

                // 3. Fallback to UDS Service 0x14 if 04 was not positively acknowledged
                const clean04 = (res04 || '').replace(/\s+/g, '').toUpperCase();
                if (!clean04.includes('44') && !clean04.includes('OK')) {
                    await sendCommand('14FFFFFF').catch(() => '');
                    await preciseSleep(200);
                }
            } else {
                await preciseSleep(300);
                clearDemoDtcs();
            }
            useBluetoothStore.getState().setSensorData({ dtcs: [] });  
        } catch { } finally {  
            useBluetoothStore.getState().setDiagnosticMode(false);  
            if (!isSim) startPolling();  
        }  
    }, [status, sendCommand, startPolling, stopPolling, proGuardAction, t]);

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
       const isSimulation = useAppStore.getState().isSimulationMode;
       const isWatchdogNeeded = connectionState === 'TELEMETRY_ACTIVE' && !isSimulation;  
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

    const crankingRecoveryRef = useRef(false);

    useEffect(() => {
        const fallbackCb = () => {
            useBluetoothStore.getState().addLog(`FALLBACK: OBD engine requested K-Line fallback. Blacklisting ATSP6/7 and re-initializing.`);
            ProtocolCircuitBreaker.recordFailure("AT SP 6");
            ProtocolCircuitBreaker.recordFailure("AT SP 7");
            initializeAndCheckEcu();
        };
        const voltageCb = (voltage: string) => {
            useBluetoothStore.getState().setSensorData({ voltage });

            // Cranking Voltage Drop Detection (8.5V - 9.5V)
            // During engine cranking, starter motor draws high current causing OBD port voltage to drop.
            // Cheap BLE adapters (clone ELM327 v1.5/v2.1) may reset or disconnect at these levels.
            // Instead of treating this as a fatal error, flag it as expected cranking behavior.
            const volts = parseFloat(voltage);
            if (!isNaN(volts) && volts >= 8.0 && volts <= 9.5) {
                const store = useBluetoothStore.getState();
                store.addLog(`CRANKING_DETECT: Voltage drop to ${volts}V detected — starter motor cranking. BLE adapter may reset. Auto-recovery armed.`);
                crankingRecoveryRef.current = true;

                // Arm aggressive auto-reconnect cycle (2 seconds)
                // If BLE disconnects within the next 2 seconds, treat it as cranking-related
                setTimeout(async () => {
                    if (crankingRecoveryRef.current) {
                        crankingRecoveryRef.current = false;
                        const currentStatus = useBluetoothStore.getState().status;
                        if (currentStatus === 'disconnected') {
                            store.addLog(`CRANKING_RECOVERY: BLE disconnected during cranking window. Initiating aggressive 2-second reconnect cycle.`);
                            const savedDevice = await BluetoothService.getLastDevice();
                            if (savedDevice?.id) {
                                connect(savedDevice.id, savedDevice.name);
                            }
                        }
                    }
                }, 2000);
            } else if (crankingRecoveryRef.current && !isNaN(volts) && volts > 11.0) {
                // Voltage recovered above cranking threshold — disarm recovery
                crankingRecoveryRef.current = false;
            }
        };
        OBDCommandQueue.onKLineFallback(fallbackCb);
        OBDCommandQueue.onVoltageReceived(voltageCb);
        return () => {
            if (OBDCommandQueue.getKLineFallbackCallback() === fallbackCb) {
                OBDCommandQueue.onKLineFallback(null);
            }
            if (OBDCommandQueue.getVoltageCallback() === voltageCb) {
                OBDCommandQueue.onVoltageReceived(null);
            }
        };
    }, []);

    // Ensure polling stops on unmount to prevent memory leaks
    useEffect(() => {
        return () => {
            stopPolling();
        };
    }, [stopPolling]);

    return {  
        status, adapterStatus, ecuStatus, connectionState, deviceName, deviceId, error, enableBluetooth, scanDevices, connect, disconnect, sendCommand, retryEcu, getLogs, clearLogs, startPolling, stopPolling, runDiagnostics, clearDiagnostics, runAdaptationRoutine, proGuardAction,  
        dtcs, vin, odometer, distanceSinceCleared, distanceMilOn, isDiagnosticMode, isAdaptationRunning, lastDeviceId, lastDeviceName, isCloneDevice, protocol, adapterCapabilityScore,
        isBatchQuerySupported: true  
    };  
};