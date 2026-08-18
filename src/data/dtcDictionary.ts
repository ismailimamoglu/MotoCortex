/**
 * Offline DTC (Diagnostic Trouble Code) Dictionary
 * Maps standard OBD-II P-codes to Turkish descriptions.
 */
const DTC_DICTIONARY: Record<string, string> = {
    // Fuel & Air
    P0100: 'Hava Akış Sensörü (MAF) - Devre Arızası',
    P0101: 'Hava Akış Sensörü (MAF) - Aralık/Performans',
    P0102: 'Hava Akış Sensörü (MAF) - Düşük Giriş',
    P0103: 'Hava Akış Sensörü (MAF) - Yüksek Giriş',
    P0110: 'Emme Hava Sıcaklık Sensörü - Devre Arızası',
    P0112: 'Emme Hava Sıcaklık Sensörü - Düşük Voltaj',
    P0113: 'Emme Hava Sıcaklık Sensörü - Yüksek Voltaj',
    P0115: 'Motor Soğutma Suyu Sıcaklık Sensörü - Devre Arızası',
    P0117: 'Motor Soğutma Suyu Sıcaklık Sensörü - Düşük Giriş',
    P0118: 'Motor Soğutma Suyu Sıcaklık Sensörü - Yüksek Giriş',
    P0120: 'Gaz Kelebeği Konum Sensörü - Devre Arızası',
    P0121: 'Gaz Kelebeği Konum Sensörü - Aralık/Performans',
    P0122: 'Gaz Kelebeği Konum Sensörü - Düşük Giriş',
    P0123: 'Gaz Kelebeği Konum Sensörü - Yüksek Giriş',
    P0130: 'O2 Sensörü (Banka 1, Sensör 1) - Devre Arızası',
    P0131: 'O2 Sensörü (B1S1) - Düşük Voltaj',
    P0132: 'O2 Sensörü (B1S1) - Yüksek Voltaj',
    P0133: 'O2 Sensörü (B1S1) - Yavaş Tepki',
    P0134: 'O2 Sensörü (B1S1) - Aktivite Yok',
    P0135: 'O2 Sensörü Isıtıcı (B1S1) - Devre Arızası',
    P0136: 'O2 Sensörü (B1S2) - Devre Arızası',
    P0171: 'Yakıt Sistemi Zayıf (Banka 1)',
    P0172: 'Yakıt Sistemi Zengin (Banka 1)',

    // Ignition & Misfire
    P0300: 'Rastgele/Çoklu Silindir Ateşleme Hatası',
    P0301: '1. Silindir Ateşleme Hatası',
    P0302: '2. Silindir Ateşleme Hatası',
    P0303: '3. Silindir Ateşleme Hatası',
    P0304: '4. Silindir Ateşleme Hatası',
    P0335: 'Krank Mili Konum Sensörü A - Devre Arızası',
    P0336: 'Krank Mili Konum Sensörü A - Aralık/Performans',
    P0340: 'Eksantrik Mili Konum Sensörü A - Devre Arızası',

    // Injector
    P0200: 'Enjektör Devresi Arızası',
    P0201: '1. Silindir Enjektör Devresi Arızası',
    P0202: '2. Silindir Enjektör Devresi Arızası',
    P0203: '3. Silindir Enjektör Devresi Arızası',
    P0204: '4. Silindir Enjektör Devresi Arızası',

    // Speed & Idle
    P0500: 'Araç Hız Sensörü - Arıza',
    P0505: 'Rölanti Kontrol Sistemi - Arıza',
    P0506: 'Rölanti Kontrol Sistemi - Devir Beklenenden Düşük',
    P0507: 'Rölanti Kontrol Sistemi - Devir Beklenenden Yüksek',

    // Emission
    P0420: 'Katalitik Konvertör Sistemi (B1) - Verimlilik Düşük',
    P0421: 'Katalitik Konvertör (B1) - Isınma Verimliliği Düşük',
    P0430: 'Katalitik Konvertör Sistemi (B2) - Verimlilik Düşük',
    P0440: 'Buharlaşma Emisyon Kontrol Sistemi - Arıza',
    P0441: 'Buharlaşma Emisyon Sistemi - Hatalı Temizleme Akışı',
    P0442: 'Buharlaşma Emisyon Sistemi - Küçük Kaçak',
    P0443: 'Buharlaşma Emisyon Sistemi - Temizleme Valfi Arızası',
    P0446: 'Buharlaşma Emisyon Sistemi - Havalandırma Arızası',

    // EGR
    P0401: 'Egzoz Geri Dönüşüm (EGR) - Akış Yetersiz',
    P0402: 'Egzoz Geri Dönüşüm (EGR) - Akış Aşırı',

    // Transmission & DCT (Double Clutch)
    P0700: 'Şanzıman Kontrol Sistemi - Genel Arıza',
    P0715: 'Türbin Devir Sensörü - Devre Arızası',
    P0720: 'Çıkış Devir Sensörü - Devre Arızası',
    P0730: 'Yanlış Vites Oranı - Mekanik Arıza',
    P0740: 'Tork Konvertör Kavrama Solenoidi - Devre Arızası',
    P0841: 'Şanzıman Sıvı Basınç Sensörü A - Aralık/Performans',
    P0900: 'Kavrama Aktüatörü - Açık Devre Arızası',
    P17BF: 'DSG / DCT Mekatronik Hidrolik Basınç Düşüklüğü (Basınç Tüpü Kaçağı)',
    P175D: '1. Kavrama İstenmeden Açıldı - Kavrama Aşınma Sınırı',
    P175E: '2. Kavrama İstenmeden Açıldı - Kavrama Aşınma Sınırı',
    P0741: 'Tork Konvertör Kavraması - Performans / Kapalı Takılı',

    // Chassis & ABS / ESC
    C0035: 'Sol Ön Tekerlek Hız Sensörü - Devre Arızası',
    C0040: 'Sağ Ön Tekerlek Hız Sensörü - Devre Arızası',
    C0045: 'Sol Arka Tekerlek Hız Sensörü - Devre Arızası',
    C0050: 'Sağ Arka Tekerlek Hız Sensörü - Devre Arızası',
    C0110: 'ABS Pompa Motoru - Devre Arızası',
    C0131: 'Fren Basınç Sensörü - Devre Arızası',

    // Body & Airbag (SRS)
    B0001: 'Sürücü Ön Hava Yastığı A - Aşama 1 Kontrol Devresi',
    B0002: 'Sürücü Ön Hava Yastığı A - Aşama 2 Kontrol Devresi',
    B0010: 'Yolcu Ön Hava Yastığı - Kontrol Devresi Arızası',
    B0020: 'Sol Yan Hava Yastığı - Kontrol Devresi Arızası',
    B0028: 'Sağ Yan Hava Yastığı - Kontrol Devresi Arızası',
    B1000: 'Hava Yastığı Kontrol Modülü (SDM) - İç Arıza',

    // Network & CAN Bus
    U0100: 'Motor Kontrol Modülü (ECM) ile İletişim Kaybı',
    U0101: 'Şanzıman Kontrol Modülü (TCM) ile İletişim Kaybı',
    U0121: 'ABS Kontrol Modülü ile İletişim Kaybı',
    U0155: 'Gösterge Paneli Kontrol Modülü (IPC) ile İletişim Kaybı',
    U0401: 'Motor Kontrol Modülünden Alınan Veri Geçersiz',

    // Glow Plug / Diesel Systems
    P0670: 'Kızdırma Bujisi Modülü Kontrol Devresi Arızası',
    P0671: '1. Silindir Kızdırma Bujisi Devre Arızası',
    P0672: '2. Silindir Kızdırma Bujisi Devre Arızası',
    P0673: '3. Silindir Kızdırma Bujisi Devre Arızası',
    P0674: '4. Silindir Kızdırma Bujisi Devre Arızası',
    P0675: '5. Silindir Kızdırma Bujisi Devre Arızası',
    P0676: '6. Silindir Kızdırma Bujisi Devre Arızası',
    P0683: 'Kızdırma Bujisi Kontrol Modülü - ECM İletişim Hatası',
    P2002: 'Dizel Partikül Filtresi (DPF) - Verimlilik Eşik Altında',
    P2463: 'Dizel Partikül Filtresi (DPF) - Kurum Birikimi',
    P2452: 'DPF Basınç Sensörü A - Devre Arızası',

    // Turbo / Supercharger
    P0299: 'Turboşarj / Süperşarj Düşük Basınç (Underboost)',
    P0234: 'Turboşarj / Süperşarj Aşırı Basınç (Overboost)',
    P0236: 'Turbo Basınç Sensörü A - Aralık/Performans',
    P0237: 'Turbo Basınç Sensörü A - Düşük Giriş',
    P0238: 'Turbo Basınç Sensörü A - Yüksek Giriş',
};

import i18n from '../i18n';
import { lookupDtcSync, prefetchDtcChunks, prefetchDtcChunksForCodes } from './dtcStorage';
import { SemanticDtcDictionary } from '../utils/DtcDictionary';
import { lookupOemDtc } from '../services/dtcIntelligenceService';

/**
 * Cleans unwanted web-scraping artifacts from raw DTC descriptions.
 */
export function cleanDtcDescription(desc: string | null | undefined): string | null {
    if (!desc) return null;
    return desc
        .replace(/More details\.\.\./gi, '')
        .replace(/Read more\.\.\./gi, '')
        .replace(/\[\d+\]/g, '')
        .replace(/\(See P\d+\)/gi, '')
        .replace(/\s{2,}/g, ' ')
        .trim();
}

/**
 * Universal term and failure mode mapper to translate English DTC descriptions into active locale.
 */
const TERM_TRANSLATIONS: Record<string, Record<string, string>> = {
    tr: {
        'Glow Plug Module Control Circuit': 'Kızdırma Bujisi Modülü Kontrol Devresi',
        'Glow Plug Circuit': 'Kızdırma Bujisi Devresi',
        'Glow Plug': 'Kızdırma Bujisi',
        'Control Circuit': 'Kontrol Devresi',
        'Open Circuit': 'Açık Devre',
        'Short to Ground': 'Şaseye Kısa Devre',
        'Short to Voltage': 'Artıya Kısa Devre',
        'Range/Performance': 'Aralık/Performans',
        'Circuit Low': 'Devre Düşük Sinyal',
        'Circuit High': 'Devre Yüksek Sinyal',
        'Circuit Malfunction': 'Devre Arızası',
        'Mass or Volume Air Flow': 'Hava Akış Sensörü (MAF)',
        'Manifold Absolute Pressure': 'Manifold Mutlak Basınç Sensörü (MAP)',
        'Engine Coolant Temperature': 'Motor Soğutma Suyu Sıcaklığı',
        'Intake Air Temperature': 'Emme Havası Sıcaklığı',
        'Throttle Position': 'Gaz Kelebeği Konumu',
        'Camshaft Position': 'Eksantrik Mili Konumu',
        'Crankshaft Position': 'Krank Mili Konumu',
        'Oxygen Sensor': 'Oksijen Sensörü',
        'Catalyst System Efficiency Below Threshold': 'Katalitik Konvertör Verimliliği Düşük',
        'Fuel Rail Pressure': 'Yakıt Hattı Basıncı',
        'Cylinder Misfire Detected': 'Silindir Ateşleme Hatası Algılandı',
        'Random/Multiple Cylinder Misfire': 'Rastgele/Çoklu Silindir Ateşleme Hatası',
        'Transmission Control System': 'Şanzıman Kontrol Sistemi',
        'Lost Communication With': 'İletişim Kaybı:',
        'Invalid Data Received From': 'Geçersiz Veri Alındı:',
    },
    de: {
        'Glow Plug Module Control Circuit': 'Steuerstromkreis Glühzeitsteuergerät',
        'Control Circuit': 'Steuerkreis',
        'Circuit Low': 'Stromkreis zu niedrig',
        'Circuit High': 'Stromkreis zu hoch',
        'Range/Performance': 'Bereich/Leistung',
        'Mass or Volume Air Flow': 'Luftmassenmesser',
        'Oxygen Sensor': 'Lambdasonde',
    },
    fr: {
        'Glow Plug Module Control Circuit': 'Circuit de commande du module de bougies de préchauffage',
        'Control Circuit': 'Circuit de commande',
        'Circuit Low': 'Circuit bas',
        'Circuit High': 'Circuit haut',
        'Range/Performance': 'Plage/Performance',
        'Mass or Volume Air Flow': 'Débitmètre d\'air',
        'Oxygen Sensor': 'Sonde Lambda',
    },
    es: {
        'Glow Plug Module Control Circuit': 'Circuito de control del módulo de bujías de incandescencia',
        'Control Circuit': 'Circuito de control',
        'Circuit Low': 'Circuito bajo',
        'Circuit High': 'Circuito alto',
        'Range/Performance': 'Rango/Rendimiento',
        'Mass or Volume Air Flow': 'Sensor de flujo de masa de aire (MAF)',
        'Oxygen Sensor': 'Sensor de oxígeno (O2)',
    }
};

/**
 * Localizes a DTC description string into the active language using vocabulary pattern replacement.
 */
export function localizeDtcText(rawText: string, lang: string): string {
    const clean = cleanDtcDescription(rawText) || '';
    if (!clean) return '';

    const langCode = lang.split('-')[0].toLowerCase();
    const dictionary = TERM_TRANSLATIONS[langCode];
    if (!dictionary) return clean;

    let localized = clean;
    for (const [enTerm, localTerm] of Object.entries(dictionary)) {
        const regex = new RegExp(enTerm, 'gi');
        localized = localized.replace(regex, localTerm);
    }
    return localized;
}

/**
 * Looks up a DTC code synchronously and returns its localized description.
 * Returns null if the code is not found.
 */
export function lookupDTC(code: string, brand?: string): string | null {
    const normalized = code.toUpperCase().trim();
    const currentLang = (i18n.language || 'en').toLowerCase();

    // 1. OEM Specific Lookup
    const oemDesc = lookupOemDtc(normalized, brand);
    if (oemDesc) {
        return cleanDtcDescription(oemDesc);
    }

    // 2. Check i18n translation key first (26 Locales)
    const i18nKey = `dtc.${normalized}`;
    if (i18n.isInitialized && i18n.exists(i18nKey)) {
        return cleanDtcDescription(i18n.t(i18nKey));
    }

    // 3. Turkish Semantic & Local Dictionary (Only when active language is Turkish)
    if (currentLang.startsWith('tr')) {
        const semanticDesc = SemanticDtcDictionary[normalized];
        if (semanticDesc) {
            return cleanDtcDescription(semanticDesc);
        }
        const localDesc = DTC_DICTIONARY[normalized];
        if (localDesc) {
            return cleanDtcDescription(localDesc);
        }
    }
    
    // 4. Synchronous chunk lookup (26 Locales)
    const chunkDesc = lookupDtcSync(normalized);
    if (chunkDesc) {
        return localizeDtcText(chunkDesc, currentLang);
    }

    // 5. General fallback
    const fallbackDesc = currentLang.startsWith('tr') 
        ? (SemanticDtcDictionary[normalized] || DTC_DICTIONARY[normalized] || null) 
        : null;
    return cleanDtcDescription(fallbackDesc);
}

export { prefetchDtcChunks, prefetchDtcChunksForCodes };
export default DTC_DICTIONARY;
