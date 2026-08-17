import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useBluetoothStore } from '../../store/useBluetoothStore';

interface EcuStatusBarProps {
 ecuStatus: string;
 connectionState: string;
 connectionProgress: number;
 adapterStatus: string;
 retryEcu: () => void;
 disconnect: () => void;
 colors: any;
 scaleFont: (size: number) => number;
 scaleMod: (size: number) => number;
 scaleWidth: (size: number) => number;
 scaleHeight: (size: number) => number;
 MONO: string;
}

export default function EcuStatusBar({
 ecuStatus,
 connectionState,
 connectionProgress,
 adapterStatus,
 retryEcu,
 disconnect,
 colors,
 scaleFont,
 scaleMod,
 scaleWidth,
 scaleHeight,
 MONO,
}: EcuStatusBarProps) {
 const { t } = useTranslation();

 return (
 <View style={{ minHeight: scaleHeight(130), justifyContent: 'center' }}>
 {/* ECU Connecting Stage */}
 {ecuStatus === 'connecting' && (
 <View style={{ alignItems: 'center', justifyContent: 'center', gap: scaleHeight(8), marginVertical: scaleHeight(8), width: '100%' }}>
 {adapterStatus === 'connected' && (
 <View style={{
 backgroundColor: `${colors.green}18`,
 borderColor: colors.green,
 borderWidth: 1.5,
 borderRadius: scaleMod(12),
 padding: scaleMod(12),
 flexDirection: 'row',
 alignItems: 'center',
 justifyContent: 'center',
 gap: scaleMod(8),
 width: '100%',
 marginBottom: scaleHeight(12)
 }}>
 <View style={{ width: scaleMod(8), height: scaleMod(8), borderRadius: scaleMod(4), backgroundColor: colors.green }} />
 <Text style={{ color: colors.green, fontFamily: MONO, fontSize: scaleFont(11), fontWeight: '900', letterSpacing: 0.5 }}>
 {t('connection.adapterConnected').toUpperCase()}
 </Text>
 </View>
 )}
 <View style={{ width: '100%', height: scaleHeight(8), backgroundColor: `${colors.amber}20`, borderRadius: 4, overflow: 'hidden', marginVertical: scaleHeight(8) }}>
 <View style={{ width: `${connectionProgress}%`, height: '100%', backgroundColor: colors.amber, borderRadius: 4 }} />
 </View>
 <Text style={{ color: colors.amber, fontFamily: MONO, fontSize: scaleFont(11), fontWeight: 'bold', textAlign: 'center' }}>
 {connectionState === 'CONNECTING' && `${t('connection.ecuWait')} [1/5]`}
 {connectionState === 'ADAPTER_CONNECTED' && t('connection.adapterApproved')}
 {connectionState === 'PROTOCOL_NEGOTIATING' && t('connection.protocolNegotiating')}
 {connectionState === 'ECU_DETECTED' && t('connection.ecuDetected')}
 {connectionState === 'ECU_RESPONDING' && t('connection.ecuResponding')}
 {!['CONNECTING', 'ADAPTER_CONNECTED', 'PROTOCOL_NEGOTIATING', 'ECU_DETECTED', 'ECU_RESPONDING'].includes(connectionState) && t('connection.ecuWait')}
 </Text>
 {connectionState === 'PROTOCOL_NEGOTIATING' && (
 <Text style={{ color: colors.textSec, fontFamily: MONO, fontSize: scaleFont(9), textAlign: 'center', marginTop: 4 }}>
 {t('connection.protocolScanningHint')}
 </Text>
 )}
 </View>
 )}

 {/* ECU Connection Failure / Retry */}
 {ecuStatus === 'error' && (
 <View style={{ alignItems: 'center', marginVertical: scaleHeight(8), gap: scaleHeight(10) }}>
 <Text style={{ color: colors.red, fontFamily: MONO, fontSize: scaleFont(11), fontWeight: 'bold', textAlign: 'center', lineHeight: scaleHeight(15) }}>
 {connectionState === 'PROTOCOL_FAILED' && t('connection.protocolFailed')}
 {connectionState === 'ECU_NOT_FOUND' && t('connection.ecuNotFound')}
 {connectionState === 'HARDWARE_FATAL' && t('connection.hardwareFatal')}
 {connectionState !== 'PROTOCOL_FAILED' && connectionState !== 'ECU_NOT_FOUND' && connectionState !== 'HARDWARE_FATAL' && ` ${t('connection.ecuNoResponse')}`}
 </Text>
 
 <Text style={{ color: colors.textSec, fontFamily: MONO, fontSize: scaleFont(10), textAlign: 'center' }}>
 {t('connection.hardwareCapabilityScore', { score: useBluetoothStore.getState().adapterCapabilityScore })}
 </Text>

 <View style={{ flexDirection: 'row', gap: scaleMod(8) }}>
 <TouchableOpacity 
 style={{
 backgroundColor: colors.amber,
 borderRadius: scaleMod(8),
 paddingVertical: scaleHeight(10),
 paddingHorizontal: scaleWidth(16),
 alignItems: 'center',
 justifyContent: 'center',
 }}
 onPress={retryEcu}
 activeOpacity={0.4}
 >
 <Text style={{ color: colors.statusBarStyle === 'light-content' ? '#000000' : '#ffffff', fontSize: scaleFont(10.5), fontWeight: '900', fontFamily: MONO }}>
 {t('connection.retry').toUpperCase()}
 </Text>
 </TouchableOpacity>

 <TouchableOpacity 
 style={{
 backgroundColor: `${colors.textPri}14`,
 borderColor: `${colors.textPri}33`,
 borderWidth: 1,
 borderRadius: scaleMod(8),
 paddingVertical: scaleHeight(10),
 paddingHorizontal: scaleWidth(16),
 alignItems: 'center',
 justifyContent: 'center',
 }}
 onPress={disconnect}
 activeOpacity={0.4}
 >
 <Text style={{ color: colors.textPri, fontSize: scaleFont(10.5), fontWeight: '800', fontFamily: MONO }}>
 {t('common.cancel').toUpperCase()}
 </Text>
 </TouchableOpacity>
 </View>
 </View>
 )}
 </View>
 );
}
