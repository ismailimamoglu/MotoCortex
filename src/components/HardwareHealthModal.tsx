import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Platform, ScrollView, Alert } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import * as Clipboard from 'expo-clipboard';
import { useAppStore } from '../store/useAppStore';
import { useThemeColors } from '../theme';
import { useResponsive } from '../hooks/useResponsive';
import { useBluetoothStore } from '../store/useBluetoothStore';

interface HardwareHealthModalProps {
  visible: boolean;
  onClose: () => void;
}

function HardwareHealthModalContent({ visible, onClose }: HardwareHealthModalProps) {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const connectionState = useBluetoothStore((s) => s.connectionState);
  const isConnected = connectionState !== 'DISCONNECTED' && connectionState !== 'ADAPTER_CONNECTING';
  const isCloneDevice = useBluetoothStore((s) => s.isCloneDevice);
  const { s: scaleWidth, vs: scaleHeight, ms: scaleMod, fs: scaleFont, isTablet, isLargeTablet, width, height } = useResponsive();
  const insets = useSafeAreaInsets();

  const MONO = Platform.OS === 'ios' ? 'System' : 'sans-serif';

  const sDyn = React.useMemo(() => {
    const modalWidth = isTablet ? (isLargeTablet ? 650 : 520) : '100%';
    const modalHeight = isTablet ? '85%' : '100%';
    
    return {
      modalOverlay: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: isTablet ? 'center' : 'flex-end',
        alignItems: isTablet ? 'center' : 'stretch',
        backgroundColor: colors.overlayHeavy,
      },
      modalContainer: {
        width: modalWidth,
        height: modalHeight,
        maxHeight: isTablet ? scaleHeight(700) : undefined,
        alignSelf: 'center' as const,
        borderRadius: isTablet ? scaleMod(16) : 0,
        borderWidth: isTablet ? 1.5 : 0,
        borderColor: colors.border,
        overflow: 'hidden' as const,
        paddingTop: isTablet ? 0 : insets.top,
      },
      header: {
        paddingHorizontal: scaleWidth(16),
        flexDirection: 'row' as const,
        justifyContent: 'space-between' as const,
        alignItems: 'center' as const,
        height: scaleHeight(54),
        borderBottomWidth: 1,
      },
      headerTitle: {
        fontSize: scaleFont(14),
        fontWeight: '800' as const,
        fontFamily: MONO,
      },
      cancelBtn: {
        padding: scaleMod(8),
      },
      cancelText: {
        fontSize: scaleFont(12),
        fontWeight: 'bold' as const,
        fontFamily: MONO,
      },
      content: {
        flex: 1,
        padding: scaleMod(14),
      },
      sectionTitle: {
        fontSize: scaleFont(9.5),
        fontWeight: '800' as const,
        letterSpacing: 2,
        marginBottom: scaleHeight(10),
        fontFamily: MONO,
      },
      card: {
        backgroundColor: `${colors.textPri}05`,
        borderColor: `${colors.textPri}0D`,
        borderWidth: 1.2,
        borderRadius: scaleMod(12),
        padding: scaleMod(12),
        gap: scaleMod(8)
      },
      row: {
        flexDirection: 'row' as const,
        justifyContent: 'space-between' as const,
        alignItems: 'center' as const,
        paddingVertical: scaleHeight(2),
      },
      rowLabel: {
        fontSize: scaleFont(11.5),
        color: colors.textSec,
        fontFamily: MONO,
      },
      rowValue: {
        fontSize: scaleFont(11.5),
        color: colors.textPri,
        fontFamily: MONO,
        fontWeight: '700' as const,
      },
      description: {
        fontSize: scaleFont(11),
        color: colors.textSec,
        fontFamily: MONO,
        lineHeight: scaleHeight(16),
        marginTop: scaleHeight(16),
      }
    };
  }, [scaleWidth, scaleHeight, scaleMod, scaleFont, isTablet, isLargeTablet, width, height, colors, insets.top]) as any;

  return (
    <View style={sDyn.modalOverlay}>
        <View style={[sDyn.modalContainer, { backgroundColor: colors.bg }]}>
          {/* Header */}
          <View style={[sDyn.header, { borderBottomColor: colors.border }]}>
            <Text style={[sDyn.headerTitle, { color: colors.textPri }]}>
              {t('bento.settings.hardwareHealth').toUpperCase()}
            </Text>
            <TouchableOpacity onPress={onClose} style={sDyn.cancelBtn}>
              <Text style={[sDyn.cancelText, { color: colors.cyan }]}>
                {t('bento.settings.done').toUpperCase()}
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView 
            style={sDyn.content} 
            showsVerticalScrollIndicator={false} 
            contentContainerStyle={{ paddingBottom: isTablet ? scaleHeight(24) : (Platform.OS === 'ios' ? insets.bottom + scaleHeight(24) : scaleHeight(24)) }}
          >
            <Text style={[sDyn.sectionTitle, { color: colors.textSec }]}>{t('bento.settings.hardwareHealth')}</Text>
            
            <View style={sDyn.card}>
              <View style={sDyn.row}>
                <Text style={sDyn.rowLabel}>{t('bento.settings.connectionType')}</Text>
                <Text style={sDyn.rowValue}>
                  {isConnected ? 'BLE' : t('bento.settings.noConnection')}
                </Text>
              </View>
              <View style={sDyn.row}>
                <Text style={sDyn.rowLabel}>{t('bento.settings.protocol')}</Text>
                <Text style={sDyn.rowValue}>
                  {isConnected ? 'CAN Bus (ISO-15765)' : t('bento.settings.none')}
                </Text>
              </View>
              <View style={sDyn.row}>
                <Text style={sDyn.rowLabel}>{t('bento.settings.deviceStatus')}</Text>
                <Text style={[sDyn.rowValue, { 
                  color: isConnected ? (isCloneDevice ? colors.red : colors.green) : colors.textSec, 
                }]}>
                  {isConnected 
                    ? (isCloneDevice ? t('bento.settings.safeMode') : t('bento.settings.original')) 
                    : t('bento.settings.deviceNotConnected')}
                </Text>
              </View>
              <View style={sDyn.row}>
                <Text style={sDyn.rowLabel}>{t('bento.settings.pollingRate')}</Text>
                <Text style={sDyn.rowValue}>
                  {isConnected 
                    ? (isCloneDevice ? t('bento.settings.pollingLow') : t('bento.settings.pollingHigh')) 
                    : t('bento.settings.pollingZero')}
                </Text>
              </View>

            </View>
          </ScrollView>
        </View>
      </View>
    );
}

export default function HardwareHealthModal(props: HardwareHealthModalProps) {
  if (!props.visible) return null;
  return (
    <Modal
      visible={props.visible}
      animationType="slide"
      transparent={true}
      onRequestClose={props.onClose}
    >
      <SafeAreaProvider>
        <HardwareHealthModalContent {...props} />
      </SafeAreaProvider>
    </Modal>
  );
}
