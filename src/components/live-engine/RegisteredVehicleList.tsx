import React from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { SelectedVehicle } from '../../store/garageStore';
import { getLocalizedVehicleBrand, getLocalizedVehicleModel } from '../../utils/vehicleStandardizer';
import { useTranslation } from 'react-i18next';
import VehicleOperationsHistory from './VehicleOperationsHistory';

interface RegisteredVehicleListProps {
 registeredVehicles: SelectedVehicle[];
 onSelect: (v: SelectedVehicle) => void;
 onDelete: (v: SelectedVehicle) => void;
 onBack: () => void;
 colors: any;
 sDyn: any;
 scaleFont: (size: number) => number;
 scaleMod: (size: number) => number;
 scaleWidth: (size: number) => number;
 scaleHeight: (size: number) => number;
 MONO: string;
 appLocale: string;
}

export default function RegisteredVehicleList({
 registeredVehicles,
 onSelect,
 onDelete,
 onBack,
 colors,
 sDyn,
 scaleFont,
 scaleMod,
 scaleWidth,
 scaleHeight,
 MONO,
 appLocale,
}: RegisteredVehicleListProps) {
 const { t } = useTranslation();

 return (
 <View style={{ gap: scaleHeight(12) }}>
 <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: scaleHeight(4) }}>
 <Text style={sDyn.vehicleLabel}>{t('vehicleSelect.registeredVehicles').toUpperCase()}</Text>
 <TouchableOpacity 
 onPress={onBack}
 style={{ paddingHorizontal: 12, paddingVertical: 6, backgroundColor: `${colors.textPri}14`, borderRadius: 6 }}
 activeOpacity={0.4}
 >
 <Text style={{ color: colors.textPri, fontFamily: MONO, fontSize: scaleFont(10), fontWeight: 'bold' }}>
 {t('common.back').toUpperCase()}
 </Text>
 </TouchableOpacity>
 </View>
 
 <ScrollView style={{ maxHeight: scaleHeight(260) }} nestedScrollEnabled={true} keyboardShouldPersistTaps="handled">
 {registeredVehicles.length === 0 ? (
 <View style={{ padding: scaleMod(20), alignItems: 'center', justifyContent: 'center' }}>
 <Text style={{ color: colors.textSec, fontFamily: MONO, fontSize: scaleFont(11), textAlign: 'center' }}>
 {t('vehicleSelect.noRegisteredVehicles')}
 </Text>
 </View>
 ) : (
 registeredVehicles.map((v, i) => (
 <View 
 key={i}
 style={{ 
 flexDirection: 'column',
 backgroundColor: `${colors.textPri}05`,
 borderColor: colors.cardBorder,
 borderWidth: 1.2,
 borderRadius: 10,
 padding: scaleMod(12),
 marginBottom: scaleHeight(8),
 }}
 >
 <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
 <TouchableOpacity 
 style={{ flex: 1, marginEnd: 12 }}
 onPress={() => onSelect(v)}
 activeOpacity={0.4}
 >
 <Text style={{ color: colors.textPri, fontFamily: MONO, fontSize: scaleFont(12), fontWeight: '800' }} numberOfLines={1}>
 {getLocalizedVehicleBrand(v.brand, t)} {getLocalizedVehicleModel(v.model)}
 </Text>
 <Text style={{ color: colors.cyan, fontFamily: MONO, fontSize: scaleFont(10), marginTop: 2, fontWeight: '700' }}>
 {v.year}
 </Text>
 {v.vin && (
 <Text style={{ color: colors.textSec, fontFamily: MONO, fontSize: scaleFont(9.5), marginTop: 2 }}>
 {t('common.chassis')}: {v.vin}
 </Text>
 )}
 </TouchableOpacity>
 
 <TouchableOpacity 
 onPress={() => onDelete(v)}
 style={{ 
 backgroundColor: `${colors.red}1A`, 
 borderColor: `${colors.red}4D`,
 borderWidth: 1,
 paddingHorizontal: scaleWidth(10), 
 paddingVertical: scaleHeight(6), 
 borderRadius: 6,
 }}
 activeOpacity={0.4}
 >
 <Text style={{ color: colors.red, fontFamily: MONO, fontSize: scaleFont(9.5), fontWeight: '900' }}>
 {t('common.delete').toUpperCase()}
 </Text>
 </TouchableOpacity>
 </View>
 <VehicleOperationsHistory vin={v.vin} colors={colors} scaleFont={scaleFont} MONO={MONO} appLocale={appLocale} />
 </View>
 ))
 )}
 </ScrollView>
 </View>
 );
}
