const fs = require('fs');
const content = fs.readFileSync('/Users/ismailimamoglu/Desktop/MotoCortex/App.tsx', 'utf8');

let braceCount = 0;
let parenCount = 0;
let bracketCount = 0;
let lineNum = 1;
let inString = false;
let stringChar = '';
let inComment = false;
let inLineComment = false;

for (let i = 0; i < content.length; i++) {
  const char = content[i];
  const nextChar = content[i + 1];

  if (char === '\n') {
    lineNum++;
    inLineComment = false;
  }

  if (inLineComment) continue;
  if (inComment) {
    if (char === '*' && nextChar === '/') {
      inComment = false;
      i++;
    }
    continue;
  }

  if (inString) {
    if (char === stringChar && content[i - 1] !== '\\') {
      inString = false;
    }
    continue;
  }

  if (char === '/' && nextChar === '/') {
    inLineComment = true;
    i++;
    continue;
  }
  if (char === '/' && nextChar === '*') {
    inComment = true;
    i++;
    continue;
  }

  if (char === '"' || char === "'" || char === '`') {
    inString = true;
    stringChar = char;
    continue;
  }

  if (char === '{') {
    braceCount++;
  }
  if (char === '}') {
    braceCount--;
    if (braceCount === 0 && lineNum > 1204 && lineNum < 3190) {
      console.log(`Braces hit 0 inside MainApp at line ${lineNum}`);
    }
    if (braceCount < 0) {
      console.log(`Unmatched } at line ${lineNum}`);
      braceCount = 0;
    }
  }
}

console.log(`Final counts - Braces: ${braceCount}`);
