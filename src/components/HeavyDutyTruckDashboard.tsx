// src/components/HeavyDutyTruckDashboard.tsx
// MotoCortex Professional Emoji-Free Heavy Duty Commercial Truck Dashboard (J1939 24V)

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useBluetoothStore } from '../store/useBluetoothStore';

export const HeavyDutyTruckDashboard: React.FC = () => {
  const { t } = useTranslation();
  const rpm = useBluetoothStore((s) => s.rpm) || 0;
  const speed = useBluetoothStore((s) => s.speed) || 0;
  const airBrake1 = useBluetoothStore((s) => s.airBrakePressureBar1) ?? 8.2;
  const airBrake2 = useBluetoothStore((s) => s.airBrakePressureBar2) ?? 8.0;
  const defLevel = useBluetoothStore((s) => s.defLevelPercent) ?? 85;
  const engineHours = useBluetoothStore((s) => s.engineHoursTotal) ?? 1420.5;

  return (
    <View style={styles.container}>
      <View style={styles.headerBadge}>
        <Text style={styles.headerTitle}>
          {t('categoryDashboards.heavyDutyTitle', { defaultValue: 'COMMERCIAL HEAVY-DUTY TELEMETRY' })}
        </Text>
      </View>

      <View style={styles.mainRow}>
        <View style={styles.mainCard}>
          <Text style={styles.cardLabel}>
            {t('categoryDashboards.engineSpeed', { defaultValue: 'ENGINE SPEED' })}
          </Text>
          <Text style={styles.cardValue}>{rpm} <Text style={styles.unitText}>RPM</Text></Text>
        </View>

        <View style={styles.mainCard}>
          <Text style={styles.cardLabel}>
            {t('categoryDashboards.vehicleSpeed', { defaultValue: 'VEHICLE SPEED' })}
          </Text>
          <Text style={styles.cardValue}>{speed} <Text style={styles.unitText}>KM/H</Text></Text>
        </View>
      </View>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>
          {t('categoryDashboards.pneumaticAirBrake', { defaultValue: 'PNEUMATIC AIR BRAKE SYSTEMS' })}
        </Text>
      </View>

      <View style={styles.brakeGrid}>
        <View style={styles.brakeCard}>
          <Text style={styles.brakeLabel}>
            {t('categoryDashboards.airBrake1', { defaultValue: 'AIR BRAKE CIRCUIT 1' })}
          </Text>
          <Text style={styles.brakeValue}>{airBrake1} BAR</Text>
          <View style={styles.statusBarBg}>
            <View style={[styles.statusBarFill, { width: `${Math.min(100, (airBrake1 / 12) * 100)}%` }]} />
          </View>
        </View>

        <View style={styles.brakeCard}>
          <Text style={styles.brakeLabel}>
            {t('categoryDashboards.airBrake2', { defaultValue: 'AIR BRAKE CIRCUIT 2' })}
          </Text>
          <Text style={styles.brakeValue}>{airBrake2} BAR</Text>
          <View style={styles.statusBarBg}>
            <View style={[styles.statusBarFill, { width: `${Math.min(100, (airBrake2 / 12) * 100)}%` }]} />
          </View>
        </View>
      </View>

      <View style={styles.auxGrid}>
        <View style={styles.auxCard}>
          <Text style={styles.auxLabel}>
            {t('categoryDashboards.adBlueDefLevel', { defaultValue: 'ADBLUE / DEF LEVEL' })}
          </Text>
          <Text style={styles.auxValue}>{defLevel}%</Text>
        </View>

        <View style={styles.auxCard}>
          <Text style={styles.auxLabel}>
            {t('categoryDashboards.engineOperatingHours', { defaultValue: 'ENGINE OPERATING HOURS' })}
          </Text>
          <Text style={styles.auxValue}>{engineHours} HR</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: '#0F172A',
    borderRadius: 16,
    marginVertical: 8,
    borderWidth: 1,
    borderColor: '#334155',
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
    color: '#F59E0B',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
  },
  mainRow: {
    flexDirection: 'row',
    gap: 12,
  },
  mainCard: {
    flex: 1,
    backgroundColor: '#1E293B',
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#475569',
  },
  cardLabel: {
    color: '#94A3B8',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  cardValue: {
    color: '#F8FAFC',
    fontSize: 22,
    fontWeight: '800',
    marginTop: 4,
  },
  unitText: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '500',
  },
  sectionHeader: {
    marginTop: 16,
    marginBottom: 8,
  },
  sectionTitle: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  brakeGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  brakeCard: {
    flex: 1,
    backgroundColor: '#1E293B',
    padding: 12,
    borderRadius: 10,
  },
  brakeLabel: {
    color: '#64748B',
    fontSize: 9,
    fontWeight: '700',
  },
  brakeValue: {
    color: '#38BDF8',
    fontSize: 16,
    fontWeight: '700',
    marginVertical: 4,
  },
  statusBarBg: {
    height: 4,
    backgroundColor: '#334155',
    borderRadius: 2,
    overflow: 'hidden',
  },
  statusBarFill: {
    height: '100%',
    backgroundColor: '#38BDF8',
  },
  auxGrid: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
  },
  auxCard: {
    flex: 1,
    backgroundColor: '#1E293B',
    padding: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  auxLabel: {
    color: '#64748B',
    fontSize: 9,
    fontWeight: '700',
  },
  auxValue: {
    color: '#10B981',
    fontSize: 15,
    fontWeight: '700',
    marginTop: 4,
  },
});
