const fs = require('fs');
const path = require('path');

const localesDir = path.join(__dirname, '../src/locales');
const mainFile = path.join(localesDir, 'en.json');

if (!fs.existsSync(mainFile)) {
    console.error('Source of truth file en.json not found!');
    process.exit(1);
}

console.log('Reading main translation file (en.json)...');
const mainData = JSON.parse(fs.readFileSync(mainFile, 'utf8'));

function syncObjects(source, target) {
    let modified = false;
    for (const key in source) {
        if (source.hasOwnProperty(key)) {
            if (typeof source[key] === 'object' && source[key] !== null) {
                if (!target[key] || typeof target[key] !== 'object') {
                    target[key] = {};
                    modified = true;
                }
                if (syncObjects(source[key], target[key])) {
                    modified = true;
                }
            } else {
                if (target[key] === undefined) {
                    target[key] = "";
                    modified = true;
                }
            }
        }
    }
    return modified;
}

fs.readdirSync(localesDir).forEach(file => {
    if (file === 'en.json' || !file.endsWith('.json')) return;
    
    const filePath = path.join(localesDir, file);
    try {
        const targetData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        if (syncObjects(mainData, targetData)) {
            // Write with 4 spaces formatting to match project standard
            fs.writeFileSync(filePath, JSON.stringify(targetData, null, 4) + '\n', 'utf8');
            console.log(`✓ Synced: ${file}`);
        } else {
            console.log(`- Already in sync: ${file}`);
        }
    } catch (e) {
        console.error(`✗ Error syncing ${file}:`, e);
    }
});

console.log('Locale synchronization process completed.');
