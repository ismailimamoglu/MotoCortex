import { CodingTransactionManager, UDS_NRC_DICTIONARY } from '../CodingTransactionManager';

describe('CodingTransactionManager Snapshot & Rollback Tests', () => {
    let txManager: CodingTransactionManager;

    beforeEach(() => {
        txManager = CodingTransactionManager.instance();
        txManager.reset();
    });

    test('1. Initializes transaction with pre-write snapshot', () => {
        const tx = txManager.startTransaction('needle_sweep', '17', '0B20', '00', '01');
        expect(tx.featureId).toBe('needle_sweep');
        expect(tx.originalBytesHex).toBe('00');
        expect(tx.targetBytesHex).toBe('01');
        expect(tx.status).toBe('PENDING');
        expect(txManager.getActiveTransaction()).not.toBeNull();
    });

    test('2. Parses UDS Negative Response Codes (NRC) correctly', () => {
        const nrc22 = txManager.parseNrcResponse('7F 2E 22');
        expect(nrc22.isNrc).toBe(true);
        expect(nrc22.nrcCode).toBe('22');
        expect(nrc22.nrcDesc).toContain('Conditions Not Correct');

        const nrc35 = txManager.parseNrcResponse('7F2E35');
        expect(nrc35.isNrc).toBe(true);
        expect(nrc35.nrcCode).toBe('35');
        expect(nrc35.nrcDesc).toBe('Invalid Key');

        const successRes = txManager.parseNrcResponse('6E 0B 20');
        expect(successRes.isNrc).toBe(false);
    });

    test('3. Commits transaction cleanly', () => {
        txManager.startTransaction('needle_sweep', '17', '0B20', '00', '01');
        txManager.commit();
        expect(txManager.getActiveTransaction()).toBeNull();
    });

    test('4. Executes automated rollback to original bytes on failure', async () => {
        txManager.startTransaction('needle_sweep', '17', '0B20', '00', '01');

        let sentCommand = '';
        const mockSend = async (cmd: string) => {
            sentCommand = cmd;
            return '6E0B20'; // positive response for write
        };

        const rollbackSuccess = await txManager.rollback(mockSend);
        expect(rollbackSuccess).toBe(true);
        expect(sentCommand).toBe('2E0B2000');
        expect(txManager.getActiveTransaction()).toBeNull();
    });

    test('5. Handles rollback failure if ECU rejects rollback command', async () => {
        txManager.startTransaction('needle_sweep', '17', '0B20', '00', '01');

        const mockSendReject = async () => {
            return '7F 2E 22';
        };

        const rollbackSuccess = await txManager.rollback(mockSendReject);
        expect(rollbackSuccess).toBe(false);
    });
});
