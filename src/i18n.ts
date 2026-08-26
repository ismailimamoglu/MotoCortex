import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import en from './locales/en.json';

export const localeLoaders: Record<string, () => any> = {
    en: () => en,
    tr: () => require('./locales/tr.json'),
    id: () => require('./locales/id.json'),
    de: () => require('./locales/de.json'),
    es: () => require('./locales/es.json'),
    it: () => require('./locales/it.json'),
    ar: () => require('./locales/ar.json'),
    zh: () => require('./locales/zh.json'),
    da: () => require('./locales/da.json'),
    fi: () => require('./locales/fi.json'),
    fr: () => require('./locales/fr.json'),
    hi: () => require('./locales/hi.json'),
    nl: () => require('./locales/nl.json'),
    ja: () => require('./locales/ja.json'),
    ko: () => require('./locales/ko.json'),
    pl: () => require('./locales/pl.json'),
    hu: () => require('./locales/hu.json'),
    no: () => require('./locales/no.json'),
    pt: () => require('./locales/pt.json'),
    ro: () => require('./locales/ro.json'),
    ru: () => require('./locales/ru.json'),
    th: () => require('./locales/th.json'),
    uk: () => require('./locales/uk.json'),
    el: () => require('./locales/el.json'),
    cs: () => require('./locales/cs.json'),
    sv: () => require('./locales/sv.json'),
};

/**
 * Dynamically loads and injects a locale bundle into i18n runtime on-demand.
 * Keeps cold-start memory footprint minimal to prevent Hermes OOM heap crashes.
 */
export const ensureLocaleLoaded = (lng: string): boolean => {
    if (!lng) return false;
    if (i18n.hasResourceBundle(lng, 'translation')) {
        return true;
    }
    const loader = localeLoaders[lng];
    if (loader) {
        try {
            const data = loader();
            i18n.addResourceBundle(lng, 'translation', data, true, true);
            return true;
        } catch (err) {
            console.warn(`[i18n] Failed to load locale bundle for [${lng}]:`, err);
        }
    }
    return false;
};

const resources = {
    en: { translation: en },
};

// Rate limiting tracker to prevent Bridge Flooding on high-frequency UI updates
const reportedMissingKeys = new Set<string>();

i18n
    .use(initReactI18next)
    .init({
        resources,
        lng: 'en',
        fallbackLng: 'en',
        fallbackNS: 'translation',
        returnEmptyString: false,
        compatibilityJSON: 'v4',
        debug: false,
        interpolation: {
            escapeValue: false,
        },
        react: {
            useSuspense: false,
        },
        /**
         * [v7.4.9] Production i18n Safety Valve — Missing Key Handler
         *
         * When any of the 26 locale files is missing a key, i18next falls
         * back to 'en' (fallbackLng). This handler additionally logs the
         * missing key to Firebase Crashlytics as a non-fatal breadcrumb,
         * so we can detect translation gaps in production telemetry
         * without crashing the app.
         *
         * saveMissing must be true for this handler to fire.
         */
        saveMissing: !__DEV__,
        parseMissingKeyHandler: (key, defaultValue) => {
            return defaultValue || key;
        },
        missingKeyHandler: (lngs, namespace, key, fallbackValue) => {
            const keyIdentifier = `${namespace}:${key}`;
            if (reportedMissingKeys.has(keyIdentifier)) return;
            reportedMissingKeys.add(keyIdentifier);

            if (__DEV__) {
                console.warn(`[i18n] Missing translation key detected: [${keyIdentifier}]`);
                return;
            }

            try {
                // Lazy-load crashlytics to avoid native module resolution
                // failures in Jest test environment.
                const crashlytics = require('@react-native-firebase/crashlytics').default;
                
                // Enforce instant server logging instead of breadcrumb-only log
                crashlytics().recordError(
                    new Error(`Missing i18n translation key: [${keyIdentifier}]`)
                );
            } catch {
                // Crashlytics may not be initialized during cold start or
                // in test environments; swallow silently to prevent crash.
            }
        },
    });

// Hook into changeLanguage to guarantee on-demand loading
const originalChangeLanguage = i18n.changeLanguage.bind(i18n);
i18n.changeLanguage = async (lng?: string, ...args: any[]) => {
    const targetLng = (lng || 'en').toLowerCase().split('-')[0];
    ensureLocaleLoaded(targetLng);
    return (originalChangeLanguage as any)(targetLng, ...args);
};

export default i18n;
