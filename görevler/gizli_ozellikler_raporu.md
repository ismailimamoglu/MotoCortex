# 🚗 MotoCortex - Gizli Özellik Açma & UDS Kodlama Küresel Raporu

**Proje:** MotoCortex Mobile (`motocortex-mobile`)  
**Veritabanı Katmanı:** `OemDatabaseProvider` / `FeatureCatalog`  
**Tarih:** 4 Ağustos 2026  
**Toplam Gizli Özellik Sayısı:** **208 Adet** (Küresel Liderlik Seviyesi)

---

## 📌 Genel Özet

MotoCortex uygulamasının **"Gizli Özellik Açma & UDS Kodlama"** kütüphanesinde **208 adet** marka, model, motosiklet ve yeni nesil EV platformuna özel gizli özellik tanımı barındırılmaktadır. 

Tüm özellikler **ISO 14229 (UDS)** ve **KWP2000** teşhis protokol seviyesinde tanımlanmış olup risk seviyelerine (*LOW, MEDIUM, HIGH*) ve SFD / SGW güvenlik katmanlarına uygun olarak koruma altına alınmıştır.

---

## 📊 Marka ve Üretici Bazlı Gizli Özellik Dağılım Tablosu

| Marka / Üretici Grubu | Desteklenen Markalar / Modeller | Toplam Özellik Sayısı | Öne Çıkan Kategori |
| :--- | :--- | :---: | :--- |
| **Volkswagen Grubu** | VW, Audi, SEAT, Skoda, Cupra, Porsche | **31** | Gösterge, Işıklandırma, Ambiyans |
| **BMW Car Grubu** | BMW (F/G serileri), MINI | **24** | Gösterge, Sürüş Modları, Retrofit |
| **Motosiklet Kütüphanesi** | BMW Motorrad, Ducati, KTM, Yamaha, Honda, Harley | **35** | Quickshifter, ESA Calibration, ABS Pro, Track Lap |
| **Ford** | Ford (Sync 3 / Sync 4 / Mustang) | **15** | Bambi Mode, Diagnostic Menu, Audio |
| **Toyota & Lexus** | Toyota, Lexus (EV / Hybrid / GR) | **13** | Soft-Close Retrofit, JBL 3D EQ, EV Throttle |
| **Hyundai & Kia** | Hyundai, Kia, Genesis (N-Line / EV) | **13** | N Grin Shift, N-Cluster Layout, Utility Mode |
| **Mercedes-Benz** | Mercedes-Benz (W205, W213, C257 vb.) | **12** | AMG Telemetri, Retrofit Dash Cam Power |
| **BYD (EV)** | BYD (Atto 3, Seal, Dolphin, Han) | **11** | V2L 3.6kW, AVAS Mute, Batarya Ön Isıtma |
| **Renault & Dacia** | Renault, Dacia (R-Link, EasyLink) | **8** | RS Monitor, Weather Themes, Yol Bilgisayarı |
| **Stellantis** | Fiat, Peugeot, Jeep | **7** | Off-Road Pages, 3D Cockpit, AdBlue Reminders |
| **Chery / Omoda** | Chery (Tiggo 7/8, Omoda 5 EV) | **5** | ISA Uyarısı Mute, Driver Monitor Camera |
| **Chevrolet (GM)** | Chevrolet, GMC, Cadillac | **5** | Super Cruise, V8 Cylinder Lock, HUD Calib |
| **Volvo & Polestar** | Volvo, Polestar | **4** | Polestar Kadran, Fatigue Camera Calib |
| **Tesla** | Tesla Model 3 / Y / S / X | **3** | Sentry Dashcam, DMS IR Camera Sensitivity |
| **Dodge & RAM** | Dodge, RAM Trucks | **3** | SRT Pages, Fog Lights with High Beam |
| **MG (EV)** | MG4 XPower, ZS EV | **3** | Launch Control, i-SMART, Manual Preheat |
| **XPeng (EV)** | XPeng G9, P7 | **3** | XNGP ADAS Unlock, Rhythm Lighting, Hitch View |
| **NIO (EV)** | NIO ET7, ES8 | **3** | Battery Swap Mode, NOMI Personalization |
| **Xiaomi (EV)** | Xiaomi SU7 HyperOS | **3** | Drift Mode Torque Vectoring, Boost Mode |
| **Audi / Skoda / Peugeot / Subaru** | Audi, Skoda, Peugeot, Subaru | **7** | Matrix LED, Traffic Sign, 3D Color, RCTA |
| **TOPLAM** | **28 Farklı Üretici Grubu** | **208** | **10 Ana Kategoriye Dağılmış** |

---

## 🎯 Kategori Bazlı Dağılım

1. **LIGHTING (Farlar & Aydınlatma):** 32 Özellik
2. **DISPLAY_INSTRUMENT (Gösterge & Kadran):** 35 Özellik
3. **DRIVING_COMFORT (Sürüş & Konfor):** 28 Özellik
4. **SECURITY_SAFETY (Güvenlik & Asistan):** 22 Özellik
5. **SOUND_ALERTS (Ses & İkazlar):** 16 Özellik
6. **MOTORCYCLE_ECU (Motosiklet UDS & Servis):** 35 Özellik
7. **RETROFIT_INTEGRATION (Donanım Tanıtımı):** 12 Özellik
8. **EASTER_EGG_FUN (Eğlence & Işık Şovları):** 8 Özellik
9. **EV_BATTERY_CHARGING (EV Batarya & Şarj):** 11 Özellik
10. **ADAS_CALIBRATION (Sürücü Asistanı Kalibrasyonu):** 9 Özellik

---

## 🛠 Güvenlik & Doğrulama Garantisi

- **%100 Ham Kullanıcı Erişimi:** Tüm özellikler doğrudan erişilebilir durumda listelenir.
- **Voltaj Koruması:** `< 12.2V` altında otomatik yazma engeli.
- **Rollback Snapshot:** Kodlama öncesi otomatik tam UDS DID yedeği.
- **26 Dil Senkronizasyonu:** Tüm özellik tanımları 26 dilde tam çeviri matrisine sahiptir.
