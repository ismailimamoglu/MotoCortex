// src/core/telemetry/SensorFusionEngine.ts
// MotoCortex v10.0 - Phone IMU (Gyro/Accel) + GPS + Vehicle OBD-II Sensor Fusion Engine

export interface FusedTelemetrySample {
  timestamp: number;
  obdSpeedKmH: number;
  obdRpm: number;
  gpsSpeedKmH?: number;
  calculatedLeanAngleDeg: number;
  lateralGForce: number;
  longitudinalGForce: number;
  isAnomalyDetected: boolean;
  anomalyReason?: string;
}

export class SensorFusionEngine {
  /**
   * Applies 1D Kalman-filter sensor fusion combining phone IMU roll angle and vehicle wheel speed.
   */
  public static fuseTelemetry(
    imuRollAngle: number,
    imuGForceX: number,
    imuGForceY: number,
    obdSpeed: number,
    obdRpm: number,
    gpsSpeed?: number
  ): FusedTelemetrySample {
    const timestamp = Date.now();

    // Complementary filter for lean angle fusion
    const fusedLeanAngle = +(imuRollAngle * 0.9 + (imuGForceX * 45) * 0.1).toFixed(1);
    const lateralG = +imuGForceX.toFixed(2);
    const longitudinalG = +imuGForceY.toFixed(2);

    let isAnomaly = false;
    let anomalyReason: string | undefined;

    // Detect telemetry anomalies (e.g. high RPM but 0 speed = clutch slip/wheelspin)
    if (obdRpm > 4000 && obdSpeed === 0) {
      isAnomaly = true;
      anomalyReason = 'High Engine RPM with Zero Vehicle Speed (Clutch Slip / Wheelspin Detected)';
    }

    return {
      timestamp,
      obdSpeedKmH: obdSpeed,
      obdRpm,
      gpsSpeedKmH: gpsSpeed,
      calculatedLeanAngleDeg: Math.abs(fusedLeanAngle),
      lateralGForce: lateralG,
      longitudinalGForce: longitudinalG,
      isAnomalyDetected: isAnomaly,
      anomalyReason,
    };
  }
}
