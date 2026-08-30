# OBD2 Bağlantı Protokolleri ve Stabil Bağlantı Raporu

Kapsam: Native mobil (iOS/Android) OBD2 uygulaması.
Araç sınıfları: binek, hafif ticari, motosiklet, kamyon/otobüs, ağır tonajlı araçlar.
Tarih: 2026-08-30

> Not: Protokol adları, AT komutları ve standart numaraları bilinçli olarak orijinal (İngilizce) biçimiyle bırakılmıştır.

---

## 0. Katman modeli — önce bunu netleştirin

OBD uygulamalarındaki karışıklığın %90'ı iki farklı katmanın birbirine karıştırılmasından çıkar:

```text
[ Telefon ]  <== TAŞIMA KATMANI ==>  [ Adaptör ]  <== ARAÇ İÇİ PROTOKOL ==>  [ ECU ]
              BT Classic SPP                        ISO 15765-4 CAN
              BLE GATT                              ISO 9141-2 / KWP2000
              MFi / iAP2                            J1850 PWM / VPW
              WiFi TCP/UDP                          SAE J1939 / J1708
              USB CDC                               UDS / DoIP
```

- **Taşıma katmanı**: telefon ile adaptör arasındaki fiziksel/mantıksal kanal. Platform (iOS/Android) burada belirleyici.
- **Araç içi protokol**: adaptör ile ECU arasındaki konuşma. Araç sınıfı, model yılı ve pazar burada belirleyici.

Uygulama mimarisi bu iki katmanı **birbirinden tamamen bağımsız** modüller olarak ele almalıdır: `Transport` arayüzü (byte in / byte out) + `ProtocolAdapter` arayüzü (komut in / frame out).

---

## 1. Taşıma katmanı (telefon ↔ adaptör)

### 1.1 Bluetooth Classic — SPP / RFCOMM

Piyasadaki ELM327 klonlarının büyük çoğunluğu (v1.5, "v2.1" etiketli klonlar) bu yolu kullanır.

| Özellik | Değer |
|---|---|
| Profil | SPP (Serial Port Profile) üzerinden RFCOMM |
| UUID | `00001101-0000-1000-8000-00805F9B34FB` |
| Tipik baud | 38400 veya 9600 (adaptör iç seri hattı) |
| Efektif throughput | 5–15 kB/s (pratikte ELM327 parse hızı sınırlar) |
| Gecikme (RTT) | 25–60 ms / komut |
| Eşleşme | PIN `1234`, `0000` veya `6789` |
| Android | Tam destek — `BluetoothSocket.createRfcommSocketToServiceRecord()` |
| iOS | **Desteklenmez** — MFi sertifikası olmayan SPP cihazına iOS bağlanamaz |
| Pil | Orta |

Android'de bilinen tuzaklar:
- `createRfcommSocketToServiceRecord` bazı Çin klonlarında başarısız olur; fallback olarak reflection ile `createRfcommSocket(int)` (channel 1) denenmelidir.
- Bağlanmadan önce `bluetoothAdapter.cancelDiscovery()` mutlaka çağrılmalı; discovery açıkken socket bağlantısı sık sık `read failed, socket might closed` verir.
- Android 12+ (API 31) için `BLUETOOTH_CONNECT` ve `BLUETOOTH_SCAN` runtime izinleri; `neverForLocation` flag'i konum izni ihtiyacını kaldırır.

### 1.2 BLE — Bluetooth Low Energy (GATT)

iOS'ta MFi dışı tek pratik yol. Yeni nesil adaptörlerin standardı.

| Özellik | Değer |
|---|---|
| Tipik servis UUID | `FFF0` (Vgate/LE Link), `FFE0` (HM-10 tabanlı), `18F0` (bazı OBDLink) |
| Karakteristikler | `FFF1`/`FFE1` notify (RX), `FFF2`/`FFE1` write (TX) |
| MTU | Varsayılan 23 byte (20 byte payload); negotiate ile 185–517 |
| Throughput | 1–4 kB/s (MTU ve connection interval'a bağlı) |
| Gecikme | 30–120 ms; connection interval belirleyici |
| iOS | Tam destek — CoreBluetooth, MFi gerekmez |
| Android | Tam destek — `BluetoothGatt` |
| Pil | Düşük (en verimli seçenek) |

Kritik noktalar:
- **MTU negotiation zorunlu.** Android'de `requestMtu(517)`, iOS'ta otomatik ama `maximumWriteValueLength(for:)` ile okunmalı. 20 byte payload ile `01 00 20 40 60 80 A0 C0` gibi çoklu PID isteği fragmente olur.
- Write tipi: `WRITE_TYPE_NO_RESPONSE` daha hızlı ama klon adaptörlerde veri kaybı yapar. Varsayılan olarak `WRITE_TYPE_DEFAULT` (with response) kullanın, cihaz beyaz listesindeyse hızlıya geçin.
- Yanıtlar `>` prompt karakterine kadar **birden fazla notification** halinde gelir. Notification bazlı değil, **prompt bazlı** tampon birleştirme yapın.
- Android'de `connectGatt(context, false, callback, TRANSPORT_LE)` — `autoConnect=true` ilk bağlantıda çok yavaştır, yeniden bağlanmada faydalıdır.
- iOS'ta cihazı `identifier` (UUID) ile hatırlayın; MAC adresi iOS'ta görünmez.

### 1.3 MFi / iAP2 (Apple sertifikalı Bluetooth Classic)

OBDLink MX+, OBDLink CX gibi cihazlar. `ExternalAccessory` framework'ü ile erişilir.

- Avantaj: Classic hızı + iOS uyumluluğu; en yüksek throughput seçeneği.
- Dezavantaj: Uygulamanın `Info.plist` içine `UISupportedExternalAccessoryProtocols` eklemesi ve protokol string'inin (ör. `com.obdlink`) üretici ile anlaşmalı olması gerekir.
- Pratik strateji: BLE'yi varsayılan yapın, MFi'yi "premium adaptör" yolu olarak opsiyonel ekleyin.

### 1.4 WiFi

| Özellik | Değer |
|---|---|
| Mod | Genelde adaptör **AP (Access Point)** modunda; telefon adaptörün ağına bağlanır |
| Tipik adres | `192.168.0.10:35000`, alternatif `192.168.4.1:35000`, `192.168.1.5:35000` |
| Taşıma | Çoğunlukla TCP; bazı klonlar UDP |
| Throughput | 20–50 kB/s (en yüksek) |
| Gecikme | 10–30 ms (en düşük) |
| iOS | Çalışır, ama ciddi UX sorunları var (aşağıda) |
| Android | Çalışır, ama routing sorunu var (aşağıda) |
| Pil | Yüksek tüketim |

iOS tuzakları:
- Adaptör AP'sinde internet yoktur; iOS "İnternet bağlantısı yok" uyarısı verir ve **otomatik olarak hücresel veriye veya başka bir Wi-Fi'ye geçebilir**. Kullanıcıya "Otomatik Katıl" ve "Zayıf ağdan ayrıl" ayarları hakkında rehberlik gösterin.
- iOS 14+ **Local Network Permission** (`NSLocalNetworkUsageDescription`) zorunludur; verilmezse socket sessizce başarısız olur.
- `NEHotspotConfigurationManager` ile programatik olarak adaptör SSID'sine bağlanabilirsiniz (`Hotspot Configuration` entitlement gerekir) — kullanıcı deneyimini ciddi iyileştirir.

Android tuzakları:
- Telefon aynı anda hem hücresel hem WiFi'de olduğunda trafik hücresele gider. Çözüm: `ConnectivityManager.requestNetwork()` ile `NET_CAPABILITY_INTERNET` **olmayan** bir WiFi ağı isteyin ve socket'i `network.bindSocket(socket)` ile o ağa bağlayın. `bindProcessToNetwork` global olduğu için tercih edilmez.
- Android 10+ `WifiNetworkSpecifier` ile kullanıcı onaylı peer-to-peer bağlantı kurulabilir.

### 1.5 USB / OTG ve diğer

- **USB CDC-ACM**: Android'de `UsbManager` + FTDI/CH340 sürücüsü ile en stabil ve en hızlı yol; atölye/filo senaryolarında değerlidir. iOS'ta pratik değildir.
- **Wi-Fi Direct**: OBD ekosisteminde yaygın değil; önerilmez.
- **Yerleşik telematik / OEM API**: Ağır vasıta filolarında FMS gateway veya OEM bulut API'si (Volvo Connect, Scania Fleet, Mercedes Fleetboard) OBD portundan daha stabil bir kanaldır.

### 1.6 Taşıma karşılaştırma matrisi

| Taşıma | iOS | Android | Hız | Gecikme | Pil | Stabilite | Öneri |
|---|---|---|---|---|---|---|---|
| BT Classic SPP | ✗ | ✓ | Orta | Düşük | Orta | Yüksek | Android varsayılanı |
| BLE GATT | ✓ | ✓ | Düşük-Orta | Orta | Düşük | Orta-Yüksek | iOS varsayılanı, ortak yol |
| MFi / iAP2 | ✓ | ✗ | Yüksek | Düşük | Orta | Çok yüksek | Premium adaptör |
| WiFi TCP | ✓* | ✓* | Yüksek | Çok düşük | Yüksek | Orta | Yüksek örnekleme hızı gereken mod |
| USB CDC | ✗ | ✓ | Çok yüksek | Çok düşük | Şarj eder | Çok yüksek | Atölye/filo |

\* Platform kısıtları için 1.4'e bakın.

---

## 2. Araç içi protokoller — araç sınıfına göre

### 2.1 Binek ve hafif ticari (16-pin OBD-II / EOBD)

Zorunluluk tarihleri: ABD 1996 (OBD-II), AB benzin 2001 / dizel 2004 (EOBD), Türkiye AB ile paralel.

| Protokol | Standart | Hız | Pinler | Kullanım |
|---|---|---|---|---|
| J1850 PWM | SAE J1850 | 41.6 kbps | 2, 10 | Ford 1996–2004 |
| J1850 VPW | SAE J1850 | 10.4 kbps | 2 | GM 1996–2005 |
| ISO 9141-2 | ISO 9141-2 | 10.4 kbps | 7 (K), 15 (L) | Avrupa/Asya 1996–2004, 5-baud init |
| ISO 14230-4 KWP (slow) | KWP2000 | 10.4 kbps | 7, 15 | 5-baud init |
| ISO 14230-4 KWP (fast) | KWP2000 | 10.4 kbps | 7 | Fast init (25 ms wake-up) |
| ISO 15765-4 CAN 11/500 | ISO 15765-4 | 500 kbps | 6 (CAN-H), 14 (CAN-L) | 2008+ ABD zorunlu, en yaygın |
| ISO 15765-4 CAN 29/500 | ISO 15765-4 | 500 kbps | 6, 14 | Genişletilmiş adresleme |
| ISO 15765-4 CAN 11/250 | ISO 15765-4 | 250 kbps | 6, 14 | Bazı hafif ticari |
| ISO 15765-4 CAN 29/250 | ISO 15765-4 | 250 kbps | 6, 14 | Hafif ticari / bazı Asya |
| SAE J1939 (250k) | SAE J1939 | 250 kbps | 6, 14 | 16-pin soketli ağır hafif ticari |

Uygulama katmanı:
- **SAE J1979** — klasik OBD servisleri: Mode 01 (canlı veri), 02 (freeze frame), 03 (DTC), 04 (DTC sil), 05/06 (test sonuçları), 07 (bekleyen DTC), 09 (VIN, CALID, CVN), 0A (kalıcı DTC).
- **SAE J1979-2 / OBDonUDS** — 2023+ yeni araçlarda klasik modların yerini alıyor. `22 F4 xx` (ReadDataByIdentifier) ile DID tabanlı okuma. **Yeni uygulamalar bunu desteklemek zorunda.**
- **UDS ISO 14229** — OEM'e özel derin teşhis: `10` (session), `22` (read DID), `19` (read DTC), `2E` (write), `27` (security access), `31` (routine).
- **ISO-TP (ISO 15765-2)** — 8 byte'tan uzun mesajların segmentasyonu: Single Frame, First Frame, Consecutive Frame, Flow Control. VIN okuma (`09 02`) bunu kullanır; ELM327 çoğu zaman kendisi birleştirir ama `ATCFC0` ile manuel flow control gerekebilir.
- **DoIP ISO 13400** — Ethernet üzerinden teşhis; yeni nesil ve EV platformlarında (VW MEB, Tesla, bazı BMW) yaygınlaşıyor. OBD portunun 3/11/12/13 pinlerinde Ethernet. Klasik ELM327 adaptörlerle **erişilemez**, DoIP destekli VCI gerekir.

### 2.2 Motosiklet

Motosikletlerde tek bir standart yoktur; 2016 (Euro4) öncesi tamamen üreticiye özeldir.

| Marka | Konnektör | Protokol | Notlar |
|---|---|---|---|
| Honda | 4-pin DLC (bazı modellerde 3-pin) | K-Line, HDS | Servis modu için DLC pin köprüleme gerekebilir |
| Yamaha | 4-pin (kırmızı/beyaz kaplin) | K-Line, YDS | Diagnostic mode için pin shorting |
| Suzuki | 6-pin | SDS, K-Line (ISO 9141 türevi) | |
| Kawasaki | 4-pin | KDS, K-Line | |
| KTM / Husqvarna | 6-pin AMP | ISO 14230 KWP2000 | |
| BMW Motorrad | 10-pin round (eski), 16-pin OBD (yeni) | KWP2000 → CAN | 2012+ CAN |
| Ducati | 4-pin / 16-pin | KWP2000 → CAN | |
| Harley-Davidson | 6-pin Deutsch (eski), 4-pin | J1850 VPW türevi / CAN | Delphi tabanlı |
| Triumph | 8-pin / 16-pin | ISO 14230 → CAN | |
| Piaggio/Vespa/Aprilia | 3-pin / 16-pin | K-Line → CAN | |

Standartlaşma:
- **Euro4 (2016)** — motosikletlerde OBD-I zorunlu (sınırlı arıza izleme).
- **Euro5 (2020) / Euro5+ (2024)** — genişletilmiş OBD; standart 16-pin veya adaptör kablo ile erişilebilir hale geldi. ISO 15765-4 CAN 11/500 baskın.

Uygulama tarafı için pratik yaklaşım: motosiklet için **marka/model bazlı bir kablo ve protokol matrisi** tutun; kullanıcıdan marka+model+yıl alarak doğru adaptör kablosunu ve init dizisini önerin. Otomatik protokol taraması motosiklette binek araçlara göre çok daha az güvenilirdir.

### 2.3 Kamyon, otobüs ve ağır tonajlı araçlar

#### SAE J1939 (modern standart)

| Özellik | Değer |
|---|---|
| Fiziksel | CAN 2.0B, 29-bit genişletilmiş ID |
| Hız | 250 kbps (klasik), 500 kbps (J1939-14, 2016+ araçlar) |
| Adresleme | Source Address (SA) + PGN (Parameter Group Number) |
| Veri tanımı | SPN (Suspect Parameter Number) — J1939-71 |
| Arıza | DM1 (aktif DTC, PGN 65226), DM2 (geçmiş), DM3 (sil), DM11 (aktif sil) — J1939-73 |
| Çok paketli | TP.CM / TP.DT (RTS-CTS) ve BAM (broadcast) |
| Konnektör | 9-pin Deutsch (Type I yeşil = 250k, Type II yeşil/siyah = 500k), 6-pin Deutsch, 16-pin OBD |

Sık kullanılan PGN'ler:

| PGN (hex) | PGN (dec) | Ad | İçerik |
|---|---|---|---|
| 0xF004 | 61444 | EEC1 | Motor devri, tork yüzdesi |
| 0xFEF1 | 65265 | CCVS | Araç hızı, cruise, fren |
| 0xFEEE | 65262 | ET1 | Motor soğutma suyu, yağ sıcaklığı |
| 0xFEEF | 65263 | EFL/P1 | Yağ basıncı, yakıt basıncı |
| 0xFEE9 | 65257 | LFC | Toplam yakıt tüketimi |
| 0xFEE5 | 65253 | HOURS | Motor çalışma saati |
| 0xFEC1 | 65217 | VDHR | Yüksek çözünürlüklü kilometre |
| 0xFECA | 65226 | DM1 | Aktif arıza kodları |
| 0xFEEC | 65260 | VI | VIN |
| 0xFE6C | 65132 | TCO1 | Takograf verisi |

#### SAE J1708 / J1587 (eski ağır vasıta, ~1985–2010 ABD)

| Özellik | Değer |
|---|---|
| Fiziksel | J1708 — RS-485 türevi, 9600 baud, 2 tel |
| Uygulama | J1587 — MID (modül), PID (parametre), FMI (arıza tipi) |
| Konnektör | 6-pin Deutsch (A/B pinleri) |
| Tipik MID | 128 = Motor, 130 = Şanzıman, 136 = ABS, 140 = Gösterge paneli |

Freightliner, International, Peterbilt, Kenworth, Mack, Volvo VN eski nesillerinde temel kanaldır. Geçiş dönemi araçlarında **J1708 ve J1939 aynı anda** bulunur; ikisini de sorgulayın.

#### Konnektör matrisi

| Konnektör | Protokol | Tipik araçlar |
|---|---|---|
| 6-pin Deutsch | J1708/J1587 (+ bazen J1939 250k) | 1990–2001 ABD kamyonları |
| 9-pin Deutsch Type I (yeşil) | J1939 250k + J1708 | 2001–2016 |
| 9-pin Deutsch Type II (yeşil/siyah) | J1939 500k + J1939 250k | 2016+ |
| 14-pin | Volvo/Mack özel | Eski Volvo/Mack |
| 16-pin OBD-II | J1939 veya ISO 15765 | Avrupa kamyonları, hafif-orta ticari, yeni nesil |
| 12-pin | Caterpillar (CAT ADEM) | CAT motorlu araçlar |

#### FMS ve tachograph

- **FMS Standard (Fleet Management System)** — Avrupa üreticilerinin ortak, salt-okunur J1939 alt kümesi. Ayrı bir FMS gateway kutusundan yayınlanır. Filo telematiği için OBD portundan daha güvenli ve stabil.
- **Digital Tachograph** — VDO/Stoneridge; D8 (download) arayüzü ve CAN üzerinden TCO1 (PGN 65132). Sürücü verisi okumak yasal olarak izne tabidir (AB Reg. 165/2014, KVKK/GDPR).

### 2.4 Elektrikli ve hibrit araçlar

- Standart OBD PID'leri EV'lerde çok sınırlıdır (SOC, batarya sıcaklığı standart değil).
- Gerçek veri için **OEM'e özel UDS DID** okuma gerekir (ör. Nissan Leaf `79B` ECU, Hyundai/Kia `7E4` batarya ECU'su, Tesla için özel CAN ID'leri).
- ISO 15118 (Plug&Charge) ve DoIP giderek daha önemli hale geliyor.
- Uygulamanız EV kapsıyorsa: **marka bazlı DID veritabanı** kaçınılmazdır.

---

## 3. Global uygulamalar ne yapıyor?

| Uygulama | Taşıma | Protokol kapsamı | Ayırt edici yaklaşım |
|---|---|---|---|
| **Torque Pro** (Android) | BT Classic ağırlıklı, WiFi opsiyonel | Standart OBD-II + kullanıcı tanımlı PID | Topluluk PID dosyaları (CSV import), esneklik odaklı |
| **Car Scanner ELM OBD2** | BT Classic, BLE, WiFi | OBD-II + geniş OEM PID kütüphanesi (VAG, Toyota, Nissan, Hyundai...) | Marka bazlı "extended PID" profilleri; adaptör uyumluluk uyarıları |
| **OBD Fusion** (iOS/Android) | BLE, MFi, WiFi | OBD-II + gelişmiş PID paketleri | Adaptör beyaz listesi ve "önerilen donanım" mağazası; iOS'ta MFi vurgusu |
| **Carly** | Kendi BLE dongle'ı (kapalı ekosistem) | OEM UDS kodlama + teşhis | Sadece kendi donanımını destekleyerek stabilite garantisi verir |
| **BimmerLink / BimmerCode** | BLE (OBDLink CX/MX+), WiFi | BMW özel UDS/KWP | Tek marka derinliği; adaptör beyaz listesi çok dar |
| **JPRO / Diesel Laptops** | USB/BT RP1210 adaptörler | J1939, J1708/J1587, OEM ağır vasıta | Sertifikalı VCI zorunlu; klon adaptör kabul edilmez |
| **OBDLink (app)** | MFi, BLE, WiFi | OBD-II + J1939 | Kendi donanım firmware'i ile derin optimizasyon; "STN" komut seti |

**Ortak ders — hepsi aynı üç şeyi yapıyor:**
1. **Adaptör beyaz/kara listesi tutuyorlar.** Klon ELM327 çeşitliliği o kadar yüksek ki "her adaptörle çalışır" iddiası sürdürülemez. Ciddi uygulamalar desteklenen adaptörleri açıkça listeler.
2. **Protokol tespitini kullanıcıdan gizliyor ama override imkânı bırakıyorlar.** Varsayılan `ATSP0` (auto), gelişmiş ayarlarda manuel protokol seçimi.
3. **Ağır vasıta ile binek aracı ayrı ürün/mod olarak ele alıyorlar.** J1939 broadcast doğası ve donanım farkı nedeniyle tek bir jenerik akış yeterli olmuyor.

---

## 4. Stabil bağlantı için mühendislik önerileri

### 4.1 Bağlantı durum makinesi

```text
        ┌──────────┐
        │   IDLE   │
        └────┬─────┘
             │ user: connect
             v
     ┌───────────────┐   timeout/err   ┌──────────────┐
     │   DISCOVER    │────────────────>│    FAILED    │
     └───────┬───────┘                 └──────┬───────┘
             │ device found                   │ backoff
             v                                │
     ┌───────────────┐                        │
     │   CONNECTING  │<───────────────────────┘
     └───────┬───────┘
             │ socket/GATT open
             v
     ┌───────────────┐
     │  ADAPTER_INIT │  ATZ, ATE0, ATL0, ATS0, ATH1, ATI
     └───────┬───────┘
             │ "ELM327 v..." doğrulandı
             v
     ┌───────────────┐
     │ PROTO_DETECT  │  ATSP0 → 0100 → ATDPN
     └───────┬───────┘
             │ protokol kilitlendi (ATSPn)
             v
     ┌───────────────┐   3x ardışık hata   ┌────────────┐
     │     READY     │────────────────────>│ RECOVERING │
     │  (poll loop)  │<────────────────────│            │
     └───────┬───────┘   init OK           └────────────┘
             │ user: disconnect / link lost
             v
        ┌──────────┐
        │   IDLE   │
        └──────────┘
```

Her geçiş loglanmalı ve telemetriye gönderilmelidir (bkz. 4.11).

### 4.2 ELM327 init dizisi (referans)

```text
ATZ          reset (1–2 sn bekle, yanıt: "ELM327 v1.5")
ATE0         echo kapat        -- ZORUNLU, parse'ı yarı yarıya hızlandırır
ATL0         linefeed kapat
ATS0         boşlukları kaldır -- payload boyutunu %30 düşürür
ATH1         header aç         -- çok ECU'lu araçlarda kaynak ayrımı için gerekli
ATAT1        adaptive timing normal
ATST 32      timeout ~200 ms (0x32 * 4 ms)
ATSP0        otomatik protokol
0100         ilk gerçek sorgu — protokolü tetikler
ATDPN        tespit edilen protokol numarasını oku
ATSP <n>     tespit edileni KİLİTLE -- sonraki bağlantılar 3-5 sn hızlanır
```

Ek notlar:
- Tespit edilen protokolü araç profiline **kalıcı olarak kaydedin**; ikinci bağlantıda `ATSP0` yerine doğrudan `ATSPn` gönderin. Bu tek başına bağlantı süresini 8–12 sn'den 2–3 sn'ye düşürür.
- `ATI` ve `AT@1` ile firmware/cihaz kimliğini okuyun; yetenek profilini buna göre kurun.
- CAN'de `ATCAF1` (otomatik formatlama) açık kalsın; ham CAN sniffing gerekiyorsa `ATCAF0` + `ATMA`.
- Ağır vasıta için: `ATSP A` (J1939, 250k) veya STN tabanlı adaptörlerde `STP 42/43`, `ATSH` ile source address ayarı.

### 4.3 Klon ELM327 tespiti ve yetenek profili

Klonlar `ATI` yanıtında "ELM327 v2.1" der ama gerçekte v1.4/v1.5 çekirdeğidir. Gerçek yeteneği **davranışla** ölçün:

| Test | Gerçek v1.4+ | v2.x gerçek | Klon |
|---|---|---|---|
| `AT@1` | cihaz açıklaması | cihaz açıklaması | boş / `?` |
| `ATCSM1` (silent monitor) | `?` | `OK` | `OK` ama çalışmaz |
| `ATPPS` (programmable params) | liste | liste | `?` |
| `0100` sonrası çoklu ECU | doğru | doğru | bazen tek ECU |
| Batch PID `01 00 20 40` | destekler | destekler | çoğu desteklemez |

Sonucu bir `AdapterCapabilities` nesnesine yazın: `supportsBatchPids`, `supportsCanMonitor`, `maxPidsPerRequest`, `reliableAdaptiveTiming`, `supportsJ1939`. Poll planlayıcı bu profile göre davranış değiştirsin.

### 4.4 Örnekleme (polling) stratejisi

- **Tek seferde çoklu PID**: `01 00 20 40 60` gibi 6'ya kadar PID tek istekte sorulabilir (ISO-TP multi-frame yanıt). Destekleyen adaptörde throughput 3–4 kat artar. Desteklenmiyorsa otomatik olarak tek tek sorgulamaya düşün.
- **Öncelikli kuyruk**: RPM/hız gibi görünen göstergeler yüksek frekans (5–10 Hz), sıcaklıklar düşük frekans (0.2 Hz), DTC sadece talep üzerine.
- **Adaptive rate**: ölçülen RTT'ye göre hedef frekansı otomatik düşürün. Sabit `Thread.sleep(100)` kullanmayın.
- **Rate limiting / ECU'yu boğmama**: iki istek arasına minimum 20–30 ms koyun. Özellikle K-Line araçlarda hızlı ardışık istek `BUS BUSY` üretir.
- **Desteklenen PID keşfi**: `0100`, `0120`, `0140`, `0160` bitmask'lerini bir kez okuyup önbelleğe alın; desteklenmeyen PID'i asla tekrar sormayın (`NO DATA` gürültüsü ve boşa giden zaman).

### 4.5 Yeniden bağlanma ve dayanıklılık

- **Exponential backoff + jitter**: 1s, 2s, 4s, 8s, 15s, 30s (tavan). Jitter olmadan çoklu deneme senkronize olup adaptörü kilitler.
- **Watchdog**: son başarılı yanıttan bu yana geçen süre > 3 sn ise `RECOVERING`'e geç. `ATRV` (batarya voltajı) ucuz bir keep-alive/heartbeat komutudur.
- **Kademeli kurtarma**: (1) komutu tekrarla → (2) `ATWS` (warm start) → (3) `ATZ` + tam init → (4) taşıma katmanını kapat/aç → (5) kullanıcıya bildir.
- **Kontak kapanması**: `ATRV < 12.0V` + ardışık `NO DATA` = motor kapalı. Bunu "bağlantı hatası" olarak göstermeyin, "araç kapalı" olarak gösterin.
- **Arka plan davranışı**:
  - iOS: BLE için `bluetooth-central` background mode; WiFi soketleri arka planda öldürülür — WiFi modunda arka plan kaydı vaat etmeyin.
  - Android: uzun kayıt için **Foreground Service** (`connectedDevice` tipi) zorunlu; Doze moduna karşı da bu gerekir.
- **Tek bağlantı kuralı**: Adaptör aynı anda tek istemci kabul eder. Uygulama içinde bağlantıyı bir singleton servis sahiplensin; ekran değişimlerinde bağlantı kapanmasın.

### 4.6 Ağır vasıta (J1939) özel gereksinimleri

- **Broadcast filtreleme**: J1939 hattı saniyede yüzlerce mesaj yayınlar. Filtresiz dinleme adaptör tamponunu taşırır ve UART'ı boğar. Adaptör seviyesinde filtre kurun (`ATCF`/`ATCM`, STN'de `STFPA`/`STFAP`). Sadece ihtiyacınız olan PGN'leri geçirin.
- **Çok paketli mesaj birleştirme**: DM1 (birden fazla aktif DTC) ve VIN, BAM veya TP.CM/TP.DT ile parçalı gelir. Uygulama katmanında bir **reassembler** yazın: TP.CM.BAM (PGN 60416) ile toplam boyut/paket sayısı, TP.DT (PGN 60160) ile 7 byte'lık parçalar, sequence number ile sıralama, 750 ms timeout.
- **SPN/FMI çözümleme**: DM1 içindeki 4 byte'lık DTC yapısı → SPN (19 bit), FMI (5 bit), OC (7 bit). SPN konvansiyonu (version 1/2/3/4) farklı bit dizilimleri kullanır; SPN Conversion Method bitine bakın.
- **Adres talebi (Request PGN 59904)**: pasif dinleme yetmediğinde `EA00` ile spesifik PGN isteyin; source address olarak boşta bir adres (`0xF9` service tool) kullanın.
- **250k / 500k belirsizliği**: 2016+ araçlarda ikisi de olabilir. Önce 500k deneyin, 3 sn içinde trafik yoksa 250k'ya düşün ve sonucu araç profiline kaydedin.
- **J1708 paralel kanalı**: 6/9-pin Deutsch'ta J1939 boşsa J1708/J1587'yi deneyin. İki kanalı sıralı deneyen bir "heavy-duty probe" akışı kurun.
- **Yazma işlemlerinden kaçının**: Ağır vasıtada DTC silme veya parametre yazma ciddi sonuçlar doğurabilir; bu işlemleri açık uyarı + ikinci onay arkasına koyun.

### 4.7 Hata sınıflandırması ve kullanıcı mesajları

| Adaptör yanıtı | Teknik anlam | Kullanıcıya gösterilecek | Otomatik aksiyon |
|---|---|---|---|
| `NO DATA` | ECU yanıt vermedi | "Bu veri bu araçta mevcut değil" | PID'i desteklenmeyen olarak işaretle |
| `UNABLE TO CONNECT` | Protokol kurulamadı | "Araca bağlanılamadı — kontağı açın" | Protokol taramasını tekrarla |
| `BUS INIT: ERROR` | K-Line init başarısız | "Kontağı açıp tekrar deneyin" | 5-baud ↔ fast init değiştir |
| `CAN ERROR` | CAN hattı hatası / yanlış hız | "Bağlantı sorunu" | 500k ↔ 250k değiştir |
| `BUS BUSY` | Hat meşgul | — (sessiz) | 100 ms sonra tekrar dene |
| `STOPPED` | Komut kesildi | — (sessiz) | Tekrar dene |
| `?` | Adaptör komutu anlamadı | — (sessiz) | Yetenek profilinden çıkar |
| `SEARCHING...` | Protokol aranıyor | "Araç aranıyor..." | Bekle (max 10 sn) |
| `BUFFER FULL` | Adaptör tamponu taştı | "Veri hızı düşürülüyor" | Poll frekansını yarıya indir |
| `LV RESET` | Düşük voltaj resetı | "Akü voltajı düşük" | Tam init yap |
| `ERR94` vb. | Klon firmware hatası | "Adaptör hatası" | `ATZ` + tam init |

**Kural:** Ham adaptör metnini asla kullanıcıya göstermeyin. Her hata bir enum'a map edilsin, kullanıcıya lokalize ve eylem içeren mesaj gitsin.

### 4.8 iOS özel kontrol listesi

- `Info.plist`: `NSBluetoothAlwaysUsageDescription`, `NSLocalNetworkUsageDescription` (WiFi için), `UISupportedExternalAccessoryProtocols` (MFi için).
- Background modes: `bluetooth-central` (BLE kayıt için).
- CoreBluetooth: state restoration (`CBCentralManagerOptionRestoreIdentifierKey`) ile uygulama arka planda öldürülse bile bağlantı geri gelir.
- MTU'yu `maximumWriteValueLength(for: .withoutResponse)` ile okuyun, varsaymayın.
- WiFi adaptörde `NEHotspotConfigurationManager` + kullanıcıya "Ayarlar > Wi-Fi > adaptör > Otomatik Katıl" rehberi.
- Simülatörde Bluetooth yoktur; CI'da gerçek cihaz veya mock transport kullanın.

### 4.9 Android özel kontrol listesi

- İzinler: API 31+ `BLUETOOTH_SCAN` (+ `neverForLocation`), `BLUETOOTH_CONNECT`; API 30 ve altı `ACCESS_FINE_LOCATION` + `BLUETOOTH`, `BLUETOOTH_ADMIN`.
- Foreground service tipi: `connectedDevice` (API 34+ zorunlu beyan).
- Doze / App Standby: foreground service olmadan uzun kayıt kesilir. Pil optimizasyonu muafiyeti isteyin (kullanıcı onayıyla).
- WiFi adaptörde `ConnectivityManager.requestNetwork` + `Network.bindSocket` — hücresel veriye kaçmayı engeller.
- OEM agresif pil yöneticileri (Xiaomi, Huawei, Oppo, Samsung) servisleri öldürür; kullanıcıya cihaza özel "otomatik başlatmaya izin ver" rehberi gösterin.
- `BluetoothSocket` bağlantısını **her zaman** arka plan thread'inde kurun; `cancelDiscovery()` öncesinde çağrılmalı.

### 4.10 Mimari önerisi

```text
UI (React Native / Flutter / native)
        │
ConnectionManager (singleton, state machine, backoff, watchdog)
        │
   ┌────┴──────────────────────────────┐
   │                                   │
Transport (interface)            ProtocolAdapter (interface)
 ├── BtClassicTransport           ├── Elm327Obd2Adapter   (J1979 / OBDonUDS)
 ├── BleTransport                 ├── UdsAdapter          (ISO 14229)
 ├── MfiTransport                 ├── J1939Adapter        (PGN/SPN, TP birleştirme)
 ├── WifiTcpTransport             ├── J1587Adapter        (MID/PID/FMI)
 └── MockTransport (test)         └── MockAdapter (test)
        │
CommandQueue (öncelik, rate limit, dedup, timeout, retry)
        │
DecoderRegistry (PID/SPN/DID → mühendislik birimi)
        │
VehicleProfile (marka/model/yıl → protokol, PID seti, adaptör önerisi, kablo)
```

`MockTransport` + kaydedilmiş gerçek araç trace'leri, CI'da regresyon testinin temelidir — bunu ilk günden yazın.

### 4.11 Test ve ölçüm stratejisi

- **Donanım simülatörü**: Freematics OBD-II Emulator, ECUsim 2000 (OBD-II), ECUsim 5100 (J1939/J1708). Ağır vasıta desteği iddia ediyorsanız J1939 simülatörü şart.
- **Trace kayıt/oynatma**: her canlı oturumu (kullanıcı onayıyla) ham byte olarak kaydedin; hata raporlarında bu trace'i mock transport'a besleyip birebir tekrar üretin.
- **Gerçek araç matrisi**: en az binek (CAN 11/500), 2005 öncesi K-Line bir araç, bir hafif ticari, bir Euro5 motosiklet, bir 9-pin J1939 kamyon, bir 6-pin J1708 eski kamyon.
- **Adaptör matrisi**: en az 2 klon ELM327 (BT Classic), 1 BLE klon, 1 OBDLink (MFi/BLE), 1 WiFi adaptör.
- **İzlenecek metrikler**:
  - Bağlantı başarı oranı (adaptör modeli × araç sınıfı × platform kırılımında)
  - İlk veriye kadar geçen süre (TTFD) — hedef < 5 sn, ikinci bağlantıda < 3 sn
  - Oturum başına kopma sayısı — hedef < 0.1
  - Komut başına ortalama RTT ve timeout oranı
  - Protokol tespit doğruluğu ve tespit süresi
  - Hata kodu dağılımı (4.7 tablosundaki enum bazında)

---

## 5. Ekler

### Ek A — Adaptör öneri tablosu

| Araç sınıfı | Taşıma | Önerilen adaptör | Sertifika | Fiyat bandı |
|---|---|---|---|---|
| Binek / hafif ticari (giriş) | BT Classic | Vgate iCar Pro BT3.0 | — | $ |
| Binek / hafif ticari (iOS) | BLE | Vgate iCar Pro BLE 4.0 | — | $ |
| Binek / hafif ticari (pro) | BLE + MFi | OBDLink CX / MX+ | MFi | $$$ |
| Yüksek örnekleme / veri kaydı | WiFi | Vgate iCar Pro WiFi, Kiwi 3 | — | $$ |
| Motosiklet | BLE + marka kablosu | OBDLink CX + marka adaptör kablosu | MFi | $$$ |
| Kamyon / otobüs (J1939) | BT / USB | OBDLink MX+ (J1939 destekli), Nexiq USB-Link 3 | MFi / RP1210 | $$$$ |
| Eski kamyon (J1708) | USB / BT | Nexiq USB-Link 3, DPA5 | RP1210 | $$$$ |
| Atölye / filo | USB | RP1210 uyumlu VCI | RP1210 | $$$$ |

Klon ELM327'ler ("$5 mavi dongle") desteklenebilir ama **beyaz listeye alınmamalı ve garanti edilmemelidir**. Uygulamada "test edilmemiş adaptör" uyarısı gösterin.

### Ek B — Protokol tespit karar akışı

```text
                    ┌──────────────────────┐
                    │ Kullanıcı araç sınıfı │
                    │ seçti mi?             │
                    └───────┬──────────────┘
                            │
        ┌───────────────────┼────────────────────┐
        │                   │                    │
   BİNEK/HAFİF          MOTOSİKLET          AĞIR VASITA
        │                   │                    │
        v                   v                    v
  Kayıtlı profil     Marka/model/yıl        Konnektör tipi?
  var mı?            → kablo + protokol      6p / 9p-I / 9p-II / 16p
        │            matrisinden seç              │
   ┌────┴────┐              │              ┌──────┴───────┐
  EVET      HAYIR           │           9-pin II       6-pin
   │          │             │              │              │
   v          v             v              v              v
ATSP<n>    ATSP0        ATSP<n>        J1939 500k     J1708 dene
doğrudan   0100         (K-Line ise      dene           │
   │       ATDPN        ATSP3/4/5)        │         yanıt yok?
   │          │             │        yanıt yok?          │
   │          v             │             │              v
   │     Protokol           │        J1939 250k     J1939 250k
   │     kilitle            │          dene           dene
   │     (ATSP n)           │             │              │
   └──────────┴─────────────┴─────────────┴──────────────┘
                            │
                            v
                 ┌────────────────────┐
                 │ Profili kaydet:    │
                 │ VIN + protokol +   │
                 │ desteklenen PID/PGN│
                 └─────────┬──────────┘
                           v
                    ┌─────────────┐
                    │    READY    │
                    └─────────────┘
```

### Ek C — Yaygın sorun/çözüm tablosu

| Belirti | Olası neden | Çözüm |
|---|---|---|
| Eşleşiyor ama veri yok | Kontak kapalı | Kontağı ON konumuna alma rehberi göster |
| `UNABLE TO CONNECT` sürekli | Yanlış protokol / desteklenmeyen araç | `ATSP0` tam tarama, sonra manuel protokol seçimi sun |
| Android'de `socket might closed` | Discovery açık / yanlış RFCOMM kanalı | `cancelDiscovery()` + reflection fallback (channel 1) |
| iOS'ta adaptör görünmüyor | BT Classic (SPP) adaptör | Kullanıcıya BLE veya MFi adaptör öner |
| WiFi'de socket timeout (iOS) | Local network izni yok | İzni iste, verilmediyse Ayarlar'a yönlendir |
| WiFi'de socket timeout (Android) | Trafik hücresele gidiyor | `requestNetwork` + `bindSocket` |
| Veri 2 sn sonra donuyor | Adaptör tamponu doldu / tek bağlantı çakışması | Poll frekansını düşür, başka uygulamanın bağlı olmadığını doğrula |
| Ekran değişince bağlantı kopuyor | Bağlantı Activity/ViewController'a bağlı | Singleton servis + foreground service |
| Kamyonda hiç veri yok | Yanlış CAN hızı veya konnektör | 500k → 250k → J1708 sıralı dene |
| DTC listesi eksik geliyor | Çok paketli DM1 birleştirilmiyor | BAM/TP.DT reassembler ekle |
| Yeni araçta `01xx` çalışmıyor | OBDonUDS (J1979-2) aracı | `22 F4 xx` DID okumaya geç |
| RPM değeri saçma | Yanlış ölçekleme | `((A*256)+B)/4`; SPN'de J1939-71 ölçek/offset tablosunu kullan |

### Ek D — Sık kullanılan OBD-II PID formülleri

| PID | Ad | Formül | Birim |
|---|---|---|---|
| 010C | Motor devri | `((A*256)+B)/4` | rpm |
| 010D | Araç hızı | `A` | km/h |
| 0105 | Soğutma suyu | `A-40` | °C |
| 010F | Emme havası | `A-40` | °C |
| 0104 | Motor yükü | `A*100/255` | % |
| 0111 | Gaz kelebeği | `A*100/255` | % |
| 010B | Manifold basıncı | `A` | kPa |
| 0110 | MAF | `((A*256)+B)/100` | g/s |
| 012F | Yakıt seviyesi | `A*100/255` | % |
| 0142 | Kontrol modülü voltajı | `((A*256)+B)/1000` | V |
| 015C | Motor yağı sıcaklığı | `A-40` | °C |
| 0121 | MIL yanarken gidilen mesafe | `(A*256)+B` | km |

---

## 6. Yol haritası önerisi (öncelik sırasıyla)

1. `Transport` + `ProtocolAdapter` soyutlaması ve `MockTransport` ile test altyapısı.
2. BLE transport (iOS + Android ortak) + ELM327 OBD-II adapter → binek/hafif ticari MVP.
3. Bağlantı durum makinesi, backoff, watchdog, hata enum'ı, telemetri.
4. Android BT Classic transport (klon adaptör pazarı için).
5. Protokol kilitleme + araç profili kalıcılığı (TTFD optimizasyonu).
6. WiFi transport (platform kısıtları ile birlikte).
7. J1939 adapter + TP/BAM reassembler + PGN filtreleme → ağır vasıta modu.
8. J1587 adapter → eski ağır vasıta.
9. Motosiklet marka/kablo matrisi + K-Line init varyantları.
10. OBDonUDS (J1979-2) ve UDS DID desteği → 2023+ araçlar ve EV.
11. MFi entegrasyonu (premium adaptör) ve DoIP (uzun vade).
