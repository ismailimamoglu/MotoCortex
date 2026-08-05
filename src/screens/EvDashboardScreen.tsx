import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { EvDiagnosticSuite, EvDiagnosticReport } from '../core/ev/EvDiagnosticSuite';
import { EvBatteryPassport, EvBatteryPassportData } from '../core/ev/EvBatteryPassport';

interface EvDashboardScreenProps {
    vin?: string;
    onBack?: () => void;
}

export const EvDashboardScreen: React.FC<EvDashboardScreenProps> = ({
    vin = 'WF0XXXTTMHK12345',
    onBack,
}) => {
    const [report, setReport] = useState<EvDiagnosticReport | null>(null);
    const [passport, setPassport] = useState<EvBatteryPassportData | null>(null);

    useEffect(() => {
        // Run initial telemetry analysis
        const rawVoltages = [3.72, 3.71, 3.73, 3.70, 3.72, 3.69, 3.71, 3.72];
        const rep = EvDiagnosticSuite.analyzeBmsTelemetry(355.2, 12.4, rawVoltages, 620);
        setReport(rep);

        const pass = EvBatteryPassport.generatePassport(vin, rep.sohPercentage, 77.4, 310, rep.isolationResistanceKohm);
        setPassport(pass);
    }, [vin]);

    if (!report || !passport) {
        return (
            <View style={styles.center}>
                <Text style={styles.loadingText}>EV Teşhis Verileri Yükleniyor...</Text>
            </View>
        );
    }

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.content}>
            {onBack && (
                <TouchableOpacity style={styles.backBtn} onPress={onBack}>
                    <Text style={styles.backBtnText}>← Geri</Text>
                </TouchableOpacity>
            )}

            <Text style={styles.headerTitle}>⚡ EV & Batarya Teşhis Paneli</Text>
            <Text style={styles.subtitle}>VIN: {vin}</Text>

            {/* Health Score Overview */}
            <View style={styles.card}>
                <Text style={styles.cardTitle}>Batarya Sağlık Durumu (SOH)</Text>
                <View style={styles.row}>
                    <Text style={styles.bigScore}>{report.sohPercentage}%</Text>
                    <View style={[styles.badge, report.healthStatus === 'OPTIMAL' ? styles.badgeGreen : styles.badgeOrange]}>
                        <Text style={styles.badgeText}>{report.healthStatus}</Text>
                    </View>
                </View>
                <Text style={styles.infoText}>Şarj Durumu (SoC): {report.socPercentage}% | Paket Voltajı: {report.packVoltageV} V</Text>
            </View>

            {/* Insulation & Thermal */}
            <View style={styles.card}>
                <Text style={styles.cardTitle}>İzolasyon ve Termal Güvenlik</Text>
                <View style={styles.grid}>
                    <View style={styles.gridItem}>
                        <Text style={styles.gridLabel}>İzolasyon Direnci</Text>
                        <Text style={styles.gridVal}>{report.isolationResistanceKohm} kΩ</Text>
                    </View>
                    <View style={styles.gridItem}>
                        <Text style={styles.gridLabel}>Hücre Voltaj Farkı</Text>
                        <Text style={styles.gridVal}>{report.cellDeltaVoltageMv} mV</Text>
                    </View>
                    <View style={styles.gridItem}>
                        <Text style={styles.gridLabel}>Max Hücre Sıcaklığı</Text>
                        <Text style={styles.gridVal}>{report.maxCellTempC} °C</Text>
                    </View>
                    <View style={styles.gridItem}>
                        <Text style={styles.gridLabel}>Min Hücre Sıcaklığı</Text>
                        <Text style={styles.gridVal}>{report.minCellTempC} °C</Text>
                    </View>
                </View>
            </View>

            {/* Cell Voltages */}
            <View style={styles.card}>
                <Text style={styles.cardTitle}>Hücre Voltaj Dağılımı</Text>
                {report.cells.map((cell) => (
                    <View key={cell.cellId} style={styles.cellRow}>
                        <Text style={styles.cellLabel}>Hücre #{cell.cellId}</Text>
                        <Text style={styles.cellVal}>{cell.voltageV} V</Text>
                        {cell.isDeviationHigh && <Text style={styles.warnText}>⚠️ Sapma Var</Text>}
                    </View>
                ))}
            </View>

            {/* EU Battery Passport */}
            <View style={[styles.card, styles.passportCard]}>
                <Text style={styles.passportTitle}>🇪🇺 AB Dijital Batarya Pasaportu</Text>
                <Text style={styles.passportId}>Pasaport ID: {passport.passportId}</Text>
                <Text style={styles.passportText}>Nominal Kapasite: {passport.nominalCapacityKwh} kWh</Text>
                <Text style={styles.passportText}>Kalan Kapasite: {passport.remainingCapacityKwh} kWh</Text>
                <Text style={styles.passportText}>Toplam Şarj Döngüsü: {passport.totalChargeCycles}</Text>
                <Text style={styles.passportText}>Termal Risk: {passport.thermalRunawayRisk}</Text>
                <Text style={styles.passportText}>Karbon Ayak İzi: {passport.carbonFootprintKgCo2} kg CO2</Text>
            </View>
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#0F0F1A' },
    content: { padding: 16 },
    center: { flex: 1, backgroundColor: '#0F0F1A', justifyContent: 'center', alignItems: 'center' },
    loadingText: { color: '#FFF', fontSize: 16 },
    backBtn: { marginBottom: 12 },
    backBtnText: { color: '#5AC8FA', fontSize: 16 },
    headerTitle: { color: '#FFF', fontSize: 22, fontWeight: 'bold' },
    subtitle: { color: '#8E8E93', fontSize: 13, marginBottom: 16 },
    card: { backgroundColor: '#1C1C2E', padding: 16, borderRadius: 12, marginBottom: 16 },
    cardTitle: { color: '#AAA', fontSize: 14, fontWeight: '600', marginBottom: 8 },
    row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
    bigScore: { color: '#34C759', fontSize: 32, fontWeight: 'bold' },
    badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
    badgeGreen: { backgroundColor: 'rgba(52, 199, 89, 0.2)' },
    badgeOrange: { backgroundColor: 'rgba(255, 149, 0, 0.2)' },
    badgeText: { color: '#34C759', fontSize: 12, fontWeight: 'bold' },
    infoText: { color: '#8E8E93', fontSize: 12 },
    grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
    gridItem: { width: '48%', backgroundColor: '#2C2C3E', padding: 10, borderRadius: 8, marginBottom: 8 },
    gridLabel: { color: '#AAA', fontSize: 11 },
    gridVal: { color: '#FFF', fontSize: 15, fontWeight: 'bold', marginTop: 2 },
    cellRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: '#2C2C3E' },
    cellLabel: { color: '#CCC', fontSize: 13 },
    cellVal: { color: '#FFF', fontSize: 13, fontWeight: 'bold' },
    warnText: { color: '#FF9500', fontSize: 11 },
    passportCard: { borderColor: '#007AFF', borderWidth: 1 },
    passportTitle: { color: '#5AC8FA', fontSize: 16, fontWeight: 'bold', marginBottom: 6 },
    passportId: { color: '#8E8E93', fontSize: 11, marginBottom: 8 },
    passportText: { color: '#DDD', fontSize: 13, marginVertical: 2 },
});
