import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Pressable,
  ScrollView,
  SafeAreaView,
  Platform,
  Switch,
  Alert,
  TouchableWithoutFeedback
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useThemeColors } from '../theme';
import { useResponsive } from '../hooks/useResponsive';
import { useDashboardStore, ALL_SENSORS } from '../store/useDashboardStore';
import { useBluetoothStore } from '../store/useBluetoothStore';

interface CustomizeDashboardModalProps {
  visible: boolean;
  onClose: () => void;
}

export default function CustomizeDashboardModal({ visible, onClose }: CustomizeDashboardModalProps) {
  const { t } = useTranslation();
  const colors = useThemeColors();
  
  const { activeSensors, layoutType } = useDashboardStore();
  const connectedProtocol = useBluetoothStore(state => state.protocol);
  
  const isKLineProtocol = React.useMemo(() => {
    if (!connectedProtocol) return false;
    const p = connectedProtocol.toUpperCase();
    return p.includes('ISO 9141') || p.includes('ISO 14230') || p.includes('KWP') || p.includes('PROTOCOL 3') || p.includes('PROTOCOL 4') || p.includes('PROTOCOL 5');
  }, [connectedProtocol]);

  const maxLimit = isKLineProtocol ? 4 : 8;

  const [draftSensors, setDraftSensors] = React.useState<string[]>(activeSensors);
  const [draftLayout, setDraftLayout] = React.useState<'grid' | 'list' | 'gauge' | 'chart'>(layoutType);
  const [showLimitWarning, setShowLimitWarning] = React.useState<boolean>(false);

  // Sync draft with store state when modal becomes visible
  React.useEffect(() => {
    if (visible) {
      let initialSensors = [...activeSensors];
      if (isKLineProtocol && initialSensors.length > 4) {
        initialSensors = initialSensors.slice(0, 4);
      }
      setDraftSensors(initialSensors);
      setDraftLayout(layoutType);
      setShowLimitWarning(false);
    }
  }, [visible, activeSensors, layoutType, isKLineProtocol]);

  const handleToggleSensor = (key: string) => {
    setShowLimitWarning(false);
    const isExists = draftSensors.includes(key);
    if (isExists) {
      if (draftSensors.length <= 1) return;
      setDraftSensors(draftSensors.filter((k) => k !== key));
    } else {
      if (draftSensors.length >= maxLimit) {
        setShowLimitWarning(true);
        return;
      }
      setDraftSensors([...draftSensors, key]);
    }
  };

  const handleReset = () => {
    setShowLimitWarning(false);
    const DEFAULT_SENSORS = ['rpm', 'speed', 'coolant', 'voltage'];
    let initialSensors = [...DEFAULT_SENSORS];
    if (isKLineProtocol && initialSensors.length > 4) {
      initialSensors = initialSensors.slice(0, 4);
    }
    setDraftSensors(initialSensors);
    setDraftLayout('grid');
  };

  const handleApply = () => {
    useDashboardStore.setState({
      activeSensors: draftSensors,
      layoutType: draftLayout
    });
    onClose();
  };

  const { s: scaleWidth, vs: scaleHeight, ms: scaleMod, fs: scaleFont, isTablet } = useResponsive();

  const MONO = Platform.OS === 'ios' ? 'System' : 'sans-serif';

  // Dynamic Styles (Memoized to prevent lag)
  const sDyn = React.useMemo(() => {
    return {
      overlay: {
        flex: 1,
        width: '100%' as any,
        height: '100%' as any,
        justifyContent: 'center' as const,
        alignItems: 'center' as const,
        backgroundColor: colors.overlayHeavy,
      },
      backdrop: {
        ...StyleSheet.absoluteFillObject,
        zIndex: 1,
      },
      container: {
        width: (isTablet ? 480 : '92%') as any,
        height: '80%' as any,
        maxHeight: 650,
        borderRadius: scaleMod(16),
        borderWidth: 1.5,
        padding: scaleMod(16),
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.25,
        shadowRadius: 16,
        elevation: 20,
        zIndex: 10,
      },
      header: {
        flexDirection: 'row' as const,
        justifyContent: 'space-between' as const,
        alignItems: 'center' as const,
        borderBottomWidth: 1,
        paddingBottom: scaleHeight(8),
        marginBottom: scaleHeight(12),
      },
      title: {
        fontSize: scaleFont(13.5),
        fontWeight: '900' as const,
        letterSpacing: 1,
      },
      subtitle: {
        fontSize: scaleFont(9.5),
        marginTop: scaleHeight(2),
        lineHeight: scaleFont(13),
      },
      closeBtn: {
        paddingHorizontal: scaleWidth(10),
        paddingVertical: scaleHeight(5),
        borderRadius: scaleMod(6),
      },
      closeBtnText: {
        fontSize: scaleFont(11.5),
        fontWeight: 'bold' as const,
      },
      layoutRow: {
        flexDirection: 'row' as const,
        justifyContent: 'space-between' as const,
        alignItems: 'center' as const,
        borderRadius: scaleMod(10),
        padding: scaleMod(6),
        marginBottom: scaleHeight(12),
        borderWidth: 1,
      },
      layoutLabel: {
        fontSize: scaleFont(9.5),
        fontWeight: 'bold' as const,
        marginRight: scaleWidth(4),
      },
      layoutButtons: {
        flexDirection: 'row' as const,
        flex: 1,
        justifyContent: 'flex-end' as const,
        gap: scaleMod(4),
      },
      layoutBtn: {
        flex: 1,
        paddingHorizontal: scaleWidth(2),
        paddingVertical: scaleHeight(5),
        borderRadius: scaleMod(6),
        borderWidth: 1,
        alignItems: 'center' as const,
        justifyContent: 'center' as const,
      },
      layoutBtnText: {
        fontSize: scaleFont(8.5),
        fontWeight: '800' as const,
      },
      scrollView: {
        flex: 1,
      },
      scrollContent: {
        gap: scaleMod(8),
        paddingBottom: scaleHeight(16),
      },
      sensorCard: {
        flexDirection: 'row' as const,
        alignItems: 'center' as const,
        justifyContent: 'space-between' as const,
        borderRadius: scaleMod(10),
        borderWidth: 1.2,
        padding: scaleMod(10),
      },
      sensorLeft: {
        flexDirection: 'row' as const,
        alignItems: 'center' as const,
        flex: 1,
      },
      sensorIcon: {
        fontSize: scaleFont(16),
        marginRight: scaleWidth(10),
      },
      sensorMeta: {
        flex: 1,
      },
      sensorName: {
        fontSize: scaleFont(11.5),
        fontWeight: 'bold' as const,
      },
      sensorDetail: {
        fontSize: scaleFont(9),
        marginTop: scaleHeight(1.5),
      },
      footer: {
        borderTopWidth: 1,
        paddingTop: scaleHeight(10),
        flexDirection: 'row' as const,
        justifyContent: 'space-between' as const,
      },
      footerBtn: {
        flex: 1,
        height: scaleHeight(36),
        borderRadius: scaleMod(8),
        justifyContent: 'center' as const,
        alignItems: 'center' as const,
        borderWidth: 1.2,
      },
      footerBtnText: {
        fontSize: scaleFont(11),
        fontWeight: 'bold' as const,
      },
    };
  }, [colors, isTablet, scaleWidth, scaleHeight, scaleMod, scaleFont]);

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={true}
      onRequestClose={onClose}
      statusBarTranslucent={true}
    >
      <View style={sDyn.overlay}>
        <TouchableWithoutFeedback onPress={onClose}>
          <View style={sDyn.backdrop} />
        </TouchableWithoutFeedback>
        <View 
          style={[sDyn.container, { backgroundColor: colors.card, borderColor: colors.purple }]}
        >
          {/* Header */}
          <View style={[sDyn.header, { borderBottomColor: colors.border }]}>
            <View style={{ flex: 1, paddingRight: scaleWidth(8) }}>
              <Text style={[sDyn.title, { color: colors.purple }]}>{t('dashboard.customizeTitle', 'GÖSTERGE PANELDEN AYARLAR')}</Text>
              <Text style={[sDyn.subtitle, { color: colors.textSec }]}>
                {isKLineProtocol 
                  ? t('dashboard.customizeSubtitleKLine', { defaultValue: `K-Line protocol connected. You can select a maximum of ${maxLimit} sensors.`, limit: maxLimit })
                  : t('dashboard.customizeSubtitleCAN', { defaultValue: `CAN-Bus protocol connected. You can select a maximum of ${maxLimit} sensors.`, limit: maxLimit })}
              </Text>
            </View>
            <TouchableOpacity 
              onPress={onClose} 
              activeOpacity={0.6}
              style={[sDyn.closeBtn, { backgroundColor: `${colors.purple}18` }]}
            >
              <Text style={[sDyn.closeBtnText, { color: colors.purple }]}>{t('common.close', 'Close')}</Text>
            </TouchableOpacity>
          </View>

          {/* Inline Limit Warning Badge */}
          {showLimitWarning && (
            <View style={{ backgroundColor: `${colors.amber}18`, borderColor: colors.amber, borderWidth: 1, borderRadius: 8, padding: scaleMod(6), marginBottom: scaleHeight(8), alignItems: 'center' }}>
              <Text style={{ color: colors.amber, fontSize: scaleFont(9.5), fontWeight: 'bold' }}>
                ⚠️ {t('dashboard.limitReachedDesc', { defaultValue: `En fazla ${maxLimit} sensör seçebilirsiniz.`, limit: maxLimit })}
              </Text>
            </View>
          )}

          {/* Layout Type Selection */}
          <View style={[sDyn.layoutRow, { backgroundColor: `${colors.purple}05`, borderColor: colors.border }]}>
            <Text style={[sDyn.layoutLabel, { color: colors.textPri }]}>{t('dashboard.layoutType', 'Layout Style')}</Text>
            <View style={sDyn.layoutButtons}>
              <TouchableOpacity
                activeOpacity={0.7}
                style={[
                  sDyn.layoutBtn,
                  {
                    backgroundColor: draftLayout === 'grid' ? colors.purple : 'transparent',
                    borderColor: draftLayout === 'grid' ? colors.purple : colors.border
                  }
                ]}
                onPress={() => setDraftLayout('grid')}
              >
                <Text style={[sDyn.layoutBtnText, { color: draftLayout === 'grid' ? '#ffffff' : colors.textPri }]}>
                  {t('dashboard.layoutGrid', 'GRID')}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                activeOpacity={0.7}
                style={[
                  sDyn.layoutBtn,
                  {
                    backgroundColor: draftLayout === 'list' ? colors.purple : 'transparent',
                    borderColor: draftLayout === 'list' ? colors.purple : colors.border
                  }
                ]}
                onPress={() => setDraftLayout('list')}
              >
                <Text style={[sDyn.layoutBtnText, { color: draftLayout === 'list' ? '#ffffff' : colors.textPri }]}>
                  {t('dashboard.layoutList', 'LIST')}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                activeOpacity={0.7}
                style={[
                  sDyn.layoutBtn,
                  {
                    backgroundColor: draftLayout === 'gauge' ? colors.purple : 'transparent',
                    borderColor: draftLayout === 'gauge' ? colors.purple : colors.border
                  }
                ]}
                onPress={() => setDraftLayout('gauge')}
              >
                <Text style={[sDyn.layoutBtnText, { color: draftLayout === 'gauge' ? '#ffffff' : colors.textPri }]}>
                  {t('dashboard.layoutGauge', 'GAUGE')}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                activeOpacity={0.7}
                style={[
                  sDyn.layoutBtn,
                  {
                    backgroundColor: draftLayout === 'chart' ? colors.purple : 'transparent',
                    borderColor: draftLayout === 'chart' ? colors.purple : colors.border
                  }
                ]}
                onPress={() => setDraftLayout('chart')}
              >
                <Text style={[sDyn.layoutBtnText, { color: draftLayout === 'chart' ? '#ffffff' : colors.textPri }]}>
                  {t('dashboard.layoutChart', 'CHART')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Sensors ScrollView */}
          <ScrollView 
            style={sDyn.scrollView}
            contentContainerStyle={sDyn.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {ALL_SENSORS.map((sensor) => {
              const isActive = draftSensors.includes(sensor.key);
              
              return (
                <TouchableOpacity 
                  key={sensor.key}
                  activeOpacity={0.7}
                  onPress={() => handleToggleSensor(sensor.key)}
                  style={[
                    sDyn.sensorCard, 
                    { 
                      backgroundColor: isActive ? `${colors.purple}0d` : 'transparent',
                      borderColor: isActive ? colors.purple : colors.border
                    }
                  ]}
                >
                  <View style={sDyn.sensorLeft}>
                    <Text style={sDyn.sensorIcon}>{sensor.icon}</Text>
                    <View style={sDyn.sensorMeta}>
                      <Text style={[sDyn.sensorName, { color: colors.textPri }]}>
                        {t(sensor.nameKey, sensor.defaultName)}
                      </Text>
                      <Text style={[sDyn.sensorDetail, { color: colors.textSec, fontFamily: MONO }]}>
                        PID: {sensor.pid} • {t('dashboard.unit', 'Unit')}: {sensor.unit}
                      </Text>
                    </View>
                  </View>

                  <Switch
                    value={isActive}
                    onValueChange={() => handleToggleSensor(sensor.key)}
                    trackColor={{ false: colors.border, true: `${colors.purple}aa` }}
                    thumbColor={isActive ? colors.purple : '#fff'}
                    ios_backgroundColor={colors.border}
                  />
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Footer Reset & Apply */}
          <View style={[sDyn.footer, { borderTopColor: colors.border }]}>
            <TouchableOpacity 
              activeOpacity={0.7}
              style={[sDyn.footerBtn, { borderColor: colors.border, marginRight: scaleWidth(8) }]}
              onPress={handleReset}
            >
              <Text style={[sDyn.footerBtnText, { color: colors.textPri }]}>
                {t('common.reset', 'DEFAULT')}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity 
              activeOpacity={0.7}
              style={[sDyn.footerBtn, { backgroundColor: colors.purple, borderColor: colors.purple }]}
              onPress={handleApply}
            >
              <Text style={[sDyn.footerBtnText, { color: '#ffffff', fontWeight: '900' }]}>
                {t('common.apply', 'APPLY')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

