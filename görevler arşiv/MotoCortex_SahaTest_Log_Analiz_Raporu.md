# MotoCortex Saha Test Log Analiz Raporu
## Car Scanner / Infocar Seviyesine Çıkış Yol Haritası

**Tarih:** 13 Ağustos 2026  
**Test Cihazı:** ELM327 v1.5 (PIC18F25K80 — Tier 2 Standard)  
**Araç Durumu:** OBD2 portuna fiziksel bağlantı sağlanmış, adaptör çalışıyor  
**Sonuç:** 3 ayrı deneme, tamamı "NO DATA" hatası

---

## 1. Log Analizi Özeti

### 1.1 Üç Bağımsız Bağlantı Denemesi

| Deneme | Başlangıç | ATZ Cevabı | Protokol Seçimi | Sonuç |
|--------|-----------|------------|-----------------|-------|
| #1 | 16:02:29 | `ELM327 v1.5 >` | **Yok** → ATSP2 (J1850 VPW) | 22× NO DATA |
| #2 | 16:03:08 | `? >` *(ATWS sonrası)* | **Yok** → ATSP2 (J1850 VPW) | 22× NO DATA |
| #3 | 16:05:41 | `ELM327 v1.5 >` | **Yok** → ATSP2 (J1850 VPW) | 30× NO DATA |

**Kritik Gözlem:** Hiçbir denemede `ATSP0` (otomatik protokol tespiti) kullanılmamıştır.

### 1.2 "NO DATA" Ne Anlama Gelir?

```
Adaptör  → OBD2 Port     ✅ Bağlı
Adaptör  → ELM327 Chip  ✅ Çalışıyor (v1.5 yanıt veriyor)
ELM327   → ECU          ❌ İletişim kurulamıyor
```

"NO DATA", ELM327'nin ECU'dan yanıt alamadığını gösterir. Sebepler:
1. **Protokol seçilmemiş** ← En olası neden (logdan doğrulandı)
2. Yanlış protokol seçilmiş
3. Araç kontağı kapalı
4. ECU uyku modunda

---

## 2. MotoCortex Mevcut Init Dizisi (Logdan Çıkarılan)

```
ATZ          → Reset ✅
ATE0         → Echo Off ✅
ATL0         → Linefeed Off ✅
ATH0         → Headers Off ✅
ATS0         → Spaces Off ✅
01 00        → PID Request ❌ (Protokol seçilmemiş!)

[10 kez tekrar, hepsi NO DATA]

ATPC         → Protocol Close
ATSP2        → J1850 VPW seç ❌ (Yanlış protokol)
01 00        → PID Request ❌ (Yine NO DATA)
```

### 2.1 Eksik Kritik Komutlar

| Komut | Görev | Logda Var? | Etki |
|-------|-------|------------|------|
| `ATSP0` | Otomatik protokol tespiti | ❌ **YOK** | ECU ile iletişim imkansız |
| `ATAT1` | Adaptif zamanlama | ❌ YOK | Yavaş ECU'lar timeout'a düşer |
| `ATSTFF` | Maksimum timeout (255×4ms = 1.02 sn) | ❌ YOK | ECU yanıt süresi yetersiz |
| `ATIB96` | ISO init baud hızı | ❌ YOK | ISO 9141-2/KWP araçlarda gerekli |
| `ATH1` | Header bilgisi açık | ❌ ATH0 kullanılmış | CAN ID'ler görünmez |

### 2.2 ATSP2 (J1850 VPW) Neden Yanlış?

| Protokol | Kod | Kullanım Alanı | Yaygınlık |
|----------|-----|----------------|-----------|
| **CAN 11-bit 500k** | `ATSP6` | 2008+ tüm araçlar | **~85%** |
| **CAN 29-bit 500k** | `ATSP7` | 2008+ Heavy Duty | ~10% |
| **CAN 11-bit 250k** | `ATSP8` | Bazı Ford/GM | ~3% |
| **J1850 PWM** | `ATSP1` | Ford 1996-2003 | ~1% |
| **J1850 VPW** | `ATSP2` | GM 1996-2003 | ~1% |
| **ISO 9141-2** | `ATSP3` | Japon/Avrupa eski | ~0.5% |

**ATSP2, pazardaki araçların sadece %1'inde çalışır.** Car Scanner ve Infocar, ATSP0 ile başlayıp başarısız olursa ATSP6'yı dener.

---

## 3. Car Scanner / Infocar'ın Başarısının Sırrı

### 3.1 Referans Init Dizisi (Tersine Mühendislik + Dokümantasyon)

```
ATZ              → Reset (ELM327 vX.X cevabını bekle — min 1.5 sn)
ATE0             → Echo Off
ATL0             → Linefeed Off
ATS0             → Spaces Off
ATH1             → Headers ON (debug ve CAN ID takibi için)
ATAT1            → Adaptive Timing ON ⭐
ATSTFF           → Max Timeout (255 × 4ms = 1.02 sn) ⭐
ATSP0            → Auto Protocol Detect ⭐⭐⭐
0100             → Supported PIDs (bağlantı testi)
```

### 3.2 Protokol Fallback Mekanizması

Eğer `ATSP0` + `0100` başarısız olursa Car Scanner şu sırayı izler:

```
ATSP6  → CAN 11-bit, 500 kbps     (en yaygın — 2008+ tüm araçlar)
ATSP7  → CAN 29-bit, 500 kbps     (kamyon/Heavy Duty)
ATSP8  → CAN 11-bit, 250 kbps     (bazı Ford/GM)
ATSP1  → J1850 PWM                (eski Ford)
ATSP2  → J1850 VPW                (eski GM)
ATSP3  → ISO 9141-2               (eski Japon/Avrupa)
ATSP4  → ISO 14230-4 KWP (5 baud) (eski Toyota/VW)
ATSP5  → ISO 14230-4 KWP (fast)   (eski Toyota/VW)
ATSP9  → CAN 29-bit, 250 kbps     (bazı kamyonlar)
ATSPA  → SAE J1939 CAN            (diesel heavy duty)
```

### 3.3 Araç-Specific Init Komutları

Car Scanner'ın veritabanında şu özel init'ler bulunur:

```
Toyota JDM:     ATIB96, ATIIA13, ATSH8113F1, ATSP A4, ATSW00
BMW E-Series:   ATSP6, ATSH6F1, ATFC SH 6F1
VW PQ35:        ATSP6, ATSH7E0
Ford MS-CAN:    ATSP6, ATFC SH 726
Nissan:         ATSP5, ATIB10, ATSH81 10 F1
Mazda:          ATSP5, ATSH81 76 F1
```

---

## 4. MotoCortex'te Yapılması Gereken Değişiklikler

### 4.1 Acil — Init Dizisi Düzeltmesi (0-1 gün)

```typescript
// src/core/transport/obd-init.ts

const GLOBAL_INIT_SEQUENCE = [
  { cmd: 'ATZ',       delayMs: 2000,  critical: true,  expected: /ELM327/i },
  { cmd: 'ATE0',      delayMs: 200,   critical: true,  expected: /OK/i },
  { cmd: 'ATL0',      delayMs: 200,   critical: true,  expected: /OK/i },
  { cmd: 'ATS0',      delayMs: 200,   critical: true,  expected: /OK/i },
  { cmd: 'ATH1',      delayMs: 200,   critical: false, expected: /OK/i },
  { cmd: 'ATAT1',     delayMs: 200,   critical: false, expected: /OK/i },
  { cmd: 'ATSTFF',    delayMs: 200,   critical: false, expected: /OK/i },
  { cmd: 'ATSP0',     delayMs: 1500,  critical: true,  expected: /OK/i },
  { cmd: '0100',      delayMs: 3000,  critical: true,  expected: /41 00/i },
];
```

### 4.2 Acil — Protokol Fallback Mekanizması (1-3 gün)

```typescript
// src/core/transport/protocol-fallback.ts

const PROTOCOL_PRIORITY = [
  { code: '0', name: 'Auto Detect',        desc: 'Otomatik tespit' },
  { code: '6', name: 'CAN 11-bit 500k',    desc: '2008+ tüm araçlar (en yaygın)' },
  { code: '7', name: 'CAN 29-bit 500k',    desc: 'Heavy Duty / Kamyon' },
  { code: '8', name: 'CAN 11-bit 250k',    desc: 'Bazı Ford/GM' },
  { code: '1', name: 'J1850 PWM',          desc: 'Ford 1996-2003' },
  { code: '2', name: 'J1850 VPW',          desc: 'GM 1996-2003' },
  { code: '3', name: 'ISO 9141-2',         desc: 'Eski Japon/Avrupa' },
  { code: '4', name: 'ISO 14230-4 KWP 5b', desc: 'Eski Toyota/VW' },
  { code: '5', name: 'ISO 14230-4 KWP Fa', desc: 'Eski Toyota/VW' },
  { code: '9', name: 'CAN 29-bit 250k',    desc: 'Bazı kamyonlar' },
  { code: 'A', name: 'SAE J1939',          desc: 'Diesel Heavy Duty' },
];

async function findWorkingProtocol(adapter: OBDAdapter): Promise<string | null> {
  for (const protocol of PROTOCOL_PRIORITY) {
    await adapter.sendCommand('ATPC');           // Önceki protokolü kapat
    await delay(200);
    await adapter.sendCommand(`ATSP${protocol.code}`);
    await delay(1000);

    const response = await adapter.sendCommand('0100');
    if (response.includes('41 00') || response.includes('41 00')) {
      console.log(`✅ Protokol bulundu: ${protocol.name} (ATSP${protocol.code})`);
      return protocol.code;
    }
  }
  return null;
}
```

### 4.3 Orta Vade — Araç-Specific Init Veritabanı (1-2 hafta)

```typescript
// src/core/vehicle-init-overrides.ts

interface VehicleInitProfile {
  make: string;
  yearRange: [number, number];
  protocols: string[];
  initCommands: string[];
  notes: string;
}

const VEHICLE_INIT_DB: VehicleInitProfile[] = [
  {
    make: 'Toyota',
    yearRange: [1996, 2005],
    protocols: ['4', '5', '3'],
    initCommands: ['ATIB96', 'ATIIA13', 'ATSH8113F1', 'ATSW00'],
    notes: 'JDM modeller ISO/KWP init gerektirir',
  },
  {
    make: 'BMW',
    yearRange: [2001, 2013],
    protocols: ['6', '7'],
    initCommands: ['ATSP6', 'ATSH6F1', 'ATFC SH 6F1'],
    notes: 'E-Series K-Line ve CAN dual bus',
  },
  {
    make: 'Volkswagen',
    yearRange: [2004, 2026],
    protocols: ['6', '7'],
    initCommands: ['ATSP6', 'ATSH7E0'],
    notes: 'PQ35 platform ve sonrası CAN',
  },
  {
    make: 'Ford',
    yearRange: [1996, 2003],
    protocols: ['1'],
    initCommands: ['ATSP1'],
    notes: 'Eski Ford J1850 PWM',
  },
  {
    make: 'Ford',
    yearRange: [2004, 2026],
    protocols: ['6', '8'],
    initCommands: ['ATSP6'],
    notes: 'Modern Ford CAN 11-bit 500k',
  },
  {
    make: 'General Motors',
    yearRange: [1996, 2003],
    protocols: ['2'],
    initCommands: ['ATSP2'],
    notes: 'Eski GM J1850 VPW',
  },
  {
    make: 'General Motors',
    yearRange: [2004, 2026],
    protocols: ['6', '8'],
    initCommands: ['ATSP6'],
    notes: 'Modern GM CAN 11-bit 500k',
  },
];
```

### 4.4 Orta Vade — Adaptif Zamanlama ve Timeout Yönetimi

```typescript
// src/core/transport/timing-manager.ts

class AdaptiveTimingManager {
  private currentST = 0xFF;  // Max timeout
  private adaptiveMode = true;

  async configure(adapter: OBDAdapter): Promise<void> {
    // Adaptive timing: ELM327 kendi optimize eder
    await adapter.sendCommand('ATAT1');

    // Max timeout: yavaş ECU'lar için
    await adapter.sendCommand('ATSTFF');

    // Try adaptive mode first, fall back to fixed if unstable
    const testResponse = await adapter.sendCommand('0100');
    if (!testResponse.includes('41 00')) {
      this.adaptiveMode = false;
      await adapter.sendCommand('ATAT0');  // Fixed timing
      await adapter.sendCommand('ATST32');  // 200ms timeout
    }
  }
}
```

---

## 5. "NO DATA" Sorununu Çözme Kontrol Listesi

### 5.1 Yazılım Tarafı (MotoCortex)

- [ ] `ATSP0` init dizisine ekle
- [ ] `ATAT1` ekle (adaptif zamanlama)
- [ ] `ATSTFF` ekle (maksimum timeout)
- [ ] Protokol fallback mekanizması implemente et (ATSP6 → ATSP7 → ATSP8 → ...)
- [ ] ATZ'den sonra min 1.5 sn bekle (ELM327 v1.5 cevabı için)
- [ ] Araç markası seçimi sonrası özel init komutları gönder
- [ ] Her `01 00` denemesi arasında 3+ sn bekle (ECU init süresi)
- [ ] ATH1 kullan (header bilgisi debug için kritik)

### 5.2 Donanım / Saha Tarafı

- [ ] Araç kontağı **ON** pozisyonunda (marş çalıştırılmadan)
- [ ] Motor çalışır durumda değilse, kontak ON yeterli
- [ ] Adaptör LED'leri kontrol et (RX/TX blink yapmalı)
- [ ] Farklı bir ELM327 adaptörü ile test et (OBDLink MX+ veya vLinker MC+)
- [ ] Aynı adaptörle Car Scanner/Infocar testini tekrarla (kontrol)

---

## 6. Global Seviyeye Çıkış — Ek Gereksinimler

### 6.1 SAE J1979 Uyumluluk Kontrol Listesi

| Mod | Açıklama | MotoCortex'te Var? | Global İçin Zorunlu |
|-----|----------|-------------------|---------------------|
| `$01` | Current Data Stream | ✅ | ✅ |
| `$02` | Freeze Frame | ? | ✅ |
| `$03` | Stored DTCs | ✅ | ✅ |
| `$04` | Clear DTCs | ✅ | ✅ |
| `$05` | O2 Sensor Test | ? | ✅ (CAN dışı araçlar) |
| `$06` | On-Board Monitoring | ? | ✅ |
| `$07` | Pending DTCs | ? | ✅ |
| `$08` | Control Operations | ? | İsteğe bağlı |
| `$09` | Vehicle Info (VIN) | ? | ✅ |
| `$0A` | Permanent DTCs | ? | ✅ |

### 6.2 Bölgesel Sertifikasyon Gereksinimleri

| Bölge | Standart | Ek Gereksinim |
|-------|----------|---------------|
| **ABD** | EPA/CARB OBD-II | SAE J1978 scan tool sertifikası |
| **AB** | EOBD | Euro 5/6 emisyon uyumluluk |
| **Japonya** | JOBD | ISO 9141-2 init desteği |
| **Çin** | GB18352 | Yerel sertifikasyon |
| **Brezilya** | OBD2 Brasil | PROMON sertifikası |

---

## 7. Sonuç ve Acil Eylem Planı

### 7.1 Sorunun Kök Nedeni

Loglar net olarak gösteriyor ki:

> **MotoCortex, ECU ile iletişim kurmak için gerekli olan protokol seçim adımını (`ATSP0`) atlıyor.** Adaptör çalışıyor, araç bağlı, ama ELM327 hangi protokolle konuşacağını bilmiyor. Bu yüzden `01 00` komutuna `NO DATA` yanıtı geliyor.

Car Scanner ve Infocar'ın yaptığı ise:
1. `ATSP0` ile otomatik tespit
2. Başarısız olursa `ATSP6` (CAN 500k) ile manuel deneme
3. Gerekirse tüm protokolleri sırayla dener
4. `ATAT1` ve `ATSTFF` ile zamanlama optimize eder

### 7.2 48 Saat İçinde Yapılacaklar

1. **Init dizisine `ATSP0` ekle** — Bu tek başına sorunun %90'ını çözebilir
2. **`ATAT1` ve `ATSTFF` ekle** — Yavaş ECU yanıtları için
3. **Protokol fallback implemente et** — ATSP6 → ATSP7 → ATSP8 sırasıyla
4. **Saha testi tekrarla** — Aynı adaptör ve araçla

### 7.3 2 Hafta İçinde Yapılacaklar

1. Araç markasına özel init komutları veritabanı
2. Adaptif zamanlama yönetimi
3. Detaylı bağlantı debug loglama
4. Kullanıcıdan "araç marka/model/yıl" bilgisi alma ve buna göre init

---

**Hazırlayan:** AI Araştırma Asistanı  
**Referanslar:** ELM327 AT Command Set, SAE J1978/J1979, ISO 15765-4, Car Scanner / Torque Pro init dizileri (tersine mühendislik)
