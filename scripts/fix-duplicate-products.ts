/**
 * fix-duplicate-products.ts — Replaces duplicate product URLs on category pages.
 *
 * For each duplicate: crawl the new URL, update buy-links + images,
 * rewrite product content, rebuild the affected category page(s).
 *
 * Usage:
 *   npx tsx scripts/fix-duplicate-products.ts
 *   npx tsx scripts/fix-duplicate-products.ts --dry-run
 *   npx tsx scripts/fix-duplicate-products.ts --start 0 --count 5
 */

import { promises as fs } from "fs"
import path from "path"
import { execSync } from "child_process"

const BUY_LINKS_FILE = path.join(process.cwd(), "content", "product-buy-links.json")
const PRODUCT_IMAGES_FILE = path.join(process.cwd(), "content", "product-images.json")
const CRAWLED_DIR = path.join(process.cwd(), "content", "crawled-products")
const CATEGORY_DIR = path.join(process.cwd(), "src", "app", "(da)", "kosttilskud")
const MAPPING_FILE = path.join(
  process.cwd(),
  "content",
  process.argv.includes("--mapping")
    ? process.argv[process.argv.indexOf("--mapping") + 1]
    : "duplicate-fix-mapping.json",
)

interface DupeMapping {
  slug: string
  newUrl: string
  page: string
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
        const src = String(p?.sourceUrl || "")
          .toLowerCase()
          .replace(/\/$/, "")
          .replace(/\?.*$/, "")
        if (src && src === target) return p
      } catch {
        continue
      }
    }
    return null
  }
  return walk(CRAWLED_DIR)
}

function extractProductSlugs(mdx: string): string[] {
  const slugs: string[] = []
  const re = /<a id="product-([^"]+)">/g
  let m: RegExpExecArray | null
  while ((m = re.exec(mdx)) !== null) {
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

  const mappings: DupeMapping[] = JSON.parse(await fs.readFile(MAPPING_FILE, "utf8"))
  const slice = mappings.slice(startIdx, startIdx + count)

  console.log(`\n${"=".repeat(60)}`)
  console.log(`  Fix Duplicate Products`)
  console.log(`  Total entries: ${mappings.length}`)
  console.log(`  Processing: ${startIdx} to ${startIdx + slice.length - 1}`)
  console.log(`  Dry run: ${dryRun}`)
  console.log(`${"=".repeat(60)}\n`)

  let succeeded = 0
  let failed = 0
  const failures: string[] = []

  for (let i = 0; i < slice.length; i++) {
    const entry = slice[i]
    const idx = startIdx + i
    console.log(`\n[${idx + 1}/${mappings.length}] ${entry.slug}`)
    console.log(`  Page: ${entry.page}`)
    console.log(`  New URL: ${entry.newUrl}`)

    if (dryRun) {
      console.log(`  [DRY RUN]`)
      continue
    }

    // STEP 1: Crawl
    console.log(`  [1/5] Crawling...`)
    try {
      runOrFail(
        `npx tsx scripts/crawlers/crawl.ts --url "${entry.newUrl}"`,
        120000,
      )
    } catch (e: any) {
      console.log(`  FAIL: Crawl error: ${e.message?.slice(0, 120)}`)
      failed++
      failures.push(`${entry.slug}: crawl failed for ${entry.newUrl}`)
      continue
    }
    const crawled = await findCrawledBySourceUrl(entry.newUrl)
    if (!crawled?.name) {
      console.log(`  FAIL: No crawled data found after crawl`)
      failed++
      failures.push(`${entry.slug}: no crawled data for ${entry.newUrl}`)
      continue
    }
    console.log(`  Crawled: ${crawled.name}`)

    // STEP 2: Update buy links
    console.log(`  [2/5] Updating buy link...`)
    const buyLinksRaw = await fs.readFile(BUY_LINKS_FILE, "utf8")
    const buyLinks = JSON.parse(buyLinksRaw.replace(/^\uFEFF/, ""))
    buyLinks[entry.slug] = entry.newUrl
    await fs.writeFile(BUY_LINKS_FILE, JSON.stringify(buyLinks, null, 2), "utf8")

    // STEP 3: Update product images
    try {
      const imgRaw = await fs.readFile(PRODUCT_IMAGES_FILE, "utf8")
      const images = JSON.parse(imgRaw.replace(/^\uFEFF/, ""))
      if (crawled.imageUrl) {
        images[entry.slug] = crawled.imageUrl
        await fs.writeFile(
          PRODUCT_IMAGES_FILE,
          JSON.stringify(images, null, 2),
          "utf8",
        )
      }
    } catch {}

    // STEP 4: Rewrite product content
    console.log(`  [3/5] AI rewrite...`)
    try {
      runOrFail(
        `npx tsx scripts/rewrite-product-content.ts --slug "${entry.slug}"`,
        120000,
      )
      console.log(`  Rewrite OK`)
    } catch {
      console.log(`  Rewrite failed (non-fatal)`)
    }

    // STEP 5: Rebuild affected category page(s)
    const pageNames = entry.page.includes("+")
      ? entry.page.split("+").map((s) => s.trim())
      : [entry.page.trim()]

    for (const pageName of pageNames) {
      console.log(`  [4/5] Rebuilding /${pageName}...`)
      const catMdxPath = path.join(CATEGORY_DIR, pageName, "page.mdx")
      let productSlugs: string[] = []
      try {
        const catRaw = await fs.readFile(catMdxPath, "utf8")
        productSlugs = extractProductSlugs(catRaw)
      } catch {
        console.log(`  WARN: Could not read category page for ${pageName}`)
        continue
      }

      if (productSlugs.length > 0) {
        const slugsArg = productSlugs.join(",")
        try {
          runOrFail(
            `npx tsx scripts/rebuild-category-pages.ts "${pageName}" --product-slugs "${slugsArg}" --preserve-non-product-content`,
            480000,
          )
          console.log(`  Rebuild OK: /${pageName}`)
        } catch (e: any) {
          console.log(`  WARN: Rebuild error for /${pageName}: ${e.message?.slice(0, 100)}`)
        }
      }
    }

    console.log(`  [5/5] DONE`)
    succeeded++
  }

  console.log(`\n${"=".repeat(60)}`)
  console.log(`  RESULTS`)
  console.log(`  Succeeded: ${succeeded}`)
  console.log(`  Failed: ${failed}`)
  if (failures.length > 0) {
    console.log(`\n  Failures:`)
    for (const f of failures) console.log(`    - ${f}`)
  }
  console.log(`${"=".repeat(60)}\n`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
