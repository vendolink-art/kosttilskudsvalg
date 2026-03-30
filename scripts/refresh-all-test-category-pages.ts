import { promises as fs } from "fs"
import path from "path"
import { spawn } from "child_process"
import { SLUG_TO_SILO } from "../src/lib/silo-config"

const ROOT = process.cwd()
const KOSTTILSKUD_DIR = path.join(ROOT, "src", "app", "(da)", "kosttilskud")
const NPX_BIN = process.platform === "win32" ? "npx.cmd" : "npx"

function hasFlag(flag: string): boolean {
  return process.argv.includes(flag)
}

function parseArgInt(flag: string): number | null {
  const idx = process.argv.indexOf(flag)
  if (idx === -1) return null
  const value = parseInt(String(process.argv[idx + 1] || ""), 10)
  return Number.isFinite(value) ? value : null
}

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = []
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size))
  return out
}

async function runCommand(args: string[], stepLabel: string) {
  await new Promise<void>((resolve, reject) => {
    const command = process.platform === "win32" ? "cmd.exe" : NPX_BIN
    const commandArgs = process.platform === "win32"
      ? ["/d", "/s", "/c", `${NPX_BIN} ${args.join(" ")}`]
      : args

    console.log(`\n${stepLabel}`)
    console.log(`> ${NPX_BIN} ${args.join(" ")}`)

    const child = spawn(command, commandArgs, {
      cwd: ROOT,
      stdio: "inherit",
      shell: false,
      windowsHide: true,
    })
    child.on("error", reject)
    child.on("exit", (code) => {
      if (code === 0) resolve()
      else reject(new Error(`Command failed with exit code ${code}: ${NPX_BIN} ${args.join(" ")}`))
    })
  })
}

async function collectCategoriesAndProducts(): Promise<{ categorySlugs: string[]; productSlugs: string[] }> {
  const entries = await fs.readdir(KOSTTILSKUD_DIR, { withFileTypes: true })
  const candidateSlugs = entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .filter((name) => name !== "[slug]" && name !== "produkter")
    .sort()

  const categorySlugs: string[] = []
  const productSet = new Set<string>()
  for (const catSlug of candidateSlugs) {
    const mdxPath = path.join(KOSTTILSKUD_DIR, catSlug, "page.mdx")
    let raw = ""
    try {
      raw = await fs.readFile(mdxPath, "utf8")
    } catch {
      continue
    }
    categorySlugs.push(catSlug)
    for (const match of raw.matchAll(/<a id="product-([^"]+)"><\/a>/g)) {
      productSet.add(match[1])
    }
  }

  return {
    categorySlugs,
    productSlugs: [...productSet].sort(),
  }
}

async function readBuyLinks(): Promise<Record<string, string>> {
  const raw = await fs.readFile(path.join(ROOT, "content", "product-buy-links.json"), "utf8")
  return JSON.parse(raw.replace(/^\uFEFF/, "")) as Record<string, string>
}

async function main() {
  const skipRecrawl = hasFlag("--skip-recrawl")
  const skipSync = hasFlag("--skip-sync")
  const skipRewrite = hasFlag("--skip-rewrite")
  const skipRebuild = hasFlag("--skip-rebuild")
  const skipImages = hasFlag("--skip-images")
  const skipVerify = hasFlag("--skip-verify")
  const limitCategories = parseArgInt("--limit-categories")
  const limitProducts = parseArgInt("--limit-products")
  const crawlBatchSize = parseArgInt("--crawl-batch-size") || 50
  const rewriteBatchSize = parseArgInt("--rewrite-batch-size") || 25
  const rewriteConcurrency = parseArgInt("--rewrite-concurrency") || 4
  const startRewriteIndex = Math.max(1, parseArgInt("--start-rewrite-index") || 1)

  const { categorySlugs: allCategorySlugs, productSlugs: allProductSlugs } = await collectCategoriesAndProducts()
  const buyLinks = await readBuyLinks()
  const categorySlugs = limitCategories ? allCategorySlugs.slice(0, limitCategories) : allCategorySlugs

  const productSlugs = (limitProducts ? allProductSlugs.slice(0, limitProducts) : allProductSlugs).filter((slug) => {
    if (limitCategories == null) return true
    return categorySlugs.some((catSlug) => {
      try {
        const mdxPath = path.join(KOSTTILSKUD_DIR, catSlug, "page.mdx")
        const raw = require("fs").readFileSync(mdxPath, "utf8") as string
        return raw.includes(`product-${slug}`)
      } catch {
        return false
      }
    })
  })
  const scopedUrls = productSlugs
    .map((slug) => String(buyLinks[slug] || "").trim())
    .filter((url) => /^https?:\/\//i.test(url))
  const scopedUrlFile = path.join(ROOT, "content", "refresh-all-test-category-urls.txt")
  await fs.writeFile(scopedUrlFile, `${scopedUrls.join("\n")}\n`, "utf8")

  console.log("═══════════════════════════════════════")
  console.log("  Full Test Category Refresh")
  console.log("═══════════════════════════════════════")
  console.log(`Categories: ${categorySlugs.length}`)
  console.log(`Products: ${productSlugs.length}`)
  console.log(`Scoped URLs: ${scopedUrls.length}`)
  console.log(`Silos: ${[...new Set(categorySlugs.map((slug) => SLUG_TO_SILO[slug] || "sundhed-velvaere"))].join(", ")}`)
  console.log()

  if (!skipRecrawl) {
    const batches = Math.ceil(scopedUrls.length / crawlBatchSize)
    for (let batchIndex = 0; batchIndex < batches; batchIndex++) {
      const offset = batchIndex * crawlBatchSize
      await runCommand(
        ["tsx", "scripts/crawlers/crawl.ts", "--url-file", scopedUrlFile, "--safe", "--limit", String(crawlBatchSize), "--offset", String(offset)],
        `[1/6] Recrawl batch ${batchIndex + 1}/${batches}`,
      )
    }
  }

  if (!skipSync) {
    const slugGroups = chunk(productSlugs, 25)
    for (let i = 0; i < slugGroups.length; i++) {
      await runCommand(
        ["tsx", "scripts/sync-product-source-frontmatter.ts", "--slugs", slugGroups[i].join(","), "--skip-missing-crawled"],
        `[2/6] Sync product frontmatter ${i + 1}/${slugGroups.length}`,
      )
    }
  }

  if (!skipRewrite) {
    const rewriteProductSlugs = productSlugs.slice(startRewriteIndex - 1)
    const rewriteGroups = chunk(rewriteProductSlugs, rewriteBatchSize)
    for (let i = 0; i < rewriteGroups.length; i++) {
      const startIndex = startRewriteIndex + i * rewriteBatchSize
      const endIndex = Math.min(productSlugs.length, startIndex + rewriteGroups[i].length - 1)
      await runCommand(
        [
          "tsx",
          "scripts/rewrite-product-content.ts",
          "--slugs",
          rewriteGroups[i].join(","),
          "--concurrency",
          String(rewriteConcurrency),
        ],
        `[3/6] Rewrite products ${startIndex}-${endIndex}/${productSlugs.length}`,
      )
    }
  }

  if (!skipRebuild) {
    for (let i = 0; i < categorySlugs.length; i++) {
      await runCommand(
        ["tsx", "scripts/rebuild-category-pages.ts", categorySlugs[i], "--force-regenerate-non-product-content"],
        `[4/6] Rebuild category ${i + 1}/${categorySlugs.length}: ${categorySlugs[i]}`,
      )
    }
  }

  if (!skipImages) {
    for (let i = 0; i < categorySlugs.length; i++) {
      await runCommand(
        ["tsx", "scripts/generate-product-test-images.ts", categorySlugs[i]],
        `[5/6] Generate test images ${i + 1}/${categorySlugs.length}: ${categorySlugs[i]}`,
      )
    }
  }

  if (!skipVerify) {
    for (let i = 0; i < categorySlugs.length; i++) {
      await runCommand(
        ["tsx", "scripts/verify-category-page-output.ts", categorySlugs[i]],
        `[6/6] Verify category ${i + 1}/${categorySlugs.length}: ${categorySlugs[i]}`,
      )
    }
  }

  console.log("\nFull test category refresh completed.")
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exit(1)
})
