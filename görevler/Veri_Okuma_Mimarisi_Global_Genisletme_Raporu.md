# MotoCortex Veri Okuma Mimarisi — Detaylı İnceleme ve Global Genişletme Önerileri

**İncelenen belge:** `veriokuma.md`

---

## 1. Önce Bir Düzeltme: Önceki Raporumdaki ECU Header Şüphesi Çözüldü

Önceki arayüz incelemesinde, Multi-ECU ekranında gördüğüm ABS (`0x7D0`) ve Airbag (`0x770`) adreslerinin, konuşmamızın en başındaki (`0x7E2`/`0x7E3`) ifadelerle çeliştiğini işaret etmiştim. Bu belge durumu netleştiriyor: **uygulamanın gerçek, dokümante edilmiş mimarisinde ABS/ESC `7D0/7D8`, SRS/Airbag `770/778` olarak tanımlı** — yani arayüzde gördüğüm değerler doğru ve tutarlıymış, en baştaki mesajdaki `0x7E2/0x7E3` sadece genel/örnek bir ifadeydi. Bu konuda artık bir itirazım yok, güvenlik hard-block'unun doğru adresi (`7D0`, `770`) hedeflediğini teyit edin yeterli.

---

## 2. Mevcut Veri Okuma Mimarisinin Değerlendirmesi

### 2.1 Kapsam — Güçlü Bir Temel
Mode 01 (canlı veri), Mode 03/07/0A (DTC), Mode 02 (Freeze Frame), Mode 09 (araç kimliği) ve özel UDS servisleri (`0x22`, `0x19`, `0x31`, `0x10`) üzerinden **oldukça geniş bir PID/parametre seti** okunuyor — motor/performans, sıcaklık, basınç/hava akışı, yakıt/emisyon, O2/Lambda sensörleri, sistem gerilimi ve hibrit metrikleri kapsıyor. Bu, standart bir OBD-II uygulamasının kapsayabileceği parametrelerin büyük kısmını içeriyor ve Mode 01'in nadiren okunan bazı köşe parametrelerini de (Etanol oranı, EVAP buhar basıncı, geniş bant Lambda akımı) içermesi olumlu.

### 2.2 Multi-ECU Topolojisi — Doğru Kurulmuş
ECM/TCM/ABS/SRS/BCM/HCU/BMS ayrımı ve her biri için ayrı Tx/Rx header'ların tanımlanmış olması, çok modüllü bir mimari için doğru bir temel. 29-bit (ISO 15765-4 extended) adresleme desteğinin ECM/TCM için ayrıca belirtilmiş olması (`18DAF110`, `18DAF118`) iyi bir detay — bu, hem 11-bit hem 29-bit CAN kullanan araç parkının (Avrupa/Kore 11-bit ağırlıklı, bazı Amerikan/Asya modelleri 29-bit) kapsanmasını sağlıyor.

---

## 3. Global Genişletme İçin Tespit Edilen Boşluklar ve Öneriler

### 3.1 Dizel/Avrupa Pazarı İçin Eksik Parametreler — Yüksek Öncelik

Global çıkışta Avrupa, önemli bir dizel araç payına sahip pazar. Şu an listede **dizel-özel emisyon parametreleri eksik:**

| Eksik Parametre | PID/Kaynak | Neden Önemli |
|---|---|---|
| **AdBlue / Dizel Egzoz Sıvısı Seviyesi** | Mode 01 PID `9B` | Euro 6 dizel araçlarda yaygın; seviye düşükse araç çalışmayı reddedebilir — kullanıcılar için çok değerli bir uyarı parametresi, şu an kataloğunuzda yok. |
| **Egzoz Gazı Sıcaklığı (EGT) Bank1/2 Sensör1/2** | Mode 01 PID `78-7B` | DPF rejenerasyonu ve turbo/egzoz sağlığı teşhisinde kritik — DPF Filtre özelliğiniz zaten var, bu parametreler onu tamamlar. |
| **NOx Sensörleri (Bank 1/2)** | Mode 01 PID `83, 84` | Euro 6/6d-TEMP dizel araçlarda SCR sistem sağlığını gösterir — Avrupa'da "araç muayenesi öncesi kontrol" senaryosunda çok aranan bir veri. |

**Öneri:** Bu üç parametre grubu, mevcut "Ekspertiz & Arıza Teşhisi" özelliğinize doğrudan değer katar ve özellikle Avrupa pazarında rakip uygulamalardan (çoğu bu kadar derin dizel/SCR verisi sunmuz) ayrışmanızı sağlar.

### 3.2 Beygir/HP Ekranındaki Mevcut Hatayla Doğrudan İlgili Bir Eksik

Önceki arayüz incelememde "Beygir/HP" ekranında **"Canlı Tork PID Tabanlı"** adında ikinci bir hesaplama seçeneği görmüştüm. Ancak bu belgedeki PID listesinde **gerçek motor torku PID'i (`01 62` — Actual Engine Percent Torque) veya sürücü talep torku (`01 61` — Driver's Demand Engine Percent Torque) tanımlı değil.**

**Bu önemli bir bağlantı:** Eğer "Canlı Tork PID Tabanlı" seçeneği arayüzde sunuluyorsa ama alt yapıda bu PID'ler okunmuyorsa, o buton ya çalışmıyor ya da yanlış/varsayılan bir değere düşüyor. **Öneri:** `01 61/62/63` (Driver Demand / Actual / Reference Torque) PID'lerini `PidRegistry.ts`'e ekleyin — hem HP ekranındaki ikinci hesaplama yöntemini gerçek işlevsel hale getirir hem de önceki raporumda işaret ettiğim "6 HP" gibi gerçekçi olmayan sonuçlara karşı MAF-tabanlı hesaplamayla çapraz doğrulama imkânı sağlar.

### 3.3 İkinci El Araç Ekspertiz Pazarı İçin Kullanılmayan Güçlü Bir Kaynak: Mode 06

Belgede **Mode 06 (On-Board Monitoring Test Results)** hiç geçmiyor. Bu mod, profesyonel teşhis cihazlarının kullandığı ama çoğu tüketici OBD2 uygulamasının atladığı bir veri kaynağı — **her bir emisyon izleme testinin (katalizör verimliliği, O2 sensör tepki süresi, EVAP sızıntı testi vb.) sayısal test değerini ve eşik değerini** verir; sadece "geçti/kaldı" değil, **ne kadar** geçtiğini veya kaldığını gösterir.

**Neden global genişleme için değerli:** "Ekspertiz & Garanti" özelliğiniz zaten var — Mode 06 verisi eklenirse, ikinci el araç alıcıları için "bu katalizör sınırın ne kadar yakınında, yakında arıza verebilir mi" gibi **öngörücü** bir değerlendirme sunabilirsiniz. Bu, dünya genelinde ikinci el araç pazarının büyük olduğu ülkelerde (Türkiye, Almanya, Japonya) güçlü bir farklılaştırıcı olur.

### 3.4 Kalibrasyon Doğrulama Numarası (CVN) — "Chip Tuning Tespiti" Fırsatı

Mode 09 içinde `09 06`/`09 07` (**Calibration Verification Numbers**) belgede yok. CVN, ECU yazılımının fabrika imzasıyla eşleşip eşleşmediğini gösteren bir kontrol değeridir.

**Öneri:** Bu veriyi ekleyip, ECU kalibrasyon kimliği (`09 04`) ile birlikte kullanarak **"bu araç fabrika yazılımından farklı mı (chip tuning/remap yapılmış mı)"** şeklinde bir gösterge sunabilirsiniz. Bu, "Ekspertiz & Garanti" bölümünüz için — özellikle ikinci el araç alımında chip tuning gizleme sorununun yaygın olduğu pazarlarda (Türkiye, Doğu Avrupa) — çok değerli bir ek özellik olur.

### 3.5 In-Use Performance Tracking (`09 08`) — Bölgesel Muayene Uyumluluğu

Bazı ülkelerde (özellikle ABD eyaletleri ve bazı AB ülkeleri) araç muayenesi, "monitor'lerin kaç kez tamamlandığı/tamamlanmadığı" bilgisine bakar (I/M Readiness ile ilişkili ama daha detaylı sayaç verisi). Bu veri şu an listede yok. **Öneri:** Muayene/emisyon testi öncesi kontrol senaryosu sunan bir "Muayeneye Hazır mıyım?" özelliği için bu veri eklenebilir — global pazarlarda muayene sistemi olan her ülke için işlevsel bir özellik.

### 3.6 VIN Otomatik Çözümleme (WMI Decode) — Kullanıcı Sürtünmesini Azaltır

Şu an VIN okunuyor (`09 02`) ama VIN'in ilk 3 hanesinden (WMI — World Manufacturer Identifier) marka/üretici/menşe ülke bilgisinin otomatik çözümlenip çözümlenmediği belirtilmemiş.

**Öneri:** Global kullanıcı tabanı büyüdükçe, kullanıcının aracının markasını/modelini elle seçmesi yerine **VIN okunur okunmaz otomatik marka/model/üretim yılı tahmini** yapılması, özellikle farklı dillerde/alfabelerde (Arapça, Kiril, Çince arayüz kullanan pazarlarda) kullanıcı sürtünmesini ciddi şekilde azaltır. Bu aynı zamanda önceki raporlarımda vurguladığım "VIN bazlı SW/HW doğrulama" mimarisiyle de doğrudan entegre olur — DID/özellik eşleşmesi için zaten VIN okunuyor olacak.

### 3.7 UDS Servis Katmanında Eksik: Aktüatör Testi (`0x2F` — InputOutputControlByIdentifier)

Şu an UDS servisleri arasında `0x22` (oku), `0x19` (DTC), `0x31` (rutin — servis lambası sıfırlama), `0x10` (oturum) var ama **`0x2F` (aktüatör/röle/motor test kontrolü)** yok.

**Öneri:** Bu servis, profesyonel teşhis cihazlarında "Fan Testi", "Enjektör Testi", "Rölanti Motoru Testi" gibi özellikleri mümkün kılar (bir bileşeni ECU üzerinden manuel tetikleyip çalışıp çalışmadığını gözlemleme). Bu, "Ekspertiz" özelliğinize eklenebilecek, rakip uygulamaların çoğunda bulunmayan, güçlü bir farklılaştırıcı olur — ama **yazma işlemi olduğu için**, önceki raporlarımda belirttiğim tüm güvenlik kontrollerine (voltaj, hız=0, fail-closed provenance) tabi tutulmalı.

### 3.8 Ağır Vasıta / WWH-OBD Desteği — Uzun Vadeli Global Fırsat

Eğer global genişleme ticari araç/ağır vasıta segmentini de kapsayacaksa, Avrupa ve gelişmekte olan pazarlarda Euro VI ağır vasıtalar **WWH-OBD (ISO 27145 / SAE J1939-73)** kullanıyor — bu, standart Mode01/09'dan farklı bir servis kümesi (`22`-tabanlı ama farklı DID aralıkları). Bu, kısa vadeli öncelik değil ama binek araç kataloğu olgunlaştıktan sonra ("Faz 3" gibi) değerlendirilebilecek bir genişleme alanı olarak not düşüyorum.

---

## 4. Öncelik Sıralı Özet

| # | Ekleme | Öncelik | Gerekçe |
|---|---|---|---|
| 1 | Driver Demand / Actual Torque (`01 61/62/63`) | 🔴 Yüksek | Mevcut "Canlı Tork PID Tabanlı" özelliğini gerçek işlevsel hale getirir, HP hesaplama hatasını çapraz doğrulamaya imkan verir |
| 2 | AdBlue/DEF Seviyesi (`01 9B`) | 🔴 Yüksek | Avrupa dizel pazarı için kritik, düşük seviyede araç çalışmayı reddedebilir |
| 3 | EGT Sensörleri (`01 78-7B`) + NOx (`01 83/84`) | 🟠 Orta-Yüksek | DPF/SCR teşhisini tamamlar, Avrupa muayene senaryosuna değer katar |
| 4 | Mode 06 (Monitor Test Sonuçları) | 🟠 Orta-Yüksek | İkinci el ekspertiz özelliğini "geçti/kaldı"dan "ne kadar yakın"a taşır |
| 5 | CVN (`09 06/07`) | 🟡 Orta | Chip tuning/remap tespiti — ekspertiz için güçlü farklılaştırıcı |
| 6 | VIN Otomatik Çözümleme (WMI) | 🟡 Orta | Global kullanıcı sürtünmesini azaltır, çok dilli pazarlarda önemli |
| 7 | In-Use Performance Tracking (`09 08`) | 🟢 Düşük-Orta | Bölgesel muayene uyumluluğu senaryosu için |
| 8 | Aktüatör Testi (UDS `0x2F`) | 🟢 Düşük-Orta | Güçlü farklılaştırıcı ama yazma işlemi — tüm güvenlik katmanına tabi olmalı |
| 9 | WWH-OBD / Ağır Vasıta | 🟢 Uzun Vadeli | Segment genişlemesi kararına bağlı |

---

## 5. Sonuç

Mevcut veri okuma mimariniz, standart binek araç OBD-II/UDS kapsamı açısından **zaten oldukça olgun ve rakiplerinin çoğundan geniş**. Global genişleme için asıl fark yaratacak eklemeler; (a) dizel/Avrupa pazarına özel emisyon parametreleri, (b) ikinci el ekspertiz özelliğinizi "geçti/kaldı" seviyesinden "ne kadar sağlıklı/ne kadar yakın" seviyesine taşıyan Mode 06 ve CVN verileri, ve (c) mevcut HP ekranındaki hatayla doğrudan ilişkili olan tork PID'lerinin eklenmesi. Bunlar, yeni marka desteği eklemekten önce, **mevcut özelliklerin doğruluğunu ve derinliğini artıracak** düşük-orta efor / yüksek etki değişiklikler olarak önceliklendirilebilir.
