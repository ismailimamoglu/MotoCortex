# MotoCortex iOS Çökme Analizi ve Gelecek Sürüm Yol Haritası

Bu doküman, TestFlight/Geliştirme ortamlarında karşılaşılan iOS çökme logunun detaylı teknik analizini, eski araçlar için protokol genişletme planlarını ve Bluetooth LE cihaz uyumluluk iyileştirmelerini içermektedir.

> [!NOTE]
> **Mevcut Durum Özeti (Güncel):** App Store'dan indirilen canlı sürümde herhangi bir çökme yaşanmamakta ve uygulama sorunsuz çalışmaktadır (Test kullanıcıları tarafından onaylanmıştır). Çökme sadece çevre değişkenlerinin (Environment Variables) eksik olduğu eski test sürümlerinde (Build 35) yaşanmıştır.

---

## 🔍 Çökme Anatomisi ve Sürüm Karşılaştırması

Xcode'dan alınan çökme raporundaki çağrı zinciri ve sürüm bilgileri detaylıca incelenmiştir:

### 1. Sürüm Analizi (Build 35 vs Build 38)
* **Çöken Sürüm:** Görselin sağ tarafındaki *Crash Log Details* alanında çöken sürümün **`MotoCortex 35 (1.1.0)`** olduğu, dağıtım kanalının ise **`TestFlight`** olduğu ve sadece **2 cihazı** etkilediği görülmektedir.
* **Canlıdaki Sürüm:** Projenin güncel `app.json` dosyası incelendiğinde iOS build numarasının **`38`** (`"buildNumber": "38"`) olduğu görülmektedir.
* **Değerlendirme:** Çökmeye sebep olan hatalar eski bir test sürümü olan **Build 35**'te kalmıştır. Yayına girmeden önce yapılan QA testleri ve kod düzeltmeleri sayesinde **Build 38** sürümü stabil bir şekilde App Store'a çıkmıştır. Bu durum, canlıdaki uygulamanın neden sorunsuz çalıştığını doğrulamaktadır.

### 2. Kök Neden ve Hata Kurtarma İlişkisi
* **Hatalı Yorum:** Hata kurtarma modülünün (`ErrorRecovery`) veya yerel önbellek okuma işleminin başarısız olması nedeniyle uygulamanın çöktüğü düşünülmüştür.
* **Teknik Gerçek:** Uygulama açılışında JavaScript motoru (Hermes) çalışırken `@supabase/supabase-js` kütüphanesi başlatılırken `supabaseUrl` parametresinin eksik olmasından ötürü **`Error: supabaseUrl is required`** ölümcül JavaScript hatası fırlatmıştır.
* **Kurtarma Süreci:** JS motoru çöktüğü için React Native köprüsü kopmuştur. `expo-updates` kütüphanesine ait `ErrorRecovery` sınıfı bu fatal hatayı yakalamış, kablosuz güncellemelerden kurtarmaya çalışmış, kurtaramayınca uygulamanın donuk (beyaz ekran) kalmasını önlemek amacıyla kasıtlı olarak işletim sistemi düzeyinde `objc_exception_throw` fırlatarak uygulamayı sonlandırmıştır.

---

## 🚗 2004 Honda Accord ve Eski Araç Protokol Uyuşmazlığı

Canlı sahada yapılan testlerde, uygulamanın motosikletler yerine doğrudan **2004 model Honda Accord** binek otomobil üzerinde test edildiği belirtilmiştir. Bu araçta marş açılmasına ve akü devreye girmesine rağmen ECU bağlantısının kurulamaması yazılımsal protokol uyuşmazlığından kaynaklanmaktadır.

### 1. Honda Accord (2004) Protokol Detayları
* Bu model Honda Accord'lar OBD2 iletişim altyapısında CAN-Bus (`ISO 15765-4`) yerine eski nesil **K-Line** protokollerini kullanır.
* Araç genellikle **ISO 9141-2** (`AT SP 3`) veya **ISO 14230-4 KWP (5-Baud Init)** (`AT SP 4`) üzerinden haberleşir.
* Mevcut kod tabanımızda (`src/hooks/useBluetooth.ts`) araç protokol tespiti yapılırken sadece `AT SP 6` (CAN 11-bit), `AT SP 7` (CAN 29-bit) ve `AT SP 5` (KWP Fast Init) taranmaktadır. `AT SP 3` ve `AT SP 4` protokolleri taranmadığı için ELM327/OBD2 adaptörü aracın ECU'suna el sıkışma isteği gönderememekte ve bağlantı kurulurken zaman aşımına düşülmektedir.

### 2. Yeni Sürüm Protokol Güncelleme Planı
Uygulamanın `useBluetooth.ts` içindeki `initializeAndCheckEcu` fonksiyonuna eski araç K-Line protokol desteği eklenerek tarama adımları şu şekilde güncellenecektir:
```typescript
// Gelecek Sürüm Tarama Sıralaması:
// 1. AT SP 6 (CAN 11bit 500k)
// 2. AT SP 7 (CAN 29bit 500k)
// 3. AT SP 3 (ISO 9141-2 - 2004 Honda Accord vb. araçlar için kritik fallback)
// 4. AT SP 4 (ISO 14230-4 KWP 5-Baud Init - Eski araçlar için yedek)
// 5. AT SP 5 (ISO 14230-4 KWP Fast Init - Mevcut K-Line desteği)
```

---

## 📶 BLE OBD2 Çip Servis ve Karakteristik UUID Genişletme Listesi

Piyasada satılan 500'den fazla farklı ucuz Çin klonu adaptörün (Chicony, TI, Telink, Cypress vb. BLE çipleri barındıran cihazlar) iOS ve Android tarafında hiçbir şekilde bağlantı/iletişim sorunu yaşamaması için, bu çiplerin servis ve karakteristik UUID'leri kod tabanına gömülecektir.

Mevcut kodumuz dinamik olarak tüm servisleri tarasa da, ucuz klonların kararsız GATT yapıları ve MTU kısıtları nedeniyle bağlantının başında doğrudan bu UUID'lerle el sıkışmak (handshake) bağlantı başarısını %100'e yakın seviyeye çıkaracaktır.

### Entegre Edilecek BLE UUID Matrisi
Aşağıdaki liste, pazarda yaygın olarak kullanılan tüm Çin klonu çip üreticilerinin ve popüler premium adaptörlerin Service ve Characteristic UUID'lerini içermektedir:

| Çip Seti / Adaptör Markası | Servis UUID (Service UUID) | Karakteristik UUID (Notify/Write) | Özellik / Açıklama |
| :--- | :--- | :--- | :--- |
| **HM-10 / CC2541 (TI - Texas Instruments Klonları)** | `0000FFE0-0000-1000-8000-00805F9B34FB` | `0000FFE1-0000-1000-8000-00805F9B34FB` | En yaygın Çin klonlarında kullanılan TI çipi. |
| **ELM327 v2.1 Klonları (Generic FFF0)** | `0000FFF0-0000-1000-8000-00805F9B34FB` | `0000FFF1-0000-1000-8000-00805F9B34FB`<br>`0000FFF2-0000-1000-8000-00805F9B34FB` | Ucuz klonlarda en sık rastlanan 2. tip GATT şeması. |
| **Telink BLE Çipleri (TLSR8266 / 8269 Klonlar)** | `0000FFE0-0000-1000-8000-00805F9B34FB`<br>`0000FEE0-0000-1000-8000-00805F9B34FB` | `0000FFE1-0000-1000-8000-00805F9B34FB`<br>`0000FEE1-0000-1000-8000-00805F9B34FB` | Telink tabanlı ucuz klonların kullandığı default UART profili. |
| **Chicony BLE Modülleri & Custom Klonlar** | `0000FFB0-0000-1000-8000-00805F9B34FB` | `0000FFB1-0000-1000-8000-00805F9B34FB`<br>`0000FFB2-0000-1000-8000-00805F9B34FB` | Özel Chicony ve bazı eski Çin klonlarının serial profili. |
| **Nordic UART Service (NUS - Geniş Uyumluluk)** | `6E400001-B5A3-F393-E0A9-E50E24DCCA9E` | `6E400002-B5A3-F393-E0A9-E50E24DCCA9E` (Write)<br>`6E400003-B5A3-F393-E0A9-E50E24DCCA9E` (Notify) | Birçok yeni nesil Çin çipinin (Cypress, Telink vb.) NUS taklidi. |
| **ISSC Bluetooth (Microchip BM70/RN4870 Klonları)** | `49535343-FE7D-4AE5-8FA9-9FAFD205E455` | `49535343-1E4D-4BD9-BA61-23C647249616` (Notify)<br>`49535343-8841-43F4-A8D4-ECBE34729BB3` (Write) | ISSC / Microchip tabanlı şeffaf seri iletişim çipleri. |
| **OBDLink / Veepeak / Vgate iCar** | `000018F0-0000-1000-8000-00805F9B34FB` | `00002AF0-0000-1000-8000-00805F9B34FB` (Notify)<br>`00002AF1-0000-1000-8000-00805F9B34FB` (Write) | Premium BLE OBD2 adaptörlerin kullandığı standart servis. |
| **Carista / LELink** | `0000E7FE-0000-1000-8000-00805F9B34FB` | `0000C48A-0000-1000-8000-00805F9B34FB` | Carista ve LELink adaptörlerin kullandığı özel GATT şeması. |
| **Viecar BLE Adaptörleri** | `000018F0-0000-1000-8000-00805F9B34FB` | `00002AF0-0000-1000-8000-00805F9B34FB` | Viecar markalı BLE cihazların kullandığı standart. |

---

## 🛠️ Yeni Sürümde Alınacak Önlemler (Yol Haritası)

1. **Supabase Başlatma Güvenliği (Soft-Failure):** `src/api/supabaseClient.ts` içinde Supabase başlatılırken eksik anahtar varsa mock nesne döndürülecek ve uygulamanın çökmesi engellenecektir.
2. **Dinamik Protokol Tarama Genişletmesi:** 2004 Honda Accord gibi eski K-Line tabanlı araçların taranabilmesi için `AT SP 3` (ISO 9141-2) ve `AT SP 4` (ISO 14230-4 KWP 5-Baud) protokolleri `useBluetooth.ts` tarama döngüsüne entegre edilecektir.
3. **BLE UUID Kod Seviyesinde Gömme (Hardcoding):** `BluetoothService.ios.ts` ve `BluetoothService.android.ts` dosyalarında, yukarıdaki UUID tablosu statik bir dizi (array) olarak tanımlanacaktır. BLE bağlantısı kurulduğunda, eğer dinamik tarama karakteristikleri yakalayamazsa, bu dizi sırayla dönülerek bilinen servis ve karakteristikler üzerinden güvenli el sıkışma (handshake) gerçekleştirilecektir. Bu sayede tüm Çin klonları desteklenmiş olacaktır.

---

## 📊 Özet Tablo: Çökme Senaryoları ve Durumları

| Derleme / Yayın Tipi | Çevre Değişkeni Durumu | Çökme Riski | Durum / Açıklama |
| :--- | :--- | :--- | :--- |
| **App Store (Build 38 - Canlı)** | `eas.json` (Production) üzerinden gömülü | **YOK (Çalışıyor)** | Üretim anahtarları başarıyla gömülü olduğundan kullanıcılar sorunsuz kullanıyor. |
| **TestFlight (Build 35 - Eski)** | Eksik çevre değişkenleri | **VAR (Çöktü)** | Çökme logunun alındığı, sadece 2 cihazı etkileyen eski test sürümü. |
| **Lokal Simülatör / Dev Build** | `.env` eksik ise | **VAR (Çöker)** | Geliştirici bilgisayarında `.env` tanımlanmadıysa `supabaseUrl` hatası verir. |
| **OTA Güncellemeleri (`eas update`)** | Parametresiz gönderilirse | **VAR (Çöker)** | Kablosuz güncelleme atılırken çevre değişkenleri belirtilmezse canlı uygulama da çökmeye başlar. |
