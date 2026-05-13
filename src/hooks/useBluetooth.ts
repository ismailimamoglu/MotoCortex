import React, { useState, useEffect, useCallback } from 'react';
import { Alert, Platform, Linking } from 'react-native';
import { useTranslation } from 'react-i18next';
import BluetoothService from '../api/BluetoothService';
import { BluetoothPermissionError } from '../api/BluetoothService';
import OBDCommandQueue from '../api/OBDCommandQueue';
import { useBluetoothStore } from '../store/useBluetoothStore';
import { ADAPTER_COMMANDS } from '../api/commands';

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

    /**
     * Request to enable Bluetooth on the device.
     * On iOS, there is no API to enable BT programmatically — open Settings instead.
     * On Android, uses the native Classic Bluetooth enablement dialog.
     */
    const enableBluetooth = useCallback(async () => {
        try {
            if (Platform.OS === 'ios') {
                // iOS does not allow apps to enable Bluetooth programmatically.
                // Direct the user to system Settings.
                Linking.openSettings();
                return false;
            }
            // Android: Dynamic import to avoid loading Classic module on iOS
            const RNBluetoothClassic = require('react-native-bluetooth-classic').default;
            const enabled = await RNBluetoothClassic.requestBluetoothEnabled();
            return enabled;
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
                    t('connection.error'),
                    t('connection.bluetoothOffDesc') || 'Bluetooth kapalı. Lütfen Bluetooth ayarlarınızı kontrol edin.'
                );
            } else if (e instanceof BluetoothPermissionError) {
                Alert.alert(
                    t('connection.error'),
                    t('connection.permissionDesc') || 'Bluetooth izni reddedildi. Lütfen ayarlardan izin verin.'
                );
            } else {
                Alert.alert(
                    t('connection.error'),
                    `Tarama Başarısız: ${msg}`
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
                BluetoothService.onDisconnect(() => {
                    reset();
                    Alert.alert('Bağlantı Koptu!', 'Bluetooth bağlantısı beklenmedik şekilde kesildi. Lütfen tekrar bağlanın.');
                });

                setStatus('connected');
                setAdapterStatus('connected');

                // Add delay for adapter to settle (especially for Release builds)
                setTimeout(() => {
                    initializeAndCheckEcu();
                }, 1500);
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
        try {
            // 1. Initialize Adapter
            await OBDCommandQueue.add(ADAPTER_COMMANDS.RESET);         // ATZ
            await OBDCommandQueue.add(ADAPTER_COMMANDS.ECHO_OFF);      // ATE0
            await OBDCommandQueue.add(ADAPTER_COMMANDS.DEVICE_INFO);   // ATI (Detect Clone)
            await OBDCommandQueue.add(ADAPTER_COMMANDS.SPACES_OFF);    // ATS0
            await OBDCommandQueue.add(ADAPTER_COMMANDS.PROTOCOL_AUTO); // ATSP0

            // 2. Check ECU Connection with a basic PID (RPM)
            const rpmRes = await OBDCommandQueue.add(ADAPTER_COMMANDS.RPM);

            if (rpmRes && !rpmRes.includes('NO DATA') && !rpmRes.includes('ERROR') && !rpmRes.includes('UNABLE TO CONNECT')) {
                setEcuStatus('connected');
                setLastResponse(rpmRes);
            } else {
                setEcuStatus('error');
                setError('ECU not responding. Ignition on?');
            }
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
     * Disconnect
     */
    const disconnect = useCallback(async () => {
        await BluetoothService.disconnect();
        reset();
    }, [reset]);

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

    const [isPollingActive, setIsPollingActive] = useState(false);

    // Keep track of the current polling loop to prevent concurrent loops
    const pollingRef = React.useRef(false);
    const tickRef = React.useRef(0);

    const performPollSync = async () => {
        const state = useBluetoothStore.getState();
        if (!pollingRef.current || state.status !== 'connected' || state.isDiagnosticMode) {
            return;
        }

        try {
            // Priority 1: High frequency (RPM) - polled every cycle
            await sendCommand(ADAPTER_COMMANDS.RPM);

            // Priority 2: Low frequency (Speed, Coolant, Throttle, Voltage) - polled every 5 cycles
            tickRef.current += 1;
            if (tickRef.current >= 4) {
                tickRef.current = 0;
                await sendCommand(ADAPTER_COMMANDS.SPEED);
                await sendCommand(ADAPTER_COMMANDS.COOLANT_TEMP);
                await sendCommand(ADAPTER_COMMANDS.THROTTLE);
                await sendCommand(ADAPTER_COMMANDS.VOLTAGE);
                await sendCommand(ADAPTER_COMMANDS.LOAD);
                await sendCommand(ADAPTER_COMMANDS.INTAKE_AIR_TEMP);
                await sendCommand(ADAPTER_COMMANDS.MANIFOLD_PRESSURE);
            }
        } catch (e) {
            console.error("Polling error:", e);
        } finally {
            // Schedule the next poll if still active
            if (pollingRef.current) {
                setTimeout(performPollSync, 250); // ~4Hz base interval for RPM/Speed responsiveness
            }
        }
    };

    const startPolling = useCallback(() => {
        if (pollingRef.current) return;

        pollingRef.current = true;
        setIsPollingActive(true);
        tickRef.current = 0;

        // Start the recursive loop
        performPollSync();
    }, [sendCommand]);

    const stopPolling = useCallback(() => {
        pollingRef.current = false;
        setIsPollingActive(false);
    }, []);

    // Auto-stop polling on disconnect
    useEffect(() => {
        if (status !== 'connected' && isPollingActive) {
            stopPolling();
        }
    }, [status, isPollingActive, stopPolling]);

    const runDiagnostics = useCallback(async () => {
        if (status !== 'connected') return;

        // 1. Enter diagnostic mode (pauses background polling)
        useBluetoothStore.getState().setDiagnosticMode(true);
        setError(null);

        try {
            // Give the ELM327 a short moment to clear its previous queues
            await new Promise(resolve => setTimeout(resolve, 100));

            // 2. Query Diagnostic Metrics sequentially (Optimized Linear Flow)
            useBluetoothStore.getState().addLog('DIAG: Starting linear scan...');

            await sendCommand(ADAPTER_COMMANDS.READ_VIN); // 0902
            await sendCommand(ADAPTER_COMMANDS.READ_DTC); // 03
            await sendCommand(ADAPTER_COMMANDS.ODOMETER); // 01A6 (Standard)
            await sendCommand(ADAPTER_COMMANDS.DISTANCE_SINCE_CLEARED); // 0131
            await sendCommand(ADAPTER_COMMANDS.DISTANCE_MIL_ON); // 0121

            useBluetoothStore.getState().addLog('DIAG: Scan complete.');

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
    }, [status, sendCommand, startPolling, isPollingActive]);

    const clearDiagnostics = useCallback(async () => {
        if (status !== 'connected') return;
        useBluetoothStore.getState().setDiagnosticMode(true);
        try {
            await sendCommand(ADAPTER_COMMANDS.CLEAR_DTC);
            // Refresh codes after clearing
            await new Promise(resolve => setTimeout(resolve, 500));
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

        useBluetoothStore.getState().setAdaptationRunning(true);
        useBluetoothStore.getState().setDiagnosticMode(true); // Pause polling

        try {
            // Artificial delay to let background tasks resolve and create "loading" effect
            await new Promise(resolve => setTimeout(resolve, 800));

            if (type === 'fuel') {
                await sendCommand(ADAPTER_COMMANDS.CLEAR_DTC);
            } else if (type === 'ecu') {
                await sendCommand(ADAPTER_COMMANDS.ECU_RESET);
            }

            // Post-reset delay
            await new Promise(resolve => setTimeout(resolve, 800));

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

