import { promises as fs } from "fs"
import path from "path"
import { spawn } from "child_process"

type QueueEntry = {
  page: string
  slug: string
  siloId: string
  pageStatus: "open" | "green"
  brokenCount: number
}

type SelectiveQueue = {
  fullReviewCandidates: QueueEntry[]
  sourceEvidenceFollowUp: QueueEntry[]
  backlogOnly: QueueEntry[]
  keepAsIs: QueueEntry[]
}

const ROOT = process.cwd()
const CATEGORY_DIR = path.join(ROOT, "src", "app", "(da)", "kosttilskud")
const BUY_LINKS_PATH = path.join(ROOT, "content", "product-buy-links.json")
const QUEUE_PATH = path.join(ROOT, "content", "selective-review-queue.json")
const URL_FILE = path.join(ROOT, "content", "selective-review-urls.txt")
const NPX_BIN = process.platform === "win32" ? "npx.cmd" : "npx"

function parseArg(flag: string): string | null {
  const idx = process.argv.indexOf(flag)
  if (idx === -1) return null
  return String(process.argv[idx + 1] || "").trim() || null
}

function parseArgInt(flag: string): number | null {
  const value = parseArg(flag)
  if (!value) return null
  const parsed = parseInt(value, 10)
  return Number.isFinite(parsed) ? parsed : null
}

function hasFlag(flag: string): boolean {
  return process.argv.includes(flag)
}

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = []
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size))
  return out
}

function unique<T>(items: T[]): T[] {
  return [...new Set(items)]
}

async function readJson<T>(filePath: string): Promise<T> {
  const raw = await fs.readFile(filePath, "utf8")
  return JSON.parse(raw.replace(/^\uFEFF/, "")) as T
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

async function collectCategoryProducts(categorySlugs: string[]): Promise<string[]> {
  const productSlugs: string[] = []
  for (const categorySlug of categorySlugs) {
    const pagePath = path.join(CATEGORY_DIR, categorySlug, "page.mdx")
    let raw = ""
    try {
      raw = await fs.readFile(pagePath, "utf8")
    } catch {
      continue
    }
    for (const match of raw.matchAll(/<a id="product-([^"]+)"><\/a>/g)) {
      productSlugs.push(match[1])
    }
  }
  return unique(productSlugs).sort()
}

async function buildScopedUrls(productSlugs: string[]): Promise<string[]> {
  const buyLinks = await readJson<Record<string, string>>(BUY_LINKS_PATH)
  return unique(
    productSlugs
      .map((slug) => String(buyLinks[slug] || "").trim())
      .filter((url) => /^https?:\/\//i.test(url)),
  )
}

async function main() {
  const mode = parseArg("--mode") || "all"
  const limitCategories = parseArgInt("--limit-categories")
  const crawlBatchSize = parseArgInt("--crawl-batch-size") || 50
  const rewriteBatchSize = parseArgInt("--rewrite-batch-size") || 25
  const rewriteConcurrency = parseArgInt("--rewrite-concurrency") || 4
  const skipRecrawl = hasFlag("--skip-recrawl")
  const skipSync = hasFlag("--skip-sync")
  const skipRewrite = hasFlag("--skip-rewrite")
  const skipRebuild = hasFlag("--skip-rebuild")
  const skipImages = hasFlag("--skip-images")
  const skipVerify = hasFlag("--skip-verify")

  const queue = await readJson<SelectiveQueue>(QUEUE_PATH)
  const allowedModes = new Set(["all", "full", "source"])
  if (!allowedModes.has(mode)) {
    console.error(`Unknown mode: ${mode}`)
    process.exit(1)
  }

  const fullCategories = queue.fullReviewCandidates.map((entry) => entry.slug)
  const sourceCategories = queue.sourceEvidenceFollowUp.map((entry) => entry.slug)
  const selectedFull = mode === "source" ? [] : fullCategories
  const selectedSource = mode === "full" ? [] : sourceCategories

  const fullSlice = limitCategories == null ? selectedFull : selectedFull.slice(0, limitCategories)
  const sourceLimit = limitCategories == null || mode !== "all"
    ? limitCategories
    : Math.max(0, limitCategories - fullSlice.length)
  const sourceSlice = sourceLimit == null ? selectedSource : selectedSource.slice(0, sourceLimit)

  const allSelectedCategories = [...fullSlice, ...sourceSlice]
  const productSlugs = await collectCategoryProducts(allSelectedCategories)
  const scopedUrls = await buildScopedUrls(productSlugs)
  await fs.writeFile(URL_FILE, `${scopedUrls.join("\n")}\n`, "utf8")

  console.log("═══════════════════════════════════════")
  console.log("  Selective Review Queue Runner")
  console.log("═══════════════════════════════════════")
  console.log(`Mode: ${mode}`)
  console.log(`Full review categories: ${fullSlice.length}`)
  console.log(`Source/evidence categories: ${sourceSlice.length}`)
  console.log(`Scoped products: ${productSlugs.length}`)
  console.log(`Scoped URLs: ${scopedUrls.length}`)
  console.log()

  if (!skipRecrawl) {
    const batches = Math.ceil(scopedUrls.length / crawlBatchSize)
    for (let batchIndex = 0; batchIndex < batches; batchIndex++) {
      const offset = batchIndex * crawlBatchSize
      await runCommand(
        ["tsx", "scripts/crawlers/crawl.ts", "--url-file", URL_FILE, "--safe", "--limit", String(crawlBatchSize), "--offset", String(offset)],
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
    const rewriteGroups = chunk(productSlugs, rewriteBatchSize)
    for (let i = 0; i < rewriteGroups.length; i++) {
      const startIndex = i * rewriteBatchSize + 1
      const endIndex = startIndex + rewriteGroups[i].length - 1
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
    for (let i = 0; i < fullSlice.length; i++) {
      await runCommand(
        ["tsx", "scripts/rebuild-category-pages.ts", fullSlice[i], "--force-regenerate-non-product-content"],
        `[4/6] Rebuild full-review category ${i + 1}/${fullSlice.length}: ${fullSlice[i]}`,
      )
    }
    for (let i = 0; i < sourceSlice.length; i++) {
      await runCommand(
        ["tsx", "scripts/rebuild-category-pages.ts", sourceSlice[i], "--preserve-non-product-content"],
        `[4/6] Rebuild source/evidence category ${i + 1}/${sourceSlice.length}: ${sourceSlice[i]}`,
      )
    }
  }

  if (!skipImages) {
    for (let i = 0; i < fullSlice.length; i++) {
      await runCommand(
        ["tsx", "scripts/generate-product-test-images.ts", fullSlice[i]],
        `[5/6] Generate test images ${i + 1}/${fullSlice.length}: ${fullSlice[i]}`,
      )
    }
  }

  if (!skipVerify) {
    const verifyCategories = [...fullSlice, ...sourceSlice]
    for (let i = 0; i < verifyCategories.length; i++) {
      await runCommand(
        ["tsx", "scripts/verify-category-page-output.ts", verifyCategories[i]],
        `[6/6] Verify category ${i + 1}/${verifyCategories.length}: ${verifyCategories[i]}`,
      )
    }
  }

  console.log("\nSelective review queue run completed.")
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exit(1)
})
