import RNFS from 'react-native-fs';
import { useBluetoothStore } from '../store/useBluetoothStore';

const CHUNK_MAP: Record<string, () => any> = {
    'B': () => require('./chunks/B.json'),
    'C': () => require('./chunks/C.json'),
    'U': () => require('./chunks/U.json'),
    'P00': () => require('./chunks/P00.json'),
    'P01': () => require('./chunks/P01.json'),
    'P02': () => require('./chunks/P02.json'),
    'P03': () => require('./chunks/P03.json'),
    'P04': () => require('./chunks/P04.json'),
    'P05': () => require('./chunks/P05.json'),
    'P06': () => require('./chunks/P06.json'),
    'P07': () => require('./chunks/P07.json'),
    'P08': () => require('./chunks/P08.json'),
    'P09': () => require('./chunks/P09.json'),
    'P11': () => require('./chunks/P11.json'),
    'P12': () => require('./chunks/P12.json'),
    'P13': () => require('./chunks/P13.json'),
    'P14': () => require('./chunks/P14.json'),
    'P15': () => require('./chunks/P15.json'),
    'P16': () => require('./chunks/P16.json'),
    'P17': () => require('./chunks/P17.json'),
    'P18': () => require('./chunks/P18.json'),
    'P19': () => require('./chunks/P19.json'),
    'P20': () => require('./chunks/P20.json'),
    'P21': () => require('./chunks/P21.json'),
};

const SYNC_DIR = `${RNFS.CachesDirectoryPath}/dtc_chunks/`;
const memoryCache: Record<string, Record<string, string>> = {};
const dynamicCache: Record<string, string> = {};

let pendingCache: Record<string, string> | null = null;
let pendingMake: string | null = null;
let lastLoadedMake: string | null = null;

/**
 * Gets the prefix chunk name for a given DTC code.
 */
function getPrefix(code: string): string {
    if (!code) return '';
    const firstChar = code[0].toUpperCase();
    if (firstChar === 'P') {
        return code.substring(0, 3).toUpperCase();
    }
    return firstChar;
}

/**
 * Loads a chunk by prefix synchronously using memory cache or falling back to local files.
 */
function getOrLoadChunkSync(prefix: string): Record<string, string> | null {
    if (!prefix) return null;

    // 1st Tier: Memory Cache
    if (memoryCache[prefix]) {
        return memoryCache[prefix];
    }

    // Origin/Fallback: Bundled local JSON assets (Lazy Loaded Synchronously)
    if (CHUNK_MAP[prefix]) {
        try {
            const chunkData = CHUNK_MAP[prefix]();
            // Cache in memory
            memoryCache[prefix] = chunkData;
            return chunkData;
        } catch (e) {
            console.error(`[DTCStorage] Failed to lazy load bundled chunk for prefix: ${prefix}`, e);
        }
    }

    return null;
}

/**
 * Pre-warms/caches key prefixes into Memory cache.
 */
export function prefetchDtcChunks(prefixes: string[]): void {
    for (const prefix of prefixes) {
        getOrLoadChunkSync(prefix);
    }
}

/**
 * Pre-fetches chunks for specific DTC codes.
 */
export function prefetchDtcChunksForCodes(codes: string[]): void {
    if (!codes || codes.length === 0) return;
    const prefixes = codes.map(code => getPrefix(code)).filter(Boolean);
    const uniquePrefixes = Array.from(new Set(prefixes));
    prefetchDtcChunks(uniquePrefixes);
}

/**
 * Pre-loads dynamic, manufacturer-specific DTC codes from file system to memory cache.
 */
export async function preloadDynamicDtc(make: string): Promise<void> {
    if (!make) return;

    // Skip loading if the same make's codes are already active or pending in cache
    if (pendingMake === make || (Object.keys(dynamicCache).length > 0 && lastLoadedMake === make)) {
        return;
    }

    const filePath = `${SYNC_DIR}${make.toLowerCase()}.json`;
    try {
        const fileExists = await RNFS.exists(filePath);
        if (fileExists) {
            const content = await RNFS.readFile(filePath, 'utf8');
            const data = JSON.parse(content);
            if (Array.isArray(data)) {
                const newCache: Record<string, string> = {};
                for (const item of data) {
                    if (item && item.dtc && item.description) {
                        newCache[item.dtc.toUpperCase().trim()] = item.description;
                    }
                }

                // Check store status to verify if Bluetooth operations are running
                const store = useBluetoothStore.getState();
                const isSystemBusy = store.status === 'connected' && 
                    (store.isPollingActive || store.isDiagnosticMode || store.isAdaptationRunning);

                if (isSystemBusy) {
                    pendingCache = newCache;
                    pendingMake = make;
                    console.log(`[DTCStorage] Queued ${data.length} dynamic DTC codes in pendingCache for ${make} (system busy)`);
                } else {
                    for (const key in dynamicCache) {
                        delete dynamicCache[key];
                    }
                    for (const key in newCache) {
                        dynamicCache[key] = newCache[key];
                    }
                    lastLoadedMake = make;
                    pendingCache = null;
                    pendingMake = null;
                    console.log(`[DTCStorage] Directly loaded ${data.length} dynamic DTC codes for ${make}`);
                }
            }
        } else {
            console.log(`[DTCStorage] No dynamic DTC chunk found on disk for ${make} at ${filePath}`);
        }
    } catch (e) {
        console.error(`[DTCStorage] Error preloading dynamic DTC codes for ${make}:`, e);
    }
}

/**
 * Applies the pending DTC cache to the active dynamicCache.
 */
export function applyPendingDtcCache(): void {
    if (pendingCache) {
        for (const key in dynamicCache) {
            delete dynamicCache[key];
        }
        for (const key in pendingCache) {
            dynamicCache[key] = pendingCache[key];
        }
        lastLoadedMake = pendingMake;
        console.log(`[DTCStorage] Applied pending DTC cache for ${pendingMake}. Total codes: ${Object.keys(dynamicCache).length}`);
        pendingCache = null;
        pendingMake = null;
    }
}

/**
 * Look up a Diagnostic Trouble Code synchronously.
 * Resolves to the description string if found, or null otherwise.
 */
export function lookupDtcSync(code: string): string | null {
    if (!code) return null;
    const normalized = code.toUpperCase().trim();

    // 1st Tier: Check dynamic cache preloaded from manufacturer-specific chunks
    if (dynamicCache[normalized]) {
        return dynamicCache[normalized];
    }

    const prefix = getPrefix(normalized);
    const chunk = getOrLoadChunkSync(prefix);
    if (chunk && chunk[normalized]) {
        return chunk[normalized];
    }

    return null;
}
