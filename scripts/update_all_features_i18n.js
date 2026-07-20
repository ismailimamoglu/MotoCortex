const fs = require('fs');
const path = require('path');

const localesDir = path.join(__dirname, '../src/locales');

const featureItemsTR = {
    vag_staging_needle_sweep: {
        name: "Kadran Selamlama (Staging / Needle Sweep)",
        desc: "Kontak açıldığında gösterge ibrelerinin sona vurup geri gelmesini sağlar."
    },
    vag_acoustic_lock_confirmation: {
        name: "Korna ile Kilit Geri Bildirimi",
        desc: "Araç kumandadan kilitlendiğinde kornanın kısa bip uyarısı vermesini sağlar."
    },
    vag_american_parking_lights: {
        name: "Amerikan Park Sinyalleri",
        desc: "Ön sinyal lambalarının parklar açıkken %20 parlaklıkta sabit yanmasını sağlar."
    },
    vag_drl_menu_toggle: {
        name: "Gündüz Farı Menüsü (DRL Toggle)",
        desc: "Gündüz sürüş farlarının gösterge/multimedya ekranından açılıp kapatılmasını sağlar."
    },
    vag_tear_wiping: {
        name: "Silecek Son Damla Silme (Tear Wiping)",
        desc: "Cam yıkama çalıştırıldıktan 5 saniye sonra sileceklerin akan son damlayı silmesini sağlar."
    },
    vag_emergency_brake_flashing: {
        name: "Ani Frende Flaşör Yakma",
        desc: "Sert fren yapıldığında stop lambalarının ve dörtlülerin hızlıca flaş yapmasını sağlar."
    },
    vag_cornering_lights: {
        name: "Viraj Aydınlatma Sis Farları",
        desc: "Direksiyon çevrilen taraftaki sis farının viraj aydınlatması olarak yanmasını sağlar."
    },
    vag_comfort_mirror_folding: {
        name: "Kumandadan Ayna Katlama",
        desc: "Kumandadan kilit butonuna basılı tutulduğunda dikiz aynalarının otomatik katlanmasını sağlar."
    },
    vag_lap_timer: {
        name: "Pist Tur Sayacı (Lap Timer)",
        desc: "Gösterge bilgi ekranına tur süresi ölçer sekmesini ekler."
    },
    vag_refuel_quantity: {
        name: "Depo Boş Litre Göstergesi",
        desc: "Depoya tam dolum için kaç litre yakıt gerektiğini göstergede gösterir."
    },
    bmw_start_stop_memory: {
        name: "Auto Start-Stop Hafıza Modu",
        desc: "Auto Start-Stop sisteminin araç kapatıldığındaki son durumunu (Açık/Kapalı) hatırlamasını sağlar."
    },
    bmw_digital_speedometer: {
        name: "Dijital Hız Göstergesi",
        desc: "Gösterge paneli bilgi ekranına anlık dijital hız seçeneğini ekler."
    },
    bmw_sport_displays: {
        name: "Spor Göstergeler (HP & Nm Kadranı)",
        desc: "iDrive multimedya ekranına anlık beygir gücü (HP) ve tork (Nm) kadranlarını ekler."
    },
    bmw_acoustic_lock_sound: {
        name: "Kilit Sesli Uyarısı (Acoustic Lock)",
        desc: "Araç kilitlendiğinde veya açıldığında fabrika alarmından kısa onay bipleri verir."
    },
    bmw_mirror_fold_delay_zero: {
        name: "Gecikmesiz Ayna Katlama",
        desc: "Kumandadan kilit butonuna basıldığı an bekleme süresi olmadan (0.0s) aynaları katlar."
    },
    bmw_tpms_tire_temperature: {
        name: "Lastik Sıcaklık Ekranı",
        desc: "Lastik basınç kontrol ekranında basınç değerine ek olarak anlık lastik sıcaklığını da gösterir."
    },
    renault_trip_computer_enable: {
        name: "Yol Bilgisayarı Aktifleştirme",
        desc: "Yol bilgisayarı kapalı gelen araçlarda ortalama tüketim ve menzil ekranlarını açar."
    },
    renault_external_temp_display: {
        name: "Dış Sıcaklık Göstergesi",
        desc: "Gösterge ekranında dış hava sıcaklığı göstergesini aktif eder."
    },
    renault_automatic_tailgate: {
        name: "Kumandadan Bagaj Kapağı Açma",
        desc: "Uzaktan kumanda üzerindeki bagaj butonuna tıklandığında kapağı tam kilit açarak bırakır."
    },
    renault_alarm_chirp: {
        name: "Korna / Siren Kilit Onayı",
        desc: "Araç kilitlendiğinde kornadan onay sesi verir."
    },
    renault_shift_indicator: {
        name: "Vites Değişim İkaz Işığı",
        desc: "Ekonomik sürüş için göstergede yukarı/aşağı vites değiştirme oklarını aktifleştirir."
    },
    ford_double_horn_honk_disable: {
        name: "Motor Çalışırken Çift Korna İptali",
        desc: "Motor çalışırken anahtarla araçtan inip kapı kapatıldığında çalan rahatsız edici çift kornayı kapatır."
    },
    ford_auto_door_locking: {
        name: "20 km/h Hızda Otomatik Kapı Kilitleme",
        desc: "Araç hızı 20 km/h üzerine çıktığında tüm kapıların otomatik kilitlenmesini sağlar."
    },
    ford_tpms_psi_display: {
        name: "Sayısal Lastik Basınç Ekranı",
        desc: "Gösterge ekranında her lastiğin anlık bar/psi değerini sayısal olarak gösterir."
    },
    ford_sync_climate_screen: {
        name: "SYNC Ekranında Klima Kontrolü",
        desc: "SYNC multimedya ekranına klima ve koltuk ısıtma kontrol sekmesini ekler."
    },
    stellantis_power_windows_remote: {
        name: "Kumandadan Cam Otomatik Kapatma/Açma",
        desc: "Uzaktan kumanda kilit butonuna basılı tutulduğunda açık camları otomatik kapatır."
    },
    stellantis_cornering_fogs: {
        name: "Viraj Sis Farları",
        desc: "Düşük hızlarda dönüş yönündeki sis farını yakarak viraj aydınlatması sağlar."
    }
};

const featureItemsEN = {
    vag_staging_needle_sweep: {
        name: "Gauge Staging / Needle Sweep",
        desc: "Sweeps instrument needles to maximum upon ignition start."
    },
    vag_acoustic_lock_confirmation: {
        name: "Acoustic Lock Confirmation Chirp",
        desc: "Emits a short horn confirmation chirp upon key fob locking."
    },
    vag_american_parking_lights: {
        name: "US Style Parking Lights",
        desc: "Illuminates front turn signals continuously at 20% dimming with parking lights."
    },
    vag_drl_menu_toggle: {
        name: "Daytime Running Lights (DRL) Menu Toggle",
        desc: "Enables DRL ON/OFF checkbox in infotainment vehicle settings menu."
    },
    vag_tear_wiping: {
        name: "Windshield Tear Wiping",
        desc: "Executes an additional final wipe 5 seconds after windshield washer use."
    },
    vag_emergency_brake_flashing: {
        name: "Emergency Brake Hazard Flashing",
        desc: "Rapidly flashes brake lights and hazards under heavy emergency braking."
    },
    vag_cornering_lights: {
        name: "Cornering Fog Lights",
        desc: "Illuminates cornering fog light on steering wheel rotation side."
    },
    vag_comfort_mirror_folding: {
        name: "Key Fob Comfort Mirror Folding",
        desc: "Automatically folds side mirrors when lock button is held on key fob."
    },
    vag_lap_timer: {
        name: "Instrument Cluster Lap Timer",
        desc: "Unlocks track lap timer display tab in instrument cluster screen."
    },
    vag_refuel_quantity: {
        name: "Refuel Quantity Display",
        desc: "Displays exact volume in liters required for a full fuel refuel."
    },
    bmw_start_stop_memory: {
        name: "Auto Start-Stop Memory Mode",
        desc: "Remembers last Auto Start-Stop state (OFF/ON) across vehicle restarts."
    },
    bmw_digital_speedometer: {
        name: "Digital Speedometer Display",
        desc: "Adds instant digital speed numerical display option to cluster screen."
    },
    bmw_sport_displays: {
        name: "Sport Displays (HP & Nm Gauges)",
        desc: "Enables live horsepower and torque dynamic dials in iDrive screen."
    },
    bmw_acoustic_lock_sound: {
        name: "Acoustic Lock/Unlock Sound",
        desc: "Emits alarm system chirps when locking or unlocking the vehicle."
    },
    bmw_mirror_fold_delay_zero: {
        name: "Instant Mirror Folding (0.0s Delay)",
        desc: "Folds side mirrors instantly upon lock button press without holding delay."
    },
    bmw_tpms_tire_temperature: {
        name: "Tire Pressure & Temperature Display",
        desc: "Displays real-time tire temperature alongside pressure in TPMS screen."
    },
    renault_trip_computer_enable: {
        name: "On-Board Trip Computer Enable",
        desc: "Unlocks average fuel consumption and range trip computer displays."
    },
    renault_external_temp_display: {
        name: "External Temperature Display",
        desc: "Enables ambient outdoor temperature reading in instrument cluster."
    },
    renault_automatic_tailgate: {
        name: "Key Fob Trunk Release",
        desc: "Fully pops trunk latch mechanism upon holding key fob trunk button."
    },
    renault_alarm_chirp: {
        name: "Alarm Lock Confirmation Chirp",
        desc: "Sounds horn confirmation chirp upon vehicle door locking."
    },
    renault_shift_indicator: {
        name: "Gear Shift Indicator (GSI)",
        desc: "Activates eco-driving shift UP/DOWN arrows in instrument cluster."
    },
    ford_double_horn_honk_disable: {
        name: "Disable Double Horn Honk on Door Close",
        desc: "Disables double horn honk when closing door with engine running."
    },
    ford_auto_door_locking: {
        name: "Auto Door Locking at 20 km/h",
        desc: "Automatically locks all doors when vehicle speed exceeds 20 km/h."
    },
    ford_tpms_psi_display: {
        name: "Numerical Tire Pressure Display",
        desc: "Displays exact numerical PSI/BAR pressure per tire in instrument screen."
    },
    ford_sync_climate_screen: {
        name: "SYNC Screen Climate Controls",
        desc: "Adds climate control and seat heating touchscreen menu to SYNC display."
    },
    stellantis_power_windows_remote: {
        name: "Key Fob Remote Window Roll Up/Down",
        desc: "Rolls up or down all power windows when holding lock/unlock buttons."
    },
    stellantis_cornering_fogs: {
        name: "Cornering Fog Lights Enable",
        desc: "Illuminates cornering fog lamp during low-speed turns."
    }
};

const commonUiEN = {
    title: "UNLOCK HIDDEN FEATURES & UDS CODING",
    subTitle: "ISO 14229 UDS Long Coding & Adaptation Engine",
    batteryVoltage: "BATTERY VOLTAGE",
    voltageReady: "✓ Safe (Ready for ECU Coding Write)",
    voltageLocked: "⚠️ Low Voltage (Coding Locked, Read Active)",
    locked: "LOCKED",
    ready: "READY",
    codeBtn: "CODE",
    removeBtn: "REMOVE",
    unsupportedTitle: "Vehicle Not Supported",
    unsupportedMsg: "This feature is not supported by your vehicle's ECU hardware or software version.",
    safetyAlertTitle: "⚠️ Low Battery Voltage Alert",
    safetyAlertMsg: "Minimum 12.2V battery voltage required for coding.\nPlease connect a charger or start the engine."
};

const commonUiTR = {
    title: "GİZLİ ÖZELLİK AÇ & UDS KODLAMA",
    subTitle: "ISO 14229 UDS Long Coding & Adaptasyon Motoru",
    batteryVoltage: "AKÜ VOLTAJI",
    voltageReady: "✓ Güvenli (ECU Kodlama Yazımına Hazır)",
    voltageLocked: "⚠️ Düşük Voltaj (Yazma Kilitli, Okuma Aktif)",
    locked: "KİLİTLİ",
    ready: "HAZIR",
    codeBtn: "KODLA",
    removeBtn: "KALDIR",
    unsupportedTitle: "Araç Desteklemiyor",
    unsupportedMsg: "Bu özellik aracınızın ECU donanımı veya yazılım versiyonu tarafından desteklenmemektedir.",
    safetyAlertTitle: "⚠️ Düşük Akü Voltaj Uyarısı",
    safetyAlertMsg: "Kodlama için minimum 12.2V akü voltajı gereklidir.\nLütfen şarj cihazı bağlayın veya motoru çalıştırın."
};

// 1. Update en.json
const enFile = path.join(localesDir, 'en.json');
const enData = JSON.parse(fs.readFileSync(enFile, 'utf8'));
enData.features = enData.features || {};
Object.assign(enData.features, commonUiEN);
enData.features.items = featureItemsEN;
fs.writeFileSync(enFile, JSON.stringify(enData, null, 4) + '\n', 'utf8');

// 2. Update tr.json
const trFile = path.join(localesDir, 'tr.json');
const trData = JSON.parse(fs.readFileSync(trFile, 'utf8'));
trData.features = trData.features || {};
Object.assign(trData.features, commonUiTR);
trData.features.items = featureItemsTR;
fs.writeFileSync(trFile, JSON.stringify(trData, null, 4) + '\n', 'utf8');

console.log('Updated features section in en.json and tr.json successfully.');
