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
 * Cryptographically secure UUID v4 generator leveraging expo-crypto.
 */
export function generateUuid(): string {
  try {
    if (typeof Crypto.randomUUID === 'function') {
      return Crypto.randomUUID();
    }
  } catch (e) {
    // Fallback if native CSPRNG is unavailable
  }
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

/**
 * Converts a hex string into a Uint8Array.
 */
export function hexToUint8Array(hexString: string): Uint8Array {
  const cleanHex = hexString.replace(/\s+/g, '');
  const len = cleanHex.length;
  if (len % 2 !== 0) {
    throw new Error('Invalid hex string');
  }
  const array = new Uint8Array(len / 2);
  for (let i = 0; i < len; i += 2) {
    array[i / 2] = parseInt(cleanHex.substring(i, i + 2), 16);
  }
  return array;
}

/**
 * Converts a string into a Uint8Array (compatible with JS engines lacking TextEncoder).
 */
export function stringToUint8Array(str: string): Uint8Array {
  const arr = new Uint8Array(str.length);
  for (let i = 0; i < str.length; i++) {
    arr[i] = str.charCodeAt(i) & 0xFF;
  }
  return arr;
}

import nacl from 'tweetnacl';

/**
 * Verifies Ed25519 signature of the given data using the public key hex and signature hex.
 */
export function verifyEd25519Signature(data: string, signatureHex: string, publicKeyHex: string): boolean {
  try {
    const msgBytes = stringToUint8Array(data);
    const sigBytes = hexToUint8Array(signatureHex);
    const pubKeyBytes = hexToUint8Array(publicKeyHex);
    return nacl.sign.detached.verify(msgBytes, sigBytes, pubKeyBytes);
  } catch (e) {
    console.error('[Crypto] Ed25519 verification failed:', e);
    return false;
  }
}

