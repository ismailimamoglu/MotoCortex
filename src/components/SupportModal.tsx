import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Platform,
  Linking,
  Alert,
  KeyboardAvoidingView
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useThemeColors } from '../theme';
import { useResponsive } from '../hooks/useResponsive';
import { useBluetoothStore } from '../store/useBluetoothStore';
import { useAppStore } from '../store/useAppStore';
import { triggerHaptic } from '../utils/haptics';

const MONO = Platform.OS === 'ios' ? 'System' : 'sans-serif';

const SUPPORT_EMAIL = 'ismailimamoglu610@gmail.com';
const APP_STORE_URL = 'https://apps.apple.com/app/id6742882583';
const APP_STORE_NATIVE = 'itms-apps://apps.apple.com/app/id6742882583';
const PLAY_STORE_URL = 'https://play.google.com/store/apps/details?id=com.ismail.motocortexv2';
const PLAY_STORE_NATIVE = 'market://details?id=com.ismail.motocortexv2';

export type SupportCategory = 'CONNECTION' | 'VEHICLE' | 'CODING' | 'REQUEST' | 'BUG';

export interface SupportModalProps {
  visible: boolean;
  onClose: () => void;
  initialCategory?: SupportCategory;
  customContextError?: string | null;
  currentVehicleMake?: string;
}

export default function SupportModal({
  visible,
  onClose,
  initialCategory = 'CONNECTION',
  customContextError,
  currentVehicleMake
}: SupportModalProps) {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const { s: scaleWidth, vs: scaleHeight, ms: scaleMod, fs: scaleFont } = useResponsive();

  const [selectedCategory, setSelectedCategory] = useState<SupportCategory>(initialCategory);
  const [userMessage, setUserMessage] = useState('');

  // Live Bluetooth & System Telemetry
  const bluetoothStatus = useBluetoothStore((s) => s.status);
  const protocol = useBluetoothStore((s) => s.protocol);
  const voltage = useBluetoothStore((s) => s.voltage);
  const isClone = useBluetoothStore((s) => s.isCloneDevice);
  const storeError = useBluetoothStore((s) => s.error);
  const isSimulationMode = useAppStore((s) => s.isSimulationMode);
  const appLanguage = useAppStore((s) => s.language);

  const effectiveError = customContextError || storeError || null;
  const effectiveVehicle = currentVehicleMake || 'General / Unknown';

  const categories: { id: SupportCategory; labelKey: string }[] = [
    { id: 'CONNECTION', labelKey: 'support.catConnection' },
    { id: 'VEHICLE', labelKey: 'support.catVehicle' },
    { id: 'CODING', labelKey: 'support.catCoding' },
    { id: 'REQUEST', labelKey: 'support.catRequest' },
    { id: 'BUG', labelKey: 'support.catBug' },
  ];

  const buildDiagnosticPayload = () => {
    return [
      `=== MOTOCORTEX DIAGNOSTIC TELEMETRY ===`,
      `Category: ${selectedCategory}`,
      `App Version: 1.1.0 (41)`,
      `Language: ${appLanguage}`,
      `OS: ${Platform.OS} ${Platform.Version}`,
      `Device Mode: ${isSimulationMode ? 'DEMO SIMULATION' : 'PHYSICAL HARDWARE'}`,
      `Vehicle Make: ${effectiveVehicle}`,
      `Bluetooth Status: ${bluetoothStatus}`,
      `Protocol: ${protocol || 'N/A'}`,
      `Voltage: ${voltage || 'N/A'}`,
      `Adapter Clone Status: ${isClone ? 'CLONE DETECTED' : 'STANDARD / VERIFIED'}`,
      `Last Error: ${effectiveError || 'None'}`,
      `User Note: ${userMessage.trim() || 'No additional note'}`,
      `========================================`
    ].join('\n');
  };

  const handleOpenStorePage = async () => {
    triggerHaptic();
    const nativeUrl = Platform.OS === 'ios' ? APP_STORE_NATIVE : PLAY_STORE_NATIVE;
    const webUrl = Platform.OS === 'ios' ? APP_STORE_URL : PLAY_STORE_URL;
    try {
      const canOpen = await Linking.canOpenURL(nativeUrl);
      if (canOpen) {
        await Linking.openURL(nativeUrl);
      } else {
        await Linking.openURL(webUrl);
      }
    } catch {
      Linking.openURL(webUrl).catch(() => {
        Alert.alert(
          t('common.error', { defaultValue: 'Hata' }),
          'Store page could not be opened.'
        );
      });
    }
  };

  const handleSendEmail = () => {
    triggerHaptic();
    const payload = buildDiagnosticPayload();
    const subject = encodeURIComponent(`[MotoCortex Destek] ${selectedCategory} - ${effectiveVehicle}`);
    const body = encodeURIComponent(
      `Merhaba Ismail Bey,\n\nSorun / Talep Açıklaması:\n${userMessage || 'Sorun detayları aşağıdadır.'}\n\n${payload}`
    );
    const mailtoUrl = `mailto:${SUPPORT_EMAIL}?subject=${subject}&body=${body}`;
    Linking.openURL(mailtoUrl).catch(() => {
      Alert.alert(
        t('common.info', { defaultValue: 'Bilgi' }),
        `E-posta istemcisi açılamadı. Lütfen talebinizi doğrudan ${SUPPORT_EMAIL} adresine iletiniz.`
      );
    });
  };

  const handleClose = () => {
    setUserMessage('');
    onClose();
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'flex-end' }}
      >
        <View style={{
          backgroundColor: colors.card || '#111723',
          borderTopLeftRadius: scaleMod(18),
          borderTopRightRadius: scaleMod(18),
          paddingHorizontal: scaleMod(18),
          paddingTop: scaleMod(16),
          paddingBottom: Math.max(insets.bottom, scaleHeight(16)),
          maxHeight: '90%',
          borderColor: colors.border,
          borderWidth: 1
        }}>
          {/* Header */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: scaleHeight(12) }}>
            <View style={{ flex: 1, paddingRight: scaleWidth(10) }}>
              <Text style={{ color: colors.cyan, fontWeight: '900', fontSize: scaleFont(14), fontFamily: MONO, letterSpacing: 0.5 }}>
                {t('support.title')}
              </Text>
              <Text style={{ color: colors.textSec, fontSize: scaleFont(10), fontFamily: MONO, marginTop: scaleHeight(2) }}>
                {t('support.subtitle')}
              </Text>
            </View>
            <TouchableOpacity
              onPress={handleClose}
              style={{
                backgroundColor: `${colors.border}80`,
                width: scaleMod(32),
                height: scaleMod(32),
                borderRadius: scaleMod(16),
                alignItems: 'center',
                justifyContent: 'center',
                borderWidth: 1,
                borderColor: colors.border
              }}
            >
              <Text style={{ color: colors.textPri, fontWeight: '900', fontSize: scaleFont(15) }}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Form Content */}
          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Category Selector */}
            <Text style={{ color: colors.textPri, fontWeight: '900', fontSize: scaleFont(10.5), fontFamily: MONO, marginBottom: scaleHeight(6), letterSpacing: 0.5 }}>
              {t('support.categoryTitle').toUpperCase()}
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: scaleMod(6), marginBottom: scaleHeight(12) }}>
              {categories.map((cat) => {
                const isCatSelected = selectedCategory === cat.id;
                return (
                  <TouchableOpacity
                    key={cat.id}
                    onPress={() => {
                      triggerHaptic();
                      setSelectedCategory(cat.id);
                    }}
                    style={{
                      backgroundColor: isCatSelected ? `${colors.cyan}25` : colors.bg,
                      borderColor: isCatSelected ? colors.cyan : colors.border,
                      borderWidth: isCatSelected ? 1.5 : 1,
                      borderRadius: scaleMod(8),
                      paddingHorizontal: scaleWidth(10),
                      paddingVertical: scaleHeight(7),
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    <Text style={{
                      color: isCatSelected ? colors.cyan : colors.textSec,
                      fontSize: scaleFont(10),
                      fontWeight: isCatSelected ? '900' : '600',
                      fontFamily: MONO
                    }}>
                      {t(cat.labelKey)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Message Input */}
            <View style={{
              backgroundColor: colors.bg,
              borderColor: colors.border,
              borderWidth: 1,
              borderRadius: scaleMod(10),
              padding: scaleMod(10),
              marginBottom: scaleHeight(12)
            }}>
              <TextInput
                value={userMessage}
                onChangeText={setUserMessage}
                placeholder={t('support.messagePlaceholder')}
                placeholderTextColor={colors.textSec}
                multiline={true}
                numberOfLines={4}
                style={{
                  color: colors.textPri,
                  fontSize: scaleFont(11),
                  fontFamily: MONO,
                  minHeight: scaleHeight(70),
                  textAlignVertical: 'top'
                }}
              />
            </View>

            {/* Direct Store Rating Card (Opens App Store / Google Play page) */}
            <View style={{
              backgroundColor: `${colors.purple || '#9c27b0'}10`,
              borderColor: `${colors.purple || '#9c27b0'}35`,
              borderWidth: 1,
              borderRadius: scaleMod(10),
              padding: scaleMod(10),
              marginBottom: scaleHeight(12),
              alignItems: 'center',
              gap: scaleHeight(6)
            }}>
              <Text style={{ color: colors.textPri, fontSize: scaleFont(10), fontFamily: MONO, fontWeight: '800' }}>
                {t('support.ratePrompt')}
              </Text>
              <TouchableOpacity
                onPress={handleOpenStorePage}
                style={{
                  backgroundColor: colors.card,
                  borderColor: colors.purple || '#9c27b0',
                  borderWidth: 1.2,
                  borderRadius: scaleMod(8),
                  paddingHorizontal: scaleWidth(14),
                  paddingVertical: scaleHeight(6),
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <Text style={{ color: colors.purple || '#9c27b0', fontSize: scaleFont(10.5), fontFamily: MONO, fontWeight: '900' }}>
                  {t('support.rateStoreBtn')}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Automated Diagnostic Telemetry Card */}
            <View style={{
              backgroundColor: colors.bg,
              borderColor: colors.border,
              borderWidth: 1,
              borderRadius: scaleMod(10),
              padding: scaleMod(10),
              marginBottom: scaleHeight(14)
            }}>
              <Text style={{ color: colors.cyan, fontWeight: '900', fontSize: scaleFont(9), fontFamily: MONO, marginBottom: scaleHeight(5) }}>
                {t('support.autoDiagnosticsTitle')}
              </Text>
              <View style={{ gap: scaleHeight(2.5) }}>
                <Text style={{ color: colors.textSec, fontSize: scaleFont(9), fontFamily: MONO }}>
                  • {t('support.deviceLabel')}: <Text style={{ color: colors.textPri, fontWeight: 'bold' }}>{Platform.OS.toUpperCase()} {Platform.Version}</Text>
                </Text>
                <Text style={{ color: colors.textSec, fontSize: scaleFont(9), fontFamily: MONO }}>
                  • {t('support.vehicleLabel')}: <Text style={{ color: colors.textPri, fontWeight: 'bold' }}>{effectiveVehicle}</Text>
                </Text>
                <Text style={{ color: colors.textSec, fontSize: scaleFont(9), fontFamily: MONO }}>
                  • {t('support.adapterLabel')}: <Text style={{ color: isClone ? colors.red : colors.green, fontWeight: 'bold' }}>{bluetoothStatus.toUpperCase()} {isClone ? 'CLONE' : 'OK'}</Text>
                </Text>
                {effectiveError && (
                  <Text style={{ color: colors.red, fontSize: scaleFont(9), fontFamily: MONO }} numberOfLines={1}>
                    • {t('support.lastErrorLabel')}: {effectiveError}
                  </Text>
                )}
              </View>
            </View>

            {/* Single Action Button: E-POSTA İLE GÖNDER */}
            <View style={{ marginBottom: scaleHeight(8) }}>
              <TouchableOpacity
                onPress={handleSendEmail}
                style={{
                  backgroundColor: colors.cyan,
                  paddingVertical: scaleHeight(12),
                  borderRadius: scaleMod(10),
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <Text style={{ color: '#ffffff', fontWeight: '900', fontSize: scaleFont(11.5), fontFamily: MONO, letterSpacing: 0.5 }}>
                  {t('support.emailBtn').toUpperCase()}
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
