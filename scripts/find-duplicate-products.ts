/**
 * Finds category pages where two or more product slots point to the same buy URL.
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
  let totalDupes = 0

  for (const e of entries) {
    if (!e.isDirectory() || e.name === "produkter") continue
    const mdxPath = path.join(CAT_DIR, e.name, "page.mdx")
    let mdx: string
    try { mdx = await fs.readFile(mdxPath, "utf8") } catch { continue }

    const slugs = extractProductSlugs(mdx)
    if (slugs.length < 2) continue

    const urlToSlugs = new Map<string, string[]>()
    for (const slug of slugs) {
      const url = buyLinks[slug]
      if (!url) continue
      const norm = normalizeUrl(url)
      const arr = urlToSlugs.get(norm) || []
      arr.push(slug)
      urlToSlugs.set(norm, arr)
    }

    const dupes = [...urlToSlugs.entries()].filter(([, s]) => s.length > 1)
    if (dupes.length > 0) {
      totalDupes++
      console.log(`\n  /${e.name}`)
      for (const [url, dupeSlugs] of dupes) {
        const positions = dupeSlugs.map((s) => `#${slugs.indexOf(s) + 1} ${s}`)
        console.log(`    DUPE: ${url}`)
        console.log(`      → ${positions.join(", ")}`)
      }
    }
  }

  console.log(`\n  Total pages with duplicates: ${totalDupes}`)
}

main().catch(console.error)
