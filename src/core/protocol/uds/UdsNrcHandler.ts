// src/core/protocol/uds/UdsNrcHandler.ts
// MotoCortex v8.0.0 - UDS Negative Response Code (NRC) Handler & Lockout Guard

import { UdsNrcCode } from './UdsClient';

export interface NrcAnalysisResult {
    nrcCode: number;
    rawHex: string;
    isLockoutTriggered: boolean;
    lockoutDurationSeconds: number;
    titleKey: string;
    messageKey: string;
    defaultMessage: string;
}

export class UdsNrcHandler {
    private static lockoutEndTime: number = 0;

    /**
     * Checks whether an ECU lockout timer is currently active (e.g. from NRC 0x36).
     */
    public static isLockoutActive(): boolean {
        return Date.now() < this.lockoutEndTime;
    }

    /**
     * Returns remaining lockout duration in seconds.
     */
    public static getRemainingLockoutSeconds(): number {
        if (!this.isLockoutActive()) return 0;
        return Math.ceil((this.lockoutEndTime - Date.now()) / 1000);
    }

    /**
     * Parses raw ECU response and generates humanized NrcAnalysisResult.
     */
    public static analyzeResponse(rawResponse: string): NrcAnalysisResult | null {
        const clean = rawResponse.replace(/[\r\n\s>]/g, '').toUpperCase();
        const nrcMatch = clean.match(/7F([0-9A-F]{2})([0-9A-F]{2})/);

        if (!nrcMatch) return null;

        const nrcHex = parseInt(nrcMatch[2], 16);
        return this.analyzeCode(nrcHex, clean);
    }

    /**
     * Evaluates UDS NRC code into structured analysis with localized keys and safety guidance.
     */
    public static analyzeCode(nrcCode: number, rawHex: string = ''): NrcAnalysisResult {
        let isLockout = false;
        let lockoutDuration = 0;
        let titleKey = 'nrc.genericTitle';
        let messageKey = 'nrc.genericDesc';
        let defaultMessage = `ECU rejected operation with NRC 0x${nrcCode.toString(16).toUpperCase().padStart(2, '0')}.`;

        switch (nrcCode) {
            case UdsNrcCode.GeneralReject: // 0x10
                titleKey = 'nrc.generalRejectTitle';
                messageKey = 'nrc.generalRejectDesc';
                defaultMessage = 'ECU general reject: The ECU is currently rejecting diagnostic requests.';
                break;

            case UdsNrcCode.ServiceNotSupported: // 0x11
                titleKey = 'nrc.serviceNotSupportedTitle';
                messageKey = 'nrc.serviceNotSupportedDesc';
                defaultMessage = 'Service not supported: The target ECU does not support this diagnostic service.';
                break;

            case UdsNrcCode.SubFunctionNotSupported: // 0x12
                titleKey = 'nrc.subFunctionNotSupportedTitle';
                messageKey = 'nrc.subFunctionNotSupportedDesc';
                defaultMessage = 'Sub-function not supported: The requested diagnostic sub-function is unhandled by this module.';
                break;

            case UdsNrcCode.IncorrectMessageLength: // 0x13
                titleKey = 'nrc.formatErrorTitle';
                messageKey = 'nrc.formatErrorDesc';
                defaultMessage = 'Incorrect message length: Diagnostic payload format mismatch.';
                break;

            case UdsNrcCode.ConditionsNotCorrect: // 0x22
                titleKey = 'nrc.conditionsNotCorrectTitle';
                messageKey = 'nrc.conditionsNotCorrectDesc';
                defaultMessage = 'Preconditions not met: Ensure vehicle ignition is ON, engine is OFF, and speed is 0 km/h.';
                break;

            case UdsNrcCode.RequestSequenceError: // 0x24
                titleKey = 'nrc.sequenceErrorTitle';
                messageKey = 'nrc.sequenceErrorDesc';
                defaultMessage = 'Sequence error: Diagnostic session sequence was executed out of order.';
                break;

            case UdsNrcCode.RequestOutOfRange: // 0x31
                titleKey = 'nrc.outOfRangeTitle';
                messageKey = 'nrc.outOfRangeDesc';
                defaultMessage = 'Request out of range: Data Identifier (DID) or memory address is out of bounds for this ECU.';
                break;

            case UdsNrcCode.SecurityAccessDenied: // 0x33
                titleKey = 'nrc.securityAccessDeniedTitle';
                messageKey = 'nrc.securityAccessDeniedDesc';
                defaultMessage = 'Security access denied: ECU requires a valid security key unlock before coding.';
                break;

            case UdsNrcCode.InvalidKey: // 0x35
                titleKey = 'nrc.invalidKeyTitle';
                messageKey = 'nrc.invalidKeyDesc';
                defaultMessage = 'Invalid security key: Security unlock key mismatch.';
                break;

            case UdsNrcCode.ExceededNumberOfAttempts: // 0x36
                isLockout = true;
                lockoutDuration = 600; // 10 minutes mandatory lockout
                this.lockoutEndTime = Date.now() + lockoutDuration * 1000;
                titleKey = 'nrc.exceededAttemptsTitle';
                messageKey = 'nrc.exceededAttemptsDesc';
                defaultMessage = 'Security lockout: Maximum security unlock attempts exceeded. ECU is locked for 10 minutes.';
                break;

            case UdsNrcCode.RequiredTimeDelayNotExpired: // 0x37
                isLockout = true;
                lockoutDuration = 300; // 5 minutes cooldown
                this.lockoutEndTime = Date.now() + lockoutDuration * 1000;
                titleKey = 'nrc.timeDelayTitle';
                messageKey = 'nrc.timeDelayDesc';
                defaultMessage = 'Time delay required: ECU security cooldown in progress. Please wait before retrying.';
                break;

            case UdsNrcCode.ResponsePending: // 0x78
                titleKey = 'nrc.pendingTitle';
                messageKey = 'nrc.pendingDesc';
                defaultMessage = 'Response pending: ECU processing long operation.';
                break;
        }

        return {
            nrcCode,
            rawHex,
            isLockoutTriggered: isLockout,
            lockoutDurationSeconds: lockoutDuration,
            titleKey,
            messageKey,
            defaultMessage,
        };
    }
}
