export interface SessionLogEntry {
    timestamp: number;
    type: 'TX' | 'RX' | 'ERR' | 'SYS';
    command: string;
    payload: string;
    rtt?: number;
}

let recorderInstance: DiagnosticSessionRecorder | null = null;

export class DiagnosticSessionRecorder {
    private logs: SessionLogEntry[];
    private readonly MAX_LOGS: number;

    constructor() {
        this.logs = [];
        this.MAX_LOGS = 1000;
    }

    public static getInstance(): DiagnosticSessionRecorder {
        if (!recorderInstance) {
            recorderInstance = new DiagnosticSessionRecorder();
        }
        return recorderInstance;
    }

    public recordTx(command: string): void {
        this.addEntry({
            timestamp: Date.now(),
            type: 'TX',
            command,
            payload: ""
        });
    }

    public recordRx(command: string, payload: string, rtt: number): void {
        this.addEntry({
            timestamp: Date.now(),
            type: 'RX',
            command,
            payload,
            rtt
        });
    }

    public recordErr(command: string, errorMsg: string): void {
        this.addEntry({
            timestamp: Date.now(),
            type: 'ERR',
            command,
            payload: errorMsg
        });
    }

    public recordSys(message: string): void {
        this.addEntry({
            timestamp: Date.now(),
            type: 'SYS',
            command: "SYSTEM",
            payload: message
        });
    }

    private addEntry(entry: SessionLogEntry): void {
        this.logs.push(entry);
        if (this.logs.length > this.MAX_LOGS) {
            this.logs.shift(); // Keep buffer capped
        }
    }

    public getLogs(): SessionLogEntry[] {
        return [...this.logs];
    }

    public clear(): void {
        this.logs = [];
        this.recordSys("Session logs cleared.");
    }

    public exportLogsJSON(): string {
        return JSON.stringify(this.logs, null, 2);
    }
}
export default DiagnosticSessionRecorder.getInstance();
