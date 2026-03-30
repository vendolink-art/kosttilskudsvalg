import * as fs from 'fs';
import * as path from 'path';

const SRC = path.join(__dirname, '..', 'src');
const CONTENT = path.join(__dirname, '..', 'content');
const CONFIG = path.join(__dirname, '..', 'src', 'config');

const replacements: [RegExp, string][] = [
  // Domain URLs
  [/https:\/\/www\.kostmagasinet\.dk/g, 'https://www.kosttilskudsvalg.dk'],
  [/https:\/\/kostmagasinet\.dk/g, 'https://www.kosttilskudsvalg.dk'],
  [/https:\/\/kostmag\.dk/g, 'https://www.kosttilskudsvalg.dk'],
  // Email addresses
  [/redaktion@kostmagasinet\.dk/g, 'redaktion@kosttilskudsvalg.dk'],
  [/kontakt@kostmagasinet\.dk/g, 'kontakt@kosttilskudsvalg.dk'],
  [/line@kostmagasinet\.dk/g, 'line@kosttilskudsvalg.dk'],
  [/mikkel@kostmagasinet\.dk/g, 'mikkel@kosttilskudsvalg.dk'],
  [/thomas@kostmagasinet\.dk/g, 'thomas@kosttilskudsvalg.dk'],
  // Brand name (careful order - possessive first, then base)
  [/Kostmagasinets/g, 'Kosttilskudsvalgs'],
  [/Kostmagasinet/g, 'Kosttilskudsvalg'],
  [/KOSTMAGASINET/g, 'KOSTTILSKUDSVALG'],
];

let totalFiles = 0;
let totalReplacements = 0;

function processFile(filePath: string) {
  let content = fs.readFileSync(filePath, 'utf-8');
  let changed = 0;

  for (const [pattern, replacement] of replacements) {
    const matches = content.match(pattern);
    if (matches) {
      changed += matches.length;
      content = content.replace(pattern, replacement);
    }
  }

  if (changed > 0) {
    fs.writeFileSync(filePath, content, 'utf-8');
    totalFiles++;
    totalReplacements += changed;
    const rel = path.relative(path.join(__dirname, '..'), filePath);
    console.log(`  ${rel}: ${changed} replacements`);
  }
}

function processDir(base: string, extensions: string[]) {
  const entries = fs.readdirSync(base, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(base, entry.name);
    if (entry.isDirectory()) {
      if (['node_modules', '.next', '.git', 'crawled-products', 'crawled-html'].includes(entry.name)) continue;
      processDir(fullPath, extensions);
    } else if (extensions.some(ext => entry.name.endsWith(ext))) {
      processFile(fullPath);
    }
  }
}

console.log('=== Rebranding: Kostmagasinet → Kosttilskudsvalg ===\n');

console.log('Processing src/ (tsx, ts, css)...');
processDir(SRC, ['.tsx', '.ts', '.css']);

console.log('\nProcessing content/ (json)...');
processDir(CONTENT, ['.json']);

console.log(`\n=== Done: ${totalReplacements} replacements across ${totalFiles} files ===`);
