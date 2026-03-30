import Link from "next/link"
import Image from "next/image"
import { Breadcrumbs } from "@/components/breadcrumbs"
import { EditorialSignoff } from "@/components/editorial-signoff"
import { FAQ } from "@/components/faq"
import { getWinnerImages } from "@/lib/get-winner-images"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Vitaminer – Uafhængige tests og sammenligninger (2026)",
  description:
    "Find de bedste vitamintilskud med vores uafhængige tests. Vi sammenligner D-vitamin, C-vitamin, B-vitaminer, multivitaminer og 25 kategorier med fast metodik.",
  alternates: { canonical: "https://www.kosttilskudsvalg.dk/vitaminer" },
}

interface CatItem { label: string; href: string; slug: string; desc: string }
interface CatGroup { heading: string; intro: string; items: CatItem[] }

const GROUPS: CatGroup[] = [
  {
    heading: "Klassiske vitaminer",
    intro: "De mest efterspurgte vitamintilskud – fra D-vitamin om vinteren til C-vitamin for immunforsvaret.",
    items: [
      { label: "D-vitamin", slug: "d-vitamin", href: "/vitaminer/d-vitamin", desc: "D3 og D2 i kapsler, dråber og tabletter sammenlignet." },
      { label: "C-vitamin", slug: "c-vitamin", href: "/vitaminer/c-vitamin", desc: "Ascorbinsyre, Ester-C og liposomal form testet." },
      { label: "E-vitamin", slug: "e-vitamin", href: "/vitaminer/e-vitamin", desc: "Naturlig vs. syntetisk E-vitamin analyseret." },
      { label: "Multivitamin", slug: "multivitamin", href: "/vitaminer/multivitamin", desc: "Brede multivitaminer for daglig brug sammenlignet." },
      { label: "Vitamin D3 + K2", slug: "vitamin-d3-k2", href: "/vitaminer/vitamin-d3-k2", desc: "Kombiprodukter med D3 og K2 (MK-7) til knogler." },
      { label: "Vitamin K2", slug: "vitamin-k2", href: "/vitaminer/vitamin-k2", desc: "MK-7 og MK-4 til calcium-dirigering og knoglesundhed." },
      { label: "Betacaroten", slug: "betacaroten", href: "/vitaminer/betacaroten", desc: "Provitamin A fra naturlige kilder analyseret." },
      { label: "Lutein", slug: "lutein", href: "/vitaminer/lutein", desc: "Carotenoid til øjensundhed og makulabeskyttelse." },
      { label: "Lycopen", slug: "lycopen", href: "/vitaminer/lycopen", desc: "Antioxidant fra tomat – hjertesundhed og cellebeskyttelse." },
    ],
  },
  {
    heading: "B-vitaminer",
    intro: "B-vitaminkompleks og individuelle B-vitaminer – essentielle for energistofskifte, nervesystem og celledeling.",
    items: [
      { label: "B-vitamin (kompleks)", slug: "b-vitamin", href: "/vitaminer/b-vitamin", desc: "Alle 8 B-vitaminer i ét produkt sammenlignet." },
      { label: "Vitamin B1 (Thiamin)", slug: "vitamin-b1", href: "/vitaminer/vitamin-b1", desc: "Vigtig for kulhydratstofskiftet og nervefunktion." },
      { label: "Vitamin B2 (Riboflavin)", slug: "vitamin-b2-riboflavin", href: "/vitaminer/vitamin-b2-riboflavin", desc: "Støtter energiproduktion og cellevækst." },
      { label: "Vitamin B6", slug: "vitamin-b6", href: "/vitaminer/vitamin-b6", desc: "Nøglerolle i aminosyre- og neurotransmitterstofskiftet." },
      { label: "Vitamin B12", slug: "vitamin-b12", href: "/vitaminer/vitamin-b12", desc: "Methylcobalamin vs. cyanocobalamin testet." },
      { label: "Folinsyre", slug: "folinsyre", href: "/vitaminer/folinsyre", desc: "Folat og methylfolat – vigtig for gravide og celledeling." },
      { label: "Niacin (B3)", slug: "niacin", href: "/vitaminer/niacin", desc: "Nikotinamid og nikotinsyre sammenlignet." },
      { label: "Pantotensyre (B5)", slug: "pantotensyre", href: "/vitaminer/pantotensyre", desc: "Støtter energiproduktion og hormonbalance." },
      { label: "Biotin (B7)", slug: "biotin", href: "/vitaminer/biotin", desc: "Populært tilskud til hår, hud og negle." },
    ],
  },
  {
    heading: "Vitaminer til specifikke målgrupper",
    intro: "Multivitaminer og specialprodukter tilpasset kvinder, mænd, børn, gravide og andre målgrupper.",
    items: [
      { label: "Multivitamin kvinde", slug: "multivitamin-kvinde", href: "/vitaminer/multivitamin-kvinde", desc: "Tilpasset kvinders behov for jern, folat og D-vitamin." },
      { label: "Multivitamin mænd", slug: "multivitamin-til-maend", href: "/vitaminer/multivitamin-til-maend", desc: "Fokus på zink, selen og B-vitaminer til mænd." },
      { label: "Multivitamin børn", slug: "multivitamin-born", href: "/vitaminer/multivitamin-born", desc: "Børnevenlige former med tilpassede doser." },
      { label: "Multivitamin gravid / amning", slug: "multivitamin-gravid-amning", href: "/vitaminer/multivitamin-gravid-amning", desc: "Med folat, D-vitamin, jern og DHA til gravide." },
      { label: "Vegansk vitamin D", slug: "vegansk-vitamin-d", href: "/vitaminer/vegansk-vitamin-d", desc: "Plantebaseret D3 fra lav – uden lanolin." },
      { label: "Vitaminer til hår", slug: "vitaminer-til-har", href: "/vitaminer/vitaminer-til-har", desc: "Biotin, zink og selen til hårvækst og styrke." },
      { label: "Vitaminer til øjne", slug: "vitaminer-til-ojnene", href: "/vitaminer/vitaminer-til-ojnene", desc: "Lutein, zeaxanthin og A-vitamin til synet." },
    ],
  },
]

function CategoryCard({ item, winnerImg }: { item: CatItem; winnerImg?: string }) {
  return (
    <Link href={item.href} className="group flex items-center gap-3 rounded-lg border border-slate-100 bg-white px-4 py-3 transition-all hover:border-green-300 hover:shadow-sm">
      <div className="flex-1 min-w-0">
        <span className="text-sm font-semibold text-slate-800 group-hover:text-green-700">{item.label}</span>
        <span className="mt-0.5 block text-xs leading-snug text-slate-500">{item.desc}</span>
      </div>
      {winnerImg && (
        <div className="relative h-12 w-12 flex-shrink-0 rounded-md bg-slate-50 p-0.5">
          <Image src={winnerImg} alt={`Bedst i test – ${item.label}`} width={48} height={48} className="h-full w-full object-contain" loading="lazy" />
        </div>
      )}
    </Link>
  )
}

export default function VitaminerHubPage() {
  const totalCategories = GROUPS.reduce((sum, g) => sum + g.items.length, 0)
  const winners = getWinnerImages()

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      <Breadcrumbs items={[{ name: "Vitaminer", href: "/vitaminer" }]} />

      {/* ── HERO BANNER ── */}
      <section className="relative mb-10 overflow-hidden rounded-2xl bg-gradient-to-br from-amber-600 via-orange-500 to-yellow-500 px-6 py-10 sm:px-10 sm:py-14">
        <div className="absolute inset-0 opacity-[0.07]" style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")" }} />
        <div className="relative flex flex-col sm:flex-row sm:items-center sm:gap-8">
          <div className="flex-1">
            <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl lg:text-5xl">Vitaminer</h1>
            <p className="mt-3 max-w-xl text-base leading-relaxed text-amber-100/90">
              Uafhængige tests og sammenligninger af {totalCategories} kategorier inden for D-vitamin, C-vitamin, B-vitaminer, multivitaminer og mere. Vi analyserer aktive former, doser og pris pr. dagsdosis.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              {[`${totalCategories} kategorier testet`, "Opdateret februar 2026", "Faktatjekket af diætist"].map((t) => (
                <span key={t} className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-medium text-white backdrop-blur-sm">
                  <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                  {t}
                </span>
              ))}
            </div>
          </div>
          <div className="mt-6 flex items-center gap-2 sm:mt-0 sm:flex-col">
            {["d-vitamin", "c-vitamin", "multivitamin", "b-vitamin"].map((slug) =>
              winners[slug] ? (
                <div key={slug} className="h-16 w-16 rounded-xl bg-white/90 p-1.5 shadow-lg backdrop-blur-sm">
                  <Image src={winners[slug]} alt={slug} width={56} height={56} className="h-full w-full object-contain" />
                </div>
              ) : null
            )}
          </div>
        </div>
      </section>

      {/* ── Intro ── */}
      <div className="mb-8 max-w-3xl space-y-3 text-base leading-relaxed text-slate-600">
        <p>Vitaminer er essentielle mikronæringsstoffer, som kroppen har brug for i små mængder for at fungere optimalt. De fleste kan dækkes gennem en varieret kost, men visse grupper &ndash; f.eks. personer med begrænset soleksponering, gravide eller veganer &ndash; kan have behov for tilskud.</p>
        <p>På Kosttilskudsvalg analyserer vi vitamintilskud ud fra en{" "}<Link href="/metodik" className="font-medium text-green-700 underline underline-offset-2 hover:text-green-800">fast metodik</Link>: vi sammenligner aktive former, doser i forhold til nordiske anbefalinger (NNR), biotilgængelighed, renhed og pris pr. dagsdosis. Alle tests skrives af ernæringsrådgivere og{" "}<Link href="/redaktion" className="font-medium text-green-700 underline underline-offset-2 hover:text-green-800">faktatjekkes af en klinisk diætist</Link>.</p>
      </div>

      {/* ── Sådan vælger du ── */}
      <section className="mb-10 rounded-xl border border-green-200 bg-green-50/40 p-6">
        <h2 className="text-lg font-bold text-slate-900">Sådan vælger du det rigtige vitamintilskud</h2>
        <ol className="mt-4 space-y-2.5 text-sm text-slate-700">
          {[
            { n: "1", title: "Afdæk dit behov:", body: "Har du dokumenteret mangel via blodprøve? Sundhedsstyrelsen anbefaler D-vitamin til alle om vinteren – men andre vitaminer kræver individuel vurdering." },
            { n: "2", title: "Vælg den aktive form:", body: "Methylcobalamin vs. cyanocobalamin (B12), methylfolat vs. folinsyre – den aktive form optages ofte bedre." },
            { n: "3", title: "Tjek dosis:", body: "Sammenlign med de nordiske næringsstofanbefalinger (NNR) og undgå unødvendigt høje doser." },
            { n: "4", title: "Sammenlign pris pr. dagsdosis", body: "– ikke pakkeprisen. En billig multivitamin med underdoserede ingredienser giver dårlig værdi." },
            { n: "5", title: "Tal med din læge,", body: "hvis du tager medicin eller har kroniske sygdomme – visse vitaminer kan interagere med medicin." },
          ].map((s) => (
            <li key={s.n} className="flex items-start gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-green-600 text-xs font-bold text-white">{s.n}</span>
              <span><strong>{s.title}</strong> {s.body}</span>
            </li>
          ))}
        </ol>
      </section>

      {/* ── Grouped Categories ── */}
      <div className="space-y-10">
        {GROUPS.map((group) => (
          <section key={group.heading}>
            <div className="flex items-center gap-3 mb-1"><div className="h-7 w-1 rounded-full bg-green-600" /><h2 className="text-lg font-bold text-slate-900">{group.heading}</h2></div>
            <p className="mb-4 pl-[19px] text-sm text-slate-500">{group.intro}</p>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {group.items.map((item) => (<CategoryCard key={item.href} item={item} winnerImg={winners[item.slug]} />))}
            </div>
          </section>
        ))}
      </div>

      {/* ── Cross-silo ── */}
      <section className="mt-12 rounded-xl border border-slate-200 bg-slate-50/50 p-6">
        <h2 className="text-base font-bold text-slate-900 mb-3">Udforsk flere kategorier</h2>
        <div className="flex flex-wrap gap-2">
          {[{ label: "Protein & Træning", href: "/protein-traening" }, { label: "Mineraler", href: "/mineraler" }, { label: "Omega & Fedtsyrer", href: "/omega-fedtsyrer" }, { label: "Sundhed & Velvære", href: "/sundhed-velvaere" }].map((s) => (
            <Link key={s.href} href={s.href} className="rounded-full border border-slate-200 bg-white px-4 py-1.5 text-sm font-medium text-slate-700 transition hover:border-green-300 hover:text-green-700">{s.label}</Link>
          ))}
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="mt-10">
        <h2 className="mb-4 text-xl font-bold text-slate-900">Ofte stillede spørgsmål</h2>
        <FAQ items={[
          { question: "Hvor meget D-vitamin har jeg brug for?", answer: "Sundhedsstyrelsen anbefaler 10 µg (400 IE) dagligt for voksne, og 20 µg (800 IE) for personer over 70, gravide og ammende. Om vinteren (oktober–april) anbefales tilskud til alle i Danmark." },
          { question: "Er multivitaminer nødvendige?", answer: "For de fleste raske voksne med en varieret kost er multivitaminer ikke nødvendige. De kan dog være relevante for gravide, ældre, veganer eller personer med restriktive diæter." },
          { question: "Kan veganer få nok B12 uden tilskud?", answer: "B12 findes næsten udelukkende i animalske fødevarer. Veganer bør tage et B12-tilskud (cyanocobalamin eller methylcobalamin) dagligt. Mangel kan have alvorlige neurologiske konsekvenser." },
          { question: "Kan man overdosere vitaminer?", answer: "Ja, især de fedtopløselige vitaminer (A, D, E og K), som ophobes i kroppen. Hold dig til anbefalede doser." },
          { question: "Hvad er forskellen på folinsyre og methylfolat?", answer: "Folinsyre er den syntetiske form, som kroppen skal omdanne. Methylfolat (5-MTHF) er den biologisk aktive form. Ca. 10–15 % af befolkningen har en genmutation (MTHFR), der hæmmer omdannelsen." },
        ]} />
      </section>

      <EditorialSignoff author="line-kragelund" lastUpdated="Februar 2026" />

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
        "@context": "https://schema.org", "@type": "FAQPage",
        mainEntity: [
          { "@type": "Question", name: "Hvor meget D-vitamin har jeg brug for?", acceptedAnswer: { "@type": "Answer", text: "Sundhedsstyrelsen anbefaler 10 µg dagligt for voksne og 20 µg for ældre, gravide og ammende." } },
          { "@type": "Question", name: "Er multivitaminer nødvendige?", acceptedAnswer: { "@type": "Answer", text: "Ikke for de fleste raske voksne med varieret kost." } },
          { "@type": "Question", name: "Kan veganer få nok B12?", acceptedAnswer: { "@type": "Answer", text: "Veganer bør tage B12-tilskud dagligt." } },
          { "@type": "Question", name: "Kan man overdosere vitaminer?", acceptedAnswer: { "@type": "Answer", text: "Ja, især fedtopløselige vitaminer (A, D, E, K)." } },
          { "@type": "Question", name: "Hvad er forskellen på folinsyre og methylfolat?", acceptedAnswer: { "@type": "Answer", text: "Methylfolat er den biologisk aktive form der kan bruges direkte." } },
        ],
      }) }} />
    </div>
  )
}
