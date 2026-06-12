import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  Modal,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  Platform,
  SafeAreaView,
  Animated,
  Pressable,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useThemeColors } from '../theme';
import { useResponsive } from '../hooks/useResponsive';

const MONO = Platform.OS === 'ios' ? 'Menlo' : 'monospace';

interface Feature {
  key: string;
  labelKey: string;
  category: 'lighting' | 'sound' | 'display' | 'driving';
  defaultValue: boolean;
}

const FEATURES: Feature[] = [
  { key: 'drl',             labelKey: 'featureDrl',             category: 'lighting', defaultValue: false },
  { key: 'rearFog',         labelKey: 'featureRearFog',         category: 'lighting', defaultValue: false },
  { key: 'doorChime',       labelKey: 'featureDoorChime',       category: 'sound',    defaultValue: false },
  { key: 'parkingAlert',    labelKey: 'featureParkingAlert',    category: 'sound',    defaultValue: true  },
  { key: 'rpmWarning',      labelKey: 'featureRpmWarning',      category: 'display',  defaultValue: true  },
  { key: 'fuelSensitivity', labelKey: 'featureFuelSensitivity', category: 'display',  defaultValue: false },
  { key: 'startStop',       labelKey: 'featureStartStop',       category: 'driving',  defaultValue: false },
  { key: 'sportMemory',     labelKey: 'featureSportMemory',     category: 'driving',  defaultValue: false },
];

const CATEGORY_ICONS: Record<string, string> = {
  lighting: '💡',
  sound: '🔊',
  display: '🖥️',
  driving: '⚙️',
};

interface Props {
  visible: boolean;
  onClose: () => void;
  vehicleName?: string;
}

export default function HiddenFeaturesModal({ visible, onClose, vehicleName }: Props) {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const { vs: scaleHeight, ms: scaleMod, fs: scaleFont } = useResponsive();

  const [featureStates, setFeatureStates] = useState<Record<string, boolean>>(
    Object.fromEntries(FEATURES.map(f => [f.key, f.defaultValue]))
  );

  // ── Disclaimer sheet state ────────────────────────────────────────────
  const [sheetVisible, setSheetVisible] = useState(false);
  const [pendingFeatureName, setPendingFeatureName] = useState('');
  const [check1, setCheck1] = useState(false);
  const [check2, setCheck2] = useState(false);
  const [check3, setCheck3] = useState(false);

  const allChecked = check1 && check2 && check3;

  const openSheet = (featureKey: string, labelKey: string) => {
    setPendingFeatureName(t(`hiddenFeatures.${labelKey}`, featureKey));
    setCheck1(false);
    setCheck2(false);
    setCheck3(false);
    setSheetVisible(true);
  };

  const closeSheet = () => {
    setSheetVisible(false);
    setPendingFeatureName('');
  };

  const handleAccept = () => {
    closeSheet();
    setTimeout(() => {
      Alert.alert(
        t('hiddenFeatures.unsupportedTitle', 'Desteklenmiyor'),
        t(
          'hiddenFeatures.unsupportedMsg',
          'Bağlı OBD2 cihazı henüz bu özelliği desteklemiyor.\n\nGizli özellik yazma işlemi için uyumlu bir ELM327 v2.1+ adaptör gerekmektedir. Clone veya standart adaptörler bu komutları işleyememektedir.',
        ),
        [{ text: t('hiddenFeatures.unsupportedOk', 'Tamam') }],
      );
    }, 350);
  };

  // Group features by category
  const categories = [
    { key: 'lighting', titleKey: 'categoryLighting' },
    { key: 'sound',    titleKey: 'categorySound'    },
    { key: 'display',  titleKey: 'categoryDisplay'  },
    { key: 'driving',  titleKey: 'categoryDriving'  },
  ];

  const bg     = colors.bg;
  const card   = colors.card;
  const border = colors.border;
  const textPri = colors.textPri;
  const textSec = colors.textSec;
  const amber  = colors.amber;

  // ── Checkbox row component ─────────────────────────────────────────────
  const CheckRow = ({
    checked, onPress, label,
  }: { checked: boolean; onPress: () => void; label: string }) => (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.4}
      style={{ flexDirection: 'row', alignItems: 'flex-start', gap: scaleMod(10), marginBottom: scaleHeight(14) }}
    >
      <View style={{
        width: scaleMod(22), height: scaleMod(22),
        borderRadius: scaleMod(6),
        borderWidth: 2,
        borderColor: checked ? colors.cyan : border,
        backgroundColor: checked ? `${colors.cyan}22` : 'transparent',
        alignItems: 'center', justifyContent: 'center',
        marginTop: 2, flexShrink: 0,
      }}>
        {checked && <Text style={{ color: colors.cyan, fontSize: scaleFont(13), fontWeight: '900' }}>✓</Text>}
      </View>
      <Text style={{ color: textSec, fontSize: scaleFont(11), fontFamily: MONO, flex: 1, lineHeight: scaleFont(17) }}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={onClose}
    >
      <SafeAreaView style={{ flex: 1, backgroundColor: bg }}>

        {/* ── Header ─────────────────────────────────────────────────── */}
        <View style={{
          flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
          paddingHorizontal: scaleMod(20), paddingVertical: scaleHeight(12),
          borderBottomWidth: 1, borderBottomColor: border,
        }}>
          <View>
            <Text style={{ color: textPri, fontSize: scaleFont(15), fontWeight: '900', fontFamily: MONO, letterSpacing: 1.5 }}>
              🔓 {t('hiddenFeatures.title', 'GİZLİ ÖZELLİKLER')}
            </Text>
            {vehicleName ? (
              <Text style={{ color: textSec, fontSize: scaleFont(10), fontFamily: MONO, marginTop: 2 }}>
                {vehicleName}
              </Text>
            ) : null}
          </View>
          <TouchableOpacity onPress={onClose} style={{ padding: scaleMod(8) }} activeOpacity={0.4}>
            <Text style={{ color: colors.cyan, fontSize: scaleFont(13), fontWeight: '800', fontFamily: MONO }}>
              ✕ {t('hiddenFeatures.closeBtn', 'KAPAT')}
            </Text>
          </TouchableOpacity>
        </View>

        {/* ── Simulation Banner ──────────────────────────────────────── */}
        <View style={{
          backgroundColor: `${colors.cyan}1A`,
          borderBottomWidth: 1, borderBottomColor: `${colors.cyan}33`,
          paddingHorizontal: scaleMod(20), paddingVertical: scaleHeight(8),
          flexDirection: 'row', alignItems: 'center', gap: scaleMod(8),
        }}>
          <Text style={{ fontSize: scaleFont(12) }}>🧪</Text>
          <Text style={{ color: colors.cyan, fontSize: scaleFont(10), fontFamily: MONO, fontWeight: '700', flex: 1 }}>
            {t('hiddenFeatures.simulationBanner', 'SIMULATION MODE — Real ECU writing not yet active')}
          </Text>
        </View>

        {/* ── Feature List ───────────────────────────────────────────── */}
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: scaleMod(16), paddingBottom: scaleHeight(40) }}
          showsVerticalScrollIndicator={false}
          // Disable scrolling while sheet is open so backdrop press doesn't scroll
          scrollEnabled={!sheetVisible}
        >
          {/* Warning Card */}
          <View style={{
            backgroundColor: `${amber}14`, borderWidth: 1.5, borderColor: `${amber}4D`,
            borderRadius: scaleMod(14), padding: scaleMod(14),
            marginBottom: scaleHeight(20), flexDirection: 'row', gap: scaleMod(10), alignItems: 'flex-start',
          }}>
            <Text style={{ fontSize: scaleFont(18) }}>⚠️</Text>
            <Text style={{ color: amber, fontSize: scaleFont(11), fontFamily: MONO, fontWeight: '700', flex: 1, lineHeight: scaleFont(17) }}>
              {t('hiddenFeatures.warning', 'Bu değişiklikler araç garantinizi etkileyebilir. Dikkatli kullanın.')}
            </Text>
          </View>

          {/* Categories */}
          {categories.map(cat => {
            const catFeatures = FEATURES.filter(f => f.category === cat.key);
            return (
              <View key={cat.key} style={{ marginBottom: scaleHeight(20) }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: scaleMod(8), marginBottom: scaleHeight(10) }}>
                  <Text style={{ fontSize: scaleFont(16) }}>{CATEGORY_ICONS[cat.key]}</Text>
                  <Text style={{ color: textSec, fontSize: scaleFont(10), fontWeight: '900', fontFamily: MONO, letterSpacing: 2 }}>
                    {t(`hiddenFeatures.${cat.titleKey}`, cat.key.toUpperCase())}
                  </Text>
                  <View style={{ flex: 1, height: 1, backgroundColor: border, marginLeft: scaleMod(4) }} />
                </View>

                <View style={{ backgroundColor: card, borderRadius: scaleMod(14), borderWidth: 1, borderColor: border, overflow: 'hidden' }}>
                  {catFeatures.map((feature, idx) => {
                    const isOn = featureStates[feature.key];
                    return (
                      <TouchableOpacity
                        key={feature.key}
                        activeOpacity={0.4}
                        onPress={() => openSheet(feature.key, feature.labelKey)}
                        style={{
                          flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                          paddingHorizontal: scaleMod(16), paddingVertical: scaleHeight(14),
                          borderBottomWidth: idx < catFeatures.length - 1 ? 1 : 0,
                          borderBottomColor: border,
                        }}
                      >
                        <View style={{ flex: 1, marginRight: scaleMod(12) }}>
                          <Text style={{ color: textPri, fontSize: scaleFont(12), fontFamily: MONO, fontWeight: '700' }}>
                            {t(`hiddenFeatures.${feature.labelKey}`, feature.key)}
                          </Text>
                          <Text style={{ color: isOn ? colors.green : textSec, fontSize: scaleFont(9.5), fontFamily: MONO, marginTop: 2, fontWeight: '800', letterSpacing: 1 }}>
                            {isOn ? t('hiddenFeatures.enabled', 'AKTİF') : t('hiddenFeatures.disabled', 'PASİF')}
                          </Text>
                        </View>
                        <Switch
                          value={isOn}
                          onValueChange={() => openSheet(feature.key, feature.labelKey)}
                          trackColor={{ false: border, true: `${colors.green}80` }}
                          thumbColor={isOn ? colors.green : textSec}
                          ios_backgroundColor={border}
                        />
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            );
          })}
        </ScrollView>

        {/* ── Disclaimer Bottom Sheet (rendered INSIDE the main Modal) ── */}
        {sheetVisible && (
          <>
            {/* Dimmed backdrop */}
            <Pressable
              onPress={closeSheet}
              style={{
                position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                backgroundColor: 'rgba(0,0,0,0.65)',
              }}
            />

            {/* Sheet */}
            <View style={{
              position: 'absolute', left: 0, right: 0, bottom: 0,
              backgroundColor: colors.elevated ?? card,
              borderTopLeftRadius: scaleMod(24),
              borderTopRightRadius: scaleMod(24),
              borderTopWidth: 1,
              borderTopColor: border,
              maxHeight: '88%',
            }}>
              {/* Handle */}
              <View style={{ alignItems: 'center', paddingTop: scaleHeight(12), paddingBottom: scaleHeight(4) }}>
                <View style={{ width: scaleMod(40), height: scaleHeight(4), borderRadius: 99, backgroundColor: border }} />
              </View>

              <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ padding: scaleMod(20), paddingBottom: scaleHeight(36) }}
              >
                {/* Title */}
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: scaleMod(8), marginBottom: scaleHeight(6) }}>
                  <Text style={{ fontSize: scaleFont(20) }}>⚠️</Text>
                  <Text style={{ color: amber, fontSize: scaleFont(14), fontWeight: '900', fontFamily: MONO, letterSpacing: 1, flex: 1 }}>
                    {t('hiddenFeatures.disclaimerTitle', 'SORUMLULUK BEYANI')}
                  </Text>
                </View>

                <Text style={{ color: textSec, fontSize: scaleFont(10), fontFamily: MONO, marginBottom: scaleHeight(14), letterSpacing: 0.5 }}>
                  {t('hiddenFeatures.disclaimerFeature', 'Özellik')}: {pendingFeatureName}
                </Text>

                {/* Warning body */}
                <View style={{
                  backgroundColor: `${amber}14`, borderWidth: 1, borderColor: `${amber}40`,
                  borderRadius: scaleMod(12), padding: scaleMod(14), marginBottom: scaleHeight(20),
                }}>
                  <Text style={{ color: amber, fontSize: scaleFont(11), fontFamily: MONO, lineHeight: scaleFont(18), fontWeight: '700' }}>
                    {t(
                      'hiddenFeatures.disclaimerBody',
                      'Bu özelliği değiştirmek, aracınızın fabrika ayarlarını ve ECU yazılımını doğrudan etkiler. Aşağıdaki riskleri lütfen dikkatlice okuyun:\n\n• Hatalı uygulama, araç garantinizi geçersiz kılabilir.\n• Bazı değişiklikler araçta kalıcı arızalara veya beklenmedik elektrik hatalarına yol açabilir.\n• İşlem geri alınabilir olsa da bazı ECU modülleri fabrika sıfırlaması gerektirebilir.\n• Bu özelliğin kullanımından doğacak maddi veya manevi tüm zararlardan kullanıcı sorumludur.\n• MotoCortex, bu değişiklikler nedeniyle oluşabilecek herhangi bir arıza veya hasardan sorumlu tutulamaz.\n\nBu uyarıyı dikkatlice okuyup anladığınızı onaylamanız gerekmektedir.',
                    )}
                  </Text>
                </View>

                {/* Checkbox section label */}
                <Text style={{ color: textSec, fontSize: scaleFont(10), fontFamily: MONO, fontWeight: '900', letterSpacing: 1.5, marginBottom: scaleHeight(14) }}>
                  {t('hiddenFeatures.checkboxTitle', 'ONAY GEREKLİ')}
                </Text>

                <CheckRow
                  checked={check1}
                  onPress={() => setCheck1(v => !v)}
                  label={t('hiddenFeatures.check1', 'Bu uyarıyı okudum ve araç garantimin etkilenebileceğini anlıyorum.')}
                />
                <CheckRow
                  checked={check2}
                  onPress={() => setCheck2(v => !v)}
                  label={t('hiddenFeatures.check2', "Bu işlemden doğacak arıza veya hasarlardan MotoCortex'in sorumlu olmadığını kabul ediyorum.")}
                />
                <CheckRow
                  checked={check3}
                  onPress={() => setCheck3(v => !v)}
                  label={t('hiddenFeatures.check3', 'Tüm riskleri bilerek ve kendi isteğimle bu değişikliği yapmak istiyorum.')}
                />

                {/* Buttons */}
                <View style={{ flexDirection: 'row', gap: scaleMod(10), marginTop: scaleHeight(8) }}>
                  <TouchableOpacity
                    onPress={closeSheet}
                    style={{
                      flex: 1, paddingVertical: scaleHeight(13),
                      borderRadius: scaleMod(12), borderWidth: 1, borderColor: border,
                      alignItems: 'center',
                    }}
                    activeOpacity={0.4}
                  >
                    <Text style={{ color: textSec, fontSize: scaleFont(12), fontFamily: MONO, fontWeight: '700' }}>
                      {t('hiddenFeatures.disclaimerCancel', 'İPTAL')}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={allChecked ? handleAccept : undefined}
                    style={{
                      flex: 1, paddingVertical: scaleHeight(13),
                      borderRadius: scaleMod(12),
                      backgroundColor: allChecked ? colors.cyan : `${colors.cyan}30`,
                      alignItems: 'center',
                    }}
                    activeOpacity={allChecked ? 0.75 : 1}
                  >
                    <Text style={{ color: allChecked ? bg : textSec, fontSize: scaleFont(12), fontFamily: MONO, fontWeight: '900', letterSpacing: 0.5 }}>
                      {t('hiddenFeatures.disclaimerContinue', 'DEVAM ET')}
                    </Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </View>
          </>
        )}

      </SafeAreaView>
    </Modal>
  );
}
