import { I18nManager, DevSettings } from 'react-native';
import * as Updates from 'expo-updates';

/**
 * MotoCortex RTL & Language Reload Manager
 * Handles Right-to-Left (RTL) layout switching for Arabic (ar)
 * and executes environment-safe application reloads.
 */
export async function syncRtlLayout(targetLanguage: string): Promise<boolean> {
  const isRtlLang = targetLanguage === 'ar';
  const currentIsRtl = I18nManager.isRTL;

  if (isRtlLang !== currentIsRtl) {
    I18nManager.allowRTL(isRtlLang);
    I18nManager.forceRTL(isRtlLang);

    // Environment-safe reload trigger
    if (__DEV__) {
      DevSettings.reload();
    } else {
      try {
        await Updates.reloadAsync();
      } catch (err) {
        console.warn('[RTL Manager] Updates.reloadAsync failed, falling back to DevSettings:', err);
        DevSettings.reload();
      }
    }
    return true;
  }

  return false;
}
