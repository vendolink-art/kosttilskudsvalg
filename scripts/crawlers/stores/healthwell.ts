import type { StoreCrawler, CrawledProduct, CrawledReview } from "../types"
import { load, text, meta, extractPrice, emptyProduct, resolveUrl } from "../base-parser"

export const healthwell: StoreCrawler = {
  storeId: "healthwell",
  domains: ["healthwell.dk", "www.healthwell.dk"],
  needsJs: true,
  waitForSelector: "h1, .product-info, #t-ddesc",
  preCaptureActions: [
    // Healthwell loads nutrition/ingredients in the Næringsindhold tab.
    { type: "click", selector: "#t-ddesc", waitForSelector: "#ddesc .nutri, #ddesc .h" },
    // Ensure product description content is present as well.
    { type: "click", selector: "#t-pdesc", waitForSelector: "#pdesc .description, #pdesc .editor" },
    // Load reviews tab so we can parse review bodies.
    { type: "click", selector: "#t-reviews", waitForSelector: "#yotpo-reviews-main-widget, .yotpo-widget-instance" },
  ],

  parse(html: string, url: string): CrawledProduct {
    const $ = load(html)
    const p = emptyProduct(url, "healthwell")

    // ── JSON-LD Product (primary source) ───────────────
    const jsonLd = extractJsonLd($)

    // Name
    p.name = jsonLd?.name || text($("h1")) || meta($, "og:title")

    // Brand
    p.brand = jsonLd?.brand?.name || text($("[itemprop='brand']")) || ""

    // Price – JSON-LD has _main_price or offers[].price
    const mainPrice = jsonLd?._main_price
    const firstOffer = Array.isArray(jsonLd?.offers) ? jsonLd.offers[0] : jsonLd?.offers
    const offerPrice = firstOffer?.price || firstOffer?.lowPrice
    const jsonPrice = mainPrice || offerPrice || ""

    // Fallback: HTML price from <div class="price"> or <div class="c-p-price">
    const htmlPrice = text($("div.price").first()) || text($(".c-p-price").first())
    const { price, priceNumeric } = extractPrice(
      jsonPrice ? String(jsonPrice) : htmlPrice || meta($, "product:price:amount")
    )
    p.price = price
    p.priceNumeric = priceNumeric
    p.currency = firstOffer?.priceCurrency || meta($, "product:price:currency") || "DKK"

    // Images – JSON-LD image + product images in HTML (skip truncated URLs)
    const imgCandidates = [
      typeof jsonLd?.image === "string" ? jsonLd.image : jsonLd?.image?.[0],
      meta($, "og:image"),
      $("[itemprop='image']").first().attr("src") || $("[itemprop='image']").first().attr("content"),
    ].filter((u): u is string => typeof u === "string" && u.length > 20)
    p.imageUrl = resolveUrl(url, imgCandidates[0] || "")

    // Collect variant images from offers
    if (Array.isArray(jsonLd?.offers)) {
      for (const offer of jsonLd.offers) {
        if (offer.image) {
          const src = resolveUrl(url, offer.image)
          if (src && !p.images.includes(src)) p.images.push(src)
        }
      }
    }

    // Collect HTML product images
    $("[class*='products-images'] img, .product-gallery img, .product-images img").each((_, el) => {
      const src = resolveUrl(url, $(el).attr("src") || $(el).attr("data-src") || "")
      if (src && !p.images.includes(src)) p.images.push(src)
    })
    if (p.imageUrl && !p.images.includes(p.imageUrl)) p.images.unshift(p.imageUrl)

    // Description/content blocks (use explicit product tabs first)
    const pageDescription = text($(
      [
        "#pdesc .description",
        "#pdesc .editor",
        "#pdesc",
        ".listing-description",
        "[itemprop='description']",
        ".product-description",
        ".product-info-text",
        ".product-text",
        ".descr.standardized-description-text",
        ".standardized-description-text",
        "[class*='standardized-description-text']",
      ].join(", ")
    ))
    p.description = sanitizeContentText(jsonLd?.description || meta($, "og:description") || meta($, "description") || "")
    p.fullDescription = sanitizeContentText(pageDescription || p.description)

    // Category
    p.storeCategory = jsonLd?.category || ""
    if (!p.storeCategory) {
      p.storeCategory = $(".breadcrumb a, .breadcrumbs a").map((_, el) => text($(el))).get().join(" > ")
    }

    // Origin country (Oprindelsesland)
    p.originCountry = extractOriginCountry($, p.fullDescription) || ""

    // Size – try to extract from name or variant labels
    const sizeMatch = p.name.match(/(\d+(?:\.\d+)?\s*(?:g|kg|ml|l|kapsler|tabletter|caps|stk))/i)
    if (sizeMatch) p.size = sizeMatch[1]
    if (!p.size) p.size = normalizeSizeText(text($(".product-size, .product-weight, .variant-label").first()))

    // Stock
    const avail = firstOffer?.availability || meta($, "product:availability") || ""
    p.inStock = !avail.toLowerCase().includes("outofstock")

    // EAN
    p.ean = firstOffer?.gtin13 || jsonLd?.gtin13 || firstOffer?.mpn || ""

    // Ingredients / nutrition (strictly from nutrition tab, avoid cookie/menu text)
    const ingredientsFromSelectors = text($(
      [
        "#ddesc .editor",
        "#ddesc",
        ".ingredients",
        ".product-ingredients",
        "#ingredients",
        "[class*='ingredient']",
        "[id*='ingredient']",
        "[class*='varedeklaration']",
      ].join(", ")
    ))
    
    const ddescText = sanitizeContentText(text($("#ddesc .acc-c .editor, #ddesc .box, #ddesc").first()))

    // Try to find "Ingredienser:" and grab the following text in nutrition tab
    let extractedIngredients = ""
    const ingMatch = ddescText.match(/Ingredienser\s*:?\s*([^]*?)(?:Vigtigt\s*:|$)/i)
    if (ingMatch) {
      extractedIngredients = ingMatch[1].trim()
    }

    // Try to find "Anvendelse:" or "Dosering:"
    const extractedDosage = extractInlineSection(
      ddescText,
      /(?:Doseringsforslag|Anvendelse|Dosering)\s*:?\s*/i,
      /(?:Ingredienser|Vigtigt)\s*:?\s*/i,
    )

    p.dosage = sanitizeContentText(extractedDosage)

    const labeledIngredients = [
      extractLabeledBlock(ddescText, "Varedeklaration", ["BEMÆRK", "Information om allergener", "Opbevaring", "Indhold per"]),
      extractLabeledBlock(p.fullDescription, "Information om allergener", ["Opbevaring", "Indhold per"]),
      extractLabeledBlock(p.fullDescription, "Opbevaring", ["Indhold per"]),
    ].filter(Boolean).join(" ")
    
    p.ingredients = sanitizeContentText(
      extractedIngredients
        || [ingredientsFromSelectors, labeledIngredients].filter(Boolean).join(" ")
        || extractLinesByKeyword(ddescText, /(ingrediens|varedeklaration|allergen|opbevaring)/i)
    )

    const nutritionFromTab =
      text($("#ddesc .nutri").first())
      || text($("#ddesc table.nutri").first())
      || text($("#ddesc table").first())
    p.nutritionInfo = sanitizeContentText(
      nutritionFromTab
      || extractNutritionTables($)
      || extractLinesByKeyword(ddescText, /(indhold per|næring|nutrition|dosis|mg|µg|iu)/i)
    )

    // Rating from JSON-LD
    const rating = jsonLd?.aggregateRating
    if (rating) {
      p.storeRating = `${rating.ratingValue}/${rating.bestRating || 5}`
      p.reviewCount = parseInt(rating.reviewCount || rating.ratingCount || "0")
    }

    // Reviews - Yotpo or JSON-LD
    let parsedReviews = extractReviewsFromJsonLd(jsonLd);
    
    // Try to extract reviews from HTML if JSON-LD is empty or we want to supplement
    if (parsedReviews.length === 0) {
       $('.yotpo-review, .review-content, [itemprop="review"]').each((_, el) => {
           const block = sanitizeContentText(text($(el)))
           const authorMatch = block.match(/^[A-ZÆØÅ]\s*([A-Za-zÆØÅæøå]+)/)
           const authorRaw = text($(el).find('.yotpo-user-name, .author, [itemprop="author"]')) || (authorMatch?.[1] || "")
           const author = authorRaw.replace(/Verificeret.*$/i, "").trim()
           const body = text($(el).find('.yotpo-review-content, .review-body, .text, [itemprop="reviewBody"]'));
           const headline = text($(el).find('.yotpo-review-title, .review-title, [itemprop="name"]'));
           const date = text($(el).find('.yotpo-review-date, .date, [itemprop="datePublished"]')).replace(/^Udgivelsesdato/i, "").trim();
           
           if (body || headline) {
               parsedReviews.push({
                   author: author || "Anonym",
                   ratingValue: null,
                   bestRating: null,
                   datePublished: date,
                   headline: headline.slice(0, 200),
                   body: body.slice(0, 800)
               });
           }
       });
    }
    
    p.reviews = parsedReviews.map((r) => ({
      ...r,
      author: String(r.author || "").replace(/Verificeret.*$/i, "").trim(),
      datePublished: String(r.datePublished || "").replace(/^Udgivelsesdato/i, "").trim(),
    }))

    // Highlights
    try {
        const descSel = [".product-info-text", ".product-description", "#product-description", "#pdesc ul li"].join(", ")
        const root = $(descSel).first()
        const items = root.find("ul li").map((_, el) => sanitizeContentText(text($(el)))).get()
        const seen = new Set<string>()
        const uniq = items.filter((s) => {
          const k = s.toLowerCase()
          if (!k || k.length < 3) return false
          if (seen.has(k)) return false
          seen.add(k)
          return true
        })
        if (uniq.length) p.highlights = uniq.slice(0, 8)

        // Healthwell also uses a dash-separated teaser block above the selectors.
        if (!p.highlights || !p.highlights.length) {
          const teaser = sanitizeContentText(text($(".listing-description").first()))
          const teaserBullets = teaser
            .split(/\s+-\s+/)
            .map((s) => sanitizeContentText(s))
            .filter((s) => s.length > 3 && !/^VLCD$/i.test(s) && !/shake til vægttab/i.test(s))
          if (teaserBullets.length) p.highlights = teaserBullets.slice(0, 8)
        }
    } catch {
        // optional
    }

    p.highlights = (p.highlights || [])
      .map((h) => sanitizeContentText(h))
      .filter((h) => h.length > 3 && !/^VLCD$/i.test(h) && !/^(?:shake til vægttab\.?)$/i.test(h))
      .slice(0, 8)

    // Size/flavor values are rendered in selectable attributes.
    const selectedSize = [
      text($("#sb-select14 .selected").first()),
      text($("#sb-select14 option[selected]").first()),
      text($("[id^='value-'].selected").first()),
    ]
      .map((value) => normalizeSizeText(value))
      .find(Boolean)
    if (selectedSize) p.size = selectedSize
    const flavorCandidates = $("#sb-select1 [id^='value-'], #sb-select1 .selected")
      .map((_, el) => sanitizeContentText(text($(el))))
      .get()
      .filter(Boolean)
    if (flavorCandidates.length) {
      const seen = new Set<string>()
      p.flavors = flavorCandidates.filter((f) => {
        const key = f.toLowerCase()
        if (seen.has(key)) return false
        seen.add(key)
        return true
      })
    }

    return p
  },
}

function extractReviewsFromJsonLd(jsonLd: any): CrawledReview[] {
  const raw = jsonLd?.review
  const list = Array.isArray(raw) ? raw : raw ? [raw] : []
  if (list.length === 0) return []

  const out: CrawledReview[] = []
  for (const r of list) {
    if (!r || typeof r !== "object") continue
    const rr = (r as any).reviewRating || (r as any).aggregateRating || null
    const ratingValueRaw = rr?.ratingValue ?? rr?.value ?? null
    const bestRatingRaw = rr?.bestRating ?? null
    const ratingValue = typeof ratingValueRaw === "number" ? ratingValueRaw : (ratingValueRaw ? Number(String(ratingValueRaw).replace(",", ".")) : null)
    const bestRating = typeof bestRatingRaw === "number" ? bestRatingRaw : (bestRatingRaw ? Number(String(bestRatingRaw).replace(",", ".")) : null)
    const author =
      typeof (r as any).author === "string"
        ? (r as any).author
        : (r as any).author?.name || ""
    const headline = String((r as any).headline || "").trim()
    const body = String((r as any).reviewBody || (r as any).description || "").trim()
    const datePublished = String((r as any).datePublished || "").trim()

    const compactBody = body.replace(/\s+/g, " ").trim()
    if (!compactBody && !headline) continue

    out.push({
      author: String(author || "").trim(),
      ratingValue: Number.isFinite(ratingValue as any) ? (ratingValue as number) : null,
      bestRating: Number.isFinite(bestRating as any) ? (bestRating as number) : null,
      datePublished,
      headline: headline.slice(0, 200),
      body: compactBody.slice(0, 800),
    })
    if (out.length >= 20) break
  }
  return out
}

function extractJsonLd($: ReturnType<typeof load>): any {
  try {
    const scripts = $('script[type="application/ld+json"]')
    for (let i = 0; i < scripts.length; i++) {
      const raw = $(scripts[i]).html()
      if (!raw) continue
      const obj = JSON.parse(raw)
      if (obj["@type"] === "Product") return obj
      if (obj?.["@graph"]?.find?.((n: any) => n["@type"] === "Product")) {
        return obj["@graph"].find((n: any) => n["@type"] === "Product")
      }
    }
  } catch { /* ignore */ }
  return null
}

function extractInlineSection(source: string, start: RegExp, stop: RegExp): string {
  if (!source) return ""
  const mStart = source.match(start)
  if (!mStart || mStart.index == null) return ""
  const rest = source.slice(mStart.index + mStart[0].length)
  const mStop = rest.match(stop)
  const chunk = mStop && mStop.index != null ? rest.slice(0, mStop.index) : rest
  return chunk.trim()
}

function sanitizeContentText(input: string): string {
  if (!input) return ""
  let out = input.replace(/\s+/g, " ").trim()
  out = out
    .replace(/Køb nu,\s*betal inden 30 dage/gi, " ")
    .replace(/Hurtig og sikker betaling/gi, " ")
    .replace(/fra \d+\s*DKK/gi, " ")
    .replace(/Nem betaling/gi, " ")
    .replace(/1-3 dages leveringstid/gi, " ")
    .replace(/20 ?% rabat på dit første køb!?/gi, " ")
    .replace(/Få nyheder, eksklusive tilbud,?/gi, " ")
  const noisyMarkers = [
    "Andre købte også",
    "Vi anbefaler",
    "Instagram",
    "Trustpilot",
    "Nyhedsbrev",
    "Kundesupport",
    "Inspiration",
  ]
  for (const marker of noisyMarkers) {
    const idx = out.toLowerCase().indexOf(marker.toLowerCase())
    if (idx > 0) out = out.slice(0, idx).trim()
  }
  const sentenceLike = out.split(/(?<=[.!?])\s+|(?<=\*)\s+|(?<=:)\s+/)
  const seen = new Set<string>()
  const deduped: string[] = []
  for (const s of sentenceLike) {
    const norm = s.trim().toLowerCase()
    if (!norm || norm.length < 3) continue
    if (seen.has(norm)) continue
    seen.add(norm)
    deduped.push(s.trim())
  }
  return deduped.join(" ").replace(/\s+/g, " ").trim()
}

function extractLinesByKeyword(textBlock: string, keyword: RegExp): string {
  if (!textBlock) return ""
  const chunks = textBlock.split(/(?<=[.!?])\s+|(?<=:)\s+/)
  const hits = chunks.filter((c) => keyword.test(c))
  return sanitizeContentText(hits.slice(0, 25).join(" "))
}

function extractNutritionTables($: ReturnType<typeof load>): string {
  const blocks: string[] = []
  $("table").each((_, el) => {
    const t = text($(el))
    if (!t) return
    if (/(indhold per|næring|nutrition|vitamin|mineral|mg|µg|kcal|protein|kulhydrat|fedt)/i.test(t)) {
      blocks.push(t)
    }
  })
  return sanitizeContentText(blocks.join(" "))
}

function normalizeSizeText(value: string): string {
  const s = sanitizeContentText(value)
  if (!s) return ""
  const exact = s.match(/\b\d+(?:[.,]\d+)?\s*(?:g|kg|ml|l|caps|kapsler|tabletter|tabl|stk|portioner)\b/i)
  if (exact) return exact[0]
  return s.replace(/\b\d+(?:[.,]\d+)?\s*(?:kr|dkk)\b.*$/i, "").trim()
}

function extractLabeledBlock(source: string, label: string, stopLabels: string[]): string {
  if (!source) return ""
  const stop = stopLabels.map((s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")
  const re = new RegExp(`${label}\\s*:\\s*(.+?)(?=(${stop})\\s*:|$)`, "i")
  const m = source.match(re)
  return m?.[1]?.trim() || ""
}

function extractOriginCountry($: ReturnType<typeof load>, contentText: string): string {
  const candidates = [
    contentText || "",
    text($("body")) || "",
  ]
  for (const raw of candidates) {
    const t = String(raw || "").replace(/\s+/g, " ").trim()
    if (!t) continue
    const m = t.match(/\boprindelsesland\b\s*:?\s*([a-zæøåA-ZÆØÅ][a-zæøåA-ZÆØÅ \-]{1,40})/i)
    if (m) return cleanOrigin(m[1])
    const m2 = t.match(/\bcountry of origin\b\s*:?\s*([a-zA-Z][a-zA-Z \-]{1,40})/i)
    if (m2) return cleanOrigin(m2[1])
  }
  return ""
}

function cleanOrigin(raw: string): string {
  let out = String(raw || "").replace(/\s{2,}/g, " ").trim()
  out = out.split(/\b(?:produktets|ingrediens|nærings|emballage)\b/i)[0].trim()
  const parts = out.split(/\s+/).filter(Boolean).slice(0, 3)
  return parts.join(" ")
}
