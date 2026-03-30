import { promises as fs } from "fs"
import path from "path"

type CrawledProduct = {
  sourceUrl?: string
  name?: string
  brand?: string
  price?: string
  priceNumeric?: number
  size?: string
  highlights?: string[]
  ingredients?: string
  dosage?: string
  nutritionInfo?: string
}

type ProductInput = {
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

type ArticleInput = {
  keyword: string
  secondaryKeywords: string[]
  category: string
  categorySlug: string
  year: number
  products: ProductInput[]
  bestOverall?: string
  bestBudget?: string
  bestPremium?: string
  bestAlternative?: string
  alternativeLabel?: string
}

const BUY_LINKS_FILE = path.join(process.cwd(), "content", "product-buy-links.json")
const CRAWLED_DIR = path.join(process.cwd(), "content", "crawled-products")
const SECTION_OUTPUT_DIR = path.join(process.cwd(), "content", "category-sections")

function parseArg(flag: string): string | null {
  const idx = process.argv.indexOf(flag)
  if (idx === -1) return null
  return process.argv[idx + 1] || null
}

function clean(input?: string): string {
  return String(input || "").replace(/\s+/g, " ").trim()
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

async function findCrawledBySourceUrl(targetUrl: string): Promise<CrawledProduct | null> {
  const target = canonicalUrl(targetUrl)
  async function walk(dir: string): Promise<CrawledProduct | null> {
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
        const parsed = JSON.parse(raw) as CrawledProduct
        const source = parsed.sourceUrl ? canonicalUrl(parsed.sourceUrl) : ""
        if (source && source === target) return parsed
      } catch {
        // Ignore malformed files
      }
    }
    return null
  }
  return walk(CRAWLED_DIR)
}

function parseServings(size: string): number {
  const m = clean(size).match(/(\d{1,4})/)
  if (!m) return 30
  const n = Number(m[1])
  if (!Number.isFinite(n) || n <= 0) return 30
  return n
}

function toProductInput(crawled: CrawledProduct): ProductInput {
  const name = clean(crawled.name) || "Produkt"
  const size = clean(crawled.size)
  const dosage = clean(crawled.dosage)
  const highlights = Array.isArray(crawled.highlights) ? crawled.highlights.map(clean).filter(Boolean) : []
  const ingredients = clean(crawled.ingredients)
  const nutrition = clean(crawled.nutritionInfo)
  const activeIngredients = clean([highlights.slice(0, 3).join(", "), ingredients.slice(0, 180), nutrition.slice(0, 140)].filter(Boolean).join(" | ")) || "Se produktets deklaration"
  const servings = parseServings(size)
  const priceValue = crawled.priceNumeric
  const price = Number.isFinite(priceValue) ? `${priceValue} kr` : clean(crawled.price)
  const perDay = Number.isFinite(priceValue) && servings > 0 ? `${(priceValue as number / servings).toFixed(2)} kr` : ""

  return {
    name,
    type: size || "kosttilskud",
    activeIngredients,
    dosePerServing: dosage || "Følg producentens anvisning",
    servingsPerPackage: servings,
    pricePerDailyDose: perDay || undefined,
    price: price || "Se aktuel pris",
    targetGroup: "Træning og performance",
    certifications: "",
    pros: highlights.slice(0, 3),
    cons: [],
  }
}

async function readSseFullMdx(
  url: string,
  cookie: string,
  payload: ArticleInput,
): Promise<{ fullMdx: string; sections: Record<string, string> }> {
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: cookie,
    },
    body: JSON.stringify(payload),
  })
  if (!res.ok || !res.body) {
    const t = await res.text().catch(() => "")
    throw new Error(`Generate failed ${res.status}: ${t.slice(0, 200)}`)
  }

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ""
  let fullMdx = ""
  const sections: Record<string, string> = {}

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split("\n\n")
    buffer = lines.pop() || ""
    for (const line of lines) {
      if (!line.startsWith("data: ")) continue
      try {
        const evt = JSON.parse(line.slice(6)) as {
          type?: string
          fullMdx?: string
          section?: string
          heading?: string
          content?: string
        }
        if (evt.type === "progress") {
          console.log(`  - Genererer: ${evt.heading || evt.section}`)
        }
        if (evt.type === "section" && evt.section && typeof evt.content === "string") {
          sections[evt.section] = String(evt.content || "").trim()
        }
        if (evt.type === "complete" && evt.fullMdx) {
          fullMdx = evt.fullMdx
        }
      } catch {
        // Ignore malformed SSE events
      }
    }
  }

  if (!fullMdx.trim()) throw new Error("No complete fullMdx returned")
  return { fullMdx, sections }
}

async function main() {
  const categorySlug = parseArg("--category-slug") || "kreatin"
  const keyword = parseArg("--keyword") || "kreatin"
  const sectionPath = parseArg("--section-path") || "protein-traening"
  const alternativeLabel = parseArg("--alternative-label") || undefined
  const publishDirect = process.argv.includes("--publish-direct")
  const slugsArg = parseArg("--slugs")
  if (!slugsArg) {
    console.error("Usage: npx tsx scripts/regenerate-category-via-api.ts --slugs slug1,slug2,... [--category-slug kreatin] [--keyword kreatin] [--section-path protein-traening]")
    process.exit(1)
  }
  const slugs = slugsArg.split(",").map((s) => s.trim()).filter(Boolean)
  if (!slugs.length) {
    console.error("No valid slugs passed to --slugs")
    process.exit(1)
  }

  const rawLinks = await fs.readFile(BUY_LINKS_FILE, "utf8")
  const buyLinks = JSON.parse(rawLinks) as Record<string, string>
  const products: ProductInput[] = []
  for (const slug of slugs) {
    const url = clean(buyLinks[slug])
    if (!url) throw new Error(`No buy link found for slug: ${slug}`)
    const crawled = await findCrawledBySourceUrl(url)
    if (!crawled) throw new Error(`No crawled product found for URL: ${url}`)
    products.push(toProductInput(crawled))
  }

  const payload: ArticleInput = {
    keyword,
    secondaryKeywords: [`bedste ${keyword}`, `${keyword} bedst i test`, `${keyword} test`],
    category: "Kosttilskud",
    categorySlug,
    year: new Date().getFullYear(),
    products,
    bestOverall: products[0]?.name,
    bestPremium: products[1]?.name,
    bestBudget: products[2]?.name,
    bestAlternative: products[4]?.name,
    alternativeLabel,
  }

  const adminUser = process.env.ADMIN_USERNAME || "admin"
  const adminPass = process.env.ADMIN_PASSWORD || "rnvsQt25"
  const loginRes = await fetch("http://localhost:3000/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: adminUser, password: adminPass }),
  })
  if (!loginRes.ok) throw new Error(`Login failed: ${loginRes.status}`)
  const cookie = loginRes.headers.get("set-cookie") || ""
  if (!cookie) throw new Error("No auth cookie returned from login")

  console.log(`Generating category content for ${categorySlug}...`)
  const { fullMdx, sections } = await readSseFullMdx("http://localhost:3000/api/ai/generate", cookie, payload)

  await fs.mkdir(SECTION_OUTPUT_DIR, { recursive: true })
  const sectionOutPath = path.join(SECTION_OUTPUT_DIR, `${categorySlug}.json`)
  await fs.writeFile(
    sectionOutPath,
    JSON.stringify(
      {
        categorySlug,
        sectionPath,
        keyword,
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
  console.log(`Saved sections: ${sectionOutPath}`)

  if (publishDirect) {
    const publishRes = await fetch("http://localhost:3000/api/category-page/publish", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: cookie,
      },
      body: JSON.stringify({ slug: categorySlug, content: fullMdx, allowLegacyOverwrite: true }),
    })
    if (!publishRes.ok) {
      const t = await publishRes.text().catch(() => "")
      throw new Error(`Publish failed ${publishRes.status}: ${t.slice(0, 200)}`)
    }
    console.log(`Published directly: /kosttilskud/${categorySlug}`)
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})

