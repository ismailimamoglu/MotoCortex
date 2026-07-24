const fs = require('fs');
const path = require('path');

const localesDir = path.join(__dirname, '../src/locales');

const nativeBento = {
  hpGauge: {
    en: 'HORSEPOWER / HP',
    tr: 'BEYGİR / HP',
    ja: '馬力 / HP',
    de: 'LEISTUNG / PS',
    fr: 'PUISSANCE / CH',
    es: 'POTENCIA / CV',
    it: 'POTENZA / CV',
    zh: '马力 / HP',
    ru: 'МОЩНОСТЬ / Л.С.',
    ar: 'القوة / حصان',
    pt: 'POTÊNCIA / CV',
    ko: '마력 / HP',
    nl: 'VERMOGEN / PK',
    sv: 'HÄSTKRAFTER / HK',
    da: 'HESTEKRÆFTER / HK',
    fi: 'HEVOSVOIMA / HV',
    no: 'HESTEKREFTER / HK',
    pl: 'MOC / KM',
    cs: 'VÝKON / K',
    hu: 'LÓERŐ / LE',
    ro: 'PUTERE / CP',
    th: 'แรงม้า / HP',
    uk: 'ПОТУЖНІСТЬ / к.с.',
    id: 'TENAGA / HP',
    el: 'ΙΠΠΟΔΥΝΑΜΗ / HP',
    hi: 'अश्वशक्ति / HP'
  },
  fuelTrim: {
    en: 'FUEL TRIM',
    tr: 'YAKIT TRİMİ',
    ja: '燃料トリム',
    de: 'KRAFTSTOFFTRIMM',
    fr: 'AJUSTEMENT CARBURANT',
    es: 'AJUSTE COMBUSTIBLE',
    it: 'CORREZIONE CARBURANTE',
    zh: '燃油微调',
    ru: 'ТОПЛИВНАЯ КОРРЕКЦИЯ',
    ar: 'ضبط الوقود',
    pt: 'AJUSTE DE COMBUSTÍVEL',
    ko: '연료 트림',
    nl: 'BRANDSTOFTRIM',
    sv: 'BRÄNSLETRIM',
    da: 'BRÆNDSTOFTRIM',
    fi: 'POLTTOAINETRIMIT',
    no: 'DRIVSTOFFTRIM',
    pl: 'KOREKTA PALIWA',
    cs: 'KOREKCE PALIVA',
    hu: 'ÜZEMANYAG KORREKCIÓ',
    ro: 'KORECȚIE COMBUSTIBIL',
    th: 'การปรับเชื้อเพลิง',
    uk: 'ПАЛИВНА КОРЕКЦІЯ',
    id: 'PENYESUAIAN BAHAN BAKAR',
    el: 'ΡΥΘΜΙΣΗ ΚΑΥΣΙΜΟΥ',
    hi: 'ईंधन ट्रिम'
  },
  dpfFilter: {
    en: 'DPF FILTER',
    tr: 'DPF FİLTRE',
    ja: 'DPFフィルター',
    de: 'DPF-FILTER',
    fr: 'FILTRE DPF',
    es: 'FILTRO DPF',
    it: 'FILTRO DPF',
    zh: 'DPF微粒过滤器',
    ru: 'ФИЛЬТР DPF',
    ar: 'فلتر DPF',
    pt: 'FILTRO DPF',
    ko: 'DPF 필터',
    nl: 'DPF-FILTER',
    sv: 'DPF-FILTER',
    da: 'DPF-FILTER',
    fi: 'DPF-SUODATIN',
    no: 'DPF-FILTER',
    pl: 'FILTR DPF',
    cs: 'FILTR DPF',
    hu: 'DPF SZŰRŐ',
    ro: 'FILTRU DPF',
    th: 'กรอง DPF',
    uk: 'ФІЛЬТР DPF',
    id: 'FILTER DPF',
    el: 'ΦΙΛΤΡΟ DPF',
    hi: 'DPF फ़िल्टर'
  },
  multiEcu: {
    en: 'MULTI-ECU',
    tr: 'MULTI-ECU',
    ja: 'マルチECU',
    de: 'MULTI-ECU',
    fr: 'MULTI-ECU',
    es: 'MULTI-ECU',
    it: 'MULTI-ECU',
    zh: '多ECU扫描',
    ru: 'МУЛЬТИ-ECU',
    ar: 'وحدات متعددة ECU',
    pt: 'MULTI-ECU',
    ko: '멀티 ECU',
    nl: 'MULTI-ECU',
    sv: 'MULTI-ECU',
    da: 'MULTI-ECU',
    fi: 'MULTI-ECU',
    no: 'MULTI-ECU',
    pl: 'MULTI-ECU',
    cs: 'MULTI-ECU',
    hu: 'MULTI-ECU',
    ro: 'MULTI-ECU',
    th: 'มัลติ-ECU',
    uk: 'МУЛЬТИ-ECU',
    id: 'MULTI-ECU',
    el: 'MULTI-ECU',
    hi: 'मल्टी-ECU'
  },
  dctAdapt: {
    en: 'DCT ADAPT',
    tr: 'DCT ADAPT',
    ja: 'DCT適応',
    de: 'DCT-ANPASSUNG',
    fr: 'ADAPTATION DCT',
    es: 'ADAPTACIÓN DCT',
    it: 'ADATTAMENTO DCT',
    zh: 'DCT自适应',
    ru: 'АДАПТАЦИЯ DCT',
    ar: 'تكيف DCT',
    pt: 'ADAPTAÇÃO DCT',
    ko: 'DCT 어댑트',
    nl: 'DCT-AANPASSING',
    sv: 'DCT-ANPASSNING',
    da: 'DCT-TILPASNING',
    fi: 'DCT-SOPUTUS',
    no: 'DCT-TILPASNING',
    pl: 'ADAPTACJA DCT',
    cs: 'ADAPTACE DCT',
    hu: 'DCT ADAPTÁCIÓ',
    ro: 'ADAPTARE DCT',
    th: 'ปรับแต่ง DCT',
    uk: 'АДАПТАЦІЯ DCT',
    id: 'ADAPTASI DCT',
    el: 'ΠΡΟΣΑΡΜΟΓΗ DCT',
    hi: 'DCT अनुकूलन'
  },
  safeDisconnect: {
    en: 'SAFE DISCONNECT',
    tr: 'GÜVENLİ ÇIKIŞ',
    ja: '安全切断',
    de: 'SICHERES TRENNEN',
    fr: 'DÉCONNEXION SÉCURISÉE',
    es: 'DESCONEXIÓN SEGURA',
    it: 'DISCONNESSIONE SICURA',
    zh: '安全断开',
    ru: 'БЕЗОПАСНОЕ ОТКЛЮЧЕНИЕ',
    ar: 'فصل آمن',
    pt: 'DESCONEXÃO SEGURA',
    ko: '안전 해제',
    nl: 'VEILIG VERBINDING VERBREKEN',
    sv: 'SÄKER FRÅNKOPPLING',
    da: 'SIKKER AFBRYDELSE',
    fi: 'TURVALLINEN KATKAISU',
    no: 'SIKKER FRAKOPLING',
    pl: 'BEZPIECZNE ROZŁĄCZENIE',
    cs: 'BEZPEČNÉ ODPOJENÍ',
    hu: 'BONS BIZTONSÁGOSAN',
    ro: 'DECONECTARE SIGURĂ',
    th: 'ตัดการเชื่อมต่ออย่างปลอดภัย',
    uk: 'БЕЗОПАСНОЕ ОТСОЕДИНЕНИЕ',
    id: 'PUTUSKAN AMAN',
    el: 'ΑΣΦΑΛΗΣ ΑΠΟΣΥΝΔΕΣΗ',
    hi: 'सुरक्षित डिस्कनेक्ट'
  }
};

const files = fs.readdirSync(localesDir).filter(f => f.endsWith('.json'));

files.forEach(file => {
  const lang = file.replace('.json', '');
  const filePath = path.join(localesDir, file);
  let data = JSON.parse(fs.readFileSync(filePath, 'utf8'));

  if (data.bento) {
    // If keys were misplaced inside data.bento.settings, remove them from data.bento.settings
    if (data.bento.settings) {
      delete data.bento.settings.hpGauge;
      delete data.bento.settings.fuelTrim;
      delete data.bento.settings.dpfFilter;
      delete data.bento.settings.multiEcu;
      delete data.bento.settings.dctAdapt;
      delete data.bento.settings.safeDisconnect;
      delete data.bento.settings.featureCoding;
      delete data.bento.settings.featureCodingSub;
    }

    // Set keys directly under data.bento
    for (const key in nativeBento) {
      if (nativeBento[key][lang]) {
        data.bento[key] = nativeBento[key][lang];
      } else {
        data.bento[key] = nativeBento[key]['en'];
      }
    }
  }

  fs.writeFileSync(filePath, JSON.stringify(data, null, 4), 'utf8');
});

console.log(`Successfully fixed bento key placement and native translations for all 26 locales!`);
