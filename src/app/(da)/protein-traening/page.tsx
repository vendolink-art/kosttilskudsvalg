import Link from "next/link"
import Image from "next/image"
import { Breadcrumbs } from "@/components/breadcrumbs"
import { EditorialSignoff } from "@/components/editorial-signoff"
import { FAQ } from "@/components/faq"
import { getWinnerImages } from "@/lib/get-winner-images"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Protein & Træning – Uafhængige tests og sammenligninger (2026)",
  description:
    "Find det bedste proteinpulver, kreatin, pre-workout og BCAA. Vi sammenligner 40+ kategorier af træningstilskud med fast metodik – aminosyreprofil, dosering og pris pr. portion.",
  alternates: { canonical: "https://www.kosttilskudsvalg.dk/protein-traening" },
  openGraph: {
    title: "Protein & Træning – Uafhængige tests og sammenligninger (2026)",
    description: "Find det bedste proteinpulver, kreatin, pre-workout og BCAA. Vi sammenligner 40+ kategorier af træningstilskud med fast metodik.",
    url: "https://www.kosttilskudsvalg.dk/protein-traening",
    type: "website",
    locale: "da_DK",
    siteName: "Kosttilskudsvalg",
  },
}

/* ------------------------------------------------------------------ */
/*  Category groups – mirrors nav.ts silo structure exactly           */
/* ------------------------------------------------------------------ */

interface CatItem {
  label: string
  href: string
  slug: string
  desc: string
}

interface CatGroup {
  heading: string
  intro: string
  items: CatItem[]
}

const GROUPS: CatGroup[] = [
  {
    heading: "Proteintilskud",
    intro: "Proteinpulver og proteinbarer til muskelopbygning, restitution og dagligt proteinindtag – sammenlignet på aminosyreprofil, smag og pris.",
    items: [
      { label: "Proteinpulver", slug: "proteinpulver", href: "/protein-traening/proteinpulver", desc: "Whey, kasein og blandingsprodukter testet og rangeret." },
      { label: "Vegansk proteinpulver", slug: "vegansk-proteinpulver", href: "/protein-traening/vegansk-proteinpulver", desc: "Plantebaseret protein fra ært, ris og hamp." },
      { label: "Kasein", slug: "kasein", href: "/protein-traening/kasein", desc: "Langsomt optageligt protein – ideel til natten." },
      { label: "Weight Gainer", slug: "weight-gainer", href: "/protein-traening/weight-gainer", desc: "Kalorietætte pulvere til vægtøgning og bulk." },
      { label: "Proteinbarer", slug: "proteinbarer", href: "/protein-traening/proteinbarer", desc: "Barer med højt proteinindhold som snack." },
      { label: "Veganske proteinbarer", slug: "veganske-proteinbarer", href: "/protein-traening/veganske-proteinbarer", desc: "Plantebaserede barer uden mælkeprotein." },
      { label: "Proteinbar lavt sukker", slug: "proteinbar-med-lavt-sukkerindhold", href: "/protein-traening/proteinbar-med-lavt-sukkerindhold", desc: "Barer med under 2 g sukker pr. stk." },
      { label: "Laktosefri protein", slug: "laktosefrit-proteinpulver", href: "/protein-traening/laktosefrit-proteinpulver", desc: "Proteinpulver uden laktose for følsomme maver." },
      { label: "Hamp-protein", slug: "hamp-protein", href: "/protein-traening/hamp-protein", desc: "Protein fra hampfrø med omega-3 og fibre." },
      { label: "Risprotein", slug: "risprotein", href: "/protein-traening/risprotein", desc: "Hypoallergenisk protein fra brune ris." },
      { label: "Sojaprotein", slug: "sojaprotein", href: "/protein-traening/sojaprotein", desc: "Komplet planteprotein med alle aminosyrer." },
      { label: "Æggeprotein", slug: "aggeprotein", href: "/protein-traening/aggeprotein", desc: "Æggehvideprotein – middelhurtigt og potent." },
      { label: "Ærteprotein", slug: "arteprotein", href: "/protein-traening/arteprotein", desc: "Populært vegansk valg med høj leucin." },
      { label: "Protein til restitution", slug: "proteinpulver-til-restitution", href: "/protein-traening/proteinpulver-til-restitution", desc: "Optimeret til hurtig genopbygning efter træning." },
      { label: "Protein til vægttab", slug: "proteinpulver-til-vaegttab", href: "/protein-traening/proteinpulver-til-vaegttab", desc: "Lavkalorisk protein der støtter muskelmasse i underskud." },
      { label: "Protein uden sødestoffer", slug: "proteinpulver-uden-sodestoffer", href: "/protein-traening/proteinpulver-uden-sodestoffer", desc: "Rent protein uden sucralose eller stevia." },
      { label: "Protein uden tilsat sukker", slug: "proteinpulver-uden-tilsat-sukker", href: "/protein-traening/proteinpulver-uden-tilsat-sukker", desc: "Proteinpulver med 0 g tilsat sukker." },
    ],
  },
  {
    heading: "Performance & Styrke",
    intro: "Kreatin, pre-workout og aminosyrer til at booste styrke, udholdenhed og fokus under træning.",
    items: [
      { label: "Kreatin", slug: "kreatin", href: "/protein-traening/kreatin", desc: "Monohydrat og andre former – evidensbaseret styrketilskud." },
      { label: "Pre-workout", slug: "pre-workout", href: "/protein-traening/pre-workout", desc: "Boosters med koffein, citrullin og beta-alanin." },
      { label: "PWO med koffein", slug: "pwo-med-koffein", href: "/protein-traening/pwo-med-koffein", desc: "Pre-workout med stimulerende koffeinindhold." },
      { label: "PWO med kreatin", slug: "pwo-med-kreatin", href: "/protein-traening/pwo-med-kreatin", desc: "Kombiprodukter med kreatin og pre-workout." },
      { label: "Koffeinfri PWO", slug: "koffeinfri-pwo", href: "/protein-traening/koffeinfri-pwo", desc: "Stimulantfri pre-workout til aften eller følsomme." },
      { label: "BCAA", slug: "bcaa", href: "/protein-traening/bcaa", desc: "Forgrenede aminosyrer – leucin, isoleucin og valin." },
      { label: "EAA", slug: "eaa", href: "/protein-traening/eaa", desc: "Alle 9 essentielle aminosyrer i ét produkt." },
      { label: "Beta-alanin", slug: "beta-alanin", href: "/protein-traening/beta-alanin", desc: "Bufrer mælkesyre og forlænger udholdenhed." },
      { label: "ZMA", slug: "zma", href: "/protein-traening/zma", desc: "Zink, magnesium og B6 til restitution og søvn." },
      { label: "Testo Booster", slug: "testo-booster", href: "/protein-traening/testo-booster", desc: "Naturlige tilskud til testosteronstøtte." },
      { label: "Elektrolytter", slug: "elektrolytter", href: "/protein-traening/elektrolytter", desc: "Natrium, kalium og magnesium til hydrering." },
    ],
  },
  {
    heading: "Aminosyrer",
    intro: "Individuelle aminosyrer til målrettet støtte af muskelopbygning, restitution og kognitiv funktion.",
    items: [
      { label: "Glutamin", slug: "glutamin", href: "/protein-traening/glutamin", desc: "Den mest udbredte aminosyre i kroppen." },
      { label: "L-Leucin", slug: "l-leucin", href: "/protein-traening/l-leucin", desc: "Nøgleaminosyre til muskelproteinsyntese." },
      { label: "Taurin", slug: "taurin", href: "/protein-traening/taurin", desc: "Støtter hjerte, øjne og nervesystem." },
      { label: "Arginin", slug: "arginin", href: "/protein-traening/arginin", desc: "Forløber for nitrogenoxid og blodgennemstrømning." },
      { label: "Glycin", slug: "glycin", href: "/protein-traening/glycin", desc: "Vigtig for kollagen, søvn og nervefunktion." },
      { label: "Lysin", slug: "lysin", href: "/protein-traening/lysin", desc: "Essentiel aminosyre til immunforsvar og kollagen." },
      { label: "Tyrosin", slug: "tyrosin", href: "/protein-traening/tyrosin", desc: "Forløber for dopamin – støtter fokus og energi." },
    ],
  },
  {
    heading: "Energi & Restitution",
    intro: "Kulhydrater, sportsdrikke og energiprodukter til brændstof under træning og hurtigere genopladning efter.",
    items: [
      { label: "Kulhydratpulver", slug: "kulhydratpulver", href: "/protein-traening/kulhydratpulver", desc: "Hurtige kulhydrater til energi under og efter træning." },
      { label: "Sportsdrik", slug: "sportsdrik", href: "/protein-traening/sportsdrik", desc: "Elektrolytter og kulhydrater i drikkeklar form." },
      { label: "Energibarer", slug: "energibarer", href: "/protein-traening/energibarer", desc: "Hurtige kalorier som snack før eller under aktivitet." },
      { label: "Energidrik", slug: "energi-drik", href: "/protein-traening/energi-drik", desc: "Koffeinholdige drikke til energi og fokus." },
      { label: "Koffeintabletter", slug: "koffeintabletter", href: "/protein-traening/koffeintabletter", desc: "Præcis dosering af koffein uden tilsætningsstoffer." },
      { label: "Peanut Butter", slug: "peanut-butter", href: "/protein-traening/peanut-butter", desc: "Naturlig jordnøddesmør med sunde fedtsyrer og protein." },
    ],
  },
]

/* ------------------------------------------------------------------ */
/*  Category card with winner product image                           */
/* ------------------------------------------------------------------ */

function CategoryCard({ item, winnerImg }: { item: CatItem; winnerImg?: string }) {
  return (
    <Link
      href={item.href}
      className="group flex items-center gap-3 rounded-lg border border-slate-100 bg-white px-4 py-3 transition-all hover:border-green-300 hover:shadow-sm"
    >
      <div className="flex-1 min-w-0">
        <span className="text-sm font-semibold text-slate-800 group-hover:text-green-700">
          {item.label}
        </span>
        <span className="mt-0.5 block text-xs leading-snug text-slate-500">
          {item.desc}
        </span>
      </div>
      {winnerImg && (
        <div className="relative h-12 w-12 flex-shrink-0 rounded-md bg-slate-50 p-0.5">
          <Image
            src={winnerImg}
            alt={`Bedst i test – ${item.label}`}
            width={48}
            height={48}
            className="h-full w-full object-contain"
            loading="lazy"
          />
        </div>
      )}
    </Link>
  )
}

/* ------------------------------------------------------------------ */
/*  Page                                                              */
/* ------------------------------------------------------------------ */

export default function ProteinTraeningHubPage() {
  const totalCategories = GROUPS.reduce((sum, g) => sum + g.items.length, 0)
  const winners = getWinnerImages()

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      <Breadcrumbs items={[{ name: "Protein & Træning", href: "/protein-traening" }]} />

      {/* ── HERO BANNER ── */}
      <section className="relative mb-10 overflow-hidden rounded-2xl bg-gradient-to-br from-green-800 via-green-700 to-emerald-600 px-6 py-10 sm:px-10 sm:py-14">
        {/* Decorative pattern */}
        <div className="absolute inset-0 opacity-[0.07]" style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")" }} />

        <div className="relative flex flex-col sm:flex-row sm:items-center sm:gap-8">
          <div className="flex-1">
            <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl lg:text-5xl">
              Protein &amp; Træning
            </h1>
            <p className="mt-3 max-w-xl text-base leading-relaxed text-green-100/90">
              Uafhængige tests og sammenligninger af {totalCategories} kategorier inden for proteinpulver,
              kreatin, pre-workout, aminosyrer og mere. Vi analyserer aminosyreprofil, dosering og pris
              pr. portion – så du kan vælge med tillid.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-medium text-white backdrop-blur-sm">
                <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                {totalCategories} kategorier testet
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-medium text-white backdrop-blur-sm">
                <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                Opdateret februar 2026
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-medium text-white backdrop-blur-sm">
                <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                Faktatjekket af diætist
              </span>
            </div>
          </div>

          {/* Floating product images */}
          <div className="mt-6 flex items-center gap-2 sm:mt-0 sm:flex-col">
            {["proteinpulver", "kreatin", "pre-workout", "bcaa"].map((slug) =>
              winners[slug] ? (
                <div key={slug} className="h-16 w-16 rounded-xl bg-white/90 p-1.5 shadow-lg backdrop-blur-sm sm:h-18 sm:w-18">
                  <Image src={winners[slug]} alt={slug} width={56} height={56} className="h-full w-full object-contain" />
                </div>
              ) : null
            )}
          </div>
        </div>
      </section>

      {/* ── Intro text ── */}
      <div className="mb-8 max-w-3xl space-y-3 text-base leading-relaxed text-slate-600">
        <p>
          Uanset om du styrketræner, løber eller dyrker holdsport, spiller din ernæring en
          afgørende rolle for præstation og restitution. Protein er grundstenen i muskelopbygning,
          men markedet byder på alt fra whey og kasein til veganske blandinger og æggeprotein &ndash;
          og det kan være svært at gennemskue, hvad der faktisk lever op til løfterne på etiketten.
        </p>
        <p>
          På Kosttilskudsvalg tester vi træningskosttilskud ud fra en{" "}
          <Link href="/metodik" className="font-medium text-green-700 underline underline-offset-2 hover:text-green-800">
            fast metodik
          </Link>
          : vi analyserer proteinindhold, aminosyreprofil, kreatingehalt, koffeinniveau og pris
          pr. dagsdosis. Alle tests udføres af ernæringsrådgivere og{" "}
          <Link href="/redaktion" className="font-medium text-green-700 underline underline-offset-2 hover:text-green-800">
            faktatjekkes af en klinisk diætist
          </Link>
          . Vi modtager ingen betaling fra producenter for positive anmeldelser.
        </p>
      </div>

      {/* ── Sådan vælger du ── */}
      <section className="mb-10 rounded-xl border border-green-200 bg-green-50/40 p-6">
        <h2 className="text-lg font-bold text-slate-900">Sådan vælger du det rigtige træningskosttilskud</h2>
        <ol className="mt-4 space-y-2.5 text-sm text-slate-700">
          {[
            { n: "1", title: "Definér dit mål:", body: "Vil du bygge muskelmasse, forbedre udholdenhed eller tabe fedt? Dit mål afgør, hvilke tilskud der er relevante." },
            { n: "2", title: "Beregn dit proteinbehov:", body: "De fleste styrketrænende har brug for 1,6–2,2 g protein pr. kg kropsvægt dagligt." },
            { n: "3", title: "Sammenlign pris pr. portion", body: "– ikke pakkeprisen. Et stort bøtte med lav proteindosis kan være dyrere pr. 25 g protein." },
            { n: "4", title: "Tjek ingredienslisten:", body: "Unødvendige fyldstoffer, amino-spiking og kunstige sødemidler varierer markant mellem mærker." },
            { n: "5", title: "Vælg dokumenterede produkter:", body: "Kig efter tredjepartstest (Informed Sport, NSF) og undgå produkter med urealistiske løfter." },
          ].map((step) => (
            <li key={step.n} className="flex items-start gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-green-600 text-xs font-bold text-white">{step.n}</span>
              <span><strong>{step.title}</strong> {step.body}</span>
            </li>
          ))}
        </ol>
      </section>

      {/* ── Grouped Category Sections ── */}
      <div className="space-y-10">
        {GROUPS.map((group) => (
          <section key={group.heading}>
            <div className="flex items-center gap-3 mb-1">
              <div className="h-7 w-1 rounded-full bg-green-600" />
              <h2 className="text-lg font-bold text-slate-900">{group.heading}</h2>
            </div>
            <p className="mb-4 pl-[19px] text-sm text-slate-500">{group.intro}</p>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {group.items.map((item) => (
                <CategoryCard key={item.href} item={item} winnerImg={winners[item.slug]} />
              ))}
            </div>
          </section>
        ))}
      </div>

      {/* ── Cross-silo links ── */}
      <section className="mt-12 rounded-xl border border-slate-200 bg-slate-50/50 p-6">
        <h2 className="text-base font-bold text-slate-900 mb-3">Udforsk flere kategorier</h2>
        <div className="flex flex-wrap gap-2">
          {[
            { label: "Vitaminer", href: "/vitaminer" },
            { label: "Mineraler", href: "/mineraler" },
            { label: "Omega & Fedtsyrer", href: "/omega-fedtsyrer" },
            { label: "Sundhed & Velvære", href: "/sundhed-velvaere" },
          ].map((s) => (
            <Link key={s.href} href={s.href} className="rounded-full border border-slate-200 bg-white px-4 py-1.5 text-sm font-medium text-slate-700 transition hover:border-green-300 hover:text-green-700">{s.label}</Link>
          ))}
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="mt-10">
        <h2 className="mb-4 text-xl font-bold text-slate-900">Ofte stillede spørgsmål</h2>
        <FAQ items={[
          { question: "Hvornår skal jeg tage protein?", answer: "Det vigtigste er dit samlede daglige proteinindtag, ikke timing. Studier viser dog, at protein inden for 2–3 timer efter træning kan optimere muskelproteinsyntesen. Fordel dit protein jævnt over dagens måltider for bedste resultat." },
          { question: "Er kreatin sikkert?", answer: "Ja. Kreatin monohydrat er et af de bedst dokumenterede kosttilskud overhovedet. Hundredvis af studier bekræfter, at det er sikkert for raske voksne ved anbefalet dosering (3–5 g dagligt). Tal med din læge, hvis du har nyresygdom." },
          { question: "Virker pre-workout, eller er det bare koffein?", answer: "Koffein er den mest aktive ingrediens i de fleste pre-workout-produkter. Men visse tilskud indeholder også klinisk doseret citrullin, beta-alanin og kreatin, som har selvstændig dokumentation. Tjek om doserne matcher studierne." },
          { question: "Har jeg brug for BCAA, hvis jeg tager proteinpulver?", answer: "For de fleste er BCAA unødvendigt, hvis du allerede indtager tilstrækkeligt protein. Whey indeholder allerede høje niveauer af BCAA. BCAA kan dog være relevant ved træning i fastet tilstand eller ved lavt kalorieindtag." },
          { question: "Hvor meget protein har jeg brug for?", answer: "For styrketrænende anbefales typisk 1,6–2,2 g protein pr. kg kropsvægt dagligt. Udholdenhedsatleter kan klare sig med 1,2–1,6 g/kg. Behovet afhænger af træningsmængde, mål og individuelle faktorer." },
        ]} />
      </section>

      <EditorialSignoff author="line-kragelund" lastUpdated="Februar 2026" />

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
        "@context": "https://schema.org", "@type": "FAQPage",
        mainEntity: [
          { "@type": "Question", name: "Hvornår skal jeg tage protein?", acceptedAnswer: { "@type": "Answer", text: "Det vigtigste er dit samlede daglige proteinindtag, ikke timing." } },
          { "@type": "Question", name: "Er kreatin sikkert?", acceptedAnswer: { "@type": "Answer", text: "Ja. Kreatin monohydrat er sikkert for raske voksne ved 3–5 g dagligt." } },
          { "@type": "Question", name: "Virker pre-workout?", acceptedAnswer: { "@type": "Answer", text: "Koffein er den mest aktive ingrediens, men citrullin, beta-alanin og kreatin har selvstændig dokumentation." } },
          { "@type": "Question", name: "Har jeg brug for BCAA?", acceptedAnswer: { "@type": "Answer", text: "For de fleste er BCAA unødvendigt med tilstrækkeligt protein." } },
          { "@type": "Question", name: "Hvor meget protein har jeg brug for?", acceptedAnswer: { "@type": "Answer", text: "Styrketrænende anbefales 1,6–2,2 g pr. kg kropsvægt dagligt." } },
        ],
      }) }} />
    </div>
  )
}
