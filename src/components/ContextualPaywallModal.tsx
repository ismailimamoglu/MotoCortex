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
    ViewStyle,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import Purchases from 'react-native-purchases';
import { useAppStore, checkIsProStatus } from '../store/useAppStore';
import { useBluetoothStore } from '../store/useBluetoothStore';
import { useThemeColors } from '../theme';
import { useResponsive } from '../hooks/useResponsive';

const REVENUECAT_OFFLINE_DEFAULTS = {
    weekly: { id: 'motocortex_pro_weekly_nonrenew', price: '₺164,99' },
    monthly: { id: 'motocortex_pro_monthly', price: '₺329,99' },
    yearly: { id: 'motocortex_pro_yearly', price: '₺1.099,99' },
};

export default function ContextualPaywallModal() {
    const { t } = useTranslation();
    const colors = useThemeColors();
    const { s: scaleWidth, vs: scaleHeight, ms: scaleMod, fs: scaleFont, isTablet } = useResponsive();
    
    const paywallContext = useBluetoothStore(state => state.paywallContext);
    const clearPaywallContext = useBluetoothStore(state => state.clearPaywallContext);
    const isPro = useAppStore(state => state.isPro);
    const setIsPro = useAppStore(state => state.setIsPro);

    const [isLoading, setIsLoading] = useState(false);
    const [prices, setPrices] = useState({
        weekly: REVENUECAT_OFFLINE_DEFAULTS.weekly.price,
        monthly: REVENUECAT_OFFLINE_DEFAULTS.monthly.price,
        yearly: REVENUECAT_OFFLINE_DEFAULTS.yearly.price,
    });
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
                    const customWeekly = currentOffering.availablePackages.find(p => p.identifier === 'weekly_single') || null;
                    const customMonthly = currentOffering.availablePackages.find(p => p.identifier === '$rc_monthly' || p.identifier === 'monthly') || null;
                    const customYearly = currentOffering.availablePackages.find(p => p.identifier === '$rc_yearly' || p.identifier === 'yearly') || null;

                    setPrices({
                        weekly: customWeekly?.product.priceString || REVENUECAT_OFFLINE_DEFAULTS.weekly.price,
                        monthly: customMonthly?.product.priceString || REVENUECAT_OFFLINE_DEFAULTS.monthly.price,
                        yearly: customYearly?.product.priceString || REVENUECAT_OFFLINE_DEFAULTS.yearly.price,
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
    }, [paywallContext]);

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
                Alert.alert(t('paywall.congratsTitle', '🎉 Congratulations!'), t('paywall.congratsMsg', 'Your Cortex OBD2 PRO membership has been successfully activated. Enjoy all professional features!'));
                clearPaywallContext();
            }
        } catch (error: any) {
            if (!error?.userCancelled) {
                Alert.alert(t('paywall.errTitle', '❌ Purchase Failed'), error?.message || t('paywall.errMsg'));
            }
        } finally {
            setIsLoading(false);
        }
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
            fontSize: scaleFont(16),
            fontWeight: '900',
            fontFamily: MONO,
            color: colors.textPri,
            marginBottom: scaleHeight(10),
            textAlign: 'center',
        },
        desc: {
            fontSize: scaleFont(11),
            fontFamily: MONO,
            color: colors.textSec,
            textAlign: 'center',
            marginBottom: scaleHeight(20),
            lineHeight: scaleFont(16),
        },
        codeBox: {
            backgroundColor: `${colors.purple}15`,
            borderWidth: 1,
            borderColor: colors.purple,
            borderRadius: scaleMod(8),
            paddingVertical: scaleHeight(6),
            paddingHorizontal: scaleWidth(12),
            marginBottom: scaleHeight(20),
        },
        codeText: {
            fontSize: scaleFont(12),
            fontWeight: '900',
            fontFamily: MONO,
            color: colors.purple,
        },
        option: {
            width: '100%',
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            backgroundColor: `${colors.purple}05`,
            borderWidth: 1.2,
            borderColor: colors.cardBorder,
            borderRadius: scaleMod(12),
            paddingVertical: scaleHeight(14),
            paddingHorizontal: scaleWidth(16),
            marginBottom: scaleHeight(10),
        },
        optionTitle: {
            fontSize: scaleFont(13),
            fontWeight: '800',
            fontFamily: MONO,
            color: colors.textPri,
        },
        optionPrice: {
            fontSize: scaleFont(13),
            fontWeight: '900',
            fontFamily: MONO,
            color: colors.purple,
        },
        closeBtn: {
            marginTop: scaleHeight(10),
            paddingVertical: scaleHeight(10),
            width: '100%',
            alignItems: 'center',
        },
        closeBtnText: {
            fontSize: scaleFont(12),
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
                    <Text style={sDyn.title}>👑 {t('paywall.crownBadge', 'MOTO CORTEX PRO')}</Text>
                    <Text style={sDyn.desc}>
                        {t('paywall.contextualDesc', 'Upgrade to PRO to see critical risks of this trouble code on the engine, potential repair costs, and detailed solution guidelines.')}
                    </Text>
                    
                    <View style={sDyn.codeBox}>
                        <Text style={sDyn.codeText}>
                            {paywallContext === 'ACTION_LOCKED' 
                                ? '🔒 ' + t('paywall.actionLocked', 'PRO KİLİTLİ ÖZELLİK')
                                : paywallContext}
                        </Text>
                    </View>

                    <TouchableOpacity style={sDyn.option} onPress={() => handlePurchase('weekly')} disabled={isLoading}>
                        <Text style={sDyn.optionTitle}>{t('paywall.weekly', 'Weekly Subscription')}</Text>
                        <Text style={sDyn.optionPrice}>{prices.weekly}</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={sDyn.option} onPress={() => handlePurchase('monthly')} disabled={isLoading}>
                        <Text style={sDyn.optionTitle}>{t('paywall.monthly', 'Monthly Subscription')}</Text>
                        <Text style={sDyn.optionPrice}>{prices.monthly}</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={sDyn.option} onPress={() => handlePurchase('yearly')} disabled={isLoading}>
                        <Text style={sDyn.optionTitle}>{t('paywall.yearly', 'Yearly Subscription')}</Text>
                        <Text style={sDyn.optionPrice}>{prices.yearly}</Text>
                    </TouchableOpacity>

                    {isLoading && <ActivityIndicator color={colors.purple} style={{ marginTop: 10 }} />}

                    <TouchableOpacity style={sDyn.closeBtn} onPress={clearPaywallContext}>
                        <Text style={sDyn.closeBtnText}>{t('common.cancel', 'Cancel')}</Text>
                    </TouchableOpacity>
                </TouchableOpacity>
            </TouchableOpacity>
        </Modal>
    );
}
