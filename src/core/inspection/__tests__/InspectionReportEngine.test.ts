// src/core/inspection/__tests__/InspectionReportEngine.test.ts
import { InspectionReportEngine } from '../InspectionReportEngine';

describe('InspectionReportEngine Vehicle Expertise Generator', () => {
  it('generates a valid InspectionReport with SHA-256 verification hash', () => {
    const vehicle = {
      vin: 'WVWZZZ3CZWE123456',
      make: 'Volkswagen',
      model: 'Passat',
      year: 2022,
      odometerKm: 45000,
    };

    const summary = {
      totalDtcCount: 0,
      dtcCodes: [],
      healthScore: 98,
      batterySoh: 100,
      isSafeToDrive: true,
    };

    const report = InspectionReportEngine.generateReport(vehicle, summary, 'Master Tech Ismail');

    expect(report).toHaveProperty('reportId');
    expect(report.verificationHash).toContain('SHA256');
    expect(report.vehicle.vin).toBe('WVWZZZ3CZWE123456');
    expect(report.summary.healthScore).toBe(98);

    const jsonExport = InspectionReportEngine.exportToJson(report);
    expect(jsonExport).toContain('WVWZZZ3CZWE123456');
    expect(jsonExport).toContain('Master Tech Ismail');
  });
});
