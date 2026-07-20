const fs = require('fs');
const path = require('path');

const localesDir = path.join(__dirname, '../src/locales');
const files = fs.readdirSync(localesDir).filter(f => f.endsWith('.json'));

let totalReplacements = 0;

files.forEach(file => {
  const filePath = path.join(localesDir, file);
  let content = fs.readFileSync(filePath, 'utf8');

  let modified = content;
  modified = modified.replace(/MOTOCORTEX DIAGNOSTICS REPORT/g, 'CORTEX OBD2 DIAGNOSIS REPORT');
  modified = modified.replace(/MOTOCORTEX TEŞHİS RAPORU/g, 'CORTEX OBD2 TEŞHİS RAPORU');
  modified = modified.replace(/MOTOCORTEX OBD2/g, 'CORTEX OBD2');
  modified = modified.replace(/MOTOCORTEX/g, 'CORTEX OBD2');
  modified = modified.replace(/MotoCortex OBD2/g, 'Cortex OBD2 Diagnosis Scanner');
  modified = modified.replace(/MotoCortex/g, 'Cortex OBD2 Diagnosis Scanner');
  modified = modified.replace(/motocortex\.app/g, 'cortexobd2.app');

  if (modified !== content) {
    fs.writeFileSync(filePath, modified, 'utf8');
    totalReplacements++;
    console.log(`Updated locale file: ${file}`);
  }
});

console.log(`Successfully updated ${totalReplacements} locale files.`);
