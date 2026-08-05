// src/core/telemetry/__tests__/TelemetryExportEngine.test.ts
import { TelemetryExportEngine } from '../TelemetryExportEngine';
import { SensorFusionEngine } from '../SensorFusionEngine';

describe('TelemetryExportEngine CSV & MDF4 Exporter', () => {
  it('converts telemetry samples into valid CSV string', () => {
    const samples = [
      SensorFusionEngine.fuseTelemetry(15, 0.2, 0.1, 60, 3000),
      SensorFusionEngine.fuseTelemetry(20, 0.3, 0.2, 70, 3500),
    ];

    const csv = TelemetryExportEngine.exportToCsv(samples);
    expect(csv).toContain('Timestamp,OBD_Speed_KMH,OBD_RPM');
    expect(csv).toContain('60,3000');
    expect(csv).toContain('70,3500');
  });

  it('generates valid MDF4 ASAM XML metadata header', () => {
    const mdf4 = TelemetryExportEngine.exportToMdf4Metadata('WVWZZZ3CZWE123456', 500);
    expect(mdf4).toContain('MDF');
    expect(mdf4).toContain('WVWZZZ3CZWE123456');
    expect(mdf4).toContain('<TotalSamples>500</TotalSamples>');
  });
});
