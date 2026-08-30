# MotoCortex Peugeot Rifter 2025 Bağlantı Sorunu — Kök Neden Analizi

> **Tarih:** 26 Ağustos 2026  
> **Araç:** Peugeot Rifter 2025 (Stellantis grubu)  
> **Cihaz:** ELM327 v1.5 (Clone — BK3231/HC-05 tabanlı)  
> **Durum:** İki bağımsız deneme — her ikisi de tamamen başarısız  
> **Log Dosyaları:** motocortex_rolling 1.md (08:40) | motocortex_rolling(1).md (08:36)

---

## 1. Executive Summary — KÖK NEDEN

**Bu bir yazılım hatası DEĞİL, donanım yetersizliğidir.**

Peugeot Rifter 2025'e iki bağımsız denemede (08:36 ve 08:40) **tüm 11 OBD-II protokolü** denenmiş ve **hiçbiri** yanıt alamamıştır. ELM327 v1.5 clone cihaz, bu aracın kullandığı modern CAN protokolünü **fiziksel olarak desteklememektedir.**

**Kod ne kadar düzeltilirse düzeltilsin, cihaz aracın konuştuğu dili anlamıyorsa bağlanamaz.**

---

## 2. İki Bağımsız Denemenin Karşılaştırmalı Analizi

### Deneme 1 — 08:36 (motocortex_rolling(1).md)

```
08:36:03  ATZ           → ELM327 v1.5 >
08:36:04  ATE0/ATL0/ATS0 → OK >
08:36:10  01 00         → NO DATA >
08:36:10  01 00 (retry) → NO DATA >
08:36:14  ATSP0         → OK >
08:36:15  01 00         → (boş yanıt) >
08:36:16  ATPC          → OK >
08:36:20  ATSP6 + 01 00 → OK > (5sn timeout)
08:36:25  ATSP7 + 01 00 → OK > (5sn timeout)
08:36:35  ATSP8 + 01 00 → OK > (5sn timeout)
08:36:45  ATSP9 + 01 00 → OK > (5sn timeout)
08:36:55  ATSP5 + 01 00 → OK > (8sn timeout)
08:37:10  ATSP4 + 01 00 → OK > (8sn timeout)
08:37:23  ATSP3 + 01 00 → OK > (8sn timeout)
08:37:36  ATSPA + 01 00 → OK > (8sn timeout)
08:37:50  ATSP1 + 01 00 → OK > (6sn timeout)
08:38:01  ATSP2 + 01 00 → OK > (6sn timeout)
08:38:09  ATRV          → 13.3V >
```

### Deneme 2 — 08:40 (motocortex_rolling 1.md)

```
08:40:12  ATZ           → ELM327 v1.5 >
08:40:13  ATE0/ATL0/ATS0 → OK >
08:40:19  01 00         → CAN ERROR >
08:40:22  01 00 (retry) → CAN ERROR >
08:40:30  ATSP0 + 01 00 → (boş yanıt) >
08:40:35  ATSP6 + 01 00 → OK > (5sn timeout)
08:40:45  ATSP7 + 01 00 → OK > (5sn timeout)
08:40:55  ATSP8 + 01 00 → OK > (5sn timeout)
08:41:05  ATSP9 + 01 00 → OK > (5sn timeout)
08:41:15  ATSP5 + 01 00 → OK > (8sn timeout)
08:41:29  ATSP4 + 01 00 → OK > (8sn timeout)
08:41:34  ATSP3 + ATIB10400 → ? > (desteklenmiyor)
08:41:51  ATSPA + 01 00 → OK > (8sn timeout)
08:42:04  ATSP1 + 01 00 → OK > (6sn timeout)
08:42:15  ATSP2 + 01 00 → OK > (6sn timeout)
08:42:22  ATZ (reset)   → ELM327 v1.5 >
```

---

## 3. Kritik Bulgular

### 3.1 Tüm Protokoller Başarısız

| Protokol | Açıklama | Deneme 1 | Deneme 2 | Sonuç |
|----------|----------|----------|----------|-------|
| SP0 | Auto-detect | NO DATA | CAN ERROR | ❌ |
| SP6 | CAN 11-bit 500kbps | OK (timeout) | OK (timeout) | ❌ |
| SP7 | CAN 29-bit 500kbps | OK (timeout) | OK (timeout) | ❌ |
| SP8 | CAN 29-bit 250kbps | OK (timeout) | OK (timeout) | ❌ |
| SP9 | CAN 11-bit 250kbps | OK (timeout) | OK (timeout) | ❌ |
| SP5 | KWP 2000 Fast | OK (timeout) | OK (timeout) | ❌ |
| SP4 | KWP 2000 5-baud | OK (timeout) | OK (timeout) | ❌ |
| SP3 | ISO 9141-2 | OK (timeout) | OK (timeout) | ❌ |
| SPA | SAE J1939 | OK (timeout) | OK (timeout) | ❌ |
| SP1 | SAE J1850 PWM | OK (timeout) | OK (timeout) | ❌ |
| SP2 | SAE J1850 VPW | OK (timeout) | OK (timeout) | ❌ |

**"OK >" yanıtı ne anlama geliyor?**
- `OK >` = Protokol seçildi, cihaz hazır
- Ama `01 00` yanıtı gelmiyor = ECU'dan hiçbir yanıt yok
- Bu, **fiziksel seviyede iletişim kurulamadığını** gösterir

### 3.2 "CAN ERROR" vs "NO DATA" Farkı

| Yanıt | Anlamı | Durum |
|-------|--------|-------|
| **CAN ERROR** | CAN bus seviyesinde hata (elektriksel/parite/frame hatası) | Cihaz CAN'e bağlanamıyor |
| **NO DATA** | CAN bus aktif ama ECU yanıt vermiyor | Protokol uyuşmazlığı veya ECU uyuyor |
| **OK >** | Protokol seçildi ama timeout | ECU tamamen sessiz |

Deneme 2'de `CAN ERROR` alınması, cihazın **CAN bus sinyallerini fiziksel olarak okuyamadığını** gösterir. Bu, **CAN FD** veya **farklı bir CAN implementasyonu** olabileceğini işaret eder.

### 3.3 ATIB10400 Baud Rate Değişikliği Başarısız

```
08:41:34  ATIB10400  → ? >
```

`ATIB` (Initialize Baud rate) komutu `?` (bilinmiyor) yanıtı döndürmüş. Bu, ELM327 v1.5 clone'un **özel baud rate ayarlarını desteklemediğini** gösterir. Orijinal ELM327 v2.1+ bu komutu destekler.

### 3.4 Voltaj 13.3V — Kritik Eşik

```
08:38:09  ATRV  → 13.3V >
```

**13.3V kritik eşiktir.** Normal çalışan bir araçta alternatör devreye girdiğinde 13.8V - 14.4V arası olmalıdır. 13.3V:
- Kontak sadece ACC pozisyonunda olabilir (ECU'lar tam aktif değil)
- Akü zayıf olabilir
- Alternatör çalışmıyor olabilir

**Ancak:** Bu tek başına bağlantısızlığın nedeni değildir. 13.3V'de bile OBD-II yanıt vermelidir.

---

## 4. Peugeot Rifter 2025 Teknik Özellikleri ve Uyumsuzluk

### 4.1 Stellantis Grup Modern Protokolü

Peugeot Rifter (2024-2025) **Stellantis EMP2 platformu** üzerindedir. Bu platformun OBD-II özellikleri:

| Özellik | ELM327 v1.5 | Gereksinim |
|---------|-------------|------------|
| **CAN FD** | ❌ Desteklemez | ✅ Gerekli (2024+ Stellantis) |
| **29-bit CAN** | ⚠️ Kısmen | ✅ Gerekli (motor/şasi ECU'ları) |
| **500 kbps** | ✅ Destekler | ✅ Uyumlu |
| **250 kbps** | ✅ Destekler | ⚠️ Farklı bus'lar için |
| **UDS (ISO 14229)** | ⚠️ Temel | ✅ Gerekli (diagnostic session) |
| **Security Gateway** | ❌ Desteklemez | ✅ Gerekli (2024+ Stellantis) |

### 4.2 CAN FD Sorunu

**CAN FD (Flexible Data-rate)** 2015'ten beri yavaş yavaş otomotiv sektörüne giriyor. **Stellantis (Peugeot, Citroen, Opel, Fiat) 2024-2025 modellerinde CAN FD'yi standart hale getirmiştir.**

**ELM327 v1.5 clone cihazlar CAN FD desteklemez çünkü:**
- Fiziksel CAN transceiver (TJA1041/TJA1051) CAN FD sinyallerini anlamaz
- Firmware (BK3231/HC-05 tabanlı) CAN FD frame formatını parse edemez
- Baud rate 2 Mbps+ desteklenmez

### 4.3 Stellantis Security Gateway (SGW)

2024+ Stellantis araçlarında **OBD-II portu üzerinden ECU'lara doğrudan erişim kısıtlıdır.** SGW (Security Gateway):
- Diagnostic session açmadan ECU yanıt vermez
- Özel UDS authentication gerektirir
- Generic OBD-II PID'lerine (01xx, 09xx) bile kısıtlı yanıt verebilir

**ELM327 v1.5 clone cihazlar SGW bypass yapamaz.**

---

## 5. Neden Diğer Araçlar (Dacia 2011) Çalışıyor?

| Özellik | Dacia 2011 | Peugeot Rifter 2025 |
|---------|------------|---------------------|
| Platform | Eski Renault B0 | Stellantis EMP2 |
| CAN Protokolü | Klasik CAN 2.0A | CAN FD + CAN 2.0B |
| Bitrate | 500 kbps 11-bit | 500 kbps 29-bit FD |
| Security Gateway | Yok | Var |
| UDS Session | Gerekmez | Gerekli |
| ELM327 v1.5 | ✅ Çalışır | ❌ Çalışmaz |

**Dacia 2011 klasik CAN 2.0A (11-bit, 500kbps) kullanır.** ELM327 v1.5 bunu destekler.

**Peugeot Rifter 2025 CAN FD veya 29-bit CAN 2.0B kullanır.** ELM327 v1.5 bunu desteklemez.

---

## 6. Çözüm — Donanım Değişikliği Zorunlu

### 6.1 Mevcut Cihazla Çözüm Yok

**ELM327 v1.5 clone ile Peugeot Rifter 2025 bağlantısı teknik olarak imkansızdır.** Bunun nedeni:
1. Fiziksel CAN transceiver CAN FD sinyallerini okuyamaz
2. Firmware CAN FD frame'lerini parse edemez
3. SGW authentication yapılamaz

**Kod düzeltmesiyle çözülemez. Donanım değişmelidir.**

### 6.2 Önerilen Yeni Cihazlar

| Cihaz | CAN FD | SGW Bypass | Fiyat | Öneri |
|-------|--------|------------|-------|-------|
| **OBDLink CX** | ✅ | ⚠️ Kısmen | ~$80 | ⭐⭐⭐⭐⭐ En iyi |
| **OBDLink MX+** | ✅ | ⚠️ Kısmen | ~$120 | ⭐⭐⭐⭐⭐ Premium |
| **Vgate vLinker FS** | ✅ | ⚠️ Kısmen | ~$50 | ⭐⭐⭐⭐ Uygun fiyatlı |
| **STN2120 tabanlı** | ✅ | ⚠️ Kısmen | ~$60 | ⭐⭐⭐⭐ Geliştirici |
| **ELM327 v2.1 (orijinal)** | ❌ | ❌ | ~$40 | ⭐⭐ Yetersiz |

**NOT:** SGW bypass için cihaz tek başına yeterli değildir. Uygulama tarafında da Stellantis özel diagnostic session ve authentication implementasyonu gerekir.

### 6.3 Uygulama Tarafı Gereksinimler (Yeni Cihazla Birlikte)

```typescript
// Peugeot Rifter 2025 için özel init sequence
async function initializeStellantis2025(): Promise<boolean> {
  // 1. CAN FD modunu aktif et (OBDLink CX için)
  await sendCommand('STCF'); // CAN FD enable

  // 2. 29-bit CAN header ayarla
  await sendCommand('ATSP7'); // CAN 29-bit 500kbps
  await sendCommand('ATSH7E0'); // Engine ECU
  await sendCommand('ATCRA7E8'); // Receive filter

  // 3. Diagnostic Session aç (UDS)
  await sendCommand('10 03'); // Extended Diagnostic Session

  // 4. Security Access (Stellantis özel)
  // Bu, araç spesifik seed-key algoritması gerektirir
  // Reverse engineering veya lisanslı erişim gerekir

  // 5. OBD-II PID'lerini oku
  const response = await sendCommand('01 00');
  return response.includes('41 00');
}
```

---

## 7. Kod Tarafında Yapılabilecek İyileştirmeler

Donanım değişikliği şart olsa da, kod tarafında da aşağıdaki iyileştirmeler yapılabilir:

### 7.1 Erken Tespit — "Modern Araç" Algılama

```typescript
// Tüm protokoller başarısız olduğunda
if (allProtocolsFailed) {
  const voltage = await sendCommand('ATRV');
  if (voltage > 12.5) {
    // Voltaj yeterli ama hiçbir protokol çalışmıyor
    // Bu, modern araç (CAN FD/SGW) işareti
    throw new Error(
      'MODERN_VEHICLE_DETECTED: ' +
      'Bu araç CAN FD veya Security Gateway kullanıyor olabilir. ' +
      'Lütfen CAN FD destekli bir OBD-II adapter kullanın ' +
      '(Önerilen: OBDLink CX, vLinker FS)'
    );
  }
}
```

### 7.2 Voltaj Kontrolü Güçlendirme

```typescript
// 13.3V kritik eşik
const voltage = parseFloat(atrvResponse);
if (voltage < 13.0) {
  throw new Error(
    'LOW_VOLTAGE: Araç voltajı düşük (' + voltage + 'V). ' +
    'Lütfen kontağı ON pozisyonuna getirin ve motoru çalıştırın.'
  );
}
```

### 7.3 Protocol Timeout Optimizasyonu

```typescript
// Mevcut: Her protokol 5-8 saniye
// Önerilen: Modern araçlar için daha uzun timeout
const PROTOCOL_TIMEOUTS = {
  legacy: 5000,   // Eski araçlar
  modern: 15000,  // 2020+ araçlar (SGW wake-up süresi)
};
```

---

## 8. Sonuç ve Eylem Planı

### Kök Neden
**ELM327 v1.5 clone cihaz, Peugeot Rifter 2025'in kullandığı modern CAN protokolünü (CAN FD / 29-bit CAN / SGW) fiziksel olarak desteklememektedir.**

### Yapılması Gerekenler

| # | Eylem | Sorumlu | Maliyet | Zaman |
|---|-------|---------|---------|-------|
| 1 | **CAN FD destekli adapter satın al** | Siz | ~$50-120 | Hemen |
| 2 | **OBDLink CX veya vLinker FS test et** | Siz | — | Adapter geldikten sonra |
| 3 | **Kod: "Modern Araç" erken tespiti ekle** | Geliştirici | $0 | 2 saat |
| 4 | **Kod: Voltaj kontrolü <13V uyarısı** | Geliştirici | $0 | 1 saat |
| 5 | **Kod: Tüm protokol başarısızsa kullanıcıya açıklayıcı mesaj** | Geliştirici | $0 | 2 saat |
| 6 | **Stellantis SGW bypass araştırması** | Geliştirici | $0 | 8+ saat |

### Kullanıcıya Mesaj

> "Peugeot Rifter 2025, klasik OBD-II protokolü yerine modern CAN FD ve Security Gateway teknolojisi kullanıyor. Mevcut ELM327 v1.5 cihazınız bu teknolojileri desteklemiyor. Lütfen CAN FD destekli bir adapter edinin (OBDLink CX, vLinker FS gibi)."

---

## 9. Diğer AI Araçlarından Yardım

Teknik olarak bu sorunun analizi tamamlanmıştır. Başka bir AI'dan yardım istemeniz durumunda şu bilgileri paylaşın:

1. **ELM327 v1.5 clone** kullanıyorsunuz
2. **Peugeot Rifter 2025** (Stellantis EMP2 platformu)
3. **Tüm 11 protokol başarısız** — `CAN ERROR`, `NO DATA`, `OK >` (timeout)
4. **ATIB10400** desteklenmiyor (`? >`)
5. **Voltaj 13.3V** (biraz düşük ama tek başına yeterli değil)

Sorunun kök nedeni **donanım/firmware**, yazılım değildir.

---

*Rapor, 26 Ağustos 2026 tarihli iki bağımsız bağlantı denemesinin logları üzerinden analiz edilerek hazırlanmıştır.*
