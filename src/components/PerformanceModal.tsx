import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useThemeColors } from '../theme';
import { useResponsive } from '../hooks/useResponsive';
import * as SecureStore from 'expo-secure-store';
import { useAppStore } from '../store/useAppStore';
import { useBluetoothStore } from '../store/useBluetoothStore';
import { Alert } from 'react-native';

type TimerState = 'idle' | 'armed' | 'running' | 'done';

interface Props {
    visible: boolean;
    onClose: () => void;
    speed: number | null;
}

export default function PerformanceModal({ visible, onClose, speed }: Props) {
    const { t } = useTranslation();
    const colors = useThemeColors();
    const { s: scaleWidth, vs: scaleHeight, ms: scaleMod, fs: scaleFont, isTablet, isLargeTablet } = useResponsive();
    const insets = useSafeAreaInsets();

    const [state, setState] = useState<TimerState>('idle');
    const [elapsed, setElapsed] = useState(0);
    const [time60, setTime60] = useState<number | null>(null);
    const [time100, setTime100] = useState<number | null>(null);
    const startTimeRef = useRef<number>(0);
    const timerRef = useRef<NodeJS.Timeout | null>(null);
    const reached60Ref = useRef(false);
    const reached100Ref = useRef(false);

    const MONO = Platform.OS === 'ios' ? 'System' : 'sans-serif';

    useEffect(() => {
        if (!visible) return;

        if (state === 'armed' && speed !== null && speed > 0) {
            startTimeRef.current = Date.now();
            reached60Ref.current = false;
            reached100Ref.current = false;
            setState('running');

            timerRef.current = setInterval(() => {
                setElapsed(Date.now() - startTimeRef.current);
            }, 50);
        }

        if (state === 'running' && speed !== null) {
            if (speed >= 60 && !reached60Ref.current) {
                reached60Ref.current = true;
                setTime60((Date.now() - startTimeRef.current) / 1000);
            }
            if (speed >= 100 && !reached100Ref.current) {
                reached100Ref.current = true;
                setTime100((Date.now() - startTimeRef.current) / 1000);
                setState('done');
                if (timerRef.current) clearInterval(timerRef.current);
            }
        }
    }, [speed, visible]);

    const armTimer = async () => {
        const isPro = useAppStore.getState().isPro;
        if (!isPro) {
            // Check daily limit for free teaser (3 runs per day)
            try {
                const stored = await SecureStore.getItemAsync('motocortex_perf_teaser_counter');
                const todayStr = new Date().toDateString();
                let counter = { date: '', count: 0 };
                if (stored) {
                    try { counter = JSON.parse(stored); } catch { counter = { date: '', count: 0 }; }
                }
                // Reset counter if day changed
                if (counter.date !== todayStr) {
                    counter = { date: todayStr, count: 0 };
                }
                if (counter.count >= 3) {
                    Alert.alert(
                        t('perfTeaser.limitTitle', 'Daily Limit Reached'),
                        t('perfTeaser.limitDesc', 'You have reached your daily 3 free 0-60 km/h test limit. Upgrade to PRO for unlimited tests and 0-100 km/h measurements.'),
                        [
                            { text: t('common.cancel'), style: 'cancel' },
                            { text: t('common.upgrade'), onPress: () => {
                                useBluetoothStore.getState().setPaywallContext('PERF_TEASER_LIMIT');
                            }}
                        ]
                    );
                    return;
                }
            } catch (err) {
                console.warn('[PerformanceModal] SecureStore read failed:', err);
            }
        }

        setState('armed');
        setElapsed(0);
        setTime60(null);
        setTime100(null);
        reached60Ref.current = false;
        reached100Ref.current = false;
    };

    const stopTimer = () => {
        setState('done');
        if (timerRef.current) clearInterval(timerRef.current);
        
        // If free user successfully finished 0-60, increment daily counter
        const isPro = useAppStore.getState().isPro;
        if (!isPro) {
            (async () => {
                try {
                    const todayStr = new Date().toDateString();
                    const stored = await SecureStore.getItemAsync('motocortex_perf_teaser_counter');
                    let counter = { date: todayStr, count: 0 };
                    if (stored) {
                        try { counter = JSON.parse(stored); } catch {}
                    }
                    if (counter.date !== todayStr) {
                        counter = { date: todayStr, count: 0 };
                    }
                    counter.count += 1;
                    await SecureStore.setItemAsync('motocortex_perf_teaser_counter', JSON.stringify(counter));
                } catch {}
            })();
        }
    };

    const resetTimer = () => {
        setState('idle');
        setElapsed(0);
        setTime60(null);
        setTime100(null);
        if (timerRef.current) clearInterval(timerRef.current);
    };



    const formatTime = (ms: number) => {
        const seconds = ms / 1000;
        return seconds.toFixed(2);
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
                paddingBottom: insets.bottom + scaleMod(14),
                justifyContent: 'center' as const,
            },
            timerContainer: {
                alignItems: 'center' as const,
                marginBottom: scaleHeight(12),
            },
            timerValue: {
                fontSize: scaleFont(54),
                fontWeight: '900' as const,
            },
            timerUnit: {
                fontSize: scaleFont(11),
                fontWeight: '800' as const,
                letterSpacing: 4,
            },
            speedContainer: {
                alignItems: 'center' as const,
                marginBottom: scaleHeight(20),
                flexDirection: 'row' as const,
                justifyContent: 'center' as const,
                gap: scaleMod(8),
            },
            speedValue: {
                fontSize: scaleFont(32),
                fontWeight: '900' as const,
            },
            speedUnit: {
                fontSize: scaleFont(14),
                fontWeight: '800' as const,
            },
            resultCard: {
                flex: 1,
                borderRadius: scaleMod(8),
                padding: scaleMod(12),
                alignItems: 'center' as const,
                borderWidth: 1,
            },
            resultLabel: {
                fontSize: scaleFont(10),
                fontWeight: '800' as const,
                marginBottom: scaleHeight(6),
            },
            resultValue: {
                fontSize: scaleFont(24),
                fontWeight: '900' as const,
            },
            resultUnit: {
                fontSize: scaleFont(10),
                marginTop: scaleHeight(4),
            },
            startBtn: {
                borderRadius: scaleMod(8),
                paddingVertical: scaleHeight(14),
                alignItems: 'center' as const,
            },
            startBtnText: {
                fontSize: scaleFont(14),
                fontWeight: '900' as const,
            },
            infoPanel: {
                borderRadius: scaleMod(8),
                padding: scaleMod(12),
                borderWidth: 1,
            },
        };
    }, [scaleWidth, scaleHeight, scaleMod, scaleFont, isTablet, isLargeTablet, colors, insets.top, insets.bottom]) as any;

    if (!visible) return null;

    return (
        <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={onClose}>
            <View style={sDyn.modalOverlay}>
                <View style={[sDyn.modalContainer, { backgroundColor: colors.bg }]}>
                    {/* Header */}
                    <View style={[sDyn.header, { borderBottomColor: colors.border }]}>
                        <Text style={[sDyn.headerTitle, { color: colors.textPri }]}>{t('perf.title', 'PERFORMANCE TEST')}</Text>
                        <TouchableOpacity onPress={onClose} style={sDyn.cancelBtn}>
                            <Text style={[sDyn.cancelText, { color: colors.cyan }]}>{t('common.cancel', 'KAPAT').toUpperCase()}</Text>
                        </TouchableOpacity>
                    </View>

                    <View style={{ flex: 1, padding: scaleMod(16) }}>
                        {/* Big Timer */}
                        <View style={sDyn.timerContainer}>
                            <Text style={[sDyn.timerValue, { color: colors.textPri, fontFamily: MONO }]}>{formatTime(elapsed)}</Text>
                            <Text style={[sDyn.timerUnit, { color: colors.textSec, fontFamily: MONO }]}>{t('perf.seconds')}</Text>
                        </View>

                        {/* Live Speed */}
                        <View style={sDyn.speedContainer}>
                            <Text style={[sDyn.speedValue, { color: colors.cyan, fontFamily: MONO }]}>{speed !== null ? speed : 0}</Text>
                            <Text style={[sDyn.speedUnit, { color: colors.textSec, fontFamily: MONO }]}>{t('perf.speed')}</Text>
                        </View>

                        {/* Status */}
                        <View style={{ alignItems: 'center', marginBottom: scaleHeight(20) }}>
                            {state === 'idle' && (
                                <Text style={{ color: colors.textSec, fontSize: scaleFont(11), fontFamily: MONO, textAlign: 'center' }}>
                                    {t('perf.idle')}
                                </Text>
                            )}
                            {state === 'armed' && (
                                <Text style={{ color: colors.amber, fontSize: scaleFont(13), fontWeight: '900', fontFamily: MONO, textAlign: 'center' }}>
                                    {t('perf.ready')}{'\n'}
                                    {t('perf.readyDesc')}
                                </Text>
                            )}
                            {state === 'running' && (
                                <Text style={{ color: colors.green, fontSize: scaleFont(13), fontWeight: '900', fontFamily: MONO, textAlign: 'center' }}>
                                    {t('perf.measuring')}
                                </Text>
                            )}
                            {state === 'done' && (
                                <Text style={{ color: colors.cyan, fontSize: scaleFont(13), fontWeight: '900', fontFamily: MONO, textAlign: 'center' }}>
                                    {t('perf.done')}
                                </Text>
                            )}
                        </View>

                        {/* Results Grid */}
                        <View style={{ flexDirection: 'row', gap: scaleMod(10), marginBottom: scaleHeight(20) }}>
                            <View style={[sDyn.resultCard, { backgroundColor: colors.card, borderColor: colors.border }, time60 !== null && { borderColor: colors.green }]}>
                                <Text style={[sDyn.resultLabel, { color: colors.textSec, fontFamily: MONO }]}>0-60 KM/H</Text>
                                <Text style={[sDyn.resultValue, { fontFamily: MONO }, time60 !== null ? { color: colors.green } : { color: colors.textPri }]}>
                                    {time60 !== null ? time60.toFixed(2) : '--'}
                                </Text>
                                <Text style={[sDyn.resultUnit, { color: colors.textSec, fontFamily: MONO }]}>sn</Text>
                            </View>
                            <View style={[sDyn.resultCard, { backgroundColor: colors.card, borderColor: colors.border }, time100 !== null && { borderColor: colors.cyan }]}>
                                <Text style={[sDyn.resultLabel, { color: colors.textSec, fontFamily: MONO }]}>0-100 KM/H</Text>
                                <Text style={[sDyn.resultValue, { fontFamily: MONO }, time100 !== null ? { color: colors.cyan } : { color: colors.textPri }]}>
                                    {time100 !== null ? time100.toFixed(2) : '--'}
                                </Text>
                                <Text style={[sDyn.resultUnit, { color: colors.textSec, fontFamily: MONO }]}>sn</Text>
                            </View>
                        </View>

                        {/* Controls */}
                        {state === 'idle' && (
                            <TouchableOpacity style={[sDyn.startBtn, { backgroundColor: colors.cyan }]} onPress={armTimer}>
                                <Text style={[sDyn.startBtnText, { color: colors.card, fontFamily: MONO }]}>{t('perf.start')}</Text>
                            </TouchableOpacity>
                        )}
                        {state === 'running' && (
                            <TouchableOpacity style={[sDyn.startBtn, { backgroundColor: colors.red }]} onPress={stopTimer}>
                                <Text style={[sDyn.startBtnText, { color: colors.card, fontFamily: MONO }]}>{t('perf.stop')}</Text>
                            </TouchableOpacity>
                        )}
                        {(state === 'done' || state === 'armed') && (
                            <TouchableOpacity style={[sDyn.startBtn, { backgroundColor: colors.elevated, borderWidth: 1, borderColor: colors.border }]} onPress={resetTimer}>
                                <Text style={[sDyn.startBtnText, { color: colors.textSec, fontFamily: MONO }]}>{t('perf.reset')}</Text>
                            </TouchableOpacity>
                        )}

                        {/* Instructions */}
                        <View style={[sDyn.infoPanel, { marginTop: scaleHeight(16), backgroundColor: colors.card, borderColor: colors.border }]}>
                            <Text style={{ color: colors.cyan, fontSize: scaleFont(11), fontWeight: '800', fontFamily: MONO, marginBottom: scaleHeight(6) }}>{t('perf.howItWorks')}</Text>
                            <Text style={{ color: colors.textSec, fontSize: scaleFont(10), fontFamily: MONO, lineHeight: scaleFont(15) }}>
                                {t('perf.howDesc')}
                            </Text>
                        </View>
                    </View>
                </View>
            </View>
        </Modal>
    );
}
