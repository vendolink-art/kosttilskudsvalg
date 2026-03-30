/**
 * fix-product-titles.ts
 *
 * Scans all category pages, extracts product titles from ComparisonTable,
 * builds correct display titles (Brand + Name, no pack sizes), and replaces
 * all occurrences in the MDX.
 *
 * Rules:
 *   1. Remove pack sizes (weight, volume, tablet/capsule count) from names.
 *   2. If name already starts with a known brand, keep it.
 *   3. If name does NOT start with a known brand, determine brand from slug
 *      (most reliable) and prepend it.
 *   4. Never create "Brand Brand ..." duplicates.
 *
 * Usage:
 *   npx tsx scripts/fix-product-titles.ts              # dry-run
 *   npx tsx scripts/fix-product-titles.ts --apply       # apply fixes
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

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

const BRAND_LIST = [
  "Core Nutrition", "Core",
  "Star Nutrition",
  "Bodylab",
  "Body Science", "Body Science Wellness Series",
  "Healthwell",
  "Holistic",
  "Solgar",
  "Thorne",
  "Terranova",
  "Natur-Drogeriet", "Natur Drogeriet",
  "Berthelsen", "Berthelsen Naturprodukter",
  "Pureness",
  "RawPowder",
  "Weight World", "WeightWorld",
  "Vitaprana",
  "Nani",
  "Nature's Own", "Natures Own",
  "XLNT Sports", "XLNT",
  "Trikem",
  "KAL",
  "NOW Foods", "NOW",
  "Helhetshaelsa", "Helhetshälsa",
  "Self Omninutrition",
  "Mutant",
  "BioTech", "BioTech USA", "Biotech",
  "Lignisul",
  "Rømer", "Rømer Natur Produkt",
  "Spis Økologisk",
  "ELIT", "Elit Nutrition",
  "VitaYummy",
  "Arctic",
  "Tulsi",
  "Lifeplan",
  "LitoMove",
  "Närokällan", "Naerokaellan",
  "Dr. Mercola", "Dr Mercola",
  "Solaray",
  "Swanson",
  "RAW Supps", "RAW",
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
  "A.Vogel",
  "Orkla",
  "Camette",
  "Allergica",
  "Bringwell",
  "Lekaform",
  "LongoVital",
  "Yogi Tea",
  "Aromandise",
  "Pro Brands",
  "Gold Nutrition",
  "Nutrilett",
  "M-Nutrition", "M Nutrition",
  "Nordic Kings",
  "HEEY",
  "Helt Ärligt",
  "Renee Voltaire",
  "Skip Nutrition",
  "KÄÄPÄ Mushrooms",
  "Delta Nutrition",
  "Celsius",
  "Diet food",
  "Baltex",
  "Peanutbutter",
  "Mother Earth",
  "Helsegrossisten",
]

const BRAND_LIST_SORTED = [...BRAND_LIST].sort((a, b) => b.length - a.length)

function nameContainsBrand(name: string): string | null {
  const lower = name.toLowerCase()
  for (const brand of BRAND_LIST_SORTED) {
    const bl = brand.toLowerCase()
    if (lower.startsWith(bl + " ") || lower.startsWith(bl + "-") || lower === bl) {
      return brand
    }
    const re = new RegExp(`\\b${escapeRegExp(bl)}\\b`)
    if (re.test(lower)) return brand
  }
  return null
}

const SLUG_BRAND_MAP: Record<string, string> = {}
function initSlugBrandMap() {
  const mappings: [string, string][] = [
    ["core-", "Core"],
    ["star-nutrition-", "Star Nutrition"],
    ["bodylab-", "Bodylab"],
    ["body-science-", "Body Science"],
    ["healthwell-", "Healthwell"],
    ["holistic-", "Holistic"],
    ["solgar-", "Solgar"],
    ["thorne-", "Thorne"],
    ["terranova-", "Terranova"],
    ["natur-drogeriet-", "Natur-Drogeriet"],
    ["berthelsen-", "Berthelsen"],
    ["pureness-", "Pureness"],
    ["rawpowder-", "RawPowder"],
    ["weight-world-", "Weight World"],
    ["weightworld-", "Weight World"],
    ["vitaprana-", "Vitaprana"],
    ["nani-", "Nani"],
    ["natures-own-", "Nature's Own"],
    ["xlnt-sports-", "XLNT Sports"],
    ["trikem-", "Trikem"],
    ["kal-", "KAL"],
    ["now-foods-", "NOW Foods"],
    ["now-", "NOW Foods"],
    ["helhetshaelsa-", "Helhetshaelsa"],
    ["self-omninutrition-", "Self Omninutrition"],
    ["mutant-", "Mutant"],
    ["biotech-", "BioTech"],
    ["lignisul-", "Lignisul"],
    ["romer-", "Rømer"],
    ["spis-okologisk-", "Spis Økologisk"],
    ["elit-", "ELIT"],
    ["vitayummy-", "VitaYummy"],
    ["arctic-", "Arctic"],
    ["tulsi-", "Tulsi"],
    ["naerokaellan-", "Närokällan"],
    ["dr-mercola-", "Dr. Mercola"],
    ["solaray-", "Solaray"],
    ["swanson-", "Swanson"],
    ["raw-supps-", "RAW Supps"],
    ["jacked-", "JACKED"],
    ["sonnentor-", "Sonnentor"],
    ["optimum-nutrition-", "Optimum Nutrition"],
    ["chained-nutrition-", "Chained Nutrition"],
    ["viking-power-", "Viking Power"],
    ["rawbite-", "Rawbite"],
    ["barebells-", "Barebells"],
    ["fairing-", "Fairing"],
    ["better-you-", "Better You"],
    ["fitness-pharma-", "Fitness Pharma"],
    ["new-nordic-", "New Nordic"],
    ["elexir-pharma-", "Elexir Pharma"],
    ["pharma-nord-", "Pharma Nord"],
    ["biosym-", "Biosym"],
    ["camette-", "Camette"],
    ["allergica-", "Allergica"],
    ["bringwell-", "Bringwell"],
    ["lekaform-", "Lekaform"],
    ["longovital-", "LongoVital"],
    ["pro-brands-", "Pro Brands"],
    ["gold-nutrition-", "Gold Nutrition"],
    ["nutrilett-", "Nutrilett"],
    ["m-nutrition-", "M-Nutrition"],
    ["nordic-kings-", "Nordic Kings"],
    ["heey-", "HEEY"],
    ["helt-arligt-", "Helt Ärligt"],
    ["renee-voltaire-", "Renee Voltaire"],
    ["skip-nutrition-", "Skip Nutrition"],
    ["delta-nutrition-", "Delta Nutrition"],
    ["celsius-", "Celsius"],
    ["diet-food-", "Diet food"],
    ["baltex-", "Baltex"],
    ["mother-earth-", "Mother Earth"],
    ["yogi-tea-", "Yogi Tea"],
  ]
  for (const [prefix, brand] of mappings.sort((a, b) => b[0].length - a[0].length)) {
    SLUG_BRAND_MAP[prefix] = brand
  }
}
initSlugBrandMap()

function brandFromSlug(slug: string): string | null {
  for (const [prefix, brand] of Object.entries(SLUG_BRAND_MAP)) {
    if (slug.startsWith(prefix)) return brand
  }
  return null
}

const TRAILING_PACK = [
  /\s*-\s*\d+(?:[.,]\d+)?\s*(?:kg|g|gram|ml|l|ltr|dl|cl|kapsler|kapslar|kap|tabletter|tabl|tabs?|stk|caps?|softgels?|gummies|tyggetabletter|tyggetabl|sugetabletter|portioner)\.?\s*$/i,
  /\s+\d+(?:[.,]\d+)?\s*(?:kg|g|gram|ml|l|ltr|dl|cl|kapsler|kapslar|kap|tabletter|tabl|tabs?|stk|caps?|softgels?|gummies|tyggetabletter|tyggetabl|sugetabletter|portioner)\.?\s*$/i,
  /\s+\d+\s*(?:Softgel\s*Kapsler|softgel\s*kapsler)\.?\s*$/i,
  /\s+\d+\s*(?:breve)\.?\s*$/i,
]

const MID_PACK = [
  /\s+\d+(?:[.,]\d+)?\s*(?:kg|g|gram)(?=\s+\S)/gi,
  /\s+\d+(?:[.,]\d+)?\s*(?:ml|l|ltr|dl|cl)(?=\s+\S)/gi,
  /\s+\d+\s*(?:kapsler|kapslar|kap|tabletter|tabl|tabs?|stk|caps?|softgels?|gummies|tyggetabletter|tyggetabl|sugetabletter|portioner)\.?(?=\s+\S)/gi,
]

function removePackSizes(title: string): string {
  let out = title.trim()

  for (const re of TRAILING_PACK) {
    let prev = ""
    while (prev !== out) {
      prev = out
      out = out.replace(re, "").trim()
    }
  }

  for (const re of MID_PACK) {
    out = out.replace(re, " ")
  }

  out = out
    .replace(/\s*-\s*$/, "")
    .replace(/\s*•\s*$/, "")
    .replace(/\s*Ø\s*-\s*$/, " Ø")
    .replace(/\s+/g, " ")
    .trim()

  return out
}

interface ProductInfo {
  name: string
  brand: string
  slug: string
}

interface TitleFix {
  slug: string
  catSlug: string
  oldName: string
  newName: string
  changes: string[]
}

function parseComparisonTable(content: string): ProductInfo[] {
  const re = /ComparisonTable[^{]*\{(\[.*?\])}/gs
  const match = re.exec(content)
  if (!match) return []
  try {
    return JSON.parse(match[1]).map((p: any) => ({
      name: String(p.name || ""),
      brand: String(p.brand || ""),
      slug: String(p.slug || ""),
    }))
  } catch {
    return []
  }
}

function buildCleanTitle(p: ProductInfo): TitleFix | null {
  const changes: string[] = []

  const cleaned = removePackSizes(p.name)
  if (cleaned !== p.name) {
    changes.push(`pack-size removed`)
  }
  let name = cleaned

  const existingBrand = nameContainsBrand(name)
  if (!existingBrand) {
    const slugBrand = brandFromSlug(p.slug)
    if (slugBrand) {
      name = `${slugBrand} ${name}`
      changes.push(`brand: +${slugBrand}`)
    }
  }

  name = name.replace(/\s+/g, " ").trim()

  if (name === p.name || changes.length === 0) return null

  return { slug: p.slug, catSlug: "", oldName: p.name, newName: name, changes }
}

async function auditPage(catSlug: string): Promise<TitleFix[]> {
  const mdxPath = path.join(KOSTTILSKUD_DIR, catSlug, "page.mdx")
  let content: string
  try {
    content = await fs.readFile(mdxPath, "utf-8")
  } catch {
    return []
  }

  const products = parseComparisonTable(content)
  if (products.length === 0) return []

  const fixes: TitleFix[] = []
  for (const p of products) {
    const fix = buildCleanTitle(p)
    if (fix) {
      fix.catSlug = catSlug
      fixes.push(fix)
    }
  }
  return fixes
}

async function applyFixes(
  catSlug: string,
  fixes: TitleFix[],
  allProductNames: string[],
): Promise<number> {
  const mdxPath = path.join(KOSTTILSKUD_DIR, catSlug, "page.mdx")
  let content = await fs.readFile(mdxPath, "utf-8")
  let applied = 0

  const longerNames = allProductNames
    .filter((n) => n.length > 0)
    .sort((a, b) => b.length - a.length)

  const sorted = [...fixes].sort((a, b) => b.oldName.length - a.oldName.length)

  for (const fix of sorted) {
    const protectNames = longerNames.filter(
      (n) => n !== fix.oldName && n.includes(fix.oldName),
    )

    if (protectNames.length > 0) {
      const placeholders = new Map<string, string>()
      for (let i = 0; i < protectNames.length; i++) {
        const ph = `\x00PROTECT_${i}\x00`
        placeholders.set(protectNames[i], ph)
        content = content.split(protectNames[i]).join(ph)
      }

      const before = content
      content = content.split(fix.oldName).join(fix.newName)
      if (content !== before) applied++

      for (const [original, ph] of placeholders) {
        content = content.split(ph).join(original)
      }
    } else {
      const before = content
      content = content.split(fix.oldName).join(fix.newName)
      if (content !== before) applied++
    }
  }

  const brandDupeRe =
    /\b(Core|Star Nutrition|Bodylab|Body Science|Healthwell|Solgar|Thorne|Terranova|Natur-Drogeriet|Berthelsen|Pureness|RawPowder|Weight World|Vitaprana|Nani|Nature's Own|XLNT Sports|KAL|NOW Foods|ELIT|VitaYummy|Viking Power|Chained Nutrition|Barebells|Rawbite|Fitness Pharma|New Nordic|Elexir Pharma|Pharma Nord|Biosym|Camette|Allergica|Solaray|Swanson|JACKED|Rømer|LongoVital)\s+\1\b/gi
  let prev = ""
  while (prev !== content) {
    prev = content
    content = content.replace(brandDupeRe, "$1")
  }

  if (applied > 0) {
    await fs.writeFile(mdxPath, content, "utf-8")
  }
  return applied
}

async function main() {
  const apply = process.argv.includes("--apply")

  const entries = await fs.readdir(KOSTTILSKUD_DIR, { withFileTypes: true })
  const slugs = entries
    .filter((e) => e.isDirectory() && e.name !== "produkter")
    .map((e) => e.name)
    .sort()

  console.log(`Scanning ${slugs.length} category pages...\n`)

  const allFixes: TitleFix[] = []
  const pageFixCounts = new Map<string, number>()

  for (const slug of slugs) {
    const fixes = await auditPage(slug)
    if (fixes.length > 0) {
      allFixes.push(...fixes)
      pageFixCounts.set(slug, fixes.length)
    }
  }

  const pagesAffected = pageFixCounts.size
  const brandFixes = allFixes.filter((f) => f.changes.some((c) => c.startsWith("brand:")))
  const packFixes = allFixes.filter((f) => f.changes.some((c) => c.startsWith("pack-size")))

  console.log("═══════════════════════════════════════════════")
  console.log(`  Total titles to fix:   ${allFixes.length}`)
  console.log(`  Pages affected:        ${pagesAffected}`)
  console.log(`  Missing brand:         ${brandFixes.length}`)
  console.log(`  Pack size in name:     ${packFixes.length}`)
  console.log("═══════════════════════════════════════════════\n")

  for (const fix of allFixes) {
    console.log(`  [${fix.catSlug}] "${fix.oldName}" → "${fix.newName}" (${fix.changes.join(", ")})`)
  }

  if (apply && allFixes.length > 0) {
    console.log("\nApplying fixes...\n")
    let totalApplied = 0
    for (const [catSlug, count] of pageFixCounts) {
      const pageFixes = allFixes.filter((f) => f.catSlug === catSlug)
      const mdxPath = path.join(KOSTTILSKUD_DIR, catSlug, "page.mdx")
      let content: string
      try {
        content = await fs.readFile(mdxPath, "utf-8")
      } catch {
        continue
      }
      const allNames = parseComparisonTable(content).map((p) => p.name)
      const applied = await applyFixes(catSlug, pageFixes, allNames)
      totalApplied += applied
      console.log(`  ✓ ${catSlug}: ${applied}/${count} titles fixed`)
    }
    console.log(`\nDone: ${totalApplied} titles fixed across ${pagesAffected} pages.`)
  } else if (!apply) {
    console.log("\nDry run. Use --apply to make changes.")
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
