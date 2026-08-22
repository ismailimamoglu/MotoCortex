# MotoCortex — Production Pre-Release Audit Report

## Executive Summary

MotoCortex'un GitHub'daki mevcut `main` branch'i, production release adayı gözüyle; Apple App Store ve Google Play Store uyumluluğu, Bluetooth/OBD2 resilience, telemetry lifecycle, memory/performance, 26-language UI ve ECU coding safety açısından değerlendirildi.

### Overall Release Readiness: 78/100

| Alan | Skor | Durum |
|---|---:|---|
| Apple App Store compliance | 72/100 | 🟠 Riskli |
| Google Play compliance | 80/100 | 🟡 İyileştirilmeli |
| Bluetooth/OBD resilience | 84/100 | 🟢 İyi |
| ECU coding safety | 88/100 | 🟢 Güçlü |
| Telemetry/performance | 80/100 | 🟡 Doğrulama gerekli |
| Memory/lifecycle | 78/100 | 🟡 Riskli alanlar var |
| 26-language UI | 86/100 | 🟢 İyi |
| Small-screen/responsive UI | 70/100 | 🟠 Fiziksel cihaz testi şart |
| Automated testing | 90/100 | 🟢 Güçlü |
| Release configuration | 72/100 | 🟠 Kritik kontroller gerekli |

## Release Kararı

### 🔴 Mevcut haliyle production'a gönderilmesi önerilmiyor.

Kod mimarisi önceki versiyonlara göre ciddi şekilde olgunlaşmış durumda. Özellikle üç katmanlı bağlantı durumu, polling/coding ayrımı, clone adapter güvenliği ve safety registry olumlu.

Ancak store compliance tarafındaki birkaç konfigürasyon seçimi ve fiziksel cihaz testleri tamamlanmadan release önerilmemektedir.

---

# 1. Critical Blockers — Release Öncesi Düzeltilmeli

## BLOCKER #1 — iOS Background Bluetooth

`app.json` içinde iOS için `bluetooth-central` capability bulunuyor ve açıklamada arka planda/screen-off durumunda canlı monitoring ve real-time alerts ifade ediliyor.

### Risk

Reviewer cihazında:

1. OBD adapter bağlanır.
2. App background'a alınır.
3. Telemetry devam etmeye çalışır.
4. BLE bağlantısı beklenmedik şekilde kesilir.
5. Recovery loop oluşursa uygulamanın background davranışı beklendiği gibi çalışmayabilir.

Bu, "background Bluetooth functionality does not work as described" türünde App Review riski oluşturabilir.

### Öneri

Background Bluetooth core feature değilse iOS `bluetooth-central` capability'si kaldırılmalı.

Core feature olarak kalacaksa gerçek cihaz üzerinde:

- background disconnect
- app suspend/resume
- adapter power loss
- BLE reconnect
- queue cancellation

testleri yapılmalı.

---

# 2. BLOCKER — Android Permission Set

Mevcut permission set içinde:

- `BLUETOOTH`
- `BLUETOOTH_ADMIN`
- `BLUETOOTH_CONNECT`
- `BLUETOOTH_SCAN`
- `ACCESS_FINE_LOCATION`
- `BLUETOOTH_ADVERTISE`

gibi permission'lar bulunuyor.

## Özellikle `BLUETOOTH_ADVERTISE`

MotoCortex'un temel kullanımında telefonun Bluetooth üzerinden kendisini advertise etmesi gerekmiyorsa bu permission gereksizdir.

## `ACCESS_FINE_LOCATION`

Android'in eski Bluetooth scanning modelinden kalan gereksinimlerle güncel Android permission modelinin ayrıştırılması gerekiyor.

### Önerilen Android 12+ minimum set

```text
BLUETOOTH_SCAN
BLUETOOTH_CONNECT
```

Eğer kullanılmıyorsa:

```text
BLUETOOTH_ADVERTISE
```

kaldırılmalı.

Aynı şekilde eski Bluetooth permission'ları ve location permission'ı gerçekten gerekli değilse kaldırılmalı.

---

# 3. BLOCKER — react-native-ble-plx Background Configuration

Şu configuration bulunuyor:

```json
{
  "isBackgroundEnabled": true,
  "modes": ["central"]
}
```

Bu, iOS background Bluetooth capability'si ile birlikte değerlendirilmelidir.

Production'da önerilen davranış:

```text
BACKGROUND
    ↓
Telemetry → mümkünse durdur
Diagnostics → durdur
ECU Coding → kesinlikle durdur
Queue → freeze/cancel
BLE connection → kontrollü lifecycle
```

Özellikle ECU WRITE işlemi background'da devam etmemelidir.

Bu hem App Store compliance hem de functional safety konusudur.

---

# 4. BLOCKER — Paywall Compliance

RevenueCat/IAP altyapısı mevcut. Ancak paywall ekranında aşağıdaki öğelerin tüm platformlarda ve tüm satın alma akışlarında açıkça görünmesi release öncesi doğrulanmalıdır:

```text
Weekly
Monthly
Yearly

What you get...

Restore Purchases

Privacy Policy
Terms of Use / EULA
Manage Subscription
```

Özellikle `Restore Purchases` kullanıcı tarafından kolay erişilebilir olmalıdır.

---

# 5. BLOCKER — ECU Coding Safety Disclaimer

README'de ECU coding ile ilgili disclaimer bulunması olumlu; ancak README'deki disclaimer tek başına yeterli değildir.

ECU write işleminden hemen önce UI safety gate bulunmalıdır.

Önerilen akış:

```text
Vehicle Connected
       ↓
ECU Identified
       ↓
Battery Voltage Check
       ↓
Adapter Safety Check
       ↓
Feature Risk Classification
       ↓
Safety Warning
       ↓
User Confirmation
       ↓
ECU WRITE
```

Kritik uyarılar:

```text
DO NOT TURN OFF IGNITION
DO NOT DISCONNECT ADAPTER
DO NOT START ENGINE
MAINTAIN STABLE BATTERY VOLTAGE
```

---

# 6. Bluetooth Mimarisi

`useBluetoothStore` içinde bağlantı durumlarının ayrıştırılması olumlu:

```text
status
adapterStatus
ecuStatus
```

Ayrıca:

```text
isDiagnosticMode
isAdaptationRunning
isPollingActive
isAtomicOperationRunning
```

gibi operasyon durumları bulunuyor.

Bu, önceki tek `isConnected` yaklaşımından çok daha doğru.

### Mimari değerlendirme

**8.5/10**

Önerilen model:

```text
Physical connection
       ↓
Adapter session
       ↓
ECU session
       ↓
Polling
       ↓
Diagnostic/Coding
```

---

# 7. Clone ELM327 Güvenliği

Adapter tier yaklaşımı olumlu:

```text
TIER_1_PRO
TIER_2_STANDARD
TIER_3_UNSAFE
```

Sahte ELM327 v2.1 cihazlarda write işlemlerinin engellenmesi önemli bir safety katmanı.

Ancak clone detection yalnızca device name'e dayanmamalıdır.

Daha güvenilir yaklaşım:

```text
device identity
+
capability probe
+
response behavior
+
protocol behavior
+
timing
```

---

# 8. OBD Parser Negatif Test Matrisi

Production öncesinde aşağıdaki cevapların tamamı test edilmelidir:

```text
NO DATA
STOPPED
SEARCHING...
BUS INIT...
BUS ERROR
CAN ERROR
BUFFER FULL
UNABLE TO CONNECT
?
ERROR
TIMEOUT
OK
```

Normal cevaplar:

```text
41 0C 1A F8
```

Corrupted/truncated/frame-header durumları:

```text
41
41 0C
41 0C ZZ
41 0C 1A
00 00 41 0C 1A F8
7E8 06 41 0C 1A F8
0: 41 0C ...
1: ...
```

Bu testler daha önce görülen frame header kalıntılarının tekrar oluşmasını önlemek için önemlidir.

---

# 9. ECU Coding — Fiziksel Bağlantı Kopması

Bu test release blocker seviyesindedir.

### Test senaryosu

```text
ECU Coding başladı
      ↓
%35
      ↓
OBD adapter çıkarıldı
```

### Beklenen

```text
WRITE ABORTED
     ↓
TRANSPORT LOST
     ↓
QUEUE CANCEL
     ↓
POLLING STOP
     ↓
BLE TEARDOWN
     ↓
UI SAFE STATE
```

### Beklenmeyen

```text
retry
retry
retry
retry
...
```

veya:

```text
Unhandled Promise Rejection
```

veya:

```text
setState after unmount
```

Bu test gerçek cihaz + gerçek ECU üzerinde yapılmalıdır.

---

# 10. Telemetry Polling

Store'da polling state'inin ayrı tutulması olumlu:

```text
isPollingActive
```

Ancak production audit açısından tüm polling kaynaklarının merkezi olarak kapatıldığı doğrulanmalıdır.

Kontrol edilmesi gereken kaynaklar:

```text
setInterval
setTimeout recursive
requestAnimationFrame
BLE monitor subscription
DeviceEventEmitter
NetInfo listener
AppState listener
```

Her lifecycle kaynağının cleanup mekanizması bulunmalıdır.

Örnek:

```ts
setInterval(...)
clearInterval(...)
```

```ts
setTimeout(...)
cancellation/token
```

```ts
monitorCharacteristicForDevice(...)
subscription.remove()
```

---

# 11. Telemetry State Churn

Store çok sayıda telemetry field taşıyor:

```text
rpm
coolant
speed
throttle
voltage
engineLoad
intakeAirTemp
manifoldPressure
...
```

UI componentleri geniş selector kullanıyorsa her PID cevabında gereksiz rerender oluşabilir.

Öneri:

```ts
useBluetoothStore(
  state => state.rpm
)
```

veya uygun shallow selector yaklaşımı.

Ayrıca transport polling rate ile UI render rate ayrılmalı.

Örnek hedef:

```text
ECU/Transport: 10–20 Hz
UI rendering: 5–10 Hz
```

---

# 12. Test Altyapısı

README'de:

```text
56 test suites
401 tests passed
```

bildiriliyor.

Package scripts içinde:

```text
test
test:heavy
coverage
i18n:strict-build
lint
```

bulunması olumlu.

Ancak 401 passing test tek başına hardware readiness kanıtı değildir.

Eksik/öncelikli kategori:

```text
adapter unplug
BLE disconnect
ECU timeout
ignition off
voltage drop
adapter reset
BT disabled
phone lock
app background
app killed
```

---

# 13. 26 Dil ve Responsive UI

README'de 26 locale / 1,813 translation key seviyesinde localization altyapısı bulunması güçlü bir noktadır.

Ancak:

> Translation key'lerinin eksiksiz olması ≠ layout'un fiziksel olarak eksiksiz olması.

Özellikle şu diller test edilmelidir:

```text
German
Dutch
Polish
Russian
Greek
Arabic
Hindi
Japanese
Chinese
```

---

# 14. Small-Screen Test Matrisi

Release öncesinde fiziksel/emülatör testleri:

## iOS

```text
iPhone SE
iPhone 13 mini
iPhone 15
iPhone 15 Pro Max
```

## Android

```text
360 × 800
393 × 852
412 × 915
```

### Test durumları

```text
portrait
keyboard open
large accessibility text
long vehicle name
long ECU name
long DTC description
long button label
```

---

# 15. Expo / Build Configuration

Expo SDK, React Native, Android target SDK ve native dependency kombinasyonu release build üzerinde tekrar doğrulanmalıdır.

Özellikle:

```text
Expo SDK
React Native
Android target SDK
Xcode
iOS deployment target
react-native-ble-plx
Firebase
RevenueCat
Supabase
```

aynı release kombinasyonunda test edilmelidir.

---

# 16. ECU Coding Safety Architecture

README'deki:

```text
Voltage Block Protection
11.8V / 12.2V thresholds
```

ve:

```text
Automatic UDS DID byte backup
Rollback snapshot
```

yaklaşımı güçlüdür.

Ancak snapshot/write sıralaması kesin olarak şu şekilde olmalıdır:

```text
snapshot requested
        ↓
snapshot received
        ↓
snapshot validated
        ↓
snapshot persisted
        ↓
ONLY THEN WRITE
```

---

# 17. Apple Privacy Compliance

Apple, privacy policy'nin uygulama içinde erişilebilir olmasını ve App Store metadata ile uyumlu olmasını bekler.

Repo'da:

```text
PRIVACY_POLICY.md
TERMS_OF_SERVICE.md
```

bulunması olumlu.

Ancak aşağıdaki veri akışlarının:

```text
Firebase Analytics
Firebase Crashlytics
Supabase
RevenueCat
AI Doctor
Bluetooth device information
VIN
diagnostic data
vehicle profile
location
```

Apple Privacy Nutrition Labels ile birebir eşleştiği doğrulanmalıdır.

---

# 18. Google Play Data Safety

Google Play tarafında da uygulamanın veri erişimi, kullanımı ve paylaşımı konusunda şeffaflık gerekir.

Özellikle:

```text
VIN
Vehicle profile
Diagnostic data
Bluetooth identifiers
Location
Analytics
Crash reports
Subscription data
AI diagnostic data
```

için:

```text
Collected?
Shared?
Optional?
Encrypted?
User deletion?
Retention?
```

matrisi çıkarılmalıdır.

---

# 19. AI Doctor

AI Doctor'ın Supabase Edge Function → Gemini akışı ayrıca privacy açısından incelenmelidir.

Şu soruların net cevabı olmalı:

```text
VIN gönderiliyor mu?
DTC gönderiliyor mu?
Vehicle profile gönderiliyor mu?
Raw diagnostic data gönderiliyor mu?
User identifier gönderiliyor mu?
IP loglanıyor mu?
AI provider data retention nedir?
```

Kullanıcıya diagnostic data'nın AI hizmetine gönderilebileceği açıkça belirtilmelidir.

---

# 20. Apple Review Notes

OBD donanım bağımlılığı nedeniyle Apple Review Notes çok önemlidir.

Reviewer'ın OBD adapter'ı olmayabileceği varsayılmalıdır.

Review Notes içinde:

```text
How to connect
Supported hardware
BLE limitation
Demo mode
What reviewer should press
Which features can be tested without vehicle
```

net şekilde anlatılmalıdır.

---

# 21. Transport Ownership — En Önemli Mimari Risk

Mevcut mimari:

```text
Bluetooth
   ↓
Transport
   ↓
OBD/UDS
   ↓
Queue
   ↓
State
   ↓
Telemetry
   ↓
UI
```

şeklinde olgunlaşmış durumda.

Ancak release öncesi şu invariant kesin garanti altına alınmalı:

> Aynı anda yalnızca bir owner transport'a sahip olabilir.

Örneğin:

```text
Telemetry
      ↓
sendCommand()
      ↓
Coding
      ↓
sendCommand()
```

aynı anda çalışmamalıdır.

`isAtomicOperationRunning` bu konuda doğru yönde bir güvenlik mekanizmasıdır; ancak gerçek mutex/queue ownership seviyesinde garanti edilmelidir.

---

# Critical Blockers — Toplu Liste

Release branch şu maddeler tamamlanmadan submit edilmemelidir:

## P0

1. iOS background Bluetooth davranışının gerçek cihazlarda doğrulanması
2. Android permission minimization
3. Paywall compliance
4. ECU coding disconnect testleri
5. Parser fault-injection testleri
6. Polling lifecycle/cleanup audit
7. Small-screen + 26-language physical UI testleri
8. Privacy / Data Safety cross-check

---

# Minor Enhancements — Post Launch

Release'i zorunlu olarak engellemeyen ancak sonraki sürümlerde geliştirilebilecek alanlar:

- Telemetry UI throttling
- Selector-level Zustand optimization
- Adaptive PID polling
- Better BLE reconnect UX
- Adapter health score
- Protocol compatibility dashboard
- Telemetry FPS/debug overlay
- Automated screenshot tests
- 26-language visual regression
- Accessibility font-size testing
- Adapter compatibility database telemetry
- Crash correlation by adapter model
- Automatic diagnostic session export

---

# Final Release Score

## 🟠 78 / 100 — Release Candidate, NOT yet production-ready

| Kategori | Değerlendirme |
|---|---:|
| Kod mimarisi | ~87/100 |
| Store submission readiness | ~72/100 |
| Hardware reliability | ~84/100 |
| Safety architecture | ~88/100 |
| UI globalization | ~82/100 |

Buradaki önemli ayrım:

**MotoCortex artık temel mimari olarak "uygulamayı çalıştırabiliyor muyuz?" aşamasını büyük ölçüde geçmiş durumda.**

Asıl soru artık:

> Apple/Google reviewer + farklı OBD adapter'ları + 26 dil + fiziksel bağlantı kopması + ECU coding senaryolarında sistem güvenli ve öngörülebilir davranıyor mu?

Bu nedenle yeni feature eklemekten ziyade **Release Hardening / Certification Pass** aşamasına geçilmesi önerilmektedir.

---

# Recommended Release Target

## 95+/100 → Production Release

Öncelik sırası:

```text
1. Store compliance
2. Permissions minimization
3. ECU write safety
4. Physical disconnect recovery
5. BLE lifecycle
6. Parser fault injection
7. Telemetry cleanup
8. Small-screen testing
9. 26-language visual regression
10. Privacy/Data Safety verification
11. App Store Review Notes
12. Final production build smoke test
```

## Sonuç

**Şu an:** ❌ SUBMIT ETME

**P0 maddeleri kapatıldıktan sonra:** 🟢 SUBMIT EDİLEBİLİR

**Hedef:** 95+/100 Production Release

---

## Kaynaklar

- MotoCortex GitHub: https://github.com/ismailimamoglu/MotoCortex
- Apple App Review Guidelines: https://developer.apple.com/app-store/review/guidelines/
- Apple Restore Purchases Documentation: https://developer.apple.com/documentation/storekit/restoring-purchased-products
- Google Play User Data Policy: https://support.google.com/googleplay/android-developer/answer/10144311
- Google Play Permissions Guidance: https://support.google.com/googleplay/android-developer/answer/9214102
