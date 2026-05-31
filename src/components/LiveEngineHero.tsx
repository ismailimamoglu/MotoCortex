import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, Platform, TouchableOpacity, ActivityIndicator, useWindowDimensions } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, withRepeat, withSequence, Easing } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import { useBluetoothStore } from '../store/useBluetoothStore';
import { useThemeColors } from '../theme';
import { useAppStore } from '../store/useAppStore';

export default function LiveEngineHero({ onConnectPress }: { onConnectPress: () => void }) {
  const { t } = useTranslation();
  const language = useAppStore((state) => state.language);
  const colors = useThemeColors();
  const { width, height } = useWindowDimensions();

  const isSmallPhone = height < 820;
  const isTablet = width >= 600;

  // Real engine values from Bluetooth Store
  const rpm = useBluetoothStore((state) => state.rpm);
  const coolant = useBluetoothStore((state) => state.coolant);
  const voltage = useBluetoothStore((state) => state.voltage);
  const ecuStatus = useBluetoothStore((state) => state.ecuStatus);
  const status = useBluetoothStore((state) => state.status);

  const isConnected = ecuStatus === 'connected';
  const isScanning = status === 'scanning';

  // Demo mode ECT fluctuation when disconnected
  const [demoECT, setDemoECT] = useState<number>(82);
  const demoInterval = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!isConnected) {
      demoInterval.current = setInterval(() => {
        setDemoECT((prev) => {
          const delta = (Math.random() - 0.45) * 4; // slight upward bias
          const next = prev + delta;
          return Math.round(Math.min(Math.max(next, 72), 98));
        });
      }, 2000);
    } else {
      if (demoInterval.current) clearInterval(demoInterval.current);
    }
    return () => {
      if (demoInterval.current) clearInterval(demoInterval.current);
    };
  }, [isConnected]);

  // Reanimated shared values for visual tachometer gauge
  const barWidth = useSharedValue(10);

  useEffect(() => {
    const targetRpm = rpm !== null ? rpm : isConnected ? 1200 : 0;
    const pct = Math.min(Math.max((targetRpm / 9000) * 100, 8), 100);
    barWidth.value = withTiming(pct, { duration: 300, easing: Easing.out(Easing.quad) });
  }, [rpm, isConnected]);

  const animatedBarStyle = useAnimatedStyle(() => ({
    width: `${barWidth.value}%`,
  }));

  const displayRpm = rpm !== null ? rpm : isConnected ? '1200' : '----';

  // ECT: Use real coolant data when connected, demo fluctuation when disconnected
  const displayECT = coolant !== null ? coolant : isConnected ? 85 : demoECT;
  const isOverheat = typeof displayECT === 'number' && displayECT > 100;

  // Responsive Styles overrides
  const containerStyle = [
    s.heroContainer, 
    { backgroundColor: colors.cardBg, borderColor: colors.cardBorder },
    isSmallPhone && { marginVertical: 8, paddingTop: 12, borderRadius: 12, borderWidth: 1.5 }
  ];

  const gaugeTrackStyle = [
    s.gaugeTrack, 
    { backgroundColor: `${colors.textPri}0D` },
    isSmallPhone && { marginHorizontal: 16, marginBottom: 12, height: 4 }
  ];

  const mainDisplayStyle = [
    s.mainDisplay,
    isSmallPhone && { paddingHorizontal: 16, marginBottom: 12 }
  ];

  const rpmLabelStyle = [
    s.rpmLabel, 
    { color: colors.textSec },
    isSmallPhone && { fontSize: 8, letterSpacing: 1 }
  ];

  const rpmValueStyle = [
    s.rpmValue, 
    { color: colors.textPri },
    isSmallPhone && { fontSize: 36, lineHeight: 40 }
  ];

  const unitTextStyle = [
    s.unitText, 
    { color: colors.cyan },
    isSmallPhone && { fontSize: 10 }
  ];

  const dividerStyle = [
    s.divider, 
    { backgroundColor: colors.cardBorder },
    isSmallPhone && { height: 35, marginHorizontal: 8 }
  ];

  const metricLabelStyle = [
    s.metricLabel, 
    { color: colors.textSec },
    isSmallPhone && { fontSize: 8, letterSpacing: 0.5 }
  ];

  const metricValueStyle = [
    s.metricValue, 
    { color: isOverheat ? colors.red : colors.textPri },
    isSmallPhone && { fontSize: 14 }
  ];

  const footerStatusStyle = [
    s.footerStatus,
    {
      backgroundColor: isConnected ? `${colors.green}0D` : `${colors.amber}0D`,
      borderTopColor: isConnected ? `${colors.green}26` : `${colors.amber}26`,
    },
    isSmallPhone && { paddingHorizontal: 16, paddingVertical: 8 }
  ];

  const statusTextStyle = [
    s.statusText, 
    { color: isConnected ? colors.green : (isScanning ? colors.cyan : colors.amber) },
    isSmallPhone && { fontSize: 9, letterSpacing: 0.5 }
  ];

  return (
    <Animated.View style={containerStyle}>
      {/* Decorative Tachometer Arc Bar */}
      <View style={gaugeTrackStyle}>
        <Animated.View style={[s.gaugeFill, { backgroundColor: colors.cyan }, animatedBarStyle]} />
      </View>

      <View style={mainDisplayStyle}>
        <View style={s.rpmBlock}>
          <Text style={rpmLabelStyle}>{t('hub.liveTachometer')}</Text>
          <Text style={rpmValueStyle}>{displayRpm}</Text>
          <Text style={unitTextStyle}>RPM</Text>
        </View>

        <View style={dividerStyle} />

        <View style={s.secondaryMetrics}>
          {/* Engine Coolant Temperature (replaces Speed) */}
          <View style={s.metricItem}>
            <Text style={metricLabelStyle}>{t('hub.coolantTemp')}</Text>
            <Text style={metricValueStyle}>
              {displayECT}°C
            </Text>
          </View>
          <View style={s.metricItem}>
            <Text style={metricLabelStyle}>{t('dashboard.battery')}</Text>
            <Text style={[metricValueStyle, { color: colors.cyan }]}>{voltage || '12.4V'}</Text>
          </View>
        </View>
      </View>

      {/* Connection Indicator Footer inside Hero */}
      <TouchableOpacity
        style={footerStatusStyle}
        onPress={onConnectPress}
        activeOpacity={0.8}
      >
        <View style={[s.statusDot, { backgroundColor: isConnected ? colors.green : (isScanning ? colors.cyan : colors.amber) }]} />
        <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Text style={statusTextStyle}>
            {isConnected 
              ? t('dashboard.connectedDevice') 
              : isScanning ? t('hub.scanningHardware') : t('dashboard.selectDevice')}
          </Text>
          {isScanning && <ActivityIndicator size="small" color={colors.cyan} />}
        </View>
        <Text style={[s.arrow, { color: isConnected ? colors.green : (isScanning ? colors.cyan : colors.amber) }]}>›</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

const MONO = Platform.OS === 'ios' ? 'Menlo' : 'monospace';

const s = StyleSheet.create({
  heroContainer: {
    borderWidth: 2.5,
    borderRadius: 20,
    paddingTop: 24,
    overflow: 'hidden',
    marginVertical: 16,
  },
  gaugeTrack: {
    height: 6,
    marginHorizontal: 24,
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 20,
  },
  gaugeFill: {
    height: '100%',
    borderRadius: 3,
  },
  mainDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    marginBottom: 20,
  },
  rpmBlock: {
    flex: 1.2,
  },
  rpmLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 2,
    fontFamily: MONO,
  },
  rpmValue: {
    fontSize: 54,
    fontWeight: '900',
    lineHeight: 62,
    fontFamily: MONO,
  },
  unitText: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
    fontFamily: MONO,
  },
  divider: {
    width: 1,
    height: 50,
    marginHorizontal: 16,
  },
  secondaryMetrics: {
    flex: 0.8,
    gap: 10,
  },
  metricItem: {},
  metricLabel: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 1,
    fontFamily: MONO,
  },
  metricValue: {
    fontSize: 20,
    fontWeight: '900',
    fontFamily: MONO,
  },
  footerStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderTopWidth: 1,
    justifyContent: 'space-between',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 10,
  },
  statusText: {
    flex: 1,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
    fontFamily: MONO,
  },
  arrow: {
    fontSize: 16,
    fontWeight: '900',
  },
});
