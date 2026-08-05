// src/core/coding/__tests__/CloudFeatureBackupManager.test.ts
import CloudFeatureBackupManager from '../CloudFeatureBackupManager';

jest.mock('../../../api/supabaseClient', () => ({
  supabase: null,
}));

describe('CloudFeatureBackupManager Vault', () => {
  it('saves local feature coding backups and returns structured record', async () => {
    const record = await CloudFeatureBackupManager.saveBackup({
      vin: 'WVWZZZ3CZWE123456',
      featureId: 'toyota_keyless_window_down',
      featureName: 'Toyota Key Fob Window Open',
      ecuHeader: '750',
      didHex: '2001',
      originalHexPayload: '00',
      modifiedHexPayload: '01',
    });

    expect(record).toHaveProperty('id');
    expect(record.vin).toBe('WVWZZZ3CZWE123456');
    expect(record.originalHexPayload).toBe('00');
    expect(record.modifiedHexPayload).toBe('01');

    const vinBackups = await CloudFeatureBackupManager.getBackupsForVin('WVWZZZ3CZWE123456');
    expect(vinBackups.length).toBeGreaterThan(0);
    expect(vinBackups[0].featureId).toBe('toyota_keyless_window_down');
  });
});
