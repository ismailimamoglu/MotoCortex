import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, Image, Alert } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useBluetoothStore } from '../store/useBluetoothStore';
import { useAppStore } from '../store/useAppStore';
import { useThemeColors } from '../theme';
import { useResponsive } from '../hooks/useResponsive';
import { useTelemetryStore } from '../store/useTelemetryStore';
import { triggerHaptic } from '../utils/haptics';

interface BentoButtonProps {
  style: any;
  onPress: () => void;
  children: React.ReactNode;
  activeOpacity?: number;
}
const BentoButton = ({ style, onPress, children, activeOpacity = 0.4 }: BentoButtonProps) => {
  return (
    <TouchableOpacity
      style={style}
      activeOpacity={activeOpacity}
      onPress={async () => {
        triggerHaptic();
        onPress();
      }}
    >
      {children}
    </TouchableOpacity>
  );
};

interface BentoGridProps {
  onOpenDiagnostics: () => void;
  onOpenSensors: () => void;
  onOpenProfile: () => void;
  onOpenSettings: () => void;
  onOpenPaywall: () => void;
  onOpenSupport: () => void;
  onShareApp: () => void;
  onDisconnect: () => void;
}

export default function BentoGrid({
  onOpenDiagnostics,
  onOpenSensors,
  onOpenProfile,
  onOpenSettings,
  onOpenPaywall,
  onOpenSupport,
  onShareApp,
  onDisconnect,
}: BentoGridProps) {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const { s: scaleWidth, vs: scaleHeight, ms: scaleMod, fs: scaleFont, isTablet, isPortrait } = useResponsive();
  const useRowLayout = isTablet && !isPortrait;

  const language = useAppStore((state) => state.language);
  const isPro = useAppStore((state) => state.isPro);
  const theme = useAppStore((state) => state.theme);
  const isSimulationMode = useAppStore((state) => state.isSimulationMode);
  const toggleSimulationMode = useAppStore((state) => state.toggleSimulationMode);

  const dtcs = useBluetoothStore((state) => state.dtcs);
  const ecuStatus = useBluetoothStore((state) => state.ecuStatus);
  const activeSessionVehicle = useTelemetryStore((state) => state.activeSessionVehicle);
  const isConnected = ecuStatus === 'connected' && !!activeSessionVehicle;

  const dtcCount = dtcs.length;
  const isClean = dtcCount === 0;

  const LANGUAGE_FLAGS: Record<string, string> = {
    en: '🇬🇧', de: '🇩🇪', es: '🇪🇸', tr: '🇹🇷', id: '🇮🇩', it: '🇮🇹',
    ar: '🇸🇦', zh: '🇨🇳', da: '🇩🇰', fi: '🇫🇮', fr: '🇫🇷', hi: '🇮🇳',
    nl: '🇳🇱', ja: '🇯🇵', ko: '🇰🇷', pl: '🇵🇱', hu: '🇭🇺', no: '🇳🇴',
    pt: '🇵🇹', ro: '🇷🇴', ru: '🇷🇺', th: '🇹🇭', uk: '🇺🇦', el: '🇬🇷',
    cs: '🇨🇿', sv: '🇸🇪'
  };
  const langFlag = LANGUAGE_FLAGS[language] || '🇬🇧';

  const sDyn = React.useMemo(() => {
    return {
      gridContainer: {
        gap: scaleMod(8),
      },
      row: {
        flexDirection: 'row' as const,
        gap: scaleMod(8),
      },
      cardPrimary: {
        flex: 1,
        borderWidth: scaleMod(2.5),
        borderRadius: scaleMod(16),
        padding: scaleMod(12),
        minHeight: scaleMod(114),
        justifyContent: 'space-between' as const,
      },
      cardSecondary: {
        flex: 1,
        borderWidth: scaleMod(1.2),
        borderRadius: scaleMod(12),
        padding: scaleMod(8),
        minHeight: scaleMod(60),
        justifyContent: 'space-between' as const,
      },
      cardHeader: {
        flexDirection: 'row' as const,
        justifyContent: 'space-between' as const,
        alignItems: 'center' as const,
      },
      iconWrapper: {
        width: scaleMod(36),
        height: scaleMod(36),
        borderRadius: scaleMod(10),
        alignItems: 'center' as const,
        justifyContent: 'center' as const,
      },
      icon: {
        fontSize: scaleFont(16),
        fontWeight: '900' as const,
      },
      arrow: {
        fontSize: scaleFont(18),
        fontWeight: '700' as const,
      },
      cardTitle: {
        fontSize: scaleFont(12.5),
        fontWeight: '900' as const,
        marginTop: scaleHeight(4),
        fontFamily: MONO,
      },
      cardSubtitle: {
        fontSize: scaleFont(9),
        fontWeight: '800' as const,
        marginTop: scaleHeight(2),
        fontFamily: MONO,
      },
      
      // Secondary card styles
      iconWrapperSmall: {
        width: scaleMod(22),
        height: scaleMod(22),
        borderRadius: scaleMod(5),
        alignItems: 'center' as const,
        justifyContent: 'center' as const,
      },
      iconSmall: {
        fontSize: scaleFont(10.5),
      },
      arrowSmall: {
        fontSize: scaleFont(11),
        fontWeight: 'bold' as const,
      },
      cardTitleSecondary: {
        fontSize: scaleFont(7.8),
        fontWeight: '900' as const,
        fontFamily: MONO,
        marginTop: scaleHeight(2),
      },
      badgeText: {
        fontSize: scaleFont(7),
        fontWeight: '800' as const,
        paddingHorizontal: scaleMod(3),
        paddingVertical: scaleHeight(1),
        borderRadius: scaleMod(3),
        overflow: 'hidden' as const,
        fontFamily: MONO,
      }
    };
  }, [scaleWidth, scaleHeight, scaleMod, scaleFont, colors]);

  const handleDemoPress = () => {
    const newMode = !isSimulationMode;
    toggleSimulationMode();
    if (newMode) {
      Alert.alert(t('common.demoMode'), t('common.demoModeDesc'));
    } else {
      onDisconnect();
    }
  };

  const handleProPress = () => {
    if (isPro || isSimulationMode) {
      Alert.alert(t('common.proActive'), t('common.proActiveDesc'));
    } else {
      onOpenPaywall();
    }
  };

  // ── TABLET LANDSCAPE VIEW ──
  if (useRowLayout) {
    return (
      <View style={{ gap: scaleMod(10), width: '100%' }}>
        {/* Primary Row */}
        <View style={sDyn.row}>
          {/* Card 1: Diagnostics */}
          <BentoButton
            style={[sDyn.cardPrimary, { backgroundColor: colors.cardBg, borderColor: isConnected ? (isClean ? colors.green : colors.red) : colors.cardBorder }]}
            onPress={onOpenDiagnostics}
            activeOpacity={0.4}
          >
            <View style={sDyn.cardHeader}>
              <View style={[sDyn.iconWrapper, { backgroundColor: isConnected ? (isClean ? `${colors.green}1A` : `${colors.red}1A`) : `${colors.textSec}0D` }]}>
                <Text style={[sDyn.icon, { color: isConnected ? (isClean ? colors.green : colors.red) : colors.textSec }]}>
                  {isConnected ? (isClean ? '✓' : '⚠') : '🔍'}
                </Text>
              </View>
              <Text style={[sDyn.arrow, { color: colors.textSec }]}>›</Text>
            </View>
            <View style={{ marginTop: scaleHeight(8) }}>
              <Text numberOfLines={1} adjustsFontSizeToFit style={[sDyn.cardTitle, { color: colors.textPri }]}>
                {t('bento.diagnostics').toUpperCase()}
              </Text>
              <Text numberOfLines={1} adjustsFontSizeToFit style={[sDyn.cardSubtitle, { color: isConnected ? (isClean ? colors.green : colors.red) : colors.textSec }]}>
                {isConnected 
                  ? (isClean ? t('bento.cleanFaults') : t('bento.dtcDetected', { count: dtcCount }))
                  : t('bento.settings.noConnection', 'Bağlantı Yok')}
              </Text>
            </View>
          </BentoButton>

          {/* Card 2: Live Sensors */}
          <BentoButton
            style={[sDyn.cardPrimary, { backgroundColor: colors.cardBg, borderColor: isConnected ? colors.cyan : colors.cardBorder }]}
            onPress={onOpenSensors}
            activeOpacity={0.4}
          >
            <View style={sDyn.cardHeader}>
              <View style={[sDyn.iconWrapper, { backgroundColor: isConnected ? `${colors.cyan}1A` : `${colors.textSec}0D` }]}>
                <Text style={[sDyn.icon, { color: isConnected ? colors.cyan : colors.textSec }]}>📊</Text>
              </View>
              <Text style={[sDyn.arrow, { color: colors.textSec }]}>›</Text>
            </View>
            <View style={{ marginTop: scaleHeight(8) }}>
              <Text numberOfLines={1} adjustsFontSizeToFit style={[sDyn.cardTitle, { color: colors.textPri }]}>
                {t('bento.liveSensors').toUpperCase()}
              </Text>
              <Text numberOfLines={1} adjustsFontSizeToFit style={[sDyn.cardSubtitle, { color: isConnected ? colors.cyan : colors.textSec }]}>
                {isConnected 
                  ? t('bento.realtimeData')
                  : t('bento.settings.noConnection', 'Bağlantı Yok')}
              </Text>
            </View>
          </BentoButton>
        </View>

        {/* Secondary Row (6 columns) */}
        <View style={sDyn.row}>
          {/* Card 3: Profile/About */}
          <BentoButton
            style={[sDyn.cardSecondary, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}
            onPress={onOpenProfile}
            activeOpacity={0.4}
          >
            <View style={sDyn.cardHeader}>
              <View style={[sDyn.iconWrapperSmall, { backgroundColor: 'transparent' }]}>
                <Image source={require('../../assets/icon.png')} style={{ width: '100%', height: '100%', borderRadius: scaleMod(4) }} />
              </View>
              <Text style={[sDyn.arrowSmall, { color: colors.textSec }]}>›</Text>
            </View>
            <Text numberOfLines={1} adjustsFontSizeToFit style={[sDyn.cardTitleSecondary, { color: colors.textPri }]}>
              {t('bento.vehicleProfile').toUpperCase()}
            </Text>
          </BentoButton>

          {/* Card 4: Quick Settings */}
          <BentoButton
            style={[sDyn.cardSecondary, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}
            onPress={onOpenSettings}
            activeOpacity={0.4}
          >
            <View style={sDyn.cardHeader}>
              <View style={[sDyn.iconWrapperSmall, { backgroundColor: `${colors.amber}1A` }]}>
                <Text style={sDyn.iconSmall}>⚙️</Text>
              </View>
              <Text style={[sDyn.arrowSmall, { color: colors.textSec }]}>›</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%', marginTop: scaleHeight(4) }}>
              <Text numberOfLines={1} style={[sDyn.cardTitleSecondary, { color: colors.textPri, marginTop: 0, flex: 1 }]}>
                {t('bento.quickSettings').toUpperCase()}
              </Text>
              <Text style={{ fontSize: scaleFont(9.5), marginLeft: 4 }}>{langFlag}</Text>
            </View>
          </BentoButton>

          {/* Card 5: Support */}
          <BentoButton
            style={[sDyn.cardSecondary, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}
            onPress={onOpenSupport}
            activeOpacity={0.4}
          >
            <View style={sDyn.cardHeader}>
              <View style={[sDyn.iconWrapperSmall, { backgroundColor: `${colors.cyan}1A` }]}>
                <Text style={sDyn.iconSmall}>📍</Text>
              </View>
              <Text style={[sDyn.arrowSmall, { color: colors.textSec }]}>›</Text>
            </View>
            <Text numberOfLines={1} adjustsFontSizeToFit style={[sDyn.cardTitleSecondary, { color: colors.textPri }]}>
              {t('info.support').toUpperCase()}
            </Text>
          </BentoButton>

          {/* Card 6: Share */}
          <BentoButton
            style={[sDyn.cardSecondary, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}
            onPress={onShareApp}
            activeOpacity={0.4}
          >
            <View style={sDyn.cardHeader}>
              <View style={[sDyn.iconWrapperSmall, { backgroundColor: `${colors.purple}1A` }]}>
                <Text style={sDyn.iconSmall}>✨</Text>
              </View>
              <Text style={[sDyn.arrowSmall, { color: colors.textSec }]}>›</Text>
            </View>
            <Text numberOfLines={1} adjustsFontSizeToFit style={[sDyn.cardTitleSecondary, { color: colors.textPri }]}>
              {t('expertise.share').toUpperCase()}
            </Text>
          </BentoButton>

          {/* Card 7: Demo */}
          <BentoButton
            style={[
              sDyn.cardSecondary, 
              { 
                backgroundColor: isSimulationMode ? `${colors.green}14` : colors.cardBg, 
                borderColor: isSimulationMode ? colors.green : colors.cardBorder 
              }
            ]}
            onPress={handleDemoPress}
            activeOpacity={0.4}
          >
            <View style={sDyn.cardHeader}>
              <View style={[sDyn.iconWrapperSmall, { backgroundColor: isSimulationMode ? `${colors.green}26` : `${colors.cyan}1A` }]}>
                <Text style={[sDyn.iconSmall, { color: isSimulationMode ? colors.green : colors.cyan }]}>🎮</Text>
              </View>
              <Text style={[sDyn.arrowSmall, { color: colors.textSec }]}>›</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%', marginTop: scaleHeight(4) }}>
              <Text numberOfLines={1} style={[sDyn.cardTitleSecondary, { color: colors.textPri, marginTop: 0, flex: 1 }]}>
                {t('common.demoMode').toUpperCase()}
              </Text>
              <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: isSimulationMode ? colors.green : colors.textSec, marginLeft: 4 }} />
            </View>
          </BentoButton>

          {/* Card 8: Pro Upgrade */}
          <BentoButton
            style={[
              sDyn.cardSecondary, 
              { 
                backgroundColor: (isPro || isSimulationMode) ? `${colors.purple}14` : colors.cardBg, 
                borderColor: colors.purple 
              }
            ]}
            onPress={handleProPress}
            activeOpacity={0.4}
          >
            <View style={sDyn.cardHeader}>
              <View style={[sDyn.iconWrapperSmall, { backgroundColor: `${colors.purple}26` }]}>
                <Text style={sDyn.iconSmall}>👑</Text>
              </View>
              <Text style={[sDyn.arrowSmall, { color: colors.textSec }]}>›</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%', marginTop: scaleHeight(4) }}>
              <Text numberOfLines={1} adjustsFontSizeToFit style={[sDyn.cardTitleSecondary, { color: colors.textPri, marginTop: 0, flex: 1 }]}>
                {(isPro || isSimulationMode) ? t('common.proActive').toUpperCase() : t('common.freeAccount').toUpperCase()}
              </Text>
              <Text style={[sDyn.badgeText, { color: '#FFF', backgroundColor: colors.purple, marginLeft: 4 }]}>
                {(isPro || isSimulationMode) ? 'PRO' : 'FREE'}
              </Text>
            </View>
          </BentoButton>
        </View>
      </View>
    );
  }

  // ── PORTRAIT PHONE/TABLET VIEW (3 Rows) ──
  return (
    <View style={sDyn.gridContainer}>
      {/* Row 1: Primary Menus */}
      <View style={sDyn.row}>
        {/* Card 1: Diagnostics */}
        <BentoButton
          style={[sDyn.cardPrimary, { backgroundColor: colors.cardBg, borderColor: isConnected ? (isClean ? colors.green : colors.red) : colors.cardBorder }]}
          onPress={onOpenDiagnostics}
          activeOpacity={0.4}
        >
          <View style={sDyn.cardHeader}>
            <View style={[sDyn.iconWrapper, { backgroundColor: isConnected ? (isClean ? `${colors.green}1A` : `${colors.red}1A`) : `${colors.textSec}0D` }]}>
              <Text style={[sDyn.icon, { color: isConnected ? (isClean ? colors.green : colors.red) : colors.textSec }]}>
                {isConnected ? (isClean ? '✓' : '⚠') : '🔍'}
              </Text>
            </View>
            <Text style={[sDyn.arrow, { color: colors.textSec }]}>›</Text>
          </View>
          <View style={{ marginTop: scaleHeight(8) }}>
            <Text numberOfLines={1} adjustsFontSizeToFit style={[sDyn.cardTitle, { color: colors.textPri }]}>
              {t('bento.diagnostics').toUpperCase()}
            </Text>
            <Text numberOfLines={1} adjustsFontSizeToFit style={[sDyn.cardSubtitle, { color: isConnected ? (isClean ? colors.green : colors.red) : colors.textSec }]}>
              {isConnected 
                ? (isClean ? t('bento.cleanFaults') : t('bento.dtcDetected', { count: dtcCount }))
                : t('bento.settings.noConnection', 'Bağlantı Yok')}
            </Text>
          </View>
        </BentoButton>

        {/* Card 2: Live Sensors */}
        <BentoButton
          style={[sDyn.cardPrimary, { backgroundColor: colors.cardBg, borderColor: isConnected ? colors.cyan : colors.cardBorder }]}
          onPress={onOpenSensors}
          activeOpacity={0.4}
        >
          <View style={sDyn.cardHeader}>
            <View style={[sDyn.iconWrapper, { backgroundColor: isConnected ? `${colors.cyan}1A` : `${colors.textSec}0D` }]}>
              <Text style={[sDyn.icon, { color: isConnected ? colors.cyan : colors.textSec }]}>📊</Text>
            </View>
            <Text style={[sDyn.arrow, { color: colors.textSec }]}>›</Text>
          </View>
          <View style={{ marginTop: scaleHeight(8) }}>
            <Text numberOfLines={1} adjustsFontSizeToFit style={[sDyn.cardTitle, { color: colors.textPri }]}>
              {t('bento.liveSensors').toUpperCase()}
            </Text>
            <Text numberOfLines={1} adjustsFontSizeToFit style={[sDyn.cardSubtitle, { color: isConnected ? colors.cyan : colors.textSec }]}>
              {isConnected 
                ? t('bento.realtimeData')
                : t('bento.settings.noConnection', 'Bağlantı Yok')}
            </Text>
          </View>
        </BentoButton>
      </View>

      {/* Row 2: Secondary Menus Row 1 (3 Columns) */}
      <View style={sDyn.row}>
        {/* Card 3: Profile/About */}
        <BentoButton
          style={[sDyn.cardSecondary, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}
          onPress={onOpenProfile}
          activeOpacity={0.4}
        >
          <View style={sDyn.cardHeader}>
            <View style={[sDyn.iconWrapperSmall, { backgroundColor: 'transparent' }]}>
              <Image source={require('../../assets/icon.png')} style={{ width: '100%', height: '100%', borderRadius: scaleMod(4) }} />
            </View>
            <Text style={[sDyn.arrowSmall, { color: colors.textSec }]}>›</Text>
          </View>
          <Text numberOfLines={1} adjustsFontSizeToFit style={[sDyn.cardTitleSecondary, { color: colors.textPri }]}>
            {t('bento.vehicleProfile').toUpperCase()}
          </Text>
        </BentoButton>

        {/* Card 4: Quick Settings */}
        <BentoButton
          style={[sDyn.cardSecondary, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}
          onPress={onOpenSettings}
          activeOpacity={0.4}
        >
          <View style={sDyn.cardHeader}>
            <View style={[sDyn.iconWrapperSmall, { backgroundColor: `${colors.amber}1A` }]}>
              <Text style={sDyn.iconSmall}>⚙️</Text>
            </View>
            <Text style={[sDyn.arrowSmall, { color: colors.textSec }]}>›</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%', marginTop: scaleHeight(2) }}>
            <Text numberOfLines={1} style={[sDyn.cardTitleSecondary, { color: colors.textPri, marginTop: 0, flex: 1 }]}>
              {t('bento.quickSettings').toUpperCase()}
            </Text>
            <Text style={{ fontSize: scaleFont(9), marginLeft: 2 }}>{langFlag}</Text>
          </View>
        </BentoButton>

        {/* Card 5: Support */}
        <BentoButton
          style={[sDyn.cardSecondary, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}
          onPress={onOpenSupport}
          activeOpacity={0.4}
        >
          <View style={sDyn.cardHeader}>
            <View style={[sDyn.iconWrapperSmall, { backgroundColor: `${colors.cyan}1A` }]}>
              <Text style={sDyn.iconSmall}>📍</Text>
            </View>
            <Text style={[sDyn.arrowSmall, { color: colors.textSec }]}>›</Text>
          </View>
          <Text numberOfLines={1} adjustsFontSizeToFit style={[sDyn.cardTitleSecondary, { color: colors.textPri }]}>
            {t('info.support').toUpperCase()}
          </Text>
        </BentoButton>
      </View>

      {/* Row 3: Secondary Menus Row 2 (3 Columns) */}
      <View style={sDyn.row}>
        {/* Card 6: Share */}
        <BentoButton
          style={[sDyn.cardSecondary, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}
          onPress={onShareApp}
          activeOpacity={0.4}
        >
          <View style={sDyn.cardHeader}>
            <View style={[sDyn.iconWrapperSmall, { backgroundColor: `${colors.purple}1A` }]}>
              <Text style={sDyn.iconSmall}>✨</Text>
            </View>
            <Text style={[sDyn.arrowSmall, { color: colors.textSec }]}>›</Text>
          </View>
          <Text numberOfLines={1} adjustsFontSizeToFit style={[sDyn.cardTitleSecondary, { color: colors.textPri }]}>
            {t('expertise.share').toUpperCase()}
          </Text>
        </BentoButton>

        {/* Card 7: Demo */}
        <BentoButton
          style={[
            sDyn.cardSecondary, 
            { 
              backgroundColor: isSimulationMode ? `${colors.green}14` : colors.cardBg, 
              borderColor: isSimulationMode ? colors.green : colors.cardBorder 
            }
          ]}
          onPress={handleDemoPress}
          activeOpacity={0.4}
        >
          <View style={sDyn.cardHeader}>
            <View style={[sDyn.iconWrapperSmall, { backgroundColor: isSimulationMode ? `${colors.green}26` : `${colors.cyan}1A` }]}>
              <Text style={[sDyn.iconSmall, { color: isSimulationMode ? colors.green : colors.cyan }]}>🎮</Text>
            </View>
            <Text style={[sDyn.arrowSmall, { color: colors.textSec }]}>›</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%', marginTop: scaleHeight(2) }}>
            <Text numberOfLines={1} style={[sDyn.cardTitleSecondary, { color: colors.textPri, marginTop: 0, flex: 1 }]}>
              {t('common.demoMode').toUpperCase()}
            </Text>
            <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: isSimulationMode ? colors.green : colors.textSec, marginLeft: 4 }} />
          </View>
        </BentoButton>

        {/* Card 8: Pro Upgrade */}
        <BentoButton
          style={[
            sDyn.cardSecondary, 
            { 
              backgroundColor: (isPro || isSimulationMode) ? `${colors.purple}14` : colors.cardBg, 
              borderColor: colors.purple 
            }
          ]}
          onPress={handleProPress}
          activeOpacity={0.4}
        >
          <View style={sDyn.cardHeader}>
            <View style={[sDyn.iconWrapperSmall, { backgroundColor: `${colors.purple}26` }]}>
              <Text style={sDyn.iconSmall}>👑</Text>
            </View>
            <Text style={[sDyn.arrowSmall, { color: colors.textSec }]}>›</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%', marginTop: scaleHeight(2) }}>
            <Text numberOfLines={1} adjustsFontSizeToFit style={[sDyn.cardTitleSecondary, { color: colors.textPri, marginTop: 0, flex: 1 }]}>
              {(isPro || isSimulationMode) ? t('common.proActive').toUpperCase() : t('common.freeAccount').toUpperCase()}
            </Text>
            <Text style={[sDyn.badgeText, { color: '#FFF', backgroundColor: colors.purple, paddingHorizontal: 3, paddingVertical: 1, borderRadius: 3, marginLeft: 2 }]}>
              {(isPro || isSimulationMode) ? 'PRO' : 'FREE'}
            </Text>
          </View>
        </BentoButton>
      </View>
    </View>
  );
}

const MONO = Platform.OS === 'ios' ? 'Menlo' : 'monospace';
