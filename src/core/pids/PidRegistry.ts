export interface PidDefinition {
    mode: string;
    pid: string;
    name: string;
    description: string;
    min: number;
    max: number;
    unit: string;
    decode: (bytes: number[]) => number | string;
    maxJumpPer100ms?: number; // Temporal sanity check constraint
    weight?: number; // Confidence level weight for heuristics
}

const standardPidsList: PidDefinition[] = [
    {
        mode: "01", pid: "00", name: "PIDS_SUPPORTED_01_20", description: "PIDs supported [01 - 20]", min: 0, max: 0xffffffff, unit: "Bitmask",
        decode: (bytes) => bytes.map(b => b.toString(16).padStart(2, '0')).join('')
    },
    {
        mode: "01", pid: "01", name: "MONITOR_STATUS", description: "Monitor status since DTCs cleared", min: 0, max: 0xffffffff, unit: "Bitmask",
        decode: (bytes) => bytes.map(b => b.toString(16).padStart(2, '0')).join('')
    },
    {
        mode: "01", pid: "02", name: "FREEZE_DTC", description: "Freeze DTC", min: 0, max: 0, unit: "None",
        decode: (bytes) => bytes.map(b => b.toString(16).padStart(2, '0')).join('')
    },
    {
        mode: "01", pid: "03", name: "FUEL_SYSTEM_STATUS", description: "Fuel system status", min: 0, max: 255, unit: "Bitmask",
        decode: (bytes) => bytes[0] || 0
    },
    {
        mode: "01", pid: "04", name: "ENGINE_LOAD", description: "Calculated engine load", min: 0, max: 100, unit: "%",
        decode: (bytes) => Math.round(((bytes[0] || 0) * 100) / 255)
    },
    {
        mode: "01", pid: "05", name: "ENGINE_COOLANT_TEMP", description: "Engine coolant temperature", min: -40, max: 215, unit: "°C",
        decode: (bytes) => (bytes[0] || 0) - 40
    },
    {
        mode: "01", pid: "06", name: "SHORT_FUEL_TRIM_BANK_1", description: "Short term fuel trim—Bank 1", min: -100, max: 99.22, unit: "%",
        decode: (bytes) => Number((((bytes[0] || 0) - 128) * 100 / 128).toFixed(2))
    },
    {
        mode: "01", pid: "07", name: "LONG_FUEL_TRIM_BANK_1", description: "Long term fuel trim—Bank 1", min: -100, max: 99.22, unit: "%",
        decode: (bytes) => Number((((bytes[0] || 0) - 128) * 100 / 128).toFixed(2))
    },
    {
        mode: "01", pid: "08", name: "SHORT_FUEL_TRIM_BANK_2", description: "Short term fuel trim—Bank 2", min: -100, max: 99.22, unit: "%",
        decode: (bytes) => Number((((bytes[0] || 0) - 128) * 100 / 128).toFixed(2))
    },
    {
        mode: "01", pid: "09", name: "LONG_FUEL_TRIM_BANK_2", description: "Long term fuel trim—Bank 2", min: -100, max: 99.22, unit: "%",
        decode: (bytes) => Number((((bytes[0] || 0) - 128) * 100 / 128).toFixed(2))
    },
    {
        mode: "01", pid: "0A", name: "FUEL_PRESSURE", description: "Fuel pressure", min: 0, max: 765, unit: "kPa",
        decode: (bytes) => (bytes[0] || 0) * 3
    },
    {
        mode: "01", pid: "0B", name: "INTAKE_PRESSURE", description: "Intake manifold absolute pressure", min: 0, max: 255, unit: "kPa",
        decode: (bytes) => bytes[0] || 0
    },
    {
        mode: "01", pid: "0C", name: "ENGINE_RPM", description: "Engine RPM", min: 0, max: 16383.75, unit: "rpm",
        decode: (bytes) => Math.round((((bytes[0] || 0) * 256) + (bytes[1] || 0)) / 4),
        maxJumpPer100ms: 1500, // Temporal sanity
        weight: 10
    },
    {
        mode: "01", pid: "0D", name: "VEHICLE_SPEED", description: "Vehicle speed", min: 0, max: 255, unit: "km/h",
        decode: (bytes) => bytes[0] || 0,
        maxJumpPer100ms: 20, // Temporal sanity
        weight: 9
    },
    {
        mode: "01", pid: "0E", name: "TIMING_ADVANCE", description: "Timing advance", min: -64, max: 63.5, unit: "°",
        decode: (bytes) => Number(((bytes[0] || 0) / 2 - 64).toFixed(1))
    },
    {
        mode: "01", pid: "0F", name: "INTAKE_AIR_TEMP", description: "Intake air temperature", min: -40, max: 215, unit: "°C",
        decode: (bytes) => (bytes[0] || 0) - 40
    },
    {
        mode: "01", pid: "10", name: "MAF_FLOW", description: "Mass air flow rate", min: 0, max: 655.35, unit: "g/s",
        decode: (bytes) => Number(((((bytes[0] || 0) * 256) + (bytes[1] || 0)) / 100).toFixed(2))
    },
    {
        mode: "01", pid: "11", name: "THROTTLE_POS", description: "Throttle position", min: 0, max: 100, unit: "%",
        decode: (bytes) => Math.round(((bytes[0] || 0) * 100) / 255)
    },
    {
        mode: "01", pid: "12", name: "COMMANDED_SEC_AIR", description: "Commanded secondary air status", min: 0, max: 255, unit: "Bitmask",
        decode: (bytes) => bytes[0] || 0
    },
    {
        mode: "01", pid: "13", name: "O2_SENSORS_PRESENT_2_BANKS", description: "Oxygen sensors present (2 banks)", min: 0, max: 255, unit: "Bitmask",
        decode: (bytes) => bytes[0] || 0
    },
    {
        mode: "01", pid: "14", name: "O2_SENSOR_1_VOLTAGE", description: "Oxygen Sensor 1 - Voltage", min: 0, max: 1.275, unit: "V",
        decode: (bytes) => (bytes[0] || 0) / 200
    },
    {
        mode: "01", pid: "15", name: "O2_SENSOR_2_VOLTAGE", description: "Oxygen Sensor 2 - Voltage", min: 0, max: 1.275, unit: "V",
        decode: (bytes) => (bytes[0] || 0) / 200
    },
    {
        mode: "01", pid: "16", name: "O2_SENSOR_3_VOLTAGE", description: "Oxygen Sensor 3 - Voltage", min: 0, max: 1.275, unit: "V",
        decode: (bytes) => (bytes[0] || 0) / 200
    },
    {
        mode: "01", pid: "17", name: "O2_SENSOR_4_VOLTAGE", description: "Oxygen Sensor 4 - Voltage", min: 0, max: 1.275, unit: "V",
        decode: (bytes) => (bytes[0] || 0) / 200
    },
    {
        mode: "01", pid: "18", name: "O2_SENSOR_5_VOLTAGE", description: "Oxygen Sensor 5 - Voltage", min: 0, max: 1.275, unit: "V",
        decode: (bytes) => (bytes[0] || 0) / 200
    },
    {
        mode: "01", pid: "19", name: "O2_SENSOR_6_VOLTAGE", description: "Oxygen Sensor 6 - Voltage", min: 0, max: 1.275, unit: "V",
        decode: (bytes) => (bytes[0] || 0) / 200
    },
    {
        mode: "01", pid: "1A", name: "O2_SENSOR_7_VOLTAGE", description: "Oxygen Sensor 7 - Voltage", min: 0, max: 1.275, unit: "V",
        decode: (bytes) => (bytes[0] || 0) / 200
    },
    {
        mode: "01", pid: "1B", name: "O2_SENSOR_8_VOLTAGE", description: "Oxygen Sensor 8 - Voltage", min: 0, max: 1.275, unit: "V",
        decode: (bytes) => (bytes[0] || 0) / 200
    },
    {
        mode: "01", pid: "1C", name: "OBD_COMPLIANCE", description: "OBD standards this vehicle conforms to", min: 0, max: 255, unit: "Type",
        decode: (bytes) => bytes[0] || 0
    },
    {
        mode: "01", pid: "1D", name: "O2_SENSORS_PRESENT_4_BANKS", description: "Oxygen sensors present (4 banks)", min: 0, max: 255, unit: "Bitmask",
        decode: (bytes) => bytes[0] || 0
    },
    {
        mode: "01", pid: "1E", name: "AUX_INPUT_STATUS", description: "Auxiliary input status", min: 0, max: 255, unit: "Bitmask",
        decode: (bytes) => bytes[0] || 0
    },
    {
        mode: "01", pid: "1F", name: "RUN_TIME", description: "Run time since engine start", min: 0, max: 65535, unit: "seconds",
        decode: (bytes) => ((bytes[0] || 0) * 256) + (bytes[1] || 0)
    },
    {
        mode: "01", pid: "20", name: "PIDS_SUPPORTED_21_40", description: "PIDs supported [21 - 40]", min: 0, max: 0xffffffff, unit: "Bitmask",
        decode: (bytes) => bytes.map(b => b.toString(16).padStart(2, '0')).join('')
    },
    {
        mode: "01", pid: "21", name: "DISTANCE_WITH_MIL", description: "Distance traveled with MIL on", min: 0, max: 65535, unit: "km",
        decode: (bytes) => ((bytes[0] || 0) * 256) + (bytes[1] || 0)
    },
    {
        mode: "01", pid: "22", name: "FUEL_RAIL_PRESSURE_VAC", description: "Fuel Rail Pressure (relative to manifold vacuum)", min: 0, max: 5177.27, unit: "kPa",
        decode: (bytes) => Number(((((bytes[0] || 0) * 256) + (bytes[1] || 0)) * 0.079).toFixed(2))
    },
    {
        mode: "01", pid: "23", name: "FUEL_RAIL_PRESSURE_DIRECT", description: "Fuel Rail Gauge Pressure (diesel/direct injection)", min: 0, max: 655350, unit: "kPa",
        decode: (bytes) => (((bytes[0] || 0) * 256) + (bytes[1] || 0)) * 10
    },
    {
        mode: "01", pid: "24", name: "O2_S1_WR_LAMBDA_VOLT", description: "Oxygen Sensor 1 - Wide Range Lambda Voltage", min: 0, max: 9.99, unit: "V",
        decode: (bytes) => Number(((((bytes[2] || 0) * 256) + (bytes[3] || 0)) / 8192).toFixed(3))
    },
    {
        mode: "01", pid: "25", name: "O2_S2_WR_LAMBDA_VOLT", description: "Oxygen Sensor 2 - Wide Range Lambda Voltage", min: 0, max: 9.99, unit: "V",
        decode: (bytes) => Number(((((bytes[2] || 0) * 256) + (bytes[3] || 0)) / 8192).toFixed(3))
    },
    {
        mode: "01", pid: "26", name: "O2_S3_WR_LAMBDA_VOLT", description: "Oxygen Sensor 3 - Wide Range Lambda Voltage", min: 0, max: 9.99, unit: "V",
        decode: (bytes) => Number(((((bytes[2] || 0) * 256) + (bytes[3] || 0)) / 8192).toFixed(3))
    },
    {
        mode: "01", pid: "27", name: "O2_S4_WR_LAMBDA_VOLT", description: "Oxygen Sensor 4 - Wide Range Lambda Voltage", min: 0, max: 9.99, unit: "V",
        decode: (bytes) => Number(((((bytes[2] || 0) * 256) + (bytes[3] || 0)) / 8192).toFixed(3))
    },
    {
        mode: "01", pid: "28", name: "O2_S5_WR_LAMBDA_VOLT", description: "Oxygen Sensor 5 - Wide Range Lambda Voltage", min: 0, max: 9.99, unit: "V",
        decode: (bytes) => Number(((((bytes[2] || 0) * 256) + (bytes[3] || 0)) / 8192).toFixed(3))
    },
    {
        mode: "01", pid: "29", name: "O2_S6_WR_LAMBDA_VOLT", description: "Oxygen Sensor 6 - Wide Range Lambda Voltage", min: 0, max: 9.99, unit: "V",
        decode: (bytes) => Number(((((bytes[2] || 0) * 256) + (bytes[3] || 0)) / 8192).toFixed(3))
    },
    {
        mode: "01", pid: "2A", name: "O2_S7_WR_LAMBDA_VOLT", description: "Oxygen Sensor 7 - Wide Range Lambda Voltage", min: 0, max: 9.99, unit: "V",
        decode: (bytes) => Number(((((bytes[2] || 0) * 256) + (bytes[3] || 0)) / 8192).toFixed(3))
    },
    {
        mode: "01", pid: "2B", name: "O2_S8_WR_LAMBDA_VOLT", description: "Oxygen Sensor 8 - Wide Range Lambda Voltage", min: 0, max: 9.99, unit: "V",
        decode: (bytes) => Number(((((bytes[2] || 0) * 256) + (bytes[3] || 0)) / 8192).toFixed(3))
    },
    {
        mode: "01", pid: "2C", name: "COMMANDED_EGR", description: "Commanded EGR", min: 0, max: 100, unit: "%",
        decode: (bytes) => Math.round(((bytes[0] || 0) * 100) / 255)
    },
    {
        mode: "01", pid: "2D", name: "EGR_ERROR", description: "EGR Error", min: -100, max: 99.22, unit: "%",
        decode: (bytes) => Number((((bytes[0] || 0) - 128) * 100 / 128).toFixed(2))
    },
    {
        mode: "01", pid: "2E", name: "COMMANDED_EVAP_PURGE", description: "Commanded evaporative purge", min: 0, max: 100, unit: "%",
        decode: (bytes) => Math.round(((bytes[0] || 0) * 100) / 255)
    },
    {
        mode: "01", pid: "2F", name: "FUEL_LEVEL", description: "Fuel Level Input", min: 0, max: 100, unit: "%",
        decode: (bytes) => Math.round(((bytes[0] || 0) * 100) / 255)
    },
    {
        mode: "01", pid: "30", name: "WARM_UPS_SINCE_CLEARED", description: "Warm-ups since codes cleared", min: 0, max: 255, unit: "counts",
        decode: (bytes) => bytes[0] || 0
    },
    {
        mode: "01", pid: "31", name: "DISTANCE_SINCE_CLEARED", description: "Distance traveled since codes cleared", min: 0, max: 65535, unit: "km",
        decode: (bytes) => ((bytes[0] || 0) * 256) + (bytes[1] || 0)
    },
    {
        mode: "01", pid: "32", name: "EVAP_SYS_VAPOR_PRESSURE", description: "Evap. System Vapor Pressure", min: -8192, max: 8192.25, unit: "Pa",
        decode: (bytes) => Number(((((bytes[0] || 0) * 256) + (bytes[1] || 0)) / 4 - 8192).toFixed(2))
    },
    {
        mode: "01", pid: "33", name: "BAROMETRIC_PRESSURE", description: "Absolute Barometric Pressure", min: 0, max: 255, unit: "kPa",
        decode: (bytes) => bytes[0] || 0
    },
    {
        mode: "01", pid: "34", name: "O2_S1_WR_LAMBDA_CURR", description: "Oxygen Sensor 1 - Wide Range Lambda Current", min: -128, max: 127.99, unit: "mA",
        decode: (bytes) => Number(((((bytes[2] || 0) * 256) + (bytes[3] || 0)) / 256 - 128).toFixed(3))
    },
    {
        mode: "01", pid: "35", name: "O2_S2_WR_LAMBDA_CURR", description: "Oxygen Sensor 2 - Wide Range Lambda Current", min: -128, max: 127.99, unit: "mA",
        decode: (bytes) => Number(((((bytes[2] || 0) * 256) + (bytes[3] || 0)) / 256 - 128).toFixed(3))
    },
    {
        mode: "01", pid: "36", name: "O2_S3_WR_LAMBDA_CURR", description: "Oxygen Sensor 3 - Wide Range Lambda Current", min: -128, max: 127.99, unit: "mA",
        decode: (bytes) => Number(((((bytes[2] || 0) * 256) + (bytes[3] || 0)) / 256 - 128).toFixed(3))
    },
    {
        mode: "01", pid: "37", name: "O2_S4_WR_LAMBDA_CURR", description: "Oxygen Sensor 4 - Wide Range Lambda Current", min: -128, max: 127.99, unit: "mA",
        decode: (bytes) => Number(((((bytes[2] || 0) * 256) + (bytes[3] || 0)) / 256 - 128).toFixed(3))
    },
    {
        mode: "01", pid: "38", name: "O2_S5_WR_LAMBDA_CURR", description: "Oxygen Sensor 5 - Wide Range Lambda Current", min: -128, max: 127.99, unit: "mA",
        decode: (bytes) => Number(((((bytes[2] || 0) * 256) + (bytes[3] || 0)) / 256 - 128).toFixed(3))
    },
    {
        mode: "01", pid: "39", name: "O2_S6_WR_LAMBDA_CURR", description: "Oxygen Sensor 6 - Wide Range Lambda Current", min: -128, max: 127.99, unit: "mA",
        decode: (bytes) => Number(((((bytes[2] || 0) * 256) + (bytes[3] || 0)) / 256 - 128).toFixed(3))
    },
    {
        mode: "01", pid: "3A", name: "O2_S7_WR_LAMBDA_CURR", description: "Oxygen Sensor 7 - Wide Range Lambda Current", min: -128, max: 127.99, unit: "mA",
        decode: (bytes) => Number(((((bytes[2] || 0) * 256) + (bytes[3] || 0)) / 256 - 128).toFixed(3))
    },
    {
        mode: "01", pid: "3B", name: "O2_S8_WR_LAMBDA_CURR", description: "Oxygen Sensor 8 - Wide Range Lambda Current", min: -128, max: 127.99, unit: "mA",
        decode: (bytes) => Number(((((bytes[2] || 0) * 256) + (bytes[3] || 0)) / 256 - 128).toFixed(3))
    },
    {
        mode: "01", pid: "3C", name: "CATALYST_TEMP_B1S1", description: "Catalyst Temperature: Bank 1, Sensor 1", min: -40, max: 6513.5, unit: "°C",
        decode: (bytes) => Number(((((bytes[0] || 0) * 256) + (bytes[1] || 0)) / 10 - 40).toFixed(1))
    },
    {
        mode: "01", pid: "3D", name: "CATALYST_TEMP_B2S1", description: "Catalyst Temperature: Bank 2, Sensor 1", min: -40, max: 6513.5, unit: "°C",
        decode: (bytes) => Number(((((bytes[0] || 0) * 256) + (bytes[1] || 0)) / 10 - 40).toFixed(1))
    },
    {
        mode: "01", pid: "3E", name: "CATALYST_TEMP_B1S2", description: "Catalyst Temperature: Bank 1, Sensor 2", min: -40, max: 6513.5, unit: "°C",
        decode: (bytes) => Number(((((bytes[0] || 0) * 256) + (bytes[1] || 0)) / 10 - 40).toFixed(1))
    },
    {
        mode: "01", pid: "3F", name: "CATALYST_TEMP_B2S2", description: "Catalyst Temperature: Bank 2, Sensor 2", min: -40, max: 6513.5, unit: "°C",
        decode: (bytes) => Number(((((bytes[0] || 0) * 256) + (bytes[1] || 0)) / 10 - 40).toFixed(1))
    },
    {
        mode: "01", pid: "40", name: "PIDS_SUPPORTED_41_60", description: "PIDs supported [41 - 60]", min: 0, max: 0xffffffff, unit: "Bitmask",
        decode: (bytes) => bytes.map(b => b.toString(16).padStart(2, '0')).join('')
    },
    {
        mode: "01", pid: "41", name: "MONITOR_STATUS_DRIVE", description: "Monitor status this drive cycle", min: 0, max: 0xffffffff, unit: "Bitmask",
        decode: (bytes) => bytes.map(b => b.toString(16).padStart(2, '0')).join('')
    },
    {
        mode: "01", pid: "42", name: "CONTROL_MODULE_VOLTAGE", description: "Control module voltage", min: 0, max: 65.535, unit: "V",
        decode: (bytes) => (((bytes[0] || 0) * 256) + (bytes[1] || 0)) / 1000
    },
    {
        mode: "01", pid: "43", name: "ABSOLUTE_LOAD_VALUE", description: "Absolute load value", min: 0, max: 25700, unit: "%",
        decode: (bytes) => Math.round((((bytes[0] || 0) * 256) + (bytes[1] || 0)) * 100 / 255)
    },
    {
        mode: "01", pid: "44", name: "COMMANDED_EQUIV_RATIO", description: "Fuel/Air commanded equivalence ratio", min: 0, max: 1.999, unit: "Ratio",
        decode: (bytes) => Number(((((bytes[0] || 0) * 256) + (bytes[1] || 0)) / 32768).toFixed(3))
    },
    {
        mode: "01", pid: "45", name: "RELATIVE_THROTTLE_POS", description: "Relative throttle position", min: 0, max: 100, unit: "%",
        decode: (bytes) => Math.round(((bytes[0] || 0) * 100) / 255)
    },
    {
        mode: "01", pid: "46", name: "AMBIENT_AIR_TEMP", description: "Ambient air temperature", min: -40, max: 215, unit: "°C",
        decode: (bytes) => (bytes[0] || 0) - 40
    },
    {
        mode: "01", pid: "47", name: "ABSOLUTE_THROTTLE_POS_B", description: "Absolute throttle position B", min: 0, max: 100, unit: "%",
        decode: (bytes) => Math.round(((bytes[0] || 0) * 100) / 255)
    },
    {
        mode: "01", pid: "48", name: "ABSOLUTE_THROTTLE_POS_C", description: "Absolute throttle position C", min: 0, max: 100, unit: "%",
        decode: (bytes) => Math.round(((bytes[0] || 0) * 100) / 255)
    },
    {
        mode: "01", pid: "49", name: "ACCEL_PEDAL_POS_D", description: "Accelerator pedal position D", min: 0, max: 100, unit: "%",
        decode: (bytes) => Math.round(((bytes[0] || 0) * 100) / 255)
    },
    {
        mode: "01", pid: "4A", name: "ACCEL_PEDAL_POS_E", description: "Accelerator pedal position E", min: 0, max: 100, unit: "%",
        decode: (bytes) => Math.round(((bytes[0] || 0) * 100) / 255)
    },
    {
        mode: "01", pid: "4B", name: "ACCEL_PEDAL_POS_F", description: "Accelerator pedal position F", min: 0, max: 100, unit: "%",
        decode: (bytes) => Math.round(((bytes[0] || 0) * 100) / 255)
    },
    {
        mode: "01", pid: "4C", name: "COMMANDED_THROTTLE_ACTUATOR", description: "Commanded throttle actuator", min: 0, max: 100, unit: "%",
        decode: (bytes) => Math.round(((bytes[0] || 0) * 100) / 255)
    },
    {
        mode: "01", pid: "4D", name: "TIME_RUN_WITH_MIL", description: "Time run with MIL on", min: 0, max: 65535, unit: "minutes",
        decode: (bytes) => ((bytes[0] || 0) * 256) + (bytes[1] || 0)
    },
    {
        mode: "01", pid: "4E", name: "TIME_SINCE_CLEARED", description: "Time since trouble codes cleared", min: 0, max: 65535, unit: "minutes",
        decode: (bytes) => ((bytes[0] || 0) * 256) + (bytes[1] || 0)
    },
    {
        mode: "01", pid: "51", name: "FUEL_TYPE", description: "Fuel Type", min: 0, max: 255, unit: "Type",
        decode: (bytes) => bytes[0] || 0
    },
    {
        mode: "01", pid: "52", name: "ETHANOL_FUEL", description: "Ethanol fuel %", min: 0, max: 100, unit: "%",
        decode: (bytes) => Math.round(((bytes[0] || 0) * 100) / 255)
    },
    {
        mode: "01", pid: "53", name: "ABS_EVAP_SYS_VAPOR_PRESSURE", description: "Absolute Evap system Vapor Pressure", min: 0, max: 327.675, unit: "kPa",
        decode: (bytes) => Number(((((bytes[0] || 0) * 256) + (bytes[1] || 0)) / 200).toFixed(3))
    },
    {
        mode: "01", pid: "54", name: "EVAP_SYS_VAPOR_PRESSURE_ALT", description: "Evap system Vapor Pressure", min: -32768, max: 32767, unit: "Pa",
        decode: (bytes) => ((bytes[0] || 0) * 256) + (bytes[1] || 0) - 32768
    },
    {
        mode: "01", pid: "59", name: "FUEL_RAIL_ABS_PRESSURE", description: "Fuel rail absolute pressure", min: 0, max: 655350, unit: "kPa",
        decode: (bytes) => (((bytes[0] || 0) * 256) + (bytes[1] || 0)) * 10
    },
    {
        mode: "01", pid: "5A", name: "RELATIVE_ACCEL_PEDAL_POS", description: "Relative accelerator pedal position", min: 0, max: 100, unit: "%",
        decode: (bytes) => Math.round(((bytes[0] || 0) * 100) / 255)
    },
    {
        mode: "01", pid: "5B", name: "HYBRID_BATTERY_REMAINING", description: "Hybrid battery pack remaining life", min: 0, max: 100, unit: "%",
        decode: (bytes) => Math.round(((bytes[0] || 0) * 100) / 255)
    },
    {
        mode: "01", pid: "5C", name: "ENGINE_OIL_TEMP", description: "Engine oil temperature", min: -40, max: 210, unit: "°C",
        decode: (bytes) => (bytes[0] || 0) - 40
    },
    {
        mode: "01", pid: "5D", name: "FUEL_INJECTION_TIMING", description: "Fuel injection timing", min: -210, max: 301.992, unit: "°",
        decode: (bytes) => Number(((((bytes[0] || 0) * 256) + (bytes[1] || 0)) / 64 - 210).toFixed(3))
    },
    {
        mode: "01", pid: "5E", name: "ENGINE_FUEL_RATE", description: "Engine fuel rate", min: 0, max: 3212.75, unit: "L/h",
        decode: (bytes) => Number(((((bytes[0] || 0) * 256) + (bytes[1] || 0)) * 0.05).toFixed(2))
    },
    {
        mode: "01", pid: "5F", name: "EMISSION_REQ", description: "Emission requirements", min: 0, max: 255, unit: "Type",
        decode: (bytes) => bytes[0] || 0
    },
    {
        mode: "01", pid: "60", name: "PIDS_SUPPORTED_61_80", description: "PIDs supported [61 - 80]", min: 0, max: 0xffffffff, unit: "Bitmask",
        decode: (bytes) => bytes.map(b => b.toString(16).padStart(2, '0')).join('')
    },
    {
        mode: "01", pid: "A6", name: "ODOMETER", description: "Odometer reading", min: 0, max: 429496729.5, unit: "km",
        decode: (bytes) => {
            const a = bytes[0] || 0;
            const b = bytes[1] || 0;
            const c = bytes[2] || 0;
            const d = bytes[3] || 0;
            return Math.round(((a * 16777216) + (b * 65536) + (c * 256) + d) / 10);
        }
    }
];

const pidsMap = new Map<string, PidDefinition>();
for (const p of standardPidsList) {
    pidsMap.set(`${p.mode}:${p.pid}`.toUpperCase(), p);
}

export class PidRegistry {
    public static get oemDbVersion(): string {
        return "v5.2.0-cloud-release";
    }
    
    public static getPid(mode: string, pid: string): PidDefinition | undefined {
        return pidsMap.get(`${mode}:${pid}`.toUpperCase());
    }

    public static getAllPids(): PidDefinition[] {
        return Array.from(pidsMap.values());
    }

    /**
     * Performs temporal sanity validation to check if incoming telemetry values
     * represent physically impossible rate of change.
     */
    public static validateTemporalSanity(
        pidDef: PidDefinition,
        value: number,
        previousValue: number | null,
        elapsedMs: number
    ): boolean {
        if (previousValue === null || elapsedMs <= 0) {
            return true;
        }

        if (pidDef.maxJumpPer100ms !== undefined) {
            const delta = Math.abs(value - previousValue);
            const allowedJump = (pidDef.maxJumpPer100ms / 100) * elapsedMs;
            if (delta > allowedJump) {
                return false;
            }
        }
        return true;
    }
}
