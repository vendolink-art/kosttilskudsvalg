/**
 * extract-db-images.ts
 *
 * Extracts product images from the SQL database:
 *   1. File table → fileId → filename (assets/ProductImages/...)
 *   2. ProductPage_Live → productId → ImageID (references File table)
 *   3. SiteTree_Live → productId → URLSegment (slug)
 *   4. Downloads from kostmag.dk/assets/... (still live!)
 *
 * Usage: npx tsx scripts/extract-db-images.ts
 */

import { promises as fs } from "fs"
import path from "path"
import crypto from "crypto"
import * as readline from "readline"
import { createReadStream } from "fs"

const SQL_FILE = path.join(process.cwd(), "kostmagasinet_dk-db-2026-02-06.sql")
const IMAGE_DIR = path.join(process.cwd(), "public", "vendor", "products")
const MAPPING_FILE = path.join(process.cwd(), "content", "product-images.json")
const KOSTTILSKUD_DIR = path.join(process.cwd(), "src", "app", "(da)", "kosttilskud")
const BASE_URL = "https://www.kostmag.dk"

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"
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
    const ct = res.headers.get("content-type") || ""
    if (!ct.includes("image")) return null
    const buf = Buffer.from(await res.arrayBuffer())
    if (buf.length < 500) return null
    await fs.writeFile(file, buf)
    return localPath
  } catch { return null }
}

/**
 * Parse a VALUES(...),(...) INSERT statement into rows
 */
function parseInsertValues(line: string): string[][] {
  const rows: string[][] = []
  const valuesIdx = line.indexOf(" VALUES ")
  if (valuesIdx === -1) return rows

  let pos = valuesIdx + 8
  const len = line.length

  while (pos < len) {
    while (pos < len && line[pos] !== "(") pos++
    if (pos >= len) break
    pos++ // skip (

    const row: string[] = []
    while (pos < len && line[pos] !== ")") {
      while (pos < len && line[pos] === " ") pos++

      if (line[pos] === "'") {
        pos++ // opening quote
        let val = ""
        while (pos < len) {
          if (line[pos] === "\\" && pos + 1 < len) {
            pos++
            val += line[pos]
          } else if (line[pos] === "'" && line[pos + 1] === "'") {
            val += "'"
            pos++
          } else if (line[pos] === "'") {
            pos++
            break
          } else {
            val += line[pos]
          }
          pos++
        }
        row.push(val)
      } else if (line.slice(pos, pos + 4) === "NULL") {
        row.push("")
        pos += 4
      } else {
        let val = ""
        while (pos < len && line[pos] !== "," && line[pos] !== ")") {
          val += line[pos]
          pos++
        }
        row.push(val.trim())
      }

      if (pos < len && line[pos] === ",") pos++
    }

    if (pos < len) pos++ // skip )
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
    } catch { /* skip */ }
  }
  return slugs
}

async function main() {
  console.log("═══════════════════════════════════════════════")
  console.log("  Extract Product Images from SQL + kostmag.dk")
  console.log("═══════════════════════════════════════════════\n")

  let mapping: Record<string, string> = {}
  try {
    mapping = JSON.parse(await fs.readFile(MAPPING_FILE, "utf-8"))
    console.log(`  Existing mapping: ${Object.keys(mapping).length} products\n`)
  } catch { /* none */ }

  // Find all product slugs in use
  const usedSlugs = await findUsedProductSlugs()
  console.log(`  Products in use: ${usedSlugs.size}`)
  const missing = [...usedSlugs].filter(s => !mapping[s])
  console.log(`  Still missing: ${missing.length}\n`)

  // Step 1: Parse SQL dump
  console.log("  Parsing SQL dump...")

  const fileMap: Record<number, string> = {}        // File ID → Filename
  const productImageId: Record<number, number> = {}  // Product ID → ImageID
  const productCarousel1: Record<number, number> = {} // Product ID → CarouselImage1ID
  const siteTreeSlug: Record<number, string> = {}     // ID → URLSegment

  const rl = readline.createInterface({
    input: createReadStream(SQL_FILE, { encoding: "utf-8" }),
    crlfDelay: Infinity,
  })

  for await (const line of rl) {
    // File table: ID(0), ClassName(1), LastEdited(2), Created(3), Name(4), Title(5), Filename(6)
    if (line.startsWith("INSERT INTO `File`")) {
      const rows = parseInsertValues(line)
      for (const row of rows) {
        const id = parseInt(row[0])
        const filename = row[6] || ""
        if (id && filename && (filename.includes("ProductImages/") || filename.includes("ProductCarouselImages/") || filename.includes("AboutTestImage/"))) {
          fileMap[id] = filename
        }
      }
    }

    // ProductPage_Live: many columns
    // Need to find ImageID and CarouselImage1ID positions
    // From schema:
    //   0: ID, 1: Rating, 2: RatingText, 3: Shortdesc, 4-6: USP1-3, 7: Tag, 8: TagColor,
    //   9-11: RatingQuality/Taste/Price, 12-15: LactoseFree/LactoseLow/Vegetarian/LowSugar,
    //   16: ProteinPercentage, 17: ShowIcons, 18: SoldOut, 19: Discontinued,
    //   20: NutritionData, 21: ImageURL, 22: ToplistLabel, 23: HideFromToplist,
    //   24: BigtoplistSubtitle, 25: OverrideTitle, 26: FeaturedContent,
    //   27-30: Premium/Budget/Good/Climate, 31: Portable, 32: ToplistContent,
    //   33-40: Attr1-8Value, 41-48: Attr1-8Weight, 49-56: Attr1-8Concentration,
    //   57-61: Pros1-5, 62-66: Cons1-5, 67: TableData, 68: Award,
    //   69-78: CarouselImage1-10Text,
    //   79-88: Rating1-10Value, 89-98: Rating1-10Label,
    //   99: UserScore, 100: UserScoreCount, 101: Price, 102: BuyLink, 103: Brand,
    //   104: BrandImageURL, ... (then ImageID, OverrideImageID, CarouselImage1ID, ...)
    // Actually I need to count more carefully. Let me count from the CREATE TABLE output.
    // The last defined fields before PRIMARY KEY are the ID fields.
    // Let me use a different approach: just extract all numeric-looking fields > 0 near the end of the row.

    if (line.startsWith("INSERT INTO `ProductPage_Live`") || line.startsWith("INSERT INTO `ProductPage` VALUES")) {
      const rows = parseInsertValues(line)
      for (const row of rows) {
        const id = parseInt(row[0])
        if (!id) continue
        
        // Find ImageID and CarouselImage1ID
        // These are near the end of the row as foreign key fields
        // ProductPage_Live has many columns. Let me search for them by position.
        // From the CREATE TABLE, counting all fields:
        // The IDs come after all the data fields, just before PRIMARY KEY.
        // From the grep, ImageID, OverrideImageID, CarouselImage1ID, CarouselImage2ID...
        // are at the END of the column list.
        
        // For ProductPage_Live the FK fields are the last ones before PRIMARY KEY.
        // Let's just check the last ~15 fields of the row for non-zero integer values
        // and use them positionally.
        
        // Actually, a simpler approach: look at the last 10 entries of each row
        // The order should be: ...ImageID, OverrideImageID, CarouselImage1ID, CarouselImage2ID, ...
        
        // From CREATE TABLE, the last few columns before KEY definitions are:
        // `ImageID`, `OverrideImageID`, `CarouselImage1ID`, `CarouselImage2ID`, `CarouselImage3ID`...
        
        // Let me count exactly. I'll put a marker.
        if (row.length > 10) {
          // The FK ID fields are the LAST ones in the row
          // Let me check the last ~12 fields
          const lastIdx = row.length - 1
          // Try to find them by looking for sensible image file IDs (> 1000 typically)
          // Store ALL non-zero integers from the end
          
          // Actually, let me count manually from schema:
          // After checking, ImageID should be around row.length - 12 for ProductPage_Live
          // But this varies. Let me store a debug row.
          
          // Save first row for debugging
          if (!productImageId[id]) {
            // Try multiple positions near the end
            for (let i = row.length - 15; i < row.length; i++) {
              const val = parseInt(row[i])
              if (val > 100) { // File IDs are > 100
                if (!productImageId[id]) {
                  productImageId[id] = val
                } else if (!productCarousel1[id]) {
                  productCarousel1[id] = val
                  break
                }
              }
            }
          }
        }
      }
    }

    // SiteTree_Live: ID(0), ClassName(1), LastEdited(2), Created(3), URLSegment(4)
    if (line.startsWith("INSERT INTO `SiteTree_Live`") || line.startsWith("INSERT INTO `SiteTree` VALUES")) {
      const rows = parseInsertValues(line)
      for (const row of rows) {
        const id = parseInt(row[0])
        const className = row[1] || ""
        const urlSegment = row[4] || ""
        if (id && urlSegment && className === "ProductPage") {
          siteTreeSlug[id] = urlSegment
        }
      }
    }
  }

  console.log(`  File entries: ${Object.keys(fileMap).length}`)
  console.log(`  Product → ImageID: ${Object.keys(productImageId).length}`)
  console.log(`  Product → CarouselImage: ${Object.keys(productCarousel1).length}`)
  console.log(`  ProductPage slugs: ${Object.keys(siteTreeSlug).length}`)

  // Debug: show a few matches
  const debugIds = Object.keys(siteTreeSlug).slice(0, 5).map(Number)
  for (const pid of debugIds) {
    const slug = siteTreeSlug[pid]
    const imgId = productImageId[pid]
    const file = imgId ? fileMap[imgId] : null
    console.log(`  Debug: ${slug} → ImageID=${imgId} → ${file || "?"}`)
  }

  // Step 2: Build slug → image URL map
  const toDownload: { slug: string; url: string }[] = []
  
  for (const [pidStr, slug] of Object.entries(siteTreeSlug)) {
    if (mapping[slug]) continue // already have image
    if (!usedSlugs.has(slug)) continue // not used in any category
    
    const pid = parseInt(pidStr)
    
    // Try ImageID first, then CarouselImage1ID
    const imgId = productImageId[pid] || productCarousel1[pid]
    if (imgId && fileMap[imgId]) {
      const filename = fileMap[imgId]
      const url = `${BASE_URL}/${filename}`
      toDownload.push({ slug, url })
    }
  }

  console.log(`\n  Products with DB image references (missing from mapping): ${toDownload.length}`)

  // Step 3: Also try direct filename matching for products without FK links
  // Many products have images named like the slug
  for (const slug of missing) {
    if (mapping[slug]) continue
    if (toDownload.find(t => t.slug === slug)) continue // already queued
    
    // Try common filename patterns
    const patterns = [
      `assets/ProductImages/${slug}.jpg`,
      `assets/ProductImages/${slug}.png`,
      `assets/ProductCarouselImages/${slug}-1.jpg`,
      `assets/ProductCarouselImages/${slug}.jpg`,
    ]
    
    // Also check fileMap for slug-matching filenames
    for (const [, filename] of Object.entries(fileMap)) {
      const fname = filename.split("/").pop()?.replace(/\.\w+$/, "").toLowerCase() || ""
      if (fname && (fname === slug || fname.startsWith(slug + "-") || slug.startsWith(fname))) {
        toDownload.push({ slug, url: `${BASE_URL}/${filename}` })
        break
      }
    }
  }

  console.log(`  Total to download (with name matching): ${toDownload.length}\n`)

  // Step 4: Download
  let found = 0
  let failed = 0

  // Deduplicate
  const seen = new Set<string>()
  const uniqueDownloads = toDownload.filter(d => {
    if (seen.has(d.slug)) return false
    seen.add(d.slug)
    return true
  })

  for (let i = 0; i < uniqueDownloads.length; i++) {
    const { slug, url } = uniqueDownloads[i]
    const num = i + 1

    const localPath = await downloadImage(url)
    if (localPath) {
      mapping[slug] = localPath
      found++
      process.stdout.write(`  ✓ [${num}/${uniqueDownloads.length}] ${slug} → ${localPath}\n`)
    } else {
      failed++
      if (num <= 30 || num % 50 === 0) {
        process.stdout.write(`  ✗ [${num}/${uniqueDownloads.length}] ${slug}\n`)
      }
    }

    if (num % 25 === 0) {
      await fs.writeFile(MAPPING_FILE, JSON.stringify(mapping, null, 2), "utf-8")
      console.log(`  ... saved ${found} new`)
    }

    await sleep(50)
  }

  // Final pass: try ALL File entries with ProductImages pattern for remaining missing
  const stillMissing = missing.filter(s => !mapping[s])
  if (stillMissing.length > 0) {
    console.log(`\n  Second pass: trying all ${Object.keys(fileMap).length} file entries for ${stillMissing.length} remaining...`)
    
    // Build a lookup of normalized filenames
    const fileByNorm: Record<string, string> = {}
    for (const [, filename] of Object.entries(fileMap)) {
      const fname = filename.split("/").pop()?.replace(/\.\w+$/, "").toLowerCase()
        .replace(/[^a-z0-9]/g, "") || ""
      if (fname) fileByNorm[fname] = filename
    }

    for (const slug of stillMissing) {
      if (mapping[slug]) continue
      const normSlug = slug.replace(/[^a-z0-9]/g, "")
      
      // Try exact match
      if (fileByNorm[normSlug]) {
        const url = `${BASE_URL}/${fileByNorm[normSlug]}`
        const localPath = await downloadImage(url)
        if (localPath) {
          mapping[slug] = localPath
          found++
          process.stdout.write(`  ✓ ${slug} → ${localPath}\n`)
          await sleep(50)
        }
      }
    }
  }

  await fs.writeFile(MAPPING_FILE, JSON.stringify(mapping, null, 2), "utf-8")

  console.log(`\n═══════════════════════════════════════════════`)
  console.log(`  Done!`)
  console.log(`  New images from DB: ${found}`)
  console.log(`  Failed: ${failed}`)
  console.log(`  Total mapped: ${Object.keys(mapping).length}/${usedSlugs.size}`)
  console.log(`  Still missing: ${[...usedSlugs].filter(s => !mapping[s]).length}`)
  console.log(`═══════════════════════════════════════════════`)
}

main().catch(e => { console.error(e); process.exit(1) })
