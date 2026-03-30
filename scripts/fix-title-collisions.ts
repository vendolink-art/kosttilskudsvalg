/**
 * fix-title-collisions.ts
 *
 * Fixes two issues from the initial title fix run:
 * 1. Double brand prefixes: "Star Nutrition Star Nutrition X" → "Star Nutrition X"
 * 2. Substring collisions: "Core Body Science Vitamin B Complex" → "Core Vitamin B Complex"
 *    (where "Body Science" was incorrectly inserted inside "Core Vitamin B Complex")
 *
 * Usage:
 *   npx tsx scripts/fix-title-collisions.ts             # dry-run
 *   npx tsx scripts/fix-title-collisions.ts --apply      # apply
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

const BRANDS = [
  "Core Nutrition",
  "Core",
  "Star Nutrition",
  "Bodylab",
  "Body Science Wellness Series",
  "Body Science",
  "Healthwell",
  "Holistic",
  "Solgar",
  "Thorne",
  "Terranova",
  "Natur-Drogeriet",
  "Natur Drogeriet",
  "Berthelsen Naturprodukter",
  "Berthelsen",
  "Pureness",
  "RawPowder",
  "Weight World",
  "WeightWorld",
  "Vitaprana",
  "Nani",
  "Nature's Own",
  "XLNT Sports",
  "KAL",
  "NOW Foods",
  "Helhetshaelsa",
  "Self Omninutrition",
  "Mutant",
  "BioTech USA",
  "BioTech",
  "Lignisul",
  "Rømer Natur Produkt",
  "Rømer",
  "Spis Økologisk",
  "Elit Nutrition",
  "ELIT",
  "VitaYummy",
  "Arctic",
  "Tulsi",
  "Närokällan",
  "Dr. Mercola",
  "Dr Mercola",
  "Solaray",
  "Swanson",
  "RAW Supps",
  "RAW",
  "JACKED",
  "Sonnentor",
  "Optimum Nutrition",
  "Chained Nutrition",
  "Viking Power",
  "Rawbite",
  "Barebells",
  "Fairing",
  "Better You",
  "Fitness Pharma",
  "New Nordic",
  "Elexir Pharma",
  "Pharma Nord",
  "Biosym",
  "Camette",
  "Allergica",
  "Bringwell",
  "Lekaform",
  "LongoVital",
  "M-Nutrition",
  "Delta Nutrition",
  "Celsius",
  "Diet food",
  "HEEY",
  "Skip Nutrition",
  "Mother Earth",
  "Nutrilett",
]

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

interface Fix {
  pattern: string
  replacement: string
}

function findDuplicateBrands(content: string): Fix[] {
  const fixes: Fix[] = []
  for (const brand of BRANDS) {
    const esc = escapeRegExp(brand)
    const re = new RegExp(`${esc}\\s+${esc}\\b`, "gi")
    if (re.test(content)) {
      fixes.push({ pattern: `${brand} ${brand}`, replacement: brand })
    }
  }
  return fixes
}

function findSubstringCollisions(content: string): Fix[] {
  const fixes: Fix[] = []

  const collisions: [string, string, string][] = [
    ["Core Body Science Vitamin B Complex", "Body Science ", "Core Vitamin B Complex"],
    ["Core Body Science ", "Body Science ", "Core "],
  ]

  for (const [bad, inserted, good] of collisions) {
    if (content.includes(bad)) {
      fixes.push({ pattern: bad, replacement: good })
    }
  }

  for (const brandA of BRANDS) {
    for (const brandB of BRANDS) {
      if (brandA === brandB) continue
      if (brandA.includes(brandB)) continue
      if (brandB.includes(brandA)) continue

      const collision = `${brandA} ${brandB} `
      if (content.includes(collision)) {
        const re1 = new RegExp(
          `${escapeRegExp(brandA)}\\s+${escapeRegExp(brandB)}\\s+${escapeRegExp(brandA)}\\b`,
        )
        if (re1.test(content)) {
          fixes.push({
            pattern: `${brandA} ${brandB} ${brandA}`,
            replacement: `${brandA}`,
          })
        }

        const re2 = new RegExp(
          `${escapeRegExp(brandA)}\\s+${escapeRegExp(brandB)}\\s+(?!${escapeRegExp(brandA)})`,
        )
        if (re2.test(content)) {
          const m = content.match(
            new RegExp(`${escapeRegExp(brandA)}\\s+${escapeRegExp(brandB)}\\s+\\S+`),
          )
          if (m) {
            const fullMatch = m[0]
            const afterInserted = fullMatch.slice(
              brandA.length + 1 + brandB.length + 1,
            )
            if (
              afterInserted &&
              !BRANDS.some(
                (b) =>
                  b.toLowerCase() === brandB.toLowerCase() &&
                  afterInserted.toLowerCase().startsWith(afterInserted.split(/\s/)[0].toLowerCase()),
              )
            ) {
            }
          }
        }
      }
    }
  }

  return fixes
}

async function processPage(
  catSlug: string,
  apply: boolean,
): Promise<{ fixes: Fix[]; changed: boolean }> {
  const mdxPath = path.join(KOSTTILSKUD_DIR, catSlug, "page.mdx")
  let content: string
  try {
    content = await fs.readFile(mdxPath, "utf-8")
  } catch {
    return { fixes: [], changed: false }
  }

  const dupeFixes = findDuplicateBrands(content)
  const collFixes = findSubstringCollisions(content)
  const fixes = [...collFixes, ...dupeFixes]

  if (fixes.length === 0) return { fixes: [], changed: false }

  if (apply) {
    for (const fix of fixes) {
      content = content.split(fix.pattern).join(fix.replacement)
    }
    await fs.writeFile(mdxPath, content, "utf-8")
  }

  return { fixes, changed: true }
}

async function main() {
  const apply = process.argv.includes("--apply")

  const entries = await fs.readdir(KOSTTILSKUD_DIR, { withFileTypes: true })
  const slugs = entries
    .filter((e) => e.isDirectory() && e.name !== "produkter")
    .map((e) => e.name)
    .sort()

  console.log(`Scanning ${slugs.length} category pages for title collisions...\n`)

  let totalFixes = 0
  let pagesAffected = 0

  for (const slug of slugs) {
    const { fixes, changed } = await processPage(slug, apply)
    if (changed) {
      pagesAffected++
      totalFixes += fixes.length
      for (const fix of fixes) {
        console.log(`  [${slug}] "${fix.pattern}" → "${fix.replacement}"`)
      }
    }
  }

  console.log(
    `\n${apply ? "Fixed" : "Found"}: ${totalFixes} issues on ${pagesAffected} pages.`,
  )
  if (!apply && totalFixes > 0) {
    console.log("Use --apply to fix.")
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
