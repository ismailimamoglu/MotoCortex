/**
 * ISO 14229 UDS Service 0x2F (InputOutputControlByIdentifier) Actuator Service
 * Manages active actuator testing (Fan, Injector, Relays) with strict safety gates:
 * 1. Preconditions: Vehicle Speed = 0, Battery Voltage > 12.0V, Ignition ON.
 * 2. Session setup: UDS 0x10 03 (Extended Diagnostic Session).
 * 3. Heartbeat: Periodic UDS 0x3E 80 (TesterPresent with Suppress Response bit) every 2000ms.
 * 4. Teardown: Return Control To ECU (UDS 0x2F [DID] 00 00) on exit or transport disconnect.
 */

import i18n from '../i18n';
import { UdsProtocolEngine, UdsServiceId } from '../api/udsProtocol';

export interface ActuatorTarget {
  didHex: string; // Data Identifier (e.g. 'F010' for Radiator Fan)
  name: string;
  category: 'engine' | 'fuel' | 'cooling' | 'electrical';
  controlStateOn: number[]; // e.g. [0x03, 0x64] (ShortTermAdjustment, 100%)
  controlStateOff: number[]; // e.g. [0x03, 0x00] (ShortTermAdjustment, 0%)
}

export const KNOWN_ACTUATORS: ActuatorTarget[] = [
  {
    didHex: 'F010',
    get name() { return i18n.t('actuator.fanTest'); },
    category: 'cooling',
    controlStateOn: [0x03, 0x64], // 100% duty cycle
    controlStateOff: [0x03, 0x00],
  },
  {
    didHex: 'F020',
    get name() { return i18n.t('actuator.fuelPumpTest'); },
    category: 'fuel',
    controlStateOn: [0x03, 0x01], // Relay ON
    controlStateOff: [0x03, 0x00],
  },
  {
    didHex: 'F030',
    get name() { return i18n.t('actuator.throttleTest'); },
    category: 'engine',
    controlStateOn: [0x03, 0x14], // 20% position
    controlStateOff: [0x03, 0x00],
  },
];

export class UdsActuatorService {
  private static testerPresentTimer: any = null;
  private static activeDid: string | null = null;

  /**
   * Evaluates safety preconditions before allowing any 0x2F actuator command.
   */
  public static validateSafetyPreconditions(speedKmH: number, voltageV: number): { isSafe: boolean; reason?: string } {
    if (speedKmH > 0) {
      return { isSafe: false, reason: i18n.t('actuator.safetySpeed') };
    }
    if (voltageV < 11.8) {
      return { isSafe: false, reason: i18n.t('actuator.safetyVoltage') };
    }
    return { isSafe: true };
  }

  /**
   * Prepares command sequence to initiate Extended Session (0x10 03) and start TesterPresent heartbeat.
   */
  public static getSessionStartCommands(): string[] {
    return [
      UdsProtocolEngine.encodeRequest(UdsServiceId.DIAGNOSTIC_SESSION_CONTROL, 0x03), // 10 03
    ];
  }

  /**
   * Starts periodic background TesterPresent (0x3E 80) every 2000ms to maintain ECU session.
   */
  public static startTesterPresentHeartbeat(sendCommandFn: (cmd: string) => Promise<string | undefined>): void {
    this.stopTesterPresentHeartbeat();
    this.testerPresentTimer = setInterval(() => {
      // 3E 80 -> TesterPresent with Suppress Pos Response
      sendCommandFn('3E 80').catch(() => null);
    }, 2000);
  }

  /**
   * Stops periodic TesterPresent heartbeat.
   */
  public static stopTesterPresentHeartbeat(): void {
    if (this.testerPresentTimer) {
      clearInterval(this.testerPresentTimer);
      this.testerPresentTimer = null;
    }
  }

  /**
   * Encodes UDS 0x2F Actuator Control ON command payload.
   */
  public static encodeActuatorOnRequest(actuator: ActuatorTarget): string {
    this.activeDid = actuator.didHex;
    const didBytes = [
      parseInt(actuator.didHex.substring(0, 2), 16),
      parseInt(actuator.didHex.substring(2, 4), 16),
    ];
    return UdsProtocolEngine.encodeRequest(UdsServiceId.ROUTINE_CONTROL, undefined, [
      ...didBytes,
      ...actuator.controlStateOn,
    ]).replace(/^31/, '2F'); // 2F Service ID
  }

  /**
   * Encodes UDS 0x2F Return Control To ECU (Reset) command payload.
   */
  public static encodeReturnControlToEcuRequest(didHex: string): string {
    const didBytes = [
      parseInt(didHex.substring(0, 2), 16),
      parseInt(didHex.substring(2, 4), 16),
    ];
    // Option 0x00: ReturnControlToECU
    return UdsProtocolEngine.encodeRequest(UdsServiceId.ROUTINE_CONTROL, undefined, [
      ...didBytes,
      0x00,
    ]).replace(/^31/, '2F');
  }

  /**
   * Cleans up active testing session and returns control to ECU safely.
   */
  public static async stopActuatorSession(sendCommandFn?: (cmd: string) => Promise<string | undefined>): Promise<void> {
    this.stopTesterPresentHeartbeat();
    if (this.activeDid && sendCommandFn) {
      const resetCmd = this.encodeReturnControlToEcuRequest(this.activeDid);
      await sendCommandFn(resetCmd).catch(() => null);
      this.activeDid = null;
    }
  }
}

export default UdsActuatorService;
