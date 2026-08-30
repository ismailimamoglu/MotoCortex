# OBD/araç haberleşme uyumluluk raporu  
**Kapsam:** binek otomobil, hafif ticari, motosiklet, kamyon, otobüs ve ağır hizmet araçları; Android/iOS üzerinde Bluetooth ve Wi‑Fi bağlantısı.  
**Tarih:** Ağustos 2026.

## 1. Temel ayrım: kablosuz bağlantı ile araç protokolü aynı şey değildir

Uygulamanız iki ayrı katmanı desteklemelidir:

1. **Telefon ↔ OBD adaptörü:** Bluetooth Classic, BLE veya Wi‑Fi.
2. **OBD adaptörü ↔ araç:** CAN, K-Line, J1850, J1939, DoIP gibi araç protokolleri.

Örneğin adaptör telefona BLE ile bağlanırken araçla ISO 15765-4 CAN üzerinden konuşabilir. ELM327 tipi cihazlar esasen araç protokolleri ile seri haberleşme arasında köprü görevi görür; gerçek ELM327 dokümanı otomatik protokol arama, AT komutları ve J1939 desteği tanımlar.

---

# 2. Telefon–OBD adaptörü kablosuz protokolleri

## 2.1 Bluetooth Classic — BR/EDR

### Desteklenmesi gereken profil

- **Bluetooth SPP – Serial Port Profile**
- Alt taşıma protokolü: **RFCOMM**
- Uygulama modeli: çift yönlü seri byte akışı
- Yaygın cihazlar: klasik ELM327, STN11xx ve benzeri seri adaptörler

Android, RFCOMM/SPP bağlantısını `BluetoothSocket` üzerinden destekler; bağlantı kurulduktan sonra giriş ve çıkış stream’leri açılır.

### Platform durumu

| Platform | Durum |
|---|---|
| Android | Doğrudan SPP/RFCOMM desteği var |
| iOS/iPadOS | Genel amaçlı üçüncü taraf SPP erişimi yok |
| iOS MFi aksesuarı | External Accessory üzerinden mümkün |
| Windows/macOS | Adaptör ve sürücüye bağlı |

iOS’ta klasik Bluetooth SPP kullanan bir cihazla genel uygulama API’si üzerinden haberleşmek mümkün değildir; SPP benzeri klasik Bluetooth erişimi için aksesuarın uygun aksesuar programı kapsamında olması ve External Accessory kullanması gerekir. BLE cihazları ise External Accessory yerine Core Bluetooth kullanır ve aynı koşula tabi değildir.

### Sonuç

**Bluetooth Classic’i Android için destekleyin; fakat global iOS uyumluluğunun temeli olarak seçmeyin.**

---

## 2.2 Bluetooth Low Energy — BLE

### Kullanılan protokoller

- **BLE GAP:** tarama, advertising, bağlanma ve cihaz kimliği
- **GATT:** servis ve characteristic keşfi
- **Write / Write Without Response:** adaptöre komut gönderme
- **Notify / Indicate:** adaptörden cevap alma
- İsteğe bağlı:
  - Device Information Service
  - Battery Service
  - Özel firmware-update servisi
  - BLE L2CAP Connection-Oriented Channel

BLE OBD adaptörleri için evrensel bir OBD GATT servisi bulunmaz; çoğu üretici bir yazma characteristic’i ve bir notify characteristic’i veya her iki yön için tek characteristic kullanır. Bu nedenle UUID’ler adaptör üreticisine göre değişir ve servis/characteristic keşfi yapılmalıdır.

### Platform durumu

- Android: BLE GATT istemcisi
- iOS/iPadOS: Core Bluetooth
- Windows/macOS: platform BLE API’leri

Core Bluetooth, uygulamaların BLE çevre birimlerini keşfetmesini, servis ve characteristic’lerini incelemesini ve bunlarla iletişim kurmasını sağlar.

### Uygulama desteği

Aşağıdaki BLE yöntemlerini ayrı sürücüler olarak ele alın:

1. Bilinen üretici UUID eşleştirmeleri
2. Tek characteristic üzerinden read/write/notify
3. Ayrı TX ve RX characteristic’leri
4. Write With Response
5. Write Without Response
6. Notification
7. Indication
8. MTU’ya göre parçalama ve birleştirme
9. GATT yeniden keşfi
10. Bonded ve bond’suz bağlantılar
11. BLE L2CAP CoC — yalnızca cihaz dokümantasyonu açıkça destekliyorsa

Android ayrıca BLE L2CAP Connection-Oriented Channel’ı destekler; bu kanal akış tabanlıdır ve kredi tabanlı akış kontrolü kullanır.

### Sonuç

**Yeni donanım seçiminde iOS ve Android için birincil yöntem BLE olmalıdır.** Ancak “her BLE ELM327 cihazıyla çalışır” yaklaşımı doğru değildir; doğrulanmış UUID profilleri ve adaptör uyumluluk veritabanı gerekir.

---

## 2.3 Wi‑Fi

### Desteklenmesi gereken ağ çalışma biçimleri

1. **SoftAP / Access Point:** OBD adaptörü kendi Wi‑Fi ağını açar.
2. **Station / Infrastructure:** adaptör ve telefon aynı router’a bağlanır.
3. **Wi‑Fi Direct / P2P:** özellikle Android veya özel donanım senaryoları.
4. **AP + Station eşzamanlı çalışma:** adaptör donanımı destekliyorsa.
5. **IPv4 statik adres veya DHCP**
6. **mDNS/DNS-SD cihaz keşfi**
7. Üretici destekliyorsa IPv6

Android Wi‑Fi Direct, cihazların bir hotspot veya mevcut ağ olmadan doğrudan bağlantı kurmasına izin verir ve WPA2 desteği sağlar.

### Taşıma ve uygulama protokolleri

- **Raw TCP socket:** en yaygın ELM seri köprü yöntemi
- **UDP unicast**
- **UDP broadcast/multicast:** cihaz keşfi veya bazı eski adaptörler
- **mDNS/Bonjour – DNS-SD**
- **HTTP/HTTPS REST:** üreticiye özel
- **WebSocket/WSS:** üreticiye özel
- **TLS üzerinden özel binary protokol**
- **DoIP – Diagnostics over IP:** uyumlu VCI veya araç ağ geçidi varsa
- Üreticiye özel TCP/UDP port ve framing protokolleri

Yaygın Wi‑Fi ELM327 cihazları, kendi erişim noktasını açan ve ELM seri akışını ham TCP socket üzerinden taşıyan TCP–UART köprüleri gibi davranır; framing çoğunlukla ELM’nin `>` prompt’u ile belirlenir.

### Cihaz keşfi

- Bilinen üretici IP/port listesi
- Varsayılan gateway adresi
- DHCP gateway
- mDNS/DNS-SD
- UDP discovery
- QR kod ile SSID/IP/port aktarımı
- Kullanıcı tarafından manuel IP/port girişi

Bonjour/mDNS, TCP/IP servislerinin yerel ağda altyapı gerektirmeden keşfedilmesini sağlar. Android tarafında eşdeğer servis keşfi `NsdManager`/NSD ile yapılabilir.

### iOS gereksinimleri

Yerel TCP/UDP veya Bonjour bağlantıları için `NSLocalNetworkUsageDescription` ve kullanılan Bonjour servis tipleri için `NSBonjourServices` tanımlanmalıdır; iOS’ta yerel ağa ilk erişimde kullanıcı izni istenir. Çıkış TCP bağlantıları, UDP unicast/multicast/broadcast ve Bonjour işlemleri yerel ağ iznine tabidir.

### Android gereksinimleri

Standart ağ işlemleri için en az `INTERNET` ve bağlantı durumu gerekiyorsa `ACCESS_NETWORK_STATE` kullanılmalıdır. Wi‑Fi Direct kullanılıyorsa Android 13 ve üzeri için `NEARBY_WIFI_DEVICES`; eski sürümlerde ilgili Wi‑Fi ve konum izinleri gerekir. Android 16’da yerel ağ koruması isteğe bağlı hazırlık aşamasındadır; gelecekte yerel TCP/UDP ve mDNS erişiminin ayrı çalışma zamanı iznine bağlanmasına göre mimari hazırlanmalıdır.

### Sonuç

Wi‑Fi yüksek aktarım kapasitesi sağlar; fakat SoftAP kullanan cihazlarda telefonun internet bağlantısı, ağ seçimi ve mobil veri yönlendirmesi sorun olabilir. Uygulama ilgili Wi‑Fi ağına ait socket’i açıkça o ağa bağlamalı ve işletim sisteminin interneti olmadığı için ağı terk etmesini kullanıcıya doğru biçimde açıklamalıdır.

---

# 3. Binek otomobil ve hafif ticari araç protokolleri

Regülasyon kapsamındaki OBD-II/EOBD tarafında beş temel protokol ailesi bulunur.

| Protokol | Fiziksel yapı | Tipik hız/özellik |
|---|---|---|
| SAE J1850 PWM | Pin 2/10 | 41.6 kbit/s |
| SAE J1850 VPW | Pin 2 | 10.4 kbit/s |
| ISO 9141-2 | K-Line, opsiyonel L-Line | Yaklaşık 10.4 kbit/s |
| ISO 14230-4 KWP2000 | K-Line | 5-baud veya fast-init |
| ISO 15765-4 CAN | CAN-H/CAN-L, pin 6/14 | 250 veya 500 kbit/s |

### ISO 15765-4 varyantları

1. CAN 11-bit ID, 500 kbit/s  
2. CAN 29-bit ID, 500 kbit/s  
3. CAN 11-bit ID, 250 kbit/s  
4. CAN 29-bit ID, 250 kbit/s  

Bunlar ayrı üst seviye protokoller değil, ISO 15765-4’ün kimlik uzunluğu ve hız varyantlarıdır.

### Uygulama katmanları

- **SAE J1979 / ISO 15031-5:** standart OBD servisleri, PIDs ve emissions verileri
- **SAE J2012 / ISO 15031-6:** standart DTC tanımları
- **ISO 14229 UDS:** gelişmiş ECU diagnostikleri
- **UDS on CAN / DoCAN**
- **ISO-TP – ISO 15765-2:** çok çerçeveli CAN taşıması
- **ISO 13400 DoIP:** Ethernet/IP üzerinden diagnostik
- Üreticiye özel CAN ID, UDS DID, rutin ve güvenlik erişimleri

ISO 15765 ailesi, regülasyon OBD haberleşmesi yanında UDS on CAN kullanımını da kapsar; ISO 15765-4 emisyonla ilgili sistemler için harici test cihazının bağlantı kurma, sürdürme ve sonlandırma şartlarını tanımlar.

### Önemli kapsam sınırı

Standart OBD desteği; motor/emisyon DTC’leri, readiness, freeze frame ve standart PID’leri kapsar. ABS, airbag, gövde kontrolü, immobilizer, servis sıfırlama, kodlama ve programlama için OEM’e özgü UDS/KWP oturumları, adresler, DID’ler ve güvenlik erişimleri gerekir. “Tüm araçlarla bağlanma” ile “tüm ECU’larda gelişmiş teşhis” ayrı ürün kapsamları olarak yönetilmelidir.

---

# 4. Motosiklet ve moped protokolleri

## Standart bağlantılar

- **ISO 19689:2016:** motosiklet ve moped diagnostik konnektörü
- **ISO 15765-4 CAN**
- **ISO 9141-2 K-Line**
- **ISO 14230-4 KWP2000**
- Standart OBD servisleri
- Üreticiye özel K-Line/CAN/UDS protokolleri

ISO 19689, motosiklet ve mopedlerde ortak, kilitli ve sızdırmaz diagnostik konnektörü için minimum şartları tanımlar ve tüm motosiklet/moped türlerine uygulanabilir. Euro 5 motosikletlerde kullanılan 6 pin bağlantı CAN-H, CAN-L, K-Line, besleme ve toprak hatlarını taşıyabilir; uygulamadaki OBD haberleşmesi CAN veya K-Line üzerinden gerçekleşebilir.

## Desteklenmesi gereken fiziksel adaptörler

- ISO 19689 6-pin → J1962 16-pin
- Marka/model bazlı 3-pin K-Line
- 4-pin CAN/K-Line
- 6-pin üretici bağlantıları
- Üreticiye özel konnektörler

**Sadece protokol desteği yeterli değildir:** motosikletlerde doğru pin dizilimi, 12 V besleme, CAN/K-Line yönlendirmesi ve uyumlu dönüştürücü kablo gerekir. Uygulamada marka–model–yıl–konnektör–protokol eşleştirme veritabanı tutulmalıdır.

---

# 5. Kamyon, otobüs ve ağır hizmet protokolleri

## 5.1 SAE J1939

Destek kapsamı:

- SAE J1939 CAN
- 29-bit extended CAN ID
- 250 kbit/s
- 500 kbit/s
- PGN/SPN çözümleme
- Request PGN
- Address Claim
- Transport Protocol BAM
- RTS/CTS
- DM1 aktif DTC
- DM2 geçmiş DTC
- Diğer J1939-73 diagnostik mesajları
- FMS/J1939 filo verileri

J1939, ticari araçlarda ECU’lar arası iletişim ve diagnostik için kullanılır ve ISO 11898 fiziksel katmanına dayanır. J1939 verileri 29-bit kimlik içine yerleştirilen PGN’ler ve bu mesajlardaki SPN’lerle tanımlanır. J1939 Type II diagnostik bağlantısı 250 ve 500 kbit/s hızları destekler.

## 5.2 Ağır hizmet diagnostik aileleri

- **SAE J1939-73:** HD-OBD diagnostik uygulama katmanı
- **SAE J1708:** eski fiziksel/veri bağlantı katmanı
- **SAE J1587:** eski ağır araç mesaj ve diagnostik katmanı
- **WWH-OBD – ISO 27145**
- **UDS – ISO 14229**
- **DoCAN – ISO 15765**
- **DoIP – ISO 13400**
- **ISO 11992:** çekici–römork haberleşmesi
- Üreticiye özel CAN/J1939 PGN’leri
- Off-highway için üreticiye özel CAN ve bazı ISO 11783/ISOBUS uygulamaları

Ağır hizmet OBD alanında HD-OBD/J1939-73, SAE-OBD/J1979 ve WWH-OBD/ISO 27145 birlikte bulunabilir. WWH-OBD, DoCAN/ISO 15765-4 ve DoIP/ISO 13400 veri bağlantılarını temel alır.

## 5.3 Konnektörler

- SAE J1939-13 Type I siyah 9-pin
- SAE J1939-13 Type II yeşil 9-pin
- SAE J1962 16-pin
- Eski 6-pin ağır araç bağlantıları
- OEM/off-highway özel bağlantılar

SAE J1939-13, aracın J1939 haberleşme hatlarına harici cihaz bağlantısı için diagnostik konnektörleri tanımlar.

## Kritik donanım şartı

Ağır araç adaptörünün:

- 12 V ve 24 V sistemlere uygun olması,
- ters polarite ve transient koruması,
- J1939 250/500 kbit/s,
- gerekiyorsa J1708/J1587,
- doğru Type I/Type II pin yapısı

desteklemesi gerekir. Bir adaptörün yalnızca “ELM327 uyumlu” olması 24 V ağır araçta güvenli veya tam uyumlu olduğu anlamına gelmez; örneğin piyasadaki adaptörlerde 24 V uyumlu çalışma ile yalnızca 24 V’a dayanıp kapanma ayrı özellikler olarak belirtilmektedir.

---

# 6. Önerilen yazılım mimarisi

## Katman 1 — Transport abstraction

Ortak arabirim:

```text
Transport
 ├─ BluetoothClassicRfcommTransport
 ├─ BleGattTransport
 ├─ WifiTcpTransport
 ├─ WifiUdpTransport
 ├─ DoIpTransport
 └─ UsbTransport (gelecek/servis kullanımı)
```

Her transport şu işlevleri sunmalı:

```text
scan()
connect()
disconnect()
write(bytes)
onBytesReceived()
getState()
getSignalQuality()
cancel()
```

## Katman 2 — Adaptör sürücüsü

```text
AdapterDriver
 ├─ Elm327Driver
 ├─ StnDriver
 ├─ RawCanVciDriver
 ├─ J2534GatewayDriver
 ├─ Rp1210GatewayDriver
 └─ VendorSpecificDriver
```

ELM327 ve STN komutlarını aynı kabul etmeyin. Önce `ATI`, açıklama/kimlik komutları ve desteklenen AT/ST komutlarıyla capability probing yapın; OBDLink/STN cihazları ELM uyumlu AT komutlarının yanında ek ST komut aileleri sağlar., 

## Katman 3 — Araç protokolü

```text
VehicleProtocol
 ├─ ObdJ1979
 ├─ Iso9141
 ├─ Kwp2000
 ├─ IsoTpCan
 ├─ Uds
 ├─ J1939
 ├─ J1708J1587
 ├─ WwhObd
 └─ DoIp
```

## Katman 4 — Veri modeli

Tüm kaynakları ortak modele dönüştürün:

- ECU
- PID/DID/SPN
- DTC
- Freeze frame
- Readiness monitor
- Ölçüm değeri, birim, ölçek
- Kaynak protokol
- Timestamp
- Ham frame
- Veri kalitesi/validity

---

# 7. Stabil bağlantı için zorunlu uygulama kuralları

## 7.1 Deterministik bağlantı durum makinesi

```text
IDLE
→ PERMISSION_CHECK
→ SCANNING/DISCOVERY
→ TRANSPORT_CONNECTING
→ TRANSPORT_CONNECTED
→ ADAPTER_IDENTIFICATION
→ ADAPTER_INITIALIZATION
→ VEHICLE_PROTOCOL_DETECTION
→ ECU_DISCOVERY
→ READY
→ RECOVERING
→ DISCONNECTED
```

UI doğrudan socket veya GATT çağrısı yapmamalıdır. Tüm işlemler bu durum makinesi üzerinden yürütülmeli, her geçiş ölçümlenebilir hata kodu üretmelidir.

## 7.2 Tek komut kuyruğu

ELM tipi cihazlarda aynı anda birden fazla komut göndermeyin:

1. Komutu gönderin.
2. Echo’yu ayıklayın.
3. Satırları toplayın.
4. `>` prompt’unu veya belirlenen binary frame sonunu bekleyin.
5. Cevabı parse edin.
6. Sonraki komuta geçin.

BLE packet sınırı, TCP packet sınırı veya notification sayısı bir ELM cevabının sınırı değildir. Parser gelen byte’ları kalıcı ring buffer’da birleştirmelidir.

## 7.3 Adaptör başlangıç profili

Uyumluluğu doğrulandıktan sonra tipik başlangıç:

```text
ATZ veya ATWS
ATE0
ATL0
ATS0
ATH0/ATH1
ATSP0
ATAT1 veya ATAT2
```

ELM komut setinde echo, satır sonu, boşluk, header, otomatik protokol, timeout ve adaptive timing ayrı komutlarla yönetilir. Sabit komut dizisini körlemesine göndermek yerine, cihaz cevabına göre desteklenmeyen komutlar atlanmalıdır.

## 7.4 Timeout sınıfları

Tek bir global timeout kullanmayın:

- Bluetooth/Wi‑Fi bağlantı timeout’u
- GATT servis keşif timeout’u
- Adaptör prompt timeout’u
- OBD protokol arama timeout’u
- K-Line initialization timeout’u
- CAN tek frame timeout’u
- ISO-TP multi-frame timeout’u
- UDS P2/P2* timeout’u
- J1939 transport timeout’u
- DoIP routing activation timeout’u

Adaptif timeout kullanımı ELM327’nin `AT AT` ve `AT ST` mekanizmalarıyla da desteklenir.

## 7.5 Yeniden bağlanma politikası

- Bağlantı kesilince aktif komutu iptal edin.
- Parser buffer’ını temizleyin.
- 1, 2, 4, 8, 15 saniyelik sınırlı exponential backoff uygulayın.
- Sonsuz arka plan reconnect yapmayın.
- BLE için önce aynı peripheral identifier’ı deneyin.
- Wi‑Fi için önce aynı host/port, sonra gateway, mDNS ve discovery çalıştırın.
- Reconnect sonrasında adaptör ve araç oturumunu yeniden başlatın.
- Eski socket/GATT callback’lerini yeni oturuma taşımayın.
- Her bağlantıya monoton artan `sessionId` verin.

## 7.6 BLE özel kuralları

- GATT keşfi tamamlanmadan veri göndermeyin.
- Notification/indication aboneliği doğrulanmadan initialization başlatmayın.
- Negotiated MTU’ya göre parçalayın.
- Write Without Response kullanırken işletim sisteminin gönderim kapasitesine göre pacing uygulayın.
- Notification kaybını uygulama seviyesinde timeout ile tespit edin.
- UUID eşleştirmelerini uzaktan güncellenebilir uyumluluk kataloğunda tutun.
- Aynı isimde farklı sahte/klon cihazlar olabileceği için yalnızca advertised name’e güvenmeyin.

Android 12 ve üzeri hedeflerinde tarama için `BLUETOOTH_SCAN`, bağlı cihazla iletişim için `BLUETOOTH_CONNECT` çalışma zamanı izinleri gerekir.

## 7.7 Wi‑Fi özel kuralları

- Socket’i OBD adaptörünün bulunduğu ağa bind edin.
- TCP keepalive yanında uygulama seviyesinde düşük frekanslı sağlık kontrolü kullanın.
- `read()` çağrısının tek bir tam cevap döndüreceğini varsaymayın.
- IP/port değerlerini üretici profili olarak saklayın.
- Broadcast discovery başarısızsa gateway ve manuel giriş fallback’i sağlayın.
- Kullanıcıya “bu Wi‑Fi ağında internet yok” durumunu açıklayın.
- Uygulamayı arka plana alma/geri getirme senaryosunda socket’i doğrulayın.
- Wi‑Fi değişikliği callback’lerini dinleyin ve eski ağa ait socket’i kapatın.

## 7.8 Sorgu planlama

- Sabit 10–50 ms döngüyle bütün PID’leri sorgulamayın.
- Hızlı veriler: RPM, hız, gaz konumu.
- Orta hız: sıcaklık, basınç, fuel trim.
- Yavaş veriler: yakıt seviyesi, readiness ve DTC.
- Araç cevabına göre dinamik polling frekansı belirleyin.
- Birden fazla ECU cevap veriyorsa ECU adresini koruyun.
- Desteklenen PID bitmap’lerini önce okuyup desteklenmeyen PID’leri sorgulamayın.
- Uygulama arka plana geçtiğinde sorgulamayı durdurun veya ciddi biçimde azaltın.

---

# 8. Güvenlik ve araç güvenliği

1. Varsayılan PIN kullanan klasik Bluetooth cihazlarını güvenilir kimlik doğrulama olarak kabul etmeyin.
2. Wi‑Fi adaptörlerde açık ağ yerine en az WPA2 ve tercihen cihaz başına benzersiz parola kullanın; açık kablosuz ağlarda mDNS katılımcıları güvenilir kabul edilmemelidir.
3. Bulut veya internet üzerinden diagnostik aktarımında TLS ve sertifika doğrulaması kullanın; Android güvenli ağ iletişimi için SSL/TLS ve ağ güvenlik yapılandırmasını önerir.
4. DTC silme, actuator testi, ECU reset, UDS SecurityAccess, kodlama ve programlama işlemlerini açık kullanıcı onayı olmadan çalıştırmayın.
5. Sürüş sırasında yazma/actuator/programlama özelliklerini kilitleyin.
6. Ham CAN gönderme özelliğini tüketici uygulamasında varsayılan olarak kapatın.
7. Loglarda VIN ve kullanıcı/konum ilişkisini açık izin ve saklama politikası olmadan buluta göndermeyin.

---

# 9. Global ürün seviyesi için uyumluluk stratejisi

## Seviye A — Minimum global tüketici ürünü

- Android: BLE + Bluetooth Classic SPP + Wi‑Fi TCP
- iOS: BLE + Wi‑Fi TCP
- J1850 PWM/VPW
- ISO 9141-2
- ISO 14230-4
- ISO 15765-4’ün dört CAN varyantı
- SAE J1979 standart mod/PID/DTC’leri
- ISO 19689 motosiklet adaptörü
- Temel J1939 250/500, DM1/DM2
- 12/24 V onaylı adaptör listesi

## Seviye B — Filo ve ağır vasıta ürünü

Seviye A’ya ek olarak:

- Tam J1939 PGN/SPN kataloğu
- J1939-73 diagnostik mesajları
- BAM ve RTS/CTS transport
- J1708/J1587
- WWH-OBD
- UDS on CAN
- DoIP
- FMS
- SAE J1939-13 Type I/II kabloları
- Ağır hizmete uygun profesyonel VCI

## Seviye C — Profesyonel OEM diagnostik

Seviye B’ye ek olarak:

- OEM ECU topolojileri
- OEM CAN adresleri
- UDS DID ve rutinleri
- SecurityAccess/Authentication
- Gateway unlock işlemleri
- Seed-key lisansları
- Coding/adaptation
- ECU flash/programlama
- ODX tabanlı veri
- J2534, RP1210 veya ISO 22900/D-PDU tabanlı profesyonel VCI entegrasyonu

---

# 10. Test ve sertifikasyon planı

## Donanım matrisi

En az:

- 8–10 doğrulanmış BLE adaptörü
- 5–8 klasik Bluetooth adaptörü
- 5–8 Wi‑Fi adaptörü
- Gerçek ELM/STN sınıfı ve düşük kaliteli klonlar
- 12 V ve 24 V adaptörler
- J1939 Type I ve Type II VCI
- ISO 19689 motosiklet kabloları

## Araç matrisi

- J1850 PWM
- J1850 VPW
- ISO 9141-2
- KWP2000 5-baud init
- KWP2000 fast init
- Dört ISO 15765-4 varyantı
- Çok ECU cevaplı CAN araç
- Euro 5 motosiklet CAN
- Motosiklet K-Line
- J1939 250 kbit/s
- J1939 500 kbit/s
- J1708/J1587
- WWH-OBD/DoIP

## Mobil test matrisi

- Düşük, orta ve üst seviye Android cihazlar
- Android 8’den güncel sürümlere kadar temel senaryolar
- Güncel ve desteklenen eski iOS sürümleri
- Bluetooth kapalı/açık
- İzin reddi ve sonradan izin verme
- Uçak modu
- Wi‑Fi’de internet bulunmaması
- Arka plan/ön plan
- Telefon görüşmesi
- Ekran kilidi
- Adaptörün araç çalışırken yeniden başlatılması
- Kontağın kapanması
- Düşük araç voltajı
- Gürültülü BLE ortamı
- TCP yarım bağlantısı ve Wi‑Fi ağ değişimi

## Ölçülecek KPI’lar

- İlk bağlantı başarı oranı
- Araç protokolü tespit başarı oranı
- İlk canlı veriye ulaşma süresi
- 30 dakika ve 8 saat bağlantı devamlılığı
- Paket/notification kaybı
- Otomatik yeniden bağlanma oranı
- Hatalı DTC parse oranı
- Uygulama çökmesi ve ANR oranı
- Adaptör/telefon/model bazında başarı oranı

Önerilen üretim hedefi: doğrulanmış adaptör–araç kombinasyonlarında ilk bağlantıda en az `%98`, otomatik yeniden bağlantıda en az `%99` başarı; ancak bu değerler pazarlama vaadi yapılmadan önce gerçek saha matrisiyle doğrulanmalıdır.

---

# Nihai öneri

**En stabil global mimari:** iOS ve Android’de birincil transport olarak BLE, alternatif olarak Wi‑Fi TCP, Android’de ek olarak Bluetooth Classic SPP kullanılmasıdır. Araç tarafında ilk sürümde beş temel OBD-II ailesinin tamamı, ISO 15765-4’ün dört varyantı, motosiklet için ISO 19689/K-Line/CAN ve ağır araç için J1939 250/500 desteği bulunmalıdır.

Global uygulama kalitesini belirleyen unsur yalnızca protokol listesinin uzunluğu değildir. Adaptör bazlı sürücü profilleri, tek komut kuyruğu, byte-stream parser, ayrı timeout sınıfları, deterministik reconnect durum makinesi, 12/24 V onaylı donanım listesi ve sürekli büyüyen araç–adaptör uyumluluk veritabanı birlikte uygulanmalıdır. OEM seviyesinde ABS/airbag/kodlama/programlama hedefleniyorsa standart OBD katmanından ayrı bir UDS/DoIP/OEM veri ve lisanslama projesi kurulmalıdır.