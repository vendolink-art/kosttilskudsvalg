/**
 * download-via-sitemap.ts
 *
 * Downloads product images using store sitemaps + direct page fetches.
 *
 * Strategy:
 *   1. Parse Healthwell product sitemap → extract image URLs
 *   2. Parse MM Sports sitemap → get product URLs
 *   3. For remaining: try direct product page fetch (og:image / JSON-LD)
 *   4. Match products by name/slug fuzzy matching
 *
 * Usage: npx tsx scripts/download-via-sitemap.ts
 */

import { promises as fs } from "fs"
import path from "path"
import crypto from "crypto"
import matter from "gray-matter"

const PRODUKTER_DIR = path.join(process.cwd(), "src", "app", "(da)", "kosttilskud", "produkter")
const KOSTTILSKUD_DIR = path.join(process.cwd(), "src", "app", "(da)", "kosttilskud")
const IMAGE_DIR = path.join(process.cwd(), "public", "vendor", "products")
const MAPPING_FILE = path.join(process.cwd(), "content", "product-images.json")

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))

// ─── Helpers ───
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
    try { await fs.access(file); return localPath } catch { /* dl */ }
    const res = await fetch(url, { headers: { "User-Agent": UA }, redirect: "follow" })
    if (!res.ok) return null
    const buf = Buffer.from(await res.arrayBuffer())
    if (buf.length < 500) return null
    await fs.writeFile(file, buf)
    return localPath
  } catch { return null }
}

function normalize(s: string): string {
  return s.toLowerCase()
    .replace(/[æ]/g, "ae").replace(/[ø]/g, "oe").replace(/[å]/g, "aa")
    .replace(/[^a-z0-9]/g, "")
}

// ─── Step 1: Parse Healthwell sitemap for image URLs ───
interface SitemapEntry { slug: string; imageUrl: string; norm: string }

async function parseHealthwellSitemap(): Promise<SitemapEntry[]> {
  console.log("  Fetching Healthwell product sitemap...")
  const res = await fetch("https://www.healthwell.dk/sitemap_products.xml", { headers: { "User-Agent": UA } })
  const xml = await res.text()

  const entries: SitemapEntry[] = []
  // Match <url> blocks with <loc> and <image:loc>
  const urlBlocks = xml.match(/<url>[\s\S]*?<\/url>/gi) || []
  for (const block of urlBlocks) {
    const locMatch = block.match(/<loc>\s*(.*?)\s*<\/loc>/i)
    const imgMatch = block.match(/<image:loc>\s*(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?\s*<\/image:loc>/i)
    if (locMatch && imgMatch) {
      const url = locMatch[1]
      const imageUrl = imgMatch[1]
      // Extract slug from URL (last path segment)
      const slug = url.split("/").pop()?.split("?")[0] || ""
      if (slug && imageUrl && imageUrl.length > 20) {
        // Convert test.healthwell.com image URLs to www.healthwell.dk
        const fixedImageUrl = imageUrl.replace("test.healthwell.com", "www.healthwell.dk")
        entries.push({ slug, imageUrl: fixedImageUrl, norm: normalize(slug) })
      }
    }
  }
  console.log(`  Found ${entries.length} products with images in Healthwell sitemap`)
  return entries
}

// Also parse corenutrition sitemap (same CMS)
async function parseCoreNutritionSitemap(): Promise<SitemapEntry[]> {
  console.log("  Fetching CoreNutrition product sitemap...")
  try {
    const res = await fetch("https://www.corenutrition.dk/sitemap_products.xml", { headers: { "User-Agent": UA } })
    if (!res.ok) { console.log("    Not found"); return [] }
    const xml = await res.text()
    const entries: SitemapEntry[] = []
    const urlBlocks = xml.match(/<url>[\s\S]*?<\/url>/gi) || []
    for (const block of urlBlocks) {
      const locMatch = block.match(/<loc>\s*(.*?)\s*<\/loc>/i)
      const imgMatch = block.match(/<image:loc>\s*(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?\s*<\/image:loc>/i)
      if (locMatch && imgMatch) {
        const slug = locMatch[1].split("/").pop()?.split("?")[0] || ""
        const imageUrl = imgMatch[1]
        if (slug && imageUrl && imageUrl.length > 20) {
          entries.push({ slug, imageUrl, norm: normalize(slug) })
        }
      }
    }
    console.log(`  Found ${entries.length} products with images in CoreNutrition sitemap`)
    return entries
  } catch { console.log("    Error"); return [] }
}

// ─── Step 2: Parse MM Sports sitemap for product URLs ───
async function parseMmSportsSitemap(): Promise<string[]> {
  console.log("  Fetching MM Sports sitemap...")
  const res = await fetch("https://www.mmsportsstore.dk/sitemap.xml", { headers: { "User-Agent": UA } })
  const xml = await res.text()
  const urls = xml.match(/<loc>(https:\/\/www\.mmsportsstore\.dk\/[^<]+)<\/loc>/gi) || []
  const productUrls = urls
    .map(u => u.match(/<loc>([^<]+)<\/loc>/)?.[1] || "")
    .filter(u => u.includes("/") && !u.endsWith(".dk/"))
  console.log(`  Found ${productUrls.length} URLs in MM Sports sitemap`)
  return productUrls
}

// ─── Step 3: Fetch image from a product page ───
async function fetchImageFromPage(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, { headers: { "User-Agent": UA, "Accept": "text/html" }, redirect: "follow" })
    if (!res.ok) return null
    const html = await res.text()

    // JSON-LD
    const jsonLdBlocks = html.match(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi)
    if (jsonLdBlocks) {
      for (const block of jsonLdBlocks) {
        try {
          const content = block.replace(/<[^>]+>/g, "")
          const obj = JSON.parse(content)
          const prod = obj["@type"] === "Product" ? obj :
            obj["@graph"]?.find?.((n: any) => n["@type"] === "Product") || null
          if (prod?.image) {
            const img = typeof prod.image === "string" ? prod.image :
                        Array.isArray(prod.image) ? prod.image[0] :
                        prod.image?.url || null
            if (img && typeof img === "string" && img.length > 20) return img
          }
        } catch { /* skip */ }
      }
    }

    // og:image
    const ogMatch = html.match(/property="og:image"\s*content="([^"]{20,})"/i) ||
                     html.match(/content="([^"]{20,})"\s*property="og:image"/i)
    if (ogMatch?.[1]) return ogMatch[1]

    return null
  } catch { return null }
}

// ─── Match product to sitemap entries ───
function findMatchInSitemap(productTitle: string, productSlug: string, entries: SitemapEntry[]): string | null {
  const normTitle = normalize(productTitle)
  const normSlug = normalize(productSlug)

  // 1. Exact slug match
  for (const e of entries) {
    if (e.norm === normSlug) return e.imageUrl
  }

  // 2. Slug without brand prefix
  const slugWithoutBrand = productSlug
    .replace(/^healthwell-/, "")
    .replace(/^core-/, "")
    .replace(/^rawpowder-/, "")
  const normWithout = normalize(slugWithoutBrand)
  for (const e of entries) {
    if (e.norm === normWithout) return e.imageUrl
  }

  // 3. Title-derived slug match
  const titleSlug = productTitle.toLowerCase()
    .replace(/^healthwell\s+/i, "")
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
  const normTitleSlug = normalize(titleSlug)
  for (const e of entries) {
    if (e.norm === normTitleSlug) return e.imageUrl
  }

  // 4. Substring matching (our name contains sitemap name or vice versa)
  for (const e of entries) {
    if (e.norm.length > 5 && (normTitle.includes(e.norm) || e.norm.includes(normTitle))) {
      return e.imageUrl
    }
  }

  // 5. Significant overlap (at least 60% of chars match)
  for (const e of entries) {
    if (e.norm.length < 5 || normTitle.length < 5) continue
    const shorter = e.norm.length < normTitle.length ? e.norm : normTitle
    const longer = e.norm.length < normTitle.length ? normTitle : e.norm
    if (longer.includes(shorter) && shorter.length >= longer.length * 0.5) {
      return e.imageUrl
    }
  }

  return null
}

// ─── Find all product slugs ───
async function findUsedProductSlugs(): Promise<Set<string>> {
  const slugs = new Set<string>()
  const entries = await fs.readdir(KOSTTILSKUD_DIR, { withFileTypes: true })
  for (const entry of entries) {
    if (!entry.isDirectory() || entry.name === "[slug]" || entry.name === "produkter") continue
    try {
      const raw = await fs.readFile(path.join(KOSTTILSKUD_DIR, entry.name, "page.mdx"), "utf-8")
      const regex = /<a id="product-([^"]+)">/g
      let m: RegExpExecArray | null
      while ((m = regex.exec(raw)) !== null) slugs.add(m[1])
    } catch { /* skip */ }
  }
  return slugs
}

// ─── Main ───
async function main() {
  console.log("═══════════════════════════════════════════════")
  console.log("  Sitemap-based Image Downloader")
  console.log("═══════════════════════════════════════════════\n")

  let mapping: Record<string, string> = {}
  try {
    mapping = JSON.parse(await fs.readFile(MAPPING_FILE, "utf-8"))
    console.log(`  Existing: ${Object.keys(mapping).length} images\n`)
  } catch { /* none */ }

  // Step 1: Download & parse sitemaps
  const hwEntries = await parseHealthwellSitemap()
  const cnEntries = await parseCoreNutritionSitemap()
  const allSitemapEntries = [...hwEntries, ...cnEntries]
  console.log(`  Total sitemap entries: ${allSitemapEntries.length}\n`)

  // Step 2: Get MM Sports URLs for fallback
  const mmUrls = await parseMmSportsSitemap()

  // Step 3: Find missing products
  const usedSlugs = await findUsedProductSlugs()
  const missing = [...usedSlugs].filter(s => !mapping[s])
  console.log(`\n  Missing images: ${missing.length}\n`)

  let found = 0
  let notFound = 0
  let sitemapMatches = 0
  let pageMatches = 0

  for (let idx = 0; idx < missing.length; idx++) {
    const slug = missing[idx]
    const num = idx + 1

    // Load product title
    let title = slug.replace(/-/g, " ")
    try {
      const raw = await fs.readFile(path.join(PRODUKTER_DIR, slug, "content.mdx"), "utf-8")
      const { data } = matter(raw)
      title = data.title || title
    } catch { /* use slug */ }

    // Try sitemap match first (instant, no HTTP request)
    let imageUrl = findMatchInSitemap(title, slug, allSitemapEntries)
    if (imageUrl) sitemapMatches++

    // If not found in sitemap, try direct page fetch from stores
    if (!imageUrl) {
      // Try healthwell direct page
      const cleanSlug = slug.replace(/^healthwell-/, "")
      const pageUrl = `https://www.healthwell.dk/${cleanSlug}`
      imageUrl = await fetchImageFromPage(pageUrl)
      if (imageUrl) { pageMatches++; }
      else {
        // Try corenutrition
        const coreSlug = slug.replace(/^core-/, "")
        imageUrl = await fetchImageFromPage(`https://www.corenutrition.dk/${coreSlug}`)
        if (imageUrl) pageMatches++
      }

      // Try matching MM Sports URL
      if (!imageUrl) {
        const normSlug = normalize(slug)
        const mmMatch = mmUrls.find(u => {
          const urlSlug = normalize(u.split("/").pop() || "")
          return urlSlug && urlSlug.length > 5 && (normSlug.includes(urlSlug) || urlSlug.includes(normSlug))
        })
        if (mmMatch) {
          imageUrl = await fetchImageFromPage(mmMatch)
          if (imageUrl) pageMatches++
        }
      }

      await sleep(200)
    }

    if (imageUrl) {
      const localPath = await downloadImage(imageUrl)
      if (localPath) {
        mapping[slug] = localPath
        found++
        process.stdout.write(`  ✓ [${num}/${missing.length}] ${title.slice(0, 55)} → ${localPath}\n`)
      } else {
        notFound++
        if (num <= 40 || num % 100 === 0) {
          process.stdout.write(`  ✗ [${num}/${missing.length}] ${title.slice(0, 55)} (dl fail)\n`)
        }
      }
    } else {
      notFound++
      if (num <= 40 || num % 100 === 0) {
        process.stdout.write(`  - [${num}/${missing.length}] ${title.slice(0, 55)} (not found)\n`)
      }
    }

    // Save periodically
    if (num % 25 === 0) {
      await fs.writeFile(MAPPING_FILE, JSON.stringify(mapping, null, 2), "utf-8")
      console.log(`  ... ${found}/${num} found (sitemap: ${sitemapMatches}, page: ${pageMatches})`)
    }
  }

  await fs.writeFile(MAPPING_FILE, JSON.stringify(mapping, null, 2), "utf-8")

  console.log(`\n═══════════════════════════════════════════════`)
  console.log(`  Done!`)
  console.log(`  Sitemap matches: ${sitemapMatches}`)
  console.log(`  Page fetch matches: ${pageMatches}`)
  console.log(`  Total new: ${found}`)
  console.log(`  Still missing: ${notFound}`)
  console.log(`  Total mapped: ${Object.keys(mapping).length}/${usedSlugs.size}`)
  console.log(`═══════════════════════════════════════════════`)
}

main().catch(e => { console.error(e); process.exit(1) })
