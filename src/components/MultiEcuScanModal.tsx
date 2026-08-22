import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useThemeColors } from '../theme';
import { KNOWN_ECU_MODULES, ModuleDiagnosticResult, EcuModuleTarget } from '../services/multiEcuService';
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

      for (const mod of KNOWN_ECU_MODULES) {
        setActiveModule(t(mod.nameKey));
        await new Promise((res) => setTimeout(res, 100)); // Fast non-blocking pacing

        let dtcCodes: string[] = [];
        const btStatus = useBluetoothStore.getState().status;
        if (onScanModule && !isSimulationMode && btStatus === 'connected') {
          dtcCodes = await onScanModule(mod.txHeader).catch(() => []);
        } else {
          // Simulation / Mock fallback for offline evaluation
          if (mod.id === 'tcm') dtcCodes = isSimulationMode ? ['P0700'] : [];
          else if (mod.id === 'abs') dtcCodes = isSimulationMode ? ['C0035'] : [];
          else dtcCodes = [];
        }

        scanResults.push({
          module: mod,
          isResponding: true,
          dtcCount: dtcCodes.length,
          dtcCodes,
          status: dtcCodes.length === 0 ? 'CLEAN' : 'FAULT_DETECTED',
          latencyMs: Math.floor(Math.random() * 15) + 8,
        });
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
      t('multiEcu.clearConfirmTitle'),
      t('multiEcu.clearConfirmDesc', { 
        module: t(module.nameKey),
      }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.confirm'),
          style: 'destructive',
          onPress: async () => {
            setClearingModuleId(module.id);
            try {
              if (onClearModule && !isSimulationMode && useBluetoothStore.getState().status === 'connected') {
                await onClearModule(module.txHeader);
              } else {
                await new Promise((r) => setTimeout(r, 400));
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
            {t('common.sampleSimData')}
          </Text>
        </View>
      )}

      {/* Scan Action Button */}
      <TouchableOpacity
        activeOpacity={0.8}
        style={[
          styles.scanBtn,
          { 
            backgroundColor: isScanning ? tc.elevated : '#007eff', 
            borderWidth: isScanning ? 1.5 : 0, 
            borderColor: tc.cyan,
            shadowColor: '#007eff',
            shadowOpacity: isScanning ? 0 : 0.35,
            shadowRadius: 8,
            elevation: isScanning ? 0 : 4,
          },
        ]}
        onPress={handleStartScan}
        disabled={isScanning}
      >
        {isScanning ? (
          <View style={styles.scanBtnRow}>
            <ActivityIndicator color={tc.cyan} size="small" />
            <Text style={[styles.scanBtnText, { color: tc.cyan }]}>
              {t('multiEcu.scanning', { module: activeModule })}
            </Text>
          </View>
        ) : (
          <Text style={styles.scanBtnText}>{t('multiEcu.scanBtn')}</Text>
        )}
      </TouchableOpacity>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {results.length === 0 && !isScanning && (
          <View style={[styles.emptyBox, { backgroundColor: tc.elevated, borderColor: tc.border }]}>
            <Text style={[styles.emptyTitle, { color: tc.textPri }]}>
              {t('multiEcu.readyTitle')}
            </Text>
            <Text style={[styles.emptyText, { color: tc.textSec }]}>
              {t('multiEcu.scanHintText')}
            </Text>
          </View>
        )}

        {results.map((res) => (
          <View
            key={res.module.id}
            style={[
              styles.moduleCard,
              {
                backgroundColor: tc.elevated,
                borderColor: res.status === 'CLEAN' ? `${tc.green}50` : `${tc.red}80`,
                borderWidth: res.status === 'CLEAN' ? 1.2 : 1.6,
              },
            ]}
          >
            <View style={styles.moduleHeader}>
              <View style={{ flex: 1, marginRight: 8 }}>
                <Text style={[styles.moduleName, { color: tc.textPri }]}>
                  {t(res.module.nameKey)}
                </Text>
              </View>

              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <View
                  style={[
                    styles.statusBadge,
                    {
                      backgroundColor:
                        res.status === 'CLEAN' ? 'rgba(0, 255, 136, 0.12)' : 'rgba(255, 59, 59, 0.15)',
                      borderColor: res.status === 'CLEAN' ? `${tc.green}40` : `${tc.red}50`,
                      borderWidth: 1,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.statusBadgeText,
                      { color: res.status === 'CLEAN' ? tc.green : tc.red },
                    ]}
                  >
                    {res.status === 'CLEAN'
                      ? t('dashboard.statusNormal')
                      : t('multiEcu.statusFault', { count: res.dtcCount })}
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
                        {t('multiEcu.clearModuleBtn')}
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
                            {t('multiEcu.aiDoctorBtn')}
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
        ))}
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
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  content: {
    gap: 12,
    paddingBottom: 24,
  },
  emptyBox: {
    padding: 24,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    marginTop: 12,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 6,
  },
  emptyText: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },
  moduleCard: {
    padding: 14,
    borderRadius: 14,
    borderWidth: 1.5,
  },
  moduleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  moduleName: {
    fontSize: 14,
    fontWeight: '800',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '800',
  },
  clearBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  clearBtnText: {
    fontSize: 11,
    fontWeight: '800',
  },
  aiDoctorBtn: {
    paddingHorizontal: 8,
    paddingVertical: 3.5,
    borderRadius: 6,
    borderWidth: 1,
  },
  aiDoctorBtnText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  simBadge: {
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    marginBottom: 10,
  },
  simBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    fontFamily: 'monospace',
  },
});

export default MultiEcuScanModal;
