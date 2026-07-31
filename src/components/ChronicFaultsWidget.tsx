import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Animated } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTelemetryStore } from '../store/useTelemetryStore';
import { useThemeColors } from '../theme';
import { useResponsive } from '../hooks/useResponsive';

export default function ChronicFaultsWidget() {
  const { t } = useTranslation();
  const tc = useThemeColors();
  const { s: scaleWidth, vs: scaleHeight, ms: scaleMod, fs: scaleFont } = useResponsive();
  const MONO = tc.mono;

  const activeSessionVehicle = useTelemetryStore((state) => state.activeSessionVehicle);
  const chronicFaults = useTelemetryStore((state) => state.chronicFaults);
  const isLoading = useTelemetryStore((state) => state.isLoadingChronicFaults);

  const pulseAnim = useRef(new Animated.Value(0.4)).current;

  // Filter chronic faults: unique_days_count > 1
  const filteredFaults = chronicFaults.filter((item) => item.unique_days_count > 1);
  const showPending = isLoading || filteredFaults.length === 0;

  useEffect(() => {
    if (showPending) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 0.4,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [showPending]);

  if (!activeSessionVehicle) {
    return null;
  }

  return (
    <View style={[
      styles.container,
      {
        backgroundColor: tc.cardBg,
        borderColor: tc.cardBorder,
        padding: scaleMod(14),
        borderRadius: scaleMod(12),
        marginBottom: scaleHeight(12),
      }
    ]}>
      {/* Title */}
      <View style={styles.headerRow}>
        <Text style={[styles.title, { color: tc.textPri, fontSize: scaleFont(11.5), fontFamily: MONO }]}>
          📊 {t('expertise.chronicFaultsTitle', 'Statistical Chronic Faults').toUpperCase()}
        </Text>
        {isLoading && <ActivityIndicator size="small" color={tc.cyan} style={{ marginStart: 6 }} />}
      </View>

      {/* Content */}
      {showPending ? (
        <Animated.View style={{ opacity: pulseAnim, gap: scaleHeight(8), marginTop: scaleHeight(8) }}>
          <Text style={[styles.pendingText, { color: tc.textSec, fontSize: scaleFont(10), fontFamily: MONO }]}>
            🔍 {t('expertise.chronicFaultsPending', 'Gathering Data Pool / Analyzing Statistics')}
          </Text>
          <View style={[styles.skeletonLine, { backgroundColor: tc.border, height: scaleHeight(8), width: '85%' }]} />
          <View style={[styles.skeletonLine, { backgroundColor: tc.border, height: scaleHeight(8), width: '60%' }]} />
        </Animated.View>
      ) : (
        <View style={{ marginTop: scaleHeight(8), gap: scaleHeight(8) }}>
          {filteredFaults.map((item, index) => (
            <View key={index} style={styles.faultRow}>
              <Text style={{ color: tc.red, fontSize: scaleFont(12) }}>⚠️</Text>
              <Text style={[styles.faultText, { color: tc.textSec, fontSize: scaleFont(10), fontFamily: MONO }]}>
                {t('expertise.chronicFaultsObs', {
                  code: item.fault_code,
                  days: item.unique_days_count,
                  total: item.total_occurrence,
                  defaultValue: `${item.fault_code} (Observation: ${item.unique_days_count} Unique Days / Total: ${item.total_occurrence} Times)`
                })}
              </Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderWidth: 1.2,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: {
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  pendingText: {
    fontWeight: '700',
  },
  skeletonLine: {
    borderRadius: 4,
    opacity: 0.5,
  },
  faultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  faultText: {
    fontWeight: '700',
    flex: 1,
  },
});
