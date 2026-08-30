# OBD2 Wi‑Fi ve Bluetooth Bağlantı Raporu

Global ölçekte stabil bir OBD uygulaması için “tek protokol desteği” yeterli değildir. Mimariyi üç ayrı katmanda ele almalısınız:

1. **Telefon ↔ adaptör taşıma katmanı:** Bluetooth Classic, BLE, Wi‑Fi erişim noktası, Wi‑Fi LAN/TCP.
2. **Adaptör ↔ araç fiziksel/ağ katmanı:** K-Line, J1850, CAN, CAN-FD, ağır vasıtada J1939 vb.
3. **Tanı servis katmanı:** OBD-II Mode 01–0A, UDS, WWH-OBD, J1939 DM/PGN, üreticiye özel PID ve servisler.

MotoCortex gibi React Native tabanlı bir ürün için önerim: **BLE + Wi‑Fi TCP’yi birinci sınıf destek**, Android’de **Bluetooth Classic SPP’yi ayrı native modül olarak destek**, ağır ticari için ise ELM327 klonlarından bağımsız bir **J1939/J1708/J1587 destekli profesyonel adaptör stratejisi** kurmaktır.

## Kapsam ve gerçeklik

“OBD2” bütün araçlarda aynı kablo soketi, aynı veri noktaları ve aynı teşhis kapsamı anlamına gelmez.

- Binek ve hafif ticari araçlarda yaygın hedef, standart emisyon OBD verileridir: motor devri, hız, soğutma suyu sıcaklığı, yakıt sistemi, DTC’ler, VIN, readiness vb.
- Motosikletlerde fiziksel soket, K-Line/CAN uygulaması ve üreticiye özgü teşhis hizmetleri çok daha fazla değişkenlik gösterir. Birçok motosiklet standart 16-pin J1962 OBD soketi kullanmaz; marka/model adaptör kablosu ve üreticiye özel PID/veri tanımı gerekir.
- Kamyon, otobüs, çekici ve iş makinelerinde temel dünya geneli ekosistem çoğunlukla **SAE J1939**’dur. Bu katmanda DTC’ler `SPN + FMI + OC` yapısıyla, canlı veriler ise PGN/SPN üzerinden gelir; klasik otomobil `010C` RPM sorgusu tek başına yeterli değildir.

Standart OBD servisleri iki aileye ayrılır:

- **Legacy OBD-II:** SAE J1979 / ISO 15031-5; J1850, ISO 9141-2, ISO 14230-4 ve ISO 15765-4 gibi eski ve CAN tabanlı veri bağlantıları üzerinde çalışır.
- **OBD on UDS:** Yeni nesil elektronik mimarilerde ISO 14229-1 UDS temelli OBD hizmetleri; CAN üzerinde DoCAN ve Ethernet üzerinde DoIP ile kullanılabilir.

## Araç tarafı protokol matrisi

| Araç segmenti | Fiziksel/soket gerçekliği | Ağ ve taşıma protokolleri | Tanı uygulama katmanı | Uygulama önceliği |
|---|---|---|---|---|
| Binek araç | Genellikle 16-pin SAE J1962/DLC | ISO 15765-4 CAN, eski araçlarda ISO 9141-2, ISO 14230-4, SAE J1850 PWM/VPW | OBD-II Mode 01–0A, UDS, OBDonUDS, üretici PID’leri | Çok yüksek |
| Hafif ticari | Çoğunlukla 16-pin DLC; platforma göre farklı ağ geçitleri | CAN 11/29-bit, 250/500 kbps; K-Line eski platformlarda | OBD-II, UDS, bazı filolarda üreticiye özgü servisler | Çok yüksek |
| Motosiklet | Marka/model özel 2/3/4/6-pin veya 16-pin adaptör kablosu | K-Line, ISO 14230/KWP2000, CAN; yeni modellerde UDS over CAN | Standart OBD sınırlı olabilir; üretici PID/servisleri önemli | Yüksek, ancak model veritabanı şart |
| Kamyon/otobüs | 6-pin/9-pin Deutsch, OBD adaptörleri veya üretici soketleri | J1939 CAN, tipik 29-bit kimlik; J1708/J1587 eski filolarda | J1939-73 DM mesajları, PGN/SPN, HD-OBD, üretici tanısı | Ayrı ürün/modül olarak ele alınmalı |
| Ağır tonaj/iş makinesi/tarım | Deutsch, CPC, marka özel servis konnektörleri | J1939, J1939-22/CAN-FD bazı yeni mimariler; J1708/J1587 miras sistemler | J1939 DM/PGN/SPN, üretici teşhis katmanı | Profesyonel adaptör + lisanslı veri gerekir |
| Yeni nesil araçlar | J1962 yanında Ethernet teşhis erişimi veya gateway | DoCAN, CAN-FD, DoIP/Ethernet | UDS, OBDonUDS, OEM güvenlik erişimi | Uzun vadeli yol haritası |

### Legacy OBD-II protokolleri

| ELM327 protokol kodu | Protokol | Tipik kullanım / not |
|---|---|---|
| `0` | Otomatik protokol seçimi | İlk bağlantıda varsayılan; sonra sonucu cache’leyin |
| `1` | SAE J1850 PWM | Eski Ford ağırlıklı pazar |
| `2` | SAE J1850 VPW | Eski GM ağırlıklı pazar |
| `3` | ISO 9141-2 | K-Line; birçok eski Avrupa/Japon araç |
| `4` | ISO 14230-4 KWP2000, 5-baud init | K-Line/KWP |
| `5` | ISO 14230-4 KWP2000, fast init | K-Line/KWP |
| `6` | ISO 15765-4 CAN, 11-bit, 500 kbps | Modern binek araçlarda çok yaygın |
| `7` | ISO 15765-4 CAN, 29-bit, 500 kbps | Bazı üreticiler ve daha karmaşık ağlar |
| `8` | ISO 15765-4 CAN, 11-bit, 250 kbps | Daha sınırlı kullanım |
| `9` | ISO 15765-4 CAN, 29-bit, 250 kbps | Bazı ağlar ve ticari kullanımlar |
| `A` | SAE J1939 CAN, 29-bit, 250 kbps | Ağır ticari; yalnızca adaptör gerçekten destekliyorsa |

### CAN, CAN-FD, UDS ve DoIP

- **ISO 15765-4 / DoCAN:** OBD-II veya UDS mesajlarının CAN üzerinde taşınmasıdır.
- **ISO-TP / ISO 15765-2:** 7/8 baytı aşan teşhis mesajlarını çoklu frame halinde taşır. VIN, DTC listesi, UDS yanıtları ve uzun üretici verilerinde gerekir.
- **UDS / ISO 14229:** ECU teşhis servisleri için modern katmandır. Örnek servisler: `0x10 DiagnosticSessionControl`, `0x19 ReadDTCInformation`, `0x22 ReadDataByIdentifier`, `0x27 SecurityAccess`, `0x2E WriteDataByIdentifier`, `0x31 RoutineControl`.
- **OBDonUDS / SAE J1979-2:** Emisyon OBD işlevlerinin UDS temelli modern uygulamasıdır.
- **CAN-FD:** Daha büyük frame ve daha yüksek veri hızı sağlar; klasik ELM327 klon ekosistemi bunu yeterince kapsamaz.
- **DoIP / ISO 13400:** Teşhis iletişimini Ethernet/IP üzerinden yapar. Profesyonel OEM seviye uygulamalar için önem kazanır; Wi‑Fi ELM327 ile karıştırılmamalıdır.

### Ağır ticari: J1939 ve miras protokoller

- **SAE J1939-21:** CAN data-link; tipik olarak 29-bit extended identifier kullanır.
- **SAE J1939-71:** Araç uygulama mesajları ve canlı telemetri.
- **SAE J1939-73:** Tanı mesajları; DM1 aktif arızalar, DM2 geçmiş arızalar, lamba durumları, DTC temizleme, ECU tanımlama ve diagnostik servisler.
- **SAE J1939-74:** Ağ yönetimi/uyumluluk tarafı.
- **J1939-22:** CAN-FD tabanlı yeni nesil J1939 yönü.
- **SAE J1708 / J1587:** Özellikle eski Kuzey Amerika ticari araç filosu için miras destek gereksinimi.
- **HD-OBD / WWH-OBD:** Bölge, emisyon mevzuatı ve üreticiye göre değişen ağır vasıta tanı katmanları.

DM1, PGN `65226` (`0xFECA`) ile aktif arıza kodlarını ve ikaz lambası durumlarını taşır.

## Telefon–adaptör bağlantı protokolleri

Araç protokolü ile mobil bağlantı yöntemini birbirine karıştırmayın. Bluetooth veya Wi‑Fi, çoğunlukla uygulamanın ELM/STN/J2534-benzeri adaptöre ulaşım yoludur; aracın CAN/K-Line/J1939 hattı adaptörün diğer tarafındadır.

| Taşıma yöntemi | Tipik adaptör sınıfı | iOS uygunluğu | Android uygunluğu | Stabilite yorumu | Ürün kararı |
|---|---|---:|---:|---|---|
| Bluetooth Classic SPP/RFCOMM | Eski ELM327, birçok ucuz dongle | Kısıtlı | Çok iyi | Android’de pratik; iOS’ta genel SPP erişimi beklenmemeli | Android-only legacy kanal |
| BLE GATT | vLinker, OBDLink, modern BLE adaptörleri | Çok iyi | Çok iyi | Mobil platformlar için en doğru varsayılan | Birincil Bluetooth stratejisi |
| Wi‑Fi Access Point + TCP | ELM327 Wi‑Fi klonları, bazı profesyonel cihazlar | İyi | İyi | Yüksek throughput; internet rotası/captive network sorunları olabilir | Birincil alternatif |
| Wi‑Fi infrastructure/LAN + TCP | Kurumsal gateway, telematik cihaz | İyi | İyi | Aynı LAN, IP keşfi ve güvenlik yönetimi gerektirir | Filo/atölye için güçlü |
| Wi‑Fi Direct | Özel donanım | Android güçlü | Android güçlü | iOS eşdeğeri aynı API modeli değildir | Android’e özel opsiyon |
| USB/OTG/seri | Profesyonel VCI/J2534 türevleri | Sınırlı/özel | Güçlü | En güvenilir servis senaryolarından biri | Atölye/pro sürüm |
| MFi External Accessory | MFi sertifikalı donanım | Güçlü | Donanıma bağlı | iOS için kontrollü ve güvenilir | Premium donanım partneri |

### Bluetooth Classic

**Android için:**

- RFCOMM/SPP cihazları için güvenilir seçenektir.
- ELM327 klonlarının büyük kısmını kapsar.
- Scan ve bağlantı izinleri Android 12+ için runtime olarak yönetilmelidir.
- Android 12/API 31+ hedefinde `BLUETOOTH_SCAN` ve `BLUETOOTH_CONNECT` izinleri gerekir.

**iOS için:**

- Rastgele ELM327 SPP cihaz desteğini ürün vaadi yapmayın.
- BLE GATT adaptörleri, Wi‑Fi TCP adaptörleri veya MFi uyumlu ürünlerle ilerleyin.
- “Bluetooth OBD2 desteklenir” ifadesini mağaza metinlerinde belirsiz bırakmayın; **BLE adaptör** veya **Android Bluetooth Classic adaptör** ayrımını açık yazın.

### BLE GATT

BLE, iOS ve Android ortak paydası olduğu için global uygulamada öncelikli kanaldır. Ancak BLE OBD adaptörlerinin GATT servis/characteristic yapısı üreticiden üreticiye değişebilir:

- Nordic UART Service benzeri UART profilleri.
- Özel RX/TX characteristic çiftleri.
- Notify tabanlı yanıt kanalı.
- Write-with-response veya write-without-response farkları.
- MTU pazarlığı ve notification kaybı davranışları.

Uygulama, “BLE = tek tip seri port” varsayımıyla yazılmamalıdır. Her adaptör için bir **transport driver profile** oluşturun:

```ts
type TransportProfile = {
  id: string;
  transport: 'ble' | 'bt-classic' | 'wifi-tcp';
  serviceUUID?: string;
  writeCharacteristicUUID?: string;
  notifyCharacteristicUUID?: string;
  writeMode?: 'withResponse' | 'withoutResponse';
  mtuTarget?: number;
  commandTerminator: '\r';
  responseTerminator: '>';
  quirks: {
    requiresBonding?: boolean;
    chunkSize?: number;
    interCommandDelayMs?: number;
    reconnectDelayMs?: number;
  };
};
```

### Wi‑Fi TCP

Wi‑Fi ELM327 cihazlarının çoğu kendi access point’ini açar ve TCP socket dinler. Ancak marka/model bazlı IP/port farklılıkları görülebilir; `192.168.0.10:35000` gibi değerleri global sabit varsayım yapmayın.

Wi‑Fi bağlantısında çözmeniz gereken kritik problem şudur: telefon adaptörün Wi‑Fi ağına geçince interneti kaybedebilir. iOS ve Android, “internetsiz Wi‑Fi” ağını düşük kaliteli kabul edip hücresel veriye kaçabilir veya kullanıcıya ağdan ayrılma önerisi sunabilir.

Bu nedenle:

- Soketi adaptör ağının belirli network interface’ine bağlayın.
- Bağlantı durumunu yalnızca “Wi‑Fi bağlı” diye değil, **TCP handshake + ELM prompt** ile doğrulayın.
- İnternet erişimi yokken uygulama bulut isteklerini kuyruklayın; OBD seansını başarısız saymayın.
- SSID/BSSID, IP/port, TLS olup olmadığı ve cihaz kimliğini bağlantı profiline saklayın.
- Yerel ağ iznini açıklayan kullanıcı odaklı iOS metni ekleyin.

## Stabil bağlantı mimarisi

Stabilitenin temel kuralı şudur: **Bir adaptöre aynı anda birden fazla komut yazmayın.** ELM/STN tabanlı adaptörlerin çoğu doğal olarak request/response ve prompt (`>`) temelli seri bir durum makinesidir.

### Önerilen bağlantı durum makinesi

```text
IDLE
  → PERMISSION_CHECK
  → DISCOVERING
  → TRANSPORT_CONNECTING
  → TRANSPORT_READY
  → ADAPTER_HANDSHAKE
  → VEHICLE_PROTOCOL_NEGOTIATING
  → ECU_VALIDATING
  → READY
  → POLLING / STREAMING
  → DEGRADED
  → RECONNECT_WAIT
  → DISCONNECTED
```

Her state için şu alanları kaydedin:

- Başlangıç ve bitiş zamanı.
- Hata kodu ve normalize edilmiş hata sınıfı.
- OS/platform bilgisi.
- Transport türü.
- Adaptör modeli, firmware/versiyon yanıtı.
- Araç protokolü.
- Son başarılı komut.
- Retry sayısı ve backoff süresi.
- RSSI, bağlantı kopma nedeni ve uygulamanın foreground/background durumu.

### Güvenli ELM/STN başlatma sırası

Generic ELM327 uyumlu bir adaptörde önerilen başlangıç sırası:

```text
ATZ          // veya sorunlu klonlarda ATWS / ATD ile kontrollü reset
ATE0         // echo kapalı
ATL0         // LF kapalı
ATS0         // boşluklar kapalı
ATH1         // ilk teşhis ve debug aşamasında header açık
ATAT1        // adaptif timing
ATSP0        // otomatik protokol seçimi
0100         // ECU/protokol doğrulama ve desteklenen PID bitmap'i
ATDP         // seçilen protokolü oku ve cache'le
ATRV         // adaptör besleme voltajını kontrol et
```

Ancak bu diziyi her bağlantıda körlemesine kullanmayın:

- `ATZ` bazı kötü klonlarda uzun sürer veya bağlantıyı bozabilir.
- Araç protokolü ve adaptörün güvenilirliği biliniyorsa, önceki başarılı profile göre kısa bir “warm reconnect” akışı kullanın.
- İlk bağlantıda `ATSP0`, başarı sonrası gerçek protokolü `ATDP` ile okuyup saklamak iyi bir stratejidir.
- Aynı araç + aynı adaptör eşleşmesinde sonraki oturumda uygun ise explicit protocol seçimi ile bağlanma süresini azaltabilirsiniz.
- `0100` yanıtı yoksa bunu doğrudan “adaptör hatası” saymayın: kontak kapalı, ECU uyku modunda, yanlış soket, gateway, desteklenmeyen model veya protokol uyumsuzluğu olabilir.

### Komut kuyruğu ve parser

Uygulamanın merkezinde tek-yazarlı bir command scheduler olmalı:

- Her komut için benzersiz `requestId`, timeout, retry policy, öncelik ve parser tanımı tutun.
- Varsayılan olarak **en fazla bir aktif OBD komutu** çalıştırın.
- `>` prompt, `OK`, `NO DATA`, `STOPPED`, `UNABLE TO CONNECT`, `BUS INIT...`, `SEARCHING...`, `?`, `CAN ERROR`, `BUFFER FULL` gibi adapter metinlerini normalize edin.
- Yanıtları chunk bazlı değil, **terminator/prompt bazlı frame** olarak birleştirin.
- Echo açık gelebilecek kötü klonları parser seviyesinde tolere edin; ancak başarılı handshake sonrası `ATE0` doğrulaması yapın.
- Header açık/kapalı, boşluklu/boşluksuz yanıt, ISO-TP multi-frame ve çok ECU yanıtını parser katmanında destekleyin.
- Uzun komutlarda adaptör kapasitesi ve BLE MTU nedeniyle parçalama uygulayın; fakat araç protokolü seviyesindeki ISO-TP parçalamayı ELM’in mi yoksa sizin mi yönettiğinizi profile göre açıkça belirleyin.

Örnek veri akışı:

```text
UI polling plan
  → CommandScheduler
  → TransportDriver (BLE / RFCOMM / TCP)
  → Adapter protocol parser
  → Vehicle protocol decoder
  → Normalized telemetry store
  → UI + local persistence + cloud sync queue
```

### Polling stratejisi

En büyük hata, ekranda görünen her PID’i bağımsız ve sürekli sorgulamaktır. Bu yaklaşım düşük kaliteli ELM327 klonlarını kilitler, CAN hattını gereksiz meşgul eder ve mobil bağlantıda queue taşmasına yol açar.

| Veri grubu | Örnek | Önerilen davranış |
|---|---|---|
| Hızlı canlı veri | RPM, hız, gaz, yük, MAP | Ekran açıkken kontrollü yüksek öncelik |
| Orta sıklık | Soğutma suyu, yakıt seviyesi, voltaj | Daha seyrek sorgu |
| Yavaş/değişmez | VIN, ECU adı, desteklenen PID bitmap’leri | Oturum başında bir kez, cache |
| DTC/Freeze frame | Mode 03, 07, 0A, 02 | Kullanıcı aksiyonu veya periyodik düşük sıklık |
| Ağır ticari broadcast | J1939 DM1 veya seçili PGN’ler | Dinleme/subscribe yaklaşımı; gereksiz poll yok |
| Üreticiye özel veri | Yağ sıcaklığı, ABS, TPMS, batarya bilgisi | Açık izinli profil ve rate limit |

Pratik hedefler:

- İlk aşamada toplam sorgu döngüsünü adaptör kalitesine göre dinamik sınırlayın.
- “Fast mode”u yalnızca kaliteli adaptörlerde açın.
- `NO DATA`, timeout veya bus error arttığında otomatik olarak polling oranını düşürün.
- Uygulama background’a geçtiğinde canlı polling’i durdurun veya işletim sistemi ve kullanıcı rızasıyla sınırlı bir foreground-service stratejisi uygulayın.
- Aynı CAN isteğine birden fazla ECU cevap verebileceği için yanıt birleştirme/filtreleme yapın.

### Reconnect ve hata toleransı

Bağlantı kopması normal bir olaydır; exception değil, tasarlanmış bir durum olmalıdır.

1. **Transport kaybını algılayın:** BLE disconnect callback, RFCOMM read/write exception, TCP EOF/socket timeout.
2. **Komut kuyruğunu durdurun:** Aktif isteği “belirsiz sonuç” olarak kapatın; otomatik olarak tekrar yazmayın.
3. **Kısa gecikmeli tekrar deneyin:** Örneğin 1, 2, 4, 8, 15, 30 saniye exponential backoff + jitter.
4. **Eski bağlantıyı temizleyin:** BLE GATT nesnesi, notification subscription, socket, stream listener ve timer’lar idempotent biçimde kapatılmalı.
5. **Önce transportu geri getirin:** Ardından kısa adapter/ECU health check uygulayın.
6. **Başarılı olursa polling planını yeniden kurun:** Kaldığı komuttan körlemesine devam etmeyin.
7. **Sürekli başarısızlıkta kullanıcıya neden gösterin:** “Adaptör bağlı fakat ECU yanıt vermiyor”, “Telefon Wi‑Fi adaptör ağına bağlı değil”, “Kontak açık değil”, “Bu adaptör ağır ticari J1939’i desteklemiyor” gibi.

Bağlantı yöneticinizin tüm `connect()`, `disconnect()`, `reconnect()` ve `dispose()` çağrılarını idempotent tasarlayın. React Native tarafında ekran yeniden render edildiğinde veya navigation değiştiğinde ikinci bir scan, ikinci notification listener ya da paralel TCP socket oluşmamalıdır.

## React Native uygulama önerisi

Mevcut React Native yönünüz için transport bağımsız bir çekirdek tasarlayın. `react-native-ble-plx` yalnızca BLE katmanının implementasyonu olmalı; bütün uygulamanın bağlantı motoru olmamalıdır.

```ts
interface ObdTransport {
  kind: 'ble' | 'bluetoothClassic' | 'wifiTcp';
  connect(target: ConnectionTarget): Promise<void>;
  disconnect(reason?: string): Promise<void>;
  write(data: Uint8Array): Promise<void>;
  subscribe(onChunk: (data: Uint8Array) => void): () => void;
  getHealth(): Promise<TransportHealth>;
}

interface AdapterDriver {
  identify(): Promise<AdapterInfo>;
  initialize(profile?: VehicleConnectionProfile): Promise<InitResult>;
  send(command: ObdCommand): Promise<RawAdapterResponse>;
}

interface DiagnosticProtocol {
  detect(): Promise<DetectedProtocol>;
  readSupportedPids(): Promise<CapabilityMap>;
  readLiveData(requests: DataRequest[]): Promise<NormalizedSignal[]>;
  readDtc(): Promise<DiagnosticTroubleCode[]>;
}
```

### Önerilen modüller

- `ConnectionOrchestrator`: State machine, retry, telemetry, session lifecycle.
- `TransportRegistry`: BLE, Bluetooth Classic, Wi‑Fi TCP sürücüleri.
- `AdapterDriverRegistry`: ELM327 generic, STN, OBDLink, vendor-specific adaptör profilleri.
- `ProtocolRegistry`: Legacy OBD-II, UDS, J1939, motosiklet markaya/model bazlı profiller.
- `CommandScheduler`: Tek writer, timeout, retry, rate limit, priority.
- `FrameAssembler`: Chunk → satır → prompt → cevap dönüşümü.
- `CapabilityResolver`: Mode `0100/0120/...` bitmap, ECU/vehicle profile, feature gating.
- `VehicleProfileStore`: VIN, marka/model/yıl, bağlantı cihazı, bilinen protocol, socket/pin adaptor, başarısızlık geçmişi.
- `ConnectionTelemetry`: Anonim hata analizi ve adapter compatibility score.

### Android izinleri

Android 12/API 31+ için en az şu model gerekir:

```xml
<uses-permission
  android:name="android.permission.BLUETOOTH_SCAN"
  android:usesPermissionFlags="neverForLocation" />
<uses-permission android:name="android.permission.BLUETOOTH_CONNECT" />

<!-- Android 11 ve altı, ihtiyacınıza göre sürüm sınırıyla -->
<uses-permission
  android:name="android.permission.BLUETOOTH"
  android:maxSdkVersion="30" />
<uses-permission
  android:name="android.permission.BLUETOOTH_ADMIN"
  android:maxSdkVersion="30" />
```

Wi‑Fi Direct gerçekten kullanılıyorsa Android 13+ için ayrıca `NEARBY_WIFI_DEVICES`; Wi‑Fi durum/değişim ve socket bağlantısı için ilgili Wi‑Fi/network izinleri gerekir.

### iOS yapılandırması

iOS tarafında şunları planlayın:

- BLE için `NSBluetoothAlwaysUsageDescription`.
- Yerel Wi‑Fi/TCP cihaz bağlantısı için `NSLocalNetworkUsageDescription`.
- Bluetooth Classic ELM327 uyumluluğunu ancak MFi/External Accessory kapsamınız varsa vaat edin.
- BLE’de background destekliyorsanız `UIBackgroundModes` altında Bluetooth merkezi modunu yalnızca gerçekten gerekli olduğunda kullanın; aksi halde pil tüketimi ve App Store inceleme riski doğurur.
- Wi‑Fi adaptörüne bağlanınca internet erişiminin düşebileceğini onboarding’de net anlatın.

## Donanım ve ürün stratejisi

### ELM327 klonlarını “best effort” kabul edin

Ucuz ELM327 klonları genellikle şu sorunları üretir:

- Yanlış firmware sürüm raporu.
- Eksik veya hatalı AT komutu implementasyonu.
- Düşük buffer kapasitesi.
- Hatalı CAN multi-frame davranışı.
- J1939, uzun mesaj, filtreleme ve yüksek polling’de kilitlenme.
- BLE görünmesine rağmen notification/write karakteristiğinde üretici farklılıkları.
- Wi‑Fi TCP tarafında rastgele bağlantı kapanması.

Bu nedenle destek modeliniz üç seviye olmalı:

| Destek seviyesi | Cihaz tipi | Uygulama davranışı |
|---|---|---|
| Sertifikalı | Kendi test ettiğiniz BLE/Wi‑Fi/profesyonel adaptörler | Tam özellik, yüksek polling, gelişmiş veri |
| Uyumlu | Yaygın ELM327/STN uyumlu cihazlar | Generic OBD-II, korumalı polling, uyumluluk uyarısı |
| Deneysel | Tanınmayan klon/özel cihaz | Temel bağlantı denemesi, sınırlı özellik, ayrıntılı hata kaydı |

### Önerilen ticari ayrım

- **Consumer / Binek-Hafif Ticari:** BLE ELM uyumlu veya kaliteli Wi‑Fi TCP adaptör; Mode 01, 03, 04, 07, 09; temel canlı veri ve DTC.
- **Motorcycle Pack:** Soket adaptör kataloğu + marka/model yılı + K-Line/CAN/UDS profile veritabanı + üretici PID lisans/araştırma planı.
- **Fleet / Heavy Duty Pack:** J1939 destekli onaylı adaptör, 9-pin Deutsch kablo desteği, DM1/DM2/SPN/FMI decoder, PGN subscription, sürücü/filo raporlama.
- **Professional Workshop Pack:** UDS, CAN-FD, DoIP, güvenlik erişimi, OEM veri lisansı ve J2534/VCI entegrasyonu.

Ağır vasıta desteğini generic ELM327 seçeneğinin arkasına saklamayın. ELM referansında J1939 seçeneği olsa da gerçek cihazların bunu eksiksiz ve stabil uygulaması garanti değildir; donanım test matrisi oluşturmadan “kamyon uyumlu” etiketi kullanılmamalıdır.

## Test ve kalite planı

### Donanım matrisi

- En az 3 sertifikalı BLE adaptör.
- En az 2 Wi‑Fi TCP adaptör.
- Android Bluetooth Classic için en az 3 farklı ELM/STN cihaz.
- En az 1 düşük kaliteli klon; hata toleransınızı ölçmek için.
- En az 1 profesyonel J1939 adaptör.
- Motosiklet için K-Line ve CAN temsilcisi iki farklı marka/model bağlantısı.
- iPhone ve Android’de farklı OS sürümleri; düşük/orta/yüksek donanım sınıfı.

### Araç/protokol matrisi

- ISO 15765-4 11-bit/500 kbps.
- ISO 15765-4 29-bit/500 kbps.
- ISO 15765-4 11-bit/250 kbps.
- ISO 15765-4 29-bit/250 kbps.
- ISO 9141-2.
- ISO 14230-4 fast-init ve 5-baud-init.
- SAE J1850 PWM ve VPW erişebiliyorsanız legacy doğrulama.
- J1939 29-bit/250 kbps.
- UDS/CAN, gerekiyorsa DoIP ve CAN-FD roadmap doğrulaması.

### Kaos ve dayanıklılık testleri

- Kontak kapat/aç.
- Motor çalışırken voltaj düşümü.
- Telefon ekran kilidi/açma.
- Uygulama foreground/background geçişi.
- Bluetooth kapat/aç.
- Wi‑Fi adaptör ağına bağlanıp hücresel internetin devreye girmesi.
- TCP soketinin adaptör tarafından kapatılması.
- BLE notification kaybı.
- Aynı anda iki connect isteği.
- Uygulamanın force-stop sonrası yeniden açılması.
- 30 dakika, 2 saat ve 8 saatlik uzun polling oturumları.
- Yüksek PID yükünde buffer overflow ve response ordering testi.
- İzin reddi, Bluetooth kapalı, konum/nearby devices kısıtları ve adaptör eşleşme sorunları.

Başarı metrikleri:

- İlk bağlantı başarı oranı.
- Ortalama “scan → READY” süresi.
- 5/30/60 dakika oturum kopma oranı.
- Otomatik reconnect başarı oranı.
- Komut timeout yüzdesi.
- Protokole göre `NO DATA` oranı.
- Adaptör markası/modeline göre hata dağılımı.
- iOS/Android ve OS sürümüne göre başarısızlık oranı.
- Araç protokolüne göre veri kapsama oranı.

## Uygulanabilir yol haritası

### Faz 1 — Sağlam consumer çekirdeği

- BLE GATT, Wi‑Fi TCP ve Android Bluetooth Classic transportları.
- ELM/STN generic init ve sağlam parser.
- ISO 15765-4, ISO 9141-2, ISO 14230-4, J1850 için generic OBD-II.
- Mode 01, 03, 04, 07, 09; desteklenen PID bitmap’leri.
- Command queue, reconnect state machine, adapter compatibility telemetry.
- Sertifikalı adaptör listesi ve kullanıcıya açık uyumluluk ekranı.

### Faz 2 — Motosiklet derinliği

- Motosiklet soket adaptör kataloğu.
- Marka/model/yıl bazlı connection profile.
- K-Line fast-init/5-baud-init edge-case testleri.
- CAN/UDS motosiklet profilleri.
- Üretici özel PID, DTC ve servis verileri için ayrı decoder katmanı.

### Faz 3 — Hafif ticari ve gelişmiş UDS

- UDS servis altyapısı.
- ISO-TP multi-frame ve birden çok ECU yanıtı.
- Gateway, session control ve güvenlik kısıtlarının kullanıcıya açık modellemesi.
- OEM özel veriler için yalnızca yetkili/izinli veri kaynakları.

### Faz 4 — Ağır ticari

- Sertifikalı J1939 adapter partneri.
- DM1, DM2, DM3, DM11 gibi temel servisler için güvenli decoder.
- SPN/FMI/OC veri modeli.
- PGN canlı veri katmanı.
- 6-pin/9-pin Deutsch kablo ve araç profili yönetimi.
- J1708/J1587 için pazar talebine göre ayrı native/pro adaptör planı.

## Net kararlar

Uygulamanız için en doğru teknik politika şu olur:

- **iOS + Android ortak varsayılanı:** BLE GATT destekli, test edilmiş adaptörler.
- **Wi‑Fi alternatifi:** TCP socket üzerinden ELM/STN uyumlu adaptörler; internet kaybı senaryosu yönetilmeli.
- **Android legacy desteği:** Bluetooth Classic RFCOMM/SPP; iOS’a aynı vaadi vermeyin.
- **Binek/hafif ticari minimum:** ISO 15765-4, ISO 9141-2, ISO 14230-4, SAE J1850 + standard OBD-II Mode 01–0A.
- **Motosiklet:** “OBD2 var” kabulü yerine model/soket/protokol veritabanı.
- **Ağır ticari:** J1939-73/PGN/SPN/FMI/DM mimarisi + profesyonel test edilmiş adaptör. Generic ELM klonu yeterli ürün temeli değildir.
- **Stabilite çekirdeği:** Tek komut kuyruğu, prompt-temelli parser, adaptive polling, state machine, idempotent cleanup, exponential reconnect ve ayrıntılı bağlantı telemetrisi.
- **Ürün iletişimi:** “Tüm OBD2 cihazları desteklenir” demeyin; test edilmiş adaptörleri, araç segmentlerini, iOS/Android farklarını ve advanced diagnostics sınırlamalarını açıkça listeleyin.
