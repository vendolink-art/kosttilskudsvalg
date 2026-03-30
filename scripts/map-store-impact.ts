import { promises as fs } from "fs"
import path from "path"
import matter from "gray-matter"

type SignalSnapshotProduct = {
  slug: string
  title: string
  buyUrl?: string
  rating?: number
  signals?: Record<string, unknown>
  signalConfidence?: {
    overall?: number
    fields?: Record<string, number>
    relevantFields?: string[]
  }
  panelScores?: {
    overall?: number
  } & Record<string, unknown>
}

type SignalSnapshot = {
  updatedAt?: string
  categories?: Record<string, SignalSnapshotProduct[]>
}

type ProductFrontmatter = {
  title?: string
  source_store?: string
  source_url?: string
}

type CrawledProduct = {
  store?: string
  sourceUrl?: string
  size?: string
  ingredients?: string
  nutritionInfo?: string | Record<string, unknown> | Array<unknown>
  dosage?: string
}

const ROOT = process.cwd()
const CATEGORY_DIR = path.join(ROOT, "src", "app", "(da)", "kosttilskud")
const PRODUCT_DIR = path.join(CATEGORY_DIR, "produkter")
const SIGNAL_CACHE_FILE = path.join(ROOT, "content", "product-signals-cache.json")
const BUY_LINKS_FILE = path.join(ROOT, "content", "product-buy-links.json")
const OUTPUT_FILE = path.join(ROOT, "content", "store-impact-map.json")
const EXCLUDED_CATEGORY_DIRS = new Set(["[slug]", "produkter"])

function extractProductSlugs(mdx: string): string[] {
  const slugs: string[] = []
  const anchorRegex = /<a id="product-([^"]+)">/g
  const linkRegex = /\[Se vurdering\]\(\/kosttilskud\/produkter\/([^)]+)\)/g
  let match: RegExpExecArray | null

  while ((match = anchorRegex.exec(mdx)) !== null) {
    if (!slugs.includes(match[1])) slugs.push(match[1])
  }

  if (slugs.length === 0) {
    while ((match = linkRegex.exec(mdx)) !== null) {
      if (!slugs.includes(match[1])) slugs.push(match[1])
    }
  }

  return slugs
}

function hasMeaningfulValue(value: unknown): boolean {
  if (value == null) return false
  if (Array.isArray(value)) return value.some((item) => hasMeaningfulValue(item))
  if (typeof value === "object") return Object.values(value as Record<string, unknown>).some((item) => hasMeaningfulValue(item))
  return String(value).trim().length > 0
}

function uniqueSorted(values: Iterable<string>): string[] {
  return [...new Set(values)].sort((a, b) => a.localeCompare(b))
}

async function readJson<T>(filePath: string): Promise<T> {
  const raw = await fs.readFile(filePath, "utf8")
  return JSON.parse(raw.replace(/^\uFEFF/, "")) as T
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath)
    return true
  } catch {
    return false
  }
}

async function loadProductFrontmatter(slug: string): Promise<ProductFrontmatter> {
  const filePath = path.join(PRODUCT_DIR, slug, "content.mdx")
  const raw = await fs.readFile(filePath, "utf8")
  return matter(raw).data as ProductFrontmatter
}

async function loadCategorySlugs(categorySlug: string): Promise<string[]> {
  const filePath = path.join(CATEGORY_DIR, categorySlug, "page.mdx")
  const raw = await fs.readFile(filePath, "utf8")
  return extractProductSlugs(raw)
}

async function discoverCategorySlugs(): Promise<string[]> {
  const entries = await fs.readdir(CATEGORY_DIR, { withFileTypes: true })
  const categorySlugs: string[] = []

  for (const entry of entries) {
    if (!entry.isDirectory() || EXCLUDED_CATEGORY_DIRS.has(entry.name)) continue
    const pagePath = path.join(CATEGORY_DIR, entry.name, "page.mdx")
    if (!(await fileExists(pagePath))) continue
    const slugs = await loadCategorySlugs(entry.name)
    if (slugs.length > 0) categorySlugs.push(entry.name)
  }

  return categorySlugs.sort((a, b) => a.localeCompare(b))
}

async function loadCrawledProduct(store: string, slug: string): Promise<CrawledProduct | null> {
  const filePath = path.join(ROOT, "content", "crawled-products", store, `${slug}.json`)
  if (await fileExists(filePath)) return readJson<CrawledProduct>(filePath)
  return null
}

function canonicalizeUrl(input: string | null | undefined): string {
  if (!input) return ""
  try {
    const url = new URL(input)
    const host = url.hostname.replace(/^www\./i, "").toLowerCase()
    const pathname = url.pathname.replace(/\/+$/, "")
    return `${url.protocol}//${host}${pathname}`.toLowerCase()
  } catch {
    return String(input).trim().toLowerCase().replace(/\/+$/, "")
  }
}

async function findCrawledProductBySourceUrl(store: string, sourceUrl: string | null | undefined): Promise<{ crawl: CrawledProduct; relativePath: string } | null> {
  const canonicalTarget = canonicalizeUrl(sourceUrl)
  if (!canonicalTarget) return null

  const storeDir = path.join(ROOT, "content", "crawled-products", store)
  let entries: string[] = []
  try {
    entries = await fs.readdir(storeDir)
  } catch {
    return null
  }

  for (const entry of entries) {
    if (!entry.endsWith(".json")) continue
    const filePath = path.join(storeDir, entry)
    try {
      const crawl = await readJson<CrawledProduct>(filePath)
      if (canonicalizeUrl(crawl.sourceUrl) === canonicalTarget) {
        return {
          crawl,
          relativePath: path.join("content", "crawled-products", store, entry),
        }
      }
    } catch {
      // ignore malformed crawl file
    }
  }

  return null
}

function inferStoreFromUrl(rawUrl: string | undefined | null): string | null {
  if (!rawUrl) return null
  try {
    const hostname = new URL(rawUrl).hostname.toLowerCase().replace(/^www\./, "")
    if (hostname.includes("corenutrition.dk")) return "corenutrition"
    if (hostname.includes("healthwell.dk")) return "healthwell"
    if (hostname.includes("bodystore.")) return "bodystore"
    if (hostname.includes("mmsportsstore.dk")) return "mmsportsstore"
    if (hostname.includes("med24.dk")) return "med24"
    if (hostname.includes("weightworld.")) return "weightworld"
    if (hostname.includes("bodylab.dk")) return "bodylab"
    if (hostname.includes("helsegrossisten.dk")) return "helsegrossisten"
    return hostname.replace(/\./g, "-")
  } catch {
    return null
  }
}

async function main() {
  const snapshot = await readJson<SignalSnapshot>(SIGNAL_CACHE_FILE)
  const buyLinks = await readJson<Record<string, string>>(BUY_LINKS_FILE)
  const snapshotCategories = snapshot.categories || {}
  const categorySlugs = await discoverCategorySlugs()

  const byStore = new Map<string, {
    store: string
    categories: Set<string>
    products: Array<Record<string, unknown>>
    veryLowConfidenceCount: number
    lowConfidenceCount: number
    missingCrawlFieldCounts: Record<string, number>
  }>()

  const categorySummaries: Array<Record<string, unknown>> = []
  const warnings: string[] = []
  let scopedProducts = 0

  for (const categorySlug of categorySlugs) {
    const snapshotProducts = snapshotCategories[categorySlug] || []
    const pageProductSlugs = await loadCategorySlugs(categorySlug)
    const snapshotBySlug = new Map(snapshotProducts.map((product) => [product.slug, product]))

    const missingInSnapshot = pageProductSlugs.filter((slug) => !snapshotBySlug.has(slug))
    const missingInPage = snapshotProducts.map((product) => product.slug).filter((slug) => !pageProductSlugs.includes(slug))
    if (snapshotProducts.length > 0 && missingInSnapshot.length > 0) warnings.push(`${categorySlug}: saknas i signal-cache -> ${missingInSnapshot.join(", ")}`)
    if (snapshotProducts.length > 0 && missingInPage.length > 0) warnings.push(`${categorySlug}: saknas i page.mdx -> ${missingInPage.join(", ")}`)

    const resolvedProducts: Array<Record<string, unknown>> = []
    const storesForCategory = new Set<string>()

    for (const slug of pageProductSlugs) {
      const snapshotProduct = snapshotBySlug.get(slug)
      const frontmatter = await loadProductFrontmatter(slug)
      const buyUrl = snapshotProduct?.buyUrl || buyLinks[slug] || null
      const sourceUrl = frontmatter.source_url || buyUrl || null
      const inferredStore = inferStoreFromUrl(sourceUrl)
      const store = String(frontmatter.source_store || inferredStore || "unknown").trim() || "unknown"
      const directCrawlPath = path.join("content", "crawled-products", store, `${slug}.json`)
      const directCrawl = store === "unknown" ? null : await loadCrawledProduct(store, slug)
      const fallbackCrawl = !directCrawl && store !== "unknown"
        ? await findCrawledProductBySourceUrl(store, sourceUrl)
        : null
      const crawl = directCrawl || fallbackCrawl?.crawl || null
      const crawlPath = directCrawl
        ? directCrawlPath
        : fallbackCrawl?.relativePath || null
      const confidenceOverall = snapshotProduct?.signalConfidence?.overall ?? null
      const fieldScores = snapshotProduct?.signalConfidence?.fields || {}
      const relevantFields = snapshotProduct?.signalConfidence?.relevantFields || Object.keys(fieldScores)
      const missingSignalFields = relevantFields.filter((field) => (fieldScores[field] ?? 0) < 0.5)
      const coreFieldPresence = {
        size: hasMeaningfulValue(crawl?.size),
        ingredients: hasMeaningfulValue(crawl?.ingredients),
        nutritionInfo: hasMeaningfulValue(crawl?.nutritionInfo),
        dosage: hasMeaningfulValue(crawl?.dosage),
      }

      scopedProducts++
      storesForCategory.add(store)

      const productRecord = {
        slug,
        title: frontmatter.title || snapshotProduct?.title || slug,
        store,
        sourceUrl: sourceUrl || crawl?.sourceUrl || null,
        buyUrl,
        categorySlugs: [categorySlug],
        confidenceOverall,
        missingSignalFields,
        panelOverall: snapshotProduct?.panelScores?.overall ?? null,
        rating: snapshotProduct?.rating ?? null,
        crawlPath,
        coreFieldPresence,
      }

      resolvedProducts.push(productRecord)

      if (!byStore.has(store)) {
        byStore.set(store, {
          store,
          categories: new Set<string>(),
          products: [],
          veryLowConfidenceCount: 0,
          lowConfidenceCount: 0,
          missingCrawlFieldCounts: {
            crawlFile: 0,
            size: 0,
            ingredients: 0,
            nutritionInfo: 0,
            dosage: 0,
          },
        })
      }

      const storeBucket = byStore.get(store)!
      storeBucket.categories.add(categorySlug)
      storeBucket.products.push(productRecord)
      if (typeof confidenceOverall === "number" && confidenceOverall < 0.5) storeBucket.veryLowConfidenceCount += 1
      if (typeof confidenceOverall === "number" && confidenceOverall < 0.75) storeBucket.lowConfidenceCount += 1
      if (!productRecord.crawlPath) storeBucket.missingCrawlFieldCounts.crawlFile += 1
      if (!coreFieldPresence.size) storeBucket.missingCrawlFieldCounts.size += 1
      if (!coreFieldPresence.ingredients) storeBucket.missingCrawlFieldCounts.ingredients += 1
      if (!coreFieldPresence.nutritionInfo) storeBucket.missingCrawlFieldCounts.nutritionInfo += 1
      if (!coreFieldPresence.dosage) storeBucket.missingCrawlFieldCounts.dosage += 1
    }

    categorySummaries.push({
      categorySlug,
      inSignalCache: snapshotProducts.length > 0,
      productCount: resolvedProducts.length,
      stores: uniqueSorted(storesForCategory),
      products: resolvedProducts,
    })
  }

  const stores = [...byStore.values()]
    .map((bucket) => ({
      store: bucket.store,
      categoryCount: bucket.categories.size,
      productCount: bucket.products.length,
      categories: uniqueSorted(bucket.categories),
      veryLowConfidenceCount: bucket.veryLowConfidenceCount,
      lowConfidenceCount: bucket.lowConfidenceCount,
      missingCrawlFieldCounts: bucket.missingCrawlFieldCounts,
      products: bucket.products.sort((a, b) => {
        const aSlug = String(a.slug || "")
        const bSlug = String(b.slug || "")
        return aSlug.localeCompare(bSlug)
      }),
    }))
    .sort((a, b) => {
      if (b.productCount !== a.productCount) return b.productCount - a.productCount
      return a.store.localeCompare(b.store)
    })

  const report = {
    generatedAt: new Date().toISOString(),
    scope: {
      signalCacheUpdatedAt: snapshot.updatedAt || null,
      categoryCount: categorySlugs.length,
      categoriesInSignalCache: Object.keys(snapshotCategories).length,
      scopedProductCount: scopedProducts,
    },
    warnings,
    stores,
    categories: categorySummaries.sort((a, b) => String(a.categorySlug).localeCompare(String(b.categorySlug))),
  }

  await fs.writeFile(OUTPUT_FILE, `${JSON.stringify(report, null, 2)}\n`, "utf8")

  console.log(`Wrote ${path.relative(ROOT, OUTPUT_FILE)}`)
  console.log(`Scoped categories: ${categorySlugs.length}`)
  console.log(`Scoped product rows: ${scopedProducts}`)
  for (const store of stores.slice(0, 10)) {
    console.log(
      [
        `${store.store}`,
        `products=${store.productCount}`,
        `categories=${store.categoryCount}`,
        `low_conf=${store.lowConfidenceCount}`,
        `very_low=${store.veryLowConfidenceCount}`,
        `missing_nutrition=${store.missingCrawlFieldCounts.nutritionInfo}`,
        `missing_ingredients=${store.missingCrawlFieldCounts.ingredients}`,
        `missing_size=${store.missingCrawlFieldCounts.size}`,
      ].join(" | "),
    )
  }
  if (warnings.length > 0) {
    console.log(`Warnings: ${warnings.length}`)
  }
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
