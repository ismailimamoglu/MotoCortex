// src/core/connection/CategoryAutoCorrectionEngine.ts
// MotoCortex Autonomous Category Auto-Correction & Fallback Engine

import { getMakeFromVin } from '../../utils/vinDecoder';
import { useBluetoothStore } from '../../store/useBluetoothStore';

export type VehicleCategory = 'PASSENGER_CAR' | 'MOTORCYCLE' | 'HEAVY_DUTY_TRUCK';

export interface CategoryEvaluationResult {
  detectedCategory: VehicleCategory;
  wasAutoCorrected: boolean;
  reason?: string;
}

export class CategoryAutoCorrectionEngine {
  /**
   * Evaluates the VIN or ECU profile against the user's selected category.
   * Auto-corrects mismatched categories (e.g. user selected Truck for a Dacia car).
   */
  public static evaluateAndCorrect(vin: string | null): CategoryEvaluationResult {
    const store = useBluetoothStore.getState();
    const userSelected = store.selectedCategoryByUser;
    const defaultCategory = userSelected || 'PASSENGER_CAR';

    if (!vin || vin.length < 3) {
      store.setVehicleCategory(defaultCategory);
      return { detectedCategory: defaultCategory, wasAutoCorrected: false };
    }

    const cleanVin = vin.trim().toUpperCase();
    const make = getMakeFromVin(cleanVin);

    let detectedCategory: VehicleCategory = 'PASSENGER_CAR';

    // Motorcycle WMI detection
    if (['YAMAHA', 'DUCATI', 'BMW_MOTORRAD', 'KAWASAKI', 'KTM', 'TRIUMPH'].includes(make || '')) {
      detectedCategory = 'MOTORCYCLE';
    } 
    // Heavy Duty Truck WMI detection
    else if (['MAN', 'SCANIA', 'VOLVO_TRUCKS', 'MERCEDES_TRUCKS', 'DAF', 'IVECO'].includes(make || '')) {
      detectedCategory = 'HEAVY_DUTY_TRUCK';
    } 
    else {
      detectedCategory = 'PASSENGER_CAR';
    }

    const wasAutoCorrected = userSelected !== null && userSelected !== detectedCategory;

    // Apply auto-correction to Zustand state
    store.setVehicleCategory(detectedCategory);

    if (wasAutoCorrected) {
      store.addLog(
        `[CategoryCorrection] AUTO_CORRECTED: User selected ${userSelected}, but VIN ${cleanVin.substring(0, 3)}... resolved to ${detectedCategory} (${make || 'Standard'}).`
      );
    }

    return {
      detectedCategory,
      wasAutoCorrected,
      reason: wasAutoCorrected
        ? `Selected category (${userSelected}) differed from vehicle VIN profile (${detectedCategory}).`
        : undefined,
    };
  }
}
