import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Platform,
} from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { useTranslation } from 'react-i18next';
import appI18n from '../i18n';
import { useThemeColors } from '../theme';
import { useResponsive } from '../hooks/useResponsive';
import { AiDiagnosticContext } from '../services/aiDoctorService';
import { getGuidedDiagnostics } from '../services/dtcIntelligenceService';
import { useAppStore } from '../store/useAppStore';
import { useBluetoothStore } from '../store/useBluetoothStore';

const MONO = Platform.OS === 'ios' ? 'System' : 'sans-serif';

interface AiDoctorModalProps {
  visible: boolean;
  onClose: () => void;
  context: AiDiagnosticContext;
  onClearDtc?: () => void;
}

export default function AiDoctorModal({ visible, onClose, context, onClearDtc }: AiDoctorModalProps) {
  const { t, i18n } = useTranslation();
  const activeI18n = i18n || appI18n;
  const tc = useThemeColors();
  const { s: scaleWidth, vs: scaleHeight, fs: scaleFont, ms: scaleMod } = useResponsive();

  const [loading, setLoading] = useState(false);
  const [isFreeTrial, setIsFreeTrial] = useState(false);
  const [selectedDtcIndex, setSelectedDtcIndex] = useState(0);

  const rawDtcs = context?.dtcCodes || [];
  const dtcList = rawDtcs.length > 0 ? rawDtcs : ['OBD-II'];
  const safeIndex = selectedDtcIndex < dtcList.length ? selectedDtcIndex : 0;
  const activeCode = (dtcList[safeIndex] || 'OBD-II').toUpperCase().trim();
  const guided = getGuidedDiagnostics(activeCode);

  const dtcKey = dtcList.join(',');
  const contextKey = visible ? `${dtcKey}_${context?.vin || ''}` : '';

  useEffect(() => {
    let isMounted = true;

    if (visible && contextKey) {
      const isPro = typeof useAppStore.getState === 'function' ? useAppStore.getState().isPro : true;
      const isSim = typeof useAppStore.getState === 'function' ? useAppStore.getState().isSimulationMode : true;

      const runDiagnosticWorkflow = async () => {
        if (!isPro && !isSim) {
          try {
            const used = await SecureStore.getItemAsync('motocortex_ai_trial_used');
            if (used === 'true') {
              if (isMounted) {
                onClose();
                if (typeof useBluetoothStore.getState === 'function') {
                  useBluetoothStore.getState().setPaywallContext('AI_DOCTOR_LIMIT');
                }
              }
              return;
            } else {
              if (isMounted) setIsFreeTrial(true);
              await SecureStore.setItemAsync('motocortex_ai_trial_used', 'true');
            }
          } catch (err) {
            console.warn('[AiDoctorModal] SecureStore trial check error:', err);
          }
        } else {
          if (isMounted) setIsFreeTrial(false);
        }
      };

      runDiagnosticWorkflow();
    }
    return () => {
      isMounted = false;
    };
  }, [visible, contextKey]);

  // Overall multi-DTC health calculation
  const hasCritical = dtcList.some(c => {
    const uc = c.toUpperCase();
    return uc.startsWith('P030') || uc.startsWith('P02') || uc.startsWith('P07') || uc.startsWith('C0035');
  });
  const hasWarning = dtcList.some(c => {
    const uc = c.toUpperCase();
    return uc.startsWith('P01') || uc.startsWith('P04') || uc.startsWith('C') || uc.startsWith('B') || uc.startsWith('U');
  });

  let healthScore = 95;
  if (hasCritical) {
    healthScore = 25;
  } else if (hasWarning || (dtcList.length > 0 && dtcList[0] !== 'OBD-II')) {
    healthScore = 65;
  }
  const isOptimal = healthScore >= 50;

  // Active code severity for drive guidance
  const isCurrentCritical = activeCode.startsWith('P030') || activeCode.startsWith('P02') || activeCode.startsWith('P07') || activeCode.startsWith('C0035');

  const formatPercentage = (prob: number) => {
    const lang = (activeI18n?.language || 'en').toLowerCase();
    return lang.startsWith('tr') ? `%${prob}` : `${prob}%`;
  };

  return (
    <Modal visible={visible} animationType="fade" transparent={true} onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View
          style={[
            styles.modalContainer,
            {
              backgroundColor: tc.card || tc.elevated,
              borderColor: tc.cyan,
              padding: scaleMod(20),
            },
          ]}
        >
          <View style={[styles.headerRow, { marginBottom: scaleHeight(12) }]}>
            <View style={styles.headerLeft}>
              <View
                style={[
                  styles.aiBadge,
                  {
                    backgroundColor: `${tc.cyan}20`,
                    borderColor: tc.cyan,
                    paddingHorizontal: scaleWidth(10),
                    paddingVertical: scaleHeight(4),
                  },
                ]}
              >
                <Text style={[styles.aiBadgeText, { color: tc.cyan, fontSize: scaleFont(13) }]}>
                  {t('errorBoundary.aiDoctor', { defaultValue: 'AI DOKTOR' })}
                </Text>
              </View>

              <Text style={[styles.headerTitleText, { color: tc.textPri, fontSize: scaleFont(12) }]}>
                {activeCode} {t('aiDoctor.reportTitle', { defaultValue: 'Arıza Kodu Analizi' })}
              </Text>
            </View>

            <TouchableOpacity onPress={onClose} style={{ padding: scaleMod(6) }}>
              <Text style={[styles.closeIcon, { color: tc.textPri, fontSize: scaleFont(16) }]}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Multi-DTC Selector Tabs when more than 1 code exists */}
          {dtcList.length > 1 && (
            <View style={{ flexDirection: 'row', gap: scaleWidth(8), marginBottom: scaleHeight(12), flexWrap: 'wrap' }}>
              {dtcList.map((dtcItem, idx) => {
                const isSelected = idx === safeIndex;
                return (
                  <TouchableOpacity
                    key={idx}
                    onPress={() => setSelectedDtcIndex(idx)}
                    style={{
                      backgroundColor: isSelected ? tc.cyan : `${tc.cyan}18`,
                      borderColor: tc.cyan,
                      borderWidth: 1,
                      borderRadius: 8,
                      paddingHorizontal: scaleWidth(10),
                      paddingVertical: scaleHeight(4),
                    }}
                  >
                    <Text
                      style={{
                        color: isSelected ? '#000' : tc.cyan,
                        fontFamily: MONO,
                        fontSize: scaleFont(11),
                        fontWeight: '900',
                      }}
                    >
                      {dtcItem}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          {loading ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator size="large" color={tc.cyan} />
              <Text style={[styles.loadingText, { color: tc.textSec }]}>
                {t('aiDoctor.analyzing', { defaultValue: 'Yapay Zeka Analiz Ediyor...' })}
              </Text>
            </View>
          ) : (
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ gap: scaleHeight(14), paddingBottom: scaleHeight(20) }}
            >
              {isFreeTrial && (
                <View style={[styles.freeTrialBanner, { backgroundColor: `${tc.cyan}15`, borderColor: tc.cyan }]}>
                  <Text style={[styles.freeTrialBadgeText, { color: tc.cyan }]}>
                    {t('aiDoctor.freeTrialBadge', { defaultValue: 'ÜCRETSİZ PRO DENEME HAKKI KULLANILDI' })}
                  </Text>
                </View>
              )}

              <View
                style={[
                  styles.healthScoreCard,
                  {
                    backgroundColor: isOptimal ? '#0d331e' : '#3d1214',
                    borderColor: isOptimal ? '#00cc66' : '#ff3344',
                    padding: scaleMod(12),
                  },
                ]}
              >
                <Text
                  style={[
                    styles.healthScoreTitle,
                    { color: isOptimal ? '#00ee77' : '#ff5566', fontSize: scaleFont(11) },
                  ]}
                >
                  {t('aiDoctor.healthImpactTitle', { defaultValue: 'MOTOR SAĞLIK ETKİ SKORU' }).toUpperCase()}
                </Text>
                <Text style={[styles.healthScoreValue, { fontSize: scaleFont(12) }]}>
                  {healthScore} / 100
                </Text>
              </View>

              <View
                style={[
                  styles.sectionCard,
                  {
                    backgroundColor: tc.bg,
                    borderColor: tc.border,
                    padding: scaleMod(14),
                    gap: scaleHeight(6),
                  },
                ]}
              >
                <Text
                  style={[
                    styles.sectionHeader,
                    { color: tc.cyan, fontSize: scaleFont(10) },
                  ]}
                >
                  {t('aiDoctor.drivingSafety', { defaultValue: 'SÜRÜŞ EMNİYETİ REHBERİ' }).toUpperCase()}
                </Text>
                <Text style={[styles.sectionBodyText, { color: tc.textPri, fontSize: scaleFont(11), lineHeight: scaleFont(16) }]}>
                  {isCurrentCritical
                    ? t('aiDoctor.criticalDrive', { defaultValue: 'Kritik arıza! Motor ve güvenlik sistemlerini korumak için en yakın servise sürün.' })
                    : t('aiDoctor.warningDrive', { defaultValue: 'Düşük hızda servise kadar sürülmesi emniyetlidir.' })}
                </Text>
              </View>

              <View
                style={[
                  styles.sectionCard,
                  {
                    backgroundColor: tc.bg,
                    borderColor: tc.border,
                    padding: scaleMod(14),
                    gap: scaleHeight(8),
                  },
                ]}
              >
                <Text
                  style={[
                    styles.sectionHeader,
                    { color: tc.cyan, fontSize: scaleFont(10) },
                  ]}
                >
                  {t('aiDoctor.causes', { defaultValue: 'OLASI KÖK NEDENLER' }).toUpperCase()}
                </Text>
                {guided.probableCauses.map((pc, idx) => (
                  <View key={idx} style={styles.causeRow}>
                    <Text style={[styles.causeText, { color: tc.textPri, fontSize: scaleFont(11) }]}>
                      • {pc.cause}
                    </Text>
                    <Text
                      style={[
                        styles.causePercentage,
                        { color: tc.cyan, fontSize: scaleFont(10), marginLeft: scaleWidth(8) },
                      ]}
                    >
                      {formatPercentage(pc.probability)}
                    </Text>
                  </View>
                ))}
              </View>

              <View
                style={[
                  styles.sectionCard,
                  {
                    backgroundColor: tc.bg,
                    borderColor: tc.border,
                    padding: scaleMod(14),
                    gap: scaleHeight(8),
                  },
                ]}
              >
                <Text
                  style={[
                    styles.sectionHeader,
                    { color: tc.cyan, fontSize: scaleFont(10) },
                  ]}
                >
                  {t('aiDoctor.recommendedAction', { defaultValue: 'TAVSİYE EDİLEN MEKANİK İŞLEM' }).toUpperCase()}
                </Text>
                <Text style={[styles.stepText, { color: tc.textPri, fontSize: scaleFont(11), lineHeight: scaleFont(16) }]}>
                  1. {guided.recommendedAction}
                </Text>
                <Text style={[styles.stepText, { color: tc.textSec, fontSize: scaleFont(11), lineHeight: scaleFont(16) }]}>
                  2. {t('aiDoctor.stepGeneric2', { defaultValue: 'Tesisat konnektörlerini inceledikten sonra DTC kodlarını silin.' })}
                </Text>
              </View>

              {guided.tsbSummary && (
                <View
                  style={[
                    styles.sectionCard,
                    {
                      backgroundColor: `${tc.cyan}0A`,
                      borderColor: tc.cyan,
                      padding: scaleMod(14),
                      gap: scaleHeight(6),
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.sectionHeader,
                      { color: tc.cyan, fontSize: scaleFont(10) },
                    ]}
                  >
                    {t('reportExport.technicalTsb', { defaultValue: 'TEKNİK TSB BÜLTENİ' }).toUpperCase()}
                  </Text>
                  <Text style={[styles.sectionBodyText, { color: tc.textPri, fontSize: scaleFont(11), lineHeight: scaleFont(16) }]}>
                    {guided.tsbSummary}
                  </Text>
                </View>
              )}

              <View style={{ gap: scaleHeight(10), marginTop: scaleHeight(4) }}>
                <TouchableOpacity
                  activeOpacity={0.7}
                  style={[
                    styles.primaryBtn,
                    {
                      backgroundColor: tc.bg,
                      borderColor: tc.cyan,
                      paddingVertical: scaleHeight(12),
                    },
                  ]}
                  onPress={onClose}
                >
                  <Text
                    style={[
                      styles.primaryBtnText,
                      { color: tc.cyan, fontSize: scaleFont(11) },
                    ]}
                  >
                    {t('dtcDetail.backToDetail', { defaultValue: 'ARIZA DETAYLARINA DÖN' }).toUpperCase()}
                  </Text>
                </TouchableOpacity>

                {onClearDtc && (
                  <TouchableOpacity
                    activeOpacity={0.7}
                    style={[
                      styles.secondaryBtn,
                      {
                        backgroundColor: `${tc.red}18`,
                        borderColor: tc.red,
                        paddingVertical: scaleHeight(10),
                      },
                    ]}
                    onPress={() => {
                      onClose();
                      onClearDtc();
                    }}
                  >
                    <Text
                      style={[
                        styles.secondaryBtnText,
                        { color: tc.red, fontSize: scaleFont(11) },
                      ]}
                    >
                      {t('service.clearCodes', { defaultValue: 'KODLARI SİL' }).toUpperCase()}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: 1,
    maxHeight: '85%',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  aiBadge: {
    borderWidth: 1,
    borderRadius: 8,
  },
  aiBadgeText: {
    fontWeight: '900',
    fontFamily: MONO,
  },
  headerTitleText: {
    fontWeight: '900',
    fontFamily: MONO,
  },
  closeIcon: {
    fontWeight: '900',
    fontFamily: MONO,
  },
  loadingBox: {
    padding: 30,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 13,
    fontWeight: '700',
    fontFamily: MONO,
  },
  freeTrialBanner: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 8,
    alignItems: 'center',
    marginBottom: 8,
  },
  freeTrialBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    fontFamily: MONO,
  },
  healthScoreCard: {
    borderWidth: 1,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  healthScoreTitle: {
    fontWeight: '900',
    fontFamily: MONO,
  },
  healthScoreValue: {
    color: '#ffffff',
    fontWeight: '900',
    fontFamily: MONO,
  },
  sectionCard: {
    borderRadius: 12,
    borderWidth: 1,
  },
  sectionHeader: {
    fontFamily: MONO,
    fontWeight: '900',
    letterSpacing: 1,
  },
  sectionBodyText: {
    fontFamily: MONO,
  },
  causeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  causeText: {
    fontFamily: MONO,
    flex: 1,
  },
  causePercentage: {
    fontFamily: MONO,
    fontWeight: '800',
  },
  stepText: {
    fontFamily: MONO,
  },
  primaryBtn: {
    borderWidth: 1,
    borderRadius: 10,
    alignItems: 'center',
  },
  primaryBtnText: {
    fontWeight: '900',
    fontFamily: MONO,
    letterSpacing: 1,
  },
  secondaryBtn: {
    borderWidth: 1,
    borderRadius: 10,
    alignItems: 'center',
  },
  secondaryBtnText: {
    fontWeight: '900',
    fontFamily: MONO,
  },
});
