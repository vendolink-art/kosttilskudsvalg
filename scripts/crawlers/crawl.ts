/**
 * crawl.ts
 *
 * Main crawler engine. Fetches product pages from stores and extracts
 * product data (name, price, images, ingredients, etc.) using store-specific parsers.
 *
 * Usage:
 *   npx tsx scripts/crawlers/crawl.ts --url "https://www.healthwell.dk/product"
 *   npx tsx scripts/crawlers/crawl.ts --store healthwell --limit 10
 *   npx tsx scripts/crawlers/crawl.ts --all --limit 50
 *
 * Output: content/crawled-products/{store}/{slug}.json
 */

import { promises as fs } from "fs"
import path from "path"
import { execFile as execFileCb } from "child_process"
import { promisify } from "util"
import type { StoreCrawler, CrawledProduct } from "./types"
import { fetchWithPlaywright, closeBrowser } from "./playwright-fetcher"
import { load, text } from "./base-parser"
import { healthwell } from "./stores/healthwell"
import {
  med24, bodystore, corenutrition, proteinDk,
  mmsportsstore, weightworld, helsegrossisten,
  bodylab, flowlife, upcare, musclepain,
} from "./stores/generic"

// ═══════════════════════════════════════
// REGISTRY OF ALL STORE CRAWLERS
// ═══════════════════════════════════════

const ALL_CRAWLERS: StoreCrawler[] = [
  healthwell,
  med24,
  bodystore,
  corenutrition,
  proteinDk,
  mmsportsstore,
  weightworld,
  helsegrossisten,
  bodylab,
  flowlife,
  upcare,
  musclepain,
]

const DOMAIN_TO_CRAWLER = new Map<string, StoreCrawler>()
for (const c of ALL_CRAWLERS) {
  for (const d of c.domains) {
    DOMAIN_TO_CRAWLER.set(d, c)
  }
}

// ═══════════════════════════════════════
// FETCH WITH RETRIES + RATE LIMIT
// ═══════════════════════════════════════

const USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"
const DELAY_MS = 1500 // polite delay between requests
const SAFE_DELAY_MS = 4500
const SAFE_DELAY_JITTER_MS = 1800

type DomainThrottlePolicy = {
  minDelayMs: number
  jitterMs: number
  maxRetries: number
  retryBaseMs: number
  blockCooldownMs: number
}

const DEFAULT_POLICY: DomainThrottlePolicy = {
  minDelayMs: 1500,
  jitterMs: 500,
  maxRetries: 2,
  retryBaseMs: 2000,
  blockCooldownMs: 12000,
}

const DOMAIN_POLICIES: Record<string, DomainThrottlePolicy> = {
  "corenutrition.dk": {
    minDelayMs: 8000,
    jitterMs: 2500,
    maxRetries: 4,
    retryBaseMs: 7000,
    blockCooldownMs: 45000,
  },
  "healthwell.dk": {
    minDelayMs: 7000,
    jitterMs: 2000,
    maxRetries: 3,
    retryBaseMs: 6000,
    blockCooldownMs: 35000,
  },
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))
const execFile = promisify(execFileCb)

const lastRequestAt = new Map<string, number>()

function normalizeDomainFromUrl(url: string): string {
  return new URL(url).hostname.replace(/^www\./, "").toLowerCase()
}

function policyForDomain(domain: string): DomainThrottlePolicy {
  return DOMAIN_POLICIES[domain] || DEFAULT_POLICY
}

function randomJitter(maxMs: number): number {
  if (maxMs <= 0) return 0
  return Math.floor(Math.random() * (maxMs + 1))
}

async function throttleDomain(domain: string): Promise<void> {
  const policy = policyForDomain(domain)
  const now = Date.now()
  const last = lastRequestAt.get(domain) || 0
  const minGap = policy.minDelayMs + randomJitter(policy.jitterMs)
  const waitMs = Math.max(0, minGap - (now - last))
  if (waitMs > 0) {
    console.log(`  ⏱ ${domain}: throttling ${Math.ceil(waitMs / 1000)}s`)
    await sleep(waitMs)
  }
  lastRequestAt.set(domain, Date.now())
}

async function fetchPage(url: string): Promise<string> {
  const domain = normalizeDomainFromUrl(url)
  const policy = policyForDomain(domain)

  for (let attempt = 0; attempt <= policy.maxRetries; attempt++) {
    await throttleDomain(domain)
    try {
      const res = await fetch(url, {
        headers: {
          "User-Agent": USER_AGENT,
          "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "Accept-Language": "da-DK,da;q=0.9,en;q=0.8",
        },
        redirect: "follow",
      })
      if (!res.ok) {
        const isBlocked = res.status === 429 || res.status === 403 || res.status === 503
        if (isBlocked && attempt < policy.maxRetries) {
          const blockWait = policy.blockCooldownMs + randomJitter(policy.jitterMs)
          console.warn(`  ⛔ ${domain} returned ${res.status}, cooling down ${Math.ceil(blockWait / 1000)}s...`)
          await sleep(blockWait)
          continue
        }
        // Don't keep retrying stale/dead URLs.
        throw new Error(isBlocked ? `HTTP_RETRYABLE ${res.status}` : `HTTP_NONRETRY ${res.status}`)
      }
      return await res.text()
    } catch (e: any) {
      if (typeof e?.message === "string" && e.message.startsWith("HTTP_NONRETRY")) {
        throw new Error(e.message.replace("HTTP_NONRETRY ", "HTTP "))
      }
      if (attempt < policy.maxRetries) {
        const backoff = policy.retryBaseMs * Math.pow(2, attempt) + randomJitter(policy.jitterMs)
        console.warn(`  ↻ Retry ${attempt + 1}/${policy.maxRetries} for ${domain} in ${Math.ceil(backoff / 1000)}s`)
        await sleep(backoff)
        continue
      }
      throw e
    }
  }
  return ""
}

async function fetchPageViaCurl(url: string): Promise<string> {
  const marker = "__KOSTMAG_HTTP_STATUS__:"
  const args = [
    "-sS",
    "-L",
    "--compressed",
    "-A",
    USER_AGENT,
    "-H",
    "Accept: text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "-H",
    "Accept-Language: da-DK,da;q=0.9,en;q=0.8",
    "-w",
    `\\n${marker}%{http_code}\\n`,
    url,
  ]
  const { stdout } = await execFile("curl.exe", args, {
    windowsHide: true,
    maxBuffer: 20 * 1024 * 1024,
  })
  const idx = stdout.lastIndexOf(marker)
  if (idx === -1) return stdout
  const html = stdout.slice(0, idx).trim()
  const statusText = stdout.slice(idx + marker.length).trim()
  const statusCode = parseInt(statusText, 10)
  if (Number.isFinite(statusCode) && statusCode >= 400) {
    throw new Error(`HTTP ${statusCode}`)
  }
  return html
}

function extractYotpoMetaFromHtml(html: string): { appKey: string; productId: string } | null {
  const appKey =
    // Prefer the widget.js app key (matches what the page uses to render reviews).
    html.match(/staticw2\.yotpo\.com\/([^/]+)\/widget\.js/i)?.[1] ||
    html.match(/\bdata-appkey\s*=\s*"([^"]+)"/i)?.[1] ||
    ""
  const productId =
    html.match(/\bdata-yotpo-product-id\s*=\s*"([^"]+)"/i)?.[1] ||
    html.match(/\bdata-product-id\s*=\s*"([^"]+)"/i)?.[1] ||
    ""
  if (!appKey || !productId) return null
  return { appKey: String(appKey).trim(), productId: String(productId).trim() }
}

async function fetchYotpoReviews(meta: { appKey: string; productId: string }): Promise<Array<any>> {
  // Public widget endpoint used by Yotpo embeds.
  const perPage = 10
  const maxPages = 3 // polite + bounded
  const out: any[] = []

  for (let page = 1; page <= maxPages; page++) {
    const url =
      `https://api.yotpo.com/v1/widget/${encodeURIComponent(meta.appKey)}` +
      `/products/${encodeURIComponent(meta.productId)}/reviews.json` +
      `?per_page=${perPage}&page=${page}`
    const res = await fetch(url, {
      headers: {
        "User-Agent": USER_AGENT,
        "Accept": "application/json,text/plain,*/*",
        "Accept-Language": "da-DK,da;q=0.9,en;q=0.8",
      },
    })
    if (!res.ok) break
    const json: any = await res.json()
    const reviews = json?.response?.reviews
    const arr = Array.isArray(reviews) ? reviews : []
    for (const r of arr) out.push(r)
    if (arr.length < perPage) break
    await sleep(350)
  }

  return out
}

function normalizeYotpoReviews(raw: any[]): NonNullable<CrawledProduct["reviews"]> {
  const out: NonNullable<CrawledProduct["reviews"]> = []
  for (const r of raw) {
    if (!r || typeof r !== "object") continue
    const content = String((r as any).content || "").replace(/\s+/g, " ").trim()
    const title = String((r as any).title || "").replace(/\s+/g, " ").trim()
    if (!content && !title) continue

    const ratingValue = (r as any).score != null ? Number((r as any).score) : null
    const datePublished = String((r as any).created_at || (r as any).updated_at || "").trim()
    const author = String((r as any)?.user?.display_name || (r as any)?.user?.name || (r as any)?.user?.email || "").trim()

    out.push({
      author,
      ratingValue: Number.isFinite(ratingValue as any) ? (ratingValue as number) : null,
      bestRating: 5,
      datePublished,
      headline: title.slice(0, 200),
      body: content.slice(0, 800),
    })
    if (out.length >= 25) break
  }
  return out
}

function decodeHtmlEntities(input: string): string {
  return String(input || "")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
}

function cleanInlineText(input: string): string {
  return String(input || "").replace(/\s+/g, " ").trim()
}

function extractBodylabDeclarationUrl(html: string, pageUrl: string): string | null {
  const encodedAttr =
    html.match(/data-declaration=&quot;([^"]+?)&quot;/i)?.[1] ||
    html.match(/data-declaration="([^"]+?)"/i)?.[1] ||
    ""
  const fallbackPath = html.match(/\/declaration\/\?[^"'<> ]+/i)?.[0] || ""
  const candidate = encodedAttr || fallbackPath
  if (!candidate) return null
  const rel = decodeHtmlEntities(candidate)
    .replace(/["'>].*$/, "")
    .trim()
  if (!rel.startsWith("/declaration/?")) return null
  try {
    return new URL(rel, pageUrl).toString()
  } catch {
    return null
  }
}

function parseBodylabDeclaration(html: string): Partial<CrawledProduct> {
  const $ = load(html)
  const out: Partial<CrawledProduct> = {}

  const flavors = $("#choose a")
    .map((_, el) => cleanInlineText(text($(el))))
    .get()
    .filter(Boolean)
  if (flavors.length) out.flavors = Array.from(new Set(flavors)).slice(0, 20)

  const tables = $("table").toArray()
  let nutritionInfo = ""
  let ingredients = ""
  let dosage = ""

  for (const t of tables) {
    const $t = $(t)
    const header = cleanInlineText(text($t.find("th").first()))
    const bodyText = cleanInlineText(text($t))
    const contentText = cleanInlineText(text($t.find("td")))
    if (!header && !bodyText) continue

    if (/Indhold pr daglig dosis/i.test(header)) {
      nutritionInfo = bodyText
      continue
    }
    if (/Ingredienser/i.test(header)) {
      ingredients = contentText || bodyText
      continue
    }
    if (/Kosttilskud/i.test(header)) {
      const source = contentText || bodyText
      const m = source.match(/Anbefalet daglig dosis\s*:[\s\S]*$/i)
      if (m) dosage = cleanInlineText(m[0])
      // Keep warning block with nutrition data when relevant.
      if (!nutritionInfo) nutritionInfo = bodyText
      else nutritionInfo = `${nutritionInfo} ${bodyText}`.trim()
    }
  }

  if (nutritionInfo) out.nutritionInfo = nutritionInfo
  if (ingredients) out.ingredients = ingredients
  if (dosage) out.dosage = dosage
  return out
}

function mergeReviews(
  current: NonNullable<CrawledProduct["reviews"]> | undefined,
  incoming: NonNullable<CrawledProduct["reviews"]> | undefined
): NonNullable<CrawledProduct["reviews"]> {
  const out: NonNullable<CrawledProduct["reviews"]> = []
  const seen = new Set<string>()
  for (const r of [...(current || []), ...(incoming || [])]) {
    if (!r) continue
    const key = [
      String(r.author || "").toLowerCase().trim(),
      String(r.headline || "").toLowerCase().trim(),
      String(r.body || "").toLowerCase().trim().slice(0, 180),
      String(r.datePublished || "").toLowerCase().trim(),
    ].join("|")
    if (!key.replace(/\|/g, "")) continue
    if (seen.has(key)) continue
    seen.add(key)
    out.push(r)
  }
  return out
}

// ═══════════════════════════════════════
// FIND CRAWLER FOR URL
// ═══════════════════════════════════════

function findCrawler(url: string): StoreCrawler | null {
  try {
    const domain = new URL(url).hostname.replace(/^www\./, "")
    return DOMAIN_TO_CRAWLER.get(domain) || DOMAIN_TO_CRAWLER.get("www." + domain) || null
  } catch {
    return null
  }
}

// ═══════════════════════════════════════
// SAVE RESULT
// ═══════════════════════════════════════

const OUTPUT_BASE = path.join(process.cwd(), "content", "crawled-products")

async function loadAlreadyCrawledSourceUrls(): Promise<Set<string>> {
  const seen = new Set<string>()

  async function walk(dir: string): Promise<void> {
    let entries: Array<{ name: string; isDirectory: () => boolean }>
    try {
      entries = await fs.readdir(dir, { withFileTypes: true }) as any
    } catch {
      return
    }

    for (const entry of entries) {
      const full = path.join(dir, entry.name)
      if (entry.isDirectory()) {
        await walk(full)
        continue
      }
      if (!entry.name.endsWith(".json")) continue
      try {
        const raw = await fs.readFile(full, "utf8")
        const parsed = JSON.parse(raw)
        const sourceUrl = typeof parsed?.sourceUrl === "string" ? parsed.sourceUrl.trim() : ""
        if (sourceUrl) seen.add(sourceUrl)
      } catch {
        // ignore malformed cache files
      }
    }
  }

  await walk(OUTPUT_BASE)
  return seen
}

function interleaveByStore(urls: string[]): string[] {
  const queueByStore = new Map<string, string[]>()
  for (const url of urls) {
    const crawler = findCrawler(url)
    const storeId = crawler?.storeId || "unknown"
    if (!queueByStore.has(storeId)) queueByStore.set(storeId, [])
    queueByStore.get(storeId)!.push(url)
  }

  const stores = [...queueByStore.keys()].sort()
  const out: string[] = []
  let hasMore = true
  while (hasMore) {
    hasMore = false
    for (const s of stores) {
      const q = queueByStore.get(s)!
      if (q.length > 0) {
        out.push(q.shift()!)
        hasMore = true
      }
    }
  }
  return out
}

function parseExcludeStores(raw?: string): Set<string> {
  if (!raw) return new Set()
  return new Set(
    raw
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
  )
}

function activeCrawlers(storeFilter?: string, excludedStores?: Set<string>): StoreCrawler[] {
  const base = storeFilter
    ? ALL_CRAWLERS.filter((c) => c.storeId === storeFilter)
    : ALL_CRAWLERS
  return base.filter((c) => !excludedStores?.has(c.storeId))
}

async function saveProduct(product: CrawledProduct): Promise<string> {
  const storeDir = path.join(OUTPUT_BASE, product.store)
  await fs.mkdir(storeDir, { recursive: true })

  // Create a slug from the product name
  const slug = product.name
    .toLowerCase()
    .replace(/[æ]/g, "ae").replace(/[ø]/g, "oe").replace(/[å]/g, "aa")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "unknown"

  const outPath = path.join(storeDir, `${slug}.json`)
  await fs.writeFile(outPath, JSON.stringify(product, null, 2), "utf-8")
  return outPath
}

async function saveHtmlSnapshot(input: { html: string; url: string; storeId: string }): Promise<string> {
  const base = path.join(process.cwd(), "content", "crawled-html", input.storeId)
  await fs.mkdir(base, { recursive: true })
  const u = new URL(input.url)
  const slug = u.pathname
    .toLowerCase()
    .replace(/[æ]/g, "ae").replace(/[ø]/g, "oe").replace(/[å]/g, "aa")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 100) || "page"
  const outPath = path.join(base, `${slug}.html`)
  await fs.writeFile(outPath, input.html, "utf-8")
  return outPath
}

// ═══════════════════════════════════════
// MAIN: CRAWL SINGLE URL
// ═══════════════════════════════════════

export async function crawlUrl(
  url: string,
  opts?: { dumpHtml?: boolean },
): Promise<CrawledProduct | null> {
  const crawler = findCrawler(url)
  if (!crawler) {
    console.error(`  ✗ No crawler for: ${url}`)
    return null
  }

  try {
    let html: string

    if (crawler.needsJs) {
      // Use Playwright headless browser for JS-rendered stores
      html = await fetchWithPlaywright(url, crawler.waitForSelector, 15000, crawler.preCaptureActions)
    } else {
      // Fast HTTP fetch for server-rendered stores with curl fallback for TLS/bot edge cases.
      try {
        html = await fetchPage(url)
      } catch (e: any) {
        const msg = String(e?.message || "")
        if (/HTTP \d+/.test(msg)) throw e
        console.warn("  ↻ Native fetch failed, trying curl fallback...")
        html = await fetchPageViaCurl(url)
      }
    }

    if (opts?.dumpHtml) {
      const htmlPath = await saveHtmlSnapshot({ html, url, storeId: crawler.storeId })
      console.log(`  ⧉ HTML snapshot saved: ${htmlPath}`)
    }

    const product = crawler.parse(html, url)

    // Bodylab exposes detailed ingredients/nutrition in a declaration endpoint.
    // Fetch and merge this block to avoid truncated fallback text.
    if (crawler.storeId === "bodylab") {
      try {
        const declarationUrl = extractBodylabDeclarationUrl(html, url)
        if (declarationUrl) {
          const declarationHtml = await fetchPage(declarationUrl)
          const declarationData = parseBodylabDeclaration(declarationHtml)
          if (declarationData.flavors && declarationData.flavors.length) {
            product.flavors = declarationData.flavors
          }
          if (declarationData.ingredients) product.ingredients = declarationData.ingredients
          if (declarationData.nutritionInfo) product.nutritionInfo = declarationData.nutritionInfo
          if (declarationData.dosage) product.dosage = declarationData.dosage
        }
      } catch {
        // Non-fatal: keep generic fields.
      }
    }

    // Reviews are often loaded dynamically (e.g. Yotpo widgets).
    // Top up review bodies from Yotpo API to reach up to 20 where available.
    try {
      const hasCount = typeof (product as any).reviewCount === "number" && (product as any).reviewCount > 0
      const current = Array.isArray(product.reviews) ? product.reviews : []
      const targetCount = hasCount
        ? Math.min(20, Math.max(1, Math.floor((product as any).reviewCount)))
        : 20
      if (current.length < targetCount) {
        const yotpo = extractYotpoMetaFromHtml(html)
        if (yotpo) {
          const rawReviews = await fetchYotpoReviews(yotpo)
          const normalized = normalizeYotpoReviews(rawReviews)
          if (normalized.length > 0) {
            const merged = mergeReviews(current, normalized)
            product.reviews = merged.slice(0, targetCount)
          }
        }
      }
    } catch {
      // Non-fatal: fall back to aggregate rating/count only.
    }

    // Reject error pages that parsed as products
    if (isErrorPage(product.name)) {
      console.error(`  ✗ Error page detected: "${product.name.slice(0, 50)}"`)
      return null
    }

    return product
  } catch (e: any) {
    console.error(`  ✗ Failed to crawl ${url}: ${e.message}`)
    return null
  }
}

// ═══════════════════════════════════════
// MAIN: CRAWL FROM SQL URLS
// ═══════════════════════════════════════

async function loadStoreUrls(storeFilter?: string, excludedStores?: Set<string>): Promise<string[]> {
  // Read the store-domains.json and the SQL-extracted URLs
  // We'll re-extract unique product URLs from the SQL dump
  const { createReadStream } = await import("fs")
  const { createInterface } = await import("readline")
  const sqlFile = path.join(process.cwd(), "kostmagasinet_dk-db-2026-02-06.sql")

  const urls = new Set<string>()
  const rl = createInterface({
    input: createReadStream(sqlFile, { encoding: "utf-8" }),
    crlfDelay: Infinity,
  })

  const storeDomains = activeCrawlers(storeFilter, excludedStores).flatMap((c) => c.domains)

  for await (const line of rl) {
    const urlRegex = /https?:\/\/[^\s'",)\\]+/g
    let match: RegExpExecArray | null
    while ((match = urlRegex.exec(line)) !== null) {
      let url = match[0].replace(/\\+$/, "").replace(/'+$/, "").replace(/;$/, "")
      // Skip truncated URLs (ending mid-word or with a dash)
      if (url.length < 30) continue
      if (url.endsWith("-") || url.endsWith("...")) continue
      // Skip URLs that contain another URL (corrupted extraction)
      if ((url.match(/https?:\/\//g) || []).length > 1) continue
      try {
        const domain = new URL(url).hostname.replace(/^www\./, "")
        if (storeDomains.some(d => d.replace(/^www\./, "") === domain)) {
          // Only include product pages (skip category/listing pages)
          if (isProductUrl(url)) {
            urls.add(url)
          }
        }
      } catch { /* skip invalid */ }
    }
  }

  return [...urls]
}

async function loadBuyLinkUrls(storeFilter?: string, excludedStores?: Set<string>): Promise<string[]> {
  const file = path.join(process.cwd(), "content", "product-buy-links.json")
  const raw = await fs.readFile(file, "utf8")
  const parsed = JSON.parse(raw.replace(/^\uFEFF/, "")) as Record<string, string>
  const urls = new Set<string>()
  const storeDomains = activeCrawlers(storeFilter, excludedStores).flatMap((c) => c.domains)

  for (const value of Object.values(parsed)) {
    const url = String(value || "").trim()
    if (!url || !/^https?:\/\//i.test(url)) continue
    try {
      const domain = new URL(url).hostname.replace(/^www\./, "")
      if (storeDomains.some(d => d.replace(/^www\./, "") === domain) && isProductUrl(url)) {
        urls.add(url)
      }
    } catch {
      // skip invalid
    }
  }

  return [...urls]
}

async function loadUrlsFromFile(filePath: string, storeFilter?: string, excludedStores?: Set<string>): Promise<string[]> {
  const raw = await fs.readFile(filePath, "utf8")
  const urls = new Set<string>()
  const storeDomains = activeCrawlers(storeFilter, excludedStores).flatMap((c) => c.domains)

  for (const line of raw.split(/\r?\n/)) {
    const url = String(line || "").trim()
    if (!url || !/^https?:\/\//i.test(url)) continue
    try {
      const domain = new URL(url).hostname.replace(/^www\./, "")
      if (storeDomains.some(d => d.replace(/^www\./, "") === domain) && isProductUrl(url)) {
        urls.add(url)
      }
    } catch {
      // skip invalid
    }
  }

  return [...urls]
}

/** Detect error/404 pages that parsed as "products" */
function isErrorPage(name: string): boolean {
  if (!name) return true
  const lower = name.toLowerCase()
  return (
    lower.includes("404") ||
    lower.includes("ikke fundet") ||
    lower.includes("not found") ||
    lower.includes("hittades inte") ||
    lower.includes("ups!") ||
    lower.includes("søgeresultat for") ||
    lower.includes("error") ||
    lower.includes("page not found") ||
    lower.includes("kan ikke find") ||
    lower.includes("desværre")
  )
}

function isProductUrl(url: string): boolean {
  const path = new URL(url).pathname.toLowerCase()
  // Skip obvious listing/category pages
  if (path === "/" || path === "") return false
  if (path.includes("/category") || path.includes("/kategori")) return false
  if (path.includes("/search") || path.includes("/soeg")) return false
  if (path.includes("/page/") || path.includes("/brand/")) return false
  // Product pages usually have at least 2 path segments or end with an ID
  const segments = path.split("/").filter(Boolean)
  return segments.length >= 1
}

// ═══════════════════════════════════════
// CLI
// ═══════════════════════════════════════

async function main() {
  const args = process.argv.slice(2)
  const getArg = (flag: string): string | undefined => {
    const i = args.indexOf(flag)
    return i !== -1 ? args[i + 1] : undefined
  }

  console.log("═══════════════════════════════════════")
  console.log("  Kostmagasinet Store Crawler")
  console.log("═══════════════════════════════════════\n")

  console.log("Available stores:", ALL_CRAWLERS.map(c => c.storeId).join(", "))
  console.log()

  // Mode 1: Single URL
  const singleUrl = getArg("--url")
  if (singleUrl) {
    const url = singleUrl
    const dumpHtml = args.includes("--dump-html")
    console.log(`Crawling single URL: ${url}\n`)
    const product = await crawlUrl(url, { dumpHtml })
    if (product) {
      const outPath = await saveProduct(product)
      console.log(`\n  ✓ ${product.name}`)
      console.log(`    Brand: ${product.brand}`)
      console.log(`    Price: ${product.price}`)
      console.log(`    Image: ${product.imageUrl?.slice(0, 80)}`)
      console.log(`    Size: ${product.size}`)
      console.log(`    Saved: ${outPath}`)
    }
    await closeBrowser()
    return
  }

  // Mode 2: Crawl store
  const storeFilter = getArg("--store")
  const urlFile = getArg("--url-file")
  const limit = parseInt(getArg("--limit") || "50") || 50
  const offset = Math.max(0, parseInt(getArg("--offset") || "0") || 0)
  const all = args.includes("--all")
  const safe = args.includes("--safe")
  const skipExisting = !args.includes("--no-skip-existing")
  const roundRobin = all && (safe || !args.includes("--no-round-robin"))
  const useSqlSource = args.includes("--from-sql")
  const excludedStores = parseExcludeStores(getArg("--exclude-stores"))

  if (!storeFilter && !all && !urlFile) {
    console.log("Usage:")
    console.log("  npx tsx scripts/crawlers/crawl.ts --url <url>")
    console.log("  npx tsx scripts/crawlers/crawl.ts --url-file <file> [--store healthwell]")
    console.log("  npx tsx scripts/crawlers/crawl.ts --store healthwell --limit 10 [--offset 0]")
    console.log("  npx tsx scripts/crawlers/crawl.ts --all --limit 50 [--safe] [--offset 0]")
    console.log("  Optional: --dump-html (single-url mode only)")
    console.log("  Optional: --exclude-stores corenutrition,healthwell")
    console.log("  (default URL source: content/product-buy-links.json, add --from-sql for SQL dump)")
    return
  }

  if (storeFilter && excludedStores.has(storeFilter)) {
    console.log(`Store "${storeFilter}" is excluded via --exclude-stores. Nothing to crawl.`)
    return
  }

  const sourceLabel = urlFile ? path.relative(process.cwd(), urlFile) : useSqlSource ? "SQL dump" : "product-buy-links.json"
  console.log(`Loading product URLs from ${sourceLabel}...`)
  let urls = urlFile
    ? await loadUrlsFromFile(urlFile, storeFilter || undefined, excludedStores)
    : useSqlSource
      ? await loadStoreUrls(storeFilter || undefined, excludedStores)
      : await loadBuyLinkUrls(storeFilter || undefined, excludedStores)
  const excludedText = excludedStores.size > 0 ? ` (excluded: ${[...excludedStores].join(", ")})` : ""
  console.log(`Found ${urls.length} product URLs${storeFilter ? ` for ${storeFilter}` : ""}${excludedText}`)

  if (skipExisting) {
    const existing = await loadAlreadyCrawledSourceUrls()
    const before = urls.length
    urls = urls.filter((u) => !existing.has(u))
    console.log(`Skipping already crawled URLs: ${before - urls.length}`)
  }

  if (roundRobin) {
    urls = interleaveByStore(urls)
    console.log(`Round-robin mode: ON (${safe ? "safe profile" : "default"})`)
  }

  const selected = urls.slice(offset, offset + limit)
  const perRequestDelay = safe ? SAFE_DELAY_MS : DELAY_MS
  const perRequestJitter = safe ? SAFE_DELAY_JITTER_MS : 300
  console.log(`Crawling ${selected.length} URLs (offset ${offset}, limit ${limit})`)
  console.log(`Global pacing: ${perRequestDelay}ms + jitter (${perRequestJitter}ms)\n`)
  let success = 0
  let failed = 0

  for (const url of selected) {
    const product = await crawlUrl(url)
    if (product && product.name) {
      const outPath = await saveProduct(product)
      console.log(`  ✓ [${success + 1}/${selected.length}] ${product.name.slice(0, 60)} → ${product.store}`)
      success++
    } else {
      console.log(`  ✗ [${success + failed + 1}/${selected.length}] ${url.slice(0, 70)}`)
      failed++
    }
    await sleep(perRequestDelay + randomJitter(perRequestJitter))
  }

  // Clean up Playwright browser if it was used
  await closeBrowser()

  console.log(`\n═══════════════════════════════════════`)
  console.log(`  Done! Success: ${success} | Failed: ${failed}`)
  console.log(`  Next offset suggestion: ${offset + selected.length}`)
  console.log(`  Output: ${OUTPUT_BASE}`)
  console.log(`═══════════════════════════════════════`)
}

main().catch(async (e) => {
  await closeBrowser()
  console.error(e)
  process.exit(1)
})
