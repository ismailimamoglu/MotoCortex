MotoCortex ECU & Arıza Kodu (DTC) Kapsam Raporu
MotoCortex, araçtaki 5 ana elektronik kontrol ünitesi (ECU Topolojisi) üzerinden arıza kodlarını (DTC) okuyabilmekte, canlı verileri işleyebilmekte ve 26 dilde çevrimdışı (offline) sözlük kütüphanesi (src/data/chunks/) ile anında tanımlayabilmektedir.

1. 🚘 Tespit Edilebilen Elektronik Kontrol Üniteleri (ECU Modülleri)
Modül Kodu	Modül Adı	Açıklama
ECM / ECU	Motor Kontrol Ünitesi	Enjeksiyon, ateşleme, emisyon, gaz kelebeği, sensörler ve motor yönetimi.
TCM / TCU / DCT	Şanzıman Kontrol Ünitesi	Otomatik vites, mekatronik, tork konvertörü, çift kavrama (DSG/DCT) ve vites solenoidleri.
ABS / ESP / ESC	Fren & Şasi Güvenlik Ünitesi	Tekerlek hız sensörleri, ABS pompası, fren hidrolik basıncı ve denge kontrolü.
SRS / Airbag	Hava Yastığı Güvenlik Ünitesi	Sürücü/yolcu ön/yan hava yastıkları, darbe sensörleri ve emniyet kemeri ön gerdiricileri.
BCM	Gövde Kontrol Ünitesi	Merkezi kilit, aydınlatma, imalat elektroniği, gösterge paneli ve iç donanım.
2. 📋 Kategorilerine Göre Tespit Edilen Arıza Kodları (DTC Listesi)
🔴 A. Motor ve Yakıt Sistemi Arıza Kodları (P0100 - P0599)
P0100 - P0103: Hava Akış Sensörü (MAF) Devresi / Düşük - Yüksek Giriş
P0110 - P0113: Emme Havası Sıcaklık Sensörü 1 (IAT) Devresi / Düşük - Yüksek Giriş
P0115 - P0118: Motor Soğutma Suyu Sıcaklık Sensörü (ECT) Devresi
P0120 - P0123: Gaz Kelebeği / Pedal Konum Sensörü (TPS) Devresi
P0130 - P0136: O2 (Oksijen/Lamda) Sensörü (Banka 1, Sensör 1 & 2) Isıtıcı ve Voltaj Arızaları
P0171 / P0172: Yakıt Karışımı Çok Fakir / Çok Zengin (Banka 1)
P0200 - P0204: Enjektör 1-4 Devre Arızaları
P0300: Rastgele / Çoklu Silindir Ateşleme Hatası (Misfire)
P0301 - P0304: 1, 2, 3 ve 4. Silindir Ateşleme Hataları
P0335 - P0336: Krank Mili Konum Sensörü (CKP) Devresi / Performansı
P0340: Eksantrik Mili Konum Sensörü (CMP) Devresi
P0401 - P0402: Egzoz Geri Dönüşüm (EGR) Akış Yetersiz / Aşırı
P0420 / P0430: Katalitik Konvertör Sistemi Verimliliği Eşik Altında (Banka 1 & 2)
P0440 - P0446: Buharlaşma Emisyon Sistemi (EVAP) / Temizleme Valfi / Kaçak
P0500: Araç Hız Sensörü (VSS) Arızası
P0505 - P0507: Rölanti Hava Kontrol Sistemi (IAC) Devir Düşük / Yüksek
P0560 / P0562 / P0563: Sistem Voltajı Arızası / Voltaj Düşük / Voltaj Yüksek
⚙️ B. Şanzıman ve Çift Kavrama (DSG/DCT) Kodları (P0700 - P0999 & P17xx)
P0700: Şanzıman Kontrol Sistemi Arızası (MIL İstek Sinyali)
P0715: Türbin / Giriş Hız Sensörü Devre Arızası
P0720: Çıkış Hız Sensörü Devre Arızası
P0730: Yanlış Vites Oranı (Mekanik Şanzıman Aşınması)
P0740 / P0741: Tork Konvertör Kavrama Solenoidi / Kapalı Takılı
P0750: Vites Değişim Solenoidi A Arızası
P0814: Vites Pozisyon Gösterge Devresi Arızası
P0841: Şanzıman Hidrolik Basınç Sensörü A Aralık/Performans
P0900: Kavrama Aktüatörü Açık Devre Arızası
P17BF: DSG / DCT Mekatronik Hidrolik Basınç Düşüklüğü (Basınç Tüpü Kaçağı)
P175D / P175E: 1. / 2. Kavrama İstenmeden Açıldı (Kavrama Balata Aşınma Sınırı)
🛑 C. Fren & ABS / ESP Şasi Kodları (C0000 - C0999)
C0035: Sol Ön Tekerlek Hız Sensörü Devre Arızası
C0040: Sağ Ön Tekerlek Hız Sensörü Devre Arızası
C0045: Sol Arka Tekerlek Hız Sensörü Devre Arızası
C0050: Sağ Arka Tekerlek Hız Sensörü Devre Arızası
C0110: ABS Pompa Motoru Devre Arızası
C0121 / C0131: Fren Hidrolik Basınç Sensörü Devre Arızası
🎈 D. Gövde & Hava Yastığı (SRS) Kodları (B0000 - B2999)
B0001 / B0002: Sürücü Ön Hava Yastığı Kontrol Devresi (Aşama 1 & 2)
B0010: Yolcu Ön Hava Yastığı Kontrol Devresi
B0020: Sol Yan Hava Yastığı Kontrol Devresi
B0028: Sağ Yan Hava Yastığı Kontrol Devresi
B1000: Gövde Kontrol Modülü (BCM / SDM) Donanım Arızası
B1001: Emniyet Kemeri Ön Gerdirici Kontrol Devresi
B1325: Cihaz Güç Voltaj Devresi Düşük
🌐 E. İletişim & CAN Bus Ağ Kodları (U0000 - U0499)
U0100: Motor Kontrol Modülü (ECM/PCM) ile İletişim Kaybı
U0101: Şanzıman Kontrol Modülü (TCM) ile İletişim Kaybı
U0121: ABS Kontrol Modülü ile İletişim Kaybı
U0140: Gövde Kontrol Modülü (BCM) ile İletişim Kaybı
U0155: Gösterge Paneli Kontrol Modülü (IPC) ile İletişim Kaybı
U0401: Motor Kontrol Modülünden Alınan Veri Geçersiz / Hatalı
3. 📂 Çevrimdışı (Offline) Veritabanı Dosya Yapısı
Uygulamanın src/data/chunks/ klasöründe yer alan 24 adet çevrimdışı veritabanı dosyası sayesinde internet bağlantısı olmasa bile binlerce arıza kodu anında çözümlenmektedir:

src/data/chunks/
├── B.json      (Gövde & SRS/Airbag Arızaları)
├── C.json      (ABS/ESP & Şasi Arızaları)
├── U.json      (CAN Bus & İletişim Arızaları)
├── P00.json - P21.json  (Motor, Şanzıman, Ateşleme, Enjeksiyon, Emisyon)
💡 Global Lansman İçin Tavsiye Edilen Adımlar
Yeni arıza kodu eklendiğinde src/locales/en.json ve tr.json dosyalarındaki "dtc" bölümüne ekleyip npm run i18n:sync komutunu çalıştırmanız yeterlidir.
Tüm 26 dil otomatik olarak güncellenir ve kullanıcılar ister Türkçe, ister İngilizce veya diğer 24 dilde eksiksiz arıza açıklaması görür.