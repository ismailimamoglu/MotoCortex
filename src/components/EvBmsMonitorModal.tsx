import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Platform,
  SafeAreaView
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useThemeColors } from '../theme';

const MONO = Platform.OS === 'ios' ? 'System' : 'sans-serif';

interface EvBmsMonitorModalProps {
  visible: boolean;
  onClose: () => void;
  evBrand?: string;
}

export default function EvBmsMonitorModal({ visible, onClose, evBrand = 'Zero / NIU Electric' }: EvBmsMonitorModalProps) {
  const { t } = useTranslation();
  const colors = useThemeColors();

  // Simulated 16-Cell Pack Voltages (V)
  const cellVoltages = [
    3.84, 3.85, 3.84, 3.83,
    3.84, 3.85, 3.84, 3.84,
    3.83, 3.84, 3.85, 3.84,
    3.84, 3.83, 3.84, 3.84
  ];

  const minCell = Math.min(...cellVoltages);
  const maxCell = Math.max(...cellVoltages);
  const deltamV = Math.round((maxCell - minCell) * 1000);

  const sohPercent = 96; // State of Health
  const socPercent = 78; // State of Charge
  const batteryTempC = 29; // Battery Pack Temp

  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onClose}>
      <SafeAreaView style={[styles.container, { backgroundColor: colors.bg || '#090d16' }]}>
        <View style={styles.header}>
          <View>
            <Text style={[styles.headerTitle, { color: colors.textPri || '#ffffff' }]}>⚡ {t('evBms.title', 'EV BMS Diagnostics')}</Text>
            <Text style={styles.headerSubtitle}>{t('evBms.subtitle', { brand: evBrand }, `Battery Management System & Cell Health (${evBrand})`)}</Text>
          </View>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeText}>✕</Text>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.content}>
          {/* SOH / SOC Metrics */}
          <View style={styles.metricsRow}>
            <View style={[styles.metricCard, { backgroundColor: '#0d2d23', borderColor: '#00cc66' }]}>
              <Text style={styles.metricLabel}>{t('evBms.sohLabel', 'STATE OF HEALTH (SOH)')}</Text>
              <Text style={[styles.metricValue, { color: '#00ffaa' }]}>{sohPercent}%</Text>
              <Text style={styles.metricSub}>{t('evBms.capacityRetained', 'Capacity Retained')}</Text>
            </View>

            <View style={[styles.metricCard, { backgroundColor: '#0d2238', borderColor: '#0088cc' }]}>
              <Text style={styles.metricLabel}>{t('evBms.socLabel', 'STATE OF CHARGE (SOC)')}</Text>
              <Text style={[styles.metricValue, { color: '#00ccff' }]}>{socPercent}%</Text>
              <Text style={styles.metricSub}>{t('evBms.remainingCharge', 'Remaining Charge')}</Text>
            </View>
          </View>

          {/* Cell Imbalance Monitor */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>🔋 {t('evBms.cellBalance', 'Cell Voltage Balance (16S Pack)')}</Text>
              <Text style={[styles.deltaBadge, { color: deltamV < 30 ? '#00ffaa' : '#ffaa00' }]}>
                Δ {deltamV} mV
              </Text>
            </View>
            <Text style={styles.cardDesc}>
              {deltamV < 30 ? `🟢 ${t('evBms.optimalBalance', 'Optimal Balance (<30mV delta)')}` : `🟡 ${t('evBms.mildImbalance', 'Mild Imbalance Detected')}`}
            </Text>

            {/* 4x4 Grid of Cells */}
            <View style={styles.cellGrid}>
              {cellVoltages.map((v, idx) => (
                <View key={idx} style={styles.cellBox}>
                  <Text style={styles.cellIndex}>C{idx + 1}</Text>
                  <Text style={styles.cellValue}>{v.toFixed(2)}V</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Temperature & Thermal Status */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>🌡️ {t('evBms.thermalStatus', 'Thermal Status & Pack Info')}</Text>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>{t('evBms.packTemp', 'Pack Temperature:')}</Text>
              <Text style={styles.infoValue}>{batteryTempC}°C ({t('common.normal', 'Normal')})</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>{t('evBms.packVoltage', 'Pack Voltage:')}</Text>
              <Text style={styles.infoValue}>61.4 V</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>{t('evBms.chargeCycles', 'Charge Cycles:')}</Text>
              <Text style={styles.infoValue}>142 {t('evBms.cycles', 'Cycles')}</Text>
            </View>
          </View>
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
  metricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  metricCard: {
    flex: 1,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginHorizontal: 4,
    alignItems: 'center',
  },
  metricLabel: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#a0c0e0',
    marginBottom: 4,
  },
  metricValue: {
    fontSize: 28,
    fontWeight: 'bold',
    fontFamily: MONO,
  },
  metricSub: {
    fontSize: 10,
    color: '#88a0c0',
    marginTop: 2,
  },
  card: {
    backgroundColor: '#111b2c',
    borderColor: '#1f2e48',
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    marginBottom: 14,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  deltaBadge: {
    fontSize: 13,
    fontWeight: 'bold',
    fontFamily: MONO,
  },
  cardDesc: {
    fontSize: 12,
    color: '#88a0c0',
    marginTop: 4,
    marginBottom: 12,
  },
  cellGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  cellBox: {
    width: '23%',
    backgroundColor: '#17263d',
    borderRadius: 8,
    padding: 8,
    alignItems: 'center',
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#243754',
  },
  cellIndex: {
    fontSize: 9,
    color: '#7a94b8',
    fontWeight: 'bold',
  },
  cellValue: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#00e5ff',
    fontFamily: MONO,
    marginTop: 2,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  infoLabel: {
    fontSize: 13,
    color: '#88a0c0',
  },
  infoValue: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#ffffff',
  },
});
