import Link from "next/link"
import Image from "next/image"
import { Breadcrumbs } from "@/components/breadcrumbs"
import { EditorialSignoff } from "@/components/editorial-signoff"
import { FAQ } from "@/components/faq"
import { getWinnerImages } from "@/lib/get-winner-images"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Mineraler – Uafhængige tests og sammenligninger (2026)",
  description:
    "Find de bedste mineraltilskud med vores uafhængige tests. Vi sammenligner magnesium, zink, jern, calcium, selen og 13 kategorier med fast metodik.",
  alternates: { canonical: "https://www.kosttilskudsvalg.dk/mineraler" },
}

interface CatItem { label: string; href: string; slug: string; desc: string }
interface CatGroup { heading: string; intro: string; items: CatItem[] }

const GROUPS: CatGroup[] = [
  {
    heading: "Basale mineraler",
    intro: "De mest udbredte mineraltilskud – essentielle for muskler, knogler, immunforsvar og energistofskifte.",
    items: [
      { label: "Magnesium", slug: "magnesium", href: "/mineraler/magnesium", desc: "Citrat, bisglycinat og oxid sammenlignet på absorption og pris." },
      { label: "Zink", slug: "zink", href: "/mineraler/zink", desc: "Picolinat, bisglycinat og gluconat testet på optagelighed." },
      { label: "Jern", slug: "jern-tabletter", href: "/mineraler/jern-tabletter", desc: "Bisglycinat og ferroglycinsulfat – absorption og bivirkninger." },
      { label: "Calcium", slug: "calcium", href: "/mineraler/calcium", desc: "Calciumtilskud og kalktabletter sammenlignet på dosering, form og pris." },
      { label: "Kalium", slug: "kalium", href: "/mineraler/kalium", desc: "Citrat og chlorid – dosering, sikkerhed og pris." },
      { label: "Kalktabletter", slug: "kalktabletter", href: "/mineraler/kalktabletter", desc: "Calciumcarbonat og -citrat til daglig brug testet." },
    ],
  },
  {
    heading: "Sporstoffer",
    intro: "Mineraler kroppen kun behøver i mikrodoser – men som spiller en afgørende rolle i stofskifte, immunforsvar og hormonbalance.",
    items: [
      { label: "Selen", slug: "selen", href: "/mineraler/selen", desc: "Selenomethionin og natriumselenit sammenlignet." },
      { label: "Krom", slug: "krom", href: "/mineraler/krom", desc: "Picolinat til blodsukkerstøtte – evidens og dosering." },
      { label: "Kobber", slug: "kobber-tabletter", href: "/mineraler/kobber-tabletter", desc: "Form, dosering og interaktion med zink analyseret." },
      { label: "Mangan", slug: "mangan", href: "/mineraler/mangan", desc: "Sporstof til knogler, bindevæv og antioxidantforsvar." },
      { label: "Jod", slug: "jod-tabletter", href: "/mineraler/jod-tabletter", desc: "Kaliumjodid til skjoldbruskkirtel – dosering og behov." },
    ],
  },
  {
    heading: "Kombinationer & specialmineraler",
    intro: "Sammensat mineraltilskud og specialmineraler til led, hud og bindevæv.",
    items: [
      { label: "Silica", slug: "silica", href: "/mineraler/silica", desc: "Kisel til hår, hud, negle og bindevæv." },
      { label: "MSM", slug: "msm", href: "/mineraler/msm", desc: "Organisk svovl til led, hud og inflammation." },
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

export default function MineralerHubPage() {
  const totalCategories = GROUPS.reduce((sum, g) => sum + g.items.length, 0)
  const winners = getWinnerImages()

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      <Breadcrumbs items={[{ name: "Mineraler", href: "/mineraler" }]} />

      {/* ── HERO BANNER ── */}
      <section className="relative mb-10 overflow-hidden rounded-2xl bg-gradient-to-br from-teal-700 via-teal-600 to-cyan-500 px-6 py-10 sm:px-10 sm:py-14">
        <div className="absolute inset-0 opacity-[0.07]" style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")" }} />
        <div className="relative flex flex-col sm:flex-row sm:items-center sm:gap-8">
          <div className="flex-1">
            <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl lg:text-5xl">Mineraler</h1>
            <p className="mt-3 max-w-xl text-base leading-relaxed text-teal-100/90">
              Uafhængige tests og sammenligninger af {totalCategories} kategorier inden for magnesium, zink, jern, calcium og andre mineraler. Vi analyserer form, biotilgængelighed og pris pr. dagsdosis.
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
            {["magnesium", "zink", "jern-tabletter", "selen"].map((slug) =>
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
        <p>Mineraler er uorganiske næringsstoffer, som kroppen ikke selv kan producere. De spiller en afgørende rolle i alt fra knogle- og muskelfunktion til immunforsvar og energistofskifte. Mangel på mineraler som jern, magnesium eller zink er blandt de mest udbredte næringsstofmangler globalt.</p>
        <p>På Kosttilskudsvalg tester vi mineraltilskud ud fra en{" "}<Link href="/metodik" className="font-medium text-green-700 underline underline-offset-2 hover:text-green-800">fast metodik</Link>: vi analyserer mineralform, biotilgængelighed, dosering og pris pr. dagsdosis. Alt indhold skrives af ernæringsrådgivere og{" "}<Link href="/redaktion" className="font-medium text-green-700 underline underline-offset-2 hover:text-green-800">faktatjekkes af en klinisk diætist</Link>.</p>
      </div>

      {/* ── Sådan vælger du ── */}
      <section className="mb-10 rounded-xl border border-green-200 bg-green-50/40 p-6">
        <h2 className="text-lg font-bold text-slate-900">Sådan vælger du det rigtige mineraltilskud</h2>
        <ol className="mt-4 space-y-2.5 text-sm text-slate-700">
          {[
            { n: "1", title: "Få dokumenteret din mangel:", body: "Start med en blodprøve hos din læge. Mineraler i for høje doser kan være skadelige." },
            { n: "2", title: "Vælg den rigtige form:", body: "Bisglycinat og citrat optages typisk bedre end oxid og carbonat." },
            { n: "3", title: "Tjek dosis pr. portion:", body: "Sammenlign det elementære mineralindhold med anbefalede daglige indtag." },
            { n: "4", title: "Vær opmærksom på interaktioner:", body: "Zink og kobber konkurrerer om absorption, jern hæmmer zinkoptagelsen." },
            { n: "5", title: "Sammenlign pris pr. dagsdosis", body: "for at finde det bedste produkt – ikke pakkeprisen." },
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
          {[{ label: "Protein & Træning", href: "/protein-traening" }, { label: "Vitaminer", href: "/vitaminer" }, { label: "Omega & Fedtsyrer", href: "/omega-fedtsyrer" }, { label: "Sundhed & Velvære", href: "/sundhed-velvaere" }].map((s) => (
            <Link key={s.href} href={s.href} className="rounded-full border border-slate-200 bg-white px-4 py-1.5 text-sm font-medium text-slate-700 transition hover:border-green-300 hover:text-green-700">{s.label}</Link>
          ))}
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="mt-10">
        <h2 className="mb-4 text-xl font-bold text-slate-900">Ofte stillede spørgsmål</h2>
        <FAQ items={[
          { question: "Hvilken form for magnesium er bedst?", answer: "Det afhænger af dit behov. Bisglycinat er skånsom for maven, citrat optages godt, oxid har lav absorption men høj elementær dosis. Threonat studeres for kognitiv funktion." },
          { question: "Hvordan forbedrer jeg jernabsorptionen?", answer: "Tag jerntilskud sammen med C-vitamin. Undgå at tage jern samtidig med calcium, kaffe eller te. Jernbisglycinat optages bedre og giver færre bivirkninger." },
          { question: "Kan man tage for meget zink?", answer: "Ja. Over 40 mg dagligt langvarigt kan føre til kobbermangel og svækket immunforsvar. Anbefalet dagligt indtag er 7–11 mg for voksne." },
          { question: "Skal jeg tage calcium som tilskud?", answer: "De fleste kan dække behovet via kosten. Tilskud anbefales primært ved dokumenteret lavt indtag. Kombiner altid med D-vitamin for optimal optagelse." },
          { question: "Hvad er elementært mineralindhold?", answer: "Elementært indhold angiver den rene mængde mineral (f.eks. 200 mg magnesium), mens forbindelsesvægten er den totale vægt. Sammenlign altid det elementære indhold." },
        ]} />
      </section>

      <EditorialSignoff author="line-kragelund" lastUpdated="Februar 2026" />

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
        "@context": "https://schema.org", "@type": "FAQPage",
        mainEntity: [
          { "@type": "Question", name: "Hvilken form for magnesium er bedst?", acceptedAnswer: { "@type": "Answer", text: "Bisglycinat er skånsom for maven, citrat optages godt, oxid har lav absorption." } },
          { "@type": "Question", name: "Hvordan forbedrer jeg jernabsorptionen?", acceptedAnswer: { "@type": "Answer", text: "Tag jern med C-vitamin og undgå calcium, kaffe eller te samtidig." } },
          { "@type": "Question", name: "Kan man tage for meget zink?", acceptedAnswer: { "@type": "Answer", text: "Over 40 mg dagligt langvarigt kan føre til kobbermangel." } },
        ],
      }) }} />
    </div>
  )
}
