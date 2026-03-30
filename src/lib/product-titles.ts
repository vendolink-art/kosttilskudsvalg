function cleanWhitespace(input: string): string {
  return String(input || "").replace(/\s+/g, " ").trim()
}

function escapeRegExp(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

const STORE_NAMES = ["Healthwell", "Svenskt Kosttillskott"]

const PACK_SIZE_PATTERNS: RegExp[] = [
  /\b\d+\s*x\s*\d+(?:[.,]\d+)?\s*(?:g|gram|kg|ml|cl|l|liter|liters|litre|litres|kapsler|kapslar|caps|capsules|tabletter|tabletter|tabs|stk|st|pcs)\b$/i,
  /\b\d+(?:[.,]\d+)?\s*(?:g|gram|kg|ml|cl|l|liter|liters|litre|litres)\b$/i,
  /\b\d+\s*(?:kaps(?:el|els|ler|lar)?\.?|caps?\.?|capsules?|softgels?|tablet(?:ter)?|tabs?\.?|gummies|stk|st|pcs)\b\.?$/i,
]

function trimTrailingPackSuffix(title: string): string {
  let out = cleanWhitespace(title)
  let changed = true

  while (changed) {
    changed = false
    for (const pattern of PACK_SIZE_PATTERNS) {
      const match = out.match(pattern)
      if (!match) continue
      out = out
        .slice(0, match.index ?? out.length)
        .replace(/[\s,.;:()\-–]+$/g, "")
        .trim()
      changed = true
      break
    }
  }

  return out
}

export function extractPackSizeFromTitle(title: string): string | null {
  const normalized = cleanWhitespace(title)
  for (const pattern of PACK_SIZE_PATTERNS) {
    const match = normalized.match(pattern)
    if (match?.[0]) return cleanWhitespace(match[0])
  }
  return null
}

export function normalizeDisplayProductTitle(title: string): string {
  const normalized = trimTrailingPackSuffix(title)
  return cleanWhitespace(normalized || title)
}

export function buildDisplayProductTitle(
  rawTitle: string,
  options?: { brand?: string; contextText?: string }
): string {
  let title = normalizeDisplayProductTitle(rawTitle)
  const brand = cleanWhitespace(options?.brand || "")
  const contextText = cleanWhitespace(options?.contextText || "")

  if (!title || !brand) return title

  // Collapse duplicated leading store/brand prefixes like
  // "Healthwell Healthwell X" -> "Healthwell X".
  const duplicatePrefix = new RegExp(`^${escapeRegExp(brand)}\\s+${escapeRegExp(brand)}\\s+`, "i")
  title = title.replace(duplicatePrefix, `${brand} `).trim()

  // Remove false store prefixes from third-party brands, e.g.
  // "Healthwell Solgar X" -> "Solgar X".
  for (const store of STORE_NAMES) {
    if (store.toLowerCase() === brand.toLowerCase()) continue
    const falsePrefix = new RegExp(`^${escapeRegExp(store)}\\s+${escapeRegExp(brand)}(?:\\b|\\s|[-–,:;(])`, "i")
    if (falsePrefix.test(title)) {
      title = title.replace(new RegExp(`^${escapeRegExp(store)}\\s+`, "i"), "").trim()
      break
    }
  }

  if (new RegExp(`^${escapeRegExp(brand)}(?:\\b|\\s|[-–,:;(])`, "i").test(title)) return title

  // Only prepend the brand when the surrounding crawled text clearly uses the
  // full "Brand + Product" phrasing. This preserves real in-house brands like
  // "Healthwell MultiMineraler" without reintroducing false store prefixes.
  if (contextText) {
    const fullNamePattern = new RegExp(`\\b${escapeRegExp(brand)}\\s+${escapeRegExp(title)}\\b`, "i")
    if (fullNamePattern.test(contextText)) {
      return `${brand} ${title}`
    }
  }

  return title
}
