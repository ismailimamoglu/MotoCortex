import React, { useState, useEffect } from 'react';
import {
 View,
 Text,
 StyleSheet,
 Modal,
 TouchableOpacity,
 Platform,
 ActivityIndicator,
 ScrollView,
 Alert,
 Linking,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import Purchases, { PurchasesPackage } from 'react-native-purchases';
import { useAppStore, checkIsProStatus } from '../store/useAppStore';
import { useThemeColors } from '../theme';
import { useResponsive } from '../hooks/useResponsive';
import analytics from '@react-native-firebase/analytics';

interface PaywallProps {
 visible: boolean;
 onClose: () => void;
}

// ─── CONFIGURATION: APP STORE SCREENSHOT MOCK MODE ─────────────────
const USE_MOCK_DATA = false; 

export default function Paywall({ visible, onClose }: PaywallProps) {
 const { t } = useTranslation();
 const colors = useThemeColors();
 const { s: scaleWidth, vs: scaleHeight, ms: scaleMod, fs: scaleFont, isTablet, isLargeTablet } = useResponsive();
 const insets = useSafeAreaInsets();
 const topInset = insets.top > 0 ? insets.top : (Platform.OS === 'ios' ? 47 : 0);
 const bottomInset = insets.bottom > 0 ? insets.bottom : (Platform.OS === 'ios' ? 34 : 0);
 const MONO = Platform.OS === 'ios' ? 'System' : 'sans-serif';

 const loadOfferings = useAppStore((state) => state.loadOfferings);
 const isPro = useAppStore((state) => state.isPro);
 const appUserId = useAppStore((state) => state.appUserId);
 const language = useAppStore((state) => state.language);

 const [isPurchasing, setIsPurchasing] = useState(false);
 const [isLoadingOfferings, setIsLoadingOfferings] = useState(false);
 const [selectedPkgId, setSelectedPkgId] = useState<string>('');

 const [weeklyPkg, setWeeklyPkg] = useState<PurchasesPackage | null>(null);
 const [monthlyPkg, setMonthlyPkg] = useState<PurchasesPackage | null>(null);
 const [yearlyPkg, setYearlyPkg] = useState<PurchasesPackage | null>(null);

 const mockPackages: any[] = [
 {
 identifier: 'weekly_single',
 packageType: 'WEEKLY',
 product: {
 price: 5.99,
 priceString: '$5.99',
 title: t('paywall.weekly'),
 description: t('paywall.weeklyDesc'),
 },
 },
 {
 identifier: '$rc_monthly',
 packageType: 'MONTHLY',
 product: {
 price: 19.99,
 priceString: '$19.99',
 title: t('paywall.monthly'),
 description: t('paywall.monthlyDesc'),
 },
 },
 {
 identifier: '$rc_yearly',
 packageType: 'ANNUAL',
 product: {
 price: 129.99,
 priceString: '$129.99',
 title: t('paywall.yearly'),
 description: t('paywall.yearlyDesc'),
 },
 },
 ];

  const fetchOfferings = async () => {
    const useLocalFallbacks = () => {
      const fallbackWeekly: any = {
        identifier: 'weekly_single',
        packageType: 'WEEKLY',
        isFallback: true,
        product: {
          identifier: 'motocortex_pro_weekly_nonrenew',
          price: 5.99,
          priceString: '$5.99',
          title: t('paywall.weekly'),
          description: t('paywall.weeklyDesc'),
        }
      };
      const fallbackMonthly: any = {
        identifier: '$rc_monthly',
        packageType: 'MONTHLY',
        isFallback: true,
        product: {
          identifier: 'motocortex_pro_monthly',
          price: 19.99,
          priceString: '$19.99',
          title: t('paywall.monthly'),
          description: t('paywall.monthlyDesc'),
        }
      };
      const fallbackYearly: any = {
        identifier: '$rc_yearly',
        packageType: 'ANNUAL',
        isFallback: true,
        product: {
          identifier: 'motocortex_pro_yearly',
          price: 129.99,
          priceString: '$129.99',
          title: t('paywall.yearly'),
          description: t('paywall.yearlyDesc'),
        }
      };
      setWeeklyPkg(fallbackWeekly);
      setMonthlyPkg(fallbackMonthly);
      setYearlyPkg(fallbackYearly);
      setSelectedPkgId('$rc_yearly');
    };

    // Pre-populate with immediate localized fallbacks so user never sees an infinite loading spinner
    useLocalFallbacks();

    if (USE_MOCK_DATA) {
      setIsLoadingOfferings(false);
      const w = mockPackages.find(p => p.identifier === 'weekly_single');
      const m = mockPackages.find(p => p.identifier === '$rc_monthly');
      const y = mockPackages.find(p => p.identifier === '$rc_yearly');
      setWeeklyPkg(w || null);
      setMonthlyPkg(m || null);
      setYearlyPkg(y || null);
      setSelectedPkgId('$rc_yearly');
      return;
    }

    try {
      // 2.5s Timeout guard to prevent hanging promise in case of slow or unconfigured network
      const offeringsPromise = Purchases.getOfferings();
      const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('OFFERINGS_TIMEOUT')), 2500));
      
      const offerings: any = await Promise.race([offeringsPromise, timeoutPromise]);
      if (offerings?.current?.availablePackages && offerings.current.availablePackages.length > 0) {
        const currentOffering = offerings.current;
        const customWeekly = currentOffering.availablePackages.find(
          (pkg: any) => pkg.identifier === 'weekly_single'
        ) || null;
        const customMonthly = currentOffering.availablePackages.find(
          (pkg: any) => pkg.identifier === 'src_monthly' || pkg.identifier === '$rc_monthly' || pkg.identifier === 'monthly'
        ) || null;
        const customYearly = currentOffering.availablePackages.find(
          (pkg: any) => pkg.identifier === 'src_annual' || pkg.identifier === '$rc_annual' || pkg.identifier === '$rc_yearly' || pkg.identifier === 'yearly'
        ) || null;

        if (customMonthly || customYearly || customWeekly) {
          setMonthlyPkg(customMonthly);
          setYearlyPkg(customYearly);
          setWeeklyPkg(customWeekly);

          if (customYearly) {
            setSelectedPkgId(customYearly.identifier);
          } else if (customMonthly) {
            setSelectedPkgId(customMonthly.identifier);
          } else if (customWeekly) {
            setSelectedPkgId(customWeekly.identifier);
          }
        }
      }
    } catch (error) {
      console.warn('Failed to load offerings in Paywall, keeping instant fallbacks:', error);
    } finally {
      setIsLoadingOfferings(false);
    }
  };

 useEffect(() => {
 if (visible) {
 fetchOfferings();
 analytics().logEvent('paywall_viewed', {
 use_mock: USE_MOCK_DATA
 }).catch(e => console.warn('[Analytics] Failed paywall_viewed event:', e));
 }
 }, [visible]);

 useEffect(() => {
 if (isPro && visible) {
 onClose();
 }
 }, [isPro, visible]);

 const handlePurchase = async (pkg: PurchasesPackage) => {
    setIsPurchasing(true);
    analytics().logEvent('purchase_initiated', {
      package_id: pkg.identifier,
      package_type: pkg.packageType,
      price: pkg.product.price,
      price_string: pkg.product.priceString
    }).catch(e => console.warn('[Analytics] Failed purchase_initiated event:', e));

    if (USE_MOCK_DATA) {
      setTimeout(() => {
        setIsPurchasing(false);
        useAppStore.getState().setIsPro(true);
        analytics().logEvent('purchase_success', {
          package_id: pkg.identifier,
          is_mock: true
        }).catch(e => console.warn('[Analytics] Failed purchase_success event:', e));
        const congratsTitle = t('paywall.congratsTitle');
        const congratsMsg = t('paywall.congratsMsg');
        Alert.alert(congratsTitle, congratsMsg);
        onClose();
      }, 1200);
      return;
    }

    try {
      let purchaseResult;
      const isFallbackPkg = Boolean((pkg as any).isFallback) || (!pkg.presentedOfferingContext && !pkg.product.subscriptionPeriod && !pkg.product.introPrice);
      
      if (isFallbackPkg) {
        console.log('[Paywall] Fallback package purchase, querying store product for ID:', pkg.product.identifier);
        try {
          const storeProducts = await Purchases.getProducts([pkg.product.identifier]);
          if (storeProducts && storeProducts.length > 0) {
            purchaseResult = await Purchases.purchaseStoreProduct(storeProducts[0]);
          } else {
            throw new Error(t('paywall.productUnavailable', { defaultValue: 'Store product could not be loaded. Please check your connection and try again.' }));
          }
        } catch (prodErr: any) {
          console.warn('[Paywall] Failed store product purchase:', prodErr);
          throw prodErr;
        }
      } else {
        purchaseResult = await Purchases.purchasePackage(pkg);
      }

 const { customerInfo } = purchaseResult;
 setIsPurchasing(false);
 const activePro = checkIsProStatus(customerInfo);
 useAppStore.getState().setIsPro(activePro);

 if (activePro) {
 analytics().logEvent('purchase_success', {
 package_id: pkg.identifier,
 is_mock: false
 }).catch(e => console.warn('[Analytics] Failed purchase_success event:', e));
 const congratsTitle = t('paywall.congratsTitle');
 const congratsMsg = t('paywall.congratsMsg');
 Alert.alert(congratsTitle, congratsMsg);
 onClose();
 }
 } catch (error: any) {
 setIsPurchasing(false);
 if (!error?.userCancelled) {
 console.warn('Purchase failed:', error);
 analytics().logEvent('purchase_failed', {
 package_id: pkg.identifier,
 error_message: error?.message || String(error)
 }).catch(e => console.warn('[Analytics] Failed purchase_failed event:', e));
 const errTitle = t('paywall.errTitle');
 const errMsg = error?.message || t('paywall.errMsg');
 Alert.alert(errTitle, errMsg);
 } else {
 analytics().logEvent('purchase_cancelled', {
 package_id: pkg.identifier
 }).catch(e => console.warn('[Analytics] Failed purchase_cancelled event:', e));
 }
 }
 };

 const handleRestore = async () => {
 setIsPurchasing(true);
 analytics().logEvent('purchase_restore_initiated').catch(e => console.warn('[Analytics] Failed restore_initiated event:', e));

 if (USE_MOCK_DATA) {
 setTimeout(() => {
 setIsPurchasing(false);
 useAppStore.getState().setIsPro(true);
 analytics().logEvent('purchase_restore_success', { is_pro: true, is_mock: true }).catch(e => console.warn('[Analytics] Failed restore_success event:', e));
 const successTitle = t('paywall.restoreSuccessTitle');
 const successMsg = t('paywall.restoreSuccessMsg');
 Alert.alert(successTitle, successMsg);
 onClose();
 }, 1200);
 return;
 }

 try {
 const customerInfo = await Purchases.restorePurchases();
 setIsPurchasing(false);
 const activePro = checkIsProStatus(customerInfo);
 useAppStore.getState().setIsPro(activePro);

 analytics().logEvent('purchase_restore_success', { is_pro: activePro, is_mock: false }).catch(e => console.warn('[Analytics] Failed restore_success event:', e));
 if (activePro) {
 const successTitle = t('paywall.restoreSuccessTitle');
 const successMsg = t('paywall.restoreSuccessMsg');
 Alert.alert(successTitle, successMsg);
 onClose();
 } else {
 const infoTitle = t('paywall.noPurchasesTitle');
 const infoMsg = Platform.OS === 'ios'
 ? t('paywall.noPurchasesMsg')
 : t('paywall.noPurchasesMsgAndroid');
 Alert.alert(infoTitle, infoMsg);
 }
 } catch (error: any) {
 setIsPurchasing(false);
 
 const errorStr = error?.message || String(error);
 analytics().logEvent('purchase_restore_failed', { error_message: errorStr }).catch(e => console.warn('[Analytics] Failed restore_failed event:', e));
 const isInternalError = errorStr.includes('RevenueCat') || 
 errorStr.includes('StoreKit') || 
 errorStr.includes('SSInternalErrorDomain') ||
 errorStr.includes('AppTransaction Failed');

 if (isInternalError) {
 // Silently log internal SDK/Simulator errors without exposing them to the user
 console.error('[Paywall] Silently caught StoreKit/RevenueCat internal error:', errorStr);
 // Display the standard "No Purchases Found" UI to maintain Apple UX guidelines
 const infoTitle = t('paywall.noPurchasesTitle');
 const infoMsg = Platform.OS === 'ios'
 ? t('paywall.noPurchasesMsg')
 : t('paywall.noPurchasesMsgAndroid');
 Alert.alert(infoTitle, infoMsg);
 } else if (!error?.userCancelled) {
 console.warn('Restore failed:', error);
 const errTitle = t('paywall.restoreErrorTitle');
 const errMsg = error?.message ? `An error occurred during restore: ${error.message}` : t('paywall.restoreErrorMsg');
 Alert.alert(errTitle, errMsg);
 }
 }
 };

 const handleSubscribeSelected = () => {
 const allResolved = [weeklyPkg, monthlyPkg, yearlyPkg].filter(Boolean) as PurchasesPackage[];
 const selectedPkg = allResolved.find((pkg) => pkg.identifier === selectedPkgId);
 if (selectedPkg) {
 handlePurchase(selectedPkg);
 } else {
 const selectTitle = t('paywall.noPkgTitle');
 const selectMsg = t('paywall.noPkgMsg');
 Alert.alert(selectTitle, selectMsg);
 }
 };

 const getPackageDisplayName = (pkg: PurchasesPackage, type: 'weekly' | 'monthly' | 'yearly') => {
 if (type === 'weekly') return t('paywall.weekly');
 if (type === 'monthly') return t('paywall.monthly');
 return t('paywall.yearly');
 };

 // Dynamic Styles (Memoized to prevent rendering lag during live data activity)
 const sDyn = React.useMemo(() => {
 const modalWidth = isTablet ? (isLargeTablet ? 650 : 520) : '100%';
 const modalHeight = isTablet ? '90%' : undefined;

 return {
 overlay: {
 ...StyleSheet.absoluteFillObject,
 justifyContent: isTablet ? 'center' : 'flex-end',
 alignItems: isTablet ? 'center' : 'stretch',
 },
 modalContainer: {
 width: modalWidth,
 height: modalHeight,
 flex: isTablet ? undefined : 1,
 maxHeight: isTablet ? scaleHeight(920) : undefined,
 overflow: 'hidden' as const,
 borderRadius: isTablet ? scaleMod(20) : 0,
 borderWidth: isTablet ? 1.5 : 0,
 paddingBottom: bottomInset,
 },
 header: {
 paddingHorizontal: scaleWidth(20),
 alignItems: 'center' as const,
 borderBottomWidth: 1,
 paddingTop: scaleHeight(20), 
 paddingBottom: scaleHeight(14),
 },
 closeBtn: {
 position: 'absolute' as const,
 alignItems: 'center' as const,
 justifyContent: 'center' as const,
 zIndex: 10,
 top: scaleHeight(12),
 right: scaleWidth(16),
 paddingHorizontal: scaleWidth(12),
 paddingVertical: scaleHeight(6),
 minWidth: scaleMod(44),
 height: scaleMod(30),
 borderRadius: scaleMod(15),
 },
 closeBtnText: {
 fontWeight: 'bold' as const,
 fontSize: scaleFont(10),
 },
 crownBadge: {
 borderWidth: 1.5,
 paddingHorizontal: scaleWidth(12),
 paddingVertical: scaleHeight(6),
 borderRadius: scaleMod(20),
 marginBottom: scaleHeight(8),
 },
 crownText: {
 fontWeight: '900' as const,
 fontFamily: MONO,
 letterSpacing: 1.2,
 fontSize: scaleFont(11.5),
 },
 subtitle: {
 textAlign: 'center' as const,
 fontFamily: MONO,
 fontSize: scaleFont(12.5),
 paddingHorizontal: scaleWidth(8),
 },
 scrollContainer: {
 flex: 1,
 },
 scrollContent: {
 flexGrow: 1,
 justifyContent: 'space-evenly' as const,
 paddingHorizontal: scaleWidth(16),
 paddingVertical: scaleHeight(12),
 },
 featuresRow: {
 flexDirection: 'row' as const,
 justifyContent: 'space-between' as const,
 gap: scaleMod(6),
 marginVertical: scaleHeight(4),
 width: '100%',
 },
 featureCard: {
 flex: 1,
 alignItems: 'center' as const,
 justifyContent: 'flex-start' as const,
 borderRadius: scaleMod(14),
 borderWidth: 1.2,
 paddingVertical: scaleHeight(10),
 paddingHorizontal: scaleWidth(6),
 },
 iconCircle: {
 width: scaleMod(30),
 height: scaleMod(30),
 borderRadius: scaleMod(15),
 alignItems: 'center' as const,
 justifyContent: 'center' as const,
 marginBottom: scaleHeight(6),
 },
 featureTitle: {
 fontWeight: '900' as const,
 textAlign: 'center' as const,
 marginBottom: scaleHeight(2),
 fontFamily: MONO,
 fontSize: scaleFont(10),
 },
 featureDesc: {
 textAlign: 'center' as const,
 lineHeight: scaleFont(10),
 fontFamily: MONO,
 fontSize: scaleFont(8),
 },
 divider: {
 height: 1.2,
 width: '80%',
 alignSelf: 'center' as const,
 marginVertical: scaleHeight(4),
 opacity: 0.3,
 },
 plansHeaderContainer: {
 alignItems: 'center' as const,
 marginVertical: scaleHeight(2),
 },
 sectionLabel: {
 fontWeight: '900' as const,
 letterSpacing: 2,
 fontFamily: MONO,
 fontSize: scaleFont(11),
 },
 packagesList: {
 gap: scaleMod(10),
 marginVertical: scaleHeight(4),
 },
 packageCard: {
 flexDirection: 'row' as const,
 borderRadius: scaleMod(14),
 alignItems: 'center' as const,
 justifyContent: 'space-between' as const,
 paddingVertical: scaleHeight(12),
 paddingHorizontal: scaleWidth(14),
 },
 packageLeft: {
 flexDirection: 'row' as const,
 alignItems: 'center' as const,
 flex: 1,
 },
 radioOuter: {
 width: scaleMod(20),
 height: scaleMod(20),
 borderRadius: scaleMod(10),
 borderWidth: 2,
 alignItems: 'center' as const,
 justifyContent: 'center' as const,
 marginRight: scaleWidth(10),
 },
 radioInner: {
 width: scaleMod(10),
 height: scaleMod(10),
 borderRadius: scaleMod(5),
 },
 packageInfo: {
 flex: 1,
 },
 packageTitleRow: {
 flexDirection: 'row' as const,
 alignItems: 'center' as const,
 gap: scaleMod(6),
 flexWrap: 'wrap' as const,
 },
 packageTitle: {
 fontWeight: '900' as const,
 fontFamily: MONO,
 fontSize: scaleFont(14.5),
 },
 packageDesc: {
 fontWeight: '800' as const,
 fontFamily: MONO,
 marginTop: scaleHeight(2),
 fontSize: scaleFont(10.5),
 },
 priceColumn: {
 alignItems: 'center' as const,
 marginLeft: scaleWidth(6),
 },
 priceBadge: {
 borderRadius: scaleMod(10),
 paddingVertical: scaleHeight(6),
 paddingHorizontal: scaleWidth(10),
 },
 priceText: {
 fontWeight: '900' as const,
 fontFamily: MONO,
 fontSize: scaleFont(14),
 },
 tierBadge: {
 paddingHorizontal: scaleWidth(5),
 paddingVertical: scaleHeight(2),
 borderRadius: scaleMod(4),
 },
 tierBadgeText: {
 color: '#FFF',
 fontSize: scaleFont(7.5),
 fontWeight: '900' as const,
 fontFamily: MONO,
 letterSpacing: 0.5,
 },
 footer: {
 borderTopWidth: 1,
 paddingHorizontal: scaleWidth(16),
 paddingTop: scaleHeight(12),
 paddingBottom: isTablet ? scaleHeight(32) : scaleHeight(14),
 },
 ctaButton: {
 borderRadius: scaleMod(14),
 alignItems: 'center' as const,
 justifyContent: 'center' as const,
 paddingVertical: scaleHeight(14),
 marginTop: scaleHeight(8),
 },
 ctaButtonText: {
 color: '#FFF',
 fontWeight: '900' as const,
 fontFamily: MONO,
 letterSpacing: 2,
 fontSize: scaleFont(14),
 },
 footerLegalNotice: {
 fontFamily: MONO,
 textAlign: 'center' as const,
 lineHeight: scaleFont(12),
 opacity: 0.85,
 fontSize: scaleFont(9.5),
 },
 restoreBtn: {
 alignItems: 'center' as const,
 borderRadius: scaleMod(10),
 paddingVertical: scaleHeight(10),
 marginTop: scaleHeight(8),
 },
 restoreBtnText: {
 fontWeight: '900' as const,
 fontFamily: MONO,
 letterSpacing: 1,
 fontSize: scaleFont(11.5),
 },
 legalSection: {
 alignItems: 'center' as const,
 marginTop: scaleHeight(8),
 },
 legalLinks: {
 flexDirection: 'row' as const,
 alignItems: 'center' as const,
 gap: scaleMod(6),
 },
 legalLink: {
 fontWeight: '700' as const,
 fontFamily: MONO,
 textDecorationLine: 'underline' as const,
 fontSize: scaleFont(10.5),
 },
 legalSep: {
 opacity: 0.5,
 fontSize: scaleFont(10.5),
 },
 loadingContainer: {
 paddingVertical: scaleHeight(20),
 alignItems: 'center' as const,
 justifyContent: 'center' as const,
 gap: scaleMod(6),
 },
 loadingSubText: {
 fontSize: scaleFont(10),
 fontFamily: MONO,
 },
 errorContainer: {
 borderWidth: 1,
 borderRadius: scaleMod(12),
 padding: scaleMod(12),
 alignItems: 'center' as const,
 justifyContent: 'center' as const,
 gap: scaleMod(6),
 marginTop: scaleHeight(6),
 },
 errorTitle: {
 fontSize: scaleFont(12),
 fontWeight: '800' as const,
 fontFamily: MONO,
 },
 errorDesc: {
 fontSize: scaleFont(9.5),
 textAlign: 'center' as const,
 lineHeight: scaleFont(13),
 fontFamily: MONO,
 },
 retryButton: {
 borderRadius: scaleMod(6),
 paddingHorizontal: scaleWidth(12),
 paddingVertical: scaleHeight(6),
 marginTop: scaleHeight(6),
 },
 retryButtonText: {
 color: '#FFF',
 fontWeight: '900' as const,
 fontSize: scaleFont(9.5),
 fontFamily: MONO,
 },
 loadingOverlay: {
 ...StyleSheet.absoluteFillObject,
 alignItems: 'center' as const,
 justifyContent: 'center' as const,
 zIndex: 100,
 },
 loadingText: {
 fontSize: scaleFont(11.5),
 fontWeight: '800' as const,
 marginTop: scaleHeight(12),
 fontFamily: MONO,
 },
 };
 }, [scaleWidth, scaleHeight, scaleMod, scaleFont, isTablet, isLargeTablet, bottomInset]) as any;

 const renderPackageCard = (pkg: PurchasesPackage, type: 'weekly' | 'monthly' | 'yearly') => {
    const isSelected = selectedPkgId === pkg.identifier;
    
    let badgeLabel = '';
    let badgeColor = colors.purple;
    let savingsText = '';
    let planDescText = '';
    
    if (type === 'yearly') {
      badgeLabel = t('paywall.bestValue');
      badgeColor = colors.green;
      const currencySymbol = pkg.product.priceString ? pkg.product.priceString.replace(/[0-9.,\s]/g, '') : '$';
      const monthlyPrice = (pkg.product.price / 12).toFixed(2);
      const perMonthText = t('paywall.perMonth');
      const monthlyBase = monthlyPkg?.product?.price || 19.99;
      const yearlyBase = pkg.product.price || 129.99;
      const calculatedPct = Math.max(1, Math.round(((monthlyBase * 12 - yearlyBase) / (monthlyBase * 12)) * 100));
      const saveText = t('paywall.saveDiscount', { pct: calculatedPct, defaultValue: `%${calculatedPct} Tasarruf` });
      savingsText = `~${currencySymbol}${monthlyPrice}${perMonthText} • ${saveText}`;
      planDescText = t('paywall.yearlyDesc');
    } else if (type === 'monthly') {
      badgeLabel = t('paywall.popular');
      badgeColor = colors.purple;
      planDescText = t('paywall.monthlyDesc');
    } else {
      planDescText = t('paywall.weeklyDesc');
    }

    return (
      <TouchableOpacity
        key={pkg.identifier}
        style={[
          sDyn.packageCard,
          {
            backgroundColor: isSelected ? `${colors.purple}14` : `${colors.purple}04`,
            borderColor: isSelected ? colors.purple : colors.cardBorder,
            borderWidth: isSelected ? 2.5 : 1.2,
          },
        ]}
        onPress={() => setSelectedPkgId(pkg.identifier)}
        disabled={isPurchasing}
        activeOpacity={0.85}
      >
        <View style={sDyn.packageLeft}>
          <View style={[sDyn.radioOuter, { borderColor: isSelected ? colors.purple : colors.textTertiary }]}>
            {isSelected && <View style={[sDyn.radioInner, { backgroundColor: colors.purple }]} />}
          </View>
          <View style={sDyn.packageInfo}>
            <View style={sDyn.packageTitleRow}>
              <Text style={[sDyn.packageTitle, { color: colors.textPri }]}>
                {getPackageDisplayName(pkg, type)}
              </Text>
              {badgeLabel ? (
                <View style={[sDyn.tierBadge, { backgroundColor: badgeColor }]}>
                  <Text style={sDyn.tierBadgeText}>{badgeLabel.toUpperCase()}</Text>
                </View>
              ) : null}
            </View>
            {savingsText ? (
              <Text style={{ fontSize: scaleFont(9.5), color: colors.green, fontWeight: '800', marginTop: scaleHeight(2), fontFamily: MONO }}>
                {savingsText}
              </Text>
            ) : planDescText ? (
              <Text style={{ fontSize: scaleFont(9), color: colors.textSec, fontWeight: '600', marginTop: scaleHeight(2), fontFamily: MONO }}>
                {planDescText}
              </Text>
            ) : null}
          </View>
        </View>
        <View style={sDyn.priceColumn}>
          <View style={[sDyn.priceBadge, { backgroundColor: isSelected ? colors.purple : `${colors.purple}40` }]}>
            <Text style={[sDyn.priceText, { color: '#FFF' }]}>
              {pkg.product.priceString}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

 const hasLoadedPackages = weeklyPkg !== null || monthlyPkg !== null || yearlyPkg !== null;

 const features = [
 {
 icon: '',
 title: t('paywall.feat1Title'),
 desc: t('paywall.feat1Desc'),
 },
 {
 icon: '',
 title: t('paywall.feat2Title'),
 desc: t('paywall.feat2Desc'),
 },
 {
 icon: '',
 title: t('paywall.feat3Title'),
 desc: t('paywall.feat3Desc'),
 },
 ];

 return (
 <Modal
 visible={visible}
 animationType="slide"
 transparent={true}
 onRequestClose={onClose}
 >
 <View style={[sDyn.overlay, { backgroundColor: colors.overlayHeavy }]}>
 <View style={[
 sDyn.modalContainer, 
 { 
 backgroundColor: colors.card, 
 borderColor: `${colors.purple}40`,
 marginTop: !isTablet ? topInset : 0,
 borderTopLeftRadius: Platform.OS === 'ios' || isTablet ? scaleMod(24) : 0,
 borderTopRightRadius: Platform.OS === 'ios' || isTablet ? scaleMod(24) : 0,
 borderBottomLeftRadius: isTablet ? scaleMod(20) : 0,
 borderBottomRightRadius: isTablet ? scaleMod(20) : 0,
 }
 ]}>
 {/* Header Section */}
 <View style={[sDyn.header, { borderBottomColor: colors.cardBorder }]}>
 <TouchableOpacity 
 onPress={onClose} 
 style={[sDyn.closeBtn, { backgroundColor: `${colors.textPri}14` }]}
 hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
 >
 <Text 
 numberOfLines={1}
 adjustsFontSizeToFit={true}
 style={[sDyn.closeBtnText, { color: colors.textPri, fontSize: scaleFont(10), fontWeight: '800' }]}
 >
 {t('common.close').toUpperCase()}
 </Text>
 </TouchableOpacity>
 
 <View style={[sDyn.crownBadge, { backgroundColor: `${colors.purple}26`, borderColor: colors.purple }]}>
 <Text style={[sDyn.crownText, { color: colors.textPri, fontWeight: '900' }]}>MOTO CORTEX PRO</Text>
 </View>
 <Text style={[sDyn.subtitle, { color: colors.textSec }]}>
 {t('paywall.subtitle')}
 </Text>
 </View>

 {/* Scrollable Core Content */}
 <ScrollView 
 style={sDyn.scrollContainer} 
 contentContainerStyle={sDyn.scrollContent}
 showsVerticalScrollIndicator={false}
 bounces={true}
 >
 {/* 3 Feature Cards Design restored and fully localized */}
 <View style={sDyn.featuresRow}>
 {features.map((feat, i) => (
 <View key={i} style={[sDyn.featureCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
 <Text numberOfLines={2} ellipsizeMode="tail" style={[sDyn.featureTitle, { color: colors.textPri, fontWeight: '900' }]}>
 {feat.title}
 </Text>
 <Text numberOfLines={3} ellipsizeMode="tail" style={[sDyn.featureDesc, { color: colors.textSec, fontWeight: '600' }]}>
 {feat.desc}
 </Text>
 </View>
 ))}
 </View>

          {/* Trust & Transparency Guarantee Badges */}
          <View style={{
            flexDirection: 'row',
            justifyContent: 'center',
            alignItems: 'center',
            backgroundColor: `${colors.purple}0A`,
            borderColor: `${colors.purple}20`,
            borderWidth: 1,
            borderRadius: scaleMod(10),
            paddingVertical: scaleHeight(6),
            paddingHorizontal: scaleWidth(10),
            marginVertical: scaleHeight(4),
            flexWrap: 'wrap',
            gap: scaleMod(8),
          }}>
            <Text style={{ fontSize: scaleFont(8.5), color: colors.textPri, fontWeight: '800', fontFamily: MONO }}>
              {t('paywall.trustNoAds')}
            </Text>
            <Text style={{ fontSize: scaleFont(8.5), color: colors.textTertiary }}>•</Text>
            <Text style={{ fontSize: scaleFont(8.5), color: colors.textPri, fontWeight: '800', fontFamily: MONO }}>
              {t('paywall.trustNoTokens')}
            </Text>
            <Text style={{ fontSize: scaleFont(8.5), color: colors.textTertiary }}>•</Text>
            <Text style={{ fontSize: scaleFont(8.5), color: colors.textPri, fontWeight: '800', fontFamily: MONO }}>
              {t('paywall.trustUniversal')}
            </Text>
          </View>

 {/* Separator Line */}
 <View style={[sDyn.divider, { backgroundColor: colors.cardBorder }]} />

 <View style={sDyn.plansHeaderContainer}>
 <Text style={[sDyn.sectionLabel, { color: colors.textSec }]}>
 {t('paywall.selectPlan').toUpperCase()}
 </Text>
 </View>

 {/* Render Packages list */}
 {isLoadingOfferings ? (
 <View style={sDyn.loadingContainer}>
 <ActivityIndicator size="small" color={colors.purple} />
 <Text style={[sDyn.loadingSubText, { color: colors.textSec }]}>{t('paywall.loadingPrices')}</Text>
 </View>
 ) : hasLoadedPackages ? (
 <View style={sDyn.packagesList}>
 {/* 1. Weekly Custom Subscription rendered at the TOP */}
 {weeklyPkg && renderPackageCard(weeklyPkg, 'weekly')}
 
 {/* 2. Monthly Standard Subscription */}
 {monthlyPkg && renderPackageCard(monthlyPkg, 'monthly')}
 
 {/* 3. Yearly Standard Subscription */}
 {yearlyPkg && renderPackageCard(yearlyPkg, 'yearly')}
 </View>
 ) : (
 <View style={[sDyn.errorContainer, { borderColor: colors.cardBorder }]}>
 <Text style={[sDyn.errorTitle, { color: colors.textPri }]}>{t('paywall.errorTitle')}</Text>
 <Text style={[sDyn.errorDesc, { color: colors.textSec }]}>
 {t('paywall.errorDesc')}
 </Text>
 <TouchableOpacity
 style={[sDyn.retryButton, { backgroundColor: colors.purple }]}
 onPress={fetchOfferings}
 >
 <Text style={sDyn.retryButtonText}>{t('paywall.retryBtn')}</Text>
 </TouchableOpacity>
 </View>
 )}

 {/* Hardware Warning Barrier */}
 <View style={{
 backgroundColor: `${colors.amber}0D`,
 borderColor: `${colors.amber}40`,
 borderWidth: 1.2,
 borderRadius: scaleMod(12),
 padding: scaleMod(12),
 marginTop: scaleHeight(12),
 marginBottom: scaleHeight(6),
 flexDirection: 'row',
 gap: scaleWidth(8),
 alignItems: 'flex-start',
 }}>
 <Text style={{ fontSize: scaleFont(12.5), marginTop: Platform.OS === 'ios' ? 1 : 0 }}></Text>
 <Text style={{
 flex: 1,
 color: colors.textSec,
 fontFamily: MONO,
 fontSize: scaleFont(9.5),
 lineHeight: scaleFont(14.5),
 }}>
 {Platform.OS === 'ios'
 ? t('paywall.hardwareWarning')
 : t('paywall.hardwareWarningAndroid')
 }
 </Text>
 </View>
 </ScrollView>

 {/* Sticky Pinned Footer with Action Trigger & Legal */}
 <View style={[sDyn.footer, { backgroundColor: colors.card, borderTopColor: colors.cardBorder }]}>
 <Text style={[sDyn.footerLegalNotice, { color: colors.textSec }]}>
 {Platform.OS === 'ios'
 ? t('paywall.legalNotice')
 : t('paywall.legalNoticeAndroid')
 }
 </Text>

 <TouchableOpacity
 style={[sDyn.ctaButton, { backgroundColor: colors.purple }]}
 onPress={handleSubscribeSelected}
 disabled={isPurchasing || !hasLoadedPackages}
 activeOpacity={0.85}
 >
 <Text style={sDyn.ctaButtonText}>
 {t('paywall.subscribe')}
 </Text>
 </TouchableOpacity>

 <TouchableOpacity
 onPress={handleRestore}
 style={[sDyn.restoreBtn, { backgroundColor: `${colors.textPri}08` }]}
 disabled={isPurchasing}
 >
 <Text style={[sDyn.restoreBtnText, { color: colors.textPri }]}>
 {t('paywall.restore').toUpperCase()}
 </Text>
 </TouchableOpacity>

 <View style={sDyn.legalSection}>
 <View style={sDyn.legalLinks}>
 <TouchableOpacity onPress={() => Linking.openURL(`https://motocortex-telemetry.vercel.app/?userId=${appUserId || ''}&lang=${language}#terms`)}>
 <Text style={[sDyn.legalLink, { color: colors.purple }]}>
 {t('paywall.terms')}
 </Text>
 </TouchableOpacity>
 <Text style={[sDyn.legalSep, { color: colors.textTertiary }]}>•</Text>
 <TouchableOpacity onPress={() => Linking.openURL(`https://motocortex-telemetry.vercel.app/?userId=${appUserId || ''}&lang=${language}#privacy`)}>
 <Text style={[sDyn.legalLink, { color: colors.purple }]}>
 {t('paywall.privacy')}
 </Text>
 </TouchableOpacity>
 </View>
 </View>
 </View>

 {/* Secure Purchase Loading Overlay */}
 {isPurchasing && (
 <View style={[sDyn.loadingOverlay, { backgroundColor: `${colors.bg}E6` }]}>
 <ActivityIndicator size="large" color={colors.green} />
 <Text style={[sDyn.loadingText, { color: colors.green }]}>
 {t('paywall.purchasingText')}
 </Text>
 </View>
 )}
 </View>
 </View>
 </Modal>
 );
}

const MONO = Platform.OS === 'ios' ? 'System' : 'sans-serif';
