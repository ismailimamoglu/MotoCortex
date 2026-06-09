import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Platform, TouchableOpacity, ActivityIndicator, ScrollView, TextInput, Alert } from 'react-native';
import Animated from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import { useBluetoothStore } from '../store/useBluetoothStore';
import { useThemeColors } from '../theme';
import { useAppStore } from '../store/useAppStore';
import { useResponsive } from '../hooks/useResponsive';
import { useTelemetryStore } from '../store/useTelemetryStore';
import { getRegisteredVehicles, saveRegisteredVehicle, deleteRegisteredVehicle, SelectedVehicle, getVehicleOperations, VehicleOperation } from '../store/garageStore';
import { getLocalizedVehicleBrand, getLocalizedVehicleModel, toSnakeCase } from '../utils/vehicleStandardizer';
import { BRANDS, MODELS_BY_BRAND, YEARS } from '../data/vehicleData';

const MONO = Platform.OS === 'ios' ? 'Menlo' : 'monospace';

interface LiveEngineHeroProps {
  onConnectPress: () => void;
  onGoToSensors?: () => void;
  onGoToExpertise?: () => void;
}

function parseTurkishDate(dateStr: string): Date | null {
  if (!dateStr) return null;
  const parts = dateStr.split(' ');
  if (parts.length < 4) return null;
  const day = parseInt(parts[0], 10);
  const monthStr = parts[1].toLowerCase();
  const year = parseInt(parts[2], 10);
  const timePart = parts[3];
  
  const trMonths: Record<string, number> = {
    ocak: 0, subat: 1, şubat: 1, mart: 2, nisan: 3, mayis: 4, mayıs: 4, haziran: 5,
    temmuz: 6, agustos: 7, ağustos: 7, eylul: 8, eylül: 8, ekim: 9, kasim: 10, kasım: 10, aralik: 11, aralık: 11
  };
  
  const month = trMonths[monthStr];
  if (month === undefined || isNaN(day) || isNaN(year)) return null;
  
  const [hour, minute] = timePart.split(':').map(x => parseInt(x, 10));
  if (isNaN(hour) || isNaN(minute)) {
    return new Date(year, month, day);
  }
  return new Date(year, month, day, hour, minute);
}

function VehicleOperationsHistory({ vin, colors, scaleFont }: { vin?: string; colors: any; scaleFont: (size: number) => number }) {
  const { t } = useTranslation();
  const [operations, setOperations] = React.useState<VehicleOperation[]>([]);
  const [isExpanded, setIsExpanded] = React.useState(false);
  const language = useAppStore((s) => s.language);

  React.useEffect(() => {
    if (vin) {
      getVehicleOperations(vin).then(setOperations);
    }
  }, [vin]);

  if (!vin || operations.length === 0) return null;

  const localeMap: Record<string, string> = {
    tr: 'tr-TR',
    en: 'en-US',
    pt: 'pt-PT',
    es: 'es-ES',
    de: 'de-DE',
    fr: 'fr-FR',
    it: 'it-IT',
    ru: 'ru-RU',
    zh: 'zh-CN',
    nl: 'nl-NL',
    ja: 'ja-JP',
    ko: 'ko-KR',
    pl: 'pl-PL',
    id: 'id-ID',
    ar: 'ar-SA',
    cs: 'cs-CZ',
    da: 'da-DK',
    el: 'el-GR',
    fi: 'fi-FI',
    hu: 'hu-HU',
    no: 'no-NO',
    ro: 'ro-RO',
    sv: 'sv-SE',
    th: 'th-TH',
    uk: 'uk-UA'
  };

  const appLocale = localeMap[language] || language;

  return (
    <View style={{ marginTop: 6, borderTopWidth: 1, borderTopColor: `${colors.textPri}0D`, paddingTop: 6 }}>
      <TouchableOpacity 
        onPress={() => setIsExpanded(!isExpanded)} 
        style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 2 }}
        activeOpacity={0.7}
      >
        <Text style={{ color: colors.cyan, fontSize: scaleFont(9.5), fontFamily: MONO, fontWeight: 'bold' }}>
          📋 {t('common.operations', 'İŞLEMLER').toUpperCase()} ({operations.length})
        </Text>
        <Text style={{ color: colors.cyan, fontSize: scaleFont(8.5), fontFamily: MONO, fontWeight: 'bold' }}>
          {isExpanded ? '▲' : '▼'}
        </Text>
      </TouchableOpacity>
      
      {isExpanded && (
        <View style={{ marginTop: 2, paddingLeft: 4 }}>
          {operations.map((op, idx) => {
            let dateObj: Date | null = op.timestamp ? new Date(op.timestamp) : null;
            if (!dateObj && op.dateString) {
              dateObj = parseTurkishDate(op.dateString);
            }
            const displayDate = dateObj ? dateObj.toLocaleDateString(appLocale, {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            }) : op.dateString;

            const opName = op.type === 'clear_dtc' 
              ? t('vehicleSelect.operations.clearDtc', 'Hata Kodları Silindi')
              : op.type === 'fuel_adaptation'
                ? t('vehicleSelect.operations.fuelAdaptation', 'Yakıt Adaptasyonu')
                : t('vehicleSelect.operations.ecuReset', 'ECU Sıfırlama');

            return (
              <Text key={idx} style={{ color: colors.textSec, fontSize: scaleFont(9), fontFamily: MONO, marginTop: 2 }}>
                • {displayDate} - {opName}
              </Text>
            );
          })}
        </View>
      )}
    </View>
  );
}

export default function LiveEngineHero({ onConnectPress, onGoToSensors, onGoToExpertise }: LiveEngineHeroProps) {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const { s: scaleWidth, vs: scaleHeight, ms: scaleMod, fs: scaleFont, isTablet, height } = useResponsive();

  const isSmallPhone = height < 820;

  // Telemetry Store (Active Vehicle)
  const activeSessionVehicle = useTelemetryStore((state) => state.activeSessionVehicle);
  const setActiveSessionVehicle = useTelemetryStore((state) => state.setActiveSessionVehicle);

  // States for registered vehicle picker
  const [registeredVehicles, setRegisteredVehicles] = useState<SelectedVehicle[]>([]);
  const [showRegisteredListScreen, setShowRegisteredListScreen] = useState(false);

  // Selection states for inline vehicle builder
  const [selectedBrand, setSelectedBrand] = useState<string>('');
  const [selectedModel, setSelectedModel] = useState<string>('');
  const [selectedYear, setSelectedYear] = useState<string>('');

  const [customBrand, setCustomBrand] = useState<string>('');
  const [customModel, setCustomModel] = useState<string>('');
  const [customYear, setCustomYear] = useState<string>('');

  // Dropdown visibility
  const [showRegDropdown, setShowRegDropdown] = useState(false);
  const [showBrandDropdown, setShowBrandDropdown] = useState(false);
  const [showModelDropdown, setShowModelDropdown] = useState(false);
  const [showYearDropdown, setShowYearDropdown] = useState(false);

  // Search queries
  const [brandSearchQuery, setBrandSearchQuery] = useState<string>('');
  const [modelSearchQuery, setModelSearchQuery] = useState<string>('');

  useEffect(() => {
    getRegisteredVehicles().then(setRegisteredVehicles);
  }, [activeSessionVehicle]);

  useEffect(() => {
    if (activeSessionVehicle) {
      setShowRegisteredListScreen(false);
    }
  }, [activeSessionVehicle]);

  // Real values from Bluetooth Store to update connection status footer
  const ecuStatus = useBluetoothStore((state) => state.ecuStatus);
  const status = useBluetoothStore((state) => state.status);
  const isCloneDevice = useBluetoothStore((state) => state.isCloneDevice);
  const lastDeviceName = useBluetoothStore((state) => state.lastDeviceName);
  const suggestedBrandFromVin = useBluetoothStore((state) => state.suggestedBrandFromVin);
  const setSuggestedBrandFromVin = useBluetoothStore((state) => state.setSuggestedBrandFromVin);
  const isSimulationMode = useAppStore((state) => state.isSimulationMode);

  useEffect(() => {
    if (suggestedBrandFromVin && !activeSessionVehicle) {
      setSelectedBrand(suggestedBrandFromVin);
      setSuggestedBrandFromVin(null);
      setShowBrandDropdown(false);
      setShowModelDropdown(true);
    }
  }, [suggestedBrandFromVin, activeSessionVehicle]);

  const isConnected = ecuStatus === 'connected';
  const isScanning = status === 'scanning';

  const isPressable = !!activeSessionVehicle;

  // Sort brands alphabetically based on localized string in current language
  const sortedBrands = React.useMemo(() => {
    return [...BRANDS]
      .filter((b) => b !== 'other')
      .sort((a, b) => t(`brands.${a}`, a).localeCompare(t(`brands.${b}`, b)))
      .concat(['other']);
  }, [t]);

  // Filter brands based on search query
  const filteredBrands = React.useMemo(() => {
    if (!brandSearchQuery) return sortedBrands;
    const query = brandSearchQuery.toLowerCase();
    return sortedBrands.filter((brandKey) =>
      brandKey === 'other' || t(`brands.${brandKey}`, brandKey).toLowerCase().includes(query)
    );
  }, [brandSearchQuery, sortedBrands, t]);

  // Pre-calculate model options
  const modelOptions = React.useMemo(() => {
    if (!selectedBrand) return [];
    const rawModels = MODELS_BY_BRAND[selectedBrand] || ['other'];
    return rawModels.map((m) => {
      if (m === 'other') {
        return { label: t('brands.other', 'Diğer'), value: 'other' };
      }
      return { label: m, value: toSnakeCase(m) };
    });
  }, [selectedBrand, t]);

  // Filter models based on search query
  const filteredModels = React.useMemo(() => {
    if (!modelSearchQuery) return modelOptions;
    const query = modelSearchQuery.toLowerCase();
    return modelOptions.filter((opt) =>
      opt.value === 'other' || opt.label.toLowerCase().includes(query)
    );
  }, [modelSearchQuery, modelOptions]);

  const selectedModelLabel = React.useMemo(() => {
    if (!selectedModel) return '';
    if (selectedModel === 'other') return t('brands.other', 'Diğer');
    const matched = modelOptions.find((opt) => opt.value === selectedModel);
    return matched ? matched.label : selectedModel;
  }, [selectedModel, modelOptions, t]);

  // Reset model when brand changes
  useEffect(() => {
    setSelectedModel('');
    setCustomModel('');
    setModelSearchQuery('');
  }, [selectedBrand]);

  const handleCreateVehicle = async (brand: string, model: string, year: number) => {
    const newVehicle = { brand, model, year };
    await saveRegisteredVehicle(newVehicle);
    setActiveSessionVehicle(newVehicle);
    // Reset selection inputs
    setSelectedBrand('');
    setSelectedModel('');
    setSelectedYear('');
    setCustomBrand('');
    setCustomModel('');
    setCustomYear('');
  };

  const handleDeleteRegistered = (v: SelectedVehicle) => {
    Alert.alert(
      t('common.confirm', 'Onay'),
      t('vehicleSelect.deleteConfirm', 'Bu aracı kayıtlı araçlardan silmek istediğinize emin misiniz?'),
      [
        { text: t('common.cancel', 'İptal'), style: 'cancel' },
        { 
          text: t('common.delete', 'Sil'), 
          style: 'destructive',
          onPress: async () => {
            await deleteRegisteredVehicle(v);
            const updated = await getRegisteredVehicles();
            setRegisteredVehicles(updated);
            if (activeSessionVehicle && 
                activeSessionVehicle.brand.toLowerCase() === v.brand.toLowerCase() &&
                activeSessionVehicle.model.toLowerCase() === v.model.toLowerCase() &&
                activeSessionVehicle.year === v.year) {
              setActiveSessionVehicle(null);
            }
            if (updated.length === 0) {
              setShowRegisteredListScreen(false);
            }
          }
        }
      ]
    );
  };

  // Responsive styles
  const sDyn = React.useMemo(() => {
    return {
      heroContainer: {
        borderWidth: scaleMod(2.5),
        borderRadius: scaleMod(20),
        overflow: 'visible' as const,
        marginVertical: scaleHeight(12),
      },
      mainDisplay: {
        paddingHorizontal: scaleWidth(20),
        paddingVertical: scaleHeight(20),
        zIndex: 10,
      },
      vehicleLabel: {
        fontSize: scaleFont(9.5),
        fontWeight: '800' as const,
        letterSpacing: 1.5,
        color: colors.textSec,
        fontFamily: MONO,
        marginBottom: scaleHeight(6),
      },
      vehicleName: {
        fontSize: scaleFont(18),
        fontWeight: '900' as const,
        color: colors.textPri,
        fontFamily: MONO,
      },
      vehicleYear: {
        fontSize: scaleFont(12),
        color: colors.cyan,
        fontFamily: MONO,
        fontWeight: '700' as const,
        marginTop: scaleHeight(2),
      },
      changeBtn: {
        marginTop: scaleHeight(8),
        alignSelf: 'flex-start' as const,
      },
      changeBtnText: {
        color: colors.red,
        fontSize: scaleFont(10),
        fontWeight: '900' as const,
        fontFamily: MONO,
      },
      dropdownTrigger: {
        flexDirection: 'row' as const,
        justifyContent: 'space-between' as const,
        alignItems: 'center' as const,
        borderWidth: 1,
        borderRadius: 8,
        paddingHorizontal: scaleWidth(12),
        paddingVertical: scaleHeight(10),
        marginTop: scaleHeight(4),
      },
      dropdownTriggerText: {
        fontFamily: MONO,
        fontSize: scaleFont(11),
        fontWeight: '700' as const,
        color: colors.textPri,
      },
      dropdownList: {
        borderWidth: 1.5,
        borderRadius: 8,
        marginTop: scaleHeight(2),
      },
      dropdownItem: {
        paddingHorizontal: scaleWidth(12),
        paddingVertical: scaleHeight(10),
        borderBottomWidth: 1,
      },
      footerStatus: {
        flexDirection: 'row' as const,
        alignItems: 'center' as const,
        paddingHorizontal: scaleWidth(20),
        paddingVertical: scaleHeight(12),
        borderTopWidth: 1,
        justifyContent: 'space-between' as const,
        borderBottomLeftRadius: scaleMod(18),
        borderBottomRightRadius: scaleMod(18),
        zIndex: 1,
      },
      statusDot: {
        width: scaleMod(8),
        height: scaleMod(8),
        borderRadius: scaleMod(4),
        marginRight: scaleWidth(10),
      },
      statusText: {
        flex: 1,
        fontSize: scaleFont(11),
        fontWeight: '800' as const,
        letterSpacing: 1,
        fontFamily: MONO,
      },
      arrow: {
        fontSize: scaleFont(16),
        fontWeight: '900' as const,
      },
      healthSection: {
        marginTop: scaleHeight(16),
        width: '100%' as const,
      },
      sectionTitle: {
        fontSize: scaleFont(9.5),
        fontWeight: '800' as const,
        letterSpacing: 2,
        marginBottom: scaleHeight(8),
        fontFamily: MONO,
        color: colors.textSec,
      },
      healthCard: {
        backgroundColor: `${colors.textPri}05`,
        borderColor: colors.cardBorder,
        borderWidth: 1.2,
        borderRadius: scaleMod(12),
        padding: scaleMod(12),
        gap: scaleMod(6),
      },
      healthRow: {
        flexDirection: 'row' as const,
        justifyContent: 'space-between' as const,
        alignItems: 'center' as const,
        paddingVertical: scaleHeight(2),
      },
      healthLabel: {
        fontSize: scaleFont(11),
        color: colors.textSec,
        fontFamily: MONO,
      },
      healthValue: {
        fontSize: scaleFont(11),
        color: colors.textPri,
        fontFamily: MONO,
        fontWeight: '700' as const,
      },
    };
  }, [scaleWidth, scaleHeight, scaleMod, scaleFont, colors]);

  const containerStyle = [
    sDyn.heroContainer, 
    { backgroundColor: colors.cardBg, borderColor: colors.cardBorder },
    isSmallPhone && { marginVertical: 8, borderRadius: 12, borderWidth: 1.5 }
  ];

  const footerStatusStyle = [
    sDyn.footerStatus,
    {
      backgroundColor: isConnected ? `${colors.green}0D` : `${colors.amber}0D`,
      borderTopColor: isConnected ? `${colors.green}26` : `${colors.amber}26`,
    },
    isSmallPhone && { paddingHorizontal: 16, paddingVertical: 8 }
  ];

  const statusTextStyle = [
    sDyn.statusText, 
    { color: isConnected ? colors.green : (isScanning ? colors.cyan : colors.amber) },
    isSmallPhone && { fontSize: 9, letterSpacing: 0.5 }
  ];

  const statusTextStr = isConnected
    ? t('dashboard.connectedDevice')
    : isScanning
      ? t('hub.scanningHardware')
      : isPressable
        ? t('dashboard.selectDevice')
        : t('vehicleSelect.selectVehiclePrompt', 'LÜTFEN ÖNCE ARACI SEÇİN');

  return (
    <ScrollView 
      style={{ flex: 1 }} 
      contentContainerStyle={{ paddingHorizontal: scaleWidth(16), paddingTop: scaleHeight(8), paddingBottom: scaleHeight(40) }}
      showsVerticalScrollIndicator={false}
      bounces={false}
    >
      <Animated.View style={[containerStyle, { marginVertical: 0 }]}>
        <View style={sDyn.mainDisplay}>
          {showRegisteredListScreen ? (
            <View style={{ gap: scaleHeight(12) }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: scaleHeight(4) }}>
                <Text style={sDyn.vehicleLabel}>{t('vehicleSelect.registeredVehicles', 'KAYITLI ARAÇLARIM').toUpperCase()}</Text>
                <TouchableOpacity 
                  onPress={() => setShowRegisteredListScreen(false)}
                  style={{ paddingHorizontal: 12, paddingVertical: 6, backgroundColor: `${colors.textPri}14`, borderRadius: 6 }}
                  activeOpacity={0.7}
                >
                  <Text style={{ color: colors.textPri, fontFamily: MONO, fontSize: scaleFont(10), fontWeight: 'bold' }}>
                    ← {t('common.back', 'Geri').toUpperCase()}
                  </Text>
                </TouchableOpacity>
              </View>
              
              <ScrollView style={{ maxHeight: scaleHeight(260) }} nestedScrollEnabled={true} keyboardShouldPersistTaps="handled">
                {registeredVehicles.length === 0 ? (
                  <View style={{ padding: scaleMod(20), alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ color: colors.textSec, fontFamily: MONO, fontSize: scaleFont(11), textAlign: 'center' }}>
                      {t('vehicleSelect.noRegisteredVehicles', 'Kayıtlı araç bulunamadı.')}
                    </Text>
                  </View>
                ) : (
                  registeredVehicles.map((v, i) => (
                    <View 
                      key={i}
                      style={{ 
                        flexDirection: 'column',
                        backgroundColor: `${colors.textPri}05`,
                        borderColor: colors.cardBorder,
                        borderWidth: 1.2,
                        borderRadius: 10,
                        padding: scaleMod(12),
                        marginBottom: scaleHeight(8),
                      }}
                    >
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <TouchableOpacity 
                          style={{ flex: 1, marginRight: 12 }}
                          onPress={() => {
                            setActiveSessionVehicle(v);
                            setShowRegisteredListScreen(false);
                          }}
                          activeOpacity={0.7}
                        >
                          <Text style={{ color: colors.textPri, fontFamily: MONO, fontSize: scaleFont(12), fontWeight: '800' }} numberOfLines={1}>
                            🛞 {getLocalizedVehicleBrand(v.brand, t)} {getLocalizedVehicleModel(v.model)}
                          </Text>
                          <Text style={{ color: colors.cyan, fontFamily: MONO, fontSize: scaleFont(10), marginTop: 2, fontWeight: '700' }}>
                            {v.year}
                          </Text>
                          {v.vin && (
                            <Text style={{ color: colors.textSec, fontFamily: MONO, fontSize: scaleFont(9.5), marginTop: 2 }}>
                              {t('common.chassis', 'Şasi')}: {v.vin}
                            </Text>
                          )}
                        </TouchableOpacity>
                        
                        <TouchableOpacity 
                          onPress={() => handleDeleteRegistered(v)}
                          style={{ 
                            backgroundColor: `${colors.red}1A`, 
                            borderColor: `${colors.red}4D`,
                            borderWidth: 1,
                            paddingHorizontal: scaleWidth(10), 
                            paddingVertical: scaleHeight(6), 
                            borderRadius: 6,
                          }}
                          activeOpacity={0.7}
                        >
                          <Text style={{ color: colors.red, fontFamily: MONO, fontSize: scaleFont(9.5), fontWeight: '900' }}>
                            🗑️ {t('common.delete', 'SİL').toUpperCase()}
                          </Text>
                        </TouchableOpacity>
                      </View>
                      <VehicleOperationsHistory vin={v.vin} colors={colors} scaleFont={scaleFont} />
                    </View>
                  ))
                )}
              </ScrollView>
            </View>
          ) : activeSessionVehicle ? (
            <View>
              <Text style={sDyn.vehicleLabel}>{t('vehicleSelect.selectedVehicle', 'SEÇİLİ ARAÇ')}</Text>
              <Text style={sDyn.vehicleName} numberOfLines={1}>
                {getLocalizedVehicleBrand(activeSessionVehicle.brand, t)} {getLocalizedVehicleModel(activeSessionVehicle.model)}
              </Text>
              <Text style={sDyn.vehicleYear}>{activeSessionVehicle.year}</Text>
              <TouchableOpacity 
                style={sDyn.changeBtn} 
                onPress={() => {
                  setActiveSessionVehicle(null);
                  setShowRegDropdown(false);
                  setShowBrandDropdown(false);
                  setShowModelDropdown(false);
                  setShowYearDropdown(false);
                }}
                activeOpacity={0.8}
              >
                <Text style={sDyn.changeBtnText}>⚡ {t('vehicleSelect.changeVehicle', 'DEĞİŞTİR').toUpperCase()}</Text>
              </TouchableOpacity>

              {/* Connection Health Section */}
              {isConnected && (
                <View style={sDyn.healthSection}>
                  <Text style={sDyn.sectionTitle}>
                    {t('bento.settings.hardwareHealth', 'DONANIM SAĞLIK BİLGİSİ').toUpperCase()}
                  </Text>
                  <View style={sDyn.healthCard}>
                    <View style={sDyn.healthRow}>
                      <Text style={sDyn.healthLabel}>{t('bento.settings.connectionType', 'Bağlantı Tipi:')}</Text>
                      <Text style={sDyn.healthValue}>BLE</Text>
                    </View>
                    <View style={sDyn.healthRow}>
                      <Text style={sDyn.healthLabel}>{t('bento.settings.deviceName', 'Cihaz Adı:')}</Text>
                      <Text style={sDyn.healthValue}>{lastDeviceName || 'OBDII'}</Text>
                    </View>
                    <View style={sDyn.healthRow}>
                      <Text style={sDyn.healthLabel}>{t('bento.settings.protocol', 'Protokol:')}</Text>
                      <Text style={sDyn.healthValue}>
                        {isSimulationMode ? t('bento.settings.simulationObd', 'Simülasyon OBD') : 'CAN Bus (ISO-15765)'}
                      </Text>
                    </View>
                    <View style={sDyn.healthRow}>
                      <Text style={sDyn.healthLabel}>{t('bento.settings.deviceStatus', 'Cihaz Durumu:')}</Text>
                      <Text style={[sDyn.healthValue, { color: isCloneDevice ? colors.red : colors.green }]}>
                        {isCloneDevice ? t('bento.settings.safeMode', 'Güvenli Mod / Clone Adaptör') : t('bento.settings.original', 'Orijinal')}
                      </Text>
                    </View>
                    <View style={sDyn.healthRow}>
                      <Text style={sDyn.healthLabel}>{t('bento.settings.pollingRate', 'Sorgu Hızı:')}</Text>
                      <Text style={sDyn.healthValue}>
                        {isCloneDevice ? t('bento.settings.pollingLow', '2 Hz (Düşük)') : t('bento.settings.pollingHigh', '4 Hz (Yüksek)')}
                      </Text>
                    </View>
                  </View>
                </View>
              )}
            </View>
          ) : (
            <View style={{ gap: scaleHeight(12) }}>
              <Text style={sDyn.vehicleLabel}>{t('vehicleSelect.newVehicle', 'YENİ ARAÇ BİLGİSİ GİRİN')}</Text>

              {/* Inline Brand Selector */}
              <View style={{ zIndex: 900 }}>
                <TouchableOpacity 
                  style={[sDyn.dropdownTrigger, { backgroundColor: `${colors.textPri}05`, borderColor: colors.cardBorder }]}
                  onPress={() => {
                    setShowBrandDropdown(!brandSearchQuery ? !showBrandDropdown : true);
                    setShowRegDropdown(false);
                    setShowModelDropdown(false);
                    setShowYearDropdown(false);
                  }}
                  activeOpacity={0.8}
                >
                  <Text style={sDyn.dropdownTriggerText} numberOfLines={1}>
                    {selectedBrand ? t(`brands.${selectedBrand}`, selectedBrand) : t('vehicleSelect.selectBrand', 'Marka Seçin...')}
                  </Text>
                  <Text style={{ color: colors.textSec, fontSize: 10 }}>{showBrandDropdown ? '▲' : '▼'}</Text>
                </TouchableOpacity>

                {showBrandDropdown && (
                  <View style={[sDyn.dropdownList, { backgroundColor: colors.elevated, borderColor: colors.border }]}>
                    <TextInput
                      style={{ 
                        backgroundColor: `${colors.textPri}05`, 
                        borderColor: colors.border, 
                        borderWidth: 1, 
                        color: colors.textPri, 
                        fontFamily: MONO, 
                        fontSize: scaleFont(11),
                        padding: scaleMod(6),
                        margin: scaleMod(6),
                        borderRadius: 6
                      }}
                      placeholder={t('vehicleSelect.searchBrand', 'Marka Ara...')}
                      placeholderTextColor={colors.textSec}
                      value={brandSearchQuery}
                      onChangeText={(text) => {
                        setBrandSearchQuery(text);
                        setShowBrandDropdown(true);
                      }}
                    />
                    <ScrollView style={{ maxHeight: scaleHeight(130) }} nestedScrollEnabled={true} keyboardShouldPersistTaps="handled">
                      {filteredBrands.map((brandKey) => (
                        <TouchableOpacity 
                          key={brandKey}
                          style={[sDyn.dropdownItem, { borderBottomColor: `${colors.border}33` }]}
                          onPress={() => {
                            setSelectedBrand(brandKey);
                            setShowBrandDropdown(false);
                            setBrandSearchQuery('');
                          }}
                        >
                          <Text style={{ color: colors.textPri, fontFamily: MONO, fontSize: 11.5 }}>
                            {t(`brands.${brandKey}`, brandKey)}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                )}

                {selectedBrand === 'other' && (
                  <TextInput
                    style={{
                      borderWidth: 1,
                      borderRadius: 8,
                      borderColor: colors.cardBorder,
                      backgroundColor: `${colors.textPri}05`,
                      color: colors.textPri,
                      fontFamily: MONO,
                      fontSize: scaleFont(11),
                      paddingHorizontal: scaleWidth(12),
                      paddingVertical: scaleHeight(8),
                      marginTop: scaleHeight(6)
                    }}
                    placeholder={t('vehicleSelect.customBrandPlaceholder', 'Örn: Triumph, CFMoto...')}
                    placeholderTextColor={colors.textSec}
                    value={customBrand}
                    onChangeText={setCustomBrand}
                  />
                )}
              </View>

              {/* Inline Model Selector */}
              <View style={{ zIndex: 800 }}>
                <TouchableOpacity 
                  style={[sDyn.dropdownTrigger, { backgroundColor: `${colors.textPri}05`, borderColor: colors.cardBorder, opacity: selectedBrand ? 1 : 0.6 }]}
                  disabled={!selectedBrand}
                  onPress={() => {
                    setShowModelDropdown(!modelSearchQuery ? !showModelDropdown : true);
                    setShowRegDropdown(false);
                    setShowBrandDropdown(false);
                    setShowYearDropdown(false);
                  }}
                  activeOpacity={0.8}
                >
                  <Text style={sDyn.dropdownTriggerText} numberOfLines={1}>
                    {selectedModel ? selectedModelLabel : t('vehicleSelect.selectModel', 'Model Seçin...')}
                  </Text>
                  <Text style={{ color: colors.textSec, fontSize: 10 }}>{showModelDropdown ? '▲' : '▼'}</Text>
                </TouchableOpacity>

                {showModelDropdown && (
                  <View style={[sDyn.dropdownList, { backgroundColor: colors.elevated, borderColor: colors.border }]}>
                    <TextInput
                      style={{ 
                        backgroundColor: `${colors.textPri}05`, 
                        borderColor: colors.border, 
                        borderWidth: 1, 
                        color: colors.textPri, 
                        fontFamily: MONO, 
                        fontSize: scaleFont(11),
                        padding: scaleMod(6),
                        margin: scaleMod(6),
                        borderRadius: 6
                      }}
                      placeholder={t('vehicleSelect.searchModel', 'Model Ara...')}
                      placeholderTextColor={colors.textSec}
                      value={modelSearchQuery}
                      onChangeText={(text) => {
                        setModelSearchQuery(text);
                        setShowModelDropdown(true);
                      }}
                    />
                    <ScrollView style={{ maxHeight: scaleHeight(130) }} nestedScrollEnabled={true} keyboardShouldPersistTaps="handled">
                      {filteredModels.map((opt) => (
                        <TouchableOpacity 
                          key={opt.value}
                          style={[sDyn.dropdownItem, { borderBottomColor: `${colors.border}33` }]}
                          onPress={() => {
                            setSelectedModel(opt.value);
                            setShowModelDropdown(false);
                            setModelSearchQuery('');
                          }}
                        >
                          <Text style={{ color: colors.textPri, fontFamily: MONO, fontSize: 11.5 }}>
                            {opt.label}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                )}

                {selectedModel === 'other' && (
                  <TextInput
                    style={{
                      borderWidth: 1,
                      borderRadius: 8,
                      borderColor: colors.cardBorder,
                      backgroundColor: `${colors.textPri}05`,
                      color: colors.textPri,
                      fontFamily: MONO,
                      fontSize: scaleFont(11),
                      paddingHorizontal: scaleWidth(12),
                      paddingVertical: scaleHeight(8),
                      marginTop: scaleHeight(6)
                    }}
                    placeholder={t('vehicleSelect.customModelPlaceholder', 'Örn: CBR600...')}
                    placeholderTextColor={colors.textSec}
                    value={customModel}
                    onChangeText={setCustomModel}
                  />
                )}
              </View>

              {/* Inline Year Selector */}
              <View style={{ zIndex: 700 }}>
                <TouchableOpacity 
                  style={[sDyn.dropdownTrigger, { backgroundColor: `${colors.textPri}05`, borderColor: colors.cardBorder }]}
                  onPress={() => {
                    setShowYearDropdown(!showYearDropdown);
                    setShowRegDropdown(false);
                    setShowBrandDropdown(false);
                    setShowModelDropdown(false);
                  }}
                  activeOpacity={0.8}
                >
                  <Text style={sDyn.dropdownTriggerText} numberOfLines={1}>
                    {selectedYear ? (selectedYear === 'other' ? t('brands.other', 'Diğer') : selectedYear) : t('vehicleSelect.selectYear', 'Yıl Seçin...')}
                  </Text>
                  <Text style={{ color: colors.textSec, fontSize: 10 }}>{showYearDropdown ? '▲' : '▼'}</Text>
                </TouchableOpacity>

                {showYearDropdown && (
                  <View style={[sDyn.dropdownList, { backgroundColor: colors.elevated, borderColor: colors.border }]}>
                    <ScrollView style={{ maxHeight: scaleHeight(130) }} nestedScrollEnabled={true}>
                      {YEARS.map((year) => (
                        <TouchableOpacity 
                          key={year}
                          style={[sDyn.dropdownItem, { borderBottomColor: `${colors.border}33` }]}
                          onPress={() => {
                            setSelectedYear(year);
                            setShowYearDropdown(false);
                          }}
                        >
                          <Text style={{ color: colors.textPri, fontFamily: MONO, fontSize: 11.5 }}>
                            {year === 'other' ? t('brands.other', 'Diğer') : year}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                )}

                {selectedYear === 'other' && (
                  <TextInput
                    style={{
                      borderWidth: 1,
                      borderRadius: 8,
                      borderColor: colors.cardBorder,
                      backgroundColor: `${colors.textPri}05`,
                      color: colors.textPri,
                      fontFamily: MONO,
                      fontSize: scaleFont(11),
                      paddingHorizontal: scaleWidth(12),
                      paddingVertical: scaleHeight(8),
                      marginTop: scaleHeight(6)
                    }}
                    placeholder={t('vehicleSelect.customYearPlaceholder', 'Örn: 2018')}
                    placeholderTextColor={colors.textSec}
                    value={customYear}
                    keyboardType="numeric"
                    maxLength={4}
                    onChangeText={setCustomYear}
                  />
                )}
              </View>

              {/* Confirm Selection Button */}
              <TouchableOpacity 
                style={{
                  backgroundColor: colors.cyan,
                  borderRadius: 8,
                  paddingVertical: scaleHeight(12),
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginTop: scaleHeight(8),
                  opacity: (selectedBrand && selectedModel && selectedYear) ? 1 : 0.6
                }}
                disabled={!(selectedBrand && selectedModel && selectedYear)}
                onPress={() => {
                  const finalBrand = selectedBrand === 'other' ? customBrand : selectedBrand;
                  const finalModel = selectedModel === 'other' ? customModel : selectedModel;
                  const finalYearString = selectedYear === 'other' ? customYear : selectedYear;
                  const finalYear = parseInt(finalYearString, 10);

                  if (!finalBrand || !finalModel || isNaN(finalYear)) return;

                  handleCreateVehicle(finalBrand, finalModel, finalYear);
                }}
                activeOpacity={0.8}
              >
                <Text style={{ color: '#000', fontWeight: '900', fontFamily: MONO, fontSize: scaleFont(12) }}>
                  {t('vehicleSelect.confirm', 'DEVAM ET').toUpperCase()}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Connection Button */}
        <TouchableOpacity
          style={[footerStatusStyle, !isPressable && { opacity: 0.5 }]}
          onPress={() => isPressable && onConnectPress()}
          disabled={!isPressable}
          activeOpacity={isPressable ? 0.8 : 1}
        >
          <View style={[sDyn.statusDot, { backgroundColor: isConnected ? colors.green : (isScanning ? colors.cyan : colors.amber) }]} />
          <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={statusTextStyle}>
              {statusTextStr}
            </Text>
            {isScanning && <ActivityIndicator size="small" color={colors.cyan} />}
          </View>
          <Text style={[sDyn.arrow, { color: isConnected ? colors.green : (isScanning ? colors.cyan : colors.amber) }]}>›</Text>
        </TouchableOpacity>
      </Animated.View>

      {/* Quick Navigation Buttons — outside the card, below it, only when connected */}
      {isConnected && (
        <View style={{ flexDirection: 'row', gap: scaleMod(8), marginTop: scaleHeight(12) }}>
          <TouchableOpacity
            style={{
              flex: 1,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: scaleMod(6),
              paddingVertical: scaleHeight(14),
              paddingHorizontal: scaleMod(10),
              borderRadius: scaleMod(14),
              borderWidth: 1.5,
              backgroundColor: `${colors.cyan}14`,
              borderColor: `${colors.cyan}4D`,
            }}
            onPress={onGoToSensors}
            activeOpacity={0.8}
          >
            <Text style={{ fontSize: scaleFont(16) }}>📊</Text>
            <Text
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.7}
              style={{
                color: colors.cyan,
                fontFamily: MONO,
                fontSize: scaleFont(11),
                fontWeight: '800',
                flexShrink: 1,
              }}
            >
              {t('hub.goToSensors', 'CANLI VERİLERE GİT')}
            </Text>
            <Text style={{ color: colors.cyan, fontSize: scaleFont(14), fontWeight: '900' }}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={{
              flex: 1,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: scaleMod(6),
              paddingVertical: scaleHeight(14),
              paddingHorizontal: scaleMod(10),
              borderRadius: scaleMod(14),
              borderWidth: 1.5,
              backgroundColor: `${colors.green}14`,
              borderColor: `${colors.green}4D`,
            }}
            onPress={onGoToExpertise}
            activeOpacity={0.8}
          >
            <Text style={{ fontSize: scaleFont(16) }}>🔍</Text>
            <Text
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.7}
              style={{
                color: colors.green,
                fontFamily: MONO,
                fontSize: scaleFont(11),
                fontWeight: '800',
                flexShrink: 1,
              }}
            >
              {t('hub.goToExpertise', 'EKSPERTİZ\'E GİT')}
            </Text>
            <Text style={{ color: colors.green, fontSize: scaleFont(14), fontWeight: '900' }}>›</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Kayıtlı Araçlar button — always at the very bottom, even when no vehicles are registered */}
      {!showRegisteredListScreen && (
        <TouchableOpacity 
          style={[
            sDyn.dropdownTrigger, 
            { 
              backgroundColor: `${colors.textPri}0A`, 
              borderColor: colors.cyan,
              borderWidth: 1.5,
              paddingVertical: scaleHeight(14),
              borderRadius: 12,
              marginTop: scaleHeight(12),
            }
          ]}
          onPress={() => {
            setShowRegisteredListScreen(true);
            setShowBrandDropdown(false);
            setShowModelDropdown(false);
            setShowYearDropdown(false);
          }}
          activeOpacity={0.8}
        >
          <Text style={[sDyn.dropdownTriggerText, { color: colors.cyan, fontSize: scaleFont(11.5) }]} numberOfLines={1}>
            🛞 {t('vehicleSelect.viewRegisteredList', 'Kayıtlı Araçları Gör')} ({registeredVehicles.length})
          </Text>
          <Text style={{ color: colors.cyan, fontSize: 13, fontWeight: '900', marginRight: 4 }}>{'>'}</Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  );
}


