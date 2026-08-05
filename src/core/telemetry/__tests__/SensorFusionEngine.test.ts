// src/core/telemetry/__tests__/SensorFusionEngine.test.ts
import { SensorFusionEngine } from '../SensorFusionEngine';

describe('SensorFusionEngine Telemetry Fusion', () => {
  it('fuses IMU gyro and OBD speed into structured sample', () => {
    const fused = SensorFusionEngine.fuseTelemetry(32.5, 0.45, 0.12, 85, 4500, 84.8);
    expect(fused.obdSpeedKmH).toBe(85);
    expect(fused.obdRpm).toBe(4500);
    expect(fused.calculatedLeanAngleDeg).toBeGreaterThan(30);
    expect(fused.isAnomalyDetected).toBe(false);
  });

  it('detects clutch slip anomaly when RPM > 4000 and speed === 0', () => {
    const fused = SensorFusionEngine.fuseTelemetry(0, 0, 0, 0, 5000);
    expect(fused.isAnomalyDetected).toBe(true);
    expect(fused.anomalyReason).toContain('Clutch Slip');
  });
});
