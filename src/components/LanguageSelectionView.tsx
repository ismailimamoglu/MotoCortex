import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useThemeColors } from '../theme';
import { useResponsive } from '../hooks/useResponsive';
import { AppLanguage } from '../store/useAppStore';

interface LanguageSelectionViewProps {
  currentLanguage: string;
  onSelect: (lang: AppLanguage) => void;
}

const MONO = Platform.OS === 'ios' ? 'System' : 'sans-serif';

export default function LanguageSelectionView({
  currentLanguage,
  onSelect,
}: LanguageSelectionViewProps) {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const { s: scaleWidth, vs: scaleHeight, ms: scaleMod, fs: scaleFont } = useResponsive();
  const [searchQuery, setSearchQuery] = useState('');

  const languagesList = [
    { label: 'English', value: 'en', flag: 'EN' },
    { label: 'Deutsch', value: 'de', flag: 'DE' },
    { label: 'Español', value: 'es', flag: 'ES' },
    { label: 'Türkçe', value: 'tr', flag: 'TR' },
    { label: 'Indonesia', value: 'id', flag: 'ID' },
    { label: 'Italiano', value: 'it', flag: 'IT' },
    { label: 'العربية', value: 'ar', flag: 'AR' },
    { label: '简体中文', value: 'zh', flag: 'ZH' },
    { label: 'Dansk', value: 'da', flag: 'DA' },
    { label: 'Suomi', value: 'fi', flag: 'FI' },
    { label: 'Français', value: 'fr', flag: 'FR' },
    { label: 'हिन्दी', value: 'hi', flag: 'HI' },
    { label: 'Nederlands', value: 'nl', flag: 'NL' },
    { label: '日本語', value: 'ja', flag: 'JA' },
    { label: '한국어', value: 'ko', flag: 'KO' },
    { label: 'Polski', value: 'pl', flag: 'PL' },
    { label: 'Magyar', value: 'hu', flag: 'HU' },
    { label: 'Norsk', value: 'no', flag: 'NO' },
    { label: 'Português', value: 'pt', flag: 'PT' },
    { label: 'Română', value: 'ro', flag: 'RO' },
    { label: 'Русский', value: 'ru', flag: 'RU' },
    { label: 'ไทย', value: 'th', flag: 'TH' },
    { label: 'Українська', value: 'uk', flag: 'UK' },
    { label: 'Ελληνικά', value: 'el', flag: 'EL' },
    { label: 'Čeština', value: 'cs', flag: 'CS' },
    { label: 'Svenska', value: 'sv', flag: 'SV' },
  ];

  const sortedLanguages = useMemo(() => {
    return [...languagesList].sort((a, b) => a.label.localeCompare(b.label));
  }, []);

  const filteredOptions = useMemo(() => {
    if (!searchQuery) return sortedLanguages;
    const q = searchQuery.toLowerCase().trim();
    return sortedLanguages.filter((opt) => opt.label.toLowerCase().includes(q));
  }, [sortedLanguages, searchQuery]);

  const renderItem = (item: typeof languagesList[0]) => {
    const isSelected = currentLanguage === item.value;
    return (
      <TouchableOpacity
        key={item.value}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingVertical: scaleHeight(14),
          paddingHorizontal: scaleWidth(16),
          borderBottomWidth: 1,
          borderBottomColor: `${colors.border}33`,
          backgroundColor: isSelected ? `${colors.cyan}0A` : 'transparent',
        }}
        onPress={() => {
          onSelect(item.value as AppLanguage);
        }}
        activeOpacity={0.4}
      >
        <Text style={{ fontSize: scaleFont(11), fontFamily: MONO, color: colors.cyan, marginRight: scaleWidth(8), fontWeight: 'bold' }}>{item.flag}</Text>
        <Text
          style={{
            fontSize: scaleFont(12),
            fontFamily: MONO,
            color: isSelected ? colors.cyan : colors.textPri,
            fontWeight: isSelected ? '800' : '500',
          }}
        >
          {item.label}
        </Text>
        {isSelected && (
          <Text style={{ fontSize: scaleFont(11), fontFamily: MONO, color: colors.cyan, fontWeight: '900', marginLeft: 'auto' }}>
            {t('common.selected', 'SELECTED').toUpperCase()}
          </Text>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      {/* Search Input */}
      <View style={{
        padding: scaleMod(12),
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
        backgroundColor: colors.card,
      }}>
        <TextInput
          style={{
            backgroundColor: `${colors.textPri}05`,
            borderColor: colors.border,
            borderWidth: 1,
            borderRadius: 8,
            color: colors.textPri,
            fontFamily: MONO,
            fontSize: scaleFont(11),
            paddingHorizontal: scaleWidth(12),
            paddingVertical: scaleHeight(8),
          }}
          placeholder={t('vehicleSelect.searchLanguage', 'Dil Ara...')}
          placeholderTextColor={colors.textSec}
          value={searchQuery}
          onChangeText={setSearchQuery}
          autoCapitalize="none"
          autoCorrect={false}
        />
      </View>

      {/* Language List */}
      <View style={{ width: '100%' }}>
        {filteredOptions.map((item) => renderItem(item))}
      </View>
    </View>
  );
}
