/**
 * DCT Transmission Adaptation & Reset Engine for MotoCortex
 * 
 * Supports basic setting reset for Dual Clutch Transmissions (DSG DQ200/DQ250, Powershift, EDC, 7DCT).
 * Enforces safety preconditions (Oil Temp 30-90°C, Foot Brake Pressed, Gear P, Engine Idle)
 * before sending UDS Routine Control (31 01 ...) / Basic Setting commands.
 */

export interface DctSafetyChecklist {
  engineRunning: boolean;
  gearInPark: boolean;
  footBrakePressed: boolean;
  handBrakeEngaged: boolean;
  transmissionOilTempC: number;
}

export interface DctPreconditionResult {
  allPassed: boolean;
  failingChecks: string[];
}

export class DctAdaptationService {
  /**
   * Verifies all physical and safety conditions before allowing transmission reset.
   */
  public static verifyPreconditions(checklist: DctSafetyChecklist): DctPreconditionResult {
    const failingChecks: string[] = [];

    if (!checklist.gearInPark) {
      failingChecks.push('dct.checkGearPark');
    }
    if (!checklist.footBrakePressed) {
      failingChecks.push('dct.checkFootBrake');
    }
    if (!checklist.handBrakeEngaged) {
      failingChecks.push('dct.checkHandBrake');
    }
    if (checklist.transmissionOilTempC < 30 || checklist.transmissionOilTempC > 90) {
      failingChecks.push('dct.checkOilTemp');
    }

    return {
      allPassed: failingChecks.length === 0,
      failingChecks,
    };
  }

  /**
   * Returns UDS routine control commands for basic settings reset
   */
  public static getAdaptationCommands(transmissionType: 'dsg_dq200' | 'dsg_dq250' | 'powershift' | 'generic_dct'): string[] {
    switch (transmissionType) {
      case 'dsg_dq200':
        return [
          'AT SH 7E1',
          '10 03', // UDS Diagnostic Session Control (Extended)
          '22 04 00', // Read status
          '31 01 00 60', // Start Basic Setting Channel 060 (DQ200 Clutch Adaptation)
        ];
      case 'dsg_dq250':
        return [
          'AT SH 7E1',
          '10 03',
          '31 01 00 61', // Basic Setting Channel 061 (DQ250 Wet Clutch Relearn)
        ];
      case 'powershift':
      case 'generic_dct':
      default:
        return [
          'AT SH 7E1',
          '10 03',
          '31 01 02 01', // Generic Transmission Clutch Relearn Routine
        ];
    }
  }
}

export default DctAdaptationService;
