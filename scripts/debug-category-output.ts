/**
 * debug-category-output.ts
 *
 * Reads a generated category MDX page and prints the parsed/rendered
 * product data (award, ratings, quick facts) for inspection.
 *
 * Usage:
 *   npx tsx scripts/debug-category-output.ts eaa
 */
import { promises as fs } from "fs"
import path from "path"

type ExtractedProduct = {
  slug: string
  title: string
  brand: string
  badge: string
  headerScore: number | null
  overallRating: number | null
  subRatings: Array<{ label: string; value: number }>
  quickFacts: Array<{ label: string; value: string }>
}

function parseArgSlug(): string {
  const arg = process.argv.slice(2).find((x) => x && !x.startsWith("-"))
  if (!arg) {
    console.error("Usage: npx tsx scripts/debug-category-output.ts <category-slug>")
    process.exit(1)
  }
  return arg.trim()
}

function pickFirst(match: RegExpMatchArray | null | undefined): string {
  return match?.[1] ? String(match[1]) : ""
}

function toNumber(value: string): number | null {
  const n = Number(String(value).replace(",", "."))
  return Number.isFinite(n) ? n : null
}

function extractProductsFromMdx(mdx: string): ExtractedProduct[] {
  const anchors = [...mdx.matchAll(/<a id="product-([^"]+)"><\/a>/g)].map((m) => m[1])
  const out: ExtractedProduct[] = []

  for (let i = 0; i < anchors.length; i++) {
    const slug = anchors[i]
    const startIdx = mdx.indexOf(`<a id="product-${slug}"></a>`)
    const endIdx =
      i + 1 < anchors.length ? mdx.indexOf(`<a id="product-${anchors[i + 1]}"></a>`) : mdx.length
    const block = mdx.slice(startIdx, endIdx)

    const badge = pickFirst(block.match(/<span className="inline-block rounded-full[^"]*">([^<]+)<\/span>/))
    const title = pickFirst(block.match(/<h3 className="text-xl font-bold[^"]*">[^.]*\.\s*([^<]+)<\/h3>/))
    const brand = pickFirst(block.match(/<span className="mt-1 text-sm text-slate-500 block">([^<]*)<\/span>/))
    const headerScore = toNumber(pickFirst(block.match(/<span className="text-lg font-bold text-slate-900">(\d+(?:\.\d+)?)<\/span>/)))

    const pr = block.match(/<ProductRating\s+ratings=\{\[(.*?)\]\}\s+overallRating=\{(\d+(?:\.\d+)?)\}\s*\/>/s)
    const subRatingsRaw = pr?.[1] ? `[${pr[1]}]` : "[]"
    let subRatings: Array<{ label: string; value: number }> = []
    try {
      subRatings = JSON.parse(subRatingsRaw)
    } catch {
      subRatings = []
    }
    const overallRating = pr?.[2] ? toNumber(pr[2]) : null

    const quickFacts: Array<{ label: string; value: string }> = []
    const dl = block.match(/<dl className="mt-4 grid[\s\S]*?<\/dl>/)
    if (dl?.[0]) {
      const dt = [...dl[0].matchAll(/<dt [^>]*>([^<]+)<\/dt>/g)].map((m) => m[1].trim())
      const dd = [...dl[0].matchAll(/<dd [^>]*>([^<]+)<\/dd>/g)].map((m) => m[1].trim())
      const n = Math.min(dt.length, dd.length)
      for (let j = 0; j < n; j++) quickFacts.push({ label: dt[j], value: dd[j] })
    }

    out.push({
      slug,
      title: title || slug,
      brand,
      badge,
      headerScore,
      overallRating,
      subRatings,
      quickFacts,
    })
  }

  return out
}

async function main() {
  const catSlug = parseArgSlug()
  const mdxPath = path.join(process.cwd(), "src", "app", "(da)", "kosttilskud", catSlug, "page.mdx")
  const raw = await fs.readFile(mdxPath, "utf8")
  const products = extractProductsFromMdx(raw)

  console.log(`\nCategory: ${catSlug}`)
  console.log(`Products parsed: ${products.length}\n`)

  for (const p of products) {
    console.log(`- ${p.slug}`)
    console.log(`  title: ${p.title}`)
    console.log(`  brand: ${p.brand || "-"}`)
    console.log(`  badge: ${p.badge || "-"}`)
    console.log(`  headerScore: ${p.headerScore ?? "?"}`)
    console.log(`  overallRating(ProductRating): ${p.overallRating ?? "?"}`)
    if (p.subRatings.length > 0) {
      console.log(`  subRatings:`)
      for (const r of p.subRatings) console.log(`    - ${r.label}: ${r.value}`)
    } else {
      console.log(`  subRatings: (none)`)
    }
    if (p.quickFacts.length > 0) {
      console.log(`  quickFacts:`)
      for (const f of p.quickFacts) console.log(`    - ${f.label}: ${f.value}`)
    } else {
      console.log(`  quickFacts: (none)`)
    }
    console.log("")
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})

