import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, TouchableOpacity, Modal, SafeAreaView, StyleSheet, Platform } from 'react-native';

const C = {
    bg: '#0a0a0a',
    card: '#111318',
    elevated: '#1a1d24',
    border: '#1e2430',
    cyan: '#00d4ff',
    green: '#00ff88',
    red: '#ff3b3b',
    amber: '#ffb800',
    textPri: '#e8eaed',
    textSec: '#6b7280',
    mono: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
};

type TimerState = 'idle' | 'armed' | 'running' | 'done';

interface Props {
    visible: boolean;
    onClose: () => void;
    speed: number | null;
}

export default function PerformanceModal({ visible, onClose, speed }: Props) {
    const [state, setState] = useState<TimerState>('idle');
    const [elapsed, setElapsed] = useState(0);
    const [time60, setTime60] = useState<number | null>(null);
    const [time100, setTime100] = useState<number | null>(null);
    const startTimeRef = useRef<number>(0);
    const timerRef = useRef<NodeJS.Timeout | null>(null);
    const reached60Ref = useRef(false);
    const reached100Ref = useRef(false);

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
            <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }}>
                {/* Header */}
                <View style={ps.header}>
                    <Text style={ps.headerTitle}>PERFORMANS TESTİ</Text>
                    <TouchableOpacity onPress={() => { resetTimer(); onClose(); }} style={{ padding: 10 }}>
                        <Text style={{ color: C.cyan, fontSize: 14, fontWeight: 'bold', fontFamily: C.mono }}>KAPAT</Text>
                    </TouchableOpacity>
                </View>

                <View style={{ flex: 1, padding: 16, justifyContent: 'center' }}>
                    {/* Big Timer */}
                    <View style={ps.timerContainer}>
                        <Text style={ps.timerValue}>{formatTime(elapsed)}</Text>
                        <Text style={ps.timerUnit}>SANİYE</Text>
                    </View>

                    {/* Live Speed */}
                    <View style={ps.speedContainer}>
                        <Text style={ps.speedValue}>{speed !== null ? speed : 0}</Text>
                        <Text style={ps.speedUnit}>KM/H</Text>
                    </View>

                    {/* Status */}
                    <View style={{ alignItems: 'center', marginBottom: 20 }}>
                        {state === 'idle' && (
                            <Text style={{ color: C.textSec, fontSize: 11, fontFamily: C.mono, textAlign: 'center' }}>
                                Butona basın ve harekete geçmeye hazırlanın.
                            </Text>
                        )}
                        {state === 'armed' && (
                            <Text style={{ color: C.amber, fontSize: 13, fontWeight: '900', fontFamily: C.mono, textAlign: 'center' }}>
                                ⏱️ HAZIR! Aracı sürmeye başlayın...{'\n'}
                                Hız {'>'} 0 olduğunda sayaç başlar.
                            </Text>
                        )}
                        {state === 'running' && (
                            <Text style={{ color: C.green, fontSize: 13, fontWeight: '900', fontFamily: C.mono, textAlign: 'center' }}>
                                🏁 ÖLÇÜM YAPILIYOR...
                            </Text>
                        )}
                        {state === 'done' && (
                            <Text style={{ color: C.cyan, fontSize: 13, fontWeight: '900', fontFamily: C.mono, textAlign: 'center' }}>
                                ✅ TEST TAMAMLANDI
                            </Text>
                        )}
                    </View>

                    {/* Results Grid */}
                    <View style={{ flexDirection: 'row', gap: 10, marginBottom: 20 }}>
                        <View style={[ps.resultCard, time60 !== null && { borderColor: C.green }]}>
                            <Text style={ps.resultLabel}>0-60 KM/H</Text>
                            <Text style={[ps.resultValue, time60 !== null && { color: C.green }]}>
                                {time60 !== null ? time60.toFixed(2) : '--'}
                            </Text>
                            <Text style={ps.resultUnit}>sn</Text>
                        </View>
                        <View style={[ps.resultCard, time100 !== null && { borderColor: C.cyan }]}>
                            <Text style={ps.resultLabel}>0-100 KM/H</Text>
                            <Text style={[ps.resultValue, time100 !== null && { color: C.cyan }]}>
                                {time100 !== null ? time100.toFixed(2) : '--'}
                            </Text>
                            <Text style={ps.resultUnit}>sn</Text>
                        </View>
                    </View>

                    {/* Controls */}
                    {state === 'idle' && (
                        <TouchableOpacity style={ps.startBtn} onPress={armTimer}>
                            <Text style={ps.startBtnText}>🏁 TESTİ BAŞLAT</Text>
                        </TouchableOpacity>
                    )}
                    {state === 'running' && (
                        <TouchableOpacity style={[ps.startBtn, { backgroundColor: C.red }]} onPress={stopTimer}>
                            <Text style={ps.startBtnText}>⏹ DURDUR</Text>
                        </TouchableOpacity>
                    )}
                    {(state === 'done' || state === 'armed') && (
                        <TouchableOpacity style={[ps.startBtn, { backgroundColor: C.elevated, borderWidth: 1, borderColor: C.border }]} onPress={resetTimer}>
                            <Text style={[ps.startBtnText, { color: C.textSec }]}>↺ SIFIRLA</Text>
                        </TouchableOpacity>
                    )}

                    {/* Instructions */}
                    <View style={[ps.infoPanel, { marginTop: 16 }]}>
                        <Text style={{ color: C.cyan, fontSize: 11, fontWeight: '800', fontFamily: C.mono, marginBottom: 6 }}>📖 NASIL ÇALIŞIR?</Text>
                        <Text style={{ color: C.textSec, fontSize: 10, fontFamily: C.mono, lineHeight: 16 }}>
                            1. "Testi Başlat" butonuna basın{'\n'}
                            2. Araç duruyor olmalı (Hız = 0){'\n'}
                            3. Hareket etmeye başladığınızda krono başlar{'\n'}
                            4. 60 km/h ve 100 km/h geçiş süreleri kaydedilir{'\n\n'}
                            ⚠️ Bu testi güvenli bir alanda yapın!
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
        borderBottomColor: '#1e2430',
    },
    headerTitle: {
        color: '#e8eaed',
        fontSize: 14,
        fontWeight: '800',
        fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    },
    timerContainer: {
        alignItems: 'center',
        marginBottom: 12,
    },
    timerValue: {
        color: '#e8eaed',
        fontSize: 64,
        fontWeight: '900',
        fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    },
    timerUnit: {
        color: '#6b7280',
        fontSize: 11,
        fontWeight: '800',
        fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
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
        color: '#00d4ff',
        fontSize: 36,
        fontWeight: '900',
        fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    },
    speedUnit: {
        color: '#6b7280',
        fontSize: 14,
        fontWeight: '800',
        fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    },
    resultCard: {
        flex: 1,
        backgroundColor: '#111318',
        borderRadius: 8,
        padding: 16,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#1e2430',
    },
    resultLabel: {
        color: '#6b7280',
        fontSize: 10,
        fontWeight: '800',
        fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
        marginBottom: 6,
    },
    resultValue: {
        color: '#e8eaed',
        fontSize: 28,
        fontWeight: '900',
        fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    },
    resultUnit: {
        color: '#6b7280',
        fontSize: 10,
        fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
        marginTop: 4,
    },
    startBtn: {
        backgroundColor: '#00d4ff',
        borderRadius: 8,
        paddingVertical: 16,
        alignItems: 'center',
    },
    startBtnText: {
        color: '#000',
        fontSize: 14,
        fontWeight: '900',
        fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    },
    infoPanel: {
        backgroundColor: '#111318',
        borderRadius: 6,
        padding: 14,
        borderWidth: 1,
        borderColor: '#1e2430',
    },
});
