import React from 'react';
import { View, Text, Platform } from 'react-native';
import { useResponsive } from '../hooks/useResponsive';
import { useThemeColors } from '../theme';

const MONO = Platform.OS === 'ios' ? 'System' : 'sans-serif';
const TICK_ANGLES = [-135, -105, -75, -45, -15, 15, 45, 75, 105, 135];

export interface CircularGaugeProps {
  sensor?: any;
  value: any;
  maxValue?: number;
  label?: string;
  unit?: string;
  size?: number;
  tc?: any;
}

export const CircularGauge: React.FC<CircularGaugeProps> = ({
  sensor: providedSensor,
  value,
  maxValue,
  label,
  unit,
  size = 100,
  tc: providedTc,
}) => {
  const { s: scaleWidth, vs: scaleHeight, ms: scaleMod, fs: scaleFont } = useResponsive();
  const themeColors = useThemeColors();
  const tc = providedTc || themeColors;

  const sensor = providedSensor || {
    key: 'speed',
    name: label || 'SPEED',
    unit: unit || 'km/h',
    color: tc.cyan || '#00F0FF',
  };

  // Parse numeric value
  const numVal = value !== null && value !== undefined ? parseFloat(String(value).replace(/[^0-9.]/g, '')) : 0;

  const lastSmoothedVal = React.useRef<number | null>(null);
  const prevRawVal = React.useRef<number | null>(null);

  let displayNumVal = numVal;
  if (sensor.key === 'rpm') {
    if (lastSmoothedVal.current === null) {
      lastSmoothedVal.current = numVal;
      prevRawVal.current = numVal;
    } else if (numVal !== prevRawVal.current) {
      const delta = Math.abs(numVal - lastSmoothedVal.current);
      const alpha = Math.max(0.15, Math.min(0.85, 0.15 + delta / 3000));
      lastSmoothedVal.current = alpha * numVal + (1 - alpha) * lastSmoothedVal.current;
      prevRawVal.current = numVal;
    }
    displayNumVal = lastSmoothedVal.current;
  }
  
  // Define ranges for standard sensors
  let min = 0;
  let max = 100;
  if (maxValue !== undefined) {
    max = maxValue;
  } else if (sensor.key === 'rpm') { min = 0; max = 8000; }
  else if (sensor.key === 'speed') { min = 0; max = 220; }
  else if (sensor.key === 'coolant') { min = -20; max = 120; }
  else if (sensor.key === 'voltage') { min = 9; max = 16; }
  else if (sensor.key === 'throttle') { min = 0; max = 100; }
  else if (sensor.key === 'engineLoad') { min = 0; max = 100; }
  else if (sensor.key === 'oilTemp' || sensor.key === 'transTemp') { min = 0; max = 150; }
  else if (sensor.key === 'catalystTemp' || sensor.key === 'egtTemp') { min = 0; max = 1000; }
  else if (sensor.key === 'fuelLevel' || sensor.key === 'ethanolPercent' || sensor.key === 'adblueLevel') { min = 0; max = 100; }
  else if (sensor.key === 'manifoldPressure') { min = 0; max = 250; }
  else if (sensor.key === 'baroPressure') { min = 50; max = 120; }
  else if (sensor.key === 'turboBoost') { min = 0; max = 3; }
  else if (sensor.key === 'widebandAfr') { min = 9; max = 20; }
  else if (sensor.key === 'actualTorque' || sensor.key === 'driverTorque') { min = 0; max = 600; }
  else if (sensor.key === 'noxSensor') { min = 0; max = 500; }
  else if (sensor.key === 'timingAdvance') { min = -10; max = 50; }
  else if (sensor.key === 'intakeAirTemp' || sensor.key === 'ambientTemp') { min = -20; max = 80; }
  
  const pct = Math.max(0, Math.min(1, (displayNumVal - min) / (max - min)));
  // Map 0-1 to angle: -135deg (min) to +135deg (max)
  const angle = -135 + pct * 270;
  
  let displayVal = value !== null && value !== undefined ? String(value).replace(/[A-Za-z]/g, '') : '--';
  if (sensor.key === 'rpm' && value !== null && value !== undefined) {
    displayVal = String(Math.round(displayNumVal));
  }
  
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

      {/* Tick Marks */}
      {TICK_ANGLES.map((tickAngle, idx) => {
        const tickPct = (tickAngle + 135) / 270;
        const tickVal = min + tickPct * (max - min);
        const isLit = numVal >= tickVal;
        const isMajor = idx === 0 || idx === 3 || idx === 6 || idx === 9;

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
          left: size * 0.14,
          bottom: size * 0.12,
          fontSize: scaleFont(7),
          fontWeight: '800',
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
          right: size * 0.14,
          bottom: size * 0.12,
          fontSize: scaleFont(7),
          fontWeight: '800',
          color: tc.textSec,
          fontFamily: MONO,
        }}
      >
        {max}
      </Text>

      {/* Value Text Overlaid Centered Below Needle */}
      <View style={{ position: 'absolute', bottom: size * 0.18, alignItems: 'center' }}>
        <Text allowFontScaling={false} style={{ fontSize: scaleFont(11.5), fontWeight: '900', color: tc.textPri, fontFamily: MONO, lineHeight: scaleFont(13) }}>
          {displayVal}
        </Text>
        <Text allowFontScaling={false} style={{ fontSize: scaleFont(7.5), color: tc.textSec, fontFamily: MONO, fontWeight: '700', marginTop: 1 }}>
          {sensor.unit}
        </Text>
      </View>
    </View>
  );
};

export default CircularGauge;
