import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform, PermissionsAndroid, ActivityIndicator, SafeAreaView, Alert, Linking, ScrollView } from 'react-native';
import * as Location from 'expo-location';
import { useTranslation } from 'react-i18next';
import { useAppStore, AppLanguage } from '../store/useAppStore';
import { useThemeColors } from '../theme';
import BLEBridge from '../api/BLEBridge';
import { State } from 'react-native-ble-plx';
import { useResponsive } from '../hooks/useResponsive';
import { ALL_26_LANGUAGES } from '../constants/languages';

interface PermissionGatewayProps {
 children?: React.ReactNode;
 onComplete?: () => void;
}

export default function PermissionGateway({ children, onComplete }: PermissionGatewayProps) {
 const { t, i18n } = useTranslation();
 const hasOnboarded = useAppStore((state) => state.hasOnboarded);
 const setHasOnboarded = useAppStore((state) => state.setHasOnboarded);
 const setLanguage = useAppStore((state) => state.setLanguage);
 const isTelemetryOptedIn = useAppStore((state) => state.isTelemetryOptedIn);
 const setIsTelemetryOptedIn = useAppStore((state) => state.setIsTelemetryOptedIn);
 const colors = useThemeColors();
 const language = useAppStore((state) => state.language);
 const { s: scaleWidth, vs: scaleHeight, ms: scaleMod, fs: scaleFont, isLargeTablet } = useResponsive();

 const [step, setStep] = useState<'language' | 'permissions'>('language');
 const [isLoading, setIsLoading] = useState(false);
 const [btStatus, setBtStatus] = useState<'idle' | 'granted' | 'denied'>('idle');
 const [locStatus, setLocStatus] = useState<'idle' | 'granted' | 'denied'>('idle');

 const requestPermissions = async () => {
 setIsLoading(true);
 try {
 let btGranted = true;
 let locGranted = true;

 if (Platform.OS === 'android') {
 const androidVersion = typeof Platform.Version === 'number' ? Platform.Version : parseInt(String(Platform.Version), 10);
 
 if (androidVersion >= 31) {
 const grantedBt = await PermissionsAndroid.requestMultiple([
 PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
 PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
 ]);
 btGranted =
 grantedBt[PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN] === PermissionsAndroid.RESULTS.GRANTED &&
 grantedBt[PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT] === PermissionsAndroid.RESULTS.GRANTED;
 } else {
 // Android 11 and below require ACCESS_FINE_LOCATION for Bluetooth scanning
 const grantedLegacy = await PermissionsAndroid.requestMultiple([
 PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
 PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION,
 ]);
 btGranted =
 grantedLegacy[PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION] === PermissionsAndroid.RESULTS.GRANTED;
 }
 } else {
 try {
 const manager = BLEBridge.getInstance();
 if (!manager) {
 btGranted = true;
 } else {
 const bleState = await manager.state();
 console.log('[PermissionGateway] iOS BLE State:', bleState);

 if (bleState === State.PoweredOn || bleState === State.PoweredOff) {
 btGranted = true;
 } else if (bleState === State.Unauthorized) {
 btGranted = false;
 } else {
 btGranted = await new Promise<boolean>((resolve) => {
 const sub = manager.onStateChange((newState) => {
 console.log('[PermissionGateway] iOS BLE State Changed:', newState);
 if (newState === State.PoweredOn || newState === State.PoweredOff) {
 sub.remove();
 resolve(true);
 } else if (newState === State.Unauthorized) {
 sub.remove();
 resolve(false);
 }
 }, true);
 setTimeout(() => {
 sub.remove();
 resolve(true);
 }, 5000);
 });
 }
 }
 } catch (e) {
 console.warn('[PermissionGateway] iOS BLE init error:', e);
 btGranted = false;
 }
 }
 setBtStatus(btGranted ? 'granted' : 'denied');

 if (Platform.OS === 'android') {
 const { status } = await Location.requestForegroundPermissionsAsync();
 locGranted = status === 'granted';
 setLocStatus(locGranted ? 'granted' : 'denied');
 } else {
 locGranted = true;
 setLocStatus('granted');
 }

 if (btGranted && locGranted) {
 setIsTelemetryOptedIn(true);
 setHasOnboarded(true);
 if (onComplete) onComplete();
 } else {
 Alert.alert(
 t('common.warning'),
 t('permissions.deniedDesc'),
 [
 { 
 text: t('permissions.proceedAnyway'), 
 onPress: () => {
 setIsTelemetryOptedIn(true);
 setHasOnboarded(true);
 if (onComplete) onComplete();
 } 
 },
 { 
 text: t('permissions.openSettings'), 
 onPress: () => {
 Linking.openSettings();
 }
 },
 { text: t('common.cancel'), style: 'cancel' }
 ]
 );
 }
 } catch (error) {
 console.warn('Permission request error:', error);
 } finally {
 setIsLoading(false);
 }
 };

 const activeLang = language || 'en';

 const selectLanguage = (lang: string) => {
 setLanguage(lang as AppLanguage);
 };

 const sDyn = React.useMemo(() => {
 return {
 root: {
 flex: 1,
 justifyContent: 'center' as const,
 alignItems: 'center' as const,
 },
 container: {
 width: '90%',
 maxWidth: isLargeTablet ? scaleWidth(460) : scaleWidth(340),
 alignItems: 'center' as const,
 },
 header: {
 alignItems: 'center' as const,
 marginBottom: scaleHeight(24),
 },
 title: {
 fontSize: scaleFont(26),
 fontWeight: '950' as const,
 letterSpacing: 2,
 fontFamily: MONO,
 textAlign: 'center' as const,
 marginBottom: scaleHeight(4),
 },
 subtitle: {
 fontSize: scaleFont(11),
 fontWeight: '800' as const,
 letterSpacing: 1.5,
 fontFamily: MONO,
 textAlign: 'center' as const,
 },
 card: {
 borderWidth: 1.5,
 borderRadius: scaleMod(16),
 width: '100%',
 padding: scaleMod(16),
 marginBottom: scaleHeight(20),
 },
 cardTitle: {
 fontSize: scaleFont(14.5),
 fontWeight: '900' as const,
 marginBottom: scaleHeight(6),
 fontFamily: MONO,
 },
 cardDesc: {
 fontSize: scaleFont(11),
 lineHeight: scaleHeight(15.5),
 marginBottom: scaleHeight(16),
 fontFamily: MONO,
 },
 permRow: {
 flexDirection: 'row' as const,
 borderWidth: 1,
 borderRadius: scaleMod(10),
 padding: scaleMod(10),
 marginBottom: scaleHeight(10),
 alignItems: 'center' as const,
 },
 permIconBox: {
 width: scaleMod(32),
 height: scaleMod(32),
 borderRadius: scaleMod(8),
 justifyContent: 'center' as const,
 alignItems: 'center' as const,
 marginRight: scaleWidth(10),
 },
 permIcon: {
 fontSize: scaleFont(14),
 },
 permTextContainer: {
 flex: 1,
 },
 permLabel: {
 fontSize: scaleFont(11.5),
 fontWeight: '900' as const,
 fontFamily: MONO,
 marginBottom: 2,
 },
 permSub: {
 fontSize: scaleFont(9.5),
 lineHeight: scaleHeight(13),
 fontFamily: MONO,
 },
 statusIcon: {
 fontSize: scaleFont(14),
 fontWeight: '900' as const,
 marginLeft: scaleWidth(8),
 },
 // Language step specific
 langOption: {
 flexDirection: 'row' as const,
 alignItems: 'center' as const,
 borderWidth: 1.5,
 borderRadius: scaleMod(12),
 paddingVertical: scaleHeight(12),
 paddingHorizontal: scaleWidth(16),
 marginBottom: scaleHeight(12),
 },
 langTextContainer: {
 flex: 1,
 marginLeft: scaleWidth(12),
 },
 langTitle: {
 fontSize: scaleFont(13),
 fontWeight: '800' as const,
 fontFamily: MONO,
 },
 langSub: {
 fontSize: scaleFont(10),
 fontFamily: MONO,
 marginTop: 2,
 },
 langEmoji: {
 fontSize: scaleFont(22),
 },
 langCheck: {
 fontSize: scaleFont(14),
 fontWeight: '900' as const,
 },
 actionBtn: {
 width: '100%',
 borderRadius: scaleMod(12),
 paddingVertical: scaleHeight(12),
 justifyContent: 'center' as const,
 alignItems: 'center' as const,
 shadowOffset: { width: 0, height: 4 },
 shadowOpacity: 0.25,
 shadowRadius: 4,
 elevation: 4,
 marginBottom: scaleHeight(12),
 },
 actionBtnDisabled: {
 opacity: 0.6,
 },
 actionBtnText: {
 fontSize: scaleFont(12),
 fontWeight: '900' as const,
 letterSpacing: 0.5,
 fontFamily: MONO,
 },
 skipLink: {
 paddingVertical: scaleHeight(6),
 alignItems: 'center' as const,
 },
 skipText: {
 fontSize: scaleFont(11.5),
 textDecorationLine: 'underline' as const,
 fontFamily: MONO,
 },
 };
 }, [scaleWidth, scaleHeight, scaleMod, scaleFont, isLargeTablet]) as any;

 if (hasOnboarded) {
 return <>{children}</>;
 }

 return (
 <SafeAreaView style={[sDyn.root, { backgroundColor: colors.bg }]}>
 <View style={sDyn.container}>
 {/* Header */}
 <View style={sDyn.header}>
 <Text style={[sDyn.title, { color: colors.cyan }]}>{t('common.brandName', { defaultValue: 'CORTEX OBD2' })}</Text>
 <Text style={[sDyn.subtitle, { color: colors.textSec }]}>
 {step === 'language' 
 ? t('permissions.langSelectSub').toUpperCase()
 : t('permissions.headerSubtitle').toUpperCase()}
 </Text>
 </View>

 {step === 'language' ? (
 // STEP 1: Language Selection Setup
 <View style={{ width: '100%' }}>
 <View style={[sDyn.card, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
 <Text style={[sDyn.cardTitle, { color: colors.textPri }]}>
 {t('permissions.langTitle')}
 </Text>
 <Text style={[sDyn.cardDesc, { color: colors.textTertiary }]}>
 {t('permissions.langDesc')}
 </Text>

 <ScrollView 
 style={{ maxHeight: scaleHeight(280) }}
 contentContainerStyle={{ paddingBottom: scaleHeight(4) }}
 showsVerticalScrollIndicator={true}
 nestedScrollEnabled={true}
 >
 {ALL_26_LANGUAGES.map((lang) => {
 const isSelected = activeLang.startsWith(lang.code);
 return (
 <TouchableOpacity
 key={lang.code}
 style={[
 sDyn.langOption,
 {
 backgroundColor: isSelected ? `${colors.cyan}10` : 'transparent',
 borderColor: isSelected ? colors.cyan : colors.cardBorder,
 marginBottom: scaleHeight(8)
 }
 ]}
 onPress={() => selectLanguage(lang.code)}
 activeOpacity={0.6}
 >
 <Text style={sDyn.langEmoji}>{lang.flag}</Text>
 <View style={sDyn.langTextContainer}>
 <Text style={[sDyn.langTitle, { color: colors.textPri }]}>{lang.name}</Text>
 <Text style={[sDyn.langSub, { color: colors.textSec }]}>{lang.sub}</Text>
 </View>
 {isSelected && <Text style={[sDyn.langCheck, { color: colors.cyan }]}></Text>}
 </TouchableOpacity>
 );
 })}
 </ScrollView>
 </View>

 {/* Next Step Button */}
 <TouchableOpacity
 style={[sDyn.actionBtn, { backgroundColor: colors.cyan, shadowColor: colors.cyan }]}
 onPress={() => setStep('permissions')}
 activeOpacity={0.4}
 >
 <Text style={[sDyn.actionBtnText, { color: colors.card }]}>
 {t('permissions.nextBtn')}
 </Text>
 </TouchableOpacity>
 </View>
 ) : (
 // STEP 2: Permission Request Gateway
 <View style={{ width: '100%' }}>
 <View style={[sDyn.card, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
 <Text style={[sDyn.cardTitle, { color: colors.textPri }]}>{t('permissions.cardTitle')}</Text>
 <Text style={[sDyn.cardDesc, { color: colors.textTertiary }]}>
 {t('permissions.cardDesc')}
 </Text>

 {/* Perm Item 1: Bluetooth */}
 <View style={[sDyn.permRow, { backgroundColor: `${colors.textPri}08`, borderColor: `${colors.textPri}0D` }]}>
 <View style={sDyn.permTextContainer}>
 <Text style={[sDyn.permLabel, { color: colors.textPri }]}>{t('permissions.btLabel')}</Text>
 <Text style={[sDyn.permSub, { color: colors.textSec }]}>
 {t('permissions.btSub')}
 </Text>
 </View>
 {btStatus === 'granted' && <Text style={[sDyn.statusIcon, { color: colors.green }]}>✓</Text>}
 {btStatus === 'denied' && <Text style={[sDyn.statusIcon, { color: colors.red }]}>✕</Text>}
 </View>

 {/* Perm Item 2: Location */}
 {Platform.OS === 'android' && (
 <View style={[sDyn.permRow, { backgroundColor: `${colors.textPri}08`, borderColor: `${colors.textPri}0D` }]}>
 <View style={sDyn.permTextContainer}>
 <Text style={[sDyn.permLabel, { color: colors.textPri }]}>{t('permissions.locLabel')}</Text>
 <Text style={[sDyn.permSub, { color: colors.textSec }]}>
 {t('permissions.locSub')}
 </Text>
 </View>
 {locStatus === 'granted' && <Text style={[sDyn.statusIcon, { color: colors.green }]}>✓</Text>}
 {locStatus === 'denied' && <Text style={[sDyn.statusIcon, { color: colors.red }]}>✕</Text>}
 </View>
 )}
 </View>

 {/* Action Button */}
 <TouchableOpacity
 style={[sDyn.actionBtn, { backgroundColor: colors.cyan, shadowColor: colors.cyan }, isLoading && sDyn.actionBtnDisabled]}
 onPress={requestPermissions}
 disabled={isLoading}
 activeOpacity={0.4}
 >
 {isLoading ? (
 <ActivityIndicator color={colors.card} size="small" />
 ) : (
 <Text style={[sDyn.actionBtnText, { color: colors.card }]}>{t('permissions.grantBtn')}</Text>
 )}
 </TouchableOpacity>
 </View>
 )}
 </View>
 </SafeAreaView>
 );
}

const MONO = Platform.OS === 'ios' ? 'System' : 'sans-serif';
