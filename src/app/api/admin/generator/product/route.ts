import { NextResponse } from "next/server"
import { promises as fs } from "fs"
import type { Dirent } from "fs"
import path from "path"
import matter from "gray-matter"
import { isAuthenticated } from "@/lib/auth"
import {
  buildProductReviewPromptDk,
  PRODUCT_REVIEW_SYSTEM_PROMPT_DK,
} from "@/lib/prompts/product-content-dk"
import type { CrawledProductForContent } from "@/lib/product-content-template"

const PRODUCT_CONTENT_DIR = path.join(process.cwd(), "src", "app", "(da)", "kosttilskud", "produkter")
const CRAWLED_PRODUCTS_DIR = path.join(process.cwd(), "content", "crawled-products")
const OPENAI_ENDPOINT = "https://api.openai.com/v1/chat/completions"

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
    let entries: Dirent[]
    try {
      entries = await fs.readdir(dir, { withFileTypes: true })
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
        // Ignore malformed JSON
      }
    }
    return null
  }
  return walk(CRAWLED_PRODUCTS_DIR)
}

function buildProductInfoBlob(crawled: CrawledProductForContent): string {
  const reviews = Array.isArray(crawled.reviews) ? crawled.reviews : []
  const maybe = crawled as unknown as Record<string, unknown>
  const dosage = cleanText(typeof maybe.dosage === "string" ? maybe.dosage : "")
  const flavors = Array.isArray(maybe.flavors)
    ? maybe.flavors.filter((v): v is string => typeof v === "string")
    : []
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
    `Navn: ${cleanText(crawled.name)}`,
    `Brand: ${cleanText(crawled.brand)}`,
    `Pris: ${cleanText(crawled.price)}`,
    `Butik: ${cleanText(crawled.store)}`,
    `Butiksrating: ${cleanText(crawled.storeRating)}`,
    `Antal anmeldelser: ${typeof crawled.reviewCount === "number" ? crawled.reviewCount : ""}`,
    `Beskrivelse: ${cleanText(crawled.description)}`,
    `Udvidet beskrivelse: ${cleanText(crawled.fullDescription)}`,
    `Ingredienser: ${cleanText(crawled.ingredients)}`,
    `Næringsinfo: ${cleanText(crawled.nutritionInfo)}`,
    `Dosering: ${dosage}`,
    `Smage/varianter: ${cleanText(flavors.join(", "))}`,
    `Kundeomtaler (udpluk):\n${reviewSample || "- Ingen omtaler tilgængelige i input"}`,
  ].join("\n")
}

async function generateProductHtml(args: {
  model: string
  apiKey: string
  crawled: CrawledProductForContent
  keyword: string
  comparisonTopic: string
  awardContext: string
}): Promise<string> {
  const userPrompt = buildProductReviewPromptDk({
    keyword: args.keyword,
    productName: cleanText(args.crawled.name) || "Produkt",
    comparisonTopic: args.comparisonTopic,
    awardContext: args.awardContext,
    productInfo: buildProductInfoBlob(args.crawled),
  })

  const res = await fetch(OPENAI_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${args.apiKey}`,
    },
    body: JSON.stringify({
      model: args.model,
      messages: [
        { role: "system", content: PRODUCT_REVIEW_SYSTEM_PROMPT_DK },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.6,
      max_completion_tokens: 3600,
    }),
  })

  if (!res.ok) {
    const errText = await res.text().catch(() => "")
    throw new Error(`OpenAI ${res.status}: ${errText.slice(0, 200)}`)
  }
  const json = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>
  }
  const content = normalizeHtmlForMdx(String(json.choices?.[0]?.message?.content || "").trim())
  if (!content) throw new Error("Tomt svar från OpenAI")
  return content
}

type ProductGenerateRequest = {
  slug?: string
  save?: boolean
  keyword?: string
  comparisonTopic?: string
  awardContext?: string
}

export async function POST(request: Request) {
  const authenticated = await isAuthenticated()
  if (!authenticated) {
    return NextResponse.json({ error: "Ikke autoriseret" }, { status: 401 })
  }

  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: "OPENAI_API_KEY mangler i .env.local" }, { status: 500 })
  }

  try {
    const body = (await request.json()) as ProductGenerateRequest
    const slug = cleanText(body?.slug)
    const save = Boolean(body?.save)
    const comparisonTopic = cleanText(body?.comparisonTopic) || "denne kategori"
    const awardContext = cleanText(body?.awardContext) || "et af vores topvalg"

    if (!slug) {
      return NextResponse.json({ error: "slug er påkrævet" }, { status: 400 })
    }

    const filePath = path.join(PRODUCT_CONTENT_DIR, slug, "content.mdx")
    const raw = await fs.readFile(filePath, "utf8")
    const parsed = matter(raw)
    const sourceUrl = cleanText(parsed.data?.source_url)
    if (!sourceUrl) {
      return NextResponse.json({ error: "source_url mangler i frontmatter for produktet" }, { status: 400 })
    }

    const crawled = await findCrawledBySourceUrl(sourceUrl)
    if (!crawled) {
      return NextResponse.json({ error: "Ingen crawled data fundet for source_url" }, { status: 404 })
    }

    const keyword = cleanText(body?.keyword) || cleanText(crawled.name) || slug.replace(/-/g, " ")
    const model = process.env.OPENAI_MODEL || "gpt-5.4"
    const generatedHtml = await generateProductHtml({
      model,
      apiKey,
      crawled,
      keyword,
      comparisonTopic,
      awardContext,
    })

    if (save) {
      const nextRaw = matter.stringify(generatedHtml, parsed.data || {})
      await fs.writeFile(filePath, nextRaw, "utf8")
    }

    return NextResponse.json({
      ok: true,
      slug,
      saved: save,
      model,
      sourceUrl,
      generatedHtml,
    })
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Fejl i produktgenerator"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

