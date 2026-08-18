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
import { ExpertLongCodingModal } from './coding/ExpertLongCodingModal';
import { PreconditionWizardModal } from './coding/PreconditionWizardModal';

const MONO = Platform.OS === 'ios' ? 'System' : 'sans-serif';

interface FeatureActivationModalProps {
 visible: boolean;
 onClose: () => void;
 currentVoltage?: number; // e.g. 12.6V or 11.4V
 connectedVehicleMake?: string; // e.g. "Volkswagen" or undefined
 onOpenPaywall?: () => void;
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
 { id: 'Mercedes-Benz Trucks', labelKey: 'brands.mercedesTrucks', defaultLabel: 'Mercedes Trucks (Actros)' },
 { id: 'Volvo Trucks', labelKey: 'brands.volvoTrucks', defaultLabel: 'Volvo Trucks (FH/FM)' },
 { id: 'Scania', labelKey: 'brands.scania', defaultLabel: 'Scania' },
 { id: 'MAN', labelKey: 'brands.man', defaultLabel: 'MAN Truck & Bus' },
 { id: 'Ford Trucks', labelKey: 'brands.fordTrucks', defaultLabel: 'Ford Trucks (F-MAX)' },
 { id: 'DAF', labelKey: 'brands.daf', defaultLabel: 'DAF Trucks' },
 { id: 'Cummins', labelKey: 'brands.cummins', defaultLabel: 'Cummins Engine' },
];

const BRAND_SEGMENTS = [
 { id: 'ALL', labelKey: 'features.segmentAll', defaultLabel: 'TÜM MARKALAR', brands: [] },
 { id: 'EUROPEAN_PREMIUM', labelKey: 'features.segmentEuroPremium', defaultLabel: 'Avrupa Premium', brands: ['Volkswagen', 'VW', 'Audi', 'SEAT', 'Skoda', 'BMW', 'Mercedes-Benz', 'Porsche', 'Volvo'] },
 { id: 'EUROPEAN_VOLUME', labelKey: 'features.segmentEuroVolume', defaultLabel: 'Avrupa Volume', brands: ['Renault', 'Dacia', 'Ford', 'Fiat', 'Peugeot', 'Opel'] },
 { id: 'ASIAN', labelKey: 'features.segmentAsian', defaultLabel: 'Asya', brands: ['Toyota', 'Lexus', 'Honda', 'Nissan', 'Mazda', 'Hyundai', 'Kia'] },
 { id: 'AMERICAN', labelKey: 'features.segmentAmerican', defaultLabel: 'Amerika', brands: ['Chevrolet', 'GM', 'GMC', 'Dodge', 'RAM', 'Jeep', 'Tesla'] },
 { id: 'CHINESE_EV', labelKey: 'features.segmentChineseEv', defaultLabel: 'Çin EV', brands: ['BYD', 'NIO', 'XPeng', 'Xiaomi', 'Chery', 'MG'] },
 { id: 'COMMERCIAL_TRUCK', labelKey: 'features.segmentCommercialTruck', defaultLabel: 'Ağır Vasıta / Kamyon', brands: ['Mercedes-Benz Trucks', 'Volvo Trucks', 'Scania', 'MAN', 'Ford Trucks', 'DAF', 'Cummins'] },
 { id: 'MOTORCYCLE', labelKey: 'features.segmentMotorcycle', defaultLabel: 'Motosiklet', brands: ['BMW Motorrad', 'Ducati', 'KTM', 'Yamaha', 'Honda', 'Harley'] },
];

const CATEGORY_FILTERS: { id: FeatureCategory | 'ALL'; icon: string; labelKey: string; defaultLabel: string }[] = [
 { id: 'ALL', icon: '', labelKey: 'features.categoryAll', defaultLabel: 'TÜM KATEGORİLER' },
 { id: 'LIGHTING', icon: '', labelKey: 'features.catLighting', defaultLabel: 'AYDINLATMA' },
 { id: 'SOUND_ALERTS', icon: '', labelKey: 'features.catSound', defaultLabel: 'SES & UYARILAR' },
 { id: 'DISPLAY_INSTRUMENT', icon: '', labelKey: 'features.catDisplay', defaultLabel: 'GÖSTERGE PANELİ' },
 { id: 'DRIVING_COMFORT', icon: '', labelKey: 'features.catComfort', defaultLabel: 'SÜRÜŞ KONFORU' },
 { id: 'SECURITY_SAFETY', icon: '', labelKey: 'features.catSafety', defaultLabel: 'GÜVENLİK' },
 { id: 'MOTORCYCLE_ECU', icon: '', labelKey: 'features.catMotorcycle', defaultLabel: 'MOTOSİKLET ECU' },
 { id: 'RETROFIT_INTEGRATION', icon: '', labelKey: 'features.catRetrofit', defaultLabel: 'DONANIM' },
 { id: 'EV_BATTERY_CHARGING', icon: '', labelKey: 'features.catEv', defaultLabel: 'EV & BATARYA' },
 { id: 'ADAS_CALIBRATION', icon: '', labelKey: 'features.catAdas', defaultLabel: 'ADAS' },
 { id: 'EASTER_EGG_FUN', icon: '', labelKey: 'features.catEasterEgg', defaultLabel: 'GİZLİ ÖZELLİKLER' },
 { id: 'SERVICE_MAINTENANCE', icon: '', labelKey: 'features.catService', defaultLabel: 'SERVİS & BAKIM' },
 { id: 'PERFORMANCE', icon: '', labelKey: 'features.catPerformance', defaultLabel: 'PERFORMANS' },
];

const FeatureActivationModalComponent = ({
 visible,
 onClose,
 currentVoltage = 12.6,
 connectedVehicleMake,
 onOpenPaywall,
}: FeatureActivationModalProps) => {
 const { t } = useTranslation();
 const colors = useThemeColors();
 const { s: scaleWidth, vs: scaleHeight, ms: scaleMod, fs: scaleFont, isTablet } = useResponsive();
 const insets = useSafeAreaInsets();
 const isCloneDevice = useBluetoothStore((s) => s.isCloneDevice);
 const isSimulationMode = useAppStore((s) => s.isSimulationMode);
 const isPro = useAppStore((s) => s.isPro);
 const freeFeatureCredits = useAppStore((s) => s.freeFeatureCredits);
 const usedFreeFeatureIds = useAppStore((s) => s.usedFreeFeatureIds);
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
 const statusStr = newTargetState ? t('bento.enabled') : t('bento.disabled');
 const successTag = t('common.successTag');
 setCodingToastMessage(`${successTag} "${featureName}" ${statusStr}.`);
 setTimeout(() => setCodingToastMessage(null), 3500);
 } catch (err) {
 console.warn('[FeatureActivationModal] Toggle failed:', err);
 const errorTag = t('common.errorTag');
 setCodingToastMessage(`${errorTag} ${t('features.codingFailed')}`);
 setTimeout(() => setCodingToastMessage(null), 3500);
 } finally {
 setActiveCodingId(null);
 }
 };

 const handleToggleFeature = async (feature: OEMFeatureDefinition, customPayloadHex?: string) => {
    const inSim = isSimulationMode || useAppStore.getState().isSimulationMode;
    const storeState = useAppStore.getState();
    const isUserPro = storeState.isPro;
    const usedIds = storeState.usedFreeFeatureIds || [];
    const credits = storeState.freeFeatureCredits ?? 1;

    // Check Free Trial vs PRO gate
    const isFeatureAlreadyUnlockedFree = usedIds.includes(feature.id);
    const isFreeCreditAvailable = credits > 0;
    const isFreeEligible = isFeatureAlreadyUnlockedFree || isFreeCreditAvailable;

    if (!isUserPro && !isFreeEligible && !inSim) {
      if (onOpenPaywall) {
        onClose();
        onOpenPaywall();
      } else {
        Alert.alert(
          t('features.freeTrialExhaustedTitle', { defaultValue: 'Ücretsiz Kodlama Hakkı Kullanıldı' }),
          t('features.freeTrialExhaustedMsg', { defaultValue: '1 adet ücretsiz gizli özellik açma hakkınızı kullandınız. Bu ve diğer tüm özellikleri sınırsız açmak, uzman kodlama ve servis sıfırlama için PRO sürüme geçin!' }),
          [
            { text: t('common.cancel', { defaultValue: 'Vazgeç' }), style: 'cancel' },
            { 
              text: t('features.upgradeToPro', { defaultValue: 'PRO\'YA GEÇ' }), 
              onPress: () => {
                onClose();
                onOpenPaywall?.();
              } 
            }
          ]
        );
      }
      return;
    }

    // 0. Clone Adapter Safety Gate Check (Bypassed in Demo Mode)
    if (isCloneDevice && !inSim) {
      Alert.alert(
        t('features.cloneAlertTitle'),
        t('features.cloneAlertMsg'),
        [{ text: t('common.ok'), style: 'cancel' }]
      );
      return;
    }

    // 1. Vehicle & ECU Compatibility Check (Bypassed in Demo Mode)
    if (!inSim) {
      const isSupported = featureActivationEngine.checkVehicleSupport(feature.make, connectedVehicleMake);
      if (!isSupported) {
        Alert.alert(
          ' ' + t('features.unsupportedTitle'),
          t('features.unsupportedMsg', 'This feature is not supported by your vehicle\'s ECU hardware or software version.'),
          [{ text: t('common.ok'), style: 'cancel' }]
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
        let title = t('features.safetyAlertTitle');
        let message = errMsg;

        if (errMsg.includes('UNSAFE_MODULE_WRITE')) {
          title = t('features.unsafeModuleTitle');
          message = t('features.unsafeModuleMsg');
        } else if (errMsg.includes('LOW_VOLTAGE')) {
          title = t('features.lowVoltageTitle');
          message = t('features.lowVoltageMsg');
        } else if (errMsg.includes('VEHICLE_IN_MOTION')) {
          title = t('features.motionAlertTitle');
          message = t('features.motionAlertMsg');
        } else if (errMsg.includes('ENGINE_RUNNING')) {
          title = t('features.engineRunningTitle');
          message = t('features.engineRunningMsg');
        }

        Alert.alert(title, message, [{ text: t('common.ok'), style: 'cancel' }]);
        return;
      }
    }

    if (!isDisclaimerAccepted && !inSim) {
      setPendingDisclaimerFeature(feature);
      return;
    }

    const isConsumingNewCredit = !isUserPro && !isFeatureAlreadyUnlockedFree;
    try {
      if (isConsumingNewCredit || isFeatureAlreadyUnlockedFree) {
        useAppStore.getState().setActiveFreeTrialExecution(true);
      }
      await executeToggleFeature(feature, customPayloadHex);
      if (isConsumingNewCredit) {
        useAppStore.getState().useFreeFeatureCredit(feature.id);
        Alert.alert(
          t('features.freeTrialSuccessTitle', { defaultValue: 'Tebrikler! Özellik Aktifleştirildi' }),
          t('features.freeTrialSuccessMsg', { defaultValue: '1 adet ücretsiz deneme hakkınızla bu özellik aracınıza başarıyla kodlandı! Diğer tüm özellikleri sınırsız açmak için dilediğiniz zaman PRO sürüme geçebilirsiniz.' }),
          [{ text: t('common.gotIt', { defaultValue: 'Harika' }) }]
        );
      }
    } finally {
      useAppStore.getState().setActiveFreeTrialExecution(false);
    }
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
 t('features.cloneAlertTitle'),
 t('features.cloneAlertMsg'),
 [{ text: t('common.ok'), style: 'cancel' }]
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
 ' ' + t('features.restoreSuccessTitle'),
 t('features.restoreSuccessMsg')
 );
 }, 500);
 };

 const handleCloseModal = () => {
 if (onClose) {
 onClose();
 }
 };

 const getCategoryLabel = (cat: FeatureCategory): string => {
 const found = CATEGORY_FILTERS.find(c => c.id === cat);
 if (found) {
 return String(t(found.labelKey, { defaultValue: found.defaultLabel }));
 }
 switch (cat) {
 case 'LIGHTING': return String(t('features.catLighting', { defaultValue: 'AYDINLATMA' }));
 case 'SOUND_ALERTS': return String(t('features.catSound', { defaultValue: 'SES & UYARILAR' }));
 case 'DISPLAY_INSTRUMENT': return String(t('features.catDisplay', { defaultValue: 'GÖSTERGE PANELİ' }));
 case 'DRIVING_COMFORT': return String(t('features.catComfort', { defaultValue: 'SÜRÜŞ KONFORU' }));
 case 'SECURITY_SAFETY': return String(t('features.catSafety', { defaultValue: 'GÜVENLİK' }));
 case 'MOTORCYCLE_ECU': return String(t('features.catMotorcycle', { defaultValue: 'MOTOSİKLET ECU' }));
 case 'RETROFIT_INTEGRATION': return String(t('features.catRetrofit', { defaultValue: 'DONANIM' }));
 case 'EV_BATTERY_CHARGING': return String(t('features.catEv', { defaultValue: 'EV & BATARYA' }));
 case 'ADAS_CALIBRATION': return String(t('features.catAdas', { defaultValue: 'ADAS' }));
 case 'EASTER_EGG_FUN': return String(t('features.catEasterEgg', { defaultValue: 'GİZLİ ÖZELLİKLER' }));
 case 'SERVICE_MAINTENANCE': return String(t('features.catService', { defaultValue: 'SERVİS & BAKIM' }));
 case 'PERFORMANCE': return String(t('features.catPerformance', { defaultValue: 'PERFORMANS' }));
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
 {t('features.cloneLockedBanner').toUpperCase()}
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
 ? String(t('features.demoModeVehicle', { make: selectedBrand === 'ALL' ? t('features.allMakes') : selectedBrand.toUpperCase(), defaultValue: `DEMO MODE: ${selectedBrand === 'ALL' ? 'ALL MAKES & ECUs' : selectedBrand.toUpperCase()}` })) 
 : String(t('features.waitingVehicle'))}
 </Text>
 <Text numberOfLines={1} style={{ color: colors.textSec, fontSize: scaleFont(9), fontFamily: MONO, marginTop: 2 }}>
 {connectedVehicleMake 
 ? String(t('features.activeFeaturesCount', { count: filteredFeatures.length, defaultValue: `${filteredFeatures.length} vehicle OEM hidden features active` }))
 : isSimulationMode 
 ? String(t('features.demoFeaturesCount', { count: filteredFeatures.length, defaultValue: `${filteredFeatures.length} demo features listed` }))
 : String(t('features.connectForFeaturesNote'))}
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
 placeholder={t('features.searchPlaceholder')}
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
 <Text style={{ color: colors.textSec, fontSize: scaleFont(12) }}></Text>
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

 {/* Render Full Visual Long Coding Modal when Expert Mode is triggered */}
 {isExpertMode && (
 <ExpertLongCodingModal
 visible={isExpertMode}
 onClose={() => setIsExpertMode(false)}
 onExecuteWrite={async (didHex, payloadHex) => {
 await executeToggleFeature({
 id: `expert_${didHex}`,
 nameKey: 'Expert Write',
 descKey: 'Raw DID Write',
 defaultName: `Raw DID Write 0x${didHex}`,
 defaultDesc: `Direct write payload 0x${payloadHex} to DID 0x${didHex}`,
 make: connectedVehicleMake || 'Generic',
 category: 'SERVICE_MAINTENANCE',
 targetEcuHeader: '09',
 didHex: didHex,
 byteIndex: 0,
 bitIndex: 0,
 requiresSecurityAccess: true,
 requiresExtendedSession: true,
 safetyLevel: 'LEVEL_2_ADAPTATION',
 riskLevel: 'HIGH'
 }, payloadHex);
 }}
 currentVoltage={effectiveVoltage}
 isSimulationMode={isSimulationMode}
 connectedVehicleMake={connectedVehicleMake || 'Generic'}
 initialDid={customDidInput || '0100'}
 initialHexValue={customValueInput || '00000000'}
 />
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
 {t('features.noMatchingFeatures')}
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
 {item.riskLevel === 'HIGH' ? t('features.riskHigh') : item.riskLevel === 'MEDIUM' ? t('features.riskMedium') : t('features.riskLow')}
 </Text>
 </View>

 {/* Free Trial / PRO Status Pill */}
 {!isPro && (
   usedFreeFeatureIds?.includes(item.id) ? (
     <View style={{ backgroundColor: `${colors.green}22`, paddingHorizontal: scaleWidth(6), paddingVertical: scaleHeight(2), borderRadius: scaleMod(4), borderWidth: 1, borderColor: `${colors.green}60` }}>
       <Text style={{ color: colors.green, fontSize: scaleFont(8), fontWeight: '900', fontFamily: MONO }}>
         {t('features.freeTrialUsedBadge', { defaultValue: 'ÜCRETSİZ HAK İLE AÇIK' })}
       </Text>
     </View>
   ) : (freeFeatureCredits ?? 1) > 0 ? (
     <View style={{ backgroundColor: `${colors.cyan}22`, paddingHorizontal: scaleWidth(6), paddingVertical: scaleHeight(2), borderRadius: scaleMod(4), borderWidth: 1, borderColor: `${colors.cyan}60` }}>
       <Text style={{ color: colors.cyan, fontSize: scaleFont(8), fontWeight: '900', fontFamily: MONO }}>
         {t('features.freeTrialAvailableBadge', { defaultValue: '1 ÜCRETSİZ HAK' })}
       </Text>
     </View>
   ) : (
     <View style={{ backgroundColor: `${colors.purple || '#9c27b0'}22`, paddingHorizontal: scaleWidth(6), paddingVertical: scaleHeight(2), borderRadius: scaleMod(4), borderWidth: 1, borderColor: `${colors.purple || '#9c27b0'}60` }}>
       <Text style={{ color: colors.purple || '#ab47bc', fontSize: scaleFont(8), fontWeight: '900', fontFamily: MONO }}>
         {t('features.proRequiredBadge', { defaultValue: 'PRO' })}
       </Text>
     </View>
   )
 )}

 {/* SFD Protection Badge */}
 {item.sfdProtected && (
 <View style={{ backgroundColor: '#ff990022', paddingHorizontal: scaleWidth(6), paddingVertical: scaleHeight(2), borderRadius: scaleMod(4), borderWidth: 1, borderColor: colors.amber }}>
 <Text style={{ color: colors.amber, fontSize: scaleFont(8), fontWeight: '900', fontFamily: MONO }}>
 {t('features.sfdProtected')}
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
 {(isCloneDevice && !isSimulationMode) ? t('features.codeBtn') : (isEnabled ? t('features.removeBtn') : t('features.codeBtn'))}
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
 {t('features.restoreBtn')}
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
 {t(selectedDetailFeature.nameKey, { defaultValue: selectedDetailFeature.defaultName })}
 </Text>
 </View>
 <TouchableOpacity
 onPress={() => setSelectedDetailFeature(null)}
 style={{
 backgroundColor: `${colors.border}80`,
 width: scaleMod(32),
 height: scaleMod(32),
 borderRadius: scaleMod(16),
 alignItems: 'center',
 justifyContent: 'center',
 borderWidth: 1,
 borderColor: colors.border
 }}
 >
 <Text style={{ color: colors.textPri, fontWeight: '900', fontSize: scaleFont(16), lineHeight: scaleFont(18) }}>✕</Text>
 </TouchableOpacity>
 </View>

 <ScrollView showsVerticalScrollIndicator={false}>
 {/* Description */}
 <Text style={{ color: colors.textSec, fontSize: scaleFont(12), fontFamily: MONO, lineHeight: scaleFont(18), marginBottom: scaleHeight(14) }}>
 {t(selectedDetailFeature.descKey, { defaultValue: selectedDetailFeature.defaultDesc })}
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
 {t('features.techEcuSpecs')}
 </Text>
 <View style={{ gap: scaleHeight(4) }}>
 <Text style={{ color: colors.textPri, fontSize: scaleFont(10), fontFamily: MONO }}>
 • {t('features.targetEcuHeaderLabel')} <Text style={{ fontWeight: '900', color: colors.cyan }}>{selectedDetailFeature.targetEcuHeader}</Text>
 </Text>
 <Text style={{ color: colors.textPri, fontSize: scaleFont(10), fontFamily: MONO }}>
 • {t('features.udsDidLabel')} <Text style={{ fontWeight: '900', color: colors.cyan }}>0x{selectedDetailFeature.didHex}</Text>
 </Text>
 <Text style={{ color: colors.textPri, fontSize: scaleFont(10), fontFamily: MONO }}>
 • {t('features.bitPositionLabel')} {t('features.byteBitValue', { byte: selectedDetailFeature.byteIndex, bit: selectedDetailFeature.bitIndex, defaultValue: `Byte ${selectedDetailFeature.byteIndex}, Bit ${selectedDetailFeature.bitIndex}` })}
 </Text>
 <Text style={{ color: colors.textPri, fontSize: scaleFont(10), fontFamily: MONO }}>
 • {t('features.targetPayloadLabel')} <Text style={{ fontWeight: '900', color: colors.green }}>2E {selectedDetailFeature.didHex} {selectedOptionHex || (storeEnabledFeatures[selectedDetailFeature.id] ? '00' : '01')}</Text>
 </Text>
 </View>
 </View>

 {/* Multi-Option Selector if present */}
 {selectedDetailFeature.options && selectedDetailFeature.options.length > 0 && (
 <View style={{ marginBottom: scaleHeight(16) }}>
 <Text style={{ color: colors.textPri, fontWeight: '900', fontSize: scaleFont(11), fontFamily: MONO, marginBottom: scaleHeight(8) }}>
 {t('features.selectOption')}
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
 {t(opt.labelKey, { defaultValue: opt.defaultLabel })}
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
 {storeEnabledFeatures[selectedDetailFeature.id] ? t('features.removeBtn') : t('features.oneClickActivate')}
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
