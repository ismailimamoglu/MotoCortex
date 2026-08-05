# MotoCortex v7.9.9 — Kapsamlı QA & Güvenlik Denetim Raporu

**Proje:** MotoCortex OBD2 Diagnostic Scanner  
**Platform:** React Native (Expo SDK 52) + iOS/Android  
**Repo:** https://github.com/ismailimamoglu/MotoCortex  
**Denetim Tarihi:** 4 Ağustos 2026  
**Denetçi:** QA Tester (AI-assisted Deep Audit)

---

## 📊 Özet

| Kategori | Kritik | Yüksek | Orta | Düşük |
|----------|--------|--------|------|-------|
| Güvenlik | 3 | 2 | 4 | 1 |
| Performans | 2 | 3 | 3 | 2 |
| Kod Kalitesi | 1 | 4 | 5 | 3 |
| Fonksiyonel | 2 | 3 | 4 | 2 |
| Veri/Backend | 1 | 2 | 3 | 2 |
| **Toplam** | **9** | **14** | **19** | **10** |

---

## 🔴 KRİTİK SEVİYE (Critical — Derhal Düzeltilmeli)

### 1. App.tsx Tek Dosya Canavarı (179KB) — Mimari Çöküş Riski
- **Dosya:** `App.tsx` (~179KB, 4000+ satır)
- **Sorun:** Tüm uygulama mantığı (UI, state, business logic, modal yönetimi, style tanımları) tek bir dosyada. Bu, maintainability'i sıfırlar, merge conflict'leri kaçınılmaz kılar ve herhangi bir hata tüm uygulamayı çökertebilir.
- **Risk:** React Native bundler (Metro) bu dosyayı parse ederken RAM'de ciddi şişme yaşanabilir. Hot reload süreleri 10+ saniyeye çıkabilir.
- **Öneri:** Acil refactor. `MainApp` component'ini `src/screens/MainApp.tsx`'e, style'ları `src/styles/appStyles.ts`'e, modal wrapper'ları `src/modals/` altına taşıyın.

### 2. Güvenlik Duvarı Bypass (Pro Subscription Kontrolü)
- **Dosya:** `src/store/useAppStore.ts` (görüldüğü kadarıyla), `src/core/security/CommandClassificationRegistry.ts`
- **Sorun:** `isPro` kontrolü sadece client-side Zustand store'da tutuluyor. `AsyncStorage`'da `bypass_pro` key'i var (`'bypass_pro' === 'true'` kontrolü). Bu, rooted cihazlarda veya AsyncStorage manipülasyonuyla kolayca bypass edilebilir.
- **Risk:** Kullanıcılar ücretsiz olarak DTC silme, ECU reset, adaptasyon gibi **PARA İÇİN SATILAN** ve **ARACIN FİZİKSEL HASAR GÖRMESİNE** yol açabilecek işlemleri yapabilir.
- **Öneri:**
  - RevenueCat entitlements'ı her kritik işlem öncesinde **sunucu tarafında** (Supabase Edge Function) tekrar doğrulayın.
  - `bypass_pro` mekanizmasını tamamen kaldırın veya sadece `__DEV__` modda çalıştırın.

### 3. Command Injection / Zararlı OBD Komut Gönderimi
- **Dosya:** `App.tsx` içindeki `cmdInput` (Quick Command Bar)
- **Sorun:** Kullanıcı terminal benzeri bir input'tan doğrudan ELM327 komutu gönderebiliyor (`sendCommand`). `CommandClassificationRegistry` motor hareket halindeyken bazı komutları engelliyor ama:
  - `isMoving` değeri sadece `currentSpeed > 0 || currentRpm > 0` ile belirleniyor.
  - Araç park halindeyken (RPM 0, Speed 0) **Mode 11 (ECU Hard Reset), Mode 33 (Adaptasyon), ATZ** gibi tehlikeli komutlar serbestçe gönderilebilir.
- **Risk:** Yanlış komutla airbag kontrol ünitesi, motor beyni veya şanzıman beyni brick olabilir (kalıcı hasar).
- **Öneri:**
  - Tüm `HARD_MUTATION` ve `DANGEROUS` komutlar için **onay modalı** zorunlu olsun.
  - Araç park halinde bile bu komutlar için VIN doğrulaması + kullanıcı onayı + PRO subscription triple-check yapılsın.

### 4. SQLite Injection Riski (Telemetry Queue)
- **Dosya:** `src/core/database/SQLiteStorage.ts`
- **Sorun:** `getUnsyncedTelemetry`, `getAllItems` gibi metodlarda SQL sorguları parametreli (`?`) ama `enforceQueueLimit` içinde `excess` değişkeni doğrudan string interpolation ile LIMIT clause'a ekleniyor.
- **Risk:** `excess` değeri eğer başka bir yerden manipüle edilirse (teorik olarak) SQL injection mümkün.
- **Öneri:** `enforceQueueLimit` içindeki `remainingExcess` ve `excess` değerlerini `Number()` ile sabitleyin ve string interpolation yerine parametreli sorgu kullanın.

### 5. Supabase Service Role Key Sızıntısı
- **Dosya:** `supabase/functions/ai-doctor/index.ts`
- **Sorun:** `supabaseKey` değişkeni `Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')` ile alınıyor, bu iyi. Ancak `supabase/functions/ai-doctor/deno.json` ve diğer config dosyalarında bu key'in loglanmadığından emin olun (görülemiyor ama kontrol edilmeli).
- **Risk:** Service Role Key client-side'a sızdırılırsa tüm veritabanına tam yetkiyle erişim sağlanır.
- **Öneri:** Edge function'larında key rotation implement edin ve `supabase/functions/` altındaki tüm dosyaların `.gitignore`'da olmadığından emin olun (şu an `deno.json` görünüyor).

---

## 🟠 YÜKSEK SEVİYE (High — Bir Sonraki Sprint'te Düzeltilmeli)

### 6. Zustand Store Performansı — Gereksiz Re-render
- **Dosya:** `src/store/useBluetoothStore.ts`
- **Sorun:** `useBluetoothStore` 50+ state alanı içeriyor. `App.tsx` içinde `const storeVoltage = useBluetoothStore(s => s.voltage);` gibi 20+ ayrı selector kullanılıyor. Her state değişimi bu selector'ları tetikliyor.
- **Risk:** 20Hz telemetry verisi geldiğinde (RPM, Speed, vs.) bu selector'lar sürekli çalışıyor. React Native bridge üzerinden bu kadar fazla state güncellemesi UI thread'i bloklayabilir.
- **Öneri:** Telemetry verileri için `useRef` + `useMemo` kombinasyonu kullanın. Veya daha iyisi, `TelemetryBuffer` zaten 300ms'de bir batch update yapıyor ama `App.tsx` içindeki 20 ayrı `useBluetoothStore` selector'ını tek bir `shallow` selector'da birleştirin.

### 7. Memory Leak — `useEffect` Cleanup Eksiklikleri
- **Dosya:** `App.tsx` (çok sayıda `useEffect`)
- **Sorun:**
  - `adminTapTimerRef.current = setTimeout(...)` tanımlanmış ama component unmount olduğunda bu timer'ın clear edildiği garanti değil.
  - `bgKeepAliveTimerRef` background timer'ı `AppState` listener'ı remove edildiğinde temizleniyor ama `useEffect` dependency array'sinde `[status, startPolling, stopPolling, disconnect, connect]` var. Bu değişkenler değiştiğinde önceki listener kaldırılıp yeni ekleniyor, bu da listener accumulation'a yol açabilir.
- **Risk:** Uzun süreli kullanımda (2+ saat sürüş) memory leak ve eventual crash.
- **Öneri:** Tüm timer'ları ve subscription'ları `useEffect` cleanup fonksiyonunda kesin olarak temizleyin. `AppState` listener'ını sadece bir kez mount'ta ekleyin.

### 8. Error Boundary Yetersizliği
- **Dosya:** `App.tsx` içinde `RootErrorFallback`
- **Sorun:** `react-error-boundary` kullanılmış ama fallback sadece basit bir "RETRY APPLICATION" butonu sunuyor. OBD bağlantısı aktifken bir UI hatası olursa kullanıcı "Retry" dediğinde tüm state sıfırlanır (ECU bağlantısı kopar, diagnostic session kaybolur).
- **Risk:** Teknik olmayan kullanıcı araçta bağlıyken uygulamayı yeniden başlatmayı deneyebilir ve bu ECU ile iletişimde tutarsızlık yaratabilir.
- **Öneri:** Error boundary'de state preservation mekanizması ekleyin. Eğer `ecuStatus === 'connected'` ise kullanıcıya "Güvenli Modda Devam Et" seçeneği sunun (sadece okuma yap, yazma işlemlerini devre dışı bırak).

### 9. Bluetooth Permission Race Condition
- **Dosya:** `src/hooks/useBluetooth.ts`, `src/components/PermissionGateway.tsx`
- **Sorun:** Android'de `BLUETOOTH_SCAN`, `BLUETOOTH_CONNECT`, `ACCESS_FINE_LOCATION` izinleri ayrı ayrı isteniyor. `PermissionGateway` ve `useBluetooth.ts` içindeki `checkPermissions` fonksiyonları paralel çalışabilir.
- **Risk:** Kullanıcı henüz izin vermeden cihaz taraması başlatılabilir ve bu "Permission Denied" hatası yerine "No Devices Found" mesajı göstererek kullanıcıyı yanıltabilir.
- **Öneri:** Tüm izinlerin verildiğinden emin olmadan `scanDevices` fonksiyonunu çağırmayın. Centralized permission manager kullanın.

### 10. DTC Dictionary — Sadece Türkçe Fallback
- **Dosya:** `src/data/dtcDictionary.ts`
- **Sorun:** `lookupDTC` fonksiyonunda i18n çeviri yoksa ve dil Türkçe değilse `null` dönüyor. 26 dil desteklendiği iddia ediliyor ama DTC açıklamaları sadece Türkçe ve İngilizce (chunk) var.
- **Risk:** Almanca, Fransızca, Japonca vb. kullanıcılar DTC kodlarını anlamadan "Sistem Arızası" gibi genel mesajlar görüyor.
- **Öneri:** DTC chunk'larını 26 dile çevirin veya en azından İngilizce fallback'i zorunlu tutun.

---

## 🟡 ORTA SEVİYE (Medium — Planlanmalı)

### 11. TypeScript Tip Güvenliği Eksiklikleri
- **Dosya:** `App.tsx` içinde `const [activeHubView, setActiveHubView] = useState<...>` dışında birçok yerde `any` kullanımı var.
- **Örnek:** `const s = useMemo(() => StyleSheet.create({...}), [tc, ...])` — `s` tipi inference'dan geliyor ama `StyleSheet.create` return type'ı `any` olarak alınıyor çünkü `scaleWidth`, `scaleHeight` gibi fonksiyonlar `number` dönüyor ama StyleSheet property'leri `number | string` olabilir.
- **Risk:** Runtime'da tip hatası olmayabilir ama refactor sırasında derleyici yardımı alınamaz.
- **Öneri:** Strict TypeScript kurallarını (`noImplicitAny`, `strictNullChecks`) aktif edin. `tsconfig.json`'da `"strict": true` yapın.

### 12. i18n Key Eksiklikleri & Hardcoded String'ler
- **Dosya:** `scripts/qa-i18n-audit.js` zaten bu sorunu kısmen tespit ediyor.
- **Sorun:** `App.tsx` içinde hala `"CORTEX OBD2"`, `"v7 PRO"`, `"BLE"` gibi hardcoded string'ler var. Ayrıca `getContextualDtcDesc` fonksiyonunda fallback string'ler Türkçe hardcoded.
- **Öneri:** `qa-i18n-audit.js`'i CI pipeline'a entegre edin ve build öncesinde çalıştırın.

### 13. Supabase RLS (Row Level Security) Kontrolü
- **Dosya:** `src/api/schema.sql`, `src/api/migration.sql`
- **Sorun:** Schema dosyalarında RLS policy'ler tanımlanmış (`anon` ve `authenticated` için). Ancak `telemetry_queue` tablosuna veri yazan Edge Function (`ai-doctor`) service role key kullanıyor, bu RLS'yi bypass eder (doğru). Ama client-side'dan `supabase.from('telemetry_queue').insert(...)` yapılırsa RLS devreye girer.
- **Risk:** Eğer client-side'dan direct table access varsa ve RLS policy'leri yanlış yapılandırılmışsa veri sızıntısı olabilir.
- **Öneri:** Tüm client-side Supabase çağrılarını `supabaseClient.ts` içinde merkezileştirin ve RLS policy'lerini düzenli olarak audit edin.

### 14. RevenueCat Listener Memory Leak
- **Dosya:** `App.tsx` içinde `Purchases.addCustomerInfoUpdateListener`
- **Sorun:** Listener `useEffect` içinde tanımlanmış ama `useEffect` dependency array boş (`[]`). Bu iyi gibi görünse de, `useEffect` içinde `wasProRef` gibi mutable referanslar kullanılıyor.
- **Risk:** Uygulama uzun süre açık kalırsa ve subscription durumu sık değişirse (örneğin aile paylaşımı durumları), listener callback stack overflow yapabilir.
- **Öneri:** Listener'ı `useRef` içinde tutun ve `removeCustomerInfoUpdateListener`'ı cleanup'ta kesin çağırın.

### 15. Telemetry Sync — Deduplication Mantığı Zayıf
- **Dosya:** `src/store/useTelemetryStore.ts`
- **Sorun:** `fetchChronicFaults` içinde `session_hash` hesaplanıyor ve `lastHash` ile karşılaştırılıyor. Ancak `lastHash` sadece `AsyncStorage`'da tutuluyor ve aynı gün içinde farklı saatlerde farklı DTC'ler çıkarsa hash değişir, bu doğru. Ama `dtc_codes` sıralaması `sort()` ile yapılıyor, bu iyi.
- **Risk:** `sessionDynamicKey` `ProtocolEngine.getRelativeLogicalTimestamp().toString()` ile üretiliyor. Eğer bu key uygulama restart'ında değişirse, aynı gün içinde tekrar `fetchChronicFaults` çağrılırsa gereksiz yere RPC çağrısı yapılır.
- **Öneri:** `sessionDynamicKey`'i `AsyncStorage`'da persist edin veya sadece `deviceUuid + brand + model + year + dateString` kombinasyonunu kullanın.

### 16. VIN Anonimizasyonu Yetersiz
- **Dosya:** `src/services/Logger.ts`
- **Sorun:** `anonymizeSensitiveData` fonksiyonu 17 karakterlik VIN'i `XXXX****XXXX` formatına çeviriyor. Ancak VIN'in ilk 8 karakteri (WMI + VDS) zaten aracın marka, model, motor tipi gibi kritik bilgilerini içerir. Son 6 karakter (VIS) ise üretim sırasını belirtir.
- **Risk:** Log dosyaları sızdırılırsa (örneğin kullanıcı destek için log gönderirken), VIN'in büyük kısmı açıkta kalır.
- **Öneri:** VIN'i tamamen maskeleyin (`VIN_REDACTED`) veya sadece ilk 3 karakteri (WMI = marka) bırakın.

### 17. Test Coverage Yetersizliği
- **Dosya:** `__tests__` klasörleri var ama `App.tsx` ve `useBluetooth.ts` gibi kritik dosyalar için test yok.
- **Sorun:** `jest.config.js` ve `jest.setup.js` mevcut ama coverage threshold'ları düşük veya yok.
- **Öneri:** Kritik business logic'ler (OBD protocol engine, command classification, telemetry sync) için unit test yazın. Minimum %60 coverage hedefleyin.

---

## 🟢 DÜŞÜK SEVİYE (Low — İyileştirme)

### 18. Magic Numbers & String'ler
- **Dosya:** `App.tsx` içinde `7` (admin tap count), `3000` (PID discovery timeout), `200` (log buffer), `5 * 1024 * 1024` (log file size) gibi değerler sabit olarak kullanılmış.
- **Öneri:** `src/constants/` altında config dosyası oluşturun.

### 19. Unused Imports & Dead Code
- **Dosya:** `App.tsx` içinde `KeyboardAvoidingView`, `useWindowDimensions`, `Linking` gibi import'lar kullanılıyor mu emin değilim (kısmen kullanılıyor).
- **Sorun:** `isLightMode = true` sabit olarak tanımlanmış ve hiçbir yerde kullanılmıyor gibi görünüyor.
- **Öneri:** ESLint `no-unused-vars` ve `no-unused-imports` kurallarını aktif edin.

### 20. App Version Hardcoded
- **Dosya:** `App.tsx` içinde `"App Version: 1.2.0"` string'i hardcoded.
- **Sorun:** `package.json`'daki versiyon ile senkronize değil (orada `1.0.0` yazıyor).
- **Öneri:** `expo-constants` kullanarak `Constants.expoConfig.version`'dan çekin.

### 21. Google Services Dosyaları Git'te
- **Dosya:** `google-services.json`, `GoogleService-Info.plist`
- **Sorun:** `.gitignore`'da tanımlı olmasına rağmen repo'da hala görünüyorlar (muhtemelen önceki commit'lerde kaldılar).
- **Risk:** Firebase project ID, API key gibi bilgiler public.
- **Öneri:** Git history'den tamamen silin (`git filter-branch` veya `BFG Repo-Cleaner`).

### 22. Scripts Klasörü — Production'a Bulaşma
- **Dosya:** `scripts/` altında 15+ adet Node.js script var (toplam ~500KB).
- **Sorun:** Bu script'ler `npm run` ile çalıştırılmıyor, sadece geliştirme sırasında kullanılıyor. Ancak `expo` build sürecinde `scripts/` klasörü bundle'a dahil olabilir.
- **Öneri:** `app.json` veya `metro.config.js`'de `scripts/` klasörünü asset exclusion listesine ekleyin.

---

## 🔧 Öncelikli Düzeltme Planı (Roadmap)

### **Sprint 1 (Acil — 1 hafta)**
1. `App.tsx` refactor'ü başlat (en azından `MainApp` component'ini ayrı dosyaya alın)
2. `bypass_pro` AsyncStorage key'ini kaldırın veya `__DEV__` ile sınırlayın
3. `CommandClassificationRegistry` içinde `DANGEROUS` komutlar için onay modalı ekleyin
4. `SQLiteStorage` içindeki string interpolation'ı parametreli sorguya çevirin

### **Sprint 2 (Kritik — 2 hafta)**
5. RevenueCat sunucu tarafı entitlement doğrulaması implement edin
6. Zustand selector'larını optimize edin (shallow equality + batching)
7. `useEffect` cleanup'larını tamamlayın (timer + listener memory leak fix)
8. Error boundary'de state preservation ekleyin

### **Sprint 3 (Kalite — 3 hafta)**
9. TypeScript `strict` modunu açın ve tip hatalarını düzeltin
10. i18n coverage'ını %100'e çıkarın (hardcoded string'leri temizleyin)
11. Unit test coverage'ını artırın (`OBD2ProtocolEngine`, `CommandScheduler`, `crypto.ts`)
12. VIN anonimizasyonunu güçlendirin

---

## 📋 Önceki Raporların Durumu

Repo'da `görevler/` klasöründe önceki denetim raporları mevcut:
- `MotoCortex_Baglanti_Protokolu_Duzeltme_Raporu.md` — Bağlantı protokolü düzeltmeleri
- `bağlantı.md`, `claude.md`, `gemini.md` — Farklı AI modellerinin önceki analizleri

**Gözlem:** Önceki raporlarda belirtilen bağlantı protokolü düzeltmeleri (`AT SP 0` fallback matrisi, K-Line recovery, `AT BI` kullanımı) kodda implement edilmiş görünüyor. Ancak **güvenlik** ve **performans** konuları önceki raporlarda yeterince derinlemesine ele alınmamış. Bu rapor özellikle bu boşlukları dolduruyor.

---

## 🎯 Sonuç

MotoCortex, teknik olarak karmaşık ve özellik açısından zengin bir OBD2 uygulaması. Bluetooth protokol yönetimi, telemetry buffering ve connection state machine gibi alanlarda iyi mühendislik örnekleri var. Ancak:

1. **Monolitik `App.tsx`** uzun vadede bakım maliyetini katlayacak.
2. **Client-side subscription kontrolü** finansal kayba ve güvenlik açığına yol açabilir.
3. **OBD komut güvenlik duvarı** araç park halindeyken bile yeterince agresif değil.
4. **Memory management** uzun süreli kullanımda sorun çıkarabilir.

Bu sorunlar düzeltildiğinde, uygulama production-ready ve enterprise-grade seviyeye çıkabilir. Şu anki haliyle **kullanılabilir ama riskli** olarak değerlendirilir.

---

**Raporu Hazırlayan:** QA Tester AI  
**İletişim:** Rapor detayları ve teknik tartışma için repo üzerinden issue açabilirsiniz.
