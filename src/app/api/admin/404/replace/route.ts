import { NextResponse } from "next/server"
import { revalidatePath } from "next/cache"
import { promises as fs } from "fs"
import path from "path"
import { exec as execCb } from "child_process"
import { promisify } from "util"
import { isAuthenticated } from "@/lib/auth"
import matter from "gray-matter"
import { buildProductContentFromCrawled, type CrawledProductForContent } from "@/lib/product-content-template"
import { buildDisplayProductTitle } from "@/lib/product-titles"

export const runtime = "nodejs"

const exec = promisify(execCb)

const SAFE_SLUG_RE = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/

function shellQuote(s: string): string {
  if (/[\x00\n\r]/.test(s)) throw new Error("Argument contains control characters")
  if (process.platform === "win32") return `"${s.replace(/"/g, '""')}"`
  return `'${s.replace(/'/g, "'\\''")}'`
}

function validateHttpUrl(raw: string): string {
  const url = new URL(raw)
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("Kun HTTP(S) URL'er er tilladte")
  }
  return url.href
}

const BUY_LINKS_FILE = path.join(process.cwd(), "content", "product-buy-links.json")
const PRODUCT_IMAGES_FILE = path.join(process.cwd(), "content", "product-images.json")
const BROKEN_LINKS_REPORT_FILE = path.join(process.cwd(), "content", "broken-links-report.json")
const CRAWLED_PRODUCTS_DIR = path.join(process.cwd(), "content", "crawled-products")
const PRODUCT_CONTENT_DIR = path.join(process.cwd(), "src", "app", "(da)", "kosttilskud", "produkter")
const CATEGORY_CONTENT_DIR = path.join(process.cwd(), "src", "app", "(da)", "kosttilskud")

type CrawledProduct = {
  sourceUrl?: string
  store?: string
  crawledAt?: string
  name?: string
  brand?: string
  price?: string
  priceNumeric?: number | null
  imageUrl?: string
  images?: string[]
  description?: string
  fullDescription?: string
  highlights?: string[]
  ingredients?: string
  dosage?: string
  nutritionInfo?: string
  storeCategory?: string
  ean?: string
  size?: string
  reviewCount?: number
  storeRating?: string
  reviews?: Array<any>
  qa?: Array<any>
  originCountry?: string
  inStock?: boolean
}

function canonicalUrl(input: string): string {
  try {
    const u = new URL(input)
    const host = u.hostname.replace(/^www\./i, "").toLowerCase()
    const pathname = u.pathname.replace(/\/+$/, "")
    return `${u.protocol}//${host}${pathname}`.toLowerCase()
  } catch {
    return input.trim().toLowerCase().replace(/\/+$/, "")
  }
}

function extractCategorySlug(testPageUrl?: string | null, categoryPageUrls?: string[]): string | null {
  const candidates = [testPageUrl || "", ...(categoryPageUrls || [])].filter(Boolean)
  for (const c of candidates) {
    try {
      const u = c.startsWith("http") ? new URL(c) : new URL(c, "https://kostmag.local")
      const parts = u.pathname.split("/").filter(Boolean)
      if (parts.length >= 2) return parts[parts.length - 1]
    } catch {
      // ignore invalid
    }
  }
  return null
}

function cleanText(input?: string): string {
  if (!input) return ""
  return String(input).replace(/\s+/g, " ").trim()
}

function normalizeLooseAscii(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
}

const URL_TOKEN_STOP_WORDS = new Set([
  "shop",
  "produkt",
  "produkter",
  "product",
  "products",
  "kosttilskud",
  "supplement",
  "supplements",
  "page",
  "html",
  "capsule",
  "capsules",
  "kapsler",
  "tabletter",
  "tablet",
  "tablets",
  "servings",
  "serving",
  "portion",
  "portions",
])

function extractMeaningfulUrlTokens(input: string): string[] {
  try {
    const pathname = new URL(input).pathname
    const tokens = normalizeLooseAscii(pathname)
      .split(/\s+/)
      .filter(Boolean)
      .filter((token) => token.length >= 4)
      .filter((token) => !URL_TOKEN_STOP_WORDS.has(token))
      .filter((token) => !/^\d+$/.test(token))
      .filter((token) => !/^\d+(?:g|kg|mg|mcg|ml|cl|l)$/.test(token))
    return Array.from(new Set(tokens))
  } catch {
    return []
  }
}

function getUrlContentMismatchReason(targetUrl: string, crawled: CrawledProduct): string | null {
  const urlTokens = extractMeaningfulUrlTokens(targetUrl)
  if (urlTokens.length < 2) return null

  const crawledText = normalizeLooseAscii(
    [
      crawled.name,
      crawled.brand,
      crawled.description,
      crawled.fullDescription,
      crawled.ingredients,
      crawled.nutritionInfo,
      crawled.size,
    ]
      .filter(Boolean)
      .join(" "),
  )
  if (!crawledText) return null

  const matchedTokens = urlTokens.filter((token) => crawledText.includes(token))
  if (matchedTokens.length > 0) return null

  return `Ny URL ser ut att peka på en annan produkt än den som crawlades. URL-token(s): ${urlTokens.join(", ")}. Crawlad titel: "${cleanText(crawled.name)}".`
}

async function readBuyLinks(): Promise<Record<string, string>> {
  const rawBuyLinks = await fs.readFile(BUY_LINKS_FILE, "utf8")
  return JSON.parse(rawBuyLinks.replace(/^\uFEFF/, "")) as Record<string, string>
}

function extractCategoryProductSlugs(raw: string): string[] {
  const slugs: string[] = []
  const anchorRegex = /<a id="product-([^"]+)">/g
  let match: RegExpExecArray | null

  while ((match = anchorRegex.exec(raw)) !== null) {
    if (!slugs.includes(match[1])) slugs.push(match[1])
  }

  if (slugs.length === 0) {
    const linkRegex = /\[Se vurdering\]\(\/kosttilskud\/produkter\/([^)]+)\)/g
    while ((match = linkRegex.exec(raw)) !== null) {
      if (!slugs.includes(match[1])) slugs.push(match[1])
    }
  }

  return slugs
}

function normalizeMaybePath(input: string): string | null {
  const value = String(input || "").trim()
  if (!value) return null
  try {
    const url = value.startsWith("http") ? new URL(value) : new URL(value, "https://kostmag.local")
    return url.pathname || "/"
  } catch {
    return value.startsWith("/") ? value : `/${value.replace(/^\/+/, "")}`
  }
}

function collectPathsForRevalidation(testPageUrl?: string | null, categoryPageUrls?: string[]): string[] {
  const paths = [testPageUrl || "", ...(categoryPageUrls || [])]
    .map((value) => normalizeMaybePath(value))
    .filter((value): value is string => Boolean(value))

  return Array.from(new Set(paths))
}

async function resolveCategoryReplacementTarget(input: {
  categorySlug: string
  requestedSlug: string
  testPosition?: number | null
  oldOutgoingUrl?: string
}): Promise<{ orderedProductSlugs: string[]; targetSlug: string; matchedBy: "slug" | "url" | "position" }> {
  const categoryMdxPath = path.join(CATEGORY_CONTENT_DIR, input.categorySlug, "page.mdx")
  const raw = await fs.readFile(categoryMdxPath, "utf8")
  const orderedProductSlugs = extractCategoryProductSlugs(raw)

  if (orderedProductSlugs.length === 0) {
    throw new Error(`Kunde inte hitta någon produktlista i kategorin "${input.categorySlug}".`)
  }

  if (orderedProductSlugs.includes(input.requestedSlug)) {
    return { orderedProductSlugs, targetSlug: input.requestedSlug, matchedBy: "slug" }
  }

  const oldOutgoingUrl = canonicalUrl(input.oldOutgoingUrl || "")
  if (oldOutgoingUrl) {
    const buyLinks = await readBuyLinks()
    const slugByUrl = orderedProductSlugs.find((slug) => canonicalUrl(buyLinks[slug] || "") === oldOutgoingUrl)
    if (slugByUrl) {
      return { orderedProductSlugs, targetSlug: slugByUrl, matchedBy: "url" }
    }
  }

  const testPosition = Number(input.testPosition)
  if (Number.isInteger(testPosition) && testPosition >= 1 && testPosition <= orderedProductSlugs.length) {
    return { orderedProductSlugs, targetSlug: orderedProductSlugs[testPosition - 1], matchedBy: "position" }
  }

  throw new Error(
    `Kunde inte matcha 404-raden mot nuvarande produktplats i kategorin "${input.categorySlug}". Uppdatera 404-listan och försök igen.`,
  )
}

async function replaceCategoryProductSlug(categorySlug: string, oldSlug: string, newSlug: string): Promise<string[]> {
  const categoryMdxPath = path.join(CATEGORY_CONTENT_DIR, categorySlug, "page.mdx")
  const raw = await fs.readFile(categoryMdxPath, "utf8")
  const orderedProductSlugs = extractCategoryProductSlugs(raw)

  if (orderedProductSlugs.length === 0) {
    throw new Error(`Kunde inte hitta någon produktlista i kategorin "${categorySlug}".`)
  }

  if (oldSlug !== newSlug) {
    const oldIndex = orderedProductSlugs.indexOf(oldSlug)
    if (oldIndex === -1) {
      throw new Error(
        `Kategorin "${categorySlug}" innehåller inte sluggen "${oldSlug}", så replacement kan inte slutföras säkert.`,
      )
    }
    orderedProductSlugs[oldIndex] = newSlug

    if (raw.includes(oldSlug)) {
      await fs.writeFile(categoryMdxPath, raw.split(oldSlug).join(newSlug), "utf8")
    }
  }

  return orderedProductSlugs
}

async function updateProductMdxFromCrawled(productSlug: string, crawled: CrawledProduct): Promise<void> {
  const dir = path.join(PRODUCT_CONTENT_DIR, productSlug)
  const file = path.join(dir, "content.mdx")
  await fs.mkdir(dir, { recursive: true })

  let existingRaw = ""
  try {
    existingRaw = await fs.readFile(file, "utf8")
  } catch {
    existingRaw = ""
  }

  const parsed = existingRaw ? matter(existingRaw) : { data: {}, content: "" }
  const title = buildDisplayProductTitle(
    cleanText(crawled.name) || String((parsed.data as any)?.title || productSlug),
    {
      brand: cleanText(crawled.brand),
      contextText: `${cleanText(crawled.fullDescription)} ${cleanText(crawled.description)}`,
    },
  )
  const today = new Date().toISOString().slice(0, 10)
  const data: Record<string, any> = {
    ...parsed.data,
    title,
    description: `Anmeldelse af ${title}.`,
    updated: today,
    source_url: crawled.sourceUrl || "",
    source_store: crawled.store || "",
    source_image: crawled.imageUrl || "",
    source_crawled_at: crawled.crawledAt || "",
  }
  if (!data.date) data.date = today
  if (!data.author) data.author = "redaktionen"
  if (!data.category) data.category = "Kosttilskud"
  if (!data.tags) data.tags = ["produkttest", "kosttilskud"]
  if (data.affiliate_disclosure == null) data.affiliate_disclosure = true

  const content = buildProductContentFromCrawled(crawled as CrawledProductForContent, { includeHeading: true })
  const nextRaw = matter.stringify(content, data)
  await fs.writeFile(file, nextRaw, "utf8")
}

async function removeStaleBrokenLinkRows(oldSlug: string, oldUrl: string, replacementSlug: string, replacementUrl: string): Promise<void> {
  try {
    const raw = await fs.readFile(BROKEN_LINKS_REPORT_FILE, "utf8")
    const rows = JSON.parse(raw) as Array<{ productSlug?: string; outgoingUrl?: string }>
    const filtered = rows.filter((row) => {
      const slug = String(row?.productSlug || "")
      const url = String(row?.outgoingUrl || "")
      if (slug === oldSlug) return false
      if (url === oldUrl) return false
      if (slug === replacementSlug && url !== replacementUrl) return false
      return true
    })
    if (filtered.length !== rows.length) {
      await fs.writeFile(BROKEN_LINKS_REPORT_FILE, JSON.stringify(filtered, null, 2), "utf8")
    }
  } catch {
    // ignore if report does not exist yet
  }
}

async function findCrawledBySourceUrl(targetUrl: string): Promise<CrawledProduct | null> {
  const target = canonicalUrl(targetUrl)
  async function walk(dir: string): Promise<CrawledProduct | null> {
    let entries: Array<{ name: string; isDirectory: () => boolean }>
    try {
      entries = await fs.readdir(dir, { withFileTypes: true }) as any
    } catch {
      return null
    }
    for (const entry of entries) {
      const full = path.join(dir, entry.name)
      if (entry.isDirectory()) {
        const nested = await walk(full)
        if (nested) return nested
        continue
      }
      if (!entry.name.endsWith(".json")) continue
      try {
        const raw = await fs.readFile(full, "utf8")
        const parsed = JSON.parse(raw)
        const source = typeof parsed?.sourceUrl === "string" ? canonicalUrl(parsed.sourceUrl) : ""
        if (source && source === target) {
          return parsed as CrawledProduct
        }
      } catch {
        // ignore malformed file
      }
    }
    return null
  }
  return walk(CRAWLED_PRODUCTS_DIR)
}

type ReplaceQueueState = {
  tail: Promise<void>
}

type ReplaceJobPhase = "queued" | "running" | "completed" | "failed"

type ReplaceJobResult = {
  ok: true
  productSlug: string
  previousProductSlug: string
  replacedCategoryProductSlug: string
  matchedBy: "slug" | "url" | "position"
  categorySlug: string
  rebuildCompleted: true
  heroRegenerated: boolean
}

type ReplaceJobState = {
  id: string
  phase: ReplaceJobPhase
  message: string
  startedAt: number
  updatedAt: number
  result?: ReplaceJobResult
  error?: string
}

type ReplaceJobsState = {
  jobs: Map<string, ReplaceJobState>
}

function getReplaceQueueState(): ReplaceQueueState {
  const scopedGlobal = globalThis as typeof globalThis & {
    __admin404ReplaceQueueState?: ReplaceQueueState
  }
  if (!scopedGlobal.__admin404ReplaceQueueState) {
    scopedGlobal.__admin404ReplaceQueueState = {
      tail: Promise.resolve(),
    }
  }
  return scopedGlobal.__admin404ReplaceQueueState
}

function getReplaceJobsState(): ReplaceJobsState {
  const scopedGlobal = globalThis as typeof globalThis & {
    __admin404ReplaceJobsState?: ReplaceJobsState
  }
  if (!scopedGlobal.__admin404ReplaceJobsState) {
    scopedGlobal.__admin404ReplaceJobsState = {
      jobs: new Map<string, ReplaceJobState>(),
    }
  }
  return scopedGlobal.__admin404ReplaceJobsState
}

function pruneOldReplaceJobs() {
  const jobsState = getReplaceJobsState()
  const cutoff = Date.now() - 1000 * 60 * 60
  for (const [jobId, job] of jobsState.jobs.entries()) {
    if (job.updatedAt < cutoff) jobsState.jobs.delete(jobId)
  }
}

function createReplaceJob(initialMessage: string): ReplaceJobState {
  pruneOldReplaceJobs()
  const job: ReplaceJobState = {
    id: crypto.randomUUID(),
    phase: "queued",
    message: initialMessage,
    startedAt: Date.now(),
    updatedAt: Date.now(),
  }
  getReplaceJobsState().jobs.set(job.id, job)
  return job
}

function updateReplaceJob(jobId: string, patch: Partial<ReplaceJobState>) {
  const jobsState = getReplaceJobsState()
  const current = jobsState.jobs.get(jobId)
  if (!current) return
  jobsState.jobs.set(jobId, {
    ...current,
    ...patch,
    updatedAt: Date.now(),
  })
}

function serializeReplaceJob(job: ReplaceJobState) {
  return {
    jobId: job.id,
    phase: job.phase,
    message: job.message,
    error: job.error || null,
    result: job.result || null,
    elapsedSeconds: Math.max(0, Math.round((Date.now() - job.startedAt) / 1000)),
    updatedAt: job.updatedAt,
  }
}

async function runReplaceExclusively<T>(task: () => Promise<T>): Promise<T> {
  const queue = getReplaceQueueState()
  const previous = queue.tail
  let release!: () => void
  queue.tail = new Promise<void>((resolve) => {
    release = resolve
  })
  await previous
  try {
    return await task()
  } finally {
    release()
  }
}

async function handleReplace(body: any, reportProgress?: (message: string) => void): Promise<ReplaceJobResult> {
  const productSlug = String(body?.productSlug || "").trim()
  const newUrl = String(body?.newUrl || "").trim()
  const oldOutgoingUrl = String(body?.oldOutgoingUrl || "").trim()
  const testPageUrl = typeof body?.testPageUrl === "string" ? body.testPageUrl : null
  const categoryPageUrls = Array.isArray(body?.categoryPageUrls) ? body.categoryPageUrls : []
  const testPosition = body?.testPosition == null ? null : Number(body.testPosition)

  if (!productSlug || !newUrl || !/^https?:\/\//i.test(newUrl)) {
    throw new Error("Saknar giltig productSlug/newUrl")
  }

  const safeUrl = validateHttpUrl(newUrl)

  const categorySlug = extractCategorySlug(testPageUrl, categoryPageUrls)
  if (!categorySlug || !SAFE_SLUG_RE.test(categorySlug)) {
    throw new Error("Kunde inte identifiera en giltig kategori för rebuild")
  }

  reportProgress?.("Crawler ny URL...")
  await exec(`npx tsx scripts/crawlers/crawl.ts --url ${shellQuote(safeUrl)}`, {
    cwd: process.cwd(),
    timeout: 240000,
    windowsHide: true,
  })

  const crawled = await findCrawledBySourceUrl(newUrl)
  if (!crawled) {
    throw new Error("Kunde inte parsea ny URL till crawled data. Ingen uppdatering gjord.")
  }
  const hasMeaningfulContent = Boolean(
    cleanText(crawled.description) ||
    cleanText(crawled.fullDescription) ||
    cleanText(crawled.ingredients) ||
    cleanText(crawled.nutritionInfo),
  )
  if (!hasMeaningfulContent) {
    throw new Error("Ny URL kunde crawlas, men gav inte tillräcklig produkttext för innehållsgenerering.")
  }
  const mismatchReason = getUrlContentMismatchReason(newUrl, crawled)
  if (mismatchReason) {
    throw new Error(mismatchReason)
  }

  reportProgress?.("Matcher produktplats i kategorin...")
  const replacementTarget = await resolveCategoryReplacementTarget({
    categorySlug,
    requestedSlug: productSlug,
    testPosition,
    oldOutgoingUrl,
  })
  const currentCategoryProductSlug = replacementTarget.targetSlug
  const replacementSlug = currentCategoryProductSlug
  const rebuiltProductSlugs = replacementTarget.orderedProductSlugs

  // 2) Update product buy link.
  const buyLinks = await readBuyLinks()
  const previousUrl =
    oldOutgoingUrl ||
    String(buyLinks[currentCategoryProductSlug] || "") ||
    String(buyLinks[productSlug] || "")
  if (replacementSlug !== currentCategoryProductSlug) delete buyLinks[currentCategoryProductSlug]
  if (productSlug !== currentCategoryProductSlug && buyLinks[productSlug] === oldOutgoingUrl) {
    delete buyLinks[productSlug]
  }
  buyLinks[replacementSlug] = newUrl
  await fs.writeFile(BUY_LINKS_FILE, JSON.stringify(buyLinks, null, 2), "utf8")

  // 3) Process custom uploaded image OR download from crawler
  const customImage = body?.customImage as { base64: string; name: string } | undefined
  let finalImageUrl = crawled.imageUrl || ""

  reportProgress?.(customImage?.base64 ? "Gemmer uppladdet produktbild..." : "Henter og gemmer produktbild...")
  if (customImage && customImage.base64) {
    try {
      const matches = customImage.base64.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/)
      if (matches && matches.length === 3) {
        const buffer = Buffer.from(matches[2], "base64")
        const ext = customImage.name.split(".").pop()?.split("?")[0] || "jpg"
        const filename = `${replacementSlug}-custom-${Date.now()}.${ext}`
        const relativePath = `/vendor/products/${filename}`
        const absolutePath = path.join(process.cwd(), "public", "vendor", "products", filename)

        await fs.mkdir(path.dirname(absolutePath), { recursive: true })
        await fs.writeFile(absolutePath, buffer)

        finalImageUrl = relativePath
        crawled.imageUrl = finalImageUrl // Update for MDX frontmatter

        const rawImages = await fs.readFile(PRODUCT_IMAGES_FILE, "utf8")
        const images = JSON.parse(rawImages.replace(/^\uFEFF/, "")) as Record<string, string>
        images[replacementSlug] = finalImageUrl
        await fs.writeFile(PRODUCT_IMAGES_FILE, JSON.stringify(images, null, 2), "utf8")
        console.log(`[404-replace] Saved custom uploaded image for ${replacementSlug}`)
      }
    } catch (e) {
      console.error("[404-replace] Failed to save custom image:", e)
    }
  } else if (crawled.imageUrl) {
    try {
      if (finalImageUrl.startsWith("http")) {
        // Bodystore and some others block direct image downloads with 403s or "An error occurred."
        // We'll use Playwright to download the image since it's already installed for the crawler
        const ext = finalImageUrl.split(".").pop()?.split("?")[0] || "jpg"
        const filename = `${replacementSlug}-${Date.now()}.${ext}`
        const relativePath = `/vendor/products/${filename}`
        const absolutePath = path.join(process.cwd(), "public", "vendor", "products", filename)

        try {
          const ts = Date.now()
          const scriptPath = path.join(process.cwd(), "scripts", "crawlers", `download-image-${ts}.js`)
          const configPath = path.join(process.cwd(), "scripts", "crawlers", `download-image-${ts}.json`)

          await fs.writeFile(configPath, JSON.stringify({
            pageUrl: safeUrl,
            imageUrl: finalImageUrl,
            outputPath: absolutePath.replace(/\\/g, "/"),
          }))

          const scriptContent = `
              const { chromium } = require('playwright');
              const fsMod = require('fs');
              const pathMod = require('path');
              const config = JSON.parse(fsMod.readFileSync(process.argv[2], 'utf8'));

              (async () => {
                const browser = await chromium.launch({ headless: true });
                const context = await browser.newContext({
                  userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                  viewport: { width: 1280, height: 800 }
                });
                const page = await context.newPage();

                try {
                  await page.goto(config.pageUrl, { waitUntil: 'domcontentloaded', timeout: 15000 }).catch(() => {});
                  await page.waitForTimeout(2000);

                  const imgBuffer = await page.evaluate(async (imgUrl) => {
                    try {
                      const response = await fetch(imgUrl);
                      const buffer = await response.arrayBuffer();
                      return Array.from(new Uint8Array(buffer));
                    } catch (e) {
                      return null;
                    }
                  }, config.imageUrl);

                  if (imgBuffer && imgBuffer.length > 1000) {
                    const buffer = Buffer.from(imgBuffer);
                    fsMod.mkdirSync(pathMod.dirname(config.outputPath), { recursive: true });
                    fsMod.writeFileSync(config.outputPath, buffer);
                    console.log('SUCCESS');
                  } else {
                    console.log('FAILED_SIZE');
                  }
                } catch (e) {
                  console.log('FAILED_ERROR');
                } finally {
                  await browser.close();
                }
              })();
            `;
          await fs.writeFile(scriptPath, scriptContent)

          const { stdout } = await exec(`node ${shellQuote(scriptPath)} ${shellQuote(configPath)}`, { cwd: process.cwd(), timeout: 45000 })
          await fs.unlink(scriptPath).catch(() => {})
          await fs.unlink(configPath).catch(() => {})

          if (stdout.includes("SUCCESS")) {
            finalImageUrl = relativePath
            crawled.imageUrl = finalImageUrl // Update for MDX frontmatter
          } else {
            console.warn(`[404-replace] Playwright image download failed for: ${finalImageUrl}`)
          }
        } catch (e) {
          console.warn(`[404-replace] Playwright image download error:`, e)
        }
      }

      const rawImages = await fs.readFile(PRODUCT_IMAGES_FILE, "utf8")
      const images = JSON.parse(rawImages.replace(/^\uFEFF/, "")) as Record<string, string>
      images[replacementSlug] = finalImageUrl
      await fs.writeFile(PRODUCT_IMAGES_FILE, JSON.stringify(images, null, 2), "utf8")
    } catch {
      // non-fatal
    }
  }

  // Delete old AI image if it exists so it gets regenerated
  reportProgress?.("Forbereder nye produktmedier...")
  try {
    const oldAiImagePath = path.join(process.cwd(), "public", "images", "products", `test-${categorySlug}-${replacementSlug}.png`)
    await fs.unlink(oldAiImagePath)
  } catch {
    // ignore if it doesn't exist
  }

  // 4) Refresh product source text so card/content reflects the new linked product.
  reportProgress?.("Opdaterer produktdata og frontmatter...")
  await updateProductMdxFromCrawled(replacementSlug, crawled)

  reportProgress?.("Genererer ny produkttekst...")
  try {
    if (!SAFE_SLUG_RE.test(replacementSlug)) throw new Error("Ugyldigt slug-format for rewrite")
    await exec(`npx tsx scripts/rewrite-product-content.ts --slug ${shellQuote(replacementSlug)}`, {
      cwd: process.cwd(),
      timeout: 120000,
      windowsHide: true,
    })
  } catch (e) {
    console.error(`AI rewrite failed for ${replacementSlug}:`, e)
  }

  reportProgress?.("Bygger om kategorisidan...")
  const safeSlugsArg = rebuiltProductSlugs.join(",")
  if (!/^[a-z0-9][a-z0-9,-]*[a-z0-9]$/.test(safeSlugsArg)) {
    throw new Error("Product slugs indeholder ugyldige tegn")
  }
  await exec(`npx tsx scripts/rebuild-category-pages.ts ${shellQuote(categorySlug)} --product-slugs ${shellQuote(safeSlugsArg)} --preserve-non-product-content`, {
    cwd: process.cwd(),
    timeout: 480000,
    windowsHide: true,
  })

  const heroRegenerated = false

  // Only remove the stale 404 row after the category rebuild has succeeded.
  reportProgress?.("Rydder op og opdaterer admin-listen...")
  await removeStaleBrokenLinkRows(productSlug, previousUrl, replacementSlug, newUrl)

  reportProgress?.("Revaliderer sider...")
  for (const pagePath of collectPathsForRevalidation(testPageUrl, categoryPageUrls)) {
    revalidatePath(pagePath)
  }

  return {
    ok: true,
    productSlug: replacementSlug,
    previousProductSlug: productSlug,
    replacedCategoryProductSlug: currentCategoryProductSlug,
    matchedBy: replacementTarget.matchedBy,
    categorySlug,
    rebuildCompleted: true,
    heroRegenerated,
  }
}

export async function GET(request: Request) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Obehörig" }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const jobId = String(searchParams.get("jobId") || "").trim()
  if (!jobId) {
    return NextResponse.json({ error: "Saknar jobId" }, { status: 400 })
  }

  const job = getReplaceJobsState().jobs.get(jobId)
  if (!job) {
    return NextResponse.json({
      jobId,
      phase: "failed",
      message: "Jobstatusen tappades efter en serveromstart eller Fast Refresh. Kontrollera testsidan och ladda om /admin/404.",
      error: "Jobbet hittades inte",
      result: null,
      elapsedSeconds: 0,
      updatedAt: Date.now(),
    })
  }

  return NextResponse.json(serializeReplaceJob(job))
}

export async function POST(request: Request) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Obehörig" }, { status: 401 })
  }

  try {
    const body = await request.json()
    const job = createReplaceJob("⏳ Venter i kø. Starter automatisk, når tidligere opdatering er færdig.")

    void runReplaceExclusively(async () => {
      try {
        updateReplaceJob(job.id, {
          phase: "running",
          message: "Starter opdatering...",
        })

        const result = await handleReplace(body, (message) => {
          updateReplaceJob(job.id, {
            phase: "running",
            message,
          })
        })

        const fallbackNote =
          result.matchedBy === "position"
            ? " (matchad mot nuvarande plats i testet)"
            : result.matchedBy === "url"
              ? " (matchad mot nuvarande butikslänk)"
              : ""

        updateReplaceJob(job.id, {
          phase: "completed",
          message: `✅ DONE! Produkt och kategorisida är uppdaterade.${fallbackNote}`,
          result,
        })
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Kunde inte byta 404-länk"
        updateReplaceJob(job.id, {
          phase: "failed",
          message,
          error: message,
        })
      }
    })

    return NextResponse.json({
      ok: true,
      jobId: job.id,
      phase: job.phase,
      message: job.message,
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Kunde inte byta 404-länk"
    return NextResponse.json(
      { error: message },
      { status: 500 },
    )
  }
}

