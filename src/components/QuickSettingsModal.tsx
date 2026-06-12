import React, { useRef, useState, useMemo } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Platform, ScrollView, Linking, Share, Alert } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import * as Clipboard from 'expo-clipboard';
import { useAppStore, ThemeMode, AppLanguage } from '../store/useAppStore';
import { useThemeColors } from '../theme';
import { useResponsive } from '../hooks/useResponsive';
import { useBluetoothStore } from '../store/useBluetoothStore';
import LanguageSelectionView from './LanguageSelectionView';

interface QuickSettingsModalProps {
  visible: boolean;
  onClose: () => void;
  onTriggerDebug?: () => void;
  onDisconnect?: () => void;
}

function QuickSettingsModalContent({ visible, onClose, onTriggerDebug, onDisconnect }: QuickSettingsModalProps) {
  const { t } = useTranslation();
  const theme = useAppStore((state) => state.theme);
  const setTheme = useAppStore((state) => state.setTheme);
  const language = useAppStore((state) => state.language);
  const setLanguage = useAppStore((state) => state.setLanguage);
  const isSimulationMode = useAppStore((state) => state.isSimulationMode);
  const connectionStatus = useBluetoothStore((s) => s.status);
  const isCloneDevice = useBluetoothStore((s) => s.isCloneDevice);
  const colors = useThemeColors();
  const { s: scaleWidth, vs: scaleHeight, ms: scaleMod, fs: scaleFont, isTablet, isLargeTablet, width } = useResponsive();
  const insets = useSafeAreaInsets();
  const appUserId = useAppStore((state) => state.appUserId);

  const [isLangModalOpen, setIsLangModalOpen] = useState(false);

  const copyToClipboard = async () => {
    if (appUserId) {
      await Clipboard.setStringAsync(appUserId);
      Alert.alert(
        t('common.success', 'Success'),
        t('bento.settings.idCopied', 'User ID copied to clipboard.'),
        [{ text: t('common.ok', 'OK') }]
      );
    }
  };

  const handleSupportEmail = () => {
    const siteUrl = `https://motocortex-telemetry.vercel.app/?userId=${appUserId || ''}&lang=${language}`;
    Linking.openURL(siteUrl).catch((e) => console.error('Error opening support website:', e));
  };

  const tapCountRef = useRef(0);
  const tapTimerRef = useRef<NodeJS.Timeout | null>(null);

  const handleTitleTap = () => {
    tapCountRef.current += 1;
    if (tapTimerRef.current) clearTimeout(tapTimerRef.current);

    if (tapCountRef.current >= 5) {
      tapCountRef.current = 0;
      if (onTriggerDebug) {
        onTriggerDebug();
      }
    } else {
      tapTimerRef.current = setTimeout(() => {
        tapCountRef.current = 0;
      }, 600);
    }
  };

  const themes: { label: string; value: ThemeMode; icon: string }[] = [
    { label: t('bento.settings.darkMode', 'Dark Mode'), value: 'dark', icon: '🌙' },
    { label: t('bento.settings.lightMode', 'Light Mode'), value: 'light', icon: '☀️' },
  ];

  const languagesList = [
    { label: 'English', value: 'en', flag: '🇬🇧' },
    { label: 'Deutsch', value: 'de', flag: '🇩🇪' },
    { label: 'Español', value: 'es', flag: '🇪🇸' },
    { label: 'Türkçe', value: 'tr', flag: '🇹🇷' },
    { label: 'Indonesia', value: 'id', flag: '🇮🇩' },
    { label: 'Italiano', value: 'it', flag: '🇮🇹' },
    { label: 'العربية', value: 'ar', flag: '🇸🇦' },
    { label: '简体中文', value: 'zh', flag: '🇨🇳' },
    { label: 'Dansk', value: 'da', flag: '🇩🇰' },
    { label: 'Suomi', value: 'fi', flag: '🇫🇮' },
    { label: 'Français', value: 'fr', flag: '🇫🇷' },
    { label: 'हिन्दी', value: 'hi', flag: '🇮🇳' },
    { label: 'Nederlands', value: 'nl', flag: '🇳🇱' },
    { label: '日本語', value: 'ja', flag: '🇯🇵' },
    { label: '한국어', value: 'ko', flag: '🇰🇷' },
    { label: 'Polski', value: 'pl', flag: '🇵🇱' },
    { label: 'Magyar', value: 'hu', flag: '🇭🇺' },
    { label: 'Norsk', value: 'no', flag: '🇳🇴' },
    { label: 'Português', value: 'pt', flag: '🇵🇹' },
    { label: 'Română', value: 'ro', flag: '🇷🇴' },
    { label: 'Русский', value: 'ru', flag: '🇷🇺' },
    { label: 'ไทย', value: 'th', flag: '🇹🇭' },
    { label: 'Українська', value: 'uk', flag: '🇺🇦' },
    { label: 'Ελληνικά', value: 'el', flag: '🇬🇷' },
    { label: 'Čeština', value: 'cs', flag: '🇨🇿' },
    { label: 'Svenska', value: 'sv', flag: '🇸🇪' },
  ];

  const currentLanguageObj = languagesList.find((l) => l.value === language) || languagesList[0];

  const sDyn = React.useMemo(() => {
    const modalWidth = isTablet ? (isLargeTablet ? 650 : 520) : '100%';
    const modalHeight = isTablet ? '85%' : '100%';
    
    return {
      modalOverlay: {
        flex: 1,
        justifyContent: isTablet ? 'center' : 'flex-end',
        alignItems: isTablet ? 'center' : 'stretch',
        backgroundColor: isTablet ? colors.overlayHeavy : colors.bg,
      },
      modalContainer: {
        width: modalWidth,
        height: modalHeight,
        maxHeight: isTablet ? scaleHeight(700) : undefined,
        alignSelf: 'center' as const,
        borderRadius: isTablet ? scaleMod(16) : 0,
        borderWidth: isTablet ? 1.5 : 0,
        borderColor: colors.border,
        overflow: 'hidden' as const,
        paddingTop: isTablet ? 0 : insets.top,
      },
      header: {
        paddingHorizontal: scaleWidth(16),
        flexDirection: 'row' as const,
        justifyContent: 'space-between' as const,
        alignItems: 'center' as const,
        height: scaleHeight(54),
        borderBottomWidth: 1,
      },
      headerTitle: {
        fontSize: scaleFont(14),
        fontWeight: '800' as const,
        fontFamily: MONO,
      },
      cancelBtn: {
        padding: scaleMod(8),
      },
      cancelText: {
        fontSize: scaleFont(12),
        fontWeight: 'bold' as const,
        fontFamily: MONO,
      },
      content: {
        flex: 1,
        padding: scaleMod(14),
      },
      sectionTitle: {
        fontSize: scaleFont(9.5),
        fontWeight: '800' as const,
        letterSpacing: 2,
        marginBottom: scaleHeight(10),
        fontFamily: MONO,
      },
      btnGrid: {
        gap: scaleMod(8),
      },
      optionBtn: {
        flexDirection: 'row' as const,
        alignItems: 'center' as const,
        borderWidth: 1.2,
        borderRadius: scaleMod(12),
        paddingVertical: scaleHeight(12),
        paddingHorizontal: scaleWidth(14),
      },
      optionIcon: {
        fontSize: scaleFont(16),
        marginRight: scaleWidth(10),
      },
      optionLabel: {
        fontSize: scaleFont(13),
        fontWeight: '700' as const,
        fontFamily: MONO,
      },
      btnGridRow: {
        flexDirection: 'row' as const,
        flexWrap: 'wrap' as const,
        gap: scaleMod(8),
      },
      langBtn: {
        flexBasis: '47%',
        flexGrow: 1,
        flexShrink: 1,
        minWidth: isTablet ? 120 : scaleWidth(110),
        flexDirection: 'row' as const,
        alignItems: 'center' as const,
        borderWidth: 1.2,
        borderRadius: scaleMod(12),
        paddingVertical: scaleHeight(10),
        paddingHorizontal: scaleWidth(10),
      },
      langFlag: {
        fontSize: scaleFont(16),
        marginRight: scaleWidth(8),
      },
      langLabel: {
        fontSize: scaleFont(11.5),
        fontWeight: '700' as const,
        fontFamily: MONO,
        flex: 1,
      },
    };
  }, [scaleWidth, scaleHeight, scaleMod, scaleFont, isTablet, isLargeTablet, colors, insets.top]) as any;

  return (
    <View style={sDyn.modalOverlay}>
      <View style={[sDyn.modalContainer, { backgroundColor: colors.bg }]}>
        {/* Header */}
        <View style={[sDyn.header, { borderBottomColor: colors.border }]}>
          <TouchableOpacity activeOpacity={0.4} onPress={handleTitleTap}>
            <Text allowFontScaling={false} style={[sDyn.headerTitle, { color: colors.textPri }]}>
              {t('bento.settings.title', 'Quick Settings').toUpperCase()}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={onClose} style={sDyn.cancelBtn}>
            <Text allowFontScaling={false} style={[sDyn.cancelText, { color: colors.cyan }]}>
              {t('bento.settings.done', 'DONE').toUpperCase()}
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView 
          style={sDyn.content} 
          showsVerticalScrollIndicator={false} 
          contentContainerStyle={{ paddingBottom: isTablet ? scaleHeight(24) : (Platform.OS === 'ios' ? insets.bottom + scaleHeight(24) : scaleHeight(24)) }}
        >
          {/* Section 1: Theme Selection */}
          <Text allowFontScaling={false} style={[sDyn.sectionTitle, { color: colors.textSec }]}>{t('bento.settings.themeAppearance', 'THEME APPEARANCE')}</Text>
          <View style={sDyn.btnGrid}>
            {themes.map((item) => {
              const isActive = theme === item.value;
              return (
                <TouchableOpacity
                  key={item.value}
                  style={[
                    sDyn.optionBtn,
                    { backgroundColor: `${colors.textPri}05`, borderColor: `${colors.textPri}0D` },
                    isActive && { backgroundColor: `${colors.cyan}14`, borderColor: colors.cyan },
                  ]}
                  onPress={() => setTheme(item.value)}
                  activeOpacity={0.4}
                >
                  <Text allowFontScaling={false} style={sDyn.optionIcon}>{item.icon}</Text>
                  <Text
                    allowFontScaling={false}
                    style={[
                      sDyn.optionLabel,
                      { color: colors.textPri },
                      isActive && { color: colors.cyan },
                    ]}
                  >
                    {item.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Section 2: Language Selection */}
          <Text allowFontScaling={false} style={[sDyn.sectionTitle, { color: colors.textSec, marginTop: scaleHeight(18) }]}>
            {t('bento.settings.language', 'LANGUAGE / DİL / SPRACHE')}
          </Text>
          <TouchableOpacity
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              borderWidth: 1.2,
              borderRadius: scaleMod(12),
              paddingVertical: scaleHeight(12),
              paddingHorizontal: scaleWidth(14),
              backgroundColor: `${colors.textPri}05`,
              borderColor: colors.border,
              marginTop: scaleHeight(4),
            }}
            onPress={() => setIsLangModalOpen(true)}
            activeOpacity={0.4}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: scaleMod(8) }}>
              <Text allowFontScaling={false} style={{ fontSize: scaleFont(14) }}>{currentLanguageObj.flag}</Text>
              <Text allowFontScaling={false} style={{ fontSize: scaleFont(12), fontWeight: '700', fontFamily: MONO, color: colors.textPri }}>
                {currentLanguageObj.label}
              </Text>
            </View>
            <Text allowFontScaling={false} style={{ color: colors.textSec, fontSize: scaleFont(10) }}>▶</Text>
          </TouchableOpacity>

          {/* Section 3: Hardware Health Info */}
          <Text allowFontScaling={false} style={[sDyn.sectionTitle, { color: colors.textSec, marginTop: scaleHeight(18) }]}>
            {t('bento.settings.hardwareHealth', 'DONANIM SAĞLIK BİLGİSİ')}
          </Text>
          <View style={{
            backgroundColor: `${colors.textPri}05`,
            borderColor: `${colors.textPri}0D`,
            borderWidth: 1.2,
            borderRadius: scaleMod(12),
            padding: scaleMod(12),
            gap: scaleMod(8)
          }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text allowFontScaling={false} style={{ fontSize: scaleFont(11.5), color: colors.textSec, fontFamily: MONO }}>{t('bento.settings.connectionType', 'Bağlantı Tipi:')}</Text>
              <Text allowFontScaling={false} style={{ fontSize: scaleFont(11.5), color: colors.textPri, fontFamily: MONO, fontWeight: '700' }}>
                {connectionStatus === 'connected' ? 'BLE' : t('bento.settings.noConnection', 'Bağlantı Yok')}
              </Text>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text allowFontScaling={false} style={{ fontSize: scaleFont(11.5), color: colors.textSec, fontFamily: MONO }}>{t('bento.settings.protocol', 'Protokol:')}</Text>
              <Text allowFontScaling={false} style={{ fontSize: scaleFont(11.5), color: colors.textPri, fontFamily: MONO, fontWeight: '700' }}>
                {connectionStatus === 'connected' ? 'CAN Bus (ISO-15765)' : t('bento.settings.none', 'Yok')}
              </Text>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text allowFontScaling={false} style={{ fontSize: scaleFont(11.5), color: colors.textSec, fontFamily: MONO }}>{t('bento.settings.deviceStatus', 'Cihaz Durumu:')}</Text>
              <Text allowFontScaling={false} style={{ 
                fontSize: scaleFont(11.5), 
                color: connectionStatus === 'connected' ? (isCloneDevice ? colors.red : colors.green) : colors.textSec, 
                fontFamily: MONO, 
                fontWeight: '700' 
              }}>
                {connectionStatus === 'connected' 
                  ? (isCloneDevice ? t('bento.settings.safeMode', 'Güvenli Mod / Clone Adaptör') : t('bento.settings.original', 'Orijinal')) 
                  : t('bento.settings.deviceNotConnected', 'Cihaz Bağlı Değil')}
              </Text>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text allowFontScaling={false} style={{ fontSize: scaleFont(11.5), color: colors.textSec, fontFamily: MONO }}>{t('bento.settings.pollingRate', 'Sorgu Hızı:')}</Text>
              <Text allowFontScaling={false} style={{ fontSize: scaleFont(11.5), color: colors.textPri, fontFamily: MONO, fontWeight: '700' }}>
                {connectionStatus === 'connected' 
                  ? (isCloneDevice ? t('bento.settings.pollingLow', '2 Hz (Düşük)') : t('bento.settings.pollingHigh', '4 Hz (Yüksek)')) 
                  : t('bento.settings.pollingZero', '0 Hz')}
              </Text>
            </View>

            {/* Separator line */}
            <View style={{ height: 1, backgroundColor: colors.border, marginVertical: scaleHeight(4) }} />

            {/* User ID Row */}
            <TouchableOpacity 
              style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: scaleHeight(2) }}
              onPress={copyToClipboard}
              activeOpacity={0.4}
            >
              <Text allowFontScaling={false} style={{ fontSize: scaleFont(11.5), color: colors.textSec, fontFamily: MONO, flexShrink: 0 }}>{t('bento.settings.userIdLabel', 'User ID:')}</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: scaleWidth(4), flex: 1, justifyContent: 'flex-end', marginLeft: scaleWidth(12) }}>
                <Text allowFontScaling={false} style={{ fontSize: scaleFont(9.5), color: colors.cyan, fontFamily: MONO, fontWeight: '700', flexShrink: 1 }} numberOfLines={1} ellipsizeMode="tail">
                  {appUserId || t('bento.settings.none', 'None')}
                </Text>
                {!!appUserId && <Text allowFontScaling={false} style={{ fontSize: scaleFont(11), color: colors.cyan }}>📋</Text>}
              </View>
            </TouchableOpacity>
          </View>

          {/* Section 4: Community & Support */}
          <Text allowFontScaling={false} style={[sDyn.sectionTitle, { color: colors.textSec, marginTop: scaleHeight(18) }]}>
            {t('bento.settings.community', 'COMMUNITY & SUPPORT')}
          </Text>
          <View style={{ gap: scaleMod(8) }}>
            <TouchableOpacity
              style={[sDyn.optionBtn, { backgroundColor: `${colors.cyan}0D`, borderColor: `${colors.cyan}26` }]}
              onPress={handleSupportEmail}
              activeOpacity={0.4}
            >
              <Text allowFontScaling={false} style={sDyn.optionIcon}>📍</Text>
              <Text allowFontScaling={false} style={[sDyn.optionLabel, { color: colors.textPri }]}>{t('info.support', 'SUPPORT CENTER')}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[sDyn.optionBtn, { backgroundColor: `${colors.purple}0D`, borderColor: `${colors.purple}26` }]}
              onPress={async () => {
                try {
                  await Share.share({
                    message: t('report.shareMessage', 'Check out MotoCortex - The ultimate motorcycle diagnostics tool! https://motocortex.app'),
                    title: 'MotoCortex'
                  });
                } catch (e) { console.error(e); }
              }}
              activeOpacity={0.4}
            >
              <Text allowFontScaling={false} style={sDyn.optionIcon}>✨</Text>
              <Text allowFontScaling={false} style={[sDyn.optionLabel, { color: colors.textPri }]}>{t('expertise.share', 'SHARE APP')}</Text>
            </TouchableOpacity>

            {!(isSimulationMode || __DEV__) && connectionStatus === 'connected' && (
              <TouchableOpacity
                style={[
                  sDyn.optionBtn, 
                  { 
                    backgroundColor: `${colors.red}0D`, 
                    borderColor: colors.red, 
                    marginTop: scaleHeight(8),
                  }
                ]}
                onPress={() => {
                  if (onDisconnect) {
                    onDisconnect();
                  }
                  onClose();
                }}
                activeOpacity={0.4}
              >
                <Text allowFontScaling={false} style={sDyn.optionIcon}>🔌</Text>
                <Text allowFontScaling={false} style={[sDyn.optionLabel, { color: colors.red }]}>{t('connection.disconnect', 'BAĞLANTIYI KES')}</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Disclaimer */}
          <Text allowFontScaling={false} style={{
            fontSize: scaleFont(8.5),
            color: colors.textSec,
            fontFamily: MONO,
            marginTop: scaleHeight(20),
            textAlign: 'center',
            lineHeight: scaleFont(12),
            opacity: 0.65,
            paddingHorizontal: scaleWidth(10),
          }}>
            {t('disclaimer')}
          </Text>
        </ScrollView>
      </View>

      {/* Standalone Full-Screen Language Selection Modal */}
      <Modal
        visible={isLangModalOpen}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setIsLangModalOpen(false)}
      >
        <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: Platform.OS === 'ios' ? 50 : 0 }}>
          <View style={[sDyn.header, { borderBottomColor: colors.border }]}>
            <TouchableOpacity onPress={() => setIsLangModalOpen(false)} style={sDyn.cancelBtn}>
              <Text allowFontScaling={false} style={[sDyn.cancelText, { color: colors.cyan }]}>
                {`← ${t('common.back', 'GERİ').toUpperCase()}`}
              </Text>
            </TouchableOpacity>
            <Text allowFontScaling={false} style={[sDyn.headerTitle, { color: colors.textPri }]}>
              {t('bento.settings.language', 'Language').toUpperCase()}
            </Text>
            <View style={{ width: scaleWidth(60) }} />
          </View>
          <LanguageSelectionView
            currentLanguage={language}
            onSelect={(val) => {
              setLanguage(val);
              setIsLangModalOpen(false);
            }}
          />
        </View>
      </Modal>
    </View>
  );
}

export default function QuickSettingsModal(props: QuickSettingsModalProps) {
  if (!props.visible) return null;
  const { isTablet } = useResponsive();
  return (
    <Modal
      visible={props.visible}
      animationType="slide"
      transparent={isTablet ? true : false}
      onRequestClose={props.onClose}
    >
      <SafeAreaProvider>
        <QuickSettingsModalContent {...props} />
      </SafeAreaProvider>
    </Modal>
  );
}

const MONO = Platform.OS === 'ios' ? 'Menlo' : 'monospace';
