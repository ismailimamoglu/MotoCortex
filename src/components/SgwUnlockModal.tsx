import React, { useState } from 'react';
import { View, Text, Modal, StyleSheet, TouchableOpacity, ActivityIndicator, Alert, TextInput } from 'react-native';
import { SgwBypassEngine, SgwVendor } from '../core/security/SgwBypassEngine';

interface SgwUnlockModalProps {
    visible: boolean;
    vin: string;
    vendor: SgwVendor;
    onClose: () => void;
    onUnlocked: () => void;
}

export const SgwUnlockModal: React.FC<SgwUnlockModalProps> = ({
    visible,
    vin,
    vendor,
    onClose,
    onUnlocked,
}) => {
    const [loading, setLoading] = useState(false);
    const [isOfflineMode, setIsOfflineMode] = useState(false);
    const [offlineCode, setOfflineCode] = useState('');
    const [disclaimerAccepted, setDisclaimerAccepted] = useState(false);

    const handleCloudUnlock = async () => {
        if (!disclaimerAccepted) {
            Alert.alert('Uyarı', 'Devam etmek için lütfen yasal uyarıyı onaylayın.');
            return;
        }

        setLoading(true);
        try {
            // Simulated cloud token payload generation via Supabase Edge Function
            const result = SgwBypassEngine.unlockWithToken({
                vin,
                vendor,
                challengeHex: '37A29F11',
                signedToken: `SIG_TOKEN_${Date.now()}_${vin.substring(0, 5)}`
            });

            if (result.success) {
                Alert.alert('Başarılı', result.message);
                onUnlocked();
                onClose();
            } else {
                Alert.alert('Hata', result.message);
            }
        } catch (error: any) {
            Alert.alert('Token Hatası', error?.message || 'SGW kilidi açılamadı.');
        } finally {
            setLoading(false);
        }
    };

    const handleOfflineUnlock = () => {
        if (!disclaimerAccepted) {
            Alert.alert('Uyarı', 'Devam etmek için lütfen yasal uyarıyı onaylayın.');
            return;
        }

        const result = SgwBypassEngine.unlockOfflineFallback(vin, vendor, offlineCode);
        if (result.success) {
            Alert.alert('Offline Bypass Aktif', result.message);
            onUnlocked();
            onClose();
        } else {
            Alert.alert('Hata', result.message);
        }
    };

    return (
        <Modal visible={visible} transparent animationType="slide">
            <View style={styles.overlay}>
                <View style={styles.container}>
                    <Text style={styles.title}>Security Gateway (SGW) Kilit Açma</Text>
                    <Text style={styles.subtitle}>Marka/Üretici: {vendor} | VIN: {vin || 'Bilinmiyor'}</Text>

                    <View style={styles.disclaimerBox}>
                        <Text style={styles.disclaimerTitle}>⚠️ Yasal Sorumluluk Reddi</Text>
                        <Text style={styles.disclaimerText}>
                            SGW kilidinin açılması araç beyinlerine (ECU) yazma erişimi sağlar. 
                            Yetkisiz kodlama veya hatalı parametre değiştirme işlemleri garantiyi etkileyebilir 
                            veya güvenlik sistemlerini devre dışı bırakabilir. Sorumluluk kullanıcıya aittir.
                        </Text>
                        <TouchableOpacity
                            style={styles.checkboxContainer}
                            onPress={() => setDisclaimerAccepted(!disclaimerAccepted)}
                        >
                            <Text style={styles.checkboxText}>
                                {disclaimerAccepted ? '☑️ Sorumluluk uyarısını kabul ediyorum' : '☐ Sorumluluk uyarısını kabul ediyorum'}
                            </Text>
                        </TouchableOpacity>
                    </View>

                    {isOfflineMode ? (
                        <View style={styles.offlineBox}>
                            <Text style={styles.label}>Saha Teknisyeni Offline Bypass Kodu:</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="Örn: OFF_89A2BF10"
                                placeholderTextColor="#666"
                                value={offlineCode}
                                onChangeText={setOfflineCode}
                            />
                            <TouchableOpacity style={styles.actionBtn} onPress={handleOfflineUnlock}>
                                <Text style={styles.actionBtnText}>Offline Kilidi Aç (15dk)</Text>
                            </TouchableOpacity>
                        </View>
                    ) : (
                        <TouchableOpacity 
                            style={[styles.actionBtn, loading && styles.disabledBtn]} 
                            onPress={handleCloudUnlock}
                            disabled={loading}
                        >
                            {loading ? (
                                <ActivityIndicator color="#FFF" />
                            ) : (
                                <Text style={styles.actionBtnText}>Bulut Token ile Kilidi Aç (60dk)</Text>
                            )}
                        </TouchableOpacity>
                    )}

                    <TouchableOpacity 
                        style={styles.toggleOfflineBtn} 
                        onPress={() => setIsOfflineMode(!isOfflineMode)}
                    >
                        <Text style={styles.toggleOfflineText}>
                            {isOfflineMode ? '← Bulut Doğrulamasına Dön' : '⚡ Offline Saha Bypass Modu'}
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
                        <Text style={styles.cancelBtnText}>İptal</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center' },
    container: { width: '90%', backgroundColor: '#1E1E2C', borderRadius: 16, padding: 20, borderWidth: 1, borderColor: '#333' },
    title: { color: '#FFF', fontSize: 18, fontWeight: 'bold', textAlign: 'center' },
    subtitle: { color: '#8E8E93', fontSize: 13, textAlign: 'center', marginTop: 4, marginBottom: 16 },
    disclaimerBox: { backgroundColor: '#2C2C3E', padding: 12, borderRadius: 8, marginBottom: 16 },
    disclaimerTitle: { color: '#FF9500', fontWeight: 'bold', fontSize: 14, marginBottom: 4 },
    disclaimerText: { color: '#CCC', fontSize: 12, lineHeight: 16 },
    checkboxContainer: { marginTop: 10, paddingVertical: 4 },
    checkboxText: { color: '#34C759', fontSize: 12, fontWeight: '600' },
    actionBtn: { backgroundColor: '#007AFF', padding: 14, borderRadius: 10, alignItems: 'center', marginTop: 8 },
    disabledBtn: { opacity: 0.6 },
    actionBtnText: { color: '#FFF', fontWeight: 'bold', fontSize: 14 },
    toggleOfflineBtn: { marginTop: 12, alignItems: 'center' },
    toggleOfflineText: { color: '#5AC8FA', fontSize: 12 },
    cancelBtn: { marginTop: 12, padding: 10, alignItems: 'center' },
    cancelBtnText: { color: '#FF3B30', fontSize: 14 },
    offlineBox: { marginTop: 8 },
    label: { color: '#AAA', fontSize: 12, marginBottom: 4 },
    input: { backgroundColor: '#12121A', color: '#FFF', padding: 10, borderRadius: 8, marginBottom: 8, borderWidth: 1, borderColor: '#444' },
});
