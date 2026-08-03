# MotoCortex — Küresel Pazar Araştırması ve Rekabet Analizi Raporu

*Hazırlanma tarihi: 3 Ağustos 2026*

---

## 1. Yönetici Özeti

MotoCortex, tek bir uygulama içinde **OBD-II/UDS teşhisi + AI destekli teşhis sohbeti + performans/dyno ölçümü + sürüş/GPX kaydı + akıllı garaj yönetimi**ni birleştiren, hem otomobil hem motosiklet sürücülerini hedefleyen bir platform olarak konumlanıyor.

Küresel pazarı taradığımızda net bir tablo ortaya çıkıyor: **Bu kadar geniş kapsamda, tek bir uygulamada, hem otomobil hem motosiklet için bu özellik setini bir arada sunan doğrudan bir rakip bulunmuyor.** Rakiplerin neredeyse tamamı tek bir nişe (klasik OBD tarama, marka-özel kodlama, AI sohbet, ya da motosiklet telemetrisi) odaklanmış durumda. Bu, MotoCortex için gerçek bir konumlandırma fırsatı, ama aynı zamanda "her şeyi yapan uygulama, hiçbirini derinlemesine yapmıyor" riskini de beraberinde getiriyor.

Aşağıda pazar; beş ana rakip kategorisine ayrılmış, MotoCortex'in özellik seti bunlarla çapraz karşılaştırılmış ve sonuçta somut güçlü/zayıf yönler ile stratejik öneriler sunulmuştur.

---

## 2. Metodoloji

Bu rapor; Torque Pro, Car Scanner ELM327, OBD Fusion, BlueDriver, FIXD, Carly, OBDeleven, OBDAI, MECH AI, AI Car Doctor, AI Mechanic gibi otomobil tarafındaki lider uygulamalar ile RaceChrono, ThrottleX, Angle (Lean & Moto Garage), MotoVault, Calimoto, MotoScan, MotoPhix gibi motosiklet-özel uygulamaların Ağustos 2026 itibarıyla güncel özellik listeleri, fiyatlandırma sayfaları ve bağımsız inceleme kaynakları (OBDadvisor, TorqueBot, Skanyx vb.) taranarak hazırlanmıştır. Kaynaklar genel pazar eğilimlerini yansıtır; bölgesel/marka bazlı farklılıklar olabilir.

---

## 3. Küresel Rakip Haritası

### 3.1. Kategori A — Klasik OBD-II Tarayıcı Uygulamaları (Genel Amaçlı)
**Örnekler: Torque Pro, Car Scanner ELM327, OBD Fusion**

- Bu kategori, MotoCortex'in "Canlı Telemetri" ve "DTC Tarama" modüllerine en yakın rakip grubu.
- <cite index="2-1,4-1,5-1">Torque Pro, gerçek zamanlı performans verisi, özelleştirilebilir gösterge panelleri, GPS'li sürüş kaydı ve dyno/beygir gücü-tork hesaplaması sunuyor</cite>, ancak <cite index="3-1">manifaktür-özel derinlik (Ford şanzıman kodları, GM ABS kodları gibi) için ayrı marka eklentileri gerektiriyor ve eklenti başına ek ücret alıyor</cite>.
- <cite index="6-1">Torque Pro 2026'da yapay zeka destekli teşhis ve araç geçmişi raporu gibi özellikler ekleyerek AI Doctor benzeri bir alana da girmeye başladı</cite> — bu, MotoCortex'in "AI Doctor" farklılaştırıcısının artık tek başına yeterli olmayabileceğinin bir işareti.
- <cite index="38-1,40-1">Car Scanner ELM327 ise donanım-agnostik yaklaşımıyla (OBDLink, Kiwi 3, V-Gate gibi birçok adaptörle uyumlu) geniş bir kullanıcı tabanına ulaşıyor</cite>.
- Fiyatlandırma tek seferlik ve düşük (~5 USD) olduğundan, bu segment fiyat konusunda MotoCortex'in Pro aboneliğine güçlü bir baskı oluşturuyor.

### 3.2. Kategori B — Donanım + Uygulama Paketleri (Tüketici Odaklı Basitlik)
**Örnekler: BlueDriver, FIXD**

- <cite index="27-1">BlueDriver, ABS/SRS/şanzıman gibi gelişmiş kodları okuyabiliyor, araca özel Onarım Raporları üretiyor ve abonelik ücreti almıyor</cite>, ancak <cite index="27-1">donanımı yalnızca kendi uygulamasıyla çalışıyor</cite>.
- <cite index="34-1">FIXD ise Premium planında (yıllık ~100 USD) tahmini onarım maliyeti ve deneyimli tamirci desteği sunuyor</cite>, fakat <cite index="27-1">yalnızca motor kodlarını okuyor, ABS/SRS gibi genişletilmiş sistemlere erişemiyor</cite>.
- Bu kategori MIL söndürme, freeze-frame gibi konularda MotoCortex ile doğrudan örtüşüyor, ancak AI destekli sohbet teşhisi, dyno ölçümü, DPF/fuel-trim analizi gibi ileri düzey servisler bu uygulamalarda yok.

### 3.3. Kategori C — Marka-Özel Kodlama/Coding Araçları (Avrupa Premium Segmenti)
**Örnekler: Carly, OBDeleven**

- <cite index="12-1">Carly, seçili markalarda (BMW, Volkswagen, Audi, Mercedes-Benz) motor dışında ABS, hava yastığı ve şanzıman gibi sistemleri de tarayabiliyor</cite> ve <cite index="12-1">bakım hatırlatıcıları, araç kontrolü, gezi takibi, hibrit batarya kontrolü ve AI arıza açıklamaları gibi özellikleri cihazla birlikte ücretsiz sunuyor</cite>.
- <cite index="13-1">Carly'nin "Smart Mechanic" özelliği, rakiplerine karşı en önemli avantajı olarak öne çıkıyor</cite> — bu, MotoCortex'in AI Doctor'ına doğrudan rakip bir işlev.
- Fiyatlandırma modeli donanım + yıllık marka-bazlı lisans şeklinde (yaklaşık 55-99 EUR/yıl) yapılandırılmış ve <cite index="16-1">yenileme ücretlerinin beklenmedik şekilde yüksek çıkması kullanıcı şikayetlerinin başında geliyor</cite>.
- Bu segment yüksek fiyatlı ama derin (marka-özel kodlama dahil) bir deneyim sunuyor; MotoCortex'in UDS aktüatör testleri ve çoklu-ECU tarama özellikleri burada rekabet edebilir, ancak marka-özel "coding" (örn. gizli özellik açma) derinliğine henüz sahip değil.

### 3.4. Kategori D — Yapay Zeka Odaklı Teşhis Uygulamaları (Yükselen Segment)
**Örnekler: OBDAI (ARIA), MECH AI, AI Car Doctor, AI Mechanic**

Bu, MotoCortex'in "AI Doctor" modülüyle en doğrudan rekabet ettiği ve en hızlı büyüyen segment.

- <cite index="50-1">OBDAI'nin AI asistanı ARIA, sensörleri otonom olarak seçebiliyor, canlı veriyi analiz edebiliyor ve OBD-II portu üzerinden kök neden teşhisi yapabiliyor</cite>; <cite index="50-1">her araç için tüm önceki konuşmaları hatırlayan kalıcı bir hafızaya sahip ve marka raporu oluşturabiliyor</cite>.
- <cite index="47-1">MECH AI, AI mekanik sohbeti, OBD2 kod okuma, adım adım onarım rehberleri, kablo şemaları ve parça aramasını tek uygulamada birleştiriyor</cite>; <cite index="47-1">semptomu tanımlayınca en olası nedeni, tahmini onarım maliyetini ve kendin-yap zorluk derecesini veriyor</cite>.
- <cite index="43-1">AI Car Doctor, kullanıcının bir sesi, titreşimi veya kokuyu tarif etmesine, fotoğraf göndermesine ve üzerine çizim yapmasına izin veriyor</cite>; <cite index="43-1">gerçek bir mekaniğin soracağı takip sorularını sorup güven seviyeli, kök-neden analizli yapılandırılmış bir teşhis sunuyor</cite>.
- Bu uygulamaların ortak noktası: **çok dilli** (30+ dil), **fotoğraf/ses tabanlı teşhis**, **TSB/recall erişimi**, **parça bulma** gibi MotoCortex'te henüz bulunmayan özellikler.
- Fiyatlandırma genelde aylık abonelik (7-60 USD/ay arası kademeli) şeklinde; bazıları donanımsız (sadece semptom tarifiyle) çalışabiliyor — bu, MotoCortex'in OBD donanımına bağımlı AI Doctor'ına kıyasla daha düşük giriş bariyeri sunan bir tehdit.

### 3.5. Kategori E — Motosiklete Özel Uygulamalar (Parçalanmış Pazar)
**Örnekler: RaceChrono, ThrottleX, Angle (Lean & Moto Garage), MotoVault, Calimoto, REVER, MotoScan, MotoPhix, çeşitli "Lean Angle" uygulamaları**

Bu segment MotoCortex açısından en kritik bulgu: **motosiklet tarafında pazar ciddi şekilde parçalanmış durumda, hiçbir tek uygulama tam kapsamı sunmuyor.**

- <cite index="18-1">RaceChrono, 2.600'den fazla pist verisi, video overlay ve profesyonel seviyeye yakın veri analizi sunuyor ama motosiklete özel değil, araç OBD-II entegrasyonu odaklı</cite>.
- <cite index="19-1">Angle (Lean & Moto Garage) uygulaması yatış açısı, G-kuvveti, navigasyon, garaj bakım takibi ve GPX dışa aktarımını tek uygulamada birleştiriyor</cite>, fakat **OBD-II/DTC teşhisi ve motor sensör verisi yok** — sadece telefon sensörlerine dayanıyor.
- <cite index="18-1">ThrottleX, ondalık hassasiyette yatış açısı, PDF rapor, 3D KML ısı haritası, garaj/bakım takipçisi, çarpışma algılama ve SMS SOS özelliklerini tek seferlik 9,99 USD'ye sunuyor</cite> ama yine **OBD entegrasyonu yok**.
- <cite index="20-1">MotoVault; bakım takibi, gider kaydı, GPS sürüş kaydı, çok günlük gezi planlaması ve AI destekli fotoğraf teşhisini birleştiriyor</cite>, ama gerçek zamanlı OBD/UDS teşhisi sunmuyor.
- <cite index="20-1">MotoScan, motosikletin OBD-II portuna Bluetooth adaptörle bağlanıp kod okuma/silme ve canlı sensör verisi görüntüleme yapıyor, BMW için derin ECU teşhisi sağlıyor</cite> ama diğer markalarda temel düzeyde kalıyor ve garaj/AI/telemetri gibi ek modülleri yok.
- Yatış açısı (lean angle) uygulamaları (Lean Angle+, SafeRide: Telemeter, Alert Position vb.) tamamen tek işlevli, ücretsiz veya çok düşük fiyatlı "nokta çözümler".

**Sonuç:** Motosiklet segmentinde kimse "OBD teşhisi + AI Doktor + yatış açısı telemetrisi + garaj yönetimi + GPX" bütününü sunmuyor. Bu, MotoCortex'in en net boşluk-doldurma fırsatı.

---

## 4. Özellik Karşılaştırma Matrisi

| Özellik / Modül | MotoCortex | Torque Pro | BlueDriver/FIXD | Carly/OBDeleven | OBDAI/MECH AI/AI Car Doctor | Motosiklet Uygulamaları (Angle, ThrottleX, MotoVault) |
|---|:---:|:---:|:---:|:---:|:---:|:---:|
| Çoklu protokol OBD (CAN/KWP/J1850) | ✅ | ✅ | ✅ | ✅ | Kısmi (donanıma bağlı) | ❌ |
| Çoklu ECU tarama (Motor/ABS/TCU) | ✅ | Eklentiyle | ✅ (BlueDriver) | ✅ | Kısmi | ❌ |
| VIN ile otomatik araç tanıma | ✅ | Kısmi | ✅ | ✅ | ✅ | Kısmi |
| Tüm DTC kategorileri (P/C/B/U) | ✅ | Eklentiyle | ✅ (BlueDriver) | ✅ | ✅ | ❌ |
| Freeze Frame verisi | ✅ | ✅ | ✅ | ✅ | Kısmi | ❌ |
| **AI sohbet tabanlı teşhis (metin)** | ✅ | Yeni eklendi | ❌ | ✅ (Smart Mechanic) | ✅ (Güçlü — çekirdek ürün) | ❌ |
| **Fotoğraf/ses ile AI teşhis** | ❌ | ❌ | ❌ | ❌ | ✅ (AI Car Doctor, MECH AI) | Kısmi (MotoVault) |
| **Aciliyet/risk seviyesi tahmini** | ✅ | ❌ | ❌ | Kısmi | ✅ | ❌ |
| Dyno / HP-Tork ölçümü | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Fuel Trim (STFT/LTFT) analizi | ✅ | Kısmi | ❌ | Kısmi | ❌ | ❌ |
| DPF takibi | ✅ | ❌ | ❌ | Kısmi | ❌ | ❌ |
| DCT/Şanzıman uyarlama | ✅ | ❌ | ❌ | ✅ (VAG'da) | ❌ | ❌ |
| UDS Aktüatör/Bidirectional testler | ✅ | ❌ | ❌ | ✅ (marka-özel) | ❌ | ❌ |
| Marka-özel "coding" (gizli özellik açma) | ❌ | ❌ | ❌ | ✅ (Carly/OBDeleven'in temel farkı) | ❌ | ❌ |
| GPS sürüş kaydı + GPX/CSV export | ✅ | ✅ | ❌ | ❌ | ❌ | ✅ |
| **Motosiklet yatış açısı (lean angle)** | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ (çekirdek ürün) |
| Video overlay (telemetri bindirmeli) | ❌ | ✅ (eklenti) | ❌ | ❌ | ❌ | ✅ (RaceChrono) |
| Çarpışma algılama / SOS | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ (ThrottleX) |
| Çoklu araç garaj + bakım takibi | ✅ | ❌ | Kısmi (FIXD 5 araç) | Kısmi | ✅ | ✅ |
| Parça bulma / fiyat karşılaştırma | ❌ | ❌ | ❌ | ❌ | ✅ (MECH AI) | ❌ |
| TSB / Recall erişimi | ❌ | ❌ | Kısmi (BlueDriver) | ❌ | ✅ (MECH AI, OBDAI) | ❌ |
| Kullanılan araç geçmiş raporu (VIN bazlı) | ❌ | ✅ (yeni) | ❌ | ✅ (kullanılmış araç kontrolü) | ✅ (OBDAI) | ❌ |
| Offline-first + bulut senkron | ✅ | Kısmi | Kısmi | ✅ | ✅ | Kısmi |
| Abonelik dışı tek seferlik seçenek | Kısmi (Free katman var) | ✅ (5 USD tek seferlik) | ✅ (BlueDriver) | ❌ (yıllık lisans şart) | ❌ (çoğunlukla abonelik) | Kısmi (ThrottleX 9,99 USD tek seferlik) |

---

## 5. MotoCortex'in Güçlü Yönleri (Rekabet Avantajları)

1. **Kategori-birleştirici konumlandırma:** Hiçbir rakip; OBD/UDS teşhisi + AI Doktor + dyno/performans + DPF/fuel-trim + sürüş kaydı + garaj yönetimini tek çatı altında sunmuyor. Rakipler ya "genel OBD" (Torque, Car Scanner) ya "AI sohbet" (OBDAI, MECH AI) ya da "marka-kodlama" (Carly, OBDeleven) ekseninde uzmanlaşmış durumda.
2. **Motosiklet + otomobil ikili desteği:** Bu, rakiplerin hiçbirinde yok. Motosiklet uygulamaları OBD teşhisinden yoksun, otomobil uygulamaları motosiklet desteği sunmuyor (MotoScan hariç, o da tek marka odaklı ve AI/dyno/garaj modülleri yok).
3. **İleri düzey teşhis derinliği (Free tier'da bile Pro rakiplerin üstünde):** DPF, DCT adaptasyonu, fuel trim ve UDS aktüatör testi gibi özellikler genelde yalnızca profesyonel/marka-özel araçlarda (Launch, Autel, Carly) bulunuyor; genel tüketici uygulamalarında nadir.
4. **Türkçe AI Doktor:** Rakiplerin çoğu (MECH AI, AI Car Doctor) çok dilli olsa da Türkçe'ye özel, teknik jargon içermeyen yerel bir teşhis deneyimi belirgin bir yerelleştirme avantajı sağlıyor — özellikle yerel/bölgesel pazarda giriş bariyerini düşürür.
5. **Offline-first mimari + sıfır veri kaybı garantisi:** Dağ yolu/kırsal kullanım senaryosu (özellikle motosiklet turlama) için rakiplerin çoğunda bu netlikte bir garanti yok.
6. **Güvenlik mimarisi (uçtan uca şifreleme + JWT + SecureStore):** Çoğu rakip uygulamanın pazarlama materyalinde bu düzeyde şifreleme vurgusu bulunmuyor; kurumsal/filo müşterileri için satış argümanı olabilir.

---

## 6. Eksik ve Zayıf Yönler (Rakiplere Göre Geride Kalınan Alanlar)

1. **Fotoğraf/ses tabanlı AI teşhis eksik:** AI Car Doctor ve MECH AI, kullanıcının fotoğraf çekip üzerine işaretleme yapmasına veya sesli ses/titreşim tarifi göndermesine izin veriyor. MotoCortex'in AI Doctor'ı yalnızca metin sohbeti üzerinden çalışıyor — bu, hızla standart hale gelen bir özellik ve eksikliği fark edilebilir.
2. **Motosiklete özel yatış açısı (lean angle) ve G-kuvveti telemetrisi yok:** Motosiklet segmentinde bu, neredeyse tüm rakiplerin (Angle, ThrottleX, SafeRide, RaceChrono) çekirdek özelliği. MotoCortex "motosiklet ve otomobil" diye iddialı bir konumlandırma yapıyor ama motosiklete özgü en temel telemetri unsuru eksik — bu ciddi bir konumlandırma-gerçeklik uyuşmazlığı.
3. **Video overlay / çarpışma algılama-SOS yok:** Sürüş güvenliği ve içerik üretimi (Youtube/Instagram için telemetri bindirmeli video) motosiklet ve performans-meraklısı kullanıcılar için önemli bir talep; ThrottleX ve RaceChrono bunu sunuyor.
4. **Parça bulma ve TSB/Recall erişimi eksik:** MECH AI ve OBDAI kullanıcıyı "teşhisten satın almaya" kadar götürüyor (parça arama, OEM diyagramlar, TSB). MotoCortex teşhisten sonra kullanıcıyı bırakıyor; bu, "aksiyona dönüştürme" ve olası ek gelir kalemi (affiliate/parça komisyonu) fırsatını kaçırıyor.
5. **Marka-özel "coding" (gizli özellik açma) yok:** Carly ve OBDeleven'in en güçlü — ve en yüksek fiyat prim getiren — özelliği bu. Avrupa premium segmentinde (BMW, VAG) rekabet etmek isterse MotoCortex'in bu alanı düşünmesi gerekir; ama bu çok maliyetli bir mühendislik yatırımı.
6. **Kullanılmış araç / VIN geçmiş raporu yok:** Torque Pro (2026 güncellemesi) ve Carly bu özelliği yeni ekledi; ikinci el araç/motosiklet alım-satımı yaygın bir kullanım senaryosu ve MotoCortex'te karşılığı yok.
7. **Fiyatlandırma modeli belirsizliği / rekabet baskısı:** Pazarda hem çok ucuz tek seferlik seçenekler (Torque Pro 5 USD, Car Scanner ücretsiz, ThrottleX 9,99 USD tek seferlik) hem de yüksek fiyatlı ama derin abonelik modelleri (Carly, MECH AI Autoshop 59,99 USD/ay) var. MotoCortex'in Free/Pro tablosu iyi yapılandırılmış görünüyor, ancak AI Doctor'ın Free'de "sadece kod tanımıyla" sınırlı olması, rakip AI uygulamalarının günlük ücretsiz mesaj kotası sunmasına kıyasla daha kısıtlayıcı algılanabilir.
8. **Topluluk / sosyal katman eksik:** REVER, Calimoto gibi motosiklet uygulamaları rota paylaşımı ve topluluk özellikleriyle organik büyüme sağlıyor. MotoCortex'te bu tür bir sosyal/viral büyüme mekanizması görünmüyor.
9. **Çok dillilik sınırlı:** Rakip AI uygulamaları (AI Car Doctor 31 dil, MECH AI 6 dil) geniş dil desteğiyle global pazara açılırken MotoCortex'in Türkçe odaklı konumlandırması yerel pazarda avantaj, ama uluslararası büyüme hedefi varsa bir kısıt.

---

## 7. Stratejik Öneriler

1. **"Hibrit teşhis" ile farkı büyütün:** Metin tabanlı AI Doctor'a fotoğraf/ses girişini ekleyin (özellikle motor sesi kaydı — makine öğrenmesiyle tekleme/vuruntu sesi sınıflandırması niş ama güçlü bir farklılaştırıcı olabilir).
2. **Motosiklet segmentinde yatış açısı + G-kuvveti telemetrisini önceliklendirin:** Telefon sensörleriyle (donanımsız) uygulanabilir bir özellik; mevcut OBD/UDS altyapısına eklemek nispeten düşük maliyetli ama konumlandırma iddiasını gerçeğe dönüştürecek en kritik adım.
3. **"Aksiyona dönüştürme" katmanı ekleyin:** Teşhis sonrası parça arama/fiyat karşılaştırma veya yerel servis/usta yönlendirmesi (harita entegrasyonlu) gelir modelini çeşitlendirebilir ve MECH AI'nin sunduğu uçtan uca deneyimle rekabeti dengeler.
4. **Free katmanda AI Doctor'ı biraz gevşetin:** Günlük/haftalık sınırlı ücretsiz sohbet kotası (rakiplerdeki gibi) dönüşüm hunisini güçlendirebilir; şu anki "sadece kod tanımı" çok kısıtlayıcı kalabilir.
5. **VIN tabanlı araç geçmişi/ikinci el kontrol raporunu değerlendirin:** Hem Torque Pro hem Carly bu yöne kaydı; ikinci el motosiklet/otomobil pazarının büyüklüğü düşünüldüğünde orta vadeli bir fırsat.
6. **Marka-özel coding yerine "coding-lite" bir yol haritası:** Carly/OBDeleven seviyesinde tam coding yerine, en çok talep gören 5-10 popüler "one-click" özelliği (örn. otomatik cam kapama, DRL ayarları) hedefli marka desteğiyle sunmak, tam kodlama motoruna göre çok daha düşük mühendislik maliyetiyle premium algı yaratabilir.
7. **Topluluk/rota paylaşım katmanını değerlendirin:** Özellikle motosiklet kullanıcı tabanında organik büyüme ve elde tutma için düşük maliyetli bir sosyal katman (rota paylaşımı, sürüş istatistiği karşılaştırma) uzun vadede değerlendirilebilir.

---

## 8. Sonuç

MotoCortex, teknik derinlik açısından (UDS aktüatör testleri, DPF, fuel trim, DCT adaptasyonu, çoklu ECU tarama) pazardaki birçok tüketici uygulamasının önünde; bunu Türkçe AI Doktor ve offline-first mimariyle birleştirerek gerçek bir farklılaşma sağlıyor. Ancak "hem motosiklet hem otomobil" iddiasının inandırıcı olması için motosiklete özgü temel telemetri (yatış açısı, G-kuvveti) eksikliğinin kapatılması gerekiyor; aksi halde bu iddia otomobil-ağırlıklı bir ürünün üzerine eklenmiş bir motosiklet etiketi gibi kalma riski taşıyor. Aynı şekilde, fotoğraf/ses tabanlı AI teşhis ve teşhis-sonrası aksiyon (parça/servis yönlendirmesi) gibi hızla standartlaşan özellikler, orta vadeli yol haritasında öncelik kazanmalı.
