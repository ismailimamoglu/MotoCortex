# MotoCortex Global OBD2 Uyumluluk ve Kararlılık Planı v5.2 (Dondurulmuş Nihai Sürüm)

Bu plan, **mimar1.md**, **mimar2.md** ve **mimar3.md** raporlarındaki tüm mimari geri bildirimleri eksiksiz karşılayacak şekilde güncellenmiş ve **v5.2 Nihai Sürüm (Architecture Frozen)** seviyesine yükseltilmiştir. Bu mimari çekirdek (Core OBD2 Framework), MotoCortex'i Torque Pro ve Car Scanner kalitesinde global bir oyuncu yapacak altyapıya sahiptir.

---

## 1. 6 Katmanlı Mimari Yapı (6-Layer Diagnostic Stack)

Nesne yönelimli ve katı izolasyon kurallarına dayalı olarak kod tabanını 7 mikro modüle böldük ve "God Object" kilitlenmelerini ortadan kaldırdık:

1.  **Katman 1: Transport Adapter Layer (`TransportAdapter.ts`)** - Ortak bir arayüz tanımlayarak Android için `ClassicBluetoothTransport.ts` (RFCOMM) ve iOS/Android için `BLETransport.ts` (BLE GATT UART - **Write Mutex** kilidi ile) olarak ikiye ayrılmıştır.
2.  **Katman 2: Adapter Driver (`AdapterProfileRegistry.ts`)** - Parmak izi testleri ve gecikme benchmarking testlerine göre Tier S/A/C profillerinden birini eşleştirir ve hız sınırlarını (`safePollIntervalMs`) ayarlar.
3.  **Katman 3: Protocol Engine (`ProtocolEngine.ts` / `VehicleProfileDB.ts`)** - Garajdaki araç profilinin (marka, model, yıl, bölge, yakıt tipi, K-Line init stratejisi, hedef adres tarayıcısı) parametrelerine göre sezgisel protokol taraması yapar ve K-Line Slow-Init uyandırma palsi basar.
4.  **Katman 4: Scheduling & Parsing**
    *   **4A: Command Scheduler & Rate Limiter (`CommandScheduler.ts` & `CommandRateLimiter.ts`)** - EDF zamanlayıcısı, SJF önceliklendirmesi, Circuit Breaker mekanizması, Exponential Backoff Cooldown algoritması ve **CommandRateLimiter (Flood Koruması)**.
    *   **4B: Fragment Buffer (`BLEFragmentationBuffer.ts`)** - BLE paketlerini reassemble eder ve null baytları (`\0`) ayıklar.
    *   **4C: Frame Decoders (`ELMParser.ts`, `ISOTPDecoder.ts`, `KWPFrameDecoder.ts`, `FlowControlManager.ts`)** - Token öncelik yöneticisi, intermediate `SEARCHING` yönetimi, KWP Checksum hesaplayıcı ve çoklu satır CAN taleplerini tetiklemek için **FlowControlManager (Akış Kontrol Yöneticisi - Feature Flag Destekli)**.
5.  **Katman 5: PID Engine (`PidRegistry.ts`)** - Sensör formüllerini standart (80+ PID) ve üretici (Hyundai, Renault vb.) bazında yönetir. Güvenlik doğrulamaları, Temporal Sanity (sıçrama koruması) ve **OEM Database Versioning (Bulut Güncelleme Sürümü)** içerir.
6.  **Katman 6: App API (`SessionHealthMonitor.ts`, `DiagnosticSessionRecorder.ts` & `AppLifecycleCoordinator.ts`)** - Dinamik bağlantı sağlık skorlaması yapar, Firebase bulut telemetri analitiğini koordine eder, **AppLifecycleCoordinator (iOS Bluetooth Arka Plan Yöneticisi)** ile arka plan geçişlerini yönetir ve saha incelemeleri için **DiagnosticSessionRecorder (Teşhis Günlük Kaydedicisi)** barındırır.

---

## 2. v5.2 Sürümüyle Eklenen Kritik Onay Şartları

### 1. BLE Yazma Mutex Kilidi (`BLETransport.ts` - Katman 1)
*   BLE donanımları üzerinden yazma (write) işlemlerini asenkron olarak kuyruğa sokacak bir **Write Mutex** mekanizması kurulmuştur. Bu sayede, telemetri ve teşhis komutlarının aynı anda Bluetooth portuna yazma isteği göndermesiyle oluşan veri çakışmaları (race condition) %100 önlenecektir.

### 2. iOS Bluetooth Arka Plan Yöneticisi (`AppLifecycleCoordinator.ts` - Katman 6)
*   Apple'ın agresif arka plan Bluetooth kısıtlamalarını yönetmek amacıyla, uygulamanın arka plana geçişi anında kuyruk temizlenecek ve zamanlayıcı dondurulacaktır. Uygulama ön plana döndüğünde (`AppState == active`) ise port temizlenerek telemetri otomatik olarak yeniden başlatılacaktır.

### 3. Şasi Numarası (VIN) Kurtarma Adımları (Fallback - useBluetooth.ts)
*   Eski Renault/Dacia ECU'larında standart `09 02` sorgusunun başarısız olması durumuna karşın, sırasıyla üreticiye özel KWP komutları denenecek, tüm yollar tükenirse bağlantı koparılmak yerine şasi numarası `UNAVAILABLE` olarak etiketlenip devam edilecektir.

### 4. Akış Kontrol Manuel Enjeksiyon Koruma Bayrağı (`FlowControlManager.ts`)
*   Klon adaptörlerin manuel enjeksiyonlara tepki vermeyip kilitlenmesi riskini azaltmak için manuel Flow Control (`30 00 00`) gönderimi profile bağlı bir feature flag (`supportsManualFlowControl: boolean`) arkasına alınmıştır. Varsayılan olarak otomatik Flow Control kullanılacak, sadece bayrak aktif olduğunda manuel enjeksiyon yapılacaktır.

### 5. OEM Veritabanı Veri Kaynakları (PidRegistry.ts)
*   Üreticiye özel (Hyundai, Renault, Toyota Hybrid, BMW) PID formülleri ve Mode 22 haritaları; **python-OBD**, **OpenXC**, **OpenVehicleDiag** ve **SavvyCAN** açık kaynaklı kütüphanelerinden derlenerek bir veritabanı şeması oluşturulmuş ve sprintlere bölünmüştür.

---

## 3. Kod Dosyalarında Yapılacak Değişiklikler

1.  **[TransportAdapter.ts](file:///Users/ismailimamoglu/Desktop/MotoCortex/src/core/transport/TransportAdapter.ts) [NEW]** - BLE ve Classic BT transport soyutlaması.
2.  **[BLETransport.ts](file:///Users/ismailimamoglu/Desktop/MotoCortex/src/core/transport/BLETransport.ts) [NEW]** - Write Mutex kilitli BLE UART sürücüsü.
3.  **[CommandScheduler.ts](file:///Users/ismailimamoglu/Desktop/MotoCortex/src/core/queue/CommandScheduler.ts) [NEW]** - EDF ve SJF zamanlama asenkron kuyruk motoru.
4.  **[CommandRateLimiter.ts](file:///Users/ismailimamoglu/Desktop/MotoCortex/src/core/queue/CommandRateLimiter.ts) [NEW]** - Donanım profiline göre hız sınırlayıcı.
5.  **[BLEFragmentationBuffer.ts](file:///Users/ismailimamoglu/Desktop/MotoCortex/src/core/parser/BLEFragmentationBuffer.ts) [NEW]** - Delimited veri tamponu ve null bayt filtresi.
6.  **[ELMParser.ts](file:///Users/ismailimamoglu/Desktop/MotoCortex/src/core/parser/ELMParser.ts) [NEW]** - FSM durum makinesi, token öncelik çözücüsü ve yankı temizleyici.
7.  **[FlowControlManager.ts](file:///Users/ismailimamoglu/Desktop/MotoCortex/src/core/parser/FlowControlManager.ts) [NEW]** - Çoklu satır akış yöneticisi.
8.  **[ISOTPDecoder.ts](file:///Users/ismailimamoglu/Desktop/MotoCortex/src/core/parser/ISOTPDecoder.ts) [NEW]** - CAN ISO-TP paket birleştirici.
9.  **[KWPFrameDecoder.ts](file:///Users/ismailimamoglu/Desktop/MotoCortex/src/core/parser/KWPFrameDecoder.ts) [NEW]** - K-Line KWP2000 paket birleştirici ve Checksum doğrulayıcı.
10. **[PidRegistry.ts](file:///Users/ismailimamoglu/Desktop/MotoCortex/src/core/pids/PidRegistry.ts) [NEW]** - 80+ PID kataloğu, Güven Skoru, Temporal Sanity sıçrama koruması ve OEM bulut sürüm denetimi.
11. **[VehicleProfileDB.ts](file:///Users/ismailimamoglu/Desktop/MotoCortex/src/core/pids/VehicleProfileDB.ts) [NEW]** - Araç bazlı taramaheuristics veritabanı.
12. **[DiagnosticSessionRecorder.ts](file:///Users/ismailimamoglu/Desktop/MotoCortex/src/core/monitor/DiagnosticSessionRecorder.ts) [NEW]** - TX/RX oturum kaydedici günlük sistemi.
13. **[AppLifecycleCoordinator.ts](file:///Users/ismailimamoglu/Desktop/MotoCortex/src/core/transport/AppLifecycleCoordinator.ts) [NEW]** - iOS arka plan BLE kısıtlayıcı koordine sınıfı.
14. **[SessionHealthMonitor.ts](file:///Users/ismailimamoglu/Desktop/MotoCortex/src/core/monitor/SessionHealthMonitor.ts) [NEW]** - RTT, timeout ve bulut analitik entegrasyonu.
15. **[OBDCommandQueue.ts](file:///Users/ismailimamoglu/Desktop/MotoCortex/src/api/OBDCommandQueue.ts) [MODIFY]** - Modülleri yöneten hafif facade köprü sınıfı.
16. **[useBluetooth.ts](file:///Users/ismailimamoglu/Desktop/MotoCortex/src/hooks/useBluetooth.ts) [MODIFY]** - Handshake parmak izi, Slow-Init wake-up ve blind polling doğrulaması entegrasyonu.
