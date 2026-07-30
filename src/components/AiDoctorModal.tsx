import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Platform,
  SafeAreaView
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useThemeColors } from '../theme';
import { useResponsive } from '../hooks/useResponsive';
import { AiDoctorService, AiDiagnosticResult, AiDiagnosticContext } from '../services/aiDoctorService';

const MONO = Platform.OS === 'ios' ? 'System' : 'sans-serif';

interface AiDoctorModalProps {
  visible: boolean;
  onClose: () => void;
  context: AiDiagnosticContext;
}

export default function AiDoctorModal({ visible, onClose, context }: AiDoctorModalProps) {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const { s: scaleWidth, vs: scaleHeight, fs: scaleFont } = useResponsive();

  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState<AiDiagnosticResult | null>(null);

  const dtcKey = (context?.dtcCodes || []).join(',');
  const contextKey = visible ? `${dtcKey}_${context?.vin || ''}` : '';

  useEffect(() => {
    let isMounted = true;
    if (visible && contextKey) {
      setLoading(true);
      AiDoctorService.analyzeFaults(context)
        .then((res) => {
          if (isMounted) setResult(res);
        })
        .catch(() => {
          if (isMounted) setResult(null);
        })
        .finally(() => {
          if (isMounted) setLoading(false);
        });
    }
    return () => { isMounted = false; };
  }, [visible, contextKey]);

  const getRiskBadge = (level: string) => {
    switch (level) {
      case 'CRITICAL':
        return { label: '🔴 CRITICAL RISK', bg: '#3d1214', border: '#ff3344', text: '#ff5566' };
      case 'WARNING':
        return { label: '🟡 MODERATE RISK', bg: '#36280b', border: '#ffaa00', text: '#ffbb11' };
      case 'SAFE':
      default:
        return { label: '🟢 SYSTEM OPTIMAL', bg: '#0d331e', border: '#00cc66', text: '#00ee77' };
    }
  };

  const badge = getRiskBadge(result?.riskLevel || 'SAFE');

  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onClose}>
      <SafeAreaView style={[styles.container, { backgroundColor: colors.bg || '#090d16' }]}>
        <View style={styles.header}>
          <View>
            <Text style={[styles.headerTitle, { color: colors.textPri || '#ffffff' }]}>MotoCortex AI Doctor</Text>
            <Text style={styles.headerSubtitle}>26-Language Intelligent DTC Diagnostic Specialist</Text>
          </View>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeText}>✕</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#00e5ff" />
            <Text style={styles.loadingText}>{t('aiDoctor.analyzing', 'Analyzing DTC codes & engine telemetry with AI Doctor...')}</Text>
          </View>
        ) : result ? (
          <ScrollView contentContainerStyle={styles.scrollContent}>
            {/* Risk Badge Banner */}
            <View style={[styles.riskBanner, { backgroundColor: badge.bg, borderColor: badge.border }]}>
              <Text style={[styles.riskBadgeText, { color: badge.text }]}>{badge.label.replace('🔴 ', '').replace('🟡 ', '').replace('🟢 ', '')}</Text>
              <Text style={styles.riskScoreText}>{t('aiDoctor.healthImpact', { score: result.riskScore }, `Health Score Impact: ${result.riskScore}/100`)}</Text>
            </View>

            {/* Analysis Title & Summary */}
            <View style={[styles.card, { backgroundColor: '#131b2e', borderColor: '#1f2d4a' }]}>
              <Text style={styles.cardTitle}>{result.title}</Text>
              <Text style={styles.cardSummary}>{result.summary}</Text>
            </View>

            {/* Driving Safety Advice */}
            <View style={[styles.card, { backgroundColor: '#1a1928', borderColor: '#3a3858' }]}>
              <Text style={styles.sectionHeader}>{t('aiDoctor.drivingSafety', 'Driving Safety Guidance')}</Text>
              <Text style={styles.safetyText}>{result.canDriveSafetyText}</Text>
            </View>

            {/* Potential Causes */}
            {result.causes.length > 0 && (
              <View style={[styles.card, { backgroundColor: '#131b2e', borderColor: '#1f2d4a' }]}>
                <Text style={styles.sectionHeader}>{t('aiDoctor.causes', 'Probable Causes')}</Text>
                {result.causes.map((cause, idx) => (
                  <View key={idx} style={styles.bulletItem}>
                    <Text style={styles.bulletSymbol}>•</Text>
                    <Text style={styles.bulletText}>{cause}</Text>
                  </View>
                ))}
              </View>
            )}

            {/* Actionable Repair Steps */}
            {result.recommendedSteps.length > 0 && (
              <View style={[styles.card, { backgroundColor: '#131b2e', borderColor: '#1f2d4a' }]}>
                <Text style={styles.sectionHeader}>{t('aiDoctor.recommendedAction', 'Recommended Mechanical Action')}</Text>
                {result.recommendedSteps.map((step, idx) => (
                  <View key={idx} style={styles.bulletItem}>
                    <Text style={styles.stepNumber}>{idx + 1}.</Text>
                    <Text style={styles.bulletText}>{step}</Text>
                  </View>
                ))}
              </View>
            )}
          </ScrollView>
        ) : null}
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#1a2638',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    fontFamily: MONO,
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#88a0c0',
    marginTop: 2,
  },
  closeButton: {
    padding: 8,
    backgroundColor: '#1c283d',
    borderRadius: 20,
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 30,
  },
  loadingText: {
    color: '#88a0c0',
    marginTop: 15,
    textAlign: 'center',
    fontSize: 14,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  riskBanner: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  riskBadgeText: {
    fontSize: 14,
    fontWeight: 'bold',
    fontFamily: MONO,
  },
  riskScoreText: {
    fontSize: 12,
    color: '#d0e0f0',
  },
  card: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 14,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#00e5ff',
    marginBottom: 6,
  },
  cardSummary: {
    fontSize: 14,
    color: '#d0e0f0',
    lineHeight: 20,
  },
  sectionHeader: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 10,
  },
  safetyText: {
    fontSize: 14,
    color: '#e0e8f8',
    lineHeight: 20,
  },
  bulletItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  bulletSymbol: {
    color: '#00e5ff',
    fontSize: 16,
    marginRight: 8,
    marginTop: -2,
  },
  stepNumber: {
    color: '#00e5ff',
    fontWeight: 'bold',
    marginRight: 8,
  },
  bulletText: {
    fontSize: 14,
    color: '#c0d4ec',
    flex: 1,
    lineHeight: 20,
  },
  costText: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#00ffaa',
    fontFamily: MONO,
  },
});
