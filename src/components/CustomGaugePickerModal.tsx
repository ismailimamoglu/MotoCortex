// src/components/CustomGaugePickerModal.tsx
// MotoCortex v7.9.9 - Dynamic 32-Sensor Live Gauge Customizer Modal

import React, { useState, useMemo } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Platform,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useThemeColors } from '../theme';
import { useBluetoothStore } from '../store/useBluetoothStore';
import PollingOrchestrator from '../core/connection/PollingOrchestrator';

const MONO = Platform.OS === 'ios' ? 'System' : 'sans-serif';

export interface GaugeSensorOption {
  pid: string;
  nameKey: string;
  defaultName: string;
  unit: string;
  category: 'ENGINE' | 'AIR_TURBO' | 'FUEL' | 'TEMP_EMISSION' | 'PERFORMANCE';
  color: string;
  min: number;
  max: number;
}

export const ALL_AVAILABLE_GAUGES: GaugeSensorOption[] = [
  // 1. ENGINE & SPEED
  { pid: '0C', nameKey: 'sensors.rpm', defaultName: 'Motor Devri', unit: 'RPM', category: 'ENGINE', color: '#00E5FF', min: 0, max: 8000 },
  { pid: '0D', nameKey: 'sensors.speed', defaultName: 'Araç Hızı', unit: 'km/h', category: 'ENGINE', color: '#00E5FF', min: 0, max: 260 },
  { pid: '05', nameKey: 'sensors.coolant', defaultName: 'Motor Sıcaklığı', unit: '°C', category: 'ENGINE', color: '#00E676', min: -40, max: 130 },
  { pid: 'ATRV', nameKey: 'sensors.voltage', defaultName: 'Akü Voltajı', unit: 'V', category: 'ENGINE', color: '#00E676', min: 0, max: 16 },
  { pid: '11', nameKey: 'sensors.throttle', defaultName: 'Gaz Kelebeği', unit: '%', category: 'ENGINE', color: '#FFB300', min: 0, max: 100 },
  { pid: '04', nameKey: 'sensors.engineLoad', defaultName: 'Motor Yükü', unit: '%', category: 'ENGINE', color: '#2979FF', min: 0, max: 100 },

  // 2. AIR & TURBO
  { pid: '0B', nameKey: 'sensors.map', defaultName: 'Turbo / Manifold Basıncı', unit: 'kPa', category: 'AIR_TURBO', color: '#FF3D00', min: 0, max: 255 },
  { pid: '10', nameKey: 'sensors.maf', defaultName: 'Kütle Hava Akışı (MAF)', unit: 'g/s', category: 'AIR_TURBO', color: '#7C4DFF', min: 0, max: 300 },
  { pid: '0F', nameKey: 'sensors.iat', defaultName: 'Emme Havası Sıcaklığı', unit: '°C', category: 'AIR_TURBO', color: '#00B0FF', min: -40, max: 120 },
  { pid: '33', nameKey: 'sensors.baro', defaultName: 'Barometrik Basınç', unit: 'kPa', category: 'AIR_TURBO', color: '#78909C', min: 0, max: 120 },

  // 3. FUEL & INJECTION
  { pid: '23', nameKey: 'sensors.fuelRail', defaultName: 'Yakıt Ray Basıncı (CRDI)', unit: 'Bar', category: 'FUEL', color: '#FF9100', min: 0, max: 2000 },
  { pid: '06', nameKey: 'sensors.stft1', defaultName: 'Kısa Yakıt Trimi (STFT 1)', unit: '%', category: 'FUEL', color: '#FF6D00', min: -30, max: 30 },
  { pid: '07', nameKey: 'sensors.ltft1', defaultName: 'Uzun Yakıt Trimi (LTFT 1)', unit: '%', category: 'FUEL', color: '#FF6D00', min: -30, max: 30 },
  { pid: '08', nameKey: 'sensors.stft2', defaultName: 'Kısa Yakıt Trimi (STFT 2)', unit: '%', category: 'FUEL', color: '#FF6D00', min: -30, max: 30 },
  { pid: '09', nameKey: 'sensors.ltft2', defaultName: 'Uzun Yakıt Trimi (LTFT 2)', unit: '%', category: 'FUEL', color: '#FF6D00', min: -30, max: 30 },
  { pid: '2F', nameKey: 'sensors.fuelLevel', defaultName: 'Yakıt Depo Seviyesi', unit: '%', category: 'FUEL', color: '#FFEA00', min: 0, max: 100 },
  { pid: '52', nameKey: 'sensors.ethanol', defaultName: 'Etanol / Biyo-Yakıt Oranı', unit: '%', category: 'FUEL', color: '#64DD17', min: 0, max: 100 },

  // 4. TEMPERATURE & EMISSION
  { pid: '5C', nameKey: 'sensors.oilTemp', defaultName: 'Motor Yağ Sıcaklığı', unit: '°C', category: 'TEMP_EMISSION', color: '#FF5252', min: -40, max: 160 },
  { pid: '3C', nameKey: 'sensors.catalystTemp', defaultName: 'Katalizör Sıcaklığı', unit: '°C', category: 'TEMP_EMISSION', color: '#FF1744', min: -40, max: 1000 },
  { pid: '7C', nameKey: 'sensors.transTemp', defaultName: 'Şanzıman Yağ Sıcaklığı', unit: '°C', category: 'TEMP_EMISSION', color: '#FF5252', min: -40, max: 160 },
  { pid: '78', nameKey: 'sensors.egt', defaultName: 'Egzoz Gazı Sıcaklığı (EGT)', unit: '°C', category: 'TEMP_EMISSION', color: '#D50000', min: -40, max: 1000 },
  { pid: '7A', nameKey: 'sensors.dpfPressure', defaultName: 'DPF Fark Basıncı', unit: 'kPa', category: 'TEMP_EMISSION', color: '#FFA000', min: 0, max: 100 },
  { pid: '9B', nameKey: 'sensors.adblue', defaultName: 'AdBlue / DEF Seviyesi', unit: '%', category: 'TEMP_EMISSION', color: '#00E5FF', min: 0, max: 100 },
  { pid: '83', nameKey: 'sensors.nox', defaultName: 'NOx Egzoz Emisyon Sensörü', unit: 'ppm', category: 'TEMP_EMISSION', color: '#AEEA00', min: 0, max: 1000 },
  { pid: '46', nameKey: 'sensors.ambientTemp', defaultName: 'Dış Ortam Sıcaklığı', unit: '°C', category: 'TEMP_EMISSION', color: '#80D8FF', min: -40, max: 60 },

  // 5. PERFORMANCE & PEDAL
  { pid: '0E', nameKey: 'sensors.timingAdvance', defaultName: 'Ateşleme Avansı Açısı', unit: '°', category: 'PERFORMANCE', color: '#C51162', min: -20, max: 60 },
  { pid: '49', nameKey: 'sensors.pedalD', defaultName: 'Gaz Pedalı Konumu D', unit: '%', category: 'PERFORMANCE', color: '#FF6D00', min: 0, max: 100 },
  { pid: '4A', nameKey: 'sensors.pedalE', defaultName: 'Gaz Pedalı Konumu E', unit: '%', category: 'PERFORMANCE', color: '#FF6D00', min: 0, max: 100 },
  { pid: '47', nameKey: 'sensors.throttleB', defaultName: 'Mutlak Gaz Kelebeği B', unit: '%', category: 'PERFORMANCE', color: '#FFB300', min: 0, max: 100 },
  { pid: '62', nameKey: 'sensors.engineTorque', defaultName: 'Anlık Motor Tork Çıkışı', unit: '%', category: 'PERFORMANCE', color: '#00E676', min: -125, max: 125 },
  { pid: '61', nameKey: 'sensors.driverTorque', defaultName: 'Sürücü Talep Torku', unit: '%', category: 'PERFORMANCE', color: '#00E5FF', min: -125, max: 125 },
  { pid: '5B', nameKey: 'sensors.hybridSoc', defaultName: 'Hibrit/EV Batarya Şarjı (SOC)', unit: '%', category: 'PERFORMANCE', color: '#00C853', min: 0, max: 100 },
];

interface CustomGaugePickerModalProps {
  visible: boolean;
  onClose: () => void;
}

export const CustomGaugePickerModal: React.FC<CustomGaugePickerModalProps> = ({
  visible,
  onClose,
}) => {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const activeGaugePids = useBluetoothStore((s) => s.activeGaugePids);
  const setActiveGaugePids = useBluetoothStore((s) => s.setActiveGaugePids);
  const status = useBluetoothStore((s) => s.status);

  const [selectedPids, setSelectedPids] = useState<string[]>(activeGaugePids || ['0C', '0D', '05', 'ATRV', '11', '04']);
  const [selectedCat, setSelectedCat] = useState<'ALL' | GaugeSensorOption['category']>('ALL');

  React.useEffect(() => {
    if (visible && activeGaugePids) {
      setSelectedPids(activeGaugePids);
    }
  }, [visible, activeGaugePids]);

  const filteredSensors = useMemo(() => {
    if (selectedCat === 'ALL') return ALL_AVAILABLE_GAUGES;
    return ALL_AVAILABLE_GAUGES.filter((s) => s.category === selectedCat);
  }, [selectedCat]);

  const handleToggle = (pid: string) => {
    if (selectedPids.includes(pid)) {
      if (selectedPids.length <= 1) return; // En az 1 sensör kalmalı
      setSelectedPids(selectedPids.filter((p) => p !== pid));
    } else {
      if (selectedPids.length >= 6) {
        // En fazla 6 gösterge seçilebilir
        const replaced = [...selectedPids.slice(1), pid];
        setSelectedPids(replaced);
      } else {
        setSelectedPids([...selectedPids, pid]);
      }
    }
  };

  const handleSaveAndApply = () => {
    setActiveGaugePids(selectedPids);
    if (status === 'connected') {
      PollingOrchestrator.stopPolling();
      setTimeout(() => {
        PollingOrchestrator.startPolling();
      }, 50);
    }
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={[styles.modalCard, { backgroundColor: colors.bg, borderColor: colors.border }]}>
          {/* Header */}
          <View style={styles.header}>
            <View style={{ flex: 1, marginRight: 10 }}>
              <Text numberOfLines={1} adjustsFontSizeToFit style={[styles.title, { color: colors.textPri }]}>
                {String(t('sensors.customGaugesTitle', 'GÖSTERGELERİ DÜZENLE'))}
              </Text>
              <Text numberOfLines={2} style={[styles.subtitle, { color: colors.textSec }]}>
                {String(t('sensors.customGaugesSubtitle', 'Kadranda görünmesini istediğiniz 6 sensörü seçin (Seçili: {{count}}/6)', { count: selectedPids.length }))}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={[styles.closeBtn, { backgroundColor: colors.card }]}>
              <Text style={{ color: colors.textPri, fontWeight: 'bold' }}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Category Filter Pills */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.catScroll}>
            {[
              { id: 'ALL', label: String(t('sensors.allSensors', 'Tümü (32)')) },
              { id: 'ENGINE', label: String(t('sensors.catEngine', 'Motor')) },
              { id: 'AIR_TURBO', label: String(t('sensors.catAirTurbo', 'Turbo & Hava')) },
              { id: 'FUEL', label: String(t('sensors.catFuel', 'Yakıt')) },
              { id: 'TEMP_EMISSION', label: String(t('sensors.catEmission', 'Emisyon & Isı')) },
              { id: 'PERFORMANCE', label: String(t('sensors.catPerf', 'Performans')) },
            ].map((cat) => {
              const isSelected = selectedCat === cat.id;
              return (
                <TouchableOpacity
                  key={cat.id}
                  onPress={() => setSelectedCat(cat.id as any)}
                  style={[
                    styles.catPill,
                    {
                      backgroundColor: isSelected ? colors.cyan : colors.card,
                      borderColor: isSelected ? colors.cyan : colors.border,
                    },
                  ]}
                >
                  <Text style={[styles.catPillText, { color: isSelected ? '#FFFFFF' : colors.textSec }]}>
                    {cat.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Sensor List */}
          <ScrollView style={styles.listScroll} showsVerticalScrollIndicator={false}>
            {filteredSensors.map((item) => {
              const isChecked = selectedPids.includes(item.pid);
              const name = String(t(item.nameKey, item.defaultName));
              return (
                <TouchableOpacity
                  key={item.pid}
                  onPress={() => handleToggle(item.pid)}
                  activeOpacity={0.7}
                  style={[
                    styles.sensorCard,
                    {
                      backgroundColor: isChecked ? `${colors.cyan}15` : colors.card,
                      borderColor: isChecked ? colors.cyan : colors.border,
                    },
                  ]}
                >
                  <View style={styles.sensorInfo}>
                    <View style={[styles.badge, { backgroundColor: `${item.color}20`, borderColor: item.color }]}>
                      <Text style={[styles.badgeText, { color: item.color }]}>
                        {item.pid === 'ATRV' ? 'VOLT' : `01 ${item.pid}`}
                      </Text>
                    </View>
                    <View style={{ flex: 1, marginLeft: 10 }}>
                      <Text numberOfLines={2} ellipsizeMode="tail" style={[styles.sensorName, { color: colors.textPri }]}>{name}</Text>
                      <Text numberOfLines={1} style={[styles.sensorMeta, { color: colors.textSec }]}>
                        {item.unit} | {item.min} .. {item.max}
                      </Text>
                    </View>
                  </View>

                  <View
                    style={[
                      styles.checkbox,
                      {
                        backgroundColor: isChecked ? colors.cyan : 'transparent',
                        borderColor: isChecked ? colors.cyan : colors.border,
                      },
                    ]}
                  >
                    {isChecked && <Text style={styles.checkmark}>✓</Text>}
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Footer Actions */}
          <View style={[styles.footer, { borderTopColor: colors.border }]}>
            <TouchableOpacity onPress={handleSaveAndApply} style={[styles.applyBtn, { backgroundColor: colors.cyan }]}>
              <Text 
                numberOfLines={1} 
                adjustsFontSizeToFit 
                minimumFontScale={0.75} 
                style={styles.applyBtnText}
              >
                {String(t('sensors.saveGaugesBtn', 'KAYDET VE UYGULA ({{count}} SENSÖR)', { count: selectedPids.length }))}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    maxHeight: '85%',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: 1,
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: '900',
    fontFamily: MONO,
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 11,
    fontFamily: MONO,
    marginTop: 2,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  catScroll: {
    maxHeight: 38,
    marginBottom: 12,
  },
  catPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
    marginRight: 8,
  },
  catPillText: {
    fontSize: 11,
    fontWeight: '700',
    fontFamily: MONO,
  },
  listScroll: {
    maxHeight: 380,
  },
  sensorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 8,
  },
  sensorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  badgeText: {
    fontSize: 9.5,
    fontWeight: '900',
    fontFamily: MONO,
  },
  sensorName: {
    fontSize: 12.5,
    fontWeight: '800',
  },
  sensorMeta: {
    fontSize: 10,
    fontFamily: MONO,
    marginTop: 2,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
  },
  checkmark: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '900',
  },
  footer: {
    paddingTop: 12,
    borderTopWidth: 1,
    marginTop: 8,
  },
  applyBtn: {
    paddingVertical: 13,
    borderRadius: 10,
    alignItems: 'center',
  },
  applyBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '900',
    fontFamily: MONO,
    letterSpacing: 0.5,
  },
});
