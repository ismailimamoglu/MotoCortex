import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, Image, Alert } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useBluetoothStore } from '../store/useBluetoothStore';
import { useAppStore } from '../store/useAppStore';
import { useThemeColors } from '../theme';
import { useResponsive } from '../hooks/useResponsive';
import { useTelemetryStore } from '../store/useTelemetryStore';

interface BentoGridProps {
  onOpenDiagnostics: () => void;
  onOpenSensors: () => void;
  onOpenProfile: () => void;
  onOpenSettings: () => void;
  onOpenPaywall: () => void;
  onOpenSupport: () => void;
  onShareApp: () => void;
}

export default function BentoGrid({
  onOpenDiagnostics,
  onOpenSensors,
  onOpenProfile,
  onOpenSettings,
  onOpenPaywall,
  onOpenSupport,
  onShareApp,
}: BentoGridProps) {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const { s: scaleWidth, vs: scaleHeight, ms: scaleMod, fs: scaleFont, isTablet, isPortrait } = useResponsive();
  const useRowLayout = isTablet && !isPortrait;

  const language = useAppStore((state) => state.language);
  const isPro = useAppStore((state) => state.isPro);
  const theme = useAppStore((state) => state.theme);
  const isSimulationMode = useAppStore((state) => state.isSimulationMode);

  const dtcs = useBluetoothStore((state) => state.dtcs);
  const vin = useBluetoothStore((state) => state.vin);
  const odometer = useBluetoothStore((state) => state.odometer);
  
  const ecuStatus = useBluetoothStore((state) => state.ecuStatus);
  const activeSessionVehicle = useTelemetryStore((state) => state.activeSessionVehicle);
  const isConnected = ecuStatus === 'connected' && !!activeSessionVehicle;

  const dtcCount = dtcs.length;
  const isClean = dtcCount === 0;

  const displayVin = vin ? `${vin.slice(0, 5)}...` : 'N/A';
  const displayOdo = odometer && odometer !== 'UNSUPPORTED' ? `${odometer}km` : '--';

  const LANGUAGE_FLAGS: Record<string, string> = {
    en: '🇬🇧', de: '🇩🇪', es: '🇪🇸', tr: '🇹🇷', id: '🇮🇩', it: '🇮🇹',
    ar: '🇸🇦', zh: '🇨🇳', da: '🇩🇰', fi: '🇫🇮', fr: '🇫🇷', hi: '🇮🇳',
    nl: '🇳🇱', ja: '🇯🇵', ko: '🇰🇷', pl: '🇵🇱', hu: '🇭🇺', no: '🇳🇴',
    pt: '🇵🇹', ro: '🇷🇴', ru: '🇷🇺', th: '🇹🇭', uk: '🇺🇦', el: '🇬🇷',
    cs: '🇨🇿', sv: '🇸🇪'
  };
  const langFlag = LANGUAGE_FLAGS[language] || '🇬🇧';

  // Dynamic Styles generated using the responsive hooks (Memoized for zero re-render overhead)
  const sDyn = React.useMemo(() => {
    const isPhoneCompact = !isTablet;
    return {
      gridContainer: {
        gap: isTablet ? scaleMod(10) : scaleMod(8),
        marginBottom: isTablet ? scaleHeight(16) : scaleHeight(8),
      },
      row: {
        flexDirection: 'row' as const,
        gap: isTablet ? scaleMod(10) : scaleMod(8),
      },
      card: {
        flex: 1,
        borderWidth: scaleMod(2.5),
        borderRadius: scaleMod(16),
        padding: isTablet ? scaleMod(12) : scaleMod(10),
        minHeight: (isTablet && isPortrait) ? scaleHeight(150) : (isTablet ? scaleHeight(110) : scaleHeight(96)),
        justifyContent: 'space-between' as const,
      },
      cardHeader: {
        flexDirection: 'row' as const,
        justifyContent: 'space-between' as const,
        alignItems: 'flex-start' as const,
      },
      iconWrapper: {
        width: scaleMod(32),
        height: scaleMod(32),
        borderRadius: scaleMod(8),
        alignItems: 'center' as const,
        justifyContent: 'center' as const,
      },
      icon: {
        fontSize: scaleFont(14),
        fontWeight: '900' as const,
      },
      arrow: {
        fontSize: scaleFont(16),
        fontWeight: '700' as const,
        marginTop: -scaleHeight(2),
      },
      lockIconWrapper: {
        paddingHorizontal: scaleMod(6),
        paddingVertical: scaleHeight(2),
        borderRadius: scaleMod(6),
        marginLeft: 'auto' as const,
        marginRight: scaleMod(4),
      },
      lockIcon: {
        fontSize: scaleFont(8),
        fontWeight: '900' as const,
        fontFamily: MONO,
        color: '#A855F7',
      },
      cardTitle: {
        fontSize: isTablet ? scaleFont(12) : scaleFont(10.5),
        fontWeight: '800' as const,
        marginTop: scaleHeight(6),
        fontFamily: MONO,
      },
      cardSubtitle: {
        fontSize: isTablet ? scaleFont(9) : scaleFont(8.2),
        fontWeight: '800' as const,
        marginTop: scaleHeight(2),
        fontFamily: MONO,
      },
      extraTiny: {
        fontSize: scaleFont(8),
        marginTop: scaleHeight(1),
        fontFamily: MONO,
      },
      settingsBadgeRow: {
        flexDirection: 'row' as const,
        alignItems: 'center' as const,
        gap: scaleMod(6),
        marginTop: scaleHeight(3),
      },
      badgeFlag: {
        fontSize: scaleFont(12),
      },
      themeBadge: {
        fontSize: scaleFont(8),
        fontWeight: '800' as const,
        paddingHorizontal: scaleMod(5),
        paddingVertical: scaleHeight(2),
        borderRadius: scaleMod(4),
        overflow: 'hidden' as const,
        fontFamily: MONO,
      },
    };
  }, [scaleWidth, scaleHeight, scaleMod, scaleFont, isTablet, isPortrait]);

  const cardBaseStyle = [
    sDyn.card, 
    { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }
  ];

  return (
    <View style={useRowLayout ? [sDyn.row, { marginBottom: scaleHeight(16) }] : sDyn.gridContainer}>
      {useRowLayout ? (
        <>
          {/* Card 1: Diagnostics */}
          <TouchableOpacity
            style={cardBaseStyle}
            onPress={onOpenDiagnostics}
            activeOpacity={0.8}
          >
            <View style={sDyn.cardHeader}>
              <View style={[sDyn.iconWrapper, { backgroundColor: isConnected ? (isClean ? `${colors.green}1A` : `${colors.red}1A`) : `${colors.textSec}0D`, flexShrink: 0 }]}>
                <Text style={[sDyn.icon, { color: isConnected ? (isClean ? colors.green : colors.red) : colors.textSec }]}>
                  {isConnected ? (isClean ? '✓' : '⚠') : '🔍'}
                </Text>
              </View>
              <Text style={[sDyn.arrow, { color: colors.textSec, flexShrink: 0 }]}>›</Text>
            </View>
            <Text 
              numberOfLines={1} 
              adjustsFontSizeToFit 
              minimumFontScale={0.8} 
              style={[sDyn.cardTitle, { flexShrink: 1 }]}
            >
              {t('bento.diagnostics')}
            </Text>
            <Text 
              numberOfLines={1} 
              adjustsFontSizeToFit 
              minimumFontScale={0.8} 
              style={[sDyn.cardSubtitle, { color: isConnected ? (isClean ? colors.green : colors.red) : colors.textSec, flexShrink: 1 }]}
            >
              {isConnected 
                ? (isClean ? t('bento.cleanFaults') : t('bento.dtcDetected', { count: dtcCount }))
                : t('bento.settings.noConnection', 'Bağlantı Yok')}
            </Text>
          </TouchableOpacity>

          {/* Card 2: Live Sensors */}
          <TouchableOpacity
            style={cardBaseStyle}
            onPress={onOpenSensors}
            activeOpacity={0.8}
          >
            <View style={sDyn.cardHeader}>
              <View style={[sDyn.iconWrapper, { backgroundColor: isConnected ? `${colors.cyan}1A` : `${colors.textSec}0D`, flexShrink: 0 }]}>
                <Text style={[sDyn.icon, { color: isConnected ? colors.cyan : colors.textSec }]}>
                  📊
                </Text>
              </View>
              <Text style={[sDyn.arrow, { color: colors.textSec, flexShrink: 0 }]}>›</Text>
            </View>
            <Text 
              numberOfLines={1} 
              adjustsFontSizeToFit 
              minimumFontScale={0.8} 
              style={[sDyn.cardTitle, { flexShrink: 1 }]}
            >
              {t('bento.liveSensors')}
            </Text>
            <Text 
              numberOfLines={1} 
              adjustsFontSizeToFit 
              minimumFontScale={0.8} 
              style={[sDyn.cardSubtitle, { color: isConnected ? colors.cyan : colors.textSec, flexShrink: 1 }]}
            >
              {isConnected 
                ? t('bento.realtimeData')
                : t('bento.settings.noConnection', 'Bağlantı Yok')}
            </Text>
          </TouchableOpacity>

          {/* Card 3: Vehicle Profile (About App) */}
          <TouchableOpacity
            style={cardBaseStyle}
            onPress={onOpenProfile}
            activeOpacity={0.8}
          >
            <View style={sDyn.cardHeader}>
              <View style={[sDyn.iconWrapper, { backgroundColor: 'transparent', flexShrink: 0 }]}>
                <Image source={require('../../assets/icon.png')} style={{ width: '100%', height: '100%', borderRadius: scaleMod(8) }} />
              </View>
              <Text style={[sDyn.arrow, { color: colors.textSec, flexShrink: 0 }]}>›</Text>
            </View>
            <Text 
              numberOfLines={1} 
              adjustsFontSizeToFit 
              minimumFontScale={0.8} 
              style={[sDyn.cardTitle, { flexShrink: 1 }]}
            >
              {t('bento.vehicleProfile')}
            </Text>
            <View style={{ flexShrink: 1 }}>
              <Text 
                numberOfLines={1} 
                adjustsFontSizeToFit 
                minimumFontScale={0.8} 
                style={[sDyn.cardSubtitle, { color: colors.textSec, fontSize: scaleFont(8.5), lineHeight: scaleFont(11.5), flexShrink: 1 }]}
              >
                {t('bento.aboutAppDesc', 'Uygulama Bilgileri & Rehber')}
              </Text>
            </View>
          </TouchableOpacity>

          {/* Card 4: Quick Settings */}
          <TouchableOpacity
            style={cardBaseStyle}
            onPress={onOpenSettings}
            activeOpacity={0.8}
          >
            <View style={sDyn.cardHeader}>
              <View style={[sDyn.iconWrapper, { backgroundColor: `${colors.amber}1A`, flexShrink: 0 }]}>
                <Text style={sDyn.icon}>⚙️</Text>
              </View>
              <Text style={[sDyn.arrow, { color: colors.textSec, flexShrink: 0 }]}>›</Text>
            </View>
            <Text 
              numberOfLines={1} 
              adjustsFontSizeToFit 
              minimumFontScale={0.8} 
              style={[sDyn.cardTitle, { flexShrink: 1 }]}
            >
              {t('bento.quickSettings')}
            </Text>
            <View style={[sDyn.settingsBadgeRow, { flexShrink: 0 }]}>
              <Text style={sDyn.badgeFlag}>{langFlag}</Text>
              <Text style={[sDyn.themeBadge, { color: colors.cyan, backgroundColor: `${colors.cyan}1A` }]}>
                {t(`common.${theme}`).toUpperCase()}
              </Text>
            </View>
          </TouchableOpacity>

          {/* Card 5: Support Center */}
          <TouchableOpacity
            style={cardBaseStyle}
            onPress={onOpenSupport}
            activeOpacity={0.8}
          >
            <View style={sDyn.cardHeader}>
              <View style={[sDyn.iconWrapper, { backgroundColor: `${colors.cyan}1A`, flexShrink: 0 }]}>
                <Text style={sDyn.icon}>📍</Text>
              </View>
              <Text style={[sDyn.arrow, { color: colors.textSec, flexShrink: 0 }]}>›</Text>
            </View>
            <Text 
              numberOfLines={1} 
              adjustsFontSizeToFit 
              minimumFontScale={0.8} 
              style={[sDyn.cardTitle, { flexShrink: 1 }]}
            >
              {t('info.support', 'DESTEK MERKEZİ')}
            </Text>
            <Text 
              numberOfLines={1} 
              adjustsFontSizeToFit 
              minimumFontScale={0.8} 
              style={[sDyn.cardSubtitle, { color: colors.textSec, flexShrink: 1 }]}
            >
              {t('bento.supportDesc', 'Destek ve İletişim')}
            </Text>
          </TouchableOpacity>

          {/* Card 6: Share App */}
          <TouchableOpacity
            style={cardBaseStyle}
            onPress={onShareApp}
            activeOpacity={0.8}
          >
            <View style={sDyn.cardHeader}>
              <View style={[sDyn.iconWrapper, { backgroundColor: `${colors.purple}1A`, flexShrink: 0 }]}>
                <Text style={sDyn.icon}>✨</Text>
              </View>
              <Text style={[sDyn.arrow, { color: colors.textSec, flexShrink: 0 }]}>›</Text>
            </View>
            <Text 
              numberOfLines={1} 
              adjustsFontSizeToFit 
              minimumFontScale={0.8} 
              style={[sDyn.cardTitle, { flexShrink: 1 }]}
            >
              {t('expertise.share', 'PAYLAŞ')}
            </Text>
            <Text 
              numberOfLines={1} 
              adjustsFontSizeToFit 
              minimumFontScale={0.8} 
              style={[sDyn.cardSubtitle, { color: colors.textSec, flexShrink: 1 }]}
            >
              {t('bento.shareDesc', 'Uygulamayı Paylaş')}
            </Text>
          </TouchableOpacity>
        </>
      ) : (
        <>
          {/* Row 1 */}
          <View style={sDyn.row}>
            {/* Card 1: Diagnostics */}
            <TouchableOpacity
              style={cardBaseStyle}
              onPress={onOpenDiagnostics}
              activeOpacity={0.8}
            >
              <View style={sDyn.cardHeader}>
                <View style={[sDyn.iconWrapper, { backgroundColor: isConnected ? (isClean ? `${colors.green}1A` : `${colors.red}1A`) : `${colors.textSec}0D`, flexShrink: 0 }]}>
                  <Text style={[sDyn.icon, { color: isConnected ? (isClean ? colors.green : colors.red) : colors.textSec }]}>
                    {isConnected ? (isClean ? '✓' : '⚠') : '🔍'}
                  </Text>
                </View>
                <Text style={[sDyn.arrow, { color: colors.textSec, flexShrink: 0 }]}>›</Text>
              </View>
              <Text 
                numberOfLines={1} 
                adjustsFontSizeToFit 
                minimumFontScale={0.8} 
                style={[sDyn.cardTitle, { flexShrink: 1 }]}
              >
                {t('bento.diagnostics')}
              </Text>
              <Text 
                numberOfLines={1} 
                adjustsFontSizeToFit 
                minimumFontScale={0.8} 
                style={[sDyn.cardSubtitle, { color: isConnected ? (isClean ? colors.green : colors.red) : colors.textSec, flexShrink: 1 }]}
              >
                {isConnected 
                  ? (isClean ? t('bento.cleanFaults') : t('bento.dtcDetected', { count: dtcCount }))
                  : t('bento.settings.noConnection', 'Bağlantı Yok')}
              </Text>
            </TouchableOpacity>

            {/* Card 2: Live Sensors */}
            <TouchableOpacity
              style={cardBaseStyle}
              onPress={onOpenSensors}
              activeOpacity={0.8}
            >
              <View style={sDyn.cardHeader}>
                <View style={[sDyn.iconWrapper, { backgroundColor: isConnected ? `${colors.cyan}1A` : `${colors.textSec}0D`, flexShrink: 0 }]}>
                  <Text style={[sDyn.icon, { color: isConnected ? colors.cyan : colors.textSec }]}>
                    📊
                  </Text>
                </View>
                <Text style={[sDyn.arrow, { color: colors.textSec, flexShrink: 0 }]}>›</Text>
              </View>
              <Text 
                numberOfLines={1} 
                adjustsFontSizeToFit 
                minimumFontScale={0.8} 
                style={[sDyn.cardTitle, { flexShrink: 1 }]}
              >
                {t('bento.liveSensors')}
              </Text>
              <Text 
                numberOfLines={1} 
                adjustsFontSizeToFit 
                minimumFontScale={0.8} 
                style={[sDyn.cardSubtitle, { color: isConnected ? colors.cyan : colors.textSec, flexShrink: 1 }]}
              >
                {isConnected 
                  ? t('bento.realtimeData')
                  : t('bento.settings.noConnection', 'Bağlantı Yok')}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Row 2 */}
          <View style={sDyn.row}>
            {/* Card 3: Vehicle Profile (About App) */}
            <TouchableOpacity
              style={cardBaseStyle}
              onPress={onOpenProfile}
              activeOpacity={0.8}
            >
              <View style={sDyn.cardHeader}>
                <View style={[sDyn.iconWrapper, { backgroundColor: 'transparent', flexShrink: 0 }]}>
                  <Image source={require('../../assets/icon.png')} style={{ width: '100%', height: '100%', borderRadius: scaleMod(8) }} />
                </View>
                <Text style={[sDyn.arrow, { color: colors.textSec, flexShrink: 0 }]}>›</Text>
              </View>
              <Text 
                numberOfLines={1} 
                adjustsFontSizeToFit 
                minimumFontScale={0.8} 
                style={[sDyn.cardTitle, { flexShrink: 1 }]}
              >
                {t('bento.vehicleProfile')}
              </Text>
              <View style={{ flexShrink: 1 }}>
                <Text 
                  numberOfLines={1} 
                  adjustsFontSizeToFit 
                  minimumFontScale={0.8} 
                  style={[sDyn.cardSubtitle, { color: colors.textSec, fontSize: scaleFont(8.5), lineHeight: scaleFont(11.5), flexShrink: 1 }]}
                >
                  {t('bento.aboutAppDesc', 'Uygulama Bilgileri & Rehber')}
                </Text>
              </View>
            </TouchableOpacity>

            {/* Card 4: Quick Settings */}
            <TouchableOpacity
              style={cardBaseStyle}
              onPress={onOpenSettings}
              activeOpacity={0.8}
            >
              <View style={sDyn.cardHeader}>
                <View style={[sDyn.iconWrapper, { backgroundColor: `${colors.amber}1A`, flexShrink: 0 }]}>
                  <Text style={sDyn.icon}>⚙️</Text>
                </View>
                <Text style={[sDyn.arrow, { color: colors.textSec, flexShrink: 0 }]}>›</Text>
              </View>
              <Text 
                numberOfLines={1} 
                adjustsFontSizeToFit 
                minimumFontScale={0.8} 
                style={[sDyn.cardTitle, { flexShrink: 1 }]}
              >
                {t('bento.quickSettings')}
              </Text>
              <View style={[sDyn.settingsBadgeRow, { flexShrink: 0 }]}>
                <Text style={sDyn.badgeFlag}>{langFlag}</Text>
                <Text style={[sDyn.themeBadge, { color: colors.cyan, backgroundColor: `${colors.cyan}1A` }]}>
                  {t(`common.${theme}`).toUpperCase()}
                </Text>
              </View>
            </TouchableOpacity>
          </View>

          {/* Row 3 */}
          <View style={sDyn.row}>
            {/* Card 5: Support Center */}
            <TouchableOpacity
              style={cardBaseStyle}
              onPress={onOpenSupport}
              activeOpacity={0.8}
            >
              <View style={sDyn.cardHeader}>
                <View style={[sDyn.iconWrapper, { backgroundColor: `${colors.cyan}1A`, flexShrink: 0 }]}>
                  <Text style={sDyn.icon}>📍</Text>
                </View>
                <Text style={[sDyn.arrow, { color: colors.textSec, flexShrink: 0 }]}>›</Text>
              </View>
              <Text 
                numberOfLines={1} 
                adjustsFontSizeToFit 
                minimumFontScale={0.8} 
                style={[sDyn.cardTitle, { flexShrink: 1 }]}
              >
                {t('info.support', 'DESTEK MERKEZİ')}
              </Text>
              <Text 
                numberOfLines={1} 
                adjustsFontSizeToFit 
                minimumFontScale={0.8} 
                style={[sDyn.cardSubtitle, { color: colors.textSec, flexShrink: 1 }]}
              >
                {t('bento.supportDesc', 'Destek ve İletişim')}
              </Text>
            </TouchableOpacity>

            {/* Card 6: Share App */}
            <TouchableOpacity
              style={cardBaseStyle}
              onPress={onShareApp}
              activeOpacity={0.8}
            >
              <View style={sDyn.cardHeader}>
                <View style={[sDyn.iconWrapper, { backgroundColor: `${colors.purple}1A`, flexShrink: 0 }]}>
                  <Text style={sDyn.icon}>✨</Text>
                </View>
                <Text style={[sDyn.arrow, { color: colors.textSec, flexShrink: 0 }]}>›</Text>
              </View>
              <Text 
                numberOfLines={1} 
                adjustsFontSizeToFit 
                minimumFontScale={0.8} 
                style={[sDyn.cardTitle, { flexShrink: 1 }]}
              >
                {t('expertise.share', 'PAYLAŞ')}
              </Text>
              <Text 
                numberOfLines={1} 
                adjustsFontSizeToFit 
                minimumFontScale={0.8} 
                style={[sDyn.cardSubtitle, { color: colors.textSec, flexShrink: 1 }]}
              >
                {t('bento.shareDesc', 'Uygulamayı Paylaş')}
              </Text>
            </TouchableOpacity>
          </View>
        </>
      )}
    </View>
  );
}

const MONO = Platform.OS === 'ios' ? 'Menlo' : 'monospace';
