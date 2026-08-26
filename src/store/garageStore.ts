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

const REGISTERED_VEHICLES_KEY = '@motocortex_registered_vehicles';

export interface SelectedVehicle {
    brand: string;
    model: string;
    year: number;
    fuelType?: string;
    vin?: string;
}

export interface VehicleOperation {
    type: 'clear_dtc' | 'fuel_adaptation' | 'ecu_reset';
    timestamp: number;
    dateString: string;
}

/**
 * Get all registered vehicles with automatic migration from existing history records
 */
export async function getRegisteredVehicles(): Promise<SelectedVehicle[]> {
    try {
        const data = await AsyncStorage.getItem(REGISTERED_VEHICLES_KEY);
        if (data) {
            return JSON.parse(data);
        }

        // Migrate from existing garage records
        const records = await getGarageRecords();
        const unique: SelectedVehicle[] = [];
        const seen = new Set<string>();
        for (const r of records) {
            const yearMatch = r.model.match(/\((\d{4})\)/);
            const year = yearMatch ? parseInt(yearMatch[1], 10) : 2020;
            const model = r.model.replace(/\s*\(\d{4}\)$/, '').trim();
            const key = `${r.make.toLowerCase()}|${model.toLowerCase()}|${year}`;
            if (!seen.has(key)) {
                seen.add(key);
                unique.push({ brand: r.make, model, year, vin: r.vin });
            }
        }
        await AsyncStorage.setItem(REGISTERED_VEHICLES_KEY, JSON.stringify(unique));
        return unique;
    } catch (e) {
        console.error('Failed to get registered vehicles:', e);
        return [];
    }
}

/**
 * Save a newly selected vehicle to the registered vehicles list
 */
export async function saveRegisteredVehicle(vehicle: SelectedVehicle): Promise<void> {
    try {
        const list = await getRegisteredVehicles();
        const index = list.findIndex(v => 
            v.brand.toLowerCase() === vehicle.brand.toLowerCase() &&
            v.model.toLowerCase() === vehicle.model.toLowerCase() &&
            v.year === vehicle.year
        );
        if (index >= 0) {
            list[index] = { ...list[index], ...vehicle };
        } else {
            list.unshift(vehicle);
        }
        await AsyncStorage.setItem(REGISTERED_VEHICLES_KEY, JSON.stringify(list));
    } catch (e) {
        console.error('Failed to save registered vehicle:', e);
    }
}

/**
 * Delete a registered vehicle from the list
 */
export async function deleteRegisteredVehicle(vehicle: SelectedVehicle): Promise<void> {
    try {
        const list = await getRegisteredVehicles();
        const filtered = list.filter(v => 
            !(v.brand.toLowerCase() === vehicle.brand.toLowerCase() &&
              v.model.toLowerCase() === vehicle.model.toLowerCase() &&
              v.year === vehicle.year)
        );
        await AsyncStorage.setItem(REGISTERED_VEHICLES_KEY, JSON.stringify(filtered));
    } catch (e) {
        console.error('Failed to delete registered vehicle:', e);
    }
}

/**
 * Add an extra operation record to local storage linked to the vehicle's VIN
 */
export async function addVehicleOperation(vin: string, type: VehicleOperation['type']): Promise<void> {
    try {
        if (!vin || vin === 'Bilinmiyor' || vin === 'Tespit Edilemedi') return;
        const key = `@motocortex_operations_${vin}`;
        const existingData = await AsyncStorage.getItem(key);
        const list: VehicleOperation[] = existingData ? JSON.parse(existingData) : [];
        const dateString = new Date().toLocaleDateString('tr-TR', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
        list.unshift({ type, timestamp: Date.now(), dateString });
        await AsyncStorage.setItem(key, JSON.stringify(list));
    } catch (e) {
        console.error('Failed to save vehicle operation:', e);
    }
}

/**
 * Get all operations performed on a vehicle by its VIN
 */
export async function getVehicleOperations(vin: string): Promise<VehicleOperation[]> {
    try {
        if (!vin || vin === 'Bilinmiyor' || vin === 'Tespit Edilemedi') return [];
        const key = `@motocortex_operations_${vin}`;
        const data = await AsyncStorage.getItem(key);
        return data ? JSON.parse(data) : [];
    } catch (e) {
        console.error('Failed to get vehicle operations:', e);
        return [];
    }
}

/**
 * Bind a VIN to the matching registered vehicle profile in local storage
 */
export async function bindVinToRegisteredVehicle(brand: string, model: string, year: number, vin: string): Promise<void> {
    try {
        if (!vin || vin === 'Bilinmiyor' || vin === 'Tespit Edilemedi') return;
        const list = await getRegisteredVehicles();
        let changed = false;
        const updated = list.map(v => {
            if (v.brand.toLowerCase() === brand.toLowerCase() &&
                v.model.toLowerCase() === model.toLowerCase() &&
                v.year === year) {
                if (v.vin !== vin) {
                    changed = true;
                    return { ...v, vin };
                }
            }
            return v;
        });
        if (changed) {
            await AsyncStorage.setItem(REGISTERED_VEHICLES_KEY, JSON.stringify(updated));
        }
    } catch (e) {
        console.error('Failed to bind VIN to registered vehicle:', e);
    }
}



