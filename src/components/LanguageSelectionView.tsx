import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
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
    { label: 'English', value: 'en', flag: '🇬🇧' },
    { label: 'Deutsch', value: 'de', flag: '🇩🇪' },
    { label: 'Español', value: 'es', flag: '🇪🇸' },
    { label: 'Türkçe', value: 'tr', flag: '🇹🇷' },
    { label: 'Indonesia', value: 'id', flag: '🇮🇩' },
    { label: 'Italiano', value: 'it', flag: '🇮🇹' },
    { label: 'العربية', value: 'ar', flag: '🇸🇦' },
    { label: '简体中文', value: 'zh', flag: '🇨🇳' },
    { label: 'Dansk', value: 'da', flag: '🇩🇰' },
    { label: 'Suomi', value: 'fi', flag: '🇫🇮' },
    { label: 'Français', value: 'fr', flag: '🇫🇷' },
    { label: 'हिन्दी', value: 'hi', flag: '🇮🇳' },
    { label: 'Nederlands', value: 'nl', flag: '🇳🇱' },
    { label: '日本語', value: 'ja', flag: '🇯🇵' },
    { label: '한국어', value: 'ko', flag: '🇰🇷' },
    { label: 'Polski', value: 'pl', flag: '🇵🇱' },
    { label: 'Magyar', value: 'hu', flag: '🇭🇺' },
    { label: 'Norsk', value: 'no', flag: '🇳🇴' },
    { label: 'Português', value: 'pt', flag: '🇵🇹' },
    { label: 'Română', value: 'ro', flag: '🇷🇴' },
    { label: 'Русский', value: 'ru', flag: '🇷🇺' },
    { label: 'ไทย', value: 'th', flag: '🇹🇭' },
    { label: 'Українська', value: 'uk', flag: '🇺🇦' },
    { label: 'Ελληνικά', value: 'el', flag: '🇬🇷' },
    { label: 'Čeština', value: 'cs', flag: '🇨🇿' },
    { label: 'Svenska', value: 'sv', flag: '🇸🇪' },
  ];

  const sortedLanguages = useMemo(() => {
    return [...languagesList].sort((a, b) => a.label.localeCompare(b.label));
  }, []);

  const filteredOptions = useMemo(() => {
    if (!searchQuery) return sortedLanguages;
    const q = searchQuery.toLowerCase().trim();
    return sortedLanguages.filter((opt) => opt.label.toLowerCase().includes(q));
  }, [sortedLanguages, searchQuery]);

  const renderItem = ({ item }: { item: typeof languagesList[0] }) => {
    const isSelected = currentLanguage === item.value;
    return (
      <TouchableOpacity
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
        <Text style={{ fontSize: scaleFont(14), marginRight: scaleWidth(8) }}>{item.flag}</Text>
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
          <Text style={{ fontSize: scaleFont(12), color: colors.cyan, fontWeight: '900', marginLeft: 'auto' }}>
            ✓
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

      {/* FlatList */}
      <FlatList
        data={filteredOptions}
        keyExtractor={(item) => item.value}
        renderItem={renderItem}
        style={{ flex: 1 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={true}
      />
    </View>
  );
}
