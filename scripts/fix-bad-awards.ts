/**
 * fix-bad-awards.ts
 *
 * Scans ALL category pages for inappropriate "BEDSTE SMAG BLANDBARHED" awards
 * on tablet/capsule products and replaces with sensible alternatives.
 *
 * Usage:
 *   npx tsx scripts/fix-bad-awards.ts              # dry-run (report only)
 *   npx tsx scripts/fix-bad-awards.ts --apply       # apply fixes
 */

import path from "path"
import { promises as fs } from "fs"

const KOSTTILSKUD_DIR = path.join(
  process.cwd(),
  "src",
  "app",
  "(da)",
  "kosttilskud",
)

const POWDER_LIQUID_SLUGS = new Set([
  "kollagenpulver",
  "risprotein",
  "super-greens-pulver",
  "hybenpulver",
  "loppefroskaller",
  "braendenaelde-pulver",
  "ingefaer-pulver",
  "matchatilskud",
  "chiafro",
  "aloe-vera-juice",
  "peanut-butter",
  "proteinpulver",
  "valleprotein",
  "kasein",
  "vegansk-proteinpulver",
  "kreatin",
  "pre-workout",
  "post-workout",
  "bcaa",
  "eaa",
  "elektrolytpulver",
  "greens-pulver",
  "acai-pulver",
  "spirulina-pulver",
  "chlorella-pulver",
  "gurkemejepulver",
  "hvedegraesjuice",
])

const POWDER_INDICATORS =
  /pulver|powder|juice|shake|drik|smoothie|peanut.?butter/i

const REPLACEMENT_PRIORITY = [
  "BEDSTE BALANCEREDE VALG",
  "BEDSTE BRUGERVENLIGE VALG",
  "BEDSTE NICHEVALG",
  "BEDSTE TIL DAGLIG BRUG",
  "BREDESTE INGREDIENSPROFIL",
  "BEDSTE CLEAN LABEL-VALG",
]

interface PageAudit {
  slug: string
  awards: string[]
  smagProduct: string | null
  isPowderCategory: boolean
  replacement: string | null
}

function extractAwards(content: string): string[] {
  const awards: string[] = []
  const patterns = [
    /note":"([^"]+)"/g,
    /bg-(?:amber|cyan|emerald|violet|blue|indigo|teal|sky|slate)-\d+[^>]*>([A-ZÆØÅ][A-ZÆØÅ\s&\/\-]+)<\/span>/g,
  ]
  for (const re of patterns) {
    let m: RegExpExecArray | null
    while ((m = re.exec(content)) !== null) {
      const label = m[1].trim().toUpperCase()
      if (label.length > 3 && !awards.includes(label)) {
        awards.push(label)
      }
    }
  }
  return awards
}

function extractSmagProductName(content: string): string | null {
  const re =
    /BEDSTE SMAG (?:&\s*)?BLANDBARHED<\/span>\s*<h3[^>]*>(?:\d+\.\s*)?([^<]+)/i
  const m = re.exec(content)
  return m ? m[1].trim() : null
}

function isPowderCategory(slug: string, content: string): boolean {
  if (POWDER_LIQUID_SLUGS.has(slug)) return true
  if (POWDER_INDICATORS.test(slug)) return true

  const smagProduct = extractSmagProductName(content)
  if (smagProduct && POWDER_INDICATORS.test(smagProduct)) return true

  return false
}

function pickReplacement(existingAwards: string[]): string {
  const upper = existingAwards.map((a) => a.toUpperCase())
  for (const candidate of REPLACEMENT_PRIORITY) {
    if (!upper.includes(candidate)) return candidate
  }
  return "BEDSTE BALANCEREDE PROFIL"
}

async function auditPage(slug: string): Promise<PageAudit | null> {
  const mdxPath = path.join(KOSTTILSKUD_DIR, slug, "page.mdx")
  let content: string
  try {
    content = await fs.readFile(mdxPath, "utf-8")
  } catch {
    return null
  }

  if (!/BEDSTE SMAG\s*(?:&\s*)?BLANDBARHED/i.test(content)) return null

  const awards = extractAwards(content)
  const smagProduct = extractSmagProductName(content)
  const powder = isPowderCategory(slug, content)

  if (powder) {
    return { slug, awards, smagProduct, isPowderCategory: true, replacement: null }
  }

  const replacement = pickReplacement(awards)
  return { slug, awards, smagProduct, isPowderCategory: false, replacement }
}

async function applyFix(slug: string, replacement: string): Promise<boolean> {
  const mdxPath = path.join(KOSTTILSKUD_DIR, slug, "page.mdx")
  let content = await fs.readFile(mdxPath, "utf-8")

  const patterns = [
    /BEDSTE SMAG & BLANDBARHED/g,
    /BEDSTE SMAG BLANDBARHED/g,
    /BEDSTE SMAG &amp; BLANDBARHED/g,
  ]

  let changed = false
  for (const re of patterns) {
    if (re.test(content)) {
      content = content.replace(re, replacement)
      changed = true
    }
  }

  if (changed) {
    await fs.writeFile(mdxPath, content, "utf-8")
  }
  return changed
}

async function main() {
  const apply = process.argv.includes("--apply")

  const entries = await fs.readdir(KOSTTILSKUD_DIR, { withFileTypes: true })
  const slugs = entries.filter((e) => e.isDirectory()).map((e) => e.name).sort()

  console.log(`Scanning ${slugs.length} category pages...\n`)

  const results: PageAudit[] = []
  for (const slug of slugs) {
    const audit = await auditPage(slug)
    if (audit) results.push(audit)
  }

  const toFix = results.filter((r) => !r.isPowderCategory && r.replacement)
  const keepOk = results.filter((r) => r.isPowderCategory)

  console.log("═══════════════════════════════════════════════")
  console.log(`  SMAG/BLANDBARHED found on: ${results.length} pages`)
  console.log(`  OK (powder/liquid):        ${keepOk.length} pages`)
  console.log(`  NEEDS FIX (tablet/capsule): ${toFix.length} pages`)
  console.log("═══════════════════════════════════════════════\n")

  if (keepOk.length > 0) {
    console.log("--- OK (keeping SMAG/BLANDBARHED) ---")
    for (const r of keepOk) {
      console.log(`  ✓ ${r.slug} (${r.smagProduct || "?"})`)
    }
    console.log()
  }

  if (toFix.length > 0) {
    console.log("--- NEEDS FIX ---")
    for (const r of toFix) {
      console.log(
        `  ✗ ${r.slug}: "${r.smagProduct || "?"}" → ${r.replacement}`,
      )
    }
    console.log()
  }

  if (apply && toFix.length > 0) {
    console.log("Applying fixes...\n")
    let fixed = 0
    for (const r of toFix) {
      if (!r.replacement) continue
      const ok = await applyFix(r.slug, r.replacement)
      if (ok) {
        fixed++
        console.log(`  ✓ ${r.slug} → ${r.replacement}`)
      } else {
        console.log(`  ✗ ${r.slug} – no change (pattern not found)`)
      }
    }
    console.log(`\nDone: ${fixed}/${toFix.length} pages fixed.`)
  } else if (!apply) {
    console.log("Dry run. Use --apply to make changes.")
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
