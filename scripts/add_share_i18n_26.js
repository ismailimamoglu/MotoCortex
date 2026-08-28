const fs = require('fs');
const path = require('path');

const localesDir = path.join(__dirname, '../src/locales');

const shareTranslations = {
  tr: {
    shareWithFriend: "ARKADAŞINLA PAYLAŞ",
    shareMessageText: "Cortex OBD2 Diagnostic Scanner ile aracınızın ECU arıza kodlarını ve canlı sensör verilerini hemen keşfedin!\n\niOS:\nhttps://apps.apple.com/app/id6742882583\n\nAndroid:\nhttps://play.google.com/store/apps/details?id=com.ismail.motocortexv2\n\nWeb:\nhttps://motocortex-telemetry.vercel.app/"
  },
  en: {
    shareWithFriend: "SHARE WITH A FRIEND",
    shareMessageText: "Discover vehicle ECU fault codes and live sensor telemetry with Cortex OBD2 Diagnostic Scanner!\n\niOS:\nhttps://apps.apple.com/app/id6742882583\n\nAndroid:\nhttps://play.google.com/store/apps/details?id=com.ismail.motocortexv2\n\nWeb:\nhttps://motocortex-telemetry.vercel.app/"
  },
  de: {
    shareWithFriend: "MIT EINEM FREUND TEILEN",
    shareMessageText: "Entdecken Sie Fahrzeug-ECU-Fehlercodes und Live-Sensortelemetrie mit Cortex OBD2 Diagnostic Scanner!\n\niOS:\nhttps://apps.apple.com/app/id6742882583\n\nAndroid:\nhttps://play.google.com/store/apps/details?id=com.ismail.motocortexv2\n\nWeb:\nhttps://motocortex-telemetry.vercel.app/"
  },
  es: {
    shareWithFriend: "COMPARTIR CON UN AMIGO",
    shareMessageText: "¡Descubre los códigos de falla de la ECU del vehículo y la telemetría de sensores en vivo con Cortex OBD2 Diagnostic Scanner!\n\niOS:\nhttps://apps.apple.com/app/id6742882583\n\nAndroid:\nhttps://play.google.com/store/apps/details?id=com.ismail.motocortexv2\n\nWeb:\nhttps://motocortex-telemetry.vercel.app/"
  },
  fr: {
    shareWithFriend: "PARTAGER AVEC UN AMI",
    shareMessageText: "Découvrez les codes d'erreur ECU et la télémétrie en direct avec Cortex OBD2 Diagnostic Scanner !\n\niOS:\nhttps://apps.apple.com/app/id6742882583\n\nAndroid:\nhttps://play.google.com/store/apps/details?id=com.ismail.motocortexv2\n\nWeb:\nhttps://motocortex-telemetry.vercel.app/"
  },
  it: {
    shareWithFriend: "CONDIVIDI CON UN AMICO",
    shareMessageText: "Scopri i codici errore ECU del veicolo e la telemetria in tempo reale con Cortex OBD2 Diagnostic Scanner!\n\niOS:\nhttps://apps.apple.com/app/id6742882583\n\nAndroid:\nhttps://play.google.com/store/apps/details?id=com.ismail.motocortexv2\n\nWeb:\nhttps://motocortex-telemetry.vercel.app/"
  },
  pt: {
    shareWithFriend: "COMPARTILHAR COM UM AMIGO",
    shareMessageText: "Descubra códigos de falha da ECU do veículo e telemetria de sensores ao vivo com o Cortex OBD2 Diagnostic Scanner!\n\niOS:\nhttps://apps.apple.com/app/id6742882583\n\nAndroid:\nhttps://play.google.com/store/apps/details?id=com.ismail.motocortexv2\n\nWeb:\nhttps://motocortex-telemetry.vercel.app/"
  },
  nl: {
    shareWithFriend: "DELEN MET EEN VRIEND",
    shareMessageText: "Ontdek ECU-foutcodes en live sensortelemetrie van uw voertuig met Cortex OBD2 Diagnostic Scanner!\n\niOS:\nhttps://apps.apple.com/app/id6742882583\n\nAndroid:\nhttps://play.google.com/store/apps/details?id=com.ismail.motocortexv2\n\nWeb:\nhttps://motocortex-telemetry.vercel.app/"
  },
  ru: {
    shareWithFriend: "ПОДЕЛИТЬСЯ С ДРУГОМ",
    shareMessageText: "Найдите коды ошибок ЭБУ автомобиля и телеметрию датчиков в реальном времени с помощью Cortex OBD2 Diagnostic Scanner!\n\niOS:\nhttps://apps.apple.com/app/id6742882583\n\nAndroid:\nhttps://play.google.com/store/apps/details?id=com.ismail.motocortexv2\n\nWeb:\nhttps://motocortex-telemetry.vercel.app/"
  },
  zh: {
    shareWithFriend: "与朋友分享",
    shareMessageText: "使用 Cortex OBD2 Diagnostic Scanner 探索车辆 ECU 故障码和实时传感器数据！\n\niOS:\nhttps://apps.apple.com/app/id6742882583\n\nAndroid:\nhttps://play.google.com/store/apps/details?id=com.ismail.motocortexv2\n\nWeb:\nhttps://motocortex-telemetry.vercel.app/"
  },
  ja: {
    shareWithFriend: "友達と共有する",
    shareMessageText: "Cortex OBD2 Diagnostic Scannerで車両ECUの故障コードとリアルタイムセンサーデータを探索しましょう！\n\niOS:\nhttps://apps.apple.com/app/id6742882583\n\nAndroid:\nhttps://play.google.com/store/apps/details?id=com.ismail.motocortexv2\n\nWeb:\nhttps://motocortex-telemetry.vercel.app/"
  },
  ko: {
    shareWithFriend: "친구와 공유하기",
    shareMessageText: "Cortex OBD2 Diagnostic Scanner로 차량 ECU 고장 코드 및 실시간 센서 텔레메트리를 확인해보세요!\n\niOS:\nhttps://apps.apple.com/app/id6742882583\n\nAndroid:\nhttps://play.google.com/store/apps/details?id=com.ismail.motocortexv2\n\nWeb:\nhttps://motocortex-telemetry.vercel.app/"
  },
  ar: {
    shareWithFriend: "مشاركة مع صديق",
    shareMessageText: "اكتشف أعطال وحدة التحكم في المحرك والبيانات الحية باستخدام Cortex OBD2 Diagnostic Scanner!\n\niOS:\nhttps://apps.apple.com/app/id6742882583\n\nAndroid:\nhttps://play.google.com/store/apps/details?id=com.ismail.motocortexv2\n\nWeb:\nhttps://motocortex-telemetry.vercel.app/"
  },
  id: {
    shareWithFriend: "BAGIKAN KE TEMAN",
    shareMessageText: "Temukan kode kesalahan ECU kendaraan & telemetri sensor langsung dengan Cortex OBD2 Diagnostic Scanner!\n\niOS:\nhttps://apps.apple.com/app/id6742882583\n\nAndroid:\nhttps://play.google.com/store/apps/details?id=com.ismail.motocortexv2\n\nWeb:\nhttps://motocortex-telemetry.vercel.app/"
  },
  pl: {
    shareWithFriend: "UDOSTĘPNIJ ZNAJOMEMU",
    shareMessageText: "Odkryj kody błędów ECU i telemetrię czujników na żywo za pomocą Cortex OBD2 Diagnostic Scanner!\n\niOS:\nhttps://apps.apple.com/app/id6742882583\n\nAndroid:\nhttps://play.google.com/store/apps/details?id=com.ismail.motocortexv2\n\nWeb:\nhttps://motocortex-telemetry.vercel.app/"
  },
  uk: {
    shareWithFriend: "ПОДІЛИТИСЯ З ДРУГОМ",
    shareMessageText: "Дізнайтесь про коди помилок ЕБУ автомобіля та телеметрію датчиків у реальному часі за допомогою Cortex OBD2 Diagnostic Scanner!\n\niOS:\nhttps://apps.apple.com/app/id6742882583\n\nAndroid:\nhttps://play.google.com/store/apps/details?id=com.ismail.motocortexv2\n\nWeb:\nhttps://motocortex-telemetry.vercel.app/"
  },
  ro: {
    shareWithFriend: "TRIMITE UNUI PRIETEN",
    shareMessageText: "Descoperă codurile de eroare ECU ale vehiculului și telemetria în timp real cu Cortex OBD2 Diagnostic Scanner!\n\niOS:\nhttps://apps.apple.com/app/id6742882583\n\nAndroid:\nhttps://play.google.com/store/apps/details?id=com.ismail.motocortexv2\n\nWeb:\nhttps://motocortex-telemetry.vercel.app/"
  },
  hu: {
    shareWithFriend: "MEGOSZTÁS EGY BARÁTTAL",
    shareMessageText: "Fedezze fel a jármű ECU hibakódjait és az élő szenzor telemetriát a Cortex OBD2 Diagnostic Scanner segítségével!\n\niOS:\nhttps://apps.apple.com/app/id6742882583\n\nAndroid:\nhttps://play.google.com/store/apps/details?id=com.ismail.motocortexv2\n\nWeb:\nhttps://motocortex-telemetry.vercel.app/"
  },
  no: {
    shareWithFriend: "DEL MED EN VENN",
    shareMessageText: "Oppdag bilens ECU-feilkoder og levende sensortelemetri med Cortex OBD2 Diagnostic Scanner!\n\niOS:\nhttps://apps.apple.com/app/id6742882583\n\nAndroid:\nhttps://play.google.com/store/apps/details?id=com.ismail.motocortexv2\n\nWeb:\nhttps://motocortex-telemetry.vercel.app/"
  },
  da: {
    shareWithFriend: "DEL MED EN VEN",
    shareMessageText: "Oplev bilens ECU-fejlkoder og live sensortelemetri med Cortex OBD2 Diagnostic Scanner!\n\niOS:\nhttps://apps.apple.com/app/id6742882583\n\nAndroid:\nhttps://play.google.com/store/apps/details?id=com.ismail.motocortexv2\n\nWeb:\nhttps://motocortex-telemetry.vercel.app/"
  },
  fi: {
    shareWithFriend: "JAA YSTÄVÄLLE",
    shareMessageText: "Löydä ajoneuvon ECU-vikakoodit ja reaaliaikainen anturitelemetria Cortex OBD2 Diagnostic Scannerilla!\n\niOS:\nhttps://apps.apple.com/app/id6742882583\n\nAndroid:\nhttps://play.google.com/store/apps/details?id=com.ismail.motocortexv2\n\nWeb:\nhttps://motocortex-telemetry.vercel.app/"
  },
  sv: {
    shareWithFriend: "DELA MED EN VÄN",
    shareMessageText: "Upptäck fordonets ECU-felkoder och levande sensortelemetri med Cortex OBD2 Diagnostic Scanner!\n\niOS:\nhttps://apps.apple.com/app/id6742882583\n\nAndroid:\nhttps://play.google.com/store/apps/details?id=com.ismail.motocortexv2\n\nWeb:\nhttps://motocortex-telemetry.vercel.app/"
  },
  cs: {
    shareWithFriend: "SDÍLET S PŘÍTELEM",
    shareMessageText: "Objevte chybové kódy ECU vozidla a živou telemetrii senzorů s Cortex OBD2 Diagnostic Scanner!\n\niOS:\nhttps://apps.apple.com/app/id6742882583\n\nAndroid:\nhttps://play.google.com/store/apps/details?id=com.ismail.motocortexv2\n\nWeb:\nhttps://motocortex-telemetry.vercel.app/"
  },
  el: {
    shareWithFriend: "MOIRAΣTE ME ENAN ΦΙΛΟ",
    shareMessageText: "Ανακαλύψτε τους κωδικούς βλάβης ECU και τη ζωντανή τηλεμετρία με το Cortex OBD2 Diagnostic Scanner!\n\niOS:\nhttps://apps.apple.com/app/id6742882583\n\nAndroid:\nhttps://play.google.com/store/apps/details?id=com.ismail.motocortexv2\n\nWeb:\nhttps://motocortex-telemetry.vercel.app/"
  },
  th: {
    shareWithFriend: "แชร์ให้เพื่อน",
    shareMessageText: "ค้นหารหัสข้อผิดพลาด ECU ของยานพาหนะและข้อมูลเซ็นเซอร์สดด้วย Cortex OBD2 Diagnostic Scanner!\n\niOS:\nhttps://apps.apple.com/app/id6742882583\n\nAndroid:\nhttps://play.google.com/store/apps/details?id=com.ismail.motocortexv2\n\nWeb:\nhttps://motocortex-telemetry.vercel.app/"
  },
  hi: {
    shareWithFriend: "मित्र के साथ साझा करें",
    shareMessageText: "Cortex OBD2 Diagnostic Scanner के साथ वाहन ECU फॉल्ट कोड और लाइव सेंसर टेलीमेट्री खोजें!\n\niOS:\nhttps://apps.apple.com/app/id6742882583\n\nAndroid:\nhttps://play.google.com/store/apps/details?id=com.ismail.motocortexv2\n\nWeb:\nhttps://motocortex-telemetry.vercel.app/"
  }
};

let count = 0;
Object.keys(shareTranslations).forEach(lang => {
  const file = path.join(localesDir, `${lang}.json`);
  if (fs.existsSync(file)) {
    const content = JSON.parse(fs.readFileSync(file, 'utf8'));
    if (!content.info) content.info = {};
    content.info.shareWithFriend = shareTranslations[lang].shareWithFriend;
    content.info.shareMessageText = shareTranslations[lang].shareMessageText;
    fs.writeFileSync(file, JSON.stringify(content, null, 4), 'utf8');
    count++;
  }
});

console.log(`Successfully updated share keys in ${count} locale files.`);
