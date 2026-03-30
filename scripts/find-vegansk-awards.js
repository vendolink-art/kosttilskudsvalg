const fs = require('fs');
const path = require('path');

const pages = [
  'vitamin-b1', 'silica', 'selen', 'pwo-med-kreatin', 'proteinbarer',
  'msm', 'mct-olie', 'lycopen', 'l-theanin', 'hyaluronsyre',
  'energi-drik', 'collagen-kapsler', 'c-vitamin', 'byggraes', 'beta-alanin'
];

pages.forEach(slug => {
  const file = path.join('src', 'app', '(da)', 'kosttilskud', slug, 'page.mdx');
  const c = fs.readFileSync(file, 'utf8');
  const lines = c.split('\n');
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('BEDSTE VEGANSKE VALG') && lines[i].includes('uppercase')) {
      for (let j = i; j < Math.min(i + 5, lines.length); j++) {
        const m = lines[j].match(/title="([^"]+)"/);
        if (m) {
          // Also find the product position
          const posMatch = lines[j].match(/>(\d+)\.\s/);
          const pos = posMatch ? posMatch[1] : '?';
          console.log(slug + ' | #' + pos + ' | ' + m[1]);
          break;
        }
      }
      break;
    }
  }
});
