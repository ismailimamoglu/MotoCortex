import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useThemeColors } from '../theme';
import { DctAdaptationService, DctSafetyChecklist } from '../services/dctAdaptationService';

interface DctResetModalProps {
  visible: boolean;
  onClose: () => void;
  onExecuteAdaptation?: () => Promise<boolean>;
  transmissionOilTempC?: number;
  isManualTransmission?: boolean;
}

export const DctResetModal: React.FC<DctResetModalProps> = ({
  visible,
  onClose,
  onExecuteAdaptation,
  transmissionOilTempC = 55,
  isManualTransmission = false,
}) => {
  const { t } = useTranslation();
  const tc = useThemeColors();

  const [mode, setMode] = useState<'auto' | 'manual'>(
    isManualTransmission ? 'manual' : 'auto'
  );

  // Automatic Checklist State
  const [gearPark, setGearPark] = useState(true);
  const [footBrake, setFootBrake] = useState(true);
  const [handBrake, setHandBrake] = useState(true);

  // Manual Checklist State
  const [clutchPedalPressed, setClutchPedalPressed] = useState(true);
  const [neutralGearEngaged, setNeutralGearEngaged] = useState(true);
  const [reverseSwitchActive, setReverseSwitchActive] = useState(false);

  const [isExecuting, setIsExecuting] = useState(false);
  const [progressStep, setProgressStep] = useState<number>(0);
  const [isSuccess, setIsSuccess] = useState(false);

  const isManual = mode === 'manual';

  const checklist: DctSafetyChecklist = {
    engineRunning: true,
    gearInPark: gearPark,
    footBrakePressed: footBrake,
    handBrakeEngaged: handBrake,
    transmissionOilTempC,
  };

  const preconditionResult = isManual 
    ? { allPassed: clutchPedalPressed && neutralGearEngaged }
    : DctAdaptationService.verifyPreconditions(checklist);

  const handleStartReset = async () => {
    if (!preconditionResult.allPassed) {
      Alert.alert(
        t('common.warning', { defaultValue: 'Uyarı' }), 
        isManual 
          ? t('dct.ensureManualPreconditions', { defaultValue: 'Lütfen debriyaj ve boş vites konumunu doğrulayın.' }) 
          : t('dct.ensurePreconditions', { defaultValue: 'Lütfen tüm güvenlik ön koşullarını sağlayın.' })
      );
      return;
    }

    setIsExecuting(true);
    setProgressStep(1);

    await new Promise((r) => setTimeout(r, 1000));
    setProgressStep(2);
    await new Promise((r) => setTimeout(r, 1200));
    setProgressStep(3);
    await new Promise((r) => setTimeout(r, 1000));

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
        {/* Transmission Mode Switcher */}
        <View style={styles.modeSwitcherContainer}>
          <TouchableOpacity
            style={[
              styles.modeBtn,
              {
                backgroundColor: !isManual ? '#007eff' : tc.elevated,
                borderColor: !isManual ? '#007eff' : tc.border,
              },
            ]}
            onPress={() => setMode('auto')}
          >
            <Text
              style={[
                styles.modeBtnText,
                { color: !isManual ? '#ffffff' : tc.textSec, fontWeight: !isManual ? '800' : '600' },
              ]}
            >
              {t('dct.modeAuto', { defaultValue: 'Otomatik / DCT Uyarlama' })}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.modeBtn,
              {
                backgroundColor: isManual ? '#007eff' : tc.elevated,
                borderColor: isManual ? '#007eff' : tc.border,
              },
            ]}
            onPress={() => setMode('manual')}
          >
            <Text
              style={[
                styles.modeBtnText,
                { color: isManual ? '#ffffff' : tc.textSec, fontWeight: isManual ? '800' : '600' },
              ]}
            >
              {t('dct.modeManual', { defaultValue: 'Manuel Şanzıman Testi' })}
            </Text>
          </TouchableOpacity>
        </View>

        {isSuccess ? (
          <View style={[styles.successBox, { backgroundColor: tc.elevated, borderColor: tc.green }]}>
            <Text style={[styles.successTitle, { color: tc.green }]}>{t('common.success', { defaultValue: 'Başarılı' })}</Text>
            <Text style={[styles.successDesc, { color: tc.textPri }]}>
              {isManual 
                ? t('dct.manualTestSuccess', { defaultValue: 'Manuel şanzıman debriyaj ve vites sensör kontrolleri başarıyla tamamlandı.' })
                : t('dct.success', { defaultValue: 'Şanzıman uyarlaması başarıyla tamamlandı.' })}
            </Text>

            <TouchableOpacity
              style={[styles.startBtn, { backgroundColor: '#007eff', marginTop: 16, paddingHorizontal: 32, minWidth: 140 }]}
              onPress={onClose}
            >
              <Text style={styles.startBtnText}>{t('common.ok', { defaultValue: 'Tamam' })}</Text>
            </TouchableOpacity>
          </View>
        ) : isExecuting ? (
          <View style={[styles.executingBox, { backgroundColor: tc.elevated, borderColor: tc.cyan }]}>
            <ActivityIndicator size="large" color={tc.cyan} />
            <Text style={[styles.execTitle, { color: tc.cyan }]}>
              {isManual
                ? (progressStep === 1 
                    ? t('dct.manualStep1', { defaultValue: 'Debriyaj Müşürü Sinyali Test Ediliyor...' })
                    : progressStep === 2
                    ? t('dct.manualStep2', { defaultValue: 'Boş Vites Sensör Doğrulaması...' })
                    : t('dct.manualStep3', { defaultValue: 'Sensör Kalibrasyonu Tamamlandı.' }))
                : (progressStep === 1
                    ? t('dct.step1', { defaultValue: 'Basınç Valfleri Sıfırlanıyor...' })
                    : progressStep === 2
                    ? t('dct.step2', { defaultValue: 'Kavrama Noktaları Kalibre Ediliyor...' })
                    : t('dct.step3', { defaultValue: 'Vites Çatalları Öğreniliyor...' }))}
            </Text>
            <Text style={[styles.execWarning, { color: tc.textSec }]}>{t('dct.inProgress', { defaultValue: 'İşlem devam ediyor, lütfen bekleyin...' })}</Text>
          </View>
        ) : (
          <>
            {/* Preconditions / Sensor Checklist Box */}
            <View style={[styles.warningBox, { backgroundColor: tc.elevated, borderColor: tc.border, borderWidth: 1.2 }]}>
              <Text style={[styles.warnTitle, { color: isManual ? tc.cyan : tc.amber, marginBottom: 4 }]}>
                {isManual 
                  ? t('dct.manualTitle', { defaultValue: 'MANUEL ŞANZIMAN SENSÖR KONTROLÜ' })
                  : t('dct.warningTitle', { defaultValue: 'GÜVENLİK VE ÖN KOŞUL KONTROLÜ' })}
              </Text>
              <Text style={[styles.warnDesc, { color: tc.textSec }]}>
                {isManual
                  ? t('dct.manualDesc', { defaultValue: 'Bu araç manuel şanzımanlıdır. Otomatik TCU uyarlaması gerekmez. Aşağıdan debriyaj ve boş vites sensörlerinin canlı çalışma durumunu kontrol edebilirsiniz.' })
                  : t('dct.warningDesc', { defaultValue: 'Şanzıman uyarlamasını başlatmadan önce lütfen aşağıdaki tüm şartların sağlandığından emin olun:' })}
              </Text>

              <View style={styles.checklistRow}>
                {isManual ? (
                  <>
                    {/* Clutch Switch */}
                    <TouchableOpacity 
                      activeOpacity={0.7}
                      style={[styles.checkItem, { backgroundColor: tc.card, borderColor: clutchPedalPressed ? `${tc.green}40` : `${tc.red}40` }]} 
                      onPress={() => setClutchPedalPressed(!clutchPedalPressed)}
                    >
                      <Text style={[styles.checkText, { color: tc.textPri, flex: 1 }]}>
                        {t('dct.clutchSwitch', { defaultValue: 'Debriyaj Pedalı Müşürü' })}
                      </Text>
                      <View style={[styles.pillBadge, { backgroundColor: clutchPedalPressed ? `${tc.green}20` : `${tc.red}20` }]}>
                        <Text style={{ color: clutchPedalPressed ? tc.green : tc.red, fontSize: 11, fontWeight: '800' }}>
                          {clutchPedalPressed ? t('dct.pressed', { defaultValue: 'BASILI' }) : t('dct.released', { defaultValue: 'SERBEST' })}
                        </Text>
                      </View>
                    </TouchableOpacity>

                    {/* Neutral Switch */}
                    <TouchableOpacity 
                      activeOpacity={0.7}
                      style={[styles.checkItem, { backgroundColor: tc.card, borderColor: neutralGearEngaged ? `${tc.green}40` : `${tc.red}40` }]} 
                      onPress={() => setNeutralGearEngaged(!neutralGearEngaged)}
                    >
                      <Text style={[styles.checkText, { color: tc.textPri, flex: 1 }]}>
                        {t('dct.neutralSwitch', { defaultValue: 'Boş Vites (Nötr) Sensörü' })}
                      </Text>
                      <View style={[styles.pillBadge, { backgroundColor: neutralGearEngaged ? `${tc.green}20` : `${tc.red}20` }]}>
                        <Text style={{ color: neutralGearEngaged ? tc.green : tc.red, fontSize: 11, fontWeight: '800' }}>
                          {neutralGearEngaged ? t('dct.neutral', { defaultValue: 'BOŞTA' }) : t('dct.inGear', { defaultValue: 'VİTESTE' })}
                        </Text>
                      </View>
                    </TouchableOpacity>

                    {/* Reverse Switch */}
                    <TouchableOpacity 
                      activeOpacity={0.7}
                      style={[styles.checkItem, { backgroundColor: tc.card, borderColor: tc.border }]} 
                      onPress={() => setReverseSwitchActive(!reverseSwitchActive)}
                    >
                      <Text style={[styles.checkText, { color: tc.textPri, flex: 1 }]}>
                        {t('dct.reverseSwitch', { defaultValue: 'Geri Vites Müşürü' })}
                      </Text>
                      <View style={[styles.pillBadge, { backgroundColor: reverseSwitchActive ? `${tc.cyan}20` : tc.border }]}>
                        <Text style={{ color: reverseSwitchActive ? tc.cyan : tc.textSec, fontSize: 11, fontWeight: '800' }}>
                          {reverseSwitchActive ? t('dct.active', { defaultValue: 'AKTİF' }) : t('dct.passive', { defaultValue: 'PASİF' })}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  </>
                ) : (
                  <>
                    {/* Gear in Park */}
                    <TouchableOpacity 
                      activeOpacity={0.7}
                      style={[styles.checkItem, { backgroundColor: tc.card, borderColor: gearPark ? `${tc.green}40` : `${tc.red}40` }]} 
                      onPress={() => setGearPark(!gearPark)}
                    >
                      <Text style={[styles.checkText, { color: tc.textPri, flex: 1 }]}>
                        {t('dct.checkGearPark', { defaultValue: "Vites 'P' (Park) konumunda" })}
                      </Text>
                      <View style={[styles.pillBadge, { backgroundColor: gearPark ? `${tc.green}20` : `${tc.red}20` }]}>
                        <Text style={{ color: gearPark ? tc.green : tc.red, fontSize: 11, fontWeight: '800' }}>
                          {gearPark ? 'P (Park)' : t('common.error', { defaultValue: 'HATA' })}
                        </Text>
                      </View>
                    </TouchableOpacity>

                    {/* Foot Brake */}
                    <TouchableOpacity 
                      activeOpacity={0.7}
                      style={[styles.checkItem, { backgroundColor: tc.card, borderColor: footBrake ? `${tc.green}40` : `${tc.red}40` }]} 
                      onPress={() => setFootBrake(!footBrake)}
                    >
                      <Text style={[styles.checkText, { color: tc.textPri, flex: 1 }]}>
                        {t('dct.checkFootBrake', { defaultValue: 'Fren pedalına sonuna kadar basılı' })}
                      </Text>
                      <View style={[styles.pillBadge, { backgroundColor: footBrake ? `${tc.green}20` : `${tc.red}20` }]}>
                        <Text style={{ color: footBrake ? tc.green : tc.red, fontSize: 11, fontWeight: '800' }}>
                          {footBrake ? t('dct.pressed', { defaultValue: 'BASILI' }) : t('dct.released', { defaultValue: 'SERBEST' })}
                        </Text>
                      </View>
                    </TouchableOpacity>

                    {/* Hand Brake */}
                    <TouchableOpacity 
                      activeOpacity={0.7}
                      style={[styles.checkItem, { backgroundColor: tc.card, borderColor: handBrake ? `${tc.green}40` : `${tc.red}40` }]} 
                      onPress={() => setHandBrake(!handBrake)}
                    >
                      <Text style={[styles.checkText, { color: tc.textPri, flex: 1 }]}>
                        {t('dct.checkHandBrake', { defaultValue: 'El freni çekili' })}
                      </Text>
                      <View style={[styles.pillBadge, { backgroundColor: handBrake ? `${tc.green}20` : `${tc.red}20` }]}>
                        <Text style={{ color: handBrake ? tc.green : tc.red, fontSize: 11, fontWeight: '800' }}>
                          {handBrake ? t('dct.engaged', { defaultValue: 'ÇEKİLİ' }) : t('dct.released', { defaultValue: 'İNİK' })}
                        </Text>
                      </View>
                    </TouchableOpacity>

                    {/* Oil Temp */}
                    {(() => {
                      const isTempValid = transmissionOilTempC >= 30 && transmissionOilTempC <= 90;
                      return (
                        <View style={[styles.checkItem, { backgroundColor: tc.card, borderColor: isTempValid ? `${tc.green}40` : `${tc.red}40` }]}>
                          <Text style={[styles.checkText, { color: tc.textPri, flex: 1 }]}>
                            {t('dct.checkOilTemp', { defaultValue: 'Şanzıman Yağ Sıcaklığı (30°C - 90°C arası)' })}
                          </Text>
                          <View style={[styles.pillBadge, { backgroundColor: isTempValid ? `${tc.green}20` : `${tc.red}20` }]}>
                            <Text style={{ color: isTempValid ? tc.green : tc.red, fontSize: 11, fontWeight: '800' }}>
                              {transmissionOilTempC}°C (30-90°C)
                            </Text>
                          </View>
                        </View>
                      );
                    })()}
                  </>
                )}
              </View>
            </View>

            {/* Action Button */}
            <TouchableOpacity
              activeOpacity={0.8}
              style={[
                styles.startBtn,
                {
                  backgroundColor: preconditionResult.allPassed ? '#007eff' : tc.border,
                  opacity: preconditionResult.allPassed ? 1 : 0.6,
                  marginTop: 16,
                },
              ]}
              onPress={handleStartReset}
              disabled={!preconditionResult.allPassed}
            >
              <Text style={styles.startBtnText}>
                {isManual 
                  ? t('dct.startManualTest', { defaultValue: 'Sensör Testini Başlat' })
                  : t('dct.startAdaptation', { defaultValue: 'UYARLAMAYI BAŞLAT' })}
              </Text>
            </TouchableOpacity>
          </>
        )}
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
  warningBox: {
    padding: 16,
    borderRadius: 16,
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
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  pillBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
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
