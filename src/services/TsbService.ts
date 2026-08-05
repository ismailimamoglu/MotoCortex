/**
 * Technical Service Bulletin (TSB) Service — MotoCortex Core
 * ----------------------------------------------------------------------
 * Provides NHTSA / OEM bulletin lookups by VIN, DTC code, and vehicle make/model.
 */

export interface TsbBulletin {
    bulletinId: string;
    make: string;
    model: string;
    yearRange: string;
    associatedDtcCodes: string[];
    component: string;
    summary: string;
    issueDate: string;
    source: 'NHTSA' | 'DVSA' | 'OEM_DIRECT';
}

export class TsbService {
    private static sampleBulletins: TsbBulletin[] = [
        {
            bulletinId: 'TSB-VAG-2023-019',
            make: 'Volkswagen',
            model: 'Golf / Passat 2.0 TDI',
            yearRange: '2015-2020',
            associatedDtcCodes: ['P2002', 'P2463'],
            component: 'Exhaust Gas Recirculation / DPF',
            summary: 'DPF soot accumulation error due to software calibration limit in low ambient temperatures.',
            issueDate: '2023-04-12',
            source: 'OEM_DIRECT',
        },
        {
            bulletinId: 'TSB-BMW-2022-088',
            make: 'BMW',
            model: '320i / 520i N20 Engine',
            yearRange: '2012-2017',
            associatedDtcCodes: ['P0300', 'P0301', 'P0302'],
            component: 'Engine Ignition & Timing Chain',
            summary: 'Ignition coil secondary winding breakdown causing random multi-cylinder misfires under load.',
            issueDate: '2022-11-05',
            source: 'NHTSA',
        },
        {
            bulletinId: 'TSB-FORD-2024-004',
            make: 'Ford',
            model: 'Focus 1.0 EcoBoost',
            yearRange: '2018-2022',
            associatedDtcCodes: ['P0130', 'P0135'],
            component: 'O2 Sensor Heating Circuit',
            summary: 'Upstream oxygen sensor wire harness contact with turbocharger heat shield causing short to ground.',
            issueDate: '2024-01-20',
            source: 'NHTSA',
        },
    ];

    /**
     * Finds matching TSB bulletins for given DTC codes and vehicle specifications.
     */
    public static async getMatchingBulletins(dtcCodes: string[], make?: string): Promise<TsbBulletin[]> {
        if (!dtcCodes || dtcCodes.length === 0) return [];

        const normalizedCodes = dtcCodes.map(c => c.toUpperCase().trim());
        
        return this.sampleBulletins.filter(bulletin => {
            const codeMatch = bulletin.associatedDtcCodes.some(code => normalizedCodes.includes(code));
            const makeMatch = !make || bulletin.make.toLowerCase().includes(make.toLowerCase());
            return codeMatch || (makeMatch && codeMatch);
        });
    }
}
