import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, Platform } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useThemeColors } from '../theme';
import { useResponsive } from '../hooks/useResponsive';
import { useAppStore } from '../store/useAppStore';
import { useDashboardStore, ALL_SENSORS } from '../store/useDashboardStore';
import { useBluetoothStore } from '../store/useBluetoothStore';
import { useJsiTelemetry } from '../hooks/useJsiTelemetry';
import ShimmerSensorCard from '../components/ShimmerSensorCard';
import CircularGauge from '../components/CircularGauge';

const MONO = Platform.OS === 'ios' ? 'System' : 'sans-serif';

export interface DashboardSpeedometerProps {
  ecuStatus: string;
  lastDeviceName: string | null;
  onGoToExpertise: () => void;
  onOpenCustomize: () => void;
}

export const DashboardSpeedometer = React.memo(({ ecuStatus, lastDeviceName, onGoToExpertise, onOpenCustomize }: DashboardSpeedometerProps) => {
  const { t } = useTranslation();
  const tc = useThemeColors();
  const { s: scaleWidth, vs: scaleHeight, ms: scaleMod, fs: scaleFont, isPhone, isTablet, isLargeTablet, isPortrait, height } = useResponsive();

  const isLandscape = !isPortrait;

  // Read preferences and hardware state
  const isSimulationMode = useAppStore(state => state.isSimulationMode);
  const { activeSensors, layoutType } = useDashboardStore();
  const protocol = useBluetoothStore(s => s.protocol);
  const adapterCapabilityScore = useBluetoothStore(s => s.adapterCapabilityScore);
  const isCloneDevice = useBluetoothStore(s => s.isCloneDevice);
  const storeVoltage = useBluetoothStore(s => s.voltage);
  const storeRpm = useBluetoothStore(s => s.rpm);
  const storeSpeed = useBluetoothStore(s => s.speed);
  const storeCoolant = useBluetoothStore(s => s.coolant);
  const storeThrottle = useBluetoothStore(s => s.throttle);
  const engineLoad = useBluetoothStore(s => s.engineLoad);
  const intakeAirTemp = useBluetoothStore(s => s.intakeAirTemp);
  const manifoldPressure = useBluetoothStore(s => s.manifoldPressure);
  const ambientTemp = useBluetoothStore(s => s.ambientTemp);
  const oilTemp = useBluetoothStore(s => s.oilTemp);
  const mafFlow = useBluetoothStore(s => s.mafFlow);
  const timingAdvance = useBluetoothStore(s => s.timingAdvance);
  const fuelLevel = useBluetoothStore(s => s.fuelLevel);
  const catalystTemp = useBluetoothStore(s => s.catalystTemp);
  const baroPressure = useBluetoothStore(s => s.baroPressure);
  const widebandAfr = useBluetoothStore(s => s.widebandAfr);
  const transTemp = useBluetoothStore(s => s.transTemp);
  const ethanolPercent = useBluetoothStore(s => s.ethanolPercent);
  const driverTorque = useBluetoothStore(s => s.driverTorque);
  const actualTorque = useBluetoothStore(s => s.actualTorque);
  const engineRefTorque = useBluetoothStore(s => s.engineRefTorque);
  const adblueLevel = useBluetoothStore(s => s.adblueLevel);
  const egtTemp = useBluetoothStore(s => s.egtTemp);
  const noxSensor = useBluetoothStore(s => s.noxSensor);

  // [v7.5.0 FIX-4] PID capability discovery state
  const supportedPids = useBluetoothStore(s => s.supportedPids);

  // Timeout fallback for PID discovery so shimmer loading never hangs indefinitely
  const [discoveryTimedOut, setDiscoveryTimedOut] = React.useState(false);
  React.useEffect(() => {
    if (ecuStatus !== 'connected') {
      setDiscoveryTimedOut(false);
      return;
    }
    const timer = setTimeout(() => {
      setDiscoveryTimedOut(true);
    }, 3000);
    return () => clearTimeout(timer);
  }, [ecuStatus]);

  const isPidDiscoveryComplete = ecuStatus !== 'connected' || supportedPids.length > 0 || discoveryTimedOut;

  const telemetryRef = useJsiTelemetry();
  const [localSensors, setLocalSensors] = React.useState({
    rpm: 0,
    speed: 0,
    coolant: 0,
    throttle: 0,
    voltage: '0.0V'
  });

  React.useEffect(() => {
    if (ecuStatus !== 'connected') return;
    const interval = setInterval(() => {
      const { rpm, speed, coolant, throttle, voltage } = telemetryRef.current;
      setLocalSensors({
        rpm,
        speed,
        coolant,
        throttle,
        voltage: `${voltage.toFixed(1)}V`
      });
    }, 500); // 2 Hz refresh for local gauges to eliminate memory churn
    return () => clearInterval(interval);
  }, [ecuStatus, telemetryRef]);

  // Read all sensor values from useBluetoothStore with fallback to JSI Direct Pipeline for high freq sensors
  const sensorValues = {
    rpm: (ecuStatus === 'connected' || isSimulationMode) ? (localSensors.rpm || storeRpm || (isSimulationMode ? 1724 : null)) : null,
    speed: (ecuStatus === 'connected' || isSimulationMode) ? (localSensors.speed || storeSpeed || (isSimulationMode ? 50 : null)) : null,
    coolant: (ecuStatus === 'connected' || isSimulationMode) ? (localSensors.coolant || storeCoolant || (isSimulationMode ? 87 : null)) : null,
    throttle: (ecuStatus === 'connected' || isSimulationMode) ? (localSensors.throttle || storeThrottle || (isSimulationMode ? 25 : null)) : null,
    voltage: (ecuStatus === 'connected' || isSimulationMode) ? (storeVoltage || localSensors.voltage || (isSimulationMode ? '14.2V' : null)) : null,
    engineLoad: (ecuStatus === 'connected' || isSimulationMode) ? (engineLoad !== null ? engineLoad : (isSimulationMode ? 35 : null)) : null,
    intakeAirTemp: (ecuStatus === 'connected' || isSimulationMode) ? (intakeAirTemp !== null ? intakeAirTemp : (isSimulationMode ? 28 : null)) : null,
    manifoldPressure: (ecuStatus === 'connected' || isSimulationMode) ? (manifoldPressure !== null ? manifoldPressure : (isSimulationMode ? 100 : null)) : null,
    ambientTemp: (ecuStatus === 'connected' || isSimulationMode) ? (ambientTemp !== null ? ambientTemp : (isSimulationMode ? 22 : null)) : null,
    oilTemp: (ecuStatus === 'connected' || isSimulationMode) ? (oilTemp !== null ? oilTemp : (isSimulationMode ? 92 : null)) : null,
    mafFlow: (ecuStatus === 'connected' || isSimulationMode) ? (mafFlow !== null ? mafFlow : (isSimulationMode ? 12.5 : null)) : null,
    timingAdvance: (ecuStatus === 'connected' || isSimulationMode) ? (timingAdvance !== null ? timingAdvance : (isSimulationMode ? 10.5 : null)) : null,
    fuelLevel: (ecuStatus === 'connected' || isSimulationMode) ? (fuelLevel !== null ? fuelLevel : (isSimulationMode ? 65 : null)) : null,
    catalystTemp: (ecuStatus === 'connected' || isSimulationMode) ? (catalystTemp !== null ? catalystTemp : (isSimulationMode ? 600 : null)) : null,

    // Extended Global Sensors
    turboBoost: (ecuStatus === 'connected' || isSimulationMode) ? (manifoldPressure ? Number((manifoldPressure - (baroPressure || 101)).toFixed(1)) : (isSimulationMode ? 1.2 : null)) : null,
    widebandAfr: (ecuStatus === 'connected' || isSimulationMode) ? (widebandAfr !== null ? widebandAfr : (isSimulationMode ? 14.7 : null)) : null,
    transTemp: (ecuStatus === 'connected' || isSimulationMode) ? (transTemp !== null ? transTemp : (isSimulationMode ? 85 : null)) : null,
    ethanolPercent: (ecuStatus === 'connected' || isSimulationMode) ? (ethanolPercent !== null ? ethanolPercent : (isSimulationMode ? 10 : null)) : null,
    baroPressure: (ecuStatus === 'connected' || isSimulationMode) ? (baroPressure !== null ? baroPressure : (isSimulationMode ? 101 : null)) : null,
    actualTorque: (ecuStatus === 'connected' || isSimulationMode) ? (actualTorque !== null ? actualTorque : (isSimulationMode ? 450 : null)) : null,
    driverTorque: (ecuStatus === 'connected' || isSimulationMode) ? (driverTorque !== null ? driverTorque : (isSimulationMode ? 350 : null)) : null,
    adblueLevel: (ecuStatus === 'connected' || isSimulationMode) ? (adblueLevel !== null ? adblueLevel : (isSimulationMode ? 80 : null)) : null,
    egtTemp: (ecuStatus === 'connected' || isSimulationMode) ? (egtTemp !== null ? egtTemp : (isSimulationMode ? 600 : null)) : null,
    noxSensor: (ecuStatus === 'connected' || isSimulationMode) ? (noxSensor !== null ? noxSensor : (isSimulationMode ? 45 : null)) : null,
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
            {ecuStatus === 'connected' ? t('dashboard.connectedDevice') : t('bento.settings.noConnection')}
          </Text>
          <Text numberOfLines={1} style={{ color: tc.textSec, fontSize: scaleFont(9.5), fontFamily: MONO, marginTop: scaleHeight(2) }}>
            {ecuStatus === 'connected' && lastDeviceName ? lastDeviceName : t('bento.settings.deviceNotConnected')}
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
              🛡️ {isCloneDevice ? t('dashboard.adapterClone') : t('dashboard.adapterOriginal')} ({adapterCapabilityScore}/100)
            </Text>
          </View>

          {protocol && (
            <View style={{
              flexDirection: 'row', alignItems: 'center', gap: scaleMod(4),
              backgroundColor: `${tc.purple}12`,
              borderRadius: scaleMod(12), paddingHorizontal: scaleMod(8), paddingVertical: scaleHeight(3),
            }}>
              <Text style={{ color: tc.purple, fontSize: scaleFont(8.2), fontFamily: MONO, fontWeight: '800' }}>
                {protocol === 'SIMULATED_OBD' ? 'CAN BUS (DEMO)' : protocol.replace(/_/g, ' ')}
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
      return String(val).replace(/V/g, '');
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

    // SHIMMER LOADING STATE during PID capability discovery
    if (!isPidDiscoveryComplete) {
      const shimmerCount = Math.max(activeSensors.length, 4);
      const shimmerStyles = Array.from({ length: shimmerCount }, (_, idx) =>
        getCardStyle(idx, shimmerCount)
      );
      return (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: itemGap, marginBottom: isTablet ? 0 : scaleHeight(10) }}>
          {shimmerStyles.map((cfg, idx) => (
            <ShimmerSensorCard key={`shimmer-grid-${idx}`} width={cfg.width} height={cfg.height} tc={tc} scaleMod={scaleMod} />
          ))}
        </View>
      );
    }

    const CRITICAL_PIDS = ['0C', '0D', '05'];
    const activeConfigs = ALL_SENSORS.filter(s => {
      if (!activeSensors.includes(s.key)) return false;
      if (isSimulationMode || supportedPids.length === 0) return true;
      const pidHex = s.pid?.replace(/\s+/g, '').toUpperCase().slice(-2);
      if (!pidHex) return true;
      if (CRITICAL_PIDS.includes(pidHex)) return true;
      return supportedPids.some(p => p === pidHex || p.startsWith(pidHex + '@'));
    });

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
              {/* Header: Name */}
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: scaleMod(4) }}>
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
    const cardPad = isTablet ? scaleHeight(12) : scaleHeight(8);
    const itemGap = isTablet ? scaleMod(10) : scaleMod(6);

    if (!isPidDiscoveryComplete) {
      const shimmerCount = Math.max(activeSensors.length, 4);
      return (
        <View style={{ flexDirection: isTablet ? 'row' : 'column', flexWrap: isTablet ? 'wrap' : 'nowrap', justifyContent: isTablet ? 'space-between' : 'flex-start', gap: itemGap, marginBottom: isTablet ? 0 : scaleHeight(10) }}>
          {Array.from({ length: shimmerCount }, (_, idx) => (
            <ShimmerSensorCard key={`shimmer-list-${idx}`} width={isTablet ? '48.5%' : '100%'} height={scaleHeight(58)} tc={tc} scaleMod={scaleMod} />
          ))}
        </View>
      );
    }

    const CRITICAL_PIDS = ['0C', '0D', '05'];
    const activeConfigs = ALL_SENSORS.filter(s => {
      if (!activeSensors.includes(s.key)) return false;
      if (isSimulationMode || supportedPids.length === 0) return true;
      const pidHex = s.pid?.replace(/\s+/g, '').toUpperCase().slice(-2);
      if (!pidHex) return true;
      if (CRITICAL_PIDS.includes(pidHex)) return true;
      return supportedPids.some(p => p === pidHex || p.startsWith(pidHex + '@'));
    });

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
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: scaleMod(10), flex: 1 }}>
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
                </View>
              </View>

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
    const size = isTablet ? scaleMod(130) : scaleMod(95);

    if (!isPidDiscoveryComplete) {
      const shimmerCount = Math.max(activeSensors.length, 4);
      const gaugeCardSize = size + scaleHeight(36);
      return (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: itemGap, marginBottom: isTablet ? 0 : scaleHeight(10) }}>
          {Array.from({ length: shimmerCount }, (_, idx) => (
            <ShimmerSensorCard key={`shimmer-gauge-${idx}`} width={isTablet ? '31.3%' : '47%'} height={gaugeCardSize} tc={tc} scaleMod={scaleMod} />
          ))}
        </View>
      );
    }

    const CRITICAL_PIDS = ['0C', '0D', '05'];
    const activeConfigs = ALL_SENSORS.filter(s => {
      if (!activeSensors.includes(s.key)) return false;
      if (isSimulationMode || supportedPids.length === 0) return true;
      const pidHex = s.pid?.replace(/\s+/g, '').toUpperCase().slice(-2);
      if (!pidHex) return true;
      if (CRITICAL_PIDS.includes(pidHex)) return true;
      return supportedPids.some(p => p === pidHex || p.startsWith(pidHex + '@'));
    });

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

  const renderSensorChart = () => {
    const cardPad = isTablet ? scaleHeight(12) : scaleHeight(10);
    const itemGap = isTablet ? scaleMod(12) : scaleMod(8);

    const CRITICAL_PIDS = ['0C', '0D', '05'];
    const activeConfigs = ALL_SENSORS.filter(s => {
      if (!activeSensors.includes(s.key)) return false;
      if (isSimulationMode || supportedPids.length === 0) return true;
      const pidHex = s.pid?.replace(/\s+/g, '').toUpperCase().slice(-2);
      if (!pidHex) return true;
      if (CRITICAL_PIDS.includes(pidHex)) return true;
      return supportedPids.some(p => p === pidHex || p.startsWith(pidHex + '@'));
    });

    return (
      <View style={{ gap: itemGap, marginBottom: isTablet ? 0 : scaleHeight(10) }}>
        {activeConfigs.map((sensor) => {
          const rawVal = (sensorValues as any)[sensor.key];
          const displayVal = formatSensorValue(sensor.key, rawVal);
          const valColor = getSensorStatusColor(sensor.key, rawVal, sensor.color);

          const sparklineBars = [0.4, 0.55, 0.35, 0.6, 0.7, 0.5, 0.65, 0.8, 0.75, 0.9, 0.85, 0.7, 0.8, 0.95, 0.88, 1.0];

          return (
            <View
              key={sensor.key}
              style={{
                backgroundColor: tc.card,
                borderWidth: 1.2,
                borderColor: tc.border,
                borderLeftWidth: 4,
                borderLeftColor: sensor.color,
                borderRadius: scaleMod(12),
                padding: cardPad,
                gap: scaleHeight(8),
              }}
            >
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: scaleMod(8), flex: 1 }}>
                  <View style={{ flex: 1 }}>
                    <Text numberOfLines={1} style={{ fontSize: scaleFont(12), fontWeight: '900', color: tc.textPri, fontFamily: MONO }}>
                      {t(sensor.nameKey, sensor.defaultName)}
                    </Text>
                    <Text style={{ fontSize: scaleFont(8.5), color: tc.textSec, fontFamily: MONO, marginTop: 1 }}>
                      {t('bento.realtimeData')}
                    </Text>
                  </View>
                </View>

                <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: scaleMod(3) }}>
                  <Text style={{ fontSize: scaleFont(18), fontWeight: '900', color: valColor, fontFamily: MONO }}>
                    {displayVal}
                  </Text>
                  {displayVal !== '--' && (
                    <Text style={{ fontSize: scaleFont(10), fontWeight: '700', color: tc.textSec, fontFamily: MONO }}>
                      {sensor.unit}
                    </Text>
                  )}
                </View>
              </View>

              <View style={{ height: scaleHeight(36), flexDirection: 'row', alignItems: 'flex-end', gap: 3, backgroundColor: `${sensor.color}0D`, padding: 4, borderRadius: 6, borderWidth: 1, borderColor: `${sensor.color}22` }}>
                {sparklineBars.map((ratio, idx) => (
                  <View
                    key={idx}
                    style={{
                      flex: 1,
                      height: `${Math.max(15, Math.min(100, ratio * 100))}%`,
                      backgroundColor: idx === sparklineBars.length - 1 ? sensor.color : `${sensor.color}80`,
                      borderRadius: 2,
                    }}
                  />
                ))}
              </View>
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
        {t('dashboard.customizeButton').toUpperCase()}
      </Text>
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
          <View style={{ gap: scaleMod(10) }}>
            {renderConnectionCard()}
            {renderBatteryWarning()}
          </View>

          <View style={{ flex: 1 }}>
            {layoutType === 'grid' ? renderSensorGrid() : layoutType === 'gauge' ? renderSensorGauge() : layoutType === 'chart' ? renderSensorChart() : renderSensorList()}
          </View>

          <View style={{ flexDirection: 'column', gap: scaleMod(12) }}>
            {renderCustomizeButton()}
          </View>
        </ScrollView>
      </View>
    );
  }

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
          <View style={{ flex: 1, gap: scaleMod(10), justifyContent: 'space-between' }}>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: scaleMod(10) }} style={{ flex: 1 }} bounces={false}>
              {renderConnectionCard()}
              {renderBatteryWarning()}
            </ScrollView>
            <View style={{ gap: scaleHeight(6) }}>
              {renderCustomizeButton()}
            </View>
          </View>

          <ScrollView style={{ flex: 1.2 }} showsVerticalScrollIndicator={false} bounces={false}>
            {layoutType === 'grid' ? renderSensorGrid() : layoutType === 'gauge' ? renderSensorGauge() : layoutType === 'chart' ? renderSensorChart() : renderSensorList()}
          </ScrollView>
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, padding: scaleMod(12), backgroundColor: tc.bg }}>
      <ScrollView 
        showsVerticalScrollIndicator={false} 
        contentContainerStyle={{ flexGrow: 1, justifyContent: 'flex-start', paddingBottom: scaleHeight(40) }}
        bounces={true}
      >
        <View style={{ gap: scaleHeight(10) }}>
          {renderConnectionCard()}
          {renderCustomizeButton()}
          {renderBatteryWarning()}
          <View style={{ marginTop: scaleHeight(4) }}>
            {layoutType === 'grid' ? renderSensorGrid() : layoutType === 'gauge' ? renderSensorGauge() : layoutType === 'chart' ? renderSensorChart() : renderSensorList()}
          </View>
        </View>
      </ScrollView>
    </View>
  );
});

export default DashboardSpeedometer;
