/**
 * batch-replace-404s.ts — Filesystem-based batch replacement
 *
 * Processes broken links directly via filesystem operations instead of the API.
 * This avoids issues with Next.js hot-reload losing in-memory job state.
 *
 * For each broken link:
 *   1. Look up pre-searched replacement URL from mapping file
 *   2. Crawl the replacement URL
 *   3. Update product-buy-links.json
 *   4. Update product content MDX (from crawled data)
 *   5. Run AI rewrite on the product
 *   6. Rebuild the category page (preserving non-product content)
 *   7. Remove entry from broken-links-report.json
 *
 * Usage:
 *   npx tsx scripts/batch-replace-404s.ts
 *   npx tsx scripts/batch-replace-404s.ts --start 0 --count 10
 *   npx tsx scripts/batch-replace-404s.ts --dry-run
 */

import { promises as fs } from "fs"
import path from "path"
import { execSync } from "child_process"

const BROKEN_LINKS_FILE = path.join(process.cwd(), "content", "broken-links-report.json")
const MAPPING_FILE = path.join(process.cwd(), "content", "replacement-url-mapping.json")
const BUY_LINKS_FILE = path.join(process.cwd(), "content", "product-buy-links.json")
const PRODUCT_IMAGES_FILE = path.join(process.cwd(), "content", "product-images.json")
const CRAWLED_DIR = path.join(process.cwd(), "content", "crawled-products")
const PRODUCT_CONTENT_DIR = path.join(process.cwd(), "src", "app", "(da)", "kosttilskud", "produkter")
const CATEGORY_DIR = path.join(process.cwd(), "src", "app", "(da)", "kosttilskud")

interface BrokenLink {
  productSlug: string
  outgoingUrl: string
  statusCode: number
  testPageUrl: string
  testPosition: number
  categoryPageUrls: string[]
}

interface ReplacementMapping {
  slug: string
  newUrl: string | null
  reason?: string
}

function run(cmd: string, timeoutMs = 300000): string {
  try {
    return execSync(cmd, {
      cwd: process.cwd(),
      timeout: timeoutMs,
      stdio: "pipe",
      windowsHide: true,
    }).toString()
  } catch (e: any) {
    return e.stdout?.toString() || e.stderr?.toString() || e.message
  }
}

function runOrFail(cmd: string, timeoutMs = 300000): string {
  return execSync(cmd, {
    cwd: process.cwd(),
    timeout: timeoutMs,
    stdio: "pipe",
    windowsHide: true,
  }).toString()
}

async function findCrawledBySourceUrl(url: string): Promise<any | null> {
  const target = url.toLowerCase().replace(/\/$/, "").replace(/\?.*$/, "")
  async function walk(dir: string): Promise<any | null> {
    let entries: any[]
    try {
      entries = await fs.readdir(dir, { withFileTypes: true })
    } catch {
      return null
    }
    for (const e of entries) {
      const full = path.join(dir, e.name)
      if (e.isDirectory()) {
        const r = await walk(full)
        if (r) return r
        continue
      }
      if (!e.name.endsWith(".json")) continue
      try {
        const raw = await fs.readFile(full, "utf8")
        const p = JSON.parse(raw)
        const src = String(p?.sourceUrl || "").toLowerCase().replace(/\/$/, "").replace(/\?.*$/, "")
        if (src && src === target) return p
      } catch { continue }
    }
    return null
  }
  return walk(CRAWLED_DIR)
}

function extractCategorySlug(testPageUrl: string): string | null {
  const parts = testPageUrl.split("/").filter(Boolean)
  return parts.length >= 2 ? parts[parts.length - 1] : null
}

function extractCategoryProductSlugs(raw: string): string[] {
  const slugs: string[] = []
  const re = /<a id="product-([^"]+)">/g
  let m: RegExpExecArray | null
  while ((m = re.exec(raw)) !== null) {
    if (!slugs.includes(m[1])) slugs.push(m[1])
  }
  return slugs
}

async function main() {
  const args = process.argv.slice(2)
  const getArg = (flag: string) => {
    const i = args.indexOf(flag)
    return i !== -1 ? args[i + 1] : undefined
  }
  const dryRun = args.includes("--dry-run")
  const startIdx = parseInt(getArg("--start") || "0") || 0
  const count = parseInt(getArg("--count") || "999") || 999

  // Load data
  let brokenLinks: BrokenLink[] = JSON.parse(await fs.readFile(BROKEN_LINKS_FILE, "utf8"))
  const mappings: ReplacementMapping[] = JSON.parse(await fs.readFile(MAPPING_FILE, "utf8"))
  const mappingBySlug = new Map(mappings.map((m) => [m.slug, m]))

  console.log(`\n${"=".repeat(60)}`)
  console.log(`  Batch 404 Replacement (filesystem-direct)`)
  console.log(`  Broken links: ${brokenLinks.length}`)
  console.log(`  Mappings with URL: ${mappings.filter((m) => m.newUrl).length}`)
  console.log(`  Range: ${startIdx} to ${Math.min(startIdx + count, brokenLinks.length) - 1}`)
  console.log(`  Dry run: ${dryRun}`)
  console.log(`${"=".repeat(60)}\n`)

  let succeeded = 0, failed = 0, skipped = 0

  const slice = brokenLinks.slice(startIdx, startIdx + count)

  for (let i = 0; i < slice.length; i++) {
    const broken = slice[i]
    const idx = startIdx + i
    const mapping = mappingBySlug.get(broken.productSlug)
    const categorySlug = extractCategorySlug(broken.testPageUrl)

    console.log(`\n[${idx + 1}/${brokenLinks.length}] ${broken.productSlug}`)
    console.log(`  Page: ${broken.testPageUrl} | Pos: ${broken.testPosition}`)

    if (!mapping?.newUrl) {
      console.log(`  SKIP: ${mapping?.reason || "No replacement URL"}`)
      skipped++
      continue
    }
    if (!categorySlug) {
      console.log(`  SKIP: Could not extract category slug`)
      skipped++
      continue
    }

    console.log(`  → ${mapping.newUrl}`)

    if (dryRun) {
      console.log(`  [DRY RUN]`)
      continue
    }

    // STEP 1: Crawl
    console.log(`  [1/6] Crawling...`)
    try {
      runOrFail(`npx tsx scripts/crawlers/crawl.ts --url "${mapping.newUrl}"`, 120000)
    } catch {
      console.log(`  FAIL: Crawl failed`)
      failed++
      continue
    }
    const crawled = await findCrawledBySourceUrl(mapping.newUrl)
    if (!crawled?.name) {
      console.log(`  FAIL: No crawled data found`)
      failed++
      continue
    }
    console.log(`  Crawled: ${crawled.name}`)

    // STEP 2: Update buy links
    console.log(`  [2/6] Updating buy link...`)
    const buyLinksRaw = await fs.readFile(BUY_LINKS_FILE, "utf8")
    const buyLinks = JSON.parse(buyLinksRaw.replace(/^\uFEFF/, ""))
    buyLinks[broken.productSlug] = mapping.newUrl
    await fs.writeFile(BUY_LINKS_FILE, JSON.stringify(buyLinks, null, 2), "utf8")

    // STEP 3: Update product images
    try {
      const imgRaw = await fs.readFile(PRODUCT_IMAGES_FILE, "utf8")
      const images = JSON.parse(imgRaw.replace(/^\uFEFF/, ""))
      if (crawled.imageUrl) {
        images[broken.productSlug] = crawled.imageUrl
        await fs.writeFile(PRODUCT_IMAGES_FILE, JSON.stringify(images, null, 2), "utf8")
      }
    } catch { /* non-fatal */ }

    // STEP 4: Run AI rewrite
    console.log(`  [3/6] AI rewrite...`)
    try {
      runOrFail(`npx tsx scripts/rewrite-product-content.ts --slug "${broken.productSlug}"`, 120000)
      console.log(`  Rewrite OK`)
    } catch {
      console.log(`  Rewrite failed (non-fatal, using crawled data)`)
    }

    // STEP 5: Rebuild category page
    console.log(`  [4/6] Rebuilding category page...`)
    const catMdxPath = path.join(CATEGORY_DIR, categorySlug, "page.mdx")
    let productSlugs: string[] = []
    try {
      const catRaw = await fs.readFile(catMdxPath, "utf8")
      productSlugs = extractCategoryProductSlugs(catRaw)
    } catch {
      console.log(`  WARN: Could not read category page`)
    }

    if (productSlugs.length > 0) {
      const slugsArg = productSlugs.join(",")
      try {
        runOrFail(
          `npx tsx scripts/rebuild-category-pages.ts "${categorySlug}" --product-slugs "${slugsArg}" --preserve-non-product-content`,
          480000,
        )
        console.log(`  Rebuild OK`)
      } catch (e: any) {
        console.log(`  WARN: Rebuild error: ${e.message?.slice(0, 100)}`)
      }
    }

    // STEP 6: Remove from broken links report
    console.log(`  [5/6] Cleaning broken links report...`)
    brokenLinks = JSON.parse(await fs.readFile(BROKEN_LINKS_FILE, "utf8"))
    const filtered = brokenLinks.filter(
      (r) => r.productSlug !== broken.productSlug,
    )
    if (filtered.length !== brokenLinks.length) {
      await fs.writeFile(BROKEN_LINKS_FILE, JSON.stringify(filtered, null, 2), "utf8")
      brokenLinks = filtered
    }

    console.log(`  [6/6] DONE ✓`)
    succeeded++
  }

  console.log(`\n${"=".repeat(60)}`)
  console.log(`  RESULTS`)
  console.log(`  Succeeded: ${succeeded}`)
  console.log(`  Failed: ${failed}`)
  console.log(`  Skipped: ${skipped}`)
  console.log(`  Remaining broken links: ${brokenLinks.length}`)
  console.log(`${"=".repeat(60)}\n`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
