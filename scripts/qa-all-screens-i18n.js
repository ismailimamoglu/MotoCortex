/**
 * scripts/qa-all-screens-i18n.js
 * 
 * Complete validation script for design & 26 language file synchronization.
 */

const fs = require('fs');
const path = require('path');

const localesDir = path.join(__dirname, '../src/locales');
const files = fs.readdirSync(localesDir).filter(f => f.endsWith('.json'));

console.log(`[i18n Audit] Found ${files.length} locale files in src/locales.`);
if (files.length !== 26) {
    console.error(`[ERROR] Expected 26 language files, found ${files.length}!`);
    process.exit(1);
}

const trData = JSON.parse(fs.readFileSync(path.join(localesDir, 'tr.json'), 'utf8'));

// Essential diagnostic & feature sections
const REQUIRED_SECTIONS = [
    'hpGauge',
    'fuelTrim',
    'dct',
    'dpf',
    'multiEcu',
    'features',
    'brands'
];

let totalIssues = 0;

for (const section of REQUIRED_SECTIONS) {
    if (!trData[section]) {
        console.error(`[ERROR] Missing section '${section}' in tr.json!`);
        totalIssues++;
    }
}

// Emoji regex
const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1FA00}-\u{1FAFF}\u{1F1E6}-\u{1F1FF}]/u;

files.forEach(file => {
    const raw = fs.readFileSync(path.join(localesDir, file), 'utf8');
    const data = JSON.parse(raw);

    // 1. Check for missing sections & keys compared to tr.json
    for (const section of REQUIRED_SECTIONS) {
        if (!data[section]) {
            console.error(`[MISSING SECTION] ${file} is missing '${section}'!`);
            totalIssues++;
            continue;
        }

        const trKeys = Object.keys(trData[section] || {});
        for (const k of trKeys) {
            if (data[section][k] === undefined || data[section][k] === null || data[section][k] === '') {
                console.error(`[MISSING KEY] ${file} -> ${section}.${k}`);
                totalIssues++;
            }
        }
    }

    // 2. Check for [MISSING: ...]
    if (raw.includes('[MISSING:')) {
        console.error(`[MISSING STRING FOUND] ${file} contains raw '[MISSING:' string!`);
        totalIssues++;
    }

    // 3. Check for Emojis
    if (emojiRegex.test(raw)) {
        console.error(`[EMOJI FOUND] ${file} contains forbidden emojis!`);
        totalIssues++;
    }
});

if (totalIssues === 0) {
    console.log(`[PASS] 100% SUCCESS: All 26 language files are fully synchronized, valid, and emoji-free!`);
    process.exit(0);
} else {
    console.error(`[FAIL] Found ${totalIssues} issues across locale files.`);
    process.exit(1);
}
