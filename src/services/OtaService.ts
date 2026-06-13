import RNFS from 'react-native-fs';
import { z } from 'zod';
import { useBluetoothStore } from '../store/useBluetoothStore';
import { verifyEd25519Signature } from '../utils/crypto';
import { VehicleProfileDB } from '../core/pids/VehicleProfileDB';
import * as Logger from './Logger';
import { applyPendingDtcCache } from '../data/dtcStorage';

const CURRENT_APP_VERSION = '5.2.0';
const SUPPORTED_SCHEMA_VERSION = 2;
const PUBLIC_KEY_HEX = 'e5a0172c108b15e4f20bf8c39e248b94098696ec0cf98a287a9fb3dc96884693';

let otaWriting = false;

// Zod schemas
const VehicleProfileSchema = z.object({
    id: z.string(),
    make: z.string(),
    model: z.string(),
    year: z.number(),
    protocol: z.string(),
    initCommands: z.array(z.string()),
    settleDelayMs: z.number(),
    kLineAddresses: z.array(z.number()).optional(),
    supportsManualFlowControl: z.boolean(),
    description: z.string()
});

const ManifestSchema = z.object({
    version: z.string(),
    schemaVersion: z.number(),
    minAppVersion: z.string(),
    sha256: z.string(),
    signatureHex: z.string(),
    profiles: z.array(VehicleProfileSchema)
});

// Simple semver compare: returns true if v1 >= v2
function semverCompare(v1: string, v2: string): boolean {
    const parts1 = v1.split('.').map(Number);
    const parts2 = v2.split('.').map(Number);
    for (let i = 0; i < 3; i++) {
        const p1 = parts1[i] || 0;
        const p2 = parts2[i] || 0;
        if (p1 > p2) return true;
        if (p1 < p2) return false;
    }
    return true; // equal
}

export const OtaService = {
    isOtaWriting(): boolean {
        return otaWriting;
    },

    setOtaWritingForTest(val: boolean) {
        otaWriting = val;
    },

    async updateOemDb(manifestString: string): Promise<boolean> {
        // 1. Runtime Database Lock
        const store = useBluetoothStore.getState();
        const isDisconnected = store.connectionState === 'DISCONNECTED' || store.status === 'disconnected';
        if (!isDisconnected) {
            throw new Error('DATABASE_LOCK: Cannot write OTA updates while a diagnostic session is active');
        }

        otaWriting = true;
        const tmpPath = `${RNFS.DocumentDirectoryPath}/oem_profiles.tmp`;
        const activePath = `${RNFS.DocumentDirectoryPath}/oem_profiles.json`;

        try {
            // Parse raw JSON
            let parsedManifest: any;
            try {
                parsedManifest = JSON.parse(manifestString);
            } catch (err) {
                throw new Error(`JSON_PARSE_FAILED: ${err}`);
            }

            // 2. Schema validation via Zod
            const validation = ManifestSchema.safeParse(parsedManifest);
            if (!validation.success) {
                throw new Error(`SCHEMA_VALIDATION_FAILED: ${validation.error.message}`);
            }

            const manifest = validation.data;

            // 3. Manifest Version Gate
            if (manifest.schemaVersion > SUPPORTED_SCHEMA_VERSION) {
                throw new Error('VERSION_GATE_BLOCKED: Schema version exceeds supported limit');
            }

            if (!semverCompare(CURRENT_APP_VERSION, manifest.minAppVersion)) {
                throw new Error('VERSION_GATE_BLOCKED: App version is below required minimum version');
            }

            // 4. Ed25519 signature verification on profiles payload
            const dataToVerify = JSON.stringify(manifest.profiles);
            const isSigOk = verifyEd25519Signature(dataToVerify, manifest.signatureHex, PUBLIC_KEY_HEX);
            if (!isSigOk) {
                throw new Error('SIGNATURE_VERIFICATION_FAILED: Signature is invalid or tampered');
            }

            // 5. Atomic shadow file write
            await RNFS.writeFile(tmpPath, JSON.stringify(manifest.profiles), 'utf8');

            // Rename shadow to active path (atomic move)
            if (await RNFS.exists(activePath)) {
                await RNFS.unlink(activePath);
            }
            await RNFS.moveFile(tmpPath, activePath);

            // 6. Cache Invalidation
            await VehicleProfileDB.reloadProfiles();
            
            // Clear formula/VIN/PID caches
            applyPendingDtcCache();
            useBluetoothStore.setState({
                supportedPids: []
            });

            Logger.log('OTA_SERVICE', `OTA DB successfully updated to version ${manifest.version}`);
            return true;
        } catch (error: any) {
            Logger.log('OTA_SERVICE', `OTA update failed: ${error.message}`);
            
            // Rollback: delete temp file if it exists
            try {
                if (await RNFS.exists(tmpPath)) {
                    await RNFS.unlink(tmpPath);
                }
            } catch {}
            
            throw error;
        } finally {
            otaWriting = false;
        }
    }
};
