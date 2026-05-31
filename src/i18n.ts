import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import tr from './locales/tr.json';
import en from './locales/en.json';
import id from './locales/id.json';
import de from './locales/de.json';
import es from './locales/es.json';
import it from './locales/it.json';

const resources = {
    tr: { translation: tr },
    en: { translation: en },
    id: { translation: id },
    de: { translation: de },
    es: { translation: es },
    it: { translation: it },
};

i18n
    .use(initReactI18next)
    .init({
        resources,
        lng: 'en', // Uygulamanın ana dili İngilizce (açılışta ingilizce)
        fallbackLng: 'en',
        compatibilityJSON: 'v4',
        interpolation: {
            escapeValue: false,
        },
        react: {
            useSuspense: false,
        },
    });

export default i18n;
