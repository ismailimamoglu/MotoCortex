// src/core/adas/__tests__/AdasDiagnosticSuite.test.ts
import { AdasDiagnosticSuite } from '../AdasDiagnosticSuite';

describe('AdasDiagnosticSuite Sensor & Calibration Audit', () => {
  it('audits healthy ADAS sensors when no DTCs are present', () => {
    const report = AdasDiagnosticSuite.auditAdasSensors([]);
    expect(report.overallAdasStatus).toBe('HEALTHY');
    expect(report.needsCollisionCalibration).toBe(false);
    expect(report.scannedSensors.length).toBeGreaterThan(0);
  });

  it('detects static calibration requirement when C1001 DTC is active', () => {
    const report = AdasDiagnosticSuite.auditAdasSensors(['C1001', 'U0415']);
    expect(report.overallAdasStatus).toBe('CALIBRATION_NEEDED');
    expect(report.needsCollisionCalibration).toBe(true);
    expect(report.scannedSensors[0].recommendation).toContain('Static Target Calibration Required');
  });
});
