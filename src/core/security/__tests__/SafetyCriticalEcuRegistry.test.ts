import { classifySafetyModule, isSafetyCriticalModule } from '../SafetyCriticalEcuRegistry';

describe('SafetyCriticalEcuRegistry', () => {
    it('should classify curated safety headers as ABS_ESP or SRS_AIRBAG', () => {
        expect(classifySafetyModule('0x7D2')).toBe('ABS_ESP');
        expect(classifySafetyModule('0x7D3')).toBe('SRS_AIRBAG');
    });

    it('should classify features with ABS/ESP keywords in featureId or name as ABS_ESP', () => {
        expect(classifySafetyModule('0x7E0', 'vw_abs_calibration', 'ABS Calibration')).toBe('ABS_ESP');
        expect(classifySafetyModule('0x7E0', 'esp_sport_mode', 'ESP Toggle')).toBe('ABS_ESP');
        expect(isSafetyCriticalModule('0x7E0', 'vw_abs_calibration', 'ABS Calibration')).toBe(true);
    });

    it('should classify features with AIRBAG/SRS keywords as SRS_AIRBAG', () => {
        expect(classifySafetyModule('0x7E0', 'vw_airbag_deactivate', 'Airbag Passenger Deactivation')).toBe('SRS_AIRBAG');
        expect(classifySafetyModule('0x7E0', 'srs_seatbelt_chime', 'SRS Chime')).toBe('SRS_AIRBAG');
        expect(isSafetyCriticalModule('0x7E0', 'vw_airbag_deactivate', 'Airbag Passenger')).toBe(true);
    });

    it('should return NONE for EV battery/powertrain features using 0x7E2/0x7E3 headers', () => {
        expect(classifySafetyModule('0x7E2', 'mg_ev_battery_preconditioning', 'EV Battery Preheat')).toBe('NONE');
        expect(classifySafetyModule('0x7E3', 'byd_soc_max_charge_limit', 'SOC Max Target')).toBe('NONE');
        expect(isSafetyCriticalModule('0x7E2', 'mg_ev_battery_preconditioning', 'EV Battery Preheat')).toBe(false);
    });
});
