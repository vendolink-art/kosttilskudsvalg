const fs = require('fs');
const path = require('path');

const dir = path.join('src', 'app', '(da)', 'kosttilskud');
let totalFiles = 0;
let totalUlConverted = 0;

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

      let converted = 0;
      const fixed = section
        .replace(/<ul>/g, () => { converted++; return '<ol>'; })
        .replace(/<\/ul>/g, '</ol>');

      if (converted > 0) {
        fs.writeFileSync(p, before + fixed + after, 'utf8');
        totalFiles++;
        totalUlConverted += converted;
        console.log(path.basename(path.dirname(p)) + ': ' + converted + ' <ul> → <ol>');
      }
    }
  });
}

function findSectionEnd(content, start) {
  const faqMarkers = [
    '## Ofte stillede sp\u00f8rgsm\u00e5l',
    '## FAQ',
    '## Sammenligningstabel',
    '<SeoJsonLd',
    '<ComparisonTable',
  ];
  let end = content.length;
  for (const marker of faqMarkers) {
    const idx = content.indexOf(marker, start + 100);
    if (idx !== -1 && idx < end) end = idx;
  }
  const closingSection = content.indexOf('</section>', start + 100);
  if (closingSection !== -1 && closingSection < end) {
    const afterClose = content.indexOf('\n', closingSection);
    if (afterClose !== -1 && afterClose < end) end = afterClose;
  }
  return end;
}

walk(dir);
console.log('\nDone: ' + totalFiles + ' files, ' + totalUlConverted + ' <ul> converted to <ol>');
