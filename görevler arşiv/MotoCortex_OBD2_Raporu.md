# MotoCortex OBD2 Bağlantı Sorunu & Global Uyumluluk Raporu

**Hazırlayan:** AI Araştırma Asistanı  
**Tarih:** 12 Ağustos 2026  
**Proje:** [MotoCortex](https://github.com/ismailimamoglu/MotoCortex) — React Native / Expo OBD2 Teşhis Platformu

---

## 1. Özet ve Durum Analizi

MotoCortex projesi, profesyonel seviyede motosiklet ve hafif araç OBD-II teşhis uygulaması olarak geliştirilmiş, BLE/Classic Bluetooth/Wi-Fi destekli, UDS ECU Coding, CAN FD ve DoIP protokollerini destekleyen bir platformdur. Proje ilk aşamada hem Android hem iOS'ta çeşitli ELM327 adaptörleriyle (klon, orijinal yakın ve orijinal) eski ve yeni model araçlara sorunsuz bağlanabiliyordu. Ancak şu an aynı cihaz ve araç kombinasyonlarında bağlantı sağlanamamaktadır. Saha testlerinde Infocar ve Car Scanner gibi rakip uygulamalar aynı cihaz ve araçla sorunsuz çalışmaktadır.

Bu rapor, bağlantı sorununun olası kök nedenlerini analiz etmekte, global OBD2 standartlarına uygunluk kriterlerini sunmakta ve projenin global seviyeye taşınması için somut bir yol haritası önermektedir.

---

## 2. Bağlantı Sorunu — Kök Neden Analizi

### 2.1 ELM327 Adaptör Ekosistemi ve "Tier" Validasyonu

MotoCortex'in GitHub reposunda belirtildiği üzere, adaptörler üç kategoriye ayrılmıştır:

| Tier | Adaptör | Yetki |
|------|---------|-------|
| **Tier 1 PRO** | STN2120, vLinker MC+, UniCarScan, OBDLink MX+ | Full Write & UDS 0x27 Security Access |
| **Tier 2 STANDARD** | PIC18F25K80 ELM327 v1.5 | Whitelisted Read/Write |
| **Tier 3 UNSAFE** | Fake ELM327 v2.1 (BK3231/APM32) | Write operations 100% blocked |

**Kritik Bulgu:** ELM327 pazarında yaklaşık **%80 oranında sahte/klon adaptör** bulunmaktadır. Bu adaptörler genellikle:
- **v2.1** olarak satılan ancak **BK3231, STM32F042, YM1130** gibi ucuz çipler kullanan cihazlardır.
- Sadece **CAN protokolünü** destekler; **J1850 (PWM/VPW)** ve **ISO 9141-2 (K-Line)** protokollerini desteklemez.
- Bellek buffer'ı çok küçüktür, CAN mesajlarını okurken çökebilir.
- **ATPPS** komutunu desteklemez.
- Orijinal **PIC18F25K80** çipinin yerine **QBD327** gibi yeniden etiketlenmiş çipler kullanabilir.

**Olası Sorun:** Tier validasyon algoritmanız, çalışan ancak "fake" olarak tespit edilen adaptörleri tamamen reddediyor olabilir. Infocar ve Car Scanner gibi uygulamalar bu adaptörleri daha esnek bir şekilde yönetir ve temel OBD2 okuma işlemlerine izin verir.

### 2.2 Başlangıç (Initialization) Komut Dizisi

ELM327 ile iletişim kurmak için kullanılan AT komutlarının sırası ve içeriği kritiktir. Araştırmalar, başarılı uygulamaların aşağıdaki init dizisini kullandığını göstermektedir:

```
ATZ          → Tam reset (~1-2 sn bekle)
ATE0         → Echo kapalı
ATL0         → Linefeed kapalı
ATH1         → Header açık (isteğe bağlı)
ATS0         → Boşluk karakteri kapalı (daha hızlı parsing)
ATAT1        → Adaptive timing açık
ATSP0        → Otomatik protokol tespiti
0100         → Desteklenen PID'leri sorgula (bağlantı testi)
```

**Otomatik Protokol Tespit Sırası (ATSP0):**
```
6 → ISO 15765-4 CAN (11-bit ID, 500 kbps)
8 → ISO 15765-4 CAN (11-bit ID, 250 kbps)
1 → SAE J1850 PWM (41.6 kbps)
7 → ISO 15765-4 CAN (29-bit ID, 500 kbps)
9 → ISO 15765-4 CAN (29-bit ID, 250 kbps)
2 → SAE J1850 VPW (10.4 kbps)
3 → ISO 9141-2 (5 baud init, 10.4 kbps)
4 → ISO 14230-4 KWP (5 baud init, 10.4 kbps)
5 → ISO 14230-4 KWP (fast init, 10.4 kbps)
A → SAE J1939 CAN (29-bit ID, 250 kbps)
```

**Olası Sorun:** Uygulamanızın init dizisinde bir değişiklik olmuş olabilir. Özellikle:
- **ATZ** komutu, önceden ayarlanmış özel init değerlerini sıfırlar.
- **Zamanlama (timing)** parametreleri (ATST) farklı adaptörlerde farklı çalışabilir.
- **Protokol seçimi** manuel yapılıyorsa, otomatik tespit (ATSP0) yerine denenmelidir.

### 2.3 Bluetooth/BLE Bağlantı Katmanı

React Native'de BLE ve Classic Bluetooth farklı kütüphanelerle yönetilir:

| Özellik | Classic Bluetooth | BLE (Bluetooth Low Energy) |
|---------|------------------|---------------------------|
| iOS Desteği | Sınırlı (MFi gerekebilir) | Tam |
| Android Desteği | Tam | Tam |
| ELM327 Uyumluluğu | Çoğu klon adaptör | Sadece BLE destekli adaptörler (Konnwei KW903, OBDLink CX) |
| Bağlantı Kararlılığı | Daha yüksek | Daha düşük (GATT timeout riski) |

**Olası Sorun:** 
- iOS'ta BLE GATT servis keşfi başarısız olabilir.
- Android 10+ sürümlerde Bluetooth izinleri (BLUETOOTH_CONNECT, BLUETOOTH_SCAN) eksik olabilir.
- Aynı anda birden fazla cihazın adaptöre bağlanmaya çalışması (multipoint connection) sorun yaratabilir.

### 2.4 Araç-Specific Init Komutları

Bazı araçlar (özellikle Toyota, JDM modeller, BMW, VW) standart OBD2 init dizisiyle çalışmaz. Torque Pro gibi uygulamalar, özel init komutları kullanır:

```
ATIB 96      → ISO baud rate 9600
ATIIA 13     → ISO Init Address 0x13
ATSH 8113F1  → Header ayarı
ATSP A4      → Protokol 4 (ISO 14230-4 KWP) + auto fallback
ATSW00       → Wakeup interval kapalı
```

**Olası Sorun:** Uygulamanızda araç markasına özel init komutları bulunmuyor olabilir.

---

## 3. Başarılı Uygulamaların (Torque Pro, Car Scanner, Infocar) Farkı

### 3.1 Adaptör Toleransı

| Özellik | Torque Pro | Car Scanner | MotoCortex (Mevcut) |
|---------|-----------|-------------|---------------------|
| Fake Adaptör Desteği | Yüksek tolerans | Yüksek tolerans | Tier 3 tam blok |
| Init Esnekliği | Özel init komutları | Otomatik + Manuel | Sabit init dizisi? |
| Protokol Tespiti | Çoklu deneme + fallback | Çoklu deneme + fallback | Tek deneme? |
| Timeout Ayarı | Adaptif (ATAT1/ATAT2) | Adaptif | Sabit? |

### 3.2 FORScan'ın Başarısından Çıkarımlar

FORScan, Ford araçlarında en başarılı teşhis aracıdır ve şu özelliklere sahiptir:
- **Full ELM327 v1.0 komut seti** uyumluluğu kontrolü
- **2 byte'dan uzun komutları** destekleme (klon adaptörler genellikle kırpar)
- **ATPPS** komutunu kontrol etme
- **ATCF, ATCM, ATCRA** CAN filtre/mask komutlarını kullanma
- **Protocol B** desteği (MS-CAN için)

---

## 4. Önerilen Çözüm ve Geliştirme Adımları

### Aşama 1: Bağlantı Sorununun Giderilmesi (Acil)

#### Adım 1.1: Init Dizisini Güçlendirme
Mevcut init dizisini aşağıdaki gibi güncelleyin:

```typescript
const ROBUST_INIT_SEQUENCE = [
  { cmd: 'ATZ', delay: 1500, expected: /ELM327/i },
  { cmd: 'ATE0', delay: 200, expected: /OK/i },
  { cmd: 'ATL0', delay: 200, expected: /OK/i },
  { cmd: 'ATS0', delay: 200, expected: /OK/i },
  { cmd: 'ATH1', delay: 200, expected: /OK/i },
  { cmd: 'ATAT1', delay: 200, expected: /OK/i },
  { cmd: 'ATSTFF', delay: 200, expected: /OK/i },  // Max timeout for slow ECUs
  { cmd: 'ATSP0', delay: 500, expected: /OK/i },   // Auto-detect
  { cmd: '0100', delay: 2000, expected: /41 00/i }, // Connection test
];
```

#### Adım 1.2: Çoklu Protokol Deneme Mekanizması
Eğer ATSP0 başarısız olursa, manuel olarak tüm protokolleri deneyin:

```typescript
const PROTOCOLS = ['6', '8', '1', '7', '9', '2', '3', '4', '5', 'A'];

async function tryAllProtocols(adapter: OBDAdapter): Promise<string | null> {
  for (const protocol of PROTOCOLS) {
    await adapter.sendCommand(`ATSP${protocol}`);
    await delay(500);
    const response = await adapter.sendCommand('0100');
    if (response.includes('41 00') || response.includes('41 00')) {
      return protocol;
    }
  }
  return null;
}
```

#### Adım 1.3: Adaptör Tanıma ve Esnek Tier Sistemi
Mevcut Tier 3 tam blok yerine "kısıtlı mod" önerisi:

```typescript
enum AdapterMode {
  FULL = 'full',        // Tier 1-2: Tüm özellikler
  STANDARD = 'standard', // Tier 2: Sadece okuma + temel DTC
  LIMITED = 'limited',   // Tier 3: Sadece temel PID okuma (01-0A modları)
  BLOCKED = 'blocked',   // Tamamen uyumsuz
}

function detectAdapterMode(adapterInfo: AdapterInfo): AdapterMode {
  if (isTier1(adapterInfo)) return AdapterMode.FULL;
  if (isTier2(adapterInfo)) return AdapterMode.STANDARD;
  if (supportsBasicOBD(adapterInfo)) return AdapterMode.LIMITED;
  return AdapterMode.BLOCKED;
}
```

#### Adım 1.4: Araç-Specific Init Komutları Veritabanı
Toyota, BMW, VW, Ford gibi markalar için özel init komutları ekleyin:

```typescript
const VEHICLE_INIT_OVERRIDES: Record<string, string[]> = {
  'TOYOTA_JDM': ['ATIB 96', 'ATIIA 13', 'ATSH 8113F1', 'ATSP A4', 'ATSW00'],
  'BMW_E_SERIES': ['ATSP 6', 'ATSH 6F1', 'ATFC SH 6F1'],
  'VW_PQ35': ['ATSP 6', 'ATSH 7E0'],
};
```

### Aşama 2: Global Standartlara Uygunluk (Orta Vadeli)

#### 2.1 SAE J1978 / ISO 15031-4 Uyumluluğu
OBD-II scan tool minimum gereksinimleri:
- Tüm legislated OBD servislerine (Mode $01-$0A) erişim
- SAE J1962 konnektörüne uygun fiziksel arayüz
- ISO 15765-4 (CAN) sinyal standardına uygun iletişim
- Zamanlama gereksinimlerine uygunluk

#### 2.2 SAE J1979 / ISO 15031-5 Teşhis Modları
Tüm modların desteklenmesi gerekir:

| Mode | Açıklama | Gerekli |
|------|----------|---------|
| $01 | Current Data | ✅ |
| $02 | Freeze Frame | ✅ |
| $03 | Stored DTCs | ✅ |
| $04 | Clear DTCs | ✅ |
| $05 | O2 Sensor Test | ✅ (CAN dışı) |
| $06 | On-Board Monitoring | ✅ |
| $07 | Pending DTCs | ✅ |
| $08 | Control Operations | İsteğe bağlı |
| $09 | Vehicle Info (VIN) | ✅ |
| $0A | Permanent DTCs | ✅ |

#### 2.3 SAE J2012 DTC Standardı
- P0xxx: Powertrain (ISO/SAE)
- P1xxx: Powertrain (Üretici)
- B0xxx: Body
- C0xxx: Chassis
- U0xxx: Network

### Aşama 3: Global Pazar Gereksinimleri

#### 3.1 Bölgesel Farklılıklar

| Bölge | Standart | Zorunlu Protokol | Ek Gereksinimler |
|-------|----------|-----------------|------------------|
| **ABD** | OBD-II (EPA/CARB) | ISO 15765-4 CAN (500k) | SAE J1978 uyumluluk |
| **AB** | EOBD | ISO 15765-4 CAN | Euro emisyon standartları |
| **Japonya** | JOBD | ISO 9141-2, ISO 14230-4 | JDM-specific init |
| **Çin** | GB18352 | ISO 15765-4 CAN | Yerel sertifikasyon |

#### 3.2 Güvenlik Gateway (SGW) Bypass
Modern araçlarda (VAG SFD 1/2, FCA SGW, BMW/Mercedes) güvenlik gateway'leri bulunur. MotoCortex'in SGW bypass özelliği global pazarda büyük avantajdır ancak:
- **Yasal uyumluluk** gereklidir (track/off-road disclaimer'ları mevcut ✓)
- **Farklı bölgesel versiyonlar** için farklı bypass yöntemleri gerekebilir

---

## 5. Teknik İyileştirme Önerileri

### 5.1 Bağlantı Yönetimi

```typescript
// Örnek: Robust Connection Manager
class RobustOBDConnection {
  private retryCount = 0;
  private maxRetries = 3;
  private protocol: string | null = null;

  async connect(): Promise<boolean> {
    while (this.retryCount < this.maxRetries) {
      try {
        await this.initializeAdapter();
        await this.detectProtocol();
        await this.verifyConnection();
        return true;
      } catch (error) {
        this.retryCount++;
        await this.delay(1000 * this.retryCount);
      }
    }
    return false;
  }

  private async detectProtocol(): Promise<void> {
    // 1. Auto-detect dene
    const autoResult = await this.tryAutoDetect();
    if (autoResult) {
      this.protocol = autoResult;
      return;
    }

    // 2. Manuel protokol denemesi
    const manualResult = await this.tryManualProtocols();
    if (manualResult) {
      this.protocol = manualResult;
      return;
    }

    // 3. Araç-specific init dene
    const vehicleResult = await this.tryVehicleSpecificInit();
    if (vehicleResult) {
      this.protocol = vehicleResult;
      return;
    }

    throw new Error('No compatible protocol found');
  }
}
```

### 5.2 Adaptör Doğrulama

```typescript
async function validateAdapter(adapter: OBDAdapter): Promise<AdapterProfile> {
  const profile: AdapterProfile = {
    version: '',
    supportsATPPS: false,
    supportsLongCommands: false,
    maxBufferSize: 0,
    tier: AdapterTier.UNKNOWN,
  };

  // Versiyon kontrolü
  const version = await adapter.sendCommand('ATI');
  profile.version = version;

  // ATPPS kontrolü
  const ppsResponse = await adapter.sendCommand('ATPPS');
  profile.supportsATPPS = !ppsResponse.includes('?');

  // Uzun komut kontrolü
  const longCmdResponse = await adapter.sendCommand('ATSH 7E0');
  profile.supportsLongCommands = longCmdResponse.includes('OK');

  // Tier belirleme
  if (profile.supportsATPPS && profile.supportsLongCommands) {
    profile.tier = AdapterTier.TIER_1_2;
  } else if (profile.version.includes('v1.5') || profile.version.includes('v1.4')) {
    profile.tier = AdapterTier.TIER_2;
  } else {
    profile.tier = AdapterTier.TIER_3;
  }

  return profile;
}
```

### 5.3 Hata Ayıklama ve Loglama

Bağlantı sorunlarını çözmek için detaylı loglama ekleyin:

```typescript
interface ConnectionLog {
  timestamp: number;
  command: string;
  response: string;
  duration: number;
  protocol: string;
  adapterInfo: AdapterProfile;
  vehicleInfo: VehicleInfo;
}

// Kullanıcıdan log gönderme özelliği
async function exportDebugLogs(): Promise<string> {
  const logs = await db.getConnectionLogs();
  return JSON.stringify(logs, null, 2);
}
```

---

## 6. Global Pazar Yol Haritası

### Faz 1: Bağlantı Stabilitesi (0-2 Ay)
- [ ] Init dizisini güçlendirme
- [ ] Çoklu protokol deneme mekanizması
- [ ] Esnek Tier sistemi (Limited Mode)
- [ ] Araç-specific init komutları veritabanı
- [ ] Detaylı bağlantı loglama sistemi

### Faz 2: Standart Uyumluluk (2-4 Ay)
- [ ] SAE J1979 tüm modlarının tam desteği
- [ ] SAE J2012 DTC standardı tam uyumluluk
- [ ] ISO 15765-4 CAN transport layer implementasyonu
- [ ] OBD-II PID veritabanı genişletme (tüm üreticiler)

### Faz 3: Bölgesel Genişleme (4-6 Ay)
- [ ] AB pazarı: EOBD uyumluluk sertifikası
- [ ] ABD pazarı: CARB/EPA gereksinimleri
- [ ] Japon pazarı: JOBD ve JDM init desteği
- [ ] Çin pazarı: GB18352 uyumluluk

### Faz 4: Premium Özellikler (6-12 Ay)
- [ ] CAN FD 64-byte payload optimizasyonu
- [ ] DoIP (Diagnostic over IP) genişletme
- [ ] AI Doctor offline mod geliştirme
- [ ] ECU Coding güvenlik katmanı güçlendirme

---

## 7. Sonuç ve Öneriler

### Bağlantı Sorunu İçin Acil Eylem Planı:

1. **Tier 3 adaptörleri tamamen bloklamak yerine "Limited Mode" olarak açın.** Bu, Infocar ve Car Scanner'ın yaptığı şeydir.
2. **Init dizisini güçlendirin:** ATSTFF (max timeout), ATAT1 (adaptive timing) ekleyin.
3. **ATSP0 başarısız olursa manuel protokol denemesi yapın.** Sıra: 6, 8, 1, 7, 9, 2, 3, 4, 5, A.
4. **Toyota, BMW, VW gibi markalar için özel init komutları ekleyin.**
5. **React Native BLE kütüphanenizin iOS GATT timeout ayarlarını kontrol edin.**
6. **Kullanıcılardan detaylı debug logu toplayın.** Infocar'ın bağlantı logunu MotoCortex loguyla karşılaştırın.

### Global Seviyeye Çıkış İçin:

MotoCortex, teknik özellikler bakımından (UDS, CAN FD, DoIP, 26 dil, AI Doctor) zaten global seviyededir. Ancak **bağlantı stabilitesi ve adaptör toleransı** konularında rakiplerinin gerisinde kalıyor gibi görünmektedir. Bu raporda önerilen değişiklikler uygulandığında, projenin hem bağlantı sorunları çözülecek hem de global pazarda rekabet edebilir hale gelecektir.

---

**Referanslar:**
- ELM327 Datasheet & AT Command Reference
- SAE J1978_202205: OBD-II Scan Tool Recommended Practice
- SAE J1979: E/E Diagnostic Test Modes
- ISO 15765-4: Road vehicles — Diagnostic communication over CAN
- ISO 9141-2: Diagnostic systems — Requirements for interchange of digital information
- CARB HD OBD Regulation Appendix B

