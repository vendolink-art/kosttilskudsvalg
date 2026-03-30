import { promises as fs } from "fs"
import path from "path"
import { SILOS, SLUG_TO_SILO, type SiloId } from "../src/lib/silo-config"

type TestPageStatus = {
  summary: {
    totalPages: number
    openPages: number
    greenPages: number
    totalBrokenSlots: number
  }
  openPages: Array<{
    page: string
    status: "open"
    brokenCount: number
  }>
  greenPages: Array<{
    page: string
    slug: string
    status: "green"
    brokenCount: 0
  }>
}

type AuditCategory = {
  categorySlug: string
  route: string
  httpStatus: number | null
  verifyOk: boolean
  verifySummary: string[]
  missingCrawlProducts: string[]
  introMentionsDifferentWinner: boolean
  introMentionedTitle?: string | null
  expectedTopTitle?: string | null
  productCount: number
}

type AuditFile = {
  siloId: SiloId
  categoryCount: number
  categories: AuditCategory[]
}

type QueueEntry = {
  page: string
  slug: string
  siloId: SiloId
  pageStatus: "open" | "green"
  brokenCount: number
  verifyOk: boolean
  httpStatus: number | null
  hardFailureNames: string[]
  softFailureNames: string[]
  missingCrawlProducts: string[]
  introMentionsDifferentWinner: boolean
  introMentionedTitle?: string | null
  expectedTopTitle?: string | null
}

const ROOT = process.cwd()
const CONTENT_DIR = path.join(ROOT, "content")
const AUDIT_DIR = path.join(CONTENT_DIR, "silo-audits")
const TEST_PAGE_STATUS_PATH = path.join(CONTENT_DIR, "test-page-status.json")
const OUTPUT_PATH = path.join(CONTENT_DIR, "selective-review-queue.json")

const HARD_FULL_REVIEW_FAILURES = new Set([
  "required-frontmatter",
  "dynamic-description-count",
  "dynamic-slogan-count",
  "product-anchor-count",
  "mobile-toplist",
  "desktop-toplist",
  "toc",
  "core-sections",
  "summary-award-order",
  "mobile-toplist-layout",
  "cta-no-underline",
  "product-card-store-label",
  "internal-links",
  "no-links-in-headings",
  "no-self-links",
  "internal-subpage-link-limit",
  "duplicate-extra-images",
  "product-review-quality",
  "brand-leaks",
])

function getSlugFromRoute(route: string): string {
  const parts = String(route || "").split("/").filter(Boolean)
  return parts[parts.length - 1] || ""
}

function getSiloFromRoute(route: string, slug: string): SiloId {
  const parts = String(route || "").split("/").filter(Boolean)
  const prefix = parts[0] ? `/${parts[0]}` : ""
  const direct = (Object.values(SILOS).find((silo) => silo.href === prefix)?.id || null) as SiloId | null
  return direct || SLUG_TO_SILO[slug] || "sundhed-velvaere"
}

function parseFailedCheckNames(lines: string[]): string[] {
  return lines
    .filter((line) => line.startsWith("FAIL "))
    .map((line) => line.replace(/^FAIL\s+/, "").split(/\s+-\s+/, 1)[0].trim())
    .filter(Boolean)
}

async function readJson<T>(filePath: string): Promise<T> {
  const raw = await fs.readFile(filePath, "utf8")
  return JSON.parse(raw.replace(/^\uFEFF/, "")) as T
}

async function readAuditFiles(): Promise<AuditCategory[]> {
  const files = (await fs.readdir(AUDIT_DIR))
    .filter((name) => name.endsWith(".json"))
    .sort()

  const categories: AuditCategory[] = []
  for (const fileName of files) {
    const parsed = await readJson<AuditFile>(path.join(AUDIT_DIR, fileName))
    categories.push(...(parsed.categories || []))
  }
  return categories
}

function byPriority(a: QueueEntry, b: QueueEntry): number {
  if (b.brokenCount !== a.brokenCount) return b.brokenCount - a.brokenCount
  if (a.pageStatus !== b.pageStatus) return a.pageStatus === "open" ? -1 : 1
  return a.page.localeCompare(b.page, "da")
}

async function main() {
  const [statusData, auditCategories] = await Promise.all([
    readJson<TestPageStatus>(TEST_PAGE_STATUS_PATH),
    readAuditFiles(),
  ])

  const openPageMap = new Map(statusData.openPages.map((entry) => [entry.page, entry.brokenCount]))
  const greenPageMap = new Map(statusData.greenPages.map((entry) => [entry.page, entry.slug]))

  const fullReviewCandidates: QueueEntry[] = []
  const sourceEvidenceFollowUp: QueueEntry[] = []
  const backlogOnly: QueueEntry[] = []
  const keepAsIs: QueueEntry[] = []

  for (const category of auditCategories) {
    const slug = category.categorySlug || getSlugFromRoute(category.route)
    const page = category.route
    const pageStatus = openPageMap.has(page) ? "open" : "green"
    const brokenCount = openPageMap.get(page) || 0
    const failedCheckNames = parseFailedCheckNames(category.verifySummary || [])
    const hardFailureNames = failedCheckNames.filter((name) => HARD_FULL_REVIEW_FAILURES.has(name))
    const softFailureNames = failedCheckNames.filter((name) => !HARD_FULL_REVIEW_FAILURES.has(name))
    const entry: QueueEntry = {
      page,
      slug: greenPageMap.get(page) || slug,
      siloId: getSiloFromRoute(page, slug),
      pageStatus,
      brokenCount,
      verifyOk: category.verifyOk,
      httpStatus: category.httpStatus,
      hardFailureNames,
      softFailureNames,
      missingCrawlProducts: category.missingCrawlProducts || [],
      introMentionsDifferentWinner: Boolean(category.introMentionsDifferentWinner),
      introMentionedTitle: category.introMentionedTitle || null,
      expectedTopTitle: category.expectedTopTitle || null,
    }

    if (hardFailureNames.length > 0) {
      fullReviewCandidates.push(entry)
      continue
    }

    if (pageStatus === "open") {
      backlogOnly.push(entry)
      continue
    }

    if (!category.verifyOk || softFailureNames.length > 0 || entry.missingCrawlProducts.length > 0 || entry.introMentionsDifferentWinner || entry.httpStatus !== 200) {
      sourceEvidenceFollowUp.push(entry)
      continue
    }

    keepAsIs.push(entry)
  }

  const output = {
    generatedAt: new Date().toISOString(),
    summary: {
      auditedPages: auditCategories.length,
      fullReviewCandidates: fullReviewCandidates.length,
      sourceEvidenceFollowUp: sourceEvidenceFollowUp.length,
      backlogOnly: backlogOnly.length,
      keepAsIs: keepAsIs.length,
    },
    fullReviewCandidates: fullReviewCandidates.sort(byPriority),
    sourceEvidenceFollowUp: sourceEvidenceFollowUp.sort(byPriority),
    backlogOnly: backlogOnly.sort(byPriority),
    keepAsIs: keepAsIs.sort(byPriority),
  }

  await fs.writeFile(OUTPUT_PATH, `${JSON.stringify(output, null, 2)}\n`, "utf8")
  console.log(`Wrote ${path.relative(ROOT, OUTPUT_PATH)}`)
  console.log(`Full review candidates: ${output.summary.fullReviewCandidates}`)
  console.log(`Source/evidence follow-up: ${output.summary.sourceEvidenceFollowUp}`)
  console.log(`404 backlog only: ${output.summary.backlogOnly}`)
  console.log(`Keep as-is: ${output.summary.keepAsIs}`)
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exit(1)
})
