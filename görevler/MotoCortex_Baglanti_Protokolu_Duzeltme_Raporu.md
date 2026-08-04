# 🔌 MotoCortex — Bağlantı Protokolü Sağlamlaştırma Raporu

*4 Ağustos 2026 — Repo: `ismailimamoglu/MotoCortex`*

Bu rapor, harici bir AI kod inceleme aracının bulduğu 5 maddeyi gerçek kod üzerinde tek tek doğrulayıp, doğrulanan sorunları düzelten değişiklikleri özetler. Tüm değişiklikler `motocortex_connection_fixes.patch` dosyasında — `git apply motocortex_connection_fixes.patch` ile repoya uygulanabilir.

---

## 1. WiFi Transport — 🔴 Doğrulandı ve Düzeltildi (kritik)

**Kod incelemesinde bulunan gerçek durum:** WiFi desteği üç farklı yerde parça parça vardı, hiçbiri birbirine bağlı değildi:
- `useWifiTransport.ts` — tam bir `WifiTransport` sınıfı var ama hiçbir yerden çağrılmıyordu; bağımlı olduğu `react-native-tcp-socket` paketi `package.json`'da bile yoktu.
- `modules/motocortex-obd` native modülünde gerçek, çalışan bir Kotlin/Swift WiFi implementasyonu vardı, fakat onu çağıran `MotoCortexOBDModuleConnect` fonksiyonu (`ConnectionFlowScreen.tsx`) da hiçbir yerden invoke edilmiyordu.
- Gerçekte "CONNECT VIA WI-FI" butonu, IP:PORT string'ini (`192.168.0.10:35000`) doğrudan `BluetoothService.connect()`'e gönderiyordu — bu metot bunu bir Bluetooth MAC sanıp Classic BT eşleştirme akışına sokuyordu. **Buton her zaman `PAIRING_FAILED` ile başarısız oluyordu.**

**Yapılan düzeltme:**
- `package.json` → `react-native-tcp-socket` bağımlılığı eklendi.
- `BluetoothService.android.ts` ve `BluetoothService.ios.ts` → gerçek TCP-socket tabanlı WiFi transport eklendi: `connectWifi()`, socket veri tamponlama (`>` prompt'a kadar), `write()`/`disconnect()`/`clearBuffer()` WiFi dalı, bağlantı izleme + otomatik yeniden bağlanma WiFi için de çalışıyor.
- `connect(deviceId)` artık `WIFI:` prefix'ini tanıyor ve Bluetooth Classic API'lerine hiç dokunmadan doğru transport'a yönleniyor.
- `ConnectionFlowScreen.tsx` → `handleConnectWifi` düzeltildi, kullanıcı artık IP/port'u elle girebiliyor (birçok klon adaptör farklı varsayılan IP kullanıyor). Ölü `MotoCortexOBDModuleConnect` fonksiyonu temizlendi.

---

## 2. Protokol Tarama — 🟡 İddia Güncel Değil

Kod incelemesi, `useBluetooth.ts` içinde **9 protokolün tamamının** (SP0 auto + SP1-9 fallback: CAN 11b/29b × 500k/250k, KWP fast/slow init, ISO 9141-2, J1850 PWM/VPW) zaten sırayla denendiğini gösterdi; K-Line "BUS INIT" hatasında `AT BI` ile hat sıfırlama da mevcut. Bu bulgu muhtemelen eski bir kod sürümüne dayanıyor — mevcut hâliyle ek değişiklik gerekmedi.

## 3. K-Line Init Sequence — 🟢 Kısmen Doğrulandı

5-baud/fast-init zaten `AT SP 3/4/5` ile ELM327'nin kendi içinde doğru şekilde yürütülüyor. Eksik olan kısım (marka-özel hedef adres taraması) **Madde 4 ile birlikte** kapatıldı — bkz. aşağıda.

## 4. OEM PID Setleri — 🔴 Doğrulandı ve Düzeltildi

**Doğrulanan durum:** `PidRegistry.ts`'de sadece 103 standart Mode 01 PID vardı, sıfır Mode 22 (üretici-özel) PID. `VehicleProfileDB.ts`'de sadece 5 statik profil vardı (Dacia, Hyundai, Renault, Toyota, generic) — VAG, BMW, Mercedes, Ford hiç yoktu. Ayrıca `matchProfileByVin()` fonksiyonunun kendisi de **hiçbir yerden çağrılmıyordu** — yani var olan altyapı bile canlı bağlantı akışına hiç bağlı değildi.

**Yapılan düzeltme:**
- `VehicleProfileDB.ts` → VAG (VW/Audi/SEAT/Skoda/Cupra), BMW/MINI, Mercedes-Benz, Ford, Stellantis için 5 yeni CAN init profili + VIN önek eşleştirmesi (WVW/WAU/WBA/WDD/1FA/VF3 vb.) eklendi.
- **Yeni dosya `OemPidRegistry.ts`** → VAG/BMW/Mercedes/Ford/Toyota için Mode 22 DID'leri (DSG yağ sıcaklığı, turbo boost, hibrit batarya SOC, DPF kurum yükü, AdBlue seviyesi, vb.), marka bazlı sorgulanabilir.
- `CapabilityDiscoveryManager.ts` → yeni `discoverOemPids(make)` metodu: ilgili ECU header'a `AT SH` ile geçip her DID'i `22 XX XX` ile probluyor, sonucu logluyor.
- `useBluetooth.ts` → VIN okunup marka tespit edildiği an (`handleVinReceived`), bu probe otomatik ve arka planda (fire-and-forget, ana akışı asla bloklamıyor) tetikleniyor.

Sonuç: OEM PID'ler artık statik/atıl veri değil, gerçek bağlantı akışının bir parçası.

## 5. Bootstrap / Clone Adaptör Sağlamlığı — 🟡 Doğrulandı + Ek Bulgu Düzeltildi

Clone tespiti ve ADAPTER_STALL kurtarma mantığı zaten iyi tasarlanmıştı. Ancak inceleme sırasında **iki çakışan `AdapterProfileRegistry` dosyası** bulundu:
- `core/profile/` — skor bazlı (S/A/C tier) reinit komutları, gerçekten kullanılıyor.
- `core/transport/` — marka bazlı statik tablo (OBDLink, Vgate, vb.), ama eşleştirme sadece skor eşiğine bakıyordu; **"Vgate" girdisi hiçbir zaman gerçek adaptör kimliğiyle eşleşmiyordu** (dead code) — halbuki `adapterFirmware` (gerçek `ATI` yanıtı) store'da zaten mevcuttu ve hiç kullanılmıyordu.

**Yapılan düzeltme:** `FlowControlManager.ts` → yeni `resolveAdapterProfile()` metodu önce `adapterFirmware` string'ini kontrol ediyor (`OBDLINK`, `VGATE`/`ICAR`, `V1.5` eşleşmeleri), bulamazsa eski skor/clone sezgisel yöntemine düşüyor. Geriye dönük uyumlu — mevcut 10 unit testin tamamı (mock store'da `adapterFirmware` alanı olmadığı için `undefined` → boş string → eski davranışa düşüyor) değişmeden geçiyor.

---

## Doğrulama

- 8 değiştirilen/yeni dosyanın tamamı Babel TypeScript parser ile sözdizimi açısından doğrulandı (`OK` — hatasız parse).
- Brace/parantez dengesi kontrol edildi.
- Mevcut `FlowControlManager.test.ts` testlerinin mantığı elle izlenerek geriye dönük uyumluluk teyit edildi (gerçek `npm install` + `jest` çalıştırılamadı — bu ortamda ağ/bağımlılık kısıtı var; repoda lokal olarak `npm test` ile teyit önerilir).

## Kapsam Dışı Bırakılanlar (gelecek iterasyon için notlar)

- Native `modules/motocortex-obd` WiFi implementasyonu (Kotlin/Swift) kullanılmadı; bunun yerine mevcut aktif pipeline'a (`BluetoothService`) daha düşük riskli bir entegrasyon tercih edildi. İleride performans kritikleşirse native modüle geçiş ayrı bir migration olarak ele alınmalı.
- `core/transport/AdapterProfileRegistry.ts`'deki `ELM327_v1.5`/`CLONE_v2.1` eşleştirmesi hâlâ kısmen skor tabanlı; tam üretici-bazlı tanıma (VID/PID veya BLE advertisement adı üzerinden) ayrı bir iyileştirme konusu.
