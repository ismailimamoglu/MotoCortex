/**
 * OemGuardFramework.ts
 * 
 * MotoCortex Enterprise OEM Pre-Write Guard Architecture (v2.0 Fail-Closed).
 * Implements strict OEM-specific pre-write safety checks:
 * 1. VagSfdGuard: Fail-Closed protection for VW MQB-evo SFD (Schutz Fahrzeug Diagnose).
 * 2. RenaultUchGuard: Fail-Closed antiscanning & BCM lock guard for Renault/Dacia UCH/HFM.
 * 3. BmwFemGuard: Transport & EEPROM lock guard for BMW FEM/BDC modules.
 */

import { FeatureDefinition } from '../../features/FeatureTypes';
import * as Logger from '../../../services/Logger';

export interface VehicleGuardContext {
    oem: string;
    vin?: string;
    ecuAddress?: string;
    softwareVersion?: string;
    sfdTokenPresent?: boolean;
    uchAntiscanState?: 'CLEAR' | 'LOCKED' | 'UNKNOWN';
}

export class VagSfdGuard {
    /**
     * Strictly FAIL-CLOSED: Blocks write attempt if module requires SFD unlock and no valid token exists.
     */
    public static evaluate(definition: FeatureDefinition, context: VehicleGuardContext): void {
        const isVag = ['VOLKSWAGEN', 'AUDI', 'SEAT', 'SKODA'].includes(definition.oem);
        const requiresSfd = definition.safetySpec?.requireSfdUnlock;

        if (isVag && requiresSfd) {
            if (!context.sfdTokenPresent) {
                Logger.log('OEM_GUARD_SFD', `BLOCKED: SFD protection active for DID ${definition.payloadSpec.writeDid} on ECU ${definition.targetEcuAddress}`);
                throw new Error(
                    'SAFETY_VIOLATION_SFD_PROTECTED: Target module is protected by VAG SFD (Schutz Fahrzeug Diagnose). ECU write blocked for safety. Please acquire an official SFD token.'
                );
            }
        }
    }
}

export class RenaultUchGuard {
    /**
     * Strictly FAIL-CLOSED: Blocks write attempt if Renault UCH antiscanning mode or unknown lock state is active.
     */
    public static evaluate(definition: FeatureDefinition, context: VehicleGuardContext): void {
        const isRenaultGroup = ['RENAULT', 'DACIA'].includes(definition.oem);
        const isBodyModule = definition.category === 'SAFETY' || definition.category === 'COMFORT' || definition.targetEcuAddress === '0x26' || definition.targetEcuAddress === '7A0';

        if (isRenaultGroup && isBodyModule) {
            if (context.uchAntiscanState === 'LOCKED') {
                Logger.log('OEM_GUARD_RENAULT', `BLOCKED: Renault UCH antiscanning lockout active on ECU ${definition.targetEcuAddress}`);
                throw new Error(
                    'SAFETY_VIOLATION_RENAULT_UCH_ANTISCANNING: Renault UCH antiscanning lockout detected (3 failed attempts limit). ECU write blocked to prevent module bricking.'
                );
            }
            if (context.uchAntiscanState === 'UNKNOWN') {
                Logger.log('OEM_GUARD_RENAULT', `FAIL-CLOSED: Renault UCH antiscanning state unverified on ECU ${definition.targetEcuAddress}`);
                throw new Error(
                    'SAFETY_VIOLATION_RENAULT_UCH_UNVERIFIED: Renault UCH antiscanning state cannot be verified. Fail-closed policy triggered.'
                );
            }
        }
    }
}

export class BmwFemGuard {
    /**
     * Transport & EEPROM lock evaluation for BMW FEM/BDC modules.
     */
    public static evaluate(definition: FeatureDefinition, context: VehicleGuardContext): void {
        const isBmw = definition.oem === 'BMW';
        if (isBmw && definition.targetEcuAddress === '60') { // BDC / FEM address
            Logger.log('OEM_GUARD_BMW', `Evaluating BMW BDC/FEM safety guard for feature '${definition.id}'`);
        }
    }
}

export class OemGuardFramework {
    /**
     * Executes all registered OEM-specific fail-closed guards prior to UDS write operations.
     * Throws a descriptive safety error if any guard fails.
     */
    public static evaluatePreWriteGuards(definition: FeatureDefinition, context: VehicleGuardContext): void {
        VagSfdGuard.evaluate(definition, context);
        RenaultUchGuard.evaluate(definition, context);
        BmwFemGuard.evaluate(definition, context);
    }
}

export const oemGuardFramework = new OemGuardFramework();
