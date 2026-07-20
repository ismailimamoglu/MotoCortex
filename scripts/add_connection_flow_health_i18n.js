/**
 * add_connection_flow_health_i18n.js
 *
 * Synchronizes health/sensor/connection/common translation keys across all 26 locale files.
 *
 * RULE (language-sync.md Madde 6 — Translation Quality Gate):
 *   - Each language gets its own native translation.
 *   - Languages WITHOUT a translation object are SKIPPED (not filled with English).
 *   - i18next's fallbackLng:'en' handles missing keys at runtime — no silent English copies.
 */

const fs   = require('fs');
const path = require('path');

// ─────────────────────────────────────────────────────────────────────────────
// TRANSLATION MAP — 26 languages with native content
// ─────────────────────────────────────────────────────────────────────────────
const newTranslations = {

  // ── English ──────────────────────────────────────────────────────────────
  en: {
    common: {
      supported: "Supported", copied: "Copied", cancelBtn: "Cancel",
      retry: "RETRY CONNECTION", changeType: "Change Connection Type"
    },
    connection: {
      btDisabled: "Bluetooth Disabled",
      btDisabledDesc: "Please enable Bluetooth to scan for OBD2 adapters.",
      btDescIos: "Connect using BLE OBD2 adaptors (Veepeak, vLinker).",
      btDescAndroid: "Connect via Classic Bluetooth or BLE adapters.",
      wifiDesc: "Connect to Wi-Fi adapters (typically 192.168.0.10).",
      wifiGuide: "To connect to your Wi-Fi adapter, go to your phone's Wi-Fi settings and choose the OBD adapter network (e.g. OBDII, V-LINK). Then return here.",
      openWifiSettings: "OPEN WI-FI SETTINGS", connectWifi: "CONNECT VIA WI-FI",
      pairRequired: "Pairing OBD2 Device",
      pairRequiredDesc: "Android may request pairing because you are connecting for the first time. The pairing PIN is usually as follows:",
      pairNow: "PAIR & CONNECT",
      pairingFailed: "Pairing failed. Please pair manually in Android settings.",
      successVin: "Connection established. Vehicle profile successfully identified.",
      cloneWarning: "Incompatible Clone Adapter Detected. Advanced coding features are locked for your safety.",
      viewHealth: "OBD2 HEALTH & CAPABILITY MENU",
      statusPrompt: "Select your preferred OBD2 connection interface below.",
      foundDevices: "FOUND OBD2 DEVICES", scanDevices: "SCAN DEVICES",
      scanHintIos: "Ensure your BLE OBD2 adapter is powered on and near your iOS device.",
      scanHintAndroid: "Make sure Bluetooth is active and the adapter is ready to pair.",
      negotiating: "NEGOTIATING OBD2 HANDSHAKE", failed: "CONNECTION ATTEMPT FAILED",
      errLayer1: "Troubleshoot: Bluetooth is disabled. Please turn on Bluetooth in your device settings.",
      errLayer2: "Troubleshoot: Connection timed out. Make sure the adapter is plugged firmly into the OBD2 port and its power indicator is lit.",
      errLayer5: "Troubleshoot: OBD2 Protocol negotiation failed. Ensure your vehicle's ignition is switched to the ON position (engine running is recommended).",
      errLayer6: "Troubleshoot: Adapter connected, but vehicle ECU is not responding. Please turn the ignition ON or restart the connection.",
      errGeneric: "Troubleshoot: Please ensure the adapter has power, ignition is turned ON, and no other OBD app is open.",
      stepAdapter: "Adapter Connection & Cap Score", stepProtocol: "OBD2 Protocol Negotiation",
      stepHandshake: "ECU Communication Verification", stepStabilization: "Active Telemetry Loop Stabilization"
    },
    health: {
      titleMenu: "OBD2 HEALTH & CAPABILITY", adapterQuality: "ADAPTER QUALITY & PERFORMANCE",
      excellent: "EXCELLENT (ORIGINAL)", good: "GOOD (STANDARD)", clone: "INCOMPATIBLE / CLONE",
      firmware: "Firmware Version:", capScore: "Capability Score", latency: "Latency (RTT)",
      protocol: "Active Protocol", featureSupport: "APPLICATION FEATURE MATRIX",
      matrixReadCodes: "Read & Clear Fault Codes", matrixLiveSensors: "Live Sensor Monitoring (Basic)",
      matrixBattery: "Battery / Voltage Test", matrixHighSpeed: "High-Speed Telemetry (20Hz)",
      matrixCoding: "ECU Coding & Adaptations", active: "Active", degraded: "Degraded (Slow RTT)",
      locked: "Locked (Safe Mode)", warning: "SECURITY LOCK:",
      lockExplain: "Your adapter has been flagged as a clone/fake chip. Because clone adapters lack timing precision and can brick the vehicle during write operations, coding and adaptation features are locked. Please obtain an original ELM327 v2.1 or vLinker device for safe coding.",
      vehiclePids: "VEHICLE SENSOR CHECKLIST",
      checklistPrompt: "The standard sensor parameters (PIDs) supported by your vehicle's ECU are listed below. Sensors without a checkmark are not reported by your vehicle.",
      supportedBadge: "✓ SUPPORTED", unsupportedBadge: "❌ UNSUPPORTED"
    },
    sensor: {
      rpm: "Engine RPM (RPM)", speed: "Vehicle Speed (Speed)", coolant: "Engine Coolant Temp",
      throttle: "Throttle Position", voltage: "Control Module Voltage", maf: "MAF Air Flow Rate",
      iat: "Intake Air Temp", load: "Calculated Engine Load", fuel: "Fuel Level Input",
      oilTemp: "Engine Oil Temp"
    }
  },

  // ── Turkish ───────────────────────────────────────────────────────────────
  tr: {
    common: {
      supported: "Destekleniyor", copied: "Kopyalandı", cancelBtn: "Vazgeç",
      retry: "BAĞLANTIYI YENİDEN DENE", changeType: "Bağlantı Türünü Değiştir"
    },
    connection: {
      btDisabled: "Bluetooth Kapalı",
      btDisabledDesc: "OBD2 adaptörlerini taramak için lütfen Bluetooth'u açın.",
      btDescIos: "BLE OBD2 adaptörlerini kullanarak bağlanın (Veepeak, vLinker).",
      btDescAndroid: "Klasik Bluetooth veya BLE adaptörleri üzerinden bağlanın.",
      wifiDesc: "Wi-Fi adaptörlerine bağlanın (genellikle 192.168.0.10).",
      wifiGuide: "Wi-Fi adaptörünüze bağlanmak için telefonunuzun Wi-Fi ayarlarına gidin ve OBD adaptör ağını (örn. OBDII, V-LINK) seçin. Ardından buraya dönün.",
      openWifiSettings: "WI-FI AYARLARINI AÇ", connectWifi: "WI-FI İLE BAĞLAN",
      pairRequired: "OBD2 Cihazı Eşleştiriliyor",
      pairRequiredDesc: "Android işletim sistemi bu cihazla ilk defa bağlandığınız için eşleştirme talep edebilir. Eşleştirme şifresi genellikle aşağıdaki gibidir:",
      pairNow: "EŞLEŞTİR VE BAĞLAN",
      pairingFailed: "Eşleştirme başarısız oldu. Lütfen Android ayarlarından manuel olarak eşleştirin.",
      successVin: "Bağlantı sağlandı. Araç profili başarıyla tanımlandı.",
      cloneWarning: "Uyumsuz Klon Adaptör Algılandı. Gelişmiş kodlama işlemleri güvenliğiniz için kilitlenmiştir.",
      viewHealth: "OBD2 SAĞLIK & YETENEK MENÜSÜ",
      statusPrompt: "Tercih ettiğiniz OBD2 bağlantı arayüzünü aşağıdan seçin.",
      foundDevices: "BULUNAN OBD2 CİHAZLARI", scanDevices: "CİHAZ TARA",
      scanHintIos: "BLE OBD2 adaptörünüzün açık ve iOS cihazınızın yakınında olduğundan emin olun.",
      scanHintAndroid: "Bluetooth'un aktif olduğundan ve adaptörün eşleşmeye hazır olduğundan emin olun.",
      negotiating: "OBD2 BAĞLANTI DÖNGÜSÜ YAPILANDIRILIYOR", failed: "BAĞLANTI GİRİŞİMİ BAŞARISIZ",
      errLayer1: "Çözüm: Bluetooth kapalı. Lütfen cihaz ayarlarınızdan Bluetooth'u açın.",
      errLayer2: "Çözüm: Bağlantı zaman aşımına uğradı. Adaptörün OBD2 portuna tam oturduğundan ve güç ışığının yandığından emin olun.",
      errLayer5: "Çözüm: OBD2 Protokolü çözümlenemedi. Aracınızın kontağının açık (ON) konumda olduğundan emin olun (motorun çalışır durumda olması önerilir).",
      errLayer6: "Çözüm: Adaptöre bağlandık ancak araç beyni (ECU) yanıt vermiyor. Lütfen kontağı açın veya bağlantıyı yeniden başlatın.",
      errGeneric: "Çözüm: Lütfen adaptörde güç olduğundan, kontağın açık olduğundan ve başka hiçbir OBD uygulamasının açık olmadığından emin olun.",
      stepAdapter: "Adaptör Bağlantısı ve Yetenek Skoru", stepProtocol: "OBD2 Protokol Anlaşması",
      stepHandshake: "ECU İletişim Doğrulaması", stepStabilization: "Aktif Telemetri Döngüsü Sabitlemesi"
    },
    health: {
      titleMenu: "OBD2 SAĞLIK & YETENEK", adapterQuality: "ADAPTÖR KALİTESİ & PERFORMANSI",
      excellent: "MÜKEMMEL (ORİJİNAL)", good: "İYİ (STANDART)", clone: "UYUMSUZ / KLON",
      firmware: "Yazılım Sürümü:", capScore: "Yetenek Skoru", latency: "Gecikme Süresi",
      protocol: "Aktif Protokol", featureSupport: "UYGULAMA ÖZELLİK MATRİSİ",
      matrixReadCodes: "Hata Kodu Okuma & Silme", matrixLiveSensors: "Canlı Sensör İzleme (Temel)",
      matrixBattery: "Akü / Voltaj Testi", matrixHighSpeed: "Yüksek Hızlı Telemetri (20Hz)",
      matrixCoding: "ECU Kodlama & Adaptasyon", active: "Aktif", degraded: "Sınırlı (Yavaş RTT)",
      locked: "Kilitli (Güvenli Mod)", warning: "GÜVENLİK KİLİDİ:",
      lockExplain: "Adaptörünüz klon/taklit çip olarak tespit edilmiştir. Klon adaptörlerdeki voltaj kararsızlığı araç beynini kilitleyebileceğinden (bricking), kodlama/adaptasyon özellikleri kilitlenmiştir. Güvenli kodlama için orijinal ELM327 v2.1 veya vLinker cihazı kullanmalısınız.",
      vehiclePids: "ARAÇ SENSÖR DESTEK LİSTESİ",
      checklistPrompt: "Aracınızın motor beyninin desteklediği standart parametreler (PID) aşağıda listelenmiştir. İşaretli olmayan sensör verileri aracınız tarafından raporlanmamaktadır.",
      supportedBadge: "✓ DESTEKLENİYOR", unsupportedBadge: "❌ DESTEKLENMİYOR"
    },
    sensor: {
      rpm: "Motor Devri (RPM)", speed: "Araç Hızı (Hız)", coolant: "Motor Sıcaklığı (Soğutma Suyu)",
      throttle: "Gaz Kelebeği Konumu", voltage: "Akü / Modül Voltajı", maf: "Hava Akış Hızı (MAF)",
      iat: "Emme Havası Sıcaklığı", load: "Hesaplanan Motor Yükü", fuel: "Yakıt Seviyesi",
      oilTemp: "Motor Yağ Sıcaklığı"
    }
  },

  // ── Arabic ────────────────────────────────────────────────────────────────
  ar: {
    common: {
      supported: "مدعوم", copied: "تم النسخ", cancelBtn: "إلغاء",
      retry: "إعادة محاولة الاتصال", changeType: "تغيير نوع الاتصال"
    },
    connection: {
      btDisabled: "البلوتوث معطل",
      btDisabledDesc: "يرجى تمكين البلوتوث للبحث عن محولات OBD2.",
      btDescIos: "الاتصال باستخدام محولات BLE OBD2 (Veepeak ، vLinker).",
      btDescAndroid: "الاتصال عبر محولات البلوتوث الكلاسيكي أو BLE.",
      wifiDesc: "الاتصال بمحولات Wi-Fi (عادةً 192.168.0.10).",
      wifiGuide: "للاتصال بمحول Wi-Fi الخاص بك ، انتقل إلى إعدادات Wi-Fi بهاتفك واختر شبكة محول OBD (مثل OBDII ، V-LINK). ثم عد إلى هنا.",
      openWifiSettings: "افتح إعدادات WI-FI", connectWifi: "الاتصال عبر WI-FI",
      pairRequired: "اقتران جهاز OBD2",
      pairRequiredDesc: "قد يطلب نظام Android الاقتران لأنك تتصل للمرة الأولى. عادةً ما يكون رقم تعريف الاقتران (PIN) كما يلي:",
      pairNow: "اقتران واتصال",
      pairingFailed: "فشل الاقتران. يرجى الاقتران يدويًا في إعدادات Android.",
      successVin: "تم إنشاء الاتصال. تم تحديد ملف تعريف السيارة بنجاح.",
      cloneWarning: "تم اكتشاف محول غير متوافق. ميزات الترميز المتقدمة مغلقة لسلامتك.",
      viewHealth: "قائمة صحة وقدرات OBD2",
      statusPrompt: "حدد واجهة اتصال OBD2 المفضلة لديك أدناه.",
      foundDevices: "أجهزة OBD2 المكتشفة", scanDevices: "البحث عن أجهزة",
      scanHintIos: "تأكد من تشغيل محول BLE OBD2 الخاص بك وقربه من جهاز iOS الخاص بك.",
      scanHintAndroid: "تأكد من تنشيط البلوتوث وأن المحول جاهز للاقتران.",
      negotiating: "جاري بدء اتصال OBD2", failed: "فشلت محاولة الاتصال",
      errLayer1: "استكشاف الأخطاء: البلوتوث معطل. يرجى تشغيل البلوتوث في إعدادات جهازك.",
      errLayer2: "استكشاف الأخطاء: انتهت مهلة الاتصال. تأكد من إدخال المحول بإحكام في منفذ OBD2 وإضاءة مؤشر الطاقة.",
      errLayer5: "استكشاف الأخطاء: فشل بدء بروتوكول OBD2. تأكد من تشغيل مفتاح تشغيل سيارتك إلى وضع التشغيل ON (يوصى بتشغيل المحرك).",
      errLayer6: "استكشاف الأخطاء: تم توصيل المحول ، لكن وحدة التحكم الإلكترونية في السيارة (ECU) لا تستجيب. يرجى تشغيل وضع التشغيل ON أو إعادة تشغيل الاتصال.",
      errGeneric: "استكشاف الأخطاء: يرجى التأكد من وصول الطاقة إلى المحول ، وتشغيل وضع التشغيل ON ، وعدم فتح أي تطبيق OBD آخر.",
      stepAdapter: "اتصال المحول ودرجة القدرة", stepProtocol: "تفاوض بروتوكول OBD2",
      stepHandshake: "التحقق من اتصال وحدة التحكم الإلكترونية (ECU)",
      stepStabilization: "استقرار حلقة القياس عن بعد النشطة"
    },
    health: {
      titleMenu: "صحة وقدرات OBD2", adapterQuality: "جودة وأداء المحول",
      excellent: "ممتاز (أصلي)", good: "جيد (قياسي)", clone: "غير متوافق / مقلد",
      firmware: "إصدار البرنامج الثابت:", capScore: "درجة القدرة", latency: "زمن الانتقال (RTT)",
      protocol: "البروتوكول النشط", featureSupport: "مصفوفة ميزات التطبيق",
      matrixReadCodes: "قراءة ومسح رموز الأعطال", matrixLiveSensors: "مراقبة المستشعرات الحية (أساسي)",
      matrixBattery: "اختبار البطارية / الجهد", matrixHighSpeed: "القياس عن بعد عالي السرعة (20 هرتز)",
      matrixCoding: "ترميز وتكييف وحدة التحكم الإلكترونية (ECU)", active: "نشط",
      degraded: "محدود (RTT بطيء)", locked: "مغلق (الوضع الآمن)", warning: "قفل الأمان:",
      lockExplain: "تم وضع علامة على المحول الخاص بك كرقاقة مقلدة/مزيفة. نظرًا لأن المحولات المقلدة تفتقر إلى دقة التوقيت ويمكن أن تتلف السيارة أثناء عمليات الكتابة ، فإن ميزات الترميز والتكييف مغلقة. يرجى الحصول على جهاز ELM327 v2.1 أو vLinker أصلي للترميز الآمن.",
      vehiclePids: "قائمة فحص مستشعرات السيارة",
      checklistPrompt: "معلمات المستشعر القياسية (PIDs) التي تدعمها وحدة التحكم الإلكترونية في سيارتك مدرجة أدناه. المستشعرات التي لا تحتوي على علامة اختيار لا تبلغ عنها سيارتك.",
      supportedBadge: "✓ مدعوم", unsupportedBadge: "❌ غير مدعوم"
    },
    sensor: {
      rpm: "دوران المحرك (RPM)", speed: "سرعة السيارة (Speed)", coolant: "حرارة مبرد المحرك",
      throttle: "موضع الصمام الخانق", voltage: "جهد وحدة التحكم", maf: "معدل تدفق الهواء MAF",
      iat: "درجة حرارة هواء السحب", load: "حمولة المحرك المحسوبة", fuel: "مستوى الوقود",
      oilTemp: "درجة حرارة زيت المحرك"
    }
  },

  // ── German ────────────────────────────────────────────────────────────────
  de: {
    common: {
      supported: "Unterstützt", copied: "Kopiert", cancelBtn: "Abbrechen",
      retry: "VERBINDUNG ERNEUT VERSUCHEN", changeType: "Verbindungstyp ändern"
    },
    connection: {
      btDisabled: "Bluetooth deaktiviert",
      btDisabledDesc: "Bitte aktivieren Sie Bluetooth, um nach OBD2-Adaptern zu suchen.",
      btDescIos: "Verbindung über BLE OBD2-Adapter (Veepeak, vLinker).",
      btDescAndroid: "Verbindung über Classic Bluetooth- oder BLE-Adapter.",
      wifiDesc: "Verbindung mit Wi-Fi-Adaptern (normalerweise 192.168.0.10).",
      wifiGuide: "Um eine Verbindung zu Ihrem Wi-Fi-Adapter herzustellen, gehen Sie zu den Wi-Fi-Einstellungen Ihres Telefons und wählen Sie das OBD-Adapter-Netzwerk (z. B. OBDII, V-LINK). Kehren Sie dann hierher zurück.",
      openWifiSettings: "WI-FI-EINSTELLUNGEN ÖFFNEN", connectWifi: "ÜBER WI-FI VERBINDEN",
      pairRequired: "OBD2-Gerät koppeln",
      pairRequiredDesc: "Android fordert möglicherweise eine Kopplung an, da Sie zum ersten Mal eine Verbindung herstellen. Die Kopplungs-PIN lautet normalerweise wie folgt:",
      pairNow: "KOPPELN & VERBINDEN",
      pairingFailed: "Kopplung fehlgeschlagen. Bitte koppeln Sie manuell in den Android-Einstellungen.",
      successVin: "Verbindung hergestellt. Fahrzeugprofil erfolgreich identifiziert.",
      cloneWarning: "Inkompatibler Klonadapter erkannt. Erweiterte Codierungsfunktionen sind zu Ihrer Sicherheit gesperrt.",
      viewHealth: "OBD2-GESUNDHEITS- & LEISTUNGSMENÜ",
      statusPrompt: "Wählen Sie unten Ihre bevorzugte OBD2-Verbindungsschnittstelle aus.",
      foundDevices: "GEFUNDENE OBD2-GERÄTE", scanDevices: "GERÄTE SCANNEN",
      scanHintIos: "Stellen Sie sicher, dass Ihr BLE OBD2-Adapter eingeschaltet ist und sich in der Nähe Ihres iOS-Geräts befindet.",
      scanHintAndroid: "Stellen Sie sicher, dass Bluetooth aktiv ist und der Adapter zur Kopplung bereit ist.",
      negotiating: "OBD2-HANDSHAKE WIRD AUSGEHANDELT", failed: "VERBINDUNGSVERSUCH FEHLGESCHLAGEN",
      errLayer1: "Fehlerbehebung: Bluetooth ist deaktiviert. Bitte aktivieren Sie Bluetooth in Ihren Geräteeinstellungen.",
      errLayer2: "Fehlerbehebung: Verbindungstimeout. Stellen Sie sicher, dass der Adapter fest im OBD2-Anschluss steckt und seine Betriebsanzeige leuchtet.",
      errLayer5: "Fehlerbehebung: OBD2-Protokollverhandlung fehlgeschlagen. Stellen Sie sicher, dass die Zündung Ihres Fahrzeugs auf ON steht (Motorlauf wird empfohlen).",
      errLayer6: "Fehlerbehebung: Adapter verbunden, aber Fahrzeug-ECU antwortet nicht. Bitte schalten Sie die Zündung ein oder starten Sie die Verbindung neu.",
      errGeneric: "Fehlerbehebung: Bitte stellen Sie sicher, dass der Adapter Strom hat, die Zündung eingeschaltet ist und keine andere OBD-App geöffnet ist.",
      stepAdapter: "Adapterverbindung & Kapazitätsscore", stepProtocol: "OBD2-Protokollverhandlung",
      stepHandshake: "ECU-Kommunikationsüberprüfung", stepStabilization: "Stabilisierung der aktiven Telemetrieschleife"
    },
    health: {
      titleMenu: "OBD2-GESUNDHEIT & LEISTUNGSFÄHIGKEIT", adapterQuality: "ADAPTERQUALITÄT & LEISTUNG",
      excellent: "HERVORRAGEND (ORIGINAL)", good: "GUT (STANDARD)", clone: "INKOMPATIBEL / KLON",
      firmware: "Firmware-Version:", capScore: "Kapazitätsscore", latency: "Latenz (RTT)",
      protocol: "Aktives Protokoll", featureSupport: "ANWENDUNGSFUNKTIONSMATRIX",
      matrixReadCodes: "Fehlercodes lesen & löschen", matrixLiveSensors: "Live-Sensorüberwachung (Basis)",
      matrixBattery: "Batterie- / Spannungstest", matrixHighSpeed: "Hochgeschwindigkeits-Telemetrie (20Hz)",
      matrixCoding: "ECU-Codierung & Anpassungen", active: "Aktiv", degraded: "Eingeschränkt (Langsames RTT)",
      locked: "Gesperrt (Sicherheitsmodus)", warning: "SICHERHEITSSPERRE:",
      lockExplain: "Ihr Adapter wurde als Klon/gefälschter Chip eingestuft. Da Klonadaptern die Timing-Präzision fehlt und das Fahrzeug bei Schreibvorgängen beschädigt werden kann, sind Codierungs- und Anpassungsfunktionen gesperrt. Bitte erwerben Sie ein Original-ELM327 v2.1- oder vLinker-Gerät für eine sichere Codierung.",
      vehiclePids: "FAHRZEUGSENSOR-CHECKLISTE",
      checklistPrompt: "Die von der ECU Ihres Fahrzeugs unterstützten Standard-Sensorparameter (PIDs) sind unten aufgeführt. Sensoren ohne Häkchen werden von Ihrem Fahrzeug nicht gemeldet.",
      supportedBadge: "✓ UNTERSTÜTZT", unsupportedBadge: "❌ NICHT UNTERSTÜTZT"
    },
    sensor: {
      rpm: "Motordrehzahl (RPM)", speed: "Fahrzeuggeschwindigkeit", coolant: "Kühlmitteltemperatur",
      throttle: "Drosselklappenstellung", voltage: "Steuergerät-Spannung", maf: "Luftmassenmesser (MAF)",
      iat: "Ansauglufttemperatur", load: "Berechnete Motorlast", fuel: "Kraftstofffüllstand",
      oilTemp: "Motoröltemperatur"
    }
  },

  // ── Spanish ───────────────────────────────────────────────────────────────
  es: {
    common: {
      supported: "Soportado", copied: "Copiado", cancelBtn: "Cancelar",
      retry: "REINTENTAR CONEXIÓN", changeType: "Cambiar tipo de conexión"
    },
    connection: {
      btDisabled: "Bluetooth desactivado",
      btDisabledDesc: "Por favor, active el Bluetooth para buscar adaptadores OBD2.",
      btDescIos: "Conectar usando adaptadores BLE OBD2 (Veepeak, vLinker).",
      btDescAndroid: "Conectar mediante adaptadores Bluetooth clásicos o BLE.",
      wifiDesc: "Conectar a adaptadores Wi-Fi (normalmente 192.168.0.10).",
      wifiGuide: "Para conectarse a su adaptador Wi-Fi, vaya a la configuración de Wi-Fi de su teléfono y elija la red del adaptador OBD (por ejemplo, OBDII, V-LINK). Luego regrese aquí.",
      openWifiSettings: "ABRIR CONFIGURACIÓN DE WI-FI", connectWifi: "CONECTAR VÍA WI-FI",
      pairRequired: "Emparejando dispositivo OBD2",
      pairRequiredDesc: "Android puede solicitar el emparejamiento porque se está conectando por primera vez. El PIN de emparejamiento suele ser el siguiente:",
      pairNow: "EMPAREJAR Y CONECTAR",
      pairingFailed: "Fallo al emparejar. Por favor, empareje manualmente en la configuración de Android.",
      successVin: "Conexión establecida. Perfil del vehículo identificado con éxito.",
      cloneWarning: "Se ha detectado un adaptador clon incompatible. Las funciones de codificación avanzada están bloqueadas para su seguridad.",
      viewHealth: "MENÚ DE SALUD Y CAPACIDAD OBD2",
      statusPrompt: "Seleccione su interfaz de conexión OBD2 preferida a continuación.",
      foundDevices: "DISPOSITIVOS OBD2 ENCONTRADOS", scanDevices: "BUSCAR DISPOSITIVOS",
      scanHintIos: "Asegúrese de que su adaptador BLE OBD2 esté encendido y cerca de su dispositivo iOS.",
      scanHintAndroid: "Asegúrese de que el Bluetooth esté activo y que el adaptador esté listo para emparejarse.",
      negotiating: "NEGOCIANDO CONEXIÓN OBD2", failed: "FALLÓ EL INTENTO DE CONEXIÓN",
      errLayer1: "Solución: Bluetooth está desactivado. Actívelo en la configuración de su dispositivo.",
      errLayer2: "Solución: Tiempo de espera agotado. Asegúrese de que el adaptador esté firmemente conectado al puerto OBD2 y que su indicador de encendido esté iluminado.",
      errLayer5: "Solución: Falló la negociación del protocolo OBD2. Asegúrese de que el encendido del vehículo esté en la posición ON (se recomienda con el motor en marcha).",
      errLayer6: "Solución: Adaptador conectado, pero la ECU del vehículo no responde. Encienda el encendido o reinicie la conexión.",
      errGeneric: "Solución: Asegúrese de que el adaptador tenga energía, que el encendido esté en ON y que no haya otra aplicación OBD abierta.",
      stepAdapter: "Conexión del adaptador y puntuación de capacidad", stepProtocol: "Negociación de protocolo OBD2",
      stepHandshake: "Verificación de comunicación de la ECU", stepStabilization: "Estabilización del bucle de telemetría activo"
    },
    health: {
      titleMenu: "SALUD Y CAPACIDAD OBD2", adapterQuality: "CALIDAD Y RENDIMIENTO DEL ADAPTADOR",
      excellent: "EXCELENTE (ORIGINAL)", good: "BUENO (ESTÁNDAR)", clone: "INCOMPATIBLE / CLON",
      firmware: "Versión de firmware:", capScore: "Puntuación de capacidad", latency: "Latencia (RTT)",
      protocol: "Protocolo activo", featureSupport: "MATRIZ DE FUNCIONES DE LA APLICACIÓN",
      matrixReadCodes: "Leer y borrar códigos de falla", matrixLiveSensors: "Monitoreo de sensores en vivo (Básico)",
      matrixBattery: "Prueba de batería / voltaje", matrixHighSpeed: "Telemetría de alta velocidad (20Hz)",
      matrixCoding: "Codificación y adaptaciones de la ECU", active: "Activo",
      degraded: "Degradado (RTT lento)", locked: "Bloqueado (Modo seguro)", warning: "BLOQUEO DE SEGURIDAD:",
      lockExplain: "Su adaptador ha sido marcado como un chip clon/falso. Debido a que los adaptadores clon carecen de precisión de temporización y pueden dañar el vehículo durante las operaciones de escritura, las funciones de codificación y adaptación están bloqueadas. Adquiera un dispositivo original ELM327 v2.1 o vLinker para una codificación segura.",
      vehiclePids: "LISTA DE CONTROL DE SENSORES DEL VEHÍCULO",
      checklistPrompt: "Los parámetros de sensor estándar (PIDs) admitidos por la ECU de su vehículo se enumeran a continuación. Su vehículo no informa los sensores sin una marca de verificación.",
      supportedBadge: "✓ SOPORTADO", unsupportedBadge: "❌ NO SOPORTADO"
    },
    sensor: {
      rpm: "RPM del motor", speed: "Velocidad del vehículo", coolant: "Temp. refrigerante del motor",
      throttle: "Posición del acelerador", voltage: "Voltaje del módulo de control", maf: "Flujo de aire MAF",
      iat: "Temp. de admisión de aire", load: "Carga del motor calculada", fuel: "Nivel de combustible",
      oilTemp: "Temp. aceite del motor"
    }
  },

  // ── French ────────────────────────────────────────────────────────────────
  fr: {
    common: {
      supported: "Pris en charge", copied: "Copié", cancelBtn: "Annuler",
      retry: "RÉESSAYER LA CONNEXION", changeType: "Changer de type de connexion"
    },
    connection: {
      btDisabled: "Bluetooth désactivé",
      btDisabledDesc: "Veuillez activer le Bluetooth pour rechercher des adaptateurs OBD2.",
      btDescIos: "Se connecter via les adaptateurs BLE OBD2 (Veepeak, vLinker).",
      btDescAndroid: "Se connecter via les adaptateurs Bluetooth classiques ou BLE.",
      wifiDesc: "Se connecter aux adaptateurs Wi-Fi (généralement 192.168.0.10).",
      wifiGuide: "Pour vous connecter à votre adaptateur Wi-Fi, accédez aux paramètres Wi-Fi de votre téléphone et choisissez le réseau de l'adaptateur OBD (par exemple, OBDII, V-LINK). Revenez ensuite ici.",
      openWifiSettings: "OUVRIR LES PARAMÈTRES WI-FI", connectWifi: "SE CONNECTER VIA WI-FI",
      pairRequired: "Appairage de l'appareil OBD2",
      pairRequiredDesc: "Android peut demander un appairage car vous vous connectez pour la première fois. Le code PIN d'appairage est généralement le suivant :",
      pairNow: "APPAIRER ET SE CONNECTER",
      pairingFailed: "Échec de l'appairage. Veuillez appairer manuellement dans les paramètres Android.",
      successVin: "Connexion établie. Profil du véhicule identifié avec succès.",
      cloneWarning: "Adaptateur clone incompatible détecté. Les fonctionnalités de codage avancées sont verrouillées pour votre sécurité.",
      viewHealth: "MENU DE SANTÉ ET CAPACITÉ OBD2",
      statusPrompt: "Sélectionnez votre interface de connexion OBD2 préférée ci-dessous.",
      foundDevices: "APPAREILS OBD2 TROUVÉS", scanDevices: "RECHERCHER DES APPAREILS",
      scanHintIos: "Assurez-vous que votre adaptateur BLE OBD2 est sous tension et à proximité de votre appareil iOS.",
      scanHintAndroid: "Assurez-vous que le Bluetooth est activé et que l'adaptateur est prêt pour l'appairage.",
      negotiating: "NÉGOCIATION DE LA CONNEXION OBD2", failed: "ÉCHEC DE LA TENTATIVE DE CONNEXION",
      errLayer1: "Dépannage : Le Bluetooth est désactivé. Veuillez l'activer dans les paramètres de votre appareil.",
      errLayer2: "Dépannage : Délai de connexion dépassé. Assurez-vous que l'adaptateur est fermement inséré dans le port OBD2 et que son voyant d'alimentation est allumé.",
      errLayer5: "Dépannage : Échec de la négociation du protocole OBD2. Assurez-vous que le contact du véhicule est mis (le moteur en marche est recommandé).",
      errLayer6: "Dépannage : Adaptateur connecté, mais l'ECU du véhicule ne répond pas. Veuillez mettre le contact ou redémarrer la connexion.",
      errGeneric: "Dépannage : Veuillez vous assurer que l'adaptateur est alimenté, que le contact est mis et qu'aucune autre application OBD n'est ouverte.",
      stepAdapter: "Connexion de l'adaptateur et score de capacité", stepProtocol: "Négociation du protocole OBD2",
      stepHandshake: "Vérification de la communication de l'ECU", stepStabilization: "Stabilisation de la boucle de télémétrie active"
    },
    health: {
      titleMenu: "SANTÉ & CAPACITÉ OBD2", adapterQuality: "QUALITÉ & PERFORMANCES DE L'ADAPTATEUR",
      excellent: "EXCELLENT (ORIGINAL)", good: "BON (STANDARD)", clone: "INCOMPATIBLE / CLONE",
      firmware: "Version du micrologiciel :", capScore: "Score de capacité", latency: "Latence (RTT)",
      protocol: "Protocole actif", featureSupport: "MATRICE DES FONCTIONNALITÉS DE L'APPLICATION",
      matrixReadCodes: "Lire et effacer les codes de diagnostic", matrixLiveSensors: "Surveillance des capteurs en direct (de base)",
      matrixBattery: "Test de batterie / tension", matrixHighSpeed: "Télémétrie haute vitesse (20Hz)",
      matrixCoding: "Codage et adaptations de l'ECU", active: "Actif", degraded: "Dégradé (RTT lent)",
      locked: "Verrouillé (mode sécurisé)", warning: "VERROUILLAGE DE SÉCURITÉ :",
      lockExplain: "Votre adaptateur a été signalé comme une puce clone/fausse. Parce que les adaptateurs clones manquent de précision de synchronisation et peuvent endommager le véhicule pendant les opérations d'écriture, les fonctionnalités de codage et d'adaptation sont verrouillées. Veuillez vous procurer un appareil ELM327 v2.1 ou vLinker d'origine pour un codage sécurisé.",
      vehiclePids: "LISTE DE CONTRÔLE DES CAPTEURS DU VÉHICULE",
      checklistPrompt: "Les paramètres de capteur standard (PIDs) pris en charge par l'ECU de votre véhicule sont répertoriés ci-dessous. Les capteurs sans coche ne sont pas signalés par votre véhicule.",
      supportedBadge: "✓ PRIS EN CHARGE", unsupportedBadge: "❌ NON PRIS EN CHARGE"
    },
    sensor: {
      rpm: "Régime moteur (RPM)", speed: "Vitesse du véhicule", coolant: "Temp. du liquide de refroidissement",
      throttle: "Position du papillon", voltage: "Tension du module de commande", maf: "Débit d'air MAF",
      iat: "Temp. de l'air d'admission", load: "Charge calculée du moteur", fuel: "Niveau de carburant",
      oilTemp: "Temp. de l'huile moteur"
    }
  },

  // ── Italian ───────────────────────────────────────────────────────────────
  it: {
    common: {
      supported: "Supportato", copied: "Copiato", cancelBtn: "Annulla",
      retry: "RIPROVA CONNESSIONE", changeType: "Cambia tipo di connessione"
    },
    connection: {
      btDisabled: "Bluetooth disabilitato",
      btDisabledDesc: "Abilita il Bluetooth per cercare gli adattatori OBD2.",
      btDescIos: "Connessione tramite adattatori BLE OBD2 (Veepeak, vLinker).",
      btDescAndroid: "Connessione tramite adattatori Bluetooth Classic o BLE.",
      wifiDesc: "Connessione ad adattatori Wi-Fi (solitamente 192.168.0.10).",
      wifiGuide: "Per connetterti all'adattatore Wi-Fi, vai alle impostazioni Wi-Fi del telefono e scegli la rete dell'adattatore OBD (es. OBDII, V-LINK). Poi torna qui.",
      openWifiSettings: "APRI IMPOSTAZIONI WI-FI", connectWifi: "CONNETTI VIA WI-FI",
      pairRequired: "Abbinamento dispositivo OBD2",
      pairRequiredDesc: "Android potrebbe richiedere l'abbinamento poiché ti stai connettendo per la prima volta. Il PIN di abbinamento è generalmente:",
      pairNow: "ABBINA E CONNETTI",
      pairingFailed: "Abbinamento fallito. Abbina manualmente nelle impostazioni Android.",
      successVin: "Connessione stabilita. Profilo veicolo identificato con successo.",
      cloneWarning: "Adattatore clone incompatibile rilevato. Le funzioni di codifica avanzate sono bloccate per la tua sicurezza.",
      viewHealth: "MENU SALUTE E CAPACITÀ OBD2",
      statusPrompt: "Seleziona l'interfaccia di connessione OBD2 preferita.",
      foundDevices: "DISPOSITIVI OBD2 TROVATI", scanDevices: "CERCA DISPOSITIVI",
      scanHintIos: "Assicurati che l'adattatore BLE OBD2 sia acceso e vicino al dispositivo iOS.",
      scanHintAndroid: "Assicurati che il Bluetooth sia attivo e che l'adattatore sia pronto per l'abbinamento.",
      negotiating: "NEGOZIAZIONE HANDSHAKE OBD2", failed: "TENTATIVO DI CONNESSIONE FALLITO",
      errLayer1: "Risoluzione: Bluetooth disabilitato. Abilitalo nelle impostazioni del dispositivo.",
      errLayer2: "Risoluzione: Connessione scaduta. Verifica che l'adattatore sia inserito saldamente nella porta OBD2 e che l'indicatore di alimentazione sia acceso.",
      errLayer5: "Risoluzione: Negosiazione protocollo OBD2 fallita. Assicurati che l'accensione del veicolo sia in posizione ON (si consiglia il motore in funzione).",
      errLayer6: "Risoluzione: Adattatore connesso, ma la ECU del veicolo non risponde. Accendi il quadro o riavvia la connessione.",
      errGeneric: "Risoluzione: Assicurati che l'adattatore sia alimentato, il quadro sia acceso e nessun'altra app OBD sia aperta.",
      stepAdapter: "Connessione adattatore e punteggio capacità", stepProtocol: "Negoziazione protocollo OBD2",
      stepHandshake: "Verifica comunicazione ECU", stepStabilization: "Stabilizzazione loop telemetria attivo"
    },
    health: {
      titleMenu: "SALUTE E CAPACITÀ OBD2", adapterQuality: "QUALITÀ E PRESTAZIONI ADATTATORE",
      excellent: "ECCELLENTE (ORIGINALE)", good: "BUONO (STANDARD)", clone: "INCOMPATIBILE / CLONE",
      firmware: "Versione firmware:", capScore: "Punteggio capacità", latency: "Latenza (RTT)",
      protocol: "Protocollo attivo", featureSupport: "MATRICE FUNZIONALITÀ APPLICAZIONE",
      matrixReadCodes: "Lettura e cancellazione codici errore", matrixLiveSensors: "Monitoraggio sensori in tempo reale (Base)",
      matrixBattery: "Test batteria / tensione", matrixHighSpeed: "Telemetria alta velocità (20Hz)",
      matrixCoding: "Codifica e adattamenti ECU", active: "Attivo", degraded: "Degradato (RTT lento)",
      locked: "Bloccato (Modalità sicura)", warning: "BLOCCO DI SICUREZZA:",
      lockExplain: "Il tuo adattatore è stato segnalato come chip clone/falso. Poiché gli adattatori clone mancano di precisione temporale e possono danneggiare il veicolo durante le operazioni di scrittura, le funzioni di codifica e adattamento sono bloccate. Acquista un dispositivo ELM327 v2.1 o vLinker originale per una codifica sicura.",
      vehiclePids: "LISTA CONTROLLO SENSORI VEICOLO",
      checklistPrompt: "I parametri sensore standard (PID) supportati dalla ECU del veicolo sono elencati di seguito. I sensori senza spunta non sono riportati dal veicolo.",
      supportedBadge: "✓ SUPPORTATO", unsupportedBadge: "❌ NON SUPPORTATO"
    },
    sensor: {
      rpm: "Giri motore (RPM)", speed: "Velocità veicolo", coolant: "Temp. liquido di raffreddamento",
      throttle: "Posizione acceleratore", voltage: "Tensione modulo di controllo", maf: "Portata d'aria MAF",
      iat: "Temp. aria di aspirazione", load: "Carico motore calcolato", fuel: "Livello carburante",
      oilTemp: "Temp. olio motore"
    }
  },

  // ── Norwegian ─────────────────────────────────────────────────────────────
  no: {
    common: {
      supported: "Støttet", copied: "Kopiert", cancelBtn: "Avbryt",
      retry: "PRØV TILKOBLING PÅ NYTT", changeType: "Endre tilkoblingstype"
    },
    connection: {
      btDisabled: "Bluetooth deaktivert",
      btDisabledDesc: "Aktiver Bluetooth for å søke etter OBD2-adaptere.",
      btDescIos: "Koble til via BLE OBD2-adaptere (Veepeak, vLinker).",
      btDescAndroid: "Koble til via Classic Bluetooth- eller BLE-adaptere.",
      wifiDesc: "Koble til Wi-Fi-adaptere (vanligvis 192.168.0.10).",
      wifiGuide: "For å koble til Wi-Fi-adapteren, gå til telefonens Wi-Fi-innstillinger og velg OBD-adapterens nettverk (f.eks. OBDII, V-LINK). Gå deretter tilbake hit.",
      openWifiSettings: "ÅPNE WI-FI-INNSTILLINGER", connectWifi: "KOBLE TIL VIA WI-FI",
      pairRequired: "Parer OBD2-enhet",
      pairRequiredDesc: "Android kan be om parering fordi du kobler til for første gang. Parerings-PIN-en er vanligvis:",
      pairNow: "PAR OG KOBLE TIL",
      pairingFailed: "Parering mislyktes. Parer manuelt i Android-innstillinger.",
      successVin: "Tilkobling etablert. Kjøretøyprofil identifisert.",
      cloneWarning: "Inkompatibel klonadapter oppdaget. Avanserte koderingsfunksjoner er låst for din sikkerhet.",
      viewHealth: "OBD2 HELSE- OG KAPASITETSMENY",
      statusPrompt: "Velg foretrukket OBD2-tilkoblingsgrensesnitt nedenfor.",
      foundDevices: "FUNNET OBD2-ENHETER", scanDevices: "SØK ETTER ENHETER",
      scanHintIos: "Sørg for at BLE OBD2-adapteren er slått på og nær iOS-enheten.",
      scanHintAndroid: "Sørg for at Bluetooth er aktivt og at adapteren er klar for parering.",
      negotiating: "FORHANDLER OBD2-HÅNDTRYKK", failed: "TILKOBLINGSFORSØK MISLYKTES",
      errLayer1: "Feilsøking: Bluetooth er deaktivert. Aktiver det i enhetsinnstillingene.",
      errLayer2: "Feilsøking: Tilkoblingen tidsavbrutt. Sørg for at adapteren sitter godt i OBD2-porten og at strømindikatoren lyser.",
      errLayer5: "Feilsøking: OBD2-protokollforhandling mislyktes. Sørg for at bilens tenning er i PÅ-posisjon (motoren i gang anbefales).",
      errLayer6: "Feilsøking: Adapter tilkoblet, men bilens ECU svarer ikke. Slå på tenningen eller start tilkoblingen på nytt.",
      errGeneric: "Feilsøking: Sørg for at adapteren har strøm, tenningen er på og ingen andre OBD-apper er åpne.",
      stepAdapter: "Adaptertilkobling og kapasitetsscore", stepProtocol: "OBD2-protokollforhandling",
      stepHandshake: "ECU-kommunikasjonsverifisering", stepStabilization: "Stabilisering av aktiv telemetrisløyfe"
    },
    health: {
      titleMenu: "OBD2 HELSE OG KAPASITET", adapterQuality: "ADAPTERKVALITET OG YTELSE",
      excellent: "UTMERKET (ORIGINAL)", good: "GOD (STANDARD)", clone: "INKOMPATIBEL / KLON",
      firmware: "Fastvareversjon:", capScore: "Kapasitetsscore", latency: "Latens (RTT)",
      protocol: "Aktivt protokoll", featureSupport: "PROGRAMFUNKSJONSMATRISE",
      matrixReadCodes: "Les og slett feilkoder", matrixLiveSensors: "Live sensorovervåking (Grunnleggende)",
      matrixBattery: "Batteri- / spenningstest", matrixHighSpeed: "Høyhastighets telemetri (20Hz)",
      matrixCoding: "ECU-koding og tilpasninger", active: "Aktiv", degraded: "Degradert (Treg RTT)",
      locked: "Låst (Sikker modus)", warning: "SIKKERHETSLÅS:",
      lockExplain: "Adapteren din er flagget som en klon/falsk chip. Fordi klonadaptere mangler tidspresisjon og kan ødelegge kjøretøyet under skriveoperasjoner, er koding og tilpasningsfunksjoner låst. Skaff en original ELM327 v2.1 eller vLinker-enhet for sikker koding.",
      vehiclePids: "KJØRETØYSENSOR-SJEKKLISTE",
      checklistPrompt: "Standard sensorparametere (PIDer) som støttes av kjøretøyets ECU er listet nedenfor. Sensorer uten hake rapporteres ikke av kjøretøyet.",
      supportedBadge: "✓ STØTTET", unsupportedBadge: "❌ IKKE STØTTET"
    },
    sensor: {
      rpm: "Motorturtall (RPM)", speed: "Kjøretøyhastighet", coolant: "Kjølevæsketemperatur",
      throttle: "Gasspedal-posisjon", voltage: "Kontrollenhetsspenning", maf: "MAF luftstrøm",
      iat: "Inntakslufttemperatur", load: "Beregnet motorbelastning", fuel: "Drivstoffnivå",
      oilTemp: "Motoroljetemperatur"
    }
  },

  // ── Greek ─────────────────────────────────────────────────────────────────
  el: {
    common: {
      supported: "Υποστηρίζεται", copied: "Αντιγράφηκε", cancelBtn: "Ακύρωση",
      retry: "ΕΠΑΝΑΛΗΨΗ ΣΥΝΔΕΣΗΣ", changeType: "Αλλαγή τύπου σύνδεσης"
    },
    connection: {
      btDisabled: "Bluetooth απενεργοποιημένο",
      btDisabledDesc: "Ενεργοποιήστε το Bluetooth για αναζήτηση προσαρμογέων OBD2.",
      btDescIos: "Σύνδεση με προσαρμογείς BLE OBD2 (Veepeak, vLinker).",
      btDescAndroid: "Σύνδεση μέσω Classic Bluetooth ή BLE προσαρμογέων.",
      wifiDesc: "Σύνδεση σε προσαρμογείς Wi-Fi (συνήθως 192.168.0.10).",
      wifiGuide: "Για σύνδεση στον προσαρμογέα Wi-Fi, μεταβείτε στις ρυθμίσεις Wi-Fi του τηλεφώνου και επιλέξτε το δίκτυο του προσαρμογέα OBD (π.χ. OBDII, V-LINK). Στη συνέχεια επιστρέψτε εδώ.",
      openWifiSettings: "ΑΝΟΙΓΜΑ ΡΥΘΜΙΣΕΩΝ WI-FI", connectWifi: "ΣΥΝΔΕΣΗ ΜΕΣΩ WI-FI",
      pairRequired: "Σύζευξη συσκευής OBD2",
      pairRequiredDesc: "Το Android μπορεί να ζητήσει σύζευξη επειδή συνδέεστε για πρώτη φορά. Το PIN σύζευξης είναι συνήθως:",
      pairNow: "ΣΥΖΕΥΞΗ ΚΑΙ ΣΥΝΔΕΣΗ",
      pairingFailed: "Αποτυχία σύζευξης. Συζεύξτε χειροκίνητα στις ρυθμίσεις Android.",
      successVin: "Η σύνδεση δημιουργήθηκε. Το προφίλ οχήματος αναγνωρίστηκε επιτυχώς.",
      cloneWarning: "Εντοπίστηκε ασύμβατος κλωνισμένος προσαρμογέας. Οι λειτουργίες κωδικοποίησης κλειδώθηκαν για την ασφάλειά σας.",
      viewHealth: "ΜΕΝΟΥ ΥΓΕΙΑΣ ΚΑΙ ΔΥΝΑΤΟΤΗΤΩΝ OBD2",
      statusPrompt: "Επιλέξτε τη διεπαφή σύνδεσης OBD2 που προτιμάτε.",
      foundDevices: "ΒΡΕΘΗΚΑΝ ΣΥΣΚΕΥΕΣ OBD2", scanDevices: "ΣΑΡΩΣΗ ΣΥΣΚΕΥΩΝ",
      scanHintIos: "Βεβαιωθείτε ότι ο προσαρμογέας BLE OBD2 είναι ενεργοποιημένος και κοντά στη συσκευή iOS.",
      scanHintAndroid: "Βεβαιωθείτε ότι το Bluetooth είναι ενεργό και ο προσαρμογέας είναι έτοιμος για σύζευξη.",
      negotiating: "ΔΙΑΠΡΑΓΜΑΤΕΥΣΗ ΧΕΙΡΑΨΙΑΣ OBD2", failed: "ΑΠΟΤΥΧΙΑ ΠΡΟΣΠΑΘΕΙΑΣ ΣΥΝΔΕΣΗΣ",
      errLayer1: "Αντιμετώπιση: Το Bluetooth είναι απενεργοποιημένο. Ενεργοποιήστε το στις ρυθμίσεις συσκευής.",
      errLayer2: "Αντιμετώπιση: Λήξη χρόνου σύνδεσης. Βεβαιωθείτε ότι ο προσαρμογέας είναι σταθερά τοποθετημένος στη θύρα OBD2 και ο δείκτης τροφοδοσίας είναι αναμμένος.",
      errLayer5: "Αντιμετώπιση: Αποτυχία διαπραγμάτευσης πρωτοκόλλου OBD2. Βεβαιωθείτε ότι η ανάφλεξη του οχήματος είναι στη θέση ON (συνιστάται ο κινητήρας να λειτουργεί).",
      errLayer6: "Αντιμετώπιση: Ο προσαρμογέας συνδέθηκε, αλλά η ECU του οχήματος δεν αποκρίνεται. Ενεργοποιήστε την ανάφλεξη ή επανεκκινήστε τη σύνδεση.",
      errGeneric: "Αντιμετώπιση: Βεβαιωθείτε ότι ο προσαρμογέας έχει τροφοδοσία, η ανάφλεξη είναι ενεργή και καμία άλλη εφαρμογή OBD δεν είναι ανοιχτή.",
      stepAdapter: "Σύνδεση προσαρμογέα και βαθμολογία δυνατοτήτων", stepProtocol: "Διαπραγμάτευση πρωτοκόλλου OBD2",
      stepHandshake: "Επαλήθευση επικοινωνίας ECU", stepStabilization: "Σταθεροποίηση ενεργού βρόχου τηλεμετρίας"
    },
    health: {
      titleMenu: "ΥΓΕΙΑ ΚΑΙ ΔΥΝΑΤΟΤΗΤΕΣ OBD2", adapterQuality: "ΠΟΙΟΤΗΤΑ ΚΑΙ ΑΠΟΔΟΣΗ ΠΡΟΣΑΡΜΟΓΕΑ",
      excellent: "ΕΞΑΙΡΕΤΙΚΟΣ (ΑΥΘΕΝΤΙΚΟΣ)", good: "ΚΑΛΟΣ (ΤΥΠΙΚΟΣ)", clone: "ΑΣΥΜΒΑΤΟΣ / ΚΛΩΝΟΣ",
      firmware: "Έκδοση υλικολογισμικού:", capScore: "Βαθμολογία δυνατοτήτων", latency: "Καθυστέρηση (RTT)",
      protocol: "Ενεργό πρωτόκολλο", featureSupport: "ΠΙΝΑΚΑΣ ΛΕΙΤΟΥΡΓΙΩΝ ΕΦΑΡΜΟΓΗΣ",
      matrixReadCodes: "Ανάγνωση και διαγραφή κωδικών σφάλματος", matrixLiveSensors: "Παρακολούθηση αισθητήρων σε πραγματικό χρόνο (Βασικό)",
      matrixBattery: "Δοκιμή μπαταρίας / τάσης", matrixHighSpeed: "Τηλεμετρία υψηλής ταχύτητας (20Hz)",
      matrixCoding: "Κωδικοποίηση και προσαρμογές ECU", active: "Ενεργό", degraded: "Υποβαθμισμένο (Αργό RTT)",
      locked: "Κλειδωμένο (Ασφαλής λειτουργία)", warning: "ΚΛΕΙΔΑΡΙΑ ΑΣΦΑΛΕΙΑΣ:",
      lockExplain: "Ο προσαρμογέας σας έχει επισημανθεί ως κλωνισμένο/ψεύτικο τσιπ. Επειδή οι κλωνισμένοι προσαρμογείς στερούνται χρονικής ακρίβειας και μπορεί να καταστρέψουν το όχημα κατά τη διάρκεια εγγραφών, οι λειτουργίες κωδικοποίησης και προσαρμογής είναι κλειδωμένες. Αποκτήστε αυθεντική συσκευή ELM327 v2.1 ή vLinker για ασφαλή κωδικοποίηση.",
      vehiclePids: "ΛΙΣΤΑ ΕΛΕΓΧΟΥ ΑΙΣΘΗΤΗΡΩΝ ΟΧΗΜΑΤΟΣ",
      checklistPrompt: "Οι τυπικές παράμετροι αισθητήρων (PID) που υποστηρίζονται από την ECU του οχήματός σας παρατίθενται παρακάτω. Οι αισθητήρες χωρίς σημάδι δεν αναφέρονται από το όχημά σας.",
      supportedBadge: "✓ ΥΠΟΣΤΗΡΙΖΕΤΑΙ", unsupportedBadge: "❌ ΔΕΝ ΥΠΟΣΤΗΡΙΖΕΤΑΙ"
    },
    sensor: {
      rpm: "Στροφές κινητήρα (RPM)", speed: "Ταχύτητα οχήματος", coolant: "Θερμοκρασία ψυκτικού υγρού",
      throttle: "Θέση γκαζιού", voltage: "Τάση μονάδας ελέγχου", maf: "Ροή αέρα MAF",
      iat: "Θερμοκρασία αέρα εισαγωγής", load: "Υπολογισμένο φορτίο κινητήρα", fuel: "Στάθμη καυσίμου",
      oilTemp: "Θερμοκρασία λαδιού κινητήρα"
    }
  },

  // ── Russian ───────────────────────────────────────────────────────────────
  ru: {
    common: {
      supported: "Поддерживается", copied: "Скопировано", cancelBtn: "Отмена",
      retry: "ПОВТОРИТЬ ПОДКЛЮЧЕНИЕ", changeType: "Изменить тип подключения"
    },
    connection: {
      btDisabled: "Bluetooth отключён",
      btDisabledDesc: "Включите Bluetooth для поиска адаптеров OBD2.",
      btDescIos: "Подключение через BLE OBD2-адаптеры (Veepeak, vLinker).",
      btDescAndroid: "Подключение через Classic Bluetooth или BLE-адаптеры.",
      wifiDesc: "Подключение к Wi-Fi адаптерам (обычно 192.168.0.10).",
      wifiGuide: "Для подключения к Wi-Fi адаптеру зайдите в настройки Wi-Fi телефона и выберите сеть OBD-адаптера (напр. OBDII, V-LINK). Затем вернитесь сюда.",
      openWifiSettings: "ОТКРЫТЬ НАСТРОЙКИ WI-FI", connectWifi: "ПОДКЛЮЧИТЬСЯ ПО WI-FI",
      pairRequired: "Сопряжение устройства OBD2",
      pairRequiredDesc: "Android может запросить сопряжение, так как вы подключаетесь впервые. PIN-код сопряжения обычно следующий:",
      pairNow: "СОПРЯЧЬ И ПОДКЛЮЧИТЬ",
      pairingFailed: "Сопряжение не удалось. Выполните сопряжение вручную в настройках Android.",
      successVin: "Соединение установлено. Профиль автомобиля успешно определён.",
      cloneWarning: "Обнаружен несовместимый клонированный адаптер. Расширенные функции кодирования заблокированы для вашей безопасности.",
      viewHealth: "МЕНЮ ДИАГНОСТИКИ OBD2",
      statusPrompt: "Выберите предпочтительный интерфейс подключения OBD2.",
      foundDevices: "НАЙДЕННЫЕ УСТРОЙСТВА OBD2", scanDevices: "ПОИСК УСТРОЙСТВ",
      scanHintIos: "Убедитесь, что BLE OBD2-адаптер включён и находится рядом с устройством iOS.",
      scanHintAndroid: "Убедитесь, что Bluetooth активен и адаптер готов к сопряжению.",
      negotiating: "СОГЛАСОВАНИЕ HANDSHAKE OBD2", failed: "ПОПЫТКА ПОДКЛЮЧЕНИЯ НЕ УДАЛАСЬ",
      errLayer1: "Устранение: Bluetooth отключён. Включите его в настройках устройства.",
      errLayer2: "Устранение: Тайм-аут соединения. Убедитесь, что адаптер плотно вставлен в порт OBD2 и горит индикатор питания.",
      errLayer5: "Устранение: Согласование протокола OBD2 не удалось. Убедитесь, что замок зажигания находится в положении ON (рекомендуется работающий двигатель).",
      errLayer6: "Устранение: Адаптер подключён, но ЭБУ автомобиля не отвечает. Включите зажигание или перезапустите подключение.",
      errGeneric: "Устранение: Убедитесь, что адаптер получает питание, зажигание включено и никакое другое OBD-приложение не открыто.",
      stepAdapter: "Подключение адаптера и оценка возможностей", stepProtocol: "Согласование протокола OBD2",
      stepHandshake: "Проверка связи с ЭБУ", stepStabilization: "Стабилизация активного цикла телеметрии"
    },
    health: {
      titleMenu: "ДИАГНОСТИКА OBD2", adapterQuality: "КАЧЕСТВО И ПРОИЗВОДИТЕЛЬНОСТЬ АДАПТЕРА",
      excellent: "ОТЛИЧНЫЙ (ОРИГИНАЛЬНЫЙ)", good: "ХОРОШИЙ (СТАНДАРТНЫЙ)", clone: "НЕСОВМЕСТИМЫЙ / КЛОН",
      firmware: "Версия прошивки:", capScore: "Оценка возможностей", latency: "Задержка (RTT)",
      protocol: "Активный протокол", featureSupport: "МАТРИЦА ФУНКЦИЙ ПРИЛОЖЕНИЯ",
      matrixReadCodes: "Чтение и сброс кодов ошибок", matrixLiveSensors: "Мониторинг датчиков в реальном времени (Базовый)",
      matrixBattery: "Тест аккумулятора / напряжения", matrixHighSpeed: "Высокоскоростная телеметрия (20Гц)",
      matrixCoding: "Кодирование и адаптации ЭБУ", active: "Активен", degraded: "Деградирован (Медленный RTT)",
      locked: "Заблокирован (Безопасный режим)", warning: "БЛОКИРОВКА БЕЗОПАСНОСТИ:",
      lockExplain: "Ваш адаптер определён как клонированный/поддельный чип. Поскольку клонированные адаптеры лишены точности синхронизации и могут повредить автомобиль при операциях записи, функции кодирования и адаптации заблокированы. Приобретите оригинальное устройство ELM327 v2.1 или vLinker для безопасного кодирования.",
      vehiclePids: "СПИСОК ПРОВЕРКИ ДАТЧИКОВ АВТОМОБИЛЯ",
      checklistPrompt: "Стандартные параметры датчиков (PID), поддерживаемые ЭБУ вашего автомобиля, перечислены ниже. Датчики без галочки не сообщаются вашим автомобилем.",
      supportedBadge: "✓ ПОДДЕРЖИВАЕТСЯ", unsupportedBadge: "❌ НЕ ПОДДЕРЖИВАЕТСЯ"
    },
    sensor: {
      rpm: "Обороты двигателя (RPM)", speed: "Скорость автомобиля", coolant: "Температура охлаждающей жидкости",
      throttle: "Положение дроссельной заслонки", voltage: "Напряжение модуля управления", maf: "Расход воздуха MAF",
      iat: "Температура воздуха на впуске", load: "Расчётная нагрузка двигателя", fuel: "Уровень топлива",
      oilTemp: "Температура моторного масла"
    }
  },

  // ── Chinese ───────────────────────────────────────────────────────────────
  zh: {
    common: { supported: "已支持", copied: "已复制", cancelBtn: "取消", retry: "重试连接", changeType: "更改连接类型" },
    connection: {
      btDisabled: "蓝牙已禁用", btDisabledDesc: "请开启蓝牙以搜索OBD2适配器。",
      btDescIos: "通过BLE OBD2适配器连接（Veepeak、vLinker）。",
      btDescAndroid: "通过经典蓝牙或BLE适配器连接。",
      wifiDesc: "连接到Wi-Fi适配器（通常为192.168.0.10）。",
      wifiGuide: "要连接Wi-Fi适配器，请进入手机Wi-Fi设置，选择OBD适配器网络（如OBDII、V-LINK），然后返回此处。",
      openWifiSettings: "打开WI-FI设置", connectWifi: "通过WI-FI连接",
      pairRequired: "配对OBD2设备",
      pairRequiredDesc: "由于您是首次连接，Android可能会请求配对。配对PIN通常如下：",
      pairNow: "配对并连接", pairingFailed: "配对失败。请在Android设置中手动配对。",
      successVin: "连接成功。车辆配置文件已成功识别。",
      cloneWarning: "检测到不兼容的克隆适配器。高级编码功能已锁定以确保安全。",
      viewHealth: "OBD2健康与能力菜单", statusPrompt: "请在下方选择您的首选OBD2连接接口。",
      foundDevices: "发现的OBD2设备", scanDevices: "搜索设备",
      scanHintIos: "确保BLE OBD2适配器已开启且靠近您的iOS设备。",
      scanHintAndroid: "确保蓝牙已激活，且适配器已准备好配对。",
      negotiating: "正在协商OBD2握手", failed: "连接尝试失败",
      errLayer1: "排查：蓝牙已禁用。请在设备设置中开启蓝牙。",
      errLayer2: "排查：连接超时。确保适配器已牢固插入OBD2端口，且电源指示灯已亮起。",
      errLayer5: "排查：OBD2协议协商失败。确保车辆点火开关处于ON位置（建议发动机运行）。",
      errLayer6: "排查：适配器已连接，但车辆ECU未响应。请开启点火开关或重启连接。",
      errGeneric: "排查：确保适配器有电源、点火开关已开启，且没有其他OBD应用程序在运行。",
      stepAdapter: "适配器连接与能力评分", stepProtocol: "OBD2协议协商",
      stepHandshake: "ECU通信验证", stepStabilization: "主动遥测循环稳定"
    },
    health: {
      titleMenu: "OBD2健康与能力", adapterQuality: "适配器质量与性能",
      excellent: "优秀（原装）", good: "良好（标准）", clone: "不兼容 / 克隆",
      firmware: "固件版本：", capScore: "能力评分", latency: "延迟（RTT）",
      protocol: "活动协议", featureSupport: "应用功能矩阵",
      matrixReadCodes: "读取和清除故障码", matrixLiveSensors: "实时传感器监控（基础）",
      matrixBattery: "电池 / 电压测试", matrixHighSpeed: "高速遥测（20Hz）",
      matrixCoding: "ECU编码与适配", active: "活动", degraded: "降级（慢RTT）",
      locked: "已锁定（安全模式）", warning: "安全锁定：",
      lockExplain: "您的适配器被标记为克隆/假冒芯片。由于克隆适配器缺乏时序精度，在写入操作期间可能损坏车辆，因此编码和适配功能已被锁定。请购买正品ELM327 v2.1或vLinker设备以进行安全编码。",
      vehiclePids: "车辆传感器检查清单",
      checklistPrompt: "您的车辆ECU支持的标准传感器参数（PID）如下所列。没有复选标记的传感器不由您的车辆报告。",
      supportedBadge: "✓ 已支持", unsupportedBadge: "❌ 不支持"
    },
    sensor: {
      rpm: "发动机转速（RPM）", speed: "车辆速度", coolant: "发动机冷却液温度",
      throttle: "节气门位置", voltage: "控制模块电压", maf: "MAF空气流量",
      iat: "进气温度", load: "计算的发动机负荷", fuel: "燃油液位", oilTemp: "发动机油温"
    }
  },

  // ── Japanese ──────────────────────────────────────────────────────────────
  ja: {
    common: { supported: "対応済み", copied: "コピーしました", cancelBtn: "キャンセル", retry: "接続を再試行", changeType: "接続タイプを変更" },
    connection: {
      btDisabled: "Bluetoothが無効です", btDisabledDesc: "OBD2アダプターを検索するにはBluetoothを有効にしてください。",
      btDescIos: "BLE OBD2アダプター（Veepeak、vLinker）を使用して接続します。",
      btDescAndroid: "Classic BluetoothまたはBLEアダプターで接続します。",
      wifiDesc: "Wi-Fiアダプターに接続します（通常は192.168.0.10）。",
      wifiGuide: "Wi-Fiアダプターに接続するには、スマホのWi-Fi設定でOBDアダプターのネットワーク（例：OBDII、V-LINK）を選択してください。その後こちらに戻ってください。",
      openWifiSettings: "WI-FI設定を開く", connectWifi: "WI-FI経由で接続",
      pairRequired: "OBD2デバイスをペアリング中",
      pairRequiredDesc: "初めての接続のため、Androidがペアリングを要求する場合があります。ペアリングPINは通常次のとおりです：",
      pairNow: "ペアリングして接続", pairingFailed: "ペアリングに失敗しました。Androidの設定で手動でペアリングしてください。",
      successVin: "接続が確立されました。車両プロファイルが正常に特定されました。",
      cloneWarning: "互換性のないクローンアダプターが検出されました。安全のため高度なコーディング機能はロックされています。",
      viewHealth: "OBD2ヘルス＆キャパビリティメニュー", statusPrompt: "希望するOBD2接続インターフェースを選択してください。",
      foundDevices: "検出されたOBD2デバイス", scanDevices: "デバイスをスキャン",
      scanHintIos: "BLE OBD2アダプターの電源が入っており、iOSデバイスの近くにあることを確認してください。",
      scanHintAndroid: "Bluetoothが有効になっており、アダプターがペアリング準備完了であることを確認してください。",
      negotiating: "OBD2ハンドシェイクを調整中", failed: "接続の試みが失敗しました",
      errLayer1: "トラブルシューティング：Bluetoothが無効です。デバイスの設定でBluetoothを有効にしてください。",
      errLayer2: "トラブルシューティング：接続タイムアウト。アダプターがOBD2ポートにしっかり差し込まれており、電源インジケーターが点灯していることを確認してください。",
      errLayer5: "トラブルシューティング：OBD2プロトコルの調整に失敗しました。車両のイグニッションがON位置にあることを確認してください（エンジン稼働を推奨）。",
      errLayer6: "トラブルシューティング：アダプターは接続されましたが、車両ECUが応答しません。イグニッションをオンにするか、接続を再起動してください。",
      errGeneric: "トラブルシューティング：アダプターに電源があること、イグニッションがオンであること、他のOBDアプリが開いていないことを確認してください。",
      stepAdapter: "アダプター接続とキャパビリティスコア", stepProtocol: "OBD2プロトコル調整",
      stepHandshake: "ECU通信の検証", stepStabilization: "アクティブテレメトリーループの安定化"
    },
    health: {
      titleMenu: "OBD2ヘルス＆キャパビリティ", adapterQuality: "アダプターの品質とパフォーマンス",
      excellent: "優秀（本物）", good: "良好（標準）", clone: "非互換 / クローン",
      firmware: "ファームウェアバージョン：", capScore: "キャパビリティスコア", latency: "レイテンシ（RTT）",
      protocol: "アクティブプロトコル", featureSupport: "アプリケーション機能マトリックス",
      matrixReadCodes: "フォルトコードの読み取りとクリア", matrixLiveSensors: "リアルタイムセンサー監視（基本）",
      matrixBattery: "バッテリー / 電圧テスト", matrixHighSpeed: "高速テレメトリー（20Hz）",
      matrixCoding: "ECUコーディングとアダプテーション", active: "アクティブ", degraded: "低下（遅いRTT）",
      locked: "ロック済み（安全モード）", warning: "セキュリティロック：",
      lockExplain: "お使いのアダプターはクローン/偽造チップとしてフラグが立てられています。クローンアダプターはタイミング精度が欠如しており、書き込み操作中に車両を損傷させる可能性があるため、コーディングとアダプテーション機能はロックされています。安全なコーディングのためにオリジナルのELM327 v2.1またはvLinkerデバイスをご購入ください。",
      vehiclePids: "車両センサーチェックリスト",
      checklistPrompt: "車両のECUがサポートする標準センサーパラメーター（PID）を以下に示します。チェックマークのないセンサーは車両によって報告されません。",
      supportedBadge: "✓ 対応済み", unsupportedBadge: "❌ 非対応"
    },
    sensor: {
      rpm: "エンジン回転数（RPM）", speed: "車両速度", coolant: "エンジン冷却水温度",
      throttle: "スロットルポジション", voltage: "制御モジュール電圧", maf: "MAF空気流量",
      iat: "吸気温度", load: "計算されたエンジン負荷", fuel: "燃料残量", oilTemp: "エンジンオイル温度"
    }
  },

  // ── Korean ────────────────────────────────────────────────────────────────
  ko: {
    common: { supported: "지원됨", copied: "복사됨", cancelBtn: "취소", retry: "연결 재시도", changeType: "연결 유형 변경" },
    connection: {
      btDisabled: "블루투스 비활성화", btDisabledDesc: "OBD2 어댑터를 검색하려면 블루투스를 활성화하세요.",
      btDescIos: "BLE OBD2 어댑터(Veepeak, vLinker)를 사용하여 연결합니다.",
      btDescAndroid: "Classic Bluetooth 또는 BLE 어댑터로 연결합니다.",
      wifiDesc: "Wi-Fi 어댑터에 연결합니다(일반적으로 192.168.0.10).",
      wifiGuide: "Wi-Fi 어댑터에 연결하려면 휴대폰의 Wi-Fi 설정으로 이동하여 OBD 어댑터 네트워크(예: OBDII, V-LINK)를 선택하세요. 그런 다음 여기로 돌아오세요.",
      openWifiSettings: "WI-FI 설정 열기", connectWifi: "WI-FI를 통해 연결",
      pairRequired: "OBD2 기기 페어링",
      pairRequiredDesc: "처음 연결하는 것이므로 Android에서 페어링을 요청할 수 있습니다. 페어링 PIN은 일반적으로 다음과 같습니다:",
      pairNow: "페어링 및 연결", pairingFailed: "페어링에 실패했습니다. Android 설정에서 수동으로 페어링하세요.",
      successVin: "연결이 설정되었습니다. 차량 프로필이 성공적으로 확인되었습니다.",
      cloneWarning: "호환되지 않는 클론 어댑터가 감지되었습니다. 안전을 위해 고급 코딩 기능이 잠겼습니다.",
      viewHealth: "OBD2 건강 및 기능 메뉴", statusPrompt: "아래에서 원하는 OBD2 연결 인터페이스를 선택하세요.",
      foundDevices: "발견된 OBD2 기기", scanDevices: "기기 검색",
      scanHintIos: "BLE OBD2 어댑터가 켜져 있고 iOS 기기 근처에 있는지 확인하세요.",
      scanHintAndroid: "블루투스가 활성화되어 있고 어댑터가 페어링 준비가 되어 있는지 확인하세요.",
      negotiating: "OBD2 핸드셰이크 협상 중", failed: "연결 시도 실패",
      errLayer1: "문제 해결: 블루투스가 비활성화되어 있습니다. 기기 설정에서 블루투스를 활성화하세요.",
      errLayer2: "문제 해결: 연결 시간 초과. 어댑터가 OBD2 포트에 단단히 연결되어 있고 전원 표시등이 켜져 있는지 확인하세요.",
      errLayer5: "문제 해결: OBD2 프로토콜 협상 실패. 차량 점화가 ON 위치에 있는지 확인하세요(엔진 작동 권장).",
      errLayer6: "문제 해결: 어댑터가 연결되었지만 차량 ECU가 응답하지 않습니다. 점화를 켜거나 연결을 다시 시작하세요.",
      errGeneric: "문제 해결: 어댑터에 전원이 있고, 점화가 켜져 있으며, 다른 OBD 앱이 열려 있지 않은지 확인하세요.",
      stepAdapter: "어댑터 연결 및 기능 점수", stepProtocol: "OBD2 프로토콜 협상",
      stepHandshake: "ECU 통신 확인", stepStabilization: "능동 원격 측정 루프 안정화"
    },
    health: {
      titleMenu: "OBD2 건강 및 기능", adapterQuality: "어댑터 품질 및 성능",
      excellent: "우수 (정품)", good: "양호 (표준)", clone: "비호환 / 클론",
      firmware: "펌웨어 버전:", capScore: "기능 점수", latency: "지연 시간 (RTT)",
      protocol: "활성 프로토콜", featureSupport: "애플리케이션 기능 매트릭스",
      matrixReadCodes: "오류 코드 읽기 및 지우기", matrixLiveSensors: "실시간 센서 모니터링 (기본)",
      matrixBattery: "배터리 / 전압 테스트", matrixHighSpeed: "고속 원격 측정 (20Hz)",
      matrixCoding: "ECU 코딩 및 적응", active: "활성", degraded: "저하됨 (느린 RTT)",
      locked: "잠금 (안전 모드)", warning: "보안 잠금:",
      lockExplain: "어댑터가 클론/가짜 칩으로 표시되었습니다. 클론 어댑터는 타이밍 정밀도가 부족하고 쓰기 작업 중 차량을 손상시킬 수 있으므로 코딩 및 적응 기능이 잠겼습니다. 안전한 코딩을 위해 정품 ELM327 v2.1 또는 vLinker 장치를 구입하세요.",
      vehiclePids: "차량 센서 체크리스트",
      checklistPrompt: "차량 ECU에서 지원하는 표준 센서 매개변수(PID)가 아래에 나열되어 있습니다. 체크 표시가 없는 센서는 차량에서 보고되지 않습니다.",
      supportedBadge: "✓ 지원됨", unsupportedBadge: "❌ 지원 안 됨"
    },
    sensor: {
      rpm: "엔진 RPM", speed: "차량 속도", coolant: "냉각수 온도",
      throttle: "스로틀 위치", voltage: "제어 모듈 전압", maf: "MAF 공기 유량",
      iat: "흡기 온도", load: "계산된 엔진 부하", fuel: "연료 수준", oilTemp: "엔진 오일 온도"
    }
  },

  // ── Portuguese ────────────────────────────────────────────────────────────
  pt: {
    common: { supported: "Suportado", copied: "Copiado", cancelBtn: "Cancelar", retry: "TENTAR NOVAMENTE", changeType: "Alterar tipo de conexão" },
    connection: {
      btDisabled: "Bluetooth desativado", btDisabledDesc: "Por favor, ative o Bluetooth para procurar adaptadores OBD2.",
      btDescIos: "Conectar usando adaptadores BLE OBD2 (Veepeak, vLinker).",
      btDescAndroid: "Conectar via adaptadores Bluetooth Classic ou BLE.",
      wifiDesc: "Conectar a adaptadores Wi-Fi (normalmente 192.168.0.10).",
      wifiGuide: "Para se conectar ao seu adaptador Wi-Fi, vá até as configurações de Wi-Fi do telefone e escolha a rede do adaptador OBD (ex.: OBDII, V-LINK). Em seguida, retorne aqui.",
      openWifiSettings: "ABRIR CONFIGURAÇÕES WI-FI", connectWifi: "CONECTAR VIA WI-FI",
      pairRequired: "Emparelhando dispositivo OBD2",
      pairRequiredDesc: "O Android pode solicitar emparelhamento por ser a primeira conexão. O PIN de emparelhamento geralmente é:",
      pairNow: "EMPARELHAR E CONECTAR", pairingFailed: "Emparelhamento falhou. Por favor, emparelhe manualmente nas configurações Android.",
      successVin: "Conexão estabelecida. Perfil do veículo identificado com sucesso.",
      cloneWarning: "Adaptador clone incompatível detectado. Recursos avançados de codificação estão bloqueados para sua segurança.",
      viewHealth: "MENU DE SAÚDE E CAPACIDADE OBD2", statusPrompt: "Selecione sua interface de conexão OBD2 preferida abaixo.",
      foundDevices: "DISPOSITIVOS OBD2 ENCONTRADOS", scanDevices: "BUSCAR DISPOSITIVOS",
      scanHintIos: "Certifique-se de que o adaptador BLE OBD2 esteja ligado e próximo ao dispositivo iOS.",
      scanHintAndroid: "Certifique-se de que o Bluetooth esteja ativo e que o adaptador esteja pronto para emparelhar.",
      negotiating: "NEGOCIANDO HANDSHAKE OBD2", failed: "FALHA NA TENTATIVA DE CONEXÃO",
      errLayer1: "Solução: Bluetooth está desativado. Por favor, ative-o nas configurações do dispositivo.",
      errLayer2: "Solução: Tempo de conexão esgotado. Certifique-se de que o adaptador esteja firmemente inserido na porta OBD2 e que o indicador de energia esteja aceso.",
      errLayer5: "Solução: Falha na negociação do protocolo OBD2. Certifique-se de que a ignição do veículo esteja na posição ON (recomenda-se com o motor em funcionamento).",
      errLayer6: "Solução: Adaptador conectado, mas a ECU do veículo não está respondendo. Ligue a ignição ou reinicie a conexão.",
      errGeneric: "Solução: Certifique-se de que o adaptador está energizado, a ignição está ligada e nenhum outro aplicativo OBD está aberto.",
      stepAdapter: "Conexão do adaptador e pontuação de capacidade", stepProtocol: "Negociação do protocolo OBD2",
      stepHandshake: "Verificação da comunicação da ECU", stepStabilization: "Estabilização do loop de telemetria ativo"
    },
    health: {
      titleMenu: "SAÚDE E CAPACIDADE OBD2", adapterQuality: "QUALIDADE E DESEMPENHO DO ADAPTADOR",
      excellent: "EXCELENTE (ORIGINAL)", good: "BOM (PADRÃO)", clone: "INCOMPATÍVEL / CLONE",
      firmware: "Versão do firmware:", capScore: "Pontuação de capacidade", latency: "Latência (RTT)",
      protocol: "Protocolo ativo", featureSupport: "MATRIZ DE RECURSOS DO APLICATIVO",
      matrixReadCodes: "Ler e apagar códigos de falha", matrixLiveSensors: "Monitoramento de sensores ao vivo (Básico)",
      matrixBattery: "Teste de bateria / tensão", matrixHighSpeed: "Telemetria de alta velocidade (20Hz)",
      matrixCoding: "Codificação e adaptações da ECU", active: "Ativo", degraded: "Degradado (RTT lento)",
      locked: "Bloqueado (Modo seguro)", warning: "BLOQUEIO DE SEGURANÇA:",
      lockExplain: "Seu adaptador foi identificado como um chip clone/falso. Como adaptadores clone carecem de precisão de temporização e podem danificar o veículo durante operações de escrita, os recursos de codificação e adaptação estão bloqueados. Obtenha um dispositivo original ELM327 v2.1 ou vLinker para codificação segura.",
      vehiclePids: "LISTA DE VERIFICAÇÃO DE SENSORES DO VEÍCULO",
      checklistPrompt: "Os parâmetros de sensor padrão (PIDs) suportados pela ECU do seu veículo estão listados abaixo. Sensores sem marca de verificação não são relatados pelo seu veículo.",
      supportedBadge: "✓ SUPORTADO", unsupportedBadge: "❌ NÃO SUPORTADO"
    },
    sensor: {
      rpm: "Rotação do motor (RPM)", speed: "Velocidade do veículo", coolant: "Temp. do líquido de arrefecimento",
      throttle: "Posição do acelerador", voltage: "Tensão do módulo de controle", maf: "Fluxo de ar MAF",
      iat: "Temp. do ar de admissão", load: "Carga calculada do motor", fuel: "Nível de combustível",
      oilTemp: "Temp. do óleo do motor"
    }
  },

  // ── Polish ────────────────────────────────────────────────────────────────
  pl: {
    common: { supported: "Obsługiwane", copied: "Skopiowano", cancelBtn: "Anuluj", retry: "SPRÓBUJ PONOWNIE", changeType: "Zmień typ połączenia" },
    connection: {
      btDisabled: "Bluetooth wyłączony", btDisabledDesc: "Włącz Bluetooth, aby wyszukać adaptery OBD2.",
      btDescIos: "Połącz za pomocą adapterów BLE OBD2 (Veepeak, vLinker).",
      btDescAndroid: "Połącz przez Classic Bluetooth lub adaptery BLE.",
      wifiDesc: "Połącz z adapterami Wi-Fi (zazwyczaj 192.168.0.10).",
      wifiGuide: "Aby połączyć się z adapterem Wi-Fi, przejdź do ustawień Wi-Fi telefonu i wybierz sieć adaptera OBD (np. OBDII, V-LINK). Następnie wróć tutaj.",
      openWifiSettings: "OTWÓRZ USTAWIENIA WI-FI", connectWifi: "POŁĄCZ PRZEZ WI-FI",
      pairRequired: "Parowanie urządzenia OBD2",
      pairRequiredDesc: "Android może prosić o parowanie, ponieważ łączysz się po raz pierwszy. Kod PIN parowania to zazwyczaj:",
      pairNow: "PARUJ I POŁĄCZ", pairingFailed: "Parowanie nie powiodło się. Sparuj ręcznie w ustawieniach Androida.",
      successVin: "Połączenie nawiązane. Profil pojazdu zidentyfikowany pomyślnie.",
      cloneWarning: "Wykryto niekompatybilny klon adaptera. Zaawansowane funkcje kodowania są zablokowane dla Twojego bezpieczeństwa.",
      viewHealth: "MENU ZDROWIA I MOŻLIWOŚCI OBD2", statusPrompt: "Wybierz preferowany interfejs połączenia OBD2 poniżej.",
      foundDevices: "ZNALEZIONE URZĄDZENIA OBD2", scanDevices: "WYSZUKAJ URZĄDZENIA",
      scanHintIos: "Upewnij się, że adapter BLE OBD2 jest włączony i w pobliżu urządzenia iOS.",
      scanHintAndroid: "Upewnij się, że Bluetooth jest aktywny, a adapter jest gotowy do parowania.",
      negotiating: "NEGOCJOWANIE HANDSHAKE OBD2", failed: "PRÓBA POŁĄCZENIA NIE POWIODŁA SIĘ",
      errLayer1: "Rozwiązanie: Bluetooth jest wyłączony. Włącz go w ustawieniach urządzenia.",
      errLayer2: "Rozwiązanie: Przekroczono limit czasu połączenia. Upewnij się, że adapter jest mocno wciśnięty w port OBD2 i świeci wskaźnik zasilania.",
      errLayer5: "Rozwiązanie: Negocjacja protokołu OBD2 nie powiodła się. Upewnij się, że zapłon pojazdu jest w pozycji ON (zalecane uruchomienie silnika).",
      errLayer6: "Rozwiązanie: Adapter podłączony, ale ECU pojazdu nie odpowiada. Włącz zapłon lub zrestartuj połączenie.",
      errGeneric: "Rozwiązanie: Upewnij się, że adapter ma zasilanie, zapłon jest włączony i żadna inna aplikacja OBD nie jest otwarta.",
      stepAdapter: "Połączenie adaptera i wynik możliwości", stepProtocol: "Negocjacja protokołu OBD2",
      stepHandshake: "Weryfikacja komunikacji ECU", stepStabilization: "Stabilizacja aktywnej pętli telemetrii"
    },
    health: {
      titleMenu: "ZDROWIE I MOŻLIWOŚCI OBD2", adapterQuality: "JAKOŚĆ I WYDAJNOŚĆ ADAPTERA",
      excellent: "DOSKONAŁY (ORYGINALNY)", good: "DOBRY (STANDARDOWY)", clone: "NIEKOMPATYBILNY / KLON",
      firmware: "Wersja oprogramowania:", capScore: "Wynik możliwości", latency: "Opóźnienie (RTT)",
      protocol: "Aktywny protokół", featureSupport: "MATRYCA FUNKCJI APLIKACJI",
      matrixReadCodes: "Odczyt i kasowanie kodów usterek", matrixLiveSensors: "Monitorowanie czujników na żywo (Podstawowe)",
      matrixBattery: "Test akumulatora / napięcia", matrixHighSpeed: "Telemetria wysokiej prędkości (20Hz)",
      matrixCoding: "Kodowanie i adaptacje ECU", active: "Aktywny", degraded: "Zdegradowany (Wolny RTT)",
      locked: "Zablokowany (Tryb bezpieczny)", warning: "BLOKADA BEZPIECZEŃSTWA:",
      lockExplain: "Twój adapter został oznaczony jako klon/fałszywy chip. Ponieważ adaptery klonowane nie mają precyzji timingu i mogą uszkodzić pojazd podczas operacji zapisu, funkcje kodowania i adaptacji są zablokowane. Uzyskaj oryginalny ELM327 v2.1 lub urządzenie vLinker do bezpiecznego kodowania.",
      vehiclePids: "LISTA KONTROLNA CZUJNIKÓW POJAZDU",
      checklistPrompt: "Poniżej wymieniono standardowe parametry czujników (PID) obsługiwane przez ECU pojazdu. Czujniki bez znacznika wyboru nie są raportowane przez pojazd.",
      supportedBadge: "✓ OBSŁUGIWANE", unsupportedBadge: "❌ NIEOBSŁUGIWANE"
    },
    sensor: {
      rpm: "Obroty silnika (RPM)", speed: "Prędkość pojazdu", coolant: "Temp. cieczy chłodzącej",
      throttle: "Pozycja przepustnicy", voltage: "Napięcie modułu sterującego", maf: "Przepływ powietrza MAF",
      iat: "Temp. powietrza dolotowego", load: "Obliczone obciążenie silnika", fuel: "Poziom paliwa",
      oilTemp: "Temp. oleju silnikowego"
    }
  },

  // ── Dutch ─────────────────────────────────────────────────────────────────
  nl: {
    common: { supported: "Ondersteund", copied: "Gekopieerd", cancelBtn: "Annuleren", retry: "OPNIEUW PROBEREN", changeType: "Verbindingstype wijzigen" },
    connection: {
      btDisabled: "Bluetooth uitgeschakeld", btDisabledDesc: "Schakel Bluetooth in om OBD2-adapters te zoeken.",
      btDescIos: "Verbinding via BLE OBD2-adapters (Veepeak, vLinker).",
      btDescAndroid: "Verbinding via Classic Bluetooth of BLE-adapters.",
      wifiDesc: "Verbinding met Wi-Fi adapters (doorgaans 192.168.0.10).",
      wifiGuide: "Om verbinding te maken met uw Wi-Fi adapter, ga naar de Wi-Fi-instellingen van uw telefoon en kies het OBD-adapternetwerk (bijv. OBDII, V-LINK). Keer dan hier terug.",
      openWifiSettings: "WI-FI INSTELLINGEN OPENEN", connectWifi: "VERBINDEN VIA WI-FI",
      pairRequired: "OBD2-apparaat koppelen",
      pairRequiredDesc: "Android kan om koppeling vragen omdat u voor het eerst verbinding maakt. De koppel-PIN is doorgaans:",
      pairNow: "KOPPELEN EN VERBINDEN", pairingFailed: "Koppelen mislukt. Koppel handmatig in de Android-instellingen.",
      successVin: "Verbinding tot stand gebracht. Voertuigprofiel succesvol geïdentificeerd.",
      cloneWarning: "Incompatibele kloonadapter gedetecteerd. Geavanceerde coderingsfuncties zijn vergrendeld voor uw veiligheid.",
      viewHealth: "OBD2 GEZONDHEIDS- EN CAPACITEITSMENU", statusPrompt: "Selecteer uw gewenste OBD2-verbindingsinterface hieronder.",
      foundDevices: "GEVONDEN OBD2-APPARATEN", scanDevices: "APPARATEN ZOEKEN",
      scanHintIos: "Zorg ervoor dat de BLE OBD2-adapter is ingeschakeld en in de buurt van uw iOS-apparaat.",
      scanHintAndroid: "Zorg ervoor dat Bluetooth actief is en dat de adapter klaar is voor koppeling.",
      negotiating: "OBD2-HANDDRUK ONDERHANDELEN", failed: "VERBINDINGSPOGING MISLUKT",
      errLayer1: "Oplossing: Bluetooth is uitgeschakeld. Schakel het in via de apparaatinstellingen.",
      errLayer2: "Oplossing: Verbindingstime-out. Zorg ervoor dat de adapter stevig in de OBD2-poort zit en het voedingsindicatorlampje brandt.",
      errLayer5: "Oplossing: OBD2-protocolonderhandeling mislukt. Zorg ervoor dat de ontsteking van het voertuig in de ON-stand staat (motor aan wordt aanbevolen).",
      errLayer6: "Oplossing: Adapter verbonden, maar voertuig-ECU reageert niet. Zet de ontsteking aan of herstart de verbinding.",
      errGeneric: "Oplossing: Zorg ervoor dat de adapter stroom heeft, de ontsteking aan is en geen andere OBD-app open is.",
      stepAdapter: "Adapterverbinding en capaciteitsscore", stepProtocol: "OBD2-protocolonderhandeling",
      stepHandshake: "ECU-communicatieverificatie", stepStabilization: "Stabilisatie van de actieve telemetrielus"
    },
    health: {
      titleMenu: "OBD2 GEZONDHEID EN CAPACITEIT", adapterQuality: "ADAPTERKWALITEIT EN PRESTATIES",
      excellent: "UITSTEKEND (ORIGINEEL)", good: "GOED (STANDAARD)", clone: "INCOMPATIBEL / KLOON",
      firmware: "Firmwareversie:", capScore: "Capaciteitsscore", latency: "Latentie (RTT)",
      protocol: "Actief protocol", featureSupport: "TOEPASSINGSFUNCTIEMATRIX",
      matrixReadCodes: "Foutcodes lezen en wissen", matrixLiveSensors: "Live sensorcontrole (Basis)",
      matrixBattery: "Batterij- / spanningstest", matrixHighSpeed: "Hoge-snelheid telemetrie (20Hz)",
      matrixCoding: "ECU-codering en aanpassingen", active: "Actief", degraded: "Gedegradeerd (Trage RTT)",
      locked: "Vergrendeld (Veilige modus)", warning: "BEVEILIGINGSVERGRENDELING:",
      lockExplain: "Uw adapter is gemarkeerd als een kloon/nep-chip. Omdat klonadapters ontbrekende timingprecisie hebben en het voertuig tijdens schrijfbewerkingen kunnen beschadigen, zijn coderings- en aanpassingsfuncties vergrendeld. Schaf een origineel ELM327 v2.1- of vLinker-apparaat aan voor veilige codering.",
      vehiclePids: "VOERTUIGSENSORCHECKLIST",
      checklistPrompt: "De standaard sensorparameters (PID's) die worden ondersteund door de ECU van uw voertuig staan hieronder vermeld. Sensoren zonder vinkje worden niet gerapporteerd door uw voertuig.",
      supportedBadge: "✓ ONDERSTEUND", unsupportedBadge: "❌ NIET ONDERSTEUND"
    },
    sensor: {
      rpm: "Motortoerental (RPM)", speed: "Voertuigsnelheid", coolant: "Koelvloeistoftemperatuur",
      throttle: "Smoorkleppositie", voltage: "Controlemodulevoltage", maf: "MAF luchtstroomsnelheid",
      iat: "Inlaatluchttemperatuur", load: "Berekende motorbelasting", fuel: "Brandstofniveau",
      oilTemp: "Motorolietemperatuur"
    }
  },

  // ── Swedish ───────────────────────────────────────────────────────────────
  sv: {
    common: { supported: "Stöds", copied: "Kopierat", cancelBtn: "Avbryt", retry: "FÖRSÖK IGEN", changeType: "Ändra anslutningstyp" },
    connection: {
      btDisabled: "Bluetooth inaktiverat", btDisabledDesc: "Aktivera Bluetooth för att söka efter OBD2-adaptrar.",
      btDescIos: "Anslut via BLE OBD2-adaptrar (Veepeak, vLinker).", btDescAndroid: "Anslut via Classic Bluetooth- eller BLE-adaptrar.",
      wifiDesc: "Anslut till Wi-Fi-adaptrar (vanligtvis 192.168.0.10).",
      wifiGuide: "För att ansluta till din Wi-Fi-adapter, gå till telefonens Wi-Fi-inställningar och välj OBD-adapterns nätverk (t.ex. OBDII, V-LINK). Återvänd sedan hit.",
      openWifiSettings: "ÖPPNA WI-FI-INSTÄLLNINGAR", connectWifi: "ANSLUT VIA WI-FI",
      pairRequired: "Parkopplar OBD2-enhet",
      pairRequiredDesc: "Android kan begära parkoppling eftersom du ansluter för första gången. PIN-koden för parkoppling är vanligtvis:",
      pairNow: "PARKOPPLA OCH ANSLUT", pairingFailed: "Parkoppling misslyckades. Parkoppla manuellt i Android-inställningarna.",
      successVin: "Anslutning upprättad. Fordonsprofil identifierad.",
      cloneWarning: "Inkompatibel klonadapter hittades. Avancerade kodningsfunktioner är låsta för din säkerhet.",
      viewHealth: "OBD2-HÄLSO- OCH KAPACITETSMENY", statusPrompt: "Välj ditt föredragna OBD2-anslutningsgränssnitt nedan.",
      foundDevices: "HITTADE OBD2-ENHETER", scanDevices: "SÖK EFTER ENHETER",
      scanHintIos: "Se till att BLE OBD2-adaptern är påslagen och nära din iOS-enhet.",
      scanHintAndroid: "Se till att Bluetooth är aktivt och att adaptern är redo för parkoppling.",
      negotiating: "FÖRHANDLAR OBD2-HANDSKAKNING", failed: "ANSLUTNINGSFÖRSÖK MISSLYCKADES",
      errLayer1: "Felsökning: Bluetooth är inaktiverat. Aktivera det i enhetsinställningarna.",
      errLayer2: "Felsökning: Anslutningstimeout. Se till att adaptern sitter ordentligt i OBD2-porten och att strömindikatorn lyser.",
      errLayer5: "Felsökning: OBD2-protokollförhandling misslyckades. Se till att fordonets tändning är i ON-läge (motor i drift rekommenderas).",
      errLayer6: "Felsökning: Adapter ansluten, men fordonets ECU svarar inte. Slå på tändningen eller starta om anslutningen.",
      errGeneric: "Felsökning: Se till att adaptern har ström, tändningen är på och inga andra OBD-appar är öppna.",
      stepAdapter: "Adapteranslutning och kapacitetspoäng", stepProtocol: "OBD2-protokollförhandling",
      stepHandshake: "ECU-kommunikationsverifiering", stepStabilization: "Stabilisering av aktiv telemetrisloop"
    },
    health: {
      titleMenu: "OBD2-HÄLSA OCH KAPACITET", adapterQuality: "ADAPTERKVALITET OCH PRESTANDA",
      excellent: "UTMÄRKT (ORIGINAL)", good: "BRA (STANDARD)", clone: "INKOMPATIBEL / KLON",
      firmware: "Firmwareversion:", capScore: "Kapacitetspoäng", latency: "Latens (RTT)",
      protocol: "Aktivt protokoll", featureSupport: "APPLIKATIONSFUNKTIONSMATRIS",
      matrixReadCodes: "Läs och rensa felkoder", matrixLiveSensors: "Live sensorövervakning (Grundläggande)",
      matrixBattery: "Batteri- / spänningstest", matrixHighSpeed: "Höghastighetsttelemetri (20Hz)",
      matrixCoding: "ECU-kodning och anpassningar", active: "Aktiv", degraded: "Degraderad (Långsam RTT)",
      locked: "Låst (Säkert läge)", warning: "SÄKERHETSLÅS:",
      lockExplain: "Din adapter har markerats som ett klon-/falskt chip. Eftersom klonadaptrar saknar tidsprecision och kan skada fordonet under skrivoperationer, är kodnings- och anpassningsfunktioner låsta. Skaffa en original ELM327 v2.1- eller vLinker-enhet för säker kodning.",
      vehiclePids: "FORDONSSENSORS CHECKLISTA",
      checklistPrompt: "Standardsensorparametrar (PID) som stöds av fordonets ECU listas nedenfor. Sensorer utan bock rapporteras inte av fordonet.",
      supportedBadge: "✓ STÖDS", unsupportedBadge: "❌ STÖDS INTE"
    },
    sensor: {
      rpm: "Motorvarvtal (RPM)", speed: "Fordonshastighet", coolant: "Kylvätsketemperatur",
      throttle: "Gasreglageposition", voltage: "Styrenhetsspänning", maf: "MAF luftflöde",
      iat: "Insugsluftstemperatur", load: "Beräknad motorbelastning", fuel: "Bränslenivå", oilTemp: "Motoroljetemperatur"
    }
  },

  // ── Danish ────────────────────────────────────────────────────────────────
  da: {
    common: { supported: "Understøttet", copied: "Kopieret", cancelBtn: "Annuller", retry: "FORSØG FORBINDELSE IGEN", changeType: "Skift forbindelsestype" },
    connection: {
      btDisabled: "Bluetooth deaktiveret", btDisabledDesc: "Aktiver venligst Bluetooth for at søge efter OBD2-adaptere.",
      btDescIos: "Forbind via BLE OBD2-adaptere (Veepeak, vLinker).", btDescAndroid: "Forbind via Classic Bluetooth- eller BLE-adaptere.",
      wifiDesc: "Forbind til Wi-Fi-adaptere (typisk 192.168.0.10).",
      wifiGuide: "For at oprette forbindelse til din Wi-Fi-adapter, gå til telefonens Wi-Fi-indstillinger og vælg OBD-adapterens netværk (f.eks. OBDII, V-LINK). Vend derefter tilbage hertil.",
      openWifiSettings: "ÅBEN WI-FI INDSTILLINGER", connectWifi: "FORBIND VIA WI-FI",
      pairRequired: "Parring af OBD2-enhed",
      pairRequiredDesc: "Android kan anmode om parring, da du forbinder for første gang. Parring-PIN er typisk:",
      pairNow: "PAR OG FORBIND", pairingFailed: "Parring mislykkedes. Par manuelt i Android-indstillinger.",
      successVin: "Forbindelse etableret. Køretøjsprofil identificeret.",
      cloneWarning: "Inkompatibel kloneadapter fundet. Avancerede kodningsfunktioner er låst for din sikkerhed.",
      viewHealth: "OBD2 SUNDHEDS- OG KAPACITETSMENU", statusPrompt: "Vælg din foretrukne OBD2-forbindelsesgrænseflade nedenfor.",
      foundDevices: "FUNDNE OBD2-ENHEDER", scanDevices: "SØG EFTER ENHEDER",
      scanHintIos: "Sørg for at BLE OBD2-adapteren er tændt og nær din iOS-enhed.",
      scanHintAndroid: "Sørg for at Bluetooth er aktivt og at adapteren er klar til parring.",
      negotiating: "FORHANDLER OBD2-HANDSHAKE", failed: "FORBINDELSESFORSØG MISLYKKEDES",
      errLayer1: "Fejlfinding: Bluetooth er deaktiveret. Aktiver det i enhedsindstillingerne.",
      errLayer2: "Fejlfinding: Forbindelsestimeout. Sørg for at adapteren sidder godt i OBD2-porten og at strømindikatoren lyser.",
      errLayer5: "Fejlfinding: OBD2-protokolforhandling mislykkedes. Sørg for at køretøjets tændingsnøgle er i ON-position (motoren i gang anbefales).",
      errLayer6: "Fejlfinding: Adapter tilsluttet, men køretøjets ECU svarer ikke. Tænd for tændingen eller genstart forbindelsen.",
      errGeneric: "Fejlfinding: Sørg for at adapteren har strøm, tændingen er tændt og ingen anden OBD-app er åben.",
      stepAdapter: "Adaptertilslutning og kapacitetsscore", stepProtocol: "OBD2-protokolforhandling",
      stepHandshake: "ECU-kommunikationsverifikation", stepStabilization: "Stabilisering af aktiv telemetrisløjfe"
    },
    health: {
      titleMenu: "OBD2 SUNDHED OG KAPACITET", adapterQuality: "ADAPTERKVALITET OG YDEEVNE",
      excellent: "FREMRAGENDE (ORIGINAL)", good: "GOD (STANDARD)", clone: "INKOMPATIBEL / KLON",
      firmware: "Firmwareversion:", capScore: "Kapacitetsscore", latency: "Latens (RTT)",
      protocol: "Aktivt protokol", featureSupport: "APPLIKATIONSFUNKTIONSMATRIX",
      matrixReadCodes: "Læs og slet fejlkoder", matrixLiveSensors: "Live sensorovervågning (Grundlæggende)",
      matrixBattery: "Batteri- / spændingstest", matrixHighSpeed: "Højhastigheds-telemetri (20Hz)",
      matrixCoding: "ECU-kodning og tilpasninger", active: "Aktiv", degraded: "Degraderet (Langsom RTT)",
      locked: "Låst (Sikker tilstand)", warning: "SIKKERHEDSLÅS:",
      lockExplain: "Din adapter er markeret som en klon/falsk chip. Da kloneadaptere mangler timingpræcision og kan beskadige køretøjet under skriveoperationer, er kodnings- og tilpasningsfunktioner låst. Anskaf en original ELM327 v2.1- eller vLinker-enhed til sikker kodning.",
      vehiclePids: "KØRETØJSSENSOR-TJEKLISTE",
      checklistPrompt: "Standardsensorparametre (PID'er), der understøttes af køretøjets ECU, er angivet nedenfor. Sensorer uden flueben rapporteres ikke af køretøjet.",
      supportedBadge: "✓ UNDERSTØTTET", unsupportedBadge: "❌ IKKE UNDERSTØTTET"
    },
    sensor: {
      rpm: "Motorturtæller (RPM)", speed: "Køretøjshastighed", coolant: "Kølervæsketemperatur",
      throttle: "Gasklap-position", voltage: "Kontrolmodulspænding", maf: "MAF luftstrøm",
      iat: "Indtagslufttemperatur", load: "Beregnet motorbelastning", fuel: "Brændstofniveau", oilTemp: "Motorolietemperatur"
    }
  },

  // ── Finnish ───────────────────────────────────────────────────────────────
  fi: {
    common: { supported: "Tuettu", copied: "Kopioitu", cancelBtn: "Peruuta", retry: "YRITÄ YHTEYTTÄ UUDELLEEN", changeType: "Muuta yhteystyyppiä" },
    connection: {
      btDisabled: "Bluetooth pois käytöstä", btDisabledDesc: "Ota Bluetooth käyttöön etsiäksesi OBD2-sovittimia.",
      btDescIos: "Yhdistä BLE OBD2 -sovittimien kautta (Veepeak, vLinker).", btDescAndroid: "Yhdistä Classic Bluetooth- tai BLE-sovittimien kautta.",
      wifiDesc: "Yhdistä Wi-Fi-sovittimiin (yleensä 192.168.0.10).",
      wifiGuide: "Yhdistääksesi Wi-Fi-sovittimeen, siirry puhelimen Wi-Fi-asetuksiin ja valitse OBD-sovittimen verkko (esim. OBDII, V-LINK). Palaa sitten tähän.",
      openWifiSettings: "AVAA WI-FI-ASETUKSET", connectWifi: "YHDISTÄ WI-FIN KAUTTA",
      pairRequired: "Paritetaan OBD2-laite",
      pairRequiredDesc: "Android saattaa pyytää parittamista, koska yhdistät ensimmäistä kertaa. Parituksen PIN on yleensä:",
      pairNow: "PARITA JA YHDISTÄ", pairingFailed: "Paritusyritys epäonnistui. Parita manuaalisesti Android-asetuksissa.",
      successVin: "Yhteys muodostettu. Ajoneuvoprofiili tunnistettu onnistuneesti.",
      cloneWarning: "Yhteensopimaton kloonisovittein havaittu. Kehittyneet koodausominaisuudet on lukittu turvallisuutesi vuoksi.",
      viewHealth: "OBD2 TERVEYS- JA KYKYVALIKKO", statusPrompt: "Valitse haluamasi OBD2-yhteyskäyttöliittymä alta.",
      foundDevices: "LÖYDETYT OBD2-LAITTEET", scanDevices: "ETSI LAITTEITA",
      scanHintIos: "Varmista, että BLE OBD2 -sovitin on päällä ja lähellä iOS-laitettasi.",
      scanHintAndroid: "Varmista, että Bluetooth on aktiivinen ja sovitin on valmis parittamaan.",
      negotiating: "NEUVOTELLAAN OBD2-KÄTTELYSTÄ", failed: "YHTEYSYRITYS EPÄONNISTUI",
      errLayer1: "Vianmääritys: Bluetooth on pois käytöstä. Ota se käyttöön laiteasetuksissa.",
      errLayer2: "Vianmääritys: Yhteys aikakatkaistiin. Varmista, että sovitin on tiukasti OBD2-portissa ja virran merkkivalo palaa.",
      errLayer5: "Vianmääritys: OBD2-protokollaneuvottelu epäonnistui. Varmista, että ajoneuvon virta-avain on ON-asennossa (moottorin käynti suositellaan).",
      errLayer6: "Vianmääritys: Sovitin yhdistetty, mutta ajoneuvon ECU ei vastaa. Käynnistä virta tai käynnistä yhteys uudelleen.",
      errGeneric: "Vianmääritys: Varmista, että sovittimessa on virta, virta on päällä ja muita OBD-sovelluksia ei ole auki.",
      stepAdapter: "Sovittimen yhteys ja kykypistemäärä", stepProtocol: "OBD2-protokollaneuvottelu",
      stepHandshake: "ECU-viestinnän varmistus", stepStabilization: "Aktiivisen telemetriasilmukan vakautus"
    },
    health: {
      titleMenu: "OBD2 TERVEYS JA KYVYT", adapterQuality: "SOVITTIMEN LAATU JA SUORITUSKYKY",
      excellent: "ERINOMAINEN (ALKUPERÄINEN)", good: "HYVÄ (VAKIO)", clone: "YHTEENSOPIMATON / KLOONI",
      firmware: "Laiteohjelmistoversio:", capScore: "Kykypistemäärä", latency: "Viive (RTT)",
      protocol: "Aktiivinen protokolla", featureSupport: "SOVELLUKSEN OMINAISUUSMATRIISI",
      matrixReadCodes: "Vikakoodien lukeminen ja tyhjentäminen", matrixLiveSensors: "Reaaliaikainen anturiseuranta (Perus)",
      matrixBattery: "Akku- / jännitystesti", matrixHighSpeed: "Suurnopeus-telemetria (20Hz)",
      matrixCoding: "ECU-koodaus ja mukautukset", active: "Aktiivinen", degraded: "Heikentynyt (Hidas RTT)",
      locked: "Lukittu (Turvallinen tila)", warning: "TURVALUKKO:",
      lockExplain: "Sovittimesi on merkitty klooni-/vääräksi siruksi. Koska kloonisoittimet eivät ole tarkkoja ajoituksessa ja voivat vaurioittaa ajoneuvoa kirjoitusoperaatioissa, koodaus- ja mukautusominaisuudet on lukittu. Hanki alkuperäinen ELM327 v2.1 tai vLinker-laite turvalliseen koodaukseen.",
      vehiclePids: "AJONEUVOANTURIN TARKISTUSLISTA",
      checklistPrompt: "Ajoneuvon ECU:n tukemat vakioanturityypit (PID) on lueteltu alla. Anturit ilman rastia eivät ole ajoneuvosi raportoimia.",
      supportedBadge: "✓ TUETTU", unsupportedBadge: "❌ EI TUETTU"
    },
    sensor: {
      rpm: "Moottorin kierrosluku (RPM)", speed: "Ajoneuvon nopeus", coolant: "Jäähdytysnesteen lämpötila",
      throttle: "Kaasupoljin-asento", voltage: "Ohjausmoduulin jännite", maf: "MAF-ilmavirta",
      iat: "Imusahko-lämpötila", load: "Laskettu moottorikuorma", fuel: "Polttoainetaso", oilTemp: "Moottoriöljyn lämpötila"
    }
  },

  // ── Czech ─────────────────────────────────────────────────────────────────
  cs: {
    common: { supported: "Podporováno", copied: "Zkopírováno", cancelBtn: "Zrušit", retry: "ZKUSIT ZNOVU", changeType: "Změnit typ připojení" },
    connection: {
      btDisabled: "Bluetooth je vypnuto", btDisabledDesc: "Zapněte prosím Bluetooth, abyste mohli vyhledat adaptéry OBD2.",
      btDescIos: "Připojte se prostřednictvím BLE OBD2 adaptérů (Veepeak, vLinker).",
      btDescAndroid: "Připojte se přes Classic Bluetooth nebo BLE adaptéry.",
      wifiDesc: "Připojte se k Wi-Fi adaptérům (obvykle 192.168.0.10).",
      wifiGuide: "Pro připojení k Wi-Fi adaptéru přejděte do nastavení Wi-Fi telefonu a vyberte síť OBD adaptéru (např. OBDII, V-LINK). Poté se vraťte sem.",
      openWifiSettings: "OTEVŘÍT NASTAVENÍ WI-FI", connectWifi: "PŘIPOJIT PŘES WI-FI",
      pairRequired: "Párování zařízení OBD2",
      pairRequiredDesc: "Android může požádat o párování, protože se připojujete poprvé. PIN párování je obvykle:",
      pairNow: "SPÁROVAT A PŘIPOJIT", pairingFailed: "Párování se nezdařilo. Spárujte ručně v nastavení Androidu.",
      successVin: "Připojení navázáno. Profil vozidla byl úspěšně identifikován.",
      cloneWarning: "Byl nalezen nekompatibilní klonovaný adaptér. Pokročilé funkce kódování jsou uzamčeny pro vaši bezpečnost.",
      viewHealth: "NABÍDKA ZDRAVÍ A SCHOPNOSTÍ OBD2", statusPrompt: "Vyberte preferované rozhraní OBD2 připojení níže.",
      foundDevices: "NALEZENÁ ZAŘÍZENÍ OBD2", scanDevices: "VYHLEDAT ZAŘÍZENÍ",
      scanHintIos: "Ujistěte se, že BLE OBD2 adaptér je zapnutý a v blízkosti vašeho iOS zařízení.",
      scanHintAndroid: "Ujistěte se, že Bluetooth je aktivní a adaptér je připraven ke spárování.",
      negotiating: "PROBÍHÁ DOHODOVÁNÍ OBD2", failed: "POKUS O PŘIPOJENÍ SELHAL",
      errLayer1: "Řešení: Bluetooth je vypnuto. Zapněte ho v nastavení zařízení.",
      errLayer2: "Řešení: Vypršel čas spojení. Ujistěte se, že adaptér je pevně zasunut do portu OBD2 a jeho kontrolka svítí.",
      errLayer5: "Řešení: Dohodování protokolu OBD2 selhalo. Ujistěte se, že zapalování vozidla je v poloze ON (doporučuje se zapnutý motor).",
      errLayer6: "Řešení: Adaptér připojen, ale řídicí jednotka vozidla nereaguje. Zapněte zapalování nebo restartujte připojení.",
      errGeneric: "Řešení: Ujistěte se, že adaptér má napájení, zapalování je zapnuté a žádná jiná OBD aplikace není otevřená.",
      stepAdapter: "Připojení adaptéru a skóre schopností", stepProtocol: "Dohodování protokolu OBD2",
      stepHandshake: "Ověření komunikace ECU", stepStabilization: "Stabilizace aktivní smyčky telemetrie"
    },
    health: {
      titleMenu: "ZDRAVÍ A SCHOPNOSTI OBD2", adapterQuality: "KVALITA A VÝKON ADAPTÉRU",
      excellent: "VÝBORNÝ (ORIGINÁLNÍ)", good: "DOBRÝ (STANDARDNÍ)", clone: "NEKOMPATIBILNÍ / KLON",
      firmware: "Verze firmwaru:", capScore: "Skóre schopností", latency: "Latence (RTT)",
      protocol: "Aktivní protokol", featureSupport: "MATICE FUNKCÍ APLIKACE",
      matrixReadCodes: "Čtení a mazání kódů závad", matrixLiveSensors: "Sledování senzorů v reálném čase (Základní)",
      matrixBattery: "Test baterie / napětí", matrixHighSpeed: "Vysokorychlostní telemetrie (20Hz)",
      matrixCoding: "Kódování a adaptace ECU", active: "Aktivní", degraded: "Snížený výkon (Pomalý RTT)",
      locked: "Uzamčeno (Bezpečný režim)", warning: "BEZPEČNOSTNÍ ZÁMEK:",
      lockExplain: "Váš adaptér byl označen jako klonovaný/falešný čip. Protože klonované adaptéry postrádají přesnost časování a mohou poškodit vozidlo při operacích zápisu, funkce kódování a adaptace jsou uzamčeny. Pořiďte si originální zařízení ELM327 v2.1 nebo vLinker pro bezpečné kódování.",
      vehiclePids: "KONTROLNÍ SEZNAM SENZORŮ VOZIDLA",
      checklistPrompt: "Standardní parametry senzorů (PID), které podporuje řídicí jednotka vašeho vozidla, jsou uvedeny níže. Senzory bez zatržítka nejsou vozidlem hlášeny.",
      supportedBadge: "✓ PODPOROVÁNO", unsupportedBadge: "❌ NEPODPOROVÁNO"
    },
    sensor: {
      rpm: "Otáčky motoru (RPM)", speed: "Rychlost vozidla", coolant: "Teplota chladicí kapaliny",
      throttle: "Poloha škrticí klapky", voltage: "Napětí řídicího modulu", maf: "Průtok vzduchu MAF",
      iat: "Teplota nasávaného vzduchu", load: "Vypočtené zatížení motoru", fuel: "Hladina paliva", oilTemp: "Teplota motorového oleje"
    }
  },

  // ── Hungarian ─────────────────────────────────────────────────────────────
  hu: {
    common: { supported: "Támogatott", copied: "Másolva", cancelBtn: "Mégse", retry: "KAPCSOLAT ÚJRAPRÓBÁLÁSA", changeType: "Kapcsolat típusának módosítása" },
    connection: {
      btDisabled: "Bluetooth letiltva", btDisabledDesc: "Kérem, engedélyezze a Bluetooth-t az OBD2 adapterek kereséséhez.",
      btDescIos: "Csatlakozzon BLE OBD2 adaptereken keresztül (Veepeak, vLinker).",
      btDescAndroid: "Csatlakozzon Classic Bluetooth vagy BLE adaptereken keresztül.",
      wifiDesc: "Csatlakozzon Wi-Fi adapterekhez (jellemzően 192.168.0.10).",
      wifiGuide: "A Wi-Fi adapterhez való csatlakozáshoz lépjen a telefon Wi-Fi beállításaiba, és válassza ki az OBD adapter hálózatát (pl. OBDII, V-LINK). Ezután térjen vissza ide.",
      openWifiSettings: "WI-FI BEÁLLÍTÁSOK MEGNYITÁSA", connectWifi: "CSATLAKOZÁS WI-FI-N KERESZTÜL",
      pairRequired: "OBD2 eszköz párosítása",
      pairRequiredDesc: "Az Android párosítást kérhet, mivel első alkalommal csatlakozik. A párosítási PIN általában a következő:",
      pairNow: "PÁROSÍTÁS ÉS CSATLAKOZÁS", pairingFailed: "A párosítás sikertelen. Kérem, párosítsa kézzel az Android beállításokban.",
      successVin: "Kapcsolat létrejött. A jármű profilja sikeresen azonosítva.",
      cloneWarning: "Inkompatibilis klón adapter észlelve. A fejlett kódolási funkciók az Ön biztonsága érdekében zárolva vannak.",
      viewHealth: "OBD2 EGÉSZSÉG ÉS KÉPESSÉGEK MENÜ", statusPrompt: "Válassza ki a kívánt OBD2 csatlakozási felületet alább.",
      foundDevices: "TALÁLT OBD2 ESZKÖZÖK", scanDevices: "ESZKÖZÖK KERESÉSE",
      scanHintIos: "Győződjön meg róla, hogy a BLE OBD2 adapter be van kapcsolva és az iOS eszköz közelében van.",
      scanHintAndroid: "Győződjön meg róla, hogy a Bluetooth aktív és az adapter kész a párosításra.",
      negotiating: "OBD2 KÉZFOGÁS TÁRGYALÁSA", failed: "KAPCSOLÓDÁSI KÍSÉRLET SIKERTELEN",
      errLayer1: "Hibaelhárítás: A Bluetooth le van tiltva. Engedélyezze az eszköz beállításaiban.",
      errLayer2: "Hibaelhárítás: Kapcsolat időtúllépés. Győződjön meg róla, hogy az adapter szorosan illeszkedik az OBD2 portba és az áramkijelző világít.",
      errLayer5: "Hibaelhárítás: Az OBD2 protokoll tárgyalása sikertelen. Győződjön meg róla, hogy a jármű gyújtása ON helyzetben van (a motor beindítása javasolt).",
      errLayer6: "Hibaelhárítás: Az adapter csatlakoztatva, de a jármű ECU nem válaszol. Kapcsolja be a gyújtást, vagy indítsa újra a kapcsolatot.",
      errGeneric: "Hibaelhárítás: Győződjön meg róla, hogy az adapter áramot kap, a gyújtás be van kapcsolva, és nincs más OBD alkalmazás nyitva.",
      stepAdapter: "Adapter kapcsolat és képesség pontszám", stepProtocol: "OBD2 protokoll tárgyalás",
      stepHandshake: "ECU kommunikáció ellenőrzése", stepStabilization: "Aktív telemetria ciklus stabilizálása"
    },
    health: {
      titleMenu: "OBD2 EGÉSZSÉG ÉS KÉPESSÉGEK", adapterQuality: "ADAPTER MINŐSÉG ÉS TELJESÍTMÉNY",
      excellent: "KIVÁLÓ (EREDETI)", good: "JÓ (ALAP)", clone: "INKOMPATIBILIS / KLÓN",
      firmware: "Firmware verzió:", capScore: "Képesség pontszám", latency: "Késleltetés (RTT)",
      protocol: "Aktív protokoll", featureSupport: "ALKALMAZÁS FUNKCIÓ MÁTRIX",
      matrixReadCodes: "Hibakódok olvasása és törlése", matrixLiveSensors: "Valós idejű érzékelő-felügyelet (Alap)",
      matrixBattery: "Akkumulátor / feszültség teszt", matrixHighSpeed: "Nagy sebességű telemetria (20Hz)",
      matrixCoding: "ECU kódolás és adaptációk", active: "Aktív", degraded: "Leromlott (Lassú RTT)",
      locked: "Zárolt (Biztonságos mód)", warning: "BIZTONSÁGI ZÁROLT:",
      lockExplain: "Az adaptere klón/hamis chipként lett megjelölve. Mivel a klón adapterek hiányoznak az időzítési pontossággal, és írási műveletek során károsíthatják a járművet, a kódolási és adaptációs funkciók zárolva vannak. Szerezzen be egy eredeti ELM327 v2.1 vagy vLinker eszközt a biztonságos kódoláshoz.",
      vehiclePids: "JÁRMŰ ÉRZÉKELŐ ELLENŐRZŐLISTA",
      checklistPrompt: "Az alábbiakban felsorolt standard érzékelő paraméterek (PID-ek) támogatottak az Ön járművének ECU-ja által. Az ellenőrző jel nélküli érzékelőket az Ön járműve nem jelenti.",
      supportedBadge: "✓ TÁMOGATOTT", unsupportedBadge: "❌ NEM TÁMOGATOTT"
    },
    sensor: {
      rpm: "Motor fordulatszám (RPM)", speed: "Jármű sebessége", coolant: "Hűtőfolyadék hőmérséklete",
      throttle: "Fojtószelep helyzete", voltage: "Vezérlőmodul feszültsége", maf: "MAF légáramlás",
      iat: "Szívólevegő hőmérséklete", load: "Számított motorterhelés", fuel: "Üzemanyag szint", oilTemp: "Motorolaj hőmérséklete"
    }
  },

  // ── Indonesian ────────────────────────────────────────────────────────────
  id: {
    common: { supported: "Didukung", copied: "Disalin", cancelBtn: "Batal", retry: "COBA SAMBUNGKAN LAGI", changeType: "Ubah Jenis Koneksi" },
    connection: {
      btDisabled: "Bluetooth Dinonaktifkan", btDisabledDesc: "Harap aktifkan Bluetooth untuk mencari adaptor OBD2.",
      btDescIos: "Sambungkan menggunakan adaptor BLE OBD2 (Veepeak, vLinker).",
      btDescAndroid: "Sambungkan melalui adaptor Classic Bluetooth atau BLE.",
      wifiDesc: "Sambungkan ke adaptor Wi-Fi (biasanya 192.168.0.10).",
      wifiGuide: "Untuk menyambungkan ke adaptor Wi-Fi, buka pengaturan Wi-Fi ponsel Anda dan pilih jaringan adaptor OBD (mis. OBDII, V-LINK). Kemudian kembali ke sini.",
      openWifiSettings: "BUKA PENGATURAN WI-FI", connectWifi: "SAMBUNGKAN VIA WI-FI",
      pairRequired: "Memasangkan Perangkat OBD2",
      pairRequiredDesc: "Android mungkin meminta pemasangan karena Anda menyambungkan untuk pertama kalinya. PIN pemasangan biasanya sebagai berikut:",
      pairNow: "PASANGKAN & SAMBUNGKAN", pairingFailed: "Pemasangan gagal. Harap pasangkan secara manual di pengaturan Android.",
      successVin: "Koneksi berhasil. Profil kendaraan berhasil diidentifikasi.",
      cloneWarning: "Adaptor klon tidak kompatibel terdeteksi. Fitur pengodean lanjutan dikunci untuk keamanan Anda.",
      viewHealth: "MENU KESEHATAN & KEMAMPUAN OBD2", statusPrompt: "Pilih antarmuka koneksi OBD2 yang Anda inginkan di bawah.",
      foundDevices: "PERANGKAT OBD2 YANG DITEMUKAN", scanDevices: "CARI PERANGKAT",
      scanHintIos: "Pastikan adaptor BLE OBD2 menyala dan berada di dekat perangkat iOS Anda.",
      scanHintAndroid: "Pastikan Bluetooth aktif dan adaptor siap untuk dipasangkan.",
      negotiating: "MENEGOSIASIKAN HANDSHAKE OBD2", failed: "PERCOBAAN KONEKSI GAGAL",
      errLayer1: "Pemecahan Masalah: Bluetooth dinonaktifkan. Harap aktifkan Bluetooth di pengaturan perangkat Anda.",
      errLayer2: "Pemecahan Masalah: Koneksi habis waktu. Pastikan adaptor terpasang kuat di port OBD2 dan lampu indikator daya menyala.",
      errLayer5: "Pemecahan Masalah: Negosiasi protokol OBD2 gagal. Pastikan kunci kontak kendaraan pada posisi ON (disarankan mesin menyala).",
      errLayer6: "Pemecahan Masalah: Adaptor tersambung, tetapi ECU kendaraan tidak merespons. Harap nyalakan kunci kontak atau mulai ulang koneksi.",
      errGeneric: "Pemecahan Masalah: Pastikan adaptor memiliki daya, kunci kontak menyala, dan tidak ada aplikasi OBD lain yang terbuka.",
      stepAdapter: "Koneksi Adaptor dan Skor Kemampuan", stepProtocol: "Negosiasi Protokol OBD2",
      stepHandshake: "Verifikasi Komunikasi ECU", stepStabilization: "Stabilisasi Loop Telemetri Aktif"
    },
    health: {
      titleMenu: "KESEHATAN & KEMAMPUAN OBD2", adapterQuality: "KUALITAS & PERFORMA ADAPTOR",
      excellent: "SANGAT BAIK (ASLI)", good: "BAIK (STANDAR)", clone: "TIDAK KOMPATIBEL / KLON",
      firmware: "Versi Firmware:", capScore: "Skor Kemampuan", latency: "Latensi (RTT)",
      protocol: "Protokol Aktif", featureSupport: "MATRIKS FITUR APLIKASI",
      matrixReadCodes: "Baca & Hapus Kode Kesalahan", matrixLiveSensors: "Pemantauan Sensor Langsung (Dasar)",
      matrixBattery: "Uji Baterai / Tegangan", matrixHighSpeed: "Telemetri Kecepatan Tinggi (20Hz)",
      matrixCoding: "Pengodean & Adaptasi ECU", active: "Aktif", degraded: "Terdegradasi (RTT Lambat)",
      locked: "Dikunci (Mode Aman)", warning: "KUNCI KEAMANAN:",
      lockExplain: "Adaptor Anda telah ditandai sebagai chip klon/palsu. Karena adaptor klon kurang presisi waktu dan dapat merusak kendaraan selama operasi penulisan, fitur pengodean dan adaptasi dikunci. Dapatkan perangkat ELM327 v2.1 atau vLinker asli untuk pengodean yang aman.",
      vehiclePids: "DAFTAR PERIKSA SENSOR KENDARAAN",
      checklistPrompt: "Parameter sensor standar (PID) yang didukung oleh ECU kendaraan Anda tercantum di bawah. Sensor tanpa tanda centang tidak dilaporkan oleh kendaraan Anda.",
      supportedBadge: "✓ DIDUKUNG", unsupportedBadge: "❌ TIDAK DIDUKUNG"
    },
    sensor: {
      rpm: "RPM Mesin", speed: "Kecepatan Kendaraan", coolant: "Suhu Cairan Pendingin",
      throttle: "Posisi Katup Gas", voltage: "Tegangan Modul Kontrol", maf: "Laju Aliran Udara MAF",
      iat: "Suhu Udara Masuk", load: "Beban Mesin yang Dihitung", fuel: "Level Bahan Bakar", oilTemp: "Suhu Oli Mesin"
    }
  },

  // ── Romanian ──────────────────────────────────────────────────────────────
  ro: {
    common: { supported: "Acceptat", copied: "Copiat", cancelBtn: "Anulare", retry: "REÎNCEARCĂ CONEXIUNEA", changeType: "Schimbare tip conexiune" },
    connection: {
      btDisabled: "Bluetooth dezactivat", btDisabledDesc: "Activați Bluetooth-ul pentru a căuta adaptoare OBD2.",
      btDescIos: "Conectați prin adaptoare BLE OBD2 (Veepeak, vLinker).",
      btDescAndroid: "Conectați prin adaptoare Classic Bluetooth sau BLE.",
      wifiDesc: "Conectați la adaptoare Wi-Fi (de obicei 192.168.0.10).",
      wifiGuide: "Pentru a vă conecta la adaptorul Wi-Fi, mergeți la setările Wi-Fi ale telefonului și alegeți rețeaua adaptorului OBD (ex. OBDII, V-LINK). Apoi reveniți aici.",
      openWifiSettings: "DESCHIDE SETĂRILE WI-FI", connectWifi: "CONECTARE VIA WI-FI",
      pairRequired: "Asociere dispozitiv OBD2",
      pairRequiredDesc: "Android poate solicita asocierea deoarece vă conectați pentru prima dată. PIN-ul de asociere este de obicei:",
      pairNow: "ASOCIAZĂ ȘI CONECTEAZĂ", pairingFailed: "Asocierea a eșuat. Asociați manual în setările Android.",
      successVin: "Conexiune stabilită. Profilul vehiculului a fost identificat cu succes.",
      cloneWarning: "Adaptor clon incompatibil detectat. Funcțiile avansate de codare sunt blocate pentru siguranța dvs.",
      viewHealth: "MENIU SĂNĂTATE ȘI CAPABILITĂȚI OBD2", statusPrompt: "Selectați interfața de conexiune OBD2 preferată mai jos.",
      foundDevices: "DISPOZITIVE OBD2 GĂSITE", scanDevices: "CAUTĂ DISPOZITIVE",
      scanHintIos: "Asigurați-vă că adaptorul BLE OBD2 este pornit și aproape de dispozitivul iOS.",
      scanHintAndroid: "Asigurați-vă că Bluetooth este activ și că adaptorul este pregătit pentru asociere.",
      negotiating: "NEGOCIERE HANDSHAKE OBD2", failed: "TENTATIVĂ DE CONEXIUNE EȘUATĂ",
      errLayer1: "Depanare: Bluetooth este dezactivat. Activați-l în setările dispozitivului.",
      errLayer2: "Depanare: Timeout conexiune. Asigurați-vă că adaptorul este ferm introdus în portul OBD2 și că indicatorul de alimentare este aprins.",
      errLayer5: "Depanare: Negocierea protocolului OBD2 a eșuat. Asigurați-vă că cheia de contact a vehiculului este în poziția ON (se recomandă cu motorul pornit).",
      errLayer6: "Depanare: Adaptorul este conectat, dar ECU-ul vehiculului nu răspunde. Porniți contactul sau reporniți conexiunea.",
      errGeneric: "Depanare: Asigurați-vă că adaptorul are alimentare, contactul este pornit și nicio altă aplicație OBD nu este deschisă.",
      stepAdapter: "Conexiune adaptor și scor capabilități", stepProtocol: "Negociere protocol OBD2",
      stepHandshake: "Verificare comunicare ECU", stepStabilization: "Stabilizare buclă telemetrie activă"
    },
    health: {
      titleMenu: "SĂNĂTATE ȘI CAPABILITĂȚI OBD2", adapterQuality: "CALITATE ȘI PERFORMANȚĂ ADAPTOR",
      excellent: "EXCELENT (ORIGINAL)", good: "BUN (STANDARD)", clone: "INCOMPATIBIL / CLON",
      firmware: "Versiune firmware:", capScore: "Scor capabilități", latency: "Latență (RTT)",
      protocol: "Protocol activ", featureSupport: "MATRICE FUNCȚII APLICAȚIE",
      matrixReadCodes: "Citire și ștergere coduri de eroare", matrixLiveSensors: "Monitorizare senzori în timp real (De bază)",
      matrixBattery: "Test baterie / tensiune", matrixHighSpeed: "Telemetrie de înaltă viteză (20Hz)",
      matrixCoding: "Codare și adaptări ECU", active: "Activ", degraded: "Degradat (RTT lent)",
      locked: "Blocat (Mod sigur)", warning: "BLOCARE SECURITATE:",
      lockExplain: "Adaptorul dvs. a fost marcat ca un cip clonat/fals. Deoarece adaptoarele clon nu au precizie de sincronizare și pot deteriora vehiculul în timpul operațiunilor de scriere, funcțiile de codare și adaptare sunt blocate. Obțineți un dispozitiv original ELM327 v2.1 sau vLinker pentru codare sigură.",
      vehiclePids: "LISTĂ DE CONTROL SENZORI VEHICUL",
      checklistPrompt: "Parametrii de senzori standard (PID-uri) suportați de ECU-ul vehiculului dvs. sunt listați mai jos. Senzorii fără bifă nu sunt raportați de vehiculul dvs.",
      supportedBadge: "✓ ACCEPTAT", unsupportedBadge: "❌ NEACCEPTAT"
    },
    sensor: {
      rpm: "Turație motor (RPM)", speed: "Viteza vehiculului", coolant: "Temperatura lichidului de răcire",
      throttle: "Poziția clapetei de accelerație", voltage: "Tensiunea modulului de control", maf: "Debit aer MAF",
      iat: "Temperatura aerului de admisie", load: "Sarcina calculată a motorului", fuel: "Nivel combustibil", oilTemp: "Temperatura uleiului de motor"
    }
  },

  // ── Ukrainian ─────────────────────────────────────────────────────────────
  uk: {
    common: { supported: "Підтримується", copied: "Скопійовано", cancelBtn: "Скасувати", retry: "ПОВТОРИТИ ПІДКЛЮЧЕННЯ", changeType: "Змінити тип підключення" },
    connection: {
      btDisabled: "Bluetooth вимкнено", btDisabledDesc: "Увімкніть Bluetooth для пошуку адаптерів OBD2.",
      btDescIos: "Підключення через BLE OBD2 адаптери (Veepeak, vLinker).",
      btDescAndroid: "Підключення через Classic Bluetooth або BLE адаптери.",
      wifiDesc: "Підключення до Wi-Fi адаптерів (зазвичай 192.168.0.10).",
      wifiGuide: "Для підключення до Wi-Fi адаптера зайдіть у налаштування Wi-Fi телефону і виберіть мережу OBD-адаптера (напр. OBDII, V-LINK). Потім поверніться сюди.",
      openWifiSettings: "ВІДКРИТИ НАЛАШТУВАННЯ WI-FI", connectWifi: "ПІДКЛЮЧИТИСЬ ПО WI-FI",
      pairRequired: "Сполучення пристрою OBD2",
      pairRequiredDesc: "Android може запросити сполучення, оскільки ви підключаєтесь вперше. PIN-код сполучення зазвичай такий:",
      pairNow: "СПОЛУЧИТИ ТА ПІДКЛЮЧИТИ", pairingFailed: "Сполучення не вдалося. Виконайте сполучення вручну в налаштуваннях Android.",
      successVin: "З'єднання встановлено. Профіль автомобіля успішно визначено.",
      cloneWarning: "Виявлено несумісний клонований адаптер. Розширені функції кодування заблоковано для вашої безпеки.",
      viewHealth: "МЕНЮ ДІАГНОСТИКИ OBD2", statusPrompt: "Виберіть бажаний інтерфейс підключення OBD2.",
      foundDevices: "ЗНАЙДЕНІ ПРИСТРОЇ OBD2", scanDevices: "ПОШУК ПРИСТРОЇВ",
      scanHintIos: "Переконайтеся, що BLE OBD2 адаптер увімкнено і він знаходиться поруч з вашим iOS-пристроєм.",
      scanHintAndroid: "Переконайтеся, що Bluetooth активний і адаптер готовий до сполучення.",
      negotiating: "УЗГОДЖЕННЯ OBD2 РУКОСТИСКАННЯ", failed: "СПРОБА ПІДКЛЮЧЕННЯ НЕ ВДАЛАСЯ",
      errLayer1: "Усунення несправностей: Bluetooth вимкнено. Увімкніть його в налаштуваннях пристрою.",
      errLayer2: "Усунення несправностей: Тайм-аут підключення. Переконайтеся, що адаптер щільно вставлений у порт OBD2 і горить індикатор живлення.",
      errLayer5: "Усунення несправностей: Узгодження протоколу OBD2 не вдалося. Переконайтеся, що замок запалювання знаходиться в положенні ON (рекомендується запущений двигун).",
      errLayer6: "Усунення несправностей: Адаптер підключено, але ЕБУ автомобіля не відповідає. Увімкніть запалювання або перезапустіть підключення.",
      errGeneric: "Усунення несправностей: Переконайтеся, що адаптер має живлення, запалювання увімкнено і жодна інша OBD-програма не відкрита.",
      stepAdapter: "Підключення адаптера та оцінка можливостей", stepProtocol: "Узгодження протоколу OBD2",
      stepHandshake: "Перевірка зв'язку з ЕБУ", stepStabilization: "Стабілізація активного циклу телеметрії"
    },
    health: {
      titleMenu: "ДІАГНОСТИКА OBD2", adapterQuality: "ЯКІСТЬ ТА ПРОДУКТИВНІСТЬ АДАПТЕРА",
      excellent: "ВІДМІННИЙ (ОРИГІНАЛЬНИЙ)", good: "ХОРОШИЙ (СТАНДАРТНИЙ)", clone: "НЕСУМІСНИЙ / КЛОН",
      firmware: "Версія прошивки:", capScore: "Оцінка можливостей", latency: "Затримка (RTT)",
      protocol: "Активний протокол", featureSupport: "МАТРИЦЯ ФУНКЦІЙ ПРОГРАМИ",
      matrixReadCodes: "Читання та скидання кодів помилок", matrixLiveSensors: "Моніторинг датчиків у реальному часі (Базовий)",
      matrixBattery: "Тест акумулятора / напруги", matrixHighSpeed: "Високошвидкісна телеметрія (20 Гц)",
      matrixCoding: "Кодування та адаптації ЕБУ", active: "Активний", degraded: "Знижений (Повільний RTT)",
      locked: "Заблокований (Безпечний режим)", warning: "БЛОКУВАННЯ БЕЗПЕКИ:",
      lockExplain: "Ваш адаптер визначено як клонований/підроблений чіп. Оскільки клоновані адаптери не мають точності синхронізації та можуть пошкодити автомобіль під час операцій запису, функції кодування та адаптації заблоковано. Придбайте оригінальний пристрій ELM327 v2.1 або vLinker для безпечного кодування.",
      vehiclePids: "СПИСОК ПЕРЕВІРКИ ДАТЧИКІВ АВТОМОБІЛЯ",
      checklistPrompt: "Стандартні параметри датчиків (PID), що підтримуються ЕБУ вашого автомобіля, перераховані нижче. Датчики без галочки не повідомляються вашим автомобілем.",
      supportedBadge: "✓ ПІДТРИМУЄТЬСЯ", unsupportedBadge: "❌ НЕ ПІДТРИМУЄТЬСЯ"
    },
    sensor: {
      rpm: "Оберти двигуна (RPM)", speed: "Швидкість автомобіля", coolant: "Температура охолоджувальної рідини",
      throttle: "Положення дросельної заслінки", voltage: "Напруга модуля управління", maf: "Витрата повітря MAF",
      iat: "Температура повітря на впуску", load: "Розрахункове навантаження двигуна", fuel: "Рівень палива", oilTemp: "Температура моторної оливи"
    }
  },

  // ── Thai ──────────────────────────────────────────────────────────────────
  th: {
    common: { supported: "รองรับ", copied: "คัดลอกแล้ว", cancelBtn: "ยกเลิก", retry: "ลองเชื่อมต่อใหม่", changeType: "เปลี่ยนประเภทการเชื่อมต่อ" },
    connection: {
      btDisabled: "บลูทูธปิดอยู่", btDisabledDesc: "กรุณาเปิดใช้งานบลูทูธเพื่อค้นหาอะแดปเตอร์ OBD2",
      btDescIos: "เชื่อมต่อโดยใช้อะแดปเตอร์ BLE OBD2 (Veepeak, vLinker)",
      btDescAndroid: "เชื่อมต่อผ่านอะแดปเตอร์ Classic Bluetooth หรือ BLE",
      wifiDesc: "เชื่อมต่อกับอะแดปเตอร์ Wi-Fi (โดยทั่วไปคือ 192.168.0.10)",
      wifiGuide: "เมื่อต้องการเชื่อมต่อกับอะแดปเตอร์ Wi-Fi ให้ไปที่การตั้งค่า Wi-Fi ของโทรศัพท์แล้วเลือกเครือข่ายอะแดปเตอร์ OBD (เช่น OBDII, V-LINK) จากนั้นกลับมาที่นี่",
      openWifiSettings: "เปิดการตั้งค่า WI-FI", connectWifi: "เชื่อมต่อผ่าน WI-FI",
      pairRequired: "จับคู่อุปกรณ์ OBD2",
      pairRequiredDesc: "Android อาจขอการจับคู่เนื่องจากคุณเชื่อมต่อเป็นครั้งแรก PIN การจับคู่โดยทั่วไปคือ:",
      pairNow: "จับคู่และเชื่อมต่อ", pairingFailed: "การจับคู่ล้มเหลว กรุณาจับคู่ด้วยตนเองในการตั้งค่า Android",
      successVin: "สร้างการเชื่อมต่อแล้ว ระบุโปรไฟล์ยานพาหนะสำเร็จ",
      cloneWarning: "ตรวจพบอะแดปเตอร์โคลนที่ไม่เข้ากัน ฟีเจอร์การเข้ารหัสขั้นสูงถูกล็อคเพื่อความปลอดภัยของคุณ",
      viewHealth: "เมนูสุขภาพและความสามารถ OBD2", statusPrompt: "เลือกอินเทอร์เฟซการเชื่อมต่อ OBD2 ที่คุณต้องการด้านล่าง",
      foundDevices: "อุปกรณ์ OBD2 ที่พบ", scanDevices: "ค้นหาอุปกรณ์",
      scanHintIos: "ตรวจสอบให้แน่ใจว่าอะแดปเตอร์ BLE OBD2 เปิดอยู่และอยู่ใกล้กับอุปกรณ์ iOS ของคุณ",
      scanHintAndroid: "ตรวจสอบให้แน่ใจว่าบลูทูธทำงานอยู่และอะแดปเตอร์พร้อมสำหรับการจับคู่",
      negotiating: "กำลังเจรจา OBD2 Handshake", failed: "การพยายามเชื่อมต่อล้มเหลว",
      errLayer1: "การแก้ไขปัญหา: บลูทูธปิดอยู่ กรุณาเปิดใช้งานบลูทูธในการตั้งค่าอุปกรณ์",
      errLayer2: "การแก้ไขปัญหา: หมดเวลาการเชื่อมต่อ ตรวจสอบให้แน่ใจว่าอะแดปเตอร์เสียบแน่นในพอร์ต OBD2 และไฟแสดงสถานะพลังงานสว่างอยู่",
      errLayer5: "การแก้ไขปัญหา: การเจรจาโปรโตคอล OBD2 ล้มเหลว ตรวจสอบให้แน่ใจว่ากุญแจสตาร์ทรถอยู่ในตำแหน่ง ON (แนะนำให้เครื่องยนต์ทำงาน)",
      errLayer6: "การแก้ไขปัญหา: อะแดปเตอร์เชื่อมต่อแล้ว แต่ ECU ของรถไม่ตอบสนอง กรุณาเปิดสวิตช์กุญแจหรือรีสตาร์ทการเชื่อมต่อ",
      errGeneric: "การแก้ไขปัญหา: ตรวจสอบให้แน่ใจว่าอะแดปเตอร์มีไฟ กุญแจสตาร์ทอยู่ในตำแหน่ง ON และไม่มีแอป OBD อื่นเปิดอยู่",
      stepAdapter: "การเชื่อมต่ออะแดปเตอร์และคะแนนความสามารถ", stepProtocol: "การเจรจาโปรโตคอล OBD2",
      stepHandshake: "การตรวจสอบการสื่อสาร ECU", stepStabilization: "การทำให้ลูปเทเลเมทรีที่ใช้งานอยู่เสถียร"
    },
    health: {
      titleMenu: "สุขภาพและความสามารถ OBD2", adapterQuality: "คุณภาพและประสิทธิภาพอะแดปเตอร์",
      excellent: "ยอดเยี่ยม (ของแท้)", good: "ดี (มาตรฐาน)", clone: "ไม่เข้ากัน / โคลน",
      firmware: "เวอร์ชันเฟิร์มแวร์:", capScore: "คะแนนความสามารถ", latency: "เวลาแฝง (RTT)",
      protocol: "โปรโตคอลที่ใช้งาน", featureSupport: "เมทริกซ์ฟีเจอร์แอปพลิเคชัน",
      matrixReadCodes: "อ่านและลบรหัสข้อผิดพลาด", matrixLiveSensors: "การตรวจสอบเซ็นเซอร์สด (พื้นฐาน)",
      matrixBattery: "ทดสอบแบตเตอรี่ / แรงดัน", matrixHighSpeed: "เทเลเมทรีความเร็วสูง (20Hz)",
      matrixCoding: "การเข้ารหัสและการปรับตัว ECU", active: "ใช้งานอยู่", degraded: "ลดลง (RTT ช้า)",
      locked: "ล็อค (โหมดปลอดภัย)", warning: "การล็อคความปลอดภัย:",
      lockExplain: "อะแดปเตอร์ของคุณถูกระบุว่าเป็นชิปโคลน/ปลอม เนื่องจากอะแดปเตอร์โคลนขาดความแม่นยำในการจับเวลาและอาจทำให้รถเสียหายระหว่างการดำเนินการเขียน ฟีเจอร์การเข้ารหัสและการปรับตัวจึงถูกล็อค กรุณาซื้ออุปกรณ์ ELM327 v2.1 หรือ vLinker ของแท้สำหรับการเข้ารหัสที่ปลอดภัย",
      vehiclePids: "รายการตรวจสอบเซ็นเซอร์ยานพาหนะ",
      checklistPrompt: "พารามิเตอร์เซ็นเซอร์มาตรฐาน (PID) ที่รองรับโดย ECU ของยานพาหนะของคุณแสดงอยู่ด้านล่าง เซ็นเซอร์ที่ไม่มีเครื่องหมายถูกจะไม่ได้รับรายงานจากยานพาหนะของคุณ",
      supportedBadge: "✓ รองรับ", unsupportedBadge: "❌ ไม่รองรับ"
    },
    sensor: {
      rpm: "รอบต่อนาทีของเครื่องยนต์ (RPM)", speed: "ความเร็วยานพาหนะ", coolant: "อุณหภูมิน้ำหล่อเย็น",
      throttle: "ตำแหน่งคันเร่ง", voltage: "แรงดันโมดูลควบคุม", maf: "อัตราการไหลของอากาศ MAF",
      iat: "อุณหภูมิอากาศเข้า", load: "ภาระเครื่องยนต์ที่คำนวณแล้ว", fuel: "ระดับน้ำมันเชื้อเพลิง", oilTemp: "อุณหภูมิน้ำมันเครื่อง"
    }
  },

  // ── Hindi ─────────────────────────────────────────────────────────────────
  hi: {
    common: { supported: "समर्थित", copied: "कॉपी किया गया", cancelBtn: "रद्द करें", retry: "कनेक्शन पुनः प्रयास करें", changeType: "कनेक्शन प्रकार बदलें" },
    connection: {
      btDisabled: "ब्लूटूथ अक्षम है", btDisabledDesc: "OBD2 एडाप्टर खोजने के लिए कृपया ब्लूटूथ सक्षम करें।",
      btDescIos: "BLE OBD2 एडाप्टर (Veepeak, vLinker) का उपयोग करके कनेक्ट करें।",
      btDescAndroid: "Classic Bluetooth या BLE एडाप्टर के माध्यम से कनेक्ट करें।",
      wifiDesc: "Wi-Fi एडाप्टर से कनेक्ट करें (आमतौर पर 192.168.0.10)।",
      wifiGuide: "Wi-Fi एडाप्टर से कनेक्ट करने के लिए, अपने फोन की Wi-Fi सेटिंग पर जाएं और OBD एडाप्टर नेटवर्क चुनें (जैसे OBDII, V-LINK)। फिर यहां वापस आएं।",
      openWifiSettings: "WI-FI सेटिंग खोलें", connectWifi: "WI-FI के माध्यम से कनेक्ट करें",
      pairRequired: "OBD2 डिवाइस पेयरिंग",
      pairRequiredDesc: "Android पेयरिंग का अनुरोध कर सकता है क्योंकि आप पहली बार कनेक्ट कर रहे हैं। पेयरिंग PIN आमतौर पर इस प्रकार है:",
      pairNow: "पेयर करें और कनेक्ट करें", pairingFailed: "पेयरिंग विफल हुई। Android सेटिंग में मैन्युअल रूप से पेयर करें।",
      successVin: "कनेक्शन स्थापित हुआ। वाहन प्रोफ़ाइल सफलतापूर्वक पहचाना गया।",
      cloneWarning: "असंगत क्लोन एडाप्टर मिला। आपकी सुरक्षा के लिए उन्नत कोडिंग सुविधाएं लॉक हैं।",
      viewHealth: "OBD2 स्वास्थ्य और क्षमता मेनू", statusPrompt: "नीचे अपना पसंदीदा OBD2 कनेक्शन इंटरफ़ेस चुनें।",
      foundDevices: "मिले OBD2 डिवाइस", scanDevices: "डिवाइस खोजें",
      scanHintIos: "सुनिश्चित करें कि BLE OBD2 एडाप्टर चालू है और आपके iOS डिवाइस के पास है।",
      scanHintAndroid: "सुनिश्चित करें कि ब्लूटूथ सक्रिय है और एडाप्टर पेयरिंग के लिए तैयार है।",
      negotiating: "OBD2 हैंडशेक बातचीत जारी है", failed: "कनेक्शन का प्रयास विफल हुआ",
      errLayer1: "समस्या निवारण: ब्लूटूथ अक्षम है। डिवाइस सेटिंग में ब्लूटूथ सक्षम करें।",
      errLayer2: "समस्या निवारण: कनेक्शन टाइमआउट। सुनिश्चित करें कि एडाप्टर OBD2 पोर्ट में मजबूती से लगा हो और पावर इंडिकेटर जल रहा हो।",
      errLayer5: "समस्या निवारण: OBD2 प्रोटोकॉल बातचीत विफल। सुनिश्चित करें कि वाहन की इग्निशन ON स्थिति में हो (इंजन चालू रहना अनुशंसित है)।",
      errLayer6: "समस्या निवारण: एडाप्टर कनेक्ट है, लेकिन वाहन ECU प्रतिक्रिया नहीं दे रहा। इग्निशन चालू करें या कनेक्शन पुनः आरंभ करें।",
      errGeneric: "समस्या निवारण: सुनिश्चित करें कि एडाप्टर में बिजली है, इग्निशन ON है और कोई अन्य OBD ऐप खुला नहीं है।",
      stepAdapter: "एडाप्टर कनेक्शन और क्षमता स्कोर", stepProtocol: "OBD2 प्रोटोकॉल बातचीत",
      stepHandshake: "ECU संचार सत्यापन", stepStabilization: "सक्रिय टेलीमेट्री लूप स्थिरीकरण"
    },
    health: {
      titleMenu: "OBD2 स्वास्थ्य और क्षमता", adapterQuality: "एडाप्टर गुणवत्ता और प्रदर्शन",
      excellent: "उत्कृष्ट (मूल)", good: "अच्छा (मानक)", clone: "असंगत / क्लोन",
      firmware: "फर्मवेयर संस्करण:", capScore: "क्षमता स्कोर", latency: "विलंबता (RTT)",
      protocol: "सक्रिय प्रोटोकॉल", featureSupport: "एप्लिकेशन सुविधा मैट्रिक्स",
      matrixReadCodes: "दोष कोड पढ़ें और साफ़ करें", matrixLiveSensors: "लाइव सेंसर निगरानी (बेसिक)",
      matrixBattery: "बैटरी / वोल्टेज परीक्षण", matrixHighSpeed: "उच्च गति टेलीमेट्री (20Hz)",
      matrixCoding: "ECU कोडिंग और अनुकूलन", active: "सक्रिय", degraded: "क्षतिग्रस्त (धीमा RTT)",
      locked: "लॉक (सुरक्षित मोड)", warning: "सुरक्षा लॉक:",
      lockExplain: "आपके एडाप्टर को क्लोन/नकली चिप के रूप में चिह्नित किया गया है। चूंकि क्लोन एडाप्टर में टाइमिंग सटीकता की कमी होती है और लिखने के ऑपरेशन के दौरान वाहन को नुकसान पहुंचा सकते हैं, कोडिंग और अनुकूलन सुविधाएं लॉक हैं। सुरक्षित कोडिंग के लिए मूल ELM327 v2.1 या vLinker डिवाइस प्राप्त करें।",
      vehiclePids: "वाहन सेंसर चेकलिस्ट",
      checklistPrompt: "आपके वाहन के ECU द्वारा समर्थित मानक सेंसर पैरामीटर (PID) नीचे सूचीबद्ध हैं। बिना चेकमार्क के सेंसर आपके वाहन द्वारा रिपोर्ट नहीं किए जाते।",
      supportedBadge: "✓ समर्थित", unsupportedBadge: "❌ असमर्थित"
    },
    sensor: {
      rpm: "इंजन RPM", speed: "वाहन गति", coolant: "इंजन शीतलक तापमान",
      throttle: "थ्रॉटल स्थिति", voltage: "नियंत्रण मॉड्यूल वोल्टेज", maf: "MAF वायु प्रवाह दर",
      iat: "इनटेक वायु तापमान", load: "गणना किया इंजन लोड", fuel: "ईंधन स्तर", oilTemp: "इंजन तेल तापमान"
    }
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// SYNC ENGINE — Madde 6 compliant: skip languages without native translation
// ─────────────────────────────────────────────────────────────────────────────
const localesDir = path.join(__dirname, '../src/locales');
const files = fs.readdirSync(localesDir).filter(f => f.endsWith('.json'));

let updated = 0, skipped = 0;

for (const file of files) {
  const lang = file.replace('.json', '');
  const filePath = path.join(localesDir, file);

  const t = newTranslations[lang];
  if (!t) {
    // Madde 6 — No English copy. Skip. i18next fallbackLng:'en' handles this at runtime.
    console.log(`⏭️  Skipping ${lang} — no native translation provided`);
    skipped++;
    continue;
  }

  try {
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));

    if (!data.common)     data.common     = {};
    if (!data.connection) data.connection = {};
    if (!data.health)     data.health     = {};
    if (!data.sensor)     data.sensor     = {};

    Object.assign(data.common,     t.common);
    Object.assign(data.connection, t.connection);
    Object.assign(data.health,     t.health);
    Object.assign(data.sensor,     t.sensor);

    fs.writeFileSync(filePath, JSON.stringify(data, null, 4) + '\n', 'utf8');
    console.log(`✓  ${lang.padEnd(5)} — synchronized with native translation`);
    updated++;
  } catch (error) {
    console.error(`✗  Error processing ${file}:`, error.message);
  }
}

console.log(`\n✅  Done. ${updated} files updated with native translations. ${skipped} files skipped (handled by i18next fallback).`);
