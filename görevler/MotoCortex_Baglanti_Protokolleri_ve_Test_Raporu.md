# MotoCortex - Bağlantı Protokolleri, ECU ve Cihaz Uyumluluk Analizi Raporu

## 1. Giriş ve Amaç
Bu rapor, **MotoCortex** projesinin küresel pazarda iOS ve Android platformlarında, tüm ECU tiplerinde (Bosch, Marelli, Keihin, Delphi, Denso vb.) ve orijinal/klon OBD-II adaptörlerinde (PIC18F25K80, vLinker, STN1110, sahte ELM327 v2.1/v1.5 çipleri) sorunsuz çalışabilmesi için gerçekleştirilen mimari ve protokol analizini içermektedir.

---

## 2. Platform Bazlı Bağlantı Katmanı Risk Analizi (iOS vs. Android)

### iOS Tarafı (CoreBluetooth & BLE Limitleri)
* **Classic Bluetooth (SPP) Kısıtı:** iOS, Apple MFi sertifikası olmayan Classic Bluetooth SPP cihazları (örneğin ucuz HC-05 tabanlı mavi ELM327 adaptörleri) desteklemez. iOS bağlantı mimarisi tamamen BLE (Bluetooth Low Energy) ve Wi-Fi üzerine kurulu olmalıdır.
* **Dinamik GATT Servis/Karakteristik Taraması:** Piyasada satılan klon BLE adaptörleri sabit UUID kullanmaz (`FFF0/FFF1`, `FFE0/FFE1`, `E781...` vb. onlarca farklı varyasyon vardır). GATT UUID'leri hardcoded tanımlıysa, piyasadaki BLE cihazlarının %60'ında `Service Not Found` hatası alınır. Taramada "Greedy GATT Discovery" (tüm servisleri tarayıp Read/Write/Notify yetkisi olan karakteristiği dinamik seçme) mekanizması şarttır.
* **MTU Parçalanması (Fragmentation):** iOS varsayılan BLE MTU boyutu 23 bayttır (net veri alanı 20 bayt). Multi-frame UDS yanıtları veya Mode 09 VIN sorguları tek paket yerine parçalı paketler halinde gelir. `Notify` akışında gelen veriyi birleştirici bir **Buffer/Frame Reassembly** katmanı bulunmalıdır.

### Android Tarafı (Classic SPP + BLE Çift Yönlü Mimari)
* **RFCOMM Socket Fallback:** Ucuz Android Bluetooth SPP cihazları varsayılan UUID (`00001101-0000-1000-8000-00805F9B34FB`) üzerinden standart `createRfcommSocketToServiceRecord` ile bağlandığında sıklıkla socket timeout veya `Connection Refused` verir. Android tarafında Reflection mekanizması ile ikincil kanal (`createInsecureRfcommSocketToServiceRecord` veya doğrudan Channel 1/2 yetkilendirmesi) fallback algoritmaları gereklidir.

---

## 3. Donanım ve Çip Heterojenliği (Orijinal vs. Klon Cihazlar)

| Cihaz / Çip Tipi | Desteklenen AT Komutları | Kritik Riskler / Davranış Bozuklukları |
| :--- | :--- | :--- |
| **Orijinal ELM327 (PIC18F25K80)** | Tam AT Seti (`AT SH`, `AT CRA`, `AT PB`, `AT ST`) | Kararlı, donanımsal buffer güvenli, standart timing'e uyar. |
| **Sahte ELM327 (v2.1 / v1.5 Klonlar)** | Kısıtlı / Eksik AT Seti | `AT ST` (Timeout), `AT CRA` (Rx Address Filter) komutlarında `?` veya kilitlenme verir. |
| **vLinker MC+ / STN Çipleri** | Genişletilmiş STN Komut Seti | Yüksek baud rate destekler; ancak aşırı hızlı sorguda ucuz ECU'yu kilitleyebilir. |

### Klon Cihazlarda Buffer Taşması ve Komut Zamanlaması
* **Aşırı Sorgulama (Over-Polling):** Orijinal çipler 512 bayt buffer taşırken, ucuz klonlar 64-128 bayt arasında sınırlıdır. Tek bir istekte birden fazla PID sorgulamak sahte v2.1 çiplerde `BUFFER FULL` veya sessiz veri kaybına (silent truncation) yol açar.
* **Komut Arası Bekleme (Pacing):** İki AT/PID komutu arasında dinamik adaptif gecikme (Adaptive Delay) uygulanmalıdır.

---

## 4. ECU, Protokol ve Araç Uyumluluğu

### Motosikletlerde Protokol Çeşitliliği ve Otomatik Algılama
* Motosikletler standart dışı CAN baud rate (250 kbps vs 500 kbps) veya K-Line (ISO 14230-4 KWP2000 / ISO 9141-2) kullanırlar.
* **`AT SP 0` (Auto Search) Sorunu:** Klon ELM327 cihazlarda Otomatik Protokol Arama (`AT SP 0`) K-Line veya 29-bit CAN protokollerinde 15-20 saniye bekler ve çoğunlukla `CAN ERROR` verip bağlantıyı düşürür.
* **Fallback Sıralaması:** Bağlantı motoru `AT SP 0` başarısız olduğunda sırasıyla `AT SP 6` (ISO 15765-4 CAN 11bit 500k), `AT SP 7` (29bit 500k), `AT SP 8` (11bit 250k), `AT SP 5` (KWP Fast Init) ve `AT SP 4` (KWP 5Baud) manuel fallback denemelidir.

### Çoklu ECU ve Adres Çakışmaları
* Genel OBD2 istekleri `0x7DF` (Broadcast) adresiyle gönderilir. Motosikletlerde veya gelişmiş araçlarda bu adrese hem Motor ECU'su (`0x7E8`), hem Fren/ABS ECU'su (`0x7E9`), hem de Gösterge Paneli aynı anda yanıt verebilir.
* ELM327 adaptörü birden fazla ECU yanıtını aldığında veri paketini ayıramayıp `DATA ERROR` döndürür. Doğrudan tekil ECU hedefleme için `AT SH 7E0` gibi header ayarları kullanılmalıdır.

---

## 5. Detaylı İnceleme Konuları

### 5.1. Klon Adaptör ve Protokol Test Senaryosu Matrisi

Klon adaptörler standart ELM327 komut setini eksik veya hatalı emüle eder.

| Test Senaryosu | Çip / Protokol | Girilen Komut Akışı | Beklenen Donanım Tepkisi | Uygulamanın Doğru Davranışı |
| :--- | :--- | :--- | :--- | :--- |
| **TS-01: Fake Filter Fallback** | Sahte ELM v2.1 / CAN 11bit | `AT CRA 7E8` | `?` veya `OK` (ama filtrelemez) | `AT CRA` başarısız olursa, gelen ham bloktan veriyi yazılımsal regex ile süzme moduna geçmeli. |
| **TS-02: K-Line Bus Quiet Time** | KWP2000 Fast Init / K-Line | `AT SP 5` -> `0100` | `BUS ERROR` / `ERROR` | Protokol aramayı kesip 300ms bus quiet time verip `AT SP 4` (5-Baud) moduna düşmeli. |
| **TS-03: Multi-ECU Collision** | PIC18F25K80 / CAN 11bit | `010C` (Broadcast `7DF`) | `7E8 04 41 0C 0F A0`<br>`7E9 04 41 0C 00 00` | İki farklı ECU adresi döndüğünde ilk geçerli header'ı parse edip diğerini buffer'dan temizlemeli. |
| **TS-04: Echo / Space Anomali** | Ucuz BLE / Otomatik | `AT E0`, `AT S0` | `OK` dese de boşluklu veri göndermeye devam eder. | String parser, gelen veride boşluk veya `\r\n` olup olmadığına bakmaksızın hex strip işlemi yapabilmeli. |

---

### 5.2. UDS (ISO 14229) ve ISO-TP (ISO 15765-2) Çoklu Paket Mimari Analizi

UDS protokolünde 8 baytı aşan veriler ISO-TP katmanı üzerinden multi-frame olarak aktarılır.

```
ECU (Server)                                     App / ELM327 (Client)
     |                                                     |
     |---- First Frame (FF: 10 14 62 22 01 ...) --------->| (Veri boyutu: 20 bayt)
     |<--- Flow Control (FC: 30 00 00) --------------------| (Devam et komutu)
     |---- Consecutive Frame 1 (CF: 21 AB CD EF ...) ----->|
     |---- Consecutive Frame 2 (CF: 22 11 22 33 ...) ----->|
```

* **ELM327 Otomatik ISO-TP (`AT CAF1`) Bağımlılığı:** Orijinal ELM327 çipleri `FF` geldiğinde otomatik olarak ECU'ya `FC` (Flow Control) yanıtı döner. Ancak ucuz klonlarda `AT CAF1` komutu bozuktur veya desteklenmez.
* **BLE Latency vs. ISO-TP ST_min Çatışması:** Adaptör Otomatik Flow Control yapamıyorsa ve bu mantık mobil uygulamaya bırakılmışsa, BLE üzerindeki paket gecikmesi nedeniyle `FC` paketi ECU'nun timeout süresini aşabilir.
* **Sequence Number (SN) Kaybı:** Consecutive Frame (`CF`) paketlerinin başındaki nibble dairesel olarak artar (`0x21`..`0x2F`, `0x20`). Düşük kaliteli BLE bağlantılarında paket kaçırıldığında tüm frame çöp sayılmalı ve istek yeniden atılmalıdır.

---

## 5.3. Mobil Arka Plan BLE/BT Reconnection Stratejisi

* **iOS (CoreBluetooth):**
  * `CBCentralManagerOptionRestoreIdentifierKey` kullanılmadıysa, uygulama arka planda kill edildiğinde bağlantı durumu tamamen kaybolur.
  * Arka planda BLE taraması yavaşlatılır, yalnızca spesifik `serviceUUIDs` dizisi ile arama yapılabilir.
  * `CBCentralManagerScanOptionAllowDuplicatesKey` arka planda yok sayılır.
* **Android (BluetoothSocket / GATT):**
  * Android'de Bluetooth SPP (RFCOMM) soketleri kopsa dahi `socket.isConnected()` metodu `true` dönmeye devam edebilir.
  * Doze Mode ve OEM arka plan kısıtlamaları nedeniyle ön planda bildirim gösteren bir **Foreground Service** ve `PARTIAL_WAKE_LOCK` bulunmuyorsa, I/O thread'leri dondurulur veya soket kapatılır.

---

## 6. Mimari Sınama Soruları

1. **Klon Adaptör:** ELM327 adaptörün `AT CAF0` (Auto Framing Off) modunda çalışmak zorunda kaldığını tespit edersen, uygulamanın içinde saf ISO-TP (FF/FC/CF) paket düzenleyicisi mevcudiyetini sınadın mı?
2. **UDS / ISO-TP:** ECU'ya gönderdiğin bir UDS isteğine karşılık ECU `0x7F 22 78` (Response Pending / Busy) döndüğünde, telemetry motorun zaman aşımına düşmeden ECU yanıtını bekleyecek dinamik timeout uzatma yapısına sahip mi?
3. **Android Soket:** Android tarafında Bluetooth SPP soketi arka planda silent drop (sessiz kopma) yaşadığında, okuma thread'ini kilitlenmekten kurtarmak için geçit süreli (time-gated) read timeout mekanizmasını native seviyede nasıl kurguladın?
