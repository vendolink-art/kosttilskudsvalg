/**
 * rewrite-product-content.ts
 *
 * Rewrites product `content.mdx` bodies using the new editorial template:
 *   1 short paragraph → 3–5 bullets → 1 paragraph
 *
 * This is intentionally conservative:
 * - preserves frontmatter
 * - only rewrites when `source_url` exists and crawled data is found
 *
 * Run:
 *   npx tsx scripts/rewrite-product-content.ts
 *   npx tsx scripts/rewrite-product-content.ts --limit 50
 */

import { promises as fs } from "fs"
import path from "path"
import matter from "gray-matter"
import * as dotenv from "dotenv"
dotenv.config({ path: ".env.local" })

import type { CrawledProductForContent } from "../src/lib/product-content-template"
import { buildDisplayProductTitle, extractPackSizeFromTitle, normalizeDisplayProductTitle } from "../src/lib/product-titles"
import {
  buildProductReviewPromptDk,
  PRODUCT_REVIEW_SYSTEM_PROMPT_DK,
} from "../src/lib/prompts/product-content-dk"

const PRODUCT_CONTENT_DIR = path.join(process.cwd(), "src", "app", "(da)", "kosttilskud", "produkter")
const CRAWLED_PRODUCTS_DIR = path.join(process.cwd(), "content", "crawled-products")
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || ""
const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-5.4"
const OPENAI_ENDPOINT = "https://api.openai.com/v1/chat/completions"
const DEFAULT_CONCURRENCY = 4

const STORE_DISPLAY_NAMES: Record<string, string> = {
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

function cleanText(input?: string): string {
  return String(input || "").replace(/\s+/g, " ").trim()
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

function formatStoreName(store?: string): string {
  const raw = cleanText(store).toLowerCase()
  return STORE_DISPLAY_NAMES[raw] || cleanText(store) || "Butik"
}

function normalizeStoreNamesInGeneratedContent(input: string): string {
  let out = String(input || "")
  for (const [raw, label] of Object.entries(STORE_DISPLAY_NAMES)) {
    const escaped = raw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
    out = out.replace(new RegExp(`>(\\s*)${escaped}(\\s*)<`, "gi"), `>$1${label}$2<`)
    out = out.replace(new RegExp(`(\\bButik\\b[^<\\n]{0,20}:\\s*)${escaped}\\b`, "gi"), `$1${label}`)
  }
  return out
}

function resolveEditorialTitle(crawled: CrawledProductForContent, titleOverride?: string): string {
  const override = normalizeDisplayProductTitle(cleanText(titleOverride || ""))
  if (override) return override
  const rawTitle = cleanText(crawled.name)
  return buildDisplayProductTitle(rawTitle, {
    brand: cleanText(crawled.brand),
    contextText: `${cleanText(crawled.fullDescription)} ${cleanText(crawled.description)}`,
  })
}

function buildProductInfoBlob(crawled: CrawledProductForContent, titleOverride?: string): string {
  const rawTitle = cleanText(crawled.name)
  const title = resolveEditorialTitle(crawled, titleOverride)
  const packSize = cleanText((crawled as any).size) || extractPackSizeFromTitle(rawTitle)
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

  return [
    `Navn: ${title}`,
    `Pakningsstørrelse: ${packSize}`,
    `Brand: ${cleanText(crawled.brand)}`,
    `Pris: ${cleanText(crawled.price)}`,
    `Butik: ${formatStoreName(crawled.store)}`,
    `Beskrivelse: ${cleanText(crawled.description)}`,
    `Udvidet beskrivelse: ${cleanText(crawled.fullDescription)}`,
    `Ingredienser: ${cleanText(crawled.ingredients)}`,
    `Næringsinfo: ${cleanText(crawled.nutritionInfo)}`,
    `Dosering: ${cleanText((crawled as any).dosage)}`,
    `Smage/varianter: ${cleanText(((crawled as any).flavors || []).join(", "))}`,
    `Kundeomtaler (udpluk):\n${reviewSample || "- Ingen omtaler tilgængelige i input"}`,
  ].join("\n")
}

async function generateProductContentWithAI(
  crawled: CrawledProductForContent,
  context: { comparisonTopic: string; awardContext: string; keyword?: string; productName?: string },
  retries = 2,
): Promise<string> {
  const editorialTitle = resolveEditorialTitle(crawled, context.productName)
  const userPrompt = buildProductReviewPromptDk({
    keyword: cleanText(context.keyword) || editorialTitle || "produktet",
    productName: editorialTitle || "Produkt",
    comparisonTopic: cleanText(context.comparisonTopic) || "denne kategori",
    awardContext: cleanText(context.awardContext) || "et af vores topvalg",
    productInfo: buildProductInfoBlob(crawled, editorialTitle),
  })

  for (let attempt = 0; attempt <= retries; attempt++) {
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
        if (attempt < retries && (res.status === 429 || res.status >= 500)) {
          await new Promise((r) => setTimeout(r, 1500 * (attempt + 1)))
          continue
        }
        throw new Error(`OpenAI ${res.status}: ${err.slice(0, 180)}`)
      }

      const json = (await res.json()) as any
      const content = normalizeStoreNamesInGeneratedContent(
        normalizeHtmlForMdx(String(json?.choices?.[0]?.message?.content || "").trim()),
      )
      if (content) return content
      throw new Error("Tomt AI-svar")
    } catch (e) {
      if (attempt >= retries) throw e
      await new Promise((r) => setTimeout(r, 1200 * (attempt + 1)))
    }
  }
  return ""
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

async function findCrawledBySourceUrl(targetUrl: string): Promise<CrawledProductForContent | null> {
  const target = canonicalUrl(targetUrl)
  async function walk(dir: string): Promise<CrawledProductForContent | null> {
    let entries: Array<{ name: string; isDirectory: () => boolean }>
    try {
      entries = (await fs.readdir(dir, { withFileTypes: true })) as any
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
        if (source && source === target) return parsed as CrawledProductForContent
      } catch {
        // ignore malformed file
      }
    }
    return null
  }
  return walk(CRAWLED_PRODUCTS_DIR)
}

async function buildCrawledIndex(): Promise<Map<string, CrawledProductForContent>> {
  const index = new Map<string, CrawledProductForContent>()

  async function walk(dir: string): Promise<void> {
    let entries: Array<{ name: string; isDirectory: () => boolean }>
    try {
      entries = (await fs.readdir(dir, { withFileTypes: true })) as any
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
        const parsed = JSON.parse(raw) as CrawledProductForContent & { sourceUrl?: string }
        const source = typeof parsed?.sourceUrl === "string" ? canonicalUrl(parsed.sourceUrl) : ""
        if (source && !index.has(source)) index.set(source, parsed)
      } catch {
        // ignore malformed file
      }
    }
  }

  await walk(CRAWLED_PRODUCTS_DIR)
  return index
}

function parseArgInt(flag: string): number | null {
  const idx = process.argv.indexOf(flag)
  if (idx === -1) return null
  const raw = process.argv[idx + 1]
  const n = raw ? parseInt(raw, 10) : NaN
  return Number.isFinite(n) ? n : null
}

function parseArgString(flag: string): string | null {
  const idx = process.argv.indexOf(flag)
  if (idx === -1) return null
  const raw = process.argv[idx + 1]
  return raw ? String(raw).trim() : null
}

function parseArgList(flag: string): string[] {
  const raw = parseArgString(flag)
  if (!raw) return []
  return raw
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
}

type RewriteResult = {
  slug: string
  rewritten: boolean
  skipped: boolean
  missingCrawled: boolean
  aiGenerated: boolean
}

async function rewriteSingleProduct(
  slug: string,
  crawledIndex: Map<string, CrawledProductForContent>,
  context: { comparisonTopicArg: string | null; awardContextArg: string | null; keywordArg: string | null },
): Promise<RewriteResult> {
  const file = path.join(PRODUCT_CONTENT_DIR, slug, "content.mdx")
  let raw = ""
  try {
    raw = await fs.readFile(file, "utf8")
  } catch {
    console.log(`skipped ${slug} (missing content file)`)
    return { slug, rewritten: false, skipped: true, missingCrawled: false, aiGenerated: false }
  }

  const parsed = matter(raw)
  const sourceUrl = typeof parsed.data?.source_url === "string" ? parsed.data.source_url : ""
  if (!sourceUrl) {
    console.log(`skipped ${slug} (missing source_url)`)
    return { slug, rewritten: false, skipped: true, missingCrawled: false, aiGenerated: false }
  }

  const crawled = crawledIndex.get(canonicalUrl(sourceUrl)) || null
  if (!crawled) {
    console.log(`skipped ${slug} (missing crawled product)`)
    return { slug, rewritten: false, skipped: false, missingCrawled: true, aiGenerated: false }
  }

  const editorialTitle =
    normalizeDisplayProductTitle(cleanText(String(parsed.data?.title || ""))) ||
    buildDisplayProductTitle(cleanText(crawled.name), {
      brand: cleanText(crawled.brand),
      contextText: `${cleanText(crawled.fullDescription)} ${cleanText(crawled.description)}`,
    }) ||
    slug.replace(/-/g, " ")

  let nextContent = ""
  try {
    nextContent = await generateProductContentWithAI(crawled, {
      comparisonTopic: context.comparisonTopicArg || String(parsed.data?.category || "kategorien"),
      awardContext: context.awardContextArg || String(parsed.data?.award || "et af vores topvalg"),
      keyword: context.keywordArg || editorialTitle,
      productName: editorialTitle,
    })
  } catch (e: any) {
    console.error(`  ✗ ${slug}: AI-generering fejlede (${e?.message || "ukendt fejl"})`)
    return { slug, rewritten: false, skipped: true, missingCrawled: false, aiGenerated: false }
  }

  const nextRaw = matter.stringify(nextContent, parsed.data || {})

  if (nextRaw.trim() === raw.trim()) {
    console.log(`skipped ${slug} (unchanged)`)
    return { slug, rewritten: false, skipped: true, missingCrawled: false, aiGenerated: true }
  }

  await fs.writeFile(file, nextRaw, "utf8")
  console.log(`rewritten ${slug}`)
  return { slug, rewritten: true, skipped: false, missingCrawled: false, aiGenerated: true }
}

async function main() {
  const limit = parseArgInt("--limit")
  const onlySlug = parseArgString("--slug")
  const slugList = parseArgList("--slugs")
  const comparisonTopicArg = parseArgString("--comparison-topic")
  const awardContextArg = parseArgString("--award-context")
  const keywordArg = parseArgString("--keyword")
  const concurrency = Math.max(1, parseArgInt("--concurrency") || DEFAULT_CONCURRENCY)

  const dirs = await fs.readdir(PRODUCT_CONTENT_DIR, { withFileTypes: true })
  const availableSlugs = dirs
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .sort()
  const requestedSlugs = slugList.length > 0
    ? slugList.filter((slug, index) => slug && slugList.indexOf(slug) === index)
    : availableSlugs
  const filtered = onlySlug ? requestedSlugs.filter((s) => s === onlySlug) : requestedSlugs
  const selected = limit ? filtered.slice(0, Math.max(0, limit)) : filtered

  let rewritten = 0
  let skipped = 0
  let missingCrawled = 0
  let aiGenerated = 0
  if (!OPENAI_API_KEY) {
    console.error("OPENAI_API_KEY mangler. Produktcontent-generering kræver GPT-mallen.")
    process.exit(1)
  }
  console.log(`AI-generering aktiv med model: ${OPENAI_MODEL}`)
  console.log(`Udvalgte produkter: ${selected.length} | concurrency: ${concurrency}`)

  const crawledIndex = await buildCrawledIndex()
  console.log(`Crawled index entries: ${crawledIndex.size}`)

  const sharedContext = { comparisonTopicArg, awardContextArg, keywordArg }
  let nextIndex = 0
  const workers = Array.from({ length: Math.min(concurrency, selected.length || 1) }, async () => {
    while (true) {
      const currentIndex = nextIndex
      nextIndex += 1
      if (currentIndex >= selected.length) return
      const result = await rewriteSingleProduct(selected[currentIndex], crawledIndex, sharedContext)
      if (result.rewritten) rewritten += 1
      if (result.skipped) skipped += 1
      if (result.missingCrawled) missingCrawled += 1
      if (result.aiGenerated) aiGenerated += 1
    }
  })
  await Promise.all(workers)

  console.log(
    `Done. rewritten=${rewritten} skipped=${skipped} missing_crawled=${missingCrawled} ai_generated=${aiGenerated} total=${selected.length}`,
  )
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})

