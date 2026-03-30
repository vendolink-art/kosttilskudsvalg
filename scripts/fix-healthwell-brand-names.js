const fs = require('fs');
const path = require('path');

const FIXES = [
  { page: 'kobber-tabletter', old: 'Kobber', corrected: 'Healthwell Kobber', brandWrong: '"brand":"Kobber"', brandRight: '"brand":"Healthwell"' },
  { page: 'c-vitamin', old: 'Vitamin C 1000 Plus', corrected: 'Healthwell Vitamin C 1000 Plus', brandWrong: '"brand":"Vitamin"', brandRight: '"brand":"Healthwell"' },
  { page: 'selen', old: 'Selen 100', corrected: 'Healthwell Selen 100', brandWrong: '"brand":"Selen"', brandRight: '"brand":"Healthwell"' },
  { page: 'arginin', old: 'Arginin 500', corrected: 'Healthwell Arginin 500', brandWrong: '"brand":"Arginin"', brandRight: '"brand":"Healthwell"' },
  { page: 'zink', old: 'Zink 25 Plus', corrected: 'Healthwell Zink 25 Plus', brandWrong: '"brand":"Zink"', brandRight: '"brand":"Healthwell"' },
  { page: 'vitamin-b2-riboflavin', old: 'Vitamin B2 100', corrected: 'Healthwell Vitamin B2 100', brandWrong: '"brand":"Vitamin"', brandRight: '"brand":"Healthwell"' },
  { page: 'vitamin-b12', old: 'Vitamin B12 1000 Methyleret', corrected: 'Healthwell Vitamin B12 1000 Methyleret', brandWrong: '"brand":"Vitamin"', brandRight: '"brand":"Healthwell"' },
  { page: 'tyrosin', old: 'Tyrosin 1000', corrected: 'Healthwell Tyrosin 1000', brandWrong: '"brand":"Tyrosin"', brandRight: '"brand":"Healthwell"' },
];

const BASE = path.join('src', 'app', '(da)', 'kosttilskud');

for (const fix of FIXES) {
  const filePath = path.join(BASE, fix.page, 'page.mdx');
  if (!fs.existsSync(filePath)) {
    console.log(`SKIP: ${fix.page} - file not found`);
    continue;
  }

  let content = fs.readFileSync(filePath, 'utf8');
  const original = content;
  let changes = 0;

  // Fix display names in toplists, h3 titles, sammenfatning, image alts, specs tables
  // Only replace where it's the exact product name (not inside longer strings like "Selen 100 µg")
  const namePatterns = [
    // toplist display name
    new RegExp(`(leading-snug block">)${escRe(fix.old)}(<\\/span>)`, 'g'),
    // h3 product title: title="Name">N. Name</h3>
    new RegExp(`(title="${escRe(fix.old)}">)(\\d+\\. )${escRe(fix.old)}(<\\/h3>)`, 'g'),
    // title attribute alone
    new RegExp(`(title=")${escRe(fix.old)}(">)`, 'g'),
    // sammenfatning link text
    new RegExp(`(underline-offset-2 truncate">)${escRe(fix.old)}(<\\/a>)`, 'g'),
    // image alt for product card and toplist
    new RegExp(`(alt=")${escRe(fix.old)}("\\s+width)`, 'g'),
    // test image alt
    new RegExp(`(alt="Test af )${escRe(fix.old)}("\\s+width)`, 'g'),
    // specs table product name
    new RegExp(`(<td>🏷️ Produktnavn<\\/td><td>)${escRe(fix.old)}(<\\/td>)`, 'g'),
    // SeoJsonLd name
    new RegExp(`("name":")${escRe(fix.old)}(",["\\.}])`, 'g'),
  ];

  for (const pat of namePatterns) {
    const before = content;
    content = content.replace(pat, (match, ...groups) => {
      return match.replace(fix.old, fix.corrected);
    });
    if (content !== before) changes++;
  }

  // Fix ComparisonTable brand + name
  if (fix.brandWrong) {
    // Fix brand in ComparisonTable for this specific product
    const compPat = new RegExp(
      `("name":"${escRe(fix.old)}","brand":")[^"]*"`,
      'g'
    );
    const before = content;
    content = content.replace(compPat, `"name":"${fix.corrected}","brand":"Healthwell"`);
    if (content !== before) changes++;
  }

  // Also fix specs table brand if it's wrong
  const brandTablePat = new RegExp(
    `(<td>🧴 Brand<\\/td>\\s*<td>)${escRe(fix.old)}(<\\/td>)`,
    'g'
  );
  const bt = content;
  content = content.replace(brandTablePat, `$1Healthwell$2`);
  if (content !== bt) changes++;

  if (content !== original) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`${fix.page}: ${fix.old} → ${fix.corrected} (${changes} pattern groups matched)`);
  } else {
    console.log(`${fix.page}: no changes needed`);
  }
}

function escRe(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

console.log('\nDone.');
