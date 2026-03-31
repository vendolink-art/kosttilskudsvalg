import Link from "next/link"
import Image from "next/image"
import { Breadcrumbs } from "@/components/breadcrumbs"
import { EditorialSignoff } from "@/components/editorial-signoff"
import { FAQ } from "@/components/faq"
import { getWinnerImages } from "@/lib/get-winner-images"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Sundhed & Velvære – Uafhængige tests og sammenligninger (2026)",
  description:
    "Find de bedste sundheds- og velværetilskud med vores uafhængige tests. Vi sammenligner probiotika, kollagen, ashwagandha, svampe, urter og 80+ kategorier med fast metodik.",
  alternates: { canonical: "https://www.kosttilskudsvalg.dk/sundhed-velvaere" },
  openGraph: {
    title: "Sundhed & Velvære – Uafhængige tests og sammenligninger (2026)",
    description: "Find de bedste sundheds- og velværetilskud med vores uafhængige tests. Vi sammenligner probiotika, kollagen, ashwagandha, svampe, urter og 80+ kategorier.",
    url: "https://www.kosttilskudsvalg.dk/sundhed-velvaere",
    type: "website",
    locale: "da_DK",
    siteName: "Kosttilskudsvalg",
  },
}

interface CatItem { label: string; href: string; slug: string; desc: string }
interface CatGroup { heading: string; intro: string; items: CatItem[] }

const GROUPS: CatGroup[] = [
  {
    heading: "Hud, hår & led",
    intro: "Kollagen, hyaluronsyre og ledtilskud – populære produkter til hud, hår, negle og bevægeapparat.",
    items: [
      { label: "Kollagenpulver", slug: "kollagenpulver", href: "/sundhed-velvaere/kollagenpulver", desc: "Type I, II og III kollagen fra fisk og kvæg testet." },
      { label: "Collagen kapsler", slug: "collagen-kapsler", href: "/sundhed-velvaere/collagen-kapsler", desc: "Praktisk kapselform med kollagenpeptider." },
      { label: "Hyaluronsyre", slug: "hyaluronsyre", href: "/sundhed-velvaere/hyaluronsyre", desc: "Til hud, fugt og ledvæske – dosering og form." },
      { label: "Kosttilskud til led", slug: "kosttilskud-til-led", href: "/sundhed-velvaere/kosttilskud-til-led", desc: "Glucosamin, chondroitin og MSM til ledbrusk." },
    ],
  },
  {
    heading: "Mave & Fordøjelse",
    intro: "Probiotika, fibre og fordøjelsesenzymer til en sund tarmflora og optimal fordøjelse.",
    items: [
      { label: "Probiotika", slug: "probiotika", href: "/sundhed-velvaere/probiotika", desc: "Mælkesyrebakterier sammenlignet på stammer og CFU." },
      { label: "Mælkesyrebakterier", slug: "maelkesyrebakterier", href: "/sundhed-velvaere/maelkesyrebakterier", desc: "Lactobacillus og Bifidobacterium til tarmsundhed." },
      { label: "Loppefrøskaller", slug: "loppefroskaller", href: "/sundhed-velvaere/loppefroskaller", desc: "Psyllium husk til fibre, mæthed og fordøjelse." },
      { label: "Fibertabletter", slug: "fibertabletter", href: "/sundhed-velvaere/fibertabletter", desc: "Koncentreret fibertilskud i tabletform." },
      { label: "Fordøjelsesenzym", slug: "fordojelsesenzym", href: "/sundhed-velvaere/fordojelsesenzym", desc: "Enzymer til nedbrydning af protein, fedt og kulhydrater." },
      { label: "Glucomannan", slug: "glucomannan", href: "/sundhed-velvaere/glucomannan", desc: "Fiber fra konjacrod – EFSA-godkendt til vægttab." },
      { label: "Aloe vera juice", slug: "aloe-vera-juice", href: "/sundhed-velvaere/aloe-vera-juice", desc: "Aloe vera drik til fordøjelse og indre beroligelse." },
    ],
  },
  {
    heading: "Stress & Hormonel balance",
    intro: "Adaptogener og aminosyrer til at håndtere stress, forbedre søvn og støtte hormonbalancen.",
    items: [
      { label: "Ashwagandha", slug: "ashwagandha", href: "/sundhed-velvaere/ashwagandha", desc: "KSM-66 og Sensoril – withanolid-indhold og dosering." },
      { label: "L-Theanin", slug: "l-theanin", href: "/sundhed-velvaere/l-theanin", desc: "Aminosyre fra te – ro og fokus uden døsighed." },
      { label: "GABA", slug: "gaba", href: "/sundhed-velvaere/gaba", desc: "Hæmmende neurotransmitter til afslapning og søvn." },
      { label: "Inositol", slug: "inositol", href: "/sundhed-velvaere/inositol", desc: "B-vitamin-lignende stof til PCOS og mental sundhed." },
      { label: "Cholin", slug: "cholin", href: "/sundhed-velvaere/cholin", desc: "Essentielt næringsstof til lever og hjernefunktion." },
      { label: "Mod stress", slug: "kosttilskud-mod-stress", href: "/sundhed-velvaere/kosttilskud-mod-stress", desc: "Sammenligning af de bedste stresstilskud." },
      { label: "Hormonel balance kvinder", slug: "hormonel-balance-hos-kvinder", href: "/sundhed-velvaere/hormonel-balance-hos-kvinder", desc: "Tilskud til menstruation, PMS og fertilitet." },
      { label: "Hormonel balance mænd", slug: "hormonel-balance-hos-maend", href: "/sundhed-velvaere/hormonel-balance-hos-maend", desc: "Tilskud til testosteron og mandlig sundhed." },
      { label: "Overgangsalder", slug: "kosttilskud-til-overgangsalderen", href: "/sundhed-velvaere/kosttilskud-til-overgangsalderen", desc: "Lindring af hedeture, søvnproblemer og hormoner." },
    ],
  },
  {
    heading: "Hjerte, lever & generel sundhed",
    intro: "Antioxidanter og cellulære tilskud til hjerte-kar-sundhed, leverfunktion og aldringsbeskyttelse.",
    items: [
      { label: "Q10", slug: "q10", href: "/sundhed-velvaere/q10", desc: "Ubiquinon og ubiquinol – energiproduktion og antioxidant." },
      { label: "NAC", slug: "nac", href: "/sundhed-velvaere/nac", desc: "N-acetylcystein – glutathionforløber til lever og lunger." },
      { label: "NAD+", slug: "nad", href: "/sundhed-velvaere/nad", desc: "Nikotinamid-riboside og NMN til cellulær energi." },
      { label: "Resveratrol", slug: "resveratrol", href: "/sundhed-velvaere/resveratrol", desc: "Polyfenol fra druer – studeret for anti-aging." },
      { label: "Quercetin", slug: "quercetin", href: "/sundhed-velvaere/quercetin", desc: "Flavonoid med antiinflammatoriske egenskaber." },
      { label: "Glutathion", slug: "glutathion", href: "/sundhed-velvaere/glutathion", desc: "Kroppens vigtigste antioxidant – liposomal vs. reduceret." },
      { label: "Alfa-liponsyre", slug: "alfa-liponsyre", href: "/sundhed-velvaere/alfa-liponsyre", desc: "Universel antioxidant til blodsukker og nerver." },
      { label: "Til hjertet", slug: "kosttilskud-til-hjertet", href: "/sundhed-velvaere/kosttilskud-til-hjertet", desc: "Q10, omega-3 og andre tilskud til hjerte-kar." },
      { label: "Til leveren", slug: "kosttilskud-til-leveren", href: "/sundhed-velvaere/kosttilskud-til-leveren", desc: "Marietidsel, NAC og andre leverbeskyttende tilskud." },
    ],
  },
  {
    heading: "Svampe & Adaptogener",
    intro: "Funktionelle svampe og adaptogener – fra Lion's Mane til reishi og ginseng til kognitiv funktion og immunforsvar.",
    items: [
      { label: "Lion's Mane", slug: "lions-mane", href: "/sundhed-velvaere/lions-mane", desc: "Pindsvinepigsvamp – beta-glucaner til hjerne og nerver." },
      { label: "Reishi", slug: "reishi", href: "/sundhed-velvaere/reishi", desc: "Lakkporesvamp til immunforsvar og søvnkvalitet." },
      { label: "Chaga", slug: "chaga", href: "/sundhed-velvaere/chaga", desc: "Antioxidantrig svamp fra birketræer." },
      { label: "Shiitake", slug: "shiitake", href: "/sundhed-velvaere/shiitake", desc: "Populær madsvamp med immunstøttende beta-glucaner." },
      { label: "Ginseng", slug: "ginseng", href: "/sundhed-velvaere/ginseng", desc: "Koreansk og sibirisk ginseng til energi og fokus." },
      { label: "Astragalus", slug: "astragalus", href: "/sundhed-velvaere/astragalus", desc: "Kinesisk urt til immunforsvar og udholdenhed." },
      { label: "Schisandra", slug: "schisandra", href: "/sundhed-velvaere/schisandra", desc: "Adaptogen bær til lever, stress og udholdenhed." },
    ],
  },
  {
    heading: "Urter & Planteekstrakter",
    intro: "Gurkmeje, ingefær, hyben og andre urter med lang tradition – vurderet på moderne evidens, form og dosering.",
    items: [
      { label: "Gurkmeje", slug: "gurkmeje", href: "/sundhed-velvaere/gurkmeje", desc: "Curcumin med piperin, liposomal og Meriva-teknologi." },
      { label: "Ingefær piller", slug: "ingefaer-piller", href: "/sundhed-velvaere/ingefaer-piller", desc: "Ingefærekstrakt i kapselform til inflammation." },
      { label: "Ingefær pulver", slug: "ingefaer-pulver", href: "/sundhed-velvaere/ingefaer-pulver", desc: "Malet ingefær til madlavning og drik." },
      { label: "Hvidløgspiller", slug: "hvidlogspiller", href: "/sundhed-velvaere/hvidlogspiller", desc: "Allicin-standardiseret hvidløg til hjerte og immunforsvar." },
      { label: "Hyben kapsler", slug: "hyben-kapsler", href: "/sundhed-velvaere/hyben-kapsler", desc: "Hybenpulver i kapsler til led og C-vitamin." },
      { label: "Hybenpulver", slug: "hybenpulver", href: "/sundhed-velvaere/hybenpulver", desc: "Malet hyben med naturligt galaktolipid og C-vitamin." },
      { label: "Tranebærkapsler", slug: "tranebaerkapsler", href: "/sundhed-velvaere/tranebaerkapsler", desc: "Proanthocyanidiner til urinveje og blæresundhed." },
      { label: "Olivenbladsekstrakt", slug: "olivenbladsekstrakt", href: "/sundhed-velvaere/olivenbladsekstrakt", desc: "Oleuropein-rigt ekstrakt til hjerte og immunforsvar." },
      { label: "Brændenælde", slug: "braendenaelde-pulver", href: "/sundhed-velvaere/braendenaelde-pulver", desc: "Mineralrig urt til allergi, led og prostata." },
      { label: "Boswellia", slug: "boswellia", href: "/sundhed-velvaere/boswellia", desc: "Røgelse-ekstrakt til led og inflammation." },
      { label: "Bromelain", slug: "bromelain", href: "/sundhed-velvaere/bromelain", desc: "Enzym fra ananas til fordøjelse og hævelse." },
      { label: "Bukkehornskløver", slug: "bukkehornsklover", href: "/sundhed-velvaere/bukkehornsklover", desc: "Traditionel urt til blodsukker og testosteron." },
      { label: "Gelé Royal", slug: "gele-royal", href: "/sundhed-velvaere/gele-royal", desc: "Bidronningens foder – immunstøtte og vitalitet." },
      { label: "Blåbærtilskud", slug: "blabaertilskud", href: "/sundhed-velvaere/blabaertilskud", desc: "Anthocyaniner til øjne, hjerne og blodkar." },
      { label: "Granatæble", slug: "granataebletilskud", href: "/sundhed-velvaere/granataebletilskud", desc: "Polyfenol-rigt ekstrakt til hjerte og antioxidanter." },
      { label: "Betain", slug: "betain", href: "/sundhed-velvaere/betain", desc: "TMG – til lever, fordøjelse og homocysteinniveauer." },
    ],
  },
  {
    heading: "Superfoods",
    intro: "Grønne pulvere, alger og superfrugt – næringstætte tilskud med vitaminer, mineraler og antioxidanter.",
    items: [
      { label: "Spirulina", slug: "spirulina", href: "/sundhed-velvaere/spirulina", desc: "Blågrøn alge med protein, jern og B-vitaminer." },
      { label: "Chlorella", slug: "chlorella", href: "/sundhed-velvaere/chlorella", desc: "Grøn ferskvandsalge til detox og næringstæthed." },
      { label: "Bygræs", slug: "byggraes", href: "/sundhed-velvaere/byggraes", desc: "Ungt bygræs med enzymer, klorofyl og mineraler." },
      { label: "Hvedegræs", slug: "hvedegraes-pulver", href: "/sundhed-velvaere/hvedegraes-pulver", desc: "Grønt hvedegræspulver rigt på klorofyl." },
      { label: "Super Greens", slug: "super-greens-pulver", href: "/sundhed-velvaere/super-greens-pulver", desc: "Alt-i-ét grønt pulver med alger, bær og urter." },
      { label: "Acai", slug: "acai", href: "/sundhed-velvaere/acai", desc: "Brasiliansk superfrugt med høj ORAC-værdi." },
      { label: "Moringa", slug: "moringa-tilskud", href: "/sundhed-velvaere/moringa-tilskud", desc: "Tropisk blad med protein, jern og C-vitamin." },
      { label: "Matcha", slug: "matchatilskud", href: "/sundhed-velvaere/matchatilskud", desc: "Japansk grøn te med L-theanin og katekin." },
      { label: "Chiafrø", slug: "chiafro", href: "/sundhed-velvaere/chiafro", desc: "Fiber, omega-3 og protein fra frø." },
      { label: "Rødbedepulver", slug: "rodbedepulver", href: "/sundhed-velvaere/rodbedepulver", desc: "Nitrat-rigt pulver til blodtryk og udholdenhed." },
      { label: "Astaxanthin", slug: "astaxanthin", href: "/sundhed-velvaere/astaxanthin", desc: "Kraftfuld carotenoid-antioxidant fra mikroalger." },
    ],
  },
  {
    heading: "Vægttab & Detox",
    intro: "Fedtforbrændere, måltidserstatninger og detoxprodukter – vurderet på evidens, sikkerhed og pris.",
    items: [
      { label: "Fedtforbrænder", slug: "bedste-fedtforbraender", href: "/sundhed-velvaere/bedste-fedtforbraender", desc: "Termogene tilskud med koffein, grøn te og capsaicin." },
      { label: "Måltidserstatning", slug: "bedste-maltidserstatning", href: "/sundhed-velvaere/bedste-maltidserstatning", desc: "Komplette shakes til kaloriereduktion." },
      { label: "Slankepiller", slug: "slankepiller", href: "/sundhed-velvaere/slankepiller", desc: "Oversigt over appetithæmmere og vægttabstilskud." },
      { label: "Grøn te", slug: "gron-te", href: "/sundhed-velvaere/gron-te", desc: "EGCG-rigt teekstrakt til stofskifte og antioxidanter." },
      { label: "Grøn te piller", slug: "gron-te-piller", href: "/sundhed-velvaere/gron-te-piller", desc: "Koncentreret grøn te-ekstrakt i kapselform." },
      { label: "Guarana", slug: "guarana", href: "/sundhed-velvaere/guarana", desc: "Naturlig koffeinkilde fra Amazonas." },
      { label: "Vanddrivende piller", slug: "vanddrivende-piller", href: "/sundhed-velvaere/vanddrivende-piller", desc: "Naturlige diuretika til væskebalance." },
      { label: "Acetyl-L-Carnitin", slug: "acetyl-l-carnitin", href: "/sundhed-velvaere/acetyl-l-carnitin", desc: "Fedtsyretransport til mitokondrier – energi og hjerne." },
      { label: "Detox", slug: "kosttilskud-til-detox", href: "/sundhed-velvaere/kosttilskud-til-detox", desc: "Tilskud til leverstøtte og udrensning." },
    ],
  },
  {
    heading: "Øvrige tilskud & livsstil",
    intro: "Specialtilskud til løbere, veganere, keto-diæt og andre specifikke behov.",
    items: [
      { label: "Til løb", slug: "kosttilskud-til-lob", href: "/sundhed-velvaere/kosttilskud-til-lob", desc: "Elektrolytter, jern og energi til løbere." },
      { label: "Til veganere", slug: "kosttilskud-til-veganere", href: "/sundhed-velvaere/kosttilskud-til-veganere", desc: "B12, D3, jern og omega-3 for plantebaseret kost." },
      { label: "Til keto-diæt", slug: "kosttilskud-til-keto-diaet", href: "/sundhed-velvaere/kosttilskud-til-keto-diaet", desc: "MCT, elektrolytter og mineraler til ketose." },
      { label: "Kosttilskud gummier", slug: "kosttilskud-gummier", href: "/sundhed-velvaere/kosttilskud-gummier", desc: "Gummivitaminer og -tilskud smagt og doseret." },
      { label: "Animalske kosttilskud", slug: "animalske-kosttilskud", href: "/sundhed-velvaere/animalske-kosttilskud", desc: "Organekstrakter og animalske næringsstoffer." },
      { label: "Shirataki nudler", slug: "shirataki-nudler", href: "/sundhed-velvaere/shirataki-nudler", desc: "Næsten kaloriefrie nudler fra konjacrod." },
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

export default function SundhedVelvaereHubPage() {
  const totalCategories = GROUPS.reduce((sum, g) => sum + g.items.length, 0)
  const winners = getWinnerImages()

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      <Breadcrumbs items={[{ name: "Sundhed & Velvære", href: "/sundhed-velvaere" }]} />

      {/* ── HERO BANNER ── */}
      <section className="relative mb-10 overflow-hidden rounded-2xl bg-gradient-to-br from-purple-700 via-purple-600 to-fuchsia-500 px-6 py-10 sm:px-10 sm:py-14">
        <div className="absolute inset-0 opacity-[0.07]" style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")" }} />
        <div className="relative flex flex-col sm:flex-row sm:items-center sm:gap-8">
          <div className="flex-1">
            <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl lg:text-5xl">Sundhed &amp; Velvære</h1>
            <p className="mt-3 max-w-xl text-base leading-relaxed text-purple-100/90">
              Uafhængige tests og sammenligninger af {totalCategories} kategorier inden for probiotika, kollagen, adaptogener, svampe, urter, superfoods og mere. Vi vurderer evidens, dosering og pris.
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
            {["probiotika", "ashwagandha", "kollagenpulver", "lions-mane"].map((slug) =>
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
        <p>Kategorien sundhed og velvære rummer alt fra probiotika og kollagen til adaptogener som ashwagandha, funktionelle svampe og klassiske urter. Det er et område med stor variation i evidensniveau &ndash; nogle tilskud har solid dokumentation, mens andre primært bygger på tradition.</p>
        <p>På Kosttilskudsvalg analyserer vi sundheds- og velværetilskud ud fra en{" "}<Link href="/metodik" className="font-medium text-green-700 underline underline-offset-2 hover:text-green-800">fast metodik</Link>: vi vurderer videnskabelig dokumentation, aktive indholdsstoffer, dosering og pris pr. dagsdosis. Alt indhold skrives af ernæringsrådgivere og{" "}<Link href="/redaktion" className="font-medium text-green-700 underline underline-offset-2 hover:text-green-800">faktatjekkes af en klinisk diætist</Link>.</p>
      </div>

      {/* ── Sådan vælger du ── */}
      <section className="mb-10 rounded-xl border border-green-200 bg-green-50/40 p-6">
        <h2 className="text-lg font-bold text-slate-900">Sådan vælger du det rigtige sundhedstilskud</h2>
        <ol className="mt-4 space-y-2.5 text-sm text-slate-700">
          {[
            { n: "1", title: "Start med evidensen:", body: "Har tilskuddet dokumentation fra randomiserede studier – eller er det primært dyreforsøg og anekdoter?" },
            { n: "2", title: "Tjek doser mod studier:", body: "Mange produkter underdoserer det aktive stof. Sammenlign med kliniske studiedoser." },
            { n: "3", title: "Vælg dokumenterede ekstrakter:", body: "Patenterede ekstrakter (f.eks. KSM-66, Meriva) har typisk bedre dokumentation end generiske pulvere." },
            { n: "4", title: "Vær kritisk over for hype:", body: "Nye \"superfoods\" kan være lovende, men kræver tid for at opbygge solid evidens." },
            { n: "5", title: "Tal med din læge,", body: "især hvis du tager medicin – mange urter og adaptogener kan interagere med lægemidler." },
          ].map((s) => (
            <li key={s.n} className="flex items-start gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-green-600 text-xs font-bold text-white">{s.n}</span>
              <span><strong>{s.title}</strong> {s.body}</span>
            </li>
          ))}
        </ol>
      </section>

      {/* ── Quick navigation ── */}
      <nav className="mb-10 rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="text-base font-bold text-slate-900 mb-3">Gå til afsnit</h2>
        <div className="flex flex-wrap gap-2">
          {GROUPS.map((g) => {
            const id = g.heading.toLowerCase().replace(/[^a-zæøå0-9]+/g, "-").replace(/-+$/, "")
            return <a key={id} href={`#${id}`} className="rounded-full border border-slate-150 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600 transition hover:border-green-300 hover:text-green-700 hover:bg-green-50">{g.heading}</a>
          })}
        </div>
      </nav>

      {/* ── Grouped Categories ── */}
      <div className="space-y-10">
        {GROUPS.map((group) => {
          const id = group.heading.toLowerCase().replace(/[^a-zæøå0-9]+/g, "-").replace(/-+$/, "")
          return (
            <section key={group.heading} id={id}>
              <div className="flex items-center gap-3 mb-1"><div className="h-7 w-1 rounded-full bg-green-600" /><h2 className="text-lg font-bold text-slate-900">{group.heading}</h2></div>
              <p className="mb-4 pl-[19px] text-sm text-slate-500">{group.intro}</p>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {group.items.map((item) => (<CategoryCard key={item.href} item={item} winnerImg={winners[item.slug]} />))}
              </div>
            </section>
          )
        })}
      </div>

      {/* ── Cross-silo ── */}
      <section className="mt-12 rounded-xl border border-slate-200 bg-slate-50/50 p-6">
        <h2 className="text-base font-bold text-slate-900 mb-3">Udforsk flere kategorier</h2>
        <div className="flex flex-wrap gap-2">
          {[{ label: "Protein & Træning", href: "/protein-traening" }, { label: "Vitaminer", href: "/vitaminer" }, { label: "Mineraler", href: "/mineraler" }, { label: "Omega & Fedtsyrer", href: "/omega-fedtsyrer" }].map((s) => (
            <Link key={s.href} href={s.href} className="rounded-full border border-slate-200 bg-white px-4 py-1.5 text-sm font-medium text-slate-700 transition hover:border-green-300 hover:text-green-700">{s.label}</Link>
          ))}
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="mt-10">
        <h2 className="mb-4 text-xl font-bold text-slate-900">Ofte stillede spørgsmål</h2>
        <FAQ items={[
          { question: "Hvilke probiotiske stammer er bedst dokumenteret?", answer: "Lactobacillus rhamnosus GG og Saccharomyces boulardii har stærkest evidens. For IBS er Bifidobacterium infantis 35624 veldokumenteret. Vælg specifikke stammer med klinisk dokumentation – ikke blot højt CFU-tal." },
          { question: "Hvilken type kollagen er bedst?", answer: "Type I kollagen er bedst dokumenteret for hud og hår. Type II er relevant for ledbrusk. Hydrolyserede peptider optages bedre end intakt kollagen. Kombiner med C-vitamin." },
          { question: "Er ashwagandha sikkert dagligt?", answer: "Studier viser god sikkerhed ved 300–600 mg dagligt i 8–12 uger. Langvarig brug er mindre undersøgt. Undgå ved graviditet, autoimmune sygdomme eller skjoldbruskkirtelsygdom." },
          { question: "Virker gurkmeje antiinflammatorisk?", answer: "Curcumin har vist lovende egenskaber, men absorptionen er meget lav uden hjælpestoffer som piperin eller liposomal formulering." },
          { question: "Ekstrakt vs. pulver ved svampe?", answer: "Ekstrakter indeholder koncentrerede beta-glucaner. Rå pulver har lavere koncentration. Vælg ekstrakt med standardiseret beta-glucan-indhold." },
          { question: "Kan kosttilskud erstatte en sund kost?", answer: "Nej. Kosttilskud supplerer en varieret kost, men kan ikke erstatte den. Fokuser først på frugt, grøntsager, fuldkorn og sunde fedtstoffer." },
        ]} />
      </section>

      <EditorialSignoff author="line-kragelund" lastUpdated="Februar 2026" />

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
        "@context": "https://schema.org", "@type": "FAQPage",
        mainEntity: [
          { "@type": "Question", name: "Hvilke probiotiske stammer er bedst?", acceptedAnswer: { "@type": "Answer", text: "L. rhamnosus GG og S. boulardii har stærkest evidens." } },
          { "@type": "Question", name: "Hvilken type kollagen er bedst?", acceptedAnswer: { "@type": "Answer", text: "Type I for hud og hår, Type II for led. Hydrolyserede peptider optages bedst." } },
          { "@type": "Question", name: "Er ashwagandha sikkert?", acceptedAnswer: { "@type": "Answer", text: "God sikkerhed ved 300–600 mg dagligt i 8–12 uger." } },
        ],
      }) }} />
    </div>
  )
}
