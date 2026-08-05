import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Switch, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { PrivacyService } from '../services/PrivacyService';

interface PrivacySettingsScreenProps {
    onBack?: () => void;
}

export const PrivacySettingsScreen: React.FC<PrivacySettingsScreenProps> = ({ onBack }) => {
    const [analyticsConsent, setAnalyticsConsent] = useState(true);
    const [crashConsent, setCrashConsent] = useState(true);
    const [loading, setLoading] = useState(false);

    const handleExport = async () => {
        setLoading(true);
        try {
            const exportPkg = await PrivacyService.exportUserData();
            Alert.alert(
                'Verileriniz Hazır (GDPR / KVKK)',
                `Veri Paketiniz ${exportPkg.exportDate} tarihinde başarıyla oluşturuldu.\n\nİçerik: Telemetri kuyruğu (${exportPkg.data.telemetryRecordsCount} kayıt), Uygulama ayarları.`
            );
        } catch (e: any) {
            Alert.alert('Hata', 'Veri paketi oluşturulamadı.');
        } finally {
            setLoading(false);
        }
    };

    const handlePurge = () => {
        Alert.alert(
            '⚠️ Tüm Verileri Sil (Unutulma Hakkı)',
            'Yerel cihazdaki ve buluttaki tüm araç tarama kayıtlarınız kalıcı olarak silinecektir. Bu işlem geri alınamaz.',
            [
                { text: 'İptal', style: 'cancel' },
                {
                    text: 'Kalıcı Olarak Sil',
                    style: 'destructive',
                    onPress: async () => {
                        setLoading(true);
                        try {
                            const res = await PrivacyService.purgeUserData();
                            Alert.alert('Tamamlandı', `Verileriniz kalıcı olarak silindi: ${res.purgedItems.join(', ')}`);
                        } catch (e: any) {
                            Alert.alert('Hata', 'Veri silme işlemi başarısız.');
                        } finally {
                            setLoading(false);
                        }
                    },
                },
            ]
        );
    };

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.content}>
            {onBack && (
                <TouchableOpacity style={styles.backBtn} onPress={onBack}>
                    <Text style={styles.backBtnText}>← Geri</Text>
                </TouchableOpacity>
            )}

            <Text style={styles.title}>🔒 Veri Gizliliği ve KVKK / GDPR</Text>
            <Text style={styles.subtitle}>Kişisel verilerinizin işlenmesi ve veri haklarınızın kontrolü.</Text>

            <View style={styles.card}>
                <Text style={styles.cardTitle}>Veri Toplama İzinleri</Text>
                <View style={styles.switchRow}>
                    <View style={styles.switchTextCol}>
                        <Text style={styles.switchLabel}>Anonim Telemetri ve Analitik</Text>
                        <Text style={styles.switchSub}>Uygulama performansını iyileştirmek için kullanılır.</Text>
                    </View>
                    <Switch value={analyticsConsent} onValueChange={setAnalyticsConsent} />
                </View>

                <View style={[styles.switchRow, { borderBottomWidth: 0 }]}>
                    <View style={styles.switchTextCol}>
                        <Text style={styles.switchLabel}>Otomatik Çökme Raporları</Text>
                        <Text style={styles.switchSub}>Olası hataların tespiti için anonim log gönderir.</Text>
                    </View>
                    <Switch value={crashConsent} onValueChange={setCrashConsent} />
                </View>
            </View>

            <View style={styles.card}>
                <Text style={styles.cardTitle}>GDPR & KVKK Veri Hakları</Text>
                
                <TouchableOpacity style={styles.btnSecondary} onPress={handleExport} disabled={loading}>
                    <Text style={styles.btnSecondaryText}>📥 Verilerimi İndir / Dışa Aktar (JSON/PDF)</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.btnDanger} onPress={handlePurge} disabled={loading}>
                    <Text style={styles.btnDangerText}>🗑️ Tüm Verilerimi Sil (Unutulma Hakkı)</Text>
                </TouchableOpacity>
            </View>

            {loading && (
                <View style={styles.loadingOverlay}>
                    <ActivityIndicator color="#007AFF" size="large" />
                </View>
            )}
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#0F0F1A' },
    content: { padding: 16 },
    backBtn: { marginBottom: 12 },
    backBtnText: { color: '#5AC8FA', fontSize: 16 },
    title: { color: '#FFF', fontSize: 20, fontWeight: 'bold' },
    subtitle: { color: '#8E8E93', fontSize: 13, marginBottom: 16, marginTop: 4 },
    card: { backgroundColor: '#1C1C2E', padding: 16, borderRadius: 12, marginBottom: 16 },
    cardTitle: { color: '#AAA', fontSize: 14, fontWeight: '600', marginBottom: 12 },
    switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#2C2C3E' },
    switchTextCol: { flex: 1, paddingRight: 10 },
    switchLabel: { color: '#FFF', fontSize: 14, fontWeight: '500' },
    switchSub: { color: '#8E8E93', fontSize: 11, marginTop: 2 },
    btnSecondary: { backgroundColor: '#2C2C3E', padding: 14, borderRadius: 10, alignItems: 'center', marginBottom: 10 },
    btnSecondaryText: { color: '#5AC8FA', fontWeight: 'bold', fontSize: 13 },
    btnDanger: { backgroundColor: 'rgba(255, 59, 48, 0.15)', borderWidth: 1, borderColor: '#FF3B30', padding: 14, borderRadius: 10, alignItems: 'center' },
    btnDangerText: { color: '#FF3B30', fontWeight: 'bold', fontSize: 13 },
    loadingOverlay: { marginTop: 20, alignItems: 'center' },
});
