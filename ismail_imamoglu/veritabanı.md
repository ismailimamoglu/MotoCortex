MotoCortex Sessiz Telemetri ve Gecikmeli Kuyruk Mimarisi1. Veri Süzgeci ve Filtreleme (Data Minimization)Sunucuya ham veri akışı (streaming telemetry) basılmasını kesin olarak engellemeliyiz. Veri tabanına gidecek paket sadece "Teşhis Seansı Özeti" olacaktır.Toplanacak Veri Yapısı (Payload):JSON{
  "client_timestamp": "2026-05-27T06:57:00Z",
  "hardware_protocol": "ISO_15765_4_CAN_11bit_500k",
  "vehicle_profile": {
    "user_brand": "Yamaha",
    "user_model": "YZF-R25",
    "user_year": 2022,
    "vin_wmi_vds": "LPRSE562" // Tam VIN değil, sadece ilk 8 karakter (Model doğrulaması için)
  },
  "diagnostic_data": {
    "dtc_codes": ["P0122", "P0300"], // Okunan hata kodları dizisi
    "ecu_id": "2DR-8591A-00" // Beyin yazılım/donanım kimliği (Eşleşme doğruluğu için)
  }
}
2. Yerel Hafıza Yönetimi (Offline Catching - MMKV)İnternet yokken veriler geçici olarak cihazda istiflenecektir.Kuyruk yapısı için useBluetoothStore içinde veya bağımsız bir useTelemetryStore (MMKV tabanlı) alanında telemetry_queue adında bir dizi (Array) oluşturulacak.Uygulama aktif bir OBD seansı tamamladığında (bağlantı kesildiğinde veya tarama bittiğinde), yukarıdaki JSON paketi bu diziye push edilecek.3. Gecikmeli/Parçalı Gönderim Algoritması (Exponential Backoff + Jitter + Batching)Binlerce cihazın aynı anda (örneğin akşam garajdan çıkıp Wi-Fi'a bağlandıklarında) sunucuya hücum etmesini (Thundering Herd Problem) engellemek için şu 3'lü mekanizma kurgulanacaktır:Batching (Toplu Paketleme): Kuyrukta 20 veri birikmiş olsa bile, sunucuya tek bir HTTP isteğinde maksimum 5 kayıt gönderilebilir (BATCH_SIZE = 5).Exponential Backoff (Üssel Geciktirme): İstek başarısız olursa (ağ kopması, sunucu meşguliyeti), bir sonraki deneme süresi üssel olarak artar ($Gecikme = Taba\mathit{n\_}S\ddot{u}re \times 2^{denem\mathit{e\_}sayisi}$).Jitter (Rastgele Sapma): Üssel gecikmenin üzerine rastgele milisaniyeler (±500ms) eklenir. Böylece aynı saniyede internete kavuşan telefonlar sunucuya tam olarak aynı milisaniyede vurmaz, istekler zamana homojen olarak dağılır.📋 Ajana Verilecek Yazılım ve Entegrasyon Emri (Prompt)Ajanın kod katmanında hata yapmasını engellemek için aşağıdaki teknik şartnameyi doğrudan Antigravity terminaline yükle:Plaintext"MotoCortex projesine çevrimdışı destekli, sunucu dostu bir 'Sessiz Teşhis Telemetrisi' (Silent Diagnostic Telemetry) altyapısı entegre edeceksin. Sistem mimarisi ve kodlama kuralları aşağıdadır, harfiyen uygula:

1. VERİ TABANI SEÇİMİ VE ŞEMA:
Veritabanı sağlayıcısı olarak ilişkisel veri yapılarını destekleyen Supabase (PostgreSQL) kullanılacaktır. Supabase üzerinde 'anonymous_diagnostic_telemetry' adında bir tablo oluştur. Tablo sütunları: id (uuid), created_at (timestamp), wmi_vds (text), brand (text), model (text), year (int), protocol (text), ecu_id (text), dtc_codes (text[] - array formatında).

2. YEREL KUYRUK (LOCAL QUEUE):
React Native tarafında MMKV kütüphanesini kullanarak 'telemetry_queue' adında bir yerel dizi yönet. OBD taraması başarılı şekilde bittiğinde veya bağlantı koptuğunda, kullanıcının el ile girdiği araç profili (Marka/Model/Yıl), şasi numarasının ilk 8 karakteri (WMI/VDS), okunan ham DTC kodları dizisi ve ECU donanım kodunu içeren paketi bu yerel kuyruğa push et. Canlı telemetri verilerini (RPM, Hız, Sıcaklık vb.) kesinlikle bu pakete dahil etme.

3. NETWORK SYNCER VE GECİKMELİ KUYRUK (EXPONENTIAL BACKOFF + JITTER):
Uygulama kökünde cihazın internet durumunu (NetInfo kütüphanesi ile) izleyen asenkron bir 'TelemetrySyncManager' kancası (hook) yaz. İnternet bağlantısı sağlandığında yerel kuyrukta veri varsa şu kurallarla senkronizasyonu başlat:
- Batch Processing: Tek seferde en fazla 5 kayıt (BATCH_SIZE = 5) Supabase'e postala.
- Başarılı Gönderim: Gönderilen 5 kayıt yerel MMKV kuyruğundan 'shift' edilerek temizlensin.
- Başarısız Gönderim (Hata Yönetimi): Eğer ağ hatası alınırsa, bir sonraki denemeyi hemen yapma. Gecikme süresini 'base_delay * (2 ^ attempt) + random_jitter' formülüyle hesapla. Base_delay = 2000ms, maksimum beklenecek süre (max_delay) = 30000ms olsun. Rastgele sapma (jitter) değeri ±500ms arasında dinamik hesaplansın.
- Sonsuz Döngü Koruması: Eğer bir veri paketi bozuksa ve sunucu sürekli 400 Bad Request dönüyorsa, bu paketi kuyrukta tutup döngüyü kilitlemek yerine, yerel bir 'retry_count' sınırı koy (Maks: 3 deneme). 3 denemede de sunucudan reddedilen veriyi yerel kuyruktan silerek hafızayı temizle (Dead Letter Queue mantığı).

Bu mimariyi sırasıyla useTelemetryStore, TelemetrySyncManager ve SupabaseClient katmanlarında kur, birbiriyle mühürle ve kodları teslim et."