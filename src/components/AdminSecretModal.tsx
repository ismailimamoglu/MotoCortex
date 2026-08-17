import React, { useState, useEffect, useRef } from 'react';
import {
 View,
 Text,
 StyleSheet,
 Modal,
 TouchableOpacity,
 ScrollView,
 SafeAreaView,
 Alert,
 TextInput,
 ActivityIndicator,
} from 'react-native';
import * as Sharing from 'expo-sharing';
import * as Clipboard from 'expo-clipboard';
import RNFS from 'react-native-fs';
import * as Logger from '../services/Logger';
import { useThemeColors } from '../theme';
import { useBluetoothStore } from '../store/useBluetoothStore';
import { syncManufacturerDtc } from '../services/DtcSyncService';
import { useResponsive } from '../hooks/useResponsive';
import { useAppStore } from '../store/useAppStore';
import crashlytics from '@react-native-firebase/crashlytics';
import { useTranslation } from 'react-i18next';
import OBDCommandQueue from '../api/OBDCommandQueue';

interface AdminSecretModalProps {
 visible: boolean;
 onClose: () => void;
}

export default function AdminSecretModal({ visible, onClose }: AdminSecretModalProps) {
 const { t } = useTranslation();
 const colors = useThemeColors();
 const vehicleMake = useBluetoothStore((s) => s.vehicleMake);
 const dtcSyncStatus = useBluetoothStore((s) => s.dtcSyncStatus);
 const bluetoothStatus = useBluetoothStore((s) => s.status);

 const isBackdoorPro = useAppStore((s) => s.isBackdoorPro);
 const setIsBackdoorPro = useAppStore((s) => s.setIsBackdoorPro);
 const appUserId = useAppStore((s) => s.appUserId);
 const deviceUuid = useAppStore((s) => s.deviceUuid);

 const [logs, setLogs] = useState<string>(t('admin.logsLoading'));
 const [fileSize, setFileSize] = useState<string>(t('admin.calculating'));
 const [customCommand, setCustomCommand] = useState<string>('');
 const [isExecuting, setIsExecuting] = useState<boolean>(false);
 const scrollViewRef = useRef<ScrollView | null>(null);

 const { s: scaleWidth, vs: scaleHeight, ms: scaleMod, fs: scaleFont, isTablet, isLargeTablet, width, height } = useResponsive();

 const proTapCountRef = useRef(0);
 const proTapTimerRef = useRef<NodeJS.Timeout | null>(null);

 const handleProSecretTap = () => {
 if (!__DEV__) {
 Alert.alert('admin.devModeAlert');
 return;
 }
 proTapCountRef.current += 1;
 if (proTapCountRef.current >= 7) {
 proTapCountRef.current = 0;
 if (proTapTimerRef.current) clearTimeout(proTapTimerRef.current);
 const nextPro = !isBackdoorPro;
 setIsBackdoorPro(nextPro);
 Alert.alert(
 t('admin.secretProTitle'),
 nextPro ? t('admin.secretProActive') : t('admin.secretProInactive')
 );
 return;
 }

 if (proTapTimerRef.current) clearTimeout(proTapTimerRef.current);
 proTapTimerRef.current = setTimeout(() => {
 proTapCountRef.current = 0;
 }, 2000);
 };

 const loadLogsAndInfo = async () => {
 try {
 await Logger.flush();
 const fullLog = await Logger.getLogContent();
 if (fullLog.length > 50000) {
 setLogs(t('admin.logsTruncated') + fullLog.slice(-50000));
 } else {
 setLogs(fullLog || t('admin.noLogsFound'));
 }

 const logFilePath = Logger.getLogFileUri();
 const exists = await RNFS.exists(logFilePath);
 if (exists) {
 const stat = await RNFS.stat(logFilePath);
 const size = Number(stat.size);
 const kb = (size / 1024).toFixed(2);
 setFileSize(`${kb} KB`);
 } else {
 setFileSize('0 KB');
 }
 } catch (e) {
 setLogs(t('admin.logsReadErr') + e);
 setFileSize(t('admin.unknown'));
 }
 };

 useEffect(() => {
 if (!visible) return;

 loadLogsAndInfo();
 const interval = setInterval(() => {
 loadLogsAndInfo();
 }, 1500);

 return () => clearInterval(interval);
 }, [visible]);

 const handleSendCommand = async (cmdToSend?: string) => {
 const targetCmd = (cmdToSend || customCommand).trim();
 if (!targetCmd) {
 Alert.alert('admin.invalidCmdError');
 return;
 }

 setIsExecuting(true);
 Logger.log('ADMIN_TERMINAL', `TX: ${targetCmd}`);

 try {
 if (bluetoothStatus !== 'connected') {
 setLogs((prev) => `${prev}\n[${new Date().toLocaleTimeString()}] TX > ${targetCmd} ${t('admin.deviceNotConnectedWarning')}`);
 Alert.alert(t('common.info'), `${t('admin.deviceNotConnectedAlert')}${targetCmd}`);
 } else {
 const response = await OBDCommandQueue.add(targetCmd);
 Logger.log('ADMIN_TERMINAL', `RX: ${response}`);
 setLogs((prev) => `${prev}\n[${new Date().toLocaleTimeString()}] TX > ${targetCmd}\n[${new Date().toLocaleTimeString()}] RX < ${response}`);
 }
 setCustomCommand('');
 } catch (err: any) {
 Logger.log('ADMIN_TERMINAL_ERR', `Error sending ${targetCmd}: ${err?.message || err}`);
 setLogs((prev) => `${prev}\n[${new Date().toLocaleTimeString()}] ERR > ${targetCmd}: ${err?.message || err}`);
 Alert.alert(t('admin.cmdError'), `${t('admin.ecuNoResponse')}${err?.message || err}`);
 } finally {
 setIsExecuting(false);
 setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 150);
 }
 };

 const handleShare = async () => {
 try {
 const isAvailable = await Sharing.isAvailableAsync();
 if (!isAvailable) {
 Alert.alert('obdTerminal.noShareSupport');
 return;
 }

 // Ensure buffer is flushed & file exists
 Logger.log('ADMIN_TERMINAL', 'Log export initiated');
 await Logger.flush();

 const rawPath = Logger.getLogFileUri().replace(/^file:\/\//, '');
 const exists = await RNFS.exists(rawPath);

 if (!exists) {
 Alert.alert('admin.noLogsInfo');
 return;
 }

 const fileUri = Logger.getLogFileUri();

 await Sharing.shareAsync(fileUri, {
 mimeType: 'text/plain',
 dialogTitle: t('admin.cortexTerminalLogs'),
 UTI: 'public.plain-text',
 });
 } catch (e: any) {
 Alert.alert(t('admin.shareError'), e.message || t('admin.noLogsToShare'));
 }
 };

 const handleClear = () => {
 Alert.alert(t('admin.clearLogsTitle'), t('admin.clearLogsMsg'), [
 { text: t('common.cancel'), style: 'cancel' },
 {
 text: t('admin.clearAction'),
 style: 'destructive',
 onPress: async () => {
 await Logger.clearLogs();
 setLogs(t('admin.logsCleared'));
 setFileSize('0 KB');
 },
 },
 ]);
 };

 const copyIdToClipboard = async (label: string, value: string | null) => {
 if (!value) return;
 await Clipboard.setStringAsync(value);
 Alert.alert(t('admin.copiedTitle'), t('admin.copiedMsg', { label, value }));
 };

 const presets = [
 { label: 'AT Z', cmd: 'AT Z', desc: t('admin.presetReset') },
 { label: 'AT SP 0', cmd: 'AT SP 0', desc: t('admin.presetAutoProtocol') },
 { label: '01 00', cmd: '01 00', desc: t('admin.presetSupportedPids') },
 { label: '01 0C', cmd: '01 0C', desc: t('admin.presetEngineRpm') },
 { label: '01 0D', cmd: '01 0D', desc: t('admin.presetSpeed') },
 { label: '03', cmd: '03', desc: t('admin.presetReadDtc') },
 { label: '04', cmd: '04', desc: t('admin.presetClearDtc') },
 ];

 const modalWidth = isTablet ? (isLargeTablet ? 680 : 540) : Math.min(width * 0.94, 460);
 const modalHeight = isTablet ? Math.min(height * 0.88, 750) : Math.min(height * 0.92, 680);

 return (
 <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={onClose}>
 <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.overlayHeavy }}>
 <TouchableOpacity style={StyleSheet.absoluteFillObject} activeOpacity={1} onPress={onClose} />

 <SafeAreaView style={{ width: modalWidth, height: modalHeight }}>
 <View
 style={{
 flex: 1,
 backgroundColor: colors.card,
 borderColor: colors.cyan,
 borderRadius: scaleMod(16),
 borderWidth: 1.8,
 padding: scaleMod(14),
 justifyContent: 'space-between',
 shadowColor: '#000',
 shadowOffset: { width: 0, height: 6 },
 shadowOpacity: 0.3,
 shadowRadius: 16,
 elevation: 8,
 }}
 >
 {/* Header */}
 <View
 style={{
 flexDirection: 'row',
 justifyContent: 'space-between',
 alignItems: 'center',
 borderBottomWidth: 1,
 borderBottomColor: colors.border,
 paddingBottom: scaleHeight(10),
 marginBottom: scaleHeight(10),
 }}
 >
 <TouchableOpacity onPress={handleProSecretTap} activeOpacity={0.7}>
 <Text style={{ color: colors.cyan, fontSize: scaleFont(13), fontWeight: '900', letterSpacing: 1 }}>
 CORTEX OBD2 YÖNETİCİ MENÜSÜ {isBackdoorPro ? '' : ''}
 </Text>
 <Text style={{ color: colors.textSec, fontSize: scaleFont(10), marginTop: scaleHeight(2) }}>
 Kara Kutu Boyutu: {fileSize} | Durum: {bluetoothStatus.toUpperCase()}
 </Text>
 </TouchableOpacity>
 <TouchableOpacity
 onPress={onClose}
 style={{
 backgroundColor: `${colors.cyan}18`,
 paddingHorizontal: scaleWidth(10),
 paddingVertical: scaleHeight(5),
 borderRadius: scaleMod(6),
 }}
 >
 <Text style={{ color: colors.cyan, fontSize: scaleFont(11), fontWeight: 'bold' }}>
 {t('common.close').toUpperCase()}
 </Text>
 </TouchableOpacity>
 </View>

 <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
 {/* 1. YÖNETİCİ KULLANICI KİMLİK BİLGİLERİ (Özel Admin Kartı) */}
 <View
 style={{
 backgroundColor: `${colors.amber}0b`,
 borderWidth: 1.2,
 borderColor: `${colors.amber}60`,
 borderRadius: scaleMod(12),
 padding: scaleMod(12),
 marginBottom: scaleHeight(10),
 }}
 >
 <Text
 style={{
 color: colors.amber,
 fontSize: scaleFont(10.5),
 fontWeight: '900',
 letterSpacing: 1,
 marginBottom: scaleHeight(8),
 fontFamily: colors.mono,
 }}
 >
 {t('admin.userInfo')}
 </Text>

 {/* User ID Row */}
 <TouchableOpacity
 style={{
 backgroundColor: colors.card,
 borderColor: colors.border,
 borderWidth: 1,
 borderRadius: scaleMod(8),
 paddingHorizontal: scaleWidth(10),
 paddingVertical: scaleHeight(8),
 marginBottom: scaleHeight(8),
 }}
 onPress={() => copyIdToClipboard('User ID', appUserId)}
 activeOpacity={0.7}
 >
 <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: scaleHeight(4) }}>
 <Text style={{ color: colors.textSec, fontSize: scaleFont(9.5), fontFamily: colors.mono, fontWeight: '800', letterSpacing: 0.5 }}>
 {t('admin.userId')}
 </Text>
 <View style={{ flexDirection: 'row', alignItems: 'center', gap: scaleWidth(4) }}>
 <Text style={{ color: colors.cyan, fontSize: scaleFont(9), fontFamily: colors.mono, fontWeight: 'bold' }}>{t('admin.copy')}</Text>
 <Text style={{ color: colors.cyan, fontSize: scaleFont(11) }}></Text>
 </View>
 </View>
 <Text style={{ color: colors.cyan, fontSize: scaleFont(9.5), fontFamily: colors.mono, fontWeight: 'bold' }} numberOfLines={1} ellipsizeMode="middle">
 {appUserId || t('admin.unknown')}
 </Text>
 </TouchableOpacity>

 {/* Device UUID Row */}
 <TouchableOpacity
 style={{
 backgroundColor: colors.card,
 borderColor: colors.border,
 borderWidth: 1,
 borderRadius: scaleMod(8),
 paddingHorizontal: scaleWidth(10),
 paddingVertical: scaleHeight(8),
 }}
 onPress={() => copyIdToClipboard('Device UUID', deviceUuid)}
 activeOpacity={0.7}
 >
 <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: scaleHeight(4) }}>
 <Text style={{ color: colors.textSec, fontSize: scaleFont(9.5), fontFamily: colors.mono, fontWeight: '800', letterSpacing: 0.5 }}>
 {t('admin.deviceUuid')}
 </Text>
 <View style={{ flexDirection: 'row', alignItems: 'center', gap: scaleWidth(4) }}>
 <Text style={{ color: colors.amber, fontSize: scaleFont(9), fontFamily: colors.mono, fontWeight: 'bold' }}>{t('admin.copy')}</Text>
 <Text style={{ color: colors.amber, fontSize: scaleFont(11) }}></Text>
 </View>
 </View>
 <Text style={{ color: colors.amber, fontSize: scaleFont(9.5), fontFamily: colors.mono, fontWeight: 'bold' }} numberOfLines={1} ellipsizeMode="middle">
 {deviceUuid || t('admin.unknown')}
 </Text>
 </TouchableOpacity>
 </View>

 {/* 3. CANLI OBD TERMINALİ VE HAZIR KOMUTLAR */}
 <View
 style={{
 backgroundColor: '#090d16',
 borderWidth: 1.2,
 borderColor: colors.border,
 borderRadius: scaleMod(12),
 padding: scaleMod(10),
 marginBottom: scaleHeight(10),
 }}
 >
 <Text
 style={{
 color: '#00ff88',
 fontSize: scaleFont(10.5),
 fontWeight: '900',
 letterSpacing: 1,
 marginBottom: scaleHeight(8),
 fontFamily: colors.mono,
 }}
 >
 {t('admin.terminalTitle')}
 </Text>

 {/* Hazır Komut Butonları (Açıklamalı 2'li Grid Layout) */}
 <Text style={{ color: colors.textSec, fontSize: scaleFont(9.5), fontFamily: colors.mono, fontWeight: 'bold', marginBottom: scaleHeight(6) }}>
 {t('admin.presetTitle')}
 </Text>
 <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: scaleMod(6), marginBottom: scaleHeight(10) }}>
 {presets.map((p) => (
 <TouchableOpacity
 key={p.cmd}
 style={{
 width: '48.8%',
 backgroundColor: `${colors.cyan}12`,
 borderColor: `${colors.cyan}50`,
 borderWidth: 1,
 borderRadius: scaleMod(6),
 paddingHorizontal: scaleWidth(8),
 paddingVertical: scaleHeight(7),
 }}
 onPress={() => handleSendCommand(p.cmd)}
 disabled={isExecuting}
 activeOpacity={0.7}
 >
 <Text style={{ color: colors.cyan, fontSize: scaleFont(10), fontWeight: '900', fontFamily: colors.mono }}>
 ▶ {p.label}
 </Text>
 <Text style={{ color: colors.textSec, fontSize: scaleFont(8.5), fontFamily: colors.mono, marginTop: scaleHeight(1) }} numberOfLines={1}>
 {p.desc}
 </Text>
 </TouchableOpacity>
 ))}
 </View>

 {/* Manuel Komut Giriş Alanı */}
 <View style={{ flexDirection: 'row', gap: scaleMod(6), marginBottom: scaleHeight(8) }}>
 <TextInput
 style={{
 flex: 1,
 backgroundColor: '#121824',
 borderColor: colors.border,
 borderWidth: 1,
 borderRadius: scaleMod(6),
 paddingHorizontal: scaleWidth(10),
 color: '#00ff88',
 fontFamily: colors.mono,
 fontSize: scaleFont(11),
 height: scaleHeight(36),
 }}
 placeholder={t('admin.inputPlaceholder')}
 placeholderTextColor="#455a74"
 value={customCommand}
 onChangeText={setCustomCommand}
 autoCapitalize="characters"
 />
 <TouchableOpacity
 style={{
 backgroundColor: colors.cyan,
 paddingHorizontal: scaleWidth(14),
 borderRadius: scaleMod(6),
 justifyContent: 'center',
 alignItems: 'center',
 opacity: isExecuting ? 0.6 : 1,
 }}
 onPress={() => handleSendCommand()}
 disabled={isExecuting}
 activeOpacity={0.7}
 >
 {isExecuting ? (
 <ActivityIndicator size="small" color="#000" />
 ) : (
 <Text style={{ color: '#000', fontWeight: '900', fontSize: scaleFont(10.5), fontFamily: colors.mono }}>
 {t('admin.send')}
 </Text>
 )}
 </TouchableOpacity>
 </View>

 {/* Console Log Scroll View */}
 <View style={{ height: scaleHeight(170), backgroundColor: '#04070d', borderRadius: scaleMod(8), borderWidth: 1, borderColor: '#1b2536' }}>
 <ScrollView
 ref={scrollViewRef}
 style={{ flex: 1 }}
 contentContainerStyle={{ padding: scaleMod(8) }}
 >
 <Text style={{ color: '#00ff88', fontSize: scaleFont(9.5), lineHeight: scaleFont(13.5), fontFamily: colors.mono }}>
 {logs}
 </Text>
 </ScrollView>
 </View>
 </View>

 {/* 4. BULUT VE SİSTEM DİAGNOSTİK */}
 <View
 style={{
 backgroundColor: `${colors.cyan}0b`,
 borderWidth: 1.2,
 borderColor: colors.border,
 borderRadius: scaleMod(12),
 padding: scaleMod(12),
 marginBottom: scaleHeight(12),
 }}
 >
 <Text
 style={{
 color: colors.cyan,
 fontSize: scaleFont(10.5),
 fontWeight: '900',
 letterSpacing: 1,
 marginBottom: scaleHeight(8),
 fontFamily: colors.mono,
 }}
 >
 {t('admin.cloudTools')}
 </Text>

 <View style={{ flexDirection: 'row', gap: scaleMod(8) }}>
 {/* DTC Sync */}
 <TouchableOpacity
 style={{
 flex: 1,
 backgroundColor: colors.cyan,
 borderRadius: scaleMod(6),
 paddingVertical: scaleHeight(10),
 alignItems: 'center',
 opacity: dtcSyncStatus === 'syncing' || !vehicleMake ? 0.6 : 1,
 }}
 disabled={dtcSyncStatus === 'syncing' || !vehicleMake}
 onPress={async () => {
 if (vehicleMake) {
 await syncManufacturerDtc(vehicleMake);
 }
 }}
 activeOpacity={0.7}
 >
 <Text style={{ color: '#000', fontSize: scaleFont(10), fontWeight: '900', fontFamily: colors.mono }}>
 {dtcSyncStatus === 'syncing' ? t('admin.syncingDtc') : t('admin.syncDtcBtn')}
 </Text>
 </TouchableOpacity>

 {/* Crash Test */}
 <TouchableOpacity
 style={{
 backgroundColor: `${colors.red}18`,
 borderColor: colors.red,
 borderWidth: 1.2,
 borderRadius: scaleMod(6),
 paddingHorizontal: scaleWidth(10),
 paddingVertical: scaleHeight(10),
 alignItems: 'center',
 }}
 onPress={() => {
 Alert.alert(t('admin.crashTestTitle'), t('admin.crashTestDesc'), [
 { text: t('common.cancel'), style: 'cancel' },
 {
 text: t('admin.crashBtn'),
 style: 'destructive',
 onPress: () => {
 crashlytics().log('Test crash triggered by developer in AdminSecretModal');
 crashlytics().crash();
 },
 },
 ]);
 }}
 activeOpacity={0.7}
 >
 <Text style={{ color: colors.red, fontSize: scaleFont(10), fontWeight: '900', fontFamily: colors.mono }}>
 {t('admin.crashTest')}
 </Text>
 </TouchableOpacity>
 </View>
 </View>
 </ScrollView>

 {/* Bottom Action Bar */}
 <View style={{ flexDirection: 'row', gap: scaleMod(8), marginTop: scaleHeight(8) }}>
 <TouchableOpacity
 style={{
 flex: 1,
 height: scaleHeight(38),
 borderColor: colors.red,
 borderWidth: 1.2,
 backgroundColor: `${colors.red}12`,
 borderRadius: scaleMod(8),
 justifyContent: 'center',
 alignItems: 'center',
 }}
 onPress={handleClear}
 activeOpacity={0.4}
 >
 <Text style={{ color: colors.red, fontSize: scaleFont(10.5), fontWeight: '800', fontFamily: colors.mono }}>
 {t('admin.clear')}
 </Text>
 </TouchableOpacity>

 <TouchableOpacity
 style={{
 flex: 1,
 height: scaleHeight(38),
 borderColor: colors.cyan,
 borderWidth: 1.2,
 backgroundColor: `${colors.cyan}12`,
 borderRadius: scaleMod(8),
 justifyContent: 'center',
 alignItems: 'center',
 }}
 onPress={loadLogsAndInfo}
 activeOpacity={0.4}
 >
 <Text style={{ color: colors.cyan, fontSize: scaleFont(10.5), fontWeight: '800', fontFamily: colors.mono }}>
 {t('admin.refresh')}
 </Text>
 </TouchableOpacity>

 <TouchableOpacity
 style={{
 flex: 1,
 height: scaleHeight(38),
 backgroundColor: colors.cyan,
 borderRadius: scaleMod(8),
 justifyContent: 'center',
 alignItems: 'center',
 }}
 onPress={handleShare}
 activeOpacity={0.4}
 >
 <Text style={{ color: '#000', fontSize: scaleFont(10.5), fontWeight: '900', fontFamily: colors.mono }}>
 {t('admin.share')}
 </Text>
 </TouchableOpacity>
 </View>
 </View>
 </SafeAreaView>
 </View>
 </Modal>
 );
}
