/**
 * UdsClient.ts
 * 
 * MotoCortex ISO 14229 Unified Diagnostic Services (UDS) Client Engine.
 * Handles UDS service encoding/decoding, session transitions, security access,
 * and comprehensive Negative Response Code (NRC) parsing.
 */

export enum UdsService {
    DiagnosticSessionControl = 0x10,
    EcuReset = 0x11,
    ClearDiagnosticInformation = 0x14,
    ReadDtcInformation = 0x19,
    ReadDataByIdentifier = 0x22,
    SecurityAccess = 0x27,
    WriteDataByIdentifier = 0x2E,
    RoutineControl = 0x31,
    TesterPresent = 0x3E,
    ControlDtcSetting = 0x85,
}

export enum UdsSessionType {
    DEFAULT = 0x01,
    PROGRAMMING = 0x02,
    EXTENDED = 0x03,
    SAFETY_SYSTEM = 0x04,
}

export enum UdsNrcCode {
    GeneralReject = 0x10,
    ServiceNotSupported = 0x11,
    SubFunctionNotSupported = 0x12,
    IncorrectMessageLength = 0x13,
    ConditionsNotCorrect = 0x22,
    RequestSequenceError = 0x24,
    RequestOutOfRange = 0x31,
    SecurityAccessDenied = 0x33,
    InvalidKey = 0x35,
    ExceededNumberOfAttempts = 0x36,
    RequiredTimeDelayNotExpired = 0x37,
    ResponsePending = 0x78,
}

export interface UdsResponse {
    isPositive: boolean;
    service: number;
    subFunction?: number;
    rawHex: string;
    payloadHex: string;
    nrcCode?: UdsNrcCode;
    nrcMessage?: string;
    isResponsePending?: boolean;
}

const NRC_DESCRIPTIONS: Record<number, string> = {
    0x10: 'General Reject',
    0x11: 'Service Not Supported',
    0x12: 'Sub-Function Not Supported',
    0x13: 'Incorrect Message Length Or Invalid Format',
    0x22: 'Conditions Not Correct',
    0x24: 'Request Sequence Error',
    0x31: 'Request Out Of Range',
    0x33: 'Security Access Denied',
    0x35: 'Invalid Key',
    0x36: 'Exceeded Number Of Attempts',
    0x37: 'Required Time Delay Not Expired',
    0x78: 'Response Pending',
};

export class UdsClient {
    /**
     * Parses raw response string from ECU into structured UdsResponse object.
     */
    public parseResponse(rawResponse: string, expectedService: UdsService): UdsResponse {
        const clean = rawResponse.replace(/[\r\n\s>]/g, '').toUpperCase();
        
        // Negative Response check: Starts with 7F + SID + NRC
        const nrcMatch = clean.match(/7F([0-9A-F]{2})([0-9A-F]{2})/);
        if (nrcMatch) {
            const sidHex = parseInt(nrcMatch[1], 16);
            const nrcHex = parseInt(nrcMatch[2], 16);
            const isResponsePending = nrcHex === UdsNrcCode.ResponsePending;

            return {
                isPositive: false,
                service: sidHex,
                rawHex: clean,
                payloadHex: '',
                nrcCode: nrcHex,
                nrcMessage: NRC_DESCRIPTIONS[nrcHex] || `Unknown NRC 0x${nrcMatch[2]}`,
                isResponsePending
            };
        }

        // Positive Response check: Expected Service ID + 0x40
        const positiveServiceId = (expectedService + 0x40).toString(16).toUpperCase().padStart(2, '0');
        const posIndex = clean.indexOf(positiveServiceId);

        if (posIndex !== -1) {
            const remainingHex = clean.substring(posIndex + 2);
            let subFunction: number | undefined = undefined;
            let payloadHex = remainingHex;

            // SubFunction services (0x10, 0x11, 0x27, 0x3E) include subfunction byte
            if ([UdsService.DiagnosticSessionControl, UdsService.EcuReset, UdsService.SecurityAccess, UdsService.TesterPresent].includes(expectedService) && remainingHex.length >= 2) {
                subFunction = parseInt(remainingHex.substring(0, 2), 16);
                payloadHex = remainingHex.substring(2);
            }

            return {
                isPositive: true,
                service: expectedService,
                subFunction,
                rawHex: clean,
                payloadHex
            };
        }

        // Fallback response parsing
        return {
            isPositive: false,
            service: expectedService,
            rawHex: clean,
            payloadHex: '',
            nrcMessage: 'Invalid or Unrecognized Response Format'
        };
    }

    /**
     * Builds command string for UDS Diagnostic Session Control (0x10).
     */
    public buildSessionControlCmd(session: UdsSessionType): string {
        const sessionHex = session.toString(16).padStart(2, '0').toUpperCase();
        return `10 ${sessionHex}`;
    }

    /**
     * Builds command string for UDS Read Data By Identifier (0x22).
     */
    public buildReadDataByIdentifierCmd(didHex: string): string {
        const cleanDid = didHex.replace(/\s+/g, '').toUpperCase();
        return `22 ${cleanDid.substring(0, 2)} ${cleanDid.substring(2, 4)}`;
    }

    /**
     * Builds command string for UDS Write Data By Identifier (0x2E).
     */
    public buildWriteDataByIdentifierCmd(didHex: string, dataBytesHex: string): string {
        const cleanDid = didHex.replace(/\s+/g, '').toUpperCase();
        const cleanData = dataBytesHex.replace(/\s+/g, '').toUpperCase();
        
        const didFormatted = `${cleanDid.substring(0, 2)} ${cleanDid.substring(2, 4)}`;
        const dataFormatted = cleanData.match(/.{1,2}/g)?.join(' ') || cleanData;

        return `2E ${didFormatted} ${dataFormatted}`;
    }

    /**
     * Builds command string for UDS Security Access Request Seed (0x27 01).
     */
    public buildSecuritySeedCmd(level: number = 1): string {
        const levelHex = level.toString(16).padStart(2, '0').toUpperCase();
        return `27 ${levelHex}`;
    }

    /**
     * Builds command string for UDS Security Access Send Key (0x27 02).
     */
    public buildSecurityKeyCmd(level: number = 2, keyHex: string): string {
        const levelHex = level.toString(16).padStart(2, '0').toUpperCase();
        const cleanKey = keyHex.replace(/\s+/g, '').toUpperCase();
        const keyFormatted = cleanKey.match(/.{1,2}/g)?.join(' ') || cleanKey;
        return `27 ${levelHex} ${keyFormatted}`;
    }

    /**
     * Builds command string for Tester Present (0x3E 00).
     */
    public buildTesterPresentCmd(): string {
        return '3E 00';
    }
}

export const udsClient = new UdsClient();
