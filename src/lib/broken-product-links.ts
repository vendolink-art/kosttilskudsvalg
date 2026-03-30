import { promises as fs, existsSync } from "fs"
import path from "path"
import { SLUG_TO_SILO } from "./silo-config"
import { chromium, type Browser } from "playwright"

export interface BrokenLinkRow {
  productSlug: string
  outgoingUrl: string
  statusCode: number
  testPageUrl: string | null
  testPosition: number | null
  categoryPageUrls: string[]
}

export interface BrokenLinkScanProgress {
  completed: number
  total: number
  productSlug: string
  outgoingUrl: string
  statusCode: number
}

const BUY_LINKS_FILE = path.join(process.cwd(), "content", "product-buy-links.json")
const CATEGORY_DIR = path.join(process.cwd(), "src", "app", "(da)", "kosttilskud")
const REQUEST_TIMEOUT_MS = 10000
// Keep global concurrency modest; per-domain throttling below further reduces load.
const CONCURRENCY = 10

// Use a browser-like UA to reduce the chance of WAF bot blocks.
const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"

type DomainPolicy = {
  maxInFlight: number
  minDelayMs: number
  jitterMs: number
  blockCooldownMs: number
}

const DEFAULT_DOMAIN_POLICY: DomainPolicy = {
  maxInFlight: 2,
  minDelayMs: 1200,
  jitterMs: 400,
  blockCooldownMs: 12000,
}

// These stores are sensitive to burst traffic; be extra polite.
const DOMAIN_POLICIES: Record<string, DomainPolicy> = {
  "corenutrition.dk": {
    maxInFlight: 1,
    minDelayMs: 8000,
    jitterMs: 2500,
    blockCooldownMs: 45000,
  },
  "healthwell.dk": {
    maxInFlight: 1,
    minDelayMs: 7000,
    jitterMs: 2000,
    blockCooldownMs: 35000,
  },
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

function normalizeDomainFromUrl(url: string): string {
  return new URL(url).hostname.replace(/^www\./i, "").toLowerCase()
}

function policyForDomain(domain: string): DomainPolicy {
  return DOMAIN_POLICIES[domain] || DEFAULT_DOMAIN_POLICY
}

function randomJitter(maxMs: number): number {
  if (maxMs <= 0) return 0
  return Math.floor(Math.random() * (maxMs + 1))
}

const lastRequestAt = new Map<string, number>()
const blockedUntil = new Map<string, number>()

class Semaphore {
  private inUse = 0
  private queue: Array<() => void> = []
  private max: number

  constructor(max: number) {
    this.max = max
  }

  async acquire(): Promise<() => void> {
    if (this.inUse < this.max) {
      this.inUse += 1
      return () => this.release()
    }
    await new Promise<void>((resolve) => this.queue.push(resolve))
    this.inUse += 1
    return () => this.release()
  }

  private release() {
    this.inUse = Math.max(0, this.inUse - 1)
    const next = this.queue.shift()
    if (next) next()
  }
}

const domainSemaphore = new Map<string, Semaphore>()
function semaphoreForDomain(domain: string): Semaphore {
  const existing = domainSemaphore.get(domain)
  if (existing) return existing
  const sem = new Semaphore(policyForDomain(domain).maxInFlight)
  domainSemaphore.set(domain, sem)
  return sem
}

async function throttleDomain(domain: string): Promise<void> {
  const policy = policyForDomain(domain)
  const now = Date.now()
  const last = lastRequestAt.get(domain) || 0
  const minGap = policy.minDelayMs + randomJitter(policy.jitterMs)
  const waitMs = Math.max(0, minGap - (now - last))
  if (waitMs > 0) await sleep(waitMs)
  lastRequestAt.set(domain, Date.now())
}

function isRetryableBlockStatus(status: number): boolean {
  return status === 429 || status === 403 || status === 503
}

function enterCooldown(domain: string): void {
  const policy = policyForDomain(domain)
  blockedUntil.set(domain, Date.now() + policy.blockCooldownMs + randomJitter(policy.jitterMs))
}

function isInCooldown(domain: string): boolean {
  const until = blockedUntil.get(domain) || 0
  return until > Date.now()
}

// Best-effort in-memory cache to avoid repeated checks on reload.
const statusCache = new Map<string, { status: number; at: number }>()
const STATUS_CACHE_TTL_MS = 10 * 60 * 1000

const SOFT_BROKEN_BODY_PATTERNS: Array<{ domains: string[]; patterns: RegExp[] }> = [
  {
    domains: ["healthwell.dk", "corenutrition.dk"],
    patterns: [
      /produktet\s+er\s+udg[åa]et/i,
      /produkten\s+[äa]r\s+utg[åa]ngen/i,
      /udg[åa]et/i,
      /utg[åa]ngen/i,
      /ikke\s+p[åa]\s+lager/i,
      /ej\s+p[åa]\s+lager/i,
    ],
  },
]

const GENERIC_BROKEN_PAGE_PATTERNS: RegExp[] = [
  /404/i,
  /ikke\s+fundet/i,
  /not\s+found/i,
  /hittades\s+inte/i,
  /page\s+not\s+found/i,
  /kan\s+ikke\s+find/i,
  /desvaerre/i,
  /desv[æa]rre/i,
  /produktet\s+er\s+udg[åa]et/i,
  /produkten\s+[äa]r\s+utg[åa]ngen/i,
  /udg[åa]et/i,
  /utg[åa]ngen/i,
  /ikke\s+p[åa]\s+lager/i,
  /ej\s+p[åa]\s+lager/i,
  /out\s+of\s+stock/i,
  /discontinued/i,
  /s[øo]geresultat\s+for/i,
]

let softBrokenBrowserPromise: Promise<Browser> | null = null
const SYSTEM_BROWSER_PATHS = [
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
]

function timeoutSignal(ms: number): AbortSignal {
  // Node 18+ supports AbortSignal.timeout; keep fallback for safety.
  const anySignal = AbortSignal as unknown as { timeout?: (ms: number) => AbortSignal }
  if (typeof anySignal.timeout === "function") return anySignal.timeout(ms)

  const controller = new AbortController()
  const id = setTimeout(() => controller.abort(), ms)
  // Avoid keeping the event loop alive unnecessarily.
  ;(id as any).unref?.()
  return controller.signal
}

function shouldInspectBodyForSoftBroken(domain: string): boolean {
  return SOFT_BROKEN_BODY_PATTERNS.some((entry) => entry.domains.includes(domain))
}

function detectSoftBrokenFromHtml(domain: string, html: string): boolean {
  if (!html) return false
  const normalized = html
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
  const matchers = SOFT_BROKEN_BODY_PATTERNS.find((entry) => entry.domains.includes(domain))
  if (!matchers) return false
  return matchers.patterns.some((pattern) => pattern.test(normalized))
}

function normalizeComparableUrl(input: string): string {
  try {
    const u = new URL(input)
    const host = u.hostname.replace(/^www\./i, "").toLowerCase()
    const pathname = u.pathname.replace(/\/+$/, "") || "/"
    return `${u.protocol}//${host}${pathname}`.toLowerCase()
  } catch {
    return input.trim().toLowerCase().replace(/\/+$/, "")
  }
}

function normalizeLooseAscii(input: string): string {
  return String(input || "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
}

function detectGenericBrokenPage(text: string): boolean {
  if (!text) return false
  const normalized = text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
  return GENERIC_BROKEN_PAGE_PATTERNS.some((pattern) => pattern.test(normalized))
}

function isObviouslyNonProductUrl(input: string): boolean {
  try {
    const u = new URL(input)
    const pathname = (u.pathname || "/").toLowerCase()
    if (pathname === "/" || pathname === "") return true
    if (pathname.includes("/category")) return true
    if (pathname.includes("/kategori")) return true
    if (pathname.includes("/search")) return true
    if (pathname.includes("/soeg")) return true
    if (pathname.includes("/brand/")) return true
    if (pathname.includes("/collections/")) return true
    if (pathname.includes("/pages/")) return true
    return false
  } catch {
    return false
  }
}

const URL_TOKEN_STOP_WORDS = new Set([
  "shop",
  "produkt",
  "produkter",
  "product",
  "products",
  "category",
  "kategori",
  "search",
  "soeg",
  "page",
  "brand",
  "brands",
  "html",
  "capsule",
  "capsules",
  "kapsler",
  "tablet",
  "tablets",
  "tabletter",
  "serving",
  "servings",
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

function isLikelyWrongLandingPage(originalUrl: string, finalUrl: string, pageText: string): boolean {
  if (!finalUrl) return false
  if (normalizeComparableUrl(originalUrl) === normalizeComparableUrl(finalUrl)) return false
  if (isObviouslyNonProductUrl(finalUrl)) return true

  const urlTokens = extractMeaningfulUrlTokens(originalUrl)
  if (urlTokens.length < 2) return false

  const haystack = normalizeLooseAscii(`${finalUrl} ${pageText}`)
  const matchedTokens = urlTokens.filter((token) => haystack.includes(token))
  return matchedTokens.length === 0
}

async function getSoftBrokenBrowser(): Promise<Browser> {
  if (!softBrokenBrowserPromise) {
    const executablePath = SYSTEM_BROWSER_PATHS.find((candidate) => existsSync(candidate))
    softBrokenBrowserPromise = chromium.launch({
      headless: true,
      ...(executablePath ? { executablePath } : {}),
    })
  }
  return softBrokenBrowserPromise
}

async function detectSoftBrokenWithBrowser(domain: string, url: string): Promise<boolean | null> {
  try {
    const browser = await getSoftBrokenBrowser()
    const page = await browser.newPage({
      userAgent: USER_AGENT,
      locale: "da-DK",
    })
    try {
      await page.goto(url, { waitUntil: "domcontentloaded", timeout: REQUEST_TIMEOUT_MS * 6 })
      await page.waitForTimeout(2500)
      try {
        await page.locator("h1").first().waitFor({ state: "visible", timeout: 5000 })
      } catch {
        // Some discontinued pages still render without a clean product H1.
      }
      const bodyText = await page.locator("body").innerText().catch(() => "")
      const html = await page.content().catch(() => "")
      const pageTitle = await page.title().catch(() => "")
      return detectSoftBrokenFromHtml(domain, `${pageTitle}\n${bodyText}\n${html}`)
    } finally {
      await page.close()
    }
  } catch {
    return null
  }
}

async function readBuyLinks(): Promise<Record<string, string>> {
  const raw = await fs.readFile(BUY_LINKS_FILE, "utf-8")
  return JSON.parse(raw) as Record<string, string>
}

type CategoryMention = {
  url: string
  position: number | null
}

async function mapProductToCategoryPages(productSlugs: string[]): Promise<Record<string, CategoryMention[]>> {
  const byProduct: Record<string, CategoryMention[]> = {}
  for (const slug of productSlugs) byProduct[slug] = []

  const entries = await fs.readdir(CATEGORY_DIR, { withFileTypes: true })
  for (const entry of entries) {
    if (!entry.isDirectory()) continue
    if (entry.name === "produkter" || entry.name === "[slug]") continue

    const categorySlug = entry.name
    const pagePath = path.join(CATEGORY_DIR, categorySlug, "page.mdx")
    let raw = ""
    try {
      raw = await fs.readFile(pagePath, "utf-8")
    } catch {
      continue
    }

    const siloId = SLUG_TO_SILO[categorySlug]
    const categoryUrl = siloId ? `/${siloId}/${categorySlug}` : `/kosttilskud/${categorySlug}`

    const productAnchors = Array.from(raw.matchAll(/<a id="product-([^"]+)"><\/a>/g)).map((m) => m[1])
    const positionByProduct = new Map<string, number>()
    productAnchors.forEach((slug, idx) => {
      if (!positionByProduct.has(slug)) {
        positionByProduct.set(slug, idx + 1)
      }
    })

    for (const productSlug of productSlugs) {
      if (raw.includes(`product-${productSlug}`)) {
        byProduct[productSlug].push({
          url: categoryUrl,
          position: positionByProduct.get(productSlug) ?? null,
        })
      }
    }
  }

  return byProduct
}

async function getStatus(url: string): Promise<number> {
  const cached = statusCache.get(url)
  if (cached && Date.now() - cached.at < STATUS_CACHE_TTL_MS) return cached.status

  let domain = ""
  try {
    domain = normalizeDomainFromUrl(url)
  } catch {
    return 0
  }

  if (isInCooldown(domain)) return 0

  const release = await semaphoreForDomain(domain).acquire()
  try {
    await throttleDomain(domain)
    const inspectBody = shouldInspectBodyForSoftBroken(domain)

  // HEAD first (faster), then GET fallback for hosts that block HEAD.
  try {
    const headRes = await fetch(url, {
      method: "HEAD",
      redirect: "follow",
      signal: timeoutSignal(REQUEST_TIMEOUT_MS),
      headers: {
        "User-Agent": USER_AGENT,
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "da-DK,da;q=0.9,en;q=0.8",
      },
      cache: "no-store",
    })
    // If we're being rate-limited / blocked, don't immediately hammer with a GET fallback.
    if (isRetryableBlockStatus(headRes.status)) {
      enterCooldown(domain)
      statusCache.set(url, { status: headRes.status, at: Date.now() })
      return headRes.status
    }

    if (headRes.ok && isLikelyWrongLandingPage(url, headRes.url || "", "")) {
      statusCache.set(url, { status: 410, at: Date.now() })
      return 410
    }

    if (headRes.status !== 405) {
      if (inspectBody && headRes.ok) {
        const browserHit = await detectSoftBrokenWithBrowser(domain, url)
        if (browserHit === true) {
          statusCache.set(url, { status: 410, at: Date.now() })
          return 410
        }
      }
      if (!inspectBody) {
        statusCache.set(url, { status: headRes.status, at: Date.now() })
        return headRes.status
      }
    }
  } catch {
    // continue with GET fallback
  }

  try {
    const getRes = await fetch(url, {
      method: "GET",
      redirect: "follow",
      signal: timeoutSignal(REQUEST_TIMEOUT_MS),
      headers: {
        "User-Agent": USER_AGENT,
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "da-DK,da;q=0.9,en;q=0.8",
      },
      cache: "no-store",
    })
    if (isRetryableBlockStatus(getRes.status)) enterCooldown(domain)
    let finalStatus = getRes.status
    if (getRes.ok) {
      if (isLikelyWrongLandingPage(url, getRes.url || "", "")) {
        finalStatus = 410
      } else {
        const shouldReadBody = inspectBody || normalizeComparableUrl(getRes.url || "") !== normalizeComparableUrl(url)
        if (shouldReadBody) {
          const html = await getRes.text()
          if (inspectBody) {
            const browserHit = await detectSoftBrokenWithBrowser(domain, url)
            if (browserHit === true) {
              finalStatus = 410
            } else if (detectSoftBrokenFromHtml(domain, html)) {
              finalStatus = 410
            }
          }

          if (finalStatus === 200 || finalStatus === 204) {
            if (detectGenericBrokenPage(html) || isLikelyWrongLandingPage(url, getRes.url || "", html)) {
              finalStatus = 410
            }
          }
        }
      }
    }
    statusCache.set(url, { status: finalStatus, at: Date.now() })
    return finalStatus
  } catch {
    // timeout/network/blocked
    enterCooldown(domain)
    statusCache.set(url, { status: 0, at: Date.now() })
    return 0
  }
  } finally {
    release()
  }
}

async function mapLimit<T, R>(
  items: T[],
  limit: number,
  worker: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  const out: R[] = new Array(items.length)
  let next = 0

  async function runner() {
    while (true) {
      const i = next
      next += 1
      if (i >= items.length) return
      out[i] = await worker(items[i], i)
    }
  }

  const runners = Array.from({ length: Math.min(limit, items.length) }, () => runner())
  await Promise.all(runners)
  return out
}

const REPORT_FILE = path.join(process.cwd(), "content", "broken-links-report.json")

function arraysEqual(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false
  return a.every((value, index) => value === b[index])
}

async function sanitizeBrokenLinkRows(rows: BrokenLinkRow[]): Promise<BrokenLinkRow[]> {
  if (!rows.length) return []

  const buyLinks = await readBuyLinks()
  const productSlugs = Object.keys(buyLinks)
  const productToCategories = await mapProductToCategoryPages(productSlugs)

  return rows
    .flatMap((row) => {
      const currentUrl = buyLinks[row.productSlug]
      const currentMentions = productToCategories[row.productSlug] || []
      if (!currentUrl) return []
      if (currentUrl !== row.outgoingUrl) return []
      if (currentMentions.length === 0) return []

      const nextCategoryPageUrls = currentMentions.map((entry) => entry.url)
      const nextTestPageUrl = currentMentions[0]?.url || null
      const nextTestPosition = currentMentions[0]?.position || null

      const unchanged =
        row.testPageUrl === nextTestPageUrl &&
        row.testPosition === nextTestPosition &&
        arraysEqual(row.categoryPageUrls, nextCategoryPageUrls)

      if (unchanged) return [row]

      return [{
        ...row,
        testPageUrl: nextTestPageUrl,
        testPosition: nextTestPosition,
        categoryPageUrls: nextCategoryPageUrls,
      }]
    })
    .sort((a, b) => a.productSlug.localeCompare(b.productSlug))
}

export async function getBrokenProductLinksReport(): Promise<BrokenLinkRow[]> {
  try {
    const raw = await fs.readFile(REPORT_FILE, "utf8")
    const parsed = JSON.parse(raw) as BrokenLinkRow[]
    const sanitized = await sanitizeBrokenLinkRows(parsed)
    if (JSON.stringify(parsed) !== JSON.stringify(sanitized)) {
      await fs.writeFile(REPORT_FILE, JSON.stringify(sanitized, null, 2), "utf8")
    }
    return sanitized
  } catch {
    return []
  }
}

export async function generateBrokenProductLinksReport(
  onProgress?: (progress: BrokenLinkScanProgress) => void
): Promise<BrokenLinkRow[]> {
  const buyLinks = await readBuyLinks()
  const productSlugs = Object.keys(buyLinks)
  const productToCategories = await mapProductToCategoryPages(productSlugs)
  const linkedProductSlugs = productSlugs.filter((slug) => (productToCategories[slug] || []).length > 0)
  let completed = 0

  const statuses = await mapLimit(linkedProductSlugs, CONCURRENCY, async (productSlug) => {
    const url = buyLinks[productSlug]
    const statusCode = await getStatus(url)
    completed += 1
    onProgress?.({
      completed,
      total: linkedProductSlugs.length,
      productSlug,
      outgoingUrl: url,
      statusCode,
    })
    return { productSlug, url, statusCode }
  })

  return statuses
    .filter((row) => row.statusCode === 404 || row.statusCode === 410)
    .map((row) => ({
      productSlug: row.productSlug,
      outgoingUrl: row.url,
      statusCode: row.statusCode,
      testPageUrl: (productToCategories[row.productSlug] || [])[0]?.url || null,
      testPosition: (productToCategories[row.productSlug] || [])[0]?.position || null,
      categoryPageUrls: (productToCategories[row.productSlug] || []).map((entry) => entry.url),
    }))
    .sort((a, b) => a.productSlug.localeCompare(b.productSlug))
}

