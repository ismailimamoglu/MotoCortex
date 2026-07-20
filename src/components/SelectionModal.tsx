import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Platform,
  TextInput,
  FlatList,
  KeyboardAvoidingView,
  TouchableWithoutFeedback,
  Keyboard
} from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useThemeColors } from '../theme';
import { useResponsive } from '../hooks/useResponsive';

export interface SelectionOption {
  label: string;
  value: string;
  flag?: string; // for languages
}

interface SelectionModalProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  options: SelectionOption[];
  selectedValue: string | null;
  onSelect: (value: string) => void;
  showSearch?: boolean;
  searchPlaceholder?: string;
}

function SelectionModalContent({
  visible,
  onClose,
  title,
  options,
  selectedValue,
  onSelect,
  showSearch = false,
  searchPlaceholder = 'Ara...'
}: SelectionModalProps) {
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const { s: scaleWidth, vs: scaleHeight, ms: scaleMod, fs: scaleFont } = useResponsive();
  const [searchQuery, setSearchQuery] = useState('');

  // Reset search when modal becomes visible or invisible
  useEffect(() => {
    if (visible) {
      setSearchQuery('');
    }
  }, [visible]);

  const filteredOptions = React.useMemo(() => {
    if (!showSearch || !searchQuery) return options;
    const q = searchQuery.toLowerCase().trim();
    return options.filter((opt) => opt.label.toLowerCase().includes(q));
  }, [options, searchQuery, showSearch]);

  const MONO = Platform.OS === 'ios' ? 'System' : 'sans-serif';

  const sDyn = React.useMemo(() => {
    return {
      overlay: {
        flex: 1,
        backgroundColor: colors.bg,
      },
      container: {
        flex: 1,
        backgroundColor: colors.bg,
        overflow: 'hidden' as const,
        paddingTop: Platform.OS === 'ios' ? insets.top : 0,
        paddingBottom: insets.bottom + scaleHeight(6),
      },
      header: {
        flexDirection: 'row' as const,
        alignItems: 'center' as const,
        paddingHorizontal: scaleWidth(16),
        height: scaleHeight(54),
        borderBottomWidth: 1.2,
        borderBottomColor: colors.border,
        backgroundColor: colors.card,
      },
      backBtn: {
        paddingVertical: scaleHeight(8),
        paddingRight: scaleWidth(12),
        minWidth: scaleWidth(60),
      },
      backBtnText: {
        fontSize: scaleFont(12),
        fontWeight: 'bold' as const,
        fontFamily: MONO,
        color: colors.cyan,
      },
      headerTitle: {
        flex: 1,
        textAlign: 'center' as const,
        fontSize: scaleFont(12.5),
        fontWeight: '900' as const,
        fontFamily: MONO,
        color: colors.textPri,
        letterSpacing: 1,
      },
      searchBarContainer: {
        padding: scaleMod(10),
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
        backgroundColor: colors.card,
      },
      searchInput: {
        backgroundColor: `${colors.textPri}05`,
        borderColor: colors.border,
        borderWidth: 1,
        borderRadius: 8,
        color: colors.textPri,
        fontFamily: MONO,
        fontSize: scaleFont(11),
        paddingHorizontal: scaleWidth(12),
        paddingVertical: scaleHeight(8),
      },
      list: {
        flex: 1,
      },
      item: {
        flexDirection: 'row' as const,
        alignItems: 'center' as const,
        paddingVertical: scaleHeight(14),
        paddingHorizontal: scaleWidth(16),
        borderBottomWidth: 1,
      },
      itemText: {
        fontSize: scaleFont(12),
        fontFamily: MONO,
      },
      itemFlag: {
        fontSize: scaleFont(14),
        marginRight: scaleWidth(8),
      },
      selectedCheck: {
        fontSize: scaleFont(12),
        color: colors.cyan,
        fontWeight: '900' as const,
        marginLeft: 'auto' as const,
      }
    };
  }, [colors, insets, scaleWidth, scaleHeight, scaleMod, scaleFont]);

  const renderItem = ({ item }: { item: SelectionOption }) => {
    const isSelected = selectedValue === item.value;
    return (
      <TouchableOpacity
        style={[
          sDyn.item,
          {
            borderBottomColor: `${colors.border}33`,
            backgroundColor: isSelected ? `${colors.cyan}0A` : 'transparent',
          }
        ]}
        onPress={() => {
          onSelect(item.value);
          onClose();
        }}
        activeOpacity={0.4}
      >
        {item.flag && <Text allowFontScaling={false} style={sDyn.itemFlag}>{item.flag}</Text>}
        <Text
          allowFontScaling={false}
          style={[
            sDyn.itemText,
            {
              color: isSelected ? colors.cyan : colors.textPri,
              fontWeight: isSelected ? '800' : '500',
            }
          ]}
        >
          {item.label}
        </Text>
        {isSelected && <Text allowFontScaling={false} style={sDyn.selectedCheck}>✓</Text>}
      </TouchableOpacity>
    );
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <View style={sDyn.overlay}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={sDyn.container}
        >
          {/* Header */}
          <View style={sDyn.header}>
            <TouchableOpacity onPress={onClose} style={sDyn.backBtn} activeOpacity={0.4}>
              <Text allowFontScaling={false} style={sDyn.backBtnText}>
                {`← ${t('common.back', 'BACK').toUpperCase()}`}
              </Text>
            </TouchableOpacity>
            <Text allowFontScaling={false} style={sDyn.headerTitle}>{title.toUpperCase()}</Text>
            <View style={{ width: scaleWidth(60) }} />
          </View>

          {/* Search Input (Conditional) */}
          {showSearch && (
            <View style={sDyn.searchBarContainer}>
              <TextInput
                style={sDyn.searchInput}
                placeholder={searchPlaceholder}
                placeholderTextColor={colors.textSec}
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
          )}

          {/* Scrollable list */}
          <FlatList
            data={filteredOptions}
            keyExtractor={(item) => item.value}
            renderItem={renderItem}
            style={sDyn.list}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={true}
          />
        </KeyboardAvoidingView>
      </View>
    </TouchableWithoutFeedback>
  );
}

export default function SelectionModal(props: SelectionModalProps) {
  if (!props.visible) return null;
  return (
    <Modal
      visible={props.visible}
      animationType="slide"
      transparent={false}
      onRequestClose={props.onClose}
    >
      <SafeAreaProvider>
        <SelectionModalContent {...props} />
      </SafeAreaProvider>
    </Modal>
  );
}
