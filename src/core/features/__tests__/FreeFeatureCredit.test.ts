import { useAppStore } from '../../../store/useAppStore';
import { assertHardwareGate } from '../../security/CommandClassificationRegistry';

describe('Free Mode Feature Activation Credit System', () => {
  beforeEach(() => {
    useAppStore.setState({
      isPro: false,
      freeFeatureCredits: 1,
      usedFreeFeatureIds: [],
      activeFreeTrialExecution: false,
    });
  });

  it('should initialize with 1 free feature credit and empty used list', () => {
    const state = useAppStore.getState();
    expect(state.isPro).toBe(false);
    expect(state.freeFeatureCredits).toBe(1);
    expect(state.usedFreeFeatureIds).toEqual([]);
  });

  it('should successfully consume 1 free feature credit on first activation', () => {
    const featureId = 'VAG_NEEDLE_SWEEP';
    const success = useAppStore.getState().useFreeFeatureCredit(featureId);

    expect(success).toBe(true);
    const updatedState = useAppStore.getState();
    expect(updatedState.freeFeatureCredits).toBe(0);
    expect(updatedState.usedFreeFeatureIds).toContain(featureId);
  });

  it('should reject second different feature activation when credits are exhausted', () => {
    const feature1 = 'VAG_NEEDLE_SWEEP';
    const feature2 = 'VAG_US_PARKING_LIGHTS';

    // 1st feature consumes credit
    expect(useAppStore.getState().useFreeFeatureCredit(feature1)).toBe(true);
    expect(useAppStore.getState().freeFeatureCredits).toBe(0);

    // 2nd feature fails because credit is 0 and user is not PRO
    const success2 = useAppStore.getState().useFreeFeatureCredit(feature2);
    expect(success2).toBe(false);
    expect(useAppStore.getState().usedFreeFeatureIds).not.toContain(feature2);
  });

  it('should allow re-toggling already unlocked feature without failing', () => {
    const featureId = 'VAG_NEEDLE_SWEEP';
    useAppStore.getState().useFreeFeatureCredit(featureId);

    // Re-toggling same feature should return true
    const reToggle = useAppStore.getState().useFreeFeatureCredit(featureId);
    expect(reToggle).toBe(true);
    expect(useAppStore.getState().freeFeatureCredits).toBe(0);
  });

  it('should allow PRO users unlimited activations without decrementing credits', () => {
    useAppStore.setState({ isPro: true, freeFeatureCredits: 1 });

    const success = useAppStore.getState().useFreeFeatureCredit('ANY_PRO_FEATURE');
    expect(success).toBe(true);
    expect(useAppStore.getState().freeFeatureCredits).toBe(1);
  });

  it('should enforce Hardware Gate: block when isPro=false and not in active free trial', () => {
    const writeCmd = '2E F1 90 01'; // UDS Write Data By Identifier (HARD_MUTATION)
    expect(() => {
      assertHardwareGate(writeCmd, false, false, '12.6V', false);
    }).toThrow('HARDWARE_GATE_VIOLATION');
  });

  it('should pass Hardware Gate when activeFreeTrialExecution is true', () => {
    const writeCmd = '2E F1 90 01'; // UDS Write Data By Identifier (HARD_MUTATION)
    expect(() => {
      assertHardwareGate(writeCmd, false, false, '12.6V', true);
    }).not.toThrow();
  });
});
