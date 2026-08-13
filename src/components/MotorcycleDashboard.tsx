// src/components/MotorcycleDashboard.tsx
// MotoCortex Professional Emoji-Free High-Contrast Motorcycle Dashboard

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useBluetoothStore } from '../store/useBluetoothStore';
import { CircularGauge } from './CircularGauge';

export const MotorcycleDashboard: React.FC = () => {
  const { t } = useTranslation();
  const rpm = useBluetoothStore((s) => s.rpm) || 0;
  const speed = useBluetoothStore((s) => s.speed) || 0;
  const coolant = useBluetoothStore((s) => s.coolant);
  const voltage = useBluetoothStore((s) => s.voltage) || '--V';

  // Calculate gear heuristic based on RPM & Speed
  const gear = speed > 0 && rpm > 0 ? Math.min(6, Math.max(1, Math.round(speed / (rpm / 350)))) : 'N';

  return (
    <View style={styles.container}>
      <View style={styles.headerBadge}>
        <Text style={styles.headerTitle}>
          {t('categoryDashboards.motorcycleTitle', { defaultValue: 'MOTORCYCLE TELEMETRY COCKPIT' })}
        </Text>
      </View>

      <View style={styles.gaugeRow}>
        <View style={styles.gaugeBox}>
          <CircularGauge
            value={rpm}
            maxValue={16000}
            label={t('dashboard.rpm', { defaultValue: 'RPM' })}
            unit="RPM"
          />
        </View>

        <View style={styles.centerStatBox}>
          <Text style={styles.gearLabel}>
            {t('categoryDashboards.gear', { defaultValue: 'GEAR' })}
          </Text>
          <Text style={styles.gearValue}>{gear}</Text>
          <Text style={styles.speedValue}>{speed} <Text style={styles.unitText}>KM/H</Text></Text>
        </View>
      </View>

      <View style={styles.metricsGrid}>
        <View style={styles.metricCard}>
          <Text style={styles.metricLabel}>{t('dashboard.coolant', { defaultValue: 'COOLANT' })}</Text>
          <Text style={styles.metricValue}>{coolant !== null ? `${coolant}°C` : '--'}</Text>
        </View>

        <View style={styles.metricCard}>
          <Text style={styles.metricLabel}>{t('dashboard.voltage', { defaultValue: 'BATTERY' })}</Text>
          <Text style={styles.metricValue}>{voltage}</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: '#090D16',
    borderRadius: 16,
    marginVertical: 8,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  headerBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#1E293B',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    marginBottom: 16,
  },
  headerTitle: {
    color: '#38BDF8',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
  },
  gaugeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  gaugeBox: {
    flex: 1,
    alignItems: 'center',
  },
  centerStatBox: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: '#0F172A',
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  gearLabel: {
    color: '#94A3B8',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
  },
  gearValue: {
    color: '#F8FAFC',
    fontSize: 36,
    fontWeight: '900',
    marginVertical: 2,
  },
  speedValue: {
    color: '#38BDF8',
    fontSize: 18,
    fontWeight: '800',
  },
  unitText: {
    fontSize: 11,
    color: '#64748B',
  },
  metricsGrid: {
    flexDirection: 'row',
    marginTop: 16,
    gap: 12,
  },
  metricCard: {
    flex: 1,
    backgroundColor: '#0F172A',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#1E293B',
    alignItems: 'center',
  },
  metricLabel: {
    color: '#64748B',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  metricValue: {
    color: '#F1F5F9',
    fontSize: 16,
    fontWeight: '700',
    marginTop: 4,
  },
});
