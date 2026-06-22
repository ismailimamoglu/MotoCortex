# 🔌 MotoCortex – Bluetooth/OBD2 Bağlantı Güçlendirme Yol Haritası

**Amaç:** Bağlantı kararsızlığını (aralıklı kopma / bazen bağlanma) gidermek ve uygulamayı piyasadaki en güçlü OBD2 uygulamaları (Car Scanner, OBD Fusion, Torque Pro, OBDLink) seviyesinde **maksimum cihaz uyumu + maksimum verim** ile çalışır hale getirmek.

**Hazırlanma tarihi:** Haziran 2026
**Kapsam:** `src/api/BluetoothService.android.ts`, `BluetoothService.ios.ts`, `OBDCommandQueue.ts`, `BLEBridge.ts`, `src/hooks/useBluetooth.ts`, `commands.ts`

---

## 0. Yönetici Özeti

Mimari olgun: platform-spesifik servis katmanı, komut kuyruğu, protokol şelalesi (AT SP 0 → fallback), klon tespiti mevcut. Ancak bağlantı kopmalarının **kök nedenleri** bağlantı yaşam döngüsü yönetiminde:

| # | Kök Neden | Etki | Öncelik |
|---|---|---|---|
| A1 | Reconnect, ECU'yu yeniden init etmiyor | **Çok Yüksek** | P0 |
| A2 | Monitor tek `false`'ta anında kopma (debounce yok) | Yüksek | P0/P1 |
| A3 | Arka planda "acımasız" disconnect | Yüksek | P1 |
| A4 | Komut seviyesinde retry yok | Orta-Yüksek | P1 |
| A5 | `connect()` timeout'suz → sonsuz "connecting" | Orta | Hızlı kazanım |
| A6 | Servis buffer'ı komut başında flush edilmiyor | Orta | Hızlı kazanım |
| C1 | Tarama filtresi cihaz kaçırıyor | Yüksek (kapsam) | P1 |
| C2 | Hata yanıtı sözlüğü eksik | Orta (veri bütünlüğü) | P1 |

---

## 1. Kök Neden Analizi (kodda kanıtlı)

### A1 · Reconnect ECU'yu yeniden initialize etmiyor — **EN KRİTİK**
**Konum:** `BluetoothService.android.ts:404` / `BluetoothService.ios.ts:407` → `handleDroppedConnection()`
```ts
const success = await this.connect(lastId);  // sadece BLE link kuruluyor
if (success) return;                          // ECU init YOK
```
ELM327, fiziksel link koptuğunda `ATE0/ATL0/ATH0/ATS0` ve seçili protokolü **sıfırlar**. Servis katmanı yeniden bağlandığında `OBDCommandQueue` yarı-yapılandırılmış adaptöre PID basmaya devam eder → echo açık/protokol yok → bozuk yanıt → timeout → ya "bağlı ama veri yok" ya da tekrar kopma.
**Asıl sorun:** Servis katmanındaki auto-reconnect, hook'taki `initializeAndCheckEcu()` (useBluetooth.ts:470) zincirinden **tamamen kopuk**.

### A2 · Connection monitor tek seferlik `false`'ta idam ediyor
**Konum:** `*.ts:385-398` `startConnectionMonitor()`
```ts
this.connectionMonitorId = setInterval(async () => {
  let connected = false;
  try { connected = await ...isDeviceConnected(...); } catch (e) {}
  if (!connected && !this.isManualDisconnect) this.handleDroppedConnection(); // anında!
}, 3000);
```
BLE'de `isConnected()` geçici `false` dönebilir (RF paraziti, stack gecikmesi). **Debounce/grace period yok** → tek anlık parazit tüm bağlantıyı düşürüyor.

### A3 · AppState "acımasız temizlik" arka planda bağlantıyı katlediyor
**Konum:** `useBluetooth.ts:922-947`
```ts
if (nextAppState.match(/inactive|background/)) {
  OBDCommandQueue.clear(new Error('APP_BACKGROUNDED'));
  stopPolling();
} else if (nextAppState === 'active') {
  await OBDCommandQueue.add('\r', 1000);   // tek probe, 1sn
  ...catch { disconnect(); }               // başarısızsa idam
}
```
`Info.plist`'te `UIBackgroundModes: [bluetooth-central]` tanımlı — yani iOS'ta BLE arka planda yaşatılabilir. Ekran kilidi / uygulama değiştirme anında gereksiz kopma buradan geliyor. Tek `\r` probe + 1sn timeout fazla kırılgan.

### A4 · Komut seviyesinde retry yok
**Konum:** `OBDCommandQueue.ts:93-98, 593-623`
Timeout'ta komut direkt `reject` ediliyor; init sırasında tek bir AT komutu kaçarsa el sıkışma çöker. Üst seviye OBD uygulamaları kritik komutu 2-3 kez yeniden dener.

### A5 · `connect()` timeout parametresi almıyor
**Konum:** `ios.ts:224`, `android.ts:282` → `manager.connectToDevice(deviceId)`
Flaky adaptörde sonsuza kadar asılı kalabilir → "sürekli connecting'de kalma".

### A6 · Servis buffer'ı komut başında flush edilmiyor
**Konum:** `android.ts:85 bleDataBuffer`, `ios.ts:83 iosBleBuffer`
Önceki komuttan artık veri (geç gelen `SEARCHING...>`) bir sonraki yanıtı bozar. Kuyruk `processNext`'te `currentBuffer`'ı temizliyor ama **servis katmanı buffer'ı** temizlenmiyor.

---

## 2. Çözüm Mimarisi

### P0-1 · Birleşik Bağlantı Durum Makinesi (en yüksek etki)
Tek bir `ConnectionManager` ile açık state machine:
```
IDLE → SCANNING → LINKING → ELM_INIT → ECU_HANDSHAKE → STREAMING
                     ↑                                      │
                     └──────────── RECOVERING ←─────────────┘
```
**Kural:** Her reconnect/recovery DAİMA `LINKING → ELM_INIT → ECU_HANDSHAKE` zincirini baştan koşar. Yani drop sonrası `initializeAndCheckEcu()` otomatik tekrar çalışır.
**Uygulama:** `handleDroppedConnection`'ı servis katmanından çıkarıp, hook'taki bir `recoverConnection()` fonksiyonuna `onDisconnect` callback'i üzerinden bağla. Servis sadece "link koptu" sinyali versin; init/handshake orchestration'ı hook yönetsin.

### P0-2 · Exponential Backoff + Buffer Flush'lı Reconnect
```
Deneme 1: 0.5s bekle → AT WS + buffer flush → tam re-init
Deneme 2: 1s    → ...
Deneme 3: 2s    → ...
Deneme 4: 4s    → ...
Deneme 5: 8s    → ... → başarısız: kullanıcıya "Adaptör menzil dışı/arızalı" + manuel retry
```
RSSI < -90 dBm ise "menzil dışı" uyarısı göster.

### P1-1 · Akıllı Heartbeat/Watchdog
`isConnected()` yerine **aktif `ATRV` ping**: 2 ardışık başarısızlıkta `RECOVERING`'e geç (anında disconnect değil). Voltaj ping'i hem canlılık testi hem ekranda faydalı veri.

### P1-2 · Komut Retry + Adaptif Timeout
```ts
OBDCommandQueue.add(cmd, { timeoutMs, retries: 2 })
```
Protokole göre timeout: CAN ≈ 1000ms, K-Line ≈ 4000ms.
`AT ST 62` (sabit 248ms) yerine `AT AT2` (agresif adaptive timing) değerlendir — sabit ST bazı yavaş ECU'larda NO DATA üretiyor. ST'yi yalnızca AT0 (adaptive off) ile birlikte kullan; AT1/AT2 ile ST çakışabilir.

### P1-3 · Android BLE Bağlantı Önceliği
```ts
await device.requestConnectionPriority(ConnectionPriority.High); // ble-plx
```
Şu an yok. Yüksek frekanslı polling'de gecikmeyi ve drop'u ciddi azaltır.

### P1-4 · MTU Müzakere + Chunked Write Fallback
Android'de MTU 512 isteniyor ama birçok klon onurlandırmıyor. Gerçekleşen MTU'yu oku; eğer < komut uzunluğu ise yazmayı parçala. iOS'ta MTU OS tarafından yönetilir (istek gereksiz).

### P2-1 · Arka Plan Stratejisini Yumuşat
Arka planda bağlantıyı **koparma**, sadece polling'i duraklat. Öne gelince `\r` yerine `ATRV` sağlık testi; başarısızsa tek seferde öldürme → `RECOVERING`.

---

## 3. Maksimum Cihaz Kapsaması

**Mevcut filtre:** `/(OBD|ELM|VLINKER|MONOFE|CARLY|BIMMER)/i` + FFE0/FFF0 → birçok adaptörü görmüyor.

### C1 · Tarama filtresini genişlet
**Eklenecek isimler:**
`VEEPEAK`, `VIECAR`, `VGATE`, `KONNWEI`, `iCar`, `V-LINK`, `V LINK`, `OBDII`, `OBD2`, `Android-VLink`, `IOS-Vlink`, `OBDLINK`, `PANLONG`, `ZAKVOOP`, `LELINK`, `LELink`, `KW9`, `NEXAS`, `THINKCAR`, `Mobile`, `WIFI327`

**Eklenecek servis UUID'leri:**
- `0000ffe0` (FFE0 – generic) ✅ var
- `0000fff0` (FFF0 – standart OBD2) ✅ var
- `000018f0` (LELink) — iOS connect'te var, **tarama filtresinde YOK** → ekle
- `0000fff6`, `0000ffb0` (bazı klonlar)
- `6e400001-b5a3-f393-e0a9-e50e24dcca9e` (Nordic UART – bazı yeni klonlar)

**"Tümünü göster" modu:** Filtre eşleşmese bile keşfedilen tüm cihazları ikincil bir listede göster (kullanıcı manuel seçsin). Profesyonel uygulamaların hepsinde var.

**Üçlü tarama:** Bonded (Classic) + BLE + Classic SPP discovery birlikte. OBDLink MX gibi cihazlar SPP/Classic kullanır; sadece BLE tararsanız görünmezler.

### C2 · Hata yanıtı sözlüğünü genişlet
**Konum:** `OBDCommandQueue.ts:560-566` `isErrorResponse`
**Eklenecek:** `BUFFER FULL`, `STOPPED`, `RX ERROR`, `FB ERROR`, `<DATA ERROR`, `BUS BUSY`, `BUS ERROR` (var), `7F` (UDS negative response), `ACT ALERT`, `LV RESET`, `LP ALERT`
Yakalanmayan hata stringleri "veri" sanılıp `parseInt` ile bozuk değer üretiyor.

---

## 4. Hızlı Kazanımlar (1-2 saat, düşük risk)

1. `connectToDevice(id, { timeout: 10000 })` → "sonsuz connecting" biter. *(A5)*
2. Reconnect öncesi `OBDCommandQueue.clear()` + servis buffer flush (`bleDataBuffer=''`). *(A6)*
3. Connection monitor'a 2-deneme debounce (sayaç ile). *(A2)*
4. Android'de `requestConnectionPriority(High)`. *(P1-3)*
5. Tarama filtresine yukarıdaki isim/UUID'leri ekle. *(C1)*
6. Init'te kritik AT komutlarına (ATZ, ATE0, AT SP 0, 01 00) 1 retry. *(A4)*
7. `parseResponse` hata sözlüğünü genişlet. *(C2)*

---

## 5. Önerilen Uygulama Sırası

```
Faz 1 (P0 – kopmaların ~%70'i):
  ├─ A1: Reconnect → tam ECU re-init zinciri
  ├─ P0-2: Exponential backoff + buffer flush
  └─ A2: Monitor debounce

Faz 2 (P1 – kalan kopmalar + kapsam):
  ├─ A4: Komut retry + adaptif timeout
  ├─ P1-3: requestConnectionPriority(High)
  ├─ A3/P2-1: Arka plan stratejisini yumuşat
  └─ C1+C2: Cihaz filtresi + hata sözlüğü

Faz 3 (cila):
  ├─ P1-1: ATRV heartbeat
  ├─ P1-4: MTU müzakere + chunked write
  └─ Telemetri: bağlantı kalite metrikleri (drop sayısı, RSSI, retry oranı)
```

---

## 6. Doğrulama / Test Planı

- **Gerçek cihaz matrisi:** En az 3 farklı adaptör (1 kaliteli ELM327 v1.5, 1 BLE klon FFE0, 1 K-Line araç).
- **Senaryolar:** (1) ekran kilidi 30sn → geri dön, (2) adaptörü çek-tak, (3) menzil dışına çık-gel, (4) uzun süreli (30dk) sürekli polling drop sayımı, (5) uygulama arka plan→ön geçişleri.
- **Metrik:** Saatlik kopma sayısı, ortalama reconnect süresi, başarısız komut oranı. Hedef: < 1 kopma/saat, < 3sn reconnect.
- **Loglama:** `Logger.ts` üzerinden her drop'a RSSI + neden + reconnect süresi yaz; Secret Debug ekranında göster.

---

## 7. Notlar / Referans Davranışlar (piyasa liderleri)

- **OBDLink/Car Scanner:** Protokol başına adaptif ST timeout, agresif AT2, bağlantı kalite göstergesi, "tümünü göster" cihaz modu.
- **Torque Pro:** Reconnect'te daima tam ELM init, K-Line için düşük poll hızı.
- **OBD Fusion:** Komut retry + NRC (7F) yorumlama, geniş adaptör beyaz listesi.

> Bu yol haritası statik kod analizine dayanır. Faz 1 uygulandıktan sonra gerçek cihaz matrisinde doğrulanmalı; protokol/timeout değerleri saha verisiyle ince ayar yapılmalıdır.
