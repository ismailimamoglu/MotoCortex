import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Platform, SafeAreaView } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useAppStore, ThemeMode, AppLanguage } from '../store/useAppStore';
import { useThemeColors } from '../theme';

interface QuickSettingsModalProps {
  visible: boolean;
  onClose: () => void;
}

export default function QuickSettingsModal({ visible, onClose }: QuickSettingsModalProps) {
  const { t } = useTranslation();
  const theme = useAppStore((state) => state.theme);
  const setTheme = useAppStore((state) => state.setTheme);
  const language = useAppStore((state) => state.language);
  const setLanguage = useAppStore((state) => state.setLanguage);
  const colors = useThemeColors();

  const themes: { label: string; value: ThemeMode; icon: string }[] = [
    { label: 'Dark Mode', value: 'dark', icon: '🌙' },
    { label: 'Light Mode', value: 'light', icon: '☀️' },
  ];

  const languages: { label: string; value: AppLanguage; flag: string }[] = [
    { label: 'English', value: 'en', flag: '🇬🇧' },
    { label: 'Deutsch', value: 'de', flag: '🇩🇪' },
    { label: 'Español', value: 'es', flag: '🇪🇸' },
    { label: 'Türkçe', value: 'tr', flag: '🇹🇷' },
    { label: 'Indonesia', value: 'id', flag: '🇮🇩' },
  ];

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={s.overlay}>
        <TouchableOpacity style={[s.backdrop, { backgroundColor: colors.overlay }]} activeOpacity={1} onPress={onClose} />

        <SafeAreaView style={s.safeArea}>
          <View style={[s.sheetContainer, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            {/* Sheet Handle */}
            <View style={[s.handleBar, { backgroundColor: colors.textSec }]} />

            {/* Header */}
            <View style={s.header}>
              <Text style={[s.title, { color: colors.textPri }]}>Quick Settings</Text>
              <TouchableOpacity onPress={onClose} style={[s.closeBtn, { backgroundColor: `${colors.cyan}18` }]}>
                <Text style={[s.closeBtnText, { color: colors.cyan }]}>DONE</Text>
              </TouchableOpacity>
            </View>

            {/* Section 1: Theme Selection */}
            <Text style={[s.sectionTitle, { color: colors.textSec }]}>THEME APPEARANCE</Text>
            <View style={s.btnGrid}>
              {themes.map((item) => {
                const isActive = theme === item.value;
                return (
                  <TouchableOpacity
                    key={item.value}
                    style={[
                      s.optionBtn,
                      { backgroundColor: `${colors.textPri}05`, borderColor: `${colors.textPri}0D` },
                      isActive && { backgroundColor: `${colors.cyan}14`, borderColor: colors.cyan },
                    ]}
                    onPress={() => setTheme(item.value)}
                    activeOpacity={0.8}
                  >
                    <Text style={s.optionIcon}>{item.icon}</Text>
                    <Text
                      style={[
                        s.optionLabel,
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
            <Text style={[s.sectionTitle, { color: colors.textSec, marginTop: 24 }]}>
              LANGUAGE / DİL / SPRACHE
            </Text>
            <View style={s.btnGridRow}>
              {languages.map((item) => {
                const isActive = language === item.value;
                return (
                  <TouchableOpacity
                    key={item.value}
                    style={[
                      s.langBtn,
                      { backgroundColor: `${colors.textPri}05`, borderColor: `${colors.textPri}0D` },
                      isActive && { backgroundColor: `${colors.cyan}14`, borderColor: colors.cyan },
                    ]}
                    onPress={() => setLanguage(item.value)}
                    activeOpacity={0.8}
                  >
                    <Text style={s.langFlag}>{item.flag}</Text>
                    <Text
                      style={[
                        s.langLabel,
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
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const MONO = Platform.OS === 'ios' ? 'Menlo' : 'monospace';

const s = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  safeArea: {
    width: '100%',
  },
  sheetContainer: {
    borderTopWidth: 1,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 24,
    paddingBottom: Platform.OS === 'ios' ? 10 : 24,
    paddingTop: 12,
    shadowColor: 'rgba(0,0,0,0.3)',
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  handleBar: {
    width: 40,
    height: 4,
    borderRadius: 2,
    opacity: 0.3,
    alignSelf: 'center',
    marginBottom: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 18,
    fontWeight: '900',
    fontFamily: MONO,
  },
  closeBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  closeBtnText: {
    fontSize: 12,
    fontWeight: 'bold',
    fontFamily: MONO,
  },
  sectionTitle: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 2,
    marginBottom: 12,
    fontFamily: MONO,
  },
  btnGrid: {
    gap: 10,
  },
  optionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  optionIcon: {
    fontSize: 18,
    marginRight: 12,
  },
  optionLabel: {
    fontSize: 14,
    fontWeight: '700',
    fontFamily: MONO,
  },
  btnGridRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  langBtn: {
    width: '48%',
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  langFlag: {
    fontSize: 18,
    marginRight: 10,
  },
  langLabel: {
    fontSize: 13,
    fontWeight: '700',
    fontFamily: MONO,
  },
});
