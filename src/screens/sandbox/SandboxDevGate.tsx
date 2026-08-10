import React, { useState } from 'react';
import {
  StyleSheet,
  TouchableOpacity,
  Text,
  Modal,
  View,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useThemeColors } from '../../theme';
import { useResponsive } from '../../hooks/useResponsive';
import DashboardSandbox from './DashboardSandbox';

const MONO = 'System';

export default function SandboxDevGate() {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const { s: scaleWidth, vs: scaleHeight, ms: scaleMod, fs: scaleFont } = useResponsive();
  const [modalVisible, setModalVisible] = useState(false);

  // Gated behind __DEV__ so floating DIAG button only appears in development builds
  const shouldShowGate = __DEV__;

  if (!shouldShowGate) return null;

  const sDyn = React.useMemo(() => {
    return {
      floatingButton: {
        position: 'absolute' as const,
        bottom: scaleHeight(110),
        right: scaleWidth(20),
        width: scaleMod(50),
        height: scaleMod(50),
        borderRadius: scaleMod(25),
        backgroundColor: colors.cyan,
        justifyContent: 'center' as const,
        alignItems: 'center' as const,
        zIndex: 9999,
        elevation: 10,
        shadowColor: colors.cyan,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.35,
        shadowRadius: 8,
      },
      btnText: {
        color: '#000000',
        fontSize: scaleFont(11),
        fontWeight: '900' as const,
        fontFamily: MONO,
        letterSpacing: 0.5,
      },
      closeBtn: {
        position: 'absolute' as const,
        top: scaleHeight(12),
        right: scaleWidth(16),
        zIndex: 10000,
        backgroundColor: `${colors.red}1a`,
        borderWidth: 1.2,
        borderColor: colors.red,
        borderRadius: scaleMod(8),
        paddingHorizontal: scaleWidth(12),
        paddingVertical: scaleHeight(6),
      },
      closeText: {
        color: colors.red,
        fontSize: scaleFont(11),
        fontWeight: '900' as const,
        fontFamily: MONO,
      },
    };
  }, [colors, scaleWidth, scaleHeight, scaleMod, scaleFont]) as any;

  return (
    <>
      <TouchableOpacity
        style={sDyn.floatingButton}
        onPress={() => setModalVisible(true)}
        activeOpacity={0.8}
      >
        <Text style={sDyn.btnText}>{t('sandbox.openSandbox', 'DIAG')}</Text>
      </TouchableOpacity>

      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={{ flex: 1, backgroundColor: colors.bg }}>
          {/* Close gate button floating inside the modal */}
          <TouchableOpacity
            style={sDyn.closeBtn}
            onPress={() => setModalVisible(false)}
          >
            <Text style={sDyn.closeText}>{t('common.close', 'CLOSE').toUpperCase()}</Text>
          </TouchableOpacity>

          <DashboardSandbox />
        </View>
      </Modal>
    </>
  );
}
export { SandboxDevGate };
