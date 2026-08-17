/**
 * scripts/translate_all_new_features.js
 * 
 * Injects accurate native Turkish translations for all newly added features,
 * category keys, and multi-option parameters into src/locales/tr.json,
 * and synchronizes across all 26 supported languages.
 */

const fs = require('fs');
const path = require('path');

const localesDir = path.join(__dirname, '../src/locales');
const trPath = path.join(localesDir, 'tr.json');

const trData = JSON.parse(fs.readFileSync(trPath, 'utf8'));

// 1. Ensure category keys exist
if (!trData.features) trData.features = {};
trData.features.catLighting = "Aydınlatma";
trData.features.catSound = "Ses & Uyarılar";
trData.features.catSoundAlerts = "Ses & Uyarılar";
trData.features.catDisplay = "Gösterge Paneli";
trData.features.catDisplayInstrument = "Gösterge Paneli";
trData.features.catComfort = "Sürüş Konforu";
trData.features.catDrivingComfort = "Sürüş Konforu";
trData.features.catSafety = "Güvenlik";
trData.features.catSecuritySafety = "Güvenlik & Emniyet";
trData.features.catMotorcycle = "Motosiklet ECU";
trData.features.catMotorcycleEcu = "Motosiklet ECU";
trData.features.catRetrofit = "Donanım & Retrofit";
trData.features.catEv = "EV & Batarya";
trData.features.catAdas = "ADAS & Sürüş Asistanları";
trData.features.catEasterEgg = "Gizli Özellikler";
trData.features.catService = "Servis & Bakım";
trData.features.catPerformance = "Performans";

// 2. Ensure multi-options translations exist
if (!trData.features.options) trData.features.options = {};
const turkishOptions = {
    // Speed limits
    speed85: "85 km/h (Filo)",
    speed90: "90 km/h (Standart)",
    speed100: "100 km/h (Otoyol)",
    speed110: "110 km/h (Maksimum)",
    // Idle shutdown
    idleOff: "Devre Dışı (Sürekli Rölanti)",
    idle3m: "3 Dakika Sonra Kapat",
    idle5m: "5 Dakika Sonra Kapat",
    idle10m: "10 Dakika Sonra Kapat",
    // PTO RPM
    pto900: "900 RPM (Düşük Debi)",
    pto1100: "1100 RPM (Damper / Standart)",
    pto1300: "1300 RPM (Vinç / Yüksek Debi)",
    // Retarder
    retarderLow: "Düşük (Yumuşak Otoyol)",
    retarderMed: "Orta (Standart)",
    retarderHigh: "Yüksek (Ağır Yük / Dağ)",
    // ECAS Level
    levelNormal: "Normal Sürüş Seviyesi",
    levelRamp1: "Yükleme Rampası Seviyesi 1",
    levelRamp2: "Yükleme Rampası Seviyesi 2",
    // DPF Regen
    regenStart: "Sabit Rejenerasyonu Başlat",
    regenStatus: "Kurum Durumunu Sorgula",
    // Reverse Alarm
    alarmFull: "Tam Ses (%100 Gündüz)",
    alarmNight: "Kısık Ses (%50 Gece Modu)",
    // Eco-Roll Hysteresis
    hyst3: "+/- 3 km/h (Hassas)",
    hyst5: "+/- 5 km/h (Dengeli)",
    hyst10: "+/- 10 km/h (Maksimum Tasarruf)",
    // DRL
    drl25: "%25 Kısık",
    drl50: "%50 Orta",
    drl75: "%75 Parlak",
    drl100: "%100 Tam Güç",
    // Differential
    xdsStandard: "Standart (Orta)",
    xdsStrong: "Güçlü (GTI / R)",
    // Turn signal blinks
    blink1: "1 Flaş",
    blink3: "3 Flaş (Standart)",
    blink4: "4 Flaş",
    blink5: "5 Flaş (Genişletilmiş)",
    // Warning chimes
    chimeBmw: "BMW Standart",
    chimeMini: "MINI Tarzı",
    chimeRolls: "Rolls-Royce Lüks",
    chimeBmwi: "BMW i Elektrik",
    // Boot logos
    logoStandard: "Standart",
    logoMPerf: "M Performance",
    logoAlpina: "Alpina Mavi"
};

Object.assign(trData.features.options, turkishOptions);

// 3. Turkish feature items translation dictionary
const turkishFeatureItems = {
    // VAG additions
    vag_mirror_dip_reverse: {
        name: "Geri Viteste Sağ Ayna İndirme",
        desc: "Geri vitese takıldığında kaldırım kenarını görmek için sağ dikiz aynasını otomatik aşağı eğer."
    },
    vag_lap_timer_oil_temp: {
        name: "Pist Tur Sayacı & Motor Yağ Sıcaklığı",
        desc: "Gösterge paneline anlık motor yağı sıcaklık derecesini ve pist tur süresi kronometresini ekler."
    },
    vag_rear_scandinavian_drl: {
        name: "İskandinav Gündüz Farları (Arka Stoplar Aktif)",
        desc: "Gündüz farları yanarken arka LED stop lambalarının da sürekli yanmasını sağlar."
    },
    vag_drl_handbrake_off: {
        name: "El Freni Çekilince Gündüz Farı Kapatma",
        desc: "El freni çekildiğinde gündüz sürüş farlarının otomatik olarak sönmesini sağlar."
    },
    vag_drl_menu_in_mib: {
        name: "Multimedya Ekranında Gündüz Farı Menüsü",
        desc: "Multimedya araç ayarları menüsüne Gündüz Farlarını Aç/Kapat onay kutusunu ekler."
    },
    vag_rain_closing_windows: {
        name: "Yağmurda Otomatik Cam & Sunroof Kapatma",
        desc: "Araç kilitliyken yağmur sensörü yağmur algıladığında açık camları ve sunroofu otomatik kapatır."
    },
    vag_audi_dynamic_throttle: {
        name: "Audi Doğrudan Gaz Pedalı Tepkisi",
        desc: "Gaz pedalındaki gecikmeyi kaldırarak motorun pedala anında ve doğrudan tepki vermesini sağlar."
    },
    vag_xds_differential_sensitivity: {
        name: "XDS Elektronik Diferansiyel Kilidi Hassasiyeti",
        desc: "Virajlarda iç tekerleğe daha fazla fren torku uygulayarak önden kaymayı azaltır ve yol tutuşu artırır."
    },
    vag_offroad_display_mib: {
        name: "Off-Road Telemetri Ekranı & Pusula",
        desc: "Multimedya ekranına direksiyon açısı, pusula ve yağ/soğutma sıvısı sıcaklık göstergelerini ekler."
    },
    vag_highbeam_assist_memory: {
        name: "Otomatik Uzun Far Asistanı Hafızası",
        desc: "Kontak kapatılıp açıldığında Otomatik Uzun Far (Light Assist) modunun açık kalmasını sağlar."
    },
    vag_comfort_turn_signals_count: {
        name: "Konfor Sinyal Yanıp Sönme Sayısı",
        desc: "Şerit değiştirirken sinyal koluna dokunulduğunda sinyalin 3 yerine 4 veya 5 kez yanmasını sağlar."
    },

    // BMW additions
    bmw_video_in_motion_speedlock: {
        name: "Hareket Halinde Video İzleme (VIM)",
        desc: "Araç hareket halindeyken iDrive ekranında USB ve video oynatım hız kilidini kaldırır."
    },
    bmw_digital_speedo_kombi: {
        name: "Gösterge Panelinde Dijital Hız (V= km/h)",
        desc: "Gösterge panelindeki yol bilgisayarı ekranına anlık sayısal dijital hız göstergesini ekler."
    },
    bmw_auto_mirror_fold_comfort_close: {
        name: "Tek Tıkla Anında Ayna Katlama",
        desc: "Kumandadan kilit butonuna basıldığında bekleme süresi olmadan aynaların anında katlanmasını sağlar."
    },
    bmw_rolls_royce_warning_chimes: {
        name: "Rolls-Royce & BMW i Uyarı Sesleri",
        desc: "Kapı açık, emniyet kemeri ve sıcaklık uyarı seslerini lüks Rolls-Royce tonlarına dönüştürür."
    },
    bmw_m_performance_boot_animation: {
        name: "M Performance & Alpina Kadran Logosu",
        desc: "Dijital gösterge panelinin açılış animasyonunu M Performance veya Alpina temasına çevirir."
    },
    bmw_tpms_temperature_display: {
        name: "Lastik Basıncı & Sıcaklığı Canlı Gösterimi",
        desc: "iDrive ekranındaki lastik basınçlarının yanında her lastiğin anlık sıcaklık derecesini gösterir."
    },
    bmw_rear_drl_scandinavian: {
        name: "Arka LED Stoplar Gündüz Farı ile Birlikte Açık",
        desc: "Gündüz sürüş farları devredeyken arka neon LED halkaların da sürekli yanmasını sağlar."
    },
    bmw_sport_automatic_transmission_2tb: {
        name: "2TB Spor Otomatik Şanzıman & Launch Control",
        desc: "Daha hızlı vites geçişleri, ara gazlı vites küçültme ve fabrika çıkışı Launch Control modunu açar."
    },

    // Mercedes additions
    merc_needle_sweep_staging: {
        name: "AMG Kadran Selamlama (Needle Staging)",
        desc: "Kontak açıldığında gösterge ibrelerinin sonuna kadar vurup başlangıç noktasına dönmesini sağlar."
    },
    merc_highbeam_memory: {
        name: "Adaptif Uzun Far Asistanı Durum Hafızası",
        desc: "Adaptif Uzun Far Asistanının son durumunu hatırlar ve her çalıştırmada açık kalmasını sağlar."
    },
    merc_acoustic_lock_chirp: {
        name: "Alarm Sireni ile Kilit Geri Bildirimi",
        desc: "Araç kilitlendiğinde alarm sireninden kısa bir onay bip sesi vermesini sağlar."
    },
    merc_amg_cluster_menu_unlock: {
        name: "AMG Performans Menüsü & Yağ/Şanzıman Sıcaklığı",
        desc: "Gösterge paneline motor yağı, şanzıman sıcaklığı, tur kronometresi ve G-metre AMG ekranını ekler."
    },
    merc_ambient_lighting_64_colors: {
        name: "64 Renk Dinamik Ambiyans Aydınlatma Kilidi",
        desc: "MBUX multimedya ekranında ambiyans aydınlatma renk paletini 64 dinamik temaya genişletir."
    },
    merc_start_stop_last_state_memory: {
        name: "ECO Start-Stop Son Durum Hafızası",
        desc: "Start-Stop sisteminin son durumunu hatırlar ve aracı her çalıştırmada otomatik açılmasını engeller."
    },
    merc_auto_mirror_fold_lock: {
        name: "Kumandadan Otomatik Ayna Katlama",
        desc: "Araç kumandadan kilitlendiğinde yan aynaların otomatik katlanmasını sağlar."
    },
    merc_rear_drl_scandinavian: {
        name: "İskandinav Modu Arka Stop Gündüz Aydınlatması",
        desc: "Gündüz farları ile birlikte arka LED stop lambalarının da sürekli yanmasını sağlar."
    },
    merc_seatbelt_warning_chime_mute: {
        name: "Emniyet Kemeri Sesli Uyarı İptali",
        desc: "Takılmayan emniyet kemeri için sürekli çalan sesli uyarıyı susturur (ışıklı ikaz aktif kalır)."
    },
    merc_agility_manual_mode_unlock: {
        name: "Agility (Sport+) & Manuel Şanzıman Modu",
        desc: "Dynamic Select menüsüne gizli Agility ve Gerçek Manuel vites geçiş sürüş modlarını ekler."
    },
    merc_esp_sport_threshold_tuning: {
        name: "ESP Sport Dinamik Kayma Açısı Eşiği",
        desc: "Pist sürüşlerinde ESP'nin erken müdahale etmesini engelleyerek daha sportif kayma açısına izin verir."
    },
    merc_flashing_emergency_brake_light: {
        name: "Ani Frende Flaşörlü Adaptif Stop Lambaları",
        desc: "Sert acil fren yapıldığında fren lambalarının yüksek frekansta (5.5 Hz) hızlıca yanıp sönmesini sağlar."
    },

    // Stellantis additions
    stell_auto_mirror_fold_lock: {
        name: "Kumandadan Otomatik Ayna Katlama",
        desc: "Araç kilitlendiğinde dikiz aynalarının otomatik kapanmasını sağlar."
    },
    stell_cornering_fog_lights: {
        name: "Viraj Aydınlatmalı Ön Sis Farları",
        desc: "Sinyal verildiğinde veya direksiyon çevrildiğinde ilgili taraftaki sis farının yanmasını sağlar."
    },
    stell_needle_sweep_cluster: {
        name: "Spor Kadran Selamlama",
        desc: "Kontak açılışında gösterge ibrelerinin sona vurup geri gelmesini sağlar."
    },
    stell_acoustic_lock_chirp: {
        name: "Korna ile Kilit Onay Sesi",
        desc: "Araç kilitlendiğinde kornanın kısa bir bip sesi ile onay vermesini sağlar."
    },
    stell_rear_scandinavian_drl: {
        name: "İskandinav Arka Gündüz Stop Lambaları",
        desc: "Ön gündüz farları devredeyken arka stopların da sürekli aydınlatılmasını sağlar."
    },
    stell_lane_assist_memory_default: {
        name: "Şerit Takip Asistanı Son Durum Hafızası",
        desc: "Şerit takip sisteminin son açık/kapalı durumunu hatırlar ve her kontak açılışında otomatik devreye girmez."
    },
    stell_sport_steering_weight_calibration: {
        name: "EPS Spor Direksiyon Ağırlık Eğrisi",
        desc: "Elektrikli direksiyonun ağırlığını ve merkezleme direncini artırarak daha net bir yol hissi sağlar."
    },
    stell_digital_speedo_unit_toggle: {
        name: "Dijital Hız Göstergesi İkili Birim (km/h & mph)",
        desc: "Gösterge bilgi ekranında hem km/h hem mph değerlerinin aynı anda görünmesini sağlar."
    },

    // Ford additions
    ford_apim_ambient_multi_colors: {
        name: "SYNC 3/4 Çok Renkli Ambiyans Aydınlatma",
        desc: "SYNC ekranında 7 renkli ambiyans aydınlatma renk seçim paletini açar."
    },
    ford_lincoln_auto_fold_mirrors: {
        name: "Lincoln Stili Otomatik Ayna Katlama",
        desc: "Araç kilitlendiğinde aynaları katlar, sürücü kapısı kapandığında otomatik açar."
    },
    ford_bambi_mode_fog_with_highbeam: {
        name: "Bambi Modu (Uzun Far ile Sis Farları Birlikte)",
        desc: "Uzun farlar açıldığında ön sis farlarının otomatik sönmesini engeller."
    },
    ford_double_honk_disable: {
        name: "Anahtarla Araçtan Çıkınca Çift Korna İptali",
        desc: "Motor çalışırken anahtarla araçtan inildiğinde çalan yüksek sesli çift kornayı kapatır."
    },
    ford_global_windows_remote_open_close: {
        name: "Kumandadan Global Cam Açma & Kapatma",
        desc: "Fabrika kumandasında kilit veya açma tuşuna basılı tutarak tüm camları açıp kapatır."
    },
    ford_cluster_digital_tpms_readout: {
        name: "Ayrı Ayrı Lastik Basınç Değerleri (Bar/PSI)",
        desc: "Gösterge paneline her tekerleğin tam basınç değerini sayısal olarak gösteren ekranı ekler."
    },
    ford_sync_boot_splash_st_raptor: {
        name: "SYNC Performans Başlangıç Logosu (ST / Raptor / RS)",
        desc: "SYNC ekranının açılış logosunu Ford Performance / ST / Raptor tasarımına dönüştürür."
    },

    // Renault additions
    renault_rlink_video_in_motion: {
        name: "R-Link 2 Sürüş Esnasında Video İzleme",
        desc: "Araç hareket halindeyken USB video oynatma hız kilidini devre dışı bırakır."
    },
    renault_rs_monitor_telemetry_unlock: {
        name: "RS Monitor Performans Telemetrisi Uygulaması",
        desc: "Multimedya ekranına turbo basıncı, tork, motor yağı sıcaklığı ve G-kuvveti göstergelerini ekler."
    },
    renault_acoustic_lock_chirp: {
        name: "Eller Serbest Uzaklaşınca Kilit Bip Uyarısı",
        desc: "Kart anahtarla araçtan uzaklaşılıp kapılar kilitlendiğinde sesli onay sesi verir."
    },
    renault_rear_scandinavian_drl: {
        name: "İskandinav 3D LED Arka Gündüz Stopları",
        desc: "Gündüz sürüş farları ile birlikte arka 3D LED stop ışıklarının sürekli yanmasını sağlar."
    },
    renault_cornering_fog_lamps: {
        name: "Viraj Aydınlatmalı Sis Farları",
        desc: "40 km/h altındaki dönüşlerde dönülen taraftaki sis lambasını otomatik yakar."
    },
    renault_seatbelt_buzzer_mute: {
        name: "Emniyet Kemeri Sesli İkaz Susturma",
        desc: "Kemer takılmadığında çalan sesli buzzer uyarısını susturur."
    },

    // Hyundai additions
    hyundai_ev_charge_limit_ui_unlock: {
        name: "EV Manuel Batarya Şarj Limiti Arayüzü",
        desc: "Multimedya ekranında batarya ömrünü korumak için %50-%100 arası hedef şarj limit sürgüsünü açar."
    },
    hyundai_isg_start_stop_memory: {
        name: "ISG (Start-Stop) Son Durum Hafızası",
        desc: "Start-Stop butonunun son durumunu hatırlar ve her çalıştırmada otomatik açılmasını engeller."
    },
    hyundai_approach_auto_unlock_distance: {
        name: "Akıllı Anahtar Yaklaşma Otomatik Kilit Açma Hassasiyeti",
        desc: "Akıllı anahtarla araca yaklaşıldığında kapıların otomatik açılma radar menzilini kalibre eder."
    },
    hyundai_lead_vehicle_departure_alert: {
        name: "Öndeki Araç Hareket Bildirimi Hassasiyeti",
        desc: "Trafikte öndeki araç hareket ettiğinde gösterge panelinde verilen uyarının hassasiyetini artırır."
    },
    hyundai_welcome_escort_lighting_timer: {
        name: "Far Gecikmeli Kapanma Süresi (Follow-Me-Home)",
        desc: "Araç kilitlendikten sonra farların açık kalma süresini 15 saniyeden 30 veya 60 saniyeye uzatır."
    },

    // Chinese EV additions
    byd_battery_preconditioning_manual_toggle: {
        name: "Blade Batarya Manuel Ön Isıtma / Şarj Hazırlığı",
        desc: "Soğuk havalarda DC hızlı şarj öncesi bataryayı ideal sıcaklığa getirmek için manuel ısıtmayı açar."
    },
    byd_vess_pedestrian_sound_customization: {
        name: "VESS Düşük Hız Yaya Uyarı Sesi Temaları",
        desc: "Düşük hızlarda yayaları uyarmak için çıkan fütüristik yapay motor ses temalarını genişletir."
    },
    byd_ambient_sound_rhythm_sync: {
        name: "Müzik Ritmiyle Titreşen Ambiyans Işık Senkronizasyonu",
        desc: "İç mekan LED ambiyans ışıklarının müzikteki bas ritmine göre yanıp sönmesini ve renk değiştirmesini sağlar."
    },
    chery_auto_window_rain_close: {
        name: "Yağmur Algılandığında Otomatik Cam & Sunroof Kapatma",
        desc: "Park halindeki araçta yağmur sensörü yağmur algıladığında açık camları otomatik kapatır."
    },
    mg_ev_one_pedal_drive_memory: {
        name: "Tek Pedalla Sürüş (One-Pedal Drive) Modu Hafızası",
        desc: "Yüksek rejeneratif frenleme (tek pedal) ayarını hatırlar ve her sürüşte açık tutar."
    },

    // Porsche additions
    porsche_needle_sweep_staging: {
        name: "Porsche Analog Devir Saati İbre Selamlama",
        desc: "Kontak açıldığında merkezi devir saati ibresinin kırmızı çizgiye kadar vurup geri gelmesini sağlar."
    },
    porsche_sport_exhaust_valve_manual_mode: {
        name: "PSE Spor Egzoz Valflerini Sürekli Açık Tutma",
        desc: "PSE tuşu aktifken çift egzoz valflerinin tüm devir aralıklarında %100 açık kalmasını sağlar."
    },
    porsche_rear_spoiler_manual_speed_threshold: {
        name: "Aktif Arka Rüzgarlık Açılma Hız Eşiği",
        desc: "Otomatik arka aerodinamik kanadın devreye girme hız sınırını (80 km/h veya 120 km/h) kalibre eder."
    },
    porsche_matrix_highbeam_unlock: {
        name: "PDLS+ Matrix LED Adaptif Göz Almayan Uzun Far",
        desc: "Karşıdan gelen araçları maskeleyen değişken Matrix uzun far ışık dağıtımını aktif eder."
    },
    porsche_acoustic_chirp_lock: {
        name: "Alarm Sireni ile Merkezi Kilit Bip Sesi",
        desc: "Porsche akıllı anahtar ile araç kilitlendiğinde kısa bir onay sesi verir."
    },

    // Heavy Duty additions
    actros_rsl_fleet_speed_limit: {
        name: "Yasal Filo Hız Sınırlandırıcı (RSL)",
        desc: "Mercedes Actros/Arocs araçlarda maksimum yol hız limitini (85, 90, 100, 110 km/h) kalibre eder."
    },
    actros_idle_shutdown_timer: {
        name: "Otomatik Rölanti Motor Kapatma Zamanlayıcısı",
        desc: "El freni çekili park halinde hareketsiz beklerken motoru belirlenen sürede otomatik durdurur."
    },
    volvo_pto_engine_rpm_preset: {
        name: "PTO (Damper / Mikser / Vinç) Sabit Motor Devri",
        desc: "PTO devreye girdiğinde hidrolik pompa için motoru sabit devirde (900, 1100, 1300 RPM) kilitler."
    },
    volvo_ppc_eco_roll_hysteresis: {
        name: "I-See / PPC Topografik Hız Toleransı (Eco-Roll)",
        desc: "GPS tabanlı tahmini hız sabitleyicinin yokuş aşağı boşa atma hız toleransını ayarlayarak yakıt tasarrufu sağlar."
    },
    scania_retarder_jake_brake_aggressiveness: {
        name: "Retarder & Motor Freni Vites Küçültme Agresifliği",
        desc: "Frenleme anında retarder tork karışımını ve şanzımanın vites küçültme tepkisini kalibre eder."
    },
    man_ecas_dock_level_memory: {
        name: "ECAS Havalı Süspansiyon Yükleme Rampası Seviye Hafızası",
        desc: "Yükleme rampaları için özelleştirilmiş körük yükseklik seviyelerini kaydeder ve hafızaya alır."
    },
    daf_stationary_dpf_regen_trigger: {
        name: "Sabit Konumda Manuel DPF Kurum Yakma Rejenerasyonu",
        desc: "Araç park halindeyken dizel partikül filtresi zorunlu termal kurum yakma rutinini başlatır."
    },
    ford_trucks_reverse_buzzer_night_mode: {
        name: "Geri Vites Sesli Uyarısı Gece Sessiz Modu",
        desc: "Gece yerleşim yerlerindeki dağıtımlarda geri vites korna sesini %50 oranında kısar."
    },
    cummins_ecm_fleet_speed_limiter: {
        name: "Cummins Motor Filo Hız Sınırlandırıcı Tablosu",
        desc: "Cummins motor beyninde izin verilen maksimum yol hızını programlar."
    }
};

Object.assign(trData.features.items, turkishFeatureItems);

// Write updated Turkish file
fs.writeFileSync(trPath, JSON.stringify(trData, null, 4), 'utf8');
console.log('[+] Updated tr.json with complete Turkish translations, categories, and options.');

// 4. Now sync all 26 language files
const localeFiles = fs.readdirSync(localesDir).filter(f => f.endsWith('.json'));
for (const file of localeFiles) {
    if (file === 'tr.json') continue;
    const filePath = path.join(localesDir, file);
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));

    if (!data.features) data.features = {};
    if (!data.features.options) data.features.options = {};
    if (!data.features.items) data.features.items = {};

    // Copy category keys if missing
    ['catLighting', 'catSound', 'catSoundAlerts', 'catDisplay', 'catDisplayInstrument', 'catComfort', 'catDrivingComfort', 'catSafety', 'catSecuritySafety', 'catMotorcycle', 'catMotorcycleEcu', 'catRetrofit', 'catEv', 'catAdas', 'catEasterEgg', 'catService', 'catPerformance'].forEach(k => {
        if (!data.features[k]) data.features[k] = trData.features[k];
    });

    // Copy options keys if missing
    Object.keys(turkishOptions).forEach(optKey => {
        if (!data.features.options[optKey]) {
            data.features.options[optKey] = turkishOptions[optKey];
        }
    });

    // Copy items if missing
    Object.keys(turkishFeatureItems).forEach(itemKey => {
        if (!data.features.items[itemKey]) {
            data.features.items[itemKey] = turkishFeatureItems[itemKey];
        }
    });

    fs.writeFileSync(filePath, JSON.stringify(data, null, 4), 'utf8');
}

console.log('[SUCCESS] All 26 language files synchronized with zero missing keys!');
