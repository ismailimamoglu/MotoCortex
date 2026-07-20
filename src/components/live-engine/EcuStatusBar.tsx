import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useBluetoothStore } from '../../store/useBluetoothStore';

interface EcuStatusBarProps {
  ecuStatus: string;
  connectionState: string;
  connectionProgress: number;
  adapterStatus: string;
  retryEcu: () => void;
  disconnect: () => void;
  colors: any;
  scaleFont: (size: number) => number;
  scaleMod: (size: number) => number;
  scaleWidth: (size: number) => number;
  scaleHeight: (size: number) => number;
  MONO: string;
}

export default function EcuStatusBar({
  ecuStatus,
  connectionState,
  connectionProgress,
  adapterStatus,
  retryEcu,
  disconnect,
  colors,
  scaleFont,
  scaleMod,
  scaleWidth,
  scaleHeight,
  MONO,
}: EcuStatusBarProps) {
  const { t } = useTranslation();

  return (
    <View style={{ minHeight: scaleHeight(130), justifyContent: 'center' }}>
      {/* ECU Connecting Stage */}
      {ecuStatus === 'connecting' && (
        <View style={{ alignItems: 'center', justifyContent: 'center', gap: scaleHeight(8), marginVertical: scaleHeight(8), width: '100%' }}>
          {adapterStatus === 'connected' && (
            <View style={{
              backgroundColor: `${colors.green}18`,
              borderColor: colors.green,
              borderWidth: 1.5,
              borderRadius: scaleMod(12),
              padding: scaleMod(12),
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: scaleMod(8),
              width: '100%',
              marginBottom: scaleHeight(12)
            }}>
              <View style={{ width: scaleMod(8), height: scaleMod(8), borderRadius: scaleMod(4), backgroundColor: colors.green }} />
              <Text style={{ color: colors.green, fontFamily: MONO, fontSize: scaleFont(11), fontWeight: '900', letterSpacing: 0.5 }}>
                ✓ {t('connection.adapterConnected', 'ADAPTER CONNECTED (OK)').toUpperCase()}
              </Text>
            </View>
          )}
          <View style={{ width: '100%', height: scaleHeight(8), backgroundColor: `${colors.amber}20`, borderRadius: 4, overflow: 'hidden', marginVertical: scaleHeight(8) }}>
            <View style={{ width: `${connectionProgress}%`, height: '100%', backgroundColor: colors.amber, borderRadius: 4 }} />
          </View>
          <Text style={{ color: colors.amber, fontFamily: MONO, fontSize: scaleFont(11), fontWeight: 'bold', textAlign: 'center' }}>
            {connectionState === 'CONNECTING' && `${t('connection.ecuWait', 'Initiating ECU connection, please wait...')} [1/5]`}
            {connectionState === 'ADAPTER_CONNECTED' && t('connection.adapterApproved', 'ADAPTER APPROVED. ANALYZING CAPABILITIES... [2/5]')}
            {connectionState === 'PROTOCOL_NEGOTIATING' && t('connection.protocolNegotiating', 'SCANNING PROTOCOLS & WAKING UP... [3/5]')}
            {connectionState === 'ECU_DETECTED' && t('connection.ecuDetected', 'ECU DETECTED, VERIFYING... [4/5]')}
            {connectionState === 'ECU_RESPONDING' && t('connection.ecuResponding', 'ECU RESPONDED, FINALIZING... [5/5]')}
            {!['CONNECTING', 'ADAPTER_CONNECTED', 'PROTOCOL_NEGOTIATING', 'ECU_DETECTED', 'ECU_RESPONDING'].includes(connectionState) && t('connection.ecuWait', 'Initiating ECU connection, please wait...')}
          </Text>
          {connectionState === 'PROTOCOL_NEGOTIATING' && (
            <Text style={{ color: colors.textSec, fontFamily: MONO, fontSize: scaleFont(9), textAlign: 'center', marginTop: 4 }}>
              {t('connection.protocolScanningHint', '(Scanning standard SP5, SP3, SP6, SP7 protocols...)')}
            </Text>
          )}
        </View>
      )}

      {/* ECU Connection Failure / Retry */}
      {ecuStatus === 'error' && (
        <View style={{ alignItems: 'center', marginVertical: scaleHeight(8), gap: scaleHeight(10) }}>
          <Text style={{ color: colors.red, fontFamily: MONO, fontSize: scaleFont(11), fontWeight: 'bold', textAlign: 'center', lineHeight: scaleHeight(15) }}>
            {connectionState === 'PROTOCOL_FAILED' && t('connection.protocolFailed', '⚠️ NO COMPATIBLE PROTOCOL FOUND! (Tried SP5, SP3, SP4, SP6, SP7)')}
            {connectionState === 'ECU_NOT_FOUND' && t('connection.ecuNotFound', '⚠️ VEHICLE ECU NOT RESPONDING!')}
            {connectionState === 'HARDWARE_FATAL' && t('connection.hardwareFatal', 'Critical Error: Your hardware is a low-grade clone that does not support legacy protocols. Upgrade to an original ELM327 v1.5 or vLinker to connect successfully.')}
            {connectionState !== 'PROTOCOL_FAILED' && connectionState !== 'ECU_NOT_FOUND' && connectionState !== 'HARDWARE_FATAL' && `⚠️ ${t('connection.ecuNoResponse', 'ECU did not respond. Is the ignition ON?')}`}
          </Text>
          
          <Text style={{ color: colors.textSec, fontFamily: MONO, fontSize: scaleFont(10), textAlign: 'center' }}>
            {t('connection.hardwareCapabilityScore', 'Adapter Capability Score: {{score}}/100', { score: useBluetoothStore.getState().adapterCapabilityScore })}
          </Text>

          <View style={{ flexDirection: 'row', gap: scaleMod(8) }}>
            <TouchableOpacity 
              style={{
                backgroundColor: colors.amber,
                borderRadius: scaleMod(8),
                paddingVertical: scaleHeight(10),
                paddingHorizontal: scaleWidth(16),
                alignItems: 'center',
                justifyContent: 'center',
              }}
              onPress={retryEcu}
              activeOpacity={0.4}
            >
              <Text style={{ color: colors.statusBarStyle === 'light-content' ? '#000000' : '#ffffff', fontSize: scaleFont(10.5), fontWeight: '900', fontFamily: MONO }}>
                🔄 {t('connection.retry', 'RETRY').toUpperCase()}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={{
                backgroundColor: `${colors.textPri}14`,
                borderColor: `${colors.textPri}33`,
                borderWidth: 1,
                borderRadius: scaleMod(8),
                paddingVertical: scaleHeight(10),
                paddingHorizontal: scaleWidth(16),
                alignItems: 'center',
                justifyContent: 'center',
              }}
              onPress={disconnect}
              activeOpacity={0.4}
            >
              <Text style={{ color: colors.textPri, fontSize: scaleFont(10.5), fontWeight: '800', fontFamily: MONO }}>
                {t('common.cancel', 'Cancel').toUpperCase()}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}
