import { createClient } from '@supabase/supabase-js';
import { sha256 } from '../utils/crypto';

import Constants from 'expo-constants';

const rawUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || Constants?.expoConfig?.extra?.EXPO_PUBLIC_SUPABASE_URL || '';
const supabaseUrl = rawUrl.replace(/\/rest\/v1\/?$/, '');
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || Constants?.expoConfig?.extra?.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('[MOTO CORTEX] Warning: Supabase environment variables are missing! Telemetry sync will fail.');
}

// Dynamic verification seal configuration (API client hardening)
const HARDENING_SALT = 'MotoCortexTelemetryHardeningSalt2026_SecureKey!';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  global: {
    fetch: async (url, options = {}) => {
      const timestamp = Date.now().toString();
      let signature = '';

      try {
        signature = sha256(`${timestamp}_${HARDENING_SALT}`);
      } catch (e) {
        // Fallback hashing logic if hashing fails
        let hash = 0;
        const data = `${timestamp}_${HARDENING_SALT}`;
        for (let i = 0; i < data.length; i++) {
          hash = ((hash << 5) - hash) + data.charCodeAt(i);
          hash |= 0;
        }
        signature = `fallback_${Math.abs(hash).toString(16)}`;
      }

      const headers = new Headers(options.headers || {});
      headers.set('X-MotoCortex-Timestamp', timestamp);
      headers.set('X-MotoCortex-Signature', signature);

      return fetch(url, {
        ...options,
        headers,
      });
    },
  },
});
