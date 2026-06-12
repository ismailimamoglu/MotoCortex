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
  { key: 'rpm', nameKey: 'dashboard.rpm', defaultName: 'RPM', unit: 'RPM', pid: '01 0C', icon: '📊', color: '#00f2fe', isHighPriority: true },
  { key: 'speed', nameKey: 'dashboard.speed', defaultName: 'Hız', unit: 'km/h', pid: '01 0D', icon: '⚡', color: '#4facfe', isHighPriority: true },
  { key: 'coolant', nameKey: 'dashboard.coolant', defaultName: 'Motor Sıcaklığı', unit: '°C', pid: '01 05', icon: '🌡️', color: '#ff0844', isHighPriority: false },
  { key: 'throttle', nameKey: 'dashboard.throttle', defaultName: 'Gaz Kelebeği', unit: '%', pid: '01 11', icon: '🚀', color: '#f9d423', isHighPriority: false },
  { key: 'voltage', nameKey: 'dashboard.voltage', defaultName: 'Akü Voltajı', unit: 'V', pid: '01 42', icon: '🔋', color: '#2af598', isHighPriority: false }, // Standart voltaj PID 01 42 (Control Module Voltage) veya batarya testi için kullandığımız voltaj
  { key: 'engineLoad', nameKey: 'dashboard.engineLoad', defaultName: 'Motor Yükü', unit: '%', pid: '01 04', icon: '🏋️', color: '#b19ffb', isHighPriority: false },
  { key: 'intakeAirTemp', nameKey: 'dashboard.intakeAirTemp', defaultName: 'Emme Havası', unit: '°C', pid: '01 0F', icon: '💨', color: '#e2d1c3', isHighPriority: false },
  { key: 'manifoldPressure', nameKey: 'dashboard.manifoldPressure', defaultName: 'Manifold Basıncı', unit: 'kPa', pid: '01 0B', icon: '🌀', color: '#30cfd0', isHighPriority: false },
  // Yeni Çeşitlendirilen Sensörler:
  { key: 'ambientTemp', nameKey: 'dashboard.ambientTemp', defaultName: 'Dış Sıcaklık', unit: '°C', pid: '01 46', icon: '🌤️', color: '#a1c4fd', isHighPriority: false },
  { key: 'oilTemp', nameKey: 'dashboard.oilTemp', defaultName: 'Yağ Sıcaklığı', unit: '°C', pid: '01 5C', icon: '🛢️', color: '#f093fb', isHighPriority: false },
  { key: 'mafFlow', nameKey: 'dashboard.mafFlow', defaultName: 'MAF Hava Akışı', unit: 'g/s', pid: '01 10', icon: '🌪️', color: '#5eeffc', isHighPriority: false },
  { key: 'timingAdvance', nameKey: 'dashboard.timingAdvance', defaultName: 'Ateşleme Avansı', unit: '°', pid: '01 0E', icon: '⏱️', color: '#f6d365', isHighPriority: false },
  { key: 'fuelLevel', nameKey: 'dashboard.fuelLevel', defaultName: 'Yakıt Seviyesi', unit: '%', pid: '01 2F', icon: '⛽', color: '#8fd3f4', isHighPriority: false },
  { key: 'catalystTemp', nameKey: 'dashboard.catalystTemp', defaultName: 'Kat. Sıcaklığı', unit: '°C', pid: '01 3C', icon: '🔥', color: '#f5576c', isHighPriority: false },
];

interface DashboardState {
  activeSensors: string[]; // Sensor keys
  layoutType: 'grid' | 'list' | 'gauge';
  toggleSensor: (key: string) => void;
  setLayoutType: (layoutType: 'grid' | 'list' | 'gauge') => void;
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
          // En az 1 sensör seçili kalmalı
          if (state.activeSensors.length <= 1) return state;
          return { activeSensors: state.activeSensors.filter((k) => k !== key) };
        } else {
          // Maksimum 6 sensör sınırı koyabiliriz (ekran tasarımı karmaşıklaşmasın diye)
          if (state.activeSensors.length >= 8) return state;
          return { activeSensors: [...state.activeSensors, key] };
        }
      }),
      setLayoutType: (layoutType) => set({ layoutType }),
      resetToDefault: () => set({ activeSensors: DEFAULT_SENSORS, layoutType: 'grid' }),
    }),
    {
      name: 'motocortex-dashboard-settings',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
