/**
 * Audit script: checks all category pages to see if position #1
 * is a Healthwell/CoreNutrition product. Reports pages that need fixing.
 */
import { promises as fs } from "fs"
import path from "path"

const BUY_LINKS_FILE = path.join(process.cwd(), "content", "product-buy-links.json")
const CAT_DIR = path.join(process.cwd(), "src", "app", "(da)", "kosttilskud")

function isHealthwellOrCore(url: string): boolean {
  const u = url.toLowerCase()
  return u.includes("healthwell.dk") || u.includes("corenutrition.dk")
}

function extractStore(url: string): string {
  try {
    const host = new URL(url).hostname.replace("www.", "")
    return host
  } catch {
    return "unknown"
  }
}

function extractProductSlugs(mdx: string): string[] {
  const slugs: string[] = []
  const re = /<a id="product-([^"]+)">/g
  let m: RegExpExecArray | null
  while ((m = re.exec(mdx)) !== null) {
    if (!slugs.includes(m[1])) slugs.push(m[1])
  }
  return slugs
}

function extractAwards(mdx: string): Map<string, string> {
  const awards = new Map<string, string>()
  const re = /award="([^"]+)"[^>]*\n[^]*?slug="([^"]+)"/g
  let m: RegExpExecArray | null
  while ((m = re.exec(mdx)) !== null) {
    awards.set(m[2], m[1])
  }

  const re2 = /slug="([^"]+)"[^]*?award="([^"]+)"/g
  while ((m = re2.exec(mdx)) !== null) {
    if (!awards.has(m[1])) awards.set(m[1], m[2])
  }
  return awards
}

async function main() {
  const buyLinks: Record<string, string> = JSON.parse(
    (await fs.readFile(BUY_LINKS_FILE, "utf8")).replace(/^\uFEFF/, ""),
  )

  const entries = await fs.readdir(CAT_DIR, { withFileTypes: true })
  const catPages: string[] = []
  for (const e of entries) {
    if (!e.isDirectory()) continue
    if (e.name === "produkter") continue
    const mdxPath = path.join(CAT_DIR, e.name, "page.mdx")
    try {
      await fs.access(mdxPath)
      catPages.push(e.name + "/page.mdx")
    } catch { /* no page.mdx */ }
  }

  interface PageInfo {
    slug: string
    products: { slug: string; url: string; store: string; isHwCore: boolean }[]
    pos1IsHwCore: boolean
    hasHwCoreElsewhere: boolean
    hwCoreAtPos: number | null
  }

  const needsFix: PageInfo[] = []
  const alreadyOk: string[] = []
  const noProducts: string[] = []

  for (const catPage of catPages.sort()) {
    const catSlug = path.dirname(catPage)
    const mdxPath = path.join(CAT_DIR, catPage)
    const mdx = await fs.readFile(mdxPath, "utf8")
    const productSlugs = extractProductSlugs(mdx)

    if (productSlugs.length === 0) {
      noProducts.push(catSlug)
      continue
    }

    const products = productSlugs.map((s) => {
      const url = buyLinks[s] || ""
      return {
        slug: s,
        url,
        store: extractStore(url),
        isHwCore: url ? isHealthwellOrCore(url) : false,
      }
    })

    const pos1IsHwCore = products[0]?.isHwCore || false
    let hwCoreAtPos: number | null = null
    for (let i = 1; i < products.length; i++) {
      if (products[i].isHwCore) {
        hwCoreAtPos = i + 1
        break
      }
    }

    if (pos1IsHwCore) {
      alreadyOk.push(catSlug)
    } else {
      needsFix.push({
        slug: catSlug,
        products,
        pos1IsHwCore,
        hasHwCoreElsewhere: hwCoreAtPos !== null,
        hwCoreAtPos,
      })
    }
  }

  console.log(`\n${"=".repeat(70)}`)
  console.log(`  AUDIT: Position #1 = Healthwell/CoreNutrition?`)
  console.log(`  Total category pages: ${catPages.length}`)
  console.log(`  Already OK (pos #1 is HW/Core): ${alreadyOk.length}`)
  console.log(`  Needs fix: ${needsFix.length}`)
  console.log(`  No products found: ${noProducts.length}`)
  console.log(`${"=".repeat(70)}\n`)

  if (needsFix.length > 0) {
    console.log("PAGES THAT NEED FIXING:\n")
    for (const p of needsFix) {
      const pos1 = p.products[0]
      console.log(`  /${p.slug}`)
      console.log(`    #1: ${pos1.slug} → ${pos1.store}`)
      if (p.hasHwCoreElsewhere) {
        const hwProd = p.products.find((pr, i) => i > 0 && pr.isHwCore)!
        console.log(`    FIX: Swap with #${p.hwCoreAtPos} ${hwProd.slug} (${hwProd.store})`)
      } else {
        console.log(`    NO HW/CORE product on page — check if buy link goes to HW/Core`)
      }
      console.log(`    All products:`)
      p.products.forEach((pr, i) => {
        console.log(`      ${i + 1}. ${pr.slug} → ${pr.store}${pr.isHwCore ? " ★" : ""}`)
      })
      console.log()
    }
  }
}

main().catch(console.error)
