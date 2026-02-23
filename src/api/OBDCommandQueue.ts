import BluetoothService from './BluetoothService';
import { useBluetoothStore } from '../store/useBluetoothStore';
import { OEM_COMMANDS } from './commands';

interface QueueItem {
    command: string;
    resolve: (value: string) => void;
    reject: (reason?: any) => void;
}

class OBDCommandQueue {
    private queue: QueueItem[] = [];
    private isProcessing = false;
    private currentBuffer = '';
    private currentCommandTimeout: NodeJS.Timeout | null = null;
    private readonly TIMEOUT_MS = 10000;

    constructor() {
        // Subscribe to Bluetooth data globally
        BluetoothService.onDataReceived((data) => this.handleData(data));
    }

    /**
     * Enqueues a command.
     * @param command The AT/OBD command (e.g., "010C").
     */
    add(command: string): Promise<string> {
        return new Promise((resolve, reject) => {
            this.queue.push({ command, resolve, reject });
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

        try {
            this.currentCommandTimeout = setTimeout(() => {
                const errMsg = `Timeout: ${item.command}`;
                useBluetoothStore.getState().addLog(`ERR: ${errMsg}`);
                this.finishCommand(new Error(errMsg));
            }, this.TIMEOUT_MS);

            // Send command (CR is appended in BluetoothService)
            useBluetoothStore.getState().addLog(`TX: ${item.command}`);
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

        this.currentBuffer += chunk;

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

        // Check for error responses
        const isErrorResponse = clean.includes('NODATA') || clean.includes('ERROR') || clean.includes('?');
        if (isErrorResponse) {
            if (command === '01A6' || command === OEM_COMMANDS.HONDA_ODOMETER || command === OEM_COMMANDS.YAMAHA_ODOMETER) {
                useBluetoothStore.getState().setSensorData({ odometer: 'UNSUPPORTED' });
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
                const a = parseInt(hex, 16);
                if (!isNaN(a)) {
                    useBluetoothStore.getState().setSensorData({ speed: a });
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
        // ODOMETER (01A6) - 4 bytes
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
        // OEM ODOMETER (Honda / Yamaha deep scan)
        else if (command === OEM_COMMANDS.HONDA_ODOMETER || command === OEM_COMMANDS.YAMAHA_ODOMETER) {
            // Mode 22 positive response is 62 + PID. 
            // e.g., 22 11 02 -> 62 11 02 XX XX XX
            const mode = command.substring(0, 2);
            const pid = command.substring(2).replace(/\s+/g, ''); // "1102"
            const echo = (parseInt(mode) + 40).toString() + pid; // "621102"

            if (clean.includes(echo)) {
                const parts = clean.split(echo);
                if (parts.length > 1) {
                    // For Honda/Yamaha, Odometer is often 3 bytes (XX XX XX) after the echo
                    const hexPart = parts[1].substring(0, 6);
                    if (hexPart.length === 6) {
                        const a = parseInt(hexPart.substring(0, 2), 16);
                        const b = parseInt(hexPart.substring(2, 4), 16);
                        const c = parseInt(hexPart.substring(4, 6), 16);
                        if (!isNaN(a) && !isNaN(b) && !isNaN(c)) {
                            // Example decoding: some use (A*65536 + B*256 + C) / 10
                            // Let's use standard direct metric parsing for now:
                            const km = (a * 65536 + b * 256 + c) / 10;
                            useBluetoothStore.getState().setSensorData({ odometer: Math.round(km) });
                        }
                    }
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
                item.reject(error);
            } else {
                useBluetoothStore.getState().addLog(`RX: ${result}`);

                // Parse the response
                if (result) {
                    this.parseResponse(item.command, result);
                }

                item.resolve(result || '');
            }
        }

        this.isProcessing = false;

        // Process next item after small delay
        setTimeout(() => this.processNext(), 20);
    }

    clear() {
        this.queue = [];
        this.isProcessing = false;
        this.currentBuffer = '';
    }
}

export default new OBDCommandQueue();
