/**
 * download-missing-images.ts  (v3 — search-based)
 *
 * For every product still missing an image we:
 *   1. Detect which store it most likely belongs to (brand→store map)
 *   2. Search that store for the product name
 *   3. Extract the product image from the search results / product page
 *   4. Fall back to the next store if the first one fails
 *
 * This is MUCH more reliable than guessing URLs because stores have
 * their own URL slug conventions that don't match our slugs.
 *
 * Usage: npx tsx scripts/download-missing-images.ts
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

// ─── Store search URL templates ───
// Each store has a search endpoint. We fetch the search results page
// and extract product images from it — one request per product per store.
interface StoreSearch {
  id: string
  searchUrl: (query: string) => string
  /** Extract the first product image URL from the search results HTML */
  extractImage: (html: string, baseUrl: string) => string | null
}

function resolveUrl(base: string, relative: string): string {
  if (!relative || typeof relative !== "string") return ""
  if (relative.startsWith("http")) return relative
  if (relative.startsWith("//")) return "https:" + relative
  try { return new URL(relative, base).toString() } catch { return relative }
}

const STORES: StoreSearch[] = [
  {
    id: "healthwell",
    searchUrl: (q) => `https://www.healthwell.dk/soeg?q=${encodeURIComponent(q)}`,
    extractImage: (html, base) => {
      // Healthwell search results have product cards with images
      const m = html.match(/class="[^"]*product[^"]*"[\s\S]*?<img[^>]*src="([^"]{20,})"/i) ||
                html.match(/<img[^>]*class="[^"]*product[^"]*"[^>]*src="([^"]{20,})"/i) ||
                html.match(/<img[^>]*data-src="([^"]{20,}(?:\.jpg|\.png|\.webp)[^"]*)"/i) ||
                html.match(/<img[^>]*src="(\/media\/catalog[^"]+)"/i) ||
                html.match(/<img[^>]*src="(https:\/\/[^"]*healthwell[^"]*(?:\.jpg|\.png|\.webp)[^"]*)"/i)
      return m?.[1] ? resolveUrl(base, m[1]) : null
    },
  },
  {
    id: "bodylab",
    searchUrl: (q) => `https://www.bodylab.dk/shop/search.html?search=${encodeURIComponent(q)}`,
    extractImage: (html, base) => {
      // Bodylab search results
      const m = html.match(/<img[^>]*class="[^"]*product[^"]*"[^>]*src="([^"]{20,})"/i) ||
                html.match(/<img[^>]*src="(https:\/\/[^"]*bodylab[^"]*\/images\/[^"]+)"/i) ||
                html.match(/<img[^>]*data-src="([^"]{20,}(?:\.jpg|\.png|\.webp)[^"]*)"/i) ||
                html.match(/<a[^>]*href="\/shop\/[^"]*"[\s\S]*?<img[^>]*src="([^"]{20,})"/i)
      return m?.[1] ? resolveUrl(base, m[1]) : null
    },
  },
  {
    id: "mmsports",
    searchUrl: (q) => `https://www.mmsportsstore.dk/search?q=${encodeURIComponent(q)}`,
    extractImage: (html, base) => {
      const m = html.match(/<img[^>]*class="[^"]*product[^"]*"[^>]*src="([^"]{20,})"/i) ||
                html.match(/<img[^>]*data-src="([^"]{20,}(?:\.jpg|\.png|\.webp)[^"]*)"/i) ||
                html.match(/<img[^>]*src="([^"]{20,}(?:\.jpg|\.png|\.webp)(?:\?[^"]*)?)"/i)
      return m?.[1] ? resolveUrl(base, m[1]) : null
    },
  },
  {
    id: "med24",
    searchUrl: (q) => `https://www.med24.dk/catalogsearch/result/?q=${encodeURIComponent(q)}`,
    extractImage: (html, base) => {
      const m = html.match(/<img[^>]*class="[^"]*product[^"]*"[^>]*src="([^"]{20,})"/i) ||
                html.match(/<img[^>]*src="(https:\/\/[^"]*med24[^"]*(?:\.jpg|\.png|\.webp)[^"]*)"/i) ||
                html.match(/<img[^>]*src="([^"]{20,}(?:\.jpg|\.png|\.webp)(?:\?[^"]*)?)"/i)
      return m?.[1] ? resolveUrl(base, m[1]) : null
    },
  },
  {
    id: "corenutrition",
    searchUrl: (q) => `https://www.corenutrition.dk/search?q=${encodeURIComponent(q)}`,
    extractImage: (html, base) => {
      const m = html.match(/<img[^>]*class="[^"]*product[^"]*"[^>]*src="([^"]{20,})"/i) ||
                html.match(/<img[^>]*data-src="([^"]{20,}(?:\.jpg|\.png|\.webp)[^"]*)"/i) ||
                html.match(/<img[^>]*src="([^"]{20,}(?:\.jpg|\.png|\.webp)(?:\?[^"]*)?)"/i)
      return m?.[1] ? resolveUrl(base, m[1]) : null
    },
  },
  {
    id: "weightworld",
    searchUrl: (q) => `https://www.weightworld.dk/search?q=${encodeURIComponent(q)}`,
    extractImage: (html, base) => {
      const m = html.match(/<img[^>]*class="[^"]*product[^"]*"[^>]*src="([^"]{20,})"/i) ||
                html.match(/<img[^>]*data-src="([^"]{20,}(?:\.jpg|\.png|\.webp)[^"]*)"/i) ||
                html.match(/<img[^>]*src="([^"]{20,}(?:\.jpg|\.png|\.webp)(?:\?[^"]*)?)"/i)
      return m?.[1] ? resolveUrl(base, m[1]) : null
    },
  },
]

// ─── Brand → preferred store IDs (tried in order) ───
const BRAND_STORE_PRIORITY: Record<string, string[]> = {
  "healthwell": ["healthwell"],
  "core": ["corenutrition", "healthwell"],
  "bodylab": ["bodylab"],
  "body science": ["bodylab", "mmsports"],
  "star nutrition": ["bodylab", "mmsports"],
  "better you": ["bodylab", "healthwell"],
  "swedish supplements": ["bodylab", "mmsports"],
  "mm sports": ["mmsports"],
  "thorne": ["healthwell"],
  "solgar": ["healthwell", "med24"],
  "rawpowder": ["healthwell"],
  "now foods": ["healthwell"],
  "weight world": ["weightworld"],
  "weightworld": ["weightworld"],
  "optimum nutrition": ["bodylab"],
  "myprotein": ["bodylab"],
  "holistic": ["healthwell"],
  "puori": ["healthwell"],
  "great earth": ["healthwell"],
  "terranova": ["healthwell", "med24"],
  "nordic naturals": ["healthwell"],
  "life extension": ["healthwell"],
  "jarrow": ["healthwell"],
  "garden of life": ["healthwell"],
  "vital proteins": ["healthwell"],
  "nutramino": ["bodylab"],
  "olimp": ["bodylab"],
  "scitec": ["bodylab"],
  "bsn": ["bodylab"],
  "applied nutrition": ["bodylab"],
  "gasp": ["mmsports"],
  "nocco": ["bodylab"],
  "fitnessguru": ["bodylab", "mmsports"],
  "gymstick": ["mmsports"],
  "casall": ["healthwell"],
  "iron gym": ["mmsports"],
  "barebells": ["bodylab"],
  "chained nutrition": ["mmsports"],
  "xlnt sports": ["mmsports"],
  "under armour": ["mmsports"],
  "titan life": ["mmsports"],
  "beurer": ["healthwell", "med24"],
  "flowlife": ["healthwell"],
  "4 her": ["bodylab", "mmsports"],
  "4 him": ["bodylab", "mmsports"],
  "delta nutrition": ["mmsports"],
  "viking power": ["mmsports"],
  "pharma nord": ["healthwell", "med24"],
  "elexir pharma": ["healthwell", "med24"],
  "new nordic": ["med24", "healthwell"],
  "mutant": ["bodylab"],
  "allevo": ["bodylab"],
  "pureness": ["bodylab", "healthwell"],
  "celsius": ["bodylab"],
  "active care": ["healthwell", "med24"],
  "natur-drogeriet": ["med24"],
  "a vogel": ["med24"],
  "micro whey": ["bodylab"],
  "diet": ["mmsports", "bodylab"],
  "skip": ["mmsports"],
  "raw": ["mmsports"],
  "wnt": ["mmsports", "bodylab"],
  "matters": ["healthwell"],
  "shakti": ["healthwell"],
  "nyttoteket": ["healthwell"],
  "kiki health": ["healthwell"],
  "mother earth": ["healthwell"],
  "bi-pro": ["med24"],
  "allergica": ["med24"],
  "pukka": ["med24", "healthwell"],
  "superfruit": ["healthwell"],
  "dragon superfoods": ["healthwell"],
  "kal": ["med24", "healthwell"],
  "helt ärligt": ["bodylab", "mmsports"],
  "pro brands": ["bodylab"],
  "nobe": ["bodylab"],
  "biosym": ["med24"],
  "refit": ["mmsports"],
  "swedish posture": ["mmsports", "healthwell"],
  "power": ["bodylab", "mmsports"],
  "cln athletics": ["mmsports"],
  "bjoern borg": ["mmsports"],
  "björn borg": ["mmsports"],
  "bb": ["mmsports"],
  "qure": ["healthwell", "med24"],
  "linnex": ["med24"],
  "nordbo": ["healthwell", "med24"],
  "b-well": ["med24", "healthwell"],
  "bala": ["mmsports"],
  "theraband": ["mmsports"],
  "abilica": ["mmsports"],
  "self omninutrition": ["mmsports", "bodylab"],
  "jnx sports": ["bodylab", "mmsports"],
  "m-nutrition": ["mmsports"],
}

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
    try { await fs.access(file); return localPath } catch { /* download */ }
    const res = await fetch(url, { headers: { "User-Agent": UA }, redirect: "follow" })
    if (!res.ok) return null
    const buf = Buffer.from(await res.arrayBuffer())
    if (buf.length < 500) return null
    await fs.writeFile(file, buf)
    return localPath
  } catch { return null }
}

function detectBrand(title: string): string {
  const lower = title.toLowerCase()
  const brands = Object.keys(BRAND_STORE_PRIORITY).sort((a, b) => b.length - a.length)
  for (const brand of brands) {
    if (lower.startsWith(brand)) return brand
  }
  return title.split(/\s+/)[0].toLowerCase()
}

/** Clean product name for search: remove "Healthwell" store prefix, special chars etc. */
function cleanSearchQuery(title: string): string {
  return title
    // Remove "Healthwell" prefix (it's the store name, not the brand)
    .replace(/^Healthwell\s+/i, "")
    // Remove weight/pack size for better search
    .replace(/\s*[-–]\s*\d+\s*(g|kg|ml|l|stk|kapsler|tabletter|caps|tab)\b.*$/i, "")
    // Remove special chars
    .replace(/[ØÆÅøæå]/g, m => ({ Ø: "O", Æ: "AE", Å: "A", ø: "o", æ: "ae", å: "a" }[m] || m))
    .trim()
}

// ─── Search a store for a product image ───
async function searchStoreForImage(store: StoreSearch, productTitle: string): Promise<string | null> {
  const query = cleanSearchQuery(productTitle)
  if (!query || query.length < 3) return null

  const url = store.searchUrl(query)
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": UA, "Accept": "text/html,*/*" },
      redirect: "follow",
    })
    if (!res.ok) return null
    const html = await res.text()
    return store.extractImage(html, url.split("/").slice(0, 3).join("/"))
  } catch { return null }
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
  console.log("  Missing Product Image Downloader (v3 search)")
  console.log("═══════════════════════════════════════════════\n")

  let mapping: Record<string, string> = {}
  try {
    mapping = JSON.parse(await fs.readFile(MAPPING_FILE, "utf-8"))
    console.log(`  Existing mapping: ${Object.keys(mapping).length} products`)
  } catch { /* no mapping */ }

  const usedSlugs = await findUsedProductSlugs()
  const missing = [...usedSlugs].filter(s => !mapping[s])
  console.log(`  Total products: ${usedSlugs.size}`)
  console.log(`  Missing images: ${missing.length}\n`)

  if (missing.length === 0) { console.log("  All done!"); return }

  let found = 0
  let notFound = 0

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

    // Detect brand → get store priority
    const brand = detectBrand(title)
    const priorityIds = BRAND_STORE_PRIORITY[brand] || ["healthwell", "bodylab", "mmsports", "med24"]

    // Build ordered store list
    const orderedStores: StoreSearch[] = []
    for (const id of priorityIds) {
      const s = STORES.find(s => s.id === id)
      if (s) orderedStores.push(s)
    }
    // Add remaining stores not in priority
    for (const s of STORES) {
      if (!orderedStores.includes(s)) orderedStores.push(s)
    }

    let imageUrl: string | null = null

    // Try each store's search
    for (const store of orderedStores) {
      imageUrl = await searchStoreForImage(store, title)
      if (imageUrl && imageUrl.length > 20) break
      imageUrl = null
      await sleep(150) // polite delay between stores
    }

    if (imageUrl) {
      const localPath = await downloadImage(imageUrl)
      if (localPath) {
        mapping[slug] = localPath
        found++
        process.stdout.write(`  ✓ [${num}/${missing.length}] ${title.slice(0, 55)} → ${localPath}\n`)
      } else {
        notFound++
        if (num <= 40 || num % 50 === 0) {
          process.stdout.write(`  ✗ [${num}/${missing.length}] ${title.slice(0, 55)} (dl fail)\n`)
        }
      }
    } else {
      notFound++
      if (num <= 40 || num % 50 === 0) {
        process.stdout.write(`  - [${num}/${missing.length}] ${title.slice(0, 55)} (not found)\n`)
      }
    }

    // Save every 25 products
    if (num % 25 === 0) {
      await fs.writeFile(MAPPING_FILE, JSON.stringify(mapping, null, 2), "utf-8")
      console.log(`  ... progress: ${found}/${num} found`)
    }
  }

  await fs.writeFile(MAPPING_FILE, JSON.stringify(mapping, null, 2), "utf-8")

  console.log(`\n═══════════════════════════════════════════════`)
  console.log(`  Done!`)
  console.log(`  New images: ${found}`)
  console.log(`  Still missing: ${notFound}`)
  console.log(`  Total mapped: ${Object.keys(mapping).length}/${usedSlugs.size}`)
  console.log(`═══════════════════════════════════════════════`)
}

main().catch(e => { console.error(e); process.exit(1) })
