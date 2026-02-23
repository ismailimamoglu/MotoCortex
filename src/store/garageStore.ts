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
export async function saveGarageRecord(record: Omit<GarageRecord, 'id' | 'date'>): Promise<GarageRecord> {
    const newRecord: GarageRecord = {
        ...record,
        id: Date.now().toString(),
        date: new Date().toLocaleDateString('tr-TR', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
    };

    const existing = await getGarageRecords();
    existing.unshift(newRecord); // newest first
    await AsyncStorage.setItem(GARAGE_KEY, JSON.stringify(existing));
    return newRecord;
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
    const existing = await getGarageRecords();
    const filtered = existing.filter(r => r.id !== id);
    await AsyncStorage.setItem(GARAGE_KEY, JSON.stringify(filtered));
}
