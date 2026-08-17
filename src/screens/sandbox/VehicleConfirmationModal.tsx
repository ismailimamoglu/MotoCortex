import React, { useState } from 'react';
import {
 View,
 Text,
 TouchableOpacity,
 Modal,
 StyleSheet,
 ScrollView,
 TextInput,
 KeyboardAvoidingView,
 Platform,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { scale, verticalScale, moderateScale } from 'react-native-size-matters';
import { useThemeColors } from '../../theme';
import { SuggestedVehicleProfile } from '../../store/useBluetoothStore';

interface VehicleConfirmationModalProps {
 visible: boolean;
 profile: SuggestedVehicleProfile | null;
 onConfirm: (finalProfile: SuggestedVehicleProfile) => void;
 onCancel: () => void;
}

export default function VehicleConfirmationModal({
 visible,
 profile,
 onConfirm,
 onCancel,
}: VehicleConfirmationModalProps) {
 const { t, i18n } = useTranslation();
 const colors = useThemeColors();

 const [isEditing, setIsEditing] = useState(false);
 
 // Form fields for editing/fallback mode
 const [make, setMake] = useState('');
 const [model, setModel] = useState('');
 const [year, setYear] = useState('');
 const [fuelType, setFuelType] = useState<string | null>(null);
 const [transmission, setTransmission] = useState<string | null>(null);

 // Sync initial state when profile changes or edit mode is entered
 React.useEffect(() => {
 if (profile) {
 setMake(profile.make);
 setModel(profile.model);
 setYear(profile.year.toString());
 setFuelType(profile.fuelType);
 setTransmission(profile.transmission);
 }
 }, [profile, isEditing]);

 if (!profile) return null;

 const activeLang = i18n.language || 'en';

 const toggleLanguage = () => {
 const nextLang = activeLang.startsWith('tr') ? 'en' : 'tr';
 i18n.changeLanguage(nextLang);
 };

 const handleConfirmAction = () => {
 if (isEditing) {
 onConfirm({
 make: make.trim().toUpperCase(),
 model: model.trim().toUpperCase(),
 year: parseInt(year) || profile.year,
 fuelType,
 transmission,
 confidence: 1.0, // User override is 100% confident
 });
 } else {
 onConfirm(profile);
 }
 setIsEditing(false);
 };

 const s = StyleSheet.create({
 overlay: {
 flex: 1,
 backgroundColor: 'rgba(0,0,0,0.75)',
 justifyContent: 'center',
 alignItems: 'center',
 padding: scale(16),
 },
 card: {
 backgroundColor: colors.card,
 borderRadius: moderateScale(16),
 borderWidth: 1.5,
 borderColor: colors.border,
 width: '100%',
 maxWidth: scale(360),
 padding: scale(16),
 overflow: 'hidden',
 },
 header: {
 flexDirection: 'row',
 justifyContent: 'space-between',
 alignItems: 'center',
 marginBottom: verticalScale(16),
 borderBottomWidth: 1,
 borderBottomColor: `${colors.border}44`,
 paddingBottom: verticalScale(8),
 },
 title: {
 fontSize: scale(16),
 fontWeight: '900',
 color: colors.cyan,
 letterSpacing: 0.5,
 },
 langBtn: {
 backgroundColor: `${colors.cyan}15`,
 borderWidth: 1,
 borderColor: colors.cyan,
 borderRadius: moderateScale(6),
 paddingHorizontal: scale(8),
 paddingVertical: verticalScale(4),
 },
 langBtnText: {
 color: colors.cyan,
 fontSize: scale(11),
 fontWeight: '800',
 },
 desc: {
 fontSize: scale(12),
 color: colors.textSec,
 lineHeight: verticalScale(16),
 marginBottom: verticalScale(16),
 },
 infoGrid: {
 backgroundColor: `${colors.border}15`,
 borderRadius: moderateScale(12),
 padding: scale(12),
 gap: verticalScale(8),
 marginBottom: verticalScale(20),
 },
 infoRow: {
 flexDirection: 'row',
 justifyContent: 'space-between',
 alignItems: 'center',
 },
 infoLabel: {
 fontSize: scale(12),
 color: colors.textSec,
 fontWeight: '600',
 },
 infoValue: {
 fontSize: scale(12),
 color: colors.textPri,
 fontWeight: '800',
 },
 // Form styles for editing mode
 formScroll: {
 maxHeight: verticalScale(280),
 marginBottom: verticalScale(16),
 },
 inputGroup: {
 marginBottom: verticalScale(12),
 },
 inputLabel: {
 fontSize: scale(11),
 color: colors.textSec,
 marginBottom: verticalScale(4),
 fontWeight: '700',
 },
 textInput: {
 backgroundColor: colors.bg,
 borderWidth: 1.2,
 borderColor: colors.border,
 borderRadius: moderateScale(8),
 paddingHorizontal: scale(12),
 paddingVertical: verticalScale(8),
 color: colors.textPri,
 fontSize: scale(12),
 },
 optionContainer: {
 flexDirection: 'row',
 gap: scale(8),
 marginTop: verticalScale(4),
 },
 optionBtn: {
 flex: 1,
 borderWidth: 1.2,
 borderColor: colors.border,
 borderRadius: moderateScale(8),
 paddingVertical: verticalScale(8),
 alignItems: 'center',
 backgroundColor: colors.bg,
 },
 optionBtnActive: {
 borderColor: colors.cyan,
 backgroundColor: `${colors.cyan}12`,
 },
 optionBtnText: {
 color: colors.textSec,
 fontSize: scale(11),
 fontWeight: '700',
 },
 optionBtnTextActive: {
 color: colors.cyan,
 fontWeight: '800',
 },
 // Action buttons
 actions: {
 flexDirection: 'row',
 gap: scale(12),
 },
 btnConfirm: {
 flex: 2,
 backgroundColor: colors.cyan,
 borderRadius: moderateScale(10),
 paddingVertical: verticalScale(12),
 alignItems: 'center',
 justifyContent: 'center',
 },
 btnConfirmText: {
 color: '#000000',
 fontSize: scale(12),
 fontWeight: '900',
 letterSpacing: 0.5,
 },
 btnEdit: {
 flex: 1,
 borderWidth: 1.5,
 borderColor: colors.textSec,
 borderRadius: moderateScale(10),
 paddingVertical: verticalScale(12),
 alignItems: 'center',
 justifyContent: 'center',
 },
 btnEditText: {
 color: colors.textPri,
 fontSize: scale(12),
 fontWeight: '800',
 },
 });

 return (
 <Modal
 visible={visible}
 transparent
 animationType="fade"
 statusBarTranslucent
 >
 <KeyboardAvoidingView
 style={{ flex: 1 }}
 behavior={Platform.OS === 'ios' ? 'padding' : undefined}
 >
 <View style={s.overlay}>
 <View style={s.card}>
 {/* Header with Language Selector */}
 <View style={s.header}>
 <Text numberOfLines={1} ellipsizeMode="tail" style={s.title}>
 {isEditing ? t('vehicle.editTitle').toUpperCase() : t('vehicle.detectTitle').toUpperCase()}
 </Text>
 <TouchableOpacity style={s.langBtn} onPress={toggleLanguage}>
 <Text style={s.langBtnText}>
 {activeLang.startsWith('tr') ? 'EN ' : 'TR '}
 </Text>
 </TouchableOpacity>
 </View>

 {!isEditing ? (
 // Display mode
 <View>
 <Text style={s.desc}>
 {t('vehicle.detectDesc', 'This vehicle information was automatically detected from your vehicle\'s ECU. Please confirm its accuracy.')}
 </Text>
 
 <View style={s.infoGrid}>
 <View style={s.infoRow}>
 <Text style={s.infoLabel}>{t('vehicle.brand')}</Text>
 <Text style={s.infoValue}>{profile.make}</Text>
 </View>
 <View style={s.infoRow}>
 <Text style={s.infoLabel}>{t('vehicle.model')}</Text>
 <Text style={s.infoValue}>{profile.model}</Text>
 </View>
 <View style={s.infoRow}>
 <Text style={s.infoLabel}>{t('vehicle.year')}</Text>
 <Text style={s.infoValue}>{profile.year}</Text>
 </View>
 <View style={s.infoRow}>
 <Text style={s.infoLabel}>{t('vehicle.fuelType')}</Text>
 <Text style={s.infoValue}>{profile.fuelType ? t(`vehicle.fuel.${profile.fuelType.toLowerCase()}`, profile.fuelType) : t('vehicle.unknown')}</Text>
 </View>
 <View style={s.infoRow}>
 <Text style={s.infoLabel}>{t('vehicle.transmission')}</Text>
 <Text style={s.infoValue}>{profile.transmission ? t(`vehicle.transmission.${profile.transmission.toLowerCase()}`, profile.transmission) : t('vehicle.unknown')}</Text>
 </View>
 </View>
 </View>
 ) : (
 // Edit mode
 <ScrollView style={s.formScroll} showsVerticalScrollIndicator={false}>
 <View style={s.inputGroup}>
 <Text style={s.inputLabel}>{t('vehicle.brand')}</Text>
 <TextInput
 style={s.textInput}
 value={make}
 onChangeText={setMake}
 placeholder="E.g. DACIA"
 placeholderTextColor={colors.textSec}
 autoCapitalize="characters"
 />
 </View>
 <View style={s.inputGroup}>
 <Text style={s.inputLabel}>{t('vehicle.model')}</Text>
 <TextInput
 style={s.textInput}
 value={model}
 onChangeText={setModel}
 placeholder="E.g. LOGAN"
 placeholderTextColor={colors.textSec}
 autoCapitalize="characters"
 />
 </View>
 <View style={s.inputGroup}>
 <Text style={s.inputLabel}>{t('vehicle.year')}</Text>
 <TextInput
 style={s.textInput}
 value={year}
 onChangeText={setYear}
 placeholder="E.g. 2011"
 placeholderTextColor={colors.textSec}
 keyboardType="number-pad"
 maxLength={4}
 />
 </View>
 <View style={s.inputGroup}>
 <Text style={s.inputLabel}>{t('vehicle.fuelType')}</Text>
 <View style={s.optionContainer}>
 <TouchableOpacity
 style={[s.optionBtn, fuelType === 'GASOLINE' && s.optionBtnActive]}
 onPress={() => setFuelType('GASOLINE')}
 >
 <Text style={[s.optionBtnText, fuelType === 'GASOLINE' && s.optionBtnTextActive]}>
 {t('vehicle.fuel.gasoline')}
 </Text>
 </TouchableOpacity>
 <TouchableOpacity
 style={[s.optionBtn, fuelType === 'DIESEL' && s.optionBtnActive]}
 onPress={() => setFuelType('DIESEL')}
 >
 <Text style={[s.optionBtnText, fuelType === 'DIESEL' && s.optionBtnTextActive]}>
 {t('vehicle.fuel.diesel')}
 </Text>
 </TouchableOpacity>
 </View>
 </View>
 <View style={s.inputGroup}>
 <Text style={s.inputLabel}>{t('vehicle.transmission')}</Text>
 <View style={s.optionContainer}>
 <TouchableOpacity
 style={[s.optionBtn, transmission === 'MANUAL' && s.optionBtnActive]}
 onPress={() => setTransmission('MANUAL')}
 >
 <Text style={[s.optionBtnText, transmission === 'MANUAL' && s.optionBtnTextActive]}>
 {t('vehicle.transmission.manual')}
 </Text>
 </TouchableOpacity>
 <TouchableOpacity
 style={[s.optionBtn, transmission === 'AUTOMATIC' && s.optionBtnActive]}
 onPress={() => setTransmission('AUTOMATIC')}
 >
 <Text style={[s.optionBtnText, transmission === 'AUTOMATIC' && s.optionBtnTextActive]}>
 {t('vehicle.transmission.automatic')}
 </Text>
 </TouchableOpacity>
 </View>
 </View>
 </ScrollView>
 )}

 {/* Action buttons */}
 <View style={s.actions}>
 <TouchableOpacity
 style={s.btnEdit}
 onPress={() => {
 if (isEditing) {
 setIsEditing(false);
 } else {
 setIsEditing(true);
 }
 }}
 >
 <Text style={s.btnEditText}>
 {isEditing ? t('common.back') : t('common.edit')}
 </Text>
 </TouchableOpacity>
 <TouchableOpacity
 style={s.btnConfirm}
 onPress={handleConfirmAction}
 >
 <Text style={s.btnConfirmText}>
 {isEditing ? t('common.save').toUpperCase() : t('common.confirm').toUpperCase()}
 </Text>
 </TouchableOpacity>
 </View>
 </View>
 </View>
 </KeyboardAvoidingView>
 </Modal>
 );
}
