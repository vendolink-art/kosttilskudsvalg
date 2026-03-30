/**
 * download-product-images.ts
 *
 * Downloads product images for all products used in category test pages.
 *
 * Strategy:
 *   1. Read all category pages to find which product slugs are used
 *   2. For each product, try to find an image:
 *      a. Check crawled product JSONs for a name/slug match
 *      b. Try fetching from healthwell.dk / corenutrition.dk using the slug
 *   3. Download found images to public/vendor/products/
 *   4. Save mapping to content/product-images.json
 *
 * Usage: npx tsx scripts/download-product-images.ts
 */

import { promises as fs } from "fs"
import path from "path"
import crypto from "crypto"
import matter from "gray-matter"

const PRODUKTER_DIR = path.join(process.cwd(), "src", "app", "(da)", "kosttilskud", "produkter")
const KOSTTILSKUD_DIR = path.join(process.cwd(), "src", "app", "(da)", "kosttilskud")
const CRAWLED_DIR = path.join(process.cwd(), "content", "crawled-products")
const IMAGE_DIR = path.join(process.cwd(), "public", "vendor", "products")
const MAPPING_FILE = path.join(process.cwd(), "content", "product-images.json")

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

// ─── Image download ───

function hashUrl(url: string): string {
  return crypto.createHash("sha1").update(url).digest("hex").slice(0, 12)
}

async function downloadImage(url: string): Promise<string | null> {
  try {
    const ext = (url.split("?")[0].match(/\.(jpe?g|png|webp|gif|avif|svg)$/i)?.[0] ?? ".jpg").toLowerCase()
    const h = hashUrl(url)
    await fs.mkdir(IMAGE_DIR, { recursive: true })
    const file = path.join(IMAGE_DIR, `${h}${ext}`)
    const localPath = `/vendor/products/${h}${ext}`

    // Skip if already downloaded
    try {
      await fs.access(file)
      return localPath
    } catch { /* not found, download */ }

    const res = await fetch(url, {
      headers: { "User-Agent": UA },
      redirect: "follow",
    })
    if (!res.ok) return null
    const buf = Buffer.from(await res.arrayBuffer())
    if (buf.length < 500) return null // too small, likely error page
    await fs.writeFile(file, buf)
    return localPath
  } catch {
    return null
  }
}

// ─── Load crawled product index ───

interface CrawledEntry {
  name: string
  nameNorm: string
  imageUrl: string
  store: string
  sourceUrl: string
}

async function loadCrawledIndex(): Promise<CrawledEntry[]> {
  const entries: CrawledEntry[] = []
  try {
    const stores = await fs.readdir(CRAWLED_DIR)
    for (const store of stores) {
      const storeDir = path.join(CRAWLED_DIR, store)
      const stat = await fs.stat(storeDir)
      if (!stat.isDirectory()) continue
      const files = await fs.readdir(storeDir)
      for (const file of files) {
        if (!file.endsWith(".json")) continue
        try {
          const data = JSON.parse(await fs.readFile(path.join(storeDir, file), "utf-8"))
          if (data.name && data.imageUrl && data.imageUrl.length > 20) {
            entries.push({
              name: data.name,
              nameNorm: normalize(data.name),
              imageUrl: data.imageUrl,
              store: data.store,
              sourceUrl: data.sourceUrl || "",
            })
          }
        } catch { /* skip */ }
      }
    }
  } catch { /* no crawled dir */ }
  return entries
}

function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/[æ]/g, "ae").replace(/[ø]/g, "oe").replace(/[å]/g, "aa")
    .replace(/[^a-z0-9]/g, "")
}

// ─── Find product image from crawled data ───

function findCrawledImage(productTitle: string, crawled: CrawledEntry[]): string | null {
  const norm = normalize(productTitle)

  // Exact normalized match
  for (const c of crawled) {
    if (c.nameNorm === norm) return c.imageUrl
  }

  // Substring match (crawled name in product title or vice versa)
  for (const c of crawled) {
    if (norm.includes(c.nameNorm) || c.nameNorm.includes(norm)) {
      return c.imageUrl
    }
  }

  // Fuzzy: check if most significant words overlap
  const productWords = norm.match(/.{3,}/g) || []
  for (const c of crawled) {
    const crawledWords = c.nameNorm
    let matchCount = 0
    for (const w of productWords) {
      if (crawledWords.includes(w)) matchCount++
    }
    if (matchCount >= 2 && matchCount >= productWords.length * 0.5) {
      return c.imageUrl
    }
  }

  return null
}

// ─── Try fetching image from store URL ───

async function tryFetchImageFromStore(slug: string, title: string): Promise<string | null> {
  // Convert product slug to potential store URL slugs
  const urlSlug = slug
    .replace(/^httpswww-/, "")
    .replace(/^https-/, "")
    .replace(/-dk-/, "-") // e.g. healthwell-dkslug -> slug
    .replace(/da\d+-\d+$/, "") // remove query param remnants
    .replace(/-+$/, "")

  // Also try a clean slug from the product title
  const titleSlug = title
    .toLowerCase()
    .replace(/healthwell\s+/i, "")
    .replace(/core\s+/i, "core-")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")

  const storesToTry = [
    `https://www.healthwell.dk/${titleSlug}`,
    `https://www.corenutrition.dk/${titleSlug}`,
    `https://www.healthwell.dk/${urlSlug}`,
    `https://www.corenutrition.dk/${urlSlug}`,
  ]

  // Dedupe
  const unique = [...new Set(storesToTry)]

  for (const storeUrl of unique) {
    try {
      const res = await fetch(storeUrl, {
        headers: { "User-Agent": UA, "Accept": "text/html" },
        redirect: "follow",
      })
      if (!res.ok) continue
      const html = await res.text()

      // Try JSON-LD Product image
      const jsonLdMatch = html.match(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi)
      if (jsonLdMatch) {
        for (const block of jsonLdMatch) {
          try {
            const content = block.replace(/<[^>]+>/g, "")
            const obj = JSON.parse(content)
            const prod = obj["@type"] === "Product" ? obj :
              obj["@graph"]?.find?.((n: any) => n["@type"] === "Product") || null
            if (prod?.image) {
              const img = typeof prod.image === "string" ? prod.image : prod.image[0]
              if (img && img.length > 20) return img
            }
          } catch { /* skip */ }
        }
      }

      // Try og:image
      const ogMatch = html.match(/property="og:image"\s*content="([^"]+)"/i) ||
                       html.match(/content="([^"]+)"\s*property="og:image"/i)
      if (ogMatch?.[1] && ogMatch[1].length > 20) {
        return ogMatch[1]
      }
    } catch { /* skip */ }

    await sleep(300) // be polite
  }

  return null
}

// ─── Find all product slugs used in category pages ───

async function findUsedProductSlugs(): Promise<Set<string>> {
  const slugs = new Set<string>()
  const entries = await fs.readdir(KOSTTILSKUD_DIR, { withFileTypes: true })

  for (const entry of entries) {
    if (!entry.isDirectory() || entry.name === "[slug]" || entry.name === "produkter") continue
    const mdxPath = path.join(KOSTTILSKUD_DIR, entry.name, "page.mdx")
    try {
      const raw = await fs.readFile(mdxPath, "utf-8")
      const anchorRegex = /<a id="product-([^"]+)">/g
      let match: RegExpExecArray | null
      while ((match = anchorRegex.exec(raw)) !== null) {
        slugs.add(match[1])
      }
    } catch { /* skip */ }
  }

  return slugs
}

// ─── Main ───

async function main() {
  console.log("═══════════════════════════════════════")
  console.log("  Product Image Downloader")
  console.log("═══════════════════════════════════════\n")

  // Load existing mapping
  let mapping: Record<string, string> = {}
  try {
    mapping = JSON.parse(await fs.readFile(MAPPING_FILE, "utf-8"))
    console.log(`Loaded existing mapping with ${Object.keys(mapping).length} entries`)
  } catch { /* no existing mapping */ }

  // Load crawled product index
  const crawled = await loadCrawledIndex()
  console.log(`Loaded ${crawled.length} crawled products with images`)

  // Find all product slugs used in category pages
  const usedSlugs = await findUsedProductSlugs()
  console.log(`Found ${usedSlugs.size} products used in category pages\n`)

  let found = 0
  let downloaded = 0
  let notFound = 0
  let alreadyHave = 0
  const total = usedSlugs.size
  let processed = 0

  for (const slug of usedSlugs) {
    processed++

    // Already have image?
    if (mapping[slug]) {
      alreadyHave++
      continue
    }

    // Load product title
    const mdxPath = path.join(PRODUKTER_DIR, slug, "content.mdx")
    let title = slug
    try {
      const raw = await fs.readFile(mdxPath, "utf-8")
      const { data } = matter(raw)
      title = data.title || slug
    } catch { /* use slug as title */ }

    // 1. Try crawled data match
    let imageUrl = findCrawledImage(title, crawled)

    // 2. Try fetching from store
    if (!imageUrl) {
      imageUrl = await tryFetchImageFromStore(slug, title)
    }

    if (imageUrl) {
      // Download the image
      const localPath = await downloadImage(imageUrl)
      if (localPath) {
        mapping[slug] = localPath
        found++
        downloaded++
        process.stdout.write(`  ✓ [${processed}/${total}] ${title.slice(0, 50)} → ${localPath}\n`)
      } else {
        notFound++
        process.stdout.write(`  ✗ [${processed}/${total}] ${title.slice(0, 50)} (download failed)\n`)
      }
    } else {
      notFound++
      if (processed <= 20 || processed % 50 === 0) {
        process.stdout.write(`  - [${processed}/${total}] ${title.slice(0, 50)} (no image found)\n`)
      }
    }

    // Save periodically
    if (processed % 50 === 0) {
      await fs.writeFile(MAPPING_FILE, JSON.stringify(mapping, null, 2), "utf-8")
    }
  }

  // Final save
  await fs.writeFile(MAPPING_FILE, JSON.stringify(mapping, null, 2), "utf-8")

  console.log(`\n═══════════════════════════════════════`)
  console.log(`  Done!`)
  console.log(`  Already had: ${alreadyHave}`)
  console.log(`  Downloaded: ${downloaded}`)
  console.log(`  Not found: ${notFound}`)
  console.log(`  Total mapped: ${Object.keys(mapping).length}/${total}`)
  console.log(`  Mapping: ${MAPPING_FILE}`)
  console.log(`  Images: ${IMAGE_DIR}`)
  console.log(`═══════════════════════════════════════`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
