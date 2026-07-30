import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useResponsive } from '../hooks/useResponsive';

interface VehicleHealthScoreWidgetProps {
  dtcCount: number;
  voltage?: number;
  coolantTemp?: number;
  onOpenAiDoctor?: () => void;
}

export default function VehicleHealthScoreWidget({
  dtcCount,
  voltage = 12.6,
  coolantTemp = 85,
  onOpenAiDoctor
}: VehicleHealthScoreWidgetProps) {
  const { s: scaleWidth, vs: scaleHeight, fs: scaleFont } = useResponsive();

  // Calculate 0-100 score
  let score = 100;
  score -= dtcCount * 25;
  if (voltage < 12.0) score -= 15;
  if (coolantTemp > 105) score -= 20;
  if (score < 0) score = 0;

  const getScoreColor = (val: number) => {
    if (val >= 85) return { color: '#00ffaa', label: 'EXCELLENT' };
    if (val >= 60) return { color: '#ffaa00', label: 'ATTENTION NEEDED' };
    return { color: '#ff3344', label: 'CRITICAL ATTENTION' };
  };

  const status = getScoreColor(score);

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.title}>VEHICLE HEALTH SCORE</Text>
          <Text style={styles.subtitle}>Aggregated ECU & Telemetry Diagnostics</Text>
        </View>
        <View style={styles.scoreBadge}>
          <Text style={[styles.scoreNumber, { color: status.color }]}>{score}</Text>
          <Text style={styles.scoreMax}>/100</Text>
        </View>
      </View>

      {/* Progress Bar */}
      <View style={styles.barBackground}>
        <View style={[styles.barFill, { width: `${score}%`, backgroundColor: status.color }]} />
      </View>

      <View style={styles.footerRow}>
        <Text style={[styles.statusText, { color: status.color }]}>{status.label}</Text>

        {onOpenAiDoctor && (
          <TouchableOpacity style={styles.aiButton} onPress={onOpenAiDoctor}>
            <Text style={styles.aiButtonText}>🤖 Launch AI Doctor</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#0e1626',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#1e2d48',
    padding: 16,
    marginVertical: 10,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#00e5ff',
    letterSpacing: 0.8,
  },
  subtitle: {
    fontSize: 11,
    color: '#7a94b8',
    marginTop: 2,
  },
  scoreBadge: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  scoreNumber: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  scoreMax: {
    fontSize: 12,
    color: '#7a94b8',
    marginLeft: 2,
  },
  barBackground: {
    height: 8,
    backgroundColor: '#162238',
    borderRadius: 4,
    overflow: 'hidden',
    marginVertical: 12,
  },
  barFill: {
    height: '100%',
    borderRadius: 4,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  aiButton: {
    backgroundColor: '#004d66',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#00e5ff',
  },
  aiButtonText: {
    color: '#00ffff',
    fontSize: 12,
    fontWeight: 'bold',
  },
});
