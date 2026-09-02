import React from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useThemeColors } from '../theme';
import { DpfService, DpfAnalysisResult } from '../services/dpfService';
import { useAppStore } from '../store/useAppStore';

interface DpfMonitorModalProps {
  visible: boolean;
  onClose: () => void;
  sootMassGrams?: number;
  ashMassGrams?: number;
  egtTempC?: number;
  differentialPressureHpa?: number;
  isRegenActive?: boolean;
}

export const DpfMonitorModal: React.FC<DpfMonitorModalProps> = ({
  visible,
  onClose,
  sootMassGrams,
  ashMassGrams,
  egtTempC,
  differentialPressureHpa,
  isRegenActive = false,
}) => {
  const { t } = useTranslation();
  const tc = useThemeColors();
  const isSimulationMode = useAppStore((state) => state.isSimulationMode);

  const hasRealData = sootMassGrams !== undefined || egtTempC !== undefined || differentialPressureHpa !== undefined;

  const analysis: DpfAnalysisResult | null = hasRealData ? DpfService.analyze({
    sootMassGrams: sootMassGrams ?? 0,
    ashMassGrams: ashMassGrams ?? 0,
    egtTempC: egtTempC ?? 0,
    differentialPressureHpa: differentialPressureHpa ?? 0,
    isRegenActive,
  }) : null;

  if (!visible) return null;

  const sootDisplay = sootMassGrams !== undefined && analysis ? `%${analysis.sootPercentage}` : '--';
  const ashDisplay = ashMassGrams !== undefined && analysis ? `%${analysis.ashPercentage}` : '--';
  const egtDisplay = egtTempC !== undefined ? `${egtTempC}°C` : '--';
  const diffDisplay = differentialPressureHpa !== undefined ? `${differentialPressureHpa} hPa` : '--';
  const statusTitle = analysis ? t(analysis.stateTitleKey) : t('dpf.notSupportedMsg', { defaultValue: 'DPF Sensörü Bulunamadı (Benzinli veya Desteksiz Araç)' });
  const statusColor = analysis ? analysis.statusColor : tc.textSec;
  const sootWidth = analysis && sootMassGrams !== undefined ? `${analysis.sootPercentage}%` : '0%';

  return (
    <View style={{ flex: 1, backgroundColor: tc.bg, padding: 16 }}>
      <ScrollView contentContainerStyle={styles.content}>
            {/* Simulation / Live Indicator Badge */}
            {isSimulationMode && (
              <View style={[styles.simBadge, { backgroundColor: `${tc.cyan}20`, borderColor: tc.cyan }]}>
                <Text style={[styles.simBadgeText, { color: tc.cyan }]}>
                  {t('common.sampleSimData', { defaultValue: 'Örnek Simülasyon Verisi' })}
                </Text>
              </View>
            )}

            {/* Status Card */}
            <View style={[styles.statusCard, { backgroundColor: tc.elevated, borderColor: statusColor }]}>
              <Text style={[styles.statusTitle, { color: statusColor }]}>
                {statusTitle}
              </Text>

              {/* Progress Gauge */}
              <View style={styles.gaugeContainer}>
                <View style={styles.gaugeHeader}>
                  <Text style={[styles.gaugeText, { color: tc.textPri }]}>{t('dpf.sootLoad')}</Text>
                  <Text style={[styles.gaugePct, { color: statusColor }]}>
                    {sootDisplay}
                  </Text>
                </View>
                <View style={[styles.progressTrack, { backgroundColor: tc.border }]}>
                  <View
                    style={[
                      styles.progressBar,
                      {
                        width: sootWidth as any,
                        backgroundColor: statusColor,
                      },
                    ]}
                  />
                </View>
              </View>
            </View>

            {/* Sub-Metrics Grid */}
            <View style={styles.gridRow}>
              <View style={[styles.gridBox, { backgroundColor: tc.elevated, borderColor: tc.border }]}>
                <Text style={[styles.boxLabel, { color: tc.textSec }]}>{t('dpf.ashLoad')}</Text>
                <Text style={[styles.boxVal, { color: tc.textPri }]}>{ashDisplay}</Text>
              </View>

              <View style={[styles.gridBox, { backgroundColor: tc.elevated, borderColor: tc.border }]}>
                <Text style={[styles.boxLabel, { color: tc.textSec }]}>{t('dpf.egtTemp')}</Text>
                <Text
                  style={[
                    styles.boxVal,
                    { color: egtTempC !== undefined ? (egtTempC >= 550 ? tc.red : egtTempC >= 300 ? tc.amber : tc.green) : tc.textPri },
                  ]}
                >
                  {egtDisplay}
                </Text>
              </View>

              <View style={[styles.gridBox, { backgroundColor: tc.elevated, borderColor: tc.border }]}>
                <Text style={[styles.boxLabel, { color: tc.textSec }]}>{t('dpf.diffPressure')}</Text>
                <Text style={[styles.boxVal, { color: tc.textPri }]}>{diffDisplay}</Text>
              </View>
            </View>

            {/* Recommendation Box */}
            <View style={[styles.recommendBox, { backgroundColor: tc.elevated, borderColor: tc.cyan }]}>
              <Text style={[styles.recTitle, { color: tc.cyan }]}>
                {t('dpf.regenRecommendation')}
              </Text>
              <Text style={[styles.recDesc, { color: tc.textPri }]}>
                {analysis ? t(analysis.regenRecommendationKey) : '--'}
              </Text>
            </View>
          </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  container: {
    height: '80%',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
  },
  subtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    gap: 16,
    paddingBottom: 24,
  },
  statusCard: {
    padding: 18,
    borderRadius: 16,
    borderWidth: 1.5,
  },
  statusTitle: {
    fontSize: 14,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 14,
  },
  gaugeContainer: {
    gap: 6,
  },
  gaugeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  gaugeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  gaugePct: {
    fontSize: 14,
    fontWeight: '800',
  },
  progressTrack: {
    height: 12,
    borderRadius: 6,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: 6,
  },
  gridRow: {
    flexDirection: 'row',
    gap: 10,
  },
  gridBox: {
    flex: 1,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
  },
  boxLabel: {
    fontSize: 10,
    fontWeight: '700',
    marginBottom: 4,
    textAlign: 'center',
  },
  boxVal: {
    fontSize: 18,
    fontWeight: '900',
  },
  subVal: {
    fontSize: 10,
    marginTop: 2,
  },
  recommendBox: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
  },
  recTitle: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  recDesc: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '500',
  },
  simBadge: {
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    marginBottom: 10,
  },
  simBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    fontFamily: 'monospace',
  },
});

export default DpfMonitorModal;
