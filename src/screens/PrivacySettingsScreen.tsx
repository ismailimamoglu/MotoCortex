import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Switch, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { useTranslation } from 'react-i18next';
import { PrivacyService } from '../services/PrivacyService';

interface PrivacySettingsScreenProps {
    onBack?: () => void;
}

export const PrivacySettingsScreen: React.FC<PrivacySettingsScreenProps> = ({ onBack }) => {
    const { t } = useTranslation();
    const [analyticsConsent, setAnalyticsConsent] = useState(true);
    const [crashConsent, setCrashConsent] = useState(true);
    const [loading, setLoading] = useState(false);

    const handleExport = async () => {
        setLoading(true);
        try {
            const exportPkg = await PrivacyService.exportUserData();
            Alert.alert(
                t('privacy.exportSuccessTitle'),
                t('privacy.exportSuccessMsg', { date: exportPkg.exportDate, count: exportPkg.data.telemetryRecordsCount })
            );
        } catch (e: any) {
            Alert.alert(t('privacy.exportErrorTitle'), t('privacy.exportErrorMsg'));
        } finally {
            setLoading(false);
        }
    };

    const handlePurge = () => {
        Alert.alert(
            t('privacy.purgeAlertTitle'),
            t('privacy.purgeAlertMsg'),
            [
                { text: t('privacy.cancel'), style: 'cancel' },
                {
                    text: t('privacy.confirmDelete'),
                    style: 'destructive',
                    onPress: async () => {
                        setLoading(true);
                        try {
                            const res = await PrivacyService.purgeUserData();
                            Alert.alert(t('privacy.purgeDoneTitle'), t('privacy.purgeDoneMsg', { items: res.purgedItems.join(', ') }));
                        } catch (e: any) {
                            Alert.alert(t('privacy.purgeErrorTitle'), t('privacy.purgeErrorMsg'));
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
                    <Text style={styles.backBtnText}>{t('privacy.back')}</Text>
                </TouchableOpacity>
            )}

            <Text style={styles.title}>{t('privacy.title')}</Text>
            <Text style={styles.subtitle}>{t('privacy.subtitle')}</Text>

            <View style={styles.card}>
                <Text style={styles.cardTitle}>{t('privacy.permissionsTitle')}</Text>
                <View style={styles.switchRow}>
                    <View style={styles.switchTextCol}>
                        <Text style={styles.switchLabel}>{t('privacy.telemetryLabel')}</Text>
                        <Text style={styles.switchSub}>{t('privacy.telemetrySub')}</Text>
                    </View>
                    <Switch value={analyticsConsent} onValueChange={setAnalyticsConsent} />
                </View>

                <View style={[styles.switchRow, { borderBottomWidth: 0 }]}>
                    <View style={styles.switchTextCol}>
                        <Text style={styles.switchLabel}>{t('privacy.crashLabel')}</Text>
                        <Text style={styles.switchSub}>{t('privacy.crashSub')}</Text>
                    </View>
                    <Switch value={crashConsent} onValueChange={setCrashConsent} />
                </View>
            </View>

            <View style={styles.card}>
                <Text style={styles.cardTitle}>{t('privacy.rightsTitle')}</Text>
                
                <TouchableOpacity style={styles.btnSecondary} onPress={handleExport} disabled={loading}>
                    <Text style={styles.btnSecondaryText}>{t('privacy.downloadBtn')}</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.btnDanger} onPress={handlePurge} disabled={loading}>
                    <Text style={styles.btnDangerText}>{t('privacy.purgeBtn')}</Text>
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
