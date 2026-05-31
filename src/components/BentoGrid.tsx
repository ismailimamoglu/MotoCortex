import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, Image } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useBluetoothStore } from '../store/useBluetoothStore';
import { useAppStore } from '../store/useAppStore';
import { useThemeColors } from '../theme';
import { useResponsive } from '../hooks/useResponsive';

interface BentoGridProps {
  onOpenDiagnostics: () => void;
  onOpenSensors: () => void;
  onOpenProfile: () => void;
  onOpenSettings: () => void;
  onOpenPaywall: () => void;
}

export default function BentoGrid({
  onOpenDiagnostics,
  onOpenSensors,
  onOpenProfile,
  onOpenSettings,
  onOpenPaywall,
}: BentoGridProps) {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const { s: scaleWidth, vs: scaleHeight, ms: scaleMod, fs: scaleFont, isTablet } = useResponsive();

  const language = useAppStore((state) => state.language);
  const isPro = useAppStore((state) => state.isPro);
  const theme = useAppStore((state) => state.theme);
  const isSimulationMode = useAppStore((state) => state.isSimulationMode);

  const dtcs = useBluetoothStore((state) => state.dtcs);
  const vin = useBluetoothStore((state) => state.vin);
  const odometer = useBluetoothStore((state) => state.odometer);

  const dtcCount = dtcs.length;
  const isClean = dtcCount === 0;

  const displayVin = vin ? `${vin.slice(0, 5)}...` : 'N/A';
  const displayOdo = odometer && odometer !== 'UNSUPPORTED' ? `${odometer}km` : '--';

  const langFlag = language === 'tr' ? '🇹🇷' : language === 'de' ? '🇩🇪' : language === 'es' ? '🇪🇸' : language === 'id' ? '🇮🇩' : language === 'it' ? '🇮🇹' : '🇬🇧';

  // Dynamic Styles generated using the responsive hooks (Memoized for zero re-render overhead)
  const sDyn = React.useMemo(() => {
    return {
      gridContainer: {
        gap: scaleMod(10),
        marginBottom: scaleHeight(16),
      },
      row: {
        flexDirection: 'row' as const,
        gap: scaleMod(10),
      },
      card: {
        flex: 1,
        borderWidth: scaleMod(2.5),
        borderRadius: scaleMod(16),
        padding: scaleMod(12),
        minHeight: scaleHeight(110),
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
        fontSize: scaleFont(12),
        fontWeight: '800' as const,
        marginTop: scaleHeight(8),
        fontFamily: MONO,
      },
      cardSubtitle: {
        fontSize: scaleFont(9),
        fontWeight: '800' as const,
        marginTop: scaleHeight(3),
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
  }, [scaleWidth, scaleHeight, scaleMod, scaleFont]);

  const cardBaseStyle = [
    sDyn.card, 
    { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }
  ];

  return (
    <View style={isTablet ? [sDyn.row, { marginBottom: scaleHeight(16) }] : sDyn.gridContainer}>
      {isTablet ? (
        <>
          {/* Card 1: Diagnostics */}
          <TouchableOpacity
            style={cardBaseStyle}
            onPress={onOpenDiagnostics}
            activeOpacity={0.8}
          >
            <View style={sDyn.cardHeader}>
              <View style={[sDyn.iconWrapper, { backgroundColor: isClean ? `${colors.green}1A` : `${colors.red}1A` }]}>
                <Text style={[sDyn.icon, { color: isClean ? colors.green : colors.red }]}>{isClean ? '✓' : '⚠'}</Text>
              </View>
              <Text style={[sDyn.arrow, { color: colors.textSec }]}>›</Text>
            </View>
            <Text style={sDyn.cardTitle}>{t('bento.diagnostics')}</Text>
            <Text style={[sDyn.cardSubtitle, { color: isClean ? colors.green : colors.red }]}>
              {isClean ? t('bento.cleanFaults') : t('bento.dtcDetected', { count: dtcCount })}
            </Text>
          </TouchableOpacity>

          {/* Card 2: Live Sensors */}
          <TouchableOpacity
            style={cardBaseStyle}
            onPress={onOpenSensors}
            activeOpacity={0.8}
          >
            <View style={sDyn.cardHeader}>
              <View style={[sDyn.iconWrapper, { backgroundColor: `${colors.cyan}1A` }]}>
                <Text style={sDyn.icon}>📊</Text>
              </View>
              {(!isPro && !isSimulationMode) && (
                <View style={[sDyn.lockIconWrapper, { backgroundColor: `${colors.purple}26` }]}>
                  <Text style={sDyn.lockIcon}>👑 PRO</Text>
                </View>
              )}
              <Text style={[sDyn.arrow, { color: colors.textSec }]}>›</Text>
            </View>
            <Text style={sDyn.cardTitle}>{t('bento.liveSensors')}</Text>
            <Text style={[sDyn.cardSubtitle, { color: colors.cyan }]}>{t('bento.realtimeData')}</Text>
          </TouchableOpacity>

          {/* Card 3: Vehicle Profile */}
          <TouchableOpacity
            style={cardBaseStyle}
            onPress={onOpenProfile}
            activeOpacity={0.8}
          >
            <View style={sDyn.cardHeader}>
              <View style={[sDyn.iconWrapper, { backgroundColor: 'transparent' }]}>
                <Image source={require('../../assets/icon.png')} style={{ width: '100%', height: '100%', borderRadius: scaleMod(8) }} />
              </View>
              <Text style={[sDyn.arrow, { color: colors.textSec }]}>›</Text>
            </View>
            <Text style={sDyn.cardTitle}>{t('bento.vehicleProfile')}</Text>
            <View>
              <Text style={[sDyn.cardSubtitle, { color: colors.textSec }]}>
                VIN: {displayVin}
              </Text>
              <Text style={sDyn.extraTiny}>ODO: {displayOdo}</Text>
            </View>
          </TouchableOpacity>

          {/* Card 4: Quick Settings */}
          <TouchableOpacity
            style={cardBaseStyle}
            onPress={onOpenSettings}
            activeOpacity={0.8}
          >
            <View style={sDyn.cardHeader}>
              <View style={[sDyn.iconWrapper, { backgroundColor: `${colors.amber}1A` }]}>
                <Text style={sDyn.icon}>⚙️</Text>
              </View>
              <Text style={[sDyn.arrow, { color: colors.textSec }]}>›</Text>
            </View>
            <Text style={sDyn.cardTitle}>{t('bento.quickSettings')}</Text>
            <View style={sDyn.settingsBadgeRow}>
              <Text style={sDyn.badgeFlag}>{langFlag}</Text>
              <Text style={[sDyn.themeBadge, { color: colors.cyan, backgroundColor: `${colors.cyan}1A` }]}>
                {t(`common.${theme}`).toUpperCase()}
              </Text>
            </View>
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
                <View style={[sDyn.iconWrapper, { backgroundColor: isClean ? `${colors.green}1A` : `${colors.red}1A` }]}>
                  <Text style={[sDyn.icon, { color: isClean ? colors.green : colors.red }]}>{isClean ? '✓' : '⚠'}</Text>
                </View>
                <Text style={[sDyn.arrow, { color: colors.textSec }]}>›</Text>
              </View>
              <Text style={sDyn.cardTitle}>{t('bento.diagnostics')}</Text>
              <Text style={[sDyn.cardSubtitle, { color: isClean ? colors.green : colors.red }]}>
                {isClean ? t('bento.cleanFaults') : t('bento.dtcDetected', { count: dtcCount })}
              </Text>
            </TouchableOpacity>

            {/* Card 2: Live Sensors */}
            <TouchableOpacity
              style={cardBaseStyle}
              onPress={onOpenSensors}
              activeOpacity={0.8}
            >
              <View style={sDyn.cardHeader}>
                <View style={[sDyn.iconWrapper, { backgroundColor: `${colors.cyan}1A` }]}>
                  <Text style={sDyn.icon}>📊</Text>
                </View>
                {(!isPro && !isSimulationMode) && (
                  <View style={[sDyn.lockIconWrapper, { backgroundColor: `${colors.purple}26` }]}>
                    <Text style={sDyn.lockIcon}>👑 PRO</Text>
                  </View>
                )}
                <Text style={[sDyn.arrow, { color: colors.textSec }]}>›</Text>
              </View>
              <Text style={sDyn.cardTitle}>{t('bento.liveSensors')}</Text>
              <Text style={[sDyn.cardSubtitle, { color: colors.cyan }]}>{t('bento.realtimeData')}</Text>
            </TouchableOpacity>
          </View>

          {/* Row 2 */}
          <View style={sDyn.row}>
            {/* Card 3: Vehicle Profile */}
            <TouchableOpacity
              style={cardBaseStyle}
              onPress={onOpenProfile}
              activeOpacity={0.8}
            >
              <View style={sDyn.cardHeader}>
                <View style={[sDyn.iconWrapper, { backgroundColor: 'transparent' }]}>
                  <Image source={require('../../assets/icon.png')} style={{ width: '100%', height: '100%', borderRadius: scaleMod(8) }} />
                </View>
                <Text style={[sDyn.arrow, { color: colors.textSec }]}>›</Text>
              </View>
              <Text style={sDyn.cardTitle}>{t('bento.vehicleProfile')}</Text>
              <View>
                <Text style={[sDyn.cardSubtitle, { color: colors.textSec }]}>
                  VIN: {displayVin}
                </Text>
                <Text style={sDyn.extraTiny}>ODO: {displayOdo}</Text>
              </View>
            </TouchableOpacity>

            {/* Card 4: Quick Settings */}
            <TouchableOpacity
              style={cardBaseStyle}
              onPress={onOpenSettings}
              activeOpacity={0.8}
            >
              <View style={sDyn.cardHeader}>
                <View style={[sDyn.iconWrapper, { backgroundColor: `${colors.amber}1A` }]}>
                  <Text style={sDyn.icon}>⚙️</Text>
                </View>
                <Text style={[sDyn.arrow, { color: colors.textSec }]}>›</Text>
              </View>
              <Text style={sDyn.cardTitle}>{t('bento.quickSettings')}</Text>
              <View style={sDyn.settingsBadgeRow}>
                <Text style={sDyn.badgeFlag}>{langFlag}</Text>
                <Text style={[sDyn.themeBadge, { color: colors.cyan, backgroundColor: `${colors.cyan}1A` }]}>
                  {t(`common.${theme}`).toUpperCase()}
                </Text>
              </View>
            </TouchableOpacity>
          </View>
        </>
      )}
    </View>
  );
}

const MONO = Platform.OS === 'ios' ? 'Menlo' : 'monospace';
