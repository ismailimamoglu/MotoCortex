import { Platform } from 'react-native';

/**
 * Pure JavaScript SHA-256 implementation.
 * Safe for all JS runtimes, including Expo Go and different simulator targets.
 */
export function sha256(ascii: string): string {
  function rightRotate(value: number, amount: number) {
    return (value >>> amount) | (value << (32 - amount));
  }
  
  const mathPow = Math.pow;
  const maxWord = mathPow(2, 32);
  const lengthProperty = 'length';
  let i, j;

  const result = [];
  const words: number[] = [];
  const asciiLength = ascii[lengthProperty];
  
  const hash = [
    0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19
  ];

  const k = [
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
  ];

  const asciiBitLength = asciiLength * 8;
  
  let paddedAscii = ascii + String.fromCharCode(0x80);
  while ((paddedAscii[lengthProperty] * 8) % 512 !== 448) {
    paddedAscii += String.fromCharCode(0);
  }
  
  for (i = 0; i < paddedAscii[lengthProperty]; i++) {
    const charCode = paddedAscii.charCodeAt(i);
    if (charCode > 0xff) throw new Error("Unicode not supported");
    words[i >> 2] |= charCode << (24 - (i % 4) * 8);
  }
  
  words[words[lengthProperty]] = ((asciiBitLength / maxWord) | 0);
  words[words[lengthProperty]] = (asciiBitLength | 0);
  
  for (i = 0; i < words[lengthProperty]; i += 16) {
    const w: number[] = [];
    let a = hash[0], b = hash[1], c = hash[2], d = hash[3],
        e = hash[4], f = hash[5], g = hash[6], h = hash[7];
        
    for (j = 0; j < 64; j++) {
      if (j < 16) {
        w[j] = words[i + j];
      } else {
        const s0 = rightRotate(w[j - 15], 7) ^ rightRotate(w[j - 15], 18) ^ (w[j - 15] >>> 3);
        const s1 = rightRotate(w[j - 2], 17) ^ rightRotate(w[j - 2], 19) ^ (w[j - 2] >>> 10);
        w[j] = (w[j - 16] + s0 + w[j - 7] + s1) | 0;
      }
      
      const ch = (e & f) ^ (~e & g);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const sigma0 = rightRotate(a, 2) ^ rightRotate(a, 13) ^ rightRotate(a, 22);
      const sigma1 = rightRotate(e, 6) ^ rightRotate(e, 11) ^ rightRotate(e, 25);
      
      const t1 = (h + sigma1 + ch + k[j] + w[j]) | 0;
      const t2 = (sigma0 + maj) | 0;
      
      h = g;
      g = f;
      f = e;
      e = (d + t1) | 0;
      d = c;
      c = b;
      b = a;
      a = (t1 + t2) | 0;
    }
    
    hash[0] = (hash[0] + a) | 0;
    hash[1] = (hash[1] + b) | 0;
    hash[2] = (hash[2] + c) | 0;
    hash[3] = (hash[3] + d) | 0;
    hash[4] = (hash[4] + e) | 0;
    hash[5] = (hash[5] + f) | 0;
    hash[6] = (hash[6] + g) | 0;
    hash[7] = (hash[7] + h) | 0;
  }
  
  for (i = 0; i < 8; i++) {
    let word = hash[i];
    if (word < 0) {
      word += 0x100000000;
    }
    let hex = word.toString(16);
    while (hex.length < 8) {
      hex = '0' + hex;
    }
    result.push(hex);
  }
  
  return result.join('');
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
    return sha256(dataToHash);
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
