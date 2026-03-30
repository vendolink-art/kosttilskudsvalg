/**
 * fix-position-1.ts
 *
 * For each category page where position #1 is NOT a Healthwell/CoreNutrition product,
 * swap the first HW/Core product into position #1 and rebuild the page.
 *
 * Uses rebuild-category-pages.ts with --preserve-non-product-content.
 *
 * Usage:
 *   npx tsx scripts/fix-position-1.ts --dry-run
 *   npx tsx scripts/fix-position-1.ts
 *   npx tsx scripts/fix-position-1.ts --start 0 --count 10
 */

import { promises as fs } from "fs"
import path from "path"
import { execSync } from "child_process"

const BUY_LINKS_FILE = path.join(process.cwd(), "content", "product-buy-links.json")
const CAT_DIR = path.join(process.cwd(), "src", "app", "(da)", "kosttilskud")

function isHealthwellOrCore(url: string): boolean {
  const u = url.toLowerCase()
  return u.includes("healthwell.dk") || u.includes("corenutrition.dk")
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
  const dryRun = args.includes("--dry-run")
  const getArg = (flag: string) => {
    const i = args.indexOf(flag)
    return i !== -1 ? args[i + 1] : undefined
  }
  const startIdx = parseInt(getArg("--start") || "0") || 0
  const count = parseInt(getArg("--count") || "999") || 999

  const buyLinks: Record<string, string> = JSON.parse(
    (await fs.readFile(BUY_LINKS_FILE, "utf8")).replace(/^\uFEFF/, ""),
  )

  const entries = await fs.readdir(CAT_DIR, { withFileTypes: true })
  const catSlugs: string[] = []
  for (const e of entries) {
    if (!e.isDirectory() || e.name === "produkter") continue
    const mdxPath = path.join(CAT_DIR, e.name, "page.mdx")
    try { await fs.access(mdxPath); catSlugs.push(e.name) } catch {}
  }
  catSlugs.sort()

  interface Fix {
    catSlug: string
    currentOrder: string[]
    newOrder: string[]
    swapFrom: number
    swapSlug: string
  }

  const fixes: Fix[] = []

  for (const catSlug of catSlugs) {
    const mdxPath = path.join(CAT_DIR, catSlug, "page.mdx")
    const mdx = await fs.readFile(mdxPath, "utf8")
    const slugs = extractProductSlugs(mdx)
    if (slugs.length < 2) continue

    const pos1Url = buyLinks[slugs[0]] || ""
    if (isHealthwellOrCore(pos1Url)) continue

    let swapIdx = -1
    for (let i = 1; i < slugs.length; i++) {
      const url = buyLinks[slugs[i]] || ""
      if (isHealthwellOrCore(url)) { swapIdx = i; break }
    }
    if (swapIdx === -1) continue

    const newOrder = [...slugs]
    const temp = newOrder[0]
    newOrder[0] = newOrder[swapIdx]
    newOrder[swapIdx] = temp

    fixes.push({
      catSlug,
      currentOrder: slugs,
      newOrder,
      swapFrom: swapIdx + 1,
      swapSlug: slugs[swapIdx],
    })
  }

  console.log(`\n${"=".repeat(70)}`)
  console.log(`  Fix Position #1 → Healthwell/CoreNutrition`)
  console.log(`  Pages to fix: ${fixes.length}`)
  console.log(`  Dry run: ${dryRun}`)
  console.log(`${"=".repeat(70)}\n`)

  const slice = fixes.slice(startIdx, startIdx + count)
  let succeeded = 0, failed = 0

  for (let i = 0; i < slice.length; i++) {
    const fix = slice[i]
    const store = new URL(buyLinks[fix.swapSlug]).hostname.replace("www.", "")

    console.log(`[${i + 1}/${slice.length}] /${fix.catSlug}`)
    console.log(`  Swap: #${fix.swapFrom} ${fix.swapSlug} (${store}) → #1`)
    console.log(`  New order: ${fix.newOrder.join(", ")}`)

    if (dryRun) {
      console.log(`  [DRY RUN]\n`)
      continue
    }

    try {
      const slugsArg = fix.newOrder.join(",")
      execSync(
        `npx tsx scripts/rebuild-category-pages.ts "${fix.catSlug}" --product-slugs "${slugsArg}" --preserve-non-product-content`,
        { cwd: process.cwd(), timeout: 480000, stdio: "pipe", windowsHide: true },
      )
      console.log(`  OK ✓\n`)
      succeeded++
    } catch (e: any) {
      const msg = e.stderr?.toString()?.slice(0, 200) || e.message?.slice(0, 200)
      console.log(`  FAIL: ${msg}\n`)
      failed++
    }
  }

  console.log(`${"=".repeat(70)}`)
  console.log(`  Succeeded: ${succeeded}`)
  console.log(`  Failed: ${failed}`)
  console.log(`${"=".repeat(70)}\n`)
}

main().catch(console.error)
