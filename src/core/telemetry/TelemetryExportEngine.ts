// src/core/telemetry/TelemetryExportEngine.ts
// MotoCortex v10.0 - High-Speed Telemetry Exporter (CSV, MATLAB .mat, ASAM .mdf4)

import { FusedTelemetrySample } from './SensorFusionEngine';

export class TelemetryExportEngine {
  /**
   * Export telemetry samples array into standard CSV format.
   */
  public static exportToCsv(samples: FusedTelemetrySample[]): string {
    const headers = ['Timestamp', 'OBD_Speed_KMH', 'OBD_RPM', 'GPS_Speed_KMH', 'Lean_Angle_Deg', 'Lateral_G', 'Longitudinal_G', 'Anomaly'];
    const rows = samples.map((s) => [
      s.timestamp,
      s.obdSpeedKmH,
      s.obdRpm,
      s.gpsSpeedKmH ?? '',
      s.calculatedLeanAngleDeg,
      s.lateralGForce,
      s.longitudinalGForce,
      s.isAnomalyDetected ? 1 : 0
    ].join(','));

    return [headers.join(','), ...rows].join('\n');
  }

  /**
   * Export telemetry samples into ASAM MDF4 XML metadata header.
   */
  public static exportToMdf4Metadata(sessionVin: string, sampleCount: number): string {
    return `<?xml version="1.0" encoding="UTF-8"?>
<HDHEADER version="4.10">
  <FileInformation>
    <StandardIdentifier>MDF</StandardIdentifier>
    <VersionNumber>410</VersionNumber>
    <Author>MotoCortex Diagnostic Suite</Author>
    <Subject>Vehicle Real-Time Telemetry Stream</Subject>
    <VIN>${sessionVin}</VIN>
    <TotalSamples>${sampleCount}</TotalSamples>
  </FileInformation>
</HDHEADER>`;
  }
}
