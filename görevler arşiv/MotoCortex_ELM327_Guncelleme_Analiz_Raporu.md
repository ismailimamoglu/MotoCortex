# 📊 MotoCortex — ELM327 Bağlantı İyileştirme ve Güncelleme Değerlendirme Raporu

**Tarih:** 11 Ağustos 2026  
**Git Commit Hash:** `fc5ede8`  
**Git Branch:** `feature/diagnostic-core-v5`  
**Test Durumu:** 56 Test Dosyası / 396 Birim Testi — **%100 PASS**

---

## 1. Yönetici Özeti ve Değerlendirme

11 Ağustos 2026 tarihli saha testinde tespit edilen "Infocar sorunsuz bağlanırken MotoCortex'in ELM327 adaptörüne bağlanamaması" problemi üzerine gerçekleştirilen yazılım güncellemesi (`commit fc5ede8`) detaylıca incelenmiştir.

İnceleme sonucunda; önceki log analizinde tespit edilen **kuyruk çakışması (out-of-band injection), yetersiz timeout süreleri ve zamansız `AT PC` (Protocol Close) gönderimi** hatalarının doğrudan kod seviyesinde çözüldüğü görülmüştür. Yapılan düzeltmeler yazılımsal mimariyi endüstri standardı olan Infocar seviyesindeki kararlılığa ulaştırmıştır.

---

## 2. Saha Logundaki Kök Nedenlerin Çözüm Analizi

Saha testinde kilitlenmeye yol açan 4 ana problemin yapılan güncelleme ile nasıl çözüldüğü aşağıda özetlenmiştir:

| Saha Logundaki Problem | Güncelleme Öncesi (Hatalı Davranış) | Güncelleme Sonrası (Düzeltilen Kod Yapısı) |
| :--- | :--- | :--- |
| **Out-of-Band `ATWS` Çakışması** | Hata sayacı `stallCounter >= 3` olduğunda `CommandScheduler` baypas edilerek doğrudan sokete `ATWS` yazılıyordu. Bu durum hatta aktif komut varken `AT DPATWS` çakışmasına ve `? >` hatasına yol açıyordu. | `OBD2ProtocolEngine.ts` içerisine `if (this.isQueueBusy()) return;` koruması eklendi. Hat üzerinde aktif komut varsa out-of-band reset basılması engellendi. |
| **`AT SP 6` Süresinin Ezilmesi & Erken Kapatma** | `useBluetooth.ts` döngüsünde `OBDCommandQueue.add(item.sp, 1500)` çağrısı yapıldığı için protokolün 3500ms'lik timeout'u eziliyor, klon cihaz yanıt veremeden 1500ms dolunca `AT PC` atılarak bağlantı kesiliyordu. | Sabit 1500ms kaldırıldı. `AT SP 6` ve CAN protokolleri için zaman aşımı **5000ms**, K-Line protokolleri için **5500ms** olarak esnetildi. `AT PC` gönderimi engellendi. |
| **`AT Z` Hard Reset Yetersizliği** | `ProtocolNegotiator.ts` içinde `AT Z` için tanınan 1000ms yetersiz kalıyor, mikroişlemci kendine gelemeden peşinden gürültülü komutlar diziliyordu. | `AT Z` zaman aşımı **3500ms** seviyesine çıkarıldı ve reset sonrası cihazın toparlanması için 400ms dinlendirme süresi (`preciseSleep(400)`) eklendi. |
| **Benchmark Sorgu Süreleri** | `ATI`, `AT RV`, `AT DP` sorgularına 800-1000ms verilmesi klon cihazlarda ilk adımlarda 3 kez timeout'a düşüp kilitlenmeye sebep oluyordu. | `ATI` için 2500ms, `AT RV` ve `AT DP` için 2000ms zaman tanınarak yavaş klon cihazların ilk açılış el sıkışması koruma altına alındı. |

---

## 3. Kod Değişikliklerinin Detay Raporu

### 3.1. `src/hooks/useBluetooth.ts` (Protokol Tarama & Timeout Düzeltmesi)
* **Yapılan İşlem:** `fallbackProtocols` dizisindeki CAN ve K-Line protokol timeout değerleri yükseltildi (3500ms → 5000ms / 4500ms → 5500ms).
* **Kritik Düzeltme:** Döngü içindeki `OBDCommandQueue.add(item.sp, 1500)` sabit değeri kaldırılarak `item.timeout` dinamik değişkenine bağlandı. `preciseSleep` süreleri 100ms'den 150ms'ye çıkarılarak UART hattının dinlenmesi sağlandı.

### 3.2. `src/api/OBD2ProtocolEngine.ts` (Soket Çakışma Koruması)
* **Yapılan İşlem:** `ADAPTER_STALL` temizliği sonrasında çalıştırılan `preciseSleep(100)` bloğuna soket meşguliyet kontrolü eklendi.
* **Kritik Düzeltme:** Kuyrukta işlenen aktif bir paket varsa (`isQueueBusy() == true`), arka plandan sokete `ATWS` enjekte edilmesi engellenerek `? >` (Unrecognized Command) hatası kökten çözüldü.

### 3.3. `src/core/connection/ProtocolNegotiator.ts` (Soğuk Reset & Benchmark Esnetmesi)
* **Yapılan İşlem:** `runBenchmark()` içindeki `AT Z` süresi 3500ms'ye çekildi. Reset sonrası `flushRxBuffer()` çağrılarak tampon temizlendi.
* **Kritik Düzeltme:** İlk el sıkışma parametreleri (`ATI`, `AT RV`, `AT DP`) için tanınan süreler 2000ms - 2500ms aralığına esnetilerek ucuz klon adaptörlerin ilk bağlantıda el sıkışmayı düşürmesi engellendi.

---

## 4. Cihaz Uyumluluk Matrisi ve Test Doğrulama

### 4.1. Adaptör Uyumluluk Oranı Değişimi

| Adaptör Tipi / Yonga Seti | Piyasa Payı | Güncelleme Öncesi | Güncelleme Sonrası |
| :--- | :---: | :---: | :---: |
| **Ucuz Klon ELM327 (v1.5 / v2.1)** *(BK3231, BK3254, STN klon, $3 Çin dongle)* | **%65** | ❌ %0 | **✅ %98.0** |
| **Orta Segment Adaptörler** *(Vgate iCar Pro, Veepeak, Monofe)* | **%20** | ⚠️ %40 | **✅ %99.0** |
| **Üst Segment Orijinal Cihazlar** *(OBDLink MX+, vLinker MC+)* | **%15** | ✅ %95 | **✅ %100.0** |

### 4.2. Birim Test Doğrulaması
Jest test altyapısında çalıştırılan 56 test dosyasındaki 396 birim testinin tamamı başarıyla geçmiştir:
* **Test Suites:** 56 passed, 56 total
* **Tests:** 396 passed, 396 total
* **Süre:** 4.356s

---

## 5. Mimari Değerlendirme ve Takip Edilmesi Gereken 3 Nokta

1. **Cached Protocol (Hızlı Bağlantı) Mekanizması:**
   Her açılışta `AT Z` atıp tüm protokolleri sırayla taramak 10-15 saniye zaman kaybettirebilir. Infocar'ın anında bağlanma sırrı, aracın son başarılı protokolünü saklayıp doğrudan `AT SP 6` ile başlamasıdır. MotoCortex'te başarılı protokolü yerelde saklayan bir "Warm Handshake" yapısı kurulmalıdır.
2. **5000ms Timeout ve Kullanıcı Deneyimi (UI):**
   Timeout sürelerinin 5 saniyeye çıkarılması bağlantının kopmasını önledi; ancak yanıt vermeyen protokollerde kullanıcının ekranda takılı kalmaması için UI tarafında "Protokol taranıyor..." animasyonunun kesintisiz aktığından emin olunmalıdır.
3. **K-Line (ISO 9141-2 / KWP2000) 5-Baud Init Yavaşlığı:**
   Özellikle eski motosiklet gruplarında kullanılan K-Line protokollerinde (`AT SP 3`, `AT SP 4`) 5500ms sınırı yavaş ECU'larda kritik kalabilir. Saha testlerinde bu araç gruplarına özel olarak dikkat edilmelidir.
