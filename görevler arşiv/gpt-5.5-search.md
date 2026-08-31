# OBD2 Uygulaması İçin Wi‑Fi / Bluetooth Bağlantı ve Araç Protokolleri Raporu

**Önemli ayrım:** OBD uygulamasında “protokol” 3 farklı katmanda ele alınmalı:

1. **Telefon ↔ OBD adaptörü kablosuz taşıma protokolü:** Bluetooth Classic, BLE, Wi‑Fi TCP/UDP vb.  
2. **Adaptör komut/API katmanı:** ELM327 AT komutları, STN/OBDLink komutları, J2534/RP1210 vb.  
3. **Adaptör ↔ araç teşhis protokolü:** ISO 15765-4 CAN, ISO 9141-2, ISO 14230-4 KWP, SAE J1850, SAE J1939, UDS, DoIP vb.

Binek/hafif ticari araçlarda standart teşhis konnektörü ISO 15031-3 / SAE J1962 ailesidir; motosikletlerde ISO 19689 veya ISO 15031-3 varyantları görülür; ağır ticari tarafta SAE J1939-13 9-pin/Type I/II konnektör ve J1939 ailesi kritik hale gelir. 

---

## 1. Kablosuz bağlantı protokolleri: Telefon ↔ OBD cihazı

| Katman | Protokol / profil | Uygulamada anlamı | Stabilite notu |
|---|---|---|---|
| **Bluetooth Classic BR/EDR** | **SPP – Serial Port Profile** | ELM327 tipi klasik Bluetooth adaptörlerin büyük kısmı sanal seri port olarak çalışır. SPP, RFCOMM üzerinden emüle seri kablo bağlantısı tanımlar. | **Android’de desteklenir. iOS’ta genel Bluetooth SPP serbest değildir; MFi / External Accessory gerekir.**  |
| Bluetooth Classic | **RFCOMM** | Seri port benzeri byte stream. ELM komutları `AT...` ve OBD PID sorguları bu stream üzerinden gider. | Android tarafında `BluetoothSocket` ile uygulanır. Bağlanmadan önce keşif durdurulmalı.  |
| Bluetooth Classic | **SDP – Service Discovery Protocol** | Cihazın SPP UUID / kanal bilgisini bulmak için kullanılır. | Bazı ucuz klonlarda SDP kaydı hatalı olabilir; fallback UUID/channel stratejisi gerekir. |
| **Bluetooth Low Energy – BLE** | **GAP + GATT + ATT** | iOS/Android uyumlu modern OBD adaptörlerinde “UART-like” özel GATT servisleri kullanılır. Standart evrensel “OBD BLE servisi” yoktur; üretici UUID’leri değişir. | iOS için en sorunsuz Bluetooth yolu BLE’dir. Android de BLE central/GATT client destekler.  |
| BLE | **Notify / Indicate + Write / Write Without Response** | Cevaplar notify ile, komutlar write ile taşınır. | MTU pazarlığı, paket parçalama, write queue ve timeout zorunlu. |
| BLE | **LE Secure Connections / bonding** | Cihaz güvenliği için eşleşme/şifreleme. | Kendi donanımınız varsa açık BLE UART yerine bonding + per-device key kullanılmalı. |
| **Wi‑Fi SoftAP / Infrastructure** | **TCP socket** | Wi‑Fi ELM adaptörleri genelde kendi AP’sini açar; uygulama IP:port’a TCP ile bağlanır. | Komut/cevap için TCP tercih edilmeli; bağlantı koparsa socket tamamen kapatılıp yeniden açılmalı. |
| Wi‑Fi | **UDP discovery** | Adaptörü otomatik bulmak için broadcast/multicast veya üreticiye özel discovery. | iOS’ta local network permission; Android’de local-only Wi‑Fi yönetimi gerekir. |
| Wi‑Fi | **mDNS / Bonjour** | Adaptörü IP/port aramadan servis adıyla bulmak için. | iOS/macOS tarafında doğru yöntemlerden biridir; Bonjour standart IP protokollerine dayanır.  |
| Wi‑Fi | **Wi‑Fi Direct / P2P** | Access point olmadan cihazdan cihaza bağlantı. | OBD adaptörlerinde nadir; Android destekler, ama tüm dongle’larda beklenmemeli.  |
| Wi‑Fi | **Wi‑Fi Aware / NAN** | Yeni nesil yakın cihaz keşfi/bağlantısı. | Klasik OBD adaptörleri için standart değil; kendi donanımınız varsa ileri seviye seçenek.  |
| **IP tabanlı otomotiv teşhisi** | **DoIP – ISO 13400, TCP/UDP** | Modern araçlarda Ethernet/IP üzerinden UDS taşır; klasik ELM327 değildir. | DoIP için TCP/UDP, routing activation ve security ayrı ele alınmalı. IANA’da DoIP discovery UDP 13400 olarak kayıtlıdır; ITU kaynağı DoIP’in varsayılan TCP 13400 kullandığını belirtir.  |

---

## 2. Araç tarafı OBD / teşhis protokolleri

### 2.1 ELM327 uyumlu klasik OBD protokol listesi

ELM327’nin `AT SP h` komutunda kullanılan protokol kodları aşağıdaki gibidir. Bu liste binek, hafif ticari, bazı motosiklet ve sınırlı ağır ticari senaryolarda karşınıza çıkar. 

| ELM kodu | Araç protokolü | Hız / format | Tipik kullanım |
|---|---|---:|---|
| `0` | Automatic | Otomatik arama | Bilinmeyen araçta ilk deneme |
| `1` | **SAE J1850 PWM** | 41.6 kbaud | Eski Ford / Kuzey Amerika araçları |
| `2` | **SAE J1850 VPW** | 10.4 kbaud | Eski GM / Kuzey Amerika araçları |
| `3` | **ISO 9141-2** | 5-baud init, 10.4 kbaud | Eski Avrupa / Asya araçları, bazı motosikletler |
| `4` | **ISO 14230-4 KWP2000** | 5-baud init, 10.4 kbaud | Eski/orta dönem Avrupa-Asya araçları |
| `5` | **ISO 14230-4 KWP2000** | Fast init, 10.4 kbaud | K-line KWP hızlı başlangıç |
| `6` | **ISO 15765-4 CAN** | 11-bit ID, 500 kbit/s | Modern OBD-II / EOBD binek araçların en yaygın CAN tipi |
| `7` | **ISO 15765-4 CAN** | 29-bit ID, 500 kbit/s | Bazı ticari / farklı CAN adresleme |
| `8` | **ISO 15765-4 CAN** | 11-bit ID, 250 kbit/s | Bazı düşük hızlı CAN uygulamaları |
| `9` | **ISO 15765-4 CAN** | 29-bit ID, 250 kbit/s | Bazı ticari / bölgesel uygulamalar |
| `A` | **SAE J1939 CAN** | 29-bit ID, varsayılan 250 kbit/s | Ağır ticari / kamyon / otobüs / iş makinesi |
| `B` | USER1 CAN | Kullanıcı tanımlı | Global OBD standardı değil; adaptör özel |
| `C` | USER2 CAN | Kullanıcı tanımlı | Global OBD standardı değil; adaptör özel |

---

### 2.2 Binek ve hafif ticari araçlar

Desteklenmesi gereken ana protokoller:

1. **SAE J1850 PWM**  
2. **SAE J1850 VPW**  
3. **ISO 9141-2**  
4. **ISO 14230-4 KWP2000 – slow init**  
5. **ISO 14230-4 KWP2000 – fast init**  
6. **ISO 15765-4 CAN 11-bit / 500 kbit/s**  
7. **ISO 15765-4 CAN 29-bit / 500 kbit/s**  
8. **ISO 15765-4 CAN 11-bit / 250 kbit/s**  
9. **ISO 15765-4 CAN 29-bit / 250 kbit/s**  
10. **ISO 15765-2 ISO-TP** – CAN üzerinde çok çerçeveli mesaj taşıma  
11. **SAE J1979 / ISO 15031-5 klasik OBD servisleri** – Mode/PID yapısı  
12. **SAE J1979-2 OBDonUDS** – yeni nesil ICE araçlar için UDS tabanlı OBD  
13. **SAE J1979-3 ZEVonUDS** – elektrikli/sıfır emisyon tahrik sistemleri için UDS tabanlı yapı  
14. **ISO 14229 UDS** – üreticiye özel/enhanced teşhis için ana servis standardı  
15. **ISO 13400 DoIP** – IP/Ethernet üzerinden teşhis, özellikle yeni platformlar ve gateway mimarileri için

ISO 15031-5; ABD, Avrupa ve benzer OBD regülasyonlarını karşılamak üzere emisyon ilişkili teşhis servisleri, mesaj formatları ve timing davranışlarını tanımlar. ISO 15765-4 ise CAN tabanlı OBD/WWH-OBD haberleşmesinin kurulması, sürdürülmesi ve sonlandırılması için gereksinimleri kapsar. 

---

### 2.3 Motosikletler

Motosikletlerde “OBD2” pratikte araçlardaki 16-pin J1962 ile birebir aynı olmak zorunda değildir. ISO 19689, motosiklet ve mopedlerde teşhis konnektörü ve elektriksel gereksinimler için ortak bir yapı hedefler. AB düzenlemelerinde L-kategori araçlar için ISO 19689:2016 veya ISO 15031-3:2004 arayüzünden bahsedilir. 

Desteklenmesi gereken motosiklet protokol aileleri:

| Protokol | Not |
|---|---|
| **ISO 15765-4 CAN** | Euro 4/Euro 5 ve yeni motosikletlerde yaygınlaşan ana hat |
| **ISO 14229-3 UDSonCAN** | Yeni nesil motosiklet ECU teşhislerinde kullanılır |
| **ISO 9141-2 K-line** | Eski modeller ve bazı üretici özel bağlantıları |
| **ISO 14230-4 KWP2000 K-line** | Eski/orta dönem motosikletlerde görülebilir |
| **Üretici özel CAN/K-line protokolleri** | Honda, Yamaha, KTM, BMW, Ducati vb. için konnektör/pinout ve DID/PID farklılıkları olabilir |
| **Adaptör kabloları** | 6-pin/4-pin/üretici özel → J1962 dönüştürücü gerekebilir; ancak sadece fiziksel adaptör yetmez, protokol de desteklenmeli |

---

### 2.4 Kamyon, otobüs, ağır tonajlı ve iş makineleri

Ağır ticari için klasik binek OBD adaptörü yeterli olmayabilir. Desteklenmesi gereken protokol ailesi daha geniştir:

| Protokol / standart | Kapsam |
|---|---|
| **SAE J1939** | Ağır ticari araç ağı için üst seviye ana aile |
| **SAE J1939-13** | Off-board diagnostic connector, 9-pin ağır vasıta konnektörü |
| **SAE J1939-11 / J1939-15** | 250 kbit/s klasik CAN fiziksel katman varyantları |
| **SAE J1939-14** | 500 kbit/s fiziksel katman |
| **SAE J1939-17** | CAN FD fiziksel katman, 500 kbit/s / 2 Mbit/s |
| **SAE J1939-21** | Klasik J1939 data link |
| **SAE J1939-22** | CAN FD data link |
| **SAE J1939-71** | Vehicle application layer / PGN-SPN veri sözlüğü |
| **SAE J1939-73** | Diagnostics, DM mesajları |
| **SAE J1939-81** | Network management / address claim |
| **SAE J1708 + SAE J1587** | Eski ağır vasıta / otobüs / kamyon protokol ailesi |
| **ISO 15765-4 CAN** | Bazı ağır ticari / 16-pin kullanan araçlar |
| **SAE J1979-2 OBDonUDS** | Yeni ağır ticari OBD geçişlerinde önem kazanıyor |
| **ISO 27145 WWH-OBD** | Dünya çapında harmonize OBD gereksinimleri |
| **DoIP / ISO 13400** | Yeni nesil IP/Ethernet tabanlı teşhis mimarileri |

SAE J1939-13, J1939 teşhis konnektörlerini ve ilgili fiziksel ortamları tanımlar; J1939-14 500 kbit/s fiziksel katmanı, J1939-17 ise CAN FD 500 kbit/s / 2 Mbit/s katmanı tanımlar. J1939-73 ağır vasıta teşhis mesajları için kullanılır. 

Eski ağır ticari araçlarda **J1708/J1587** hâlâ sahada görülebilir; J1708 bidirectional serial communication link, J1587 ise ağır vasıta veri/mesaj formatlarını tanımlar. 

---

## 3. Global ölçekte stabil bağlantı için yapılması gerekenler

### 3.1 Platform stratejisi

| Platform | Mutlaka destekleyin | Dikkat |
|---|---|---|
| **Android** | Bluetooth Classic SPP, BLE GATT, Wi‑Fi TCP/UDP | Android 12+ için `BLUETOOTH_SCAN`, `BLUETOOTH_CONNECT`, gerekirse `ACCESS_FINE_LOCATION` izin akışı doğru kurulmalı.  |
| **iOS** | BLE GATT, Wi‑Fi TCP/UDP, Bonjour/mDNS | Generic Bluetooth Classic SPP iOS’ta çalışmaz; Bluetooth Classic aksesuar iletişimi için MFi / External Accessory gerekir.  |
| **Windows/macOS** | Bluetooth SPP, BLE, Wi‑Fi, J2534/RP1210 opsiyonları | Filo/ağır vasıta tarafında PC tabanlı J2534/RP1210 cihazları gerekebilir. |

**Önerilen öncelik:**

1. **Kendi donanımınız varsa:** BLE + Wi‑Fi destekli, sertifikalı, OTA güncellenebilir adaptör geliştirin.  
2. **Piyasadaki adaptörlere bağlanacaksanız:** Android’de Bluetooth SPP, BLE, Wi‑Fi; iOS’ta BLE ve Wi‑Fi odaklı çalışın.  
3. **Ağır ticari hedef varsa:** Sadece ELM327 klonlarına güvenmeyin; J1939/J1708 destekli 9-pin ağır vasıta adaptörü zorunlu ürün ailesi olarak ele alın.

---

### 3.2 Bağlantı motoru mimarisi

Uygulamada tek bir “OBD bağlantı motoru” olmalı; Bluetooth/Wi‑Fi farkı bu motorun altında soyutlanmalı.

**Önerilen mimari:**

```text
ConnectionManager
 ├─ BluetoothClassicTransport
 ├─ BleGattTransport
 ├─ WifiTcpTransport
 ├─ WifiUdpDiscovery
 ├─ Elm327CommandLayer
 ├─ StnObdlinkCommandLayer
 ├─ J1939CommandLayer
 ├─ DoipClient
 └─ ObdSessionManager
```

**State machine:**

```text
Idle
 → PermissionCheck
 → DeviceDiscovery
 → TransportConnect
 → AdapterIdentify
 → AdapterConfigure
 → VehicleProtocolDetect
 → CapabilityScan
 → LiveSession
 → Recovering
 → Disconnect
```

Bu yapı olmadan stabilite sağlanamaz; çünkü kopma nedenleri farklıdır: Bluetooth pairing hatası, BLE GATT timeout, Wi‑Fi IP yönlendirme sorunu, adaptör buffer overflow, araç kontağı kapalı, yanlış OBD protokolü veya ECU’nun cevap vermemesi ayrı ayrı sınıflandırılmalıdır.

---

### 3.3 ELM327 / AT komut yönetimi

**Bağlantıdan sonra temel init akışı:**

```text
ATZ          veya bilinen adaptörde ATWS
ATE0         echo kapat
ATL0         linefeed kapat
ATS0         space kapat
ATH0/ATH1    ihtiyaca göre header kapat/aç
ATSP0        otomatik protokol arama
0100         desteklenen PID’leri test et
ATDPN        seçilen protokol numarasını oku
```

**Kritik kurallar:**

- Aynı anda iki komut göndermeyin. ELM327 bağlantısı **tek komut / tek cevap / prompt `>`** mantığıyla yönetilmelidir.  
- `>` prompt gelmeden yeni komut yollamayın. ELM327 dokümanı `STOPPED`, `NO DATA`, `UNABLE TO CONNECT` gibi durumları açıkça ele alır ve `>` beklemenin önemini belirtir.   
- `ATSP0` otomatik arama için iyi başlangıçtır; ancak araç/VIN/protokol eşleşmesini cache’leyip sonraki bağlantıda doğrudan ilgili protokolle başlamak bağlantıyı hızlandırır.  
- `ATST` timeout değerini körlemesine düşürmeyin; K-line/J1850 araçlarda yavaş cevaplar normaldir.  
- CAN tarafında multi-frame cevaplar için ISO-TP/flow-control davranışlarını test edin.  
- Ucuz ELM327 klonlarında sürüm bilgisi sahte olabilir; `ATI`, `AT@1`, `ATDPN`, gerçek komut davranışı ve buffer kapasitesiyle adaptör profili çıkarın.

---

### 3.4 Android Bluetooth stabilitesi

Android Bluetooth Classic için:

- Bağlanmadan önce mutlaka `cancelDiscovery()` çağırın; Android dokümantasyonu discovery işleminin ağır olduğunu ve bağlantıyı yavaşlattığını belirtir.   
- SPP UUID için standart seri port UUID’sini deneyin: `00001101-0000-1000-8000-00805F9B34FB`.  
- Pair/bond durumu ayrı izlenmeli; eşleşme başarısızsa socket açmaya devam etmeyin.  
- Socket `InputStream` parser’ı parçalı cevapları desteklemeli; tek `read()` = tek cevap varsayımı yapılmamalı.  
- Kopma sonrası eski socket’i kapatıp yeni socket oluşturun; aynı socket’i tekrar kullanmaya çalışmayın.

BLE için:

- GATT operasyonlarını sıraya alın; aynı anda service discovery, MTU request, write, notification subscribe göndermeyin.  
- MTU negotiation yapın; ancak minimum MTU ile çalışacak parçalama algoritmanız olsun.  
- Android’de uygun durumda yüksek bağlantı önceliği istenebilir; Android `BluetoothGatt` API’sinde düşük gecikme için `CONNECTION_PRIORITY_HIGH` tanımlıdır.   
- GATT 133 / timeout gibi Android üretici farklarını recovery state machine ile yönetin: disconnect → close → kısa bekleme → yeniden scan/connect.

---

### 3.5 iOS stabilitesi

- iOS’ta **Bluetooth Classic SPP adaptörlerine genel erişim yoktur**; bu nedenle iOS için BLE veya Wi‑Fi adaptörleri hedeflenmelidir. MFi aksesuarı ise External Accessory framework ile çalışır.   
- BLE tarafında Core Bluetooth kullanın; servis UUID’leri ve characteristic yapıları adaptör üreticisine göre değişeceği için “BLE device profile registry” tutun.   
- Wi‑Fi adaptörlerinde iOS local network izni, `NSLocalNetworkUsageDescription`, Bonjour kullanılıyorsa `NSBonjourServices` doğru tanımlanmalı. Apple, local network ve Bonjour kullanan API’ler için bu izinleri vurgular.   
- Wi‑Fi bağlantısı internet sağlamıyorsa kullanıcıya “Bu ağda internet yok, yine de bağlı kal” benzeri yönlendirme gösterin; aksi halde iOS/Android hücresel ağa dönmeye çalışabilir.

---

### 3.6 Wi‑Fi bağlantı stabilitesi

- Wi‑Fi OBD adaptörleri için **TCP command channel** ana yol olmalı. UDP yalnızca discovery veya DoIP discovery gibi işler için kullanılmalı.  
- Android 10+ cihazlarda Wi‑Fi cihazına local-only bağlanmak için `WifiNetworkSpecifier` / `NetworkRequest` yaklaşımı kullanılmalı; bu yapı local-only bağlantıyı destekler.   
- TCP socket için:
  - connect timeout,
  - read timeout,
  - heartbeat,
  - tam kapat/aç reconnect,
  - IP/port profil listesi gereklidir.
- Adaptör discovery için:
  - mDNS/Bonjour,
  - UDP broadcast,
  - bilinen IP aralığı tarama,
  - QR ile SSID/şifre/IP/port provision seçenekleri birlikte desteklenmeli.
- Güvenlik için açık Wi‑Fi AP yerine cihaz başına benzersiz WPA2/WPA3 parolası tercih edilmeli.

---

## 4. Protokol algılama stratejisi

### 4.1 Binek / hafif ticari

Başlangıç akışı:

```text
1. Adaptöre bağlan
2. ATI / AT@1 ile adaptörü tanı
3. ATE0 ATL0 ATS0
4. ATSP0
5. 0100 gönder
6. Cevap varsa ATDPN ile protokolü oku
7. 0902 ile VIN dene
8. Desteklenen PID bloklarını tara: 0100, 0120, 0140...
9. Protokol + VIN + adaptör profili cache
```

Fallback:

```text
CAN 11/500 → CAN 29/500 → CAN 11/250 → CAN 29/250
→ ISO 9141-2
→ ISO 14230 slow
→ ISO 14230 fast
→ J1850 PWM
→ J1850 VPW
```

ELM327’de otomatik mod protokolleri arar; belirli protokol seçilirse başarısızlıkta başka protokolleri denemez. Bu yüzden otomatik + cache hibrit model kullanılmalı. 

---

### 4.2 Motosiklet

Motosiklette otomatik OBD algılama her zaman yeterli değildir.

Gerekli ek bilgiler:

- Marka / model / yıl / bölge
- Konnektör tipi: ISO 19689 6-pin, J1962 16-pin veya üretici özel
- CAN mı K-line mı?
- Kontak açık mı?
- Adaptör kablosunda doğru pin eşleşmesi var mı?

Motosiklet tarafında kullanıcıya manuel “protokol seçimi” ve “kablo tipi seçimi” ekranı koymak global başarı oranını ciddi artırır.

---

### 4.3 Ağır ticari

J1939 için sadece `ATSP A` demek yeterli değildir. Ağır ticari tarafta şunlar gerekir:

- 9-pin SAE J1939-13 fiziksel bağlantı
- 12/24V besleme uyumu
- J1939 29-bit CAN desteği
- 250 kbit/s ve 500 kbit/s destek
- Address claim / source address yönetimi
- DM1, DM2, DM5, DM11 vb. diagnostic message desteği
- SPN/FMI/OC çözümleme
- Çok paketli J1939 transport protocol desteği
- Eski araçlar için J1708/J1587 desteği

CARB dokümanında J1939 cihazının J1939-21/J1939-71 ile uyumlu olması, J1939-73 diagnostic servislerini kullanması, address claim gereksinimleri ve DM5 ile OBD uygunluğu doğrulaması gibi adımlar belirtilir. 

---

## 5. Veri toplama / polling stratejisi

Stabil bağlantı sadece “bağlandım” değil, bağlantıyı bozmadan veri çekmektir.

**Kurallar:**

1. Önce desteklenen PID’leri öğrenin: `0100`, `0120`, `0140`, `0160`...  
2. Desteklenmeyen PID’leri sürekli sorgulamayın.  
3. CAN araçta 5–10 Hz canlı veri mümkün olabilir; K-line/J1850 tarafında daha düşük hız hedefleyin.  
4. PID’leri önceliklendirin:
   - yüksek öncelik: RPM, speed, coolant temp, throttle, load  
   - orta öncelik: fuel trims, MAF/MAP, O2  
   - düşük öncelik: VIN, calibration ID, readiness, DTC  
5. ECU’dan `NO DATA`, `7F xx 78 response pending`, `BUS ERROR`, `BUFFER FULL` gelirse polling hızını düşürün.  
6. Mode 04 DTC silme, Mode 08 output control, UDS routine/control gibi aktif komutları kullanıcı onayı olmadan çalıştırmayın.

SAE J1978 / ISO 15031-4 scan tool fonksiyonları için güvenli erişim çerçevesini tanımlar ve ek fonksiyonların araca veya scan tool’a olumsuz etki etmemesi gerektiğini vurgular. 

---

## 6. Yeni nesil: UDS, OBDonUDS, ZEVonUDS, DoIP

2026 itibarıyla yalnızca klasik Mode/PID yaklaşımı uzun vadede yeterli değildir.

| Standart | Neden önemli? |
|---|---|
| **SAE J1979 klasik** | Bugünkü OBD uygulamalarının temel Mode/PID yapısı |
| **SAE J1979-2 OBDonUDS** | ICE araçlarda UDS tabanlı yeni OBD geçişi |
| **SAE J1979-3 ZEVonUDS** | Elektrikli / sıfır emisyon tahrik sistemleri için |
| **ISO 14229 UDS** | Modern ECU teşhislerinin ana servis katmanı |
| **ISO 13400 DoIP** | IP/Ethernet üzerinden hızlı teşhis |
| **ISO 27145 WWH-OBD** | Dünya çapında harmonize OBD |

CARB, ağır hizmet tarafında SAE J1979 kullanan üreticilerin **2027 engine model year** itibarıyla J1979-2’ye geçişinden ve bazı Volvo/Mack modellerinin 2024 model yılında erken geçişinden bahseder. 

UDS için ISO 14229-1:2026, teşhis testerının ECU’lardaki verileri okuma, DTC okuma/silme, rutin başlatma, aktüatör kontrolü gibi servisleri tanımlar. 

DoIP tarafında ISO 13400, IP/TCP/UDP üzerinden araç içi DoIP entity ve dış test ekipmanı arasındaki haberleşmeyi tanımlar; ancak DoIP’in kendi içinde yerleşik güvenlik mekanizması olmadığı için ek güvenlik katmanı düşünülmelidir. 

---

## 7. Donanım ve ürün gereksinimleri

Global ölçekte stabil uygulama için tek tip ucuz ELM327 klonlarına güvenmek doğru değildir.

### Minimum adaptör aileleri

| Hedef | Gerekli adaptör tipi |
|---|---|
| Binek / hafif ticari Android | Bluetooth Classic SPP + Wi‑Fi + BLE destekli ELM/STN |
| Binek / hafif ticari iOS | BLE veya Wi‑Fi; Classic BT için MFi |
| Motosiklet | BLE/Wi‑Fi adaptör + ISO 19689 / üretici özel kablo setleri |
| Ağır ticari | J1939 9-pin destekli, tercihen J1708/J1587 de destekleyen ağır vasıta adaptörü |
| Yeni nesil araçlar | UDS / DoIP destekli adaptör |
| Servis / profesyonel kullanım | J2534 veya RP1210 sınıfı arayüzler |

SAE J2534-1, standart PC ile araç arasında pass-thru interface tanımlar ve üreticiler arası reprogramming yazılım/donanım uyumluluğunu hedefler. Ağır vasıta tarafında RP1210, özellikle J1708/J1587, CAN, J1939 ve J1850 bus sistemlerine erişim için kullanılan bir API olarak öne çıkar. 

---

## 8. Test matrisi

Global uygulama seviyesinde aşağıdaki test matrisi kurulmalı:

### Araç matrisi

- ABD OBD-II benzinli / dizel
- Avrupa EOBD Euro 4/5/6
- Japon/Kore araçları
- Eski K-line araçlar
- J1850 PWM / VPW eski araçlar
- 11-bit CAN / 29-bit CAN
- 250 kbit/s / 500 kbit/s CAN
- Euro 5 motosiklet
- Üretici özel motosiklet kabloları
- J1939 250 kbit/s ağır vasıta
- J1939 500 kbit/s ağır vasıta
- J1708/J1587 eski ağır vasıta
- UDS / OBDonUDS araç
- DoIP destekli araç
- EV / ZEVonUDS araç

### Telefon matrisi

- Android farklı sürümler ve üreticiler: Samsung, Xiaomi, Oppo, Pixel, Motorola vb.
- iPhone farklı iOS sürümleri
- Düşük RAM / düşük Bluetooth performanslı cihazlar
- Wi‑Fi + hücresel veri aynı anda açık senaryolar
- Arka plan / ekran kilidi / düşük güç modu senaryoları

### Hata enjeksiyonu

- Kontak kapalı
- Motor çalışıyor / çalışmıyor
- OBD adaptör çıkar-tak
- Bluetooth kapsama dışı
- Wi‑Fi “internet yok” durumu
- Araç ECU geç cevap veriyor
- Adaptör buffer overflow
- CAN error / bus init error
- Düşük araç voltajı
- Aynı araca ikinci scan tool bağlanması

---

## 9. Loglama ve telemetri

Stabiliteyi iyileştirmek için uygulama her bağlantıda anonim teknik telemetri toplamalı:

```json
{
  "transport": "BLE | BT_CLASSIC | WIFI_TCP",
  "adapter_fingerprint": "ELM327/STN/vendor",
  "os": "Android/iOS version",
  "vehicle_protocol": "ISO15765-4 11/500",
  "connect_time_ms": 4200,
  "first_pid_time_ms": 6100,
  "disconnect_reason": "socket_timeout | no_prompt | no_data | ignition_off",
  "adapter_errors": ["NO DATA", "BUFFER FULL"],
  "rssi": -68,
  "reconnect_count": 2
}
```

**Gizlilik:** VIN, konum, sürüş verisi ve DTC kişisel/veri koruma açısından hassas kabul edilmeli; kullanıcı onayı, maskeleme ve veri minimizasyonu uygulanmalı.

---

## 10. Uygulama yol haritası

### P0 – Hemen yapılması gerekenler

1. Bluetooth Classic, BLE ve Wi‑Fi için ortak `Transport` arayüzü yazın.  
2. ELM327 line parser’ı yeniden tasarlayın: prompt bazlı, timeout’lu, parçalı cevap destekli.  
3. Android izin akışlarını düzeltin: `BLUETOOTH_SCAN`, `BLUETOOTH_CONNECT`, gerekirse location.  
4. iOS’ta Classic Bluetooth beklentisini kaldırın; BLE/Wi‑Fi cihaz seçimi sunun.  
5. `ATSP0 + 0100 + ATDPN` protokol algılama akışını uygulayın.  
6. Her komut için tek queue / mutex kullanın.  
7. Teknik telemetri ve hata sınıflandırması ekleyin.

### P1 – Stabiliteyi artıracak işler

1. VIN + adaptör + protokol cache mekanizması.  
2. BLE UUID profil veritabanı.  
3. Wi‑Fi discovery: mDNS + UDP + manuel IP.  
4. PID destek taraması ve adaptive polling.  
5. Motosiklet için marka/model/kablo/protokol seçim ekranı.  
6. ELM klon kalite skoru / blacklist / warning sistemi.  
7. J1939 için ayrı session manager.

### P2 – Global profesyonel seviye

1. J1979-2 OBDonUDS desteği.  
2. J1979-3 ZEVonUDS desteği.  
3. DoIP client modülü.  
4. J1708/J1587 desteği.  
5. J2534/RP1210 bridge desteği.  
6. Sertifikalı kendi BLE/Wi‑Fi OBD adaptörü.  
7. OTA firmware update ve adaptör health check.

---

## Sonuç

Global seviyede stabil bir OBD uygulaması için **sadece “Bluetooth bağlandı mı?” yeterli değildir**. Başarılı ürün için:

- Android’de **Bluetooth Classic SPP + BLE + Wi‑Fi** desteklenmeli.  
- iOS’ta **BLE + Wi‑Fi** ana yol olmalı; Classic Bluetooth için MFi gerekliliği unutulmamalı.  
- Binek/hafif ticari için **J1850, ISO9141, ISO14230, ISO15765-4 CAN** eksiksiz desteklenmeli.  
- Motosiklet için **ISO19689 konnektör, CAN/UDS ve K-line varyasyonları** ayrı ele alınmalı.  
- Ağır ticari için **J1939, J1708/J1587, 9-pin donanım ve J1939 diagnostic mesajları** ayrı ürün kapsamı olmalı.  
- Yeni araçlar için **UDS, OBDonUDS, ZEVonUDS ve DoIP** yol haritasına alınmalı.  
- Stabilite için en kritik teknik konu: **tek komut kuyruğu, doğru timeout, protokol cache, adaptör profil yönetimi, reconnect state machine ve saha telemetrisi**dir.