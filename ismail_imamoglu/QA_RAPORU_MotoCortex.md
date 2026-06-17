# 🔍 MotoCortex – QA İnceleme Raporu

**İncelenen sürüm:** v1.1.0 (iOS build 40 / Android versionCode 41)
**Bundle ID:** `com.ismail.motocortexv2`
**Platform:** React Native 0.76.9 + Expo SDK 52 (TypeScript)
**Kod büyüklüğü:** ~15.860 satır / 46+ TS dosyası
**İnceleme tarihi:** Haziran 2026
**İnceleme tipi:** Statik kod analizi + yapı/güvenlik denetimi (cihaz/emülatör çalıştırma kapsam dışı – BLE donanımı gerektiriyor)

---

## 1. Uygulama Özeti

MotoCortex; ELM327/OBD2 adaptörleri üzerinden (BLE + Bluetooth Classic) motosiklet ve araçların ECU'suna bağlanan profesyonel bir **canlı teşhis / telemetri** uygulamasıdır.

**Ana yetenekler:**
- Canlı sensör paneli (RPM, hız, hararet, voltaj, gaz kelebeği vb. 14 PID)
- DTC (arıza kodu) okuma/silme, dinamik DTC sözlüğü (chunk'lı, lazy-load)
- Donanım sağlığı, batarya testi, performans (0–100), freeze-frame, osiloskop
- 26 dilde tam yerelleştirme
- RevenueCat ile PRO abonelik (haftalık/aylık/yıllık)
- Supabase telemetri senkronizasyonu + Firebase Crashlytics/Analytics

**Mimari:** Zustand (state) · platform-spesifik servis katmanı (`.ios.ts`/`.android.ts`) · özel responsive ölçek sistemi · özel view-state navigasyon (react-navigation yok).

---

## 2. Genel Değerlendirme

| Kategori | Puan | Not |
|---|---|---|
| Mimari & Yapı | 6/10 | İyi katmanlama ama dev `App.tsx` (2953 satır) |
| Kod Kalitesi | 6/10 | Tutarlı stil, ama test yok, çok fazla `any` |
| Güvenlik | 4/10 | PRO bypass arka kapısı + sırların git'te olması |
| Kararlılık | 5/10 | Error boundary yok, açılışta çökme riski mevcut |
| Yerelleştirme | 7/10 | 26 dil mevcut, ama anahtar tutarsızlıkları var |
| Performans | 6/10 | Lazy-load iyi; dev render yükü riskli |
| **Genel** | **🟡 5.7/10** | Olgun ürün; yayın öncesi kritik düzeltmeler şart |

---

## 3. Bulgular (Önem Sırasına Göre)

### 🔴 KRİTİK

#### K-1 · Açılışta çökme riski – Supabase init
`src/api/supabaseClient.ts` – Ortam değişkenleri build'e enjekte edilmezse `createClient('', '')` **senkron olarak hata fırlatır** ve uygulama açılışta çöker.
> Kanıt: `crash_log.txt` →
> `FATAL EXCEPTION: mqt_native_modules ... Error: supabaseUrl is required ... SupabaseClient@... createClient@...`

Kod yalnızca `console.warn` ile uyarıyor ama yine de boş değerlerle `createClient` çağırıyor (satır 10–17). Bu, gerçekleşmiş bir prodüksiyon çökmesidir.
**Öneri:** Env eksikse `supabase`'i `null` yapan bir guard ekleyin (lazy init), ve tüm tüketicileri null-safe hale getirin. EAS build'de env'in enjekte edildiğini doğrulayın.

#### K-2 · PRO ödeme duvarı arka kapısı (gelir kaçağı)
`src/components/AboutView.tsx:772` – Gizli ekrana **hardcoded şifre** ile girilip PRO 1 yıllığına açılıyor:
```ts
const isCorrect = passwordInput === 'ömerfaruk';
// → AsyncStorage 'bypass_pro' = 'true', expiry = +1 yıl
```
JS bundle **obfuscate edilmediği** için herkes bundle içinde bu şifreyi bulup PRO'yu bedava açabilir. Ayrıca `bypass_pro` düz `AsyncStorage`'da tutulduğundan rootlu/jailbreak'li cihazda kolayca set edilebilir. Tüm entitlement kontrolü istemci taraflı.
**Öneri:** Üretim derlemelerinden bu arka kapıyı kaldırın (en azından `__DEV__` ile sınırlayın). Kritik PRO doğrulamasını sunucu tarafına (RevenueCat webhook / Supabase) taşıyın.

---

### 🟠 YÜKSEK

#### Y-1 · React Error Boundary yok
Projede hiçbir `ErrorBoundary`/`componentDidCatch` yok. 2953 satırlık `App.tsx` ve çok sayıda modalda herhangi bir render hatası tüm uygulamayı beyaz/kırmızı ekrana düşürür.
**Öneri:** Kök bileşeni bir `ErrorBoundary` ile sarıp, hatayı `crashlytics().recordError()` ile kaydedin ve kullanıcıya "yeniden dene" ekranı gösterin.

#### Y-2 · Sırların git deposunda olması
`eas.json` içinde Supabase URL/anon key ve RevenueCat anahtarları düz metin (commit edilmiş). Bunlar "publishable" anahtarlar olsa da en iyi pratik **EAS Secrets** kullanmaktır. `supabaseClient.ts`'deki `HARDENING_SALT` da hardcoded → imza güvenliği "belirsizlikle güvenlik" seviyesinde, kolayca taklit edilebilir.
**Öneri:** Anahtarları EAS Secret'a taşıyın; imzalama gerekiyorsa gerçek sunucu-taraflı doğrulama kullanın.

#### Y-3 · Hiç otomatik test yok
0 unit/integration test, jest yapılandırması yok. Oysa git geçmişi OBD ayrıştırmada tekrarlayan regresyonlar gösteriyor:
> `fix: surgical correction of OBD polling loop and Mode 01 parsing`
> `fix: OBD Parser SAE J2012 refactor, DTC Count Offset, VIN indexOf fix...`
Tam da bu (saf, deterministik) ayrıştırma kodu birim testine en uygun yer.
**Öneri:** En azından `OBDCommandQueue`, DTC parser, `vinDecoder`, `crypto` için Jest birim testleri ekleyin.

#### Y-4 · Özel SHA-256 Unicode'da patlıyor
`src/utils/crypto.ts:45` – `if (charCode > 0xff) throw new Error("Unicode not supported")`. `calculateSessionHash` marka/model'i hash'e katıyor; Türkçe/Çince/Arapça marka adlarında fonksiyon hata fırlatıp **zayıf fallback hash**'e düşüyor → telemetri oturum bütünlüğü bozulur. Ayrıca `generateUuid` `Math.random()` kullanıyor (kriptografik değil).
**Öneri:** `expo-crypto`'nun yerel `digestStringAsync` (SHA-256) fonksiyonunu kullanın (zaten bağımlılıkta var); UTF-8 güvenli.

---

### 🟡 ORTA

- **O-1 · Dev `App.tsx` (2953 satır):** `MainApp` içinde 17 `useEffect` + 27 `useState`. Bakım, test ve performans (gereksiz re-render) açısından risk. Ekranları ayrı dosyalara/`react-navigation`'a bölmek önerilir.
- **O-2 · i18n anahtar tutarsızlığı:** Yerel dosyalar arasında anahtar sayıları farklı (kabaca: en≈2242, tr≈2258, de/es≈2228). Bazı dillerde eksik/fazla anahtar → İngilizce'ye fallback veya boş metin riski. Yapısal bir anahtar-diff denetimi yapın (`scripts/` altında zaten sync betikleri var, CI'a bağlayın).
- **O-3 · New Architecture kapalı:** `newArchEnabled: false`. RN 0.76/Expo 52'de eski mimari kullanım sonu yaklaşıyor; gelecekteki SDK yükseltmeleri migrasyon gerektirecek (bazı BLE/bluetooth-classic kütüphaneleri engel olabilir).
- **O-4 · Zayıf tip güvenliği:** `strict:true` olmasına rağmen sadece `App.tsx`'te 41 adet `: any`. Tip güvenliğini zayıflatıyor.
- **O-5 · Üretimde `console.log`:** Yalnızca `App.tsx`'te 36 adet. Üretim build'inde `babel-plugin-transform-remove-console` ile temizlenmeli.
- **O-6 · Hata maskeleme:** Birçok `catch` bloğu hatayı sadece `console.error` ile "sessizce maskeliyor" (RevenueCat listener, AppState). Kararlılık için iyi ama gerçek hatalar Crashlytics'e düşmüyor → `crashlytics().recordError(e)` ekleyin.

---

### 🟢 DÜŞÜK / Gözlemler

- **D-1 · İkon yerine emoji:** UI'da 🚨⚠🛡️⚙️👑📊 gibi emoji'ler ikon olarak kullanılıyor → platformlar arası tutarsız render ve erişilebilirlik sorunu. Vektör ikon seti önerilir.
- **D-2 · Erişilebilirlik:** `allowFontScaling=false` global olarak kapatılmış (layout'u korumak için bilinçli ama OS metin ölçeklemeyi devre dışı bırakıyor → görme engelli kullanıcı dezavantajı).
- **D-3 · Gizli debug modalları:** 5-dokunuşluk gizli debug/secret menüler var; üretimde gated olduklarından emin olun.
- **D-4 · `Paywall.tsx` mock yolu:** `USE_MOCK_DATA=false` olduğundan `setIsPro(true)` mock satırları (202/277) üretimde etkisiz – sorun değil, sadece not.

---

## 4. Güçlü Yönler ✅

- Platform-spesifik `BluetoothService.ios.ts` / `.android.ts` ile temiz soyutlama.
- DTC sözlüğünün chunk'lara bölünüp lazy-load edilmesi (bundle/bellek dostu).
- 26 dilde tam yerelleştirme – uluslararasılaşma olgunluğu yüksek.
- Çevrimdışı-toleranslı entitlement: çevrimdışıyken kullanıcıyı kilitlemiyor (iyi UX kararı).
- Kritik teşhis/telemetri döngüsü sırasında PRO iptalini erteleyen "atomic operation guard" – düşünülmüş UX.
- Zustand `persist` + `partialize` ile temiz durum hijyeni.
- `patch-package` ile native modül yamaları yönetiliyor.
- Crashlytics + Analytics entegre, programatik olarak zorla etkinleştirilmiş.

---

## 5. Önerilen Aksiyon Planı (öncelik sırası)

1. **[K-1]** Supabase init guard → açılış çökmesini kapat. *(yayın engelleyici)*
2. **[K-2]** PRO arka kapısını kaldır / sunucu doğrulaması ekle. *(gelir koruması)*
3. **[Y-1]** Kök `ErrorBoundary` + Crashlytics kaydı ekle.
4. **[Y-4]** `expo-crypto` SHA-256'ya geç (Unicode güvenliği).
5. **[Y-3]** OBD parser + crypto + vinDecoder için Jest birim testleri.
6. **[Y-2]** Sırları EAS Secrets'a taşı.
7. **[O-2]** CI'da i18n anahtar-diff denetimi.
8. **[O-1]** `App.tsx`'i kademeli olarak ekran modüllerine böl.

---

*Bu rapor statik analiz ve yapı denetimine dayanır. BLE donanımı gerektiren canlı OBD akışı, satın alma akışı ve gerçek cihaz çökme senaryoları fiziksel cihaz testiyle ayrıca doğrulanmalıdır.*
