import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, Platform, TouchableOpacity, ActivityIndicator } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, withRepeat, withSequence, Easing } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import { useBluetoothStore } from '../store/useBluetoothStore';
import { useThemeColors } from '../theme';

export default function LiveEngineHero({ onConnectPress }: { onConnectPress: () => void }) {
  const { t } = useTranslation();
  const colors = useThemeColors();

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

  // Reanimated shared values for smooth background pulse / visual tachometer gauge
  const pulse = useSharedValue(1);
  const barWidth = useSharedValue(10);

  useEffect(() => {
    pulse.value = withRepeat(
      withSequence(
        withTiming(1.05, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 1500, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
  }, []);

  useEffect(() => {
    const targetRpm = rpm !== null ? rpm : isConnected ? 1200 : 0;
    const pct = Math.min(Math.max((targetRpm / 9000) * 100, 8), 100);
    barWidth.value = withTiming(pct, { duration: 300, easing: Easing.out(Easing.quad) });
  }, [rpm, isConnected]);

  const animatedPulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }],
  }));

  const animatedBarStyle = useAnimatedStyle(() => ({
    width: `${barWidth.value}%`,
  }));

  const displayRpm = rpm !== null ? rpm : isConnected ? '1200' : '----';

  // ECT: Use real coolant data when connected, demo fluctuation when disconnected
  const displayECT = coolant !== null ? coolant : isConnected ? 85 : demoECT;
  const isOverheat = typeof displayECT === 'number' && displayECT > 100;

  return (
    <Animated.View style={[s.heroContainer, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder, shadowColor: colors.accentGlow }, animatedPulseStyle]}>
      {/* Decorative Tachometer Arc Bar */}
      <View style={[s.gaugeTrack, { backgroundColor: `${colors.textPri}0D` }]}>
        <Animated.View style={[s.gaugeFill, { backgroundColor: colors.cyan }, animatedBarStyle]} />
      </View>

      <View style={s.mainDisplay}>
        <View style={s.rpmBlock}>
          <Text style={[s.rpmLabel, { color: colors.textSec }]}>{t('hub.liveTachometer')}</Text>
          <Text style={[s.rpmValue, { color: colors.textPri }]}>{displayRpm}</Text>
          <Text style={[s.unitText, { color: colors.cyan }]}>RPM</Text>
        </View>

        <View style={[s.divider, { backgroundColor: colors.cardBorder }]} />

        <View style={s.secondaryMetrics}>
          {/* Engine Coolant Temperature (replaces Speed) */}
          <View style={s.metricItem}>
            <Text style={[s.metricLabel, { color: colors.textSec }]}>{t('hub.coolantTemp')}</Text>
            <Text style={[s.metricValue, { color: isOverheat ? colors.red : colors.textPri }]}>
              {displayECT}°C
            </Text>
          </View>
          <View style={s.metricItem}>
            <Text style={[s.metricLabel, { color: colors.textSec }]}>{t('dashboard.battery')}</Text>
            <Text style={[s.metricValue, { color: colors.cyan }]}>{voltage || '12.4V'}</Text>
          </View>
        </View>
      </View>

      {/* Connection Indicator Footer inside Hero */}
      <TouchableOpacity
        style={[
          s.footerStatus,
          {
            backgroundColor: isConnected ? `${colors.green}0D` : `${colors.amber}0D`,
            borderTopColor: isConnected ? `${colors.green}26` : `${colors.amber}26`,
          },
        ]}
        onPress={onConnectPress}
        activeOpacity={0.8}
      >
        <View style={[s.statusDot, { backgroundColor: isConnected ? colors.green : (isScanning ? colors.cyan : colors.amber) }]} />
        <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Text style={[s.statusText, { color: isConnected ? colors.green : (isScanning ? colors.cyan : colors.amber) }]}>
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
    borderWidth: 1,
    borderRadius: 20,
    paddingTop: 24,
    overflow: 'hidden',
    marginVertical: 16,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 4,
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
