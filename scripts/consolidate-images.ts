/**
 * consolidate-images.ts
 *
 * Runs all image download strategies in sequence, properly accumulating the mapping.
 * Combines: sitemap matching + SQL File table + kostmag.dk asset downloads + fuzzy matching
 *
 * Usage: npx tsx scripts/consolidate-images.ts
 */

import { promises as fs } from "fs"
import path from "path"
import crypto from "crypto"
import * as readline from "readline"
import { createReadStream } from "fs"
import matter from "gray-matter"

const SQL_FILE = path.join(process.cwd(), "kostmagasinet_dk-db-2026-02-06.sql")
const IMAGE_DIR = path.join(process.cwd(), "public", "vendor", "products")
const MAPPING_FILE = path.join(process.cwd(), "content", "product-images.json")
const PRODUKTER_DIR = path.join(process.cwd(), "src", "app", "(da)", "kosttilskud", "produkter")
const KOSTTILSKUD_DIR = path.join(process.cwd(), "src", "app", "(da)", "kosttilskud")
const BASE_URL = "https://www.kostmag.dk"

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))

function hashUrl(url: string): string {
  return crypto.createHash("sha1").update(url).digest("hex").slice(0, 12)
}

function normalize(s: string): string {
  return s.toLowerCase().replace(/[æ]/g, "ae").replace(/[ø]/g, "oe").replace(/[å]/g, "aa").replace(/[^a-z0-9]/g, "")
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

function parseInsertValues(line: string): string[][] {
  const rows: string[][] = []
  const valuesIdx = line.indexOf(" VALUES ")
  if (valuesIdx === -1) return rows
  let pos = valuesIdx + 8
  const len = line.length
  while (pos < len) {
    while (pos < len && line[pos] !== "(") pos++
    if (pos >= len) break
    pos++
    const row: string[] = []
    while (pos < len && line[pos] !== ")") {
      while (pos < len && line[pos] === " ") pos++
      if (line[pos] === "'") {
        pos++
        let val = ""
        while (pos < len) {
          if (line[pos] === "\\" && pos + 1 < len) { pos++; val += line[pos] }
          else if (line[pos] === "'" && line[pos + 1] === "'") { val += "'"; pos++ }
          else if (line[pos] === "'") { pos++; break }
          else val += line[pos]
          pos++
        }
        row.push(val)
      } else if (line.slice(pos, pos + 4) === "NULL") { row.push(""); pos += 4 }
      else {
        let val = ""
        while (pos < len && line[pos] !== "," && line[pos] !== ")") { val += line[pos]; pos++ }
        row.push(val.trim())
      }
      if (pos < len && line[pos] === ",") pos++
    }
    if (pos < len) pos++
    if (pos < len && (line[pos] === "," || line[pos] === ";")) pos++
    if (row.length > 0) rows.push(row)
  }
  return rows
}

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
    } catch {}
  }
  return slugs
}

interface SitemapEntry { slug: string; imageUrl: string; norm: string }

async function parseSitemap(url: string): Promise<SitemapEntry[]> {
  try {
    const res = await fetch(url, { headers: { "User-Agent": UA } })
    if (!res.ok) return []
    const xml = await res.text()
    const entries: SitemapEntry[] = []
    const blocks = xml.match(/<url>[\s\S]*?<\/url>/gi) || []
    for (const block of blocks) {
      const loc = block.match(/<loc>\s*(.*?)\s*<\/loc>/i)?.[1] || ""
      const img = block.match(/<image:loc>\s*(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?\s*<\/image:loc>/i)?.[1] || ""
      const slug = loc.split("/").pop()?.split("?")[0] || ""
      if (slug && img && img.length > 15) {
        entries.push({ slug, imageUrl: img.replace("test.healthwell.com", "www.healthwell.dk"), norm: normalize(slug) })
      }
    }
    return entries
  } catch { return [] }
}

async function main() {
  console.log("═══════════════════════════════════════════════")
  console.log("  CONSOLIDATED Image Downloader")
  console.log("═══════════════════════════════════════════════\n")

  // Start fresh - existing entries that have valid files stay
  let mapping: Record<string, string> = {}
  try { mapping = JSON.parse(await fs.readFile(MAPPING_FILE, "utf-8")) } catch {}
  
  // Validate existing entries - keep only those with actual files
  let validCount = 0
  for (const [slug, localPath] of Object.entries(mapping)) {
    try {
      await fs.access(path.join(process.cwd(), "public", localPath))
      validCount++
    } catch {
      delete mapping[slug]
    }
  }
  console.log(`  Validated existing: ${validCount} (removed ${Object.keys(mapping).length === validCount ? 0 : "some"} broken)`)

  const usedSlugs = await findUsedProductSlugs()
  console.log(`  Products in use: ${usedSlugs.size}`)
  console.log(`  Currently mapped: ${[...usedSlugs].filter(s => mapping[s]).length}`)

  // Load all product titles
  const titles: Record<string, string> = {}
  for (const slug of usedSlugs) {
    try {
      const raw = await fs.readFile(path.join(PRODUKTER_DIR, slug, "content.mdx"), "utf-8")
      titles[slug] = matter(raw).data.title || slug
    } catch { titles[slug] = slug.replace(/-/g, " ") }
  }

  // ═══════ PHASE 1: Parse SQL dump for File table entries ═══════
  console.log("\n  Phase 1: Parsing SQL File table...")
  const allFiles: { filename: string; name: string; norm: string }[] = []
  const siteTreeSlug: Record<number, string> = {}

  const rl = readline.createInterface({
    input: createReadStream(SQL_FILE, { encoding: "utf-8" }),
    crlfDelay: Infinity,
  })

  for await (const line of rl) {
    if (line.startsWith("INSERT INTO `File`")) {
      const rows = parseInsertValues(line)
      for (const row of rows) {
        const className = row[1] || ""
        const name = row[4] || ""
        const filename = row[6] || ""
        if ((className === "Image" || className === "Image_Cached") && filename.match(/\.(jpg|png|jpeg|webp|gif)/i)) {
          const baseName = name.replace(/\.\w+$/, "").toLowerCase()
          allFiles.push({ filename, name: baseName, norm: normalize(baseName) })
        }
      }
    }
    if (line.startsWith("INSERT INTO `SiteTree_Live`") || line.startsWith("INSERT INTO `SiteTree` VALUES")) {
      const rows = parseInsertValues(line)
      for (const row of rows) {
        const id = parseInt(row[0])
        const className = row[1] || ""
        const urlSegment = row[4] || ""
        if (id && className === "ProductPage" && urlSegment) {
          siteTreeSlug[id] = urlSegment
        }
      }
    }
  }
  console.log(`  DB files: ${allFiles.length}, Product slugs in DB: ${Object.keys(siteTreeSlug).length}`)

  // ═══════ PHASE 2: Load sitemaps ═══════
  console.log("  Phase 2: Loading sitemaps...")
  const hwEntries = await parseSitemap("https://www.healthwell.dk/sitemap_products.xml")
  const cnEntries = await parseSitemap("https://www.corenutrition.dk/sitemap_products.xml")
  const allSitemap = [...hwEntries, ...cnEntries]
  console.log(`  Sitemap entries: ${allSitemap.length}`)

  // ═══════ PHASE 3: Process ALL missing products ═══════
  const missing = [...usedSlugs].filter(s => !mapping[s])
  console.log(`\n  Phase 3: Processing ${missing.length} missing products...\n`)

  let found = 0

  for (let i = 0; i < missing.length; i++) {
    const slug = missing[i]
    if (mapping[slug]) continue
    const title = titles[slug] || slug
    const normSlug = normalize(slug)
    let imageUrl: string | null = null

    // Strategy A: Exact DB filename match
    const exactFile = allFiles.find(f => f.norm === normSlug)
    if (exactFile) imageUrl = `${BASE_URL}/${exactFile.filename}`

    // Strategy B: Partial DB filename match (slug contains name or vice versa)
    if (!imageUrl) {
      const partial = allFiles.find(f =>
        f.norm.length > 5 && normSlug.length > 5 &&
        (normSlug.includes(f.norm) || f.norm.includes(normSlug)) &&
        Math.abs(f.norm.length - normSlug.length) < 20
      )
      if (partial) imageUrl = `${BASE_URL}/${partial.filename}`
    }

    // Strategy C: Title-based DB match
    if (!imageUrl) {
      const normTitle = normalize(title)
      const titleWords = title.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim().split(" ").filter(w => w.length > 3)
      if (titleWords.length >= 2) {
        const titleFile = allFiles.find(f => {
          const nameWords = f.name.replace(/[^a-z0-9]+/g, " ").trim().split(" ")
          const matches = titleWords.filter(w => nameWords.some(n => n.includes(w) || w.includes(n)))
          return matches.length >= Math.min(2, titleWords.length)
        })
        if (titleFile) imageUrl = `${BASE_URL}/${titleFile.filename}`
      }
    }

    // Strategy D: Sitemap match
    if (!imageUrl) {
      const slugVariants = [
        normSlug,
        normalize(slug.replace(/^healthwell-/, "")),
        normalize(slug.replace(/^core-/, "")),
        normalize(slug.replace(/^star-nutrition-/, "")),
        normalize(slug.replace(/^body-science-/, "")),
        normalize(slug.replace(/^better-you-/, "")),
        normalize(slug.replace(/^weight-world-/, "")),
      ]
      const match = allSitemap.find(e =>
        slugVariants.some(sv => sv && (e.norm === sv || (sv.length > 6 && e.norm.length > 6 && (e.norm.includes(sv) || sv.includes(e.norm)))))
      )
      if (match) imageUrl = match.imageUrl
    }

    // Strategy E: Direct kostmag.dk paths
    if (!imageUrl) {
      for (const ext of [".jpg", ".png", ".jpeg"]) {
        try {
          const res = await fetch(`${BASE_URL}/assets/ProductImages/${slug}${ext}`, { method: "HEAD", headers: { "User-Agent": UA } })
          if (res.ok && (res.headers.get("content-type") || "").includes("image")) {
            imageUrl = `${BASE_URL}/assets/ProductImages/${slug}${ext}`
            break
          }
        } catch {}
      }
      if (!imageUrl) await sleep(100)
    }

    // Strategy F: Try kostmag.dk/assets/ProductCarouselImages
    if (!imageUrl) {
      for (const suffix of ["-1.jpg", "-1.png", ".jpg", ".png"]) {
        try {
          const res = await fetch(`${BASE_URL}/assets/ProductCarouselImages/${slug}${suffix}`, { method: "HEAD", headers: { "User-Agent": UA } })
          if (res.ok && (res.headers.get("content-type") || "").includes("image")) {
            imageUrl = `${BASE_URL}/assets/ProductCarouselImages/${slug}${suffix}`
            break
          }
        } catch {}
      }
    }

    // Strategy G: Direct product page on stores (og:image / JSON-LD)
    if (!imageUrl) {
      const cleanSlug = slug.replace(/^healthwell-/, "")
      for (const storeBase of ["https://www.healthwell.dk", "https://www.corenutrition.dk"]) {
        try {
          const res = await fetch(`${storeBase}/${cleanSlug}`, {
            headers: { "User-Agent": UA, "Accept": "text/html" },
            redirect: "follow",
          })
          if (res.ok) {
            const html = await res.text()
            // JSON-LD
            const jsonBlocks = html.match(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi)
            if (jsonBlocks) {
              for (const block of jsonBlocks) {
                try {
                  const obj = JSON.parse(block.replace(/<[^>]+>/g, ""))
                  const prod = obj["@type"] === "Product" ? obj : obj["@graph"]?.find?.((n: any) => n["@type"] === "Product")
                  if (prod?.image) {
                    const img = typeof prod.image === "string" ? prod.image : Array.isArray(prod.image) ? prod.image[0] : prod.image?.url
                    if (img && typeof img === "string" && img.length > 20) { imageUrl = img; break }
                  }
                } catch {}
              }
            }
            if (!imageUrl) {
              const og = html.match(/property="og:image"\s*content="([^"]{20,})"/i)?.[1]
              if (og) imageUrl = og
            }
          }
        } catch {}
        if (imageUrl) break
        await sleep(150)
      }
    }

    if (imageUrl) {
      const localPath = await downloadImage(imageUrl)
      if (localPath) {
        mapping[slug] = localPath
        found++
        process.stdout.write(`  ✓ [${i + 1}/${missing.length}] ${title.slice(0, 55)}\n`)
      }
    }

    // Save periodically
    if ((i + 1) % 50 === 0) {
      await fs.writeFile(MAPPING_FILE, JSON.stringify(mapping, null, 2), "utf-8")
      const mappedCount = [...usedSlugs].filter(s => mapping[s]).length
      console.log(`  ... progress: ${mappedCount}/${usedSlugs.size} mapped`)
    }
  }

  await fs.writeFile(MAPPING_FILE, JSON.stringify(mapping, null, 2), "utf-8")

  const finalMapped = [...usedSlugs].filter(s => mapping[s]).length
  const finalMissing = [...usedSlugs].filter(s => !mapping[s])

  console.log(`\n═══════════════════════════════════════════════`)
  console.log(`  Done!`)
  console.log(`  New images this run: ${found}`)
  console.log(`  Total mapped: ${finalMapped}/${usedSlugs.size} (${(100 * finalMapped / usedSlugs.size).toFixed(1)}%)`)
  console.log(`  Still missing: ${finalMissing.length}`)
  if (finalMissing.length > 0 && finalMissing.length <= 20) {
    console.log(`  Missing products:`)
    for (const s of finalMissing) console.log(`    - ${s}: ${titles[s]}`)
  }
  console.log(`═══════════════════════════════════════════════`)
}

main().catch(e => { console.error(e); process.exit(1) })
