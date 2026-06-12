import BluetoothService from './BluetoothService';
import { useBluetoothStore } from '../store/useBluetoothStore';
import * as Logger from '../services/Logger';

/**
 * Event-loop friendly high-precision sleep helper.
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
                    setTimeout(check, remaining - 4);
                } else if (typeof setImmediate !== 'undefined') {
                    setImmediate(check);
                } else {
                    setTimeout(check, 1);
                }
            }
        };
        check();
    });
}

class OBDCommandQueue {
    private queueChain: Promise<void> = Promise.resolve();
    private rawResponseBuffer = '';
    private blacklist: Set<string> = new Set();
    private currentSessionId = 0;
    
    // Silence detection timeout
    private silenceTimeout: any = null;

    // Active command tracking
    private activeResolver: ((value: string) => void) | null = null;
    private activeRejecter: ((reason: any) => void) | null = null;
    private activeSessionId = 0;
    private activeCommand = '';
    private commandStartTimestamp = 0;
    private commandTimeoutTimer: any = null;
    
    private readonly DEFAULT_TIMEOUT_MS = 2000;
    private clearListeners: (() => void)[] = [];

    constructor() {
        BluetoothService.onDataReceived((data: string) => this.handleData(data));
    }

    onClear(callback: () => void) {
        this.clearListeners.push(callback);
    }

    removeClearListener(callback: () => void) {
        this.clearListeners = this.clearListeners.filter(cb => cb !== callback);
    }

    add(command: string, timeoutMs?: number): Promise<string> {
        const commandSessionId = this.currentSessionId;
        return new Promise<string>((resolve, reject) => {
            // Queue execution inside the isolated sequential mutex chain
            this.queueChain = this.queueChain
                .then(() => {
                    if (commandSessionId !== this.currentSessionId) {
                        throw new Error('SESSION_CANCELLED');
                    }
                    return this.executeCommand(command, timeoutMs);
                })
                .then(
                    (result) => resolve(result),
                    (err) => {
                        reject(err);
                    }
                );
        });
    }

    private executeCommand(command: string, timeoutMs?: number): Promise<string> {
        this.activeSessionId = this.currentSessionId;
        return new Promise<string>((resolve, reject) => {
            if (this.currentSessionId !== this.activeSessionId) {
                reject(new Error('SESSION_CANCELLED'));
                return;
            }

            this.activeResolver = resolve;
            this.activeRejecter = reject;
            this.activeCommand = command;
            this.rawResponseBuffer = '';
            this.commandStartTimestamp = Date.now();

            const actualTimeoutMs = timeoutMs ?? this.DEFAULT_TIMEOUT_MS;
            const store = useBluetoothStore.getState();

            store.addDiagnosticLog(`TX: ${command}`);
            store.updateTelemetryStats({
                requestsSent: store.telemetryStats.requestsSent + 1
            });
            store.addLog(`TRANSPORT_BUSY_ON: command=${command}`);
            store.addLog(`TX: ${command}`);
            Logger.log('OBD_WRITE', command);

            // 1. Setup absolute timeout timer
            this.commandTimeoutTimer = setTimeout(() => {
                const errMsg = `Timeout: ${command}`;
                store.addLog(`ERR: ${errMsg}`);
                Logger.log('OBD_TIMEOUT', `Timeout sending command: ${command}`);
                this.finishCommand(new Error(errMsg));
            }, actualTimeoutMs);

            // 2. Setup initial silence detection timeout
            if (this.silenceTimeout) {
                clearTimeout(this.silenceTimeout);
            }
            this.silenceTimeout = setTimeout(() => {
                if (this.rawResponseBuffer.length > 0) {
                    this.completeCommandFlow();
                }
            }, 50);

            // 3. Write command to transport layer
            BluetoothService.write(command).catch(err => {
                this.finishCommand(err);
            });
        }).then(async (result) => {
            const guardTime = useBluetoothStore.getState().guardTime;
            await preciseSleep(guardTime);
            return result;
        }).catch(async (err) => {
            const guardTime = useBluetoothStore.getState().guardTime;
            await preciseSleep(guardTime);
            throw err;
        });
    }

    private handleData(chunk: string) {
        if (!this.activeResolver) return;

        if (this.silenceTimeout) {
            clearTimeout(this.silenceTimeout);
        }

        Logger.log('OBD_READ_CHUNK', chunk);
        this.rawResponseBuffer += chunk;

        if (this.rawResponseBuffer.length > 4096) {
            this.rawResponseBuffer = '';
            useBluetoothStore.getState().addLog('ERR: Buffer Overflow (Dropped)');
            this.finishCommand(new Error('BUFFER_OVERFLOW'));
            return;
        }

        const trimmed = this.rawResponseBuffer.trim();
        if (trimmed.endsWith('>')) {
            this.completeCommandFlow();
        } else {
            // Debounce silence detector: reschedule timeout if prompt character is not received
            this.silenceTimeout = setTimeout(() => {
                if (this.rawResponseBuffer.length > 0) {
                    this.completeCommandFlow();
                }
            }, 50);
        }
    }

    private completeCommandFlow() {
        if (this.silenceTimeout) {
            clearTimeout(this.silenceTimeout);
            this.silenceTimeout = null;
        }

        const rawResponse = this.rawResponseBuffer.trim();
        let cleanResponse = rawResponse;

        if (cleanResponse.endsWith('>')) {
            cleanResponse = cleanResponse.substring(0, cleanResponse.length - 1).trim();
        }

        // Token-Based structural deduplication (replaces blind regex calls)
        const uniqueTokens = this.structuralDeduplicate(cleanResponse);

        // Lightweight multi-frame ISO-TP parser
        const decoded = this.isoTpDecoder(uniqueTokens, this.activeCommand);

        this.finishCommand(null, decoded);
    }

    private structuralDeduplicate(rawResponse: string): string[] {
        const lines = rawResponse.split(/[\r\n]+/);
        const uniqueLines: string[] = [];
        for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed) continue;
            // Discard consecutive duplicates
            if (uniqueLines.length > 0 && uniqueLines[uniqueLines.length - 1] === trimmed) {
                continue; 
            }
            uniqueLines.push(trimmed);
        }
        return uniqueLines;
    }

    private transportDecoder(rawResponse: string, command: string): string[] {
        const lines = rawResponse.split(/[\r\n]+/);
        const filteredLines: string[] = [];
        const cmdClean = command.replace(/\s+/g, '').toUpperCase();

        for (let line of lines) {
            const trimmed = line.trim();
            if (!trimmed) continue;

            const upper = trimmed.toUpperCase().replace(/\s+/g, '');
            if (upper === cmdClean) {
                continue;
            }

            if (
                upper.includes('SEARCHING') ||
                upper.includes('BUSINIT') ||
                upper.includes('STOPPED') ||
                upper.includes('?')
            ) {
                continue;
            }

            filteredLines.push(trimmed);
        }

        return filteredLines;
    }

    private isoTpDecoder(lines: string[], command: string): string {
        const processedLines: string[] = [];
        const cmdClean = command.replace(/\s+/g, '').toUpperCase();

        for (let line of lines) {
            let cleanLine = line.trim();
            if (!cleanLine) continue;

            const upperVal = cleanLine.toUpperCase().replace(/\s+/g, '');
            if (upperVal === cmdClean || upperVal.includes('SEARCHING') || upperVal.includes('BUSINIT')) {
                continue;
            }

            const hasSpaces = cleanLine.includes(' ');
            if (hasSpaces) {
                const tokens = cleanLine.split(/\s+/);
                
                // 1. Filter and Strip CAN Header if present
                if (tokens.length > 0) {
                    const first = tokens[0].toUpperCase();
                    if (/^(7E[8-9A-F]|18DAF1[0-9A-F]{2})$/.test(first)) {
                        // STRICT Engine ECU Filter: If it is not Engine (7E8 / 18DAF110), discard the line!
                        if (first !== '7E8' && first !== '18DAF110') {
                            continue; 
                        }
                        tokens.shift();
                    }
                }
                
                // 2. Strip frame index prefixes
                if (tokens.length > 0) {
                    const first = tokens[0].toUpperCase();
                    if (/^\d+:$/.test(first)) {
                        tokens.shift();
                    }
                }
                
                // 3. Strip ISO-TP protocol control bytes
                if (tokens.length > 0) {
                    const pci = tokens[0].toUpperCase();
                    if (pci === '10' && tokens.length > 1) {
                        tokens.shift(); // remove 10
                        tokens.shift(); // remove length byte
                    } else if (/^2[0-9A-F]$/.test(pci)) {
                        tokens.shift(); // remove 2X
                    } else if (/^0[1-7]$/.test(pci)) {
                        tokens.shift(); // remove 0X
                    }
                }
                
                cleanLine = tokens.join(' ');
            } else {
                let upperLine = cleanLine.toUpperCase();
                
                // 1. Filter and Strip CAN Header if present (compact format)
                if (upperLine.startsWith('7E8')) {
                    cleanLine = cleanLine.substring(3);
                    upperLine = upperLine.substring(3);
                } else if (upperLine.startsWith('7E9') || upperLine.startsWith('7EA') || upperLine.startsWith('7EB') || upperLine.startsWith('7EC') || upperLine.startsWith('7ED') || upperLine.startsWith('7EE') || upperLine.startsWith('7EF')) {
                    continue; // Skip non-engine headers
                } else if (upperLine.startsWith('18DAF110')) {
                    cleanLine = cleanLine.substring(8);
                    upperLine = upperLine.substring(8);
                } else if (upperLine.startsWith('18DAF1')) {
                    continue; // Skip non-engine 29-bit CAN headers
                }

                // 2. Strip frame index prefixes
                const frameNumMatch = upperLine.match(/^(\d+:)/);
                if (frameNumMatch) {
                    const len = frameNumMatch[1].length;
                    cleanLine = cleanLine.substring(len);
                    upperLine = upperLine.substring(len);
                }

                // 3. Strip ISO-TP protocol control bytes
                if (upperLine.startsWith('10') && upperLine.length >= 4) {
                    cleanLine = cleanLine.substring(4);
                } else if (/^2[0-9A-F]/.test(upperLine)) {
                    cleanLine = cleanLine.substring(2);
                } else if (/^0[1-7]/.test(upperLine)) {
                    cleanLine = cleanLine.substring(2);
                }
            }
            
            processedLines.push(cleanLine.trim());
        }
        
        return processedLines.join(' ');
    }

    private parseMode01Response(response: string) {
        const mode01Match = response.replace(/SEARCHING\.*/gi, '').replace(/\s+/g, '').match(/41([0-9A-F]+)/i);
        if (!mode01Match) return; 

        const payload = mode01Match[1].toUpperCase();
        const parsedPids = new Set<string>();

        const getPidByteLength = (p: string): number => {
            const up = p.toUpperCase();
            if (up === '0C' || up === '10' || up === '3C' || up === '42') return 2;
            if (up === 'A6') return 4;
            return 1; 
        };

        const parseAndSetPid = (p: string, hex: string) => {
            if (parsedPids.has(p)) return;
            parsedPids.add(p);
            if (!hex || hex.length < 2) return;
            const a = parseInt(hex.substring(0, 2), 16);
            let b = 0, c = 0, d = 0;

            if (hex.length >= 4) b = parseInt(hex.substring(2, 4), 16);
            if (hex.length >= 6) c = parseInt(hex.substring(4, 6), 16);
            if (hex.length >= 8) d = parseInt(hex.substring(6, 8), 16);

            switch (p) {
                case '0C': // RPM
                    if (!isNaN(a) && !isNaN(b)) useBluetoothStore.getState().setRpm(Math.round(((a * 256) + b) / 4));
                    break;
                case '0D': // Speed
                    if (!isNaN(a)) useBluetoothStore.getState().setSensorData({ speed: a });
                    break;
                case '05': // Coolant
                    if (!isNaN(a)) useBluetoothStore.getState().setSensorData({ coolant: a - 40 });
                    break;
                case '11': // Throttle
                case '49':
                    if (!isNaN(a)) useBluetoothStore.getState().setSensorData({ throttle: Math.round((a * 100) / 255) });
                    break;
                case '04': // Engine Load
                    if (!isNaN(a)) useBluetoothStore.getState().setSensorData({ engineLoad: Math.round((a * 100) / 255) });
                    break;
                case '2F': // Fuel Level
                    if (!isNaN(a)) useBluetoothStore.getState().setSensorData({ fuelLevel: Math.round((a * 100) / 255) });
                    break;
                case '0F': // Intake Temp
                    if (!isNaN(a)) useBluetoothStore.getState().setSensorData({ intakeAirTemp: a - 40 });
                    break;
                case '46': // Ambient Temp
                    if (!isNaN(a)) useBluetoothStore.getState().setSensorData({ ambientTemp: a - 40 });
                    break;
                case '5C': // Oil Temp
                    if (!isNaN(a)) useBluetoothStore.getState().setSensorData({ oilTemp: a - 40 });
                    break;
                case '0B': // Manifold Pressure
                    if (!isNaN(a)) useBluetoothStore.getState().setSensorData({ manifoldPressure: a });
                    break;
                case '10': // MAF
                    if (!isNaN(a) && !isNaN(b)) useBluetoothStore.getState().setSensorData({ mafFlow: Number((((a * 256) + b) / 100).toFixed(2)) });
                    break;
                case '0E': // Timing Advance
                    if (!isNaN(a)) useBluetoothStore.getState().setSensorData({ timingAdvance: Number((a / 2 - 64).toFixed(1)) });
                    break;
                case '3C': // Catalyst Temp
                    if (!isNaN(a) && !isNaN(b)) useBluetoothStore.getState().setSensorData({ catalystTemp: Number((((a * 256) + b) / 10 - 40).toFixed(1)) });
                    break;
                case '42': // Voltage
                    if (!isNaN(a) && !isNaN(b)) useBluetoothStore.getState().setSensorData({ voltage: (((a * 256) + b) / 1000).toFixed(2) + 'V' });
                    break;
                case 'A6': // Odometer
                    if (!isNaN(a) && !isNaN(b) && !isNaN(c) && !isNaN(d)) {
                        useBluetoothStore.getState().setSensorData({ odometer: Math.round(((a * 16777216) + (b * 65536) + (c * 256) + d) / 10) });
                    }
                    break;
                case '31': // Distance Since Cleared
                    if (!isNaN(a) && !isNaN(b)) useBluetoothStore.getState().setSensorData({ distanceSinceCleared: (a * 256) + b });
                    break;
                case '21': // Distance MIL on
                    if (!isNaN(a) && !isNaN(b)) useBluetoothStore.getState().setSensorData({ distanceMilOn: (a * 256) + b });
                    break;
            }
        };

        let currentPos = 0;
        while (currentPos < payload.length - 1) { 
            const pidInResponse = payload.substring(currentPos, currentPos + 2);
            const bytes = getPidByteLength(pidInResponse);
            const dataStart = currentPos + 2;
            const dataEnd = dataStart + (bytes * 2);

            if (dataEnd <= payload.length) {
                const hexVal = payload.substring(dataStart, dataEnd);
                parseAndSetPid(pidInResponse, hexVal);
                currentPos = dataEnd; 
            } else {
                break; 
            }
        }
    }

    private parseMode03Response(command: string, response: string) {
        if (command === '03') {
            const lines = response.split(/[\r\n]+/);
            const dtcs: string[] = [];

            for (const line of lines) {
                let clean = line.replace(/SEARCHING\.*/gi, '').replace(/[0-9]+:/g, '').replace(/\s+/g, '').toUpperCase();
                if (clean.startsWith('7E8') || clean.startsWith('7E9')) {
                    clean = clean.substring(3);
                }
                const startIndex = clean.indexOf('43');
                if (startIndex !== -1) {
                    let payload = clean.substring(startIndex + 2); // Strip Mode 03 header '43'
                    
                    if (payload.length >= 2) {
                        const countByte = parseInt(payload.substring(0, 2), 16);
                        // If count byte * 4 is less than or equal to the remaining string length, it represents count (CAN-bus)
                        if (!isNaN(countByte) && countByte > 0 && countByte * 4 <= payload.length - 2) {
                            payload = payload.substring(2); // Skip count byte
                        }
                    }

                    for (let i = 0; i < payload.length; i += 4) {
                        const codeHex = payload.substring(i, i + 4);
                        if (codeHex === '0000' || codeHex.length < 4) continue;
                        const firstCharHex = parseInt(codeHex[0], 16);
                        if (isNaN(firstCharHex)) continue;

                        let dtcType = '';
                        if (firstCharHex >= 0 && firstCharHex <= 3) dtcType = 'P';
                        else if (firstCharHex >= 4 && firstCharHex <= 7) dtcType = 'C';
                        else if (firstCharHex >= 8 && firstCharHex <= 11) dtcType = 'B';
                        else if (firstCharHex >= 12 && firstCharHex <= 15) dtcType = 'U';

                        const secondChar = (firstCharHex & 3).toString();
                        const remainingHex = codeHex.substring(1).toUpperCase();
                        dtcs.push(`${dtcType}${secondChar}${remainingHex}`);
                    }
                }
            }
            // Deduplicate the scanned codes
            const uniqueDtcs = Array.from(new Set(dtcs));
            useBluetoothStore.getState().setSensorData({ dtcs: uniqueDtcs });
        } else if (command === '04') {
            let clean = response.replace(/SEARCHING\.*/gi, '').replace(/[\r\n]+/g, '').replace(/\s+/g, '').toUpperCase();
            if (clean.includes('44') || clean.toUpperCase().includes('OK')) {
                useBluetoothStore.getState().setSensorData({ dtcs: [] });
            }
        }
    }

    private parseMode09Response(command: string, response: string) {
        let clean = response.replace(/SEARCHING\.*/gi, '').replace(/[\r\n]+/g, '').replace(/[0-9]+:/g, '').replace(/\s+/g, '');

        if (command === '0902') {
            const startIndex = clean.indexOf('4902');
            if (startIndex === -1) return;
            const payload = clean.substring(startIndex + 4);

            let vinAscii = '';
            for (let i = 0; i < payload.length; i += 2) {
                const byteStr = payload.substring(i, i + 2);
                if (byteStr.length === 2) {
                    const charCode = parseInt(byteStr, 16);
                    if (!isNaN(charCode) && charCode >= 32 && charCode <= 126) {
                        const char = String.fromCharCode(charCode);
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
            }
            if (command === '01A6') {
                useBluetoothStore.getState().setSensorData({ odometer: 'UNSUPPORTED' });
            }
            return;
        }

        useBluetoothStore.getState().setSensorData({ lastSuccessfulResponseAt: Date.now() });

        if (command.startsWith('01')) {
            this.parseMode01Response(response);
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
        useBluetoothStore.getState().addLog(`TRANSPORT_BUSY_OFF: command=${this.activeCommand || 'none'}`);
        if (this.commandTimeoutTimer) {
            clearTimeout(this.commandTimeoutTimer);
            this.commandTimeoutTimer = null;
        }

        if (this.silenceTimeout) {
            clearTimeout(this.silenceTimeout);
            this.silenceTimeout = null;
        }

        const resolver = this.activeResolver;
        const rejecter = this.activeRejecter;
        const cmd = this.activeCommand;
        const activeSess = this.activeSessionId;

        this.activeResolver = null;
        this.activeRejecter = null;

        const store = useBluetoothStore.getState();

        if (resolver && rejecter) {
            if (activeSess !== this.currentSessionId) {
                rejecter(new Error('SESSION_CANCELLED'));
            } else if (error) {
                const isTimeout = error.message && error.message.includes('Timeout');
                store.addDiagnosticLog(`ERR: ${cmd} - ${error.message || error}`);
                if (isTimeout) {
                    store.updateTelemetryStats({
                        timeoutCount: store.telemetryStats.timeoutCount + 1,
                        lastError: error.message
                    });
                } else {
                    store.updateTelemetryStats({
                        lastError: error.message || String(error)
                    });
                }
                Logger.log('OBD_ERROR', `Cmd: ${cmd} - Error: ${error.message || error}`);
                rejecter(error);
            } else {
                store.addDiagnosticLog(`RX: ${cmd} -> ${result}`);
                useBluetoothStore.getState().addLog(`RX: ${result}`);
                Logger.log('OBD_READ_RESPONSE', `Cmd: ${cmd} - Resp: ${result}`);

                if (result) {
                    const cleanCompact = result.replace(/\s+/g, '').toUpperCase();
                    if (/^(41|42|43|47|49)/.test(cleanCompact)) {
                        store.setSensorData({
                            lastSuccessfulResponseAt: Date.now(),
                            connectionState: 'TELEMETRY_ACTIVE'
                        });
                    }
                    this.parseResponse(cmd, result);
                }

                const elapsed = Date.now() - this.commandStartTimestamp;
                const oldStats = store.telemetryStats;
                const newReceived = oldStats.responsesReceived + 1;
                const newAvg = Math.round(((oldStats.avgResponseTime * oldStats.responsesReceived) + elapsed) / newReceived);

                store.updateTelemetryStats({
                    responsesReceived: newReceived,
                    avgResponseTime: newAvg
                });

                store.resetRecoveryAttempts();
                resolver(result || '');
            }
        }
    }

    clear(error: Error = new Error('CONNECTION_LOST')) {
        useBluetoothStore.getState().addLog(`QUEUE_CLEAR: reason=${error.message || String(error)}`);
        this.currentSessionId++;
        
        if (this.commandTimeoutTimer) {
            clearTimeout(this.commandTimeoutTimer);
            this.commandTimeoutTimer = null;
        }

        if (this.silenceTimeout) {
            clearTimeout(this.silenceTimeout);
            this.silenceTimeout = null;
        }

        const rejecter = this.activeRejecter;
        this.activeResolver = null;
        this.activeRejecter = null;

        if (rejecter) {
            try { rejecter(error); } catch {}
        }

        this.queueChain = Promise.resolve();
        this.rawResponseBuffer = '';
        
        // Auto-retry/clear action: flush hardware byte leftovers
        BluetoothService.write('\r').catch(err => {
            useBluetoothStore.getState().addLog(`ERR: Hardware flush write fail: ${err.message || String(err)}`);
        });

        this.clearListeners.forEach(cb => {
            try { cb(); } catch {}
        });
    }
}

export default new OBDCommandQueue();