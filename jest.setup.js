jest.mock('expo-sqlite', () => {
  const rows = [];
  const mockDb = {
    execSync: jest.fn(),
    runSync: jest.fn((query, params) => {
      const clean = query.replace(/\s+/g, ' ').toUpperCase();
      if (clean.includes('INSERT INTO TELEMETRY_QUEUE') || clean.includes('INSERT OR IGNORE INTO TELEMETRY_QUEUE')) {
        const [id, brand, model, year, protocol, ecu_id, dtc_codes, session_hash, retry_count, engine_rpm, coolant_temp, throttle_pos, success, is_simulated, created_at] = params;
        
        if (session_hash && rows.some(r => r.session_hash === session_hash)) {
          return { changes: 0, lastInsertRowId: 0 };
        }
        
        rows.push({
          id, brand, model, year, protocol, ecu_id, dtc_codes, session_hash,
          retry_count: retry_count || 0,
          engine_rpm, coolant_temp, throttle_pos,
          success: success || 0,
          is_simulated: is_simulated || 0,
          created_at
        });
        return { changes: 1, lastInsertRowId: 1 };
      }
      if (clean.includes('DELETE FROM TELEMETRY_QUEUE WHERE ID =')) {
        const id = params[0];
        const idx = rows.findIndex(r => r.id === id);
        if (idx !== -1) {
          rows.splice(idx, 1);
          return { changes: 1 };
        }
        return { changes: 0 };
      }
      if (clean.includes('DELETE FROM TELEMETRY_QUEUE WHERE ID IN')) {
        const limit = params[0];
        const isSuccess = clean.includes('SUCCESS = 1');
        const toDelete = rows.filter(r => r.success === (isSuccess ? 1 : 0))
                            .sort((a, b) => (a.created_at || '').localeCompare(b.created_at || ''))
                            .slice(0, limit);
        let changes = 0;
        for (const item of toDelete) {
          const idx = rows.findIndex(r => r.id === item.id);
          if (idx !== -1) {
            rows.splice(idx, 1);
            changes++;
          }
        }
        return { changes };
      }
      if (clean.includes('DELETE FROM TELEMETRY_QUEUE')) {
        rows.length = 0;
        return { changes: 1 };
      }
      if (clean.includes('UPDATE TELEMETRY_QUEUE SET SUCCESS = 1 WHERE SESSION_HASH =')) {
        const session_hash = params[0];
        const item = rows.find(r => r.session_hash === session_hash);
        if (item) {
          item.success = 1;
          return { changes: 1 };
        }
        return { changes: 0 };
      }
      if (clean.includes('UPDATE TELEMETRY_QUEUE SET RETRY_COUNT = RETRY_COUNT + 1 WHERE ID =')) {
        const id = params[0];
        const item = rows.find(r => r.id === id);
        if (item) {
          item.retry_count = (item.retry_count || 0) + 1;
          return { changes: 1 };
        }
        return { changes: 0 };
      }
      return { changes: 0 };
    }),
    getFirstSync: jest.fn((query, params) => {
      const clean = query.replace(/\s+/g, ' ').toUpperCase();
      if (clean.includes('SELECT COUNT(*)')) {
        return { count: rows.length };
      }
      return null;
    }),
    getAllSync: jest.fn((query, params) => {
      const clean = query.replace(/\s+/g, ' ').toUpperCase();
      if (clean.includes('SELECT * FROM TELEMETRY_QUEUE WHERE SUCCESS = 0')) {
        const limit = params[0];
        return rows.filter(r => r.success === 0)
                   .sort((a, b) => (a.created_at || '').localeCompare(b.created_at || ''))
                   .slice(0, limit);
      }
      if (clean.includes('SELECT ID, SESSION_HASH FROM TELEMETRY_QUEUE WHERE SUCCESS = 0')) {
        const limit = params[0];
        return rows.filter(r => r.success === 0)
                   .sort((a, b) => (a.created_at || '').localeCompare(b.created_at || ''))
                   .slice(0, limit)
                   .map(r => ({ id: r.id, session_hash: r.session_hash }));
      }
      if (clean.includes('SELECT * FROM TELEMETRY_QUEUE ORDER BY CREATED_AT ASC')) {
        return [...rows].sort((a, b) => (a.created_at || '').localeCompare(b.created_at || ''));
      }
      return [];
    }),
  };
  return {
    openDatabaseSync: jest.fn(() => mockDb),
  };
});

jest.mock('react-native-fs', () => ({
  CachesDirectoryPath: '/mock/caches',
  DocumentDirectoryPath: '/mock/documents',
  exists: jest.fn().mockResolvedValue(true),
  readFile: jest.fn().mockResolvedValue('{}'),
  writeFile: jest.fn().mockResolvedValue(true),
  unlink: jest.fn().mockResolvedValue(true),
}));
