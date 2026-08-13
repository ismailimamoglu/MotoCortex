# MotoCortex — Global Bağlantı Güvenilirliği ve Ürünleşme Raporu

**İnceleme tarihi:** 12 Ağustos 2026  
**İncelenen dal:** GitHub `ismailimamoglu/MotoCortex` (sığ klon, inceleme anındaki çalışma ağacı)  
**Kapsam:** Android/iOS, Bluetooth Classic, BLE, Wi‑Fi ELM327, OBD/ECU ilk el sıkışması, saha testi ve global pazara çıkış hazırlığı.

---

## 1. Yönetici özeti

Saha gözleminiz çok kıymetli ve teşhis yönünü netleştiriyor: **aynı telefon + aynı adaptör + aynı araçta Infocar/Car Scanner bağlanırken MotoCortex bağlanamıyorsa, ilk varsayım araç veya adaptör arızası değil, MotoCortex’in taşıma/komut-zamanlama katmanıdır.**

Repo içindeki 11 Ağustos saha logu bunu doğrudan doğruluyor: ELM327 v1.5 adaptörü cevap veriyor, ECU tarafında ISO 15765-4 CAN seçilmiş görünüyor; fakat uygulama `AT SP` yanıtını yaklaşık 5,0–5,5 saniyede alırken eski 5 sn sınırı nedeniyle timeout’a düşüyor. Bu yüzden kritik `01 00` ECU ping’i gönderilemeden sonraki protokole geçiliyordu.

Olumlu gelişme: İncelenen güncel kaynakta bu spesifik P0 hata **büyük ölçüde düzeltilmiş**:

- CAN fallback zaman aşımı 8 sn,
- K-Line 9 sn,
- J1850 7 sn,
- `ATSPx` başarısız/timed-out olsa dahi `01 00` yine deneniyor,
- başlangıç benchmark komutları 5 sn seviyesine çıkarılmış.

Ancak uygulama henüz “global seviyede güvenilir bağlantı” eşiğinde değil. Bunun ana nedeni tek bir hata değil; iki paralel bağlantı mimarisi, agresif/karmaşık protokol taraması, gerçek donanım testinin otomatikleştirilmemiş olması ve BLE cihaz profillerinin deterministik olmamasıdır.

**Önerilen karar:** Yeni özellik, ECU yazma/kodlama ve pazarlama çalışmasını 2–3 hafta dondurun. Önce “Connection Reliability Release” çıkarın: sade handshake, ham trace, adaptör profili, cihaz/araç matrisi ve gerçek cihaz regresyonu.

---

## 2. Kanıt: sahadaki kök neden

Repo içindeki `görevler/FIELD_TEST_V3_ANALYSIS.md` şu akışı kaydediyor:

1. `AT Z` sonrasında geç/bozuk başlangıç (`?`) var; yani ucuz klon adaptör resetten sonra hemen hazır değil.
2. `ATI` ile `ELM327 v1.5`, `AT DP` ile `ISO 15765-4 (CAN 11/500)` cevabı alınmış. Bu, telefon–adaptör UART/BT yolunun ve adaptörün en azından temel AT komutlarının çalıştığını gösterir.
3. Eski akışta `AT SP 6/7/8/9` cevapları 5,0–5,5 sn civarında geliyor; uygulama timeout’u 4,5–5 sn olduğu için cevap gelmeden komut reddediliyor.
4. Hata yakalanınca `AT SH 7E0` ve `01 00` çalışmıyordu. Dolayısıyla “ECU bağlanmıyor” sonucu aslında ECU’ya yeterli ve doğru bir test yapılmadan üretiliyordu.

`01 00` doğru başlangıç kontrolüdür: OBD uyumlu emisyon ECU’ları Mode 01 PID 00’a yanıt verir ve desteklenen PID bit alanını döndürür. Bu nedenle “adapter connected” ile “ECU responded” durumları kesin olarak ayrılmalıdır.

---

## 3. Kaynak kod bulguları

### P0 — Saha hatasının güncel koddaki durumu: düzeltilmiş, cihazda yeniden kanıtlanmalı

**Dosya:** `src/hooks/useBluetooth.ts`

- `ATSP0` sonrasında `01 00` deneniyor.
- Fallback sırası CAN 11/500 → CAN 29/500 → CAN 11/250 → CAN 29/250 → J1939 → KWP → ISO9141 → J1850 şeklinde.
- Güncel süreler 8/9/7 sn’ye yükseltilmiş.
- `ATSPx` hatası `.catch()` ile loglanıyor ve ardından handshake deneniyor.

Bu doğru yönde bir düzeltme. Ancak tek gerçek saha cihazında, release APK/IPA ile tekrar doğrulanmadan “çözüldü” sayılmamalıdır.

**Kabul kriteri:** ELM327 v1.5 + aynı araçla 20 ardışık soğuk bağlantının en az 19’unda, 30 sn altında `41 00 ...` cevabı alınmalı. Her deneme ham logla kaydedilmelidir.

### P0 — `ATZ` komutu güvenlik kapısında yasaklı görünmektedir

**Dosya:** `src/api/OBD2ProtocolEngine.ts`

`BANNED_COMMANDS_CRITICAL` kümesinde `ATZ` var; aynı zamanda `ProtocolNegotiator.runBenchmark()` ilk olarak `ATZ` gönderiyor. Güvenlik engeli yalnızca araç hareket hâlinde aktif polling koşulunda çalışsa da, kritik bir adapter reset komutunun “tehlikeli ECU komutu” ile aynı kümede tutulması mimari olarak risklidir.

**Düzeltme:**
- `ATZ` için ayrı bir `ADAPTER_CONTROL` sınıfı tanımlayın.
- Sadece araç hareket halindeyken ve telemetri açıkken rate-limit edin; global yasakla karıştırmayın.
- Resetin gerçekten gerekli olup olmadığını adaptör profiline göre seçin. Klonlarda reset yerine `ATWS`/boş CR ya da doğrudan güvenli başlangıç daha kararlı olabilir.

### P0 — Zamanlama/cevap tamamlama mantığı CAN için aşırı agresif olabilir

**Dosya:** `src/api/OBD2ProtocolEngine.ts`

Prompt (`>`) gelmediyse CAN için 40 ms, K-Line için 400 ms “silence debounce” kullanılıyor. BLE paket parçalanması, Android scheduler gecikmesi veya klonların gecikmeli çok satırlı cevapları için **40 ms çok düşük** olabilir. Bu, tam cevap gelmeden komutu başarıyla tamamlanmış gibi kapatabilir; ardından geç kalan verinin sonraki komuta karışması, sahadaki “yarış” tipinde hatalara neden olur.

**Düzeltme:**
- Birincil bitiş koşulu `>` prompt olsun.
- Prompt yoksa, adaptör profilinden gelen idle süresini kullanın: CAN için ilk sürümde 150–250 ms, K-Line için 600–1000 ms.
- Her bayt/chunk geldiğinde idle sayacı yeniden başlasın.
- “prompt yok ama sessizlik var” cevabını `DEGRADED_COMPLETE` olarak etiketleyin; sonraki komuttan önce tek CR ile prompt senkronizasyonu yapın.
- Her komutta `tx_at`, ilk `rx_at`, son `rx_at`, prompt zamanı, timeout, ham TX/RX ve sonuç kodunu saklayın.

### P0 — Bağlantı mimarisi çift başlı; native modül ve aktif JS yolu ayrışmış

Uygulamanın gerçek akışı ağırlıklı olarak `BluetoothService.android.ts` / `.ios.ts` + `OBD2ProtocolEngine.ts` üzerinden çalışıyor. Buna karşın `modules/motocortex-obd` içinde Android/iOS için ikinci bir `OBDSessionManager`, queue ve transport katmanı bulunuyor. Modül JS tarafında esasen telemetri buffer için çağrılıyor.

Bu durum şu riski doğurur: Bir bug native modülde düzeltilir fakat üretimde kullanılan TypeScript yolu hâlâ eski davranır; ya da tam tersi. Bu, “kodda düzelttim ama saha cihazında değişmedi” türü sorunların en sık nedenlerinden biridir.

**Düzeltme:** Tek otoriter bağlantı katmanı seçin.

- **Kısa vadeli tercih:** Hızlı stabilizasyon için mevcut JS `BluetoothService + OBD2ProtocolEngine` yolunu tek kaynak kabul edin; native modülü telemetri buffer dışında devre dışı/izole edin.
- **Orta vadeli tercih:** Daha güvenilir GATT/RFCOMM kontrolü, background ve daha yüksek örnekleme gerekliyse command queue’yu native tarafa taşıyın; JS yalnızca UI/state sahibi olsun.
- Her iki durumda da bağlantı durumları tek enum ve tek olay akışıyla yayınlansın: `transport_connected → adapter_ready → protocol_selected → ecu_verified → telemetry_active`.

### P1 — Android BLE native transportu cihaz çeşitliliği için yeterince deterministik değil

**Dosya:** `modules/motocortex-obd/android/.../BLETransport.kt`

Bulgular:

- Bir karakteristik hem yazma hem bildirim için seçilmeye çalışılıyor. Birçok BLE OBD adaptöründe TX (write) ve RX (notify) karakteristikleri ayrıdır.
- GATT servis/karakteristik seçimi “ilk writable veya notifiable” yaklaşımına düşebiliyor; yanlış karakteristiğe bağlanma ihtimali var.
- CCCD yazıldıktan sonra `onDescriptorWrite` başarısı beklenmeden bağlantı başarılı sayılıyor.
- `writeCharacteristic` dönüş değeri, `onCharacteristicWrite` callback’i ve yazma kuyruğu kontrol edilmiyor.
- Android API 33+ için eski yazma API’si deprecated.

**Düzeltme:** Her adaptör için `serviceUuid`, `txCharUuid`, `rxCharUuid`, `writeType`, `MTU`, `interCommandDelay` içeren profil kullanın. Genel tarama sadece “bilinmeyen adaptör” modunda, kullanıcıya “experimental” uyarısıyla çalışsın. GATT işlemlerini callback tamamlanmadan sıraya alın; Android’in güncel `writeCharacteristic(characteristic, value, writeType)` API’sini kullanın.

### P1 — İzin manifesti temizlenmeli

Android 12+ için `BLUETOOTH_SCAN` ve `BLUETOOTH_CONNECT` doğru eklenmiş ve runtime’da isteniyor. Ancak legacy `BLUETOOTH`, `BLUETOOTH_ADMIN` ve konum izinleri `maxSdkVersion=30` ile sınırlandırılmamış; ayrıca uygulama `ACCESS_BACKGROUND_LOCATION` istiyor.

**Düzeltme:** Android manifestini minimum izin ilkesine göre düzenleyin. OBD bağlantısı için arka plan konumu gerekmedikçe kaldırın. Android 12+ cihazlarda eski izinleri 30 ile sınırlayın. Bu, hem Play policy riski hem kullanıcı güveni açısından önemlidir.

### P1 — iOS bağlantı gerçekleri ürün ekranında açık anlatılmalı

iOS, generic Bluetooth Classic SPP ELM327 adaptörlerine açık erişim vermez. iOS için BLE veya MFi uyumlu Classic Bluetooth ya da Wi‑Fi adapter gerekir. App Store’daki Car Scanner da Wi‑Fi veya Bluetooth 4.0/BLE ELM327 adaptörü şart koşar ve ucuz “v2.1” klonlara karşı uyarır.

**Ürün kuralı:** iOS’ta “Bluetooth” seçeneği gösterilmemeli; kullanıcıya açıkça **BLE OBD**, **Wi‑Fi OBD** veya desteklenen sertifikalı adaptör seçeneği gösterilmelidir. Android’de ise Classic, BLE ve Wi‑Fi ayrı taşıma türleri olarak belirtilmelidir.

### P2 — Global kalite engeli: testler bu incelemede çalıştırılamadı

`npm test -- --runInBand` komutu bağımlılıklar kurulu olmadığı için `jest: not found` ile bitti. Bu bir kod başarısızlığı kanıtı değildir; fakat CI/CD’de “temiz checkout → npm ci → lint → typecheck → jest” zincirinin zorunlu ve görünür olması gerektiğini gösterir.

---

## 4. Platform ve adaptör uyumluluk stratejisi

| Platform | Önerilen birincil yol | Destek seviyesi | Ürün notu |
|---|---|---:|---|
| Android | Bluetooth Classic SPP | Tam | Ucuz ELM327 klonlar için ana yol; önce Android sisteminde eşleşme gerekli olabilir. |
| Android | BLE GATT | Tam | UUID profil tabanlı olmalı; “ilk karakteristiği seç” yaklaşımı kullanılmamalı. |
| Android/iOS | Wi‑Fi TCP | Tam | Varsayılan IP/port otomatik denensin; kullanıcıya internetin geçici olarak kesilebileceği söylenmeli. |
| iOS | BLE GATT | Tam | En güvenli genel çözüm. Uygulama içinden bağlanma; iOS Settings pairing şart/uygun olmayabilir. |
| iOS | Bluetooth Classic SPP | Desteklemeyin | Ancak MFi/uyumlu özel aksesuar üzerinden ürünleştirilirse. |
| Her iki platform | OBDLink / STN tabanlı premium | Sertifikalı | Desteklenen adaptör listesinde Tier A olarak konumlandırılmalı. |

**Adaptör tier sistemi:**

- **Tier A — Sertifikalı:** MotoCortex ekibinin gerçek araçlarda test ettiği model/firmware/transport kombinasyonları. Varsayılan gelişmiş özellikler açık.
- **Tier B — Uyumlu:** Generic BLE, Classic veya Wi‑Fi ELM tarzı adaptörler. Güvenli başlangıç, düşük polling hızı, ham log toplama.
- **Tier C — Bilinmeyen/klon:** Sadece temel OBD Mode 01/03/04 varsayılan açık; yazma/kodlama/UDS kapalı; adaptör sağlık testi sonrası kullanıcıya açık risk mesajı.

Sadece “ELM327 v1.5/v2.1” yazısına güvenmeyin: klonlarda sürüm metni güvenilir bir donanım kimliği değildir. Davranışsal profile göre karar verin: reset süresi, prompt üretimi, `ATI`, `AT@1`, `ATDP`, CAN 11/500 `01 00` yanıtı, uzun ISO-TP cevap, 5 dakikalık polling kaybı.

---

## 5. Önerilen sade ve dayanıklı handshake

Mevcut yaklaşım çok sayıda AT komutu ve tüm protokol matrisini kullanıyor. Bu, “her araçta bağlanma” hedefinde paradoksal olarak hata yüzeyini büyütür. Önerilen safhalı algoritma:

1. **Transport hazır:** RFCOMM/BLE/Wi‑Fi bağlandı; RX listener bağlandı; izin ve bağlantı türü kaydedildi.
2. **Hat senkronizasyonu:** Boş `\r` gönder, 1–2 sn prompt bekle. Varsa reset atlama.
3. **Minimal adapter tanıma:** `ATI`, `AT@1` opsiyonel; başarısızlık bağlantıyı tek başına düşürmesin.
4. **Temel konfigürasyon:** `ATE0`, `ATL0`, `ATS0`, `ATH0`, `ATAT1`, `ATSP0`. Her adım “best effort”; sonucu profile yaz.
5. **ECU kanıtı:** `01 00` için yeterli timeout ile dene. Yalnız `41 00` (veya standart çoklu ECU yanıtı) ECU doğrulaması sayılır.
6. **Yalnız gerekirse fallback:** Önce araç/adaptör cache’i, sonra CAN 6/7/8/9; K-Line/J1850 ancak OBD port pin/ülke/araç profili sinyali varsa. Her protokol seçiminden sonra doğrudan `01 00`.
7. **Başarılı protokol cache’i:** Anahtar `adapter stable id + transport + VIN hash/make/model/year` olmalı. Bir sonraki bağlanmada doğrudan bu protokol; başarısız olursa cache invalidation.
8. **Capability discovery:** `01 20`, `01 40` vb. yalnız ECU kanıtından sonra, düşük öncelik ve iptal edilebilir kuyrukta çalışmalı.
9. **Telemetri:** Sadece doğrulanan PID’leri poll edin. Bir PID’nin başarısızlığı bağlantıyı düşürmesin.

Not: CAN’de `ATSH7E0` motor ECU yanıtını hedeflemeyi kolaylaştırabilir; fakat evrensel başlangıç için erken ve sabit header kullanmak bazı araçlarda yanlış ECU’ya kilitleyebilir. Önce fonksiyonel istek `7DF`/varsayılan akışla `01 00` edin, ardından ihtiyaç halinde fiziksel ECU header’ına geçin.

---

## 6. Saha test planı ve ölçülebilir kalite kapısı

### Zorunlu test matrisi

Her satırda Android ve iOS (uygunsa) gerçek cihazda ayrı ayrı test edilmelidir:

1. **Transport:** Classic / BLE / Wi‑Fi
2. **Adaptör:** en az iki ucuz klon, bir kaliteli generic BLE, bir Vgate/Veepeak sınıfı, bir OBDLink/STN sınıfı
3. **Araç protokolü:** CAN 11/500, CAN 29/500, CAN 250k, KWP/ISO9141, J1850 erişilebiliyorsa
4. **Araç yaşı ve segmenti:** eski model, 2010’lar, güncel araç; benzin/dizel/hibrit/EV ve motosiklet ayrı etiketlenmeli
5. **Telefon/OS:** en az Android 12, 14/15 ve güncel iOS; düşük pil, ekran kilidi, uygulamayı arka plana alma da denenmeli

### Her testte kaydedilecek veri

- Uygulama sürümü, commit SHA, build/OTA update ID
- Telefon modeli/OS, izin durumu, Bluetooth state
- Araç: marka/model/yıl/motor (VIN’in tamamı değil; hash/maskeleme)
- Adaptör adı, MAC/UUID hash, transport, `ATI`/`AT@1` cevabı
- Her komutun TX/RX’si, zaman damgası, timeout, prompt görülme durumu
- Seçilen protokol, `01 00` ham cevabı, ilk RPM/soğutma sıcaklığı sonucu
- Disconnect reason, yeniden bağlanma sayısı, session süresi

### Release gate (öneri)

- Tier A adaptörlerde ≥ %99 ilk bağlantı başarısı, p95 ECU doğrulama < 12 sn.
- Tier B’de ≥ %95, p95 < 25 sn.
- 30 dk aktif telemetride beklenmeyen kopma < %1 session.
- Bilinen başarısızlıkta kullanıcıya “izin / adapter / protocol / ECU yanıtı” katmanını doğru söyleyen hata sınıflandırması ≥ %95.
- Yeni release, test matrisindeki hiçbir Tier A kombinasyonda önceki sürümden kötü olamaz.

---

## 7. 30/60/90 gün yol haritası

### İlk 7 gün — Bağlantı kurtarma sürümü

1. Güncel 8/9/7 sn timeout ve `ATSP` sonrasında `01 00` deneme davranışını aynı saha araç/adaptöründe APK/IPA ile doğrulayın.
2. Ham bağlantı trace ekranı ekleyin: kullanıcı tek dokunuşla gizlilik maskeli `.json` rapor paylaşabilsin.
3. Başarısızlığı dört katmana ayırın: izin/BT, transport, adapter AT, ECU protocol.
4. `ATZ`/güvenlik sınıflandırma çakışmasını kaldırın.
5. 40 ms CAN silence completion’ı güvenli eşik ve prompt önceliğiyle değiştirin.

### 8–30 gün — Uyumluluk katmanı

1. Tek bağlantı otoritesi seçin ve kullanılmayan ikinci yolu kaldırın/izole edin.
2. AdapterProfileRegistry’yi gerçek UUID, yazma tipi, MTU, timeout ve safe-init komutlarıyla besleyin.
3. VIN/araç + adapter + transport protokol cache’i çıkarın.
4. Android manifest/izinleri Play policy’ye göre minimuma indirin.
5. Tier A/B/C destek sayfasını ve uygulama içi adapter seçiciyi yayınlayın.

### 31–90 gün — Global ürün güveni

1. Crowd-sourced ama onaylı uyumluluk veritabanı: kullanıcı trace’i ve araç metadatası gönüllü/anonim opt-in ile.
2. Crashlytics/Sentry tarzı hata telemetrisi: bağlantı fail reason, timeout dağılımı, adaptör profili başarısı.
3. Donanım partner programı: 2–4 adaptörü “MotoCortex Certified” olarak satılabilir/test edilebilir seviyeye getirin.
4. OBD-II generic okuyucuyu güvenilirleştirdikten sonra OEM PID/UDS/kodlama özelliklerini yalnız sertifikalı araç–adaptör kombinasyonlarında aşamalı açın.
5. Güvenlik, veri gizliliği, destek SLA’sı ve App Store/Play Store kalite materyallerini tamamlayın.

---

## 8. Global pazara çıkış için ürün önerisi

MotoCortex’i “her ELM klonuyla tüm ECU’lara bağlanır” diye konumlandırmayın; bu vaat teknik olarak sürdürülemez ve destek maliyetini patlatır. Daha doğru vaat:

> **“Doğrulanmış adaptörlerle güvenilir canlı OBD telemetrisi; bilinmeyen adaptörlerde şeffaf uyumluluk testi ve güvenli temel tanılama.”**

Üç kullanıcı akışı oluşturun:

- **Hızlı bağlan:** Sertifikalı adaptör + otomatik cache.
- **Adaptörümü test et:** 60 saniyelik teknik sağlık kontrolü, açık sonuç ve öneri.
- **Gelişmiş teşhis:** Araç/adaptör uyumluluğu kanıtlandıktan sonra OEM/UDS özellikleri.

Bu yaklaşım hem Infocar/Car Scanner’ın “kolay bağlanma” avantajını yakalar hem MotoCortex’in daha değerli analiz/araç sağlığı/performans ürününe dönüşmesini sağlar.

---

## 9. Araştırma kaynakları

1. Android Developers — Bluetooth izinleri: Android 12+ için `BLUETOOTH_SCAN` ve `BLUETOOTH_CONNECT` manifest + runtime izni; legacy izinlerin `maxSdkVersion=30` ile sınırlandırılması önerilir. https://developer.android.com/develop/connectivity/bluetooth/bt-permissions
2. Apple — Core Bluetooth background processing: `bluetooth-central` BLE central uygulamalarında belirli arka plan olayları için kullanılır; state preservation/restoration da tasarlanmalıdır. https://developer.apple.com/library/archive/documentation/NetworkingInternetWeb/Conceptual/CoreBluetooth_concepts/CoreBluetoothBackgroundProcessingForIOSApps/PerformingTasksWhileYourAppIsInTheBackground.html
3. Apple Developer Forums — iOS’ta SPP, BLE profili değildir; generic Classic SPP yolu iOS üçüncü taraf uygulamalarında uygun değildir. https://developer.apple.com/forums/thread/95083
4. Android Developers — `BluetoothGatt.writeCharacteristic` tamamlanması callback ile bildirilir; eski overload API 33’te deprecated’dir. https://developer.android.com/reference/android/bluetooth/BluetoothGatt
5. Car Scanner App Store listing — iOS’ta Wi‑Fi veya Bluetooth 4.0/BLE ELM327 gereksinimi ve ucuz v2.1 adaptör uyarısı. https://apps.apple.com/us/app/car-scanner-elm-obd2/id1259933623
6. CSS Electronics — SAE J1979/ISO 15031-5 bağlamında Mode 01 PID 00’ın temel OBD uyumluluk testi oluşu. https://www.csselectronics.com/pages/obd2-explained-simple-intro

---

## Sonuç

Mevcut saha hatasının doğrudan nedeni repo içindeki loglarla belirlenmiş ve kaynakta doğru yönde bir düzeltme görünmektedir. En kritik sonraki iş, bu düzeltmeyi gerçek APK/IPA ile aynı araç/adaptörde kanıtlamak; sonra komut tamamlanmasını prompt-merkezli hale getirmek ve çift bağlantı mimarisini tekleştirmektir. Bu üç adım tamamlanmadan global ölçek, gelişmiş ECU yazma veya geniş cihaz vaadi verilmemelidir.
