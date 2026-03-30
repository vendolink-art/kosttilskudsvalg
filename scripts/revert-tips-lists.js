const fs = require('fs');
const path = require('path');

const dir = path.join('src', 'app', '(da)', 'kosttilskud');
let totalFiles = 0;
let totalReverted = 0;

function findSectionEnd(content, start) {
  const markers = [
    '## Ofte stillede sp\u00f8rgsm\u00e5l',
    '## FAQ',
    '## Sammenligningstabel',
    '<SeoJsonLd',
    '<ComparisonTable',
  ];
  let end = content.length;
  for (const m of markers) {
    const idx = content.indexOf(m, start + 100);
    if (idx !== -1 && idx < end) end = idx;
  }
  const closingSection = content.indexOf('</section>', start + 100);
  if (closingSection !== -1 && closingSection < end) {
    const afterClose = content.indexOf('\n', closingSection);
    if (afterClose !== -1 && afterClose < end) end = afterClose;
  }
  return end;
}

function walk(d) {
  fs.readdirSync(d, { withFileTypes: true }).forEach(e => {
    const p = path.join(d, e.name);
    if (e.isDirectory()) walk(p);
    else if (e.name === 'page.mdx') {
      const c = fs.readFileSync(p, 'utf8');
      const sectionStart = c.indexOf('S\u00e5dan f\u00e5r du mest ud af');
      if (sectionStart === -1) return;

      const sectionEnd = findSectionEnd(c, sectionStart);
      const before = c.slice(0, sectionStart);
      const section = c.slice(sectionStart, sectionEnd);
      const after = c.slice(sectionEnd);

      let reverted = 0;
      const fixed = section
        .replace(/<ol>/g, () => { reverted++; return '<ul>'; })
        .replace(/<\/ol>/g, '</ul>');

      if (reverted > 0) {
        fs.writeFileSync(p, before + fixed + after, 'utf8');
        totalFiles++;
        totalReverted += reverted;
      }
    }
  });
}

walk(dir);
console.log('Reverted: ' + totalFiles + ' files, ' + totalReverted + ' <ol> back to <ul>');
