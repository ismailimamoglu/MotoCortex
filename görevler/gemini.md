# Global Standartlarda Araç Teşhis ve OBD-II / J1939 Bağlantı Mimarisi Raporu

Bu rapor; binek, hafif ticari, motosiklet ve ağır ticari araç segmentlerinde Bluetooth (BLE / Klasik) ve Wi-Fi üzerinden kararlı, kesintisiz ve yüksek performanslı araç teşhis (OBD-II / UDS / J1939) iletişimi sağlamak için gereken protokol listesini, mimari katmanları ve mühendislik gereksinimlerini detaylandırmaktadır.

---

## 1. Araç Segmentlerine Göre Desteklenmesi Gereken Protokoller

Farklı araç segmentleri; fiziksel katman (PHY), elektriksel voltaj toleransları, soket pin dizilimleri ve mesajlaşma çerçevelerinde (frame architecture) köklü farklılıklar gösterir.

| Araç Segmenti | Ağ & İletişim Protokolleri | Donanım & Pinout Standartları | Yaygın Veri Hızları (Baud Rate) |
| :--- | :--- | :--- | :--- |
| **Binek & Hafif Ticari** | • ISO 15765-4 (CAN 11/29-bit, 250/500 kbit/s)<br>• ISO 14230-4 (KWP2000 Fast Init / 5-Baud)<br>• ISO 9141-2 (K-Line / L-Line)<br>• SAE J1850 PWM (41.6 kbaud - Ford)<br>• SAE J1850 VPW (10.4 kbaud - GM)<br>• ISO 14229-1 (UDS Diagnostics)<br>• ISO 13400-2 (DoIP - Diagnostics over IP) | Standart 16-pin SAE J1962 (Tip A - 12V)<br>Pin 6: CAN-H, Pin 14: CAN-L<br>Pin 7: K-Line, Pin 15: L-Line | CAN: 250 kbps / 500 kbps<br>K-Line: 10.4 kbps / 9.6 kbps |
| **Motosiklet (Euro 4 / Euro 5 / 5+)** | • ISO 15765-4 (CAN-Bus)<br>• ISO 14230-4 (KWP2000)<br>• K-Line (ISO 9141-2)<br>• Üreticiye Özel UDS Protokolleri | **Euro 5+:** ISO 19689 (Standart Kırmızı 6-pin)<br>**Euro 4 & Öncesi:** Üretici tescilli soketler (Honda 4-pin, Yamaha 3/4-pin, KTM 6-pin, Ducati 4-pin) | CAN: 250 / 500 kbps<br>K-Line: 10.4 kbps |
| **Kamyon & Ağır Ticari (Heavy Duty)** | • SAE J1939 (CAN 29-bit Identifier, PGN/SPN)<br>• SAE J1708 / J1587 (Eski Nesil Seri Ağ)<br>• ISO 27145 (WWH-OBD - Dünya Çapında Ağır Vasıta OBD)<br>• ISO 11992 (Römork / Çekici Arayüzü) | 24V Elektriksel Altyapı<br>• 9-pin Deutsch (HD10 Type 1 Siyah / Type 2 Yeşil)<br>• 16-pin SAE J1962 (Tip B - Ortası Çentikli 24V)<br>• 6-pin Deutsch (Eski J1708) | J1939: 250 kbps / 500 kbps<br>J1708: 9600 bps |

---

## 2. Kablosuz İletişim Katmanı (BLE, Klasik BT, Wi-Fi)

Mobil işletim sistemleri (iOS / Android) ve adaptör donanımı arasındaki veri taşıma katmanı:

### A. Bluetooth Low Energy (BLE 4.2 / 5.x - GATT Katmanı)
* **Kapsam:** iOS ve Android için modern endüstri standardı. Apple MFi lisansı ve harici çip zorunluluğu yoktur.
* **Protokol:** Custom GATT (Generic Attribute Profile) Service / Characteristics. Genellikle *Nordic UART Service (NUS)* benzeri RX (`Write Without Response`) ve TX (`Notify`) UUID ikilisi kullanılır.
* **Kritik Parametreler:**
  * **MTU Negotiation:** Varsayılan 23 bayttan 247–512 bayta çıkarılmalıdır. Düşük MTU, CAN frame paketlerinin parçalanmasına ve parsing gecikmelerine neden olur.
  * **Connection Interval:** Düşük gecikme (latency) için bağlantı parametreleri 7.5 ms – 15 ms aralığına set edilmelidir.

### B. Bluetooth Classic (Bluetooth 2.1 / 3.0 / 4.0 - SPP Katmanı)
* **Kapsam:** Android üzerinde Serial Port Profile (RFCOMM) ile doğrudan soket bağlantısı.
* **iOS Kısıtı:** Standart SPP profili iOS tarafından doğrudan desteklenmez; Apple MFi (Made for iPhone) koprocessörü ve donanım sertifikasyonu zorunludur. Evrensel uygulamalarda yalnızca Android tarafında fallback olarak tutulmalıdır.
* **Soket UUID:** Standart Seri Port UUID (`00001101-0000-1000-8000-00805F9B34FB`).

### C. Wi-Fi (TCP / UDP Socket & DoIP)
* **Kapsam:** Yüksek veri bant genişliği gerektiren durumlar (ECU Reflash, DoIP - ISO 13400) ve eski adaptör uyumluluğu.
* **Soket Yapısı:**
  * Standart ELM327 Wi-Fi: `TCP / UDP 192.168.0.10:35000` (veya `192.168.1.10:35000`).
  * DoIP Standardı: `ISO 13400-2` TCP/UDP Port `13400`.
* **Kritik Kısıt:** Adaptör AP modunda çalıştığında ve internet çıkışı sağlamadığında mobil işletim sistemleri hücresel veriyi kapatma veya Wi-Fi'dan kopma eğilimi gösterir. Uygulama içerisinde `bindProcessToNetwork` (Android) / `NEHotspotNetwork` (iOS) mekanizmalarıyla hücresel veri trafiği izole edilmelidir.

---

## 3. Global Düzeyde Stabil Bağlantı İçin Mühendislik İlkeleri

### A. Donanım Katmanı ve Elektriksel Koruma
1. **24V & Yük Atma (Load Dump) Koruması:** Ağır vasıtalarda alternatör geçişlerinde 60V–80V aralığında geçici voltaj pikleri oluşabilir. Donanım 9–36V geniş çalışma aralığına ve TVS diyot korumasına sahip olmalıdır.
2. **Çip Seti Tercihi:** Standart ucuz PIC18F25K80 klon adaptörler, J1939'un 29-bit genişletilmiş ID yapısını ve yüksek CAN-Bus trafiğini işlerken buffer taşması (*Buffer Overflow*) yaşar. STN1110, STN2120 veya ESP32-S3 + MCP2518FD (SPI CAN Controller) tabanlı mimariler tercih edilmelidir.
3. **K-Line & CAN Otomatik Multiplexing:** Motosiklet ve eski araçlar için donanımda fiziksel transceiver anahtarlaması bulunmalıdır.

### B. Bağlantı Durum Makinesi (Connection State Machine)
Bağlantı hiçbir zaman tek adımlı blocking soket çağrısı olarak ele alınmamalıdır. Aşağıdaki durum makinesi uygulanmalıdır:

```
[DISCONNECTED] 
      │
      ▼ (Transport Connect)
[TRANSPORT_READY] (BLE Connected / Wi-Fi Socket Open)
      │
      ▼ (Send ATZ, ATE0, ATH0, ATAT1, ATSP...)
[ADAPTER_INITIALIZED]
      │
      ▼ (Tester Present / Mode 01 PID 00 / J1939 DM1 Request)
[ECU_COMMUNICATION_ESTABLISHED]
      │
      ▼ (Continuous Polling / Event Stream)
[DATA_STREAMING]
      │
      └───► (Timeout / Bus Busy / Frame Drop) ───► [EXPONENTIAL_BACKOFF_RETRY]
```

* **Adapter Init:** Adaptöre `ATZ` (Reset), `ATE0` (Echo Off), `ATH0` (Headers Off), `ATL0` (Linefeeds Off), `ATAT1` (Adaptive Timing) komutları gönderilmelidir.
* **Keep-Alive (Tester Present):** Teşhis oturumunun ECU tarafından kapatılmasını önlemek için boşta kalınan durumlarda periyodik olarak `3E 00` (Tester Present) veya `0100` gönderilmelidir.

### C. Parser Robustness (Ayrıştırma Dayanıklılığı)
1. **Paket Parçalanması (Chunk / Frame Fragmentation):** BLE veya TCP üzerinden gelen baytlar her zaman tam bir satır olarak düşmez. Parser, buffer üzerinde `\r` veya `>` (prompt) karakteri görene kadar biriktirme yapmalıdır.
2. **Hata Yanıtlarının Yönetimi:** `CAN ERROR`, `BUS BUSY`, `NO DATA`, `FB ERROR`, `?`, `STOPPED` gibi hata dizgeleri yakalanıp bağlantı koparılmadan polling kuyruğu yeniden düzenlenmelidir.

---

## 4. Mimari Kritikler ve Değerlendirme Soruları

1. **J1939 Parser Desteği:** Ağır vasıtalarda standart PID (Mode 01) yerine PGN/SPN mimarisi kullanılır. Parser modülünüz J1939 29-bit CAN frame'lerini ayrıştıracak bitwise maskeleme altyapısına sahip mi?
2. **Klon Adaptör Toleransı:** Piyasadaki standart ELM327 klon adaptörleri desteklenecek mi, yoksa firmware kontrolü olan tescilli bir donanım mı zorunlu tutulacak? (Klon adaptör desteği, yazılım tarafındaki adaptif zamanlama ve hata toleransı maliyetini katlar).
3. **Security Gateway (SGW) & DoIP:** 2020+ yeni nesil binek araçlarda standart OBD portları üretici güvenlik duvarı arkasındadır. Gateway bypass veya DoIP mimarisi yol haritanıza dahil edildi mi?
