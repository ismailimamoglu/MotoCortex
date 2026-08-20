import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useThemeColors } from '../theme';
import { FuelTrimService, FuelTrimAnalysis } from '../services/fuelTrimService';

interface FuelTrimModalProps {
  visible: boolean;
  onClose: () => void;
  stftBank1Pct?: number;
  ltftBank1Pct?: number;
  o2VoltageV?: number;
  fuelType?: 'gasoline' | 'diesel' | 'hybrid' | 'electric';
  railPressureBar?: number;
  lambdaValue?: number;
  fuelRateLph?: number;
}

export const FuelTrimModal: React.FC<FuelTrimModalProps> = ({
  visible,
  onClose,
  stftBank1Pct = 0,
  ltftBank1Pct = 0,
  o2VoltageV,
  fuelType = 'diesel',
  railPressureBar = 320,
  lambdaValue = 1.35,
  fuelRateLph = 5.2,
}) => {
  const { t } = useTranslation();
  const tc = useThemeColors();

  const [activeType, setActiveType] = useState<'gasoline' | 'diesel'>(
    fuelType === 'gasoline' ? 'gasoline' : 'diesel'
  );

  const isDiesel = activeType === 'diesel';

  const analysis: FuelTrimAnalysis = FuelTrimService.analyze({
    stftBank1Pct,
    ltftBank1Pct,
    o2VoltageV,
  });

  if (!visible) return null;

  return (
    <View style={{ flex: 1, backgroundColor: tc.bg, padding: 16 }}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Fuel Type Switcher */}
        <View style={styles.modeSwitcherContainer}>
          <TouchableOpacity
            style={[
              styles.modeBtn,
              {
                backgroundColor: isDiesel ? '#007eff' : tc.elevated,
                borderColor: isDiesel ? '#007eff' : tc.border,
              },
            ]}
            onPress={() => setActiveType('diesel')}
          >
            <Text
              style={[
                styles.modeBtnText,
                { color: isDiesel ? '#ffffff' : tc.textSec, fontWeight: isDiesel ? '800' : '600' },
              ]}
            >
              {t('fuelTrim.modeDiesel', { defaultValue: 'Diesel' })}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.modeBtn,
              {
                backgroundColor: !isDiesel ? '#007eff' : tc.elevated,
                borderColor: !isDiesel ? '#007eff' : tc.border,
              },
            ]}
            onPress={() => setActiveType('gasoline')}
          >
            <Text
              style={[
                styles.modeBtnText,
                { color: !isDiesel ? '#ffffff' : tc.textSec, fontWeight: !isDiesel ? '800' : '600' },
              ]}
            >
              {t('fuelTrim.modeGasoline', { defaultValue: 'Gasoline' })}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Main Status Header Card */}
        <View style={[styles.statusCard, { backgroundColor: tc.elevated, borderColor: isDiesel ? tc.green : analysis.statusColor }]}>
          <Text style={[styles.statusTitle, { color: isDiesel ? tc.green : analysis.statusColor }]}>
            {isDiesel 
              ? t('fuelTrim.dieselCombustionNormal', { defaultValue: 'Diesel Injection & Combustion Health Normal' }) 
              : t(analysis.titleKey)}
          </Text>

          <View style={styles.metricsRow}>
            <View style={styles.metricBox}>
              <Text style={[styles.metricLabel, { color: tc.textSec }]}>
                {isDiesel ? t('fuelTrim.railPressure', { defaultValue: 'Rail Pressure' }) : t('fuelTrim.afrRatio')}
              </Text>
              <Text style={[styles.metricVal, { color: tc.textPri }]}>
                {isDiesel ? `${railPressureBar} Bar` : `${analysis.estimatedAfr}:1`}
              </Text>
            </View>

            <View style={styles.metricBox}>
              <Text style={[styles.metricLabel, { color: tc.textSec }]}>{t('fuelTrim.lambda')}</Text>
              <Text style={[styles.metricVal, { color: tc.textPri }]}>
                {isDiesel ? lambdaValue : analysis.lambdaValue}
              </Text>
            </View>

            <View style={styles.metricBox}>
              <Text style={[styles.metricLabel, { color: tc.textSec }]}>
                {isDiesel ? t('fuelTrim.fuelRate', { defaultValue: 'Fuel Flow Rate' }) : t('fuelTrim.totalTrim')}
              </Text>
              <Text style={[styles.metricVal, { color: isDiesel ? tc.cyan : analysis.statusColor }]}>
                {isDiesel 
                  ? `${fuelRateLph} L/h` 
                  : (analysis.totalTrimBank1 > 0 ? `+${analysis.totalTrimBank1}%` : `${analysis.totalTrimBank1}%`)}
              </Text>
            </View>
          </View>
        </View>

        {/* Live Trim or Diesel Injection Cards */}
        {isDiesel ? (
          <View style={styles.dualTrimRow}>
            <View style={[styles.trimCard, { backgroundColor: tc.elevated, borderColor: tc.border }]}>
              <Text style={[styles.trimCardLabel, { color: tc.cyan }]}>
                {t('fuelTrim.widebandSensor', { defaultValue: 'Wideband Lambda Sensor' })}
              </Text>
              <Text style={[styles.trimCardVal, { color: tc.textPri }]}>
                λ {lambdaValue}
              </Text>
              <Text style={{ color: tc.green, fontSize: 11, fontWeight: '700', marginTop: 4 }}>
                {t('fuelTrim.leanNormal', { defaultValue: 'Lean Mixture Normal' })}
              </Text>
            </View>

            <View style={[styles.trimCard, { backgroundColor: tc.elevated, borderColor: tc.border }]}>
              <Text style={[styles.trimCardLabel, { color: tc.green }]}>
                {t('fuelTrim.commonRailStatus', { defaultValue: 'Common Rail Injection' })}
              </Text>
              <Text style={[styles.trimCardVal, { color: tc.textPri }]}>
                {railPressureBar} Bar
              </Text>
              <Text style={{ color: tc.cyan, fontSize: 11, fontWeight: '700', marginTop: 4 }}>
                {t('fuelTrim.railStable', { defaultValue: 'Pressure Stable' })}
              </Text>
            </View>
          </View>
        ) : (
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
        )}

        {/* Diagnostic Guide */}
        <View style={[styles.guideBox, { backgroundColor: tc.elevated, borderColor: tc.border }]}>
          <Text style={[styles.guideTitle, { color: tc.textPri }]}>
            {isDiesel 
              ? t('fuelTrim.dieselGuideTitle', { defaultValue: 'Diesel Combustion & Mixture Guide' }) 
              : t('fuelTrim.guideTitle')}
          </Text>
          <Text style={[styles.guideDesc, { color: tc.textSec }]}>
            {isDiesel
              ? t('fuelTrim.dieselGuideDesc', { defaultValue: 'Diesel engines operate lean with excess air. Common Rail pressure and Lambda sensor regulate injection balance in real time.' })
              : t('fuelTrim.guideDesc')}
          </Text>

          <View style={styles.sectionMargin}>
            <Text style={[styles.subHeading, { color: tc.cyan }]}>{t('fuelTrim.actionTitle')}</Text>
            <Text style={[styles.actionText, { color: tc.textPri }]}>
              {isDiesel 
                ? t('fuelTrim.dieselActionNormal', { defaultValue: 'System operates within ideal parameters. Continue regular fuel filter maintenance.' })
                : t(analysis.recommendedActionKey)}
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  content: {
    gap: 16,
    paddingBottom: 24,
  },
  modeSwitcherContainer: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 4,
  },
  modeBtn: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modeBtnText: {
    fontSize: 12.5,
    textAlign: 'center',
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
    textAlign: 'center',
  },
  trimCardVal: {
    fontSize: 22,
    fontWeight: '900',
    marginTop: 4,
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
  actionText: {
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
  },
});

export default FuelTrimModal;
