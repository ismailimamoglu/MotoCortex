import React, { useState, useRef, useCallback } from 'react';
import { View, Text, TouchableOpacity, Modal, SafeAreaView, StyleSheet, Platform, ActivityIndicator } from 'react-native';

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

type TestStep = 'idle' | 'resting' | 'cranking' | 'charging' | 'done';

interface BatteryTestResult {
    restingV: string | null;
    crankingV: string | null;
    chargingV: string | null;
}

interface Props {
    visible: boolean;
    onClose: () => void;
    sendCommand: (cmd: string) => Promise<string | undefined>;
    voltage: string | null;
}

export default function BatteryTestModal({ visible, onClose, sendCommand, voltage }: Props) {
    const [step, setStep] = useState<TestStep>('idle');
    const [result, setResult] = useState<BatteryTestResult>({ restingV: null, crankingV: null, chargingV: null });
    const [isRunning, setIsRunning] = useState(false);
    const [statusText, setStatusText] = useState('Teste başlamaya hazır.');
    const crankingIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const lowestVRef = useRef<number>(999);

    const readVoltage = useCallback(async (): Promise<string | null> => {
        try {
            const res = await sendCommand('ATRV');
            if (res) {
                const match = res.match(/(\d+\.?\d*)V?/i);
                if (match) return match[1] + 'V';
            }
        } catch (e) {
            console.error('Voltage read failed:', e);
        }
        return null;
    }, [sendCommand]);

    const startTest = async () => {
        setIsRunning(true);
        setResult({ restingV: null, crankingV: null, chargingV: null });
        lowestVRef.current = 999;

        // ── Step 1: Resting Voltage ──
        setStep('resting');
        setStatusText('Kontak açık, motor kapalı... Akü voltajı okunuyor...');
        const resting = await readVoltage();
        setResult(prev => ({ ...prev, restingV: resting }));

        if (!resting) {
            setStatusText('Voltaj okunamadı. Bağlantıyı kontrol edin.');
            setIsRunning(false);
            setStep('idle');
            return;
        }

        // ── Step 2: Cranking Voltage ──
        setStep('cranking');
        setStatusText('ŞİMDİ MARŞA BASIN! (5 saniye ölçüm yapılacak)');

        await new Promise<void>((resolve) => {
            let elapsed = 0;
            crankingIntervalRef.current = setInterval(async () => {
                elapsed += 500;
                const v = await readVoltage();
                if (v) {
                    const num = parseFloat(v.replace('V', ''));
                    if (num < lowestVRef.current) {
                        lowestVRef.current = num;
                        setResult(prev => ({ ...prev, crankingV: num.toFixed(1) + 'V' }));
                    }
                }
                if (elapsed >= 5000) {
                    if (crankingIntervalRef.current) clearInterval(crankingIntervalRef.current);
                    resolve();
                }
            }, 500);
        });

        // ── Step 3: Charging Voltage ──
        setStep('charging');
        setStatusText('Motor rölantide... Şarj voltajı okunuyor...');
        // Wait a moment for engine to stabilize
        await new Promise(r => setTimeout(r, 2000));
        const charging = await readVoltage();
        setResult(prev => ({ ...prev, chargingV: charging }));

        setStep('done');
        setIsRunning(false);
        setStatusText('Test tamamlandı!');
    };

    const resetTest = () => {
        setStep('idle');
        setResult({ restingV: null, crankingV: null, chargingV: null });
        setStatusText('Teste başlamaya hazır.');
        setIsRunning(false);
        if (crankingIntervalRef.current) clearInterval(crankingIntervalRef.current);
    };

    const getVerdict = () => {
        if (!result.restingV || !result.chargingV) return null;
        const rest = parseFloat(result.restingV.replace('V', ''));
        const crank = result.crankingV ? parseFloat(result.crankingV.replace('V', '')) : rest;
        const charge = parseFloat(result.chargingV.replace('V', ''));

        const verdicts: string[] = [];

        // Battery resting analysis
        if (rest >= 12.6) verdicts.push('✅ Akü: Tam dolu (' + rest.toFixed(1) + 'V)');
        else if (rest >= 12.4) verdicts.push('✅ Akü: İyi durumda (' + rest.toFixed(1) + 'V)');
        else if (rest >= 12.0) verdicts.push('⚠️ Akü: Zayıflıyor (' + rest.toFixed(1) + 'V)');
        else verdicts.push('🚨 Akü: Zayıf / Bitmiş (' + rest.toFixed(1) + 'V)');

        // Cranking analysis
        if (crank >= 10.0) verdicts.push('✅ Marş: Normal düşüş (' + crank.toFixed(1) + 'V)');
        else if (crank >= 9.0) verdicts.push('⚠️ Marş: Düşük voltaj (' + crank.toFixed(1) + 'V)');
        else verdicts.push('🚨 Marş: Kritik düşüş (' + crank.toFixed(1) + 'V)');

        // Charging analysis
        if (charge >= 13.5 && charge <= 14.5) verdicts.push('✅ Şarj: Regülatör normal (' + charge.toFixed(1) + 'V)');
        else if (charge >= 13.0 && charge < 13.5) verdicts.push('⚠️ Şarj: Düşük şarj (' + charge.toFixed(1) + 'V)');
        else if (charge > 14.5) verdicts.push('⚠️ Şarj: Aşırı şarj (' + charge.toFixed(1) + 'V)');
        else verdicts.push('🚨 Şarj: Regülatör arızalı (' + charge.toFixed(1) + 'V)');

        return verdicts;
    };

    return (
        <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onClose}>
            <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }}>
                {/* Header */}
                <View style={{ paddingHorizontal: 20, paddingTop: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', height: 60, borderBottomWidth: 1, borderBottomColor: C.border }}>
                    <Text style={{ color: C.textPri, fontSize: 14, fontWeight: '800', fontFamily: C.mono }}>AKÜ & MARŞ TESTİ</Text>
                    <TouchableOpacity onPress={() => { resetTest(); onClose(); }} style={{ padding: 10 }}>
                        <Text style={{ color: C.cyan, fontSize: 14, fontWeight: 'bold', fontFamily: C.mono }}>KAPAT</Text>
                    </TouchableOpacity>
                </View>

                <View style={{ flex: 1, padding: 16 }}>
                    {/* Status */}
                    <View style={{ backgroundColor: C.card, borderRadius: 6, padding: 16, borderWidth: 1, borderColor: C.border, marginBottom: 12 }}>
                        <Text style={{ color: C.amber, fontSize: 12, fontWeight: '800', fontFamily: C.mono, textAlign: 'center' }}>
                            {statusText}
                        </Text>
                        {step === 'cranking' && (
                            <Text style={{ color: C.red, fontSize: 20, fontWeight: '900', fontFamily: C.mono, textAlign: 'center', marginTop: 8 }}>
                                ⚡ {result.crankingV || 'Bekleniyor...'}
                            </Text>
                        )}
                    </View>

                    {/* Test Results Grid */}
                    <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
                        <View style={[ms.resultCard, step === 'resting' && ms.activeCard]}>
                            <Text style={ms.resultLabel}>DİNLENME</Text>
                            <Text style={ms.resultValue}>{result.restingV || '--'}</Text>
                            <Text style={ms.resultRef}>Ref: 12.4-12.8V</Text>
                        </View>
                        <View style={[ms.resultCard, step === 'cranking' && ms.activeCard]}>
                            <Text style={ms.resultLabel}>MARŞ</Text>
                            <Text style={[ms.resultValue, { color: C.amber }]}>{result.crankingV || '--'}</Text>
                            <Text style={ms.resultRef}>Ref: ≥9.6V</Text>
                        </View>
                        <View style={[ms.resultCard, step === 'charging' && ms.activeCard]}>
                            <Text style={ms.resultLabel}>ŞARJ</Text>
                            <Text style={[ms.resultValue, { color: C.green }]}>{result.chargingV || '--'}</Text>
                            <Text style={ms.resultRef}>Ref: 13.5-14.5V</Text>
                        </View>
                    </View>

                    {/* Current Voltage */}
                    <View style={{ backgroundColor: C.card, borderRadius: 6, padding: 12, borderWidth: 1, borderColor: C.border, marginBottom: 12, alignItems: 'center' }}>
                        <Text style={{ color: C.textSec, fontSize: 9, fontFamily: C.mono }}>ANLIK VOLTAJ</Text>
                        <Text style={{ color: C.cyan, fontSize: 28, fontWeight: '900', fontFamily: C.mono }}>{voltage || '--'}</Text>
                    </View>

                    {/* Verdict */}
                    {step === 'done' && getVerdict() && (
                        <View style={{ backgroundColor: C.card, borderRadius: 6, padding: 14, borderWidth: 1, borderColor: C.green, marginBottom: 12 }}>
                            <Text style={{ color: C.textPri, fontSize: 12, fontWeight: '800', fontFamily: C.mono, marginBottom: 8 }}>📋 DEĞERLENDİRME</Text>
                            {getVerdict()!.map((v, i) => (
                                <Text key={i} style={{ color: C.textPri, fontSize: 11, fontFamily: C.mono, lineHeight: 20 }}>{v}</Text>
                            ))}
                        </View>
                    )}

                    {/* Actions */}
                    {step === 'idle' && (
                        <TouchableOpacity
                            style={{ backgroundColor: C.cyan, borderRadius: 6, paddingVertical: 14, alignItems: 'center' }}
                            onPress={startTest}
                        >
                            <Text style={{ color: '#000', fontSize: 13, fontWeight: '900', fontFamily: C.mono }}>⚡ TESTİ BAŞLAT</Text>
                        </TouchableOpacity>
                    )}
                    {step === 'done' && (
                        <TouchableOpacity
                            style={{ backgroundColor: C.elevated, borderRadius: 6, paddingVertical: 14, alignItems: 'center', borderWidth: 1, borderColor: C.border }}
                            onPress={resetTest}
                        >
                            <Text style={{ color: C.textSec, fontSize: 13, fontWeight: '900', fontFamily: C.mono }}>↺ TESTİ TEKRARLA</Text>
                        </TouchableOpacity>
                    )}
                    {isRunning && (
                        <ActivityIndicator size="small" color={C.cyan} style={{ marginTop: 12 }} />
                    )}

                    {/* Instructions */}
                    <View style={{ backgroundColor: C.card, borderRadius: 6, padding: 14, borderWidth: 1, borderColor: C.border, marginTop: 12 }}>
                        <Text style={{ color: C.textPri, fontSize: 11, fontWeight: '800', fontFamily: C.mono, marginBottom: 6 }}>📖 TEST PROSEDÜRÜ</Text>
                        <Text style={{ color: C.textSec, fontSize: 10, fontFamily: C.mono, lineHeight: 18 }}>
                            1. Kontak açık, motor kapalı → Dinlenme voltajı ölçülür{'\n'}
                            2. "ŞİMDİ MARŞA BASIN" yazısı çıkınca marşa basın{'\n'}
                            3. 5 saniye boyunca en düşük voltaj kaydedilir{'\n'}
                            4. Motor çalışırken şarj/regülatör voltajı ölçülür{'\n\n'}
                            ⚠️ Test sırasında Bluetooth bağlantısını kesmeyin.
                        </Text>
                    </View>
                </View>
            </SafeAreaView>
        </Modal>
    );
}

const ms = StyleSheet.create({
    resultCard: {
        flex: 1,
        backgroundColor: '#111318',
        borderRadius: 6,
        padding: 12,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#1e2430',
    },
    activeCard: {
        borderColor: '#00d4ff',
        backgroundColor: '#0a1520',
    },
    resultLabel: {
        color: '#6b7280',
        fontSize: 9,
        fontWeight: '800',
        fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
        marginBottom: 4,
    },
    resultValue: {
        color: '#e8eaed',
        fontSize: 20,
        fontWeight: '900',
        fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    },
    resultRef: {
        color: '#6b7280',
        fontSize: 8,
        fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
        marginTop: 4,
    },
});
