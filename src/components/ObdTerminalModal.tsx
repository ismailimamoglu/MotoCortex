import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Platform,
  Share,
  Alert,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useThemeColors } from '../theme';
import { useResponsive } from '../hooks/useResponsive';
import { useBluetoothStore } from '../store/useBluetoothStore';

interface ObdTerminalModalProps {
  visible: boolean;
  onClose: () => void;
  sendCommand: (cmd: string) => Promise<string | undefined>;
}

export default function ObdTerminalModal({
  visible,
  onClose,
  sendCommand,
}: ObdTerminalModalProps) {
  const { t } = useTranslation();
  const tc = useThemeColors();
  const { s: scaleWidth, vs: scaleHeight, ms: scaleMod, fs: scaleFont, isTablet } = useResponsive();

  const [inputCommand, setInputCommand] = useState('');
  const [terminalHistory, setTerminalHistory] = useState<{ type: 'cmd' | 'res' | 'err'; text: string; time: string }[]>([]);
  const [isSending, setIsSending] = useState(false);

  const MONO = Platform.OS === 'ios' ? 'System' : 'sans-serif';

  // Read telemetry stats and diagnostic logs from Bluetooth store
  const { protocol, adapterCapabilityScore, telemetryStats, diagnosticLogs, clearDiagnosticLogs } = useBluetoothStore();

  const terminalScrollRef = useRef<ScrollView>(null);

  const handleSendCommand = async () => {
    if (!inputCommand.trim() || isSending) return;
    const cmd = inputCommand.toUpperCase().trim();
    setInputCommand('');
    setIsSending(true);

    const time = new Date().toLocaleTimeString('tr-TR', { hour12: false });
    
    // Add command to history
    setTerminalHistory((prev) => [...prev, { type: 'cmd', text: cmd, time }]);

    try {
      const response = await sendCommand(cmd);
      const resText = response || 'NO RESPONSE';
      setTerminalHistory((prev) => [...prev, { type: 'res', text: resText, time }]);
    } catch (err: any) {
      const errMsg = err instanceof Error ? err.message : String(err);
      setTerminalHistory((prev) => [...prev, { type: 'err', text: `ERROR: ${errMsg}`, time }]);
    } finally {
      setIsSending(false);
      // Auto-scroll terminal history to bottom
      setTimeout(() => {
        terminalScrollRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  };

  const handleShareLogs = async () => {
    if (diagnosticLogs.length === 0) {
      Alert.alert(t('common.info', 'Bilgi'), t('dashboard.noLogsToShare', 'Paylaşılacak günlük kaydı bulunmuyor.'));
      return;
    }

    try {
      const reportText = `MotoCortex Teşhis Raporu & Günlüğü\n` +
        `------------------------------------\n` +
        `Tarih: ${new Date().toLocaleString()}\n` +
        `Protokol: ${protocol || 'Bilinmiyor'}\n` +
        `Yetenek Skoru: ${adapterCapabilityScore}/100\n` +
        `İstek Gönderildi: ${telemetryStats.requestsSent}\n` +
        `Yanıt Alındı: ${telemetryStats.responsesReceived}\n` +
        `Zaman Aşımı: ${telemetryStats.timeoutCount}\n` +
        `Hata Kurtarma: ${telemetryStats.recoveryCount}\n\n` +
        `GÜNLÜK KAYITLARI:\n` +
        diagnosticLogs.join('\n');

      await Share.share({
        message: reportText,
        title: 'MotoCortex Teşhis Günlüğü',
      });
    } catch (e) {
      console.error('Sharing diagnostic logs failed:', e);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={onClose}
    >
      <View style={{ flex: 1, backgroundColor: tc.bg, paddingTop: Platform.OS === 'ios' ? 50 : 0 }}>
        <View style={[s.modalContainer, { backgroundColor: tc.bg }]}>
          {/* Header */}
          <View style={[s.header, { borderBottomColor: tc.border }]}>
            <TouchableOpacity onPress={onClose} style={s.doneBtn}>
              <Text allowFontScaling={false} style={{ color: tc.cyan, fontSize: scaleFont(12), fontWeight: '900', fontFamily: MONO }}>
                {`← ${t('common.back', 'GERİ').toUpperCase()}`}
              </Text>
            </TouchableOpacity>
            <Text allowFontScaling={false} style={[s.headerTitle, { color: tc.textPri, fontSize: scaleFont(13) }]}>
              {t('obdTerminal.title', 'OBD SAĞLIK & TERMİNAL').toUpperCase()}
            </Text>
            <View style={{ width: scaleWidth(60) }} />
          </View>

          <ScrollView 
            style={{ flex: 1 }} 
            contentContainerStyle={{ padding: scaleMod(16), gap: scaleHeight(16) }}
            keyboardShouldPersistTaps="handled"
          >
            {/* 1. OBD TERMINAL */}
            <View style={[s.sectionCard, { backgroundColor: tc.card, borderColor: tc.border }]}>
              <Text style={[s.sectionTitle, { color: tc.cyan, fontSize: scaleFont(11.5) }]}>💬 {t('obdTerminal.terminalTitle', 'OBD TERMİNAL')}</Text>
              
              {/* Terminal Screen */}
              <View style={[s.terminalScreen, { backgroundColor: '#050505', borderColor: tc.border }]}>
                <ScrollView 
                  ref={terminalScrollRef}
                  nestedScrollEnabled={true}
                  style={{ maxHeight: scaleHeight(160) }}
                  contentContainerStyle={{ gap: 4 }}
                >
                  {terminalHistory.length === 0 ? (
                    <Text style={{ color: '#666', fontFamily: MONO, fontSize: scaleFont(10) }}>
                      {t('obdTerminal.terminalPlaceholder', "ECU'ya göndermek için aşağıya komut yazın (Örn: 010C, ATRV)")}
                    </Text>
                  ) : (
                    terminalHistory.map((item, idx) => (
                      <Text 
                        key={idx} 
                        style={{ 
                          fontFamily: MONO, 
                          fontSize: scaleFont(9.5), 
                          color: item.type === 'cmd' ? tc.cyan : (item.type === 'err' ? tc.red : tc.green) 
                        }}
                      >
                        [{item.time}] {item.type === 'cmd' ? '> ' : '< '} {item.text}
                      </Text>
                    ))
                  )}
                </ScrollView>
              </View>

              {/* Input Area */}
              <View style={{ flexDirection: 'row', gap: scaleMod(8), marginTop: scaleHeight(8) }}>
                <TextInput
                  style={[s.terminalInput, { color: tc.textPri, borderColor: tc.border, backgroundColor: tc.bg, fontFamily: MONO, fontSize: scaleFont(11) }]}
                  placeholder={t('obdTerminal.inputPlaceholder', 'Komut girin...')}
                  placeholderTextColor={tc.textSec}
                  value={inputCommand}
                  onChangeText={setInputCommand}
                  autoCapitalize="characters"
                  autoCorrect={false}
                  onSubmitEditing={handleSendCommand}
                  returnKeyType="send"
                />
                <TouchableOpacity 
                  style={[s.sendBtn, { backgroundColor: tc.cyan }]} 
                  onPress={handleSendCommand}
                  disabled={isSending}
                >
                  <Text style={{ color: '#000', fontWeight: '900', fontFamily: MONO, fontSize: scaleFont(11) }}>{t('obdTerminal.sendButton', 'GÖNDER')}</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* 2. OBD HEALTH STATISTICS */}
            <View style={[s.sectionCard, { backgroundColor: tc.card, borderColor: tc.border }]}>
              <Text style={[s.sectionTitle, { color: tc.amber, fontSize: scaleFont(11.5) }]}>📊 {t('obdTerminal.statsTitle', 'OBD SAĞLIK İSTATİSTİKLERİ')}</Text>
              <View style={{ gap: scaleHeight(6) }}>
                <View style={s.statRow}>
                  <Text style={[s.statLabel, { color: tc.textSec }]}>{t('obdTerminal.connectionProtocol', 'Bağlantı Protokolü:')}</Text>
                  <Text style={[s.statVal, { color: tc.textPri }]}>{protocol || t('obdTerminal.none', 'Yok')}</Text>
                </View>
                <View style={s.statRow}>
                  <Text style={[s.statLabel, { color: tc.textSec }]}>{t('obdTerminal.hardwareQualityScore', 'Donanım Kalite Skoru:')}</Text>
                  <Text style={[s.statVal, { color: adapterCapabilityScore > 70 ? tc.green : tc.red }]}>
                    {adapterCapabilityScore}/100 ({adapterCapabilityScore > 70 ? t('obdTerminal.original', 'Orijinal') : t('obdTerminal.clone', 'Klon')})
                  </Text>
                </View>
                <View style={s.statRow}>
                  <Text style={[s.statLabel, { color: tc.textSec }]}>{t('obdTerminal.requestResponseCount', 'İstek / Yanıt Sayısı:')}</Text>
                  <Text style={[s.statVal, { color: tc.textPri }]}>{telemetryStats.requestsSent} / {telemetryStats.responsesReceived}</Text>
                </View>
                <View style={s.statRow}>
                  <Text style={[s.statLabel, { color: tc.textSec }]}>{t('obdTerminal.timeoutCount', 'Zaman Aşımı Adedi:')}</Text>
                  <Text style={[s.statVal, { color: telemetryStats.timeoutCount > 0 ? tc.amber : tc.textPri }]}>{telemetryStats.timeoutCount}</Text>
                </View>
                <View style={s.statRow}>
                  <Text style={[s.statLabel, { color: tc.textSec }]}>{t('obdTerminal.recoveryCount', 'Hata Kurtarma (Recovery):')}</Text>
                  <Text style={[s.statVal, { color: telemetryStats.recoveryCount > 0 ? tc.red : tc.textPri }]}>{telemetryStats.recoveryCount}</Text>
                </View>
              </View>
            </View>

            {/* 3. DIAGNOSTIC LOG (TEŞHİS GÜNLÜĞÜ) */}
            <View style={[s.sectionCard, { backgroundColor: tc.card, borderColor: tc.border }]}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: scaleHeight(8) }}>
                <Text style={[s.sectionTitle, { color: tc.purple, fontSize: scaleFont(11.5), marginBottom: 0 }]}>📝 {t('obdTerminal.diagnosticLogTitle', 'TEŞHİS GÜNLÜĞÜ')}</Text>
                <View style={{ flexDirection: 'row', gap: scaleMod(8) }}>
                  <TouchableOpacity 
                    style={[s.actionBtnSmall, { borderColor: tc.border, borderWidth: 1 }]}
                    onPress={() => {
                      clearDiagnosticLogs();
                      Alert.alert(t('common.info', 'Bilgi'), t('dashboard.logsCleared', 'Loglar temizlendi.'));
                    }}
                  >
                    <Text style={{ color: tc.textSec, fontSize: scaleFont(9), fontFamily: MONO, fontWeight: '700' }}>{t('obdTerminal.clearButton', 'TEMİZLE')}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[s.actionBtnSmall, { backgroundColor: tc.purple }]}
                    onPress={handleShareLogs}
                  >
                    <Text style={{ color: '#FFF', fontSize: scaleFont(9), fontFamily: MONO, fontWeight: '700' }}>{t('obdTerminal.shareButton', 'PAYLAŞ')} 📤</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Scrollable logs box */}
              <View style={[s.logsContainer, { backgroundColor: '#07080a', borderColor: tc.border }]}>
                <ScrollView nestedScrollEnabled={true} style={{ maxHeight: scaleHeight(160) }}>
                  {diagnosticLogs.length === 0 ? (
                    <Text style={{ color: '#555', fontFamily: MONO, fontSize: scaleFont(10), textAlign: 'center', marginVertical: scaleHeight(12) }}>
                      {t('obdTerminal.noLogs', 'Herhangi bir teşhis günlüğü kaydı bulunmuyor.')}
                    </Text>
                  ) : (
                    <Text style={{ color: tc.textSec, fontFamily: MONO, fontSize: scaleFont(9.2), lineHeight: scaleFont(13) }}>
                      {diagnosticLogs.join('\n')}
                    </Text>
                  )}
                </ScrollView>
              </View>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const colorsOverlay = (tc: any) => tc.overlayHeavy || 'rgba(0, 0, 0, 0.85)';

const s = StyleSheet.create({
  modalContainer: {
    flex: 1,
    overflow: 'hidden',
  },
  header: {
    height: 56,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    borderBottomWidth: 1.2,
  },
  headerTitle: {
    fontWeight: '900',
  },
  doneBtn: {
    padding: 10,
  },
  sectionCard: {
    borderWidth: 1.2,
    borderRadius: 14,
    padding: 12,
  },
  sectionTitle: {
    fontWeight: '900',
    letterSpacing: 1,
    marginBottom: 10,
  },
  terminalScreen: {
    borderWidth: 1.2,
    borderRadius: 8,
    padding: 10,
    minHeight: 120,
  },
  terminalInput: {
    flex: 1,
    borderWidth: 1.2,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  sendBtn: {
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
    paddingHorizontal: 16,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 2,
  },
  statLabel: {
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
    fontSize: 11,
  },
  statVal: {
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
    fontSize: 11,
    fontWeight: '800',
  },
  actionBtnSmall: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logsContainer: {
    borderWidth: 1.2,
    borderRadius: 8,
    padding: 8,
  },
});
