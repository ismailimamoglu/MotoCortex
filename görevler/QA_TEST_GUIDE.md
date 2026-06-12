# MotoCortex QA Test Kılavuzu (Senior QA & Tester Ekibi İçin)

Bu kılavuz, MotoCortex OBD2 teşhis ve canlı izleme uygulamasının QA (Kalite Güvence) ekibi tarafından uçtan uca test edilmesi için hazırlanmıştır. Kılavuz; temel özellikleri, test senaryolarını, kabul kriterlerini ve test sırasında kullanılabilecek özel komutları içerir.

---

## 1. Uygulama Mimarisi ve Temel Bileşenler
MotoCortex, motosikletler ve otomobiller için geliştirilmiş premium bir OBD2 teşhis yazılımıdır. 
- **Frontend**: React Native (Expo)
- **Haberleşme**: Bluetooth Low Energy (BLE), Bluetooth Classic (Android) ve Wi-Fi adaptörleri
- **Ödeme Altyapısı**: RevenueCat SDK (PRO / FREE Üyelik Kontrolleri)
- **Tasarım Sistemi**: Koyu tema ağırlıklı, HSL tabanlı premium karanlık tasarım, yüksek dokunma hassasiyeti (Haptic & Visual Feedback)

---

## 2. Test Edilecek Ana Modüller ve Test Senaryoları

### Modül A: Bağlantı ve Cihaz Arama (LiveEngineHero)
*   **Amaç**: Telefonun OBD2 adaptörleriyle hatasız eşleşmesini ve bağlanmasını test etmek.
*   **Test Senaryoları**:
    1.  **Bluetooth İzinleri Kontrolü**: Uygulama ilk açıldığında Bluetooth izinlerinin istenmesi ve reddedilmesi/onaylanması durumlarının test edilmesi.
    2.  **Cihaz Tarama (Scan)**: `CİHAZ TARA` butonuna basıldığında çevredeki BLE (iOS/Android) ve Classic (Android) cihazların listelenmesi.
    3.  **Hızlı Bağlantı (Last Device Connection)**: Daha önce bağlanılan son cihazın hafızada tutulması ve otomatik bağlanma denemesi.
    4.  **Simülasyon Modu (Demo Modu)**: Fiziksel adaptör olmadan, sahte veri akışıyla uygulamanın tüm özelliklerinin test edilebilmesi.
    5.  **Güvenli Mod (Safe Mode)**: Klon/düşük kaliteli OBD adaptörü bağlandığında "Güvenli Mod" uyarısının çıkması ve sorgu hızının otomatik limitlenmesi.

### Modül B: Canlı Gösterge Paneli (Dashboard / Live Sensors)
*   **Amaç**: ECU'dan gelen canlı sensör verilerinin doğruluğu, arayüz tepkisini test etmek.
*   **Test Senaryoları**:
    1.  **Layout Değişiklikleri**: Grid (Izgara), Liste ve Gösterge (Gauge) modları arasında geçiş yapıldığında grafiklerin doğru çizilmesi.
    2.  **Göstergeleri Düzenle (Customize)**: Gösterge düzenleme menüsünden sensör ekleme/çıkarma işlemlerinin canlı ekrana anında yansıması.
    3.  **Akü Voltaj Koruması (Battery Monitor)**: Akü voltajı `12.2V` altına düştüğünde sarı (uyarı), `11.8V` altına düştüğünde kırmızı (kritik hata) akü uyarı kartlarının gösterge panelinin üstünde belirmesi.
    4.  **Düşük Gecikme & Akıcılık**: 4 Hz (Yüksek sorgu) modunda verilerin donmadan akması.

### Modül C: OBD Sağlık İstatistikleri ve Özel ECU Terminali (OBD Health & Terminal)
*   **Amaç**: Yeni eklenen özel terminal ve alt sayfa yapısının test edilmesi.
*   **Test Senaryoları**:
    1.  **OBD Sağlık Bilgileri**: Gönderilen İstekler (TX), Alınan Yanıtlar (RX), Zaman Aşımı (Timeout), Kurtarma Denemeleri ve Ortalama Gecikme Süresinin canlı olarak sayılması.
    2.  **Özel Kod Gönderimi (Custom ECU Command)**:
        - Giriş alanına geçerli bir OBD komutu (Örn: `010C`) yazılıp "GÖNDER"e basıldığında yüklenme animasyonunun gösterilmesi ve ECU yanıtının doğru formatta ekrana basılması.
        - Boş komut veya geçersiz karakter kontrolü.
        - Bağlantı yokken komut gönderilmeye çalışıldığında hata uyarısı gösterilmesi.
    3.  **Teşhis Günlüğü (Diagnostic Log)**:
        - OBD trafiğinin canlı olarak terminal ekranında akması.
        - Logların otomatik olarak en aşağıya kayması (Auto-scroll).
        - Renk kodlaması: Gönderilenler (TX) turkuaz, hatalar (ERR/FAIL) kırmızı, standart satırlar beyaz.
    4.  **Log Paylaşımı (Share Logs)**:
        - "PAYLAŞ" butonuna tıklandığında cihazın yerel paylaşım menüsünün açılması.
        - Günlük boşken tıklandığında "Paylaşılacak teşhis kaydı bulunmamaktadır" uyarısının çıkması.

### Modül D: Ekspertiz ve Arıza Teşhis (Diagnostics / DTC)
*   **Amaç**: Arıza kodlarını okuma, silme ve araç geçmişi oluşturma fonksiyonlarını test etmek.
*   **Test Senaryoları**:
    1.  **Arıza Kodlarını Oku**: ECU'dan kayıtlı hata kodlarının (DTC) çekilmesi ve Türkçe açıklamalarıyla listelenmesi.
    2.  **Arıza Kodlarını Sil (DTC Clear)**: Motor arıza lambasını söndürme komutunun gönderilmesi ve listenin güncellenmesi.
    3.  **Şasi No (VIN) Sorgulama**: Aracın şasi numarasının ECU'dan otomatik okunması, başarısız olunursa manuel girişe izin verilmesi.
    4.  **Ekspertiz Kaydı Oluşturma (Garage History)**: Test edilen aracın bilgilerini (Marka, model, orijinal KM, VIN ve hata durumu) garaj geçmişine kaydetme ve kayıt silme işlemleri.

### Modül E: Dil Senkronizasyonu (26 Dil Desteği)
*   **Amaç**: Tüm metinlerin dil değişimine anlık ve hatasız tepki vermesini test etmek.
*   **Test Senaryoları**:
    1.  **Anlık Dil Değişimi**: Hızlı Ayarlar > Dil menüsünden dil değiştirildiğinde (Örn: Türkçe'den İngilizceye) tüm gösterge, terminal, buton ve geri dönüş etiketlerinin anında tercüme edilmesi.
    2.  **Fallback Mekanizması**: Seçilen dilde çevirisi bulunmayan bir kelime olduğunda uygulamanın çökmek yerine İngilizce metni göstermesi.

---

## 3. QA Ekibinin Terminal Testlerinde Kullanabileceği OBD-II / AT Komutları

Uygulamanın **OBD Terminali** modülünü test ederken aşağıdaki standart komutları göndererek ECU tepkilerini doğrulayabilirsiniz:

| Komut | Açıklama | Beklenen Yanıt Tipi |
| :--- | :--- | :--- |
| `ATRV` | Adaptörün ölçtüğü akü voltajı | `12.4V` vb. |
| `ATI` | Adaptörün donanım/üretici kimliği | `ELM327 v2.1` vb. |
| `ATSP0` | Protokolü otomatik olarak ayarla | `OK` |
| `0100` | Desteklenen PID listesi (01-20) | Hexadecimal dizi (Örn: `41 00 BE 3E B8 11`) |
| `010C` | Motor Devri (RPM) | Hex veri (Hesaplama: `((A*256)+B)/4`) |
| `010D` | Araç Hızı (Speed) | Hex veri (Hesaplama: `A` km/h) |
| `0902` | Şasi Numarası (VIN) okuma | ASCII şasi kodu |
