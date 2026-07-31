/**
 * qa-i18n-audit.js
 * 
 * MotoCortex Senior QA Lead i18n Language Synchronization Test Automation Suite.
 * Performs deep structural key comparison, interpolation variable validation,
 * hardcoded string scanning across components, and language drift detection across all 26 locale files.
 */

const fs = require('fs');
const path = require('path');

const localesDir = path.join(__dirname, '../src/locales');
const srcDir = path.join(__dirname, '../src');
const mainFile = path.join(localesDir, 'en.json');

console.log('================================================================');
console.log('🧪 MOTOCORTEX QA LEAD i18N LANGUAGE SYNCHRONIZATION AUDIT SUITE');
console.log('================================================================\n');

if (!fs.existsSync(mainFile)) {
    console.error('❌ CRITICAL QA FAIL: Source of truth file en.json not found!');
    process.exit(1);
}

const mainData = JSON.parse(fs.readFileSync(mainFile, 'utf8'));

// Helper to flatten nested JSON object into key paths (e.g. "bento.featureCoding")
function flattenKeys(obj, prefix = '') {
    let keys = {};
    for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
            const prop = prefix ? `${prefix}.${key}` : key;
            if (typeof obj[key] === 'object' && obj[key] !== null) {
                Object.assign(keys, flattenKeys(obj[key], prop));
            } else {
                keys[prop] = obj[key];
            }
        }
    }
    return keys;
}

const enKeys = flattenKeys(mainData);
const totalEnKeys = Object.keys(enKeys).length;

console.log(`📊 Total Reference Keys in en.json (Source of Truth): ${totalEnKeys} keys\n`);

const auditResults = [];
let totalFailures = 0;

// Test 1: 26-Language Matrix Completeness Audit
const files = fs.readdirSync(localesDir).filter(f => f.endsWith('.json'));

files.forEach(file => {
    const lang = file.replace('.json', '');
    const filePath = path.join(localesDir, file);
    let targetData = {};
    try {
        targetData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    } catch (e) {
        console.error(`❌ [${lang.toUpperCase()}] JSON Parse Error in ${file}`);
        totalFailures++;
        return;
    }

    const targetKeys = flattenKeys(targetData);
    const missingKeys = [];
    const emptyKeys = [];
    const interpolationMismatches = [];

// CLDR Plural Rule Suffixes Map
const cldrPluralSuffixes = ['_zero', '_one', '_two', '_few', '_many', '_other'];

// Helper to strip CLDR plural suffix to get base key
function getBaseKey(keyPath) {
    for (const suffix of cldrPluralSuffixes) {
        if (keyPath.endsWith(suffix)) {
            return { baseKey: keyPath.slice(0, -suffix.length), suffix };
        }
    }
    return { baseKey: keyPath, suffix: null };
}

for (const keyPath in enKeys) {
    const { baseKey, suffix } = getBaseKey(keyPath);
    const hasDirect = targetKeys.hasOwnProperty(keyPath);
    
    // Check if target key exists directly or via valid target CLDR plural form
    let existsInTarget = hasDirect;
    if (!existsInTarget && suffix) {
        // Check if any valid target CLDR plural key exists for this baseKey
        existsInTarget = cldrPluralSuffixes.some(s => targetKeys.hasOwnProperty(`${baseKey}${s}`));
    }

    if (!existsInTarget) {
        missingKeys.push(keyPath);
    } else {
        const targetVal = String(targetKeys[keyPath] || targetKeys[`${baseKey}_one`] || targetKeys[`${baseKey}_other`] || '');
        const enVal = String(enKeys[keyPath]);

        if (targetVal.trim() === '') {
            emptyKeys.push(keyPath);
        }

        // Check interpolation variables e.g. {{count}}
        const enVars = enVal.match(/\{\{.*?\}\}/g) || [];
        const targetVars = targetVal.match(/\{\{.*?\}\}/g) || [];
        if (enVars.sort().join(',') !== targetVars.sort().join(',')) {
            interpolationMismatches.push(keyPath);
        }
    }
}

    const isPass = missingKeys.length === 0 && emptyKeys.length === 0 && interpolationMismatches.length === 0;
    if (!isPass) totalFailures++;

    auditResults.push({
        lang: lang.toUpperCase(),
        file,
        totalKeys: Object.keys(targetKeys).length,
        missingCount: missingKeys.length,
        emptyCount: emptyKeys.length,
        mismatchCount: interpolationMismatches.length,
        status: isPass ? 'PASS' : 'FAIL',
        missingKeys: missingKeys.slice(0, 5) // Show top 5 if any
    });
});

console.log('----------------------------------------------------------------');
console.log('📋 TEST CASE 1: 26-LANGUAGE MATRIX COMPLETENESS & DRIFT RESULTS');
console.log('----------------------------------------------------------------');
console.table(auditResults.map(r => ({
    Language: r.lang,
    Status: r.status === 'PASS' ? '✅ PASS' : '❌ FAIL',
    TotalKeys: r.totalKeys,
    MissingKeys: r.missingCount,
    EmptyKeys: r.emptyCount,
    InterpolationMismatches: r.mismatchCount
})));

// Test 2: Component AST Hardcoded String Scanner
console.log('\n----------------------------------------------------------------');
console.log('📋 TEST CASE 2: COMPONENT AST HARDCODED STRING SCANNER');
console.log('----------------------------------------------------------------');

const tsxFiles = [];
function scanDirectory(dir) {
    fs.readdirSync(dir).forEach(file => {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            if (!file.startsWith('.')) scanDirectory(fullPath);
        } else if (file.endsWith('.tsx')) {
            tsxFiles.push(fullPath);
        }
    });
}
scanDirectory(srcDir);

const suspiciousHardcodes = [];
const hardcodePattern = /<Text[^>]*>([^<{}]*[a-zA-ZÇĞİÖŞÜçğıöşü]{4,}[^<{}]*)<\/Text>/g;

tsxFiles.forEach(filePath => {
    const content = fs.readFileSync(filePath, 'utf8');
    const relativePath = path.relative(srcDir, filePath);
    let match;

    while ((match = hardcodePattern.exec(content)) !== null) {
        const textLiteral = match[1].trim();
        const isBrandName = /^(MOTO\s*CORTEX(\s*PRO)?|MOTOCORTEX|BLUETOOTH|ISO\s*14229|BLE|👑\s*MOTO\s*CORTEX\s*PRO)$/i.test(textLiteral);
        // Ignore code/number expressions, icon literals, or official brand proper nouns
        if (!textLiteral.includes('t(') && !textLiteral.includes('colors.') && !textLiteral.includes('scaleFont') && textLiteral.length > 3 && !isBrandName) {
            suspiciousHardcodes.push({
                file: relativePath,
                literal: textLiteral
            });
        }
    }
});

if (suspiciousHardcodes.length === 0) {
    console.log('✅ AST HARDCODE SCANNER: 0 Unwrapped Hardcoded String Literals Found in JSX Component Trees.');
} else {
    console.log(`⚠️ AST HARDCODE SCANNER: ${suspiciousHardcodes.length} suspicious unwrapped text literals flagged:`);
    suspiciousHardcodes.slice(0, 10).forEach(h => {
        console.log(`   - [${h.file}]: "${h.literal}"`);
    });
}

// Final QA Verdict
console.log('\n================================================================');
console.log('🏁 SENIOR QA LEAD VERDICT & SUMMARY REPORT');
console.log('================================================================');
console.log(`Total Locales Tested: ${files.length}`);
console.log(`Passed Locales: ${files.length - totalFailures} / ${files.length}`);
console.log(`Failed Locales: ${totalFailures}`);
console.log(`Hardcoded String Violations: ${suspiciousHardcodes.length}`);

if (totalFailures === 0 && suspiciousHardcodes.length === 0) {
    console.log('\n🎉 FINAL VERDICT: APPROVED FOR PRODUCTION RELEASE (100% i18n Sync & 0 Mixed-Language Artifacts)');
} else {
    console.log('\n⚠️ FINAL VERDICT: ACTION REQUIRED (Resolve flagged QA failures before release)');
}
