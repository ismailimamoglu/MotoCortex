# MotoCortex — Son Saha Testi Analizi ve "Profesyonel Seviye" Yol Haritası
### (Car Scanner / Infocar Seviyesine Ulaşmak İçin Gereken Adımlar)

**Tarih:** 13 Ağustos 2026
**Kaynak:** `motocortex_rolling6.md` (3 ayrı bağlantı denemesi/oturum)

---

## 🟢 Önce İyi Haber: Gerçek ve Ölçülebilir İlerleme Var

Bu log, önceki incelemede işaret ettiğim **üç kritik sorunun üçünün de** artık büyük ölçüde giderildiğini gösteriyor — bunu net şekilde belirtmek gerekiyor, çünkü bu gerçek bir mühendislik ilerlemesi:

| Önceki Kritik Sorun | Bu Logdaki Durum |
|---|---|
| AT komutları boşluklu gönderiliyordu (`AT Z`, `AT DP`) → klonlarda `?` hatası | ✅ **Düzeldi.** Artık tutarlı biçimde bitişik (`ATZ`, `ATE0`, `ATL0`, `ATH0`, `ATS0`, `ATPC`, `ATSP2`) |
| Hiçbir zaman gerçek bir ECU/PID sorgusu (`0100`) gönderilmiyordu — sadece `AT SPx`→`OK` kontrol ediliyordu | ✅ **Düzeldi.** Artık her protokol denemesinden sonra gerçek `01 00` sorgusu gönderiliyor, 10 kez tekrar deneniyor |
| Yanıtlar timeout dolmak üzereyken (yaklaşık 5 sn gecikmeyle) okunuyordu | ✅ **Büyük ölçüde düzeldi.** `01 00` yanıtları artık tutarlı biçimde ~190-250 ms içinde okunuyor — bu, event-driven okumaya geçildiğinin güçlü bir işareti |

Bu, uygulamanın artık **gerçekten aracın ECU'suyla konuşmaya çalıştığı** ve bunu makul bir hızda yaptığı anlamına geliyor. Sorun artık "uygulama araçla hiç konuşmuyor" seviyesinden, çok daha ileri bir seviyeye taşınmış: **"konuşuyor ama araç yanıt vermiyor."**

---

## 🔴 Yeni Bulgu: Her `01 00` Sorgusu `NO DATA` Dönüyor

Üç oturumda da, hangi protokol denenirse denensin (varsayılan/otomatik protokol ve ardından `ATSP2` — SAE J1850 VPW), **`01 00` sorgusunun 10 tekrarının tamamı `NO DATA` yanıtı alıyor**, ve bu yanıtlar hızlı geliyor (~200 ms) — yani bu bir timeout değil, **adaptörün bizzat verdiği bir yanıt** ("bu protokolde veri yolunu dinledim, hiçbir kontrol ünitesi cevap vermedi").

Bunun iki temel olası açıklaması var, ikisini de değerlendirmek gerekir:

### Olasılık A — Yanlış/eksik protokol kapsaması (yazılım tarafı)
Bu üç oturumda sadece **iki** protokol deneniyor: ATZ sonrası varsayılan (muhtemelen otomatik CAN 11/500) ve ardından açıkça zorlanan `ATSP2` (J1850 VPW). Önceki loglarda görülen **10 protokollük tam fallback listesi (SP6, SP7, SP8, SP9, SPA, SP5, SP4, SP3, SP1, SP2)** bu logda **hiç görünmüyor** — sadece SP2'ye geçiliyor. Bu şu anlama gelebilir:
- Fallback döngüsü kodda kısaltılmış/değişmiş olabilir (kasıtlı ya da yanlışlıkla), **veya**
- Kullanıcı (siz), döngü SP2'den sonrasına geçmeden **elle yeniden başlatmış/durdurmuş** olabilirsiniz (üç oturumun da SP2 civarında bitmesi buna işaret ediyor olabilir).

Bu netleşmeden, "araç bu protokolleri desteklemiyor" sonucuna varmak erken olur — **araç, listedeki denenmeyen 8 protokolden birinde (özellikle ISO 9141-2 veya KWP2000, eski Avrupa/Asya araçlarında yaygın) yanıt veriyor olabilir.**

### Olasılık B — Araç tarafı gerçek bir durum (donanım/kullanım kaynaklı)
`NO DATA`, OBD dünyasında çok sık karşılaşılan ve **yazılım hatası olmayan** bir yanıttır. En yaygın gerçek dünya sebepleri:
- **Kontak (ignition) açık değil** — çoğu araçta ECU, kontak "ON" konumuna alınmadan (motor çalışmasa bile) OBD sorgularına yanıt vermez.
- Motor kapalıyken bazı ECU'lar uyku moduna geçmiş olabilir.
- OBD portunun araçtaki kablo bağlantısında bir sorun (nadir ama olası).

**Öneri:** Bu testi tekrarlarken kontağın en az "ON" (motor çalışmasa da) konumda olduğundan emin olun. Eğer kontak açıkken de `NO DATA` alınmaya devam ediyorsa, o zaman Olasılık A (eksik protokol denemesi) çok daha güçlü bir aday hâline gelir.

---

## 🟡 Bu Logda Görülen Diğer Bulgular

### 1. Yanıtların 2-3 kez tekrarlanması (`OK >` art arda 2-3 kez aynı zaman damgasıyla)
Log boyunca hemen her yanıt (`OK`, `NO DATA`, `ELM327 v1.5`, `?`) **2 kez**, son oturumda ise **3 kez** aynı anda loglanıyor. Bu, tek bir fiziksel yanıtın uygulama içinde birden fazla dinleyici/abone (listener/subscription) tarafından işlendiğine işaret ediyor — klasik bir **"unsubscribe edilmeyen event listener" (listener leak)** belirtisi. Tekrar sayısının oturumdan oturuma 2'den 3'e çıkması özellikle dikkat çekici: **her yeniden bağlanma denemesinde bir önceki dinleyici temizlenmeden yeni bir tane daha ekleniyor olabilir.** Şu an işlevi bozmuyor gibi görünse de, uzun bir sürüş oturumunda (telemetri sürekli akarken) bu tür bir sızıntı zamanla performans düşüşüne veya yanlış tekrarlı UI güncellemelerine yol açabilir.

### 2. Ara sıra tekrar beliren `?` hatası — artık format değil, "adaptör kafası karışmış" durumu
Oturum B'nin başında, komutlar doğru formatta olmasına rağmen (`ATZ` bitişik) hem `ATZ` hem de ardından gönderilen `ATWS` **"?"** yanıtı alıyor:
```
16:03:08.217  ATZ    → "? >"
16:03:08.779  ATWS   → "? >" (3 saniye sonra bile hâlâ kafası karışık)
16:03:12.521  ATE0   → OK  (nihayet toparlanıyor, 3.7 sn sonra)
```
Bu, önceki oturumda `ATSP2` (J1850/K-Line, fiziksel bir "yavaş baud" hat başlatma gerektirir) denendikten hemen sonra geliyor. Muhtemel açıklama: **K-Line/J1850 denemesinden sonra adaptörün/hattın tam durulması için yeterli süre tanınmadan yeni bir `ATZ` gönderiliyor**, adaptör hâlâ önceki fiziksel bus durumunu "temizlerken" yeni komutu yanlış yorumluyor. Öneri: bir K-Line/J1850 denemesinden sonra bir sonraki `ATZ`'den önce ekstra bir bekleme (ör. 1-2 sn) eklenmesi bu deseni azaltabilir.

### 3. Oturumlar arası state çakışması (76 saniyelik boşluk + çelişen sinyal)
Oturum B ile C arasında şu ilginç dizilim var:
```
16:04:52.638  Session Ended: true
16:04:52.640  Re-subscribing telemetry queue on TELEMETRY_ACTIVE connectionState   ← 2ms sonra "aktif" sinyali
16:04:53.554  Session Ended: true (tekrar)
```
Bir saniye içinde "oturum bitti" → "telemetri aktif, tekrar abone ol" → "oturum yine bitti" sinyalleri art arda geliyor. Bu, bağlantı durum yönetiminde (muhtemelen Zustand store'daki `connectionState`) **yarış durumu** olduğuna işaret ediyor — iki farklı kod yolu, aynı anda birbirinden habersiz şekilde "bağlantı bitti" ve "bağlantı aktif" kararı veriyor.

---

## 📊 Car Scanner / Infocar Seviyesine Ulaşmak İçin Yol Haritası

Bu olgun/piyasada kanıtlanmış uygulamaların, tipik olarak sizin şu anki mimarinizde eksik olan şu katmanlara sahip olduğunu görüyoruz:

### 1. Tam protokol kapsaması + akıllı sıralama
Sadece varsayılan + tek bir zorlama (SP2) değil, **tüm 10 protokolün** (özellikle ISO 9141-2 ve KWP2000 — eski/bazı Asya-Avrupa araçlarında hâlâ yaygın) sırayla, önceki loglarda tanımlanan fallback listesiyle tam olarak denenmesi. Bu logda bu döngünün neden sadece SP2'de kaldığını (kod mu kısalttı, kullanıcı mı erken durdurdu) netleştirmek ilk adım olmalı.

### 2. "NO DATA" için akıllı kullanıcı geri bildirimi (Car Scanner/Infocar'ın yaptığı şey tam olarak bu)
Profesyonel uygulamalar, `NO DATA` art arda geldiğinde kullanıcıya sessizce 10 kez retry yapıp pes etmek yerine, **aktif olarak teşhis ipuçları** gösterir:
- `AT RV` (voltaj okuma) ile kontağın açık olup olmadığını tahmin eder (voltaj ~11-14V ise kontak muhtemelen açık; ~12.6V+ motor çalışıyor olabilir; çok düşükse adaptör takılı değil/gevşek).
- "Kontağı açın", "Motoru çalıştırın" gibi somut, aksiyona dönüştürülebilir bir mesaj gösterir — kullanıcının "bağlanamadı, cihaz bozuk" diye düşünüp pes etmesini önler (tam olarak sizin yaşadığınız senaryo).

### 3. Tekilleştirilmiş (deduplicated) olay dinleme katmanı
Bölüm "1" deki listener leak'in kapatılması — her bağlantı denemesinde önceki dinleyicinin düzgün `unsubscribe` edildiğinden emin olunması.

### 4. Sağlam durum makinesi (state machine) — tek doğruluk kaynağı
"Session Ended" ve "Telemetry Active" gibi sinyallerin aynı anda çelişmemesi için bağlantı durumunun **tek bir merkezi state machine** üzerinden yönetilmesi (ör. `DISCONNECTED → CONNECTING → SCANNING_PROTOCOL → CONNECTED → STREAMING → ERROR/RECOVERING` gibi net, birbirini dışlayan durumlar).

### 5. Protokol geçişleri arası "hat durulma" süresi
K-Line/J1850 gibi fiziksel/yavaş-baud protokollerden sonra bir sonraki reset öncesi ekstra bekleme eklenmesi — bölüm "2"deki `?` tekrarını azaltacaktır.

### 6. Son başarılı protokolün kalıcı önbelleklenmesi + oturumlar arası tutarlılık
Önceki güncelleme raporlarında bahsedilen "fast-path" önbellekleme mantığının, `NO DATA` alan bir protokolü tekrar tekrar önbelleğe yazıp yazmadığını kontrol edin — eğer öyleyse, başarısız bir protokolü "son başarılı" sayıp bir sonraki oturumda öncelikli deneyebilir, bu da gereksiz gecikmeye yol açar.

---

## Öncelik Sırası

1. **Bu testi kontak açıkken (mümkünse motor çalışırken) tekrarlayın** — en ucuz ve en hızlı doğrulama, Olasılık A/B ayrımını netleştirir.
2. Fallback döngüsünün neden sadece SP2'de kaldığını kod üzerinde doğrulayın — tam 10 protokol listesi hâlâ çalışıyor mu?
3. Listener leak'i (tekrarlayan `OK >` / `NO DATA` kayıtları) giderin.
4. `NO DATA` durumunda `AT RV` tabanlı bir kontak/voltaj kontrolü ve kullanıcıya yönlendirici mesaj ekleyin — bu, Car Scanner/Infocar seviyesi kullanıcı deneyimine en çok katkı sağlayacak tek madde.
5. Bağlantı durum makinesindeki yarış durumunu (Session Ended / Telemetry Active çakışması) giderin.

---

## Not

Bu analiz yalnızca paylaşılan log dosyasına dayanmaktadır. "Fallback listesi kısaldı mı yoksa siz mi erken durdurdunuz" sorusu log'dan kesin olarak ayırt edilemiyor — ilgili döngü kodunu paylaşırsanız bunu kesinleştirebilirim.
