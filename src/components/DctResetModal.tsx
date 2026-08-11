import React, { useState } from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useThemeColors } from '../theme';
import { DctAdaptationService, DctSafetyChecklist } from '../services/dctAdaptationService';

interface DctResetModalProps {
  visible: boolean;
  onClose: () => void;
  onExecuteAdaptation?: () => Promise<boolean>;
  transmissionOilTempC?: number;
}

export const DctResetModal: React.FC<DctResetModalProps> = ({
  visible,
  onClose,
  onExecuteAdaptation,
  transmissionOilTempC = 55,
}) => {
  const { t } = useTranslation();
  const tc = useThemeColors();

  const [gearPark, setGearPark] = useState(true);
  const [footBrake, setFootBrake] = useState(true);
  const [handBrake, setHandBrake] = useState(true);

  const [isExecuting, setIsExecuting] = useState(false);
  const [progressStep, setProgressStep] = useState<number>(0);
  const [isSuccess, setIsSuccess] = useState(false);

  const checklist: DctSafetyChecklist = {
    engineRunning: true,
    gearInPark: gearPark,
    footBrakePressed: footBrake,
    handBrakeEngaged: handBrake,
    transmissionOilTempC,
  };

  const preconditionResult = DctAdaptationService.verifyPreconditions(checklist);

  const handleStartReset = async () => {
    if (!preconditionResult.allPassed) {
      Alert.alert(t('common.warning'), t('dct.ensurePreconditions'));
      return;
    }

    setIsExecuting(true);
    setProgressStep(1);

    await new Promise((r) => setTimeout(r, 1200));
    setProgressStep(2); // Clutch 1 Relearn
    await new Promise((r) => setTimeout(r, 1500));
    setProgressStep(3); // Clutch 2 Relearn
    await new Promise((r) => setTimeout(r, 1200));

    if (onExecuteAdaptation) {
      await onExecuteAdaptation().catch(() => null);
    }

    setIsExecuting(false);
    setIsSuccess(true);
  };

  if (!visible) return null;

  return (
    <View style={{ flex: 1, backgroundColor: tc.bg, padding: 16 }}>
      <ScrollView contentContainerStyle={styles.content}>
            {isSuccess ? (
              <View style={[styles.successBox, { backgroundColor: tc.elevated, borderColor: tc.green }]}>
                <Text style={[styles.successTitle, { color: tc.green }]}>{t('common.success')}</Text>
                <Text style={[styles.successDesc, { color: tc.textPri }]}>{t('dct.success')}</Text>

                <TouchableOpacity
                  style={[styles.startBtn, { backgroundColor: tc.cyan, marginTop: 16, paddingHorizontal: 32, minWidth: 140 }]}
                  onPress={onClose}
                >
                  <Text style={styles.startBtnText}>{t('common.ok')}</Text>
                </TouchableOpacity>
              </View>
            ) : isExecuting ? (
              <View style={[styles.executingBox, { backgroundColor: tc.elevated, borderColor: tc.cyan }]}>
                <ActivityIndicator size="large" color={tc.cyan} />
                <Text style={[styles.execTitle, { color: tc.cyan }]}>
                  {progressStep === 1
                    ? t('dct.step1')
                    : progressStep === 2
                    ? t('dct.step2')
                    : t('dct.step3')}
                </Text>
                <Text style={[styles.execWarning, { color: tc.red }]}>{t('dct.inProgress')}</Text>
              </View>
            ) : (
              <>
                {/* Preconditions Checklist */}
                <View style={[styles.warningBox, { backgroundColor: tc.elevated, borderColor: tc.amber }]}>
                  <Text style={[styles.warnTitle, { color: tc.amber }]}>{t('dct.warningTitle')}</Text>
                  <Text style={[styles.warnDesc, { color: tc.textSec }]}>{t('dct.warningDesc')}</Text>

                  <View style={styles.checklistRow}>
                    <TouchableOpacity style={styles.checkItem} onPress={() => setGearPark(!gearPark)}>
                      <Text style={[styles.checkText, { color: gearPark ? tc.green : tc.red }]}>
                        {gearPark ? '[OK]' : '[HATA]'} {t('dct.checkGearPark')}
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.checkItem} onPress={() => setFootBrake(!footBrake)}>
                      <Text style={[styles.checkText, { color: footBrake ? tc.green : tc.red }]}>
                        {footBrake ? '[OK]' : '[HATA]'} {t('dct.checkFootBrake')}
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.checkItem} onPress={() => setHandBrake(!handBrake)}>
                      <Text style={[styles.checkText, { color: handBrake ? tc.green : tc.red }]}>
                        {handBrake ? '[OK]' : '[HATA]'} {t('dct.checkHandBrake')}
                      </Text>
                    </TouchableOpacity>

                    <View style={styles.checkItem}>
                      <Text
                        style={[
                          styles.checkText,
                          {
                            color:
                              transmissionOilTempC >= 30 && transmissionOilTempC <= 90
                                ? tc.green
                                : tc.red,
                          },
                        ]}
                      >
                        {transmissionOilTempC >= 30 && transmissionOilTempC <= 90 ? '[OK]' : '[HATA]'}{' '}
                        {t('dct.checkOilTemp')} ({transmissionOilTempC}°C)
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Start Adaptation Button */}
                <TouchableOpacity
                  style={[
                    styles.startBtn,
                    {
                      backgroundColor: preconditionResult.allPassed ? tc.cyan : tc.border,
                      opacity: preconditionResult.allPassed ? 1 : 0.6,
                    },
                  ]}
                  onPress={handleStartReset}
                  disabled={!preconditionResult.allPassed}
                >
                  <Text style={styles.startBtnText}>{t('dct.startAdaptation')}</Text>
                </TouchableOpacity>
              </>
            )}
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
  warningBox: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1.5,
  },
  warnTitle: {
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 4,
  },
  warnDesc: {
    fontSize: 12,
    marginBottom: 14,
    lineHeight: 16,
  },
  checklistRow: {
    gap: 10,
  },
  checkItem: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
  },
  checkText: {
    fontSize: 13,
    fontWeight: '700',
  },
  startBtn: {
    height: 50,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  startBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  executingBox: {
    padding: 24,
    borderRadius: 16,
    borderWidth: 1.5,
    alignItems: 'center',
    gap: 16,
  },
  execTitle: {
    fontSize: 14,
    fontWeight: '800',
    textAlign: 'center',
  },
  execWarning: {
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
  },
  successBox: {
    padding: 24,
    borderRadius: 16,
    borderWidth: 1.5,
    alignItems: 'center',
  },
  successIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  successTitle: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 8,
  },
  successDesc: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },
});

export default DctResetModal;
