import * as fs from 'fs';
import * as path from 'path';

const MDX_BASE = path.join(__dirname, '..', 'src', 'app', '(da)', 'kosttilskud');

const replacements: [RegExp, string][] = [
  [/https:\/\/www\.kostmagasinet\.dk/g, 'https://www.kosttilskudsvalg.dk'],
  [/https:\/\/kostmagasinet\.dk/g, 'https://www.kosttilskudsvalg.dk'],
  [/Kostmagasinets/g, 'Kosttilskudsvalgs'],
  [/Kostmagasinet/g, 'Kosttilskudsvalg'],
];

let totalFiles = 0;
let totalReplacements = 0;

function processDir(base: string) {
  const entries = fs.readdirSync(base, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(base, entry.name);
    if (entry.isDirectory()) {
      processDir(fullPath);
    } else if (entry.name.endsWith('.mdx')) {
      let content = fs.readFileSync(fullPath, 'utf-8');
      let changed = 0;

      for (const [pattern, replacement] of replacements) {
        const matches = content.match(pattern);
        if (matches) {
          changed += matches.length;
          content = content.replace(pattern, replacement);
        }
      }

      if (changed > 0) {
        fs.writeFileSync(fullPath, content, 'utf-8');
        totalFiles++;
        totalReplacements += changed;
      }
    }
  }
}

console.log('=== Rebranding MDX files ===\n');
processDir(MDX_BASE);
console.log(`Done: ${totalReplacements} replacements across ${totalFiles} MDX files`);
