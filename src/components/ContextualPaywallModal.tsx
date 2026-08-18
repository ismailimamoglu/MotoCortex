import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import Purchases from 'react-native-purchases';
import { useAppStore, checkIsProStatus } from '../store/useAppStore';
import { useBluetoothStore } from '../store/useBluetoothStore';
import { useThemeColors } from '../theme';
import { useResponsive } from '../hooks/useResponsive';

const REVENUECAT_OFFLINE_DEFAULTS = {
  weekly: { id: 'motocortex_pro_weekly_nonrenew', price: '₺164,99', usdPrice: '$4.99' },
  monthly: { id: 'motocortex_pro_monthly', price: '₺329,99', usdPrice: '$9.99' },
  yearly: { id: 'motocortex_pro_yearly', price: '₺1.099,99', usdPrice: '$29.99' },
};

export default function ContextualPaywallModal() {
  const { t, i18n } = useTranslation();
  const colors = useThemeColors();
  const { s: scaleWidth, vs: scaleHeight, ms: scaleMod, fs: scaleFont, isTablet } = useResponsive();
  
  const paywallContext = useBluetoothStore(state => state.paywallContext);
  const clearPaywallContext = useBluetoothStore(state => state.clearPaywallContext);
  const isPro = useAppStore(state => state.isPro);
  const setIsPro = useAppStore(state => state.setIsPro);

  const [isLoading, setIsLoading] = useState(false);
  const isTurkish = i18n.language?.startsWith('tr');
  const defaultPrices = {
    weekly: isTurkish ? REVENUECAT_OFFLINE_DEFAULTS.weekly.price : REVENUECAT_OFFLINE_DEFAULTS.weekly.usdPrice,
    monthly: isTurkish ? REVENUECAT_OFFLINE_DEFAULTS.monthly.price : REVENUECAT_OFFLINE_DEFAULTS.monthly.usdPrice,
    yearly: isTurkish ? REVENUECAT_OFFLINE_DEFAULTS.yearly.price : REVENUECAT_OFFLINE_DEFAULTS.yearly.usdPrice,
  };

  const [prices, setPrices] = useState(defaultPrices);
  const [packages, setPackages] = useState<any>({ weekly: null, monthly: null, yearly: null });

  const MONO = Platform.OS === 'ios' ? 'System' : 'sans-serif';

  useEffect(() => {
    if (!paywallContext) return;
    
    let active = true;
    const fetchOfferings = async () => {
      try {
        const offerings = await Purchases.getOfferings();
        if (offerings.current && offerings.current.availablePackages.length > 0 && active) {
          const currentOffering = offerings.current;
          const customWeekly = currentOffering.availablePackages.find(p => 
            p.identifier === 'weekly_single' || p.identifier === '$rc_weekly' || p.identifier === 'weekly' || p.product?.identifier === 'motocortex_pro_weekly_nonrenew'
          ) || null;
          
          const customMonthly = currentOffering.availablePackages.find(p => 
            p.identifier === '$rc_monthly' || p.identifier === 'monthly' || p.product?.identifier === 'motocortex_pro_monthly'
          ) || null;
          
          const customYearly = currentOffering.availablePackages.find(p => 
            p.identifier === '$rc_annual' || p.identifier === 'annual' || p.identifier === '$rc_yearly' || p.identifier === 'yearly' || p.product?.identifier === 'motocortex_pro_yearly'
          ) || null;

          const isUsdDominant = customWeekly?.product.priceString?.includes('$') || customMonthly?.product.priceString?.includes('$') || customYearly?.product.priceString?.includes('$');

          setPrices({
            weekly: customWeekly?.product.priceString || (isUsdDominant ? REVENUECAT_OFFLINE_DEFAULTS.weekly.usdPrice : defaultPrices.weekly),
            monthly: customMonthly?.product.priceString || (isUsdDominant ? REVENUECAT_OFFLINE_DEFAULTS.monthly.usdPrice : defaultPrices.monthly),
            yearly: customYearly?.product.priceString || (isUsdDominant ? REVENUECAT_OFFLINE_DEFAULTS.yearly.usdPrice : defaultPrices.yearly),
          });

          setPackages({
            weekly: customWeekly,
            monthly: customMonthly,
            yearly: customYearly,
          });
        }
      } catch (err) {
        console.warn('[ContextualPaywall] Offline fallback used:', err);
      }
    };

    fetchOfferings();
    return () => { active = false; };
  }, [paywallContext, isTurkish]);

  if (!paywallContext || isPro) return null;

  const handlePurchase = async (type: 'weekly' | 'monthly' | 'yearly') => {
    setIsLoading(true);
    try {
      const pkg = packages[type];
      let customerInfo;
      if (pkg) {
        const res = await Purchases.purchasePackage(pkg);
        customerInfo = res.customerInfo;
      } else {
        const prodId = REVENUECAT_OFFLINE_DEFAULTS[type].id;
        const products = await Purchases.getProducts([prodId]);
        if (products.length > 0) {
          const res = await Purchases.purchaseStoreProduct(products[0]);
          customerInfo = res.customerInfo;
        } else {
          throw new Error('Product not found in StoreKit/PlayStore');
        }
      }

      const activePro = checkIsProStatus(customerInfo);
      setIsPro(activePro);
      if (activePro) {
        Alert.alert(t('paywall.congratsTitle'), t('paywall.congratsMsg'));
        clearPaywallContext();
      }
    } catch (error: any) {
      if (!error?.userCancelled) {
        Alert.alert(t('paywall.errTitle'), error?.message || t('paywall.errMsg'));
      }
    } finally {
      setIsLoading(false);
    }
  };

  const getBadgeText = () => {
    if (paywallContext === 'AI_DOCTOR_LIMIT') {
      return '🤖 ' + t('paywall.aiDoctorLimitTitle', { defaultValue: 'AI TEŞHİS DOKTORU' });
    }
    if (paywallContext === 'ACTION_LOCKED') {
      return '⚡ ' + t('paywall.actionLocked', { defaultValue: 'GİZLİ ÖZELLİK KODLAMA' });
    }
    if (paywallContext === 'CUSTOM_SENSORS') {
      return '🎛️ ' + t('paywall.liveSensorsTitle', { defaultValue: 'CANLI SENSÖRLER' });
    }
    if (paywallContext === 'DTC_DETAIL') {
      return '🔍 ' + t('paywall.dtcAnalysis', { defaultValue: 'DETAYLI ARIZA ANALİZİ' });
    }
    if (typeof paywallContext === 'string' && /^[PCBU][0-9A-Fa-f]{4}/.test(paywallContext)) {
      return `⚠️ ${paywallContext} ${t('paywall.dtcCodeReport', { defaultValue: 'ARIZA RAPORU' })}`;
    }
    return '🔒 ' + (paywallContext || 'PRO');
  };

  const getDescText = () => {
    if (paywallContext === 'AI_DOCTOR_LIMIT') {
      return t('paywall.aiDoctorLimitDesc', { defaultValue: 'Günlük ücretsiz AI analiz limitine ulaştınız. Sınırsız yapay zeka araç doktoru desteği için PRO sürüme geçin.' });
    }
    if (paywallContext === 'DTC_DETAIL' || (typeof paywallContext === 'string' && /^[PCBU][0-9A-Fa-f]{4}/.test(paywallContext))) {
      return t('paywall.dtcPaywallDesc', { defaultValue: 'Bu arıza kodunun motor üzerindeki kritik risklerini, olası tamir maliyetlerini ve ayrıntılı çözüm yönergelerini görmek için PRO paketine yükseltin.' });
    }
    if (paywallContext === 'CUSTOM_SENSORS') {
      return t('paywall.customSensorsDesc', { defaultValue: 'Gelişmiş canlı sensörleri (Turbo, Yağ Sıcaklığı, Tork, AFR vb.) izlemek ve gösterge panelini sınırsız özelleştirmek için PRO pakete yükseltin.' });
    }
    if (paywallContext === 'ACTION_LOCKED') {
      return t('paywall.actionLockedDesc', { defaultValue: '1 adet ücretsiz kodlama hakkınızı kullandınız. Sınırsız OEM gizli özellik açma ve adaptasyon için PRO sürüme geçin.' });
    }
    return t('paywall.contextualDesc', { defaultValue: 'Bu özelliği ve tüm profesyonel araç teşhis araçlarını sınırsız kullanmak için PRO pakete yükseltin.' });
  };

  const sDyn = StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: colors.overlayHeavy,
      justifyContent: 'flex-end',
      alignItems: 'center',
    },
    container: {
      width: isTablet ? scaleWidth(480) : '100%',
      backgroundColor: colors.card,
      borderTopLeftRadius: scaleMod(20),
      borderTopRightRadius: scaleMod(20),
      borderWidth: isTablet ? 1.5 : 0,
      borderColor: colors.cardBorder,
      padding: scaleMod(20),
      paddingBottom: scaleHeight(40),
      alignItems: 'center',
    },
    handle: {
      width: scaleWidth(40),
      height: scaleHeight(5),
      borderRadius: 2.5,
      backgroundColor: colors.textTertiary,
      opacity: 0.3,
      marginBottom: scaleHeight(15),
    },
    title: {
      fontSize: scaleFont(18),
      fontWeight: '900',
      fontFamily: MONO,
      color: colors.textPri,
      marginBottom: scaleHeight(10),
      textAlign: 'center',
      letterSpacing: 0.5,
    },
    desc: {
      fontSize: scaleFont(12),
      fontFamily: MONO,
      color: colors.textSec,
      textAlign: 'center',
      marginBottom: scaleHeight(16),
      lineHeight: scaleFont(17),
      paddingHorizontal: scaleWidth(10),
    },
    codeBox: {
      backgroundColor: `${colors.purple || '#9c27b0'}15`,
      borderWidth: 1.2,
      borderColor: `${colors.purple || '#9c27b0'}60`,
      borderRadius: scaleMod(8),
      paddingVertical: scaleHeight(6),
      paddingHorizontal: scaleWidth(14),
      marginBottom: scaleHeight(18),
    },
    codeText: {
      fontSize: scaleFont(12),
      fontWeight: '900',
      fontFamily: MONO,
      color: colors.purple || '#ab47bc',
      letterSpacing: 0.5,
    },
    option: {
      width: '100%',
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      backgroundColor: `${colors.purple || '#9c27b0'}08`,
      borderWidth: 1.2,
      borderColor: colors.cardBorder,
      borderRadius: scaleMod(12),
      paddingVertical: scaleHeight(14),
      paddingHorizontal: scaleWidth(16),
      marginBottom: scaleHeight(10),
    },
    optionTitle: {
      fontSize: scaleFont(13.5),
      fontWeight: '800',
      fontFamily: MONO,
      color: colors.textPri,
    },
    optionPrice: {
      fontSize: scaleFont(14),
      fontWeight: '900',
      fontFamily: MONO,
      color: colors.cyan || colors.purple,
    },
    closeBtn: {
      marginTop: scaleHeight(10),
      paddingVertical: scaleHeight(10),
      width: '100%',
      alignItems: 'center',
    },
    closeBtnText: {
      fontSize: scaleFont(13),
      fontWeight: '800',
      fontFamily: MONO,
      color: colors.textTertiary,
    },
  });

  return (
    <Modal
      visible={!!paywallContext}
      transparent={true}
      animationType="slide"
      onRequestClose={clearPaywallContext}
    >
      <TouchableOpacity activeOpacity={1} style={sDyn.overlay} onPress={clearPaywallContext}>
        <TouchableOpacity activeOpacity={1} style={sDyn.container} onPress={(e) => e.stopPropagation()}>
          <View style={sDyn.handle} />
          <Text style={sDyn.title}>👑 {t('paywall.crownBadge', { defaultValue: 'MOTO CORTEX PRO' })}</Text>
          <Text style={sDyn.desc}>
            {getDescText()}
          </Text>
          
          <View style={sDyn.codeBox}>
            <Text style={sDyn.codeText}>
              {getBadgeText()}
            </Text>
          </View>

          <TouchableOpacity style={sDyn.option} onPress={() => handlePurchase('weekly')} disabled={isLoading}>
            <Text style={sDyn.optionTitle}>{t('paywall.weekly', { defaultValue: 'Haftalık Üyelik' })}</Text>
            <Text style={sDyn.optionPrice}>{prices.weekly}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={sDyn.option} onPress={() => handlePurchase('monthly')} disabled={isLoading}>
            <Text style={sDyn.optionTitle}>{t('paywall.monthly', { defaultValue: 'Aylık Üyelik' })}</Text>
            <Text style={sDyn.optionPrice}>{prices.monthly}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={sDyn.option} onPress={() => handlePurchase('yearly')} disabled={isLoading}>
            <Text style={sDyn.optionTitle}>{t('paywall.yearly', { defaultValue: 'Yıllık Üyelik' })}</Text>
            <Text style={sDyn.optionPrice}>{prices.yearly}</Text>
          </TouchableOpacity>

          {isLoading && <ActivityIndicator color={colors.purple} style={{ marginTop: 10 }} />}

          <TouchableOpacity style={sDyn.closeBtn} onPress={clearPaywallContext}>
            <Text style={sDyn.closeBtnText}>{t('common.cancel', { defaultValue: 'İptal' })}</Text>
          </TouchableOpacity>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}
