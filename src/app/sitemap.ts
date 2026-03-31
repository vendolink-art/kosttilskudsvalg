import { getAllGuides } from "@/lib/mdx"
import { SILOS, SLUG_TO_SILO } from "@/lib/silo-config"

export const dynamic = "force-static"
export const revalidate = 86400

const BASE = "https://www.kosttilskudsvalg.dk"

export default async function sitemap() {
  const now = new Date().toISOString()
  const guides = await getAllGuides()

  const guideUrls = guides
    .filter((g) => (g.category || "").toLowerCase() === "guider")
    .map((g) => ({
      url: `${BASE}/guider/${g.slug}`,
      lastModified: g.updated || g.date || now,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    }))

  const siloHubUrls = Object.values(SILOS).map((silo) => ({
    url: `${BASE}${silo.href}`,
    lastModified: now,
    changeFrequency: "weekly" as const,
    priority: 0.92,
  }))

  const categoryUrls = Object.entries(SLUG_TO_SILO).map(([slug, siloId]) => ({
    url: `${BASE}/${siloId}/${slug}`,
    lastModified: now,
    changeFrequency: "weekly" as const,
    priority: 0.85,
  }))

  return [
    { url: BASE, lastModified: now, changeFrequency: "daily" as const, priority: 1 },
    { url: `${BASE}/kosttilskud`, lastModified: now, changeFrequency: "weekly" as const, priority: 0.6 },
    { url: `${BASE}/guider`, lastModified: now, changeFrequency: "weekly" as const, priority: 0.8 },
    ...siloHubUrls,
    ...categoryUrls,

    { url: `${BASE}/redaktion`, lastModified: now, changeFrequency: "monthly" as const, priority: 0.6 },
    { url: `${BASE}/metodik`, lastModified: now, changeFrequency: "monthly" as const, priority: 0.6 },
    { url: `${BASE}/kilder-og-faktacheck`, lastModified: now, changeFrequency: "monthly" as const, priority: 0.5 },
    { url: `${BASE}/annoncer-og-affiliate`, lastModified: now, changeFrequency: "monthly" as const, priority: 0.5 },
    { url: `${BASE}/om-os`, lastModified: now, changeFrequency: "monthly" as const, priority: 0.5 },
    { url: `${BASE}/kontakt`, lastModified: now, changeFrequency: "monthly" as const, priority: 0.4 },
    { url: `${BASE}/integritet`, lastModified: now, changeFrequency: "monthly" as const, priority: 0.2 },
    { url: `${BASE}/cookies`, lastModified: now, changeFrequency: "monthly" as const, priority: 0.2 },
    { url: `${BASE}/sidekort`, lastModified: now, changeFrequency: "weekly" as const, priority: 0.4 },

    ...guideUrls,
  ]
}
