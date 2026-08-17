/**
 * ExpertLongCodingModal.tsx
 * 
 * MotoCortex Advanced Visual Long Coding & Byte/Bit Hex Editor (VCDS/BimmerCode/OBDeleven Grade).
 * Compact single-screen layout: Everything fits in one view without scrolling.
 */

import React, { useState, useMemo } from 'react';
import {
 View,
 Text,
 Modal,
 TouchableOpacity,
 StyleSheet,
 ScrollView,
 TextInput,
 Platform,
 Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useThemeColors } from '../../theme';
import { useResponsive } from '../../hooks/useResponsive';
import PreconditionWizardModal from './PreconditionWizardModal';

const MONO = Platform.OS === 'ios' ? 'System' : 'sans-serif';

interface ExpertLongCodingModalProps {
 visible: boolean;
 onClose: () => void;
 onExecuteWrite: (didHex: string, payloadHex: string) => Promise<void>;
 currentVoltage: number;
 isSimulationMode?: boolean;
 connectedVehicleMake?: string;
 initialDid?: string;
 initialHexValue?: string;
}

export const ExpertLongCodingModal: React.FC<ExpertLongCodingModalProps> = ({
 visible,
 onClose,
 onExecuteWrite,
 currentVoltage,
 isSimulationMode = false,
 connectedVehicleMake = 'Generic',
 initialDid = '0100',
 initialHexValue = '00000000',
}) => {
 const { t } = useTranslation();
 const colors = useThemeColors();
 const { s: scaleWidth, vs: scaleHeight, ms: scaleMod, fs: scaleFont } = useResponsive();

 const [targetDid, setTargetDid] = useState<string>(initialDid);
 const [rawHexInput, setRawHexInput] = useState<string>(initialHexValue);
 const [selectedByteIndex, setSelectedByteIndex] = useState<number>(0);
 const [isWizardOpen, setIsWizardOpen] = useState<boolean>(false);

 // Clean hex string and parse into byte array
 const cleanHex = useMemo(() => {
 return rawHexInput.replace(/[^0-9A-Fa-f]/g, '').toUpperCase();
 }, [rawHexInput]);

 const bytes = useMemo(() => {
 const matches = cleanHex.match(/.{1,2}/g);
 return matches ? matches.map(b => parseInt(b, 16)) : [0];
 }, [cleanHex]);

 // Ensure selectedByteIndex is in range
 const activeByteIndex = Math.min(selectedByteIndex, Math.max(0, bytes.length - 1));
 const activeByteValue = bytes[activeByteIndex] || 0;

 // Checksum SUM16
 const byteSum = useMemo(() => {
 return bytes.reduce((acc, b) => (acc + b) & 0xFFFF, 0);
 }, [bytes]);

 // Toggle specific bit in the active byte
 const handleToggleBit = (bitIndex: number) => {
 const newBytes = [...bytes];
 newBytes[activeByteIndex] = newBytes[activeByteIndex] ^ (1 << bitIndex);
 const newHex = newBytes.map(b => b.toString(16).padStart(2, '0').toUpperCase()).join('');
 setRawHexInput(newHex);
 };

 const handleSaveHexInput = (text: string) => {
 const sanitized = text.replace(/[^0-9A-Fa-f]/g, '').toUpperCase();
 setRawHexInput(sanitized);
 };

 const handleStartPreconditionCheck = () => {
 if (!targetDid || cleanHex.length === 0 || cleanHex.length % 2 !== 0) {
 Alert.alert(
 t('common.error', 'Error'),
 t('coding.enter_valid_hex', 'Please enter a valid DID and an even-length Hex payload.')
 );
 return;
 }
 setIsWizardOpen(true);
 };

 const handleConfirmedExecution = async () => {
 setIsWizardOpen(false);
 try {
 await onExecuteWrite(targetDid, cleanHex);
 onClose();
 } catch (err: any) {
 Alert.alert(t('common.error', 'Error'), err?.message || 'Write failed');
 }
 };

 return (
 <Modal
 visible={visible}
 animationType="fade"
 transparent
 onRequestClose={onClose}
 >
 <View style={[styles.backdrop, { backgroundColor: colors.overlayHeavy }]}>
 <SafeAreaView style={styles.safeArea}>
 <View style={[
 styles.dialogCard,
 {
 backgroundColor: colors.card,
 borderColor: colors.border,
 }
 ]}>
 {/* Header */}
 <View style={[styles.headerRow, { borderBottomColor: colors.border }]}>
 <View style={{ flex: 1, paddingRight: scaleWidth(6) }}>
 <View style={styles.titleRow}>
 <Text style={[styles.modalTitle, { color: colors.amber, fontSize: scaleFont(12.5) }]}>
 {t('coding.expert_mode_title', 'UZMAN / LONG CODING')}
 </Text>
 <View style={[styles.makeBadge, { backgroundColor: `${colors.cyan}18`, borderColor: colors.cyan }]}>
 <Text style={[styles.makeBadgeText, { color: colors.cyan, fontSize: scaleFont(8.5) }]}>
 {connectedVehicleMake}
 </Text>
 </View>
 </View>
 <Text numberOfLines={1} style={[styles.modalSubtitle, { color: colors.textSec, fontSize: scaleFont(8.5) }]}>
 {t('coding.expert_mode_warning', 'Doğrudan Bayt/Bit ECU düzenlemesi. Dikkatli olun.')}
 </Text>
 </View>
 <TouchableOpacity
 onPress={onClose}
 hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
 style={[styles.closeButton, { backgroundColor: colors.elevated, borderColor: colors.border }]}
 >
 <Text style={{ color: colors.textPri, fontSize: scaleFont(14), fontWeight: '900' }}>✕</Text>
 </TouchableOpacity>
 </View>

 {/* Compact Single-Screen Content (No Main Vertical Scroll) */}
 <View style={styles.body}>
 {/* DID & Hex Payload Inputs */}
 <View style={styles.inputsContainer}>
 <View style={{ width: '36%' }}>
 <Text style={[styles.fieldLabel, { color: colors.textTertiary, fontSize: scaleFont(8) }]}>
 {t('coding.did_label', 'HEDEF DID (HEX)')}
 </Text>
 <TextInput
 value={targetDid}
 onChangeText={text => setTargetDid(text.replace(/[^0-9A-Fa-f]/g, '').toUpperCase())}
 maxLength={4}
 placeholder="0100"
 placeholderTextColor={colors.textSec}
 style={[
 styles.textInput,
 {
 backgroundColor: colors.bg,
 borderColor: colors.border,
 color: colors.textPri,
 fontSize: scaleFont(10.5),
 height: scaleHeight(32),
 }
 ]}
 />
 </View>
 <View style={{ flex: 1 }}>
 <Text style={[styles.fieldLabel, { color: colors.textTertiary, fontSize: scaleFont(8) }]}>
 {t('coding.payload_label', 'HAM HEX VERİSİ')}
 </Text>
 <TextInput
 value={rawHexInput}
 onChangeText={handleSaveHexInput}
 placeholder="00000000"
 placeholderTextColor={colors.textSec}
 style={[
 styles.textInput,
 {
 backgroundColor: colors.bg,
 borderColor: colors.border,
 color: colors.cyan,
 fontSize: scaleFont(10.5),
 height: scaleHeight(32),
 }
 ]}
 />
 </View>
 </View>

 {/* Byte Selector Bar */}
 <Text style={[styles.sectionHeading, { color: colors.textPri, fontSize: scaleFont(9.5) }]}>
 {t('coding.byte_selector_title', 'Bayt Seçici (Bitleri Düzenlemek İçin Dokunun)')}
 </Text>
 <ScrollView
 horizontal
 showsHorizontalScrollIndicator={false}
 style={styles.byteSelectorScroll}
 contentContainerStyle={{ paddingVertical: scaleHeight(1), gap: scaleWidth(5) }}
 >
 {bytes.map((byteVal, idx) => {
 const isSelected = idx === activeByteIndex;
 return (
 <TouchableOpacity
 key={`byte_${idx}`}
 onPress={() => setSelectedByteIndex(idx)}
 style={[
 styles.bytePill,
 {
 backgroundColor: isSelected ? colors.amber : colors.bg,
 borderColor: isSelected ? colors.amber : colors.border,
 minWidth: scaleWidth(38),
 height: scaleHeight(38),
 }
 ]}
 >
 <Text style={[
 styles.bytePillIndex,
 {
 color: isSelected ? '#000000' : colors.textTertiary,
 fontSize: scaleFont(7.5)
 }
 ]}>
 B{idx}
 </Text>
 <Text style={[
 styles.bytePillVal,
 {
 color: isSelected ? '#000000' : colors.textPri,
 fontSize: scaleFont(10.5)
 }
 ]}>
 {byteVal.toString(16).padStart(2, '0').toUpperCase()}
 </Text>
 </TouchableOpacity>
 );
 })}
 </ScrollView>

 {/* 8-Bit Interactive Grid */}
 <View style={[
 styles.bitPanel,
 {
 backgroundColor: colors.bg,
 borderColor: colors.border,
 padding: scaleMod(8),
 }
 ]}>
 <View style={styles.bitPanelHeader}>
 <Text style={[styles.bitPanelTitle, { color: colors.textPri, fontSize: scaleFont(9.5) }]}>
 {t('coding.bit_editor_title', 'Bayt {{index}} Bit Haritası', { index: activeByteIndex })}: 0x{activeByteValue.toString(16).padStart(2, '0').toUpperCase()}
 </Text>
 <Text style={[styles.binDisplay, { color: colors.cyan, fontSize: scaleFont(8.5) }]}>
 {activeByteValue.toString(2).padStart(8, '0')} (BIN)
 </Text>
 </View>

 <View style={styles.bitGridRow}>
 {[7, 6, 5, 4, 3, 2, 1, 0].map(bitIdx => {
 const isBitActive = !!(activeByteValue & (1 << bitIdx));
 return (
 <TouchableOpacity
 key={`bit_${bitIdx}`}
 onPress={() => handleToggleBit(bitIdx)}
 style={[
 styles.bitCell,
 {
 backgroundColor: isBitActive ? `${colors.amber}25` : colors.card,
 borderColor: isBitActive ? colors.amber : colors.border,
 height: scaleHeight(36),
 }
 ]}
 >
 <Text style={[
 styles.bitCellIndex,
 {
 color: isBitActive ? colors.amber : colors.textTertiary,
 fontSize: scaleFont(7)
 }
 ]}>
 Bit {bitIdx}
 </Text>
 <Text style={[
 styles.bitCellVal,
 {
 color: isBitActive ? colors.amber : colors.textPri,
 fontSize: scaleFont(10.5)
 }
 ]}>
 {isBitActive ? '1' : '0'}
 </Text>
 </TouchableOpacity>
 );
 })}
 </View>
 </View>

 {/* Telemetry & Checksum Info */}
 <View style={styles.summaryRow}>
 <View style={[
 styles.summaryCard,
 {
 backgroundColor: colors.bg,
 borderColor: colors.border,
 paddingVertical: scaleHeight(5),
 paddingHorizontal: scaleWidth(8),
 }
 ]}>
 <Text style={[styles.summaryLabel, { color: colors.textTertiary, fontSize: scaleFont(7.5) }]}>
 {t('coding.byte_count', 'TOPLAM BAYT')}
 </Text>
 <Text style={[styles.summaryValue, { color: colors.textPri, fontSize: scaleFont(10.5) }]}>
 {bytes.length} Bytes
 </Text>
 </View>
 <View style={[
 styles.summaryCard,
 {
 backgroundColor: colors.bg,
 borderColor: colors.border,
 paddingVertical: scaleHeight(5),
 paddingHorizontal: scaleWidth(8),
 }
 ]}>
 <Text style={[styles.summaryLabel, { color: colors.textTertiary, fontSize: scaleFont(7.5) }]}>
 {t('coding.checksum_label', 'CHECKSUM (SUM16)')}
 </Text>
 <Text style={[styles.summaryValue, { color: colors.green, fontSize: scaleFont(10.5) }]}>
 0x{byteSum.toString(16).padStart(4, '0').toUpperCase()}
 </Text>
 </View>
 </View>

 {/* Amber Write Action Button */}
 <TouchableOpacity
 activeOpacity={0.85}
 onPress={handleStartPreconditionCheck}
 style={[
 styles.executeButton,
 {
 backgroundColor: colors.amber,
 paddingVertical: scaleHeight(10),
 marginTop: scaleHeight(8),
 }
 ]}
 >
 <Text style={[styles.executeButtonText, { fontSize: scaleFont(11.5) }]}>
 {t('coding.write_expert_payload', 'Doğrula ve ECU\'ya Yaz')}
 </Text>
 </TouchableOpacity>
 </View>
 </View>
 </SafeAreaView>
 </View>

 {/* Precondition Wizard Modal */}
 <PreconditionWizardModal
 visible={isWizardOpen}
 onClose={() => setIsWizardOpen(false)}
 onConfirmAndProceed={handleConfirmedExecution}
 currentVoltage={currentVoltage}
 isSimulationMode={isSimulationMode}
 featureName={`Expert Long Coding (DID 0x${targetDid})`}
 />
 </Modal>
 );
};

const styles = StyleSheet.create({
 backdrop: {
 flex: 1,
 justifyContent: 'center',
 alignItems: 'center',
 paddingHorizontal: 16,
 },
 safeArea: {
 width: '100%',
 maxWidth: 440,
 },
 dialogCard: {
 borderRadius: 16,
 borderWidth: 1.2,
 paddingHorizontal: 14,
 paddingTop: 10,
 paddingBottom: 12,
 },
 headerRow: {
 flexDirection: 'row',
 alignItems: 'center',
 justifyContent: 'space-between',
 paddingBottom: 6,
 borderBottomWidth: 1,
 },
 titleRow: {
 flexDirection: 'row',
 alignItems: 'center',
 gap: 6,
 },
 modalTitle: {
 fontWeight: '900',
 fontFamily: MONO,
 letterSpacing: 0.5,
 },
 modalSubtitle: {
 fontFamily: MONO,
 marginTop: 1,
 },
 makeBadge: {
 paddingHorizontal: 5,
 paddingVertical: 1.5,
 borderRadius: 4,
 borderWidth: 1,
 },
 makeBadgeText: {
 fontWeight: '800',
 fontFamily: MONO,
 },
 closeButton: {
 width: 24,
 height: 24,
 borderRadius: 12,
 borderWidth: 1,
 justifyContent: 'center',
 alignItems: 'center',
 },
 body: {
 paddingTop: 8,
 },
 inputsContainer: {
 flexDirection: 'row',
 gap: 8,
 marginBottom: 8,
 },
 fieldLabel: {
 fontWeight: '800',
 fontFamily: MONO,
 marginBottom: 2,
 letterSpacing: 0.5,
 },
 textInput: {
 borderWidth: 1,
 borderRadius: 6,
 paddingHorizontal: 8,
 paddingVertical: 0,
 fontFamily: MONO,
 fontWeight: '700',
 },
 sectionHeading: {
 fontWeight: '800',
 fontFamily: MONO,
 marginBottom: 4,
 },
 byteSelectorScroll: {
 flexDirection: 'row',
 marginBottom: 8,
 },
 bytePill: {
 borderRadius: 6,
 borderWidth: 1,
 justifyContent: 'center',
 alignItems: 'center',
 paddingHorizontal: 4,
 },
 bytePillIndex: {
 fontWeight: '700',
 fontFamily: MONO,
 },
 bytePillVal: {
 fontWeight: '900',
 fontFamily: MONO,
 },
 bitPanel: {
 borderRadius: 8,
 borderWidth: 1,
 marginBottom: 8,
 },
 bitPanelHeader: {
 flexDirection: 'row',
 justifyContent: 'space-between',
 alignItems: 'center',
 marginBottom: 4,
 },
 bitPanelTitle: {
 fontWeight: '800',
 fontFamily: MONO,
 },
 binDisplay: {
 fontWeight: '800',
 fontFamily: MONO,
 },
 bitGridRow: {
 flexDirection: 'row',
 flexWrap: 'wrap',
 gap: 4,
 },
 bitCell: {
 width: '23.5%',
 borderRadius: 6,
 borderWidth: 1,
 justifyContent: 'center',
 alignItems: 'center',
 },
 bitCellIndex: {
 fontWeight: '700',
 fontFamily: MONO,
 },
 bitCellVal: {
 fontWeight: '900',
 fontFamily: MONO,
 },
 summaryRow: {
 flexDirection: 'row',
 gap: 8,
 marginBottom: 2,
 },
 summaryCard: {
 flex: 1,
 borderRadius: 6,
 borderWidth: 1,
 alignItems: 'center',
 justifyContent: 'center',
 },
 summaryLabel: {
 fontWeight: '800',
 fontFamily: MONO,
 marginBottom: 1,
 },
 summaryValue: {
 fontWeight: '900',
 fontFamily: MONO,
 },
 executeButton: {
 borderRadius: 8,
 alignItems: 'center',
 justifyContent: 'center',
 },
 executeButtonText: {
 color: '#000000',
 fontWeight: '900',
 fontFamily: MONO,
 letterSpacing: 0.5,
 },
});

export default ExpertLongCodingModal;
