import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, SafeAreaView } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useThemeColors } from '../theme';
import { useAppStore } from '../store/useAppStore';

export interface MarketplaceItem {
  id: string;
  nameKey: string;
  defaultName: string;
  descriptionKey: string;
  defaultDesc: string;
  price: string;
  tag: string;
  isUnlocked: boolean;
}

interface ContextualMarketplaceProps {
  onClose?: () => void;
  onPurchaseItem?: (item: MarketplaceItem) => void;
}

export const ContextualMarketplace: React.FC<ContextualMarketplaceProps> = ({
  onClose,
  onPurchaseItem,
}) => {
  const { t } = useTranslation();
  const tc = useThemeColors();
  const isPro = useAppStore((state) => state.isPro);

  const items: MarketplaceItem[] = [
    {
      id: 'pack_vag_sfd',
      nameKey: 'marketplace.vagSfdName',
      defaultName: 'VAG SFD 1/2 ECU Coding Pack',
      descriptionKey: 'marketplace.vagSfdDesc',
      defaultDesc: 'Unlock VAG (VW/Audi/Porsche) 2020+ Security Gateway ECU adaptation channels.',
      price: '$19.99',
      tag: 'POPULAR',
      isUnlocked: isPro,
    },
    {
      id: 'pack_ev_suite',
      nameKey: 'marketplace.evSuiteName',
      defaultName: 'EV/PHEV High-Voltage Battery Suite',
      descriptionKey: 'marketplace.evSuiteDesc',
      defaultDesc: 'Deep cell voltage balancing, SOH analysis, and isolation fault detection.',
      price: '$14.99',
      tag: 'NEW',
      isUnlocked: isPro,
    },
    {
      id: 'pack_bmw_enet',
      nameKey: 'marketplace.bmwEnetName',
      defaultName: 'BMW F/G-Series Feature Unlocker',
      descriptionKey: 'marketplace.bmwEnetDesc',
      defaultDesc: 'Video-in-motion, acoustic lock confirm, and Valvetronic adaptation resets.',
      price: '$19.99',
      tag: 'FEATURED',
      isUnlocked: isPro,
    },
  ];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: tc.bg }}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: tc.textPri }]}>
            🛒 {t('marketplace.title', 'MotoCortex Feature Marketplace')}
          </Text>
          {onClose && (
            <TouchableOpacity onPress={onClose} style={[styles.closeBtn, { backgroundColor: tc.elevated }]}>
              <Text style={{ color: tc.textPri, fontWeight: 'bold' }}>✕</Text>
            </TouchableOpacity>
          )}
        </View>

        <ScrollView contentContainerStyle={styles.content}>
          {items.map((item) => (
            <View
              key={item.id}
              style={[styles.card, { backgroundColor: tc.elevated, borderColor: item.isUnlocked ? tc.green : tc.cyan }]}
            >
              <View style={styles.cardHeader}>
                <Text style={[styles.itemName, { color: tc.textPri }]}>
                  {t(item.nameKey, item.defaultName)}
                </Text>
                <View style={[styles.tagBadge, { backgroundColor: `${tc.cyan}20` }]}>
                  <Text style={[styles.tagText, { color: tc.cyan }]}>{item.tag}</Text>
                </View>
              </View>

              <Text style={[styles.itemDesc, { color: tc.textSec }]}>
                {t(item.descriptionKey, item.defaultDesc)}
              </Text>

              <View style={styles.cardFooter}>
                <Text style={[styles.priceText, { color: tc.textPri }]}>{item.price}</Text>
                <TouchableOpacity
                  disabled={item.isUnlocked}
                  onPress={() => onPurchaseItem && onPurchaseItem(item)}
                  style={[
                    styles.buyBtn,
                    { backgroundColor: item.isUnlocked ? tc.green : tc.cyan, opacity: item.isUnlocked ? 0.8 : 1 },
                  ]}
                >
                  <Text style={styles.buyBtnText}>
                    {item.isUnlocked ? t('marketplace.unlocked', 'UNLOCKED') : t('marketplace.unlock', 'UNLOCK')}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '900',
    fontFamily: 'monospace',
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    gap: 12,
    paddingBottom: 24,
  },
  card: {
    padding: 16,
    borderRadius: 14,
    borderWidth: 1.5,
    gap: 8,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  itemName: {
    fontSize: 14,
    fontWeight: '800',
    flex: 1,
  },
  tagBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  tagText: {
    fontSize: 9.5,
    fontWeight: '800',
    fontFamily: 'monospace',
  },
  itemDesc: {
    fontSize: 11.5,
    lineHeight: 16,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  priceText: {
    fontSize: 16,
    fontWeight: '900',
    fontFamily: 'monospace',
  },
  buyBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  buyBtnText: {
    color: '#000',
    fontWeight: '900',
    fontSize: 11,
    fontFamily: 'monospace',
  },
});

export default ContextualMarketplace;
