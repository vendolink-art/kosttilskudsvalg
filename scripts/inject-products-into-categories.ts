/**
 * inject-products-into-categories.ts
 *
 * Skannar alla produkt-MDX-filer, hittar deras parent-kategori via tags,
 * och lägger till en produktlista med kort beskrivning i varje kategorisida.
 *
 * Kör: npx tsx scripts/inject-products-into-categories.ts
 */

import { promises as fs } from "fs"
import path from "path"
import matter from "gray-matter"

const KOSTTILSKUD_DIR = path.join(process.cwd(), "src", "app", "(da)", "kosttilskud")
const PRODUKTER_DIR = path.join(KOSTTILSKUD_DIR, "produkter")

interface ProductInfo {
  slug: string
  title: string
  description: string
  parentSlug: string
}

async function main() {
  console.log("=== Injicerer produktlister i kategorisider ===\n")

  // 1. Læs alle produkter og find deres parent-kategori
  const productDirs = await fs.readdir(PRODUKTER_DIR, { withFileTypes: true })
  const products: ProductInfo[] = []

  for (const entry of productDirs) {
    if (!entry.isDirectory() || entry.name === "[slug]") continue

    const mdxPath = path.join(PRODUKTER_DIR, entry.name, "content.mdx")
    try {
      const raw = await fs.readFile(mdxPath, "utf8")
      const { data } = matter(raw)

      // Parent-slug er gemt som 2. element i tags-arrayet (tags: ["produkttest", "parent-slug"])
      const tags: string[] = data.tags || []
      const parentSlug = tags.find(t => t !== "produkttest" && t !== "kosttilskud") || ""

      if (parentSlug) {
        products.push({
          slug: entry.name,
          title: data.title || entry.name,
          description: (data.description || "").replace(/^Anmeldelse af /, ""),
          parentSlug,
        })
      }
    } catch {
      // Skip filer der ikke kan læses
    }
  }

  console.log(`Fandt ${products.length} produkter med kategori-tilknytning`)

  // 2. Gruppér produkter efter parent-kategori
  const categoryProducts = new Map<string, ProductInfo[]>()
  for (const p of products) {
    const existing = categoryProducts.get(p.parentSlug) || []
    existing.push(p)
    categoryProducts.set(p.parentSlug, existing)
  }

  console.log(`Fordelt på ${categoryProducts.size} kategorier\n`)

  // 3. For hver kategori: injicér produktliste i MDX-filen
  let updatedCount = 0

  for (const [catSlug, prods] of categoryProducts) {
    const mdxPath = path.join(KOSTTILSKUD_DIR, catSlug, "page.mdx")

    try {
      const raw = await fs.readFile(mdxPath, "utf8")

      // Check om der allerede er en produktliste
      if (raw.includes("## Produkter i denne kategori") || raw.includes("## Bedst i test")) {
        continue // Skip – allerede injiceret
      }

      // Sortér produkter alfabetisk
      prods.sort((a, b) => a.title.localeCompare(b.title, "da"))

      // Byg produktliste-sektion
      const productSection = buildProductSection(catSlug, prods)

      // Append til MDX-filen
      const updated = raw.trimEnd() + "\n\n" + productSection + "\n"
      await fs.writeFile(mdxPath, updated, "utf-8")

      console.log(`  ✓ ${catSlug}: ${prods.length} produkter tilføjet`)
      updatedCount++
    } catch {
      // Kategori-MDX findes ikke – skip
    }
  }

  console.log(`\n=== Opdaterede ${updatedCount} kategorisider ===`)
}

function buildProductSection(catSlug: string, products: ProductInfo[]): string {
  const lines: string[] = []

  lines.push(`## Produkter i denne kategori`)
  lines.push(``)
  lines.push(`Vi har analyseret **${products.length} produkter** inden for ${catSlug.replace(/-/g, " ")}. Herunder finder du en oversigt over alle testede produkter.`)
  lines.push(``)

  // Markdown-tabel
  lines.push(`| Produkt | Læs mere |`)
  lines.push(`|---------|----------|`)

  for (const p of products) {
    const cleanTitle = p.title.replace(/\|/g, "–")
    lines.push(`| ${cleanTitle} | [Se i testen](#product-${p.slug}) |`)
  }

  lines.push(``)
  lines.push(`*Alle produkter er analyseret ud fra vores [faste metodik](/metodik). Priserne kan variere – se aktuel pris hos forhandleren.*`)

  return lines.join("\n")
}

main().catch((err) => {
  console.error("Fejl:", err)
  process.exit(1)
})
