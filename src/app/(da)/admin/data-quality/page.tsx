import { promises as fs } from "fs"
import path from "path"
import Link from "next/link"
import { DataQualityTable } from "./DataQualityTable"
import { unstable_cache } from "next/cache"
import { getBrokenProductLinksReport } from "@/lib/broken-product-links"
import { requireAdminAuth } from "@/lib/require-admin-auth"

export const dynamic = "force-dynamic"

export const metadata = {
  title: "Admin datakvalitet – Kosttilskudsvalg",
  robots: { index: false, follow: false },
}

type Snapshot = {
  updatedAt: string
  categories: Record<
    string,
    Array<{
      slug: string
      title: string
      buyUrl?: string
      categoryPath?: string
      manualInfo?: string
      rating?: number
      signals?: Record<string, unknown>
      signalConfidence?: { overall: number; fields: Record<string, number>; relevantFields?: string[] }
      panelScores?: Record<string, unknown> & { overall?: number }
    }>
  >
}

const CACHE_PATH = path.join(process.cwd(), "content", "product-signals-cache.json")
const getCachedBrokenReport = unstable_cache(
  async () => getBrokenProductLinksReport(),
  ["admin-broken-product-links-v3"],
  { revalidate: 60 * 60 * 24 },
)

export default async function AdminDataQualityPage() {
  await requireAdminAuth()
  let snapshot: Snapshot | null = null
  const brokenRows = await getCachedBrokenReport()
  const brokenBySlug = new Map(brokenRows.map((r) => [r.productSlug, r]))
  try {
    const raw = await fs.readFile(CACHE_PATH, "utf8")
    snapshot = JSON.parse(raw) as Snapshot
  } catch {
    snapshot = null
  }

  const rows: Array<{
    category: string
    slug: string
    title: string
    confidence: number
    panelOverall: number | null
    missing: string[]
    buyUrl?: string
    categoryPath?: string
    manualInfo?: string
    isBroken404?: boolean
    currentData?: Record<string, unknown>
  }> = []

  if (snapshot?.categories) {
    for (const [category, products] of Object.entries(snapshot.categories)) {
      for (const p of products) {
        const confidence = p.signalConfidence?.overall ?? 0
        const fields = p.signalConfidence?.fields || {}
        const relevantFields = p.signalConfidence?.relevantFields || Object.keys(fields)
        const broken = brokenBySlug.get(p.slug)
        const isBroken404 = Boolean(broken)
        const missing = Object.entries(fields)
          .filter(([key, score]) => relevantFields.includes(key) && score < 0.5)
          .map(([k]) => k)
          .slice(0, 6)
        if (isBroken404 && !missing.includes("outgoingLink404")) {
          missing.unshift("outgoingLink404")
        }

        rows.push({
          category,
          slug: p.slug,
          title: p.title,
          confidence: isBroken404 ? 0 : confidence,
          panelOverall: p.panelScores?.overall ?? null,
          missing,
          buyUrl: p.buyUrl,
          categoryPath: p.categoryPath,
          manualInfo: p.manualInfo,
          isBroken404,
          currentData: {
            slug: p.slug,
            title: p.title,
            rating: p.rating ?? null,
            linkStatus: isBroken404 ? "404" : "ok",
            buyUrl: p.buyUrl || null,
            categoryPath: p.categoryPath || null,
            manualInfo: p.manualInfo || "",
            signals: p.signals || {},
            signalConfidence: p.signalConfidence || null,
            panelScores: p.panelScores || null,
          },
        })
      }
    }
  }

  rows.sort((a, b) => a.confidence - b.confidence)
  const low = rows.filter((r) => r.confidence < 0.5)
  const medium = rows.filter((r) => r.confidence >= 0.5 && r.confidence < 0.75)
  const high = rows.filter((r) => r.confidence >= 0.75)

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Datakvalitet för scoremotor</h1>
          <p className="mt-1 text-sm text-slate-600">
            Confidence per produkt och fält från signalparsern.
          </p>
        </div>
        <Link href="/admin" className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50">
          Tillbaka till admin
        </Link>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-4">
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <div className="text-xs text-slate-500">Senast uppdaterad</div>
          <div className="mt-1 text-sm font-semibold text-slate-900">{snapshot?.updatedAt || "-"}</div>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <div className="text-xs text-slate-500">Produkter totalt</div>
          <div className="mt-1 text-sm font-semibold text-slate-900">{rows.length}</div>
        </div>
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
          <div className="text-xs text-amber-700">Låg confidence (&lt;50%)</div>
          <div className="mt-1 text-sm font-semibold text-amber-900">{low.length}</div>
        </div>
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
          <div className="text-xs text-emerald-700">Hög confidence (&gt;=75%)</div>
          <div className="mt-1 text-sm font-semibold text-emerald-900">{high.length}</div>
        </div>
      </div>

      <div className="mb-4 text-sm text-slate-600">
        Mellansegment (50–74%): <strong>{medium.length}</strong>
      </div>

      <DataQualityTable rows={rows} />
    </div>
  )
}

