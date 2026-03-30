const fs = require('fs');
const path = require('path');

const REPLACEMENTS = {
  'vitamin-b1': 'ANERKENDT KVALITETSM\u00c6RKE',
  'silica': 'H\u00d8JESTE SILICIUMINDHOLD',
  'selen': 'FLEST SELENFORMER',
  'pwo-med-kreatin': 'BREDESTE INGREDIENSPROFIL',
  'msm': 'FLEST PORTIONER PR PAKKE',
  'mct-olie': 'NORDISK FREMSTILLING',
  'lycopen': 'BEDSTE DAGLIGE VALG',
  'l-theanin': 'H\u00d8JESTE DOSIS PR KAPSEL',
  'energi-drik': 'BEDSTE AMINOSYREPROFIL',
  'c-vitamin': 'BREDESTE C-VITAMINKILDE',
  'byggraes': 'BREDESTE INGREDIENSPROFIL',
  'beta-alanin': 'BEDSTE PRIS PR PORTION',
};

const AWARD_COPY = {
  'vitamin-b1': 'Anerkendt kvalitetsm\u00e6rke med solid dosering og gennempr\u00f8vet format.',
  'silica': 'H\u00f8jeste siliciumindhold pr. kapsel i feltet.',
  'selen': 'Tre forskellige selenkilder i \u00e9n tablet for bredest mulig d\u00e6kning.',
  'pwo-med-kreatin': 'Bredeste sammens\u00e6tning med 9+ aktive ingredienser samlet i \u00e9n portion.',
  'msm': 'St\u00f8rste pakning med 180 kapsler i feltet.',
  'mct-olie': 'Fremstillet i Norden med 100\u00a0% ren kokosolie.',
  'lycopen': 'St\u00e6rk profil, der supplerer de \u00f8vrige valg.',
  'l-theanin': 'H\u00f8jeste dosis pr. kapsel i feltet med 400\u00a0mg L-theanin.',
  'energi-drik': 'St\u00e6rkest BCAA-profil med 2.500\u00a0mg pr. d\u00e5se.',
  'c-vitamin': 'Flere C-vitaminkilder: ascorbinsyre, hybenekstrakt og citrusbioflavonoider.',
  'byggraes': 'Bredeste ingrediensprofil med 15+ planteekstrakter.',
  'beta-alanin': 'Laveste pris pr. portion i feltet med 1,9\u00a0kr/portion.',
};

let totalFixed = 0;

for (const [slug, newAward] of Object.entries(REPLACEMENTS)) {
  const file = path.join('src', 'app', '(da)', 'kosttilskud', slug, 'page.mdx');
  let c = fs.readFileSync(file, 'utf8');

  const oldAward = 'BEDSTE VEGANSKE VALG';
  const count = (c.match(new RegExp(oldAward, 'g')) || []).length;

  c = c.split(oldAward).join(newAward);

  const oldCopy = 'Tydelig vegansk profil i feltet. H\u00f8jeste score blandt produkterne med denne profil.';
  if (c.includes(oldCopy) && AWARD_COPY[slug]) {
    c = c.replace(oldCopy, newAward + ' \u2013 ' + AWARD_COPY[slug]);
  }

  const summaryOld = 'St\u00e6rk profil, der supplerer de \u00f8vrige valg.';
  if (AWARD_COPY[slug] && AWARD_COPY[slug] !== summaryOld) {
    // Update summary text in the toplist only if it's generic
  }

  fs.writeFileSync(file, c, 'utf8');
  totalFixed++;
  console.log(slug + ': ' + oldAward + ' -> ' + newAward + ' (' + count + ' occurrences)');
}

console.log('\nDone: ' + totalFixed + ' pages updated');
