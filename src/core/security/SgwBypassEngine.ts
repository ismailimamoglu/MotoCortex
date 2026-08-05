/**
 * Security Gateway (SGW) Bypass Engine — MotoCortex Core
 * ----------------------------------------------------------------------
 * Handles challenge-response authentication, hardware pinout bypass detection,
 * and token-based unlocking for modern vehicle gateways:
 *  - FCA (Fiat Chrysler Automobiles / Stellantis SGW)
 *  - VAG SFD (Schutz Fahrzeug Diagnose Phase 1 & 2)
 *  - BMW ENET / Security Access (UDS 0x27)
 *  - Mercedes-Benz (CPC / Central Gateway Unlock)
 */

export type SgwVendor = 'FCA' | 'VAG_SFD' | 'BMW' | 'MERCEDES' | 'GENERIC';

export interface SgwStatus {
    isLocked: boolean;
    vendor: SgwVendor;
    securityLevel: number;
    challengeHex?: string;
    unlockedAt?: number;
    expiresAt?: number;
}

export interface SgwTokenPayload {
    vin: string;
    vendor: SgwVendor;
    challengeHex: string;
    signedToken: string;
}

export class SgwBypassEngine {
    private static activeStatus: SgwStatus = {
        isLocked: true,
        vendor: 'GENERIC',
        securityLevel: 0
    };

    /**
     * Detects if Security Gateway is active on current vehicle session based on VIN / OEM response.
     */
    public static detectSgwStatus(vin: string, oemResponseHex?: string): SgwStatus {
        if (!vin || vin.length < 3) {
            this.activeStatus = { isLocked: false, vendor: 'GENERIC', securityLevel: 0 };
            return this.activeStatus;
        }

        const cleanVin = vin.toUpperCase().trim();
        const wmi = cleanVin.substring(0, 3);

        // FCA Group (Fiat, Chrysler, Jeep, Dodge, Alfa Romeo 2018+)
        if (['1J4', '1J8', 'C4R', 'ZFA', 'FA1', '3FE', '9BD', 'ZAR'].includes(wmi)) {
            this.activeStatus = {
                isLocked: true,
                vendor: 'FCA',
                securityLevel: 2,
                challengeHex: '37A29F11'
            };
            return this.activeStatus;
        }

        // VAG SFD (VW, Audi, Porsche 2020+)
        if (['WVW', 'WVG', 'WV2', 'WA1', 'WUA', 'WP0', 'VSS', 'TMB'].includes(wmi)) {
            const isModernVag = oemResponseHex?.includes('7F2735') || oemResponseHex?.includes('7F2233');
            if (isModernVag) {
                this.activeStatus = {
                    isLocked: true,
                    vendor: 'VAG_SFD',
                    securityLevel: 3,
                    challengeHex: 'SFD_CHALLENGE_00918A'
                };
                return this.activeStatus;
            }
        }

        // Mercedes-Benz (2019+)
        if (['WDB', 'WDD', 'WDY', 'W1K'].includes(wmi)) {
            if (oemResponseHex?.includes('7F2733')) {
                this.activeStatus = {
                    isLocked: true,
                    vendor: 'MERCEDES',
                    securityLevel: 2
                };
                return this.activeStatus;
            }
        }

        this.activeStatus = { isLocked: false, vendor: 'GENERIC', securityLevel: 0 };
        return this.activeStatus;
    }

    /**
     * Applies a signed offline/cloud security token to unlock SGW writing access.
     */
    public static unlockWithToken(payload: SgwTokenPayload): { success: boolean; message: string } {
        if (!payload || !payload.signedToken) {
            return { success: false, message: 'Invalid or empty SGW unlock token.' };
        }

        const now = Date.now();
        this.activeStatus = {
            isLocked: false,
            vendor: payload.vendor,
            securityLevel: 0,
            challengeHex: payload.challengeHex,
            unlockedAt: now,
            expiresAt: now + (60 * 60 * 1000) // 1 Hour session validity
        };

        return {
            success: true,
            message: `Security Gateway unlocked successfully for ${payload.vendor} (Session valid for 60m).`
        };
    }

    /**
     * Emergency offline fallback token unlocking for field technicians without internet access.
     */
    public static unlockOfflineFallback(vin: string, vendor: SgwVendor, overrideCodeHex: string): { success: boolean; message: string } {
        if (!overrideCodeHex || overrideCodeHex.length < 8) {
            return { success: false, message: 'Invalid offline bypass code.' };
        }

        const now = Date.now();
        this.activeStatus = {
            isLocked: false,
            vendor,
            securityLevel: 1,
            unlockedAt: now,
            expiresAt: now + (15 * 60 * 1000) // 15 Minute temporary offline validity
        };

        return {
            success: true,
            message: `Offline SGW temporary bypass activated for ${vendor} (Valid for 15m).`
        };
    }

    /**
     * Checks if active session expired and performs auto-relock.
     */
    public static checkAutoRelock(): boolean {
        if (!this.activeStatus.isLocked && this.activeStatus.expiresAt) {
            if (Date.now() > this.activeStatus.expiresAt) {
                this.relock();
                return true;
            }
        }
        return false;
    }

    /**
     * Resets SGW state back to locked upon session termination or adapter disconnect.
     */
    public static relock(): void {
        this.activeStatus = {
            isLocked: true,
            vendor: 'GENERIC',
            securityLevel: 0
        };
    }

    public static getStatus(): SgwStatus {
        this.checkAutoRelock();
        return this.activeStatus;
    }
}
