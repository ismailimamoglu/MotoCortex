# 🌍 MotoCortex — Global Pazar Araştırması & Yeni Gizli Özellik Yol Haritası

**Proje:** MotoCortex Mobile (`motocortex-mobile`)
**Veritabanı Katmanı:** `OemDatabaseProvider` / `FeatureCatalog`
**Rapor Tarihi:** Mayıs 2026
**Mevcut Özellik Sayısı:** 103
**Bu Raporda Önerilen Yeni Özellik Sayısı:** **+147 (Toplam hedef: 250)**
**Hedef Pazar:** Global (US, EU, TR, MENA, LATAM, SEA)

---

## 📌 Yönetici Özeti

MotoCortex, VW-Audi Grubu, BMW, Mercedes ve popüler markalarda güçlü bir "gizli özellik açma & UDS kodlama" katalogu (103 adet) ile başlangıç yaptı. Ancak global rakip analizi ve 2026 pazar dinamikleri, MotoCortex'in **pazarda öne çıkabilmek için 3 kritik yönde büyümesi** gerektiğini gösteriyor:

1. **Marka & Model Kapsamının Genişletilmesi** → Rakiplerin en zayıf halkası: Çin EV'leri, Japon markaları, Kore markalarında derin coding, elektrikli minivan/ticari araç segmenti.
2. **Yeni Nesil Kategorilerin Eklenmesi** → ADAS kalibrasyon workflow'ları, AI destekli arıza tespiti, EV batarya sağlık analitiği, dokunmatik özelleştirme, gamification.
3. **Rakiplerden Farklılaşan Monetizasyon** → Abonelik yorgunluğuna karşı **tek seferlik + credit hibrit modeli**, topluluk marketplace'i, garaj/atölye planı, atölye onay sistemi (SFD Master).

Pazar büyüklüğü verileri güçlü rüzgarı doğruluyor:
- Otomotiv teşhis tarayıcı pazarı **2026'da ~40.6B USD** → 2034'te 69B USD (CAGR %6.9). [Fortune Business]
- ADAS kalibrasyon hizmet pazarı **2026'da 5.46B USD** → 2033'te 13.32B USD (CAGR %13.6). [Coherent Market Insights]
- EV adaptasyonu, yazılım-yoğun teşhis talebini patlatıyor.

---

## 🎯 Bölüm 1 — Global Rakip Analizi (Deep Dive)

### 1.1 OBDeleven (Voltas IT / Litvanya)

| Kategori | Detay |
| :--- | :--- |
| **Konum** | VAG (VW/Audi/Skoda/Seat/Cupra) uzmanı, 2024'ten sonra BMW/Toyota/Ford/Mercedes'e sınırlı genişleme |
| **Fiyat Modeli** | Freemium + Credit + Yıllık PRO/ULTIMATE abonelik |
| **PRO** | €59–€99/yıl → Manuel long coding, adaptasyonlar, security access |
| **ULTIMATE** | €189–€299/yıl → Sınırsız One-Click Apps, OCAbuilder, RAW data |
| **Credit** | 10 kredi ≈ €5, çoğu One-Click App 10 kredi |
| **Güçlü Yönleri** | VAG için en büyük One-Click Apps kütüphanesi (500+), stabil BLE bağlantısı, güçlü topluluk |
| **Zayıf Yönleri** | Non-VAG markalarda çok sığ; abonelik yorgunluğu (Reddit şikayeti yüksek); Çin EV desteği yok; ADAS kalibrasyonu yok; AI özelliği yok |

### 1.2 Carly (Carly Solutions / Almanya)

| Kategori | Detay |
| :--- | :--- |
| **Konum** | Multi-brand basic diagnostic; derin coding sadece BMW/Mini/VAG/Mercedes |
| **Fiyat Modeli** | Yıllık abonelik (marka bazında) |
| **BMW/Mini Yıllık** | ~€79.99 |
| **All Brands** | ~€149.99/yıl |
| **Smart Mechanic add-on** | ~€19.99/yıl |
| **Güçlü Yönleri** | En polished UI, "Used Car Check" (kilometre sahtekarlık tespiti), 12+ marka basic OBD, Almanya markası güveni |
| **Zayıf Yönleri** | Trustpilot'ta abonelik şikayetleri yüksek; güncelleme sonrası özellik kaybı raporları; coding derinliği OBDeleven'in gerisinde; **hardware bağımlılığı** (kendi adapter'ı zorunlu) |

### 1.3 BimmerCode + BimmerLink (Appomotive / Almanya)

| Kategori | Detay |
| :--- | :--- |
| **Konum** | Sadece BMW & MINI, ikili app stratejisi |
| **Fiyat Modeli** | **Tek seferlik satın alma** (rakiplerden farklılaşan en büyük koz) |
| **BimmerCode** | ~$39.99 iOS / $49.99 Android |
| **BimmerLink** | ~$39.99 (diagnostic + service reset + exhaust flap kontrolü) |
| **Güçlü Yönleri** | Abonelik yok, "sat ve unut" modeli, BMW community favorisi, çok stabil |
| **Zayıf Yönleri** | Tek marka; hardware olarak OBDLink MX+ öneriliyor (ekstra maliyet); AI/ADAS yok; yeni özellik ekleme yavaş |

### 1.4 VCDS (Ross-Tech / ABD)

| Kategori | Detay |
| :--- | :--- |
| **Konum** | Profesyonel VAG teşhis, atölye standardı |
| **Fiyat Modeli** | **Tek seferlik $200+ hardware bundle**; abonelik yok |
| **Güçlü Yönleri** | En derin VAG erişimi, endüstri gold standard, güçlü log/data analiz |
| **Zayıf Yönleri** | Windows-only, mobil değil, öğrenme eğrisi çok dik, sadece VAG, UI arkaik |

### 1.5 Diğer Öne Çıkanlar

| Rakip | Kısa Konum | Fiyat | Achilles' Heel |
| :--- | :--- | :--- | :--- |
| **Carista** | Multi-brand mobil coding, orta seviye | €29.99–€79.99/yıl | Coding derinliği sığ |
| **Loki Pro** | Tesla & Rivian teşhis uzmanı | Yıllık €200+ | Sadece EV, dar niş |
| **ODIS-S/E** | VAG resmi (piratelenmiş kullanım) | — | Yasal risk, hardware zorunlu |
| **INPA/ISTA** | BMW resmi (piratelenmiş) | — | Windows, teknik zorluk |
| **XTOOL / Launch / Autel** | Hardware odaklı profesyonel tarayıcı | $500–$3000 | Consumer için pahalı |
| **FIXD** | Consumer diagnostic (US) | $9.99/ay | Coding yok, sadece DTC |

---

## 🔥 Bölüm 2 — Rakiplerin Kolektif Zayıf Noktaları (MotoCortex Fırsat Haritası)

Reddit, Trustpilot, YouTube yorumları ve blog forumlarında **tekrar eden şikayetler**:

### Şikayet 1: Abonelik Yorgunluğu ("Subscription Fatigue")
- Carly ve OBDeleven'de en yüksek şikayet oranı bu.
- BimmerCode'un tek seferlik modeli community favorisi.
- **MotoCortex fırsatı:** Hibrit model — temel özellikler tek seferlik, premium/AI özellikler abonelik.

### Şikayet 2: "Advertised but not working" — Reklamda vardı, arabamda yok
- Özellikle non-core markalarda büyük problem.
- **MotoCortex fırsatı:** **VIN-öncesi uyumluluk garantisi** → Kullanıcı VIN girer, uygulama net "bu araçta %100 çalışır / çalışmaz" listesi verir. Yanlış çıkarsa iade garantisi.

### Şikayet 3: Ülkeye/Bölgeye göre kısıtlamalar (Region lock)
- "Feature X in USA works but not in EU" tarzı yakınmalar çok.
- **MotoCortex fırsatı:** Region-aware katalog + toggle uyarısı ("Bu özellik EU homologation ile çakışabilir").

### Şikayet 4: Çin EV ve yeni markalar desteklenmiyor
- BYD, XPeng, NIO, Zeekr, Li Auto, MG, Chery, Great Wall, Geely, Omoda, Jaecoo pazarları hızla büyüyor ama hiçbir rakip derin destek vermiyor.
- **MotoCortex fırsatı:** **Çin EV'lerinde global lider olma pozisyonu** — hızlı büyüyen mavi okyanus.

### Şikayet 5: ADAS kalibrasyon workflow'u yok
- 2026 sonrası Euro-NCAP ve NHTSA regülasyonları ADAS kalibrasyonu zorunlu kıldıkça, teşhis app'leri ADAS'a girmediği için atölyeler harici pahalı ekipman kullanıyor.
- **MotoCortex fırsatı:** **Camera/Radar/Lidar kalibrasyon adım-adım rehber** (kalibrasyon işlemini başlatabilme + hedef pozisyonlama görselleri).

### Şikayet 6: EV batarya sağlık analizi yüzeysel
- Kullanıcılar ikinci el EV alırken **battery state of health (SOH)** raporu istiyor.
- Şu an sadece Tesla ve Rivian resmi service mode ile veriyor.
- **MotoCortex fırsatı:** **Universal EV Health Report** (PDF, iCloud/Drive'a çıktı).

### Şikayet 7: "Coding sonrası pişman oldum, geri alamıyorum"
- Backup / Restore workflow'ları rakiplerde sığ.
- **MotoCortex fırsatı:** **1-tık kodlama snapshot & rollback**, opsiyonel "Time Machine" (30 gün geri git).

### Şikayet 8: Topluluk yok, kodlama tarifi bulmak zor
- OBDeleven forumu var ama izole; Reddit'te dağınık.
- **MotoCortex fırsatı:** **In-app topluluk marketplace** — kullanıcılar kendi coding tariflerini paylaşır, upvote, oy, uzman-onaylı rozet.

### Şikayet 9: SFD (Software Feature Deactivation) barrier
- VAG ve BMW yeni araçlarında SFD/OBD Firewall her yıl daha sıkı → kullanıcı kilit çözemiyor.
- **MotoCortex fırsatı:** **SFD Master atölye ağı** — MotoCortex partner atölyelerinde tek tık SFD ödemesi ile açtırma.

### Şikayet 10: Motosiklet, kamyon, karavan, deniz motoru yok
- Yamaha, BMW Motorrad, Ducati, Harley, MAN kamyon, Iveco, Mercedes karavan gibi segmentler tamamen ıskalanmış.
- **MotoCortex fırsatı:** **"MotoCortex Beyond"** — moto & karavan & kamyon coding modülü.

---

## 🚗 Bölüm 3 — Marka & Model Kapsamı Genişletmesi (Yeni +63 Özellik)

### 3.1 Volvo & Polestar Kapsamının Derinleştirilmesi (mevcut 2 → 12)

| # | Özellik | Kategori | Risk |
| :--- | :--- | :--- | :--- |
| VOL-1 | Pilot Assist Highway Steering Aggression Curve | DRIVING_COMFORT | MEDIUM |
| VOL-2 | Volvo Sensus Off-Road Skid Plate Cam View | DISPLAY_INSTRUMENT | LOW |
| VOL-3 | Polestar 2 One-Pedal "Firm" Regen Preset Lock | DRIVING_COMFORT | LOW |
| VOL-4 | Volvo Care Key Speed Limiter Bypass (owner-only) | SECURITY_SAFETY | HIGH |
| VOL-5 | XC90 T8 Battery Save %60 → %90 Threshold Custom | DRIVING_COMFORT | LOW |
| VOL-6 | Bowers & Wilkins Concert Hall Presets Unlock | SOUND_ALERTS | LOW |
| VOL-7 | Google Automotive Services (GAS) Region Unlock | DISPLAY_INSTRUMENT | MEDIUM |
| VOL-8 | Polestar 3 Air Suspension Manual Height Menu | DRIVING_COMFORT | MEDIUM |
| VOL-9 | Volvo EX30 Frunk Auto Open Toggle | SECURITY_SAFETY | LOW |
| VOL-10 | Adaptive Cruise Full-Stop Auto Resume Timer | DRIVING_COMFORT | LOW |

### 3.2 Peugeot / Citroën / DS / Opel (Stellantis PSA) Kapsamı (+8)

| # | Özellik | Not |
| :--- | :--- | :--- |
| PSA-1 | Peugeot 3D i-Cockpit Advanced Config Menu | Mevcut var, genişletildi |
| PSA-2 | e-Tense / e-208 Battery Preconditioning Manual Trigger | EV |
| PSA-3 | Citroën Advanced Comfort Suspension Sport Toggle | Sedan/hatch |
| PSA-4 | Opel Insignia GSi Sports Chrono Display | Perf |
| PSA-5 | DS Automobiles Night Vision Manual Enable | LOW pazar özel |
| PSA-6 | Peugeot Sport Engineered Launch Control Unlock | HIGH risk |
| PSA-7 | Stellantis STLA Medium/Large Platform OTA Rollback | Yeni platform |
| PSA-8 | Opel Astra Electric % SOC Cluster Display | EV |

### 3.3 Nissan / Infiniti (+6)

| # | Özellik |
| :--- | :--- |
| NIS-1 | Nissan Ariya e-Step One-Pedal Full-Stop Enable |
| NIS-2 | GT-R R35 Launch Control Threshold Unlock |
| NIS-3 | Nissan ProPILOT Assist 2.0 Hands-Free Extension |
| NIS-4 | Infiniti Q50 Direct Adaptive Steering Ratio Custom |
| NIS-5 | Leaf ZE1 Rapid Charge Temperature Buffer Adjustment |
| NIS-6 | Ariya B-Mode Regen Aggressiveness Selector |

### 3.4 Honda / Acura (+6)

| # | Özellik |
| :--- | :--- |
| HON-1 | Honda Sensing Adaptive Cruise Cut-in Sensitivity |
| HON-2 | Civic Type R Individual Drive Mode Save |
| HON-3 | Accord Hybrid EV Priority Speed Cap Extension (120 km/h) |
| HON-4 | Acura NSX Sport+ Launch Control Rev Cut |
| HON-5 | Honda e:Ny1 Regen Paddle Preset Lock |
| HON-6 | Honda Prologue OnStar-lite Toggle |

### 3.5 Mazda / Subaru (+6)

| # | Özellik |
| :--- | :--- |
| MAZ-1 | Mazda MX-5 ND2 Steering Assist Curve |
| MAZ-2 | CX-60 PHEV Force Charge to 80% |
| MAZ-3 | Skyactiv-X SPCCI Idle Mode Display |
| SUB-1 | Subaru WRX SI-Drive Sport# Fuel Map Toggle |
| SUB-2 | Subaru Solterra Snow Mode + Downhill Assist Combo |
| SUB-3 | EyeSight 4.0 Curve Speed Learning Reset |

### 3.6 Suzuki / Isuzu / Mitsubishi (+5)

| # | Özellik |
| :--- | :--- |
| SUZ-1 | Vitara AllGrip Snow/Sport Memory |
| SUZ-2 | S-Cross Hybrid EV Boost Threshold |
| MIT-1 | Outlander PHEV Charge Mode Trigger Speed |
| MIT-2 | Lancer Evo AYC Yaw Sensitivity (retro) |
| ISU-1 | D-Max Trailer Sway Control Tuning |

### 3.7 Çin EV Ekosistemi (Global Farklılaşma) — **BÜYÜK FIRSAT** (+12)

Rakiplerin çok az veya sıfır desteklediği alan. Global expansion için altın anahtar.

| # | Özellik | Marka |
| :--- | :--- | :--- |
| CH-1 | XPeng G9/P7i XNGP Beta Region Unlock | XPeng |
| CH-2 | NIO ET7 Battery Swap Interval Reminder Custom | NIO |
| CH-3 | Li Auto L9 Range Extender Force-Off Below Fuel Threshold | Li Auto |
| CH-4 | Zeekr 001 Yamaha Sound System Concert Mode | Zeekr |
| CH-5 | MG4 XPower Launch Control Enable | MG |
| CH-6 | Omoda 5 EV Battery Preheat Manual Trigger | Chery/Omoda |
| CH-7 | GWM Ora Cat Ambient Palette Extension | Great Wall |
| CH-8 | Geely Zeekr X Air Suspension Height Custom | Geely |
| CH-9 | Nio ES8 Sentry Mode (Watchdog) Enable | NIO |
| CH-10 | BYD Seal Cybertruck-style Frunk Enable | BYD ekstra |
| CH-11 | Xiaomi SU7 HyperOS Driver Profile Sync | Xiaomi |
| CH-12 | Jaecoo J7 SHS Hybrid EV Priority Mode | Chery |

### 3.8 Amerikan Pickup & SUV Detaylandırması (+6)

| # | Özellik |
| :--- | :--- |
| US-1 | Ford F-150 Lightning Pro Power Onboard 9.6kW Unlock |
| US-2 | Rivian R1T Tank Turn Enable (offroad closed lot) |
| US-3 | Chevy Silverado EV Range Estimator Trailer Mode Fine-tune |
| US-4 | GMC Hummer EV CrabWalk Speed Limit Extension |
| US-5 | Dodge Charger Daytona SRT Fratzonic Chambered Exhaust Volume |
| US-6 | Cadillac Escalade IQ Super Cruise Hands-Free Preview |

### 3.9 Motosiklet Segmenti — Yeni Kategori (+4 pilot özellik)

**"MotoCortex Beyond — Two Wheels"** modülü:

| # | Özellik | Marka |
| :--- | :--- | :--- |
| MOT-1 | BMW Motorrad S1000RR Anti-Wheelie Level Custom | BMW Motorrad |
| MOT-2 | Ducati Panigale V4 Quick Shift Reverse Pattern Toggle | Ducati |
| MOT-3 | Yamaha MT-09 SP TCS Cornering Threshold | Yamaha |
| MOT-4 | KTM 890 Duke R Track Mode Wheelie Ceiling | KTM |

---

## 🧠 Bölüm 4 — Yeni Nesil Kategoriler (Yeni +54 Özellik / Yeni Kategori Ağırlığı)

Mevcut 5 kategori: `DISPLAY_INSTRUMENT`, `DRIVING_COMFORT`, `LIGHTING`, `SOUND_ALERTS`, `SECURITY_SAFETY`.

**+7 Yeni Kategori öneriliyor:**

### KATEGORI: `ADAS_CALIBRATION` (13 özellik)

Bu, hiçbir rakibin (BimmerLink hariç) girmediği bir alan. 2026 sonrası regülasyon zorunluluğu.

| # | Özellik | Not |
| :--- | :--- | :--- |
| ADAS-1 | Front Radar Static Calibration Wizard | Adım adım rehber + hedef fotoğraf overlay |
| ADAS-2 | Front Camera Dynamic Calibration (10km highway) | Live progress bar |
| ADAS-3 | Rear Radar Blind Spot Angle Reset | |
| ADAS-4 | Surround View Camera Stitching Recalibration | |
| ADAS-5 | Lane Keeping Assist Torque Curve Custom | |
| ADAS-6 | Traffic Jam Assist Follow Distance Fine-Tune | |
| ADAS-7 | Cross-Traffic Alert Sensitivity Adjust | |
| ADAS-8 | Automatic Emergency Braking (AEB) Threshold Preview | |
| ADAS-9 | Steering Angle Sensor Zero Point Reset | Post-alignment |
| ADAS-10 | Radar Cluster Post-Bumper-Replacement Reinit | Body shop workflow |
| ADAS-11 | HUD Ghost Image Correction | |
| ADAS-12 | DMS (Driver Monitoring) Camera IR Threshold | |
| ADAS-13 | Night Vision Camera Alignment | LOW pazar özel |

**İş Modeli**: Bu kategori pro atölye planı (aylık €49–99) altında tutulabilir.

### KATEGORI: `EV_BATTERY_INTEL` (9 özellik)

Rakip zayıflığı büyük; ikinci el EV pazarında en aranan özellik.

| # | Özellik |
| :--- | :--- |
| EV-1 | Universal Battery State of Health (SOH) Report → PDF export |
| EV-2 | Cell Voltage Delta Heatmap (canlı grafik) |
| EV-3 | Charge Curve Recording & Comparison Between Sessions |
| EV-4 | Battery Cycle Count Estimation (VAG/BMW/Tesla/BYD OEM formülleri) |
| EV-5 | DC Fast Charge Session Efficiency Log |
| EV-6 | Battery Preconditioning Auto-Trigger on Route |
| EV-7 | Winter Range Prediction Neural Model |
| EV-8 | Regen Efficiency Score (drive coaching) |
| EV-9 | HV Battery Contactor Cycle Count |

### KATEGORI: `AI_DIAGNOSTIC_ASSIST` (10 özellik)

Ana farklılaştırıcı → Emergent LLM ile entegrasyon.

| # | Özellik |
| :--- | :--- |
| AI-1 | DTC Kod → Doğal Dil Açıklama (multi-language, TR/EN/DE/ES/FR/AR/ZH) |
| AI-2 | "Arabam neden titriyor?" — Semptom-tabanlı arıza teşhis chat |
| AI-3 | Live Data Anomaly Detector (ML sınıflandırıcı) |
| AI-4 | Repair Cost Estimator (bölgeye göre atölye fiyat DB'si) |
| AI-5 | OEM TSB (Technical Service Bulletin) Auto-Match |
| AI-6 | Predictive Maintenance Alert ("timing chain 8000 km içinde") |
| AI-7 | Coding Recommendation Engine (kullanıcı zevkine göre öner) |
| AI-8 | Auto-Generated Coding Report PDF (atölye teslim) |
| AI-9 | Voice-first Interactive Coding Wizard (hands-free) |
| AI-10 | Photo-based Dash Symbol Recognition (kamera → "ne demek?") |

### KATEGORI: `PERSONALIZATION_STUDIO` (8 özellik)

Y ve Z jenerasyonu için "kişiselleştirme" ana lifestyle segmenti.

| # | Özellik |
| :--- | :--- |
| PS-1 | Custom Startup Boot Splash (kullanıcı görsel yükler → base64) |
| PS-2 | Ambient Lighting Music-Reactive Mode (Bluetooth Audio Sync) |
| PS-3 | Multi-Driver Profile Fingerprint (Bluetooth key based) |
| PS-4 | Custom Turn Signal Cadence (patent-safe hız/pattern) |
| PS-5 | Widget-based Cluster Layout Editor (drag & drop mockup) |
| PS-6 | Custom Digital Speedometer Font Pack |
| PS-7 | Seasonal Theme Auto-Switch (kış/yaz UI) |
| PS-8 | Voice Prompt Language Swap (AI TTS destekli) |

### KATEGORI: `SECURITY_HARDENING` (5 özellik)

Yeni bir talep: **Anti-tow, anti-theft, KeyLess relay saldırıları**.

| # | Özellik |
| :--- | :--- |
| SH-1 | KeyLess Relay Attack Protection (motion-detect key sleep) |
| SH-2 | Anti-Tow Sensor Enable + Push Notification |
| SH-3 | Emergency Immobilizer PIN (SMS-triggered) |
| SH-4 | Sentry-Style Multi-Cam Recording (Dashcam ECU stream) |
| SH-5 | OBD Port Physical Lockout Mode |

### KATEGORI: `WORKSHOP_TOOLS` (6 özellik)

Küçük atölyelere yönelik SaaS aşaması.

| # | Özellik |
| :--- | :--- |
| WS-1 | Multi-Vehicle Job Queue Dashboard |
| WS-2 | Customer Handover Digital Signature |
| WS-3 | Coding History Audit Log (per VIN) |
| WS-4 | Team Roles: Owner / Tech / Trainee |
| WS-5 | Warranty-Safe Mode (log & undo track) |
| WS-6 | Invoice Auto-Generation (per-coding fee) |

### KATEGORI: `COMMUNITY_MARKETPLACE` (3 özellik)

| # | Özellik |
| :--- | :--- |
| CM-1 | User-Submitted Coding Recipe Library (upvote, comment) |
| CM-2 | Expert-Verified "Gold Star" Badges |
| CM-3 | Regional Leaderboard (TR / DE / US en aktif garaj) |

---

## 💸 Bölüm 5 — Monetizasyon & Pazarlama Özellikleri (Yeni +12 Özellik)

### 5.1 Hibrit Fiyat Modeli (Rakiplerden en büyük ayrışma)

| Plan | Fiyat | Kapsam |
| :--- | :--- | :--- |
| **Free** | €0 | 5 DTC/gün, basic diagnostic, VIN sorgula |
| **Starter — Tek Seferlik** | €49 (lifetime, tek marka) | BimmerCode benzeri modelin popülerliği; MotoCortex ilk seçimi |
| **Enthusiast** | €89/yıl (multi-marka) | Tüm consumer coding, community marketplace |
| **Pro AI** | €149/yıl | AI diagnostic + Predictive maintenance + EV Battery Intel |
| **Workshop** | €499/yıl (per shop, 3 users) | ADAS Calibration + Workshop Tools + Warranty-safe |
| **Credits** | Micro-transaction | Nadir OCA'lar, SFD unlock partner atölye ücretleri |

### 5.2 Marketing & Growth Feature Set

| # | Özellik | Amaç |
| :--- | :--- | :--- |
| M-1 | **VIN Pre-Check** — girmeden önce "bu araç için 47 özellik var" gösterge | Conversion booster |
| M-2 | **Referral Credits** — arkadaş getir 20 credit | Viral growth |
| M-3 | **Auto-generated "Before/After" video kartları** (sosyal paylaşım) | TikTok/Reels viral |
| M-4 | **In-app Coding "Wow" Meter** — animasyonlu ilerleme + gamification | Retention |
| M-5 | **Weekend Free Pack** — Cuma-Pazar 3 free OCA | Weekend churn azaltma |
| M-6 | **Loyalty Passport** — X coding tamamla → altın rozet + %20 indirim | LTV artışı |
| M-7 | **Regional Language Auto-Detect** (TR, EN, DE, ES, FR, AR, ZH, RU, PT) | Global aktivasyon |
| M-8 | **Partner Workshop Directory** — MotoCortex sertifikalı atölye haritası | B2B revenue |
| M-9 | **Coding Marketplace Commission** — kullanıcı tarifesi satılırsa %30 komisyon | Marketplace revenue |
| M-10 | **Insurance Integration Beta** — otonom coding sonrası policy compliance mesajı | Compliance |
| M-11 | **Push Notification: "New OTA arrived — 3 new features available"** | Re-engagement |
| M-12 | **Refer-a-Fleet Program** — filo müdürleri için özel plan | B2B growth |

---

## 🛡️ Bölüm 6 — Güvenlik, Uyumluluk & Risk Yönetimi

Yeni özellikleri eklerken **yasal ve güvenlik risklerini** ele almadan pazar kaybederiz.

| Risk Alanı | Mitigation | Yeni Özellik |
| :--- | :--- | :--- |
| Garanti reddi | Warranty-Safe Mode + Rollback Snapshot | 🔴 Var |
| Homologation ihlali (EU) | Region-aware toggle uyarı | 🔴 Var |
| SFD kilit atlatma yasal riski | Sadece Partner Workshop üzerinden çözüm | 🔴 Var |
| GDPR (VIN + kişisel veri) | E2E encryption + Right-to-erase | 🟡 Eklenecek |
| Yaş sınırı (Launch Control) | 21+ doğrulama + Track-only lock | 🟢 Öneri |
| ADAS off riski | Otomatik audit log + zorunlu re-enable prompt | 🔴 Var |
| Çin ithal araçlarda VIN yok | Manual VIN synthesis fallback | 🟢 Öneri |

---

## 📊 Bölüm 7 — Rekabetçi Konumlanma Matrisi

Katalog toplamı: **103 mevcut + 147 önerilen = 250 özellik**

| Boyut | OBDeleven | Carly | BimmerCode | VCDS | **MotoCortex (Hedef)** |
| :--- | :---: | :---: | :---: | :---: | :---: |
| Marka çeşitliliği | 🟡 | 🟢 (yüzeysel) | 🔴 (BMW) | 🔴 (VAG) | 🟢 **14 → 22 grup** |
| Coding derinliği | 🟢 (VAG) | 🟡 | 🟢 (BMW) | 🟢 | 🟢 |
| Çin EV desteği | 🔴 | 🔴 | 🔴 | 🔴 | 🟢 **Lider** |
| ADAS kalibrasyon | 🔴 | 🔴 | 🟡 | 🟡 | 🟢 **Yeni kategori** |
| AI teşhis | 🔴 | 🔴 | 🔴 | 🔴 | 🟢 **Yeni kategori** |
| EV batarya intel | 🟡 | 🔴 | 🔴 | 🔴 | 🟢 |
| Tek seferlik satın alma | 🔴 | 🔴 | 🟢 | 🟢 | 🟢 (hibrit) |
| Topluluk marketplace | 🔴 | 🔴 | 🔴 | 🔴 | 🟢 **Yeni** |
| Workshop planı | 🟡 | 🔴 | 🔴 | 🟡 | 🟢 |
| Motosiklet / kamyon | 🔴 | 🔴 | 🔴 | 🔴 | 🟢 **Beyond Modülü** |
| Multi-dil (10+) | 🟡 | 🟡 | 🟡 | 🔴 | 🟢 |

---

## 🗓️ Bölüm 8 — Yol Haritası Önerisi (Q3 2026 → Q2 2027)

### Faz 1 — Q3 2026 (Kapsam Genişletme)
- Marka & model yeni özellikleri (Volvo, PSA, Nissan, Honda, Mazda, Subaru = +34 özellik)
- VIN Pre-Check + Warranty-Safe Mode + Rollback Snapshot
- Multi-dil desteği (TR/EN/DE/ES/FR/AR)

### Faz 2 — Q4 2026 (Yeni Nesil Kategoriler)
- ADAS Calibration modülü (13 özellik)
- EV Battery Intel (9 özellik)
- Personalization Studio (8 özellik)
- Hibrit fiyat modeli lansmanı

### Faz 3 — Q1 2027 (AI + Community)
- AI Diagnostic Assist (10 özellik, Emergent LLM)
- Community Marketplace + expert badges
- Referral program
- Çin EV paketi (12 özellik)

### Faz 4 — Q2 2027 (Workshop SaaS + Beyond)
- Workshop Tools (6 özellik, B2B)
- MotoCortex Beyond — Motosiklet pilot (4 özellik)
- Partner Workshop Directory + SFD Master ağı
- Insurance Integration beta

---

## 🎯 Bölüm 9 — Öne Çıkma Stratejisi (One-liner Positioning)

> **"MotoCortex — 250+ gizli özellik, AI destekli teşhis, VIN garantili uyum. Abonelik esareti yerine tek seferlik başlat, ihtiyacınız kadar büyüyün."**

Marka mesaj öğeleri:
1. **VIN-safe** → satın almadan önce garanti
2. **AI-powered** → dünyadaki tek AI destekli coding uygulaması
3. **Global-EV-ready** → BYD'den Xiaomi'ye Çin EV'lerinde lider
4. **Own it, don't rent it** → tek seferlik satın alma opsiyonu
5. **Community-driven** → 10.000+ kullanıcı coding tarifi

---

## 📈 Bölüm 10 — Beklenen İş Etkisi (Muhafazakar Tahmin)

| KPI | Bugün (mevcut) | 6 Ay Sonra (Faz 1-2) | 12 Ay Sonra (Faz 1-4) |
| :--- | :---: | :---: | :---: |
| Aktif marka sayısı | 14 | 22 | 26 |
| Toplam özellik sayısı | 103 | 195 | 250 |
| Kategori sayısı | 5 | 10 | 12 |
| MRR — Consumer | Baseline | 2.5× | 5× |
| MRR — Workshop B2B | 0 | Pilot | 30% MRR payı |
| Global market share (car-coding apps, tahmini) | ~2% | ~5% | ~10-12% |
| App Store rating hedefi | 4.4 | 4.6 | 4.7+ |
| NPS | Baseline | +20 | +45 |

---

## ✅ Bölüm 11 — Aksiyon Öğeleri Kısa Özet

**Kısa vadeli (30 gün):**
1. Volvo, Peugeot, Nissan, Honda, Mazda kapsamını genişletmek için `FeatureCatalog` şeması hazırla.
2. `VIN Pre-Check` API tasarımı (uyumluluk tablosu).
3. Rollback Snapshot + Warranty-Safe Mode UX prototipi.

**Orta vadeli (60-90 gün):**
1. ADAS Calibration modülü teknik fizibilite (partner OEM hedef görsel setleri).
2. AI Diagnostic Assist için Emergent LLM entegrasyonu proof-of-concept.
3. Hibrit fiyat modelini App Store & Google Play ile onaylat.

**Uzun vadeli (6-12 ay):**
1. Çin EV imalatçılarından pilot SDK / API partnerlikleri.
2. Workshop SaaS versiyonu launch (SFD Master ağı ile birlikte).
3. MotoCortex Beyond motosiklet & karavan pilot lansmanı.

---

## 📚 Ek — Kaynaklar & Doğrulama Linkleri

- Fortune Business Insights — Automotive Diagnostic Scan Tools Market (Q1 2026 report)
- Coherent Market Insights — ADAS Calibration Service Market 2026
- BusinessWire — Automotive Diagnostic Scan Tools 2025 Trends
- OBDeleven Official Plans & FAQ (obdeleven.com/features)
- Carly Blog — 2026 Pricing Guide (mycarly.com/blog)
- Appomotive — BimmerCode / BimmerLink Manual & Vehicle List
- Ross-Tech VCDS Product Page (ross-tech.com)
- Skanyx — OBDeleven / Carly comparison series
- Reddit r/Golf_R, r/BMW, r/lucidmotors community threads
- Trustpilot review datasets for OBDeleven & Carly (page 1-7 aggregated)
- Loki Pro Blog (loki-diag.com) — Tesla & Rivian diagnostics
- Wired — China's self-driving car platforms (XPeng, NIO, Li Auto)
- Global Trend Monitor — EV Trends 2026

---

**Rapor Sonu — MotoCortex Team © 2026**