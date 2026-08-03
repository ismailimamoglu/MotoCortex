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
      onPress={() => {
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
  onOpenHpGauge?: () => void;
  onOpenFuelTrim?: () => void;
  onOpenDpf?: () => void;
  onOpenMultiEcu?: () => void;
  onOpenDct?: () => void;
  onSafeDisconnect?: () => void;
  onOpenConnect?: () => void;
  onOpenFeatureActivation?: () => void;
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
  onOpenHpGauge,
  onOpenFuelTrim,
  onOpenDpf,
  onOpenMultiEcu,
  onOpenDct,
  onSafeDisconnect,
  onOpenConnect,
  onOpenFeatureActivation,
}: BentoGridProps) {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const { s: scaleWidth, vs: scaleHeight, ms: scaleMod, fs: scaleFont, isTablet, isPortrait } = useResponsive();
  const useRowLayout = isTablet && !isPortrait;

  const language = useAppStore((state) => state.language);
  const isPro = useAppStore((state) => state.isPro);
  const isSimulationMode = useAppStore((state) => state.isSimulationMode);
  const toggleSimulationMode = useAppStore((state) => state.toggleSimulationMode);

  const dtcs = useBluetoothStore((state) => state.dtcs);
  const ecuStatus = useBluetoothStore((state) => state.ecuStatus);
  const activeSessionVehicle = useTelemetryStore((state) => state.activeSessionVehicle);
  const isConnected = ecuStatus === 'connected';

  const dtcCount = dtcs.length;
  const isClean = dtcCount === 0;

  const LANGUAGE_CODES: Record<string, string> = {
    en: '[EN]', de: '[DE]', es: '[ES]', tr: '[TR]', id: '[ID]', it: '[IT]',
    ar: '[AR]', zh: '[ZH]', da: '[DA]', fi: '[FI]', fr: '[FR]', hi: '[HI]',
    nl: '[NL]', ja: '[JA]', ko: '[KO]', pl: '[PL]', hu: '[HU]', no: '[NO]',
    pt: '[PT]', ro: '[RO]', ru: '[RU]', th: '[TH]', uk: '[UK]', el: '[EL]',
    cs: '[CS]', sv: '[SV]'
  };
  const langBadge = LANGUAGE_CODES[language] || '[EN]';

  const handleProPress = () => {
    if (isPro || isSimulationMode) {
      Alert.alert(
        t('common.proActiveTitle', 'PRO STATUS ACTIVE'),
        t('common.proActiveDesc', 'You have full access to all OBD2 UDS diagnostic features.')
      );
    } else {
      onOpenPaywall();
    }
  };

  const executeActiveAction = (actionCallback?: () => void, isDisconnectAction = false) => {
    if (!actionCallback) return;
    if (isConnected || isSimulationMode) {
      actionCallback();
    } else if (isDisconnectAction) {
      Alert.alert(
        t('connection.noActiveTitle', 'No Active Connection'),
        t('connection.noActiveDesc', 'There is no active OBD2 connection to disconnect from.')
      );
    } else {
      Alert.alert(
        t('connection.requiredTitle', 'Connection Required'),
        t('connection.requiredDesc', 'To use this feature, please connect to an OBD2 device or enable Demo Mode.'),
        [
          {
            text: t('common.enableDemoMode', 'ENABLE DEMO MODE'),
            onPress: () => {
              toggleSimulationMode();
              actionCallback();
            },
          },
          {
            text: t('connection.connectBtn', 'CONNECT DEVICE'),
            onPress: () => {
              onOpenConnect && onOpenConnect();
            },
          },
          {
            text: t('common.cancel', 'Cancel'),
            style: 'cancel',
          },
        ]
      );
    }
  };

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
        justifyContent: 'center' as const,
        alignItems: 'center' as const,
      },
      cardSecondary: {
        flex: 1,
        borderWidth: scaleMod(1.2),
        borderRadius: scaleMod(12),
        padding: scaleMod(10),
        minHeight: scaleMod(50),
        justifyContent: 'center' as const,
        alignItems: 'center' as const,
      },
      cardTitle: {
        fontSize: scaleFont(12),
        fontWeight: '900' as const,
        fontFamily: MONO,
        textAlign: 'center' as const,
      },
      cardSubtitle: {
        fontSize: scaleFont(9.5),
        fontWeight: '700' as const,
        fontFamily: MONO,
        textAlign: 'center' as const,
        marginTop: scaleHeight(4),
      },
      cardTitleSecondary: {
        fontSize: scaleFont(10.5),
        fontWeight: '800' as const,
        fontFamily: MONO,
        textAlign: 'center' as const,
      },
      badgeText: {
        fontSize: scaleFont(8.5),
        fontWeight: '900' as const,
        fontFamily: MONO,
      },
      toolsGrid: {
        flexDirection: 'row' as const,
        flexWrap: 'wrap' as const,
        gap: scaleMod(6),
        marginTop: scaleHeight(4),
      },
      toolTile: {
        width: '31.5%' as any,
        backgroundColor: colors.cardBg,
        borderWidth: scaleMod(1.2),
        borderColor: colors.cardBorder,
        borderRadius: scaleMod(10),
        paddingVertical: scaleHeight(8),
        paddingHorizontal: scaleWidth(4),
        alignItems: 'center' as const,
        justifyContent: 'center' as const,
      },
      toolTileText: {
        fontSize: scaleFont(8.5),
        fontWeight: '800' as const,
        fontFamily: MONO,
        color: colors.textPri,
        textAlign: 'center' as const,
        marginTop: scaleHeight(2),
      },
    };
  }, [scaleMod, scaleFont, scaleHeight, scaleWidth, colors]);

  return (
    <View style={sDyn.gridContainer}>
      {/* Row 1: Primary Menus */}
      <View style={sDyn.row}>
        {/* Card 1: Diagnostics */}
        <BentoButton
          style={[sDyn.cardPrimary, { backgroundColor: colors.cardBg, borderColor: isConnected ? (isClean ? colors.green : colors.red) : isSimulationMode ? colors.green : colors.cardBorder }]}
          onPress={() => executeActiveAction(onOpenDiagnostics)}
          activeOpacity={0.4}
        >
          <View>
            <Text numberOfLines={1} adjustsFontSizeToFit style={[sDyn.cardTitle, { color: colors.textPri }]}>
              {t('bento.diagnostics').toUpperCase()}
            </Text>
            <Text numberOfLines={1} adjustsFontSizeToFit style={[sDyn.cardSubtitle, { color: isConnected ? (isClean ? colors.green : colors.red) : isSimulationMode ? colors.green : colors.textSec }]}>
              {isConnected 
                ? (isClean ? t('bento.cleanFaults') : t('bento.dtcDetected', { count: dtcCount }))
                : isSimulationMode
                ? t('common.demoMode', 'DEMO MODE')
                : t('bento.settings.noConnection', 'No Connection')}
            </Text>
          </View>
        </BentoButton>

        {/* Card 2: Live Sensors */}
        <BentoButton
          style={[sDyn.cardPrimary, { backgroundColor: colors.cardBg, borderColor: isConnected ? colors.cyan : isSimulationMode ? colors.green : colors.cardBorder }]}
          onPress={() => executeActiveAction(onOpenSensors)}
          activeOpacity={0.4}
        >
          <View>
            <Text numberOfLines={1} adjustsFontSizeToFit style={[sDyn.cardTitle, { color: colors.textPri }]}>
              {t('bento.liveSensors').toUpperCase()}
            </Text>
            <Text numberOfLines={1} adjustsFontSizeToFit style={[sDyn.cardSubtitle, { color: isConnected ? colors.cyan : isSimulationMode ? colors.green : colors.textSec }]}>
              {isConnected 
                ? t('bento.realtimeData')
                : isSimulationMode
                ? t('common.demoMode', 'DEMO MODE')
                : t('bento.settings.noConnection', 'No Connection')}
            </Text>
          </View>
        </BentoButton>
      </View>

      {/* Row: Feature Coding / Gizli Özellik Açma */}
      <BentoButton
        style={[
          sDyn.cardSecondary,
          {
            width: '100%',
            backgroundColor: colors.cardBg,
            borderColor: colors.cardBorder,
          }
        ]}
        onPress={() => executeActiveAction(onOpenFeatureActivation)}
        activeOpacity={0.4}
      >
        <Text
          numberOfLines={1}
          adjustsFontSizeToFit
          style={[sDyn.cardTitleSecondary, { color: colors.textPri }]}
        >
          {t('bento.featureActivation', 'UNLOCK HIDDEN FEATURES / ECU CODING').toUpperCase()}
        </Text>
      </BentoButton>

      {/* Advanced Telematics & Diagnostic Quick Action Tiles (2x3 Grid) */}
      <View style={sDyn.toolsGrid}>
        <BentoButton style={sDyn.toolTile} onPress={() => executeActiveAction(onOpenHpGauge)}>
          <Text numberOfLines={1} style={sDyn.toolTileText}>{t('bento.hpGauge', 'HORSEPOWER / HP')}</Text>
        </BentoButton>

        <BentoButton style={sDyn.toolTile} onPress={() => executeActiveAction(onOpenFuelTrim)}>
          <Text numberOfLines={1} style={sDyn.toolTileText}>{t('bento.fuelTrim', 'FUEL TRIM')}</Text>
        </BentoButton>

        <BentoButton style={sDyn.toolTile} onPress={() => executeActiveAction(onOpenDpf)}>
          <Text numberOfLines={1} style={sDyn.toolTileText}>{t('bento.dpfFilter', 'DPF FILTER')}</Text>
        </BentoButton>

        <BentoButton style={sDyn.toolTile} onPress={() => executeActiveAction(onOpenMultiEcu)}>
          <Text numberOfLines={1} style={sDyn.toolTileText}>{t('bento.multiEcu', 'MULTI-ECU')}</Text>
        </BentoButton>

        <BentoButton style={sDyn.toolTile} onPress={() => executeActiveAction(onOpenDct)}>
          <Text numberOfLines={1} style={sDyn.toolTileText}>{t('bento.dctAdapt', 'DCT ADAPT')}</Text>
        </BentoButton>

        <BentoButton
          style={[
            sDyn.toolTile,
            isSimulationMode && { borderColor: colors.green, backgroundColor: `${colors.green}1F` }
          ]}
          onPress={toggleSimulationMode}
        >
          <Text
            numberOfLines={1}
            style={[
              sDyn.toolTileText,
              isSimulationMode && { color: colors.green }
            ]}
          >
            {isSimulationMode ? `• ${t('common.demoMode', 'DEMO MODU').toUpperCase()}` : t('common.demoMode', 'DEMO MODU').toUpperCase()}
          </Text>
        </BentoButton>
      </View>

      {/* Row 2: 4 Compact Action Tiles (About, Language, Support, Share) */}
      <View style={{ flexDirection: 'row', gap: scaleMod(6), width: '100%' }}>
        {/* Card 1: About App / Profile */}
        <BentoButton
          style={{
            flex: 1,
            backgroundColor: colors.cardBg,
            borderColor: colors.cardBorder,
            borderWidth: scaleMod(1),
            borderRadius: scaleMod(8),
            paddingVertical: scaleHeight(10),
            paddingHorizontal: scaleWidth(4),
            alignItems: 'center',
            justifyContent: 'center',
          }}
          onPress={onOpenProfile}
          activeOpacity={0.4}
        >
          <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6} style={[sDyn.toolTileText, { color: colors.textPri }]}>
            {t('bento.vehicleProfile', 'ABOUT').toUpperCase()}
          </Text>
        </BentoButton>

        {/* Card 2: Language Selection */}
        <BentoButton
          style={{
            flex: 1,
            backgroundColor: colors.cardBg,
            borderColor: colors.cardBorder,
            borderWidth: scaleMod(1),
            borderRadius: scaleMod(8),
            paddingVertical: scaleHeight(10),
            paddingHorizontal: scaleWidth(4),
            alignItems: 'center',
            justifyContent: 'center',
          }}
          onPress={onOpenSettings}
          activeOpacity={0.4}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
            <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6} style={[sDyn.toolTileText, { color: colors.textPri }]}>
              {t('bento.languageSelect', 'LANG').toUpperCase()}
            </Text>
            <Text style={{ fontSize: scaleFont(9), fontFamily: MONO, color: colors.cyan, marginStart: 2 }}>{langBadge}</Text>
          </View>
        </BentoButton>

        {/* Card 3: Support Center */}
        <BentoButton
          style={{
            flex: 1,
            backgroundColor: colors.cardBg,
            borderColor: colors.cardBorder,
            borderWidth: scaleMod(1),
            borderRadius: scaleMod(8),
            paddingVertical: scaleHeight(10),
            paddingHorizontal: scaleWidth(4),
            alignItems: 'center',
            justifyContent: 'center',
          }}
          onPress={onOpenSupport}
          activeOpacity={0.4}
        >
          <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6} style={[sDyn.toolTileText, { color: colors.textPri }]}>
            {t('info.support', 'SUPPORT').toUpperCase()}
          </Text>
        </BentoButton>

        {/* Card 4: Share with Friend */}
        <BentoButton
          style={{
            flex: 1,
            backgroundColor: colors.cardBg,
            borderColor: colors.cardBorder,
            borderWidth: scaleMod(1),
            borderRadius: scaleMod(8),
            paddingVertical: scaleHeight(10),
            paddingHorizontal: scaleWidth(4),
            alignItems: 'center',
            justifyContent: 'center',
          }}
          onPress={onShareApp}
          activeOpacity={0.4}
        >
          <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6} style={[sDyn.toolTileText, { color: colors.textPri }]}>
            {t('info.shareWithFriend', 'SHARE').toUpperCase()}
          </Text>
        </BentoButton>
      </View>

      {/* Row 3: Full-Width Pro Upgrade Banner at the Very Bottom */}
      <BentoButton
        style={{
          width: '100%',
          backgroundColor: (isPro || isSimulationMode) ? `${colors.purple}14` : colors.cardBg,
          borderColor: colors.purple,
          borderWidth: scaleMod(1.5),
          borderRadius: scaleMod(12),
          paddingVertical: scaleHeight(12),
          paddingHorizontal: scaleWidth(14),
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: scaleWidth(8),
        }}
        onPress={handleProPress}
        activeOpacity={0.4}
      >
        <Text
          allowFontScaling={false}
          numberOfLines={1}
          style={{
            color: colors.textPri,
            fontSize: scaleFont(11),
            fontWeight: '900',
            fontFamily: MONO,
            letterSpacing: 0.8,
          }}
        >
          {(isPro || isSimulationMode) ? t('common.proActive').toUpperCase() : t('common.freeAccount').toUpperCase()}
        </Text>
        <Text
          allowFontScaling={false}
          style={[
            sDyn.badgeText,
            {
              color: '#FFF',
              backgroundColor: colors.purple,
              paddingHorizontal: scaleMod(6),
              paddingVertical: scaleHeight(2),
              borderRadius: scaleMod(4),
            }
          ]}
        >
          {(isPro || isSimulationMode) ? 'PRO' : 'FREE'}
        </Text>
      </BentoButton>
    </View>
  );
}

const MONO = Platform.OS === 'ios' ? 'System' : 'sans-serif';
