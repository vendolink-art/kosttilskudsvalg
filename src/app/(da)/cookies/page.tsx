import { Breadcrumbs } from "@/components/breadcrumbs"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Cookiepolitik – Kosttilskudsvalg",
  description: "Læs om hvilke cookies Kosttilskudsvalg bruger, og hvordan du kan administrere dem.",
}

export default function CookiesPage() {
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
            <Breadcrumbs items={[{ name: "Cookiepolitik", href: "/cookies" }]} variant="dark" />
          </div>

          <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight text-white mb-6">
            Cookiepolitik
          </h1>
          <p className="text-lg md:text-xl text-slate-300 leading-relaxed max-w-3xl">
            Denne side forklarer, hvilke cookies Kosttilskudsvalg bruger, og hvordan du kan administrere dem for at beskytte dit privatliv.
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
            <h2 className="text-2xl font-bold text-slate-900 m-0">Hvad er cookies?</h2>
          </div>
          <p className="text-slate-600 leading-relaxed">
            Cookies er små tekstfiler, der gemmes på din enhed, når du besøger en hjemmeside.
            De bruges til at huske dine præferencer og til at indsamle statistik om, hvordan
            hjemmesiden bruges.
          </p>
        </section>

        <div className="grid md:grid-cols-2 gap-8">
          <section className="bg-white rounded-2xl border border-slate-200 p-6 md:p-8 shadow-sm h-full">
            <div className="flex items-center gap-3 mb-6">
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-emerald-50 text-emerald-600">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-slate-900 m-0">Nødvendige cookies</h2>
            </div>
            <p className="text-slate-600 mb-4">
              Disse cookies er nødvendige for, at hjemmesiden fungerer korrekt. De kan ikke slås fra.
            </p>
            <ul className="space-y-3 text-slate-600">
              <li className="flex items-start gap-2">
                <span className="text-emerald-500 mt-1">•</span>
                <span><strong>cookie-consent</strong> &ndash; Gemmer dit valg om cookies (accepteret/afvist)</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-emerald-500 mt-1">•</span>
                <span><strong>admin_session</strong> &ndash; Autentificering for admin-sider (kun redaktionen)</span>
              </li>
            </ul>
          </section>

          <section className="bg-white rounded-2xl border border-slate-200 p-6 md:p-8 shadow-sm h-full">
            <div className="flex items-center gap-3 mb-6">
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-indigo-50 text-indigo-600">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-slate-900 m-0">Statistik-cookies</h2>
            </div>
            <p className="text-slate-600 mb-4">
              Hvis du accepterer, bruger vi Google Analytics til at forstå, hvordan besøgende bruger hjemmesiden. Disse cookies indsamler anonymiseret data.
            </p>
            <ul className="space-y-3 text-slate-600">
              <li className="flex items-start gap-2">
                <span className="text-indigo-500 mt-1">•</span>
                <span><strong>_ga / _ga_*</strong> &ndash; Google Analytics (anonymiseret IP)</span>
              </li>
            </ul>
          </section>
        </div>

        <section className="bg-white rounded-2xl border border-slate-200 p-6 md:p-8 shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-amber-50 text-amber-600">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-slate-900 m-0">Sådan administrerer du cookies</h2>
          </div>
          <p className="text-slate-600 leading-relaxed">
            Du kan til enhver tid ændre dine cookie-præferencer via banneret nederst på siden,
            eller ved at slette cookies i din browsers indstillinger.
          </p>
        </section>
      </div>
    </div>
  )
}
