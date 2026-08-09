import React, { useState } from 'react';
import { View, Text, Modal, StyleSheet, TouchableOpacity, ActivityIndicator, Alert, TextInput } from 'react-native';
import { useTranslation } from 'react-i18next';
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
    const { t } = useTranslation();
    const [loading, setLoading] = useState(false);
    const [isOfflineMode, setIsOfflineMode] = useState(false);
    const [offlineCode, setOfflineCode] = useState('');
    const [disclaimerAccepted, setDisclaimerAccepted] = useState(false);

    const handleCloudUnlock = async () => {
        if (!disclaimerAccepted) {
            Alert.alert(t('sgw.warning'), t('sgw.acceptWarning'));
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
                Alert.alert(t('sgw.success'), result.message);
                onUnlocked();
                onClose();
            } else {
                Alert.alert(t('sgw.error'), result.message);
            }
        } catch (error: any) {
            Alert.alert(t('sgw.tokenError'), error?.message || t('sgw.tokenErrorMsg'));
        } finally {
            setLoading(false);
        }
    };

    const handleOfflineUnlock = () => {
        if (!disclaimerAccepted) {
            Alert.alert(t('sgw.warning'), t('sgw.acceptWarning'));
            return;
        }

        const result = SgwBypassEngine.unlockOfflineFallback(vin, vendor, offlineCode);
        if (result.success) {
            Alert.alert(t('sgw.offlineActive'), result.message);
            onUnlocked();
            onClose();
        } else {
            Alert.alert(t('sgw.error'), result.message);
        }
    };

    return (
        <Modal visible={visible} transparent animationType="slide">
            <View style={styles.overlay}>
                <View style={styles.container}>
                    <Text style={styles.title}>{t('sgw.title')}</Text>
                    <Text style={styles.subtitle}>{t('sgw.subtitle', { vendor, vin: vin || 'Bilinmiyor' })}</Text>

                    <View style={styles.disclaimerBox}>
                        <Text style={styles.disclaimerTitle}>{t('sgw.disclaimerTitle')}</Text>
                        <Text style={styles.disclaimerText}>{t('sgw.disclaimerText')}</Text>
                        <TouchableOpacity
                            style={styles.checkboxContainer}
                            onPress={() => setDisclaimerAccepted(!disclaimerAccepted)}
                        >
                            <Text style={styles.checkboxText}>
                                {disclaimerAccepted ? t('sgw.checkboxAccepted') : t('sgw.checkboxUnaccepted')}
                            </Text>
                        </TouchableOpacity>
                    </View>

                    {isOfflineMode ? (
                        <View style={styles.offlineBox}>
                            <Text style={styles.label}>{t('sgw.offlineLabel')}</Text>
                            <TextInput
                                style={styles.input}
                                placeholder={t('sgw.offlinePlaceholder')}
                                placeholderTextColor="#666"
                                value={offlineCode}
                                onChangeText={setOfflineCode}
                            />
                            <TouchableOpacity style={styles.actionBtn} onPress={handleOfflineUnlock}>
                                <Text style={styles.actionBtnText}>{t('sgw.offlineUnlockBtn')}</Text>
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
                                <Text style={styles.actionBtnText}>{t('sgw.cloudUnlockBtn')}</Text>
                            )}
                        </TouchableOpacity>
                    )}

                    <TouchableOpacity 
                        style={styles.toggleOfflineBtn} 
                        onPress={() => setIsOfflineMode(!isOfflineMode)}
                    >
                        <Text style={styles.toggleOfflineText}>
                            {isOfflineMode ? t('sgw.toggleToCloud') : t('sgw.toggleToOffline')}
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
                        <Text style={styles.cancelBtnText}>{t('sgw.cancel')}</Text>
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
