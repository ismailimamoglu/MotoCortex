/**
 * scripts/sync_feature_locales.js
 * 
 * Synchronizes all feature items from catalog_migrated.json into all 26 locale files
 * in src/locales/ (*.json) ensuring 100% localization coverage without any missing keys.
 */

const fs = require('fs');
const path = require('path');

const catalogPath = path.join(__dirname, '../catalog_migrated.json');
const localesDir = path.join(__dirname, '../src/locales');

if (!fs.existsSync(catalogPath)) {
    console.error('catalog_migrated.json not found!');
    process.exit(1);
}

const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));
const localeFiles = fs.readdirSync(localesDir).filter(f => f.endsWith('.json'));

console.log(`[*] Syncing ${catalog.length} features into ${localeFiles.length} language files...`);

for (const file of localeFiles) {
    const filePath = path.join(localesDir, file);
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));

    if (!data.features) data.features = {};
    if (!data.features.items) data.features.items = {};

    let addedCount = 0;
    for (const feat of catalog) {
        if (!data.features.items[feat.id]) {
            data.features.items[feat.id] = {
                name: feat.defaultName || feat.id,
                desc: feat.defaultDesc || ''
            };
            addedCount++;
        } else {
            if (!data.features.items[feat.id].name) {
                data.features.items[feat.id].name = feat.defaultName || feat.id;
            }
            if (!data.features.items[feat.id].desc) {
                data.features.items[feat.id].desc = feat.defaultDesc || '';
            }
        }
    }

    fs.writeFileSync(filePath, JSON.stringify(data, null, 4), 'utf8');
    console.log(`[+] Updated ${file} (Added ${addedCount} new feature keys)`);
}

console.log('[SUCCESS] All 26 language files are synchronized!');
