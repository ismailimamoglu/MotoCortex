# OBD2 Kablosuz Bağlantı Protokolleri ve Stabil Bağlantı Raporu
**Kapsam:** Binek araç, hafif ticari araç, motosiklet, kamyon ve ağır tonajlı araçlar için WiFi/Bluetooth OBD2 bağlantısı — global uygulama seviyesinde stabilite gereksinimleri

---

## 1. Genel Mimari: Adaptör → Telefon Arasındaki 3 Bağlantı Yolu

Piyasadaki tüm OBD2 dongle'ları (ELM327 ve klonları, STN11xx tabanlı OBDLink ailesi, J2534 cihazları) araca 3 yoldan biriyle bağlanır. Uygulamanızın **her üçünü de** desteklemesi gerekir çünkü hiçbiri tek başına global pazarı kapsamaz:

| Bağlantı Tipi | Taşıma Katmanı | Android | iOS |
|---|---|---|---|
| **WiFi** | TCP/IP soket (genelde port 35000, bazı klonlarda 23/8080) | ✅ | ✅ |
| **Bluetooth Classic (SPP/RFCOMM)** | Seri port emülasyonu | ✅ Native destek | ❌ Sadece **MFi sertifikalı** cihazlarla |
| **Bluetooth Low Energy (BLE/GATT)** | Custom GATT servisi (üreticiye göre farklı UUID) | ✅ | ✅ |

**Kritik nokta:** Piyasadaki ucuz ELM327 klonlarının büyük bölümü Bluetooth Classic (SPP) kullanır — bu cihazlar Android'de sorunsuz çalışır ama **iOS'ta hiç görünmez**, çünkü Apple 3. parti donanımlarda SPP'yi yalnızca MFi lisanslı çiplerde (örn. OBDLink MX+) açar. iOS tarafında kullanıcıya güvenilir deneyim vermek için ya BLE dongle'ları hedeflemeniz ya da WiFi'ye yönlendirmeniz gerekir.

---

## 2. Araç Sınıfına Göre Desteklenmesi Gereken Protokoller

### 2.1 Binek Araç ve Hafif Ticari Araç (OBD-II / EOBD)

| Protokol | Bit/Baud | Bölge / Dönem |
|---|---|---|
| ISO 15765-4 (CAN, 11-bit ID) | 500 kbps | ABD 2008+, AB/global çoğu araç |
| ISO 15765-4 (CAN, 29-bit ID) | 500 kbps | Bazı Avrupa/Asya markaları |
| ISO 15765-4 (CAN) | 250 kbps | Bazı Asya/Avrupa markaları (yavaş CAN) |
| ISO 9141-2 | 10.4 kbps, K-Line | Avrupa/Asya 2000-2005 civarı |
| ISO 14230-4 (KWP2000, fast/slow init) | 10.4 kbps | Avrupa/Asya 2000-2005 civarı |
| SAE J1850 PWM | 41.6 kbps | Eski Ford (ABD) |
| SAE J1850 VPW | 10.4 kbps | Eski GM (ABD) |
| **CAN-FD** (yeni nesil) | 2-8 Mbps veri fazı | 2019+ bazı modeller (VW MEB, GM vb.) — standart ELM327 desteklemez, STN2120 gibi gelişmiş çipler gerekir |
| **DoIP** (Diagnostics over IP) | Ethernet tabanlı | Yeni nesil Avrupa premium araçlar (UDS/ISO 13400) |

> Standart bir ELM327 (v1.5/v2.1/v2.3) bu protokollerin **ilk 6'sını otomatik algılar** (ATSP0 komutu ile). CAN-FD ve DoIP için ayrı donanım desteği şarttır — global filo uygulamasıysanız bu ikisini yol haritasına almanız önerilir.

### 2.2 Motosiklet

Motosikletlerde durum dağınıktır çünkü **evrensel bir OBD-II zorunluluğu binek araçlar kadar net değildir** (AB'de Euro 5 sonrası kısmi OBD zorunluluğu var, ABD'de yok):

- Çoğu motosiklet **K-Line (ISO 9141-2 / ISO 14230)** veya düşük hızlı **CAN** kullanır.
- Marka bazlı proprietary protokoller yaygındır: Honda HDS, Ducati DDS, BMW Motorrad ISTA, Yamaha YDIS — bunlar standart ELM327 ile **kısmen veya hiç** okunamaz, özel adaptör/lisans gerektirir.
- 16-pin OBD konnektörü bile standart değildir; birçok modelde farklı pinout veya adaptör kablosu gerekir.
- **Öneri:** Motosiklet desteğini "temel PID okuma" (RPM, hız, motor sıcaklığı — Mode 01) ile sınırlı tutup, marka-özel arıza kodu (DTC) okuma için ayrı bir yol haritası/uyarı ekranı planlayın.

### 2.3 Kamyon ve Ağır Tonajlı Araç (HD/Heavy-Duty)

| Protokol | Bit/Baud | Notlar |
|---|---|---|
| **SAE J1939** | CAN 29-bit, 250 kbps (bazen 500 kbps yeni nesil) | Ana ağır ticari standardı — kamyon, otobüs, iş makinesi |
| **SAE J1708/J1587** | 9600 baud, seri hat | Eski nesil (2000 öncesi), hâlâ sahada çok sayıda araç var, azalarak kullanımda |
| **SAE J1922** | J1708 üzerinde | Bazı motor kontrolcülerinde |
| **SAE J1979-2 (OBDonUDS)** | UDS/CAN tabanlı | **2027 model yılından itibaren zorunlu** (Volvo/Mack bazı modellerde 2024'ten beri kullanımda) — CARB Clean Truck Check programı bu geçişi destekliyor |

**J1939'un davranış farkı önemlidir:** Binek araç OBD'sinde uygulama "soru sorar, ECU cevap verir" (query-response). J1939'da ise ECU'lar sürekli **broadcast** yayın yapar (PGN — Parameter Group Number bazlı). Uygulamanızın CAN veri yolunu **pasif dinleme** moduna alıp gelen PGN'leri filtreleyerek işlemesi gerekir — bu, mimari olarak binek araç modülünden ayrı bir "HD modu" yazmanızı gerektirir.

---

## 3. WiFi Protokolü — Teknik Detaylar

- Adaptör genelde kendi WiFi erişim noktasını (AP) yayınlar (SSID: `WiFi_OBDII`, `OBDII` vb.) veya "station mode" ile evin/aracın ağına bağlanabilir.
- Uygulama TCP soketi ile adaptörün IP'sine (genelde `192.168.0.10`) belirli bir porttan (çoğunlukla **35000**, bazı klonlarda 23 veya 8080) bağlanır ve ELM327 AT komutlarını düz metin olarak gönderir/alır.
- **Avantaj:** iOS/Android farkı yok, platform bağımsız, daha yüksek veri hızı (canlı grafik/telemetri için idealdir).
- **Dezavantaj:** Telefon WiFi'si adaptöre bağlıyken mobil veri/internet erişimi kesilebilir (özellikle Android'de "internet yok" uyarısı ile ağdan otomatik kopma riski) — uygulamada `NetworkRequest` / `ConnectivityManager.bindProcessToNetwork` (Android) veya `NEHotspotConfiguration` (iOS) ile ağı sabitlemeniz gerekir, yoksa işletim sistemi bağlantıyı internetli ağa geri düşürüp OBD bağlantısını koparır.

---

## 4. Bluetooth Protokolleri — Teknik Detaylar

### 4.1 Bluetooth Classic (SPP / RFCOMM)
- Seri port emülasyonu, düşük gecikme, yüksek veri hızı (~300-400 KB/s pratik verim).
- Android'de native destekli, sistem eşleştirme ekranından veya doğrudan `BluetoothSocket` ile bağlanılabilir.
- **iOS'ta desteklenmez** (MFi sertifikasız cihazlarda).

### 4.2 Bluetooth Low Energy (BLE / GATT)
- Cihaz kendi custom GATT servis/karakteristik UUID'leriyle çalışır — üreticiden üreticiye **farklıdır** (STN1170, Vgate iCar Pro BLE, Veepeak BLE hepsi ayrı UUID seti kullanabilir). Global uygulamanız için bilinen adaptör modellerinin UUID tablosunu tutmanız ve otomatik keşif (GATT service discovery) mekanizması kurmanız gerekir.
- iOS ve Android'de aynı şekilde çalışır, sistem eşleştirme ekranına ihtiyaç duymadan uygulama içinden doğrudan bağlanılabilir — bu da kullanıcı deneyimini basitleştirir.
- Düşük veri hızı BLE'nin dezavantajıdır; yüksek frekanslı canlı veri (örn. 20+ PID/saniye) akışında paket kaybı/gecikme riski WiFi ve Classic'e göre daha yüksektir.

### 4.3 MFi (Made for iPhone)
- Apple'ın kendi lisanslı Bluetooth Classic varyantı (iAP protokolü üzerinden). Yalnızca MFi lisanslı çipler (örn. OBDLink MX+) destekler. Global iOS kapsamı istiyorsanız bu segmenti de test matrisine almanız önerilir, ancak donanım maliyeti daha yüksektir.

---

## 5. Global Ölçekte Stabil Bağlantı İçin Yapılması Gerekenler

### 5.1 Donanım/Protokol Seviyesi
- **Otomatik protokol algılama (ATSP0)** kullanın, ardından tespit edilen protokolü önbelleğe alıp bir sonraki bağlantıda doğrudan o protokolle başlatın (`ATSP<n>`) — algılama süresini kısaltır.
- **ELM327 klon sorunları:** Piyasadaki klonların büyük kısmı sahte firmware versiyonu bildirir (`v1.5`, `v3.0` gibi gerçekte var olmayan sürümler) ve bazı AT komutlarını (`ATCAF`, uzun mesaj flow control) hatalı uygular. Uygulamanızda "klon toleranslı" bir komut seti ve zaman aşımı stratejisi kullanın; tek bir "resmi" davranış varsayımıyla kodlamayın.
- **ISO-TP çok çerçeveli (multi-frame) mesajlarda flow control** (`ATFCSH`, `ATFCSD`, `ATFCSM`) parametrelerini doğru ayarlamazsanız uzun DTC/PID cevaplarında veri kaybı yaşanır — özellikle CAN 29-bit araçlarda test edin.

### 5.2 Bağlantı Durum Makinesi (Connection State Machine)
- Basit "bağlan/bağlanamadı" ikilisi yerine: **Tarama → Eşleştirme/Handshake → Init (ATZ, ATE0, ATL0, ATSP0) → Protokol Doğrulama → Hazır → Veri Akışı → Kopma Algılama → Otomatik Yeniden Bağlanma** aşamalarını ayrı ayrı yönetin.
- **Otomatik yeniden bağlanma (auto-reconnect)** exponential backoff ile (örn. 1s, 2s, 4s, 8s, max 30s) — araç motoru durup kalktığında (adaptör güç kesintisi) bağlantı sessizce düşer, kullanıcıya fark ettirmeden arka planda toparlamalısınız.
- **Heartbeat/keep-alive**: Belirli aralıklarla hafif bir komut (`ATRV` — voltaj oku) göndererek bağlantının canlı olduğunu doğrulayın; sessiz kopmaları (soket açık ama veri akmıyor) böyle yakalarsınız.

### 5.3 Platform Bazlı Davranış
- **Android:** Hem Classic SPP hem BLE'yi destekleyin; kullanıcıya cihaz tipini otomatik tespit ettirin (BLE cihazlar genelde `00001101-...` yerine custom UUID yayınlar — GATT taraması ile ayırt edin).
- **iOS:** BLE veya MFi olmayan cihazları uygulama içinde **filtreleyin ve kullanıcıyı uyarın** ("Bu adaptör iPhone ile uyumlu değildir, WiFi veya BLE modelini kullanın") — aksi halde kullanıcı deneyimi "bağlanmıyor" şikayetine dönüşür.
- **WiFi ağ sabitleme:** Adaptöre bağlıyken telefonun internet bağlantısını kaybetmemesi için Android'de `ConnectivityManager` ile ağı bind edin, iOS'ta `NEHotspotConfiguration`/`NWConnection` kullanarak WiFi OBD ağını uygulamaya özel tutun.

### 5.4 Ağır Ticari (HD) Modu İçin Ek Mimari
- J1939 broadcast trafiğini dinlerken CPU/pil tüketimini kontrol altında tutmak için **PGN filtreleme** yapın (yalnızca ihtiyaç duyulan Parameter Group'ları işleyin, tüm veri yolunu ham işlemeyin).
- J1708/J1587 desteği için ayrı bir donanım/çip gerekebilir (ELM327 bunu desteklemez, ELM325/327 farklı IC'ler bu işi yapar) — filo uygulamanızda eski model kamyon desteği hedefliyorsanız bu donanım gereksinimini ürün gereksinimlerine ekleyin.
- 2027 model yılı geçişini (SAE J1979-2 / OBDonUDS) yol haritanıza şimdiden alın; bazı Volvo/Mack modelleri 2024'ten itibaren bu protokole geçti.

### 5.5 Güç/Pil Yönetimi
- Sürekli bağlı WiFi/BT dongle'lar araç kapalıyken 30-100 mA çekerek aracın aküsünü haftalar içinde bitirebilir. Uygulamanızda kullanıcıyı "uyku moduna geçen adaptör" kullanmaya yönlendirin ve uzun süreli bağlantısızlıkta uyarı verin.

### 5.6 Güvenlik
- BLE ve WiFi bağlantılarında eşleştirme/pairing PIN doğrulamasını atlamayın; açık WiFi AP'li adaptörlerde (şifresiz SSID) MITM riskine karşı uygulama seviyesinde ek bir handshake/doğrulama katmanı düşünün, özellikle filo/ticari araç verisi taşıyan uygulamalarda.

---

## 6. Özet Tablo — Öncelik Sırası

| Araç Sınıfı | Zorunlu Protokoller | Kablosuz Öncelik |
|---|---|---|
| Binek/Hafif Ticari | ISO 15765-4 CAN (11/29-bit), ISO 9141-2, KWP2000 | WiFi + BLE (iOS) + Classic (Android) |
| Motosiklet | K-Line, temel CAN — marka-özel DTC ayrı modül | WiFi öncelikli, sınırlı PID seti |
| Kamyon/Ağır Tonaj | SAE J1939 (öncelik), J1708/J1587 (legacy), J1979-2 (2027+) | WiFi/BLE, pasif dinleme mimarisi |

Bu rapor, uygulamanızın protokol katmanını (adaptör iletişimi) ve bağlantı katmanını (kablosuz stabilite) ayrı ayrı ele almanız gerektiğini gösteriyor: protokol desteği araç sınıfına göre genişletilebilir bir "driver" mimarisiyle, bağlantı stabilitesi ise platform-bazlı (iOS/Android) ayrı bir durum makinesiyle çözülmeli.
