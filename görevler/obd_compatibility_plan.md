# MotoCortex Global OBD2 Uyumluluk ve Kararlılık Planı

Bu plan, **mimar1.md** ve **mimar2.md** dosyalarında önerilen donanım tolerans, protokol fallback ve marka bazlı optimizasyon stratejilerini birleştirerek MotoCortex uygulamasını küresel pazardaki rakipleriyle (Car Scanner, Torque Pro, OBDLink) rekabet edebilecek seviyeye çıkaracak somut teknik mimariyi ve uygulama adımlarını tanımlar.

---

## 1. Problemin Tanımı ve Mimari Hedefler

Sahadaki birçok araç ve motosiklet ECU'sunun standart dışı davranması ve piyasadaki OBD2 adaptörlerinin %90'ının ucuz, komut seti eksik Çin klonları olması nedeniyle bağlantıda kopmalar veya yanlış veri okumaları yaşanmaktadır. 

Bu planın amacı:
1.  **Bağlantı Başarısını artırmak (%95+)**: Cihaz klon olsa bile bağlantıyı kurmak.
2.  **Veri Doğruluğunu korumak**: Hatalı sensör verilerini filtrelemek.
3.  **Motosiklet Desteğini Güçlendirmek**: Standart dışı motor ECU'ları ile el sıkışmak.
4.  **Bant Genişliği Yönetimi**: K-Line ve CAN hatlarının limitlerine göre dinamik kuyruk yönetimi.

---

## 2. Detaylı Teknik Yol Haritası ve Fazlar

### Faz 1: Donanım Soyutlama Katmanı (HAL) ve Klon Adaptör Yönetimi

#### 1. Adaptör Yetenek Matrisi (Adapter Capability Matrix)
İlk el sıkışma (Initialization) sırasında adaptöre gönderilen test komutlarıyla cihazın gerçek mi yoksa klon mu olduğu tespit edilecektir.

*   **ATI**: Üretici yazılımı sorgulanır (Örn. `ELM327 v1.5` veya `v2.1`).
*   **AT @1**: Cihaz seri numarası veya klon imzası kontrol edilir.
*   **AT PPS**: Donanım parametre tablosu kontrol edilir.
*   **Destek Testi**: `AT ST` (Timeout), `AT H1` (Header Göster), `AT AL` (Uzun Mesaj İzni) komutları gönderilir. Eğer adaptör `?` veya `ERROR` fırlatırsa, o özelliğin adaptör tarafında desteklenmediği matrise işlenir.

```typescript
interface AdapterProfile {
  quality: 'premium' | 'genuine' | 'clone-good' | 'clone-bad';
  guardTimeMs: number;         // Komutlar arası zorunlu bekleme süresi
  bufferSize: number;          // Buffer dolmasını önlemek için limit
  supportedFeatures: {
    timeoutSetting: boolean;   // AT ST desteği
    headerControl: boolean;    // AT H1/H0 desteği
    longMessages: boolean;     // AT AL desteği
  };
}
```

#### 2. Dinamik Hız Sınırlayıcı (Rate Limiter / Throttling)
Klon cihazlarda `BUFFER FULL` hatasını önlemek için kuyruk yöneticisi (Queue Manager) adaptör profiline göre dinamik gecikme uygular:
- **Premium / Genuine**: `guardTimeMs = 20ms`
- **Clone-Good**: `guardTimeMs = 80ms`
- **Clone-Bad**: `guardTimeMs = 180ms - 250ms` (Yazılımsal `setTimeout` ile asenkron komut yavaşlatma)

---

### Faz 2: Manuel Protokol ve Gelişmiş Başlatma (Init) Ağacı

Otomatik arama (`AT SP 0`) başarısız olduğunda veya sürekli koptuğunda devreye girecek olan **Brute-Force Init Tree** (Sıralı Deneme Ağacı) devreye alınacaktır.

#### 1. İlklendirme Ağacı Sıralaması (Waterfall Fallback Sequence)

1. **AT SP 0** (Otomatik Seçim)
   - *Başarısız olursa ->* **AT SP 6** (ISO 15765-4 CAN 11/500)
   - *Başarısız olursa ->* **AT SP 7** (ISO 15765-4 CAN 29/500)
   - *Başarısız olursa ->* **AT SP 5** (ISO 14230-4 KWP FAST)
   - *Başarısız olursa ->* **AT SP 4** (ISO 14230-4 KWP SLOW)
   - *Başarısız olursa ->* **AT SP 3** (ISO 9141-2 K-Line)
   - *Başarısız olursa ->* **AT SP 1 / AT SP 2** (SAE J1850 PWM/VPW)

#### 2. K-Line Yavaş İlklendirme (Slow Init - 5 Baud) Desteği
Eski Euro 3/4 motosikletler ve araçlar için `5-Baud Slow Init` sıralı komut dizisi kütüphaneye eklenecektir:
```
AT SP 5       -> Protokolü ISO 14230 olarak zorla
AT IIA 10     -> ECU Adresini 10 (Motosiklet/Araç için varsayılan) yap
AT SI         -> Yavaş ilklendirmeyi (Slow Init) başlat
```

#### 3. Motosiklet Marka Profilleri
Motosiklet ECU'ları standart `7E0` CAN adresi yerine farklı adresler kullanır. Araç profili seçimine göre otomatik header ayarı yapılacaktır:
*   **Yamaha (K-Line)**: KWP/ISO14230 protokolü üzerinden özel adreslemeler.
*   **Honda (Keihin ECU)**: `AT SP 5` ve `AT SH 81 11 F1` komutlarıyla el sıkışma.
*   **BMW Motorrad (CAN)**: `AT SH 7E0` ve motosiklete özel alt PID kütüphaneleri.

---

### Faz 3: OEM Gelişmiş PID'ler ve Dinamik Adresleme Katmanı

Generic OBD-II (Mode 01) dışındaki gelişmiş sensörleri okumak için CAN Header'ları dinamik olarak manipüle edilecektir.

#### 1. Dinamik Header Değişimi (Dynamic Address Routing)
Kuyruk yöneticisi, gönderilecek her PID için ilgili ECU modülüne göre header değiştirecektir:
```typescript
// Kuyruğa eklenen her eleman artık opsiyonel bir CAN Header parametresi alacak:
interface OBDCommand {
  command: string;
  expectedHeader?: string; // Örn: '7E0' (Motor), '7E1' (Şanzıman), '7E2' (ABS)
}
```
*Kuyruk İşleme Adımları:*
1. Bir sonraki komutun `expectedHeader` değeri mevcut header'dan farklı ise:
   `AT SH [expectedHeader]` komutunu araya sıkıştır.
2. Esas komutu gönder (Örn: `2101` veya `221101`).
3. Yanıtı al ve parser'a gönder.

#### 2. Profesyonel Teşhis Kodları
*   **Mode 02 (Freeze Frame)**: Arıza anındaki sensör durumlarını okumak için veri parser yapısı kurulacak.
*   **Mode 09 (Vehicle Info)**: Şasi No (`PID 02`), Kalibrasyon ID (`PID 04`) ve ECU Adı (`PID 0A`) sorgularıyla arayüz zenginleştirilecek.

---

### Faz 4: Dinamik Bant Genişliği ve Katmanlı Planlayıcı (Tiered Scheduler)

Hattın okuma hızına (Gecikme Süresine - Latency) göre sensörlerin sorgulanma önceliği dinamik olarak hesaplanacaktır.

#### 1. Sensör Öncelik Katmanları (Priority Tiers)
*   **Tier 1 (High - Sürekli)**: RPM (Motor Devri), Speed (Hız). *Her döngüde okunur.*
*   **Tier 2 (Medium - Orta)**: Throttle (Gaz Kelebeği), Engine Load (Motor Yükü). *İki döngüde bir okunur.*
*   **Tier 3 (Low - Seyrek)**: Coolant Temp (Motor Sıcaklığı), Ambient Temp, Akü Voltajı. *On döngüde bir okunur.*

#### 2. Akıllı Hız Adaptasyonu (Adaptive Scaling)
Haberleşme gecikme süresine göre planlayıcı mod değiştirecektir:
*   **CAN-Bus (Gecikme < 30ms)**: Tüm Tiers aktif hızda çalışır.
*   **K-Line (Gecikme > 150ms)**: Tier 2 ve Tier 3 sorgu sıklığı 2 kat daha seyrekleştirilir, böylece RPM ve Speed verilerinde gecikme (lag) oluşması engellenir.

---

### Faz 5: Ham Paket Günlüğü (Hex Logging) ve Veri Güven Skoru

#### 1. Ham Paket Loglama Standardı
Parser hatalarını uzaktan analiz edebilmek için log yapısı genişletilecektir:
```
[2026-06-11 15:30:12.123] [TX] 010C
[2026-06-11 15:30:12.190] [RAW RX] 7E8 04 41 0C 0F A0
[2026-06-11 15:30:12.192] [DECODED RX] 410C0FA0
[2026-06-11 15:30:12.195] [PARSED] RPM = 1000 RPM
```

#### 2. Mantık Filtresi ve Veri Güven Skoru (Confidence Score)
ECU'dan gelen hatalı veya parazitli verileri ayıklamak için mantık sınırları tanımlanacaktır:
- RPM değişimi milisaniyeler içinde `1000`'den `15000`'e zıplarsa bu veri yoksayılır ve güven skoru düşürülür.
- Güven skoru `%50` altına düşen sensör arayüzde donuklaştırılır veya eski geçerli değeriyle gösterilir.

---

## 3. Doğrulama ve Saha Test Matrisi

Uygulamanın doğruluğunu kanıtlamak için en az **30 araç** ve **10 farklı adaptörle** gerçekleştirilecek saha testi matrisi uygulanacaktır.

### 1. Adaptör Test Havuzu
1. OBDLink MX+ (STN çipli - Premium)
2. Vgate vLinker MC+ (BLE 4.0 - Genuine)
3. Veepeak OBDCheck BLE+ (Genuine)
4. Konnwei KW903 (Genuine)
5. Çin Klonu ELM327 v1.5 (PIC18F25K80 içerikli - Clone-Good)
6. Çin Klonu ELM327 v2.1 (Sahte çipli - Clone-Bad)

### 2. Araç Marka Havuzu (Test Edilecek Minimum Araçlar)
- **Otomobil**: Hyundai, Kia, Toyota, Honda, Renault, Volkswagen, Ford, Fiat, Peugeot.
- **Motosiklet**: Honda (CBR/Africa Twin), Yamaha (R25/MT-07), KTM (Duke 390), BMW Motorrad (R1250GS).
