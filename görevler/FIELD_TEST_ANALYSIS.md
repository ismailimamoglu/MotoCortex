# 🔌 MotoCortex — Saha Testi Bağlantı Hatası Analiz Raporu

**Tarih:** 11 Ağustos 2026  
**Test Ortamı:** Gerçek araç, gerçek adaptör  
**Karşılaştırma:** Infocar uygulaması sorunsuz bağlandı  
**Log Kaynağı:** `motocortex_rolling.md`

---

## 📋 Log Zaman Çizelgesi (Tam Analiz)

```
14:36:46  [BT_WRITE] (empty)         ← İlk bağlantı
14:36:46  [BT_WRITE] AT Z            ← ProtocolNegotiator.runBenchmark() — ADAPTÖR RESET
14:36:50  [BT_WRITE] (empty)         ← ⚠️ 3.5 SANİYE ZAMAN AŞIMI — AT Z yanıtı gelmedi!
14:36:51  [BT_WRITE] ATI             ← runBenchmark() devam ediyor
14:36:52  [BT_WRITE] (empty)         ← 1s timeout
14:36:52  [BT_WRITE] AT RV           ← runBenchmark() devam
14:36:53  [BT_WRITE] (empty)         ← timeout
14:36:53  [BT_WRITE] (empty)
14:36:53  [BT_WRITE] AT DP           ← runBenchmark() devam
14:36:53  [BT_WRITE] ATWS            ← ⚠️ ADAPTER_STALL RECOVERY TETİKLENDİ!
14:36:57  [BT_WRITE] (empty)         ← ⚠️ 3.5 SANİYE ZAMAN AŞIMI
14:36:57  [BT_WRITE] ATE0            ← applyPostResetConfig()
14:37:00  [BT_WRITE] (empty)         ← 3s timeout
14:37:01  [BT_READ_CHUNK]            ← boş
14:37:01  [BT_READ_CHUNK] ? >        ← ⚠️ ATE0 yanıtı: "?" (adaptör anlamadı!)
14:37:01  [BT_WRITE] AT SP 0         ← initializeAndCheckEcu() başlıyor
14:37:04  [BT_WRITE] (empty)         ← ⚠️ 3.5 SANİYE ZAMAN AŞIMI
14:37:04  [BT_WRITE] (empty)
14:37:04  [BT_WRITE] AT PC           ← Fallback döngüsü başlıyor
14:37:05  [BT_WRITE] ATWS            ← ⚠️ ADAPTER_STALL RECOVERY TEKRAR TETİKLENDİ!
14:37:05  [BT_WRITE] (empty)
14:37:06  [BT_WRITE] AT SP 6         ← Fallback: CAN 11-bit/500k
14:37:09  [BT_READ_CHUNK] OK >       ← ✅ AT SP 6 KABUL EDİLDİ! (3 saniye sonra)
14:37:09  [BT_WRITE] AT PC           ← ❌ SONRAKİ İTERASYON! 01 00 GÖNDERİLMEDİ!
14:37:10  [BT_WRITE] (empty)
14:37:24  [ADMIN_TERMINAL] Log export
```

---

## 🔴 ANA SORUN: `01 00` HİÇ GÖNDERİLMEDİ

### Kanıt

```
14:37:06  [BT_WRITE] AT SP 6         ← Protokol ayarlandı
14:37:09  [BT_READ_CHUNK] OK >       ← Adaptör kabul etti!
14:37:09  [BT_WRITE] AT PC           ← ❌ 01 00 yerine AT PC gönderildi!
```

`AT SP 6` `OK >` yanıtı aldıktan sonra, beklenen akış:
```
AT SP 6 → OK > → AT SH 7E0 → 01 00 → 41 00 BE BF BF A8 (ECU yanıtı)
```

Gerçekleşen akış:
```
AT SP 6 → OK > → AT PC (sonraki iterasyon!) → bağlantı başarısız
```

---

## 🔍 Kök Neden Analizi

### Sorun 1: `AT SP 6` Zaman Aşımı Çok Kısa

**Dosya:** `src/hooks/useBluetooth.ts` satır ~238

```typescript
await OBDCommandQueue.add(item.sp, 1500);  // ← 1500ms timeout!
```

**Log kanıtı:**
```
14:37:06  AT SP 6 gönderildi
14:37:09  OK > alındı (3 saniye sonra!)
```

**Hesaplama:**
- `AT SP 6` gönderildi: 14:37:06.000
- Timeout tetiklendi: 14:37:07.500 (1500ms sonra)
- `OK >` alındı: 14:37:09.000 (3 saniye sonra)
- **Timeout, yanıttan 1.5 saniye önce tetiklendi!**

**Sonuç:** `AT SP 6` zaman aşımına uğradı → hata fırlattı → döngü sonraki iterasyona geçti → `AT SH 7E0` ve `01 00` hiç gönderilmedi.

---

### Sorun 2: ADAPTER_STALL Recovery Hâlâ Tetikleniyor

**Log kanıtı:**
```
14:36:53  ATWS    ← 1. ADAPTER_STALL recovery
14:37:05  ATWS    ← 2. ADAPTER_STALL recovery
```

**Dosya:** `src/api/OBD2ProtocolEngine.ts` satır 813-818

```typescript
if (this.stallCounter >= 3) {
    this.stallCounter = 0;
    this.clear(new Error('ADAPTER_STALL'));  // ← Kuyruk temizleniyor!
    preciseSleep(100).then(() => {
        BluetoothService.write('ATWS\\r').catch(() => {});
    });
}
```

**Sorun:** `this.clear()` kuyruğu temizliyor → bekleyen komutlar iptal ediliyor.

---

### Sorun 3: Adaptör Yanıt Süresi Çok Yavaş

**Tüm komutlar için 3+ saniye zaman aşımı:**

| Komut | Gönderildi | Yanıt | Süre |
|-------|-----------|-------|------|
| AT Z | 14:36:46 | ❌ Yok | 3.5s timeout |
| ATI | 14:36:51 | ❌ Yok | 1s timeout |
| AT RV | 14:36:52 | ❌ Yok | 1s timeout |
| AT DP | 14:36:53 | ❌ Yok | timeout |
| ATE0 | 14:36:57 | ? > | 3s |
| AT SP 0 | 14:37:01 | ❌ Yok | 3.5s timeout |
| AT SP 6 | 14:37:06 | OK > | 3s |

**Sadece 2 yanıt alındı:** `? >` (ATE0) ve `OK >` (AT SP 6)

---

### Sorun 4: ProtocolNegotiator.runBenchmark() Gereksiz Komutlar

**Dosya:** `src/core/connection/ProtocolNegotiator.ts`

```typescript
public static async runBenchmark(): Promise<number> {
    await OBDCommandQueue.add('AT Z', 1000).catch(() => {});   // ← 1s timeout
    await OBDCommandQueue.add('ATI', 1000).catch(() => '');    // ← 1s timeout
    await OBDCommandQueue.add('AT RV', 800).catch(() => '');   // ← 800ms timeout
    await OBDCommandQueue.add('AT DP', 800).catch(() => '');   // ← 800ms timeout
}
```

**Sorun:** Bu komutların hiçbiri yanıt almıyor (3+ saniye sürüyor ama timeout 800ms-1s). Adaptör henüz hazır değilken gönderiliyorlar.

---

## 🆚 Infocar vs MotoCortex Karşılaştırma

### Infocar Neden Bağlanıyor?

| Faktör | Infocar (Tahmini) | MotoCortex |
|--------|-------------------|------------|
| İlk komut | `ATZ` → `ATE0` → `01 00` | `AT Z` → `ATI` → `AT RV` → `AT DP` → `ATE0` → `AT SP 0` → `01 00` |
| Komut sayısı | ~3-4 | ~10+ |
| Adaptör reset sayısı | 1 | 2+ (AT Z + ATWS) |
| Timeout süresi | ~5s+ | 800ms-1500ms |
| AT SP timeout | ~5s | 1500ms |
| `01 00` gönderimi | Hemen | Hiç (timeout engeli) |

### Kritik Fark

**Infocar:** `ATZ` → `ATE0` → `AT SP 6` → `01 00` (4 komut, basit akış)

**MotoCortex:** `AT Z` → `ATI` → `AT RV` → `AT DP` → `ATWS` → `ATE0` → `AT SP 0` → `AT PC` → `ATWS` → `AT SP 6` → ... (10+ komut, karmaşık akış)

---

## 📊 Sorun Zinciri

```
1. Bluetooth bağlantısı kuruluyor
         ↓
2. ProtocolNegotiator.runBenchmark() başlıyor
         ↓
3. AT Z gönderiliyor (1s timeout) → 3.5s sürüyor → TIMEOUT
         ↓
4. ATI gönderiliyor (1s timeout) → TIMEOUT
         ↓
5. AT RV gönderiliyor (800ms timeout) → TIMEOUT
         ↓
6. AT DP gönderiliyor (800ms timeout) → TIMEOUT
         ↓
7. stallCounter >= 3 → ADAPTER_STALL tetikleniyor!
         ↓
8. ATWS gönderiliyor → Adaptör reset
         ↓
9. ATE0 gönderiliyor (1s timeout) → "?" yanıtı (adaptör henüz hazır değil)
         ↓
10. AT SP 0 gönderiliyor (2s timeout) → TIMEOUT
         ↓
11. Fallback döngüsü başlıyor
         ↓
12. AT PC gönderiliyor
         ↓
13. stallCounter >= 3 → ADAPTER_STALL tekrar tetikleniyor!
         ↓
14. ATWS gönderiliyor → Adaptör tekrar reset
         ↓
15. AT SP 6 gönderiliyor (1500ms timeout) → 3s sürüyor → TIMEOUT!
         ↓
16. OK > geliyor ama çok geç (timeout zaten tetiklendi)
         ↓
17. Sonraki iterasyon → AT PC gönderiliyor
         ↓
18. 01 00 HİÇ GÖNDERİLMİYOR → BAĞLANTI BAŞARISIZ
```

---

## 🔧 Gerekli Düzeltmeler (Kod Değişikliği Yapılmadı)

### Düzeltme 1: `AT SP` Timeout Süresini Artır (EN KRİTİK)

**Dosya:** `src/hooks/useBluetooth.ts` satır ~238

```typescript
// MEVCUT (HATALI):
await OBDCommandQueue.add(item.sp, 1500);  // 1500ms

// ÖNERİLEN:
await OBDCommandQueue.add(item.sp, 5000);  // 5000ms — adaptörlere zaman tanı
```

**Gerekçe:** Adaptör3 saniyede yanıt veriyor ama timeout 1500ms.

---

### Düzeltme 2: `ProtocolNegotiator.runBenchmark()` Timeoutlarını Artır

**Dosya:** `src/core/connection/ProtocolNegotiator.ts`

```typescript
// MEVCUT:
await OBDCommandQueue.add('AT Z', 1000);    // 1s
await OBDCommandQueue.add('ATI', 1000);     // 1s
await OBDCommandQueue.add('AT RV', 800);    // 800ms
await OBDCommandQueue.add('AT DP', 800);    // 800ms

// ÖNERİLEN:
await OBDCommandQueue.add('AT Z', 3000);    // 3s — adaptör reset zamanı
await OBDCommandQueue.add('ATI', 3000);     // 3s
await OBDCommandQueue.add('AT RV', 3000);   // 3s
await OBDCommandQueue.add('AT DP', 3000);   // 3s
```

---

### Düzeltme 3: ADAPTER_STALL `this.clear()` Kaldır

**Dosya:** `src/api/OBD2ProtocolEngine.ts` satır 818

```typescript
// MEVCUT (HATALI):
this.clear(new Error('ADAPTER_STALL'));  // ← Kuyruk temizleniyor!

// ÖNERİLEN:
// this.clear(...) kaldırıldı — sadece ATWS gönder
```

---

### Düzeltme 4: Benchmark Komutlarını Azalt veya Kaldır

**Dosya:** `src/core/connection/ProtocolNegotiator.ts`

```typescript
// MEVCUT: 4 komut (AT Z, ATI, AT RV, AT DP)
// ÖNERİLEN: Sadece AT Z ve ATE0 (diğerleri bağlantı sonrası yapılabilir)
```

---

### Düzeltme 5: `ATE0` Yanıtını Kontrol Et

**Log kanıtı:** `ATE0` yanıtı `? >` (adaptör anlamadı)

**Gerekçe:** Adaptör henüz hazır değilken `ATE0` gönderiliyor. `AT Z` sonrası adaptör reset süresi beklenmeli.

---

## 📋 Öncelik Sırası

| # | Düzeltme | Etki | Zorluk | Öncelik |
|---|----------|------|--------|---------|
| 1 | `AT SP` timeout 1500ms → 5000ms | 🔴 Kritik | 🟢 1 satır | **P0** |
| 2 | Benchmark timeoutlarını artır | 🔴 Kritik | 🟢 4 satır | **P0** |
| 3 | `this.clear()` kaldır | 🟠 Yüksek | 🟢 1 satır | **P0** |
| 4 | Benchmark komutlarını azalt | 🟡 Orta | 🟠 Orta | **P1** |
| 5 | ATE0 sonrası bekleme süresi | 🟡 Orta | 🟢 Kolay | **P1** |

---

## 💡 Neden Infocar Bağlanıyor?

Infocar muhtemelen:

1. **Daha uzun timeout kullanıyor** (5-10 saniye)
2. **Daha az komut gönderiyor** (ATZ → ATE0 → AT SP → 01 00)
3. **Adaptörü birden fazla kez resetlemiyor**
4. **`AT SP` komutunu gönderdikten sonra hemen `01 00` gönderiyor** (yanıtı beklemeden)
5. **ADAPTER_STALL recovery yok** — kuyruğu temizlemiyor

---

## ✅ Sonuç

**Kök Neden:** `AT SP 6` komutunun 1500ms zaman aşımı, adaptörün 3 saniyelık yanıt süresinden kısa. Bu, `01 00` komutunun hiç gönderilmesini engelliyor.

**İspat:** Loglarda `AT SP 6` → `OK >` (3 saniye sonra) → `AT PC` (sonraki iterasyon) görülüyor. `01 00` hiç yok.

**Çözüm:** Timeout sürelerini artırmak ve ADAPTER_STALL recovery'nin kuyruğu temizlemesini engellemek.

---

*Rapor Arena.ai QA Agent tarafından terminal log analizi ile oluşturulmuştur. Kod değişikliği yapılmamıştır.*
