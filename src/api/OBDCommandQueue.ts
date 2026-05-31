import BluetoothService from './BluetoothService';
import { useBluetoothStore } from '../store/useBluetoothStore';
import { ADAPTER_COMMANDS } from './commands';
import * as Logger from '../services/Logger';

/**
 * Event-loop friendly high-precision sleep helper.
 * Uses a hybrid approach to avoid blocking UI rendering or causing starvation.
 * NOTE: requestAnimationFrame is removed to prevent thread freezing in background/lock screen modes.
 * For complete background telemetry, a native Foreground Service/CoreLocation service should be integrated.
 */
export function preciseSleep(ms: number): Promise<void> {
    const start = typeof performance !== 'undefined' ? performance.now() : Date.now();
    return new Promise((resolve) => {
        const check = () => {
            const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
            const elapsed = now - start;
            if (elapsed >= ms) {
                resolve();
            } else {
                const remaining = ms - elapsed;
                if (remaining > 10) {
                    // Yield event loop using setTimeout to avoid starvation
                    setTimeout(check, remaining - 4);
                } else if (typeof setImmediate !== 'undefined') {
                    // Yield execution on next event loop tick without screen refresh sync (background safe)
                    setImmediate(check);
                } else {
                    // Fallback to minimal setTimeout
                    setTimeout(check, 1);
                }
            }
        };
        check();
    });
}


interface QueueItem {
    command: string;
    resolve: (value: string) => void;
    reject: (reason?: any) => void;
    timeoutMs?: number;
}

class OBDCommandQueue {
    private queue: QueueItem[] = [];
    private isProcessing = false;
    private currentBuffer = '';
    private currentCommandTimeout: NodeJS.Timeout | null = null;
    private readonly DEFAULT_TIMEOUT_MS = 2000;

    private clearListeners: (() => void)[] = [];

    constructor() {
        // Subscribe to Bluetooth data globally
        BluetoothService.onDataReceived((data: string) => this.handleData(data));
    }

    onClear(callback: () => void) {
        this.clearListeners.push(callback);
    }

    removeClearListener(callback: () => void) {
        this.clearListeners = this.clearListeners.filter(cb => cb !== callback);
    }

    /**
     * Enqueues a command.
     * @param command The AT/OBD command (e.g., "010C").
     * @param timeoutMs Custom watchdog timeout (defaults to 2000ms).
     */
    add(command: string, timeoutMs?: number): Promise<string> {
        return new Promise((resolve, reject) => {
            this.queue.push({ command, resolve, reject, timeoutMs });
            this.processNext();
        });
    }

    /**
     * Processes the next command in the queue.
     */
    private async processNext() {
        if (this.isProcessing || this.queue.length === 0) return;

        this.isProcessing = true;
        this.currentBuffer = ''; // Clear buffer for new command
        const item = this.queue[0]; // Peek, don't shift yet (wait for completion)
        const timeoutMs = item.timeoutMs ?? this.DEFAULT_TIMEOUT_MS;

        try {
            this.currentCommandTimeout = setTimeout(() => {
                const errMsg = `Timeout: ${item.command}`;
                useBluetoothStore.getState().addLog(`ERR: ${errMsg}`);
                Logger.log('OBD_TIMEOUT', `Timeout sending command: ${item.command}`);
                this.finishCommand(new Error(errMsg));
            }, timeoutMs);

            // Send command (CR is appended in BluetoothService)
            useBluetoothStore.getState().addLog(`TX: ${item.command}`);
            Logger.log('OBD_WRITE', item.command);
            await BluetoothService.write(item.command);

        } catch (error) {
            this.finishCommand(error);
        }
    }

    /**
     * Handles incoming data chunks from BluetoothService.
     */
    private handleData(chunk: string) {
        if (!this.isProcessing) return; // Ignore unsolicited data

        Logger.log('OBD_READ_CHUNK', chunk);
        this.currentBuffer += chunk;

        // Safety check for buffer overflow (e.g. runaway data stream)
        if (this.currentBuffer.length > 4096) {
            this.currentBuffer = ''; // Discard buffer
            useBluetoothStore.getState().addLog('ERR: Buffer Overflow (Dropped)');
            // Don't finishCommand here, let timeout handle it
            return;
        }

        // ELM327 ends responses with '>' char
        if (this.currentBuffer.includes('>')) {
            let cleanResponse = this.currentBuffer.replace('>', '').trim();

            // Handle ECHO: If response starts with the command itself (e.g. sent "ATZ", received "ATZ..."), remove it.
            const currentItem = this.queue[0];
            if (currentItem && cleanResponse.startsWith(currentItem.command)) {
                cleanResponse = cleanResponse.substring(currentItem.command.length).trim();
            }

            this.finishCommand(null, cleanResponse);
        } else {
            // Optional: Log partial chunks for extreme debugging
            // useBluetoothStore.getState().addLog(`PARTIAL: ${chunk}`);
        }
    }

    /**
     * Parses the raw response based on the command.
     */
    private parseResponse(command: string, response: string) {
        // Remove "SEARCHING..." and spaces
        let clean = response.replace('SEARCHING...', '').trim().replace(/\s+/g, '');

        // ATI (Adapter Identity)
        if (command === 'ATI') {
            useBluetoothStore.getState().addLog(`ADAPTER_ID: ${response}`);
            if (response.toLowerCase().includes('v2.1')) {
                useBluetoothStore.getState().setIsCloneDevice(true);
                useBluetoothStore.getState().addLog('DETECTED: Clone/Low-Quality Adapter (v2.1)');
            }
            return;
        }

        // Check for error responses
        const isErrorResponse = clean.includes('NODATA') || clean.includes('ERROR') || clean.includes('?');
        if (isErrorResponse) {
            // Log odometer failures but don't set UNSUPPORTED yet (waterfall will handle)
            if (command === '01A6' || command.startsWith('22')) {
                useBluetoothStore.getState().addLog(`ODO_FAIL: ${command} → ${clean.substring(0, 20)}`);
            }
            return;
        }

        // ATRV (Battery Voltage) - returns raw string like "12.4V"
        if (command === 'ATRV') {
            const voltMatch = clean.match(/(\d+\.?\d*)V?/i);
            if (voltMatch) {
                useBluetoothStore.getState().setSensorData({ voltage: voltMatch[1] + 'V' });
            }
            return;
        }

        // Helper to check for valid response echo (e.g. 010C -> 410C)
        const checkEcho = (cmd: string, resp: string) => {
            if (cmd.length !== 4) return false;
            const mode = cmd.substring(0, 2);
            const pid = cmd.substring(2, 4);
            const expectedEcho = (parseInt(mode) + 40).toString() + pid;
            return resp.includes(expectedEcho);
        };

        const getHexData = (cmd: string, resp: string, bytes: number) => {
            const mode = cmd.substring(0, 2);
            const pid = cmd.substring(2, 4);
            const echo = (parseInt(mode) + 40).toString() + pid;

            if (resp.includes(echo)) {
                const parts = resp.split(echo);
                if (parts.length > 1) {
                    return parts[1].substring(0, bytes * 2);
                }
            }
            return null;
        };

        // RPM (010C) - 2 bytes
        if (command === '010C') {
            const hex = getHexData(command, clean, 2);
            if (hex && hex.length === 4) {
                const a = parseInt(hex.substring(0, 2), 16);
                const b = parseInt(hex.substring(2, 4), 16);
                if (!isNaN(a) && !isNaN(b)) {
                    useBluetoothStore.getState().setRpm(Math.round(((a * 256) + b) / 4));
                }
            }
        }
        // SPEED (010D) - 1 byte
        else if (command === '010D') {
            const hex = getHexData(command, clean, 1);
            if (hex && hex.length === 2) {
                const speed = parseInt(hex, 16);
                if (!isNaN(speed)) {
                    useBluetoothStore.getState().setSensorData({ speed });
                }
            }
        }
        // COOLANT (0105) - 1 byte
        else if (command === '0105') {
            const hex = getHexData(command, clean, 1);
            if (hex && hex.length === 2) {
                const a = parseInt(hex, 16);
                if (!isNaN(a)) {
                    useBluetoothStore.getState().setSensorData({ coolant: a - 40 });
                }
            }
        }
        // THROTTLE (0111) - 1 byte
        else if (command === '0111') {
            const hex = getHexData(command, clean, 1);
            if (hex && hex.length === 2) {
                const a = parseInt(hex, 16);
                if (!isNaN(a)) {
                    useBluetoothStore.getState().setSensorData({ throttle: Math.round((a * 100) / 255) });
                }
            }
        }
        // ENGINE LOAD (0104) - 1 byte
        else if (command === '0104') {
            const hex = getHexData(command, clean, 1);
            if (hex && hex.length === 2) {
                const a = parseInt(hex, 16);
                if (!isNaN(a)) {
                    useBluetoothStore.getState().setSensorData({ engineLoad: Math.round((a * 100) / 255) });
                }
            }
        }
        // INTAKE AIR TEMP (010F) - 1 byte
        else if (command === '010F') {
            const hex = getHexData(command, clean, 1);
            if (hex && hex.length === 2) {
                const a = parseInt(hex, 16);
                if (!isNaN(a)) {
                    useBluetoothStore.getState().setSensorData({ intakeAirTemp: a - 40 });
                }
            }
        }
        // MANIFOLD PRESSURE (010B) - 1 byte
        else if (command === '010B') {
            const hex = getHexData(command, clean, 1);
            if (hex && hex.length === 2) {
                const a = parseInt(hex, 16);
                if (!isNaN(a)) {
                    useBluetoothStore.getState().setSensorData({ manifoldPressure: a });
                }
            }
        }
        // ODOMETER (01A6) - 4 bytes (Standard OBD-II, only 2019+)
        else if (command === '01A6') {
            const hex = getHexData(command, clean, 4);
            if (hex && hex.length === 8) {
                const a = parseInt(hex.substring(0, 2), 16);
                const b = parseInt(hex.substring(2, 4), 16);
                const c = parseInt(hex.substring(4, 6), 16);
                const d = parseInt(hex.substring(6, 8), 16);
                if (!isNaN(a) && !isNaN(b) && !isNaN(c) && !isNaN(d)) {
                    const km = ((a * 16777216) + (b * 65536) + (c * 256) + d) / 10;
                    useBluetoothStore.getState().setSensorData({ odometer: Math.round(km) });
                }
            }
        }

        // DISTANCE SINCE CLEARED (0131) - 2 bytes
        else if (command === '0131') {
            const hex = getHexData(command, clean, 2);
            if (hex && hex.length === 4) {
                const a = parseInt(hex.substring(0, 2), 16);
                const b = parseInt(hex.substring(2, 4), 16);
                if (!isNaN(a) && !isNaN(b)) {
                    useBluetoothStore.getState().setSensorData({ distanceSinceCleared: (a * 256) + b });
                }
            }
        }
        // DISTANCE MIL ON (0121) - 2 bytes
        else if (command === '0121') {
            const hex = getHexData(command, clean, 2);
            if (hex && hex.length === 4) {
                const a = parseInt(hex.substring(0, 2), 16);
                const b = parseInt(hex.substring(2, 4), 16);
                if (!isNaN(a) && !isNaN(b)) {
                    useBluetoothStore.getState().setSensorData({ distanceMilOn: (a * 256) + b });
                }
            }
        }
        // READ DTCs (03)
        else if (command === '03') {
            if (clean.includes('43')) {
                // Example response: "43 01 13 00 00 00 00" -> "43011300000000"
                const dataPart = clean.substring(clean.indexOf('43') + 2);
                const dtcs: string[] = [];

                for (let i = 0; i < dataPart.length; i += 4) {
                    const codeHex = dataPart.substring(i, i + 4);
                    if (codeHex === '0000' || codeHex.length < 4) continue;

                    const firstChar = parseInt(codeHex[0], 16);
                    let dtcType = '';
                    switch (firstChar >> 2) { // Top 2 bits
                        case 0: dtcType = 'P'; break;
                        case 1: dtcType = 'C'; break;
                        case 2: dtcType = 'B'; break;
                        case 3: dtcType = 'U'; break;
                    }

                    const secondChar = (firstChar & 0x03).toString(); // Bottom 2 bits
                    const remainingHex = codeHex.substring(1);
                    dtcs.push(`${dtcType}${secondChar}${remainingHex}`);
                }
                useBluetoothStore.getState().setSensorData({ dtcs });
            }
        }
        // CLEAR DTCs (04)
        else if (command === '04') {
            // Usually returns "44" on success. We can optimistically clear our local state
            if (clean.includes('44') || clean.includes('OK')) {
                useBluetoothStore.getState().setSensorData({ dtcs: [] });
            }
        }
        // READ VIN (0902)
        else if (command === '0902') {
            // A typical 0902 multi-frame response looks like "49 02 01 XX XX XX..."
            // We strip out formatting, the "4902", frame numbers, etc. ELM327 does this partly for us if formatted well, 
            // but we'll try a basic ASCII extraction on the hex pairs that follow 4902
            if (clean.includes('4902')) {
                let hexData = clean.substring(clean.indexOf('4902') + 4);
                // Simple multiline frame strip (e.g. "014:490201...", we just need the raw hex pairs)
                // Filter out any non-hex chars, and frame indexing (often the first byte per line in multi-line)
                // For a robust implementation, this needs proper ISO 15765-4 multi-frame assembly, 
                // but basic string replacement often works for direct adapters.
                let vinAscii = '';
                for (let i = 0; i < hexData.length; i += 2) {
                    const byteStr = hexData.substring(i, i + 2);
                    const charCode = parseInt(byteStr, 16);
                    // Standard ASCII printable range
                    if (charCode >= 32 && charCode <= 126) {
                        vinAscii += String.fromCharCode(charCode);
                    }
                }

                // Typical VIN is 17 chars. Let's do a loose extraction.
                const match = vinAscii.match(/[A-HJ-NPR-Z0-9]{17}/);
                if (match) {
                    useBluetoothStore.getState().setSensorData({ vin: match[0] });
                } else if (vinAscii.length >= 17) {
                    // Fallback string matching
                    useBluetoothStore.getState().setSensorData({ vin: vinAscii });
                }
            }
        }
        // READ CALIBRATION ID (0904)
        else if (command === '0904') {
            if (clean.includes('4904')) {
                let hexData = clean.substring(clean.indexOf('4904') + 4);
                let calIdAscii = '';
                for (let i = 0; i < hexData.length; i += 2) {
                    const byteStr = hexData.substring(i, i + 2);
                    const charCode = parseInt(byteStr, 16);
                    if (charCode >= 32 && charCode <= 126) {
                        calIdAscii += String.fromCharCode(charCode);
                    }
                }
                const cleanCalId = calIdAscii.trim();
                if (cleanCalId) {
                    useBluetoothStore.getState().setSensorData({ ecuId: cleanCalId });
                }
            }
        }
    }

    /**
     * Finalizes the current command (success or error) and moves to next.
     */
    private finishCommand(error: any | null, result?: string) {
        if (this.currentCommandTimeout) {
            clearTimeout(this.currentCommandTimeout);
            this.currentCommandTimeout = null;
        }

        const item = this.queue.shift(); // Remove from queue

        if (item) {
            if (error) {
                // console.error(`[Queue] Cmd Failed: ${item.command}`, error);
                Logger.log('OBD_ERROR', `Cmd: ${item.command} - Error: ${error.message || error}`);
                item.reject(error);
            } else {
                useBluetoothStore.getState().addLog(`RX: ${result}`);
                Logger.log('OBD_READ_RESPONSE', `Cmd: ${item.command} - Resp: ${result}`);

                // Parse the response
                if (result) {
                    this.parseResponse(item.command, result);
                }

                item.resolve(result || '');
            }
        }

        this.isProcessing = false;

        // Process next item after high-precision event loop-friendly guard time (30ms)
        preciseSleep(30).then(() => this.processNext());
    }

    clear(error: Error = new Error('CONNECTION_LOST')) {
        if (this.currentCommandTimeout) {
            clearTimeout(this.currentCommandTimeout);
            this.currentCommandTimeout = null;
        }

        const pending = [...this.queue];
        this.queue = [];
        this.isProcessing = false;
        this.currentBuffer = '';

        pending.forEach(item => {
            try {
                item.reject(error);
            } catch (e) {
                console.error('Error rejecting item on queue clear:', e);
            }
        });

        // Notify useBluetooth hook or other telemetry loops to break immediately
        this.clearListeners.forEach(cb => {
            try {
                cb();
            } catch (e) {
                console.error('Error in OBDCommandQueue clear listener:', e);
            }
        });
    }
}

export default new OBDCommandQueue();
