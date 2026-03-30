import Link from "next/link"
import { Breadcrumbs } from "@/components/breadcrumbs"
import { EditorialSignoff } from "@/components/editorial-signoff"
import { FAQ } from "@/components/faq"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Kosttilskud – Uafhængige analyser og sammenligninger (2026)",
  description: "Find det rigtige kosttilskud med vores uafhængige analyser. Vi sammenligner protein, vitaminer, mineraler, superfoods og sundhedstilskud med fast metodik.",
  alternates: { canonical: "https://www.kosttilskudsvalg.dk/kosttilskud" },
}

const CATEGORIES = [
  {
    slug: "proteinpulver",
    title: "Proteinpulver",
    description: "Whey, kasein, vegansk og æggeprotein analyseret og sammenlignet ud fra aminosyreprofil, pris pr. portion og renhed.",
    icon: "💪",
    articleCount: "10+ produkter",
  },
  {
    slug: "d-vitamin",
    title: "D-vitamin",
    description: "D-vitamin, D3+K2 og vegansk D-vitamin sammenlignet på dosering, form og biotilgængelighed.",
    icon: "☀️",
    articleCount: "8+ produkter",
  },
  {
    slug: "kreatin",
    title: "Kreatin",
    description: "Kreatin monohydrat og andre former analyseret ud fra dokumentation, dosering og pris pr. dagsdosis.",
    icon: "⚡",
    articleCount: "6+ produkter",
  },
  {
    slug: "omega-3",
    title: "Omega-3 & fiskeolie",
    description: "Fiskeolie, krillolie og vegansk omega-3 sammenlignet på EPA/DHA-indhold, renhed og pris.",
    icon: "🐟",
    articleCount: "10+ produkter",
  },
  {
    slug: "magnesium",
    title: "Magnesium",
    description: "Magnesiumcitrat, -bisglycinat og andre former sammenlignet på biotilgængelighed, dosering og pris.",
    icon: "🌿",
    articleCount: "8+ produkter",
  },
  {
    slug: "probiotika",
    title: "Probiotika",
    description: "Mælkesyrebakterier og probiotika sammenlignet på stammer, CFU, dokumentation og pris pr. dagsdosis.",
    icon: "❤️",
    articleCount: "8+ produkter",
  },
  {
    slug: "kollagenpulver",
    title: "Kollagenpulver",
    description: "Type I, II og III kollagen sammenlignet på kilde, dosis, C-vitamin-tilsætning og pris.",
    icon: "✨",
    articleCount: "6+ produkter",
  },
  {
    slug: "multivitamin",
    title: "Multivitamin",
    description: "Multivitaminer til kvinder, mænd, børn og gravide sammenlignet på indhold, dosering og pris.",
    icon: "💊",
    articleCount: "12+ produkter",
  },
  {
    slug: "pre-workout",
    title: "Pre-workout",
    description: "Pre-workout med og uden koffein, med kreatin og andre formler analyseret på aktive doser og dokumentation.",
    icon: "🏋️",
    articleCount: "8+ produkter",
  },
]

export default function KosttilskudHubPage() {
  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      <Breadcrumbs items={[{ name: "Kosttilskud", href: "/kosttilskud" }]} />

      {/* Block A: Intro (150–250 ord) */}
      <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
        Kosttilskud: uafhængige analyser og sammenligninger
      </h1>

      <div className="mt-4 max-w-2xl space-y-3 text-base leading-relaxed text-slate-600">
        <p>
          Kosttilskud kan være en nyttig tilføjelse til en balanceret kost &ndash; men markedet er
          fyldt med produkter, hvor markedsføringen lover mere, end evidensen understøtter.
        </p>
        <p>
          På Kosttilskudsvalg analyserer vi kosttilskud ud fra en{" "}
          <Link href="/metodik" className="text-green-700 underline hover:text-green-800">
            fast metodik
          </Link>
          : vi sammenligner aktive ingredienser, doser, pris pr. dagsdosis, dokumentation og
          renhed. Alt indhold skrives af ernæringsrådgivere og{" "}
          <Link href="/redaktion" className="text-green-700 underline hover:text-green-800">
            faktatjekkes af en klinisk diætist
          </Link>.
        </p>
        <p>
          Vælg en kategori herunder for at finde det rigtige tilskud &ndash; eller start med en
          af vores{" "}
          <Link href="/guider" className="text-green-700 underline hover:text-green-800">
            dybdegående guider
          </Link>{" "}
          for at forstå, hvad der virker, og hvad der ikke gør.
        </p>
      </div>

      {/* Block B: Sådan vælger du (køpguide) */}
      <section className="mt-8 rounded-xl border border-green-200 bg-green-50/50 p-6">
        <h2 className="text-lg font-semibold text-slate-900">Sådan vælger du det rigtige kosttilskud</h2>
        <ol className="mt-3 space-y-2 text-sm text-slate-700">
          <li className="flex items-start gap-2">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-green-200 text-xs font-bold text-green-800">1</span>
            <span><strong>Identificér dit behov:</strong> Mangler du specifikke næringsstoffer? Har du fået råd fra din læge?</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-green-200 text-xs font-bold text-green-800">2</span>
            <span><strong>Tjek evidens:</strong> Er der dokumentation for effekt ved den pågældende dosis? (<Link href="/kilder-og-faktacheck" className="text-green-700 underline">Vores kildepolitik</Link>)</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-green-200 text-xs font-bold text-green-800">3</span>
            <span><strong>Sammenlign pris pr. dagsdosis</strong>, ikke pakkeprisen. Et billigt produkt med lav dosis kan være dyrere pr. effektiv portion.</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-green-200 text-xs font-bold text-green-800">4</span>
            <span><strong>Tjek tilsætningsstoffer:</strong> Unødvendige fyldstoffer, sødemidler og allergener kan variere meget mellem mærker.</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-green-200 text-xs font-bold text-green-800">5</span>
            <span><strong>Kig efter tredjepartstest</strong> (Informed Sport, NSF, GMP) som et ekstra kvalitetstjek.</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-green-200 text-xs font-bold text-green-800">6</span>
            <span><strong>Tal med din læge</strong>, hvis du tager medicin, er gravid eller har kroniske sygdomme.</span>
          </li>
        </ol>
      </section>

      {/* Block C: Kategorier (grid) */}
      <section className="mt-10">
        <h2 className="mb-4 text-xl font-semibold text-slate-900">Kategorier</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {CATEGORIES.map((cat) => (
            <Link
              key={cat.slug}
              href={`/kosttilskud/${cat.slug}`}
              className="group rounded-xl border border-slate-200 bg-white p-5 transition hover:border-green-300 hover:shadow-sm"
            >
              <div className="flex items-start justify-between">
                <span className="text-2xl">{cat.icon}</span>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-500">{cat.articleCount}</span>
              </div>
              <h3 className="mt-3 text-base font-semibold text-slate-900 group-hover:text-green-700">
                {cat.title}
              </h3>
              <p className="mt-1 text-sm leading-relaxed text-slate-600">{cat.description}</p>
            </Link>
          ))}
        </div>
      </section>

      {/* Block D: FAQ */}
      <section className="mt-10">
        <h2 className="mb-4 text-xl font-semibold text-slate-900">Ofte stillede spørgsmål</h2>
        <FAQ items={[
          { question: "Er kosttilskud nødvendige?", answer: "For de fleste raske voksne med en varieret kost er kosttilskud ikke nødvendige. Der kan dog være specifikke behov (f.eks. D-vitamin om vinteren, jern ved dokumenteret mangel), hvor et supplement kan være relevant. Tal altid med din læge." },
          { question: "Hvordan scorer I produkter?", answer: "Vi bruger en fast scoringsmodel (0–5) med vægtede kriterier: ingredienser, dosering, dokumentation, pris pr. dagsdosis og renhed. Læs vores fulde metodik." },
          { question: "Tjener I penge på links?", answer: "Ja, vi finansieres primært via affiliatelinks. Men vurderingerne fastlægges inden links tilføjes, og ingen producent kan betale for en bedre score. Læs vores affiliatepolitik." },
          { question: "Kan kosttilskud erstatte medicin?", answer: "Nej. Kosttilskud er ikke erstatning for medicin eller medicinsk rådgivning. Tal altid med din læge, inden du ændrer din behandling." },
          { question: "Hvor ofte opdaterer I priserne?", answer: "Vi gennemgår priser kvartalsvis og opdaterer produktlister, når nye væsentlige produkter lanceres. Alle ændringer dokumenteres i opdateringsloggen på den enkelte side." },
        ]} />
      </section>

      {/* Block E: Redaktionel signoff */}
      <EditorialSignoff
        author="line-kragelund"
        lastUpdated="Februar 2026"
      />

      {/* FAQPage Schema */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: [
              { "@type": "Question", name: "Er kosttilskud nødvendige?", acceptedAnswer: { "@type": "Answer", text: "For de fleste raske voksne med en varieret kost er kosttilskud ikke nødvendige." } },
              { "@type": "Question", name: "Hvordan scorer I produkter?", acceptedAnswer: { "@type": "Answer", text: "Vi bruger en fast scoringsmodel (0–5) med vægtede kriterier." } },
              { "@type": "Question", name: "Kan kosttilskud erstatte medicin?", acceptedAnswer: { "@type": "Answer", text: "Nej. Kosttilskud er ikke erstatning for medicin eller medicinsk rådgivning." } },
            ],
          }),
        }}
      />
    </div>
  )
}
