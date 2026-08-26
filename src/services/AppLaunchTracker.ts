import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import * as Localization from 'expo-localization';
import { supabase } from '../api/supabaseClient';
import * as Logger from './Logger';

const STORAGE_KEY_ANON_USER_ID = '@motocortex_anon_user_id';
const STORAGE_KEY_LAST_LAUNCH = '@motocortex_last_launch_ts';

export class AppLaunchTracker {
  private static anonUserId: string | null = null;

  /**
   * Retrieves or generates a persistent anonymous user UUID.
   */
  public static async getAnonymousUserId(): Promise<string> {
    if (this.anonUserId) {
      return this.anonUserId;
    }

    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY_ANON_USER_ID);
      if (stored) {
        this.anonUserId = stored;
        return stored;
      }
    } catch (e) {
      // Fallback
    }

    // Generate RFC4122 compliant pseudo-random UUID v4
    const newId = 'usr_' + 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });

    try {
      await AsyncStorage.setItem(STORAGE_KEY_ANON_USER_ID, newId);
    } catch (e) {
      // Ignored
    }

    this.anonUserId = newId;
    return newId;
  }

  /**
   * Sends an anonymous heartbeat ping on application start.
   * Rate limited: At most once per 15 minutes to avoid duplicate floods.
   */
  public static async trackAppLaunch(): Promise<void> {
    try {
      const now = Date.now();
      const lastLaunch = await AsyncStorage.getItem(STORAGE_KEY_LAST_LAUNCH);
      if (lastLaunch && now - parseInt(lastLaunch, 10) < 15 * 60 * 1000) {
        Logger.log('APP_LAUNCH', 'Launch heartbeat throttled (< 15 min since last ping).');
        return;
      }

      const anonUserId = await this.getAnonymousUserId();
      const appVersion = Constants.expoConfig?.version || '1.0.0';
      const platform = Platform.OS;
      const osVersion = String(Platform.Version || 'unknown');
      
      let deviceModel = Constants.deviceName || (Platform.OS === 'ios' ? 'Apple iOS Device' : 'Android Device');

      let locale = 'en';
      try {
        const locales = Localization.getLocales();
        if (locales && locales.length > 0) {
          locale = locales[0].languageTag || locales[0].languageCode || 'en';
        }
      } catch (e) {
        locale = 'en';
      }

      const payload = {
        anon_user_id: anonUserId,
        app_version: appVersion,
        platform,
        device_model: deviceModel,
        os_version: osVersion,
        locale,
      };

      if (supabase && typeof supabase.rpc === 'function') {
        const { error } = await supabase.rpc('log_app_launch', { payload });
        if (error) {
          Logger.log('APP_LAUNCH_WARN', `Heartbeat RPC returned error: ${error.message}`);
        } else {
          Logger.log('APP_LAUNCH', `Launch heartbeat sent successfully for ${anonUserId}`);
          await AsyncStorage.setItem(STORAGE_KEY_LAST_LAUNCH, now.toString());
        }
      }
    } catch (err: any) {
      Logger.log('APP_LAUNCH_ERROR', `Failed to send launch heartbeat: ${err?.message || err}`);
    }
  }
}
