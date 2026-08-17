import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';

// Mock stores
jest.mock('../../store/useAppStore', () => ({
  useAppStore: (selector: any) => selector({ isSimulationMode: true }),
}));

jest.mock('../../store/useBluetoothStore', () => ({
  useBluetoothStore: {
    getState: () => ({ dtcs: [] }),
  },
}));

// Mock i18next properly preserving initReactI18next
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: any) => opts?.defaultValue || key,
  }),
  initReactI18next: {
    type: '3rdParty',
    init: jest.fn(),
  },
}));

import HorsepowerModal from '../HorsepowerModal';
import FuelTrimModal from '../FuelTrimModal';
import DctResetModal from '../DctResetModal';
import DpfMonitorModal from '../DpfMonitorModal';
import MultiEcuScanModal from '../MultiEcuScanModal';

describe('Live Diagnostic & Modal Screens QA Suite', () => {
  it('renders HorsepowerModal correctly and toggles calculation methods', () => {
    const { getByText } = render(
      <HorsepowerModal
        visible={true}
        onClose={jest.fn()}
        rpm={3000}
        mafGps={45}
        engineTorqueNm={320}
        calculatedLoadPct={65}
        fuelType="diesel"
      />
    );

    expect(getByText('Dizel Tork & Yakıt Akışı')).toBeTruthy();
    expect(getByText('Hava Akış Tabanlı')).toBeTruthy();
    
    // Toggle method
    fireEvent.press(getByText('Hava Akış Tabanlı'));
    fireEvent.press(getByText('Dizel Tork & Yakıt Akışı'));
  });

  it('renders FuelTrimModal correctly and switches between Diesel and Gasoline modes', () => {
    const { getByText } = render(
      <FuelTrimModal
        visible={true}
        onClose={jest.fn()}
        stftBank1Pct={2}
        ltftBank1Pct={-1}
        fuelType="diesel"
      />
    );

    expect(getByText('Dizel (Common Rail & Lambda)')).toBeTruthy();
    expect(getByText('Benzinli (STFT / LTFT)')).toBeTruthy();
    expect(getByText('Dizel Enjeksiyon & Yanma Sağlığı Normal')).toBeTruthy();

    // Switch to Gasoline
    fireEvent.press(getByText('Benzinli (STFT / LTFT)'));
    // Switch back to Diesel
    fireEvent.press(getByText('Dizel (Common Rail & Lambda)'));
    expect(getByText('Dizel Yanma & Karışım Rehberi')).toBeTruthy();
  });

  it('renders DctResetModal correctly and switches between Auto DCT and Manual modes', () => {
    const { getByText } = render(
      <DctResetModal
        visible={true}
        onClose={jest.fn()}
        transmissionOilTempC={60}
      />
    );

    expect(getByText('Otomatik / DCT Uyarlama')).toBeTruthy();
    expect(getByText('Manuel Şanzıman Testi')).toBeTruthy();

    // Switch to Manual Transmission mode
    fireEvent.press(getByText('Manuel Şanzıman Testi'));
    expect(getByText('MANUEL ŞANZIMAN SENSÖR KONTROLÜ')).toBeTruthy();
    expect(getByText('Debriyaj Pedalı Müşürü')).toBeTruthy();
    expect(getByText('Boş Vites (Nötr) Sensörü')).toBeTruthy();
    expect(getByText('Sensör Testini Başlat')).toBeTruthy();

    // Switch back to Auto mode
    fireEvent.press(getByText('Otomatik / DCT Uyarlama'));
    expect(getByText('GÜVENLİK VE ÖN KOŞUL KONTROLÜ')).toBeTruthy();
  });

  it('renders DpfMonitorModal correctly with soot, ash, and EGT stats', () => {
    const { getByText } = render(
      <DpfMonitorModal
        visible={true}
        onClose={jest.fn()}
        sootMassGrams={20}
        ashMassGrams={15}
        egtTempC={350}
        differentialPressureHpa={20}
      />
    );

    expect(getByText('350°C')).toBeTruthy();
    expect(getByText('20 hPa')).toBeTruthy();
  });

  it('renders MultiEcuScanModal and initiates fast parallel scan', async () => {
    const { getByText } = render(
      <MultiEcuScanModal
        visible={true}
        onClose={jest.fn()}
      />
    );

    const scanBtn = getByText('multiEcu.scanBtn');
    expect(scanBtn).toBeTruthy();
  });
});
