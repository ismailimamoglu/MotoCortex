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
    PROTOCOL_J1850_PWM: 'ATSP1', // SAE J1850 PWM (41.6 kbaud - Ford)
    PROTOCOL_J1850_VPW: 'ATSP2', // SAE J1850 VPW (10.4 kbaud - GM)
    PROTOCOL_ISO9141: 'ATSP3',   // ISO 9141-2 (5 baud init)
    PROTOCOL_KWP_5BAUD: 'ATSP4', // ISO 14230-4 KWP (5 baud init)
    PROTOCOL_KWP_FAST: 'ATSP5',  // ISO 14230-4 KWP (fast init)
    PROTOCOL_CAN_11: 'ATSP6', // ISO 15765-4 CAN (11 bit ID, 500 kbaud)
    INIT_BYTE: 'ATIB10',      // K-Line Baud Rate / Init Byte setup
    INIT_ADDRESS: 'ATIIA11',   // K-Line Init Target ECU Address
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

    // Torque & Engine Power PIDs
    DRIVER_DEMAND_TORQUE: '01 61', // Driver Demand Engine Percent Torque (1 byte: A - 125)
    ACTUAL_TORQUE: '01 62',        // Actual Engine Percent Torque (1 byte: A - 125)
    ENGINE_REF_TORQUE: '01 63',    // Engine Reference Torque in Nm (2 bytes: 256*A + B)

    // Diesel & Euro-6 Emission PIDs
    ADBLUE_LEVEL: '01 9B',         // Diesel Exhaust Fluid / AdBlue Level (1 byte: 100*A/255)
    EGT_B1S1: '01 78',             // Exhaust Gas Temperature Bank 1 Sensor 1
    EGT_B1S2: '01 79',             // Exhaust Gas Temperature Bank 1 Sensor 2
    EGT_B2S1: '01 7A',             // Exhaust Gas Temperature Bank 2 Sensor 1
    EGT_B2S2: '01 7B',             // Exhaust Gas Temperature Bank 2 Sensor 2
    NOX_SENSOR_B1: '01 83',        // NOx Sensor Concentration Bank 1
    NOX_SENSOR_B2: '01 84',        // NOx Sensor Concentration Bank 2

    // Advanced OBD & Mode 09 Commands
    READ_CVN: '09 06',             // Calibration Verification Numbers (CVN)
    MODE_06_MONITOR: '06 00',      // Mode 06 On-Board Monitor Test Results

    // Global Telemetry PIDs (Mode 01)
    BAROMETRIC_PRESSURE: '01 33',  // Absolute Barometric Pressure in kPa
    WIDEBAND_O2_AFR: '01 34',      // Wideband Oxygen Sensor Air-Fuel Ratio / Lambda
    CATALYST_TEMP_B1: '01 3C',     // Catalyst Temperature Bank 1
    CATALYST_TEMP_B2: '01 3D',     // Catalyst Temperature Bank 2
    ETHANOL_PERCENT: '01 52',      // Ethanol Fuel Percentage (%)
    ENGINE_OIL_TEMP: '01 5C',      // Engine Oil Temperature (°C)
    TRANS_OIL_TEMP: '01 7C',       // Transmission Fluid Temperature (°C)
    TIMING_ADVANCE: '01 0E',       // Ignition Timing Advance (degrees)

    // Odometer & Expertise Metrics
    ODOMETER: '01 A6',         // Total Odometer (OBD-II 2019+)
    DISTANCE_SINCE_CLEARED: '01 31', // Distance traveled since codes cleared
    DISTANCE_MIL_ON: '01 21',  // Distance traveled with MIL (Check Engine) on
} as const;

export type CommandType = typeof ADAPTER_COMMANDS[keyof typeof ADAPTER_COMMANDS];
