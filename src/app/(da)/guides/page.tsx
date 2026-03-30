import { getAllGuides } from "@/lib/mdx"
import { categoryToPath } from "@/config/nav"
import { GuideCard } from "@/components/guide-card"
import { Breadcrumbs } from "@/components/breadcrumbs"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Guider – Kosttilskudsvalg",
  description: "Ekspertguider om kosttilskud, ernæring og sundhed. Lær alt om vitaminer, protein, superfoods og meget mere.",
}

export default async function GuidesPage() {
  const all = await getAllGuides()

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <Breadcrumbs items={[{ name: "Guider", href: "/guides" }]} />

      <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
        Guider
      </h1>
      <p className="mt-3 max-w-2xl text-base leading-relaxed text-slate-600 sm:text-lg">
        Ekspertguider om kosttilskud, ernæring og sundhed. Opdateret regelmæssigt med den nyeste viden.
      </p>

      {all.length === 0 ? (
        <p className="mt-8 text-sm text-slate-500">
          Ingen guider endnu &ndash; vi arbejder på nyt indhold.
        </p>
      ) : (
        <ul className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {all.map(g => {
            const cat = categoryToPath(g.category)
            return (
              <GuideCard
                key={g.slug}
                title={g.title}
                href={`/${cat}/${g.slug}`}
                category={g.category}
                updated={g.updated || g.date}
                banner={g.banner}
              />
            )
          })}
        </ul>
      )}
    </div>
  )
}
