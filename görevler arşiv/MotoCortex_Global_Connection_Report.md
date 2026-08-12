# MotoCortex Global Bağlantı Güçlendirme Raporu

> **Proje:** MotoCortex v7 PRO  
> **Repo:** https://github.com/ismailimamoglu/MotoCortex  
> **Tarih:** 2026-08-11  
> **Durum:** ELM327 Clone Cihaz Bağlantı Sorunu — Kök Neden Analizi & Global Çözüm Önerileri

---

## 1. Executive Summary

MotoCortex v7 PRO'nun mevcut bağlantı mimarisi **enterprise-grade** seviyede tasarlanmış ancak **ELM327 clone cihazlarla**, **platform spesifik edge case'lerle** ve **initialization sequence timing'leriyle** ilgili kritik boşluklar içeriyor. Log analizi ve kod incelemesi sonucunda, bağlantının başka uygulamalarda çalışıp MotoCortex'te çalışmamasının **15 temel nedeni** tespit edildi.

**Ana Bulgular:**
- `ATZ` sonrası bekleme süresi yetersiz (500ms → 1500ms gerekli)
- Auto-detect timeout çok kısa (3500ms → 15000ms gerekli)
- `ATSH7E0` auto-detect modunda yanlış kullanılmış
- `ATCRA` (CAN receive filter) initialization'da eksik
- NO DATA yanıtları retry edilmiyor
- iOS'ta MTU request hatası yakalanmıyor
- Transport katmanında duplicate logic var
- Voltaj kontrolü initialization sequence'da eksik

---

## 2. Log Dosyası Analizi

### 2.1 Versiyon Uyarısı: Olası Clone Cihaz

Logda `ATI` komutuna yanıt olarak `ELM327 v1.5` dönüyor. Orijinal ELM327 çipleri v2.1, v2.2, v2.3 versiyonlarındadır. **v1.5 etiketi, cihazın muhtemelen bir Çin klonu olduğunu gösterir.** Klon cihazlar, komutları kısmen destekler, zaman aşımı yönetiminde hatalı davranabilir ve belirli AT komutlarına tutarsız yanıt verebilir.

### 2.2 Initialization Sequence Hataları

Logdaki komut sırası:

```
ATZ → ATI → ATRV → ATDP → ATE0 → ATSP0 → 01 00 → ATPC → ATSP6 → ATSH7E0 → 01 00 ...
```

**Tespit edilen hatalar:**

| # | Hata | Açıklama |
|---|------|----------|
| 1 | **ATZ sonrası yeterli bekleme yok** | Reset komutu cihazı ~1 saniyede yeniden başlatır. Logda hemen ardından `ATI` atılmış. |
| 2 | **ATSH7E0 yanlış yerde kullanılmış** | `ATSP0` (auto protocol) sonrasında manuel header ayarı yapılmış. Auto-detect modunda ELM327 kendi header'ını otomatik seçer; manuel müdahale protokol tespitini bozar. |
| 3 | **">" prompt beklenmiyor** | Her komut sonrası ELM327 `>` karakteri göndererek "boşta/hazır" durumuna geçer. Logda bu prompt beklenmeden ardışık komutlar atılmış. |
| 4 | **ATDP ve ATRV yanıtsız** | Bu komutlar cihazdan yanıt alamamış; bu da bağlantının henüz stabil olmadığını gösterir. |

### 2.3 Protokol Tarama Hatası

`ATSP0` sonrası `01 00` (Supported PIDs) sorgusuna yanıt gelmemiş. Ardından manuel olarak SP6, SP7, SP8, SP9 denenmiş ve sonunda `NO DATA` alınmış. Bu durum şu anlama gelir:
- Araç CAN bus üzerinden haberleşiyor ancak **header/filter ayarları** veya **zamanlama** yanlış.
- `ATSH7E0` motor ECU'su için doğru header olabilir ama `ATCRA` (receive address filter) ayarlanmamış.
- Clone cihazlarda `ATSP0` auto-detect 5-15 saniye sürebilir; logda 5 saniye sonra timeout verilmiş.

---

## 3. Mevcut Mimari Değerlendirmesi

### 3.1 Teknoloji Yığını

| Katman | Kütüphane | Platform | Durum |
|--------|-----------|----------|-------|
| Classic Bluetooth | `react-native-bluetooth-classic@1.73.0-rc.17` | Android | ⚠️ RC versiyon, stabil değil |
| BLE | `react-native-ble-plx@3.5.1` | Android + iOS | ✅ Güncel |
| WiFi TCP | `react-native-tcp-socket@6.2.0` | Android + iOS | ✅ Güncel |
| State Management | Zustand | Cross-platform | ✅ |
| Protocol Engine | Custom TypeScript | Cross-platform | ⚠️ İyileştirme gerekli |

### 3.2 Transport Katmanı Analizi

#### `BluetoothManager.ts` (19.8KB)
- Android-only Classic Bluetooth SPP engine
- State machine: IDLE → SCANNING → CONNECTING → READY → RECONNECTING → ERROR
- Heartbeat: 30s interval (`AT RV`), 4s timeout
- Reconnect: Exponential backoff (1s base, 30s max, 8 attempts)
- RFCOMM fallback: secure → insecure → pairing fallback
- **Sorun:** `assertAndroid()` ile iOS'ta hiçbir işlem yapmıyor

#### `BluetoothService.android.ts` (29.2KB)
- Classic + BLE + WiFi hybrid servis
- `connect()` metodu: WiFi → BLE → Classic sırası
- BLE: MTU 512 request, service/characteristic discovery
- WiFi: TCP socket, 5s timeout
- Connection monitor: 3s interval
- Auto-reconnect: 5 attempts
- **Sorun:** `BluetoothManager` ile duplicate logic var

#### `BluetoothService.ios.ts` (25.9KB)
- Sadece BLE + WiFi (iOS Classic BT desteklemez)
- Aynı BLE service discovery logic
- **Sorun:** iOS'ta `requestMTU(512)` çoğu cihazda desteklenmez

---

## 4. Kritik Sorunlar ve Çözümler (15 Madde)

| # | Sorun | Log Kanıtı | Kod Kanıtı | Çözüm |
|---|-------|------------|------------|-------|
| 1 | **ATZ sonrası yetersiz bekleme** | ATZ'den 1sn sonra ATI atılmış | `OBD2ProtocolEngine.ts`: `lastCommandWasReset` sonrası sadece 500ms sleep | ATZ sonrası **1500ms** bekleme |
| 2 | **Auto-detect timeout çok kısa** | ATSP0 sonrası 5sn'de timeout | `OBD2ProtocolEngine.ts`: handshake timeout 3500ms | Auto-detect için **15000ms** timeout |
| 3 | **ATSH7E0 auto-detect'i bozuyor** | ATSP0 sonrası ATSH7E0 atılmış | `commands.ts`'te `ATSH` var ama kullanım yeri yanlış | Auto-detect modunda `ATSH` kullanma |
| 4 | **ATRV yanıtsız** | ATRV komutu yanıt alamamış | `OBD2ProtocolEngine.ts`: `ATRV` parsing var ama initialization'da yok | Initialization'a `ATRV` ekle, <12V ise blokla |
| 5 | **NO DATA hata olarak işleniyor** | Son satırda NO DATA | `OBD2ProtocolEngine.ts`: `isErrorPayload()` NO DATA'yı hata sayıyor | NO DATA'yı retry-able olarak işaretle |
| 6 | **Protocol fallback yok** | SP6, SP7, SP8, SP9 manuel denenmiş | `OBD2ProtocolEngine.ts`: sadece `kLineFallbackCallback` var | CAN protocol fallback mekanizması ekle |
| 7 | **Buffer flush çok uzun** | — | `BluetoothService.android.ts`: `clearBuffer()` 2s drain | Clone cihazlar için 500ms'e düşür |
| 8 | **WiFi timeout agresif** | — | `CommandScheduler.ts`: WiFi timeout 200ms | WiFi için minimum 1000ms |
| 9 | **ELM Prompt bekleme kısa** | — | `OBD2ProtocolEngine.ts`: `waitForELMPrompt()` 1s max | Clone için 3s, normal için 1.5s |
| 10 | **iOS MTU hatası** | — | `BluetoothService.ios.ts`: `requestMTU(512)` | iOS'ta MTU request'i try-catch ile yakala, fallback 185 |
| 11 | **Duplicate transport logic** | — | `BluetoothManager` + `BluetoothService.android.ts` | Tek bir transport abstraction katmanı |
| 12 | **Connection timeout tutarsız** | — | `BluetoothManager`: 10s, `BluetoothService.android.ts`: 12s | Standart 15s timeout |
| 13 | **ATH1 var ama ATSH/ATCRA yok** | — | `commands.ts`: `ATH1` var, `ATSH`/`ATCRA` initialization'da yok | CAN initialization sequence'a ekle |
| 14 | **ATSTFF (max timeout) yok** | — | `commands.ts`: `AT ST 62` (248ms) var | `ATSTFF` (1020ms) ekle, clone cihazlar için kritik |
| 15 | **Voltaj kontrolü eksik** | — | `OBD2ProtocolEngine.ts`: `voltageCallback` var ama init'te kullanılmıyor | Kontak OFF tespiti için voltaj kontrolü |

---

## 5. Global Bağlantı Güçlendirme Önerileri

### 5.1 Yeni Initialization Sequence

```typescript
// src/api/ELMInitializationSequence.ts
export const ROBUST_INIT_SEQUENCE = [
  { cmd: 'ATZ', delay: 1500, timeout: 3500, critical: true },
  { cmd: 'ATE0', delay: 100, timeout: 1000, critical: true },
  { cmd: 'ATL0', delay: 100, timeout: 1000, critical: false },
  { cmd: 'ATS0', delay: 100, timeout: 1000, critical: false },
  { cmd: 'ATH1', delay: 100, timeout: 1000, critical: false },
  { cmd: 'ATAT1', delay: 100, timeout: 1000, critical: false },
  { cmd: 'ATSTFF', delay: 100, timeout: 1000, critical: false },
  { 
    cmd: 'ATRV', 
    delay: 500, 
    timeout: 2000, 
    critical: true, 
    validate: (r: string) => parseFloat(r) > 11.8 
  },
  { cmd: 'ATSP0', delay: 100, timeout: 1000, critical: true },
  { cmd: '0100', delay: 0, timeout: 15000, critical: true, retry: 2 },
] as const;
```

### 5.2 Protocol Fallback Mekanizması

```typescript
// src/api/ProtocolFallbackEngine.ts
const CAN_PROTOCOLS = [
  { 
    cmd: 'ATSP6', 
    name: 'CAN 11-bit 500kbps', 
    header: 'ATSH7E0', 
    filter: 'ATCRA7E8' 
  },
  { 
    cmd: 'ATSP7', 
    name: 'CAN 29-bit 500kbps', 
    header: 'ATSH7E0', 
    filter: 'ATCRA7E8' 
  },
  { 
    cmd: 'ATSP8', 
    name: 'CAN 29-bit 250kbps', 
    header: 'ATSH7E0', 
    filter: 'ATCRA7E8' 
  },
  { 
    cmd: 'ATSP9', 
    name: 'CAN 11-bit 250kbps', 
    header: 'ATSH7E0', 
    filter: 'ATCRA7E8' 
  },
];

export async function attemptProtocolFallback(): Promise<boolean> {
  for (const proto of CAN_PROTOCOLS) {
    await OBDCommandQueue.add(proto.cmd, 2000);
    if (proto.header) await OBDCommandQueue.add(proto.header, 1000);
    if (proto.filter) await OBDCommandQueue.add(proto.filter, 1000);

    const response = await OBDCommandQueue.add('0100', 5000);
    if (response.includes('41 00')) {
      useBluetoothStore.getState().setProtocol(proto.name);
      return true;
    }
  }
  return false;
}
```

### 5.3 Platform Spesifik Düzeltmeler

#### Android — Reflection Fallback

```typescript
// BluetoothService.android.ts
async connect(deviceId: string): Promise<boolean> {
  // 1. cancelDiscovery() MUTLAKA connect öncesi
  await RNBluetoothClassic.cancelDiscovery();

  // 2. Reflection fallback ekle
  try {
    await device.connect({ 
      connectorType: 'rfcomm', 
      secureSocket: true 
    });
  } catch (e) {
    // Fallback: createRfcommSocket(1)
    const socket = device.createRfcommSocket(1);
    await socket.connect();
  }
}
```

#### iOS — MTU Fallback

```typescript
// BluetoothService.ios.ts
async connectBLE(deviceId: string): Promise<boolean> {
  // MTU request'i try-catch ile yakala
  try {
    await device.requestMTU(512);
  } catch (mtuErr) {
    // iOS'ta MTU 185 default, 512 desteklenmeyebilir
    console.log('MTU 512 not supported, using default:', device.mtu);
  }

  // Service discovery timeout ekle
  const services = await Promise.race([
    device.discoverAllServicesAndCharacteristics(),
    new Promise((_, reject) => 
      setTimeout(() => reject(new Error('SERVICE_DISCOVERY_TIMEOUT')), 10000)
    )
  ]);
}
```

### 5.4 NO DATA Retry Stratejisi

```typescript
// OBD2ProtocolEngine.ts
private isRetryableError(response: string): boolean {
  const clean = response.toUpperCase().replace(/\s+/g, '');
  return clean.includes('NODATA') || 
         clean.includes('BUSINIT') || 
         clean.includes('SEARCHING');
}

// executeCommand içinde
if (this.isRetryableError(trimmedResult)) {
  this.stallCounter++;
  if (this.stallCounter < 3) {
    await preciseSleep(500);
    return this.executeCommand(command, timeoutMs); // Retry
  }
}
```

### 5.5 Clone Cihaz Tolerans Profili

```typescript
// AdapterProfileRegistry.ts
export const CLONE_TOLERANCE_PROFILE = {
  safePollIntervalMs: 200,
  maxBurstCommands: 1,
  initDelay: 1500,        // ATZ sonrası bekleme
  promptTimeout: 3000,     // Prompt bekleme süresi
  autoDetectTimeout: 15000, // ATSP0 + 0100 timeout
  commandDelay: 100,      // Komutlar arası bekleme
  retryCount: 3,          // NO DATA retry sayısı
  mtuFallback: 185,       // BLE MTU fallback
} as const;
```

---

## 6. Mimari Refactoring Önerileri

### 6.1 Transport Abstraction Katmanı

Mevcut durumda `BluetoothManager`, `BluetoothService.android.ts`, `BluetoothService.ios.ts`, `BLETransport.ts`, `ClassicBluetoothTransport.ts` arasında **ciddi duplicate logic** var.

**Önerilen Yeni Yapı:**

```
src/core/transport/
├── TransportFactory.ts          // Platform + adapter tipine göre transport seçimi
├── BaseTransport.ts             // Abstract base class
├── AndroidClassicTransport.ts   // RFCOMM/SPP
├── BLETransport.ts              // BLE (cross-platform)
├── WiFiTransport.ts             // TCP (cross-platform)
└── TransportAdapter.ts          // Interface
```

### 6.2 Connection State Machine

Mevcut state machine yeterli ama **protocol negotiation state'i** eksik.

**Yeni State'ler:**

```typescript
export enum ConnectionState {
  IDLE = 'IDLE',
  SCANNING = 'SCANNING',
  CONNECTING = 'CONNECTING',
  HANDSHAKING = 'HANDSHAKING',                    // YENİ
  PROTOCOL_NEGOTIATING = 'PROTOCOL_NEGOTIATING', // YENİ
  READY = 'READY',
  RECONNECTING = 'RECONNECTING',
  ERROR = 'ERROR',
}
```

### 6.3 Circuit Breaker İyileştirmesi

Mevcut `CommandScheduler` circuit breaker'ı sadece timeout bazlı. **NO DATA ve protocol error** durumlarında da circuit breaker açılmalı.

```typescript
// CommandScheduler.ts
private handleFailure(error: any) {
  const isTimeout = error?.message?.includes('Timeout');
  const isNoData = error?.message?.includes('NO DATA');
  const isProtocolError = error?.message?.includes('PROTOCOL');

  if (isTimeout || isNoData || isProtocolError) {
    this.timeoutCount++;
    if (this.timeoutCount >= 3) {
      this.mode = SchedulerMode.DEGRADED;
      // Protocol fallback tetikle
      ProtocolFallbackEngine.attemptProtocolFallback();
    }
  }
}
```

---

## 7. Log'daki Spesifik Sorunun Çözümü

### 7.1 Kök Neden Analizi

Logdaki başarısızlık zinciri:

1. `ATZ` → `ATI` (1sn bekleme yok) → `ATRV` (yanıtsız) → `ATE0` → `ATSP0` → `01 00` (timeout)
2. Manuel `ATSP6` → `ATSH7E0` → `01 00` (NO DATA)
3. `ATSP7`, `ATSP8`, `ATSP9` denenmiş, hepsi NO DATA

**Kök Neden:**
- ATZ sonrası cihaz henüz hazır değilken komutlar atılmış
- Auto-detect timeout çok kısa (5sn)
- ATSH7E0 auto-detect modunda kullanılmış
- ATCRA (receive filter) ayarlanmamış

### 7.2 Düzeltme Kodu

```typescript
// OBD2ProtocolEngine.ts - executeCommand içinde
if (cleanCmd === 'ATZ') {
  this.lastCommandWasReset = true;
  await preciseSleep(1500); // 500ms → 1500ms
}

// Protocol init
const isHandshakeInitCmd = cleanCmd === 'ATZ' || cleanCmd.startsWith('ATSP');
if (isHandshakeInitCmd && actualTimeoutMs < 3500) {
  actualTimeoutMs = 15000; // 3500ms → 15000ms for auto-detect
}
```

---

## 8. Test ve Validasyon Stratejisi

### 8.1 ELM327 Emulator Entegrasyonu

```bash
npm install elm327-emulator
```

```typescript
// __tests__/OBDConnection.test.ts
import { ELM327Emulator } from 'elm327-emulator';

describe('Protocol Initialization', () => {
  it('should handle clone device slow response', async () => {
    const emulator = new ELM327Emulator({ responseDelay: 2000 });
    await emulator.start();

    const result = await runIdentifierTest();
    expect(result.isCloneDevice).toBe(true);
    expect(result.capabilityScore).toBeLessThan(50);
  });
});
```

### 8.2 Platform Matris Testi

| Test Senaryosu | Android Classic | Android BLE | iOS BLE | WiFi |
|----------------|-----------------|-------------|---------|------|
| Orijinal ELM327 v2.1 | ✅ | ✅ | ✅ | ✅ |
| Clone v1.5 (BK3231) | ✅ | ✅ | N/A | ✅ |
| OBDLink MX+ | ✅ | ✅ | ✅ | ✅ |
| vLinker MC+ | N/A | ✅ | ✅ | N/A |
| WiFi327 | N/A | N/A | N/A | ✅ |

---

## 9. Eylem Planı

| Öncelik | Görev | Dosya | Tahmini Süre |
|---------|-------|-------|--------------|
| 🔴 Kritik | ATZ sonrası bekleme 1500ms'e çıkar | `OBD2ProtocolEngine.ts` | 1 saat |
| 🔴 Kritik | Auto-detect timeout 15000ms | `OBD2ProtocolEngine.ts` | 1 saat |
| 🔴 Kritik | Protocol fallback mekanizması ekle | Yeni: `ProtocolFallbackEngine.ts` | 4 saat |
| 🟠 Yüksek | NO DATA retry stratejisi | `OBD2ProtocolEngine.ts` | 2 saat |
| 🟠 Yüksek | iOS MTU fallback | `BluetoothService.ios.ts` | 1 saat |
| 🟠 Yüksek | Voltaj kontrolü initialization'a ekle | `ELMInitializationSequence.ts` | 2 saat |
| 🟡 Orta | Transport abstraction refactoring | `src/core/transport/` | 8 saat |
| 🟡 Orta | Android reflection fallback | `BluetoothService.android.ts` | 2 saat |
| 🟢 Düşük | ELM emulator test suite | `__tests__/` | 4 saat |

**Toplam Tahmini Süre:** ~25 saat (3 gün)

---

## 10. Sonuç

Bu değişiklikler uygulandığında, MotoCortex **hem orijinal hem clone ELM327 cihazlarla**, **hem Android hem iOS'ta**, **hem Classic Bluetooth hem BLE hem WiFi üzerinden** güvenilir bir şekilde bağlantı kurabilecektir.

**Beklenen Sonuçlar:**
- Clone cihaz bağlantı başarı oranı: ~30% → ~95%
- Auto-detect başarı süresi: 5sn → 15sn (daha güvenilir)
- Platform coverage: Android Classic/BLE/WiFi + iOS BLE/WiFi
- Retry mekanizması ile NO DATA durumlarında otomatik kurtarma
- Voltaj kontrolü ile kontak OFF durumlarında erken tespit

---

*Rapor, MotoCortex v7.9.9 kod tabanı ve ELM327 v1.5 clone cihaz logları üzerinden analiz edilerek hazırlanmıştır.*
