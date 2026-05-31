import React, { useState, useEffect, useCallback } from 'react';
import { Alert, Platform, Linking } from 'react-native';
import { useTranslation } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';
import BluetoothService from '../api/BluetoothService';
import { BluetoothPermissionError } from '../api/BluetoothService';
import OBDCommandQueue, { preciseSleep } from '../api/OBDCommandQueue';
import { useBluetoothStore } from '../store/useBluetoothStore';
import { useAppStore } from '../store/useAppStore';
import { ADAPTER_COMMANDS } from '../api/commands';
import { prefetchDtcChunks, prefetchDtcChunksForCodes } from '../data/dtcDictionary';
import { getMakeFromVin } from '../utils/vinDecoder';
import RNFS from 'react-native-fs';
import { preloadDynamicDtc, applyPendingDtcCache } from '../data/dtcStorage';
import { syncManufacturerDtc } from '../services/DtcSyncService';
import { useTelemetryStore } from '../store/useTelemetryStore';
import { BRANDS } from '../data/vehicleData';
import { calculateSessionHash } from '../utils/crypto';

export const useBluetooth = () => {
    const { t } = useTranslation();
    const status = useBluetoothStore(s => s.status);
    const adapterStatus = useBluetoothStore(s => s.adapterStatus);
    const ecuStatus = useBluetoothStore(s => s.ecuStatus);
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

        // Snapshot of PIDs: engine_rpm as integer, coolant_temp and throttle_pos as floats/decimals (without rounding)
        const engine_rpm = btState.rpm !== null ? Math.round(btState.rpm) : 0;
        const coolant_temp = btState.coolant !== null ? btState.coolant : 0.0;
        const throttle_pos = btState.throttle !== null ? btState.throttle : 0.0;

        const dateObj = new Date();
        const yyyy = dateObj.getFullYear();
        const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
        const dd = String(dateObj.getDate()).padStart(2, '0');
        const dateString = `${yyyy}-${mm}-${dd}`;

        const deviceUuid = useAppStore.getState().deviceUuid;
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

        // Deduplication check: abort if already successfully synced
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

    /**
     * Decode VIN, update store, preload existing cache, and trigger background sync.
     */
    const handleVinReceived = useCallback(async (vin: string) => {
        if (!vin) return;
        const make = getMakeFromVin(vin);
        useBluetoothStore.getState().setSensorData({ vehicleMake: make });
        
        // Write mock DTC file to dynamic local cache on first simulation mode launch to prevent missing chunk errors
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
        
        // 1. Preload any existing local JSON chunk for this make to dynamicCache
        await preloadDynamicDtc(make);
        
        // 2. Trigger asynchronous background sync from raw GitHub URL (non-blocking)
        syncManufacturerDtc(make).catch(err => {
            console.error('[useBluetooth] Background DTC sync failed:', err);
        });
    }, []);

    /**
     * Request to enable Bluetooth on the device.
     * On iOS, there is no API to enable BT programmatically — open Settings instead.
     * On Android, uses the native Classic Bluetooth enablement dialog.
     */
    const enableBluetooth = useCallback(async () => {
        try {
            return await BluetoothService.enableBluetooth();
        } catch (e) {
            setError(e instanceof Error ? e.message : String(e));
            return false;
        }
    }, [setError]);

    /**
     * Scan for paired devices — with graceful permission handling.
     * BluetoothPermissionError is caught and shown as a polite Alert instead of raw error text.
     */
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

    /**
     * Connect to a specific device (Adapter)
     */
    const connect = useCallback(async (selectedId: string, selectedName: string = 'Device') => {
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
            useTelemetryStore.getState().setSessionDynamicKey(Date.now().toString());
            prefetchDtcChunks(['P00', 'P01', 'P02', 'P03', 'P04']);
            const mockVin = 'JH2PCXSIMULATED12';
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
                dtcs: ['P0113', 'P0102'],
            });
            await handleVinReceived(mockVin);
            return;
        }
        setStatus('connecting');
        setAdapterStatus('connecting');
        setEcuStatus('disconnected');
        setError(null);

        try {
            const connected = await BluetoothService.connect(selectedId);

            if (connected) {
                setDevice(selectedName, selectedId);
                setLastDevice(selectedName, selectedId);
                await BluetoothService.saveLastDevice(selectedId, selectedName);

                // Register disconnect listener for drop detection
                BluetoothService.onDisconnect(async () => {
                    await triggerTelemetryEnqueue();
                    OBDCommandQueue.clear(new Error('CONNECTION_LOST'));
                    reset();
                    Alert.alert(
                        t('connection.disconnectedTitle', 'Disconnected!'), 
                        t('connection.disconnectedDesc', 'Bluetooth connection was unexpectedly lost. Please reconnect.')
                    );
                });

                setStatus('connected');
                setAdapterStatus('connected');

                // Add delay for adapter to settle (especially for Release builds) using UI-safe preciseSleep
                preciseSleep(1500).then(() => {
                    initializeAndCheckEcu();
                });
            } else {
                throw new Error('Adapter connection failed');
            }
        } catch (e) {
            console.error(e);
            setError(e instanceof Error ? e.message : 'Connection failed');
            setStatus('error');
            setAdapterStatus('error');
        }
    }, [setStatus, setAdapterStatus, setEcuStatus, setError, setDevice]);

    /**
     * Initialize ELM327 and then check ECU connection
     */
    const initializeAndCheckEcu = async () => {
        setEcuStatus('connecting');
        setError(null);
        try {
            // 1. Initialize Adapter & Run Pre-paywall Identity Checks (ATI, AT PPS)
            await OBDCommandQueue.add(ADAPTER_COMMANDS.RESET);         // ATZ
            await OBDCommandQueue.add(ADAPTER_COMMANDS.ECHO_OFF);      // ATE0
            
            const atiRes = await OBDCommandQueue.add(ADAPTER_COMMANDS.DEVICE_INFO);   // ATI
            
            // Check for clone signatures
            let isClone = false;
            if (atiRes.toLowerCase().includes('v2.1')) {
                isClone = true;
            }
            
            try {
                // AT PPS is a check for ELM327 programmable parameters.
                // Low-quality clone chips usually don't support programmable parameters and return '?'
                const ppsRes = await OBDCommandQueue.add("AT PPS", 1000);
                if (ppsRes.includes('?') || ppsRes.toLowerCase().includes('error')) {
                    isClone = true;
                }
            } catch (ppsErr) {
                isClone = true;
            }
            
            if (isClone) {
                useBluetoothStore.getState().setIsCloneDevice(true);
                useBluetoothStore.getState().addLog('DETECTED: Clone/Low-Quality Adapter');
            }
            
            await OBDCommandQueue.add(ADAPTER_COMMANDS.SPACES_OFF);    // ATS0

            // 2. Dynamic Initialization & Protocol Scan
            let ecuConnected = false;
            let rpmRes = '';

            // Scan modern CAN protocols first with a short timeout (AT ST 96 -> 600ms)
            await OBDCommandQueue.add("AT ST 96");
            
            // Try ISO 15765-4 CAN 11bit 500K (AT SP 6)
            await OBDCommandQueue.add("AT SP 6");
            try {
                rpmRes = await OBDCommandQueue.add(ADAPTER_COMMANDS.RPM, 800);
                if (rpmRes && !rpmRes.includes('NO DATA') && !rpmRes.includes('ERROR') && !rpmRes.includes('UNABLE TO CONNECT')) {
                    ecuConnected = true;
                }
            } catch (e) {
                // Ignore and proceed to SP 7
            }

            if (!ecuConnected) {
                // Try ISO 15765-4 CAN 29bit 500K (AT SP 7)
                await OBDCommandQueue.add("AT SP 7");
                try {
                    rpmRes = await OBDCommandQueue.add(ADAPTER_COMMANDS.RPM, 800);
                    if (rpmRes && !rpmRes.includes('NO DATA') && !rpmRes.includes('ERROR') && !rpmRes.includes('UNABLE TO CONNECT')) {
                        ecuConnected = true;
                    }
                } catch (e) {
                    // Ignore and proceed to fallback
                }
            }

            if (!ecuConnected) {
                // Switch to K-Line (ISO 9141-2 / ISO 14230-4) with high timeout and warning
                setError(t('connection.klineWarning', 'Eski araç protokolü uyarılıyor, bu işlem 3 saniye sürebilir...'));
                await OBDCommandQueue.add("AT ST FF"); // Max ELM327 timeout (1020ms)
                await OBDCommandQueue.add("AT SP 5");
                
                try {
                    rpmRes = await OBDCommandQueue.add(ADAPTER_COMMANDS.RPM, 2500); // 2500ms watchdog
                    if (rpmRes && !rpmRes.includes('NO DATA') && !rpmRes.includes('ERROR') && !rpmRes.includes('UNABLE TO CONNECT')) {
                        ecuConnected = true;
                    }
                } catch (e) {
                    // Ignore
                }
            }

            if (!ecuConnected) {
                setEcuStatus('error');
                setError(t('connection.ecuNoResponse', 'Araç yanıt vermiyor, lütfen bağlantıyı tazeleyin.'));
                return;
            }

            // 3. UDS Security Gateway (SGW) Probing
            let isSgw = false;
            let sgwCheckSuccess = true;
            
            try {
                // Query UDS Security Access Seed (27 01)
                const sgwRes = await OBDCommandQueue.add("27 01", 1000);
                const cleanSgwRes = sgwRes.replace(/\s+/g, '').toUpperCase();
                
                if (cleanSgwRes.includes("7F2733")) {
                    isSgw = true;
                    useBluetoothStore.getState().setIsSgwActive(true);
                } else if (cleanSgwRes.includes("7F2711") || cleanSgwRes.includes("?") || cleanSgwRes.includes("NODATA") || cleanSgwRes.includes("ERROR")) {
                    // Fallback to Mode 01 PID 00
                    const fallbackRes = await OBDCommandQueue.add("01 00", 1500);
                    const cleanFallback = fallbackRes.replace(/\s+/g, '').toUpperCase();
                    
                    if (cleanFallback.includes("4100")) {
                        isSgw = false;
                        useBluetoothStore.getState().setIsSgwActive(false);
                    } else {
                        sgwCheckSuccess = false;
                    }
                } else {
                    isSgw = false;
                    useBluetoothStore.getState().setIsSgwActive(false);
                }
            } catch (err) {
                console.error("SGW Probe error, running fallback:", err);
                try {
                    const fallbackRes = await OBDCommandQueue.add("01 00", 1500);
                    const cleanFallback = fallbackRes.replace(/\s+/g, '').toUpperCase();
                    if (cleanFallback.includes("4100")) {
                        isSgw = false;
                        useBluetoothStore.getState().setIsSgwActive(false);
                    } else {
                        sgwCheckSuccess = false;
                    }
                } catch (fallbackErr) {
                    sgwCheckSuccess = false;
                }
            }

            if (!sgwCheckSuccess) {
                // Graceful disconnect on ECU 01 00 fallback probe failure
                setEcuStatus('error');
                setError(t('connection.ecuNoResponse', 'Araç yanıt vermiyor, lütfen bağlantıyı tazeleyin.'));
                
                stopPolling();
                OBDCommandQueue.clear(new Error('ECU_PROBE_FAILED'));
                await BluetoothService.disconnect();
                reset();
                
                Alert.alert(
                    t('connection.error', 'CONNECTION ERROR'),
                    t('connection.ecuNoResponseAlert', 'Araç yanıt vermiyor, lütfen bağlantıyı tazeleyin.')
                );
                return;
            }

            // Once successfully connected, optimize streaming timeout to 400ms (AT ST 64) for responsiveness
            await OBDCommandQueue.add("AT ST 64");

            setEcuStatus('connected');
            useTelemetryStore.getState().setSessionDynamicKey(Date.now().toString());
            prefetchDtcChunks(['P00', 'P01', 'P02', 'P03', 'P04']);
            setLastResponse(rpmRes);
            setError(null);
        } catch (e) {
            console.error('ECU Init failed:', e);
            setEcuStatus('error');
            setError('ECU Connection Failed: ' + (e instanceof Error ? e.message : String(e)));
        }
    };

    /**
     * Manually retry ECU connection
     */
    const retryEcu = useCallback(() => {
        if (adapterStatus === 'connected') {
            initializeAndCheckEcu();
        }
    }, [adapterStatus, initializeAndCheckEcu]);

    /**
     * Send arbitrary command
     */
    const sendCommand = useCallback(async (cmd: string) => {
        if (status !== 'connected') {
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
    }, [status, setError, setLastResponse]);

    // Swap Güvenliği: Bluetooth döngüleri tamamen durduğunda veya bağlantı koptuğunda bekleyen DTC önbelleği uygulanır.
    const isDiagnosticMode = useBluetoothStore(s => s.isDiagnosticMode);
    const isAdaptationRunning = useBluetoothStore(s => s.isAdaptationRunning);
    useEffect(() => {
        if ((!isPollingActive && !isDiagnosticMode && !isAdaptationRunning) || status !== 'connected') {
            applyPendingDtcCache();
        }
    }, [isPollingActive, isDiagnosticMode, isAdaptationRunning, status]);

    // Keep track of the current polling loop to prevent concurrent loops
    const pollingRef = React.useRef(false);
    const tickRef = React.useRef(0);
    const isMounted = React.useRef(true);

    // Track hook mount/unmount state and stop polling loops
    useEffect(() => {
        isMounted.current = true;
        return () => {
            isMounted.current = false;
            pollingRef.current = false;
            // Clean up the disconnect listener to avoid references to unmounted hook state
            BluetoothService.onDisconnect(() => {});
        };
    }, []);

    const performPollSync = async () => {
        const state = useBluetoothStore.getState();
        if (!pollingRef.current || state.status !== 'connected' || state.isDiagnosticMode) {
            return;
        }

        if (useAppStore.getState().isSimulationMode) {
            useBluetoothStore.getState().setSensorData({
                rpm: 2800 + Math.floor(Math.random() * 100),
                speed: 45 + Math.floor(Math.random() * 3),
                voltage: (13.7 + Math.random() * 0.2).toFixed(1) + 'V',
            });
            if (pollingRef.current) {
                setTimeout(performPollSync, 500);
            }
            return;
        }

        try {
            // Priority 1: High frequency (RPM) - polled every cycle
            await sendCommand(ADAPTER_COMMANDS.RPM);
            if (!pollingRef.current || useBluetoothStore.getState().status !== 'connected') return;

            // Priority 2: Low frequency (Speed, Coolant, Throttle, Voltage) - polled every 5 cycles
            tickRef.current += 1;
            if (tickRef.current >= 4) {
                tickRef.current = 0;
                await sendCommand(ADAPTER_COMMANDS.SPEED);
                if (!pollingRef.current || useBluetoothStore.getState().status !== 'connected') return;
                await sendCommand(ADAPTER_COMMANDS.COOLANT_TEMP);
                if (!pollingRef.current || useBluetoothStore.getState().status !== 'connected') return;
                await sendCommand(ADAPTER_COMMANDS.THROTTLE);
                if (!pollingRef.current || useBluetoothStore.getState().status !== 'connected') return;
                await sendCommand(ADAPTER_COMMANDS.VOLTAGE);
                if (!pollingRef.current || useBluetoothStore.getState().status !== 'connected') return;
                await sendCommand(ADAPTER_COMMANDS.LOAD);
                if (!pollingRef.current || useBluetoothStore.getState().status !== 'connected') return;
                await sendCommand(ADAPTER_COMMANDS.INTAKE_AIR_TEMP);
                if (!pollingRef.current || useBluetoothStore.getState().status !== 'connected') return;
                await sendCommand(ADAPTER_COMMANDS.MANIFOLD_PRESSURE);
            }
        } catch (e) {
            console.error("Polling error:", e);
            const errMsg = e instanceof Error ? e.message : String(e);
            if (errMsg.includes('CONNECTION_LOST') || errMsg.includes('MANUAL_DISCONNECT') || useBluetoothStore.getState().status !== 'connected') {
                pollingRef.current = false;
                if (isMounted.current) {
                    setPollingActive(false);
                }
            }
        } finally {
            // Schedule the next poll if still active
            const currentState = useBluetoothStore.getState();
            if (pollingRef.current && currentState.status === 'connected') {
                setTimeout(performPollSync, 250); // ~4Hz base interval for RPM/Speed responsiveness
            } else {
                pollingRef.current = false;
                if (isMounted.current) {
                    setPollingActive(false);
                }
            }
        }
    };

    const startPolling = useCallback(() => {
        if (pollingRef.current) return;

        pollingRef.current = true;
        if (isMounted.current) {
            setPollingActive(true);
        }
        tickRef.current = 0;

        // Start the recursive loop
        performPollSync();
    }, [sendCommand, setPollingActive]);

    const stopPolling = useCallback(() => {
        pollingRef.current = false;
        if (isMounted.current) {
            setPollingActive(false);
        }
    }, [setPollingActive]);

    // Auto-stop polling on disconnect
    useEffect(() => {
        if (status !== 'connected' && isPollingActive) {
            stopPolling();
        }
    }, [status, isPollingActive, stopPolling]);

    // Listen to OBDCommandQueue clearing to instantly break all active/streaming telemetry loops
    useEffect(() => {
        const handleQueueClear = () => {
            pollingRef.current = false;
            if (isMounted.current) {
                setPollingActive(false);
            }
        };
        OBDCommandQueue.onClear(handleQueueClear);
        return () => {
            OBDCommandQueue.removeClearListener(handleQueueClear);
        };
    }, [setPollingActive]);


    /**
     * Disconnect
     */
    const disconnect = useCallback(async () => {
        await triggerTelemetryEnqueue();
        stopPolling();
        OBDCommandQueue.clear(new Error('MANUAL_DISCONNECT'));
        await BluetoothService.disconnect();
        reset();
    }, [reset, stopPolling, triggerTelemetryEnqueue]);

    // Load last device on mount
    useEffect(() => {
        const loadSaved = async () => {
            const saved = await BluetoothService.getLastDevice();
            if (saved) {
                setLastDevice(saved.name, saved.id);
            }
        };
        loadSaved();
    }, []);

    const runDiagnostics = useCallback(async () => {
        if (status !== 'connected') return;

        if (useAppStore.getState().isSimulationMode) {
            useBluetoothStore.getState().setDiagnosticMode(true);
            setError(null);
            await new Promise(r => setTimeout(r, 1200));
            const mockVin = 'JH2PCXSIMULATED12';
            useBluetoothStore.getState().setSensorData({
                vin: mockVin,
                ecuId: 'SIM-ECU-001',
                dtcs: ['P0113', 'P0102'],
                odometer: 12500,
                distanceSinceCleared: 340,
                distanceMilOn: 12,
            });
            await handleVinReceived(mockVin);
            const currentDtcs = useBluetoothStore.getState().dtcs || [];
            prefetchDtcChunksForCodes(currentDtcs);
            await triggerTelemetryEnqueue();
            useBluetoothStore.getState().setDiagnosticMode(false);
            if (isPollingActive && !pollingRef.current) startPolling();
            return;
        }

        // 1. Enter diagnostic mode (pauses background polling)
        useBluetoothStore.getState().setDiagnosticMode(true);
        setError(null);

        try {
            // Give the ELM327 a short moment to clear its previous queues using UI-safe preciseSleep
            await preciseSleep(100);

            // 2. Query Diagnostic Metrics sequentially (Optimized Linear Flow)
            useBluetoothStore.getState().addLog('DIAG: Starting linear scan...');

            await sendCommand(ADAPTER_COMMANDS.READ_VIN); // 0902
            const vin = useBluetoothStore.getState().vin;
            if (vin) {
                await handleVinReceived(vin);
            }
            await sendCommand(ADAPTER_COMMANDS.READ_CALIBRATION_ID); // 0904
            await sendCommand(ADAPTER_COMMANDS.READ_DTC); // 03
            const currentDtcs = useBluetoothStore.getState().dtcs || [];
            prefetchDtcChunksForCodes(currentDtcs);
            await sendCommand(ADAPTER_COMMANDS.ODOMETER); // 01A6 (Standard)
            await sendCommand(ADAPTER_COMMANDS.DISTANCE_SINCE_CLEARED); // 0131
            await sendCommand(ADAPTER_COMMANDS.DISTANCE_MIL_ON); // 0121

            useBluetoothStore.getState().addLog('DIAG: Scan complete.');
            await triggerTelemetryEnqueue();

        } catch (e) {
            console.error("Diagnostic error:", e);
            setError("Diagnostics Failed: " + (e instanceof Error ? e.message : String(e)));
        } finally {
            // 3. Exit diagnostic mode (background polling will resume on its next tick or re-trigger)
            useBluetoothStore.getState().setDiagnosticMode(false);

            // Kickstart polling again just in case it stalled
            if (isPollingActive && !pollingRef.current) {
                startPolling();
            } else if (isPollingActive) {
                setTimeout(performPollSync, 0);
            }
        }
    }, [status, sendCommand, startPolling, isPollingActive, handleVinReceived, triggerTelemetryEnqueue]);

    const clearDiagnostics = useCallback(async () => {
        if (status !== 'connected') return;
        if (useAppStore.getState().isSimulationMode) {
            useBluetoothStore.getState().setDiagnosticMode(true);
            await new Promise(r => setTimeout(r, 800));
            useBluetoothStore.getState().setSensorData({ dtcs: [] });
            useBluetoothStore.getState().setDiagnosticMode(false);
            return;
        }
        useBluetoothStore.getState().setDiagnosticMode(true);
        try {
            await sendCommand(ADAPTER_COMMANDS.CLEAR_DTC);
            // Refresh codes after clearing using UI-safe preciseSleep
            await preciseSleep(500);
            await sendCommand(ADAPTER_COMMANDS.READ_DTC);
        } catch (e) {
            console.error("Clear DTC error:", e);
        } finally {
            useBluetoothStore.getState().setDiagnosticMode(false);
            if (isPollingActive) setTimeout(performPollSync, 0);
        }
    }, [status, sendCommand, isPollingActive]);

    const runAdaptationRoutine = useCallback(async (type: 'fuel' | 'ecu') => {
        if (status !== 'connected') return;

        if (useAppStore.getState().isSimulationMode) {
            useBluetoothStore.getState().setAdaptationRunning(true);
            useBluetoothStore.getState().setDiagnosticMode(true);
            await preciseSleep(1200);
            if (type === 'fuel') useBluetoothStore.getState().setSensorData({ dtcs: [] });
            useBluetoothStore.getState().setAdaptationRunning(false);
            useBluetoothStore.getState().setDiagnosticMode(false);
            return;
        }

        useBluetoothStore.getState().setAdaptationRunning(true);
        useBluetoothStore.getState().setDiagnosticMode(true); // Pause polling

        try {
            // Artificial delay to let background tasks resolve and create "loading" effect using UI-safe preciseSleep
            await preciseSleep(800);

            if (type === 'fuel') {
                await sendCommand(ADAPTER_COMMANDS.CLEAR_DTC);
            } else if (type === 'ecu') {
                await sendCommand(ADAPTER_COMMANDS.ECU_RESET);
            }

            // Post-reset delay using UI-safe preciseSleep
            await preciseSleep(800);

        } catch (e) {
            console.error(`Adaptation (${type}) error:`, e);
        } finally {
            useBluetoothStore.getState().setAdaptationRunning(false);
            useBluetoothStore.getState().setDiagnosticMode(false);
            if (isPollingActive) setTimeout(performPollSync, 0);
        }
    }, [status, sendCommand, isPollingActive]);

    return {
        status,
        adapterStatus,
        ecuStatus,
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

        // Expertise Data
        dtcs: useBluetoothStore((state) => state.dtcs),
        vin: useBluetoothStore((state) => state.vin),
        odometer: useBluetoothStore((state) => state.odometer),
        distanceSinceCleared: useBluetoothStore((state) => state.distanceSinceCleared),
        distanceMilOn: useBluetoothStore((state) => state.distanceMilOn),
        isDiagnosticMode: useBluetoothStore((state) => state.isDiagnosticMode),
        isAdaptationRunning: useBluetoothStore((state) => state.isAdaptationRunning),
        lastDeviceId,
        lastDeviceName,

        startPolling,
        stopPolling,
        runDiagnostics,
        clearDiagnostics,
        runAdaptationRoutine,
        isCloneDevice
    };
};

