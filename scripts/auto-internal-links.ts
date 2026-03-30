/**
 * auto-internal-links.ts
 *
 * Retroactively inserts internal links into existing category pages
 * when a new category page is created (or on demand for any slug).
 *
 * Usage:
 *   npx tsx scripts/auto-internal-links.ts magnesium-glycinat
 *   npx tsx scripts/auto-internal-links.ts zink selen --dry-run
 *   npx tsx scripts/auto-internal-links.ts --all
 *   npx tsx scripts/auto-internal-links.ts --all --dry-run
 */

import path from "path"
import { promises as fs } from "fs"
import matter from "gray-matter"

// ── Config ──────────────────────────────────────────────────────

const KOSTTILSKUD_DIR = path.join(
  process.cwd(),
  "src",
  "app",
  "(da)",
  "kosttilskud",
)

const LINK_CLASS =
  'className="font-medium text-emerald-700 underline-offset-2 hover:underline"'

const SUPPLEMENT_LINK_ALIASES: Record<string, string> = {
  "d vitamin": "/vitaminer/d-vitamin",
  "d-vitamin": "/vitaminer/d-vitamin",
  "k2 vitamin": "/vitaminer/vitamin-k2",
  "vitamin k2": "/vitaminer/vitamin-k2",
  "vitamin d3 k2": "/vitaminer/vitamin-d3-k2",
  "c vitamin": "/vitaminer/c-vitamin",
  "c-vitamin": "/vitaminer/c-vitamin",
  jern: "/mineraler/jern-tabletter",
  calcium: "/mineraler/calcium",
  kollagen: "/sundhed-velvaere/kollagenpulver",
  "omega 3": "/omega-fedtsyrer/omega-3",
  "omega-3": "/omega-fedtsyrer/omega-3",
}

// ── Silo config import ──────────────────────────────────────────

type SiloId =
  | "protein-traening"
  | "vitaminer"
  | "mineraler"
  | "omega-fedtsyrer"
  | "sundhed-velvaere"

let _slugToSilo: Record<string, SiloId> | null = null

async function getSlugToSilo(): Promise<Record<string, SiloId>> {
  if (_slugToSilo) return _slugToSilo
  const configPath = path.join(
    process.cwd(),
    "src",
    "lib",
    "silo-config.ts",
  )
  const raw = await fs.readFile(configPath, "utf-8")

  const result: Record<string, SiloId> = {}
  const re = /"([^"]+)":\s*"(protein-traening|vitaminer|mineraler|omega-fedtsyrer|sundhed-velvaere)"/g
  let m: RegExpExecArray | null
  while ((m = re.exec(raw)) !== null) {
    result[m[1]] = m[2] as SiloId
  }
  _slugToSilo = result
  return result
}

function slugToHref(slug: string, siloId: SiloId): string {
  return `/${siloId}/${slug}`
}

// ── Keyword extraction ──────────────────────────────────────────

function slugToLabel(slug: string): string {
  return slug
    .replace(/-/g, " ")
    .replace(/\bae\b/g, "æ")
    .replace(/\boe\b/g, "ø")
    .replace(/\baa\b/g, "å")
}

const TITLE_NOISE = /\b(de|bedste?|i|test|til|og|med|for|den|det|har|en|et|din|dit|fra|som|af|eller|vi|du|alle|nye|top|guide|\d{4})\b/gi
const TITLE_SEPARATORS = /\s*[–—|:]\s*/g

async function extractCategoryKeyword(slug: string): Promise<string> {
  const mdxPath = path.join(KOSTTILSKUD_DIR, slug, "page.mdx")
  try {
    const raw = await fs.readFile(mdxPath, "utf-8")
    const { data } = matter(raw)
    const title = data.title as string | undefined
    if (title) {
      let core = title.split(TITLE_SEPARATORS)[0].trim()
      core = core.replace(TITLE_NOISE, " ").replace(/\s{2,}/g, " ").trim()
      if (core.length >= 3) return core
    }
  } catch {}
  return slugToLabel(slug)
}

interface LinkTarget {
  slug: string
  href: string
  keywords: string[]
}

async function buildLinkTargets(
  slugs: string[],
): Promise<LinkTarget[]> {
  const siloMap = await getSlugToSilo()
  const targets: LinkTarget[] = []

  for (const slug of slugs) {
    const siloId = siloMap[slug]
    if (!siloId) {
      console.warn(`  ⚠ slug "${slug}" not found in silo-config, skipping`)
      continue
    }
    const href = slugToHref(slug, siloId)
    const kw = await extractCategoryKeyword(slug)
    const kwSet = new Set<string>()

    kwSet.add(kw.toLowerCase())
    kwSet.add(slugToLabel(slug).toLowerCase())

    for (const [alias, aliasHref] of Object.entries(SUPPLEMENT_LINK_ALIASES)) {
      if (aliasHref === href) kwSet.add(alias.toLowerCase())
    }

    const keywords = Array.from(kwSet)
      .filter((k) => k.length >= 3 && !/^(i|de|og|til|med|for|den|det|test|bedst|bedste)$/i.test(k))
      .sort((a, b) => b.length - a.length)

    targets.push({ slug, href, keywords })
  }
  return targets
}

// ── MDX link insertion ──────────────────────────────────────────

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

function collectExistingHrefs(content: string): Set<string> {
  const hrefs = new Set<string>()
  const re = /<a\s[^>]*href="([^"]+)"[^>]*>/gi
  let m: RegExpExecArray | null
  while ((m = re.exec(content)) !== null) {
    hrefs.add(m[1])
  }
  return hrefs
}

function splitFrontmatterAndBody(
  raw: string,
): { frontmatter: string; body: string; fmEndIndex: number } {
  const fmMatch = raw.match(/^---\s*\n[\s\S]*?\n---\s*\n/)
  if (!fmMatch) return { frontmatter: "", body: raw, fmEndIndex: 0 }
  return {
    frontmatter: fmMatch[0],
    body: raw.slice(fmMatch[0].length),
    fmEndIndex: fmMatch[0].length,
  }
}

interface InsertionResult {
  updatedBody: string
  insertedKeyword: string | null
}

/**
 * Uses the same tag-splitting approach as injectInlineInternalLinks in
 * rebuild-category-pages.ts, but with additional protections for full-page
 * MDX (component blocks, JSON-LD, tables, frontmatter).
 */
function tryInsertLink(
  body: string,
  target: LinkTarget,
  existingHrefs: Set<string>,
): InsertionResult {
  if (existingHrefs.has(target.href)) {
    return { updatedBody: body, insertedKeyword: null }
  }

  const protectedAnchors: string[] = []
  let work = body.replace(/<a\b[\s\S]*?<\/a>/gi, (match) => {
    const token = `__KM_PROT_${protectedAnchors.length}__`
    protectedAnchors.push(match)
    return token
  })

  const protectedBlocks: string[] = []
  const blockPatterns = [
    /<SeoJsonLd[\s\S]*?\/>/g,
    /<ComparisonTable[\s\S]*?\/>/g,
    /<table[\s\S]*?<\/table>/gi,
    /<dl[\s\S]*?<\/dl>/gi,
    /\{\/\*[\s\S]*?\*\/\}/g,
    /import\s+[\s\S]*?from\s+['"][^'"]+['"]/g,
    /export\s+const\s+[\s\S]*?[;\n]/g,
  ]
  for (const pat of blockPatterns) {
    work = work.replace(pat, (match) => {
      const token = `__KM_BLOCK_${protectedBlocks.length}__`
      protectedBlocks.push(match)
      return token
    })
  }

  const parts = work.split(/(<[^>]+>)/g)
  let insideHeading = false
  let insideProtected = false
  let insertedKeyword: string | null = null

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i]
    if (!part) continue
    if (insertedKeyword) break

    if (part.startsWith("<")) {
      if (/^<h[1-6]\b/i.test(part)) insideHeading = true
      if (/^<\/h[1-6]>/i.test(part)) insideHeading = false
      if (/^<(button|ToplistProduct|ProductCard)\b/i.test(part)) insideProtected = true
      if (/^<\/(button|ToplistProduct|ProductCard)>/i.test(part)) insideProtected = false
      continue
    }

    if (insideHeading || insideProtected) continue
    if (/^__KM_(PROT|BLOCK)_\d+__$/.test(part.trim())) continue

    for (const keyword of target.keywords) {
      const escaped = escapeRegExp(keyword).replace(/\s+/g, "[-\\s]+")
      const re = new RegExp(
        `(^|[^\\p{L}\\p{N}])(${escaped})(?=$|[^\\p{L}\\p{N}])`,
        "iu",
      )
      if (!re.test(part)) continue

      parts[i] = part.replace(
        re,
        (_m, prefix: string, matched: string) =>
          `${prefix}<a href="${target.href}" ${LINK_CLASS}>${matched}</a>`,
      )
      insertedKeyword = keyword
      break
    }
  }

  work = parts.join("")

  protectedBlocks.forEach((block, idx) => {
    work = work.replace(`__KM_BLOCK_${idx}__`, block)
  })
  protectedAnchors.forEach((anchor, idx) => {
    work = work.replace(`__KM_PROT_${idx}__`, anchor)
  })

  return { updatedBody: work, insertedKeyword }
}

// ── Main ────────────────────────────────────────────────────────

async function getAllCategorySlugs(): Promise<string[]> {
  const entries = await fs.readdir(KOSTTILSKUD_DIR, { withFileTypes: true })
  const slugs: string[] = []
  for (const e of entries) {
    if (!e.isDirectory()) continue
    try {
      await fs.access(path.join(KOSTTILSKUD_DIR, e.name, "page.mdx"))
      slugs.push(e.name)
    } catch {}
  }
  return slugs.sort()
}

async function main() {
  const args = process.argv.slice(2)
  const dryRun = args.includes("--dry-run")
  const allMode = args.includes("--all")
  const verbose = args.includes("--verbose")
  const slugArgs = args.filter((a) => !a.startsWith("--"))

  if (!allMode && slugArgs.length === 0) {
    console.log("Usage: npx tsx scripts/auto-internal-links.ts <slug...> [--dry-run]")
    console.log("       npx tsx scripts/auto-internal-links.ts --all [--dry-run]")
    process.exit(1)
  }

  const siloMap = await getSlugToSilo()
  const targetSlugs = allMode ? Object.keys(siloMap) : slugArgs
  const targets = await buildLinkTargets(targetSlugs)

  if (targets.length === 0) {
    console.log("No valid targets found.")
    process.exit(0)
  }

  console.log("═══════════════════════════════════════════════")
  console.log("  Auto Internal Links")
  console.log(`  Targets: ${targets.length}`)
  console.log(`  Mode: ${dryRun ? "DRY RUN" : "LIVE"}`)
  console.log("═══════════════════════════════════════════════\n")

  if (verbose) {
    for (const t of targets) {
      console.log(`  Target: ${t.slug} → ${t.href}`)
      console.log(`    Keywords: ${t.keywords.join(", ")}`)
    }
    console.log()
  }

  const allPages = await getAllCategorySlugs()
  let totalInsertions = 0
  let totalPagesModified = 0

  for (const pageSlug of allPages) {
    const mdxPath = path.join(KOSTTILSKUD_DIR, pageSlug, "page.mdx")
    let raw: string
    try {
      raw = await fs.readFile(mdxPath, "utf-8")
    } catch {
      continue
    }

    const { frontmatter, body } = splitFrontmatterAndBody(raw)
    const existingHrefs = collectExistingHrefs(body)
    let currentBody = body
    let pageModified = false
    const insertions: string[] = []

    for (const target of targets) {
      if (target.slug === pageSlug) continue

      const result = tryInsertLink(currentBody, target, existingHrefs)
      if (result.insertedKeyword) {
        currentBody = result.updatedBody
        existingHrefs.add(target.href)
        insertions.push(
          `"${result.insertedKeyword}" → ${target.href}`,
        )
        pageModified = true
        totalInsertions++
      }
    }

    if (pageModified) {
      totalPagesModified++
      const prefix = dryRun ? "[DRY] " : ""
      console.log(
        `  ${prefix}${pageSlug}: ${insertions.length} link(s) inserted`,
      )
      for (const ins of insertions) {
        console.log(`    + ${ins}`)
      }
      if (!dryRun) {
        await fs.writeFile(mdxPath, frontmatter + currentBody, "utf-8")
      }
    }
  }

  console.log("\n═══════════════════════════════════════════════")
  console.log(`  Links inserted: ${totalInsertions}`)
  console.log(`  Pages modified: ${totalPagesModified}`)
  console.log(`  Mode: ${dryRun ? "DRY RUN (no files changed)" : "LIVE"}`)
  console.log("═══════════════════════════════════════════════")
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
