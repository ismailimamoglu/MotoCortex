import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useThemeColors } from '../theme';
import { useResponsive } from '../hooks/useResponsive';
import { triggerHaptic } from '../utils/haptics';

interface DisclaimersModalProps {
  visible: boolean;
  featureTitle?: string;
  onAccept: () => void;
  onDecline: () => void;
}

export default function DisclaimersModal({
  visible,
  featureTitle = 'ECU Feature Coding',
  onAccept,
  onDecline,
}: DisclaimersModalProps) {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const { fs, ms, vs } = useResponsive();

  const [hasConfirmedVoltage, setHasConfirmedVoltage] = useState(false);
  const [hasConfirmedRisk, setHasConfirmedRisk] = useState(false);

  const canProceed = hasConfirmedVoltage && hasConfirmedRisk;

  const handleAccept = () => {
    if (!canProceed) return;
    triggerHaptic();
    onAccept();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onDecline}
    >
      <View style={styles.overlay}>
        <SafeAreaView style={styles.safeContainer}>
          <View style={[styles.modalBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {/* Header */}
            <View style={styles.header}>
              <Text style={[styles.warningBadge, { backgroundColor: colors.red + '22', color: colors.red }]}>
                ⚠️ CRITICAL SAFETY NOTICE
              </Text>
              <Text style={[styles.title, { color: colors.textPri, fontSize: fs(18) }]}>
                {featureTitle}
              </Text>
              <Text style={[styles.subtitle, { color: colors.textSec, fontSize: fs(12) }]}>
                {t('disclaimer.subtitle', 'Please read and acknowledge vehicle coding safety conditions before proceeding.')}
              </Text>
            </View>

            <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent}>
              <Text style={[styles.paragraph, { color: colors.textPri, fontSize: fs(13) }]}>
                {t('disclaimer.p1', 'ECU coding and parameter writing directly modifies your vehicle\'s Electronic Control Unit configuration memory. MotoCortex executes multi-stage journal backups, but failure to comply with safety rules can risk module lockouts.')}
              </Text>

              {/* Checkbox 1 */}
              <TouchableOpacity
                activeOpacity={0.8}
                style={[styles.checkboxRow, { borderColor: colors.border }]}
                onPress={() => {
                  triggerHaptic();
                  setHasConfirmedVoltage(!hasConfirmedVoltage);
                }}
              >
                <View style={[styles.checkbox, { borderColor: hasConfirmedVoltage ? colors.cyan : colors.border, backgroundColor: hasConfirmedVoltage ? colors.cyan : 'transparent' }]}>
                  {hasConfirmedVoltage && <Text style={styles.checkmark}>✓</Text>}
                </View>
                <Text style={[styles.checkboxLabel, { color: colors.textPri, fontSize: fs(12) }]}>
                  {t('disclaimer.check1', 'I confirm battery voltage is >= 12.2V, ignition is ON, engine is OFF, and vehicle is stationary.')}
                </Text>
              </TouchableOpacity>

              {/* Checkbox 2 */}
              <TouchableOpacity
                activeOpacity={0.8}
                style={[styles.checkboxRow, { borderColor: colors.border }]}
                onPress={() => {
                  triggerHaptic();
                  setHasConfirmedRisk(!hasConfirmedRisk);
                }}
              >
                <View style={[styles.checkbox, { borderColor: hasConfirmedRisk ? colors.cyan : colors.border, backgroundColor: hasConfirmedRisk ? colors.cyan : 'transparent' }]}>
                  {hasConfirmedRisk && <Text style={styles.checkmark}>✓</Text>}
                </View>
                <Text style={[styles.checkboxLabel, { color: colors.textPri, fontSize: fs(12) }]}>
                  {t('disclaimer.check2', 'I acknowledge that I assume full responsibility for feature activations on my vehicle as permitted by law.')}
                </Text>
              </TouchableOpacity>
            </ScrollView>

            {/* Footer Buttons */}
            <View style={styles.footer}>
              <TouchableOpacity
                style={[styles.cancelBtn, { borderColor: colors.border }]}
                onPress={onDecline}
              >
                <Text style={[styles.cancelText, { color: colors.textSec, fontSize: fs(14) }]}>
                  {t('common.cancel', 'Cancel')}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                disabled={!canProceed}
                style={[
                  styles.confirmBtn,
                  { backgroundColor: canProceed ? colors.cyan : colors.border },
                ]}
                onPress={handleAccept}
              >
                <Text style={[styles.confirmText, { color: canProceed ? '#FFFFFF' : colors.textSec, fontSize: fs(14) }]}>
                  {t('disclaimer.proceed', 'I Understand & Proceed')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  safeContainer: {
    width: '90%',
    maxWidth: 500,
  },
  modalBox: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
    maxHeight: '85%',
  },
  header: {
    marginBottom: 16,
  },
  warningBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    fontWeight: 'bold',
    fontSize: 11,
    marginBottom: 8,
    overflow: 'hidden',
  },
  title: {
    fontWeight: '700',
    marginBottom: 4,
  },
  subtitle: {
    lineHeight: 16,
  },
  body: {
    marginVertical: 12,
  },
  bodyContent: {
    gap: 12,
  },
  paragraph: {
    lineHeight: 18,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    gap: 12,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkmark: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 14,
  },
  checkboxLabel: {
    flex: 1,
    lineHeight: 16,
  },
  footer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
  },
  cancelText: {
    fontWeight: '600',
  },
  confirmBtn: {
    flex: 2,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  confirmText: {
    fontWeight: '700',
  },
});
