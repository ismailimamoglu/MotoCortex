/**
 * Safety-Critical ECU Module Registry and Classifier
 *
 * Classifies ECU modules into SafetyModuleClass (ABS/ESP, SRS/Airbag, NONE).
 * Prevents naive CAN address substring matching (e.g. 7E2/7E3) which incorrectly
 * blocks legitimate EV battery/powertrain features.
 */

export type SafetyModuleClass = 'ABS_ESP' | 'SRS_AIRBAG' | 'NONE';

/**
 * Curated deny-list of known OEM Safety-Critical CAN Request Headers.
 * Expandable as more OEM CAN mapping data is integrated.
 */
const CURATED_SAFETY_HEADERS: Record<string, SafetyModuleClass> = {
    // Curated ABS/ESP & SRS/Airbag CAN Request IDs (7D0 = ABS, 770 = SRS)
    '7D0': 'ABS_ESP',
    '7D2': 'ABS_ESP',
    '0X7D0': 'ABS_ESP',
    '0X7D2': 'ABS_ESP',

    '770': 'SRS_AIRBAG',
    '7D3': 'SRS_AIRBAG',
    '0X770': 'SRS_AIRBAG',
    '0X7D3': 'SRS_AIRBAG',
};

/**
 * Defensive keyword patterns for safety-critical systems.
 * Matches feature IDs, names, and target module descriptions.
 */
const SRS_AIRBAG_KEYWORDS = [
    'AIRBAG',
    'SRS',
    'RESTRAINT',
    'SUPPLEMENTAL_RESTRAINT',
    'OCCUPANT_RESTRAINT',
    'SIDE_AIRBAG',
    'CURTAIN_AIRBAG',
];

const ABS_ESP_KEYWORDS = [
    'ABS',
    'ESP',
    'ESC',
    'BRAKE_CALIB',
    'BRAKE_BLEED',
    'BRAKE_CALIBRATION',
    'STABILITY_CONTROL',
    'ANTI_LOCK',
    'TRACTION_CONTROL',
];

/**
 * Classifies whether a feature or ECU header targets a safety-critical system.
 */
export function classifySafetyModule(
    header?: string,
    featureId?: string,
    name?: string
): SafetyModuleClass {
    // 1. Check curated exact header match
    const rawHeader = (header || '').toUpperCase().trim();
    const cleanHeader = rawHeader.startsWith('0X') ? rawHeader.slice(2) : rawHeader;
    if (cleanHeader && CURATED_SAFETY_HEADERS[cleanHeader]) {
        return CURATED_SAFETY_HEADERS[cleanHeader];
    }

    // 2. Keyword analysis over featureId and name
    const haystack = `${featureId || ''} ${name || ''}`.toUpperCase();

    for (const kw of SRS_AIRBAG_KEYWORDS) {
        if (haystack.includes(kw)) {
            return 'SRS_AIRBAG';
        }
    }

    for (const kw of ABS_ESP_KEYWORDS) {
        if (haystack.includes(kw)) {
            return 'ABS_ESP';
        }
    }

    return 'NONE';
}

/**
 * Returns true if the given feature or ECU module is safety-critical (ABS/ESP or SRS/Airbag).
 */
export function isSafetyCriticalModule(
    header?: string,
    featureId?: string,
    name?: string
): boolean {
    return classifySafetyModule(header, featureId, name) !== 'NONE';
}
