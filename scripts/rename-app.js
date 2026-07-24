const fs = require('fs');
const path = require('path');

const rootDir = path.join(__dirname, '..');

const ignoreDirs = ['node_modules', '.git', '.expo', 'dist', 'build', 'android/build', 'ios/build'];

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    const fullPath = path.join(dir, file);
    const relPath = path.relative(rootDir, fullPath);
    if (ignoreDirs.some(id => relPath === id || relPath.startsWith(id + path.sep))) {
      return;
    }
    const stat = fs.statSync(fullPath);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(fullPath));
    } else {
      if (
        fullPath.endsWith('.json') ||
        fullPath.endsWith('.tsx') ||
        fullPath.endsWith('.ts') ||
        fullPath.endsWith('.js') ||
        fullPath.endsWith('.xml') ||
        fullPath.endsWith('.gradle') ||
        fullPath.endsWith('.md')
      ) {
        results.push(fullPath);
      }
    }
  });
  return results;
}

const files = walk(rootDir);
let count = 0;

files.forEach(filePath => {
  let content = fs.readFileSync(filePath, 'utf8');
  let updated = content;

  updated = updated.replace(/Cortex OBD2 Diagnostic Scanner/g, 'Cortex OBD2 Diagnostic Scanner');
  updated = updated.replace(/OBD2 DIAGNOSTIC SCANNER/g, 'OBD2 DIAGNOSTIC SCANNER');
  updated = updated.replace(/Diagnostic Scanner/g, 'Diagnostic Scanner');

  if (updated !== content) {
    fs.writeFileSync(filePath, updated, 'utf8');
    count++;
    console.log(`Updated: ${path.relative(rootDir, filePath)}`);
  }
});

console.log(`Successfully updated ${count} files.`);
