# MotoCortex - 2. Faz Kod & Mimari Denetim Raporu

## 1. Giriş ve Amaç
Bu rapor, **MotoCortex** projesinde gerçekleştirilen güncellemeler doğrultusunda projenin küresel pazarda, farklı donanım/çip varyasyonlarında (PIC18F25K80, vLinker, STN1110, sahte ELM327 v2.1/v1.5) ve mobil işletim sistemlerinin (iOS/Android) katı kısıtları altında sorunsuz çalışabilmesi için hazırlanan **2. Faz Denetim ve Hata Analiz Raporu**dur.

---

## 2. BLE ve Stream Reassembly (iOS / Android) Katmanı Analizi

### Gerçekleştirilmiş Olması Gereken İyileştirme
Klon BLE adaptörlerin MTU boyutunu 23 bayt seviyesinde tutması ve çoklu paket yanıtlarını (örneğin Mode 09 VIN okuma veya uzun UDS yanıtları) parçalı göndermesi durumunda verinin bozulmadan birleştirilmesi.

### Potansiyel Mantık Boşlukları ve Kritik Hata Riskleri
* **String Temelli Birleştirme Tuzağı:** Gelen veriyi ham bayt (`byte array` / `Uint8List`) yerine doğrudan UTF-8 veya ASCII String'e dönüştürerek `buffer += chunk` şeklinde birleştiriyorsan, paket kayıplarında hex karakter kümesi bozulur (`41 0C` yerine parçalanmış gecikmeli `41` ve `0C` ayrı paketler halinde geldiğinde parser `41`'i eksik paket sayıp düşürür).
* **Delimiter (`>`) Bağımlılığı:** Klon BLE çiplerinde `AT S0` (Spaces Off) komutu verilse bile cihaz bazen `>` (prompt) karakterini paketin sonuna eklemeyi unutur veya gürültülü hatta `>` karakteri hiç ulaşmaz.
* **Kritik Risk:** Eğer buffer temizleme mekanizman sadece `>` karakterine bağlıysa, tek bir kayıp pakette `Notify` akışındaki sonraki tüm telemetri verileri önceki hatalı buffer'ın üzerine eklenir ve uygulama kapatılana kadar telemetri verisi durur veya yanlış parse edilir (RPM = 0 veya aşırı yüksek değer gösterir).

---

## 3. Klon ELM327 Defektleri ve Yazılımsal ISO-TP Fallback Analizi

### Gerçekleştirilmiş Olması Gereken İyileştirme
Sahte ELM327 v2.1/v1.5 çiplerinde Otomatik ISO-TP (`AT CAF1`) komutunun çalışmaması veya `AT CRA` (Rx Address Filter) komutunun `?` hatası vermesi durumuna karşı yazılımsal katman.

### Potansiyel Mantık Boşlukları ve Kritik Hata Riskleri
* **Flow Control ($ST_{min}$) Zaman Aşımları:** Adaptör `AT CAF0` (Framing Off) moduna geçirilip ISO-TP yönetimi mobil uygulamaya devredildiğinde; mobil uygulama ECU'dan gelen **First Frame (`10 xx`)** paketini alıp Bluetooth üzerinden ECU'ya **Flow Control (`30 00 00`)** paketini gönderene kadar geçen süre (round-trip latency) 50-100ms'yi bulabilir.
* **ECU Timeout Riski:** ECU standartlarında $N_{Bs}$ timeout süresi genelde 75-100ms arasındadır. BLE iletim gecikmesi nedeniyle mobil uygulamanın gönderdiği `Flow Control` paketi ECU'ya geç ulaştığında ECU oturumu kapatır (`Session Aborted`).
* **Kritik Risk:** Yalnızca yazılımsal ISO-TP birleştirmesi eklemek yetmez; uygulamanın BLE paket gönderim kuyruğuna (Write Queue) Flow Control paketlerini **en yüksek öncelikle (High Priority Interrupt)** sokması gerekir. Normal telemetri sorguları bu yanıtın önüne geçerse çoklu paket okumaları her zaman başarısız olur.

---

## 4. Motosiklet K-Line (ISO 14230 / KWP2000) ve Standart Dışı CAN Fallback Analizi

### Gerçekleştirilmiş Olması Gereken İyileştirme
Motosikletlerde `AT SP 0` (Auto) komutunun kilitlenmesini engellemek için sıralı manuel protokol denemeleri (`AT SP 6`, `AT SP 7`, `AT SP 8`, `AT SP 5`, `AT SP 4`).

### Potansiyel Mantık Boşlukları ve Kritik Hata Riskleri
* **Protokol Geçişlerinde Soft-Reset Unutulması:** Bir protokolden diğerine geçerken (örneğin CAN 500k -> KWP2000 Fast Init) ELM327 içindeki dahili CAN transceiver ve K-Line hat sürücüleri önceki başarısız denemenin bus hatası (`BUS ERROR`) durumunda kalabilir.
* **Kritik Risk:** `AT SP 5` komutunu göndermeden önce donanıma `AT Z` (Reset) veya en azından `AT PC` (Protocol Close) atılmazsa, çip dahili state machine'ini sıfırlamadığı için doğru protokole geçilse dahi ECU yanıt vermez.
* **K-Line Bus Quiet Time İhlali:** KWP2000 Fast Init (`AT SP 5`) başarısız olduğunda, K-Line hattının tekrar regüle olabilmesi için ISO standartları gereği hat üzerinde minimum 300ms hiçbir verinin akmadığı bir "Bus Quiet Time" kalmalıdır. Kodun art arda komut gönderiyorsa, hattaki gürültü nedeniyle 5-Baud Init (`AT SP 4`) de başarısız olacaktır.

---

## 5. Android Background Service & Silent Socket Drop Analizi

### Gerçekleştirilmiş Olması Gereken İyileştirme
Android işletim sisteminin arka planda I/O thread'lerini dondurması veya kopan RFCOMM soketini algılayamaması durumuna karşı koruma.

### Potansiyel Mantık Boşlukları ve Kritik Hata Riskleri
* **Blocking I/O Kilitlenmesi:** Standart Java/Kotlin `BluetoothSocket.inputStream.read()` çağrısı bloklayıcıdır (blocking call). Fiziki bağlantı koptuğunda (örneğin adaptörün fişi çekildiğinde veya araçtan uzaklaşıldığında) soket nesnesi `isConnected = true` kalır ve `read()` metodu sonsuza kadar beklemeye girer.
* **Kritik Risk:** Eğer okuma işlemi bir Timeout sarmalayıcısı (örneğin `CompletableFuture.supplyAsync` ile timeout veya Coroutine `withTimeout`) ile sarmalanmadıysa, arka plan thread'i kilitli kalır. Uygulama kullanıcının yeniden bağlanma isteklerine yanıt vermez, UI kilitlenir veya arka plan servisi ANR (Application Not Responding) hatası vererek çöker.

---

## 6. Mimari Sınama Soruları ve Doğrulama Kriterleri

1. **BLE Frame Reassembly:** MTU parçalanması durumunda gelen bayt dizisini birleştirmek için `StreamTransformer` veya özel bir `State Machine` mimarisi mi kullandın, yoksa veriyi String'e çevirip Regex ile mi süzüyorsun? Regex kullanıyorsan yarım gelen hex paketlerinde yaşanacak veri kaybını nasıl engelledin?
2. **ISO-TP Flow Control Latency:** `AT CAF0` modunda mobil uygulama üzerinden `Flow Control (30 00 00)` gönderirken BLE yazma kuyruğundaki (Write Queue) diğer telemetri PID sorgularını temizleyip (flush) bu pakete öncelik tanıyan bir mekanizma kurdun mu?
3. **K-Line Reset Stratejisi:** `AT SP 0` otoseçimi başarısız olduğunda, manuel fallback dizisine (`AT SP 6`, `AT SP 5` vb.) geçmeden önce donanım register'larını temizlemek için hangi reset komut sırasını uyguluyorsun? İki protokol denemesi arasında beklettiğin bus quiet time kaç milisaniyedir?
4. **Android Read Timeout:** Arka plan RFCOMM okuma thread'inde `InputStream.read()` işleminin bloklu kalmaması için zaman kapsüllü (time-gated) timeout ve izole socket-reconnect yapısını nasıl kurguladın?
