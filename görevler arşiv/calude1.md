# ELM327 ile Hızlı, Stabil ve Evrensel Bağlantı Kurma
**Torque Pro, Car Scanner ELM OBD2, OBD Fusion gibi dünya çapındaki uygulamaların Bluetooth/BLE (iOS & Android) üzerinden ELM327 adaptörleri ve araç ECU'larıyla nasıl bağlantı kurduğu — over-engineering yapmadan, UART buffer stall'a yol açmadan, hafif bir pipeline ile**

---

## 1. Bağlantı Kurulduğunda Gönderilen Standart Init AT Komut Sırası

Neredeyse tüm ciddi implementasyonların birleştiği kanonik bir sıra var. Her komut gönderilir ve bir sonrakine geçmeden önce **`>` prompt'u beklenir** (sabit bir `sleep()` değil) — "hızlı vs yavaş bağlantı" farkının tek başına en büyük sebebi budur.

```
ATZ         // Tam reset. 1-2s'ye kadar bekle, "ELM327 v1.5" (veya v2.1/2.2/2.3) beklenir
ATE0        // Echo kapalı — zorunlu, yoksa her cevap ikilenir ve parse bozulur
ATL0        // Linefeed kapalı — BT üzerinden byte sayısını ve yanlış frame bölünmesini azaltır
ATS0        // Boşluklar kapalı — daha küçük payload, özellikle BLE'de daha hızlı parse
ATH1        // Header'lar açık — çoklu ECU cevaplarını yönlendirmek için CAN ID gerekir
ATSP0       // Protokol = Auto. Adaptörün kendi taramasını yapmasına izin ver
ATAT1       // Adaptive timing AÇIK (mod 1) — asıl hız numarası bu, aşağıda detaylı
ATDPN       // (opsiyonel) hangi protokole kilitlendiğini oku, önbelleğe al
0100        // İlk gerçek OBD sorgusu: "bu ECU hangi PID'leri destekliyor" — hem
            //   veri yolunun canlı olduğunu doğrular HEM protokol kilidini tamamlar
```

Üretim seviyesi uygulamaların tutorial kodundan farklı yaptığı iki şey:

- **Yeniden bağlanmada `ATZ`'yi atlarlar.** Tam reset ~1-2s maliyeti var. Aynı adaptör bu oturumda zaten init edilmişse, tam reset yerine hafif bir `ATWS` (warm start) gönderirler ya da sadece `ATE0`/`ATSP0`'ı tekrar yollarlar — iyi uygulamalarda "yeniden bağlan"ın neden anlık hissettirdiğinin büyük kısmı budur.
- **Sabit gecikme (fixed delay) asla kullanmazlar.** Her AT komutu gönderilir, ardından okuma döngüsü `>` sonlandırıcı byte'ını (0x3E) *timeout ile* bekler, sabit `sleep(500ms)` ile değil. Sabit sleep'ler hobi implementasyonlarındaki yavaşlığın asıl sebebidir — her zaman en kötü senaryoyu bekliyor olursunuz.

---

## 2. Eski K-Line (ISO 9141-2 / ISO 14230-4 KWP2000) ve Modern CAN-Bus (ISO 15765-4 11-bit/29-bit) Araçları, Klon Adaptörleri Kilitlemeden Verimli Yönetme

Amatör implementasyonların çoğu burada bozulur, çünkü ucuz klon ELM327 firmware'i tutarsızdır ve bazı AT komutlarını hatalı işler. İyi uygulamaların kullandığı desen:

### a) İlk bağlantıda protokolü asla manuel zorlamayın — her zaman `ATSP0` (auto) ile başlayın
Klonda `ATSP1` → `ATSP2` → ... → `ATSP9` şeklinde manuel deneme, kilitlenmeye yol açan tam da budur: ucuz klonlar (kopya/relabel edilmiş STM8/PIC firmware tabanlı) zorlanmış protokol değişimleri arasında iç UART/CAN state'ini temiz sıfırlamaz ve transaction ortasında bozuk bir geçiş, çip güç kesilene kadar donabilir. Adaptörün kendi auto-search state machine'ine bırakmak çok daha güvenlidir çünkü bu, gerçek firmware'in iç zamanlamasına göre doğrulanmıştır.

### b) Bir kez kilitlendiğinde, protokolü araç başına (VIN veya Bluetooth MAC ile) önbelleğe alın ve sonraki seferde doğrudan set edin
```
ATSP6     // örn. önbellekten: ISO 15765-4, 11-bit, 500kbps
```
Bu, tekrar bağlantılarda çok saniyelik auto-search'ü tamamen atlar — Car Scanner gibi uygulamalarda bir aracı daha önce kullandıktan sonra "anında bağlanma" hissinin asıl mekanizması budur.

### c) K-Line (ISO 9141-2 / KWP2000) için 5-baud slow-init zamanlamasına saygı gösterin
K-Line, CAN'ın hiç ihtiyaç duymadığı bir slow-init handshake gerektirir (adres byte'ı 5 baud'da gönderilir, ~2s). İyi uygulamalar genel timeout değerleri göndermez — hangi protokol ailesinin seçildiğini tespit eder (`ATDPN` bir sayı döner: 3/4 = K-Line, 6/7/8/9 = CAN) ve *okuma timeout'unu* buna göre değiştirir:
- K-Line cevapları: byte-arası boşluk için 300-500ms'e kadar tolerans (yavaş, tek ECU, seri).
- CAN cevapları: 50-100ms yeterli; birden fazla ECU anında cevap verebilir.

CAN-hızı timeout'unu K-Line aracında kullanmak klasik "no data" false negative'e yol açar; K-Line-hızı timeout'unu CAN'da kullanmak sadece zaman kaybettirir.

### d) Flow control'ü yalnızca CAN için, ve yalnızca gerçekten çok-çerçeveli (multi-frame) cevap gördüğünüzde açıkça set edin
```
ATCAF1        // CAN otomatik formatlama AÇIK — ISO-TP çerçevelemeyi çipe bırak
ATFCSM0       // Flow control modu 0 (otomatik) — ATFCSH/ATFCSD'yi elle yazmayın
              //   belirli bir ECU özel adresleme gerektirmedikçe (nadir, çoğunlukla
              //   BMW / bazı VAG modülleri)
```
Çoğu üretim uygulaması flow control'ü **otomatik** (`ATFCSM0`) bırakır ve yalnızca bilinen bir araç profilinde gerektiğinde manuel `ATFCSH`/`ATFCSD`/`ATCRA`'ya döner (bu genelde jenerik bir mantık değil, üretici başına araç veritabanında hardcode edilmiştir).

### e) Klon kilitlenmelerine karşı sert komut timeout'u + adaptör reset kaçış yolu bulundurun
Herhangi bir AT komutu ~3-5s içinde `>` döndürmezse, aynı komutu sonsuza kadar tekrar denemeyin — bir break karakteri veya kısa bir `ATZ` gönderip init sırasına yeniden girin. Asıl kilitlenme-kurtarma mekanizması budur; bu olmadan, tek bir bozuk klon cevabı tüm oturumu donduruyor.

---

## 3. Canlı PID Verisini (RPM, Hız, Voltaj) 1-2 Saniyede Akıtmaya Başlamak İçin Altın Standart Handshake

İlk veriyi 2 saniyenin altına indirmenin sırrı sihirli bir komut değil — **birbirine bağımlı olmayan adımları paralelleştirmek** ve ilk PID için kesinlikle gerekli olmayan her şeyi atlamaktır:

```
Adım 1 (0-150ms)   Taşıma katmanını aç (BLE GATT connect / BT RFCOMM connect / TCP soket)
Adım 2 (150-400ms) ATE0 → ATL0 → ATH1  (arka arkaya gönder, pipeline'la —
                    adaptör iyi buffer'lıyorsa her OK'i tek tek beklemeye gerek yok;
                    ama çoğu üretim uygulaması BLE'de her komut için OK'i BEKLER
                    çünkü BLE'nin MTU'su küçük ve klonlar burst yazımda
                    kötü davranır; WiFi/Classic'te ise throughput yüksek olduğu
                    için serbestçe pipeline'layabilirsiniz)
Adım 3 (400-900ms) ATSP0 + hemen ardından "0100" probe sorgusunu gönder
                    → adaptör sorguyu cevaplarken protokolü OTOMATIK algılar,
                      böylece tek round-trip'te hem protokol kilidi HEM ilk
                      gerçek veri elde edersiniz
Adım 4 (~1s)       0100 cevabını parse et → hangi PID'lerin (0100-0120)
                    desteklendiğini öğren
Adım 5 (1-1.5s)    Sadece dashboard'da gösterdiğiniz 3-4 PID'i ilk sorgulayın:
                    010C (RPM), 010D (Hız), ATRV (Modül voltajı)
                    — TAM PID taramasını değil. Torque gibi uygulamalar tam PID
                      keşfini arka plan thread'ine erteler; dashboard, bu üç PID
                      round-trip yaptığı anda RPM/Hız/Voltajı gösterir —
                      genelde toplam 2s'nin belirgin şekilde altında.
Adım 6 (devam)     Taşıma katmanının kaldırabildiği hızda "sıcak" 3-4 PID'i
                    döngüye al (BLE: gerçekçi ~5-10Hz; Classic/WiFi: 15-30Hz+),
                    tek bir kalıcı okuma döngüsüyle ('>' prompt byte'ına
                    kilitli) — her istek için bağlantıyı asla açıp kapatmayın.
```

**Mimari açıdan kilit nokta:** Canlı dashboard **tam araç yetenek keşfini asla beklemez.** RPM/Hız/Voltaj, 1996+ araçlarda neredeyse evrensel desteklendiği için "hero PID" olarak hemen ve spekülatif şekilde sorgulanır; bunun yanında arka planda bir görev, UI'nin geri kalanı için `0100`/`0120`/`0140` desteklenen-PID taramasını yapar. "Anında" hissinin asıl mekanizması budur — daha hızlı bir protokol değil, ilk sorgulanan şeyin daha akıllı sıralanması.

**Özellikle buffer stall'ların #1 sebebi:** önceki cevabın (sonlandırıcı `>` dahil) UART/BLE buffer'ından tamamen boşalması beklenmeden yeni bir komut gönderilmesidir. Evrensel çözüm: tek thread'li bir komut kuyruğu — aynı anda tek bir AT/PID komutu, kesinlikle sıralı, bir sonraki komut ancak sonlandırıcı byte görüldükten sonra gönderilir. `>` beklemeden birden fazla PID isteğini pipeline'lamaya çalışan uygulamalar, tam olarak klon adaptörleri kilitleyenlerdir, çünkü çoğu klon firmware'in çok küçük (64-256 byte) RX buffer'ı sessizce taşar.
