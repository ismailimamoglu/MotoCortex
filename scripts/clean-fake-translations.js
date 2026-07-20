const fs = require('fs');
const path = require('path');

const localesDir = path.join(__dirname, '../src/locales');
const enPath = path.join(localesDir, 'en.json');
const en = JSON.parse(fs.readFileSync(enPath, 'utf8'));

function flatKeys(obj, prefix) {
  prefix = prefix || '';
  let keys = [];
  for (const k in obj) {
    const fullKey = prefix ? prefix+'.'+k : k;
    if (typeof obj[k] === 'object' && obj[k] !== null) {
      keys.push(...flatKeys(obj[k], fullKey));
    } else {
      keys.push(fullKey);
    }
  }
  return keys;
}

function getVal(obj, keyPath) {
  const parts = keyPath.split('.');
  let cur = obj;
  for (const p of parts) {
    if (!cur || typeof cur !== 'object') return undefined;
    cur = cur[p];
  }
  return cur;
}

function removeKey(obj, keyPath) {
  const parts = keyPath.split('.');
  let cur = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    const p = parts[i];
    if (!cur || typeof cur !== 'object') return false;
    cur = cur[p];
  }
  const lastKey = parts[parts.length - 1];
  if (cur && typeof cur === 'object' && lastKey in cur) {
    delete cur[lastKey];
    return true;
  }
  return false;
}

const enKeys = flatKeys(en);
const localeFiles = fs.readdirSync(localesDir).filter(f => f.endsWith('.json') && f !== 'en.json');

console.log('Starting cleanup of fake translations across ' + localeFiles.length + ' files...');

for (const file of localeFiles) {
  const filePath = path.join(localesDir, file);
  let langObj;
  try {
    langObj = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (e) {
    console.error('Failed to parse ' + file + ':', e.message);
    continue;
  }

  let cleanedCount = 0;
  for (const k of enKeys) {
    const enVal = getVal(en, k);
    const langVal = getVal(langObj, k);
    if (langVal && langVal === enVal && typeof enVal === 'string' && enVal.length > 5) {
      // It's a fake translation - strip it so i18next fallbackLng: 'en' kicks in
      if (removeKey(langObj, k)) {
        cleanedCount++;
      }
    }
  }

  if (cleanedCount > 0) {
    fs.writeFileSync(filePath, JSON.stringify(langObj, null, 4) + '\n', 'utf8');
    console.log('Cleaned ' + cleanedCount + ' fake translations from ' + file);
  }
}
console.log('Cleanup complete!');
