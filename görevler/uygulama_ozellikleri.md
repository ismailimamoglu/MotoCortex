# MotoCortex - Kapsamlı Uygulama Özellikleri ve Yetenek Raporu

**MotoCortex**, hem motosiklet hem de otomobil sürücüleri için geliştirilmiş; gerçek zamanlı telemetri takibi, gelişmiş OBD-II ve UDS arıza teşhisi, yapay zekalı bakım asistanı (AI Doctor), sürüş kaydı ve akıllı garaj yönetimi sunan uçtan uca kapsamlı bir araç telemetri ve teşhis platformudur.

Bu doküman, MotoCortex uygulamasının tüm modüllerini, teknik altyapısını ve sunduğu işlevleri detaylı bir şekilde özetlemektedir.

---

## 📋 İçindekiler
1. [Donanım Bağlantısı ve Protokol Desteği](#1-donanım-bağlantısı-ve-protokol-desteği)
2. [Canlı Telemetri ve Gösterge Paneli (Live Dashboard)](#2-canlı-telemetri-ve-gösterge-paneli-live-dashboard)
3. [Arıza Teşhis ve DTC Sistemleri (Diagnostic Trouble Codes)](#3-arıza-teşhis-ve-dtc-sistemleri-diagnostic-trouble-codes)
4. [Yapay Zeka Destekli Motor Doktoru (AI Doctor)](#4-yapay-zeka-destekli-motor-doktoru-ai-doctor)
5. [Gelişmiş Performans ve Teşhis Servisleri](#5-gelişmiş-performans-ve-teşhis-servisleri)
6. [Sürüş Kaydı, Harita Takibi ve GPX Aktarımı](#6-sürüş-kaydı-harita-takibi-ve-gpx-aktarımı)
7. [Akıllı Garaj ve Bakım Yönetimi](#7-akıllı-garaj-ve-bakım-yönetimi)
8. [Çevrimdışı (Offline-First) Depolama ve Bulut Senkronizasyonu](#8-çevrimdışı-offline-first-depolama-ve-bulut-senkronizasyonu)
9. [Güvenlik, Şifreleme ve Sistem Mimarisi](#9-güvenlik-şifreleme-ve-sistem-mimarisi)
10. [Abonelik ve Lisanslama Modeli (Free vs. Pro)](#10-abonelik-ve-lisanslama-modeli-free-vs-pro)

---

## 1. Donanım Bağlantısı ve Protokol Desteği

MotoCortex, piyasadaki standart ve lisanslı tüm OBD-II cihazlarıyla yüksek hızda iletişim kurar:

* **Çift Modlu Bluetooth Bağlantısı:**
  * **Bluetooth Low Energy (BLE / Bluetooth 4.0+):** Düşük güç tüketimi ve otomatik hızlı eşleşme.
  * **Bluetooth Classic (RFCOMM / SPP):** Yüksek veri transfer hızı gerektiren eski ve standart ELM327 adaptörleri ile tam uyum.
* **Çoklu Protokol Uyumluluğu:**
  * ISO 15765-4 (CAN Bus 11/29 bit, 250/500 kbaud)
  * ISO 14230-4 (KWP2000)
  * ISO 9141-2
  * SAE J1850 (PWM ve VPW)
* **Otomatik Araç ve ECU Tanıma:**
  * VIN (Vehicle Identification Number / Şasi Numarası) okuma ile araç marka, model ve motor tipini otomatik algılama (`VehicleIdentityService`).
  * Çoklu ECU tarama: Motor ECU'su, ABS ECU'su, Şanzıman (TCU) ve Gösterge paneli modüllerini ayrıştırarak tarama (`multiEcuService`).

---

## 2. Canlı Telemetri ve Gösterge Paneli (Live Dashboard)

Sürüş esnasında aracın anlık durumunu izlemek için tasarlanmış yüksek hızlı gösterge sistemi:

* **Anlık Sensör Takibi (PID Okuma):**
  * **Motor Verileri:** Devir (RPM), Gaz Kelebeği Pozisyonu (TPS), Emme Manifoldu Basıncı (MAP), Hava Akış Debisi (MAF).
  * **Sıcaklıklar:** Motor Soğutma Suyu Sıcaklığı (Coolant Temp), Emilen Hava Sıcaklığı (IAT), Yağ Sıcaklığı.
  * **Elektrik ve Şarj:** Akü Voltajı (Battery Voltage), Alternatör Şarj Durumu.
  * **Yakıt ve Emisyon:** Yakıt Depo Seviyesi, Yakıt Basıncı, Anlık ve Ortalama Yakıt Tüketimi.
* **Kişiselleştirilebilir Dijital Kadranlar:**
  * Spor, Ekonomi ve Teşhis modlarına özel dinamik renk ve grafik arayüzleri.
  * Yüksek yenileme frekansı (FPS) ile takılmasız veri akışı.
* **Sesli ve Görsel Erken Uyarılar:**
  * Motor hararet uyarısı (örn. > 105°C), aşırı devir (Redline) uyarısı, düşük akü voltajı (örn. < 11.8V) durumlarında anlık bildirimler.

---

## 3. Arıza Teşhis ve DTC Sistemleri (Diagnostic Trouble Codes)

Araçtaki sorunları servise gitmeden tespit etme ve müdahale etme yeteneği:

* **Tüm Sistemleri Kapsayan DTC Taraması:**
  * **Powertrain (P):** Motor ve Şanzıman arıza kodları.
  * **Chassis (C):** ABS, ESP ve Süspansiyon arıza kodları.
  * **Body (B):** Gövde, Klima, Aydınlatma ve Hava yastığı kodları.
  * **Network (U):** CAN Bus iletişim ve modül bağlantı hataları.
* **Arıza Lambası (MIL) Söndürme:**
  * Okunan kayıtlı ve beklemedeki arıza kodlarını (Stored & Pending DTCs) güvenli bir şekilde silme ve motor arıza ışığını söndürme.
* **DTC Akıllı Veri Tabanı:**
  * Kodların Türkçe karşılıkları, olası nedenleri ve çözüm adımlarından oluşan yerel kütüphane (`dtcIntelligenceService`).
* **Freeze Frame (Dondurulmuş Çerçeve) Verileri:**
  * Arıza oluştuğu anda sensörlerin aldığı değerleri (arızanın gerçekleştiği Hız, Devir, Sıcaklık) anlık görüntüleme.

---

## 4. Yapay Zeka Destekli Motor Doktoru (AI Doctor)

MotoCortex’i standart OBD uygulamalarından ayıran en güçlü özelliği, Supabase Edge Functions ve LLM altyapısıyla entegre **AI Doctor** sistemidir:

* **Türkçe Teşhis ve Analiz:** Arıza kodunu ve aracın canlı sensör geçmişini analiz ederek teknik jargon kullanmadan anlaşılır arıza özeti sunar.
* **Risk ve Aciliyet Seviyesi Tahmini:** Arızanın sürüşe engel olup olmadığını ("Yola Devam Edilebilir", "En Yakın Servise Gidin", "Motoru Hemen Durdurun") belirler.
* **Etkileşimli Sohbet (Chat) Arayüzü:** Sürücünün araçtaki garip sesleri, tekleme veya güç kaybı şikayetlerini yazarak yapay zekadan teşhis yardımı almasını sağlar (`aiDoctorService`).
* **Önleyici Bakım Önerileri:** Sürüş alışkanlıklarına göre gelecekte arızalanabilecek parçalar hakkında erken uyarı verir.

---

## 5. Gelişmiş Performans ve Teşhis Servisleri

İleri düzey kullanıcılar ve meraklılar için geliştirilmiş özel hesaplama ve teşhis modülleri:

* **Dyno & Performans Ölçümü (Beygir Gücü ve Tork):**
  * Araç kütlesi, ivmelenme verileri ve OBD devir/hız artış hızından yararlanarak gerçek zamanlı Beygir Gücü (HP) ve Tork (Nm) eğrisi hesaplama (`horsepowerService`).
  * 0-100 km/s, 100-200 km/s ve çeyrek mil (400m) hızlanma sürelerini hassas kaydetme.
* **Yakıt Karışım Analizi (Fuel Trim - STFT / LTFT):**
  * Kısa Dönem (STFT) ve Uzun Dönem (LTFT) yakıt düzeltme değerlerini analiz ederek motorun Zengin (Rich) veya Fakir (Lean) karışımda çalışıp çalışmadığını belirleme (`fuelTrimService`).
* **Dizel Partikül Filtresi Takibi (DPF Service):**
  * Dizel araçlar için DPF kurum doluluk oranını, son rejenerasyon mesafesini ve rejenerasyon durumunu izleme (`dpfService`).
* **Çift Kavramalı Şanzıman Kalibrasyonu (DCT Adaptation):**
  * DCT şanzıman uyarlama parametrelerini ve kavrama sağlık durumunu izleme (`dctAdaptationService`).
* **Aktüatör ve Komponent Testleri (UDS Service):**
  * Desteklenen araçlarda fan çalıştırma, enjektör kapatma, yakıt pompası aktif etme gibi aktif testler (`UdsActuatorService`).

---

## 6. Sürüş Kaydı, Harita Takibi ve GPX Aktarımı

Her sürüşü bir veri şölenine dönüştüren harita ve telemetri kayıt sistemi:

* **Eş Zamanlı Telemetri & GPS Kaydı:**
  * Harita üzerinde izlenen rotanın üzerine hız, devir, gaz pozisyonu ve yatmaları (motosikletler için eğim açısı) senkronize olarak işleme.
* **GPX / CSV Dışa Aktarım:**
  * Sürüş verilerini GPX formatında ihraç ederek Strava, Google Earth veya üçüncü parti analiz yazılımlarında açabilme (`gpxTelemetryRecorder`).
* **Sürüş İstatistikleri:**
  * Ortalama ve maksimum hız, toplam kat edilen mesafe, yakıt tüketimi, yatış açıları ve sürüş süresi özetleri.

---

## 7. Akıllı Garaj ve Bakım Yönetimi

Aracın periyodik bakımını ve yedek parça ömrünü takip eden dijital servis defteri:

* **Çoklu Araç Desteği:** Garaja birden fazla motosiklet veya otomobil ekleme, her birinin şasi numarası ve özelliklerini kaydetme.
* **Sarf Malzemesi Ömür Takibi:**
  * Motor Yağı & Yağ Filtresi
  * Fren Balataları ve Hidroliği
  * Tahrik Zinciri (Yağlama ve Gerginlik Takibi)
  * Buji, Hava Filtresi, Kayış / Debriyaj seti
* **Zaman ve Kilometre Bazlı Hatırlatıcılar:**
  * Gelecek bakım yaklaştığında uygulama içi ve push bildirimler.
* **Servis ve Harcama Geçmişi:** Bakım maliyetlerini ve değiştirilen parçaları tutarla kaydetme.

---

## 8. Çevrimdışı (Offline-First) Depolama ve Bulut Senkronizasyonu

İnternet erişiminin olmadığı dağ yollarında dahi verilerin kaybolmamasını sağlayan mimari:

* **Yerel Veri Tabanı (Expo SQLite):**
  * Tüm sürüş kayıtları, sensör arabelleği (buffer) ve DTC tanımları cihazın yerel belleğinde saklanır (`TelemetryBuffer`).
* **Akıllı Senkronizasyon Yöneticisi (TelemetrySyncManager):**
  * İnternet bağlantısı geldiğinde (NetInfo kontrolü ile) arka planda verileri güvenli bir şekilde Supabase bulut veri tabanına yükler.
* **Sıfır Veri Kaybı Garantisi:** Ağ kesintilerinde veri kuyruğu (queue) yönetimi ile paketlerin sırayla ve güvenle iletilmesi.

---

## 9. Güvenlik, Şifreleme ve Sistem Mimarisi

* **Kriptografik Güvenlik:**
  * `TweetNaCl` ile hassas kullanıcı ve araç telemetri verilerinin uçtan uca şifrelenmesi.
* **Güvenli Kimlik Doğrulama & Depolama:**
  * Supabase Auth & JWT token yönetimi.
  * Cihaz seviyesinde hassas veriler için `Expo SecureStore` kullanımı.
* **Sistem Sağlığı ve Analitik:**
  * Firebase Crashlytics ile anlık çökme raporlaması.
  * Firebase Analytics ile anonim performans analitiği.
  * OTA (Over-The-Air) canlı kod güncelleme desteği (`OtaService`).

---

## 10. Abonelik ve Lisanslama Modeli (Free vs. Pro)

MotoCortex, temel özellikleri ücretsiz sunarken ileri seviye teşhis ve AI özelliklerini RevenueCat entegrasyonlu Pro üyelik ile kilitler:

| Özellik / İşlev | Ücretsiz (Free) | Pro Üyelik |
| :--- | :---: | :---: |
| **Canlı Gösterge Paneli** | Temel Sensörler (Hız, RPM, Sıcaklık) | Tüm Sensörler & Özel Göstergeler |
| **DTC Arıza Kodu Okuma** | Powertrain (P) Kodları | Tüm Kodlar (P, C, B, U + Marka Özel) |
| **DTC Silme & MIL Söndürme** | Sınırlı (Ayda 1 kez) | Sınırsız |
| **AI Doctor (Yapay Zeka)** | Sadece Kod Tanımı | Sınırsız Türkçe Teşhis, Risk & Chat |
| **Dyno & Performans Ölçümü** | ❌ Yok | ✅ Var (HP/Nm & 0-100 Ölçümü) |
| **Fuel Trim & DPF Analizi** | ❌ Yok | ✅ Var |
| **GPX Veri Aktarımı** | ❌ Yok | ✅ Var |
| **Çoklu Araç Garajı** | 1 Araç | Sınırsız Araç |
| **Çevrimdışı Senkronizasyon** | ✅ Var | ✅ Var |

---

### 📌 Sonuç
MotoCortex; donanım seviyesindeki iletişim sürücülerinden bulut yapay zeka servislerine kadar uzanan, araç sürücülerinin güvenlik, performans ve bakım ihtiyaçlarını tek bir merkezden karşılayan kapsamlı bir teknolojidir.
