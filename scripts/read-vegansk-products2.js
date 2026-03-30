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

  const lines = c.split('\n');
  let inVeganProduct = false;
  let veganLine = -1;

  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('BEDSTE VEGANSKE VALG') && lines[i].includes('uppercase')) {
      inVeganProduct = true;
      veganLine = i;
    }
    if (inVeganProduct && lines[i].includes('table-default')) {
      console.log('\n=== ' + slug + ' ===');
      for (let j = i; j < Math.min(i + 30, lines.length); j++) {
        const line = lines[j].trim();
        if (line.includes('</table>')) break;
        if (line.includes('<td>')) {
          console.log('  ' + line.replace(/<[^>]+>/g, ''));
        }
      }
      break;
    }
  }
});
