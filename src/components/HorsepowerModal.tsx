import React, { useState, useEffect } from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useThemeColors } from '../theme';
import { HorsepowerService, PowerCalculationResult } from '../services/horsepowerService';

interface HorsepowerModalProps {
  visible: boolean;
  onClose: () => void;
  rpm: number;
  mafGps?: number;
  engineTorqueNm?: number;
  calculatedLoadPct?: number;
}

export const HorsepowerModal: React.FC<HorsepowerModalProps> = ({
  visible,
  onClose,
  rpm,
  mafGps,
  engineTorqueNm,
  calculatedLoadPct,
}) => {
  const { t } = useTranslation();
  const tc = useThemeColors();

  const [method, setMethod] = useState<'maf' | 'torque' | 'load'>('maf');
  const [peakHp, setPeakHp] = useState<number>(0);
  const [peakTorque, setPeakTorque] = useState<number>(0);

  const powerResult: PowerCalculationResult = HorsepowerService.calculatePower({
    rpm,
    mafGps,
    engineTorqueNm,
    calculatedLoadPct,
    calculationMethod: method,
    ratedMaxHp: 200,
    ratedPeakRpm: 6000,
  });

  useEffect(() => {
    if (powerResult.hp > peakHp) setPeakHp(powerResult.hp);
    if (powerResult.torqueNm > peakTorque) setPeakTorque(powerResult.torqueNm);
  }, [powerResult.hp, powerResult.torqueNm]);

  if (!visible) return null;

  return (
    <View style={{ flex: 1, backgroundColor: tc.bg, padding: 16 }}>
      <ScrollView contentContainerStyle={styles.content}>
            {/* Main Power Meter Display */}
            <View style={[styles.gaugeCard, { backgroundColor: tc.elevated, borderColor: tc.cyan }]}>
              <Text style={[styles.gaugeLabel, { color: tc.cyan }]}>{t('hpGauge.horsepower')}</Text>
              <View style={styles.valueRow}>
                <Text style={[styles.hpValue, { color: tc.textPri }]}>{powerResult.hp}</Text>
                <Text style={[styles.unitText, { color: tc.textSec }]}>HP / {powerResult.kw} kW</Text>
              </View>

              {/* Progress Bar */}
              <View style={[styles.progressTrack, { backgroundColor: tc.border }]}>
                <View
                  style={[
                    styles.progressBar,
                    {
                      width: `${Math.min(100, (powerResult.hp / 250) * 100)}%`,
                      backgroundColor: tc.cyan,
                    },
                  ]}
                />
              </View>
            </View>

            {/* Torque Display */}
            <View style={[styles.gaugeCard, { backgroundColor: tc.elevated, borderColor: tc.amber }]}>
              <Text style={[styles.gaugeLabel, { color: tc.amber }]}>{t('hpGauge.torque')}</Text>
              <View style={styles.valueRow}>
                <Text style={[styles.hpValue, { color: tc.textPri }]}>{powerResult.torqueNm}</Text>
                <Text style={[styles.unitText, { color: tc.textSec }]}>Nm / {powerResult.torqueLbFt} lb-ft</Text>
              </View>

              {/* Progress Bar */}
              <View style={[styles.progressTrack, { backgroundColor: tc.border }]}>
                <View
                  style={[
                    styles.progressBar,
                    {
                      width: `${Math.min(100, (powerResult.torqueNm / 400) * 100)}%`,
                      backgroundColor: tc.amber,
                    },
                  ]}
                />
              </View>
            </View>

            {/* Peak Stats Cards */}
            <View style={styles.statsRow}>
              <View style={[styles.statBox, { backgroundColor: tc.elevated, borderColor: tc.border }]}>
                <Text style={[styles.statTitle, { color: tc.textSec }]}>{t('hpGauge.peakHp')}</Text>
                <Text style={[styles.statVal, { color: tc.green }]}>{peakHp} HP</Text>
              </View>

              <View style={[styles.statBox, { backgroundColor: tc.elevated, borderColor: tc.border }]}>
                <Text style={[styles.statTitle, { color: tc.textSec }]}>{t('hpGauge.peakTorque')}</Text>
                <Text style={[styles.statVal, { color: tc.green }]}>{peakTorque} Nm</Text>
              </View>

              <View style={[styles.statBox, { backgroundColor: tc.elevated, borderColor: tc.border }]}>
                <Text style={[styles.statTitle, { color: tc.textSec }]}>{t('hpGauge.efficiency')}</Text>
                <Text style={[styles.statVal, { color: tc.cyan }]}>%{powerResult.efficiencyPct}</Text>
              </View>
            </View>

            {/* Calculation Method Selector */}
            <Text style={[styles.sectionTitle, { color: tc.textPri }]}>
              {t('hpGauge.calcMethod', 'HESAPLAMA METODU')}
            </Text>
            <View style={styles.methodSelector}>
              {(['maf', 'torque', 'load'] as const).map((m) => (
                <TouchableOpacity
                  key={m}
                  style={[
                    styles.methodBtn,
                    {
                      backgroundColor: method === m ? tc.cyan : tc.elevated,
                      borderColor: tc.border,
                    },
                  ]}
                  onPress={() => setMethod(m)}
                >
                  <Text
                    style={[
                      styles.methodText,
                      { color: method === m ? '#fff' : tc.textSec, fontWeight: method === m ? '700' : '500' },
                    ]}
                  >
                    {m === 'maf'
                      ? t('hpGauge.methodMaf')
                      : m === 'torque'
                      ? t('hpGauge.methodTorque')
                      : t('hpGauge.methodLoad')}
                  </Text>
                </TouchableOpacity>
              ))}
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
  gaugeCard: {
    padding: 20,
    borderRadius: 16,
    borderWidth: 1.5,
  },
  gaugeLabel: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 4,
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 12,
    marginBottom: 12,
  },
  hpValue: {
    fontSize: 48,
    fontWeight: '900',
  },
  unitText: {
    fontSize: 16,
    fontWeight: '600',
  },
  progressTrack: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: 4,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  statBox: {
    flex: 1,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  statTitle: {
    fontSize: 10,
    fontWeight: '700',
    marginBottom: 4,
  },
  statVal: {
    fontSize: 16,
    fontWeight: '800',
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginTop: 8,
  },
  methodSelector: {
    gap: 8,
  },
  methodBtn: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  methodText: {
    fontSize: 13,
  },
});

export default HorsepowerModal;
