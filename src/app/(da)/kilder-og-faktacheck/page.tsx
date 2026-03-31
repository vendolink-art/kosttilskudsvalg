import { Breadcrumbs } from "@/components/breadcrumbs"
import Link from "next/link"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Kilder & faktacheck – Kosttilskudsvalg",
  description: "Vores kildepolitik: hvordan vi udvælger, verificerer og prioriterer kilder. Sådan faktachecker vi sundhedspåstande.",
  alternates: { canonical: "https://www.kosttilskudsvalg.dk/kilder-og-faktacheck" },
  openGraph: {
    title: "Kilder & faktacheck – Kosttilskudsvalg",
    description: "Vores kildepolitik: hvordan vi udvælger, verificerer og prioriterer kilder. Sådan faktachecker vi sundhedspåstande.",
    url: "https://www.kosttilskudsvalg.dk/kilder-og-faktacheck",
    type: "website",
    locale: "da_DK",
    siteName: "Kosttilskudsvalg",
  },
}

export default function KilderPage() {
  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Hero Banner */}
      <div className="relative rounded-3xl overflow-hidden mb-12 shadow-lg">
        {/* Background Gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900"></div>
        
        {/* Decorative elements */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
          <div className="absolute -top-[25%] -left-[10%] w-[50%] h-[50%] rounded-full bg-blue-500/20 blur-[80px]"></div>
          <div className="absolute bottom-[10%] -right-[10%] w-[40%] h-[40%] rounded-full bg-indigo-500/20 blur-[80px]"></div>
        </div>

        {/* Content */}
        <div className="relative p-8 md:p-12 lg:p-16">
          <div className="mb-8">
            <Breadcrumbs items={[{ name: "Kilder & faktacheck", href: "/kilder-og-faktacheck" }]} variant="dark" />
          </div>

          <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight text-white mb-6">
            Kilder & faktacheck
          </h1>
          <p className="text-lg md:text-xl text-slate-300 leading-relaxed max-w-3xl">
            Kosttilskud er et område med mange påstande og få garantier. Vores kildepolitik sikrer,
            at alt, vi skriver, hviler på <strong className="text-white">verificerbare data</strong> &ndash; ikke producentløfter.
          </p>
        </div>
      </div>

      <div className="space-y-12">
        <section>
          <div className="flex items-center gap-3 mb-6">
            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-blue-50 text-blue-600">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 002 2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-slate-900 m-0">Kilde-hierarki</h2>
          </div>
          <p className="text-slate-600 mb-6">
            Vi bruger følgende hierarki, når vi vurderer og underbygger sundhedsrelaterede påstande:
          </p>

          <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-sm">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-4 font-bold text-slate-900">Niveau</th>
                  <th className="px-6 py-4 font-bold text-slate-900">Kildetype</th>
                  <th className="px-6 py-4 font-bold text-slate-900">Eksempler</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                <tr className="bg-green-50/30 hover:bg-green-50/50 transition-colors">
                  <td className="px-6 py-4 font-bold text-green-700">A (højest)</td>
                  <td className="px-6 py-4 font-medium text-slate-900">Myndigheder & officielle retningslinjer</td>
                  <td className="px-6 py-4 text-slate-600">Fødevarestyrelsen, EFSA, Sundhedsstyrelsen, WHO</td>
                </tr>
                <tr className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4 font-bold text-slate-700">B</td>
                  <td className="px-6 py-4 font-medium text-slate-900">Peer-reviewed studier & systematiske reviews</td>
                  <td className="px-6 py-4 text-slate-600">PubMed, Cochrane Library, meta-analyser</td>
                </tr>
                <tr className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4 font-bold text-slate-700">C</td>
                  <td className="px-6 py-4 font-medium text-slate-900">Kliniske retningslinjer & faglige organisationer</td>
                  <td className="px-6 py-4 text-slate-600">Dansk Selskab for Klinisk Ernæring, Nordic Nutrition Recommendations</td>
                </tr>
                <tr className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4 font-bold text-slate-700">D</td>
                  <td className="px-6 py-4 font-medium text-slate-900">Producentdata & produktetiketter</td>
                  <td className="px-6 py-4 text-slate-600">Ingredienslister, næringsdeklarationer, certifikater</td>
                </tr>
                <tr className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4 font-bold text-slate-400">E (lavest)</td>
                  <td className="px-6 py-4 font-medium text-slate-900">Brugeranmeldelser & forbrugerrapporter</td>
                  <td className="px-6 py-4 text-slate-500">Trustpilot, Pricerunner-anmeldelser (supplement, aldrig alene)</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <div className="grid md:grid-cols-2 gap-8">
          <section className="bg-white rounded-2xl border border-slate-200 p-6 md:p-8 shadow-sm h-full">
            <div className="flex items-center gap-3 mb-6">
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-emerald-50 text-emerald-600">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-slate-900 m-0">Faktacheck-proces</h2>
            </div>
            <ol className="space-y-4 text-slate-600 relative border-l border-slate-200 ml-3 pl-6">
              <li className="relative">
                <div className="absolute -left-[33px] top-1 w-4 h-4 rounded-full bg-emerald-100 border-2 border-emerald-500"></div>
                <strong className="text-slate-900 block mb-1">1. Skribenten</strong>
                Research'er og skriver artiklen med kilder inline.
              </li>
              <li className="relative">
                <div className="absolute -left-[33px] top-1 w-4 h-4 rounded-full bg-emerald-100 border-2 border-emerald-500"></div>
                <strong className="text-slate-900 block mb-1">2. Faglig reviewer</strong>
                Klinisk diætist gennemgår alle sundhedspåstande, doseringsanbefalinger og kontraindikationer.
              </li>
              <li className="relative">
                <div className="absolute -left-[33px] top-1 w-4 h-4 rounded-full bg-emerald-100 border-2 border-emerald-500"></div>
                <strong className="text-slate-900 block mb-1">3. Redaktør</strong>
                Ansvarshavende redaktør godkender den endelige version og sikrer, at format og sprog lever op til standarden.
              </li>
            </ol>
          </section>

          <section className="bg-white rounded-2xl border border-slate-200 p-6 md:p-8 shadow-sm h-full">
            <div className="flex items-center gap-3 mb-6">
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-red-50 text-red-600">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-slate-900 m-0">Hvad vi IKKE gør</h2>
            </div>
            <ul className="space-y-3 text-slate-600">
              <li className="flex items-start gap-2">
                <span className="text-red-500 mt-1">•</span>
                Vi giver <strong>ikke</strong> individuelle sundhedsråd.
              </li>
              <li className="flex items-start gap-2">
                <span className="text-red-500 mt-1">•</span>
                Vi stiller <strong>ikke</strong> diagnoser.
              </li>
              <li className="flex items-start gap-2">
                <span className="text-red-500 mt-1">•</span>
                Vi anbefaler <strong>ikke</strong> at erstatte medicin med kosttilskud.
              </li>
              <li className="flex items-start gap-2">
                <span className="text-red-500 mt-1">•</span>
                Vi bruger <strong>ikke</strong> producent-pressematerialer som primær kilde.
              </li>
            </ul>
          </section>
        </div>

        <section className="bg-slate-50 rounded-2xl border border-slate-200 p-6 md:p-8 text-center">
          <h2 className="text-xl font-bold text-slate-900 mb-3">Fejl og rettelser</h2>
          <p className="text-slate-600 mb-4 max-w-2xl mx-auto">
            Vi retter dokumenterede fejl inden for 24 timer. Større rettelser dokumenteres i sidens
            opdateringslog. Kontakt os gerne hvis du finder en fejl.
          </p>
          <a href="mailto:redaktion@kosttilskudsvalg.dk" className="inline-flex items-center justify-center px-6 py-2.5 border border-slate-300 text-sm font-medium rounded-xl text-slate-700 bg-white hover:bg-slate-50 transition-colors shadow-sm">
            redaktion@kosttilskudsvalg.dk
          </a>
        </section>
      </div>
    </div>
  )
}
