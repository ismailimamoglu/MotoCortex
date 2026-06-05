import React from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform, Text } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useThemeColors } from '../theme';
import { useResponsive } from '../hooks/useResponsive';
import { useTelemetryStore } from '../store/useTelemetryStore';
import SearchableVehicleSelect from './SearchableVehicleSelect';

interface VehicleSelectModalProps {
  visible: boolean;
  onDisconnect: () => void;
}

export default function VehicleSelectModal({ visible, onDisconnect }: VehicleSelectModalProps) {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const { s: scaleWidth, vs: scaleHeight, ms: scaleMod, fs: scaleFont, isTablet } = useResponsive();
  const setActiveSessionVehicle = useTelemetryStore((state) => state.setActiveSessionVehicle);
  const activeSessionVehicle = useTelemetryStore((state) => state.activeSessionVehicle);

  const MONO = Platform.OS === 'ios' ? 'Menlo' : 'monospace';

  if (!visible) {
    return null;
  }

  const handleConfirm = (brand: string, model: string, year: number) => {
    setActiveSessionVehicle({
      brand,
      model,
      year,
    });
  };

  return (
    <View style={styles.overlay}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
        style={styles.keyboardContainer}
      >
        <View style={[
          styles.container, 
          { 
            backgroundColor: colors.bg, 
            borderColor: colors.border,
            width: isTablet ? 500 : '100%',
            alignSelf: 'center',
          }
        ]}>
          <Text style={[styles.title, { color: colors.textPri, fontFamily: MONO, fontSize: scaleFont(15) }]}>
            {t('vehicleSelect.title', 'TEŞHİS DOĞRULUĞUNU ARTIRMAK İÇİN ARACINIZI SEÇİN')}
          </Text>
          <Text style={[styles.subtitle, { color: colors.textSec, fontFamily: MONO, fontSize: scaleFont(10.5) }]}>
            {t('vehicleSelect.subtitle', 'Doğru arıza tespiti ve protokol eşleşmesi için lütfen araç detaylarını belirtin.')}
          </Text>

          <SearchableVehicleSelect 
            confirmText={t('vehicleSelect.confirm', 'DEVAM ET')}
            cancelText={t('vehicleSelect.disconnect', 'BAĞLANTIYI KES')}
            onCancel={onDisconnect}
            onConfirm={handleConfirm}
            initialBrandId={activeSessionVehicle?.brand}
            initialModelId={activeSessionVehicle?.model}
            initialYear={activeSessionVehicle?.year}
          />
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    padding: 24,
    zIndex: 99999,
    elevation: 99999,
  },
  keyboardContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  container: {
    borderRadius: 16,
    borderWidth: 1.5,
    padding: 20,
    maxHeight: '90%',
  },
  title: {
    fontWeight: '900',
    textAlign: 'center',
    letterSpacing: 1,
    marginBottom: 8,
  },
  subtitle: {
    textAlign: 'center',
    lineHeight: 16,
    marginBottom: 20,
  }
});
