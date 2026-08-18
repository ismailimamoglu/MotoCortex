import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { persist, createJSONStorage } from 'zustand/middleware';

export interface SensorConfig {
  key: string;
  nameKey: string; // translation key
  defaultName: string;
  unit: string;
  pid: string;
  icon: string;
  color: string;
  isHighPriority: boolean; // true ise her döngüde okunur (örn. RPM, Hız), false ise sırayla (low-priority) polllenir.
}

export const ALL_SENSORS: SensorConfig[] = [
  { key: 'rpm', nameKey: 'dashboard.rpm', defaultName: 'RPM', unit: 'RPM', pid: '01 0C', icon: '', color: '#007eff', isHighPriority: true },
  { key: 'speed', nameKey: 'dashboard.speed', defaultName: 'Hız', unit: 'km/h', pid: '01 0D', icon: '', color: '#3a86ff', isHighPriority: true },
  { key: 'coolant', nameKey: 'dashboard.coolant', defaultName: 'Motor Sıcaklığı', unit: '°C', pid: '01 05', icon: '', color: '#10b981', isHighPriority: false },
  { key: 'throttle', nameKey: 'dashboard.throttle', defaultName: 'Gaz Kelebeği', unit: '%', pid: '01 11', icon: '', color: '#f59e0b', isHighPriority: false },
  { key: 'voltage', nameKey: 'dashboard.voltage', defaultName: 'Akü Voltajı', unit: 'V', pid: 'ATRV', icon: '', color: '#059669', isHighPriority: false },
  { key: 'engineLoad', nameKey: 'dashboard.engineLoad', defaultName: 'Motor Yükü', unit: '%', pid: '01 04', icon: '', color: '#2563eb', isHighPriority: false },
  { key: 'intakeAirTemp', nameKey: 'dashboard.intakeAirTemp', defaultName: 'Emme Havası', unit: '°C', pid: '01 0F', icon: '', color: '#64748b', isHighPriority: false },
  { key: 'manifoldPressure', nameKey: 'dashboard.manifoldPressure', defaultName: 'Manifold Basıncı', unit: 'kPa', pid: '01 0B', icon: '', color: '#0284c7', isHighPriority: false },
  { key: 'ambientTemp', nameKey: 'dashboard.ambientTemp', defaultName: 'Dış Sıcaklık', unit: '°C', pid: '01 46', icon: '', color: '#38bdf8', isHighPriority: false },
  { key: 'oilTemp', nameKey: 'dashboard.oilTemp', defaultName: 'Yağ Sıcaklığı', unit: '°C', pid: '01 5C', icon: '', color: '#e11d48', isHighPriority: false },
  { key: 'mafFlow', nameKey: 'dashboard.mafFlow', defaultName: 'MAF Hava Akışı', unit: 'g/s', pid: '01 10', icon: '', color: '#06b6d4', isHighPriority: false },
  { key: 'timingAdvance', nameKey: 'sensor.timingAdvance', defaultName: 'Ateşleme Avansı', unit: '°', pid: '01 0E', icon: '', color: '#d97706', isHighPriority: false },
  { key: 'fuelLevel', nameKey: 'dashboard.fuelLevel', defaultName: 'Yakıt Seviyesi', unit: '%', pid: '01 2F', icon: '', color: '#0ea5e9', isHighPriority: false },
  { key: 'catalystTemp', nameKey: 'sensor.catalystTemp', defaultName: 'Kat. Sıcaklığı', unit: '°C', pid: '01 3C', icon: '', color: '#dc2626', isHighPriority: false },
  { key: 'turboBoost', nameKey: 'sensor.boost', defaultName: 'Turbo Şarj Basıncı', unit: 'kPa', pid: '01 0B', icon: '', color: '#ea580c', isHighPriority: true },
  { key: 'widebandAfr', nameKey: 'sensor.widebandAfr', defaultName: 'Geniş Bant O2 / AFR', unit: 'AFR', pid: '01 34', icon: '', color: '#14b8a6', isHighPriority: true },
  { key: 'transTemp', nameKey: 'sensor.transTemp', defaultName: 'Şanzıman Sıcaklığı', unit: '°C', pid: '01 7C', icon: '', color: '#d97706', isHighPriority: false },
  { key: 'ethanolPercent', nameKey: 'sensor.ethanol', defaultName: 'Etanol Oranı %', unit: '%', pid: '01 52', icon: '', color: '#10b981', isHighPriority: false },
  { key: 'baroPressure', nameKey: 'sensor.baro', defaultName: 'Barometrik Basınç', unit: 'kPa', pid: '01 33', icon: '', color: '#475569', isHighPriority: false },
  { key: 'actualTorque', nameKey: 'dashboard.torque', defaultName: 'Motor Torku', unit: 'Nm', pid: '01 62', icon: '', color: '#b45309', isHighPriority: true },
  { key: 'adblueLevel', nameKey: 'dashboard.adblue', defaultName: 'AdBlue Seviyesi', unit: '%', pid: '01 9B', icon: '', color: '#0284c7', isHighPriority: false },
  { key: 'egtTemp', nameKey: 'dashboard.egt', defaultName: 'Egzoz Gazı Sıcaklığı', unit: '°C', pid: '01 78', icon: '', color: '#e11d48', isHighPriority: false },
  { key: 'noxSensor', nameKey: 'dashboard.nox', defaultName: 'NOx Sensörü', unit: 'ppm', pid: '01 83', icon: '', color: '#0f766e', isHighPriority: false },
];

interface DashboardState {
  activeSensors: string[]; // Sensor keys
  layoutType: 'grid' | 'list' | 'gauge' | 'chart';
  toggleSensor: (key: string) => void;
  setLayoutType: (layoutType: 'grid' | 'list' | 'gauge' | 'chart') => void;
  resetToDefault: () => void;
}

const DEFAULT_SENSORS = ['rpm', 'speed', 'coolant', 'voltage'];

export const useDashboardStore = create<DashboardState>()(
  persist(
    (set) => ({
      activeSensors: DEFAULT_SENSORS,
      layoutType: 'grid',
      toggleSensor: (key) => set((state) => {
        const isExists = state.activeSensors.includes(key);
        if (isExists) {
          if (state.activeSensors.length <= 1) return state;
          return { activeSensors: state.activeSensors.filter((k) => k !== key) };
        } else {
          if (state.activeSensors.length >= 8) return state;
          return { activeSensors: [...state.activeSensors, key] };
        }
      }),
      setLayoutType: (layoutType) => set({ layoutType }),
      resetToDefault: () => set({ activeSensors: DEFAULT_SENSORS, layoutType: 'grid' }),
    }),
    {
      name: 'motocortex-dashboard-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
