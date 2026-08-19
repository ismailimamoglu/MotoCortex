import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import tr from './locales/tr.json';
import en from './locales/en.json';
import id from './locales/id.json';
import de from './locales/de.json';
import es from './locales/es.json';
import it from './locales/it.json';
import ar from './locales/ar.json';
import zh from './locales/zh.json';
import da from './locales/da.json';
import fi from './locales/fi.json';
import fr from './locales/fr.json';
import hi from './locales/hi.json';
import nl from './locales/nl.json';
import ja from './locales/ja.json';
import ko from './locales/ko.json';
import pl from './locales/pl.json';
import hu from './locales/hu.json';
import no from './locales/no.json';
import pt from './locales/pt.json';
import ro from './locales/ro.json';
import ru from './locales/ru.json';
import th from './locales/th.json';
import uk from './locales/uk.json';
import el from './locales/el.json';
import cs from './locales/cs.json';
import sv from './locales/sv.json';

const resources = {
    tr: { translation: tr },
    en: { translation: en },
    id: { translation: id },
    de: { translation: de },
    es: { translation: es },
    it: { translation: it },
    ar: { translation: ar },
    zh: { translation: zh },
    da: { translation: da },
    fi: { translation: fi },
    fr: { translation: fr },
    hi: { translation: hi },
    nl: { translation: nl },
    ja: { translation: ja },
    ko: { translation: ko },
    pl: { translation: pl },
    hu: { translation: hu },
    no: { translation: no },
    pt: { translation: pt },
    ro: { translation: ro },
    ru: { translation: ru },
    th: { translation: th },
    uk: { translation: uk },
    el: { translation: el },
    cs: { translation: cs },
    sv: { translation: sv },
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

export default i18n;
