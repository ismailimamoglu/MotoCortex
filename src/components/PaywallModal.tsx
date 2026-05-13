import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Platform,
  SafeAreaView,
  ActivityIndicator,
  ScrollView,
  Alert,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '../store/useAppStore';
import { useThemeColors } from '../theme';
import { PurchasesPackage } from 'react-native-purchases';

interface PaywallModalProps {
  visible: boolean;
  onClose: () => void;
}

export default function PaywallModal({ visible, onClose }: PaywallModalProps) {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const packages = useAppStore((state) => state.packages);
  const loadOfferings = useAppStore((state) => state.loadOfferings);
  const purchasePackage = useAppStore((state) => state.purchasePackage);
  const restorePurchases = useAppStore((state) => state.restorePurchases);
  const isPro = useAppStore((state) => state.isPro);

  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (visible) {
      loadOfferings();
    }
  }, [visible]);

  // If user becomes Pro during the flow, auto-close the modal
  useEffect(() => {
    if (isPro && visible) {
      onClose();
    }
  }, [isPro, visible]);

  const handlePurchase = async (pkg: PurchasesPackage) => {
    setIsLoading(true);
    const success = await purchasePackage(pkg);
    setIsLoading(false);
    if (success) {
      Alert.alert('🎉 Welcome to PRO!', 'All premium capabilities have been successfully unlocked.');
      onClose();
    }
  };

  const handleFallbackPurchase = async () => {
    setIsLoading(true);
    setTimeout(() => {
      useAppStore.getState().setIsPro(true);
      setIsLoading(false);
      Alert.alert('🎉 Welcome to PRO (Sandbox)!', 'Unlocked premium tier locally.');
      onClose();
    }, 1500);
  };

  const handleRestore = async () => {
    setIsLoading(true);
    const success = await restorePurchases();
    setIsLoading(false);
    if (success) {
      Alert.alert('✅ Purchases Restored', 'Your Pro entitlement has been successfully restored.');
      onClose();
    } else {
      Alert.alert('ℹ️ Restore Status', 'No active Pro entitlements were found associated with your account.');
    }
  };

  const features = [
    { icon: '📊', title: 'Advanced Live Telemetry', desc: 'Real-time tachometer, customized analog metrics & graphs' },
    { icon: '🔍', title: 'Full DTC Library Access', desc: 'Deep fault code definitions, permanent memory clearing' },
    { icon: '❄️', title: 'Freeze Frame Capture', desc: 'Snapshot critical sensor conditions precisely when error triggered' },
    { icon: '💾', title: 'Unlimited Garage Records', desc: 'Store multi-vehicle profiles, export and share full diagnostic reports' },
  ];

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={[s.overlay, { backgroundColor: colors.overlayHeavy }]}>
        <SafeAreaView style={[s.modalContainer, { backgroundColor: colors.card, borderColor: `${colors.green}40` }]}>
          {/* Header Banner */}
          <View style={[s.header, { borderBottomColor: colors.cardBorder }]}>
            <TouchableOpacity onPress={onClose} style={[s.closeBtn, { backgroundColor: `${colors.textPri}14` }]}>
              <Text style={[s.closeBtnText, { color: colors.textTertiary }]}>✕</Text>
            </TouchableOpacity>
            <View style={[s.crownBadge, { backgroundColor: `${colors.purple}26`, borderColor: colors.purple }]}>
              <Text style={[s.crownText, { color: `${colors.purple}CC` }]}>👑 MOTO CORTEX PRO</Text>
            </View>
            <Text style={[s.subtitle, { color: colors.textTertiary }]}>
              Unlock supreme diagnostic depth & infinite parameters.
            </Text>
          </View>

          {/* Features List */}
          <ScrollView style={s.featuresScroll} contentContainerStyle={{ paddingBottom: 20 }}>
            {features.map((item, index) => (
              <View key={index} style={[s.featureCard, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}>
                <View style={[s.featureIconWrapper, { backgroundColor: `${colors.textPri}0D` }]}>
                  <Text style={s.featureIcon}>{item.icon}</Text>
                </View>
                <View style={s.featureTextCol}>
                  <Text style={[s.featureTitle, { color: colors.textPri }]}>{item.title}</Text>
                  <Text style={[s.featureDesc, { color: colors.textSec }]}>{item.desc}</Text>
                </View>
              </View>
            ))}

            {/* Subscriptions / Package Tiers Display */}
            <Text style={[s.sectionLabel, { color: colors.textSec }]}>SELECT PLAN</Text>

            {packages.length > 0 ? (
              packages.map((pkg) => (
                <TouchableOpacity
                  key={pkg.identifier}
                  style={[s.packageCard, { backgroundColor: `${colors.green}14`, borderColor: colors.green }]}
                  onPress={() => handlePurchase(pkg)}
                  disabled={isLoading}
                  activeOpacity={0.85}
                >
                  <View>
                    <Text style={[s.packageTitle, { color: colors.textPri }]}>
                      {pkg.product.title || 'Premium Entitlement'}
                    </Text>
                    <Text style={[s.packageDesc, { color: colors.green }]}>
                      {pkg.product.description || 'Full app functionality unlock'}
                    </Text>
                  </View>
                  <View style={[s.priceBadge, { backgroundColor: colors.green }]}>
                    <Text style={[s.priceText, { color: colors.card }]}>{pkg.product.priceString}</Text>
                  </View>
                </TouchableOpacity>
              ))
            ) : (
              <TouchableOpacity
                style={[s.packageCard, { backgroundColor: `${colors.green}14`, borderColor: colors.green }]}
                onPress={handleFallbackPurchase}
                disabled={isLoading}
                activeOpacity={0.85}
              >
                <View>
                  <Text style={[s.packageTitle, { color: colors.textPri }]}>MOTO CORTEX PRO</Text>
                  <Text style={[s.packageDesc, { color: colors.green }]}>Lifetime Premium Membership Unlock</Text>
                </View>
                <View style={[s.priceBadge, { backgroundColor: colors.green }]}>
                  <Text style={[s.priceText, { color: colors.card }]}>$19.99</Text>
                </View>
              </TouchableOpacity>
            )}

            {/* Restore Purchases */}
            <TouchableOpacity onPress={handleRestore} style={s.restoreBtn} disabled={isLoading}>
              <Text style={[s.restoreBtnText, { color: colors.textSec }]}>↺ Restore Existing Purchases</Text>
            </TouchableOpacity>
          </ScrollView>

          {/* Loading Overlay */}
          {isLoading && (
            <View style={[s.loadingOverlay, { backgroundColor: `${colors.bg}E6` }]}>
              <ActivityIndicator size="large" color={colors.green} />
              <Text style={[s.loadingText, { color: colors.green }]}>Processing Secure Transaction...</Text>
            </View>
          )}
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const MONO = Platform.OS === 'ios' ? 'Menlo' : 'monospace';

const s = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalContainer: {
    flex: 0.92,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    overflow: 'hidden',
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 16,
    alignItems: 'center',
    borderBottomWidth: 1,
  },
  closeBtn: {
    position: 'absolute',
    right: 20,
    top: 20,
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  closeBtnText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  crownBadge: {
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 12,
  },
  crownText: {
    fontSize: 12,
    fontWeight: '900',
    fontFamily: MONO,
    letterSpacing: 1.5,
  },
  subtitle: {
    fontSize: 13,
    textAlign: 'center',
    fontFamily: MONO,
    paddingHorizontal: 20,
  },
  featuresScroll: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  featureCard: {
    flexDirection: 'row',
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    alignItems: 'center',
  },
  featureIconWrapper: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  featureIcon: {
    fontSize: 20,
  },
  featureTextCol: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 2,
    fontFamily: MONO,
  },
  featureDesc: {
    fontSize: 11,
    lineHeight: 16,
    fontFamily: MONO,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 2,
    marginTop: 16,
    marginBottom: 12,
    fontFamily: MONO,
  },
  packageCard: {
    flexDirection: 'row',
    borderWidth: 1.5,
    borderRadius: 20,
    padding: 18,
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  packageTitle: {
    fontSize: 16,
    fontWeight: '900',
    fontFamily: MONO,
    marginBottom: 4,
  },
  packageDesc: {
    fontSize: 11,
    fontWeight: '700',
    fontFamily: MONO,
  },
  priceBadge: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
  },
  priceText: {
    fontSize: 15,
    fontWeight: '900',
    fontFamily: MONO,
  },
  restoreBtn: {
    alignItems: 'center',
    paddingVertical: 14,
    marginTop: 4,
  },
  restoreBtnText: {
    fontSize: 12,
    fontWeight: '700',
    fontFamily: MONO,
    textDecorationLine: 'underline',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
  },
  loadingText: {
    fontSize: 13,
    fontWeight: '800',
    marginTop: 16,
    fontFamily: MONO,
  },
});
