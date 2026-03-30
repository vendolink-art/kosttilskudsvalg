export type CrawledProductForContent = {
  sourceUrl?: string
  store?: string
  crawledAt?: string
  name?: string
  brand?: string
  price?: string
  description?: string
  fullDescription?: string
  ingredients?: string
  nutritionInfo?: string
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
  originCountry?: string
  inStock?: boolean
  size?: string
}

import { buildDisplayProductTitle, extractPackSizeFromTitle, normalizeDisplayProductTitle } from "@/lib/product-titles"

type BuildOptions = {
  // Default: include an H1 heading as first line.
  includeHeading?: boolean
  // Default: add a collapsed details-section with "butik data" if present.
  includeDetails?: boolean
}

const DEFAULT_OPTS: Required<BuildOptions> = {
  includeHeading: true,
  // Keep product pages tight: P1 → bullets → P2. Details can be enabled explicitly.
  includeDetails: false,
}

const USER_AGENT_STYLE_DISCLAIMER =
  "Tjek altid etiketten for den aktuelle ingrediensliste, dosering og allergener."

function cleanText(input?: string): string {
  if (!input) return ""
  let out = String(input).replace(/\s+/g, " ").trim()

  // Remove common noisy UI fragments that bleed into crawled text.
  const noisy = [
    "Nødvendige cookies",
    "Funktionelle cookies",
    "Statistik cookies",
    "Marketingcookies",
    "Nyhedsbrev",
    "Trustpilot",
    "Kundesupport",
  ]
  for (const marker of noisy) {
    const idx = out.toLowerCase().indexOf(marker.toLowerCase())
    if (idx > 40) out = out.slice(0, idx).trim()
  }

  // A few crawls end with a dangling "Tag" / "Læs" etc.
  out = out.replace(/\b(Tag|Læs|Læs mere)\s*$/i, "").trim()
  return out
}

function splitSentences(text: string): string[] {
  if (!text) return []
  // Soft split; Danish copy often has long sentences.
  return text
    .split(/(?<=[.!?])\s+|\s+[-–—]\s+/)
    .map((s) => s.trim())
    .filter(Boolean)
}

function isNoisySentence(s: string): boolean {
  const t = s.toLowerCase()
  const raw = s
  const hasEmail = raw.includes("@") && /\.[a-z]{2,}/i.test(raw)
  const hasPhone =
    /\+\d{1,3}\s*\d/.test(raw) ||
    /\b\d{8}\b/.test(raw.replace(/\s+/g, "")) ||
    /\b\d{2}\s?\d{2}\s?\d{2}\s?\d{2}\b/.test(raw)
  // Common e-commerce boilerplate that should never become "editorial" text.
  return (
    hasEmail ||
    hasPhone ||
    t.includes("pakkeshop") ||
    t.includes("hjemmelevering") ||
    t.includes("fortrydelsesret") ||
    t.includes("bonus") ||
    t.includes("kontakt os") ||
    t.includes("e-mail") ||
    t.includes("tlf") ||
    t.includes("kundeservice") ||
    t.includes("dao ") ||
    t.includes("levering") ||
    t.includes("fragt") ||
    t.includes("retur") ||
    t.includes("betal") ||
    t.includes("pakke") ||
    t.includes("cookie")
  )
}

function clamp(text: string, maxChars: number): string {
  const t = cleanText(text)
  if (t.length <= maxChars) return t
  return t.slice(0, maxChars).replace(/\s+\S*$/, "").trim() + "…"
}

function inferForm(title: string): string | null {
  const t = title.toLowerCase()
  if (/\b(kapsel|kapsler|caps|capsule|softgel|softgels)\b/.test(t)) return "kapsler"
  if (/\b(tablet|tabletter|tabs|tyggetablet)\b/.test(t)) return "tabletter"
  if (/\b(pulver|powder)\b/.test(t)) return "pulver"
  if (/\b(gummi|gummies)\b/.test(t)) return "gummies"
  if (/\b(olie|oil|dråber|drops|sirup|shot|shots)\b/.test(t)) return "olie/dråber"
  return null
}

function pickIntroText(c: CrawledProductForContent): string {
  const base = cleanText(c.description) || cleanText(c.fullDescription)
  const sentences = splitSentences(base).filter((s) => !isNoisySentence(s))
  if (sentences.length === 0) return ""
  // Keep this readable but a bit longer (user requested longer product copy).
  const first = sentences[0]
  const second = sentences[1] || ""
  const third = sentences[2] || ""
  const combined = third ? `${first} ${second} ${third}` : (second ? `${first} ${second}` : first)

  // Add one concrete datapoint when available (price or store).
  const price = cleanText(c.price)
  const store = cleanText(c.store)
  const tail =
    price && store
      ? `Hos ${store} ligger prisen typisk omkring ${/kr/i.test(price) ? price : `${price} kr`}.`
      : price
        ? `Prisen ligger typisk omkring ${/kr/i.test(price) ? price : `${price} kr`}.`
        : ""

  return clamp(`${combined}${tail ? ` ${tail}` : ""}`, 380)
}

function pickOutroText(c: CrawledProductForContent): string {
  const base = cleanText(c.fullDescription) || cleanText(c.description)
  const sentences = splitSentences(base).filter((s) => !isNoisySentence(s))
  const rawTitle = cleanText(c.name || "Produkt")
  const title = buildDisplayProductTitle(rawTitle, {
    brand: cleanText(c.brand),
    contextText: `${cleanText(c.fullDescription)} ${cleanText(c.description)}`,
  })
  const form = inferForm(rawTitle)

  // Try to locate usage/dosage-ish sentences if present.
  const usageHits = sentences.filter((s) =>
    /(anvend|dosering|dosis|bland|rør|portion|indtag|brug|tilbered)/i.test(s),
  )
  let outro = ""
  if (usageHits.length > 0) {
    outro = clamp(usageHits.slice(0, 2).join(" "), 340)
  } else {
    // Safe, non-claimy fallback based on form when the store text is noisy/empty.
    if (form === "pulver") {
      outro = "Som pulver er det typisk nemt at blande i fx smoothie, yoghurt eller grød."
    } else if (form === "kapsler") {
      outro = "Kapsler er typisk nemme at bruge i en daglig rutine og kan tages med vand."
    } else if (form === "tabletter") {
      outro = "Tabletter er typisk nemme at bruge i en daglig rutine og kan tages med vand."
    } else {
      outro = sentences.length > 0 ? clamp(sentences.slice(0, 2).join(" "), 340) : "Produktet er lavet til praktisk daglig brug."
    }
  }
  const store = cleanText(c.store)
  const evidenceLine = "Vores tekst bygger på en sammenligning af produktets oplysninger fra forhandleren."

  const tail = "Pris og lagerstatus kan ændre sig hos butikken."
  return `${outro} ${evidenceLine} ${USER_AGENT_STYLE_DISCLAIMER} ${tail}`.replace(/\s+/g, " ").trim()
}

type Bullet = { label: string; value: string }

function buildBullets(c: CrawledProductForContent): Bullet[] {
  const rawTitle = cleanText(c.name || "Produkt")
  const title = buildDisplayProductTitle(rawTitle, {
    brand: cleanText(c.brand),
    contextText: `${cleanText(c.fullDescription)} ${cleanText(c.description)}`,
  })
  const form = inferForm(rawTitle)
  const size = cleanText(c.size || "") || extractPackSizeFromTitle(rawTitle)
  const brand = cleanText(c.brand)
  let price = cleanText(c.price)
  if (price && /^\d+(?:[.,]\d+)?$/.test(price)) price = `${price} kr`
  const store = cleanText(c.store)
  const origin = cleanText(c.originCountry)
  const bullets: Bullet[] = []
  if (form) bullets.push({ label: "Form", value: form })
  if (size) bullets.push({ label: "Størrelse", value: size })
  if (brand) bullets.push({ label: "Mærke", value: brand })
  if (origin) bullets.push({ label: "Oprindelse", value: origin })
  if (price) bullets.push({ label: "Pris", value: price })
  if (store) bullets.push({ label: "Butik", value: store })

  // Keep 4–6 bullets, prefer the most user-relevant.
  const priority = new Map<string, number>([
    ["Form", 1],
    ["Størrelse", 2],
    ["Mærke", 3],
    ["Pris", 4],
    ["Oprindelse", 5],
    ["Butik", 6],
  ])
  bullets.sort((a, b) => (priority.get(a.label) ?? 99) - (priority.get(b.label) ?? 99))

  const unique = new Map<string, Bullet>()
  for (const b of bullets) {
    if (!unique.has(b.label) && b.value) unique.set(b.label, b)
  }
  const out = [...unique.values()].slice(0, 6)
  if (out.length < 4) {
    // Ensure we always have at least 4 scannable facts.
    if (!unique.has("Pris") && price) out.push({ label: "Pris", value: price })
    if (out.length < 3 && store) out.push({ label: "Butik", value: store })
  }
  return out.slice(0, 6)
}

function hasAnyDetails(c: CrawledProductForContent): boolean {
  return Boolean(
    cleanText(c.ingredients) ||
      cleanText(c.nutritionInfo) ||
      cleanText(c.storeCategory) ||
      cleanText(c.sourceUrl) ||
      cleanText(c.store) ||
      cleanText(c.crawledAt),
  )
}

function addDetailsSection(lines: string[], c: CrawledProductForContent): void {
  const ingredients = cleanText(c.ingredients)
  const nutrition = cleanText(c.nutritionInfo)
  const category = cleanText(c.storeCategory)
  const store = cleanText(c.store)
  const sourceUrl = cleanText(c.sourceUrl)
  const crawledAt = cleanText(c.crawledAt)
  lines.push(`<details>`)
  lines.push(`<summary>Detaljer fra butikken</summary>`)
  lines.push(``)

  // Keep headings for SEO, but behind a fold for UX.
  if (ingredients) {
    lines.push(`## Ingredienser`)
    lines.push(``)
    lines.push(clamp(ingredients, 900))
    lines.push(``)
  }

  if (nutrition) {
    lines.push(`## Indhold og dosering`)
    lines.push(``)
    lines.push(clamp(nutrition, 900))
    lines.push(``)
  }

  if (category) {
    lines.push(`## Butiksdata`)
    lines.push(``)
    if (store) lines.push(`- **Butik:** ${store}`)
    if (category) lines.push(`- **Butikskategori:** ${category}`)
    lines.push(``)
  }

  if (sourceUrl || crawledAt) {
    lines.push(`## Kilde`)
    lines.push(``)
    if (sourceUrl) lines.push(`- **Produkt-URL:** ${sourceUrl}`)
    if (crawledAt) lines.push(`- **Senest crawlet:** ${crawledAt.slice(0, 19)}`)
    lines.push(``)
  }

  lines.push(`</details>`)
  lines.push(``)
}

export function buildProductContentFromCrawled(
  crawled: CrawledProductForContent,
  opts?: BuildOptions,
): string {
  const o = { ...DEFAULT_OPTS, ...(opts || {}) }
  const rawTitle = cleanText(crawled.name || "Produkt")
  const title = buildDisplayProductTitle(rawTitle, {
    brand: cleanText(crawled.brand),
    contextText: `${cleanText(crawled.fullDescription)} ${cleanText(crawled.description)}`,
  })

  const intro = pickIntroText(crawled)
  const bullets = buildBullets(crawled)
  const outro = pickOutroText(crawled)

  const lines: string[] = []
  if (o.includeHeading) {
    lines.push(`# ${title}`)
    lines.push("")
  }

  // P1: short context
  if (intro) {
    lines.push(intro)
    lines.push("")
  }

  // Bullets: 3–5 scannable facts
  if (bullets.length > 0) {
    for (const b of bullets) {
      lines.push(`- **${b.label}:** ${b.value}`)
    }
    lines.push("")
  }

  // P2: usage + expectations + light disclaimer
  lines.push(outro)
  lines.push("")

  if (o.includeDetails && hasAnyDetails(crawled)) {
    addDetailsSection(lines, crawled)
  }

  return lines.join("\n")
}

