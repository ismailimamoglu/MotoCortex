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
import { ALL_26_LANGUAGES } from '../constants/languages';

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

  const filteredOptions = useMemo(() => {
    if (!searchQuery) return ALL_26_LANGUAGES;
    const q = searchQuery.toLowerCase().trim();
    return ALL_26_LANGUAGES.filter((opt) => opt.name.toLowerCase().includes(q) || opt.nativeName.toLowerCase().includes(q));
  }, [searchQuery]);

  const renderItem = (item: typeof ALL_26_LANGUAGES[0]) => {
    const isSelected = currentLanguage === item.code;
    return (
      <TouchableOpacity
        key={item.code}
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
          onSelect(item.code);
        }}
        activeOpacity={0.4}
      >
        <Text style={{ fontSize: scaleFont(16), marginRight: scaleWidth(10) }}>{item.flag}</Text>
        <Text
          style={{
            fontSize: scaleFont(12),
            fontFamily: MONO,
            color: isSelected ? colors.cyan : colors.textPri,
            fontWeight: isSelected ? '800' : '500',
          }}
        >
          {item.name}
        </Text>
        {isSelected && (
          <Text style={{ fontSize: scaleFont(11), fontFamily: MONO, color: colors.cyan, fontWeight: '900', marginLeft: 'auto' }}>
            {t('common.selected').toUpperCase()}
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
          placeholder={t('vehicleSelect.searchLanguage')}
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
