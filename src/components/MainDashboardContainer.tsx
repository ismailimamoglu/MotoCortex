// src/components/MainDashboardContainer.tsx
// MotoCortex Category-Adaptive Dashboard Container (Passenger, Motorcycle, Heavy Duty)

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useBluetoothStore } from '../store/useBluetoothStore';
import { MotorcycleDashboard } from './MotorcycleDashboard';
import { HeavyDutyTruckDashboard } from './HeavyDutyTruckDashboard';

interface MainDashboardContainerProps {
  children?: React.ReactNode;
}

export const MainDashboardContainer: React.FC<MainDashboardContainerProps> = ({ children }) => {
  const category = useBluetoothStore((s) => s.vehicleCategory);

  if (category === 'MOTORCYCLE') {
    return (
      <View style={styles.container}>
        <MotorcycleDashboard />
      </View>
    );
  }

  if (category === 'HEAVY_DUTY_TRUCK') {
    return (
      <View style={styles.container}>
        <HeavyDutyTruckDashboard />
      </View>
    );
  }

  // Default Passenger Car Dashboard
  return <View style={styles.container}>{children}</View>;
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
});
