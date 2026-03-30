import { promises as fs } from "fs"
import path from "path"
import matter from "gray-matter"

type CheckResult = {
  name: string
  ok: boolean
  details?: string
}

type CrawledAuditProduct = {
  sourceUrl?: string
  size?: string
  price?: string
  nutritionInfo?: string
  ingredients?: string
  highlights?: string[]
  flavors?: string[]
}

const CORE_AWARD_LABELS = ["BEDST I TEST", "BEDSTE PREMIUM", "BEDSTE BUDGET"]

function fail(name: string, details?: string): CheckResult {
  return { name, ok: false, details }
}

function pass(name: string, details?: string): CheckResult {
  return { name, ok: true, details }
}

function countMatches(input: string, regex: RegExp): number {
  const matches = input.match(regex)
  return matches ? matches.length : 0
}

function stripTags(input: string): string {
  return String(input || "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
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

function normalizeEvidenceText(input: string): string {
  return String(input || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[#*®™]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase()
}

function normalizeInternalHref(input: string): string {
  return String(input || "")
    .trim()
    .toLowerCase()
    .replace(/[?#].*$/, "")
    .replace(/\/+$/, "")
}

function getInternalTargetKey(input: string): string {
  const normalized = normalizeInternalHref(input)
  if (!normalized || normalized === "/") return ""
  const segments = normalized.split("/").filter(Boolean)
  if (segments.length === 0) return ""
  return segments[segments.length - 1]
}

function extractQuickFacts(section: string): Map<string, string> {
  const out = new Map<string, string>()
  for (const match of section.matchAll(/<dt[^>]*>([^<]+)<\/dt>\s*<dd[^>]*>([\s\S]*?)<\/dd>/gi)) {
    const label = normalizeEvidenceText(stripTags(match[1] || ""))
    const value = normalizeEvidenceText(stripTags(match[2] || ""))
    if (label && value) out.set(label, value)
  }
  return out
}

function extractEvidenceTokens(crawled: CrawledAuditProduct): string[] {
  const out: string[] = []
  const push = (value?: string) => {
    const cleaned = String(value || "").replace(/\s+/g, " ").trim()
    if (!cleaned) return
    if (cleaned.length < 5) return
    if (!out.includes(cleaned)) out.push(cleaned)
  }

  if (/\d/.test(String(crawled.size || ""))) push(String(crawled.size))
  for (const flavor of (crawled.flavors || []).slice(0, 3)) push(flavor)
  for (const highlight of (crawled.highlights || []).slice(0, 3)) {
    if (!/vis mere|vis mindre/i.test(String(highlight))) push(String(highlight))
  }

  const pushFactPair = (label: string, amount: string) => {
    const cleanLabel = String(label || "").trim()
    const cleanAmount = String(amount || "").trim()
    if (!cleanLabel || !cleanAmount) return
    push(`${cleanLabel} ${cleanAmount}`)
    push(`${cleanAmount} ${cleanLabel}`)
    if (/\d/.test(cleanAmount) && (/\b(?:mg|g|mcg|µg)\b/i.test(cleanAmount) || /%/.test(cleanAmount))) {
      push(cleanAmount)
    }
  }

  const nutrition = String(crawled.nutritionInfo || "")
  const nutritionPatterns: Array<{ label: string; pattern: RegExp }> = [
    { label: "koffein", pattern: /koffein(?: hcl)?\s*(\d+[.,]?\d*\s*mg)/i },
    { label: "protein", pattern: /protein\s*(\d+[.,]?\d*\s*g)/i },
    { label: "beta-alanin", pattern: /beta-alanin\s*(\d+[.,]?\d*\s*mg)/i },
    { label: "tri-kreatin malat", pattern: /(?:tri-?kreatin malat|trikreatin malat)\s*(\d+[.,]?\d*\s*mg)/i },
    { label: "kreatin", pattern: /(?:kreatin|creatin)(?:malat|monohydrat)?\s*(\d+[.,]?\d*\s*mg)/i },
    { label: "citrullin", pattern: /(?:l-)?citrullin(?:-dl)?(?:malat)?\s*(\d+[.,]?\d*\s*mg)/i },
    { label: "arginin", pattern: /(?:l-)?arginin(?:e)?(?:\s*hcl)?\s*(\d+[.,]?\d*\s*mg)/i },
    { label: "aakg", pattern: /\baakg\b\s*(\d+[.,]?\d*\s*mg)/i },
    { label: "argininkompleks", pattern: /argininkompleks\s*(\d+[.,]?\d*\s*mg)/i },
    { label: "glutamin", pattern: /(?:l-)?glutamin(?:e)?\s*(\d+[.,]?\d*\s*mg)/i },
    { label: "glycin", pattern: /(?:l-)?glycin(?:e)?\s*(\d+[.,]?\d*\s*mg)/i },
    { label: "vitamin c", pattern: /vitamin\s*c\s*(\d+[.,]?\d*\s*(?:mg|mcg|µg))/i },
    { label: "vitamin e", pattern: /vitamin\s*e(?:\s*\(mg\))?\s*(\d+[.,]?\d*\s*(?:mg|mcg|µg))/i },
    { label: "vitamin d", pattern: /vitamin\s*d(?:3)?\s*(\d+[.,]?\d*\s*(?:iu|ie|mcg|µg))/i },
    { label: "vitamin k2", pattern: /vitamin\s*k2\s*(\d+[.,]?\d*\s*(?:mcg|µg|mg))/i },
    { label: "betacaroten", pattern: /beta-?caroten(?:\s*\(provitamin a\))?\s*(\d+[.,]?\d*\s*(?:mg|mcg|µg))/i },
    { label: "provitamin a", pattern: /(\d+[.,]?\d*\s*ie)\s*provitamin a/i },
    { label: "tocopheroler", pattern: /tocopheroler(?:\s*\(mg\))?\s*(\d+[.,]?\d*\s*mg)/i },
    { label: "gamma tocopherol", pattern: /gamma tocopherol(?:\s*\(%\))?\s*(\d+[.,]?\d*\s*%)/i },
    { label: "delta tocopherol", pattern: /delta tocopherol(?:\s*\(%\))?\s*(\d+[.,]?\d*\s*%)/i },
    { label: "alfa tocopherol", pattern: /alfa tocopherol(?:\s*\(%\))?\s*(\d+[.,]?\d*\s*%)/i },
    { label: "beta tocopherol", pattern: /beta tocopherol(?:\s*\(%\))?\s*(\d+[.,]?\d*\s*%)/i },
    { label: "bioflavonoider", pattern: /bioflavonoider\s*(\d+[.,]?\d*\s*mg)/i },
    { label: "hybenekstrakt", pattern: /(?:ekstrakt af )?hyben(?:ekstrakt)?\s*(\d+[.,]?\d*\s*mg)/i },
    { label: "sort peber", pattern: /sort peber(?:-ekstrakt)?\s*(\d+[.,]?\d*\s*mg)/i },
    { label: "piperin", pattern: /piperin\s*(\d+[.,]?\d*\s*mg)/i },
    { label: "l-tyrosin", pattern: /l-?tyrosin\s*(\d+[.,]?\d*\s*mg)/i },
    { label: "cholin bitartrat", pattern: /cholin(?: bitartrat)?\s*(\d+[.,]?\d*\s*mg)/i },
    { label: "portion", pattern: /portion:\s*(\d+[.,]?\d*\s*g)/i },
    { label: "portioner", pattern: /(\d+\s*portioner)/i },
  ]
  for (const { label, pattern } of nutritionPatterns) {
    const globalPattern = pattern.global ? pattern : new RegExp(pattern.source, `${pattern.flags}g`)
    const matches = Array.from(nutrition.matchAll(globalPattern))
    for (const match of matches) {
      if (match?.[1]) pushFactPair(label, match[1])
    }
  }

  const nutritionLabelUnitPatterns: Array<{ label: string; unit: string; pattern: RegExp }> = [
    { label: "vitamin e", unit: "mg", pattern: /vitamin\s*e\s*\(mg\)\s*(\d+[.,]?\d*)/gi },
    { label: "tocopheroler", unit: "mg", pattern: /tocopheroler\s*\(mg\)\s*(\d+[.,]?\d*)/gi },
    { label: "gamma tocopherol", unit: "%", pattern: /gamma tocopherol\s*\(%\)\s*(\d+[.,]?\d*)/gi },
    { label: "delta tocopherol", unit: "%", pattern: /delta tocopherol\s*\(%\)\s*(\d+[.,]?\d*)/gi },
    { label: "alfa tocopherol", unit: "%", pattern: /alfa tocopherol\s*\(%\)\s*(\d+[.,]?\d*)/gi },
    { label: "beta tocopherol", unit: "%", pattern: /beta tocopherol\s*\(%\)\s*(\d+[.,]?\d*)/gi },
  ]
  for (const { label, unit, pattern } of nutritionLabelUnitPatterns) {
    for (const match of nutrition.matchAll(pattern)) {
      if (match?.[1]) pushFactPair(label, `${match[1]} ${unit}`)
    }
  }

  const ingredients = String(crawled.ingredients || "")
  if (/aspartam/i.test(ingredients)) push("aspartam")
  if (/sukralose/i.test(ingredients)) push("sukralose")
  if (/acesulfam/i.test(ingredients)) push("acesulfam")

  return out
}

function extractNutritionFact(nutritionInfo: string, pattern: RegExp): string {
  const match = String(nutritionInfo || "").match(pattern)
  return String(match?.[1] || "").trim()
}

function getQuickFactValue(quickFacts: Map<string, string>, patterns: RegExp[]): string {
  for (const [label, value] of quickFacts.entries()) {
    if (patterns.some((pattern) => pattern.test(label))) return value
  }
  return ""
}

async function loadCrawledByCanonicalUrl(): Promise<Map<string, CrawledAuditProduct>> {
  const crawledDir = path.join(process.cwd(), "content", "crawled-products")
  const out = new Map<string, CrawledAuditProduct>()

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
        const parsed = JSON.parse(await fs.readFile(full, "utf8")) as CrawledAuditProduct
        const canonical = canonicalizeUrl(parsed.sourceUrl || "")
        if (canonical && !out.has(canonical)) out.set(canonical, parsed)
      } catch {
        // ignore malformed files
      }
    }
  }

  await walk(crawledDir)
  return out
}

async function main() {
  const categorySlug = process.argv[2]?.trim()
  if (!categorySlug) {
    console.error("Usage: npx tsx scripts/verify-category-page-output.ts <category-slug>")
    process.exit(1)
  }

  const pagePath = path.join(process.cwd(), "src", "app", "(da)", "kosttilskud", categorySlug, "page.mdx")
  const raw = await fs.readFile(pagePath, "utf8")
  const parsed = matter(raw)
  const body = parsed.content
  const buyLinksPath = path.join(process.cwd(), "content", "product-buy-links.json")
  const buyLinks = JSON.parse(await fs.readFile(buyLinksPath, "utf8")) as Record<string, string>
  const crawledByCanonicalUrl = await loadCrawledByCanonicalUrl()

  const brokenLinksPath = path.join(process.cwd(), "content", "broken-links-report.json")
  let brokenSlugs = new Set<string>()
  try {
    const brokenLinks = JSON.parse(await fs.readFile(brokenLinksPath, "utf8")) as Array<{ productSlug: string }>
    brokenSlugs = new Set(brokenLinks.map((entry) => entry.productSlug))
  } catch {}

  const shownCount = countMatches(body, /<a id="product-[^"]+"><\/a>/g)
  const internalLinkCount = countMatches(body, /href="\/(?!\/)[^"]+"/g)
  const proteinAnchors = Array.from(body.matchAll(/<a id="product-([^"]+)"><\/a>/g), (m) => m[1])
  const selfLinkTargets = new Set(
    [`/${categorySlug}`, `/vitaminer/${categorySlug}`, `/kosttilskud/${categorySlug}`].map(normalizeInternalHref),
  )
  const sectionHeadings = [
    "## Sammenfatning & toppval",
    "<ComparisonTable ",
    "Sådan har vi lavet vores test",
    "<FAQ ",
    "Læs også",
  ]

  const checks: CheckResult[] = []

  const requiredFrontmatter = ["title", "meta_title", "description", "slogan", "updated"]
  const missingFrontmatter = requiredFrontmatter.filter((field) => !String(parsed.data?.[field] || "").trim())
  checks.push(
    missingFrontmatter.length === 0
      ? pass("required-frontmatter")
      : fail("required-frontmatter", `Missing: ${missingFrontmatter.join(", ")}`),
  )

  if (shownCount > 0) {
    const countString = String(shownCount)
    const description = String(parsed.data?.description || "")
    const slogan = String(parsed.data?.slogan || "")
    checks.push(
      description.includes(countString)
        ? pass("dynamic-description-count", `description mentions ${shownCount}`)
        : fail("dynamic-description-count", `description does not mention shown count ${shownCount}`),
    )
    checks.push(
      slogan.includes(countString)
        ? pass("dynamic-slogan-count", `slogan mentions ${shownCount}`)
        : fail("dynamic-slogan-count", `slogan does not mention shown count ${shownCount}`),
    )
  } else {
    checks.push(fail("product-anchor-count", "No product anchors found"))
  }

  checks.push(body.includes("toplist-mobile") ? pass("mobile-toplist") : fail("mobile-toplist", "Missing toplist-mobile"))
  checks.push(body.includes("toplist-desktop") ? pass("desktop-toplist") : fail("desktop-toplist", "Missing toplist-desktop"))
  checks.push(body.includes("<Toc />") ? pass("toc") : fail("toc", "Missing <Toc />"))

  const missingHeadings = sectionHeadings.filter((needle) => !body.includes(needle))
  checks.push(
    missingHeadings.length === 0
      ? pass("core-sections")
      : fail("core-sections", `Missing: ${missingHeadings.join(", ")}`),
  )

  const summaryBlockMatch = body.match(/## Sammenfatning & toppval([\s\S]*?)## /)
  if (!summaryBlockMatch) {
    checks.push(fail("summary-award-order", "Could not isolate summary block"))
  } else {
    const summaryBlock = summaryBlockMatch[1]
    const awardOrder = Array.from(
      summaryBlock.matchAll(/>(BEDST I TEST|BEDSTE PREMIUM|BEDSTE BUDGET)</g),
      (m) => m[1],
    )
    const topThree = awardOrder.slice(0, 3)
    checks.push(
      JSON.stringify(topThree) === JSON.stringify(CORE_AWARD_LABELS)
        ? pass("summary-award-order", topThree.join(" -> "))
        : fail("summary-award-order", `Expected ${CORE_AWARD_LABELS.join(" -> ")}, got ${topThree.join(" -> ") || "none"}`),
    )
  }

  const mobileToplistMatch = body.match(/\{\/\* ═══ MOBIL TOPLIST ═══ \*\/\}([\s\S]*?)\{\/\* ═══ INTRO \+ DESKTOP TOPLIST ═══ \*\/\}/)
  if (!mobileToplistMatch) {
    checks.push(fail("mobile-toplist-layout", "Could not isolate mobile toplist"))
  } else {
    const mobileToplist = mobileToplistMatch[1]
    const hasOldBrandLine = mobileToplist.includes("text-xs text-slate-500")
    const hasOldPriceLine = mobileToplist.includes("text-xs font-medium text-slate-600")
    checks.push(
      !hasOldBrandLine && !hasOldPriceLine
        ? pass("mobile-toplist-layout")
        : fail("mobile-toplist-layout", "Found old brand or price row in mobile toplist"),
    )
  }

  checks.push(
    body.includes("no-underline !no-underline")
      ? pass("cta-no-underline")
      : fail("cta-no-underline", "CTA buttons do not appear to enforce no-underline classes"),
  )

  checks.push(
    body.includes('className="mt-1 text-[11px] leading-none text-slate-500 md:text-right"')
      ? pass("product-card-store-label")
      : fail("product-card-store-label", "Missing store label under full product-card CTA"),
  )

  checks.push(
    internalLinkCount >= 2
      ? pass("internal-links", `${internalLinkCount} internal links found`)
      : fail("internal-links", `Expected at least 2 internal links, found ${internalLinkCount}`),
  )

  const headingLinkFound =
    /<h[1-6][^>]*>(?:(?!<\/h[1-6]>)[\s\S])*<a href="\/[^"]+"(?:(?!<\/h[1-6]>)[\s\S])*<\/h[1-6]>/i.test(body) ||
    /##[^\n]*\[[^\]]+\]\(\/[^\)]+\)/.test(body)
  checks.push(
    !headingLinkFound
      ? pass("no-links-in-headings")
      : fail("no-links-in-headings", "Found internal link inside heading"),
  )

  const selfLinks = Array.from(body.matchAll(/href="(\/(?!\/)[^"]+)"/g))
    .map((match) => String(match[1] || ""))
    .filter((href) => selfLinkTargets.has(normalizeInternalHref(href)))
  checks.push(
    selfLinks.length === 0
      ? pass("no-self-links")
      : fail("no-self-links", `Found self-referential internal links: ${Array.from(new Set(selfLinks)).join(", ")}`),
  )

  const bodyWithoutReadAlsoOrSources = body
    .split(/<h[1-6][^>]*>\s*Læs også\s*<\/h[1-6]>/i)[0]
    .split(/\n##\s*Læs også\b/i)[0]
    .split(/<h[1-6][^>]*>\s*Kilder\s*&(?:amp;)?\s*Forskning\s*<\/h[1-6]>/i)[0]
    .split(/\n##\s*Kilder\s*&\s*Forskning\b/i)[0]

  const inContentInternalTargets = new Map<string, { count: number; hrefs: Set<string> }>()
  for (const match of bodyWithoutReadAlsoOrSources.matchAll(/href="(\/(?!\/)[^"#?]+)"/g)) {
    const href = String(match[1] || "").trim()
    const key = getInternalTargetKey(href)
    if (!href || !key) continue
    const existing = inContentInternalTargets.get(key) || { count: 0, hrefs: new Set<string>() }
    existing.count += 1
    existing.hrefs.add(normalizeInternalHref(href))
    inContentInternalTargets.set(key, existing)
  }
  const duplicateInContentTargets = Array.from(inContentInternalTargets.entries()).filter(([, value]) => value.count > 1)
  checks.push(
    duplicateInContentTargets.length === 0
      ? pass("internal-subpage-link-limit", `${inContentInternalTargets.size} unique in-content internal targets checked`)
      : fail(
          "internal-subpage-link-limit",
          `Expected max 1 in-content link per target subpage before Kilder & Forskning, found duplicates: ${duplicateInContentTargets
            .map(([key, value]) => `${key} (${value.count}: ${Array.from(value.hrefs).join(" | ")})`)
            .join(", ")}`,
        ),
  )

  const duplicatedDetailImages =
    countMatches(body, /overview|detail/i) >= 2 &&
    countMatches(body, /\/images\/products\/test-/g) > shownCount
  checks.push(
    !duplicatedDetailImages
      ? pass("duplicate-extra-images")
      : fail("duplicate-extra-images", "Suspicious extra product-image blocks detected"),
  )

  const productSectionIssues: string[] = []
  const productSections = body.split(/\n---\n/g).filter((chunk) => chunk.includes('<a id="product-'))
  const genericPatterns = [
    /^\s*[^.]{0,140}\ber et kosttilskud(?: i [^.]+-form)?(?: med [^.]+)?\.\s*(?:pakningen rækker typisk til|pakningen indeholder|den er nem at sammenligne|sammenlign gerne)/i,
    /\bden er nem at sammenligne på tværs af produkter\b/i,
    /\bpakningen rækker typisk til\b/i,
    /\bsammenlign gerne pris og hvor længe pakken rækker\b/i,
    /^\s*bestil\b/i,
    /\bikke oplyst i input\b/i,
    /\bikke oplyst i det tilgængelige input\b/i,
    /\bingen kundeomtaler tilgængelige i input\b/i,
    /\bdosering er ikke oplyst i input\b/i,
    /\bnæringsindhold er ikke oplyst i input\b/i,
    /\bingrediens(?:er|liste) er ikke oplyst i input\b/i,
    /\bsødning er ikke oplyst\b/i,
    /\bmånga\b/i,
    /\baminosyratillskott\b/i,
    /\.\./,
  ]

  for (const section of productSections) {
    const slug = section.match(/<a id="product-([^"]+)"><\/a>/)?.[1] || "unknown"
    const proseChunk =
      section.match(/<div className="prose prose-slate max-w-none">([\s\S]*?)<\/div>\s*<\/div>/)?.[1] || ""
    const proseText = stripTags(proseChunk)
    if (!proseText || proseText.length < 220) {
      productSectionIssues.push(`${slug}: review text too short`)
      continue
    }
    const hit = genericPatterns.find((re) => re.test(proseText))
    if (hit) {
      productSectionIssues.push(`${slug}: generic or invalid review pattern`)
      continue
    }
    const structuredPatterns = [
      /<h3[^>]*>\s*Fordele:\s*<\/h3>/i,
      /<h3[^>]*>\s*Ulemper:\s*<\/h3>/i,
      /<h3[^>]*>\s*Attributter\/specifikationer:\s*<\/h3>/i,
      /<table[^>]*class(?:Name)?="table-default"/i,
      /<h3[^>]*>\s*FAQ:\s*<\/h3>/i,
      /<h3[^>]*>\s*Hvem passer .*? til:\s*<\/h3>/i,
    ]
    if (!structuredPatterns.every((re) => re.test(proseChunk))) {
      productSectionIssues.push(`${slug}: review does not follow GPT product template`)
      continue
    }
    const faqQuestionCount = countMatches(proseChunk, /<h4[^>]*>/gi)
    if (faqQuestionCount < 3) {
      productSectionIssues.push(`${slug}: review faq structure incomplete`)
      continue
    }
  }

  checks.push(
    productSectionIssues.length === 0
      ? pass("product-review-quality", `${proteinAnchors.length} product reviews follow GPT template`)
      : fail("product-review-quality", productSectionIssues.join(" | ")),
  )

  const parsedEvidenceIssues: string[] = []
  for (const section of productSections) {
    const slug = section.match(/<a id="product-([^"]+)"><\/a>/)?.[1] || "unknown"

    if (brokenSlugs.has(slug)) {
      console.log(`  WARN ${slug}: known broken link – skipping evidence check`)
      continue
    }

    const buyUrl = String(buyLinks[slug] || "")
    const crawled = crawledByCanonicalUrl.get(canonicalizeUrl(buyUrl))
    if (!crawled) {
      parsedEvidenceIssues.push(`${slug}: missing crawled product data behind active review`)
      continue
    }

    const normalizedSectionText = normalizeEvidenceText(stripTags(section))
    const quickFacts = extractQuickFacts(section)
    const evidenceTokens = extractEvidenceTokens(crawled).map((token) => normalizeEvidenceText(token)).filter(Boolean)
    const matchedEvidence = evidenceTokens.filter((token) => normalizedSectionText.includes(token))
    const sizeQuickFact = getQuickFactValue(quickFacts, [/pakningsstorrelse|pakningsstørrelse|nettovagt|nettovægt/i])
    const unitCountQuickFact = getQuickFactValue(quickFacts, [/antal kapsler|kapsler\/pakke|tabletter\/pakke|antal tabletter|kapsler|tabletter/i])
    const flavorQuickFact = getQuickFactValue(quickFacts, [/antal smage|smag|smagsvarianter|varianter/i])
    const sweetenerQuickFact = getQuickFactValue(quickFacts, [/sodning|sødemiddel|sødning/i])
    const proteinQuickFact = getQuickFactValue(quickFacts, [/protein/i])
    const portionQuickFact = getQuickFactValue(quickFacts, [/portioner\/pakke|antal portioner|portioner/i])
    const doseQuickFact = getQuickFactValue(quickFacts, [/dosisstorrelse|dosisstørrelse|dosering/i])
    const vitaminQuickFact = getQuickFactValue(quickFacts, [/vitamin c|vitamin d|vitamin k2|dri/i])
    const quickFactEvidenceCount = [
      sizeQuickFact,
      unitCountQuickFact,
      flavorQuickFact,
      sweetenerQuickFact,
      proteinQuickFact,
      portionQuickFact,
      doseQuickFact,
      vitaminQuickFact,
    ].filter((value) => value && !/ikke oplyst/i.test(value)).length

    if (evidenceTokens.length >= 2 && matchedEvidence.length < 2 && !(matchedEvidence.length >= 1 && quickFactEvidenceCount >= 1) && quickFactEvidenceCount < 3) {
      parsedEvidenceIssues.push(`${slug}: review lacks parsed product evidence`)
      continue
    }

    const nutrition = String(crawled.nutritionInfo || "")
    const ingredients = String(crawled.ingredients || "")
    const hasKoffeinFact = Boolean(extractNutritionFact(nutrition, /koffein(?: hcl)?\s*(\d+[.,]?\d*\s*mg)/i))
    const hasSizeFact = /\d/.test(String(crawled.size || ""))
    const hasFlavorFact = Array.isArray(crawled.flavors) && crawled.flavors.length > 0
    const hasSweetenerFact = /(aspartam|sukralose|acesulfam)/i.test(ingredients)

    if (hasKoffeinFact && /ikke oplyst/i.test(getQuickFactValue(quickFacts, [/koffein/i]))) {
      parsedEvidenceIssues.push(`${slug}: koffein listed as ikke oplyst despite crawled fact`)
      continue
    }
    if (hasSizeFact && /ikke oplyst/i.test(sizeQuickFact)) {
      parsedEvidenceIssues.push(`${slug}: package size listed as ikke oplyst despite crawled fact`)
      continue
    }
    if (hasFlavorFact && /ikke oplyst/i.test(flavorQuickFact)) {
      parsedEvidenceIssues.push(`${slug}: flavors listed as ikke oplyst despite crawled fact`)
      continue
    }
    if (hasSweetenerFact && /ikke oplyst/i.test(sweetenerQuickFact)) {
      parsedEvidenceIssues.push(`${slug}: sweetener listed as ikke oplyst despite crawled fact`)
      continue
    }
  }

  checks.push(
    parsedEvidenceIssues.length === 0
      ? pass("parsed-review-evidence", `${proteinAnchors.length} product reviews reference crawled product facts`)
      : fail("parsed-review-evidence", parsedEvidenceIssues.join(" | ")),
  )

  const quickFactsIssues: string[] = []
  for (const section of productSections) {
    const slug = section.match(/<a id="product-([^"]+)"><\/a>/)?.[1] || "unknown"
    const titleMatch = section.match(/title="([^"]+)"/)
    const title = titleMatch?.[1] || ""
    const brandMatch = section.match(/>Mærke<\/dt>\s*<dd[^>]*>([^<]+)<\/dd>/)
    const brand = String(brandMatch?.[1] || "").trim()
    if (!brand) continue
    if (/^(healthwell|svenskt kosttillskott)$/i.test(brand) && !new RegExp(`^${brand}s?(?:\\b|\\s)`, "i").test(title)) {
      quickFactsIssues.push(`${slug}: suspicious store brand leak (${brand})`)
    }
  }

  checks.push(
    quickFactsIssues.length === 0
      ? pass("brand-leaks")
      : fail("brand-leaks", quickFactsIssues.join(" | ")),
  )

  const failed = checks.filter((check) => !check.ok)
  for (const check of checks) {
    const prefix = check.ok ? "PASS" : "FAIL"
    console.log(`${prefix} ${check.name}${check.details ? ` - ${check.details}` : ""}`)
  }

  if (failed.length > 0) {
    process.exit(1)
  }

  console.log(`Verified ${categorySlug} successfully.`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
