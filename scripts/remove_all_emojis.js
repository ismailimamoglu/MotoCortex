/**
 * scripts/remove_all_emojis.js
 * 
 * Scans all source code and locale files in src/ and removes all emojis/symbols,
 * ensuring a 100% clean, professional, enterprise UI typography.
 */

const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, '../src');

// Unicode Emoji regex covering emoticons, flags, pictographs, transport symbols, etc.
const EMOJI_REGEX = /[\u{1F300}-\u{1F9FF}\u{1FA00}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F1E0}-\u{1F1FF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{1F900}-\u{1F9FF}\u{1F500}-\u{1F5FF}\u{2300}-\u{23FF}\u{2B50}\u{2B55}\u{2934}\u{2935}\u{25AA}\u{25AB}\u{25FE}\u{25FD}\u{25FB}\u{25FC}\u{200D}\u{FE0F}]/gu;

function processDirectory(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            processDirectory(fullPath);
        } else if (entry.isFile() && (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx') || entry.name.endsWith('.json') || entry.name.endsWith('.js'))) {
            let content = fs.readFileSync(fullPath, 'utf8');
            if (EMOJI_REGEX.test(content)) {
                console.log(`[!] Removing emojis from: ${path.relative(process.cwd(), fullPath)}`);
                // Replace emojis and clean up resulting double spaces
                const cleaned = content.replace(EMOJI_REGEX, '').replace(/  +/g, ' ');
                fs.writeFileSync(fullPath, cleaned, 'utf8');
            }
        }
    }
}

console.log('[*] Scanning src/ for all emojis and symbols...');
processDirectory(srcDir);
console.log('[SUCCESS] All emojis and symbols have been completely removed from the entire application!');
