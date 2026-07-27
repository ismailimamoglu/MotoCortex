# MotoCortex — Global Seviyeye Çıkış İçin Teknik Değerlendirme Raporu

**Tarih:** 27 Temmuz 2026
**Kapsam:** Bağlantı kurulumu, protokol tespiti, telemetri, DTC ve UDS gizli özellik açma (ECU kodlama) akışlarının global ölçeklenebilirlik, güvenlik ve uyumluluk açısından incelenmesi

---

## 1. Güçlü Yönler

### 1.1 Donanım Katmanı
- **AT komut sıralaması olgun.** `AT Z → ATE0 → ATI → AT RV → AT DP/DPN` sırası, klon adaptör tespiti ve echo kapatma ile yanıt hızını optimize etme açısından endüstri pratiğine uygun.
- **Otomatik protokol kurtarma zinciri (AT PC → AT WS → AT ST FF → TP6/TP7/TP5/TP3)** iyi tasarlanmış bir fallback mekanizması. Eski ve yeni araç parkını aynı akışta kapsıyor.
- **Zamanlama optimizasyonu** (CAN için `AT ST 32`, legacy için `AT AT0` + `AT ST 96`) protokole özgü ayrım yapılmış olması olgun bir mühendislik kararı.

### 1.2 Telemetri Katmanı
- Mode 01 PID seti (RPM, hız, coolant, throttle, MAF, IAT, yağ sıcaklığı, yakıt seviyesi) kapsamlı ve 10-20Hz hedefi gerçekçi.
- PID Support Registry (`01 00/20/40`) ile desteklenmeyen PID'lerin sorgulanmaması, gereksiz zaman aşımlarını önlüyor — iyi pratik.

### 1.3 UDS Akışı
- **Seed/Key + Extended Session + backup-then-write sırası** (10 03 → 27 01/02 → 22 [oku/yedekle] → 2E [yaz] → 11 01 → 3E 00 tester present) doğru ve standart ISO 14229 akışına birebir uyuyor.
- Yazmadan önce mevcut değeri okuyup yedekleme adımının (`22 [DID]`) akışta yer alması, önceki konuşmamızda önerdiğim "backup-before-write" ilkesinin zaten uygulanmış olduğunu gösteriyor — bu önemli bir olgunluk işareti.

---

## 2. Kritik Eksikler ve Riskler

### 2.1 Araç/Protokol Kapsamı — Global Ölçek İçin Yetersiz

| Mevcut Durum | Eksik |
|---|---|
| Sadece klasik CAN (11-bit/29-bit, 500 kbaud) ve legacy KWP/ISO9141 | **CAN-FD** desteği yok — 2019 sonrası VAG (MQB Evo), BMW G-serisi ve birçok yeni model CAN-FD kullanıyor; klasik ELM327 AT komutlarıyla tam desteklenmez |
| Yalnızca ELM327 tabanlı AT komut seti | **DoIP (Diagnostics over IP)** desteği yok — BMW G/F serisi, VAG MEB platformu (ID serisi) ve birçok 2021+ model artık Ethernet tabanlı teşhis gerektiriyor; sadece CAN header (`AT SH`) ile bu araçlara erişilemez |
| VAG (709/772/7C0), BMW (760), Ford (726) header'ları var | GM, Stellantis/PSA, Toyota/Lexus, Hyundai/Kia, Renault-Nissan (KWP2000 dışında UDS varyantları) header haritaları eksik — global lansman için en az bu 5 üretici grubunun eklenmesi gerekir |

**Öneri:** Global çıkış öncesi bir "Bölgesel Araç Kapsam Matrisi" oluşturulmalı (Avrupa: VAG/BMW/Mercedes/PSA/Renault, Kuzey Amerika: GM/Ford/Chrysler, Asya: Toyota/Honda/Hyundai). Her pazarın ana marka payına göre önceliklendirme yapılmalı.

### 2.2 Adaptör Bağımlılığı — ELM327 Klonları UDS İçin Güvenilmez

UDS güvenlik erişimi (Seed/Key) ve çok çerçeveli (multi-frame ISO-TP) yazma işlemleri, ucuz ELM327 klonlarında zamanlama toleransı ve buffer sınırlamaları nedeniyle sık sık başarısız olur veya yarım kalır.

**Risk:** Global kullanıcı tabanı büyüdükçe destek talepleri artacak, farklı adaptör çipseti (STN11xx, ELM327 v1.5/2.1 klonları, gerçek OBDLink) kombinasyonlarında tutarsız coding sonuçları (yarım yazma → modül arızası şikayeti) ortaya çıkacaktır.

**Öneri:**
- Bilinen sağlam çipsetler (STN2120, OBDLink MX+) için "sertifikalı adaptör" listesi yayınlanmalı, kodlama işlemleri düşük güvenilirlikli klonlarda **devre dışı bırakılmalı veya uyarı ile sınırlandırılmalı**.
- İleri düzey kullanıcılar için **J2534 Pass-Thru** desteği yol haritasına eklenmeli — bu, profesyonel seviye coding için endüstri standardıdır ve OEM güvenlik gereksinimlerine daha yakındır.

### 2.3 Güvenlik Erişim Algoritması (Seed/Key) — En Kritik IP ve Hukuki Risk

Rapor, `27 01` ile Seed alınıp `27 02 [KEY_HEX]` ile yanıtlandığını belirtiyor ama **Key hesaplama algoritmasının nerede saklandığı belirtilmemiş.**

Bu, global ölçekte üç ayrı risk doğurur:

1. **Ters mühendislik/IP riski:** Seed-Key algoritmaları üreticilerin (VAG, BMW) kapalı kaynak, tescilli güvenlik mekanizmalarıdır. Bu algoritma mobil uygulama paketine (APK/IPA) gömülürse, decompile edilerek çıkarılabilir — bu hem üretici fikri mülkiyetine tecavüz iddialarına hem de uygulamanın app store'lardan kaldırılma riskine yol açar.
2. **Ölçeklenebilirlik:** Algoritma cihaz üzerinde ise, üretici algoritmayı değiştirdiğinde (yeni model yılı, yazılım güncellemesi) **tüm kullanıcı tabanına anlık uygulama güncellemesi göndermeniz gerekir** — global ölçekte bu operasyonel olarak sürdürülemez.
3. **Hukuki maruziyet:** Bazı pazarlarda (özellikle AB — Motor Vehicle Block Exemption Regulation kapsamında bağımsız servis sağlayıcıların teşhis verisine erişimi düzenleniyor, ama coding/security-bypass bu kapsamın dışında kalabilir) OEM güvenlik mekanizmalarını atlatmak ayrı bir hukuki kategori.

**Öneri:** Seed-Key hesaplama mantığı **sunucu tarafında (backend)** tutulmalı, kullanıcı cihazı sadece seed'i sunucuya iletip key'i geri almalı. Bu hem IP korumasını hem de algoritma güncellemelerinin anlık, uygulama güncellemesi gerektirmeden yapılmasını sağlar.

### 2.4 Oturum Yönetimi Eksik Ayrıntı

`10 03` (Extended Diagnostic Session) genel teşhis için yeterli olabilir, ama birçok modülde **gerçek yazma (WriteDataByIdentifier) işlemi Programming Session (`10 02`) gerektirir**, özellikle flash/EEPROM tabanlı DID'lerde. Rapor sadece Extended Session'ı belirtiyor — bu, bazı ECU'larda `NRC 0x22 (conditionsNotCorrect)` veya `NRC 0x7F` negatif yanıtlarına yol açabilir.

**Öneri:** ECU/DID bazında hangi session tipinin gerektiğini haritalayan bir referans tablo oluşturulmalı; tek bir sabit session akışı yerine ECU tipine göre dinamik session seçimi yapılmalı.

### 2.5 Negatif Yanıt Kodu (NRC) Yönetimi Belirtilmemiş

UDS akışında en kritik ama raporda hiç bahsedilmeyen konu: **ECU'nun "hayır" dediği durumlar.**

Yaygın NRC'ler:
- `0x35` — Invalid Key (yanlış key hesaplama)
- `0x36` — Exceed Number of Attempts (çok fazla yanlış deneme → modül kilitlenmesi, bazı ECU'larda 10 dakika-24 saat bekleme cezası)
- `0x37` — Required Time Delay Not Expired
- `0x33` — Security Access Denied
- `0x22` — Conditions Not Correct (örn. voltaj/hız kilidi burada devreye girmeli)
- `0x7F` — Service Not Supported in Active Session

**Risk:** `0x36` özellikle önemli — global kullanıcı tabanında biri yanlış key algoritmasıyla art arda deneme yaparsa, modül kendini geçici olarak kilitler ve kullanıcı "uygulama bozuk" şikayeti oluşturur, gerçek sebep ECU'nun kendi koruma mekanizması olur.

**Öneri:** Her NRC için kullanıcıya anlaşılır, yanıltmayan bir mesaj eşlemesi yapılmalı (örn. 0x36 için "Modül geçici olarak kilitlendi, X dakika bekleyin" gibi net geri bildirim), sessiz hata yerine.

### 2.6 Yazma Sırasında Sürekli İzleme Yok

Önceki konuşmamızda belirttiğim gibi, voltaj/hız kilidi sadece **yazma öncesi** kontrol ediyor gibi görünüyor. Raporda yazma sırasında (2E komutu gönderildikten ECU pozitif yanıt verene kadar geçen sürede) sürekli voltaj/CAN-bus sağlık izlemesi belirtilmemiş.

**Öneri:** `2E` komutu gönderildikten sonra ECU'dan pozitif yanıt (`6E`) gelene kadar geçen pencerede voltaj örneklemesi devam etmeli; düşüş tespit edilirse mümkünse abort, mümkün değilse en azından kullanıcıya "işlem tamamlanana kadar kontağı kapatmayın" net uyarısı verilmeli.

### 2.7 Bölgesel Yasal Uyumluluk Farklılıkları Ele Alınmamış

Global çıkışta en çok gözden kaçan konu budur:

- **AB:** Type Approval (Tip Onayı) regülasyonları — emisyon ile ilgili parametrelerin (Mode 04/0A ile ilişkili) değiştirilmesi bazı ülkelerde araç muayenesinde sorun yaratabilir.
- **Almanya:** StVZO kapsamında araç üzerinde yapılan bazı modifikasyonlar (özellikle gösterge/kadran davranışı) TÜV onayını etkileyebilir.
- **ABD:** EPA/CARB düzenlemeleri, emisyon kontrol sistemleriyle ilgili "defeat device" tanımına giren değişiklikler konusunda çok katı — "Kadran Selamlama" gibi kozmetik özellikler sorun değil, ama emisyonla ilişkili DID'lere dokunan her şey ayrı hukuki inceleme gerektirir.
- **Genel:** Kullanıcı sözleşmesinde net bir sorumluluk reddi (disclaimer) ve "bu özellik garantinizi etkileyebilir" uyarısı olmalı — bu şu an raporda yok.

**Öneri:** Pazar bazlı özellik bayrağı (feature flag) sistemi kurulmalı — örneğin emisyonla ilişkili olmayan kozmetik kodlamalar (Kadran Selamlama, Spor Gösterge) her yerde açık, ama garanti/yasal riski yüksek özellikler bölgeye göre kısıtlanabilir olmalı.

### 2.8 VIN Tabanlı Varyant Doğrulaması Yok

Aynı DID adresi, aynı modelin farklı model yılı veya bölgesel varyantında (ör. ABD spec vs AB spec Golf) farklı bit yapısına sahip olabilir. Raporda VIN okuma/decode adımı üzerinden DID haritasının doğrulandığına dair bir adım görünmüyor.

**Öneri:** Kodlama öncesi VIN okunup (Mode 09 PID 02 veya UDS `22 F190`) araç varyantı doğrulanmalı, DID haritası VIN'e göre seçilmeli — global ölçekte yanlış varyanta yanlış DID yazılması en yaygın "modül bricking" (modülü işlemez hale getirme) sebebidir.

---

## 3. Öncelik Sıralı Yol Haritası

| Öncelik | Konu | Gerekçe |
|---|---|---|
| 🔴 Kritik | Seed-Key algoritmasını sunucu tarafına taşı | IP koruması + hukuki risk + ölçeklenebilirlik |
| 🔴 Kritik | NRC (negatif yanıt) haritalama ve kullanıcı geri bildirimi | 0x36 gibi kodlar olmadan global destek yükü patlar |
| 🔴 Kritik | Airbag/ABS'ye yazma erişiminin kod seviyesinde kilitli olduğunu doğrula | Önceki değerlendirmemizde belirtilen güvenlik açığı |
| 🟠 Yüksek | VIN tabanlı varyant doğrulama | Yanlış DID yazımı = modül bricking riski |
| 🟠 Yüksek | Yazma sırasında sürekli voltaj izleme | Kesinti anında yarım yazma riski |
| 🟠 Yüksek | Programming Session (10 02) desteği | Bazı ECU'lar Extended Session ile yazmayı reddeder |
| 🟡 Orta | CAN-FD ve DoIP desteği | 2020+ model kapsamı için gerekli, ama kademeli eklenebilir |
| 🟡 Orta | J2534 pass-thru desteği | Profesyonel kullanıcı segmenti için |
| 🟡 Orta | Bölgesel yasal feature-flag sistemi | Pazar bazlı hukuki risk yönetimi |
| 🟢 Düşük | Genişletilmiş üretici header haritası (GM, PSA, Toyota, Hyundai) | Pazar genişlemesiyle paralel eklenebilir |

---

## 4. Özet

Mevcut mimari **teknik olarak sağlam bir temel** üzerine kurulu — AT komut sırası, protokol kurtarma zinciri ve UDS akışının genel yapısı (seed/key, backup, write, reset, tester present) doğru ve standarda uygun. Ancak "global seviye" hedefi için asıl fark yaratacak konular **kod satırlarında değil, mimari kararlarda**: Seed-Key algoritmasının cihazda mı sunucuda mı tutulduğu, NRC hata yönetiminin olup olmadığı, CAN-FD/DoIP gibi yeni nesil araç desteği ve bölgesel hukuki uyumluluk.

Kısacası: **Uygulama şu an "çalışan bir prototip" seviyesinde olgun, ama "global ölçekte güvenilir ve hukuken savunulabilir ürün" seviyesine geçmek için yukarıdaki kritik ve yüksek öncelikli maddelerin ele alınması gerekiyor.**
