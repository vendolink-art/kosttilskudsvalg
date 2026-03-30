import { getAllGuides } from "@/lib/mdx"
import { Breadcrumbs } from "@/components/breadcrumbs"
import Link from "next/link"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Guider – Dybdegående viden om kosttilskud",
  description: "Ekspertguider om kosttilskud, ernæring og sundhed. Evidensbaseret viden om vitaminer, protein, superfoods, omega-3 og meget mere.",
}

function formatDate(d: string | undefined): string {
  if (!d) return ""
  try {
    return new Date(d).toLocaleDateString("da-DK", {
      day: "numeric",
      month: "short",
      year: "numeric",
    })
  } catch {
    return d
  }
}

export default async function GuiderPage() {
  const all = await getAllGuides()
  const guides = all.filter(g => (g.category || "").toLowerCase() === "guider")
  const [featured, ...rest] = guides

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Hero Banner */}
      <div className="relative rounded-3xl overflow-hidden mb-12 shadow-lg">
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-950 via-slate-900 to-slate-900"></div>

        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
          <div className="absolute -top-[20%] -left-[10%] w-[45%] h-[45%] rounded-full bg-emerald-500/20 blur-[80px]"></div>
          <div className="absolute top-[20%] right-[5%] w-[30%] h-[30%] rounded-full bg-teal-400/10 blur-[60px]"></div>
          <div className="absolute bottom-[5%] left-[30%] w-[35%] h-[35%] rounded-full bg-cyan-500/8 blur-[70px]"></div>
        </div>

        <div className="relative p-8 md:p-12 lg:p-16">
          <div className="mb-8">
            <Breadcrumbs items={[{ name: "Guider", href: "/guider" }]} variant="dark" />
          </div>

          <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight text-white mb-5">
            Guider om kosttilskud
          </h1>
          <p className="text-lg md:text-xl text-slate-300 leading-relaxed max-w-3xl mb-8">
            Dybdegående guider om kosttilskud, ernæring og sundhed. Skrevet af vores redaktion og{" "}
            <strong className="text-white">faktatjekket af klinisk diætist</strong>.
          </p>

          {/* Stats row */}
          <div className="flex flex-wrap gap-6">
            <div className="flex items-center gap-2 text-sm text-slate-400">
              <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
                <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <span><strong className="text-white">{guides.length}</strong> guider</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-slate-400">
              <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
                <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <span>Faktatjekket af klinisk diætist</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-slate-400">
              <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
                <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </div>
              <span>Opdateret <strong className="text-white">2026</strong></span>
            </div>
          </div>
        </div>
      </div>

      {guides.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-12 text-center">
          <svg className="w-12 h-12 text-slate-300 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
          <p className="text-slate-500">
            Vi arbejder på nye guider &ndash; de publiceres snart.
          </p>
        </div>
      ) : (
        <>
          {/* Featured guide */}
          {featured && (
            <Link
              href={`/guider/${featured.slug}`}
              className="group block rounded-2xl border border-slate-200 bg-white shadow-sm hover:shadow-lg hover:border-emerald-200 transition-all mb-8 overflow-hidden"
            >
              <div className="grid grid-cols-1 md:grid-cols-5">
                <div className="md:col-span-2 bg-gradient-to-br from-emerald-50 via-teal-50/50 to-slate-50 flex items-center justify-center p-10 md:p-12">
                  <div className="text-center">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white shadow-sm mb-4">
                      <svg className="w-8 h-8 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                      </svg>
                    </div>
                    <span className="inline-block rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold uppercase tracking-wider text-emerald-700">
                      Anbefalet guide
                    </span>
                  </div>
                </div>
                <div className="md:col-span-3 p-6 md:p-8 flex flex-col justify-center">
                  {featured.tags && featured.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-3">
                      {featured.tags.filter(t => t !== "guide").slice(0, 4).map(tag => (
                        <span key={tag} className="inline-block rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-medium text-slate-500">
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                  <h2 className="text-xl md:text-2xl font-bold text-slate-900 group-hover:text-emerald-700 transition-colors leading-snug mb-3">
                    {featured.title}
                  </h2>
                  <p className="text-slate-500 leading-relaxed mb-4 line-clamp-3">
                    {featured.description}
                  </p>
                  <div className="flex items-center justify-between">
                    {featured.updated && (
                      <p className="text-xs text-slate-400">
                        Opdateret {formatDate(featured.updated)}
                      </p>
                    )}
                    <span className="text-sm font-semibold text-emerald-600 group-hover:text-emerald-700 flex items-center gap-1.5 transition-colors">
                      Læs guiden
                      <svg className="w-4 h-4 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
                      </svg>
                    </span>
                  </div>
                </div>
              </div>
            </Link>
          )}

          {/* Remaining guides grid */}
          {rest.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {rest.map(g => (
                <Link
                  key={g.slug}
                  href={`/guider/${g.slug}`}
                  className="group flex flex-col rounded-2xl border border-slate-200 bg-white shadow-sm hover:shadow-md hover:border-emerald-200 transition-all overflow-hidden"
                >
                  {/* Card gradient header */}
                  <div className="h-2 bg-gradient-to-r from-emerald-400 to-teal-300 shrink-0" />

                  <div className="p-5 flex flex-col flex-1">
                    {g.tags && g.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mb-3">
                        {g.tags.filter(t => t !== "guide").slice(0, 3).map(tag => (
                          <span key={tag} className="inline-block rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-500 uppercase tracking-wide">
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}

                    <h3 className="text-base font-bold text-slate-900 leading-snug group-hover:text-emerald-700 transition-colors mb-2">
                      {g.title}
                    </h3>

                    {g.description && (
                      <p className="text-sm text-slate-500 leading-relaxed line-clamp-2 mb-4">
                        {g.description}
                      </p>
                    )}

                    <div className="mt-auto pt-3 border-t border-slate-100 flex items-center justify-between">
                      {g.updated && (
                        <p className="text-xs text-slate-400">
                          {formatDate(g.updated)}
                        </p>
                      )}
                      <span className="text-xs font-semibold text-emerald-600 group-hover:text-emerald-700 transition-colors flex items-center gap-1">
                        Læs guide
                        <svg className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                        </svg>
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </>
      )}

      {/* Trust / methodology box */}
      <div className="mt-14 rounded-2xl border border-emerald-200 bg-emerald-50/30 p-6 md:p-8 shadow-sm">
        <div className="flex flex-col md:flex-row gap-6 items-start">
          <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-emerald-100 text-emerald-600 shrink-0">
            <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-bold text-slate-900 mb-2">Hvorfor stole på vores guider?</h3>
            <p className="text-sm text-slate-600 leading-relaxed mb-4">
              Alle guider skrives af skribenter med faglig baggrund i ernæring og faktatjekkes af en autoriseret klinisk diætist.
              Vi baserer vores konklusioner på officielle anbefalinger og peer-reviewed forskning – ikke producentpåstande.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/metodik"
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-700 hover:text-emerald-600 transition-colors"
              >
                Se vores metodik
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </Link>
              <Link
                href="/redaktion"
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-700 hover:text-emerald-600 transition-colors"
              >
                Mød redaktionen
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
