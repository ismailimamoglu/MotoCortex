# MotoCortex — Saha Testi / Bağlantı Problemi QA Raporu

## QA Sonucu

Bu saha testi, aynı cihazın **Infocar** uygulamasıyla uygulama açılır açılmaz başarılı şekilde bağlanabildiğini; MotoCortex'un ise aynı cihazla bağlantı kuramadığını gösteriyor.

### Ana sonuç

> **Cihaz arızası olasılığı düşük. Problem büyük olasılıkla MotoCortex → Bluetooth transport → ELM327 session initialization / command sequencing zincirinde.**

Gerçek ECU/araç arızası ihtimali de düşüktür; çünkü aynı cihaz Infocar ile sorunsuz çalışmıştır.

---

## 1. Saha testinin özeti

MotoCortex'un gönderdiği komut akışı:

```text
14:36:46  AT Z
14:36:51  ATI
14:36:52  AT RV
14:36:53  AT DP
14:36:53  ATWS
14:36:57  ATE0
14:37:01  AT SP 0
14:37:04  AT PC
14:37:05  ATWS
14:37:06  AT SP 6
14:37:09  AT PC
```

Logda anlamlı ELM327 cevapları büyük ölçüde görülmüyor.

Önemli istisna:

```text
[BT_READ_CHUNK] ? >
```

Bu satır özellikle önemli.

---

## 2. Cihaz arızası olasılığı düşük

Kontrollü A/B testi:

```text
                  Aynı cihaz
                     │
          ┌──────────┴──────────┐
          │                     │
     MotoCortex              Infocar
          │                     │
        FAIL                    PASS
```

Bu nedenle Bluetooth radio, OBD adaptör MCU'su, OBD bağlantısı, ECU iletişimi veya adaptörün genel çalışma kabiliyeti gibi bileşenlerin tamamen arızalı olması düşük ihtimaldir.

---

## 3. En önemli bulgu: TX var, RX beklenen şekilde yok

MotoCortex:

```text
AT Z
ATI
AT RV
AT DP
ATWS
ATE0
AT SP 0
AT PC
ATWS
AT SP 6
AT PC
```

komutlarını gönderiyor.

Ancak beklenen cevaplar:

```text
ELM327 ...
12.xV
AUTO
>
```

gibi anlamlı cevaplar olarak alınamıyor.

Bu nedenle:

```text
Bluetooth bağlantısı
        ↓
TX
        ↓
Adapter session
        ↓
ELM initialization
```

zincirinde problem oluşuyor.

---

## 4. `? >` cevabı

Logda:

```text
[BT_READ_CHUNK] ? >
```

görülmesi çok önemli.

`>` karakteri ELM327 dünyasında prompt anlamına gelir.

Bu nedenle cihazın tamamen ölü olmadığı düşünülüyor.

`?` ise cihazın gönderilen komutu tanımadığı veya beklenen framing'in oluşmadığı ihtimalini güçlendiriyor.

### Öncelikli araştırma

**Command framing / line ending / RX parsing**

---

## 5. CRLF / command framing şüphesi

Log yalnızca `AT Z` gibi komutların metnini gösteriyor. Ancak cihazın gerçekten aldığı byte dizisi bilinmiyor.

Örneğin:

```text
41 54 20 5A 0D
```

veya:

```text
41 54 20 5A 0D 0A
```

veya:

```text
41 54 20 5A
```

olabilir.

Clone ELM327 cihazlarda CR/LF/CRLF davranışları farklılaşabilir.

Bu nedenle en kritik QA ihtiyacı:

# RAW TX/RX byte dump

---

## 6. ATZ sonrası zamanlama

Akışta `AT Z` sonrasında yaklaşık 3.5 saniyelik bir bekleme görülüyor.

ATZ'nin bazı ELM327 cihazlarında uzun sürebilmesi tek başına hata değildir.

Ancak ardından `ATI` gönderiliyor ve anlamlı cevap alınmıyor.

Muhtemel senaryo:

```text
ATZ
 ↓
Adapter reset
 ↓
Bluetooth transport henüz stabilize olmadı
 ↓
ATI
 ↓
RX yok
```

**Severity: P1**

---

## 7. Protocol probing fazla agresif olabilir

Akış:

```text
AT SP 0
AT PC
ATWS
AT SP 6
AT PC
```

şeklinde devam ediyor.

`AT SP 0` ile Auto protocol deneniyor. Sonrasında `AT PC` ve `ATWS` ile state yeniden değiştiriliyor.

Özellikle clone ELM327 cihazlarda bu kadar fazla reset/protocol transition sorun oluşturabilir.

---

## 8. ATWS şüphesi

Logda iki ayrı `ATWS` bulunuyor.

Bazı clone firmware'lerde `ATWS` sonrasında protocol state, echo, linefeeds, headers, timeout ve prompt davranışları farklı olabilir.

Bu nedenle ATWS kullanımı özel olarak test edilmelidir.

---

## 9. ATE0 zamanlaması

Logda:

```text
ATWS
ATE0
```

şeklinde bir geçiş var.

Daha deterministik bir ELM initialization yaklaşımı genellikle:

```text
ATZ
↓
prompt
↓
ATE0
↓
ATL0
↓
ATS0
↓
ATH0
```

gibi bir sırayı tercih eder.

MotoCortex'un mevcut akışı daha agresif bir adapter interrogation + protocol probing yaklaşımı gösteriyor.

---

## 10. RX parser ihtimali

`BT_READ_CHUNK` içinde:

```text
? >
```

görülmesi, raw Bluetooth stream'in parser tarafından nasıl toplandığının araştırılmasını gerektiriyor.

Gerçek byte stream örneğin:

```text
0D
0A
3F
20
3E
20
```

olabilir.

Ayrıca Bluetooth chunking:

```text
chunk 1 = "?"
chunk 2 = " >"
```

şeklinde olabilir.

Bu nedenle RX tarafında:

- raw HEX
- ASCII
- timestamp
- chunk boundary

loglanmalıdır.

---

## 11. Infocar testinin önemi

Infocar'ın aynı cihazla hemen bağlanması, sorunu uygulama tarafına güçlü biçimde yönlendiriyor.

MotoCortex'un uzun initialization/probing zinciri kullanması, clone uyumluluğu açısından risk oluşturabilir.

Güçlü hipotez:

> MotoCortex cihazı tanımadan önce cihazı yeniden yapılandırmaya çalışıyor olabilir.

---

## 12. Olasılık değerlendirmesi

| Olası kaynak | QA ağırlığı |
|---|---:|
| MotoCortex BLE → ELM command framing / CRLF | %30 |
| Initialization sequence clone firmware ile uyumsuz | %25 |
| RX chunk / parser problemi | %20 |
| ATWS / protocol reset zinciri | %15 |
| Bluetooth transport timing | %5 |
| Adaptör firmware/hardware özel davranışı | %5 |
| ECU / araç problemi | <%5 |

Bunlar ölçülmüş istatistikler değil; mevcut A/B saha testine göre QA önceliklendirmesidir.

---

## 13. Connection funnel

| Aşama | Sonuç |
|---|---|
| Bluetooth cihazını bulma | 🟢 |
| Bluetooth bağlantısı | 🟢 |
| TX write | 🟢 |
| Adapter RX | 🟠 |
| ELM command recognition | 🔴 |
| ELM initialization | 🔴 |
| Protocol detection | 🔴 |
| ECU handshake | ❌ |
| VIN | ❌ |
| DTC | ❌ |
| Telemetry | ❌ |

---

## 14. Muhtemel cascade failure

Olası akış:

```text
ATI
 ↓
RX yok
 ↓
timeout
 ↓
fallback
 ↓
AT RV
 ↓
RX yok
 ↓
timeout
 ↓
AT DP
 ↓
...
 ↓
SP0
 ↓
...
 ↓
SP6
```

Uygulama birincil bağlantı hatasını çözmeden protocol fallback zincirine ilerliyor olabilir.

Bu **cascade failure** oluşturabilir.

---

## 15. Kod değişikliği yapmadan yapılması gereken QA testleri

### Test A — Raw byte

Tek command:

```text
ATI
```

gönderilmeli.

RX şu şekilde kaydedilmeli:

```text
HEX
ASCII
timestamp
chunk boundary
```

### Test B — Minimal ELM sequence

Sadece:

```text
ATZ
ATI
AT
```

gönderilmeli.

Başka AT command gönderilmemeli.

### Test C — ATE0 olmadan

```text
ATZ
ATI
ATSP0
0100
```

karşılaştırılmalı.

### Test D — ATWS olmadan

Saha testindeki ATWS komutları olmadan bağlantı denenmeli.

### Test E — SP6 doğrudan

```text
ATZ
ATI
ATE0
ATSP6
0100
```

denenmeli.

### Test F — Echo ON/OFF

```text
ATE1
ATI
```

ve:

```text
ATE0
ATI
```

karşılaştırılmalı.

---

## 16. En kritik A/B testi

Infocar ile MotoCortex arasında mümkün olduğunca aynı command sequence karşılaştırılmalı.

MotoCortex:

```text
TX raw HEX
RX raw HEX
timestamp
```

Infocar:

```text
TX raw HEX
RX raw HEX
timestamp
```

karşılaştırılmalı.

Tek bir byte farkı bile problemi açıklayabilir.

---

## 17. Cihaz neden şu aşamada değiştirilmemeli?

Çünkü elimizde güçlü bir kontrollü A/B testi var:

```text
Aynı cihaz
   │
   ├── MotoCortex → FAIL
   │
   └── Infocar → PASS
```

Değişen temel değişken uygulamadır.

Dolayısıyla ilk araştırılması gereken:

# MotoCortex connectivity stack

---

## 18. ECU problemi ihtimali

Eğer Infocar aynı araç ve adaptörle ECU bilgisi, VIN, DTC veya live data okuyabiliyorsa ECU ihtimali çok düşüktür.

---

## 19. Önceki QA raporuyla ilişkisi

Bu saha testi, önceki kod incelemesindeki bazı riskleri gerçek cihaz davranışıyla destekliyor:

- Android native BLE
- ProtocolNegotiator
- RX/TX framing
- command sequencing
- initialization
- clone compatibility

Bunlar artık yalnızca teorik riskler değil; gerçek saha failure investigation konularıdır.

---

## 20. Nihai QA değerlendirmesi

| Bileşen | Değerlendirme |
|---|---|
| Adaptör | 🟢 Muhtemelen sağlam |
| Bluetooth physical link | 🟢 Büyük ihtimalle çalışıyor |
| ECU | 🟢 Büyük ihtimalle sağlam |
| MotoCortex TX | 🟢 Çalışıyor |
| MotoCortex RX | 🟠 Şüpheli |
| ELM initialization | 🔴 FAIL |
| Protocol negotiation | 🔴 FAIL |
| ECU handshake | 🔴 Ulaşılamamış |

---

## 21. Sonuç

### Cihazı değiştirmeyin.

Şu aşamada cihazın arızalı olduğunu düşünmek için yeterli kanıt yok.

Tam tersine Infocar'ın aynı cihazla uygulama açılır açılmaz bağlanması, MotoCortex tarafındaki connectivity problemine güçlü kanıt sağlıyor.

En büyük şüpheliler:

```text
1. Android BLE native transport
2. TX line termination / CRLF
3. RX chunk handling
4. ELM prompt handling
5. ATZ → ATI initialization sequence
6. ATWS kullanımı
7. SP0 → ATPC → ATWS → SP6 fallback zinciri
8. timeout sonrası yanlış fallback
```

---

## 22. En değerli sonraki QA testi

Kod değiştirmeden önce MotoCortex'tan yalnızca:

```text
ATI
```

gönderilip cihazdan gelen cevabın:

- RAW HEX
- ASCII
- timestamp
- chunk boundary

olarak kaydedilmesi gerekir.

### A

```text
TX = 41 54 49 0D
RX = 45 4C 4D 33 32 37 ...
```

Bluetooth/ELM fiziksel transport çalışıyor.

→ Parser/initialization zincirine odaklanılır.

### B

```text
TX = 41 54 49 0D
RX = 3F 20
```

Cihaz command framing/line-ending/transport davranışı araştırılır.

### C

```text
TX = 41 54 49 0D
RX = yok
```

Android native BLE write/notify path'i doğrudan Infocar ile karşılaştırılmalıdır.

---

# Nihai karar

**Adaptör arızası:** düşük olasılık  
**ECU arızası:** çok düşük olasılık  
**MotoCortex bağlantı stack problemi:** yüksek olasılık

Bu saha testi, MotoCortex'un global uyumluluğu açısından özellikle **ELM327 clone compatibility + Android BLE + command framing + initialization sequence** alanlarının yeniden test edilmesi gerektiğini gösteriyor.
