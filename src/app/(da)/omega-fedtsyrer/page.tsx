import Link from "next/link"
import Image from "next/image"
import { Breadcrumbs } from "@/components/breadcrumbs"
import { EditorialSignoff } from "@/components/editorial-signoff"
import { FAQ } from "@/components/faq"
import { getWinnerImages } from "@/lib/get-winner-images"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Omega & Fedtsyrer – Uafhængige tests og sammenligninger (2026)",
  description:
    "Find de bedste omega-3 og fedtsyretilskud med vores uafhængige tests. Vi sammenligner fiskeolie, krillolie, MCT-olie, vegansk omega-3 og 9 kategorier med fast metodik.",
  alternates: { canonical: "https://www.kosttilskudsvalg.dk/omega-fedtsyrer" },
  openGraph: {
    title: "Omega & Fedtsyrer – Uafhængige tests og sammenligninger (2026)",
    description: "Find de bedste omega-3 og fedtsyretilskud med vores uafhængige tests. Vi sammenligner fiskeolie, krillolie, MCT-olie, vegansk omega-3 og 9 kategorier med fast metodik.",
    url: "https://www.kosttilskudsvalg.dk/omega-fedtsyrer",
    type: "website",
    locale: "da_DK",
    siteName: "Kosttilskudsvalg",
  },
}

interface CatItem { label: string; href: string; slug: string; desc: string }
interface CatGroup { heading: string; intro: string; items: CatItem[] }

const GROUPS: CatGroup[] = [
  {
    heading: "Omega-3-tilskud",
    intro: "EPA og DHA fra fisk, krill og alger – de mest veldokumenterede fedtsyretilskud til hjerte, hjerne og inflammation.",
    items: [
      { label: "Omega-3", slug: "omega-3", href: "/omega-fedtsyrer/omega-3", desc: "Bredt overblik over omega-3-tilskud – EPA/DHA, form og pris." },
      { label: "Fiskeolie", slug: "fiskeolie", href: "/omega-fedtsyrer/fiskeolie", desc: "Klassisk kilde til EPA og DHA i kapsler og flydende form." },
      { label: "Krillolie", slug: "krillolie", href: "/omega-fedtsyrer/krillolie", desc: "Fosfolipid-bundet omega-3 med naturligt astaxanthin." },
      { label: "Vegansk Omega-3", slug: "vegansk-omega-3", href: "/omega-fedtsyrer/vegansk-omega-3", desc: "Algebaseret DHA og EPA – bæredygtigt og plantebaseret." },
    ],
  },
  {
    heading: "Andre fedtsyrer & olier",
    intro: "MCT-olie, CLA, kokosolie og andre funktionelle fedtsyrer til energi, vægtkontrol og generel sundhed.",
    items: [
      { label: "MCT-olie", slug: "mct-olie", href: "/omega-fedtsyrer/mct-olie", desc: "Medium-chain triglycerides fra kokos – hurtig energikilde." },
      { label: "Kæmpenatlysolie", slug: "kaempenatlysolie", href: "/omega-fedtsyrer/kaempenatlysolie", desc: "GLA-rig olie til hormoner, hud og inflammation." },
      { label: "CLA", slug: "cla", href: "/omega-fedtsyrer/cla", desc: "Konjugeret linolsyre – studeret for kropskomposition." },
      { label: "Lecithin", slug: "lecithin", href: "/omega-fedtsyrer/lecithin", desc: "Fosfatidylkolin fra soja eller solsikke til lever og hjerne." },
      { label: "Kokosolie", slug: "kokosolie", href: "/omega-fedtsyrer/kokosolie", desc: "Virgin og raffineret kokosolie sammenlignet på kvalitet." },
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

export default function OmegaFedtsyrerHubPage() {
  const totalCategories = GROUPS.reduce((sum, g) => sum + g.items.length, 0)
  const winners = getWinnerImages()

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      <Breadcrumbs items={[{ name: "Omega & Fedtsyrer", href: "/omega-fedtsyrer" }]} />

      {/* ── HERO BANNER ── */}
      <section className="relative mb-10 overflow-hidden rounded-2xl bg-gradient-to-br from-blue-700 via-blue-600 to-sky-500 px-6 py-10 sm:px-10 sm:py-14">
        <div className="absolute inset-0 opacity-[0.07]" style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")" }} />
        <div className="relative flex flex-col sm:flex-row sm:items-center sm:gap-8">
          <div className="flex-1">
            <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl lg:text-5xl">Omega &amp; Fedtsyrer</h1>
            <p className="mt-3 max-w-xl text-base leading-relaxed text-blue-100/90">
              Uafhængige tests og sammenligninger af {totalCategories} kategorier inden for omega-3, fiskeolie, krillolie, MCT-olie og andre fedtsyrer. Vi analyserer EPA/DHA-koncentration, TOTOX-renhed og pris.
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
            {["omega-3", "fiskeolie", "krillolie", "mct-olie"].map((slug) =>
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
        <p>Omega-3-fedtsyrer er blandt de mest veldokumenterede kosttilskud overhovedet. EPA og DHA bidrager til normal hjerte- og hjernefunktion, mens mange danskere ikke får tilstrækkeligt gennem kosten alene. Kvaliteten varierer markant – fra oxideret billig fiskeolie til premium krillolie.</p>
        <p>På Kosttilskudsvalg tester vi fedtsyretilskud ud fra en{" "}<Link href="/metodik" className="font-medium text-green-700 underline underline-offset-2 hover:text-green-800">fast metodik</Link>: vi analyserer EPA/DHA-koncentration, oxidationsværdier (TOTOX), tungmetalrenhed, form og pris pr. dagsdosis. Alle tests skrives af ernæringsrådgivere og{" "}<Link href="/redaktion" className="font-medium text-green-700 underline underline-offset-2 hover:text-green-800">faktatjekkes af en klinisk diætist</Link>.</p>
      </div>

      {/* ── Sådan vælger du ── */}
      <section className="mb-10 rounded-xl border border-green-200 bg-green-50/40 p-6">
        <h2 className="text-lg font-bold text-slate-900">Sådan vælger du det rigtige omega-3-tilskud</h2>
        <ol className="mt-4 space-y-2.5 text-sm text-slate-700">
          {[
            { n: "1", title: "Tjek EPA/DHA-indholdet:", body: "Kig på mængden af EPA og DHA pr. kapsel – ikke den totale mængde fiskeolie. Sigt efter mindst 500 mg EPA+DHA dagligt." },
            { n: "2", title: "Vælg triglyceridform:", body: "Omega-3 i triglyceridform (rTG) optages bedre end ethylester (EE)." },
            { n: "3", title: "Tjek renhed og friskhed:", body: "Lave TOTOX-værdier (under 10) indikerer frisk olie. Rancid fiskeolie giver ubehag og reduceret effekt." },
            { n: "4", title: "Overvej din kilde:", body: "Fiskeolie er billigst, krillolie har unikke fosfolipider, algeolie er vegansk." },
            { n: "5", title: "Sammenlign pris pr. 1.000 mg EPA+DHA", body: "– ikke pris pr. kapsel, da koncentrationen varierer enormt." },
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
          {[{ label: "Protein & Træning", href: "/protein-traening" }, { label: "Vitaminer", href: "/vitaminer" }, { label: "Mineraler", href: "/mineraler" }, { label: "Sundhed & Velvære", href: "/sundhed-velvaere" }].map((s) => (
            <Link key={s.href} href={s.href} className="rounded-full border border-slate-200 bg-white px-4 py-1.5 text-sm font-medium text-slate-700 transition hover:border-green-300 hover:text-green-700">{s.label}</Link>
          ))}
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="mt-10">
        <h2 className="mb-4 text-xl font-bold text-slate-900">Ofte stillede spørgsmål</h2>
        <FAQ items={[
          { question: "Hvad er forskellen på EPA og DHA?", answer: "EPA er primært forbundet med antiinflammatoriske egenskaber og hjertesundhed. DHA er vigtig for hjernefunktion, syn og nervesystemet. Gravide og ammende bør prioritere DHA." },
          { question: "Er fiskeolie eller krillolie bedst?", answer: "Fiskeolie er billigere og indeholder typisk højere EPA/DHA-doser. Krillolie har fosfolipid-bundet omega-3 og naturligt astaxanthin. Begge er effektive." },
          { question: "Kan veganer få omega-3 uden fiskeolie?", answer: "Ja. Algeolie er en plantebaseret kilde til EPA og DHA fra mikroalger – samme kilde som fiskene selv." },
          { question: "Hvor meget omega-3 har jeg brug for?", answer: "EFSA anbefaler mindst 250 mg EPA+DHA dagligt for voksne. For hjertesundhed bruger studier ofte 1–3 g dagligt." },
          { question: "Hvad er TOTOX-værdien?", answer: "TOTOX måler friskhed af fiskeolie. Under 10 er godt. Oxideret fiskeolie kan give dårlig smag og reduceret effekt." },
        ]} />
      </section>

      <EditorialSignoff author="line-kragelund" lastUpdated="Februar 2026" />

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
        "@context": "https://schema.org", "@type": "FAQPage",
        mainEntity: [
          { "@type": "Question", name: "Hvad er forskellen på EPA og DHA?", acceptedAnswer: { "@type": "Answer", text: "EPA er antiinflammatorisk, DHA er vigtig for hjerne og syn." } },
          { "@type": "Question", name: "Er fiskeolie eller krillolie bedst?", acceptedAnswer: { "@type": "Answer", text: "Fiskeolie er billigere, krillolie har fosfolipid-bundet omega-3." } },
          { "@type": "Question", name: "Kan veganer få omega-3?", acceptedAnswer: { "@type": "Answer", text: "Ja, via algeolie fra mikroalger." } },
        ],
      }) }} />
    </div>
  )
}
