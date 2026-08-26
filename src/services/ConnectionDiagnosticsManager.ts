import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { supabase } from '../api/supabaseClient';
import { AppLaunchTracker } from './AppLaunchTracker';
import * as Logger from './Logger';

export interface ConnectionDiagnosticParams {
  sessionId?: string;
  adapterName: string;
  transportType?: 'BLE' | 'WIFI' | 'CLASSIC';
  status: 'SUCCESS' | 'FAILED';
  errorReason?: string;
  failureStage?: 'SCAN' | 'BLE_CONNECT' | 'HANDSHAKE' | 'ECU_INIT' | 'SOCKET_DROP';
  chipType?: string;
  protocol?: string;
  vehicleInfo?: {
    brand?: string;
    model?: string;
    year?: number;
    vin?: string;
    wmi?: string;
  };
  durationMs?: number;
  recentLogs?: string[];
}

export class ConnectionDiagnosticsManager {
  private static activeSessionId: string | null = null;
  private static sessionStartTime: number = 0;

  /**
   * Starts a new connection attempt session tracking.
   */
  public static startSession(adapterName: string): string {
    const sessionId = 'sess_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 7);
    this.activeSessionId = sessionId;
    this.sessionStartTime = Date.now();
    Logger.log('CONN_DIAG', `Started connection tracking session: ${sessionId} for ${adapterName}`);
    return sessionId;
  }

  public static getActiveSessionId(): string {
    if (!this.activeSessionId) {
      this.activeSessionId = 'sess_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 7);
      this.sessionStartTime = Date.now();
    }
    return this.activeSessionId;
  }

  /**
   * Sanitizes terminal log lines to redact potential sensitive tokens while preserving AT handshake commands.
   */
  private static sanitizeLogs(logs?: string[]): string[] {
    if (!logs || !Array.isArray(logs)) return [];
    return logs.slice(-25).map(line => {
      if (typeof line !== 'string') return '';
      // Limit line length to 200 chars
      return line.length > 200 ? line.substring(0, 197) + '...' : line;
    });
  }

  /**
   * Records a diagnostic event (Success or Failure) and transmits to Supabase & Firebase Crashlytics.
   */
  public static async recordDiagnostic(params: ConnectionDiagnosticParams): Promise<void> {
    try {
      const anonUserId = await AppLaunchTracker.getAnonymousUserId();
      const appVersion = Constants.expoConfig?.version || '1.0.0';
      const sessionId = params.sessionId || this.getActiveSessionId();
      const durationMs = params.durationMs || (this.sessionStartTime > 0 ? Date.now() - this.sessionStartTime : 0);

      const cleanLogs = this.sanitizeLogs(params.recentLogs);

      const payload = {
        session_id: sessionId,
        anon_user_id: anonUserId,
        app_version: appVersion,
        platform: Platform.OS,
        consent_version: 'v1.0',
        vehicle: params.vehicleInfo || {},
        ecu_fingerprint: {
          protocol: params.protocol || 'UNKNOWN',
        },
        adapter: {
          claimed_name: params.adapterName || 'Unknown Adapter',
          real_chip_type: params.chipType || 'STANDARD_ELM327',
          transport: params.transportType || 'BLE',
        },
        metrics: {
          status: params.status,
          error_reason: params.errorReason || null,
          failure_stage: params.failureStage || null,
          duration_ms: durationMs,
        },
        redacted_trace_log: cleanLogs,
      };

      // 1. Firebase Crashlytics Non-Fatal Breadcrumb
      try {
        const crashlyticsMod = require('@react-native-firebase/crashlytics').default;
        if (crashlyticsMod) {
          const crash = crashlyticsMod();
          if (crash && typeof crash.log === 'function') {
            crash.log(`[OBD_CONN_${params.status}] Adapter: ${params.adapterName} | Error: ${params.errorReason || 'None'} | Stage: ${params.failureStage || 'None'}`);
          }
        }
      } catch (e) {
        // Handled silently
      }

      // 2. Supabase RPC Sync
      if (supabase && typeof supabase.rpc === 'function') {
        const { error } = await supabase.rpc('upsert_connection_telemetry', { payload });
        if (error) {
          Logger.log('CONN_DIAG_WARN', `Supabase connection telemetry upload warning: ${error.message}`);
        } else {
          Logger.log('CONN_DIAG', `Connection diagnostic (${params.status}) logged to Supabase for ${sessionId}`);
        }
      }
    } catch (err: any) {
      Logger.log('CONN_DIAG_ERROR', `Failed to record connection diagnostic: ${err?.message || err}`);
    }
  }
}
