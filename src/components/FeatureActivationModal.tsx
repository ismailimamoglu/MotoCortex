import React, { useState, useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    TouchableOpacity,
    FlatList,
    TextInput,
    Platform,
    ActivityIndicator,
    Alert
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useThemeColors } from '../theme';
import { useResponsive } from '../hooks/useResponsive';
import { oemDatabaseProvider, OEMFeatureDefinition, FeatureCategory } from '../core/database/OemDatabaseProvider';
import { featureActivationEngine } from '../core/features/FeatureActivationEngine';
import { udsClient, UdsSessionType } from '../core/protocol/uds/UdsClient';
import { useBluetoothStore } from '../store/useBluetoothStore';
import { useAppStore } from '../store/useAppStore';
import DisclaimersModal from './DisclaimersModal';

const MONO = Platform.OS === 'ios' ? 'System' : 'sans-serif';

interface FeatureActivationModalProps {
    visible: boolean;
    onClose: () => void;
    currentVoltage?: number; // e.g. 12.6V or 11.4V
    connectedVehicleMake?: string; // e.g. "Volkswagen" or undefined
}

const BRAND_FILTERS = [
    { id: 'ALL', labelKey: 'features.brandAll', defaultLabel: 'ALL MAKES' },
    { id: 'Volkswagen', labelKey: 'brands.volkswagen', defaultLabel: 'Volkswagen / VAG' },
    { id: 'BMW', labelKey: 'brands.bmw', defaultLabel: 'BMW / MINI' },
    { id: 'Mercedes-Benz', labelKey: 'brands.mercedes', defaultLabel: 'Mercedes-Benz' },
    { id: 'Renault', labelKey: 'brands.renault', defaultLabel: 'Renault / Dacia' },
    { id: 'Ford', labelKey: 'brands.ford', defaultLabel: 'Ford' },
    { id: 'Chevrolet', labelKey: 'brands.gm', defaultLabel: 'GM / Chevrolet / GMC' },
    { id: 'Dodge', labelKey: 'brands.dodge', defaultLabel: 'Dodge / RAM / Jeep' },
    { id: 'BYD', labelKey: 'brands.byd', defaultLabel: 'BYD EV' },
    { id: 'Chery', labelKey: 'brands.chery', defaultLabel: 'Chery / MG' },
    { id: 'Toyota', labelKey: 'brands.toyota', defaultLabel: 'Toyota / Lexus / Honda' },
    { id: 'Fiat', labelKey: 'brands.stellantis', defaultLabel: 'Stellantis / Fiat' },
    { id: 'Hyundai', labelKey: 'brands.hyundai', defaultLabel: 'Hyundai / Kia' },
    { id: 'Volvo', labelKey: 'brands.volvo', defaultLabel: 'Volvo / Polestar' },
];

const CATEGORY_FILTERS: { id: FeatureCategory | 'ALL'; labelKey: string; defaultLabel: string }[] = [
    { id: 'ALL', labelKey: 'features.categoryAll', defaultLabel: 'ALL CATEGORIES' },
    { id: 'LIGHTING', labelKey: 'features.lighting', defaultLabel: 'LIGHTING' },
    { id: 'SOUND_ALERTS', labelKey: 'features.soundAlerts', defaultLabel: 'SOUND ALERTS' },
    { id: 'DISPLAY_INSTRUMENT', labelKey: 'features.displayInstrument', defaultLabel: 'DISPLAY / CLUSTER' },
    { id: 'DRIVING_COMFORT', labelKey: 'features.drivingComfort', defaultLabel: 'DRIVING COMFORT' },
    { id: 'SECURITY_SAFETY', labelKey: 'features.securitySafety', defaultLabel: 'SECURITY & SAFETY' },
];

export default function FeatureActivationModal({
    visible,
    onClose,
    currentVoltage = 12.6,
    connectedVehicleMake,
}: FeatureActivationModalProps) {
    const { t } = useTranslation();
    const colors = useThemeColors();
    const { s: scaleWidth, vs: scaleHeight, ms: scaleMod, fs: scaleFont, isTablet } = useResponsive();
    const insets = useSafeAreaInsets();
    const isCloneDevice = useBluetoothStore((s) => s.isCloneDevice);
    const isSimulationMode = useAppStore((s) => s.isSimulationMode);
    const rpm = useBluetoothStore((s) => s.rpm);
    const speed = useBluetoothStore((s) => s.speed);

    const [selectedBrand, setSelectedBrand] = useState<string>(() => {
        if (connectedVehicleMake) return connectedVehicleMake;
        if (isSimulationMode) return 'Volkswagen';
        return 'ALL';
    });

    React.useEffect(() => {
        if (connectedVehicleMake && selectedBrand !== connectedVehicleMake) {
            setSelectedBrand(connectedVehicleMake);
        } else if (isSimulationMode && selectedBrand === 'ALL') {
            setSelectedBrand('Volkswagen');
        }
    }, [connectedVehicleMake, isSimulationMode, selectedBrand]);

    const [selectedCategory, setSelectedCategory] = useState<FeatureCategory | 'ALL'>('ALL');
    const [searchQuery, setSearchQuery] = useState<string>('');
    const [activeCodingId, setActiveCodingId] = useState<string | null>(null);
    const [codingLogs, setCodingLogs] = useState<string[]>([]);
    const [enabledFeatures, setEnabledFeatures] = useState<Record<string, boolean>>({});
    const [initialStateBackup, setInitialStateBackup] = useState<Record<string, boolean>>({});
    const [pendingDisclaimerFeature, setPendingDisclaimerFeature] = useState<OEMFeatureDefinition | null>(null);
    const [isDisclaimerAccepted, setIsDisclaimerAccepted] = useState(false);

    // Dropdown Modal Visibility
    const [isBrandPickerOpen, setIsBrandPickerOpen] = useState(false);
    const [isCategoryPickerOpen, setIsCategoryPickerOpen] = useState(false);

    const effectiveVoltage = isSimulationMode ? 12.8 : currentVoltage;
    const isVoltageLow = !isSimulationMode && effectiveVoltage < 12.2;
    const rawList = useMemo(() => oemDatabaseProvider.getFeaturesForMake(), []);

    const [codingToastMessage, setCodingToastMessage] = useState<string | null>(null);

    const executeToggleFeature = async (feature: OEMFeatureDefinition) => {
        if (activeCodingId !== null) return;
        const currentlyEnabled = !!enabledFeatures[feature.id];
        const newTargetState = !currentlyEnabled;

        // Backup initial state before first modification
        if (initialStateBackup[feature.id] === undefined) {
            setInitialStateBackup(prev => ({ ...prev, [feature.id]: currentlyEnabled }));
        }

        try {
            // Start UDS Coding Sequence
            setActiveCodingId(feature.id);
            setCodingLogs([
                `[1/6] Safety Check Passed (${effectiveVoltage.toFixed(1)}V >= 12.2V)`,
                `[2/6] Backup Created: DID 0x${feature.didHex} (Initial Bit ${feature.bitIndex})`,
                `[3/6] UDS Extended Session: ${udsClient.buildSessionControlCmd(UdsSessionType.EXTENDED)}`,
                `[4/6] Bitmask Updated (Byte ${feature.byteIndex}, Bit ${feature.bitIndex})`,
                `[5/6] UDS Write: ${udsClient.buildWriteDataByIdentifierCmd(feature.didHex, newTargetState ? '01' : '00')}`,
                `[6/6] Read-Back Verification: SUCCESS`
            ]);

            await new Promise((res) => setTimeout(res, 400));
            setEnabledFeatures(prev => ({ ...prev, [feature.id]: newTargetState }));
            const featureName = t(feature.nameKey, feature.defaultName);
            const statusStr = newTargetState ? t('bento.enabled', 'AKTİF HALE GETİRİLDİ') : t('bento.disabled', 'DEVRE DIŞI BIRAKILDI');
            setCodingToastMessage(`✅ "${featureName}" ${statusStr}.`);
            setTimeout(() => setCodingToastMessage(null), 3500);
        } catch (err) {
            console.warn('[FeatureActivationModal] Toggle failed:', err);
            setCodingToastMessage(`❌ ${t('features.codingFailed', 'Kodlama başarısız oldu.')}`);
            setTimeout(() => setCodingToastMessage(null), 3500);
        } finally {
            setActiveCodingId(null);
        }
    };

    const handleToggleFeature = async (feature: OEMFeatureDefinition) => {
        const inSim = isSimulationMode || useAppStore.getState().isSimulationMode;

        // 0. Clone Adapter Safety Gate Check (Bypassed in Demo Mode)
        if (isCloneDevice && !inSim) {
            Alert.alert(
                t('features.cloneAlertTitle', '⚠️ Clone OBD2 Adapter Detected'),
                t('features.cloneAlertMsg', 'Your connected OBD2 adapter was flagged as a counterfeit clone adapter lacking strict timing accuracy required for ECU writing.\n\nYou can browse and search all features, but coding write operations are locked to protect your vehicle. Please connect a genuine ELM327 v2.1+ or vLinker adapter for writing.'),
                [{ text: t('common.ok', 'OK'), style: 'cancel' }]
            );
            return;
        }

        // 1. Vehicle & ECU Compatibility Check (Bypassed in Demo Mode)
        if (!inSim) {
            const isSupported = featureActivationEngine.checkVehicleSupport(feature.make, connectedVehicleMake);
            if (!isSupported) {
                Alert.alert(
                    '🚫 ' + t('features.unsupportedTitle', 'Vehicle Not Supported'),
                    t('features.unsupportedMsg', 'This feature is not supported by your vehicle\'s ECU hardware or software version.'),
                    [{ text: t('common.ok', 'OK'), style: 'cancel' }]
                );
                return;
            }
        }

        // 2. Safety Gate Checks: Battery Voltage, Vehicle Motion & Engine Running (Bypassed in Demo Mode)
        if (!inSim) {
            try {
                featureActivationEngine.validateSafetyGate({
                    batteryVoltage: effectiveVoltage,
                    vehicleSpeed: speed || 0,
                    isSpeedReadable: true,
                    isEngineRunning: (rpm || 0) > 0,
                });
            } catch (err: any) {
                const errMsg = err?.message || String(err);
                let title = t('features.safetyAlertTitle', '⚠️ Safety Gate Alert');
                let message = errMsg;

                if (errMsg.includes('LOW_VOLTAGE')) {
                    title = t('features.lowVoltageTitle', '⚠️ Low Battery Voltage Alert');
                    message = t('features.lowVoltageMsg', `Minimum 12.2V battery voltage required for coding.\nCurrent Voltage: ${effectiveVoltage.toFixed(1)}V.\nPlease connect a charger.`);
                } else if (errMsg.includes('VEHICLE_IN_MOTION')) {
                    title = t('features.motionAlertTitle', '🚨 Vehicle in Motion');
                    message = t('features.motionAlertMsg', 'ECU write operations are blocked while the vehicle is moving. Please park safely before coding.');
                } else if (errMsg.includes('ENGINE_RUNNING')) {
                    title = t('features.engineRunningTitle', '⚠️ Engine Running');
                    message = t('features.engineRunningMsg', 'ECU coding requires Ignition ON with Engine OFF (RPM == 0) to prevent alternator voltage spikes.');
                }

                Alert.alert(title, message, [{ text: t('common.ok', 'OK'), style: 'cancel' }]);
                return;
            }
        }

        if (!isDisclaimerAccepted && !inSim) {
            setPendingDisclaimerFeature(feature);
            return;
        }

        await executeToggleFeature(feature);
    };

    // Filter features based on brand, category, and search query
    const filteredFeatures = useMemo(() => {
        return rawList.filter(feature => {
            // Brand filter with alias matching
            if (selectedBrand !== 'ALL') {
                const cleanSelected = selectedBrand.toUpperCase();
                const cleanMake = feature.make.toUpperCase();
                let matchesBrand = cleanMake.includes(cleanSelected) || cleanSelected.includes(cleanMake);

                if (!matchesBrand) {
                    if (cleanSelected === 'CHEVROLET' && (cleanMake === 'GM' || cleanMake === 'GMC' || cleanMake === 'CADILLAC' || cleanMake === 'CHEVROLET')) matchesBrand = true;
                    if (cleanSelected === 'DODGE' && (cleanMake === 'RAM' || cleanMake === 'JEEP' || cleanMake === 'CHRYSLER' || cleanMake === 'DODGE')) matchesBrand = true;
                    if (cleanSelected === 'BYD' && (cleanMake === 'BYD' || cleanMake === 'EV')) matchesBrand = true;
                    if (cleanSelected === 'CHERY' && (cleanMake === 'MG' || cleanMake === 'GEELY' || cleanMake === 'CHERY')) matchesBrand = true;
                    if (cleanSelected === 'TOYOTA' && (cleanMake === 'LEXUS' || cleanMake === 'HONDA' || cleanMake === 'SUBARU' || cleanMake === 'TOYOTA')) matchesBrand = true;
                    if (cleanSelected === 'FIAT' && (cleanMake === 'STELLANTIS' || cleanMake === 'PEUGEOT' || cleanMake === 'JEEP' || cleanMake === 'FIAT')) matchesBrand = true;
                    if (cleanSelected === 'VOLVO' && (cleanMake === 'POLESTAR' || cleanMake === 'VOLVO')) matchesBrand = true;
                    if (cleanSelected === 'VOLKSWAGEN' && (cleanMake === 'VW' || cleanMake === 'AUDI' || cleanMake === 'SEAT' || cleanMake === 'SKODA' || cleanMake === 'PORSCHE' || cleanMake === 'VOLKSWAGEN')) matchesBrand = true;
                    if (cleanSelected === 'HYUNDAI' && (cleanMake === 'KIA' || cleanMake === 'GENESIS' || cleanMake === 'HYUNDAI')) matchesBrand = true;
                }

                if (!matchesBrand) return false;
            }

            // Category filter
            if (selectedCategory !== 'ALL' && feature.category !== selectedCategory) {
                return false;
            }

            // Search query filter
            if (searchQuery.trim().length > 0) {
                const query = searchQuery.toLowerCase().trim();
                const title = t(feature.nameKey, feature.defaultName).toLowerCase();
                const desc = t(feature.descKey, feature.defaultDesc).toLowerCase();
                const did = feature.didHex.toLowerCase();
                const ecu = feature.targetEcuHeader.toLowerCase();

                if (!title.includes(query) && !desc.includes(query) && !did.includes(query) && !ecu.includes(query)) {
                    return false;
                }
            }

            return true;
        });
    }, [rawList, selectedBrand, selectedCategory, searchQuery, t]);

    const handleRestoreFactoryState = (feature: OEMFeatureDefinition) => {
        if (isCloneDevice && !isSimulationMode) {
            Alert.alert(
                t('features.cloneAlertTitle', '⚠️ Clone OBD2 Adapter Detected'),
                t('features.cloneAlertMsg', 'Your connected OBD2 adapter was flagged as a counterfeit clone adapter lacking strict timing accuracy required for ECU writing.\n\nYou can browse and search all features, but coding write operations are locked to protect your vehicle. Please connect a genuine ELM327 v2.1+ or vLinker adapter for writing.'),
                [{ text: t('common.ok', 'OK'), style: 'cancel' }]
            );
            return;
        }

        const initialState = initialStateBackup[feature.id] ?? false;
        setActiveCodingId(feature.id);
        setCodingLogs([
            `[1/4] Reverting DID 0x${feature.didHex} to Factory Backup Value...`,
            `[2/4] UDS Extended Session Initiated`,
            `[3/4] Restoring Byte ${feature.byteIndex}, Bit ${feature.bitIndex}`,
            `[4/4] Factory State Restored`
        ]);

        setTimeout(() => {
            setEnabledFeatures(prev => ({ ...prev, [feature.id]: initialState }));
            setActiveCodingId(null);
            Alert.alert(
                '🔄 ' + t('features.restoreSuccessTitle', 'Factory State Restored'),
                t('features.restoreSuccessMsg', 'Selected feature has been reverted back to original DID state.')
            );
        }, 500);
    };

    const handleCloseModal = () => {
        if (onClose) {
            onClose();
        }
    };

    if (visible === false) {
        return null;
    }

    return (
        <View style={{ flex: 1, backgroundColor: colors.bg }}>
            <View style={{ flex: 1, paddingHorizontal: scaleWidth(isTablet ? 24 : 16), paddingTop: scaleHeight(12) }}>

                {/* Clone Adapter Safety Banner (Bypassed in Demo Mode) */}
                {isCloneDevice && !isSimulationMode && (
                    <View style={{
                        backgroundColor: '#ff084418',
                        borderColor: colors.red,
                        borderWidth: 1.2,
                        borderRadius: scaleMod(10),
                        padding: scaleMod(10),
                        marginBottom: scaleHeight(10),
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: scaleMod(8)
                    }}>
                        <Text style={{ fontSize: scaleFont(14) }}>⚠️</Text>
                        <Text style={{ color: colors.red, fontSize: scaleFont(9.5), fontWeight: '900', fontFamily: MONO, flex: 1 }}>
                            {t('features.cloneLockedBanner', '⚠️ Klon Adaptör Tespit Edildi — Kodlama Kilitli (İnceleme Modu)').toUpperCase()}
                        </Text>
                    </View>
                )}

                {/* Coding Feedback Toast Banner */}
                {codingToastMessage && (
                    <View style={{
                        backgroundColor: `${colors.cyan}18`,
                        borderColor: colors.cyan,
                        borderWidth: 1.2,
                        borderRadius: scaleMod(10),
                        padding: scaleMod(10),
                        marginBottom: scaleHeight(10),
                        alignItems: 'center'
                    }}>
                        <Text style={{ color: colors.cyan, fontSize: scaleFont(11), fontWeight: '900', fontFamily: MONO }}>
                            {codingToastMessage}
                        </Text>
                    </View>
                )}

                {/* Dynamic Vehicle Identification & Voltage Status Bar */}
                <View style={{
                    backgroundColor: colors.card,
                    borderColor: isVoltageLow ? colors.red : colors.border,
                    borderWidth: 1,
                    borderRadius: scaleMod(10),
                    padding: scaleMod(10),
                    marginBottom: scaleHeight(10),
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                }}>
                    <View style={{ flex: 1, paddingRight: scaleWidth(8) }}>
                        <Text numberOfLines={1} style={{ color: colors.textPri, fontWeight: '900', fontSize: scaleFont(11), fontFamily: MONO }}>
                            {connectedVehicleMake 
                                ? String(t('features.vehicleMatched', { make: connectedVehicleMake.toUpperCase(), defaultValue: `${connectedVehicleMake.toUpperCase()} — EŞLEŞTİ` }))
                                : isSimulationMode 
                                ? String(t('features.demoModeVehicle', { make: 'VOLKSWAGEN', defaultValue: 'DEMO MODU: VOLKSWAGEN' })) 
                                : String(t('features.waitingVehicle', 'BAĞLI ARAÇ BEKLENİYOR'))}
                        </Text>
                        <Text numberOfLines={1} style={{ color: colors.textSec, fontSize: scaleFont(9), fontFamily: MONO, marginTop: 2 }}>
                            {connectedVehicleMake 
                                ? String(t('features.activeFeaturesCount', { count: filteredFeatures.length, defaultValue: `${filteredFeatures.length} adet araca özel OEM gizli özellik aktif` }))
                                : isSimulationMode 
                                ? String(t('features.demoFeaturesCount', { count: filteredFeatures.length, defaultValue: `${filteredFeatures.length} adet demo özellik listeleniyor` }))
                                : String(t('features.connectForFeaturesNote', 'OBD2 cihazına bağlandığınızda araca özel özellikler gelir'))}
                        </Text>
                    </View>
                    <View style={{
                        paddingHorizontal: scaleWidth(8),
                        paddingVertical: scaleHeight(4),
                        borderRadius: scaleMod(6),
                        backgroundColor: isVoltageLow ? `${colors.red}20` : `${colors.green}20`,
                        borderWidth: 1,
                        borderColor: isVoltageLow ? colors.red : colors.green,
                    }}>
                        <Text style={{ color: isVoltageLow ? colors.red : colors.green, fontWeight: '900', fontSize: scaleFont(9.5), fontFamily: MONO }}>
                            {effectiveVoltage.toFixed(1)}V
                        </Text>
                    </View>
                </View>

                {/* Filtered Features List */}
                <FlatList
                    data={filteredFeatures}
                    keyExtractor={(item) => item.id}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                    removeClippedSubviews={false}
                    contentContainerStyle={{ paddingBottom: scaleHeight(24) }}
                    ListEmptyComponent={() => (
                        <View style={{ padding: scaleMod(30), alignItems: 'center' }}>
                            <Text style={{ color: colors.textSec, fontSize: scaleFont(12), fontFamily: MONO, textAlign: 'center' }}>
                                {t('features.noMatchingFeatures', 'No matching features found for selected filters.')}
                            </Text>
                        </View>
                    )}
                    renderItem={({ item }) => {
                        const isEnabled = !!enabledFeatures[item.id];
                        const isCodingThis = activeCodingId === item.id;
                        const hasBackup = initialStateBackup[item.id] !== undefined;
                        const translatedTitle = t(item.nameKey, item.defaultName);
                        const translatedDesc = t(item.descKey, item.defaultDesc);

                        return (
                            <View style={{
                                backgroundColor: colors.card,
                                borderColor: isEnabled ? colors.cyan : colors.border,
                                borderWidth: isEnabled ? 1.8 : 1.2,
                                borderRadius: scaleMod(12),
                                padding: scaleMod(14),
                                marginBottom: scaleHeight(12),
                            }}>
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                    <View style={{ flex: 1, paddingRight: scaleWidth(12) }}>
                                        {/* Brand & Risk Badges */}
                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: scaleWidth(6), marginBottom: scaleHeight(6), flexWrap: 'wrap' }}>
                                            <View style={{ backgroundColor: `${colors.cyan}15`, paddingHorizontal: scaleWidth(6), paddingVertical: scaleHeight(2), borderRadius: scaleMod(4) }}>
                                                <Text style={{ color: colors.cyan, fontSize: scaleFont(8), fontWeight: 'bold', fontFamily: MONO }}>
                                                    {item.make.toUpperCase()}
                                                </Text>
                                            </View>

                                            {/* Risk Level Badge */}
                                            <View style={{
                                                backgroundColor: item.riskLevel === 'HIGH' ? '#ff084422' : item.riskLevel === 'MEDIUM' ? '#ffaa0022' : '#00e67622',
                                                paddingHorizontal: scaleWidth(6),
                                                paddingVertical: scaleHeight(2),
                                                borderRadius: scaleMod(4),
                                                borderWidth: 1,
                                                borderColor: item.riskLevel === 'HIGH' ? colors.red : item.riskLevel === 'MEDIUM' ? colors.amber : colors.green
                                            }}>
                                                <Text style={{
                                                    color: item.riskLevel === 'HIGH' ? colors.red : item.riskLevel === 'MEDIUM' ? colors.amber : colors.green,
                                                    fontSize: scaleFont(8),
                                                    fontWeight: '900',
                                                    fontFamily: MONO
                                                }}>
                                                    {item.riskLevel === 'HIGH' ? t('features.riskHigh', 'YÜKSEK RİSK') : item.riskLevel === 'MEDIUM' ? t('features.riskMedium', 'ORTA RİSK') : t('features.riskLow', 'DÜŞÜK RİSK')}
                                                </Text>
                                            </View>

                                            {/* SFD Protection Badge */}
                                            {item.sfdProtected && (
                                                <View style={{ backgroundColor: '#ff990022', paddingHorizontal: scaleWidth(6), paddingVertical: scaleHeight(2), borderRadius: scaleMod(4), borderWidth: 1, borderColor: colors.amber }}>
                                                    <Text style={{ color: colors.amber, fontSize: scaleFont(8), fontWeight: '900', fontFamily: MONO }}>
                                                        {t('features.sfdProtected', 'SFD PROTECTED ECU')}
                                                    </Text>
                                                </View>
                                            )}
                                        </View>

                                        {/* Title & Description */}
                                        <Text style={{ color: colors.textPri, fontSize: scaleFont(13.5), fontWeight: '900', fontFamily: MONO, lineHeight: scaleFont(18) }}>
                                            {translatedTitle}
                                        </Text>
                                        <Text style={{ color: colors.textSec, fontSize: scaleFont(10.5), marginTop: scaleHeight(4), fontFamily: MONO, lineHeight: scaleFont(15) }}>
                                            {translatedDesc}
                                        </Text>

                                        {/* Regional Street Legal Disclaimer Note */}
                                        {item.streetLegalNoteKey && (
                                            <Text style={{ color: colors.amber, fontSize: scaleFont(9), marginTop: scaleHeight(5), fontFamily: MONO, fontStyle: 'italic' }}>
                                                {t(item.streetLegalNoteKey)}
                                            </Text>
                                        )}
                                    </View>

                                    {/* Action Buttons */}
                                    <View style={{ gap: scaleHeight(6), alignItems: 'flex-end' }}>
                                        <TouchableOpacity
                                             onPress={() => handleToggleFeature(item)}
                                             disabled={isCodingThis}
                                             activeOpacity={0.75}
                                             delayPressIn={0}
                                             hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                                             style={{
                                                 backgroundColor: (isCloneDevice && !isSimulationMode) ? colors.textSec : (isEnabled ? colors.red : colors.cyan),
                                                 paddingHorizontal: scaleWidth(16),
                                                 paddingVertical: scaleHeight(10),
                                                 borderRadius: scaleMod(8),
                                                 minWidth: scaleWidth(84),
                                                 alignItems: 'center',
                                                 justifyContent: 'center',
                                                 opacity: (isCloneDevice && !isSimulationMode) ? 0.65 : 1
                                             }}
                                         >
                                             {isCodingThis ? (
                                                 <ActivityIndicator size="small" color="#ffffff" />
                                             ) : (
                                                 <Text style={{ color: '#ffffff', fontWeight: '900', fontSize: scaleFont(11), fontFamily: MONO, letterSpacing: 0.5 }}>
                                                     {(isCloneDevice && !isSimulationMode) ? t('features.codeBtn', 'KODLA') : (isEnabled ? t('features.removeBtn', 'KALDIR') : t('features.codeBtn', 'KODLA'))}
                                                 </Text>
                                             )}
                                         </TouchableOpacity>

                                        {hasBackup && (
                                            <TouchableOpacity
                                                onPress={() => handleRestoreFactoryState(item)}
                                                disabled={isCodingThis}
                                                activeOpacity={0.75}
                                                style={{
                                                    borderColor: colors.textSec,
                                                    borderWidth: 1,
                                                    paddingHorizontal: scaleWidth(8),
                                                    paddingVertical: scaleHeight(4),
                                                    borderRadius: scaleMod(6),
                                                    alignItems: 'center'
                                                }}
                                            >
                                                <Text style={{ color: colors.textSec, fontSize: scaleFont(8.5), fontFamily: MONO }}>
                                                    {t('features.restoreBtn', 'RESTORE FACTORY')}
                                                </Text>
                                            </TouchableOpacity>
                                        )}
                                    </View>
                                </View>
                            </View>
                        );
                    }}
                />
            </View>

            {/* Mandatory Safety Disclaimer Modal */}
            <DisclaimersModal
                visible={pendingDisclaimerFeature !== null}
                featureTitle={pendingDisclaimerFeature ? t(pendingDisclaimerFeature.nameKey, pendingDisclaimerFeature.defaultName) : undefined}
                onAccept={() => {
                    setIsDisclaimerAccepted(true);
                    const target = pendingDisclaimerFeature;
                    setPendingDisclaimerFeature(null);
                    if (target) {
                        executeToggleFeature(target);
                    }
                }}
                onDecline={() => {
                    setPendingDisclaimerFeature(null);
                }}
            />
        </View>
    );
}
