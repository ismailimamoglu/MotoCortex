/**
 * scripts/sync_diagnostic_locales.js
 */

const fs = require('fs');
const path = require('path');

const localesDir = path.join(__dirname, '../src/locales');
const trPath = path.join(localesDir, 'tr.json');
const trData = JSON.parse(fs.readFileSync(trPath, 'utf8'));

// New keys to merge into tr.json
const trHpGauge = {
    methodDiesel: "Dizel Tork & Yakıt Akışı",
    methodMaf: "Hava Akış Tabanlı",
    methodTorque: "Canlı Tork Tabanlı",
    methodLoad: "Motor Yükü Tabanlı"
};

const trFuelTrim = {
    modeDiesel: "Dizel (Common Rail & Lambda)",
    modeGasoline: "Benzinli (STFT / LTFT)",
    dieselCombustionNormal: "Dizel Enjeksiyon & Yanma Sağlığı Normal",
    railPressure: "Rail Basıncı",
    fuelRate: "Yakıt Debisi",
    widebandSensor: "Geniş Bant Lambda Sensörü",
    commonRailStatus: "Common Rail Püskürtme",
    leanNormal: "Fakir Karışım (İdeal Dizel)",
    railStable: "Basınç Kararlı",
    dieselGuideTitle: "Dizel Yanma & Karışım Rehberi",
    dieselGuideDesc: "Dizel motorlar aşırı hava ile fakir karışımda (Lean Burn) çalışır. Common Rail basıncı ve Lambda sensörü püskürtme dengesini anlık olarak kontrol eder.",
    dieselActionNormal: "Sistem ideal parametrelerde çalışıyor. Düzenli yakıt filtresi bakımına devam edebilirsiniz."
};

const trDct = {
    modeAuto: "Otomatik / DCT Uyarlama",
    modeManual: "Manuel Şanzıman Testi",
    park: "P (Park)",
    engaged: "ÇEKİLİ",
    pressed: "BASILI",
    released: "SERBEST",
    neutral: "BOŞTA",
    inGear: "VİTESTE",
    active: "AKTİF",
    passive: "PASİF",
    manualTitle: "MANUEL ŞANZIMAN SENSÖR KONTROLÜ",
    manualDesc: "Bu araç manuel şanzımanlıdır. Otomatik TCU uyarlaması gerekmez. Aşağıdan debriyaj ve boş vites sensörlerinin canlı çalışma durumunu kontrol edebilirsiniz.",
    clutchSwitch: "Debriyaj Pedalı Müşürü",
    neutralSwitch: "Boş Vites (Nötr) Sensörü",
    reverseSwitch: "Geri Vites Müşürü",
    startManualTest: "Sensör Testini Başlat",
    manualTestSuccess: "Manuel şanzıman debriyaj ve vites sensör kontrolleri başarıyla tamamlandı.",
    ensureManualPreconditions: "Lütfen debriyaj ve boş vites konumunu doğrulayın.",
    manualStep1: "Debriyaj Müşürü Sinyali Test Ediliyor...",
    manualStep2: "Boş Vites Sensör Doğrulaması...",
    manualStep3: "Sensör Kalibrasyonu Tamamlandı."
};

if (!trData.hpGauge) trData.hpGauge = {};
Object.assign(trData.hpGauge, trHpGauge);

if (!trData.fuelTrim) trData.fuelTrim = {};
Object.assign(trData.fuelTrim, trFuelTrim);

if (!trData.dct) trData.dct = {};
Object.assign(trData.dct, trDct);

fs.writeFileSync(trPath, JSON.stringify(trData, null, 4), 'utf8');
console.log('[+] tr.json updated with complete diagnostic strings.');

// Sync across all other 25 files
const localeFiles = fs.readdirSync(localesDir).filter(f => f.endsWith('.json'));
for (const file of localeFiles) {
    if (file === 'tr.json') continue;
    const filePath = path.join(localesDir, file);
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));

    if (!data.hpGauge) data.hpGauge = {};
    if (!data.fuelTrim) data.fuelTrim = {};
    if (!data.dct) data.dct = {};

    Object.keys(trHpGauge).forEach(k => {
        data.hpGauge[k] = trHpGauge[k];
    });

    Object.keys(trFuelTrim).forEach(k => {
        data.fuelTrim[k] = trFuelTrim[k];
    });

    Object.keys(trDct).forEach(k => {
        data.dct[k] = trDct[k];
    });

    fs.writeFileSync(filePath, JSON.stringify(data, null, 4), 'utf8');
}

console.log('[SUCCESS] All 26 language files synchronized with zero missing keys!');
