import { StyleSheet, Platform, StatusBar } from 'react-native';
import { MONO } from '../components/design/constants';

interface AppStyleParams {
  tc: any;
  scaleWidth: (val: number) => number;
  scaleHeight: (val: number) => number;
  scaleMod: (val: number) => number;
  scaleFont: (val: number) => number;
}

export function createAppStyles({ tc, scaleWidth, scaleHeight, scaleMod, scaleFont }: AppStyleParams) {
  return StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: tc.bg,
      paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
    },

    // ── Connection Screen ──
    connectPage: { flexGrow: 1, justifyContent: 'center', alignItems: 'center', padding: scaleMod(20) },
    logoArea: { alignItems: 'center', marginBottom: scaleHeight(24) },
    logoText: { fontSize: scaleFont(32), fontWeight: '900', color: tc.cyan, fontFamily: MONO, letterSpacing: 4 },
    logoSub: { fontSize: scaleFont(12), color: tc.textSec, fontFamily: MONO, marginTop: scaleHeight(4), letterSpacing: 6 },

    badgeRow: { flexDirection: 'row', gap: scaleMod(10), marginBottom: scaleHeight(24) },
    badge: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: scaleMod(4), paddingHorizontal: scaleWidth(10), paddingVertical: scaleHeight(5), gap: scaleMod(6) },
    badgeDot: { width: scaleMod(6), height: scaleMod(6), borderRadius: scaleMod(3) },
    badgeText: { fontSize: scaleFont(9.5), fontWeight: '800', fontFamily: MONO },

    connectActions: { width: '100%', alignItems: 'center', gap: scaleMod(10) },
    scanBtn: { backgroundColor: 'transparent', borderWidth: 2, borderColor: tc.cyan, borderRadius: scaleMod(6), paddingVertical: scaleHeight(12), paddingHorizontal: scaleWidth(32), width: '100%', alignItems: 'center' },
    scanBtnText: { color: tc.cyan, fontWeight: '900', fontSize: scaleFont(14), fontFamily: MONO, letterSpacing: 2 },
    btEnableBtn: { backgroundColor: tc.elevated, borderRadius: scaleMod(6), paddingVertical: scaleHeight(10), paddingHorizontal: scaleWidth(20), width: '100%', alignItems: 'center', borderWidth: 1, borderColor: tc.border },
    btEnableBtnText: { color: tc.textSec, fontWeight: '700', fontSize: scaleFont(11), fontFamily: MONO },

    scanningRow: { flexDirection: 'row', alignItems: 'center', gap: scaleMod(6), marginTop: scaleHeight(8) },
    scanningText: { color: tc.cyan, fontSize: scaleFont(11), fontFamily: MONO },

    deviceSection: { width: '100%', marginTop: scaleHeight(16) },
    deviceSectionTitle: { color: tc.textSec, fontSize: scaleFont(9.5), fontWeight: '800', fontFamily: MONO, marginBottom: scaleHeight(8), letterSpacing: 2 },
    deviceCard: { backgroundColor: tc.card, borderWidth: 1, borderColor: tc.border, borderRadius: scaleMod(6), padding: scaleMod(12), marginBottom: scaleHeight(8), flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    deviceName: { color: tc.textPri, fontSize: scaleFont(13), fontWeight: '700', fontFamily: MONO },
    deviceMac: { color: tc.textSec, fontSize: scaleFont(9.5), fontFamily: MONO, marginTop: scaleHeight(2) },
    connectLabel: { color: tc.cyan, fontSize: scaleFont(11), fontWeight: '800', fontFamily: MONO },
    hintText: { color: tc.textSec, fontSize: scaleFont(10), fontFamily: MONO, marginTop: scaleHeight(16), textAlign: 'center' },

    ecuConnecting: { flexDirection: 'row', alignItems: 'center', gap: scaleMod(6), marginBottom: scaleHeight(8) },
    ecuErrorText: { color: tc.red, fontSize: scaleFont(11), fontFamily: MONO, textAlign: 'center', marginBottom: scaleHeight(8) },
    retryBtn: { backgroundColor: tc.amber, borderRadius: scaleMod(6), paddingVertical: scaleHeight(10), paddingHorizontal: scaleWidth(20), width: '100%', alignItems: 'center', marginBottom: scaleHeight(8) },
    retryBtnText: { color: tc.card, fontWeight: '900', fontSize: scaleFont(12.5), fontFamily: MONO },
    disconnectBtn: { backgroundColor: 'transparent', borderWidth: 1, borderColor: tc.red, borderRadius: scaleMod(6), paddingVertical: scaleHeight(8), paddingHorizontal: scaleWidth(20), width: '100%', alignItems: 'center' },
    disconnectBtnText: { color: tc.red, fontWeight: '700', fontSize: scaleFont(11.5), fontFamily: MONO },

    topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingLeft: 16, paddingRight: 24, paddingVertical: scaleHeight(8), backgroundColor: tc.card, borderBottomWidth: 1, borderBottomColor: tc.border },
    topLeft: { flexDirection: 'row', alignItems: 'baseline', gap: scaleMod(6) },
    topLogo: { color: tc.cyan, fontSize: scaleFont(13.5), fontWeight: '900', fontFamily: MONO, letterSpacing: 1.5 },
    topVersion: { color: tc.textSec, fontSize: scaleFont(9.5), fontFamily: MONO },
    topRight: { flexDirection: 'row', alignItems: 'center', gap: 8, marginRight: 16 },
    topBadge: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: scaleMod(4), paddingHorizontal: scaleWidth(6), paddingVertical: scaleHeight(3), gap: scaleMod(4) },
    topBadgeDot: { width: scaleMod(5), height: scaleMod(5), borderRadius: scaleMod(2.5) },
    topBadgeText: { fontSize: scaleFont(8.5), fontWeight: '900', fontFamily: MONO },
    topDisconnect: { color: tc.red, fontSize: scaleFont(9.5), fontWeight: '900', fontFamily: MONO, flexShrink: 0 },

    // ── Tab Bar ──
    tabBar: { flexDirection: 'row', backgroundColor: tc.card, borderBottomWidth: 1, borderBottomColor: tc.border },
    tabItem: { flex: 1, paddingVertical: scaleHeight(10), alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
    tabItemActive: { borderBottomColor: tc.cyan },
    tabLabel: { color: tc.textSec, fontSize: scaleFont(9.5), fontWeight: '800', fontFamily: MONO, letterSpacing: 1 },
    tabLabelActive: { color: tc.cyan },

    // ── Tab Content ──
    tabContent: { flex: 1, paddingHorizontal: 0, paddingTop: scaleHeight(12) },
    tabContentInner: { paddingHorizontal: scaleWidth(14) },

    // ── Dashboard: RPM ──
    rpmHero: { alignItems: 'center', paddingVertical: scaleHeight(20), backgroundColor: tc.card, borderRadius: scaleMod(6), borderWidth: 1.2, borderColor: tc.border, marginBottom: scaleHeight(12) },
    rpmNumber: { fontSize: scaleFont(64), fontWeight: '900', color: tc.textPri, fontFamily: MONO },
    rpmUnit: { fontSize: scaleFont(12.5), fontWeight: '700', color: tc.textSec, fontFamily: MONO, marginTop: -scaleHeight(2) },

    // ── Dashboard: Sensor Grid ──
    sensorGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: scaleMod(8), marginBottom: scaleHeight(12) },
    sensorCard: { width: '48.5%', backgroundColor: tc.card, borderWidth: 1.2, borderColor: tc.border, borderRadius: scaleMod(6), paddingVertical: scaleHeight(16), alignItems: 'center' },
    sensorValue: { fontSize: scaleFont(24), fontWeight: '900', color: tc.textPri, fontFamily: MONO },
    sensorLabel: { fontSize: scaleFont(9.5), fontWeight: '700', color: tc.textSec, fontFamily: MONO, marginTop: scaleHeight(4), letterSpacing: 1.5 },

    // ── Quick Command Bar ──
    quickBar: { marginBottom: scaleHeight(12) },
    cmdRow: { flexDirection: 'row', gap: scaleMod(8), marginBottom: scaleHeight(6) },
    cmdInput: { flex: 1, backgroundColor: tc.card, borderWidth: 1.2, borderColor: tc.border, borderRadius: scaleMod(6), paddingHorizontal: scaleWidth(10), paddingVertical: scaleHeight(8), color: tc.textPri, fontFamily: MONO, fontSize: scaleFont(11.5) },
    cmdSend: { backgroundColor: tc.cyan, borderRadius: scaleMod(6), width: scaleMod(38), alignItems: 'center', justifyContent: 'center' },
    cmdSendText: { color: tc.card, fontSize: scaleFont(18), fontWeight: '900' },
    chipRow: { flexDirection: 'row', gap: scaleMod(6), flexWrap: 'wrap' },
    chip: { borderWidth: 1, borderColor: tc.cyan, borderRadius: scaleMod(6), paddingHorizontal: scaleWidth(10), paddingVertical: scaleHeight(5) },
    chipText: { color: tc.cyan, fontSize: scaleFont(9.5), fontWeight: '800', fontFamily: MONO },

    // ── Terminal ──
    terminalBox: { backgroundColor: tc.bg, borderWidth: 1, borderColor: tc.border, borderRadius: scaleMod(6), overflow: 'hidden' },
    terminalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: scaleWidth(10), paddingVertical: scaleHeight(6), backgroundColor: tc.card, borderBottomWidth: 1, borderBottomColor: tc.border },
    terminalTitle: { color: tc.textSec, fontSize: scaleFont(9.5), fontWeight: '800', fontFamily: MONO },
    terminalClear: { color: tc.cyan, fontSize: scaleFont(9.5), fontWeight: '700', fontFamily: MONO },
    terminalScroll: { maxHeight: scaleHeight(140), padding: scaleMod(8) },
    terminalLine: { color: tc.green, fontSize: scaleFont(9.5), fontFamily: MONO, lineHeight: scaleFont(14) },

    // ── Panels (Expertise/Service) ──
    panel: { backgroundColor: tc.card, borderWidth: 1, borderColor: tc.border, borderRadius: scaleMod(6), padding: scaleMod(12), marginBottom: scaleHeight(10) },
    panelHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    panelTitle: { color: tc.textSec, fontSize: scaleFont(10), fontWeight: '900', fontFamily: MONO, letterSpacing: 1, marginBottom: scaleHeight(10) },
    panelDesc: { color: tc.textSec, fontSize: scaleFont(10), fontFamily: MONO, lineHeight: scaleFont(16), marginBottom: scaleHeight(12) },

    tableRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: scaleHeight(8), borderBottomWidth: 1, borderBottomColor: tc.border },
    tableLabel: { color: tc.textSec, fontSize: scaleFont(11), fontFamily: MONO },
    tableValue: { color: tc.textPri, fontSize: scaleFont(11), fontWeight: '700', fontFamily: MONO, flex: 1, textAlign: 'right' },

    // ── Action Buttons ──
    actionBtn: { borderRadius: scaleMod(6), paddingVertical: scaleHeight(12), alignItems: 'center' },
    actionBtnText: { fontWeight: '900', fontSize: scaleFont(12), fontFamily: MONO, letterSpacing: 1 },
    actionPurple: { backgroundColor: tc.purple },
    actionCyan: { backgroundColor: tc.cyan },
    actionRed: { backgroundColor: tc.red },

    // ── Brand Selector ──
    brandScroll: { marginHorizontal: -scaleWidth(14), paddingHorizontal: scaleWidth(14) },
    brandScrollContent: { paddingRight: scaleWidth(28), gap: scaleMod(8) },
    brandChip: { backgroundColor: tc.elevated, borderWidth: 1, borderColor: tc.border, borderRadius: scaleMod(16), paddingHorizontal: scaleWidth(12), paddingVertical: scaleHeight(6) },
    brandChipActive: { backgroundColor: `${tc.cyan}1A`, borderColor: tc.cyan },
    brandChipText: { color: tc.textSec, fontSize: scaleFont(10), fontWeight: '700', fontFamily: MONO },
    brandChipTextActive: { color: tc.cyan, fontWeight: '900' },

    // ── DTC Items ──
    cleanBadge: { backgroundColor: `${tc.green}14`, borderWidth: 1, borderColor: tc.green, borderRadius: scaleMod(6), paddingVertical: scaleHeight(12), alignItems: 'center' },
    cleanBadgeText: { color: tc.green, fontWeight: '800', fontSize: scaleFont(11.5), fontFamily: MONO },
    dtcRow: { flexDirection: 'row', alignItems: 'flex-start', gap: scaleMod(8), backgroundColor: `${tc.red}14`, borderWidth: 1, borderColor: tc.red, borderRadius: scaleMod(6), paddingHorizontal: scaleWidth(12), paddingVertical: scaleHeight(10), marginBottom: scaleHeight(5) },
    dtcDot: { width: scaleMod(6), height: scaleMod(6), borderRadius: scaleMod(3), backgroundColor: tc.red, marginTop: scaleHeight(5) },
    dtcCode: { color: tc.red, fontWeight: '800', fontSize: scaleFont(13), fontFamily: MONO },

    clearBtn: { backgroundColor: `${tc.red}26`, borderRadius: scaleMod(4), paddingHorizontal: scaleWidth(10), paddingVertical: scaleHeight(3) },
    clearBtnText: { color: tc.red, fontSize: scaleFont(9.5), fontWeight: '800', fontFamily: MONO },

    // ── Warning Banner ──
    warningBanner: { flexDirection: 'row', backgroundColor: `${tc.amber}1A`, borderWidth: 1, borderColor: tc.amber, borderRadius: scaleMod(6), padding: scaleMod(12), marginBottom: scaleHeight(12), gap: scaleMod(8), alignItems: 'flex-start' },
    warningIcon: { color: tc.amber, fontSize: scaleFont(18) },
    warningTitle: { color: tc.amber, fontSize: scaleFont(11), fontWeight: '900', fontFamily: MONO, marginBottom: scaleHeight(2) },
    warningBody: { color: tc.textSec, fontSize: scaleFont(10), fontFamily: MONO, lineHeight: scaleFont(15) },

    // ── New Styles ──
    miniAction: { flex: 1, borderRadius: scaleMod(10), paddingVertical: scaleHeight(10), paddingHorizontal: scaleWidth(4), alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
    miniActionText: { fontWeight: '800', fontSize: scaleFont(10.5), fontFamily: MONO },
    saveOverlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(0,0,0,0.8)',
      justifyContent: 'center',
      padding: scaleMod(24),
      zIndex: 99999,
      elevation: 99999,
    },
    saveKeyboardContainer: {
      flex: 1,
      justifyContent: 'center',
    },
    saveContainer: {
      borderRadius: scaleMod(16),
      borderWidth: 1.5,
      padding: scaleMod(20),
      maxHeight: '90%',
    },
  });
}
