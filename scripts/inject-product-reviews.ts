/**
 * inject-product-reviews.ts
 *
 * Ersätter de enkla produkttabellerna i varje kategorisida med
 * fullständiga inline produkttestgenomgångar (som fordonssajten).
 *
 * Varje produkt får:
 * 1. Anchor-länk
 * 2. Produktkort med titel, sammanfattning, badge och CTA
 * 3. Fullständig reviewtext (från product content.mdx)
 * 4. Sammanfattning med länk till produktsida
 *
 * Kör: npx tsx scripts/inject-product-reviews.ts
 */

import { promises as fs } from "fs"
import path from "path"
import matter from "gray-matter"

const KOSTTILSKUD_DIR = path.join(process.cwd(), "src", "app", "(da)", "kosttilskud")
const PRODUKTER_DIR = path.join(KOSTTILSKUD_DIR, "produkter")

interface ProductReview {
  slug: string
  title: string
  description: string
  content: string // Raw MDX content without frontmatter
  position: number
}

async function main() {
  console.log("=== Injicerer produkttestgenomgångar i kategorisider ===\n")

  const entries = await fs.readdir(KOSTTILSKUD_DIR, { withFileTypes: true })
  let updatedCount = 0
  let totalProducts = 0

  for (const entry of entries) {
    if (!entry.isDirectory() || entry.name === "[slug]" || entry.name === "produkter") continue

    const catSlug = entry.name
    const mdxPath = path.join(KOSTTILSKUD_DIR, catSlug, "page.mdx")

    try {
      const raw = await fs.readFile(mdxPath, "utf8")

      // Check if this category has the product table
      if (!raw.includes("## Produkter i denne kategori")) continue

      // Extract product slugs from the existing table
      const productSlugs = extractProductSlugsFromTable(raw)
      if (productSlugs.length === 0) continue

      // Load each product's review content
      const reviews: ProductReview[] = []
      for (let i = 0; i < productSlugs.length; i++) {
        const pSlug = productSlugs[i]
        const review = await loadProductReview(pSlug, i + 1)
        if (review) reviews.push(review)
      }

      if (reviews.length === 0) continue

      // Remove the old table section
      const cleanedMdx = removeOldProductTable(raw)

      // Build the new inline review sections
      const reviewSection = buildReviewSections(catSlug, reviews)

      // Combine
      const finalMdx = cleanedMdx.trimEnd() + "\n\n" + reviewSection + "\n"
      await fs.writeFile(mdxPath, finalMdx, "utf-8")

      console.log(`  ✓ ${catSlug}: ${reviews.length} produkttest-gennemgange`)
      updatedCount++
      totalProducts += reviews.length
    } catch {
      // skip
    }
  }

  console.log(`\n=== Opdaterede ${updatedCount} kategorisider med ${totalProducts} produkttests ===`)
}

function extractProductSlugsFromTable(mdx: string): string[] {
  const slugs: string[] = []
  const regex = /\[Se vurdering\]\(\/kosttilskud\/produkter\/([^)]+)\)/g
  let match: RegExpExecArray | null
  while ((match = regex.exec(mdx)) !== null) {
    if (!slugs.includes(match[1])) {
      slugs.push(match[1])
    }
  }
  return slugs
}

async function loadProductReview(slug: string, position: number): Promise<ProductReview | null> {
  const mdxPath = path.join(PRODUKTER_DIR, slug, "content.mdx")
  try {
    const raw = await fs.readFile(mdxPath, "utf8")
    const { data, content } = matter(raw)

    // Remove the H1 heading (first # line) from content since we show the title separately
    const cleanContent = content
      .replace(/^#\s+.+$/m, "")
      .trim()

    return {
      slug,
      title: data.title || slug,
      description: data.description || "",
      content: cleanContent,
      position,
    }
  } catch {
    return null
  }
}

function removeOldProductTable(mdx: string): string {
  const marker = "## Produkter i denne kategori"
  const idx = mdx.indexOf(marker)
  if (idx === -1) return mdx
  return mdx.substring(0, idx).trimEnd()
}

function buildReviewSections(catSlug: string, reviews: ProductReview[]): string {
  const lines: string[] = []
  const categoryName = catSlug.replace(/-/g, " ")

  lines.push(`## Testede produkter inden for ${categoryName}`)
  lines.push(``)
  lines.push(`Vi har analyseret og sammenlignet **${reviews.length} produkter** inden for ${categoryName}. Herunder finder du vores gennemgang af hvert enkelt produkt.`)
  lines.push(``)

  // Quick navigation / table of contents
  lines.push(`### Hurtigt overblik`)
  lines.push(``)
  for (const r of reviews) {
    const cleanTitle = r.title.replace(/\|/g, "–")
    lines.push(`${r.position}. [${cleanTitle}](#product-${r.slug})`)
  }
  lines.push(``)
  lines.push(`---`)
  lines.push(``)

  // Full inline review for each product
  for (const r of reviews) {
    lines.push(buildSingleProductReview(r, catSlug))
    lines.push(``)
    lines.push(`---`)
    lines.push(``)
  }

  lines.push(`*Alle produkter er analyseret ud fra vores [faste metodik](/metodik). Priserne kan variere – se aktuel pris hos forhandleren.*`)

  return lines.join("\n")
}

function buildSingleProductReview(review: ProductReview, catSlug: string): string {
  const lines: string[] = []
  const cleanTitle = review.title.replace(/"/g, "&quot;")

  // 1. Anchor for in-page navigation
  lines.push(`<a id="product-${review.slug}"></a>`)
  lines.push(``)

  // 2. Product card (article element like fordonssajten)
  lines.push(`<article className="my-8 w-full overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm ring-1 ring-black/5">`)
  lines.push(`  <div className="p-5 sm:p-6">`)
  lines.push(`    <div className="flex items-start justify-between gap-4">`)
  lines.push(`      <div className="flex-1 min-w-0">`)
  lines.push(`        <h3 className="text-lg font-bold text-slate-900 leading-tight">${review.position}. ${cleanTitle}</h3>`)

  // Short description
  if (review.description) {
    const shortDesc = review.description
      .replace(/"/g, "&quot;")
      .replace(/^Anmeldelse af /, "")
    lines.push(`        <p className="mt-1.5 text-sm text-slate-500 line-clamp-2">${shortDesc}</p>`)
  }

  lines.push(`      </div>`)
  lines.push(`    </div>`)

  // CTA buttons
  lines.push(`    <div className="mt-4 flex flex-wrap gap-3">`)
  // No standalone product pages: link to the in-page product section instead.
  lines.push(`      <a href="#product-${review.slug}" className="inline-flex items-center gap-2 rounded-lg bg-green-700 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-green-800">`)
  lines.push(`        Se i testen`)
  lines.push(`        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>`)
  lines.push(`          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />`)
  lines.push(`        </svg>`)
  lines.push(`      </a>`)
  lines.push(`    </div>`)
  lines.push(`  </div>`)
  lines.push(`</article>`)
  lines.push(``)

  // 3. Full review text (the actual product content)
  if (review.content) {
    lines.push(`<div className="prose prose-slate mt-4 max-w-none">`)
    lines.push(``)
    lines.push(review.content)
    lines.push(``)
    lines.push(`</div>`)
    lines.push(``)
  }

  // 4. Summary link back to full product page
  lines.push(`<div className="my-4 rounded-lg bg-slate-50 border border-slate-200 p-4">`)
  lines.push(`  <p className="text-sm text-slate-600">`)
  lines.push(`    <strong>Se produktet i testen:</strong> <a href="#product-${review.slug}" className="text-green-700 underline hover:text-green-800">${cleanTitle}</a>`)
  lines.push(`  </p>`)
  lines.push(`</div>`)

  return lines.join("\n")
}

main().catch(err => {
  console.error("Fejl:", err)
  process.exit(1)
})
