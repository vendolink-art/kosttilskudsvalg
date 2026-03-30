/**
 * Identifies remaining duplicates and what URLs are already taken on each page.
 * Outputs structured data to help find truly unique replacement URLs.
 */
import { promises as fs } from "fs"
import path from "path"

const BUY_LINKS_FILE = path.join(process.cwd(), "content", "product-buy-links.json")
const CAT_DIR = path.join(process.cwd(), "src", "app", "(da)", "kosttilskud")

function extractProductSlugs(mdx: string): string[] {
  const slugs: string[] = []
  const re = /<a id="product-([^"]+)">/g
  let m: RegExpExecArray | null
  while ((m = re.exec(mdx)) !== null) {
    if (!slugs.includes(m[1])) slugs.push(m[1])
  }
  return slugs
}

function normalizeUrl(url: string): string {
  try {
    const u = new URL(url)
    return (u.origin + u.pathname).replace(/\/$/, "").toLowerCase()
  } catch {
    return url.toLowerCase().replace(/\/$/, "")
  }
}

async function main() {
  const buyLinks: Record<string, string> = JSON.parse(
    (await fs.readFile(BUY_LINKS_FILE, "utf8")).replace(/^\uFEFF/, ""),
  )

  const entries = await fs.readdir(CAT_DIR, { withFileTypes: true })

  for (const e of entries) {
    if (!e.isDirectory() || e.name === "produkter") continue
    const mdxPath = path.join(CAT_DIR, e.name, "page.mdx")
    let mdx: string
    try { mdx = await fs.readFile(mdxPath, "utf8") } catch { continue }

    const slugs = extractProductSlugs(mdx)
    if (slugs.length < 2) continue

    const urlToSlugs = new Map<string, { slug: string; pos: number }[]>()
    for (let i = 0; i < slugs.length; i++) {
      const slug = slugs[i]
      const url = buyLinks[slug]
      if (!url) continue
      const norm = normalizeUrl(url)
      const arr = urlToSlugs.get(norm) || []
      arr.push({ slug, pos: i + 1 })
      urlToSlugs.set(norm, arr)
    }

    const dupes = [...urlToSlugs.entries()].filter(([, s]) => s.length > 1)
    if (dupes.length === 0) continue

    console.log(`\n=== /${e.name} ===`)
    console.log(`  All products on page:`)
    for (let i = 0; i < slugs.length; i++) {
      const url = buyLinks[slugs[i]] || "NO URL"
      const host = (() => { try { return new URL(url).hostname } catch { return "?" } })()
      console.log(`    #${i + 1} ${slugs[i]} → ${host} → ${normalizeUrl(url)}`)
    }
    for (const [url, dupeSlugs] of dupes) {
      const toReplace = dupeSlugs[dupeSlugs.length - 1]
      console.log(`  DUPE: ${url}`)
      console.log(`    KEEP: #${dupeSlugs[0].pos} ${dupeSlugs[0].slug}`)
      console.log(`    REPLACE: #${toReplace.pos} ${toReplace.slug}`)
    }
  }
}

main().catch(console.error)
