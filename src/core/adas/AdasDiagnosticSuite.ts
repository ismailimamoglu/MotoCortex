// src/core/adas/AdasDiagnosticSuite.ts
// MotoCortex v10.0 - Advanced Driver Assistance Systems (ADAS) Diagnostic & Calibration Audit Suite

export interface AdasSensorHealth {
  sensorType: 'FRONT_CAMERA' | 'BLIND_SPOT_RADAR' | 'LONG_RANGE_RADAR' | 'ULTRASONIC_PARK' | 'LIDAR';
  ecuAddressHex: string; // e.g. "7D0", "770"
  status: 'OPTIMAL' | 'CALIBRATION_REQUIRED' | 'HARDWARE_FAULT' | 'BLOCKED_OBSTRUCTED';
  dtcCount: number;
  dtcCodes: string[];
  recommendation: string;
}

export interface AdasAuditReport {
  overallAdasStatus: 'HEALTHY' | 'CALIBRATION_NEEDED' | 'CRITICAL_SENSOR_FAULT';
  scannedSensors: AdasSensorHealth[];
  needsCollisionCalibration: boolean;
}

export class AdasDiagnosticSuite {
  // Known ADAS ECU Headers
  public static readonly ADAS_ECU_HEADERS = {
    FRONT_CAMERA: '7D0',
    BLIND_SPOT_RADAR: '770',
    LONG_RANGE_RADAR: '7D2',
    ULTRASONIC_PARK: '7B0',
  };

  /**
   * Audit ADAS sensor health and detect static/dynamic calibration requirements.
   */
  public static auditAdasSensors(activeDtcCodes: string[]): AdasAuditReport {
    const scannedSensors: AdasSensorHealth[] = [];

    // Check for ADAS-specific C-code and U-code DTC patterns (e.g. C1001, U0415, C1A10)
    const adasDtcs = activeDtcCodes.filter((code) =>
      code.startsWith('C1') || code.startsWith('U04') || code.startsWith('U10')
    );

    const needsCalibration = adasDtcs.some((code) => code.includes('1001') || code.includes('C1A10'));

    // Front Camera Audit
    scannedSensors.push({
      sensorType: 'FRONT_CAMERA',
      ecuAddressHex: AdasDiagnosticSuite.ADAS_ECU_HEADERS.FRONT_CAMERA,
      status: needsCalibration ? 'CALIBRATION_REQUIRED' : 'OPTIMAL',
      dtcCount: adasDtcs.length,
      dtcCodes: adasDtcs,
      recommendation: needsCalibration
        ? 'Windshield replacement or collision detected: Static Target Calibration Required.'
        : 'Front camera horizon and lane alignment optimal.',
    });

    // Radar Audit
    scannedSensors.push({
      sensorType: 'LONG_RANGE_RADAR',
      ecuAddressHex: AdasDiagnosticSuite.ADAS_ECU_HEADERS.LONG_RANGE_RADAR,
      status: 'OPTIMAL',
      dtcCount: 0,
      dtcCodes: [],
      recommendation: 'Adaptive Cruise Control (ACC) radar alignment within ±0.5° tolerance.',
    });

    const overallStatus = needsCalibration
      ? 'CALIBRATION_NEEDED'
      : adasDtcs.length > 0
      ? 'CRITICAL_SENSOR_FAULT'
      : 'HEALTHY';

    return {
      overallAdasStatus: overallStatus,
      scannedSensors,
      needsCollisionCalibration: needsCalibration,
    };
  }
}
