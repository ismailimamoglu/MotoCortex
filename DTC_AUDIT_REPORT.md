# 🔍 **MotoCortex DTC Kütüphanesi & Parser Kapsamlı Denetim Raporu**

**Tarih:** 01 Eylül 2026  
**Denetçi:** Automotive Diagnostic Protocol & DTC Expert  
**Proje:** MotoCortex v7 PRO  
**Standartlar:** SAE J2012, ISO 15031-6, UDS (ISO 14229-1)

---

## **Genel Özet**

MotoCortex'in DTC (Arıza Teşhis Kodu) sistemi **ISO-TP multi-frame reassembly**, **chunked memory management** ve **26 dil yerelleştirme** içeren ileri bir mimariye sahiptir. Ancak **kritik zayıflıklar** ve **kapsama açıkları** tespit edilmiştir.

---

## **1️⃣ DTC Kapsamı ve Kod Çeşitliliği Analizi**

### ✅ **Mevcut Kod Grupları:**

| Kategori | Durum | Dosya | Not |
|----------|-------|-------|-----|
| **P0xxx** (Powertrain Standard) | ✅ Kapsamlı | P00.json | ~100 kod (P0000-P0099) |
| **P1xxx-P19xx** (OEM Powertrain) | ✅ Vardır | P01-P19.json | 19 chunk dosyası |
| **B0xxx-B1xxx** (Body) | ✅ Vardır | B.json | 200+ kod |
| **C0xxx-C1xxx** (Chassis/ABS) | ✅ Vardır | C.json | 300+ kod |
| **U0xxx-U1xxx** (Network/CAN) | ✅ Vardır | U.json | 300+ kod |
| **P20-P21 / P0A (OBD2 Ek)** | ✅ Vardır | P20, P21, P0A.json | Hybrid/EV kodları |

### ⚠️ **TEŞHİS EDILEN AÇIKLAR:**

#### **1. P2xxx, P3xxx (Üreticiye Özel Extended Powertrain) Eksik:**

```typescript
// ❌ dtcStorage.ts CHUNK_MAP'te eksik:
'P2': () => require('./chunks/P2.json'),   // ← YOKSUN
'P3': () => require('./chunks/P3.json'),   // ← YOKSUN
```

**Risk:** VAG (Volkswagen), BMW, Mercedes gibi üreticiler **P2xxx** (Powertrain Secondary/Hybrid) kodlarını yaygın kullanırlar:
- P2002: Diesel Particulate Filter Efficiency
- P2196: O2 Sensor Signal Biased Bank 1
- P2700-P2900: Hybrid/DCT transmission codes

**Etki:** Söz konusu araçlarda tanı eksik veya yanlış olabilir.

#### **2. Dinamik OEM-Specific Kodlar Sınırlı:**

```typescript
// dtcIntelligenceService.ts - OEM_DTC_DATABASE
// Sadece 5 OEM üreticisi tanımlanmış (VAG, BMW, MERCEDES, TOYOTA, FORD)
// Eksikler: Hyundai-Kia, Stellantis (PSA), Geely-Volvo, Chinese EVs
```

#### **3. Sürücü-Spesifik Kodlar (P0A, Hybrid) Yetersiz:**
- `P0A00`: Hybrid Battery Pack Low SOH ← Sadece 1 kod
- **EV-specific:** BMW i3, Tesla, Hyundai Ioniq codes yetersiz

---

## **2️⃣ DtcStreamParser Hex Ayrıştırma Doğruluk Analizi**

### ✅ **Güçlü Yönler:**

```typescript
// ✓ ISO-TP Multi-Frame Reassembly DOĞRU (satır 128-171)
// Örnek: 43 01 01 03 00 00 → P0101, P0103 (2 kod)
if ((b & 0xF0) === 0x10 && i + 2 < n) {  // First Frame (0x10)
  const totalLen = ((b & 0x0F) << 8) + bytes[i + 1];  // ✓ Doğru uzunluk hesabı
  const service = bytes[i + 2];
  
  // ✓ Service validation
  if (DTC_SERVICES.has(service)) {
    const ffPayloadBytes = bytes.slice(i + 3, Math.min(i + 8, n));  // ✓ Doğru range
```

**Sequence validation logic** (satır 182-195):
```typescript
if (sequenceNum !== context.expectedSequence) {
  console.warn(`[DtcStreamParser] Sequence mismatch...`);
  // ✓ Wrapping: (15 % 16) + 1 = 1 (doğru)
  context.expectedSequence = (context.expectedSequence % 16) + 1;
}
```

### ⚠️ **TESPİT EDILEN RİSKLER:**

#### **Risk 1: Byte Offset Hatası Single Frame'de (Satır 108-122)**

```typescript
// ❌ POTANSİYEL HATA:
if ((b & 0xF0) === 0x00 && (b & 0x0F) > 0 && (b & 0x0F) <= 7 && i + 1 < n) {
  const sfLen = b & 0x0F;
  const service = bytes[i + 1];
  const framePayload = bytes.slice(i + 2, i + 1 + sfLen);  // ← BİRLEŞTİRME SORUNU?
```

**Analiz:** `slice(i + 2, i + 1 + sfLen)` → `i + 2` to `i + 1 + sfLen`
- Eğer `sfLen = 5` (Single Frame'de 5 byte), payload = `slice(i+2, i+6)` = 4 byte
- **HATA:** Beklenen = 5 byte, alınan = 4 byte (**1 byte kaybı**)

**Doğru kod:**
```typescript
const framePayload = bytes.slice(i + 2, i + 2 + sfLen - 1);  // −1: servis byte zaten sayıldı
```

#### **Risk 2: ISO-TP Consecutive Frame Payload Hesabı (Satır 193)**

```typescript
// ❌ linedata mode (satır 349):
const cfPayload = bytes.slice(i + 1, Math.min(i + 8, n));
// i + 8 → 7 byte payload (doğru)

// ✓ global reassembly (satır 193):
const cfPayloadBytes = bytes.slice(i + 1, Math.min(i + 8, n));
// Tutarlı (ama max 7 byte limiti CAN'ın 8 byte frame'ine sığdırıyor)
```

#### **Risk 3: Mode 03/07/0A Payload Parse Mantığı (Satır 456-458)**

```typescript
// OBD-II standart payload format:
// Mode 03 response: 43 <DTC_count> <DTC_byte1> <DTC_byte2> <DTC_byte1> ...
if (payload.length % 2 !== 0) {
  payload = payload.slice(1);  // ← COUNT BYTE SKIP
}

for (let i = 0; i + 1 < payload.length; i += 2) {
  const dtc = decodeDtcPair(payload[i], payload[i + 1]);
}
```

**Problem:** Eğer response `43 02 01 01 02 01` ise (2 DTC):
- Payload: `[0x02, 0x01, 0x01, 0x02, 0x01]` (5 byte, ODD)
- Skip count: `[0x01, 0x01, 0x02, 0x01]` (4 byte)
- DTCs: P0101, P0201 ✓ **DOĞRU**

**AMA:** Eğer multi-frame'de sadece partial payload gelirse:
- `[0x02, 0x01, 0x01]` (3 byte, ODD)
- Skip → `[0x01, 0x01]` (2 byte)
- Loop: `i + 1 = 1` → **LAST BYTE YUTULUR** ⚠️

#### **Risk 4: UDS Mode 0x59 (ReadDTCInformation) Parse (Satır 445-451)**

```typescript
if (svc.service === 0x59 && payload.length >= 2) {
  payload = payload.slice(2);  // ← Subfunction + Status byte skip
  for (let i = 0; i + 2 < payload.length; i += 3) {  // ← 3 byte per DTC!
    const dtc = decodeDtcPair(payload[i], payload[i + 1]);
  }
}
```

**Problem:** UDS 0x59 response format:
- `59 <subfunc> <statusAvail> <DTC_hi> <DTC_lo> <status> <DTC_hi> <DTC_lo> <status> ...`
- **3 byte per DTC** (DTC + status byte)
- Ancak `decodeDtcPair()` sadece 2 byte alıyor → **Status byte yutulur**
- 3. Byte'da bir sonraki DTC'nin high byte'ı olabilir → **CORRUPTION**

---

## **3️⃣ DTC Açıklamalarının Güncelliği & SAE J2012/ISO 15031-6 Uygunluğu**

### ✅ **İyi Yönler:**

Açıklamalar **kısa, öz ve teknikken aynı zamanda anlaşılır:**

```json
// P00.json - İyi örnek:
"P0101": "Intake Camshaft Position Timing - Over-Advanced (Bank 1)",
"P0171": "Sistem Çok Fakir - Oksijen sensörü veya manifoldu kontrol edin"
```

### ⚠️ **SORULAR TESPIT EDILEN:**

#### **1. SAE J2012 Standart Sapması:**

SAE J2012 format: `<SYS><SUB><SPEC>` (5 haneli)
- Örnek: **P0101** = **P** (Powertrain) + **01** (Fuel/Air) + **01** (A Sensor Circuit Range/Performance)

Kütüphükteki açıklama:
```json
"P0101": "Intake Camshaft Position Timing - Over-Advanced (Bank 1)"  
// ❌ HATA! Bu P0011'in açıklaması!
```

**Doğru:** P0101 = "Mass Air Flow (MAF) Sensor Range/Performance"

#### **2. OEM-Specific Kodlar Yetersiz Açıklama:**

```typescript
// dtcIntelligenceService.ts line 26:
'P17BF': 'DSG Hydraulic Pressure Loss - Mechatronic Accumulator Leak',
// ✓ Spesifik (VAG/DSG için iyi), ancak diğer OEM'lerin P2xxx kodları eksik
```

#### **3. Türkçe Açıklamalar İstatistik:**

- `SemanticDtcDictionary.ts`: Sadece **24 kod** Türkçe
- Toplam kütüphane: **3000+ kod**
- **Kapsama: 0.8%** ⚠️

**Türkçe Dizili Eksik Kodlar Örnek:**
```
P0421: "Catalyst System Efficiency Below Threshold" (İng)
      → "Katalizör Sistem Verimliliği Eşiğinin Altında" (Tr eksik)
```

---

## **4️⃣ Dinamik Yükleme (Chunking) & Bellek Performansı**

### ✅ **Mimarı Güçlü:**

```typescript
// ✓ Lazy loading - On-demand chunk yükleme
export function prefetchDtcChunksForCodes(codes: string[]): void {
  const prefixes = codes.map(code => getPrefix(code)).filter(Boolean);
  const uniquePrefixes = Array.from(new Set(prefixes));  // ✓ Deduplication
  prefetchDtcChunks(uniquePrefixes);
}

// ✓ Memory cache hierarchy:
// 1. dynamicCache (OEM-specific)
// 2. memoryCache (bundled chunks)
// 3. Return null (graceful)
```

### ⚠️ **TESPİT EDILEN SORUNLAR:**

#### **Problem 1: Global Reassembly Context Memory Leak (Satır 57)**

```typescript
const globalReassemblyContexts = new Map<SourceId, IsoTpReassemblyContext>();

// ❌ Context asla temizlenmiyor (edge case'de):
// Scenario: Multi-frame ISO-TP başlar, frame bozulur, incomplete kalır
if (context && context.collectedBytes.length > 1) {
  // Flushed
  globalReassemblyContexts.delete(source);
}
// AMA: Bozuk frame'de .delete() çağrılmayabilir
```

**Sonuç:** Binlerce incomplete context → Memory leak (GB ölçeğinde)

**Fix:**
```typescript
// TTL (Time-to-Live) mekanizması eklenmelidir:
export function cleanStaleReassemblyContexts(ttlMs = 5000): void {
  const now = Date.now();
  for (const [source, ctx] of globalReassemblyContexts) {
    if (now - ctx.timestamp > ttlMs) {
      globalReassemblyContexts.delete(source);
    }
  }
}
```

#### **Problem 2: Pending Cache Deadlock Riski (dtcStorage.ts satır 127-141)**

```typescript
if (isSystemBusy) {
  pendingCache = newCache;
  pendingMake = make;
  // ❌ Eğer system asla "idle" olmayan state'e dönmezse
  // pendingCache ASLA applyPendingDtcCache() ile apply edilmez!
}
```

**Senaryo:** Bluetooth polling sonsuz çalışırsa → OEM codes asla yüklenmez

#### **Problem 3: Chunk JSON Boyutu ve Parse Performansı**

Locale dosyaları ~180-250KB (ar.json: 207KB)
- React Native'de 26 dil × 207KB = **5.4 MB JSON parse overhead**
- **İlk açılış:** 2-3 saniye delay mümkün

---

## **5️⃣ 26 Dil Yerelleştirme & Fallback Güvenliği**

### ✅ **Dil Desteği Kapsamlı:**

26 dil locale dosyası mevcut:
```
ar, cs, da, de, el, en, es, fi, fr, hi, hu, id, it, ja, ko, nl, no, pl, pt, ro, ru, sv, th, tr, uk, zh
```

### ⚠️ **FALLBACK SORUNLARI:**

#### **Problem 1: DTC Açıklaması Fallback Eksik (dtcStorage.ts)**

```typescript
export function lookupDtcSync(code: string): string | null {
  const normalized = code.toUpperCase().trim();
  
  // Dynamic cache kontrol
  if (dynamicCache[normalized]) {
    return dynamicCache[normalized];
  }
  
  const prefix = getPrefix(normalized);
  const chunk = getOrLoadChunkSync(prefix);
  if (chunk && chunk[normalized]) {
    return chunk[normalized];  // ✓ Burada İngilizce döner
  }
  
  return null;  // ❌ FALLBACK YOK! Null döner
}
```

**Sonuç:** Kullanıcı Türkçe seçmiş, kod sözlükte yok → **Hiçbir açıklama yok** (Boş alan)

**Beklenen:**
```
P0400 → "EGR System Flow..." (fallback English)
// veya
P0400 → "EGR Sistemi Akışı..." (Turkish translation + fallback)
```

#### **Problem 2: i18n Fallback Chain Eksik**

```typescript
// InspectionReportView.tsx - satır 44:
<Text style={[styles.title, { color: colors.cyan }]}>
  {t('inspection.reportTitle')}  // ← Key yoksa?
</Text>
```

**Fallback:** react-i18next varsayılan olarak **key name döndürür** (inspection.reportTitle)
- Kullanıcıya garip görünür: "inspection.reportTitle" yerine "Inspection Report"

#### **Problem 3: DTC Dictionary Localization Stratejisi Zayıf**

```typescript
// Senaryo: Kullanıcı Portekizce → P0171 lookup
// Dosya: src/locales/pt.json
// ÖZELLİKLE: Yalnızca UI strings var, DTC descriptions yok!
{
  "tabs": { "dashboard": "PAINEL" },
  "hub": { "diagnostics": "Diagnósticos" },
  // ← DTC açıklamaları PT'ye ÇEVIRILI DEĞİL
}

// Sonuç: lookupDtcSync("P0171") → İngilizce döner
// ❌ Locale engine bu ISO-639-1 sırası uygulamıyor
```

**Çözüm eksik:** Locale JSON'lara `dtcDescriptions` section'u eklenmeli:
```json
{
  "dtcDescriptions": {
    "P0171": "Sistema muy pobre - Sensor de oxígeno o variador...",
    "P0172": "Sistema muy rico..."
  }
}
```

---

## **📋 ÖZETLEME & RİSK DEĞERLENDİRMESİ**

### **Tespit Edilen Kritik Sorunlar (Priority Level)**

| # | Sorun | Severity | Etki | Çözüm |
|----|-------|----------|------|-------|
| 1 | P2xxx/P3xxx Kodları Eksik | 🔴 KRITIK | VAG/BMW/Mercedes tanı eksik | CHUNK dosyaları ekle |
| 2 | Single Frame Parse Byte Offset | 🔴 KRITIK | 1 byte kayıp → DTC yutulması | `slice(i+2, i+2+sfLen-1)` düzelt |
| 3 | UDS 0x59 Status Byte Corruption | 🔴 KRITIK | Multi-DTC parse çöküş | Mode 0x59'u ayrı parse et |
| 4 | Global Reassembly Memory Leak | 🟡 YÜKSEK | RAM overflow (multi-frame) | TTL mekanizması ekle |
| 5 | Pending Cache Deadlock | 🟡 YÜKSEK | OEM codes asla yüklenmiyor | System state monitoring |
| 6 | DTC Fallback Null | 🟡 YÜKSEK | Boş açıklama (poor UX) | Default English fallback |
| 7 | Türkçe Kapsamı 0.8% | 🟡 ORTA | Çoğu DTC İngilizce görülür | Locale JSON'lara DTC ekleme |
| 8 | Chunk Parse Performansı | 🟠 DÜŞÜK | İlk açılış 2-3 sn | Code splitting / Preload strategy |

---

## **🎯 GELIŞTIRME ÖNERİLERİ**

### **Immediate Fixes (1-2 hafta):**

```typescript
// 1. P2xxx, P3xxx JSON chunk'ları oluştur ve CHUNK_MAP'e ekle
// 2. Single Frame payload hesabını düzelt (line 112)
// 3. lookupDtcSync() null return yerine fallback dön
// 4. TTL-based context cleanup implement et

// Örnek:
export function lookupDtcSync(code: string, fallbackLang = 'en'): string {
  const result = existingLogic();
  if (!result && fallbackLang !== 'en') {
    return lookupDtcSync(code, 'en');  // Recursive fallback
  }
  return result || `${code}: Unknown Fault Code`;  // ✓ Non-null guarantee
}
```

### **Medium-term (1-2 ay):**
- UDS 0x59 işleme ayrı `decodeDtcUDS()` fonksiyonu yaz
- 26 locale JSON'lara `dtcDescriptions` section ekle
- Chunk lazy-loading + code-splitting optimize et
- i18n fallback chain konfigürasyonu standardize et

### **Strategic (Roadmap):**
- Hybrid/EV-specific DTC kategorisi (P0A00-P0AFF)
- OEM manufacturer database (VAG, BMW, TOYOTA, etc.) expand
- TSB (Technical Service Bulletin) linkage
- Live OTA update mechanism DTC chunks için

---

## **📊 DTC Doğruluk & Kapsayıcılık Puanı**

```
┌─────────────────────────────────────────┐
│  DTC ACCURACY & COVERAGE SCORECARD      │
├─────────────────────────────────────────┤
│ 1. Standard Codes Completeness:    72/100
│    (P0xxx-P09xx: Good, P2-P3: Missing)
│
│ 2. Hex Parser Correctness:         65/100
│    (Multi-frame OK, Single-frame bug, UDS broken)
│
│ 3. Description Accuracy (J2012):   70/100
│    (SAE compliant mostly, but sampling errors)
│
│ 4. Localization Coverage:          35/100
│    (26 dil desteği var, ama UI-only; DTC çevirileri eksik)
│
│ 5. Memory & Performance:           68/100
│    (Chunking good, but memory leak risk + pending deadlock)
│
├─────────────────────────────────────────┤
│        ⭐ OVERALL SCORE: 62/100        │
│                                         │
│  VERDICT: Production-ready with patches │
│  Risk Level: MEDIUM (critical parser    │
│  bugs + missing code coverage)          │
└─────────────────────────────────────────┘
```

---

## **📌 ÖNEMLİ NOTLAR**

### **Son Söz:**

MotoCortex'in DTC mimarı **ölçeklenebilir ve modüler**, ancak **parser implementasyon ve kapsama** acil düzeltme gerektiriyor. Özellikle **byte offset hataları** ve **UDS parse mantığı** live diagnostic sırasında çöküş riskine taşıyor.

### **İmmediate Action Items:**

1. **Parser Bugs (Week 1):**
   - [ ] Single Frame offset düzeltmesi test et (P0101-P0199 codes)
   - [ ] UDS 0x59 mode für BMW/VAG test senaryoları kur
   - [ ] Multi-frame reassembly context cleanup implement et

2. **Coverage (Week 2-3):**
   - [ ] P2xxx, P3xxx JSON files oluştur (~500 kod)
   - [ ] Hyundai-Kia, PSA OEM database'i ekle
   - [ ] EV-specific codes (P0A00-P0AFF) genişlet

3. **Localization (Week 4):**
   - [ ] 26 locale'ye `dtcDescriptions` section ekle
   - [ ] i18n fallback chain entegre et
   - [ ] Türkçe DTC coverage'ı %80+ artır

---

**Denetim Tarihi:** 01 Eylül 2026  
**Sonraki Review:** 01 Ekim 2026 (Fixes sonrası)
