import { promises as fs } from "fs"
import path from "path"
import matter from "gray-matter"
import { execFile as execFileCb } from "child_process"
import { promisify } from "util"
import { SLUG_TO_SILO, SILOS, type SiloId } from "../src/lib/silo-config"

type ImpactProduct = {
  slug: string
  title?: string
  store?: string
  crawlPath?: string | null
  coreFieldPresence?: {
    size?: boolean
    ingredients?: boolean
    nutritionInfo?: boolean
    dosage?: boolean
  }
}

type ImpactCategory = {
  categorySlug: string
  inSignalCache?: boolean
  stores?: string[]
  products?: ImpactProduct[]
}

type ImpactMap = {
  categories?: ImpactCategory[]
}

const ROOT = process.cwd()
const CATEGORY_DIR = path.join(ROOT, "src", "app", "(da)", "kosttilskud")
const PRODUCT_DIR = path.join(CATEGORY_DIR, "produkter")
const IMPACT_MAP_FILE = path.join(ROOT, "content", "store-impact-map.json")
const OUTPUT_DIR = path.join(ROOT, "content", "silo-audits")
const execFile = promisify(execFileCb)

function parseArg(flag: string): string | null {
  const idx = process.argv.indexOf(flag)
  if (idx === -1) return null
  const value = process.argv[idx + 1]
  return value ? String(value).trim() : null
}

function extractProductSlugs(mdx: string): string[] {
  const slugs: string[] = []
  const anchorRegex = /<a id="product-([^"]+)"><\/a>/g
  let match: RegExpExecArray | null
  while ((match = anchorRegex.exec(mdx)) !== null) {
    if (!slugs.includes(match[1])) slugs.push(match[1])
  }
  return slugs
}

async function readJson<T>(filePath: string): Promise<T> {
  const raw = await fs.readFile(filePath, "utf8")
  return JSON.parse(raw.replace(/^\uFEFF/, "")) as T
}

async function runVerify(categorySlug: string): Promise<{ ok: boolean; output: string }> {
  try {
    const command = process.platform === "win32" ? "cmd.exe" : "npx"
    const args = process.platform === "win32"
      ? ["/d", "/s", "/c", `npx tsx scripts/verify-category-page-output.ts ${categorySlug}`]
      : ["tsx", "scripts/verify-category-page-output.ts", categorySlug]
    const { stdout, stderr } = await execFile(command, args, {
      cwd: ROOT,
      windowsHide: true,
      maxBuffer: 8 * 1024 * 1024,
    })
    return { ok: true, output: `${stdout}${stderr}`.trim() }
  } catch (error: any) {
    return {
      ok: false,
      output: `${String(error?.stdout || "")}${String(error?.stderr || error?.message || error)}`.trim(),
    }
  }
}

async function fetchHttpStatus(url: string): Promise<number | null> {
  try {
    const res = await fetch(url, { method: "HEAD" })
    return res.status
  } catch {
    return null
  }
}

async function loadProductTitle(slug: string): Promise<string> {
  try {
    const raw = await fs.readFile(path.join(PRODUCT_DIR, slug, "content.mdx"), "utf8")
    const parsed = matter(raw)
    return String(parsed.data?.title || slug).trim()
  } catch {
    return slug
  }
}

function detectIntroMismatch(body: string, productSlugs: string[], productTitles: Record<string, string>) {
  const introMatch = body.match(/\{\/\* ═══ ORIGINAL_INTRO_START ═══ \*\/\}([\s\S]*?)\{\/\* ═══ ORIGINAL_INTRO_END ═══ \*\/\}/)
  if (!introMatch) return { mismatch: false, mentionedTitle: null as string | null, expectedTitle: null as string | null }
  if (productSlugs.length === 0) return { mismatch: false, mentionedTitle: null as string | null, expectedTitle: null as string | null }

  const intro = introMatch[1]
  const expectedTitle = productTitles[productSlugs[0]] || productSlugs[0]
  let mentionedTitle: string | null = null

  for (const slug of productSlugs) {
    const title = productTitles[slug] || slug
    if (title && intro.toLowerCase().includes(title.toLowerCase())) {
      mentionedTitle = title
      break
    }
  }

  return {
    mismatch: Boolean(mentionedTitle && expectedTitle && mentionedTitle.toLowerCase() !== expectedTitle.toLowerCase()),
    mentionedTitle,
    expectedTitle,
  }
}

async function main() {
  const siloArg = parseArg("--silo")
  const siloId = (siloArg || "protein-traening") as SiloId

  if (!SILOS[siloId]) {
    console.error(`Unknown silo: ${siloId}`)
    process.exit(1)
  }

  const impactMap = await readJson<ImpactMap>(IMPACT_MAP_FILE)
  const impactByCategory = new Map((impactMap.categories || []).map((entry) => [entry.categorySlug, entry]))
  const categorySlugs = Object.entries(SLUG_TO_SILO)
    .filter(([, value]) => value === siloId)
    .map(([slug]) => slug)
    .sort((a, b) => a.localeCompare(b))

  const report: Array<Record<string, unknown>> = []
  for (const categorySlug of categorySlugs) {
    const pagePath = path.join(CATEGORY_DIR, categorySlug, "page.mdx")
    let raw = ""
    try {
      raw = await fs.readFile(pagePath, "utf8")
    } catch {
      console.warn(`Skipping ${categorySlug} (missing page.mdx)`)
      continue
    }
    const parsed = matter(raw)
    const body = parsed.content
    const verify = await runVerify(categorySlug)
    const route = `${SILOS[siloId].href}/${categorySlug}`
    const httpStatus = await fetchHttpStatus(`http://localhost:3000${route}`)
    const productSlugs = extractProductSlugs(raw)
    const productTitles = Object.fromEntries(
      await Promise.all(productSlugs.map(async (slug) => [slug, await loadProductTitle(slug)] as const)),
    )
    const introMismatch = detectIntroMismatch(body, productSlugs, productTitles)
    const impact = impactByCategory.get(categorySlug)
    const products = (impact?.products || []).map((product) => ({
      slug: product.slug,
      title: product.title || productTitles[product.slug] || product.slug,
      store: product.store || null,
      crawlPath: product.crawlPath || null,
      coreFieldPresence: product.coreFieldPresence || null,
    }))
    const missingCrawlProducts = products.filter((product) => !product.crawlPath).map((product) => product.slug)

    report.push({
      categorySlug,
      route,
      httpStatus,
      verifyOk: verify.ok,
      verifySummary: verify.output.split(/\r?\n/).filter(Boolean),
      inSignalCache: impact?.inSignalCache ?? false,
      stores: impact?.stores || [],
      productCount: productSlugs.length,
      missingCrawlProducts,
      introMentionsDifferentWinner: introMismatch.mismatch,
      introMentionedTitle: introMismatch.mentionedTitle,
      expectedTopTitle: introMismatch.expectedTitle,
      products,
    })
  }

  await fs.mkdir(OUTPUT_DIR, { recursive: true })
  const outPath = path.join(OUTPUT_DIR, `${siloId}.json`)
  await fs.writeFile(outPath, `${JSON.stringify({
    generatedAt: new Date().toISOString(),
    siloId,
    categoryCount: report.length,
    categories: report,
  }, null, 2)}\n`, "utf8")

  console.log(`Wrote ${path.relative(ROOT, outPath)}`)
  console.log(`Audited ${report.length} categories in ${siloId}`)
  const httpFailures = report.filter((entry) => entry.httpStatus !== 200).length
  const verifyFailures = report.filter((entry) => !entry.verifyOk).length
  const introMismatches = report.filter((entry) => entry.introMentionsDifferentWinner).length
  console.log(`HTTP failures: ${httpFailures}`)
  console.log(`Verify failures: ${verifyFailures}`)
  console.log(`Intro/ranking mismatches: ${introMismatches}`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
