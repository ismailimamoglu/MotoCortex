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
 SafeAreaView
} from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { useTranslation } from 'react-i18next';
import { useThemeColors } from '../theme';
import { useResponsive } from '../hooks/useResponsive';
import { AiDoctorService, AiDiagnosticResult, AiDiagnosticContext } from '../services/aiDoctorService';
import { useAppStore } from '../store/useAppStore';
import { useBluetoothStore } from '../store/useBluetoothStore';

const MONO = Platform.OS === 'ios' ? 'System' : 'sans-serif';

interface AiDoctorModalProps {
 visible: boolean;
 onClose: () => void;
 context: AiDiagnosticContext;
}

export default function AiDoctorModal({ visible, onClose, context }: AiDoctorModalProps) {
 const { t } = useTranslation();
 const colors = useThemeColors();
 const { s: scaleWidth, vs: scaleHeight, fs: scaleFont } = useResponsive();

 const [loading, setLoading] = useState(true);
 const [result, setResult] = useState<AiDiagnosticResult | null>(null);
 const [isFreeTrial, setIsFreeTrial] = useState(false);

 const dtcKey = (context?.dtcCodes || []).join(',');
 const contextKey = visible ? `${dtcKey}_${context?.vin || ''}` : '';

 useEffect(() => {
 let isMounted = true;

 if (visible && contextKey) {
 const isPro = useAppStore.getState().isPro;
 const isSim = useAppStore.getState().isSimulationMode;

 const runDiagnosticWorkflow = async () => {
 if (!isPro && !isSim) {
 try {
 const used = await SecureStore.getItemAsync('motocortex_ai_trial_used');
 if (used === 'true') {
 if (isMounted) {
 onClose();
 useBluetoothStore.getState().setPaywallContext('AI_DOCTOR_LIMIT');
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

 if (isMounted) {
 setLoading(true);
 AiDoctorService.analyzeFaults(context)
 .then((res) => {
 if (isMounted) setResult(res);
 })
 .catch(() => {
 if (isMounted) setResult(null);
 })
 .finally(() => {
 if (isMounted) setLoading(false);
 });
 }
 };

 runDiagnosticWorkflow();
 }
 return () => { isMounted = false; };
 }, [visible, contextKey]);

 const getRiskBadge = (level: string) => {
 switch (level) {
 case 'CRITICAL':
 return { label: ' CRITICAL RISK', bg: '#3d1214', border: '#ff3344', text: '#ff5566' };
 case 'WARNING':
 return { label: ' MODERATE RISK', bg: '#36280b', border: '#ffaa00', text: '#ffbb11' };
 case 'SAFE':
 default:
 return { label: ' SYSTEM OPTIMAL', bg: '#0d331e', border: '#00cc66', text: '#00ee77' };
 }
 };

 const badge = getRiskBadge(result?.riskLevel || 'SAFE');

 return (
 <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onClose}>
 <SafeAreaView style={[styles.container, { backgroundColor: colors.bg || '#090d16' }]}>
 <View style={styles.header}>
 <View>
 <Text style={[styles.headerTitle, { color: colors.textPri || '#ffffff' }]}>{t('aiDoctor.modalTitle')}</Text>
 <Text style={styles.headerSubtitle}>{t('aiDoctor.modalSubtitle')}</Text>
 </View>
 <TouchableOpacity onPress={onClose} style={styles.closeButton}>
 <Text style={[styles.closeText, { color: colors.textPri }]}>✕</Text>
 </TouchableOpacity>
 </View>

 {loading ? (
 <View style={styles.loadingContainer}>
 <ActivityIndicator size="large" color="#00e5ff" />
 <Text style={styles.loadingText}>{t('aiDoctor.analyzing')}</Text>
 </View>
 ) : result ? (
 <ScrollView contentContainerStyle={styles.scrollContent}>
 {/* Free Trial Banner */}
 {isFreeTrial && (
 <View style={styles.freeTrialBanner}>
 <Text style={styles.freeTrialBadgeText}>
 {t('aiDoctor.freeTrialBadge')}
 </Text>
 </View>
 )}

 {/* Risk Badge Banner */}
 <View style={[styles.riskBanner, { backgroundColor: badge.bg, borderColor: badge.border }]}>
 <Text style={[styles.riskBadgeText, { color: badge.text }]}>{badge.label.replace(' ', '').replace(' ', '').replace(' ', '')}</Text>
 <Text style={styles.riskScoreText}>{t('aiDoctor.healthImpact', { score: result.riskScore })}</Text>
 </View>

 {/* Analysis Title & Summary */}
 <View style={[styles.card, { backgroundColor: '#131b2e', borderColor: '#1f2d4a' }]}>
 <Text style={styles.cardTitle}>{result.title}</Text>
 <Text style={styles.cardSummary}>{result.summary}</Text>
 </View>

 {/* Driving Safety Advice */}
 <View style={[styles.card, { backgroundColor: '#1a1928', borderColor: '#3a3858' }]}>
 <Text style={styles.sectionHeader}>{t('aiDoctor.drivingSafety')}</Text>
 <Text style={styles.safetyText}>{result.canDriveSafetyText}</Text>
 </View>

 {/* Potential Causes */}
 {result.causes.length > 0 && (
 <View style={[styles.card, { backgroundColor: '#131b2e', borderColor: '#1f2d4a' }]}>
 <Text style={styles.sectionHeader}>{t('aiDoctor.causes')}</Text>
 {result.causes.map((cause, idx) => (
 <View key={idx} style={styles.bulletItem}>
 <Text style={styles.bulletSymbol}>•</Text>
 <Text style={styles.bulletText}>{cause}</Text>
 </View>
 ))}
 </View>
 )}

 {/* Actionable Repair Steps */}
 {result.recommendedSteps.length > 0 && (
 <View style={[styles.card, { backgroundColor: '#131b2e', borderColor: '#1f2d4a' }]}>
 <Text style={styles.sectionHeader}>{t('aiDoctor.recommendedAction')}</Text>
 {result.recommendedSteps.map((step, idx) => (
 <View key={idx} style={styles.bulletItem}>
 <Text style={styles.stepNumber}>{idx + 1}.</Text>
 <Text style={styles.bulletText}>{step}</Text>
 </View>
 ))}
 </View>
 )}
 </ScrollView>
 ) : null}
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
 fontSize: 20,
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
 loadingContainer: {
 flex: 1,
 justifyContent: 'center',
 alignItems: 'center',
 padding: 30,
 },
 loadingText: {
 color: '#88a0c0',
 marginTop: 15,
 textAlign: 'center',
 fontSize: 14,
 },
 scrollContent: {
 padding: 16,
 paddingBottom: 40,
 },
 riskBanner: {
 padding: 16,
 borderRadius: 12,
 borderWidth: 1,
 marginBottom: 16,
 flexDirection: 'row',
 justifyContent: 'space-between',
 alignItems: 'center',
 },
 riskBadgeText: {
 fontSize: 14,
 fontWeight: 'bold',
 fontFamily: MONO,
 },
 riskScoreText: {
 fontSize: 12,
 color: '#d0e0f0',
 },
 card: {
 padding: 16,
 borderRadius: 12,
 borderWidth: 1,
 marginBottom: 14,
 },
 cardTitle: {
 fontSize: 17,
 fontWeight: 'bold',
 color: '#00e5ff',
 marginBottom: 6,
 },
 cardSummary: {
 fontSize: 14,
 color: '#d0e0f0',
 lineHeight: 20,
 },
 sectionHeader: {
 fontSize: 15,
 fontWeight: 'bold',
 color: '#ffffff',
 marginBottom: 10,
 },
 safetyText: {
 fontSize: 14,
 color: '#e0e8f8',
 lineHeight: 20,
 },
 bulletItem: {
 flexDirection: 'row',
 alignItems: 'flex-start',
 marginBottom: 8,
 },
 bulletSymbol: {
 color: '#00e5ff',
 fontSize: 16,
 marginRight: 8,
 marginTop: -2,
 },
 stepNumber: {
 color: '#00e5ff',
 fontWeight: 'bold',
 marginRight: 8,
 },
 bulletText: {
 fontSize: 14,
 color: '#c0d4ec',
 flex: 1,
 lineHeight: 20,
 },
 costText: {
 fontSize: 22,
 fontWeight: 'bold',
 color: '#00ffaa',
 fontFamily: MONO,
 },
 freeTrialBanner: {
 backgroundColor: '#1b2d42',
 borderWidth: 1.5,
 borderColor: '#00e5ff',
 borderRadius: 10,
 paddingVertical: 10,
 paddingHorizontal: 14,
 marginBottom: 12,
 alignItems: 'center',
 },
 freeTrialBadgeText: {
 fontSize: 12,
 fontWeight: '900',
 color: '#00e5ff',
 fontFamily: MONO,
 textAlign: 'center',
 },
});
