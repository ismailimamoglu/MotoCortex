// src/screens/ObdHealthScreen.tsx
// MotoCortex v7.9.9 - OBD2 Health & Hardware Capability Diagnostics

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
  Linking
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useBluetooth } from '../hooks/useBluetooth';
import { useBluetoothStore } from '../store/useBluetoothStore';
import { useThemeColors } from '../theme';
import { useResponsive } from '../hooks/useResponsive';
import { triggerHaptic } from '../utils/haptics';

interface ObdHealthScreenProps {
  onBack: () => void;
}

export default function ObdHealthScreen({ onBack }: ObdHealthScreenProps) {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const { fs, ms, vs } = useResponsive();

  // Load metrics from Bluetooth Store
  const adapterCapabilityScore = useBluetoothStore(s => s.adapterCapabilityScore);
  const isCloneDevice = useBluetoothStore(s => s.isCloneDevice);
  const avgRtt = useBluetoothStore(s => s.avgRtt);
  const adapterFirmware = useBluetoothStore(s => s.adapterFirmware) || 'ELM327 v1.5';
  const protocol = useBluetoothStore(s => s.protocol) || 'ISO 15765-4 (CAN)';
  const supportedPids = useBluetoothStore(s => s.supportedPids) || [];
  const ecuStatus = useBluetoothStore(s => s.ecuStatus);

  const isConnected = ecuStatus === 'connected';

  // Quality rating calculation
  const getQualityRating = () => {
    if (!isConnected) return { text: t('common.unknown', 'UNKNOWN'), color: colors.textSec, badge: '⚪' };
    if (adapterCapabilityScore >= 80) {
      return { text: t('health.excellent', 'EXCELLENT (ORIGINAL)'), color: colors.green, badge: '🟢' };
    } else if (adapterCapabilityScore >= 60) {
      return { text: t('health.good', 'GOOD (STANDARD)'), color: colors.amber, badge: '🟡' };
    } else {
      return { text: t('health.clone', 'INCOMPATIBLE / CLONE'), color: colors.red, badge: '🔴' };
    }
  };

  const rating = getQualityRating();

  // Check if a specific PID is supported in the vehicle's registry
  const checkPidSupported = (pidHex: string) => {
    return supportedPids.some(p => p.toUpperCase().startsWith(pidHex.toUpperCase()));
  };

  // Define PIDs to list in the Vehicle Support Checklist
  const monitoredPids = [
    { name: t('sensor.rpm', 'Engine RPM (RPM)'), pid: '0C' },
    { name: t('sensor.speed', 'Vehicle Speed (Speed)'), pid: '0D' },
    { name: t('sensor.coolant', 'Engine Coolant Temp'), pid: '05' },
    { name: t('sensor.throttle', 'Throttle Position (Throttle Pos)'), pid: '11' },
    { name: t('sensor.voltage', 'Control Module Voltage (Voltage)'), pid: '42' },
    { name: t('sensor.maf', 'MAF Air Flow Rate (MAF Flow)'), pid: '10' },
    { name: t('sensor.iat', 'Intake Air Temp'), pid: '0F' },
    { name: t('sensor.load', 'Calculated Engine Load (Engine Load)'), pid: '04' },
    { name: t('sensor.fuel', 'Fuel Level Input (Fuel Level)'), pid: '2F' },
    { name: t('sensor.oilTemp', 'Engine Oil Temp (Oil Temp)'), pid: '5C' }
  ];

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.bg }]} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={[styles.backBtn, { borderColor: colors.border }]} onPress={onBack}>
          <Text style={[styles.backText, { color: colors.textPri, fontSize: fs(14) }]}>
            ← {t('common.back', 'Back')}
          </Text>
        </TouchableOpacity>
        <Text 
          numberOfLines={1}
          ellipsizeMode="tail"
          style={[styles.title, { color: colors.textPri, fontSize: fs(17), fontFamily: colors.mono, flex: 1 }]}
        >
          {t('health.titleMenu', 'OBD2 HEALTH & CAPABILITY')}
        </Text>
      </View>

      {/* 1. Quality & Performance Badge */}
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.cardHeader, { color: colors.textSec, fontSize: fs(11), fontFamily: colors.mono }]}>
          {t('health.adapterQuality', 'ADAPTER QUALITY & PERFORMANCE')}
        </Text>

        <View style={styles.ratingRow}>
          <Text style={styles.ratingBadge}>{rating.badge}</Text>
          <View style={styles.ratingInfo}>
            <Text style={[styles.ratingLabel, { color: rating.color, fontSize: fs(15), fontFamily: colors.mono }]}>
              {rating.text}
            </Text>
            <Text style={[styles.firmwareLabel, { color: colors.textSec, fontSize: fs(11) }]}>
              {t('health.firmware', 'Firmware Version:')} {adapterFirmware}
            </Text>
          </View>
        </View>

        <View style={[styles.divider, { backgroundColor: colors.border }]} />

        <View style={styles.metricsGrid}>
          <View style={styles.metricItem}>
            <Text style={[styles.metricVal, { color: colors.textPri, fontSize: fs(16), fontFamily: colors.mono }]}>
              {isConnected ? `${adapterCapabilityScore}/100` : '—'}
            </Text>
            <Text style={[styles.metricLabel, { color: colors.textSec, fontSize: fs(10) }]}>
              {t('health.capScore', 'Capability Score')}
            </Text>
          </View>

          <View style={styles.metricItem}>
            <Text style={[styles.metricVal, { color: colors.textPri, fontSize: fs(16), fontFamily: colors.mono }]}>
              {isConnected ? `${avgRtt} ms` : '—'}
            </Text>
            <Text style={[styles.metricLabel, { color: colors.textSec, fontSize: fs(10) }]}>
              {t('health.latency', 'Latency (RTT)')}
            </Text>
          </View>

          <View style={styles.metricItem}>
            <Text numberOfLines={1} style={[styles.metricVal, { color: colors.textPri, fontSize: fs(13), fontFamily: colors.mono }]}>
              {isConnected 
                ? (protocol.includes('SIMULATED') ? 'CAN BUS (DEMO)' : protocol.replace(/_/g, ' ').split(' ')[0]) 
                : '—'}
            </Text>
            <Text style={[styles.metricLabel, { color: colors.textSec, fontSize: fs(10) }]}>
              {t('health.protocol', 'Active Protocol')}
            </Text>
          </View>
        </View>
      </View>

      {/* 2. Feature Support Matrix (App Capabilities) */}
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.cardHeader, { color: colors.textSec, fontSize: fs(11), fontFamily: colors.mono }]}>
          {t('health.featureSupport', 'APPLICATION FEATURE MATRIX')}
        </Text>

        <View style={styles.matrixContainer}>
          <View style={styles.matrixRow}>
            <Text style={[styles.matrixLabel, { color: colors.textPri, fontSize: fs(12.5) }]}>
              {t('health.matrixReadCodes', 'Read & Clear Fault Codes')}
            </Text>
            <Text style={[styles.matrixStatus, { color: colors.green, fontSize: fs(12.5), fontFamily: colors.mono }]}>
              ✅ {t('common.supported', 'Supported')}
            </Text>
          </View>

          <View style={styles.matrixRow}>
            <Text style={[styles.matrixLabel, { color: colors.textPri, fontSize: fs(12.5) }]}>
              {t('health.matrixLiveSensors', 'Live Sensor Monitoring (Basic)')}
            </Text>
            <Text style={[styles.matrixStatus, { color: colors.green, fontSize: fs(12.5), fontFamily: colors.mono }]}>
              ✅ {t('common.supported', 'Supported')}
            </Text>
          </View>

          <View style={styles.matrixRow}>
            <Text style={[styles.matrixLabel, { color: colors.textPri, fontSize: fs(12.5) }]}>
              {t('health.matrixBattery', 'Battery / Voltage Test')}
            </Text>
            <Text style={[styles.matrixStatus, { color: colors.green, fontSize: fs(12.5), fontFamily: colors.mono }]}>
              ✅ {t('common.supported', 'Supported')}
            </Text>
          </View>

          <View style={styles.matrixRow}>
            <Text style={[styles.matrixLabel, { color: colors.textPri, fontSize: fs(12.5) }]}>
              {t('health.matrixHighSpeed', 'High-Speed Telemetry (20Hz)')}
            </Text>
            <Text style={[
              styles.matrixStatus, 
              { color: isConnected && avgRtt < 120 ? colors.green : colors.amber, fontSize: fs(12.5), fontFamily: colors.mono }
            ]}>
              {isConnected 
                ? avgRtt < 120 
                  ? `✅ ${t('health.active', 'Active')}`
                  : `⚠️ ${t('health.degraded', 'Degraded (Slow RTT)')}`
                : '—'
              }
            </Text>
          </View>

          <View style={[styles.matrixRow, { borderBottomWidth: 0, paddingBottom: 0 }]}>
            <Text style={[styles.matrixLabel, { color: colors.textPri, fontSize: fs(12.5) }]}>
              {t('health.matrixCoding', 'ECU Coding & Adaptations')}
            </Text>
            <Text style={[
              styles.matrixStatus, 
              { color: isConnected && !isCloneDevice ? colors.green : colors.red, fontSize: fs(12.5), fontFamily: colors.mono }
            ]}>
              {isConnected 
                ? !isCloneDevice 
                  ? `✅ ${t('common.supported', 'Supported')}`
                  : `❌ ${t('health.locked', 'Locked (Safe Mode)')}`
                : '—'
              }
            </Text>
          </View>

          {isConnected && isCloneDevice && (
            <View style={[styles.lockWarningBlock, { backgroundColor: `${colors.red}0F`, borderColor: colors.red }]}>
              <Text style={[styles.lockWarningText, { color: colors.textSec, fontSize: fs(11) }]}>
                ⚠️ <Text style={{ color: colors.red, fontWeight: '800' }}>{t('health.warning', 'SECURITY LOCK:')}</Text> {t('health.lockExplain', 'Your adapter has been flagged as a clone/fake chip. Because clone adapters lack timing precision and can brick the vehicle during write operations, coding and adaptation features are locked. Please obtain an original ELM327 v2.1 or vLinker device for safe coding.')}
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* 3. Vehicle Sensor Checklist (PID Support) */}
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.cardHeader, { color: colors.textSec, fontSize: fs(11), fontFamily: colors.mono }]}>
          {t('health.vehiclePids', 'VEHICLE SENSOR CHECKLIST')}
        </Text>

        <Text style={[styles.checklistDesc, { color: colors.textSec, fontSize: fs(11.5) }]}>
          {t('health.checklistPrompt', 'The standard sensor parameters (PIDs) supported by your vehicle\'s ECU are listed below. Sensors without a checkmark are not reported by your vehicle.')}
        </Text>

        <View style={styles.checklistGrid}>
          {monitoredPids.map((item, idx) => {
            const isSupported = isConnected && checkPidSupported(item.pid);
            return (
              <View key={item.pid + idx} style={[styles.checkRow, { borderBottomColor: colors.border }]}>
                <Text style={[styles.checkName, { color: colors.textPri, fontSize: fs(12) }]}>
                  {item.name}
                </Text>
                <View style={[
                  styles.checkBadge, 
                  { backgroundColor: isSupported ? `${colors.green}15` : `${colors.red}10` }
                ]}>
                  <Text style={[
                    styles.checkBadgeText, 
                    { color: isSupported ? colors.green : colors.red, fontSize: fs(10.5), fontFamily: colors.mono }
                  ]}>
                    {isSupported ? t('health.supportedBadge', '✓ SUPPORTED') : t('health.unsupportedBadge', '❌ UNSUPPORTED')}
                  </Text>
                </View>
              </View>
            );
          })}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    marginTop: 10,
  },
  backBtn: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginEnd: 16,
  },
  backText: {
    fontWeight: '700',
  },
  title: {
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  card: {
    borderRadius: 16,
    borderWidth: 1.2,
    padding: 16,
    marginBottom: 16,
  },
  cardHeader: {
    fontWeight: '900',
    letterSpacing: 0.8,
    marginBottom: 14,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  ratingBadge: {
    fontSize: 28,
  },
  ratingInfo: {
    flex: 1,
  },
  ratingLabel: {
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  firmwareLabel: {
    fontWeight: '600',
    marginTop: 2,
  },
  divider: {
    height: 1,
    marginVertical: 14,
  },
  metricsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  metricItem: {
    flex: 1,
    alignItems: 'center',
  },
  metricVal: {
    fontWeight: '900',
    marginBottom: 4,
  },
  metricLabel: {
    fontWeight: '700',
  },
  matrixContainer: {
    gap: 10,
  },
  matrixRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
    paddingBottom: 8,
  },
  matrixLabel: {
    fontWeight: '600',
    flex: 1,
    marginEnd: 12,
  },
  matrixStatus: {
    fontWeight: '800',
    flexShrink: 0,
  },
  lockWarningBlock: {
    borderWidth: 1.2,
    borderRadius: 10,
    padding: 12,
    marginTop: 10,
  },
  lockWarningText: {
    fontWeight: '600',
    lineHeight: 16,
  },
  checklistDesc: {
    fontWeight: '500',
    lineHeight: 16,
    marginBottom: 14,
  },
  checklistGrid: {
    gap: 2,
  },
  checkRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    paddingVertical: 10,
  },
  checkName: {
    fontWeight: '600',
    flex: 1,
    marginEnd: 10,
  },
  checkBadge: {
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  checkBadgeText: {
    fontWeight: '800',
    letterSpacing: 0.2,
  }
});
