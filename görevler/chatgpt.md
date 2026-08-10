
[ismailimamoglu/MotoCortex](https://github.com/ismailimamoglu/MotoCortex) projemi detaylı bir şekilde incele ve senden projenin bağlantı protokollerini kapsamlı bir şekilde test etmeni istiyorum hem İOS hem android tarafında hemde her türlü ECU ya hem her türlü orijinal yada klon yada klona yakın orijinal cihaza ve araca sorunsuz bağlanabilecek global pazarda sorunsuz çalışabilecek düzeyde olması için test et ve bana raporla kod değişikliği yapma

29s düşündü

Evet. Projeyi kod değişikliği yapmadan, bağlantı mimarisini ve protokol katmanlarını QA/otomotiv haberleşme mühendisi gözüyle inceledim.

Önemli bir ayrım yapacağım: GitHub üzerindeki mevcut kaynak kodu üzerinden statik/dinamik mimari analizi ve protokol seviyesinde test senaryosu analizi yapabiliyorum; ancak elimde fiziksel iPhone/Android cihazı, gerçek OBD adaptörleri ve yüzlerce gerçek araç olmadığı için “şu 200 adaptör ve 500 araç üzerinde fiziksel olarak test edildi” diyemem. Dolayısıyla aşağıdaki raporda kanıtlanmış kod davranışı, yüksek olasılıklı hata, ve laboratuvarda mutlaka doğrulanması gereken noktaları ayrı değerlendiriyorum.

[MotoCortex GitHub Repository](https://github.com/ismailimamoglu/MotoCortex?utm_source=chatgpt.com)

# MotoCortex Global Connectivity / Protocol QA Report

İncelenen kapsam:  
Android \+ iOS, BLE, Bluetooth Classic, Wi-Fi/TCP, ELM327, CAN, K-Line/KWP, ISO-TP, UDS, ECU oturum yönetimi, command queue, timeout/recovery, clone adaptör davranışları.

## 1\. Genel sonuç

Benim mevcut kaynak koduna göre verdiğim skor:

| Alan | Durum | Skor |
| ----- | ----- | ----: |
| Android Bluetooth Classic | 🟢 İyi | 8/10 |
| Android BLE | 🟡 Orta | 6.5/10 |
| Android Wi-Fi | 🟢 İyi | 8/10 |
| iOS BLE | 🔴 Kritik risk | 5/10 |
| iOS Wi-Fi | 🟢/🟡 | 7/10 |
| ELM327 command queue | 🟢 İyi | 8/10 |
| ELM response framing | 🟡 | 7/10 |
| CAN/ISO-TP | 🟡 | 6.5/10 |
| K-Line/KWP | 🟡/🔴 | 5.5/10 |
| Clone ELM327 toleransı | 🟡 | 6/10 |
| Protocol autodetection | 🟡 | 6/10 |
| ECU session recovery | 🟡 | 6.5/10 |
| Global araç uyumluluğu | 🔴 Henüz yeterli değil | 5/10 |
| Global adapter uyumluluğu | 🟡 | 6/10 |
| Genel bağlantı readiness | 🟡 Beta / saha testi gerekli | 6.3/10 |

### En önemli sonuç

MotoCortex'un mevcut haliyle “global pazarda her türlü ECU \+ her türlü ELM327 clone ile sorunsuz çalışır” seviyesinde olduğunu söylemem.

Ancak mimarinin önemli bir kısmı doğru yöne gitmiş.

Özellikle:

* native Android OBD katmanı,  
* native iOS OBD katmanı,  
* ayrı transport abstraction,  
* command queue,  
* mutex/serialization,  
* BLE fragmentation,  
* KWP decoder,  
* ISO-TP decoder,  
* protocol fallback,  
* hardware classification

gibi yapıların eklenmiş olması doğru yaklaşım.

Repository zaten BLE / Classic Bluetooth / Wi-Fi transport katmanlarını ayrı ele alıyor.   
---

# 2\. En kritik bulgum: iOS native BLE bağlantısı

Burası benim rapordaki P0 seviyesindeki problem.

Native iOS:

BLETransport.swift

şu anda doğrudan:  
FFE0 service

FFE1 characteristic

kullanıyor. 

Daha önemlisi:

connect(target:)

parametresi alınmasına rağmen cihazı target üzerinden seçmiyor.

Kod:

centralManager.scanForPeripherals(withServices: nil, options: nil)

ardından keşfedilen ilk peripheral:  
self.peripheral \= peripheral  
central.stopScan()

central.connect(peripheral)

olarak seçiliyor. 

### Bu ne demek?

iOS'ta:

Kullanıcı Adapter A'yı seçti.

ama scan sırasında:

Adapter B önce keşfedilirse

native katman B'ye bağlanabilir.

Bu gerçek cihazda özellikle şu durumda ciddi problem yaratır:

* araçta birden fazla BLE cihazı varsa,  
* kullanıcının daha önce bağlı başka OBD cihazı varsa,  
* CarPlay/BLE accessory ortamı varsa,  
* birden fazla ELM327 yakınındaysa.

### Severity

P0 — Critical

Bu düzeltilmeden iOS bağlantı katmanına global-ready demem.  
---

# 3\. iOS BLE cihaz uyumluluğu fazla dar

Native iOS katmanı yalnızca:  
FFE0

FFE1

üzerinden çalışıyor. 

Halbuki üst JS katmanınız daha geniş davranıyor.

JS iOS tarafında:

* FFE0  
* FFF0  
* 18F0  
* vLinker UUID

gibi farklı servisleri arıyor. 

Bu iki mimari arasında uyumluluk farkı var.

Yani:  
JS BluetoothService.ios.ts  
        ↓  
geniş BLE desteği

Native MotoCortexOBDModule  
        ↓

FFE0/FFE1

şeklinde bir uyumsuzluk oluşmuş.

### Sonuç

Bir adaptör JS katmanında desteklenebilir görünürken native OBD modülünde başarısız olabilir.

Bu özellikle:

* Vgate  
* vLinker  
* Carista  
* LELink  
* farklı Nordic BLE firmware'leri  
* custom BLE ELM327

için risk.

Severity: P0/P1  
---

# 4\. Android Classic Bluetooth tarafı çok daha sağlam

Android native ClassicTransport.kt önemli bir avantaj taşıyor.

Önce standart:  
SPP UUID

00001101-0000-1000-8000-00805F9B34FB

deneniyor. Başarısız olursa reflection üzerinden RFCOMM channel 1 deneniyor. 

Bu özellikle ucuz ELM327 clone'ları açısından iyi.

Çünkü piyasadaki cihazların önemli kısmı düzgün SDP/SPP davranışı göstermeyebiliyor.

### Test sonucu

Android Classic: 8/10

Güçlü.

Ama hâlâ şu kombinasyonları fiziksel olarak test etmek gerekiyor:

* gerçek ELM327 v1.5  
* sahte ELM327 v1.5  
* ELM327 v2.1 clone  
* PIC18F25K80  
* STN2120  
* vLinker  
* OBDLink  
* UniCarScan

---

# 5\. Android BLE'de ciddi global compatibility riski

Android native BLE de yalnızca:  
FFE0

FFE1

kullanıyor. 

Üstelik:

requestMtu(512)

yapılıyor.

Bu güzel ama:

MTU 512 talep etmek ≠ cihazın 512 kabul edeceği anlamına gelmez.

Kod onMtuChanged sonrası service discovery yapıyor; fakat farklı BLE stack'lerde:

* 23  
* 185  
* 247  
* 251  
* 512

gibi değerlerle çalışmak gerekiyor.

Daha önemlisi OBD command'ları normalde çok küçük olduğundan 512 MTU'nun kendisi kritik değil.

Asıl kritik konu:

### BLE write sequencing

Kod:

WRITE\_TYPE\_NO\_RESPONSE

kullanıyor. 

Bu clone cihazlarda sorun çıkarabilecek bir alan.

Özellikle:  
command A  
command B

command C

çok hızlı gönderildiğinde ucuz BLE UART bridge'lerde:  
ATE0  
ATSP0

0100

gibi komutlar birleşebilir veya kaybolabilir.

Queue bunu büyük ölçüde engelliyor, fakat native BLE write operation'ın gerçek tamamlanmasını takip etmiyor.

### Severity

P1  
---

# 6\. Android Classic'te güzel bir fallback var

Android JS tarafında ayrıca:

getBondedDevices()

ile başlanıyor.

Sonra discovery deneniyor.

Discovery başarısız olsa bile bonded cihazlar kullanılabiliyor. 

Bu iyi bir Android UX/compatibility kararı.

Ayrıca bağlantı başarısız olursa:

pairDevice()

fallback'ı var. 

Bu nedenle Android tarafını iOS'a göre daha olgun buldum.  
---

# 7\. Wi-Fi transport genel olarak iyi

Android:  
Socket  
keepAlive \= true

tcpNoDelay \= true

kullanıyor. 

iOS tarafında da:  
NWConnection  
TCP  
noDelay

keepalive

kullanılmış. 

Bu doğru.

Wi-Fi ELM327 cihazlarının çoğunda:

192.168.x.x:35000

gibi TCP bağlantısı kullanıldığı için bu mimari mantıklı.

### Ancak

Android JS tarafında:

WIFI:IP:PORT

parser'ı oldukça basit:

target.split(':')

IPv6 düşünülmemiş.

ELM327 açısından çok kritik değil fakat global network stack için teknik borç.  
---

# 8\. Response framing mantığı

MotoCortex'ta önemli bir doğru karar var:

\>

ELM327 prompt karakteri response tamamlayıcı olarak kullanılıyor.

Android native queue:

responseBuffer.contains("\>")

yapıyor. 

iOS native queue de aynı yöntemi kullanıyor. 

Bu:

* Bluetooth fragmentation  
* TCP fragmentation  
* BLE fragmentation

karşısında doğru yaklaşım.

Örneğin:

41 0C 1A

tek packet gelmek zorunda değil.

Şöyle gelebilir:

41 0

sonra:

C 1A

sonra:

\>

Buffer yaklaşımı bunu karşılayabiliyor.  
---

# 9\. Fakat \> tek başına yeterli değil

Global ELM327 compatibility açısından burada önemli bir risk var.

Bazı cihazlar:

\>

kullansa da bazı clone firmware'ler:

* prompt'u geciktirebilir,  
* CR/LF'yi farklı verebilir,  
* echo açık bırakabilir,  
* response'u parçalı verebilir,  
* SEARCHING... gönderebilir,  
* NO DATA  
* CAN ERROR  
* STOPPED  
* BUS ERROR

gibi ara cevaplar verebilir.

MotoCortex'un üst protokol motoru bunların bir kısmını zaten ele alıyor. Örneğin NO DATA, CANERROR, BUSERROR, BUFFERFULL gibi hatalar tanımlanmış. 

Bu olumlu.  
---

# 10\. OBD2ProtocolEngine'in güçlü tarafı

Burada mimari ciddi şekilde gelişmiş.

Engine içerisinde:

* ELMParser  
* BLEMultiFrameAssembler  
* ISO-TP decoder  
* KWPFrameDecoder  
* FlowControlManager  
* SessionHealthMonitor  
* TransportRateLimiter  
* CommandScheduler

gibi katmanlar bulunuyor. 

Bu, önceki basit:

Bluetooth → string → parser

yaklaşımından çok daha profesyonel.  
---

# 11\. Timeout sistemi iyi ama bazı ECU'lar için hâlâ riskli

Default timeout:

2000 ms

Handshake komutları için minimum:

3500 ms

uygulanıyor. 

Bu:

* ATZ  
* ATSP  
* ATDP  
* ATE0  
* ATST  
* ATIIA  
* ATSI  
* 0100

için doğru yönde.

Ancak global K-Line/KWP araçlarda ECU wake-up ve initialization süresi CAN'den çok daha değişken olabilir.

Özellikle:

* Renault  
* Dacia  
* bazı Fiat  
* eski VAG  
* eski Japon araçlar

için gerçek saha testleri şart.  
---

# 12\. K-Line/KWP desteği var ama global seviyede henüz güven vermiyor

Engine'de K-Line tespiti var:

ISO 9141 / ISO 14230

benzeri protokoller için KWP decoder kullanılıyor. 

Ayrıca Mode 01 parsing içinde K-Line residue formatı özel olarak ele alınmış. 

Bu iyi.

### Ancak büyük problem

K-Line'ın başarısı sadece parser'a bağlı değil.

Şunlar gerekiyor:  
5-baud init  
fast init  
slow init  
KWP timing  
P1/P2/P3/P4 timing  
K-line wakeup  
ECU address

functional/physical addressing

Ve daha önemlisi:

ELM327 clone'un fiziksel K-Line transceiver'ı bulunması gerekiyor.

Dolayısıyla:

uygulama K-Line destekliyor

ile:

kullanıcının ELM327 cihazı K-Line destekliyor

aynı şey değil.

Bu nedenle senin önceki yaşadığın Dacia/clone problemi hâlâ global uyumluluğun en önemli risklerinden biri.  
---

# 13\. CAN multi-frame yaklaşımı iyi

Engine:  
7E8...

18DAF1...

gibi CAN response pattern'lerini tespit ediyor. Sonra:  
ISOTPDecoder

FlowControlManager

kullanıyor. 

Bu:

* VIN  
* UDS  
* DTC  
* uzun DID response  
* ECU identification

için gerekli.

Ayrıca gerektiğinde:

30 00 00

Flow Control gönderme mantığı bulunuyor. 

Bu doğru yönde.  
---

# 14\. Ancak CAN FD iddiası ile gerçek transport arasında fark var

README'de proje:

CAN FD 64-byte / 8 Mbps

ve

ISO 13400 DoIP

desteği sunduğunu belirtiyor. 

Fakat incelediğim gerçek transport katmanlarında:  
BLE  
Classic Bluetooth

Wi-Fi

var. 

Native Android transport'ta da:  
BLE  
Classic

Wi-Fi

bulunuyor. 

Bu nedenle şu ayrımı yapıyorum:

### Uygulama protokol motoru

CAN/ISO-TP/UDS tarafında ciddi hazırlık var.

### Fiziksel CAN FD transport

Henüz doğrulanmış değil.

Çünkü CAN FD için kullanılan adapter'ın:

CAN FD capable controller

olması gerekir.

Standart ELM327 cihazı CAN FD cihazı değildir.

Dolayısıyla:

“CAN FD destekliyoruz”

ifadesi ancak CAN FD destekleyen gerçek hardware adapter ile saha testinden sonra güvenilir hale gelir.  
---

# 15\. UDS tarafında önemli bir ayrım

MotoCortex UDS response parsing yapıyor.

Örneğin:

7F \[service\] \[NRC\]

negative response'ları ayrıştırıyor. 

Bu iyi.

Ancak:  
NRC 33  
NRC 35

NRC 7E

gibi gateway/security durumlarını doğru biçimde reddetmek önemli.

Bu açıdan mevcut safety katmanı iyi bir yaklaşım.

README de adapter'ları:  
TIER\_1\_PRO  
TIER\_2\_STANDARD

TIER\_3\_UNSAFE

olarak sınıflandırıyor. 

Bu yaklaşımı özellikle write/coding işlemleri açısından doğru buluyorum.  
---

# 16\. Çok önemli: “her clone ile çalışmak” hedefi teknik olarak yanlış tanımlanmalı

Bunu özellikle vurguluyorum.

Senin hedefin:

Her türlü orijinal / clone adaptörle çalışmak

olmamalı.

Doğru hedef:

Çalışabilecek her adapter ile maksimum compatibility \+ çalışamayacak adapteri erken ve doğru teşhis etme.

Örneğin fiziksel olarak:

ELM327 clone

ama içinde:

K-Line transceiver yok

ise uygulama bunu yazılımla çözemiyor.

Aynı şekilde:

CAN FD ECU

ama:

ELM327 v1.5 adapter

kullanılıyorsa adapter fiziksel olarak CAN FD desteklemiyor olabilir.

Dolayısıyla MotoCortex'un global kalite standardı:

### FAIL FAST

olmalı.

Örneğin:  
Adapter connected  
↓  
Adapter capability detected  
↓  
Protocol capability detected  
↓  
ECU protocol detected  
↓

ECU session established  
---

# 17\. Şu anda connection state biraz fazla basit

Native session:  
DISCONNECTED  
CONNECTING  
CONNECTED

RECONNECTING

kullanıyor. 

Fakat gerçek otomotiv haberleşmesinde:  
Physical Bluetooth link  
        ↓  
Adapter transport  
        ↓  
ELM session  
        ↓  
OBD protocol  
        ↓  
ECU reachable  
        ↓  
Diagnostic session  
        ↓

ECU response healthy

ayrımı gerekiyor.

Şu anki sistem bu seviyelerin bazılarını üst katmanda takip ediyor olsa da native session state tek başına bunları temsil etmiyor.

Bu nedenle QA açısından:

CONNECTED ≠ ECU CONNECTED

olmalı.  
---

# 18\. Heartbeat konusu

Android/iOS native session manager 30 saniye idle kaldığında:

AT RV

gönderiyor. 

Bu bazı ELM327 cihazlarında mantıklı.

Ancak bütün adapter firmware'leri aynı değildir.

Bazıları:

AT RV

desteklemeyebilir veya bazı ECU session'larında gereksiz olabilir.

Daha önemlisi:

AT RV

bir ECU keepalive değildir.

Bu:

adapter voltage query

dir.

Dolayısıyla:

Adapter alive ≠ ECU diagnostic session alive

Bu ayrım global UDS/coding tarafında önemli.  
---

# 19\. Recovery sistemi iyi fikir, fakat reconnect sırasında race condition riski var

Android:

connect()

içerisinde:  
newTransport  
newQueue  
connect

startProcessing

yapılıyor. 

Recovery sırasında tekrar:

connect(type,target)

çağrılıyor. 

Bu teorik olarak:  
old queue  
old transport  
new queue

new transport

çakışması yaratabilir.

Özellikle:

* telemetry aktif  
* reconnect başladı  
* kullanıcı diagnostic command gönderdi  
* UI başka bir connect çağırdı

kombinasyonlarında test edilmesi gerekiyor.

### Severity

P1  
---

# 20\. iOS native queue'da timeout sonrası stale response riski

iOS queue:

semaphore.wait(timeout:)

kullanıyor. 

Timeout olduğunda komut failure'a düşüyor.

Ancak ECU cevabı timeout'tan sonra gelirse:

late response

olabilir.

Sonraki command'a ait response buffer ile karışmaması için daha güçlü:  
command generation ID  
transaction ID

response ownership

yaklaşımı ideal olur.

Şu an buffer temizleniyor ama global clone/slow K-Line dünyasında bunun saha testi şart.  
---

# 21\. Android queue bu konuda daha iyi

Android queue:  
Mutex  
CompletableDeferred

withTimeout

kullanıyor. 

Bu command serialization açısından oldukça iyi.

Ben Android native queue'ya:

8/10

veriyorum.  
---

# 22\. iOS queue'da başka bir risk

iOS'ta:

transport.write(data:)

çağrısı queue lock tutulurken yapılıyor. 

Şu anda BLE write asynchronous olduğu için doğrudan deadlock oluşması beklenmiyor.

Fakat transport implementation değişirse veya callback synchronous olursa:  
queueLock  
↓  
write  
↓  
callback  
↓

queueLock

riskine dönüşebilir.

Bu nedenle QA'da özellikle:

* immediate callback  
* delayed callback  
* duplicate callback  
* no callback  
* late callback

test edilmeli.  
---

# 23\. BLE fragmentation testinin sonucu

Kodda BLE fragmentation için buffer bulunuyor.

Android:

bleDataBuffer

ve \> delimiter kullanılıyor. 

iOS:

iosBleBuffer

kullanıyor. 

Bu iyi.

### Test matrisi

Mutlaka şu şekilde test edilmeli:

41 0C 1A 20 \>

tek packet  
---

41 0C  
1A 20

\>

2 packet  
---

41  
0C  
1A  
20

\>

5 packet  
---

41 0C 1A 20

prompt gecikmeli  
---

SEARCHING...

41 0C 1A 20 \>  
---

010C

41 0C 1A 20 \>

echo açık  
---

010C\\r010D\\r

41...

buffer saturation  
---

Bu testlerin tamamı global release öncesi otomatik test haline getirilmeli.  
---

# 24\. ELM327 clone compatibility

Burada tabloyu şöyle görüyorum:

| Adapter | Beklenti |
| ----- | ----- |
| OBDLink MX+ | 🟢 |
| vLinker MC+ | 🟢 |
| UniCarScan | 🟢 |
| STN2120 tabanlı | 🟢 |
| Gerçek ELM327 v1.5 | 🟢/🟡 |
| PIC18F25K80 clone | 🟢/🟡 |
| ELM327 v2.1 clone | 🟡 |
| BK3231 clone | 🟡/🔴 |
| APM32 fake ELM | 🔴 |
| K-Line'siz clone | 🔴 K-Line araçlarda |
| BLE custom firmware | 🟡 |
| Wi-Fi ELM | 🟢/🟡 |

Repository'nin kendisi de fake ELM327 v2.1'i ayrı unsafe tier olarak ele alıyor. 

Bu doğru.  
---

# 25\. Global araç/protokol matrisi

Ben release testlerini şu şekilde sınıflandırırdım:

### CAN

ISO 15765-4 CAN 11-bit 500k  
ISO 15765-4 CAN 29-bit 500k  
CAN 11-bit 250k  
CAN 29-bit 250k  
CAN 125k

CAN 1M

### K-Line

ISO 9141-2  
ISO 14230-4 KWP2000  
5 baud init

fast init

### UDS

ISO 14229  
0x10  
0x11  
0x22  
0x27  
0x28  
0x2E  
0x31  
0x34  
0x36  
0x37

0x3E

### OBD-II

01  
02  
03  
04  
07  
09

0A  
---

# 26\. Şu anda en büyük eksik: gerçek protocol matrix testi

Kod var ama gerçek test matrisi yok.

README'de:  
56 suites

401 tests passed

belirtiliyor. 

Bu iyi fakat:

401 unit/integration test \= 401 gerçek ECU bağlantı testi değildir.

Örneğin:

401 test passed

ama:

2011 Dacia \+ cheap ELM327 v2.1

hala başarısız olabilir.

Bu otomotiv yazılımında çok normal.  
---

# 27\. Benim önerdiğim gerçek QA laboratuvar matrisi

Global release için minimum:

### Adapter Lab

Tier A

* OBDLink MX+  
* OBDLink EX  
* vLinker MC+  
* UniCarScan  
* STN2120

Tier B

* ELM327 genuine  
* PIC18F25K80 v1.5  
* farklı v1.5 clone

Tier C

* 5–10 farklı v2.1 clone  
* BK3231  
* APM32  
* generic BLE ELM  
* generic Wi-Fi ELM

---

# 28\. Telefon matrisi

### Android

Minimum:  
Samsung  
Google Pixel  
Xiaomi  
OnePlus  
Motorola

Huawei

Android:  
10  
11  
12  
13  
14  
15

16

özellikle Bluetooth stack açısından test edilmeli.

### iOS

Minimum:  
iPhone 11  
iPhone 12  
iPhone 13  
iPhone 14  
iPhone 15  
iPhone 16

iPhone 17

ve güncel iOS sürümleri.  
---

# 29\. Araç matrisi

Burada marka değil haberleşme protokolü esas alınmalı.

### Avrupa

VW  
Audi  
Skoda  
Seat  
BMW  
Mercedes  
Renault  
Dacia  
Peugeot  
Citroën  
Fiat  
Alfa Romeo  
Volvo

Opel

### Asya

Toyota  
Lexus  
Honda  
Mazda  
Nissan  
Hyundai  
Kia  
Mitsubishi  
Subaru

Suzuki

### ABD

Ford  
GM  
Chevrolet  
Jeep  
Dodge  
Chrysler

Tesla

### Çin EV

BYD  
MG  
NIO  
XPeng  
Geely

Xiaomi  
---

# 30\. Özellikle yaş grupları

Test:  
1996–2004  
2005–2010  
2011–2015  
2016–2020  
2021–2024

2025+

Çünkü:

eski araç \= daha zor bağlantı

ve

yeni araç \= gateway/security problemi

olabiliyor.  
---

# 31\. Şu anda global release için P0 listem

Bunları kod değiştirmeden sadece QA bulgusu olarak veriyorum:

### P0-01

iOS native BLE target device selection problemi.

### P0-02

iOS native BLE'nin FFE0/FFE1'e aşırı bağımlılığı.

### P0-03

JS BLE compatibility ile native BLE compatibility arasında uyumsuzluk.

### P0-04

CAN FD ve DoIP desteğinin gerçek transport seviyesinde fiziksel olarak doğrulanmamış olması.

### P0-05

K-Line 5-baud/fast-init gerçek cihaz testinin bulunmaması.  
---

# 32\. P1 listesi

### P1-01

BLE WRITE\_NO\_RESPONSE clone compatibility.

### P1-02

Late response / stale response isolation.

### P1-03

Reconnect sırasında eski/new queue race condition.

### P1-04

ECU session state ile adapter connection state ayrımının native katmanda yetersiz olması.

### P1-05

30 saniyelik AT RV heartbeat'in ECU session keepalive gibi kullanılma riski.

### P1-06

CAN multi-frame gerçek araç testi.

### P1-07

KWP timing gerçek araç testi.

### P1-08

Fake ELM327'in sadece software classification ile değil gerçek capability probing ile doğrulanması.  
---

# 33\. P2 listesi

* IPv6 Wi-Fi  
* unusual BLE UUID layouts  
* adapter firmware quirks  
* malformed ELM responses  
* Unicode/garbage bytes  
* partial CR/LF  
* duplicate prompt  
* missing prompt  
* prompt inside payload  
* connection during app backgrounding  
* Bluetooth off/on  
* airplane mode  
* phone sleep/wake  
* vehicle ignition off/on  
* engine crank sırasında bağlantı  
* voltage sag  
* adapter unplug/replug

---

# 34\. Özellikle crank testi

Bu projede çok önemli.

Şu senaryoyu test et:  
ECU connected  
↓  
live telemetry  
↓  
engine OFF  
↓  
STARTER CRANK  
↓  
voltage drops  
↓  
ECU resets  
↓  
adapter remains connected  
↓

ECU comes back

MotoCortex zaten bunun için triggerCrankingRecovery() mekanizması oluşturmuş. Android ve iOS native session manager'da 500 ms warm-start ve retry mekanizması bulunuyor. 

Bu çok iyi bir fikir.

Ama gerçek araçta doğrulanmadan güvenilir kabul edilmemeli.  
---

# 35\. “ECU bağlandı” test kriteri

QA'da sadece:

Bluetooth connected

başarılı sayılmamalı.

Ben kabul kriterini şöyle belirlerdim:  
Adapter Connected  
        ↓  
Adapter Identified  
        ↓  
ELM/STN Capability Identified  
        ↓  
Protocol Detected  
        ↓  
ECU Responding  
        ↓  
0100 Successful  
        ↓  
VIN / ECU ID Successful  
        ↓  
DTC Query Successful  
        ↓

Telemetry Stable

Bunların tamamı olmadan:

ECU CONNECTED

gösterilmemeli.  
---

# 36\. Global compatibility için başarı kriteri

Ben MotoCortex için şu KPI'ları kullanırdım:

### Connection success

≥ 98%

desteklenen adapter \+ araç kombinasyonlarında.

### First command success

≥ 99%

### 0100 success

≥ 98%

### VIN success

≥ 97%

VIN destekleyen araçlarda.

### 30 dakika telemetry

≥ 99% session continuity

### Reconnect

≥ 95%

### Clone adapter

Desteklenen clone'larda:

≥ 95%

### K-Line

Gerçek K-Line capable adapter:

≥ 95%  
---

# 37\. En önemli mimari değerlendirmem

Şu an MotoCortex:  
React Native  
     ↓  
JS transport  
     ↓  
Native OBD  
     ↓  
Queue  
     ↓  
ELM  
     ↓

ECU

gibi birden fazla katmana sahip.

Bu büyük avantaj ama aynı zamanda risk.

Özellikle:  
BluetoothService.android.ts

BluetoothService.ios.ts

ile

motocortex-obd native module

aynı bağlantı problemlerini farklı şekillerde çözmeye çalışıyor.

Bu yüzden ileride:

“Android'de çalışıyor ama iOS'ta çalışmıyor”

veya:

“Demo mode'da çalışıyor ama native build'de çalışmıyor”

tipi problemler oluşabilir.  
---

# 38\. Rakip açık kaynak projelerle karşılaştırma

Örneğin SwiftOBD2 gibi açık kaynak projelerde de BLE/Wi-Fi/ELM327 bağlantısı, PID, DTC ve connection-state abstraction açıkça ayrıştırılmış durumda. 

MotoCortex'un mevcut mimarisi bu basit OBD kütüphanelerinden daha kapsamlı.

Fakat MotoCortex'un hedefi de çok daha büyük:  
OBD-II  
\+  
UDS  
\+  
KWP  
\+  
CAN  
\+  
CAN FD  
\+  
DoIP  
\+  
ECU coding  
\+

OEM diagnostics

olduğu için test standardının da çok daha yüksek olması gerekiyor.  
---

# 39\. Nihai QA kararı

## 🟢 Şu anda güçlü olduğunuz alanlar

* Android Classic Bluetooth  
* Android RFCOMM fallback  
* Wi-Fi TCP  
* command queue  
* mutex serialization  
* ELM prompt handling  
* BLE fragmentation  
* CAN multi-frame altyapısı  
* ISO-TP  
* KWP parsing altyapısı  
* UDS negative response handling  
* reconnect concept  
* clone adapter classification  
* safety gate  
* native Android/iOS ayrımı

---

## 🟡 Geliştirilmesi/test edilmesi gereken alanlar

* BLE UUID diversity  
* BLE write behavior  
* K-Line timing  
* K-Line hardware compatibility  
* clone firmware quirks  
* late response  
* reconnect races  
* ignition cycle  
* crank recovery  
* multi-ECU  
* gateway vehicles  
* UDS session stability

---

## 🔴 Global release öncesi kritik

Özellikle:

### 1\.

iOS native BLE cihaz seçimi

### 2\.

iOS native BLE UUID çeşitliliği

### 3\.

JS/native transport divergence

### 4\.

Gerçek K-Line araç/adaptör testleri

### 5\.

CAN FD gerçek hardware doğrulaması

### 6\.

DoIP gerçek hardware/network doğrulaması

### 7\.

50+ gerçek araç × 10+ adapter × Android/iOS saha matrisi  
---

# 40\. Benim mevcut release değerlendirmem

Şu an:

MotoCortex \= güçlü bir OBD/diagnostic connectivity altyapısına sahip fakat henüz “Universal Global OBD Connectivity” seviyesinde doğrulanmış değil.

Ben bunu şöyle sınıflandırırım:  
Architecture             ████████░░  8/10  
Android Connectivity     ████████░░  8/10  
iOS Connectivity         ██████░░░░  6/10  
ELM Compatibility        ██████░░░░  6/10  
CAN                      ███████░░░  7/10  
K-Line                   █████░░░░░  5/10  
UDS                      ███████░░░  7/10  
Recovery                 ███████░░░  7/10  
Clone Support            ██████░░░░  6/10

Global Readiness         ██████░░░░  6/10

### Genel: \~6.3/10

Ama önemli nokta şu:

Bu 6.3/10 “kötü proje” anlamına gelmiyor.

Tam tersine, mimarinin önemli kısmı artık ciddi bir ürüne dönüşmüş. Sorun daha çok “kod yazmak” değil, otomotiv dünyasının korkunç çeşitliliğini gerçek donanımlarla doğrulamak.

Ve özellikle senin global hedefin açısından ben artık sıradan:

“OBD bağlantısı çalışıyor mu?”

QA'sından çıkıp “Universal Automotive Connectivity Certification Matrix” seviyesine geçmeni öneririm.

Bu noktadan sonraki doğru adım, kod değiştirmek değil; MotoCortex için 150–300 test senaryosundan oluşan Android/iOS × BLE/Classic/Wi-Fi × ELM/clone/STN × CAN/K-Line/KWP/UDS × eski/yeni araç kombinasyonlarını kapsayan gerçek bir Connectivity Certification Test Planı hazırlamak olur. Bu planı uyguladıktan sonra hangi kombinasyonların PASS / CONDITIONAL PASS / FAIL / HARDWARE LIMITED olduğunu net biçimde çıkarabiliriz.

