const fs = require('fs');
const path = require('path');

const dir = path.join('src', 'app', '(da)', 'kosttilskud');
let totalRemoved = 0;
let totalFiles = 0;

const TABLE_ROW_PATTERN = /\s*<tr><td>[^<]*<\/td><td>Ikke oplyst<\/td><\/tr>/g;

function walk(d) {
  fs.readdirSync(d, { withFileTypes: true }).forEach(e => {
    const p = path.join(d, e.name);
    if (e.isDirectory()) walk(p);
    else if (e.name === 'page.mdx') {
      let c = fs.readFileSync(p, 'utf8');
      if (!c.includes('Ikke oplyst')) return;

      const tableMatches = c.match(TABLE_ROW_PATTERN);
      const tableCount = tableMatches ? tableMatches.length : 0;

      if (tableCount > 0) {
        c = c.replace(TABLE_ROW_PATTERN, '');
      }

      // Also handle multi-line table rows
      c = c.replace(/\s*<tr>\s*\n\s*<td>[^<]*<\/td>\s*\n\s*<td>Ikke oplyst<\/td>\s*\n\s*<\/tr>/g, (m) => {
        return '';
      });

      // Clean up prose references like: 'da sødning er angivet som "Ikke oplyst"'
      c = c.replace(/, da den er angivet som "Ikke oplyst"/g, '');
      c = c.replace(/, da sødning er angivet som "Ikke oplyst"/g, '');
      c = c.replace(/ og det kan have betydning for den bruger, der går meget op i præcis sammensætning\./g, '.');
      c = c.replace(/Man bemærker hurtigt, at produktet er nemt at forstå og nemt at passe ind i en rutine, men også at informationen om sødning er begrænset\./g,
        'Man bemærker hurtigt, at produktet er nemt at forstå og nemt at passe ind i en rutine.');

      fs.writeFileSync(p, c, 'utf8');
      if (tableCount > 0) {
        totalRemoved += tableCount;
        totalFiles++;
        console.log(path.basename(path.dirname(p)) + ': ' + tableCount + ' table rows removed');
      }
    }
  });
}

walk(dir);
console.log('\nDone: ' + totalRemoved + ' table rows removed across ' + totalFiles + ' files');
