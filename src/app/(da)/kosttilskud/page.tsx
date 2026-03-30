import Link from "next/link"
import { Breadcrumbs } from "@/components/breadcrumbs"
import { EditorialSignoff } from "@/components/editorial-signoff"
import { FAQ } from "@/components/faq"
import type { Metadata } from "next"
import {
  Beaker,
  ShieldCheck,
  BarChart3,
  BookOpen,
  FlaskConical,
  AlertTriangle,
  ExternalLink,
  CheckCircle2,
  ArrowRight,
} from "lucide-react"

export const metadata: Metadata = {
  title: "Kosttilskud – Uafhængige analyser og sammenligninger (2026)",
  description:
    "Find det rigtige kosttilskud med uafhængige analyser baseret på evidens, dosering og pris pr. dagsdosis. Vitamin, mineral, protein og omega-3 testet af ernæringsrådgivere.",
  alternates: { canonical: "https://www.kosttilskudsvalg.dk/kosttilskud" },
  openGraph: {
    title: "Kosttilskud – Uafhængige analyser og sammenligninger (2026)",
    description:
      "Vi analyserer og sammenligner kosttilskud ud fra evidens, dosering, pris og renhed. Alt faktatjekket af klinisk diætist.",
    url: "https://www.kosttilskudsvalg.dk/kosttilskud",
    type: "website",
  },
}

const SILO_CATEGORIES = [
  {
    silo: "protein-traening",
    label: "Protein & Træning",
    href: "/protein-traening",
    description:
      "Tilskud til muskelopbygning, styrke og restitution – fra proteinpulver til kreatin og pre-workout.",
    categories: [
      { slug: "proteinpulver", label: "Proteinpulver", desc: "Whey, kasein, vegansk og æggeprotein" },
      { slug: "kreatin", label: "Kreatin", desc: "Monohydrat og andre former" },
      { slug: "pre-workout", label: "Pre-workout", desc: "Med og uden koffein" },
      { slug: "bcaa", label: "BCAA", desc: "Forgrenede aminosyrer" },
      { slug: "eaa", label: "EAA", desc: "Essentielle aminosyrer" },
      { slug: "kasein", label: "Kasein", desc: "Langsomt optaget protein" },
      { slug: "glutamin", label: "Glutamin", desc: "Restitution og tarmhelse" },
      { slug: "elektrolytter", label: "Elektrolytter", desc: "Til hydrering under træning" },
    ],
  },
  {
    silo: "vitaminer",
    label: "Vitaminer",
    href: "/vitaminer",
    description:
      "D-vitamin, C-vitamin, B-vitaminer og multivitaminer sammenlignet på dosering, form og dokumentation.",
    categories: [
      { slug: "d-vitamin", label: "D-vitamin", desc: "D3, D3+K2 og vegansk D" },
      { slug: "c-vitamin", label: "C-vitamin", desc: "Ascorbinsyre og bufrede former" },
      { slug: "multivitamin", label: "Multivitamin", desc: "Til kvinder, mænd, børn og gravide" },
      { slug: "b-vitamin", label: "B-vitamin", desc: "Komplet B-kompleks" },
      { slug: "folinsyre", label: "Folinsyre", desc: "Til gravide og celledeling" },
      { slug: "biotin", label: "Biotin", desc: "Til hår, hud og negle" },
    ],
  },
  {
    silo: "mineraler",
    label: "Mineraler",
    href: "/mineraler",
    description:
      "Magnesium, zink, jern og calcium analyseret på biotilgængelighed, dosering og pris pr. dagsdosis.",
    categories: [
      { slug: "magnesium", label: "Magnesium", desc: "Citrat, bisglycinat og andre former" },
      { slug: "zink", label: "Zink", desc: "Picolinat, bisglycinat og gluconat" },
      { slug: "jern-tabletter", label: "Jern", desc: "Til dokumenteret jernmangel" },
      { slug: "kalktabletter", label: "Calcium", desc: "Citrat, carbonat og kombinationer" },
      { slug: "kalium", label: "Kalium", desc: "Til elektrolytbalance" },
      { slug: "selen", label: "Selen", desc: "Selenomethionin og natriumselenit" },
    ],
  },
  {
    silo: "omega-fedtsyrer",
    label: "Omega & Fedtsyrer",
    href: "/omega-fedtsyrer",
    description:
      "Omega-3, fiskeolie, krillolie og MCT-olie sammenlignet på EPA/DHA-indhold, renhed og oxidation.",
    categories: [
      { slug: "fiskeolie", label: "Fiskeolie", desc: "EPA/DHA-indhold og renhed" },
      { slug: "krillolie", label: "Krillolie", desc: "Fosfolipid-bundet omega-3" },
      { slug: "vegansk-omega-3", label: "Vegansk omega-3", desc: "Algeolie med DHA og EPA" },
      { slug: "mct-olie", label: "MCT-olie", desc: "Mellemkædede fedtsyrer" },
      { slug: "kokosolie", label: "Kokosolie", desc: "Laurinsyre og MCT" },
    ],
  },
  {
    silo: "sundhed-velvaere",
    label: "Sundhed & Velvære",
    href: "/sundhed-velvaere",
    description:
      "Probiotika, kollagen, ashwagandha, gurkmeje og tilskud til led, hud, fordøjelse og generel sundhed.",
    categories: [
      { slug: "probiotika", label: "Probiotika", desc: "Stammer, CFU og dokumentation" },
      { slug: "kollagenpulver", label: "Kollagen", desc: "Type I, II og III" },
      { slug: "ashwagandha", label: "Ashwagandha", desc: "KSM-66 og Sensoril" },
      { slug: "gurkmeje", label: "Gurkemeje", desc: "Curcumin og biotilgængelighed" },
      { slug: "q10", label: "Q10", desc: "Ubiquinon og ubiquinol" },
      { slug: "lions-mane", label: "Lion's Mane", desc: "Kognitiv funktion og nerve" },
      { slug: "kosttilskud-til-led", label: "Ledtilskud", desc: "Glucosamin, chondroitin og MSM" },
      { slug: "maelkesyrebakterier", label: "Mælkesyrebakterier", desc: "Lactobacillus og Bifidobacterium" },
    ],
  },
]

const FAQ_ITEMS = [
  {
    question: "Er kosttilskud nødvendige for raske voksne?",
    answer:
      "For de fleste raske voksne med en varieret kost er kosttilskud ikke nødvendige. Fødevarestyrelsen anbefaler dog D-vitamintilskud (fra oktober til april) til alle danskere, og specifikke grupper som gravide, vegetarer og ældre kan have behov for yderligere tilskud. Tal altid med din læge, hvis du er i tvivl.",
  },
  {
    question: "Hvordan scorer I produkter på Kosttilskudsvalg?",
    answer:
      "Vi bruger en fast scoringsmodel (0–5) med fem vægtede kriterier: aktive ingredienser og dosering (30 %), dokumentation og evidens (25 %), pris pr. dagsdosis (20 %), renhed og tilsætningsstoffer (15 %) samt biotilgængelighed og form (10 %). Alle kriterier og vægte er offentligt tilgængelige i vores metodik.",
  },
  {
    question: "Hvad er forskellen på pris pr. pakning og pris pr. dagsdosis?",
    answer:
      "Pakkeprisen siger kun, hvad produktet koster ved kassen. Pris pr. dagsdosis beregner, hvad du reelt betaler pr. dag for den anbefalede dosis. Et produkt til 99 kr. med lav dosis kan koste mere pr. dag end et til 199 kr. med høj dosis. Vi beregner altid pris pr. dagsdosis, så du kan sammenligne reelt.",
  },
  {
    question: "Kan kosttilskud erstatte medicin?",
    answer:
      "Nej. Kosttilskud er ikke erstatning for medicin eller medicinsk rådgivning. EU's fødevareforordning (EC 1924/2006) forbyder sundhedspåstande, der antyder, at kosttilskud kan forebygge, behandle eller kurere sygdomme. Tal altid med din læge, inden du ændrer din behandling.",
  },
  {
    question: "Hvad betyder biotilgængelighed?",
    answer:
      "Biotilgængelighed beskriver, hvor stor en del af det aktive stof kroppen reelt optager og kan bruge. F.eks. har magnesiumcitrat højere biotilgængelighed end magnesiumoxid, og D3 (cholecalciferol) optages bedre end D2 (ergocalciferol). Vi vurderer altid biotilgængelighed som en del af vores analyse.",
  },
  {
    question: "Hvad er tredjepartstest, og hvorfor er det vigtigt?",
    answer:
      "Tredjepartstest betyder, at et uafhængigt laboratorium har verificeret, at produktet indeholder det, der står på etiketten, og ikke er forurenet med tungmetaller, pesticider eller andre uønskede stoffer. Certifikater som NSF Certified for Sport, Informed Sport og GMP er anerkendte kvalitetstjek.",
  },
  {
    question: "Tjener Kosttilskudsvalg penge på anbefalinger?",
    answer:
      "Vi finansieres primært via affiliatelinks. Men vurderingerne fastlægges, inden links tilføjes, og ingen producent kan betale for en bedre score. Vores redaktionelle proces er adskilt fra den kommercielle del. Læs vores fulde affiliatepolitik for detaljer.",
  },
  {
    question: "Hvor ofte opdateres analyserne?",
    answer:
      "Vi gennemgår priser kvartalsvis og opdaterer produktlister, når nye væsentlige produkter lanceres eller formuleringer ændres. Alle ændringer dokumenteres i opdateringsloggen på den enkelte side med dato og beskrivelse, så du altid ved, hvornår indholdet sidst er gennemgået.",
  },
  {
    question: "Hvilke grupper bør være ekstra forsigtige med kosttilskud?",
    answer:
      "Gravide, ammende, børn under 12 år, personer med kroniske sygdomme og personer, der tager blodfortyndende medicin eller andre receptpligtige præparater, bør altid konsultere en læge, inden de starter på et kosttilskud. Visse tilskud kan interagere med medicin eller være kontraindiceret.",
  },
  {
    question: "Hvad er EFSA, og hvorfor refererer I til dem?",
    answer:
      "EFSA (European Food Safety Authority) er EU's uafhængige fødevaresikkerhedsmyndighed. EFSA evaluerer sundhedspåstande for kosttilskud og fastsætter øvre tolerable grænser for vitaminer og mineraler. Vi bruger EFSA's vurderinger som en central kilde til evidens i vores analyser.",
  },
]

const EXTERNAL_SOURCES = [
  {
    label: "EFSA – Tolerable Upper Intake Levels",
    href: "https://www.efsa.europa.eu/en/topics/topic/dietary-reference-values",
    desc: "EU's grænseværdier for vitaminer og mineraler",
  },
  {
    label: "Fødevarestyrelsen – Kosttilskud",
    href: "https://foedevarestyrelsen.dk/kost-og-foedevarer/kosttilskud",
    desc: "Danske regler og anbefalinger",
  },
  {
    label: "EU-forordning 1924/2006 – Sundhedspåstande",
    href: "https://eur-lex.europa.eu/legal-content/DA/TXT/?uri=celex%3A32006R1924",
    desc: "Lovgivning om sundhedspåstande på fødevarer",
  },
  {
    label: "Nordic Nutrition Recommendations 2023",
    href: "https://pub.norden.org/nord2023-003/",
    desc: "Nordiske anbefalinger for næringsstoffer",
  },
  {
    label: "Examine.com – Supplement Guides",
    href: "https://examine.com/supplements/",
    desc: "Uafhængig evidensdatabase for kosttilskud",
  },
]

export default function KosttilskudHubPage() {
  return (
    <>
      {/* ─── HERO ─── */}
      <section className="relative overflow-hidden border-b border-slate-200 bg-gradient-to-br from-green-50 via-white to-slate-50">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(34,197,94,0.08),transparent)]" />
        <div className="relative mx-auto w-full max-w-5xl px-4 pb-10 pt-6 sm:px-6 sm:pb-14 sm:pt-8 lg:px-8">
          <Breadcrumbs items={[{ name: "Kosttilskud", href: "/kosttilskud" }]} />

          <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl lg:text-[2.75rem] lg:leading-tight">
            Kosttilskud: uafhængige analyser og sammenligninger
          </h1>

          <p className="mt-4 max-w-2xl text-base leading-relaxed text-slate-600 sm:text-lg">
            Markedet for kosttilskud i Danmark omsætter for over{" "}
            <strong className="text-slate-800">3 milliarder kroner årligt</strong>, og udvalget er
            enormt. Men kvaliteten varierer markant &ndash; fra klinisk doserede produkter med
            tredjepartstest til underdoserede produkter med tomme marketingpåstande.
          </p>
          <p className="mt-3 max-w-2xl text-base leading-relaxed text-slate-600">
            På Kosttilskudsvalg analyserer vi hvert produkt ud fra en{" "}
            <Link href="/metodik" className="font-medium text-green-700 underline decoration-green-300 underline-offset-2 hover:text-green-800">
              fast, transparent metodik
            </Link>{" "}
            med fem vægtede kriterier. Alt indhold skrives af{" "}
            <Link href="/redaktion" className="font-medium text-green-700 underline decoration-green-300 underline-offset-2 hover:text-green-800">
              ernæringsrådgivere
            </Link>{" "}
            og faktatjekkes af en klinisk diætist &ndash; og vi refererer udelukkende til{" "}
            <Link href="/kilder-og-faktacheck" className="font-medium text-green-700 underline decoration-green-300 underline-offset-2 hover:text-green-800">
              offentlige kilder og peer-reviewed forskning
            </Link>.
          </p>

          {/* Quick stats */}
          <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { value: "200+", label: "Produkter analyseret" },
              { value: "5", label: "Vægtede kriterier" },
              { value: "4", label: "Fagpersoner i redaktionen" },
              { value: "Kvartalsvis", label: "Prisopdatering" },
            ].map((stat) => (
              <div
                key={stat.label}
                className="rounded-xl border border-slate-200 bg-white/80 px-4 py-3 text-center shadow-sm backdrop-blur-sm"
              >
                <p className="text-xl font-bold text-green-700 sm:text-2xl">{stat.value}</p>
                <p className="mt-0.5 text-xs text-slate-500">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8">

        {/* ─── INTRODUKTION ─── */}
        <section className="max-w-3xl">
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">
            Hvad er kosttilskud &ndash; og hvem har gavn af dem?
          </h2>
          <div className="mt-4 space-y-4 text-base leading-relaxed text-slate-600">
            <p>
              Kosttilskud er koncentrerede kilder til næringsstoffer (vitaminer, mineraler,
              aminosyrer, fedtsyrer, urter m.fl.) i form af tabletter, kapsler, pulver eller
              væsker. De er reguleret af{" "}
              <a
                href="https://foedevarestyrelsen.dk/kost-og-foedevarer/kosttilskud"
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-green-700 underline decoration-green-300 underline-offset-2 hover:text-green-800"
              >
                Fødevarestyrelsen
              </a>{" "}
              og skal overholde EU&apos;s regler for ernærings- og sundhedspåstande (
              <a
                href="https://eur-lex.europa.eu/legal-content/DA/TXT/?uri=celex%3A32006R1924"
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-green-700 underline decoration-green-300 underline-offset-2 hover:text-green-800"
              >
                forordning 1924/2006
              </a>).
            </p>
            <p>
              For de fleste raske voksne med en varieret kost er kosttilskud ikke strengt
              nødvendige. Men der er veldokumenterede undtagelser:{" "}
              <strong className="text-slate-800">D-vitamin</strong> anbefales til alle danskere fra
              oktober til april (
              <a
                href="https://foedevarestyrelsen.dk/kost-og-foedevarer/saerlige-grupper/graviditet-og-amning/d-vitamin"
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-green-700 underline decoration-green-300 underline-offset-2 hover:text-green-800"
              >
                Fødevarestyrelsen
              </a>
              ), <strong className="text-slate-800">folinsyre</strong> anbefales til kvinder, der planlægger
              graviditet, og <strong className="text-slate-800">jern</strong> kan være relevant ved
              dokumenteret mangel.
            </p>
            <p>
              Udfordringen for forbrugeren er at skelne mellem produkter med reel evidens og
              produkter med store løfter, men manglende dokumentation. Det er netop dér, vores
              analyser kommer ind: vi gennemgår doseringer, sammenligner med{" "}
              <a
                href="https://www.efsa.europa.eu/en/topics/topic/dietary-reference-values"
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-green-700 underline decoration-green-300 underline-offset-2 hover:text-green-800"
              >
                EFSA&apos;s referenceværdier
              </a>{" "}
              og de{" "}
              <a
                href="https://pub.norden.org/nord2023-003/"
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-green-700 underline decoration-green-300 underline-offset-2 hover:text-green-800"
              >
                Nordiske Næringsstofanbefalinger (NNR 2023)
              </a>
              , og beregner den reelle pris pr. dagsdosis &ndash; ikke bare pakkeprisen.
            </p>
          </div>
        </section>

        {/* ─── SÅDAN VÆLGER DU ─── */}
        <section className="mt-14">
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">
            Sådan vælger du det rigtige kosttilskud: en trin-for-trin guide
          </h2>
          <p className="mt-2 max-w-2xl text-base text-slate-600">
            Vi gennemgår tusindvis af produkter hvert år. Her er de seks vigtigste spørgsmål, du
            bør stille, inden du køber &ndash; uanset om det er dit første tilskud eller dit
            tiende.
          </p>

          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <StepCard
              icon={CheckCircle2}
              step={1}
              title="Identificér dit behov"
              text="Har du en dokumenteret mangel? Har din læge anbefalet et specifikt tilskud? Start altid med årsagen, ikke produktet."
            />
            <StepCard
              icon={BookOpen}
              step={2}
              title="Tjek evidensen"
              text="Er der peer-reviewed studier eller EFSA-godkendte sundhedspåstande for den aktive ingrediens ved den pågældende dosis?"
            />
            <StepCard
              icon={BarChart3}
              step={3}
              title="Sammenlign pris pr. dagsdosis"
              text="Pakkeprisen er irrelevant. Et billigt produkt med lav dosis kan koste mere pr. effektiv portion end et dyrere alternativ."
            />
            <StepCard
              icon={FlaskConical}
              step={4}
              title="Vurdér formen og biotilgængelighed"
              text="Magnesiumcitrat vs. -oxid, D3 vs. D2, methylfolat vs. folinsyre – formen påvirker, hvor meget kroppen reelt optager."
            />
            <StepCard
              icon={Beaker}
              step={5}
              title="Tjek tilsætningsstoffer"
              text="Unødvendige fyldstoffer, titandioxid, kunstige sødemidler og allergener varierer markant mellem mærker."
            />
            <StepCard
              icon={ShieldCheck}
              step={6}
              title="Kig efter tredjepartstest"
              text="NSF Certified for Sport, Informed Sport og GMP-certificering sikrer, at indholdet matcher etiketten."
            />
          </div>

          <div className="mt-6 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
            <p className="text-sm leading-relaxed text-amber-900">
              <strong>Vigtigt:</strong> Kosttilskud er ikke medicin og kan ikke erstatte en varieret
              og balanceret kost. Tal altid med din læge, inden du starter på et nyt tilskud &ndash;
              særligt hvis du er gravid, ammer, tager medicin eller har kroniske sygdomme.
            </p>
          </div>
        </section>

        {/* ─── VOR METODIK (kort) ─── */}
        <section className="mt-14">
          <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-6 sm:p-8">
            <h2 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
              Vores analysemetodik i korte træk
            </h2>
            <p className="mt-2 max-w-2xl text-sm text-slate-600">
              Hvert produkt vurderes med en fast scoringsmodel (0–5). De fem kriterier og deres
              vægtning:
            </p>

            <div className="mt-5 space-y-3">
              <CriteriaBar label="Aktive ingredienser & dosering" weight={30} color="bg-green-500" />
              <CriteriaBar label="Dokumentation & evidens" weight={25} color="bg-emerald-500" />
              <CriteriaBar label="Pris pr. dagsdosis" weight={20} color="bg-teal-500" />
              <CriteriaBar label="Renhed & tilsætningsstoffer" weight={15} color="bg-cyan-500" />
              <CriteriaBar label="Biotilgængelighed & form" weight={10} color="bg-sky-500" />
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href="/metodik"
                className="inline-flex items-center gap-1.5 rounded-full bg-green-700 px-4 py-2 text-sm font-medium text-white transition hover:bg-green-800"
              >
                Læs fuld metodik
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
              <Link
                href="/kilder-og-faktacheck"
                className="inline-flex items-center gap-1.5 rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-green-300 hover:text-green-700"
              >
                Kildepolitik
              </Link>
              <Link
                href="/annoncer-og-affiliate"
                className="inline-flex items-center gap-1.5 rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-green-300 hover:text-green-700"
              >
                Affiliatepolitik
              </Link>
            </div>
          </div>
        </section>

        {/* ─── KATEGORIER (per silo) ─── */}
        <section className="mt-14">
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">
            Alle kategorier
          </h2>
          <p className="mt-2 max-w-2xl text-base text-slate-600">
            Vælg en kategori for at se vores analyse med topliste, scoringer, prissammenligning og
            ekspertkommentarer.
          </p>

          <div className="mt-8 space-y-10">
            {SILO_CATEGORIES.map((silo) => (
              <div key={silo.silo}>
                <div className="flex items-baseline justify-between">
                  <h3 className="text-lg font-bold text-slate-900">{silo.label}</h3>
                  <Link
                    href={silo.href}
                    className="text-sm font-medium text-green-700 hover:text-green-800 hover:underline"
                  >
                    Se alle i {silo.label.toLowerCase()} &rarr;
                  </Link>
                </div>
                <p className="mt-1 text-sm text-slate-500">{silo.description}</p>
                <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  {silo.categories.map((cat) => (
                    <Link
                      key={cat.slug}
                      href={`/${silo.silo}/${cat.slug}`}
                      className="group rounded-xl border border-slate-200 bg-white p-4 transition-all hover:border-green-300 hover:shadow-md"
                    >
                      <h4 className="text-sm font-semibold text-slate-900 group-hover:text-green-700">
                        {cat.label}
                      </h4>
                      <p className="mt-0.5 text-xs leading-relaxed text-slate-500">{cat.desc}</p>
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ─── HVAD VI IKKE GØR ─── */}
        <section className="mt-14 max-w-3xl">
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">
            Hvad vi ikke gør &ndash; og hvorfor det er vigtigt
          </h2>
          <div className="mt-4 space-y-4 text-base leading-relaxed text-slate-600">
            <p>
              I modsætning til mange anmeldelsessider, der blot kopierer producentens egne
              påstande, følger vi en streng redaktionel politik:
            </p>
            <ul className="ml-1 space-y-2">
              {[
                "Vi påstår aldrig, at vi har laboratorietestet produkter, medmindre det eksplicit er dokumenteret.",
                "Vi skriver aldrig medicinske påstande eller garanterer effekt.",
                "Vi tillader ikke, at producenter betaler for bedre placeringer eller scores.",
                "Vi offentliggør alle ændringer i opdateringsloggen, så du kan se, hvornår og hvorfor en vurdering er ændret.",
                "Vi referer altid til primære kilder: EFSA, NNR, Fødevarestyrelsen eller peer-reviewed forskning.",
              ].map((item) => (
                <li key={item} className="flex items-start gap-2.5">
                  <CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-green-600" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <p>
              Denne tilgang koster mere tid, men vi mener, at troværdighed &ndash; ikke
              indholdsvolumen &ndash; er det, der skaber reel værdi for dig som forbruger. Læs
              mere om vores{" "}
              <Link href="/redaktion" className="font-medium text-green-700 underline decoration-green-300 underline-offset-2 hover:text-green-800">
                redaktion
              </Link>{" "}
              og{" "}
              <Link href="/annoncer-og-affiliate" className="font-medium text-green-700 underline decoration-green-300 underline-offset-2 hover:text-green-800">
                affiliatepolitik
              </Link>.
            </p>
          </div>
        </section>

        {/* ─── GUIDER TEASER ─── */}
        <section className="mt-14">
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">
            Dybdegående guider
          </h2>
          <p className="mt-2 max-w-2xl text-base text-slate-600">
            Ønsker du at forstå et emne i dybden, før du vælger et produkt? Vores guider giver
            evidensbaseret baggrundsviden.
          </p>

          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { title: "Kosttilskud: hvad virker, og hvad virker ikke?", href: "/guider/kosttilskud-hvad-virker", cat: "Grundviden" },
              { title: "Protein: whey vs. vegansk – sådan vælger du", href: "/guider/protein-whey-vs-vegansk", cat: "Protein" },
              { title: "Vitaminer: D, B12, C – hvem har gavn?", href: "/guider/vitaminer-hvem-har-gavn", cat: "Vitaminer" },
              { title: "Omega-3: kvalitet, oxidation og doser", href: "/guider/omega-3-kvalitet-doser", cat: "Omega-3" },
              { title: "Probiotika: stammer, doser og evidens", href: "/guider/probiotika-guide", cat: "Sundhed" },
              { title: "Søvn og stress: magnesium, melatonin, L-theanin", href: "/guider/sovn-stress-tilskud", cat: "Sundhed" },
            ].map((g) => (
              <Link
                key={g.href}
                href={g.href}
                className="group rounded-xl border border-slate-200 bg-white p-5 transition-all hover:border-green-300 hover:shadow-md"
              >
                <span className="text-[11px] font-semibold uppercase tracking-wider text-green-700">{g.cat}</span>
                <h3 className="mt-1.5 text-sm font-semibold leading-snug text-slate-900 group-hover:text-green-800">
                  {g.title}
                </h3>
              </Link>
            ))}
          </div>

          <div className="mt-4">
            <Link
              href="/guider"
              className="inline-flex items-center gap-1 text-sm font-medium text-green-700 hover:text-green-800 hover:underline"
            >
              Se alle guider
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </section>

        {/* ─── EKSTERNE KILDER ─── */}
        <section className="mt-14">
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">
            Kilder og myndigheder vi refererer til
          </h2>
          <p className="mt-2 max-w-2xl text-base text-slate-600">
            Vores analyser bygger på offentligt tilgængelige kilder. Her er de vigtigste:
          </p>

          <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {EXTERNAL_SOURCES.map((src) => (
              <a
                key={src.href}
                href={src.href}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-4 transition-all hover:border-green-300 hover:shadow-md"
              >
                <ExternalLink className="mt-0.5 h-4 w-4 shrink-0 text-slate-400 group-hover:text-green-600" />
                <div>
                  <p className="text-sm font-medium text-slate-900 group-hover:text-green-700">{src.label}</p>
                  <p className="mt-0.5 text-xs text-slate-500">{src.desc}</p>
                </div>
              </a>
            ))}
          </div>
        </section>

        {/* ─── FAQ ─── */}
        <section className="mt-14">
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">
            Ofte stillede spørgsmål om kosttilskud
          </h2>
          <FAQ items={FAQ_ITEMS} />
        </section>

        {/* ─── EDITORIAL SIGNOFF ─── */}
        <EditorialSignoff
          author="line-kragelund"
          reviewer="mikkel-rasmussen"
          lastUpdated="Marts 2026"
        />
      </div>

      {/* ─── JSON-LD: WebPage + FAQPage ─── */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@graph": [
              {
                "@type": "WebPage",
                name: "Kosttilskud – Uafhængige analyser og sammenligninger",
                description:
                  "Find det rigtige kosttilskud med uafhængige analyser baseret på evidens, dosering og pris pr. dagsdosis.",
                url: "https://www.kosttilskudsvalg.dk/kosttilskud",
                isPartOf: {
                  "@type": "WebSite",
                  name: "Kosttilskudsvalg",
                  url: "https://www.kosttilskudsvalg.dk",
                },
                about: {
                  "@type": "Thing",
                  name: "Kosttilskud",
                  sameAs: "https://da.wikipedia.org/wiki/Kosttilskud",
                },
                author: {
                  "@type": "Person",
                  name: "Line Kragelund",
                  jobTitle: "Ernæringsrådgiver",
                },
                reviewedBy: {
                  "@type": "Person",
                  name: "Mikkel Rasmussen",
                  jobTitle: "Klinisk diætist",
                },
                dateModified: "2026-03-25",
              },
              {
                "@type": "FAQPage",
                mainEntity: FAQ_ITEMS.map((item) => ({
                  "@type": "Question",
                  name: item.question,
                  acceptedAnswer: {
                    "@type": "Answer",
                    text: item.answer,
                  },
                })),
              },
            ],
          }),
        }}
      />
    </>
  )
}

/* ─── Helper: Step Card ─── */
function StepCard({
  icon: Icon,
  step,
  title,
  text,
}: {
  icon: React.ComponentType<{ className?: string }>
  step: number
  title: string
  text: string
}) {
  return (
    <div className="relative rounded-xl border border-slate-200 bg-white p-5">
      <div className="mb-3 flex items-center gap-3">
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-green-100 text-xs font-bold text-green-700">
          {step}
        </span>
        <Icon className="h-4.5 w-4.5 text-green-600" />
      </div>
      <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
      <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{text}</p>
    </div>
  )
}

/* ─── Helper: Criteria Bar ─── */
function CriteriaBar({
  label,
  weight,
  color,
}: {
  label: string
  weight: number
  color: string
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="w-56 shrink-0 text-sm font-medium text-slate-700 sm:w-64">{label}</span>
      <div className="relative h-4 flex-1 overflow-hidden rounded-full bg-slate-100">
        <div
          className={`absolute inset-y-0 left-0 rounded-full ${color}`}
          style={{ width: `${weight * 3.33}%` }}
        />
      </div>
      <span className="w-10 text-right text-sm font-semibold text-slate-800">{weight} %</span>
    </div>
  )
}
