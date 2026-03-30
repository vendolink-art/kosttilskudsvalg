const fs = require('fs');
const path = require('path');

const pages = [
  'vitamin-b1', 'silica', 'selen', 'pwo-med-kreatin',
  'msm', 'mct-olie', 'lycopen', 'l-theanin',
  'energi-drik', 'c-vitamin', 'byggraes', 'beta-alanin'
];

pages.forEach(slug => {
  const file = path.join('src', 'app', '(da)', 'kosttilskud', slug, 'page.mdx');
  const c = fs.readFileSync(file, 'utf8');

  const veganIdx = c.indexOf('BEDSTE VEGANSKE VALG');
  if (veganIdx === -1) return;

  // Find the product card (go back to find the anchor)
  const beforeVegan = c.slice(Math.max(0, veganIdx - 3000), veganIdx);
  const anchorMatch = beforeVegan.match(/product-([a-z0-9-]+)/g);
  const productAnchor = anchorMatch ? anchorMatch[anchorMatch.length - 1] : '?';

  // Find the spec table after the VEGANSKE VALG
  const afterVegan = c.slice(veganIdx, veganIdx + 4000);
  const tableMatch = afterVegan.match(/table-default[\s\S]*?<\/table>/);
  if (tableMatch) {
    const rows = tableMatch[0].match(/<tr>[\s\S]*?<\/tr>/g) || [];
    const specs = rows.map(r => {
      const cells = r.match(/<td>(.*?)<\/td>/g) || [];
      return cells.map(c => c.replace(/<[^>]+>/g, '').trim()).join(' = ');
    }).filter(Boolean);
    console.log('\n=== ' + slug + ' (' + productAnchor + ') ===');
    specs.forEach(s => console.log('  ' + s));
  } else {
    console.log('\n=== ' + slug + ' (' + productAnchor + ') === NO TABLE');
  }
});
