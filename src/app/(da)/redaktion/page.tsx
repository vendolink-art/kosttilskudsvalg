import { AUTHORS } from "@/config/authors"
import { Breadcrumbs } from "@/components/breadcrumbs"
import Link from "next/link"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Redaktion – Hvem skriver og faktatjekker indholdet",
  description: "Mød redaktionen bag Kosttilskudsvalg: navngivne skribenter, faglige reviewere og deres kvalifikationer. Transparens om hvem der står bag vores analyser.",
  alternates: { canonical: "https://www.kosttilskudsvalg.dk/redaktion" },
}

export default function RedaktionPage() {
  const skribenter = AUTHORS.filter(a => a.role === "skribent")
  const reviewere = AUTHORS.filter(a => a.role === "faglig-reviewer")
  const redaktoerer = AUTHORS.filter(a => a.role === "redaktoer")

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
            <Breadcrumbs items={[{ name: "Redaktion", href: "/redaktion" }]} variant="dark" />
          </div>

          <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight text-white mb-6">
            Redaktionen bag Kosttilskudsvalg
          </h1>
          <p className="text-lg md:text-xl text-slate-300 leading-relaxed max-w-3xl">
            Alt indhold på Kosttilskudsvalg skrives, gennemgås og faktatjekkes af navngivne personer med relevant faglig baggrund. Vi mener, at transparens om <strong className="text-white">hvem</strong> der står bag er en forudsætning for troværdighed &ndash; især når det handler om sundhed og kosttilskud.
          </p>
        </div>
      </div>

      <div className="mb-12">
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-6 md:p-8 shadow-sm flex flex-col md:flex-row gap-6 items-start md:items-center">
          <div className="flex items-center justify-center w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 shrink-0">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">Vores redaktionelle model</h3>
            <p className="text-slate-700 leading-relaxed">
              Hver artikel skrives af en skribent med faglig baggrund og gennemgås af en klinisk diætist, inden den publiceres. Ansvarshavende redaktør godkender den endelige version.
            </p>
            <Link href="/metodik" className="inline-flex items-center mt-3 text-emerald-700 font-medium hover:underline">
              Se vores fulde metodik
              <svg className="w-4 h-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
        </div>
      </div>

      <div className="space-y-12">
        {/* Ansvarshavende redaktør */}
        <section>
          <div className="flex items-center gap-3 mb-6">
            <h2 className="text-2xl font-bold text-slate-900 m-0">Ansvarshavende redaktør</h2>
          </div>
          <div className="space-y-4">
            {redaktoerer.map(a => <AuthorProfile key={a.slug} a={a} />)}
          </div>
        </section>

        {/* Faglige reviewere */}
        <section>
          <div className="flex items-center gap-3 mb-6">
            <h2 className="text-2xl font-bold text-slate-900 m-0">Faglig reviewer (faktatjek)</h2>
          </div>
          <div className="space-y-4">
            {reviewere.map(a => <AuthorProfile key={a.slug} a={a} />)}
          </div>
        </section>

        {/* Skribenter */}
        <section>
          <div className="flex items-center gap-3 mb-6">
            <h2 className="text-2xl font-bold text-slate-900 m-0">Skribenter & analytikere</h2>
          </div>
          <div className="space-y-4">
            {skribenter.map(a => <AuthorProfile key={a.slug} a={a} />)}
          </div>
        </section>
      </div>

      {/* Kontakt */}
      <section className="mt-16 rounded-2xl border border-slate-200 bg-slate-50 p-6 md:p-8 shadow-sm text-center">
        <div className="flex justify-center mb-4">
          <div className="flex items-center justify-center w-12 h-12 rounded-full bg-blue-100 text-blue-600">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
        </div>
        <h2 className="text-xl font-bold text-slate-900 mb-3">Kontakt redaktionen</h2>
        <p className="text-slate-600 mb-4 max-w-xl mx-auto">
          Har du spørgsmål til en artikel, en rettelse eller vil du foreslå et emne? Vi svarer typisk inden for 1&ndash;2 hverdage og retter dokumenterede fejl inden for 24 timer.
        </p>
        <a href="mailto:redaktion@kosttilskudsvalg.dk" className="inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-xl text-white bg-slate-900 hover:bg-slate-800 transition-colors">
          Skriv til redaktion@kosttilskudsvalg.dk
        </a>
      </section>

      {/* Person Schema */}
      {AUTHORS.map(a => (
        <script
          key={a.slug}
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Person",
              name: a.name,
              jobTitle: a.title,
              description: a.bio,
              worksFor: {
                "@type": "Organization",
                name: "Kosttilskudsvalg",
                url: "https://www.kosttilskudsvalg.dk",
              },
            }),
          }}
        />
      ))}
    </div>
  )
}

function AuthorProfile({ a }: { a: typeof AUTHORS[number] }) {
  return (
    <div
      id={a.slug}
      className="scroll-mt-28 flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-5 sm:flex-row sm:items-start"
    >
      <img
        src={a.avatar || "/authors/placeholder.png"}
        alt={a.name}
        className="h-20 w-20 shrink-0 rounded-full object-cover ring-2 ring-slate-100"
        loading="lazy"
      />
      <div className="flex-1">
        <h3 className="text-base font-semibold text-slate-900">{a.name}</h3>
        <p className="text-sm font-medium text-green-700">{a.title}</p>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">{a.bio}</p>

        <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
          <div>
            <span className="text-xs font-medium uppercase tracking-wider text-slate-400">Uddannelse</span>
            <p className="text-sm text-slate-700">{a.education}</p>
          </div>
          <div>
            <span className="text-xs font-medium uppercase tracking-wider text-slate-400">Erfaring</span>
            <p className="text-sm text-slate-700">{a.experienceYears}+ år</p>
          </div>
        </div>

        {a.specialties.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {a.specialties.map(s => (
              <span key={s} className="inline-block rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">
                {s}
              </span>
            ))}
          </div>
        )}

        {a.email && (
          <p className="mt-2 text-xs text-slate-400">
            <a href={`mailto:${a.email}`} className="hover:text-slate-600">{a.email}</a>
          </p>
        )}
      </div>
    </div>
  )
}
