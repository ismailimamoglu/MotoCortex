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
    private blacklist: Set<string> = new Set();
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

        // Wait until the buffer ends with the prompt '>' character
        const trimmed = this.currentBuffer.trim();
        if (trimmed.endsWith('>')) {
            // Remove the prompt '>' character
            let cleanResponse = trimmed.substring(0, trimmed.length - 1).trim();

            // Clean intermediate "SEARCHING..." responses safely without stripping CR/LF (\r\n)
            cleanResponse = cleanResponse.replace(/SEARCHING\.*/gi, '').trim();

            // Handle ECHO: If response starts with the command itself (e.g. sent "ATZ", received "ATZ..."), remove it.
            const currentItem = this.queue[0];
            if (currentItem && cleanResponse.startsWith(currentItem.command)) {
                cleanResponse = cleanResponse.substring(currentItem.command.length).trim();
            }

            this.finishCommand(null, cleanResponse);
        }
    }

    private parseMode01Response(command: string, response: string) {
        const startIdx = response.indexOf('41');
        if (startIdx === -1) return;
        const mode01Payload = response.substring(startIdx);

        let clean = mode01Payload.replace(/SEARCHING\.*/gi, '');
        clean = clean.replace(/[\r\n]+/g, ' ');
        clean = clean.replace(/\b\w+:\s*/g, '');
        clean = clean.replace(/\s+/g, '');

        const getPidByteLength = (p: string): number => {
            const up = p.toUpperCase();
            if (up === '0C' || up === '10' || up === '3C' || up === '42') return 2;
            if (up === 'A6') return 4;
            return 1;
        };

        const parseAndSetPid = (p: string, hex: string) => {
            if (!hex || hex.length < 2) return;
            const cleanPid = p.toUpperCase();

            if (cleanPid === '0C') {
                if (hex.length === 4) {
                    const a = parseInt(hex.substring(0, 2), 16);
                    const b = parseInt(hex.substring(2, 4), 16);
                    if (!isNaN(a) && !isNaN(b)) {
                        useBluetoothStore.getState().setRpm(Math.round(((a * 256) + b) / 4));
                    }
                }
            } else if (cleanPid === '0D') {
                const speed = parseInt(hex, 16);
                if (!isNaN(speed)) {
                    useBluetoothStore.getState().setSensorData({ speed });
                }
            } else if (cleanPid === '05') {
                const a = parseInt(hex, 16);
                if (!isNaN(a)) {
                    useBluetoothStore.getState().setSensorData({ coolant: a - 40 });
                }
            } else if (cleanPid === '11' || cleanPid === '49') {
                const a = parseInt(hex, 16);
                if (!isNaN(a)) {
                    useBluetoothStore.getState().setSensorData({ throttle: Math.round((a * 100) / 255) });
                }
            } else if (cleanPid === '04') {
                const a = parseInt(hex, 16);
                if (!isNaN(a)) {
                    useBluetoothStore.getState().setSensorData({ engineLoad: Math.round((a * 100) / 255) });
                }
            } else if (cleanPid === '0F') {
                const a = parseInt(hex, 16);
                if (!isNaN(a)) {
                    useBluetoothStore.getState().setSensorData({ intakeAirTemp: a - 40 });
                }
            } else if (cleanPid === '0B') {
                const a = parseInt(hex, 16);
                if (!isNaN(a)) {
                    useBluetoothStore.getState().setSensorData({ manifoldPressure: a });
                }
            } else if (cleanPid === '46') {
                const a = parseInt(hex, 16);
                if (!isNaN(a)) {
                    useBluetoothStore.getState().setSensorData({ ambientTemp: a - 40 });
                }
            } else if (cleanPid === '5C') {
                const a = parseInt(hex, 16);
                if (!isNaN(a)) {
                    useBluetoothStore.getState().setSensorData({ oilTemp: a - 40 });
                }
            } else if (cleanPid === '10') {
                if (hex.length === 4) {
                    const a = parseInt(hex.substring(0, 2), 16);
                    const b = parseInt(hex.substring(2, 4), 16);
                    if (!isNaN(a) && !isNaN(b)) {
                        useBluetoothStore.getState().setSensorData({ mafFlow: Number((((a * 256) + b) / 100).toFixed(2)) });
                    }
                }
            } else if (cleanPid === '0E') {
                const a = parseInt(hex, 16);
                if (!isNaN(a)) {
                    useBluetoothStore.getState().setSensorData({ timingAdvance: Number((a / 2 - 64).toFixed(1)) });
                }
            } else if (cleanPid === '2F') {
                const a = parseInt(hex, 16);
                if (!isNaN(a)) {
                    useBluetoothStore.getState().setSensorData({ fuelLevel: Math.round((a * 100) / 255) });
                }
            } else if (cleanPid === '3C') {
                if (hex.length === 4) {
                    const a = parseInt(hex.substring(0, 2), 16);
                    const b = parseInt(hex.substring(2, 4), 16);
                    if (!isNaN(a) && !isNaN(b)) {
                        useBluetoothStore.getState().setSensorData({ catalystTemp: Number((((a * 256) + b) / 10 - 40).toFixed(1)) });
                    }
                }
            }
        };

        if (command.length > 4) {
            const upperCleanBatch = clean.toUpperCase();
            const startIdx = upperCleanBatch.indexOf('41');
            if (startIdx !== -1) {
                let remaining = upperCleanBatch.substring(startIdx + 2);
                const requestedPids: string[] = [];
                for (let i = 2; i < command.length; i += 2) {
                    requestedPids.push(command.substring(i, i + 2).toUpperCase());
                }

                for (const pid of requestedPids) {
                    const pidIdx = remaining.indexOf(pid);
                    if (pidIdx !== -1) {
                        const bytes = getPidByteLength(pid);
                        const dataStart = pidIdx + 2;
                        const dataEnd = dataStart + bytes * 2;
                        if (dataEnd <= remaining.length) {
                            const hexVal = remaining.substring(dataStart, dataEnd);
                            parseAndSetPid(pid, hexVal);
                            remaining = remaining.substring(dataEnd);
                        }
                    }
                }
            }
        } else {
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

            if (command === '010C') {
                const hex = getHexData(command, clean, 2);
                if (hex && hex.length === 4) {
                    const a = parseInt(hex.substring(0, 2), 16);
                    const b = parseInt(hex.substring(2, 4), 16);
                    if (!isNaN(a) && !isNaN(b)) {
                        useBluetoothStore.getState().setRpm(Math.round(((a * 256) + b) / 4));
                    }
                }
            } else if (command === '010D') {
                const hex = getHexData(command, clean, 1);
                if (hex && hex.length === 2) {
                    const speed = parseInt(hex, 16);
                    if (!isNaN(speed)) {
                        useBluetoothStore.getState().setSensorData({ speed });
                    }
                }
            } else if (command === '0105') {
                const hex = getHexData(command, clean, 1);
                if (hex && hex.length === 2) {
                    const a = parseInt(hex, 16);
                    if (!isNaN(a)) {
                        useBluetoothStore.getState().setSensorData({ coolant: a - 40 });
                    }
                }
            } else if (command === '0111') {
                const hex = getHexData(command, clean, 1);
                if (hex && hex.length === 2) {
                    const a = parseInt(hex, 16);
                    if (!isNaN(a)) {
                        useBluetoothStore.getState().setSensorData({ throttle: Math.round((a * 100) / 255) });
                    }
                }
            } else if (command === '0149') {
                const hex = getHexData(command, clean, 1);
                if (hex && hex.length === 2) {
                    const a = parseInt(hex, 16);
                    if (!isNaN(a)) {
                        useBluetoothStore.getState().setSensorData({ throttle: Math.round((a * 100) / 255) });
                    }
                }
            } else if (command === '0104') {
                const hex = getHexData(command, clean, 1);
                if (hex && hex.length === 2) {
                    const a = parseInt(hex, 16);
                    if (!isNaN(a)) {
                        useBluetoothStore.getState().setSensorData({ engineLoad: Math.round((a * 100) / 255) });
                    }
                }
            } else if (command === '010F') {
                const hex = getHexData(command, clean, 1);
                if (hex && hex.length === 2) {
                    const a = parseInt(hex, 16);
                    if (!isNaN(a)) {
                        useBluetoothStore.getState().setSensorData({ intakeAirTemp: a - 40 });
                    }
                }
            } else if (command === '010B') {
                const hex = getHexData(command, clean, 1);
                if (hex && hex.length === 2) {
                    const a = parseInt(hex, 16);
                    if (!isNaN(a)) {
                        useBluetoothStore.getState().setSensorData({ manifoldPressure: a });
                    }
                }
            } else if (command === '0146') {
                const hex = getHexData(command, clean, 1);
                if (hex && hex.length === 2) {
                    const a = parseInt(hex, 16);
                    if (!isNaN(a)) {
                        useBluetoothStore.getState().setSensorData({ ambientTemp: a - 40 });
                    }
                }
            } else if (command === '015C') {
                const hex = getHexData(command, clean, 1);
                if (hex && hex.length === 2) {
                    const a = parseInt(hex, 16);
                    if (!isNaN(a)) {
                        useBluetoothStore.getState().setSensorData({ oilTemp: a - 40 });
                    }
                }
            } else if (command === '0110') {
                const hex = getHexData(command, clean, 2);
                if (hex && hex.length === 4) {
                    const a = parseInt(hex.substring(0, 2), 16);
                    const b = parseInt(hex.substring(2, 4), 16);
                    if (!isNaN(a) && !isNaN(b)) {
                        useBluetoothStore.getState().setSensorData({ mafFlow: Number((((a * 256) + b) / 100).toFixed(2)) });
                    }
                }
            } else if (command === '010E') {
                const hex = getHexData(command, clean, 1);
                if (hex && hex.length === 2) {
                    const a = parseInt(hex, 16);
                    if (!isNaN(a)) {
                        useBluetoothStore.getState().setSensorData({ timingAdvance: Number((a / 2 - 64).toFixed(1)) });
                    }
                }
            } else if (command === '012F') {
                const hex = getHexData(command, clean, 1);
                if (hex && hex.length === 2) {
                    const a = parseInt(hex, 16);
                    if (!isNaN(a)) {
                        useBluetoothStore.getState().setSensorData({ fuelLevel: Math.round((a * 100) / 255) });
                    }
                }
            } else if (command === '013C') {
                const hex = getHexData(command, clean, 2);
                if (hex && hex.length === 4) {
                    const a = parseInt(hex.substring(0, 2), 16);
                    const b = parseInt(hex.substring(2, 4), 16);
                    if (!isNaN(a) && !isNaN(b)) {
                        useBluetoothStore.getState().setSensorData({ catalystTemp: Number((((a * 256) + b) / 10 - 40).toFixed(1)) });
                    }
                }
            } else if (command === '0142') {
                const hex = getHexData(command, clean, 2);
                if (hex && hex.length === 4) {
                    const a = parseInt(hex.substring(0, 2), 16);
                    const b = parseInt(hex.substring(2, 4), 16);
                    if (!isNaN(a) && !isNaN(b)) {
                        const volts = ((a * 256) + b) / 1000;
                        useBluetoothStore.getState().setSensorData({ voltage: volts.toFixed(2) + 'V' });
                    }
                }
            } else if (command === '01A6') {
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
            } else if (command === '0131') {
                const hex = getHexData(command, clean, 2);
                if (hex && hex.length === 4) {
                    const a = parseInt(hex.substring(0, 2), 16);
                    const b = parseInt(hex.substring(2, 4), 16);
                    if (!isNaN(a) && !isNaN(b)) {
                        useBluetoothStore.getState().setSensorData({ distanceSinceCleared: (a * 256) + b });
                    }
                }
            } else if (command === '0121') {
                const hex = getHexData(command, clean, 2);
                if (hex && hex.length === 4) {
                    const a = parseInt(hex.substring(0, 2), 16);
                    const b = parseInt(hex.substring(2, 4), 16);
                    if (!isNaN(a) && !isNaN(b)) {
                        useBluetoothStore.getState().setSensorData({ distanceMilOn: (a * 256) + b });
                    }
                }
            }
        }
    }

    private parseMode03Response(command: string, response: string) {
        let clean = response.replace(/SEARCHING\.*/gi, '');
        clean = clean.replace(/[\r\n]+/g, '');
        clean = clean.replace(/[0-9]+:/g, ''); // Remove frame indexes
        clean = clean.replace(/\s+/g, '');

        if (command === '03') {
            const startIndex = clean.indexOf('43');
            if (startIndex !== -1) {
                // '43' (1 byte) + DTC Count (1 byte = 2 hex chars) = toplam 4 hex char atla
                const payload = clean.substring(startIndex + 4);
                const dtcs: string[] = [];

                for (let i = 0; i < payload.length; i += 4) {
                    const codeHex = payload.substring(i, i + 4);
                    if (codeHex === '0000' || codeHex.length < 4) continue;

                    const firstCharHex = parseInt(codeHex[0], 16);
                    if (isNaN(firstCharHex)) continue;

                    // SAE J2012 High Nibble -> DTC Type Letter
                    let dtcType = '';
                    if (firstCharHex >= 0 && firstCharHex <= 3) dtcType = 'P';
                    else if (firstCharHex >= 4 && firstCharHex <= 7) dtcType = 'C';
                    else if (firstCharHex >= 8 && firstCharHex <= 11) dtcType = 'B';
                    else if (firstCharHex >= 12 && firstCharHex <= 15) dtcType = 'U';

                    const secondChar = (firstCharHex & 3).toString();
                    const remainingHex = codeHex.substring(1).toUpperCase();
                    dtcs.push(`${dtcType}${secondChar}${remainingHex}`);
                }
                useBluetoothStore.getState().setSensorData({ dtcs });
            }
        } else if (command === '04') {
            if (clean.includes('44') || clean.toUpperCase().includes('OK')) {
                useBluetoothStore.getState().setSensorData({ dtcs: [] });
            }
        }
    }

    private parseMode09Response(command: string, response: string) {
        let clean = response.replace(/SEARCHING\.*/gi, '');
        clean = clean.replace(/[\r\n]+/g, '');
        clean = clean.replace(/[0-9]+:/g, ''); // Remove frame indexes (0:, 1:, 2:)
        clean = clean.replace(/\s+/g, ''); // Saf hex dizilimi için boşlukları sil

        if (command === '0902') {
            // Global replace KULLANMA! indexOf ile ilk konumu bul, payload'u ondan sonra al.
            const startIndex = clean.indexOf('4902');
            if (startIndex === -1) return;
            // '4902' (4 hex char) atla, payload'u al
            const payload = clean.substring(startIndex + 4);
            
            let vinAscii = '';
            for (let i = 0; i < payload.length; i += 2) {
                const byteStr = payload.substring(i, i + 2);
                if (byteStr.length === 2) {
                    const charCode = parseInt(byteStr, 16);
                    if (!isNaN(charCode) && charCode >= 32 && charCode <= 126) {
                        const char = String.fromCharCode(charCode);
                        // Yazdırılabilir standart karakterleri (A-Z0-9) al
                        // Frame index byte'ları (01, 02 vb.) bu filtreden otomatik düşer
                        if (/[A-Z0-9]/.test(char)) {
                            vinAscii += char;
                        }
                    }
                }
            }

            const cleanVin = vinAscii.trim().substring(0, 17);
            if (cleanVin.length > 0) {
                useBluetoothStore.getState().setSensorData({ vin: cleanVin });
            }
        } else if (command === '0904') {
            // Global replace KULLANMA! indexOf ile ilk konumu bul.
            const startIndex = clean.indexOf('4904');
            if (startIndex === -1) return;
            const payload = clean.substring(startIndex + 4);

            let calIdAscii = '';
            for (let i = 0; i < payload.length; i += 2) {
                const byteStr = payload.substring(i, i + 2);
                if (byteStr.length === 2) {
                    const charCode = parseInt(byteStr, 16);
                    if (!isNaN(charCode) && charCode >= 32 && charCode <= 126) {
                        const char = String.fromCharCode(charCode);
                        if (/[A-Z0-9]/.test(char)) {
                            calIdAscii += char;
                        }
                    }
                }
            }
            const cleanCalId = calIdAscii.trim();
            if (cleanCalId) {
                useBluetoothStore.getState().setSensorData({ ecuId: cleanCalId });
            }
        }
    }

    /**
     * Parses the raw response based on the command using a Switch/If dispatcher.
     */
    private parseResponse(rawCommand: string, response: string) {
        console.log(`[OBD RAW] Cmd: ${rawCommand} -> Res: ${response.trim()}`);
        const command = rawCommand.replace(/\s+/g, '');
        
        if (command === 'ATI') {
            useBluetoothStore.getState().addLog(`ADAPTER_ID: ${response}`);
            if (response.toLowerCase().includes('v2.1')) {
                useBluetoothStore.getState().setIsCloneDevice(true);
                useBluetoothStore.getState().addLog('DETECTED: Clone/Low-Quality Adapter (v2.1)');
            }
            return;
        }

        let gentleClean = response.replace(/SEARCHING\.*/gi, '').replace(/[\r\n]+/g, ' ').trim();
        const upperClean = gentleClean.toUpperCase().replace(/\s+/g, '');
        
        const isErrorResponse = upperClean.includes('NODATA') 
            || upperClean.includes('ERROR') 
            || upperClean.includes('UNABLE')
            || upperClean.includes('CANERROR')
            || upperClean.includes('BUSERROR')
            || upperClean === '?'
            || upperClean.endsWith('?');

        if (isErrorResponse) {
            if (command.startsWith('01') && command !== '0100' && command !== '010C' && command !== '010D' && command !== '0142') {
                this.blacklist.add(command);
                useBluetoothStore.getState().addLog(`BLACKLIST: PID ${command} is unsupported and blacklisted.`);
            }
            if (command === '01A6' || command.startsWith('22')) {
                useBluetoothStore.getState().addLog(`ODO_FAIL: ${command} → ${gentleClean.substring(0, 20)}`);
            }
            return;
        }

        if (command.startsWith('01')) {
            this.parseMode01Response(command, response);
        } else if (command.startsWith('09')) {
            this.parseMode09Response(command, response);
        } else if (command.startsWith('03') || command === '04') {
            this.parseMode03Response(command, response);
        } else if (command === 'ATRV') {
            const voltMatch = response.match(/(\d+\.?\d*)V?/i);
            if (voltMatch) {
                useBluetoothStore.getState().setSensorData({ voltage: voltMatch[1] + 'V' });
            }
        }
    }

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
