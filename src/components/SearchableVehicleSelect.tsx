import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, Platform, Alert } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useThemeColors } from '../theme';
import { useResponsive } from '../hooks/useResponsive';
import { 
  BRANDS, 
  MODELS_BY_BRAND, 
  YEARS, 
  FUEL_TYPES,
  PASSENGER_CAR_FUEL_TYPES,
  MOTORCYCLE_FUEL_TYPES,
  HEAVY_DUTY_FUEL_TYPES,
  MOTORCYCLE_BRANDS, 
  HEAVY_DUTY_BRANDS, 
  PASSENGER_CAR_BRANDS 
} from '../data/vehicleData';
import { toSnakeCase, formatVehicleIdToLabel } from '../utils/vehicleStandardizer';

interface SearchableVehicleSelectProps {
  confirmText: string;
  cancelText: string;
  onCancel: () => void;
  onConfirm: (brandId: string, modelId: string, year: number, fuelType: string) => void;
  category?: 'PASSENGER_CAR' | 'MOTORCYCLE' | 'HEAVY_DUTY_TRUCK' | null;
  initialBrandId?: string | null;
  initialModelId?: string | null;
  initialYear?: number | null;
  initialFuelType?: string | null;
}

export default function SearchableVehicleSelect({
  confirmText,
  cancelText,
  onCancel,
  onConfirm,
  category,
  initialBrandId,
  initialModelId,
  initialYear,
  initialFuelType
}: SearchableVehicleSelectProps) {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const { vs: scaleHeight, fs: scaleFont } = useResponsive();

  const MONO = Platform.OS === 'ios' ? 'System' : 'sans-serif';

  // Selection states
  const [selectedBrand, setSelectedBrand] = useState<string>('');
  const [selectedModel, setSelectedModel] = useState<string>('');
  const [selectedYear, setSelectedYear] = useState<string>('');

  // Filter fuel types based on category
  const availableFuelTypes = React.useMemo(() => {
    if (category === 'MOTORCYCLE') {
      return MOTORCYCLE_FUEL_TYPES;
    }
    if (category === 'HEAVY_DUTY_TRUCK') {
      return HEAVY_DUTY_FUEL_TYPES;
    }
    return PASSENGER_CAR_FUEL_TYPES;
  }, [category]);

  const [selectedFuelType, setSelectedFuelType] = useState<string>(() => {
    if (initialFuelType && availableFuelTypes.includes(initialFuelType as any)) {
      return initialFuelType;
    }
    return '';
  });

  // Custom text input states
  const [customBrand, setCustomBrand] = useState<string>('');
  const [customModel, setCustomModel] = useState<string>('');
  const [customYear, setCustomYear] = useState<string>('');

  // Search query states
  const [brandSearchQuery, setBrandSearchQuery] = useState<string>('');
  const [modelSearchQuery, setModelSearchQuery] = useState<string>('');

  // Dropdown expansion states
  const [showBrandDropdown, setShowBrandDropdown] = useState(false);
  const [showModelDropdown, setShowModelDropdown] = useState(false);
  const [showYearDropdown, setShowYearDropdown] = useState(false);
  const [showFuelDropdown, setShowFuelDropdown] = useState(false);

  // Initialize from props
  useEffect(() => {
    if (initialBrandId) {
      if (BRANDS.includes(initialBrandId)) {
        setSelectedBrand(initialBrandId);
        setCustomBrand('');
      } else {
        setSelectedBrand('other');
        setCustomBrand(formatVehicleIdToLabel(initialBrandId));
      }
    } else {
      setSelectedBrand('');
      setCustomBrand('');
    }
  }, [initialBrandId]);

  useEffect(() => {
    if (initialBrandId && initialModelId) {
      const brandModels = MODELS_BY_BRAND[initialBrandId] || [];
      const cleanModelId = initialModelId.replace(/\s*\(\d{4}\)$/, '');
      const matched = brandModels.find(m => toSnakeCase(m) === cleanModelId);
      if (matched && matched !== 'other') {
        setSelectedModel(toSnakeCase(matched));
        setCustomModel('');
      } else {
        setSelectedModel('other');
        setCustomModel(formatVehicleIdToLabel(cleanModelId));
      }
    } else {
      setSelectedModel('');
      setCustomModel('');
    }
  }, [initialModelId, initialBrandId]);

  useEffect(() => {
    if (initialYear) {
      const yearStr = initialYear.toString();
      if (YEARS.includes(yearStr)) {
        setSelectedYear(yearStr);
        setCustomYear('');
      } else {
        setSelectedYear('other');
        setCustomYear(yearStr);
      }
    } else {
      setSelectedYear('');
      setCustomYear('');
    }
  }, [initialYear]);

  // Sync with initialFuelType when passed or changed externally
  useEffect(() => {
    if (initialFuelType && availableFuelTypes.includes(initialFuelType as any)) {
      setSelectedFuelType(initialFuelType);
    } else if (!initialFuelType) {
      setSelectedFuelType('');
    }
  }, [initialFuelType, availableFuelTypes]);

  // Reset selectedFuelType if incompatible with newly selected category
  useEffect(() => {
    if (selectedFuelType && !availableFuelTypes.includes(selectedFuelType as any)) {
      setSelectedFuelType('');
    }
  }, [category, availableFuelTypes]);

  // Filter raw brands by category
  const baseBrands = React.useMemo(() => {
    if (category === 'MOTORCYCLE') {
      return MOTORCYCLE_BRANDS;
    }
    if (category === 'HEAVY_DUTY_TRUCK') {
      return HEAVY_DUTY_BRANDS;
    }
    if (category === 'PASSENGER_CAR') {
      return PASSENGER_CAR_BRANDS;
    }
    return BRANDS;
  }, [category]);

  // Sort brands alphabetically based on localized string in current language
  const sortedBrands = React.useMemo(() => {
    return [...baseBrands]
      .filter((b) => b !== 'other')
      .sort((a, b) => t(`brands.${a}`, a).localeCompare(t(`brands.${b}`, b)))
      .concat(['other']);
  }, [baseBrands, t]);

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
        return { label: t('brands.other'), value: 'other' };
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
    if (selectedModel === 'other') return t('brands.other');
    const matched = modelOptions.find((opt) => opt.value === selectedModel);
    return matched ? matched.label : selectedModel;
  }, [selectedModel, modelOptions, t]);

  // Reset model when brand changes
  useEffect(() => {
    if (initialBrandId && selectedBrand === initialBrandId) return;
    setSelectedModel('');
    setCustomModel('');
    setModelSearchQuery('');
  }, [selectedBrand]);

  const handleSave = () => {
    const finalBrand = selectedBrand === 'other' ? toSnakeCase(customBrand) : selectedBrand;
    const finalModel = selectedModel === 'other' ? toSnakeCase(customModel) : selectedModel;
    const finalYearString = selectedYear === 'other' ? customYear.trim() : selectedYear;
    const finalYear = parseInt(finalYearString, 10);

    if (!finalBrand) {
      Alert.alert(t('common.error'), t('vehicleSelect.errorBrand'));
      return;
    }
    if (!finalModel) {
      Alert.alert(t('common.error'), t('vehicleSelect.errorModel'));
      return;
    }
    if (isNaN(finalYear) || finalYear < 1900 || finalYear > 2030) {
      Alert.alert(t('common.error'), t('vehicleSelect.errorYear'));
      return;
    }
    if (!selectedFuelType) {
      Alert.alert(t('common.error'), t('vehicleSelect.errorFuelType'));
      return;
    }

    onConfirm(finalBrand, finalModel, finalYear, selectedFuelType);
  };

  const getFuelTypeLabel = (fuel: string) => {
    switch (fuel) {
      case 'gasoline':
        return t('vehicleSelect.fuelGasoline', { defaultValue: 'Benzin' });
      case 'diesel':
        return t('vehicleSelect.fuelDiesel', { defaultValue: 'Dizel' });
      case 'gasoline_lpg':
        return t('vehicleSelect.fuelGasolineLpg', { defaultValue: 'Benzin + LPG' });
      case 'hybrid':
        return t('vehicleSelect.fuelHybrid', { defaultValue: 'Hibrit' });
      case 'electric':
        return t('vehicleSelect.fuelElectric', { defaultValue: 'Elektrik' });
      default:
        return t('vehicleSelect.fuelOther', { defaultValue: 'Diğer' });
    }
  };

  return (
    <ScrollView 
      style={styles.scrollForm} 
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      {/* BRAND SELECTOR */}
      <View style={styles.formGroup}>
        <Text style={[styles.label, { color: colors.textSec, fontFamily: MONO, fontSize: scaleFont(10) }]}>
          {t('vehicleSelect.brand')}
        </Text>
        <TouchableOpacity 
          style={[styles.dropdownTrigger, { backgroundColor: colors.elevated, borderColor: colors.border }]}
          onPress={() => {
            setShowBrandDropdown(!showBrandDropdown);
            setShowModelDropdown(false);
            setShowYearDropdown(false);
            setShowFuelDropdown(false);
          }}
        >
          <Text style={[styles.dropdownText, { color: selectedBrand ? colors.textPri : colors.textSec, fontFamily: MONO, fontSize: scaleFont(12) }]}>
            {selectedBrand ? t(`brands.${selectedBrand}`, selectedBrand) : t('vehicleSelect.selectBrand')}
          </Text>
          <Text style={{ color: colors.textSec }}>{showBrandDropdown ? '▲' : '▼'}</Text>
        </TouchableOpacity>
        
        {showBrandDropdown && (
          <View style={[styles.dropdownList, { backgroundColor: colors.elevated, borderColor: colors.border }]}>
            <TextInput
              style={[styles.searchInput, { backgroundColor: colors.bg, borderColor: colors.border, color: colors.textPri, fontFamily: MONO, fontSize: scaleFont(11) }]}
              placeholder={t('vehicleSelect.searchBrand')}
              placeholderTextColor={colors.textSec}
              value={brandSearchQuery}
              onChangeText={setBrandSearchQuery}
              autoFocus={true}
            />
            <ScrollView style={{ maxHeight: scaleHeight(160) }} nestedScrollEnabled={true} keyboardShouldPersistTaps="handled">
              {filteredBrands.length === 0 ? (
                <View style={{ padding: 14, alignItems: 'center' }}>
                  <Text style={{ color: colors.textSec, fontFamily: MONO, fontSize: scaleFont(11) }}>
                    {t('vehicleSelect.noResults')}
                  </Text>
                </View>
              ) : (
                filteredBrands.map((brandKey) => (
                  <TouchableOpacity 
                    key={brandKey}
                    style={[styles.dropdownItem, { borderBottomColor: `${colors.border}33` }]}
                    onPress={() => {
                      setSelectedBrand(brandKey);
                      setShowBrandDropdown(false);
                      setBrandSearchQuery('');
                    }}
                  >
                    <Text style={[styles.itemText, { color: colors.textPri, fontFamily: MONO, fontSize: scaleFont(11.5) }]}>
                      {t(`brands.${brandKey}`, brandKey)}
                    </Text>
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>
          </View>
        )}

        {selectedBrand === 'other' && (
          <TextInput
            style={[styles.textInput, { backgroundColor: colors.elevated, borderColor: colors.border, color: colors.textPri, fontFamily: MONO, fontSize: scaleFont(12), marginTop: 8 }]}
            placeholder={t('vehicleSelect.customBrandPlaceholder')}
            placeholderTextColor={colors.textSec}
            value={customBrand}
            onChangeText={setCustomBrand}
          />
        )}
      </View>

      {/* MODEL SELECTOR */}
      <View style={styles.formGroup}>
        <Text style={[styles.label, { color: colors.textSec, fontFamily: MONO, fontSize: scaleFont(10) }]}>
          {t('vehicleSelect.model')}
        </Text>
        <TouchableOpacity 
          style={[styles.dropdownTrigger, { backgroundColor: colors.elevated, borderColor: colors.border }]}
          disabled={!selectedBrand}
          onPress={() => {
            setShowModelDropdown(!showModelDropdown);
            setShowBrandDropdown(false);
            setShowYearDropdown(false);
            setShowFuelDropdown(false);
          }}
        >
          <Text style={[styles.dropdownText, { color: selectedModel ? colors.textPri : colors.textSec, fontFamily: MONO, fontSize: scaleFont(12) }]}>
            {!selectedBrand ? t('vehicleSelect.selectBrandFirst', { defaultValue: 'Önce Marka Seçin...' }) : (selectedModel ? selectedModelLabel : t('vehicleSelect.selectModel'))}
          </Text>
          <Text style={{ color: colors.textSec }}>{showModelDropdown ? '▲' : '▼'}</Text>
        </TouchableOpacity>

        {showModelDropdown && (
          <View style={[styles.dropdownList, { backgroundColor: colors.elevated, borderColor: colors.border }]}>
            <TextInput
              style={[styles.searchInput, { backgroundColor: colors.bg, borderColor: colors.border, color: colors.textPri, fontFamily: MONO, fontSize: scaleFont(11) }]}
              placeholder={t('vehicleSelect.searchModel')}
              placeholderTextColor={colors.textSec}
              value={modelSearchQuery}
              onChangeText={setModelSearchQuery}
              autoFocus={true}
            />
            <ScrollView style={{ maxHeight: scaleHeight(160) }} nestedScrollEnabled={true} keyboardShouldPersistTaps="handled">
              {filteredModels.length === 0 ? (
                <View style={{ padding: 14, alignItems: 'center' }}>
                  <Text style={{ color: colors.textSec, fontFamily: MONO, fontSize: scaleFont(11) }}>
                    {t('vehicleSelect.noResults')}
                  </Text>
                </View>
              ) : (
                filteredModels.map((item) => (
                  <TouchableOpacity 
                    key={item.value}
                    style={[styles.dropdownItem, { borderBottomColor: `${colors.border}33` }]}
                    onPress={() => {
                      setSelectedModel(item.value);
                      setShowModelDropdown(false);
                      setModelSearchQuery('');
                    }}
                  >
                    <Text style={[styles.itemText, { color: colors.textPri, fontFamily: MONO, fontSize: scaleFont(11.5) }]}>
                      {item.label}
                    </Text>
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>
          </View>
        )}

        {selectedModel === 'other' && (
          <TextInput
            style={[styles.textInput, { backgroundColor: colors.elevated, borderColor: colors.border, color: colors.textPri, fontFamily: MONO, fontSize: scaleFont(12), marginTop: 8 }]}
            placeholder={t('vehicleSelect.customModelPlaceholder')}
            placeholderTextColor={colors.textSec}
            value={customModel}
            onChangeText={setCustomModel}
          />
        )}
      </View>

      {/* MODEL YEAR SELECTOR */}
      <View style={styles.formGroup}>
        <Text style={[styles.label, { color: colors.textSec, fontFamily: MONO, fontSize: scaleFont(10) }]}>
          {t('vehicleSelect.year')}
        </Text>
        <TouchableOpacity 
          style={[styles.dropdownTrigger, { backgroundColor: colors.elevated, borderColor: colors.border }]}
          onPress={() => {
            setShowYearDropdown(!showYearDropdown);
            setShowBrandDropdown(false);
            setShowModelDropdown(false);
            setShowFuelDropdown(false);
          }}
        >
          <Text style={[styles.dropdownText, { color: selectedYear ? colors.textPri : colors.textSec, fontFamily: MONO, fontSize: scaleFont(12) }]}>
            {selectedYear ? (selectedYear === 'other' ? t('brands.other') : selectedYear) : t('vehicleSelect.selectYear')}
          </Text>
          <Text style={{ color: colors.textSec }}>{showYearDropdown ? '▲' : '▼'}</Text>
        </TouchableOpacity>

        {showYearDropdown && (
          <View style={[styles.dropdownList, { backgroundColor: colors.elevated, borderColor: colors.border }]}>
            <ScrollView style={{ maxHeight: scaleHeight(160) }} nestedScrollEnabled={true} keyboardShouldPersistTaps="handled">
              {YEARS.map((year) => (
                <TouchableOpacity 
                  key={year}
                  style={[styles.dropdownItem, { borderBottomColor: `${colors.border}33` }]}
                  onPress={() => {
                    setSelectedYear(year);
                    setShowYearDropdown(false);
                  }}
                >
                  <Text style={[styles.itemText, { color: colors.textPri, fontFamily: MONO, fontSize: scaleFont(11.5) }]}>
                    {year === 'other' ? t('brands.other') : year}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {selectedYear === 'other' && (
          <TextInput
            style={[styles.textInput, { backgroundColor: colors.elevated, borderColor: colors.border, color: colors.textPri, fontFamily: MONO, fontSize: scaleFont(12), marginTop: 8 }]}
            placeholder={t('vehicleSelect.customYearPlaceholder')}
            placeholderTextColor={colors.textSec}
            value={customYear}
            keyboardType="numeric"
            maxLength={4}
            onChangeText={setCustomYear}
          />
        )}
      </View>

      {/* FUEL TYPE SELECTOR */}
      <View style={styles.formGroup}>
        <Text style={[styles.label, { color: colors.textSec, fontFamily: MONO, fontSize: scaleFont(10) }]}>
          {t('vehicleSelect.fuelType', { defaultValue: 'YAKIT TİPİ' })}
        </Text>
        <TouchableOpacity 
          style={[styles.dropdownTrigger, { backgroundColor: colors.elevated, borderColor: colors.border }]}
          onPress={() => {
            setShowFuelDropdown(!showFuelDropdown);
            setShowBrandDropdown(false);
            setShowModelDropdown(false);
            setShowYearDropdown(false);
          }}
        >
          <Text style={[styles.dropdownText, { color: selectedFuelType ? colors.textPri : colors.textSec, fontFamily: MONO, fontSize: scaleFont(12) }]}>
            {selectedFuelType ? getFuelTypeLabel(selectedFuelType) : t('vehicleSelect.selectFuelType', { defaultValue: 'Yakıt Tipi Seçin...' })}
          </Text>
          <Text style={{ color: colors.textSec }}>{showFuelDropdown ? '▲' : '▼'}</Text>
        </TouchableOpacity>

        {showFuelDropdown && (
          <View style={[styles.dropdownList, { backgroundColor: colors.elevated, borderColor: colors.border }]}>
            <ScrollView style={{ maxHeight: scaleHeight(160) }} nestedScrollEnabled={true} keyboardShouldPersistTaps="handled">
              {availableFuelTypes.map((fuel) => (
                <TouchableOpacity 
                  key={fuel}
                  style={[styles.dropdownItem, { borderBottomColor: `${colors.border}33` }]}
                  onPress={() => {
                    setSelectedFuelType(fuel);
                    setShowFuelDropdown(false);
                  }}
                >
                  <Text style={[styles.itemText, { color: colors.textPri, fontFamily: MONO, fontSize: scaleFont(11.5) }]}>
                    {getFuelTypeLabel(fuel)}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}
      </View>

      {/* Action Buttons */}
      <View style={styles.actionRow}>
        <TouchableOpacity 
          style={[styles.button, { backgroundColor: colors.elevated, borderColor: colors.border, borderWidth: 1, marginEnd: 8 }]}
          onPress={onCancel}
          activeOpacity={0.4}
        >
          <Text style={[styles.buttonText, { color: colors.red, fontFamily: MONO, fontSize: scaleFont(11) }]}>
            {cancelText.toUpperCase()}
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.button, { backgroundColor: colors.cyan }]}
          onPress={handleSave}
          activeOpacity={0.4}
        >
          <Text style={[styles.buttonText, { color: colors.statusBarStyle === 'light-content' ? '#000000' : '#ffffff', fontWeight: '900', fontFamily: MONO, fontSize: scaleFont(11) }]}>
            {confirmText.toUpperCase()}
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollForm: {
    marginBottom: 16,
  },
  formGroup: {
    marginBottom: 16,
  },
  label: {
    fontWeight: '800',
    letterSpacing: 1.5,
    marginBottom: 8,
  },
  dropdownTrigger: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  dropdownText: {
    fontWeight: '600',
  },
  dropdownList: {
    borderWidth: 1,
    borderTopWidth: 0,
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
    marginTop: -2,
    zIndex: 1000,
    elevation: 5,
  },
  dropdownItem: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 0.5,
  },
  itemText: {
    fontWeight: '500',
  },
  textInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  button: {
    flex: 1,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  searchInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    margin: 8,
  }
});
