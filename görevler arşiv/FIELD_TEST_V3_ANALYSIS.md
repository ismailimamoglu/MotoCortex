# 🔌 MotoCortex — Son Saha Testi Bağlantı Hatası Analizi

**Tarih:** 11 Ağustos 2026, 20:52-20:54  
**Test Sonucu:** ❌ Bağlantı başarısız (2 deneme)  
**Log Kaynağı:** `motocortex_rolling.md`

---

## 📋 Log Zaman Çizelgesi (1. Deneme — Tam Analiz)

```
20:52:16  [BT_WRITE] (empty)         ← İlk bağlantı
20:52:17  [BT_WRITE] AT Z            ← Reset
20:52:20  [BT_WRITE] (empty)         ← 3s timeout
20:52:20  [BT_READ]  (empty)
20:52:20  [BT_READ]  ? >             ← AT Z: "?" (adaptör henüz hazır değil)
20:52:21  [BT_WRITE] ATI
20:52:24  [BT_WRITE] (empty)         ← 3s timeout
20:52:24  [BT_WRITE] AT RV
20:52:26  [BT_READ]  ELM327 v1.5 >   ← ATI yanıtı geldi! (AT RV ile birlikte)
20:52:26  [BT_WRITE] AT DP
20:52:30  [BT_READ]  ISO 15765-4 (CAN 11/500) >  ← AT DP yanıtı!
20:52:30  [BT_WRITE] ATE0
20:52:33  [BT_WRITE] (empty)         ← 3.5s timeout
20:52:34  [BT_WRITE] AT SP 0         ← initializeAndCheckEcu()
20:52:37  [BT_WRITE] (empty)         ← 3.5s timeout
20:52:38  [BT_WRITE] (empty)
20:52:38  [BT_WRITE] AT PC           ← Fallback döngüsü başlıyor
20:52:38  [BT_WRITE] (empty)
20:52:39  [BT_WRITE] AT SP 6         ← 1. protokol denemesi
20:52:44  [BT_WRITE] (empty)         ← 5s timeout!
20:52:44  [BT_READ]  OK >            ← AT SP 6 yanıtı! (5.4s sonra)
20:52:44  [BT_WRITE] AT PC           ← ❌ SONRAKİ İTERASYON! 01 00 YOK!
20:52:45  [BT_WRITE] AT SP 7
20:52:50  [BT_READ]  OK >            ← AT SP 7: 5.1s
20:52:51  [BT_WRITE] AT PC           ← ❌ Yine 01 00 yok!
20:52:52  [BT_WRITE] AT SP 8
20:52:57  [BT_READ]  OK >            ← AT SP 8: 5.1s
20:52:57  [BT_WRITE] AT PC           ← ❌
20:52:58  [BT_WRITE] AT SP 9
20:53:03  [BT_READ]  OK >            ← AT SP 9: 5.1s
20:53:04  [BT_WRITE] AT PC           ← ❌
20:53:05  [BT_WRITE] AT SP A         ← J1939 (10s timeout)
20:53:15  [BT_WRITE] (empty)         ← 10s timeout, yanıt yok
20:53:15  [BT_WRITE] AT PC
20:53:16  [BT_WRITE] AT SP 5         ← KWP Fast
20:53:22  [BT_WRITE] (empty)         ← 5.5s timeout
20:53:23  [BT_WRITE] AT PC
20:53:24  [BT_WRITE] AT SP 4         ← KWP 5-baud
20:53:29  [BT_WRITE] (empty)         ← 5.5s timeout
20:53:30  [BT_WRITE] AT PC
20:53:31  [BT_WRITE] AT SP 3         ← ISO 9141
20:53:36  [BT_READ]  OK >            ← 5.5s
20:53:37  [BT_WRITE] AT PC           ← ❌
20:53:38  [BT_WRITE] AT SP 1         ← J1850 PWM
20:53:42  [BT_READ]  OK >
20:53:43  [BT_WRITE] AT PC           ← ❌
20:53:44  [BT_WRITE] AT SP 2         ← J1850 VPW
20:53:48  [BT_READ]  OK >
          ... (bağlantı sona erdi — 01 00 hiç gönderilmedi)
```

---

## 🔴 ANA SORUN: `AT SP` Zaman Aşımı ile Yanıt Yarışıyor — Timeout Kazanıyor

### Kanıt Tablosu

| Protokol | Gönderildi | OK > Geldi | Süre | Timeout | Sonuç |
|----------|-----------|-----------|------|---------|-------|
| AT SP 6 | 20:52:39 | 20:52:44.401 | **5.4s** | 5,000ms | ❌ TIMEOUT (400ms farkla!) |
| AT SP 7 | 20:52:45 | 20:52:50.886 | **5.1s** | 5,000ms | ❌ TIMEOUT |
| AT SP 8 | 20:52:52 | 20:52:57.390 | **5.1s** | 5,000ms | ❌ TIMEOUT |
| AT SP 9 | 20:52:58 | 20:53:03.893 | **5.1s** | 5,000ms | ❌ TIMEOUT |
| AT SP 3 | 20:53:31 | 20:53:36.891 | **5.5s** | 5,500ms | ❌ TIMEOUT |
| AT SP 1 | 20:53:38 | 20:53:42.891 | **5.0s** | 4,500ms | ❌ TIMEOUT |
| AT SP 2 | 20:53:44 | 20:53:48.893 | **5.0s** | 4,500ms | ❌ TIMEOUT |

**Her bir `AT SP` komutu zaman aşımına uğruyor!** Adaptör5-5.5 saniyede yanıt veriyor ama timeout bu süreden kısa.

### Zaman Aşımı vs Yanıt Süresi

```
AT SP 6 gönderildi:  20:52:39.000
Timeout tetiklendi:  20:52:44.000  (5000ms sonra)
OK > geldi:          20:52:44.401  (5400ms sonra)
                     ↑
                     Timeout, yanıttan 400ms ÖNCE tetiklendi!
```

---

## 📊 Sorun Zinciri

```
1. AT Z gönderiliyor → "?" yanıtı (adaptör hazır değil)
         ↓
2. Benchmark: ATI, AT RV, AT DP → zaman aşımı (ama çalışıyor)
         ↓
3. ATE0 gönderiliyor → zaman aşımı
         ↓
4. AT SP 0 gönderiliyor → zaman aşımı
         ↓
5. Fallback döngüsü başlıyor
         ↓
6. AT SP 6 gönderiliyor (5000ms timeout)
         ↓
7. Adaptör 5.4s'de OK > döndürüyor
         ↓
8. Ama timeout 5.0s'de tetikleniyor → HATA!
         ↓
9. Kod hatayı yakalıyor → sonraki iterasyon
         ↓
10. AT PC gönderiliyor (sonraki iterasyon)
         ↓
11. AT SH 7E0 ve 01 00 HİÇ GÖNDERİLMİYOR
         ↓
12. Aynı döngü tüm protokoller için tekrarlanıyor
         ↓
13. ❌ BAĞLANTI BAŞARISIZ
```

---

## 🔍 Kök Neden: 2 Ayrı Sorun

### Sorun 1: `AT SP` Timeout Çok Kısa

**Dosya:** `src/hooks/useBluetooth.ts` satır ~222

```typescript
{ sp: 'AT SP 6', name: 'CAN 11b/500k', isCan: true, timeout: 5000 },  // ← 5000ms
```

**Gerçek adaptör yanıt süresi:** 5.0 - 5.5 saniye

**Sonuç:** Timeout, yanıttan 0-400ms önce tetikleniyor → her seferinde TIMEOUT.

### Sorun 2: `AT SP` Başarısız Olursa `01 00` Hiç Gönderilmiyor

**Dosya:** `src/hooks/useBluetooth.ts` satır ~253

```javascript
try {
    await OBDCommandQueue.add(item.sp, item.timeout);  // ← TIMEOUT düşüyor
    await preciseSleep(150);
    await OBDCommandQueue.add("AT SH 7E0", 1000);     // ← HİÇ ULAŞILMIYOR
    await OBDCommandQueue.add("01 00", item.timeout);   // ← HİÇ ULAŞILMIYOR
} catch (fallbackErr) {
    // Hata yakalanıyor, döngü sonraki iterasyona geçiyor
}
```

**Sorun:** `AT SP` timeout düşünce catch bloğuna atlıyor → `AT SH 7E0` ve `01 00` hiç执行 edilmiyor.

---

## 🆚 Infocar Neden Bağlanıyor?

| Faktör | Infocar | MotoCortex |
|--------|---------|------------|
| `AT SP` timeout | ~8-10s | **5,000ms** |
| `AT SP` sonrası `01 00` | Hemen gönderiyor | **Gönderemiyor (timeout engeli)** |
| Adaptör reset sayısı | 1 | 2+ |
| Benchmark komut sayısı | 2-3 | 4+ |
| Toplam komut sayısı | ~5 | **20+** |

---

## 🔧 Gerekli Düzeltmeler

### Düzeltme 1: `AT SP` Timeout Artırımı (EN KRİTİK)

```typescript
// MEVCUT:
{ sp: 'AT SP 6', timeout: 5000 }

// ÖNERİLEN:
{ sp: 'AT SP 6', timeout: 8000 }  // 8 saniye — adaptörlere yeterli zaman
```

**Tüm CAN protokolleri için:** 5000ms → 8000ms  
**K-Line protokolleri için:** 5500ms → 9000ms  
**J1850 protokolleri için:** 4500ms → 7000ms  
**J1939:** 10000ms (zaten yeterli)

### Düzeltme 2: `AT SP` Başarısız Olsa bile `01 00` Dene

```javascript
// MEVCUT:
try {
    await OBDCommandQueue.add(item.sp, item.timeout);
    // ... AT SH 7E0, 01 00
} catch {
    // Hata yakalanıyor, 01 00 hiç denenmiyor
}

// ÖNERİLEN:
let spSuccess = false;
try {
    await OBDCommandQueue.add(item.sp, item.timeout);
    spSuccess = true;
} catch {
    // AT SP başarısız ama yine de 01 00 dene
}

// AT SP başarısız olsa bile 01 00 göndermeyi dene
if (item.isCan) {
    await OBDCommandQueue.add("AT SH 7E0", 1000).catch(() => {});
}
let initRes = await OBDCommandQueue.add("01 00", item.timeout);
ecuConnected = verifyHandshakeResponse(initRes, "01 00");
```

### Düzeltme 3: Benchmark Timeout Artırımı

```typescript
// MEVCUT:
await OBDCommandQueue.add('AT Z', 3500);
await OBDCommandQueue.add('ATI', 2500);
await OBDCommandQueue.add('AT RV', 2000);
await OBDCommandQueue.add('AT DP', 2000);

// ÖNERİLEN:
await OBDCommandQueue.add('AT Z', 5000);
await OBDCommandQueue.add('ATI', 5000);
await OBDCommandQueue.add('AT RV', 5000);
await OBDCommandQueue.add('AT DP', 5000);
```

---

## 📋 Öncelik Sırası

| # | Düzeltme | Etki | Zorluk | Öncelik |
|---|----------|------|--------|---------|
| 1 | `AT SP` timeout 5s → 8s | 🔴 Kritik | 🟢 1 satır | **P0** |
| 2 | `AT SP` başarısız olsa bile `01 00` dene | 🔴 Kritik | 🟡 Orta | **P0** |
| 3 | Benchmark timeout artırımı | 🟠 Yüksek | 🟢 4 satır | **P0** |
| 4 | `ATE0` timeout artırımı | 🟡 Orta | 🟢 1 satır | **P1** |

---

## 📈 Beklenen Düzeltme Sonrası Akış

```
20:52:39  AT SP 6 gönderildi (8s timeout)
20:52:44  OK > geldi (5.4s) → TIMEOUT'dan ÖNCE!
20:52:44  AT SH 7E0 gönderildi
20:52:45  01 00 gönderildi
20:52:46  41 00 BE BF BF A8 geldi (ECU yanıtı!)
          ✅ BAĞLANTI BAŞARILI!
```

---

## ✅ Sonuç

**Kök Neden:** `AT SP` timeout (5000ms) adaptör yanıt süresinden (5000-5500ms) kısa. Timeout, yanıttan 0-400ms önce tetikleniyor. Bu, `01 00` gönderilmesini engelliyor.

**İspat:** Loglarda her `AT SP` komutundan sonra `OK >` geliyor ama AT PC (sonraki iterasyon) ile aynı saniyede. `01 00` hiç yok.

**Çözüm:** Timeout sürelerini 8000ms'ye çıkarmak ve `AT SP` başarısız olsa bile `01 00` göndermeyi denemek.

---

*Rapor Arena.ai QA Agent tarafından terminal log analizi ile oluşturulmuştur. Kod değişikliği yapılmamıştır.*
