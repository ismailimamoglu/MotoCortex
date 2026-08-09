# 🐛 MotoCortex — Bağlantı Hatası Yazılımsal Kök Neden Raporu

**Tarih:** 09 Ağustos 2026  
**Severity:** 🔴 CRITICAL — Production Blocker  
**Etki:** Hiçbir araç ile OBD2 bağlantısı kurulamıyor

---

## 🎯 Kök Neden Tespit Edildi

### Özet

**`ADAPTER_STALL` kurtarma mekanizması, bağlantı akışını sabote ediyor.**

`OBD2ProtocolEngine.ts` içindeki `ResponseInterceptor`, ardışık hatalar sayesinde `stallCounter >= 3` koşuluna ulaşıyor ve `ATWS` (warm start) göndererek adaptörü resetliyor. Bu reset, `01 00` komutunun gönderilmesini engelliyor ve bağlantının kurulmasını imkansızlaştırıyor.

---

## 📊 Kanıt: Terminal Log Analizi

### Kritik Zaman Çizelgesi

```
16:02:50  [BT_WRITE] ATZ                    ← İlk reset
16:02:54  [BT_WRITE] (boş)                   ← 4 saniye gecikme!
16:02:55  [BT_WRITE] (boş)
16:02:56  [BT_WRITE] AT Z                    ← İkinci reset
16:03:00  [BT_WRITE] (boş)                   ← 4 saniye gecikme!
16:03:01  [BT_WRITE] ATI
16:03:02  [BT_WRITE] (boş)
16:03:02  [BT_WRITE] (boş)
16:03:02  [BT_WRITE] AT RV
16:03:02  [BT_WRITE] ATWS                   ← ⚠️ ADAPTER_STALL RECOVERY!
16:03:03  [BT_WRITE] AT DP
16:03:07  [BT_READ]  ISO 9141-2 >            ← İlk gerçek yanıt
16:03:07  [BT_WRITE] ATE0
16:03:11  [BT_WRITE] (boş)
16:03:11  [BT_WRITE] (boş)
16:03:11  [BT_WRITE] AT SP 0                ← Protokol tarama başlıyor
16:03:11  [BT_WRITE] ATWS                   ← ⚠️ ADAPTER_STALL RECOVERY!
16:03:14  [BT_READ]  ? >                     ← AT SP 0 zaman aşımı
16:03:14  [BT_WRITE] AT PC                   ← Protokol kapat
16:03:16  [BT_WRITE] AT SP 6                ← Fallback döngüsü
16:03:19  [BT_READ]  (boş)                   ← 3 saniye zaman aşımı
16:03:19  [BT_WRITE] ATWS + AT PC           ← ⚠️ ADAPTER_STALL + Fallback!
16:03:21  [BT_WRITE] AT SP 7
...döngü devam ediyor...
```

### Kritik Bulgu: `01 00` HİÇ Gönderilmedi!

```
❌ Beklenen:  AT SP 0 → 01 00 → 41 00 BE BF BF A8 (ECU yanıtı)
✅ Gerçek:   AT SP 0 → ATWS → ? > → AT PC → AT SP 6 → ATWS → ...
              ↑                              ↑
              01 00 gönderilmeden             Fallback döngüsü
              ATWS ile engellendi             başlıyor
```

---

## 🔍 Yazılımsal Akış Analizi

### Bağlantı Akışı (Mevcut — Hatalı)

```
BluetoothService.connect()
    │
    ├── ATZ + AT0 gönder (bağlantı.reset)
    │
    ├── 1 saniye bekle
    │
    └── initializeAndCheckEcu()
         │
         ├── ProtocolNegotiator.runBenchmark()
         │    ├── AT Z gönder  ← İKİNCİ RESET!
         │    ├── ATI gönder
         │    ├── AT RV gönder
         │    └── AT DP gönder
         │
         ├── ProtocolNegotiator.applyPostResetConfig()
         │    └── ATE0 gönder
         │
         ├── AT SP 0 gönder (auto protokol)
         │
         ├── ❌ 01 00 gönderilmeden ATWS tetikleniyor!
         │
         └── Fallback döngüsü (AT SP 6/7/8/9/5/4/3/1/2)
              └── Her denemede ATWS tetikleniyor → 01 00 engelleniyor
```

---

## 🐛 Hatanın Kaynak Kodu

### Konum 1: ADAPTER_STALL Tetikleme (Ana Sorun)

**Dosya:** `src/api/OBD2ProtocolEngine.ts`  
**Satır:** 827-838

```typescript
// ── ADAPTER_STALL tespiti & warm-start kurtarma ───────────────────
if (this.stallCounter >= 3) {                                    // ← 3 ardışık hata
    useBluetoothStore.getState().addLog(
        `[ResponseInterceptor] ADAPTER_STALL detected after 3 consecutive failures.`
    );
    this.stallCounter = 0;

    this.clear(new Error('ADAPTER_STALL'));                       // ← ⚠️ KUYRUK TEMİZLENİYOR!
                                                                   //    01 00 iptal ediliyor!

    preciseSleep(100).then(() => {
        BluetoothService.write('ATWS\\r').catch(() => {});       // ← ⚠️ ADAPTÖR RESET!
    });
}
```

**Sorun:** `this.clear()` tüm kuyruğu temizliyor → `01 00` komutu iptal ediliyor.

---

### Konum 2: stallCounter Artış Nedenleri

**Dosya:** `src/api/OBD2ProtocolEngine.ts`  
**Satır:** 785-823

```typescript
// Her yanıtta stallCounter kontrol ediliyor:
if (error) {
    this.stallCounter++;           // ← Zaman aşımı → hata → artar
} else if (trimmedResult === '?') {
    this.stallCounter++;           // ← ? yanıtı → artar
} else {
    if (isGarbage) {
        this.stallCounter++;       // ← Geçersiz yanıt → artar
    } else {
        this.stallCounter = 0;     // ← Geçerli yanıt → sıfırlanır
    }
}
```

**Sorun:** Adaptör yavaş yanıt verdiğinde (klon adaptör, zayıf Bluetooth), zaman aşımı tetikleniyor ve `stallCounter` artıyor.

---

### Konum 3: Çifte Reset Sorunu

**Dosya:** `src/hooks/useBluetooth.ts`  
**Satır:** ~388-395

```typescript
// Bağlantı sonrası ilk reset
await OBDCommandQueue.add('ATZ', 1500, 'HIGH_PRIORITY_AD_HOC');
await OBDCommandQueue.add('AT0', 500, 'HIGH_PRIORITY_AD_HOC');
```

**Satır:** ~initializeAndCheckEcu içinde

```typescript
// İkinci reset (runBenchmark içinde)
await OBDCommandQueue.add('AT Z', 1000).catch(() => {});
```

**Sorun:** Adaptör 1-2 saniye içinde iki kez reset ediliyor → adaptör kararsız duruma geçiyor.

---

## 📈 Sorun Zinciri

```
1. Bluetooth bağlantısı kuruluyor
         ↓
2. ATZ + AT0 gönderiliyor (ilk reset)
         ↓
3. 1 saniye bekleniyor
         ↓
4. AT Z gönderiliyor (ikinci reset) ← Çifte reset!
         ↓
5. Adaptör yavaş yanıt veriyor (klon adaptör / zayıf BT)
         ↓
6. Zaman aşımı → error → stallCounter++ (1)
         ↓
7. Başka komut zaman aşımı → stallCounter++ (2)
         ↓
8. Başka komut zaman aşımı → stallCounter++ (3)
         ↓
9. ADAPTER_STALL tetikleniyor!
         ↓
10. this.clear() → Kuyruk temizleniyor → 01 00 iptal!
         ↓
11. ATWS gönderiliyor → Adaptör reset
         ↓
12. Fallback döngüsü başlıyor
         ↓
13. Her denemede aynı sorun tekrarlanıyor
         ↓
14. ❌ Bağlantı kurulamıyor
```

---

## 🔧 Önerilen Düzeltmeler

### Düzeltme 1: ADAPTER_STALL Kurtarma Devre Dışı Bırak (İlk Bağlantı İçin)

**Dosya:** `src/api/OBD2ProtocolEngine.ts`  
**Satır:** 827

```typescript
// MEVCUT (HATALI):
if (this.stallCounter >= 3) {
    this.clear(new Error('ADAPTER_STALL'));
    preciseSleep(100).then(() => {
        BluetoothService.write('ATWS\\r').catch(() => {});
    });
}

// DÜZELTİLMİŞ:
// İlk bağlantı sırasında ADAPTER_STALL devre dışı
if (this.stallCounter >= 3 && !this.isInitialConnectionPhase) {
    this.clear(new Error('ADAPTER_STALL'));
    preciseSleep(100).then(() => {
        BluetoothService.write('ATWS\\r').catch(() => {});
    });
}
```

**Alternatif Düzeltme (Daha Basit):**

```typescript
// Kuyruğu temizleme yerine sadece ATWS gönder
if (this.stallCounter >= 3) {
    this.stallCounter = 0;
    // this.clear(new Error('ADAPTER_STALL'));  // ← KALDIRILDI!
    preciseSleep(100).then(() => {
        BluetoothService.write('ATWS\\r').catch(() => {});
    });
}
```

---

### Düzeltme 2: Çifte Reset Kaldır

**Dosya:** `src/hooks/useBluetooth.ts`  
**Satır:** ~388-395

```typescript
// MEVCUT (HATALI):
await OBDCommandQueue.add('ATZ', 1500, 'HIGH_PRIORITY_AD_HOC');
await OBDCommandQueue.add('AT0', 500, 'HIGH_PRIORITY_AD_HOC');

// DÜZELTİLMİŞ:
// İlk reset kaldırıldı, sadece runBenchmark içindeki reset kullanılacak
// await OBDCommandQueue.add('ATZ', 1500, 'HIGH_PRIORITY_AD_HOC');
// await OBDCommandQueue.add('AT0', 500, 'HIGH_PRIORITY_AD_HOC');
```

---

### Düzeltme 3: stallCounter Eşiğini Yükselt

**Dosya:** `src/api/OBD2ProtocolEngine.ts`  
**Satır:** 828

```typescript
// MEVCUT:
if (this.stallCounter >= 3) {

// DÜZELTİLMİŞ (İlk bağlantı için daha toleranslı):
if (this.stallCounter >= 5) {
```

---

### Düzeltme 4: 01 00 Gönderim Garantisi

**Dosya:** `src/hooks/useBluetooth.ts`  
**Satır:** ~initializeAndCheckEcu

```typescript
// MEVCUT:
await OBDCommandQueue.add("AT SP 0", 2000);
const initRes = await OBDCommandQueue.add("01 00", 6000);

// DÜZELTİLMİŞ (stallCounter sıfırla):
await OBDCommandQueue.add("AT SP 0", 2000);
OBD2ProtocolEngineInstance.stallCounter = 0;  // ← stallCounter sıfırla
const initRes = await OBDCommandQueue.add("01 00", 6000);
```

---

## 📋 Öncelik Sırası

| # | Düzeltme | Etki | Zorluk | Öncelik |
|---|----------|------|--------|---------|
| 1 | ADAPTER_STALL kuyruk temizleme kaldır | 🔴 Kritik | 🟢 Kolay | **P0** |
| 2 | Çifte reset kaldır | 🟠 Yüksek | 🟢 Kolay | **P0** |
| 3 | stallCounter eşik yükselt | 🟡 Orta | 🟢 Kolay | **P1** |
| 4 | 01 00 gönderim garantisi | 🟡 Orta | 🟢 Kolay | **P1** |

---

## 🧪 Doğulama Testi

Düzeltme sonrası beklenen log akışı:

```
[BT_WRITE] ATZ
[BT_READ]  ELM327 v2.1
[BT_WRITE] ATI
[BT_READ]  ELM327 v2.1
[BT_WRITE] AT RV
[BT_READ]  12.6V
[BT_WRITE] AT DP
[BT_READ]  ISO 15765-4 (CAN 11/500)
[BT_WRITE] ATE0
[BT_READ]  OK
[BT_WRITE] AT SP 0
[BT_READ]  OK
[BT_WRITE] 01 00              ← ✅ ARTIK GÖNDERİLİYOR!
[BT_READ]  41 00 BE BF BF A8  ← ✅ ECU YANITI!
[BT_WRITE] AT DPN
[BT_READ]  6
[BT_WRITE] AT DP
[BT_READ]  ISO 15765-4 (CAN 11/500)
```

---

## 💡 Ek Notlar

### Neden Bu Hata Şimdi Ortaya Çıktı?

1. **Klon ELM327 adaptörler** daha yavaş yanıt veriyor → zaman aşımı tetikleniyor
2. **ADAPTER_STALL mekanizması** yakın zamanda eklenmiş olabilir
3. **stallCounter eşiği (3)** çok düşük → normal gecikmeler bile tetikliyor

### Neden Test Ortamında Çalışıyor?

- Mock adaptör anında yanıt veriyor → zaman aşımı oluşmuyor
- `stallCounter` hiç 3'e ulaşmıyor
- ADAPTER_STALL tetiklenmiyor

---

*Rapor Arena.ai QA Agent tarafından terminal log analizi ve kaynak kod incelemesi ile oluşturulmuştur.*
