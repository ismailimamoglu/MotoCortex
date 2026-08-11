# MotoCortex — Saha Testi Bağlantı Log Analizi Raporu

**Tarih:** 11.08.2026
**Kaynak:** `motocortex_rolling.md` (cihaz bağlantı denemesi logu)
**Analiz türü:** Statik log incelemesi (paylaşılan log dosyası üzerinden)
**Not:** Bu rapor yalnızca paylaşılan log kayıtlarının incelenmesine dayanır; kod değişikliği yapılmamıştır.

---

## 1. Özet Bulgu

Log, cihazın **fiziksel/donanımsal bir arıza içermediğini**, buna karşılık **MotoCortex uygulamasının bağlantı/protokol el sıkışma (handshake) mantığında en az üç ayrı sorun** olduğunu gösteriyor. En kritik bulgu: uygulama protokolü başarıyla kurduktan (`AT SP 6` → `OK`) hemen sonra, bağlantıyı kendi eliyle kapatan bir komut (`AT PC`) gönderiyor. Yani **bağlantı kopmadı, uygulama tarafından anında sonlandırıldı.**

Infocar uygulamasının aynı cihaza anında bağlanması, sorunun adaptör/araç/ECU tarafında değil, **MotoCortex'in komut gönderme/yanıt bekleme mantığında** olduğunu doğruluyor.

---

## 2. Zaman Çizelgesi Analizi (Log Üzerinden Adım Adım)

| Zaman | Olay | Değerlendirme |
|---|---|---|
| 14:36:46.333 | Boş `BT_WRITE` | Muhtemelen bağlantı açılış sinyali / init yazımı |
| 14:36:46.897 | `AT Z` gönderildi | **Standart format `ATZ` olmalı; araya boşluk eklenmiş.** Chip reset komutu |
| 14:36:51.356 | `ATI` gönderildi | ATZ'den ~4.5 sn sonra — reset süresi açısından makul |
| 14:36:52.596 | `AT RV` gönderildi | Voltaj sorgusu; yine boşluklu format |
| 14:36:53.629 | `AT DP` gönderildi | Aktif protokolü sorgulama |
| 14:36:53.744 | `ATWS` gönderildi | **`AT DP`den sadece 115 ms sonra** — önceki komuta yanıt beklenmeden yeni komut gönderilmiş |
| **14:37:01.004** | **İlk `BT_READ_CHUNK` (ilk yanıt!)** | Oturumun başlangıcından **~14.7 saniye sonra**, ve **6 komut art arda gönderildikten sonra** gelen ilk yanıt |
| 14:37:01.025 | Yanıt içeriği: `? >` | **`?` = ELM327/adaptör komutu anlamadı.** Muhtemelen üst üste binen/senkronize olmayan komutlar adaptör tamponunda karıştı |
| 14:37:01.164 | `AT SP 0` gönderildi | Otomatik protokol seçimi denemesi |
| 14:37:04.920 | `AT PC` gönderildi | Protokolü kapat (Protocol Close) |
| 14:37:05.018 | `ATWS` gönderildi | Warm start — yine önceki komuta yanıt beklenmeden |
| 14:37:06.068 | `AT SP 6` gönderildi | Protokolü zorla CAN 11-bit/500 kbps (ISO 15765-4) olarak ayarlama denemesi |
| **14:37:09.663** | `BT_READ_CHUNK`: **`OK >`** | **Protokol başarıyla kuruldu!** Bu, oturumdaki tek başarılı onaydır |
| **14:37:09.881** | **`AT PC` gönderildi** | **Az önce kurulan protokol, ~200 ms içinde uygulama tarafından kapatıldı** |
| 14:37:10.697 | Boş `BT_WRITE` | Son yazım denemesi |
| 14:37:24.761 | `ADMIN_TERMINAL`: Log export | ~14 sn sessizlik sonrası kullanıcı işlemi sonlandırıp log'u dışa aktarmış (pes edilmiş) |

---

## 3. Kök Neden Analizi

### 3.1 🔴 KRİTİK: Başarılı bağlantı, uygulama tarafından anında kapatılıyor
`AT SP 6` komutuna `OK` yanıtı alındıktan **~200 milisaniye sonra** uygulama `AT PC` (Protocol Close) komutu gönderiyor. Bu, ELM327/OBD protokolünde "artık iletişim kurma, protokolü kapat" anlamına gelir. Pratikte şu anlama gelir:

> **Cihaz aslında bağlanmayı başardı — ama uygulama, kendi kurduğu bağlantıyı hemen ardından kapattı.**

Bu davranış tipik olarak şu senaryolarda görülür:
- Bağlantı state machine'inde **yarış durumu (race condition)** — bir taraf "protokolü kur" işlemini yürütürken, başka bir thread/timeout/cleanup rutini paralelde "bağlantıyı temizle/kapat" komutunu tetikliyor.
- Bir **timeout mekanizmasının**, asıl yanıt gelmeden (veya geldiği anda) devreye girip "bağlantı kurulamadı" varsayımıyla kapatma prosedürünü çalıştırması.
- İki farklı bağlantı deneme döngüsünün (retry) üst üste binmesi — birinci deneme protokolü kurarken, ikinci denemenin "yeniden başlat" mantığı `ATPC` göndermiş olabilir.

**Bu, saha testindeki başarısızlığın en olası birincil nedenidir.**

### 3.2 🟠 Komut/Yanıt Senkronizasyon Sorunu
Log'da ilk 6 komut (`AT Z`, `ATI`, `AT RV`, `AT DP`, `ATWS`, `ATE0`) art arda gönderiliyor ama **ilk yanıt (`BT_READ_CHUNK`) ancak 6. komuttan sonra, 14.7 saniye gecikmeyle geliyor** ve içeriği `?` (anlaşılamayan komut).

OBD/ELM327 iletişimi temelde **istek-yanıt (request-response)** modelidir: her komuttan sonra adaptörün `>` istem karakterini göndermesi beklenmeli, bir sonraki komut ancak ondan sonra yollanmalı. Log'da `AT DP` → `ATWS` arasında sadece 115 ms var; bu, yanıt beklenmediğinin açık göstergesi.

Sonuç: Komutlar adaptörün giriş tamponunda üst üste binmiş/karışmış olabilir, bu da `?` yanıtını açıklar. **Orijinal ELM327 çipleri bu tür üst üste binmelere bazen tolerans gösterebilir, ama klon çipler (özellikle ucuz STN/ELM327-uyumlu klonlar) çok daha az toleranslıdır** — bu da "global pazarda klon cihazlarla sorunsuz çalışma" hedefiniz açısından doğrudan risk taşır.

### 3.3 🟡 AT Komut Formatlama Tutarsızlığı
Log'da iki farklı format bir arada kullanılıyor:
- Boşluklu: `AT Z`, `AT RV`, `AT DP`, `AT SP 0`, `AT SP 6`, `AT PC`
- Bitişik: `ATI`, `ATWS`, `ATE0`

Standart ELM327 komut seti bitişik yazılır (`ATZ`, `ATSP0`, `ATPC` vb.). Orijinal ELM327 firmware'i genelde boşlukları görmezden gelip toleranslı davranır, ancak **bu tutarsızlık, kodda komutları oluşturan iki farklı fonksiyon/yol olduğuna işaret ediyor** — biri boşluk ekleyen bir "builder" kullanıyor, diğeri ham string literal kullanıyor. Klon adaptörlerin bir kısmı (özellikle ELM327 taklidi yapan ama tam uyumlu olmayan ucuz chipsetler) bu tarz varyasyonlarda ayrıştırma hatası verebilir — log'daki `?` yanıtı bunun bir belirtisi olabilir.

### 3.4 🟡 Tekrarlanan/Çakışan Komutlar
`ATWS` (warm start) ve `AT PC` komutları oturum boyunca **ikişer kez** gönderiliyor, aralarında `AT SP 0` → `AT SP 6` geçişi var. Bu, protokol otomatik algılamanın (`AT SP 0`) başarısız/onaysız kaldığını, ardından uygulamanın CAN 11-bit/500k'ya (`AT SP 6`) zorla geçtiğini gösteriyor. Fallback mantığının kendisi makul, ama bunun hemen ardından gelen `AT PC` (bkz. 3.1) bu çabayı boşa çıkarıyor.

---

## 4. Infocar Karşılaştırması — Neden "Cihaz Arızalı" Değil

Bildirdiğiniz gözlemler:
- Infocar aynı cihaza **anında** bağlandı
- Daha önce de bu cihazla test edilmiş ve çalıştığı doğrulanmış

Bu, aşağıdaki ihtimalleri büyük ölçüde eler:
- ❌ Adaptörün donanımsal arızası (Infocar da başarısız olurdu)
- ❌ Bluetooth eşleştirme/radyo sorunu (eşleştirme çalışıyorsa her uygulama seri bağlantıyı açabilmeli)
- ❌ Araç/ECU tarafında elektriksel bir sorun (Infocar CAN hattına erişip yanıt alabiliyor)

Ve şunu güçlü şekilde destekler:
- ✅ **Sorun, MotoCortex'in komut gönderme sırası + yanıt bekleme senkronizasyonu + bağlantı sonlandırma (state machine) mantığında.** Infocar muhtemelen her komuttan sonra `>` istemini bekleyip komutları standart (bitişik) formatta gönderiyor ve protokol kurulduktan sonra `ATPC` gibi bir kapatma komutu tetiklemiyor.

---

## 5. Öncelik Sırasına Göre İncelenmesi Gereken Alanlar

Kod değişikliği yapmıyorum, ama saha testi bulgularına göre **incelenmesi gereken alanları önceliklendiriyorum:**

1. **(En kritik)** Bağlantı state machine'inde, protokol başarıyla kurulduktan (`OK` yanıtı) hemen sonra `ATPC` komutunu tetikleyen kod yolunu bulun — bu büyük olasılıkla bir race condition, yanlış tetiklenen timeout, veya çakışan iki bağlantı denemesi (retry) senaryosu.
2. Komut gönderme mantığında **"yanıt (`>` prompt) gelmeden bir sonraki komutu gönderme"** kuralının uygulanıp uygulanmadığını doğrulayın — mevcut log'da bu kurala uyulmadığına dair güçlü kanıt var.
3. AT komut string'lerinin **tek, tutarlı bir formatter üzerinden** (boşluksuz, standart ELM327 formatında) üretildiğinden emin olun — klon adaptör toleransını artırmak için önemli.
4. Timeout değerlerini gözden geçirin: ilk yanıtın gelmesi 14.7 saniye sürmüş; bu, gerçek dünyada kullanıcının "bağlanamadı" hissine kapılıp pes etmesine yol açacak kadar uzun (nitekim saha testinde de öyle olmuş).

---

## 6. Sınırlama Notu

Bu rapor, yalnızca paylaşılan `motocortex_rolling.md` log dosyasının analizine dayanmaktadır. Log'da yalnızca gönderilen (`BT_WRITE`) komutlar ve gelen bazı yanıt parçaları (`BT_READ_CHUNK`) yer alıyor; bağlantının hangi kod yolundan (`ATPC` tetikleyicisi) geldiğini kesin olarak belirlemek için ilgili state machine / bağlantı yöneticisi kodunun incelenmesi gerekir. İsterseniz o dosyayı da paylaşın, log'daki bulguları kodla birebir eşleştirip daha kesin bir teşhis çıkarabilirim.
