import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Alert,
  Platform
} from 'react-native';
import * as Sharing from 'expo-sharing';
import RNFS from 'react-native-fs';
import * as Logger from '../services/Logger';
import { useThemeColors } from '../theme';
import { useBluetoothStore } from '../store/useBluetoothStore';
import { syncManufacturerDtc } from '../services/DtcSyncService';
import { useResponsive } from '../hooks/useResponsive';
import { useAppStore } from '../store/useAppStore';
import crashlytics from '@react-native-firebase/crashlytics';

interface SecretDebugModalProps {
  visible: boolean;
  onClose: () => void;
}

export default function SecretDebugModal({ visible, onClose }: SecretDebugModalProps) {
  const colors = useThemeColors();
  const vehicleMake = useBluetoothStore(s => s.vehicleMake);
  const dtcSyncStatus = useBluetoothStore(s => s.dtcSyncStatus);
  const lastDtcSyncTime = useBluetoothStore(s => s.lastDtcSyncTime);
  const isSimulationMode = useAppStore(s => s.isSimulationMode);
  const toggleSimulationMode = useAppStore(s => s.toggleSimulationMode);
  const freeUsageCount = useAppStore(s => s.freeUsageCount);
  const resetFreeUsage = useAppStore(s => s.resetFreeUsage);
  const [logs, setLogs] = useState<string>('Yükleniyor...');
  const [fileSize, setFileSize] = useState<string>('Hesaplanıyor...');
  const { s: scaleWidth, vs: scaleHeight, ms: scaleMod, fs: scaleFont, isTablet, isLargeTablet } = useResponsive();

  const loadLogsAndInfo = async () => {
    try {
      await Logger.flush();
      const fullLog = await Logger.getLogContent();
      if (fullLog.length > 50000) {
        setLogs('... [Loglar Kırpıldı] ...\n' + fullLog.slice(-50000));
      } else {
        setLogs(fullLog || 'Kayıtlı log bulunmuyor.');
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
      setLogs('Loglar okunamadı: ' + e);
      setFileSize('Bilinmiyor');
    }
  };

  useEffect(() => {
    if (visible) {
      loadLogsAndInfo();
    }
  }, [visible]);

  const handleShare = async () => {
    try {
      const isAvailable = await Sharing.isAvailableAsync();
      if (!isAvailable) {
        Alert.alert('Desteklenmiyor', 'Paylaşım özelliği bu cihazda kullanılamıyor.');
        return;
      }
      
      await Logger.flush();
      const fileUri = Logger.getLogFileUri();
      
      await Sharing.shareAsync(fileUri, {
        mimeType: 'text/plain',
        dialogTitle: 'MotoCortex Kara Kutu Log Dosyası',
        UTI: 'public.plain-text',
      });
    } catch (e: any) {
      Alert.alert('Paylaşım Hatası', e.message || 'Dosya paylaşılamadı.');
    }
  };

  const handleClear = () => {
    Alert.alert(
      'Logları Temizle',
      'Tüm yerel log verileri silinecektir. Devam etmek istiyor musunuz?',
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Temizle',
          style: 'destructive',
          onPress: async () => {
            await Logger.clearLogs();
            setLogs('Kayıtlı log bulunmuyor.');
            setFileSize('0 KB');
          },
        },
      ]
    );
  };

  const sDyn = React.useMemo(() => {
    const modalWidth = isTablet ? (isLargeTablet ? 650 : 520) : '94%';
    const modalHeight = isTablet ? '85%' : '90%';

    return {
      overlay: {
        flex: 1,
        justifyContent: 'center' as const,
        alignItems: 'center' as const,
      },
      backdrop: {
        ...StyleSheet.absoluteFillObject,
      },
      safeArea: {
        width: modalWidth,
        height: modalHeight,
        maxHeight: isTablet ? scaleHeight(700) : undefined,
      },
      container: {
        flex: 1,
        borderRadius: scaleMod(16),
        borderWidth: 1.5,
        padding: scaleMod(14),
        justifyContent: 'space-between' as const,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.2,
        shadowRadius: 16,
        elevation: 6,
      },
      header: {
        flexDirection: 'row' as const,
        justifyContent: 'space-between' as const,
        alignItems: 'center' as const,
        borderBottomWidth: 1,
        paddingBottom: scaleHeight(10),
        marginBottom: scaleHeight(10),
      },
      title: {
        fontSize: scaleFont(14),
        fontWeight: '900' as const,
        letterSpacing: 1.5,
      },
      subtitle: {
        fontSize: scaleFont(10.5),
        marginTop: scaleHeight(2),
      },
      closeBtn: {
        paddingHorizontal: scaleWidth(10),
        paddingVertical: scaleHeight(5),
        borderRadius: scaleMod(6),
      },
      closeBtnText: {
        fontSize: scaleFont(11.5),
        fontWeight: 'bold' as const,
      },
      syncCard: {
        borderWidth: 1.2,
        borderRadius: scaleMod(12),
        padding: scaleMod(12),
        marginBottom: scaleHeight(12),
      },
      sectionTitle: {
        fontSize: scaleFont(10.5),
        fontWeight: '900' as const,
        letterSpacing: 1,
        marginBottom: scaleHeight(8),
      },
      syncRow: {
        flexDirection: 'row' as const,
        justifyContent: 'space-between' as const,
        marginBottom: scaleHeight(10),
      },
      syncCol: {
        flex: 1,
      },
      syncLabel: {
        fontSize: scaleFont(9.5),
        textTransform: 'uppercase' as const,
        marginBottom: scaleHeight(2),
      },
      syncValue: {
        fontSize: scaleFont(11.5),
      },
      syncBtn: {
        height: scaleHeight(32),
        borderRadius: scaleMod(6),
        justifyContent: 'center' as const,
        alignItems: 'center' as const,
      },
      syncBtnText: {
        color: '#000000',
        fontSize: scaleFont(10.5),
        fontWeight: '900' as const,
        letterSpacing: 1,
      },
      consoleContainer: {
        flex: 1,
        borderRadius: scaleMod(12),
        borderWidth: 1,
        overflow: 'hidden' as const,
        marginBottom: scaleHeight(12),
      },
      scrollView: {
        flex: 1,
      },
      scrollContent: {
        padding: scaleMod(10),
      },
      consoleText: {
        fontSize: scaleFont(10),
        lineHeight: scaleFont(14),
      },
      actionsBar: {
        flexDirection: 'row' as const,
        justifyContent: 'space-between' as const,
        gap: scaleMod(8),
      },
      actionBtn: {
        flex: 1,
        height: scaleHeight(40),
        borderWidth: 1.2,
        borderRadius: scaleMod(10),
        justifyContent: 'center' as const,
        alignItems: 'center' as const,
      },
      primaryBtn: {
        borderWidth: 0,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 8,
        elevation: 4,
      },
      actionBtnText: {
        fontSize: scaleFont(11.5),
        fontWeight: '800' as const,
        letterSpacing: 1,
      },
    };
  }, [scaleWidth, scaleHeight, scaleMod, scaleFont, isTablet, isLargeTablet]) as any;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={[sDyn.overlay, { backgroundColor: colors.overlayHeavy }]}>
        <TouchableOpacity 
          style={sDyn.backdrop} 
          activeOpacity={1} 
          onPress={onClose} 
        />
        
        <SafeAreaView style={sDyn.safeArea}>
          <View style={[sDyn.container, { backgroundColor: colors.card, borderColor: colors.cyan }]}>
            {/* Glow Accent Header */}
            <View style={[sDyn.header, { borderBottomColor: colors.border }]}>
              <View>
                <Text style={[sDyn.title, { color: colors.cyan }]}>⚡ MOTO CORTEX DEV PANEL</Text>
                <Text style={[sDyn.subtitle, { color: colors.textSec }]}>Kara Kutu / Dosya Boyutu: {fileSize}</Text>
              </View>
              <TouchableOpacity 
                onPress={onClose} 
                style={[sDyn.closeBtn, { backgroundColor: `${colors.cyan}18` }]}
              >
                <Text style={[sDyn.closeBtnText, { color: colors.cyan }]}>KAPAT</Text>
              </TouchableOpacity>
            </View>

            {/* DTC Sync Card */}
            <View style={[sDyn.syncCard, { backgroundColor: `${colors.cyan}0b`, borderColor: colors.border }]}>
              <Text style={[sDyn.sectionTitle, { color: colors.cyan, fontFamily: colors.mono }]}>🛰️ DTC BULUT SENKRONİZASYONU</Text>
              
              <View style={sDyn.syncRow}>
                <View style={sDyn.syncCol}>
                  <Text style={[sDyn.syncLabel, { color: colors.textSec }]}>Marka</Text>
                  <Text style={[sDyn.syncValue, { color: colors.textPri, fontWeight: 'bold' }]}>{vehicleMake || 'BİLİNMİYOR'}</Text>
                </View>
                
                <View style={sDyn.syncCol}>
                  <Text style={[sDyn.syncLabel, { color: colors.textSec }]}>Durum</Text>
                  <Text style={[sDyn.syncValue, { 
                    color: dtcSyncStatus === 'success' ? colors.green : dtcSyncStatus === 'error' ? colors.red : colors.cyan,
                    fontWeight: 'bold'
                  }]}>
                    {dtcSyncStatus === 'syncing' ? 'Eşitleniyor...' : dtcSyncStatus === 'success' ? 'Başarılı' : dtcSyncStatus === 'error' ? 'Hata' : 'Beklemede'}
                  </Text>
                </View>

                {lastDtcSyncTime && (
                  <View style={sDyn.syncCol}>
                    <Text style={[sDyn.syncLabel, { color: colors.textSec }]}>Son Eşitleme</Text>
                    <Text style={[sDyn.syncValue, { color: colors.textPri }]}>{lastDtcSyncTime}</Text>
                  </View>
                )}
              </View>

              <TouchableOpacity
                style={[sDyn.syncBtn, { backgroundColor: colors.cyan, opacity: (dtcSyncStatus === 'syncing' || !vehicleMake) ? 0.6 : 1 }]}
                disabled={dtcSyncStatus === 'syncing' || !vehicleMake}
                onPress={async () => {
                  if (vehicleMake) {
                    await syncManufacturerDtc(vehicleMake);
                  }
                }}
              >
                <Text style={[sDyn.syncBtnText, { fontFamily: colors.mono }]}>
                  {dtcSyncStatus === 'syncing' ? 'EŞİTLENİYOR...' : 'ŞİMDİ EŞİTLE'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Developer Settings Card */}
            <View style={[sDyn.syncCard, { backgroundColor: `${colors.purple}0b`, borderColor: colors.border, marginBottom: scaleHeight(12) }]}>
              <Text style={[sDyn.sectionTitle, { color: colors.purple, fontFamily: colors.mono }]}>🛠️ GELİŞTİRİCİ ARAÇLARI</Text>
              
              <View style={{ flexDirection: 'row', gap: scaleMod(8), marginBottom: scaleHeight(8) }}>
                {/* Simulator Mode Toggle */}
                <TouchableOpacity
                  style={[
                    sDyn.actionBtn,
                    { 
                      borderColor: isSimulationMode ? colors.green : colors.border, 
                      backgroundColor: isSimulationMode ? `${colors.green}14` : 'transparent',
                      flex: 1
                    }
                  ]}
                  onPress={toggleSimulationMode}
                  activeOpacity={0.8}
                >
                  <Text style={[sDyn.actionBtnText, { color: isSimulationMode ? colors.green : colors.textPri, fontFamily: colors.mono }]}>
                    {isSimulationMode ? '🟢 SİMÜLATÖR AÇIK' : '⚫ SİMÜLATÖR KAPALI'}
                  </Text>
                </TouchableOpacity>

                {/* Reset Trial */}
                <TouchableOpacity
                  style={[
                    sDyn.actionBtn,
                    { 
                      borderColor: colors.amber, 
                      backgroundColor: `${colors.amber}14`,
                      flex: 1
                    }
                  ]}
                  onPress={() => {
                    resetFreeUsage();
                    Alert.alert("BAŞARILI", "Free Trial sayacı sıfırlandı!");
                  }}
                  activeOpacity={0.8}
                >
                  <Text style={[sDyn.actionBtnText, { color: colors.amber, fontFamily: colors.mono }]}>
                    🔄 SIFIRLA ({freeUsageCount}/3)
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={{ flexDirection: 'row', gap: scaleMod(8) }}>
                {/* Crashlytics Test Button */}
                <TouchableOpacity
                  style={[
                    sDyn.actionBtn,
                    { 
                      borderColor: colors.red, 
                      backgroundColor: `${colors.red}14`,
                      flex: 1
                    }
                  ]}
                  onPress={() => {
                    Alert.alert(
                      "Crash Test",
                      "Uygulama şimdi kasten çökecektir. Crashlytics entegrasyonunu doğrulamak için bunu onaylayın.",
                      [
                        { text: "İptal", style: "cancel" },
                        {
                          text: "Çökert",
                          style: "destructive",
                          onPress: () => {
                            crashlytics().log("Test crash triggered by developer");
                            crashlytics().crash();
                          }
                        }
                      ]
                    );
                  }}
                  activeOpacity={0.8}
                >
                  <Text style={[sDyn.actionBtnText, { color: colors.red, fontFamily: colors.mono }]}>
                    💥 CRASH TEST (CRASHLYTICS)
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
 
            {/* Console Log Area */}
            <View style={[sDyn.consoleContainer, { backgroundColor: '#05070a', borderColor: colors.border }]}>
              <ScrollView 
                style={sDyn.scrollView} 
                contentContainerStyle={sDyn.scrollContent}
                ref={(ref) => {
                  if (ref) setTimeout(() => ref.scrollToEnd({ animated: true }), 100);
                }}
              >
                <Text style={[sDyn.consoleText, { color: colors.textPri, fontFamily: colors.mono }]}>
                  {logs}
                </Text>
              </ScrollView>
            </View>

            {/* Actions Bar */}
            <View style={sDyn.actionsBar}>
              <TouchableOpacity 
                style={[sDyn.actionBtn, { borderColor: colors.red, backgroundColor: `${colors.red}12` }]} 
                onPress={handleClear}
                activeOpacity={0.8}
              >
                <Text style={[sDyn.actionBtnText, { color: colors.red, fontFamily: colors.mono }]}>TEMİZLE</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[sDyn.actionBtn, { borderColor: colors.cyan, backgroundColor: `${colors.cyan}12` }]} 
                onPress={loadLogsAndInfo}
                activeOpacity={0.8}
              >
                <Text style={[sDyn.actionBtnText, { color: colors.cyan, fontFamily: colors.mono }]}>YENİLE</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[sDyn.actionBtn, sDyn.primaryBtn, { backgroundColor: colors.cyan }]} 
                onPress={handleShare}
                activeOpacity={0.8}
              >
                <Text style={[sDyn.actionBtnText, { color: '#000000', fontWeight: '900', fontFamily: colors.mono }]}>PAYLAŞ</Text>
              </TouchableOpacity>
            </View>
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
}
