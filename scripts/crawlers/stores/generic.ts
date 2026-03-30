/**
 * generic.ts
 *
 * Generic store parser that works with most Danish e-commerce sites
 * using Open Graph meta tags, JSON-LD Product schema, and common CSS patterns.
 *
 * Used as fallback and also for: med24, bodystore, corenutrition,
 * protein.dk, mmsportsstore, weightworld, helsegrossisten, bodylab,
 * flowlife, upcare, musclepain
 */

import type { StoreCrawler, CrawledProduct, CrawledReview, CrawledQa } from "../types"
import { load, text, meta, extractPrice, emptyProduct, resolveUrl } from "../base-parser"

interface GenericParserOpts {
  needsJs?: boolean
  waitForSelector?: string
  preCaptureActions?: StoreCrawler["preCaptureActions"]
}

function makeGenericParser(storeId: string, domains: string[], opts?: GenericParserOpts): StoreCrawler {
  return {
    storeId,
    domains,
    needsJs: opts?.needsJs ?? false,
    waitForSelector: opts?.waitForSelector,
    preCaptureActions: opts?.preCaptureActions,
    parse(html: string, url: string): CrawledProduct {
      const $ = load(html)
      const p = emptyProduct(url, storeId)

      // Try JSON-LD Product first (most reliable)
      const jsonLd = extractProductJsonLd($)

      // Name (dedupe if JSON-LD and H1 concatenated)
      const rawName = jsonLd?.name || text($("h1")) || meta($, "og:title") || ""
      p.name = dedupeTitle(rawName)

      // Brand
      p.brand = jsonLd?.brand?.name || jsonLd?.brand || text($("[itemprop='brand']")) || ""

      // Price — be precise: use JSON-LD > itemprop content > first price element
      const offer = Array.isArray(jsonLd?.offers) ? jsonLd.offers[0] : jsonLd?.offers
      const jsonPrice = offer?.price || offer?.lowPrice || jsonLd?._main_price || ""

      // itemprop="price" content="229.00" is the most reliable HTML price
      const itempropPrice = $("[itemprop='price']").first().attr("content") || ""
      // Fallback: first price-looking element (use .first() to avoid grabbing ALL prices)
      const htmlPriceFallback = text($(".product-price, .price, .current-price, .product__price").first())

      const { price, priceNumeric } = extractPrice(
        jsonPrice ? String(jsonPrice) :
          itempropPrice || htmlPriceFallback || meta($, "product:price:amount")
      )
      p.price = price
      p.priceNumeric = priceNumeric
      p.currency = offer?.priceCurrency || meta($, "product:price:currency") || "DKK"
      if (storeId === "corenutrition") {
        const bodyText = sanitizeContentText(text($("body")))
        const selectedPriceRaw = [
          html.match(/Vores\s*pris[\s\S]{0,250}?(\d+(?:[.,]\d+)?)\s*(?:&nbsp;|\s)*kr/i)?.[1],
          bodyText.match(/Vores\s*pris[\s\S]{0,60}?(\d+(?:[.,]\d+)?)\s*kr/i)?.[1],
        ].find(Boolean)
        if (selectedPriceRaw) {
          const selectedPrice = extractPrice(`${selectedPriceRaw} kr`)
          if (selectedPrice.price && selectedPrice.priceNumeric) {
            p.price = selectedPrice.price
            p.priceNumeric = selectedPrice.priceNumeric
          }
        }
      }

      // Images — prefer full URLs (skip truncated ones < 20 chars)
      const imgCandidates = [
        jsonLd?.image?.[0],
        jsonLd?.image,
        meta($, "og:image"),
        $("[itemprop='image']").first().attr("src") || $("[itemprop='image']").first().attr("content"),
        $(".product-image img, .product__image img, .product-gallery img").first().attr("src"),
      ].filter((u): u is string => typeof u === "string" && u.length > 20)

      p.imageUrl = resolveUrl(url, imgCandidates[0] || "")
      // Collect all product images
      const imgSelectors = [
        ".product-images img",
        ".product-gallery img",
        ".gallery img",
        ".product__media img",
        "[data-product-images] img",
        ".slick-slide img",
      ]
      $(imgSelectors.join(", ")).each((_, el) => {
        const src = resolveUrl(url, $(el).attr("src") || $(el).attr("data-src") || $(el).attr("data-lazy") || "")
        if (src && src !== p.imageUrl && !p.images.includes(src)) p.images.push(src)
      })
      if (p.imageUrl && !p.images.includes(p.imageUrl)) p.images.unshift(p.imageUrl)

      // Description/content blocks (includes standardized blocks used by some stores)
      const pageDescription = text($(
        [
          "[itemprop='description']",
          ".product-description",
          ".product-info",
          ".product__description",
          ".product-text",
          "#product-description",
          ".descr.standardized-description-text",
          ".standardized-description-text",
          "[class*='standardized-description-text']",
          "[class*='description']",
        ].join(", ")
      ))
      p.description = sanitizeContentText(jsonLd?.description || meta($, "og:description") || meta($, "description") || "")
      p.fullDescription = sanitizeContentText(pageDescription || p.description)
      if (storeId === "corenutrition") {
        const coreDescription = sanitizeContentText(
          text($("#pdesc .text, #pdesc .editor, #pdesc").first())
        )
        if (coreDescription) {
          p.fullDescription = coreDescription
        }
      }

      // Try to extract short "USPs" from bullet lists in the description area.
      // Many stores (incl. CoreNutrition) include a compact <ul><li>…</li></ul> list.
      try {
        const descSel = [
          "#pdesc",
          "[itemprop='description']",
          ".product-description",
          ".product-long-description",
          ".product-description-wrapper",
          "[data-tab-content='tab-0']",
          ".product__description",
          "#product-description",
          ".descr.standardized-description-text",
          ".standardized-description-text",
        ].join(", ")
        const items = $(descSel)
          .find("ul li")
          .map((_, el) => sanitizeContentText(text($(el))))
          .get()
          .concat(
            $(".product-long-description li, [data-tab-content='tab-0'] li, .item.description li")
              .map((_, el) => sanitizeContentText(text($(el))))
              .get()
          )
        const seen = new Set<string>()
        const uniq = items.filter((s) => {
          const k = s.toLowerCase()
          if (!k || k.length < 3) return false
          if (seen.has(k)) return false
          seen.add(k)
          return true
        })
        if (uniq.length) p.highlights = uniq.slice(0, 8)
      } catch {
        // optional
      }
      if ((!p.highlights || p.highlights.length === 0) && p.fullDescription) {
        const candidates = [
          /Kosttilskud med frie essentielle aminosyrer/i,
          /Extra arginin[^.!?]{0,120}blodtilførsel/i,
          /Stimulerer muskelopbygning[^.!?]{0,120}muskelnedbrydning/i,
          /Findes i [^.!?]{0,80}smagsvarianter/i,
        ]
        const fallback: string[] = []
        const seen = new Set<string>()
        for (const re of candidates) {
          const m = p.fullDescription.match(re)
          const v = sanitizeContentText(m?.[0] || "")
          if (!v) continue
          const k = v.toLowerCase()
          if (seen.has(k)) continue
          seen.add(k)
          fallback.push(v)
        }
        if (fallback.length) p.highlights = fallback
      }

      // Category / breadcrumbs
      p.storeCategory = $(".breadcrumb a, .breadcrumbs a, nav[aria-label='breadcrumb'] a").map((_, el) => text($(el))).get().filter(Boolean).join(" > ")

      // Origin country (Oprindelsesland)
      p.originCountry = extractOriginCountry($, p.fullDescription) || ""

      // Size
      p.size = text($(".product-size, .product-weight, .variant-label, [itemprop='weight']"))
      if (!p.size) {
        const variantSize = extractVariantValuesByLabel($, /(størrelse|storlek|size|vægt|weight)/i)[0]
        if (variantSize) p.size = normalizeSizeText(variantSize)
      }
      if (!p.size) {
        const sizeMatch = p.name.match(/(\d+(?:\.\d+)?\s*(?:g|kg|ml|l|kapsler|kaps|tabletter|tabl|tab|caps|stk|gummies|vingummier|softgels|portioner))/i)
        if (sizeMatch) p.size = sizeMatch[1]
      }

      // Flavor variants (useful structured data for generation)
      const flavorValues = extractVariantValuesByLabel($, /(smag|smaker|flavour|flavor)/i)
      if (flavorValues.length) p.flavors = flavorValues
      if ((!p.flavors || p.flavors.length === 0) && storeId === "mmsportsstore") {
        const scriptFlavors = extractMmsportsFlavors($)
        if (scriptFlavors.length) p.flavors = scriptFlavors
      }

      // Availability
      const avail = offer?.availability || meta($, "product:availability") || ""
      p.inStock = !avail.toLowerCase().includes("outofstock")

      // EAN
      p.ean = jsonLd?.gtin13 || jsonLd?.gtin || jsonLd?.sku || ""

      // Ingredients / nutrition (broad selectors + table fallback)
      const ingredientsFromSelectors = text($(
        [
          ".ingredients",
          ".product-ingredients",
          "#ingredients",
          "[data-ingredients]",
          "[class*='ingredient']",
          "[id*='ingredient']",
          "[class*='varedeklaration']",
        ].join(", ")
      ))
      const labeledIngredients = [
        extractLabeledBlock(p.fullDescription, "Varedeklaration", ["BEMÆRK", "Information om allergener", "Opbevaring", "Indhold per"]),
        extractLabeledBlock(p.fullDescription, "Information om allergener", ["Opbevaring", "Indhold per"]),
        extractLabeledBlock(p.fullDescription, "Opbevaring", ["Indhold per"]),
      ].filter(Boolean).join(" ")
      p.ingredients = sanitizeContentText(
        [ingredientsFromSelectors, labeledIngredients].filter(Boolean).join(" ")
          || extractLinesByKeyword(p.fullDescription, /(ingrediens|varedeklaration|allergen|opbevaring)/i)
      )

      // Some broad selectors match only the heading ("Ingredienser:") without the content.
      if (/^(?:ingredienser|ingredients|varedeklaration)\s*:?\s*$/i.test(p.ingredients.trim())) {
        p.ingredients = ""
      }

      // Dosage / usage (common in supplement fact blocks, especially on CoreNutrition).
      p.dosage = sanitizeContentText(
        extractInlineSection(
          p.fullDescription,
          /(?:Doseringsforslag|Doseringsanvisning|Dosering|Anvendelse)\s*:/i,
          /(Ingrediens(?:er)?\s*:|Information\s*:|BEMÆRK\s*:|Vigtigt\s*:|$)/i
        )
      )
      p.nutritionInfo = sanitizeContentText(
        text($(
          [
            ".nutrition-info",
            ".supplement-facts",
            "#nutrition",
            ".nutrition-table",
            "[class*='nutrition']",
            "[id*='nutrition']",
            ".standardized-description-text table",
          ].join(", ")
        )) || extractNutritionTables($) || extractLinesByKeyword(p.fullDescription, /(indhold per|næring|nutrition|dosis|mg|µg|iu)/i)
      )

      // If store only exposes one large standardized block, keep nutrition/ingredient fallbacks useful.
      if (storeId === "corenutrition") {
        const ddescText = sanitizeContentText(text($("#ddesc .acc-c .editor, #ddesc .box, #ddesc").first()))
        if (ddescText) {
          const coreDosage = sanitizeContentText(
            extractInlineSection(ddescText, /Doseringsforslag\s*:/i, /(Ingredienser\s*:|Vigtigt\s*:|$)/i)
          )
          const coreIngredients = sanitizeContentText(
            extractInlineSection(ddescText, /Ingredienser\s*:/i, /(Vigtigt\s*:|$)/i)
          )
          const coreNutrition = sanitizeContentText(
            text($("#ddesc .nutri").last())
            || text($("#ddesc table.nutri").last())
            || extractLinesByKeyword(ddescText, /(indhold per|næring|nutrition|dosis|mg|µg|iu)/i)
          )
          if (coreDosage) p.dosage = coreDosage
          if (coreIngredients) p.ingredients = coreIngredients
          if (coreNutrition && !/^n[æa]ringsindhold$/i.test(coreNutrition)) p.nutritionInfo = coreNutrition
        }
      }

      if (!p.ingredients && p.fullDescription) {
        const ing = extractInlineSection(p.fullDescription, /Ingredienser\s*:/i, /(Vigtigt\s*:|$)/i)
        p.ingredients = sanitizeContentText(
          ing || extractLinesByKeyword(p.fullDescription, /(ingrediens|varedeklaration|allergen|opbevaring)/i)
        )
      }
      if (!p.nutritionInfo && p.fullDescription) {
        p.nutritionInfo = extractLinesByKeyword(p.fullDescription, /(indhold per|næring|nutrition|dosis|mg|µg|iu)/i)
      }


      if (storeId === "helsegrossisten") {
        const metaDescription = sanitizeContentText(meta($, "description"))
        const shortDescription = sanitizeContentText(
          text($(".product-view .short-description .std, .short-description .std").first())
        )
        const detailDescription = sanitizeContentText(
          text($(".product-collateral #box-description .std, #box-description .std, .box-description .std").first())
        )
        const mainDescription = sanitizeContentText(
          [shortDescription, detailDescription]
            .filter(Boolean)
            .join(" ")
        )
        if (shortDescription && !/^kosttilskud\.?$/i.test(shortDescription)) {
          p.description = shortDescription
        } else if (metaDescription && !/^kosttilskud\.?$/i.test(metaDescription)) {
          p.description = metaDescription
        }
        if (mainDescription) {
          p.fullDescription = mainDescription
        }

        const productScopedText = sanitizeContentText(
          text($(".product-view, .main-container, .col-main").first())
        )
        const mergedText = mainDescription || p.fullDescription || productScopedText

        if ((!p.highlights || p.highlights.length === 0) && (p.description || mergedText)) {
          const fallbackHighlights = fallbackHighlightsFromText(p.description || mergedText)
          if (fallbackHighlights.length) p.highlights = fallbackHighlights
        }

        const helsegrossistenDosage = sanitizeContentText(
          extractInlineSection(
            mergedText,
            /(?:Anbefalet daglig dosis|Anbefalet dosering|Anbefalet Daglig Indtagelse|Daglig dosis)\s*:/i,
            /(N..ringsstoffer og (?:andre )?stoffer|Mulige Anvendelser\s*:|Daglig Balance\s*:|Ofte Stillede[^:]*:|Yderligere information|Opbevaring\s*:|Opbevaringsanvisning\s*:|$)/i
          )
        )
        if (helsegrossistenDosage) p.dosage = helsegrossistenDosage

        const adultDosageMatch = mergedText.match(
          /(Voksne(?: og børn fra \d+\s*år)?)\s*:\s*(.+?)(?=N[æa]ringsstoffer og (?:andre )?stoffer|Mulige Anvendelser\s*:|Daglig Balance\s*:|Ofte Stillede[^:]*:|Yderligere information|Opbevaring\s*:|Opbevaringsanvisning\s*:|$)/i
        )
        if (adultDosageMatch) {
          p.dosage = sanitizeContentText(`${adultDosageMatch[1]}: ${adultDosageMatch[2]}`)
        }

        const helsegrossistenIngredients = sanitizeContentText(
          extractInlineSection(
            mergedText,
            /(?:Ingredienser|Varedeklaration)\s*:/i,
            /(N..ringsstoffer og (?:andre )?stoffer|Mulige Anvendelser\s*:|Daglig Balance\s*:|Ofte Stillede[^:]*:|Opbevaring\s*:|Opbevaringsanvisning\s*:|Yderligere information|$)/i
          )
        )
        if (helsegrossistenIngredients) p.ingredients = helsegrossistenIngredients

        const helsegrossistenNutrition = sanitizeContentText(
          extractHelsegrossistenNutrition(mergedText)
        )
        if (helsegrossistenNutrition) p.nutritionInfo = helsegrossistenNutrition

        const faqPairs = extractFaqPairs(mergedText)
        if (faqPairs.length) {
          p.qa = faqPairs.map((item) => ({
            author: "Helsegrossisten",
            authorLabel: "Butik",
            question: item.question,
            datePublished: "",
            answers: [{ author: "Helsegrossisten", authorTitle: "Butik", datePublished: "", body: item.answer }],
          }))
        }

        const trustpilotMatch = productScopedText.match(/(\d+(?:[.,]\d+)?)\s+baseret p.\s+([\d.]+)\s+anmeldelser/i)
        if (trustpilotMatch) {
          if (!p.storeRating) p.storeRating = trustpilotMatch[1].replace(",", ".")
          if (!p.reviewCount) p.reviewCount = parseInt(trustpilotMatch[2].replace(/\./g, ""), 10) || 0
        }
      }

      if (storeId === "protein-dk") {
        const proteinMain = sanitizeContentText(
          text($("#description .prose, #description .content, #description, section#description").first())
        )
        if (proteinMain && proteinMain.length > 120) {
          p.fullDescription = proteinMain
        }

        const proteinHighlights = (p.fullDescription.match(/✔️\s*[^✔]+/g) || [])
          .map((s) => sanitizeContentText(s.replace(/^✔️\s*/, "")))
          .filter(Boolean)
        if (proteinHighlights.length) {
          p.highlights = proteinHighlights.slice(0, 8)
        }

        const dosage = sanitizeContentText(
          extractInlineSection(
            p.fullDescription,
            /Anvendelse\s*:/i,
            /(Ingrediens(?:er)?\s*:|BEMÆRK\s*:|Opbevaring\s*:|$)/i
          )
        )
        if (dosage) p.dosage = dosage
        if (!p.dosage) {
          const m = p.fullDescription.match(/\b\d+\s*kapsler\s+dagligt\b[^.]{0,120}/i)
          if (m) p.dosage = sanitizeContentText(m[0])
        }
        if (!p.dosage && Array.isArray(p.highlights)) {
          const fromHighlight = p.highlights.find((h) => /\bkapsler\s+dagligt\b/i.test(h))
          if (fromHighlight) p.dosage = sanitizeContentText(fromHighlight)
        }

        const ingredients = sanitizeContentText(
          extractInlineSection(
            p.fullDescription,
            /Ingrediens(?:er)?\s*:/i,
            /(BEMÆRK\s*:|Opbevaring\s*:|Indhold pr\.|$)/i
          )
        )
        if (ingredients) p.ingredients = ingredients

        const nutrition = sanitizeContentText(
          extractInlineSection(
            p.fullDescription,
            /Indhold pr\.\s*[^:]*:/i,
            /(Ingrediens(?:er)?\s*:|BEMÆRK\s*:|Opbevaring\s*:|$)/i
          )
        )
        if (nutrition) p.nutritionInfo = nutrition

        // Avoid storing Alpine/init script blobs as content.
        if (/function\s+initIngredients|fetch\(\s*`?\/rest\/V1\/product\/nutrition/i.test(p.ingredients)) {
          p.ingredients = ""
        }
        if (/function\s+initIngredients|fetch\(\s*`?\/rest\/V1\/product\/nutrition/i.test(p.nutritionInfo)) {
          p.nutritionInfo = ""
        }
        if (/Ingredienser\s*&\s*Næringsindhold/i.test(p.nutritionInfo)) {
          p.nutritionInfo = ""
        }

        if (!p.brand) {
          const m = p.fullDescription.match(/Producent\s*:\s*([^\n.]+)/i)
          if (m) p.brand = sanitizeContentText(m[1])
        }
      }

      if (storeId === "med24") {
        // Med24 product pages expose full ingredient/nutrition data in ".eavData" blocks.
        const med24Main = sanitizeContentText(text($(".productDescription").first()))
        if (med24Main && med24Main.length > 120) {
          p.fullDescription = med24Main
        }

        const flavorCandidates = $(".eavData .contents")
          .map((_, el) =>
            sanitizeContentText(text($(el)))
              .replace(/\s*Indeholder\s*:\s*$/i, "")
              .trim()
          )
          .get()
          .filter(Boolean)
        if (flavorCandidates.length) {
          const uniq = Array.from(new Set(flavorCandidates.map((v) => v.toLowerCase())))
            .map((k) => flavorCandidates.find((v) => v.toLowerCase() === k) as string)
          p.flavors = uniq.slice(0, 20)
        }

        const nutritionChunks: string[] = []
        const ingredientChunks: string[] = []

        $(".eavData > div[data-product-id]").each((_, block) => {
          const $block = $(block)
          const variant = sanitizeContentText(text($block.find(".contents").first()))
            .replace(/\s*Indeholder\s*:\s*$/i, "")
            .trim()
          const nutritionHeader = sanitizeContentText(
            text($block.find(".eavEntity[data-type='nutritionDeclarationHeader']").first())
          )

          const rows: string[] = []
          $block.find("table.nutrition tr").each((__, tr) => {
            const cells = $(tr).find("td")
            const left = sanitizeContentText(text(cells.eq(0)))
            const right = sanitizeContentText(text(cells.eq(1)))
            if (left || right) rows.push(`${left}${right ? ` ${right}` : ""}`.trim())
          })

          const totalContents = sanitizeContentText(text($block.find(".totalContents").first()))
          const nutritionParts = [variant ? `${variant} Indeholder:` : "", nutritionHeader, ...rows, totalContents]
            .filter(Boolean)
          if (nutritionParts.length) nutritionChunks.push(nutritionParts.join(" "))

          const ingredientsLabel = sanitizeContentText(
            text($block.find(".eavEntity[data-type='ingredients'] .eavLabel").first())
          )
          const ingredientsText = sanitizeContentText(
            $block.find(".eavEntity[data-type='ingredients'] p")
              .map((__, pEl) => text($(pEl)))
              .get()
              .join(" ")
          )
          const ingredientsParts = [
            variant ? `${variant} Indeholder:` : "",
            ingredientsLabel || "Ingredienser:",
            ingredientsText,
          ].filter(Boolean)
          if (ingredientsParts.length) ingredientChunks.push(ingredientsParts.join(" "))
        })

        const disclaimer = sanitizeContentText(text($(".eavData .disclaimer").first()))
        if (disclaimer) {
          if (nutritionChunks.length) nutritionChunks.push(disclaimer)
          if (ingredientChunks.length) ingredientChunks.push(disclaimer)
        }

        if (nutritionChunks.length) {
          p.nutritionInfo = sanitizeContentText(nutritionChunks.join(" "))
        }
        if (ingredientChunks.length) {
          p.ingredients = sanitizeContentText(ingredientChunks.join(" "))
        }
      }

      // Store rating
      const rating = jsonLd?.aggregateRating
      if (rating) {
        p.storeRating = `${rating.ratingValue}/${rating.bestRating || 5}`
        p.reviewCount = parseInt(rating.reviewCount || rating.ratingCount || "0")
      }
      if (!p.storeRating) {
        const htmlRating = sanitizeContentText(
          $("[itemprop='ratingValue']").first().attr("content")
          || text($("[itemprop='ratingValue']").first())
        )
        const htmlBest = sanitizeContentText(
          $("[itemprop='bestRating']").first().attr("content")
          || text($("[itemprop='bestRating']").first())
          || "5"
        )
        const rv = Number(String(htmlRating).replace(",", "."))
        const br = Number(String(htmlBest).replace(",", "."))
        if (Number.isFinite(rv) && rv > 0) {
          p.storeRating = `${rv}/${Number.isFinite(br) && br > 0 ? br : 5}`
        }
      }
      if (!p.reviewCount) {
        const htmlCount = sanitizeContentText(
          $("[itemprop='reviewCount']").first().attr("content")
          || text($("[itemprop='reviewCount']").first())
          || $("[itemprop='ratingCount']").first().attr("content")
          || text($("[itemprop='ratingCount']").first())
          || text($(".review-count, .rating-count").first())
        )
        const rc = parseInt(String(htmlCount).replace(/[^\d]/g, ""), 10)
        if (Number.isFinite(rc) && rc >= 0) p.reviewCount = rc
      }
      if (!p.reviewCount && p.fullDescription) {
        const m = p.fullDescription.match(/Baseret på\s*(\d+)\s*anmeldelser/i)
          || p.fullDescription.match(/Anmeldelser\s*\((\d+)\)/i)
        const rc = m ? parseInt(m[1], 10) : NaN
        if (Number.isFinite(rc) && rc >= 0) p.reviewCount = rc
      }

      if (storeId === "mmsportsstore") {
        if (!p.size) {
          const sizeFromOption = sanitizeContentText(
            text($(".single-options .option-item:has(.option-type) .option-name").first())
          )
          const sizeFromText = sizeFromOption.match(/\b\d+(?:[.,]\d+)?\s*(?:g|gram|kg|ml|l|stk|tabletter|kapsler)\b/i)?.[0]
          if (sizeFromText) p.size = sizeFromText
        }
        if (!p.size && p.fullDescription) {
          const m = p.fullDescription.match(/\bStorlek\s*:\s*(\d+(?:[.,]\d+)?\s*(?:g|gram|kg|ml|l))\b/i)
          if (m) p.size = m[1]
        }
        if (p.fullDescription) {
          const ing = extractInlineSection(
            p.fullDescription,
            /Ingrediens(?:er)?\s*:/i,
            /(Indeholder en phenylalaninkilde\.?|BEMÆRK\s*:|Opbevaring\s*:|$)/i
          )
          if (ing) p.ingredients = sanitizeContentText(ing)
        }
      }

      // CoreNutrition: the rendered widget often includes the most accurate count.
      if (storeId === "corenutrition" && p.fullDescription) {
        const m = p.fullDescription.match(
          /Kundeanmeldelser\s*([0-9]+(?:[.,][0-9]+)?)\s*Baseret på\s*(\d+)\s*anmeldelser/i
        )
        if (m) {
          const rv = Number(String(m[1]).replace(",", "."))
          const rc = parseInt(m[2], 10)
          if (Number.isFinite(rv) && rv > 0) p.storeRating = `${rv}/5`
          if (Number.isFinite(rc) && rc >= 0) p.reviewCount = rc
        }
      }

      if (storeId === "weightworld") {
        // WeightWorld: Shopify with accordion sections.
        // Description is in the first .desc_section .accordion__content.rte
        const wwDesc = sanitizeContentText(
          text($(".desc_section .accordion__content.rte").first())
        )
        if (wwDesc && wwDesc.length > 50) {
          p.fullDescription = wwDesc
          if (!p.description || p.description.length < 50) {
            p.description = wwDesc.slice(0, 500)
          }
        }

        // Nutrition table is inside an accordion block with "Næringsindhold" heading.
        let wwNutritionBlock = $("")
        $(".accordion__content.rte").each((_, el) => {
          const t = $(el).text().trim()
          if (/Næringsindhold/i.test(t.slice(0, 40)) && $(el).find("table").length > 0) {
            wwNutritionBlock = $(el)
            return false
          }
        })

        if (wwNutritionBlock.length > 0) {
          // Nutrition: extract from <tbody> rows (name + amount + %NRV)
          const nutritionRows: string[] = []
          let wwDosering = ""
          let wwPortions = ""
          wwNutritionBlock.find("table thead tr, table tbody tr").each((_, tr) => {
            const cells = $(tr).find("td, th")
            const parts: string[] = []
            cells.each((__, td) => {
              const v = $(td).text().replace(/\s+/g, " ").trim()
              if (v) parts.push(v)
            })
            const row = parts.join(" ").trim()
            if (!row) return
            if (/^Dosering\s*:/i.test(row)) wwDosering = row
            else if (/^Portioner\s+pr/i.test(row)) wwPortions = row
            else if (!/^Indhold per|^N.ringsindhold|^%NRV/i.test(row)) {
              nutritionRows.push(row)
            }
          })
          const nutritionText = nutritionRows.join(", ")
          if (nutritionText.length > 10) {
            p.nutritionInfo = sanitizeContentText(
              [wwDosering, wwPortions, nutritionText].filter(Boolean).join(". ")
            )
          }

          if (wwDosering) p.dosage = sanitizeContentText(wwDosering)

          // Size from "Portioner pr bøtte: 45" → compute total units.
          // Also handle encoding variants (bøtte, b..tte).
          if (!p.size) {
            const portSrc = wwPortions || p.nutritionInfo || ""
            const portMatch = portSrc.match(/Portioner\s+pr[^:]*:\s*(\d+)/i)
            if (portMatch) {
              const portions = parseInt(portMatch[1])
              const doseSrc = wwDosering || p.nutritionInfo || ""
              const doseMatch = doseSrc.match(/Dosering\s*:\s*(\d+)\s*(?:\S+\s+)?(gummies|vingummier|tabletter|kapsler|kapsel|softgels|softgel|dr.ber|tab)/i)
              if (doseMatch) {
                const total = portions * parseInt(doseMatch[1])
                p.size = `${total} ${doseMatch[2].toLowerCase()}`
              } else {
                p.size = `${portions} portioner`
              }
            }
          }

          // Ingredients from <tfoot> "ingredienser:" or "Andre ingredienser:" text
          const tfoot = wwNutritionBlock.find("table tfoot").text().replace(/\s+/g, " ").trim()
          const ingrMatch = tfoot.match(/(?:andre\s+)?ingredienser\s*:?\s*:?\s*(.*)/i)
          if (ingrMatch && ingrMatch[1].trim().length > 5) {
            p.ingredients = sanitizeContentText(ingrMatch[1].trim())
          }
          // Also check full table text for "Andre ingredienser:" if tfoot didn't have it
          if (!p.ingredients) {
            const fullTableText = wwNutritionBlock.find("table").text().replace(/\s+/g, " ").trim()
            const altIngrMatch = fullTableText.match(/(?:andre\s+)?ingredienser\s*:?\s*:?\s*([A-ZÆØÅa-zæøå][^]*)/i)
            if (altIngrMatch && altIngrMatch[1].trim().length > 5) {
              p.ingredients = sanitizeContentText(altIngrMatch[1].trim())
            }
          }
        }

        // Fallback: scan all accordion blocks for ingredient lists
        if (!p.ingredients) {
          const bodyT = $("body").text().replace(/\s+/g, " ")
          const ingrFallback = bodyT.match(/ingredienser\s*:?\s*:?\s*([A-ZÆØÅa-zæøå][^<]{20,500})/i)
          if (ingrFallback) {
            p.ingredients = sanitizeContentText(ingrFallback[1].trim())
          }
        }

        // Size fallback from product name
        if (!p.size) {
          const nameSize = p.name.match(/(\d+)\s*(tabletter|kapsler|gummies|vingummier|softgels|stk|caps|tab)/i)
          if (nameSize) p.size = `${nameSize[1]} ${nameSize[2].toLowerCase()}`
        }

        // FAQ from accordion blocks in the FAQ section
        const wwFaqPairs: Array<{ question: string; answer: string }> = []
        $(".accordion").each((_, el) => {
          const q = sanitizeContentText(text($(el).find(".accordion__title").first()))
          const a = sanitizeContentText(text($(el).find(".accordion__content").first()))
          if (q && q.endsWith("?") && a && a.length > 5 && a.length < 500) {
            wwFaqPairs.push({ question: q, answer: a })
          }
        })
        if (wwFaqPairs.length) {
          p.qa = wwFaqPairs.slice(0, 10).map((item) => ({
            author: "WeightWorld",
            authorLabel: "Butik",
            question: item.question,
            datePublished: "",
            answers: [{ author: "WeightWorld", authorTitle: "Butik", datePublished: "", body: item.answer }],
          }))
        }

        // Highlights from product__description ul > li
        const wwHighlights = $(".product__description li, .desc_section li")
          .map((_, el) => sanitizeContentText(text($(el))))
          .get()
          .filter((s) => s.length > 3 && s.length < 200)
        if (wwHighlights.length) p.highlights = wwHighlights.slice(0, 8)
      }

      // Reviews (only when exposed in JSON-LD)
      p.reviews = extractReviewsFromJsonLd(jsonLd)
      if ((!p.reviews || p.reviews.length === 0)) {
        p.reviews = extractReviewsFromDom($)
      }

      // Q&A (CoreNutrition exposes Q&A via rendered Yotpo widget)
      if (storeId === "corenutrition") {
        p.qa = extractYotpoQa($)
      }

      return p
    },
  }
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

    // Keep only non-empty reviews; avoid giant payloads.
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

function extractReviewsFromDom($: ReturnType<typeof load>): CrawledReview[] {
  const out: CrawledReview[] = []
  const seen = new Set<string>()

  // Generic + MMSports/ACR-like review blocks.
  const nodes = $(
    [
      "[itemprop='review']",
      ".acr-review",
      ".customer-review",
      ".review-item",
      ".yotpo-review",
      ".gmf-comment",
      ".reviewContainer",
      ".trustpilot-review",
      ".reviewscontainer .row",
    ].join(", ")
  )

  nodes.each((_, el) => {
    const $r = $(el)
    const author = sanitizeContentText(
      text(
        $r.find(
          [
            "b[itemprop='name']",
            "[itemprop='author'] [itemprop='name']",
            ".review-author",
            ".yotpo-reviewer-name",
            ".acr-byline",
            ".gmf-customer-name",
            ".gmf-comment-name",
            ".reviewerName",
            ".reviewer",
            ".columns.medium-3 strong",
          ].join(", ")
        ).first()
      )
    ).replace(/^af\s+/i, "").trim()
    const body = sanitizeContentText(
      text(
        $r.find(
          [
            "[itemprop='reviewBody']",
            ".acr-message",
            ".review-body",
            ".yotpo-review-content",
            ".gmf-comment-text",
            ".reviewBody",
            ".review-text",
            ".columns.medium-9",
          ].join(", ")
        ).first()
      )
      || text($r.find(".acr-message, .review-body, .yotpo-review-content, .gmf-comment-text, .reviewBody, .review-text, .columns.medium-9").first())
    )
    const headline = sanitizeContentText(
      text($r.find("[itemprop='name'], .review-title, .yotpo-review-title, .reviewTitle").first())
    )
    const datePublished = sanitizeContentText(
      $r.find("[itemprop='datePublished']").first().attr("content")
      || text($r.find("[itemprop='datePublished'], time, .review-date, .acr-date, .gmf-comment-date, .reviewDate").first())
    )
    const ratingRaw = sanitizeContentText(
      $r.find("[itemprop='ratingValue']").first().attr("content")
      || text($r.find("[itemprop='ratingValue']").first())
      || text($r.find(".variant-ratings .rating, .rating span.rating").first())
      || $r.find(".rating").first().attr("data-rating")
      || $r.find(".gmf-rating-stars").first().attr("title")
      || ""
    )
    const ratingMatch = String(ratingRaw).match(/(\d+(?:[.,]\d+)?)/)
    let ratingValue = ratingMatch ? Number(ratingMatch[1].replace(",", ".")) : NaN
    if (!Number.isFinite(ratingValue)) {
      const ratingStaticClass = $r.find(".rating-static").first().attr("class") || ""
      const staticMatch = ratingStaticClass.match(/rating-(\d{1,3})/i)
      if (staticMatch) {
        ratingValue = Number(staticMatch[1]) / 10
      }
    }
    if (!Number.isFinite(ratingValue)) {
      const fullStars = text($r.find(".fullStars").first()).trim()
      const fullCount = [...fullStars].length
      if (fullCount > 0) {
        ratingValue = fullCount + ($r.find(".halfStars").length > 0 ? 0.5 : 0)
      }
    }
    if (!Number.isFinite(ratingValue)) {
      const trustpilotFilled = $r.find(".review-rating .star.filled").length
      if (trustpilotFilled > 0) {
        ratingValue = trustpilotFilled
      }
    }
    const authorClean = author.replace(/\s+Verificeret\s+kunde$/i, "").trim()

    if (!body && !headline) return

    const key = `${author.toLowerCase()}|${headline.toLowerCase()}|${body.toLowerCase().slice(0, 160)}`
    if (seen.has(key)) return
    seen.add(key)

    out.push({
      author: authorClean,
      ratingValue: Number.isFinite(ratingValue) ? ratingValue : null,
      bestRating: 5,
      datePublished,
      headline: headline.slice(0, 200),
      body: body.slice(0, 800),
    })
  })

  return out.slice(0, 20)
}

function extractYotpoQa($: ReturnType<typeof load>): CrawledQa[] {
  const root = $("#qa #yotpo-questions-container, #yotpo-questions-container").first()
  if (!root || root.length === 0) return []

  const out: CrawledQa[] = []
  root.find(".yotpo-question").each((_, el) => {
    const $q = $(el)

    const author = sanitizeContentText(text($q.find(".yotpo-shopper-name").first()))
    const authorLabel = sanitizeContentText(text($q.find(".yotpo-verified-text").first()))

    let question = sanitizeContentText(
      text($q.find(".yotpo-question-content .yotpo-read-more-text").first())
    )
    question = question.replace(/^\s*Q\s*:\s*/i, "").trim()

    const datePublished = sanitizeContentText(
      text($q.find(".yotpo-question-date .yotpo-date-format").first())
    )

    const answers: CrawledQa["answers"] = []
    $q.find(".yotpo-answer").each((_, aEl) => {
      const $a = $(aEl)
      let body = sanitizeContentText(
        text($a.find(".yotpo-answer-content .yotpo-read-more-text").first())
      )
      body = body.replace(/^\s*A\s*:\s*/i, "").trim()

      const authorTitle = sanitizeContentText(text($a.find(".yotpo-answerer-title").first()))
      const authorFromAttr = sanitizeContentText(String($a.attr("shopper-name") || "").trim())

      // Yotpo doesn't always repeat the answer date per answer; fall back to question date.
      if (body || authorTitle || authorFromAttr) {
        answers.push({
          author: authorFromAttr,
          authorTitle,
          datePublished,
          body,
        })
      }
    })

    if (!question) return

    out.push({
      author,
      authorLabel,
      question,
      datePublished,
      answers,
    })
  })

  // Keep payload bounded.
  return out.slice(0, 15)
}

/** Some sites duplicate title text, e.g. "Product NameProduct Name" */
function dedupeTitle(name: string): string {
  if (!name || name.length < 6) return name
  const half = Math.floor(name.length / 2)
  if (name.slice(0, half) === name.slice(half)) return name.slice(0, half)
  return name
}

function extractProductJsonLd($: ReturnType<typeof load>): any {
  try {
    const scripts = $('script[type="application/ld+json"]')
    for (let i = 0; i < scripts.length; i++) {
      const raw = $(scripts[i]).html()
      if (!raw) continue
      const obj = JSON.parse(raw)
      if (obj["@type"] === "Product") return obj
      if (Array.isArray(obj)) {
        const prod = obj.find((n: any) => n["@type"] === "Product")
        if (prod) return prod
      }
      if (obj["@graph"]) {
        const prod = obj["@graph"].find((n: any) => n["@type"] === "Product")
        if (prod) return prod
      }
    }
  } catch { /* */ }
  return null
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
  // Cut off common noisy sections that often appear after product details.
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
  // Re-split rough sentence boundaries to salvage section-like snippets from big text blobs.
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

function extractLabeledBlock(source: string, label: string, stopLabels: string[]): string {
  if (!source) return ""
  const stop = stopLabels.map((s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")
  const re = new RegExp(`${label}\\s*:\\s*(.+?)(?=(${stop})\\s*:|$)`, "i")
  const m = source.match(re)
  return m?.[1]?.trim() || ""
}

function extractInlineSection(source: string, start: RegExp, stop: RegExp): string {
  if (!source) return ""
  const s = String(source || "")
  const mStart = s.match(start)
  if (!mStart || mStart.index == null) return ""
  const fromIdx = mStart.index + mStart[0].length
  const rest = s.slice(fromIdx)
  const mStop = rest.match(stop)
  const chunk = mStop && mStop.index != null ? rest.slice(0, mStop.index) : rest
  return chunk.trim()
}

function extractFaqPairs(source: string): Array<{ question: string; answer: string }> {
  if (!source) return []
  const faqBlock = sanitizeContentText(
    extractInlineSection(source, /Ofte Stillede[^:]*:/i, /(Yderligere information|Relaterede produkter|Til toppen|$)/i)
  )
  if (!faqBlock) return []
  const matches = Array.from(
    faqBlock.matchAll(/([A-Z][^?]{3,140}\?)\s*([^?]+?)(?=\s+[A-Z][^?]{3,140}\?\s*|$)/g)
  )
  return matches
    .map((m) => ({ question: sanitizeContentText(m[1] || ""), answer: sanitizeContentText(m[2] || "") }))
    .filter((item) => item.question && item.answer)
    .slice(0, 8)
}

function extractHelsegrossistenNutrition(source: string): string {
  if (!source) return ""
  const explicitSection = sanitizeContentText(
    extractInlineSection(
      source,
      /N[æa]ringsstoffer og (?:andre )?stoffer med ern[æa]ringsm[æa]ssig eller fysiologisk(?: virkning| betydning)/i,
      /(Mulige Anvendelser\s*:|Daglig Balance\s*:|Ofte Stillede[^:]*:|Opbevaring\s*:|Opbevaringsanvisning\s*:|Yderligere information|$)/i
    )
  )
  if (explicitSection) {
    return `Næringsstoffer og andre stoffer med ernæringsmæssig eller fysiologisk virkning ${explicitSection}`.trim()
  }

  return sanitizeContentText(
    extractInlineSection(
      source,
      /(?:Indhold\s*\d+\s*(?:kapsler|kapsel|tabletter|tablet|tab|dr.ber|dråber|ml)|Indhold\s*:)/i,
      /(Mulige Anvendelser\s*:|Daglig Balance\s*:|Ofte Stillede[^:]*:|Opbevaring\s*:|Opbevaringsanvisning\s*:|Yderligere information|$)/i
    )
  )
}

function fallbackHighlightsFromText(source: string, limit = 3): string[] {
  if (!source) return []
  const sentences = sanitizeContentText(source)
    .split(/(?<=[.!?])\s+/)
    .map((s) => sanitizeContentText(s))
    .filter((s) => s.length >= 25 && s.length <= 220)
    .filter((s) => !/(se anmeldelser|fri fragt|lagerstatus|l??g i kurv)/i.test(s))
  return sentences.slice(0, limit)
}

function extractVariantValuesByLabel(
  $: ReturnType<typeof load>,
  labelRe: RegExp
): string[] {
  const out: string[] = []
  const seen = new Set<string>()

  // Pattern used by both Healthwell/CoreNutrition product pages:
  // <div><span>Smag</span> ... <div id="sb-select1"><div id="value-*">...</div></div></div>
  $(".attribute-selects > div, .attribute-selects .select-buttons, .attribute-selects .select-popup-button").each((_, el) => {
    const $el = $(el)
    const label = sanitizeContentText(text($el.find("> span").first()) || text($el.prev("span").first()))
    if (!labelRe.test(label)) return

    $el.find("[id^='value-']").each((__, vEl) => {
      const v = sanitizeContentText(text($(vEl)))
      if (!v || v.length < 2) return
      const k = v.toLowerCase()
      if (seen.has(k)) return
      seen.add(k)
      out.push(v)
    })
  })

  // Bodystore-style variant dropdown:
  // <div class="variation-dropdown variation-Smag">...<span data-attr-value="Lemon Lime">...</span>
  $(".variation-dropdown, [class*='variation-']").each((_, el) => {
    const $el = $(el)
    const label = sanitizeContentText(
      text($el.find(".dropdown__selected-label, .variation__label, .dropdown-label").first())
      || text($el.closest("[class*='variation-']").find("[class*='variation-label']").first())
      || $el.attr("class")
      || ""
    )
    if (!labelRe.test(label)) return
    $el.find("[data-attr-value], .dropdown__item .attr, [aria-label*='Smag']").each((__, vEl) => {
      const raw = sanitizeContentText(
        $(vEl).attr("data-attr-value")
        || $(vEl).attr("aria-label")
        || text($(vEl))
      )
      const v = raw
        .replace(/^V[æa]lg\s+Smag\s+/i, "")
        .replace(/^Smag\s*[:\-]?\s*/i, "")
        .trim()
      if (!v || v.length < 2) return
      const k = v.toLowerCase()
      if (seen.has(k)) return
      seen.add(k)
      out.push(v)
    })
  })

  return out
}

function normalizeSizeText(value: string): string {
  const s = sanitizeContentText(value)
  if (!s) return ""
  const m = s.match(/\b\d+(?:[.,]\d+)?\s*(?:g|kg|ml|l|caps|kapsler|tabletter|tabl|stk|portioner)\b/i)
  if (m) return m[0]
  // Strip appended price fragments if no canonical size unit was matched.
  return s.replace(/\b\d+(?:[.,]\d+)?\s*(?:kr|dkk)\b.*$/i, "").trim()
}

function extractMmsportsFlavors($: ReturnType<typeof load>): string[] {
  const out: string[] = []
  const seen = new Set<string>()

  // Often present in inline variant data: "Storlek: 500 gram Smak: Sour Cola Candy"
  $("script").each((_, el) => {
    const raw = String($(el).html() || "")
    if (!raw || !/Smak\s*:/i.test(raw)) return
    const re = /Smak\s*:\s*([A-Za-z0-9ÆØÅæøå\s+()\-\/]+?)(?=(?:["<]|Storlek|$))/gi
    let m: RegExpExecArray | null
    while ((m = re.exec(raw)) !== null) {
      const v = sanitizeContentText(m[1] || "")
      if (!v || v.length < 2 || v.length > 50) continue
      const k = v.toLowerCase()
      if (seen.has(k)) continue
      seen.add(k)
      out.push(v)
    }
  })

  return out.slice(0, 20)
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
  // Cut off common trailing boilerplate that sometimes follows on the same line.
  out = out.split(/\b(?:produktets|ingrediens|nærings|emballage)\b/i)[0].trim()
  // Keep only first 1-3 words (e.g. "United States", "Sydafrika").
  const parts = out.split(/\s+/).filter(Boolean).slice(0, 3)
  return parts.join(" ")
}

// Export all stores
export const med24 = makeGenericParser("med24", ["med24.dk", "www.med24.dk"])
export const bodystore = makeGenericParser("bodystore", ["bodystore.dk", "www.bodystore.dk"], {
  needsJs: true,
  waitForSelector: "h1, .product-long-description, .variation-dropdown, #gmf-comment-section",
  preCaptureActions: [
    { type: "click", selector: "#CybotCookiebotDialogBodyLevelButtonLevelOptinAllowAll, .message-banner .button-accept-all, .cookie-message-banner button" },
    { type: "click", selector: ".item.description, .tab-header[data-tab-header='tab-0']" },
    { type: "click", selector: ".item.reviews, .tab-header[data-tab-header='tab-2']", waitForSelector: "#gmf-comment-section, .gmf-top-review, .reviews" },
    { type: "click", selector: ".gmf-show-more-comments", waitForSelector: ".gmf-comment-section .gmf-comment" },
    { type: "click", selector: ".gmf-show-more-comments", waitForSelector: ".gmf-comment-section .gmf-comment" },
    { type: "click", selector: ".gmf-show-more-comments", waitForSelector: ".gmf-comment-section .gmf-comment" },
    { type: "click", selector: ".gmf-show-more-comments", waitForSelector: ".gmf-comment-section .gmf-comment" },
  ],
})
export const corenutrition = makeGenericParser("corenutrition", [
  "corenutrition.dk", "www.corenutrition.dk",
  "svenskkosttilskud.dk", "www.svenskkosttilskud.dk",  // redirects to corenutrition.dk
], {
  needsJs: true,
  waitForSelector: "h1, #pdesc, .product-info",
  // "Næringsindhold" is loaded lazily after clicking the tab.
  preCaptureActions: [
    { type: "click", selector: "#t-ddesc", waitForSelector: "#ddesc .text, #ddesc table" },
  ],
})
export const proteinDk = makeGenericParser("protein-dk", ["protein.dk", "www.protein.dk"], { needsJs: true, waitForSelector: "h1, .price, [itemprop='price']" })
export const mmsportsstore = makeGenericParser("mmsportsstore", ["mmsportsstore.dk", "www.mmsportsstore.dk"], {
  needsJs: true,
  waitForSelector: "h1, .product-page, .acr-review",
  // "Se flere anmeldelser" appends additional review blocks via XHR.
  preCaptureActions: [
    { type: "click", selector: ".show-more-reviews", waitForSelector: ".acr-review" },
    { type: "click", selector: ".show-more-reviews", waitForSelector: ".acr-review" },
    { type: "click", selector: ".show-more-reviews", waitForSelector: ".acr-review" },
    { type: "click", selector: ".show-more-reviews", waitForSelector: ".acr-review" },
    { type: "click", selector: ".show-more-reviews", waitForSelector: ".acr-review" },
  ],
})
export const weightworld = makeGenericParser("weightworld", ["weightworld.dk", "www.weightworld.dk"], {
  needsJs: false,
})
export const helsegrossisten = makeGenericParser("helsegrossisten", ["helsegrossisten.dk", "www.helsegrossisten.dk"], {
  needsJs: true,
  waitForSelector: "h1, .product-info-main, .page-main",
})
export const bodylab = makeGenericParser("bodylab", ["bodylab.dk", "www.bodylab.dk"])
export const flowlife = makeGenericParser("flowlife", ["flowlife.com", "www.flowlife.com"])
export const upcare = makeGenericParser("upcare", ["upcare.dk", "www.upcare.dk"])
export const musclepain = makeGenericParser("musclepain", ["musclepain.dk", "www.musclepain.dk"])
