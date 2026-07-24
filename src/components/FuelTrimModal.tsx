import React from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useThemeColors } from '../theme';
import { FuelTrimService, FuelTrimAnalysis } from '../services/fuelTrimService';

interface FuelTrimModalProps {
  visible: boolean;
  onClose: () => void;
  stftBank1Pct: number;
  ltftBank1Pct: number;
  o2VoltageV?: number;
}

export const FuelTrimModal: React.FC<FuelTrimModalProps> = ({
  visible,
  onClose,
  stftBank1Pct,
  ltftBank1Pct,
  o2VoltageV,
}) => {
  const { t } = useTranslation();
  const tc = useThemeColors();

  const analysis: FuelTrimAnalysis = FuelTrimService.analyze({
    stftBank1Pct,
    ltftBank1Pct,
    o2VoltageV,
  });

  if (!visible) return null;

  return (
    <View style={{ flex: 1, backgroundColor: tc.bg, padding: 16 }}>
      <ScrollView contentContainerStyle={styles.content}>
            {/* Status Card */}
            <View style={[styles.statusCard, { backgroundColor: tc.elevated, borderColor: analysis.statusColor }]}>
              <Text style={[styles.statusTitle, { color: analysis.statusColor }]}>
                {t(analysis.titleKey)}
              </Text>

              <View style={styles.metricsRow}>
                <View style={styles.metricBox}>
                  <Text style={[styles.metricLabel, { color: tc.textSec }]}>{t('fuelTrim.afrRatio')}</Text>
                  <Text style={[styles.metricVal, { color: tc.textPri }]}>{analysis.estimatedAfr}:1</Text>
                </View>

                <View style={styles.metricBox}>
                  <Text style={[styles.metricLabel, { color: tc.textSec }]}>{t('fuelTrim.lambda')}</Text>
                  <Text style={[styles.metricVal, { color: tc.textPri }]}>{analysis.lambdaValue}</Text>
                </View>

                <View style={styles.metricBox}>
                  <Text style={[styles.metricLabel, { color: tc.textSec }]}>{t('fuelTrim.totalTrim')}</Text>
                  <Text style={[styles.metricVal, { color: analysis.statusColor }]}>
                    {analysis.totalTrimBank1 > 0 ? `+${analysis.totalTrimBank1}` : analysis.totalTrimBank1}%
                  </Text>
                </View>
              </View>
            </View>

            {/* Live STFT & LTFT Meter Cards */}
            <View style={styles.dualTrimRow}>
              <View style={[styles.trimCard, { backgroundColor: tc.elevated, borderColor: tc.border }]}>
                <Text style={[styles.trimCardLabel, { color: tc.cyan }]}>{t('fuelTrim.stft')}</Text>
                <Text style={[styles.trimCardVal, { color: tc.textPri }]}>
                  {stftBank1Pct > 0 ? `+${stftBank1Pct}` : stftBank1Pct}%
                </Text>
              </View>

              <View style={[styles.trimCard, { backgroundColor: tc.elevated, borderColor: tc.border }]}>
                <Text style={[styles.trimCardLabel, { color: tc.purple }]}>{t('fuelTrim.ltft')}</Text>
                <Text style={[styles.trimCardVal, { color: tc.textPri }]}>
                  {ltftBank1Pct > 0 ? `+${ltftBank1Pct}` : ltftBank1Pct}%
                </Text>
              </View>
            </View>

            {/* Educational & Diagnostic Guide */}
            <View style={[styles.guideBox, { backgroundColor: tc.elevated, borderColor: tc.border }]}>
              <Text style={[styles.guideTitle, { color: tc.textPri }]}>{t('fuelTrim.guideTitle')}</Text>
              <Text style={[styles.guideDesc, { color: tc.textSec }]}>{t('fuelTrim.guideDesc')}</Text>

              {analysis.causesKeys.length > 0 && (
                <View style={styles.sectionMargin}>
                  <Text style={[styles.subHeading, { color: tc.amber }]}>{t('fuelTrim.causesTitle')}</Text>
                  {analysis.causesKeys.map((ck, i) => (
                    <Text key={i} style={[styles.bulletPoint, { color: tc.textSec }]}>
                      • {t(ck)}
                    </Text>
                  ))}
                </View>
              )}

              <View style={styles.sectionMargin}>
                <Text style={[styles.subHeading, { color: tc.cyan }]}>{t('fuelTrim.actionTitle')}</Text>
                <Text style={[styles.actionText, { color: tc.textPri }]}>
                  {t(analysis.recommendedActionKey)}
                </Text>
              </View>
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
    height: '85%',
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
    padding: 16,
    borderRadius: 16,
    borderWidth: 1.5,
  },
  statusTitle: {
    fontSize: 14,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 12,
  },
  metricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  metricBox: {
    alignItems: 'center',
  },
  metricLabel: {
    fontSize: 10,
    fontWeight: '700',
    marginBottom: 4,
  },
  metricVal: {
    fontSize: 18,
    fontWeight: '800',
  },
  dualTrimRow: {
    flexDirection: 'row',
    gap: 12,
  },
  trimCard: {
    flex: 1,
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
  },
  trimCardLabel: {
    fontSize: 11,
    fontWeight: '800',
    marginBottom: 4,
  },
  trimCardVal: {
    fontSize: 24,
    fontWeight: '900',
  },
  guideBox: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
  },
  guideTitle: {
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 6,
  },
  guideDesc: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 12,
  },
  sectionMargin: {
    marginTop: 10,
  },
  subHeading: {
    fontSize: 12,
    fontWeight: '800',
    marginBottom: 4,
  },
  bulletPoint: {
    fontSize: 13,
    lineHeight: 18,
    marginLeft: 4,
  },
  actionText: {
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
  },
});

export default FuelTrimModal;
