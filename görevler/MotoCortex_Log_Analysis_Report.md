# MotoCortex Saha Logu ve Bağlantı Sorunu Analiz Raporu

---

## 1. Saha Logu Root Cause Analysis (Hata Kök Neden Analizi)

Gönderilen log verileri, sorunun OBD2 adaptöründe (donanımda) değil, MotoCortex’in **Bluetooth I/O komut kuyruğu yönetimi (Serial Command Queue)** ve **ELM327 Seri İletişim Protokolü** katmanındaki mimari hatalardan kaynaklandığını kesin olarak doğrulamaktadır.

```
[14:36:46.897] [BT_WRITE] AT Z          --> Hard Reset komutu gönderildi
[14:36:50.403] [BT_WRITE]               --> Yanıt beklemeden boş paket / CR
[14:36:51.356] [BT_WRITE] ATI           --> Yanıt beklemeden ATI gönderildi
[14:36:53.629] [BT_WRITE] AT DP         --> Describe Protocol gönderildi
[14:36:53.744] [BT_WRITE] ATWS          --> 115 ms sonra Warm Start atıldı (ÇAKIŞMA!)
[14:37:01.025] [BT_READ_CHUNK] ? >      --> Donanım "Komut Anlaşılamadı" (Syntax Error) döndü
```

### İletişim Hattındaki 4 Kritik Hata:

1. **Yarı-Dubleks (Half-Duplex) Senkronizasyon İhlali:**
   ELM327 çipleri yarı-dubleks çalışır. Bir `AT` komutu gönderildiğinde, çip yanıtı tamamlayıp istemciye `>` (prompt) karakterini döndürene kadar **ikinci bir komut gönderilemez**. Loglarda `14:36:53.629`'da `AT DP` gönderildikten sadece 115 ms sonra `ATWS` basılmıştır. Bu durum UART hattında TX/RX tamponlarının (buffer) çakışmasına ve paketlerin ezilmesine yol açmıştır.

2. **Buffer Poisoning ve `? >` Hatası:**
   Logtaki `14:37:01.025` zaman damgasında cihazdan gelen ilk okuma chunk'ı `? >` şeklindedir. ELM327'de `?` yanıtı **"Unrecognized Command / Syntax Error"** anlamına gelir. Uygulama arda arda komutları hatta dizdiği için donanım gelen veriyi `AT DPATWS` gibi bozuk bir dizi olarak okumuş ve komut reddedilmiştir.

3. **Çelişkili ve Sırasız Komut Dizilimi (Confused Handshake):**
   * `AT Z` (Hard Reset) sonrası ELM327 çipinin internal boot süresi ~1000-1500 ms'dir. Uygulama bu süreyi beklemeden doğrudan `ATI` ve `AT RV` sorgulamıştır.
   * `14:37:06.068`'de `AT SP 6` (ISO 15765-4 CAN 11bit/500kbps) gönderilmiş ve cihaz `14:37:09.663`'te buna `OK >` yanıtı vermiştir. Ancak tam protokol el sıkışması sağlanmışken `14:37:09.881`'de uygulama aniden `AT PC` (Protocol Close) göndererek kurulan CAN veri yolunu kendisi kapatmıştır!

4. **Kilitlenme (Hang/Timeout) Yönetimi:**
   `14:37:10.697` seviyesinde atılan son boş paketten sonra `14:37:24.761` tarihine kadar (yaklaşık 14 saniye) hiçbir RX/TX trafiği akmamıştır. Uygulama, adaptörden yanıt alamadığında oturumu düşürüp otomatik reconnect/retry mekanizmasını tetikleyememiş, IO Isolate/Thread seviyesinde asılı (hang) kalmıştır.

---

## 2. Infocar Neden Anında Bağlandı? (Karşılaştırmalı Analiz)

Infocar veya ticarileşmiş rakip OBD uygulamalarının anında bağlanıp MotoCortex'in kilitlenmesinin sebebi adaptör farkı değil, **Session & State Machine** mimarisidir:

| Parametre | MotoCortex (Mevcut Log Davranışı) | Infocar & Endüstri Standardı |
| :--- | :--- | :--- |
| **I/O Modu** | Non-blocking Fire-and-Forget (Yanıt beklemeden ardışık TX) | **Strict Blocking Queue / Sequential Async Lock** (Yanıt ve `>` gelmeden sonraki komut gönderilmez). |
| **Protokol El Sıkışması** | Her bağlantıda sırasıyla `ATZ` -> `ATWS` -> `ATSP0` -> `ATPC` -> `ATSP6` döngüsü | **Cached Protocol Handshake** (Önceki başarılı bağlantıdaki VIN/Protocol bilgisi hatırlanır, doğrudan `0100` atılır). |
| **Reset Yönetimi** | `AT Z` sonrası gürültülü `ATWS` ve `AT PC` gönderimi | `AT Z` sonrası 1.5 saniye donanım dinlendirme (settling time) bekletilir. |
| **Tampon Temizleme** | Yanıt alınamadığında hatta yeni komut yazılmaya devam ediliyor | Her komut öncesi RX buffer flush edilir; `?` alındığında otomatik `AT Z` fallback atılır. |

---

## 3. Mantık Boşlukları ve Mimarini Zorlayacak 3 Soru

Mevcut log katmanındaki problemleri çözmek ve Infocar seviyesinde bir bağlantı kararlılığına ulaşmak adına sistem tasarımsal olarak şu 3 noktada teste tabi tutulmalıdır:

1. **Async Command Queue & Prompt Interlocking:**
   İstemci tarafında `send()`, BLE soketine veriyi yazar yazmaz `Future/Promise` döndürüyor mu? Eğer stream katmanında okunan veride `>` (0x3E) byte'ı görülmeden bir sonraki TX paketi kilitlenmiyorsa (Mutex / Semaphore kullanılmıyorsa), hattın çakışmasını engellemek için yazılım mimarinde nasıl bir kuyruk mekanizması kurguladın?

2. **`AT PC` (Protocol Close) Kararsızlığı:**
   Loglarda `AT SP 6` atılıp `OK >` cevabı alındıktan hemen sonra neden `AT PC` komutu tetiklendi? State Machine yapında "Protokol Seçildi" durumu gerçekleştikten sonra bağlantıyı kapatan (`Protocol Close`) bu mantık hatası kodun hangi event trigger'ından besleniyor?

3. **Adaptive Auto-Protocol Selection (Fallback Architecture):**
   Infocar gibi uygulamalar ilk bağlantıda `AT SP 0` (Auto) ile ECU'nun CAN id aralığını taratırken zaman kaybetmemek adına varsayılan olarak motorun kullandığı protokolü saklar. MotoCortex üzerinde bir cihaz bağlanamadığında (örn. `? >` alındığında) adaptörün baud rate veya protokol yanıtını sıfırlamak için yazılmış bir "Exponential Backoff & Recovery" stratejin var mı?
