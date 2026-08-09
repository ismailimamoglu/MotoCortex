import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform, PermissionsAndroid, ActivityIndicator, SafeAreaView, Alert, Linking, ScrollView } from 'react-native';
import * as Location from 'expo-location';
import { useTranslation } from 'react-i18next';
import { useAppStore, AppLanguage } from '../store/useAppStore';
import { useThemeColors } from '../theme';
import BLEBridge from '../api/BLEBridge';
import { State } from 'react-native-ble-plx';
import { useResponsive } from '../hooks/useResponsive';

const LANGUAGES = [
  { code: 'ar', label: 'العربية', sub: 'Arabic Diagnostics Hub', emoji: 'AR' },
  { code: 'cs', label: 'Čeština', sub: 'Czech Diagnostics Hub', emoji: 'CS' },
  { code: 'da', label: 'Dansk', sub: 'Danish Diagnostics Hub', emoji: 'DA' },
  { code: 'de', label: 'Deutsch', sub: 'German Diagnostics Hub', emoji: 'DE' },
  { code: 'el', label: 'Ελληνικά', sub: 'Greek Diagnostics Hub', emoji: 'EL' },
  { code: 'en', label: 'English', sub: 'English Diagnostics Hub', emoji: 'EN' },
  { code: 'es', label: 'Español', sub: 'Spanish Diagnostics Hub', emoji: 'ES' },
  { code: 'fi', label: 'Suomi', sub: 'Finnish Diagnostics Hub', emoji: 'FI' },
  { code: 'fr', label: 'Français', sub: 'French Diagnostics Hub', emoji: 'FR' },
  { code: 'hi', label: 'हिन्दी', sub: 'Hindi Diagnostics Hub', emoji: 'HI' },
  { code: 'hu', label: 'Magyar', sub: 'Hungarian Diagnostics Hub', emoji: 'HU' },
  { code: 'id', label: 'Bahasa Indonesia', sub: 'Indonesian Diagnostics Hub', emoji: 'ID' },
  { code: 'it', label: 'Italiano', sub: 'Italian Diagnostics Hub', emoji: 'IT' },
  { code: 'ja', label: '日本語', sub: 'Japanese Diagnostics Hub', emoji: 'JA' },
  { code: 'ko', label: '한국어', sub: 'Korean Diagnostics Hub', emoji: 'KO' },
  { code: 'nl', label: 'Nederlands', sub: 'Dutch Diagnostics Hub', emoji: 'NL' },
  { code: 'no', label: 'Norsk', sub: 'Norwegian Diagnostics Hub', emoji: 'NO' },
  { code: 'pl', label: 'Polski', sub: 'Polish Diagnostics Hub', emoji: 'PL' },
  { code: 'pt', label: 'Português', sub: 'Portuguese Diagnostics Hub', emoji: 'PT' },
  { code: 'ro', label: 'Română', sub: 'Romanian Diagnostics Hub', emoji: 'RO' },
  { code: 'ru', label: 'Русский', sub: 'Russian Diagnostics Hub', emoji: 'RU' },
  { code: 'sv', label: 'Svenska', sub: 'Swedish Diagnostics Hub', emoji: 'SV' },
  { code: 'th', label: 'ไทย', sub: 'Thai Diagnostics Hub', emoji: 'TH' },
  { code: 'tr', label: 'Türkçe', sub: 'Türkçe Teşhis Arayüzü', emoji: 'TR' },
  { code: 'uk', label: 'Українська', sub: 'Ukrainian Diagnostics Hub', emoji: 'UK' },
  { code: 'zh', label: '中文', sub: 'Chinese Diagnostics Hub', emoji: 'ZH' }
];

interface PermissionGatewayProps {
  children?: React.ReactNode;
}

export default function PermissionGateway({ children }: PermissionGatewayProps) {
  const { t, i18n } = useTranslation();
  const hasOnboarded = useAppStore((state) => state.hasOnboarded);
  const setHasOnboarded = useAppStore((state) => state.setHasOnboarded);
  const setLanguage = useAppStore((state) => state.setLanguage);
  const isTelemetryOptedIn = useAppStore((state) => state.isTelemetryOptedIn);
  const setIsTelemetryOptedIn = useAppStore((state) => state.setIsTelemetryOptedIn);
  const colors = useThemeColors();
  const { s: scaleWidth, vs: scaleHeight, ms: scaleMod, fs: scaleFont, isLargeTablet } = useResponsive();

  if (hasOnboarded) {
    return <>{children}</>;
  }

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
          const bleState = await manager.state();
          console.log('[PermissionGateway] iOS BLE State:', bleState);

          if (bleState === State.PoweredOn) {
            btGranted = true;
          } else if (bleState === State.Unauthorized) {
            btGranted = false;
          } else if (bleState === State.PoweredOff) {
            btGranted = true;
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
        setHasOnboarded(true);
      } else {
        Alert.alert(
          t('common.warning', 'Warning'),
          t('permissions.deniedDesc', 'Some permissions were denied. Cortex OBD2 Diagnostic Scanner may not be able to scan or connect to OBD2 devices successfully.'),
          [
            { text: t('permissions.proceedAnyway', 'Proceed Anyway'), onPress: () => setHasOnboarded(true) },
            { 
              text: t('permissions.openSettings', 'Open Settings'), 
              onPress: () => {
                Linking.openSettings();
              }
            },
            { text: t('common.cancel', 'Cancel'), style: 'cancel' }
          ]
        );
      }
    } catch (error) {
      console.warn('Permission request error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const activeLang = i18n.language || 'en';

  const sortedLanguages = React.useMemo(() => {
    const devicePrefix = activeLang.split('-')[0].toLowerCase();
    return [...LANGUAGES].sort((a, b) => {
      if (a.code === devicePrefix) return -1;
      if (b.code === devicePrefix) return 1;
      return a.label.localeCompare(b.label);
    });
  }, [activeLang]);

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

  return (
    <SafeAreaView style={[sDyn.root, { backgroundColor: colors.bg }]}>
      <View style={sDyn.container}>
        {/* Header */}
        <View style={sDyn.header}>
          <Text style={[sDyn.title, { color: colors.cyan }]}>{t('common.brandName', 'CORTEX OBD2')}</Text>
          <Text style={[sDyn.subtitle, { color: colors.textSec }]}>
            {step === 'language' 
              ? t('permissions.langSelectSub', 'LANGUAGE GATEWAY').toUpperCase()
              : t('permissions.headerSubtitle', 'PERMISSION GATEWAY').toUpperCase()}
          </Text>
        </View>

        {step === 'language' ? (
          // STEP 1: Language Selection Setup
          <View style={{ width: '100%' }}>
            <View style={[sDyn.card, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
              <Text style={[sDyn.cardTitle, { color: colors.textPri }]}>
                {t('permissions.langTitle', 'Select Language')}
              </Text>
              <Text style={[sDyn.cardDesc, { color: colors.textTertiary }]}>
                {t('permissions.langDesc', 'Please select your preferred language to customize your diagnostics experience.')}
              </Text>

              <ScrollView 
                style={{ maxHeight: scaleHeight(260) }}
                contentContainerStyle={{ paddingBottom: scaleHeight(4) }}
                showsVerticalScrollIndicator={true}
                nestedScrollEnabled={true}
              >
                {sortedLanguages.map((lang) => {
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
                      <Text style={sDyn.langEmoji}>{lang.emoji}</Text>
                      <View style={sDyn.langTextContainer}>
                        <Text style={[sDyn.langTitle, { color: colors.textPri }]}>{lang.label}</Text>
                        <Text style={[sDyn.langSub, { color: colors.textSec }]}>{lang.sub}</Text>
                      </View>
                      {isSelected && <Text style={[sDyn.langCheck, { color: colors.cyan }]}>✓</Text>}
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
                {t('permissions.nextBtn', 'CONTINUE')}
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          // STEP 2: Permission Request Gateway
          <View style={{ width: '100%' }}>
            <View style={[sDyn.card, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
              <Text style={[sDyn.cardTitle, { color: colors.textPri }]}>{t('permissions.cardTitle', 'Hardware Access Required')}</Text>
              <Text style={[sDyn.cardDesc, { color: colors.textTertiary }]}>
                {t('permissions.cardDesc', "To improve application quality and vehicle compatibility, completely anonymized engine parameters and diagnostic trouble codes (excluding personal data and VIN) captured during diagnostics may be analyzed on our secure servers. By proceeding, you agree to these anonymous telemetry terms.")}
              </Text>

              {/* Perm Item 1: Bluetooth */}
              <View style={[sDyn.permRow, { backgroundColor: `${colors.textPri}08`, borderColor: `${colors.textPri}0D` }]}>
                <View style={[sDyn.permIconBox, { backgroundColor: `${colors.cyan}1A` }]}>
                  <Text style={sDyn.permIcon}>⚡</Text>
                </View>
                <View style={sDyn.permTextContainer}>
                  <Text style={[sDyn.permLabel, { color: colors.textPri }]}>{t('permissions.btLabel', 'Bluetooth (BLE)')}</Text>
                  <Text style={[sDyn.permSub, { color: colors.textSec }]}>
                    {t('permissions.btSub', 'Used exclusively to pair and stream live CAN-bus/K-Line metrics from your ELM327/OBD2 adapter.')}
                  </Text>
                </View>
                {btStatus === 'granted' && <Text style={[sDyn.statusIcon, { color: colors.green }]}>✓</Text>}
                {btStatus === 'denied' && <Text style={[sDyn.statusIcon, { color: colors.red }]}>✕</Text>}
              </View>

              {/* Perm Item 2: Location */}
              {Platform.OS === 'android' && (
                <View style={[sDyn.permRow, { backgroundColor: `${colors.textPri}08`, borderColor: `${colors.textPri}0D` }]}>
                  <View style={[sDyn.permIconBox, { backgroundColor: `${colors.cyan}1A` }]}>
                    <Text style={sDyn.permIcon}>📍</Text>
                  </View>
                  <View style={sDyn.permTextContainer}>
                    <Text style={[sDyn.permLabel, { color: colors.textPri }]}>{t('permissions.locLabel', 'Fine Location')}</Text>
                    <Text style={[sDyn.permSub, { color: colors.textSec }]}>
                      {t('permissions.locSub', 'Required by Android system architecture to discover low-energy Bluetooth beacons nearby. We do not track your drives.')}
                    </Text>
                  </View>
                  {locStatus === 'granted' && <Text style={[sDyn.statusIcon, { color: colors.green }]}>✓</Text>}
                  {locStatus === 'denied' && <Text style={[sDyn.statusIcon, { color: colors.red }]}>✕</Text>}
                </View>
              )}

              {/* Perm Item 3: Opt-In Telemetry */}
              <TouchableOpacity
                style={[sDyn.permRow, { backgroundColor: isTelemetryOptedIn ? `${colors.cyan}15` : `${colors.textPri}08`, borderColor: isTelemetryOptedIn ? colors.cyan : `${colors.textPri}0D` }]}
                onPress={() => setIsTelemetryOptedIn(!isTelemetryOptedIn)}
                activeOpacity={0.7}
              >
                <View style={[sDyn.permIconBox, { backgroundColor: `${colors.cyan}1A` }]}>
                  <Text style={sDyn.permIcon}>📊</Text>
                </View>
                <View style={sDyn.permTextContainer}>
                  <Text style={[sDyn.permLabel, { color: colors.textPri }]}>
                    {t('permissions.telemetryLabel', 'Diagnostic Telemetry (Opt-In)')}
                  </Text>
                  <Text style={[sDyn.permSub, { color: colors.textSec }]}>
                    {t('permissions.telemetrySub', 'Share anonymous protocol and error logs to improve vehicle compatibility.')}
                  </Text>
                </View>
                <Text style={[sDyn.statusIcon, { color: isTelemetryOptedIn ? colors.cyan : colors.textSec }]}>
                  {isTelemetryOptedIn ? '☑' : '☐'}
                </Text>
              </TouchableOpacity>
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
                <Text style={[sDyn.actionBtnText, { color: colors.card }]}>{t('permissions.grantBtn', 'GRANT & CONTINUE')}</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity onPress={() => setHasOnboarded(true)} style={sDyn.skipLink}>
              <Text style={[sDyn.skipText, { color: colors.textSec }]}>{t('permissions.skipBtn', 'Skip for now (Demo Mode)')}</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const MONO = Platform.OS === 'ios' ? 'System' : 'sans-serif';
