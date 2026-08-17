/**
 * scripts/ingest_oem_features.ts
 * 
 * MotoCortex OEM Feature Catalog Validator & Ingestion Engine.
 * Reads JSON feature templates, validates required fields and types,
 * calculates deterministic CRC32 checksums, and produces TypeScript generated modules.
 * 
 * Usage:
 *   npx ts-node scripts/ingest_oem_features.ts [path-to-json-file]
 */

import fs from 'fs';
import path from 'path';
import { OEMFeatureDefinition } from '../src/core/database/types';

function crc32(str: string): number {
    let crc = 0 ^ (-1);
    for (let i = 0; i < str.length; i++) {
        let byte = str.charCodeAt(i);
        crc = (crc >>> 8) ^ CRC_TABLE[(crc ^ byte) & 0xFF];
    }
    return (crc ^ (-1)) >>> 0;
}

const CRC_TABLE = new Uint32Array(256);
for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) {
        c = ((c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1));
    }
    CRC_TABLE[i] = c;
}

function canonicalJsonString(obj: any): string {
    if (obj === null || typeof obj !== 'object') {
        return JSON.stringify(obj);
    }
    if (Array.isArray(obj)) {
        return '[' + obj.map(canonicalJsonString).join(',') + ']';
    }
    const keys = Object.keys(obj).sort();
    return '{' + keys.map(k => JSON.stringify(k) + ':' + canonicalJsonString(obj[k])).join(',') + '}';
}

function validateFeature(feat: any, index: number): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!feat.id || typeof feat.id !== 'string') errors.push(`[#${index}] Missing or invalid 'id'`);
    if (!feat.make || typeof feat.make !== 'string') errors.push(`[#${index}] Missing or invalid 'make'`);
    if (!feat.targetEcuHeader || typeof feat.targetEcuHeader !== 'string') errors.push(`[#${index}] Missing or invalid 'targetEcuHeader'`);
    if (!feat.didHex || typeof feat.didHex !== 'string') errors.push(`[#${index}] Missing or invalid 'didHex'`);
    if (typeof feat.byteIndex !== 'number' || feat.byteIndex < 0) errors.push(`[#${index}] Invalid 'byteIndex' (must be >= 0)`);
    if (typeof feat.bitIndex !== 'number' || feat.bitIndex < 0 || feat.bitIndex > 7) errors.push(`[#${index}] Invalid 'bitIndex' (must be 0..7)`);
    if (!feat.riskLevel || !['LOW', 'MEDIUM', 'HIGH'].includes(feat.riskLevel)) errors.push(`[#${index}] Invalid 'riskLevel'`);

    return {
        valid: errors.length === 0,
        errors
    };
}

function main() {
    const inputPath = process.argv[2] || path.join(process.cwd(), 'catalog_migrated.json');
    console.log(`[*] Ingesting OEM Feature Catalog from: ${inputPath}`);

    if (!fs.existsSync(inputPath)) {
        console.error(`[!] File not found: ${inputPath}`);
        process.exit(1);
    }

    const rawData = fs.readFileSync(inputPath, 'utf8');
    let parsed: any[];

    try {
        parsed = JSON.parse(rawData);
        if (!Array.isArray(parsed)) parsed = [parsed];
    } catch (e: any) {
        console.error(`[!] JSON parse error: ${e.message}`);
        process.exit(1);
    }

    const validRecords: OEMFeatureDefinition[] = [];
    const invalidRecords: { id: string; errors: string[] }[] = [];
    const checksums: Record<string, string> = {};

    parsed.forEach((item, idx) => {
        const check = validateFeature(item, idx);
        if (!check.valid) {
            invalidRecords.push({ id: item.id || `index_${idx}`, errors: check.errors });
        } else {
            const canonical = canonicalJsonString(item);
            const crc = crc32(canonical).toString(16).toUpperCase().padStart(8, '0');
            checksums[item.id] = crc;
            validRecords.push(item);
        }
    });

    console.log(`\n[*] Validation Summary:`);
    console.log(`    Total Read: ${parsed.length}`);
    console.log(`    Valid     : ${validRecords.length}`);
    console.log(`    Invalid   : ${invalidRecords.length}`);

    if (invalidRecords.length > 0) {
        console.warn(`[!] Invalid Records Details:`, invalidRecords.slice(0, 5));
    }

    // Write ingest report
    const reportPath = path.join(process.cwd(), 'ingest_report.json');
    fs.writeFileSync(reportPath, JSON.stringify({
        timestamp: new Date().toISOString(),
        total: parsed.length,
        valid: validRecords.length,
        invalid: invalidRecords.length,
        invalidDetails: invalidRecords
    }, null, 2), 'utf8');
    console.log(`[+] Saved Ingestion Report to: ${reportPath}`);
}

main();
