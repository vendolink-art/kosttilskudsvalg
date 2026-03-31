import Link from "next/link"
import { getAllGuides } from "@/lib/mdx"
import { categoryToPath } from "@/config/nav"
import { SLUG_TO_SILO } from "@/lib/silo-config"
import { AUTHORS } from "@/config/authors"
import { GuideCard } from "@/components/guide-card"
import { Beaker, ShieldCheck, BarChart3, BookOpen, Users, ClipboardCheck } from "lucide-react"

export const metadata = {
  title: "Kosttilskudsvalg: uafhængige guider til kosttilskud (DK)",
  description:
    "Vi sammenligner kosttilskud med fast metode, tydelige kriterier og kilder. Find de bedste produkter til din sundhed med vores uafhængige analyser.",
  alternates: { canonical: "https://www.kosttilskudsvalg.dk/" },
  openGraph: {
    type: "website",
    url: "https://www.kosttilskudsvalg.dk/",
    title: "Kosttilskudsvalg: uafhængige guider til kosttilskud",
    description: "Vi sammenligner kosttilskud med fast metode, tydelige kriterier og kilder.",
    siteName: "Kosttilskudsvalg",
    locale: "da_DK",
  },
}

export default async function Page() {
  const all = await getAllGuides()
  const guides = all.slice(0, 6)

  return (
    <>
      {/* ─── HERO ─── */}
      <section className="hero-bg relative w-full">
        <div className="hero-overlay">
          <div className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6 sm:py-16 md:py-20 lg:py-24">
            <div className="max-w-2xl">
              <h1 className="text-2xl font-bold leading-tight tracking-tight text-slate-900 sm:text-3xl md:text-4xl lg:text-[2.75rem] lg:leading-tight">
                Uafhængige guider til kosttilskud
              </h1>
              <p className="mt-3 max-w-xl text-base leading-relaxed text-slate-600 sm:text-lg">
                Vi sammenligner produkter med fast metode, tydelige kriterier og kilder &ndash; så du kan vælge det rigtige tilskud for din sundhed.
              </p>

              <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
                <Link
                  href="/metodik"
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-green-700 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-green-800"
                >
                  <ClipboardCheck className="h-4 w-4" />
                  Se vores metode
                </Link>
                <Link
                  href="/sidekort"
                  className="inline-flex items-center justify-center gap-2 rounded-full border border-slate-300 bg-white px-5 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                >
                  Udforsk alle kategorier
                </Link>
              </div>

              {/* Trust chips */}
              <div className="mt-6 flex flex-wrap gap-2">
                {[
                  { label: "Redaktion", href: "/redaktion" },
                  { label: "Metodik", href: "/metodik" },
                  { label: "Affiliatepolitik", href: "/annoncer-og-affiliate" },
                  { label: "Kilder & faktacheck", href: "/kilder-og-faktacheck" },
                ].map((chip) => (
                  <Link
                    key={chip.href}
                    href={chip.href}
                    className="inline-flex items-center gap-1.5 rounded-full bg-white/80 px-3 py-1 text-xs font-medium text-slate-600 ring-1 ring-slate-200 transition hover:bg-white hover:text-green-700 hover:ring-green-300"
                  >
                    <span className="h-1 w-1 rounded-full bg-green-500" />
                    {chip.label}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── MAIN CONTENT ─── */}
      <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-12 md:py-16">

        {/* ─── SENESTE ARTIKLER / TESTS ─── */}
        {guides.length > 0 && (
          <section className="mb-12 sm:mb-16">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl">
                Seneste tester & opdateringer
              </h2>
              <Link href="/guider" className="hidden text-sm font-medium text-green-700 hover:text-green-800 sm:flex sm:items-center sm:gap-1">
                Vis alle
                <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" /></svg>
              </Link>
            </div>
            <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {guides.map(g => {
                const silo = SLUG_TO_SILO[g.slug]
                const href = silo ? `/${silo}/${g.slug}` : `/${categoryToPath(g.category)}/${g.slug}`
                let note = g.update_note
                if (!note) {
                  if (g.date === g.updated || !g.updated) {
                    note = "Ny test publiceret med vores seneste vurderinger."
                  } else {
                    note = "Vi har gennemgået testen og opdateret toplisten."
                  }
                }
                
                return <GuideCard key={g.slug} title={g.title} href={href} category={g.category} updated={g.updated || g.date} banner={g.banner} updateNote={note} />
              })}
            </ul>
          </section>
        )}

        {/* ─── REDAKTIONEN (EEAT) ─── */}
        <section className="mb-12 sm:mb-16">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 sm:p-8">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl">
                  Redaktionen bag Kosttilskudsvalg
                </h2>
                <p className="mt-1 max-w-xl text-sm text-slate-600">
                  Alt indhold skrives af ernæringsrådgivere og faktatjekkes af en klinisk diætist.
                </p>
              </div>
              <Link
                href="/redaktion"
                className="inline-flex shrink-0 items-center gap-1 rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-green-50 hover:text-green-800 hover:border-green-300"
              >
                Mød hele teamet
                <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" /></svg>
              </Link>
            </div>

            <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {AUTHORS.map(a => (
                <div key={a.slug} className="rounded-lg border border-slate-200 bg-white p-4">
                  <div className="flex items-center gap-3">
                    <img
                      src={a.avatar || "/authors/placeholder.png"}
                      alt={a.name}
                      className="h-10 w-10 shrink-0 rounded-full object-cover ring-1 ring-slate-200"
                      loading="lazy"
                    />
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{a.name}</p>
                      <p className="text-xs text-green-700">{a.title}</p>
                    </div>
                  </div>
                  <p className="mt-2 text-xs leading-relaxed text-slate-500">{a.education}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ─── HVAD GØR OS UNIKKE (konkret, maalbart) ─── */}
        <section className="mb-12 sm:mb-16">
          <h2 className="text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl">
            Hvad gør os unikke
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600 sm:text-base">
            Konkrete principper &ndash; ikke generiske løfter. Hver punkt er dokumenteret og tilgængeligt.
          </p>

          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <FeatureBlock
              icon={BarChart3}
              title="Fast scoringsmodel (0–5)"
              desc="Hvert produkt vurderes med vægtede kriterier: ingredienser, dosering, pris pr. dagsdosis, dokumentation og renhed."
              link={{ label: "Se scoring-metoden", href: "/metodik#scoring" }}
            />
            <FeatureBlock
              icon={Beaker}
              title="Pris pr. dagsdosis & ingrediensprofil"
              desc="Vi beregner den reelle pris pr. dagsdosis og analyserer aktive ingredienser, ikke kun det producenten fremhæver."
              link={{ label: "Se et eksempel", href: "/protein-traening/kreatin" }}
            />
            <FeatureBlock
              icon={BookOpen}
              title="Krav til dokumentation"
              desc="Sundhedspåstande skal understøttes af myndigheder (EFSA, Fødevarestyrelsen), peer-reviewed studier eller kliniske retningslinjer."
              link={{ label: "Læs kildepolitik", href: "/kilder-og-faktacheck" }}
            />
            <FeatureBlock
              icon={ShieldCheck}
              title="Kontraindikationer & interaktioner"
              desc="Vi angiver kendte risici, interaktioner med medicin og grupper der bør udvise forsigtighed."
              link={{ label: "Se metodik", href: "/metodik" }}
            />
            <FeatureBlock
              icon={Users}
              title="Navngivet redaktion"
              desc="Alt indhold skrives af skribenter med faglig baggrund og faktatjekkes af en klinisk diætist."
              link={{ label: "Mød redaktionen", href: "/redaktion" }}
            />
            <FeatureBlock
              icon={ClipboardCheck}
              title="Opdateringslog på hver side"
              desc="Alle ændringer dokumenteres med dato og beskrivelse, så du altid ved, hvornår indholdet sidst er gennemgået."
              link={{ label: "Se affiliatepolitik", href: "/annoncer-og-affiliate" }}
            />
          </div>
        </section>

        {/* ─── FLAGSHIP GUIDES (info-intention) ─── */}
        <section className="mb-12 sm:mb-16">
          <h2 className="text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl">
            Vigtige guider
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600 sm:text-base">
            Dybdegående guider der hjælper dig med at forstå kosttilskud &ndash; ikke bare vælge et produkt.
          </p>

          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { title: "Kosttilskud: hvad virker, hvad virker ikke?", href: "/guider/kosttilskud-hvad-virker", cat: "Grundviden" },
              { title: "Protein: whey vs vegansk – sådan vælger du", href: "/guider/protein-whey-vs-vegansk", cat: "Protein" },
              { title: "Vitaminer: D, B12, C – hvem har gavn?", href: "/guider/vitaminer-hvem-har-gavn", cat: "Vitaminer" },
              { title: "Omega-3: kvalitet, oxidation og doser", href: "/guider/omega-3-kvalitet-doser", cat: "Omega-3" },
              { title: "Probiotika: stammer, doser og hvad evidensen siger", href: "/guider/probiotika-guide", cat: "Sundhed" },
              { title: "Søvn & stress: magnesium, melatonin, L-theanin", href: "/guider/sovn-stress-tilskud", cat: "Sundhed" },
            ].map((g) => (
              <Link
                key={g.href}
                href={g.href}
                className="group rounded-xl border border-slate-200 bg-white p-5 transition hover:border-green-300 hover:shadow-sm"
              >
                <span className="text-xs font-medium uppercase tracking-wider text-green-700">{g.cat}</span>
                <h3 className="mt-1.5 text-sm font-semibold leading-snug text-slate-900 group-hover:text-green-800">
                  {g.title}
                </h3>
              </Link>
            ))}
          </div>
        </section>

      </div>
    </>
  )
}

/* ─── Helper component ─── */
function FeatureBlock({ icon: Icon, title, desc, link }: {
  icon: React.ComponentType<{ className?: string }>
  title: string
  desc: string
  link: { label: string; href: string }
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <div className="mb-3 inline-flex rounded-lg bg-green-100 p-2 text-green-700">
        <Icon className="h-5 w-5" />
      </div>
      <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
      <p className="mt-1 text-sm leading-relaxed text-slate-600">{desc}</p>
      <Link href={link.href} className="mt-2 inline-block text-xs font-medium text-green-700 hover:text-green-800 hover:underline">
        {link.label} &rarr;
      </Link>
    </div>
  )
}
