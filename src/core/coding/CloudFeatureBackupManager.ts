import { supabase } from '../../api/supabaseClient';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface CloudFeatureBackupRecord {
  id: string;
  vin: string;
  featureId: string;
  featureName: string;
  ecuHeader: string;
  didHex: string;
  originalHexPayload: string;
  modifiedHexPayload: string;
  timestamp: string;
  deviceUuid?: string;
  isSyncedToCloud: boolean;
}

export class CloudFeatureBackupManager {
  private static instance: CloudFeatureBackupManager | null = null;
  private static readonly LOCAL_STORAGE_KEY = '@motocortex_feature_backups_v1';

  private constructor() {}

  public static getInstance(): CloudFeatureBackupManager {
    if (!CloudFeatureBackupManager.instance) {
      CloudFeatureBackupManager.instance = new CloudFeatureBackupManager();
    }
    return CloudFeatureBackupManager.instance;
  }

  /**
   * Save a coding backup locally and attempt sync to Supabase Cloud Vault.
   */
  public async saveBackup(record: Omit<CloudFeatureBackupRecord, 'id' | 'timestamp' | 'isSyncedToCloud'>): Promise<CloudFeatureBackupRecord> {
    const backupRecord: CloudFeatureBackupRecord = {
      ...record,
      id: `bk_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      timestamp: new Date().toISOString(),
      isSyncedToCloud: false,
    };

    // 1. Save to Local Storage
    const existing = await this.getLocalBackups();
    existing.unshift(backupRecord);
    await AsyncStorage.setItem(CloudFeatureBackupManager.LOCAL_STORAGE_KEY, JSON.stringify(existing));

    // 2. Attempt Supabase Cloud Sync
    try {
      if (supabase) {
        const { error } = await supabase.from('coding_backups').insert([{
          id: backupRecord.id,
          vin: backupRecord.vin,
          feature_id: backupRecord.featureId,
          feature_name: backupRecord.featureName,
          ecu_header: backupRecord.ecuHeader,
          did_hex: backupRecord.didHex,
          original_payload: backupRecord.originalHexPayload,
          modified_payload: backupRecord.modifiedHexPayload,
          created_at: backupRecord.timestamp,
        }]);

        if (!error) {
          backupRecord.isSyncedToCloud = true;
          await AsyncStorage.setItem(CloudFeatureBackupManager.LOCAL_STORAGE_KEY, JSON.stringify(existing));
          console.log(`[CloudFeatureBackupManager] Backup ${backupRecord.id} synced to Supabase Cloud.`);
        }
      }
    } catch (e) {
      console.warn('[CloudFeatureBackupManager] Cloud sync failed, retained locally:', e);
    }

    return backupRecord;
  }

  /**
   * Retrieve all backups for a specific vehicle VIN.
   */
  public async getBackupsForVin(vin: string): Promise<CloudFeatureBackupRecord[]> {
    const allLocal = await this.getLocalBackups();
    return allLocal.filter((b) => b.vin.toUpperCase() === vin.toUpperCase());
  }

  private async getLocalBackups(): Promise<CloudFeatureBackupRecord[]> {
    try {
      const raw = await AsyncStorage.getItem(CloudFeatureBackupManager.LOCAL_STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }
}

export default CloudFeatureBackupManager.getInstance();
