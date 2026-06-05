# MotoCortex - Geliştirme Notları & Yol Haritası (27 Mayıs 2026)

Bu belge, bugünkü oturumda gerçekleştirdiğimiz araç veri tabanı genişletmesi, dil eşitlemesi revizyonları, GDPR/KVKK uyumlu anonim telemetri geliştirmeleri ve destek landing sayfası çalışmalarını özetlemektedir. Yarın kalındığı yerden devam etmek için kullanılacaktır.

---

## 1. Yapılan Geliştirmeler

### A. Araç Veri Tabanı & Dil Eşitlemesi
1. **Model Yılı (1980'lere Uzatıldı):** Model yılı seçim aralığı `1980` yılına kadar uzatıldı (2026'dan 1980'e kadar olan tüm yıllar desteklenmektedir).
2. **Genişletilmiş Araç Veri Seti:** Veri setine birçok yeni otomobil ve motosiklet markası eklendi (*Aston Martin, Chery, Cupra, Jeep, Lexus, Mazda, Mitsubishi, Porsche, Subaru, Tesla, Togg, Benelli, Indian, MV Agusta, TVS, Yuki, Hero, Alfa Romeo*). Alt modeller alfabetik olarak sıralandı. Peugeot markası hem otomobil hem de motosiklet olarak `peugeot_car` ve `peugeot_moto` şeklinde ikiye bölündü.
3. **Dil Senkronizasyonu Hata Düzeltmesi:** Bağlantı esnasında seçilen araç bilgisi, çevrilmiş metin olarak değil, ham anahtar (örneğin `'bmw_car'`) olarak `activeSessionVehicle` durumuna kaydedildi. Böylece dil değiştirilse dahi onay ekranlarında "Diğer" seçeneğine sıfırlanma olmadan dil otomatik senkronize kalmaktadır.
4. **Ekspertiz Kayıt Ekranı Entegrasyonu:** Ekspertiz menüsündeki "Bu Aracı Kaydet" modalı da bu yeni ham anahtar yapısına entegre edildi. Kullanıcıya tekrar marka/model sormadan ilk seçilen değerleri getirir ve dilerse üzerinde değişiklik yapabilmesine imkan tanır.

### B. GDPR/KVKK ve Apple Gizlilik Uyumlu Telemetri Revizyonu
1. **Şasi No (VIN) Yasağı:** Sunucuya giden tüm payload'lardan şasi numarası (`wmi_vds`) bilgisi tamamen kaldırıldı.
2. **Kalıcı Cihaz UUID (`deviceUuid`):** Donanımsal kimliklerle (IMEI, MAC vs.) bağlantısı olmayan, uygulamaya özel rastgele bir UUID oluşturuldu ve AsyncStorage ile kalıcı hale getirildi.
3. **Senkronizasyon Gecikme Koruması (Guard Clause):** Uygulama açılışında AsyncStorage gecikirse sistemin kilitlenmemesi için `Platform.OS` + `Platform.Version` kullanılarak deterministik bir yedek UUID türetilmesi sağlandı.
4. **Yeni Hashing Formülü:** `session_hash` üretim formülü güncellendi:
   `session_hash = SHA256( Device_UUID + '_' + sorted_dtc_codes_joined + '_' + YYYY-MM-DD )`
5. **Milisaniyelik Float/Decimal Sensör Snapshot:** Teşhis taraması tetiklendiği anda `engine_rpm` (Integer olarak yuvarlanmış), `coolant_temp` (Float/Real, yuvarlanmadan) ve `throttle_pos` (Float/Real, yuvarlanmadan) anlık değerleri yakalanıp telemetri payload'una eklendi.

### C. Supabase SQL Migration
Supabase panelindeki SQL Editor kısmına yapıştırıp çalıştırmanız gereken kod:

```sql
-- 1. Teletelemetri Tablosunu Güncelle: wmi_vds (VIN) sütununu sil, float sensör değerlerini ekle
ALTER TABLE anonymous_diagnostic_telemetry DROP COLUMN IF EXISTS wmi_vds;

ALTER TABLE anonymous_diagnostic_telemetry 
ADD COLUMN IF NOT EXISTS engine_rpm INTEGER,
ADD COLUMN IF NOT EXISTS coolant_temp REAL,
ADD COLUMN IF NOT EXISTS throttle_pos REAL;

-- 2. upsert_telemetry RPC Fonksiyonunu Float/Real Destekli Olarak Yeniden Oluştur
CREATE OR REPLACE FUNCTION upsert_telemetry(payload JSONB)
RETURNS VOID AS $$
BEGIN
  INSERT INTO anonymous_diagnostic_telemetry (
    brand, 
    model, 
    year, 
    protocol, 
    ecu_id, 
    dtc_codes, 
    session_hash, 
    engine_rpm, 
    coolant_temp, 
    throttle_pos, 
    hit_count
  )
  VALUES (
    payload->>'brand',
    payload->>'model',
    (payload->>'year')::integer,
    payload->>'protocol',
    payload->>'ecu_id',
    ARRAY(SELECT jsonb_array_elements_text(payload->'dtc_codes')),
    payload->>'session_hash',
    (payload->>'engine_rpm')::integer,
    (payload->>'coolant_temp')::real,
    (payload->>'throttle_pos')::real,
    1
  )
  ON CONFLICT (session_hash) DO UPDATE
  SET hit_count = anonymous_diagnostic_telemetry.hit_count + 1,
      created_at = timezone('utc'::text, now()),
      engine_rpm = EXCLUDED.engine_rpm,
      coolant_temp = EXCLUDED.coolant_temp,
      throttle_pos = EXCLUDED.throttle_pos;
END;
$$ LANGUAGE plpgsql;
```

### D. App Store Destek & Gizlilik Sayfası (Landing Page)
- [landing-page/index.html](file:///Users/ismailimamoglu/Desktop/MotoCortex/landing-page/index.html) konumuna, App Store Connect'e destek ve gizlilik linki olarak ekleyebileceğiniz premium, karanlık temalı tek sayfalık web sitesi oluşturuldu. Destek maili (`ismail@motocortexapp.com`) ve şasi/kişisel veri toplanmadığına dair KVKK/GDPR uyarıları sayfaya eklendi.

---

## 2. Değişiklik Yapılan Dosyalar
* [vehicleData.ts](file:///Users/ismailimamoglu/Desktop/MotoCortex/src/data/vehicleData.ts) (Yeni markalar, alfabetik modeller ve 1980 yılı uzatması)
* [tr.json](file:///Users/ismailimamoglu/Desktop/MotoCortex/src/locales/tr.json) (Yeni marka çevirileri ve otomobil/motosiklet ayrımı)
* [en.json](file:///Users/ismailimamoglu/Desktop/MotoCortex/src/locales/en.json) (Yeni marka çevirileri ve otomobil/motosiklet ayrımı)
* [useAppStore.ts](file:///Users/ismailimamoglu/Desktop/MotoCortex/src/store/useAppStore.ts) (`deviceUuid` durum tanımları ve persist yapılandırması)
* [useTelemetryStore.ts](file:///Users/ismailimamoglu/Desktop/MotoCortex/src/store/useTelemetryStore.ts) (Teşhis kayıtlarında `wmi_vds` temizlenip PIDs eklendi)
* [crypto.ts](file:///Users/ismailimamoglu/Desktop/MotoCortex/src/utils/crypto.ts) (UUID tabanlı hash formülü ve platform guard fallback)
* [useBluetooth.ts](file:///Users/ismailimamoglu/Desktop/MotoCortex/src/hooks/useBluetooth.ts) (Taramalarda RPM, Coolant ve Throttle float/real snapshot alımı)
* [TelemetrySyncManager.ts](file:///Users/ismailimamoglu/Desktop/MotoCortex/src/services/TelemetrySyncManager.ts) (Supabase RPC veri gönderme payload eşlemesi)
* [App.tsx](file:///Users/ismailimamoglu/Desktop/MotoCortex/App.tsx) (UUID başlangıç tetikleyicisi ve ekspertiz kayıt modal eşlemesi)
* [migration.sql](file:///Users/ismailimamoglu/Desktop/MotoCortex/src/api/migration.sql) (Supabase için veritabanı migration kodu)
* [index.html](file:///Users/ismailimamoglu/Desktop/MotoCortex/landing-page/index.html) (App Store destek ve gizlilik sitesi)

---

## 3. Yarın İçin Kontrol Listesi & Test Senaryoları
Yarın çalışmaya başlandığında test edilmesi gereken adımlar:
1. **Supabase SQL Migration Çalıştırılması:** Yukarıdaki SQL kodunun Supabase SQL Editor'de çalıştırılması.
2. **Canlı Cihaz Bağlantı Testi:** Cihaz ilk kez bağlandığında AsyncStorage üzerinde `deviceUuid` değerinin başarıyla üretildiğinin ve taranan verilerin yeni formülle (`session_hash` ve float sensör değerleri ile) veri tabanına yazıldığının izlenmesi.
3. **Dil Değişikliği Testi:** Dil Türkçe/İngilizce arasında değiştirildiğinde hem bağlantı ekranında hem de geçmiş/ekspertiz ekranındaki marka isimlerinin senkronize çevrildiğinin teyit edilmesi.
4. **Landing Page Dağıtımı:** `landing-page/` klasörünün Vercel veya GitHub Pages üzerinde deploy edilip canlı linkin App Store Connect'e girilmesi.
Vercel CLI üzerinden canlıya yayınlama (deployment) işlemine başlayabilmek için Vercel hesabınıza giriş yapılması gerekmektedir.

Lütfen aşağıdaki bağlantıyı ziyaret ederek tarayıcınız üzerinden kimlik doğrulamayı tamamlayın:

👉 Vercel Giriş Linki (Cihaz Kodu: BJXS-RHPR)

Siz tarayıcıda girişi tamamladıktan sonra terminal otomatik olarak bunu algılayıp giriş yapacaktır. Girişi tamamladığınızda bana bildirebilirsiniz, hemen ardından yayına alma komutunu çalıştıracağım.

Vercel whoami command execution finished
MotoCortex için hazırladığımız destek ve gizlilik odaklı Landing Page (Açılış Sayfası) başarıyla Vercel üzerinde canlıya yayınlandı! 🎉

🌐 Canlı URL Adresi:
👉 https://motocortex-telemetry.vercel.app

🛠️ Neler Yapıldı?
HTML & CSS Güncellemesi:
Sayfa 

landing-page/index.html
 MotoCortex markasının ruhuna uygun, modern, karanlık (dark mode) otomotiv temalı, neon cyan/emerald parıltılara sahip, şık ve mobil uyumlu (responsive) bir arayüzle güncellendi.
Yasal & Destek İçerik Yapısı:
Destek e-postası ismailimamoglu610@gmail.com olarak güncellendi ve doğrudan yönlendirme yapan mailto linkleri eklendi.
Apple Connect ve KVKK/GDPR süreçlerinden tek seferde geçilmesini sağlayacak olan anonim veri toplama ve gizlilik beyanı tam olarak istediğiniz şekilde sayfaya yerleştirildi.
Vercel Entegrasyonu & Dağıtım:
Vercel CLI kimlik doğrulaması tamamlandıktan sonra, landing-page dizini motocortex-telemetry projesi olarak yayınlandı ve otomatik olarak motocortex-telemetry.vercel.app alt alan adına (alias) bağlandı.
Detayları ve yapılan değişikliklerin özetini 
walkthrough.md
 dosyasından da inceleyebilirsiniz.

Sıradaki adıma geçmeye hazır mıyız yoksa test etmek istediğiniz başka bir bölüm var mı?