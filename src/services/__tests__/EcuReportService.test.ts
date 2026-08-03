import { EcuReportService, AppraisalReportData } from '../EcuReportService';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';

jest.mock('expo-file-system', () => ({
  documentDirectory: '/mock/documents/',
  writeAsStringAsync: jest.fn().mockResolvedValue(undefined),
  EncodingType: { UTF8: 'utf8' }
}));

jest.mock('expo-sharing', () => ({
  isAvailableAsync: jest.fn().mockResolvedValue(true),
  shareAsync: jest.fn().mockResolvedValue(undefined)
}));

describe('EcuReportService Unit Tests', () => {
  const sampleData: AppraisalReportData = {
    vin: 'WBAPM31050A123456',
    vehicleMake: 'BMW',
    vehicleModel: 'F30 320i',
    vehicleYear: 2018,
    mileageKm: 85000,
    healthScore: 92,
    dtcList: [
      {
        code: 'P0300',
        category: 'P',
        description: 'Random/Multiple Cylinder Misfire Detected',
        status: 'HISTORIC'
      }
    ],
    telemetrySnapshot: {
      engineVoltage: 14.2,
      coolantTemp: 90,
      rpm: 820,
      fuelTrim: '+1.5%',
      dpfLoad: 'N/A'
    },
    aiSummary: 'Vehicle ECU telemetry is within normal parameters.',
    maintenanceLogs: [
      { serviceName: 'Engine Oil Change', date: '2026-05-15', km: 80000 }
    ],
    generatedAt: '2026-08-03'
  };

  it('should generate valid HTML containing vehicle metadata and health score', () => {
    const html = EcuReportService.generateHtmlReport(sampleData);
    expect(html).toContain('MotoCortex');
    expect(html).toContain('WBAPM31050A123456');
    expect(html).toContain('BMW');
    expect(html).toContain('F30 320i');
    expect(html).toContain('92 / 100');
    expect(html).toContain('P0300');
  });

  it('should write HTML file to FileSystem and trigger Sharing', async () => {
    const path = await EcuReportService.exportAppraisalReport(sampleData);
    expect(FileSystem.writeAsStringAsync).toHaveBeenCalledWith(
      expect.stringContaining('MotoCortex_Appraisal_WBAPM31050A123456_'),
      expect.any(String),
      { encoding: 'utf8' }
    );
    expect(Sharing.isAvailableAsync).toHaveBeenCalled();
    expect(Sharing.shareAsync).toHaveBeenCalled();
    expect(path).toContain('/mock/documents/');
  });
});
