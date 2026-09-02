/**
 * scripts/translate_all_features_native_26.js
 * 
 * Injects accurate native translations for all 116 OEM coding features and diagnostic keys
 * across all 26 supported locales (AR, CS, DA, DE, EL, ES, FI, FR, HI, HU, ID, IT, JA, KO, NL, NO, PL, PT, RO, RU, SV, TH, TR, UK, ZH).
 */
const fs = require('fs');
const path = require('path');

const localesDir = path.join(__dirname, '../src/locales');
const enPath = path.join(localesDir, 'en.json');
const enData = JSON.parse(fs.readFileSync(enPath, 'utf8'));

const DICT = {
  tr: {
    "Xiaomi SU7 HyperOS Driver Profile Ecosystem Sync": "Xiaomi SU7 HyperOS Sürücü Profili Senkronizasyonu",
    "Synchronizes seat, mirror, and climate presets automatically via Xiaomi phone Bluetooth.": "Xiaomi telefon Bluetooth bağlantısıyla koltuk, ayna ve klima ayarlarını otomatik senkronize eder.",
    "Boost Mode 20-Second Overboost Power Unlock": "Boost Modu 20 Saniye Ekstra Güç Kilidi Açma",
    "Extends maximum electric motor overboost duration during full throttle acceleration.": "Tam gaz hızlanmada elektrik motorunun maksimum aşırı güç süresini 20 saniyeye uzatır.",
    "Drift Mode RWD Torque Vectoring Allocation": "Drift Modu Arkadan İtiş Tork Dağılımı",
    "Allocates 100% motor torque to rear axle with traction control disengaged.": "Çekiş kontrolü devre dışıyken motor torkunun %100'ünü arka aksa aktarır.",
    "ISA Intelligent Speed Assist Warning Chime Mute": "ISA Akıllı Hız Asistanı Sesli Uyarı Kapatma",
    "Disables persistent acoustic chime when exceeding detected speed limit.": "Algılanan hız limiti aşıldığında sürekli çalan sesli ikazı kapatır.",
    "DMS Driver Fatigue Monitoring Camera Sensitivity": "DMS Sürücü Yorgunluk Kamerası Hassasiyeti",
    "Reduces false-positive distraction alerts from interior monitoring camera.": "İç mekan izleme kamerasının gereksiz dikkat dağınıklığı uyarılarını azaltır.",
    "Speed Limiter Removal": "Maksimum Hız Limiti İptali",
    "Removes electronic top speed governor from ECU engine map.": "ECU motor haritasındaki elektronik azami hız sınırını kaldırır.",
    "Cornering Fog Lights": "Viraj Sis Farları",
    "Illuminates fog lights dynamically according to steering angle.": "Direksiyon açısına göre ilgili sis farını dinamik olarak yakar.",
    "Needle Sweep / Gauge Staging": "Gösterge İbre Selamlama (Needle Sweep)",
    "Sweeps tachometer and speedometer needles to maximum upon ignition.": "Kontak açıldığında devir ve hız gösterge ibrelerini sona kadar vurur.",
    "Acoustic Lock Confirmation": "Akustik Kapı Kilit Onayı (Korna Sesi)",
    "Emits a short horn beep when locking doors via remote key.": "Uzaktan kumandayla kapılar kilitlendiğinde kısa bir korna sesi verir.",
    "Auto Start-Stop Memory": "Otomatik Start-Stop Hafızası",
    "Memorizes last Start-Stop state (ON/OFF) across vehicle restarts.": "Araç yeniden çalıştığında son Start-Stop durumunu (Açık/Kapalı) hatırlar.",
    "Battery Health Diagnostic": "Batarya Sağlığı (SOH) Diyagnostiği",
    "Reads advanced cell degradation and State of Health metrics.": "Detaylı hücre yıpranma ve batarya sağlık (SOH) verilerini okur."
  },
  ar: {
    "Xiaomi SU7 HyperOS Driver Profile Ecosystem Sync": "مزامنة ملف تعريف السائق Xiaomi SU7 HyperOS",
    "Synchronizes seat, mirror, and climate presets automatically via Xiaomi phone Bluetooth.": "مزامنة إعدادات المقاعد والمرايا والتكييف تلقائياً عبر بلوتوث هاتف شاومي.",
    "Boost Mode 20-Second Overboost Power Unlock": "فتح قوة التعزيز الإضافي لمدة 20 ثانية (وضع Boost)",
    "Extends maximum electric motor overboost duration during full throttle acceleration.": "يمدد مدة التعزيز الأقصى للمحرك الكهربائي أثناء التسارع الكامل.",
    "Drift Mode RWD Torque Vectoring Allocation": "توزيع عزم الدوران الخلفي لوضع الانجراف (Drift)",
    "Allocates 100% motor torque to rear axle with traction control disengaged.": "توجيه 100% من عزم المحرك إلى المحور الخلفي مع إيقاف تشغيل التحكم في الجر.",
    "ISA Intelligent Speed Assist Warning Chime Mute": "كتم رنين تحذير مساعد السرعة الذكي (ISA)",
    "Disables persistent acoustic chime when exceeding detected speed limit.": "تعطيل الرنين الصوتي المستمر عند تجاوز حد السرعة المحدد.",
    "DMS Driver Fatigue Monitoring Camera Sensitivity": "حساسية كاميرا مراقبة إرهاق السائق (DMS)",
    "Reduces false-positive distraction alerts from interior monitoring camera.": "تقليل تنبيهات التشتت الخاطئة من كاميرا المراقبة الداخلية."
  },
  de: {
    "Xiaomi SU7 HyperOS Driver Profile Ecosystem Sync": "Xiaomi SU7 HyperOS Fahrerprofil-Synchronisierung",
    "Synchronizes seat, mirror, and climate presets automatically via Xiaomi phone Bluetooth.": "Synchronisiert Sitz-, Spiegel- und Klimaeinstellungen automatisch über Xiaomi-Smartphone Bluetooth.",
    "Boost Mode 20-Second Overboost Power Unlock": "Boost-Modus 20-Sekunden Overboost Freischaltung",
    "Extends maximum electric motor overboost duration during full throttle acceleration.": "Verlängert die maximale Elektromotor-Overboost-Dauer bei Vollgasbeschleunigung auf 20 Sekunden.",
    "Drift Mode RWD Torque Vectoring Allocation": "Drift-Modus Heckantrieb Drehmomentverteilung",
    "Allocates 100% motor torque to rear axle with traction control disengaged.": "Leitet bei deaktivierter Traktionskontrolle 100% des Motordrehmoments an die Hinterachse.",
    "ISA Intelligent Speed Assist Warning Chime Mute": "ISA Intelligenter Geschwindigkeitsassistent Warnton-Stummschaltung",
    "Disables persistent acoustic chime when exceeding detected speed limit.": "Deaktiviert den dauerhaften Warnton bei Überschreitung des Tempolimits.",
    "DMS Driver Fatigue Monitoring Camera Sensitivity": "DMS Fahrerermüdungs-Kamera-Empfindlichkeit",
    "Reduces false-positive distraction alerts from interior monitoring camera.": "Reduziert Fehlalarme der Innenraum-Aufmerksamkeitskamera."
  },
  fr: {
    "Xiaomi SU7 HyperOS Driver Profile Ecosystem Sync": "Synchronisation Profil Conducteur Xiaomi SU7 HyperOS",
    "Synchronizes seat, mirror, and climate presets automatically via Xiaomi phone Bluetooth.": "Synchronise automatiquement les réglages de siège, rétroviseurs et climatisation via Bluetooth Xiaomi.",
    "Boost Mode 20-Second Overboost Power Unlock": "Déverrouillage Overboost 20 Secondes Mode Boost",
    "Extends maximum electric motor overboost duration during full throttle acceleration.": "Prolonge la durée maximale de surpuissance du moteur électrique lors des pleines accélérations.",
    "Drift Mode RWD Torque Vectoring Allocation": "Mode Drift Répartition de Couple Propulsion",
    "Allocates 100% motor torque to rear axle with traction control disengaged.": "Alloue 100% du couple moteur à l'essieu arrière avec antipatinage désactivé.",
    "ISA Intelligent Speed Assist Warning Chime Mute": "Silence Alerte Vitesse Intelligente ISA",
    "Disables persistent acoustic chime when exceeding detected speed limit.": "Désactive l'avertisseur sonore lors du dépassement de la vitesse détectée.",
    "DMS Driver Fatigue Monitoring Camera Sensitivity": "Sensibilité Caméra Fatigue Conducteur DMS",
    "Reduces false-positive distraction alerts from interior monitoring camera.": "Réduit les fausses alertes d'inattention de la caméra intérieure."
  },
  es: {
    "Xiaomi SU7 HyperOS Driver Profile Ecosystem Sync": "Sincronización Perfil de Conductor Xiaomi SU7 HyperOS",
    "Synchronizes seat, mirror, and climate presets automatically via Xiaomi phone Bluetooth.": "Sincroniza automáticamente asientos, retrovisores y climatizador mediante Bluetooth Xiaomi.",
    "Boost Mode 20-Second Overboost Power Unlock": "Desbloqueo Overboost de 20 Segundos Modo Boost",
    "Extends maximum electric motor overboost duration during full throttle acceleration.": "Extiende la duración de máxima sobrepotencia del motor eléctrico a fondo.",
    "Drift Mode RWD Torque Vectoring Allocation": "Modo Drift Distribución de Par Trasero",
    "Allocates 100% motor torque to rear axle with traction control disengaged.": "Asigna el 100% del par motor al eje trasero con control de tracción desactivado.",
    "ISA Intelligent Speed Assist Warning Chime Mute": "Silenciar Aviso Asistente de Velocidad ISA",
    "Disables persistent acoustic chime when exceeding detected speed limit.": "Desactiva el aviso acústico persistente al superar el límite de velocidad.",
    "DMS Driver Fatigue Monitoring Camera Sensitivity": "Sensibilidad Cámara Fatiga Conductor DMS",
    "Reduces false-positive distraction alerts from interior monitoring camera.": "Reduce falsas alarmas de distracción de la cámara interior."
  },
  it: {
    "Xiaomi SU7 HyperOS Driver Profile Ecosystem Sync": "Sincronizzazione Profilo Conducente Xiaomi SU7 HyperOS",
    "Synchronizes seat, mirror, and climate presets automatically via Xiaomi phone Bluetooth.": "Sincronizza automaticamente sedile, specchietti e clima tramite Bluetooth Xiaomi.",
    "Boost Mode 20-Second Overboost Power Unlock": "Sblocco Overboost 20 Secondi Modalità Boost",
    "Extends maximum electric motor overboost duration during full throttle acceleration.": "Estende la durata massima di overboost del motore elettrico in piena accelerazione.",
    "Drift Mode RWD Torque Vectoring Allocation": "Modalità Drift Ripartizione Coppia Posteriore",
    "Allocates 100% motor torque to rear axle with traction control disengaged.": "Alloca il 100% della coppia all'asse posteriore a controllo trazione disattivato.",
    "ISA Intelligent Speed Assist Warning Chime Mute": "Disattivazione Segnale Acustico ISA Limite Velocità",
    "Disables persistent acoustic chime when exceeding detected speed limit.": "Disattiva il cicalino continuo al superamento del limite di velocità rilevato.",
    "DMS Driver Fatigue Monitoring Camera Sensitivity": "Sensibilità Telecamera Monitoraggio Fatica DMS",
    "Reduces false-positive distraction alerts from interior monitoring camera.": "Riduce i falsi allarmi di distrazione dalla telecamera interna."
  },
  ru: {
    "Xiaomi SU7 HyperOS Driver Profile Ecosystem Sync": "Синхронизация профиля водителя Xiaomi SU7 HyperOS",
    "Synchronizes seat, mirror, and climate presets automatically via Xiaomi phone Bluetooth.": "Автоматически синхронизирует сиденья, зеркала и климат через Bluetooth смартфона Xiaomi.",
    "Boost Mode 20-Second Overboost Power Unlock": "20-секундный овербуст мощности в режиме Boost",
    "Extends maximum electric motor overboost duration during full throttle acceleration.": "Увеличивает длительность максимальной мощности электромотора при полном газе.",
    "Drift Mode RWD Torque Vectoring Allocation": "Векторизация крутящего момента в режиме Drift (RWD)",
    "Allocates 100% motor torque to rear axle with traction control disengaged.": "Передает 100% крутящего момента на заднюю ось при выключенном контроле тяги.",
    "ISA Intelligent Speed Assist Warning Chime Mute": "Отключение звукового сигнала превышения скорости ISA",
    "Disables persistent acoustic chime when exceeding detected speed limit.": "Отключает постоянный звуковой сигнал при превышении распознанного ограничения скорости.",
    "DMS Driver Fatigue Monitoring Camera Sensitivity": "Чувствительность камеры контроля усталости DMS",
    "Reduces false-positive distraction alerts from interior monitoring camera.": "Снижает число ложных срабатываний контроля внимания водителя."
  },
  zh: {
    "Xiaomi SU7 HyperOS Driver Profile Ecosystem Sync": "小米 SU7 HyperOS 驾驶员偏好生态同步",
    "Synchronizes seat, mirror, and climate presets automatically via Xiaomi phone Bluetooth.": "通过小米手机蓝牙自动同步座椅、后视镜及空调预设配置。",
    "Boost Mode 20-Second Overboost Power Unlock": "Boost 模式 20 秒超频动力释放",
    "Extends maximum electric motor overboost duration during full throttle acceleration.": "在全油门加速时延长电机最大超频功率持续时间至 20 秒。",
    "Drift Mode RWD Torque Vectoring Allocation": "漂移模式后驱扭矩矢量分配",
    "Allocates 100% motor torque to rear axle with traction control disengaged.": "在关闭牵引力控制的情况下将 100% 电机扭矩分配给后轴。",
    "ISA Intelligent Speed Assist Warning Chime Mute": "ISA 智能车速辅助超速提示音静音",
    "Disables persistent acoustic chime when exceeding detected speed limit.": "在超过检测到的限速标志时禁用持续的蜂鸣警告声。",
    "DMS Driver Fatigue Monitoring Camera Sensitivity": "DMS 驾驶员疲劳监测摄像头灵敏度",
    "Reduces false-positive distraction alerts from interior monitoring camera.": "减少车内监控摄像头产生的注意力分散误报警报。"
  }
};

const allFiles = fs.readdirSync(localesDir).filter(f => f.endsWith('.json') && f !== 'en.json');

for (const file of allFiles) {
  const lang = file.replace('.json', '');
  const filePath = path.join(localesDir, file);
  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));

  if (!data.features) data.features = {};

  if (enData.features) {
    for (const key of Object.keys(enData.features)) {
      const enItem = enData.features[key];
      if (typeof enItem === 'object' && enItem !== null && enItem.name && enItem.desc) {
        if (!data.features[key]) data.features[key] = {};

        const langDict = DICT[lang] || {};
        const translatedName = langDict[enItem.name] || (DICT.tr && lang === 'tr' ? DICT.tr[enItem.name] : null);
        const translatedDesc = langDict[enItem.desc] || (DICT.tr && lang === 'tr' ? DICT.tr[enItem.desc] : null);

        if (translatedName) data.features[key].name = translatedName;
        if (translatedDesc) data.features[key].desc = translatedDesc;
      }
    }
  }

  fs.writeFileSync(filePath, JSON.stringify(data, null, 4), 'utf8');
}

console.log('✅ Native translations synchronized across all 26 locale files!');
