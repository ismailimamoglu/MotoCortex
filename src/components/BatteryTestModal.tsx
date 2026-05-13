import React, { useState, useRef, useCallback } from 'react';
import { View, Text, TouchableOpacity, Modal, SafeAreaView, StyleSheet, Platform, ActivityIndicator } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useThemeColors } from '../theme';

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
    const { t } = useTranslation();
    const colors = useThemeColors();
    const [step, setStep] = useState<TestStep>('idle');
    const [result, setResult] = useState<BatteryTestResult>({ restingV: null, crankingV: null, chargingV: null });
    const [isRunning, setIsRunning] = useState(false);
    const [statusText, setStatusText] = useState(t('battery.ready'));
    const crankingIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const lowestVRef = useRef<number>(999);

    const MONO = Platform.OS === 'ios' ? 'Menlo' : 'monospace';

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
        setStatusText(t('battery.restingStatus'));
        const resting = await readVoltage();
        setResult(prev => ({ ...prev, restingV: resting }));

        if (!resting) {
            setStatusText(t('battery.voltageError'));
            setIsRunning(false);
            setStep('idle');
            return;
        }

        // ── Step 2: Cranking Voltage ──
        setStep('cranking');
        setStatusText(t('battery.crankingStatus'));

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
        setStatusText(t('battery.chargingStatus'));
        // Wait a moment for engine to stabilize
        await new Promise(r => setTimeout(r, 2000));
        const charging = await readVoltage();
        setResult(prev => ({ ...prev, chargingV: charging }));

        setStep('done');
        setIsRunning(false);
        setStatusText(t('battery.doneStatus'));
    };

    const resetTest = () => {
        setStep('idle');
        setResult({ restingV: null, crankingV: null, chargingV: null });
        setStatusText(t('battery.ready'));
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
        if (rest >= 12.6) verdicts.push(`✅ ${t('battery.verdicts.full')} (${rest.toFixed(1)}V)`);
        else if (rest >= 12.4) verdicts.push(`✅ ${t('battery.verdicts.good')} (${rest.toFixed(1)}V)`);
        else if (rest >= 12.0) verdicts.push(`⚠️ ${t('battery.verdicts.weak')} (${rest.toFixed(1)}V)`);
        else verdicts.push(`🚨 ${t('battery.verdicts.empty')} (${rest.toFixed(1)}V)`);

        // Cranking analysis
        if (crank >= 10.0) verdicts.push(`✅ ${t('battery.verdicts.crankNormal')} (${crank.toFixed(1)}V)`);
        else if (crank >= 9.0) verdicts.push(`⚠️ ${t('battery.verdicts.crankLow')} (${crank.toFixed(1)}V)`);
        else verdicts.push(`🚨 ${t('battery.verdicts.crankCritical')} (${crank.toFixed(1)}V)`);

        // Charging analysis
        if (charge >= 13.5 && charge <= 14.5) verdicts.push(`✅ ${t('battery.verdicts.regNormal')} (${charge.toFixed(1)}V)`);
        else if (charge >= 13.0 && charge < 13.5) verdicts.push(`⚠️ ${t('battery.verdicts.regLow')} (${charge.toFixed(1)}V)`);
        else if (charge > 14.5) verdicts.push(`⚠️ ${t('battery.verdicts.regHigh')} (${charge.toFixed(1)}V)`);
        else verdicts.push(`🚨 ${t('battery.verdicts.regFail')} (${charge.toFixed(1)}V)`);

        return verdicts;
    };

    const cardStyle = [ms.resultCard, { backgroundColor: colors.card, borderColor: colors.border }];
    const activeCardStyle = [ms.activeCard, { borderColor: colors.cyan, backgroundColor: `${colors.cyan}1A` }];

    return (
        <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onClose}>
            <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
                {/* Header */}
                <View style={{ paddingHorizontal: 20, paddingTop: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', height: 60, borderBottomWidth: 1, borderBottomColor: colors.border }}>
                    <Text style={{ color: colors.textPri, fontSize: 14, fontWeight: '800', fontFamily: MONO }}>{t('battery.title')}</Text>
                    <TouchableOpacity onPress={() => { resetTest(); onClose(); }} style={{ padding: 10 }}>
                        <Text style={{ color: colors.cyan, fontSize: 14, fontWeight: 'bold', fontFamily: MONO }}>{t('common.cancel').toUpperCase()}</Text>
                    </TouchableOpacity>
                </View>

                <View style={{ flex: 1, padding: 16 }}>
                    {/* Status */}
                    <View style={{ backgroundColor: colors.card, borderRadius: 6, padding: 16, borderWidth: 1, borderColor: colors.border, marginBottom: 12 }}>
                        <Text style={{ color: colors.amber, fontSize: 12, fontWeight: '800', fontFamily: MONO, textAlign: 'center' }}>
                            {statusText}
                        </Text>
                        {step === 'cranking' && (
                            <Text style={{ color: colors.red, fontSize: 20, fontWeight: '900', fontFamily: MONO, textAlign: 'center', marginTop: 8 }}>
                                ⚡ {result.crankingV || t('common.loading')}
                            </Text>
                        )}
                    </View>

                    {/* Test Results Grid */}
                    <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
                        <View style={[...cardStyle, step === 'resting' && activeCardStyle]}>
                            <Text style={[ms.resultLabel, { color: colors.textSec }]}>{t('battery.resting')}</Text>
                            <Text style={[ms.resultValue, { color: colors.textPri }]}>{result.restingV || '--'}</Text>
                            <Text style={[ms.resultRef, { color: colors.textSec }]}>Ref: 12.4-12.8V</Text>
                        </View>
                        <View style={[...cardStyle, step === 'cranking' && activeCardStyle]}>
                            <Text style={[ms.resultLabel, { color: colors.textSec }]}>{t('battery.cranking')}</Text>
                            <Text style={[ms.resultValue, { color: colors.amber }]}>{result.crankingV || '--'}</Text>
                            <Text style={[ms.resultRef, { color: colors.textSec }]}>Ref: ≥9.6V</Text>
                        </View>
                        <View style={[...cardStyle, step === 'charging' && activeCardStyle]}>
                            <Text style={[ms.resultLabel, { color: colors.textSec }]}>{t('battery.charging')}</Text>
                            <Text style={[ms.resultValue, { color: colors.green }]}>{result.chargingV || '--'}</Text>
                            <Text style={[ms.resultRef, { color: colors.textSec }]}>Ref: 13.5-14.5V</Text>
                        </View>
                    </View>

                    {/* Current Voltage */}
                    <View style={{ backgroundColor: colors.card, borderRadius: 6, padding: 12, borderWidth: 1, borderColor: colors.border, marginBottom: 12, alignItems: 'center' }}>
                        <Text style={{ color: colors.textSec, fontSize: 9, fontFamily: MONO }}>{t('battery.instantV')}</Text>
                        <Text style={{ color: colors.cyan, fontSize: 28, fontWeight: '900', fontFamily: MONO }}>{voltage || '--'}</Text>
                    </View>

                    {/* Verdict */}
                    {step === 'done' && getVerdict() && (
                        <View style={{ backgroundColor: colors.card, borderRadius: 6, padding: 14, borderWidth: 1, borderColor: colors.green, marginBottom: 12 }}>
                            <Text style={{ color: colors.textPri, fontSize: 12, fontWeight: '800', fontFamily: MONO, marginBottom: 8 }}>📋 {t('battery.evaluation')}</Text>
                            {getVerdict()!.map((v, i) => (
                                <Text key={i} style={{ color: colors.textPri, fontSize: 11, fontFamily: MONO, lineHeight: 20 }}>{v}</Text>
                            ))}
                        </View>
                    )}

                    {/* Actions */}
                    {step === 'idle' && (
                        <TouchableOpacity
                            style={{ backgroundColor: colors.cyan, borderRadius: 6, paddingVertical: 14, alignItems: 'center' }}
                            onPress={startTest}
                        >
                            <Text style={{ color: colors.card, fontSize: 13, fontWeight: '900', fontFamily: MONO }}>⚡ {t('battery.start')}</Text>
                        </TouchableOpacity>
                    )}
                    {step === 'done' && (
                        <TouchableOpacity
                            style={{ backgroundColor: colors.elevated, borderRadius: 6, paddingVertical: 14, alignItems: 'center', borderWidth: 1, borderColor: colors.border }}
                            onPress={resetTest}
                        >
                            <Text style={{ color: colors.textSec, fontSize: 13, fontWeight: '900', fontFamily: MONO }}>↺ {t('battery.retry')}</Text>
                        </TouchableOpacity>
                    )}
                    {isRunning && (
                        <ActivityIndicator size="small" color={colors.cyan} style={{ marginTop: 12 }} />
                    )}

                    {/* Instructions */}
                    <View style={{ backgroundColor: colors.card, borderRadius: 6, padding: 14, borderWidth: 1, borderColor: colors.border, marginTop: 12 }}>
                        <Text style={{ color: colors.textPri, fontSize: 11, fontWeight: '800', fontFamily: MONO, marginBottom: 6 }}>📖 {t('battery.procedure')}</Text>
                        <Text style={{ color: colors.textSec, fontSize: 10, fontFamily: MONO, lineHeight: 18 }}>
                            {t('battery.steps.1')}{'\n'}
                            {t('battery.steps.2')}{'\n'}
                            {t('battery.steps.3')}{'\n'}
                            {t('battery.steps.4')}{'\n\n'}
                            ⚠️ {t('battery.warning')}
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
        borderRadius: 6,
        padding: 12,
        alignItems: 'center',
        borderWidth: 1,
    },
    activeCard: {
        borderWidth: 1,
    },
    resultLabel: {
        fontSize: 9,
        fontWeight: '800',
        marginBottom: 4,
    },
    resultValue: {
        fontSize: 20,
        fontWeight: '900',
    },
    resultRef: {
        fontSize: 8,
        marginTop: 4,
    },
});

