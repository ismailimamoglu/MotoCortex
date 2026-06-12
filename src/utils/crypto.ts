import { Platform } from 'react-native';
import * as Crypto from 'expo-crypto';

/**
 * Asynchronous SHA-256 implementation leveraging expo-crypto.
 */
export async function sha256(ascii: string): Promise<string> {
  return await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    ascii
  );
}

/**
 * Pure JavaScript UUID v4 generator.
 * Standard RFC4122 compliance.
 */
export function generateUuid(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Deterministically generates a SHA-256 hash in JS.
 * Formula: session_hash = SHA256( Device_UUID + "_" + sorted_dtc_codes_joined + "_" + YYYY-MM-DD )
 */
export async function calculateSessionHash(
  deviceUuid: string | null | undefined,
  brand: string,
  model: string,
  year: number,
  dtcs: string[],
  dateString: string,
  sessionDynamicKey: string
): Promise<string> {
  const activeUuid = (deviceUuid || '').trim() || `fallback_device_${Platform.OS}_${Platform.Version || 'unknown'}`;
  const brandModelYear = `${brand}_${model}_${year}`;
  const sortedDtcs = dtcs && dtcs.length > 0 ? [...dtcs].sort().join(',') : 'CLEAN';
  const dynamicKey = sessionDynamicKey || '0';
  const dataToHash = `${activeUuid}_${brandModelYear}_${sortedDtcs}_${dateString}_${dynamicKey}`;
  
  try {
    return await sha256(dataToHash);
  } catch (error) {
    console.error('[Crypto] Hash digest failed, using simple fallback:', error);
    let hash = 0;
    for (let i = 0; i < dataToHash.length; i++) {
      const char = dataToHash.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash |= 0;
    }
    return `fallback_${Math.abs(hash).toString(16)}_${Date.now()}`;
  }
}
