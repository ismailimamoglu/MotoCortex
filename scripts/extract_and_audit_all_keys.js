/**
 * scripts/extract_and_audit_all_keys.js
 * 
 * Scans all source files in src/ for t('key') usages, ensures they exist in tr.json
 * and syncs them across all 26 language files without emojis.
 */

const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, '../src');
const localesDir = path.join(srcDir, 'locales');
const trPath = path.join(localesDir, 'tr.json');
const trData = JSON.parse(fs.readFileSync(trPath, 'utf8'));

// Helper to find all .ts / .tsx files
function getAllFiles(dir, fileList = []) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            if (!fullPath.includes('node_modules') && !fullPath.includes('locales')) {
                getAllFiles(fullPath, fileList);
            }
        } else if (file.endsWith('.ts') || file.endsWith('.tsx')) {
            fileList.push(fullPath);
        }
    }
    return fileList;
}

const sourceFiles = getAllFiles(srcDir);
const keyRegex = /t\(\s*['"]([a-zA-Z0-9_.-]+)['"]/g;
const usedKeys = new Set();

sourceFiles.forEach(file => {
    const content = fs.readFileSync(file, 'utf8');
    let match;
    while ((match = keyRegex.exec(content)) !== null) {
        usedKeys.add(match[1]);
    }
});

console.log(`[Extracted] Found ${usedKeys.size} distinct translation keys in codebase.`);

// Ensure safety section exists in tr.json
if (!trData.safety) trData.safety = {};
trData.safety.engineRunningTitle = trData.safety.engineRunningTitle || "Motor Çalışıyor Güvenlik Kilidi";
trData.safety.engineRunningDesc = trData.safety.engineRunningDesc || "Güvenlik nedeniyle arıza kodları yalnızca kontak açık ancak motor çalışmıyorken (RPM = 0) silinebilir.";

// Check each key in trData
const missingKeys = [];
usedKeys.forEach(fullKey => {
    const parts = fullKey.split('.');
    let current = trData;
    let missing = false;
    for (const part of parts) {
        if (!current || current[part] === undefined) {
            missing = true;
            break;
        }
        current = current[part];
    }
    if (missing) {
        missingKeys.push(fullKey);
    }
});

console.log(`[Audit] Found ${missingKeys.length} keys missing from tr.json:`, missingKeys);

// Auto-add missing keys to trData with clean Turkish defaults
missingKeys.forEach(k => {
    const parts = k.split('.');
    let current = trData;
    for (let i = 0; i < parts.length - 1; i++) {
        if (!current[parts[i]]) current[parts[i]] = {};
        current = current[parts[i]];
    }
    const lastKey = parts[parts.length - 1];
    if (!current[lastKey]) {
        // Humanize key
        current[lastKey] = lastKey.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()).trim();
    }
});

fs.writeFileSync(trPath, JSON.stringify(trData, null, 4), 'utf8');
console.log(`[+] tr.json updated with all missing keys.`);

// Sync to all other 25 files
const localeFiles = fs.readdirSync(localesDir).filter(f => f.endsWith('.json'));
localeFiles.forEach(file => {
    if (file === 'tr.json') return;
    const filePath = path.join(localesDir, file);
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));

    function syncObject(source, target) {
        for (const [key, val] of Object.entries(source)) {
            if (typeof val === 'object' && val !== null) {
                if (!target[key] || typeof target[key] !== 'object') target[key] = {};
                syncObject(val, target[key]);
            } else {
                if (target[key] === undefined || target[key] === null || target[key] === '') {
                    target[key] = val;
                }
            }
        }
    }

    syncObject(trData, data);
    fs.writeFileSync(filePath, JSON.stringify(data, null, 4), 'utf8');
});

console.log(`[SUCCESS] All 26 language files 100% synchronized!`);
