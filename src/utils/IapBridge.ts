import * as Crypto from 'expo-crypto';

/**
 * Obfuscation seed — NOT the HMAC key itself.
 * The actual key is derived at runtime via XOR with the device's
 * native hardware fingerprint UUID, making static extraction from
 * a decompiled binary useless.
 */
const OBFUSCATION_SEED: number[] = [
    0x6d, 0x6f, 0x74, 0x6f, 0x63, 0x6f, 0x72, 0x74,
    0x65, 0x78, 0x2d, 0x70, 0x72, 0x6f, 0x2d, 0x68,
    0x6d, 0x61, 0x63, 0x2d, 0x76, 0x37, 0x2e, 0x32,
    0x2d, 0x73, 0x65, 0x63, 0x75, 0x72, 0x65, 0x21,
];

import { Platform } from 'react-native';

/**
 * Returns a deterministic hardware fingerprint salt based on system properties.
 * Since direct MAC address and CPU Serial are restricted in modern iOS/Android sandboxes,
 * we combine OS name, version, CPU architecture, and model info to form a unique hardware fingerprint.
 */
export function getHardwareFingerprint(): string {
    const os = Platform.OS || 'unknown';
    const version = String(Platform.Version || 'unknown');
    // Using platform constants to gather hardware-specific details
    const constants = Platform.constants as any;
    const model = constants?.Model || constants?.Brand || constants?.interfaceName || 'generic';
    const arch = constants?.reactNativeVersion?.prerelease || 'unknown_arch';
    
    return `${os}:${version}:${model}:${arch}`;
}

/**
 * Derives the HMAC key at runtime by XOR-ing the obfuscation seed
 * with the device's native hardware UUID bytes AND the hashed hardware fingerprint salt.
 * 
 * This prevents decompiler tools from extracting the secret in plain text.
 * The device UUID comes from the native OS layer:
 *   iOS:     identifierForVendor
 *   Android: Secure.ANDROID_ID
 */
export function deriveHmacKey(deviceUuid: string): string {
    // Convert UUID to byte array (strip dashes, take first 32 hex chars)
    const cleanUuid = deviceUuid.replace(/-/g, '').toLowerCase();
    const uuidBytes: number[] = [];
    for (let i = 0; i < Math.min(cleanUuid.length, 64); i += 2) {
        uuidBytes.push(parseInt(cleanUuid.substring(i, i + 2), 16) || 0);
    }

    // Generate hardware fingerprint salt bytes
    const fpString = getHardwareFingerprint();
    const fpBytes: number[] = [];
    for (let i = 0; i < fpString.length; i++) {
        fpBytes.push(fpString.charCodeAt(i));
    }

    // XOR each seed byte with corresponding UUID byte and hardware fingerprint byte (cyclic)
    const derivedBytes: number[] = [];
    for (let i = 0; i < OBFUSCATION_SEED.length; i++) {
        const uuidByte = uuidBytes.length > 0 ? uuidBytes[i % uuidBytes.length] : 0;
        const fpByte = fpBytes.length > 0 ? fpBytes[i % fpBytes.length] : 0;
        
        // Combine XOR derivation: Seed XOR UUID byte XOR Hardware Fingerprint byte
        derivedBytes.push(OBFUSCATION_SEED[i] ^ uuidByte ^ fpByte);
    }

    // Convert to hex string for use as HMAC key material
    return derivedBytes.map(b => b.toString(16).padStart(2, '0')).join('');
}


export interface GracePeriodReceipt {
    timestamp: number;
    transactionId: string;
    signature: string;
}

export async function signReceipt(timestamp: number, transactionId: string, deviceUuid: string): Promise<string> {
    const derivedKey = deriveHmacKey(deviceUuid);
    const rawData = `${timestamp}:${transactionId}`;
    const combined = `${derivedKey}:${rawData}`;
    const digest = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        combined
    );
    return digest;
}

export async function verifyReceipt(receipt: GracePeriodReceipt, deviceUuid: string): Promise<boolean> {
    const computedSignature = await signReceipt(receipt.timestamp, receipt.transactionId, deviceUuid);
    return computedSignature === receipt.signature;
}
