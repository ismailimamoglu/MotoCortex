import React from 'react';
import { View, Text } from 'react-native';
import { useTranslation } from 'react-i18next';

interface HardwareHealthCardProps {
  isConnected: boolean;
  isSimulationMode: boolean;
  isCloneDevice: boolean;
  lastDeviceName: string | null;
  colors: any;
  sDyn: any;
  scaleFont: (size: number) => number;
  MONO: string;
}

export default function HardwareHealthCard({
  isConnected,
  isSimulationMode,
  isCloneDevice,
  lastDeviceName,
  colors,
  sDyn,
  scaleFont,
  MONO,
}: HardwareHealthCardProps) {
  const { t } = useTranslation();

  if (!isConnected) return null;

  return (
    <View style={sDyn.healthSection}>
      <Text style={sDyn.sectionTitle}>
        {t('bento.settings.hardwareHealth', 'HARDWARE HEALTH INFO').toUpperCase()}
      </Text>
      <View style={sDyn.healthCard}>
        <View style={sDyn.healthRow}>
          <Text style={sDyn.healthLabel}>{t('bento.settings.connectionType', 'Connection Type:')}</Text>
          <Text style={sDyn.healthValue}>BLE</Text>
        </View>
        <View style={sDyn.healthRow}>
          <Text style={sDyn.healthLabel}>{t('bento.settings.deviceName', 'Device Name:')}</Text>
          <Text style={sDyn.healthValue}>{lastDeviceName || 'OBDII'}</Text>
        </View>
        <View style={sDyn.healthRow}>
          <Text style={sDyn.healthLabel}>{t('bento.settings.protocol', 'Protocol:')}</Text>
          <Text style={sDyn.healthValue}>
            {isSimulationMode ? t('bento.settings.simulationObd', 'Simulation OBD') : 'CAN Bus (ISO-15765)'}
          </Text>
        </View>
        <View style={sDyn.healthRow}>
          <Text style={sDyn.healthLabel}>{t('bento.settings.deviceStatus', 'Device Status:')}</Text>
          <Text style={[sDyn.healthValue, { color: isCloneDevice ? colors.red : colors.green }]}>
            {isCloneDevice ? t('bento.settings.safeMode', 'Safe Mode / Clone Adapter') : t('bento.settings.original', 'Original')}
          </Text>
        </View>
        <View style={sDyn.healthRow}>
          <Text style={sDyn.healthLabel}>{t('bento.settings.pollingRate', 'Polling Rate:')}</Text>
          <Text style={sDyn.healthValue}>
            {isCloneDevice ? t('bento.settings.pollingLow', '2 Hz (Low)') : t('bento.settings.pollingHigh', '4 Hz (High)')}
          </Text>
        </View>
      </View>
    </View>
  );
}
