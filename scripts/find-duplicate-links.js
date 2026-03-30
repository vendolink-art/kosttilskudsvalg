const fs = require('fs');
const path = require('path');

const dir = path.join('src', 'app', '(da)', 'kosttilskud');
const linkRe = /<a\s+href="(\/[^"]+)"\s+className="font-medium text-emerald-700[^"]*"[^>]*>([^<]+)<\/a>/g;
let totalDuplicates = 0;
const results = [];

function walk(d) {
  fs.readdirSync(d, { withFileTypes: true }).forEach(e => {
    const p = path.join(d, e.name);
    if (e.isDirectory()) walk(p);
    else if (e.name === 'page.mdx') {
      const c = fs.readFileSync(p, 'utf8');
      const seen = {};
      let match;
      linkRe.lastIndex = 0;
      while ((match = linkRe.exec(c)) !== null) {
        const href = match[1];
        if (!seen[href]) {
          seen[href] = { count: 1, text: match[2] };
        } else {
          seen[href].count++;
        }
      }
      const dupes = Object.entries(seen).filter(([, v]) => v.count > 1);
      if (dupes.length > 0) {
        const slug = path.basename(path.dirname(p));
        const total = dupes.reduce((s, [, v]) => s + v.count - 1, 0);
        totalDuplicates += total;
        results.push({ slug, dupes: dupes.map(([href, v]) => href + ' x' + v.count) });
      }
    }
  });
}

walk(dir);
results.sort((a, b) => b.dupes.length - a.dupes.length);
console.log('Pages with duplicate internal links: ' + results.length);
console.log('Total extra links to remove: ' + totalDuplicates);
console.log('');
results.forEach(r => {
  console.log(r.slug + ':');
  r.dupes.forEach(d => console.log('  ' + d));
});
