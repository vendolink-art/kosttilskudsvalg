/**
 * final-image-pass.ts
 *
 * Last resort pass to find images for remaining ~213 products.
 * Tries multiple aggressive strategies:
 *   1. Broader filename matching against ALL 12,000+ File table entries  
 *   2. Try all assets/ paths on kostmag.dk (ProductImages + AboutTestImage + Banners)
 *   3. CoreNutrition sitemap with aggressive fuzzy matching
 *   4. Healthwell sitemap with aggressive fuzzy matching
 *
 * Usage: npx tsx scripts/final-image-pass.ts
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
  console.log("  Final Image Pass — Aggressive Matching")
  console.log("═══════════════════════════════════════════════\n")

  let mapping: Record<string, string> = {}
  try {
    mapping = JSON.parse(await fs.readFile(MAPPING_FILE, "utf-8"))
    console.log(`  Existing mapping: ${Object.keys(mapping).length} products`)
  } catch { /* none */ }

  const usedSlugs = await findUsedProductSlugs()
  const missing = [...usedSlugs].filter(s => !mapping[s])
  console.log(`  Still missing: ${missing.length}\n`)

  if (missing.length === 0) { console.log("  All done!"); return }

  // Load product titles for all missing
  const productTitles: Record<string, string> = {}
  for (const slug of missing) {
    try {
      const raw = await fs.readFile(path.join(PRODUKTER_DIR, slug, "content.mdx"), "utf-8")
      const { data } = matter(raw)
      productTitles[slug] = data.title || slug
    } catch {
      productTitles[slug] = slug.replace(/-/g, " ")
    }
  }

  // Strategy 1: Load ALL File entries from SQL dump
  console.log("  Loading ALL File entries from SQL...")
  const allFiles: { id: number; filename: string; name: string; norm: string }[] = []
  
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

  const rl = readline.createInterface({
    input: createReadStream(SQL_FILE, { encoding: "utf-8" }),
    crlfDelay: Infinity,
  })

  for await (const line of rl) {
    if (line.startsWith("INSERT INTO `File`")) {
      const rows = parseInsertValues(line)
      for (const row of rows) {
        const id = parseInt(row[0])
        const className = row[1] || ""
        const name = row[4] || ""
        const filename = row[6] || ""
        if (id && (className === "Image" || className === "Image_Cached") && filename.match(/\.(jpg|png|jpeg|webp|gif)/i)) {
          const baseName = name.replace(/\.\w+$/, "").toLowerCase()
          allFiles.push({ id, filename, name: baseName, norm: normalize(baseName) })
        }
      }
    }
  }

  console.log(`  Total image files in DB: ${allFiles.length}`)

  // Strategy 2: Load sitemaps
  console.log("  Loading sitemaps...")
  const hwEntries = await parseSitemap("https://www.healthwell.dk/sitemap_products.xml")
  const cnEntries = await parseSitemap("https://www.corenutrition.dk/sitemap_products.xml")
  const allSitemap = [...hwEntries, ...cnEntries]
  console.log(`  Sitemap entries: ${allSitemap.length}`)

  let found = 0
  let notFound = 0

  for (let i = 0; i < missing.length; i++) {
    const slug = missing[i]
    if (mapping[slug]) continue
    
    const title = productTitles[slug]
    const normSlug = normalize(slug)
    const normTitle = normalize(title)
    const num = i + 1
    let imageUrl: string | null = null
    let source = ""

    // Strategy A: Exact file name match in DB
    const exactFile = allFiles.find(f => f.norm === normSlug)
    if (exactFile) {
      imageUrl = `${BASE_URL}/${exactFile.filename}`
      source = "DB-exact"
    }

    // Strategy B: Partial slug match in DB (slug contains filename or vice versa)
    if (!imageUrl) {
      const partialFile = allFiles.find(f =>
        f.norm.length > 5 && normSlug.length > 5 &&
        (normSlug.includes(f.norm) || f.norm.includes(normSlug)) &&
        Math.abs(f.norm.length - normSlug.length) < 15
      )
      if (partialFile) {
        imageUrl = `${BASE_URL}/${partialFile.filename}`
        source = "DB-partial"
      }
    }

    // Strategy C: Title-based match in DB files
    if (!imageUrl) {
      const titleWords = title.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim().split(" ").filter(w => w.length > 3)
      if (titleWords.length >= 2) {
        const titleFile = allFiles.find(f => {
          const nameWords = f.name.replace(/[^a-z0-9]+/g, " ").trim().split(" ")
          const matches = titleWords.filter(w => nameWords.some(n => n.includes(w) || w.includes(n)))
          return matches.length >= 2
        })
        if (titleFile) {
          imageUrl = `${BASE_URL}/${titleFile.filename}`
          source = "DB-title"
        }
      }
    }

    // Strategy D: Sitemap fuzzy match
    if (!imageUrl) {
      // Strip brand prefix from slug for matching
      const slugWithoutBrand = slug
        .replace(/^healthwell-/, "")
        .replace(/^core-/, "")
        .replace(/^star-nutrition-/, "")
        .replace(/^body-science-/, "")
        .replace(/^better-you-/, "")
        .replace(/^weight-world-/, "")
        .replace(/^swedish-supplements-/, "")
        .replace(/^rawpowder-/, "")
      const normWithout = normalize(slugWithoutBrand)
      
      const match = allSitemap.find(e =>
        e.norm === normWithout ||
        e.norm === normSlug ||
        (e.norm.length > 5 && normWithout.length > 5 && (e.norm.includes(normWithout) || normWithout.includes(e.norm)))
      )
      if (match) {
        imageUrl = match.imageUrl
        source = "sitemap"
      }
    }

    // Strategy E: Try direct kostmag.dk paths
    if (!imageUrl) {
      const tryPaths = [
        `assets/ProductImages/${slug}.jpg`,
        `assets/ProductImages/${slug}.png`,
        `assets/ProductImages/${slug}.jpeg`,
        `assets/ProductCarouselImages/${slug}-1.jpg`,
        `assets/ProductCarouselImages/${slug}-1.png`,
      ]
      for (const p of tryPaths) {
        try {
          const res = await fetch(`${BASE_URL}/${p}`, { method: "HEAD", headers: { "User-Agent": UA } })
          if (res.ok) {
            const ct = res.headers.get("content-type") || ""
            if (ct.includes("image")) {
              imageUrl = `${BASE_URL}/${p}`
              source = "direct-path"
              break
            }
          }
        } catch { /* skip */ }
      }
      if (!imageUrl) await sleep(100)
    }

    if (imageUrl) {
      const localPath = await downloadImage(imageUrl)
      if (localPath) {
        mapping[slug] = localPath
        found++
        process.stdout.write(`  ✓ [${num}/${missing.length}] ${title.slice(0, 50)} (${source})\n`)
      } else {
        notFound++
        if (num <= 20 || num % 50 === 0) {
          process.stdout.write(`  ✗ [${num}/${missing.length}] ${title.slice(0, 50)} (dl fail)\n`)
        }
      }
    } else {
      notFound++
      if (num <= 20 || num % 50 === 0) {
        process.stdout.write(`  - [${num}/${missing.length}] ${title.slice(0, 50)}\n`)
      }
    }

    if (num % 25 === 0) {
      await fs.writeFile(MAPPING_FILE, JSON.stringify(mapping, null, 2), "utf-8")
      console.log(`  ... ${found}/${num}`)
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
