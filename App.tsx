import React, { useState, useEffect, useMemo, useRef } from 'react';
import './global.css';
import { AppState, StyleSheet, Text, View, TouchableOpacity, ScrollView, SafeAreaView, StatusBar, TextInput, Platform, PermissionsAndroid, ActivityIndicator, Share, Modal, Alert, FlatList, Linking, useWindowDimensions, KeyboardAvoidingView, LogBox, Image } from 'react-native';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useBluetooth } from './src/hooks/useBluetooth';
import ChronicFaultsWidget from './src/components/ChronicFaultsWidget';
import RNBluetoothClassic from 'react-native-bluetooth-classic';
import { ADAPTER_COMMANDS } from './src/api/commands';
import { lookupDTC, prefetchDtcChunksForCodes } from './src/data/dtcDictionary';
import BatteryTestModal from './src/components/BatteryTestModal';
import FreezeFrameModal from './src/components/FreezeFrameModal';
import PerformanceModal from './src/components/PerformanceModal';
import HardwareHealthModal from './src/components/HardwareHealthModal';
import HiddenFeaturesModal from './src/components/HiddenFeaturesModal';
import { useBluetoothStore } from './src/store/useBluetoothStore';
import { saveGarageRecord, getGarageRecords, deleteGarageRecord, getRecordsByVin, GarageRecord } from './src/store/garageStore';
import i18n from './src/i18n';
import { useTranslation } from 'react-i18next';
import crashlytics from '@react-native-firebase/crashlytics';
import analytics from '@react-native-firebase/analytics';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import PermissionGateway from './src/components/PermissionGateway';
import LiveEngineHero from './src/components/LiveEngineHero';
import BentoGrid from './src/components/BentoGrid';
import SecretDebugModal from './src/components/SecretDebugModal';
import * as Clipboard from 'expo-clipboard';
import { useAppStore, checkIsProStatus, ThemeMode, AppLanguage } from './src/store/useAppStore';
import Purchases, { LOG_LEVEL } from 'react-native-purchases';
import Paywall from './src/components/Paywall';
import { useThemeColors, getTheme } from './src/theme';
import { BluetoothBridgeInitializer } from './src/components/BluetoothBridgeInitializer';
import { useResponsive } from './src/hooks/useResponsive';
import { useTelemetryStore } from './src/store/useTelemetryStore';
import { useTelemetrySync } from './src/services/TelemetrySyncManager';
import SearchableVehicleSelect from './src/components/SearchableVehicleSelect';
import { toSnakeCase, getLocalizedVehicleBrand, getLocalizedVehicleModel } from './src/utils/vehicleStandardizer';
import * as Location from 'expo-location';
import BLEBridge from './src/api/BLEBridge';
import { State } from 'react-native-ble-plx';
import CustomizeDashboardModal from './src/components/CustomizeDashboardModal';
import { useDashboardStore, ALL_SENSORS } from './src/store/useDashboardStore';
import AboutView from './src/components/AboutView';
import ObdTerminalModal from './src/components/ObdTerminalModal';
import LanguageSelectionView from './src/components/LanguageSelectionView';

const MONO = Platform.OS === 'ios' ? 'Menlo' : 'monospace';

// Guard font scaling globally to prevent OS accessibility text sizing from breaking the UI layout
if ((Text as any).defaultProps) {
  (Text as any).defaultProps.allowFontScaling = false;
} else {
  (Text as any).defaultProps = { allowFontScaling: false };
}

if ((TextInput as any).defaultProps) {
  (TextInput as any).defaultProps.allowFontScaling = false;
} else {
  (TextInput as any).defaultProps = { allowFontScaling: false };
}

// Globally suppress internal RevenueCat/StoreKit native errors from rendering 
// as red/black LogBox warning banners at the bottom of the screen.
LogBox.ignoreLogs([
  /RevenueCat/,
  /StoreKit/,
  /SSInternalErrorDomain/,
  /AppTransaction Failed/
]);

const CircularGauge = ({ sensor, value, size = 100, tc }: { sensor: any, value: any, size: number, tc: any }) => {
  const { s: scaleWidth, vs: scaleHeight, ms: scaleMod, fs: scaleFont } = useResponsive();
  
  // Parse numeric value
  const numVal = value !== null && value !== undefined ? parseFloat(String(value).replace(/[^0-9.]/g, '')) : 0;
  
  // Define ranges for standard sensors
  let min = 0;
  let max = 100;
  if (sensor.key === 'rpm') { min = 0; max = 8000; }
  else if (sensor.key === 'speed') { min = 0; max = 220; }
  else if (sensor.key === 'coolant') { min = -20; max = 120; }
  else if (sensor.key === 'voltage') { min = 9; max = 16; }
  else if (sensor.key === 'throttle') { min = 0; max = 100; }
  else if (sensor.key === 'engineLoad') { min = 0; max = 100; }
  else if (sensor.key === 'oilTemp') { min = 0; max = 150; }
  else if (sensor.key === 'fuelLevel') { min = 0; max = 100; }
  else if (sensor.key === 'manifoldPressure') { min = 0; max = 250; }
  else if (sensor.key === 'intakeAirTemp' || sensor.key === 'ambientTemp') { min = -20; max = 80; }
  
  const pct = Math.max(0, Math.min(1, (numVal - min) / (max - min)));
  // Map 0-1 to angle: -135deg (min) to +135deg (max)
  const angle = -135 + pct * 270;
  
  const displayVal = value !== null && value !== undefined ? String(value).replace(/[A-Za-z]/g, '') : '--';
  
  // Generate tick marks at 30 degree intervals (total of 10 ticks: -135, -105, -75, -45, -15, 15, 45, 75, 105, 135)
  const tickAngles = [-135, -105, -75, -45, -15, 15, 45, 75, 105, 135];
  
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      {/* Subtle background color circle */}
      <View style={{
        position: 'absolute',
        width: size - scaleMod(8),
        height: size - scaleMod(8),
        borderRadius: (size - scaleMod(8)) / 2,
        backgroundColor: `${sensor.color}05`,
      }} />

      {/* Outer Ring */}
      <View style={{
        position: 'absolute',
        width: size,
        height: size,
        borderRadius: size / 2,
        borderWidth: scaleMod(3),
        borderColor: `${sensor.color}15`,
        borderTopColor: sensor.color,
        borderLeftColor: sensor.color,
        borderRightColor: sensor.color,
        transform: [{ rotate: '-45deg' }],
      }} />

      {/* Tick Marks (Çentikler) */}
      {tickAngles.map((tickAngle, idx) => {
        // Calculate corresponding value at this tick angle
        const tickPct = (tickAngle + 135) / 270;
        const tickVal = min + tickPct * (max - min);
        const isLit = numVal >= tickVal;
        const isMajor = idx === 0 || idx === 3 || idx === 6 || idx === 9; // Ticks at -135, -45, 45, 135 are major

        return (
          <View
            key={idx}
            style={{
              position: 'absolute',
              width: isMajor ? scaleMod(1.8) : scaleMod(1),
              height: isMajor ? scaleMod(6) : scaleMod(3.5),
              backgroundColor: isLit ? sensor.color : `${sensor.color}35`,
              transform: [
                { rotate: `${tickAngle}deg` },
                { translateY: -(size / 2 - scaleMod(4.5)) }
              ]
            }}
          />
        );
      })}

      {/* Rotating Needle Container */}
      <View style={{
        position: 'absolute',
        width: size - scaleMod(20),
        height: size - scaleMod(20),
        alignItems: 'center',
        justifyContent: 'center',
        transform: [{ rotate: `${angle}deg` }]
      }}>
        {/* Sleek needle shape pointing up */}
        <View style={{
          position: 'absolute',
          top: scaleMod(4),
          width: scaleMod(2.2),
          height: (size - scaleMod(20)) / 2 - scaleMod(4),
          backgroundColor: sensor.color,
          borderTopLeftRadius: scaleMod(1.5),
          borderTopRightRadius: scaleMod(1.5),
          borderBottomLeftRadius: scaleMod(2.5),
          borderBottomRightRadius: scaleMod(2.5),
        }} />
      </View>

      {/* Center cap */}
      <View style={{
        position: 'absolute',
        width: scaleMod(11),
        height: scaleMod(11),
        borderRadius: scaleMod(5.5),
        backgroundColor: tc.textPri,
        borderWidth: 1.5,
        borderColor: tc.bg,
      }} />

      {/* Scale Numbers (Min / Max) inside the circle */}
      <Text
        allowFontScaling={false}
        style={{
          position: 'absolute',
          left: size * 0.22,
          bottom: size * 0.24,
          fontSize: scaleFont(7.5),
          fontWeight: '900',
          color: tc.textSec,
          fontFamily: MONO,
        }}
      >
        {min}
      </Text>
      <Text
        allowFontScaling={false}
        style={{
          position: 'absolute',
          right: size * 0.22,
          bottom: size * 0.24,
          fontSize: scaleFont(7.5),
          fontWeight: '900',
          color: tc.textSec,
          fontFamily: MONO,
        }}
      >
        {max}
      </Text>

      {/* Value Text Overlaid */}
      <View style={{ position: 'absolute', bottom: scaleHeight(11), alignItems: 'center' }}>
        <Text allowFontScaling={false} style={{ fontSize: scaleFont(11), fontWeight: '900', color: tc.textPri, fontFamily: MONO }}>
          {displayVal}
        </Text>
        <Text allowFontScaling={false} style={{ fontSize: scaleFont(7.5), color: tc.textSec, fontFamily: MONO, fontWeight: '700' }}>
          {sensor.unit}
        </Text>
      </View>
    </View>
  );
};

const DashboardSpeedometer = React.memo(({ ecuStatus, lastDeviceName, onGoToExpertise, onOpenHardwareHealth, onOpenCustomize, onOpenObdTerminal }: {
  ecuStatus: string;
  lastDeviceName: string | null;
  onGoToExpertise: () => void;
  onOpenHardwareHealth: () => void;
  onOpenCustomize: () => void;
  onOpenObdTerminal: () => void;
}) => {
  const { t } = useTranslation();
  const tc = useThemeColors();
  const { s: scaleWidth, vs: scaleHeight, ms: scaleMod, fs: scaleFont, isPhone, isTablet, isLargeTablet, isPortrait, height } = useResponsive();

  const isLandscape = !isPortrait;

  // Read preferences and hardware state
  const { activeSensors, layoutType } = useDashboardStore();
  const protocol = useBluetoothStore(s => s.protocol);
  const adapterCapabilityScore = useBluetoothStore(s => s.adapterCapabilityScore);
  const isCloneDevice = useBluetoothStore(s => s.isCloneDevice);

  // Read all sensor values from useBluetoothStore
  const sensorValues = {
    rpm: useBluetoothStore(s => s.rpm),
    speed: useBluetoothStore(s => s.speed),
    coolant: useBluetoothStore(s => s.coolant),
    throttle: useBluetoothStore(s => s.throttle),
    voltage: useBluetoothStore(s => s.voltage),
    engineLoad: useBluetoothStore(s => s.engineLoad),
    intakeAirTemp: useBluetoothStore(s => s.intakeAirTemp),
    manifoldPressure: useBluetoothStore(s => s.manifoldPressure),
    ambientTemp: useBluetoothStore(s => s.ambientTemp),
    oilTemp: useBluetoothStore(s => s.oilTemp),
    mafFlow: useBluetoothStore(s => s.mafFlow),
    timingAdvance: useBluetoothStore(s => s.timingAdvance),
    fuelLevel: useBluetoothStore(s => s.fuelLevel),
    catalystTemp: useBluetoothStore(s => s.catalystTemp),
  };

  const voltage = sensorValues.voltage;
  const voltNum = voltage ? parseFloat(voltage.replace('V', '')) : null;
  const isBatteryLow = voltNum !== null && voltNum < 11.8;
  const isBatteryWarn = voltNum !== null && voltNum < 12.2 && voltNum >= 11.8;

  const statusColor = (s: string) => {
    if (s === 'connected') return tc.green;
    if (s === 'connecting') return tc.amber;
    if (s === 'error') return tc.red;
    return tc.textSec;
  };

  const renderConnectionCard = () => (
    <View
      style={{
        backgroundColor: ecuStatus === 'connected' ? `${tc.green}14` : tc.card,
        borderWidth: 1.5,
        borderColor: ecuStatus === 'connected' ? tc.green : tc.border,
        borderRadius: scaleMod(12),
        padding: scaleMod(12),
        marginBottom: isTablet ? 0 : scaleHeight(10),
        flexDirection: 'column',
        gap: scaleHeight(6),
        flexShrink: 0,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: scaleMod(10) }}>
        <View style={{ width: scaleMod(8), height: scaleMod(8), borderRadius: scaleMod(4), backgroundColor: statusColor(ecuStatus) }} />
        <View style={{ flex: 1 }}>
          <Text style={{ color: tc.textPri, fontSize: scaleFont(13), fontWeight: '900', fontFamily: MONO }}>
            {ecuStatus === 'connected' ? t('dashboard.connectedDevice') : t('bento.settings.noConnection', 'Bağlantı Yok')}
          </Text>
          <Text numberOfLines={1} style={{ color: tc.textSec, fontSize: scaleFont(9.5), fontFamily: MONO, marginTop: scaleHeight(2) }}>
            {ecuStatus === 'connected' && lastDeviceName ? lastDeviceName : t('bento.settings.deviceNotConnected', 'Cihaz Bağlı Değil')}
          </Text>
        </View>
      </View>

      {/* Auto Hardware Health Info details rendered inline when connected */}
      {ecuStatus === 'connected' && (
        <View style={{
          borderTopWidth: 1,
          borderTopColor: `${tc.textPri}10`,
          paddingTop: scaleHeight(6),
          marginTop: scaleHeight(2),
          flexDirection: 'row',
          flexWrap: 'wrap',
          gap: scaleMod(6),
        }}>
          <View style={{
            flexDirection: 'row', alignItems: 'center', gap: scaleMod(4),
            backgroundColor: isCloneDevice ? `${tc.red}12` : `${tc.green}12`,
            borderRadius: scaleMod(12), paddingHorizontal: scaleMod(8), paddingVertical: scaleHeight(3),
          }}>
            <Text style={{ color: isCloneDevice ? tc.red : tc.green, fontSize: scaleFont(8.2), fontFamily: MONO, fontWeight: '800' }}>
              🛡️ {isCloneDevice ? 'CLONE ADAPTER' : 'ORIGINAL'} ({adapterCapabilityScore}/100)
            </Text>
          </View>

          {protocol && (
            <View style={{
              flexDirection: 'row', alignItems: 'center', gap: scaleMod(4),
              backgroundColor: `${tc.purple}12`,
              borderRadius: scaleMod(12), paddingHorizontal: scaleMod(8), paddingVertical: scaleHeight(3),
            }}>
              <Text style={{ color: tc.purple, fontSize: scaleFont(8.2), fontFamily: MONO, fontWeight: '800' }}>
                🔌 {protocol}
              </Text>
            </View>
          )}
        </View>
      )}
    </View>
  );

  const renderBatteryWarning = () => {
    if (isBatteryLow) {
      return (
        <View style={{ flexDirection: 'row', backgroundColor: `${tc.red}1A`, borderWidth: 1, borderColor: tc.red, borderRadius: scaleMod(6), padding: scaleMod(10), marginBottom: scaleHeight(10), gap: scaleMod(8), alignItems: 'flex-start', flexShrink: 0 }}>
          <Text style={{ color: tc.red, fontSize: scaleFont(16) }}>🚨</Text>
          <View style={{ flex: 1 }}>
            <Text style={{ color: tc.red, fontSize: scaleFont(11), fontWeight: '900', fontFamily: MONO, marginBottom: scaleHeight(2) }}>{t('dashboard.batteryLow')}</Text>
            <Text style={{ color: tc.textSec, fontSize: scaleFont(10), fontFamily: MONO, lineHeight: scaleFont(14) }}>{t('dashboard.batteryLowDesc', { voltage })}</Text>
          </View>
        </View>
      );
    }
    if (isBatteryWarn) {
      return (
        <View style={{ flexDirection: 'row', backgroundColor: `${tc.amber}1A`, borderWidth: 1, borderColor: tc.amber, borderRadius: scaleMod(6), padding: scaleMod(10), marginBottom: scaleHeight(10), gap: scaleMod(8), alignItems: 'flex-start', flexShrink: 0 }}>
          <Text style={{ color: tc.amber, fontSize: scaleFont(16) }}>⚠</Text>
          <View style={{ flex: 1 }}>
            <Text style={{ color: tc.amber, fontSize: scaleFont(11), fontWeight: '900', fontFamily: MONO, marginBottom: scaleHeight(2) }}>{t('dashboard.batteryWarn')}</Text>
            <Text style={{ color: tc.textSec, fontSize: scaleFont(10), fontFamily: MONO, lineHeight: scaleFont(14) }}>{t('dashboard.batteryWarnDesc', { voltage })}</Text>
          </View>
        </View>
      );
    }
    return null;
  };

  const getCardStyle = (index: number, total: number) => {
    let width = '100%';
    let height = scaleHeight(90);
    let valueFontSize = scaleFont(22);
    let labelFontSize = scaleFont(10);
    
    if (total === 1) {
      width = '100%';
      height = scaleHeight(150);
      valueFontSize = scaleFont(44);
      labelFontSize = scaleFont(12);
    } else if (total === 2) {
      width = '48.5%';
      height = scaleHeight(120);
      valueFontSize = scaleFont(32);
      labelFontSize = scaleFont(11);
    } else if (total === 3) {
      if (index === 0) {
        width = '100%';
        height = scaleHeight(110);
        valueFontSize = scaleFont(34);
        labelFontSize = scaleFont(11.5);
      } else {
        width = '48.5%';
        height = scaleHeight(95);
        valueFontSize = scaleFont(24);
        labelFontSize = scaleFont(10.5);
      }
    } else if (total === 4) {
      width = '48.5%';
      height = scaleHeight(95);
      valueFontSize = scaleFont(24);
      labelFontSize = scaleFont(10.5);
    } else if (total === 5) {
      if (index < 2) {
        width = '48.5%';
        height = scaleHeight(95);
        valueFontSize = scaleFont(24);
        labelFontSize = scaleFont(10.5);
      } else {
        width = '31.3%';
        height = scaleHeight(85);
        valueFontSize = scaleFont(18);
        labelFontSize = scaleFont(9.5);
      }
    } else if (total === 6) {
      width = '31.3%';
      height = scaleHeight(90);
      valueFontSize = scaleFont(18);
      labelFontSize = scaleFont(9.5);
    } else if (total === 7) {
      if (index === 0) {
        width = '100%';
        height = scaleHeight(90);
        valueFontSize = scaleFont(24);
        labelFontSize = scaleFont(10.5);
      } else {
        width = '31.3%';
        height = scaleHeight(80);
        valueFontSize = scaleFont(17);
        labelFontSize = scaleFont(9);
      }
    } else {
      // 8
      if (index < 2) {
        width = '48.5%';
        height = scaleHeight(90);
        valueFontSize = scaleFont(22);
        labelFontSize = scaleFont(10);
      } else {
        width = '31.3%';
        height = scaleHeight(80);
        valueFontSize = scaleFont(17);
        labelFontSize = scaleFont(9);
      }
    }

    if (isTablet) {
      height = height * 1.3;
      valueFontSize = valueFontSize * 1.25;
      labelFontSize = labelFontSize * 1.15;
    }

    return { width, height, valueFontSize, labelFontSize };
  };

  const formatSensorValue = (key: string, val: any) => {
    if (val === null || val === undefined) return '--';
    if (key === 'voltage') {
      return String(val).replace('V', '');
    }
    return String(val);
  };

  const getSensorStatusColor = (key: string, val: any, defaultColor: string) => {
    if (val === null || val === undefined) return defaultColor;
    const numVal = parseFloat(String(val).replace(/[^0-9.]/g, ''));
    if (isNaN(numVal)) return defaultColor;

    if (key === 'coolant' && numVal > 100) return tc.red;
    if (key === 'voltage' && numVal < 11.8) return tc.red;
    if (key === 'voltage' && numVal < 12.2) return tc.amber;
    if (key === 'oilTemp' && numVal > 115) return tc.red;
    if (key === 'fuelLevel' && numVal < 15) return tc.red;
    if (key === 'fuelLevel' && numVal < 25) return tc.amber;
    return defaultColor;
  };

  const renderSensorGrid = () => {
    const itemGap = isTablet ? scaleMod(10) : scaleMod(6);
    const activeConfigs = ALL_SENSORS.filter(s => activeSensors.includes(s.key));

    return (
      <View style={{ 
        flexDirection: 'row', 
        flexWrap: 'wrap', 
        justifyContent: 'space-between',
        rowGap: itemGap,
        marginBottom: isTablet ? 0 : scaleHeight(10),
      }}>
        {activeConfigs.map((sensor, idx) => {
          const { width, height, valueFontSize, labelFontSize } = getCardStyle(idx, activeConfigs.length);
          const rawVal = (sensorValues as any)[sensor.key];
          const displayVal = formatSensorValue(sensor.key, rawVal);
          const valColor = getSensorStatusColor(sensor.key, rawVal, sensor.color);

          return (
            <View 
              key={sensor.key}
              style={{
                width: width as any,
                height,
                backgroundColor: `${sensor.color}0a`,
                borderWidth: 1.2,
                borderColor: `${sensor.color}22`,
                borderLeftWidth: 4,
                borderLeftColor: sensor.color,
                borderRadius: scaleMod(8),
                padding: scaleMod(8),
                justifyContent: 'space-between',
              }}
            >
              {/* Header: Icon + Name */}
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: scaleMod(4) }}>
                <Text style={{ fontSize: labelFontSize * 1.2 }}>{sensor.icon}</Text>
                <Text 
                  numberOfLines={1} 
                  style={{ 
                    fontSize: labelFontSize, 
                    fontWeight: '700', 
                    color: tc.textSec, 
                    fontFamily: MONO,
                    letterSpacing: 0.5,
                    flex: 1
                  }}
                >
                  {t(sensor.nameKey, sensor.defaultName).toUpperCase()}
                </Text>
              </View>

              {/* Value + Unit */}
              <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
                <Text 
                  style={{ 
                    fontSize: valueFontSize, 
                    fontWeight: '900', 
                    color: valColor, 
                    fontFamily: MONO 
                  }}
                >
                  {displayVal}
                </Text>
                {displayVal !== '--' && (
                  <Text 
                    style={{ 
                      fontSize: labelFontSize * 1.1, 
                      fontWeight: '700', 
                      color: tc.textSec, 
                      fontFamily: MONO,
                      marginLeft: scaleMod(2) 
                    }}
                  >
                    {sensor.unit}
                  </Text>
                )}
              </View>
            </View>
          );
        })}
      </View>
    );
  };

  const renderSensorList = () => {
    const activeConfigs = ALL_SENSORS.filter(s => activeSensors.includes(s.key));
    const cardPad = isTablet ? scaleHeight(12) : scaleHeight(8);
    const itemGap = isTablet ? scaleMod(10) : scaleMod(6);

    return (
      <View style={{ 
        flexDirection: isTablet ? 'row' : 'column', 
        flexWrap: isTablet ? 'wrap' : 'nowrap',
        justifyContent: isTablet ? 'space-between' : 'flex-start',
        gap: itemGap,
        marginBottom: isTablet ? 0 : scaleHeight(10),
      }}>
        {activeConfigs.map((sensor) => {
          const rawVal = (sensorValues as any)[sensor.key];
          const displayVal = formatSensorValue(sensor.key, rawVal);
          const valColor = getSensorStatusColor(sensor.key, rawVal, sensor.color);

          return (
            <View
              key={sensor.key}
              style={{
                width: isTablet ? '48.5%' : '100%',
                backgroundColor: `${sensor.color}05`,
                borderWidth: 1.2,
                borderColor: tc.border,
                borderLeftWidth: 4,
                borderLeftColor: sensor.color,
                borderRadius: scaleMod(8),
                paddingVertical: cardPad,
                paddingHorizontal: scaleMod(12),
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              {/* Left Side: Icon & Info */}
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: scaleMod(10), flex: 1 }}>
                <Text style={{ fontSize: scaleFont(16) }}>{sensor.icon}</Text>
                <View style={{ flex: 1 }}>
                  <Text 
                    numberOfLines={1} 
                    style={{ 
                      fontSize: scaleFont(11.5), 
                      fontWeight: 'bold', 
                      color: tc.textPri 
                    }}
                  >
                    {t(sensor.nameKey, sensor.defaultName)}
                  </Text>
                  <Text 
                    style={{ 
                      fontSize: scaleFont(8.5), 
                      color: tc.textSec, 
                      fontFamily: MONO, 
                      marginTop: scaleHeight(1.5) 
                    }}
                  >
                    PID: {sensor.pid}
                  </Text>
                </View>
              </View>

              {/* Right Side: Value & Unit */}
              <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: scaleMod(3) }}>
                <Text 
                  style={{ 
                    fontSize: scaleFont(18), 
                    fontWeight: '900', 
                    color: valColor, 
                    fontFamily: MONO 
                  }}
                >
                  {displayVal}
                </Text>
                {displayVal !== '--' && (
                  <Text 
                    style={{ 
                      fontSize: scaleFont(10), 
                      fontWeight: '700', 
                      color: tc.textSec, 
                      fontFamily: MONO 
                    }}
                  >
                    {sensor.unit}
                  </Text>
                )}
              </View>
            </View>
          );
        })}
      </View>
    );
  };

  const renderSensorGauge = () => {
    const itemGap = isTablet ? scaleMod(12) : scaleMod(8);
    const activeConfigs = ALL_SENSORS.filter(s => activeSensors.includes(s.key));
    const size = isTablet ? scaleMod(130) : scaleMod(95);

    return (
      <View style={{ 
        flexDirection: 'row', 
        flexWrap: 'wrap', 
        justifyContent: 'center',
        gap: itemGap,
        marginBottom: isTablet ? 0 : scaleHeight(10),
      }}>
        {activeConfigs.map((sensor) => {
          const rawVal = (sensorValues as any)[sensor.key];
          return (
            <View 
              key={sensor.key}
              style={{
                backgroundColor: tc.card,
                borderWidth: 1.2,
                borderColor: tc.border,
                borderRadius: scaleMod(12),
                padding: scaleMod(10),
                alignItems: 'center',
                justifyContent: 'center',
                width: isTablet ? '31.3%' : '47%',
                height: size + scaleHeight(36),
              }}
            >
              <Text 
                numberOfLines={1} 
                style={{ 
                  fontSize: scaleFont(9.5), 
                  fontWeight: '700', 
                  color: tc.textSec, 
                  fontFamily: MONO,
                  letterSpacing: 0.5,
                  textAlign: 'center',
                  marginBottom: scaleHeight(4)
                }}
              >
                {t(sensor.nameKey, sensor.defaultName).toUpperCase()}
              </Text>
              
              <CircularGauge sensor={sensor} value={rawVal} size={size} tc={tc} />
            </View>
          );
        })}
      </View>
    );
  };

  const renderGoToExpertiseButton = () => (
    <TouchableOpacity
      style={{ 
        backgroundColor: tc.purple, 
        borderRadius: scaleMod(12), 
        padding: isTablet ? scaleMod(12) : scaleMod(9), 
        flexDirection: 'row', 
        alignItems: 'center', 
        justifyContent: 'center', 
        gap: isTablet ? scaleMod(10) : scaleMod(6),
        borderWidth: 1,
        borderColor: `${tc.purple}4D`,
        flexShrink: 0,
      }}
      onPress={onGoToExpertise}
    >
      <Text numberOfLines={1} style={{ color: '#FFF', fontSize: isTablet ? scaleFont(12.5) : scaleFont(10.5), fontWeight: '900', fontFamily: MONO, letterSpacing: 0.8 }}>{t('hub.goToExpertise').toUpperCase()}</Text>
      <Text style={{ color: '#FFF', fontSize: isTablet ? scaleFont(16) : scaleFont(13), fontWeight: '900' }}>{'>'}</Text>
    </TouchableOpacity>
  );

  const renderHardwareHealthButton = () => (
    <TouchableOpacity
      style={{ 
        backgroundColor: tc.card, 
        borderRadius: scaleMod(12), 
        padding: isTablet ? scaleMod(12) : scaleMod(9), 
        flexDirection: 'row', 
        alignItems: 'center', 
        justifyContent: 'center', 
        gap: isTablet ? scaleMod(10) : scaleMod(6),
        borderWidth: 1.5,
        borderColor: tc.cyan,
        flexShrink: 0,
      }}
      onPress={onOpenHardwareHealth}
    >
      <Text numberOfLines={1} style={{ color: tc.cyan, fontSize: isTablet ? scaleFont(12.5) : scaleFont(10.5), fontWeight: '900', fontFamily: MONO, letterSpacing: 0.8 }}>
        🛡️ {(isTablet ? t('bento.settings.hardwareHealth', 'DONANIM SAĞLIK BİLGİSİ') : t('bento.settings.hardwareHealthShort', 'DONANIM SAĞLIĞI')).toUpperCase()}
      </Text>
      <Text style={{ color: tc.cyan, fontSize: isTablet ? scaleFont(16) : scaleFont(13), fontWeight: '900' }}>{'>'}</Text>
    </TouchableOpacity>
  );

  const renderCustomizeButton = () => (
    <TouchableOpacity
      style={{ 
        backgroundColor: tc.card, 
        borderRadius: scaleMod(12), 
        padding: isTablet ? scaleMod(12) : scaleMod(9), 
        flexDirection: 'row', 
        alignItems: 'center', 
        justifyContent: 'center', 
        gap: isTablet ? scaleMod(10) : scaleMod(6),
        borderWidth: 1.5,
        borderColor: tc.purple,
        flexShrink: 0,
      }}
      onPress={onOpenCustomize}
    >
      <Text numberOfLines={1} style={{ color: tc.purple, fontSize: isTablet ? scaleFont(12.5) : scaleFont(10.5), fontWeight: '900', fontFamily: MONO, letterSpacing: 0.8 }}>
        ⚙️ {t('dashboard.customizeButton', 'GÖSTERGELERİ DÜZENLE').toUpperCase()}
      </Text>
      <Text style={{ color: tc.purple, fontSize: isTablet ? scaleFont(16) : scaleFont(13), fontWeight: '900' }}>{'>'}</Text>
    </TouchableOpacity>
  );

  const renderObdTerminalButton = () => (
    <TouchableOpacity
      style={{ 
        backgroundColor: tc.card, 
        borderRadius: scaleMod(12), 
        padding: isTablet ? scaleMod(12) : scaleMod(9), 
        flexDirection: 'row', 
        alignItems: 'center', 
        justifyContent: 'center', 
        gap: isTablet ? scaleMod(10) : scaleMod(6),
        borderWidth: 1.5,
        borderColor: tc.cyan,
        flexShrink: 0,
      }}
      onPress={onOpenObdTerminal}
    >
      <Text numberOfLines={1} style={{ color: tc.cyan, fontSize: isTablet ? scaleFont(12.5) : scaleFont(10.5), fontWeight: '900', fontFamily: MONO, letterSpacing: 0.8 }}>
        💬 {t('dashboard.obdTerminalTitle', 'OBD SAĞLIK & TERMİNAL').toUpperCase()}
      </Text>
      <Text style={{ color: tc.cyan, fontSize: isTablet ? scaleFont(16) : scaleFont(13), fontWeight: '900' }}>{'>'}</Text>
    </TouchableOpacity>
  );

  if (isTablet) {
    return (
      <View style={{ 
        flex: 1, 
        padding: scaleMod(16), 
        backgroundColor: tc.bg, 
        alignSelf: 'center', 
        width: '100%', 
        maxWidth: 800 
      }}>
        <ScrollView 
          showsVerticalScrollIndicator={false} 
          bounces={false}
          contentContainerStyle={{ 
            flexGrow: 1, 
            justifyContent: 'flex-start',
            gap: scaleHeight(24),
            paddingBottom: scaleHeight(40)
          }}
        >
          {/* Top Row: Connection Info + Warnings */}
          <View style={{ gap: scaleMod(10) }}>
            {renderConnectionCard()}
            {renderBatteryWarning()}
          </View>
 
          {/* Middle Row: Dynamic Grid or List */}
          <View style={{ flex: 1 }}>
            {layoutType === 'grid' ? renderSensorGrid() : layoutType === 'gauge' ? renderSensorGauge() : renderSensorList()}
          </View>
 
          {/* Bottom Row: Action/Navigation buttons side-by-side */}
          <View style={{ flexDirection: 'column', gap: scaleMod(12) }}>
            {renderCustomizeButton()}
            {renderObdTerminalButton()}
          </View>
        </ScrollView>
      </View>
    );
  }

  // 2-Column Responsive Layout for Phone in Landscape mode
  if (isPhone && isLandscape) {
    return (
      <View style={{ 
        flex: 1, 
        padding: scaleMod(12), 
        backgroundColor: tc.bg, 
        alignSelf: isLargeTablet ? 'center' : undefined, 
        width: isLargeTablet ? scaleWidth(900) : '100%', 
        maxWidth: isLargeTablet ? 900 : undefined 
      }}>
        <View style={{ flexDirection: 'row', gap: scaleMod(12), flex: 1 }}>
          {/* Left Column */}
          <View style={{ flex: 1, gap: scaleMod(10), justifyContent: 'space-between' }}>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: scaleMod(10) }} style={{ flex: 1 }} bounces={false}>
              {renderConnectionCard()}
              {renderBatteryWarning()}
            </ScrollView>
            <View style={{ gap: scaleHeight(6) }}>
              {renderCustomizeButton()}
              {renderObdTerminalButton()}
            </View>
          </View>

          {/* Right Column */}
          <ScrollView style={{ flex: 1.2 }} showsVerticalScrollIndicator={false} bounces={false}>
            {layoutType === 'grid' ? renderSensorGrid() : layoutType === 'gauge' ? renderSensorGauge() : renderSensorList()}
          </ScrollView>
        </View>
      </View>
    );
  }

  // Phone Layout (Portrait): Single column with ScrollView wrapper
  return (
    <View style={{ flex: 1, padding: scaleMod(12), backgroundColor: tc.bg }}>
      <ScrollView 
        showsVerticalScrollIndicator={false} 
        contentContainerStyle={{ flexGrow: 1, justifyContent: 'space-between', paddingBottom: scaleHeight(80) }}
        bounces={true}
        scrollEnabled={height < scaleHeight(700)}
      >
        <View>
          {renderConnectionCard()}
          {renderBatteryWarning()}
          {layoutType === 'grid' ? renderSensorGrid() : layoutType === 'gauge' ? renderSensorGauge() : renderSensorList()}
        </View>
        <View style={{ flexDirection: 'column', gap: scaleMod(12), marginTop: scaleHeight(12) }}>
          {renderCustomizeButton()}
          {renderObdTerminalButton()}
        </View>
      </ScrollView>
    </View>
  );
});

// Modal Wrappers
const BatteryTestModalWrapper = ({ visible, onClose, sendCommand }: any) => {
  const voltage = useBluetoothStore(s => s.voltage);
  return <BatteryTestModal
    visible={visible}
    onClose={onClose}
    sendCommand={sendCommand}
    voltage={voltage}
  />;
};

const PerformanceModalWrapper = ({ visible, onClose }: any) => {
  const speed = useBluetoothStore(s => s.speed);
  return <PerformanceModal
    visible={visible}
    onClose={onClose}
    speed={speed}
  />;
};

interface SettingsViewProps {
  disconnect: () => void;
  setActiveHubView: (view: 'hub' | 'vehicle' | 'sensors' | 'expertise' | 'info' | 'settings') => void;
  setIsSecretDebugVisible: (visible: boolean) => void;
  s: any;
}

const SettingsView = ({ disconnect, setActiveHubView, setIsSecretDebugVisible, s }: SettingsViewProps) => {
  const { t } = useTranslation();
  const tc = useThemeColors();
  const { s: scaleWidth, vs: scaleHeight, ms: scaleMod, fs: scaleFont, isTablet, isLargeTablet } = useResponsive();
  const [isLangModalOpen, setIsLangModalOpen] = useState(false);

  const isCompact = !isTablet;
  const connectionStatus = useBluetoothStore((state) => state.status);
  const isCloneDevice = useBluetoothStore((state) => state.isCloneDevice);
  const appUserId = useAppStore((state) => state.appUserId);
  const language = useAppStore((state) => state.language);
  const setLanguage = useAppStore((state) => state.setLanguage);
  const theme = useAppStore((state) => state.theme);
  const setTheme = useAppStore((state) => state.setTheme);

  const copyToClipboard = async () => {
    if (appUserId) {
      await Clipboard.setStringAsync(appUserId);
      Alert.alert(
        t('common.success', 'Success'),
        t('bento.settings.idCopied', 'User ID copied to clipboard.'),
        [{ text: t('common.ok', 'OK') }]
      );
    }
  };



  const themes: { label: string; value: ThemeMode; icon: string }[] = [
    { label: t('bento.settings.darkMode', 'Dark Mode'), value: 'dark', icon: '🌙' },
    { label: t('bento.settings.lightMode', 'Light Mode'), value: 'light', icon: '☀️' },
  ];

  const languagesList = [
    { label: 'English', value: 'en', flag: '🇬🇧' },
    { label: 'Deutsch', value: 'de', flag: '🇩🇪' },
    { label: 'Español', value: 'es', flag: '🇪🇸' },
    { label: 'Türkçe', value: 'tr', flag: '🇹🇷' },
    { label: 'Indonesia', value: 'id', flag: '🇮🇩' },
    { label: 'Italiano', value: 'it', flag: '🇮🇹' },
    { label: 'العربية', value: 'ar', flag: '🇸🇦' },
    { label: '简体中文', value: 'zh', flag: '🇨🇳' },
    { label: 'Dansk', value: 'da', flag: '🇩🇰' },
    { label: 'Suomi', value: 'fi', flag: '🇫🇮' },
    { label: 'Français', value: 'fr', flag: '🇫🇷' },
    { label: 'हिन्दी', value: 'hi', flag: '🇮🇳' },
    { label: 'Nederlands', value: 'nl', flag: '🇳🇱' },
    { label: '日本語', value: 'ja', flag: '🇯🇵' },
    { label: '한국어', value: 'ko', flag: '🇰🇷' },
    { label: 'Polski', value: 'pl', flag: '🇵🇱' },
    { label: 'Magyar', value: 'hu', flag: '🇭🇺' },
    { label: 'Norsk', value: 'no', flag: '🇳🇴' },
    { label: 'Português', value: 'pt', flag: '🇵🇹' },
    { label: 'Română', value: 'ro', flag: '🇷🇴' },
    { label: 'Русский', value: 'ru', flag: '🇷🇺' },
    { label: 'ไทย', value: 'th', flag: '🇹🇭' },
    { label: 'Українська', value: 'uk', flag: '🇺🇦' },
    { label: 'Ελληνικά', value: 'el', flag: '🇬🇷' },
    { label: 'Čeština', value: 'cs', flag: '🇨🇿' },
    { label: 'Svenska', value: 'sv', flag: '🇸🇪' },
  ];

  // Sort languages alphabetically by their display label
  const sortedLanguages = useMemo(() => {
    return [...languagesList].sort((a, b) => a.label.localeCompare(b.label));
  }, []);

  const currentLanguageObj = languagesList.find((l) => l.value === language) || languagesList[0];

  const tapCountRef = useRef(0);
  const tapTimerRef = useRef<NodeJS.Timeout | null>(null);

  const handleTitleTap = () => {
    tapCountRef.current += 1;
    if (tapTimerRef.current) clearTimeout(tapTimerRef.current);

    if (tapCountRef.current >= 5) {
      tapCountRef.current = 0;
      setActiveHubView('hub');
      setIsSecretDebugVisible(true);
    } else {
      tapTimerRef.current = setTimeout(() => {
        tapCountRef.current = 0;
      }, 600);
    }
  };

  const renderLeftSettings = (isCompact: boolean) => (
    <View style={{ flex: isCompact ? undefined : 1, gap: scaleHeight(12) }}>
      {/* Theme Settings Section */}
      <View style={s.panel}>
        <Text style={s.panelTitle}>{t('bento.settings.themeAppearance', 'TEMA GÖRÜNÜMÜ')}</Text>
        <View style={{ gap: scaleHeight(8) }}>
          {themes.map((item) => {
            const isActive = theme === item.value;
            return (
              <TouchableOpacity
                key={item.value}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  borderWidth: 1.2,
                  borderRadius: 12,
                  paddingVertical: scaleHeight(10),
                  paddingHorizontal: scaleWidth(14),
                  backgroundColor: `${tc.textPri}05`,
                  borderColor: isActive ? tc.cyan : `${tc.textPri}0D`,
                }}
                onPress={() => setTheme(item.value)}
                activeOpacity={0.8}
              >
                <Text style={{ fontSize: scaleFont(14), marginRight: scaleWidth(10) }}>{item.icon}</Text>
                <Text style={{ fontSize: scaleFont(12), fontWeight: '700', fontFamily: MONO, color: isActive ? tc.cyan : tc.textPri }}>
                  {item.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Language Selector Popup Section */}
      <View style={[s.panel, { zIndex: 100 }]}>
        <TouchableOpacity activeOpacity={0.8} onPress={handleTitleTap}>
          <Text style={s.panelTitle}>{t('bento.settings.language', 'DİL / LANGUAGE')}</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderWidth: 1.2,
            borderRadius: 12,
            paddingVertical: scaleHeight(12),
            paddingHorizontal: scaleWidth(14),
            backgroundColor: `${tc.textPri}05`,
            borderColor: tc.border,
          }}
          onPress={() => setIsLangModalOpen(true)}
          activeOpacity={0.8}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={{ fontSize: scaleFont(14) }}>{currentLanguageObj.flag}</Text>
            <Text style={{ fontSize: scaleFont(12), fontWeight: '700', fontFamily: MONO, color: tc.textPri }}>
              {currentLanguageObj.label}
            </Text>
          </View>
          <Text style={{ color: tc.textSec, fontSize: 10 }}>▶</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderRightSettings = (isCompact: boolean) => (
    <View style={{ flex: isCompact ? undefined : 1.2, gap: scaleHeight(12) }}>
      {/* User ID Section */}
      <View style={s.panel}>
        <Text style={s.panelTitle}>{t('bento.settings.userIdLabel', 'USER ID')}</Text>
        <View style={{ gap: scaleMod(8) }}>
          <TouchableOpacity 
            style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: scaleHeight(2) }}
            onPress={copyToClipboard}
            activeOpacity={0.7}
          >
            <Text style={{ fontSize: scaleFont(11), color: tc.textSec, fontFamily: MONO, flexShrink: 0 }}>{t('bento.settings.userIdLabel', 'User ID:')}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, flex: 1, justifyContent: 'flex-end', marginLeft: 12 }}>
              <Text style={{ fontSize: scaleFont(9.5), color: tc.cyan, fontFamily: MONO, fontWeight: '700', flexShrink: 1 }} numberOfLines={1}>
                {appUserId || t('bento.settings.none', 'None')}
              </Text>
              {!!appUserId && <Text style={{ fontSize: scaleFont(11), color: tc.cyan }}>📋</Text>}
            </View>
          </TouchableOpacity>
        </View>
      </View>


      {/* Support & Community Section */}
      {connectionStatus === 'connected' && (
        <View style={s.panel}>
          <Text style={s.panelTitle}>{t('connection.disconnect', 'BAĞLANTIYI KES').toUpperCase()}</Text>
          <View style={{ gap: scaleMod(8) }}>
            <TouchableOpacity
              style={{ flexDirection: 'row', alignItems: 'center', borderWidth: 1.2, borderRadius: 12, paddingVertical: scaleHeight(10), paddingHorizontal: scaleWidth(14), backgroundColor: `${tc.red}0D`, borderColor: tc.red }}
              onPress={() => {
                disconnect();
                setActiveHubView('hub');
              }}
              activeOpacity={0.8}
            >
              <Text style={{ fontSize: scaleFont(14), marginRight: scaleWidth(10) }}>🔌</Text>
              <Text style={{ fontSize: scaleFont(12), fontWeight: '700', fontFamily: MONO, color: tc.red }}>{t('connection.disconnect', 'BAĞLANTIYI KES')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );

  const renderLangModal = () => (
    <Modal
      visible={isLangModalOpen}
      animationType="slide"
      transparent={false}
      onRequestClose={() => setIsLangModalOpen(false)}
    >
      <View style={{ flex: 1, backgroundColor: tc.bg, paddingTop: Platform.OS === 'ios' ? 50 : 0 }}>
        <View style={{
          paddingHorizontal: scaleWidth(16),
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          height: scaleHeight(54),
          borderBottomWidth: 1,
          borderBottomColor: tc.border,
        }}>
          <TouchableOpacity onPress={() => setIsLangModalOpen(false)} style={{ padding: scaleMod(8) }}>
            <Text allowFontScaling={false} style={{ color: tc.cyan, fontSize: scaleFont(12), fontWeight: '900', fontFamily: MONO }}>
              {`← ${t('common.back', 'GERİ').toUpperCase()}`}
            </Text>
          </TouchableOpacity>
          <Text allowFontScaling={false} style={{ fontSize: scaleFont(13), fontWeight: '800', fontFamily: MONO, color: tc.textPri }}>
            {t('bento.settings.language', 'Language').toUpperCase()}
          </Text>
          <View style={{ width: scaleWidth(60) }} />
        </View>
        <LanguageSelectionView
          currentLanguage={language}
          onSelect={(val) => {
            setLanguage(val);
            setIsLangModalOpen(false);
          }}
        />
      </View>
    </Modal>
  );

  if (isTablet) {
    return (
      <View style={{ flex: 1 }}>
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: scaleWidth(16), paddingBottom: scaleHeight(24), paddingTop: scaleHeight(8), alignSelf: 'center', width: '100%', maxWidth: isLargeTablet ? 900 : undefined }}>
          <View style={{ flexDirection: 'row', gap: scaleMod(16) }}>
            {renderLeftSettings(false)}
            {renderRightSettings(false)}
          </View>
        </ScrollView>
        {renderLangModal()}
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <ScrollView style={s.tabContent} contentContainerStyle={{ paddingHorizontal: scaleWidth(16), paddingBottom: scaleHeight(40), gap: scaleHeight(12) }}>
        {renderLeftSettings(true)}
        {renderRightSettings(true)}
      </ScrollView>
      {renderLangModal()}
    </View>
  );
};

function MainApp() {
  const { t, i18n } = useTranslation();
  const { s: scaleWidth, vs: scaleHeight, ms: scaleMod, fs: scaleFont, isPhone, isTablet, isLargeTablet, isPortrait, height, width } = useResponsive();
  const isSmallPhone = height < 820;

  const activeSessionVehicle = useTelemetryStore((state) => state.activeSessionVehicle);
  const fetchChronicFaults = useTelemetryStore((state) => state.fetchChronicFaults);

  // Start background sync manager
  useTelemetrySync();

  const {
    status, adapterStatus, ecuStatus, logs,
    enableBluetooth, scanDevices, connect, disconnect,
    sendCommand, retryEcu, clearLogs,
    dtcs, vin, odometer, distanceSinceCleared, distanceMilOn,
    isDiagnosticMode, isAdaptationRunning,
    startPolling, stopPolling,
    runDiagnostics, clearDiagnostics, runAdaptationRoutine,
    lastDeviceId, lastDeviceName, isCloneDevice, connectionState,
    protocol, adapterCapabilityScore
  } = useBluetooth();

  // Reset active session telemetry details on disconnect
  useEffect(() => {
    if (ecuStatus !== 'connected') {
      // Clear runtime telemetry session keys but keep the user's selected vehicle
      useTelemetryStore.setState({ chronicFaults: [], sessionDynamicKey: null });
    }
  }, [ecuStatus]);

  // Fetch chronic faults on connection/brand changes
  useEffect(() => {
    if (ecuStatus === 'connected' && activeSessionVehicle?.brand) {
      fetchChronicFaults(activeSessionVehicle.brand);
    }
  }, [ecuStatus, activeSessionVehicle?.brand]);

  // Initialize the persistent Device UUID
  useEffect(() => {
    initializeDeviceUuid();
    try {
      crashlytics().setCrashlyticsCollectionEnabled(true);
      console.log('[App] Firebase Crashlytics collection enabled programmatically.');
    } catch (e) {
      console.warn('[App] Failed to enable Crashlytics collection:', e);
    }
  }, []);

  const [vinHistory, setVinHistory] = useState<GarageRecord[]>([]);
  const [manualVin, setManualVin] = useState('');

  const [hasShownCloneWarning, setHasShownCloneWarning] = useState(false);

  const [scannedDevices, setScannedDevices] = useState<any[]>([]);
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [isPolling, setIsPolling] = useState(false);
  const hasOnboarded = useAppStore((state) => state.hasOnboarded);
  const isPro = useAppStore((state) => state.isPro);
  const theme = useAppStore((state) => state.theme);
  const isSimulationMode = useAppStore((state) => state.isSimulationMode);
  const toggleSimulationMode = useAppStore((state) => state.toggleSimulationMode);
  const freeUsageCount = useAppStore((state) => state.freeUsageCount);
  const initializeDeviceUuid = useAppStore((state) => state.initializeDeviceUuid);
  const appUserId = useAppStore((state) => state.appUserId);
  const language = useAppStore((state) => state.language);

  // Sync language selection to i18n instance on rehydration and updates
  useEffect(() => {
    if (language) {
      i18n.changeLanguage(language);
    }
  }, [language]);

  const tapCountRef = useRef(0);
  const tapTimerRef = useRef<NodeJS.Timeout | null>(null);

  const handleLogoTap = () => {
    tapCountRef.current += 1;
    if (tapTimerRef.current) clearTimeout(tapTimerRef.current);
    
    if (tapCountRef.current >= 5) {
      setIsSecretDebugVisible(true);
      tapCountRef.current = 0;
    } else {
      tapTimerRef.current = setTimeout(() => {
        tapCountRef.current = 0;
      }, 600);
    }
  };

  const [versionTapCount, setVersionTapCount] = useState(0);
  const versionTapTimerRef = useRef<NodeJS.Timeout | null>(null);
  const handleVersionTap = () => {
    if (versionTapTimerRef.current) clearTimeout(versionTapTimerRef.current);

    const nextCount = versionTapCount + 1;
    if (nextCount >= 7) {
      const nextPro = !isPro;
      useAppStore.getState().setIsPro(nextPro);
      setVersionTapCount(0);
      Alert.alert("Dev Mode", `Pro Status: ${nextPro ? 'ACTIVE' : 'INACTIVE'}`);
    } else {
      setVersionTapCount(nextCount);
      versionTapTimerRef.current = setTimeout(() => {
        setVersionTapCount(0);
      }, 1500);
    }
  };

  const handleSupportEmail = () => {
    const siteUrl = `https://motocortex-telemetry.vercel.app/?userId=${appUserId || ''}&lang=${language}`;
    Linking.openURL(siteUrl).catch((e) => console.error('Error opening support website:', e));
  };

  const handleShareApp = async () => {
    try {
      await Share.share({
        message: t('report.shareMessage', 'Check out MotoCortex! https://motocortex.app'),
        title: 'MotoCortex'
      });
    } catch (e) { console.error(e); }
  };

  const colors = useThemeColors();
  const tc = colors;

  const s = useMemo(() => StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: tc.bg,
      paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
    },

    // ── Connection Screen ──
    connectPage: { flexGrow: 1, justifyContent: 'center', alignItems: 'center', padding: scaleMod(20) },
    logoArea: { alignItems: 'center', marginBottom: scaleHeight(24) },
    logoText: { fontSize: scaleFont(32), fontWeight: '900', color: tc.cyan, fontFamily: MONO, letterSpacing: 4 },
    logoSub: { fontSize: scaleFont(12), color: tc.textSec, fontFamily: MONO, marginTop: scaleHeight(4), letterSpacing: 6 },

    badgeRow: { flexDirection: 'row', gap: scaleMod(10), marginBottom: scaleHeight(24) },
    badge: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: scaleMod(4), paddingHorizontal: scaleWidth(10), paddingVertical: scaleHeight(5), gap: scaleMod(6) },
    badgeDot: { width: scaleMod(6), height: scaleMod(6), borderRadius: scaleMod(3) },
    badgeText: { fontSize: scaleFont(9.5), fontWeight: '800', fontFamily: MONO },

    connectActions: { width: '100%', alignItems: 'center', gap: scaleMod(10) },
    scanBtn: { backgroundColor: 'transparent', borderWidth: 2, borderColor: tc.cyan, borderRadius: scaleMod(6), paddingVertical: scaleHeight(12), paddingHorizontal: scaleWidth(32), width: '100%', alignItems: 'center' },
    scanBtnText: { color: tc.cyan, fontWeight: '900', fontSize: scaleFont(14), fontFamily: MONO, letterSpacing: 2 },
    btEnableBtn: { backgroundColor: tc.elevated, borderRadius: scaleMod(6), paddingVertical: scaleHeight(10), paddingHorizontal: scaleWidth(20), width: '100%', alignItems: 'center', borderWidth: 1, borderColor: tc.border },
    btEnableBtnText: { color: tc.textSec, fontWeight: '700', fontSize: scaleFont(11), fontFamily: MONO },

    scanningRow: { flexDirection: 'row', alignItems: 'center', gap: scaleMod(6), marginTop: scaleHeight(8) },
    scanningText: { color: tc.cyan, fontSize: scaleFont(11), fontFamily: MONO },

    deviceSection: { width: '100%', marginTop: scaleHeight(16) },
    deviceSectionTitle: { color: tc.textSec, fontSize: scaleFont(9.5), fontWeight: '800', fontFamily: MONO, marginBottom: scaleHeight(8), letterSpacing: 2 },
    deviceCard: { backgroundColor: tc.card, borderWidth: 1, borderColor: tc.border, borderRadius: scaleMod(6), padding: scaleMod(12), marginBottom: scaleHeight(8), flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    deviceName: { color: tc.textPri, fontSize: scaleFont(13), fontWeight: '700', fontFamily: MONO },
    deviceMac: { color: tc.textSec, fontSize: scaleFont(9.5), fontFamily: MONO, marginTop: scaleHeight(2) },
    connectLabel: { color: tc.cyan, fontSize: scaleFont(11), fontWeight: '800', fontFamily: MONO },
    hintText: { color: tc.textSec, fontSize: scaleFont(10), fontFamily: MONO, marginTop: scaleHeight(16), textAlign: 'center' },

    ecuConnecting: { flexDirection: 'row', alignItems: 'center', gap: scaleMod(6), marginBottom: scaleHeight(8) },
    ecuErrorText: { color: tc.red, fontSize: scaleFont(11), fontFamily: MONO, textAlign: 'center', marginBottom: scaleHeight(8) },
    retryBtn: { backgroundColor: tc.amber, borderRadius: scaleMod(6), paddingVertical: scaleHeight(10), paddingHorizontal: scaleWidth(20), width: '100%', alignItems: 'center', marginBottom: scaleHeight(8) },
    retryBtnText: { color: tc.card, fontWeight: '900', fontSize: scaleFont(12.5), fontFamily: MONO },
    disconnectBtn: { backgroundColor: 'transparent', borderWidth: 1, borderColor: tc.red, borderRadius: scaleMod(6), paddingVertical: scaleHeight(8), paddingHorizontal: scaleWidth(20), width: '100%', alignItems: 'center' },
    disconnectBtnText: { color: tc.red, fontWeight: '700', fontSize: scaleFont(11.5), fontFamily: MONO },

    topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingLeft: 16, paddingRight: 24, paddingVertical: scaleHeight(8), backgroundColor: tc.card, borderBottomWidth: 1, borderBottomColor: tc.border },
    topLeft: { flexDirection: 'row', alignItems: 'baseline', gap: scaleMod(6) },
    topLogo: { color: tc.cyan, fontSize: scaleFont(13.5), fontWeight: '900', fontFamily: MONO, letterSpacing: 1.5 },
    topVersion: { color: tc.textSec, fontSize: scaleFont(9.5), fontFamily: MONO },
    topRight: { flexDirection: 'row', alignItems: 'center', gap: 8, marginRight: 16 },
    topBadge: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: scaleMod(4), paddingHorizontal: scaleWidth(6), paddingVertical: scaleHeight(3), gap: scaleMod(4) },
    topBadgeDot: { width: scaleMod(5), height: scaleMod(5), borderRadius: scaleMod(2.5) },
    topBadgeText: { fontSize: scaleFont(8.5), fontWeight: '900', fontFamily: MONO },
    topDisconnect: { color: tc.red, fontSize: scaleFont(9.5), fontWeight: '900', fontFamily: MONO, flexShrink: 0 },

    // ── Tab Bar ──
    tabBar: { flexDirection: 'row', backgroundColor: tc.card, borderBottomWidth: 1, borderBottomColor: tc.border },
    tabItem: { flex: 1, paddingVertical: scaleHeight(10), alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
    tabItemActive: { borderBottomColor: tc.cyan },
    tabLabel: { color: tc.textSec, fontSize: scaleFont(9.5), fontWeight: '800', fontFamily: MONO, letterSpacing: 1 },
    tabLabelActive: { color: tc.cyan },

    // ── Tab Content ──
    tabContent: { flex: 1, paddingHorizontal: 0, paddingTop: scaleHeight(12) },
    tabContentInner: { paddingHorizontal: scaleWidth(14) },

    // ── Dashboard: RPM ──
    rpmHero: { alignItems: 'center', paddingVertical: scaleHeight(20), backgroundColor: tc.card, borderRadius: scaleMod(6), borderWidth: 1.2, borderColor: tc.border, marginBottom: scaleHeight(12) },
    rpmNumber: { fontSize: scaleFont(64), fontWeight: '900', color: tc.textPri, fontFamily: MONO },
    rpmUnit: { fontSize: scaleFont(12.5), fontWeight: '700', color: tc.textSec, fontFamily: MONO, marginTop: -scaleHeight(2) },

    // ── Dashboard: Sensor Grid ──
    sensorGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: scaleMod(8), marginBottom: scaleHeight(12) },
    sensorCard: { width: '48.5%', backgroundColor: tc.card, borderWidth: 1.2, borderColor: tc.border, borderRadius: scaleMod(6), paddingVertical: scaleHeight(16), alignItems: 'center' },
    sensorValue: { fontSize: scaleFont(24), fontWeight: '900', color: tc.textPri, fontFamily: MONO },
    sensorLabel: { fontSize: scaleFont(9.5), fontWeight: '700', color: tc.textSec, fontFamily: MONO, marginTop: scaleHeight(4), letterSpacing: 1.5 },

    // ── Quick Command Bar ──
    quickBar: { marginBottom: scaleHeight(12) },
    cmdRow: { flexDirection: 'row', gap: scaleMod(8), marginBottom: scaleHeight(6) },
    cmdInput: { flex: 1, backgroundColor: tc.card, borderWidth: 1.2, borderColor: tc.border, borderRadius: scaleMod(6), paddingHorizontal: scaleWidth(10), paddingVertical: scaleHeight(8), color: tc.textPri, fontFamily: MONO, fontSize: scaleFont(11.5) },
    cmdSend: { backgroundColor: tc.cyan, borderRadius: scaleMod(6), width: scaleMod(38), alignItems: 'center', justifyContent: 'center' },
    cmdSendText: { color: tc.card, fontSize: scaleFont(18), fontWeight: '900' },
    chipRow: { flexDirection: 'row', gap: scaleMod(6), flexWrap: 'wrap' },
    chip: { borderWidth: 1, borderColor: tc.cyan, borderRadius: scaleMod(6), paddingHorizontal: scaleWidth(10), paddingVertical: scaleHeight(5) },
    chipText: { color: tc.cyan, fontSize: scaleFont(9.5), fontWeight: '800', fontFamily: MONO },

    // ── Terminal ──
    terminalBox: { backgroundColor: tc.bg, borderWidth: 1, borderColor: tc.border, borderRadius: scaleMod(6), overflow: 'hidden' },
    terminalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: scaleWidth(10), paddingVertical: scaleHeight(6), backgroundColor: tc.card, borderBottomWidth: 1, borderBottomColor: tc.border },
    terminalTitle: { color: tc.textSec, fontSize: scaleFont(9.5), fontWeight: '800', fontFamily: MONO },
    terminalClear: { color: tc.cyan, fontSize: scaleFont(9.5), fontWeight: '700', fontFamily: MONO },
    terminalScroll: { maxHeight: scaleHeight(140), padding: scaleMod(8) },
    terminalLine: { color: tc.green, fontSize: scaleFont(9.5), fontFamily: MONO, lineHeight: scaleFont(14) },

    // ── Panels (Expertise/Service) ──
    panel: { backgroundColor: tc.card, borderWidth: 1, borderColor: tc.border, borderRadius: scaleMod(6), padding: scaleMod(12), marginBottom: scaleHeight(10) },
    panelHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    panelTitle: { color: tc.textSec, fontSize: scaleFont(10), fontWeight: '900', fontFamily: MONO, letterSpacing: 1, marginBottom: scaleHeight(10) },
    panelDesc: { color: tc.textSec, fontSize: scaleFont(10), fontFamily: MONO, lineHeight: scaleFont(16), marginBottom: scaleHeight(12) },

    tableRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: scaleHeight(8), borderBottomWidth: 1, borderBottomColor: tc.border },
    tableLabel: { color: tc.textSec, fontSize: scaleFont(11), fontFamily: MONO },
    tableValue: { color: tc.textPri, fontSize: scaleFont(11), fontWeight: '700', fontFamily: MONO, flex: 1, textAlign: 'right' },

    // ── Action Buttons ──
    actionBtn: { borderRadius: scaleMod(6), paddingVertical: scaleHeight(12), alignItems: 'center' },
    actionBtnText: { fontWeight: '900', fontSize: scaleFont(12), fontFamily: MONO, letterSpacing: 1 },
    actionPurple: { backgroundColor: tc.purple },
    actionCyan: { backgroundColor: tc.cyan },
    actionRed: { backgroundColor: tc.red },

    // ── Brand Selector ──
    brandScroll: { marginHorizontal: -scaleWidth(14), paddingHorizontal: scaleWidth(14) },
    brandScrollContent: { paddingRight: scaleWidth(28), gap: scaleMod(8) },
    brandChip: { backgroundColor: tc.elevated, borderWidth: 1, borderColor: tc.border, borderRadius: scaleMod(16), paddingHorizontal: scaleWidth(12), paddingVertical: scaleHeight(6) },
    brandChipActive: { backgroundColor: `${tc.cyan}1A`, borderColor: tc.cyan },
    brandChipText: { color: tc.textSec, fontSize: scaleFont(10), fontWeight: '700', fontFamily: MONO },
    brandChipTextActive: { color: tc.cyan, fontWeight: '900' },

    // ── DTC Items ──
    cleanBadge: { backgroundColor: `${tc.green}14`, borderWidth: 1, borderColor: tc.green, borderRadius: scaleMod(6), paddingVertical: scaleHeight(12), alignItems: 'center' },
    cleanBadgeText: { color: tc.green, fontWeight: '800', fontSize: scaleFont(11.5), fontFamily: MONO },
    dtcRow: { flexDirection: 'row', alignItems: 'flex-start', gap: scaleMod(8), backgroundColor: `${tc.red}14`, borderWidth: 1, borderColor: tc.red, borderRadius: scaleMod(6), paddingHorizontal: scaleWidth(12), paddingVertical: scaleHeight(10), marginBottom: scaleHeight(5) },
    dtcDot: { width: scaleMod(6), height: scaleMod(6), borderRadius: scaleMod(3), backgroundColor: tc.red, marginTop: scaleHeight(5) },
    dtcCode: { color: tc.red, fontWeight: '800', fontSize: scaleFont(13), fontFamily: MONO },

    clearBtn: { backgroundColor: `${tc.red}26`, borderRadius: scaleMod(4), paddingHorizontal: scaleWidth(10), paddingVertical: scaleHeight(3) },
    clearBtnText: { color: tc.red, fontSize: scaleFont(9.5), fontWeight: '800', fontFamily: MONO },

    // ── Warning Banner ──
    warningBanner: { flexDirection: 'row', backgroundColor: `${tc.amber}1A`, borderWidth: 1, borderColor: tc.amber, borderRadius: scaleMod(6), padding: scaleMod(12), marginBottom: scaleHeight(12), gap: scaleMod(8), alignItems: 'flex-start' },
    warningIcon: { color: tc.amber, fontSize: scaleFont(18) },
    warningTitle: { color: tc.amber, fontSize: scaleFont(11), fontWeight: '900', fontFamily: MONO, marginBottom: scaleHeight(2) },
    warningBody: { color: tc.textSec, fontSize: scaleFont(10), fontFamily: MONO, lineHeight: scaleFont(15) },

    // ── New Styles ──
    miniAction: { flex: 1, borderRadius: scaleMod(10), paddingVertical: scaleHeight(10), paddingHorizontal: scaleWidth(4), alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
    miniActionText: { fontWeight: '800', fontSize: scaleFont(10.5), fontFamily: MONO },
    saveOverlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(0,0,0,0.8)',
      justifyContent: 'center',
      padding: scaleMod(24),
      zIndex: 99999,
      elevation: 99999,
    },
    saveKeyboardContainer: {
      flex: 1,
      justifyContent: 'center',
    },
    saveContainer: {
      borderRadius: scaleMod(16),
      borderWidth: 1.5,
      padding: scaleMod(20),
      maxHeight: '90%',
    },
  }), [tc, scaleWidth, scaleHeight, scaleMod, scaleFont]);

  const verifyEntitlement = useAppStore((state) => state.verifyEntitlement);
  const fetchAppUserId = useAppStore((state) => state.fetchAppUserId);
  const [activeHubView, setActiveHubView] = useState<'hub' | 'vehicle' | 'sensors' | 'expertise' | 'info' | 'settings'>('hub');
  const [isHardwareHealthVisible, setIsHardwareHealthVisible] = useState(false);
  const [isPaywallVisible, setIsPaywallVisible] = useState(false);
  const [isSecretDebugVisible, setIsSecretDebugVisible] = useState(false);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'expertise' | 'info'>('dashboard'); // Kept for legacy fallback views compatibility
  const [isCustomizeModalVisible, setIsCustomizeModalVisible] = useState(false);
  const [isObdTerminalVisible, setIsObdTerminalVisible] = useState(false);

  // RevenueCat SDK Setup & Secure Offline Receipt Verification
  useEffect(() => {
    const initializeRevenueCat = async () => {
      try {
        const apiKey = Platform.OS === 'ios' 
          ? process.env.EXPO_PUBLIC_RC_IOS_KEY 
          : process.env.EXPO_PUBLIC_RC_ANDROID_KEY;
        
        if (apiKey) {
          // Suppress RevenueCat SDK internal logs — set to ERROR so that
          // "[RevenueCat] There was a problem..." banners never appear on screen
          // in any environment (simulator, TestFlight, or production).
          // Developers can still see critical errors in Xcode console.
          Purchases.setLogLevel(LOG_LEVEL.ERROR);

          await Purchases.configure({ apiKey });
          await verifyEntitlement();
          await fetchAppUserId();
        } else if (__DEV__) {
          console.warn("[RevenueCat] API Key missing in environment variables. Running in limited mode.");
        }
      } catch (e) {
        // Intentionally not surfacing payment infrastructure errors to the
        // user — SDK handles retries internally.
        if (__DEV__) {
          console.warn("[RevenueCat] SDK init error:", e);
        }
      }
    };
    initializeRevenueCat();
  }, []);

  // RevenueCat CustomerInfo Listener for Entitlement Revocation Security
  useEffect(() => {
    const listener = async (customerInfo: any) => {
      try {
        const bypass = await AsyncStorage.getItem('bypass_pro');
        if (bypass === 'true') {
          const expiryStr = await AsyncStorage.getItem('bypass_pro_expiry');
          if (expiryStr) {
            const expiryTime = parseInt(expiryStr, 10);
            if (!isNaN(expiryTime) && Date.now() < expiryTime) {
              useAppStore.getState().setIsPro(true);
              return;
            }
          } else {
            useAppStore.getState().setIsPro(true);
            return;
          }
        }

        const isProActive = checkIsProStatus(customerInfo);
        const { isAtomicOperationRunning, triggerPendingRevocation, flushPendingRevocation } = useBluetoothStore.getState();

        if (!isProActive) {
          if (isAtomicOperationRunning) {
            // Defer revocation since critical diagnostic/telemetry loop is running
            triggerPendingRevocation();
          } else {
            // Lock immediately
            useAppStore.getState().setIsPro(false);
            flushPendingRevocation();

            Alert.alert(
              t('common.revocationTitle', 'Abonelik Sonlandırıldı'),
              t('common.revocationMsg', 'Aboneliğiniz iptal edildiği veya iade edildiği için PRO özelliklerine erişiminiz sonlandırılmıştır.')
            );
          }
        } else {
          // Ensure status is Pro
          useAppStore.getState().setIsPro(true);
          // Clear pending revocation if subscription active
          flushPendingRevocation();
        }
      } catch (err) {
        // Silently mask listener callback exceptions
        console.error('[RevenueCat Background Error Masked]:', err);
      }
    };

    try {
      Purchases.addCustomerInfoUpdateListener(listener);
    } catch (e) {
      console.error('[RevenueCat Listener] Failed to register customer info listener:', e);
    }

    return () => {
      try {
        Purchases.removeCustomerInfoUpdateListener(listener);
      } catch (e) {
        console.error('[RevenueCat Listener] Failed to remove customer info listener:', e);
      }
    };
  }, []);

  // AppState Listener to handle foreground recovery check (AppState background blindness fix)
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      try {
        if (nextAppState === 'active') {
          const { pendingProRevocation, flushPendingRevocation } = useBluetoothStore.getState();
          if (pendingProRevocation) {
            useAppStore.getState().setIsPro(false);
            flushPendingRevocation();

            Alert.alert(
              t('common.revocationTitle', 'Abonelik Sonlandırıldı'),
              t('common.revocationMsg', 'Aboneliğiniz iptal edildiği veya iade edildiği için PRO özelliklerine erişiminiz sonlandırılmıştır.')
            );
          }
        }
      } catch (error) {
        console.error('[AppState Listener Error Masked]:', error);
      }
    });

    return () => {
      subscription.remove();
    };
  }, []);

  // Reactive view transition & atomic operation completion check for deferred revocations
  const isAtomicOperationRunning = useBluetoothStore((s) => s.isAtomicOperationRunning);
  const pendingProRevocation = useBluetoothStore((s) => s.pendingProRevocation);

  useEffect(() => {
    try {
      const shouldFlush = 
        (pendingProRevocation && !isAtomicOperationRunning) ||
        (pendingProRevocation && (activeHubView === 'hub' || activeHubView === 'info'));

      if (shouldFlush) {
        useAppStore.getState().setIsPro(false);
        useBluetoothStore.getState().flushPendingRevocation();

        Alert.alert(
          t('common.revocationTitle', 'Abonelik Sonlandırıldı'),
          t('common.revocationMsg', 'Aboneliğiniz iptal edildiği veya iade edildiği için PRO özelliklerine erişiminiz sonlandırılmıştır.')
        );
      }
    } catch (error) {
      console.error('[Revocation Checker Error Masked]:', error);
    }
  }, [isAtomicOperationRunning, activeHubView, pendingProRevocation]);

  // Garage states
  const [garageRecords, setGarageRecords] = useState<GarageRecord[]>([]);
  const [isSaveModalVisible, setIsSaveModalVisible] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<GarageRecord | null>(null);



  const handleSelectRecord = (record: GarageRecord | null) => {
    if (record && record.dtcs) {
      prefetchDtcChunksForCodes(record.dtcs);
    }
    setSelectedRecord(record);
  };

  const [isGarageStatsExpanded, setIsGarageStatsExpanded] = useState(false);
  const [expandedInfoSection, setExpandedInfoSection] = useState<string | null>(null);

  const [infoBtStatus, setInfoBtStatus] = useState<'granted' | 'denied' | 'checking'>('checking');
  const [infoLocStatus, setInfoLocStatus] = useState<'granted' | 'denied' | 'checking'>('checking');

  const checkInfoPermissions = async () => {
    try {
      let locGranted = false;
      try {
        const locRes = await Location.getForegroundPermissionsAsync();
        locGranted = locRes.status === 'granted';
      } catch (err) {
        console.warn('Error checking location permission:', err);
      }
      setInfoLocStatus(locGranted ? 'granted' : 'denied');

      let btGranted = false;
      if (Platform.OS === 'android') {
        const scan = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN);
        const connect = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT);
        btGranted = scan && connect;
      } else {
        try {
          const bleState = await BLEBridge.getHardwareState();
          btGranted = bleState === State.PoweredOn || bleState === State.PoweredOff;
        } catch (err) {
          console.warn('Error checking iOS Bluetooth state:', err);
        }
      }
      setInfoBtStatus(btGranted ? 'granted' : 'denied');
    } catch (e) {
      console.warn('Error in checkInfoPermissions:', e);
    }
  };

  useEffect(() => {
    if (activeHubView === 'info' && expandedInfoSection === 'onboarding') {
      checkInfoPermissions();
    }
  }, [activeHubView, expandedInfoSection]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active' && activeHubView === 'info' && expandedInfoSection === 'onboarding') {
        checkInfoPermissions();
      }
    });
    return () => sub.remove();
  }, [activeHubView, expandedInfoSection]);

  const [isBatteryTestVisible, setIsBatteryTestVisible] = useState(false);
  const [isFreezeFrameVisible, setIsFreezeFrameVisible] = useState(false);
  const [isPerformanceVisible, setIsPerformanceVisible] = useState(false);
  const [isHiddenFeaturesVisible, setIsHiddenFeaturesVisible] = useState(false);



  useEffect(() => { checkPermissions(); }, []);

  // Force Crashlytics & Analytics Initialization
  useEffect(() => {
    const initFirebase = async () => {
      try {
        if (!crashlytics().isCrashlyticsCollectionEnabled) {
          await crashlytics().setCrashlyticsCollectionEnabled(true);
        }
        crashlytics().log('App mounted and Crashlytics initialized');
        console.log('Crashlytics collection enabled Status:', crashlytics().isCrashlyticsCollectionEnabled);

        await analytics().setAnalyticsCollectionEnabled(true);
        await analytics().logEvent('app_open', {
          platform: Platform.OS,
          timestamp: new Date().toISOString()
        });
        console.log('[Firebase] Analytics initialized and app_open event sent.');
      } catch (e) {
        console.error('Failed to init Firebase services:', e);
      }
    };
    initFirebase();
  }, []);

  useEffect(() => {
    if (ecuStatus === 'connected' && !isPolling) {
      startPolling(); setIsPolling(true);
    } else if (ecuStatus !== 'connected' && isPolling) {
      stopPolling(); setIsPolling(false);
    }
  }, [ecuStatus]);

  // No longer blocking navigation when disconnected.
  useEffect(() => {
    if (ecuStatus === 'connected') {
      setActiveHubView('hub');
    }
  }, [ecuStatus]);

  // Load garage records
  useEffect(() => {
    getGarageRecords().then(setGarageRecords);
  }, []);

  // VIN History Check
  useEffect(() => {
    const checkHistory = async () => {
      const currentVin = vin || manualVin;
      if (currentVin && currentVin.length > 5) {
        const history = await getRecordsByVin(currentVin);
        setVinHistory(history);
      } else {
        setVinHistory([]);
      }
    };
    checkHistory();
  }, [vin, manualVin]);

  const handleSaveToGarage = async (brandId: string, modelId: string, year: number) => {
    // === SIMULATION GUARD: Never persist simulator sessions to garage ===
    if (isSimulationMode) {
      setIsSaveModalVisible(false);
      Alert.alert(
        t('common.simMode', 'Simülatör Modu'),
        t('expertise.simSaveBlocked', 'Simülatör oturumları garaja kaydedilemez. Gerçek bir araç bağlayın.')
      );
      return;
    }

    await saveGarageRecord({
      make: brandId,
      model: `${modelId} (${year})`,
      vin: vin || manualVin || t('common.unknown'),
      km: odometer === 'UNSUPPORTED' ? t('common.unsupported') : odometer !== null ? `${odometer}` : t('common.unknown'),
      dtcs: dtcs,
    });

    setIsSaveModalVisible(false);
    // Refresh records and history
    const allRecords = await getGarageRecords();
    setGarageRecords(allRecords);
    const currentVin = vin || manualVin;
    if (currentVin && currentVin.length > 5) {
      setVinHistory(await getRecordsByVin(currentVin));
    }
    Alert.alert(t('expertise.saved'), t('expertise.savedDesc'));
  };



  const checkPermissions = async () => {
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.requestMultiple([
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
        ]);
        setPermissionGranted(Object.values(granted).every(s => s === PermissionsAndroid.RESULTS.GRANTED));
      } catch (err) { console.warn(err); }
    } else { setPermissionGranted(true); }
  };

  const handleScan = async () => {
    setScannedDevices([]);

    // scanDevices() internally:
    //   1. Sets status to 'scanning'
    //   2. Handles all Android permission requests (BT + Location)
    //   3. Returns bonded OBD devices immediately, then appends discovered ones
    //   4. Resets status to 'disconnected' when done
    try {
      const devices = await scanDevices();
      if (devices.length > 0) {
        setScannedDevices(devices.map((d: any) => ({
          id: d.address || d.id,
          address: d.address || d.id,
          name: d.name || t('connection.unknownDevice'),
          rssi: d.rssi || 0,
        })));
      }
    } catch (e) {
      console.warn('[handleScan] Scan failed:', e);
    }
  };


  const guardAction = (action: () => void) => {
    if (ecuStatus !== 'connected') {
      Alert.alert(t('expertise.connRequired'), t('expertise.connRequiredDesc'));
      setActiveHubView('vehicle');
      return;
    }
    action();
  };

  const proGuardAction = (action: () => void) => {
    // Eğer kullanıcı PRO değilse VE Simülasyon modunda değilse paywall'u aç!
    if (!isPro && !isSimulationMode) {
      setIsPaywallVisible(true);
      return;
    }
    guardAction(action);
  };

  const hasFreeUsage = () => {
    return isPro || isSimulationMode || (useAppStore.getState().freeUsageCount < 3);
  };

  const handleRealConnect = (id: string, name: string) => {
    connect(id, name);
  };

  const navigateToSensors = () => {
    setActiveHubView('sensors');
  };

  const handleDiagnosticsScan = () => {
    if (!isPro && !isSimulationMode) {
      const currentCount = useAppStore.getState().freeUsageCount;
      if (currentCount >= 3) {
        setIsPaywallVisible(true);
        return;
      }
      useAppStore.getState().incrementFreeUsage();
    }
    guardAction(runDiagnostics);
  };

  const handleShareReport = async () => {
    // Dynamic i18n.t() — called at execution time to match current active language
    const { rpm, speed, coolant, throttle, engineLoad, intakeAirTemp, manifoldPressure, voltage } = useBluetoothStore.getState();
    const dtcLines = dtcs.length > 0
      ? dtcs.map(dtc => {
        const desc = lookupDTC(dtc);
        return desc ? `  • ${dtc} — ${desc}` : `  • ${dtc}`;
      }).join('\n')
      : `  ✅ ${i18n.t('report.noDtcs')}`;

    const sensorLines = [
      rpm !== null ? `  RPM: ${rpm}` : null,
      speed !== null ? `  ${i18n.t('report.speed')}: ${speed} km/h` : null,
      coolant !== null ? `  ${i18n.t('report.coolant')}: ${coolant}°C` : null,
      throttle !== null ? `  ${i18n.t('report.throttle')}: ${throttle}%` : null,
      engineLoad !== null ? `  ${i18n.t('report.engineLoad')}: ${engineLoad}%` : null,
      intakeAirTemp !== null ? `  ${i18n.t('report.intakeAir')}: ${intakeAirTemp}°C` : null,
      manifoldPressure !== null ? `  ${i18n.t('report.manifold')}: ${manifoldPressure} kPa` : null,
      voltage ? `  ${i18n.t('report.voltage')}: ${voltage}` : null,
    ].filter(Boolean).join('\n');

    const activeLang = i18n.language || 'en';
    const report = `${i18n.t('report.title')}

${i18n.t('report.vehicleIdentity')}
--------------------━━
  ${i18n.t('report.vin')}: ${vin || i18n.t('report.vinNotFound')}
  ${i18n.t('report.odometer')}: ${odometer === 'UNSUPPORTED' ? i18n.t('common.unsupported') : odometer !== null ? `${odometer} km` : i18n.t('common.unknown')}
  ${i18n.t('report.milDist')}: ${distanceMilOn !== null ? `${distanceMilOn} km` : '0 km'}
  ${i18n.t('report.distSinceCleared')}: ${distanceSinceCleared !== null ? `${distanceSinceCleared} km` : i18n.t('common.unknown')}

${i18n.t('report.dtcCount', { count: dtcs.length })}
--------------------━━
${dtcLines}

${i18n.t('report.sensorData')}
--------------------━━
${sensorLines || `  ${i18n.t('report.noData')}`}

--------------------━━
*${i18n.t('report.proApp')}*
*${i18n.t('report.date')}: ${new Date().toLocaleDateString(activeLang)} ${new Date().toLocaleTimeString(activeLang, { hour: '2-digit', minute: '2-digit' })}*`;

    try {
      await Share.share({ message: report, title: i18n.t('report.title') });
    } catch (e) {
      console.error('Report sharing failed:', e);
    }
  };

  const statusColor = (s: string) => {
    if (s === 'connected') return colors.green;
    if (s === 'connecting') return colors.amber;
    if (s === 'error') return colors.red;
    return colors.textSec;
  };

  const statusLabel = (s: string) => {
    if (s === 'connected') return t('connection.online');
    if (s === 'connecting') return t('connection.connecting');
    if (s === 'error') return t('connection.error');
    return t('connection.offline');
  };

  // ============================================================═══
  // RENDER: Connection Screen (not connected to ECU)
  // ============================================================═══
  const renderConnectionScreen = () => (
    <ScrollView contentContainerStyle={s.connectPage}>
      {/* Logo */}
      <TouchableOpacity style={s.logoArea} activeOpacity={0.8} onPress={handleLogoTap}>
        <Text style={s.logoText}>MOTOCORTEX</Text>
        <Text style={s.logoSub}>v7 PRO {isSimulationMode ? '(SIM)' : ''}</Text>
      </TouchableOpacity>

      {/* Status Badges */}
      <View style={s.badgeRow}>
        <View style={[s.badge, { borderColor: statusColor(adapterStatus) }]}>
          <View style={[s.badgeDot, { backgroundColor: statusColor(adapterStatus) }]} />
          <Text style={[s.badgeText, { color: statusColor(adapterStatus) }]}>{t('connection.adapter')}: {statusLabel(adapterStatus)}</Text>
        </View>
        <View style={[s.badge, { borderColor: statusColor(ecuStatus) }]}>
          <View style={[s.badgeDot, { backgroundColor: statusColor(ecuStatus) }]} />
          <Text style={[s.badgeText, { color: statusColor(ecuStatus) }]}>{t('connection.ecu')}: {statusLabel(ecuStatus)}</Text>
        </View>
      </View>

      {/* Actions */}
      {adapterStatus !== 'connected' ? (
        <View style={s.connectActions}>
          <TouchableOpacity style={s.scanBtn} onPress={handleScan} activeOpacity={0.4}>
            <Text style={s.scanBtnText}>*  {t('connection.scanDevices')}</Text>
          </TouchableOpacity>

          {lastDeviceId && (
            <TouchableOpacity
              style={[s.actionBtn, s.actionCyan, { marginTop: 12, width: '100%', borderRadius: 12 }, isDiagnosticMode && { opacity: 0.5 }]}
              onPress={() => handleRealConnect(lastDeviceId, lastDeviceName || 'Last Device')}
              disabled={isDiagnosticMode}
              activeOpacity={0.4}
            >
              <Text style={[s.actionBtnText, { color: tc.card }]}>↺  {t('connection.connectLast')} ({lastDeviceName})</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity style={s.btEnableBtn} onPress={() => {
            if (Platform.OS === 'ios') {
              Alert.alert(t('common.warning', 'Warning'), t('connection.iosBtManual'));
            } else {
              enableBluetooth();
            }
          }} activeOpacity={0.4}>
            <Text style={s.btEnableBtnText}>{t('connection.enableBt')}</Text>
          </TouchableOpacity>

          {status === 'scanning' && (
            <View style={s.scanningRow}>
              <ActivityIndicator color={tc.cyan} size="small" />
              <Text style={s.scanningText}>{t('connection.scanning')}</Text>
            </View>
          )}

          {scannedDevices.length > 0 && (
            <View style={s.deviceSection}>
              <Text style={s.deviceSectionTitle}>{t('connection.foundDevices')}</Text>
              {scannedDevices.map(d => (
                <TouchableOpacity key={d.address || d.id} style={s.deviceCard} onPress={() => handleRealConnect(d.address || d.id, d.name)} activeOpacity={0.3}>
                  <View>
                    <Text style={s.deviceName}>{d.name || t('connection.unknownDevice')}</Text>
                    <Text style={s.deviceMac}>{d.address}</Text>
                  </View>
                  <Text style={s.connectLabel}>{t('connection.connectLabel')} {'>'}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {scannedDevices.length === 0 && permissionGranted && status !== 'scanning' && (
            <>
              <Text style={s.hintText}>{t('connection.scanHint')}</Text>
              {Platform.OS === 'ios' ? (
                <Text style={[s.hintText, { marginTop: 10, color: tc.amber, fontSize: 10, opacity: 0.8 }]}>
                  {t('connection.iosBleOnly')}
                </Text>
              ) : (
                <Text style={[s.hintText, { marginTop: 10, color: tc.amber, fontSize: 10, opacity: 0.8 }]}>
                  {t('connection.androidClassicHint')}
                </Text>
              )}
            </>
          )}

          {/* Demo Mode Action Card */}
          <TouchableOpacity 
            style={{ 
              marginTop: 24,
              backgroundColor: isSimulationMode ? `${tc.green}14` : `${tc.cyan}14`,
              borderRadius: 20,
              borderWidth: 2.5,
              borderColor: isSimulationMode ? tc.green : tc.cyan,
              padding: 16,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 16,
              width: '100%'
            }}
            onPress={() => {
              const newMode = !isSimulationMode;
              toggleSimulationMode();
              if (newMode) {
                Alert.alert(t('common.demoMode'), t('common.demoModeDesc'));
              } else {
                disconnect();
              }
            }}
          >
            <View style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: isSimulationMode ? `${tc.green}26` : `${tc.cyan}26`, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ fontSize: 20, color: isSimulationMode ? tc.green : tc.cyan, fontWeight: '900' }}>•</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: tc.textPri, fontSize: 13, fontWeight: '900', fontFamily: MONO, letterSpacing: 1 }}>{t('common.demoMode').toUpperCase()}</Text>
              <Text style={{ color: tc.textSec, fontSize: 10, fontFamily: MONO, marginTop: 4 }}>{t('common.demoModeDesc')}</Text>
            </View>
            <View style={{ width: 40, height: 24, borderRadius: 12, backgroundColor: isSimulationMode ? tc.green : tc.textTertiary, padding: 2 }}>
              <View style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: '#FFF', alignSelf: isSimulationMode ? 'flex-end' : 'flex-start' }} />
            </View>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={s.connectActions}>
          {ecuStatus === 'connecting' && (
            <View style={{ alignItems: 'center', justifyContent: 'center', gap: 12, marginVertical: 16, width: '100%' }}>
              {adapterStatus === 'connected' && (
                <View style={{
                  backgroundColor: `${tc.green}18`,
                  borderColor: tc.green,
                  borderWidth: 1.5,
                  borderRadius: 12,
                  padding: 12,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  width: '100%',
                  marginBottom: 8
                }}>
                  <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: tc.green }} />
                  <Text style={{ color: tc.green, fontFamily: MONO, fontSize: 11, fontWeight: '900', letterSpacing: 0.5 }}>
                    ✓ {t('connection.adapterConnected', 'ADAPTÖRE BAĞLANDI (OK)').toUpperCase()}
                  </Text>
                </View>
              )}
              <ActivityIndicator size="large" color={tc.amber} />
              <Text style={{ color: tc.amber, fontFamily: MONO, fontSize: 11, fontWeight: 'bold', textAlign: 'center', lineHeight: 16 }}>
                {connectionState === 'ADAPTER_CONNECTING' && `${t('connection.ecuWait', 'ECU bağlantısı başlatılıyor, lütfen bekleyin...')} [1/5]`}
                {connectionState === 'ADAPTER_CONNECTED' && t('connection.adapterApproved', 'ADAPTÖR ONAYLANDI. YETENEKLER ANALİZ EDİLİYOR... [2/5]')}
                {connectionState === 'PROTOCOL_SCANNING' && t('connection.protocolNegotiating', 'PROTOKOL TARANIYOR & UYANDIRMA... [3/5]')}
                {connectionState === 'ECU_HANDSHAKE' && t('connection.ecuResponding', 'ECU YANIT VERDİ, BAĞLANTI TAMAMLANIYOR... [4/5]')}
                {!['ADAPTER_CONNECTING', 'ADAPTER_CONNECTED', 'PROTOCOL_SCANNING', 'ECU_HANDSHAKE'].includes(connectionState) && t('connection.ecuWait', 'ECU\'ya bağlanılıyor...')}
              </Text>
              {connectionState === 'PROTOCOL_SCANNING' && (
                <Text style={{ color: tc.textSec, fontFamily: MONO, fontSize: 9, textAlign: 'center', marginTop: 2 }}>
                  {t('connection.protocolScanningHint', '(Standart SP5, SP3, SP6, SP7 protokolleri sırayla taranıyor...)')}
                </Text>
              )}
            </View>
          )}
          {ecuStatus === 'error' && (
            <View style={{ alignItems: 'center', marginVertical: 12, gap: 10, width: '100%' }}>
              <Text style={{ color: tc.red, fontFamily: MONO, fontSize: 11, fontWeight: 'bold', textAlign: 'center', lineHeight: 15 }}>
                {connectionState === 'HARDWARE_FATAL' && `⚠️ ${t('connection.ecuNoResponse', 'ECU yanıt vermedi. Kontak açık mı?')}`}
                {connectionState !== 'HARDWARE_FATAL' && `⚠️ ${t('connection.ecuNoResponse', 'ECU yanıt vermedi. Kontak açık mı?')}`}
              </Text>
              
              <Text style={{ color: tc.textSec, fontFamily: MONO, fontSize: 10, textAlign: 'center' }}>
                {t('connection.hardwareCapabilityScore', 'Adaptör Donanım Yetenek Skoru: {{score}}/100', { score: useBluetoothStore.getState().adapterCapabilityScore })}
              </Text>

              <TouchableOpacity style={s.retryBtn} onPress={retryEcu}>
                <Text style={s.retryBtnText}>{t('connection.retry')}</Text>
              </TouchableOpacity>
            </View>
          )}
          <TouchableOpacity style={s.disconnectBtn} onPress={disconnect}>
            <Text style={s.disconnectBtnText}>{t('connection.disconnect')}</Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );

  // ============================================================═══
  // RENDER: Live Dashboard
  // ============================================================═══


  // ============================================================═══
  // RENDER: Expertise / Diagnostics Tab
  // ============================================================═══
  const renderExpertise = () => {
    // Left Column content (for phone/tablet 2-column layout)
    const renderLeftColumn = (isCompact: boolean) => {
      const panelPad = isCompact ? scaleMod(8) : scaleMod(12);
      const labelSz = isCompact ? scaleFont(9) : scaleFont(11);
      const valSz = isCompact ? scaleFont(9) : scaleFont(11);
      const titleSz = isCompact ? scaleFont(9) : scaleFont(11);
      
      return (
        <View style={{ flex: 1, gap: isCompact ? scaleHeight(8) : scaleHeight(16) }}>
          {/* VIN History Alert */}
          {vinHistory.length > 0 && (
            <View style={[s.warningBanner, { borderColor: tc.cyan, backgroundColor: `${tc.cyan}14`, padding: scaleMod(8), marginBottom: 0 }]}>
              <Text style={[s.warningIcon, { fontSize: isCompact ? scaleFont(14) : scaleFont(18) }]}>📜</Text>
              <View style={{ flex: 1 }}>
                <Text style={[s.warningTitle, { color: tc.cyan, fontSize: isCompact ? scaleFont(10) : scaleFont(12) }]}>{t('expertise.historyFound')}</Text>
                <Text numberOfLines={2} style={[s.warningBody, { color: tc.textSec, fontSize: isCompact ? scaleFont(8) : scaleFont(10) }]}>{t('expertise.historyFoundDesc', { count: vinHistory.length })}</Text>
                <TouchableOpacity onPress={() => setIsGarageStatsExpanded(true)} style={{ marginTop: scaleHeight(4) }}>
                  <Text style={{ color: tc.cyan, fontWeight: 'bold', fontSize: isCompact ? scaleFont(9) : scaleFont(11) }}>{t('expertise.viewHistory')}</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Compact Manual VIN Bar */}
          {!vin && (
            <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: tc.card, borderWidth: 1, borderColor: tc.border, borderRadius: 8, paddingHorizontal: scaleWidth(10), paddingVertical: isCompact ? scaleHeight(2) : scaleHeight(4) }}>
              <Text style={{ fontSize: isCompact ? scaleFont(11) : scaleFont(13), marginRight: scaleWidth(6) }}>🔑</Text>
              <TextInput
                style={{ flex: 1, color: tc.cyan, fontFamily: MONO, fontSize: isCompact ? scaleFont(10) : scaleFont(11), paddingVertical: scaleHeight(2) }}
                value={manualVin}
                onChangeText={setManualVin}
                placeholder={t('expertise.vinPlaceholder')}
                placeholderTextColor={tc.textSec}
              />
            </View>
          )}

          {/* Scan button */}
          <TouchableOpacity
            style={[s.actionBtn, s.actionPurple, { paddingVertical: isCompact ? scaleHeight(10) : scaleHeight(12), borderRadius: 8, marginVertical: 0 }, (isDiagnosticMode || isAdaptationRunning) && { opacity: 0.5 }]}
            onPress={handleDiagnosticsScan}
            disabled={isDiagnosticMode || isAdaptationRunning}
          >
            <Text style={[s.actionBtnText, { color: tc.card, fontSize: isCompact ? scaleFont(10) : scaleFont(12) }]}>
              {isDiagnosticMode ? t('expertise.scanning') : `🔍  ${t('expertise.startScan')}`}
            </Text>
          </TouchableOpacity>

          {/* Vehicle Identity */}
          <View style={[s.panel, { padding: panelPad, marginBottom: 0 }]}>
            <Text style={[s.panelTitle, { marginBottom: isCompact ? scaleHeight(4) : scaleHeight(8), fontSize: titleSz }]}>{t('expertise.vehicleIdentity')}</Text>
            <View style={[s.tableRow, { paddingVertical: isCompact ? scaleHeight(4) : scaleHeight(6) }]}>
              <Text style={[s.tableLabel, { fontSize: labelSz }]}>{t('expertise.vin')}</Text>
              <Text numberOfLines={1} style={[s.tableValue, { fontSize: valSz }]}>{vin || manualVin || '—'}</Text>
            </View>
            <View style={[s.tableRow, { paddingVertical: isCompact ? scaleHeight(4) : scaleHeight(6) }]}>
              <Text style={[s.tableLabel, { fontSize: labelSz }]}>{t('expertise.odometer')}</Text>
              <Text style={[s.tableValue, { fontSize: valSz }]}>{odometer === 'UNSUPPORTED' ? t('common.unsupported') : odometer !== null ? `${odometer} km` : '—'}</Text>
            </View>
            <View style={[s.tableRow, { paddingVertical: isCompact ? scaleHeight(4) : scaleHeight(6) }]}>
              <Text style={[s.tableLabel, { fontSize: labelSz }]}>{t('expertise.distSinceCleared')}</Text>
              <Text style={[s.tableValue, { fontSize: valSz }]}>{distanceSinceCleared !== null ? `${distanceSinceCleared} km` : '—'}</Text>
            </View>
            <View style={[s.tableRow, { paddingVertical: isCompact ? scaleHeight(4) : scaleHeight(6), borderBottomWidth: 0 }]}>
              <Text style={[s.tableLabel, { fontSize: labelSz }]}>{t('expertise.milDist')}</Text>
              <Text style={[s.tableValue, { fontSize: valSz }]}>{distanceMilOn !== null ? `${distanceMilOn} km` : '—'}</Text>
            </View>
          </View>

          {/* DTCs */}
          <View style={[s.panel, { padding: panelPad, marginBottom: 0 }]}>
            <View style={[s.panelHeader, { marginBottom: isCompact ? scaleHeight(4) : scaleHeight(8) }]}>
              <Text style={[s.panelTitle, { marginBottom: 0, fontSize: titleSz }]}>{t('expertise.dtcTitle')}</Text>
              {dtcs.length > 0 && (
                <TouchableOpacity onPress={() => guardAction(clearDiagnostics)} disabled={isDiagnosticMode} style={s.clearBtn}>
                  <Text style={[s.clearBtnText, { fontSize: isCompact ? scaleFont(9) : scaleFont(11) }]}>{t('common.clear')}</Text>
                </TouchableOpacity>
              )}
            </View>
            {dtcs.length === 0 ? (
              isCompact ? (
                <View style={[s.cleanBadge, { paddingVertical: scaleHeight(6) }]}>
                  <Text style={[s.cleanBadgeText, { fontSize: scaleFont(10) }]}>✓  {t('expertise.dtcClean')}</Text>
                </View>
              ) : (
                <View style={{ flex: 1, gap: scaleHeight(8), justifyContent: 'center' }}>
                  <View style={[s.cleanBadge, { paddingVertical: scaleHeight(12), marginBottom: scaleHeight(4) }]}>
                    <Text style={[s.cleanBadgeText, { fontSize: scaleFont(12) }]}>✓  {t('expertise.dtcClean')}</Text>
                  </View>
                  <Text style={{ fontSize: scaleFont(9.5), fontWeight: '800', color: tc.textSec, letterSpacing: 1.5, marginBottom: scaleHeight(4), fontFamily: MONO }}>
                    {t('expertise.scannedModules', 'TARANAN SİSTEMLER').toUpperCase()}
                  </Text>
                  <View style={{ gap: scaleHeight(6), backgroundColor: `${tc.green}0A`, borderWidth: 1, borderColor: `${tc.green}26`, borderRadius: 8, padding: scaleMod(10) }}>
                    {[
                      { name: t('expertise.moduleEngine', 'Motor Kontrol Ünitesi (ECU)'), status: 'OK' },
                      { name: t('expertise.moduleAbs', 'Fren Sistemi (ABS)'), status: 'OK' },
                      { name: t('expertise.moduleTcm', 'Şanzıman Kontrolü (TCU)'), status: 'OK' },
                      { name: t('expertise.moduleBcm', 'Gövde Elektroniği (BCM)'), status: 'OK' },
                    ].map((mod, index) => (
                      <View key={index} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Text style={{ fontSize: scaleFont(9.5), color: tc.textPri, fontFamily: MONO }}>• {mod.name}</Text>
                        <Text style={{ fontSize: scaleFont(9.5), color: tc.green, fontWeight: '800', fontFamily: MONO }}>{mod.status}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )
            ) : (
              isCompact ? (
                dtcs.map((dtc, i) => {
                  const desc = lookupDTC(dtc);
                  return (
                    <View key={i} style={[s.dtcRow, { paddingVertical: scaleHeight(8), marginBottom: 0 }]} >
                      <View style={s.dtcDot} />
                      <View style={{ flex: 1 }}>
                        <Text style={[s.dtcCode, { fontSize: scaleFont(11) }]}>{dtc}</Text>
                        {desc && <Text style={{ color: tc.red, opacity: 0.8, fontSize: scaleFont(9), fontFamily: MONO, marginTop: scaleHeight(1), paddingBottom: Platform.OS === 'ios' ? 2 : 0, lineHeight: scaleFont(12) }}>{desc}</Text>}
                      </View>
                    </View>
                  );
                })
              ) : (
                <View style={{ gap: scaleHeight(4) }}>
                  {dtcs.map((dtc, i) => {
                    const desc = lookupDTC(dtc);
                    return (
                      <View key={i} style={[s.dtcRow, { paddingVertical: scaleHeight(8), marginBottom: 0 }]} >
                        <View style={s.dtcDot} />
                        <View style={{ flex: 1 }}>
                          <Text style={[s.dtcCode, { fontSize: scaleFont(10) }]}>{dtc}</Text>
                          {desc && <Text style={{ color: tc.red, opacity: 0.8, fontSize: scaleFont(8), fontFamily: MONO, marginTop: scaleHeight(1), paddingBottom: Platform.OS === 'ios' ? 2 : 0, lineHeight: scaleFont(11) }}>{desc}</Text>}
                        </View>
                      </View>
                    );
                  })}
                </View>
              )
            )}
          </View>
        </View>
      );
    };

    // Right Column content (for phone/tablet 2-column layout)
    const renderRightColumn = (isCompact: boolean) => {
      const panelPad = isCompact ? scaleMod(8) : scaleMod(12);
      const titleSz = isCompact ? scaleFont(9) : scaleFont(11);
      
      return (
        <View style={{ flex: 1.1, gap: isCompact ? scaleHeight(8) : scaleHeight(16) }}>
          {/* Secondary Actions */}
          <View style={[s.panel, { padding: panelPad, marginBottom: 0 }]}>
            <Text style={[s.panelTitle, { marginBottom: isCompact ? scaleHeight(6) : scaleHeight(10), fontSize: titleSz }]}>{t('expertise.extraActions')}</Text>
            
            <View style={{ gap: isCompact ? scaleHeight(6) : scaleHeight(8) }}>
              {isCompact ? (
                <>
                  <View style={{ flexDirection: 'row', gap: scaleWidth(6) }}>
                    <TouchableOpacity
                      style={[s.miniAction, { flex: 1, backgroundColor: tc.purple, paddingVertical: scaleHeight(8), borderRadius: 8 }]}
                      onPress={() => proGuardAction(() => setIsFreezeFrameVisible(true))}
                    >
                      <Text style={[s.miniActionText, { color: tc.card, fontSize: scaleFont(9) }]}>❄️ {t('freeze.title')}</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[s.miniAction, { flex: 1, backgroundColor: tc.amber, paddingVertical: scaleHeight(8), borderRadius: 8 }]}
                      onPress={() => proGuardAction(() => setIsBatteryTestVisible(true))}
                    >
                      <Text style={[s.miniActionText, { color: tc.card, fontSize: scaleFont(9) }]}>⚡ {t('battery.title')}</Text>
                    </TouchableOpacity>
                  </View>

                  <View style={{ flexDirection: 'row', gap: scaleWidth(6) }}>
                    <TouchableOpacity
                      style={[s.miniAction, { flex: 1, backgroundColor: tc.cyan, paddingVertical: scaleHeight(8), borderRadius: 8 }]}
                      onPress={() => proGuardAction(() => setIsPerformanceVisible(true))}
                    >
                      <Text style={[s.miniActionText, { color: tc.card, fontSize: scaleFont(9) }]}>🏁 {t('perf.title')}</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[s.miniAction, { flex: 1, backgroundColor: tc.red, paddingVertical: scaleHeight(8), borderRadius: 8 }]}
                      onPress={() => proGuardAction(handleServiceRoutine)}
                    >
                      <Text style={[s.miniActionText, { color: tc.card, fontSize: scaleFont(9) }]}>🔧 {t('service.ecuReset')}</Text>
                    </TouchableOpacity>
                  </View>

                </>
              ) : (
                <>
                  <TouchableOpacity
                    style={[s.miniAction, { backgroundColor: tc.purple, paddingVertical: scaleHeight(11), borderRadius: 8, borderWidth: 1.5, borderColor: tc.border }]}
                    onPress={() => proGuardAction(() => setIsFreezeFrameVisible(true))}
                  >
                    <Text style={[s.miniActionText, { color: tc.card, fontSize: scaleFont(11) }]}>❄️ {t('freeze.title')}</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[s.miniAction, { backgroundColor: tc.amber, paddingVertical: scaleHeight(11), borderRadius: 8, borderWidth: 1.5, borderColor: tc.border }]}
                    onPress={() => proGuardAction(() => setIsBatteryTestVisible(true))}
                  >
                    <Text style={[s.miniActionText, { color: tc.card, fontSize: scaleFont(11) }]}>⚡ {t('battery.title')}</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[s.miniAction, { backgroundColor: tc.cyan, paddingVertical: scaleHeight(11), borderRadius: 8, borderWidth: 1.5, borderColor: tc.border }]}
                    onPress={() => proGuardAction(() => setIsPerformanceVisible(true))}
                  >
                    <Text style={[s.miniActionText, { color: tc.card, fontSize: scaleFont(11) }]}>🏁 {t('perf.title')}</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[s.miniAction, { backgroundColor: tc.red, paddingVertical: scaleHeight(11), borderRadius: 8, borderWidth: 1.5, borderColor: tc.border }]}
                    onPress={() => proGuardAction(handleServiceRoutine)}
                  >
                    <Text style={[s.miniActionText, { color: tc.card, fontSize: scaleFont(11) }]}>🔧 {t('service.ecuReset')}</Text>
                  </TouchableOpacity>

                </>
              )}
            </View>
          </View>


        </View>
      );
    };

    if (isTablet) {
      return (
        <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
          <View style={{ paddingHorizontal: scaleWidth(16), paddingBottom: scaleHeight(24), paddingTop: scaleHeight(8), alignSelf: 'center', width: '100%', maxWidth: isLargeTablet ? 900 : 720 }}>
            <View style={{ flexDirection: 'row', gap: scaleMod(16), marginBottom: scaleHeight(16) }}>
              {renderLeftColumn(false)}
              {renderRightColumn(false)}
            </View>
            <ChronicFaultsWidget />
            
          </View>
        </ScrollView>
      );
    }

    // Phone single-column scrollable layout
    return (
      <ScrollView style={s.tabContent} contentContainerStyle={{ paddingHorizontal: scaleWidth(16), paddingBottom: scaleHeight(100), gap: scaleHeight(12) }}>
        {renderLeftColumn(true)}
        {renderRightColumn(true)}
        <ChronicFaultsWidget />
      </ScrollView>
    );
  };


  // ============================================================═══
  // RENDER: Service / Adaptation Tab (Sequential Flow)
  // ============================================================═══
  const handleServiceRoutine = () => {
    guardAction(() => {
      Alert.alert(
        t('service.safetyWarning'),
        t('service.safetyWarningDesc'),
        [
          { text: t('common.cancel'), style: 'cancel' },
          {
            text: t('hub.continueBtn'),
            onPress: () => {
              Alert.alert(
                t('service.step1'),
                t('service.step1Desc'),
                [
                  { text: t('hub.cancelBtn'), style: 'cancel' },
                  {
                    text: t('service.clearCodes'),
                    style: 'destructive',
                    onPress: async () => {
                      await runAdaptationRoutine('fuel');
                      Alert.alert(
                        t('service.step2'),
                        t('service.step2Desc'),
                        [
                          { text: t('hub.skipBtn'), style: 'cancel', onPress: () => Alert.alert(t('service.completed'), t('service.completedDesc')) },
                          {
                            text: t('service.ecuReset'),
                            style: 'destructive',
                            onPress: async () => {
                              await runAdaptationRoutine('ecu');
                              Alert.alert(t('service.completed'), t('service.hardResetDesc'));
                            },
                          },
                        ]
                      );
                    },
                  },
                ]
              );
            },
          },
        ]
      );
    });
  };



  // ============================================================═══
  // RENDER: Information Tab
  // ============================================================═══
  const renderInfo = () => {
    return (
      <AboutView
        infoBtStatus={infoBtStatus}
        infoLocStatus={infoLocStatus}
        onReconfigurePermissions={() => {
          useAppStore.getState().setHasOnboarded(false);
        }}
        onAccordionToggle={(section) => {
          setExpandedInfoSection(section);
        }}
      />
    );
  };

  const renderVehicleConnectionCard = () => {
    const isConnected = ecuStatus === 'connected';
    const vehicleName = activeSessionVehicle
      ? `${getLocalizedVehicleBrand(activeSessionVehicle.brand, t)} ${getLocalizedVehicleModel(activeSessionVehicle.model)}`
      : null;

    return (
      <TouchableOpacity
        style={{
          backgroundColor: colors.card,
          borderWidth: 2.5,
          borderColor: isConnected ? colors.green : colors.cyan,
          borderRadius: scaleMod(20),
          paddingHorizontal: scaleMod(18),
          paddingVertical: scaleHeight(16),
          minHeight: scaleHeight(210),
          justifyContent: 'space-between',
          marginBottom: scaleHeight(2),
          flexDirection: 'column',
        }}
        onPress={() => setActiveHubView('vehicle')}
        activeOpacity={0.4}
      >
        {/* ── Top Row: icon + title + arrow ── */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: scaleMod(14) }}>
          <View style={{
            width: scaleMod(44),
            height: scaleMod(44),
            borderRadius: scaleMod(12),
            overflow: 'hidden',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}>
            <Image source={require('./assets/icon.png')} style={{ width: '100%', height: '100%' }} />
          </View>

          <View style={{ flex: 1 }}>
            <Text
              allowFontScaling={false}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.85}
              style={{ color: colors.textPri, fontSize: scaleFont(14.5), fontWeight: '900', fontFamily: MONO, letterSpacing: 1 }}
            >
              {t('vehicleSelect.titleMenu', 'ARAÇ & BAĞLANTI').toUpperCase()}
            </Text>
            <Text
              allowFontScaling={false}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.8}
              style={{ color: colors.textSec, fontSize: scaleFont(10), fontFamily: MONO, marginTop: scaleHeight(1) }}
            >
              {vehicleName
                ? vehicleName
                : t('vehicleSelect.selectVehiclePrompt', 'Lütfen Önce Aracı Seçin')}
            </Text>
          </View>
          <Text allowFontScaling={false} style={{ color: isConnected ? colors.green : colors.cyan, fontSize: scaleFont(20), fontWeight: '900', flexShrink: 0 }}>{'>'}</Text>
        </View>

        {/* ── Divider ── */}
        <View style={{ height: 1, backgroundColor: isConnected ? `${colors.green}30` : `${colors.cyan}25`, borderRadius: 1 }} />

        {/* ── Bottom Row: status pill + extra info chips + auto hardware health stats ── */}
        {/* ── Middle Row: status pill + extra info chips + auto hardware health stats ── */}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: scaleMod(6), marginVertical: scaleHeight(12) }}>
            {/* Connection status pill */}
            <View style={{
              flexDirection: 'row', alignItems: 'center', gap: scaleMod(4),
              backgroundColor: isConnected ? `${colors.green}18` : `${colors.red}18`,
              borderRadius: scaleMod(20), paddingHorizontal: scaleMod(9), paddingVertical: scaleHeight(4),
              flexShrink: 0,
            }}>
              <View style={{ width: scaleMod(6), height: scaleMod(6), borderRadius: scaleMod(3), backgroundColor: isConnected ? colors.green : colors.red, flexShrink: 0 }} />
              <Text allowFontScaling={false} numberOfLines={1} style={{ color: isConnected ? colors.green : colors.red, fontSize: scaleFont(9.2), fontFamily: MONO, fontWeight: '800', flexShrink: 0 }}>
                {isConnected ? t('dashboard.connectedDevice', 'BAĞLI') : t('common.disconnected', 'BAĞLI DEĞİL')}
              </Text>
            </View>

            {/* DTC chip — only when connected */}
            {isConnected && (
              <View style={{
                flexDirection: 'row', alignItems: 'center', gap: scaleMod(4),
                backgroundColor: dtcs.length > 0 ? `${colors.red}18` : `${colors.green}18`,
                borderRadius: scaleMod(20), paddingHorizontal: scaleMod(9), paddingVertical: scaleHeight(4),
                flexShrink: 0,
              }}>
                <Text allowFontScaling={false} numberOfLines={1} style={{ fontSize: scaleFont(9.2), flexShrink: 0 }}>⚠️</Text>
                <Text allowFontScaling={false} numberOfLines={1} style={{ color: dtcs.length > 0 ? colors.red : colors.green, fontSize: scaleFont(9.2), fontFamily: MONO, fontWeight: '800', flexShrink: 0 }}>
                  {dtcs.length > 0 ? `${dtcs.length} DTC` : t('bento.noDtc', 'TEMİZ')}
                </Text>
              </View>
            )}

            {/* Odometer chip */}
            {isConnected && odometer && odometer !== 'UNSUPPORTED' && (
              <View style={{
                flexDirection: 'row', alignItems: 'center', gap: scaleMod(4),
                backgroundColor: `${colors.amber}18`,
                borderRadius: scaleMod(20), paddingHorizontal: scaleMod(9), paddingVertical: scaleHeight(4),
                flexShrink: 0,
              }}>
                <Text allowFontScaling={false} numberOfLines={1} style={{ fontSize: scaleFont(9.2), flexShrink: 0 }}>🛣️</Text>
                <Text allowFontScaling={false} numberOfLines={1} style={{ color: colors.amber, fontSize: scaleFont(9.2), fontFamily: MONO, fontWeight: '800', flexShrink: 0 }}>{odometer} km</Text>
              </View>
            )}

            {/* Auto Hardware Health Info: Quality score */}
            {isConnected && (
              <View style={{
                flexDirection: 'row', alignItems: 'center', gap: scaleMod(4),
                backgroundColor: isCloneDevice ? `${colors.red}12` : `${colors.green}12`,
                borderRadius: scaleMod(20), paddingHorizontal: scaleMod(9), paddingVertical: scaleHeight(4),
                flexShrink: 0,
              }}>
                <Text allowFontScaling={false} numberOfLines={1} style={{ fontSize: scaleFont(9.2), flexShrink: 0 }}>🛡️</Text>
                <Text allowFontScaling={false} numberOfLines={1} style={{ color: isCloneDevice ? colors.red : colors.green, fontSize: scaleFont(9.2), fontFamily: MONO, fontWeight: '800', flexShrink: 0 }}>
                  {isCloneDevice ? 'CLONE' : 'ORIGINAL'} {adapterCapabilityScore}%
                </Text>
              </View>
            )}

            {/* Auto Hardware Health Info: Connected Protocol */}
            {isConnected && protocol && (
              <View style={{
                flexDirection: 'row', alignItems: 'center', gap: scaleMod(4),
                backgroundColor: `${colors.purple}12`,
                borderRadius: scaleMod(20), paddingHorizontal: scaleMod(9), paddingVertical: scaleHeight(4),
                flexShrink: 0,
              }}>
                <Text allowFontScaling={false} numberOfLines={1} style={{ fontSize: scaleFont(9.2), flexShrink: 0 }}>🔌</Text>
                <Text allowFontScaling={false} numberOfLines={1} style={{ color: colors.purple, fontSize: scaleFont(9.2), fontFamily: MONO, fontWeight: '800', flexShrink: 0 }}>{protocol}</Text>
              </View>
            )}

            {/* "Araç seç" CTA chip */}
            {!activeSessionVehicle && (
              <View style={{
                flexDirection: 'row', alignItems: 'center', gap: scaleMod(4),
                backgroundColor: `${colors.cyan}18`,
                borderRadius: scaleMod(20), paddingHorizontal: scaleMod(9), paddingVertical: scaleHeight(4),
                flexShrink: 0,
              }}>
                <Text allowFontScaling={false} numberOfLines={1} style={{ fontSize: scaleFont(9.2), flexShrink: 0 }}>🔍</Text>
                <Text allowFontScaling={false} numberOfLines={1} style={{ color: colors.cyan, fontSize: scaleFont(9.2), fontFamily: MONO, fontWeight: '800', flexShrink: 0 }}>
                  {t('vehicleSelect.selectVehicle', 'ARAÇ SEÇ')}
                </Text>
              </View>
            )}
        </View>

        {/* Dynamic Disconnect/Connect Button at the bottom of the card */}
        {isConnected ? (
          <TouchableOpacity
            style={{
              alignSelf: 'stretch',
              backgroundColor: `${colors.red}12`,
              borderColor: colors.red,
              borderWidth: 1.5,
              borderRadius: scaleMod(12),
              paddingVertical: scaleHeight(11),
              alignItems: 'center',
              justifyContent: 'center',
            }}
            onPress={(e) => {
              e.stopPropagation();
              disconnect();
            }}
            activeOpacity={0.7}
          >
            <Text 
              allowFontScaling={false} 
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.7}
              style={{ color: colors.red, fontSize: scaleFont(10.5), fontFamily: MONO, fontWeight: '900', letterSpacing: 1 }}
            >
              {t('connection.disconnect', 'BAĞLANTIYI KES').toUpperCase()}
            </Text>
          </TouchableOpacity>
        ) : (
          <View style={{ flexDirection: 'row', gap: scaleMod(8), alignSelf: 'stretch' }}>
            <TouchableOpacity
              style={{
                flex: 1,
                backgroundColor: `${colors.cyan}14`,
                borderColor: colors.cyan,
                borderWidth: 1.5,
                borderRadius: scaleMod(12),
                paddingVertical: scaleHeight(11),
                alignItems: 'center',
                justifyContent: 'center',
              }}
              onPress={(e) => {
                e.stopPropagation();
                if (Platform.OS === 'ios') {
                  Alert.alert(t('common.warning', 'Warning'), t('connection.iosBtManual'));
                } else {
                  enableBluetooth();
                }
              }}
              activeOpacity={0.7}
            >
              <Text 
                allowFontScaling={false} 
                numberOfLines={1} 
                adjustsFontSizeToFit
                minimumFontScale={0.7}
                style={{ color: colors.cyan, fontSize: scaleFont(10), fontFamily: MONO, fontWeight: '900', letterSpacing: 0.5 }}
              >
                🔵 {t('connection.enableBt', 'BLUETOOTH AÇ').toUpperCase()}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={{
                flex: 1,
                backgroundColor: colors.cyan,
                borderRadius: scaleMod(12),
                paddingVertical: scaleHeight(11),
                alignItems: 'center',
                justifyContent: 'center',
              }}
              onPress={(e) => {
                e.stopPropagation();
                setActiveHubView('vehicle');
              }}
              activeOpacity={0.7}
            >
              <Text 
                allowFontScaling={false} 
                numberOfLines={1} 
                adjustsFontSizeToFit
                minimumFontScale={0.7}
                style={{ color: colors.statusBarStyle === 'light-content' ? '#000000' : '#ffffff', fontSize: scaleFont(10), fontFamily: MONO, fontWeight: '900', letterSpacing: 0.5 }}
              >
                🔍 {t('connection.connectDevice', 'CİHAZA BAĞLAN').toUpperCase()}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </TouchableOpacity>
    );
  };


  // ===============================================================
  // MAIN RENDER (Bento Box / Glassmorphism Paradigm)
  // ===============================================================
  if (!hasOnboarded) {
    return <PermissionGateway />;
  }

  const isLightMode = theme === 'light';

  return (
    <BluetoothBridgeInitializer>
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        <SafeAreaView style={[s.root, { backgroundColor: colors.bg }]}>
        <StatusBar barStyle={colors.statusBarStyle} backgroundColor={colors.bg} />

        <View style={{ flex: 1 }}>
          {/* Top Header Bar */}
          <View style={[s.topBar, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
            <View style={s.topLeft}>
              <TouchableOpacity activeOpacity={0.8} onPress={handleLogoTap}>
                <Text style={[
                  s.topLogo,
                  {
                    color: colors.cyan,
                    fontSize: isPhone ? (isSimulationMode ? scaleFont(12) : scaleFont(13.5)) : scaleFont(14.5),
                    letterSpacing: isPhone ? 1 : 2
                  }
                ]}>MOTOCORTEX {isSimulationMode ? 'SIM' : ''}</Text>
              </TouchableOpacity>
              <View style={[s.topBadge, { borderColor: statusColor(ecuStatus) }]}>
                <View style={[s.topBadgeDot, { backgroundColor: statusColor(ecuStatus) }]} />
                <Text style={[s.topBadgeText, { color: statusColor(ecuStatus) }]}>
                  {isPhone ? "BLE" : (ecuStatus === 'connected' ? t('hub.bleConnected') : t('hub.bleIdle'))}
                </Text>
              </View>
            </View>
            <View style={s.topRight}>
              <TouchableOpacity 
                activeOpacity={0.7}
                onPress={() => (isPro || isSimulationMode) ? Alert.alert(t('common.proActive'), t('common.proActiveDesc')) : setIsPaywallVisible(true)}
                style={{ backgroundColor: `${colors.purple}1F`, borderWidth: 1, borderColor: colors.purple, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 }}
              >
                <Text style={{ color: `${colors.purple}CC`, fontSize: 10, fontWeight: '900', fontFamily: MONO }}>👑 PRO</Text>
              </TouchableOpacity>
              {ecuStatus === 'connected' && (
                <TouchableOpacity 
                  onPress={() => disconnect()} 
                  style={{ 
                    paddingHorizontal: 8, 
                    paddingVertical: 4, 
                    backgroundColor: `${colors.red}1F`, 
                    borderRadius: 12, 
                    borderWidth: 1, 
                    borderColor: colors.red 
                  }}
                >
                  <Text style={[s.topDisconnect, { color: colors.red }]}>
                    {isPhone ? t('connection.disconnectShort').toUpperCase() : t('connection.disconnect').toUpperCase()}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
        </View>

        {isCloneDevice && ecuStatus === 'connected' && (
          <View style={{
            backgroundColor: `${colors.amber}1A`,
            borderBottomWidth: 1,
            borderBottomColor: colors.amber,
            paddingVertical: 8,
            paddingHorizontal: 16,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
          }}>
            <Text style={{
              color: colors.amber,
              fontFamily: MONO,
              fontSize: 11,
              fontWeight: 'bold',
              textAlign: 'center',
            }}>
              ⚠️ {t('connection.safeModeActive')}
            </Text>
          </View>
        )}

        {/* Central Hub View vs Sub-Views */}
        {activeHubView === 'hub' ? (
          isTablet ? (
            <ScrollView
              style={{ flex: 1 }}
              contentContainerStyle={{
                flexGrow: 1,
                paddingHorizontal: scaleWidth(16),
                paddingTop: scaleHeight(8),
                alignSelf: 'center',
                width: '100%',
                maxWidth: 720,
                justifyContent: 'space-between',
                paddingBottom: scaleHeight(24)
              }}
              showsVerticalScrollIndicator={false}
            >
              <View style={{ width: '100%', gap: scaleHeight(12), marginTop: scaleHeight(8) }}>
                {renderVehicleConnectionCard()}

                <View style={{ marginTop: scaleHeight(4) }}>
                  <Text style={{ fontSize: scaleFont(12), fontWeight: '800', color: colors.textSec, letterSpacing: 2, marginBottom: scaleHeight(8), marginTop: scaleHeight(2), fontFamily: MONO }}>
                    {t('hub.controlHub').toUpperCase()}
                  </Text>
                  <BentoGrid
                    onOpenDiagnostics={() => setActiveHubView('expertise')}
                    onOpenSensors={() => navigateToSensors()}
                    onOpenProfile={() => setActiveHubView('info')}
                    onOpenSettings={() => setActiveHubView('settings')}
                    onOpenPaywall={() => setIsPaywallVisible(true)}
                    onOpenSupport={handleSupportEmail}
                    onShareApp={handleShareApp}
                    onDisconnect={disconnect}
                  />
                </View>
              </View>

              {/* Version and Disclaimer at main dashboard bottom */}
              <View style={{ alignItems: 'center', marginTop: scaleHeight(20), gap: scaleHeight(4), width: '100%' }}>
                <TouchableOpacity onPress={handleVersionTap} activeOpacity={0.8}>
                  <Text style={{
                    color: colors.textSec,
                    fontFamily: MONO,
                    fontSize: scaleFont(8),
                    fontWeight: '700',
                    textAlign: 'center',
                  }}>
                    MotoCortex v2.0.0 (1) {isPro ? 'PRO' : 'FREE'}
                  </Text>
                </TouchableOpacity>
                <Text style={{
                  color: colors.textSec,
                  fontFamily: MONO,
                  fontSize: scaleFont(7),
                  textAlign: 'center',
                  opacity: 0.65,
                  lineHeight: scaleFont(11),
                  paddingHorizontal: scaleWidth(20),
                }}>
                  {t('disclaimer')}
                </Text>
              </View>
            </ScrollView>
          ) : (
            <ScrollView
              style={{ flex: 1 }}
              contentContainerStyle={{
                flexGrow: 1,
                paddingHorizontal: scaleWidth(16),
                paddingBottom: isSmallPhone ? scaleHeight(8) : scaleHeight(16),
                paddingTop: isSmallPhone ? scaleHeight(2) : scaleHeight(8),
                justifyContent: 'space-between',
              }}
              showsVerticalScrollIndicator={false}
            >
              <View style={{ width: '100%', gap: scaleHeight(12), marginTop: scaleHeight(8) }}>
                {renderVehicleConnectionCard()}

                <View style={{ width: '100%' }}>
                  <Text style={{ fontSize: isSmallPhone ? scaleFont(9) : scaleFont(11), fontWeight: '800', color: colors.textSec, letterSpacing: 2, marginBottom: scaleHeight(6), fontFamily: MONO }}>
                    {t('hub.controlHub').toUpperCase()}
                  </Text>
                  <BentoGrid
                    onOpenDiagnostics={() => setActiveHubView('expertise')}
                    onOpenSensors={() => navigateToSensors()}
                    onOpenProfile={() => setActiveHubView('info')}
                    onOpenSettings={() => setActiveHubView('settings')}
                    onOpenPaywall={() => setIsPaywallVisible(true)}
                    onOpenSupport={handleSupportEmail}
                    onShareApp={handleShareApp}
                    onDisconnect={disconnect}
                  />
                </View>
              </View>

              {/* 3. Version and Disclaimer at main dashboard bottom */}
              <View style={{ alignItems: 'center', gap: scaleHeight(2), width: '100%' }}>
                <TouchableOpacity onPress={handleVersionTap} activeOpacity={0.8}>
                  <Text style={{
                    color: colors.textSec,
                    fontFamily: MONO,
                    fontSize: scaleFont(7.5),
                    fontWeight: '700',
                    textAlign: 'center',
                  }}>
                    MotoCortex v2.0.0 (1) {isPro ? 'PRO' : 'FREE'}
                  </Text>
                </TouchableOpacity>
                <Text style={{
                  color: colors.textSec,
                  fontFamily: MONO,
                  fontSize: scaleFont(6.8),
                  textAlign: 'center',
                  opacity: 0.65,
                  lineHeight: scaleFont(10),
                  paddingHorizontal: scaleWidth(10),
                }}>
                  {t('disclaimer')}
                </Text>
              </View>
            </ScrollView>
          )
        ) : (
          <View style={{ flex: 1 }}>
            {/* Prominent Hub Navigation Header */}
            <TouchableOpacity
              style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: colors.card, borderBottomWidth: 1, borderBottomColor: colors.border, gap: 8 }}
              onPress={() => setActiveHubView('hub')}
              activeOpacity={0.8}
            >
              <Text style={{ color: colors.cyan, fontSize: 18, fontWeight: '900' }}>←</Text>
              <Text style={{ color: colors.textPri, fontSize: 13, fontWeight: '800', fontFamily: MONO }}>
                {t('hub.backToHub')}
              </Text>
              <Text style={{ color: colors.textSec, fontSize: 11, fontFamily: MONO, marginLeft: 'auto' }}>
                {activeHubView === 'sensors' ? t('hub.liveSensorsView') : activeHubView === 'expertise' ? t('hub.diagnosticsView') : activeHubView === 'settings' ? t('bento.quickSettings') : activeHubView === 'vehicle' ? t('vehicleSelect.titleMenu', 'Araç & Bağlantı') : t('hub.vehicleProfileView')}
              </Text>
            </TouchableOpacity>

            {/* Sub-view Content */}
            <View style={{ flex: 1 }}>
              {activeHubView === 'sensors' && (
                <DashboardSpeedometer 
                  ecuStatus={ecuStatus} 
                  lastDeviceName={lastDeviceName} 
                  onGoToExpertise={() => setActiveHubView('expertise')}
                  onOpenHardwareHealth={() => setIsHardwareHealthVisible(true)}
                  onOpenCustomize={() => setIsCustomizeModalVisible(true)}
                  onOpenObdTerminal={() => setIsObdTerminalVisible(true)}
                />
              )}
              {activeHubView === 'expertise' && renderExpertise()}
              {activeHubView === 'info' && renderInfo()}
              {activeHubView === 'settings' && (
                <SettingsView
                  disconnect={disconnect}
                  setActiveHubView={setActiveHubView}
                  setIsSecretDebugVisible={setIsSecretDebugVisible}
                  s={s}
                />
              )}
              {activeHubView === 'vehicle' && (
                <LiveEngineHero
                  onConnectPress={() => {
                    const isConnected = ecuStatus === 'connected';
                    if (isConnected) {
                      disconnect();
                    } else {
                      setActiveHubView('vehicle');
                    }
                  }}
                  onGoToSensors={() => navigateToSensors()}
                  onGoToExpertise={() => setActiveHubView('expertise')}
                  status={status}
                  connectionState={connectionState}
                  ecuStatus={ecuStatus}
                  adapterStatus={adapterStatus}
                  scannedDevices={scannedDevices}
                  handleScan={handleScan}
                  handleRealConnect={handleRealConnect}
                  disconnect={disconnect}
                  enableBluetooth={enableBluetooth}
                  lastDeviceId={lastDeviceId}
                  lastDeviceName={lastDeviceName}
                  retryEcu={retryEcu}
                  permissionGranted={permissionGranted}
                />
              )}
            </View>
          </View>
        )}



        {/* Save to Garage Overlay */}
        {isSaveModalVisible && (
          <View style={s.saveOverlay}>
            <KeyboardAvoidingView 
              behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
              style={s.saveKeyboardContainer}
            >
              <View style={[s.saveContainer, { backgroundColor: colors.bg, borderColor: colors.border }]}>
                <Text style={{ color: colors.textPri, fontSize: 16, fontWeight: '800', fontFamily: MONO, marginBottom: 16, textAlign: 'center' }}>
                  {t('common.save').toUpperCase()}
                </Text>
                
                <SearchableVehicleSelect 
                  confirmText={t('common.save')}
                  cancelText={t('common.cancel')}
                  onCancel={() => setIsSaveModalVisible(false)}
                  onConfirm={(brandId, modelId, year) => {
                    handleSaveToGarage(brandId, modelId, year);
                  }}
                  initialBrandId={activeSessionVehicle?.brand}
                  initialModelId={activeSessionVehicle?.model}
                  initialYear={activeSessionVehicle?.year}
                />
              </View>
            </KeyboardAvoidingView>
          </View>
        )}

        {/* Record Detail Modal */}
        <Modal
          visible={selectedRecord !== null}
          animationType="slide"
          transparent={false}
          onRequestClose={() => setSelectedRecord(null)}
        >
          <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
            <View style={{ paddingHorizontal: 20, paddingTop: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', height: 60, borderBottomWidth: 1, borderBottomColor: colors.border }}>
              <Text style={{ color: colors.textPri, fontSize: 14, fontWeight: '800', fontFamily: MONO }}>{t('common.success')}: {selectedRecord ? `${getLocalizedVehicleBrand(selectedRecord.make, t)} ${getLocalizedVehicleModel(selectedRecord.model)}` : ''}</Text>
              <TouchableOpacity onPress={() => setSelectedRecord(null)} style={{ padding: 10 }}>
                <Text style={{ color: colors.cyan, fontSize: 14, fontWeight: 'bold', fontFamily: MONO }}>{t('common.cancel').toUpperCase()}</Text>
              </TouchableOpacity>
            </View>
            {selectedRecord && (
              <ScrollView style={{ padding: 16 }}>
                <View style={s.panel}>
                  <Text style={s.panelTitle}>{t('expertise.vehicleIdentity')}</Text>
                  <View style={s.tableRow}><Text style={s.tableLabel}>{t('report.date')}</Text><Text style={s.tableValue}>{selectedRecord.date}</Text></View>
                  <View style={s.tableRow}><Text style={s.tableLabel}>{t('expertise.manualVin')}</Text><Text style={s.tableValue}>{getLocalizedVehicleBrand(selectedRecord.make, t)} {getLocalizedVehicleModel(selectedRecord.model)}</Text></View>
                  <View style={s.tableRow}><Text style={s.tableLabel}>{t('expertise.vin')}</Text><Text style={s.tableValue}>{selectedRecord.vin}</Text></View>
                  <View style={[s.tableRow, { borderBottomWidth: 0 }]}><Text style={s.tableLabel}>{t('expertise.odometer')}</Text><Text style={s.tableValue}>{selectedRecord.km} km</Text></View>
                </View>
                <View style={s.panel}>
                  <Text style={s.panelTitle}>{t('expertise.dtcTitle')}</Text>
                  {selectedRecord.dtcs.length === 0 ? (
                    <View style={s.cleanBadge}><Text style={s.cleanBadgeText}>✓ {t('expertise.clean')}</Text></View>
                  ) : (
                    selectedRecord.dtcs.map((dtc, i) => {
                      const desc = lookupDTC(dtc);
                      return (
                        <View key={i} style={s.dtcRow}>
                          <View style={s.dtcDot} />
                          <View style={{ flex: 1 }}>
                            <Text style={s.dtcCode}>{dtc}</Text>
                            {desc && <Text style={{ color: colors.red, opacity: 0.8, fontSize: 10, fontFamily: MONO, marginTop: 2, paddingBottom: Platform.OS === 'ios' ? 2 : 0, lineHeight: 14 }}>{desc}</Text>}
                          </View>
                        </View>
                      );
                    })
                  )}
                </View>
                <TouchableOpacity
                  style={[s.actionBtn, s.actionRed, { marginTop: 12 }]}
                  onPress={() => {
                    Alert.alert(t('hub.deleteConfirm'), t('hub.deleteConfirmDesc'), [
                      { text: t('common.cancel'), style: 'cancel' },
                      {
                        text: t('common.delete'), style: 'destructive', onPress: async () => {
                          await deleteGarageRecord(selectedRecord.id);
                          setSelectedRecord(null);
                          const allRecords = await getGarageRecords();
                          setGarageRecords(allRecords);
                          const currentVin = vin || manualVin;
                          if (currentVin && currentVin.length > 5) {
                            setVinHistory(await getRecordsByVin(currentVin));
                          }
                        }
                      }
                    ]);
                  }}
                >
                  <Text style={[s.actionBtnText, { color: tc.card }]}>{t('common.delete').toUpperCase()}</Text>
                </TouchableOpacity>
              </ScrollView>
            )}
          </SafeAreaView>
        </Modal>

        {/* Battery Test Modal */}
        <BatteryTestModalWrapper
          visible={isBatteryTestVisible}
          onClose={() => setIsBatteryTestVisible(false)}
          sendCommand={sendCommand}
        />

        {/* Freeze Frame Modal */}
        <FreezeFrameModal
          visible={isFreezeFrameVisible}
          onClose={() => setIsFreezeFrameVisible(false)}
          sendCommand={sendCommand}
          hasDtcs={dtcs.length > 0}
        />

        {/* Performance Modal */}
        <PerformanceModalWrapper
          visible={isPerformanceVisible}
          onClose={() => setIsPerformanceVisible(false)}
        />

        {/* Hidden Features Modal */}
        <HiddenFeaturesModal
          visible={isHiddenFeaturesVisible}
          onClose={() => setIsHiddenFeaturesVisible(false)}
          vehicleName={
            activeSessionVehicle
              ? `${activeSessionVehicle.brand} ${activeSessionVehicle.model} ${activeSessionVehicle.year || ''}`.trim()
              : undefined
          }
        />

      </View>
      </SafeAreaView>

      {/* Hardware Health & ID Modal */}
      <HardwareHealthModal
        visible={isHardwareHealthVisible}
        onClose={() => setIsHardwareHealthVisible(false)}
      />

      {/* Secret Debug Modal */}
      <SecretDebugModal
        visible={isSecretDebugVisible}
        onClose={() => setIsSecretDebugVisible(false)}
      />

      {/* Customize Dashboard Modal */}
      <CustomizeDashboardModal
        visible={isCustomizeModalVisible}
        onClose={() => setIsCustomizeModalVisible(false)}
      />

      {/* OBD Terminal & Health Stats Modal */}
      <ObdTerminalModal
        visible={isObdTerminalVisible}
        onClose={() => setIsObdTerminalVisible(false)}
        sendCommand={sendCommand}
      />

      {/* Paywall Modal Overlay */}
      <Paywall
        visible={isPaywallVisible}
        onClose={() => setIsPaywallVisible(false)}
      />
      </View>
    </BluetoothBridgeInitializer>
  );
}

export default function App() {
  const [initialized, setInitialized] = useState(i18n.isInitialized);

  useEffect(() => {
    if (!i18n.isInitialized) {
      const handleInitialized = () => {
        setInitialized(true);
      };
      i18n.on('initialized', handleInitialized);
      return () => {
        i18n.off('initialized', handleInitialized);
      };
    }
  }, []);

  if (!initialized) {
    return (
      <View style={{ flex: 1, backgroundColor: '#000000', justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#00ffff" />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <MainApp />
    </SafeAreaProvider>
  );
}
