import React, { useState, useEffect, useCallback } from 'react';
import { Alert, Platform, AppState, PermissionsAndroid } from 'react-native';
import { useTranslation } from 'react-i18next';
import i18n from '../i18n';
import AsyncStorage from '@react-native-async-storage/async-storage';
import BluetoothService from '../api/BluetoothService';
import { BluetoothPermissionError } from '../api/BluetoothService';
import OBDCommandQueue, { preciseSleep } from '../api/OBDCommandQueue';
import { useBluetoothStore, DiagnosticDtcArray } from '../store/useBluetoothStore';
import { useAppStore } from '../store/useAppStore';
import { ADAPTER_COMMANDS } from '../api/commands';
import { prefetchDtcChunks, prefetchDtcChunksForCodes } from '../data/dtcDictionary';
import { getMakeFromVin } from '../utils/vinDecoder';
import RNFS from 'react-native-fs';
import { preloadDynamicDtc, applyPendingDtcCache } from '../data/dtcStorage';
import { syncManufacturerDtc } from '../services/DtcSyncService';
import { useTelemetryStore } from '../store/useTelemetryStore';
import { calculateSessionHash } from '../utils/crypto';
import { bindVinToRegisteredVehicle, addVehicleOperation } from '../store/garageStore';
import { useDashboardStore, ALL_SENSORS } from '../store/useDashboardStore';
import { OtaService } from '../services/OtaService';
import DiagnosticSessionRecorder from '../core/monitor/DiagnosticSessionRecorder';
import { ConnectionStateMachine, ConnectionState } from '../core/connection/ConnectionStateMachine';
import { ProtocolNegotiator } from '../core/connection/ProtocolNegotiator';
import { RecoveryCoordinator } from '../core/connection/RecoveryCoordinator';
import { PollingOrchestrator } from '../core/connection/PollingOrchestrator';
import { ProtocolEngine } from '../core/connection/ProtocolEngine';

function parseSupportedPids(response: string, offsetHex: string): string[] {
    const clean = response.replace(/\s+/g, '').toUpperCase();
    const marker = '41' + offsetHex.toUpperCase();
    const idx = clean.indexOf(marker);
    if (idx === -1) return [];
    
    const bitmaskHex = clean.substring(idx + marker.length, idx + marker.length + 8);
    if (bitmaskHex.length < 8) return [];

    const offset = parseInt(offsetHex, 16);
    const pids: string[] = [];

    for (let byteIdx = 0; byteIdx < 4; byteIdx++) {
        const byteVal = parseInt(bitmaskHex.substring(byteIdx * 2, byteIdx * 2 + 2), 16);
        if (isNaN(byteVal)) continue;

        for (let bitIdx = 0; bitIdx < 8; bitIdx++) {
            const isSupported = (byteVal & (1 << (7 - bitIdx))) !== 0;
            if (isSupported) {
                const pidNum = offset + (byteIdx * 8) + bitIdx + 1;
                const pidHex = pidNum.toString(16).toUpperCase().padStart(2, '0');
                pids.push(pidHex);
            }
        }
    }
    return pids;
}

export const useBluetooth = () => {
    const { i18n: reactI18n } = useTranslation();
    const t = useCallback((key: string, options?: any) => {
        return i18n.t(key, options) as string;
    }, [reactI18n.language]);

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
    const setPollingActive = useBluetoothStore(s => s.setPollingActive);

    const isRecoveryActive = RecoveryCoordinator.getIsRecoveryActive();
    const lastVoltageQueryTimeRef = React.useRef<number>(0);

    const triggerTelemetryEnqueue = useCallback(async () => {
        const btState = useBluetoothStore.getState();
        const telemetryState = useTelemetryStore.getState();

        if (btState.status !== 'connected' || !telemetryState.activeSessionVehicle) {
            return;
        }

        const brand = telemetryState.activeSessionVehicle.brand;
        const model = telemetryState.activeSessionVehicle.model;
        const year = telemetryState.activeSessionVehicle.year;

        const protocol = useAppStore.getState().isSimulationMode
            ? 'SIMULATED_OBD'
            : 'ISO_15765_4_CAN';

        const ecu_id = btState.ecuId || 'UNKNOWN_ECU';
        const dtc_codes = btState.dtcs || [];

        const engine_rpm = btState.rpm !== null ? Math.round(btState.rpm) : 0;
        const coolant_temp = btState.coolant !== null ? btState.coolant : 0.0;
        const throttle_pos = btState.throttle !== null ? btState.throttle : 0.0;

        const dateObj = new Date();
        const yyyy = dateObj.getFullYear();
        const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
        const dd = String(dateObj.getDate()).padStart(2, '0');
        const dateString = `${yyyy}-${mm}-${dd}`;

        const deviceUuid = Platform.OS === 'android'
            ? useAppStore.getState().appUserId
            : useAppStore.getState().deviceUuid;
        const sessionDynamicKey = telemetryState.sessionDynamicKey || '';
        const session_hash = await calculateSessionHash(
            deviceUuid,
            brand,
            model,
            year,
            dtc_codes,
            dateString,
            sessionDynamicKey
        );

        const isSimulatorEcu = ecu_id === 'SIM-ECU-001';
        const isSimulatorProtocol = protocol === 'SIMULATED_OBD';
        const isSimulatorSignature =
            coolant_temp === 85 &&
            throttle_pos === 18 &&
            dtc_codes &&
            dtc_codes.includes('P0113') &&
            dtc_codes.includes('P0102');

        const isUnknownBrand = !brand || brand.trim().length === 0 ||
            brand.toLowerCase() === 'bilinmiyor' ||
            brand.toLowerCase() === 'unknown' ||
            brand.toLowerCase().includes('demo') ||
            brand.toLowerCase().includes('test');

        const isSimulated = useAppStore.getState().isSimulationMode || isSimulatorEcu || isSimulatorProtocol || isSimulatorSignature || isUnknownBrand;

        if (isSimulated) {
            console.log(`[Telemetry] Simulation/Demo/Unknown data detected: Skipped enqueuing telemetry (Session Hash: ${session_hash})`);
            return;
        }

        try {
            const lastHash = await AsyncStorage.getItem('last_successful_session_hash');
            if (lastHash === session_hash) {
                console.log(`[Telemetry] Deduplication: Hash matches last successful session (${session_hash}). Skipping telemetry enqueue.`);
                return;
            }
        } catch (err) {
            console.warn('[Telemetry] Error reading last successful session hash:', err);
        }

        telemetryState.enqueueTelemetry({
            brand,
            model,
            year,
            protocol,
            ecu_id,
            dtc_codes,
            session_hash,
            engine_rpm,
            coolant_temp,
            throttle_pos,
            is_simulated: isSimulated
        });

        console.log(`[Telemetry] Enqueued telemetry session with hash: ${session_hash} (RPM: ${engine_rpm}, Temp: ${coolant_temp}, Throttle: ${throttle_pos})`);
    }, []);

    const handleVinReceived = useCallback(async (vin: string) => {
        if (!vin) return;

        let attempts = 0;
        while (OtaService.isOtaWriting()) {
            if (attempts >= 20) {
                throw new Error('DATABASE_LOCK_TIMEOUT: OTA write lock did not release in 1000ms');
            }
            await preciseSleep(50);
            attempts++;
        }

        const make = getMakeFromVin(vin);
        useBluetoothStore.getState().setSensorData({ vehicleMake: make });

        const telemetryState = useTelemetryStore.getState();
        const activeVeh = telemetryState.activeSessionVehicle;
        if (activeVeh) {
            telemetryState.setActiveSessionVehicle({
                ...activeVeh,
                vin: vin
            });
            await bindVinToRegisteredVehicle(activeVeh.brand, activeVeh.model, activeVeh.year, vin);
        }

        if (activeVeh && make !== 'GENERIC') {
            const activeBrandLower = activeVeh.brand.toLowerCase();
            const vinMakeLower = make.toLowerCase();
            if (activeBrandLower !== vinMakeLower) {
                const selectedText = `${activeVeh.brand.toUpperCase()} ${activeVeh.model.toUpperCase()}`;
                Alert.alert(
                    t('vehicleSelect.mismatchTitle', 'Araç Uyumsuzluğu'),
                    t('vehicleSelect.mismatchDesc', {
                        defaultValue: `Bağlanılan aracın şasi numarasından markasının "${make}" olduğu tespit edildi. Seçtiğiniz araç ise "${selectedText}".\n\nAraç seçimini iptal edip doğru marka (${make}) ile yeniden tanımlamak ister misiniz?`,
                        make: make,
                        selected: selectedText
                    }),
                    [
                        { text: t('common.no', 'Hayır'), style: 'cancel' },
                        {
                            text: t('common.yes', 'Evet, Düzelt'),
                            onPress: () => {
                                useTelemetryStore.getState().setActiveSessionVehicle(null);
                                useBluetoothStore.getState().setSuggestedBrandFromVin(make.toLowerCase());
                            }
                        }
                    ]
                );
            }
        }

        if (useAppStore.getState().isSimulationMode) {
            const dirPath = `${RNFS.CachesDirectoryPath}/dtc_chunks`;
            const filePath = `${dirPath}/${make.toLowerCase()}.json`;
            try {
                const dirExists = await RNFS.exists(dirPath);
                if (!dirExists) {
                    await RNFS.mkdir(dirPath);
                }
                const fileExists = await RNFS.exists(filePath);
                if (!fileExists) {
                    const mockDtcList = [
                        { dtc: 'P0113', description: 'Emme Hava Sıcaklık Sensörü - Yüksek Voltaj' },
                        { dtc: 'P0102', description: 'Hava Akış Sensörü (MAF) - Düşük Giriş' },
                        { dtc: 'P0112', description: 'Emme Hava Sıcaklık Sensörü - Düşük Voltaj' },
                        { dtc: 'P0115', description: 'Motor Soğutma Suyu Sıcaklık Sensörü - Devre Arızası' }
                    ];
                    await RNFS.writeFile(filePath, JSON.stringify(mockDtcList), 'utf8');
                    console.log(`[useBluetooth] Initialized mock dynamic DTC file for ${make} in simulation mode`);
                }
            } catch (err) {
                console.error('[useBluetooth] Failed to create mock dynamic DTC file:', err);
            }
        }

        await preloadDynamicDtc(make);

        syncManufacturerDtc(make).catch(err => {
            console.error('[useBluetooth] Background DTC sync failed:', err);
        });
    }, [t]);

    const enableBluetooth = useCallback(async () => {
        try {
            return await BluetoothService.enableBluetooth();
        } catch (e) {
            setError(e instanceof Error ? e.message : String(e));
            return false;
        }
    }, [setError]);

    const scanDevices = useCallback(async () => {
        if (useAppStore.getState().isSimulationMode) {
            setStatus('scanning');
            setError(null);
            await new Promise(r => setTimeout(r, 1000));
            setStatus('disconnected');
            return [
                { name: 'MotoCortex SIM (BLE)', id: 'SIM_BLE_001', address: 'SIM_BLE_001' },
                { name: 'OBDLink MX+ Sim', id: 'SIM_BLE_002', address: 'SIM_BLE_002' }
            ];
        }
        setStatus('scanning');
        setError(null);

        if (Platform.OS === 'android') {
            if (Platform.Version >= 31) {
                try {
                    const granted = await PermissionsAndroid.requestMultiple([
                        PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
                        PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
                    ]);
                    if (
                        granted[PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN] !== PermissionsAndroid.RESULTS.GRANTED ||
                        granted[PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT] !== PermissionsAndroid.RESULTS.GRANTED
                    ) {
                        setStatus('disconnected');
                        Alert.alert(
                            t('connection.error', 'CONNECTION ERROR'),
                            t('connection.permissionDesc', 'Bluetooth izni reddedildi. Lütfen ayarlardan izin verin.')
                        );
                        return [];
                    }
                } catch (err) {
                    console.warn('[Bluetooth Android] Error requesting Android 12+ permissions:', err);
                }
            } else {
                try {
                    const locGranted = await PermissionsAndroid.request(
                        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
                        {
                            title: 'Bluetooth Tarama İzni',
                            message: 'OBD cihazlarını taramak için konum izni gereklidir.',
                            buttonPositive: 'İzin Ver',
                            buttonNegative: 'İptal',
                        }
                    );
                    if (locGranted !== PermissionsAndroid.RESULTS.GRANTED) {
                        console.warn('[Bluetooth Android] ACCESS_FINE_LOCATION denied — active discovery disabled, will use bonded devices only');
                    }
                } catch (err) {
                    console.warn('[Bluetooth Android] Error requesting ACCESS_FINE_LOCATION:', err);
                }
            }
        }

        try {
            const devices = await BluetoothService.scanDevices();
            setStatus('disconnected');
            return devices;
        } catch (e) {
            setStatus('disconnected');
            const msg = e instanceof Error ? e.message : String(e);

            if (msg.includes('BLUETOOTH_NOT_POWERED_ON')) {
                Alert.alert(
                    t('connection.error', 'CONNECTION ERROR'),
                    t('connection.bluetoothOffDesc', 'Bluetooth kapalı. Lütfen Bluetooth ayarlarınızı kontrol edin.')
                );
            } else if (e instanceof BluetoothPermissionError) {
                Alert.alert(
                    t('connection.error', 'CONNECTION ERROR'),
                    t('connection.permissionDesc', 'Bluetooth izni reddedildi. Lütfen ayarlardan izin verin.')
                );
            } else {
                Alert.alert(
                    t('connection.error', 'CONNECTION ERROR'),
                    t('connection.scanFailed', 'Scan Failed: ') + msg
                );
            }

            setError(msg);
            return [];
        }
    }, [setStatus, setError, t]);

    const sendCommand = useCallback(async (cmd: string) => {
        if (OtaService.isOtaWriting()) {
            throw new Error('DATABASE_LOCK: Commands suspended while OTA update is in progress');
        }

        if (useBluetoothStore.getState().status !== 'connected') {
            setError('Not connected');
            return;
        }

        try {
            const res = await OBDCommandQueue.add(cmd);
            setLastResponse(res);
            return res;
        } catch (e) {
            setError(e instanceof Error ? e.message : String(e));
            throw e;
        }
    }, [setError, setLastResponse]);

    const startPolling = useCallback(() => {
        PollingOrchestrator.start(sendCommand);
    }, [sendCommand]);

    const stopPolling = useCallback(() => {
        PollingOrchestrator.stop();
    }, []);

    const triggerAutoRecovery = useCallback(async () => {
        const store = useBluetoothStore.getState();
        if (store.deviceId) {
            await RecoveryCoordinator.handleRecovery(
                store.deviceId,
                initializeAndCheckEcu,
                startPolling,
                stopPolling
            );
        }
    }, [startPolling, stopPolling]);

    const initializeAndCheckEcu = async () => {
        if (useAppStore.getState().isSimulationMode) {
            useBluetoothStore.getState().addLog('DIAG: Simulation mode bypass in initializeAndCheckEcu');
            ConnectionStateMachine.transitionTo(ConnectionState.TELEMETRY_ACTIVE);
            setEcuStatus('connected');
            return;
        }
        ProtocolEngine.resetSession();
        useBluetoothStore.getState().addLog(`HANDSHAKE_START: timestamp=${Date.now()}`);
        setEcuStatus('connecting');
        setError(null);
        
        ConnectionStateMachine.transitionTo(ConnectionState.INITIALIZING);

        try {
            // Reset buffer & flush hardware
            OBDCommandQueue.clear(new Error('RETRY_INIT_FLUSH'));
            await preciseSleep(250);
            await preciseSleep(300); // 300ms delay after ATZ reset to let buffer clear

            // Run behavioral benchmark
            await ProtocolNegotiator.runBenchmark();

            // Apply post-reset config profile
            await ProtocolNegotiator.applyPostResetConfig();

            ConnectionStateMachine.transitionTo(ConnectionState.PROTOCOL_SCANNING);

            let ecuConnected = false;
            let rpmRes = '';

            // Try Auto Protocol (AT SP 0)
            try {
                useBluetoothStore.getState().addLog('DIAG: Trying Auto Protocol (AT SP 0)...');
                await OBDCommandQueue.add("AT SP 0", 2000);
                
                const initRes = await OBDCommandQueue.add("01 0C", 8000);
                const cleanInitRes = initRes ? initRes.replace(/(SEARCHING|BUS INIT)\.*/gi, '').toUpperCase() : '';

                const isOk = cleanInitRes && 
                             (cleanInitRes.includes('41 0C') || cleanInitRes.includes('410C')) && 
                             !cleanInitRes.includes('ERROR') && 
                             !cleanInitRes.includes('CAN ERROR') && 
                             !cleanInitRes.includes('NO DATA') && 
                             !cleanInitRes.includes('?');

                if (!isOk) {
                    useBluetoothStore.getState().addLog(`PROTOCOL=SP0, COMMAND=010C, RAW=${initRes || 'NULL'}`);
                    throw new Error("PROTOCOL_FAILED");
                }

                ecuConnected = true;
                const selectedProtocol = await OBDCommandQueue.add("AT DP", 5000);
                const protocolClean = selectedProtocol ? selectedProtocol.trim() : 'UNKNOWN';
                useBluetoothStore.getState().setProtocol(protocolClean);
                useBluetoothStore.getState().addLog(`AUTONOMOUS_PROTOCOL_SELECTED: ${protocolClean}`);
            } catch (e) {
                useBluetoothStore.getState().addLog('DIAG: AT SP 0 failed or invalid, initiating K-Line Target Address Scanning fallback...');
                
                // K-Line Slow-Init Wake-up target addresses and protocols scan
                const targetAddresses = [0x10, 0x33, 0x81];
                const klineProtocols = ["5", "4"]; // ATSP5 = KWP Fast, ATSP4 = KWP Slow
                
                for (const address of targetAddresses) {
                    if (ecuConnected) break;
                    const addressHex = address.toString(16).toUpperCase().padStart(2, '0');
                    
                    for (const proto of klineProtocols) {
                        try {
                            useBluetoothStore.getState().addLog(`DIAG: Scanning K-Line Address 0x${addressHex} Protocol ATSP${proto}...`);
                            
                            OBDCommandQueue.clear(new Error('KLINE_SCAN_RESET'));
                            await preciseSleep(250);
                            
                            await OBDCommandQueue.add("AT Z", 2000);
                            await preciseSleep(300); // 300ms settle delay after reset
                            
                            await OBDCommandQueue.add("AT E0", 1000);
                            await OBDCommandQueue.add("AT ST FF", 1000);
                            await OBDCommandQueue.add(`AT IIA ${addressHex}`, 1000);
                            await OBDCommandQueue.add(`AT SP ${proto}`, 1000);
                            
                            // Trigger initialization using AT SI
                            const initSI = await OBDCommandQueue.add("AT SI", 4000);
                            await preciseSleep(300); // 300ms settle delay (Condition key requirement)
                            
                            useBluetoothStore.getState().addLog(`DIAG: Init SI Response: ${initSI}`);
                            
                            const initRes = await OBDCommandQueue.add("01 0C", 8000);
                            const cleanInitRes = initRes ? initRes.replace(/(SEARCHING|BUS INIT)\.*/gi, '').toUpperCase() : '';
                            
                            const isOk = cleanInitRes && 
                                         (cleanInitRes.includes('41 0C') || cleanInitRes.includes('410C')) && 
                                         !cleanInitRes.includes('ERROR') && 
                                         !cleanInitRes.includes('CAN ERROR') && 
                                         !cleanInitRes.includes('NO DATA') && 
                                         !cleanInitRes.includes('?');
                            
                            if (isOk) {
                                ecuConnected = true;
                                useBluetoothStore.getState().setProtocol(`ISO 14230-4 (KWP, 0x${addressHex})`);
                                useBluetoothStore.getState().addLog(`K-LINE_PROTOCOL_SELECTED: KWP ATSP${proto} Address 0x${addressHex}`);
                                break;
                            }
                        } catch (scanErr) {
                            useBluetoothStore.getState().addLog(`DIAG: Scan K-Line 0x${addressHex} Proto ATSP${proto} failed: ${scanErr}`);
                        }
                    }
                }
                
                // If K-Line scan fails, try CAN protocols (6 & 7) as a final standard waterfall fallback
                if (!ecuConnected) {
                    useBluetoothStore.getState().addLog('DIAG: K-Line Scan failed, trying standard CAN-bus waterfall fallbacks...');
                    const canProtocols = ["AT SP 6", "AT SP 7"];
                    for (const protocol of canProtocols) {
                        try {
                            OBDCommandQueue.clear(new Error('CAN_FALLBACK_RESET'));
                            await preciseSleep(250);
                            
                            await OBDCommandQueue.add("AT Z", 2000);
                            await preciseSleep(100);
                            await OBDCommandQueue.add(ADAPTER_COMMANDS.ECHO_OFF, 1000);
                            await OBDCommandQueue.add("ATL0", 1000);
                            await OBDCommandQueue.add("ATS0", 1000);
                            await OBDCommandQueue.add(protocol, 2000);
                            
                            const initRes = await OBDCommandQueue.add("01 0C", 8000);
                            const cleanInitRes = initRes ? initRes.replace(/(SEARCHING|BUS INIT)\.*/gi, '').toUpperCase() : '';
                            
                            const isOk = cleanInitRes && 
                                         (cleanInitRes.includes('41 0C') || cleanInitRes.includes('410C')) && 
                                         !cleanInitRes.includes('ERROR') && 
                                         !cleanInitRes.includes('CAN ERROR') && 
                                         !cleanInitRes.includes('NO DATA') && 
                                         !cleanInitRes.includes('?');
                            
                            if (isOk) {
                                ecuConnected = true;
                                const selectedProtocol = await OBDCommandQueue.add("AT DP", 5000);
                                const protocolClean = selectedProtocol ? selectedProtocol.trim() : 'UNKNOWN';
                                useBluetoothStore.getState().setProtocol(protocolClean);
                                useBluetoothStore.getState().addLog(`CAN_FALLBACK_PROTOCOL_SELECTED: ${protocolClean}`);
                                break;
                            }
                        } catch (canErr) {
                            useBluetoothStore.getState().addLog(`DIAG: CAN Fallback ${protocol} failed: ${canErr}`);
                        }
                    }
                }

                if (!ecuConnected) {
                    throw new Error("ALL_PROTOCOLS_FAILED");
                }
            }

            ConnectionStateMachine.transitionTo(ConnectionState.ECU_HANDSHAKE);
            await preciseSleep(250);

            try {
                rpmRes = await OBDCommandQueue.add(ADAPTER_COMMANDS.RPM, 5000);
            } catch (rpmErr) {
                useBluetoothStore.getState().addLog(`DIAG: Initial RPM fetch failed, but protocol is connected: ${rpmErr}`);
            }

            const connectedProtocol = useBluetoothStore.getState().protocol;
            let guardTime = 100; 
            if (connectedProtocol) {
                const pUpper = connectedProtocol.toUpperCase();
                if (pUpper.includes('CAN') || pUpper.includes('ISO 15765') || pUpper.includes('6') || pUpper.includes('7')) {
                    guardTime = 100; // Baseline 100ms for CAN
                    useBluetoothStore.getState().addLog('DIAG: CAN-Bus protocol detected. guardTime set to 100ms baseline.');
                } else if (pUpper.includes('KWP') || pUpper.includes('ISO 14230') || pUpper.includes('ISO 9141') || pUpper.includes('3') || pUpper.includes('4') || pUpper.includes('5')) {
                    guardTime = 200; 
                    useBluetoothStore.getState().addLog('DIAG: Slow K-Line protocol detected. guardTime set to 200ms baseline.');
                }
            }
            
            // Set TELEMETRY_ACTIVE state and start polling loop immediately
            useBluetoothStore.getState().setSensorData({ guardTime });
            ConnectionStateMachine.transitionTo(ConnectionState.TELEMETRY_ACTIVE);
            setEcuStatus('connected');
            useTelemetryStore.getState().setSessionDynamicKey(ProtocolEngine.getRelativeLogicalTimestamp().toString());
            prefetchDtcChunks(['P00', 'P01', 'P02', 'P03', 'P04']);
            setLastResponse(rpmRes);
            setError(null);

            startPolling();

            // Run Supported PIDs discovery asynchronously in background with a 10s budget
            const discoverSupportedPids = async () => {
                const defaultPids = ['0C', '0D', '05', '11', '0B', '10', '0E', '42', '04', '2F', '0F', '46', '5C', '3C', 'A6', '31', '21'];
                let supportedList: string[] = [];

                const fetchPidsPromise = async () => {
                    try {
                        useBluetoothStore.getState().addLog('DIAG: Querying supported PIDs [0100]...');
                        const res00 = await OBDCommandQueue.add('01 00', 1500);
                        const pids00 = parseSupportedPids(res00, '00');
                        supportedList.push(...pids00);

                        if (pids00.includes('20')) {
                            try {
                                useBluetoothStore.getState().addLog('DIAG: Querying supported PIDs [0120]...');
                                const res20 = await OBDCommandQueue.add('01 20', 1500);
                                const pids20 = parseSupportedPids(res20, '20');
                                supportedList.push(...pids20);

                                if (pids20.includes('40')) {
                                    try {
                                        useBluetoothStore.getState().addLog('DIAG: Querying supported PIDs [0140]...');
                                        const res40 = await OBDCommandQueue.add('01 40', 1500);
                                        const pids40 = parseSupportedPids(res40, '40');
                                        supportedList.push(...pids40);

                                        if (pids40.includes('60')) {
                                            try {
                                                useBluetoothStore.getState().addLog('DIAG: Querying supported PIDs [0160]...');
                                                const res60 = await OBDCommandQueue.add('01 60', 1500);
                                                const pids60 = parseSupportedPids(res60, '60');
                                                supportedList.push(...pids60);
                                            } catch (e60) {
                                                useBluetoothStore.getState().addLog(`DIAG: 0160 query failed: ${e60}`);
                                            }
                                        }
                                    } catch (e40) {
                                        useBluetoothStore.getState().addLog(`DIAG: 0140 query failed: ${e40}`);
                                    }
                                }
                            } catch (e20) {
                                useBluetoothStore.getState().addLog(`DIAG: 0120 query failed: ${e20}`);
                            }
                        }
                    } catch (e00) {
                        useBluetoothStore.getState().addLog(`DIAG: 0100 query failed: ${e00}`);
                    }
                };

                try {
                    await Promise.race([
                        fetchPidsPromise(),
                        new Promise((_, reject) => setTimeout(() => reject(new Error('HANDSHAKE_TIMEOUT')), 10000))
                    ]);

                    if (supportedList.length === 0) {
                        useBluetoothStore.getState().setSensorData({ supportedPids: defaultPids });
                    } else {
                        useBluetoothStore.getState().setSensorData({ supportedPids: supportedList });
                        useBluetoothStore.getState().addLog(`DIAG: Supported PIDs loaded: ${supportedList.join(', ')}`);
                    }
                } catch (pidErr) {
                    OBDCommandQueue.clear(new Error('HANDSHAKE_TIMEOUT'));
                    useBluetoothStore.getState().addLog(`DIAG: Handshake timeout/error in background: ${pidErr}.`);
                    if (supportedList.length === 0) {
                        useBluetoothStore.getState().addLog(`DIAG: No PIDs resolved. Using default PIDs.`);
                        useBluetoothStore.getState().setSensorData({ supportedPids: defaultPids });
                    } else {
                        useBluetoothStore.getState().addLog(`DIAG: Using partially resolved PIDs: ${supportedList.join(', ')}`);
                        useBluetoothStore.getState().setSensorData({ supportedPids: supportedList });
                    }
                }
            };

            useBluetoothStore.getState().addLog(`HANDSHAKE_END: Success. timestamp=${Date.now()}`);
            discoverSupportedPids();
        } catch (e) {
            useBluetoothStore.getState().addLog(`HANDSHAKE_END: Failed. error=${e instanceof Error ? e.message : String(e)}. timestamp=${Date.now()}`);
            console.error('ECU Init failed:', e);
            setEcuStatus('error');
            setError('ECU Connection Failed: ' + (e instanceof Error ? e.message : String(e)));
            ConnectionStateMachine.transitionTo(ConnectionState.HARDWARE_FATAL, 'ECU_HANDSHAKE_FAILED');
        }
    };

    const connect = useCallback(async (selectedId: string, selectedName: string = 'Device') => {
        const currentStatus = useBluetoothStore.getState().status;
        if (currentStatus === 'connecting' || currentStatus === 'connected') {
            useBluetoothStore.getState().addLog(`CONNECT_GUARD: Connection already active or in progress. Ignoring duplicate request.`);
            return;
        }
        PollingOrchestrator.setMtuRequestCompleted(true);
        if (useAppStore.getState().isSimulationMode) {
            setStatus('connecting');
            setAdapterStatus('connecting');
            setEcuStatus('disconnected');
            setError(null);
            await new Promise(r => setTimeout(r, 1000));
            setDevice(selectedName, selectedId);
            setLastDevice(selectedName, selectedId);
            setStatus('connected');
            setAdapterStatus('connected');
            setEcuStatus('connected');
            DiagnosticSessionRecorder.recordSys(`Bluetooth connected (Simulated): ${selectedName} (${selectedId})`);

            ProtocolEngine.resetSession();
            useTelemetryStore.getState().setSessionDynamicKey(ProtocolEngine.getRelativeLogicalTimestamp().toString());
            prefetchDtcChunks(['P00', 'P01', 'P02', 'P03', 'P04']);
            const mockVin = 'JH2PCXSIMULATED12';
            const mockDtcs: DiagnosticDtcArray = ['P0113', 'P0102'];
            mockDtcs.isNotScanned = false;
            mockDtcs.errorState = null;
            
            useBluetoothStore.getState().setSensorData({
                rpm: 2850,
                speed: 45,
                coolant: 85,
                throttle: 18,
                voltage: '13.8V',
                engineLoad: 32,
                intakeAirTemp: 30,
                manifoldPressure: 102,
                vin: mockVin,
                odometer: 12500,
                dtcs: mockDtcs,
            });
            ConnectionStateMachine.transitionTo(ConnectionState.TELEMETRY_ACTIVE);
            await handleVinReceived(mockVin);
            return;
        }
        setStatus('connecting');
        setAdapterStatus('connecting');
        setEcuStatus('disconnected');
        setError(null);
        PollingOrchestrator.setMtuRequestCompleted(true);

        try {
            const connected = await BluetoothService.connect(selectedId);

            if (connected) {
                setDevice(selectedName, selectedId);
                setLastDevice(selectedName, selectedId);
                await BluetoothService.saveLastDevice(selectedId, selectedName);

                ConnectionStateMachine.transitionTo(ConnectionState.ADAPTER_CONNECTING);

                BluetoothService.onDisconnect(async () => {
                    DiagnosticSessionRecorder.recordSys(`Bluetooth disconnected unexpectedly: ${selectedName} (${selectedId})`);

                    try {
                        await triggerTelemetryEnqueue();
                    } catch (e) {
                        console.error('[Bluetooth] Failed to enqueue telemetry on disconnect:', e);
                    }
                    OBDCommandQueue.clear(new Error('CONNECTION_LOST'));
                    
                    const currentState = useBluetoothStore.getState();
                    if (currentState.dtcs.errorState === 'HARDWARE_FATAL_RECOVERY_FAILED') {
                        stopPolling();
                        PollingOrchestrator.clearFailedPids();
                        ConnectionStateMachine.transitionTo(ConnectionState.DISCONNECTED);
                    } else {
                        reset();
                        PollingOrchestrator.clearFailedPids();
                        Alert.alert(
                            t('connection.disconnectedTitle', 'Disconnected!'),
                            t('connection.disconnectedDesc', 'Bluetooth connection was unexpectedly lost. Please reconnect.')
                        );
                    }
                });

                setStatus('connected');
                setAdapterStatus('connected');
                DiagnosticSessionRecorder.recordSys(`Bluetooth connected: ${selectedName} (${selectedId})`);

                if (Platform.OS === 'android' && BluetoothService.bleConnectedDevice) {
                    PollingOrchestrator.setMtuRequestCompleted(false);
                    try {
                        useBluetoothStore.getState().addLog('BLE: Requesting 512 byte MTU...');
                        await BluetoothService.bleConnectedDevice.requestMTU(512);
                        useBluetoothStore.getState().addLog('BLE: MTU 512 requested successfully.');
                    } catch (mtuErr) {
                        console.warn('[BLE] MTU request failed:', mtuErr);
                        useBluetoothStore.getState().addLog(`BLE ERR: MTU request failed: ${mtuErr}.`);
                    } finally {
                        PollingOrchestrator.setMtuRequestCompleted(true);
                    }
                }

                preciseSleep(1500).then(() => {
                    initializeAndCheckEcu();
                });
            } else {
                throw new Error('Adapter connection failed');
            }
        } catch (e: any) {
            console.error(e);
            const msg = e instanceof Error ? e.message : String(e);

            if (msg === 'DEVICE_NOT_PAIRED') {
                Alert.alert(
                    t('connection.deviceNotPairedTitle', 'Device Not Paired'),
                    t('connection.deviceNotPairedDesc', 'Classic Bluetooth OBD2 adapters must be paired in your phone settings first. You are being redirected to settings.')
                );
            } else if (msg === 'UNSUPPORTED_DEVICE') {
                Alert.alert(
                    t('connection.unsupportedDeviceTitle', 'Uyumsuz Donanım'),
                    t('connection.unsupportedDeviceDesc', 'Bağlanmaya çalıştığınız cihaz uyumlu bir OBD2 adaptörü değil veya gerekli servisleri desteklemiyor.')
                );
            }

            setError(msg);
            setStatus('error');
            setAdapterStatus('error');
        }
    }, [setStatus, setAdapterStatus, setEcuStatus, setError, setDevice, t, triggerTelemetryEnqueue, handleVinReceived, reset, stopPolling]);

    const retryEcu = useCallback(() => {
        if (adapterStatus === 'connected') {
            initializeAndCheckEcu();
        }
    }, [adapterStatus]);

    const isDiagnosticMode = useBluetoothStore(s => s.isDiagnosticMode);
    const isAdaptationRunning = useBluetoothStore(s => s.isAdaptationRunning);
    useEffect(() => {
        if ((!isPollingActive && !isDiagnosticMode && !isAdaptationRunning) || status !== 'connected') {
            applyPendingDtcCache();
        }
    }, [isPollingActive, isDiagnosticMode, isAdaptationRunning, status]);

    useEffect(() => {
        return () => {
            PollingOrchestrator.stop();
            BluetoothService.onDisconnect(() => {});
        };
    }, []);

    const disconnect = useCallback(async () => {
        const currentDeviceName = useBluetoothStore.getState().deviceName || 'unknown';
        const currentDeviceId = useBluetoothStore.getState().deviceId || 'unknown';
        DiagnosticSessionRecorder.recordSys(`Bluetooth disconnected manually: ${currentDeviceName} (${currentDeviceId})`);

        await triggerTelemetryEnqueue();
        stopPolling();
        OBDCommandQueue.clear(new Error('MANUAL_DISCONNECT'));
        await BluetoothService.disconnect();
        reset();
        PollingOrchestrator.clearFailedPids();
    }, [reset, stopPolling, triggerTelemetryEnqueue]);

    // Watchdog check interval
    useEffect(() => {
        let intervalId: any = null;
        const isWatchdogNeeded = connectionState === 'TELEMETRY_ACTIVE';
        if (isWatchdogNeeded && isPollingActive && !isDiagnosticMode && !isAdaptationRunning && !isRecoveryActive) {
            intervalId = setInterval(() => {
                const state = useBluetoothStore.getState();
                const lastSuccess = state.lastSuccessfulResponseAt;
                if (lastSuccess) {
                    const elapsed = Date.now() - lastSuccess;
                    if (elapsed > state.watchdogTimeoutLimit) {
                        triggerAutoRecovery();
                    }
                }
            }, 1000);
        }
        return () => {
            if (intervalId) clearInterval(intervalId);
        };
    }, [connectionState, isPollingActive, isDiagnosticMode, isAdaptationRunning, isRecoveryActive, triggerAutoRecovery]);

    useEffect(() => {
        const subscription = AppState.addEventListener('change', async (nextAppState) => {
            if (nextAppState.match(/inactive|background/)) {
                useBluetoothStore.getState().addLog('SYS: App backgrounded. Flushing OBD queue...');
                OBDCommandQueue.clear(new Error('APP_BACKGROUNDED'));
                stopPolling();
            } else if (nextAppState === 'active') {
                if (status === 'connected') {
                    if (useAppStore.getState().isSimulationMode) {
                        startPolling();
                        return;
                    }
                    try {
                        useBluetoothStore.getState().addLog('SYS: App active. Flushing UART garbage buffer...');
                        await OBDCommandQueue.add('\r', 1000);
                        useBluetoothStore.getState().addLog('SYS: UART buffer clean. Restarting telemetry.');
                        startPolling();
                    } catch (e) {
                        useBluetoothStore.getState().addLog('ERR: UART clean timeout. Connection is DEAD. Terminating zombie state...');
                        disconnect();
                    }
                }
            }
        });

        return () => {
            subscription.remove();
        };
    }, [status, startPolling, stopPolling, disconnect]);

    useEffect(() => {
        const loadSaved = async () => {
            const saved = await BluetoothService.getLastDevice();
            if (saved) {
                setLastDevice(saved.name, saved.id);
            }
        };
        loadSaved();
    }, [setLastDevice]);

    const runDiagnostics = useCallback(async () => {
        if (status !== 'connected') return;

        if (useAppStore.getState().isSimulationMode) {
            useBluetoothStore.getState().setDiagnosticMode(true);
            setError(null);
            await new Promise(r => setTimeout(r, 1200));
            const mockVin = 'JH2PCXSIMULATED12';
            const mockDtcs: DiagnosticDtcArray = ['P0113', 'P0102'];
            mockDtcs.isNotScanned = false;
            mockDtcs.errorState = null;
            useBluetoothStore.getState().setSensorData({
                vin: mockVin,
                ecuId: 'SIM-ECU-001',
                dtcs: mockDtcs,
                odometer: 12500,
                distanceSinceCleared: 340,
                distanceMilOn: 12,
            });
            await handleVinReceived(mockVin);
            const currentDtcs = useBluetoothStore.getState().dtcs || [];
            prefetchDtcChunksForCodes(currentDtcs);
            await triggerTelemetryEnqueue();
            useBluetoothStore.getState().setDiagnosticMode(false);
            if (isPollingActive && !PollingOrchestrator.getIsPollingActive()) startPolling();
            return;
        }

        ConnectionStateMachine.transitionTo(ConnectionState.DEGRADED, 'DIAGNOSTICS_START');
        useBluetoothStore.getState().setDiagnosticMode(true);
        const wasPollingActive = PollingOrchestrator.getIsPollingActive();
        stopPolling();
        setError(null);

        OBDCommandQueue.clear(new Error('DIAGNOSTICS_START'));
        
        const connectedProtocol = useBluetoothStore.getState().protocol || '';
        const pUpper = connectedProtocol.toUpperCase();
        const isSlowKLine = pUpper.includes('KWP') || pUpper.includes('ISO 14230') || pUpper.includes('ISO 9141') || pUpper.includes('3') || pUpper.includes('4') || pUpper.includes('5');
        const cooldownTime = isSlowKLine ? 300 : 100;
        useBluetoothStore.getState().addLog(`DIAG: Cooldown selected: ${cooldownTime}ms (Protocol: ${connectedProtocol})`);
        await preciseSleep(cooldownTime);

        const initialDtcs: DiagnosticDtcArray = [];
        initialDtcs.isNotScanned = false;
        initialDtcs.errorState = null;
        useBluetoothStore.getState().setSensorData({ dtcs: initialDtcs });

        try {
            useBluetoothStore.getState().addLog('DIAG: Starting linear scan...');

            // layered VIN fallback (09 02 -> Mode 22 Renault KWP -> UNAVAILABLE)
            let vin = '';
            try {
                useBluetoothStore.getState().addLog('DIAG: VIN query Step 1 (09 02)...');
                await sendCommand(ADAPTER_COMMANDS.READ_VIN);
                vin = useBluetoothStore.getState().vin || '';
                if (!vin || vin.toUpperCase().includes('ERROR') || vin.toUpperCase().includes('NODATA') || vin === 'UNAVAILABLE') {
                    throw new Error('NO_DATA');
                }
            } catch (e0902) {
                useBluetoothStore.getState().addLog('DIAG: VIN query Step 1 (09 02) failed, trying Step 2 (Mode 22 Renault KWP)...');
                try {
                    const vinRenaultKwp = await OBDCommandQueue.add('22 F1 90', 5000);
                    const cleanRes = vinRenaultKwp.toUpperCase().replace(/\s+/g, '');
                    const marker = '62F190';
                    const idx = cleanRes.indexOf(marker);
                    if (idx !== -1) {
                        const payload = cleanRes.substring(idx + marker.length);
                        let vinAscii = '';
                        for (let i = 0; i < payload.length; i += 2) {
                            const charCode = parseInt(payload.substring(i, i + 2), 16);
                            if (!isNaN(charCode) && charCode >= 32 && charCode <= 126) {
                                const char = String.fromCharCode(charCode);
                                if (/[A-Z0-9]/.test(char)) {
                                    vinAscii += char;
                                }
                            }
                        }
                        vin = vinAscii.trim().substring(0, 17);
                    }
                    if (vin && vin.length >= 8) {
                        useBluetoothStore.getState().setSensorData({ vin });
                    } else {
                        throw new Error('INVALID_VIN');
                    }
                } catch (eRenault) {
                    useBluetoothStore.getState().addLog('DIAG: VIN query Step 2 (Mode 22 Renault KWP) failed. Setting VIN to UNAVAILABLE.');
                    vin = 'UNAVAILABLE';
                    useBluetoothStore.getState().setSensorData({ vin: 'UNAVAILABLE' });
                }
            }
            if (vin && vin !== 'UNAVAILABLE') {
                await handleVinReceived(vin);
            }

            // CAL ID (0904)
            try {
                await sendCommand(ADAPTER_COMMANDS.READ_CALIBRATION_ID);
            } catch (calErr: any) {
                const msg = calErr.message || String(calErr);
                useBluetoothStore.getState().addLog(`DIAG: CAL ID read failed: ${msg}`);
            }

            // DTCs (03)
            let dtcList: DiagnosticDtcArray | null = null;
            try {
                await sendCommand(ADAPTER_COMMANDS.READ_DTC);
                dtcList = useBluetoothStore.getState().dtcs;
            } catch (dtcErr: any) {
                const msg = dtcErr.message || String(dtcErr);
                useBluetoothStore.getState().addLog(`DIAG: DTC read failed: ${msg}`);
                
                const errorDtcs: DiagnosticDtcArray = [];
                errorDtcs.isNotScanned = false;
                
                if (msg.includes('Timeout')) {
                    errorDtcs.errorState = 'TIMEOUT';
                } else if (msg.includes('CONNECTION_LOST') || msg.includes('Disconnected') || msg.includes('SESSION_CANCELLED')) {
                    errorDtcs.errorState = 'CONNECTION_LOST';
                } else {
                    errorDtcs.errorState = 'ERROR_UNABLE_TO_READ';
                }
                dtcList = errorDtcs;
            }
            if (dtcList) {
                useBluetoothStore.getState().setSensorData({ dtcs: dtcList });
                if (!dtcList.errorState) {
                    prefetchDtcChunksForCodes(dtcList);
                }
            }

            // Odometer (01A6)
            try {
                await sendCommand(ADAPTER_COMMANDS.ODOMETER);
            } catch (odoErr: any) {
                const msg = odoErr.message || String(odoErr);
                useBluetoothStore.getState().addLog(`DIAG: Odometer read failed: ${msg}`);
                if (!msg.includes('Timeout')) {
                    useBluetoothStore.getState().setSensorData({ odometer: 'UNSUPPORTED' });
                }
            }

            // Distance since cleared (0131)
            try {
                await sendCommand(ADAPTER_COMMANDS.DISTANCE_SINCE_CLEARED);
            } catch (distErr: any) {
                useBluetoothStore.getState().addLog(`DIAG: Distance since cleared failed: ${distErr}`);
            }

            // Distance MIL on (0121)
            try {
                await sendCommand(ADAPTER_COMMANDS.DISTANCE_MIL_ON);
            } catch (milErr: any) {
                useBluetoothStore.getState().addLog(`DIAG: Distance MIL on failed: ${milErr}`);
            }

            useBluetoothStore.getState().addLog('DIAG: Scan complete.');
            await triggerTelemetryEnqueue();

        } catch (e) {
            console.error("Diagnostic error:", e);
            setError("Diagnostics Failed: " + (e instanceof Error ? e.message : String(e)));
        } finally {
            useBluetoothStore.getState().setDiagnosticMode(false);
            const currentState = useBluetoothStore.getState();
            const nextState = currentState.status === 'connected' ? ConnectionState.TELEMETRY_ACTIVE : ConnectionState.DISCONNECTED;
            ConnectionStateMachine.transitionTo(nextState, 'DIAGNOSTICS_END');

            if (wasPollingActive && nextState === ConnectionState.TELEMETRY_ACTIVE) {
                OBDCommandQueue.clear(new Error('DIAGNOSTICS_END'));
                const connectedProtocol = currentState.protocol || '';
                const pUpper = connectedProtocol.toUpperCase();
                const isSlowKLine = pUpper.includes('KWP') || pUpper.includes('ISO 14230') || pUpper.includes('ISO 9141') || pUpper.includes('3') || pUpper.includes('4') || pUpper.includes('5');
                const cooldownTime = isSlowKLine ? 300 : 100;
                await preciseSleep(cooldownTime);
                startPolling();
            }
        }
    }, [status, sendCommand, startPolling, stopPolling, handleVinReceived, triggerTelemetryEnqueue, isPollingActive, setError]);

    const clearDiagnostics = useCallback(async () => {
        if (status !== 'connected') return;
        const currentRpm = useBluetoothStore.getState().rpm;
        if (currentRpm !== null && currentRpm > 0) {
            Alert.alert(
                t('service.engineRunning', 'Motor Çalışıyor'),
                t('service.engineRunningDesc', 'Arıza kodlarını silmeden önce motoru durdurun, kontağı açık bırakın.')
            );
            return;
        }
        if (useAppStore.getState().isSimulationMode) {
            useBluetoothStore.getState().setDiagnosticMode(true);
            await new Promise(r => setTimeout(r, 800));
            
            const clearedDtcs: DiagnosticDtcArray = [];
            clearedDtcs.isNotScanned = false;
            clearedDtcs.errorState = null;
            useBluetoothStore.getState().setSensorData({ dtcs: clearedDtcs });

            const connectedVin = useBluetoothStore.getState().vin;
            if (connectedVin) {
                await addVehicleOperation(connectedVin, 'clear_dtc');
            }
            useBluetoothStore.getState().setDiagnosticMode(false);
            return;
        }
        useBluetoothStore.getState().setDiagnosticMode(true);
        const wasPollingActive = PollingOrchestrator.getIsPollingActive();
        stopPolling();
        try {
            await sendCommand(ADAPTER_COMMANDS.CLEAR_DTC);
            await preciseSleep(500);
            await sendCommand(ADAPTER_COMMANDS.READ_DTC);
            const connectedVin = useBluetoothStore.getState().vin;
            if (connectedVin) {
                await addVehicleOperation(connectedVin, 'clear_dtc');
            }
        } catch (e) {
            console.error("Clear DTC error:", e);
        } finally {
            useBluetoothStore.getState().setDiagnosticMode(false);
            if (wasPollingActive) {
                startPolling();
            }
        }
    }, [status, sendCommand, stopPolling, startPolling, t]);

    const runAdaptationRoutine = useCallback(async (type: 'fuel' | 'ecu') => {
        if (status !== 'connected') return;

        if (useAppStore.getState().isSimulationMode) {
            useBluetoothStore.getState().setAdaptationRunning(true);
            useBluetoothStore.getState().setDiagnosticMode(true);
            await preciseSleep(1200);
            
            const clearedDtcs: DiagnosticDtcArray = [];
            clearedDtcs.isNotScanned = false;
            clearedDtcs.errorState = null;
            if (type === 'fuel') useBluetoothStore.getState().setSensorData({ dtcs: clearedDtcs });

            const connectedVin = useBluetoothStore.getState().vin;
            if (connectedVin) {
                await addVehicleOperation(connectedVin, type === 'fuel' ? 'fuel_adaptation' : 'ecu_reset');
            }
            useBluetoothStore.getState().setAdaptationRunning(false);
            useBluetoothStore.getState().setDiagnosticMode(false);
            return;
        }

        useBluetoothStore.getState().setAdaptationRunning(true);
        useBluetoothStore.getState().setDiagnosticMode(true); 
        const wasPollingActive = PollingOrchestrator.getIsPollingActive();
        stopPolling();

        try {
            await preciseSleep(800);

            if (type === 'fuel') {
                const currentRpm = useBluetoothStore.getState().rpm;
                if (currentRpm !== null && currentRpm > 0) {
                    Alert.alert(
                        t('service.engineRunning', 'Motor Çalışıyor'),
                        t('service.engineRunningDesc', 'Arıza kodlarını silmeden önce motoru durdurun, kontağı açık bırakın.')
                    );
                    useBluetoothStore.getState().setAdaptationRunning(false);
                    useBluetoothStore.getState().setDiagnosticMode(false);
                    if (wasPollingActive) startPolling();
                    return;
                }
                await sendCommand(ADAPTER_COMMANDS.CLEAR_DTC);
            } else if (type === 'ecu') {
                await sendCommand(ADAPTER_COMMANDS.ECU_RESET);
            }

            const connectedVin = useBluetoothStore.getState().vin;
            if (connectedVin) {
                await addVehicleOperation(connectedVin, type === 'fuel' ? 'fuel_adaptation' : 'ecu_reset');
            }

            await preciseSleep(800);

        } catch (e) {
            console.error(`Adaptation (${type}) error:`, e);
        } finally {
            useBluetoothStore.getState().setAdaptationRunning(false);
            useBluetoothStore.getState().setDiagnosticMode(false);
            if (wasPollingActive) {
                startPolling();
            }
        }
    }, [status, sendCommand, stopPolling, startPolling, t]);

    useEffect(() => {
        const handleQueueClear = () => {
            PollingOrchestrator.stop();
        };
        OBDCommandQueue.onClear(handleQueueClear);
        return () => {
            OBDCommandQueue.removeClearListener(handleQueueClear);
        };
    }, []);

    return {
        status,
        adapterStatus,
        ecuStatus,
        connectionState,
        deviceName,
        deviceId,
        error,
        enableBluetooth,
        scanDevices,
        connect,
        disconnect,
        sendCommand,
        retryEcu,
        logs,
        clearLogs,

        dtcs: useBluetoothStore((state) => state.dtcs),
        vin: useBluetoothStore((state) => state.vin),
        odometer: useBluetoothStore((state) => state.odometer),
        distanceSinceCleared: useBluetoothStore((state) => state.distanceSinceCleared),
        distanceMilOn: useBluetoothStore((state) => state.distanceMilOn),
        isDiagnosticMode: useBluetoothStore((state) => state.isDiagnosticMode),
        isAdaptationRunning: useBluetoothStore((state) => state.isAdaptationRunning),
        lastDeviceId,
        lastDeviceName,
        isCloneDevice,
        isBatchQuerySupported: false,
        protocol: useBluetoothStore((state) => state.protocol),
        adapterCapabilityScore: useBluetoothStore((state) => state.adapterCapabilityScore),

        startPolling,
        stopPolling,
        runDiagnostics,
        clearDiagnostics,
        runAdaptationRoutine
    };
};
