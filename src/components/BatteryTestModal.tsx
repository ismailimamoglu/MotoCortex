import React, { useState, useRef, useCallback } from 'react';
import { View, Text, TouchableOpacity, Modal, ScrollView, StyleSheet, Platform, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useThemeColors } from '../theme';
import { useResponsive } from '../hooks/useResponsive';
import { useAppStore } from '../store/useAppStore';

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
    const { s: scaleWidth, vs: scaleHeight, ms: scaleMod, fs: scaleFont, isTablet, isLargeTablet } = useResponsive();
    const insets = useSafeAreaInsets();
    
    const [step, setStep] = useState<TestStep>('idle');
    const [result, setResult] = useState<BatteryTestResult>({ restingV: null, crankingV: null, chargingV: null });
    const [isRunning, setIsRunning] = useState(false);
    const [statusKey, setStatusKey] = useState('battery.ready');
    const crankingIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const lowestVRef = useRef<number>(999);

    const MONO = Platform.OS === 'ios' ? 'System' : 'sans-serif';

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
        setStatusKey('battery.restingStatus');
        const resting = await readVoltage();
        setResult(prev => ({ ...prev, restingV: resting }));

        if (!resting) {
            setStatusKey('battery.voltageError');
            setIsRunning(false);
            setStep('idle');
            return;
        }

        // ── Step 2: Cranking Voltage ──
        setStep('cranking');
        setStatusKey('battery.crankingStatus');

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
        setStatusKey('battery.chargingStatus');
        await new Promise(r => setTimeout(r, 2000));
        const charging = await readVoltage();
        setResult(prev => ({ ...prev, chargingV: charging }));

        setStep('done');
        setIsRunning(false);
        setStatusKey('battery.doneStatus');
    };

    const resetTest = () => {
        setStep('idle');
        setResult({ restingV: null, crankingV: null, chargingV: null });
        setStatusKey('battery.ready');
        setIsRunning(false);
        if (crankingIntervalRef.current) clearInterval(crankingIntervalRef.current);
    };

    const getVerdict = () => {
        const isPro = useAppStore.getState().isPro;
        if (!isPro) {
            return [`🔒 PRO Required - ${t('battery.verdictLocked', 'Detaylı akü değerlendirme raporu ve marş analizi grafik motoru için PRO paketine yükseltin.')}`];
        }

        if (!result.restingV || !result.chargingV) return null;
        const rest = parseFloat(result.restingV.replace('V', ''));
        const crank = result.crankingV ? parseFloat(result.crankingV.replace('V', '')) : rest;
        const charge = parseFloat(result.chargingV.replace('V', ''));

        const verdicts: string[] = [];

        if (rest >= 12.6) verdicts.push(`✅ ${t('battery.verdicts.full')} (${rest.toFixed(1)}V)`);
        else if (rest >= 12.4) verdicts.push(`✅ ${t('battery.verdicts.good')} (${rest.toFixed(1)}V)`);
        else if (rest >= 12.0) verdicts.push(`⚠️ ${t('battery.verdicts.weak')} (${rest.toFixed(1)}V)`);
        else verdicts.push(`🚨 ${t('battery.verdicts.empty')} (${rest.toFixed(1)}V)`);

        if (crank >= 10.0) verdicts.push(`✅ ${t('battery.verdicts.crankNormal')} (${crank.toFixed(1)}V)`);
        else if (crank >= 9.0) verdicts.push(`⚠️ ${t('battery.verdicts.crankLow')} (${crank.toFixed(1)}V)`);
        else verdicts.push(`🚨 ${t('battery.verdicts.crankCritical')} (${crank.toFixed(1)}V)`);

        if (charge >= 13.5 && charge <= 14.5) verdicts.push(`✅ ${t('battery.verdicts.regNormal')} (${charge.toFixed(1)}V)`);
        else if (charge >= 13.0 && charge < 13.5) verdicts.push(`⚠️ ${t('battery.verdicts.regLow')} (${charge.toFixed(1)}V)`);
        else if (charge > 14.5) verdicts.push(`⚠️ ${t('battery.verdicts.regHigh')} (${charge.toFixed(1)}V)`);
        else verdicts.push(`🚨 ${t('battery.verdicts.regFail')} (${charge.toFixed(1)}V)`);

        return verdicts;
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
            statusCard: {
                borderRadius: scaleMod(8),
                padding: scaleMod(12),
                borderWidth: 1,
                marginBottom: scaleHeight(10),
            },
            statusText: {
                fontSize: scaleFont(12),
                fontWeight: '800' as const,
                fontFamily: MONO,
                textAlign: 'center' as const,
            },
            crankingVal: {
                fontSize: scaleFont(18),
                fontWeight: '900' as const,
                fontFamily: MONO,
                textAlign: 'center' as const,
                marginTop: scaleHeight(6),
            },
            gridRow: {
                flexDirection: 'row' as const,
                gap: scaleMod(8),
                marginBottom: scaleHeight(10),
            },
            resultCard: {
                flex: 1,
                borderRadius: scaleMod(8),
                padding: scaleMod(10),
                alignItems: 'center' as const,
                borderWidth: 1,
            },
            resultLabel: {
                fontSize: scaleFont(9),
                fontWeight: '800' as const,
                marginBottom: scaleHeight(4),
            },
            resultValue: {
                fontSize: scaleFont(18),
                fontWeight: '900' as const,
            },
            resultRef: {
                fontSize: scaleFont(8),
                marginTop: scaleHeight(4),
            },
            instantVCard: {
                borderRadius: scaleMod(8),
                padding: scaleMod(10),
                borderWidth: 1,
                marginBottom: scaleHeight(10),
                alignItems: 'center' as const,
            },
            instantVLabel: {
                fontSize: scaleFont(9),
                fontFamily: MONO,
            },
            instantVVal: {
                fontSize: scaleFont(26),
                fontWeight: '900' as const,
                fontFamily: MONO,
            },
            verdictCard: {
                borderRadius: scaleMod(8),
                padding: scaleMod(12),
                borderWidth: 1,
                marginBottom: scaleHeight(10),
            },
            verdictTitle: {
                fontSize: scaleFont(12),
                fontWeight: '800' as const,
                fontFamily: MONO,
                marginBottom: scaleHeight(6),
            },
            verdictText: {
                fontSize: scaleFont(11),
                fontFamily: MONO,
                lineHeight: scaleFont(16),
            },
            actionBtn: {
                borderRadius: scaleMod(8),
                paddingVertical: scaleHeight(12),
                alignItems: 'center' as const,
            },
            actionBtnText: {
                fontSize: scaleFont(13),
                fontWeight: '900' as const,
                fontFamily: MONO,
            },
            instructionCard: {
                borderRadius: scaleMod(8),
                padding: scaleMod(12),
                borderWidth: 1,
                marginTop: scaleHeight(10),
            },
            instructionTitle: {
                fontSize: scaleFont(11),
                fontWeight: '800' as const,
                fontFamily: MONO,
                marginBottom: scaleHeight(4),
            },
            instructionText: {
                fontSize: scaleFont(10),
                fontFamily: MONO,
                lineHeight: scaleFont(15),
            }
        };
    }, [scaleWidth, scaleHeight, scaleMod, scaleFont, isTablet, isLargeTablet, colors, insets.top, insets.bottom]) as any;

    const cardStyle = [sDyn.resultCard, { backgroundColor: colors.card, borderColor: colors.border }];
    const activeCardStyle = { borderColor: colors.cyan, backgroundColor: `${colors.cyan}1A` };

    return (
        <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={onClose}>
            <View style={sDyn.modalOverlay}>
                <View style={[sDyn.modalContainer, { backgroundColor: colors.bg }]}>
                    {/* Header */}
                    <View style={[sDyn.header, { borderBottomColor: colors.border }]}>
                        <Text style={[sDyn.headerTitle, { color: colors.textPri }]}>{t('battery.title')}</Text>
                        <TouchableOpacity onPress={() => { resetTest(); onClose(); }} style={sDyn.cancelBtn}>
                            <Text style={[sDyn.cancelText, { color: colors.cyan }]}>{t('common.cancel').toUpperCase()}</Text>
                        </TouchableOpacity>
                    </View>

                    <ScrollView style={sDyn.content}>
                        {/* Status */}
                        <View style={[sDyn.statusCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                            <Text style={[sDyn.statusText, { color: colors.amber }]}>
                                {t(statusKey)}
                            </Text>
                            {step === 'cranking' && (
                                <Text style={[sDyn.crankingVal, { color: colors.red }]}>
                                    ⚡ {result.crankingV || t('common.loading')}
                                </Text>
                            )}
                        </View>

                        {/* Test Results Grid */}
                        <View style={sDyn.gridRow}>
                            <View style={[...cardStyle, step === 'resting' && activeCardStyle]}>
                                <Text style={[sDyn.resultLabel, { color: colors.textSec }]}>{t('battery.resting')}</Text>
                                <Text style={[sDyn.resultValue, { color: colors.textPri }]}>{result.restingV || '--'}</Text>
                                <Text style={[sDyn.resultRef, { color: colors.textSec }]}>Ref: 12.4-12.8V</Text>
                            </View>
                            <View style={[...cardStyle, step === 'cranking' && activeCardStyle]}>
                                <Text style={[sDyn.resultLabel, { color: colors.textSec }]}>{t('battery.cranking')}</Text>
                                <Text style={[sDyn.resultValue, { color: colors.amber }]}>{result.crankingV || '--'}</Text>
                                <Text style={[sDyn.resultRef, { color: colors.textSec }]}>Ref: ≥9.6V</Text>
                            </View>
                            <View style={[...cardStyle, step === 'charging' && activeCardStyle]}>
                                <Text style={[sDyn.resultLabel, { color: colors.textSec }]}>{t('battery.charging')}</Text>
                                <Text style={[sDyn.resultValue, { color: colors.green }]}>{result.chargingV || '--'}</Text>
                                <Text style={[sDyn.resultRef, { color: colors.textSec }]}>Ref: 13.5-14.5V</Text>
                            </View>
                        </View>

                        {/* Current Voltage */}
                        <View style={[sDyn.instantVCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                            <Text style={[sDyn.instantVLabel, { color: colors.textSec }]}>{t('battery.instantV')}</Text>
                            <Text style={[sDyn.instantVVal, { color: colors.cyan }]}>{voltage || '--'}</Text>
                        </View>

                        {/* Verdict */}
                        {step === 'done' && getVerdict() && (
                            <View style={[sDyn.verdictCard, { backgroundColor: colors.card, borderColor: colors.green }]}>
                                <Text style={[sDyn.verdictTitle, { color: colors.textPri }]}>📋 {t('battery.evaluation')}</Text>
                                {getVerdict()!.map((v, i) => (
                                    <Text key={i} style={[sDyn.verdictText, { color: colors.textPri }]}>{v}</Text>
                                ))}
                            </View>
                        )}

                        {/* Actions */}
                        {step === 'idle' && (
                            <TouchableOpacity
                                style={[sDyn.actionBtn, { backgroundColor: colors.cyan }]}
                                onPress={startTest}
                            >
                                <Text style={[sDyn.actionBtnText, { color: colors.card }]}>⚡ {t('battery.start')}</Text>
                            </TouchableOpacity>
                        )}
                        {step === 'done' && (
                            <TouchableOpacity
                                style={[sDyn.actionBtn, { backgroundColor: colors.elevated, borderWidth: 1, borderColor: colors.border }]}
                                onPress={resetTest}
                            >
                                <Text style={[sDyn.actionBtnText, { color: colors.textSec }]}>↺ {t('battery.retry')}</Text>
                            </TouchableOpacity>
                        )}
                        {isRunning && (
                            <ActivityIndicator size="small" color={colors.cyan} style={{ marginTop: scaleHeight(8) }} />
                        )}

                        {/* Instructions */}
                        <View style={[sDyn.instructionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                            <Text style={[sDyn.instructionTitle, { color: colors.textPri }]}>📖 {t('battery.procedure')}</Text>
                            <Text style={[sDyn.instructionText, { color: colors.textSec }]}>
                                {t('battery.steps.1')}{'\n'}
                                {t('battery.steps.2')}{'\n'}
                                {t('battery.steps.3')}{'\n'}
                                {t('battery.steps.4')}{'\n\n'}
                                ⚠️ {t('battery.warning')}
                            </Text>
                        </View>
                    </ScrollView>
                </View>
            </View>
        </Modal>
    );
}
