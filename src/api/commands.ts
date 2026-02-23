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

    // OBD-II PIDs (Mode 01)
    RPM: '010C',              // Engine RPM (2 bytes)
    SPEED: '010D',            // Vehicle Speed (1 byte)
    COOLANT_TEMP: '0105',     // Coolant Temperature (1 byte)
    LOAD: '0104',             // Engine Load (1 byte)
    INTAKE_AIR_TEMP: '010F',  // Intake Air Temperature (1 byte)
    MANIFOLD_PRESSURE: '010B', // Manifold Absolute Pressure (1 byte)
    THROTTLE: '0111',         // Throttle Position (1 byte)

    // Expertise & Diagnostic Commands
    READ_DTC: '03',           // Read Stored Diagnostic Trouble Codes
    CLEAR_DTC: '04',          // Clear Check Engine Light / DTCs / Trims
    ECU_RESET: '11 01',       // Hard UDS Reset (Standard)
    READ_VIN: '0902',         // Read Vehicle Identification Number

    // Odometer & Expertise Metrics
    ODOMETER: '01A6',         // Total Odometer (OBD-II 2019+)
    ODOMETER_ALT1: '22F190',  // UDS Read Odometer (common)
    ODOMETER_ALT2: '221001',  // UDS Read Odometer (Honda/generic)
    ODOMETER_ALT3: '221102',  // UDS Read Odometer (Honda variant)
    DISTANCE_SINCE_CLEARED: '0131', // Distance traveled since codes cleared
    DISTANCE_MIL_ON: '0121',  // Distance traveled with MIL (Check Engine) on
} as const;

export const OEM_COMMANDS = {
    HONDA_SESSION: '1003',     // Extended Diagnostic Session
    HONDA_ODOMETER_1: '22F190', // Honda UDS Odometer attempt 1
    HONDA_ODOMETER_2: '221001', // Honda UDS Odometer attempt 2
    HONDA_ODOMETER_3: '221102', // Honda UDS Odometer attempt 3
    YAMAHA_ODOMETER: '221201',  // Yamaha UDS read for Odometer
} as const;

export type CommandType = typeof ADAPTER_COMMANDS[keyof typeof ADAPTER_COMMANDS];
