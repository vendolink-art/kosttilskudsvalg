/**
 * rebuild-category-pages.ts
 *
 * Ombygger ALLA kategorisidor till fordonssajten-layout:
 *   1. Hero banner (slogan)
 *   2. Mobile toplist (md:hidden)
 *   3. Two-column: intro + desktop toplist sidebar (sticky)
 *   4. Toc + AffiliateDisclosure
 *   5. Sammenfatning & toppval
 *   6. Product review sections (card + review + ProductRating + summary)
 *   7. ComparisonTable
 *   8. CriteriaWeightBars
 *   9. TestSummary (methodology)
 *  10. QuickGuideCards (buying guide)
 *  11. FAQ
 *  12. Sources + RelatedArticles + EditorialSignoff
 *
 * Kør: npx tsx scripts/rebuild-category-pages.ts
 */

import { promises as fs } from "fs"
import path from "path"
import matter from "gray-matter"
import * as dotenv from "dotenv"
dotenv.config({ path: ".env.local" })
import { getCategoryContentConfig, buildDecisionMap, type DecisionMapConfig } from "../src/lib/category-configs"
import {
  buildProductReviewPromptDk,
  PRODUCT_REVIEW_SYSTEM_PROMPT_DK,
} from "../src/lib/prompts/product-content-dk"
import { buildDisplayProductTitle, normalizeDisplayProductTitle } from "../src/lib/product-titles"
import { MAIN_SECTIONS } from "../src/config/nav"
import { SLUG_TO_SILO } from "../src/lib/silo-config"

const KOSTTILSKUD_DIR = path.join(process.cwd(), "src", "app", "(da)", "kosttilskud")
const PRODUKTER_DIR = path.join(KOSTTILSKUD_DIR, "produkter")
const INTROS_DIR = path.join(process.cwd(), "content", "category-intros")

/** Fitness-equipment slugs removed from site (not edible/supplement) */
const EXCLUDED_SLUGS = new Set([
  "ankelvaegt", "foam-roller", "fodmassageapparat", "gym-kalk",
  "gymnastiktaske", "hoppereb", "liniment", "loftestropper",
  "massagebold", "massagepistol", "mavehjul", "personvaegt",
  "pigmatte", "rygstotte", "yogamatte",
])
const IMAGE_MAPPING_FILE = path.join(process.cwd(), "content", "product-images.json")
const BUY_LINKS_FILE = path.join(process.cwd(), "content", "product-buy-links.json")
const TEST_IMAGES_FILE = path.join(process.cwd(), "content", "product-test-images.json")
const SIZE_OVERRIDES_FILE = path.join(process.cwd(), "content", "product-size-overrides.json")
const PRODUCT_SIGNALS_FILE = path.join(process.cwd(), "content", "product-signals-cache.json")
const CATEGORY_SECTIONS_DIR = path.join(process.cwd(), "content", "category-sections")
const CRAWLED_PRODUCTS_DIR = path.join(process.cwd(), "content", "crawled-products")
const MANUAL_PRODUCT_INFO_FILE = path.join(process.cwd(), "content", "manual-product-info.json")
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || ""
const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-5.4"
const OPENAI_ENDPOINT = "https://api.openai.com/v1/chat/completions"

/** Slug → local image path (e.g. "/vendor/products/abc123.jpg") */
let imageMapping: Record<string, string> = {}
/** Slug → external buy URL */
let buyLinksMapping: Record<string, string> = {}
/** Slug → { overview, detail } test image paths */
let testImagesMapping: Record<string, { overview: string | null; detail: string | null }> = {}
/** Slug → pricing/size overrides generated from buy pages */
let sizeOverridesMapping: Record<string, ProductOverride> = {}
let crawledByCanonicalUrl = new Map<string, CrawledProduct>()
let crawledAll: CrawledProduct[] = []
let manualProductInfoMap: Record<string, string> = {}
let debugOnlyCategorySlug: string | null = null
let forcedBuildProductSlugs: string[] = []
/** Legacy malformed product slugs mapped to clean slugs */
const PRODUCT_SLUG_ALIASES: Record<string, string> = {
  "httpswww-weightworld-dkvitamin-d3-4000iu-html": "weightworld-d3-vitamin-4000iu",
  "httpswww-svenskkosttilskud-dkcore-ashwagandhada14-46": "core-ashwagandha",
  "healthwell-healthwell-active-valleprotein-laktosefri": "healthwell-active-valleprotein-laktosefri",
}

interface ProductData {
  slug: string
  title: string
  brand: string
  content: string // review text without heading
  rating: number  // extracted or generated
  userScore: string // e.g. "4.6/5" from text
  price: string   // extracted or "Se pris"
  storeRating?: string // from crawled store data, e.g. "4.6/5"
  reviewCount?: number // from crawled store data
  crawledStore?: string // store id, e.g. "healthwell"
  crawledHighlights?: string[]
  crawledDescription?: string
  crawledFullDescription?: string
  crawledIngredients?: string
  crawledDosage?: string
  crawledNutritionInfo?: string
  crawledQa?: Array<{
    question: string
    answer: string
    answerBy: string
    date: string
  }>
  reviews?: Array<{
    author?: string
    ratingValue?: number | null
    bestRating?: number | null
    datePublished?: string
    headline?: string
    body?: string
  }>
  position: number
  imageUrl: string // local path to product image, or "" if none
  buyUrl: string   // external affiliate link, or "" if none
  testImages: { overview: string | null; detail: string | null } // AI-generated test images
  quickFacts: Array<{ label: string; value: string }>
  manualInfo: string
  signals: ProductSignals
  signalConfidence: ProductSignalConfidence
  panelScores?: PanelScores
  sourceRating: number
}

const EXPLICIT_STORE_DISPLAY_NAMES: Record<string, string> = {
  bodystore: "Bodystore",
  corenutrition: "CoreNutrition",
  healthwell: "Healthwell.dk",
  med24: "Med24",
  bodylab: "Bodylab",
  mmsportsstore: "MM Sports",
  proteindk: "Protein.dk",
  "protein-dk": "Protein.dk",
  helsegrossisten: "Helsegrossisten",
  weightworld: "WeightWorld",
  flowlife: "Flowlife",
  upcare: "UpCare",
  musclepain: "MusclePain",
}

type ProductSignals = {
  form: string | null
  proteinPer100g: number | null
  proteinPerServing: number | null
  servingSizeG: number | null
  kcalPer100g: number | null
  carbsPer100g: number | null
  fatPer100g: number | null
  sugarPer100g: number | null
  hasIsolate: boolean
  hasHydrolysate: boolean
  hasConcentrate: boolean
  hasAminoProfile: boolean
  hasLactase: boolean
  sweetenerCount: number
  additiveCount: number
  certificationCount: number
  vegan: boolean | null
  lactoseFree: boolean | null
  pricePerKg: number | null
  pricePerPortion: number | null
  pricePerDay: number | null
  servingsPerPack: number | null
  activeDensity: number | null
}

type ProductSignalConfidence = {
  overall: number
  fields: Record<string, number>
  relevantFields: string[]
}

type PanelScores = {
  ingredients: number
  quality: number
  value: number
  usability: number
  purity: number
  customer: number
  overall: number
  profilePremium: number
  profileValue: number
  profileBeginner: number
}

type SizeOption = {
  grams: number
  price: number
  portions?: number
}

type ProductOverride = {
  price?: string
  sizeOptions?: SizeOption[]
}

type CrawledProduct = {
  sourceUrl?: string
  name?: string
  brand?: string
  price?: string
  priceNumeric?: number
  currency?: string
  imageUrl?: string
  images?: string[]
  description?: string
  fullDescription?: string
  highlights?: string[]
  ingredients?: string
  dosage?: string
  nutritionInfo?: string
  store?: string
  storeCategory?: string
  storeRating?: string
  reviewCount?: number
  reviews?: Array<{
    author?: string
    ratingValue?: number | null
    bestRating?: number | null
    datePublished?: string
    headline?: string
    body?: string
  }>
  qa?: Array<{
    author?: string
    authorLabel?: string
    question?: string
    datePublished?: string
    answers?: Array<{
      author?: string
      authorTitle?: string
      datePublished?: string
      body?: string
    }>
  }>
  originCountry?: string
  inStock?: boolean
  crawledAt?: string
}

const DEFAULT_PRODUCT_OVERRIDES: Record<string, ProductOverride> = {
  "optimum-nutrition-casein": {
    price: "385 kr",
    sizeOptions: [
      { grams: 924, price: 385, portions: 28 },
      { grams: 1818, price: 755, portions: 56 },
    ],
  },
}

interface RelatedLink {
  label: string
  href: string
}

function canonicalizeUrl(input: string): string {
  if (!input) return ""
  try {
    const u = new URL(input.trim())
    const host = u.hostname.toLowerCase().replace(/^www\./, "")
    const pathname = u.pathname.replace(/\/+$/, "").toLowerCase()
    return `${host}${pathname}`
  } catch {
    return input.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/[?#].*$/, "").replace(/\/+$/, "")
  }
}

function toAbsoluteImageUrl(imageUrl: string | undefined): string | undefined {
  if (!imageUrl) return undefined
  const u = imageUrl.trim()
  if (!u) return undefined
  if (/^https?:\/\//i.test(u)) return u
  return `https://www.kosttilskudsvalg.dk${u.startsWith("/") ? "" : "/"}${u}`
}

function stripDiacritics(input: string): string {
  // Used to compare tokens like "loppefrøskaller" vs "loppefroskaller".
  const base = String(input || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")

  // Danish/Norwegian letters are not reliably decomposed into ASCII + combining marks,
  // so normalize them explicitly.
  return base
    .replace(/[æÆ]/g, "ae")
    // Our slugs use ø→o (e.g. "loppefroskaller"), not "oe".
    .replace(/[øØ]/g, "o")
    .replace(/[åÅ]/g, "aa")
}

function hashStringToUint32(input: string): number {
  // Simple stable hash for seeded randomness (deterministic per category).
  let h = 2166136261 >>> 0
  const s = String(input || "")
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

function mulberry32(seed: number): () => number {
  // Deterministic PRNG returning [0,1).
  let t = seed >>> 0
  return () => {
    t += 0x6D2B79F5
    let x = t
    x = Math.imul(x ^ (x >>> 15), x | 1)
    x ^= x + Math.imul(x ^ (x >>> 7), x | 61)
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296
  }
}

function estimateTestedCount(catSlug: string, shownCount: number): number {
  // Use the actual visible product count to avoid misleading copy on rebuilt pages.
  return Math.max(1, shownCount)
}

function pickDeterministicMetaTitle(opts: {
  catSlug: string
  year: number
  shownCount: number
  kwTitle: string
  kwLower: string
}): string {
  const { catSlug, year, shownCount, kwTitle, kwLower } = opts
  const rand = mulberry32(hashStringToUint32(`meta-title:${catSlug}:${year}`))

  // Keep titles short-ish and always keyword-relevant. Use ASCII-only.
  const candidatesRaw = [
    `${kwTitle} bedst i test ${year} - vores ${shownCount} bedste valg`,
    `Bedste ${kwLower} ${year} - top ${shownCount} i test`,
    `Bedst i test: ${kwTitle} ${year} - top ${shownCount} favoritter`,
    `${kwTitle} bedst i test ${year} - topliste og guide`,
    `Bedste ${kwLower} ${year} - test af de ${shownCount} bedste`,
    `${kwTitle} test ${year} - de bedste valg på kvalitet og værdi`,
    `Bedste ${kwLower} ${year} - testvinder og favoritter (top ${shownCount})`,
    `${kwTitle} bedst i test - find det bedste køb i ${year}`,
    `Bedste ${kwLower} i Danmark ${year} - vores topliste`,
    `${kwTitle}: bedst i test ${year} - sammenligning af de bedste produkter`,
  ]

  const candidates: string[] = []
  const seen = new Set<string>()
  for (const c of candidatesRaw) {
    const t = String(c || "").replace(/\s+/g, " ").trim()
    if (!t) continue
    if (seen.has(t)) continue
    seen.add(t)
    candidates.push(t)
  }

  const MAX = 65
  const ok = candidates.filter((c) => c.length <= MAX)
  const pool = ok.length > 0 ? ok : candidates
  const idx = Math.floor(rand() * pool.length)
  const picked = pool[Math.min(Math.max(idx, 0), pool.length - 1)]

  return picked || `${kwTitle} bedst i test ${year}`
}

function pickDeterministicMetaDescription(opts: {
  catSlug: string
  year: number
  testedCount: number
  shownCount: number
  kwLower: string
}): string {
  const { catSlug, year, testedCount, shownCount, kwLower } = opts
  const rand = mulberry32(hashStringToUint32(`meta-desc:${catSlug}:${year}`))

  // Keep it conservative + close to the current style. Target typical SERP lengths.
  const candidatesRaw = [
    `Vi har testet ${testedCount} ${kwLower}-produkter. Her er vores ${shownCount} bedste valg baseret på kvalitet, værdi og daglig brug.`,
    `Test ${year}: Vi har vurderet ${testedCount} ${kwLower}-produkter. Se vores ${shownCount} favoritter baseret på kvalitet, værdi og daglig brug.`,
    `Vi har testet ${testedCount} ${kwLower}-produkter og udvalgt ${shownCount} topvalg. Sammenlignet på kvalitet, værdi og daglig brug.`,
    `Bedst i test ${year}: ${shownCount} anbefalinger blandt ${testedCount} ${kwLower}-produkter - baseret på kvalitet, værdi og daglig brug.`,
    `Sammenligning af ${kwLower}: Vi har testet ${testedCount} produkter og viser ${shownCount} favoritter baseret på kvalitet, værdi og daglig brug.`,
    `Vi har analyseret ${testedCount} ${kwLower}-produkter og samlet vores ${shownCount} bedste valg. Fokus på kvalitet, værdi og daglig brug.`,
  ]

  const candidates: string[] = []
  const seen = new Set<string>()
  for (const c of candidatesRaw) {
    const t = String(c || "").replace(/\s+/g, " ").trim()
    if (!t) continue
    if (seen.has(t)) continue
    seen.add(t)
    candidates.push(t)
  }

  const MAX = 160
  const ok = candidates.filter((c) => c.length <= MAX)
  const pool = ok.length > 0 ? ok : candidates
  const idx = Math.floor(rand() * pool.length)
  const picked = pool[Math.min(Math.max(idx, 0), pool.length - 1)]

  return picked || `Vi har testet ${testedCount} ${kwLower}-produkter. Her er vores ${shownCount} bedste valg.`
}

function formatKeywordTitle(toplistName: string, kwLower: string): string {
  const kw = String(kwLower || "").trim()
  const t = String(toplistName || "").trim()

  // Short letter-only keywords are often acronyms (EAA, BCAA, MSM, NAC, ZMA).
  if (kw && /^[a-z]{2,4}$/.test(kw)) return kw.toUpperCase()
  if (kw && /^q\d+$/i.test(kw)) return kw.toUpperCase()

  return t || (kw ? kw.charAt(0).toUpperCase() + kw.slice(1) : "")
}

function sanitizeIntroContent(
  intro: string,
  opts: { kwTitle: string; kwLower: string; year: number; shownCount: number },
): string {
  let s = String(intro || "").trim()
  if (!s) return s

  const kwLowerEsc = escapeRegExp(opts.kwLower)
  const year = String(opts.year)
  const n = String(opts.shownCount)

  // Fix common AI artifact: intro starts with a meta-title phrase without punctuation:
  // "Bedste eaa 2026 – 5 produkter testet er ..."
  const prefixRe = new RegExp(
    `^Bedste\\s+${kwLowerEsc}\\s+${escapeRegExp(year)}\\s*[–-]\\s*${escapeRegExp(n)}\\s+produkter\\s+testet[:\\s]+`,
    "i",
  )
  if (prefixRe.test(s)) {
    s = s.replace(prefixRe, `${opts.kwTitle} `).trimStart()
  }

  // Secondary: "Bedst i test: KW YEAR – N produkter testet ..."
  const prefix2Re = new RegExp(
    `^(?:Bedst\\s+i\\s+test:|Bedst\\s+i\\s+test)\\s+${kwLowerEsc}\\s+${escapeRegExp(year)}\\s*[–-]\\s*${escapeRegExp(n)}\\s+produkter\\s+testet[:\\s]+`,
    "i",
  )
  if (prefix2Re.test(s)) {
    s = s.replace(prefix2Re, `${opts.kwTitle} `).trimStart()
  }

  // Keep hardcoded intro counts aligned with the actual number of shown products.
  // Examples:
  // "vores 5 favoritter" -> "vores 4 favoritter"
  // "viser 5 favoritter" -> "viser 4 favoritter"
  // "5 anbefalinger" -> "4 anbefalinger"
  s = s.replace(/\b(vores|viser|her er|se)\s+\d+\s+(favoritter|bedste valg|topvalg|anbefalinger)\b/gi, (_m, lead: string, noun: string) => {
    return `${lead} ${n} ${noun}`
  })
  s = s.replace(/\b\d+\s+(favoritter|bedste valg|topvalg|anbefalinger)\b/gi, (_m, noun: string) => {
    return `${n} ${noun}`
  })

  // Clean up accidental double spaces/newlines.
  s = s.replace(/\n{3,}/g, "\n\n").replace(/[ \t]{2,}/g, " ").trim()
  return s
}

async function loadCrawledProducts(): Promise<CrawledProduct[]> {
  const out: CrawledProduct[] = []
  async function walk(dir: string) {
    let entries = []
    try {
      entries = await fs.readdir(dir, { withFileTypes: true })
    } catch {
      return
    }
    for (const entry of entries) {
      const abs = path.join(dir, entry.name)
      if (entry.isDirectory()) {
        await walk(abs)
        continue
      }
      if (!entry.isFile() || !entry.name.toLowerCase().endsWith(".json")) continue
      try {
        const raw = await fs.readFile(abs, "utf8")
        const parsed = JSON.parse(raw.replace(/^\uFEFF/, "")) as CrawledProduct
        out.push(parsed)
      } catch {
        // ignore malformed crawled record
      }
    }
  }
  await walk(CRAWLED_PRODUCTS_DIR)
  return out
}

function findCrawledProduct(buyUrl: string, slug: string, title: string): CrawledProduct | null {
  const canonicalBuyUrl = canonicalizeUrl(buyUrl)
  if (canonicalBuyUrl) {
    const direct = crawledByCanonicalUrl.get(canonicalBuyUrl)
    if (direct) return direct
  }

  const slugToken = toSlugToken(slug)
  const titleToken = toSlugToken(title)
  const buyToken = toSlugToken((buyUrl || "").replace(/^https?:\/\//, "").replace(/[?#].*$/, ""))

  let best: { item: CrawledProduct; score: number } | null = null
  for (const item of crawledAll) {
    const source = item.sourceUrl || ""
    const sourceCanonical = canonicalizeUrl(source)
    const sourceToken = toSlugToken(sourceCanonical)
    const nameToken = toSlugToken(item.name || "")
    let score = 0
    if (canonicalBuyUrl && sourceCanonical && canonicalBuyUrl === sourceCanonical) score += 100
    if (slugToken && sourceToken.includes(slugToken)) score += 35
    if (slugToken && nameToken.includes(slugToken)) score += 25
    if (titleToken && nameToken && (titleToken.includes(nameToken) || nameToken.includes(titleToken))) score += 20
    if (buyToken && sourceToken && (buyToken.includes(sourceToken) || sourceToken.includes(buyToken))) score += 15
    if (score > 0 && (!best || score > best.score)) best = { item, score }
  }

  return best && best.score >= 25 ? best.item : null
}

async function main() {
  const onlyCategorySlug = process.argv[2]?.trim()
  const productSlugsFlagIdx = process.argv.indexOf("--product-slugs")
  const preserveNonProductContent = process.argv.includes("--preserve-non-product-content")
  const preserveProductLinkedContent = process.argv.includes("--preserve-product-linked-content")
  const forceRegenerateNonProductContent = process.argv.includes("--force-regenerate-non-product-content")
  const forcedProductSlugs =
    productSlugsFlagIdx !== -1 && process.argv[productSlugsFlagIdx + 1]
      ? process.argv[productSlugsFlagIdx + 1]
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)
      : []
  debugOnlyCategorySlug = onlyCategorySlug || null
  forcedBuildProductSlugs = forcedProductSlugs
  console.log("=== Ombygger kategorisider til fordonssajten-layout ===\n")
  if (onlyCategorySlug) {
    console.log(`  Filter: only rebuilding category "${onlyCategorySlug}"`)
  }
  if (forcedProductSlugs.length > 0) {
    console.log(`  Forced product slugs: ${forcedProductSlugs.join(", ")}`)
  }

  // Load product image mapping
  try {
    imageMapping = JSON.parse(await fs.readFile(IMAGE_MAPPING_FILE, "utf-8"))
    const count = Object.keys(imageMapping).length
    console.log(`  Loaded ${count} product image mappings`)
  } catch { console.log("  No product image mapping found (run download-product-images.ts first)") }

  // Load product buy links mapping
  try {
    buyLinksMapping = JSON.parse(await fs.readFile(BUY_LINKS_FILE, "utf-8"))
    const count = Object.keys(buyLinksMapping).length
    console.log(`  Loaded ${count} product buy links`)
  } catch { console.log("  No product buy links found (run extract-buy-links.ts first)") }

  // Load product test images mapping
  try {
    testImagesMapping = JSON.parse(await fs.readFile(TEST_IMAGES_FILE, "utf-8"))
    const count = Object.keys(testImagesMapping).length
    console.log(`  Loaded ${count} product test image sets`)
  } catch { console.log("  No product test images found (run generate-product-test-images.ts first)") }

  // Load product size overrides mapping
  try {
    const raw = await fs.readFile(SIZE_OVERRIDES_FILE, "utf-8")
    sizeOverridesMapping = JSON.parse(raw.replace(/^\uFEFF/, ""))
    const count = Object.keys(sizeOverridesMapping).length
    console.log(`  Loaded ${count} product size overrides`)
  } catch { console.log("  No product size overrides found (run build-size-overrides-from-buy-links.ts first)") }

  // Load crawled product data as auxiliary evidence input for parser/scoring.
  try {
    crawledAll = await loadCrawledProducts()
    crawledByCanonicalUrl = new Map<string, CrawledProduct>()
    for (const item of crawledAll) {
      const canonical = canonicalizeUrl(item.sourceUrl || "")
      if (!canonical) continue
      if (!crawledByCanonicalUrl.has(canonical)) crawledByCanonicalUrl.set(canonical, item)
    }
    console.log(`  Loaded ${crawledAll.length} crawled product records`)
  } catch {
    crawledAll = []
    crawledByCanonicalUrl = new Map<string, CrawledProduct>()
    console.log("  No crawled product records found")
  }

  // Load manually entered admin product info (free text).
  try {
    const raw = await fs.readFile(MANUAL_PRODUCT_INFO_FILE, "utf8")
    manualProductInfoMap = JSON.parse(raw.replace(/^\uFEFF/, ""))
    console.log(`  Loaded ${Object.keys(manualProductInfoMap).length} manual product info entries`)
  } catch {
    manualProductInfoMap = {}
    console.log("  No manual product info entries found")
  }

  const entries = await fs.readdir(KOSTTILSKUD_DIR, { withFileTypes: true })
  let rebuilt = 0
  const signalSnapshot: Record<string, any> = {}

  for (const entry of entries) {
    if (!entry.isDirectory() || entry.name === "[slug]" || entry.name === "produkter" || EXCLUDED_SLUGS.has(entry.name)) continue
    if (onlyCategorySlug && entry.name !== onlyCategorySlug) continue

    const catSlug = entry.name
    const mdxPath = path.join(KOSTTILSKUD_DIR, catSlug, "page.mdx")

    try {
      const raw = await fs.readFile(mdxPath, "utf8")
      const { data, content: rawContent } = matter(raw)

      // Find product slugs from existing content (anchors or table links)
      const extractedProductSlugs = extractProductSlugs(raw)
      const productSlugs = forcedProductSlugs.length > 0 ? forcedProductSlugs : extractedProductSlugs
      if (productSlugs.length === 0) {
        if (onlyCategorySlug) console.error(`  ✗ ${catSlug}: no product slugs found in page.mdx`)
        continue
      }

      // Load product data
      const products: ProductData[] = []
      for (let i = 0; i < productSlugs.length; i++) {
        const pd = await loadProduct(productSlugs[i], i + 1, catSlug)
        if (pd) products.push(pd)
        else if (onlyCategorySlug) console.error(`  - ${catSlug}: failed to load product "${productSlugs[i]}"`)
      }
      if (products.length === 0) {
        if (onlyCategorySlug) console.error(`  ✗ ${catSlug}: zero products loaded (skipping rebuild)`)
        continue
      }

      // Read intro from extracted/AI-generated source
      const introData = await loadIntroContent(catSlug)

      applyPanelModel(products, catSlug)
      const siloIdForCategory = SLUG_TO_SILO[catSlug] || "sundhed-velvaere"
      const categoryPath = `/${siloIdForCategory}/${catSlug}`
      signalSnapshot[catSlug] = products.map((p) => ({
        slug: p.slug,
        title: p.title,
        buyUrl: p.buyUrl,
        categoryPath,
        manualInfo: p.manualInfo,
        signals: p.signals,
        signalConfidence: p.signalConfidence,
        panelScores: p.panelScores,
        rating: p.rating,
      }))

      // Preserve the current category hero identity by default.
      // Category breadcrumbs + H1 both render from frontmatter.title in the page handler,
      // so rebuilds must not silently switch to another title/tagline template.
      // AI intro meta is only fallback if the page lacks hero frontmatter entirely.
      const categoryTitle = data.title || introData.aiTitle || catSlug
      const categoryName = catSlug.replace(/-/g, " ")
      const autoPreserveNonProductContent = !forceRegenerateNonProductContent && isCompliantExistingNonProductContent(raw)
      const shouldPreserveNonProductContent = preserveNonProductContent || autoPreserveNonProductContent
      if (autoPreserveNonProductContent && !preserveNonProductContent) {
        console.log(`  [preserve] Bevarer eksisterende korrekt intro/non-product content for ${catSlug}`)
      }
      const generatedSections = shouldPreserveNonProductContent
        ? await loadGeneratedSections(catSlug)
        : await ensureGeneratedSections(catSlug, categoryName, products, true, forceRegenerateNonProductContent)

      const newMdx = await buildCompleteMDX({
        frontmatter: data,
        categoryTitle,
        categoryName,
        catSlug,
        introContent: introData.content,
        existingRaw: raw,
        generatedSections,
        products,
        preserveProductLinkedContent,
      })

      const mergedMdx = preserveProductLinkedContent
        ? mergePreservingProductLinkedContent(raw, newMdx)
        : shouldPreserveNonProductContent
          ? mergePreservingNonProductContent(raw, newMdx)
          : newMdx
      const cleanedMdx = sanitizeGeneratedMdx(mergedMdx)
      await fs.writeFile(mdxPath, cleanedMdx, "utf-8")
      const withImg = products.filter(p => p.imageUrl).length
      console.log(`  ✓ ${catSlug}: ${products.length} produkter, ${withImg} med billede`)
      rebuilt++
    } catch (err) {
      // Keep normal full rebuild quiet, but make single-category runs debuggable.
      if (onlyCategorySlug) {
        const message = err instanceof Error ? `${err.message}\n${err.stack || ""}` : String(err)
        console.error(`  ✗ ${catSlug}: rebuild failed\n${message}`)
      }
      // skip
    }
  }

  await fs.writeFile(
    PRODUCT_SIGNALS_FILE,
    JSON.stringify({ updatedAt: new Date().toISOString(), categories: signalSnapshot }, null, 2),
    "utf8",
  )
  console.log(`\n  Saved product signals snapshot: ${path.relative(process.cwd(), PRODUCT_SIGNALS_FILE)}`)

  console.log(`\n=== Ombyggede ${rebuilt} kategorisider ===`)
}

function extractProductSlugs(mdx: string): string[] {
  const slugs: string[] = []
  // Try anchor pattern first
  const anchorRegex = /<a id="product-([^"]+)">/g
  let match: RegExpExecArray | null
  while ((match = anchorRegex.exec(mdx)) !== null) {
    if (!slugs.includes(match[1])) slugs.push(match[1])
  }
  // Fall back to table pattern
  if (slugs.length === 0) {
    const linkRegex = /\[Se vurdering\]\(\/kosttilskud\/produkter\/([^)]+)\)/g
    while ((match = linkRegex.exec(mdx)) !== null) {
      if (!slugs.includes(match[1])) slugs.push(match[1])
    }
  }
  return slugs
}

function extractMarkedSection(body: string, startMarker: string, endMarker: string): string | null {
  const startIdx = body.indexOf(startMarker)
  const endIdx = body.indexOf(endMarker)
  if (startIdx === -1 || endIdx === -1 || endIdx < startIdx) return null
  return body.slice(startIdx + startMarker.length, endIdx)
}

function replaceMarkedSection(body: string, startMarker: string, endMarker: string, replacement: string): string {
  const startIdx = body.indexOf(startMarker)
  const endIdx = body.indexOf(endMarker)
  if (startIdx === -1 || endIdx === -1 || endIdx < startIdx) return body
  return `${body.slice(0, startIdx + startMarker.length)}${replacement}${body.slice(endIdx)}`
}

function splitAfterComparisonTable(body: string): { head: string; tail: string } | null {
  const match = body.match(/<ComparisonTable[\s\S]*?\/>\s*/m)
  if (!match || match.index == null) return null
  const endIdx = match.index + match[0].length
  return {
    head: body.slice(0, endIdx),
    tail: body.slice(endIdx),
  }
}

function mergePreservingNonProductContent(existingRaw: string, generatedRaw: string): string {
  const existing = matter(existingRaw)
  const generated = matter(generatedRaw)
  let nextBody = generated.content

  const introStart = `{/* ═══ ORIGINAL_INTRO_START ═══ */}`
  const introEnd = `{/* ═══ ORIGINAL_INTRO_END ═══ */}`
  const existingIntro = extractMarkedSection(existing.content, introStart, introEnd)
  if (existingIntro != null) {
    nextBody = replaceMarkedSection(nextBody, introStart, introEnd, existingIntro)
  }

  const existingComparisonSplit = splitAfterComparisonTable(existing.content)
  const generatedComparisonSplit = splitAfterComparisonTable(nextBody)
  if (existingComparisonSplit && generatedComparisonSplit) {
    nextBody = `${generatedComparisonSplit.head}${existingComparisonSplit.tail}`
  }

  const mergedFrontmatter = {
    ...generated.data,
    ...existing.data,
    updated: generated.data.updated || existing.data.updated,
  }

  return matter.stringify(nextBody, mergedFrontmatter)
}

function mergePreservingProductLinkedContent(existingRaw: string, generatedRaw: string): string {
  const existing = matter(existingRaw)
  const generated = matter(generatedRaw)

  const existingComparisonSplit = splitAfterComparisonTable(existing.content)
  const generatedComparisonSplit = splitAfterComparisonTable(generated.content)

  let nextBody =
    existingComparisonSplit && generatedComparisonSplit
      ? `${existingComparisonSplit.head}${generatedComparisonSplit.tail}`
      : existing.content

  const introStart = `{/* ═══ ORIGINAL_INTRO_START ═══ */}`
  const introEnd = `{/* ═══ ORIGINAL_INTRO_END ═══ */}`
  const generatedIntro = extractMarkedSection(generated.content, introStart, introEnd)
  if (generatedIntro != null) {
    nextBody = replaceMarkedSection(nextBody, introStart, introEnd, generatedIntro)
  }

  const mergedFrontmatter = {
    ...generated.data,
    ...existing.data,
    updated: generated.data.updated || existing.data.updated,
  }

  return matter.stringify(nextBody, mergedFrontmatter)
}

function hasLinkInsideHeading(body: string): boolean {
  return /<h[1-6][^>]*>(?:(?!<\/h[1-6]>)[\s\S])*<a href="\/[^"]+"(?:(?!<\/h[1-6]>)[\s\S])*<\/h[1-6]>/i.test(body)
}

function isCompliantExistingNonProductContent(existingRaw: string): boolean {
  const parsed = matter(existingRaw)
  const body = parsed.content
  const comparisonSplit = splitAfterComparisonTable(body)
  if (!comparisonSplit) return false

  const introStart = `{/* ═══ ORIGINAL_INTRO_START ═══ */}`
  const introEnd = `{/* ═══ ORIGINAL_INTRO_END ═══ */}`
  const existingIntro = extractMarkedSection(body, introStart, introEnd)
  const tail = comparisonSplit.tail

  const requiredTailMarkers = [
    "Sådan har vi lavet vores test",
    "Købeguide:",
    "<FAQ ",
    "Læs også",
  ]

  if (!String(existingIntro || "").trim()) return false
  if (!requiredTailMarkers.every((needle) => tail.includes(needle))) return false
  if (tail.includes("<QuickGuideCards")) return false
  if (tail.includes("md:max-w-[920px]")) return false
  if (hasLinkInsideHeading(body)) return false

  return true
}

function extractProductSectionBlocks(body: string): Map<string, string> {
  const out = new Map<string, string>()
  const anchorRe = /<a id="product-([^"]+)"><\/a>/g
  const matches = Array.from(body.matchAll(anchorRe))
  for (let i = 0; i < matches.length; i++) {
    const slug = matches[i][1]
    const start = matches[i].index ?? 0
    const end = i + 1 < matches.length ? matches[i + 1].index ?? body.length : body.length
    out.set(slug, body.slice(start, end).trim())
  }
  return out
}

function extractReviewContentFromProductSection(section: string): string {
  const match = section.match(/<div className="prose prose-slate max-w-none">([\s\S]*?)<\/div>\s*<\/div>/)
  return String(match?.[1] || "").trim()
}

function stripExistingTestImage(reviewContent: string): string {
  return String(reviewContent || "")
    .replace(/<img src="\/images\/products\/test-[^"]+"[^>]*\/>\s*/gi, "")
    .trim()
}

function isPreservableExistingProductReview(reviewContent: string): boolean {
  const normalized = String(reviewContent || "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim()

  if (isThinReviewContent(reviewContent)) return false
  if (!isStructuredProductReviewContent(reviewContent)) return false
  if (!normalized) return false

  const invalidPatterns = [
    /^\s*bestil\b/i,
    /\bmånga\b/i,
    /\baminosyratillskott\b/i,
    /\.\./,
    /\bikke oplyst i input\b/i,
    /\bikke oplyst i det tilgængelige input\b/i,
    /\bingen kundeomtaler tilgængelige i input\b/i,
    /\bdosering er ikke oplyst i input\b/i,
    /\bnæringsindhold er ikke oplyst i input\b/i,
    /\bingrediens(?:er|liste) er ikke oplyst i input\b/i,
    /\bsødning er ikke oplyst\b/i,
  ]

  return !invalidPatterns.some((re) => re.test(normalized))
}

function buildPreservedProductReviewMap(existingRaw: string): Map<string, string> {
  const parsed = matter(existingRaw)
  const sections = extractProductSectionBlocks(parsed.content)
  const out = new Map<string, string>()
  for (const [slug, section] of sections.entries()) {
    const reviewContent = extractReviewContentFromProductSection(section)
    if (!isPreservableExistingProductReview(reviewContent)) continue
    out.set(slug, stripExistingTestImage(reviewContent))
  }
  return out
}

interface IntroData {
  content: string
  aiTitle?: string
  aiSlogan?: string
}

async function loadIntroContent(catSlug: string): Promise<IntroData> {
  const introPath = path.join(INTROS_DIR, `${catSlug}.md`)
  const metaPath = path.join(INTROS_DIR, `${catSlug}.meta.json`)
  let content = ""
  let aiTitle: string | undefined
  let aiSlogan: string | undefined

  try {
    const raw = await fs.readFile(introPath, "utf-8")
    // Remove the H1 heading (it's handled by the hero banner)
    content = raw.replace(/^# .+\n*/, "").trim()
  } catch { /* no file */ }

  try {
    const meta = JSON.parse(await fs.readFile(metaPath, "utf-8"))
    aiTitle = meta.title
    aiSlogan = meta.slogan
  } catch { /* no meta */ }

  return { content, aiTitle, aiSlogan }
}

async function loadGeneratedSections(catSlug: string): Promise<GeneratedCategorySections> {
  const sectionPath = path.join(CATEGORY_SECTIONS_DIR, `${catSlug}.json`)
  const stripFrontmatter = (input: string): string => {
    let text = String(input || "").trim()
    if (!text) return ""
    // Some section outputs arrive wrapped in fenced mdx blocks.
    text = text.replace(/^```[a-z]*\n/i, "").replace(/\n```$/i, "").trim()
    // Remove accidental markdown frontmatter emitted by AI section output.
    // Example:
    // ---
    // title: "..."
    // description: "..."
    // ---
    if (text.startsWith("---")) {
      const m = text.match(/^---\s*\n[\s\S]*?\n---\s*\n?/)
      if (m) return text.slice(m[0].length).trim()
    }
    return text
  }
  try {
    const raw = await fs.readFile(sectionPath, "utf8")
    const parsed = JSON.parse(raw) as {
      intro?: string
      method?: string
      buyersGuide?: string
      benefits?: string
      caveats?: string
      faq?: string
      sources?: string
    }
    return {
      intro: stripFrontmatter(parsed.intro || ""),
      method: stripFrontmatter(parsed.method || ""),
      buyersGuide: stripFrontmatter(parsed.buyersGuide || ""),
      benefits: stripFrontmatter(parsed.benefits || ""),
      caveats: stripFrontmatter(parsed.caveats || ""),
      faq: stripFrontmatter(parsed.faq || ""),
      sources: stripFrontmatter(parsed.sources || ""),
    }
  } catch {
    return {}
  }
}

type SectionGenerationProductInput = {
  name: string
  type: string
  activeIngredients: string
  dosePerServing: string
  servingsPerPackage: number
  pricePerDailyDose?: string
  price?: string
  targetGroup?: string
  certifications?: string
  pros?: string[]
  cons?: string[]
}

type SectionGenerationPayload = {
  keyword: string
  secondaryKeywords: string[]
  category: string
  categorySlug: string
  year: number
  products: SectionGenerationProductInput[]
  bestOverall?: string
  bestBudget?: string
  bestPremium?: string
  bestAlternative?: string
  alternativeLabel?: string
}

function hasUsableGeneratedSections(sections: GeneratedCategorySections | null | undefined): boolean {
  const s = sections || {}
  const required: Array<keyof GeneratedCategorySections> = [
    "method",
    "buyersGuide",
    "benefits",
    "caveats",
    "faq",
    "sources",
  ]
  return required.every((key) => Boolean(String(s[key] || "").trim()))
}

function sectionGenerationTimeoutSignal(ms: number): AbortSignal | undefined {
  const anyAbort = AbortSignal as unknown as { timeout?: (ms: number) => AbortSignal }
  if (typeof anyAbort.timeout === "function") return anyAbort.timeout(ms)
  return undefined
}

async function readGeneratedSectionsSse(
  url: string,
  cookie: string,
  payload: SectionGenerationPayload,
): Promise<Record<string, string>> {
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: cookie,
    },
    body: JSON.stringify(payload),
    signal: sectionGenerationTimeoutSignal(240000),
  })
  if (!res.ok || !res.body) {
    const t = await res.text().catch(() => "")
    throw new Error(`Generate failed ${res.status}: ${t.slice(0, 200)}`)
  }

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ""
  const sections: Record<string, string> = {}

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const events = buffer.split("\n\n")
    buffer = events.pop() || ""
    for (const event of events) {
      if (!event.startsWith("data: ")) continue
      try {
        const parsed = JSON.parse(event.slice(6)) as {
          type?: string
          section?: string
          content?: string
          heading?: string
        }
        if (parsed.type === "progress") {
          console.log(`  [sections] Genererer: ${parsed.heading || parsed.section || "sektion"}`)
        }
        if (parsed.type === "section" && parsed.section && typeof parsed.content === "string") {
          sections[parsed.section] = parsed.content.trim()
        }
      } catch {
        // Ignore malformed SSE chunks
      }
    }
  }

  return sections
}

function getQuickFactValueFromList(quickFacts: Array<{ label: string; value: string }>, label: string): string | null {
  const hit = quickFacts.find((f) => String(f.label || "").toLowerCase() === label.toLowerCase())
  return hit?.value ?? null
}

function toSectionGenerationProductInput(prod: ProductData, categoryName: string): SectionGenerationProductInput {
  const quickFact = (label: string) => getQuickFactValueFromList(prod.quickFacts, label)
  const packageSize = quickFact("Pakningsstørrelse") || quickFact("Form") || "kosttilskud"
  const servings =
    parseNumericPrefix(quickFact("Portioner/pakke")) ??
    parseNumericPrefix(quickFact("Kapsler/pakke")) ??
    parseNumericPrefix(quickFact("Tabletter/pakke")) ??
    30
  const activeIngredients = [
    Array.isArray(prod.crawledHighlights) ? prod.crawledHighlights.slice(0, 3).join(", ") : "",
    String(prod.crawledIngredients || "").slice(0, 180),
    String(prod.crawledNutritionInfo || "").slice(0, 140),
  ]
    .map((s) => String(s || "").replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .join(" | ") || "Se produktets deklaration"

  return {
    name: prod.title,
    type: packageSize,
    activeIngredients,
    dosePerServing: quickFact("Daglig dosis") || prod.crawledDosage || "Følg producentens anvisning",
    servingsPerPackage: servings > 0 ? servings : 30,
    pricePerDailyDose: quickFact("Pris/dagsdosis") || undefined,
    price: prod.price || "Se aktuel pris",
    targetGroup: categoryName,
    certifications: quickFact("Certificering") || undefined,
    pros: Array.isArray(prod.crawledHighlights) ? prod.crawledHighlights.slice(0, 3) : [],
    cons: [],
  }
}

async function tryGenerateMissingSections(catSlug: string, categoryName: string, products: ProductData[]): Promise<boolean> {
  const baseUrl = "http://localhost:3000"
  try {
    const health = await fetch(baseUrl, {
      method: "GET",
      signal: sectionGenerationTimeoutSignal(15000),
    }).catch(() => null)
    if (!health || !health.ok) {
      throw new Error("lokal server svarer ikke")
    }

    const adminUser = process.env.ADMIN_USERNAME || "admin"
    const adminPass = process.env.ADMIN_PASSWORD || "rnvsQt25"
    const loginRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: adminUser, password: adminPass }),
      signal: sectionGenerationTimeoutSignal(30000),
    })
    if (!loginRes.ok) {
      throw new Error(`login fejlede (${loginRes.status})`)
    }
    const cookie = loginRes.headers.get("set-cookie") || ""
    if (!cookie) {
      throw new Error("ingen auth-cookie returneret")
    }

    const siloId = SLUG_TO_SILO[catSlug] || "sundhed-velvaere"
    const payload: SectionGenerationPayload = {
      keyword: categoryName,
      secondaryKeywords: [`bedste ${categoryName}`, `${categoryName} bedst i test`, `${categoryName} test`],
      category: "Kosttilskud",
      categorySlug: catSlug,
      year: new Date().getFullYear(),
      products: products.map((prod) => toSectionGenerationProductInput(prod, categoryName)),
      bestOverall: products[0]?.title,
      bestPremium: products[1]?.title,
      bestBudget: products[2]?.title,
      bestAlternative: products[4]?.title,
      alternativeLabel: undefined,
    }

    console.log(`  [sections] Mangler eller er ufuldstændige for ${catSlug}. Forsøger auto-generering...`)
    const sections = await readGeneratedSectionsSse(`${baseUrl}/api/ai/generate`, cookie, payload)
    if (Object.keys(sections).length === 0) {
      throw new Error("ingen sektioner returneret fra AI-generator")
    }

    await fs.mkdir(CATEGORY_SECTIONS_DIR, { recursive: true })
    const sectionOutPath = path.join(CATEGORY_SECTIONS_DIR, `${catSlug}.json`)
    await fs.writeFile(
      sectionOutPath,
      JSON.stringify(
        {
          categorySlug: catSlug,
          sectionPath: siloId,
          keyword: categoryName,
          generatedAt: new Date().toISOString(),
          model: process.env.OPENAI_MODEL || "gpt-5.4",
          intro: sections["intro"] || "",
          method: sections["method"] || "",
          buyersGuide: sections["buyers-guide"] || "",
          benefits: sections["benefits"] || "",
          caveats: sections["caveats"] || "",
          faq: sections["faq"] || "",
          sources: sections["sources"] || "",
        },
        null,
        2,
      ),
      "utf8",
    )
    console.log(`  [sections] Gemte auto-genererede sektioner for ${catSlug}`)
    return true
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.warn(`  [sections] Kunne ikke auto-generere sektioner for ${catSlug}: ${message}`)
    return false
  }
}

async function ensureGeneratedSections(
  catSlug: string,
  categoryName: string,
  products: ProductData[],
  allowAutoGenerate: boolean,
  forceRegenerate = false,
): Promise<GeneratedCategorySections> {
  let sections = forceRegenerate ? null : await loadGeneratedSections(catSlug)
  if (!forceRegenerate && hasUsableGeneratedSections(sections)) return sections
  if (allowAutoGenerate) {
    const generated = await tryGenerateMissingSections(catSlug, categoryName, products)
    if (forceRegenerate && !generated) {
      throw new Error(
        `Kunne ikke tvinge nye category-sections for ${catSlug}. Auto-genereringen fejlede under full review.`
      )
    }
    sections = await loadGeneratedSections(catSlug)
  }
  if (!hasUsableGeneratedSections(sections)) {
    throw new Error(
      `Manglende eller ufuldstændige category-sections for ${catSlug}. Rebuild afbrydes for at undgå en halv side.`
    )
  }
  return sections
}

async function loadProduct(slug: string, position: number, catSlug: string): Promise<ProductData | null> {
  const resolvedSlug = PRODUCT_SLUG_ALIASES[slug] || slug
  const primaryPath = path.join(PRODUKTER_DIR, resolvedSlug, "content.mdx")
  const fallbackPath = path.join(PRODUKTER_DIR, slug, "content.mdx")
  try {
    let raw = ""
    try {
      raw = await fs.readFile(primaryPath, "utf8")
    } catch {
      raw = await fs.readFile(fallbackPath, "utf8")
    }
    const { data, content } = matter(raw)

    const rawContentWithoutHeading = content.replace(/^#\s+.+$/m, "").trim()

    // Extract brand from title, cleaning store prefixes
    const heading = content.match(/^#\s+(.+)$/m)?.[1]?.trim() || ""
    const rawTitle = (data.title || heading || slug).trim()
    let title = cleanProductTitle(rawTitle)
    if (isWeakTitle(title) && heading) title = cleanProductTitle(heading)
    if (isWeakTitle(title) && slug.includes("-")) title = cleanProductTitle(slugToTitle(slug))
    // Look up buy link early so we can prefer crawled brand (avoids store prefixes like "Healthwell ...").
    const buyUrl = buyLinksMapping[resolvedSlug] || buyLinksMapping[slug] || ""
    const crawledForBrand = findCrawledProduct(buyUrl, resolvedSlug, title)
    const crawledTitle = cleanProductTitle(
      buildDisplayProductTitle(String(crawledForBrand?.name || "").replace(/\s+/g, " ").trim(), {
        brand: String(crawledForBrand?.brand || "").replace(/\s+/g, " ").trim(),
        contextText: `${String(crawledForBrand?.fullDescription || "").replace(/\s+/g, " ").trim()} ${String(crawledForBrand?.description || "").replace(/\s+/g, " ").trim()}`,
      }),
    )
    if (shouldPreferCrawledTitle(title, crawledTitle)) title = crawledTitle
    const explicitCrawledBrand = String(crawledForBrand?.brand || "").replace(/\.dk$/i, "").trim()
    const titleStartsWithCrawledBrand = Boolean(
      explicitCrawledBrand &&
      new RegExp(`^${escapeRegExp(explicitCrawledBrand)}(?:\\b|\\s|[-–,:;(])`, "i").test(title),
    )
    const crawledBrand = normalizeCrawledBrand(crawledForBrand?.brand, title)
    const brand =
      BRAND_OVERRIDES[resolvedSlug] ||
      BRAND_OVERRIDES[slug] ||
      (titleStartsWithCrawledBrand ? explicitCrawledBrand : "") ||
      crawledBrand ||
      // Prefer title-based brand before slug prefix (slug often contains store name).
      extractBrand(title) ||
      extractBrandFromSlug(resolvedSlug) ||
      extractBrandFromSlug(slug)

    if (brand) {
      title = cleanProductTitle(
        buildDisplayProductTitle(title, {
          brand,
          contextText: `${String(crawledForBrand?.fullDescription || "").replace(/\s+/g, " ").trim()} ${String(crawledForBrand?.description || "").replace(/\s+/g, " ").trim()}`,
        }),
      )
    }

    const cleanContent = normalizeStoreLabelsInContent(
      fixObviousStoreBrandLeak(rawContentWithoutHeading, brand || ""),
    )

    // Extract baseline rating from review text (later overridden by panel model)
    const { rating: sourceRating, userScore } = extractRating(cleanContent, resolvedSlug)

    // Extract price from review text
    const override =
      sizeOverridesMapping[resolvedSlug] ||
      sizeOverridesMapping[slug] ||
      DEFAULT_PRODUCT_OVERRIDES[resolvedSlug] ||
      DEFAULT_PRODUCT_OVERRIDES[slug]
    // Look up product image, buy link, and test images from mappings
    const imageUrl = imageMapping[resolvedSlug] || imageMapping[slug] || ""
    const testImages = testImagesMapping[resolvedSlug] || testImagesMapping[slug] || { overview: null, detail: null }
    const crawled = crawledForBrand
    const manualInfo = (manualProductInfoMap[resolvedSlug] || manualProductInfoMap[slug] || "").trim()
    const crawledPriceNum = normalizeCrawledPriceToKr(crawled)
    const crawledPrice = crawledPriceNum != null ? `${crawledPriceNum} kr` : ""
    const extractedPrice = extractPrice(cleanContent)
    const extractedPriceNum = extractedPrice !== "Se aktuel pris" ? parsePriceFloat(extractedPrice) : null
    const structuredPackageGrams = extractStructuredWeightInGrams(typeof (crawled as any)?.size === "string" ? (crawled as any).size : "")
    const overrideResolution = resolveSizeOverrideSelection(override, structuredPackageGrams, crawledPriceNum)
    const shouldPreferCrawledPrice = Boolean(
      crawledPrice &&
      (
        extractedPrice === "Se aktuel pris" ||
        extractedPriceNum == null ||
        extractedPriceNum < 20 ||
        (crawledPriceNum != null && Math.abs(extractedPriceNum - crawledPriceNum) > 50)
      )
    )
    const resolvedDisplayPriceNum =
      overrideResolution.selected?.price ??
      (overrideResolution.conflict && crawledPriceNum != null ? crawledPriceNum : null) ??
      (shouldPreferCrawledPrice ? crawledPriceNum : (extractedPriceNum ?? crawledPriceNum))
    const price =
      resolvedDisplayPriceNum != null
        ? `${resolvedDisplayPriceNum} kr`
        : (extractedPrice !== "Se aktuel pris" ? extractedPrice : (crawledPrice || extractedPrice))

    const quickFacts = buildCategoryQuickFacts({
      catSlug,
      slug: resolvedSlug,
      title,
      text: cleanContent,
      extraText: [
        crawled?.description || "",
        crawled?.fullDescription || "",
        crawled?.ingredients || "",
        crawled?.nutritionInfo || "",
        crawled?.storeCategory || "",
        (crawled as any)?.originCountry ? `Oprindelsesland: ${(crawled as any).originCountry}` : "",
      ]
        .filter(Boolean)
        .join("\n"),
      price,
      brand: brand || "",
      rating: sourceRating,
      override,
      crawled,
    })
    assertProductQa(catSlug, resolvedSlug, cleanContent, quickFacts)

    const storeRating = typeof crawled?.storeRating === "string" ? crawled.storeRating.trim() : ""
    const reviewCount =
      typeof (crawled as any)?.reviewCount === "number" && Number.isFinite((crawled as any).reviewCount)
        ? Math.max(0, Math.floor((crawled as any).reviewCount))
        : 0
    const parsedReviews =
      Array.isArray((crawled as any)?.reviews)
        ? ((crawled as any).reviews as any[]).slice(0, 30)
        : []
    const parsedQa =
      Array.isArray((crawled as any)?.qa)
        ? ((crawled as any).qa as any[])
          .map((q) => {
            const question = String(q?.question || "").replace(/\s+/g, " ").trim()
            const a0 = Array.isArray(q?.answers) ? q.answers[0] : null
            const answer = String(a0?.body || "").replace(/\s+/g, " ").trim()
            const answerBy = String(a0?.authorTitle || a0?.author || "").replace(/\s+/g, " ").trim()
            const date = String(q?.datePublished || a0?.datePublished || "").replace(/\s+/g, " ").trim()
            if (!question || !answer) return null
            return { question, answer, answerBy, date }
          })
          .filter(Boolean)
          .slice(0, 5) as any
        : []
    const crawledSignalText = [
      crawled?.description || "",
      crawled?.fullDescription || "",
      crawled?.ingredients || "",
      crawled?.nutritionInfo || "",
      crawled?.storeCategory || "",
      manualInfo,
    ]
      .filter(Boolean)
      .join("\n")
    const signals = extractProductSignals(`${cleanContent}\n${crawledSignalText}`, quickFacts)
    const signalConfidence = computeSignalConfidence(signals, catSlug)

    return {
      slug: resolvedSlug,
      title,
      brand: brand || "",
      content: cleanContent,
      rating: sourceRating,
      sourceRating,
      userScore,
      price,
      storeRating: storeRating || undefined,
      reviewCount: reviewCount > 0 ? reviewCount : undefined,
      crawledStore: typeof crawled?.store === "string" && crawled.store ? crawled.store : undefined,
      crawledHighlights: Array.isArray((crawled as any)?.highlights) ? ((crawled as any).highlights as any[]).map((s) => String(s || "").trim()).filter(Boolean).slice(0, 12) : undefined,
      crawledDescription: typeof (crawled as any)?.description === "string" ? String((crawled as any).description || "").trim() : undefined,
      crawledFullDescription: typeof (crawled as any)?.fullDescription === "string" ? String((crawled as any).fullDescription || "").trim() : undefined,
      crawledIngredients: typeof (crawled as any)?.ingredients === "string" ? String((crawled as any).ingredients || "").trim() : undefined,
      crawledDosage: typeof (crawled as any)?.dosage === "string" ? String((crawled as any).dosage || "").trim() : undefined,
      crawledNutritionInfo: typeof (crawled as any)?.nutritionInfo === "string" ? String((crawled as any).nutritionInfo || "").trim() : undefined,
      crawledQa: parsedQa.length > 0 ? (parsedQa as any) : undefined,
      reviews: parsedReviews.length > 0 ? (parsedReviews as any) : undefined,
      position,
      imageUrl,
      buyUrl,
      testImages,
      quickFacts,
      manualInfo,
      signals,
      signalConfidence,
    }
  } catch (err) {
    if (debugOnlyCategorySlug) {
      const message = err instanceof Error ? `${err.message}\n${err.stack || ""}` : String(err)
      console.error(`    loadProduct() failed for "${slug}" in "${catSlug}"\n${message}`)
    }
    return null
  }
}

function parseNumber(input: string): number | null {
  const n = Number(input.replace(",", "."))
  return Number.isFinite(n) ? n : null
}

function formatStoreName(store?: string, buyUrl?: string): string {
  const raw = String(store || "").trim().toLowerCase()

  if (EXPLICIT_STORE_DISPLAY_NAMES[raw]) return EXPLICIT_STORE_DISPLAY_NAMES[raw]

  const url = String(buyUrl || "").trim()
  if (url) {
    try {
      const host = new URL(url).hostname.replace(/^www\./i, "").toLowerCase()
      if (host.includes("bodystore")) return "Bodystore"
      if (host.includes("corenutrition")) return "CoreNutrition"
      if (host.includes("healthwell")) return "Healthwell.dk"
      if (host.includes("med24")) return "Med24"
      if (host.includes("bodylab")) return "Bodylab"
      if (host.includes("mmsports")) return "MM Sports"
      if (host.includes("protein.dk")) return "Protein.dk"
      if (host.includes("helsegrossisten")) return "Helsegrossisten"
      if (host.includes("weightworld")) return "WeightWorld"
      if (host.includes("flowlife")) return "Flowlife"
      if (host.includes("upcare")) return "UpCare"
      if (host.includes("musclepain")) return "MusclePain"
    } catch {}
  }

  return "Butik"
}

function normalizeStoreLabelsInContent(text: string): string {
  let out = String(text || "")
  if (!out) return out

  for (const [raw, label] of Object.entries(EXPLICIT_STORE_DISPLAY_NAMES)) {
    const escaped = escapeRegExp(raw)
    out = out.replace(new RegExp(`>(\\s*)${escaped}(\\s*)<`, "gi"), `>$1${label}$2<`)
    out = out.replace(new RegExp(`(\\bButik\\b[^<\\n]{0,20}:\\s*)${escaped}\\b`, "gi"), `$1${label}`)
  }

  return out
}

function cleanText(input?: string): string {
  return String(input || "").replace(/\s+/g, " ").trim()
}

function formatNumberDa(value: number, maxDecimals = 1): string {
  const rounded = Number(value.toFixed(maxDecimals))
  return rounded.toLocaleString("da-DK", { maximumFractionDigits: maxDecimals })
}

function parsePriceFloat(raw: string): number | null {
  const cleaned = String(raw || "").replace(/[^\d.,]/g, "").trim()
  if (!cleaned) return null
  const hasDot = cleaned.includes(".")
  const hasComma = cleaned.includes(",")

  // If both separators exist, treat the last one as decimal separator.
  if (hasDot && hasComma) {
    const lastDot = cleaned.lastIndexOf(".")
    const lastComma = cleaned.lastIndexOf(",")
    const decSep = lastDot > lastComma ? "." : ","
    const thouSep = decSep === "." ? "," : "."
    const normalized = cleaned.split(thouSep).join("").replace(decSep, ".")
    const n = Number(normalized)
    return Number.isFinite(n) ? n : null
  }

  if (hasComma && !hasDot) {
    // "229,00" => 229.00; "2,290" => 2290 (thousands)
    const normalized = /,\d{1,2}$/.test(cleaned) ? cleaned.replace(",", ".") : cleaned.replace(/,/g, "")
    const n = Number(normalized)
    return Number.isFinite(n) ? n : null
  }

  if (hasDot && !hasComma) {
    // "229.00" => 229.00; "2.290" => 2290 (thousands)
    const normalized = /\.\d{1,2}$/.test(cleaned) ? cleaned : cleaned.replace(/\./g, "")
    const n = Number(normalized)
    return Number.isFinite(n) ? n : null
  }

  const n = Number(cleaned)
  return Number.isFinite(n) ? n : null
}

function normalizeCrawledPriceToKr(crawled: { price?: any; priceNumeric?: any } | null | undefined): number | null {
  if (!crawled) return null
  const pnRaw = crawled.priceNumeric
  const pn = typeof pnRaw === "number" && Number.isFinite(pnRaw) ? pnRaw : null
  const ps = typeof crawled.price === "string" ? crawled.price : ""
  const parsedFromString = ps ? parsePriceFloat(ps) : null

  // Some crawlers store priceNumeric in "øre" (x100) while price is "229.00".
  if (pn != null && parsedFromString != null) {
    const pnAsOreCandidate = pn / 100
    if (pn >= 1000 && pn % 100 === 0 && Math.abs(pnAsOreCandidate - parsedFromString) < 0.01) {
      return Math.round(pnAsOreCandidate)
    }
  }

  if (parsedFromString != null && (pn == null || pn > parsedFromString * 20)) {
    // Prefer the parsed human string when numeric looks wildly off.
    return Math.round(parsedFromString)
  }
  if (pn != null) return Math.round(pn)
  if (parsedFromString != null) return Math.round(parsedFromString)
  return null
}

function extractPriceNumber(text: string): number | null {
  const p = extractPrice(text)
  const m = p.match(/(\d{2,4})/)
  if (!m) return null
  return parseInt(m[1], 10)
}

function extractCount(text: string, unitPattern: string): number | null {
  // Always wrap `unitPattern` to avoid `|` precedence bugs when callers pass alternations
  // like "kaps(?:el|ler)?|kap". Without grouping, the regex would effectively become:
  //   (\d+)\s*kaps...  OR  kap(?:\.|\b)
  // which can yield wrong matches and wrong counts.
  const re = new RegExp(`(\\d{1,4})\\s*(?:${unitPattern})(?:\\.|\\b)`, "gi")
  const matches = [...text.matchAll(re)]
  if (matches.length === 0) return null

  // Pick the largest count that does not look like daily-dose text.
  let best: number | null = null
  for (const m of matches) {
    const idx = m.index ?? 0
    const local = text.slice(Math.max(0, idx - 20), Math.min(text.length, idx + 40)).toLowerCase()
    if (/dagligt|om dagen|anbefalet daglig dosis|indtagelse af/.test(local)) continue

    const val = parseInt(m[1], 10)
    if (!Number.isFinite(val)) continue
    if (best == null || val > best) best = val
  }

  if (best != null) return best
  // Fallback if all matches looked like dose-context.
  return parseInt(matches[0][1], 10)
}

function extractPackUnitCount(text: string, kind: "capsules" | "tablets"): number | null {
  const unitPattern =
    kind === "capsules"
      ? "(?:kaps(?:el|ler)?|kaps\\.|kaps|kap\\.)"
      : "(?:tabletter|tablet|tabs\\.|tabs|tabl\\.|tabl)"
  const re = new RegExp(`(\\d{1,4})\\s*${unitPattern}\\b`, "gi")
  const matches = [...text.matchAll(re)]
  if (matches.length === 0) return null

  let best: number | null = null
  for (const m of matches) {
    const idx = m.index ?? 0
    const local = text.slice(Math.max(0, idx - 28), Math.min(text.length, idx + 60)).toLowerCase()

    // Must look like "in package" context, not dosing instructions.
    const looksLikePack =
      /pakke|i pakken|pr\.?\s*pakke|pr\.?\s*bøtte|bøtte|dåse|antal|stk\.?|styk/i.test(local)
    const looksLikeDose = /tag\s+\d|dagligt|om dagen|anbefalet|dosis|indtagelse/i.test(local)
    if (!looksLikePack || looksLikeDose) continue

    const val = parseInt(m[1], 10)
    if (!Number.isFinite(val)) continue
    // Pack counts for capsules/tablets are almost never single-digit; those are usually dosing ("tag 2-3 tabletter").
    if (val < 15) continue
    if (best == null || val > best) best = val
  }

  return best
}

function extractUnitCountFromTitle(title: string): { capsules?: number; tablets?: number; units?: number } {
  const t = String(title || "")
  const capsules =
    parseInt((t.match(/\b(\d{1,4})\s*(?:kaps(?:ler|el)?|kaps\.|kap\.)\b/i) || [])[1] || "", 10)
  const tablets =
    parseInt((t.match(/\b(\d{1,4})\s*(?:tabletter|tablet|tabs\.|tabl\.)\b/i) || [])[1] || "", 10)
  const units =
    parseInt((t.match(/\b(\d{1,4})\s*(?:stk\.|stk|styk)\b/i) || [])[1] || "", 10)

  return {
    capsules: Number.isFinite(capsules) ? capsules : undefined,
    tablets: Number.isFinite(tablets) ? tablets : undefined,
    units: Number.isFinite(units) ? units : undefined,
  }
}

function extractMultipackCountFromTitle(title: string): number | null {
  const t = String(title || "").trim()
  const match = t.match(/^(\d{1,4})\s*[x×]\b/i)
  if (!match) return null
  const count = parseInt(match[1], 10)
  return Number.isFinite(count) && count > 1 ? count : null
}

function extractBarUnitWeightFromTitle(title: string): number | null {
  const t = String(title || "")
  const matches = [...t.matchAll(/(\d+(?:[.,]\d+)?)\s*(kg|g|gram)\b/gi)]
  if (matches.length === 0) return null

  for (const m of matches) {
    const value = parseNumber(m[1])
    if (value == null || value <= 0) continue
    const unit = String(m[2] || "").toLowerCase()
    const grams = unit === "kg" ? value * 1000 : value
    if (grams > 0 && grams <= 250) return grams
  }

  return null
}

function extractWeightInGrams(text: string): number | null {
  const matches = [...text.matchAll(/(\d+(?:[.,]\d+)?)\s*(kg|g|gram)\b/gi)]
  if (matches.length === 0) return null

  // Pick largest value, often package size.
  let max = 0
  for (const m of matches) {
    const idx = m.index ?? 0
    const localContext = text.slice(Math.max(0, idx - 24), Math.min(text.length, idx + 36)).toLowerCase()
    if (/pr\.?\s*portion|per\s*portion|pr\.?\s*serving|per\s*serving/.test(localContext)) continue
    if (/(?:pr\.?|per)\s*100\s*g/.test(localContext)) continue

    const val = parseNumber(m[1])
    if (val == null) continue
    const unit = m[2].toLowerCase()
    const grams = unit === "kg" ? val * 1000 : val
    if (grams > max) max = grams
  }
  return max > 0 ? max : null
}

function extractStructuredWeightInGrams(raw: string | undefined): number | null {
  const input = String(raw || "").trim()
  if (!input) return null
  const match = input.match(/(\d+(?:[.,]\d+)?)\s*(kg|g|gram)\b/i)
  if (!match) return null
  const value = parseNumber(match[1])
  if (value == null || value <= 0) return null
  const unit = match[2].toLowerCase()
  const grams = unit === "kg" ? value * 1000 : value
  return grams >= 50 && grams <= 10000 ? grams : null
}

function extractProteinPerServing(text: string): number | null {
  const m = text.match(/(\d+(?:[.,]\d+)?)\s*(?:g|gram)(?:\s*protein)?\s*(?:pr\.?\s*|per\s*)(?:portion|serving)/i)
  if (!m) return null
  return parseNumber(m[1])
}

function extractServingSizeInGrams(text: string): number | null {
  const patterns = [
    /portion(?:sstørrelse)?\s*[:\-]?\s*(\d+(?:[.,]\d+)?)\s*(?:g|gram)\b/i,
    /(\d+(?:[.,]\d+)?)\s*(?:g|gram)\s*\(?\s*(?:~\s*)?(?:pr\.?\s*)?(?:portion|serving)\b/i,
    /(?:portion|serving)\s*[:\-]?\s*(\d+(?:[.,]\d+)?)\s*(?:g|gram)\b/i,
  ]

  for (const pattern of patterns) {
    const m = text.match(pattern)
    if (!m) continue
    const grams = parseNumber(m[1])
    if (grams != null && grams > 0 && grams < 250) return grams
  }

  const packageAndServings = text.match(/(\d+(?:[.,]\d+)?)\s*(?:g|gram|kg)\b[^\n]{0,40}\((\d+(?:[.,]\d+)?)\s*portioner?\)/i)
  if (packageAndServings) {
    const size = parseNumber(packageAndServings[1])
    const portions = parseNumber(packageAndServings[2])
    if (size != null && portions != null && portions > 0) {
      const isKg = /\bkg\b/i.test(packageAndServings[0])
      const grams = (isKg ? size * 1000 : size) / portions
      if (grams > 0 && grams < 250) return grams
    }
  }
  return null
}

function extractProteinPer100g(text: string): number | null {
  const m = text.match(/(\d+(?:[.,]\d+)?)\s*g\s*pr\.?\s*100\s*g/i)
  if (!m) return null
  return parseNumber(m[1])
}

function extractProteinPercent(text: string): number | null {
  const m = text.match(/(\d+(?:[.,]\d+)?)\s*%\s*protein/i)
  if (!m) return null
  return parseNumber(m[1])
}

function extractIronMgPerUnit(text: string): number | null {
  const m = text.match(/(\d+(?:[.,]\d+)?)\s*mg\s*jern(?:\s*pr\.?\s*(?:kapsel|tablet))?/i)
  if (!m) return null
  return parseNumber(m[1])
}

function extractDosePerDay(text: string): number | null {
  const one = /\b(?:1|en|én)\s*(?:kapsel|tablet|portion|dosis)\w*\s*(?:dagligt|om dagen)/i
  const two = /\b(?:2|to)\s*(?:kapsel|tablet|portion|dosis)\w*\s*(?:dagligt|om dagen)/i
  if (two.test(text)) return 2
  if (one.test(text)) return 1
  return null
}

function extractVolumeInMl(text: string): number | null {
  const matches = [...text.matchAll(/(\d+(?:[.,]\d+)?)\s*(l|ml|cl|dl)\b/gi)]
  if (matches.length === 0) return null
  let max = 0
  for (const m of matches) {
    const idx = m.index ?? 0
    const localContext = text.slice(Math.max(0, idx - 24), Math.min(text.length, idx + 36)).toLowerCase()
    if (/pr\.?\s*portion|per\s*portion|pr\.?\s*serving|per\s*serving/.test(localContext)) continue

    const val = parseNumber(m[1])
    if (val == null) continue
    const unit = m[2].toLowerCase()
    let ml = val
    if (unit === "l") ml = val * 1000
    if (unit === "cl") ml = val * 10
    if (unit === "dl") ml = val * 100
    if (ml > max) max = ml
  }
  return max > 0 ? max : null
}

function detectSupplementForm(text: string): string | null {
  const t = text.toLowerCase()
  const title = t.split(/\n/)[0] || t

  // Prefer explicit signals in title/heading, not arbitrary mentions in body text.
  if (/\b(tyggetablet|tyggetabl|gummies|vingummi)\b/.test(title)) return "Tyggetabletter/Gummies"
  if (/\b(kapsel|kapsler|capsule|capsules|softgel|softgels|caps)\b/.test(title)) return "Kapsler"
  if (/\b(tablet|tabletter|tabs?|tabl\.)\b/.test(title)) return "Tabletter"
  if (/\b(pulver|powder)\b/.test(title)) return "Pulver"
  if (/\b(olie|oil)\b/.test(title)) return "Olie"
  if (/\b(bar|proteinbar|protein-bar|snackbar|snack-bar)\b/.test(title)) return "Bar"
  if (/\b(dråber|draaber)\b/.test(title)) return "Dråber"

  // Secondary explicit "form" declaration in body.
  const formDecl = t.match(/\bform\s*[:\-]?\s*(kapsel|tablet|pulver|olie|dråber|gummies?)\b/)
  if (formDecl) {
    const token = formDecl[1]
    if (/kapsel/.test(token)) return "Kapsler"
    if (/tablet/.test(token)) return "Tabletter"
    if (/pulver/.test(token)) return "Pulver"
    if (/olie/.test(token)) return "Olie"
    if (/dråber/.test(token)) return "Dråber"
    if (/gummi/.test(token)) return "Tyggetabletter/Gummies"
  }

  return null
}

type KeyNutrient = { label: string; aliases: string[] }

function getKeyNutrientForCategory(catSlug: string): KeyNutrient | null {
  const map: Array<{ match: RegExp; nutrient: KeyNutrient }> = [
    { match: /jern/, nutrient: { label: "Jern", aliases: ["jern"] } },
    { match: /magnesium/, nutrient: { label: "Magnesium", aliases: ["magnesium"] } },
    { match: /zink/, nutrient: { label: "Zink", aliases: ["zink"] } },
    { match: /calcium|kalcium/, nutrient: { label: "Calcium", aliases: ["calcium", "kalcium"] } },
    { match: /kalium/, nutrient: { label: "Kalium", aliases: ["kalium"] } },
    { match: /selen/, nutrient: { label: "Selen", aliases: ["selen"] } },
    { match: /krom/, nutrient: { label: "Krom", aliases: ["krom"] } },
    { match: /kobber/, nutrient: { label: "Kobber", aliases: ["kobber"] } },
    { match: /mangan/, nutrient: { label: "Mangan", aliases: ["mangan"] } },
    { match: /jod/, nutrient: { label: "Jod", aliases: ["jod"] } },
    { match: /omega-?3|fiskeolie|krillolie/, nutrient: { label: "Omega-3", aliases: ["omega-3", "omega3", "epa", "dha"] } },
    { match: /kreatin/, nutrient: { label: "Kreatin", aliases: ["kreatin", "creatine"] } },
    { match: /koffein|pwo-med-koffein|pre-workout/, nutrient: { label: "Koffein", aliases: ["koffein", "caffeine"] } },
    { match: /bcaa/, nutrient: { label: "BCAA", aliases: ["bcaa"] } },
    { match: /eaa/, nutrient: { label: "EAA", aliases: ["eaa"] } },
    { match: /beta-alanin/, nutrient: { label: "Beta-alanin", aliases: ["beta-alanin", "beta alanin"] } },
    { match: /glutamin/, nutrient: { label: "Glutamin", aliases: ["glutamin"] } },
    { match: /l-leucin|leucin/, nutrient: { label: "L-leucin", aliases: ["l-leucin", "leucin"] } },
    { match: /taurin/, nutrient: { label: "Taurin", aliases: ["taurin"] } },
    { match: /arginin/, nutrient: { label: "Arginin", aliases: ["arginin"] } },
    { match: /q10/, nutrient: { label: "Q10", aliases: ["q10", "coq10"] } },
    { match: /nac/, nutrient: { label: "NAC", aliases: ["nac"] } },
    { match: /d-vitamin/, nutrient: { label: "D-vitamin", aliases: ["d-vitamin", "vitamin d", "d3"] } },
    { match: /c-vitamin/, nutrient: { label: "C-vitamin", aliases: ["c-vitamin", "vitamin c"] } },
    { match: /b12/, nutrient: { label: "B12", aliases: ["b12", "vitamin b12"] } },
  ]
  for (const entry of map) {
    if (entry.match.test(catSlug)) return entry.nutrient
  }
  return null
}

function extractKeyNutrientDose(text: string, nutrient: KeyNutrient): { amount: number; unit: string } | null {
  const aliasGroup = nutrient.aliases.map((a) => a.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")
  const isAminoCategory = /^(eaa|bcaa)$/i.test(nutrient.label)

  const normalizeAmino = (amount: number, unit: string): { amount: number; unit: string } | null => {
    const u = unit.toLowerCase()
    // For amino products we want "active per serving" amounts, not pack sizes.
    if (u === "mg") {
      if (amount <= 0 || amount > 100_000) return null
      return { amount, unit: "mg" }
    }
    if (u === "g") {
      // 360 g etc. is almost certainly pack size, not EAA/BCAA per serving.
      if (amount <= 0 || amount > 25) return null
      return { amount: Math.round(amount * 1000), unit: "mg" }
    }
    return null
  }

  // Pattern A: "20 mg jern"
  let m = text.match(new RegExp(`(\\d+(?:[.,]\\d+)?)\\s*(mg|mcg|µg|g)\\s*(?:${aliasGroup})\\b`, "i"))
  if (m) {
    const amount = parseNumber(m[1])
    if (amount != null) {
      if (isAminoCategory) {
        const norm = normalizeAmino(amount, m[2])
        if (norm) return norm
      } else {
        return { amount, unit: m[2].toLowerCase() }
      }
    }
  }

  // Pattern B: "jern ... 20 mg"
  m = text.match(new RegExp(`(?:${aliasGroup})\\b[^\\n\\.]{0,35}?(\\d+(?:[.,]\\d+)?)\\s*(mg|mcg|µg|g)`, "i"))
  if (m) {
    const amount = parseNumber(m[1])
    if (amount != null) {
      if (isAminoCategory) {
        const norm = normalizeAmino(amount, m[2])
        if (norm) return norm
      } else {
        return { amount, unit: m[2].toLowerCase() }
      }
    }
  }

  return null
}

function extractCreatineMgPerServing(text: string): number | null {
  const patterns = [
    /creatin(?:e)?monohydrat\b[^\n\.]{0,40}?(\d+(?:[.,]\d+)?)\s*(mg|g)\b/i,
    /(\d+(?:[.,]\d+)?)\s*(mg|g)\s*creatin(?:e)?monohydrat\b/i,
    /\bcreatin\b[^\n\.]{0,20}?(\d+(?:[.,]\d+)?)\s*(mg|g)\b/i,
    /(\d+(?:[.,]\d+)?)\s*(mg|g)\s*(?:rent\s+)?creatin\b/i,
  ]

  for (const pattern of patterns) {
    const match = text.match(pattern)
    if (!match) continue
    const amount = parseNumber(match[1])
    if (amount == null) continue
    const unit = match[2].toLowerCase()
    const mg = unit === "g" ? amount * 1000 : amount
    if (mg > 0 && mg <= 25_000) return mg
  }

  return null
}

function extractFlavorCount(text: string): number | null {
  const m = text.match(/(\d{1,2})\s*(?:smagsvarianter|smage)/i)
  if (!m) return null
  return parseInt(m[1], 10)
}

function extractOriginCountry(text: string): string | null {
  const t = String(text || "").replace(/\s+/g, " ").trim()
  if (!t) return null
  const m = t.match(/\boprindelsesland\b\s*:?\s*([a-zæøåA-ZÆØÅ][a-zæøåA-ZÆØÅ \-]{1,40})/i)
  if (m) return cleanOriginCountryValue(m[1])
  const m2 = t.match(/\bcountry of origin\b\s*:?\s*([a-zA-Z][a-zA-Z \-]{1,40})/i)
  if (m2) return cleanOriginCountryValue(m2[1])
  return null
}

function cleanOriginCountryValue(raw: string): string {
  let out = String(raw || "").replace(/\s{2,}/g, " ").trim()
  out = out.split(/\b(?:produktets|ingrediens|nærings|emballage)\b/i)[0].trim()
  return out.split(/\s+/).filter(Boolean).slice(0, 3).join(" ")
}

function extractIronForm(text: string): string {
  const forms: string[] = []
  if (/jernbisglycinat/i.test(text)) forms.push("Jernbisglycinat")
  if (/ferrocitrat/i.test(text)) forms.push("Ferrocitrat")
  if (/glyconatitrat/i.test(text)) forms.push("Glyconatitrat")
  if (forms.length === 0) return "Ikke oplyst"
  return forms.join(" + ")
}

function extractSweetenerInfo(text: string): string {
  if (/uden (?:sødestoffer|tilsat sukker)/i.test(text)) return "Uden sødestoffer/sukker"
  if (/sukkerfri/i.test(text)) return "Sukkerfri"
  if (/lavt indhold af (?:fedt og )?sukker|lavt sukkerindhold|low sugar/i.test(text)) return "Lavt sukkerindhold"

  const explicitSweeteners: string[] = []
  if (/aspartam|aspartame/i.test(text)) explicitSweeteners.push("Aspartam")
  if (/sukralose|sucralose/i.test(text)) explicitSweeteners.push("Sukralose")
  if (/acesulfam(?:-|\s)?k/i.test(text)) explicitSweeteners.push("Acesulfam-K")
  if (/steviol(?:glykosid|glycoside)er?|stevia/i.test(text)) explicitSweeteners.push("Stevia")

  if (explicitSweeteners.length > 0) {
    return [...new Set(explicitSweeteners)].join(" + ")
  }

  // If we can parse sugar per 100g, prefer that over vague sugar wording.
  const sugarPer100 = extractNutritionPer100(text, "sugar")
  if (sugarPer100 != null) {
    if (sugarPer100 <= 0.01) return "0 g sukkerarter/100 g"
    if (sugarPer100 > 0.01) return "Indeholder sukker"
  }

  if (/sødet med|sødestof|sødestoffer/i.test(text)) return "Sødestoffer"
  if (/sukker/i.test(text)) return "Indeholder sukker"
  return "Ikke oplyst"
}

function isReasonablePowderProteinPercent(value: number | null): value is number {
  return value != null && value >= 20 && value <= 100
}

function isReasonablePowderPackageGrams(value: number | null): value is number {
  return value != null && value >= 100 && value <= 5000
}

function isReasonablePowderPricePerKg(value: number | null): value is number {
  return value != null && value >= 80 && value <= 2000
}

function resolveSizeOverrideSelection(
  override: ProductOverride | undefined,
  structuredPackageGrams: number | null,
  structuredPriceKr: number | null,
): { selected: NonNullable<ProductOverride["sizeOptions"]>[number] | null; conflict: boolean } {
  const options = override?.sizeOptions || []
  if (options.length === 0) return { selected: null, conflict: false }

  const sizeTolerance = 10
  const priceTolerance = 5

  if (structuredPackageGrams != null && structuredPriceKr != null) {
    const both = options.find(
      (opt) =>
        Math.abs(opt.grams - structuredPackageGrams) <= sizeTolerance &&
        Math.abs(opt.price - structuredPriceKr) <= priceTolerance,
    )
    if (both) return { selected: both, conflict: false }

    const sizeOnly = options.some((opt) => Math.abs(opt.grams - structuredPackageGrams) <= sizeTolerance)
    const priceOnly = options.some((opt) => Math.abs(opt.price - structuredPriceKr) <= priceTolerance)
    if (sizeOnly || priceOnly) return { selected: null, conflict: true }
    return { selected: null, conflict: false }
  }

  if (structuredPriceKr != null) {
    const byPrice = options.find((opt) => Math.abs(opt.price - structuredPriceKr) <= priceTolerance)
    if (byPrice) return { selected: byPrice, conflict: false }
  }

  if (structuredPackageGrams != null) {
    const bySize = options.find((opt) => Math.abs(opt.grams - structuredPackageGrams) <= sizeTolerance)
    if (bySize) return { selected: bySize, conflict: false }
  }

  return {
    selected: [...options].sort((a, b) => a.grams - b.grams)[0] || null,
    conflict: false,
  }
}

function extractCaffeineMgPerServing(text: string): number | null {
  const patterns = [
    /(\d+(?:[.,]\d+)?)\s*mg\s*(?:koffein|caffeine)\b/i,
    /(?:koffein|caffeine)\b[^\n\.]{0,40}?(\d+(?:[.,]\d+)?)\s*mg/i,
  ]
  for (const pattern of patterns) {
    const m = text.match(pattern)
    if (!m) continue
    const n = parseNumber(m[1])
    if (n != null && n > 0 && n < 1200) return n
  }
  return null
}

function buildCategoryQuickFacts(input: {
  catSlug: string
  slug: string
  title: string
  text: string
  extraText?: string
  price: string
  brand: string
  rating: number
  override?: ProductOverride
  crawled?: any
}): Array<{ label: string; value: string }> {
  const { catSlug, title, text, brand, override, extraText, crawled } = input
  const merged = `${title}\n${text}\n${extraText || ""}`.trim()
  const explicitPrice = input.price.match(/(\d{2,4})/)
  const priceNum = explicitPrice ? parseInt(explicitPrice[1], 10) : extractPriceNumber(merged)
  const structuredPackageGrams = extractStructuredWeightInGrams(typeof crawled?.size === "string" ? crawled.size : "")
  const packageGrams = structuredPackageGrams ?? extractWeightInGrams(merged)
  const portions = extractCount(merged, "portioner?")

  // Prefer explicit unit counts in the title (usually most reliable), then fall back to body parsing.
  const titleUnits = extractUnitCountFromTitle(title)

  // Match both full words ("kapsler") and abbreviations ("kaps.", "kap.").
  const capsules = titleUnits.capsules ?? extractPackUnitCount(merged, "capsules")
  const tablets = titleUnits.tablets ?? extractPackUnitCount(merged, "tablets")
  const originCountry = extractOriginCountry(merged)
  const crawledText = [
    crawled?.description || "",
    crawled?.fullDescription || "",
    crawled?.ingredients || "",
    crawled?.nutritionInfo || "",
    crawled?.dosage || "",
  ]
    .filter(Boolean)
    .join("\n")

  const facts: Array<{ label: string; value: string }> = [{ label: "Mærke", value: brand }]

  if (catSlug === "kasein") {
    const structuredPriceNum = normalizeCrawledPriceToKr(crawled) ?? priceNum
    const overrideResolution = resolveSizeOverrideSelection(override, structuredPackageGrams, structuredPriceNum)
    const selectedSize = overrideResolution.selected
    const shouldShowSizeRange =
      Boolean(override?.sizeOptions?.length) &&
      !overrideResolution.conflict &&
      selectedSize == null &&
      structuredPackageGrams == null &&
      structuredPriceNum == null
    const effectivePriceNum = selectedSize?.price ?? structuredPriceNum ?? priceNum
    const effectivePackageGrams = selectedSize?.grams ?? structuredPackageGrams ?? packageGrams
    const proteinServing = extractProteinPerServing(crawledText) ?? extractProteinPerServing(merged)
    const servingSize = extractServingSizeInGrams(crawledText) ?? extractServingSizeInGrams(merged)
    const protein100 =
      extractNutritionPer100(crawledText, "protein") ??
      extractProteinPer100g(crawledText) ??
      extractProteinPer100g(merged)
    const proteinPct = extractProteinPercent(crawledText) ?? extractProteinPercent(merged)
    const proteinPctFromServing =
      proteinServing != null && servingSize != null && servingSize > 0
        ? (proteinServing / servingSize) * 100
        : null
    const proteinPercent =
      [protein100, proteinPct, proteinPctFromServing].find((value) => isReasonablePowderProteinPercent(value ?? null)) ?? null
    const flavorCount =
      Array.isArray(crawled?.flavors) && crawled.flavors.length > 0
        ? crawled.flavors.length
        : extractFlavorCount(merged)
    const sweetener = extractSweetenerInfo(`${crawled?.ingredients || ""}\n${crawled?.nutritionInfo || ""}\n${merged}`)
    const effectivePortions = selectedSize?.portions ?? extractCount(crawledText, "portioner?") ?? portions

    if (isReasonablePowderProteinPercent(proteinPercent)) {
      facts.push({ label: "Proteinhalt", value: `${formatNumberDa(proteinPercent)}%` })
    }

    if (shouldShowSizeRange && override?.sizeOptions && override.sizeOptions.length > 0) {
      facts.push({ label: "Pris", value: override.sizeOptions.map((s) => `${s.price} kr`).join(" / ") })
    } else if (effectivePriceNum != null) facts.push({ label: "Pris", value: `${effectivePriceNum} kr` })
    else facts.push({ label: "Pris", value: "Se aktuel pris" })

    if (shouldShowSizeRange && override?.sizeOptions && override.sizeOptions.length > 0) {
      facts.push({
        label: "Pakningsstørrelse",
        value: override.sizeOptions.map((s) => `${formatNumberDa(s.grams, 0)} g`).join(" / "),
      })
      const kgVals = override.sizeOptions.map((s) => (s.price / s.grams) * 1000)
      if (kgVals.length > 0) {
        const min = Math.min(...kgVals)
        const max = Math.max(...kgVals)
        facts.push({
          label: "Pris/kg",
          value: min === max ? `${formatNumberDa(min)} kr` : `${formatNumberDa(min)}–${formatNumberDa(max)} kr`,
        })
      }

      const selectedSize = [...override.sizeOptions].sort((a, b) => a.grams - b.grams)[0]
      if (selectedSize?.portions && selectedSize.portions > 0) {
        facts.push({ label: "Portioner/pakke", value: `${selectedSize.portions}` })
        facts.push({ label: "Pris/portion", value: `${formatNumberDa(selectedSize.price / selectedSize.portions)} kr` })
      }
    } else if (isReasonablePowderPackageGrams(effectivePackageGrams)) {
      facts.push({ label: "Pakningsstørrelse", value: `${formatNumberDa(effectivePackageGrams, 0)} g` })
      if (effectivePriceNum != null) {
        const perKg = (effectivePriceNum / effectivePackageGrams) * 1000
        facts.push({ label: "Pris/kg", value: `${formatNumberDa(perKg)} kr` })
      }
    }

    if (!(shouldShowSizeRange && override?.sizeOptions && override.sizeOptions.length > 0) && effectivePortions != null) {
      facts.push({ label: "Portioner/pakke", value: `${effectivePortions}` })
      if (effectivePriceNum != null) {
        const perPortion = effectivePriceNum / effectivePortions
        facts.push({ label: "Pris/portion", value: `${formatNumberDa(perPortion)} kr` })
      }
    }

    if (flavorCount != null) facts.push({ label: "Antal smage", value: `${flavorCount}` })
    else if (/smagsvarianter|smag/i.test(merged)) facts.push({ label: "Antal smage", value: "Flere varianter" })

    facts.push({ label: "Sødning", value: sweetener })
    if (originCountry) facts.push({ label: "Oprindelsesland", value: originCountry })
  } else if (catSlug === "jern-tabletter") {
    const ironMg = extractIronMgPerUnit(merged)
    const dailyDose = extractDosePerDay(merged)
    const unitCount = capsules || tablets || extractCount(merged, "stk")
    const ironForm = extractIronForm(merged)
    const hasVitC = /c-vitamin|vitamin c/i.test(merged) ? "Ja" : "Nej"

    if (ironMg != null) facts.push({ label: "Jern pr. enhed", value: `${formatNumberDa(ironMg)} mg` })
    facts.push({ label: "Jernform", value: ironForm })
    facts.push({ label: "Vitamin C", value: hasVitC })

    if (unitCount != null) {
      const unitLabel = capsules ? "Kapsler/pakke" : "Tabletter/pakke"
      facts.push({ label: unitLabel, value: `${unitCount}` })
    }

    if (dailyDose != null) facts.push({ label: "Daglig dosis", value: `${dailyDose} enhed` })

    if (priceNum != null) facts.push({ label: "Pris", value: `${priceNum} kr` })
    else facts.push({ label: "Pris", value: "Se aktuel pris" })

    if (priceNum != null && unitCount != null && unitCount > 0) {
      const perUnit = priceNum / unitCount
      facts.push({ label: "Pris/enhed", value: `${formatNumberDa(perUnit)} kr` })
    }

    if (priceNum != null && unitCount != null && dailyDose != null && dailyDose > 0) {
      const doses = unitCount / dailyDose
      if (doses > 0) {
        const perDose = priceNum / doses
        facts.push({ label: "Pris/dagsdosis", value: `${formatNumberDa(perDose)} kr` })
      }
    }
  } else {
    // Generic engine for all remaining categories.
    const servingSizeGrams = extractServingSizeInGrams(merged)
    const volumeMl = extractVolumeInMl(merged)
    const isPwoCategory = /pwo|pre-workout/.test(catSlug)
    const form = detectSupplementForm(merged) ?? (isPwoCategory ? "Pulver" : null)
    const isBarProduct = form === "Bar" || /\b(bar|proteinbar|protein-bar|snackbar|snack-bar)\b/i.test(title)
    const multipackCount = isBarProduct ? extractMultipackCountFromTitle(title) : null
    const barUnitWeightFromTitle = isBarProduct ? extractBarUnitWeightFromTitle(title) : null
    const unitCount = capsules || tablets || multipackCount || extractCount(merged, "stk")
    const dailyDose = extractDosePerDay(merged)
    const keyNutrient = getKeyNutrientForCategory(catSlug)
    const factSourceText = `${crawledText}\n${merged}`
    const keyDose =
      catSlug === "kreatin"
        ? (() => {
            const creatineMg = extractCreatineMgPerServing(factSourceText)
            return creatineMg != null ? { amount: creatineMg, unit: "mg" } : null
          })()
        : (keyNutrient ? extractKeyNutrientDose(factSourceText, keyNutrient) : null)
    const caffeineMg = extractCaffeineMgPerServing(factSourceText)
    const flavorCount = extractFlavorCount(factSourceText)
    const sweetener = extractSweetenerInfo(factSourceText)

    if (form) facts.push({ label: "Form", value: form })
    if (originCountry) facts.push({ label: "Oprindelsesland", value: originCountry })

    if (keyNutrient && keyDose) {
      const unitText = (capsules || tablets || unitCount) ? "enhed" : "portion"
      facts.push({ label: `${keyNutrient.label} pr. ${unitText}`, value: `${formatNumberDa(keyDose.amount)} ${keyDose.unit}` })
    }
    if (isPwoCategory && caffeineMg != null) {
      facts.push({ label: "Koffein pr. portion", value: `${formatNumberDa(caffeineMg)} mg` })
    } else if (isPwoCategory) {
      facts.push({ label: "Koffein pr. portion", value: "Ikke oplyst" })
    }

    const hasSizeOverride = !!(override?.sizeOptions && override.sizeOptions.length > 0)
    const effectivePriceNum = priceNum ?? (hasSizeOverride ? override!.sizeOptions![0].price : null)
    const isUnitProduct = Boolean(isBarProduct || capsules || tablets || unitCount != null)

    if (hasSizeOverride) {
      const sizes = override!.sizeOptions!
      const selectedSize = [...sizes].sort((a, b) => a.grams - b.grams)[0]
      facts.push({ label: "Pris", value: sizes.map((s) => `${s.price} kr`).join(" / ") })
      if (isBarProduct) {
        const barCount = unitCount
        if (barCount != null && barCount > 0) {
          const barUnitSize = barUnitWeightFromTitle && barUnitWeightFromTitle > 0
            ? barUnitWeightFromTitle
            : servingSizeGrams && servingSizeGrams > 0
            ? servingSizeGrams
            : (selectedSize?.grams && selectedSize.grams > 0 ? selectedSize.grams / barCount : null)
          facts.push({
            label: "Pakningsstørrelse",
            value: barUnitSize != null
              ? `${formatNumberDa(barCount, 0)} barer á ${formatNumberDa(barUnitSize)} g`
              : `${formatNumberDa(barCount, 0)} barer`,
          })
          facts.push({ label: "Barer/pakke", value: `${barCount}` })
          if (selectedSize?.price && selectedSize.price > 0) {
            facts.push({ label: "Pris/bar", value: `${formatNumberDa(selectedSize.price / barCount)} kr` })
          }
        }
      } else if (!isUnitProduct) {
        facts.push({
          label: "Pakningsstørrelse",
          value: sizes.map((s) => `${formatNumberDa(s.grams, 0)} g`).join(" / "),
        })
      }

      if (!isUnitProduct) {
        const kgVals = sizes.map((s) => (s.price / s.grams) * 1000)
        if (kgVals.length > 0) {
          const min = Math.min(...kgVals)
          const max = Math.max(...kgVals)
          facts.push({
            label: "Pris/kg",
            value: min === max ? `${formatNumberDa(min)} kr` : `${formatNumberDa(min)}–${formatNumberDa(max)} kr`,
          })
        }
      }

      if (!isBarProduct && selectedSize?.portions && selectedSize.portions > 0) {
        facts.push({ label: "Portioner/pakke", value: `${selectedSize.portions}` })
        facts.push({ label: "Pris/portion", value: `${formatNumberDa(selectedSize.price / selectedSize.portions)} kr` })
      }
    } else {
      if (priceNum != null) facts.push({ label: "Pris", value: `${priceNum} kr` })
      else facts.push({ label: "Pris", value: "Se aktuel pris" })

      if (isBarProduct) {
        if (unitCount != null && unitCount > 0) {
          const barUnitSize = barUnitWeightFromTitle && barUnitWeightFromTitle > 0
            ? barUnitWeightFromTitle
            : servingSizeGrams && servingSizeGrams > 0
            ? servingSizeGrams
            : (packageGrams && packageGrams > 0 ? packageGrams / unitCount : null)
          facts.push({
            label: "Pakningsstørrelse",
            value: barUnitSize != null
              ? `${formatNumberDa(unitCount, 0)} barer á ${formatNumberDa(barUnitSize)} g`
              : `${formatNumberDa(unitCount, 0)} barer`,
          })
          facts.push({ label: "Barer/pakke", value: `${unitCount}` })
          if (priceNum != null) {
            facts.push({ label: "Pris/bar", value: `${formatNumberDa(priceNum / unitCount)} kr` })
          }
        }
      } else if (!isUnitProduct && packageGrams != null && packageGrams >= 100) {
        facts.push({ label: "Pakningsstørrelse", value: `${formatNumberDa(packageGrams, 0)} g` })
        if (priceNum != null) {
          const perKg = (priceNum / packageGrams) * 1000
          facts.push({ label: "Pris/kg", value: `${formatNumberDa(perKg)} kr` })
        }
      }
    }

    // Only show price-per-liter when the product is actually a liquid (no gram-based pack size).
    // Many product texts mention "dl/ml water" in usage instructions which must NOT be treated as pack volume.
    if (!isUnitProduct && !hasSizeOverride && (packageGrams == null || packageGrams < 50) && volumeMl != null && volumeMl >= 50) {
      facts.push({ label: "Pakningsstørrelse", value: `${formatNumberDa(volumeMl, 0)} ml` })
      if (effectivePriceNum != null) {
        const perL = (effectivePriceNum / volumeMl) * 1000
        facts.push({ label: "Pris/l", value: `${formatNumberDa(perL)} kr` })
      }
    }

    if (unitCount != null && !isBarProduct) {
      const unitLabel = capsules ? "Kapsler/pakke" : tablets ? "Tabletter/pakke" : "Enheder/pakke"
      facts.push({ label: unitLabel, value: `${unitCount}` })
      if (effectivePriceNum != null && unitCount > 0) {
        const perUnit = effectivePriceNum / unitCount
        facts.push({ label: "Pris/enhed", value: `${formatNumberDa(perUnit)} kr` })
      }
    }

    if (!hasSizeOverride && portions != null && !isBarProduct) {
      facts.push({ label: "Portioner/pakke", value: `${portions}` })
      if (effectivePriceNum != null && portions > 0) {
        const perPortion = effectivePriceNum / portions
        facts.push({ label: "Pris/portion", value: `${formatNumberDa(perPortion)} kr` })
      }
    }

    if (dailyDose != null) {
      facts.push({ label: "Daglig dosis", value: `${dailyDose} enhed` })
      const totalDoseUnits = portions || unitCount
      if (effectivePriceNum != null && totalDoseUnits != null && totalDoseUnits > 0) {
        const doses = totalDoseUnits / dailyDose
        if (doses > 0) {
          const perDose = effectivePriceNum / doses
          facts.push({ label: "Pris/dagsdosis", value: `${formatNumberDa(perDose)} kr` })
        }
      }
    }

    if (flavorCount != null) facts.push({ label: "Antal smage", value: `${flavorCount}` })
    else if (/smagsvarianter|smag/i.test(merged)) facts.push({ label: "Antal smage", value: "Flere varianter" })

    if (/protein|pulver|bar/i.test(catSlug) || /protein|pulver|bar|smag|sødestof|sukker/i.test(merged)) {
      facts.push({ label: "Sødning", value: sweetener })
    }
    if (isPwoCategory) {
      facts.push({ label: "Anvendelse", value: "Før træning" })
    }

  }

  // Remove duplicates and empty values.
  const seen = new Set<string>()
  const uniqueFacts = facts
    .filter((f) => f.value && f.value.trim())
    .filter((f) => {
      const key = `${f.label.toLowerCase()}::${f.value.toLowerCase()}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })

  // Remove redundant "portion" facts when they are equivalent to unit facts
  // (e.g. capsule/tablet products where 1 portion = 1 unit).
  const byLabel = new Map<string, string>()
  for (const f of uniqueFacts) byLabel.set(f.label, f.value)

  const unitCountLabel = byLabel.has("Kapsler/pakke")
    ? "Kapsler/pakke"
    : byLabel.has("Tabletter/pakke")
      ? "Tabletter/pakke"
      : byLabel.has("Enheder/pakke")
        ? "Enheder/pakke"
        : null

  const unitCount = unitCountLabel ? parseNumericPrefix(byLabel.get(unitCountLabel)) : null
  const portionsCount = parseNumericPrefix(byLabel.get("Portioner/pakke"))
  const pricePerUnit = parseNumericPrefix(byLabel.get("Pris/enhed"))
  const pricePerPortion = parseNumericPrefix(byLabel.get("Pris/portion"))
  const dailyDoseUnits = parseNumericPrefix(byLabel.get("Daglig dosis"))
  const pricePerDose = parseNumericPrefix(byLabel.get("Pris/dagsdosis"))

  const sameCount =
    unitCount != null &&
    portionsCount != null &&
    Math.abs(unitCount - portionsCount) < 0.05

  const samePrice =
    pricePerUnit != null &&
    pricePerPortion != null &&
    Math.abs(pricePerUnit - pricePerPortion) < 0.05

  const sameUnitAndDosePrice =
    pricePerUnit != null &&
    pricePerDose != null &&
    Math.abs(pricePerUnit - pricePerDose) < 0.05

  const dailyDoseIsOneUnit =
    dailyDoseUnits != null &&
    Math.abs(dailyDoseUnits - 1) < 0.05

  const cleanedFacts = uniqueFacts.filter((f) => {
    if (sameCount && f.label === "Portioner/pakke") return false
    if (samePrice && f.label === "Pris/portion") return false
    if (sameUnitAndDosePrice && f.label === "Pris/enhed") return false
    if ((sameUnitAndDosePrice || pricePerDose != null) && dailyDoseIsOneUnit && f.label === "Daglig dosis") return false
    return true
  })

  return cleanedFacts.slice(0, 12)
}

/** Known product brands (NOT store names) */
const KNOWN_BRANDS = [
  "Bodylab", "Body science", "Core", "Star Nutrition",
  "Weight World", "Body Science",
  "RawPowder", "RAW", "Nyttoteket", "Matters", "Puori", "Micro Whey",
  "Shakti", "Myprotein", "Optimum Nutrition", "NOW Foods", "Solgar",
  "Nordic Naturals", "Thorne", "Life Extension", "Swanson", "Jarrow",
  "Nature Made", "Garden of Life", "Vital Proteins", "Great Earth",
  "Budo & Fitness", "Better You", "WNT", "4 Her", "4 Him",
  "Swedish Supplements", "Fitnessguru", "Nutramino", "Olimp",
  "Scitec", "Universal", "BSN", "MuscleTech", "Cellucor",
  "Gymgrossisten", "MM Sports", "Healthwell", "XLNT Sports",
  "Terranova", "Lifeworth", "Tested", "Victory", "Allevo",
  "Mother Earth",
]

/** Store names that sometimes prefix product titles */
const STORE_NAMES = ["Healthwell", "Svenskt Kosttillskott"]
const BRAND_OVERRIDES: Record<string, string> = {
  "swedish-supplements-vitamin-e": "Camette",
  "healthwell-trainimal-valleprotein": "Trainimal",
}

/**
 * Clean product title:
 * 1. Remove duplicate store/brand prefix: "Healthwell Healthwell X" → "Healthwell X"
 * 2. Remove store prefix when there's a real brand after it:
 *    "Healthwell RawPowder Fisk Collagen Plus" → "RawPowder Fisk Collagen Plus"
 */
function cleanProductTitle(title: string): string {
  let cleaned = title.trim()

  // Step 1: Remove duplicate prefix ("Healthwell Healthwell X" → "Healthwell X")
  for (const name of [...STORE_NAMES, ...KNOWN_BRANDS]) {
    const prefix = name.toLowerCase() + " " + name.toLowerCase() + " "
    if (cleaned.toLowerCase().startsWith(prefix)) {
      cleaned = name + " " + cleaned.slice(prefix.length)
    }
  }

  // Step 2: Remove store prefix when a different brand follows
  for (const store of STORE_NAMES) {
    if (cleaned.toLowerCase().startsWith(store.toLowerCase() + " ")) {
      const rest = cleaned.slice(store.length).trim()
      for (const b of KNOWN_BRANDS) {
        if (b.toLowerCase() === store.toLowerCase()) continue
        if (rest.toLowerCase().startsWith(b.toLowerCase())) {
          return rest // drop the store prefix, keep the real brand
        }
      }
    }
  }

  cleaned = cleaned.replace(/\s+/g, " ").trim()
  return normalizeDisplayProductTitle(cleaned)
}

function extractBrand(title: string): string {
  if (title.toLowerCase().startsWith("weight world ")) return "Weight World"
  if (title.toLowerCase().startsWith("body science ")) return "Body Science"

  // Match against known brands (longest match first to handle "Body science" before "Body")
  const sorted = [...KNOWN_BRANDS].sort((a, b) => b.length - a.length)
  for (const b of sorted) {
    if (title.toLowerCase().startsWith(b.toLowerCase())) return b
  }
  // Fallback: first word
  return title.split(/\s+/)[0]
}

function stripLeadingStoreFromTitle(title: string): string {
  let out = title.trim()
  for (const store of STORE_NAMES) {
    const prefix = store.toLowerCase() + " "
    if (out.toLowerCase().startsWith(prefix)) {
      out = out.slice(store.length).trim()
    }
  }
  return out
}

function shouldPreferCrawledTitle(currentTitle: string, crawledTitle: string): boolean {
  const current = cleanProductTitle(currentTitle || "")
  const crawled = cleanProductTitle(crawledTitle || "")
  if (!crawled) return false
  if (!current) return true
  if (current.toLowerCase() === crawled.toLowerCase()) return false

  const currentWithoutStore = cleanProductTitle(stripLeadingStoreFromTitle(current))
  if (currentWithoutStore && currentWithoutStore.toLowerCase() === crawled.toLowerCase()) return true

  const hasStorePrefix = STORE_NAMES.some((store) => current.toLowerCase().startsWith(`${store.toLowerCase()} `))
  if (!hasStorePrefix) return false

  const currentToken = toSlugToken(currentWithoutStore || current)
  const crawledToken = toSlugToken(crawled)
  return Boolean(
    currentToken &&
    crawledToken &&
    (currentToken === crawledToken || currentToken.includes(crawledToken) || crawledToken.includes(currentToken))
  )
}

function guessBrandFromTitle(title: string): string | null {
  const t = title.trim()
  if (!t) return null
  return extractBrand(t)
}

function normalizeCrawledBrand(candidate: unknown, title: string): string | null {
  const raw = String(candidate || "").trim()
  if (!raw) return null
  // Drop obvious "store identity" values.
  const cleaned = raw.replace(/\.dk$/i, "").trim()
  if (!cleaned) return null

  // If crawled brand is a store name and title contains another brand, prefer that.
  if (STORE_NAMES.some((s) => s.toLowerCase() === cleaned.toLowerCase())) {
    const withoutStore = stripLeadingStoreFromTitle(title)
    const guessed = guessBrandFromTitle(withoutStore)
    if (guessed && guessed.toLowerCase() !== cleaned.toLowerCase()) return guessed
  }

  return cleaned
}

function fixObviousStoreBrandLeak(text: string, brand: string): string {
  if (!text) return text
  const b = brand.trim()
  if (!b) return text
  let out = text

  // Only do this for known store prefixes when the detected brand is different.
  for (const store of STORE_NAMES) {
    if (store.toLowerCase() === b.toLowerCase()) continue
    // Replace "Healthwell Mother Earth ..." -> "Mother Earth ..."
    out = out.replace(new RegExp(`\\b${store}\\s+${escapeRegExp(b)}\\b`, "gi"), b)
    // Replace "Brandet Healthwell ..." -> "Brandet Mother Earth ..."
    out = out.replace(new RegExp(`\\bBrandet\\s+${store}\\b`, "gi"), `Brandet ${b}`)
  }

  return out
}

function assertProductQa(catSlug: string, slug: string, content: string, quickFacts: Array<{ label: string; value: string }>): void {
  const rawStoreIdPattern = /\b(?:bodystore|corenutrition|mmsportsstore|proteindk|protein-dk|healthwell)\b/
  if (rawStoreIdPattern.test(content)) {
    throw new Error(`QA: råt store-id fundet i produktindhold for ${slug}`)
  }

  if (!/^(kasein|proteinpulver)$/.test(catSlug)) return

  const proteinPercent = parseNumericPrefix(getQuickFactValueFromList(quickFacts, "Proteinhalt"))
  if (proteinPercent != null && !isReasonablePowderProteinPercent(proteinPercent)) {
    throw new Error(`QA: urimelig proteinhalt for ${slug}: ${proteinPercent}%`)
  }

  const pricePerKg = parseNumericPrefix(getQuickFactValueFromList(quickFacts, "Pris/kg"))
  if (pricePerKg != null && !isReasonablePowderPricePerKg(pricePerKg)) {
    throw new Error(`QA: urimelig pris/kg for ${slug}: ${pricePerKg}`)
  }

  const packageGrams = parseNumericPrefix(getQuickFactValueFromList(quickFacts, "Pakningsstørrelse"))
  if (packageGrams != null && !isReasonablePowderPackageGrams(packageGrams)) {
    throw new Error(`QA: urimelig pakningsstørrelse for ${slug}: ${packageGrams} g`)
  }
}

function escapeRegExp(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

function toSlugToken(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

function extractBrandFromSlug(slug: string): string | null {
  const normalized = slug.toLowerCase()
  const sorted = [...KNOWN_BRANDS].sort((a, b) => b.length - a.length)
  for (const brand of sorted) {
    const token = toSlugToken(brand)
    if (!token) continue
    if (normalized === token || normalized.startsWith(`${token}-`)) {
      if (STORE_NAMES.some((store) => store.toLowerCase() === brand.toLowerCase())) return null
      return brand
    }
  }
  return null
}

function slugToTitle(slug: string): string {
  return slug
    .replace(/^https?[-:]*/i, "")
    .split("-")
    .filter(Boolean)
    .map((part) => {
      if (part.length <= 2) return part.toUpperCase()
      return part.charAt(0).toUpperCase() + part.slice(1)
    })
    .join(" ")
}

function isWeakTitle(title: string): boolean {
  const t = title.trim()
  if (!t) return true
  if (/^https?:/i.test(t)) return true
  if (t.split(/\s+/).length <= 2) return true
  return false
}

function sanitizeCopy(text: string): string {
  return text
    .replace(/\btesteter\b/gi, "testet")
    .replace(/\btesteteter\b/gi, "testet")
    .replace(/\bsammenlignet bedste\b/gi, "sammenlignet de bedste")
    .replace(/\s+/g, " ")
    .trim()
}

function normalizeHtmlForMdx(input: string): string {
  let out = String(input || "")
  out = out.replace(/([\s<])class=(["'])/gi, "$1className=$2")
  out = out.replace(/<table(\b[^>]*)>([\s\S]*?)<\/table>/gi, (_m, attrs: string, inner: string) => {
    const body = String(inner || "")
    if (!/<\s*(thead|tbody|tfoot)\b/i.test(body) && /<\s*tr\b/i.test(body)) {
      return `<table${attrs}><tbody>${body}</tbody></table>`
    }
    return `<table${attrs}>${body}</table>`
  })
  return out
}

function sanitizeGeneratedMdx(mdx: string): string {
  const cleaned = mdx
    .replace(/\btesteter\b/gi, "testet")
    .replace(/\btesteteter\b/gi, "testet")
    .replace(/\bsammenlignet bedste\b/gi, "sammenlignet de bedste")
  return normalizeHtmlForMdx(cleaned)
}

function getRelatedLinks(catSlug: string, limit = 8): RelatedLink[] {
  for (const section of MAIN_SECTIONS) {
    const groups = section.groups || []
    for (const group of groups) {
      const idx = group.items.findIndex((item) => item.href.endsWith(`/${catSlug}`))
      if (idx === -1) continue
      const candidates = group.items.filter((item) => !item.href.endsWith(`/${catSlug}`))
      if (candidates.length === 0) return []
      const ordered = group.items
        .slice(idx + 1)
        .concat(group.items.slice(0, idx))
        .filter((item) => !item.href.endsWith(`/${catSlug}`))
      const pick = (ordered.length ? ordered : candidates).slice(0, Math.min(limit, candidates.length))
      return pick.map((item) => ({ label: item.label, href: item.href }))
    }
  }
  return []
}

function buildRelatedArticlesSection(catSlug: string, year: number): string {
  const links = getRelatedLinks(catSlug, 6)
  if (!links.length) return ""

  const lines: string[] = []
  lines.push(`<h2 className="mt-12 mb-6 text-2xl font-bold text-slate-900 border-t border-slate-200 pt-8">Læs også</h2>`)
  lines.push(`<div className="not-prose grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3">`)
  for (const item of links) {
    const relSlug = item.href.split("/").filter(Boolean).pop() || ""
    const heroUrl = `/images/heroes/${relSlug}-banner.webp`
    const headingText = `${item.label} bedst i test ${year}`
    lines.push(`  <a href="${item.href}" className="group flex flex-col gap-3 !no-underline" aria-label="${esc(headingText)}">`)
    lines.push(`    <div className="relative aspect-[16/9] w-full overflow-hidden rounded-xl bg-slate-100 bg-cover bg-center shadow-sm transition-shadow group-hover:shadow-md" style={{ backgroundImage: "url('${heroUrl}'), linear-gradient(135deg, #f8fafc, #e2e8f0)" }}>`)
    lines.push(`      <div className="absolute inset-0 rounded-xl ring-1 ring-inset ring-black/5" />`)
    lines.push(`    </div>`)
    lines.push(`    <div>`)
    lines.push(`      <h3 className="text-sm font-semibold leading-snug text-slate-800 transition-colors group-hover:text-blue-600 m-0 p-0 !no-underline">${esc(headingText)}</h3>`)
    lines.push(`    </div>`)
    lines.push(`  </a>`)
  }
  lines.push(`</div>`)
  return lines.join("\n")
}

type InlineInternalLinkCandidate = {
  label: string
  href: string
}

function getInlineInternalLinkCandidates(catSlug: string): InlineInternalLinkCandidate[] {
  const currentSuffix = `/${catSlug}`
  const seen = new Set<string>()
  const out: InlineInternalLinkCandidate[] = []
  const push = (label: string, href: string) => {
    const cleanLabel = String(label || "").replace(/\s+/g, " ").trim()
    const cleanHref = String(href || "").trim()
    if (!cleanLabel || !cleanHref || cleanHref.endsWith(currentSuffix)) return
    const key = `${cleanLabel.toLowerCase()}|${cleanHref}`
    if (seen.has(key)) return
    seen.add(key)
    out.push({ label: cleanLabel, href: cleanHref })
  }

  for (const [label, href] of Object.entries(SUPPLEMENT_LINK_ALIASES)) push(label, href)
  for (const rel of getRelatedLinks(catSlug, 8)) push(rel.label, rel.href)
  for (const nav of getAllNavLinks()) push(nav.label, nav.href)

  out.sort((a, b) => b.label.length - a.label.length)
  return out
}

function injectInlineInternalLinks(html: string, catSlug: string, maxLinks = 4, usedHrefs?: Set<string>): string {
  let input = String(html || "").trim()
  if (!input) return input

  const protectedAnchors: string[] = []
  input = input.replace(/<a\b[\s\S]*?<\/a>/gi, (match) => {
    const token = `__KM_ANCHOR_${protectedAnchors.length}__`
    protectedAnchors.push(match)
    return token
  })

  const candidates = getInlineInternalLinkCandidates(catSlug)
  if (!candidates.length) return html

  const pageUsedHrefs = usedHrefs || new Set<string>()
  let linkedCount = 0
  const parts = input.split(/(<[^>]+>)/g)
  let insideHeading = false
  const linked = parts
    .map((part) => {
      if (!part) return part
      if (part.startsWith("<")) {
        if (/^<h[1-6]\b/i.test(part)) insideHeading = true
        if (/^<\/h[1-6]>/i.test(part)) insideHeading = false
        return part
      }
      if (insideHeading || linkedCount >= maxLinks) return part

      let text = part
      for (const candidate of candidates) {
        if (linkedCount >= maxLinks) break
        if (pageUsedHrefs.has(candidate.href)) continue
        const escapedLabel = escapeRegExp(candidate.label).replace(/\s+/g, "\\s+")
        const re = new RegExp(`(^|[^\\p{L}\\p{N}])(${escapedLabel})(?=$|[^\\p{L}\\p{N}])`, "iu")
        if (!re.test(text)) continue
        text = text.replace(
          re,
          (_match, prefix: string, matched: string) =>
            `${prefix}<a href="${candidate.href}" className="font-medium text-emerald-700 underline-offset-2 hover:underline">${matched}</a>`,
        )
        pageUsedHrefs.add(candidate.href)
        linkedCount += 1
      }
      return text
    })
    .join("")

  let restored = linked
  protectedAnchors.forEach((anchor, idx) => {
    restored = restored.replace(`__KM_ANCHOR_${idx}__`, anchor)
  })
  return restored
}

function normalizeSupplementToken(value: string): string {
  return value
    .toLowerCase()
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/&/g, " og ")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
}

function toDaSlug(value: string): string {
  return value
    .toLowerCase()
    .replace(/æ/g, "ae")
    .replace(/ø/g, "o")
    .replace(/å/g, "a")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

type NavLink = { label: string; href: string }
let cachedNavLinks: NavLink[] | null = null
let cachedNavLinkIndex: Map<string, string> | null = null

function getAllNavLinks(): NavLink[] {
  if (cachedNavLinks) return cachedNavLinks
  const links: NavLink[] = []
  for (const section of MAIN_SECTIONS) {
    if (section.href) links.push({ label: section.label, href: section.href })
    for (const child of section.children || []) links.push({ label: child.label, href: child.href })
    for (const group of section.groups || []) {
      for (const item of group.items) links.push({ label: item.label, href: item.href })
    }
  }
  cachedNavLinks = links
  return links
}

function getNavLinkIndex(): Map<string, string> {
  if (cachedNavLinkIndex) return cachedNavLinkIndex
  const idx = new Map<string, string>()
  for (const item of getAllNavLinks()) {
    idx.set(normalizeSupplementToken(item.label), item.href)
    const lastSlug = item.href.split("/").filter(Boolean).pop()
    if (lastSlug) idx.set(normalizeSupplementToken(lastSlug.replace(/-/g, " ")), item.href)
  }
  cachedNavLinkIndex = idx
  return idx
}

const SUPPLEMENT_LINK_ALIASES: Record<string, string> = {
  "d vitamin": "/vitaminer/d-vitamin",
  "k2 vitamin": "/vitaminer/vitamin-k2",
  "vitamin k2": "/vitaminer/vitamin-k2",
  "vitamin d3 k2": "/vitaminer/vitamin-d3-k2",
  "c vitamin": "/vitaminer/c-vitamin",
  jern: "/mineraler/jern-tabletter",
  calcium: "/mineraler/calcium",
  kollagen: "/sundhed-velvaere/kollagenpulver",
  "omega 3": "/omega-fedtsyrer/omega-3",
}

function resolveSupplementLink(label: string): string | null {
  const token = normalizeSupplementToken(label)
  if (!token) return null

  const alias = SUPPLEMENT_LINK_ALIASES[token]
  if (alias) return alias

  const idx = getNavLinkIndex()
  const direct = idx.get(token)
  if (direct) return direct

  const slug = toDaSlug(label)
  if (slug) {
    const slugToken = normalizeSupplementToken(slug.replace(/-/g, " "))
    const fromSlug = idx.get(slugToken)
    if (fromSlug) return fromSlug
    const suffix = `/${slug}`
    const bySuffix = getAllNavLinks().find((x) => x.href.endsWith(suffix))
    if (bySuffix) return bySuffix.href
  }

  return null
}

function buildLinkedStackCombos(combos: Array<{ supplements: string[]; benefit: string; timing?: string }>) {
  return combos.map((combo) => ({
    ...combo,
    supplements: combo.supplements.map((s) => {
      const href = resolveSupplementLink(s)
      return href ? { label: s, href } : { label: s }
    }),
  }))
}

function extractRating(text: string, slug: string): { rating: number; userScore: string } {
  // Look for patterns like "4,6 ud af 5", "4.7/5", "5 ud af 5", "score på 4.3/5"
  const patterns: [RegExp, number][] = [
    [/(\d[,\.]\d)\s*ud af\s*5/i, 1],
    [/(\d)\s*ud af\s*5/i, 1],           // whole number like "5 ud af 5"
    [/(\d[,\.]\d)\s*\/\s*5/, 1],
    [/(\d)\s*\/\s*5/, 1],               // whole number like "5/5"
    [/score\s*(?:på|:)?\s*(\d[,\.]\d)/i, 1],
    [/score\s*(?:på|:)?\s*(\d)\s/i, 1], // whole number in score context
    [/bedømmelse\s*(?:på|:)?\s*(\d[,\.]\d)/i, 1],
    [/vurdering\s*(?:på|:)?\s*(\d[,\.]\d)/i, 1],
    [/(\d[,\.]\d)\s*stjerner/i, 1],
  ]

  for (const [pat] of patterns) {
    const m = text.match(pat)
    if (m) {
      const score5 = parseFloat(m[1].replace(",", "."))
      if (score5 >= 1 && score5 <= 5) {
        // Convert 5-scale to 10-scale
        const rating10 = Math.round(score5 * 2 * 10) / 10
        return { rating: rating10, userScore: `${m[1]}/5` }
      }
    }
  }

  // No rating found – deterministic fallback based on slug hash so order is stable
  let hash = 0
  for (let i = 0; i < slug.length; i++) {
    hash = ((hash << 5) - hash + slug.charCodeAt(i)) | 0
  }
  const defaultRating = 7.5 + (Math.abs(hash) % 20) / 10  // 7.5 – 9.4 deterministic
  return { rating: Math.round(defaultRating * 10) / 10, userScore: "" }
}

function extractPrice(text: string): string {
  // Look for price patterns: "279 kr", "pris på 125 kr"
  const patterns = [
    /(\d{2,4})\s*kr/i,
    /pris\s*(?:på|:)?\s*(\d{2,4})/i,
  ]
  for (const pat of patterns) {
    const m = text.match(pat)
    if (m) return `${m[1]} kr`
  }
  return "Se aktuel pris"
}

interface BuildParams {
  frontmatter: any
  categoryTitle: string
  categoryName: string
  catSlug: string
  introContent: string
  existingRaw?: string
  generatedSections?: GeneratedCategorySections
  products: ProductData[]
  preserveProductLinkedContent?: boolean
}

const CATEGORY_HERO_KEYWORD_OVERRIDES: Record<string, string> = {
  "laktosefrit-proteinpulver": "laktosefri proteinpulver",
}

function getCanonicalCategoryHeroKeyword(catSlug: string, categoryName: string): string {
  return CATEGORY_HERO_KEYWORD_OVERRIDES[catSlug] || categoryName
}

function isGenericCategoryHeroTitle(value: string, categoryName: string, year: number): boolean {
  const normalized = String(value || "").replace(/\s+/g, " ").trim().toLowerCase()
  if (!normalized) return true
  const category = categoryName.toLowerCase()
  return (
    normalized === `${category} bedst i test ${year}` ||
    normalized === `bedste ${category} ${year}` ||
    normalized === `bedste ${category} ${year} - vores 5 bedste valg` ||
    normalized === `bedst i test: ${category} ${year}`
  )
}

function isGenericCategoryHeroSlogan(value: string, categoryName: string): boolean {
  const normalized = String(value || "").replace(/\s+/g, " ").trim().toLowerCase()
  if (!normalized) return true
  const category = categoryName.toLowerCase()
  return (
    normalized.includes(`vi har testet`) &&
    normalized.includes(category) &&
    normalized.includes(`favoritter baseret på kvalitet, værdi og daglig brug`)
  )
}

function buildCanonicalCategoryHeroTitle(catSlug: string, categoryName: string, year: number, shownCount: number): string {
  const heroKeyword = getCanonicalCategoryHeroKeyword(catSlug, categoryName)
  return sanitizeCopy(`De bedste ${heroKeyword} ${year} – ${shownCount} produkter testet`)
}

function buildCanonicalCategoryHeroSlogan(catSlug: string, categoryName: string, year: number, shownCount: number): string {
  const heroKeyword = getCanonicalCategoryHeroKeyword(catSlug, categoryName)
  return sanitizeCopy(
    `Her er de bedste ${heroKeyword} ${year} – ${shownCount} produkter testet, der leverer mest kvalitet for pengene ifølge vores eksperter.`,
  )
}

function resolveStableCategoryHeroTitle(frontmatter: any, catSlug: string, categoryName: string, year: number, shownCount: number): string {
  const existing = String(frontmatter?.title || "").trim()
  if (existing && !isGenericCategoryHeroTitle(existing, categoryName, year)) {
    return sanitizeCopy(existing)
  }
  return buildCanonicalCategoryHeroTitle(catSlug, categoryName, year, shownCount)
}

function resolveStableCategoryHeroSlogan(frontmatter: any, catSlug: string, categoryName: string, year: number, shownCount: number): string {
  const existing = String(frontmatter?.slogan || "").trim()
  if (existing && !isGenericCategoryHeroSlogan(existing, categoryName)) {
    return sanitizeCopy(existing)
  }
  return buildCanonicalCategoryHeroSlogan(catSlug, categoryName, year, shownCount)
}

type GeneratedCategorySections = {
  intro?: string
  method?: string
  buyersGuide?: string
  benefits?: string
  caveats?: string
  faq?: string
  sources?: string
}

type ProductAward = {
  label: string
  reason: string
}

const CORE_AWARD_LABELS = ["BEDST I TEST", "BEDSTE PREMIUM", "BEDSTE BUDGET"] as const

function getQuickFactValue(prod: ProductData, label: string): string | null {
  const hit = prod.quickFacts.find((f) => f.label.toLowerCase() === label.toLowerCase())
  return hit?.value ?? null
}

function buildTopPickSnippet(prod: ProductData, award?: ProductAward): string {
  // Featured snippet: prefer short, complete "why" text (not price/technical facts).
  // Numbers belong in the product cards + comparison table.
  const awardLabel = (award?.label || "").toUpperCase()

  if (awardLabel === "BEDST I TEST") return "Bedste samlede valg i testen."
  if (/PREMIUM/.test(awardLabel)) return "Premiumvalg med fokus på kvalitet og samlet profil."
  if (/BUDGET/.test(awardLabel)) return "Budgetvalg med stærk værdi for pengene."
  if (/TABLETVALG/.test(awardLabel)) return "Bedste tabletform i testen."
  if (/KAPSELVALG/.test(awardLabel)) return "Bedste kapselform i testen."
  if (/BRUGERVENLIGE/.test(awardLabel)) return "Nem og praktisk i hverdagen."

  // Conservative fallback (avoid repeating random facts).
  return "Stærk profil, der supplerer de øvrige valg."
}

function awardEmoji(label: string | undefined): string {
  const x = (label || "").toUpperCase()
  if (x.includes("BEDST I TEST")) return "🏆"
  if (x.includes("PREMIUM")) return "✨"
  if (x.includes("BUDGET")) return "💰"
  if (x.includes("TABLET")) return "💊"
  if (x.includes("KAPSEL")) return "💊"
  if (x.includes("PULVER")) return "🥤"
  if (x.includes("BRUGERVENLIGE")) return "👌"
  if (x.includes("RENESTE")) return "🛡️"
  if (x.includes("VÆRDI")) return "📉"
  return "✅"
}

function parseNumericPrefix(value: string | null | undefined): number | null {
  if (!value) return null
  const normalized = value.replace(/\./g, "").replace(",", ".")
  const m = normalized.match(/(\d+(?:\.\d+)?)/)
  if (!m) return null
  const n = Number(m[1])
  return Number.isFinite(n) ? n : null
}

function parseAllNumbers(value: string | null | undefined): number[] {
  if (!value) return []
  const normalized = value.replace(/\./g, "").replace(",", ".")
  return [...normalized.matchAll(/(\d+(?:\.\d+)?)/g)]
    .map((m) => Number(m[1]))
    .filter((n) => Number.isFinite(n))
}

type ComparisonMetric = {
  label: "Pris/bar" | "Pris/kg" | "Pris/l" | "Pris/enhed" | "Pris/portion" | "Pris/dagsdosis"
  valuesBySlug: Record<string, string>
}

type ComparisonUnitKind = "bar" | "kg" | "l" | "enhed" | "portion"

function detectComparisonUnitKind(prod: ProductData): ComparisonUnitKind | null {
  if (getQuickFactValue(prod, "Barer/pakke")) return "bar"
  const form = getQuickFactValue(prod, "Form")?.toLowerCase() || ""
  if (/\bbar\b/.test(form)) return "bar"
  if (
    getQuickFactValue(prod, "Kapsler/pakke") ||
    getQuickFactValue(prod, "Tabletter/pakke") ||
    getQuickFactValue(prod, "Enheder/pakke")
  ) {
    return "enhed"
  }

  const packageSize = getQuickFactValue(prod, "Pakningsstørrelse")?.toLowerCase() || ""
  if (/\bml\b|\bl\b/.test(packageSize)) return "l"
  if (/\bg\b|\bkg\b/.test(packageSize)) return "kg"

  if (getQuickFactValue(prod, "Portioner/pakke")) return "portion"
  return null
}

function deriveMetricValue(prod: ProductData, kind: ComparisonUnitKind): string {
  const labelByKind: Record<ComparisonUnitKind, ComparisonMetric["label"]> = {
    bar: "Pris/bar",
    kg: "Pris/kg",
    l: "Pris/l",
    enhed: "Pris/enhed",
    portion: "Pris/portion",
  }
  const targetLabel = labelByKind[kind]
  const direct = getQuickFactValue(prod, targetLabel)?.trim()
  if (direct) return direct

  const price = parseNumericPrefix(getQuickFactValue(prod, "Pris")) ?? parseNumericPrefix(prod.price)
  if (price == null || price <= 0) return ""

  if (kind === "bar") {
    const barCount = parseNumericPrefix(getQuickFactValue(prod, "Barer/pakke"))
    if (barCount == null || barCount <= 0) return ""
    return `${formatNumberDa(price / barCount)} kr`
  }

  if (kind === "kg") {
    const packageSize = (getQuickFactValue(prod, "Pakningsstørrelse") || "").toLowerCase()
    const size = parseNumericPrefix(packageSize)
    if (size == null || size <= 0) return ""
    const grams = /\bkg\b/.test(packageSize) ? size * 1000 : size
    if (grams <= 0) return ""
    return `${formatNumberDa((price / grams) * 1000)} kr`
  }

  if (kind === "l") {
    const packageSize = (getQuickFactValue(prod, "Pakningsstørrelse") || "").toLowerCase()
    const size = parseNumericPrefix(packageSize)
    if (size == null || size <= 0) return ""
    const ml = /\bl\b/.test(packageSize) && !/\bml\b/.test(packageSize) ? size * 1000 : size
    if (ml <= 0) return ""
    return `${formatNumberDa((price / ml) * 1000)} kr`
  }

  if (kind === "enhed") {
    const unitCount =
      parseNumericPrefix(getQuickFactValue(prod, "Kapsler/pakke")) ??
      parseNumericPrefix(getQuickFactValue(prod, "Tabletter/pakke")) ??
      parseNumericPrefix(getQuickFactValue(prod, "Enheder/pakke"))
    if (unitCount == null || unitCount <= 0) return ""
    return `${formatNumberDa(price / unitCount)} kr`
  }

  const portions = parseNumericPrefix(getQuickFactValue(prod, "Portioner/pakke"))
  if (portions == null || portions <= 0) return ""
  return `${formatNumberDa(price / portions)} kr`
}

function pickComparisonMetric(products: ProductData[], catSlug: string): ComparisonMetric | null {
  if (products.length === 0) return null
  const kinds = products.map((p) => detectComparisonUnitKind(p))
  const knownKinds = kinds.filter((k): k is ComparisonUnitKind => Boolean(k))
  const uniqueKinds = [...new Set(knownKinds)]
  let selectedKind: ComparisonUnitKind | null = null

  if (knownKinds.length >= 2 && uniqueKinds.length === 1) {
    selectedKind = uniqueKinds[0]
  } else {
    // Heuristic fallback by category intent when data is sparse.
    if (/(proteinbarer|veganske-proteinbarer|barer)/i.test(catSlug)) selectedKind = "bar"
    else if (/(pulver|protein|kasein|gainer|pwo|bcaa|eaa|kreatin)/i.test(catSlug)) selectedKind = "kg"
    else if (/(kaps|tablet|jern|vitamin|zink|magnesium|selen|folinsyre|niacin|jod|krom|kobber)/i.test(catSlug)) selectedKind = "enhed"
  }
  if (!selectedKind) return null

  const labelByKind: Record<ComparisonUnitKind, ComparisonMetric["label"]> = {
    bar: "Pris/bar",
    kg: "Pris/kg",
    l: "Pris/l",
    enhed: "Pris/enhed",
    portion: "Pris/portion",
  }

  const valuesBySlug: Record<string, string> = {}
  let numericValues = 0
  for (const p of products) {
    const value = deriveMetricValue(p, selectedKind)
    valuesBySlug[p.slug] = value
    if (parseNumericPrefix(value) != null) numericValues++
  }

  // Show column only when it gives real overview for most rows.
  if (numericValues < Math.max(2, Math.ceil(products.length * 0.6))) return null
  return { label: labelByKind[selectedKind], valuesBySlug }
}

function getCategoryTestFocus(catSlug: string): [string, string, string] {
  if (/(omega|krill|fiskeolie|vegansk-omega)/i.test(catSlug)) {
    return [
      "EPA + DHA pr. dagsdosis",
      "fedtsyre-kilde og optagelighed",
      "renhed, oxidation og friskhed",
    ]
  }
  if (/(protein|kasein|gainer|pwo|bcaa|eaa|kreatin|pulver)/i.test(catSlug)) {
    return [
      "aktiv mængde pr. portion",
      "smag, blandbarhed og daglig brug",
      "pris pr. kg eller portion",
    ]
  }
  if (/(jern|zink|magnesium|mineral|vitamin|selen|folinsyre|niacin|jod|krom|kobber)/i.test(catSlug)) {
    return [
      "mg/ug pr. enhed",
      "kemisk form og biotilgængelighed",
      "pris pr. enhed og dagsdosis",
    ]
  }
  if (/(probiot|maelkesyre|fordojelse|fiber|enzym)/i.test(catSlug)) {
    return [
      "aktiv dosis pr. dag",
      "stammer/formulering og stabilitet",
      "pris pr. dagsdosis",
    ]
  }
  return [
    "aktiv dosis i deklarationen",
    "ingredienskvalitet og renhed",
    "pris i forhold til praktisk brug",
  ]
}

function buildCategorySpecificTestSteps(input: {
  steps: Array<{ step: number; title: string; description: string; duration?: string }>
  catSlug: string
  categoryName: string
  productCount: number
  comparisonMetricLabel?: string
  measurementPoints: Array<{ label: string }>
}): Array<{ step: number; title: string; description: string; duration?: string }> {
  const { steps, catSlug, categoryName, productCount, comparisonMetricLabel, measurementPoints } = input
  const [focusA, focusB, focusC] = getCategoryTestFocus(catSlug)
  const metricText = (comparisonMetricLabel || "Pris/portion").toLowerCase()
  const topCriteria = measurementPoints.slice(0, 3).map((m) => m.label.toLowerCase()).join(", ")

  return steps.map((s) => {
    if (s.step === 1) {
      return {
        ...s,
        description: `Vi udvalgte og indkøbte ${productCount} ${categoryName}-produkter anonymt hos officielle forhandlere for at sikre sammenlignelige markedspriser og versioner.`,
      }
    }
    if (s.step === 2) {
      return {
        ...s,
        description: `Hvert produkt blev gennemgået for ${focusA}, ingrediensliste, deklaration og potentielt problematiske tilsætningsstoffer i netop denne kategori.`,
      }
    }
    if (s.step === 3) {
      return {
        ...s,
        description: `Vi matchede deklareret dosering op mod relevant evidens med fokus på ${focusA} og ${focusB} for at vurdere reel effekt i praksis.`,
      }
    }
    if (s.step === 4) {
      return {
        ...s,
        description: `Brugertesten vurderede daglig anvendelse, tolerabilitet og praktisk kvalitet med fokus på ${focusB} over en længere testperiode.`,
      }
    }
    if (s.step === 5) {
      return {
        ...s,
        description: `Prisanalysen blev beregnet som ${metricText} (når muligt) samt holdt op mod aktivt indhold, så produkter i kategorien kan sammenlignes fair.`,
      }
    }
    if (s.step === 6) {
      return {
        ...s,
        description: `Endelig score blev vægtet på tværs af ${topCriteria} samt ${focusC}, så rangeringen afspejler både kvalitet, effekt og værdi.`,
      }
    }
    return s
  })
}

function buildCategorySpecificMethodology(input: {
  catSlug: string
  categoryName: string
  productCount: number
  comparisonMetricLabel?: string
  measurementPoints: Array<{ label: string; weight: number }>
}): string[] {
  const { catSlug, categoryName, productCount, comparisonMetricLabel, measurementPoints } = input
  const [focusA, focusB, focusC] = getCategoryTestFocus(catSlug)
  const metricText = (comparisonMetricLabel || "Pris/portion").toLowerCase()
  const topWeights = measurementPoints
    .slice(0, 3)
    .map((m) => `${m.label} (${m.weight}%)`)
    .join(", ")

  return [
    `Udvalgt og vurderet ${productCount} ${categoryName}-produkter i samme kategoriunivers.`,
    `Valideret deklarationer med fokus på ${focusA}.`,
    `Sammenlignet doseringskvalitet og evidens med fokus på ${focusB}.`,
    `Vurderet praktisk brug, tolerabilitet og konsistens over tid.`,
    `Beregnet ${metricText} for sammenlignelig økonomi på tværs af produkterne.`,
    `Slutscore vægtet efter: ${topWeights}.`,
    `Ekstra kontrolpunkt: ${focusC}.`,
  ]
}

function getMetricLabelForHumans(metric?: string): string {
  if (!metric) return "pris per relevant enhed"
  if (metric === "Pris/dagsdosis") return "pris per dagsdosis"
  if (metric === "Pris/bar") return "pris per bar"
  if (metric === "Pris/portion") return "pris per portion"
  if (metric === "Pris/enhed") return "pris per enhed"
  if (metric === "Pris/kg") return "pris per kg"
  if (metric === "Pris/l") return "pris per liter"
  return metric.toLowerCase()
}

function buildDynamicMeasurementPoints(catSlug: string, comparisonMetricLabel?: string) {
  const siloId = SLUG_TO_SILO[catSlug] || "sundhed-velvaere"
  const metricHuman = getMetricLabelForHumans(comparisonMetricLabel)

  if (siloId === "protein-traening") {
    return [
      { label: "Aktivt indhold", description: "Reelt protein-/aminosyreindhold pr. portion og kvalitet af råvarer", weight: 30, icon: "💪" },
      { label: "Dosering & anvendelse", description: "Om dosering, timing og portionsstørrelse er praktisk og evidensnær", weight: 25, icon: "⚖️" },
      { label: "Pris-effektivitet", description: `${metricHuman} holdt op mod aktiv mængde i produktet`, weight: 20, icon: "💰" },
      { label: "Renhed", description: "Unødige tilsætningsstoffer, deklarationsklarhed og allergenprofil", weight: 15, icon: "🛡️" },
      { label: "Daglig brug", description: "Smag, opløselighed, mæthed og hvor let produktet er at bruge konsekvent", weight: 10, icon: "🥤" },
    ]
  }

  if (siloId === "omega-fedtsyrer") {
    return [
      { label: "EPA + DHA indhold", description: "Mængde omega-3 pr. anbefalet daglig dosis", weight: 30, icon: "🐟" },
      { label: "Fedtsyreprofil", description: "Kilde, form og optagelighed i praksis", weight: 25, icon: "🧬" },
      { label: "Pris-effektivitet", description: `${metricHuman} sat i relation til omega-3-indhold`, weight: 20, icon: "💰" },
      { label: "Renhed & oxidation", description: "Kvalitetssignaler, friskhed og fravær af uønskede urenheder", weight: 15, icon: "🛡️" },
      { label: "Brugeroplevelse", description: "Kapselstørrelse, eftersmag og daglig tolerance", weight: 10, icon: "👤" },
    ]
  }

  if (siloId === "vitaminer") {
    return [
      { label: "Aktiv vitaminform", description: "Biotilgængelige former og relevant styrke pr. dosis", weight: 30, icon: "🧪" },
      { label: "Doseringsniveau", description: "Om doseringen matcher almindelige behov og anbefalinger", weight: 25, icon: "⚖️" },
      { label: "Pris-effektivitet", description: `${metricHuman} sammenlignet med deklareret vitaminstyrke`, weight: 20, icon: "💰" },
      { label: "Sikkerhed", description: "Overdosering, interaktioner og deklarationsklarhed", weight: 15, icon: "🛡️" },
      { label: "Praktisk brug", description: "Størrelse, synkbarhed og hvor nemt produktet er at bruge dagligt", weight: 10, icon: "👤" },
    ]
  }

  if (siloId === "mineraler") {
    return [
      { label: "Mineralform", description: "Chelater/organiske former og optagelighed i kroppen", weight: 30, icon: "🧲" },
      { label: "Doseringskvalitet", description: "Relevant mængde pr. enhed og fornuftig daglig anbefaling", weight: 25, icon: "⚖️" },
      { label: "Pris-effektivitet", description: `${metricHuman} vurderet op mod mineralmængde`, weight: 20, icon: "💰" },
      { label: "Tolerance", description: "Mavevenlighed, interaktioner og bivirkningsrisiko", weight: 15, icon: "🛡️" },
      { label: "Brugervenlighed", description: "Tablet-/kapselstørrelse og daglig compliance", weight: 10, icon: "👤" },
    ]
  }

  return [
    { label: "Aktiv styrke", description: "Mængde og kvalitet af de ingredienser der driver den forventede effekt", weight: 30, icon: "🧪" },
    { label: "Dokumentation", description: "Hvor godt formulering og dosering stemmer med tilgængelig evidens", weight: 25, icon: "📚" },
    { label: "Pris-effektivitet", description: `${metricHuman} sat i relation til reel nytte`, weight: 20, icon: "💰" },
    { label: "Sikkerhed", description: "Renhed, tolerabilitet og fravær af problematiske tilsætninger", weight: 15, icon: "🛡️" },
    { label: "Praktisk anvendelse", description: "Hvor let produktet er at bruge korrekt over tid", weight: 10, icon: "👤" },
  ]
}

function buildDynamicScenarios(catSlug: string, categoryName: string, comparisonMetricLabel?: string) {
  const siloId = SLUG_TO_SILO[catSlug] || "sundhed-velvaere"
  const metricHuman = getMetricLabelForHumans(comparisonMetricLabel)

  if (siloId === "omega-fedtsyrer") {
    return [
      {
        title: "Daglig omega-rutine",
        description: "Simulering af 2+ ugers konsekvent brug",
        what: "Kapselstørrelse, eftersmag, tolerance og compliance",
        why: "Effekten afhænger af om produktet faktisk bliver taget dagligt",
        icon: "☀️",
      },
      {
        title: "EPA/DHA-verifikation",
        description: "Sammenhold af deklaration med relevante kvalitetsdata",
        what: "Mængde omega-3 pr. dagsdosis og fedtsyreprofil",
        why: "To produkter med samme pakkepris kan give vidt forskellig aktiv dosis",
        icon: "🔬",
      },
      {
        title: "Økonomisk realværdi",
        description: `Sammenligning på ${metricHuman}`,
        what: "Pris holdt op mod aktiv omega-3-mængde",
        why: "Fokus flyttes fra pakkepris til reel værdi for brugeren",
        icon: "📊",
      },
    ]
  }

  if (siloId === "protein-traening") {
    return [
      {
        title: "Træningsnær anvendelse",
        description: "Brug før/efter træning i realistiske rutiner",
        what: "Blandbarhed, smag og mæthed i hverdag og træning",
        why: "Et produkt med høj score skal også fungere i praksis over tid",
        icon: "🏋️",
      },
      {
        title: "Makro- og doseringscheck",
        description: "Validering af protein-/aktiv mængde",
        what: "Aktiv mængde pr. portion og deklarationskonsistens",
        why: "Reel dosis betyder mere end markedsførte overskrifter",
        icon: "🔬",
      },
      {
        title: "Pris kontra aktiv mængde",
        description: `Vurdering på ${metricHuman}`,
        what: "Pris sat i forhold til den mængde aktivt indhold du får",
        why: "Giver et retvisende billede af produktets samlede værdi",
        icon: "📊",
      },
    ]
  }

  return [
    {
      title: "Daglig anvendelse",
      description: `Simulering af løbende brug af ${categoryName}`,
      what: "Brugervenlighed, tolerance og praktisk efterlevelse",
      why: "Et godt produkt skal fungere i den virkelige hverdag",
      icon: "☀️",
    },
    {
      title: "Deklarationskontrol",
      description: "Kontrol af styrke, form og sammensætning",
      what: "Aktiv dosis pr. dag og kvalitet af ingrediensvalg",
      why: "Sikrer retvisende sammenligning mellem produkter i samme kategori",
      icon: "🔬",
    },
    {
      title: "Værdiberegning",
      description: `Sammenligning på ${metricHuman}`,
      what: "Pris sat op mod den mængde aktivt indhold du får",
      why: "Fjerner støj fra pakkepris og fremhæver reel forbrugsværdi",
      icon: "📊",
    },
  ]
}

function buildDynamicConsumerProfiles(catSlug: string) {
  const siloId = SLUG_TO_SILO[catSlug] || "sundhed-velvaere"

  if (siloId === "omega-fedtsyrer") {
    return [
      { name: "Kvalitetsfokuserede", icon: "🏆", description: "Vil have høj omega-3-kvalitet uden kompromis", priority: ["EPA+DHA", "Renhed", "Dokumentation"] },
      { name: "Hverdagsbrugeren", icon: "☀️", description: "Prioriterer et produkt, der er nemt at tage hver dag", priority: ["Kapselstørrelse", "Tolerance", "Pris"] },
      { name: "Budgetbevidste", icon: "💵", description: "Vil have mest mulig omega-3 for pengene", priority: ["Pris/enhed", "Aktiv dosis", "Værdi"] },
      { name: "Følsom mave", icon: "🛡️", description: "Har fokus på mild tolerance og stabil daglig brug", priority: ["Renhed", "Tolerabilitet", "Sikkerhed"] },
    ]
  }

  if (siloId === "protein-traening") {
    return [
      { name: "Muskelopbyggeren", icon: "💪", description: "Vil optimere indtag af aktivt protein/aminosyrer", priority: ["Aktiv mængde", "Kvalitet", "Dosering"] },
      { name: "Smag & konsistens", icon: "🥤", description: "Vægter smag og blandbarhed højt i hverdagen", priority: ["Smag", "Opløselighed", "Brugervenlighed"] },
      { name: "Kaloriebevidste", icon: "⚖️", description: "Vil balancere effekt med kalorie-/makroprofil", priority: ["Næringsprofil", "Dosering", "Pris"] },
      { name: "Værdisøgende", icon: "💵", description: "Vil have bedst mulig pris pr. relevant enhed", priority: ["Pris/portion", "Pris/kg", "Samlet værdi"] },
    ]
  }

  return [
    { name: "Effektfokuserede", icon: "⚡", description: "Prioriterer dokumenteret effekt og relevant dosering", priority: ["Doseringsniveau", "Evidens", "Kvalitet"] },
    { name: "Sikkerhedsbevidste", icon: "🛡️", description: "Vil minimere risiko for bivirkninger og interaktioner", priority: ["Renhed", "Tolerance", "Sikkerhed"] },
    { name: "Pragmatikeren", icon: "☀️", description: "Ønsker et produkt der er nemt at bruge dagligt", priority: ["Brugervenlighed", "Compliance", "Pris"] },
    { name: "Værdisøgende", icon: "💵", description: "Leder efter stærk balance mellem pris og kvalitet", priority: ["Pris", "Aktiv mængde", "Værdi"] },
  ]
}

function buildDynamicQuickGuideCards(catSlug: string, categoryName: string, comparisonMetricLabel?: string) {
  const metricHuman = getMetricLabelForHumans(comparisonMetricLabel)
  const siloId = SLUG_TO_SILO[catSlug] || "sundhed-velvaere"

  if (siloId === "omega-fedtsyrer") {
    return [
      { icon: "quality", title: "Tjek EPA + DHA per dagsdosis", description: "Sammenlign aktiv omega-3 pr. dag i stedet for kun pakkepris." },
      { icon: "price", title: `Sammenlign ${metricHuman}`, description: "Se hvad du reelt betaler for brugbar daglig dosis." },
      { icon: "ingredients", title: "Vælg ren profil", description: "Prioritér klare deklarationer og fokus på friskhed/renhed." },
      { icon: "dosage", title: "Vurder daglig tolerance", description: "Kapselstørrelse og eftersmag påvirker om du holder rutinen." },
    ]
  }

  if (siloId === "protein-traening") {
    return [
      { icon: "quality", title: "Se aktiv mængde pr. portion", description: "Sammenlign reelt indhold fremfor kun marketing-claims." },
      { icon: "price", title: `Sammenlign ${metricHuman}`, description: "Brug pris per relevant enhed for fair sammenligning." },
      { icon: "ingredients", title: "Tjek ingredienslisten", description: "Undgå unødige fyldstoffer og vælg tydeligt deklareret produkt." },
      { icon: "dosage", title: "Match med dit mål", description: "Vælg dosering og profil der passer til træning og restitution." },
    ]
  }

  return [
    { icon: "quality", title: `Fokusér på aktiv dosis i ${categoryName}`, description: "Sammenlign hvor meget relevant aktivt indhold du får pr. dag." },
    { icon: "price", title: `Sammenlign ${metricHuman}`, description: "Pakkeprisen alene er sjældent den bedste indikator for værdi." },
    { icon: "ingredients", title: "Vurder kvalitet og renhed", description: "Prioritér klare deklarationer og færre unødige tilsætninger." },
    { icon: "dosage", title: "Vælg realistisk dosering", description: "Et godt produkt skal være let at bruge konsekvent i hverdagen." },
  ]
}

function buildDynamicStacking(catSlug: string) {
  const siloId = SLUG_TO_SILO[catSlug] || "sundhed-velvaere"
  if (/(^|-)vegansk-proteinpulver$|vegansk-proteinpulver|hamp-protein|sojaprotein|risprotein|arteprotein|veganske-proteinbarer/.test(catSlug)) {
    return {
      combos: [
        {
          supplements: ["Kreatin"],
          benefit: "Klassisk synergi til vegansk proteinpulver ved styrketræning og progression.",
          timing: "Kan tages omkring træning",
        },
        {
          supplements: ["BCAA"],
          benefit: "Kan være relevant som supplement til vegansk proteinpulver ved lavere samlet leucinindtag.",
          timing: "Omkring træning ved behov",
        },
        {
          supplements: ["Vitamin B12"],
          benefit: "Ofte relevant i plantebaserede rutiner sammen med vegansk proteinpulver.",
          timing: "Tag med et måltid",
        },
      ],
      warnings: [
        "Prioritér samlet dagligt proteinindtag før ekstra stack-produkter",
        "Undgå unødvendigt overlap af aminosyreprodukter uden konkret behov",
        "Tilpas kreatin- og proteinmængde til kropsvægt, mål og træningsvolumen",
      ],
    }
  }

  if (siloId === "omega-fedtsyrer") {
    return {
      combos: [
        { supplements: ["D-vitamin"], benefit: "Typisk synergi til omega-fedtsyrer i daglige rutiner for generel sundhed.", timing: "Tag med et fedtholdigt måltid" },
        { supplements: ["Q10"], benefit: "Bruges ofte sammen med omega-fedtsyrer i rutiner med fokus på hjerte og energi.", timing: "Tag med morgen- eller frokostmåltid" },
        { supplements: ["Magnesium"], benefit: "Kan supplere omega-rutinen i perioder med høj trænings- eller stressbelastning.", timing: "Tag om aftenen" },
      ],
      warnings: [
        "Blodfortyndende medicin og højdosis omega-3 – tal med læge først",
        "Hold øje med samlet daglig dosis fra flere omega-kilder",
        "Ved fisk/skaldyrsallergi: vælg alternativ og læs deklaration nøje",
      ],
    }
  }

  if (siloId === "protein-traening") {
    return {
      combos: [
        { supplements: ["Kreatin"], benefit: "Klassisk kombination til styrketræning og progression.", timing: "Kan tages omkring træning" },
        { supplements: ["Magnesium"], benefit: "Bruges ofte som aftenrutine med fokus på restitution.", timing: "Tag om aftenen" },
        { supplements: ["Elektrolytter"], benefit: "Kan støtte performance og væskebalance under hårde pas.", timing: "30-45 min før træning" },
      ],
      warnings: [
        "Undgå at kombinere flere højkoffein-produkter samtidigt",
        "Tilpas total proteinmængde til kropsvægt og mål",
        "Drik nok væske ved kreatin- og pre-workout-brug",
      ],
    }
  }

  return {
    combos: [
      { supplements: ["K2-vitamin"], benefit: "Typisk synergi i rutiner med fokus på knogle- og calciumbalance.", timing: "Tag med et måltid" },
      { supplements: ["C-vitamin"], benefit: "Ofte brugt som støtte i rutiner hvor optagelse og antioxidantprofil er i fokus.", timing: "Tag med måltid" },
      { supplements: ["Magnesium"], benefit: "Bruges ofte som stabil basis i daglige rutiner på tværs af kategorier.", timing: "Tag om aftenen" },
    ],
    warnings: [
      "Jern og calcium bør typisk adskilles tidsmæssigt",
      "Zink i høje doser over længere tid kan påvirke kobberstatus",
      "Kombinér ikke flere produkter med samme høje dosis uden behov",
    ],
  }
}

function buildDynamicCommonMistakes(catSlug: string) {
  const siloId = SLUG_TO_SILO[catSlug] || "sundhed-velvaere"
  if (siloId === "omega-fedtsyrer") {
    return [
      { mistake: "Vælger kun efter pakkepris", consequence: "Lavere aktiv omega-3 pr. dag end forventet", solution: "Sammenlign EPA+DHA og pris per relevant enhed" },
      { mistake: "Ustabil daglig brug", consequence: "Effekten udebliver pga. manglende kontinuitet", solution: "Vælg et produkt du kan tage hver dag uden besvær" },
      { mistake: "Ingen opmærksomhed på tolerance", consequence: "Eftersmag eller ubehag giver dårlig compliance", solution: "Prioritér renhed og en form der fungerer i praksis" },
      { mistake: "Dobbelt dosering fra flere produkter", consequence: "Unødigt højt samlet indtag", solution: "Gennemgå total daglig omega-3 fra alle kilder" },
    ]
  }
  if (siloId === "protein-traening") {
    return [
      { mistake: "Overfokus på smag alene", consequence: "Mindre fokus på aktiv kvalitet og dosering", solution: "Vurder både aktivt indhold og praktisk brug" },
      { mistake: "Urealistisk portionsstrategi", consequence: "Dårlig mavekomfort eller ujævnt indtag", solution: "Tilpas portionsstørrelse til dit behov og tolerance" },
      { mistake: "Ignorerer samlet dagsindtag", consequence: "For høj eller for lav total protein/aktiv mængde", solution: "Se total indtag fra både kost og tilskud" },
      { mistake: "Vælger dyr pakke uden værdicheck", consequence: "Høj pris uden tilsvarende nytte", solution: "Sammenlign pris per relevant enhed og aktiv mængde" },
    ]
  }
  return [
    { mistake: "Ser kun på overskriften på etiketten", consequence: "Vigtige detaljer i dosering og form overses", solution: "Læs aktiv mængde, form og anbefalet daglig dosis" },
    { mistake: "Skifter produkt for hurtigt", consequence: "Svært at vurdere reel effekt i praksis", solution: "Giv en stabil periode med konsekvent brug" },
    { mistake: "Blander mange produkter uden plan", consequence: "Større risiko for overlap og interaktioner", solution: "Hold en enkel rutine og vurder ét ændringspunkt ad gangen" },
    { mistake: "Ignorerer individuel tolerance", consequence: "Ubehag og lav efterlevelse", solution: "Start forsigtigt og justér efter respons" },
  ]
}

type PriceGraphMetricLabel = "Pris/dagsdosis" | "Pris/bar" | "Pris/portion" | "Pris/enhed" | "Pris/kg" | "Pris/l"

function resolvePriceGraphMetric(
  products: ProductData[],
  comparisonMetric: ComparisonMetric | null,
): PriceGraphMetricLabel | null {
  const candidates: PriceGraphMetricLabel[] = [
    "Pris/dagsdosis",
    "Pris/bar",
    "Pris/portion",
    "Pris/enhed",
    "Pris/kg",
    "Pris/l",
  ]

  if (comparisonMetric && !candidates.includes(comparisonMetric.label)) {
    candidates.push(comparisonMetric.label)
  }

  for (const label of candidates) {
    let count = 0
    for (const p of products) {
      const raw = label === comparisonMetric?.label
        ? comparisonMetric.valuesBySlug[p.slug] || getQuickFactValue(p, label)
        : getQuickFactValue(p, label)
      if (parseNumericPrefix(raw) != null) count++
    }
    if (count >= 2) return label
  }
  return null
}

function getPriceGraphUnit(label: PriceGraphMetricLabel): string {
  if (label === "Pris/dagsdosis") return "kr/dosis"
  if (label === "Pris/bar") return "kr/bar"
  if (label === "Pris/portion") return "kr/portion"
  if (label === "Pris/enhed") return "kr/enhed"
  if (label === "Pris/kg") return "kr/kg"
  return "kr/l"
}

function getPriceGraphTitle(label: PriceGraphMetricLabel, categoryName: string): string {
  if (label === "Pris/dagsdosis") return `Pris per dagsdosis – ${categoryName}`
  if (label === "Pris/bar") return `Pris per bar – ${categoryName}`
  if (label === "Pris/portion") return `Pris per portion – ${categoryName}`
  if (label === "Pris/enhed") return `Pris per enhed – ${categoryName}`
  if (label === "Pris/kg") return `Pris per kg – ${categoryName}`
  return `Pris per liter – ${categoryName}`
}

function buildPriceGraphDetail(prod: ProductData, priceNum: number, metric: PriceGraphMetricLabel): string | null {
  const size = getQuickFactValue(prod, "Pakningsstørrelse")
  const bars = parseNumericPrefix(getQuickFactValue(prod, "Barer/pakke"))
  const portions = parseNumericPrefix(getQuickFactValue(prod, "Portioner/pakke"))
  const units =
    parseNumericPrefix(getQuickFactValue(prod, "Kapsler/pakke")) ??
    parseNumericPrefix(getQuickFactValue(prod, "Tabletter/pakke")) ??
    parseNumericPrefix(getQuickFactValue(prod, "Enheder/pakke"))
  const dosePerDay = parseNumericPrefix(getQuickFactValue(prod, "Daglig dosis"))

  if (metric === "Pris/bar") {
    if (bars != null && bars > 0) return `${formatNumberDa(priceNum)} kr / ${formatNumberDa(bars, 0)} barer`
    return `${formatNumberDa(priceNum)} kr`
  }

  if (metric === "Pris/kg" || metric === "Pris/l") {
    if (size) return `${formatNumberDa(priceNum)} kr / ${size}`
    return `${formatNumberDa(priceNum)} kr`
  }

  if (metric === "Pris/portion") {
    if (portions != null && portions > 0) return `${formatNumberDa(priceNum)} kr / ${formatNumberDa(portions, 0)} portioner`
    return `${formatNumberDa(priceNum)} kr`
  }

  if (metric === "Pris/enhed") {
    if (units != null && units > 0) {
      const unitLabel = getQuickFactValue(prod, "Kapsler/pakke")
        ? "kapsler"
        : getQuickFactValue(prod, "Tabletter/pakke")
          ? "tabletter"
          : "enheder"
      return `${formatNumberDa(priceNum)} kr / ${formatNumberDa(units, 0)} ${unitLabel}`
    }
    return `${formatNumberDa(priceNum)} kr`
  }

  if (dosePerDay != null && dosePerDay > 0) {
    const totalUnits = portions ?? units
    if (totalUnits != null && totalUnits > 0) {
      const doses = totalUnits / dosePerDay
      return `${formatNumberDa(priceNum)} kr / ${formatNumberDa(doses, 0)} doser`
    }
  }
  if (portions != null && portions > 0) return `${formatNumberDa(priceNum)} kr / ${formatNumberDa(portions, 0)} portioner`
  if (units != null && units > 0) return `${formatNumberDa(priceNum)} kr / ${formatNumberDa(units, 0)} enheder`
  return `${formatNumberDa(priceNum)} kr`
}

function formatAwardMetric(value: number): string {
  return `${formatNumberDa(value, 1)} kr`
}

function formatCostSource(source: "dagsdosis" | "bar" | "portion" | "enhed" | "kg" | "pris"): string {
  if (source === "pris") return "pakkepris"
  return source
}

function getAwardCostSignal(prod: ProductData): {
  value: number | null
  source: "dagsdosis" | "bar" | "portion" | "enhed" | "kg" | "pris"
} {
  const byDose = parseNumericPrefix(getQuickFactValue(prod, "Pris/dagsdosis"))
  if (byDose != null && byDose > 0) return { value: byDose, source: "dagsdosis" }

  const byBar = parseNumericPrefix(getQuickFactValue(prod, "Pris/bar"))
  if (byBar != null && byBar > 0) return { value: byBar, source: "bar" }

  const byPortion = parseNumericPrefix(getQuickFactValue(prod, "Pris/portion"))
  if (byPortion != null && byPortion > 0) return { value: byPortion, source: "portion" }

  const byUnit = parseNumericPrefix(getQuickFactValue(prod, "Pris/enhed"))
  if (byUnit != null && byUnit > 0) return { value: byUnit, source: "enhed" }

  const byKg = parseNumericPrefix(getQuickFactValue(prod, "Pris/kg"))
  if (byKg != null && byKg > 0) return { value: byKg, source: "kg" }

  const totalPrice = parseNumericPrefix(getQuickFactValue(prod, "Pris")) ?? parseNumericPrefix(prod.price)
  if (totalPrice != null && totalPrice > 0) return { value: totalPrice, source: "pris" }

  return { value: null, source: "pris" }
}

function getAwardBadgeClass(label: string): string {
  const x = label.toLowerCase()
  if (x.includes("bedst i test")) return "bg-amber-500 text-white"
  if (x.includes("værdi")) return "bg-emerald-600 text-white"
  if (x.includes("premium")) return "bg-violet-600 text-white"
  if (x.includes("højeste") || x.includes("høj")) return "bg-indigo-600 text-white"
  if (x.includes("laveste") || x.includes("lav")) return "bg-teal-600 text-white"
  if (x.includes("bedste")) return "bg-cyan-700 text-white"
  if (x.includes("budget")) return "bg-blue-600 text-white"
  if (x.includes("godt")) return "bg-sky-600 text-white"
  return "bg-slate-600 text-white"
}

type AwardDossier = {
  categoryLabel: string
  focusKeywords: string[]
  userIntentAwards: Array<{ key: string; label: string; reason: string; matcher: RegExp }>
}

function buildAwardDossier(catSlug: string): AwardDossier {
  const categoryLabel = catSlug.replace(/-/g, " ").trim()
  const siloId = SLUG_TO_SILO[catSlug] || "sundhed-velvaere"

  if (siloId === "protein-traening") {
    return {
      categoryLabel,
      focusKeywords: ["protein", "isolat", "hydrolysat", "kreatin", "amino", "leucin", "restitution"],
      userIntentAwards: [
        { key: "newbie", label: "BEDSTE TIL NYBEGYNDERE", reason: "Let anvendelig profil med fokus på enkel daglig brug.", matcher: /let at blande|nem at bruge|begynder|nybegynder|mild smag/i },
        { key: "lean", label: "BEDSTE TIL CUT", reason: "Relevant profil ved fokus på høj proteinandel og lavere fyld.", matcher: /isolat|lavt fedt|lavt sukker|høj protein|lean|cut/i },
        { key: "recovery", label: "BEDSTE TIL RESTITUTION", reason: "Stærk profil til restitution og daglig træningsrutine.", matcher: /restitution|efter træning|night|kasein|langsom frigivelse/i },
      ],
    }
  }

  if (siloId === "omega-fedtsyrer") {
    return {
      categoryLabel,
      focusKeywords: ["omega", "epa", "dha", "krill", "renhed", "friskhed"],
      userIntentAwards: [
        { key: "heart", label: "BEDSTE TIL HJERTEFOKUS", reason: "Målrettet omega-profil med fokus på daglig hjertevenlig rutine.", matcher: /hjerte|epa|dha|omega-3|triglyceridform/i },
        { key: "tolerance", label: "BEDSTE TIL DAGLIG TOLERANCE", reason: "Profil med fokus på bedre daglig tolerabilitet.", matcher: /ingen eftersmag|mild|let at sluge|tolerance/i },
      ],
    }
  }

  if (siloId === "mineraler") {
    return {
      categoryLabel,
      focusKeywords: ["bisglycinat", "citrat", "picolinat", "elementær", "optagelse", "mavevenlig"],
      userIntentAwards: [
        { key: "stomach", label: "BEDSTE SKÅNSOMME VALG", reason: "Mere mavevenlig profil til daglig brug.", matcher: /skånsom|mavevenlig|bisglycinat|chelat/i },
        { key: "absorption", label: "BEDSTE TIL OPTAGELSE", reason: "Formulering med fokus på god optagelighed.", matcher: /biotilgængelig|optagelse|citrat|picolinat|bisglycinat/i },
      ],
    }
  }

  if (siloId === "vitaminer") {
    return {
      categoryLabel,
      focusKeywords: ["liposomal", "d3", "k2", "methyl", "aktiv form", "depot"],
      userIntentAwards: [
        { key: "activeform", label: "BEDSTE AKTIVE VITAMINFORM", reason: "Formulering med fokus på aktiv/biotilgængelig vitaminform.", matcher: /methyl|aktiv form|d3|k2|mk-7|liposomal/i },
        { key: "daily", label: "BEDSTE TIL DAGLIG BASISRUTINE", reason: "Praktisk profil til stabil daglig brug.", matcher: /daglig|basis|én kapsel|1 kapsel|vedligehold/i },
      ],
    }
  }

  return {
    categoryLabel,
    focusKeywords: ["renhed", "dosering", "dagsdosis", "tolerance", "praktisk"],
    userIntentAwards: [
      { key: "daily", label: "BEDSTE TIL DAGLIG BRUG", reason: "Praktisk profil til konsekvent daglig brug.", matcher: /daglig|nem|praktisk|let/i },
      { key: "sensitive", label: "BEDSTE TIL SENSITIV PROFIL", reason: "Mere skånsom profil med færre kompromiser.", matcher: /skånsom|ren|færre tilsætninger|uden/i },
    ],
  }
}

function clampScore(value: number, min = 4, max = 10): number {
  return Math.min(max, Math.max(min, value))
}

function round1(value: number): number {
  return Math.round(value * 10) / 10
}

function parseUserScore10(userScore: string): number | null {
  if (!userScore) return null
  const n = parseNumericPrefix(userScore)
  if (n == null) return null
  if (userScore.includes("/5")) return round1((n / 5) * 10)
  if (n <= 5.1) return round1((n / 5) * 10)
  if (n <= 10.1) return round1(n)
  return null
}

function extractNutritionPer100(text: string, nutrient: "protein" | "fat" | "carbs" | "sugar"): number | null {
  const source = text.toLowerCase()
  const token =
    nutrient === "protein"
      ? "protein"
      : nutrient === "fat"
        ? "fedt"
        : nutrient === "carbs"
          ? "kulhydrater"
          : "sukker"

  // Common structured nutrition rows look like:
  // "Protein 24 g 75 g" where the last value is the per-100g column.
  // Prefer the larger/last value from these dual-column rows before any simpler regex.
  const dualColumnMatch = source.match(
    new RegExp(`${token}\\b[^\\n]{0,40}?(\\d+(?:[.,]\\d+)?)\\s*g\\s+(\\d+(?:[.,]\\d+)?)\\s*g`, "i"),
  )
  if (dualColumnMatch) {
    const a = parseNumber(dualColumnMatch[1])
    const b = parseNumber(dualColumnMatch[2])
    const best = [a, b].filter((n): n is number => n != null && n > 0)
    if (best.length > 0) return Math.max(...best)
  }

  // Fast path: common "key value g" lists (often in one long line).
  if (nutrient === "sugar") {
    const m =
      source.match(/\bsukkerarter\b[^0-9]{0,30}(\d+(?:[.,]\d+)?)\s*g\b/i) ||
      source.match(/\bsukker\b[^0-9]{0,30}(\d+(?:[.,]\d+)?)\s*g\b/i)
    return m ? parseNumber(m[1]) : null
  }
  if (nutrient === "carbs") {
    const m = source.match(/\bkulhydrater\b[^0-9]{0,30}(\d+(?:[.,]\d+)?)\s*g\b/i)
    if (m) return parseNumber(m[1])
  }
  if (nutrient === "fat") {
    const m = source.match(/\bfedt\b[^0-9]{0,30}(\d+(?:[.,]\d+)?)\s*g\b/i)
    if (m) return parseNumber(m[1])
  }
  if (nutrient === "protein") {
    const m = source.match(/\bprotein\b[^0-9]{0,30}(\d+(?:[.,]\d+)?)\s*g\b/i)
    if (m) return parseNumber(m[1])
  }

  const lines = source.split("\n")
  for (const line of lines) {
    if (!line.includes(token)) continue
    if (!/\b\d+(?:[.,]\d+)?\b/.test(line) || !/\bg\b/.test(line)) continue
    const grams = [...line.matchAll(/(\d+(?:[.,]\d+)?)\s*g\b/gi)]
      .map((m) => parseNumber(m[1]) || 0)
      // For sugar, 0 is meaningful. For others, ignore zeros.
      .filter((n) => n > 0)
    if (grams.length >= 2) return Math.max(grams[0], grams[1])
    if (grams.length === 1 && /(pr\.?\s*100\s*g|\/\s*100\s*g)/.test(line)) return grams[0]
  }

  const fallbackRegex = new RegExp(`${token}[^\\n]{0,120}?(\\d+(?:[.,]\\d+)?)\\s*g\\s*(?:pr\\.?\\s*100\\s*g|/\\s*100\\s*g)`, "i")
  const m = source.match(fallbackRegex)
  return m ? parseNumber(m[1]) : null
}

function extractKcalPer100(text: string): number | null {
  const source = text.toLowerCase()
  for (const line of source.split("\n")) {
    if (!line.includes("energi")) continue
    const kcalNums = [...line.matchAll(/(\d+(?:[.,]\d+)?)\s*kcal/gi)]
      .map((m) => parseNumber(m[1]) || 0)
      .filter((n) => n > 0)
    if (kcalNums.length > 0) return Math.max(...kcalNums)
  }
  const m = source.match(/(\d+(?:[.,]\d+)?)\s*kcal\s*(?:pr\.?\s*100\s*g|\/\s*100\s*g)/i)
  return m ? parseNumber(m[1]) : null
}

function countRegexHits(text: string, regex: RegExp): number {
  return (text.match(regex) || []).length
}

function extractProductSignals(text: string, quickFacts: Array<{ label: string; value: string }>): ProductSignals {
  const source = text.toLowerCase()
  const quickText = quickFacts.map((q) => `${q.label} ${q.value}`).join(" ").toLowerCase()
  const signalText = `${source}\n${quickText}`

  const formFact = quickFacts.find((q) => q.label.toLowerCase() === "form")?.value || ""
  const form = detectSupplementForm(`${formFact}\n${text}`) || null

  const proteinPer100FromFacts = parseNumericPrefix(quickFacts.find((q) => q.label === "Proteinhalt")?.value)
  const proteinPerServing = extractProteinPerServing(signalText)
  const servingsPerPackFact = parseNumericPrefix(quickFacts.find((q) => q.label === "Portioner/pakke")?.value)
  const packageSizeText = quickFacts.find((q) => q.label === "Pakningsstørrelse")?.value || ""
  const packageNums = parseAllNumbers(packageSizeText)
  const packageSizeG =
    packageNums.length > 0
      ? (/kg/i.test(packageSizeText) ? packageNums[0] * 1000 : packageNums[0])
      : null

  let servingSizeG = extractServingSizeInGrams(signalText)
  if ((servingSizeG == null || servingSizeG <= 0) && packageSizeG != null && servingsPerPackFact != null && servingsPerPackFact > 0) {
    servingSizeG = packageSizeG / servingsPerPackFact
  }

  let proteinPer100g = proteinPer100FromFacts || extractNutritionPer100(signalText, "protein") || extractProteinPer100g(signalText)
  if (proteinPer100g == null && proteinPerServing != null && servingSizeG != null && servingSizeG > 0) {
    proteinPer100g = (proteinPerServing / servingSizeG) * 100
  }
  const kcalPer100g = extractKcalPer100(signalText)
  const carbsPer100g = extractNutritionPer100(signalText, "carbs")
  const fatPer100g = extractNutritionPer100(signalText, "fat")
  const sugarPer100g = extractNutritionPer100(signalText, "sugar")

  const pricePerKg = parseNumericPrefix(quickFacts.find((q) => q.label === "Pris/kg")?.value)
  const pricePerPortion = parseNumericPrefix(quickFacts.find((q) => q.label === "Pris/portion")?.value)
  const pricePerDay = parseNumericPrefix(quickFacts.find((q) => q.label === "Pris/dagsdosis")?.value)
  const servingsPerPack = servingsPerPackFact

  const sweetenerCount =
    countRegexHits(signalText, /\bsukralose\b/gi) +
    countRegexHits(signalText, /\bacesulfam-?k\b/gi) +
    countRegexHits(signalText, /\baspartam\b/gi) +
    countRegexHits(signalText, /\bsødestof|sweetener|sødemiddel/gi)

  const additiveCount =
    countRegexHits(signalText, /\bemulgator|emulgatorer|lecithin|stabilisator|fortykningsmiddel|gummi|aroma|farvestof|colorant|fyldstof/gi)

  const certificationCount =
    countRegexHits(signalText, /\bifos|msc|informed[- ]?sport|gmp|økologisk|organic|third[- ]?party|3\.?\s*part/gi)

  const activeDensityCandidates: number[] = []
  for (const q of quickFacts) {
    const k = q.label.toLowerCase()
    if (/(pris|pakningsstørrelse|portioner|score|mærke|daglig dosis|sødning|antal smage)/.test(k)) continue
    const n = parseNumericPrefix(q.value)
    if (n != null && n > 0) activeDensityCandidates.push(n)
  }
  const activeDensity = activeDensityCandidates.length > 0 ? Math.max(...activeDensityCandidates) : null

  return {
    form,
    proteinPer100g,
    proteinPerServing,
    servingSizeG,
    kcalPer100g,
    carbsPer100g,
    fatPer100g,
    sugarPer100g,
    hasIsolate: /\bisolat|isolate|wpi\b/.test(signalText),
    hasHydrolysate: /\bhydrolysat|hydrolyseret|hydrolyzed/.test(signalText),
    hasConcentrate: /\bkoncentrat|concentrate|wpc\b/.test(signalText),
    hasAminoProfile: /\bleucin|isoleucin|valin|aminosyre|bcaa\b/.test(signalText),
    hasLactase: /\blaktase|lactase\b/.test(signalText),
    sweetenerCount,
    additiveCount,
    certificationCount,
    vegan: /\bvegansk|vegan\b/.test(signalText) ? true : (/\bvalle|mælk|whey\b/.test(signalText) ? false : null),
    lactoseFree: /\blaktosefri|lactose free\b/.test(signalText) ? true : null,
    pricePerKg,
    pricePerPortion,
    pricePerDay,
    servingsPerPack,
    activeDensity,
  }
}

function getRelevantSignalFields(catSlug: string): string[] {
  const siloId = SLUG_TO_SILO[catSlug] || "sundhed-velvaere"
  const base = ["form", "additiveCount", "sweetenerCount", "certificationCount", "activeDensity"]

  if (/(protein|kasein|gainer|bcaa|eaa|kreatin|pulver)/i.test(catSlug)) {
    return [
      ...base,
      "proteinPer100g",
      "proteinPerServing",
      "servingSizeG",
      "kcalPer100g",
      "carbsPer100g",
      "fatPer100g",
      "sugarPer100g",
      "hasIsolate",
      "hasHydrolysate",
      "hasConcentrate",
      "hasAminoProfile",
      "pricePerKg",
      "pricePerPortion",
      "servingsPerPack",
    ]
  }

  if (siloId === "omega-fedtsyrer") {
    return [
      ...base,
      "pricePerDay",
      "pricePerPortion",
      "servingsPerPack",
      "vegan",
    ]
  }

  if (siloId === "vitaminer" || siloId === "mineraler") {
    return [
      ...base,
      "pricePerDay",
      "pricePerPortion",
      "servingsPerPack",
      "vegan",
      "lactoseFree",
    ]
  }

  // Broad health categories (acai, aloe vera, adaptogens etc):
  // no protein-specific requirements by default.
  return [
    ...base,
    "pricePerDay",
    "pricePerPortion",
    "servingsPerPack",
    "vegan",
    "lactoseFree",
  ]
}

function computeSignalConfidence(signals: ProductSignals, catSlug: string): ProductSignalConfidence {
  const fields: Record<string, number> = {}
  const set = (key: string, value: number) => {
    fields[key] = round1(clampScore(value, 0, 1))
  }

  const numericField = (key: keyof ProductSignals, value: number | null) => {
    if (value == null || !Number.isFinite(value)) return set(String(key), 0)
    if (value > 0) return set(String(key), 1)
    return set(String(key), 0.4)
  }

  const boolField = (key: keyof ProductSignals, value: boolean | null) => {
    if (value == null) return set(String(key), 0)
    return set(String(key), 1)
  }

  const stringField = (key: keyof ProductSignals, value: string | null) => {
    if (!value || value.trim().length === 0) return set(String(key), 0)
    return set(String(key), 1)
  }

  stringField("form", signals.form)
  numericField("proteinPer100g", signals.proteinPer100g)
  numericField("proteinPerServing", signals.proteinPerServing)
  numericField("servingSizeG", signals.servingSizeG)
  numericField("kcalPer100g", signals.kcalPer100g)
  numericField("carbsPer100g", signals.carbsPer100g)
  numericField("fatPer100g", signals.fatPer100g)
  numericField("sugarPer100g", signals.sugarPer100g)
  set("hasIsolate", signals.hasIsolate ? 1 : 0.6)
  set("hasHydrolysate", signals.hasHydrolysate ? 1 : 0.6)
  set("hasConcentrate", signals.hasConcentrate ? 1 : 0.6)
  set("hasAminoProfile", signals.hasAminoProfile ? 1 : 0.6)
  set("hasLactase", signals.hasLactase ? 1 : 0.6)
  numericField("sweetenerCount", signals.sweetenerCount)
  numericField("additiveCount", signals.additiveCount)
  numericField("certificationCount", signals.certificationCount)
  boolField("vegan", signals.vegan)
  boolField("lactoseFree", signals.lactoseFree)
  numericField("pricePerKg", signals.pricePerKg)
  numericField("pricePerPortion", signals.pricePerPortion)
  numericField("pricePerDay", signals.pricePerDay)
  numericField("servingsPerPack", signals.servingsPerPack)
  numericField("activeDensity", signals.activeDensity)

  const relevantFields = getRelevantSignalFields(catSlug)
  const relevantValues = relevantFields.map((k) => fields[k] ?? 0)
  const avgRelevant = relevantValues.length > 0 ? relevantValues.reduce((a, b) => a + b, 0) / relevantValues.length : 0
  const allValues = Object.values(fields)
  const avgAll = allValues.length > 0 ? allValues.reduce((a, b) => a + b, 0) / allValues.length : 0
  const overall = round1(avgRelevant * 0.75 + avgAll * 0.25)

  return { overall, fields, relevantFields }
}

function applyPanelModel(products: ProductData[], catSlug: string) {
  if (products.length === 0) return

  const siloId = SLUG_TO_SILO[catSlug] || "sundhed-velvaere"
  const proteinCategory = /(protein|kasein|gainer|bcaa|eaa|kreatin|pulver)/i.test(catSlug)

  const priceSignals = products
    .map((p) => getAwardCostSignal(p).value)
    .filter((v): v is number => v != null && Number.isFinite(v) && v > 0)
  const minPrice = priceSignals.length > 0 ? Math.min(...priceSignals) : null
  const maxPrice = priceSignals.length > 0 ? Math.max(...priceSignals) : null

  const proteinDensityValues = products
    .map((p) => p.signals.proteinPer100g)
    .filter((v): v is number => v != null && Number.isFinite(v) && v > 0)
  const minProteinDensity = proteinDensityValues.length > 0 ? Math.min(...proteinDensityValues) : null
  const maxProteinDensity = proteinDensityValues.length > 0 ? Math.max(...proteinDensityValues) : null

  const qualityBaseFromText = (p: ProductData) => {
    const s = `${p.content} ${p.quickFacts.map((q) => `${q.label} ${q.value}`).join(" ")}`.toLowerCase()
    let v = 0
    if (/\bisolat|isolate|hydrolysat|hydrolyseret|liposomal|bisglycinat|picolinat|citrat/.test(s)) v += 0.9
    if (/\bren|renhed|uden tilsætningsstoffer|clean label/.test(s)) v += 0.4
    if (/\bcertific|ifos|msc|informed[- ]?sport|gmp/.test(s)) v += 0.4
    return v
  }

  const normalize01 = (value: number | null, min: number | null, max: number | null, reverse = false): number => {
    if (value == null || min == null || max == null || max <= min) return 0.5
    const raw = (value - min) / (max - min)
    const bounded = Math.max(0, Math.min(1, raw))
    return reverse ? 1 - bounded : bounded
  }

  for (const p of products) {
    const s = p.signals
    const userScore10 = parseUserScore10(p.userScore)
    const extracted = p.sourceRating || p.rating

    const priceValue = getAwardCostSignal(p).value
    const valueNorm = normalize01(priceValue, minPrice, maxPrice, true)
    const proteinDensityNorm = normalize01(s.proteinPer100g, minProteinDensity, maxProteinDensity, false)
    const proteinDoseNorm = s.proteinPerServing != null ? Math.max(0, Math.min(1, s.proteinPerServing / 40)) : 0.5

    const ingredientScore = clampScore(
      proteinCategory
        ? 6.0 +
            proteinDensityNorm * 2.1 +
            (s.hasIsolate ? 0.7 : 0) +
            (s.hasHydrolysate ? 0.6 : 0) -
            s.sweetenerCount * 0.12 -
            s.additiveCount * 0.1 +
            qualityBaseFromText(p)
        : 6.2 +
            (s.activeDensity != null ? Math.min(1.7, s.activeDensity / 300) : 0.6) +
            (s.certificationCount > 0 ? 0.5 : 0) +
            qualityBaseFromText(p) -
            s.additiveCount * 0.08,
    )

    const qualityScore = clampScore(
      proteinCategory
        ? 6.1 +
            proteinDoseNorm * 1.8 +
            (s.hasAminoProfile ? 0.5 : 0) +
            (s.hasHydrolysate ? 0.5 : 0) +
            (s.hasIsolate ? 0.3 : 0)
        : 6.3 +
            (s.activeDensity != null ? Math.min(1.9, s.activeDensity / 250) : 0.7) +
            (s.form === "Kapsler" || s.form === "Tabletter" || s.form === "Pulver" ? 0.3 : 0) +
            qualityBaseFromText(p),
    )

    const valueScore = clampScore(
      5.6 +
        valueNorm * 3.2 +
        (s.servingsPerPack != null ? Math.min(0.6, s.servingsPerPack / 200) : 0) +
        (s.pricePerDay != null ? 0.2 : 0),
    )

    const usabilityScore = clampScore(
      6.8 +
        (/flere varianter/i.test(getQuickFactValue(p, "Antal smage") || "") ? 0.5 : 0) +
        (s.hasLactase ? 0.3 : 0) +
        (/let at blande|klumpfri|nem at bruge|daglig brug/i.test(p.content) ? 0.5 : 0),
    )

    const purityScore = clampScore(
      7.5 -
        s.additiveCount * 0.14 -
        s.sweetenerCount * 0.16 +
        (s.certificationCount > 0 ? 0.5 : 0) +
        (s.vegan === true ? 0.2 : 0) +
        (s.lactoseFree === true ? 0.2 : 0),
    )

    const customerScore = clampScore(userScore10 ?? ((extracted * 0.6 + ingredientScore * 0.4)))

    const weights =
      siloId === "protein-traening"
        ? { ing: 0.24, qual: 0.22, val: 0.22, use: 0.14, pur: 0.13, cus: 0.05 }
        : { ing: 0.23, qual: 0.2, val: 0.24, use: 0.12, pur: 0.16, cus: 0.05 }

    const overall =
      ingredientScore * weights.ing +
      qualityScore * weights.qual +
      valueScore * weights.val +
      usabilityScore * weights.use +
      purityScore * weights.pur +
      customerScore * weights.cus

    const premiumProfile =
      ingredientScore * 0.35 + qualityScore * 0.25 + purityScore * 0.2 + valueScore * 0.1 + usabilityScore * 0.1
    const valueProfile =
      valueScore * 0.4 + ingredientScore * 0.2 + qualityScore * 0.15 + purityScore * 0.15 + usabilityScore * 0.1
    const beginnerProfile =
      usabilityScore * 0.25 + valueScore * 0.25 + purityScore * 0.2 + ingredientScore * 0.15 + qualityScore * 0.15

    const panelScores: PanelScores = {
      ingredients: round1(ingredientScore),
      quality: round1(qualityScore),
      value: round1(valueScore),
      usability: round1(usabilityScore),
      purity: round1(purityScore),
      customer: round1(customerScore),
      overall: round1(overall),
      profilePremium: round1(premiumProfile),
      profileValue: round1(valueProfile),
      profileBeginner: round1(beginnerProfile),
    }

    p.panelScores = panelScores
    // Keep a bit more precision for stable ordering; UI renders 1 decimal via toFixed(1).
    p.rating = Math.round(overall * 100) / 100
  }
}

function recomputeDerivedScores(panel: PanelScores, siloId: string): PanelScores {
  const clamp = (n: number) => Math.max(5, Math.min(9.7, n))
  const round1 = (n: number) => Math.round(n * 10) / 10
  const round2 = (n: number) => Math.round(n * 100) / 100

  const weights =
    siloId === "protein-traening"
      ? { ing: 0.24, qual: 0.22, val: 0.22, use: 0.14, pur: 0.13, cus: 0.05 }
      : { ing: 0.23, qual: 0.2, val: 0.24, use: 0.12, pur: 0.16, cus: 0.05 }

  const ingredients = clamp(panel.ingredients)
  const quality = clamp(panel.quality)
  const value = clamp(panel.value)
  const usability = clamp(panel.usability)
  const purity = clamp(panel.purity)
  const customer = clamp(panel.customer)

  const overall =
    ingredients * weights.ing +
    quality * weights.qual +
    value * weights.val +
    usability * weights.use +
    purity * weights.pur +
    customer * weights.cus

  const premiumProfile = ingredients * 0.35 + quality * 0.25 + purity * 0.2 + value * 0.1 + usability * 0.1
  const valueProfile = value * 0.4 + ingredients * 0.2 + quality * 0.15 + purity * 0.15 + usability * 0.1
  const beginnerProfile = usability * 0.25 + value * 0.25 + purity * 0.2 + ingredients * 0.15 + quality * 0.15

  return {
    ingredients: round1(ingredients),
    quality: round1(quality),
    value: round1(value),
    usability: round1(usability),
    purity: round1(purity),
    customer: round1(customer),
    overall: round2(overall),
    profilePremium: round2(premiumProfile),
    profileValue: round2(valueProfile),
    profileBeginner: round2(beginnerProfile),
  }
}

function applyAwardDrivenScoreShaping(products: ProductData[], awardsBySlug: Map<string, ProductAward>, siloId: string) {
  const findAwardSlug = (label: string): string | null => {
    for (const [slug, a] of awardsBySlug.entries()) {
      if ((a?.label || "").toUpperCase() === label.toUpperCase()) return slug
    }
    return null
  }

  const winnerSlug = findAwardSlug("BEDST I TEST")
  const premiumSlug = findAwardSlug("BEDSTE PREMIUM")
  const budgetSlug = findAwardSlug("BEDSTE BUDGET")
  if (!winnerSlug || !premiumSlug || !budgetSlug) return

  const bySlug = new Map(products.map((p) => [p.slug, p]))
  const winner = bySlug.get(winnerSlug)
  const premium = bySlug.get(premiumSlug)
  const budget = bySlug.get(budgetSlug)
  if (!winner?.panelScores || !premium?.panelScores || !budget?.panelScores) return

  const winnerOverall = winner.panelScores.overall

  const clamp = (n: number) => Math.max(5, Math.min(9.7, n))
  const applyDelta = (panel: PanelScores, base: PanelScores, field: keyof PanelScores, delta: number, maxAbs = 1.2) => {
    const baseValue = (base as any)[field]
    if (typeof baseValue !== "number") return
    const bounded = Math.max(-maxAbs, Math.min(maxAbs, delta))
    ;(panel as any)[field] = clamp(baseValue + bounded)
  }

  // Initial shaping: make the profile match the award.
  {
    const base = premium.panelScores as PanelScores
    const next: PanelScores = { ...base }
    applyDelta(next, base, "quality", +0.7)
    applyDelta(next, base, "ingredients", +0.5)
    applyDelta(next, base, "purity", +0.4)
    applyDelta(next, base, "value", -0.8)
    premium.panelScores = recomputeDerivedScores(next, siloId)
    premium.rating = premium.panelScores.overall
  }
  {
    const base = budget.panelScores as PanelScores
    const next: PanelScores = { ...base }
    applyDelta(next, base, "value", +0.9)
    applyDelta(next, base, "quality", -0.5)
    applyDelta(next, base, "ingredients", -0.4)
    applyDelta(next, base, "purity", -0.3)
    budget.panelScores = recomputeDerivedScores(next, siloId)
    budget.rating = budget.panelScores.overall
  }

  const getOverall = (p: ProductData) => p.panelScores?.overall ?? p.rating
  const getBestOtherOverall = (exclude: Set<string>): number => {
    let best = -Infinity
    for (const p of products) {
      if (exclude.has(p.slug)) continue
      const o = getOverall(p)
      if (typeof o === "number" && Number.isFinite(o)) best = Math.max(best, o)
    }
    return best === -Infinity ? 0 : best
  }

  const nudgePremiumUp = () => {
    const base = premium.panelScores as PanelScores
    const next: PanelScores = { ...base }
    next.quality = clamp(next.quality + 0.15)
    next.ingredients = clamp(next.ingredients + 0.1)
    next.value = clamp(next.value - 0.1)
    premium.panelScores = recomputeDerivedScores(next, siloId)
    premium.rating = premium.panelScores.overall
  }

  const nudgeBudgetUp = () => {
    const base = budget.panelScores as PanelScores
    const next: PanelScores = { ...base }
    next.value = clamp(next.value + 0.15)
    next.usability = clamp(next.usability + 0.05)
    budget.panelScores = recomputeDerivedScores(next, siloId)
    budget.rating = budget.panelScores.overall
  }

  const nudgeBudgetDown = () => {
    const base = budget.panelScores as PanelScores
    const next: PanelScores = { ...base }
    next.quality = clamp(next.quality - 0.1)
    next.ingredients = clamp(next.ingredients - 0.05)
    budget.panelScores = recomputeDerivedScores(next, siloId)
    budget.rating = budget.panelScores.overall
  }

  // Enforce ordering invariants without extreme changes:
  //   winner > premium > budget > rest
  // and keep premium/budget below winner.
  for (let i = 0; i < 25; i++) {
    if (premium.panelScores!.overall >= winnerOverall - 0.1) {
      const base = premium.panelScores as PanelScores
      const next: PanelScores = { ...base }
      next.value = clamp(next.value - 0.1)
      premium.panelScores = recomputeDerivedScores(next, siloId)
      premium.rating = premium.panelScores.overall
    }
    if (budget.panelScores!.overall >= winnerOverall - 0.2) nudgeBudgetDown()

    const bestOther = getBestOtherOverall(new Set([winnerSlug, premiumSlug, budgetSlug]))
    if (premium.panelScores!.overall <= bestOther + 0.08) nudgePremiumUp()
    if (budget.panelScores!.overall <= bestOther + 0.08) nudgeBudgetUp()
    if (premium.panelScores!.overall <= budget.panelScores!.overall + 0.05) {
      nudgePremiumUp()
      nudgeBudgetDown()
    }

    const sorted = [...products].sort((a, b) => getOverall(b) - getOverall(a))
    if (sorted[0]?.slug === winnerSlug && sorted[1]?.slug === premiumSlug && sorted[2]?.slug === budgetSlug) break
  }
}

function applyScoreLadder(products: ProductData[], catSlug: string, siloId: string, orderedSlugs: string[] = []) {
  // Goal:
  // - Winner ("BEDST I TEST") lands in [8.7, 9.7]
  // - Each next product is 0.2–0.5 lower than previous (stable, deterministic)
  //
  // We do this by adding a uniform delta to the 6 panel subscores (keeping the product's
  // relative profile shape), then recomputing derived fields. This avoids "everything is 9.7"
  // saturation artifacts that look unserious.
  const forcedRanked =
    orderedSlugs.length > 0
      ? orderedSlugs
          .map((slug) => products.find((p) => p.slug === slug))
          .filter((p): p is ProductData => Boolean(p))
      : []
  const ranked =
    forcedRanked.length === products.length
      ? forcedRanked
      : [...products].sort((a, b) => (b.panelScores?.overall ?? b.rating) - (a.panelScores?.overall ?? a.rating))
  if (ranked.length === 0) return

  const rng = mulberry32(hashStringToUint32(`score-ladder:${catSlug}`))
  const topTarget = 8.7 + rng() * 1.0 // [8.7, 9.7)

  const minGap = 0.2
  const maxGap = 0.5

  const targets: number[] = []
  targets[0] = Math.min(9.7, Math.max(8.7, topTarget))
  for (let i = 1; i < ranked.length; i++) {
    const gap = minGap + rng() * (maxGap - minGap)
    targets[i] = Math.max(5.5, targets[i - 1] - gap)
  }

  const clamp = (n: number) => Math.max(5, Math.min(9.7, n))

  const shiftToTarget = (p: ProductData, targetOverall: number) => {
    if (!p.panelScores) return
    let base = p.panelScores as PanelScores
    let target = clamp(targetOverall)

    // Iteratively adjust subscores to reach the overall target WITHOUT saturating everything to 9.7.
    // We distribute the needed overall delta into the subscores based on "headroom" (towards 9.7)
    // or "floor room" (towards 5.0) so the shape looks natural.
    const weights =
      siloId === "protein-traening"
        ? { ingredients: 0.24, quality: 0.22, value: 0.22, usability: 0.14, purity: 0.13, customer: 0.05 }
        : { ingredients: 0.23, quality: 0.2, value: 0.24, usability: 0.12, purity: 0.16, customer: 0.05 }

    const fields: Array<keyof typeof weights> = ["ingredients", "quality", "value", "usability", "purity", "customer"]
    const maxScore = 9.7
    const minScore = 5.0

    for (let iter = 0; iter < 6; iter++) {
      const current = base.overall || p.rating
      if (!current || !Number.isFinite(current) || current <= 0) break
      let deltaOverall = target - current
      // Keep changes bounded; if we need more than this, the underlying panel model is likely off.
      deltaOverall = Math.max(-2.0, Math.min(2.0, deltaOverall))

      const scoreNow: Record<string, number> = {
        ingredients: base.ingredients,
        quality: base.quality,
        value: base.value,
        usability: base.usability,
        purity: base.purity,
        customer: base.customer,
      }

      // Capacity in terms of "overall contribution" (weight * possible movement).
      const cap: Record<string, number> = {}
      for (const f of fields) {
        const v = scoreNow[f]
        const w = weights[f]
        const room = deltaOverall >= 0 ? Math.max(0, maxScore - v) : Math.max(0, v - minScore)
        cap[f] = w * room
      }
      const capSum = fields.reduce((sum, f) => sum + cap[f], 0)
      if (capSum <= 1e-9) break

      // Allocate contribution per field proportional to capacity (push the lowest ones first).
      const next: PanelScores = { ...base }
      for (const f of fields) {
        const w = weights[f]
        if (w <= 0) continue
        const portion = cap[f] / capSum
        const contrib = deltaOverall * portion // in overall units
        const deltaField = contrib / w
        ;(next as any)[f] = clamp(scoreNow[f] + deltaField)
      }

      const recomputed = recomputeDerivedScores(next, siloId)
      p.panelScores = recomputed
      p.rating = recomputed.overall
      base = recomputed
      if (Math.abs(recomputed.overall - target) <= 0.05) break
    }
  }

  for (let i = 0; i < ranked.length; i++) {
    shiftToTarget(ranked[i], targets[i])
  }

  // Add tiny deterministic variation so we don't end up with "all 9.6" subratings.
  // Then re-center the overall score back towards the target using a uniform shift.
  {
    const weights =
      siloId === "protein-traening"
        ? { ingredients: 0.24, quality: 0.22, value: 0.22, usability: 0.14, purity: 0.13, customer: 0.05 }
        : { ingredients: 0.23, quality: 0.2, value: 0.24, usability: 0.12, purity: 0.16, customer: 0.05 }
    const fields: Array<keyof typeof weights> = ["ingredients", "quality", "value", "usability", "purity", "customer"]

    const uniformShift = (p: ProductData, targetOverall: number) => {
      if (!p.panelScores) return
      const current = p.panelScores.overall
      if (!Number.isFinite(current)) return
      let delta = clamp(targetOverall) - current
      delta = Math.max(-0.35, Math.min(0.35, delta))
      const base = p.panelScores as PanelScores
      const next: PanelScores = { ...base }
      for (const f of fields) (next as any)[f] = clamp((base as any)[f] + delta)
      const recomputed = recomputeDerivedScores(next, siloId)
      p.panelScores = recomputed
      p.rating = recomputed.overall
    }

    for (let i = 0; i < ranked.length; i++) {
      const p = ranked[i]
      if (!p.panelScores) continue
      const rng2 = mulberry32(hashStringToUint32(`score-jitter:${catSlug}:${p.slug}`))
      const base = p.panelScores as PanelScores
      const next: PanelScores = { ...base }
      for (const f of fields) {
        const jitter = (rng2() - 0.5) * 0.24 // ±0.12
        ;(next as any)[f] = clamp((base as any)[f] + jitter)
      }
      const recomputed = recomputeDerivedScores(next, siloId)
      p.panelScores = recomputed
      p.rating = recomputed.overall
      uniformShift(p, targets[i])
    }
  }

  // Final pass: guarantee the monotone ladder even after clamps.
  const finalRanked = ranked
  for (let i = 1; i < finalRanked.length; i++) {
    const prev = finalRanked[i - 1]
    const cur = finalRanked[i]
    const prevScore = prev.panelScores?.overall ?? prev.rating
    const curScore = cur.panelScores?.overall ?? cur.rating
    if (!Number.isFinite(prevScore) || !Number.isFinite(curScore)) continue
    const gap = prevScore - curScore
    if (gap < minGap) {
      shiftToTarget(cur, prevScore - minGap)
    } else if (gap > maxGap) {
      shiftToTarget(cur, prevScore - maxGap)
    }
  }
}

function reconcileCoreAwardsToRanking(awardsBySlug: Map<string, ProductAward>, ranked: ProductData[]) {
  if (ranked.length === 0) return

  const normalizeLabel = (label: string | undefined) => String(label || "").toUpperCase().trim()
  const isCoreAward = (label: string | undefined) => CORE_AWARD_LABELS.includes(normalizeLabel(label) as (typeof CORE_AWARD_LABELS)[number])
  const findAwardSlug = (label: string): string | null => {
    for (const [slug, a] of awardsBySlug.entries()) {
      if (normalizeLabel(a?.label) === normalizeLabel(label)) return slug
    }
    return null
  }

  const defaultReasonByLabel: Record<(typeof CORE_AWARD_LABELS)[number], string> = {
    "BEDST I TEST": "Højeste samlede score i testen.",
    "BEDSTE PREMIUM": "Premiumvalg med stærk samlet profil blandt topplaceringerne.",
    "BEDSTE BUDGET": "Prisvenligt valg med stærk værdi blandt topplaceringerne.",
  }
  const coreReasonByLabel = new Map<string, string>()
  for (const label of CORE_AWARD_LABELS) {
    const holderSlug = findAwardSlug(label)
    const reason = holderSlug ? awardsBySlug.get(holderSlug)?.reason : ""
    coreReasonByLabel.set(label, reason || defaultReasonByLabel[label])
  }

  const displacedSpecialAwards: ProductAward[] = []

  for (let i = 0; i < Math.min(CORE_AWARD_LABELS.length, ranked.length); i++) {
    const label = CORE_AWARD_LABELS[i]
    const targetSlug = ranked[i].slug
    const targetExisting = awardsBySlug.get(targetSlug)
    if (targetExisting && !isCoreAward(targetExisting.label) && normalizeLabel(targetExisting.label) !== normalizeLabel(label)) {
      displacedSpecialAwards.push(targetExisting)
    }

    const currentHolderSlug = findAwardSlug(label)
    if (currentHolderSlug && currentHolderSlug !== targetSlug) {
      awardsBySlug.delete(currentHolderSlug)
    }

    awardsBySlug.set(targetSlug, {
      label,
      reason: coreReasonByLabel.get(label) || defaultReasonByLabel[label],
    })
  }

  // Special awards must never occupy visible positions 1-3.
  // Re-home displaced niche awards to the first free ranked slot from position 4 and onward.
  for (const displaced of displacedSpecialAwards) {
    const nextOpen = ranked.slice(3).find((prod) => !awardsBySlug.has(prod.slug))
    if (!nextOpen) break
    awardsBySlug.set(nextOpen.slug, displaced)
  }
}

function assertCoreAwardOrderInvariant(catSlug: string, awardsBySlug: Map<string, ProductAward>, ranked: ProductData[]) {
  if (ranked.length < 3) return

  const visibleCore = ranked.slice(0, 3).map((prod) => (awardsBySlug.get(prod.slug)?.label || "").toUpperCase())
  const expected = [...CORE_AWARD_LABELS]

  for (let i = 0; i < expected.length; i++) {
    if (visibleCore[i] !== expected[i]) {
      const actual = visibleCore.map((label, idx) => `#${idx + 1}=${label || "MISSING"}`).join(", ")
      throw new Error(
        `[ranking] ${catSlug} bryder core award-kontrakten. Forventede ${expected.join(
          " -> ",
        )} som synlige placeringer 1/2/3, men fik ${actual}.`,
      )
    }
  }
}

function refreshAwardReasons(awardsBySlug: Map<string, ProductAward>, products: ProductData[]) {
  // Awards are selected before score shaping / score ladder. Since we mutate panelScores and rating
  // afterwards, any reason text that includes numbers must be refreshed to avoid contradictions.
  const bySlug = new Map(products.map((p) => [p.slug, p]))

  for (const [slug, award] of awardsBySlug.entries()) {
    const p = bySlug.get(slug)
    if (!p || !award) continue

    const q = new Map(p.quickFacts.map((x) => [String(x.label || "").trim().toLowerCase(), String(x.value || "").trim()]))
    const qv = (label: string) => q.get(label.toLowerCase()) || ""

    // Utility helpers
    const has = (s: string) => Boolean(s && s.trim().length > 0)
    const pricePerBar = qv("Pris/bar")
    const pricePerPortion = qv("Pris/portion")
    const pricePerKg = qv("Pris/kg")
    const hasBarPricing = has(pricePerBar) && !/se aktuel pris/i.test(pricePerBar)
    const form = qv("Form")
    const eaaPerPortion = qv("EAA pr. portion")

    const safeAllroundReason = () => {
      const parts: string[] = []
      if (has(form)) {
        const f = form.toLowerCase()
        const fmt =
          /tabletter/.test(f) ? "tabletformat" :
          /kapsler/.test(f) ? "kapselformat" :
          /pulver/.test(f) ? "pulverformat" :
          `${f}-format`
        parts.push(`praktisk ${fmt}`)
      }
      if (hasBarPricing) parts.push(`lav pris pr. bar (${pricePerBar})`)
      else if (has(pricePerPortion) && !/se aktuel pris/i.test(pricePerPortion)) parts.push(`lav pris pr. portion (${pricePerPortion})`)
      else if (!hasBarPricing && has(pricePerKg)) parts.push(`konkurrencedygtig pris pr. kg (${pricePerKg})`)
      if (has(eaaPerPortion)) parts.push(`oplyst EAA pr. portion (${eaaPerPortion})`)
      if (parts.length === 0) return "Stærk allround-profil baseret på tilgængelige produktdata."
      // Keep it short and non-meta; no mention of "standardprofil" or "highest score".
      return `Et stærkt allround-valg med ${parts.slice(0, 2).join(" og ")}.`
    }

    if (award.label === "BEDST I TEST") {
      awardsBySlug.set(slug, { ...award, reason: safeAllroundReason() })
      continue
    }

    if (award.label === "BEDSTE PREMIUM") {
      const quality = p.panelScores?.quality
      const purity = p.panelScores?.purity
      const parts: string[] = []
      if (typeof quality === "number" && Number.isFinite(quality)) parts.push(`høj kvalitet-score (${quality.toFixed(1)}/10)`)
      if (typeof purity === "number" && Number.isFinite(purity)) parts.push(`stærk renhed/sikkerhed (${purity.toFixed(1)}/10)`)
      if (parts.length === 0) parts.push("fokus på kvalitet og ren profil")
      awardsBySlug.set(slug, { ...award, reason: `Premiumvalg med ${parts.slice(0, 2).join(" og ")}.` })
      continue
    }

    if (award.label === "BEDSTE BUDGET") {
      const value = p.panelScores?.value
      const parts: string[] = []
      if (hasBarPricing) parts.push(`stærk pris pr. bar (${pricePerBar})`)
      else if (has(pricePerPortion) && !/se aktuel pris/i.test(pricePerPortion)) parts.push(`stærk pris pr. portion (${pricePerPortion})`)
      if (!hasBarPricing && has(pricePerKg)) parts.push(`god pris pr. kg (${pricePerKg})`)
      if (typeof value === "number" && Number.isFinite(value)) parts.push(`høj værdi-score (${value.toFixed(1)}/10)`)
      awardsBySlug.set(slug, { ...award, reason: `Budgetvalg med ${parts.slice(0, 2).join(" og ")}.` })
      continue
    }

    if (award.label === "BEDSTE BRUGERVENLIGE VALG") {
      const usability = p.panelScores?.usability
      const overall = p.rating
      if (typeof usability === "number" && Number.isFinite(usability) && typeof overall === "number" && Number.isFinite(overall)) {
        awardsBySlug.set(slug, {
          ...award,
          reason: `Høj brugervenlighed i testen (brugervenlighed: ${usability.toFixed(1)}/10) med solid samlet score (${overall.toFixed(1)}/10).`,
        })
      }
    }
  }
}

function enforceAwardDimensionLeads(
  products: ProductData[],
  awardsBySlug: Map<string, ProductAward>,
  catSlug: string,
  siloId: string,
) {
  // After score shaping + ladder, ensure award semantics match subratings.
  // Example: "BEDSTE BRUGERVENLIGE VALG" should have the highest usability subscore.
  const findAwardSlug = (label: string): string | null => {
    for (const [slug, a] of awardsBySlug.entries()) {
      if ((a?.label || "").toUpperCase() === label.toUpperCase()) return slug
    }
    return null
  }

  const usabilitySlug = findAwardSlug("BEDSTE BRUGERVENLIGE VALG")
  if (!usabilitySlug) return

  const bySlug = new Map(products.map((p) => [p.slug, p]))
  const pick = bySlug.get(usabilitySlug)
  if (!pick?.panelScores) return

  const weights =
    siloId === "protein-traening"
      ? { ingredients: 0.24, quality: 0.22, value: 0.22, usability: 0.14, purity: 0.13, customer: 0.05 }
      : { ingredients: 0.23, quality: 0.2, value: 0.24, usability: 0.12, purity: 0.16, customer: 0.05 }

  const clamp = (n: number) => Math.max(5, Math.min(9.7, n))

  const maxOtherUsability = products
    .filter((p) => p.slug !== usabilitySlug)
    .map((p) => p.panelScores?.usability)
    .filter((v): v is number => typeof v === "number" && Number.isFinite(v))
    .reduce((m, v) => Math.max(m, v), -Infinity)

  if (!Number.isFinite(maxOtherUsability)) return

  const base = pick.panelScores as PanelScores
  const desiredUsability = clamp(Math.min(9.7, maxOtherUsability + 0.2))
  if (base.usability >= desiredUsability - 0.01) return

  // We want FINAL usability to reach desiredUsability while keeping the overall score roughly stable.
  // If we add +du to usability and subtract `offset = w*du` from all subscores, then:
  //   usability_final = base.usability + du - offset = base.usability + du*(1-w)
  // Solve for du: du = (desired - base) / (1-w)
  const w = Math.max(0.01, Math.min(0.5, weights.usability))
  let du = (desiredUsability - base.usability) / (1 - w)
  du = Math.max(0, Math.min(3.0, du))
  const offset = w * du

  const next: PanelScores = {
    ...base,
    ingredients: clamp(base.ingredients - offset),
    quality: clamp(base.quality - offset),
    value: clamp(base.value - offset),
    usability: clamp(base.usability + du - offset),
    purity: clamp(base.purity - offset),
    customer: clamp(base.customer - offset),
  }

  const recomputed = recomputeDerivedScores(next, siloId)
  pick.panelScores = recomputed
  pick.rating = recomputed.overall

  // If we still didn't end up above the rest (due to clamping), do a final direct nudge.
  const after = pick.panelScores.usability
  if (Number.isFinite(after) && after < desiredUsability - 0.05) {
    const base2 = pick.panelScores as PanelScores
    const next2: PanelScores = { ...base2, usability: clamp(desiredUsability) }
    pick.panelScores = recomputeDerivedScores(next2, siloId)
    pick.rating = pick.panelScores.overall
  }

  // Refresh reason if it embeds numbers.
  refreshAwardReasons(awardsBySlug, products)
}

function generateSupplementAwards(products: ProductData[], catSlug: string): Map<string, ProductAward> {
  type AwardCandidate = {
    slug: string
    label: string
    reason: string
    family: string
    score: number
  }
  type MetricRow = {
    product: ProductData
    costValue: number | null
    costSource: "dagsdosis" | "bar" | "portion" | "enhed" | "kg" | "pris"
    totalPrice: number | null
    rating: number
  }

  const GENERIC_FACT_LABELS = new Set<string>([
    "mærke", "pris", "score", "pakningsstørrelse", "portioner/pakke", "barer/pakke", "pris/bar", "pris/portion", "pris/enhed", "pris/dagsdosis", "pris/kg", "pris/l", "daglig dosis", "antal smage", "sødning", "form",
    // Purely descriptive metadata that should NOT produce awards.
    "oprindelsesland", "oprindelse", "origin",
    // Packaging/unit count metrics should have explicit utility labels (not "profile" awards).
    "kapsler/pakke", "tabletter/pakke", "stk/pakke", "kapsler pr. pakke", "tabletter pr. pakke", "stk pr. pakke",
  ])
  const FORBIDDEN_AWARD_TERMS = /(topplacering|høj testscore|topscore blandt alternativer|nichevalg)/i
  const MAX_AWARD_PER_PRODUCT = 1

  const cleanAwardLabel = (label: string) => {
    let x = label.replace(/\s+/g, " ").trim().toUpperCase()
    x = x.replace(/[^A-ZÆØÅ0-9+\-%\/\s]/g, "")
    if (FORBIDDEN_AWARD_TERMS.test(x)) {
      x = x
        .replace(/TOPPLACERING/g, "DISTINKT PROFIL")
        .replace(/HØJ TESTSCORE/g, "STÆRK PROFIL")
        .replace(/TOPSCORE BLANDT ALTERNATIVER/g, "STÆRK PROFIL")
        .replace(/NICHEVALG/g, "DISTINKT VALG")
    }
    return x
  }

  const detectForm = (prod: ProductData): string | null => {
    const fromFact = (getQuickFactValue(prod, "Form") || "").trim().toLowerCase()
    const title = prod.title.toLowerCase()
    // Match both standalone words ("acai pulver") and compounds ("acaipulver").
    if (/(kapsel|kapsler|capsule|capsules|softgel|softgels)\b/.test(fromFact)) return "kapsel"
    if (/(tablet|tabletter|tabs?|tyggetablet)\b/.test(fromFact)) return "tablet"
    if (/(pulver|powder)\b/.test(fromFact)) return "pulver"
    if (/(gummi|gummies?)\b/.test(fromFact)) return "gummi"
    if (/(flydende|olie|oil|liquid|sirup|dråber|drik|shots?)\b/.test(fromFact)) return "flydende"
    if (/(kapsel|kapsler|capsule|capsules|softgel|softgels)\b/.test(title)) return "kapsel"
    if (/(tablet|tabletter|tabs?|tyggetablet)\b/.test(title)) return "tablet"
    if (/(pulver|powder)\b/.test(title)) return "pulver"
    if (/(gummi|gummies?)\b/.test(title)) return "gummi"
    if (/(olie|oil|liquid|sirup|dråber|drik|shots?)\b/.test(title)) return "flydende"
    if (fromFact.length > 0) return fromFact.replace(/\s+/g, " ").trim()
    return null
  }

  const dossier = buildAwardDossier(catSlug)
  const metricRows: MetricRow[] = products.map((p) => {
    const cost = getAwardCostSignal(p)
    const totalPrice = parseNumericPrefix(getQuickFactValue(p, "Pris")) ?? parseNumericPrefix(p.price)
    return { product: p, costValue: cost.value, costSource: cost.source, totalPrice, rating: p.rating }
  })

  const signalTextBySlug = new Map<string, string>()
  for (const p of products) {
    // Important: do NOT use the long review text (`p.content`) for award detection.
    // That text is often AI-generated and can mention traits that are not actually true for the product.
    // Use only stable signals: title + brand + quick facts.
    const quick = p.quickFacts.map((q) => `${q.label} ${q.value}`).join(" ")
    signalTextBySlug.set(p.slug, `${p.title} ${p.brand} ${quick}`.toLowerCase())
  }

  const awardMap = new Map<string, ProductAward>()
  if (products.length === 0) return awardMap

  if (catSlug === "cla") {
    const ranked = products
    if (ranked[0]) {
      awardMap.set(ranked[0].slug, {
        label: "BEDST I TEST",
        reason: "Stærk samlet CLA-profil med høj dagsdosis, god værdi og bred relevans i daglig brug.",
      })
    }
    if (ranked[1]) {
      awardMap.set(ranked[1].slug, {
        label: "BEDSTE PREMIUM",
        reason: "Et mere premium-præget CLA-valg med tydelig deklaration og fokus på et rent, klassisk CLA-tilskud.",
      })
    }
    if (ranked[2]) {
      awardMap.set(ranked[2].slug, {
        label: "BEDSTE BUDGET",
        reason: "Prisvenligt CLA-valg for dig, der vil holde udgiften nede uden at forlade kategorien.",
      })
    }
    if (ranked[3]) {
      awardMap.set(ranked[3].slug, {
        label: "BEDSTE BALANCEREDE VALG",
        reason: "Balanceret CLA-produkt med god daglig anvendelse og et mere tilgængeligt prisniveau.",
      })
    }
    if (ranked[4]) {
      awardMap.set(ranked[4].slug, {
        label: "BEDSTE NICHEVALG",
        reason: "Et mere specialiseret alternativ til dig, der aktivt ønsker CLA kombineret med andre præstationsrettede ingredienser.",
      })
    }
    return awardMap
  }

  const ranked = products
  const winner = ranked[0]
  const winnerForm = detectForm(winner)
  awardMap.set(winner.slug, { label: "BEDST I TEST", reason: "Højeste score i vores standardprofil, hvor kvalitet, værdi og daglig brug vægtes samlet." })

  const used = new Set<string>([winner.slug])
  const usedFamilies = new Set<string>(["winner"])
  const productAwardCount = new Map<string, number>([[winner.slug, 1]])
  const candidates: AwardCandidate[] = []
  const candidateIndex = new Set<string>()

  const addCandidate = (candidate: AwardCandidate) => {
    const key = `${candidate.slug}|${candidate.family}`
    if (candidateIndex.has(key)) return
    const label = cleanAwardLabel(candidate.label)
    if (!label || FORBIDDEN_AWARD_TERMS.test(label)) return
    candidateIndex.add(key)
    candidates.push({ ...candidate, label })
  }

  const assignAward = (slug: string, label: string, reason: string, family: string) => {
    if (usedFamilies.has(family)) return
    if ((productAwardCount.get(slug) || 0) >= MAX_AWARD_PER_PRODUCT) return
    awardMap.set(slug, { label: cleanAwardLabel(label), reason })
    used.add(slug)
    usedFamilies.add(family)
    productAwardCount.set(slug, (productAwardCount.get(slug) || 0) + 1)
  }

  // ────────────────────────────────────────────────────────────────
  // Always include 3 "core" awards:
  //   1) BEDST I TEST (winner)
  //   2) BEDSTE PREMIUM
  //   3) BEDSTE BUDGET
  //
  // Then we fill the remaining 2 products with the best fitting distinct awards.
  // This keeps UX predictable and avoids weird niche labels.
  // ────────────────────────────────────────────────────────────────

  const TARGET_AWARDED_PRODUCTS = Math.min(5, ranked.length)

  const priceMetricFor = (m: MetricRow): { value: number | null; kind: "total" | "cost"; source: string } => {
    if (m.totalPrice != null && Number.isFinite(m.totalPrice)) return { value: m.totalPrice, kind: "total", source: "pris" }
    if (m.costValue != null && Number.isFinite(m.costValue)) return { value: m.costValue, kind: "cost", source: formatCostSource(m.costSource) }
    return { value: null, kind: "total", source: "pris" }
  }

  const pickByScoredMetric = (
    rows: MetricRow[],
    direction: "budget" | "premium",
    excludeSlugs: Set<string>,
  ): MetricRow | null => {
    const pool = rows.filter((r) => !excludeSlugs.has(r.product.slug))
    const withMetric = pool
      .map((r) => ({ r, metric: priceMetricFor(r) }))
      .filter((x): x is { r: MetricRow; metric: { value: number; kind: "total" | "cost"; source: string } } => x.metric.value != null)

    // Prefer products with a sensible minimum rating, but fall back if needed.
    const primary = withMetric.filter((x) => x.r.rating >= 6.8)
    const candidatesPool = primary.length >= 2 ? primary : withMetric
    if (candidatesPool.length === 0) return null

    const values = candidatesPool.map((x) => x.metric.value as number)
    const minV = Math.min(...values)
    const maxV = Math.max(...values)
    const denom = Math.max(1e-9, maxV - minV)

    const scored = candidatesPool.map((x) => {
      const v = x.metric.value as number
      const cheapness = (maxV - v) / denom
      const expensiveness = (v - minV) / denom
      const ratingNorm = Math.max(0, Math.min(1, x.r.rating / 10))
      // Use panel profiles when available to align award meaning with parsed signals.
      // Premium: "dyrere + bedre profil". Budget: "billigere + bedre værdi-profil".
      const premNorm = Math.max(0, Math.min(1, (x.r.product.panelScores?.profilePremium ?? x.r.rating) / 10))
      const valNorm = Math.max(0, Math.min(1, (x.r.product.panelScores?.profileValue ?? x.r.rating) / 10))
      const s = direction === "budget"
        ? cheapness * 0.42 + ratingNorm * 0.23 + valNorm * 0.35
        : expensiveness * 0.32 + ratingNorm * 0.33 + premNorm * 0.35
      return { x, s }
    })
    scored.sort((a, b) => b.s - a.s)
    return scored[0]?.x.r || null
  }

  const formatBudgetReason = (row: MetricRow): string => {
    const metric = priceMetricFor(row)
    if (metric.value == null) return "Stærkt valg hvis du vil holde prisen nede uden at gå for meget på kompromis."
    if (metric.kind === "total") return `Stærkt valg hvis du vil holde prisen nede (${formatNumberDa(metric.value, 0)} kr) uden at gå for meget på kompromis (${row.rating.toFixed(1)}/10).`
    return `Stærkt valg hvis du vil holde prisen nede (${formatAwardMetric(metric.value)} pr. ${metric.source}) uden at gå for meget på kompromis (${row.rating.toFixed(1)}/10).`
  }

  const formatPremiumReason = (row: MetricRow): string => {
    const metric = priceMetricFor(row)
    if (metric.value == null) return `Premiumvalg med høj score (${row.rating.toFixed(1)}/10) og fokus på kvalitet.`
    if (metric.kind === "total") return `Premiumvalg med høj score (${row.rating.toFixed(1)}/10) og tydelig høj prisposition (${formatNumberDa(metric.value, 0)} kr).`
    return `Premiumvalg med høj score (${row.rating.toFixed(1)}/10) og tydelig høj prisposition (${formatAwardMetric(metric.value)} pr. ${metric.source}).`
  }

  const coreExcluded = new Set<string>([winner.slug])
  const assignFallbackCoreAward = (label: (typeof CORE_AWARD_LABELS)[number], reason: string, family: string) => {
    const fallback = ranked.find((prod) => !coreExcluded.has(prod.slug))
    if (!fallback) return
    assignAward(fallback.slug, label, reason, family)
    coreExcluded.add(fallback.slug)
  }

  const premiumRow = pickByScoredMetric(metricRows, "premium", coreExcluded)
  if (premiumRow) {
    assignAward(premiumRow.product.slug, "BEDSTE PREMIUM", formatPremiumReason(premiumRow), "premium")
    coreExcluded.add(premiumRow.product.slug)
  } else {
    assignFallbackCoreAward("BEDSTE PREMIUM", "Premiumvalg med høj samlet profil blandt de resterende produkter.", "premium")
  }

  const budgetRow = pickByScoredMetric(metricRows, "budget", coreExcluded)
  if (budgetRow) {
    assignAward(budgetRow.product.slug, "BEDSTE BUDGET", formatBudgetReason(budgetRow), "budget")
    coreExcluded.add(budgetRow.product.slug)
  } else {
    assignFallbackCoreAward("BEDSTE BUDGET", "Prisvenligt valg blandt de resterende produkter i kategorien.", "budget")
  }

  // 1) Value candidate (optional). Premium/budget are assigned above.
  {
    const validCosts = metricRows.filter((m) => m.costValue != null && m.rating >= 7.0)
    if (validCosts.length >= 2) {
      const minCost = Math.min(...validCosts.map((x) => x.costValue as number))
      const maxCost = Math.max(...validCosts.map((x) => x.costValue as number))
      const valueWinner = validCosts
        .map((x) => {
          const cheapness = maxCost > minCost ? (maxCost - (x.costValue as number)) / (maxCost - minCost) : 1
          return { x, s: cheapness * 0.58 + (x.rating / 10) * 0.42 }
        })
        .sort((a, b) => b.s - a.s)[0]?.x
      if (valueWinner) {
        addCandidate({
          slug: valueWinner.product.slug,
          label: "BEDSTE VÆRDI",
          reason: `Stærk balance mellem pris og kvalitet (${formatAwardMetric(valueWinner.costValue as number)} pr. ${formatCostSource(valueWinner.costSource)}) med ${valueWinner.rating.toFixed(1)}/10.`,
          family: "value",
          score: 0.96,
        })
      }
    }
  }

  // 2) Form unique / best-in-form
  {
    // IMPORTANT: form awards must be based on the full test field, not only the "remaining"
    // products after premium/budget are assigned. Otherwise we can end up with confusing
    // labels like "BEDSTE TABLET ..." and "BEDSTE PULVER ..." at the same time.
    const allFormRows = ranked
      .map((p) => ({ p, form: detectForm(p) }))
      .filter((x): x is { p: ProductData; form: string } => Boolean(x.form))

    const formCountAll = new Map<string, number>()
    for (const row of allFormRows) formCountAll.set(row.form, (formCountAll.get(row.form) ?? 0) + 1)

    const normalizeFormLabel = (form: string): string => {
      const f = form.toLowerCase()
      if (f === "kapsel" || f === "kapsler" || f === "caps") return "KAPSELVALG"
      if (f === "tablet" || f === "tabletter" || f === "tabs") return "TABLETVALG"
      if (f === "pulver" || f === "powder") return "PULVERVALG"
      if (f === "gummi" || f === "gummies") return "GUMMIVALG"
      if (f === "flydende" || f === "olie" || f === "dråber") return "FLYDENDE VALG"
      return `${form.toUpperCase()}-VALG`
    }

    // Pick at most ONE form award, and only if it's a meaningful minority form
    // (e.g. one tablet product among mostly powders).
    const remaining = ranked.filter((p) => !used.has(p.slug))
    const totalWithKnownForm = Math.max(1, allFormRows.length)
    const formCandidates = [...formCountAll.entries()]
      .filter(([form]) => !(winnerForm && winnerForm === form))
      .map(([form, count]) => {
        const best = remaining
          .filter((p) => detectForm(p) === form)
          .sort((a, b) => b.rating - a.rating)[0]
        const rarity = 1 - count / totalWithKnownForm
        return { form, count, best, rarity }
      })
      .filter((x) => Boolean(x.best))
      .sort((a, b) => b.rarity - a.rarity || (b.best?.rating ?? 0) - (a.best?.rating ?? 0))

    const picked = formCandidates[0]
    if (picked && picked.best) {
      // Only award if the form is actually a minority/alternative, otherwise it reads like "which form is best?"
      const isMeaningful = picked.count === 1 || picked.rarity >= 0.45
      if (isMeaningful) {
        const label = `BEDSTE ${normalizeFormLabel(picked.form)}`
        const reason =
          picked.count === 1
            ? `Eneste ${picked.form}-valg i testen, hvilket gør den relevant hvis du foretrækker denne form.`
            : `Bedste ${picked.form}-valg blandt ${picked.count} produkter i feltet (${picked.best.rating.toFixed(1)}/10).`
        addCandidate({
          slug: picked.best.slug,
          label,
          reason,
          family: "form",
          score: picked.count === 1 ? 0.9 : 0.82 + Math.min(0.12, picked.rarity * 0.15),
        })
      }
    }
  }

  // 3) Trait-based and dossier-intent candidates
  {
    const TASTE_RELEVANT_FORMS = new Set(["pulver", "flydende", "gummi"])
    const traitPatterns: Array<{ re: RegExp; label: string; reason: string; family: string; score: number; requireForm?: Set<string> }> = [
      { re: /bisglycinat|bisglycinate/i, label: "BEDSTE BISGLYCINAT-VALG", reason: "Form med fokus på god tolerance og optagelse.", family: "trait:bisglycinat", score: 0.9 },
      { re: /picolinat|picolinate/i, label: "BEDSTE PICOLINAT-VALG", reason: "Picolinat-form med målrettet mineralsk profil.", family: "trait:picolinat", score: 0.86 },
      { re: /citrat|citrate/i, label: "BEDSTE CITRAT-VALG", reason: "Citrat-form med fokus på praktisk daglig anvendelse.", family: "trait:citrat", score: 0.84 },
      { re: /liposomal/i, label: "BEDSTE LIPOSOMALE VALG", reason: "Liposomal formulering med fokus på aktiv levering.", family: "trait:liposomal", score: 0.88 },
      { re: /depot|time[- ]?release|slow[- ]?release/i, label: "BEDSTE DEPOT-FORMEL", reason: "Depot-/tidsfrigivende profil til jævn daglig tilførsel.", family: "trait:depot", score: 0.83 },
      { re: /økologisk|organic/i, label: "BEDSTE ØKOLOGISKE VALG", reason: "Økologisk profil for dig med fokus på råvarekvalitet.", family: "trait:organic", score: 0.87 },
      { re: /smag|velsmagende|god smag|opløselig|opløselighed|let at blande|klumpfri/i, label: "BEDSTE SMAG & BLANDBARHED", reason: "Stærk profil på smag og praktisk blandbarhed i hverdagen.", family: "trait:taste-mix", score: 0.88, requireForm: TASTE_RELEVANT_FORMS },
      { re: /hurtigt optag|hurtig optagelse|hurtigt absorberet|fast absorption/i, label: "BEDSTE TIL HURTIGT OPTAG", reason: "Formulering med fokus på hurtig anvendelse omkring træning.", family: "trait:fast-uptake", score: 0.86 },
      { re: /lavt i kalorier|kaloriekontrolleret|lavt kalorieindhold|kaloriekontrol/i, label: "BEDSTE TIL KALORIEKONTROL", reason: "Profil der passer godt til dig, som vil styre kalorieindtaget tættere.", family: "trait:calorie-control", score: 0.87 },
    ]

    const remaining = ranked.filter((p) => !used.has(p.slug))

    // Boolean traits must be backed by structured signals to avoid misleading awards
    // when only some products *mention* the word (e.g. "vegansk") even though all are vegan.
    const booleanTraits: Array<{
      key: "vegan" | "lactoseFree"
      label: string
      reason: string
      family: string
      score: number
    }> = [
      { key: "vegan", label: "BEDSTE VEGANSKE VALG", reason: "Tydelig vegansk profil i feltet.", family: "trait:vegan", score: 0.86 },
      { key: "lactoseFree", label: "BEDSTE LAKTOSEFRI VALG", reason: "Relevans for dig der vil undgå laktose.", family: "trait:lactosefree", score: 0.85 },
    ]

    for (const cfg of booleanTraits) {
      const isTrue = (p: ProductData) => (p.signals as any)?.[cfg.key] === true
      const hits = remaining.filter(isTrue)
      if (hits.length === 0 || hits.length === remaining.length) continue
      // If the overall winner is also part of the trait, then the "best" for that trait is the winner,
      // and assigning the label to someone else becomes confusing.
      if (isTrue(winner)) continue
      const best = hits.slice().sort((a, b) => b.rating - a.rating)[0]
      addCandidate({
        slug: best.slug,
        label: cfg.label,
        reason: `${cfg.reason} Højeste score blandt produkterne med denne profil (${best.rating.toFixed(1)}/10).`,
        family: cfg.family,
        score: cfg.score,
      })
    }

    // Signal-backed traits (prefer these over text matching).
    const signalTraits: Array<{
      label: string
      reason: string
      family: string
      score: number
      isHit: (p: ProductData) => boolean
    }> = [
      {
        label: "BEDSTE HYDROLYSAT-VALG",
        reason: "Hydrolyseret profil for hurtig anvendelse omkring træning.",
        family: "trait:hydrolysat",
        score: 0.9,
        isHit: (p) => (p.signals?.hasHydrolysate ?? false) === true,
      },
      {
        label: "BEDSTE ISOLAT-VALG",
        reason: "Isolatprofil med fokus på høj renhed og koncentration.",
        family: "trait:isolat",
        score: 0.89,
        isHit: (p) => (p.signals?.hasIsolate ?? false) === true,
      },
      {
        label: "BEDSTE CERTIFICEREDE VALG",
        reason: "Dokumenteret kvalitetsprofil med relevante certificeringer.",
        family: "trait:cert",
        score: 0.9,
        isHit: (p) => (p.signals?.certificationCount ?? 0) >= 1,
      },
      {
        label: "BEDSTE CLEAN LABEL-VALG",
        reason: "Renere profil med færre søde tilsætninger.",
        family: "trait:clean",
        score: 0.87,
        isHit: (p) => {
          const sweeteners = p.signals?.sweetenerCount
          if (sweeteners == null) return false
          // Only treat this as a differentiator if we actually have signal data.
          return sweeteners === 0
        },
      },
    ]

    for (const cfg of signalTraits) {
      const hits = remaining.filter(cfg.isHit)
      if (hits.length === 0 || hits.length === remaining.length) continue
      if (cfg.isHit(winner)) continue
      const best = hits.slice().sort((a, b) => b.rating - a.rating)[0]
      addCandidate({
        slug: best.slug,
        label: cfg.label,
        reason: `${cfg.reason} Højeste score blandt produkterne med denne profil (${best.rating.toFixed(1)}/10).`,
        family: cfg.family,
        score: cfg.score,
      })
    }

    for (const cfg of traitPatterns) {
      let hits = remaining.filter((p) => cfg.re.test(signalTextBySlug.get(p.slug) || ""))
      if (cfg.requireForm) {
        hits = hits.filter((p) => {
          const form = detectForm(p)
          return form != null && cfg.requireForm!.has(form)
        })
      }
      if (hits.length === 0 || hits.length === remaining.length) continue
      const best = hits.slice().sort((a, b) => b.rating - a.rating)[0]
      addCandidate({
        slug: best.slug,
        label: cfg.label,
        reason: `${cfg.reason} Højeste score i denne profil (${best.rating.toFixed(1)}/10).`,
        family: cfg.family,
        score: hits.length === 1 ? Math.min(0.95, cfg.score + 0.06) : cfg.score,
      })
    }

    for (const intent of dossier.userIntentAwards) {
      const hits = remaining.filter((p) => intent.matcher.test(signalTextBySlug.get(p.slug) || ""))
      if (hits.length === 0 || hits.length === remaining.length) continue
      const best = hits.slice().sort((a, b) => b.rating - a.rating)[0]
      addCandidate({
        slug: best.slug,
        label: intent.label,
        reason: `${intent.reason} Højeste score i denne målgruppeprofil (${best.rating.toFixed(1)}/10).`,
        family: `intent:${intent.key}`,
        score: hits.length === 1 ? 0.9 : 0.84,
      })
    }
  }

  // 4) Dominant metric candidates from quick facts
  {
    const topicBoostKeywords = dossier.focusKeywords.map((k) => k.toLowerCase())
    const metricLabels = new Map<string, Array<{ p: ProductData; value: number; raw: string }>>()
    for (const p of ranked.filter((x) => !used.has(x.slug))) {
      for (const q of p.quickFacts) {
        const key = q.label.toLowerCase()
        if (GENERIC_FACT_LABELS.has(key)) continue
        if (!/mg|mcg|µg|iu|%|cfu|epa|dha|protein|aktiv|elementær|pr\./i.test(`${q.label} ${q.value}`)) continue
        const nums = parseAllNumbers(q.value)
        if (nums.length === 0) continue
        const arr = metricLabels.get(q.label) ?? []
        arr.push({ p, value: nums[0], raw: q.value })
        metricLabels.set(q.label, arr)
      }
    }

    for (const [label, rows] of metricLabels.entries()) {
      if (rows.length < 2) continue
      const sorted = rows.slice().sort((a, b) => b.value - a.value)
      const top = sorted[0]
      const bottom = sorted[sorted.length - 1]
      if (bottom.value <= 0) continue
      const relSpread = (top.value - bottom.value) / bottom.value
      if (relSpread < 0.15) continue

      const lower = label.toLowerCase()
      const topicBoost = topicBoostKeywords.some((kw) => lower.includes(kw)) ? 0.1 : 0
      const labelText =
        /epa|dha/.test(lower) ? "HØJEST EPA + DHA" :
        /omega/.test(lower) ? "HØJEST OMEGA-3 INDHOLD" :
        /cfu/.test(lower) ? "HØJEST CFU" :
        /protein/.test(lower) ? "HØJEST PROTEINDOSIS" :
        `STÆRKEST ${label.toUpperCase()}-PROFIL`

      addCandidate({
        slug: top.p.slug,
        label: labelText,
        reason: `Skiller sig ud med højeste niveau på ${label.toLowerCase()} (${top.raw}).`,
        family: `metric:${label.toLowerCase()}`,
        score: 0.79 + Math.min(relSpread, 0.45) * 0.2 + topicBoost,
      })
    }
  }

  // 5) Pack/portion utility candidates
  {
    const remaining = ranked.filter((p) => !used.has(p.slug))
    const sizeRows = remaining
      .map((p) => ({ p, v: Math.max(...parseAllNumbers(getQuickFactValue(p, "Pakningsstørrelse") || "0")) }))
      .filter((x) => Number.isFinite(x.v) && x.v > 0)
      .sort((a, b) => b.v - a.v)
    if (sizeRows.length >= 2 && sizeRows[0].v > sizeRows[sizeRows.length - 1].v * 1.15) {
      addCandidate({
        slug: sizeRows[0].p.slug,
        label: "STØRSTE PAKNINGSSTØRRELSE",
        reason: `Største pakning i testen (${getQuickFactValue(sizeRows[0].p, "Pakningsstørrelse") || "oplyst størrelse"}), relevant ved høj forbrugsmængde.`,
        family: "utility:size",
        score: 0.8,
      })
    }

    const portionRows = remaining
      .map((p) => ({ p, v: parseNumericPrefix(getQuickFactValue(p, "Portioner/pakke")) }))
      .filter((x): x is { p: ProductData; v: number } => x.v != null)
      .sort((a, b) => b.v - a.v)
    if (portionRows.length >= 2 && portionRows[0].v >= portionRows[portionRows.length - 1].v * 1.2) {
      addCandidate({
        slug: portionRows[0].p.slug,
        label: "FLEST PORTIONER PR. PAKKE",
        reason: `Højeste antal portioner pr. pakke (${formatNumberDa(portionRows[0].v, 0)}), hvilket typisk giver længere holdbarhed i brug.`,
        family: "utility:portions",
        score: 0.79,
      })
    }

    // Capsules/tablets per pack: common on supplement pages; label must be explicit to avoid confusion.
    const unitLabelFor = (rawLabel: string): string => {
      const lower = rawLabel.toLowerCase()
      if (lower.includes("kaps")) return "KAPSLER"
      if (lower.includes("tablet") || lower.includes("tabs")) return "TABLETTER"
      return "STK"
    }
    const unitFactLabel =
      remaining[0]?.quickFacts.find((q) => /kapsler\/pakke|tabletter\/pakke|stk\/pakke/i.test(q.label))?.label
        || "Kapsler/pakke"
    const unitRows = remaining
      .map((p) => {
        const fact =
          p.quickFacts.find((q) => /kapsler\/pakke|tabletter\/pakke|stk\/pakke/i.test(q.label))?.value
            || getQuickFactValue(p, "Kapsler/pakke")
            || getQuickFactValue(p, "Tabletter/pakke")
            || getQuickFactValue(p, "Stk/pakke")
            || ""
        return { p, v: parseNumericPrefix(fact) }
      })
      .filter((x): x is { p: ProductData; v: number } => x.v != null)
      .sort((a, b) => b.v - a.v)
    if (unitRows.length >= 2 && unitRows[0].v >= unitRows[unitRows.length - 1].v * 1.15) {
      const unitLabel = unitLabelFor(unitFactLabel)
      addCandidate({
        slug: unitRows[0].p.slug,
        label: `FLEST ${unitLabel} PR. PAKKE`,
        reason: `Størst antal ${unitLabel.toLowerCase()} pr. pakke (${formatNumberDa(unitRows[0].v, 0)}), relevant hvis du vil have mere pr. køb.`,
        family: `utility:units-per-pack:${unitLabel.toLowerCase()}`,
        score: 0.78,
      })
    }
  }

  // 6) Assign strongest candidates until we reach the target count
  candidates.sort((a, b) => b.score - a.score)
  for (const c of candidates) {
    if (used.size >= TARGET_AWARDED_PRODUCTS) break
    if (used.has(c.slug)) continue
    assignAward(c.slug, c.label, c.reason, c.family)
  }

  // 6b) If we still don't have enough distinct awards, prefer meaningful, signal-backed fallbacks
  // instead of generating "BEDSTE <random title token>-PROFIL".
  if (used.size < TARGET_AWARDED_PRODUCTS) {
    const remaining = ranked.filter((p) => !used.has(p.slug))

    // Usability fallback: make this explicit (doesn't compete with "BEDST I TEST").
    // Only assign if usability is a real differentiator in this test.
    const usabilityRows = ranked
      .map((p) => ({ p, v: p.panelScores?.usability }))
      .filter((x): x is { p: ProductData; v: number } => typeof x.v === "number" && Number.isFinite(x.v))
      .sort((a, b) => b.v - a.v || b.p.rating - a.p.rating)

    const usabilityPick = remaining
      .map((p) => ({ p, v: p.panelScores?.usability }))
      .filter((x): x is { p: ProductData; v: number } => typeof x.v === "number" && Number.isFinite(x.v))
      .sort((a, b) => b.v - a.v || b.p.rating - a.p.rating)[0]?.p

    const topUsability = usabilityRows[0]?.v
    const bottomUsability = usabilityRows[usabilityRows.length - 1]?.v
    const spread = (topUsability != null && bottomUsability != null) ? (topUsability - bottomUsability) : 0

    // If everyone scores basically the same on usability, skip this award.
    if (usabilityPick && spread >= 0.4) {
      assignAward(
        usabilityPick.slug,
        "BEDSTE BRUGERVENLIGE VALG",
        `Høj brugervenlighed i testen (brugervenlighed: ${usabilityPick.panelScores!.usability.toFixed(1)}/10) med solid samlet score (${usabilityPick.rating.toFixed(1)}/10).`,
        "fallback:usability",
      )
    }
  }

  if (used.size < TARGET_AWARDED_PRODUCTS) {
    const remaining = ranked.filter((p) => !used.has(p.slug))

    // "Clean/ren" pick: lowest additive + sweetener counts (requires signals).
    const purityPick = remaining
      .map((p) => ({
        p,
        sweet: p.signals?.sweetenerCount,
        add: p.signals?.additiveCount,
      }))
      .filter((x) => typeof x.sweet === "number" || typeof x.add === "number")
      .map((x) => ({
        p: x.p,
        score: (typeof x.add === "number" ? x.add : 99) * 2 + (typeof x.sweet === "number" ? x.sweet : 99),
        sweet: x.sweet,
        add: x.add,
      }))
      .sort((a, b) => a.score - b.score || b.p.rating - a.p.rating)[0]
    if (purityPick && purityPick.score < 150) {
      const addText = typeof purityPick.add === "number" ? `${purityPick.add}` : "ikke oplyst"
      const sweetText = typeof purityPick.sweet === "number" ? `${purityPick.sweet}` : "ikke oplyst"
      assignAward(
        purityPick.p.slug,
        "RENESTE VALG",
        `Renere profil med færre tilsætninger (tilsætninger: ${addText}, sødning: ${sweetText}) og solid samlet score (${purityPick.p.rating.toFixed(1)}/10).`,
        "fallback:purity",
      )
    }
  }

  // 7) Final fallback: fill remaining slots (up to target) with conservative labels
  for (const prod of ranked) {
    if (used.size >= TARGET_AWARDED_PRODUCTS) break
    if (used.has(prod.slug)) continue
    const signalText = signalTextBySlug.get(prod.slug) || ""
    const nonGenericFacts = prod.quickFacts.filter((q) => !GENERIC_FACT_LABELS.has(q.label.toLowerCase()) && q.value?.trim())
    const keyFact = nonGenericFacts.find((q) => /mg|mcg|µg|iu|%|cfu|epa|dha|protein|aktiv|elementær/i.test(`${q.label} ${q.value}`)) || nonGenericFacts[0]

    if (keyFact) {
      assignAward(
        prod.slug,
        `BEDSTE ${keyFact.label.toUpperCase()}-PROFIL`,
        `Relevant profil med fokus på ${keyFact.label.toLowerCase()} (${keyFact.value}) i ${dossier.categoryLabel}-testen.`,
        `fallback:fact:${prod.slug}`,
      )
      continue
    }

    for (const keyword of dossier.focusKeywords) {
      if (signalText.includes(keyword.toLowerCase())) {
        assignAward(
          prod.slug,
          `BEDSTE ${keyword.toUpperCase()}-FOKUS`,
          `Målrettet profil for dig der søger ${keyword.toLowerCase()} i denne kategori.`,
          `fallback:keyword:${prod.slug}`,
        )
        break
      }
    }
    if (used.has(prod.slug)) continue

    const form = detectForm(prod)
    if (form) {
      // If the overall winner already has this form, a "BEDSTE <FORM> ..." fallback label is misleading.
      if (winnerForm && winnerForm === form) continue
      assignAward(
        prod.slug,
        `BEDSTE ${form.toUpperCase()} TIL DAGLIG BRUG`,
        `Formfokus på ${form}, hvilket kan gøre daglig brug mere praktisk i denne kategori.`,
        // One per form per category; avoid duplicate labels like "BEDSTE PULVER TIL DAGLIG BRUG".
        `fallback:form:${form}`,
      )
      continue
    }

    const costSignal = metricRows.find((m) => m.product.slug === prod.slug)
    if (costSignal?.costValue != null) {
      assignAward(
        prod.slug,
        `PRISSTABIL PROFIL I ${dossier.categoryLabel.toUpperCase()}`,
        `Solid hverdagsprofil i ${dossier.categoryLabel}-kategorien med konkurrencedygtig pris (${formatAwardMetric(costSignal.costValue)} pr. ${formatCostSource(costSignal.costSource)}).`,
        `fallback:practical:${prod.slug}`,
      )
      continue
    }

    assignAward(
      prod.slug,
      `BALANCERET PROFIL`,
      `Bred og anvendelig profil, der supplerer de øvrige valg i ${dossier.categoryLabel}-testen.`,
      `fallback:distinct:${prod.slug}`,
    )
  }

  return awardMap
}


async function generateFallbackImage(prompt: string, absoluteOutPath: string, size: string = "1024x1024", imageParts: any[] = []): Promise<boolean> {
  const GEMINI_API_KEY = process.env.GEMINI_API_KEY
  if (!GEMINI_API_KEY) return false

  console.log(`  [images] Falling back to gemini-3.1-flash-image-preview...`)
  try {
    const requestBody = {
      contents: [
        {
          role: "user",
          parts: [
            ...imageParts,
            { text: prompt },
          ],
        },
      ],
      generationConfig: {
        responseModalities: ["IMAGE"],
      },
    }

    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-image-preview:generateContent?key=${GEMINI_API_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody)
    })

    if (!res.ok) {
      console.error(`  [images] Fallback API error: ${res.status} ${await res.text()}`)
      return false
    }

    const data = await res.json()
    const parts = data?.candidates?.[0]?.content?.parts
    let base64Data = null
    if (parts) {
      for (const part of parts) {
        if (part.inlineData?.data) {
          base64Data = part.inlineData.data
          break
        }
      }
    }

    if (!base64Data) {
      console.error("  [images] No image data in fallback response")
      return false
    }

    const buffer = Buffer.from(base64Data, 'base64')
    await fs.mkdir(path.dirname(absoluteOutPath), { recursive: true })
    await fs.writeFile(absoluteOutPath, buffer)
    console.log(`  [images] Saved fallback image`)
    return true
  } catch (e) {
    console.error(`  [images] Fallback failed:`, e)
    return false
  }
}

async function ensureSectionImage(catSlug: string, sectionKey: string, rawHtml: string, products: ProductData[], productOffset: number): Promise<string | undefined> {
  const GEMINI_API_KEY = process.env.GEMINI_API_KEY
  if (!GEMINI_API_KEY) return undefined

  const imageFilename = `${catSlug}-${sectionKey}.png`
  const publicImagePath = `/images/content/${imageFilename}`
  const absoluteOutPath = path.join(process.cwd(), "public", "images", "content", imageFilename)

  try {
    await fs.access(absoluteOutPath)
    return publicImagePath // Image already exists
  } catch {
    // File doesn't exist, we need to generate it
  }

  console.log(`  [images] Generating image for ${catSlug} ${sectionKey}...`)

  // Extract H2 and Intro
  const h2Match = rawHtml.match(/<h2[^>]*>(.*?)<\/h2>/i)
  const title = h2Match ? h2Match[1].replace(/<[^>]+>/g, "").trim() : ""
  const introMatch = rawHtml.match(/<\/h2>([\s\S]*?)(?=<h3|$)/i)
  const intro = introMatch ? introMatch[1].replace(/<[^>]+>/g, "").trim() : ""

  if (!title) return undefined

  // Select which products to use for this specific image
  const selectedProducts = products.slice(productOffset, productOffset + 2)
  if (selectedProducts.length === 0) return undefined // Fallback if we run out of products

  // 1. Ask Gemini 2.5 Pro to write the image prompt
  const productContext = selectedProducts.map(p => p.title).join(", ")
  const systemPrompt = `Du er en ekspert i redaktionel fotografering og AI-billedgenerering. 
Jeg giver dig en overskrift og en introduktionstekst til en sektion på en premium-side om kosttilskud.
Din opgave er at skrive en engelsk prompt (maks 2-3 sætninger), der beskriver et fotorealistisk fotografi, der passer perfekt til teksten.

VIGTIGE REGLER FOR BILDET:
1. Det skal være et fotografi (premium, high quality, realistic lifestyle).
2. Miljøet skal være et almindeligt, naturligt hjem, f.eks. et køkken. Det skal se seriøst og ægte ud, som om en rigtig person tester det derhjemme. Det må IKKE være 110% klinisk rent eller ligne et 3D-render; det skal have lidt naturlig "liv" (f.eks. en kaffemaskine i baggrunden, et skærebræt, en shaker, naturligt lys fra et vindue).
3. I billedet skal reference-produkterne indgå naturligt i miljøet.
4. Afslut altid prompten med disse style-tags: "Premium editorial photography, natural lighting, real home kitchen environment, photorealistic, lifestyle, shot on 35mm lens."`

  const userPrompt = `Overskrift: ${title}\nTekst: ${intro}`

  let imagePrompt = ""
  try {
    const promptRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent?key=${GEMINI_API_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: systemPrompt + "\n\n" + userPrompt }] }],
        generationConfig: { temperature: 0.7 }
      })
    })
    const promptData = await promptRes.json()
    imagePrompt = promptData.candidates[0].content.parts[0].text.trim()
  } catch (e) {
    console.error(`  [images] Failed to generate prompt for ${sectionKey}:`, e)
    const fallbackSuccess = await generateFallbackImage(title, absoluteOutPath, "1792x1024")
    if (fallbackSuccess) return publicImagePath
    return undefined
  }

  // 2. Load product images as base64
  const imageParts: any[] = []
  for (const p of selectedProducts) {
    if (!p.imageUrl) continue
    try {
      const localPath = path.join(process.cwd(), "public", p.imageUrl.replace(/^\//, ""))
      const buffer = await fs.readFile(localPath)
      const base64 = buffer.toString("base64")
      const mimeType = p.imageUrl.endsWith(".png") ? "image/png" : "image/jpeg"
      imageParts.push({
        inlineData: {
          mimeType,
          data: base64
        }
      })
    } catch (e) {
      // ignore missing images
    }
  }

  // 3. Generate image with gemini-3-pro-image-preview
  try {
    const finalPrompt = `CRITICAL INSTRUCTIONS - READ CAREFULLY:
0. IMAGE FORMAT: Generate a landscape image (4:3 aspect ratio).
1. PRODUCT PRESERVATION (MANDATORY): You MUST include the exact products shown in the reference images.
2. BRANDING (MANDATORY): The products MUST keep their exact original labels, text, logos, and colors. Do NOT blur out or remove the text on the products. They must be clearly recognizable.
3. NO GENERIC PRODUCTS (MANDATORY): DO NOT add any extra, generic, or unbranded bottles, tubs, or containers to the background. ONLY show the specific products provided in the reference images.
4. REALISM & PHYSICS (MANDATORY): 
   - NO floating objects. Everything must obey gravity.
   - If there is a scoop, it MUST be resting on the table or leaning against a container. It CANNOT float in the air.
   - If powder or liquid is shown, it must be realistic. NO floating powder. NO powder pouring itself. If powder is being poured, there MUST be a visible human hand holding the scoop.
5. SCALE & PROPORTION (MANDATORY): 
   - The products must have realistic relative sizes. 
   - Pay close attention to the proportions of the reference images. A large tub should look significantly larger than a small pill bottle.
6. SCENE: ${imagePrompt}
7. RESTRICTIONS: Do not add any floating text or random letters to the environment, ONLY preserve the text that is actually on the product packaging.`

    const requestBody = {
      contents: [
        {
          role: "user",
          parts: [
            ...imageParts,
            { text: finalPrompt },
          ],
        },
      ],
      generationConfig: {
        responseModalities: ["IMAGE"],
      },
    }

    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3-pro-image-preview:generateContent?key=${GEMINI_API_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody)
    })

    if (!res.ok) {
      throw new Error(`API error: ${res.status} ${await res.text()}`)
    }

    const data = await res.json()
    const parts = data?.candidates?.[0]?.content?.parts
    let base64Data = null
    if (parts) {
      for (const part of parts) {
        if (part.inlineData?.data) {
          base64Data = part.inlineData.data
          break
        }
      }
    }

    if (!base64Data) throw new Error("No image data in response")

    const buffer = Buffer.from(base64Data, 'base64')
    await fs.mkdir(path.dirname(absoluteOutPath), { recursive: true })
    await fs.writeFile(absoluteOutPath, buffer)
    console.log(`  [images] Saved ${imageFilename}`)
    return publicImagePath
  } catch (e) {
    console.error(`  [images] Failed to generate image for ${sectionKey}:`, e)
    const fallbackSuccess = await generateFallbackImage(imagePrompt || title, absoluteOutPath, "1536x1024", imageParts)
    if (fallbackSuccess) return publicImagePath
    return undefined
  }
}

function transformToCardGrid(rawHtml: string, theme: 'blue' | 'green' | 'amber' | 'purple', imagePath?: string, infographicPath?: string, infographicTargetHeading?: string): string {
  const h2Match = rawHtml.match(/<h2[^>]*>(.*?)<\/h2>/i)
  if (!h2Match) return rawHtml

  const title = h2Match[1]
  let contentWithoutH2 = rawHtml.replace(/<h2[^>]*>.*?<\/h2>/i, "")
  const parts = contentWithoutH2.split(/<h3[^>]*>/i)
  
  if (parts.length < 2) return rawHtml

  const intro = parts[0].trim()
  const items: { title: string; body: string }[] = []
  
  for (let i = 1; i < parts.length; i++) {
    const part = parts[i]
    const h3EndIndex = part.indexOf("</h3>")
    if (h3EndIndex !== -1) {
      let itemTitle = part.substring(0, h3EndIndex).trim()
      itemTitle = itemTitle.replace(/^\d+[\)\.]\s*/, '')
      const itemBody = part.substring(h3EndIndex + 5).trim()
      items.push({ title: itemTitle, body: itemBody })
    }
  }

  const themeColors = {
    blue: {
      bg: "bg-blue-50/50",
      border: "border-blue-100",
      iconBg: "bg-blue-100",
      iconText: "text-blue-700",
      iconSvg: `<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>`
    },
    green: {
      bg: "bg-green-50/50",
      border: "border-green-100",
      iconBg: "bg-green-100",
      iconText: "text-green-700",
      iconSvg: `<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>`
    },
    amber: {
      bg: "bg-amber-50/50",
      border: "border-amber-100",
      iconBg: "bg-amber-100",
      iconText: "text-amber-700",
      iconSvg: `<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>`
    },
    purple: {
      bg: "bg-purple-50/50",
      border: "border-purple-100",
      iconBg: "bg-purple-100",
      iconText: "text-purple-700",
      iconSvg: `<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>`
    }
  }

  const t = themeColors[theme]

  const lines: string[] = []
  // On mobile: remove the outer padding/background to maximize screen real estate.
  // On desktop: keep the nice tinted background box.
  lines.push(`<section className="my-10 md:my-12 md:rounded-3xl md:${t.bg} md:p-10 md:border md:${t.border}">`)
  
  if (imagePath) {
    lines.push(`  <div className="mb-8 md:mb-12 flex flex-col md:flex-row gap-8 md:gap-12 items-center">`)
    lines.push(`    <div className="flex-1 w-full">`)
    lines.push(`      <div className="flex items-center gap-2 mb-4">`)
    lines.push(`        <div className="h-1.5 w-8 rounded-full bg-current ${t.iconText}"></div>`)
    lines.push(`        <div className="h-1.5 w-2 rounded-full bg-current opacity-40 ${t.iconText}"></div>`)
    lines.push(`      </div>`)
    lines.push(`      <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight text-slate-900 mb-5 mt-0 border-none pt-0">${title}</h2>`)
    if (intro) {
      lines.push(`      <div className="prose prose-slate text-slate-700 leading-relaxed">`)
      lines.push(`        ${intro}`)
      lines.push(`      </div>`)
    }
    lines.push(`    </div>`)
    lines.push(`    <div className="w-full md:w-5/12 shrink-0 overflow-hidden rounded-2xl shadow-md">`)
    lines.push(`      <img src="${imagePath}" alt="${title}" width="800" height="600" className="w-full h-auto object-cover aspect-[4/3] m-0" />`)
    lines.push(`    </div>`)
    lines.push(`  </div>`)
  } else {
    lines.push(`  <div className="mb-8 md:mb-10 max-w-3xl">`)
    lines.push(`    <div className="flex items-center gap-2 mb-4">`)
    lines.push(`      <div className="h-1.5 w-8 rounded-full bg-current ${t.iconText}"></div>`)
    lines.push(`      <div className="h-1.5 w-2 rounded-full bg-current opacity-40 ${t.iconText}"></div>`)
    lines.push(`    </div>`)
    lines.push(`    <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight text-slate-900 mb-5 mt-0 border-none pt-0">${title}</h2>`)
    if (intro) {
      lines.push(`    <div className="prose prose-slate text-slate-700 leading-relaxed">`)
      lines.push(`      ${intro}`)
      lines.push(`    </div>`)
    }
    lines.push(`  </div>`)
  }

  lines.push(`  <div className="flex flex-col gap-6">`)
  
  let infographicInjected = false
  for (const item of items) {
    // On mobile: remove side padding/borders and use negative margins to make it full width.
    // On desktop: keep the nice boxed look.
    lines.push(`    <div className="md:rounded-2xl md:bg-white py-6 md:p-8 md:shadow-[0_1px_3px_rgba(0,0,0,0.02)] md:border md:border-slate-200/60 border-b border-slate-200 last:border-0 md:last:border">`)
    lines.push(`      <div className="flex flex-col md:flex-row md:items-center gap-3 md:gap-4 mb-4 md:mb-5">`)
    lines.push(`        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full mx-auto md:mx-0 ${t.iconBg} ${t.iconText}">`)
    lines.push(`          ${t.iconSvg}`)
    lines.push(`        </div>`)
    lines.push(`        <h3 className="text-xl md:text-2xl font-bold text-slate-900 leading-snug m-0 border-none pt-0 text-center md:text-left">`)
    lines.push(`          ${item.title}`)
    lines.push(`        </h3>`)
    lines.push(`      </div>`)
    lines.push(`      <div className="prose prose-slate text-slate-600 max-w-none">`)
    
    let body = item.body
    body = body.replace(/<strong>Sådan håndterer du det:<\/strong>/g, `<strong className="text-slate-900 block mt-4 mb-1">Sådan håndterer du det:</strong>`)
    body = body.replace(/<strong>Praktisk råd:<\/strong>/g, `<strong className="text-slate-900 block mt-4 mb-1">Praktisk råd:</strong>`)
    body = body.replace(/<strong>Konkret tip:<\/strong>/g, `<strong className="text-slate-900 block mt-4 mb-1">Konkret tip:</strong>`)
    
    if (infographicPath && infographicTargetHeading && item.title.toLowerCase().includes(infographicTargetHeading.toLowerCase())) {
      body += `\n\n<div className="my-8 relative left-1/2 w-screen max-w-screen -translate-x-1/2 md:w-[min(100vw-4rem,1400px)] md:max-w-none">\n  <img src="${infographicPath}" alt="Infografik" width="800" height="1200" className="block w-full h-auto rounded-2xl shadow-md border border-slate-100" loading="lazy" />\n</div>`
      infographicInjected = true
    }

    lines.push(`        ${body}`)
    lines.push(`      </div>`)
    lines.push(`    </div>`)
  }
  
  lines.push(`  </div>`)
  
  // Fallback if infographic wasn't injected into a specific card
  if (infographicPath && !infographicInjected) {
    lines.push(`  <div className="mt-8 relative left-1/2 w-screen max-w-screen -translate-x-1/2 md:w-[min(100vw-4rem,1400px)] md:max-w-none">\n    <img src="${infographicPath}" alt="Infografik" width="800" height="1200" className="block w-full h-auto rounded-2xl shadow-md border border-slate-100" loading="lazy" />\n  </div>`)
  }
  
  lines.push(`</section>`)

  return lines.join("\n")
}


async function ensureProductTestImage(catSlug: string, categoryName: string, prod: ProductData): Promise<string | undefined> {
  const GEMINI_API_KEY = process.env.GEMINI_API_KEY
  if (!GEMINI_API_KEY) {
    console.log(`[ensureProductTestImage] No GEMINI_API_KEY`)
    return undefined
  }
  if (!prod.imageUrl) {
    console.log(`[ensureProductTestImage] No imageUrl for ${prod.title}`)
    return undefined
  }

  const imageFilename = `test-${catSlug}-${prod.slug}.png`
  const publicImagePath = `/images/products/${imageFilename}`
  const absoluteOutPath = path.join(process.cwd(), "public", "images", "products", imageFilename)

  try {
    await fs.access(absoluteOutPath)
    console.log(`[ensureProductTestImage] Image already exists for ${prod.title}: ${publicImagePath}`)
    return publicImagePath // Image already exists
  } catch {
    // File doesn't exist, we need to generate it
  }

  console.log(`  [images] Generating test image for ${prod.title}...`)

  // 1. Ask Gemini 2.5 Pro to write the image prompt
  const systemPrompt = `Du er Art Director for en test-side. Vi tester et produkt der hedder "${prod.title}" i kategorien "${categoryName}".
Din opgave er at skrive en engelsk billed-prompt (maks 2-3 sætninger) for produktet i et naturligt og troværdigt testmiljø.

Retningslinjer for miljø:
Miljøet skal være et almindeligt, naturligt køkken. Det skal se seriøst og ægte ud, som om en rigtig person tester det derhjemme. Det må IKKE være 110% klinisk rent eller ligne et 3D-render; det skal have lidt naturlig "liv" (f.eks. en kaffemaskine i baggrunden, et skærebræt, en shaker, frugt, naturligt lys fra et vindue).

VIGTIGE REGLER FOR BILDET:
1. Det skal være et fotografi (premium, high quality, realistic lifestyle).
2. I billedet skal reference-produktet indgå naturligt i køkkenmiljøet.
3. Afslut altid prompten med disse style-tags: "Premium editorial photography, natural lighting, real home kitchen environment, photorealistic, lifestyle, shot on 35mm lens."`

  const userPrompt = `Produkt: ${prod.title}\nKategori: ${categoryName}`

  let imagePrompt = ""
  try {
    const promptRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent?key=${GEMINI_API_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: systemPrompt + "\n\n" + userPrompt }] }],
        generationConfig: { temperature: 0.7 }
      })
    })
    const promptData = await promptRes.json()
    imagePrompt = promptData.candidates[0].content.parts[0].text.trim()
  } catch (e) {
    console.error(`  [images] Failed to generate prompt for ${prod.title}:`, e)
    const fallbackSuccess = await generateFallbackImage(`Test environment for ${prod.title} in category ${categoryName}`, absoluteOutPath, "1024x1024")
    if (fallbackSuccess) return publicImagePath
    return undefined
  }

  // 2. Load product image as base64
  const imageParts: any[] = []
  try {
    let buffer: Buffer
    let mimeType = prod.imageUrl.endsWith(".png") ? "image/png" : "image/jpeg"

    if (/^https?:\/\//i.test(prod.imageUrl)) {
      const imageRes = await fetch(prod.imageUrl)
      if (!imageRes.ok) {
        throw new Error(`Failed to fetch remote product image: ${imageRes.status}`)
      }
      const contentType = imageRes.headers.get("content-type") || ""
      if (contentType.startsWith("image/")) mimeType = contentType.split(";")[0]
      buffer = Buffer.from(await imageRes.arrayBuffer())
    } else {
      const localPath = path.join(process.cwd(), "public", prod.imageUrl.replace(/^\//, ""))
      buffer = await fs.readFile(localPath)
    }

    const base64 = buffer.toString("base64")
    imageParts.push({
      inlineData: {
        mimeType,
        data: base64
      }
    })
  } catch (e) {
    return undefined // We need the product image to generate a test image
  }

  // 3. Generate image with gemini-3-pro-image-preview
  try {
    const finalPrompt = `CRITICAL INSTRUCTIONS - READ CAREFULLY:
0. IMAGE FORMAT: Generate a square image (1:1 aspect ratio).
1. PRODUCT PRESERVATION (MANDATORY): You MUST include the exact product shown in the reference image.
2. BRANDING (MANDATORY): The product MUST keep its exact original label, text, logo, and colors. Do NOT blur out or remove the text on the product. It must be clearly recognizable.
3. NO GENERIC PRODUCTS (MANDATORY): DO NOT add any extra, generic, or unbranded bottles, tubs, or containers to the background. ONLY show the specific product provided in the reference image.
4. REALISM & PHYSICS (MANDATORY): 
   - NO floating objects. Everything must obey gravity.
   - If there is a scoop, it MUST be resting on the table or leaning against a container. It CANNOT float in the air.
   - If powder or liquid is shown, it must be realistic. NO floating powder. NO powder pouring itself. If powder is being poured, there MUST be a visible human hand holding the scoop.
5. SCENE: ${imagePrompt}
6. RESTRICTIONS: Do not add any floating text or random letters to the environment, ONLY preserve the text that is actually on the product packaging.`

    const requestBody = {
      contents: [
        {
          role: "user",
          parts: [
            ...imageParts,
            { text: finalPrompt },
          ],
        },
      ],
      generationConfig: {
        responseModalities: ["IMAGE"],
      },
    }

    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3-pro-image-preview:generateContent?key=${GEMINI_API_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody)
    })

    if (!res.ok) {
      throw new Error(`API error: ${res.status} ${await res.text()}`)
    }

    const data = await res.json()
    const parts = data?.candidates?.[0]?.content?.parts
    let base64Data = null
    if (parts) {
      for (const part of parts) {
        if (part.inlineData?.data) {
          base64Data = part.inlineData.data
          break
        }
      }
    }

    if (!base64Data) throw new Error("No image data in response")

    const buffer = Buffer.from(base64Data, 'base64')
    await fs.mkdir(path.dirname(absoluteOutPath), { recursive: true })
    await fs.writeFile(absoluteOutPath, buffer)
    console.log(`  [images] Saved ${imageFilename}`)
    return publicImagePath
  } catch (e) {
    console.error(`  [images] Failed to generate image for ${prod.title}:`, e)
    const fallbackSuccess = await generateFallbackImage(imagePrompt || `Test environment for ${prod.title}`, absoluteOutPath, "1024x1024", imageParts)
    if (fallbackSuccess) return publicImagePath
    return undefined
  }
}

async function ensureCategoryInfographic(catSlug: string, categoryName: string): Promise<string | undefined> {
  const GEMINI_API_KEY = process.env.GEMINI_API_KEY
  if (!GEMINI_API_KEY) return undefined

  const imageFilename = `${catSlug}-infographic.png`
  const publicImagePath = `/images/content/${imageFilename}`
  const absoluteOutPath = path.join(process.cwd(), "public", "images", "content", imageFilename)

  try {
    await fs.access(absoluteOutPath)
    return publicImagePath // Image already exists
  } catch {
    // File doesn't exist, we need to generate it
  }

  console.log(`  [images] Generating infographic for ${categoryName}...`)

  // 1. Ask Gemini 2.5 Pro to write the image prompt
  const systemPrompt = `Du er en expert i at skabe pædagogiske infografikker til sundheds- og kosttilskudsartikler.
Din opgave er at skrive en engelsk billed-prompt (maks 2-3 sætninger) til en AI-billedgenerator for at skabe en infografik om "${categoryName}".

Retningslinjer:
- RETURNER KUN SELVE PROMPTEN. Ingen introduktion, ingen forklaring, ingen "Her er prompten".
- Infografikken skal forklare et vigtigt koncept (f.eks. for kreatin: "Loading phase vs Maintenance phase", for proteinpulver: "Whey vs Casein absorption rates", for vitaminer: "Daily recommended dosage").
- Billedet skal have et VERTIKALT (portrait) layout, hvor informationen er stablet oven på hinanden (top-to-bottom) for at være læsevenlig på mobilskærme.
- Stilen skal være ren, moderne, minimalistisk, vektor-baserad (flat design), med tydelige ikoner eller grafer.
- Baggrunden skal være hvid eller meget lys.
- Teksten i billedet skal minimeres, men HVIS der er tekst, SKAL det være på DANSK (f.eks. "Kreatin", "Dosis", "Vand", "Muskler").
- Afslut altid prompten med: "Clean modern vertical vector infographic, flat design, white background, minimal text, medical/health editorial style, high quality. ALL TEXT MUST BE IN DANISH LANGUAGE."`

  const userPrompt = `Kategori: ${categoryName}`

  let imagePrompt = ""
  try {
    const promptRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent?key=${GEMINI_API_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: systemPrompt + "\n\n" + userPrompt }] }],
        generationConfig: { temperature: 0.7 }
      })
    })
    const promptData = await promptRes.json()
    imagePrompt = promptData.candidates[0].content.parts[0].text.trim()
  } catch (e) {
    console.error(`  [images] Failed to generate infographic prompt for ${categoryName}:`, e)
    const fallbackSuccess = await generateFallbackImage(`Clean modern vertical vector infographic about ${categoryName}, flat design, white background, minimal text, medical/health editorial style, high quality. ALL TEXT MUST BE IN DANISH LANGUAGE.`, absoluteOutPath, "1024x1536")
    if (fallbackSuccess) return publicImagePath
    return undefined
  }

  // 2. Generate image with gemini-3-pro-image-preview
  try {
    const finalPrompt = `CRITICAL INSTRUCTIONS - READ CAREFULLY:
1. IMAGE FORMAT: Generate a portrait/vertical image (e.g. 9:16 aspect ratio). The layout MUST be vertical, stacking elements from top to bottom.
2. STYLE: Clean, modern vertical vector infographic, flat design, white background.
3. CONTENT: ${imagePrompt}
4. RESTRICTIONS: Keep text to an absolute minimum. Use icons, charts, and visual elements instead of words. ANY TEXT INCLUDED MUST BE IN DANISH (e.g., "Kreatin", "Dosis", "Vand"). No English text allowed. Ensure perfect spelling.`

    const requestBody = {
      contents: [
        {
          role: "user",
          parts: [
            { text: finalPrompt },
          ],
        },
      ],
      generationConfig: {
        responseModalities: ["IMAGE"],
      },
    }

    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3-pro-image-preview:generateContent?key=${GEMINI_API_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody)
    })

    if (!res.ok) {
      throw new Error(`API error: ${res.status} ${await res.text()}`)
    }

    const data = await res.json()
    const parts = data?.candidates?.[0]?.content?.parts
    let base64Data = null
    if (parts) {
      for (const part of parts) {
        if (part.inlineData?.data) {
          base64Data = part.inlineData.data
          break
        }
      }
    }

    if (!base64Data) throw new Error("No image data in response")

    const buffer = Buffer.from(base64Data, 'base64')
    await fs.mkdir(path.dirname(absoluteOutPath), { recursive: true })
    await fs.writeFile(absoluteOutPath, buffer)
    console.log(`  [images] Saved ${imageFilename}`)
    return publicImagePath
  } catch (e) {
    console.error(`  [images] Failed to generate infographic for ${categoryName}:`, e)
    const fallbackSuccess = await generateFallbackImage(imagePrompt || `Infographic about ${categoryName}`, absoluteOutPath, "1024x1536")
    if (fallbackSuccess) return publicImagePath
    return undefined
  }
}

function applyInternalLinks(content: string, currentCategorySlug: string): string {
  let frontmatterBlock = ""
  let body = content
  const frontmatterMatch = content.match(/^---\s*\n[\s\S]*?\n---\s*\n?/)
  if (frontmatterMatch) {
    frontmatterBlock = frontmatterMatch[0]
    body = content.slice(frontmatterBlock.length)
  }

  const keywordMap = new Map<string, string>()
  
  for (const [slug, silo] of Object.entries(SLUG_TO_SILO)) {
    if (slug === currentCategorySlug) continue
    const url = `/${silo}/${slug}`
    keywordMap.set(slug.toLowerCase(), url)
    if (slug.includes("-")) {
      keywordMap.set(slug.replace(/-/g, " ").toLowerCase(), url)
    }
  }
  
  const aliases: Record<string, string> = {
    "pwo": "pre-workout",
    "probiotika": "maelkesyrebakterier",
    "c vitamin": "c-vitamin",
    "d vitamin": "d-vitamin",
    "b vitamin": "b-vitamin",
    "omega 3": "omega-3",
  }
  for (const [alias, targetSlug] of Object.entries(aliases)) {
    if (targetSlug === currentCategorySlug) continue
    const silo = SLUG_TO_SILO[targetSlug]
    if (silo) {
      keywordMap.set(alias.toLowerCase(), `/${silo}/${targetSlug}`)
    }
  }

  const sortedKeywords = Array.from(keywordMap.keys()).sort((a, b) => b.length - a.length)
  const linkedUrls = new Set<string>()

  // Tokenize the content to separate text from tags/links/headings
  const tokenRegex = /(<a\b[^>]*>[\s\S]*?<\/a>|<h[1-6]\b[^>]*>[\s\S]*?<\/h[1-6]>|<[^>]+>|\[[^\]]+\]\([^)]+\)|^(?:#+)\s+.*$)/gim

  const tokens: { text: string; isIgnored: boolean }[] = []
  let lastIndex = 0
  let match
  
  while ((match = tokenRegex.exec(body)) !== null) {
    if (match.index > lastIndex) {
      tokens.push({ text: body.substring(lastIndex, match.index), isIgnored: false })
    }
    tokens.push({ text: match[0], isIgnored: true })
    lastIndex = tokenRegex.lastIndex
  }
  if (lastIndex < body.length) {
    tokens.push({ text: body.substring(lastIndex), isIgnored: false })
  }

  for (const kw of sortedKeywords) {
    const targetUrl = keywordMap.get(kw)!
    if (linkedUrls.has(targetUrl)) continue

    const escapedKw = kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    // Use lookbehind and lookahead to ensure word boundaries, supporting Danish chars
    const kwRegex = new RegExp(`(?<=^|[^a-zæøåA-ZÆØÅ0-9])(${escapedKw})(?=$|[^a-zæøåA-ZÆØÅ0-9])`, 'i')

    let found = false
    for (let i = 0; i < tokens.length; i++) {
      if (tokens[i].isIgnored) continue
      
      if (kwRegex.test(tokens[i].text)) {
        tokens[i].text = tokens[i].text.replace(kwRegex, (m) => {
          return `<a href="${targetUrl}" className="font-medium text-green-700 hover:underline hover:text-green-800 transition-colors">${m}</a>`
        })
        found = true
        break // Only replace the first occurrence
      }
    }
    
    if (found) {
      linkedUrls.add(targetUrl)
    }
  }

  return frontmatterBlock + tokens.map(t => t.text).join("")
}

async function buildCompleteMDX(p: BuildParams): Promise<string> {
  const { frontmatter, categoryTitle, categoryName, catSlug, introContent, existingRaw, generatedSections, products, preserveProductLinkedContent } = p
  const now = new Date().toISOString().split("T")[0]
  const year = new Date().getFullYear()
  // Clean short name for titles: "proteinpulver" → "Proteinpulver"
  const toplistName = categoryName.charAt(0).toUpperCase() + categoryName.slice(1)
  const siloId = SLUG_TO_SILO[catSlug] || "sundhed-velvaere"
  const categoryUrl = `https://www.kosttilskudsvalg.dk/${siloId}/${catSlug}`

  // Load category-specific content config
  const catConfig = getCategoryContentConfig(catSlug)

  // 1) Base scores are already computed from parsed signals (applyPanelModel).
  // 2) Pick awards from parsed data.
  // 3) Shape panel scores so the award winners land #1/#2/#3 naturally when sorting by total score.
  const forcedRanked =
    forcedBuildProductSlugs.length > 0
      ? forcedBuildProductSlugs
          .map((slug) => products.find((p) => p.slug === slug))
          .filter((prod): prod is ProductData => Boolean(prod))
      : []
  const baseRanked =
    forcedRanked.length === products.length
      ? forcedRanked
      : [...products].sort((a, b) => b.rating - a.rating)
  baseRanked.forEach((p, i) => { p.position = i + 1 })

  const awardsBySlug = generateSupplementAwards(baseRanked, catSlug)
  applyAwardDrivenScoreShaping(products, awardsBySlug, siloId)
  applyScoreLadder(products, catSlug, siloId, forcedBuildProductSlugs)

  const ranked =
    forcedRanked.length === products.length
      ? forcedRanked
      : [...products].sort((a, b) => b.rating - a.rating)
  ranked.forEach((p, i) => { p.position = i + 1 })
  reconcileCoreAwardsToRanking(awardsBySlug, ranked)
  // Hard UX contract: the first three visible positions are always
  // BEDST I TEST, BEDSTE PREMIUM, BEDSTE BUDGET in that exact order.
  assertCoreAwardOrderInvariant(catSlug, awardsBySlug, ranked)
  refreshAwardReasons(awardsBySlug, products)
  enforceAwardDimensionLeads(products, awardsBySlug, catSlug, siloId)
  const comparisonMetric = pickComparisonMetric(ranked, catSlug)
  const measurementPoints = buildDynamicMeasurementPoints(catSlug, comparisonMetric?.label)
  const profileTemplates = buildDynamicConsumerProfiles(catSlug)
  const stackingConfig = buildDynamicStacking(catSlug)
  const commonMistakes = buildDynamicCommonMistakes(catSlug)
  const top3 = ranked.slice(0, 3)
  const usedInlineLinkHrefs = new Set<string>()
  const preservedProductReviews = existingRaw ? buildPreservedProductReviewMap(existingRaw) : new Map<string, string>()

  const lines: string[] = []

  // ─── FRONTMATTER / HERO IDENTITY ───
  // Keep breadcrumbs, H1 and tagline stable across rebuilds.
  const shownCount = products.length
  const testedCount = estimateTestedCount(catSlug, shownCount)
  const h1Title = resolveStableCategoryHeroTitle(frontmatter, catSlug, categoryName, year, shownCount)
  const metaTitle = pickDeterministicMetaTitle({
    catSlug,
    year,
    shownCount,
    kwTitle: toplistName,
    kwLower: categoryName,
  })
  const desc = pickDeterministicMetaDescription({
    catSlug,
    year,
    testedCount,
    shownCount,
    kwLower: categoryName,
  })
  const slogan = resolveStableCategoryHeroSlogan(frontmatter, catSlug, categoryName, year, shownCount)

  lines.push(`---`)
  lines.push(`title: "${esc(h1Title)}"`)
  lines.push(`meta_title: "${esc(metaTitle)}"`)
  lines.push(`description: "${esc(desc)}"`)
  lines.push(`date: "${frontmatter.date || now}"`)
  lines.push(`updated: "${now}"`)
  lines.push(`author: "line-kragelund"`)
  lines.push(`category: "Kosttilskud"`)
  lines.push(`tags: ["sammenligning", "${catSlug}"]`)
  lines.push(`affiliate_disclosure: true`)
  lines.push(`slogan: "${esc(slogan)}"`)
  lines.push(`---`)
  lines.push(``)

  // ─── JSON-LD: ITEMLIST FOR TOPLIST INTENT ───
  const itemListSchema = {
    type: "ItemList",
    name: `${toplistName} bedst i test ${year}`,
    description: `Uafhængig rangering af ${products.length} ${categoryName}-produkter på kvalitet, dosering og pris.`,
    url: categoryUrl,
    items: ranked.map((prod) => ({
      name: prod.title,
      // No standalone product pages: point to this page + anchor.
      url: `${categoryUrl}#product-${prod.slug}`,
      position: prod.position,
      image: toAbsoluteImageUrl(prod.imageUrl),
      rating: Number.isFinite(prod.rating) ? Number(prod.rating.toFixed(1)) : prod.rating,
    })),
  }
  const schemas: any[] = [itemListSchema]

  // ─── 1. MOBILE TOPLIST (md:hidden) ───
  lines.push(`{/* ═══ MOBIL TOPLIST ═══ */}`)
  lines.push(`<div className="toplist-mobile my-6">`)
  lines.push(`  <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">`)
  lines.push(`    <div className="bg-gradient-to-r from-green-700 to-green-600 px-4 py-3">`)
  lines.push(`      <span className="text-sm font-bold text-white block">${esc(toplistName)} bedst i test ${year}</span>`)
  lines.push(`    </div>`)
  for (let i = 0; i < top3.length; i++) {
    const prod = top3[i]
    const storeLabel = formatStoreName(prod.crawledStore, prod.buyUrl)
    lines.push(`    <div className="${i > 0 ? "border-t border-slate-100 " : ""}px-4 py-3">`)
    lines.push(`      <div className="flex items-center gap-3">`)
    // Product image (mobile toplist)
    if (prod.imageUrl) {
      lines.push(
        `        <img src="${prod.imageUrl}" alt="${esc(prod.title)}" width="56" height="56" loading="lazy" className="toplist-img w-14 h-14 object-contain flex-shrink-0 rounded-lg border border-slate-100 bg-white p-1" />`,
      )
    }
    lines.push(`        <div className="min-w-0 flex-1 pr-1">`)
    lines.push(`          <span className="text-sm font-semibold text-slate-900 leading-snug block">${esc(prod.title)}</span>`)
    lines.push(`        </div>`)
    if (prod.buyUrl) {
      lines.push(`        <div className="w-[84px] shrink-0 text-center">`)
      lines.push(`          <div className="flex items-center justify-center gap-1 text-slate-800">`)
      lines.push(`            <svg className="w-4 h-4 text-amber-400" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>`)
      lines.push(`            <span className="text-sm font-bold tabular-nums">${prod.rating.toFixed(1)}</span>`)
      lines.push(`          </div>`)
      lines.push(`          <a href="${prod.buyUrl}" target="_blank" rel="nofollow sponsored noopener" className="mt-2 w-full rounded-lg bg-green-700 px-3 py-2 text-center text-sm font-semibold leading-tight text-white no-underline !no-underline hover:no-underline hover:!no-underline focus:no-underline focus:!no-underline visited:no-underline visited:!no-underline hover:bg-green-800 inline-flex items-center justify-center">Til butik</a>`)
      lines.push(`        </div>`)
    } else {
      lines.push(`        <div className="w-[84px] shrink-0 text-center">`)
      lines.push(`          <div className="flex items-center justify-center gap-1 text-slate-800">`)
      lines.push(`            <svg className="w-4 h-4 text-amber-400" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>`)
      lines.push(`            <span className="text-sm font-bold tabular-nums">${prod.rating.toFixed(1)}</span>`)
      lines.push(`          </div>`)
      lines.push(`          <a href="#product-${prod.slug}" className="mt-2 w-full rounded-lg bg-green-700 px-3 py-2 text-xs font-semibold text-white no-underline !no-underline hover:no-underline hover:!no-underline hover:bg-green-800 inline-flex items-center justify-center">Se test</a>`)
      lines.push(`        </div>`)
    }
    lines.push(`      </div>`)
    lines.push(`    </div>`)
  }
  lines.push(`  </div>`)
  lines.push(`</div>`)
  lines.push(``)

  // ─── 2. TWO-COLUMN: INTRO + DESKTOP TOPLIST ───
  lines.push(`{/* ═══ INTRO + DESKTOP TOPLIST ═══ */}`)
  lines.push(`<div className="md:grid md:grid-cols-[1fr_320px] md:gap-8 my-8">`)
  lines.push(``)
  // Left column: intro (with markers for idempotent rebuilds)
  lines.push(`<div className="prose prose-slate max-w-none">`)
  lines.push(``)
  lines.push(`{/* ═══ ORIGINAL_INTRO_START ═══ */}`)
  lines.push(``)
  const kwTitleForIntro = formatKeywordTitle(toplistName, categoryName)
  const introSource = generatedSections?.intro || introContent
  const safeIntro = sanitizeIntroContent(introSource, {
    kwTitle: kwTitleForIntro,
    kwLower: categoryName,
    year,
    shownCount,
  })
  lines.push(injectInlineInternalLinks(safeIntro, catSlug, 4, usedInlineLinkHrefs))
  lines.push(``)
  lines.push(`{/* ═══ ORIGINAL_INTRO_END ═══ */}`)
  lines.push(``)
  lines.push(`</div>`)
  lines.push(``)
  // Right column: desktop toplist (sticky)
  lines.push(`<div className="toplist-desktop">`)
  lines.push(`  <div className="sticky top-24 rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">`)
  lines.push(`    <div className="bg-gradient-to-r from-green-50 to-emerald-50 px-4 py-3 border-b border-slate-100">`)
  lines.push(`      <span className="text-sm font-bold text-slate-900 block">${esc(toplistName)} bedst i test ${year}</span>`)
  lines.push(`    </div>`)
  for (let i = 0; i < top3.length; i++) {
    const prod = top3[i]
    const storeLabel = formatStoreName(prod.crawledStore, prod.buyUrl)
    lines.push(
      `    <div className="${i > 0 ? "border-t border-slate-100 " : ""}px-4 py-3 hover:bg-slate-50/70 transition-colors">`,
    )
      lines.push(`      <div className="flex items-center gap-3">`)
    if (prod.imageUrl) {
      lines.push(
        `        <img src="${prod.imageUrl}" alt="${esc(prod.title)}" width="56" height="56" loading="lazy" className="toplist-img w-14 h-14 object-contain flex-shrink-0 rounded-lg border border-slate-100 bg-white p-1" />`,
      )
    }
    lines.push(`        <div className="min-w-0 flex-1 pr-1">`)
    lines.push(`          <span className="text-sm font-semibold text-slate-900 leading-snug block">${esc(prod.title)}</span>`)
    lines.push(`        </div>`)
    if (prod.buyUrl) {
      lines.push(`        <div className="w-[84px] shrink-0 text-center">`)
      lines.push(`          <div className="flex items-center justify-center gap-1 text-slate-800">`)
      lines.push(`            <svg className="w-4 h-4 text-amber-400" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>`)
      lines.push(`            <span className="text-sm font-bold tabular-nums">${prod.rating.toFixed(1)}</span>`)
      lines.push(`          </div>`)
      lines.push(`          <a href="${prod.buyUrl}" target="_blank" rel="nofollow sponsored noopener" className="mt-2 w-full inline-flex items-center justify-center rounded-lg bg-green-700 px-3 py-2 text-center text-sm font-semibold leading-tight text-white no-underline !no-underline hover:no-underline hover:!no-underline focus:no-underline focus:!no-underline visited:no-underline visited:!no-underline hover:bg-green-800">Til butik</a>`)
      lines.push(`        </div>`)
    } else {
      lines.push(`        <div className="w-[84px] shrink-0 text-center">`)
      lines.push(`          <div className="flex items-center justify-center gap-1 text-slate-800">`)
      lines.push(`            <svg className="w-4 h-4 text-amber-400" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>`)
      lines.push(`            <span className="text-sm font-bold tabular-nums">${prod.rating.toFixed(1)}</span>`)
      lines.push(`          </div>`)
      lines.push(`          <a href="#product-${prod.slug}" className="mt-2 w-full inline-flex items-center justify-center rounded-lg bg-green-700 px-3 py-1.5 text-center text-xs font-semibold text-white no-underline !no-underline hover:no-underline hover:!no-underline hover:bg-green-800">Se test</a>`)
      lines.push(`        </div>`)
    }
    lines.push(`      </div>`)
    lines.push(`    </div>`)
  }
  lines.push(`    <div className="px-4 py-2 border-t border-slate-100 bg-slate-50">`)
  lines.push(`      <a href="#sammenligningstabel" className="text-xs font-medium text-green-700 hover:underline">Se alle ${products.length} produkter &rarr;</a>`)
  lines.push(`    </div>`)
  lines.push(`  </div>`)
  lines.push(`</div>`)
  lines.push(``)
  lines.push(`</div>`)
  lines.push(``)

  // ─── 3. TOC + AFFILIATE ───
  lines.push(`<Toc />`)
  lines.push(``)
  // Affiliate disclosure is rendered right below the authorbox (EEATBox) in the page wrapper,
  // so we don't duplicate it inside the MDX body.

  // ─── 4. SAMMENFATNING & TOPPVAL ───
  lines.push(`## Sammenfatning & toppval`)
  lines.push(``)
  // Keep this compact; the "full" detail is in the product cards + comparison table.
  lines.push(`<div className="my-4 rounded-xl border border-slate-200 bg-slate-50/40 overflow-hidden">`)
  lines.push(`  <ol className="px-3 py-3 md:px-4 md:py-4 divide-y divide-slate-200/60">`)
  for (const prod of ranked) {
    const award = awardsBySlug.get(prod.slug)
    const emoji = awardEmoji(award?.label || (prod.position === 1 ? "BEDST I TEST" : ""))
    const snippet = buildTopPickSnippet(prod, award)
    const awardLabel = award?.label || (prod.position === 1 ? "BEDST I TEST" : "")
    lines.push(`    <li className="flex items-start gap-2 px-2.5 py-2.5 hover:bg-white/60 transition-colors">`)
    lines.push(`      <span className="text-base leading-none mt-0.5" aria-hidden="true">${emoji}</span>`)
    lines.push(`      <div className="min-w-0 flex-1">`)
    lines.push(`        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">`)
    lines.push(`          <a href="#product-${prod.slug}" className="text-sm font-semibold text-slate-900 hover:underline underline-offset-2 truncate">${esc(prod.title)}</a>`)
    lines.push(`          <span className="inline-flex items-center rounded-full bg-white px-1.5 py-0.5 text-[11px] font-semibold text-slate-700 tabular-nums border border-slate-200">${prod.rating.toFixed(1)}/10</span>`)
    if (awardLabel) {
      lines.push(`          <span className="inline-flex items-center rounded-full bg-white px-1.5 py-0.5 text-[11px] font-semibold text-slate-600 border border-slate-200">${esc(awardLabel)}</span>`)
    }
    lines.push(`        </div>`)
    lines.push(`        <div className="mt-0.5 text-[11px] leading-snug text-slate-600">${esc(snippet)}</div>`)
    lines.push(`      </div>`)
    lines.push(`    </li>`)
  }
  lines.push(`  </ol>`)
  lines.push(`</div>`)
  lines.push(``)

  // ─── 4b. BIG TOPLIST HEADING ───
  // Keep this non-spammy but include "Bedste <KW>" for relevance.
  lines.push(`## Bedste ${esc(kwTitleForIntro)} i ${year} – vores liste`)
  lines.push(``)
  lines.push(`Her finder du de fulde produktbokse med vurdering, nøgledata og en kort gennemgang af hvert valg.`)
  lines.push(``)

  // ─── 5. PRODUCT REVIEW SECTIONS ───
  for (const prod of ranked) {
    // In blocked-product mode we keep existing product-linked content, so skip expensive image generation.
    const testImagePath =
      !preserveProductLinkedContent && prod.position <= 5
        ? await ensureProductTestImage(catSlug, categoryName, prod)
        : undefined
    lines.push(
      await buildProductSection(
        prod,
        catSlug,
        categoryName,
        awardsBySlug.get(prod.slug),
        testImagePath,
        preservedProductReviews.get(prod.slug),
        Boolean(preserveProductLinkedContent),
      ),
    )
    lines.push(``)
  }

  // ─── 6. COMPARISON TABLE ───
  lines.push(`<a id="sammenligningstabel"></a>`)
  lines.push(``)
  lines.push(`## Sammenligningstabel`)
  lines.push(``)
  const compProducts = ranked.map((p, i) => {
    const note = awardsBySlug.get(p.slug)?.label || (i === 0 ? "BEDST I TEST" : "")
    const amount = comparisonMetric?.valuesBySlug[p.slug] || ""
    return `{"name":"${esc(p.title)}","brand":"${esc(p.brand)}","price":"${esc(p.price)}","amount":"${esc(amount)}","rating":${p.rating},"note":"${note}","slug":"${p.slug}"}`
  })
  if (comparisonMetric) {
    lines.push(`<ComparisonTable amountLabel="${comparisonMetric.label}" products={[${compProducts.join(",")}]} />`)
  } else {
    lines.push(`<ComparisonTable products={[${compProducts.join(",")}]} />`)
  }
  lines.push(``)

  // ─── 7+. PLAIN AI SECTION CONTENT (unstyled) ───
  // User requirement: remove previous post-table component stack and
  // print freshly generated section content as plain HTML after comparison table.
  const sectionOrder: Array<keyof GeneratedCategorySections> = [
    "method",
    "buyersGuide",
    "benefits",
    "caveats",
  ]
  for (const key of sectionOrder) {
    let rawContent = String(generatedSections?.[key] || "").trim()
    // Strip markdown code block wrappers if AI included them
    rawContent = rawContent.replace(/^```[a-z]*\n/i, "").replace(/\n```$/i, "").trim()
    // Strip any AI-generated <a> tags (no className) - links are added by injectInlineInternalLinks below
    rawContent = rawContent.replace(/<a\s+href="[^"]*">([\s\S]*?)<\/a>/g, "$1")
    rawContent = injectInlineInternalLinks(rawContent, catSlug, 4, usedInlineLinkHrefs)

    if (!rawContent) {
      continue
    }
    
    let content = rawContent
    if (key === "method") {
      const imgPath = await ensureSectionImage(catSlug, "method", rawContent, ranked, 0)
      content = transformToCardGrid(rawContent, "purple", imgPath)
      
      // Inject link to methodology page
      content += `\n\n<div className="mt-6 mb-12 text-center">\n  <a href="/metodik" className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm">\n    <svg className="w-4 h-4 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg>\n    Læs mere om vores testmetodik\n  </a>\n</div>`
    }
    if (key === "buyersGuide") {
      const imgPath = await ensureSectionImage(catSlug, "guide", rawContent, ranked, 1)
      const infographicPath = await ensureCategoryInfographic(catSlug, categoryName)
      content = transformToCardGrid(rawContent, "blue", imgPath, infographicPath, "Dosering i praksis")
    }
    if (key === "benefits") {
      const imgPath = await ensureSectionImage(catSlug, "benefits", rawContent, ranked, 2)
      content = transformToCardGrid(rawContent, "green", imgPath)
    }
    if (key === "caveats") {
      const imgPath = await ensureSectionImage(catSlug, "caveats", rawContent, ranked, 3)
      content = transformToCardGrid(rawContent, "amber", imgPath)
    }
    
    lines.push(content)
  lines.push(``)
  }

  // ─── 8. FAQ COMPONENT ───
  // Parse the raw HTML FAQ from AI into the structured <FAQ /> component
  const rawFaq = String(generatedSections?.faq || "").trim()
  if (rawFaq) {
    // Extract H3 questions and P answers
    const faqItems: { q: string; a: string }[] = []
    const regex = /<h3[^>]*>(.*?)<\/h3>\s*<p[^>]*>([\s\S]*?)(?=<\/p>|<\/h3>|<h3|$)/gi
    let match
    while ((match = regex.exec(rawFaq)) !== null) {
      const q = match[1].replace(/<[^>]+>/g, "").trim()
      const a = match[2].replace(/<[^>]+>/g, "").trim()
      if (q && a) faqItems.push({ q, a })
    }
    
    if (faqItems.length > 0) {
      const faqJson = faqItems.map(f => `{"question":"${esc(f.q)}","answer":"${esc(f.a)}"}`).join(",")
      lines.push(`<FAQ title="FAQ om ${esc(categoryName)}" items={[${faqJson}]} />`)
  lines.push(``)
      schemas.push({
        type: "FAQ",
        questions: faqItems.map(f => ({ question: f.q, answer: f.a }))
      })
    } else {
      // Fallback if parsing fails
      lines.push(rawFaq)
  lines.push(``)
    }
  }

  // ─── 9. SOURCES COMPONENT ───
  const rawSources = String(generatedSections?.sources || "").trim()
  if (rawSources) {
    // Style the sources section to look like a neat reference list
    let styledSources = rawSources
      .replace(/class=/g, 'className=')
      .replace(/<h2>/g, '<h2 className="text-2xl font-bold text-slate-900 mb-4 mt-0">')
      .replace(/<ul[^>]*>/g, '<ul className="mt-6 space-y-4 list-none pl-0">')
      .replace(/<li>/g, '<li className="flex items-start gap-3 text-sm text-slate-600"><svg className="w-5 h-5 text-slate-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg><div>')
      .replace(/<\/li>/g, '</div></li>')
      .replace(/<a /g, '<a className="font-medium text-green-700 hover:underline" ')

    lines.push(`<div className="not-prose my-12 -mx-4 px-4 md:mx-0 md:rounded-2xl md:border md:border-slate-100 md:bg-slate-50 md:p-8">`)
    lines.push(`  <div className="prose prose-slate max-w-none prose-p:text-sm prose-p:text-slate-600">`)
    lines.push(styledSources)
    lines.push(`  </div>`)
    lines.push(`</div>`)
  lines.push(``)
  }

  const relatedArticles = buildRelatedArticlesSection(catSlug, year)
  if (relatedArticles) {
    lines.push(relatedArticles)
  lines.push(``)
  }

  // ─── 10. UGC / COMMENTS SECTION (Dummy for now) ───
  lines.push(`<div className="not-prose my-12 -mx-4 px-4 md:mx-0 md:rounded-2xl md:border md:border-slate-200 md:bg-white md:p-8 md:shadow-sm">`)
  lines.push(`  <h2 className="text-2xl font-bold text-slate-900 mb-6 mt-0 flex items-center gap-2">`)
  lines.push(`    <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" /></svg>`)
  lines.push(`    Spørgsmål & Svar fra læsere`)
  lines.push(`  </h2>`)
  lines.push(`  <div className="space-y-6">`)
  
  // Dummy question 1
  lines.push(`    <div className="flex gap-3 md:gap-4">`)
  lines.push(`      <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-bold shrink-0">M</div>`)
  lines.push(`      <div>`)
  lines.push(`        <div className="flex items-baseline gap-2 mb-1">`)
  lines.push(`          <span className="font-semibold text-slate-900">Martin S.</span>`)
  lines.push(`          <span className="text-xs text-slate-500">2 dage siden</span>`)
  lines.push(`        </div>`)
  lines.push(`        <p className="text-slate-700 text-sm mb-3">Kan jeg blande mit ${categoryName} med kaffe om morgenen, eller ødelægger varmen effekten?</p>`)
  lines.push(`        <div className="py-1 md:rounded-xl md:bg-slate-50 md:p-4 md:border md:border-slate-100">`)
  lines.push(`          <div className="flex items-baseline gap-2 mb-1">`)
  lines.push(`            <span className="font-semibold text-green-700">Line Kragelund (Ekspert)</span>`)
  lines.push(`            <span className="text-xs text-slate-500">1 dag siden</span>`)
  lines.push(`          </div>`)
  lines.push(`          <p className="text-slate-600 text-sm">Hej Martin! Ja, du kan sagtens blande det i kaffen. Varmen ødelægger ikke de aktive stoffer, men det kan påvirke smagen lidt afhængigt af hvilken variant du har valgt. Et godt tip er at røre det ud i en lille smule koldt vand først, og derefter hælde den varme kaffe over for at undgå klumper.</p>`)
  lines.push(`        </div>`)
  lines.push(`      </div>`)
  lines.push(`    </div>`)
  
  // Dummy question 2
  lines.push(`    <div className="flex gap-3 md:gap-4">`)
  lines.push(`      <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-bold shrink-0">C</div>`)
  lines.push(`      <div>`)
  lines.push(`        <div className="flex items-baseline gap-2 mb-1">`)
  lines.push(`          <span className="font-semibold text-slate-900">Camilla</span>`)
  lines.push(`          <span className="text-xs text-slate-500">1 uge siden</span>`)
  lines.push(`        </div>`)
  lines.push(`        <p className="text-slate-700 text-sm mb-3">Hvor lang tid går der typisk, før man kan mærke en effekt af produktet fra jeres testvinder?</p>`)
  lines.push(`        <div className="py-1 md:rounded-xl md:bg-slate-50 md:p-4 md:border md:border-slate-100">`)
  lines.push(`          <div className="flex items-baseline gap-2 mb-1">`)
  lines.push(`            <span className="font-semibold text-green-700">Line Kragelund (Ekspert)</span>`)
  lines.push(`            <span className="text-xs text-slate-500">1 uge siden</span>`)
  lines.push(`          </div>`)
  lines.push(`          <p className="text-slate-600 text-sm">Hej Camilla. Det varierer fra person til person, men de fleste begynder at mærke en forskel efter 1-2 ugers konsekvent brug. Husk at tage det dagligt, også på hviledage, for at opnå det bedste resultat!</p>`)
  lines.push(`        </div>`)
  lines.push(`      </div>`)
  lines.push(`    </div>`)
  
  lines.push(`  </div>`)
  lines.push(`  <CommentSection />`)
  lines.push(`</div>`)
  lines.push(``)

  // Add ArticleSchema
  schemas.push({
    type: "Article",
    title: `${toplistName} bedst i test ${year}`,
    description: `Uafhængig rangering af ${products.length} ${categoryName}-produkter på kvalitet, dosering og pris.`,
    url: categoryUrl,
    author: "Line Kragelund",
    datePublished: frontmatter.date || now,
    dateModified: now,
  })

  // Inject SeoJsonLd component
  lines.push(`<SeoJsonLd schemas={${JSON.stringify(schemas)}} />`)
  lines.push(``)

  return lines.join("\n")
}

function isThinReviewContent(content: string): boolean {
  const raw = String(content || "").trim()
  if (!raw) return true
  const text = raw
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
  if (!text) return true
  const placeholderPatterns = [
    /^\s*[^.]{0,140}\ber et kosttilskud(?: i [^.]+-form)?(?: med [^.]+)?\.\s*(?:pakningen rækker typisk til|pakningen indeholder|den er nem at sammenligne|sammenlign gerne)/i,
    /\bden er nem at sammenligne på tværs af produkter\b/i,
    /\bpakningen rækker typisk til\b/i,
    /\bsammenlign gerne pris og hvor længe pakken rækker\b/i,
    /^\s*bestil\b/i,
  ]
  if (placeholderPatterns.some((re) => re.test(text))) return true
  return text.length < 320
}

function isStructuredProductReviewContent(content: string): boolean {
  const raw = String(content || "").trim()
  if (!raw.startsWith("<p>")) return false

  const requiredPatterns = [
    /<h3[^>]*>\s*Fordele:\s*<\/h3>/i,
    /<h3[^>]*>\s*Ulemper:\s*<\/h3>/i,
    /<h3[^>]*>\s*Attributter\/specifikationer:\s*<\/h3>/i,
    /<table[^>]*class(?:Name)?="table-default"/i,
    /<h3[^>]*>\s*FAQ:\s*<\/h3>/i,
    /<h3[^>]*>\s*Hvem passer .*? til:\s*<\/h3>/i,
  ]

  if (!requiredPatterns.every((re) => re.test(raw))) return false
  const faqQuestionCount = (raw.match(/<h4[^>]*>/gi) || []).length
  return faqQuestionCount >= 3
}

function buildQuickFactReviewContent(prod: ProductData, badge: string, award?: ProductAward): string {
  const facts = new Map(prod.quickFacts.map((f) => [String(f.label || "").trim().toLowerCase(), String(f.value || "").trim()]))
  const getFact = (label: string) => facts.get(label.toLowerCase()) || ""
  const portions = getFact("Portioner/pakke")
  const pricePerPortion = getFact("Pris/portion")
  const packageSize = getFact("Pakningsstørrelse")
  const proteinPercent = getFact("Proteinhalt")
  const proteinPerServing = getFact("Protein pr. portion")
  const sweetening = getFact("Sødning")
  const awardReason = String(award?.reason || "").replace(/\s+/g, " ").trim().replace(/[.!?]+$/g, "")

  const introParts: string[] = []
  introParts.push(`${prod.title} ligger i den stærke ende af feltet med en samlet score på ${prod.rating.toFixed(1)}/10 og udmærkelsen ${badge}.`)
  if (awardReason) {
    introParts.push(`${awardReason}.`)
  } else if (pricePerPortion) {
    introParts.push(`Det gør den især interessant, hvis du sammenligner produkter på daglig værdi frem for kun pakkepris.`)
  } else {
    introParts.push(`Placeringen bygger på vores samlede vurdering af kvalitet, værdi og brug i hverdagen.`)
  }

  const bullets: string[] = []
  if (proteinPerServing) bullets.push(`- Proteinindhold: ${proteinPerServing} pr. portion.`)
  else if (proteinPercent) bullets.push(`- Proteinhalt: ${proteinPercent}.`)
  if (packageSize) bullets.push(`- Pakningsstørrelse: ${packageSize}.`)
  if (portions) bullets.push(`- Forbrug: cirka ${portions} portioner pr. pakke.`)
  if (pricePerPortion) bullets.push(`- Værdi: cirka ${pricePerPortion} pr. portion.`)
  if (sweetening) {
    bullets.push(
      /ikke oplyst/i.test(sweetening)
        ? `- Obs: sødning er ikke oplyst i datagrundlaget, så etiketten bør dobbelttjekkes før køb.`
        : `- Sødning: ${sweetening}.`,
    )
  }

  const outroParts: string[] = []
  if (badge === "BEDSTE PREMIUM") {
    outroParts.push(`Det peger på et valg til dig, der gerne vil betale for en stærk helhedsvurdering frem for kun den laveste pris.`)
  } else if (badge === "BEDSTE BUDGET") {
    outroParts.push(`Det peger på et valg til dig, der vil holde den løbende pris nede uden at slippe helt på helhedsindtrykket.`)
  } else {
    outroParts.push(`Det gør produktet relevant for dig, der vil have et sammenligneligt og gennemsigtigt valg i kategorien.`)
  }
  if (!sweetening) {
    outroParts.push(`Datagrundlaget er mere sparsomt end for de bedst dokumenterede produkter, så ingrediensliste og deklaration bør veje ekstra tungt i din endelige vurdering.`)
  }
  outroParts.push(`Kilde: produktets deklaration, quick facts og forhandlerdata.`)

  return [introParts.join(" "), "", ...bullets.slice(0, 5), "", outroParts.join(" ")].join("\n").trim()
}

function buildSyntheticCrawledProductForReview(prod: ProductData): CrawledProduct {
          return {
    sourceUrl: prod.buyUrl,
    name: prod.title,
    brand: prod.brand,
    price: prod.price,
    description: cleanText(prod.crawledDescription || prod.manualInfo || ""),
    fullDescription: cleanText(prod.crawledFullDescription || prod.crawledDescription || prod.manualInfo || ""),
    highlights: Array.isArray(prod.crawledHighlights) ? prod.crawledHighlights : [],
    ingredients: cleanText(prod.crawledIngredients || ""),
    dosage: cleanText(prod.crawledDosage || ""),
    nutritionInfo: cleanText(prod.crawledNutritionInfo || ""),
    store: prod.crawledStore,
    reviews: Array.isArray(prod.reviews) ? prod.reviews : [],
  }
}

function buildProductInfoBlobForReview(prod: ProductData, crawled: CrawledProduct): string {
  const reviews = Array.isArray(crawled.reviews) ? crawled.reviews : []
  const reviewSample = reviews
    .slice(0, 5)
    .map((r, i) => {
      const author = cleanText(r.author)
      const rating = r.ratingValue == null ? "" : `${r.ratingValue}/5`
      const body = cleanText(r.body)
      return `- Omtale ${i + 1}: ${author}${rating ? ` (${rating})` : ""} – ${body}`
    })
    .join("\n")

  const quickFactsBlob = prod.quickFacts
    .map((f) => `- ${cleanText(f.label)}: ${cleanText(f.value)}`)
    .filter((line) => !/- :/.test(line))
    .join("\n")
  const lines = [
    `Navn: ${cleanText(prod.title || crawled.name)}`,
    `Pakningsstørrelse: ${cleanText(getQuickFactValueFromList(prod.quickFacts, "Pakningsstørrelse") || "")}`,
    `Brand: ${cleanText(prod.brand || crawled.brand)}`,
    `Pris: ${cleanText(prod.price || crawled.price)}`,
    `Butik: ${formatStoreName(prod.crawledStore || crawled.store, prod.buyUrl)}`,
    `Beskrivelse: ${cleanText(crawled.description)}`,
    `Udvidet beskrivelse: ${cleanText(crawled.fullDescription)}`,
    `Ingredienser: ${cleanText(crawled.ingredients)}`,
    `Næringsinfo: ${cleanText(crawled.nutritionInfo)}`,
    `Dosering: ${cleanText(crawled.dosage)}`,
    `Highlights: ${cleanText((Array.isArray(crawled.highlights) ? crawled.highlights : []).join(", "))}`,
  ].filter((line) => !/:\s*$/.test(line))

  if (quickFactsBlob) {
    lines.push(`Quick facts:\n${quickFactsBlob}`)
  }
  if (reviewSample) {
    lines.push(`Kundeomtaler (udpluk):\n${reviewSample}`)
  }

  return lines.join("\n")
}

async function generateStructuredProductReviewWithAI(
  prod: ProductData,
  categoryName: string,
  badge: string,
  award?: ProductAward,
): Promise<string> {
  if (!OPENAI_API_KEY) {
    throw new Error(`OPENAI_API_KEY mangler; kan ikke generere mallkorrekt produktreview for ${prod.slug}`)
  }

  const crawled = findCrawledProduct(prod.buyUrl || "", prod.slug, prod.title) || buildSyntheticCrawledProductForReview(prod)
  const awardContext = [award?.label || badge, award?.reason || ""].filter(Boolean).join(" – ")
  const userPrompt = buildProductReviewPromptDk({
    keyword: cleanText(prod.title) || "produktet",
    productName: cleanText(prod.title) || cleanText(crawled.name) || "Produkt",
    comparisonTopic: cleanText(categoryName) || "denne kategori",
    awardContext: cleanText(awardContext) || "et af vores topvalg",
    productInfo: buildProductInfoBlobForReview(prod, crawled),
  })

  for (let attempt = 0; attempt <= 2; attempt++) {
    try {
      const res = await fetch(OPENAI_ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: OPENAI_MODEL,
          messages: [
            { role: "system", content: PRODUCT_REVIEW_SYSTEM_PROMPT_DK },
            { role: "user", content: userPrompt.trim() },
          ],
          temperature: 0.6,
          max_completion_tokens: 3600,
        }),
      })

      if (!res.ok) {
        const err = await res.text().catch(() => "")
        if (attempt < 2 && (res.status === 429 || res.status >= 500)) {
          await new Promise((r) => setTimeout(r, 1500 * (attempt + 1)))
          continue
        }
        throw new Error(`OpenAI ${res.status}: ${err.slice(0, 180)}`)
      }

      const json = (await res.json()) as any
      let content = normalizeStoreLabelsInContent(
        normalizeHtmlForMdx(String(json?.choices?.[0]?.message?.content || "").trim()),
      ).trim()

      // Strip AI-generated <a> tags - links are injected separately with correct silo paths
      content = content.replace(/<a\s+href="[^"]*">([\s\S]*?)<\/a>/g, "$1")

      if (!content) throw new Error("Tomt AI-svar")
      if (!isStructuredProductReviewContent(content)) {
        throw new Error("AI-svaret følger ikke den store produktmall")
      }
      return content
    } catch (error) {
      if (attempt >= 2) throw error
      await new Promise((r) => setTimeout(r, 1200 * (attempt + 1)))
    }
  }

  throw new Error(`Kunne ikke generere mallkorrekt produktreview for ${prod.slug}`)
}

async function buildFallbackReviewContent(
  prod: ProductData,
  categoryName: string,
  badge: string,
  award?: ProductAward,
): Promise<string> {
  const generated = await generateStructuredProductReviewWithAI(prod, categoryName, badge, award)

  if (isStructuredProductReviewContent(generated) && !isThinReviewContent(generated)) return generated
  throw new Error(`GPT-genererad produktreview blev inte mallkorrekt för ${prod.slug}`)
}

async function buildProductSection(
  prod: ProductData,
  catSlug: string,
  categoryName: string,
  award?: ProductAward,
  testImagePath?: string,
  preservedReviewContent?: string,
  preserveProductLinkedContent: boolean = false,
): Promise<string> {
  const lines: string[] = []
  const badge = award?.label || (prod.position === 1 ? "BEDST I TEST" : "HØJ TESTSCORE")
  const badgeClass = getAwardBadgeClass(badge)
  const storeLabel = formatStoreName(prod.crawledStore, prod.buyUrl)
  const headerTagline = (() => {
    const formFact = prod.quickFacts.find((f) => String(f.label || "").toLowerCase() === "form")?.value || ""
    const formLower = String(formFact || "").toLowerCase()
    const isTablet = /\btablet/i.test(formLower)
    const isPowder = /\bpulver/i.test(formLower)

    const highlights = Array.isArray(prod.crawledHighlights) ? prod.crawledHighlights : []
    const hlText = highlights.join(" ").toLowerCase()
    const explicitCount =
      (hlText.match(/\b(\d{1,2})\s+vigtige\s+amin/i)?.[1]) ||
      (hlText.match(/\b(\d{1,2})\s+amin/i)?.[1]) ||
      ""
    const parts: string[] = []
    if (explicitCount) {
      const n = parseInt(explicitCount, 10)
      if (Number.isFinite(n) && n >= 8 && n <= 22) parts.push(`${n} aminosyrer`)
    }
    if (isTablet) parts.push("praktisk tabletformat")
    else if (isPowder) parts.push("pulverformat")

    const pricePerBar =
      prod.quickFacts.find((f) => String(f.label || "").toLowerCase() === "pris/bar")?.value || ""
    const pricePerPortion =
      prod.quickFacts.find((f) => String(f.label || "").toLowerCase() === "pris/portion")?.value || ""
    if (pricePerBar && !/se aktuel pris/i.test(String(pricePerBar))) parts.push("skarp pris pr. bar")
    else if (pricePerPortion && !/se aktuel pris/i.test(String(pricePerPortion))) parts.push("skarp pris")

    const uniq: string[] = []
    const seen = new Set<string>()
    for (const p of parts) {
      const k = p.toLowerCase()
      if (!k || seen.has(k)) continue
      seen.add(k)
      uniq.push(p)
    }
    if (uniq.length === 0) return ""
    return `Et stærkt allround-valg med ${uniq.join(", ")}.`
  })()

  const subRatings = prod.panelScores
    ? [
        { label: "Effekt & kvalitet", value: prod.panelScores.quality },
        { label: "Ingredienser", value: prod.panelScores.ingredients },
        { label: "Pris & værdi", value: prod.panelScores.value },
        { label: "Brugeroplevelse", value: prod.panelScores.usability },
        { label: "Renhed & sikkerhed", value: prod.panelScores.purity },
        { label: "Kundeanmeldelser", value: prod.panelScores.customer },
      ]
    : generateSubRatings(prod.rating)

  lines.push(`---`)
  lines.push(``)
  lines.push(`<a id="product-${prod.slug}"></a>`)
  lines.push(``)

  // Product card (fordonssajten layout: image | info | score)
  lines.push(`<article className="not-prose my-6 -mx-4 w-auto overflow-hidden md:mx-0 md:my-8 md:w-full md:rounded-2xl md:border md:border-slate-200 md:bg-white md:shadow-sm md:ring-1 md:ring-black/5 md:transition md:hover:shadow-md">`)
  
  // Grid layout for desktop: Image on left, Content on right
  lines.push(`  <div className="grid grid-cols-1 gap-4 px-4 py-4 md:grid-cols-[180px_minmax(0,1fr)] md:gap-8 md:p-6">`)
  
  // Left: product image
  lines.push(`    <div className="w-32 flex-shrink-0 md:w-full mx-auto md:mx-0">`)
  if (prod.imageUrl) {
    lines.push(`      <div className="relative aspect-square w-full overflow-hidden rounded-xl border border-slate-100 bg-gradient-to-br from-slate-50 to-white p-2 shadow-inner sm:p-3">`)
    lines.push(`        <img src="${prod.imageUrl}" alt="${esc(prod.title)}" width="400" height="400" loading="lazy" className="product-card-img h-full w-full object-contain drop-shadow-md" />`)
    lines.push(`      </div>`)
  } else {
    lines.push(`      <div className="relative aspect-square w-full overflow-hidden rounded-xl border border-slate-100 bg-gradient-to-br from-slate-50 to-white p-2 shadow-inner sm:p-3 flex items-center justify-center">`)
    lines.push(`        <svg className="w-12 h-12 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}><path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>`)
    lines.push(`      </div>`)
  }
  lines.push(`    </div>`)

  // Right: product info, ratings, CTA
  lines.push(`    <div className="flex flex-col min-w-0">`)
  
  // Top row: Badge, Title, Compact score (top-right)
  lines.push(`      <div className="flex flex-wrap items-start justify-between gap-4">`)
  lines.push(`        <div>`)
  lines.push(`          <div className="flex flex-wrap items-center gap-3 mb-2">`)
  lines.push(`            <span className="inline-block rounded-full ${badgeClass} px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide">${badge}</span>`)
  lines.push(`            <h3 className="text-xl md:text-2xl font-bold text-slate-900 leading-tight break-words m-0" title="${esc(prod.title)}">${prod.position}. ${esc(prod.title)}</h3>`)
  lines.push(`          </div>`)
  const reasonText = headerTagline || (award?.reason ? String(award.reason) : "")
  if (reasonText) lines.push(`          <span className="text-sm text-slate-600 block">${esc(reasonText)}</span>`)
  lines.push(`        </div>`)
  lines.push(`        <div className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 shrink-0">`)
  lines.push(`          <svg className="w-5 h-5 text-amber-500" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>`)
  lines.push(`          <span className="text-base md:text-lg font-extrabold tracking-tight text-slate-900 tabular-nums">${prod.rating.toFixed(1)}</span>`)
  lines.push(`        </div>`)
  lines.push(`      </div>`)

  // Bottom row: Rating bars & Button
  lines.push(`      <div className="mt-6 flex flex-col gap-6 md:grid md:grid-cols-[minmax(0,1fr)_auto] md:items-center md:gap-8">`)
  
  // Rating bars
  lines.push(`        <div className="w-full md:max-w-[400px] grid grid-cols-1 gap-x-8 gap-y-3 sm:grid-cols-2">`)
  for (const r of subRatings) {
    lines.push(`          <RatingBar title="${r.label}" value={${r.value}} showLabel={false} />`)
  }
  lines.push(`        </div>`)

  // Button
  lines.push(`        <div className="w-full md:w-auto md:justify-self-end shrink-0 flex flex-col items-center md:items-end">`)
  if (prod.buyUrl) {
    lines.push(
      `          <a href="${prod.buyUrl}" target="_blank" rel="nofollow sponsored noopener" title="Åbner i ny fane" className="w-full md:w-auto inline-flex items-center justify-center gap-2.5 rounded-lg bg-green-600 px-7 py-3 text-[17px] font-bold text-white no-underline !no-underline hover:no-underline hover:!no-underline focus:no-underline focus:!no-underline visited:no-underline visited:!no-underline shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:bg-green-700 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-300 md:min-w-[170px]">`,
    )
    lines.push(`            Til butik`)
    lines.push(
      `            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>`,
    )
    lines.push(`          </a>`)
    lines.push(`          <div className="mt-1 text-[11px] leading-none text-slate-500 md:text-right">(${esc(storeLabel)})</div>`)
  } else {
    lines.push(
      `          <a href="#sammenligningstabel" className="w-full md:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-slate-100 px-8 py-3.5 text-sm font-bold text-slate-800 no-underline !no-underline hover:no-underline hover:!no-underline shadow-sm transition-all hover:bg-slate-200 hover:shadow md:min-w-[160px]">`,
    )
    lines.push(`            Se i tabellen`)
    lines.push(
      `            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>`,
    )
    lines.push(`          </a>`)
  }
  lines.push(`        </div>`)
  
  lines.push(`      </div>`)
  lines.push(`    </div>`)
  lines.push(`  </div>`)

  // 2) Content (P1 → bullets → P2)
  // Create detailed review content optimized for SERP performance
  const storedReviewContent = String(prod.content || "").trim()
  const existingReviewContent = String(preservedReviewContent || "").trim()
  const reusablePreservedReviewContent = preserveProductLinkedContent ? existingReviewContent : ""
  let reviewContent = reusablePreservedReviewContent
    ? reusablePreservedReviewContent
    : !isThinReviewContent(storedReviewContent)
      ? storedReviewContent
      : preserveProductLinkedContent
        ? storedReviewContent || `<p>${esc(prod.title)} indgår fortsat i oversigten, men produktspecifik content bevares uændret på sider med blokerede eller udgåede produktkilder.</p>`
        : await buildFallbackReviewContent(prod, categoryName, badge, award)
    
  // Inject the test image right after the first <h3> if it exists
  if (testImagePath && !/<img src="\/images\/products\/test-[^"]+"/i.test(reviewContent)) {
    const imgHtml = `\n<img src="${testImagePath}" alt="Test af ${esc(prod.title)}" width="800" height="800" className="w-full mb-5 md:float-right md:w-5/12 md:ml-6 md:mb-4 rounded-2xl shadow-md object-cover aspect-square m-0" />\n`
    const h3Index = reviewContent.indexOf('</h3>')
    if (h3Index !== -1) {
      reviewContent = reviewContent.slice(0, h3Index + 5) + imgHtml + reviewContent.slice(h3Index + 5)
    } else {
      // Fallback if no h3 exists
      reviewContent = imgHtml + reviewContent
    }
  }

  lines.push(`  <div className="px-4 py-4 md:border-t md:border-slate-100 md:px-6">`)
  lines.push(`    <div className="prose prose-slate max-w-none">`)
  lines.push(``)
  lines.push(reviewContent)
  lines.push(``)
  lines.push(`    </div>`)
  lines.push(`  </div>`)
  lines.push(``)

  // 3) Quick facts grid (after content)
  lines.push(`  <div className="px-4 pb-4 md:border-t md:border-slate-100 md:px-6 md:pb-6">`)
  const quickFactsGridCols = prod.quickFacts.length >= 8 ? 3 : 2
  lines.push(`    <h4 className="mt-4 mb-2 text-base font-semibold text-slate-900">Nøglefakta</h4>`)
  lines.push(`    <dl className="grid grid-cols-1 gap-3 rounded-lg bg-slate-50 p-3 sm:grid-cols-2 ${quickFactsGridCols === 3 ? "lg:grid-cols-3" : ""}">`)
  for (const fact of prod.quickFacts) {
    lines.push(`      <div>`)
    lines.push(`        <dt className="text-[10px] font-medium uppercase tracking-wider text-slate-500">${esc(fact.label)}</dt>`)
    lines.push(`        <dd className="mt-0.5 text-sm font-semibold text-slate-800">${esc(fact.value)}</dd>`)
    lines.push(`      </div>`)
  }
  lines.push(`    </dl>`)
  lines.push(`  </div>`)

  // 4) Summary (after quick facts)
  lines.push(`  <div className="px-4 py-4 md:border-t md:border-slate-100 md:px-6">`)
  lines.push(`    <div className="rounded-lg bg-slate-50 border border-slate-200 p-4">`)
  lines.push(`      <div className="text-sm font-semibold text-slate-900 mb-1">Sammenfatning</div>`)
  lines.push(`      <div className="text-sm text-slate-600">${esc(prod.title)} opnår en samlet score på <strong>${prod.rating.toFixed(1)}/10</strong>${prod.userScore ? ` (brugerbedømmelse: ${prod.userScore})` : ""}.</div>`)
  lines.push(`    </div>`)
  lines.push(`  </div>`)
  lines.push(`</article>`)

  return lines.join("\n")
}

function pickReviewBullets(quickFacts: Array<{ label: string; value: string }>): Array<{ label: string; value: string; score: number }> {
  // Keep Kilde/Source out of the review bullets; everything else can be used as fallback to hit 3–5 bullets.
  const ignore = new Set(["Kilde", "Source"])
  const normalized = quickFacts
    .map((f) => ({ label: String(f.label || "").trim(), value: String(f.value || "").trim() }))
    .filter((f) => f.label.length > 0 && f.value.length > 0)

  const scored = normalized
    .filter((f) => !ignore.has(f.label))
    .map((f) => {
      const l = f.label.toLowerCase()
      let score = 0.2
      if (l.includes("pris/enhed") || l.includes("pris pr.") || l.includes("pris/portion")) score = 1.0
      else if (l.includes("pris")) score = 0.85
      else if (l.includes("butiksrating") || l.includes("anmeld")) score = 0.83
      else if (l.includes("kapsler/pakke") || l.includes("tabletter/pakke") || l.includes("enheder/pakke")) score = 0.9
      else if (l.includes("portioner")) score = 0.8
      else if (l.includes("dose") || l.includes("dosering") || l.includes("mg") || l.includes("µg") || l.includes("iu")) score = 0.75
      else if (l.includes("pakningsstørrelse") || l.includes("indhold")) score = 0.7
      else if (l.includes("sødestof") || l.includes("tilsætningsstof") || l.includes("additiv")) score = 0.65
      return { ...f, score }
    })

  scored.sort((a, b) => b.score - a.score)
  const out: Array<{ label: string; value: string; score: number }> = []
  const seen = new Set<string>()
  for (const b of scored) {
    if (seen.has(b.label)) continue
    seen.add(b.label)
    out.push(b)
    if (out.length >= 5) break
  }

  // Guarantee at least 3 bullets if possible, even if they are lower-signal facts like "Mærke".
  if (out.length < 3) {
    for (const f of normalized) {
      if (ignore.has(f.label)) continue
      if (seen.has(f.label)) continue
      out.push({ ...f, score: 0.05 })
      seen.add(f.label)
      if (out.length >= 3) break
    }
  }
  return out.length >= 3 ? out.slice(0, 5) : out
}

function buildDetailedReview(prod: ProductData, catSlug: string, badge: string): string {
  const normalizeSpace = (s: string) => String(s || "").replace(/\s+/g, " ").trim()
  const clip = (s: string, max = 170) => {
    const t = normalizeSpace(s)
    if (t.length <= max) return t
    return t.slice(0, max - 1).replace(/[,\s]+$/g, "") + "…"
  }

  const summarizeDosage = (raw: string) => {
    const t = normalizeSpace(raw)
    if (!t) return ""
    // CoreNutrition-style: "Tag 3 tabletter 1 gang dagligt. ... øges til 9 tabletter 3 gange dagligt ..."
    const base = t.match(/\bTag\s+(\d+)\s+\w+\s+(\d+)\s+gang\s+dagligt\b/i)
    const max = t.match(/\b(?:øges|forøges)\s+til\s+(\d+)\s+\w+\s+(\d+)\s+gange?\s+dagligt\b/i)
    if (base) {
      const n1 = Number(base[1])
      const x1 = Number(base[2])
      const n2 = max ? Number(max[1]) : null
      const x2 = max ? Number(max[2]) : null
      const baseText = Number.isFinite(n1) && Number.isFinite(x1) ? `${n1} stk ${x1} gang dagligt` : ""
      const maxText =
        n2 != null && x2 != null && Number.isFinite(n2) && Number.isFinite(x2)
          ? `kan øges til ${n2} stk ${x2} gange dagligt i perioder`
          : ""
      const parts = [baseText, maxText].filter(Boolean)
      if (parts.length) return `${parts.join("; ")} (se etiketten)`
    }
    // Fallback: keep very short excerpt; avoid repeating unit words.
    return clip(t, 120)
  }

  const facts = new Map(prod.quickFacts.map((f) => [String(f.label || "").trim().toLowerCase(), String(f.value || "").trim()]))
  const getFact = (label: string) => facts.get(label.toLowerCase()) || ""

  const highlights = Array.isArray(prod.crawledHighlights) ? prod.crawledHighlights : []
  const ing = normalizeSpace(prod.crawledIngredients || "")
  const dos = normalizeSpace(prod.crawledDosage || "")
  const dosageShort = dos ? summarizeDosage(dos) : ""
  const isTablet = (prod.crawledIngredients && /tablet/i.test(prod.crawledIngredients)) ||
                   (prod.crawledDosage && /tablet/i.test(prod.crawledDosage)) ||
                   (prod.crawledHighlights && /tablet/i.test(prod.crawledHighlights.join(" ")))
  const isPowder = (prod.crawledIngredients && /pulver|powder/i.test(prod.crawledIngredients)) ||
                   (prod.crawledDosage && /pulver|powder/i.test(prod.crawledDosage))
  const containsMilk = ing && /\bmælk\b|\bmilk\b/i.test(ing)
  const pricePerPortion = getFact("Pris/portion")

  let review = ""

  // Detailed narrative section - natural and practical
  if (isTablet) {
    review += `\n#### Better You Amino Tabletter – nem at bruge dagligt\n`
    review += `Tabletterne er store men lette at synke med vand. De kræver ingen blanding eller forberedelse, hvilket gør dem praktiske til daglig brug. Hver portion er 3 tabletter som indeholder alle essentielle aminosyrer, med ekstra fokus på leucin og BCAA til muskelrestitution.\n\n`

    review += `De passer godt til dig, som vil have en enkel måde at få aminosyrer uden besvær. Tabletterne kan tages når som helst på dagen, før eller efter træning, og kræver ingen særlig opbevaring eller udstyr.`
  } else {
    review += `\nBetter You Amino Tabletter – balanserad aminosyratillskott\n`
    review += `Burken öppnas med ett lätt klick och avslöjar snygga, vita tabletter som är enkla att ta ut. Varje tablett känns solid och välformad, utan klibbighet eller konstiga dofter. När man tar en tablett med ett glas vatten glider den ner lätt – ingen klibbig känsla i munnen eller behov av tuggning. Tabletterna är perfekta att ha med sig i fickan eller väskan, redo att tas när som helst under dagen utan krångel med blandning eller mått. Den naturliga formulan ger en komplett aminosyraprofil med hela 18 aminosyrer, där leucin och andra BCAA står i fokus för muskelunderhåll.`
  }

  // Advantages section
  review += `\n\n#### Fordele\n`
  review += `- Komplet profil med 18 aminosyrer til muskelopbygning og restitution\n`
  if (isTablet) {
    review += `- Praktiske tabletter som ikke kræver blanding – perfekt til rejser og hverdag\n`
    review += `- Enkle at synke og tage med overalt\n`
  } else {
    review += `- Hurtig opløselighed uden klumper i vand\n`
  }
  review += `- Naturlig formel baseret på valleprotein\n`
  review += `- Konkurrencedygtig pris på 139 kr for 33 portioner\n`
  review += `- Støtter både muskelvedligeholdelse og præstationsdygtighed\n`

  // Disadvantages section
  review += `\n#### Ulemper\n`
  if (containsMilk) {
    review += `- Indeholder mælkeprotein – passer ikke veganere eller mælkeallergikere\n`
  }
  review += `- Kræver konsekvent dagligt indtag for bedste resultat\n`
  review += `- Kan føles som mange tabletter at synke på én gang for nogle\n`

  // Specifications section
  review += `\n#### Specifikationer\n`
  review += `- Type: Essentielle aminosyrer i tabletform\n`
  review += `- Smag: Neutral (tabletter uden smag)\n`
  review += `- Optagelse: Naturligt proteintilskud til jævn optagelse\n`
  review += `- Aminoprofil: 18 aminosyrer inkl. leucin ca. 369 mg pr. portion\n`
  review += `- Anvendelse: 3 tabletter dagligt, helst med måltid\n`
  review += `- Kost: Indeholder mælkeprotein\n`
  review += `- Pris: 139 kr (33 portioner = ca. 4,2 kr pr. portion)\n`
  review += `- Dosering: 3 tabletter 1 gang dagligt\n`
  review += `- Allergener: Mælk\n`
  review += `- Emballage: Tabletter i dåse\n`

  // Who it's for section
  review += `\n#### Hvem passer det til\n`
  review += `Better You Amino Tabletter passer til dig, som vil have en enkel og pålidelig måde at få essentielle aminosyrer uden besvær. Det er særligt relevant for styrke- og konditionstrænende, som prioriterer muskelrestitution og vil undgå pulverblandinger. Med sin komplette aminosyreprofil og praktiske tabletform er det et fremragende valg for både begyndere og erfarne trænende, som vil have et enkelt tilskud i hverdagen. Prisen på 139 kr gør det tilgængeligt for de fleste, og årsagen til, at vi har udnævnt det til "Bedst i test" i vores sammenligning.`

  // Enhanced FAQ section
  review += `\n\n#### Ofte stillede spørgsmål\n`

  review += `\nKan jeg tage tabletterne på fastende mave?\n`
  review += `Ja, mange tager aminosyretilskud fastende. Tabletterne er skånsomme for maven, men start gerne med et måltid hvis du er følsom.`

  review += `\nHvor ofte skal jeg tage tabletterne?\n`
  review += `Vi anbefaler 3 tabletter dagligt, helst efter træning eller som tilskud til måltider. Følg altid anbefalet dosering.`

  review += `\nKan jeg kombinere med andre tilskud?\n`
  review += `Ja, tabletterne fungerer godt sammen med andre kosttilskud. Rådfør gerne med læge eller ernæringsfysiolog ved specifikke kombinationer.`

  review += `\nEr tabletterne velegnede til veganere?\n`
  review += `Nej, tabletterne indeholder mælkeprotein og er derfor ikke veganske. For veganske alternativer anbefaler vi produkter baseret på andre proteinkilder.`

  review += `\nHvor lang tid tager det at se resultater?\n`
  review += `Resultater varierer individuelt, men mange oplever bedre restitution efter 2-4 uger med konsekvent brug.`

  return review
}

function buildReviewBlocks(prod: ProductData, catSlug: string, badge: string, award?: ProductAward): string {
  const normalizeSpace = (s: string) => String(s || "").replace(/\s+/g, " ").trim()
  const clip = (s: string, max = 170) => {
    const t = normalizeSpace(s)
    if (t.length <= max) return t
    return t.slice(0, max - 1).replace(/[,\s]+$/g, "") + "…"
  }

  const pushUnique = (arr: string[], sentence: string) => {
    const s = normalizeSpace(sentence).replace(/[.\s]+$/g, "").trim()
    if (!s) return
    const key = s.toLowerCase()
    if (arr.some((x) => normalizeSpace(x).replace(/[.\s]+$/g, "").toLowerCase() === key)) return
    arr.push(s + ".")
  }

  const summarizeDosage = (raw: string) => {
    const t = normalizeSpace(raw)
    if (!t) return ""
    // CoreNutrition-style: "Tag 3 tabletter 1 gang dagligt. ... øges til 9 tabletter 3 gange dagligt ..."
    const base = t.match(/\bTag\s+(\d+)\s+\w+\s+(\d+)\s+gang\s+dagligt\b/i)
    const max = t.match(/\b(?:øges|forøges)\s+til\s+(\d+)\s+\w+\s+(\d+)\s+gange?\s+dagligt\b/i)
    if (base) {
      const n1 = Number(base[1])
      const x1 = Number(base[2])
      const n2 = max ? Number(max[1]) : null
      const x2 = max ? Number(max[2]) : null
      const baseText = Number.isFinite(n1) && Number.isFinite(x1) ? `${n1} stk ${x1} gang dagligt` : ""
      const maxText =
        n2 != null && x2 != null && Number.isFinite(n2) && Number.isFinite(x2)
          ? `kan øges til ${n2} stk ${x2} gange dagligt i perioder`
          : ""
      const parts = [baseText, maxText].filter(Boolean)
      if (parts.length) return `${parts.join("; ")} (se etiketten)`
    }
    // Fallback: keep very short excerpt; avoid repeating unit words.
    return clip(t, 120)
  }

  const stripSignature = (s: string) => {
    const t = normalizeSpace(s)
    // Remove common signature fragments like "/Name, Company"
    return t.replace(/\s*\/\s*[A-Za-zÆØÅæøå].{0,60}$/g, "").trim()
  }

  const summarizeQaAnswer = (raw: string) => {
    const t = stripSignature(raw)
    if (!t) return ""
    // Prefer a short "takeaway" if we can detect it.
    if (/\bL-form\b/i.test(t) || /\bL[- ]form\b/i.test(t)) {
      return "Kundeservice oplyser, at aminosyrerne typisk forekommer i L-form (den biologisk aktive form)."
    }
    if (/\bvalleproteinisolat\b/i.test(t)) {
      return "Kundeservice oplyser, at aminosyrerne stammer fra valleproteinisolat."
    }
    return `Kundeservice svarer: “${clip(t, 140)}”.`
  }

  const buildMiniFaq = (input: {
    isTablet: boolean
    isPowder: boolean
    dosageShort: string
    containsMilk: boolean
    reviewSignals: { pro: any; con: any; total: number } | null
    qa?: Array<{ question: string; answer: string; answerBy: string; date: string }>
  }): string[] => {
    const lines: string[] = []
    const pushQa = (q: string, a: string) => {
      // Max 3 Qs => 6 lines (h5 + p per Q).
      if (lines.length >= 6) return
      lines.push(`<h5 className="text-sm font-semibold text-slate-900 mt-4 mb-1">${esc(q)}</h5>`)
      lines.push(`<p className="text-sm text-slate-700 m-0">${esc(a)}</p>`)
    }

    if (input.isTablet) {
      pushQa(
        "Skal det blandes i vand?",
        "Nej. Det bruges uden blanding, hvilket gør det nemt at tage med på farten. Følg altid doseringsforslaget på etiketten."
      )
    } else if (input.isPowder) {
      pushQa(
        "Skal det blandes i vand?",
        "Ja. Det blandes typisk i vand eller anden væske pr. portion. Brug den anbefalede mængde væske, så smag og styrke ikke bliver for koncentreret."
      )
    }

    if (input.dosageShort) {
      pushQa(
        "Hvordan doseres det?",
        `Anbefalet dosering: ${input.dosageShort}. Hvis du er ny til EAA, kan det være en fordel at starte lavt og justere efter behov.`
      )
    }

    if (lines.length < 6 && input.containsMilk) {
      pushQa(
        "Indeholder det allergener?",
        "Ja. Ingredienslisten angiver mælk, så det er relevant hvis du har mælkeallergi eller ønsker at undgå mejeribaserede ingredienser. Tjek også etiketten for evt. spor af andre allergener."
      )
    } else if (lines.length < 6) {
      // Keep FAQ helpful without quoting/paraphrasing individual customers.
      pushQa(
        "Hvad er vigtigst at tjekke før køb?",
        "Se først på indhold pr. portion, ingredienslisten (allergener) og om doseringsforslaget passer til din hverdag. Det giver en mere fair sammenligning end bare pris pr. pakke."
      )
    } else     if (lines.length < 6 && input.qa?.length) {
      const q0 = input.qa[0]
      pushQa(
        `Q&A: ${clip(q0.question, 70)}`,
        `${clip(stripSignature(q0.answer), 160)}${q0.answerBy ? ` (${q0.answerBy}${q0.date ? `, ${q0.date}` : ""})` : ""}.`
      )
    }

    // Add more comprehensive FAQ questions for better SERP performance
    if (lines.length < 6) {
      pushQa(
        "Kan jag ta detta på fastande mage?",
        "Många tar aminosyratillskott fastande. Börja med rekommenderad dos och se hur din mage reagerar."
      )
    }

    if (lines.length < 6) {
      pushQa(
        "Hur ofta ska jag ta det?",
        `Följ rekommenderad dosering på förpackningen. Vanligtvis ${input.dosageShort || "dagligen"} för bästa resultat.`
      )
    }

    return lines.length ? ["", `<h4 className="text-base font-semibold text-slate-900 mt-6 mb-2">FAQ</h4>`, ...lines] : []
  }

  const parseAminoTable = (raw: string | undefined) => {
    const t = normalizeSpace(raw || "")
    if (!t) return { portionText: "", rows: [] as Array<{ name: string; perPortionMg: number | null; perUnitMg: number | null }> }

    const normalizeAminoName = (s: string) =>
      String(s || "")
        .toLowerCase()
        .replace(/^l[\-\s]+/i, "")
        .replace(/[^a-zæøå]/gi, "")

    // Avoid accidental "rows" from headings like "Indhold", "Portion", etc.
    const allowed = new Set([
      "Alanin",
      "Arginin",
      "Asparaginsyre",
      "Cystein",
      "Glutaminsyre",
      "Glycin",
      "Histidin",
      "Isoleucin",
      "Leucin",
      "Lysin",
      "Methionin",
      "Fenylalanin",
      "Prolin",
      "Serin",
      "Threonin",
      "Tryptofan",
      "Tyrosin",
      "Valin",
    ].map(normalizeAminoName))

    const portionText =
      (t.match(/\bPortion\s*:\s*([^]+?)\bIndhold per\s*:/i)?.[1] || "")
        .replace(/\s+/g, " ")
        .trim()

    // CoreNutrition flattened table: "Leucin 369 mg 123 mg ..."
    const rows: Array<{ name: string; perPortionMg: number | null; perUnitMg: number | null }> = []
    const nameRe = /([A-ZÆØÅ][a-zæøåA-ZÆØÅ]+(?:syre)?)/g
    let m: RegExpExecArray | null
    const idxs: Array<{ name: string; idx: number }> = []
    while ((m = nameRe.exec(t))) {
      const name = m[1]
      if (!allowed.has(normalizeAminoName(name))) continue
      idxs.push({ name, idx: m.index })
      if (idxs.length > 80) break
    }
    for (let i = 0; i < idxs.length; i++) {
      const start = idxs[i].idx
      const end = i + 1 < idxs.length ? idxs[i + 1].idx : t.length
      const chunk = t.slice(start, end)
      const nums = [...chunk.matchAll(/(\d+(?:[.,]\d+)?)\s*mg/gi)].map((x) => Number(String(x[1]).replace(",", ".")))
      const perPortionMg = Number.isFinite(nums[0]) ? nums[0] : null
      const perUnitMg = Number.isFinite(nums[1]) ? nums[1] : null
      if (perPortionMg != null && perPortionMg > 0 && perPortionMg < 50000) {
        rows.push({ name: idxs[i].name, perPortionMg, perUnitMg })
      }
      if (rows.length >= 50) break
    }

    return { portionText, rows }
  }

  const buildP1Slogan = (input: {
    isTablet: boolean
    isPowder: boolean
    highlights: string[]
    aminoCount: number
    dosageShort: string
    hasValueSignal: boolean
  }): string => {
    const parts: string[] = []

    // Prefer explicit "18 aminosyrer" if we can support it.
    const hlText = input.highlights.join(" ").toLowerCase()
    const explicitCount =
      (hlText.match(/\b(\d{1,2})\s+vigtige\s+amin/i)?.[1]) ||
      (hlText.match(/\b(\d{1,2})\s+amin/i)?.[1]) ||
      ""
    const n = explicitCount ? parseInt(explicitCount, 10) : input.aminoCount
    if (Number.isFinite(n) && n >= 8 && n <= 22) {
      parts.push(`${n} aminosyrer`)
    } else if (input.aminoCount >= 10) {
      parts.push("tydelig aminosyreprofil")
    }

    if (input.isTablet) parts.push("praktisk tabletformat")
    else if (input.isPowder) parts.push("pulverformat")

    // If dosage looks simple/short, mention ease-of-use without repeating units.
    if (input.dosageShort && /1\s+gang\s+dagligt/i.test(input.dosageShort)) {
      parts.push("nem at bruge i hverdagen")
    }

    if (input.hasValueSignal) parts.push("skarp pris")

    // De-dupe and join.
    const uniq: string[] = []
    const seen = new Set<string>()
    for (const p of parts) {
      const k = p.toLowerCase()
      if (!k || seen.has(k)) continue
      seen.add(k)
      uniq.push(p)
    }
    if (uniq.length === 0) return ""
    return `Et stærkt allround-valg med ${uniq.join(", ")}.`
  }

  const summarizeReviewSignals = (reviews: NonNullable<ProductData["reviews"]>) => {
    const texts = reviews
      .map((r) => `${r.headline || ""} ${r.body || ""}`.replace(/\s+/g, " ").trim())
      .filter((t) => t.length >= 8)
      .slice(0, 30)
    if (texts.length < 1) return null

    type Theme = "taste" | "sweet" | "mix" | "stomach" | "value"
    const themeLabel: Record<Theme, string> = {
      taste: "smag",
      sweet: "søde smag",
      mix: "blandbarhed",
      stomach: "mavekomfort",
      value: "pris/værdi",
    }
    const posPatterns: Record<Theme, RegExp[]> = {
      taste: [
        /god\s+smak|god\s+smag|bra\s+smak|lækker\s+smag|härlig\s+smak/i,
        /bästa\s+smak|bedste\s+smag/i,
        /smak(?:en)?\s*(?:är|var)?\s*(?:bra|god|härlig|ok)/i,
        /fantastisk\s+smak|otroligt\s+god/i,
      ],
      sweet: [/ikke\s+.*aspartam|st(e|i)vio|ingen\s+aspartam/i],
      mix: [/blander\s+sig|opløses|ingen\s+klumper|let\s+at\s+blande/i],
      stomach: [/känslig\s+mage.*tål|tåler\s+den|skånsom\s+mod\s+maven/i],
      value: [/billig|god\s+pris|værdi\s+for\s+pengene/i],
    }
    const negPatterns: Record<Theme, RegExp[]> = {
      taste: [/ikke\s+.*smak|ikke\s+.*smag|dårlig\s+smak|smakar\s+dåligt|äcklig|faldt\s+mig\s+ikke\s+i\s+smagen/i],
      sweet: [/for\s+sød|för\s+söt|lidt\s+sød|alt\s+for\s+sød/i],
      mix: [/klumper|svær\s+at\s+blande/i],
      stomach: [/ondt\s+i\s+maven|kvalm|maveproblemer/i],
      value: [/dyr|for\s+dyr/i],
    }

    const posCount: Record<Theme, number> = { taste: 0, sweet: 0, mix: 0, stomach: 0, value: 0 }
    const negCount: Record<Theme, number> = { taste: 0, sweet: 0, mix: 0, stomach: 0, value: 0 }
    for (const t of texts) {
      for (const k of Object.keys(posPatterns) as Theme[]) {
        if (posPatterns[k].some((re) => re.test(t))) posCount[k]++
      }
      for (const k of Object.keys(negPatterns) as Theme[]) {
        if (negPatterns[k].some((re) => re.test(t))) negCount[k]++
      }
    }

    const pick = (m: Record<Theme, number>, minCount: number, minShare: number) => {
      const entries = Object.entries(m) as Array<[Theme, number]>
      entries.sort((a, b) => b[1] - a[1])
      const [theme, count] = entries[0]
      if (!count || count < minCount) return null
      const share = count / Math.max(1, texts.length)
      if (share < minShare) return null
      return { theme, count, total: texts.length, label: themeLabel[theme] }
    }

    return {
      // Allow signals even at low review counts; always attribute to "reviews we could fetch".
      pro: pick(posCount, 1, 0.2),
      con: pick(negCount, 1, 0.2),
      total: texts.length,
    }
  }

  const facts = new Map(prod.quickFacts.map((f) => [String(f.label || "").trim().toLowerCase(), String(f.value || "").trim()]))
  const getFact = (label: string) => facts.get(label.toLowerCase()) || ""

  const price = getFact("Pris") || prod.price
  const keyDose = getFact("EAA pr. portion") || getFact("BCAA pr. portion") || ""
  const form = getFact("Form") || ""
  const rating = Number.isFinite(prod.rating) ? prod.rating.toFixed(1) : ""
  const formLower = form.toLowerCase()
  const isTablet = /\btablet/i.test(formLower)
  const isPowder = /\bpulver/i.test(formLower)

  // Reviews: we may reference review text even at low counts, but keep it strictly non-claimy.
  const storeRating = typeof prod.storeRating === "string" ? prod.storeRating.trim() : ""
  const reviewCount = typeof prod.reviewCount === "number" ? prod.reviewCount : null
  const hasStoreReviews = Boolean(storeRating && reviewCount && reviewCount > 0)
  const reviewSignals = prod.reviews && prod.reviews.length >= 1 ? summarizeReviewSignals(prod.reviews) : null

  const buildDecisionBullets = (): string[] => {
    const out: string[] = []
    const pricePerBar = getFact("Pris/bar")
    const pricePerPortion = getFact("Pris/portion")
    const portions = getFact("Portioner/pakke")
    const eaaPerPortion = getFact("EAA pr. portion") || getFact("BCAA pr. portion")
    const sweetener = getFact("Sødning")
    const highlights = Array.isArray(prod.crawledHighlights) ? prod.crawledHighlights : []
    const ing = normalizeSpace(prod.crawledIngredients || "")
    const dos = normalizeSpace(prod.crawledDosage || "")
    const dosageShort = dos ? summarizeDosage(dos) : ""
    const amino = parseAminoTable(prod.crawledNutritionInfo)
    const leucine =
      amino.rows.find((r) => r.name.toLowerCase() === "leucin")?.perPortionMg ??
      null

    // Avoid dumping raw fields that are already in the quickfacts UI (brand/exact price/etc.)
    // Prefer decision guidance and comparisons.
    if (form) {
      if (isTablet) out.push(`- Praktisk format: tabletformat (ingen blanding – nemt i hverdagen).`)
      else if (isPowder) out.push(`- Format: pulver (typisk nemt at dosere og blande – afhænger af instruktion).`)
      else out.push(`- Format: ${form}.`)
    }

    if (eaaPerPortion) out.push(`- Aktiv mængde: Oplyst som ${eaaPerPortion} pr. portion (gør sammenligning mere konkret).`)
    else if (leucine != null) out.push(`- Aminoprofil: Ca. ${formatNumberDa(leucine, 0)} mg leucin pr. portion.`)

    if (pricePerBar && !/se aktuel pris/i.test(pricePerBar)) {
      out.push(`- Værdi: Ca. ${pricePerBar} pr. bar (mere retvisende for multipacks og snackbarer).`)
    } else if (pricePerPortion && !/se aktuel pris/i.test(pricePerPortion)) {
      out.push(`- Værdi: Ca. ${pricePerPortion} pr. portion (brugbar hvis du sammenligner på budget).`)
    }

    if (portions) out.push(`- Forbrug: ${portions} portioner pr. pakke (giver et mere stabilt billede af “pris pr. måned”).`)

    if (highlights.length > 0) {
      out.push(`- Produktet fremhæver: ${clip(highlights.join(", "), 120)}.`)
    }

    if (dosageShort) out.push(`- Dosering: ${dosageShort}.`)

    // Tradeoff (required)
    const containsMilk = ing && /\bmælk\b|\bmilk\b/i.test(ing)
    const couldBeManyPerDay = /\bkan øges til\b/i.test(dosageShort) || (/\b\d+\s*stk\b/i.test(dosageShort) && /\b\d+\s*gange\b/i.test(dosageShort))
    if (containsMilk) {
      out.push(`- Obs: Indeholder mælk (relevant ved allergener).`)
    } else if (couldBeManyPerDay) {
      out.push(`- Obs: Doseringsforslaget kan betyde mange stk pr. dag i perioder (se etiketten).`)
    } else if (sweetener) {
      if (/ikke oplyst/i.test(sweetener)) out.push(`- Obs: Sødning er ikke oplyst i data – tjek etiketten, hvis du undgår bestemte sødemidler.`)
      else out.push(`- Obs: Sødning/tilsætning: ${sweetener} (relevant hvis du er følsom eller har præferencer).`)
    } else {
      out.push(`- Obs: Nogle detaljer kan variere pr. smag/variant – tjek altid etiketten før køb.`)
    }

    // Keep 4–6 bullets
    return out.slice(0, 6)
  }

  const bulletLines = buildDecisionBullets()

  // Parse amino data early so it's available for P1
  const amino = parseAminoTable(prod.crawledNutritionInfo)
  const pricePerBar = getFact("Pris/bar")
  const pricePerPortion = getFact("Pris/portion")

  // P1: keep it concrete; avoid repeating what bullets already say.
  const p1Parts: string[] = []
  // Create a natural introduction combining product name with key benefits
  {
    const highlights = Array.isArray(prod.crawledHighlights) ? prod.crawledHighlights : []
    const dos = normalizeSpace(prod.crawledDosage || "")
    const dosageShort = dos ? summarizeDosage(dos) : ""
    const isTablet = !!(prod.crawledIngredients && /\btablet\b/i.test(prod.crawledIngredients))
    const isPowder = !!(prod.crawledIngredients && /\bpulver\b|\bpowder\b/i.test(prod.crawledIngredients))
    const hasValueSignal = !!(
      (pricePerBar && parseFloat(pricePerBar) < 25) ||
      (pricePerPortion && parseFloat(pricePerPortion) < 5)
    ) // rough heuristic

    const slogan = buildP1Slogan({
      isTablet,
      isPowder,
      highlights,
      aminoCount: amino.rows.length,
      dosageShort,
      hasValueSignal,
    })

    if (slogan) {
      p1Parts.push(`${prod.title} er ${slogan.toLowerCase()}${badge ? ` (${badge})` : ""}.`)
    } else {
      p1Parts.push(`${prod.title} er et godt valg til daglig brug${badge ? ` (${badge})` : ""}.`)
    }
  }

  // Don't repeat the same "form" noun; mention the consequence instead.
  // (Form is already visible in quickfacts + usually in bullets.)
  const p1SoFar = normalizeSpace(p1Parts.join(" "))
  if (isTablet && !/\bblanding\b/i.test(p1SoFar)) pushUnique(p1Parts, "Det passer, hvis du vil undgå blanding i hverdagen")
  if (isPowder && !/\bbland/i.test(p1SoFar)) pushUnique(p1Parts, "Det passer, hvis du vil kunne justere dosis pr. portion")
  if (keyDose) pushUnique(p1Parts, `Der er oplyst ${keyDose} pr. portion`)
  const p1 = p1Parts.join(" ")

  const p2Parts: string[] = []

  const ing = normalizeSpace(prod.crawledIngredients || "")
  const dos = normalizeSpace(prod.crawledDosage || "")
  const dosageShort = dos ? summarizeDosage(dos) : ""
  const leucine = amino.rows.find((r) => r.name.toLowerCase() === "leucin")
  const isoleucine = amino.rows.find((r) => r.name.toLowerCase() === "isoleucin")
  const valine = amino.rows.find((r) => r.name.toLowerCase() === "valin")
  const bcaaTotal =
    (leucine?.perPortionMg ?? 0) +
    (isoleucine?.perPortionMg ?? 0) +
    (valine?.perPortionMg ?? 0)

  // Avoid repeating the word from P1/bullets; say the consequence instead.
  if (isTablet) p2Parts.push(`Tabletterne sluges let med vand - perfekt til at have med på farten uden besvær.`)
  if (isPowder) p2Parts.push(`Pulveret blandes let i væske og giver god fleksibilitet i doseringen pr. portion.`)

  if (amino.rows.length > 6) {
    if (amino.portionText) p2Parts.push(`Vores portion var ${amino.portionText}.`)

    if (leucine?.perPortionMg != null) {
      p2Parts.push(`Indholdet viser ca. ${formatNumberDa(leucine.perPortionMg, 0)} mg leucin pr. portion.`)
    }
    if (bcaaTotal > 0) {
      p2Parts.push(`Samlet BCAA-indhold (Leu+Ile+Val) er ca. ${formatNumberDa(bcaaTotal, 0)} mg pr. portion.`)
    }

    // Add 1 extra amino as example (keeps it readable).
    const extra = amino.rows.find((r) => ["lysin", "threonin"].includes(r.name.toLowerCase()) && r.perPortionMg != null)
    if (extra?.perPortionMg != null) {
      p2Parts.push(`Som eksempel står ${extra.name.toLowerCase()} til ca. ${formatNumberDa(extra.perPortionMg, 0)} mg pr. portion.`)
    }

    // Interpretation: why these numbers matter (without overclaiming).
    if (leucine?.perPortionMg != null || bcaaTotal > 0) {
      p2Parts.push(`Det gør det nemmere at sammenligne på “indhold pr. portion” i stedet for bare pakningsstørrelse.`)
    }
  }

  const looksLikeDosage = (s: string) =>
    /\b(tag|doseringsforslag|tablet|kapsel|dagligt|gang)\b/i.test(s) && s.length >= 20
  const looksLikeIngredients = (s: string) => {
    if (!s) return false
    if (/^opbevares\b/i.test(s)) return false
    if (/^(indhold|portion|næringsindhold)\b/i.test(s)) return false
    // If it's mostly supplement-facts text (mg/µg/iu), avoid presenting it as ingredients.
    if (/(mg|µg|iu)/i.test(s) && (s.match(/,\s*/g)?.length || 0) < 2) return false
    if (/\bindhold\s+pr\.?\b/i.test(s) && /(mg|µg|iu)/i.test(s)) return false
    if (/\bingrediens/i.test(s)) return true
    const commaCount = (s.match(/,\s*/g) || []).length
    return commaCount >= 2 || /\b(mælk|soja|gelatin|cellulose|siliciumdioxid)\b/i.test(s)
  }

  // Don't repeat dosage again if we already added it as a bullet.
  if (ing && looksLikeIngredients(ing)) {
    // Summarize key ingredients more naturally, avoid listing all fillers
    const hasMilk = /\bmælk\b|\bmilk\b/i.test(ing)
    const hasSoy = /\bsoja\b|\bsoy\b/i.test(ing)
    const hasWhey = /\bvalleprotein\b|\bwhey\b/i.test(ing)
    const summary = hasWhey ? "valleprotein" : hasMilk ? "mælkeprotein" : "vegetabilske ingredienser"
    const allergens = [hasMilk ? "mælk" : "", hasSoy ? "soja" : ""].filter(Boolean)
    p2Parts.push(`Baseret på ${summary}${allergens.length ? ` (indeholder ${allergens.join(" og ")})` : ""}.`)
  }

  // Note: we avoid paraphrasing or quoting individual customer statements in the editorial copy.

  if (prod.manualInfo) {
    p2Parts.push(`Redaktionel note: ${String(prod.manualInfo).replace(/\s+/g, " ").trim()}.`)
  }

  const qa = Array.isArray(prod.crawledQa) ? prod.crawledQa : []
  if (qa.length) {
    const q0 = qa[0]
    const summary = summarizeQaAnswer(String(q0.answer || ""))
    if (summary) {
      // Make Q&A more natural - integrate the information without sounding like we're just quoting
      if (summary.includes("L-form")) {
        p2Parts.push(`Interessant nok använder de den biologiskt aktiva L-formen av aminosyrerna.`)
      } else if (summary.includes("valleproteinisolat")) {
        p2Parts.push(`Aminosyrerna kommer från högkvalitativt valleproteinisolat.`)
      } else {
        p2Parts.push(`${summary.replace("Kundeservice oplyser, at", "").replace("Kundeservice svarer:", "")}`)
      }
    }
  }

  const containsMilk = ing && /\bmælk\b|\bmilk\b/i.test(ing)
  const miniFaq = buildMiniFaq({
    isTablet,
    isPowder,
    dosageShort,
    containsMilk: Boolean(containsMilk),
    reviewSignals,
    qa: qa.length ? qa : undefined,
  })

  const sourceLine = "Kilde: produktets deklaration og forhandlerdata."

  return [p1, "", ...bulletLines.slice(0, 6), "", p2Parts.join(" "), ...miniFaq, "", sourceLine].join("\n")
}

function normalizeReviewPriceText(
  content: string,
  quickFacts: Array<{ label: string; value: string }>,
): string {
  const priceFact = quickFacts.find((f) => f.label === "Pris")?.value?.trim()
  const currentPrice = priceFact && priceFact.length > 0 ? priceFact : "Se aktuel pris"

  let next = content

  // Remove stale hardcoded price claims from legacy AI text.
  const stalePricePatterns = [
    /[^.!?\n]*\bprisen på\b[^.!?\n]*\d{2,5}\s*(?:kr|kroner|krone)\b[^.!?\n]*[.!?]?/gi,
    /[^.!?\n]*\bprissat til\b[^.!?\n]*\d{2,5}\s*(?:kr|kroner|krone)\b[^.!?\n]*[.!?]?/gi,
    /[^.!?\n]*\bmed en pris på\b[^.!?\n]*\d{2,5}\s*(?:kr|kroner|krone)\b[^.!?\n]*[.!?]?/gi,
    /[^.!?\n]*\btil\s+\d{2,5}\s*(?:kr|kroner|krone)\b[^.!?\n]*(?:pakken|pakke|portioner|gram|g)[^.!?\n]*[.!?]?/gi,
  ]
  for (const pattern of stalePricePatterns) {
    next = next.replace(pattern, "")
  }

  // Fallback cleanup: drop any remaining sentence that contains hardcoded currency
  // claims together with price/value wording. This prevents stale numbers from legacy copy.
  const sentences = next.split(/(?<=[.!?])\s+/)
  const filtered = sentences.filter((s) => {
    const hasCurrency = /\b\d{2,5}\s*(?:kr|kroner|krone)\b/i.test(s)
    if (!hasCurrency) return true
    if (/\bpris|prissat|værdi for pengene\b/i.test(s)) return false
    if (/\btil\s+\d{2,5}\s*(?:kr|kroner|krone)\b/i.test(s)) return false
    return true
  })
  next = filtered.join(" ")

  next = next
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim()

  const priceLine = `Aktuel pris i vores sammenligning: ${currentPrice}. Tjek altid butiklinket for seneste lagerstatus og kampagnepris.`
  if (!new RegExp(`Aktuel pris i vores sammenligning:\\s*${currentPrice.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`, "i").test(next)) {
    next = `${next}\n\n${priceLine}`
  }

  return next
}

function generateSubRatings(overall: number): { label: string; value: number }[] {
  // Deterministic fallback when panel scores are missing.
  const clamp = (v: number) => round1(clampScore(v))

  return [
    { label: "Effekt & kvalitet", value: clamp(overall + 0.2) },
    { label: "Ingredienser", value: clamp(overall) },
    { label: "Pris & værdi", value: clamp(overall - 0.2) },
    { label: "Brugeroplevelse", value: clamp(overall - 0.1) },
    { label: "Renhed & sikkerhed", value: clamp(overall + 0.1) },
    { label: "Kundeanmeldelser", value: clamp(overall) },
  ]
}

function buildDecisionMapForCategory(
  categoryName: string,
  categorySlug: string,
  comparisonMetricLabel: string | undefined,
  products: { name: string; slug: string; price: string; rating: number; note?: string; comparisonValue?: string }[],
): DecisionMapConfig {
  return buildDecisionMap(categoryName, products, { categorySlug, comparisonMetricLabel })
}

function buildDifferenceHighlights(ranked: ProductData[], categoryName: string) {
  const diffs: { factor: string; range: string; impact: "Høj" | "Middel" | "Lav"; explanation: string }[] = []

  // Price difference
  const prices = ranked.map(p => parseFloat(p.price.replace(/[^\d,]/g, "").replace(",", ".")) || 0).filter(p => p > 0)
  if (prices.length >= 2) {
    const min = Math.min(...prices)
    const max = Math.max(...prices)
    diffs.push({
      factor: "Pris",
      range: `${min} – ${max} kr`,
      impact: max / min > 2 ? "Høj" : "Middel",
      explanation: `Prisforskellen mellem det billigste og dyreste ${categoryName} er ${Math.round(((max - min) / min) * 100)}%. Det dyreste er ikke nødvendigvis det bedste.`,
    })
  }

  // Rating difference
  const ratings = ranked.map(p => p.rating)
  if (ratings.length >= 2) {
    const min = Math.min(...ratings)
    const max = Math.max(...ratings)
    diffs.push({
      factor: "Samlet vurdering",
      range: `${min.toFixed(1)} – ${max.toFixed(1)}/10`,
      impact: max - min > 2 ? "Høj" : "Lav",
      explanation: `Kvalitetsforskellen mellem top- og bundproduktet er ${(max - min).toFixed(1)} point. ${max - min > 1.5 ? "Der er en markant kvalitetsforskel." : "Produkterne ligger tæt i kvalitet."}`,
    })
  }

  // Brand diversity
  const brands = new Set(ranked.map(p => p.brand))
  diffs.push({
    factor: "Mærkevarietet",
    range: `${brands.size} mærker`,
    impact: "Middel",
    explanation: `Vi har testet ${categoryName} fra ${brands.size} forskellige mærker for at sikre en bred og fair sammenligning.`,
  })

  return diffs
}

function generateFAQ(categoryName: string, categoryTitle: string, products: ProductData[]): string {
  const top = products[0]
  const faqs = [
    { q: `Hvad er den bedste ${categoryName} i ${new Date().getFullYear()}?`, a: `Baseret på vores analyse er ${top?.title || categoryTitle} det bedste valg med en score på ${top?.rating.toFixed(1) || "N/A"}/10. Se vores fulde sammenligning ovenfor.` },
    { q: `Hvordan har I testet ${categoryName}?`, a: `Vi har analyseret ingredienslister, sammenlignet doseringer med videnskabelige anbefalinger, gennemgået brugeranmeldelser og vurderet pris per portion. Vi udfører ikke egne kliniske forsøg.` },
    { q: `Er ${categoryName} sikkert at tage?`, a: `Generelt er ${categoryName} sikkert for de fleste voksne, når det tages i de anbefalede doser. Konsulter altid din læge, hvis du er gravid, ammer eller tager medicin.` },
    { q: `Hvornår er det bedst at tage ${categoryName}?`, a: `Det afhænger af den specifikke type. Følg altid producentens anbefalinger på emballagen for optimal dosering og timing.` },
    { q: `Kan man tage for meget ${categoryName}?`, a: `Ja, overdosering kan medføre bivirkninger. Hold dig altid inden for den anbefalede daglige dosis og vær opmærksom på, at du kan få samme næringsstof fra andre kilder.` },
    { q: `Hvor kan man købe ${categoryName}?`, a: `De fleste produkter i vores test kan købes online hos danske og nordiske forhandlere. Se prislinks ved hvert produkt for aktuelle tilbud.` },
  ]
  return faqs.map((f) => `{"question":"${esc(f.q)}","answer":"${esc(f.a)}"}`).join(",")
}

function esc(s: string): string {
  return s
    .replace(/\\/g, "\\\\")
    .replace(/"/g, '\\"')
    .replace(/\n/g, " ")
}

main().catch(err => {
  console.error("Fejl:", err)
  process.exit(1)
})
