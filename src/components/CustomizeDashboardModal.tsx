import React, { useState, useEffect, useMemo, useCallback, memo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Pressable,
  ScrollView,
  Platform,
  Switch,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useThemeColors } from '../theme';
import { useResponsive } from '../hooks/useResponsive';
import { useDashboardStore, ALL_SENSORS, SensorConfig } from '../store/useDashboardStore';
import { useBluetoothStore } from '../store/useBluetoothStore';

interface CustomizeDashboardModalProps {
  visible: boolean;
  onClose: () => void;
}

interface SensorItemRowProps {
  sensor: SensorConfig;
  isActive: boolean;
  onToggle: (key: string) => void;
  colors: any;
  sDyn: any;
}

const SensorItemRow = memo(({ sensor, isActive, onToggle, colors, sDyn }: SensorItemRowProps) => {
  const { t } = useTranslation();
  const handlePress = useCallback(() => {
    onToggle(sensor.key);
  }, [onToggle, sensor.key]);

  const activeTeal = '#0f9f8f';
  const inactiveBorder = '#c0d4cf';
  const activeBg = '#edf8f5';

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={handlePress}
      style={[
        sDyn.sensorCard,
        {
          backgroundColor: isActive ? activeBg : colors.card,
          borderColor: isActive ? activeTeal : inactiveBorder,
          borderWidth: 2.0,
          borderStyle: 'solid',
        },
      ]}
    >
      <View style={sDyn.sensorLeft}>
        <Text style={[sDyn.sensorName, { color: colors.textPri }]}>
          {t(sensor.nameKey, sensor.defaultName)}
        </Text>
      </View>

      {/* pointerEvents="none" prevents gesture collision between Switch and Pressable on Android Release builds */}
      <View pointerEvents="none">
        <Switch
          value={isActive}
          onValueChange={handlePress}
          trackColor={{ false: '#d0e0de', true: '#56c6b4' }}
          thumbColor={isActive ? activeTeal : '#ffffff'}
          ios_backgroundColor="#d0e0de"
        />
      </View>
    </TouchableOpacity>
  );
});

export default function CustomizeDashboardModal({ visible, onClose }: CustomizeDashboardModalProps) {
  const { t } = useTranslation();
  const colors = useThemeColors();
  
  const { activeSensors, layoutType } = useDashboardStore();
  const connectedProtocol = useBluetoothStore(state => state.protocol);
  
  const isKLineProtocol = useMemo(() => {
    if (!connectedProtocol) return false;
    const p = connectedProtocol.toUpperCase();
    return p.includes('ISO 9141') || p.includes('ISO 14230') || p.includes('KWP') || p.includes('PROTOCOL 3') || p.includes('PROTOCOL 4') || p.includes('PROTOCOL 5');
  }, [connectedProtocol]);

  const maxLimit = isKLineProtocol ? 4 : 8;

  const [draftSensors, setDraftSensors] = useState<string[]>(activeSensors);
  const [draftLayout, setDraftLayout] = useState<'grid' | 'list' | 'gauge' | 'chart'>(layoutType);
  const [showLimitWarning, setShowLimitWarning] = useState<boolean>(false);

  // Sync draft with store state when modal becomes visible
  useEffect(() => {
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

  const handleToggleSensor = useCallback((key: string) => {
    setShowLimitWarning(false);
    setDraftSensors((prev) => {
      const isExists = prev.includes(key);
      if (isExists) {
        if (prev.length <= 1) return prev;
        return prev.filter((k) => k !== key);
      } else {
        if (prev.length >= maxLimit) {
          setShowLimitWarning(true);
          return prev;
        }
        return [...prev, key];
      }
    });
  }, [maxLimit]);

  const handleReset = useCallback(() => {
    setShowLimitWarning(false);
    const DEFAULT_SENSORS = ['rpm', 'speed', 'coolant', 'voltage'];
    let initialSensors = [...DEFAULT_SENSORS];
    if (isKLineProtocol && initialSensors.length > 4) {
      initialSensors = initialSensors.slice(0, 4);
    }
    setDraftSensors(initialSensors);
    setDraftLayout('grid');
  }, [isKLineProtocol]);

  const handleApply = useCallback(() => {
    useDashboardStore.setState({
      activeSensors: draftSensors,
      layoutType: draftLayout
    });
    onClose();
  }, [draftSensors, draftLayout, onClose]);

  const { s: scaleWidth, vs: scaleHeight, ms: scaleMod, fs: scaleFont, isTablet, width, height } = useResponsive();

  const MONO = Platform.OS === 'ios' ? 'System' : 'sans-serif';
  const unitText = t('dashboard.unit', 'Unit');

  // Dynamic Styles (Memoized & Hardened against Android Release Layout Shift)
  const sDyn = useMemo(() => {
    const containerWidth = isTablet ? 540 : Math.min(width * 0.94, 460);
    const containerHeight = Math.min(height * 0.82, 720);

    return {
      overlay: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'center' as const,
        alignItems: 'center' as const,
        backgroundColor: colors.overlayHeavy,
      },
      backdrop: {
        ...StyleSheet.absoluteFillObject,
      },
      container: {
        width: containerWidth,
        height: containerHeight,
        alignSelf: 'center' as const,
        borderRadius: scaleMod(20),
        borderWidth: 1.5,
        padding: scaleMod(18),
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 20,
        elevation: 20,
        zIndex: 10,
      },
      header: {
        flexDirection: 'row' as const,
        justifyContent: 'space-between' as const,
        alignItems: 'center' as const,
        borderBottomWidth: 1,
        paddingBottom: scaleHeight(10),
        marginBottom: scaleHeight(12),
        flexShrink: 0,
      },
      title: {
        fontSize: scaleFont(14),
        fontWeight: '900' as const,
        letterSpacing: 1,
      },
      subtitle: {
        fontSize: scaleFont(10),
        marginTop: scaleHeight(2),
        lineHeight: scaleFont(14),
      },
      closeBtn: {
        paddingHorizontal: scaleWidth(14),
        paddingVertical: scaleHeight(8),
        borderRadius: scaleMod(8),
      },
      closeBtnText: {
        fontSize: scaleFont(12),
        fontWeight: 'bold' as const,
      },
      warningBadge: {
        backgroundColor: `${colors.amber}18`,
        borderColor: colors.amber,
        borderWidth: 1,
        borderRadius: 8,
        padding: scaleMod(8),
        marginBottom: scaleHeight(10),
        alignItems: 'center' as const,
        flexShrink: 0,
      },
      layoutRow: {
        flexDirection: 'row' as const,
        justifyContent: 'space-between' as const,
        alignItems: 'center' as const,
        borderRadius: scaleMod(12),
        padding: scaleMod(8),
        marginBottom: scaleHeight(14),
        borderWidth: 1,
        flexShrink: 0,
      },
      layoutLabel: {
        fontSize: scaleFont(10),
        fontWeight: 'bold' as const,
        marginRight: scaleWidth(6),
      },
      layoutButtons: {
        flexDirection: 'row' as const,
        flex: 1,
        justifyContent: 'flex-end' as const,
        gap: scaleMod(3),
      },
      layoutBtn: {
        flex: 1,
        paddingHorizontal: scaleWidth(2),
        paddingVertical: scaleHeight(8),
        borderRadius: scaleMod(8),
        borderWidth: 1,
        alignItems: 'center' as const,
        justifyContent: 'center' as const,
      },
      layoutBtnText: {
        fontSize: scaleFont(9.5),
        fontWeight: '800' as const,
      },
      scrollView: {
        flex: 1,
      },
      scrollContent: {
        gap: scaleMod(10),
        paddingBottom: scaleHeight(16),
      },
      sensorCard: {
        flexDirection: 'row' as const,
        alignItems: 'center' as const,
        justifyContent: 'space-between' as const,
        borderRadius: scaleMod(16),
        borderWidth: 2.0,
        paddingVertical: scaleHeight(12),
        paddingHorizontal: scaleWidth(14),
        marginBottom: scaleHeight(10),
      },
      sensorLeft: {
        flexDirection: 'row' as const,
        alignItems: 'center' as const,
        flex: 1,
        marginRight: scaleWidth(10),
      },
      sensorName: {
        fontSize: scaleFont(13),
        fontWeight: '800' as const,
        letterSpacing: 0.3,
      },
      footer: {
        borderTopWidth: 1,
        paddingTop: scaleHeight(12),
        flexDirection: 'row' as const,
        justifyContent: 'space-between' as const,
        flexShrink: 0,
      },
      footerBtn: {
        flex: 1,
        height: Math.max(46, scaleHeight(46)),
        borderRadius: scaleMod(10),
        justifyContent: 'center' as const,
        alignItems: 'center' as const,
        borderWidth: 1.5,
      },
      footerBtnText: {
        fontSize: scaleFont(13),
        fontWeight: '800' as const,
        letterSpacing: 0.5,
      },
    };
  }, [colors, isTablet, scaleWidth, scaleHeight, scaleMod, scaleFont, width, height]);

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={true}
      onRequestClose={onClose}
      statusBarTranslucent={true}
    >
      <View style={sDyn.overlay}>
        <Pressable style={sDyn.backdrop} onPress={onClose} />
        <View 
          style={[sDyn.container, { backgroundColor: colors.card, borderColor: colors.purple }]}
        >
          {/* Header */}
          <View style={[sDyn.header, { borderBottomColor: colors.border }]}>
            <View style={{ flex: 1, paddingRight: scaleWidth(8) }}>
              <Text style={[sDyn.title, { color: colors.purple }]}>{t('dashboard.customizeTitle', 'DASHBOARD SETTINGS')}</Text>
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
            <View style={sDyn.warningBadge}>
              <Text style={{ color: colors.amber, fontSize: scaleFont(9.5), fontWeight: 'bold' }}>
                ⚠️ {t('dashboard.limitReachedDesc', { defaultValue: `You can select up to ${maxLimit} sensors.`, limit: maxLimit })}
              </Text>
            </View>
          )}

          {/* Layout Type Selection */}
          <View style={[sDyn.layoutRow, { backgroundColor: `${colors.purple}05`, borderColor: colors.border }]}>
            <Text style={[sDyn.layoutLabel, { color: colors.textPri }]}>{t('dashboard.layoutType', 'Layout Style')}</Text>
            <View style={sDyn.layoutButtons}>
              {(['grid', 'list', 'gauge', 'chart'] as const).map((type) => {
                const isSelected = draftLayout === type;
                const labelMap = {
                  grid: t('dashboard.layoutGrid', 'GRID'),
                  list: t('dashboard.layoutList', 'LIST'),
                  gauge: t('dashboard.layoutGauge', 'GAUGE'),
                  chart: t('dashboard.layoutChart', 'CHART'),
                };
                return (
                  <TouchableOpacity
                    key={type}
                    activeOpacity={0.7}
                    style={[
                      sDyn.layoutBtn,
                      {
                        backgroundColor: isSelected ? colors.purple : 'transparent',
                        borderColor: isSelected ? colors.purple : colors.border
                      }
                    ]}
                    onPress={() => setDraftLayout(type)}
                  >
                    <Text 
                      numberOfLines={1} 
                      adjustsFontSizeToFit={true}
                      style={[sDyn.layoutBtnText, { color: isSelected ? '#ffffff' : colors.textPri }]}
                    >
                      {labelMap[type]}
                    </Text>
                  </TouchableOpacity>
                );
              })}
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
                <SensorItemRow
                  key={sensor.key}
                  sensor={sensor}
                  isActive={isActive}
                  onToggle={handleToggleSensor}
                  colors={colors}
                  sDyn={sDyn}
                />
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
