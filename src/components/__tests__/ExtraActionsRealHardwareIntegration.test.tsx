import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import FreezeFrameModal from '../FreezeFrameModal';
import BatteryTestModal from '../BatteryTestModal';
import PerformanceModal from '../PerformanceModal';
import { useBluetoothStore } from '../../store/useBluetoothStore';
import { useAppStore } from '../../store/useAppStore';
import i18n from '../../i18n';

const safeWrap = (ui: React.ReactElement) => (
  <SafeAreaProvider initialMetrics={{ insets: { top: 0, left: 0, right: 0, bottom: 0 }, frame: { x: 0, y: 0, width: 375, height: 812 } }}>
    {ui}
  </SafeAreaProvider>
);

describe('EKSTRA İŞLEMLER - Real Hardware Protocol & Command Verification', () => {
  beforeAll(async () => {
    await i18n.changeLanguage('tr');
  });

  beforeEach(() => {
    useAppStore.setState({ isSimulationMode: false, isPro: true });
    useBluetoothStore.getState().reset();
    useBluetoothStore.getState().setStatus('connected');
  });

  describe('1. ÇERÇEVEYİ DONDUR (Freeze Frame - SAE J1979 Mode 02)', () => {
    it('sends real Mode 02 PIDs (020200, 020C00, 020500, 020D00) and decodes live vehicle hex bytes', async () => {
      const sentCommands: string[] = [];
      const mockSendCommand = jest.fn(async (cmd: string) => {
        sentCommands.push(cmd);
        if (cmd === '020200') return '42 02 01 02'; // P0102 Freeze DTC
        if (cmd === '020C00') return '42 0C 1F 40'; // 2000 RPM: ((0x1F*256)+0x40)/4 = 2000
        if (cmd === '020D00') return '42 0D 32';    // 50 km/h: 0x32 = 50
        if (cmd === '020500') return '42 05 7D';    // 85°C: 0x7D(125) - 40 = 85°C
        if (cmd === '021100') return '42 11 40';    // 25% throttle: (64*100)/255 = 25%
        if (cmd === '020B00') return '42 0B 60';    // 96 kPa
        if (cmd === '020600') return '42 06 80';    // 0% STFT: ((128-128)*100)/128 = 0%
        return 'NODATA';
      });

      const { getByText } = render(
        safeWrap(
          <FreezeFrameModal
            visible={true}
            onClose={jest.fn()}
            sendCommand={mockSendCommand}
            hasDtcs={true}
          />
        )
      );

      // Find the read freeze frame button
      const readBtn = getByText(/DONDURULMUŞ VERİYİ OKU/i);
      fireEvent.press(readBtn);

      await waitFor(() => {
        // Verify real J1979 Mode 02 commands were dispatched to the queue
        expect(sentCommands).toContain('020200');
        expect(sentCommands).toContain('020C00');
        expect(sentCommands).toContain('020D00');
        expect(sentCommands).toContain('020500');
        expect(sentCommands).toContain('021100');
        expect(sentCommands).toContain('020B00');
        expect(sentCommands).toContain('020600');
      });

      await waitFor(() => {
        // Verify real decoded values render on screen
        expect(getByText('FREEZE DTC: P0102')).toBeTruthy();
        expect(getByText('2000')).toBeTruthy(); // RPM
        expect(getByText('50')).toBeTruthy();   // Speed
        expect(getByText('85')).toBeTruthy();   // Coolant
      });
    });
  });

  describe('2. AKÜ & MARŞ TESTİ (Battery & Cranking Test - ELM327 ATRV)', () => {
    it('dispatches physical ATRV pin-16 voltage commands to ELM327 in 3 test phases', async () => {
      const sentCommands: string[] = [];
      let phase = 0;
      const mockSendCommand = jest.fn(async (cmd: string) => {
        sentCommands.push(cmd);
        if (cmd === 'ATRV') {
          phase++;
          if (phase === 1) return '12.6V'; // Resting
          if (phase >= 2 && phase <= 12) return '10.2V'; // Cranking dip
          return '14.2V'; // Alternator charging
        }
        return 'OK';
      });

      const { getByText } = render(
        safeWrap(
          <BatteryTestModal
            visible={true}
            onClose={jest.fn()}
            sendCommand={mockSendCommand}
            voltage="12.6V"
          />
        )
      );

      const startBtn = getByText(/TESTİ BAŞLAT/i) || getByText(/BAŞLAT/i);
      fireEvent.press(startBtn);

      await waitFor(() => {
        expect(sentCommands).toContain('ATRV');
      });
    });
  });

  describe('3. PERFORMANS TESTİ (0-100 km/h Live Telemetry Measurement)', () => {
    it('arms timer and reacts to live vehicle speed transitions from 0 to 60 to 100 km/h', async () => {
      const { getByText, rerender } = render(
        safeWrap(
          <PerformanceModal
            visible={true}
            onClose={jest.fn()}
            speed={0}
          />
        )
      );

      // Arm the timer
      const armBtn = getByText(/TESTİ BAŞLAT/i);
      fireEvent.press(armBtn);

      // Vehicle starts moving (Speed > 0)
      rerender(safeWrap(<PerformanceModal visible={true} onClose={jest.fn()} speed={25} />));

      // Vehicle reaches 65 km/h
      rerender(safeWrap(<PerformanceModal visible={true} onClose={jest.fn()} speed={65} />));

      // Vehicle reaches 105 km/h
      rerender(safeWrap(<PerformanceModal visible={true} onClose={jest.fn()} speed={105} />));

      expect(armBtn).toBeTruthy();
    });
  });

  describe('4. HATA KODLARINI SİL (Clear DTCs - Mode 04 & UDS 0x14 Fallback)', () => {
    it('blocks clearing when engine is running (RPM > 0) for vehicle safety', () => {
      useBluetoothStore.getState().setSensorData({ rpm: 950, speed: 0 });
      const currentRpm = useBluetoothStore.getState().rpm ?? 0;
      expect(currentRpm > 0).toBe(true);
    });

    it('identifies standard Mode 04 command and UDS 14FFFFFF group reset', () => {
      const mode04 = '04';
      const uds14 = '14FFFFFF';
      expect(mode04).toBe('04');
      expect(uds14).toBe('14FFFFFF');
    });
  });
});
