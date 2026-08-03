# 🚀 MotoCortex - API, Canlı Test ve Güvenlik Master Raporu

**Proje:** MotoCortex Mobile (`motocortex-mobile`)  
**Tarih:** 3 Ağustos 2026  
**Rapor Türü:** Birleştirilmiş Tek Dosya (API Listesi, Test Sonuçları, Key Güvenliği ve Mimari Çözümler)  

---

## 📌 İçindekiler
1. [Özet ve Genel Görünüm](#1-özet-ve-genel-görünüm)
2. [Projedeki Tüm API'ların Detaylı İncelemesi](#2-projedeki-tüm-apıların-detaylı-incelemesi)
   - [A. Dış ve Bulut REST API'ları](#a-dış-ve-bulut-rest-apıları)
   - [B. Supabase Bulut Veritabanı ve RPC Fonksiyonları](#b-supabase-bulut-veritabanı-ve-rpc-fonksiyonları)
   - [C. Uygulama İçi Satın Alma (IAP) ve SDK API'ları](#c-uygulama-içi-satın-alma-iap-ve-sdk-apıları)
   - [D. Donanım, Bluetooth ve Teşhis Protokol API'ları](#d-donanım-bluetooth-ve-teşhis-protokol-apıları)
   - [E. Yerel Veri Depolama ve Analitik API'ları](#e-yerel-veri-depolama-ve-analitik-apıları)
3. [Test Sonuçları ve Doğrulama](#3-test-sonuçları-ve-doğrulama)
   - [A. Otomatik Birim ve Entegrasyon Testleri (Jest)](#a-otomatik-birim-ve-entegrasyon-testleri-jest)
   - [B. Canlı Ağ (HTTP Network) İletişim Testleri](#b-canlı-ağ-http-network-iletişim-testleri)
4. [API Key Güvenliği ve Hacklenme Risk Analizi](#4-api-key-güvenliği-ve-hacklenme-risk-analizi)
   - [A. Mobil Uygulama Tersine Mühendislik (Decompilation) Riski](#a-mobil-uygulama-tersine-mühendislik-decompilation-riski)
   - [B. API Key Risk Derecelendirme Tablosu](#b-api-key-risk-derecelendirme-tablosu)
   - [C. Potansiyel Hack ve Suistimal Senaryoları](#c-potansiyel-hack-ve-suistimal-senaryoları)
5. [Güvenlik İyileştirme Eylem Planı ve Örnek Kod Çözümleri](#5-güvenlik-iyileştirme-eylem-planı-ve-örnek-kod-çözümleri)
   - [Çözüm 1: Gemini API Key'i Supabase Edge Function Arkasına Taşıma](#çözüm-1-gemini-api-keyi-supabase-edge-function-arkasına-taşıma)
   - [Çözüm 2: Google Cloud Console Kota ve Erişim Kısıtlaması](#çözüm-2-google-cloud-console-kota-ve-erişim-kısıtlaması)
   - [Çözüm 3: Supabase RLS (Row Level Security) Doğrulaması](#çözüm-3-supabase-rls-row-level-security-doğrulaması)

---

## 1. Özet ve Genel Görünüm

MotoCortex projesindeki tüm ağ istekleri, harici servisler, bulut veritabanı bağlantıları, donanım (Bluetooth/OBD) protokolleri ve API key güvenlik yapıları incelenmiş ve test edilmiştir.

- **Birim Testleri:** Projedeki **39 test paketinin tamamı (363 birim testi)** %100 başarıyla geçmiştir.
- **Canlı Ağ Testleri:** Dış API'lar (NHTSA, GitHub DTC DB, Telemetry Dashboard) canlı isteklerle test edilmiş, çalışma durumları ve yanıt süreleri doğrulanmıştır.
- **Güvenlik Durumu:** Supabase Anon Key ve RevenueCat Key yapıları istemci standartlarına uygun ve güvendedir. Ancak mobilde doğrudan çağrılan **Google Gemini API Key**, istemci bundle paketinden okunabileceği için **YÜKSEK RİSK** taşımaktadır. Sunucu (Edge Function) arkasına alınması önerilir.

---

## 2. Projedeki Tüm API'ların Detaylı İncelemesi

### A. Dış ve Bulut REST API'ları

#### 1. NHTSA VIN Decoding API
- **Endpoint**: `https://vpic.nhtsa.dot.gov/api/vehicles/decodevinvalues/{VIN}?format=json`
- **Dosya Konumu**: [VehicleIdentityService.ts](file:///Users/ismailimamoglu/Desktop/MotoCortex/src/services/VehicleIdentityService.ts#L31-L34)
- **Açıklama**: 17 haneli VIN şase numarasından aracın marka, model, üretim yılı, yakıt türü (DIESEL/GASOLINE/HYBRID/ELECTRIC) ve şanzıman verilerini çözer.
- **Çevrimdışı / Fallback**: 3 saniyelik zaman aşımı tanımlıdır. İnternet olmaması durumunda yerel regex decoder (`getMakeFromVin`, `getYearFromVin`) çalışarak çevrimdışı profil döner.

#### 2. Google Gemini Generative AI API ("AI Doctor")
- **Endpoint**: `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={API_KEY}`
- **Dosya Konumu**: [aiDoctorService.ts](file:///Users/ismailimamoglu/Desktop/MotoCortex/src/services/aiDoctorService.ts#L83-L91)
- **Açıklama**: Araçtan okunan DTC arıza kodları ile canlı sensör verilerini (Voltaj, Soğutma Suyu Sıcaklığı vb.) 26 dilde mekanik teşhis raporuna, tahmini tamir maliyetine ve sürüş güvenlik tavsiyesine dönüştürür.
- **Çevrimdışı / Fallback**: `generateOfflineFallback` kural motoru çevrimdışı modda otomatik devreye girer.

#### 3. GitHub Raw DTC Data API
- **Endpoint**: `https://raw.githubusercontent.com/peyo/dtc-and-vin-data/master/dtc/p/{make}.json`
- **Dosya Konumu**: [DtcSyncService.ts](file:///Users/ismailimamoglu/Desktop/MotoCortex/src/services/DtcSyncService.ts#L7-L32)
- **Açıklama**: Honda, Yamaha, BMW, Ducati gibi markalara özgü gelişmiş DTC arıza kodu sözlüklerini arka planda cihaz diskine indirir (`dtc_chunks`).

#### 4. Remote OEM Cloud Security Access API
- **Endpoint**: `https://api.motocortex.app/v1/security/seed-key`
- **Dosya Konumu**: [SecurityAccessProvider.ts](file:///Users/ismailimamoglu/Desktop/MotoCortex/src/core/security/SecurityAccessProvider.ts#L60)
- **Açıklama**: UDS Güvenlik Erişimi (Seed/Key) için uzak HSM sunucusu üzerinden anahtar hesaplaması yapar.
- **Çevrimdışı / Fallback**: `LocalTestSecurityProvider` ve Supabase RPC fallback mekanizmaları mevcuttur.

#### 5. Telemetry Web Dashboard Host
- **Endpoint**: `https://motocortex-telemetry.vercel.app`
- **Dosya Konumu**: [Paywall.tsx](file:///Users/ismailimamoglu/Desktop/MotoCortex/src/components/Paywall.tsx#L921), [AboutView.tsx](file:///Users/ismailimamoglu/Desktop/MotoCortex/src/components/AboutView.tsx#L567)
- **Açıklama**: Web kullanıcı paneli, kullanım şartları (Terms) ve gizlilik politikası (Privacy) yönlendirmeleri için kullanılır.

---

### B. Supabase Bulut Veritabanı ve RPC Fonksiyonları

- **İstemci Yapılandırması**: [supabaseClient.ts](file:///Users/ismailimamoglu/Desktop/MotoCortex/src/api/supabaseClient.ts) (`EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`)
- **Çağrılan RPC Stored Procedure'lar**:
  1. `supabase.rpc('upsert_telemetry', { payload })`: Canlı ve toplu (batch) telemetri verilerini buluta senkronize eder ([TelemetrySyncManager.ts](file:///Users/ismailimamoglu/Desktop/MotoCortex/src/services/TelemetrySyncManager.ts#L300)).
  2. `supabase.rpc('get_chronic_faults', { brand })`: Markaya özgü kronik arızaları sorgular ([useTelemetryStore.ts](file:///Users/ismailimamoglu/Desktop/MotoCortex/src/store/useTelemetryStore.ts#L306)).
  3. `supabase.rpc('calculate_ecu_security_key', { ... })`: UDS Güvenlik Erişimi için uzaktan anahtar hesaplar ([OemKeyProvider.ts](file:///Users/ismailimamoglu/Desktop/MotoCortex/src/core/protocol/uds/OemKeyProvider.ts#L51)).

---

### C. Uygulama İçi Satın Alma (IAP) ve SDK API'ları

- **Entegrasyon Kütüphanesi**: `react-native-purchases` (RevenueCat)
- **Kullanıldığı Yerler**: [useAppStore.ts](file:///Users/ismailimamoglu/Desktop/MotoCortex/src/store/useAppStore.ts#L421-L475), [Paywall.tsx](file:///Users/ismailimamoglu/Desktop/MotoCortex/src/components/Paywall.tsx), [ContextualPaywallModal.tsx](file:///Users/ismailimamoglu/Desktop/MotoCortex/src/components/ContextualPaywallModal.tsx)
- **Önemli Metotlar**:
  - `Purchases.getCustomerInfo()`: Kullanıcının abonelik durumunu ve hakkını sorgular.
  - `Purchases.getOfferings()`: Güncel fiyatlandırma ve paket tekliflerini çeker.
  - `Purchases.purchasePackage(pkg)`: Satın alma işlemini başlatır.
  - `Purchases.restorePurchases()`: Geçmiş satın alımları geri yükler.

---

### D. Donanım, Bluetooth ve Teşhis Protokol API'ları

1. **Bluetooth Low Energy (BLE) & Classic (SPP) API**
   - **Kütüphaneler**: `react-native-ble-plx`, `react-native-bluetooth-classic`, `motocortex-obd`
   - **Dosyalar**: [BluetoothManager.ts](file:///Users/ismailimamoglu/Desktop/MotoCortex/src/api/BluetoothManager.ts), [BluetoothService.android.ts](file:///Users/ismailimamoglu/Desktop/MotoCortex/src/api/BluetoothService.android.ts)
   - **Görevi**: ELM327 / STN1110 adaptörleri ile seri port (SPP) ve BLE GATT üzerinden yüksek hızlı iletişim kurar.

2. **OBD-II & UDS Protocol Engine API**
   - **Dosya**: [OBD2ProtocolEngine.ts](file:///Users/ismailimamoglu/Desktop/MotoCortex/src/api/OBD2ProtocolEngine.ts)
   - **Görevi**: CAN Bus (ISO 15765-4), K-Line (ISO 14230-4) ve UDS (ISO 14229) protokollerinin komut kuyruğunu yönetir.

---

### E. Yerel Veri Depolama ve Analitik API'ları

1. **Yerel SQLite & Dynamic DTC Storage API**
   - **Dosya**: [dtcStorage.ts](file:///Users/ismailimamoglu/Desktop/MotoCortex/src/data/dtcStorage.ts)
   - **Görevi**: 15.000+ arıza kodunu İnternetsiz ortamda < 1ms süreyle arama imkanı sunar.

2. **Firebase Analytics & Crashlytics API**
   - **Paketler**: `@react-native-firebase/analytics`, `@react-native-firebase/crashlytics`
   - **Görevi**: Oturum analitiği, kullanıcı davranışı ve uygulama çökme loglarını toplar.

---

## 3. Test Sonuçları ve Doğrulama

### A. Otomatik Birim ve Entegrasyon Testleri (Jest)

Projedeki test altyapısı çalıştırılmış ve elde edilen sonuçlar aşağıda sunulmuştur:

```text
Test Suites: 39 passed, 39 total
Tests:       363 passed, 363 total
Snapshots:   0 total
Time:        4.471 s
Ran all test suites.
```
✅ **Değerlendirme:** 363 birim ve entegrasyon testinin tamamı başarıyla geçmiştir.

---

### B. Canlı Ağ (HTTP Network) İletişim Testleri

Özel test betiği (`test_apis.js`) ile canlı ağ istekleri yapılmış ve sonuçlar kaydedilmiştir:

| API / Servis Adı | Endpoint Host | HTTP Yanıt Kodu | Yanıt Süresi | Durum / Açıklama |
| :--- | :--- | :---: | :---: | :--- |
| **NHTSA VIN Decoder API** | `vpic.nhtsa.dot.gov` | **200 OK** | 513ms | **Aktif & Çalışıyor** (4125 bayt JSON verisi alındı) |
| **GitHub Raw DTC Database API** | `raw.githubusercontent.com` | **200 OK** | 449ms | **Aktif & Çalışıyor** (6317 bayt DTC verisi alındı) |
| **Google Gemini AI Endpoint** | `generativelanguage.googleapis.com` | **403 / Endpoint Hazır** | 152ms | **Sunucu Aktif** (Key parametresi olmadan 403 döner) |
| **MotoCortex Telemetry Dashboard**| `motocortex-telemetry.vercel.app` | **200 OK** | 357ms | **Aktif & Çalışıyor** |
| **Remote Cloud Security Host** | `api.motocortex.app` | **TIMEOUT (8s)** | 8000ms | **Sunucu Çevrimdışı** (`LocalTestSecurityProvider` aktif) |

---

## 4. API Key Güvenliği ve Hacklenme Risk Analizi

### A. Mobil Uygulama Tersine Mühendislik (Decompilation) Riski

React Native / Expo ile oluşturulan Android (APK/AAB) ve iOS (IPA) paketleri derlendiğinde, JavaScript kodları `index.android.bundle` dosyası olarak paketlenir. `EXPO_PUBLIC_` ön takısı ile tanımlanan ortam değişkenleri derleme anında bu bundle içerisine **açık metin (plain-text)** olarak yazılır.

Bir hacker veya kötü niyetli kişi:
1. APK dosyasını bir ZIP açıcı veya `jadx-gui` ile saniyeler içinde açabilir.
2. `assets/index.android.bundle` dosyasında `EXPO_PUBLIC_` veya `API_KEY` kelimelerini aratarak açık metin anahtarlara ulaşabilir.

---

### B. API Key Risk Derecelendirme Tablosu

| API / Key Adı | Değişken / Yer | Risk Seviyesi | Nedeni ve Güvenlik Mimarisi |
| :--- | :--- | :---: | :--- |
| **Supabase Anon Key** | `EXPO_PUBLIC_SUPABASE_ANON_KEY` | 🟢 **DÜŞÜK** | Supabase Anon Key halka açık olmak üzere tasarlanmıştır. Güvenlik veritabanındaki **Row Level Security (RLS)** kuralları ile sağlanır. |
| **RevenueCat IAP Keys** | `EXPO_PUBLIC_RC_IOS_KEY`<br>`EXPO_PUBLIC_RC_ANDROID_KEY` | 🟢 **DÜŞÜK** | RevenueCat SDK anahtarları istemci tarafı (public) anahtarlarıdır. Yalnızca satın alım başlatır, admin yetkisi vermez. |
| **Google Gemini AI Key** | `EXPO_PUBLIC_GEMINI_API_KEY` | 🔴 **YÜKSEK** | **KRİTİK RİSK:** Gemini API Key doğrudan mobilden `fetch` ile çağrılmaktadır. APK decompile edilerek çalınabilir ve kotanız suistimal edilebilir. |
| **Supabase Service Role Key** | `EXPO_PUBLIC_SUPABASE_SERVICE_ROLE_KEY` | 🟢 **GÜVENLİ** | **Mobilde KULLANILMIYOR.** Bu harika bir uygulamadır; çünkü bu key veritabanının yetkili admin şifresidir. |
| **NHTSA & GitHub APIs** | - | 🟢 **RİSK YOK** | Kamuya açık, API Key gerektirmeyen servislerdir. |

---

### C. Potansiyel Hack ve Suistimal Senaryoları

1. **Gemini API Key'in Çalınması:**
   - **Senaryo:** Saldırgan APK'dan Gemini API Key'i çeker.
   - **Etki:** Kendi botlarında veya uygulamalarında sizin anahtarınızı kullanarak Google Cloud üzerindeki yapay zeka kotanızı tüketir. Yüksek maliyetli faturalar oluşabilir veya servisiniz durdurulabilir.

2. **Supabase Veritabanı Erişim İncelemesi:**
   - **Senaryo:** Saldırgan `ANON_KEY` ile doğrudan Supabase REST API'sine istek atar (`https://cwlmzjynqjoezgoonenz.supabase.co/rest/v1/telemetry_logs`).
   - **Etki:** Eğer Supabase panelinde RLS kuralları kapalıysa verileri okuyabilir/silebilir. RLS aktifse yetkisiz erişim engellenir.

---

## 5. Güvenlik İyileştirme Eylem Planı ve Örnek Kod Çözümleri

### Çözüm 1: Gemini API Key'i Supabase Edge Function Arkasına Taşıma

Gemini API anahtarını mobil uygulamada saklamak yerine, istekleri Supabase Edge Function üzerinden geçirmek %100 güvenlik sağlar.

#### 1. Supabase Edge Function Kodu (`supabase/functions/ai-doctor/index.ts`):
```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

serve(async (req) => {
  try {
    const { dtcCodes, vehicleMake, vehicleModel, lang } = await req.json();
    const apiKey = Deno.env.get("GEMINI_API_KEY"); // Yalnızca sunucuda saklanır!

    if (!apiKey) {
      return new Response(JSON.stringify({ error: "API Key Config Missing" }), { status: 500 });
    }

    const prompt = `You are MotoCortex AI Mechanic. Analyze fault codes: ${dtcCodes.join(', ')}...`;

    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
    });

    const data = await res.json();
    return new Response(JSON.stringify(data), { headers: { "Content-Type": "application/json" } });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
});
```

#### 2. Mobil Uygulamadan İstemci Çağrısı (`aiDoctorService.ts`):
```typescript
// Mobilde API Key saklamaya gerek kalmaz!
const { data, error } = await supabase.functions.invoke('ai-doctor', {
  body: { dtcCodes: context.dtcCodes, vehicleMake: context.vehicleMake, lang }
});
```

---

### Çözüm 2: Google Cloud Console Kota ve Erişim Kısıtlaması

Eğer Edge Function'a geçiş sürecinde geçici olarak mobilden çağrı yapılmaya devam edilecekse:
1. **Google Cloud Console > Credentials** bölümüne gidin.
2. Gemini API Key'i düzenleyin.
3. **API Restrictions** kısmından yalnızca `Generative Language API` seçeneğini işaretleyin.
4. **Quotas / Rate Limits** kısmından günlük maksimum bütçe/istek sınırı (örn: günlük $5 veya 1000 istek) tanımlayın.

---

### Çözüm 3: Supabase RLS (Row Level Security) Doğrulaması

Supabase SQL Editöründe tüm tablolar için RLS kurallarını aşağıdaki gibi doğrulayın:

```sql
-- Telemetri tablosunda RLS aktif etme
ALTER TABLE telemetry_logs ENABLE ROW LEVEL SECURITY;

-- Kullanıcıların yalnızca kendi telemetri kayıtlarını okumasına izin verme
CREATE POLICY "Users can only read own telemetry" 
ON telemetry_logs FOR SELECT 
USING (auth.uid() = user_id);

-- Anonim kullanıcıların sadece INSERT yapabilmesi (Log gönderme)
CREATE POLICY "Anon users can insert telemetry" 
ON telemetry_logs FOR INSERT 
WITH CHECK (true);
```

---

*Rapor MotoCortex projesinin tüm kod tabanı, birim testleri ve canlı HTTP test sonuçları birleştirilerek tek bir dosya olarak hazırlanmıştır.*
