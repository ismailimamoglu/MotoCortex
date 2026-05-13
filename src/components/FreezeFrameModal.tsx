import React, { useState, useRef, useCallback } from 'react';
import { View, Text, TouchableOpacity, Modal, SafeAreaView, StyleSheet, Platform, ActivityIndicator } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useThemeColors } from '../theme';

interface FreezeData {
    rpm: number | null;
    speed: number | null;
    coolant: number | null;
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
    const [isLoading, setIsLoading] = useState(false);
    const [data, setData] = useState<FreezeData | null>(null);
    const [error, setError] = useState<string | null>(null);

    const MONO = Platform.OS === 'ios' ? 'Menlo' : 'monospace';

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
            // Mode 02 commands: 02[PID]00 (frame 0)
            const rpmRes = await sendCommand('020C00');
            const speedRes = await sendCommand('020D00');
            const coolRes = await sendCommand('020500');

            // Parse — Mode 02 echo is 42 + PID (same as Mode 01 but 42 instead of 41)
            const rpmVal = rpmRes ? parseHex(rpmRes, '420C', 2) : null;
            const speedVal = speedRes ? parseHex(speedRes, '420D', 1) : null;
            const coolRaw = coolRes ? parseHex(coolRes, '4205', 1) : null;
            const coolVal = coolRaw !== null ? coolRaw - 40 : null;

            if (rpmVal === null && speedVal === null && coolVal === null) {
                setError(t('freeze.noData'));
            } else {
                setData({ rpm: rpmVal, speed: speedVal, coolant: coolVal });
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

    return (
        <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onClose}>
            <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
                {/* Header */}
                <View style={[ms.header, { borderBottomColor: colors.border }]}>
                    <Text style={[ms.headerTitle, { color: colors.textPri, fontFamily: MONO }]}>{t('freeze.title')}</Text>
                    <TouchableOpacity onPress={() => { resetState(); onClose(); }} style={{ padding: 10 }}>
                        <Text style={{ color: colors.cyan, fontSize: 14, fontWeight: 'bold', fontFamily: MONO }}>{t('common.cancel').toUpperCase()}</Text>
                    </TouchableOpacity>
                </View>

                <View style={{ flex: 1, padding: 16 }}>
                    {/* Description */}
                    <Text style={[ms.infoTitle, { color: colors.cyan, fontFamily: MONO }]}>❄️ {t('freeze.snapshot')}</Text>
                    <Text style={[ms.infoDesc, { color: colors.textSec, fontFamily: MONO }]}>
                        {t('freeze.desc')}
                    </Text>

                    {!hasDtcs && !data && (
                        <View style={[ms.infoPanel, { borderColor: colors.amber, backgroundColor: colors.card }]}>
                            <Text style={{ color: colors.amber, fontSize: 11, fontFamily: MONO, textAlign: 'center' }}>
                                ⚠️ {t('freeze.noDtcs')}
                            </Text>
                        </View>
                    )}

                    {/* Action Button */}
                    {!data && !isLoading && (
                        <TouchableOpacity
                            style={[ms.actionBtn, { backgroundColor: colors.cyan }]}
                            onPress={fetchFreezeFrame}
                        >
                            <Text style={[ms.actionBtnText, { color: colors.card, fontFamily: MONO }]}>❄️ {t('freeze.read')}</Text>
                        </TouchableOpacity>
                    )}

                    {/* Loading */}
                    {isLoading && (
                        <View style={{ alignItems: 'center', marginTop: 20 }}>
                            <ActivityIndicator size="large" color={colors.cyan} />
                            <Text style={{ color: colors.textSec, fontSize: 11, fontFamily: MONO, marginTop: 8 }}>
                                {t('freeze.loading')}
                            </Text>
                        </View>
                    )}

                    {/* Error */}
                    {error && (
                        <View style={[ms.infoPanel, { borderColor: colors.red, backgroundColor: colors.card }]}>
                            <Text style={{ color: colors.red, fontSize: 11, fontFamily: MONO, textAlign: 'center' }}>{error}</Text>
                        </View>
                    )}

                    {/* Results */}
                    {data && (
                        <View style={{ marginTop: 8 }}>
                            <Text style={{ color: colors.textPri, fontSize: 12, fontWeight: '800', fontFamily: MONO, marginBottom: 12, textAlign: 'center' }}>
                                📸 {t('freeze.values')}
                            </Text>

                            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>
                                <View style={[ms.resultCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                                    <Text style={[ms.resultLabel, { color: colors.textSec, fontFamily: MONO }]}>{t('dashboard.rpm')}</Text>
                                    <Text style={[ms.resultValue, { color: colors.textPri, fontFamily: MONO }]}>{data.rpm !== null ? data.rpm : '--'}</Text>
                                    <Text style={[ms.resultUnit, { color: colors.textSec, fontFamily: MONO }]}>RPM</Text>
                                </View>
                                <View style={[ms.resultCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                                    <Text style={[ms.resultLabel, { color: colors.textSec, fontFamily: MONO }]}>{t('dashboard.speed')}</Text>
                                    <Text style={[ms.resultValue, { color: colors.textPri, fontFamily: MONO }]}>{data.speed !== null ? data.speed : '--'}</Text>
                                    <Text style={[ms.resultUnit, { color: colors.textSec, fontFamily: MONO }]}>KM/H</Text>
                                </View>
                                <View style={[ms.resultCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                                    <Text style={[ms.resultLabel, { color: colors.textSec, fontFamily: MONO }]}>{t('dashboard.temp')}</Text>
                                    <Text style={[ms.resultValue, { fontFamily: MONO }, data.coolant !== null && data.coolant > 100 ? { color: colors.red } : { color: colors.textPri }]}>
                                        {data.coolant !== null ? data.coolant : '--'}
                                    </Text>
                                    <Text style={[ms.resultUnit, { color: colors.textSec, fontFamily: MONO }]}>°C</Text>
                                </View>
                            </View>

                            <TouchableOpacity
                                style={[ms.actionBtn, { backgroundColor: colors.elevated, borderWidth: 1, borderColor: colors.border }]}
                                onPress={() => { resetState(); }}
                            >
                                <Text style={[ms.actionBtnText, { color: colors.textSec, fontFamily: MONO }]}>↺ {t('freeze.retry')}</Text>
                            </TouchableOpacity>
                        </View>
                    )}

                    {/* Info */}
                    <Text style={[ms.infoTitle, { color: colors.cyan, fontFamily: MONO }]}>📖 {t('freeze.techInfo')}</Text>
                    <Text style={[ms.infoDesc, { color: colors.textSec, fontFamily: MONO }]}>
                        {t('freeze.techDesc')}
                    </Text>
                </View>
            </SafeAreaView>
        </Modal>
    );
}

const ms = StyleSheet.create({
    header: {
        paddingHorizontal: 20,
        paddingTop: 10,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        height: 60,
        borderBottomWidth: 1,
    },
    headerTitle: {
        fontSize: 14,
        fontWeight: '800',
    },
    infoPanel: {
        borderRadius: 6,
        padding: 14,
        borderWidth: 1,
        marginBottom: 12,
    },
    infoTitle: {
        fontSize: 12,
        fontWeight: '800',
        marginBottom: 6,
    },
    infoDesc: {
        fontSize: 10,
        lineHeight: 16,
    },
    actionBtn: {
        borderRadius: 6,
        paddingVertical: 14,
        alignItems: 'center',
        marginBottom: 8,
    },
    actionBtnText: {
        fontSize: 13,
        fontWeight: '900',
    },
    resultCard: {
        flex: 1,
        borderRadius: 6,
        padding: 14,
        alignItems: 'center',
        borderWidth: 1,
    },
    resultLabel: {
        fontSize: 9,
        fontWeight: '800',
        marginBottom: 4,
    },
    resultValue: {
        fontSize: 22,
        fontWeight: '900',
    },
    resultUnit: {
        fontSize: 9,
        marginTop: 4,
    },
});

