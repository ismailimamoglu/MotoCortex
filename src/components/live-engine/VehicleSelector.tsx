import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { SelectedVehicle } from '../../store/garageStore';
import { getLocalizedVehicleBrand, getLocalizedVehicleModel } from '../../utils/vehicleStandardizer';
import { useTranslation } from 'react-i18next';

interface VehicleSelectorProps {
  activeSessionVehicle: SelectedVehicle;
  isConnected: boolean;
  onDisconnectPress: () => void;
  onChangeVehicle: () => void;
  onOpenRegisteredVehicles?: () => void;
  colors: any;
  sDyn: any;
  scaleFont: (size: number) => number;
  scaleMod: (size: number) => number;
  scaleWidth: (size: number) => number;
  scaleHeight: (size: number) => number;
  MONO: string;
}

export default function VehicleSelector({
  activeSessionVehicle,
  isConnected,
  onDisconnectPress,
  onChangeVehicle,
  onOpenRegisteredVehicles,
  colors,
  sDyn,
  scaleFont,
  scaleMod,
  scaleWidth,
  scaleHeight,
  MONO,
}: VehicleSelectorProps) {
  const { t } = useTranslation();

  return (
    <View>
      <Text style={sDyn.vehicleLabel}>{t('vehicleSelect.selectedVehicle', 'SELECTED VEHICLE')}</Text>
      <Text style={sDyn.vehicleName} numberOfLines={1}>
        {getLocalizedVehicleBrand(activeSessionVehicle.brand, t)} {getLocalizedVehicleModel(activeSessionVehicle.model)}
      </Text>
      <Text style={sDyn.vehicleYear}>{activeSessionVehicle.year}</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: scaleMod(8), marginTop: scaleHeight(8) }}>
        <TouchableOpacity 
          style={{
            flex: 1,
            backgroundColor: `${colors.purple}14`,
            borderColor: colors.purple,
            borderWidth: 1.5,
            borderRadius: scaleMod(8),
            paddingHorizontal: scaleWidth(10),
            paddingVertical: scaleHeight(8),
            alignItems: 'center',
            justifyContent: 'center',
          }}
          onPress={onOpenRegisteredVehicles || onChangeVehicle}
          activeOpacity={0.7}
        >
          <Text style={{ color: colors.purple, fontSize: scaleFont(9.5), fontWeight: '900', fontFamily: MONO, letterSpacing: 0.5 }}>
            🏎️ {t('vehicleSelect.registeredVehiclesButton', 'KAYITLI ARAÇLARIM').toUpperCase()}
          </Text>
        </TouchableOpacity>

        {isConnected && (
          <TouchableOpacity 
            style={{
              backgroundColor: `${colors.red}1A`,
              borderColor: `${colors.red}4D`,
              borderWidth: 1,
              borderRadius: scaleMod(6),
              paddingHorizontal: scaleWidth(10),
              paddingVertical: scaleHeight(6),
            }}
            onPress={onDisconnectPress}
            activeOpacity={0.4}
          >
            <Text 
              allowFontScaling={false}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.7}
              style={{ color: colors.red, fontSize: scaleFont(9.5), fontWeight: '900', fontFamily: MONO }}
            >
              🔌 {t('connection.disconnect', 'DISCONNECT').toUpperCase()}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}
