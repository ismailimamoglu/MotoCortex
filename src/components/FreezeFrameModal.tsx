import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet, Platform, ActivityIndicator, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useThemeColors } from '../theme';
import { useResponsive } from '../hooks/useResponsive';

interface FreezeData {
    dtcCode: string | null;
    rpm: number | null;
    speed: number | null;
    coolant: number | null;
    throttle: number | null;
    map: number | null;
    stft: number | null;
}

interface Props {
    visible: boolean;
    onClose: () => void;
    sendCommand: (cmd: string) => Promise<string | undefined>;
    hasDtcs: boolean;
}

export default function FreezeFrameModal({ visible, onClose, sendCommand, hasDtcs }: Props) {
    const { t } = useTranslation();
    const colors = useThemeColors();
    const { s: scaleWidth, vs: scaleHeight, ms: scaleMod, fs: scaleFont, isTablet, isLargeTablet } = useResponsive();
    const insets = useSafeAreaInsets();

    const [isLoading, setIsLoading] = useState(false);
    const [data, setData] = useState<FreezeData | null>(null);
    const [error, setError] = useState<string | null>(null);

    const MONO = Platform.OS === 'ios' ? 'System' : 'sans-serif';

    const decodeDtcFromHex = (hex: string): string | null => {
        if (!hex || hex.length < 4) return null;
        const a = parseInt(hex.substring(0, 2), 16);
        const b = parseInt(hex.substring(2, 4), 16);
        if (isNaN(a) || isNaN(b) || (a === 0 && b === 0)) return null;

        const typeNum = (a & 0xC0) >> 6;
        const prefixes = ['P', 'C', 'B', 'U'];
        const prefix = prefixes[typeNum] || 'P';
        const d1 = (a & 0x30) >> 4;
        const d2 = (a & 0x0F).toString(16).toUpperCase();
        const d3d4 = b.toString(16).padStart(2, '0').toUpperCase();
        return `${prefix}${d1}${d2}${d3d4}`;
    };

    const parseHex = (response: string, echo: string, bytes: number): number | null => {
        const clean = response.replace(/\s+/g, '').replace('SEARCHING...', '');
        if (clean.includes('NODATA') || clean.includes('ERROR')) return null;
        if (!clean.includes(echo)) return null;
        const parts = clean.split(echo);
        if (parts.length < 2) return null;
        const hex = parts[1].substring(0, bytes * 2);
        if (hex.length < bytes * 2) return null;
        if (bytes === 2) {
            const a = parseInt(hex.substring(0, 2), 16);
            const b = parseInt(hex.substring(2, 4), 16);
            if (isNaN(a) || isNaN(b)) return null;
            return Math.round(((a * 256) + b) / 4); // RPM formula
        }
        const a = parseInt(hex.substring(0, 2), 16);
        if (isNaN(a)) return null;
        return a;
    };

    const fetchFreezeFrame = async () => {
        setIsLoading(true);
        setError(null);
        setData(null);

        try {
            // Mode 02 PID 020200: Freeze Frame DTC verification
            const dtcRes = await sendCommand('020200');
            const rpmRes = await sendCommand('020C00');
            const speedRes = await sendCommand('020D00');
            const coolRes = await sendCommand('020500');
            const throttleRes = await sendCommand('021100');
            const mapRes = await sendCommand('020B00');
            const stftRes = await sendCommand('020600');

            let dtcCode: string | null = null;
            if (dtcRes) {
                const clean = dtcRes.replace(/\s+/g, '');
                if (clean.includes('4202')) {
                    const parts = clean.split('4202');
                    if (parts[1] && parts[1].length >= 4) {
                        dtcCode = decodeDtcFromHex(parts[1].substring(0, 4));
                    }
                }
            }

            const rpmVal = rpmRes ? parseHex(rpmRes, '420C', 2) : null;
            const speedVal = speedRes ? parseHex(speedRes, '420D', 1) : null;
            const coolRaw = coolRes ? parseHex(coolRes, '4205', 1) : null;
            const coolVal = coolRaw !== null ? coolRaw - 40 : null;

            const throttleRaw = throttleRes ? parseHex(throttleRes, '4211', 1) : null;
            const throttleVal = throttleRaw !== null ? Math.round((throttleRaw * 100) / 255) : null;

            const mapVal = mapRes ? parseHex(mapRes, '420B', 1) : null;
            const stftRaw = stftRes ? parseHex(stftRes, '4206', 1) : null;
            const stftVal = stftRaw !== null ? Number((((stftRaw - 128) * 100) / 128).toFixed(1)) : null;

            if (rpmVal === null && speedVal === null && coolVal === null && dtcCode === null) {
                setError(t('freeze.noData'));
            } else {
                setData({
                    dtcCode,
                    rpm: rpmVal,
                    speed: speedVal,
                    coolant: coolVal,
                    throttle: throttleVal,
                    map: mapVal,
                    stft: stftVal
                });
            }
        } catch (e) {
            setError(t('freeze.error') + ': ' + (e instanceof Error ? e.message : String(e)));
        } finally {
            setIsLoading(false);
        }
    };

    const resetState = () => {
        setData(null);
        setError(null);
        setIsLoading(false);
    };

    const sDyn = React.useMemo(() => {
        const modalWidth = isTablet ? (isLargeTablet ? 650 : 520) : '100%';
        const modalHeight = isTablet ? '85%' : '100%';

        return {
            modalOverlay: {
                ...StyleSheet.absoluteFillObject,
                justifyContent: isTablet ? 'center' : 'flex-end',
                alignItems: isTablet ? 'center' : 'stretch',
                backgroundColor: colors.overlayHeavy,
            },
            modalContainer: {
                width: modalWidth,
                height: modalHeight,
                maxHeight: isTablet ? scaleHeight(700) : undefined,
                alignSelf: 'center' as const,
                borderRadius: isTablet ? scaleMod(16) : 0,
                borderWidth: isTablet ? 1.5 : 0,
                borderColor: colors.border,
                overflow: 'hidden' as const,
                paddingTop: isTablet ? 0 : insets.top,
            },
            header: {
                paddingHorizontal: scaleWidth(16),
                flexDirection: 'row' as const,
                justifyContent: 'space-between' as const,
                alignItems: 'center' as const,
                height: scaleHeight(54),
                borderBottomWidth: 1,
            },
            headerTitle: {
                fontSize: scaleFont(14),
                fontWeight: '800' as const,
                fontFamily: MONO,
            },
            cancelBtn: {
                padding: scaleMod(8),
            },
            cancelText: {
                fontSize: scaleFont(12),
                fontWeight: 'bold' as const,
                fontFamily: MONO,
            },
            content: {
                flex: 1,
                padding: scaleMod(14),
                paddingBottom: Platform.OS === 'ios' ? insets.bottom + scaleMod(14) : scaleMod(14),
            },
            infoPanel: {
                borderRadius: scaleMod(8),
                padding: scaleMod(12),
                borderWidth: 1,
                marginBottom: scaleHeight(10),
            },
            infoTitle: {
                fontSize: scaleFont(12),
                fontWeight: '800' as const,
                marginBottom: scaleHeight(4),
            },
            infoDesc: {
                fontSize: scaleFont(10),
                lineHeight: scaleFont(15),
                marginBottom: scaleHeight(12),
            },
            actionBtn: {
                borderRadius: scaleMod(8),
                paddingVertical: scaleHeight(12),
                alignItems: 'center' as const,
                marginBottom: scaleHeight(8),
            },
            actionBtnText: {
                fontSize: scaleFont(13),
                fontWeight: '900' as const,
            },
            resultCard: {
                flex: 1,
                borderRadius: scaleMod(8),
                padding: scaleMod(12),
                alignItems: 'center' as const,
                borderWidth: 1,
            },
            resultLabel: {
                fontSize: scaleFont(9),
                fontWeight: '800' as const,
                marginBottom: scaleHeight(4),
            },
            resultValue: {
                fontSize: scaleFont(20),
                fontWeight: '900' as const,
            },
            resultUnit: {
                fontSize: scaleFont(9),
                marginTop: scaleHeight(4),
            },
        };
    }, [scaleWidth, scaleHeight, scaleMod, scaleFont, isTablet, isLargeTablet, colors, insets.top, insets.bottom]) as any;

    return (
        <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={onClose}>
            <View style={sDyn.modalOverlay}>
                <View style={[sDyn.modalContainer, { backgroundColor: colors.bg }]}>
                    {/* Header */}
                    <View style={[sDyn.header, { borderBottomColor: colors.border }]}>
                        <Text style={[sDyn.headerTitle, { color: colors.textPri }]}>{t('freeze.title')}</Text>
                        <TouchableOpacity onPress={() => { resetState(); onClose(); }} style={sDyn.cancelBtn}>
                            <Text style={[sDyn.cancelText, { color: colors.cyan }]}>{t('common.cancel').toUpperCase()}</Text>
                        </TouchableOpacity>
                    </View>

                    <ScrollView style={sDyn.content}>
                        {/* Description */}
                        <Text style={[sDyn.infoTitle, { color: colors.cyan, fontFamily: MONO }]}>❄️ {t('freeze.snapshot')}</Text>
                        <Text style={[sDyn.infoDesc, { color: colors.textSec, fontFamily: MONO }]}>
                            {t('freeze.desc')}
                        </Text>

                        {!hasDtcs && !data && (
                            <View style={[sDyn.infoPanel, { borderColor: colors.amber, backgroundColor: colors.card }]}>
                                <Text style={{ color: colors.amber, fontSize: scaleFont(11), fontFamily: MONO, textAlign: 'center' }}>
                                    ⚠️ {t('freeze.noDtcs')}
                                </Text>
                            </View>
                        )}

                        {/* Action Button */}
                        {!data && !isLoading && (
                            <TouchableOpacity
                                style={[sDyn.actionBtn, { backgroundColor: colors.cyan }]}
                                onPress={fetchFreezeFrame}
                            >
                                <Text style={[sDyn.actionBtnText, { color: colors.card, fontFamily: MONO }]}>❄️ {t('freeze.read')}</Text>
                            </TouchableOpacity>
                        )}

                        {/* Loading */}
                        {isLoading && (
                            <View style={{ alignItems: 'center', marginTop: scaleHeight(20) }}>
                                <ActivityIndicator size="large" color={colors.cyan} />
                                <Text style={{ color: colors.textSec, fontSize: scaleFont(11), fontFamily: MONO, marginTop: scaleHeight(8) }}>
                                    {t('freeze.loading')}
                                </Text>
                            </View>
                        )}

                        {/* Error */}
                        {error && (
                            <View style={[sDyn.infoPanel, { borderColor: colors.red, backgroundColor: colors.card }]}>
                                <Text style={{ color: colors.red, fontSize: scaleFont(11), fontFamily: MONO, textAlign: 'center' }}>{error}</Text>
                            </View>
                        )}

                        {/* Results */}
                        {data && (
                            <View style={{ marginTop: scaleHeight(8) }}>
                                <Text style={{ color: colors.textPri, fontSize: scaleFont(12), fontWeight: '800', fontFamily: MONO, marginBottom: scaleHeight(8), textAlign: 'center' }}>
                                    📸 {t('freeze.values')}
                                </Text>

                                {data.dtcCode && (
                                    <View style={{ alignSelf: 'center', backgroundColor: colors.red + '20', borderColor: colors.red, borderWidth: 1, paddingHorizontal: scaleWidth(12), paddingVertical: scaleHeight(4), borderRadius: scaleMod(16), marginBottom: scaleHeight(12) }}>
                                        <Text style={{ color: colors.red, fontSize: scaleFont(11), fontWeight: '900', fontFamily: MONO }}>
                                            ⚠️ FREEZE DTC: {data.dtcCode}
                                        </Text>
                                    </View>
                                )}

                                <View style={{ flexDirection: 'row', gap: scaleMod(8), marginBottom: scaleHeight(8) }}>
                                    <View style={[sDyn.resultCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                                        <Text style={[sDyn.resultLabel, { color: colors.textSec, fontFamily: MONO }]}>{t('dashboard.rpm')}</Text>
                                        <Text style={[sDyn.resultValue, { color: colors.textPri, fontFamily: MONO }]}>{data.rpm !== null ? data.rpm : '--'}</Text>
                                        <Text style={[sDyn.resultUnit, { color: colors.textSec, fontFamily: MONO }]}>RPM</Text>
                                    </View>
                                    <View style={[sDyn.resultCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                                        <Text style={[sDyn.resultLabel, { color: colors.textSec, fontFamily: MONO }]}>{t('dashboard.speed')}</Text>
                                        <Text style={[sDyn.resultValue, { color: colors.textPri, fontFamily: MONO }]}>{data.speed !== null ? data.speed : '--'}</Text>
                                        <Text style={[sDyn.resultUnit, { color: colors.textSec, fontFamily: MONO }]}>KM/H</Text>
                                    </View>
                                    <View style={[sDyn.resultCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                                        <Text style={[sDyn.resultLabel, { color: colors.textSec, fontFamily: MONO }]}>{t('dashboard.temp')}</Text>
                                        <Text style={[sDyn.resultValue, { fontFamily: MONO }, data.coolant !== null && data.coolant > 100 ? { color: colors.red } : { color: colors.textPri }]}>
                                            {data.coolant !== null ? data.coolant : '--'}
                                        </Text>
                                        <Text style={[sDyn.resultUnit, { color: colors.textSec, fontFamily: MONO }]}>°C</Text>
                                    </View>
                                </View>

                                {(data.throttle !== null || data.map !== null || data.stft !== null) && (
                                    <View style={{ flexDirection: 'row', gap: scaleMod(8), marginBottom: scaleHeight(8) }}>
                                        <View style={[sDyn.resultCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                                            <Text style={[sDyn.resultLabel, { color: colors.textSec, fontFamily: MONO }]}>{t('freeze.throttle', 'THROTTLE')}</Text>
                                            <Text style={[sDyn.resultValue, { color: colors.textPri, fontFamily: MONO }]}>{data.throttle !== null ? `${data.throttle}%` : '--'}</Text>
                                            <Text style={[sDyn.resultUnit, { color: colors.textSec, fontFamily: MONO }]}>%</Text>
                                        </View>
                                        <View style={[sDyn.resultCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                                            <Text style={[sDyn.resultLabel, { color: colors.textSec, fontFamily: MONO }]}>{t('freeze.mapPressure', 'MAP PRESSURE')}</Text>
                                            <Text style={[sDyn.resultValue, { color: colors.textPri, fontFamily: MONO }]}>{data.map !== null ? data.map : '--'}</Text>
                                            <Text style={[sDyn.resultUnit, { color: colors.textSec, fontFamily: MONO }]}>kPa</Text>
                                        </View>
                                        <View style={[sDyn.resultCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                                            <Text style={[sDyn.resultLabel, { color: colors.textSec, fontFamily: MONO }]}>{t('freeze.stft', 'STFT')}</Text>
                                            <Text style={[sDyn.resultValue, { color: colors.textPri, fontFamily: MONO }]}>{data.stft !== null ? `${data.stft}%` : '--'}</Text>
                                            <Text style={[sDyn.resultUnit, { color: colors.textSec, fontFamily: MONO }]}>{t('freeze.trimUnit', 'Trim')}</Text>
                                        </View>
                                    </View>
                                )}

                                <TouchableOpacity
                                    style={[sDyn.actionBtn, { backgroundColor: colors.elevated, borderWidth: 1, borderColor: colors.border }]}
                                    onPress={() => { resetState(); }}
                                >
                                    <Text style={[sDyn.actionBtnText, { color: colors.textSec, fontFamily: MONO }]}>↺ {t('freeze.retry')}</Text>
                                </TouchableOpacity>
                            </View>
                        )}

                        {/* Info */}
                        <Text style={[sDyn.infoTitle, { color: colors.cyan, fontFamily: MONO, marginTop: scaleHeight(12) }]}>📖 {t('freeze.techInfo')}</Text>
                        <Text style={[sDyn.infoDesc, { color: colors.textSec, fontFamily: MONO }]}>
                            {t('freeze.techDesc')}
                        </Text>
                    </ScrollView>
                </View>
            </View>
        </Modal>
    );
}
