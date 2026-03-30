const fs = require('fs');
const path = require('path');

const FIXES = [
  { page: 'kobber-tabletter', old: 'Kobber', corrected: 'Healthwell Kobber' },
  { page: 'c-vitamin', old: 'Vitamin C 1000 Plus', corrected: 'Healthwell Vitamin C 1000 Plus' },
  { page: 'selen', old: 'Selen 100', corrected: 'Healthwell Selen 100' },
  { page: 'arginin', old: 'Arginin 500', corrected: 'Healthwell Arginin 500' },
  { page: 'zink', old: 'Zink 25 Plus', corrected: 'Healthwell Zink 25 Plus' },
  { page: 'vitamin-b2-riboflavin', old: 'Vitamin B2 100', corrected: 'Healthwell Vitamin B2 100' },
  { page: 'vitamin-b12', old: 'Vitamin B12 1000 Methyleret', corrected: 'Healthwell Vitamin B12 1000 Methyleret' },
  { page: 'tyrosin', old: 'Tyrosin 1000', corrected: 'Healthwell Tyrosin 1000' },
];

const BASE = path.join('src', 'app', '(da)', 'kosttilskud');

function esc(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

for (const fix of FIXES) {
  const filePath = path.join(BASE, fix.page, 'page.mdx');
  let content = fs.readFileSync(filePath, 'utf8');
  const original = content;
  let fixes = [];

  // Fix 1: h3 visible text - pattern: title="Healthwell X">N. X</h3> → title="Healthwell X">N. Healthwell X</h3>
  const h3Re = new RegExp(
    `(title="${esc(fix.corrected)}">[^<]*?\\d+\\. )${esc(fix.old)}(</h3>)`,
    'g'
  );
  if (h3Re.test(content)) {
    content = content.replace(h3Re, `$1${fix.corrected}$2`);
    fixes.push('h3 visible text');
  }

  // Fix 2: ComparisonTable - fix brand for the now-updated name
  const compBrandRe = new RegExp(
    `"name":"${esc(fix.corrected)}","brand":"[^"]*"`,
    'g'
  );
  const before = content;
  content = content.replace(compBrandRe, `"name":"${fix.corrected}","brand":"Healthwell"`);
  if (content !== before) fixes.push('ComparisonTable brand');

  // Fix 3: SeoJsonLd - fix any remaining old names
  const jsonldRe = new RegExp(
    `"name":"${esc(fix.old)}"`,
    'g'
  );
  const before2 = content;
  content = content.replace(jsonldRe, `"name":"${fix.corrected}"`);
  if (content !== before2) fixes.push('SeoJsonLd name');

  // Fix 4: Specs table brand row
  const brandSpecRe = new RegExp(
    `(<td>🧴 Brand</td>[\\s\\n]*<td>)${esc(fix.old)}(</td>)`,
    'g'
  );
  const before3 = content;
  content = content.replace(brandSpecRe, `$1Healthwell$2`);
  if (content !== before3) fixes.push('specs brand');

  if (content !== original) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`${fix.page}: fixed ${fixes.join(', ')}`);
  } else {
    console.log(`${fix.page}: already correct`);
  }
}

console.log('\nDone.');
