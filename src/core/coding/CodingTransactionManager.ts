export interface CodingTransaction {
    id: string;
    featureId: string;
    targetEcuHeader: string;
    didHex: string;
    originalBytesHex: string;
    targetBytesHex: string;
    timestamp: number;
    steps: Array<{ step: string; timestamp: number; payload?: string }>;
    status: 'PENDING' | 'COMMITTED' | 'FAILED' | 'ROLLED_BACK';
}

export const UDS_NRC_DICTIONARY: Record<string, string> = {
    '10': 'General Reject',
    '11': 'Service Not Supported',
    '12': 'SubFunction Not Supported',
    '13': 'Incorrect Message Length Or Invalid Format',
    '22': 'Conditions Not Correct (Ignition/Engine interlock)',
    '31': 'Request Out Of Range',
    '33': 'Security Access Denied',
    '35': 'Invalid Key',
    '36': 'Exceed Number Of Attempts',
    '37': 'Required Time Delay Not Expired',
    '72': 'General Programming Failure',
    '78': 'Response Pending',
};

export class CodingTransactionManager {
    private static _instance: CodingTransactionManager;
    private activeTransaction: CodingTransaction | null = null;

    private constructor() {}

    public static instance(): CodingTransactionManager {
        if (!CodingTransactionManager._instance) {
            CodingTransactionManager._instance = new CodingTransactionManager();
        }
        return CodingTransactionManager._instance;
    }

    public startTransaction(
        featureId: string,
        targetEcuHeader: string,
        didHex: string,
        originalBytesHex: string,
        targetBytesHex: string
    ): CodingTransaction {
        const tx: CodingTransaction = {
            id: `TX_${Date.now()}_${featureId}`,
            featureId,
            targetEcuHeader,
            didHex,
            originalBytesHex,
            targetBytesHex,
            timestamp: Date.now(),
            steps: [{ step: 'TRANSACTION_INITIALIZED', timestamp: Date.now() }],
            status: 'PENDING'
        };

        this.activeTransaction = tx;
        return tx;
    }

    public recordStep(step: string, payload?: string): void {
        if (this.activeTransaction) {
            this.activeTransaction.steps.push({
                step,
                timestamp: Date.now(),
                payload
            });
        }
    }

    public parseNrcResponse(rawHex: string): { isNrc: boolean; nrcCode?: string; nrcDesc?: string } {
        const clean = rawHex.replace(/\s+/g, '').toUpperCase();
        const nrcMatch = clean.match(/7F([0-9A-F]{2})([0-9A-F]{2})/);
        if (nrcMatch) {
            const nrcCode = nrcMatch[2];
            const nrcDesc = UDS_NRC_DICTIONARY[nrcCode] || `Unknown NRC 0x${nrcCode}`;
            return { isNrc: true, nrcCode, nrcDesc };
        }
        return { isNrc: false };
    }

    public commit(): void {
        if (this.activeTransaction) {
            this.activeTransaction.status = 'COMMITTED';
            this.recordStep('TRANSACTION_COMMITTED');
            this.activeTransaction = null;
        }
    }

    public async rollback(
        sendFn: (cmd: string) => Promise<string | undefined>
    ): Promise<boolean> {
        if (!this.activeTransaction) {
            return false;
        }

        const tx = this.activeTransaction;
        this.recordStep('ROLLBACK_STARTED');

        try {
            if (tx.originalBytesHex && tx.didHex) {
                // Write back original DID payload
                const rollbackCmd = `2E${tx.didHex}${tx.originalBytesHex}`;
                const res = await sendFn(rollbackCmd);
                const nrcCheck = res ? this.parseNrcResponse(res) : { isNrc: false };
                
                if (nrcCheck.isNrc) {
                    this.recordStep(`ROLLBACK_FAILED_NRC: ${nrcCheck.nrcDesc}`);
                    tx.status = 'FAILED';
                    return false;
                }

                this.recordStep('ROLLBACK_SUCCEEDED');
                tx.status = 'ROLLED_BACK';
                this.activeTransaction = null;
                return true;
            }
            tx.status = 'FAILED';
            return false;
        } catch (error) {
            this.recordStep(`ROLLBACK_EXCEPTION: ${error instanceof Error ? error.message : String(error)}`);
            tx.status = 'FAILED';
            return false;
        }
    }

    public getActiveTransaction(): Readonly<CodingTransaction | null> {
        return this.activeTransaction;
    }

    public reset(): void {
        this.activeTransaction = null;
    }
}

export const codingTransactionManager = CodingTransactionManager.instance();
export default codingTransactionManager;
