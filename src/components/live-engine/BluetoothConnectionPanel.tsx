import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Platform, Alert } from 'react-native';
import { useTranslation } from 'react-i18next';
import * as Haptics from 'expo-haptics';
import { triggerHaptic } from '../../utils/haptics';

interface BluetoothConnectionPanelProps {
  status: string;
  connectingDeviceId: string | null;
  connectionProgress: number;
  scannedDevices: any[];
  permissionGranted: boolean;
  lastDeviceId: string | null;
  lastDeviceName: string | null;
  handleScan: () => Promise<void>;
  handleRealConnect: (id: string, name: string) => void;
  disconnect: () => void;
  enableBluetooth: () => Promise<boolean>;
  onOpenRegisteredList?: () => void;
  colors: any;
  sDyn: any;
  scaleFont: (size: number) => number;
  scaleMod: (size: number) => number;
  scaleWidth: (size: number) => number;
  scaleHeight: (size: number) => number;
  MONO: string;
}

export default function BluetoothConnectionPanel({
  status,
  connectingDeviceId,
  connectionProgress,
  scannedDevices,
  permissionGranted,
  lastDeviceId,
  lastDeviceName,
  handleScan,
  handleRealConnect,
  disconnect,
  enableBluetooth,
  onOpenRegisteredList,
  colors,
  sDyn,
  scaleFont,
  scaleMod,
  scaleWidth,
  scaleHeight,
  MONO,
}: BluetoothConnectionPanelProps) {
  const { t } = useTranslation();

  return (
    <View style={{ gap: scaleHeight(8) }}>
      <Text style={sDyn.sectionTitle}>
        {t('vehicleSelect.connectionSection', 'OBD DEVICE CONNECTION').toUpperCase()}
      </Text>
      
      {/* Registered Vehicles Action Button */}
      <TouchableOpacity 
        style={{
          backgroundColor: `${colors.purple}14`,
          borderColor: colors.purple,
          borderWidth: 1.5,
          borderRadius: scaleMod(10),
          paddingVertical: scaleHeight(11),
          paddingHorizontal: scaleWidth(14),
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: scaleMod(8),
        }}
        onPress={() => {
          triggerHaptic(Haptics.ImpactFeedbackStyle.Medium);
          if (onOpenRegisteredList) onOpenRegisteredList();
        }}
        activeOpacity={0.7}
      >
        <Text style={{ fontSize: scaleFont(14) }}>🏎️</Text>
        <Text 
          allowFontScaling={false}
          style={{ color: colors.purple, fontSize: scaleFont(10.5), fontWeight: '900', fontFamily: MONO, letterSpacing: 0.8 }}
        >
          {t('vehicleSelect.registeredVehiclesButton', 'KAYITLI ARAÇLARIM').toUpperCase()}
        </Text>
        <Text style={{ color: colors.purple, fontSize: scaleFont(13), fontWeight: '900' }}>{'>'}</Text>
      </TouchableOpacity>

      {/* Scanning Status */}
      {status === 'scanning' && (
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginVertical: scaleHeight(6) }}>
          <ActivityIndicator size="small" color={colors.cyan} />
          <Text style={{ color: colors.cyan, fontFamily: MONO, fontSize: scaleFont(11), fontWeight: 'bold' }}>
            {t('connection.scanning', 'Scanning devices...')}
          </Text>
        </View>
      )}

      {/* Scanned Devices List */}
      {scannedDevices.length > 0 && (
        <View style={{ marginTop: scaleHeight(4) }}>
          <Text style={[sDyn.sectionTitle, { fontSize: scaleFont(8.5), marginBottom: scaleHeight(4) }]}>
            {t('connection.foundDevices', 'FOUND OBD2 DEVICES')}
          </Text>
          <ScrollView 
            nestedScrollEnabled={true} 
            style={{ maxHeight: scaleHeight(150) }}
            contentContainerStyle={{ gap: scaleHeight(4) }}
          >
            {scannedDevices.map((d) => {
              const isThisConnecting = connectingDeviceId === (d.address || d.id);
              return (
                <TouchableOpacity
                  key={d.address || d.id}
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    backgroundColor: isThisConnecting ? `${colors.cyan}0A` : `${colors.textPri}05`,
                    borderColor: isThisConnecting ? colors.cyan : colors.cardBorder,
                    borderWidth: 1,
                    borderRadius: scaleMod(8),
                    padding: scaleMod(8),
                    opacity: (connectingDeviceId && !isThisConnecting) ? 0.5 : 1,
                    overflow: 'hidden',
                  }}
                  disabled={connectingDeviceId !== null}
                  onPress={async () => {
                    triggerHaptic(Haptics.ImpactFeedbackStyle.Medium);
                    handleRealConnect(d.address || d.id, d.name);
                  }}
                  activeOpacity={0.4}
                >
                  {isThisConnecting && (
                    <View
                      style={{
                        position: 'absolute',
                        start: 0,
                        top: 0,
                        bottom: 0,
                        width: `${connectionProgress}%`,
                        backgroundColor: `${colors.cyan}20`,
                        zIndex: 0,
                      }}
                    />
                  )}
                  <View style={{ flex: 1, marginEnd: 8, zIndex: 1 }}>
                    <Text style={{ color: colors.textPri, fontSize: scaleFont(11), fontFamily: MONO, fontWeight: 'bold' }} numberOfLines={1}>
                      {d.name || t('connection.unknownDevice', 'Unknown Device')}
                    </Text>
                    <Text style={{ color: colors.textSec, fontSize: scaleFont(8.5), fontFamily: MONO }} numberOfLines={1}>
                      {d.address}
                    </Text>
                  </View>
                  <View style={{ zIndex: 1 }}>
                    {isThisConnecting ? (
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: scaleWidth(8) }}>
                        <Text style={{ color: colors.cyan, fontSize: scaleFont(10), fontFamily: MONO, fontWeight: 'bold' }}>
                          {t('connection.progressFormat', '{{progress}}%').replace('{{progress}}', String(connectionProgress))}
                        </Text>
                        <TouchableOpacity
                          onPress={async () => {
                            triggerHaptic(Haptics.ImpactFeedbackStyle.Medium);
                            await disconnect();
                          }}
                          style={{
                            backgroundColor: `${colors.red}1a`,
                            borderColor: colors.red,
                            borderWidth: 1,
                            borderRadius: scaleMod(4),
                            paddingHorizontal: scaleWidth(6),
                            paddingVertical: scaleHeight(2),
                          }}
                        >
                          <Text style={{ color: colors.red, fontSize: scaleFont(8.5), fontWeight: '900', fontFamily: MONO }}>
                            {t('connection.cancel', 'CANCEL').toUpperCase()}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    ) : (
                      <View style={{
                        backgroundColor: colors.cyan,
                        borderRadius: scaleMod(6),
                        paddingHorizontal: scaleWidth(10),
                        paddingVertical: scaleHeight(4),
                      }}>
                        <Text style={{ color: '#000000', fontSize: scaleFont(9.5), fontWeight: '900', fontFamily: MONO }}>
                          {t('connection.connectLabel', 'CONNECT').toUpperCase()}
                        </Text>
                      </View>
                    )}
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      )}

      {/* Connect Last Paired Device Shortcut */}
      {lastDeviceId && status !== 'scanning' && scannedDevices.length === 0 && (
        <TouchableOpacity
          style={{
            backgroundColor: `${colors.textPri}0A`,
            borderColor: `${colors.textPri}1F`,
            borderWidth: 1,
            borderRadius: scaleMod(8),
            paddingVertical: scaleHeight(10),
            alignItems: 'center',
            justifyContent: 'center',
            marginTop: scaleHeight(4),
          }}
          onPress={() => handleRealConnect(lastDeviceId, lastDeviceName || 'Device')}
          activeOpacity={0.4}
        >
          <Text style={{ color: colors.textPri, fontSize: scaleFont(10), fontWeight: '800', fontFamily: MONO }}>
            ↺ {t('connection.connectLast', 'CONNECT TO LAST DEVICE')} ({lastDeviceName})
          </Text>
        </TouchableOpacity>
      )}
      
      {/* Bluetooth Scan Hint */}
      {scannedDevices.length === 0 && permissionGranted && status !== 'scanning' && (
        <Text style={{ color: colors.textSec, fontSize: scaleFont(9.2), fontFamily: MONO, textAlign: 'center', marginTop: scaleHeight(4), lineHeight: scaleHeight(14) }}>
          {t('connection.scanHint', 'Ensure your Bluetooth OBD2 adapter is powered on and ready to pair.')}
        </Text>
      )}
    </View>
  );
}
