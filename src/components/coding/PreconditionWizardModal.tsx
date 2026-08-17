/**
 * PreconditionWizardModal.tsx
 * 
 * MotoCortex Interactive Pre-condition Checklist Wizard.
 * Redesigned for 100% MotoCortex design system harmony (Dark & Light theme, Bottom-Sheet style, zero clipping).
 */

import React, { useState } from 'react';
import {
 View,
 Text,
 Modal,
 TouchableOpacity,
 StyleSheet,
 ScrollView,
 Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useThemeColors } from '../../theme';
import { useResponsive } from '../../hooks/useResponsive';

const MONO = Platform.OS === 'ios' ? 'System' : 'sans-serif';

interface PreconditionWizardModalProps {
 visible: boolean;
 onClose: () => void;
 onConfirmAndProceed: () => void;
 currentVoltage: number;
 isSimulationMode?: boolean;
 featureName?: string;
}

export const PreconditionWizardModal: React.FC<PreconditionWizardModalProps> = ({
 visible,
 onClose,
 onConfirmAndProceed,
 currentVoltage,
 isSimulationMode = false,
 featureName = 'ECU Coding',
}) => {
 const { t } = useTranslation();
 const colors = useThemeColors();
 const insets = useSafeAreaInsets();
 const { s: scaleWidth, vs: scaleHeight, ms: scaleMod, fs: scaleFont } = useResponsive();

 const [isIgnitionChecked, setIsIgnitionChecked] = useState(false);
 const [isHandbrakeChecked, setIsHandbrakeChecked] = useState(false);
 const [isLoadsChecked, setIsLoadsChecked] = useState(false);

 const effectiveVoltage = isSimulationMode ? 12.8 : currentVoltage;
 const isVoltageSafe = effectiveVoltage >= 12.4;
 const isVoltageCritical = effectiveVoltage < 12.0;

 const allConditionsMet = isIgnitionChecked && isHandbrakeChecked && isLoadsChecked && isVoltageSafe;

 const handleConfirm = () => {
 if (!allConditionsMet) return;
 onConfirmAndProceed();
 };

 return (
 <Modal
 visible={visible}
 animationType="slide"
 transparent
 onRequestClose={onClose}
 >
 <View style={[styles.backdrop, { backgroundColor: colors.overlayHeavy }]}>
 <View style={[
 styles.bottomSheet,
 {
 backgroundColor: colors.card,
 borderColor: colors.border,
 paddingBottom: insets.bottom + scaleHeight(12),
 }
 ]}>
 {/* Header */}
 <View style={[styles.headerRow, { borderBottomColor: colors.border }]}>
 <View style={{ flex: 1, paddingRight: scaleWidth(8) }}>
 <Text style={[styles.modalTitle, { color: colors.textPri, fontSize: scaleFont(13) }]}>
 {t('coding.wizard_title', 'Pre-Coding Safety Checklist')}
 </Text>
 <Text numberOfLines={1} style={[styles.modalSubtitle, { color: colors.textSec, fontSize: scaleFont(9.5) }]}>
 {featureName}
 </Text>
 </View>
 <TouchableOpacity
 onPress={onClose}
 hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
 style={[styles.closeButton, { backgroundColor: colors.elevated, borderColor: colors.border }]}
 >
 <Text style={{ color: colors.textPri, fontSize: scaleFont(14), fontWeight: '900' }}>✕</Text>
 </TouchableOpacity>
 </View>

 <ScrollView
 showsVerticalScrollIndicator={false}
 contentContainerStyle={[styles.scrollContent, { paddingBottom: scaleHeight(16) }]}
 >
 {/* Live Battery Voltage Card */}
 <View style={[
 styles.voltageCard,
 {
 backgroundColor: isVoltageSafe ? `${colors.green}15` : isVoltageCritical ? `${colors.red}20` : `${colors.amber}15`,
 borderColor: isVoltageSafe ? colors.green : isVoltageCritical ? colors.red : colors.amber,
 padding: scaleMod(12),
 marginBottom: scaleHeight(12),
 }
 ]}>
 <View style={styles.voltageHeader}>
 <Text style={[styles.voltageTitle, { color: colors.textPri, fontSize: scaleFont(10.5) }]}>
 {t('coding.voltage_check', 'Battery Voltage Check (Min 12.5V)')}
 </Text>
 <View style={[
 styles.voltageBadge,
 { backgroundColor: isVoltageSafe ? colors.green : isVoltageCritical ? colors.red : colors.amber }
 ]}>
 <Text style={styles.voltageBadgeText}>
 {isVoltageSafe ? 'OPTIMAL' : isVoltageCritical ? 'CRITICAL' : 'LOW'}
 </Text>
 </View>
 </View>
 <Text style={[
 styles.voltageValue,
 { color: isVoltageSafe ? colors.green : isVoltageCritical ? colors.red : colors.amber, fontSize: scaleFont(20) }
 ]}>
 {effectiveVoltage.toFixed(1)} V
 </Text>
 {isVoltageCritical && (
 <Text style={[styles.voltageWarning, { color: colors.red, fontSize: scaleFont(9.5) }]}>
 {t('coding.voltage_too_low', 'Voltage is too low. Connect battery charger to prevent bricking.')}
 </Text>
 )}
 </View>

 {/* Checklist Header */}
 <Text style={[styles.checklistHeader, { color: colors.textTertiary, fontSize: scaleFont(9.5) }]}>
 {t('coding.preconditions_label', 'MANDATORY PRE-CONDITIONS')}
 </Text>

 {/* 1. Ignition Check */}
 <TouchableOpacity
 activeOpacity={0.7}
 onPress={() => setIsIgnitionChecked(!isIgnitionChecked)}
 style={[
 styles.checkItem,
 {
 backgroundColor: colors.bg,
 borderColor: isIgnitionChecked ? colors.cyan : colors.border,
 padding: scaleMod(10),
 marginBottom: scaleHeight(8),
 }
 ]}
 >
 <View style={[
 styles.checkbox,
 {
 borderColor: isIgnitionChecked ? colors.cyan : colors.border,
 backgroundColor: isIgnitionChecked ? colors.cyan : 'transparent'
 }
 ]}>
 {isIgnitionChecked && <Text style={[styles.checkmark, { color: '#ffffff' }]}>✓</Text>}
 </View>
 <View style={styles.checkTextContainer}>
 <Text style={[styles.checkTitle, { color: colors.textPri, fontSize: scaleFont(11) }]}>
 {t('coding.ignition_check', 'Ignition ON, Engine OFF')}
 </Text>
 <Text style={[styles.checkDesc, { color: colors.textSec, fontSize: scaleFont(9) }]}>
 {t('coding.ignition_desc', 'Switch on ignition without starting the engine.')}
 </Text>
 </View>
 </TouchableOpacity>

 {/* 2. Handbrake Check */}
 <TouchableOpacity
 activeOpacity={0.7}
 onPress={() => setIsHandbrakeChecked(!isHandbrakeChecked)}
 style={[
 styles.checkItem,
 {
 backgroundColor: colors.bg,
 borderColor: isHandbrakeChecked ? colors.cyan : colors.border,
 padding: scaleMod(10),
 marginBottom: scaleHeight(8),
 }
 ]}
 >
 <View style={[
 styles.checkbox,
 {
 borderColor: isHandbrakeChecked ? colors.cyan : colors.border,
 backgroundColor: isHandbrakeChecked ? colors.cyan : 'transparent'
 }
 ]}>
 {isHandbrakeChecked && <Text style={[styles.checkmark, { color: '#ffffff' }]}>✓</Text>}
 </View>
 <View style={styles.checkTextContainer}>
 <Text style={[styles.checkTitle, { color: colors.textPri, fontSize: scaleFont(11) }]}>
 {t('coding.handbrake_check', 'Parking Brake Engaged')}
 </Text>
 <Text style={[styles.checkDesc, { color: colors.textSec, fontSize: scaleFont(9) }]}>
 {t('coding.handbrake_desc', 'Ensure vehicle is stationary and parking brake is ON.')}
 </Text>
 </View>
 </TouchableOpacity>

 {/* 3. Electrical Loads Check */}
 <TouchableOpacity
 activeOpacity={0.7}
 onPress={() => setIsLoadsChecked(!isLoadsChecked)}
 style={[
 styles.checkItem,
 {
 backgroundColor: colors.bg,
 borderColor: isLoadsChecked ? colors.cyan : colors.border,
 padding: scaleMod(10),
 marginBottom: scaleHeight(12),
 }
 ]}
 >
 <View style={[
 styles.checkbox,
 {
 borderColor: isLoadsChecked ? colors.cyan : colors.border,
 backgroundColor: isLoadsChecked ? colors.cyan : 'transparent'
 }
 ]}>
 {isLoadsChecked && <Text style={[styles.checkmark, { color: '#ffffff' }]}>✓</Text>}
 </View>
 <View style={styles.checkTextContainer}>
 <Text style={[styles.checkTitle, { color: colors.textPri, fontSize: scaleFont(11) }]}>
 {t('coding.loads_check', 'Headlights, AC & Radio OFF')}
 </Text>
 <Text style={[styles.checkDesc, { color: colors.textSec, fontSize: scaleFont(9) }]}>
 {t('coding.loads_desc', 'Turn off all high-power loads to prevent voltage dips.')}
 </Text>
 </View>
 </TouchableOpacity>

 {/* Confirm Button */}
 <TouchableOpacity
 activeOpacity={0.85}
 disabled={!allConditionsMet}
 onPress={handleConfirm}
 style={[
 styles.confirmBtn,
 {
 backgroundColor: allConditionsMet ? colors.cyan : colors.border,
 opacity: allConditionsMet ? 1 : 0.6,
 paddingVertical: scaleHeight(12),
 }
 ]}
 >
 <Text style={[styles.confirmBtnText, { fontSize: scaleFont(12) }]}>
 {t('coding.confirm_and_proceed', 'Confirm & Start Coding')}
 </Text>
 </TouchableOpacity>
 </ScrollView>
 </View>
 </View>
 </Modal>
 );
};

const styles = StyleSheet.create({
 backdrop: {
 flex: 1,
 justifyContent: 'flex-end',
 },
 bottomSheet: {
 borderTopLeftRadius: 20,
 borderTopRightRadius: 20,
 borderTopWidth: 1.2,
 borderLeftWidth: 1.2,
 borderRightWidth: 1.2,
 maxHeight: '90%',
 paddingTop: 14,
 paddingHorizontal: 16,
 },
 headerRow: {
 flexDirection: 'row',
 alignItems: 'flex-start',
 justifyContent: 'space-between',
 paddingBottom: 10,
 borderBottomWidth: 1,
 },
 modalTitle: {
 fontWeight: '900',
 fontFamily: MONO,
 letterSpacing: 0.5,
 },
 modalSubtitle: {
 fontFamily: MONO,
 marginTop: 2,
 },
 closeButton: {
 width: 28,
 height: 28,
 borderRadius: 14,
 borderWidth: 1,
 justifyContent: 'center',
 alignItems: 'center',
 },
 scrollContent: {
 paddingTop: 12,
 },
 voltageCard: {
 borderRadius: 10,
 borderWidth: 1.2,
 },
 voltageHeader: {
 flexDirection: 'row',
 justifyContent: 'space-between',
 alignItems: 'center',
 marginBottom: 4,
 },
 voltageTitle: {
 fontWeight: '700',
 fontFamily: MONO,
 },
 voltageBadge: {
 paddingHorizontal: 6,
 paddingVertical: 2,
 borderRadius: 4,
 },
 voltageBadgeText: {
 color: '#ffffff',
 fontSize: 8.5,
 fontWeight: '900',
 fontFamily: MONO,
 },
 voltageValue: {
 fontWeight: '900',
 fontFamily: MONO,
 },
 voltageWarning: {
 marginTop: 4,
 fontWeight: '700',
 fontFamily: MONO,
 },
 checklistHeader: {
 fontWeight: '800',
 fontFamily: MONO,
 letterSpacing: 0.5,
 marginBottom: 8,
 },
 checkItem: {
 flexDirection: 'row',
 alignItems: 'center',
 borderRadius: 8,
 borderWidth: 1,
 },
 checkbox: {
 width: 20,
 height: 20,
 borderRadius: 5,
 borderWidth: 1.5,
 justifyContent: 'center',
 alignItems: 'center',
 marginRight: 10,
 },
 checkmark: {
 color: '#ffffff',
 fontSize: 11,
 fontWeight: '900',
 },
 checkTextContainer: {
 flex: 1,
 },
 checkTitle: {
 fontWeight: '800',
 fontFamily: MONO,
 },
 checkDesc: {
 marginTop: 1,
 fontFamily: MONO,
 },
 confirmBtn: {
 borderRadius: 10,
 alignItems: 'center',
 justifyContent: 'center',
 },
 confirmBtnText: {
 color: '#ffffff',
 fontWeight: '900',
 fontFamily: MONO,
 letterSpacing: 0.5,
 },
});

export default PreconditionWizardModal;
