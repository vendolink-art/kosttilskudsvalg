const fs = require('fs');
const path = require('path');

const dir = path.join('src', 'app', '(da)', 'kosttilskud');
let totalRemoved = 0;
let totalFiles = 0;

function walk(d) {
  fs.readdirSync(d, { withFileTypes: true }).forEach(e => {
    const p = path.join(d, e.name);
    if (e.isDirectory()) walk(p);
    else if (e.name === 'page.mdx') {
      const c = fs.readFileSync(p, 'utf8');
      const seen = new Set();
      let removed = 0;

      const fixed = c.replace(
        /<a\s+href="(\/[^"]+)"\s+className="font-medium text-emerald-700[^"]*"[^>]*>([^<]+)<\/a>/g,
        (full, href, text) => {
          if (!seen.has(href)) {
            seen.add(href);
            return full;
          }
          removed++;
          return text;
        }
      );

      if (removed > 0) {
        fs.writeFileSync(p, fixed, 'utf8');
        totalRemoved += removed;
        totalFiles++;
        console.log(path.basename(path.dirname(p)) + ': removed ' + removed + ' duplicate links');
      }
    }
  });
}

walk(dir);
console.log('\nDone: ' + totalRemoved + ' duplicate links removed across ' + totalFiles + ' files');
