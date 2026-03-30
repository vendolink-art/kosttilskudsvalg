/**
 * migrate-from-sql.ts
 * 
 * Migreringsscript: Læser SQL-dumpen fra SilverStripe og genererer MDX-filer
 * til den nye Next.js-baserede kostmag.dk.
 * 
 * Kør: npx tsx scripts/migrate-from-sql.ts
 */

import { promises as fs } from "fs"
import path from "path"
import { createReadStream } from "fs"
import { createInterface } from "readline"

// ─── Konfiguration ──────────────────────────────────────────

const SQL_FILE = path.join(process.cwd(), "kostmagasinet_dk-db-2026-02-06.sql")
const OUTPUT_CATEGORIES = path.join(process.cwd(), "src", "app", "(da)", "kosttilskud")
const OUTPUT_PRODUCTS = path.join(process.cwd(), "src", "app", "(da)", "kosttilskud", "produkter")
const OUTPUT_GUIDES = path.join(process.cwd(), "content", "guides")

// Kategori-mapping baseret på URL-slug → silo
const CATEGORY_SILO: Record<string, string> = {
  // Protein
  "protein": "protein",
  "proteinpulver": "protein",
  "whey-protein": "protein",
  "kasein": "protein",
  "vegansk-protein": "protein",
  // Vitaminer & mineraler
  "d-vitamin": "vitaminer-mineraler",
  "c-vitamin": "vitaminer-mineraler",
  "b-vitamin": "vitaminer-mineraler",
  "vitamin-e": "vitaminer-mineraler",
  "vitamin-k": "vitaminer-mineraler",
  "folinsyre": "vitaminer-mineraler",
  "magnesium": "vitaminer-mineraler",
  "zink": "vitaminer-mineraler",
  "jern": "vitaminer-mineraler",
  "calcium": "vitaminer-mineraler",
  "multivitamin": "vitaminer-mineraler",
  "betacaroten": "vitaminer-mineraler",
  "selen": "vitaminer-mineraler",
  // Superfoods
  "acai": "superfoods",
  "byggraes": "superfoods",
  "chlorella": "superfoods",
  "spirulina": "superfoods",
  "gurkemeje": "superfoods",
  "ingefaer": "superfoods",
  "hvidloeg": "superfoods",
  "schisandra": "superfoods",
  "ashwagandha": "superfoods",
  "ginseng": "superfoods",
  "maca": "superfoods",
  // Pre-workout
  "kreatin": "pre-workout",
  "bcaa": "pre-workout",
  "eaa": "pre-workout",
  "koffein": "pre-workout",
  "pre-workout": "pre-workout",
  // Vægttab
  "maaltidserstatning": "vaegtab",
  "fatburner": "vaegtab",
  // Sundhed
  "probiotika": "sundhed",
  "omega-3": "sundhed",
  "kollagen": "sundhed",
  "melatonin": "sundhed",
  "fiber": "sundhed",
  "glucosamin": "sundhed",
  "msm": "sundhed",
  "psyllium": "sundhed",
}

// ─── Typer ──────────────────────────────────────────

interface SiteTreeRow {
  id: number
  className: string
  lastEdited: string
  created: string
  urlSegment: string
  title: string
  content: string
  metaDescription: string
  parentID: number
}

interface ProductCategoryData {
  id: number
  urlSegment: string
  title: string
  content: string
  metaDescription: string
}

interface ProductData {
  id: number
  urlSegment: string
  title: string
  content: string
  metaDescription: string
  parentID: number
}

// ─── SQL-parsing ──────────────────────────────────────────

/**
 * Streamer SQL-filen linje for linje og finder INSERT INTO statements for de relevante tabeller.
 * Dette undgår at indlæse hele 300MB filen i hukommelsen.
 */
async function parseSQLStream(): Promise<{
  categories: ProductCategoryData[]
  products: ProductData[]
}> {
  const categories: ProductCategoryData[] = []
  const products: ProductData[] = []

  console.log("📄 Læser SQL-dump:", SQL_FILE)

  const rl = createInterface({
    input: createReadStream(SQL_FILE, { encoding: "utf-8" }),
    crlfDelay: Infinity,
  })

  let lineCount = 0

  for await (const line of rl) {
    lineCount++

    // SiteTree INSERT – indeholder alle sidetyper
    if (line.startsWith("INSERT INTO `SiteTree` VALUES") || line.startsWith("INSERT INTO `SiteTree_Live` VALUES")) {
      // Parse alle VALUES tuples fra denne linje
      const parsed = parseSiteTreeInsert(line)
      
      for (const row of parsed) {
        if (row.className === "ProductCategoryPage") {
          categories.push({
            id: row.id,
            urlSegment: row.urlSegment,
            title: row.title,
            content: row.content,
            metaDescription: row.metaDescription,
          })
        } else if (row.className === "ProductPage") {
          products.push({
            id: row.id,
            urlSegment: row.urlSegment,
            title: row.title,
            content: row.content,
            metaDescription: row.metaDescription,
            parentID: row.parentID,
          })
        }
      }
    }

    if (lineCount % 1000 === 0) {
      process.stdout.write(`\r  Behandlet ${lineCount} linjer...`)
    }
  }

  console.log(`\n✅ Fandt ${categories.length} kategorier og ${products.length} produkter`)

  // Dedupliker (SiteTree og SiteTree_Live kan have overlappende data)
  const uniqueCategories = deduplicateById(categories)
  const uniqueProducts = deduplicateById(products)

  console.log(`   Unikke: ${uniqueCategories.length} kategorier, ${uniqueProducts.length} produkter`)

  return { categories: uniqueCategories, products: uniqueProducts }
}

function deduplicateById<T extends { id: number }>(items: T[]): T[] {
  const seen = new Map<number, T>()
  for (const item of items) {
    seen.set(item.id, item) // Sidste forekomst vinder
  }
  return Array.from(seen.values())
}

/**
 * Parser en INSERT INTO `SiteTree` VALUES (...),(...) linje.
 * SilverStripe SiteTree har denne kolonne-rækkefølge:
 * (ID, ClassName, LastEdited, Created, URLSegment, Title, MenuTitle, Content, MetaDescription, ...)
 */
function parseSiteTreeInsert(line: string): SiteTreeRow[] {
  const results: SiteTreeRow[] = []
  
  // Find starten af VALUES
  const valuesIdx = line.indexOf("VALUES ")
  if (valuesIdx === -1) return results
  
  const valuesStr = line.substring(valuesIdx + 7)
  
  // Enkel state-machine parser for SQL tuples
  const tuples = splitSQLTuples(valuesStr)
  
  for (const tuple of tuples) {
    const fields = parseSQLTuple(tuple)
    if (fields.length < 9) continue
    
    const row: SiteTreeRow = {
      id: parseInt(fields[0], 10),
      className: unquote(fields[1]),
      lastEdited: unquote(fields[2]),
      created: unquote(fields[3]),
      urlSegment: unquote(fields[4]),
      title: unquote(fields[5]),
      // fields[6] = MenuTitle
      content: unquote(fields[7]),
      metaDescription: unquote(fields[8]),
      parentID: fields.length > 14 ? parseInt(fields[14] || "0", 10) : 0,
    }
    
    results.push(row)
  }
  
  return results
}

/**
 * Splitter en VALUES string i individuelle tuples.
 * Håndterer indlejrede parenteser og strenge.
 */
function splitSQLTuples(valuesStr: string): string[] {
  const tuples: string[] = []
  let depth = 0
  let inString = false
  let escape = false
  let start = -1
  
  for (let i = 0; i < valuesStr.length; i++) {
    const ch = valuesStr[i]
    
    if (escape) {
      escape = false
      continue
    }
    
    if (ch === "\\") {
      escape = true
      continue
    }
    
    if (ch === "'" && !inString) {
      inString = true
      continue
    }
    
    if (ch === "'" && inString) {
      inString = false
      continue
    }
    
    if (inString) continue
    
    if (ch === "(") {
      if (depth === 0) start = i + 1
      depth++
    } else if (ch === ")") {
      depth--
      if (depth === 0 && start >= 0) {
        tuples.push(valuesStr.substring(start, i))
        start = -1
      }
    }
  }
  
  return tuples
}

/**
 * Parser en SQL tuple string til individuelle felter.
 */
function parseSQLTuple(tuple: string): string[] {
  const fields: string[] = []
  let current = ""
  let inString = false
  let escape = false
  
  for (let i = 0; i < tuple.length; i++) {
    const ch = tuple[i]
    
    if (escape) {
      current += ch
      escape = false
      continue
    }
    
    if (ch === "\\") {
      escape = true
      current += ch
      continue
    }
    
    if (ch === "'" && !inString) {
      inString = true
      current += ch
      continue
    }
    
    if (ch === "'" && inString) {
      inString = false
      current += ch
      continue
    }
    
    if (ch === "," && !inString) {
      fields.push(current.trim())
      current = ""
      continue
    }
    
    current += ch
  }
  
  if (current.trim()) {
    fields.push(current.trim())
  }
  
  return fields
}

function unquote(s: string): string {
  if (!s || s === "NULL") return ""
  s = s.trim()
  if (s.startsWith("'") && s.endsWith("'")) {
    s = s.slice(1, -1)
  }
  // Unescape SQL escapes
  return s
    .replace(/\\'/g, "'")
    .replace(/\\"/g, '"')
    .replace(/\\n/g, "\n")
    .replace(/\\r/g, "")
    .replace(/\\t/g, "\t")
    .replace(/\\\\/g, "\\")
}

// ─── HTML til MDX konvertering ──────────────────────────────────────────

function htmlToMdx(html: string): string {
  if (!html) return ""
  
  let text = html
  
  // Fjern SilverStripe-specifikke links [sitetree_link,id=XX]
  text = text.replace(/<a\s+href="\[sitetree_link,id=\d+\]"[^>]*>(.*?)<\/a>/gi, "$1")
  
  // Konverter HTML-tags til Markdown
  text = text.replace(/<h2[^>]*>(.*?)<\/h2>/gi, "\n## $1\n")
  text = text.replace(/<h3[^>]*>(.*?)<\/h3>/gi, "\n### $1\n")
  text = text.replace(/<h4[^>]*>(.*?)<\/h4>/gi, "\n#### $1\n")
  text = text.replace(/<strong>(.*?)<\/strong>/gi, "**$1**")
  text = text.replace(/<b>(.*?)<\/b>/gi, "**$1**")
  text = text.replace(/<em>(.*?)<\/em>/gi, "*$1*")
  text = text.replace(/<i>(.*?)<\/i>/gi, "*$1*")
  text = text.replace(/<a\s+href="([^"]*)"[^>]*>(.*?)<\/a>/gi, "[$2]($1)")
  text = text.replace(/<br\s*\/?>/gi, "\n")
  text = text.replace(/<p[^>]*>(.*?)<\/p>/gis, "\n$1\n")
  
  // Lister
  text = text.replace(/<ul[^>]*>/gi, "")
  text = text.replace(/<\/ul>/gi, "")
  text = text.replace(/<ol[^>]*>/gi, "")
  text = text.replace(/<\/ol>/gi, "")
  text = text.replace(/<li[^>]*>(.*?)<\/li>/gis, "- $1")
  
  // Fjern resterende HTML-tags
  text = text.replace(/<[^>]+>/g, "")
  
  // Rens op i whitespace
  text = text.replace(/\n{3,}/g, "\n\n")
  text = text.trim()
  
  return text
}

// ─── MDX-generering ──────────────────────────────────────────

function generateCategoryMDX(cat: ProductCategoryData): string {
  const title = cat.title.replace(/"/g, '\\"')
  const desc = (cat.metaDescription || `Alt om ${cat.title} – tests, sammenligninger og guider.`).replace(/"/g, '\\"')
  const mdxContent = htmlToMdx(cat.content)
  const now = new Date().toISOString().split("T")[0]

  return `---
title: "${title}"
description: "${desc}"
date: "${now}"
updated: "${now}"
author: "redaktionen"
category: "Kosttilskud"
tags: ["sammenligning", "${cat.urlSegment}"]
affiliate_disclosure: true
---

# ${cat.title}

${mdxContent}
`
}

function generateProductMDX(prod: ProductData, parentSlug: string): string {
  const title = prod.title.replace(/"/g, '\\"')
  const desc = (prod.metaDescription || `Anmeldelse af ${prod.title}.`).replace(/"/g, '\\"')
  const mdxContent = htmlToMdx(prod.content)
  const now = new Date().toISOString().split("T")[0]

  return `---
title: "${title}"
description: "${desc}"
date: "${now}"
updated: "${now}"
author: "redaktionen"
category: "Kosttilskud"
tags: ["produkttest", "${parentSlug}"]
affiliate_disclosure: true
---

# ${prod.title}

${mdxContent}
`
}

// ─── Hovedfunktion ──────────────────────────────────────────

async function main() {
  console.log("🚀 Starter migrering fra SilverStripe SQL → Next.js MDX\n")

  // Check at SQL-filen eksisterer
  try {
    await fs.access(SQL_FILE)
  } catch {
    console.error(`❌ SQL-fil ikke fundet: ${SQL_FILE}`)
    process.exit(1)
  }

  // Parse SQL
  const { categories, products } = await parseSQLStream()

  // Opret output-mapper
  await fs.mkdir(OUTPUT_CATEGORIES, { recursive: true })
  await fs.mkdir(OUTPUT_PRODUCTS, { recursive: true })
  await fs.mkdir(OUTPUT_GUIDES, { recursive: true })

  // Byg en map fra kategori-ID til slug for produkt-parent-linking
  const categoryIdToSlug = new Map<number, string>()
  for (const cat of categories) {
    categoryIdToSlug.set(cat.id, cat.urlSegment)
  }

  // Generer kategori MDX-filer
  let catCount = 0
  for (const cat of categories) {
    const slug = cat.urlSegment
    if (!slug) continue

    const catDir = path.join(OUTPUT_CATEGORIES, slug)
    await fs.mkdir(catDir, { recursive: true })

    const mdx = generateCategoryMDX(cat)
    await fs.writeFile(path.join(catDir, "page.mdx"), mdx, "utf-8")
    catCount++
  }
  console.log(`📁 Genererede ${catCount} kategori-MDX-filer`)

  // Generer produkt MDX-filer
  let prodCount = 0
  for (const prod of products) {
    const slug = prod.urlSegment
    if (!slug) continue

    const parentSlug = categoryIdToSlug.get(prod.parentID) || "kosttilskud"

    const prodDir = path.join(OUTPUT_PRODUCTS, slug)
    await fs.mkdir(prodDir, { recursive: true })

    const mdx = generateProductMDX(prod, parentSlug)
    await fs.writeFile(path.join(prodDir, "content.mdx"), mdx, "utf-8")
    prodCount++
  }
  console.log(`📦 Genererede ${prodCount} produkt-MDX-filer`)

  console.log("\n✅ Migrering afsluttet!")
  console.log(`\n   Kategorier: ${OUTPUT_CATEGORIES}`)
  console.log(`   Produkter:  ${OUTPUT_PRODUCTS}`)
  console.log(`\n   Kør 'npm run dev' for at se resultatet lokalt.`)
}

main().catch((err) => {
  console.error("❌ Migreringsfejl:", err)
  process.exit(1)
})
