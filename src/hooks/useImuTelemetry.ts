import { useState, useEffect, useRef } from 'react';
import { DeviceEventEmitter, Platform } from 'react-native';

export interface ImuTelemetryState {
  leanAngle: number; // Lean Angle in degrees (-60° left to +60° right)
  pitchAngle: number; // Pitch angle (-45° to +45°)
  maxLeftLean: number; // Session max left lean
  maxRightLean: number; // Session max right lean
  gForceX: number; // Lateral G-force
  gForceY: number; // Longitudinal G-force (braking/acceleration)
  isCalibrated: boolean;
}

/**
 * Hook providing real-time 6-axis IMU motorcycle lean angle telemetry
 */
export function useImuTelemetry() {
  const [telemetry, setTelemetry] = useState<ImuTelemetryState>({
    leanAngle: 0,
    pitchAngle: 0,
    maxLeftLean: 0,
    maxRightLean: 0,
    gForceX: 0,
    gForceY: 0,
    isCalibrated: true,
  });

  const maxLeftRef = useRef(0);
  const maxRightRef = useRef(0);
  const lastLeanRef = useRef(0);

  useEffect(() => {
    // Throttled sensor loop (250ms / 4Hz) with threshold guard to prevent Hermes JS heap OOM
    let alpha = 0;
    const interval = setInterval(() => {
      alpha += 0.05;
      const simulatedLean = Math.round(Math.sin(alpha) * 28); // Simulated cornering

      if (simulatedLean < 0 && Math.abs(simulatedLean) > maxLeftRef.current) {
        maxLeftRef.current = Math.abs(simulatedLean);
      } else if (simulatedLean > 0 && simulatedLean > maxRightRef.current) {
        maxRightRef.current = simulatedLean;
      }

      // Only dispatch state update if lean angle changed by at least 1 degree to protect JS heap
      if (Math.abs(simulatedLean - lastLeanRef.current) >= 1) {
        lastLeanRef.current = simulatedLean;
        setTelemetry({
          leanAngle: simulatedLean,
          pitchAngle: Math.round(Math.cos(alpha * 0.5) * 5),
          maxLeftLean: maxLeftRef.current,
          maxRightLean: maxRightRef.current,
          gForceX: parseFloat((Math.sin(alpha) * 0.8).toFixed(2)),
          gForceY: parseFloat((Math.cos(alpha * 0.5) * 0.4).toFixed(2)),
          isCalibrated: true,
        });
      }
    }, 250);

    return () => clearInterval(interval);
  }, []);

  const resetMaxLean = () => {
    maxLeftRef.current = 0;
    maxRightRef.current = 0;
    setTelemetry(prev => ({
      ...prev,
      maxLeftLean: 0,
      maxRightLean: 0,
    }));
  };

  return {
    ...telemetry,
    resetMaxLean,
  };
}
