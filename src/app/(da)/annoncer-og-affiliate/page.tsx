import { Breadcrumbs } from "@/components/breadcrumbs"
import Link from "next/link"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Annonce- & affiliatepolitik – Kosttilskudsvalg",
  description: "Sådan tjener Kosttilskudsvalg penge, hvordan affiliatelinks markeres, og hvordan vi sikrer uafhængige vurderinger.",
  alternates: { canonical: "https://www.kosttilskudsvalg.dk/annoncer-og-affiliate" },
}

export default function AffiliatePolicy() {
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
            <Breadcrumbs items={[{ name: "Annonce- & affiliatepolitik", href: "/annoncer-og-affiliate" }]} variant="dark" />
          </div>

          <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight text-white mb-6">
            Annonce- & affiliatepolitik
          </h1>
          <p className="text-lg md:text-xl text-slate-300 leading-relaxed max-w-3xl">
            Transparens om, hvordan vi finansieres, er en del af vores forpligtelse over for dig som læser. Her kan du læse præcis, hvordan vi tjener penge, og hvordan det <strong className="text-white">ikke</strong> påvirker vores vurderinger.
          </p>
        </div>
      </div>

      <div className="space-y-12">
        <div className="grid md:grid-cols-2 gap-8">
          <section className="bg-white rounded-2xl border border-slate-200 p-6 md:p-8 shadow-sm h-full">
            <div className="flex items-center gap-3 mb-6">
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-emerald-50 text-emerald-600">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-slate-900 m-0">Sådan tjener vi penge</h2>
            </div>
            <p className="text-slate-600 leading-relaxed">
              Kosttilskudsvalg finansieres primært via <strong>affiliatelinks</strong>. Når du klikker på et
              link til en webshop og køber et produkt, modtager vi en kommission fra den pågældende
              forhandler. Det koster dig ikke ekstra.
            </p>
          </section>

          <section className="bg-white rounded-2xl border border-slate-200 p-6 md:p-8 shadow-sm h-full">
            <div className="flex items-center gap-3 mb-6">
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-blue-50 text-blue-600">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-slate-900 m-0">Hvordan links markeres</h2>
            </div>
            <p className="text-slate-600 leading-relaxed">
              Alle sider med affiliatelinks indeholder en tydelig <em>affiliateoplysning</em> øverst.
              Links til butikker er markeret med teksten &ldquo;Se pris&rdquo; eller tilsvarende.
              Vi bruger <code>rel=&quot;sponsored nofollow&quot;</code> på alle affiliatelinks.
            </p>
          </section>
        </div>

        <section className="bg-white rounded-2xl border border-slate-200 p-6 md:p-8 shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-indigo-50 text-indigo-600">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-slate-900 m-0">Uafhængighed fra annoncører</h2>
          </div>
          <ul className="space-y-4 text-slate-600">
            <li className="flex items-start gap-3">
              <svg className="w-5 h-5 text-indigo-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
              <span>Vurderinger og scores fastlægges <strong>inden</strong> affiliatelinks tilføjes.</span>
            </li>
            <li className="flex items-start gap-3">
              <svg className="w-5 h-5 text-indigo-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
              <span>Ingen producent eller forhandler kan betale for en bedre placering eller score.</span>
            </li>
            <li className="flex items-start gap-3">
              <svg className="w-5 h-5 text-indigo-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
              <span>Vi accepterer <strong>ikke</strong> betalte anmeldelser.</span>
            </li>
            <li className="flex items-start gap-3">
              <svg className="w-5 h-5 text-indigo-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
              <span>Hvis et produkt ikke lever op til vores standarder, anbefaler vi det ikke &ndash; uanset affiliateaftale.</span>
            </li>
          </ul>
        </section>

        <div className="grid md:grid-cols-2 gap-8">
          <section className="bg-white rounded-2xl border border-slate-200 p-6 md:p-8 shadow-sm h-full">
            <div className="flex items-center gap-3 mb-6">
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-amber-50 text-amber-600">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-slate-900 m-0">Annoncering</h2>
            </div>
            <p className="text-slate-600 leading-relaxed">
              Vi viser på nuværende tidspunkt ikke displayannoncer (banners) på hjemmesiden.
              Skulle det ændre sig, vil annoncer altid være tydeligt markeret og adskilt fra
              redaktionelt indhold.
            </p>
          </section>

          <section className="bg-slate-50 rounded-2xl border border-slate-200 p-6 md:p-8 shadow-sm h-full flex flex-col justify-center text-center">
            <h2 className="text-xl font-bold text-slate-900 mb-3">Spørgsmål?</h2>
            <p className="text-slate-600 mb-4">
              Har du spørgsmål om vores finansiering, kan du kontakte os.
            </p>
            <a href="mailto:redaktion@kosttilskudsvalg.dk" className="inline-flex items-center justify-center px-6 py-2.5 border border-slate-300 text-sm font-medium rounded-xl text-slate-700 bg-white hover:bg-slate-50 transition-colors shadow-sm mx-auto">
              redaktion@kosttilskudsvalg.dk
            </a>
          </section>
        </div>
      </div>
    </div>
  )
}
