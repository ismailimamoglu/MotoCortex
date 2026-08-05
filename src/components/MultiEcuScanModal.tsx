import React, { useState } from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useThemeColors } from '../theme';
import { KNOWN_ECU_MODULES, ModuleDiagnosticResult } from '../services/multiEcuService';
import { useBluetoothStore } from '../store/useBluetoothStore';
import { useAppStore } from '../store/useAppStore';
import { lookupDTC } from '../data/dtcDictionary';

interface MultiEcuScanModalProps {
  visible: boolean;
  onClose: () => void;
  onScanModule?: (headerHex: string) => Promise<string[]>;
}

export const MultiEcuScanModal: React.FC<MultiEcuScanModalProps> = ({
  visible,
  onClose,
  onScanModule,
}) => {
  const { t } = useTranslation();
  const tc = useThemeColors();
  const isSimulationMode = useAppStore((state) => state.isSimulationMode);

  const [isScanning, setIsScanning] = useState(false);
  const [activeModule, setActiveModule] = useState<string>('');
  const [results, setResults] = useState<ModuleDiagnosticResult[]>([]);

  const handleStartScan = async () => {
    if (isScanning) return;
    setIsScanning(true);
    setResults([]);

    try {
      const mockResults: ModuleDiagnosticResult[] = [];

      for (const mod of KNOWN_ECU_MODULES) {
        setActiveModule(t(mod.nameKey));
        await new Promise((res) => setTimeout(res, 600)); // Scan pause simulation

        let dtcCodes: string[] = [];
        if (onScanModule) {
          dtcCodes = await onScanModule(mod.txHeader).catch(() => []);
        } else {
          // Fallback demo simulation
          const currentDtcs = useBluetoothStore.getState().dtcs || [];
          if (mod.id === 'ecm') dtcCodes = currentDtcs;
          else if (mod.id === 'tcm') dtcCodes = [];
          else if (mod.id === 'abs') dtcCodes = [];
          else if (mod.id === 'srs') dtcCodes = [];
          else dtcCodes = [];
        }

        mockResults.push({
          module: mod,
          isResponding: true,
          dtcCount: dtcCodes.length,
          dtcCodes,
          status: dtcCodes.length === 0 ? 'CLEAN' : 'FAULT_DETECTED',
          latencyMs: Math.floor(Math.random() * 20) + 12,
        });
      }

      setResults(mockResults);
    } catch (err) {
      console.warn('[MultiEcuScanModal] Scan interrupted or failed:', err);
    } finally {
      setIsScanning(false);
      setActiveModule('');
    }
  };

  if (!visible) return null;

  return (
    <View style={{ flex: 1, backgroundColor: tc.bg, padding: 16 }}>
      {(!onScanModule || isSimulationMode) && (
        <View style={[styles.simBadge, { backgroundColor: `${tc.cyan}20`, borderColor: tc.cyan }]}>
          <Text style={[styles.simBadgeText, { color: tc.cyan }]}>
            🧪 {t('common.sampleSimData', 'Örnek Simülasyon Verisi (Araç Bağlı Değil)')}
          </Text>
        </View>
      )}

          {/* Scan Action */}
          <TouchableOpacity
            style={[
              styles.scanBtn,
              { backgroundColor: isScanning ? tc.elevated : tc.cyan, opacity: isScanning ? 0.9 : 1, borderWidth: isScanning ? 1.5 : 0, borderColor: tc.cyan },
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

          <ScrollView contentContainerStyle={styles.content}>
            {results.length === 0 && !isScanning && (
              <View style={[styles.emptyBox, { backgroundColor: tc.elevated, borderColor: tc.border }]}>
                <Text style={[styles.emptyText, { color: tc.textSec }]}>
                  {t('multiEcu.scanHintText', "Tap SCAN ALL MODULES to query diagnostic trouble codes across all vehicle electronic control units.")}
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
                    borderColor: res.status === 'CLEAN' ? tc.green : tc.red,
                  },
                ]}
              >
                <View style={styles.moduleHeader}>
                  <View style={{ flex: 1, marginRight: 8 }}>
                    <Text style={[styles.moduleName, { color: tc.textPri }]} numberOfLines={1}>
                      {t(res.module.nameKey)}
                    </Text>
                  </View>

                  <View
                    style={[
                      styles.statusBadge,
                      {
                        backgroundColor:
                          res.status === 'CLEAN' ? 'rgba(0, 255, 136, 0.15)' : 'rgba(255, 59, 59, 0.15)',
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
                        ? t('multiEcu.statusClean')
                        : t('multiEcu.statusFault', { count: res.dtcCount })}
                    </Text>
                  </View>
                </View>

                {res.dtcCodes.length > 0 && (
                  <View style={{ gap: 6, marginTop: 10 }}>
                    {res.dtcCodes.map((code) => {
                      const desc = lookupDTC(code);
                      return (
                        <View key={code} style={{ backgroundColor: tc.card, borderWidth: 1, borderColor: `${tc.red}40`, borderRadius: 8, padding: 8 }}>
                          <Text style={{ color: tc.red, fontWeight: '800', fontSize: 12, fontFamily: 'monospace' }}>{code}</Text>
                          {desc && <Text style={{ color: tc.textSec, fontSize: 10, fontFamily: 'monospace', marginTop: 2 }}>{desc}</Text>}
                        </View>
                      );
                    })}
                  </View>
                )}
              </View>
            ))}
          </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  container: {
    height: '85%',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
  },
  subtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
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
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },
  moduleCard: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1.5,
  },
  moduleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  moduleTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  moduleIcon: {
    fontSize: 24,
  },
  moduleName: {
    fontSize: 14,
    fontWeight: '800',
  },
  headerCode: {
    fontSize: 11,
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '800',
  },
  dtcList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  dtcChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  dtcChipText: {
    fontSize: 12,
    fontWeight: '800',
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
