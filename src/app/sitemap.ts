import { promises as fs } from "fs"
import path from "path"
import { getAllGuides } from "@/lib/mdx"
import { categoryToPath } from "@/config/nav"
import { SILOS, SLUG_TO_SILO } from "@/lib/silo-config"

const BASE = "https://www.kosttilskudsvalg.dk"

async function getProductSlugs(): Promise<string[]> {
  const dir = path.join(
    process.cwd(), "src", "app", "(da)", "kosttilskud", "produkter",
  )
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true })
    return entries
      .filter((e) => e.isDirectory() && !e.name.startsWith("["))
      .map((e) => e.name)
  } catch {
    return []
  }
}

export default async function sitemap() {
  const now = new Date().toISOString()
  const [guides, productSlugs] = await Promise.all([
    getAllGuides(),
    getProductSlugs(),
  ])

  const guideUrls = guides.map((g) => ({
    url: `${BASE}/${categoryToPath(g.category)}/${g.slug}`,
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

  const productUrls = productSlugs.map((slug) => ({
    url: `${BASE}/kosttilskud/produkter/${slug}`,
    lastModified: now,
    changeFrequency: "monthly" as const,
    priority: 0.6,
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

    ...guideUrls,
    ...productUrls,
  ]
}
