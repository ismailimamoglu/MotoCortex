/**
 * Matrix Sync Helper Script for 26 Supported Locales
 */
const fs = require('fs');
const path = require('path');

const localesDir = path.join(__dirname, '../src/locales');
const enPath = path.join(localesDir, 'en.json');

if (fs.existsSync(enPath)) {
  const enData = JSON.parse(fs.readFileSync(enPath, 'utf8'));
  const files = fs.readdirSync(localesDir).filter(f => f.endsWith('.json'));
  files.forEach(file => {
    const filePath = path.join(localesDir, file);
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    for (const key in enData) {
      if (typeof enData[key] === 'object' && enData[key] !== null) {
        data[key] = data[key] || {};
        for (const subKey in enData[key]) {
          if (data[key][subKey] === undefined) {
            data[key][subKey] = enData[key][subKey];
          }
        }
      } else if (data[key] === undefined) {
        data[key] = enData[key];
      }
    }
    fs.writeFileSync(filePath, JSON.stringify(data, null, 4), 'utf8');
  });
  console.log('Matrix sync complete!');
}
