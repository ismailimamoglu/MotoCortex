import React, { useRef, useState, useMemo } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Platform, ScrollView, Linking, Share, Alert } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useAppStore, AppLanguage } from '../store/useAppStore';
import { useThemeColors } from '../theme';
import { useResponsive } from '../hooks/useResponsive';
import { useBluetoothStore } from '../store/useBluetoothStore';
import LanguageSelectionView from './LanguageSelectionView';
import { ALL_26_LANGUAGES } from '../constants/languages';

interface QuickSettingsModalProps {
 visible: boolean;
 onClose: () => void;
 onTriggerDebug?: () => void;
 onDisconnect?: () => void;
}

function QuickSettingsModalContent({ visible, onClose, onTriggerDebug, onDisconnect }: QuickSettingsModalProps) {
 const { t } = useTranslation();
 const language = useAppStore((state) => state.language);
 const setLanguage = useAppStore((state) => state.setLanguage);
 const isSimulationMode = useAppStore((state) => state.isSimulationMode);
 const toggleSimulationMode = useAppStore((state) => state.toggleSimulationMode);
 const connectionStatus = useBluetoothStore((s) => s.status);
 const isCloneDevice = useBluetoothStore((s) => s.isCloneDevice);
 const colors = useThemeColors();
 const { s: scaleWidth, vs: scaleHeight, ms: scaleMod, fs: scaleFont, isTablet, isLargeTablet, width } = useResponsive();
 const insets = useSafeAreaInsets();

 const [isLangModalOpen, setIsLangModalOpen] = useState(false);

 const handleSupportEmail = () => {
 const siteUrl = `https://motocortex-telemetry.vercel.app/?lang=${language}`;
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



 const currentLanguageObj = ALL_26_LANGUAGES.find((l) => l.code === language) || ALL_26_LANGUAGES[0];

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
 {t('bento.languageSelect').toUpperCase()}
 </Text>
 </TouchableOpacity>

 <TouchableOpacity onPress={onClose} style={sDyn.cancelBtn}>
 <Text allowFontScaling={false} style={[sDyn.cancelText, { color: colors.cyan }]}>
 {t('bento.settings.done').toUpperCase()}
 </Text>
 </TouchableOpacity>
 </View>

 <View style={{ flex: 1, padding: scaleMod(12) }}>
 <LanguageSelectionView
 currentLanguage={language}
 onSelect={(selectedLang) => {
 setLanguage(selectedLang);
 onClose();
 }}
 />
 </View>
 </View>
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

const MONO = Platform.OS === 'ios' ? 'System' : 'sans-serif';
