// src/components/InspectionReportView.tsx
// MotoCortex v10.0 - Digital Vehicle Inspection (Ekspertiz) Report Modal & Export View

import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView, Platform, Share } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useThemeColors } from '../theme';
import { useResponsive } from '../hooks/useResponsive';
import { InspectionReport, InspectionReportEngine } from '../core/inspection/InspectionReportEngine';

const MONO = Platform.OS === 'ios' ? 'System' : 'sans-serif';

interface InspectionReportViewProps {
  visible: boolean;
  onClose: () => void;
  report: InspectionReport | null;
}

export default function InspectionReportView({ visible, onClose, report }: InspectionReportViewProps) {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const { s: scaleWidth, vs: scaleHeight, ms: scaleMod, fs: scaleFont } = useResponsive();

  if (!report) return null;

  const handleShareJson = async () => {
    try {
      const jsonStr = InspectionReportEngine.exportToJson(report);
      await Share.share({
        title: `MotoCortex Inspection Report - ${report.vehicle.vin}`,
        message: `📋 MotoCortex Vehicle Inspection Report\nVIN: ${report.vehicle.vin}\nHealth Score: ${report.summary.healthScore}%\nVerification Hash: ${report.verificationHash}\n\n${jsonStr}`,
      });
    } catch (e) {
      console.warn('Share error:', e);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.container, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.cyan }]}>📋 {t('inspection.reportTitle', 'VEHICLE INSPECTION REPORT')}</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Text style={{ color: colors.textSec, fontSize: scaleFont(16), fontWeight: '900' }}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
            {/* Hash Badge */}
            <View style={[styles.hashBox, { backgroundColor: `${colors.cyan}1A`, borderColor: colors.cyan }]}>
              <Text style={[styles.hashLabel, { color: colors.cyan }]}>🔒 VERIFICATION HASH:</Text>
              <Text style={[styles.hashValue, { color: colors.textPri }]}>{report.verificationHash}</Text>
            </View>

            {/* Vehicle Info Card */}
            <View style={[styles.sectionCard, { backgroundColor: `${colors.textPri}08`, borderColor: `${colors.textPri}10` }]}>
              <Text style={[styles.sectionTitle, { color: colors.textSec }]}>🚗 {t('inspection.vehicleDetails', 'VEHICLE DETAILS')}</Text>
              <Text style={[styles.infoLine, { color: colors.textPri }]}>VIN: <Text style={{ color: colors.cyan }}>{report.vehicle.vin}</Text></Text>
              <Text style={[styles.infoLine, { color: colors.textPri }]}>MAKE / MODEL: {report.vehicle.make} {report.vehicle.model} ({report.vehicle.year})</Text>
              <Text style={[styles.infoLine, { color: colors.textPri }]}>ODOMETER: {report.vehicle.odometerKm.toLocaleString()} KM</Text>
            </View>

            {/* Health Score & Diagnostics */}
            <View style={[styles.sectionCard, { backgroundColor: `${colors.textPri}08`, borderColor: `${colors.textPri}10` }]}>
              <Text style={[styles.sectionTitle, { color: colors.textSec }]}>🧪 {t('inspection.diagnosticSummary', 'DIAGNOSTIC SUMMARY')}</Text>
              <Text style={[styles.infoLine, { color: colors.textPri }]}>HEALTH SCORE: <Text style={{ color: report.summary.healthScore > 80 ? colors.green : colors.amber, fontWeight: '900' }}>{report.summary.healthScore}%</Text></Text>
              <Text style={[styles.infoLine, { color: colors.textPri }]}>ACTIVE DTCs: {report.summary.totalDtcCount}</Text>
              <Text style={[styles.infoLine, { color: colors.textPri }]}>DRIVE SAFETY: {report.summary.isSafeToDrive ? '✅ SAFE' : '⚠️ ATTENTION REQUIRED'}</Text>
            </View>

            {/* Technician Sign-Off */}
            <Text style={[styles.techSign, { color: colors.textSec }]}>
              Certified by: {report.technicianName} ({new Date(report.timestamp).toLocaleDateString()})
            </Text>
          </ScrollView>

          {/* Action Buttons */}
          <TouchableOpacity style={[styles.actionBtn, { backgroundColor: colors.cyan }]} onPress={handleShareJson}>
            <Text style={[styles.actionBtnText, { color: colors.card }]}>📤 {t('inspection.shareReport', 'EXPORT & SHARE REPORT')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  container: {
    width: '95%',
    maxHeight: '85%',
    borderRadius: 16,
    borderWidth: 1.5,
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: '900',
    fontFamily: MONO,
    letterSpacing: 1,
  },
  closeBtn: {
    padding: 4,
  },
  hashBox: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
  },
  hashLabel: {
    fontSize: 10,
    fontWeight: '900',
    fontFamily: MONO,
  },
  hashValue: {
    fontSize: 11,
    fontWeight: '700',
    fontFamily: MONO,
    marginTop: 2,
  },
  sectionCard: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '900',
    fontFamily: MONO,
    letterSpacing: 1,
    marginBottom: 6,
  },
  infoLine: {
    fontSize: 12,
    fontFamily: MONO,
    marginVertical: 2,
  },
  techSign: {
    fontSize: 10,
    fontFamily: MONO,
    textAlign: 'center',
    marginVertical: 12,
    opacity: 0.8,
  },
  actionBtn: {
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  actionBtnText: {
    fontSize: 12,
    fontWeight: '900',
    fontFamily: MONO,
    letterSpacing: 1,
  },
});
