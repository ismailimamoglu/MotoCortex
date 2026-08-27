import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ScrollView, 
  TextInput, 
  Platform, 
  Alert,
  Modal,
  FlatList,
  TouchableWithoutFeedback,
  Keyboard
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useThemeColors } from '../theme';
import { useResponsive } from '../hooks/useResponsive';
import { 
  BRANDS, 
  MODELS_BY_BRAND, 
  YEARS, 
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

type ActivePicker = 'brand' | 'model' | 'year' | 'fuel' | null;

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
  const { vs: scaleHeight, ms: scaleMod, fs: scaleFont, isTablet } = useResponsive();

  const MONO = Platform.OS === 'ios' ? 'System' : 'sans-serif';

  // Selection states
  const [selectedBrand, setSelectedBrand] = useState<string>('');
  const [selectedModel, setSelectedModel] = useState<string>('');
  const [selectedYear, setSelectedYear] = useState<string>('');

  // Active Bottom Sheet Modal Picker State
  const [activePicker, setActivePicker] = useState<ActivePicker>(null);

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

  // Custom text input states (for 'other' option)
  const [customBrand, setCustomBrand] = useState<string>('');
  const [customModel, setCustomModel] = useState<string>('');
  const [customYear, setCustomYear] = useState<string>('');

  // Search query states
  const [searchQuery, setSearchQuery] = useState<string>('');

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

  // Reset all internal selections when category switches
  const prevCategoryRef = React.useRef(category);
  useEffect(() => {
    if (prevCategoryRef.current !== category) {
      prevCategoryRef.current = category;
      setSelectedBrand('');
      setSelectedModel('');
      setSelectedYear('');
      setSelectedFuelType('');
      setCustomBrand('');
      setCustomModel('');
      setCustomYear('');
      setSearchQuery('');
      setActivePicker(null);
    }
  }, [category]);

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
  }, [selectedBrand]);

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

  // Open a specific picker modal
  const openPicker = (type: ActivePicker) => {
    setSearchQuery('');
    setActivePicker(type);
  };

  // Get active picker data and title
  const getPickerData = () => {
    const query = searchQuery.trim().toLowerCase();

    if (activePicker === 'brand') {
      const items = sortedBrands.map((key) => ({
        key,
        label: key === 'other' ? t('brands.other') : t(`brands.${key}`, key),
        value: key,
        isSelected: selectedBrand === key,
      }));
      if (!query) return items;
      return items.filter((item) => item.value === 'other' || item.label.toLowerCase().includes(query));
    }

    if (activePicker === 'model') {
      const items = modelOptions.map((opt) => ({
        key: opt.value,
        label: opt.label,
        value: opt.value,
        isSelected: selectedModel === opt.value,
      }));
      if (!query) return items;
      return items.filter((item) => item.value === 'other' || item.label.toLowerCase().includes(query));
    }

    if (activePicker === 'year') {
      const items = YEARS.map((year) => ({
        key: year,
        label: year === 'other' ? t('brands.other') : year,
        value: year,
        isSelected: selectedYear === year,
      }));
      if (!query) return items;
      return items.filter((item) => item.value === 'other' || item.label.toLowerCase().includes(query));
    }

    if (activePicker === 'fuel') {
      const items = availableFuelTypes.map((fuel) => ({
        key: fuel,
        label: getFuelTypeLabel(fuel),
        value: fuel,
        isSelected: selectedFuelType === fuel,
      }));
      if (!query) return items;
      return items.filter((item) => item.label.toLowerCase().includes(query));
    }

    return [];
  };

  const getPickerTitle = () => {
    switch (activePicker) {
      case 'brand':
        return t('vehicleSelect.selectBrand', { defaultValue: 'Marka Seçin' });
      case 'model':
        return t('vehicleSelect.selectModel', { defaultValue: 'Model Seçin' });
      case 'year':
        return t('vehicleSelect.selectYear', { defaultValue: 'Model Yılı Seçin' });
      case 'fuel':
        return t('vehicleSelect.selectFuelType', { defaultValue: 'Yakıt Tipi Seçin' });
      default:
        return '';
    }
  };

  const handleSelectItem = (value: string) => {
    if (activePicker === 'brand') {
      setSelectedBrand(value);
      if (value !== 'other') setCustomBrand('');
    } else if (activePicker === 'model') {
      setSelectedModel(value);
      if (value !== 'other') setCustomModel('');
    } else if (activePicker === 'year') {
      setSelectedYear(value);
      if (value !== 'other') setCustomYear('');
    } else if (activePicker === 'fuel') {
      setSelectedFuelType(value);
    }
    setActivePicker(null);
    setSearchQuery('');
  };

  const pickerData = getPickerData();
  const showSearchBar = activePicker === 'brand' || activePicker === 'model';

  return (
    <View style={styles.container}>
      <ScrollView 
        style={styles.scrollForm} 
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* 1. BRAND TRIGGER */}
        <View style={styles.formGroup}>
          <Text style={[styles.label, { color: colors.textSec, fontFamily: MONO, fontSize: scaleFont(10) }]}>
            {t('vehicleSelect.brand')}
          </Text>
          <TouchableOpacity 
            style={[styles.dropdownTrigger, { backgroundColor: colors.elevated, borderColor: selectedBrand ? colors.cyan : colors.border }]}
            onPress={() => openPicker('brand')}
            activeOpacity={0.7}
          >
            <Text style={[styles.dropdownText, { color: selectedBrand ? colors.textPri : colors.textSec, fontFamily: MONO, fontSize: scaleFont(12) }]}>
              {selectedBrand ? t(`brands.${selectedBrand}`, selectedBrand) : t('vehicleSelect.selectBrand')}
            </Text>
            <Text style={{ color: selectedBrand ? colors.cyan : colors.textSec, fontSize: scaleFont(14), fontWeight: '700' }}>›</Text>
          </TouchableOpacity>

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

        {/* 2. MODEL TRIGGER */}
        <View style={styles.formGroup}>
          <Text style={[styles.label, { color: colors.textSec, fontFamily: MONO, fontSize: scaleFont(10) }]}>
            {t('vehicleSelect.model')}
          </Text>
          <TouchableOpacity 
            style={[
              styles.dropdownTrigger, 
              { 
                backgroundColor: colors.elevated, 
                borderColor: selectedModel ? colors.cyan : colors.border,
                opacity: !selectedBrand ? 0.6 : 1
              }
            ]}
            disabled={!selectedBrand}
            onPress={() => openPicker('model')}
            activeOpacity={0.7}
          >
            <Text style={[styles.dropdownText, { color: selectedModel ? colors.textPri : colors.textSec, fontFamily: MONO, fontSize: scaleFont(12) }]}>
              {!selectedBrand 
                ? t('vehicleSelect.selectBrandFirst', { defaultValue: 'Önce Marka Seçin...' }) 
                : (selectedModel ? selectedModelLabel : t('vehicleSelect.selectModel'))}
            </Text>
            <Text style={{ color: selectedModel ? colors.cyan : colors.textSec, fontSize: scaleFont(14), fontWeight: '700' }}>›</Text>
          </TouchableOpacity>

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

        {/* 3. MODEL YEAR TRIGGER */}
        <View style={styles.formGroup}>
          <Text style={[styles.label, { color: colors.textSec, fontFamily: MONO, fontSize: scaleFont(10) }]}>
            {t('vehicleSelect.year')}
          </Text>
          <TouchableOpacity 
            style={[styles.dropdownTrigger, { backgroundColor: colors.elevated, borderColor: selectedYear ? colors.cyan : colors.border }]}
            onPress={() => openPicker('year')}
            activeOpacity={0.7}
          >
            <Text style={[styles.dropdownText, { color: selectedYear ? colors.textPri : colors.textSec, fontFamily: MONO, fontSize: scaleFont(12) }]}>
              {selectedYear ? (selectedYear === 'other' ? t('brands.other') : selectedYear) : t('vehicleSelect.selectYear')}
            </Text>
            <Text style={{ color: selectedYear ? colors.cyan : colors.textSec, fontSize: scaleFont(14), fontWeight: '700' }}>›</Text>
          </TouchableOpacity>

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

        {/* 4. FUEL TYPE TRIGGER */}
        <View style={styles.formGroup}>
          <Text style={[styles.label, { color: colors.textSec, fontFamily: MONO, fontSize: scaleFont(10) }]}>
            {t('vehicleSelect.fuelType', { defaultValue: 'YAKIT TİPİ' })}
          </Text>
          <TouchableOpacity 
            style={[styles.dropdownTrigger, { backgroundColor: colors.elevated, borderColor: selectedFuelType ? colors.cyan : colors.border }]}
            onPress={() => openPicker('fuel')}
            activeOpacity={0.7}
          >
            <Text style={[styles.dropdownText, { color: selectedFuelType ? colors.textPri : colors.textSec, fontFamily: MONO, fontSize: scaleFont(12) }]}>
              {selectedFuelType ? getFuelTypeLabel(selectedFuelType) : t('vehicleSelect.selectFuelType', { defaultValue: 'Yakıt Tipi Seçin...' })}
            </Text>
            <Text style={{ color: selectedFuelType ? colors.cyan : colors.textSec, fontSize: scaleFont(14), fontWeight: '700' }}>›</Text>
          </TouchableOpacity>
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

      {/* ─────────────────────────────────────────────────────────────
          UNIFIED FULL-HEIGHT BOTTOM SHEET SELECTION MODAL
      ───────────────────────────────────────────────────────────── */}
      <Modal
        visible={activePicker !== null}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setActivePicker(null)}
      >
        <TouchableWithoutFeedback onPress={() => {
          Keyboard.dismiss();
          setActivePicker(null);
        }}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback onPress={(e) => e.stopPropagation()}>
              <View style={[
                styles.sheetContainer, 
                { 
                  backgroundColor: colors.card, 
                  borderColor: colors.border,
                  width: isTablet ? 540 : '100%',
                  alignSelf: 'center',
                }
              ]}>
                {/* Sheet Drag Handle */}
                <View style={[styles.sheetHandle, { backgroundColor: `${colors.textSec}40` }]} />

                {/* Sheet Header */}
                <View style={[styles.sheetHeader, { borderBottomColor: `${colors.border}40` }]}>
                  <Text style={[styles.sheetTitle, { color: colors.textPri, fontFamily: MONO, fontSize: scaleFont(14) }]}>
                    {getPickerTitle()}
                  </Text>
                  <TouchableOpacity 
                    onPress={() => {
                      Keyboard.dismiss();
                      setActivePicker(null);
                    }}
                    style={styles.sheetCloseBtn}
                    hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                  >
                    <Text style={{ color: colors.cyan, fontWeight: '800', fontFamily: MONO, fontSize: scaleFont(12) }}>
                      {t('common.close', { defaultValue: 'KAPAT' })}
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Optional Search Bar */}
                {showSearchBar && (
                  <View style={styles.searchBarWrapper}>
                    <TextInput
                      style={[
                        styles.searchInput, 
                        { 
                          backgroundColor: colors.bg, 
                          borderColor: colors.border, 
                          color: colors.textPri, 
                          fontFamily: MONO, 
                          fontSize: scaleFont(12) 
                        }
                      ]}
                      placeholder={
                        activePicker === 'brand' 
                          ? t('vehicleSelect.searchBrand', { defaultValue: 'Marka Ara...' })
                          : t('vehicleSelect.searchModel', { defaultValue: 'Model Ara...' })
                      }
                      placeholderTextColor={colors.textSec}
                      value={searchQuery}
                      onChangeText={setSearchQuery}
                      autoFocus={false}
                      autoCorrect={false}
                    />
                    {searchQuery.length > 0 && (
                      <TouchableOpacity 
                        onPress={() => setSearchQuery('')}
                        style={styles.clearSearchBtn}
                      >
                        <Text style={{ color: colors.textSec, fontSize: scaleFont(12), fontWeight: '700' }}>✕</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                )}

                {/* Full-Height Scrollable List */}
                <FlatList
                  data={pickerData}
                  keyExtractor={(item) => item.key}
                  showsVerticalScrollIndicator={true}
                  keyboardShouldPersistTaps="handled"
                  contentContainerStyle={{ paddingBottom: scaleHeight(24) }}
                  renderItem={({ item }) => {
                    return (
                      <TouchableOpacity
                        style={[
                          styles.sheetRow,
                          {
                            backgroundColor: item.isSelected ? `${colors.cyan}14` : 'transparent',
                            borderBottomColor: `${colors.border}30`,
                          }
                        ]}
                        onPress={() => handleSelectItem(item.value)}
                        activeOpacity={0.7}
                      >
                        <Text 
                          style={[
                            styles.sheetRowText, 
                            { 
                              color: item.isSelected ? colors.cyan : colors.textPri,
                              fontWeight: item.isSelected ? '800' : '600',
                              fontFamily: MONO,
                              fontSize: scaleFont(13)
                            }
                          ]}
                        >
                          {item.label}
                        </Text>
                        {item.isSelected && (
                          <Text style={{ color: colors.cyan, fontWeight: '900', fontSize: scaleFont(14) }}>
                            ✓
                          </Text>
                        )}
                      </TouchableOpacity>
                    );
                  }}
                  ListEmptyComponent={
                    <View style={{ padding: scaleMod(24), alignItems: 'center' }}>
                      <Text style={{ color: colors.textSec, fontFamily: MONO, fontSize: scaleFont(12) }}>
                        {t('vehicleSelect.noResults', { defaultValue: 'Sonuç bulunamadı.' })}
                      </Text>
                    </View>
                  }
                />
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
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
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  dropdownText: {
    fontWeight: '600',
  },
  textInput: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  button: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  // Modal Bottom Sheet Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    height: '75%',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderBottomWidth: 0,
    paddingTop: 10,
    paddingHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 20,
  },
  sheetHandle: {
    width: 44,
    height: 5,
    borderRadius: 3,
    alignSelf: 'center',
    marginBottom: 10,
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    marginBottom: 10,
  },
  sheetTitle: {
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  sheetCloseBtn: {
    padding: 6,
  },
  searchBarWrapper: {
    position: 'relative',
    marginBottom: 10,
  },
  searchInput: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    paddingRight: 36,
  },
  clearSearchBtn: {
    position: 'absolute',
    right: 12,
    top: 12,
    padding: 4,
  },
  sheetRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderBottomWidth: 0.5,
    borderRadius: 8,
  },
  sheetRowText: {
    letterSpacing: 0.3,
  },
});
