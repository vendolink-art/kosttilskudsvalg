import { promises as fs } from "fs"
import path from "path"
import { SILOS, SLUG_TO_SILO, type SiloId } from "../src/lib/silo-config"

type BrokenLinkRow = {
  productSlug: string
  outgoingUrl: string
  statusCode: number
  testPageUrl: string | null
  testPosition: number | null
  categoryPageUrls?: string[]
}

type OpenPageProduct = {
  productSlug: string
  statusCode: number
  testPosition: number | null
  categoryPageUrls: string[]
}

type OpenPageEntry = {
  page: string
  status: "open"
  brokenCount: number
  products: OpenPageProduct[]
}

type GreenPageEntry = {
  page: string
  slug: string
  status: "green"
  brokenCount: 0
}

const ROOT = process.cwd()
const CONTENT_DIR = path.join(ROOT, "content")
const CATEGORY_DIR = path.join(ROOT, "src", "app", "(da)", "kosttilskud")
const BROKEN_LINKS_REPORT = path.join(CONTENT_DIR, "broken-links-report.json")
const TEST_PAGE_STATUS = path.join(CONTENT_DIR, "test-page-status.json")

async function readJson<T>(filePath: string): Promise<T> {
  const raw = await fs.readFile(filePath, "utf8")
  return JSON.parse(raw.replace(/^\uFEFF/, "")) as T
}

async function collectCategoryPages(): Promise<Array<{ slug: string; page: string; siloId: SiloId }>> {
  const entries = await fs.readdir(CATEGORY_DIR, { withFileTypes: true })
  const pages: Array<{ slug: string; page: string; siloId: SiloId }> = []

  for (const entry of entries) {
    if (!entry.isDirectory()) continue
    if (entry.name === "[slug]" || entry.name === "produkter") continue

    const pagePath = path.join(CATEGORY_DIR, entry.name, "page.mdx")
    try {
      await fs.access(pagePath)
    } catch {
      continue
    }

    const siloId = SLUG_TO_SILO[entry.name] || "sundhed-velvaere"
    pages.push({
      slug: entry.name,
      page: `${SILOS[siloId].href}/${entry.name}`,
      siloId,
    })
  }

  return pages.sort((a, b) => a.page.localeCompare(b.page, "da"))
}

function compareProducts(a: OpenPageProduct, b: OpenPageProduct): number {
  const posA = a.testPosition ?? Number.MAX_SAFE_INTEGER
  const posB = b.testPosition ?? Number.MAX_SAFE_INTEGER
  if (posA !== posB) return posA - posB
  return a.productSlug.localeCompare(b.productSlug, "da")
}

async function main() {
  const [rows, categoryPages] = await Promise.all([
    readJson<BrokenLinkRow[]>(BROKEN_LINKS_REPORT),
    collectCategoryPages(),
  ])

  const brokenByPage = new Map<string, OpenPageProduct[]>()
  for (const row of rows) {
    const page = String(row.testPageUrl || "").trim()
    if (!page) continue

    const nextEntry: OpenPageProduct = {
      productSlug: row.productSlug,
      statusCode: row.statusCode,
      testPosition: row.testPosition ?? null,
      categoryPageUrls: Array.isArray(row.categoryPageUrls)
        ? row.categoryPageUrls.filter((url) => typeof url === "string" && url.trim())
        : page
          ? [page]
          : [],
    }

    const current = brokenByPage.get(page) || []
    current.push(nextEntry)
    brokenByPage.set(page, current)
  }

  const openPages: OpenPageEntry[] = categoryPages
    .filter(({ page }) => brokenByPage.has(page))
    .map(({ page }) => {
      const products = (brokenByPage.get(page) || []).sort(compareProducts)
      return {
        page,
        status: "open" as const,
        brokenCount: products.length,
        products,
      }
    })
    .sort((a, b) => {
      if (b.brokenCount !== a.brokenCount) return b.brokenCount - a.brokenCount
      return a.page.localeCompare(b.page, "da")
    })

  const greenPages: GreenPageEntry[] = categoryPages
    .filter(({ page }) => !brokenByPage.has(page))
    .map(({ slug, page }) => ({
      page,
      slug,
      status: "green" as const,
      brokenCount: 0 as const,
    }))
    .sort((a, b) => a.page.localeCompare(b.page, "da"))

  const brokenCountsBySilo = new Map<SiloId, number>()
  for (const { page, brokenCount } of openPages) {
    const pageMeta = categoryPages.find((entry) => entry.page === page)
    const siloId = pageMeta?.siloId || "sundhed-velvaere"
    brokenCountsBySilo.set(siloId, (brokenCountsBySilo.get(siloId) || 0) + brokenCount)
  }

  const summary = {
    generatedAt: new Date().toISOString(),
    totalPages: categoryPages.length,
    openPages: openPages.length,
    greenPages: greenPages.length,
    totalBrokenSlots: rows.length,
    bySilo: [...brokenCountsBySilo.entries()].sort((a, b) => b[1] - a[1]),
    topPriorityPages: openPages.slice(0, 20).map((entry) => ({
      page: entry.page,
      brokenCount: entry.brokenCount,
    })),
  }

  const output = {
    summary,
    openPages,
    greenPages,
  }

  await fs.writeFile(TEST_PAGE_STATUS, `${JSON.stringify(output, null, 2)}\n`, "utf8")
  console.log(`Wrote ${path.relative(ROOT, TEST_PAGE_STATUS)}`)
  console.log(`Open pages: ${openPages.length}`)
  console.log(`Green pages: ${greenPages.length}`)
  console.log(`Broken slots: ${rows.length}`)
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exit(1)
})
