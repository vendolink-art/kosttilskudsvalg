import * as fs from "fs"
import * as path from "path"

const KOSTTILSKUD_DIR = path.join("src", "app", "(da)", "kosttilskud")

// ─── E: ASCII slug-words → proper Danish in title/meta_title ───
const TITLE_FIXES: Record<string, [RegExp, string][]> = {
  "aggeprotein": [[/aggeprotein/gi, "æggeprotein"]],
  "bedste-fedtforbraender": [[/Fedtforbraender/g, "Fedtforbrænder"], [/fedtforbraender/g, "fedtforbrænder"]],
  "blabaertilskud": [[/blabaertilskud/gi, "blåbærtilskud"]],
  "braendenaelde-pulver": [[/Braendenaelde/g, "Brændenælde"], [/braendenaelde/g, "brændenælde"]],
  "byggraes": [[/byggraes/gi, "byggræs"]],
  "fordojelsesenzym": [[/fordojelsesenzym/gi, "fordøjelsesenzym"]],
  "gron-te": [[/gron te/gi, "grøn te"]],
  "gron-te-piller": [[/Gron te/g, "Grøn te"], [/gron te/g, "grøn te"]],
  "hormonel-balance-hos-maend": [[/hos maend/gi, "hos mænd"]],
  "hvedegraes-pulver": [[/hvedegraes/gi, "hvedegræs"]],
  "ingefaer-piller": [[/ingefaer/gi, "ingefær"]],
  "ingefaer-pulver": [[/ingefaer/gi, "ingefær"]],
  "kaempenatlysolie": [[/Kaempenatlysolie/g, "Kæmpenatlysolie"], [/kaempenatlysolie/g, "kæmpenatlysolie"]],
  "kosttilskud-til-keto-diaet": [[/keto diaet/gi, "keto diæt"]],
  "kosttilskud-til-lob": [[/til lob/gi, "til løb"]],
  "maelkesyrebakterier": [[/maelkesyrebakterier/gi, "mælkesyrebakterier"]],
  "multivitamin-born": [[/multivitamin born/gi, "multivitamin til børn"]],
  "multivitamin-til-maend": [[/til maend/gi, "til mænd"]],
  "proteinpulver-til-vaegttab": [[/til vaegttab/gi, "til vægttab"]],
  "proteinpulver-uden-sodestoffer": [[/sodestoffer/gi, "sødestoffer"]],
  "rodbedepulver": [[/Rodbedepulver/g, "Rødbedepulver"], [/rodbedepulver/g, "rødbedepulver"]],
  "tranebaerkapsler": [[/tranebaerkapsler/gi, "tranebærkapsler"]],
  "vitaminer-til-har": [[/til har /gi, "til hår "]],
  "vitaminer-til-ojnene": [[/til ojnene/gi, "til øjnene"]],
}

async function main() {
  let eFixes = 0
  let hFixes = 0

  // ─── E: Fix titles ───
  for (const [slug, replacements] of Object.entries(TITLE_FIXES)) {
    const pagePath = path.join(KOSTTILSKUD_DIR, slug, "page.mdx")
    if (!fs.existsSync(pagePath)) { console.log(`SKIP [${slug}]: not found`); continue }

    let content = fs.readFileSync(pagePath, "utf-8")
    const original = content

    // Only fix within frontmatter (between --- markers)
    const fmMatch = content.match(/^---\n([\s\S]*?)\n---/)
    if (!fmMatch) { console.log(`SKIP [${slug}]: no frontmatter`); continue }

    let frontmatter = fmMatch[1]
    const originalFm = frontmatter

    for (const [pattern, replacement] of replacements) {
      frontmatter = frontmatter.replace(pattern, replacement)
    }

    if (frontmatter !== originalFm) {
      content = content.replace(originalFm, frontmatter)
      fs.writeFileSync(pagePath, content, "utf-8")
      console.log(`E [${slug}]: Fixed title/meta_title Danish characters`)
      eFixes++
    }
  }

  // ─── H: Fix duplicate text ───

  // H1: laktosefrit-proteinpulver - "Body science Body Science" in SeoJsonLd
  const laktoPath = path.join(KOSTTILSKUD_DIR, "laktosefrit-proteinpulver", "page.mdx")
  if (fs.existsSync(laktoPath)) {
    let c = fs.readFileSync(laktoPath, "utf-8")
    if (c.includes("Body science Body Science")) {
      c = c.replace(/Body science Body Science/g, "Body Science")
      fs.writeFileSync(laktoPath, c, "utf-8")
      console.log(`H [laktosefrit-proteinpulver]: Fixed "Body science Body Science" → "Body Science"`)
      hFixes++
    }
  }

  // H2: pwo-med-koffein - "Viking power Viking Power" in SeoJsonLd
  const pwoKoffeinPath = path.join(KOSTTILSKUD_DIR, "pwo-med-koffein", "page.mdx")
  if (fs.existsSync(pwoKoffeinPath)) {
    let c = fs.readFileSync(pwoKoffeinPath, "utf-8")
    if (c.includes("Viking power Viking Power")) {
      c = c.replace(/Viking power Viking Power/g, "Viking Power")
      fs.writeFileSync(pwoKoffeinPath, c, "utf-8")
      console.log(`H [pwo-med-koffein]: Fixed "Viking power Viking Power" → "Viking Power"`)
      hFixes++
    }
  }

  // H3: pre-workout - "Viking power Viking Power" in SeoJsonLd
  const preWorkoutPath = path.join(KOSTTILSKUD_DIR, "pre-workout", "page.mdx")
  if (fs.existsSync(preWorkoutPath)) {
    let c = fs.readFileSync(preWorkoutPath, "utf-8")
    if (c.includes("Viking power Viking Power")) {
      c = c.replace(/Viking power Viking Power/g, "Viking Power")
      fs.writeFileSync(preWorkoutPath, c, "utf-8")
      console.log(`H [pre-workout]: Fixed "Viking power Viking Power" → "Viking Power"`)
      hFixes++
    }
  }

  // H4: hvidlogspiller - "hvidløgsprodukter-produkter" redundant
  const hvidlogPath = path.join(KOSTTILSKUD_DIR, "hvidlogspiller", "page.mdx")
  if (fs.existsSync(hvidlogPath)) {
    let c = fs.readFileSync(hvidlogPath, "utf-8")
    if (c.includes("hvidløgsprodukter-produkter")) {
      c = c.replace(/hvidløgsprodukter-produkter/g, "hvidløgsprodukter")
      fs.writeFileSync(hvidlogPath, c, "utf-8")
      console.log(`H [hvidlogspiller]: Fixed "hvidløgsprodukter-produkter" → "hvidløgsprodukter"`)
      hFixes++
    }
  }

  // H5: biotin - "Body science wellness series Body Science" in SeoJsonLd
  const biotinPath = path.join(KOSTTILSKUD_DIR, "biotin", "page.mdx")
  if (fs.existsSync(biotinPath)) {
    let c = fs.readFileSync(biotinPath, "utf-8")
    if (c.includes("Body science wellness series Body Science")) {
      c = c.replace(/Body science wellness series Body Science/g, "Body Science Wellness Series")
      fs.writeFileSync(biotinPath, c, "utf-8")
      console.log(`H [biotin]: Fixed "Body science wellness series Body Science" → "Body Science Wellness Series"`)
      hFixes++
    }
  }

  // ─── F: Fix Bodylab Pre workout header score 7.2 → 7.6 ───
  if (fs.existsSync(preWorkoutPath)) {
    let c = fs.readFileSync(preWorkoutPath, "utf-8")

    // Find the Bodylab section: header score 7.2 should be ~7.6 (avg of sub-scores)
    // The header score appears in tabular-nums span right after the Bodylab h3
    // Sub-scores: 7.3, 6.8, 6.3, 9.7, 6.3, 9.3 → avg = 7.62 → round to 7.6
    const bodylab72 = c.indexOf('title="Bodylab Pre workout"')
    if (bodylab72 !== -1) {
      // Find the tabular-nums 7.2 near Bodylab (within ~500 chars after the h3)
      const section = c.substring(bodylab72, bodylab72 + 600)
      if (section.includes('tabular-nums">7.2</span>')) {
        c = c.substring(0, bodylab72) +
          section.replace('tabular-nums">7.2</span>', 'tabular-nums">7.6</span>') +
          c.substring(bodylab72 + 600)

        // Also fix the "samlet score" text and ComparisonTable rating
        c = c.replace(
          /Bodylab Pre workout.*?samlet score.*?<strong>7\.2\/10<\/strong>/s,
          (match) => match.replace("7.2/10", "7.6/10")
        )
        c = c.replace(
          /"name":"Bodylab Pre workout"(.*?)"rating":7\.2/,
          '"name":"Bodylab Pre workout"$1"rating":7.6'
        )

        fs.writeFileSync(preWorkoutPath, c, "utf-8")
        console.log(`F [pre-workout]: Fixed Bodylab header score 7.2 → 7.6 (matches sub-score avg)`)
      }
    }
  }

  console.log(`\n=== E: ${eFixes} title fixes | F: 1 rating fix | H: ${hFixes} duplicate text fixes ===`)
}

main().catch(console.error)
