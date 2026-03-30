/**
 * restructure-product-content.ts
 *
 * Restructures existing product `content.mdx` to the editorial layout:
 *   1 short paragraph → 3–5 bullets → 1 paragraph (+ optional details)
 *
 * This is designed for UX + SEO:
 * - preserves frontmatter
 * - keeps H1
 * - extracts 3–5 factual bullets from the existing body/title (no awards, no geography-as-merit)
 *
 * Default is DRY RUN. Use --write to persist changes.
 *
 * Run:
 *   npx tsx scripts/restructure-product-content.ts --limit 20
 *   npx tsx scripts/restructure-product-content.ts --slug core-ashwagandha
 *   npx tsx scripts/restructure-product-content.ts --write
 */

import { promises as fs } from "fs"
import path from "path"
import matter from "gray-matter"

const PRODUCT_CONTENT_DIR = path.join(process.cwd(), "src", "app", "(da)", "kosttilskud", "produkter")

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

function cleanText(input: string): string {
  return String(input || "").replace(/\s+/g, " ").trim()
}

function stripDanishCharsForCompare(input: string): string {
  return String(input || "")
    .toLowerCase()
    .replace(/[æ]/g, "ae")
    .replace(/[ø]/g, "o")
    .replace(/[å]/g, "aa")
    .replace(/\s+/g, " ")
    .trim()
}

function dedupeLeadingTitle(intro: string, title: string): string {
  const t = stripDanishCharsForCompare(title)
  const i = stripDanishCharsForCompare(intro)
  if (!t || !i) return intro
  // Handle "Title Title ..." and "Title: Title ..." patterns.
  const doubled = `${t} ${t}`
  if (i.startsWith(doubled)) {
    // Remove first occurrence by slicing original string by title length + a space.
    const cut = title.length + 1
    return intro.slice(cut).trim()
  }
  return intro
}

function splitSentences(text: string): string[] {
  return cleanText(text)
    .split(/(?<=[.!?])\s+|\s+[-–—]\s+/)
    .map((s) => s.trim())
    .filter(Boolean)
}

function inferForm(titleAndBody: string): string | null {
  const t = titleAndBody.toLowerCase()
  if (/\b(kapsel|kapsler|caps|capsule|softgel|softgels)\b/.test(t)) return "kapsler"
  if (/\b(tablet|tabletter|tabs|tyggetablet)\b/.test(t)) return "tabletter"
  if (/\b(pulver|powder)\b/.test(t)) return "pulver"
  if (/\b(gummi|gummies)\b/.test(t)) return "gummies"
  if (/\b(olie|oil|dråber|drops|sirup|shot|shots)\b/.test(t)) return "olie/dråber"
  return null
}

type Bullet = { label: string; value: string; score: number }

function firstMatch(re: RegExp, text: string): string | null {
  const m = text.match(re)
  return m ? m[0] : null
}

function extractUnitCountFromTitle(title: string): { label: string; value: string } | null {
  const t = String(title || "")
  const cap = t.match(/\b(\d{1,4})\s*(?:kaps(?:ler|el)?|kaps\.?|kap\.?|caps?)(?:\b|[^\w]|$)/i)
  if (cap?.[1]) return { label: "Kapsler/pakke", value: cap[1] }
  const tab = t.match(/\b(\d{1,4})\s*(?:tabletter|tablet|tabs\.?|tabl\.?)(?:\b|[^\w]|$)/i)
  if (tab?.[1]) return { label: "Tabletter/pakke", value: tab[1] }
  const stk = t.match(/\b(\d{1,4})\s*(?:stk\.?|stk|styk)(?:\b|[^\w]|$)/i)
  if (stk?.[1]) return { label: "Enheder/pakke", value: stk[1] }
  return null
}

function bulletValue(bullets: Bullet[], label: string): string | null {
  const hit = bullets.find((b) => b.label === label)
  return hit?.value ? cleanText(hit.value) : null
}

function buildIntroFromBullets(title: string, bullets: Bullet[]): string {
  const form = bulletValue(bullets, "Form")
  const dose = bulletValue(bullets, "Dose")
  const portions = bulletValue(bullets, "Portioner")
  const capCount = bulletValue(bullets, "Kapsler/pakke")
  const tabCount = bulletValue(bullets, "Tabletter/pakke")
  const unitCount = capCount || tabCount || bulletValue(bullets, "Enheder/pakke") || bulletValue(bullets, "Pakning")

  let s1 = `${title} er et kosttilskud`
  if (form) s1 += ` i ${form}-form`
  if (dose) s1 += ` med ${dose}`
  s1 += "."

  let s2 = ""
  if (portions) s2 = `Pakningen rækker typisk til ${portions}.`
  else if (unitCount) {
    const unitWord = capCount ? "kapsler" : tabCount ? "tabletter" : "enheder"
    s2 = `Pakningen indeholder ${unitCount} ${unitWord}, så du nemt kan sammenligne på tværs af produkter.`
  } else {
    s2 = "Den er nem at sammenligne på tværs af produkter, når du ser på dosering, pakningsstørrelse og pris."
  }

  return clamp(dedupeLeadingTitle(`${s1} ${s2}`, title), 260)
}

function buildOutroFromBullets(bullets: Bullet[]): string {
  const price = bulletValue(bullets, "Pris")
  const portions = bulletValue(bullets, "Portioner")
  const disclaimer = "Tjek altid etiketten for den aktuelle ingrediensliste, dosering og allergener."

  let s1 = "Sammenlign gerne pris og hvor længe pakken rækker, så du får det rette match til din rutine."
  if (price && portions) s1 = `Sammenlign gerne pris (${price}) og hvor længe pakken rækker (${portions}), så du får det rette match til din rutine.`
  else if (price) s1 = `Sammenlign gerne pris (${price}) og pakningsstørrelse, så du får det rette match til din rutine.`
  else if (portions) s1 = `Sammenlign gerne hvor længe pakken rækker (${portions}) og prisniveau, så du får det rette match til din rutine.`

  return `${clamp(s1, 340)} ${disclaimer}`
}

function extractBullets(title: string, body: string): Bullet[] {
  const blob = `${title}\n${body}`
  const lower = blob.toLowerCase()

  const bullets: Bullet[] = []

  const form = inferForm(lower)
  if (form) bullets.push({ label: "Form", value: form, score: 1.0 })

  const unitsFromTitle = extractUnitCountFromTitle(title)
  if (unitsFromTitle) bullets.push({ label: unitsFromTitle.label, value: unitsFromTitle.value, score: 0.95 })

  // Dosage / concentration-like facts (keep conservative).
  const dosage = firstMatch(/\b\d+(?:[.,]\d+)?\s*(?:mg|mcg|µg|iu|g)\b/i, blob)
  if (dosage) bullets.push({ label: "Dose", value: dosage.replace(/\s+/g, " "), score: 0.9 })

  const percent = firstMatch(/\b\d{1,2}(?:[.,]\d+)?\s*%\b/, blob)
  if (percent && /(withanolid|standardiser|ekstrakt|concentrat|protein)/i.test(lower)) {
    bullets.push({ label: "Standardisering", value: percent.replace(/\s+/g, ""), score: 0.75 })
  }

  const portions = firstMatch(/\b\d+\s*(?:portioner|doser|servings)\b/i, blob)
  if (portions) bullets.push({ label: "Portioner", value: portions.replace(/\s+/g, " "), score: 0.8 })

  // Only add a generic pack bullet if we didn't already get an explicit unit count from title.
  if (!unitsFromTitle) {
    const pack = firstMatch(/\b\d+\s*(?:kapsler|caps|tabletter|tabs|stk)\b/i, blob)
    if (pack) bullets.push({ label: "Pakning", value: pack.replace(/\s+/g, " "), score: 0.7 })
  }

  const priceLine = blob.match(/\b(?:pris|koster|koster ca\.)\b[^.\n]{0,80}\b(\d{2,5})\s*kr\b/i)
  if (priceLine?.[1]) bullets.push({ label: "Pris", value: `${priceLine[1]} kr`, score: 0.85 })

  // Pick 3–5, prioritize higher scores and unique labels.
  bullets.sort((a, b) => b.score - a.score)
  const out: Bullet[] = []
  const seen = new Set<string>()
  for (const b of bullets) {
    if (seen.has(b.label)) continue
    if (!b.value) continue
    seen.add(b.label)
    out.push(b)
    if (out.length >= 5) break
  }
  return out.length >= 3 ? out : out.slice(0, Math.min(3, out.length))
}

function stripLeadingHeading(mdx: string): { heading: string | null; rest: string } {
  const raw = mdx.trimStart()
  const m = raw.match(/^#\s+(.+)\n+/)
  if (!m) return { heading: null, rest: mdx }
  const heading = cleanText(m[1])
  const rest = raw.slice(m[0].length)
  return { heading, rest }
}

function clamp(text: string, maxChars: number): string {
  const t = cleanText(text)
  if (t.length <= maxChars) return t
  return t.slice(0, maxChars).replace(/\s+\S*$/, "").trim() + "…"
}

function buildNewBody(title: string, originalBody: string): string {
  // Convert markdown-ish to plain-ish text for sentence splitting.
  const plain = originalBody
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    // Drop headings anywhere in the body (prevents "# Title ..." leaking into paragraphs)
    .replace(/^\s{0,3}#{1,6}\s+/gm, "")
    // Drop list markers at line-start; we'll re-render our own bullets.
    .replace(/^\s{0,3}[-*+]\s+/gm, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\r?\n+/g, " ")
  const bullets = extractBullets(title, plain)
  const bulletLines = bullets.map((b) => `- **${b.label}:** ${b.value}`)

  const lines: string[] = []
  lines.push(`# ${title}`)
  lines.push("")
  lines.push(buildIntroFromBullets(title, bullets))
  lines.push("")
  if (bulletLines.length > 0) {
    lines.push(...bulletLines)
    lines.push("")
  }
  lines.push(buildOutroFromBullets(bullets))
  lines.push("")
  return lines.join("\n")
}

async function main() {
  const limit = parseArgInt("--limit")
  const onlySlug = parseArgString("--slug")
  const write = process.argv.includes("--write")
  const force = process.argv.includes("--force")

  const dirs = await fs.readdir(PRODUCT_CONTENT_DIR, { withFileTypes: true })
  const slugs = dirs.filter((d) => d.isDirectory()).map((d) => d.name)
  const filtered = onlySlug ? slugs.filter((s) => s === onlySlug) : slugs
  const selected = limit ? filtered.slice(0, Math.max(0, limit)) : filtered

  let changed = 0
  let unchanged = 0
  let skipped = 0

  for (const slug of selected) {
    const file = path.join(PRODUCT_CONTENT_DIR, slug, "content.mdx")
    let raw = ""
    try {
      raw = await fs.readFile(file, "utf8")
    } catch {
      skipped++
      continue
    }

    const parsed = matter(raw)
    const content = String(parsed.content || "")
    const { heading, rest } = stripLeadingHeading(content)
    const title = heading || String(parsed.data?.title || slug)
    // Keep newlines so we can remove headings/lists reliably.
    const bodyText = String(rest || "")

    // If it already looks like the new structure, skip.
    if (!force && (content.includes("- **Form:**") || content.includes("<details>"))) {
      unchanged++
      continue
    }

    const nextBody = buildNewBody(title, bodyText)
    const nextRaw = matter.stringify(nextBody, parsed.data || {})

    if (nextRaw.trim() === raw.trim()) {
      unchanged++
      continue
    }

    changed++
    if (write) {
      await fs.writeFile(file, nextRaw, "utf8")
    }
  }

  const mode = write ? "WRITE" : "DRY-RUN"
  console.log(`Done (${mode}). changed=${changed} unchanged=${unchanged} skipped=${skipped} total=${selected.length}`)
  if (!write) {
    console.log(`Tip: re-run with --write once you like the output.`)
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})

