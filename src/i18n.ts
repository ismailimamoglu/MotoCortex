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

i18n
    .use(initReactI18next)
    .init({
        resources,
        lng: 'en', // Uygulamanın ana dili İngilizce (açılışta ingilizce)
        fallbackLng: 'en',
        fallbackNS: 'translation',
        returnEmptyString: false, // Boş çeviri girildiğinde İngilizce fallback'in çalışmasını sağlar
        compatibilityJSON: 'v4',
        interpolation: {
            escapeValue: false,
        },
        react: {
            useSuspense: false,
        },
    });

export default i18n;
