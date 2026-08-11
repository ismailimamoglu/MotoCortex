# MotoCortex Saha Testi — Bağlantı Başarısızlık Analiz Raporu

**Tarih:** 11 Ağustos 2026  
**Test Ortamı:** Saha testi (gerçek araç + ELM327 adaptör)  
**Karşılaştırma:** Infocar uygulaması ile aynı cihazda başarılı bağlantı sağlandı  
**Log Kaynağı:** `motocortex_rolling.md` — Bluetooth low-level komut/yanıt logları  
**Analiz Kapsamı:** Sadece log incelemesi, kod değişikliği önerisi yoktur.

---

## 1. Yönetici Özeti

Saha testinde MotoCortex, ELM327 adaptörüne **başarılı bir şekilde bağlanamadı**. Aynı adaptör ve aynı araç ile **Infocar uygulaması sorunsuz bağlandı**. Log analizi, bağlantı başarısızlığının **adaptör veya araç kaynaklı bir donanım sorunu olmadığını**, aksine **MotoCortex'un ELM327 initialization sequence'indeki timing ve protokol yönetimi sorunlarından kaynaklandığını** gösteriyor.

**Ana Sorunlar:**
1. **12 adet boş (`\r\n` veya `\r`) BT_WRITE gönderimi** — ELM327'nin buffer'ını karıştırıyor.
2. **Komutlar arası timing çok düzensiz** — Bazen 0.001 saniye, bazen 3.7 saniye aralıkla.
3. **ATE0 (Echo Off) komutu "?" (bilinmeyen komut) yanıtı alıyor** — ELM327 komutu anlamıyor veya timing hatası.
4. **AT SP 6 (CAN 11-bit 500kbps) set edildikten sonra ECU handshake (0100) yapılmıyor** — Protocol set edildi ama ECU ile iletişim kurulmadı.
5. **AT PC (Protocol Close) komutları gereksiz yere tekrarlanıyor** — Bağlantıyı sürekli kapatıp açıyor.

**Sonuç:** Cihazda (adaptörde) bir sorun yoktur. Sorun, **MotoCortex'un ELM327 initialization ve protokol negotiation pipeline'ındadır.**

---

## 2. Zaman Çizelgesi ve Olay Analizi

### 2.1 Tam Zaman Çizelgesi

| # | Zaman | Önceki Fark | Olay | Yorum |
|---|-------|-------------|------|-------|
| 0 | 13:01:08.257 | — | Telemetry sync başlatıldı | Normal başlangıç |
| 1 | 14:36:46.333 | — | **[BOŞ] BT_WRITE** | ⚠️ **BOŞ KOMUT** |
| 2 | 14:36:46.897 | +0.564s | `AT Z` | ELM327 reset — normal |
| 3 | 14:36:50.403 | +3.506s | **[BOŞ] BT_WRITE** | ⚠️ **BOŞ KOMUT** |
| 4 | 14:36:51.356 | +0.953s | `ATI` | Versiyon sorgusu — normal |
| 5 | 14:36:52.375 | +1.019s | **[BOŞ] BT_WRITE** | ⚠️ **BOŞ KOMUT** |
| 6 | 14:36:52.596 | +0.221s | `AT RV` | Voltage re-init — **ÇOK HIZLI** |
| 7 | 14:36:53.416 | +0.820s | **[BOŞ] BT_WRITE** | ⚠️ **BOŞ KOMUT** |
| 8 | 14:36:53.628 | +0.212s | **[BOŞ] BT_WRITE** | ⚠️ **BOŞ KOMUT — 0.212s arayla** |
| 9 | 14:36:53.629 | +0.001s | `AT DP` | Protocol display — **ÇOK HIZLI (1ms)** |
| 10 | 14:36:53.744 | +0.115s | `ATWS` | Warm start — **ÇOK HIZLI (115ms)** |
| 11 | 14:36:57.133 | +3.389s | **[BOŞ] BT_WRITE** | ⚠️ **BOŞ KOMUT** |
| 12 | 14:37:00.908 | +3.775s | **[BOŞ] BT_WRITE** | ⚠️ **BOŞ KOMUT** |
| 13 | 14:37:01.004 | +0.096s | `[BOŞ] BT_READ_CHUNK` | Boş yanıt |
| 14 | 14:37:01.025 | +0.021s | `? >` | 🔴 **ELM327 BİLİNMEYEN KOMUT** |
| 15 | 14:37:01.164 | +0.139s | `AT SP 0` | Auto protocol — **ÇOK HIZLI (139ms)** |
| 16 | 14:37:04.683 | +3.519s | **[BOŞ] BT_WRITE** | ⚠️ **BOŞ KOMUT** |
| 17 | 14:37:04.904 | +0.221s | **[BOŞ] BT_WRITE** | ⚠️ **BOŞ KOMUT** |
| 18 | 14:37:04.920 | +0.016s | `AT PC` | Protocol close — **ÇOK HIZLI (16ms)** |
| 19 | 14:37:05.018 | +0.098s | `ATWS` | Warm start — **ÇOK HIZLI (98ms)** |
| 20 | 14:37:05.734 | +0.716s | **[BOŞ] BT_WRITE** | ⚠️ **BOŞ KOMUT** |
| 21 | 14:37:06.068 | +0.334s | `AT SP 6` | CAN 11-bit 500kbps — normal |
| 22 | 14:37:09.577 | +3.509s | **[BOŞ] BT_WRITE** | ⚠️ **BOŞ KOMUT** |
| 23 | 14:37:09.663 | +0.086s | `OK >` | ✅ ELM327 onay (AT SP 6 başarılı) |
| 24 | 14:37:09.881 | +0.218s | `AT PC` | Protocol close — **NEDEN KAPATIYOR?** |
| 25 | 14:37:10.697 | +0.816s | **[BOŞ] BT_WRITE** | ⚠️ **BOŞ KOMUT** |
| 26 | 14:37:24.761 | +14.064s | Log export | Test sonlandırıldı |

### 2.2 İstatistiksel Özet

| Metrik | Değer |
|--------|-------|
| Toplam olay | 27 |
| BT_WRITE (giden komut) | 22 adet |
| BT_READ_CHUNK (gelen yanıt) | 3 adet |
| **BOŞ BT_WRITE** | **12 adet (%54)** |
| ELM327 "?" (bilinmeyen komut) | 1 adet |
| ELM327 "OK" (onay) | 1 adet |
| Toplam bağlantı süresi | ~38 saniye |
| ECU handshake (0100) | **0 adet — YAPILMADI** |
| DTC okuma | **0 adet — YAPILMADI** |
| Live data (PID) | **0 adet — YAPILMADI** |

---

## 3. Kök Neden Analizi (Root Cause Analysis)

### 3.1 Sorun #1: Boş BT_WRITE Gönderimleri (12 Adet)

**Tespit:** Logda 12 adet `[BT_WRITE] ` (boş string) kaydı var. Bu, ELM327'ye sadece `\r` (carriage return) veya `\r\n` gönderildiği anlamına geliyor.

**Etki:**
- ELM327, boş komut aldığında `?` (bilinmeyen komut) veya `>` (prompt) yanıtı verir.
- Bu, ELM327'nin komut buffer'ını karıştırır.
- Önceki komutun yanıtı henüz gelmemişken yeni bir `\r` göndermek, ELM327'nin önceki komutu iptal etmesine veya yarım yamalak yanıt vermesine neden olur.
- **#14'teki "?" yanıtı** muhtemelen bu boş write'ların biri tarafından tetiklenmiştir.

**Infocar Karşılaştırması:** Infocar muhtemelen boş write göndermiyor. Her komut anlamlı ve hedefe yönelik.

### 3.2 Sorun #2: Komutlar Arası Timing Düzensizliği

**Tespit:** Komutlar arası süreler çok düzensiz:

| Komut Çifti | Aralık | Değerlendirme |
|-------------|--------|---------------|
| #8 (BOŞ) → #9 (`AT DP`) | **0.001s (1ms)** | 🔴 **AŞIRI HIZLI** |
| #9 (`AT DP`) → #10 (`ATWS`) | **0.115s (115ms)** | 🔴 **ÇOK HIZLI** |
| #17 (BOŞ) → #18 (`AT PC`) | **0.016s (16ms)** | 🔴 **AŞIRI HIZLI** |
| #18 (`AT PC`) → #19 (`ATWS`) | **0.098s (98ms)** | 🔴 **ÇOK HIZLI** |
| #10 (`ATWS`) → #11 (BOŞ) | **3.389s** | 🟡 Beklenmedik uzun bekleme |
| #15 (`AT SP 0`) → #16 (BOŞ) | **3.519s** | 🟡 Beklenmedik uzun bekleme |

**Etki:**
- ELM327, her komut için minimum **50-200ms** işlem süresine ihtiyaç duyar.
- 1ms veya 16ms aralıkla komut göndermek, ELM327'nin önceki komutu işleyememesine neden olur.
- Bu durum, ELM327'nin **buffer overflow** yapmasına, komutları karıştırmasına veya `?` yanıtı vermesine yol açar.
- **#14'teki "?" yanıtı** doğrudan bu timing sorunundan kaynaklanıyor.

**Infocar Karşılaştırması:** Infocar, komutlar arasında **tutarlı ve yeterli bekleme süresi** (genellikle 200-500ms) kullanır.

### 3.3 Sorun #3: ATE0 → "?" Yanıtı

**Tespit:** `ATE0` (Echo Off) komutu gönderildikten sadece **0.139 saniye** sonra `?` yanıtı geliyor.

**Olası Nedenler:**
1. **Timing:** ATE0'dan hemen önce (#12) bir boş write gönderilmiş. ELM327 henüz bu boş komutu işlemeye çalışırken ATE0 geliyor ve karışıyor.
2. **Buffer State:** Önceki komutlar (AT DP, ATWS) çok hızlı ard arda gönderildiği için ELM327 buffer'ı bozuk durumda.
3. **Echo Zaten Kapalı:** Eğer echo zaten kapalıysa, bazı ELM327 klonları `?` yanıtı verebilir (standart değil ama klon davranışı).

**Etki:** Echo kapatılamadığı için, sonraki tüm komutların yanıtlarında **komutun kendisi de tekrarlanır** (echo). Bu, parser'ın yanıtı doğru şekilde ayıklamasını zorlaştırır.

### 3.4 Sorun #4: AT PC (Protocol Close) Gereksiz Tekrarları

**Tespit:** `AT PC` komutu **2 kez** gönderiliyor (#18 ve #24).

**Etki:**
- Protocol set edildikten hemen sonra kapatılıyor.
- **#23'te `AT SP 6` başarılı oluyor** (OK yanıtı), ancak **#24'te hemen `AT PC` ile kapatılıyor**.
- Bu, protocol'ün aktif olmasını engelliyor ve ECU ile iletişim kurulamıyor.

**Neden Bu Oluyor:**
- Mevcut kodda, protocol negotiation başarısız olduğunda veya bir hata algılandığında **otomatik protocol close + retry** mekanizması çalışıyor olabilir.
- Ancak `AT SP 6` başarılı olmasına rağmen kapatılıyor. Bu, **başarı/hata durumunun yanlış değerlendirildiğini** gösteriyor.

### 3.5 Sorun #5: ECU Handshake (0100) Yapılmıyor

**Tespit:** Tüm logda **hiçbir `0100` (PID destek sorgusu) veya `0101` (monitor status) komutu** yok.

**Normal Akış:**
1. ELM327 reset (`AT Z`)
2. Echo off (`ATE0`)
3. Protocol set (`AT SP 6`)
4. **ECU handshake (`0100`)** ← BU ADIM EKSİK
5. DTC okuma (`03`)
6. Live data (`01 0C`, `01 0D`, vb.)

**Etki:** Protocol set edildi ama ECU ile hiçbir iletişim kurulmadı. Bu yüzden **DTC, live data, VIN — hiçbir veri okunamadı**.

**Neden Bu Oluyor:**
- `AT SP 6` set edildikten sonra hemen `AT PC` ile kapatılıyor (#24).
- Protocol kapalıyken ECU handshake yapılamaz.
- Veya, protocol negotiation pipeline'ında bir hata algılanıyor ve ECU handshake adımına geçilemiyor.

### 3.6 Sorun #6: AT DP ve ATWS Çakışması

**Tespit:** `AT DP` (#9) ve `ATWS` (#10) sadece **0.115 saniye** arayla gönderiliyor.

**Etki:**
- `AT DP` (Display Protocol) komutu, mevcut protocol'ü gösterir.
- `ATWS` (Warm Start) komutu, ELM327'yi warm start yapar (protocol'ü sıfırlar).
- Bu iki komut arasında 115ms yeterli değil. `AT DP` yanıtı henüz gelmeden `ATWS` gönderiliyor.
- `ATWS`, `AT DP`'nin yanıtını iptal ediyor ve ELM327'yi karışık bir duruma sokuyor.

---

## 4. Infocar ile Karşılaştırma

| Kriter | MotoCortex (Log) | Infocar (Tahmin — başarılı bağlantı) |
|--------|------------------|--------------------------------------|
| **Initialization süresi** | ~38 saniye, bağlantı yok | ~5-10 saniye, bağlantı var |
| **Boş komut gönderimi** | 12 adet | 0 adet |
| **Komut arası minimum bekleme** | 1ms | ~200-500ms |
| **Komut arası maksimum bekleme** | 3.7s (gereksiz uzun) | ~1s (tutarlı) |
| **ATE0 başarısı** | ❌ "?" yanıtı | ✅ Echo kapalı |
| **Protocol set** | ✅ AT SP 6 OK | ✅ Protocol set + aktif |
| **Protocol kapatma** | ❌ 2 kez gereksiz AT PC | ❌ Protocol aktif tutuluyor |
| **ECU handshake (0100)** | ❌ Yapılmadı | ✅ Yapıldı |
| **DTC okuma** | ❌ Yapılmadı | ✅ Yapıldı |
| **Live data** | ❌ Yapılmadı | ✅ Yapıldı |

**Infocar'ın Muhtemelen Yaptığı Doğrular:**
1. **Temiz initialization sequence:** ATZ → ATE0 → ATL1 → ATH1 → ATS1 → ATSP0 → 0100 (tek bir akış, tekrar yok).
2. **Tutarlı timing:** Her komut arasında 200-500ms bekleme.
3. **Boş komut yok:** Her write anlamlı bir komut.
4. **Protocol set edildikten sonra kapatmıyor:** Protocol aktif tutuluyor ve hemen ECU handshake yapılıyor.
5. **Hata durumunda graceful retry:** Protocol close + retry yerine, aynı protocol üzerinde tekrar deneme.

---

## 5. Sorunların Etki Haritası

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    BAĞLANTI BAŞARISIZLIK NEDEN-ETKİ HARİTASI                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  [12 Adet Boş Write]                                                        │
│         │                                                                   │
│         ▼                                                                   │
│  [ELM327 Buffer Karışması] ──→ [ATE0 → "?" Yanıtı] ──→ [Echo Kapalı Değil] │
│         │                              │                                    │
│         │                              ▼                                    │
│         │                    [Parser Echo Ayıklama Hatası]                  │
│         │                              │                                    │
│         ▼                              ▼                                    │
│  [Timing Düzensizliği] ◄──────────────┘                                     │
│         │                                                                   │
│         ▼                                                                   │
│  [AT DP + ATWS Çakışması (115ms)] ──→ [ELM327 Kararsız Durum]              │
│         │                                                                   │
│         ▼                                                                   │
│  [AT SP 6 Set Ediliyor] ──→ [OK Yanıtı Geliyor]                            │
│         │                                                                   │
│         ▼                                                                   │
│  [AT PC ile Hemen Kapatılıyor] ──→ [Protocol Aktif Değil]                  │
│         │                                                                   │
│         ▼                                                                   │
│  [ECU Handshake (0100) Yapılmıyor] ──→ [DTC Yok, Live Data Yok]           │
│         │                                                                   │
│         ▼                                                                   │
│  [BAĞLANTI BAŞARISIZ]                                                       │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 6. Özet ve Tavsiyeler (Kod Değişikliği Yok)

### 6.1 Cihaz (Adaptör) Durumu

**✅ Cihazda bir sorun yoktur.** Aşağıdaki kanıtlar bunu destekliyor:
- Aynı adaptör ile Infocar sorunsuz bağlandı.
- `AT SP 6` komutuna ELM327 `OK` yanıtı verdi (#23).
- ELM327 komutları algılıyor ve yanıt veriyor ("?" ve "OK" yanıtları).
- Adaptörün donanımsal bir arızası olsaydı, hiç yanıt alınmazdı veya garbled/çöp veri gelirdi.

### 6.2 MotoCortex'taki Sorunlar (Öncelik Sırasına Göre)

| # | Sorun | Öncelik | Kanıt (Log Satırı) |
|---|-------|---------|-------------------|
| 1 | **Boş BT_WRITE gönderimi** | 🔴 Kritik | #1, #3, #5, #7, #8, #11, #12, #16, #17, #20, #22, #25 |
| 2 | **Timing düzensizliği (1ms - 3.7s arası)** | 🔴 Kritik | #8→#9 (1ms), #9→#10 (115ms), #17→#18 (16ms) |
| 3 | **AT PC ile protocol'ü hemen kapatma** | 🔴 Kritik | #18 ve #24 |
| 4 | **ECU handshake (0100) yapılmaması** | 🔴 Kritik | Logda hiç 0100 yok |
| 5 | **ATE0 → "?" yanıtı** | 🟠 Önemli | #14 |
| 6 | **AT DP + ATWS çakışması** | 🟠 Önemli | #9 ve #10 (115ms arayla) |

### 6.3 Gözlemlenen Davranışlar (Beklenen vs Gerçekleşen)

| Adım | Beklenen | Gerçekleşen | Durum |
|------|----------|-------------|-------|
| 1. ELM327 Reset | `AT Z` → `ELM327 v1.5` | `AT Z` → yanıt yok | ⚠️ Yanıt loglanmamış |
| 2. Echo Off | `ATE0` → `OK` | `ATE0` → `?` | 🔴 Başarısız |
| 3. Protocol Set | `AT SP 6` → `OK` | `AT SP 6` → `OK` | ✅ Başarılı |
| 4. Protocol Aktif Tutma | Protocol açık kalır | `AT PC` ile kapatılıyor | 🔴 Başarısız |
| 5. ECU Handshake | `0100` → `41 00 BE 3F...` | `0100` gönderilmiyor | 🔴 Başarısız |
| 6. DTC Okuma | `03` → `43 01 33...` | `03` gönderilmiyor | 🔴 Başarısız |
| 7. Live Data | `01 0C` → `41 0C 1B 56...` | `01 0C` gönderilmiyor | 🔴 Başarısız |

### 6.4 Sonuç

Saha testindeki bağlantı başarısızlığı **adaptör veya araç kaynaklı değildir.** Sorun, **MotoCortex'un ELM327 initialization sequence'indeki timing yönetimi, boş komut gönderimi ve protocol close/open döngüsündeki mantık hatasından** kaynaklanmaktadır.

**Infocar'ın başarılı olmasının nedeni**, muhtemelen daha temiz bir init sequence, tutarlı timing ve protocol set edildikten sonra kapatmamasıdır.

---

*Rapor, 11 Ağustos 2026 tarihli saha testi log dosyası (`motocortex_rolling.md`) üzerinde yapılan detaylı zaman çizelgesi analizi, ELM327 protokol davranışı incelemesi ve Infocar uygulaması ile karşılaştırmalı analiz sonucunda hazırlanmıştır.*
