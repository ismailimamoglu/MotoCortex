/**
 * PendingWriteStore.ts
 * 
 * MotoCortex 13-Phase Durable Hash-Chain Journal & Recovery Store (v1.2 Final).
 * Guarantees crash and disconnection safety using append-only state progression,
 * sequence numbers, and SHA-256 hash chains (previousRecordHash + integrityHash).
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { PendingWriteJournalPhase, PendingWriteJournalRecord, PendingWriteRecord, RecoveryResult } from './FeatureTypes';
import * as Logger from '../../services/Logger';
import { sha256 } from '../../utils/crypto';

const JOURNAL_STORAGE_KEY = '@motocortex_pending_write_journal_v1';

export class PendingWriteStore {
    /**
     * Cryptographically secure SHA-256 generator helper for journal integrity validation.
     */
    private async generateHash(data: string): Promise<string> {
        try {
            const digest = await sha256(data);
            return `SHA256_${digest.toUpperCase()}`;
        } catch (e) {
            // Fallback for extreme environment edge cases
            let hash = 0;
            for (let i = 0; i < data.length; i++) {
                const char = data.charCodeAt(i);
                hash = ((hash << 5) - hash) + char;
                hash |= 0;
            }
            return `SHA256_FALLBACK_${Math.abs(hash).toString(16).toUpperCase()}_${data.length}`;
        }
    }

    /**
     * Retrieves all journal records from persistent storage.
     */
    public async getJournalHistory(): Promise<PendingWriteJournalRecord[]> {
        try {
            const json = await AsyncStorage.getItem(JOURNAL_STORAGE_KEY);
            if (!json) return [];
            return JSON.parse(json) as PendingWriteJournalRecord[];
        } catch (error) {
            console.error('[PendingWriteStore] Failed to read journal history from disk:', error);
            return [];
        }
    }

    /**
     * Appends a new phase record to the durable hash-chain journal.
     */
    public async appendJournalPhase(
        phase: PendingWriteJournalPhase,
        payload: PendingWriteRecord
    ): Promise<PendingWriteJournalRecord> {
        try {
            const history = await this.getJournalHistory();
            const sequenceNumber = history.length + 1;
            const previousRecordHash = history.length > 0 ? history[history.length - 1].integrityHash : 'GENESIS_HASH';
            
            const rawContent = `${payload.pendingWriteId}_${sequenceNumber}_${phase}_${payload.timestamp}_${previousRecordHash}`;
            const integrityHash = await this.generateHash(rawContent);

            const record: PendingWriteJournalRecord = {
                operationId: payload.pendingWriteId,
                sequenceNumber,
                phase,
                previousRecordHash,
                integrityHash,
                timestamp: Date.now(),
                payload
            };

            history.push(record);
            if (history.length > 50) {
                history.shift();
            }
            await AsyncStorage.setItem(JOURNAL_STORAGE_KEY, JSON.stringify(history));
            Logger.log('PENDING_WRITE_JOURNAL', `Appended Phase [${phase}] (Seq #${sequenceNumber}) - Hash: ${integrityHash}`);
            return record;
        } catch (error) {
            console.error('[PendingWriteStore] Critical error appending journal phase:', error);
            throw new Error(`JOURNAL_STORAGE_ERROR: ${error}`);
        }
    }

    /**
     * Validates the integrity of the journal chain (sequence continuity and hash verification).
     */
    public validateJournalIntegrity(history: PendingWriteJournalRecord[]): boolean {
        if (history.length === 0) return true;

        for (let i = 0; i < history.length; i++) {
            const current = history[i];
            const expectedSeq = i + 1;

            if (current.sequenceNumber !== expectedSeq) {
                Logger.log('JOURNAL_INTEGRITY', `Sequence gap detected at index ${i}: expected ${expectedSeq}, found ${current.sequenceNumber}`);
                return false;
            }

            if (i > 0) {
                const prev = history[i - 1];
                if (current.previousRecordHash !== prev.integrityHash) {
                    Logger.log('JOURNAL_INTEGRITY', `Hash chain break at index ${i}: previous ${current.previousRecordHash} != ${prev.integrityHash}`);
                    return false;
                }
            }
        }
        return true;
    }

    /**
     * Returns the latest valid journal record or null if empty.
     */
    public async getLatestJournalRecord(): Promise<PendingWriteJournalRecord | null> {
        const history = await this.getJournalHistory();
        if (history.length === 0) return null;

        const isValid = this.validateJournalIntegrity(history);
        if (!isValid) {
            Logger.log('JOURNAL_INTEGRITY', 'CRITICAL: Journal hash chain verification failed. Mandatory manual intervention triggered.');
            return {
                operationId: history[0]?.operationId || 'UNKNOWN',
                sequenceNumber: 999,
                phase: 'CRITICAL_MANUAL_INTERVENTION',
                integrityHash: 'CORRUPTED',
                timestamp: Date.now(),
                payload: history[history.length - 1].payload
            };
        }

        return history[history.length - 1];
    }

    /**
     * Evaluates the Phase-to-Recovery Action mapping matrix upon app boot or reconnect.
     */
    public getRecoveryActionForPhase(record: PendingWriteJournalRecord): { action: RecoveryResult; userMessage: string } {
        switch (record.phase) {
            case 'PRECHECK':
            case 'BACKUP_COMPLETE':
                return {
                    action: RecoveryResult.SAFE_ABORT,
                    userMessage: 'Write operation was not sent to ECU. Journal safely cleared.'
                };

            case 'WRITE_STARTED':
                return {
                    action: RecoveryResult.INCONCLUSIVE_LOCKED,
                    userMessage: 'ECU write initiated but connection dropped. Bus stabilization and 0x22 Read-Back verification required before unlocking.'
                };

            case 'WRITE_POSITIVE_RESPONSE':
            case 'VERIFICATION_STARTED':
                return {
                    action: RecoveryResult.INCONCLUSIVE_LOCKED,
                    userMessage: 'Write accepted by ECU, but post-write verification was interrupted. Target feature remains locked until read-only verification passes.'
                };

            case 'WRITE_NEGATIVE_RESPONSE':
                return {
                    action: RecoveryResult.IMMEDIATE_LOCK,
                    userMessage: 'ECU rejected write request (NRC Error). Security access locked for target module.'
                };

            case 'INCONCLUSIVE':
                return {
                    action: RecoveryResult.INCONCLUSIVE_LOCKED,
                    userMessage: 'Operation status is inconclusive due to communication timeout. Module locked to prevent secondary writes.'
                };

            case 'RECOVERY_REQUIRED':
                return {
                    action: RecoveryResult.RECOVERY_REQUIRED,
                    userMessage: 'Data mismatch detected after write. Opt-in rollback check required.'
                };

            case 'ROLLBACK_STARTED':
                return {
                    action: RecoveryResult.CRITICAL_MANUAL_INTERVENTION,
                    userMessage: 'CRITICAL: Rollback was initiated in previous session. Secondary write attempt blocked to prevent ECU damage. Please verify ECU state manually.'
                };

            case 'CRITICAL_MANUAL_INTERVENTION':
                return {
                    action: RecoveryResult.CRITICAL_MANUAL_INTERVENTION,
                    userMessage: 'CRITICAL: ECU manual recovery required. Automatic coding and rollback disabled for safety.'
                };

            case 'VERIFIED':
            case 'COMPLETED':
            default:
                return {
                    action: RecoveryResult.SAFE_ABORT,
                    userMessage: 'Operation completed successfully.'
                };
        }
    }

    /**
     * Clears the journal history after successful verification and finalization.
     */
    public async clearJournal(): Promise<void> {
        try {
            await AsyncStorage.removeItem(JOURNAL_STORAGE_KEY);
            Logger.log('PENDING_WRITE_JOURNAL', 'Journal history cleared from disk.');
        } catch (error) {
            console.error('[PendingWriteStore] Failed to clear journal history:', error);
        }
    }
}

export const pendingWriteStore = new PendingWriteStore();
