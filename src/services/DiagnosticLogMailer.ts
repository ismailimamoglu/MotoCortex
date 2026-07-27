// src/services/DiagnosticLogMailer.ts
// MotoCortex - Automatic Kara Kutu Diagnostic Log Mailer for Test Builds

import { Linking, Platform } from 'react-native';

export const TARGET_TEST_EMAIL = 'ismailimamgolu610@gmail.com';
export const IS_TEST_BUILD = true; // Set to false for global production releases

export class DiagnosticLogMailer {
  private static lastSentTimestamp = 0;

  /**
   * Compiles and dispatches the raw OBD terminal logs (Kara Kutu) to the test email address.
   */
  public static async sendReport(params: {
    status: 'SUCCESS' | 'FAILED';
    protocol?: string | null;
    adapterScore?: number;
    isClone?: boolean;
    vehicleName?: string;
    logs: string[];
    errorReason?: string;
  }): Promise<boolean> {
    if (!IS_TEST_BUILD) return false;

    // Cooldown: prevent sending duplicate emails within 15 seconds
    const now = Date.now();
    if (now - this.lastSentTimestamp < 15000) {
      return false;
    }
    this.lastSentTimestamp = now;

    try {
      const timestampStr = new Date().toLocaleString();
      const statusIcon = params.status === 'SUCCESS' ? '✅' : '❌';
      const subject = encodeURIComponent(
        `[MotoCortex Test Report ${statusIcon}] ${params.vehicleName || 'Vehicle'} - ${params.protocol || 'OBD2'}`
      );

      const recentLogs = params.logs.slice(-150).join('\n');

      const bodyContent = [
        `==================================================`,
        `MOTOCORTEX AUTOMATIC TEST DIAGNOSTIC REPORT`,
        `==================================================`,
        `Date/Time: ${timestampStr}`,
        `Connection Status: ${params.status}`,
        `Target Vehicle: ${params.vehicleName || 'Not Specified'}`,
        `Detected Protocol: ${params.protocol || 'UNKNOWN'}`,
        `Adapter Capability Score: ${params.adapterScore ?? 'N/A'}/100`,
        `Clone Device Flag: ${params.isClone ? 'YES (Clone)' : 'NO (Original)'}`,
        `Platform: ${Platform.OS.toUpperCase()}`,
        params.errorReason ? `Failure Reason: ${params.errorReason}` : '',
        `==================================================`,
        `KARA KUTU RAW UART TERMINAL LOGS (LAST 150 LINES):`,
        `==================================================`,
        recentLogs,
        `==================================================`,
        `End of Diagnostic Report.`
      ]
        .filter(Boolean)
        .join('\n');

      const mailtoUrl = `mailto:${TARGET_TEST_EMAIL}?subject=${subject}&body=${encodeURIComponent(
        bodyContent
      )}`;

      const canOpen = await Linking.canOpenURL(mailtoUrl).catch(() => false);
      if (canOpen) {
        await Linking.openURL(mailtoUrl);
        return true;
      } else {
        console.warn('[DiagnosticLogMailer] Cannot open mailto link on device.');
        return false;
      }
    } catch (err) {
      console.error('[DiagnosticLogMailer] Failed to send diagnostic log email:', err);
      return false;
    }
  }
}

export default DiagnosticLogMailer;
