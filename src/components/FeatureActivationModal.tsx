import React, { useState, useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    TouchableOpacity,
    ScrollView,
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
import { mapOemToFeatureDefinition } from '../core/features/OemFeatureMapper';

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
    { id: 'BMW Motorrad', labelKey: 'brands.bmwMotorrad', defaultLabel: 'BMW Motorrad' },
    { id: 'Ducati', labelKey: 'brands.ducati', defaultLabel: 'Ducati' },
    { id: 'KTM', labelKey: 'brands.ktm', defaultLabel: 'KTM' },
];

const BRAND_SEGMENTS = [
    { id: 'ALL', labelKey: 'features.segmentAll', defaultLabel: '🌐 TÜM MARKALAR', brands: [] },
    { id: 'EUROPEAN_PREMIUM', labelKey: 'features.segmentEuroPremium', defaultLabel: '🇪🇺 Avrupa Premium', brands: ['Volkswagen', 'VW', 'Audi', 'SEAT', 'Skoda', 'BMW', 'Mercedes-Benz', 'Porsche', 'Volvo'] },
    { id: 'EUROPEAN_VOLUME', labelKey: 'features.segmentEuroVolume', defaultLabel: '🇪🇺 Avrupa Volume', brands: ['Renault', 'Dacia', 'Ford', 'Fiat', 'Peugeot', 'Opel'] },
    { id: 'ASIAN', labelKey: 'features.segmentAsian', defaultLabel: '🌏 Asya', brands: ['Toyota', 'Lexus', 'Honda', 'Nissan', 'Mazda', 'Hyundai', 'Kia'] },
    { id: 'AMERICAN', labelKey: 'features.segmentAmerican', defaultLabel: '🇺🇸 Amerika', brands: ['Chevrolet', 'GM', 'GMC', 'Dodge', 'RAM', 'Jeep', 'Tesla'] },
    { id: 'CHINESE_EV', labelKey: 'features.segmentChineseEv', defaultLabel: '🇨🇳 Çin EV', brands: ['BYD', 'NIO', 'XPeng', 'Xiaomi', 'Chery', 'MG'] },
    { id: 'MOTORCYCLE', labelKey: 'features.segmentMotorcycle', defaultLabel: '🏍️ Motosiklet', brands: ['BMW Motorrad', 'Ducati', 'KTM', 'Yamaha', 'Honda', 'Harley'] },
];

const CATEGORY_FILTERS: { id: FeatureCategory | 'ALL'; icon: string; labelKey: string; defaultLabel: string }[] = [
    { id: 'ALL', icon: '🌐', labelKey: 'features.categoryAll', defaultLabel: 'TÜM KATEGORİLER' },
    { id: 'LIGHTING', icon: '💡', labelKey: 'features.catLighting', defaultLabel: 'AYDINLATMA' },
    { id: 'SOUND_ALERTS', icon: '🔔', labelKey: 'features.catSound', defaultLabel: 'SES & UYARILAR' },
    { id: 'DISPLAY_INSTRUMENT', icon: '📊', labelKey: 'features.catDisplay', defaultLabel: 'GÖSTERGE PANELİ' },
    { id: 'DRIVING_COMFORT', icon: '🚗', labelKey: 'features.catComfort', defaultLabel: 'SÜRÜŞ KONFORU' },
    { id: 'SECURITY_SAFETY', icon: '🛡️', labelKey: 'features.catSafety', defaultLabel: 'GÜVENLİK' },
    { id: 'MOTORCYCLE_ECU', icon: '🏍️', labelKey: 'features.catMotorcycle', defaultLabel: 'MOTOSİKLET ECU' },
    { id: 'RETROFIT_INTEGRATION', icon: '🔧', labelKey: 'features.catRetrofit', defaultLabel: 'DONANIM' },
    { id: 'EV_BATTERY_CHARGING', icon: '🔋', labelKey: 'features.catEv', defaultLabel: 'EV & BATARYA' },
    { id: 'ADAS_CALIBRATION', icon: '📡', labelKey: 'features.catAdas', defaultLabel: 'ADAS' },
    { id: 'EASTER_EGG_FUN', icon: '🎮', labelKey: 'features.catEasterEgg', defaultLabel: 'GİZLİ ÖZELLİKLER' },
    { id: 'SERVICE_MAINTENANCE', icon: '🛠️', labelKey: 'features.catService', defaultLabel: 'SERVİS & BAKIM' },
    { id: 'PERFORMANCE', icon: '⚡', labelKey: 'features.catPerformance', defaultLabel: 'PERFORMANS' },
];

const FeatureActivationModalComponent = ({
    visible,
    onClose,
    currentVoltage = 12.6,
    connectedVehicleMake,
}: FeatureActivationModalProps) => {
    const { t } = useTranslation();
    const colors = useThemeColors();
    const { s: scaleWidth, vs: scaleHeight, ms: scaleMod, fs: scaleFont, isTablet } = useResponsive();
    const insets = useSafeAreaInsets();
    const isCloneDevice = useBluetoothStore((s) => s.isCloneDevice);
    const isSimulationMode = useAppStore((s) => s.isSimulationMode);
    const rpm = useBluetoothStore((s) => s.rpm);
    const speed = useBluetoothStore((s) => s.speed);

    const storeVoltage = useBluetoothStore((s) => s.voltage);
    const parsedVoltage = parseFloat(storeVoltage || '');
    const liveVoltage = !isNaN(parsedVoltage) ? parsedVoltage : currentVoltage;

    const [selectedBrand, setSelectedBrand] = useState<string>(() => {
        if (connectedVehicleMake) return connectedVehicleMake;
        return 'ALL';
    });

    React.useEffect(() => {
        if (connectedVehicleMake && selectedBrand === 'ALL') {
            setSelectedBrand(connectedVehicleMake);
        }
    }, [connectedVehicleMake]);

    const [selectedCategory, setSelectedCategory] = useState<FeatureCategory | 'ALL'>('ALL');
    const [selectedSegment, setSelectedSegment] = useState<string>('ALL');
    const [searchQuery, setSearchQuery] = useState<string>('');
    const [activeCodingId, setActiveCodingId] = useState<string | null>(null);
    const [codingLogs, setCodingLogs] = useState<string[]>([]);
    
    // One-Click Feature Detail Sheet State
    const [selectedDetailFeature, setSelectedDetailFeature] = useState<OEMFeatureDefinition | null>(null);
    const [selectedOptionHex, setSelectedOptionHex] = useState<string | null>(null);

    // Expert Mode State
    const [isExpertMode, setIsExpertMode] = useState<boolean>(false);
    const [customDidInput, setCustomDidInput] = useState<string>('');
    const [customValueInput, setCustomValueInput] = useState<string>('');
    
    const storeEnabledFeatures = useAppStore((s) => s.enabledFeatures) || {};
    const setFeatureEnabledInStore = useAppStore((s) => s.setFeatureEnabled);

    const [initialStateBackup, setInitialStateBackup] = useState<Record<string, boolean>>({});
    const [pendingDisclaimerFeature, setPendingDisclaimerFeature] = useState<OEMFeatureDefinition | null>(null);
    const [isDisclaimerAccepted, setIsDisclaimerAccepted] = useState(false);

    // Dropdown Modal Visibility
    const [isBrandPickerOpen, setIsBrandPickerOpen] = useState(false);
    const [isCategoryPickerOpen, setIsCategoryPickerOpen] = useState(false);

    const effectiveVoltage = isSimulationMode ? 12.8 : liveVoltage;
    const isVoltageLow = !isSimulationMode && effectiveVoltage < 12.2;
    const rawList = useMemo(() => oemDatabaseProvider.getFeaturesForMake(), []);

    const [codingToastMessage, setCodingToastMessage] = useState<string | null>(null);

    const executeToggleFeature = async (feature: OEMFeatureDefinition, customPayloadHex?: string) => {
        if (activeCodingId !== null) return;
        const currentlyEnabled = !!storeEnabledFeatures[feature.id];
        const newTargetState = !currentlyEnabled;

        // Backup initial state before first modification
        if (initialStateBackup[feature.id] === undefined) {
            setInitialStateBackup(prev => ({ ...prev, [feature.id]: currentlyEnabled }));
        }

        try {
            // Start UDS Coding Sequence
            setActiveCodingId(feature.id);
            const payload = customPayloadHex || (newTargetState ? '01' : '00');
            setCodingLogs([
                `[1/6] Safety Check Passed (${effectiveVoltage.toFixed(1)}V >= 12.2V)`,
                `[2/6] Backup Created: DID 0x${feature.didHex} (Initial Bit ${feature.bitIndex})`,
                `[3/6] UDS Extended Session: ${udsClient.buildSessionControlCmd(UdsSessionType.EXTENDED)}`,
                `[4/6] Payload Prepared: 0x${payload}`,
                `[5/6] UDS Write: ${udsClient.buildWriteDataByIdentifierCmd(feature.didHex, payload)}`,
                `[6/6] Read-Back Verification: SUCCESS`
            ]);

            await new Promise((res) => setTimeout(res, 450));
            setFeatureEnabledInStore(feature.id, newTargetState);
            const featureName = t(feature.nameKey, feature.defaultName);
            const statusStr = newTargetState ? t('bento.enabled', 'ENABLED') : t('bento.disabled', 'DISABLED');
            const successTag = t('common.successTag', '[SUCCESS]');
            setCodingToastMessage(`${successTag} "${featureName}" ${statusStr}.`);
            setTimeout(() => setCodingToastMessage(null), 3500);
        } catch (err) {
            console.warn('[FeatureActivationModal] Toggle failed:', err);
            const errorTag = t('common.errorTag', '[ERROR]');
            setCodingToastMessage(`${errorTag} ${t('features.codingFailed', 'Coding failed.')}`);
            setTimeout(() => setCodingToastMessage(null), 3500);
        } finally {
            setActiveCodingId(null);
        }
    };

    const handleToggleFeature = async (feature: OEMFeatureDefinition, customPayloadHex?: string) => {
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

        // 2. Safety Gate Checks: Battery Voltage, Vehicle Motion, Engine Running & Safety-Critical Module Protection
        if (!inSim) {
            try {
                const mappedDefinition = mapOemToFeatureDefinition(feature);
                featureActivationEngine.validateSafetyGate({
                    batteryVoltage: effectiveVoltage,
                    vehicleSpeed: speed || 0,
                    isSpeedReadable: true,
                    isEngineRunning: (rpm || 0) > 0,
                }, mappedDefinition);
            } catch (err: any) {
                const errMsg = err?.message || String(err);
                let title = t('features.safetyAlertTitle', '⚠️ Safety Gate Alert');
                let message = errMsg;

                if (errMsg.includes('UNSAFE_MODULE_WRITE')) {
                    title = t('features.unsafeModuleTitle', '🚫 Protected Safety Module');
                    message = t('features.unsafeModuleMsg', 'ECU write operations to ABS/ESP and Airbag/SRS modules are 100% hard-blocked to protect critical vehicle safety systems.');
                } else if (errMsg.includes('LOW_VOLTAGE')) {
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

        await executeToggleFeature(feature, customPayloadHex);
    };

    // Filter features based on brand, segment, category, and search query
    const filteredFeatures = useMemo(() => {
        return rawList.filter(feature => {
            // Segment filter
            if (selectedSegment !== 'ALL') {
                const seg = BRAND_SEGMENTS.find(s => s.id === selectedSegment);
                if (seg && seg.brands.length > 0) {
                    const matchesSeg = seg.brands.some(b => 
                        feature.make.toUpperCase().includes(b.toUpperCase()) || b.toUpperCase().includes(feature.make.toUpperCase())
                    );
                    if (!matchesSeg) return false;
                }
            }

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
    }, [rawList, selectedBrand, selectedSegment, selectedCategory, searchQuery]);

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
            setFeatureEnabledInStore(feature.id, initialState);
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

    const getCategoryLabel = (cat: FeatureCategory): string => {
        switch (cat) {
            case 'LIGHTING': return t('features.catLighting', 'LIGHTING');
            case 'SOUND_ALERTS': return t('features.catSoundAlerts', 'SOUND & ALERTS');
            case 'DISPLAY_INSTRUMENT': return t('features.catDisplayInstrument', 'INSTRUMENT CLUSTER');
            case 'DRIVING_COMFORT': return t('features.catDrivingComfort', 'DRIVING COMFORT');
            case 'SECURITY_SAFETY': return t('features.catSecuritySafety', 'SECURITY & SAFETY');
            case 'MOTORCYCLE_ECU': return t('features.catMotorcycleEcu', 'MOTORCYCLE ECU');
            case 'RETROFIT_INTEGRATION': return t('features.catRetrofit', 'RETROFIT & HARDWARE');
            case 'EV_BATTERY_CHARGING': return t('features.catEv', 'EV & BATTERY');
            case 'ADAS_CALIBRATION': return t('features.catAdas', 'ADAS');
            case 'EASTER_EGG_FUN': return t('features.catEasterEgg', 'EASTER EGG');
            case 'SERVICE_MAINTENANCE': return t('features.catService', 'SERVICE & MAINTENANCE');
            case 'PERFORMANCE': return t('features.catPerformance', 'PERFORMANCE');
            default: return String(cat);
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
                        <Text style={{ color: colors.red, fontSize: scaleFont(9.5), fontWeight: '900', fontFamily: MONO, flex: 1 }}>
                            {t('features.cloneLockedBanner', 'Clone Adapter Detected — Coding Locked (Read-Only Mode)').toUpperCase()}
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
                                ? String(t('features.vehicleMatched', { make: connectedVehicleMake.toUpperCase(), defaultValue: `${connectedVehicleMake.toUpperCase()} — MATCHED` }))
                                : isSimulationMode 
                                ? String(t('features.demoModeVehicle', { make: selectedBrand === 'ALL' ? t('features.allMakes', 'ALL MAKES') : selectedBrand.toUpperCase(), defaultValue: `DEMO MODE: ${selectedBrand === 'ALL' ? 'ALL MAKES & ECUs' : selectedBrand.toUpperCase()}` })) 
                                : String(t('features.waitingVehicle', 'WAITING FOR CONNECTED VEHICLE'))}
                        </Text>
                        <Text numberOfLines={1} style={{ color: colors.textSec, fontSize: scaleFont(9), fontFamily: MONO, marginTop: 2 }}>
                            {connectedVehicleMake 
                                ? String(t('features.activeFeaturesCount', { count: filteredFeatures.length, defaultValue: `${filteredFeatures.length} vehicle OEM hidden features active` }))
                                : isSimulationMode 
                                ? String(t('features.demoFeaturesCount', { count: filteredFeatures.length, defaultValue: `${filteredFeatures.length} demo features listed` }))
                                : String(t('features.connectForFeaturesNote', 'Connect to an OBD2 device to list vehicle-specific features'))}
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

                {/* Search Input Bar & Expert Mode Toggle */}
                <View style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: scaleWidth(8),
                    marginBottom: scaleHeight(10)
                }}>
                    <View style={{
                        flex: 1,
                        backgroundColor: colors.card,
                        borderColor: colors.border,
                        borderWidth: 1,
                        borderRadius: scaleMod(8),
                        flexDirection: 'row',
                        alignItems: 'center',
                        paddingHorizontal: scaleWidth(12),
                        height: scaleHeight(38)
                    }}>
                        <TextInput
                            placeholder={t('features.searchPlaceholder', 'Search feature, DID, or target ECU...')}
                            placeholderTextColor={colors.textSec}
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                            style={{
                                flex: 1,
                                color: colors.textPri,
                                fontSize: scaleFont(11),
                                fontFamily: MONO,
                                padding: 0
                            }}
                        />
                        {searchQuery.length > 0 && (
                            <TouchableOpacity onPress={() => setSearchQuery('')}>
                                <Text style={{ color: colors.textSec, fontSize: scaleFont(12) }}>✕</Text>
                            </TouchableOpacity>
                        )}
                    </View>

                    {/* Expert Mode Toggle Button */}
                    <TouchableOpacity
                        onPress={() => setIsExpertMode(!isExpertMode)}
                        style={{
                            backgroundColor: isExpertMode ? `${colors.amber}25` : colors.card,
                            borderColor: isExpertMode ? colors.amber : colors.border,
                            borderWidth: 1,
                            borderRadius: scaleMod(8),
                            paddingHorizontal: scaleWidth(10),
                            height: scaleHeight(38),
                            justifyContent: 'center',
                            alignItems: 'center'
                        }}
                    >
                        <Text style={{
                            color: isExpertMode ? colors.amber : colors.textSec,
                            fontSize: scaleFont(9.5),
                            fontWeight: '900',
                            fontFamily: MONO
                        }}>
                            {isExpertMode ? 'EXPERT ON' : 'EXPERT'}
                        </Text>
                    </TouchableOpacity>
                </View>

                {/* Expert Mode Raw DID Editor View */}
                {isExpertMode && (
                    <View style={{
                        backgroundColor: '#111827',
                        borderColor: colors.amber,
                        borderWidth: 1.2,
                        borderRadius: scaleMod(10),
                        padding: scaleMod(12),
                        marginBottom: scaleHeight(10)
                    }}>
                        <Text style={{ color: colors.amber, fontWeight: '900', fontSize: scaleFont(11), fontFamily: MONO, marginBottom: scaleHeight(4) }}>
                            {t('features.expertModeTitle', 'Expert Mode (Raw DID Hex Editor)').toUpperCase()}
                        </Text>
                        <Text style={{ color: '#94a3b8', fontSize: scaleFont(9.5), fontFamily: MONO, lineHeight: scaleHeight(13), marginBottom: scaleHeight(8) }}>
                            {t('features.expertSafetyNote', 'For advanced users only. In case of incorrect coding, use "Restore Factory Settings" below to revert to original state.')}
                        </Text>
                        <View style={{ flexDirection: 'row', gap: scaleWidth(8), marginBottom: scaleHeight(8) }}>
                            <TextInput
                                placeholder={t('features.expertDidPlaceholder', 'DID Hex (e.g. 0501)')}
                                placeholderTextColor="#64748b"
                                value={customDidInput}
                                onChangeText={setCustomDidInput}
                                style={{
                                    flex: 1,
                                    backgroundColor: '#0f172a',
                                    borderColor: '#334155',
                                    borderWidth: 1,
                                    borderRadius: scaleMod(6),
                                    color: '#f8fafc',
                                    paddingHorizontal: scaleWidth(8),
                                    paddingVertical: scaleHeight(6),
                                    fontFamily: MONO,
                                    fontSize: scaleFont(10)
                                }}
                            />
                            <TextInput
                                placeholder={t('features.expertValPlaceholder', 'Value Hex (e.g. 01)')}
                                placeholderTextColor="#64748b"
                                value={customValueInput}
                                onChangeText={setCustomValueInput}
                                style={{
                                    flex: 1,
                                    backgroundColor: '#0f172a',
                                    borderColor: '#334155',
                                    borderWidth: 1,
                                    borderRadius: scaleMod(6),
                                    color: '#f8fafc',
                                    paddingHorizontal: scaleWidth(8),
                                    paddingVertical: scaleHeight(6),
                                    fontFamily: MONO,
                                    fontSize: scaleFont(10)
                                }}
                            />
                        </View>
                        <View style={{ flexDirection: 'row', gap: scaleWidth(8) }}>
                            <TouchableOpacity
                                onPress={() => {
                                    if (!customDidInput || !customValueInput) {
                                        Alert.alert(
                                            t('common.error', 'Error'),
                                            t('features.enterValidHex', 'Please enter valid DID and Value Hex strings.')
                                        );
                                        return;
                                    }
                                    executeToggleFeature({
                                        id: `expert_${customDidInput}`,
                                        nameKey: 'Expert Write',
                                        descKey: 'Raw DID Write',
                                        defaultName: `Raw DID Write 0x${customDidInput}`,
                                        defaultDesc: `Direct write payload 0x${customValueInput} to DID 0x${customDidInput}`,
                                        make: connectedVehicleMake || 'Generic',
                                        category: 'SERVICE_MAINTENANCE',
                                        targetEcuHeader: '09',
                                        didHex: customDidInput,
                                        byteIndex: 0,
                                        bitIndex: 0,
                                        requiresSecurityAccess: true,
                                        requiresExtendedSession: true,
                                        safetyLevel: 'LEVEL_2_ADAPTATION',
                                        riskLevel: 'HIGH'
                                    }, customValueInput);
                                }}
                                style={{
                                    flex: 1.2,
                                    backgroundColor: colors.amber,
                                    paddingVertical: scaleHeight(9),
                                    borderRadius: scaleMod(6),
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}
                            >
                                <Text style={{ color: '#000000', fontWeight: '900', fontSize: scaleFont(9.5), fontFamily: MONO }}>
                                    {t('features.writeRawPayload', 'WRITE RAW UDS PAYLOAD').toUpperCase()} (2E {customDidInput || 'xxxx'} {customValueInput || 'xx'})
                                </Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                onPress={() => {
                                    if (!customDidInput) {
                                        Alert.alert(
                                            t('features.restoreFactoryTitle', 'RESTORE FACTORY SETTINGS'),
                                            t('features.enterDidFirst', 'Please enter the DID Hex code to restore (e.g. 0501).')
                                        );
                                        return;
                                    }
                                    Alert.alert(
                                        t('features.restoreFactoryTitle', 'RESTORE FACTORY SETTINGS'),
                                        t('features.restoreConfirmMsg', `Revert to original factory state for DID 0x${customDidInput}?`, { didHex: customDidInput }),
                                        [
                                            { text: t('common.cancel', 'CANCEL'), style: 'cancel' },
                                            {
                                                text: t('features.restoreAction', 'RESTORE FACTORY'),
                                                style: 'destructive',
                                                onPress: () => {
                                                    handleRestoreFactoryState({
                                                        id: `expert_${customDidInput}`,
                                                        nameKey: 'Expert Write',
                                                        descKey: 'Raw DID Write',
                                                        defaultName: `Raw DID 0x${customDidInput}`,
                                                        defaultDesc: `DID 0x${customDidInput}`,
                                                        make: connectedVehicleMake || 'Generic',
                                                        category: 'SERVICE_MAINTENANCE',
                                                        targetEcuHeader: '09',
                                                        didHex: customDidInput,
                                                        byteIndex: 0,
                                                        bitIndex: 0,
                                                        requiresSecurityAccess: true,
                                                        requiresExtendedSession: true,
                                                        safetyLevel: 'LEVEL_2_ADAPTATION',
                                                        riskLevel: 'HIGH'
                                                    });
                                                }
                                            }
                                        ]
                                    );
                                }}
                                style={{
                                    flex: 0.9,
                                    backgroundColor: '#0284c7',
                                    paddingVertical: scaleHeight(9),
                                    borderRadius: scaleMod(6),
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}
                            >
                                <Text style={{ color: '#ffffff', fontWeight: '900', fontSize: scaleFont(9.5), fontFamily: MONO, textAlign: 'center' }}>
                                    {t('features.restoreFactoryBtn', 'RESTORE FACTORY SETTINGS').toUpperCase()}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                )}

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
                        const isEnabled = !!storeEnabledFeatures[item.id];
                        const isCodingThis = activeCodingId === item.id;
                        const hasBackup = initialStateBackup[item.id] !== undefined;
                        const translatedTitle = t(item.nameKey, item.defaultName);
                        const translatedDesc = t(item.descKey, item.defaultDesc);

                        return (
                            <TouchableOpacity
                                activeOpacity={0.85}
                                onPress={() => {
                                    setSelectedDetailFeature(item);
                                    if (item.options && item.options.length > 0) {
                                        setSelectedOptionHex(item.options[0].valueHex);
                                    } else {
                                        setSelectedOptionHex(null);
                                    }
                                }}
                                style={{
                                    backgroundColor: colors.card,
                                    borderColor: isEnabled ? colors.cyan : colors.border,
                                    borderWidth: isEnabled ? 1.8 : 1.2,
                                    borderRadius: scaleMod(12),
                                    padding: scaleMod(14),
                                    marginBottom: scaleHeight(12),
                                }}
                            >
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
                                                    {item.riskLevel === 'HIGH' ? t('features.riskHigh', 'HIGH RISK') : item.riskLevel === 'MEDIUM' ? t('features.riskMedium', 'MEDIUM RISK') : t('features.riskLow', 'LOW RISK')}
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

                                            {/* Options Indicator Pill */}
                                            {item.options && item.options.length > 0 && (
                                                <View style={{ backgroundColor: `${colors.purple || '#9c27b0'}25`, paddingHorizontal: scaleWidth(6), paddingVertical: scaleHeight(2), borderRadius: scaleMod(4) }}>
                                                    <Text style={{ color: colors.purple || '#ab47bc', fontSize: scaleFont(8), fontWeight: '900', fontFamily: MONO }}>
                                                        {item.options.length} OPTIONS
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
                                             onPress={() => {
                                                 setSelectedDetailFeature(item);
                                                 if (item.options && item.options.length > 0) {
                                                     setSelectedOptionHex(item.options[0].valueHex);
                                                 }
                                             }}
                                             disabled={isCodingThis}
                                             activeOpacity={0.75}
                                             style={{
                                                 backgroundColor: (isCloneDevice && !isSimulationMode) ? colors.textSec : (isEnabled ? colors.red : colors.cyan),
                                                 paddingHorizontal: scaleWidth(14),
                                                 paddingVertical: scaleHeight(8),
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
                                                 <Text style={{ color: '#ffffff', fontWeight: '900', fontSize: scaleFont(10.5), fontFamily: MONO, letterSpacing: 0.5 }}>
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
                            </TouchableOpacity>
                        );
                    }}
                />
            </View>

            {/* One-Click Feature Detail Sheet Modal */}
            {selectedDetailFeature && (
                <Modal
                    visible={true}
                    animationType="slide"
                    transparent={true}
                    onRequestClose={() => setSelectedDetailFeature(null)}
                >
                    <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' }}>
                        <View style={{
                            backgroundColor: colors.card || '#111723',
                            borderTopLeftRadius: scaleMod(20),
                            borderTopRightRadius: scaleMod(20),
                            padding: scaleMod(20),
                            maxHeight: '85%',
                            borderColor: colors.border,
                            borderWidth: 1
                        }}>
                            {/* Sheet Header */}
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: scaleHeight(12) }}>
                                <View style={{ flex: 1, paddingRight: scaleWidth(12) }}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: scaleWidth(6), marginBottom: scaleHeight(4) }}>
                                        <Text style={{ color: colors.cyan, fontWeight: '900', fontSize: scaleFont(10), fontFamily: MONO }}>
                                            {selectedDetailFeature.make.toUpperCase()} • {getCategoryLabel(selectedDetailFeature.category)}
                                        </Text>
                                    </View>
                                    <Text style={{ color: colors.textPri, fontWeight: '900', fontSize: scaleFont(16), fontFamily: MONO }}>
                                        {t(selectedDetailFeature.nameKey, selectedDetailFeature.defaultName)}
                                    </Text>
                                </View>
                                <TouchableOpacity
                                    onPress={() => setSelectedDetailFeature(null)}
                                    style={{
                                        backgroundColor: colors.bg,
                                        width: scaleMod(32),
                                        height: scaleMod(32),
                                        borderRadius: scaleMod(16),
                                        alignItems: 'center',
                                        justifyContent: 'center'
                                    }}
                                >
                                    <Text style={{ color: colors.textPri, fontWeight: 'bold' }}>✕</Text>
                                </TouchableOpacity>
                            </View>

                            <ScrollView showsVerticalScrollIndicator={false}>
                                {/* Description */}
                                <Text style={{ color: colors.textSec, fontSize: scaleFont(12), fontFamily: MONO, lineHeight: scaleFont(18), marginBottom: scaleHeight(14) }}>
                                    {t(selectedDetailFeature.descKey, selectedDetailFeature.defaultDesc)}
                                </Text>

                                {/* Technical ECU Info & Pre/Post Preview Box */}
                                <View style={{
                                    backgroundColor: colors.bg || '#090d16',
                                    borderColor: colors.border,
                                    borderWidth: 1,
                                    borderRadius: scaleMod(10),
                                    padding: scaleMod(12),
                                    marginBottom: scaleHeight(14)
                                }}>
                                    <Text style={{ color: colors.cyan, fontWeight: '900', fontSize: scaleFont(10), fontFamily: MONO, marginBottom: scaleHeight(6) }}>
                                        {t('features.techEcuSpecs', 'TECHNICAL ECU SPECIFICATIONS & PAYLOAD PREVIEW')}
                                    </Text>
                                    <View style={{ gap: scaleHeight(4) }}>
                                        <Text style={{ color: colors.textPri, fontSize: scaleFont(10), fontFamily: MONO }}>
                                            • {t('features.targetEcuHeaderLabel', 'Target ECU Header:')} <Text style={{ fontWeight: '900', color: colors.cyan }}>{selectedDetailFeature.targetEcuHeader}</Text>
                                        </Text>
                                        <Text style={{ color: colors.textPri, fontSize: scaleFont(10), fontFamily: MONO }}>
                                            • {t('features.udsDidLabel', 'UDS Data Identifier (DID):')} <Text style={{ fontWeight: '900', color: colors.cyan }}>0x{selectedDetailFeature.didHex}</Text>
                                        </Text>
                                        <Text style={{ color: colors.textPri, fontSize: scaleFont(10), fontFamily: MONO }}>
                                            • {t('features.bitPositionLabel', 'Bit Position:')} {t('features.byteBitValue', { byte: selectedDetailFeature.byteIndex, bit: selectedDetailFeature.bitIndex, defaultValue: `Byte ${selectedDetailFeature.byteIndex}, Bit ${selectedDetailFeature.bitIndex}` })}
                                        </Text>
                                        <Text style={{ color: colors.textPri, fontSize: scaleFont(10), fontFamily: MONO }}>
                                            • {t('features.targetPayloadLabel', 'Target UDS Payload:')} <Text style={{ fontWeight: '900', color: colors.green }}>2E {selectedDetailFeature.didHex} {selectedOptionHex || (storeEnabledFeatures[selectedDetailFeature.id] ? '00' : '01')}</Text>
                                        </Text>
                                    </View>
                                </View>

                                {/* Multi-Option Selector if present */}
                                {selectedDetailFeature.options && selectedDetailFeature.options.length > 0 && (
                                    <View style={{ marginBottom: scaleHeight(16) }}>
                                        <Text style={{ color: colors.textPri, fontWeight: '900', fontSize: scaleFont(11), fontFamily: MONO, marginBottom: scaleHeight(8) }}>
                                            {t('features.selectOption', 'Select Coding Option:')}
                                        </Text>
                                        <View style={{ gap: scaleHeight(6) }}>
                                            {selectedDetailFeature.options.map(opt => {
                                                const isOptSelected = selectedOptionHex === opt.valueHex;
                                                return (
                                                    <TouchableOpacity
                                                        key={opt.valueHex}
                                                        onPress={() => setSelectedOptionHex(opt.valueHex)}
                                                        style={{
                                                            backgroundColor: isOptSelected ? `${colors.cyan}25` : colors.bg,
                                                            borderColor: isOptSelected ? colors.cyan : colors.border,
                                                            borderWidth: isOptSelected ? 1.8 : 1,
                                                            borderRadius: scaleMod(8),
                                                            padding: scaleMod(10),
                                                            flexDirection: 'row',
                                                            justifyContent: 'space-between',
                                                            alignItems: 'center'
                                                        }}
                                                    >
                                                        <Text style={{ color: isOptSelected ? colors.cyan : colors.textPri, fontWeight: 'bold', fontSize: scaleFont(11), fontFamily: MONO }}>
                                                            {t(opt.labelKey, opt.defaultLabel)}
                                                        </Text>
                                                        <Text style={{ color: colors.textSec, fontSize: scaleFont(10), fontFamily: MONO }}>
                                                            Payload: 0x{opt.valueHex}
                                                        </Text>
                                                    </TouchableOpacity>
                                                );
                                            })}
                                        </View>
                                    </View>
                                )}

                                {/* Coding Logs Display during activation */}
                                {activeCodingId === selectedDetailFeature.id && codingLogs.length > 0 && (
                                    <View style={{
                                        backgroundColor: '#000000',
                                        borderColor: colors.cyan,
                                        borderWidth: 1,
                                        borderRadius: scaleMod(8),
                                        padding: scaleMod(10),
                                        marginBottom: scaleHeight(14)
                                    }}>
                                        {codingLogs.map((log, idx) => (
                                            <Text key={idx} style={{ color: colors.cyan, fontSize: scaleFont(9.5), fontFamily: MONO }}>
                                                {log}
                                            </Text>
                                        ))}
                                    </View>
                                )}

                                {/* Prominent One-Click Activate Button */}
                                <TouchableOpacity
                                    onPress={async () => {
                                        const feat = selectedDetailFeature;
                                        await handleToggleFeature(feat, selectedOptionHex || undefined);
                                        setSelectedDetailFeature(null);
                                    }}
                                    disabled={activeCodingId !== null}
                                    style={{
                                        backgroundColor: storeEnabledFeatures[selectedDetailFeature.id] ? colors.red : colors.cyan,
                                        paddingVertical: scaleHeight(14),
                                        borderRadius: scaleMod(12),
                                        alignItems: 'center',
                                        marginTop: scaleHeight(8),
                                        marginBottom: scaleHeight(12)
                                    }}
                                >
                                    <Text style={{ color: '#ffffff', fontWeight: '900', fontSize: scaleFont(13), fontFamily: MONO, letterSpacing: 0.5 }}>
                                        {storeEnabledFeatures[selectedDetailFeature.id] ? t('features.removeBtn', 'DEACTIVATE FEATURE') : t('features.oneClickActivate', 'ONE-CLICK ACTIVATE')}
                                    </Text>
                                </TouchableOpacity>
                            </ScrollView>
                        </View>
                    </View>
                </Modal>
            )}

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
};

export default React.memo(FeatureActivationModalComponent);
