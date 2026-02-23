import React, { useState, useEffect, useCallback } from 'react';
import { Alert } from 'react-native';
import RNBluetoothClassic from 'react-native-bluetooth-classic';
import BluetoothService from '../api/BluetoothService';
import OBDCommandQueue from '../api/OBDCommandQueue';
import { useBluetoothStore } from '../store/useBluetoothStore';
import { ADAPTER_COMMANDS, OEM_COMMANDS } from '../api/commands';

export const useBluetooth = () => {
    const {
        status,
        adapterStatus,
        ecuStatus,
        deviceName,
        deviceId,
        lastResponse,
        error,
        setStatus,
        setAdapterStatus,
        setEcuStatus,
        setDevice,
        setLastResponse,
        setError,
        logs,
        rpm,
        clearLogs,
        reset,
        selectedBrand,
        setSelectedBrand,
        lastDeviceId,
        lastDeviceName,
        setLastDevice,
        isCloneDevice,
    } = useBluetoothStore();

    /**
     * Request to enable Bluetooth on the device
     */
    const enableBluetooth = useCallback(async () => {
        try {
            const enabled = await RNBluetoothClassic.requestBluetoothEnabled();
            return enabled;
        } catch (e) {
            setError(e instanceof Error ? e.message : String(e));
            return false;
        }
    }, [setError]);

    /**
     * Scan for paired devices
     */
    const scanDevices = useCallback(async () => {
        setStatus('scanning');
        try {
            return await BluetoothService.scanDevices();
        } catch (e) {
            setError(e instanceof Error ? e.message : String(e));
            setStatus('error');
            return [];
        } finally {
            if (status === 'scanning') setStatus('disconnected');
        }
    }, [status, setStatus, setError]);

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

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            // Optional cleanup
        };
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
            // Priority 1: High frequency (RPM & Speed) - polled every cycle
            await sendCommand(ADAPTER_COMMANDS.RPM);
            await sendCommand(ADAPTER_COMMANDS.SPEED);

            // Priority 2: Low frequency (Coolant, Throttle, Voltage) - polled every 5 cycles
            tickRef.current += 1;
            if (tickRef.current >= 5) {
                tickRef.current = 0;
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
                setTimeout(performPollSync, 0); // Execute next loop as soon as possible after current finishes
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

            // 2. Query Diagnostic Metrics sequentially
            await sendCommand(ADAPTER_COMMANDS.READ_VIN);
            await sendCommand(ADAPTER_COMMANDS.READ_DTC);

            // Odometer Waterfall — try multiple methods until one works
            const odometerBefore = useBluetoothStore.getState().odometer;
            const isClone = useBluetoothStore.getState().isCloneDevice;

            // Attempt 1: Standard OBD-II PID (2019+ vehicles)
            await sendCommand(ADAPTER_COMMANDS.ODOMETER);

            // If standard failed, try UDS methods
            if (useBluetoothStore.getState().odometer === odometerBefore || useBluetoothStore.getState().odometer === null) {
                if (isClone) {
                    useBluetoothStore.getState().addLog('WARN: Clone device - Deep Scan may fail');
                }
                useBluetoothStore.getState().addLog('ODO: Standard failed, trying UDS Waterfall...');

                // Attempt 2: Generic UDS PIDs on default header
                const udsPIDs = [
                    ADAPTER_COMMANDS.ODOMETER_ALT1,
                    ADAPTER_COMMANDS.ODOMETER_ALT2,
                    ADAPTER_COMMANDS.ODOMETER_ALT3
                ];

                for (const pid of udsPIDs) {
                    if (useBluetoothStore.getState().odometer && useBluetoothStore.getState().odometer !== 'UNSUPPORTED' && useBluetoothStore.getState().odometer !== odometerBefore) break;
                    await sendCommand(pid);
                }
            }

            // Honda Specific Deep Scan (Multi-Header)
            const brand = useBluetoothStore.getState().selectedBrand;
            if ((useBluetoothStore.getState().odometer === odometerBefore || useBluetoothStore.getState().odometer === null) && brand === 'HONDA') {
                useBluetoothStore.getState().addLog('ODO: Generic UDS failed, trying Deep Honda Header Scan...');
                try {
                    const hondaPIDs = [
                        OEM_COMMANDS.HONDA_ODOMETER_1,
                        OEM_COMMANDS.HONDA_ODOMETER_2,
                        OEM_COMMANDS.HONDA_ODOMETER_3,
                        OEM_COMMANDS.HONDA_ODOMETER_4,
                        OEM_COMMANDS.HONDA_ODOMETER_5,
                        OEM_COMMANDS.HONDA_ODOMETER_6
                    ];
                    // Try ECU (7E0) then IPC cluster variants (720, 760)
                    const headers = [ADAPTER_COMMANDS.HEADER_ECU, ADAPTER_COMMANDS.HEADER_IPC_1, ADAPTER_COMMANDS.HEADER_IPC_2];

                    for (const header of headers) {
                        if (useBluetoothStore.getState().odometer && useBluetoothStore.getState().odometer !== 'UNSUPPORTED' && useBluetoothStore.getState().odometer !== odometerBefore) break;

                        try {
                            await sendCommand(header);
                            await sendCommand(ADAPTER_COMMANDS.EXTENDED_SESSION); // 10 03

                            for (const pid of hondaPIDs) {
                                await sendCommand(pid);
                                if (useBluetoothStore.getState().odometer && useBluetoothStore.getState().odometer !== 'UNSUPPORTED' && useBluetoothStore.getState().odometer !== odometerBefore) break;
                            }
                        } catch (e) {
                            console.warn(`Honda Scan failed for header ${header}:`, e);
                        } finally {
                            await sendCommand(ADAPTER_COMMANDS.DEFAULT_SESSION).catch(() => { });
                        }
                    }
                } finally {
                    await sendCommand(ADAPTER_COMMANDS.HEADER_ECU).catch(() => { });
                }
            }

            // Yamaha fallback
            if ((useBluetoothStore.getState().odometer === odometerBefore || useBluetoothStore.getState().odometer === null) && brand === 'YAMAHA') {
                await sendCommand(OEM_COMMANDS.YAMAHA_ODOMETER);
            }

            // If still nothing worked, mark as unsupported
            if (useBluetoothStore.getState().odometer === odometerBefore || useBluetoothStore.getState().odometer === null) {
                useBluetoothStore.getState().setSensorData({ odometer: 'UNSUPPORTED' });
                useBluetoothStore.getState().addLog('ODO: All methods failed → UNSUPPORTED');
            }

            await sendCommand(ADAPTER_COMMANDS.DISTANCE_SINCE_CLEARED);
            await sendCommand(ADAPTER_COMMANDS.DISTANCE_MIL_ON);

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
        rpm,
        coolant: useBluetoothStore((state) => state.coolant),
        speed: useBluetoothStore((state) => state.speed),
        throttle: useBluetoothStore((state) => state.throttle),
        voltage: useBluetoothStore((state) => state.voltage),
        engineLoad: useBluetoothStore((state) => state.engineLoad),
        intakeAirTemp: useBluetoothStore((state) => state.intakeAirTemp),
        manifoldPressure: useBluetoothStore((state) => state.manifoldPressure),

        // Expertise Data
        dtcs: useBluetoothStore((state) => state.dtcs),
        vin: useBluetoothStore((state) => state.vin),
        odometer: useBluetoothStore((state) => state.odometer),
        distanceSinceCleared: useBluetoothStore((state) => state.distanceSinceCleared),
        distanceMilOn: useBluetoothStore((state) => state.distanceMilOn),
        isDiagnosticMode: useBluetoothStore((state) => state.isDiagnosticMode),
        isAdaptationRunning: useBluetoothStore((state) => state.isAdaptationRunning),
        selectedBrand: useBluetoothStore((state) => state.selectedBrand),
        setSelectedBrand: useBluetoothStore((state) => state.setSelectedBrand),
        lastDeviceId,
        lastDeviceName,

        startPolling,
        stopPolling,
        runDiagnostics,
        clearDiagnostics,
        runAdaptationRoutine,
        clearLogs,
        isCloneDevice
    };
};
