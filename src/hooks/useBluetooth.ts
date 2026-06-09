import React, { useState, useEffect, useCallback } from 'react';
import { Alert, Platform, Linking, AppState, PermissionsAndroid } from 'react-native';
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
import { bindVinToRegisteredVehicle, addVehicleOperation } from '../store/garageStore';
import analytics from '@react-native-firebase/analytics';
import { useDashboardStore, ALL_SENSORS } from '../store/useDashboardStore';

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

    const [isBatchQuerySupported, setIsBatchQuerySupportedState] = useState(true);
    const isBatchQuerySupportedRef = React.useRef(true);
    const setIsBatchQuerySupported = (val: boolean) => {
        isBatchQuerySupportedRef.current = val;
        setIsBatchQuerySupportedState(val);
    };

    const mtuRequestCompletedRef = React.useRef(true);

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

        // Bind VIN to active registered vehicle
        const telemetryState = useTelemetryStore.getState();
        const activeVeh = telemetryState.activeSessionVehicle;
        if (activeVeh) {
            telemetryState.setActiveSessionVehicle({
                ...activeVeh,
                vin: vin
            });
            await bindVinToRegisteredVehicle(activeVeh.brand, activeVeh.model, activeVeh.year, vin);
        }

        // Perform mismatch check
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
    }, [t]);

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
     * Strategy:
     *   1. On Android <12: request ACCESS_FINE_LOCATION (required for discovery)
     *   2. On Android 12+: request BLUETOOTH_SCAN + BLUETOOTH_CONNECT
     *   3. Bonded devices are returned instantly; active discovery runs in parallel
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

        if (Platform.OS === 'android') {
            if (Platform.Version >= 31) {
                // Android 12+: BLUETOOTH_SCAN + BLUETOOTH_CONNECT required
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
                // Android < 12: ACCESS_FINE_LOCATION required for Bluetooth discovery
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

    /**
     * Connect to a specific device (Adapter)
     */
    const connect = useCallback(async (selectedId: string, selectedName: string = 'Device') => {
        setIsBatchQuerySupported(true);
        mtuRequestCompletedRef.current = true;
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
            analytics().logEvent('bluetooth_connected', {
                device_name: selectedName,
                device_id: selectedId,
                is_simulated: true
            }).catch(e => console.warn('[Analytics] Failed connect event:', e));

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
        setIsBatchQuerySupported(true);
        mtuRequestCompletedRef.current = true;

        try {
            const connected = await BluetoothService.connect(selectedId);

            if (connected) {
                setDevice(selectedName, selectedId);
                setLastDevice(selectedName, selectedId);
                await BluetoothService.saveLastDevice(selectedId, selectedName);

                // Register disconnect listener for drop detection
                BluetoothService.onDisconnect(async () => {
                    analytics().logEvent('bluetooth_disconnected', {
                        reason: 'unexpected_loss',
                        device_name: selectedName,
                        device_id: selectedId
                    }).catch(e => console.warn('[Analytics] Failed disconnect event:', e));

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
                analytics().logEvent('bluetooth_connected', {
                    device_name: selectedName,
                    device_id: selectedId,
                    is_simulated: false
                }).catch(e => console.warn('[Analytics] Failed connect event:', e));

                // Android BLE MTU Request
                if (Platform.OS === 'android' && BluetoothService.bleConnectedDevice) {
                    mtuRequestCompletedRef.current = false;
                    try {
                        useBluetoothStore.getState().addLog('BLE: Requesting 512 byte MTU...');
                        await BluetoothService.bleConnectedDevice.requestMTU(512);
                        useBluetoothStore.getState().addLog('BLE: MTU 512 requested successfully.');
                    } catch (mtuErr) {
                        console.warn('[BLE] MTU request failed:', mtuErr);
                        useBluetoothStore.getState().addLog(`BLE ERR: MTU request failed: ${mtuErr}. Falling back to sequential mode.`);
                        setIsBatchQuerySupported(false);
                    } finally {
                        mtuRequestCompletedRef.current = true;
                    }
                }

                // Add delay for adapter to settle (especially for Release builds) using UI-safe preciseSleep
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
    }, [setStatus, setAdapterStatus, setEcuStatus, setError, setDevice]);

    /**
     * Initialize ELM327 and then check ECU connection
     */
    const initializeAndCheckEcu = async () => {
        setEcuStatus('connecting');
        setError(null);
        try {
            // 1. Initialize Adapter & Run Pre-paywall Identity Checks (ATI, AT PPS)
            // Timeout set to 5000ms for stable initialization and K-Line 5-Baud wakeup sequences
            await OBDCommandQueue.add(ADAPTER_COMMANDS.RESET, 2000);         // ATZ (Boot can take 1.5s)

            // ATZ Boot Uykusu: Cihazın donanımsal olarak tam uyanması için
            await preciseSleep(250);

            await OBDCommandQueue.add(ADAPTER_COMMANDS.ECHO_OFF, 1000);      // ATE0
            await OBDCommandQueue.add("ATL0", 1000);                         // ATL0 - linefeeds off
            await OBDCommandQueue.add("ATH0", 1000);                         // ATH0 - Headers OFF (critical for clean hex parsing on CAN Bus)
            await OBDCommandQueue.add("ATS0", 1000);                         // ATS0 - Spaces OFF (compact hex responses)
            await OBDCommandQueue.add(ADAPTER_COMMANDS.ADAPTIVE_TIMING, 1000); // AT AT1 - Adaptive Timing On
            await OBDCommandQueue.add(ADAPTER_COMMANDS.TIMEOUT_LIMIT, 1000);  // AT ST 62 - Timeout limit sabitleme (248ms)

            const atiRes = await OBDCommandQueue.add(ADAPTER_COMMANDS.DEVICE_INFO, 5000);   // ATI

            // Check for clone signatures
            let isClone = false;
            if (atiRes.toLowerCase().includes('v2.1')) {
                isClone = true;
            }

            try {
                // AT PPS is a check for ELM327 programmable parameters.
                // Low-quality clone chips usually don't support programmable parameters and return '?'
                const ppsRes = await OBDCommandQueue.add("AT PPS", 5000);
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


            // 2. Dynamic Initialization & Universal Protocol Fallback
            let ecuConnected = false;
            let rpmRes = '';

            try {
                // Evrensel Tarama İlk Hamle: Timeout uzatıp her zaman AT SP 0 ile başla.
                await OBDCommandQueue.add(ADAPTER_COMMANDS.TIMEOUT_LIMIT, 2000); // AT ST 62
                await OBDCommandQueue.add("AT SP 0", 2000);

                // Send 01 00 to wake up vehicle (8000ms is crucial for K-Line 5-baud slow init)
                const initRes = await OBDCommandQueue.add("01 00", 8000);

                // Veri Bütünlüğü: \r ve \n KESİNLİKLE silinmeyecek. Sadece SEARCHING, BUS INIT ve noktalar temizlenecek.
                const cleanInitRes = initRes ? initRes.replace(/(SEARCHING|BUS INIT|ERROR)\.*/gi, '').toUpperCase() : '';

                // Whitelist Hex Doğrulaması: 41 00 veya 4100 içermiyorsa protokol başarısızdır.
                if (!cleanInitRes || !(cleanInitRes.includes('41 00') || cleanInitRes.includes('4100'))) {
                    useBluetoothStore.getState().addLog(`DIAG: AT SP 0 failed, invalid hex response: [${cleanInitRes}]`);
                    throw new Error("PROTOCOL_FAILED");
                }

                ecuConnected = true;
                const selectedProtocol = await OBDCommandQueue.add("AT DP", 5000);
                const protocolClean = selectedProtocol ? selectedProtocol.trim() : 'UNKNOWN';
                useBluetoothStore.getState().setProtocol(protocolClean);
                useBluetoothStore.getState().addLog(`AUTONOMOUS_PROTOCOL_SELECTED: ${protocolClean}`);
            } catch (e) {
                // Şelale (Waterfall) Fallback Şasisi
                useBluetoothStore.getState().addLog('DIAG: AT SP 0 failed, initiating waterfall fallback sequence...');

                const fallbackProtocols = ["AT SP 6", "AT SP 7", "AT SP 3", "AT SP 5", "AT SP 4"];

                for (const protocol of fallbackProtocols) {
                    try {
                        // Buffer Temizliği ve Amneziyi Engelleme (Re-init)
                        useBluetoothStore.getState().addLog(`DIAG: Buffer temizleniyor (AT WS)...`);
                        await OBDCommandQueue.add("AT WS", 2000);

                        // Fiziksel Donanım Gecikmesi: Çin klonlarının UART hattının uyanması için
                        await preciseSleep(500);

                        // AT WS sonrası ELM327 konfigürasyonlarını yeniden inşa et
                        await OBDCommandQueue.add(ADAPTER_COMMANDS.ECHO_OFF, 1000); // ATE0
                        await OBDCommandQueue.add("ATL0", 1000);                    // ATL0
                        await OBDCommandQueue.add("ATH0", 1000);                    // ATH0 - Headers OFF
                        await OBDCommandQueue.add("ATS0", 1000);                    // ATS0 - Spaces OFF
                        await OBDCommandQueue.add(ADAPTER_COMMANDS.ADAPTIVE_TIMING, 1000); // AT AT1
                        await OBDCommandQueue.add(ADAPTER_COMMANDS.TIMEOUT_LIMIT, 1000);  // AT ST 62

                        useBluetoothStore.getState().addLog(`DIAG: Trying fallback protocol ${protocol}...`);
                        await OBDCommandQueue.add(protocol, 2000);

                        // 8000ms is crucial for K-Line 5-baud slow init
                        const initRes = await OBDCommandQueue.add("01 00", 8000);
                        const cleanInitRes = initRes ? initRes.replace(/(SEARCHING|BUS INIT|ERROR)\.*/gi, '').toUpperCase() : '';

                        // Whitelist Hex Doğrulaması
                        if (cleanInitRes && (cleanInitRes.includes('41 00') || cleanInitRes.includes('4100'))) {
                            ecuConnected = true;
                            const selectedProtocol = await OBDCommandQueue.add("AT DP", 5000);
                            const protocolClean = selectedProtocol ? selectedProtocol.trim() : 'UNKNOWN';
                            useBluetoothStore.getState().setProtocol(protocolClean);
                            useBluetoothStore.getState().addLog(`FALLBACK_PROTOCOL_SELECTED: ${protocolClean}`);
                            break; // Başarılı bağlantı, döngüden çık
                        } else {
                            // Hex Mismatch Loglaması: Sessiz reddedilmeyi engelle ve gelen anlamsız veriyi kaydet
                            useBluetoothStore.getState().addLog(`DIAG: Protocol failed, invalid hex response: [${cleanInitRes}]`);
                        }
                    } catch (fallbackErr) {
                        const msg = fallbackErr instanceof Error ? fallbackErr.message : String(fallbackErr);
                        useBluetoothStore.getState().addLog(`DIAG: Fallback ${protocol} error: ${msg}`);
                    }
                }

                // Sessiz Ölümü Engelle: Tüm fallback'ler başarısız olduysa exception fırlat
                if (!ecuConnected) {
                    throw new Error("ALL_PROTOCOLS_FAILED");
                }
            }

            // Protokol İntiharını Engelle: RPM (01 0C) veya diğer canlı telemetri verileri el sıkışma bloğunun tamamen dışındadır.
            try {
                rpmRes = await OBDCommandQueue.add(ADAPTER_COMMANDS.RPM, 5000);
            } catch (rpmErr) {
                useBluetoothStore.getState().addLog(`DIAG: Initial RPM fetch failed, but protocol is connected: ${rpmErr}`);
            }

            // 3. Batch Query Handshake Check
            const connectedProtocol = useBluetoothStore.getState().protocol;
            const isCanBus = connectedProtocol && (
                connectedProtocol.toUpperCase().includes('CAN') ||
                connectedProtocol.toUpperCase().includes('ISO 15765') ||
                connectedProtocol.toUpperCase().includes('6') ||
                connectedProtocol.toUpperCase().includes('7')
            );

            let batchSupported = false;
            if (isCanBus) {
                batchSupported = true;
                try {
                    useBluetoothStore.getState().addLog('DIAG: Probing batch query support with "01 0C 0D 1"...');
                    const probeRes = await OBDCommandQueue.add('01 0C 0D 1', 3000);
                    useBluetoothStore.getState().addLog(`DIAG: Probe response: [${probeRes}]`);
                    const upperProbe = probeRes.toUpperCase();
                    if (upperProbe.includes('7F') || upperProbe.includes('?')) {
                        batchSupported = false;
                        useBluetoothStore.getState().addLog('DIAG: Batch query NOT supported by vehicle/adapter (returned 7F or ?).');
                    } else {
                        useBluetoothStore.getState().addLog('DIAG: Batch query support verified.');
                    }
                } catch (probeErr) {
                    batchSupported = false;
                    useBluetoothStore.getState().addLog(`DIAG: Batch query probe failed: ${probeErr}. Defaulting to sequential mode.`);
                }
            } else {
                useBluetoothStore.getState().addLog('DIAG: Non-CAN protocol, batch query disabled.');
            }
            setIsBatchQuerySupported(batchSupported);

            // Adaptive Timing already enabled during initialization

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
    const usePid49ForThrottle = React.useRef(false);

    // Reset throttle fallback status on disconnect
    useEffect(() => {
        if (status !== 'connected') {
            usePid49ForThrottle.current = false;
        }
    }, [status]);

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

        // Android BLE MTU Request Guard: block starting performPollSync until MTU is raised
        if (Platform.OS === 'android' && BluetoothService.bleConnectedDevice && !mtuRequestCompletedRef.current) {
            useBluetoothStore.getState().addLog('BLE: Delaying performPollSync, MTU request not yet complete.');
            setTimeout(performPollSync, 100);
            return;
        }

        if (useAppStore.getState().isSimulationMode) {
            const activeKeys = useDashboardStore.getState().activeSensors;
            const mockData: any = {};
            activeKeys.forEach(key => {
                if (key === 'rpm') mockData.rpm = 2800 + Math.floor(Math.random() * 100);
                else if (key === 'speed') mockData.speed = 45 + Math.floor(Math.random() * 3);
                else if (key === 'coolant') mockData.coolant = 85 + Math.floor(Math.random() * 2);
                else if (key === 'throttle') mockData.throttle = 18 + Math.floor(Math.random() * 2);
                else if (key === 'voltage') mockData.voltage = (13.7 + Math.random() * 0.2).toFixed(1) + 'V';
                else if (key === 'engineLoad') mockData.engineLoad = 32 + Math.floor(Math.random() * 2);
                else if (key === 'intakeAirTemp') mockData.intakeAirTemp = 30;
                else if (key === 'manifoldPressure') mockData.manifoldPressure = 102;
                else if (key === 'ambientTemp') mockData.ambientTemp = 22 + Math.floor(Math.random() * 2);
                else if (key === 'oilTemp') mockData.oilTemp = 92 + Math.floor(Math.random() * 2);
                else if (key === 'mafFlow') mockData.mafFlow = Number((14.5 + Math.random() * 0.5).toFixed(2));
                else if (key === 'timingAdvance') mockData.timingAdvance = Number((15.0 + Math.random() * 0.5).toFixed(1));
                else if (key === 'fuelLevel') mockData.fuelLevel = 65;
                else if (key === 'catalystTemp') mockData.catalystTemp = Number((340 + Math.random() * 5).toFixed(1));
            });
            useBluetoothStore.getState().setSensorData(mockData);
            if (pollingRef.current) {
                setTimeout(performPollSync, 500);
            }
            return;
        }

        try {
            const activeKeys = useDashboardStore.getState().activeSensors;
            const activeSensors = ALL_SENSORS.filter(s => activeKeys.includes(s.key));

            const getPid = (sensor: typeof ALL_SENSORS[number]) => {
                if (sensor.key === 'throttle') {
                    const activeVeh = useTelemetryStore.getState().activeSessionVehicle;
                    const isDiesel = activeVeh && (
                        activeVeh.model.toLowerCase().includes('dci') ||
                        activeVeh.model.toLowerCase().includes('tdi') ||
                        activeVeh.model.toLowerCase().includes('hdi') ||
                        activeVeh.model.toLowerCase().includes('tdci') ||
                        activeVeh.model.toLowerCase().includes('cdti') ||
                        activeVeh.model.toLowerCase().includes('crdi') ||
                        activeVeh.model.toLowerCase().includes('multijet') ||
                        activeVeh.model.toLowerCase().includes('diesel') ||
                        activeVeh.model.toLowerCase().includes('d')
                    );
                    if (isDiesel || usePid49ForThrottle.current) {
                        return ADAPTER_COMMANDS.ACCELERATOR_PEDAL_D;
                    }
                }
                return sensor.pid;
            };

            const connectedProtocol = useBluetoothStore.getState().protocol;
            const isCanBus = connectedProtocol && (
                connectedProtocol.toUpperCase().includes('CAN') ||
                connectedProtocol.toUpperCase().includes('ISO 15765') ||
                connectedProtocol.toUpperCase().includes('6') ||
                connectedProtocol.toUpperCase().includes('7')
            );

            if (isCanBus && isBatchQuerySupportedRef.current) {
                // CAN-Bus Flow: ATRV + Batch Queries (balanced chunk limit: 4)
                const hasVoltage = activeSensors.some(s => s.key === 'voltage');
                if (hasVoltage) {
                    await sendCommand('ATRV');
                    if (!pollingRef.current || useBluetoothStore.getState().status !== 'connected') return;
                }

                const obdPids = activeSensors
                    .filter(s => s.key !== 'voltage')
                    .map(s => getPid(s).replace(/\s+/g, '').substring(2)); // e.g. "0C"

                if (obdPids.length > 0) {
                    const totalPids = obdPids.length;
                    const numChunks = Math.ceil(totalPids / 4);
                    const baseSize = Math.floor(totalPids / numChunks);
                    const remainder = totalPids % numChunks;

                    const chunks: string[][] = [];
                    let start = 0;
                    for (let c = 0; c < numChunks; c++) {
                        const size = baseSize + (c < remainder ? 1 : 0);
                        chunks.push(obdPids.slice(start, start + size));
                        start += size;
                    }

                    for (const chunk of chunks) {
                        const batchCmd = '01 ' + chunk.join(' ');
                        try {
                            await sendCommand(batchCmd);
                        } catch (e) {
                            useBluetoothStore.getState().addLog(`DIAG: Batch query [${batchCmd}] failed: ${e}`);
                            throw e;
                        }
                        if (!pollingRef.current || useBluetoothStore.getState().status !== 'connected') return;
                    }
                }
            } else {
                // Sequential Polling Flow (K-Line or CAN-Bus with batch query disabled)
                for (const sensor of activeSensors) {
                    const pid = sensor.key === 'voltage' ? 'ATRV' : getPid(sensor);
                    try {
                        await sendCommand(pid);
                    } catch (e) {
                        useBluetoothStore.getState().addLog(`DIAG: Sequential query [${pid}] failed: ${e}`);
                        if (sensor.key === 'throttle' && pid === ADAPTER_COMMANDS.THROTTLE) {
                            usePid49ForThrottle.current = true;
                            try {
                                await sendCommand(ADAPTER_COMMANDS.ACCELERATOR_PEDAL_D);
                            } catch (err) {
                                // ignore
                            }
                        }
                    }
                    if (!pollingRef.current || useBluetoothStore.getState().status !== 'connected') return;
                    await preciseSleep(80); // 80ms inter-command breathing space
                }
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
        const currentDeviceName = useBluetoothStore.getState().deviceName || 'unknown';
        const currentDeviceId = useBluetoothStore.getState().deviceId || 'unknown';
        analytics().logEvent('bluetooth_disconnected', {
            reason: 'manual',
            device_name: currentDeviceName,
            device_id: currentDeviceId
        }).catch(e => console.warn('[Analytics] Failed manual disconnect event:', e));

        await triggerTelemetryEnqueue();
        stopPolling();
        OBDCommandQueue.clear(new Error('MANUAL_DISCONNECT'));
        await BluetoothService.disconnect();
        reset();
    }, [reset, stopPolling, triggerTelemetryEnqueue]);

    // Acımasız Temizlik (Merciless Cleanup) AppState Yönetimi
    useEffect(() => {
        const subscription = AppState.addEventListener('change', async (nextAppState) => {
            if (nextAppState.match(/inactive|background/)) {
                useBluetoothStore.getState().addLog('SYS: App backgrounded. Flushing OBD queue...');
                OBDCommandQueue.clear(new Error('APP_BACKGROUNDED'));
                stopPolling();
            } else if (nextAppState === 'active') {
                if (status === 'connected') {
                    try {
                        useBluetoothStore.getState().addLog('SYS: App active. Flushing UART garbage buffer...');
                        await OBDCommandQueue.add('\r', 1000);
                        useBluetoothStore.getState().addLog('SYS: UART buffer clean. Restarting telemetry.');
                        startPolling();
                    } catch (e) {
                        // Zombi İnfazı (Kill Zombie State): Cihaz arka planda ölmüş veya donmuş.
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

        // 1. Enter diagnostic mode and stop active polling loop
        useBluetoothStore.getState().setDiagnosticMode(true);
        const wasPollingActive = pollingRef.current;
        stopPolling();
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
            // 3. Exit diagnostic mode and resume polling if it was active
            useBluetoothStore.getState().setDiagnosticMode(false);
            if (wasPollingActive) {
                startPolling();
            }
        }
    }, [status, sendCommand, startPolling, stopPolling, handleVinReceived, triggerTelemetryEnqueue]);

    const clearDiagnostics = useCallback(async () => {
        if (status !== 'connected') return;
        // Guard Clause: Motor çalışıyorken arıza silmeyi reddet
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
            useBluetoothStore.getState().setSensorData({ dtcs: [] });
            const connectedVin = useBluetoothStore.getState().vin;
            if (connectedVin) {
                await addVehicleOperation(connectedVin, 'clear_dtc');
            }
            useBluetoothStore.getState().setDiagnosticMode(false);
            return;
        }
        useBluetoothStore.getState().setDiagnosticMode(true);
        const wasPollingActive = pollingRef.current;
        stopPolling();
        try {
            await sendCommand(ADAPTER_COMMANDS.CLEAR_DTC);
            // Refresh codes after clearing using UI-safe preciseSleep
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
    }, [status, sendCommand, stopPolling, startPolling]);

    const runAdaptationRoutine = useCallback(async (type: 'fuel' | 'ecu') => {
        if (status !== 'connected') return;

        if (useAppStore.getState().isSimulationMode) {
            useBluetoothStore.getState().setAdaptationRunning(true);
            useBluetoothStore.getState().setDiagnosticMode(true);
            await preciseSleep(1200);
            if (type === 'fuel') useBluetoothStore.getState().setSensorData({ dtcs: [] });
            const connectedVin = useBluetoothStore.getState().vin;
            if (connectedVin) {
                await addVehicleOperation(connectedVin, type === 'fuel' ? 'fuel_adaptation' : 'ecu_reset');
            }
            useBluetoothStore.getState().setAdaptationRunning(false);
            useBluetoothStore.getState().setDiagnosticMode(false);
            return;
        }

        useBluetoothStore.getState().setAdaptationRunning(true);
        useBluetoothStore.getState().setDiagnosticMode(true); // Pause polling
        const wasPollingActive = pollingRef.current;
        stopPolling();

        try {
            // Artificial delay to let background tasks resolve and create "loading" effect using UI-safe preciseSleep
            await preciseSleep(800);

            if (type === 'fuel') {
                // Guard Clause: Motor çalışıyorken arıza silmeyi reddet
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

            // Post-reset delay using UI-safe preciseSleep
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
    }, [status, sendCommand, stopPolling, startPolling]);

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
        isCloneDevice,
        isBatchQuerySupported
    };
};
