import { promises as fs } from "fs"
import path from "path"

type SizeOption = {
  grams: number
  price: number
  portions?: number
}

type ProductOverride = {
  price?: string
  sizeOptions?: SizeOption[]
}

const BUY_LINKS_FILE = path.join(process.cwd(), "content", "product-buy-links.json")
const OUTPUT_FILE = path.join(process.cwd(), "content", "product-size-overrides.json")
const CONCURRENCY = 5

function stripHtml(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;|&#160;/gi, " ")
    .replace(/&aring;|&#229;/gi, "å")
    .replace(/&auml;|&#228;/gi, "ä")
    .replace(/&ouml;|&#246;/gi, "ö")
    .replace(/&Auml;|&#196;/gi, "Ä")
    .replace(/&Ouml;|&#214;/gi, "Ö")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, "\"")
    .replace(/&#39;/g, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/\s+/g, " ")
    .trim()
}

function extractSizeOptionsFromCorePage(html: string): SizeOption[] {
  const text = stripHtml(html)
  const sizeIndex = text.search(/st\S{0,3}rrelse|storrelse|storlek|v\S{0,3}lg\s+storlek|v\S{0,3}lg\s+st\S{0,3}rrelse/i)
  if (sizeIndex < 0) return []

  // Keep extraction tightly scoped to the size chooser block.
  const windowText = text.slice(sizeIndex, Math.min(text.length, sizeIndex + 1800))

  const portionsByGrams = new Map<number, number>()
  for (const m of windowText.matchAll(/(\d{2,4})\s*g\s*\((\d{1,3})\s*portioner?\)/gi)) {
    const grams = parseInt(m[1], 10)
    const portions = parseInt(m[2], 10)
    if (Number.isFinite(grams) && Number.isFinite(portions)) {
      portionsByGrams.set(grams, portions)
    }
  }

  const byGrams = new Map<number, SizeOption>()
  for (const m of windowText.matchAll(/(\d{2,4})\s*g(?:\s*\([^)]*\))?\s*(\d{2,5})\s*kr/gi)) {
    const grams = parseInt(m[1], 10)
    const price = parseInt(m[2], 10)
    if (!Number.isFinite(grams) || !Number.isFinite(price)) continue
    if (grams < 100 || grams > 6000) continue
    if (price < 40 || price > 5000) continue

    byGrams.set(grams, {
      grams,
      price,
      portions: portionsByGrams.get(grams),
    })
  }

  const options = [...byGrams.values()].sort((a, b) => a.grams - b.grams)
  if (options.length < 2) return []

  // Plausibility check: larger pack should not be cheaper than smaller.
  for (let i = 1; i < options.length; i++) {
    if (options[i].price < options[i - 1].price) return []
  }
  return options
}

async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T, index: number) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length)
  let index = 0

  async function worker() {
    while (index < items.length) {
      const i = index++
      out[i] = await fn(items[i], i)
    }
  }

  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, () => worker()))
  return out
}

async function main() {
  const rawLinks = await fs.readFile(BUY_LINKS_FILE, "utf-8")
  const buyLinks = JSON.parse(rawLinks.replace(/^\uFEFF/, "")) as Record<string, string>

  let existing: Record<string, ProductOverride> = {}
  try {
    const rawExisting = await fs.readFile(OUTPUT_FILE, "utf-8")
    existing = JSON.parse(rawExisting.replace(/^\uFEFF/, ""))
  } catch {
    // first run
  }

  const targets = Object.entries(buyLinks).filter(([, url]) => /corenutrition\.dk/i.test(url))
  console.log(`Scanning ${targets.length} Core Nutrition links for size options...`)

  const found = await mapLimit(targets, CONCURRENCY, async ([slug, url]) => {
    try {
      const res = await fetch(url, {
        headers: { "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" },
      })
      if (!res.ok) return null
      const raw = Buffer.from(await res.arrayBuffer())
      const htmlUtf8 = raw.toString("utf8")
      const htmlLatin1 = raw.toString("latin1")
      const score = (s: string) => {
        let points = 0
        if (/st.rrelse|storrelse|storlek/i.test(s)) points += 2
        if (/\d+\s*g/i.test(s)) points += 1
        if (/\d+\s*kr/i.test(s)) points += 1
        return points
      }
      const html = score(htmlLatin1) > score(htmlUtf8) ? htmlLatin1 : htmlUtf8
      const sizeOptions = extractSizeOptionsFromCorePage(html)
      if (sizeOptions.length < 2) return null

      return {
        slug,
        override: {
          price: `${sizeOptions[0].price} kr`,
          sizeOptions,
        } satisfies ProductOverride,
      }
    } catch {
      return null
    }
  })

  const next: Record<string, ProductOverride> = { ...existing }
  let updated = 0
  for (const row of found) {
    if (!row) continue
    next[row.slug] = row.override
    updated++
  }

  const sortedKeys = Object.keys(next).sort((a, b) => a.localeCompare(b))
  const sortedObj: Record<string, ProductOverride> = {}
  for (const k of sortedKeys) sortedObj[k] = next[k]

  await fs.writeFile(OUTPUT_FILE, `${JSON.stringify(sortedObj, null, 2)}\n`, "utf-8")

  console.log(`Detected/updated ${updated} products with multi-size options.`)
  console.log(`Saved overrides: ${OUTPUT_FILE}`)
}

main().catch((err) => {
  console.error("Failed:", err)
  process.exit(1)
})
