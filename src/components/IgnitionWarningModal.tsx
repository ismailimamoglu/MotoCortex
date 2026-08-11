import React from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useThemeColors } from '../theme';

interface IgnitionWarningModalProps {
  visible: boolean;
  onClose: () => void;
  onRetry: () => void;
  voltageV?: number;
  isReconnecting?: boolean;
}

export const IgnitionWarningModal: React.FC<IgnitionWarningModalProps> = ({
  visible,
  onClose,
  onRetry,
  voltageV = 0,
  isReconnecting = false,
}) => {
  const { t } = useTranslation();
  const tc = useThemeColors();

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={[styles.overlay, { backgroundColor: tc.overlayHeavy }]}>
        <View style={[styles.container, { backgroundColor: tc.card, borderColor: tc.amber }]}>
          <View style={[styles.iconBadge, { backgroundColor: 'rgba(255, 184, 0, 0.15)' }]}>
            <Text style={styles.iconText}>🔑</Text>
          </View>

          <Text style={[styles.title, { color: tc.textPri }]}>
            {isReconnecting ? t('ignition.reconnectingTitle') : t('ignition.warningOff')}
          </Text>

          <Text style={[styles.desc, { color: tc.textSec }]}>
            {isReconnecting ? t('ignition.reconnectingDesc') : t('ignition.descOff')}
          </Text>

          {voltageV > 0 && (
            <View style={[styles.voltageBox, { backgroundColor: tc.elevated, borderColor: tc.border }]}>
              <Text style={[styles.voltageLabel, { color: tc.textSec }]}>
                {t('ignition.batteryVoltage')}
              </Text>
              <Text style={[styles.voltageVal, { color: voltageV < 11.8 ? tc.red : tc.amber }]}>
                {voltageV.toFixed(1)}V
              </Text>
            </View>
          )}

          <View style={styles.btnRow}>
            <TouchableOpacity
              style={[styles.btn, styles.cancelBtn, { borderColor: tc.border }]}
              onPress={onClose}
              activeOpacity={0.8}
            >
              <Text style={[styles.btnText, { color: tc.textSec }]}>{t('common.cancel')}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.btn, styles.retryBtn, { backgroundColor: tc.amber }]}
              onPress={onRetry}
              activeOpacity={0.8}
            >
              <Text style={[styles.btnText, { color: '#000', fontWeight: '700' }]}>
                {t('common.continueBtn')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  container: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 20,
    borderWidth: 1.5,
    padding: 24,
    alignItems: 'center',
  },
  iconBadge: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  iconText: {
    fontSize: 32,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 8,
  },
  desc: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: 16,
  },
  voltageBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 20,
  },
  voltageLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  voltageVal: {
    fontSize: 16,
    fontWeight: '800',
  },
  btnRow: {
    flexDirection: 'row',
    width: '100%',
    gap: 12,
  },
  btn: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelBtn: {
    borderWidth: 1,
  },
  retryBtn: {},
  btnText: {
    fontSize: 14,
    fontWeight: '600',
  },
});

export default IgnitionWarningModal;
