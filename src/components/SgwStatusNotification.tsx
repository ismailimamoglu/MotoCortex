import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useThemeColors } from '../theme';
import { useResponsive } from '../hooks/useResponsive';

interface Props {
  visible: boolean;
  brandName?: string;
  onDismiss: () => void;
}

export const SgwStatusNotification: React.FC<Props> = ({ visible, brandName = 'OEM', onDismiss }) => {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const { s: scaleWidth, vs: scaleHeight, ms: scaleMod, fs: scaleFont } = useResponsive();

  if (!visible) return null;

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.amber }]}>
      <View style={styles.headerRow}>
        <Text style={[styles.icon, { fontSize: scaleFont(16) }]}>🛡️</Text>

        <View style={styles.titleContainer}>
          <Text style={[styles.title, { color: colors.amber, fontSize: scaleFont(13) }]}>
            {t('sgw.title', 'Security Gateway (SGW) Active')}
          </Text>

          <Text style={[styles.subTitle, { color: colors.textSec, fontSize: scaleFont(11) }]}>
            {t('sgw.subtitle', `${brandName} ECU Security Restriction`, { brandName })}
          </Text>
        </View>
      </View>

      <Text style={[styles.description, { color: colors.textPri, fontSize: scaleFont(11) }]}>
        {t('sgw.description', 'Security Gateway (SGW) protection is active on this vehicle. Standard OBD2 telemetry is readable; however, advanced diagnostic routines and adaptation require OEM authentication.')}
      </Text>

      <TouchableOpacity
        style={[styles.dismissBtn, { backgroundColor: colors.elevated, borderColor: colors.border }]}
        onPress={onDismiss}
      >
        <Text style={[styles.dismissBtnText, { color: colors.textPri, fontSize: scaleFont(11) }]}>
          {t('common.gotIt', 'Got It')}
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    borderWidth: 1.5,
    padding: 14,
    marginVertical: 10,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  icon: {
    marginRight: 10,
  },
  titleContainer: {
    flex: 1,
  },
  title: {
    fontWeight: '800',
  },
  subTitle: {
    marginTop: 2,
  },
  description: {
    lineHeight: 16,
    marginBottom: 12,
  },
  dismissBtn: {
    borderRadius: 8,
    borderWidth: 1,
    paddingVertical: 8,
    alignItems: 'center',
  },
  dismissBtnText: {
    fontWeight: '700',
  },
});

export default SgwStatusNotification;
