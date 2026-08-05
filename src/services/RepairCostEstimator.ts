/**
 * Regional Repair Cost Estimator — MotoCortex Core
 * ----------------------------------------------------------------------
 * Calculates labor, OEM vs aftermarket parts, and total repair estimate ranges
 * based on geographic region (TR, US, EU, UK, JP).
 */

export type Region = 'TR' | 'US' | 'EU' | 'UK' | 'JP';

export interface RepairEstimateRequest {
    dtcCodes: string[];
    region?: Region;
    isOemPartPreferred?: boolean;
}

export interface RepairCostEstimate {
    currencySymbol: string;
    currencyCode: string;
    estimatedLaborHours: number;
    laborCostMin: number;
    laborCostMax: number;
    partCostMin: number;
    partCostMax: number;
    totalMin: number;
    totalMax: number;
    confidenceLevel: 'HIGH' | 'MEDIUM' | 'ESTIMATED';
}

export class RepairCostEstimator {
    private static HOURLY_LABOR_RATES: Record<Region, { rate: number; currency: string; symbol: string }> = {
        TR: { rate: 1200, currency: 'TRY', symbol: '₺' },
        US: { rate: 120, currency: 'USD', symbol: '$' },
        EU: { rate: 95, currency: 'EUR', symbol: '€' },
        UK: { rate: 85, currency: 'GBP', symbol: '£' },
        JP: { rate: 11000, currency: 'JPY', symbol: '¥' },
    };

    /**
     * Calculates repair cost breakdown for given DTC codes and region.
     */
    public static estimateRepair(request: RepairEstimateRequest): RepairCostEstimate {
        const region = request.region || 'TR';
        const rateInfo = this.HOURLY_LABOR_RATES[region] || this.HOURLY_LABOR_RATES.TR;

        const dtcCount = request.dtcCodes.length;
        let baseHours = 1.0;
        let basePartUsdMin = 50;
        let basePartUsdMax = 150;

        if (request.dtcCodes.some(c => c.startsWith('P030') || c.startsWith('P02'))) {
            baseHours = 2.5;
            basePartUsdMin = 120;
            basePartUsdMax = 350;
        } else if (request.dtcCodes.some(c => c.startsWith('P07') || c.startsWith('P08'))) {
            baseHours = 4.0;
            basePartUsdMin = 300;
            basePartUsdMax = 900;
        } else if (dtcCount > 2) {
            baseHours = 2.0;
            basePartUsdMin = 100;
            basePartUsdMax = 300;
        }

        // Adjust for OEM preference multiplier
        const partMultiplier = request.isOemPartPreferred ? 1.6 : 1.0;

        // Convert base USD part estimates to regional currency using approximate rates
        let currencyConversion = 1.0;
        if (region === 'TR') currencyConversion = 35.0; // 1 USD ~ 35 TRY
        else if (region === 'EU') currencyConversion = 0.92;
        else if (region === 'UK') currencyConversion = 0.78;
        else if (region === 'JP') currencyConversion = 155.0;

        const partMin = Math.round(basePartUsdMin * partMultiplier * currencyConversion);
        const partMax = Math.round(basePartUsdMax * partMultiplier * currencyConversion);

        const laborMin = Math.round(baseHours * rateInfo.rate);
        const laborMax = Math.round((baseHours + 1.0) * rateInfo.rate);

        return {
            currencySymbol: rateInfo.symbol,
            currencyCode: rateInfo.currency,
            estimatedLaborHours: baseHours,
            laborCostMin: laborMin,
            laborCostMax: laborMax,
            partCostMin: partMin,
            partCostMax: partMax,
            totalMin: laborMin + partMin,
            totalMax: laborMax + partMax,
            confidenceLevel: dtcCount > 0 ? 'HIGH' : 'ESTIMATED',
        };
    }
}
