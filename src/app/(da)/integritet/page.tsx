import { Breadcrumbs } from "@/components/breadcrumbs"
import Link from "next/link"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Privatlivspolitik – Kosttilskudsvalg",
  description: "Læs Kosttilskudsvalgs privatlivspolitik og cookiepolitik.",
  alternates: { canonical: "https://www.kosttilskudsvalg.dk/integritet" },
}

export default function IntegritetPage() {
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
            <Breadcrumbs items={[{ name: "Privatlivspolitik", href: "/integritet" }]} variant="dark" />
          </div>

          <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight text-white mb-6">
            Privatlivspolitik
          </h1>
          <p className="text-lg md:text-xl text-slate-300 leading-relaxed max-w-3xl">
            Denne privatlivspolitik beskriver, hvordan Kosttilskudsvalg (&ldquo;vi&rdquo;, &ldquo;os&rdquo;) indsamler, bruger og beskytter dine personlige oplysninger, når du besøger vores websted.
          </p>
        </div>
      </div>

      <div className="space-y-12">
        <div className="grid md:grid-cols-2 gap-8">
          <section className="bg-white rounded-2xl border border-slate-200 p-6 md:p-8 shadow-sm h-full">
            <div className="flex items-center gap-3 mb-6">
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-blue-50 text-blue-600">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-slate-900 m-0">Personlige oplysninger</h2>
            </div>
            <p className="text-slate-600 leading-relaxed">
              Vi indsamler kun personlige oplysninger, som du frivilligt giver os, f.eks. via e-mail.
              Vi deler <strong className="text-slate-900">aldrig</strong> dine oplysninger med tredjeparter undtagen som beskrevet i denne politik, og kun hvis det er strengt nødvendigt.
            </p>
          </section>

          <section className="bg-white rounded-2xl border border-slate-200 p-6 md:p-8 shadow-sm h-full">
            <div className="flex items-center gap-3 mb-6">
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-emerald-50 text-emerald-600">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-slate-900 m-0">Affiliatelinks</h2>
            </div>
            <p className="text-slate-600 leading-relaxed">
              Vores websted indeholder affiliatelinks til tredjepartswebsteder. Når du klikker på et
              affiliatelink, kan den pågældende webshop placere sine egne cookies. Vi opfordrer dig til
              at læse privatlivspolitikken for de relevante webshops.
            </p>
          </section>
        </div>

        <section className="bg-white rounded-2xl border border-slate-200 p-6 md:p-8 shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-indigo-50 text-indigo-600">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-slate-900 m-0">Cookies</h2>
          </div>
          <p className="text-slate-600 leading-relaxed mb-4">
            Vi bruger cookies til at forbedre din oplevelse på vores websted og til at måle trafik
            via Google Analytics. Du kan til enhver tid afvise eller acceptere cookies via vores
            cookie-banner.
          </p>
          <Link href="/cookies" className="inline-flex items-center text-green-700 font-medium hover:underline">
            Læs vores fulde cookiepolitik
            <svg className="w-4 h-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </section>

        <section className="bg-slate-50 rounded-2xl border border-slate-200 p-6 md:p-8 shadow-sm text-center">
          <h2 className="text-xl font-bold text-slate-900 mb-3">Kontakt</h2>
          <p className="text-slate-600 mb-4">
            Har du spørgsmål om vores privatlivspolitik, kan du kontakte os.
          </p>
          <a href="mailto:kontakt@kosttilskudsvalg.dk" className="inline-flex items-center justify-center px-6 py-2.5 border border-slate-300 text-sm font-medium rounded-xl text-slate-700 bg-white hover:bg-slate-50 transition-colors shadow-sm mx-auto">
            kontakt@kosttilskudsvalg.dk
          </a>
        </section>
      </div>
    </div>
  )
}
