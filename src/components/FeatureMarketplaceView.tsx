import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  FlatList,
  Platform,
  SafeAreaView,
  Alert
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useThemeColors } from '../theme';

const MONO = Platform.OS === 'ios' ? 'System' : 'sans-serif';

interface MarketplaceItem {
  id: string;
  title: string;
  category: string;
  brand: string;
  price: string;
  description: string;
  unlocked: boolean;
}

interface FeatureMarketplaceViewProps {
  visible: boolean;
  onClose: () => void;
}

export default function FeatureMarketplaceView({ visible, onClose }: FeatureMarketplaceViewProps) {
  const { t } = useTranslation();
  const colors = useThemeColors();

  const [items, setItems] = useState<MarketplaceItem[]>([
    {
      id: 'bmw_service_pack',
      title: 'BMW Motorrad Full Service Reset Pack',
      category: 'MAINTENANCE',
      brand: 'BMW',
      price: '$4.99',
      description: 'One-click service indicator reset, brake fluid date reset, and ESA calibration.',
      unlocked: false,
    },
    {
      id: 'ducati_quickshifter_pack',
      title: 'Ducati DQS Quickshifter & Desmo Calibration',
      category: 'PERFORMANCE',
      brand: 'Ducati',
      price: '$6.99',
      description: 'Quickshifter shift-up/down adaptation reset and Desmo service reminder clearing.',
      unlocked: false,
    },
    {
      id: 'ktm_abs_dongle',
      title: 'KTM SuperDuke ABS Mode Unlock',
      category: 'SAFETY / ABS',
      brand: 'KTM',
      price: '$3.99',
      description: 'Enables Supermoto ABS mode (disables rear ABS while keeping front active).',
      unlocked: true,
    },
    {
      id: 'yamaha_tps_pack',
      title: 'Yamaha MT/YZF Throttle Response Tuning',
      category: 'TUNING',
      brand: 'Yamaha',
      price: '$5.99',
      description: 'TPS zero-position re-calibration and CO mixture adjustment.',
      unlocked: false,
    },
  ]);

  const handleUnlock = (item: MarketplaceItem) => {
    if (item.unlocked) {
      Alert.alert('Already Unlocked');
      return;
    }

    Alert.alert(
      'Unlock Feature Pack',
      `Unlock ${item.title} for ${item.price}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Unlock Now',
          onPress: () => {
            setItems(prev => prev.map(i => i.id === item.id ? { ...i, unlocked: true } : i));
            Alert.alert('Success');
          }
        }
      ]
    );
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onClose}>
      <SafeAreaView style={[styles.container, { backgroundColor: colors.bg || '#090d16' }]}>
        <View style={styles.header}>
          <View>
            <Text style={[styles.headerTitle, { color: colors.textPri || '#ffffff' }]}>{t('marketplace.title')}</Text>
            <Text style={styles.headerSubtitle}>{t('marketplace.subtitle')}</Text>
          </View>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeText}>✕</Text>
          </TouchableOpacity>
        </View>

        <FlatList
          data={items}
          keyExtractor={i => i.id}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <View style={styles.itemCard}>
              <View style={styles.itemHeader}>
                <View style={styles.brandTag}>
                  <Text style={styles.brandText}>{item.brand}</Text>
                </View>
                <Text style={styles.categoryText}>{item.category}</Text>
              </View>

              <Text style={styles.itemTitle}>{item.title}</Text>
              <Text style={styles.itemDesc}>{item.description}</Text>

              <View style={styles.itemFooter}>
                <Text style={styles.itemPrice}>{item.price}</Text>

                <TouchableOpacity
                  style={[styles.unlockButton, item.unlocked && styles.unlockedButton]}
                  onPress={() => handleUnlock(item)}
                >
                  <Text style={styles.unlockButtonText}>
                    {item.unlocked ? '✓ UNLOCKED' : 'UNLOCK PACK'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        />
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#1a2638',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    fontFamily: MONO,
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#88a0c0',
    marginTop: 2,
  },
  closeButton: {
    padding: 8,
    backgroundColor: '#1c283d',
    borderRadius: 20,
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  listContent: {
    padding: 16,
  },
  itemCard: {
    backgroundColor: '#111c2e',
    borderColor: '#1e2e48',
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    marginBottom: 14,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  brandTag: {
    backgroundColor: '#003a52',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  brandText: {
    color: '#00e5ff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  categoryText: {
    color: '#7a94b8',
    fontSize: 10,
    fontWeight: 'bold',
  },
  itemTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 4,
  },
  itemDesc: {
    fontSize: 13,
    color: '#88a0c0',
    lineHeight: 18,
    marginBottom: 12,
  },
  itemFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#19283f',
    paddingTop: 10,
  },
  itemPrice: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#00ffaa',
    fontFamily: MONO,
  },
  unlockButton: {
    backgroundColor: '#006680',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#00e5ff',
  },
  unlockedButton: {
    backgroundColor: '#0d3822',
    borderColor: '#00cc66',
  },
  unlockButtonText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold',
  },
});
