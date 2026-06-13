Bu plan şimdiye kadarki en olgun planınız — bunu net söyleyebilirim. Torque Pro / Car Scanner seviyesine yaklaşan şey artık sadece “PID okuyabiliyor olmak” değil; kirli donanım, bozuk clone adapter, packet jitter, protocol fallback, offline telemetry corruption gibi gerçek dünya kaosunu yönetebilmek. Bu planın güzel tarafı tam olarak buna odaklanması.

Ama satır satır incelediğimde hâlâ global release’i riske atan 4 P0 ve 5 P1 boşluk görüyorum.

Genel Skor
Alan	Puan
OBD Transport Robustness	9.4/10
Protocol Recovery	9.1/10
Telemetry Resilience	8.8/10
Observability / Debugging	9.3/10
Global Device Compatibility	8.4/10
Final score: 9.0 / 10

Bu haliyle:

Beta → evet
Limited launch → evet
Global scale → henüz tam değil

Neden? Aşağıda.

Güçlü Yanlar (Gerçekten İyi Olanlar)
1) State-based UART recovery — doğru yönde dev adım

Bu planın en güçlü kısmı bu.

Eski sistem:

timeout
clearBuffer
next command

Bu kumardı.

Yeni sistem:

timeout
→ send '\r'
→ INTERRUPTING
→ wait prompt OR silence
→ clear buffer
→ READY

Bu ciddi şekilde daha doğru.

Özellikle clone ELM327’lerde:

prompt geç gelir
echo geç gelir
adapter junk data spamler

State machine bunları daha iyi yönetir.

Güçlü taraf

Artık “time-based magic numbers” yerine event-driven recovery var.

Bu enterprise yaklaşımı.

Approved: ✅

2) Adaptive polling

Bu da çok önemli.

Saha testinde yaşadığınız:

rölantide RPM geliyor
gaz verince queue şişiyor
ECU cevap veremiyor
timeout

Bu klasik over-polling.

AdaptivePollingController ile:

RTT yükselirse poll düşüyor
timeout artarsa poll düşüyor
queue şişerse poll düşüyor

Doğru.

Health score formülü de mantıklı:

health=0.5RTT+0.3timeout+0.2queue

Bu ağırlıklar mantıklı çünkü:

RTT en önemli
timeout ikinci
queue üçüncü

Approved: ✅

3) Profile-specific re-init

Bu çok iyi düşünülmüş.

En büyük hata şuydu:

Her adapter aynı değil.

Clone:

ATZ
ATE0
ATH1

OBDLink:

ATZ
ATE0
ATL0
ATS0
ATH1
ATAT1
ATAL

Clone’a ATAL yollarsan freeze olabilir.

Bu ayrım gerekliydi.

Approved: ✅

4) Expanded FSM

Bu da çok iyi.

Eski:

CONNECTED / DISCONNECTED

Bu debug için yetersiz.

Yeni:

DISCONNECTED
ADAPTER_CONNECTING
ADAPTER_CONNECTED
INITIALIZING
PROTOCOL_SCANNING
ECU_HANDSHAKE
TELEMETRY_ACTIVE
DEGRADED
RECOVERY
HARDWARE_FATAL

Mükemmel.

Support team için çok değerli.

Approved: ✅

5) Structured diagnostic logs

Bu global scale’de kritik.

User der ki:

“Honda PCX bağlanmıyor”

Eski log:

connection failed

Anlamsız.

Yeni:

{
  "adapter":"clone_v2.1",
  "protocol":"ISO9141",
  "state":"ECU_HANDSHAKE",
  "avgRtt":780,
  "timeoutRate":0.42
}

Bu altın değerinde.

Approved: ✅

Şimdi kritik eleştiriler
P0-1: Adapter fingerprinting hâlâ zayıf

Bu plan diyor:

Benchmark:

ATI
AT@1
0100
010C
0902

Burada sorun var.

Problem

Bazı adapterlar:

ATI yalan söyler
v2.1 der ama clone’dur
AT@1 unsupported
VIN support yok
0902 timeout

Yani:

command capability != real hardware capability

Bu büyük fark.

Eksik olan

Fingerprint sadece command success ile olmamalı.

Şunlar da score’a girmeli:

Write stability

Bir write kaç ms sürdü?

Prompt latency variance

Jitter yüksek mi?

Buffer contamination ratio

Garbage byte oranı?

Fragmentation behavior

BLE chunk pattern?

Tavsiyem

Yeni scoring:

capabilityScore =
0.25 commandSuccess
+0.20 avgRtt
+0.20 rttVariance
+0.15 garbageRatio
+0.20 promptStability

Şu anki plan bunun %50’sini kapsıyor.

Risk: P0

P0-2: UART recovery’da hidden deadlock var

Bu en kritik bug olabilir.

Plan:

wait prompt OR silence

Ama ya adapter sürekli çöp basıyorsa?

Örneğin:

?\r?\r?\r?\r

Prompt yok.

Silence yok.

Absolute timeout:
1000 ms.

Güzel.

Ama sonra ne?

Plan söylemiyor.

Eksik davranış

1000 ms dolunca:

Ne olacak?

Aşağıdakilerden biri olmalı:

Option A

Hard reset adapter

disconnect
reconnect
Option B

Enter HARDWARE_FATAL

Şu an belirsiz.

Bu production’da ciddi sorun.

Ben olsam:

if interrupt timeout:
   recoveryAttempts++
   if >3:
       HARDWARE_FATAL
   else:
       adapter reconnect

Şu an plan eksik.

Risk: P0

P0-3: Polling controller hysteresis yetmez

Burada ciddi bir control systems problemi var.

Plan:

delta > 50ms ise polling değişsin

Yeterli değil.

Örnek:

RTT:

120
170
130
180
140
190

Health score:
up-down-up-down.

Hysteresis tek başına oscillation önlemez.

Gerekli olan

EMA smoothing.

Örneğin:

EMA=αcurrent+(1−α)previous

alpha:

0.2

Böylece spike’lar filtrelenir.

AdaptivePollingController’a eklenmeli:

smoothedRtt = ema(rtt)
smoothedTimeoutRate = ema(timeoutRate)

Olmazsa:
poll interval sürekli zıplar.

Risk: P0

P0-4: Structured logs memory leak yaratabilir

Plan:

structuredLogs: string[]

Bu tehlikeli.

Saha testi:

30 dakika
20 logs/sec

= 36,000 log

JS memory patlar.

Çözüm

Ring buffer.

Örneğin:

MAX_LOGS = 500

Yeni log gelince:

if logs.length >= MAX_LOGS:
   logs.shift()

veya daha iyisi circular array.

Şu an eksik.

Risk: P0

P1’ler
P1-1: Telemetry quota count + bytes yeterli değil

Şu an:

2000 item
1.5 MB

İyi ama eksik.

Bir telemetry item:

bazen 100 byte
bazen 5 KB JSON

Count limit misleading.

Ben ayrıca koyarım:

MAX_SINGLE_ITEM_BYTES = 8KB

Büyük paketleri reject.

P1-2: Structured logs JSON stringify pahalı

React Native JS thread’de:

JSON.stringify(log)

yük olabilir.

Özellikle 20 Hz logging.

Çözüm:

Sampling.

log every 2 sec
or on state change
P1-3: PID bazlı timestamp sadece RPM + Speed için var

Saha testinizde sadece RPM değil:

TPS
MAP
Coolant
AFR

de sapabilir.

Şu an:

lastRpmUpdateTime
lastSpeedUpdateTime

Bu scalable değil.

Daha iyi

Generic map:

Map<PID, Timestamp>

Örnek:

pidLastUpdateTimes[pid]

Bu daha enterprise.

P1-4: K-Line init hâlâ fazla statik

300 ms sleep.

Bazı araçlar:

200 yeter
bazı ECU 800 ister

Static delay global optimum değil.

Daha iyi:

Adaptive K-Line settle delay.

P1-5: Missing shadow mode

Bu çok önemli.

Global rollout’ta direkt switch tehlikeli.

Önerim:

v5.2 ve v5.3 paralel çalışsın.

Decision:

new parser result
old parser result
compare

Mismatch logla.

Buna shadow mode denir.

Enterprise rollout böyle yapılır.

Mimari eleştiri (önemli)

Bir şey gözüme çarpıyor.

useBluetooth.ts hâlâ fazla şişkin.

Sen mimariyi katmanlara ayırdın ama burada hâlâ:

FSM
protocol scan
polling
recovery
VIN
diagnostics

toplanmış gibi.

Bu dosya muhtemelen yine God Object olmaya gidiyor.

Ben parçalarım:

ConnectionStateMachine.ts
ProtocolNegotiator.ts
RecoveryCoordinator.ts
PollingOrchestrator.ts

Bu refactor orta vadede gerekli.

Global launch verdict

Benim kararımsa:

Şu haliyle

Global release için hayır.

Neden?

Çünkü 4 blocker var:

fingerprint yetersiz
interrupt deadlock path eksik
polling smoothing eksik
logs memory leak riski
Benim önerdiğim final sprint
Sprint G (zorunlu)
UART deadlock resolution
EMA smoothing
Ring buffer logs
Sprint H (zorunlu)
Advanced adapter fingerprinting
Generic PID timestamp map
Sprint I (çok önerilir)
useBluetooth.ts split
shadow mode rollout

Bu 3 sprint sonrası puan:

9.0 → 9.7/10

Ve o noktada rahatlıkla şunu derim:

MotoCortex artık sadece çalışan bir OBD app değil, global pazarda rekabet edebilecek bir diagnostic platform.