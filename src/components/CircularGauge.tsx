import React from 'react';
import { View, Text, Platform } from 'react-native';
import { useResponsive } from '../hooks/useResponsive';
import { useThemeColors } from '../theme';

const MONO = Platform.OS === 'ios' ? 'System' : 'sans-serif';
const TICK_ANGLES = [-135, -108, -81, -54, -27, 0, 27, 54, 81, 108, 135];

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
  size = 110,
  tc: providedTc,
}) => {
  const { s: scaleWidth, vs: scaleHeight, ms: scaleMod, fs: scaleFont } = useResponsive();
  const themeColors = useThemeColors();
  const tc = providedTc || themeColors;

  const sensor = providedSensor || {
    key: 'speed',
    name: label || 'SPEED',
    unit: unit || 'km/h',
    color: tc.cyan || '#0284c7',
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
  else if (sensor.key === 'coolant') { min = 20; max = 120; }
  else if (sensor.key === 'voltage') { min = 9; max = 16; }
  else if (sensor.key === 'throttle') { min = 0; max = 100; }
  else if (sensor.key === 'engineLoad') { min = 0; max = 100; }
  else if (sensor.key === 'oilTemp' || sensor.key === 'transTemp') { min = 40; max = 150; }
  else if (sensor.key === 'catalystTemp' || sensor.key === 'egtTemp') { min = 100; max = 1000; }
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
  // Map 0-1 to angle: -135deg (min) to +135deg (max) (Total sweep: 270 deg)
  const angle = -135 + pct * 270;
  
  let displayVal = value !== null && value !== undefined ? String(value).replace(/[A-Za-z]/g, '') : '--';
  if (sensor.key === 'rpm' && value !== null && value !== undefined) {
    displayVal = String(Math.round(displayNumVal));
  }

  // Calculate needle length and pivot size
  const needleLength = size * 0.38;
  const hubSize = scaleMod(10);
  const trackBorder = scaleMod(2.5);

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      
      {/* 1. Outer Circular Scale Track (Subtle matte arc) */}
      <View 
        style={{
          position: 'absolute',
          width: size - scaleMod(6),
          height: size - scaleMod(6),
          borderRadius: (size - scaleMod(6)) / 2,
          borderWidth: trackBorder,
          borderColor: `${tc.textPri}10`,
          borderTopColor: `${tc.textPri}20`,
          borderLeftColor: `${tc.textPri}20`,
          borderRightColor: `${tc.textPri}20`,
          transform: [{ rotate: '-45deg' }],
        }} 
      />

      {/* 2. Active Accent Arc Track (Fills up to current angle visually) */}
      <View 
        style={{
          position: 'absolute',
          width: size - scaleMod(6),
          height: size - scaleMod(6),
          borderRadius: (size - scaleMod(6)) / 2,
          borderWidth: trackBorder,
          borderColor: 'transparent',
          borderTopColor: sensor.color,
          borderLeftColor: pct > 0.3 ? sensor.color : 'transparent',
          borderRightColor: pct > 0.7 ? sensor.color : 'transparent',
          transform: [{ rotate: '-45deg' }],
          opacity: 0.85,
        }} 
      />

      {/* 3. Radial Precision Tick Marks */}
      {TICK_ANGLES.map((tickAngle, idx) => {
        const tickPct = (tickAngle + 135) / 270;
        const tickVal = min + tickPct * (max - min);
        const isLit = numVal >= tickVal;
        const isMajor = idx === 0 || idx === 5 || idx === 10;

        return (
          <View
            key={idx}
            style={{
              position: 'absolute',
              width: isMajor ? scaleMod(1.6) : scaleMod(1),
              height: isMajor ? scaleMod(6) : scaleMod(3.5),
              backgroundColor: isLit ? sensor.color : `${tc.textPri}25`,
              borderRadius: scaleMod(0.8),
              transform: [
                { rotate: `${tickAngle}deg` },
                { translateY: -(size / 2 - scaleMod(5)) }
              ]
            }}
          />
        );
      })}

      {/* 4. Precision Tapered Needle */}
      <View 
        style={{
          position: 'absolute',
          width: size,
          height: size,
          alignItems: 'center',
          justifyContent: 'center',
          transform: [{ rotate: `${angle}deg` }]
        }}
      >
        <View 
          style={{
            position: 'absolute',
            top: size * 0.12,
            width: scaleMod(2),
            height: needleLength,
            backgroundColor: sensor.color,
            borderRadius: scaleMod(1),
            opacity: 0.95,
          }} 
        />
      </View>

      {/* 5. Minimalist Center Pivot Hub */}
      <View 
        style={{
          position: 'absolute',
          width: hubSize,
          height: hubSize,
          borderRadius: hubSize / 2,
          backgroundColor: tc.card || tc.bg,
          borderWidth: scaleMod(2),
          borderColor: sensor.color,
          alignItems: 'center',
          justifyContent: 'center',
        }} 
      >
        <View 
          style={{
            width: scaleMod(3),
            height: scaleMod(3),
            borderRadius: scaleMod(1.5),
            backgroundColor: tc.textPri,
          }} 
        />
      </View>

      {/* 6. Scale Min and Max Labels */}
      <Text
        allowFontScaling={false}
        style={{
          position: 'absolute',
          left: size * 0.12,
          bottom: size * 0.08,
          fontSize: scaleFont(7.5),
          fontWeight: '700',
          color: tc.textTertiary || `${tc.textPri}50`,
          fontFamily: MONO,
        }}
      >
        {min}
      </Text>
      <Text
        allowFontScaling={false}
        style={{
          position: 'absolute',
          right: size * 0.12,
          bottom: size * 0.08,
          fontSize: scaleFont(7.5),
          fontWeight: '700',
          color: tc.textTertiary || `${tc.textPri}50`,
          fontFamily: MONO,
        }}
      >
        {max}
      </Text>

      {/* 7. High-Contrast Center Readout & Unit */}
      <View 
        style={{ 
          position: 'absolute', 
          bottom: size * 0.16, 
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Text 
          allowFontScaling={false} 
          style={{ 
            fontSize: scaleFont(15), 
            fontWeight: '900', 
            color: tc.textPri, 
            fontFamily: MONO, 
            letterSpacing: -0.5,
            lineHeight: scaleFont(18),
          }}
        >
          {displayVal}
        </Text>
        <Text 
          allowFontScaling={false} 
          style={{ 
            fontSize: scaleFont(8), 
            color: tc.textSec, 
            fontFamily: MONO, 
            fontWeight: '700', 
            marginTop: scaleHeight(1),
            letterSpacing: 0.5,
          }}
        >
          {sensor.unit}
        </Text>
      </View>
    </View>
  );
};

export default CircularGauge;
