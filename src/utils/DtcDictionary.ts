/**
 * Semantic Diagnostic Trouble Codes (DTC) Dictionary
 * Provides direct human-readable Turkish descriptions for the most common faults.
 */
export const SemanticDtcDictionary: Record<string, string> = {
    'P0171': 'Sistem Çok Fakir - Oksijen sensörü veya manifoldu kontrol edin',
    'P0172': 'Sistem Çok Zengin - Yakıt enjeksiyonunu veya hava filtresini kontrol edin',
    'P0300': 'Rastgele/Çoklu Silindir Ateşleme Hatası - Buji veya bobinleri kontrol edin',
    'P0301': '1. Silindir Ateşleme Hatası - 1. buji, bobin veya enjektörü kontrol edin',
    'P0302': '2. Silindir Ateşleme Hatası - 2. buji, bobin veya enjektörü kontrol edin',
    'P0303': '3. Silindir Ateşleme Hatası - 3. buji, bobin veya enjektörü kontrol edin',
    'P0304': '4. Silindir Ateşleme Hatası - 4. buji, bobin veya enjektörü kontrol edin',
    'P0420': 'Katalitik Konvertör Verimliliği Düşük - Egzoz sistemini kontrol edin',
    'P0430': 'Katalitik Konvertör Verimliliği Düşük (Banka 2) - Egzoz sistemini kontrol edin',
    'P0101': 'Hava Akış Sensörü (MAF) Performans Sorunu - Sensörü temizleyin',
    'P0102': 'Hava Akış Sensörü (MAF) Düşük Giriş - Sensör bağlantısını kontrol edin',
    'P0113': 'Emme Hava Sıcaklık Sensörü Yüksek Voltaj - Sensör veya kablolamayı kontrol edin',
    'P0133': 'Oksijen Sensörü Yavaş Tepki Veriyor - Sensör ömrünü tamamlamış olabilir',
    'P0135': 'Oksijen Sensörü Isıtıcı Devre Arızası - Oksijen sensörünü kontrol edin',
    'P0442': 'Buharlaşma Emisyon Sistemi (EVAP) Küçük Kaçak - Yakıt kapağını kontrol edin',
    'P0455': 'Buharlaşma Emisyon Sistemi (EVAP) Büyük Kaçak - Yakıt kapağını sıkılaştırın',
    'P0500': 'Araç Hız Sensörü Arızası - Hız sensörü veya kablolamasını kontrol edin',
    'P0700': 'Şanzıman Kontrol Sistemi Arızası - Şanzıman beyni (TCM) hata kodlarını okuyun',
    'P0115': 'Motor Soğutma Suyu Sıcaklık Sensörü Arızası - Sensörü veya termostatı kontrol edin',
    'P2181': 'Soğutma Sistemi Performans Sorunu - Termostat açık kalmış olabilir',
};

export default SemanticDtcDictionary;
