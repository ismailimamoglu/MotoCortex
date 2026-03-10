import AsyncStorage from '@react-native-async-storage/async-storage';

const GARAGE_KEY = '@motocortex_garage';

export interface GarageRecord {
    id: string;
    date: string;
    make: string;
    model: string;
    vin: string;
    km: string;
    dtcs: string[];
}

/**
 * Save a new garage record
 */
export async function saveGarageRecord(record: Omit<GarageRecord, 'id' | 'date'>): Promise<GarageRecord | null> {
    try {
        const newRecord: GarageRecord = {
            ...record,
            id: Date.now().toString(),
            date: new Date().toLocaleDateString('tr-TR', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
        };

        const existing = await getGarageRecords();
        existing.unshift(newRecord); // newest first
        await AsyncStorage.setItem(GARAGE_KEY, JSON.stringify(existing));
        return newRecord;
    } catch (e) {
        console.error('Failed to save garage record:', e);
        return null;
    }
}

/**
 * Get all saved garage records
 */
export async function getGarageRecords(): Promise<GarageRecord[]> {
    try {
        const data = await AsyncStorage.getItem(GARAGE_KEY);
        return data ? JSON.parse(data) : [];
    } catch (e) {
        console.error('Failed to load garage records:', e);
        return [];
    }
}

/**
 * Delete a specific garage record by its ID
 */
export async function deleteGarageRecord(id: string): Promise<void> {
    try {
        const existing = await getGarageRecords();
        const filtered = existing.filter(r => r.id !== id);
        await AsyncStorage.setItem(GARAGE_KEY, JSON.stringify(filtered));
    } catch (e) {
        console.error('Failed to delete garage record:', e);
    }
}
/**
 * Get records filtered by VIN
 */
export async function getRecordsByVin(vin: string): Promise<GarageRecord[]> {
    if (!vin || vin === 'Bilinmiyor' || vin === 'Tespit Edilemedi') return [];
    try {
        const all = await getGarageRecords();
        return all.filter(r => r.vin === vin);
    } catch (e) {
        console.error('Failed to get records by VIN:', e);
        return [];
    }
}
