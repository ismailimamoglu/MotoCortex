import { CategoryAutoCorrectionEngine } from '../CategoryAutoCorrectionEngine';
import { useBluetoothStore } from '../../../store/useBluetoothStore';

describe('CategoryAutoCorrectionEngine', () => {
  beforeEach(() => {
    useBluetoothStore.getState().reset();
  });

  it('defaults to PASSENGER_CAR when VIN is null', () => {
    const result = CategoryAutoCorrectionEngine.evaluateAndCorrect(null);
    expect(result.detectedCategory).toBe('PASSENGER_CAR');
    expect(result.wasAutoCorrected).toBe(false);
  });

  it('auto-corrects when user picked HEAVY_DUTY_TRUCK but VIN is Dacia Logan (UU1...)', () => {
    useBluetoothStore.getState().setSelectedCategoryByUser('HEAVY_DUTY_TRUCK');
    const result = CategoryAutoCorrectionEngine.evaluateAndCorrect('UU1ESD12345678901');
    expect(result.detectedCategory).toBe('PASSENGER_CAR');
    expect(result.wasAutoCorrected).toBe(true);
    expect(useBluetoothStore.getState().vehicleCategory).toBe('PASSENGER_CAR');
  });

  it('preserves MOTORCYCLE category when VIN belongs to Yamaha (JY1...)', () => {
    useBluetoothStore.getState().setSelectedCategoryByUser('MOTORCYCLE');
    const result = CategoryAutoCorrectionEngine.evaluateAndCorrect('JY1RN123456789012');
    expect(result.detectedCategory).toBe('MOTORCYCLE');
    expect(result.wasAutoCorrected).toBe(false);
  });
});
