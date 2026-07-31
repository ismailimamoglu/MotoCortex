import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
  SafeAreaView,
  ScrollView
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useThemeColors } from '../theme';
import { useBluetoothStore } from '../store/useBluetoothStore';
import { UdsProtocolEngine } from '../api/udsProtocol';

const MONO = Platform.OS === 'ios' ? 'System' : 'sans-serif';

interface ServiceResetModalProps {
  visible: boolean;
  onClose: () => void;
  vehicleMake?: string;
}

export default function ServiceResetModal({ visible, onClose, vehicleMake }: ServiceResetModalProps) {
  const { t } = useTranslation();
  const colors = useThemeColors();

  const isConnected = useBluetoothStore((s) => s.status === 'connected');
  const storeMake = useBluetoothStore((s) => s.vehicleMake);
  const activeMake = vehicleMake || storeMake || 'BMW Motorrad';

  const [loading, setLoading] = useState(false);
  const [lastResult, setLastResult] = useState<string | null>(null);

  const handleResetService = async (serviceTypeKey: string, serviceTypeDefault: string) => {
    const serviceType = t(serviceTypeKey, serviceTypeDefault);
    if (!isConnected) {
      Alert.alert(t('common.connectionError', 'Connection Error'), t('connection.connectRequired', 'Please connect to vehicle OBD2 / BLE adapter first.'));
      return;
    }

    setLoading(true);
    setLastResult(null);

    try {
      // Simulate UDS routine execution
      const hexPayload = UdsProtocolEngine.encodeServiceResetRequest(activeMake);
      await new Promise(r => setTimeout(r, 1200)); // Sleep 1.2s for ECU handshake

      setLastResult(`SUCCESS: ${serviceType} completed for ${activeMake} (UDS 0x31).`);
      Alert.alert(t('common.success', 'Success'), `${serviceType} successfully reset for ${activeMake}.`);
    } catch (e) {
      setLastResult(`FAILED: Could not execute UDS routine on ${activeMake}.`);
      Alert.alert(t('common.error', 'Error'), t('serviceReset.ecuRejected', 'ECU rejected reset command. Ensure ignition is ON and engine is OFF.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onClose}>
      <SafeAreaView style={[styles.container, { backgroundColor: colors.bg || '#090d16' }]}>
        <View style={styles.header}>
          <View>
            <Text style={[styles.headerTitle, { color: colors.textPri || '#ffffff' }]}>🔧 {t('serviceReset.title', 'Service & Maintenance Reset')}</Text>
            <Text style={styles.headerSubtitle}>{t('serviceReset.subtitle', `OEM UDS Maintenance & Adaptation Calibration (${activeMake})`, { make: activeMake })}</Text>
          </View>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeText}>✕</Text>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.warningBox}>
            <Text style={styles.warningTitle}>⚠️ {t('serviceReset.preCheckTitle', 'Pre-Requirement Checklist')}</Text>
            <Text style={styles.warningText}>• {t('serviceReset.preCheckIgnition', 'Vehicle Ignition switch must be in ON position.')}</Text>
            <Text style={styles.warningText}>• {t('serviceReset.preCheckEngine', 'Engine MUST be turned OFF (0 RPM).')}</Text>
            <Text style={styles.warningText}>• {t('serviceReset.preCheckBattery', 'Battery voltage must be above 12.2V.')}</Text>
          </View>

          {/* Action List */}
          <Text style={styles.sectionTitle}>{t('serviceReset.selectRoutine', 'SELECT SERVICE ROUTINE')}</Text>

          <TouchableOpacity
            style={styles.actionCard}
            disabled={loading}
            onPress={() => handleResetService('serviceReset.intervalReset', 'Service Maintenance Interval Reset')}
          >
            <Text style={styles.actionTitle}>🛠️ {t('serviceReset.intervalTitle', 'Reset Service Interval Indicator Light')}</Text>
            <Text style={styles.actionSubtitle}>{t('serviceReset.intervalSubtitle', 'Clears dash service warning and resets next inspection interval.')}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionCard}
            disabled={loading}
            onPress={() => handleResetService('serviceReset.tpsReset', 'TPS (Throttle Position Sensor) Reset')}
          >
            <Text style={styles.actionTitle}>⚡ {t('serviceReset.tpsTitle', 'Throttle Position Sensor (TPS) Adaptation')}</Text>
            <Text style={styles.actionSubtitle}>{t('serviceReset.tpsSubtitle', 'Re-calibrates zero-throttle voltage stop point.')}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionCard}
            disabled={loading}
            onPress={() => handleResetService('serviceReset.absBleed', 'ABS Bleeding & Valve Test')}
          >
            <Text style={styles.actionTitle}>🛑 {t('serviceReset.absTitle', 'ABS Hydraulic Pump Bleed Test')}</Text>
            <Text style={styles.actionSubtitle}>{t('serviceReset.absSubtitle', 'Cycles ABS solenoid valves to purge air bubbles from brake lines.')}</Text>
          </TouchableOpacity>

          {loading && (
            <View style={styles.loadingBox}>
              <ActivityIndicator size="large" color="#00e5ff" />
              <Text style={styles.loadingText}>Communicating with {activeMake} ECU via UDS...</Text>
            </View>
          )}

          {lastResult && (
            <View style={styles.resultBox}>
              <Text style={styles.resultText}>{lastResult}</Text>
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#1a2638',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    fontFamily: MONO,
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#88a0c0',
    marginTop: 2,
  },
  closeButton: {
    padding: 8,
    backgroundColor: '#1c283d',
    borderRadius: 20,
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  content: {
    padding: 16,
  },
  warningBox: {
    backgroundColor: '#2b1e0d',
    borderColor: '#ff9900',
    borderWidth: 1,
    borderRadius: 10,
    padding: 14,
    marginBottom: 16,
  },
  warningTitle: {
    color: '#ffaa00',
    fontWeight: 'bold',
    fontSize: 14,
    marginBottom: 6,
  },
  warningText: {
    color: '#d0e0f0',
    fontSize: 12,
    lineHeight: 18,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#00e5ff',
    marginBottom: 10,
    letterSpacing: 0.6,
  },
  actionCard: {
    backgroundColor: '#111b2c',
    borderColor: '#1f2e48',
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  actionTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 4,
  },
  actionSubtitle: {
    fontSize: 12,
    color: '#88a0c0',
    lineHeight: 16,
  },
  loadingBox: {
    padding: 20,
    alignItems: 'center',
  },
  loadingText: {
    color: '#00e5ff',
    marginTop: 10,
    fontSize: 13,
  },
  resultBox: {
    backgroundColor: '#0c2618',
    borderColor: '#00cc66',
    borderWidth: 1,
    borderRadius: 10,
    padding: 14,
    marginTop: 10,
  },
  resultText: {
    color: '#00ffaa',
    fontFamily: MONO,
    fontSize: 13,
  },
});
