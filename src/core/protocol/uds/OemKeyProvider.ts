/**
 * OemKeyProvider.ts
 * 
 * MotoCortex Enterprise OEM Security Access (Mode 0x27) Resolver Provider.
 * Supports hybrid resolution:
 *  1. On-device local OEM Seed-Key algorithms
 *  2. Remote HSM / Backend API challenge-response resolution (Supabase / REST Endpoint)
 *  3. Fail-safe abort to prevent NRC 0x35 / NRC 0x36 ECU lockouts
 */

import { supabase } from '../../../api/supabaseClient';
import * as Logger from '../../../services/Logger';

export interface RemoteKeyRequest {
  seedHex: string;
  oemName: string;
  vin?: string;
  ecuAddress?: string;
  securityLevel?: number;
}

export interface RemoteKeyResponse {
  success: boolean;
  keyHex?: string;
  error?: string;
  source: 'LOCAL' | 'REMOTE_HSM' | 'DEV_MOCK';
}

export class OemKeyProvider {
  private remoteEndpointUrl: string | null = null;

  /**
   * Configures a custom remote HSM / API endpoint URL if available.
   */
  public setRemoteEndpointUrl(url: string | null): void {
    this.remoteEndpointUrl = url;
  }

  /**
   * Fetches Security Access Key asynchronously from Supabase RPC or custom HSM backend.
   */
  public async fetchRemoteKey(req: RemoteKeyRequest): Promise<RemoteKeyResponse> {
    const cleanSeed = req.seedHex.replace(/\s+/g, '').toUpperCase();
    if (!cleanSeed || cleanSeed.length % 2 !== 0) {
      return { success: false, error: 'INVALID_SEED_FORMAT', source: 'REMOTE_HSM' };
    }

    try {
      // 1. Check if Supabase RPC function 'calculate_ecu_security_key' is provisioned
      if (supabase) {
        const { data, error } = await supabase.rpc('calculate_ecu_security_key', {
          p_seed_hex: cleanSeed,
          p_oem: req.oemName.toUpperCase(),
          p_vin: req.vin || 'UNKNOWN',
          p_level: req.securityLevel || 1,
        });

        if (!error && data && data.key_hex) {
          Logger.log('OEM_KEY_PROVIDER', `Remote Supabase HSM resolved key for OEM ${req.oemName}`);
          return {
            success: true,
            keyHex: data.key_hex.toUpperCase(),
            source: 'REMOTE_HSM',
          };
        }
      }

      // 2. Fallback to custom REST endpoint if configured
      if (this.remoteEndpointUrl) {
        const response = await fetch(this.remoteEndpointUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(req),
        });

        if (response.ok) {
          const resData = await response.json();
          if (resData && resData.keyHex) {
            return {
              success: true,
              keyHex: resData.keyHex.toUpperCase(),
              source: 'REMOTE_HSM',
            };
          }
        }
      }

      return {
        success: false,
        error: `NO_REMOTE_HSM_KEY_FOR_OEM_${req.oemName.toUpperCase()}`,
        source: 'REMOTE_HSM',
      };
    } catch (e: any) {
      Logger.log('OEM_KEY_PROVIDER', `Remote key fetch error: ${e?.message || e}`);
      return {
        success: false,
        error: `REMOTE_FETCH_FAILED: ${e?.message || e}`,
        source: 'REMOTE_HSM',
      };
    }
  }
}

export const oemKeyProvider = new OemKeyProvider();
