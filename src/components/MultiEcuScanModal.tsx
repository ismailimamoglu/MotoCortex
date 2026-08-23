import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useThemeColors } from '../theme';
import { KNOWN_ECU_MODULES, ModuleDiagnosticResult, EcuModuleTarget, MultiEcuService } from '../services/multiEcuService';
import { useBluetoothStore } from '../store/useBluetoothStore';
import { useAppStore } from '../store/useAppStore';
import { lookupDTC } from '../data/dtcDictionary';
import AiDoctorModal from './AiDoctorModal';
import { AiDiagnosticContext } from '../services/aiDoctorService';

interface MultiEcuScanModalProps {
  visible: boolean;
  onClose: () => void;
  onScanModule?: (headerHex: string) => Promise<string[]>;
  onClearModule?: (headerHex: string) => Promise<boolean>;
}

export const MultiEcuScanModal: React.FC<MultiEcuScanModalProps> = ({
  visible,
  onClose,
  onScanModule,
  onClearModule,
}) => {
  const { t } = useTranslation();
  const tc = useThemeColors();
  const isSimulationMode = useAppStore((state) => state.isSimulationMode);

  const [isScanning, setIsScanning] = useState(false);
  const [activeModule, setActiveModule] = useState<string>('');
  const [results, setResults] = useState<ModuleDiagnosticResult[]>([]);
  const [clearingModuleId, setClearingModuleId] = useState<string | null>(null);

  // AI Doctor Modal State
  const [aiDoctorVisible, setAiDoctorVisible] = useState(false);
  const [aiDoctorContext, setAiDoctorContext] = useState<AiDiagnosticContext>({ dtcCodes: [] });

  const handleStartScan = async () => {
    if (isScanning) return;
    setIsScanning(true);
    setResults([]);

    try {
      const scanResults: ModuleDiagnosticResult[] = [];
      const btState = useBluetoothStore.getState();
      const currentProtocol = btState.protocol;

      for (const mod of KNOWN_ECU_MODULES) {
        setActiveModule(t(mod.nameKey));
        await new Promise((res) => setTimeout(res, 60)); // Fast non-blocking pacing

        let modResult: ModuleDiagnosticResult;

        if (!isSimulationMode && btState.status === 'connected') {
          modResult = await MultiEcuService.scanHardwareModule(mod, currentProtocol);
        } else {
          // Simulation / Mock fallback for offline evaluation
          let dtcCodes: string[] = [];
          if (mod.id === 'tcm') dtcCodes = isSimulationMode ? ['P0700'] : [];
          else if (mod.id === 'abs') dtcCodes = isSimulationMode ? ['C0035'] : [];
          else dtcCodes = [];

          modResult = {
            module: mod,
            isResponding: true,
            dtcCount: dtcCodes.length,
            dtcCodes,
            status: dtcCodes.length === 0 ? 'CLEAN' : 'FAULT_DETECTED',
            latencyMs: Math.floor(Math.random() * 15) + 8,
          };
        }

        scanResults.push(modResult);
      }

      setResults(scanResults);
    } catch (err) {
      console.warn('[MultiEcuScanModal] Scan interrupted:', err);
    } finally {
      setIsScanning(false);
      setActiveModule('');
    }
  };

  const handleClearModule = async (module: EcuModuleTarget) => {
    Alert.alert(
      t('multiEcu.clearConfirmTitle', { defaultValue: 'Arıza Kodlarını Sil' }),
      t('multiEcu.clearConfirmDesc', { 
        module: t(module.nameKey),
        defaultValue: `${t(module.nameKey)} modülündeki arıza kodları silinecek. Emin misiniz?`
      }),
      [
        { text: t('common.cancel', { defaultValue: 'İptal' }), style: 'cancel' },
        {
          text: t('common.confirm', { defaultValue: 'Onayla' }),
          style: 'destructive',
          onPress: async () => {
            setClearingModuleId(module.id);
            try {
              if (onClearModule && !isSimulationMode && useBluetoothStore.getState().status === 'connected') {
                await onClearModule(module.txHeader);
              } else {
                await MultiEcuService.clearHardwareModuleDtc(module.txHeader);
              }

              // Update state for this module
              setResults((prev) =>
                prev.map((r) =>
                  r.module.id === module.id
                    ? { ...r, status: 'CLEAN', dtcCount: 0, dtcCodes: [] }
                    : r
                )
              );
            } catch (err) {
              console.warn('[MultiEcuScanModal] Clear module failed:', err);
            } finally {
              setClearingModuleId(null);
            }
          },
        },
      ]
    );
  };

  const [activeDoctorModule, setActiveDoctorModule] = useState<EcuModuleTarget | null>(null);

  const handleOpenAiDoctor = (code: string, mod: EcuModuleTarget) => {
    const btState = useBluetoothStore.getState();
    setActiveDoctorModule(mod);
    setAiDoctorContext({
      dtcCodes: [code],
      vin: btState.vin || undefined,
      rpm: btState.rpm || undefined,
      coolantTemp: btState.coolant || undefined,
      engineVoltage: btState.voltage ? parseFloat(btState.voltage) || undefined : undefined,
    });
    setAiDoctorVisible(true);
  };

  if (!visible) return null;

  return (
    <View style={{ flex: 1, backgroundColor: tc.bg, padding: 16 }}>
      {(!onScanModule || isSimulationMode) && (
        <View style={[styles.simBadge, { backgroundColor: `${tc.cyan}12`, borderColor: `${tc.cyan}40` }]}>
          <Text style={[styles.simBadgeText, { color: tc.cyan }]}>
            {isSimulationMode ? t('multiEcu.simBanner') : t('multiEcu.hardwareBanner')}
          </Text>
        </View>
      )}

      {/* Start Scan Button */}
      <TouchableOpacity
        activeOpacity={0.8}
        style={[
          styles.scanBtn,
          { backgroundColor: isScanning ? tc.card : tc.cyan },
          isScanning && { borderWidth: 1, borderColor: `${tc.cyan}60` },
        ]}
        onPress={handleStartScan}
        disabled={isScanning}
      >
        {isScanning ? (
          <View style={styles.scanBtnRow}>
            <ActivityIndicator size="small" color={tc.cyan} />
            <Text style={[styles.scanBtnText, { color: tc.cyan }]}>
              {t('multiEcu.scanningModule', { module: activeModule })}
            </Text>
          </View>
        ) : (
          <Text style={[styles.scanBtnText, { color: tc.textPri, fontWeight: '800' }]}>
            {t('multiEcu.scanBtn')}
          </Text>
        )}
      </TouchableOpacity>

      {/* Results List */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 40, gap: 10 }}
        showsVerticalScrollIndicator={false}
      >
        {results.length === 0 && !isScanning && (
          <View style={[styles.emptyContainer, { borderColor: `${tc.textSec}25` }]}>
            <Text style={[styles.emptyTitle, { color: tc.textPri }]}>
              {t('multiEcu.emptyTitle')}
            </Text>
            <Text style={[styles.emptySubtitle, { color: tc.textSec }]}>
              {t('multiEcu.emptyDesc')}
            </Text>
          </View>
        )}

        {results.map((res) => {
          const isClean = res.status === 'CLEAN';
          const isFault = res.status === 'FAULT_DETECTED';
          const isNoResponse = res.status === 'NO_RESPONSE';
          const isNotSupported = res.status === 'NOT_SUPPORTED';

          const badgeBg = isClean
            ? 'rgba(0, 255, 136, 0.12)'
            : isFault
            ? 'rgba(255, 59, 59, 0.15)'
            : isNoResponse
            ? 'rgba(255, 170, 0, 0.12)'
            : 'rgba(128, 128, 128, 0.15)';

          const badgeBorder = isClean
            ? `${tc.green}40`
            : isFault
            ? `${tc.red}50`
            : isNoResponse
            ? 'rgba(255, 170, 0, 0.4)'
            : 'rgba(128, 128, 128, 0.4)';

          const badgeColor = isClean
            ? tc.green
            : isFault
            ? tc.red
            : isNoResponse
            ? '#FFAA00'
            : tc.textSec;

          const badgeText = isClean
            ? t('dashboard.statusNormal', { defaultValue: 'NORMAL' })
            : isFault
            ? t('multiEcu.statusFault', { count: res.dtcCount, defaultValue: `${res.dtcCount} HATA` })
            : isNoResponse
            ? t('multiEcu.statusNoResponse', { defaultValue: 'CEVAP YOK / SÖKÜK' })
            : t('multiEcu.statusNotSupported', { defaultValue: 'CAN GEREKLİ' });

          return (
            <View
              key={res.module.id}
              style={[
                styles.moduleCard,
                {
                  backgroundColor: tc.card,
                  borderColor: isFault ? `${tc.red}40` : `${tc.textSec}20`,
                },
              ]}
            >
              <View style={styles.moduleHeader}>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Text style={[styles.moduleName, { color: tc.textPri }]}>
                    {t(res.module.nameKey)}
                  </Text>
                  {isNotSupported && (
                    <Text style={{ fontSize: 10, color: tc.textSec, marginTop: 2 }}>
                      {t('multiEcu.klineHeaderNotice', { defaultValue: 'K-Line protokolünde CAN header taraması desteklenmez' })}
                    </Text>
                  )}
                </View>

                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <View
                    style={[
                      styles.statusBadge,
                      {
                        backgroundColor: badgeBg,
                        borderColor: badgeBorder,
                        borderWidth: 1,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusBadgeText,
                        { color: badgeColor },
                      ]}
                    >
                      {badgeText}
                    </Text>
                  </View>

                  {res.dtcCodes.length > 0 && (
                    <TouchableOpacity
                      activeOpacity={0.7}
                      style={[styles.clearBtn, { backgroundColor: `${tc.red}18`, borderColor: `${tc.red}60` }]}
                      onPress={() => handleClearModule(res.module)}
                      disabled={clearingModuleId === res.module.id}
                    >
                      {clearingModuleId === res.module.id ? (
                        <ActivityIndicator size="small" color={tc.red} />
                      ) : (
                        <Text style={[styles.clearBtnText, { color: tc.red }]}>
                          {t('multiEcu.clearModuleBtn', { defaultValue: 'Temizle' })}
                        </Text>
                      )}
                    </TouchableOpacity>
                  )}
                </View>
              </View>

              {res.dtcCodes.length > 0 && (
                <View style={{ gap: 8, marginTop: 12 }}>
                  {res.dtcCodes.map((code) => {
                    let desc = lookupDTC(code) || '';
                    desc = desc.replace(/\s*More details\.*/gi, '').trim();
                    return (
                      <View 
                        key={code} 
                        style={{ 
                          backgroundColor: `${tc.red}0a`, 
                          borderWidth: 1, 
                          borderColor: `${tc.red}30`, 
                          borderRadius: 10, 
                          padding: 10 
                        }}
                      >
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: desc ? 6 : 0 }}>
                          <View style={{ backgroundColor: tc.red, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 }}>
                            <Text style={{ color: '#ffffff', fontWeight: '900', fontSize: 12, fontFamily: 'monospace' }}>{code}</Text>
                          </View>

                          <TouchableOpacity
                            activeOpacity={0.7}
                            style={[styles.aiDoctorBtn, { backgroundColor: `${tc.cyan}14`, borderColor: `${tc.cyan}50` }]}
                            onPress={() => handleOpenAiDoctor(code, res.module)}
                          >
                            <Text style={[styles.aiDoctorBtnText, { color: tc.cyan }]}>
                              {t('multiEcu.aiDoctorBtn', { defaultValue: 'AI Doctor' })}
                            </Text>
                          </TouchableOpacity>
                        </View>
                        {Boolean(desc) && (
                          <Text style={{ color: tc.textPri, fontSize: 12.5, lineHeight: 17, fontWeight: '500' }}>
                            {desc}
                          </Text>
                        )}
                      </View>
                    );
                  })}
                </View>
              )}
            </View>
          );
        })}
      </ScrollView>

      {/* AI Doctor Diagnostic Modal */}
      <AiDoctorModal
        visible={aiDoctorVisible}
        onClose={() => setAiDoctorVisible(false)}
        context={aiDoctorContext}
        onClearDtc={activeDoctorModule ? () => handleClearModule(activeDoctorModule) : undefined}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  scanBtn: {
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  scanBtnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  scanBtnText: {
    color: '#fff',
    fontSize: 14,
  },
  simBadge: {
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 12,
    marginBottom: 12,
    alignItems: 'center',
  },
  simBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  emptyContainer: {
    padding: 24,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: 16,
    alignItems: 'center',
    marginTop: 20,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },
  moduleCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
  },
  moduleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  moduleName: {
    fontSize: 14,
    fontWeight: '700',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '800',
  },
  clearBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
  },
  clearBtnText: {
    fontSize: 11,
    fontWeight: '800',
  },
  aiDoctorBtn: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  aiDoctorBtnText: {
    fontSize: 11,
    fontWeight: '800',
  },
});

export default MultiEcuScanModal;
