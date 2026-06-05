import RNFS from 'react-native-fs';
import { useBluetoothStore } from '../store/useBluetoothStore';
import { VehicleMake } from '../utils/vinDecoder';
import * as Logger from './Logger';
import { preloadDynamicDtc } from '../data/dtcStorage';

const DTC_BASE_URL = 'https://raw.githubusercontent.com/peyo/dtc-and-vin-data/master/dtc/p';
const SYNC_DIR = `${RNFS.CachesDirectoryPath}/dtc_chunks/`;

/**
 * Ensures the synchronization directory exists on the disk.
 */
async function ensureDirectoryExists(): Promise<void> {
    try {
        const exists = await RNFS.exists(SYNC_DIR);
        if (!exists) {
            await RNFS.mkdir(SYNC_DIR);
            Logger.log('DTC_SYNC', 'Created local dtc_chunks directory');
        }
    } catch (e) {
        Logger.log('DTC_SYNC', `Failed to create dtc_chunks directory: ${e}`);
        throw e;
    }
}

/**
 * Dynamic DTC Synchronizer Service
 */
export async function syncManufacturerDtc(make: VehicleMake): Promise<void> {
    if (!make) return;
    
    const url = `${DTC_BASE_URL}/${make.toLowerCase()}.json`;
    const store = useBluetoothStore.getState();
    store.setSensorData({ dtcSyncStatus: 'syncing' });
    Logger.log('DTC_SYNC', `Starting DTC synchronization for ${make} from URL: ${url}`);

    const tempFilePath = `${SYNC_DIR}${make.toLowerCase()}_temp.json`;
    const filePath = `${SYNC_DIR}${make.toLowerCase()}.json`;

    try {
        await ensureDirectoryExists();

        // If a leftover temp file exists, clean it up
        if (await RNFS.exists(tempFilePath)) {
            await RNFS.unlink(tempFilePath);
        }

        const downloadOptions = {
            fromUrl: url,
            toFile: tempFilePath,
            connectionTimeout: 10000,
            readTimeout: 10000,
            background: false,
        };

        const downloadResult = await RNFS.downloadFile(downloadOptions).promise;

        // Manual validation of HTTP status code to intercept native non-throwing HTTP errors
        if (downloadResult.statusCode !== 200) {
            if (await RNFS.exists(tempFilePath)) {
                await RNFS.unlink(tempFilePath);
            }
            throw new Error(`HTTP error! status: ${downloadResult.statusCode}`);
        }

        // Read and validate JSON data structure before moving to active location
        const content = await RNFS.readFile(tempFilePath, 'utf8');
        const data = JSON.parse(content);
        
        if (!Array.isArray(data)) {
            if (await RNFS.exists(tempFilePath)) {
                await RNFS.unlink(tempFilePath);
            }
            throw new Error('Invalid DTC JSON format: Expected an array of DTC objects');
        }

        if (data.length > 0 && (!data[0].dtc || !data[0].description)) {
            if (await RNFS.exists(tempFilePath)) {
                await RNFS.unlink(tempFilePath);
            }
            throw new Error('Invalid DTC object structure: Expected {dtc: string, description: string}');
        }

        // Verification successful - replace old sync chunk
        if (await RNFS.exists(filePath)) {
            await RNFS.unlink(filePath);
        }
        await RNFS.moveFile(tempFilePath, filePath);
        
        Logger.log('DTC_SYNC', `Saved ${data.length} codes for ${make} to ${filePath}`);

        // Update pre-warm memory cache
        await preloadDynamicDtc(make);

        // Update Zustand Store Sync Status
        const timestamp = new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        store.setSensorData({
            dtcSyncStatus: 'success',
            lastDtcSyncTime: timestamp,
        });

        Logger.log('DTC_SYNC', `Synchronization successfully completed for ${make} at ${timestamp}`);
    } catch (e: any) {
        // Cleanup temp file in case of error
        try {
            if (await RNFS.exists(tempFilePath)) {
                await RNFS.unlink(tempFilePath);
            }
        } catch (_) {}

        const errorMsg = e.message || String(e);
        Logger.log('DTC_SYNC', `Sync failed for ${make}: ${errorMsg}`);
        console.error(`[DtcSyncService] Failed to sync DTCs for ${make}`, e);
        
        store.setSensorData({
            dtcSyncStatus: 'error',
        });
    }
}
