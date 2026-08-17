import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
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
        await new Promise((res) => setTimeout(res, 120)); // Fast non-blocking scan (<2s total)

        let dtcCodes: string[] = [];
        if (onScanModule) {
          dtcCodes = await onScanModule(mod.txHeader).catch(() => []);
        } else {
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
          latencyMs: Math.floor(Math.random() * 15) + 8,
        });
      }

      setResults(mockResults);
    } catch (err) {
      console.warn('[MultiEcuScanModal] Scan interrupted:', err);
    } finally {
      setIsScanning(false);
      setActiveModule('');
    }
  };

  if (!visible) return null;

  return (
    <View style={{ flex: 1, backgroundColor: tc.bg, padding: 16 }}>
      {(!onScanModule || isSimulationMode) && (
        <View style={[styles.simBadge, { backgroundColor: `${tc.cyan}12`, borderColor: `${tc.cyan}40` }]}>
          <Text style={[styles.simBadgeText, { color: tc.cyan }]}>
            {t('common.sampleSimData', { defaultValue: 'Örnek Simülasyon Verisi' })}
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
              {t('multiEcu.readyTitle', { defaultValue: 'ECU Teşhisi Hazır' })}
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
                borderColor: res.status === 'CLEAN' ? `${tc.green}60` : tc.red,
                borderWidth: res.status === 'CLEAN' ? 1.2 : 1.8,
              },
            ]}
          >
            <View style={styles.moduleHeader}>
              <View style={{ flex: 1, marginRight: 8 }}>
                <Text style={[styles.moduleName, { color: tc.textPri }]}>
                  {t(res.module.nameKey)}
                </Text>
              </View>

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
                    ? t('dashboard.statusNormal', { defaultValue: 'NORMAL' })
                    : t('multiEcu.statusFault', { count: res.dtcCount, defaultValue: `${res.dtcCount} ARIZA TESPİT EDİLDİ` })}
                </Text>
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
                        backgroundColor: `${tc.red}0c`, 
                        borderWidth: 1, 
                        borderColor: `${tc.red}40`, 
                        borderRadius: 10, 
                        padding: 10 
                      }}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: desc ? 6 : 0 }}>
                        <View style={{ backgroundColor: tc.red, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 }}>
                          <Text style={{ color: '#ffffff', fontWeight: '900', fontSize: 12, fontFamily: 'monospace' }}>{code}</Text>
                        </View>
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
    padding: 16,
    borderRadius: 16,
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
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  statusBadgeText: {
    fontSize: 11,
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
