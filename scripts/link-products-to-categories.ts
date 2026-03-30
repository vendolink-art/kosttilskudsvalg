/**
 * link-products-to-categories.ts
 *
 * Steg 1: Re-parsar SQL-dumpen för att extrahera parent-child-relationer
 * Steg 2: Uppdaterar produkt-MDX frontmatter med parentCategory
 * Steg 3: Injectar produktlista i varje kategorisida
 *
 * Kör: npx tsx scripts/link-products-to-categories.ts
 */

import dotenv from "dotenv"
import { promises as fs } from "fs"
import path from "path"
import { createReadStream } from "fs"
import { createInterface } from "readline"
import matter from "gray-matter"

dotenv.config({ path: path.join(process.cwd(), ".env.local") })

const SQL_FILE = path.join(process.cwd(), "kostmagasinet_dk-db-2026-02-06.sql")
const KOSTTILSKUD_DIR = path.join(process.cwd(), "src", "app", "(da)", "kosttilskud")
const PRODUKTER_DIR = path.join(KOSTTILSKUD_DIR, "produkter")

// ─── Steg 1: Parse SQL for parent-child relations ───

interface Relation {
  productId: number
  productSlug: string
  parentId: number
}

interface CategoryInfo {
  id: number
  slug: string
  title: string
}

async function parseRelationsFromSQL(): Promise<{
  categories: Map<number, CategoryInfo>
  products: Relation[]
}> {
  const categories = new Map<number, CategoryInfo>()
  const products: Relation[] = []

  console.log("Læser SQL-dump for relationer...")

  const rl = createInterface({
    input: createReadStream(SQL_FILE, { encoding: "utf-8" }),
    crlfDelay: Infinity,
  })

  let lineCount = 0

  for await (const line of rl) {
    lineCount++

    if (
      line.startsWith("INSERT INTO `SiteTree` VALUES") ||
      line.startsWith("INSERT INTO `SiteTree_Live` VALUES")
    ) {
      // Verified column positions from CREATE TABLE / debug:
      // [0] ID, [1] ClassName, [4] URLSegment, [5] Title, [7] Content, [24] ParentID
      
      const tuples = extractTuples(line)

      for (const tuple of tuples) {
        const fields = parseTupleFields(tuple)
        if (fields.length < 25) continue

        const id = parseInt(fields[0])
        const className = fields[1]
        const urlSegment = fields[4]
        const title = fields[5]
        const parentID = parseInt(fields[24])

        if (className === "ProductCategoryPage") {
          categories.set(id, { id, slug: urlSegment, title })
        } else if (className === "ProductPage") {
          products.push({ productId: id, productSlug: urlSegment, parentId: parentID })
        }
      }
    }

    if (lineCount % 5000 === 0) {
      process.stdout.write(`\r  ${lineCount} linjer...`)
    }
  }

  console.log(`\nFandt ${categories.size} kategorier og ${products.length} produkter`)

  return { categories, products }
}

function extractTuples(line: string): string[] {
  const idx = line.indexOf("VALUES ")
  if (idx === -1) return []
  const rest = line.substring(idx + 7)

  const tuples: string[] = []
  let depth = 0
  let start = -1

  for (let i = 0; i < rest.length; i++) {
    const ch = rest[i]
    if (ch === "(") {
      if (depth === 0) start = i + 1
      depth++
    } else if (ch === ")") {
      depth--
      if (depth === 0 && start >= 0) {
        tuples.push(rest.substring(start, i))
        start = -1
      }
    } else if (ch === "'" && depth > 0) {
      // Skip quoted strings
      i++
      while (i < rest.length) {
        if (rest[i] === "'" && rest[i - 1] !== "\\") break
        i++
      }
    }
  }

  return tuples
}

function parseTupleFields(tuple: string): string[] {
  const fields: string[] = []
  let i = 0

  while (i < tuple.length) {
    // Skip whitespace/comma
    while (i < tuple.length && (tuple[i] === "," || tuple[i] === " ")) i++
    if (i >= tuple.length) break

    if (tuple[i] === "'") {
      // Quoted string
      i++ // skip opening quote
      let val = ""
      while (i < tuple.length) {
        if (tuple[i] === "\\" && i + 1 < tuple.length) {
          val += tuple[i + 1]
          i += 2
        } else if (tuple[i] === "'") {
          i++ // skip closing quote
          break
        } else {
          val += tuple[i]
          i++
        }
      }
      fields.push(val)
    } else {
      // Unquoted (number, NULL, etc)
      let val = ""
      while (i < tuple.length && tuple[i] !== ",") {
        val += tuple[i]
        i++
      }
      fields.push(val.trim())
    }
  }

  return fields
}

// ─── Steg 2 & 3: Update products + inject into categories ───

async function main() {
  console.log("=== Kobler produkter til kategorier ===\n")

  // Check SQL file exists
  try {
    await fs.access(SQL_FILE)
  } catch {
    console.error("SQL-fil ikke fundet:", SQL_FILE)
    console.log("Bruger alternativ matching baseret på produktnavn...\n")
    await fallbackMatching()
    return
  }

  const { categories, products } = await parseRelationsFromSQL()

  // Build parent-slug map
  const catMap = new Map<number, string>()
  for (const [id, info] of categories) {
    catMap.set(id, info.slug)
  }

  // Group products by parent category
  const grouped = new Map<string, string[]>()
  for (const p of products) {
    const parentSlug = catMap.get(p.parentId)
    if (!parentSlug) continue
    const existing = grouped.get(parentSlug) || []
    existing.push(p.productSlug)
    grouped.set(parentSlug, existing)
  }

  console.log(`\nKategori-produkt mapping:`)
  let totalMapped = 0
  for (const [cat, prods] of grouped) {
    console.log(`  ${cat}: ${prods.length} produkter`)
    totalMapped += prods.length
  }
  console.log(`Total mapped: ${totalMapped}\n`)

  // Now inject product sections into category MDX files
  let updated = 0
  for (const [catSlug, productSlugs] of grouped) {
    const catMdxPath = path.join(KOSTTILSKUD_DIR, catSlug, "page.mdx")

    try {
      const raw = await fs.readFile(catMdxPath, "utf8")

      if (raw.includes("## Produkter i denne kategori")) {
        continue // already done
      }

      // Get product titles
      const productInfos: { slug: string; title: string }[] = []
      for (const pSlug of productSlugs) {
        const pMdxPath = path.join(PRODUKTER_DIR, pSlug, "content.mdx")
        try {
          const pRaw = await fs.readFile(pMdxPath, "utf8")
          const { data } = matter(pRaw)
          productInfos.push({ slug: pSlug, title: data.title || pSlug })
        } catch {
          productInfos.push({ slug: pSlug, title: pSlug })
        }
      }

      productInfos.sort((a, b) => a.title.localeCompare(b.title, "da"))

      const section = buildProductSection(catSlug, productInfos)
      const updatedMdx = raw.trimEnd() + "\n\n" + section + "\n"
      await fs.writeFile(catMdxPath, updatedMdx, "utf-8")

      console.log(`  ✓ ${catSlug}: ${productInfos.length} produkter tilføjet`)
      updated++
    } catch {
      // Category MDX doesn't exist
    }
  }

  console.log(`\n=== Opdaterede ${updated} kategorisider ===`)
}

function buildProductSection(catSlug: string, products: { slug: string; title: string }[]): string {
  const lines: string[] = []

  lines.push(`## Produkter i denne kategori`)
  lines.push(``)
  lines.push(`Vi har analyseret **${products.length} produkter** inden for ${catSlug.replace(/-/g, " ")}. Herunder finder du en oversigt over produkterne i testen.`)
  lines.push(``)
  lines.push(`| Produkt | Læs mere |`)
  lines.push(`|---------|----------|`)

  for (const p of products) {
    const cleanTitle = p.title.replace(/\|/g, "–").replace(/"/g, "")
    lines.push(`| ${cleanTitle} | [Se i testen](#product-${p.slug}) |`)
  }

  lines.push(``)
  lines.push(`*Alle produkter er analyseret ud fra vores [faste metodik](/metodik). Priserne kan variere.*`)

  return lines.join("\n")
}

async function fallbackMatching() {
  console.log("Fallback: matcher produkter til kategorier via mappestruktur...\n")
  // This would be a simpler approach but SQL is better
  console.log("Ingen SQL-fil. Kør med SQL-dumpen tilgængelig for korrekt mapping.")
}

main().catch(err => {
  console.error("Fejl:", err)
  process.exit(1)
})
