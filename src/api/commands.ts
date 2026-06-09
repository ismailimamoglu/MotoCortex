/**
 * Standard ELM327 AT Commands and OBD-II PIDs
 */
export const ADAPTER_COMMANDS = {
    // ELM327 Setup
    RESET: 'ATZ',             // Reset adapter
    ECHO_OFF: 'ATE0',         // Disable echo (crucial for parsing)
    LINEFEEDS_OFF: 'ATL0',    // Disable linefeeds
    HEADERS_OFF: 'ATH0',      // Disable headers
    SPACES_OFF: 'ATS0',       // Disable spaces (compact responses)
    PROTOCOL_AUTO: 'ATSP0',   // Auto-detect protocol
    PROTOCOL_CAN_11: 'ATSP6', // ISO 15765-4 CAN (11 bit ID, 500 kbaud)
    DEVICE_INFO: 'ATI',       // Adapter info (e.g., "ELM327 v2.1")
    VOLTAGE: 'ATRV',          // Read battery voltage
    ADAPTIVE_TIMING: 'AT AT1',  // Adaptive Timing On
    TIMEOUT_LIMIT: 'AT ST 62',  // Timeout limit sabitleme (248ms)

    // OBD-II PIDs (Mode 01)
    RPM: '01 0C',              // Engine RPM (2 bytes)
    SPEED: '01 0D',            // Vehicle Speed (1 byte)
    COOLANT_TEMP: '01 05',     // Coolant Temperature (1 byte)
    LOAD: '01 04',             // Engine Load (1 byte)
    INTAKE_AIR_TEMP: '01 0F',  // Intake Air Temperature (1 byte)
    MAF: '01 10',              // Mass Air Flow (2 bytes)
    MANIFOLD_PRESSURE: '01 0B', // Manifold Absolute Pressure (1 byte)
    THROTTLE: '01 11',         // Throttle Position (1 byte)
    ACCELERATOR_PEDAL_D: '01 49', // Accelerator Pedal Position D (1 byte)

    // Expertise & Diagnostic Commands
    READ_DTC: '03',           // Read Stored Diagnostic Trouble Codes
    CLEAR_DTC: '04',          // Clear Check Engine Light / DTCs / Trims
    ECU_RESET: '11 01',       // Hard UDS Reset (Standard)
    READ_VIN: '09 02',         // Read Vehicle Identification Number
    READ_CALIBRATION_ID: '09 04', // Read Calibration ID / ECU ID

    // Odometer & Expertise Metrics
    ODOMETER: '01 A6',         // Total Odometer (OBD-II 2019+)
    DISTANCE_SINCE_CLEARED: '01 31', // Distance traveled since codes cleared
    DISTANCE_MIL_ON: '01 21',  // Distance traveled with MIL (Check Engine) on
} as const;

export type CommandType = typeof ADAPTER_COMMANDS[keyof typeof ADAPTER_COMMANDS];
