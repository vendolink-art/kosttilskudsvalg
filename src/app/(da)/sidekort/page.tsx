import Link from "next/link"
import { SILOS, SLUG_TO_SILO, type SiloId } from "@/lib/silo-config"
import { getAllGuides } from "@/lib/mdx"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Sidekort – Kosttilskudsvalg",
  description: "Komplet oversigt over alle sider på Kosttilskudsvalg.dk.",
  alternates: { canonical: "https://www.kosttilskudsvalg.dk/sidekort" },
  openGraph: {
    title: "Sidekort – Kosttilskudsvalg",
    description: "Komplet oversigt over alle sider på Kosttilskudsvalg.dk.",
    url: "https://www.kosttilskudsvalg.dk/sidekort",
  },
}

function slugToLabel(slug: string): string {
  return slug
    .replace(/-/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

function getSiloCategories(): Record<SiloId, { slug: string; label: string }[]> {
  const result = {} as Record<SiloId, { slug: string; label: string }[]>
  for (const id of Object.keys(SILOS) as SiloId[]) {
    result[id] = []
  }
  for (const [slug, siloId] of Object.entries(SLUG_TO_SILO)) {
    result[siloId].push({ slug, label: slugToLabel(slug) })
  }
  for (const id of Object.keys(result) as SiloId[]) {
    result[id].sort((a, b) => a.label.localeCompare(b.label, "da"))
  }
  return result
}

export default async function SidekortPage() {
  const siloCategories = getSiloCategories()
  const guides = await getAllGuides()
  const guideList = guides
    .filter((g) => (g.category || "").toLowerCase() === "guider")
    .sort((a, b) => a.title.localeCompare(b.title, "da"))

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-bold tracking-tight text-slate-900">
        Sidekort
      </h1>
      <p className="mt-2 text-base text-slate-600">
        Komplet oversigt over alle sider på Kosttilskudsvalg.dk.
      </p>

      {/* Silo sections */}
      {(Object.keys(SILOS) as SiloId[]).map((siloId) => {
        const silo = SILOS[siloId]
        const cats = siloCategories[siloId]
        return (
          <section key={siloId} className="mt-10">
            <h2 className="text-xl font-semibold text-slate-900">
              <Link
                href={silo.href}
                className="hover:text-green-700 transition-colors"
              >
                {silo.label}
              </Link>
            </h2>
            <p className="mt-1 text-sm text-slate-500">{silo.description}</p>
            <ul className="mt-3 columns-1 sm:columns-2 lg:columns-3 gap-x-6">
              {cats.map((cat) => (
                <li key={cat.slug} className="mb-1.5">
                  <Link
                    href={`/${siloId}/${cat.slug}`}
                    className="text-sm text-slate-700 hover:text-green-700 hover:underline underline-offset-4"
                  >
                    {cat.label}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )
      })}

      {/* Guides */}
      {guideList.length > 0 && (
        <section className="mt-10">
          <h2 className="text-xl font-semibold text-slate-900">
            <Link href="/guider" className="hover:text-green-700 transition-colors">
              Guider
            </Link>
          </h2>
          <ul className="mt-3 columns-1 sm:columns-2 gap-x-6">
            {guideList.map((g) => (
              <li key={g.slug} className="mb-1.5">
                <Link
                  href={`/guider/${g.slug}`}
                  className="text-sm text-slate-700 hover:text-green-700 hover:underline underline-offset-4"
                >
                  {g.title}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Info pages */}
      <section className="mt-10">
        <h2 className="text-xl font-semibold text-slate-900">
          Om Kosttilskudsvalg
        </h2>
        <ul className="mt-3 columns-1 sm:columns-2 gap-x-6">
          {[
            { href: "/redaktion", label: "Redaktion" },
            { href: "/metodik", label: "Sådan vurderer vi" },
            { href: "/kilder-og-faktacheck", label: "Kilder & faktacheck" },
            { href: "/annoncer-og-affiliate", label: "Annonce- & affiliatepolitik" },
            { href: "/om-os", label: "Om Kosttilskudsvalg" },
            { href: "/kontakt", label: "Kontakt" },
            { href: "/integritet", label: "Privatlivspolitik" },
            { href: "/cookies", label: "Cookiepolitik" },
          ].map((p) => (
            <li key={p.href} className="mb-1.5">
              <Link
                href={p.href}
                className="text-sm text-slate-700 hover:text-green-700 hover:underline underline-offset-4"
              >
                {p.label}
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
