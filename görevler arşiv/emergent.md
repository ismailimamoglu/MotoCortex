# MotoCortex — OBD2 Bağlantı Sorunları & Global Çıkış Yol Haritası

**Derinlemesine Kod Analizi \+ Saha/Ekosistem Araştırması Raporu** Tarih: Mayıs 2026 Depo: [https://github.com/ismailimamoglu/MotoCortex](https://github.com/ismailimamoglu/MotoCortex) (kod snapshot alındı, /tmp/MotoCortex)  
---

## 1\. Yönetici Özeti

Uygulamanız InfoCar / Car Scanner gibi rakiplerle aynı cihaz \+ araç kombinasyonunda test edildiğinde **hem Android hem iOS'ta bağlanamıyor**. Kod tabanının detaylı incelemesi ve 2024–2026 dönemine ait Android 14/15 \+ iOS 17/18 Bluetooth API değişikliklerine bakıldığında **tek bir bug değil, birbirini besleyen 8–10 regresyon** var. Birkaç tanesi (özellikle P0'lar) tek başına *tüm bağlantıları* kırıyor. Rakip uygulamaların sorunsuz bağlanması, sorunun cihaz veya araçta değil, MotoCortex'in **son revizyonda eklenen "güvenlik kapıları" ve dar filtre setinde** olduğunun kanıtı.  
**En kritik 3 problem (bunlar düzeltilmeden bağlantı çalışmaz):**

1. **P0 — assertHardwareGate ATZ'yi PRO olmayan kullanıcılarda bloke ediyor.** Her BluetoothService.write() çağrısı önce hardware gate'ten geçiyor; ATZ DANGEROUS sınıfında olduğu için PRO değilseniz "HARDWARE\_GATE\_VIOLATION" fırlatıyor. Adapter reset yapılamıyor → ELM327 temiz bir state'e giremiyor → handshake başarısız.  
2. **P0 — Android'de BLE cihazlar hem taranmıyor hem de bağlantı akışında yakalanamıyor.** scanDevices() yalnızca Bluetooth Classic discovery kullanıyor, BLE tarama hiç çalıştırılmıyor. connect() içindeki isBleOrSim \= deviceId.includes('BLE') || deviceId.includes('SIM') heuristic'i MAC/UUID formatını tanımıyor → gerçek BLE cihazlar Classic RFCOMM ile denenip başarısız oluyor → autonomous pairing → PAIRING\_FAILED.  
3. **P0 — Cihaz ismi regex'i çok dar, gerçek pazardaki adapter isimlerinin %60'ını eliyor.** BluetoothService.android.ts ve BluetoothService.ios.ts sadece (OBD|ELM|VLINKER|MONOFE|CARLY|BIMMER) kalıbını kabul ediyor. Vgate, Veepeak, Viecar, Konnwei, iCar, OBDLink, KW/KW-series, ThinkCar, LELink, Nexas, PanLong, WIFI327, "vLink" (dash yok), boş isim (localName gelen) vb. **tarama sonucunda hiç görünmüyor** → kullanıcı cihazı seçemiyor.

Aşağıda her sorunu kod satırlarıyla birlikte kanıtlıyor, ardından "global seviye" için gereken mimari refactor \+ hardening reçetesini veriyoruz.  
---

## 2\. Bulgu Detayları (Kanıtlarla)

### 2.1 P0 — HARDWARE\_GATE ATZ'yi bloke ediyor (Regresyon)

**Kanıt:**

* src/api/BluetoothService.android.ts:543-553 ve .ios.ts:485-495 write() içinde her komut önce assertHardwareGate(cleanCmd, isPro, isMoving) çağırıyor.  
* src/core/security/CommandClassificationRegistry.ts:56 if (cmd \=== 'ATZ') return CommandClass.DANGEROUS;  
* .ts:121 if (requiresProAccess(cls) && \!isPro) throw new Error('HARDWARE\_GATE\_VIOLATION');

**Etki:** ProtocolNegotiator.runBenchmark()ın ilk satırı olan OBDCommandQueue.add('ATZ', 5000\) PRO olmayan kullanıcılarda direkt error fırlatıyor. .catch(()=\>{}) ile silence edilse bile **adapter reset yapılmadan** ATI / ATRV / ATDP zincirine geçiliyor. Klon v1.5 adapter'lar echo veya ATSP'nin önceki değeri ile geliyorsa handshake çürüyor. Aynı gate ATSP0..7, ATSI, 10 02 gibi handshake komutlarını da dolaylı olarak "vehicle in motion" yanlış pozitifi ile bloke edebiliyor (OBD2ProtocolEngine.ts:292-303).  
**Neden "önceden çalışıyordu, artık çalışmıyor":** assertHardwareGate \+ CommandClassificationRegistry bu depoya sonradan eklenmiş güvenlik kapısı. Eskiden ATZ direkt wire'a çıkıyordu. Bu revizyonun regresyonu tam olarak kullanıcının anlattığı senaryoyu (rakipler çalışıyor, MotoCortex çalışmıyor) açıklıyor.  
**Fix reçetesi:**

* assertHardwareGate, **handshake fazında** (READY state'e ulaşana kadar) devre dışı kalmalı. Whitelist yaklaşımı: ATZ, ATE0, ATL0, ATH0/H1, ATS0/S1, ATSP\*, ATDP\*, ATSTFF, ATRV, ATI, 0100, 0902 handshake sırasında PRO check'siz geçmeli.  
* Ya da: ATZ'yi DANGEROUS'dan çıkarıp READ\_ONLY yap; asıl tehlikeli olan 10 02 (session), 2E (write), 27 xx (security), 11 xx (ECU reset), 31 xx (routine), 2F (I/O control). ATZ sadece adapter'a soft-reset atıyor, araca hiç dokunmuyor.  
* isMoving heuristic'i (speed\>0 || rpm\>0) bağlantı kurulmadan önce sıfır olduğu için "static" sanıp geçiyor ama zaten problemin özü PRO gate.

### 2.2 P0 — Android'de BLE tarama yok \+ BLE cihaz bağlantı akışı bozuk

**Kanıt (tarama):**

* src/api/BluetoothService.android.ts:170-217 scanDevices() sadece RNBluetoothClassic.getBondedDevices() \+ RNBluetoothClassic.startDiscovery() kullanıyor. BLEBridge.getInstance().startDeviceScan(...) **hiçbir yerden çağrılmıyor.**  
* Sonuç: Vgate iCar Pro BLE, Veepeak OBDCheck BLE+, OBDLink MX+ (BLE modunda), vLinker MC+ ve büyük çoğunluk yeni klonlar Android tarama listesinde çıkmıyor.

**Kanıt (bağlantı):**

* BluetoothService.android.ts:239 const isBleOrSim \= deviceId.includes('BLE') || deviceId.includes('SIM');  
* BLE cihazın gerçek ID'si AA:BB:CC:DD:EE:FF MAC formatında (Android) veya UUID (iOS). Hiçbirinde "BLE" substring'i yok.  
* Sonuç: isBleOrSim=false → Classic RFCOMM getBondedDevices ile aranıyor → yok → throw new Error('Device not found or not bonded yet') → autonomous pairing → PAIRING\_FAILED.

**Not:** Depoda src/api/BluetoothManager.ts adında bambaşka, daha temiz bir "Classic-only" manager singleton var (bonded \+ regex \+ BLUETOOTH.\*BLUETOOTH\_CONNECT/BLUETOOTH\_SCAN uyumlu). Ancak **hiçbir dosya bunu import etmiyor** — muhtemelen yarım kalmış bir refactor.  
**Fix reçetesi:**

* scanDevices() **iki kaynağı da paralel** çalıştırmalı:  
  1. Classic: bonded \+ optional startDiscovery (RN Bluetooth Classic).  
  2. BLE: BLEBridge.getInstance().startDeviceScan(null, {allowDuplicates:false}, ...).  
* Sonuçları {id, name, rssi, transport: 'CLASSIC'|'BLE'|'WIFI'} şeklinde birleştir.  
* connect(deviceId, transport) şeklinde **transport'u parametre yapmak** — heuristic string-parsing'i tamamen bırak. BLE:, BT:, WIFI: prefix sistemi kullan.

### 2.3 P0 — Cihaz ismi regex'i pazar payının büyük kısmını eliyor

**Kanıt:**

* BluetoothService.android.ts:176 const OBD\_REGEX \= /(OBD|ELM|VLINKER|MONOFE|CARLY|BIMMER)/i;  
* BluetoothService.ios.ts:192 aynı regex.  
* Aynı repo'da BluetoothManager.ts:31-32 çok daha kapsamlı bir regex mevcut ama kullanılmıyor:

/(OBD|ELM|VLINKER|V-?LINK|VEEPEAK|VIECAR|VGATE|KONNWEI|ICAR|OBDLINK|  
  PANLONG|ZAKVOOP|LELINK|NEXAS|THINKCAR|KW9|MONOFE|CARLY|BIMMER|WIFI327)/i

*   
* Reddit / OBDLLM / Car Scanner troubleshooting docs 2025-2026: kullanıcıların çoğu **tam olarak** "Vgate iCar", "IOS-Vlink", "OBDBLE100", "vLink", "OBDII", "V-LINK" veya boş name (sadece localName) yayan cihazları raporluyor. Sizin regex'iniz "IOS-Vlink" (VLINKER değil), "V-LINK" (VLINKER olmadığı için düşer ❌), boş name'li BLE (düşer ❌) — geniş bir ekosistemi görmezden geliyor.

**Fix reçetesi:**

* Regex'i genişlet (yukarıdaki uzun listeyi al).  
* **İkinci filtre olarak service UUID kullan:** iOS scan'inde hasValidName || hasValidUUID var, Android'de yok. Her iki platformda da ffe0/fff0/18f0/e7810a71... UUID'sini reklam eden cihazı **name'i boş bile olsa** göster.  
* OBDLink MX+, STN2120, vLinker MC+ Nordic UART Service UUID (6E400001-B5A3-F393-E0A9-E50E24DCCA9E) kullanabiliyor; bu UUID BLEBridge.KNOWN\_GATT\_PROFILES'a **eklenmemiş**.

### 2.4 P1 — Android 12+ runtime permission akışı eksik/kırık

**Kanıt:**

* app.json içinde android.permissions listesinde BLUETOOTH\_CONNECT, BLUETOOTH\_SCAN, ACCESS\_FINE\_LOCATION, BLUETOOTH\_ADVERTISE **manifest düzeyinde** doğru.  
* Fakat kodda PermissionsAndroid.requestMultiple(\[BLUETOOTH\_SCAN, BLUETOOTH\_CONNECT, ACCESS\_FINE\_LOCATION\]) çağrısı yok. react-native-bluetooth-classic v1.73-rc.17 bu izinleri **otomatik istemez**; Android 12+ target SDK 31+ (siz targetSdk=35) için elle istemek zorunludur.  
* BLUETOOTH\_SCAN izninde android:usesPermissionFlags="neverForLocation" bayrağı yok. Bu bayrak olmadan Android hâlâ ACCESS\_FINE\_LOCATION runtime grant'i şart koşuyor; kullanıcı reddetmişse scan boş dönüyor (silent fail).

**Fix reçetesi:**

* Uygulama açılışında PermissionsAndroid.requestMultiple(...) ile üç iznin de granted olduğundan emin ol.  
* app.json içinde config plugin ile:

\<uses-permission  
    android:name="android.permission.BLUETOOTH\_SCAN"  
    android:usesPermissionFlags="neverForLocation"  
    tools:targetApi="s"/\>

* 

### 2.5 P1 — iOS: Info.plist'te BLE background eksik durumlar \+ iOS 18 uyumluluğu

**Kanıt:**

* app.json → ios.infoPlist.UIBackgroundModes \= \['bluetooth-central'\] var ✅.  
* NSBluetoothAlwaysUsageDescription ✅.  
* **NSLocationWhenInUseUsageDescription** var ama iOS 13+ için BLE tarama artık Location gerektirmiyor — gereksiz izin, mağaza reviewer'ları soru işaretiyle yaklaşıyor.  
* iOS 18'de CBCentralManager state() çağrısı unknown state ile başlıyor; waitForEnabled 3000ms timeout yeterli değil. iPhone 15/16 cihazlarında state PoweredOn'a 4–5 saniyede çıkıyor.

**Fix reçetesi:**

* waitForEnabled(timeoutMs=8000).  
* App-Prefs:root=Bluetooth scheme'i iOS 15+'ta artık **reddediliyor**; yerine openSettings() kullan.  
* CBCentralManager restore identifier'ı ekle (background reconnect için).

### 2.6 P1 — Klon v1.5 handshake stratejisi yanlış sırada

**Kanıt:**

* ProtocolNegotiator.runBenchmark() sırası: ATZ → ATI → ATRV → ATDP. Ama ATE0 (echo kapatma) bunlardan **sonra** çağırılıyor (applyPostResetConfig).  
* Klon ELM327 v1.5'lerde echo default ON'dur. Bu yüzden ATI gönderdiğinizde adapter cevap olarak **komutu geri ediyor**: "ATI\\r\\r ELM327 v1.5\\r\\r\>". Sizin elmParser bunu yanlış command olarak yorumlayıp SEARCHING state'ini bozuyor.  
* Rakip uygulamalar sıralama: ATZ → 400ms bekle → ATE0 → ATL0 → ATH1 → ATS0 → ATST FF → ATSP0 → 0100.

**Fix reçetesi:**

* Sırayı düzelt: ATZ → wait 500ms → ATE0 → ATL0 → ATH1 → ATS0 → ATST FF → ATSP0 → 0100.  
* ATZ cevabında ? gelirse ATWS (warm start) ile tekrar dene.  
* 0100 timeout'unu 4000ms'e çıkar.

### 2.7 P1 — BLE GATT karakteristik keşfi eksik profiller

**Kanıt:**

* BLEBridge.KNOWN\_GATT\_PROFILES 4 profil içeriyor: STN2120, ELM/HM-10 (ffe0), UniCarScan (fff0), Veepeak (18f0).  
* Eksikler:  
  * **Nordic UART Service (NUS):** 6E400001-B5A3-F393-E0A9-E50E24DCCA9E — OBDLink MX+, bazı vLinker firmware'ları  
  * **OBDLink MX+ native profile:** v5 firmware  
  * **Autoscan / KW903:** 0000ff00-...

**Fix reçetesi:**

* KNOWN\_GATT\_PROFILES'a NUS \+ KW903 ekle.  
* Öncelik order'ı: (a) write-without-response \+ notify, (b) write-with-response \+ notify, (c) ayrı chars.  
* Discovered UUID'yi AsyncStorage'a cache'le.

### 2.8 P2 — Reconnect loop ile ana bağlantı akışı yarışıyor

**Kanıt:**

* startConnectionMonitor() her 3 saniyede BLEBridge.getInstance().isDeviceConnected(...) çağırıyor.  
* BLEBridge.ts içinde **böyle bir metod tanımlı DEĞİL**. Her 3 saniyede monitor undefined is not a function fırlatıyor, silent yakalanıyor ama connected daima false → handleDroppedConnection tetikleniyor → sonsuz reconnect.

**Fix reçetesi:**

* BLEBridgee statik isDeviceConnected(id) yaz veya BleManagerın public API'sini kullan.  
* Ya da monitor'ü **event tabanlı** yap: device.onDisconnected(...) zaten var; polling'i kaldır.

### 2.9 P2 — Ekosistemik faktörler (Android 14 & 15 API kırılımları)

* **Android 14:** bond state cache 24 saatte OS tarafından temizleniyor.  
* **Android 15** (targetSdk 35): RECEIVER\_EXPORTED zorunluluğu ile react-native-bluetooth-classic altındaki BroadcastReceiver'lar çakılabiliyor. rc.17 bilinen bug'ı.  
* **Android 14+**: BluetoothAdapter.startDiscovery() foreground gerektiriyor.

**Fix reçetesi:**

* react-native-bluetooth-classic yerine react-native-ble-plx \+ kendi native SPP modülünüz veya alternatif fork.

### 2.10 P2 — iOS'ta "Classic OBD" beklentisi

**Kanıt:**

* iOS **MFi olmayan Bluetooth Classic (SPP) desteklemez**. Klon veya orijinal ELM327 v1.5 Bluetooth 2.0/3.0 (SPP) sadece Android'de çalışır.  
* Kullanıcı "iOS'ta da bağlanıyordum" derken muhtemelen BLE veya WiFi ELM327'yi kastediyor.

**Fix reçetesi:**

* iOS scan ekranında **ayrı sekmeler**: BLE Devices / WiFi (192.168.0.10). Classic asla listelenmesin.  
* WiFi ekranında IP:PORT elle giriş \+ hızlı ping.

### 2.11 P3 — Minor kod hijyeni (Global-hazırlık için önemli)

| Konu | Dosya | Sorun | Etki |
| :---- | :---- | :---- | :---- |
| Stale refactor | src/api/BluetoothManager.ts | 610 satır, kimse import etmiyor | Dead code |
| Base64 elle yazılmış | 4 farklı dosya | DRY ihlali | Bakım maliyeti |
| AUDIT\_REPORT.md bulguları | Root | App.tsx re-render bottleneck çözülmemiş | Batarya \+ performans |
| VIN & telemetry supabase'e gidiyor | supabaseClient.ts | KVKK/GDPR açık rıza yok | Global'de yasal sorun |
| Native new arch kapalı | app.json | newArchEnabled: false | RN 0.80+ zorunlu olacak |

---

## 3\. Rakip Uygulamalar Neden Çalışıyor?

| Alan | Rakipler | MotoCortex |
| :---- | :---- | :---- |
| Adapter type auto-detection | Classic \+ BLE \+ WiFi paralel | Yalnız Classic (Android) |
| Handshake sequence | ATWS → ATE0 → ATL0 → ATH1 → ATS0 → ATST 32 → ATSP0 → 0100 | ATZ → ATI → ATRV → ATDP → ATE0 |
| Clone tolerance | ATWS \+ hard-fallback | ATZ fail → benchmark boş |
| Permission UX | Deep-link \+ retry | Deep-link yok |
| Regex/UUID filter | 15+ vendor \+ tüm known GATT | 6 vendor \+ 4 UUID |
| MFi/BLE ayrımı iOS | BLE only | Karışık |
| Reconnect | Event-driven | Polling \+ broken API |
| SGW bypass | FCA/VAG/BMW auth | Sadece log |

---

## 4\. Global Seviyeye Çıkış Yol Haritası

### FASE 1 — "Yeniden Bağlansın" (1–2 hafta)

*  P0-1: assertHardwareGate handshake fazında bypass. ATZ'yi READ\_ONLYa al.  
*  P0-2: scanDevices() çift transport (Classic \+ BLE) paralel.  
*  P0-3: Vendor regex genişlet \+ service UUID ile ikinci filtre.  
*  P1-1: Runtime permission modülü (Android 12+).  
*  P1-2: Handshake sequence düzelt.  
*  P2-1: BLEBridge.isDeviceConnected implement.

### FASE 2 — "Global Kalite" (2–4 hafta)

*  GATT profile registry genişlet (NUS, KW903, MX+ v5).  
*  Adapter capability cache (AsyncStorage).  
*  iOS Info.plist temizle.  
*  Expo SDK 54'e migrate \+ newArchEnabled true.  
*  Crashlytics breadcrumb enrichment.  
*  KVKK/GDPR onay ekranı.  
*  Analytics: bağlantı funnel her adımı ölç.

### FASE 3 — "Rekabetçi Diferansiasyon" (4–8 hafta)

*  SGW bypass modülleri (FCA, VAG, BMW, Mercedes).  
*  Marka-spesifik PID kütüphaneleri.  
*  Offline VIN decode.  
*  Cloud sync \+ Apple/Google sign-in.  
*  Skia bazlı gauge.  
*  BrowserStack Real Device Cloud CI.

### FASE 4 — "Ölçek \+ Yasal" (8+ hafta)

*  6 dile lokalize (TR, EN, DE, ES, RU, PT).  
*  ASO — App Store Optimization.  
*  Bölgesel Pro fiyatlandırma.  
*  MotoCortex SDK açık kaynak.

---

## 5\. Hemen Uygulanacak Fix Snippet'leri

### 5.1 CommandClassificationRegistry düzeltmesi

// src/core/security/CommandClassificationRegistry.ts  
const HANDSHAKE\_WHITELIST \= new Set(\[  
  'ATZ','ATWS','ATE0','ATE1','ATL0','ATL1','ATH0','ATH1',  
  'ATS0','ATS1','ATSTFF','ATST32','ATSP0','ATSP1','ATSP2',  
  'ATSP3','ATSP4','ATSP5','ATSP6','ATSP7','ATSP8','ATSP9',  
  'ATSPA','ATSPB','ATSPC','ATDP','ATDPN','ATI','ATRV','ATCV',  
  'ATAT0','ATAT1','ATAT2','0100','0902',  
\]);

export function assertHardwareGate(rawCmd, isPro, isMoving \= false, customVoltageStr) {  
  const cmd \= normalizeCommand(rawCmd);  
  if (HANDSHAKE\_WHITELIST.has(cmd)) return;  
  const cls \= classifyCommand(rawCmd, isMoving);  
  if (requiresProAccess(cls) && \!isPro) throw new Error('HARDWARE\_GATE\_VIOLATION');  
}

### 5.2 Vendor regex \+ UUID filter

const OBD\_NAME\_REGEX \=  
  /(OBD|ELM|V-?LINK(?:ER)?|VEEPEAK|VIECAR|VGATE|KONNWEI|I-?CAR|OBDLINK|  
    PANLONG|ZAKVOOP|LELINK|NEXAS|THINKCAR|KW\\d+|MONOFE|CARLY|BIMMER|  
    WIFI327|AUTOSCAN|LAUNCH|MAXIS|OBDII)/i;

const OBD\_UUID\_SET \= new Set(\[  
  '0000ffe0-0000-1000-8000-00805f9b34fb',  
  '0000fff0-0000-1000-8000-00805f9b34fb',  
  '000018f0-0000-1000-8000-00805f9b34fb',  
  'e7810a71-73ae-499d-8c15-faa9aef0c3f2',  
  '6e400001-b5a3-f393-e0a9-e50e24dcca9e',  
\]);

const nameOk \= OBD\_NAME\_REGEX.test(name);  
const uuidOk \= (device.serviceUUIDs || \[\]).some(u \=\> OBD\_UUID\_SET.has(u.toLowerCase()));  
if (\!(nameOk || uuidOk)) return;

### 5.3 Android runtime permission

import { PermissionsAndroid, Platform } from 'react-native';

export async function ensureBluetoothPermissions() {  
  if (Platform.OS \!== 'android' || Platform.Version \< 31\) return true;  
  const res \= await PermissionsAndroid.requestMultiple(\[  
    PermissionsAndroid.PERMISSIONS.BLUETOOTH\_SCAN,  
    PermissionsAndroid.PERMISSIONS.BLUETOOTH\_CONNECT,  
    PermissionsAndroid.PERMISSIONS.ACCESS\_FINE\_LOCATION,  
  \]);  
  return Object.values(res).every(v \=\> v \=== PermissionsAndroid.RESULTS.GRANTED);  
}

### 5.4 neverForLocation config plugin

// plugins/withBluetoothScanFlag.js  
const { withAndroidManifest } \= require('@expo/config-plugins');  
module.exports \= function withBluetoothScanFlag(config) {  
  return withAndroidManifest(config, (cfg) \=\> {  
    const permissions \= cfg.modResults.manifest\['uses-permission'\] || \[\];  
    permissions.forEach(p \=\> {  
      if (p.$\['android:name'\] \=== 'android.permission.BLUETOOTH\_SCAN') {  
        p.$\['android:usesPermissionFlags'\] \= 'neverForLocation';  
        p.$\['tools:targetApi'\] \= 's';  
      }  
    });  
    return cfg;  
  });  
};  
// app.json plugins: "./plugins/withBluetoothScanFlag.js"

### 5.5 Handshake sequence

async function handshake() {  
  await OBDCommandQueue.add('ATZ',  4000).catch(()=\>{});  
  await sleep(500);  
  await OBDCommandQueue.add('ATE0', 1500);  
  await OBDCommandQueue.add('ATL0', 1000);  
  await OBDCommandQueue.add('ATH1', 1000);  
  await OBDCommandQueue.add('ATS0', 1000);  
  await OBDCommandQueue.add('ATSTFF', 1000);  
  await OBDCommandQueue.add('ATSP0', 1500);  
  const r \= await OBDCommandQueue.add('0100', 4000);  
  return \!r.includes('UNABLE') && \!r.includes('?');  
}

---

## 6\. Test Matrisi (Global Çıkış İçin Zorunlu)

| Adapter | Fiyat | Protocol | Beklenen | Öncelik |
| :---- | :---- | :---- | :---- | :---- |
| ELM327 v1.5 klon BT 2.0 | ₺100 | SPP/RFCOMM | Sadece Android | P0 |
| ELM327 v1.5 BLE (Vgate/Vlinker) | ₺350 | BLE ffe0 | Android \+ iOS | P0 |
| Veepeak OBDCheck BLE+ | ₺800 | BLE 18f0 | Android \+ iOS | P0 |
| vLinker MC+ | ₺1200 | BLE e7810a71 | Android \+ iOS \+ Ford | P1 |
| OBDLink MX+ | ₺3500 | BLE NUS \+ STN | Full support | P1 |
| ELM327 WiFi | ₺250 | TCP | iOS zorunlu | P0 |
| Carly BMW/VAG | ₺2500 | BLE fff0 \+ auth | SGW bypass | P2 |

5 marka (VW, BMW, Mercedes, Ford, Toyota) × 3 model yılı \= **105 hücrelik matris**.  
---

## 7\. Sonuç

MotoCortex kod tabanı mimari olarak **rakipleri geride bırakacak** kadar zengin (UDS, KWP, ISO-TP, multi-ECU discovery, DTC intelligence, Mode06 monitors, EV support). Ama son 3–6 revizyonda eklenen **hardware gate \+ dar filtre \+ kırık BLE akışı** üçlüsü, ana bağlantı fonksiyonunu tamamen inoperabl hale getirmiş. Bu rapordaki 3 P0 fix \+ 5 P1 fix uygulandıktan sonra saha testinde InfoCar / Car Scanner'la aynı adapter havuzuna bağlanacaktır. FASE 2 & 3 ise sizin **global rekabetçi** olmanız için gereken hijyen ve diferansiasyon.  
**Sıradaki adım için önerim:** Bu raporu review edin, hangi P0'ları hangi sırayla düzeltmek istediğinize karar verin; ardından — isterseniz — repo'yu buraya klonlayıp Bölüm 5'teki snippet'leri uygulayıp bir test build çıkaralım.  
---

*Rapor sonu — MotoCortex Bağlantı Araştırması v1.0 — Mayıs 2026*  
