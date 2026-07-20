OBD2/ECU tabanlı bir teşhis \+ "gizli özellik açma" (coding/adaptation) uygulaması geliştiriyorsan, işin iki farklı katmanı var: **standart OBD-II (emisyon) protokolü** ve **üretici-spesifik UDS/coding katmanı**. Aşağıda ikisini de, komut setleriyle ve gerçek açık kaynak repolarla birlikte detaylandırdım.

### **1\. Katman: Standart OBD-II (SAE J1979 / ISO 15031\)**

Bu katman tüm 1996+ (ABD) / 2001+ (AB benzinli) / 2004+ (AB dizel) araçlarda zorunlu ve markadan bağımsızdır. Komutlar "Mode \+ PID" şeklindedir:

| Mode | Anlamı |
| ----- | ----- |
| 01 | Anlık veri oku (RPM, hız, sıcaklık vb. PID'ler) |
| 02 | Freeze frame (arıza anı verisi) |
| 03 | Kayıtlı DTC (arıza kodu) oku |
| 04 | DTC ve MIL (check engine) temizle |
| 05 | Oksijen sensörü test sonuçları (sadece non-CAN) |
| 06 | Sürekli izlenmeyen test sonuçları (CAN) |
| 07 | Bekleyen (pending) DTC'ler |
| 08 | Kontrol sistemine komut gönder |
| 09 | Araç bilgisi (VIN, kalibrasyon ID) |
| 0A | Kalıcı (permanent) DTC'ler |

Örnek: `01 0C` → motor devri, `09 02` → VIN. Fiziksel katman ise araca göre ISO 15765-2 (CAN, en yaygın), ISO 9141-2, ISO 14230 (KWP2000) veya SAE J1850'den biri olur — bu farkı tespit etmek programının ilk işi olmalı.

### **2\. Katman: UDS — ISO 14229 (asıl "gizli özellik açma" burada)**

Check-engine okuma dışındaki her şey (coding, adaptation, actuator test, flash) bu protokolle yapılır. Servis ID'leri (SID):

| SID | Servis | Kullanım |
| ----- | ----- | ----- |
| 0x10 | Diagnostic Session Control | Default/Extended/Programming session'a geç |
| 0x11 | ECU Reset | ECU'yu yeniden başlat |
| 0x14 | Clear Diagnostic Information | DTC temizle |
| 0x19 | Read DTC Information | DTC \+ freeze frame \+ extended data |
| 0x22 | Read Data By Identifier (RDBI) | VIN, yazılım versiyonu, canlı DID verisi |
| 0x23 | Read Memory By Address | Ham bellek okuma |
| 0x27 | Security Access | Seed-key challenge/response ile kilit açma |
| 0x28 | Communication Control | Belirli haberleşmeyi aç/kapat |
| 0x2E | Write Data By Identifier (WDBI) | **Coding/özellik açma burada** — DID'e değer yaz |
| 0x2F | Input Output Control By Identifier | Aktüatör testi (fan, röle, ışık) |
| 0x31 | Routine Control | Self-test, checksum, EOL rutinleri |
| 0x34/0x36/0x37 | Request Download / Transfer Data / Transfer Exit | Yazılım flaşlama |
| 0x29 | Authentication (2020 revizyonu) | PKI tabanlı kimlik doğrulama |

0x27 Security Access, challenge–response yöntemiyle ECU fonksiyonlarının kilidini açar; 0x2E Write Data By Identifier ise yapılandırma/coding verisi yazmak için kullanılır. 0x2E servisi kalibrasyon değerlerini yapılandırmak veya DID üzerinden özellik açıp kapatmak için kullanılır; 0x31 ise EOL testleri, aktüatör kontrolleri ve tanı prosedürlerini tetikler. **Yani "ekstra özellik açma" dediğin şey teknik olarak: doğru diagnostic session'a geç → 0x27 ile security access al → 0x2E ile ilgili DID'e (Long Coding, Byte/Bit config) yeni değeri yaz.** [Automate](https://automate.video/uds_overview_with_examples_pea47d375)[Electraytech](https://www.electraytech.com/uds-diagnostics-iso-14229-guide/)

Önemli nüans: OBD-II (SAE J1979) emisyonla ilgili düzenleyici bir standart iken, UDS tüm ECU tanı fonksiyonlarını kapsayan mühendislik protokolüdür; 2027'den itibaren ABD pazarında OBD emisyon tanıları da UDS mimarisi üzerinde çalışacak (OBDonUDS). [Electraytech](https://www.electraytech.com/uds-diagnostics-iso-14229-guide/)

Taşıma katmanı: UDS taşıma katmanından bağımsızdır — CAN üzerinde ISO-TP (ISO 15765-2), Otomotiv Ethernet üzerinde DoIP (ISO 13400), LIN (ISO 17987\) ve FlexRay (ISO 17458\) üzerinden çalışabilir; modern araçlarda yüksek bant genişliği ve paralel ECU erişimi nedeniyle Ethernet üzerinden DoIP giderek öncül taşıma yöntemi oluyor. [Electraytech](https://www.electraytech.com/uds-diagnostics-iso-14229-guide/)

### **3\. ELM327 AT Komutları (donanım katmanı)**

Eğer ELM327 tabanlı adaptör kullanacaksan önce cihazı konfigüre etmen gerekir: `ATZ` (reset), `ATE0` (echo off), `ATL0` (linefeed off), `ATSP0` (protokolü otomatik algıla), `ATDPN` (algılanan protokolü göster), `ATSH` (header/CAN ID ayarla — özellikle çok-ECU aramada fonksiyonel/fiziksel adresleme için kritik).

### **4\. Marka-özel gerçeklik (önemli uyarı)**

Standart PID'ler ve genel UDS servis ID'leri evrenseldir, ama **security access seed-key algoritmaları, DID numaraları ve coding byte haritaları her üreticide, çoğu zaman modelden modele farklıdır** ve resmi olarak yayınlanmaz — mevcut araçlar (VCDS, OBDeleven, FORScan, Autel, Launch) bu bilgiyi yıllar süren mühendislik/tersine mühendislik ve OEM lisanslarıyla topladı. VAG (VW/Audi/Seat/Skoda) grubunda "long coding" özellikleri donanım seviyesinde açıp kapatır (adaptif fren lambası, cam/sunroof uzaktan kumandası, MMI gizli menüler vb.); ancak yanlış coding modül arızasına, sistem çakışmasına yol açabilir ve kesinlikle ABS/ESC/hava yastığı gibi güvenlik-kritik modüllerde denenmemelidir. Bu yüzden "tüm marka ve modeller" için tek bir evrensel komut listesi pratikte yok — mimarini şu şekilde kurman gerekir: standart OBD2/UDS çekirdeği \+ marka bazlı eklenti (plugin) modülleri, her marka için ayrı DID/coding tablosu. [OBD Profi](https://obdprofi.com/long-coding-explained-hidden-vw-audi-features/)

### **5\. Açık Kaynak Repo Araştırması**

**Genel OBD2/UDS kütüphaneleri:**

* `brendan-w/python-OBD` — gerçek zamanlı OBD-II sensör verisi okuma, ELM327 adaptörleriyle çalışan Python modülü, Raspberry Pi'ye uygun [GitHub](https://github.com/brendan-w/python-OBD)  
* `topics/obd2` altında USB/Bluetooth/Ethernet/WiFi adaptör desteği olan modern Python 3.8+ kütüphaneleri (py-obdii, py-obd2) [GitHub](https://github.com/topics/obd2?l=python&o=desc&s=updated)  
* UDS için Python paketi: ISO 14229 iletişimi için CAN, Ethernet, LIN, FlexRay, K-Line üzerinde ortak API sağlayan ve özel transport'lara genişletilebilen bir kütüphane [GitHub](https://github.com/topics/obd2?l=python&o=desc&s=updated)  
* `slafi/ScanYourCar` — bir aracın desteklediği standart PID'leri (Mode 2-3) tespit edip anlık veri alan proje; Toyota Corolla, Hyundai Accent, Mazda 3, Kia Forte üzerinde test edilmiş  
* `corbinbs/shadetree` (ShadeTree OBD) — ELM327 arayüzlerine Python ile erişim, Raspberry Pi ile taşınabilir loglama cihazları için kullanılmış

**Rust/araç-hacking odaklı:**

* Passthru protokolünü kullanan Rust tabanlı çapraz-platform ECU tanı ve araç-hacking uygulaması (KWP2000, SocketCAN, J2534 desteği) [GitHub](https://github.com/topics/ecu)

**Marka-özel örnekler:**

* `jazdw/vag-blocks` — VW/Audi ölçüm bloklarını ELM327 üzerinden okuyan GPLv3 açık kaynak yazılım; motor/şanzıman gibi kontrol modüllerini destekler, VCDS tarzı etiket dosyaları kullanır [GitHub](https://github.com/jazdw/vag-blocks)  
* `baconwaifu/PyVCDS` — VCDS'i Python ve socketCAN ile yeniden uygulamaya çalışan, kamuya açık bilgi ve kara-kutu tersine mühendislikle geliştirilen proje [GitHub](https://github.com/baconwaifu/PyVCDS)  
* `phnahes/vw_mk60ec1_abs_decoder` — VW ABS modüllerinin (MK60EC1) long coding'ini hex'ten okunabilir hale çeviren açık kaynak web aracı [GitHub](https://github.com/phnahes/vw_mk60ec1_abs_decoder)  
* GitHub `topics/vag` ve `topics/vcds` sayfalarında VAG UDS CAN ID koleksiyonları ve coding/adaptation araçları mevcut. [GitHub](https://github.com/topics/vag)

### **6\. Önerilen mimari**

1. **Transport katmanı**: ISO-TP (ISO-15765-2) \+ CAN soketleri (SocketCAN Linux'ta ideal) — `python-can`, `udsoncan`, `can-isotp` kütüphaneleri  
2. **OBD2 çekirdek modülü**: Mode 01-0A PID sözlüğü (python-OBD'nin PID tablosunu referans al)  
3. **UDS çekirdek modülü**: `udsoncan` (Python) veya kendi SID/NRC state machine'in  
4. **Marka eklentileri**: Her marka için ayrı DID haritası \+ varsa bilinen security-access algoritması (bunlar genelde forumlarda/reposlarda kısmen belgeli — VAG için NefMoto, Ross-Tech forumları; genel değil)  
5. **Güvenlik/uyarı katmanı**: ABS/airbag/direksiyon gibi güvenlik-kritik modüllere 0x2E/0x31 yazma işlemlerinde ekstra onay adımı

### **Uyarı**

Security access (0x27) bypass'ı, orijinal olmayan ECU'lara yetkisiz yazma veya immobilizer/anahtar eşleştirme gibi alanlar hem hukuki (araç hırsızlığı ile ilişkilendirilebilir) hem de güvenlik açısından hassastır — ABS, ESC, hava yastığı gibi modüllerde hatalı coding fiziksel güvenliği tehlikeye atabilir. Kendi aracın veya müşteri izniyle çalıştığın araçlar üzerinde, üreticinin resmi servis dokümantasyonunu (varsa) esas alarak ilerlemen öneririm.

Bir sonraki adımda hangi markaya/protokole odaklanmak istersen (örn. VAG KWP1281/UDS, Ford FORScan tarzı, ya da CAN-DoIP), o markanın DID/coding tablosu için daha derin araştırma yapabilirim.

