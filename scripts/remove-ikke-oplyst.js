const fs = require('fs');
const path = require('path');

const dir = path.join('src', 'app', '(da)', 'kosttilskud');
let totalRemoved = 0;
let totalFiles = 0;

const PATTERN = /\s*<div>\s*\n\s*<dt[^>]*>[^<]*<\/dt>\s*\n\s*<dd[^>]*>Ikke oplyst<\/dd>\s*\n\s*<\/div>/g;

function walk(d) {
  fs.readdirSync(d, { withFileTypes: true }).forEach(e => {
    const p = path.join(d, e.name);
    if (e.isDirectory()) walk(p);
    else if (e.name === 'page.mdx') {
      const c = fs.readFileSync(p, 'utf8');
      const matches = c.match(PATTERN);
      if (matches && matches.length > 0) {
        const fixed = c.replace(PATTERN, '');
        fs.writeFileSync(p, fixed, 'utf8');
        totalRemoved += matches.length;
        totalFiles++;
        console.log(path.basename(path.dirname(p)) + ': ' + matches.length + ' removed');
      }
    }
  });
}

walk(dir);
console.log('\nDone: ' + totalRemoved + ' "Ikke oplyst" fields removed across ' + totalFiles + ' files');
