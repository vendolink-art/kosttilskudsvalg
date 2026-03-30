const fs = require('fs');
const path = require('path');

const SLUG_TO_TITLE = {
  'd vitamin': 'D-vitamin',
  'bedste m\u00e5ltidserstatning': 'm\u00e5ltidserstatning',
  'kaempenatlysolie': 'k\u00e6mpenatlysolie',
  'lions mane': "Lion's Mane",
  'ingefaer pulver': 'ingef\u00e6rpulver',
  'hyben kapsler': 'hybenkapsler',
  'gele royal': 'gel\u00e9 royal',
  'braendenaelde pulver': 'br\u00e6nden\u00e6ldepulver',
  'vegansk omega 3': 'vegansk omega-3',
  'kobber tabletter': 'kobbertabletter',
  'vitamin b6': 'vitamin B6',
  'vitamin b2 riboflavin': 'vitamin B2 (riboflavin)',
  'jod tabletter': 'jodtabletter',
  'fordojelsesenzym': 'ford\u00f8jelsesenzym',
  'blabaertilskud': 'bl\u00e5b\u00e6rtilskud',
  'vitamin b12': 'vitamin B12',
  'vitamin b1': 'vitamin B1',
  'vanddrivende piller': 'vanddrivende piller',
  'tribulus terrestris': 'tribulus terrestris',
  'tranebaerkapsler': 'traneb\u00e6rkapsler',
  'proteinpulver til restitution': 'proteinpulver til restitution',
  'proteinpulver til vaegttab': 'proteinpulver til v\u00e6gttab',
  'proteinpulver uden sodestoffer': 'proteinpulver uden s\u00f8destoffer',
  'proteinpulver uden tilsat sukker': 'proteinpulver uden tilsat sukker',
  'pwo med koffein': 'pre-workout med koffein',
  'pwo med kreatin': 'pre-workout med kreatin',
  'koffeinfri pwo': 'koffeinfri pre-workout',
  'super greens pulver': 'super greens-pulver',
  'moringa tilskud': 'moringatilskud',
  'gron te': 'gr\u00f8n te',
  'gron te piller': 'gr\u00f8n te-piller',
  'hvedegraes pulver': 'hvedegr\u00e6spulver',
  'ingefaer piller': 'ingef\u00e6rpiller',
  'vitamin d3 k2': 'vitamin D3+K2',
  'vitamin k2': 'vitamin K2',
  'e vitamin': 'E-vitamin',
  'c vitamin': 'C-vitamin',
  'b vitamin': 'B-vitamin',
  'l leucin': 'L-leucin',
  'l theanin': 'L-theanin',
};

const dir = path.join('src', 'app', '(da)', 'kosttilskud');
let totalFixed = 0;

function walk(d) {
  fs.readdirSync(d, { withFileTypes: true }).forEach(e => {
    const p = path.join(d, e.name);
    if (e.isDirectory()) walk(p);
    else if (e.name === 'page.mdx') {
      let c = fs.readFileSync(p, 'utf8');
      let changed = false;

      for (const [slug, proper] of Object.entries(SLUG_TO_TITLE)) {
        const oldH2 = 'den rigtige ' + slug;
        if (c.includes(oldH2)) {
          const newH2 = 'det rigtige ' + proper;
          c = c.split(oldH2).join(newH2);
          changed = true;
          totalFixed++;
          console.log(path.relative('.', p) + ': "' + slug + '" -> "' + proper + '"');
        }
      }
      if (changed) fs.writeFileSync(p, c, 'utf8');
    }
  });
}

walk(dir);
console.log('\nTotal: ' + totalFixed + ' fixed');
