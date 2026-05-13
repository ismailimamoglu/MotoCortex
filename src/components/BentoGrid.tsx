import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useBluetoothStore } from '../store/useBluetoothStore';
import { useAppStore } from '../store/useAppStore';
import { useThemeColors } from '../theme';

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
  const language = useAppStore((state) => state.language);
  const isPro = useAppStore((state) => state.isPro);
  const theme = useAppStore((state) => state.theme);

  const dtcs = useBluetoothStore((state) => state.dtcs);
  const vin = useBluetoothStore((state) => state.vin);
  const odometer = useBluetoothStore((state) => state.odometer);

  const dtcCount = dtcs.length;
  const isClean = dtcCount === 0;

  const displayVin = vin ? `${vin.slice(0, 5)}...` : 'N/A';
  const displayOdo = odometer && odometer !== 'UNSUPPORTED' ? `${odometer}km` : '--';

  const langFlag = language === 'tr' ? '🇹🇷' : language === 'de' ? '🇩🇪' : language === 'es' ? '🇪🇸' : language === 'id' ? '🇮🇩' : '🇬🇧';

  const cardStyle = [s.card, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder, shadowColor: colors.accentGlow }];

  return (
    <View style={s.gridContainer}>
      {/* Row 1 */}
      <View style={s.row}>
        {/* Card 1: Diagnostics */}
        <TouchableOpacity
          style={[...cardStyle, s.cardLeft]}
          onPress={isPro ? onOpenDiagnostics : onOpenPaywall}
          activeOpacity={0.8}
        >
          <View style={s.cardHeader}>
            <View style={[s.iconWrapper, { backgroundColor: isClean ? `${colors.green}1A` : `${colors.red}1A` }]}>
              <Text style={s.icon}>{isClean ? '✓' : '⚠'}</Text>
            </View>
            {!isPro ? (
              <Text style={[s.lockIcon, { color: colors.purple, backgroundColor: `${colors.purple}26` }]}>🔒 PRO</Text>
            ) : (
              <Text style={[s.arrow, { color: colors.textSec }]}>›</Text>
            )}
          </View>
          <Text style={[s.cardTitle, { color: colors.textPri }]}>{t('bento.diagnostics')}</Text>
          <Text style={[s.cardSubtitle, { color: isClean ? colors.green : colors.red }]}>
            {isClean ? t('bento.cleanFaults') : t('bento.dtcDetected', { count: dtcCount })}
          </Text>
        </TouchableOpacity>

        {/* Card 2: Live Sensors */}
        <TouchableOpacity
          style={[...cardStyle, s.cardRight]}
          onPress={isPro ? onOpenSensors : onOpenPaywall}
          activeOpacity={0.8}
        >
          <View style={s.cardHeader}>
            <View style={[s.iconWrapper, { backgroundColor: `${colors.cyan}1A` }]}>
              <Text style={s.icon}>📊</Text>
            </View>
            {!isPro ? (
              <Text style={[s.lockIcon, { color: colors.purple, backgroundColor: `${colors.purple}26` }]}>🔒 PRO</Text>
            ) : (
              <Text style={[s.arrow, { color: colors.textSec }]}>›</Text>
            )}
          </View>
          <Text style={[s.cardTitle, { color: colors.textPri }]}>{t('bento.liveSensors')}</Text>
          <Text style={[s.cardSubtitle, { color: colors.cyan }]}>{t('bento.realtimeData')}</Text>
        </TouchableOpacity>
      </View>

      {/* Row 2 */}
      <View style={s.row}>
        {/* Card 3: Vehicle Profile */}
        <TouchableOpacity
          style={[...cardStyle, s.cardLeft]}
          onPress={onOpenProfile}
          activeOpacity={0.8}
        >
          <View style={s.cardHeader}>
            <View style={[s.iconWrapper, { backgroundColor: `${colors.purple}1A` }]}>
              <Text style={s.icon}>🏍️</Text>
            </View>
            <Text style={[s.arrow, { color: colors.textSec }]}>›</Text>
          </View>
          <Text style={[s.cardTitle, { color: colors.textPri }]}>{t('bento.vehicleProfile')}</Text>
          <Text style={[s.cardSubtitle, { color: colors.textSec }]}>
            VIN: {displayVin}
          </Text>
          <Text style={[s.extraTiny, { color: colors.textTertiary }]}>ODO: {displayOdo}</Text>
        </TouchableOpacity>

        {/* Card 4: Quick Settings */}
        <TouchableOpacity
          style={[...cardStyle, s.cardRight]}
          onPress={onOpenSettings}
          activeOpacity={0.8}
        >
          <View style={s.cardHeader}>
            <View style={[s.iconWrapper, { backgroundColor: `${colors.amber}1A` }]}>
              <Text style={s.icon}>⚙️</Text>
            </View>
            <Text style={[s.arrow, { color: colors.textSec }]}>›</Text>
          </View>
          <Text style={[s.cardTitle, { color: colors.textPri }]}>{t('bento.quickSettings')}</Text>
          <View style={s.settingsBadgeRow}>
            <Text style={s.badgeFlag}>{langFlag}</Text>
            <Text style={[s.themeBadge, { color: colors.cyan, backgroundColor: `${colors.cyan}1A` }]}>
              {theme.toUpperCase()}
            </Text>
          </View>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const MONO = Platform.OS === 'ios' ? 'Menlo' : 'monospace';

const s = StyleSheet.create({
  gridContainer: {
    gap: 12,
    marginBottom: 24,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  card: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 20,
    padding: 16,
    minHeight: 130,
    justifyContent: 'space-between',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 3,
  },
  cardLeft: {},
  cardRight: {},
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  iconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    fontSize: 16,
    fontWeight: '900',
  },
  arrow: {
    fontSize: 18,
    fontWeight: '700',
    marginTop: -4,
  },
  lockIcon: {
    fontSize: 10,
    fontWeight: '900',
    fontFamily: MONO,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    overflow: 'hidden',
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '800',
    marginTop: 12,
    fontFamily: MONO,
  },
  cardSubtitle: {
    fontSize: 10,
    fontWeight: '800',
    marginTop: 4,
    fontFamily: MONO,
  },
  extraTiny: {
    fontSize: 9,
    marginTop: 2,
    fontFamily: MONO,
  },
  settingsBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  badgeFlag: {
    fontSize: 14,
  },
  themeBadge: {
    fontSize: 9,
    fontWeight: '800',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    overflow: 'hidden',
    fontFamily: MONO,
  },
});
