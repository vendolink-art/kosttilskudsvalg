import { promises as fs } from "fs"
import path from "path"
import matter from "gray-matter"
import { buildDisplayProductTitle } from "../src/lib/product-titles"

const PRODUCT_CONTENT_DIR = path.join(process.cwd(), "src", "app", "(da)", "kosttilskud", "produkter")
const CRAWLED_PRODUCTS_DIR = path.join(process.cwd(), "content", "crawled-products")
const BUY_LINKS_FILE = path.join(process.cwd(), "content", "product-buy-links.json")

type CrawledProduct = {
  sourceUrl?: string
  store?: string
  crawledAt?: string
  name?: string
  brand?: string
  imageUrl?: string
  description?: string
  fullDescription?: string
}

function clean(input?: string): string {
  return String(input || "").replace(/\s+/g, " ").trim()
}

function canonicalUrl(input: string): string {
  try {
    const u = new URL(input)
    const host = u.hostname.replace(/^www\./i, "").toLowerCase()
    const pathname = u.pathname.replace(/\/+$/, "")
    return `${u.protocol}//${host}${pathname}`.toLowerCase()
  } catch {
    return input.trim().toLowerCase().replace(/\/+$/, "")
  }
}

function parseArg(flag: string): string | null {
  const idx = process.argv.indexOf(flag)
  if (idx === -1) return null
  return process.argv[idx + 1] || null
}

async function findCrawledBySourceUrl(targetUrl: string): Promise<CrawledProduct | null> {
  const target = canonicalUrl(targetUrl)

  async function walk(dir: string): Promise<CrawledProduct | null> {
    let entries: Array<{ name: string; isDirectory: () => boolean }>
    try {
      entries = (await fs.readdir(dir, { withFileTypes: true })) as any
    } catch {
      return null
    }

    for (const entry of entries) {
      const full = path.join(dir, entry.name)
      if (entry.isDirectory()) {
        const nested = await walk(full)
        if (nested) return nested
        continue
      }
      if (!entry.name.endsWith(".json")) continue
      try {
        const raw = await fs.readFile(full, "utf8")
        const parsed = JSON.parse(raw) as CrawledProduct
        const source = typeof parsed?.sourceUrl === "string" ? canonicalUrl(parsed.sourceUrl) : ""
        if (source && source === target) return parsed
      } catch {
        // ignore malformed files
      }
    }

    return null
  }

  return walk(CRAWLED_PRODUCTS_DIR)
}

async function main() {
  const slugsArg = parseArg("--slugs")
  const skipMissingCrawled = process.argv.includes("--skip-missing-crawled")
  if (!slugsArg) {
    console.error("Usage: npx tsx scripts/sync-product-source-frontmatter.ts --slugs slug1,slug2")
    process.exit(1)
  }

  const slugs = slugsArg.split(",").map((value) => value.trim()).filter(Boolean)
  if (!slugs.length) {
    console.error("No valid slugs passed to --slugs")
    process.exit(1)
  }

  const rawLinks = await fs.readFile(BUY_LINKS_FILE, "utf8")
  const buyLinks = JSON.parse(rawLinks) as Record<string, string>

  for (const slug of slugs) {
    const file = path.join(PRODUCT_CONTENT_DIR, slug, "content.mdx")
    const sourceUrl = clean(buyLinks[slug])
    if (!sourceUrl) {
      throw new Error(`No buy link found for slug: ${slug}`)
    }

    const crawled = await findCrawledBySourceUrl(sourceUrl)
    if (!crawled) {
      if (skipMissingCrawled) {
        console.warn(`skipped ${slug} (missing crawled product)`)
        continue
      }
      throw new Error(`No crawled product found for slug: ${slug}`)
    }

    const raw = await fs.readFile(file, "utf8")
    const parsed = matter(raw)
    const title = buildDisplayProductTitle(clean(crawled.name) || clean(String(parsed.data?.title || slug)), {
      brand: clean(crawled.brand),
      contextText: `${clean(crawled.fullDescription)} ${clean(crawled.description)}`,
    })
    const description = `Anmeldelse af ${title}.`

    parsed.data.title = title
    parsed.data.description = description
    parsed.data.source_url = sourceUrl
    parsed.data.source_store = clean(crawled.store)
    parsed.data.source_image = clean(crawled.imageUrl)
    parsed.data.source_crawled_at = clean(crawled.crawledAt)
    parsed.data.updated = new Date().toISOString().slice(0, 10)

    const next = matter.stringify(parsed.content, parsed.data)
    await fs.writeFile(file, next, "utf8")
    console.log(`synced ${slug}`)
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
