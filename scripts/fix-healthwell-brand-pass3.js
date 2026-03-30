const fs = require('fs');
const path = require('path');

const FIXES = [
  { page: 'vitamin-b1', old: 'Vitamin B1 100', corrected: 'Healthwell Vitamin B1 100' },
  { page: 'd-vitamin', old: 'Vitamin D3 5000 IE', corrected: 'Healthwell Vitamin D3 5000 IE' },
  { page: 'b-vitamin', old: 'Vitamin B Kompleks 50', corrected: 'Healthwell Vitamin B Kompleks 50' },
];

const BASE = path.join('src', 'app', '(da)', 'kosttilskud');

function esc(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

for (const fix of FIXES) {
  const filePath = path.join(BASE, fix.page, 'page.mdx');
  let content = fs.readFileSync(filePath, 'utf8');
  const original = content;
  let fixes = [];

  // Toplist display names
  const topRe = new RegExp(`(leading-snug block">)${esc(fix.old)}(</span>)`, 'g');
  if (topRe.test(content)) { content = content.replace(topRe, `$1${fix.corrected}$2`); fixes.push('toplist'); }

  // h3 title attr + visible text
  const h3TitleRe = new RegExp(`(title=")${esc(fix.old)}(">)`, 'g');
  if (h3TitleRe.test(content)) { content = content.replace(h3TitleRe, `$1${fix.corrected}$2`); fixes.push('h3 title attr'); }
  const h3VisRe = new RegExp(`(title="${esc(fix.corrected)}">[^<]*?\\d+\\. )${esc(fix.old)}(</h3>)`, 'g');
  if (h3VisRe.test(content)) { content = content.replace(h3VisRe, `$1${fix.corrected}$2`); fixes.push('h3 visible'); }

  // Sammenfatning link text
  const samRe = new RegExp(`(truncate">)${esc(fix.old)}(</a>)`, 'g');
  if (samRe.test(content)) { content = content.replace(samRe, `$1${fix.corrected}$2`); fixes.push('sammenfatning'); }

  // Image alts
  const imgRe = new RegExp(`(alt=")${esc(fix.old)}("\\s+width)`, 'g');
  if (imgRe.test(content)) { content = content.replace(imgRe, `$1${fix.corrected}$2`); fixes.push('img alt'); }
  const testImgRe = new RegExp(`(alt="Test af )${esc(fix.old)}("\\s+width)`, 'g');
  if (testImgRe.test(content)) { content = content.replace(testImgRe, `$1${fix.corrected}$2`); fixes.push('test img alt'); }

  // Specs table product name
  const specRe = new RegExp(`(<td>🏷️ Produktnavn</td><td>)${esc(fix.old)}(</td>)`, 'g');
  if (specRe.test(content)) { content = content.replace(specRe, `$1${fix.corrected}$2`); fixes.push('specs name'); }

  // ComparisonTable: fix name and brand
  const compOldRe = new RegExp(`"name":"${esc(fix.old)}","brand":"[^"]*"`, 'g');
  const b1 = content;
  content = content.replace(compOldRe, `"name":"${fix.corrected}","brand":"Healthwell"`);
  if (content !== b1) fixes.push('ComparisonTable');

  // SeoJsonLd
  const jsonRe = new RegExp(`"name":"${esc(fix.old)}"`, 'g');
  const b2 = content;
  content = content.replace(jsonRe, `"name":"${fix.corrected}"`);
  if (content !== b2) fixes.push('SeoJsonLd');

  if (content !== original) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`${fix.page}: ${fix.old} → ${fix.corrected} (${fixes.join(', ')})`);
  } else {
    console.log(`${fix.page}: no changes`);
  }
}

console.log('\nDone.');
