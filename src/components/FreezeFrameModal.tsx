import React, { useState } from 'react';
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
    const [isLoading, setIsLoading] = useState(false);
    const [data, setData] = useState<FreezeData | null>(null);
    const [error, setError] = useState<string | null>(null);

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
                setError('Dondurulmuş veri bulunamadı. Araç bu özelliği desteklemiyor olabilir.');
            } else {
                setData({ rpm: rpmVal, speed: speedVal, coolant: coolVal });
            }
        } catch (e) {
            setError('Veri okuma hatası: ' + (e instanceof Error ? e.message : String(e)));
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
            <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }}>
                {/* Header */}
                <View style={ms.header}>
                    <Text style={ms.headerTitle}>FREEZE FRAME</Text>
                    <TouchableOpacity onPress={() => { resetState(); onClose(); }} style={{ padding: 10 }}>
                        <Text style={{ color: C.cyan, fontSize: 14, fontWeight: 'bold', fontFamily: C.mono }}>KAPAT</Text>
                    </TouchableOpacity>
                </View>

                <View style={{ flex: 1, padding: 16 }}>
                    {/* Description */}
                    <View style={ms.infoPanel}>
                        <Text style={ms.infoTitle}>❄️ ARIZA ANI HAFIZASI</Text>
                        <Text style={ms.infoDesc}>
                            Check Engine ışığı yandığı andaki motor parametrelerini okur.
                            Bu veriler arıza teşhisinde kritik bilgi sağlar.
                        </Text>
                    </View>

                    {!hasDtcs && !data && (
                        <View style={[ms.infoPanel, { borderColor: C.amber }]}>
                            <Text style={{ color: C.amber, fontSize: 11, fontFamily: C.mono, textAlign: 'center' }}>
                                ⚠️ Kayıtlı arıza kodu yok. Freeze Frame verisi olmayabilir.
                            </Text>
                        </View>
                    )}

                    {/* Action Button */}
                    {!data && !isLoading && (
                        <TouchableOpacity
                            style={ms.actionBtn}
                            onPress={fetchFreezeFrame}
                        >
                            <Text style={ms.actionBtnText}>❄️ DONDURULMUŞ VERİYİ OKU</Text>
                        </TouchableOpacity>
                    )}

                    {/* Loading */}
                    {isLoading && (
                        <View style={{ alignItems: 'center', marginTop: 20 }}>
                            <ActivityIndicator size="large" color={C.cyan} />
                            <Text style={{ color: C.textSec, fontSize: 11, fontFamily: C.mono, marginTop: 8 }}>
                                Mode 02 sorgulanıyor...
                            </Text>
                        </View>
                    )}

                    {/* Error */}
                    {error && (
                        <View style={[ms.infoPanel, { borderColor: C.red }]}>
                            <Text style={{ color: C.red, fontSize: 11, fontFamily: C.mono, textAlign: 'center' }}>{error}</Text>
                        </View>
                    )}

                    {/* Results */}
                    {data && (
                        <View style={{ marginTop: 8 }}>
                            <Text style={{ color: C.textPri, fontSize: 12, fontWeight: '800', fontFamily: C.mono, marginBottom: 12, textAlign: 'center' }}>
                                📸 ARIZA ANINDA KAYDEDILEN DEĞERLER
                            </Text>

                            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>
                                <View style={ms.resultCard}>
                                    <Text style={ms.resultLabel}>DEVİR</Text>
                                    <Text style={ms.resultValue}>{data.rpm !== null ? data.rpm : '--'}</Text>
                                    <Text style={ms.resultUnit}>RPM</Text>
                                </View>
                                <View style={ms.resultCard}>
                                    <Text style={ms.resultLabel}>HIZ</Text>
                                    <Text style={ms.resultValue}>{data.speed !== null ? data.speed : '--'}</Text>
                                    <Text style={ms.resultUnit}>KM/H</Text>
                                </View>
                                <View style={ms.resultCard}>
                                    <Text style={ms.resultLabel}>SICAKLIK</Text>
                                    <Text style={[ms.resultValue, data.coolant !== null && data.coolant > 100 ? { color: C.red } : {}]}>
                                        {data.coolant !== null ? data.coolant : '--'}
                                    </Text>
                                    <Text style={ms.resultUnit}>°C</Text>
                                </View>
                            </View>

                            <TouchableOpacity
                                style={[ms.actionBtn, { backgroundColor: C.elevated, borderWidth: 1, borderColor: C.border }]}
                                onPress={() => { resetState(); }}
                            >
                                <Text style={[ms.actionBtnText, { color: C.textSec }]}>↺ TEKRAR OKU</Text>
                            </TouchableOpacity>
                        </View>
                    )}

                    {/* Info */}
                    <View style={[ms.infoPanel, { marginTop: 16 }]}>
                        <Text style={ms.infoTitle}>📖 TEKNİK BİLGİ</Text>
                        <Text style={ms.infoDesc}>
                            • OBD-II Mode 02: Freeze Frame Data{'\n'}
                            • PID 020C00: Arıza anı RPM{'\n'}
                            • PID 020D00: Arıza anı hız{'\n'}
                            • PID 020500: Arıza anı soğutma suyu sıcaklığı{'\n\n'}
                            Bu veriler son arıza koduna aittir. Arıza kodları silinince
                            freeze frame verileri de temizlenir.
                        </Text>
                    </View>
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
        borderBottomColor: '#1e2430',
    },
    headerTitle: {
        color: '#e8eaed',
        fontSize: 14,
        fontWeight: '800',
        fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    },
    infoPanel: {
        backgroundColor: '#111318',
        borderRadius: 6,
        padding: 14,
        borderWidth: 1,
        borderColor: '#1e2430',
        marginBottom: 12,
    },
    infoTitle: {
        color: '#00d4ff',
        fontSize: 12,
        fontWeight: '800',
        fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
        marginBottom: 6,
    },
    infoDesc: {
        color: '#6b7280',
        fontSize: 10,
        fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
        lineHeight: 16,
    },
    actionBtn: {
        backgroundColor: '#00d4ff',
        borderRadius: 6,
        paddingVertical: 14,
        alignItems: 'center',
        marginBottom: 8,
    },
    actionBtnText: {
        color: '#000',
        fontSize: 13,
        fontWeight: '900',
        fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    },
    resultCard: {
        flex: 1,
        backgroundColor: '#111318',
        borderRadius: 6,
        padding: 14,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#1e2430',
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
        fontSize: 22,
        fontWeight: '900',
        fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    },
    resultUnit: {
        color: '#6b7280',
        fontSize: 9,
        fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
        marginTop: 4,
    },
});
