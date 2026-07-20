/**
 * EcuDiscoveryEngine.ts
 * 
 * MotoCortex Multi-ECU Header Router & Physical Discovery Engine.
 * Manages CAN address headers (AT SH) and receive filters (AT CRA) to safely probe
 * and discover ECUs across major vehicle architectures (VAG, BMW, Renault, Ford, Stellantis).
 */

import { ECUFingerprint } from '../identity/VehicleFingerprint';
import * as Logger from '../../services/Logger';

export interface EcuAddressMap {
    name: string;
    txHeader: string; // e.g., '7E0'
    rxHeader: string; // e.g., '7E8'
    protocol: 'UDS' | 'KWP2000' | 'OBD';
    description: string;
}

/**
 * OEM Target ECU Addresses Dictionary
 */
export const OEM_ECU_ADDRESS_MAPS: Record<string, EcuAddressMap[]> = {
    STANDARD: [
        { name: 'Engine Control Module (ECM)', txHeader: '7E0', rxHeader: '7E8', protocol: 'OBD', description: 'Engine & Emissions ECU' },
        { name: 'Transmission Control Module (TCM)', txHeader: '7E1', rxHeader: '7E9', protocol: 'OBD', description: 'Automatic Transmission ECU' },
        { name: 'ABS / Brake System', txHeader: '7E3', rxHeader: '7EB', protocol: 'OBD', description: 'Anti-lock Braking System' },
    ],
    VAG: [
        { name: 'Engine ECU (01)', txHeader: '7E0', rxHeader: '7E8', protocol: 'UDS', description: 'VAG Engine Management' },
        { name: 'Auto Trans ECU (02)', txHeader: '7E1', rxHeader: '7E9', protocol: 'UDS', description: 'VAG DSG / Tiptronic' },
        { name: 'ABS / Brakes (03)', txHeader: '7E3', rxHeader: '7EB', protocol: 'UDS', description: 'VAG ABS/ESP' },
        { name: 'Instruments / Cluster (17)', txHeader: '7C0', rxHeader: '7CA', protocol: 'UDS', description: 'VAG Instrument Cluster (Staging)' },
        { name: 'BCM / Cent. Elec. (09)', txHeader: '709', rxHeader: '711', protocol: 'UDS', description: 'VAG Central Electrics (Long Coding)' },
        { name: 'Airbag (15)', txHeader: '772', rxHeader: '77C', protocol: 'UDS', description: 'VAG Airbag System' },
    ],
    RENAULT: [
        { name: 'Engine ECU (Injection)', txHeader: '7E0', rxHeader: '7E8', protocol: 'UDS', description: 'Renault Motor Management' },
        { name: 'UCH / BCM (Body)', txHeader: '745', rxHeader: '765', protocol: 'UDS', description: 'Renault Central Body Unit' },
        { name: 'Instrument Cluster', txHeader: '743', rxHeader: '763', protocol: 'KWP2000', description: 'Renault Dashboard' },
        { name: 'Audio / RadNav', txHeader: '744', rxHeader: '764', protocol: 'UDS', description: 'Renault Navigation Unit' },
    ],
    BMW: [
        { name: 'DME / DDE (Engine)', txHeader: '7E0', rxHeader: '7E8', protocol: 'UDS', description: 'BMW Engine Control Unit' },
        { name: 'CAS / FEM / BDC (Body)', txHeader: '760', rxHeader: '700', protocol: 'UDS', description: 'BMW Car Access / Body Domain Controller' },
        { name: 'KOMBI (Instruments)', txHeader: '760', rxHeader: '700', protocol: 'UDS', description: 'BMW Digital Display' },
        { name: 'IHKA (Climate)', txHeader: '740', rxHeader: '700', protocol: 'UDS', description: 'BMW Air Conditioning' },
    ]
};

export class EcuDiscoveryEngine {
    /**
     * Returns the appropriate AT commands required to target a specific ECU header.
     */
    public getHeaderSwitchCommands(txHeader: string, rxHeader?: string): string[] {
        const commands: string[] = [];
        commands.push(`AT SH ${txHeader.toUpperCase()}`);
        if (rxHeader) {
            commands.push(`AT CRA ${rxHeader.toUpperCase()}`);
        }
        return commands;
    }

    /**
     * Generates a safe probing candidate list based on predicted vehicle make.
     * Prevents aggressive blind 0x000-0x7FF scans that trigger ECU security lockouts.
     */
    public getProbeCandidates(make?: string): EcuAddressMap[] {
        if (!make) return OEM_ECU_ADDRESS_MAPS.STANDARD;

        const cleanMake = make.toUpperCase();
        if (cleanMake.includes('VOLKSWAGEN') || cleanMake.includes('AUDI') || cleanMake.includes('SEAT') || cleanMake.includes('SKODA') || cleanMake.includes('PORSCHE')) {
            return OEM_ECU_ADDRESS_MAPS.VAG;
        }
        if (cleanMake.includes('RENAULT') || cleanMake.includes('DACIA')) {
            return OEM_ECU_ADDRESS_MAPS.RENAULT;
        }
        if (cleanMake.includes('BMW') || cleanMake.includes('MINI')) {
            return OEM_ECU_ADDRESS_MAPS.BMW;
        }

        return OEM_ECU_ADDRESS_MAPS.STANDARD;
    }
}

export const ecuDiscoveryEngine = new EcuDiscoveryEngine();
