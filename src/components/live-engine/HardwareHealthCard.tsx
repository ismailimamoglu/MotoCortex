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
        {t('bento.settings.hardwareHealth').toUpperCase()}
      </Text>
      <View style={sDyn.healthCard}>
        <View style={sDyn.healthRow}>
          <Text style={sDyn.healthLabel}>{t('bento.settings.connectionType')}</Text>
          <Text style={sDyn.healthValue}>BLE</Text>
        </View>
        <View style={sDyn.healthRow}>
          <Text style={sDyn.healthLabel}>{t('bento.settings.deviceName')}</Text>
          <Text style={sDyn.healthValue}>{lastDeviceName || 'OBDII'}</Text>
        </View>
        <View style={sDyn.healthRow}>
          <Text style={sDyn.healthLabel}>{t('bento.settings.protocol')}</Text>
          <Text style={sDyn.healthValue}>
            {isSimulationMode ? t('bento.settings.simulationObd') : 'CAN Bus (ISO-15765)'}
          </Text>
        </View>
        <View style={sDyn.healthRow}>
          <Text style={sDyn.healthLabel}>{t('bento.settings.deviceStatus')}</Text>
          <Text style={[sDyn.healthValue, { color: isCloneDevice ? colors.red : colors.green }]}>
            {isCloneDevice ? t('bento.settings.safeMode') : t('bento.settings.original')}
          </Text>
        </View>
        <View style={sDyn.healthRow}>
          <Text style={sDyn.healthLabel}>{t('bento.settings.pollingRate')}</Text>
          <Text style={sDyn.healthValue}>
            {isCloneDevice ? t('bento.settings.pollingLow') : t('bento.settings.pollingHigh')}
          </Text>
        </View>
      </View>
    </View>
  );
}
