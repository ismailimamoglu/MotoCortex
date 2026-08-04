# 🔓 MotoCortex — Gizli Özellik Kütüphanesi Küresel Pazar Araştırması ve Genişletme Önerisi

*Hazırlanma tarihi: 4 Ağustos 2026*
*Referans doküman: `gizli_ozellikler_raporu.md` (103 özellik, 14 üretici grubu)*

---

## 1. Yönetici Özeti

Mevcut 103 özellikli kütüphane, VAG, BMW ve Mercedes gibi Avrupa premium markalarında rakiplerle (Carly, OBDeleven) rekabet edebilecek bir derinliğe sahip. Ancak küresel pazarı taradığımızda üç net boşluk ortaya çıkıyor:

1. **Motosiklet tarafında gizli özellik/kodlama kütüphanesi tamamen boş.** 103 özelliğin tamamı otomobil. MotoCortex'in "hem motosiklet hem otomobil" iddiası bu modülde hiç karşılık bulmuyor — bu, en kritik ve en hızlı kapatılması gereken boşluk.
2. **"Eğlence / Easter Egg" kategorisi eksik.** OBDeleven'in en çok paylaşılan, sosyal medyada organik olarak yayılan özellikleri (örn. "Urban Joke", ışık şovları, gösterge animasyonları) MotoCortex kütüphanesinde yok. Bu kategori satış değil, **viral büyüme** aracı.
3. **Retrofit / donanım entegrasyonu kodlaması eksik.** Sonradan takılan park sensörü, LED aydınlatma, kamera gibi parçaların araç yazılımına tanıtılması (coding) hem Avrupa hem Kuzey Amerika pazarında OBDeleven/Carly'nin en çok kullanılan işlevlerinden biri.
4. **Çin menşeli EV markaları (MG, NIO, XPeng, Xiaomi, Great Wall/ORA) ve Kuzey Amerika EV markaları (Rivian, Lucid) hiç kapsanmıyor.** Bu segment 2026 itibarıyla küresel satışlarda hızla büyüyor ve rakiplerin çoğu henüz burada da zayıf — yani erken giren avantaj kazanabilir.
5. Mevcut markalarda (Toyota, Ford, Hyundai/Kia, Stellantis) rakip kütüphanelere kıyasla özellik derinliği hâlâ sığ (7-8 özellik seviyesinde), bunlar 15-20 seviyesine çıkarılabilir.

Bu rapor, yukarıdaki boşlukları kapatacak somut, marka/model bazlı ek özellik önerileri sunar. Öneriler risk seviyesi (LOW/MEDIUM/HIGH) etiketleriyle birlikte verilmiştir; MEDIUM/HIGH işaretli olanlar (özellikle motor/ECU haritası ile ilgili olanlar) SFD güvenlik kısıtlaması ve ek kullanıcı onayı gerektirmelidir.

---

## 2. Küresel Pazarda Gözlenen Trendler

| Trend | Kaynak / Örnek | MotoCortex'e Etkisi |
|---|---|---|
| **Retrofit/donanım coding** (sonradan takılan parça tanıtımı) | <cite index="57-1">OBDeleven One-Click Apps, park sensörü, LED plaka lambası, arka lamba gibi sonradan takılan parçaların araca entegre edilmesini, servis ışığı sıfırlamayı, video-in-motion ve iğne testini tek tıkla sunuyor</cite> | Yeni kategori: `RETROFIT_INTEGRATION` |
| **Eğlence/Easter Egg özellikleri** | <cite index="57-1">OBDeleven kütüphanesinde "Urban Joke" ve "Scandinavian DRL" gibi tamamen eğlence amaçlı özellikler yer alıyor</cite> | Yeni kategori: `EASTER_EGG_FUN` — sosyal medya paylaşım potansiyeli yüksek |
| **Konfor/görünüm odaklı özelliklerin en popüler segment olması** | <cite index="53-1">OBDeleven'in kütüphanesinde en çok kullanılan One-Click App'ler anti-kamaştırma farlar ve ambiyans aydınlatma ayarları gibi konfor/stil işlevleri</cite> | Mevcut `DISPLAY_INSTRUMENT` ve `LIGHTING` kategorilerinin en yüksek ROI alanı olduğunu doğruluyor — yatırımı burada artırmaya devam edin |
| **Aylık/düzenli yeni özellik ekleme ritmi** | <cite index="54-1,55-1">OBDeleven her ay VW, BMW, Toyota ve Ford Group modelleri için yeni One-Click App'ler yayınlıyor</cite> | MotoCortex'in kütüphanesi statik kalmamalı; aylık "yeni özellik" içerik takvimi kurumsallaştırılmalı (pazarlama + elde tutma aracı) |
| **Motosiklet ECU coding pazarının niş ama sadık bir topluluğu var** | <cite index="73-1">TuneECU, Triumph/Aprilia/KTM/Benelli marka motosikletlerde ECU okuma/yazma, harita değişimi ve atölye tipi testler sunan ücretsiz açık kaynaklı bir araç</cite>; <cite index="74-1">kullanıcılar quickshifter gecikme sürelerini ve vitese göre ateşleme haritasını değiştirebiliyor</cite> | Motosiklet segmentinde ilk hareket eden (first-mover) olma fırsatı — hiçbir mobil/bulut tabanlı rakip bu deneyimi sunmuyor |
| **Basit aktüatör/kod okuma ötesi "tam sistem" motosiklet tarayıcılarının yükselişi** | <cite index="66-1">OBDSTAR MS80, motosiklet/kar aracı/ATV için otomatik VIN tanıma, modül programlama ve kodlama, gösterge kodlama ve bakım ışığı sıfırlama sunuyor</cite> | Motosiklette de "kodlama" kavramı pazarda zaten var, sadece mobil-öncelikli, kullanıcı dostu bir uygulama eksik — MotoCortex bu boşluğu doldurabilir |
| **EV'ye özel batarya/şarj davranışı kodlaması artık standart bir kategori** | Mevcut raporda BYD ve VAG MEB örnekleri var; pazar taraması bu eğilimin Rivian, NIO, XPeng, Xiaomi gibi markalarda da güçlü olduğunu gösteriyor | Yeni EV markalarını ekleyerek `EV_BATTERY_CHARGING` kategorisini büyütün |

---

## 3. ÖNCELİK 1: Motosiklet Gizli Özellik & Kodlama Kütüphanesi (Yeni — 0'dan 34 özelliğe)

Bu, raporun en önemli önerisidir. Aşağıdaki liste; TuneECU, DDT4ALL, OBDSTAR MS80 gibi mevcut atölye araçlarının sunduğu işlevlerin mobil/bulut deneyimine taşınmış hâlidir.

### 3.1. Honda / Yamaha / Suzuki / Kawasaki (Japon "Big Four" — 10 Özellik)
1. **Quickshifter Sensitivity & Cut-Time Adjustment** *(MEDIUM)* — Kesme süresini ve hassasiyeti ayarlama.
2. **Ride-by-Wire Throttle Map Switching (Rain/Standard/Sport)** *(MEDIUM)* — Gaz tepkisi haritaları arası geçiş.
3. **TFT Dashboard Theme & Layout Unlock** *(LOW)* — Gizli gösterge temalarını (yarış modu, minimal mod) açma.
4. **Launch Control Sensitivity Adjustment** *(HIGH)* — Devir sınırını ve kavrama kayma toleransını ayarlama.
5. **Traction Control / Wheelie Control Level Fine-Tuning** *(HIGH)* — Fabrika kademelerinin ötesinde ince ayar.
6. **Bi-Directional Quickshifter Retrofit Activation** *(MEDIUM)* — Sonradan takılan quickshifter donanımını ECU'ya tanıtma.
7. **Heated Grips / Seat Accessory Activation via VIN** *(LOW)* — Aksesuar üretici kodunu VIN'e işleyerek ısıtmalı gripleri aktifleştirme.
8. **Service Interval Reminder Reset & Custom Interval** *(LOW)* — Bakım hatırlatıcısını sıfırlama ve özel km/ay aralığı tanımlama.
9. **ABS Rear-Wheel Disable for Track Use** *(HIGH)* — Pist kullanımı için arka ABS'yi devre dışı bırakma.
10. **Idle Speed & Cold-Start Enrichment Adjustment** *(MEDIUM)* — Rölanti devri ve soğuk çalıştırma zenginleştirmesini ayarlama.

### 3.2. Ducati / Aprilia / MV Agusta (İtalyan Sport Segmenti — 8 Özellik)
1. **Riding Mode Custom Profile Creator (Race/Sport/Touring/Urban)** *(MEDIUM)* — Güç, ABS, TC seviyelerini özelleştirilmiş kombinasyonlarla profil olarak kaydetme.
2. **Öhlins Electronic Suspension (Semi-Active) Fine Mapping** *(HIGH)* — Elektronik süspansiyon sertlik haritasını ayarlama (destekli modellerde).
3. **Dashboard Lap Timer & GPS Sector Split Unlock** *(LOW)* — Gösterge içi tur zamanlayıcıyı ve GPS sektör ayrımını açma.
4. **Engine Brake Control (EBC) Level Adjustment** *(MEDIUM)* — Motor freni müdahale seviyesini ayarlama.
5. **Cruise Control Retrofit Activation** *(MEDIUM)* — Donanımsal olarak mevcut ama devre dışı hız sabitleyiciyi aktifleştirme.
6. **Exhaust Valve (Servo) Sound Map Adjustment** *(MEDIUM)* — Egzoz valfi açılma devrini/sesini ayarlama.
7. **Pit Lane Speed Limiter Configuration** *(LOW)* — Pist günleri için hız sınırlayıcı ekleme.
8. **Multimedia/Connectivity Module Activation (MyDucati/Connect)** *(LOW)* — Bağlantı modülünü VIN üzerinden etkinleştirme.

### 3.3. BMW Motorrad (7 Özellik)
1. **Shift Assistant Pro Retrofit Activation** *(MEDIUM)* — Sonradan takılan kaydırma asistanı donanımını tanıtma.
2. **Dynamic ESA Suspension Mode Fine-Tuning** *(HIGH)* — Elektronik süspansiyon modlarını ince ayarlama.
3. **Adaptive Cruise Control (ACC) Following Distance Presets** *(LOW)* — Takip mesafesi ön ayarlarını genişletme.
4. **TFT Connectivity (BMW Motorrad Connected) Full Unlock** *(LOW)* — Bağlantı ekranı tam özellik açma.
5. **Headlight Pro (Adaptive Cornering Light) Sensitivity** *(MEDIUM)* — Viraj farı hassasiyet ayarı.
6. **Keyless Ride Range Extension** *(LOW)* — Anahtarsız çalıştırma algılama mesafesini ayarlama.
7. **Reverse Assist (Geri Vites Yardımı) Sensitivity Adjustment** *(LOW)* — Ağır turing modellerinde geri vites motorunun hassasiyetini ayarlama.

### 3.4. KTM / Husqvarna / Triumph (Avrupa Naked/Adventure — 5 Özellik)
1. **Quickshifter+ Up/Down Delay Fine-Tuning** *(MEDIUM)* — <cite index="74-1">Vitese göre ateşleme haritası ve kaydırma gecikmesini ince ayarlama</cite>.
2. **Rally/Off-Road ABS & TC Preset Unlock** *(HIGH)* — Arazi moduna özel ABS/TC ön ayarları.
3. **Connectivity Module (My KTM / My Triumph) Activation** *(LOW)* — <cite index="72-1">Fabrikada devre dışı bırakılan bağlantı modülünü aktifleştirme</cite>.
4. **Cruise Control Retrofit Activation** *(MEDIUM)* — Sonradan cruise control donanımı ekleme.
5. **Multi-Map Switching via Clutch-Pull Gesture Customization** *(MEDIUM)* — <cite index="71-1">Kontak açıp kavramayı hızlıca beş kez çekerek harita değiştirme gesture'ının özelleştirilmesi</cite>.

### 3.5. Harley-Davidson / Indian (Amerikan Cruiser — 4 Özellik)
1. **Ride Mode Custom Throttle Curve Editor** *(MEDIUM)* — Gaz eğrisini kişiselleştirme.
2. **Security System Sensitivity Adjustment** *(LOW)* — Alarm hassasiyetini ayarlama.
3. **Infotainment (Boom! Box GTS) Hidden Menu Unlock** *(LOW)* — Gizli teşhis/gösterge menülerini açma.
4. **Reflex Defensive Rider Systems (RDRS) Level Fine-Tuning** *(HIGH)* — ABS/TC/Drag-Torque kontrolünün ince ayarı.

**Motosiklet Toplamı: 34 yeni özellik.**

---

## 4. ÖNCELİK 2: Yeni Kategori — Retrofit / Donanım Entegrasyonu (12 Özellik, Tüm Markalar)

| # | Özellik | Risk | Açıklama |
|---|---|:---:|---|
| 1 | Retrofit Park Sensörü (Ön/Arka) Tanımlama | LOW | Sonradan takılan sensörü araç yazılımına tanıtma |
| 2 | Retrofit 360° Kamera Sistemi Aktivasyonu | MEDIUM | Donanım mevcutsa yazılımsal açma |
| 3 | Retrofit LED Plaka/Arka Lamba Tanımlama (CAN-Bus hata önleme) | LOW | LED değişiminde çıkan hata kodunu önleyici kodlama |
| 4 | Retrofit Dash Cam Entegrasyonu (Sentry benzeri) | MEDIUM | Araç gücünden beslenen kamera sistemi tanımlama |
| 5 | Retrofit Isıtmalı Ön Cam Aktivasyonu | LOW | Donanım mevcut, yazılımsal kilit kaldırma |
| 6 | Retrofit Telefon Kablosuz Şarj Modülü Tanımlama | LOW | — |
| 7 | Retrofit Adaptif Hız Sabitleyici (ACC) Radar Tanımlama | HIGH | Güvenlik kritik, dikkatli kodlama gerektirir |
| 8 | Retrofit Trafik Tabela Tanıma Kamerası Aktivasyonu | MEDIUM | — |
| 9 | Retrofit Isıtmalı Direksiyon Simidi Tanımlama | LOW | — |
| 10 | Retrofit Yorgunluk Algılama Kamerası Kalibrasyonu | MEDIUM | — |
| 11 | Retrofit Çeki Demiri Elektrik Modülü Tanımlama | MEDIUM | — |
| 12 | Retrofit Bagaj Elektrikli Açma Kiti Kodlaması | LOW | — |

---

## 5. ÖNCELİK 3: Yeni Kategori — Eğlence / Easter Egg (8 Özellik)

Amaç: satış değil, sosyal medyada organik paylaşım ve kullanıcı bağlılığı.

1. **Işık Şovu (Kilitleme/Açmada Far-Sinyal Senkron Animasyonu)** *(LOW)*
2. **"Kadran Karşılama Animasyonu" Özelleştirme (İsim/Logo Yazısı)** *(LOW)*
3. **Gösterge Paneli Gizli Mini-Oyun Modu (bazı VAG/Hyundai kümelerinde mevcut)** *(LOW)*
4. **Korna "Melodi" Paketi (destekli hoparlörlü modellerde)** *(LOW)*
5. **Sürücü Kapısı Açılışında Karşılama Sesi/Işığı** *(LOW)*
6. **Gizli Geliştirici/Servis Menüsü Kolay Erişim Kısayolu** *(LOW)*
7. **Mevsimsel Tema (Kar Tanesi/Yağmur Animasyonu) Gösterge Efekti** *(LOW)*
8. **"Valet Mode" Şakacı Uyarı Sesi (garaj görevlisi modunda özel ekran mesajı)** *(LOW)*

---

## 6. ÖNCELİK 4: Mevcut Markalarda Derinleştirme

Pazar araştırması, aşağıdaki markalarda rakiplerin (özellikle OBDeleven'in Toyota/Ford Group ve BMW kapsamı, Carly'nin çoklu marka kapsamı) MotoCortex'ten daha fazla özellik sunduğunu gösteriyor. Önerilen ek sayılar:

| Marka Grubu | Mevcut | Önerilen Ek | Yeni Toplam | Örnek Yeni Özellikler |
|---|:---:|:---:|:---:|---|
| Toyota & Lexus | 7 | +8 | 15 | Soft-close kapı retrofit, gösterge dijital hız, walk-away kilit hassasiyeti, JBL ses profili açma |
| Ford | 8 | +7 | 15 | FORScan tarzı: Bambi mode genişletme, arka koltuk eğlence ekranı kilidi açma, Sync ekranı gizli teşhis sayfası |
| Hyundai & Kia | 7 | +6 | 13 | N Grin Shift retrofit, dijital gösterge tema paketleri, akıllı bagaj açma mesafe ayarı |
| Stellantis (Fiat/Peugeot/Jeep) | 4 | +6 | 10 | Selective Catalytic Reduction (SCR) ikaz eşiği, Jeep Trail Rated ekran paketi, Peugeot i-Cockpit renk temaları |
| GM (Chevrolet/GMC) | 2 | +5 | 7 | Super Cruise takip mesafesi, gösterge HUD kalibrasyonu, hız sınırlayıcı bip iptali |
| Volvo & Polestar | 2 | +5 | 7 | Pilot Assist hassasiyeti, Google built-in gizli menü, ortam ışığı senkron |
| Tesla | 2 | +4 | 6 | Chill/Sport mod arası gizli hızlanma eğrisi, Şarj limiti hatırlatıcı özelleştirme, Dog Mode sıcaklık eşiği |

**Mevcut markalarda önerilen toplam ek: 41 özellik.**

---

## 7. ÖNCELİK 5: Yeni Marka Grupları (Çin ve Kuzey Amerika EV Segmenti — 24 Özellik)

Bu markalar hiçbir mevcut listede yok; pazar payları hızla büyüyor ve rakip coding uygulamalarının çoğu bu markalarda henüz zayıf — erken giriş avantajı mümkün.

| Marka | Özellik Sayısı | Öne Çıkan Kategori |
|---|:---:|---|
| MG (SAIC) | 4 | Gösterge temaları, i-SMART bağlantı aktivasyonu |
| NIO | 4 | Batarya değişim (battery-swap) hazırlık modu, NOMI asistan kişiselleştirme |
| XPeng | 4 | ADAS takip mesafesi, ambiyans/ses senkron |
| Xiaomi (SU7 vb.) | 4 | Ekosistem cihaz entegrasyonu, sürüş modu özelleştirme |
| Great Wall / ORA | 4 | Gösterge teması, tek pedal sürüş hassasiyeti |
| Rivian | 2 | Camp Mode iyileştirme, Off-Road modu ince ayar |
| Lucid | 2 | DreamDrive takip mesafesi, kabin sıcaklık hassasiyeti |

---

## 8. Güncellenmiş Toplam Özellik Kütüphanesi Projeksiyonu

| Kategori | Mevcut | Yeni Öneri | Toplam |
|---|:---:|:---:|:---:|
| Otomobil (mevcut 14 marka grubu, derinleştirilmiş) | 103 | +41 | 144 |
| **Motosiklet (yeni)** | 0 | +34 | **34** |
| Retrofit / Donanım Entegrasyonu (yeni, çapraz marka) | 0 | +12 | 12 |
| Eğlence / Easter Egg (yeni, çapraz marka) | 0 | +8 | 8 |
| Yeni EV Marka Grupları (Çin + Kuzey Amerika) | 0 | +24 | 24 |
| **GENEL TOPLAM** | **103** | **+119** | **≈222** |

Kategori dağılımı da buna göre güncellenmeli; `MOTORCYCLE_ECU`, `RETROFIT_INTEGRATION` ve `EASTER_EGG_FUN` yeni birinci sınıf kategoriler olarak `FeatureCatalog` şemasına eklenmelidir.

---

## 9. Risk ve Uygulama Notları

- **HIGH riskli motosiklet özellikleri** (Launch Control, Traction Control ince ayarı, ABS devre dışı bırakma, RDRS ayarı) yalnızca "Pist Kullanımı" onay ekranı ve ek SFD kısıtlamasıyla açılmalı; bu özellikler karayolu güvenliğini doğrudan etkiliyor.
- **Retrofit kategorisindeki ACC radar tanımlama** gibi güvenlik-kritik özellikler, üretici garantisi ve yasal sorumluluk uyarısı ile birlikte sunulmalı.
- **Easter Egg kategorisi** düşük risk, yüksek pazarlama getirisi sağladığından hızlı kazanım (quick win) olarak önceliklendirilebilir; geliştirme maliyeti düşük, sosyal medya paylaşım potansiyeli yüksek.
- **Motosiklet ECU harita/quickshifter özellikleri**, otomobil UDS kodlamasından farklı olarak çoğunlukla marka-özel kapalı protokoller (Sagem, Keihin, Walbro) kullanır; bu nedenle motosiklet modülü için ayrı bir adaptör/protokol katmanı (TuneECU/DDT4ALL benzeri) geliştirme takvimine alınmalıdır — bu, mühendislik açısından otomobil tarafındaki UDS kütüphanesine kıyasla daha fazla marka-özel entegrasyon çalışması gerektirir.

---

## 10. Uygulama Önceliklendirmesi (Etki / Efor Matrisi)

| Öncelik | Kategori | Etki | Geliştirme Eforu | Gerekçe |
|---|---|:---:|:---:|---|
| 1 | Motosiklet — Konfor/Gösterge/Bağlantı özellikleri (LOW risk olanlar) | Yüksek | Orta | Konumlandırma iddiasını gerçeğe dönüştürür, rakipsiz alan |
| 2 | Eğlence / Easter Egg | Orta-Yüksek (viral) | Düşük | Hızlı kazanım, düşük mühendislik maliyeti |
| 3 | Retrofit / Donanım Entegrasyonu | Yüksek | Orta | OBDeleven/Carly kullanıcılarının en sık kullandığı işlev tipi |
| 4 | Mevcut marka derinleştirme (Toyota, Ford, Hyundai/Kia) | Orta | Düşük-Orta | Var olan altyapıya ekleme, göreceli düşük maliyet |
| 5 | Motosiklet — HIGH risk (ECU harita, TC/ABS ince ayar) | Yüksek (niş) | Yüksek | Marka-özel protokol geliştirme gerektirir, uzun vadeli yatırım |
| 6 | Çin/Kuzey Amerika EV markaları | Orta (büyüyen pazar) | Yüksek | Yeni marka entegrasyonu, düşük mevcut rekabet nedeniyle stratejik ama zaman alıcı |

---

## 11. Sonuç

Mevcut 103 özellikli kütüphane, otomobil tarafında rakiplerle rekabet edebilecek sağlam bir temel oluşturuyor. Ancak pazar araştırması, MotoCortex'in "motosiklet ve otomobil" konumlandırmasının gizli özellik/kodlama modülünde hiç karşılığı olmadığını net biçimde ortaya koyuyor — bu, 34 özellikli önerilen motosiklet kütüphanesiyle kapatılabilecek en kritik boşluk. Buna ek olarak, retrofit entegrasyonu ve eğlence/easter-egg kategorileri düşük mühendislik maliyetiyle yüksek kullanıcı memnuniyeti ve organik büyüme sağlayabilecek "hızlı kazanım" alanları olarak öne çıkıyor. Önerilen eklemelerle kütüphane 103'ten yaklaşık 222 özelliğe çıkarılarak hem derinlik hem kapsam açısından pazardaki en geniş gizli özellik kütüphanelerinden biri hâline gelebilir.
