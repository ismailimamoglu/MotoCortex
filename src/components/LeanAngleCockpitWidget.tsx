import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { useImuTelemetry } from '../hooks/useImuTelemetry';

const MONO = Platform.OS === 'ios' ? 'System' : 'sans-serif';

interface LeanAngleCockpitWidgetProps {
  currentRpm?: number;
  currentSpeed?: number;
}

export default function LeanAngleCockpitWidget({
  currentRpm = 0,
  currentSpeed = 0
}: LeanAngleCockpitWidgetProps) {
  const { leanAngle, pitchAngle, maxLeftLean, maxRightLean, gForceX, gForceY, resetMaxLean } = useImuTelemetry();

  // Angle indicator position
  const absLean = Math.abs(leanAngle);
  const direction = leanAngle < 0 ? 'LEFT' : leanAngle > 0 ? 'RIGHT' : 'CENTER';

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>🏍️ LEAN ANGLE & TELEMETRY STUDIO</Text>
        <TouchableOpacity style={styles.resetButton} onPress={resetMaxLean}>
          <Text style={styles.resetText}>RESET MAX</Text>
        </TouchableOpacity>
      </View>

      {/* Main Gauge View */}
      <View style={styles.gaugeContainer}>
        {/* Left Max */}
        <View style={styles.maxBox}>
          <Text style={styles.maxLabel}>MAX LEFT</Text>
          <Text style={[styles.maxValue, { color: '#00e5ff' }]}>{maxLeftLean}°</Text>
        </View>

        {/* Current Lean Degree */}
        <View style={styles.centerGauge}>
          <Text style={styles.currentDegree}>{absLean}°</Text>
          <Text style={[styles.directionText, { color: direction === 'LEFT' ? '#00e5ff' : direction === 'RIGHT' ? '#ff8800' : '#88a0c0' }]}>
            {direction}
          </Text>
        </View>

        {/* Right Max */}
        <View style={styles.maxBox}>
          <Text style={styles.maxLabel}>MAX RIGHT</Text>
          <Text style={[styles.maxValue, { color: '#ff8800' }]}>{maxRightLean}°</Text>
        </View>
      </View>

      {/* Dynamic Visual Lean Arch Bar */}
      <View style={styles.archBarContainer}>
        <View style={styles.archBackground}>
          <View
            style={[
              styles.archIndicator,
              {
                left: `${Math.min(Math.max(((leanAngle + 50) / 100) * 100, 5), 95)}%`,
                backgroundColor: leanAngle < 0 ? '#00e5ff' : leanAngle > 0 ? '#ff8800' : '#ffffff',
              },
            ]}
          />
        </View>
        <View style={styles.archLabels}>
          <Text style={styles.archText}>50° L</Text>
          <Text style={styles.archText}>0°</Text>
          <Text style={styles.archText}>50° R</Text>
        </View>
      </View>

      {/* G-Force & Secondary Telemetry Grid */}
      <View style={styles.statsGrid}>
        <View style={styles.statBox}>
          <Text style={styles.statLabel}>LATERAL G</Text>
          <Text style={styles.statValue}>{gForceX} G</Text>
        </View>

        <View style={styles.statBox}>
          <Text style={styles.statLabel}>LONGITUDINAL G</Text>
          <Text style={styles.statValue}>{gForceY} G</Text>
        </View>

        <View style={styles.statBox}>
          <Text style={styles.statLabel}>PITCH</Text>
          <Text style={styles.statValue}>{pitchAngle}°</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#0a1220',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#192b47',
    padding: 16,
    marginVertical: 10,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  title: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#00ffff',
    letterSpacing: 0.6,
  },
  resetButton: {
    backgroundColor: '#162844',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#26426c',
  },
  resetText: {
    color: '#88b0e0',
    fontSize: 10,
    fontWeight: 'bold',
  },
  gaugeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    marginVertical: 6,
  },
  maxBox: {
    alignItems: 'center',
  },
  maxLabel: {
    fontSize: 10,
    color: '#7a94b8',
    fontWeight: 'bold',
  },
  maxValue: {
    fontSize: 22,
    fontWeight: 'bold',
    fontFamily: MONO,
    marginTop: 2,
  },
  centerGauge: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#111d33',
    borderWidth: 2,
    borderColor: '#00e5ff',
  },
  currentDegree: {
    fontSize: 34,
    fontWeight: 'bold',
    color: '#ffffff',
    fontFamily: MONO,
  },
  directionText: {
    fontSize: 11,
    fontWeight: 'bold',
    marginTop: -2,
  },
  archBarContainer: {
    marginVertical: 14,
  },
  archBackground: {
    height: 6,
    backgroundColor: '#182740',
    borderRadius: 3,
    position: 'relative',
  },
  archIndicator: {
    position: 'absolute',
    width: 14,
    height: 14,
    borderRadius: 7,
    top: -4,
    marginLeft: -7,
  },
  archLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  archText: {
    fontSize: 10,
    color: '#6580a8',
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#16243b',
  },
  statBox: {
    alignItems: 'center',
    flex: 1,
  },
  statLabel: {
    fontSize: 9,
    color: '#7a94b8',
    fontWeight: 'bold',
  },
  statValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#d0e0f8',
    marginTop: 2,
    fontFamily: MONO,
  },
});
