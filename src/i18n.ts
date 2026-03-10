import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';
import AsyncStorage from '@react-native-async-storage/async-storage';

import tr from './locales/tr.json';
import en from './locales/en.json';
import id from './locales/id.json';

const resources = {
    tr: { translation: tr },
    en: { translation: en },
    id: { translation: id },
};

const LANGUAGE_KEY = 'user-language';

const initI18n = async () => {
    let savedLanguage: string | null = null;
    try {
        savedLanguage = await AsyncStorage.getItem(LANGUAGE_KEY);
    } catch (e) {
        console.warn('Failed to load language preference:', e);
    }

    if (!savedLanguage) {
        const deviceLanguage = Localization.getLocales()[0].languageCode;
        savedLanguage = ['tr', 'en', 'id'].includes(deviceLanguage || '') ? deviceLanguage : 'en';
    }

    i18n
        .use(initReactI18next)
        .init({
            resources,
            lng: savedLanguage || 'en',
            fallbackLng: 'en',
            interpolation: {
                escapeValue: false,
            },
            react: {
                useSuspense: false,
            },
        });
};

initI18n();

export default i18n;
