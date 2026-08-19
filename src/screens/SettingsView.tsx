import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, Platform } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useThemeColors } from '../theme';
import { useResponsive } from '../hooks/useResponsive';
import { useAppStore } from '../store/useAppStore';
import { ALL_26_LANGUAGES } from '../constants/languages';

const MONO = Platform.OS === 'ios' ? 'System' : 'sans-serif';

export interface SettingsViewProps {
 disconnect?: () => void;
 setActiveHubView?: (view: any) => void;
 s: any;
}

export const SettingsView = ({ s }: SettingsViewProps) => {
 const { t } = useTranslation();
 const tc = useThemeColors();
 const { s: scaleWidth, vs: scaleHeight, ms: scaleMod, fs: scaleFont } = useResponsive();

 const language = useAppStore((state) => state.language);
 const setLanguage = useAppStore((state) => state.setLanguage);

 return (
 <View style={{ flex: 1 }}>
 <ScrollView
 style={s.tabContent}
 contentContainerStyle={{ paddingHorizontal: scaleWidth(16), paddingBottom: scaleHeight(40), gap: scaleHeight(10) }}
 showsVerticalScrollIndicator={false}
 >
 {/* Header Panel */}
 <View style={[s.panel, { margin: 0, padding: scaleMod(16), borderRadius: scaleMod(16) }]}>
 <Text style={[s.panelTitle, { fontSize: scaleFont(13), fontWeight: '800', letterSpacing: 0.5 }]}>
 {t('bento.settings.appLanguageTitle', t('bento.languageSelect')).toUpperCase()}
 </Text>
 <Text style={[s.panelDesc, { fontSize: scaleFont(11.5), lineHeight: scaleFont(16), marginTop: scaleHeight(4), marginBottom: scaleHeight(12) }]}>
 {t('bento.settings.appLanguageDesc')}
 </Text>

 <TouchableOpacity
 style={{
 backgroundColor: `${tc.cyan}10`,
 borderWidth: 1,
 borderColor: `${tc.cyan}35`,
 borderRadius: scaleMod(10),
 paddingVertical: scaleHeight(9),
 paddingHorizontal: scaleWidth(14),
 alignItems: 'center',
 }}
 onPress={() => {
 useAppStore.getState().resetOnboarding();
 }}
 activeOpacity={0.7}
 >
 <Text style={{ color: tc.cyan, fontWeight: '700', fontSize: scaleFont(11.5), fontFamily: MONO, textAlign: 'center' }}>
 {t('permissions.restartOnboarding', { defaultValue: 'İlk Kurulum Ekranını Yeniden Başlat' })}
 </Text>
 </TouchableOpacity>
 </View>

 {/* All 26 Language Options List (Strict Alphabetical Order) */}
 {ALL_26_LANGUAGES.map((item) => {
 const isSelected = language === item.code;
 return (
 <TouchableOpacity
 key={item.code}
 style={{
 paddingVertical: scaleHeight(14),
 paddingHorizontal: scaleWidth(16),
 borderRadius: scaleMod(12),
 backgroundColor: isSelected ? `${tc.cyan}18` : tc.card,
 borderWidth: 1.5,
 borderColor: isSelected ? tc.cyan : tc.border,
 flexDirection: 'row',
 justifyContent: 'space-between',
 alignItems: 'center',
 }}
 onPress={() => setLanguage(item.code)}
 >
 <View style={{ flexDirection: 'row', alignItems: 'center', gap: scaleWidth(14) }}>
 <Text style={{ fontSize: scaleFont(22) }}>{item.flag}</Text>
 <View>
 <Text style={{ color: isSelected ? tc.cyan : tc.textPri, fontWeight: '900', fontSize: scaleFont(13.5), fontFamily: MONO }}>
 {item.name}
 </Text>
 <Text style={{ color: tc.textSec, fontSize: scaleFont(10.5), fontFamily: MONO, marginTop: 2 }}>
 {item.nativeName}
 </Text>
 </View>
 </View>

 {isSelected ? (
 <View style={{ backgroundColor: tc.cyan, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 }}>
 <Text style={{ color: tc.card, fontWeight: '900', fontSize: scaleFont(11), fontFamily: MONO }}>
 {t('common.selected').toUpperCase()}
 </Text>
 </View>
 ) : (
 <View style={{ width: scaleMod(18), height: scaleMod(18), borderRadius: scaleMod(9), borderWidth: 1.5, borderColor: tc.border }} />
 )}
 </TouchableOpacity>
 );
 })}
 </ScrollView>
 </View>
 );
};

export default SettingsView;
