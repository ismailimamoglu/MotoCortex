/**
 * GlobalUdsEngine.test.ts
 * 
 * Comprehensive Unit Test Suite for MotoCortex Global ECU & UDS Diagnostic Platform.
 */

import { VehicleIdentityEngine } from '../identity/VehicleIdentityEngine';
import { isValidVin, decodeWmi } from '../identity/VehicleFingerprint';
import { UdsClient, UdsService, UdsSessionType, UdsNrcCode } from '../protocol/uds/UdsClient';
import { FeatureActivationEngine } from '../features/FeatureActivationEngine';
import { oemDatabaseProvider } from '../database/OemDatabaseProvider';
import * as fs from 'fs';
import * as path from 'path';

describe('1. Vehicle Identity & Fingerprint Engine Tests', () => {
    const identityEngine = new VehicleIdentityEngine();

    test('Validates ISO 3779 compliant VINs correctly', () => {
        expect(isValidVin('WVWZZZ1KZBP000000')).toBe(true); // Valid Volkswagen VIN
        expect(isValidVin('VF1RFB00000000000')).toBe(true); // Valid Renault VIN
        expect(isValidVin('WBA12345678901234')).toBe(true); // Valid BMW VIN
        expect(isValidVin('INVALID_SHORT_VIN')).toBe(false);
        expect(isValidVin('WVWZZZ1KZBP00000I')).toBe(false); // Contains prohibited 'I'
    });

    test('Decodes WMI (World Manufacturer Identifier) accurately', () => {
        expect(decodeWmi('WVWZZZ1KZBP000000')?.make).toBe('Volkswagen');
        expect(decodeWmi('VF1RFB00000000000')?.make).toBe('Renault');
        expect(decodeWmi('WBA12345678901234')?.make).toBe('BMW');
        expect(decodeWmi('TK812345678901234')?.make).toBe('Togg');
    });

    test('Parses raw OBD Mode 09 02 ASCII/Hex VIN response', () => {
        const rawResponse = `09 02 01 57 56 57 5A 5A 5A 31 4B 5A 42 50 30 30 30 30 30 30`; // WVWZZZ1KZBP000000
        const parsed = identityEngine.parseVinResponse(rawResponse);
        expect(parsed).toBe('WVWZZZ1KZBP000000');
    });
});

describe('2. ISO 14229 UDS Protocol Engine Tests', () => {
    const uds = new UdsClient();

    test('Formats UDS Session Control (0x10) commands', () => {
        expect(uds.buildSessionControlCmd(UdsSessionType.EXTENDED)).toBe('10 03');
    });

    test('Formats UDS Read & Write Data By Identifier (0x22 / 0x2E) commands', () => {
        expect(uds.buildReadDataByIdentifierCmd('0D04')).toBe('22 0D 04');
        expect(uds.buildWriteDataByIdentifierCmd('0D04', '01')).toBe('2E 0D 04 01');
    });

    test('Parses UDS Positive Responses correctly', () => {
        const res = uds.parseResponse('50 03 00 32 01 F4', UdsService.DiagnosticSessionControl);
        expect(res.isPositive).toBe(true);
        expect(res.service).toBe(UdsService.DiagnosticSessionControl);
        expect(res.payloadHex).toBe('003201F4');
    });

    test('Parses UDS Negative Response Codes (NRC) correctly', () => {
        // NRC 0x78 = Response Pending
        const pendingRes = uds.parseResponse('7F 22 78', UdsService.ReadDataByIdentifier);
        expect(pendingRes.isPositive).toBe(false);
        expect(pendingRes.nrcCode).toBe(UdsNrcCode.ResponsePending);
        expect(pendingRes.isResponsePending).toBe(true);

        // NRC 0x33 = Security Access Denied
        const deniedRes = uds.parseResponse('7F 2E 33', UdsService.WriteDataByIdentifier);
        expect(deniedRes.isPositive).toBe(false);
        expect(deniedRes.nrcCode).toBe(UdsNrcCode.SecurityAccessDenied);
        expect(deniedRes.nrcMessage).toBe('Security Access Denied');
    });
});

describe('3. Feature Activation & Safety Guard Tests', () => {
    const featureEngine = new FeatureActivationEngine();

    test('Blocks write operation when vehicle is in motion', () => {
        expect(() => {
            featureEngine.validateSafetyGate({
                batteryVoltage: 13.5,
                vehicleSpeed: 25, // 25 km/h
                isEngineRunning: true
            });
        }).toThrow('SAFETY_VIOLATION_VEHICLE_IN_MOTION');
    });

    test('Blocks write operation when battery voltage is low (< 12.2V)', () => {
        expect(() => {
            featureEngine.validateSafetyGate({
                batteryVoltage: 11.8, // 11.8V
                vehicleSpeed: 0,
                isEngineRunning: false
            });
        }).toThrow('SAFETY_VIOLATION_LOW_VOLTAGE');
    });

    test('Passes safety gate when voltage is healthy (>= 12.2V) and vehicle is stationary', () => {
        expect(() => {
            featureEngine.validateSafetyGate({
                batteryVoltage: 12.6,
                vehicleSpeed: 0,
                isEngineRunning: false
            });
        }).not.toThrow();
    });

    test('Applies bitmask updates correctly for Long Coding', () => {
        // Original byte: 0x00 (00000000). Set bit index 0 to 1 -> 0x01
        const updated = featureEngine.applyBitmaskUpdate('00 00', 0, 0, true);
        expect(updated).toBe('0100');

        // Set bit index 3 to 1 -> 0x09
        const updatedBit3 = featureEngine.applyBitmaskUpdate('01 00', 0, 3, true);
        expect(updatedBit3).toBe('0900');
    });
});

describe('4. Zero-Literal Key-Based OEM Database & 26-Language Matrix Tests', () => {
    test('Contains expanded database with at least 25 registered OEM features', () => {
        expect(oemDatabaseProvider.getTotalFeatureCount()).toBeGreaterThanOrEqual(25);
    });

    test('Retrieves OEM features by brand accurately', () => {
        const vagFeatures = oemDatabaseProvider.getFeaturesForMake('Volkswagen');
        expect(vagFeatures.length).toBeGreaterThanOrEqual(10);
        expect(vagFeatures.some(f => f.id === 'vag_staging_needle_sweep')).toBe(true);

        const bmwFeatures = oemDatabaseProvider.getFeaturesForMake('BMW');
        expect(bmwFeatures.length).toBeGreaterThanOrEqual(6);
        expect(bmwFeatures.some(f => f.id === 'bmw_start_stop_memory')).toBe(true);

        const renaultFeatures = oemDatabaseProvider.getFeaturesForMake('Renault');
        expect(renaultFeatures.length).toBeGreaterThanOrEqual(5);

        const fordFeatures = oemDatabaseProvider.getFeaturesForMake('Ford');
        expect(fordFeatures.length).toBeGreaterThanOrEqual(4);
    });

    test('Verifies structural synchronization of all feature items in en.json and tr.json', () => {
        const enPath = path.join(__dirname, '../../locales/en.json');
        const trPath = path.join(__dirname, '../../locales/tr.json');

        const enData = JSON.parse(fs.readFileSync(enPath, 'utf8'));
        const trData = JSON.parse(fs.readFileSync(trPath, 'utf8'));

        expect(enData.features).toBeDefined();
        expect(trData.features).toBeDefined();
        expect(enData.features.items).toBeDefined();
        expect(trData.features.items).toBeDefined();

        const allFeatures = oemDatabaseProvider.getFeaturesForMake();
        for (const feat of allFeatures) {
            expect(enData.features.items[feat.id]).toBeDefined();
            expect(trData.features.items[feat.id]).toBeDefined();
            expect(enData.features.items[feat.id].name).toBeDefined();
            expect(trData.features.items[feat.id].name).toBeDefined();
        }
    });
});
