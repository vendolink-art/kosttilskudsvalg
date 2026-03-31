import { Breadcrumbs } from "@/components/breadcrumbs"
import Link from "next/link"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Kontakt – Kosttilskudsvalg",
  description: "Kontakt Kosttilskudsvalgs redaktion. Vi svarer på spørgsmål om vores analyser, rettelser og samarbejde.",
  alternates: { canonical: "https://www.kosttilskudsvalg.dk/kontakt" },
}

export default function KontaktPage() {
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
            <Breadcrumbs items={[{ name: "Kontakt", href: "/kontakt" }]} variant="dark" />
          </div>

          <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight text-white mb-6">
            Kontakt os
          </h1>
          <p className="text-lg md:text-xl text-slate-300 leading-relaxed max-w-3xl">
            Har du spørgsmål til vores analyser, forslag til nye emner eller vil du i kontakt med redaktionen? Vi hører meget gerne fra dig.
          </p>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2">
        {/* Redaktionelle henvendelser */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 md:p-8 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-blue-50 text-blue-600">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-slate-900 m-0">Redaktion</h2>
          </div>
          <p className="text-slate-600 leading-relaxed mb-6">
            Spørgsmål til artikler, rettelser, faktacheck eller forslag til nye emner.
          </p>
          <a
            href="mailto:redaktion@kosttilskudsvalg.dk"
            className="inline-flex items-center justify-center w-full rounded-xl bg-slate-900 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-slate-800"
          >
            redaktion@kosttilskudsvalg.dk
          </a>
          <p className="mt-3 text-xs text-center text-slate-400">Svartid: 1&ndash;2 hverdage</p>
        </div>

        {/* Samarbejde & presse */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 md:p-8 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-emerald-50 text-emerald-600">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-slate-900 m-0">Samarbejde & presse</h2>
          </div>
          <p className="text-slate-600 leading-relaxed mb-6">
            Samarbejdsforespørgsler, pressehenvendelser og PR-kontakt.
          </p>
          <a
            href="mailto:kontakt@kosttilskudsvalg.dk"
            className="inline-flex items-center justify-center w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
          >
            kontakt@kosttilskudsvalg.dk
          </a>
          <p className="mt-3 text-xs text-center text-slate-400">Svartid: 2&ndash;5 hverdage</p>
        </div>
      </div>

      {/* Virksomhedsoplysninger */}
      <div className="mt-8 rounded-2xl border border-slate-200 bg-slate-50 p-6 md:p-8 shadow-sm">
        <h2 className="text-xl font-bold text-slate-900 mb-6">Virksomhedsoplysninger</h2>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <span className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">Udgiver</span>
            <span className="text-slate-900 font-medium">Venerolink AB</span>
          </div>
          <div>
            <span className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">Organisationsnr.</span>
            <span className="text-slate-900 font-medium">559128-9151</span>
          </div>
          <div>
            <span className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">Ansvarshavende redaktør</span>
            <span className="text-slate-900 font-medium">Thomas Møller</span>
          </div>
          <div>
            <span className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">Land</span>
            <span className="text-slate-900 font-medium">Danmark / Sverige</span>
          </div>
        </div>
        <div className="mt-6 pt-6 border-t border-slate-200">
          <p className="text-sm text-slate-500 leading-relaxed">
            Kosttilskudsvalg udgives af Venerolink AB (svensk virksomhed). Redaktionen arbejder med
            fokus på det danske marked og danske forbrugere. Alle artikler er skrevet og
            faktatjekket på dansk af vores <Link href="/redaktion" className="text-slate-700 font-medium hover:underline">redaktion</Link>.
          </p>
        </div>
      </div>

      {/* Fejl og rettelser */}
      <div className="mt-8 rounded-2xl border border-amber-200 bg-amber-50 p-6 md:p-8 flex flex-col md:flex-row gap-6 items-start md:items-center">
        <div className="flex items-center justify-center w-12 h-12 rounded-full bg-amber-100 text-amber-600 shrink-0">
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <div>
          <h3 className="text-lg font-bold text-amber-900 mb-1">Fandt du en fejl?</h3>
          <p className="text-amber-800 leading-relaxed">
            Vi retter dokumenterede fejl inden for 24 timer. Send gerne en e-mail til <a href="mailto:redaktion@kosttilskudsvalg.dk" className="font-medium underline hover:text-amber-950">redaktion@kosttilskudsvalg.dk</a> med link til siden og en beskrivelse af fejlen.
          </p>
        </div>
      </div>
    </div>
  )
}
