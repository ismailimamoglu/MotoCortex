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

    // Transmission
    P0700: 'Şanzıman Kontrol Sistemi - Arıza',
    P0715: 'Türbin Devir Sensörü - Devre Arızası',
    P0720: 'Çıkış Devir Sensörü - Devre Arızası',
    P0730: 'Yanlış Vites Oranı',

    // Battery & Charging
    P0560: 'Sistem Voltajı - Arıza',
    P0562: 'Sistem Voltajı - Düşük',
    P0563: 'Sistem Voltajı - Yüksek',
};

/**
 * Looks up a DTC code and returns its Turkish description.
 * Returns null if the code is not found in the dictionary.
 */
export function lookupDTC(code: string): string | null {
    const normalized = code.toUpperCase().trim();
    return DTC_DICTIONARY[normalized] || null;
}

export default DTC_DICTIONARY;
