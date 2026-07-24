import * as SQLite from 'expo-sqlite';

export interface CachedI18nItem {
  key: string;
  lang: string;
  value: string;
  updatedAt: string;
  etag?: string;
}

let dbInstance: any = null;

async function getDb() {
  if (!dbInstance) {
    dbInstance = await SQLite.openDatabaseAsync('motocortex_i18n_cache.db');
    await dbInstance.execAsync(`
      CREATE TABLE IF NOT EXISTS offline_i18n_cache (
        key TEXT NOT NULL,
        lang TEXT NOT NULL,
        value TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        etag TEXT,
        PRIMARY KEY (key, lang)
      );
    `);
  }
  return dbInstance;
}

export async function setCachedI18n(item: CachedI18nItem): Promise<void> {
  try {
    const db = await getDb();
    await db.runAsync(
      `INSERT OR REPLACE INTO offline_i18n_cache (key, lang, value, updated_at, etag) VALUES (?, ?, ?, ?, ?);`,
      [item.key, item.lang, item.value, item.updatedAt, item.etag || null]
    );
  } catch (err) {
    console.warn('[Offline i18n Cache] Save error:', err);
  }
}

export async function getCachedI18n(key: string, lang: string): Promise<CachedI18nItem | null> {
  try {
    const db = await getDb();
    const result: any = await db.getFirstAsync(
      `SELECT key, lang, value, updated_at as updatedAt, etag FROM offline_i18n_cache WHERE key = ? AND lang = ?;`,
      [key, lang]
    );
    return result || null;
  } catch (err) {
    console.warn('[Offline i18n Cache] Fetch error:', err);
    return null;
  }
}
