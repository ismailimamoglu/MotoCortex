import React from 'react';
import { Modal } from 'react-native';
import { render, fireEvent } from '@testing-library/react-native';
import DisclaimersModal from '../DisclaimersModal';

// Mock native haptics to run cleanly in Jest
jest.mock('../../utils/haptics', () => ({
  triggerHaptic: jest.fn(),
}));

describe('DisclaimersModal Safety Gate Audit', () => {
  const setup = (overrides: Partial<React.ComponentProps<typeof DisclaimersModal>> = {}) => {
    const onAccept = jest.fn();
    const onDecline = jest.fn();
    const utils = render(
      <DisclaimersModal
        visible={true}
        onAccept={onAccept}
        onDecline={onDecline}
        {...overrides}
      />
    );
    return { ...utils, onAccept, onDecline };
  };

  it('renders title, disclaimer text, checkboxes, and buttons correctly', () => {
    const { getByTestId, getByText } = setup({ featureTitle: 'Stage 1 ECU Flash' });
    expect(getByText('Stage 1 ECU Flash')).toBeTruthy();
    expect(getByTestId('disclaimer-check-voltage')).toBeTruthy();
    expect(getByTestId('disclaimer-check-risk')).toBeTruthy();
    expect(getByTestId('disclaimer-cancel-btn')).toBeTruthy();
    expect(getByTestId('disclaimer-proceed-btn')).toBeTruthy();
  });

  it('initially locks the proceed button when no checkboxes are checked', () => {
    const { getByTestId, onAccept } = setup();
    const proceedBtn = getByTestId('disclaimer-proceed-btn');
    fireEvent.press(proceedBtn);
    expect(onAccept).not.toHaveBeenCalled();
  });

  it('keeps proceed button locked when only checkbox 1 (voltage) is checked', () => {
    const { getByTestId, onAccept } = setup();
    fireEvent.press(getByTestId('disclaimer-check-voltage'));
    fireEvent.press(getByTestId('disclaimer-proceed-btn'));
    expect(onAccept).not.toHaveBeenCalled();
  });

  it('keeps proceed button locked when only checkbox 2 (risk) is checked', () => {
    const { getByTestId, onAccept } = setup();
    fireEvent.press(getByTestId('disclaimer-check-risk'));
    fireEvent.press(getByTestId('disclaimer-proceed-btn'));
    expect(onAccept).not.toHaveBeenCalled();
  });

  it('unlocks proceed button and triggers onAccept when both checkboxes are checked', () => {
    const { getByTestId, onAccept } = setup();
    fireEvent.press(getByTestId('disclaimer-check-voltage'));
    fireEvent.press(getByTestId('disclaimer-check-risk'));
    fireEvent.press(getByTestId('disclaimer-proceed-btn'));
    expect(onAccept).toHaveBeenCalledTimes(1);
  });

  it('relocks proceed button if a checkbox is toggled back off', () => {
    const { getByTestId, onAccept } = setup();
    fireEvent.press(getByTestId('disclaimer-check-voltage')); // ON
    fireEvent.press(getByTestId('disclaimer-check-risk'));    // ON
    fireEvent.press(getByTestId('disclaimer-check-voltage')); // OFF (toggle)
    fireEvent.press(getByTestId('disclaimer-proceed-btn'));
    expect(onAccept).not.toHaveBeenCalled();
  });

  it('triggers onDecline when Cancel button is pressed', () => {
    const { getByTestId, onDecline } = setup();
    fireEvent.press(getByTestId('disclaimer-cancel-btn'));
    expect(onDecline).toHaveBeenCalledTimes(1);
  });

  it('triggers onDecline when Android back button / onRequestClose is fired', () => {
    const { UNSAFE_getByType, onDecline } = setup();
    const modal = UNSAFE_getByType(Modal);
    modal.props.onRequestClose();
    expect(onDecline).toHaveBeenCalledTimes(1);
  });
});
