import * as SQLite from 'expo-sqlite';
import { TelemetryItem } from '../../store/useTelemetryStore';

class SQLiteStorage {
    private db: SQLite.SQLiteDatabase;

    constructor() {
        try {
            this.db = SQLite.openDatabaseSync('motocortex.db');
            this.initSchema();
        } catch (err) {
            console.error('[SQLiteStorage] Failed to open SQLite database:', err);
            throw err;
        }
    }

    private initSchema() {
        this.db.execSync(`
            CREATE TABLE IF NOT EXISTS telemetry_queue (
                id TEXT PRIMARY KEY,
                brand TEXT,
                model TEXT,
                year INTEGER,
                protocol TEXT,
                ecu_id TEXT,
                dtc_codes TEXT,
                session_hash TEXT UNIQUE,
                retry_count INTEGER DEFAULT 0,
                engine_rpm REAL,
                coolant_temp REAL,
                throttle_pos REAL,
                success INTEGER DEFAULT 0,
                is_simulated INTEGER DEFAULT 0,
                created_at TEXT
            );
            CREATE INDEX IF NOT EXISTS idx_sync_pacing ON telemetry_queue (success, created_at);
        `);
    }

    public enqueueTelemetry(item: TelemetryItem): void {
        try {
            this.db.runSync(
                `INSERT OR IGNORE INTO telemetry_queue 
                 (id, brand, model, year, protocol, ecu_id, dtc_codes, session_hash, retry_count, engine_rpm, coolant_temp, throttle_pos, success, is_simulated, created_at)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    item.id,
                    item.brand || null,
                    item.model || null,
                    item.year || null,
                    item.protocol || null,
                    item.ecu_id || null,
                    JSON.stringify(item.dtc_codes || []),
                    item.session_hash || null,
                    item.retry_count || 0,
                    item.engine_rpm ?? null,
                    item.coolant_temp ?? null,
                    item.throttle_pos ?? null,
                    item.success ? 1 : 0,
                    item.is_simulated ? 1 : 0,
                    item.created_at || null
                ]
            );
            this.enforceQueueLimit();
        } catch (err) {
            console.error('[SQLiteStorage] enqueueTelemetry failed:', err);
        }
    }

    private enforceQueueLimit(): void {
        try {
            const countResult = this.db.getFirstSync<{ count: number }>('SELECT COUNT(*) as count FROM telemetry_queue');
            const count = countResult ? Math.max(0, Math.floor(Number(countResult.count))) : 0;
            if (count > 2000) {
                const excess = Math.max(0, Math.floor(Number(count - 2000)));
                // Delete synced items first
                const deleteSynced = this.db.runSync(
                    `DELETE FROM telemetry_queue WHERE id IN (
                        SELECT id FROM telemetry_queue WHERE success = 1 ORDER BY created_at ASC LIMIT ?
                    )`,
                    [excess]
                );
                const deletedSyncedCount = deleteSynced.changes ? Math.max(0, Math.floor(Number(deleteSynced.changes))) : 0;
                const remainingExcess = Math.max(0, Math.floor(Number(excess - deletedSyncedCount)));
                if (remainingExcess > 0) {
                    // Get hashes of unsynced items we are about to drop for logging
                    const toDrop = this.db.getAllSync<{ id: string, session_hash: string }>(
                        `SELECT id, session_hash FROM telemetry_queue WHERE success = 0 ORDER BY created_at ASC LIMIT ?`,
                        [remainingExcess]
                    );
                    for (const item of toDrop) {
                        try {
                            const DiagnosticSessionRecorder = require('../monitor/DiagnosticSessionRecorder').default;
                            DiagnosticSessionRecorder.recordErr('QUEUE_OVERFLOW_DATA_DROPPED', `Dropped oldest unsynced telemetry item with hash: ${item.session_hash}`);
                        } catch (err) {
                            console.error('[SQLiteStorage] Failed to log overflow drop:', err);
                        }
                    }
                    this.db.runSync(
                        `DELETE FROM telemetry_queue WHERE id IN (
                            SELECT id FROM telemetry_queue WHERE success = 0 ORDER BY created_at ASC LIMIT ?
                        )`,
                        [remainingExcess]
                    );
                }
            }
        } catch (err) {
            console.error('[SQLiteStorage] enforceQueueLimit failed:', err);
        }
    }

    public getUnsyncedTelemetry(limit: number): TelemetryItem[] {
        try {
            const safeLimit = Math.max(1, Math.floor(Number(limit) || 50));
            const rows = this.db.getAllSync<any>(
                'SELECT * FROM telemetry_queue WHERE success = 0 ORDER BY created_at ASC LIMIT ?',
                [safeLimit]
            );
            return rows.map((row: any) => ({
                id: row.id,
                brand: row.brand,
                model: row.model,
                year: row.year,
                protocol: row.protocol,
                ecu_id: row.ecu_id,
                dtc_codes: JSON.parse(row.dtc_codes || '[]'),
                session_hash: row.session_hash,
                retry_count: row.retry_count,
                engine_rpm: row.engine_rpm,
                coolant_temp: row.coolant_temp,
                throttle_pos: row.throttle_pos,
                success: row.success === 1,
                is_simulated: row.is_simulated === 1,
                created_at: row.created_at
            }));
        } catch (err) {
            console.error('[SQLiteStorage] getUnsyncedTelemetry failed:', err);
            return [];
        }
    }

    public markAsSynced(sessionHash: string): void {
        try {
            this.db.runSync(
                'UPDATE telemetry_queue SET success = 1 WHERE session_hash = ?',
                [sessionHash]
            );
        } catch (err) {
            console.error('[SQLiteStorage] markAsSynced failed:', err);
        }
    }

    public incrementRetryCount(id: string): void {
        try {
            this.db.runSync(
                'UPDATE telemetry_queue SET retry_count = retry_count + 1 WHERE id = ?',
                [id]
            );
        } catch (err) {
            console.error('[SQLiteStorage] incrementRetryCount failed:', err);
        }
    }

    public removeTelemetryItem(id: string): void {
        try {
            this.db.runSync(
                'DELETE FROM telemetry_queue WHERE id = ?',
                [id]
            );
        } catch (err) {
            console.error('[SQLiteStorage] removeTelemetryItem failed:', err);
        }
    }

    public removeTelemetryItems(ids: string[]): void {
        if (!ids || ids.length === 0) return;
        try {
            const placeholders = ids.map(() => '?').join(',');
            this.db.runSync(
                `DELETE FROM telemetry_queue WHERE id IN (${placeholders})`,
                ids
            );
        } catch (err) {
            console.error('[SQLiteStorage] removeTelemetryItems failed:', err);
        }
    }

    public getQueueLength(): number {
        try {
            const res = this.db.getFirstSync<{ count: number }>('SELECT COUNT(*) as count FROM telemetry_queue');
            return res ? res.count : 0;
        } catch (err) {
            console.error('[SQLiteStorage] getQueueLength failed:', err);
            return 0;
        }
    }

    public getQueueBytes(): number {
        try {
            const res = this.db.getFirstSync<{ totalBytes: number }>(`
                SELECT SUM(
                    120 + 
                    LENGTH(COALESCE(brand, '')) + 
                    LENGTH(COALESCE(model, '')) + 
                    LENGTH(COALESCE(protocol, '')) + 
                    LENGTH(COALESCE(ecu_id, '')) + 
                    LENGTH(COALESCE(dtc_codes, '')) + 
                    LENGTH(COALESCE(session_hash, ''))
                ) as totalBytes FROM telemetry_queue
            `);
            return res && res.totalBytes ? Number(res.totalBytes) : 0;
        } catch (err) {
            console.error('[SQLiteStorage] getQueueBytes failed:', err);
            return 0;
        }
    }

    public getRecentItems(limit: number = 100): TelemetryItem[] {
        try {
            const safeLimit = Math.max(1, Math.floor(Number(limit) || 100));
            const rows = this.db.getAllSync<any>(
                'SELECT * FROM telemetry_queue ORDER BY created_at ASC LIMIT ?',
                [safeLimit]
            );
            return rows.map((row: any) => ({
                id: row.id,
                brand: row.brand,
                model: row.model,
                year: row.year,
                protocol: row.protocol,
                ecu_id: row.ecu_id,
                dtc_codes: JSON.parse(row.dtc_codes || '[]'),
                session_hash: row.session_hash,
                retry_count: row.retry_count,
                engine_rpm: row.engine_rpm,
                coolant_temp: row.coolant_temp,
                throttle_pos: row.throttle_pos,
                success: row.success === 1,
                is_simulated: row.is_simulated === 1,
                created_at: row.created_at
            }));
        } catch (err) {
            console.error('[SQLiteStorage] getRecentItems failed:', err);
            return [];
        }
    }

    public getAllItems(): TelemetryItem[] {
        try {
            const rows = this.db.getAllSync<any>('SELECT * FROM telemetry_queue ORDER BY created_at ASC');
            return rows.map((row: any) => ({
                id: row.id,
                brand: row.brand,
                model: row.model,
                year: row.year,
                protocol: row.protocol,
                ecu_id: row.ecu_id,
                dtc_codes: JSON.parse(row.dtc_codes || '[]'),
                session_hash: row.session_hash,
                retry_count: row.retry_count,
                engine_rpm: row.engine_rpm,
                coolant_temp: row.coolant_temp,
                throttle_pos: row.throttle_pos,
                success: row.success === 1,
                is_simulated: row.is_simulated === 1,
                created_at: row.created_at
            }));
        } catch (err) {
            console.error('[SQLiteStorage] getAllItems failed:', err);
            return [];
        }
    }

    public clearAll(): void {
        try {
            this.db.runSync('DELETE FROM telemetry_queue');
        } catch (err) {
            console.error('[SQLiteStorage] clearAll failed:', err);
        }
    }
}

export default new SQLiteStorage();
