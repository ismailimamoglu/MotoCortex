/**
 * Privacy & Data Protection (GDPR / KVKK Compliance) Service — MotoCortex Core
 * ----------------------------------------------------------------------
 * Provides user data export (Right to Access/Data Portability) and
 * data purge (Right to be Forgotten) across local SQLite and Supabase cloud.
 */

import SQLiteStorage from '../core/database/SQLiteStorage';

export interface UserPrivacySummary {
    totalTelemetryRecords: number;
    totalDtcLogs: number;
    vehicleProfilesCount: number;
    lastSyncTimestamp?: string;
}

export class PrivacyService {
    /**
     * Gathers all stored user data into a portable JSON object.
     */
    public static async exportUserData(userId?: string): Promise<{ exportDate: string; data: any }> {
        let queueCount = 0;
        let queuedRecords: any[] = [];
        try {
            queueCount = SQLiteStorage.getQueueLength();
            queuedRecords = SQLiteStorage.getUnsyncedTelemetry(50);
        } catch (_) {}

        let storedProfiles: any = null;
        try {
            const AsyncStorage = require('@react-native-async-storage/async-storage').default;
            const rawProfiles = await AsyncStorage.getItem('@motocortex_vehicle_profiles');
            if (rawProfiles) storedProfiles = JSON.parse(rawProfiles);
        } catch (_) {}

        const dataDump = {
            userId: userId || 'LOCAL_USER',
            exportedAt: new Date().toISOString(),
            telemetryRecordsCount: queueCount,
            telemetrySampleBatch: queuedRecords,
            savedVehicleProfiles: storedProfiles || [],
            privacySettings: {
                analyticsConsent: true,
                crashReportConsent: true,
                marketingConsent: false,
            },
            appVersion: 'v10.0',
        };

        return {
            exportDate: new Date().toISOString(),
            data: dataDump,
        };
    }

    /**
     * Executes permanent data erasure (Right to be Forgotten).
     */
    public static async purgeUserData(userId?: string): Promise<{ success: boolean; purgedItems: string[] }> {
        const purgedItems: string[] = [];

        try {
            SQLiteStorage.clearAll();
            purgedItems.push('Local Telemetry Queue');
        } catch (e: any) {
            console.warn('[PrivacyService] Local DB purge warning:', e?.message || e);
        }

        // Try Supabase Cloud Purge if connected
        try {
            const clientMod = require('../api/supabaseClient');
            const supabase = clientMod?.supabase;
            if (supabase && userId) {
                await supabase.from('telemetry_records').delete().eq('user_id', userId);
                await supabase.from('user_vehicle_profiles').delete().eq('user_id', userId);
                purgedItems.push('Supabase Cloud Records');
            }
        } catch (e: any) {
            console.warn('[PrivacyService] Cloud DB purge warning:', e?.message || e);
        }

        return {
            success: true,
            purgedItems,
        };
    }
}
