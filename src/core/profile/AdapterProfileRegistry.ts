export enum AdapterTier {
    TIER_S = 'TIER_S',
    TIER_A = 'TIER_A',
    TIER_C = 'TIER_C'
}

export class AdapterProfileRegistry {
    /**
     * Gets the list of adapter re-initialization commands to execute post-reset
     * based on the adapter capability score.
     */
    public static getReinitCommands(score: number, isCloneDevice = false): string[] {
        // Force Tier C minimal configuration only for severely unreliable devices (< 40 score)
        if (score < 40) {
            return [
                'ATE0', // Disable echo
                'ATH1'  // Enable headers (mandatory for parser)
            ];
        }

        if (score >= 85 && !isCloneDevice) {
            // Tier S: Full configuration
            return [
                'ATE0',     // Disable echo
                'ATL0',     // Linefeeds off
                'ATS0',     // Spaces off
                'ATH1',     // Enable headers
                'AT AT1',   // Adaptive Timing On
                'ATAL'      // Allow Long messages
            ];
        }

        // Tier A: Standard configuration for good clone (v1.5 PIC18F25K80) and standard adapters
        return [
            'ATE0',     // Disable echo
            'ATL0',     // Linefeeds off
            'ATS0',     // Spaces off
            'ATH1',     // Enable headers
            'ATAL'      // Allow Long messages
        ];
    }

    /**
     * Determines the AdapterTier classification based on score.
     */
    public static getTier(score: number, isCloneDevice = false): AdapterTier {
        if (isCloneDevice || score < 60) {
            return AdapterTier.TIER_C;
        }
        if (score >= 90) {
            return AdapterTier.TIER_S;
        }
        return AdapterTier.TIER_A;
    }
}
