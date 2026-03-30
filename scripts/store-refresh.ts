import { promises as fs } from "fs"
import path from "path"
import { spawn } from "child_process"
import { SLUG_TO_SILO, type SiloId } from "../src/lib/silo-config"

type ImpactProduct = {
  slug: string
  title?: string
  sourceUrl?: string | null
  buyUrl?: string | null
  categorySlugs?: string[]
}

type ImpactStore = {
  store: string
  categories: string[]
  products: ImpactProduct[]
}

type ImpactMap = {
  stores: ImpactStore[]
}

const ROOT = process.cwd()
const IMPACT_MAP_FILE = path.join(ROOT, "content", "store-impact-map.json")
const BUY_LINKS_FILE = path.join(ROOT, "content", "product-buy-links.json")
const NPX_BIN = process.platform === "win32" ? "npx.cmd" : "npx"

function parseArg(flag: string): string | null {
  const idx = process.argv.indexOf(flag)
  if (idx === -1) return null
  return String(process.argv[idx + 1] || "").trim() || null
}

function parseArgInt(flag: string): number | null {
  const raw = parseArg(flag)
  if (!raw) return null
  const value = parseInt(raw, 10)
  return Number.isFinite(value) ? value : null
}

function hasFlag(flag: string): boolean {
  return process.argv.includes(flag)
}

function parseCsvArg(flag: string): string[] {
  const raw = parseArg(flag)
  if (!raw) return []
  return raw.split(",").map((item) => item.trim()).filter(Boolean)
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

async function runCommand(args: string[]) {
  await new Promise<void>((resolve, reject) => {
    const command = process.platform === "win32" ? "cmd.exe" : NPX_BIN
    const commandArgs = process.platform === "win32"
      ? ["/d", "/s", "/c", `${NPX_BIN} ${args.join(" ")}`]
      : args
    const child = spawn(command, commandArgs, {
      cwd: ROOT,
      stdio: "inherit",
      shell: false,
      windowsHide: true,
    })
    child.on("error", reject)
    child.on("exit", (code) => {
      if (code === 0) resolve()
      else reject(new Error(`Command failed with exit code ${code}: ${command} ${commandArgs.join(" ")}`))
    })
  })
}

async function ensureImpactMap() {
  try {
    await fs.access(IMPACT_MAP_FILE)
  } catch {
    console.log("Impact map missing, generating it first...")
    await runCommand(["tsx", "scripts/map-store-impact.ts"])
  }
}

async function main() {
  const store = parseArg("--store")
  const silo = parseArg("--silo") as SiloId | null
  const categoryFilter = parseCsvArg("--category-slugs")
  const write = hasFlag("--write")
  const limitProducts = parseArgInt("--limit-products")
  const limitCategories = parseArgInt("--limit-categories")
  const skipRecrawl = hasFlag("--skip-recrawl")
  const skipSync = hasFlag("--skip-sync")
  const skipRewrite = hasFlag("--skip-rewrite")
  const skipRebuild = hasFlag("--skip-rebuild")
  const skipVerify = hasFlag("--skip-verify")

  if (!store) {
    console.error("Usage: npx tsx scripts/store-refresh.ts --store <store> [--write]")
    console.error("Optional: --silo protein-traening --category-slugs kreatin,pre-workout --limit-products 10 --limit-categories 5 --skip-recrawl --skip-sync --skip-rewrite --skip-rebuild --skip-verify")
    process.exit(1)
  }

  if (silo && !["protein-traening", "vitaminer", "mineraler", "omega-fedtsyrer", "sundhed-velvaere"].includes(silo)) {
    console.error(`Unknown silo: ${silo}`)
    process.exit(1)
  }

  await ensureImpactMap()

  const impactMap = await readJson<ImpactMap>(IMPACT_MAP_FILE)
  const buyLinks = await readJson<Record<string, string>>(BUY_LINKS_FILE)
  const storeEntry = impactMap.stores.find((entry) => entry.store === store)

  if (!storeEntry) {
    console.error(`Store "${store}" not found in ${path.relative(ROOT, IMPACT_MAP_FILE)}`)
    process.exit(1)
  }

  const scopedCategories = storeEntry.categories
    .filter((category) => !silo || SLUG_TO_SILO[category] === silo)
    .filter((category) => categoryFilter.length === 0 || categoryFilter.includes(category))
  const scopedCategorySet = new Set(scopedCategories)
  const scopedProducts = storeEntry.products.filter((product) => {
    const productCategories = product.categorySlugs || []
    return productCategories.some((category) => scopedCategorySet.has(category))
  })

  const products = unique(scopedProducts.map((product) => product.slug))
    .slice(0, limitProducts ?? Number.MAX_SAFE_INTEGER)
  const categories = scopedCategories
    .slice(0, limitCategories ?? Number.MAX_SAFE_INTEGER)

  console.log("═══════════════════════════════════════")
  console.log("  Store Refresh Orchestrator")
  console.log("═══════════════════════════════════════")
  console.log(`Store: ${store}`)
  if (silo) console.log(`Silo: ${silo}`)
  if (categoryFilter.length > 0) console.log(`Category filter: ${categoryFilter.join(", ")}`)
  console.log(`Mode: ${write ? "write" : "dry-run"}`)
  console.log(`Products: ${products.length}`)
  console.log(`Categories: ${categories.length}`)
  console.log()

  if (!write) {
    console.log("Planned products:")
    for (const slug of products) {
      const url = storeEntry.products.find((product) => product.slug === slug)?.sourceUrl || buyLinks[slug] || ""
      console.log(`  - ${slug}${url ? ` -> ${url}` : ""}`)
    }
    console.log()
    console.log("Planned categories:")
    for (const category of categories) {
      console.log(`  - ${category}`)
    }
    console.log()
    console.log("Dry-run complete. Re-run with --write to execute the flow.")
    return
  }

  if (!skipRecrawl) {
    console.log("\n[1/5] Recrawling impacted products...")
    for (const slug of products) {
      const url = storeEntry.products.find((product) => product.slug === slug)?.sourceUrl || buyLinks[slug] || ""
      if (!url) {
        console.warn(`  ! Skipping ${slug}: no buy/source URL found`)
        continue
      }
      console.log(`\n  • Recrawl ${slug}`)
      await runCommand(["tsx", "scripts/crawlers/crawl.ts", "--url", url])
    }
  }

  if (!skipSync) {
    console.log("\n[2/5] Syncing product frontmatter...")
    for (const group of chunk(products, 25)) {
      await runCommand(["tsx", "scripts/sync-product-source-frontmatter.ts", "--slugs", group.join(",")])
    }
  }

  if (!skipRewrite) {
    console.log("\n[3/5] Rewriting impacted product content...")
    for (const slug of products) {
      console.log(`\n  • Rewrite ${slug}`)
      await runCommand(["tsx", "scripts/rewrite-product-content.ts", "--slug", slug])
    }
  }

  if (!skipRebuild) {
    console.log("\n[4/5] Rebuilding impacted categories...")
    for (const category of categories) {
      console.log(`\n  • Rebuild ${category}`)
      await runCommand(["tsx", "scripts/rebuild-category-pages.ts", category, "--preserve-non-product-content"])
    }
  }

  if (!skipVerify) {
    console.log("\n[5/5] Verifying rebuilt categories...")
    for (const category of categories) {
      console.log(`\n  • Verify ${category}`)
      await runCommand(["tsx", "scripts/verify-category-page-output.ts", category])
    }
  }

  console.log("\nStore refresh completed.")
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
