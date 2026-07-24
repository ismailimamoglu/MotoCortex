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

    // Battery & Charging
    P0560: 'Sistem Voltajı - Arıza',
    P0562: 'Sistem Voltajı - Düşük',
    P0563: 'Sistem Voltajı - Yüksek',
};

import i18n from '../i18n';
import { lookupDtcSync, prefetchDtcChunks, prefetchDtcChunksForCodes } from './dtcStorage';
import { SemanticDtcDictionary } from '../utils/DtcDictionary';

/**
 * Looks up a DTC code synchronously and returns its localized description.
 * Returns null if the code is not found.
 */
export function lookupDTC(code: string): string | null {
    const normalized = code.toUpperCase().trim();
    
    // 1. Semantic map (Highest priority)
    const semanticDesc = SemanticDtcDictionary[normalized];
    if (semanticDesc) {
        return semanticDesc;
    }

    const i18nKey = `dtc.${normalized}`;
    
    if (i18n.isInitialized && i18n.exists(i18nKey)) {
        return i18n.t(i18nKey);
    }
    
    const currentLang = i18n.language || 'en';
    if (currentLang.startsWith('tr')) {
        const localDesc = DTC_DICTIONARY[normalized];
        if (localDesc) {
            return localDesc;
        }
    }
    
    return lookupDtcSync(normalized);
}

export { prefetchDtcChunks, prefetchDtcChunksForCodes };
export default DTC_DICTIONARY;
