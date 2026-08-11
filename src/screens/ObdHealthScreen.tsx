// src/screens/ObdHealthScreen.tsx
// MotoCortex v7.9.9 - OBD2 Health & Hardware Capability Diagnostics

import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useBluetoothStore } from '../store/useBluetoothStore';
import { useThemeColors } from '../theme';
import { useResponsive } from '../hooks/useResponsive';

interface ObdHealthScreenProps {
  onBack?: () => void;
}

export default function ObdHealthScreen({ onBack }: ObdHealthScreenProps) {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const { fs } = useResponsive();

  // Load metrics from Bluetooth Store
  const adapterCapabilityScore = useBluetoothStore(s => s.adapterCapabilityScore);
  const isCloneDevice = useBluetoothStore(s => s.isCloneDevice);
  const avgRtt = useBluetoothStore(s => s.avgRtt);
  const adapterFirmware = useBluetoothStore(s => s.adapterFirmware) || 'ELM327 v1.5';
  const rawProtocol = useBluetoothStore(s => s.protocol) || 'ISO 15765-4 (CAN)';
  const supportedPids = useBluetoothStore(s => s.supportedPids) || [];
  const ecuStatus = useBluetoothStore(s => s.ecuStatus);

  const isConnected = ecuStatus === 'connected';

  // Quality rating calculation
  const rating = useMemo(() => {
    if (!isConnected) return { text: t('common.unknown'), color: colors.textSec, badge: '' };
    if (adapterCapabilityScore >= 80) {
      return { text: t('health.excellent'), color: colors.green, badge: '' };
    } else if (adapterCapabilityScore >= 60) {
      return { text: t('health.good'), color: colors.amber, badge: '' };
    } else {
      return { text: t('health.clone'), color: colors.red, badge: '' };
    }
  }, [isConnected, adapterCapabilityScore, t, colors]);

  // Clean protocol display
  const protocolDisplay = useMemo(() => {
    if (!isConnected) return '—';
    if (rawProtocol.includes('SIMULATED') || rawProtocol.includes('DEMO')) {
      return 'CAN BUS (DEMO)';
    }
    const clean = rawProtocol.replace(/_/g, ' ');
    if (clean.includes('15765') || clean.includes('CAN')) return 'CAN BUS (500k)';
    if (clean.includes('14230') || clean.includes('KWP')) return 'KWP2000';
    if (clean.includes('9141')) return 'ISO 9141-2';
    return clean.split(' ')[0] || clean;
  }, [isConnected, rawProtocol]);

  // Check if a specific PID is supported in the vehicle's registry
  const checkPidSupported = (pidHex: string) => {
    return supportedPids.some(p => p.toUpperCase().startsWith(pidHex.toUpperCase()));
  };

  // Define PIDs to list in the Vehicle Support Checklist
  const monitoredPids = useMemo(() => [
    { name: t('sensor.rpm'), pid: '0C' },
    { name: t('sensor.speed'), pid: '0D' },
    { name: t('sensor.coolant'), pid: '05' },
    { name: t('sensor.throttle'), pid: '11' },
    { name: t('sensor.voltage'), pid: '42' },
    { name: t('sensor.maf'), pid: '10' },
    { name: t('sensor.iat'), pid: '0F' },
    { name: t('sensor.load'), pid: '04' },
    { name: t('sensor.fuel'), pid: '2F' },
    { name: t('sensor.oilTemp'), pid: '5C' }
  ], [t]);

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.bg }]} contentContainerStyle={styles.content}>
      {/* 1. Quality & Performance Badge */}
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.cardHeader, { color: colors.textSec, fontSize: fs(11), fontFamily: colors.mono }]}>
          {t('health.adapterQuality')}
        </Text>

        <View style={styles.ratingRow}>
          <View style={styles.ratingInfo}>
            <Text style={[styles.ratingLabel, { color: rating.color, fontSize: fs(14.5), fontFamily: colors.mono }]}>
              {rating.text}
            </Text>
            <Text style={[styles.firmwareLabel, { color: colors.textSec, fontSize: fs(11) }]}>
              {t('health.firmware')} {adapterFirmware}
            </Text>
          </View>
        </View>

        <View style={[styles.divider, { backgroundColor: colors.border }]} />

        <View style={styles.metricsGrid}>
          <View style={styles.metricItem}>
            <Text style={[styles.metricVal, { color: colors.textPri, fontSize: fs(15), fontFamily: colors.mono }]}>
              {isConnected ? `${adapterCapabilityScore}/100` : '—'}
            </Text>
            <Text style={[styles.metricLabel, { color: colors.textSec, fontSize: fs(9.5) }]} numberOfLines={1}>
              {t('health.capScore')}
            </Text>
          </View>

          <View style={styles.metricItem}>
            <Text style={[styles.metricVal, { color: colors.textPri, fontSize: fs(15), fontFamily: colors.mono }]}>
              {isConnected ? `${avgRtt || 22} ms` : '—'}
            </Text>
            <Text style={[styles.metricLabel, { color: colors.textSec, fontSize: fs(9.5) }]} numberOfLines={1}>
              {t('health.latency')}
            </Text>
          </View>

          <View style={styles.metricItem}>
            <Text 
              adjustsFontSizeToFit
              minimumFontScale={0.75}
              numberOfLines={1} 
              style={[styles.metricVal, { color: colors.textPri, fontSize: fs(12), fontFamily: colors.mono }]}
            >
              {protocolDisplay}
            </Text>
            <Text style={[styles.metricLabel, { color: colors.textSec, fontSize: fs(9.5) }]} numberOfLines={1}>
              {t('health.protocol')}
            </Text>
          </View>
        </View>
      </View>

      {/* 2. Feature Support Matrix (App Capabilities) */}
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.cardHeader, { color: colors.textSec, fontSize: fs(11), fontFamily: colors.mono }]}>
          {t('health.featureSupport')}
        </Text>

        <View style={styles.matrixContainer}>
          <View style={styles.matrixRow}>
            <Text style={[styles.matrixLabel, { color: colors.textPri, fontSize: fs(12) }]}>
              {t('health.matrixReadCodes')}
            </Text>
            <Text style={[styles.matrixStatus, { color: colors.green, fontSize: fs(12), fontFamily: colors.mono }]}>
              {t('common.supported')}
            </Text>
          </View>

          <View style={styles.matrixRow}>
            <Text style={[styles.matrixLabel, { color: colors.textPri, fontSize: fs(12) }]}>
              {t('health.matrixLiveSensors')}
            </Text>
            <Text style={[styles.matrixStatus, { color: colors.green, fontSize: fs(12), fontFamily: colors.mono }]}>
              {t('common.supported')}
            </Text>
          </View>

          <View style={styles.matrixRow}>
            <Text style={[styles.matrixLabel, { color: colors.textPri, fontSize: fs(12) }]}>
              {t('health.matrixBattery')}
            </Text>
            <Text style={[styles.matrixStatus, { color: colors.green, fontSize: fs(12), fontFamily: colors.mono }]}>
              {t('common.supported')}
            </Text>
          </View>

          <View style={styles.matrixRow}>
            <Text style={[styles.matrixLabel, { color: colors.textPri, fontSize: fs(12) }]}>
              {t('health.matrixHighSpeed')}
            </Text>
            <Text style={[
              styles.matrixStatus, 
              { color: isConnected && avgRtt < 120 ? colors.green : colors.amber, fontSize: fs(12), fontFamily: colors.mono }
            ]}>
              {isConnected 
                ? avgRtt < 120 
                  ? t('health.active')
                  : t('health.degraded')
                : '—'
              }
            </Text>
          </View>

          <View style={[styles.matrixRow, { borderBottomWidth: 0, paddingBottom: 0 }]}>
            <Text style={[styles.matrixLabel, { color: colors.textPri, fontSize: fs(12) }]}>
              {t('health.matrixCoding')}
            </Text>
            <Text style={[
              styles.matrixStatus, 
              { color: isConnected && !isCloneDevice ? colors.green : colors.red, fontSize: fs(12), fontFamily: colors.mono }
            ]}>
              {isConnected 
                ? !isCloneDevice 
                  ? t('common.supported')
                  : t('health.locked')
                : '—'
              }
            </Text>
          </View>

          {isConnected && isCloneDevice && (
            <View style={[styles.lockWarningBlock, { backgroundColor: `${colors.red}0F`, borderColor: colors.red }]}>
              <Text style={[styles.lockWarningText, { color: colors.textSec, fontSize: fs(10.5) }]}>
                <Text style={{ color: colors.red, fontWeight: '800' }}>{t('health.warning')}</Text> {t('health.lockExplain')}
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* 3. Vehicle Sensor Checklist (PID Support) */}
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.cardHeader, { color: colors.textSec, fontSize: fs(11), fontFamily: colors.mono }]}>
          {t('health.vehiclePids')}
        </Text>

        <Text style={[styles.checklistDesc, { color: colors.textSec, fontSize: fs(11) }]}>
          {t('health.checklistPrompt', "The standard live sensor parameters supported by your vehicle's ECU are listed below.")}
        </Text>

        <View style={styles.checklistGrid}>
          {monitoredPids.map((item, idx) => {
            const isSupported = isConnected && checkPidSupported(item.pid);
            return (
              <View key={item.pid + idx} style={[styles.checkRow, { borderBottomColor: colors.border }]}>
                <Text style={[styles.checkName, { color: colors.textPri, fontSize: fs(11.5) }]}>
                  {item.name}
                </Text>
                <View style={[
                  styles.checkBadge, 
                  { backgroundColor: isSupported ? `${colors.green}15` : `${colors.red}10` }
                ]}>
                  <Text style={[
                    styles.checkBadgeText, 
                    { color: isSupported ? colors.green : colors.red, fontSize: fs(10), fontFamily: colors.mono }
                  ]}>
                    {isSupported ? t('health.supportedBadge') : t('health.unsupportedBadge')}
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
    gap: 8,
  },
  metricItem: {
    flex: 1,
    alignItems: 'center',
  },
  metricVal: {
    fontWeight: '900',
    marginBottom: 4,
    textAlign: 'center',
  },
  metricLabel: {
    fontWeight: '700',
    textAlign: 'center',
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
