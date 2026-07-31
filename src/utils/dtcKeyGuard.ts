/**
 * Type-Safe Dynamic DTC Key Guard & Resolution Helper
 * Prevents TypeScript type degradation when dynamically resolving DTC translation keys.
 */

import i18n from '../i18n';
import en from '../locales/en.json';

export type DtcTranslationKeys = typeof en.dtc;
export type DtcKeyName = keyof DtcTranslationKeys;

/**
 * Type-guard function checking if a dynamic DTC code exists in the master translation dictionary.
 */
export function isValidDtcKey(code: string): code is DtcKeyName {
  if (!code) return false;
  const clean = code.toUpperCase().trim();
  return clean in en.dtc;
}

/**
 * Safely resolves localized DTC string dynamically with full type guard protection.
 */
export function lookupLocalizedDtc(code: string): string | null {
  if (!code) return null;
  const cleanCode = code.toUpperCase().trim();
  const i18nKey = `dtc.${cleanCode}`;
  
  if (i18n.isInitialized && i18n.exists(i18nKey)) {
    return i18n.t(i18nKey);
  }

  return null;
}
