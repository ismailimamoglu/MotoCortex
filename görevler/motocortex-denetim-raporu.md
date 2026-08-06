# MotoCortex — Statik Kod Denetimi ve Test Raporu

**Depo:** https://github.com/ismailimamoglu/MotoCortex
**Tarih:** 6 Ağustos 2026
**Yöntem:** Salt-okunur statik denetim (bağımlılık kurulumu / derleme yapılmadı). 4 paralel denetim ekseni: çökme riskleri, güvenlik & gizlilik, mağaza yayın hazırlığı, test/CI/bağımlılıklar.

---

## 1. Yönetici Özeti

MotoCortex, Expo SDK 52 / React Native 0.76.9 üzerine kurulu, TypeScript ağırlıklı (~49.600 satır `src/`), OBD-II + UDS + DoIP + CAN FD protokollerini destekleyen olgun bir araç teşhis uygulaması. Mimari katmanlama iyi (`api` / `core` / `services` / `store` / `screens`), 53 test dosyası ile protokol ve parser katmanı ciddi biçimde test edilmiş, 26 dilde i18n altyapısı ve senkronizasyon script'leri mevcut. Bu, hobi seviyesinin belirgin şekilde üzerinde bir kod tabanı.

Ancak **bugünkü haliyle mağazaya gönderilemez** ve **arka uç güvenliği açık durumda**. Üç ana problem alanı:

1. **Build engelleyiciler:** Android manifest var olmayan XML kaynaklarına referans veriyor; sürüm numaraları 4 farklı dosyada çelişiyor ve EAS native değerleri kullandığı için mağazaya *daha düşük* sürüm gitmeye çalışacak.
2. **Arka uç güvenliği:** Bir tabloda RLS hiç açılmamış, referans tablolarda RLS kapatılmış, Edge Function'larda kimlik doğrulama yok, PRO yetkilendirmesi tamamen istemcide.
3. **Güvenlik-kritik komut kapısı istemcide:** Tehlikeli UDS/ECU yazma komutlarının kilidi client-side `isPro` bayrağına bağlı — bu hem gelir kaybı hem araç güvenliği riski.

### Bulgu Dağılımı

| Önem | Adet | Ana başlıklar |
|---|---|---|
| Kritik | 6 | RLS eksikliği, korumasız Edge Function, istemci taraflı yetkilendirme, eksik `res/xml` kaynakları, sürüm çakışması, debug keystore ile release imzalama |
| Yüksek | 8 | WiFi transport timeout yok, temizlenmeyen AppState listener, 30+ boş `catch`, referans tablolarda yazma açık, `search_path` eksik, izin fazlalıkları |
| Orta | 12 | 274 `any`, NaN kontrol boşlukları, ölü `BluetoothManager`, CI eksikleri, eskimiş ödeme SDK'sı |
| Düşük | 9 | Depo hijyeni, tekrar eden klasörler, placeholder fastlane değerleri |

---

## 2. Kritik Bulgular (önce bunlar)

### K1 — `anonymous_diagnostic_telemetry` tablosunda RLS hiç etkin değil
`src/api/schema.sql:1-16`. Aynı dosyadaki diğer tablolarda `ENABLE ROW LEVEL SECURITY` var, bu tabloda yok. Anon key APK içinde dağıtıldığı için, anahtarı çıkaran biri tüm telemetriyi **okuyabilir, güncelleyebilir, silebilir**.
**Düzeltme:** RLS'i açın, yalnızca `INSERT ... WITH CHECK (true)` politikası tanımlayın; SELECT/UPDATE/DELETE için politika vermeyin.

### K2 — Edge Function'larda kimlik doğrulama yok, CORS `*`
`supabase/functions/sec-access-calculator/index.ts`, `supabase/functions/verify-entitlement/index.ts`. `Authorization` doğrulaması yok. Herkes UDS seed-key hesaplatabilir veya ücretli RevenueCat çağrılarınızı tetikleyebilir.
**Düzeltme:** `verify_jwt = true`, bearer token zorunluluğu, rate limit, CORS'u kendi origin'inize daraltın.

### K3 — PRO yetkilendirmesi %100 istemci tarafında
`src/store/useAppStore.ts:20-58` sadece cihazdaki RevenueCat `CustomerInfo`'ya bakıyor; `assertHardwareGate` (`src/core/security/CommandClassificationRegistry.ts:119`) bu `isPro` değerine güveniyor. Repoda hazır duran `verify-entitlement` fonksiyonu **kod tabanından hiç çağrılmıyor**.
Rootlu cihazda SDK hook'lanarak PRO kilidi ve **tehlikeli ECU yazma komutlarının donanım kapısı** birlikte atlatılabilir. Bu sadece gelir değil, güvenlik meselesi.
**Düzeltme:** Kritik/ücretli komutlar için sunucu tarafı entitlement doğrulamasını devreye alın; `isBackdoorPro` alanını prod bundle'dan build-time strip edin.

### K4 — Android manifest var olmayan XML kaynaklarını referans veriyor (build kırılıyor)
`android/app/src/main/AndroidManifest.xml:16` → `@xml/secure_store_backup_rules` ve `@xml/secure_store_data_extraction_rules`; `android/app/src/main/res/xml/` altında bu dosyalar yok. Release derlemesi `resource not found` ile başarısız olur.

### K5 — Sürüm numaraları 4 dosyada çelişiyor, mağazaya düşük sürüm gidecek
| Kaynak | version | build |
|---|---|---|
| `app.json:5,16,39` | 1.2.0 | 53 |
| `android/app/build.gradle` | 1.1.0 | 46 |
| `ios/.../Info.plist` | 1.1.0 | 41 |
| `project.pbxproj:414,432` | 1.0.0 | 41 |

`eas.json` içinde `appVersionSource: "local"` olduğu için EAS **native dosyaları** baz alır → 46 / 1.1.0 çıkar; mağazada 53 varsa "sürüm geriye gidemez" hatasıyla reddedilir.

### K6 — Release build, git'e commit edilmiş debug keystore ile imzalanıyor
`android/app/build.gradle`: `release { signingConfig signingConfigs.debug }`, `android/app/debug.keystore` tracked. Standart, herkesçe bilinen `android`/`androiddebugkey` anahtarı. Uygulama taklit/sahte güncelleme riski ve App Signing anahtar uyuşmazlığı.

---

## 3. Hatalar ve Çökme Riskleri

| # | Önem | Bulgu | Konum |
|---|---|---|---|
| H1 | Yüksek | `TcpSocket.createConnection` çağrısında **timeout yok** — ağ cevap vermezse promise sonsuza dek pending, UI "bağlanıyor" ekranında donar | `src/hooks/useWifiTransport.ts:29-56` |
| H2 | Yüksek | Modül kapsamında `AppState.addEventListener`, `remove()` hiç çağrılmıyor; hata `catch(() => {})` ile yutuluyor | `src/store/useTelemetryStore.ts:124-128` |
| H3 | Yüksek | Aynı olayı dinleyen iki ayrı AppState effect'i, çakışan state güncellemesi riski; `useAppStateGuard` hook'u varken kullanılmıyor | `src/screens/MainApp.tsx:2137, 2237` |
| H4 | Yüksek | 324 `catch` bloğunun **30+'ı tamamen boş**; BLE/OBD katmanında GATT/yazma hataları sessizce kayboluyor, prod teşhisi imkânsızlaşıyor | `BluetoothService.ios.ts:235,434,467,509…`, `BluetoothService.android.ts:244,282,397…`, `useBluetooth.ts:287,320,397,541` |
| H5 | Yüksek | **274 adet `any`** — özellikle socket katmanında (`socket: any`, `data: any`); kütüphane güncellemesi derleme uyarısı vermeden runtime hatasına döner | `useWifiTransport.ts:6,38,47` ve socket handler'ları |
| O1 | Orta | `as unknown as` ile RNBluetoothClassic sonucu zorla cast; sürüm değişiminde `subscription.remove is not a function` | `src/api/BluetoothManager.ts:186,331,354,516` |
| O2 | Orta | Riskli non-null `!`: `map.get(key)!.push()`, `getVerdict()!.map()` | `OemPidRegistry.ts:173`, `PollingOrchestrator.ts:39`, `BatteryTestModal.tsx:355` |
| O3 | Orta | UDS yanıt parse'ında `isNaN` kontrolü yok → bozuk yanıtta `NaN` NRC, sessiz **yanlış tanı** (crash değil, daha tehlikeli) | `src/api/udsProtocol.ts:82-100` |
| O4 | Orta | `BluetoothManager.ts` (609 satır, heartbeat + reconnect + backoff içeren sağlam state machine) **hiçbir üretim dosyasından import edilmiyor** — terk edilmiş refactor; üretim daha zayıf `BluetoothService.*` yolunu kullanıyor | `src/api/BluetoothManager.ts` |
| O5 | Orta | Watchdog 1 sn'de bir `initializeAndCheckEcu()` tetikleyebiliyor, mutex tüm giriş yollarında kontrol edilmiyor → yarış koşulu | `src/hooks/useBluetooth.ts:560-575` |
| O6 | Orta | `ProtocolCircuitBreaker` backoff'unda jitter yok | `src/core/connection/ProtocolCircuitBreaker.ts` |
| D1 | Düşük | `write()` içinde her çağrıda `require()` — muhtemel circular dependency maskeleme | `useWifiTransport.ts:73-75` |

**Metrikler:** `any` 274 · `as unknown as` 6 · non-null `!` 3 · `setInterval` 20 / `clearInterval` 28 · `setTimeout` 68 / `clearTimeout` 37 · `catch` 324 (30+ boş).

---

## 4. Güvenlik ve Gizlilik

Kritik olanlar bölüm 2'de (K1–K3, K6). Kalanlar:

| # | Önem | Bulgu |
|---|---|---|
| G1 | Yüksek | `fault_codes`, `vehicle_models` tablolarında `DISABLE ROW LEVEL SECURITY` — "read-only referans" deniyor ama anon rolü INSERT/UPDATE/DELETE yapabiliyor (`src/api/seeder_schema.sql:26-32`). RLS'i açıp yalnız `SELECT USING (true)` verin, yazma yetkilerini `REVOKE` edin. |
| G2 | Yüksek | `upsert_connection_telemetry` `SECURITY DEFINER` fonksiyonunda `SET search_path` yok (`get_chronic_faults` doğru yapmış) → search_path hijacking riski. |
| G3 | Yüksek | `unverified_device_telemetry.raw_payload` JSONB'de boyut/şema sınırı yok, politika `WITH CHECK (true)` → depolama DoS'u. CHECK constraint + Edge Function arkasına alıp rate limit. |
| G4 | Orta | `HARDENING_SALT` = `'MotoCortexTelemetryHardeningSalt2026_SecureKey!'` derlenmiş bundle'da **düz metin** görünüyor (`index.android.bundle:1020`). `X-MotoCortex-Signature` sahtelenebilir; bu bir güvenlik sınırı değil, sadece gürültü filtresi — öyle isimlendirilmeli. |
| G5 | Orta | `IapBridge.ts:6-14` sabit `OBFUSCATION_SEED`; "decompiler'dan korur" yorumu yanlış güven veriyor. Grace-period doğrulamasını sunucu zaman damgası/nonce ile destekleyin. (Olumlu not: bu modülün 198 satırlık testi var.) |
| G6 | Orta | `eas.json:19-22` içinde Supabase anon key + RevenueCat public key'leri düz metin. Tasarım gereği publishable oldukları için tek başına kritik değil, ama rotasyonu zorlaştırıyor → EAS Secrets'a taşıyın. |

**Gerçek sızıntı bulunmadı:** `google-services.json` / `GoogleService-Info.plist` içindeki Firebase anahtarları public-by-design (yine de Firebase konsolunda paket adı/SHA kısıtı doğrulanmalı). `chat_history/` içindeki `appl_your_ios_api_key` gibi değerler placeholder. `supabase_seeder.js` service_role key'i yalnız `.env`'den okuyor, `.env` `.gitignore`'da.

---

## 5. Mağaza Yayın Hazırlığı

**Yayın engelleyiciler:** K4 (eksik `res/xml`), K5 (sürüm çakışması), K6 (debug keystore).

**Önemli:**

- **Android izin fazlalığı:** `SYSTEM_ALERT_WINDOW`, `READ/WRITE_EXTERNAL_STORAGE` (maxSdkVersion sınırı yok). targetSdk 35'te storage izinleri etkisiz; Play politika taramasını tetikler. Kullanılmıyorsa kaldırın.
- **`BLUETOOTH_SCAN`'de `neverForLocation` yok** (`AndroidManifest.xml:9`) ve `ACCESS_FINE_LOCATION` isteniyor → Play'de "hassas konum verisi" beyanı zorunlu hale geliyor. BLE taraması UUID/isim filtresiyle yapılıyorsa konum izinlerini tamamen kaldırıp bayrağı ekleyin.
- **iOS placeholder izin metinleri:** `NSLocationAlwaysAndWhenInUseUsageDescription` ve `NSLocationAlwaysUsageDescription` şablon metinle duruyor (`Allow $(PRODUCT_NAME) to access your location`) → Guideline 5.1.1 red riski. Uygulama "when in use" kullanıyorsa bu iki anahtarı tamamen silin.
- **Marka adı tutarsızlığı:** `app.json` → "Cortex OBD2 Diagnostic Scanner", iOS `CFBundleDisplayName` → "MotoCortex". Tek ada indirin.
- **İçerik/politika riski:** `TERMS_OF_SERVICE.md` hız limitleyici ayarı, ses jeneratörü override gibi tuning özelliklerinden bahsediyor → Apple Guideline 1.4.1 ek incelemesi. Metinde "yalnızca pist/özel mülk" uyarısı var; bunun **UI'da zorunlu onay kapısı** olarak da bulunması gerekir.
- **Gizlilik/koşullar URL'si** (`motocortex.app/privacy`) mağaza gönderimi öncesi canlı ve erişilebilir olmalı — repo içi dosya yeterli değil.
- `fastlane/Appfile` içindeki `itc_team_id("123456789")` / `team_id("ABCDE12345")` **placeholder** — fastlane submit bu haliyle başarısız olur.

**Olumlu:** targetSdk/compileSdk 35 (Play'in güncel zorunluluğuna uygun) · `feature_graphic.png` 1024×500 ✅ · `play_store_icon.png` 512×512, alfa yok ✅ · PRIVACY_POLICY / TERMS içerikleri OBD'ye özgü riskleri (ECU flash, voltaj, pist kullanımı) gerçekten kapsıyor · "hız > 0 iken tehlikeli komut engelleme" mantığı kodda mevcut ve test edilmiş (`OBD2ProtocolEngine.test.ts:114`) · Demo modu gizli tetikleyici değil, görünür buton.

**Depo hijyeni:** `index.android.bundle` (5.4 MB derlenmiş JS), `debug.keystore`, `chat_history/` (1.2 MB), `onboarding/` (36 MB, mp4 dahil) commit edilmiş; `google-services.json` `.gitignore`'da olmasına rağmen tracked (kural geç eklenmiş). `.easignore` `onboarding/` ve `chat_history/`'yi hariç tutmuyor → her EAS build'e ~20 MB gereksiz içerik gidiyor. `.git` toplam 41 MB.

---

## 6. Test, CI ve Bağımlılıklar

- **CI zayıf** (`.github/workflows/ci.yml`): sadece `tsc --noEmit`, `eslint --if-present`, `jest --passWithNoTests`. `jest.config.js:16-23`'te tanımlı %75-80 coverage eşiği **CI'da hiç denetlenmiyor** (`--coverage` yok). `npm audit` yok, `i18n:strict-build` script'i tanımlı ama pipeline'a bağlanmamış, native derleme doğrulaması yok.
- **Test kapsamı dengesiz:** `src/api`, `core/parser`, `core/protocol`, `core/queue`, `core/security` altında 53 test dosyası — ELM327, ISO-TP, KWP, UDS, J1939, DoIP, SecurityAccess iyi kapsanmış. Buna karşılık **ödeme akışı (`usePurchaseStore`, `Paywall.tsx`, `ContextualPaywallModal.tsx`) için tek bir test yok**; `modules/motocortex-obd` native modülü de kapsam dışı.
- **ESLint aşırı gevşetilmiş** (`.eslintrc.js:9-17`): `no-explicit-any`, `no-unused-vars`, `no-empty`, `prefer-const`, `no-undef` ve — i18n odaklı bir projede — `i18next/no-literal-string` kapalı. `tsconfig.json`'un `strict: true` kazanımını lint seviyesinde büyük ölçüde geri alıyor.
- **Eskimiş bağımlılıklar:** `react-native-purchases` 8.3.3 → 10.6.0 (2 major geride, ödeme katmanı), `@react-native-firebase/*` ^23.8.6 → 26.1.0 (3 major), `react-native-tcp-socket` 6.2.0 → 6.4.2. `tweetnacl` 1.0.3 aktif bakımda değil ve receipt imzalamada kullanılıyor.
- **i18n sağlam:** 26 dil, `en.json` 1535 anahtar, hiçbir dilde eksik anahtar yok. 24 dilde 77 "fazla" anahtar (muhtemelen CLDR çoğul formları), `tr.json` 1555 anahtarla farklı bir sapma gösteriyor — `qa-i18n-audit.js` çıktısıyla doğrulanmalı.
- **Tekrar/ölü içerik:** `.agents/` ve `agents-plain/` neredeyse birebir kopya (`.agents` daha güncel); `landing-page/logo.png` kökteki `logo.png` ile md5-özdeş (1.5 MB tekrar).

---

## 7. Öncelikli Yol Haritası

**Aşama 1 — Build'i düzelt (yayın öncesi zorunlu)**
1. Eksik `res/xml/secure_store_*.xml` dosyalarını ekleyin veya manifest attribute'larını kaldırın.
2. Sürüm numaralarını tek kaynaktan (`app.json` = 1.2.0 / 53) gradle, Info.plist ve pbxproj'a yayın.
3. Gerçek release keystore oluşturup EAS credentials'a taşıyın; `debug.keystore`'u repodan çıkarın.

**Aşama 2 — Arka uç güvenliği**
4. `anonymous_diagnostic_telemetry` RLS + yalnızca INSERT politikası.
5. `fault_codes` / `vehicle_models` RLS açık + salt SELECT; anon'dan yazma yetkilerini REVOKE.
6. Tüm `SECURITY DEFINER` fonksiyonlarına `SET search_path = public`.
7. Edge Function'lara JWT doğrulaması + rate limit + daraltılmış CORS.
8. `verify-entitlement`'ı gerçekten devreye alıp PRO ve tehlikeli komut kapısını sunucuya taşıyın.

**Aşama 3 — Kararlılık**
9. WiFi/TCP bağlantısına 8 sn timeout + `socket.destroy()`.
10. `useTelemetryStore` listener'ını temizleyin, `MainApp`'teki iki AppState effect'ini `useAppStateGuard`'da birleştirin.
11. Boş `catch` bloklarına en az `Logger.warn` ekleyin (BLE/OBD katmanı önceliği).
12. `udsProtocol.ts` parse'ına `Number.isNaN` doğrulaması; riskli `!` kullanımlarını guard'la değiştirin.
13. `BluetoothManager`'ı ya entegre edin ya silin.

**Aşama 4 — Mağaza ve süreç**
14. İzin temizliği (`SYSTEM_ALERT_WINDOW`, storage, konum) + `neverForLocation` + iOS placeholder metinlerin kaldırılması.
15. Marka adını tekilleştirin; gizlilik/koşullar URL'sini canlıya alın; fastlane team ID'lerini doldurun.
16. CI'ya `--coverage`, `npm audit --audit-level=high`, `npm run i18n:strict-build` ekleyin.
17. Ödeme akışı testleri yazın; `react-native-purchases`'ı güncelleyin.
18. Depo hijyeni: bundle/keystore/chat_history/onboarding'i `.gitignore` ve `.easignore`'a alın.

---

## 8. Kapsam Notları

- Bağımlılık kurulumu, derleme, `npm audit` ve cihaz/emülatör testi **yapılmadı**; CVE taraması için gerçek `npm audit` / `osv-scanner` çalıştırılmalı.
- iOS 1024×1024 AppIcon dosyasının alfa kanalı doğrulanamadı — elle kontrol edin.
- `BluetoothManager` entegrasyonunun kasıtlı mı yoksa yanlışlıkla mı devre dışı olduğu koddan anlaşılamadı; ekiple teyit gerekir.
- Native modül (`modules/motocortex-obd`, Swift/Kotlin/C++ ISO-TP) statik olarak sınırlı incelendi.
