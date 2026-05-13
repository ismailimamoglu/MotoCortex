import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, TouchableOpacity, Modal, SafeAreaView, StyleSheet, Platform, ActivityIndicator } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useThemeColors } from '../theme';

type TimerState = 'idle' | 'armed' | 'running' | 'done';

interface Props {
    visible: boolean;
    onClose: () => void;
    speed: number | null;
}

export default function PerformanceModal({ visible, onClose, speed }: Props) {
    const { t } = useTranslation();
    const colors = useThemeColors();
    const [state, setState] = useState<TimerState>('idle');
    const [elapsed, setElapsed] = useState(0);
    const [time60, setTime60] = useState<number | null>(null);
    const [time100, setTime100] = useState<number | null>(null);
    const startTimeRef = useRef<number>(0);
    const timerRef = useRef<NodeJS.Timeout | null>(null);
    const reached60Ref = useRef(false);
    const reached100Ref = useRef(false);

    const MONO = Platform.OS === 'ios' ? 'Menlo' : 'monospace';

    // Watch speed changes while armed or running
    useEffect(() => {
        if (!visible) return;

        if (state === 'armed' && speed !== null && speed > 0) {
            // Speed detected! Start the timer
            startTimeRef.current = Date.now();
            reached60Ref.current = false;
            reached100Ref.current = false;
            setState('running');

            timerRef.current = setInterval(() => {
                setElapsed(Date.now() - startTimeRef.current);
            }, 50); // 50ms refresh for smooth timer
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
    }, [speed, state, visible]);

    const armTimer = () => {
        setState('armed');
        setElapsed(0);
        setTime60(null);
        setTime100(null);
        reached60Ref.current = false;
        reached100Ref.current = false;
    };

    const resetTimer = () => {
        setState('idle');
        setElapsed(0);
        setTime60(null);
        setTime100(null);
        if (timerRef.current) clearInterval(timerRef.current);
    };

    const stopTimer = () => {
        setState('done');
        if (timerRef.current) clearInterval(timerRef.current);
    };

    const formatTime = (ms: number) => {
        const seconds = ms / 1000;
        return seconds.toFixed(2);
    };

    return (
        <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onClose}>
            <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
                {/* Header */}
                <View style={[ps.header, { borderBottomColor: colors.border }]}>
                    <Text style={[ps.headerTitle, { color: colors.textPri, fontFamily: MONO }]}>{t('perf.title')}</Text>
                    <TouchableOpacity onPress={() => { resetTimer(); onClose(); }} style={{ padding: 10 }}>
                        <Text style={{ color: colors.cyan, fontSize: 14, fontWeight: 'bold', fontFamily: MONO }}>{t('common.cancel').toUpperCase()}</Text>
                    </TouchableOpacity>
                </View>

                <View style={{ flex: 1, padding: 16, justifyContent: 'center' }}>
                    {/* Big Timer */}
                    <View style={ps.timerContainer}>
                        <Text style={[ps.timerValue, { color: colors.textPri, fontFamily: MONO }]}>{formatTime(elapsed)}</Text>
                        <Text style={[ps.timerUnit, { color: colors.textSec, fontFamily: MONO }]}>{t('perf.seconds')}</Text>
                    </View>

                    {/* Live Speed */}
                    <View style={ps.speedContainer}>
                        <Text style={[ps.speedValue, { color: colors.cyan, fontFamily: MONO }]}>{speed !== null ? speed : 0}</Text>
                        <Text style={[ps.speedUnit, { color: colors.textSec, fontFamily: MONO }]}>{t('perf.speed')}</Text>
                    </View>

                    {/* Status */}
                    <View style={{ alignItems: 'center', marginBottom: 20 }}>
                        {state === 'idle' && (
                            <Text style={{ color: colors.textSec, fontSize: 11, fontFamily: MONO, textAlign: 'center' }}>
                                {t('perf.idle')}
                            </Text>
                        )}
                        {state === 'armed' && (
                            <Text style={{ color: colors.amber, fontSize: 13, fontWeight: '900', fontFamily: MONO, textAlign: 'center' }}>
                                ⏱️ {t('perf.ready')}{'\n'}
                                {t('perf.readyDesc')}
                            </Text>
                        )}
                        {state === 'running' && (
                            <Text style={{ color: colors.green, fontSize: 13, fontWeight: '900', fontFamily: MONO, textAlign: 'center' }}>
                                🏁 {t('perf.measuring')}
                            </Text>
                        )}
                        {state === 'done' && (
                            <Text style={{ color: colors.cyan, fontSize: 13, fontWeight: '900', fontFamily: MONO, textAlign: 'center' }}>
                                ✅ {t('perf.done')}
                            </Text>
                        )}
                    </View>

                    {/* Results Grid */}
                    <View style={{ flexDirection: 'row', gap: 10, marginBottom: 20 }}>
                        <View style={[ps.resultCard, { backgroundColor: colors.card, borderColor: colors.border }, time60 !== null && { borderColor: colors.green }]}>
                            <Text style={[ps.resultLabel, { color: colors.textSec, fontFamily: MONO }]}>0-60 KM/H</Text>
                            <Text style={[ps.resultValue, { fontFamily: MONO }, time60 !== null ? { color: colors.green } : { color: colors.textPri }]}>
                                {time60 !== null ? time60.toFixed(2) : '--'}
                            </Text>
                            <Text style={[ps.resultUnit, { color: colors.textSec, fontFamily: MONO }]}>sn</Text>
                        </View>
                        <View style={[ps.resultCard, { backgroundColor: colors.card, borderColor: colors.border }, time100 !== null && { borderColor: colors.cyan }]}>
                            <Text style={[ps.resultLabel, { color: colors.textSec, fontFamily: MONO }]}>0-100 KM/H</Text>
                            <Text style={[ps.resultValue, { fontFamily: MONO }, time100 !== null ? { color: colors.cyan } : { color: colors.textPri }]}>
                                {time100 !== null ? time100.toFixed(2) : '--'}
                            </Text>
                            <Text style={[ps.resultUnit, { color: colors.textSec, fontFamily: MONO }]}>sn</Text>
                        </View>
                    </View>

                    {/* Controls */}
                    {state === 'idle' && (
                        <TouchableOpacity style={[ps.startBtn, { backgroundColor: colors.cyan }]} onPress={armTimer}>
                            <Text style={[ps.startBtnText, { color: colors.card, fontFamily: MONO }]}>🏁 {t('perf.start')}</Text>
                        </TouchableOpacity>
                    )}
                    {state === 'running' && (
                        <TouchableOpacity style={[ps.startBtn, { backgroundColor: colors.red }]} onPress={stopTimer}>
                            <Text style={[ps.startBtnText, { color: colors.card, fontFamily: MONO }]}>⏹ {t('perf.stop')}</Text>
                        </TouchableOpacity>
                    )}
                    {(state === 'done' || state === 'armed') && (
                        <TouchableOpacity style={[ps.startBtn, { backgroundColor: colors.elevated, borderWidth: 1, borderColor: colors.border }]} onPress={resetTimer}>
                            <Text style={[ps.startBtnText, { color: colors.textSec, fontFamily: MONO }]}>↺ {t('perf.reset')}</Text>
                        </TouchableOpacity>
                    )}

                    {/* Instructions */}
                    <View style={[ps.infoPanel, { marginTop: 16, backgroundColor: colors.card, borderColor: colors.border }]}>
                        <Text style={{ color: colors.cyan, fontSize: 11, fontWeight: '800', fontFamily: MONO, marginBottom: 6 }}>📖 {t('perf.howItWorks')}</Text>
                        <Text style={{ color: colors.textSec, fontSize: 10, fontFamily: MONO, lineHeight: 16 }}>
                            {t('perf.howDesc')}
                        </Text>
                    </View>
                </View>
            </SafeAreaView>
        </Modal>
    );
}

const ps = StyleSheet.create({
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
    timerContainer: {
        alignItems: 'center',
        marginBottom: 12,
    },
    timerValue: {
        fontSize: 64,
        fontWeight: '900',
    },
    timerUnit: {
        fontSize: 11,
        fontWeight: '800',
        letterSpacing: 4,
    },
    speedContainer: {
        alignItems: 'center',
        marginBottom: 20,
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 8,
    },
    speedValue: {
        fontSize: 36,
        fontWeight: '900',
    },
    speedUnit: {
        fontSize: 14,
        fontWeight: '800',
    },
    resultCard: {
        flex: 1,
        borderRadius: 8,
        padding: 16,
        alignItems: 'center',
        borderWidth: 1,
    },
    resultLabel: {
        fontSize: 10,
        fontWeight: '800',
        marginBottom: 6,
    },
    resultValue: {
        fontSize: 28,
        fontWeight: '900',
    },
    resultUnit: {
        fontSize: 10,
        marginTop: 4,
    },
    startBtn: {
        borderRadius: 8,
        paddingVertical: 16,
        alignItems: 'center',
    },
    startBtnText: {
        fontSize: 14,
        fontWeight: '900',
    },
    infoPanel: {
        borderRadius: 6,
        padding: 14,
        borderWidth: 1,
    },
});

