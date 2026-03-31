import { AUTHORS } from "@/config/authors"
import { Breadcrumbs } from "@/components/breadcrumbs"
import Link from "next/link"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Om Kosttilskudsvalg – Hvem vi er, og hvorfor vi findes",
  description: "Konkret information om Kosttilskudsvalg: hvem vi er, hvordan vi finansieres, vores redaktionelle model og hvad vi ikke gør.",
  alternates: { canonical: "https://www.kosttilskudsvalg.dk/om-os" },
  openGraph: {
    title: "Om Kosttilskudsvalg – Hvem vi er, og hvorfor vi findes",
    description: "Konkret information om Kosttilskudsvalg: hvem vi er, hvordan vi finansieres, vores redaktionelle model og hvad vi ikke gør.",
    url: "https://www.kosttilskudsvalg.dk/om-os",
    type: "website",
    locale: "da_DK",
    siteName: "Kosttilskudsvalg",
  },
}

export default function OmOsPage() {
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
            <Breadcrumbs items={[{ name: "Om os", href: "/om-os" }]} variant="dark" />
          </div>

          <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight text-white mb-6">
            Om Kosttilskudsvalg
          </h1>
          <p className="text-lg md:text-xl text-slate-300 leading-relaxed max-w-3xl">
            Kosttilskudsvalg er en uafhængig dansk publikation, der analyserer og sammenligner kosttilskud på det danske marked. Vi udgives af Venerolink AB og har fokus udelukkende på danske forbrugere.
          </p>
        </div>
      </div>

      <div className="space-y-12">
        <section className="bg-white rounded-2xl border border-slate-200 p-6 md:p-8 shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-blue-50 text-blue-600">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-slate-900 m-0">Hvorfor vi findes</h2>
          </div>
          <p className="text-slate-600 leading-relaxed">
            Kosttilskudsmarkedet er præget af markedsføringspåstande, der sjældent matches af evidens.
            Vi vil give danske forbrugere et gennemsigtigt grundlag for at vælge &ndash; med tydelig
            metodik, navngivne skribenter og verificerbare kilder.
          </p>
        </section>

        <div className="grid md:grid-cols-2 gap-8">
          <section className="bg-white rounded-2xl border border-slate-200 p-6 md:p-8 shadow-sm h-full">
            <div className="flex items-center gap-3 mb-6">
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-emerald-50 text-emerald-600">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-slate-900 m-0">Hvad vi gør</h2>
            </div>
            <ul className="space-y-3 text-slate-600">
              <li className="flex items-start gap-2">
                <span className="text-emerald-500 mt-1">•</span>
                <span>Analyserer ingrediensprofiler, doser og pris pr. dagsdosis</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-emerald-500 mt-1">•</span>
                <span>Sammenligner produkter ud fra en <Link href="/metodik" className="text-green-700 hover:underline font-medium">fast scoringsmodel</Link></span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-emerald-500 mt-1">•</span>
                <span>Faktatjekker sundhedspåstande mod myndigheds- og peer-reviewed kilder</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-emerald-500 mt-1">•</span>
                <span>Dokumenterer alle ændringer i en synlig opdateringslog</span>
              </li>
            </ul>
          </section>

          <section className="bg-white rounded-2xl border border-slate-200 p-6 md:p-8 shadow-sm h-full">
            <div className="flex items-center gap-3 mb-6">
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-red-50 text-red-600">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-slate-900 m-0">Hvad vi IKKE gør</h2>
            </div>
            <ul className="space-y-3 text-slate-600">
              <li className="flex items-start gap-2">
                <span className="text-red-500 mt-1">•</span>
                <span>Vi giver <strong>ikke</strong> individuelle sundhedsråd</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-red-500 mt-1">•</span>
                <span>Vi udfører <strong>ikke</strong> laboratorietest (vi analyserer tilgængelige data)</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-red-500 mt-1">•</span>
                <span>Vi accepterer <strong>ikke</strong> betaling for bedre placering eller score</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-red-500 mt-1">•</span>
                <span>Vi erstatter <strong>ikke</strong> professionel rådgivning</span>
              </li>
            </ul>
          </section>
        </div>

        <section className="bg-white rounded-2xl border border-slate-200 p-6 md:p-8 shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-purple-50 text-purple-600">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-slate-900 m-0">Hvordan vi finansieres</h2>
          </div>
          <p className="text-slate-600 leading-relaxed mb-4">
            Vi finansieres primært via affiliatelinks. Vurderingerne fastlægges <strong>inden</strong> links
            tilføjes, og ingen producent har indflydelse på vores scoring.
          </p>
          <Link href="/annoncer-og-affiliate" className="inline-flex items-center text-green-700 font-medium hover:underline">
            Læs vores annonce- & affiliatepolitik
            <svg className="w-4 h-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </section>

        <section className="bg-white rounded-2xl border border-slate-200 p-6 md:p-8 shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-amber-50 text-amber-600">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-slate-900 m-0">Redaktionel model</h2>
          </div>
          <p className="text-slate-600 leading-relaxed mb-6">
            Hver artikel følger en treleddet proces for at sikre høj faglig kvalitet:
          </p>
          <div className="grid sm:grid-cols-3 gap-4 mb-6">
            <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
              <div className="font-bold text-slate-900 mb-1">1. Skribent</div>
              <div className="text-sm text-slate-600">Med faglig baggrund researcher og skriver artiklen.</div>
            </div>
            <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
              <div className="font-bold text-slate-900 mb-1">2. Faglig reviewer</div>
              <div className="text-sm text-slate-600">Klinisk diætist faktatjekker sundhedspåstande.</div>
            </div>
            <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
              <div className="font-bold text-slate-900 mb-1">3. Redaktør</div>
              <div className="text-sm text-slate-600">Ansvarshavende redaktør godkender den endelige version.</div>
            </div>
          </div>
          <p className="text-slate-600 text-sm">
            Se vores <Link href="/redaktion" className="text-green-700 hover:underline font-medium">redaktion</Link>, <Link href="/metodik" className="text-green-700 hover:underline font-medium">metodik</Link> og <Link href="/kilder-og-faktacheck" className="text-green-700 hover:underline font-medium">kildepolitik</Link> for fuld transparens.
          </p>
        </section>

        <section className="bg-white rounded-2xl border border-slate-200 p-6 md:p-8 shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-slate-100 text-slate-600">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-slate-900 m-0">Kontakt</h2>
          </div>
          <div className="space-y-3 text-slate-600">
            <p>
              <strong className="text-slate-900">Redaktionelle henvendelser:</strong><br />
              <a href="mailto:redaktion@kosttilskudsvalg.dk" className="text-green-700 hover:underline">redaktion@kosttilskudsvalg.dk</a>
            </p>
            <p>
              <strong className="text-slate-900">Samarbejde & presse:</strong><br />
              <a href="mailto:kontakt@kosttilskudsvalg.dk" className="text-green-700 hover:underline">kontakt@kosttilskudsvalg.dk</a>
            </p>
          </div>
        </section>
      </div>

      {/* Kort teamoverblik med links til /redaktion */}
      <section className="mt-12 rounded-2xl border border-slate-200 bg-slate-50 p-6 md:p-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-slate-900">Redaktionen</h2>
          <Link href="/redaktion" className="text-sm font-medium text-green-700 hover:text-green-800 hover:underline">
            Se alle profiler &rarr;
          </Link>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {AUTHORS.map(a => (
            <div key={a.slug} className="rounded-lg border border-slate-200 bg-white p-3">
              <div className="flex items-center gap-2">
                <img
                  src={a.avatar || "/authors/placeholder.png"}
                  alt={a.name}
                  className="h-8 w-8 shrink-0 rounded-full object-cover ring-1 ring-slate-200"
                  loading="lazy"
                />
                <div>
                  <p className="text-sm font-medium text-slate-900">{a.name}</p>
                  <p className="text-xs text-slate-500">{a.title}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
