// src/core/inspection/InspectionReportEngine.ts
// MotoCortex v10.0 - Standardized Vehicle Inspection (Ekspertiz) & PDF/JSON Report Engine

export interface InspectionVehicleDetails {
  vin: string;
  make: string;
  model: string;
  year: number;
  odometerKm: number;
  engineCode?: string;
  licensePlate?: string;
}

export interface InspectionDiagnosticSummary {
  totalDtcCount: number;
  dtcCodes: Array<{ code: string; description: string; ecuHeader: string }>;
  healthScore: number; // 0 - 100
  batterySoh: number; // EV Battery State of Health %
  isSafeToDrive: boolean;
}

export interface InspectionReport {
  reportId: string;
  timestamp: string;
  verificationHash: string; // SHA-256 VIN-locked verification hash
  vehicle: InspectionVehicleDetails;
  summary: InspectionDiagnosticSummary;
  technicianName: string;
  notes?: string;
}

export class InspectionReportEngine {
  /**
   * Computes deterministic SHA-256 hex string for immutable report verification.
   */
  public static computeSha256(message: string): string {
    const mathPow = Math.pow;
    const maxWord = mathPow(2, 32);
    const lengthProperty = 'length';
    let i, j;
    let result = '';

    const words: number[] = [];
    const messageLen = message[lengthProperty] * 8;

    let hash: number[] = [
      0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a,
      0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19
    ];

    const k: number[] = [
      0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
      0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
      0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
      0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
      0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
      0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
      0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
      0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
    ];

    let compositeMessage = message + '\x80';
    while (compositeMessage[lengthProperty] % 64 !== 56) {
      compositeMessage += '\x00';
    }
    for (i = 0; i < compositeMessage[lengthProperty]; i++) {
      j = compositeMessage.charCodeAt(i);
      words[i >> 2] |= j << ((3 - i % 4) * 8);
    }
    words[words[lengthProperty]] = (messageLen / maxWord) | 0;
    words[words[lengthProperty]] = messageLen;

    for (j = 0; j < words[lengthProperty];) {
      const w = words.slice(j, j += 16);
      const oldHash = hash.slice(0);

      for (i = 0; i < 64; i++) {
        const w15 = w[i - 15], w2 = w[i - 2];
        const a = hash[0], e = hash[4];
        const s0 = ((w15 >>> 7) | (w15 << 25)) ^ ((w15 >>> 18) | (w15 << 14)) ^ (w15 >>> 3);
        const s1 = ((w2 >>> 17) | (w2 << 15)) ^ ((w2 >>> 19) | (w2 << 13)) ^ (w2 >>> 10);
        w[i] = (i < 16) ? w[i] : (w[i - 16] + s0 + w[i - 7] + s1) | 0;
        const ch = (e & hash[5]) ^ (~e & hash[6]);
        const maj = (a & hash[1]) ^ (a & hash[2]) ^ (hash[1] & hash[2]);
        const temp1 = (hash[7] + (((e >>> 6) | (e << 26)) ^ ((e >>> 11) | (e << 21)) ^ ((e >>> 25) | (e << 7))) + ch + k[i] + w[i]) | 0;
        const temp2 = ((((a >>> 2) | (a << 30)) ^ ((a >>> 13) | (a << 19)) ^ ((a >>> 22) | (a << 10))) + maj) | 0;

        hash = [(temp1 + temp2) | 0].concat(hash);
        hash[4] = (hash[4] + temp1) | 0;
        hash.pop();
      }

      for (i = 0; i < 8; i++) {
        hash[i] = (hash[i] + oldHash[i]) | 0;
      }
    }

    for (i = 0; i < 8; i++) {
      for (j = 3; j >= 0; j--) {
        const b = (hash[i] >> (j * 8)) & 255;
        result += (b < 16 ? '0' : '') + b.toString(16);
      }
    }
    return result.toUpperCase();
  }

  /**
   * Generates a standardized, immutable Inspection Report record with SHA-256 verification hash.
   */
  public static generateReport(
    vehicle: InspectionVehicleDetails,
    summary: InspectionDiagnosticSummary,
    technicianName: string = 'Authorized MotoCortex Diagnostics Tech',
    notes?: string
  ): InspectionReport {
    const timestamp = new Date().toISOString();
    const rawData = `${vehicle.vin}_${timestamp}_${summary.healthScore}_${summary.totalDtcCount}`;
    const sha256 = InspectionReportEngine.computeSha256(rawData);
    const verificationHash = `SHA256-${sha256.substring(0, 16)}-${sha256.substring(16, 32)}`;

    return {
      reportId: `RPT-${Date.now()}`,
      timestamp,
      verificationHash,
      vehicle,
      summary,
      technicianName,
      notes,
    };
  }

  /**
   * Serializes Inspection Report into JSON string for export or cloud storage.
   */
  public static exportToJson(report: InspectionReport): string {
    return JSON.stringify(report, null, 2);
  }
}
