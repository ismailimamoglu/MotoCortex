# MotoCortex - 3. Faz İleri Düzey Saha ve Protokol Stres Testi Raporu

Gerçekleştirilen güncellemelerin MotoCortex'i küresel pazarda "üretim seviyesinde" (production-ready) kılabilmesi için, uygulamanın sadece ideal laboratuvar koşullarında değil, araç içi elektriksel gürültü, yüksek CAN veri yükü ve kararsız çip seti davranışları altında test edilmesi gerekir. Güncellenen kod tabanının gözden kaçırmış olabileceği ileri düzey mimari riskler ve saha defektleri aşağıda analiz edilmiştir.

---

## 1. CAN Bus Yüksek Trafik (>%80 Bus Load) ve Frame Dropping Yönetimi

Motosikletlerde ve performans otomobillerinde CAN bus hattı üzerindeki trafik, ABS, ECU, Gösterge ve TC (Traction Control) modüllerinin aynı anda yayın yapması nedeniyle hattan hatta ciddi şekilde yoğunlaşır.

### Kritik Saha Riskleri
* **ELM327 Rx Buffer Overrun:** Klon adaptörlerin dahili CAN alıcı-vericisi (transceiver) yüksek veri trafiğinde paketleri tampona alamayıp `CAN ERROR` veya `BUFFER FULL` üretir.
* **Non-Blocking Write Queue Kilitlenmesi:** Uygulama tarafından ECU'ya gönderilen yeni PID isteği, önceki isteğin yanıtı tam olarak işlenmeden Bluetooth soketine yazılırsa (`write`), klon çip içindeki komut işleyici (command processor) kilitlenir ve cihaz kendini resetleyene kadar hiçbir komuta yanıt vermez.
* **Analiz Kriteri:** Telemetri motorunun, yazma işlemi öncesinde donanımdan gelen bir önceki `>` (prompt) karakterini bekleme mantığını **hard-timeout** ile sınırlandırıp sınırlandırmadığı kontrol edilmelidir. `>` karakteri paket kaybıyla gelmediğinde yazma kuyruğunun sonsuza kadar askıda kalmaması gerekir.

---

## 2. Klon Adaptörlerde Kesintili Echo (Intermittent Echo) ve Parsing Kırılmaları

Ucuz ELM327 klonlarında `AT E0` (Echo Off) komutu verilse dahi, cihaz ısındığında veya veri hızı arttığında gönderilen komutun bir kısmını (`010C` yerine `0C` veya `01`) gelen yanıtın başına rastgele ekleyebilir.

### Kritik Saha Riskleri
* **Inconsistent Echo Parsing:** Parser, yanıtın her zaman temiz bir `41 0C XX YY` formatında geleceğini varsayıyorsa; donanımdan gelen `010C410CXXYY` veya `C410CXXYY` gibi bozuk ekolar sayısal hesaplama fonksiyonunda (örneğin RPM = `((A*256)+B)/4`) yanlış baytların ($A$ ve $B$) seçilmesine yol açar.
* **Analiz Kriteri:** Parsing katmanı, gelen verinin başındaki yankıyı (echo) temizlerken sabit string kesme (substring) yapmak yerine, yanıtın Service ID (`Mode + 0x40`, örn. `01` için `41`, `22` için `62`) baytını **dinamik indeks arama** yöntemiyle bulmalıdır.

---

## 3. UDS NRC (Negative Response Code) ve Dinamik Retry Hiyerarşisi

UDS (ISO 14229) mimarisinde ECU, istekleri her zaman kabul etmez. Araç durumu uygun olmadığında (örneğin motor çalışırken arıza kodu silmeye çalışıldığında veya araç hareket halindeyken yetkisiz DID istendiğinde) ECU bir **NRC (Negative Response Code)** döndürür.

```
İstek:  7E0 03 22 10 01 (DID 0x1001 Okuma İsteği)
Yanıt:  7E8 03 7F 22 22 (7F: Negative Response, 22: Service, 22: Conditions Not Correct)
```

### Kritik Saha Riskleri
* **NRC Algılama Yetersizliği:** Uygulama gelen yanıtı `7F` baytı kontrolüne sokmadan doğrudan başarı varsayımıyla parse etmeye çalışırsa, arıza kodları veya canlı değerler yerine NRC hata kodunun kendisini veri olarak işler.
* **Yaygın NRC Kodları ve Beklenen Tepkiler:**
  * `0x7F 22 22` (Conditions Not Correct): İstek tekrarlanmamalı, kullanıcıya araç durumunun (örn. kontağın açık fakat motorun kapalı olması gerekliliği) uygun olmadığı bildirilmeli.
  * `0x7F 22 33` (Security Access Denied): Oturum kilitlenmeli ve güvenlik anahtarı (Seed-Key) akışı başlatılmalı.
  * `0x7F 22 78` (Request Correctly Received-Response Pending): İletişim zaman aşımı (timeout) süresi derhal 2000ms-5000ms seviyesine çekilerek ECU'nun işlemi bitirmesi beklenmeli.

---

## 4. iOS CoreBluetooth State Restoration ve Memory Pressure Yönetimi

iOS işletim sistemi, arka planda çalışan Bluetooth uygulamalarını bellek ihtiyacı doğduğunda bildirimsiz şekilde öldürür (terminate eder).

### Kritik Saha Riskleri
* **Delegate Reference Leak:** iOS uygulaması `CBCentralManagerOptionRestoreIdentifierKey` ile yeniden canlandırıldığında (`willRestoreState`), önceden bağlı olan `CBPeripheral` nesnesinin `delegate` ataması kopmuş olabilir.
* **Analiz Kriteri:** Uygulama arka planda iOS tarafından yeniden başlatıldığında, taranan servisler ve karakteristikler (`CBCharacteristic`) tekrar `setDelegate(self)` ile bağlanmıyorsa, arka plandaki telemetri veri akışı (`didUpdateValueFor`) sessizce durur.

---

## 5. Mimari Sınama Soruları ve Doğrulama Kriterleri

1. **Service ID (SID) Hataları:** ECU'dan gelen yanıt içerisinde `0x7F` (NRC) tespit ettiğinde, telemetry motorun bu hatayı bir "bağlantı kopması" sayıp yeniden mi bağlanmaya çalışıyor, yoksa hatanın türüne göre (`0x78` vs `0x22`) retry politikası mı uyguluyor?
2. **Klon Echo Temizliği:** Gelen veri paketi içerisinde `Mode + 0x40` yanıt başlığı aranırken, verinin ortasında tesadüfen bu bayta eşit bir sensör değeri (örneğin RPM değerinin `0x41` veya `0x62` olması) gelirse parser'ın bunu yanıt başlığı sanmasını nasıl engelliyorsun?
3. **Write Queue Pacing:** Bluetooth katmanında bir komut gönderildikten sonra donanımdan `>` karakteri gelmezse, yazma kuyruğu kaç milisaniye sonra zaman aşımına düşüp kuyruktaki diğer paketleri fırlatıyor (drop ediyor)?
4. **iOS State Restoration:** `willRestoreState` metodu tetiklendiğinde, `CBCentralManager` tarafından geri yüklenen `CBPeripheral` dizisindeki her bir cihaz için `Notify` aboneliğini (`setNotifyValue(true, for: characteristic)`) re-subscribe mekanizmasına aldın mı?
