import { Breadcrumbs } from "@/components/breadcrumbs"
import Link from "next/link"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Metodik – Sådan vurderer vi kosttilskud",
  description: "Vores metodik forklaret: kriterier, vægtning, kilder, scoring og opdateringspolitik. Transparens om hvordan vi analyserer og sammenligner kosttilskud.",
  alternates: { canonical: "https://www.kosttilskudsvalg.dk/metodik" },
  openGraph: {
    title: "Metodik – Sådan vurderer vi kosttilskud",
    description: "Vores metodik forklaret: kriterier, vægtning, kilder, scoring og opdateringspolitik.",
    url: "https://www.kosttilskudsvalg.dk/metodik",
    type: "website",
    locale: "da_DK",
    siteName: "Kosttilskudsvalg",
  },
}

export default function MetodikPage() {
  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      
      {/* Hero Banner */}
      <div className="relative rounded-3xl overflow-hidden mb-12 shadow-lg">
        {/* Background Gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900"></div>
        
        {/* Decorative elements (optional subtle glow) */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
          <div className="absolute -top-[25%] -left-[10%] w-[50%] h-[50%] rounded-full bg-blue-500/20 blur-[80px]"></div>
          <div className="absolute bottom-[10%] -right-[10%] w-[40%] h-[40%] rounded-full bg-indigo-500/20 blur-[80px]"></div>
        </div>

        {/* Content */}
        <div className="relative p-8 md:p-12 lg:p-16">
          <div className="mb-8">
            <Breadcrumbs items={[{ name: "Metodik", href: "/metodik" }]} variant="dark" />
          </div>

          <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight text-white mb-6">
            Sådan vurderer vi kosttilskud
          </h1>
          <p className="text-lg md:text-xl text-slate-300 leading-relaxed max-w-3xl">
            Vores mål er at give danske forbrugere et <strong className="text-white">100 % gennemsigtigt</strong> og videnskabeligt funderet grundlag for at vælge kosttilskud. Her kan du læse præcis, hvordan vores redaktionelle proces fungerer, fra udvælgelse til endelig score.
          </p>
        </div>
      </div>

      <div className="space-y-12">
        {/* 1. Produktudvælgelse */}
        <section className="scroll-mt-24">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-blue-50 text-blue-600">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-slate-900">1. Produktudvælgelse</h2>
          </div>
          <div className="bg-white rounded-2xl border border-slate-200 p-6 md:p-8 shadow-sm">
            <p className="text-slate-600 mb-6">
              Vi fokuserer udelukkende på produkter, der er let tilgængelige for danske forbrugere via etablerede webshops og fysiske butikker. Vores udvælgelse baseres på en datadrevet tilgang:
            </p>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="flex items-start gap-3">
                <svg className="w-5 h-5 text-green-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                <div>
                  <strong className="text-slate-900 block">Markedstilgængelighed</strong>
                  <span className="text-sm text-slate-600">Produktet skal kunne købes lovligt og nemt i Danmark.</span>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <svg className="w-5 h-5 text-green-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                <div>
                  <strong className="text-slate-900 block">Prisinterval</strong>
                  <span className="text-sm text-slate-600">Vi dækker alt fra budget og mellempris til premium for at give et retvisende billede.</span>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <svg className="w-5 h-5 text-green-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                <div>
                  <strong className="text-slate-900 block">Popularitet & trends</strong>
                  <span className="text-sm text-slate-600">Vi prioriterer produkter med høj søgevolumen og stor forbrugerinteresse.</span>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <svg className="w-5 h-5 text-green-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                <div>
                  <strong className="text-slate-900 block">Kategoribredde</strong>
                  <span className="text-sm text-slate-600">Vi bestræber os på at inkludere mindst 5-10 produkter pr. test for at sikre en solid sammenligning.</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 2. Analysekriterier */}
        <section className="scroll-mt-24">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-indigo-50 text-indigo-600">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-slate-900">2. Analysekriterier</h2>
          </div>
          <p className="text-slate-600 mb-6">
            Hvert produkt vurderes ud fra en fast, objektiv model. Selve vægtningen kan variere let afhængigt af kategorien (f.eks. vægtes smag højere for et PWO-pulver end for en zink-tablet), men grundpillerne er altid de samme:
          </p>
          <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-sm">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-4 font-bold text-slate-900">Kriterium</th>
                  <th className="px-6 py-4 font-bold text-slate-900">Hvad vi ser på</th>
                  <th className="px-6 py-4 font-bold text-slate-900 text-right whitespace-nowrap">Typisk vægt</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                <tr className="hover:bg-slate-50/50">
                  <td className="px-6 py-4 font-medium text-slate-900">Ingredienser & dosering</td>
                  <td className="px-6 py-4 text-slate-600">Aktiv ingrediens, klinisk relevant dosis pr. portion, biotilgængelighed.</td>
                  <td className="px-6 py-4 text-right font-medium text-slate-700 whitespace-nowrap">25–35%</td>
                </tr>
                <tr className="hover:bg-slate-50/50">
                  <td className="px-6 py-4 font-medium text-slate-900">Evidens & dokumentation</td>
                  <td className="px-6 py-4 text-slate-600">Støttes produktets påstande af kliniske studier og EFSA-godkendelser?</td>
                  <td className="px-6 py-4 text-right font-medium text-slate-700 whitespace-nowrap">20–25%</td>
                </tr>
                <tr className="hover:bg-slate-50/50">
                  <td className="px-6 py-4 font-medium text-slate-900">Pris pr. dagsdosis (Værdi)</td>
                  <td className="px-6 py-4 text-slate-600">Den reelle pris pr. effektiv portion, frem for blot pakkens totalpris.</td>
                  <td className="px-6 py-4 text-right font-medium text-slate-700 whitespace-nowrap">15–20%</td>
                </tr>
                <tr className="hover:bg-slate-50/50">
                  <td className="px-6 py-4 font-medium text-slate-900">Renhed & tilsætningsstoffer</td>
                  <td className="px-6 py-4 text-slate-600">Mængden af unødvendige fyldstoffer, kunstige sødemidler og allergener.</td>
                  <td className="px-6 py-4 text-right font-medium text-slate-700 whitespace-nowrap">10–15%</td>
                </tr>
                <tr className="hover:bg-slate-50/50">
                  <td className="px-6 py-4 font-medium text-slate-900">Brugervenlighed & smag</td>
                  <td className="px-6 py-4 text-slate-600">Er pillen nem at sluge? Blander pulveret godt? Smager det kunstigt?</td>
                  <td className="px-6 py-4 text-right font-medium text-slate-700 whitespace-nowrap">10%</td>
                </tr>
                <tr className="hover:bg-slate-50/50">
                  <td className="px-6 py-4 font-medium text-slate-900">Kundeoplevelser & certificering</td>
                  <td className="px-6 py-4 text-slate-600">Verificerede brugeranmeldelser på tværs af platforme og evt. tredjepartstests (GMP, Informed Sport).</td>
                  <td className="px-6 py-4 text-right font-medium text-slate-700 whitespace-nowrap">5–10%</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* 3. Scoring */}
        <section className="scroll-mt-24">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-emerald-50 text-emerald-600">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-slate-900">3. Scoring (0–10)</h2>
          </div>
          <div className="bg-white rounded-2xl border border-slate-200 p-6 md:p-8 shadow-sm">
            <p className="text-slate-600 mb-8">
              Når al data er indsamlet, får hvert kriterium en score på en skala fra 0 til 10. Den samlede score er et vægtet gennemsnit af disse, hvilket giver en utrolig præcis og retfærdig rangering. Vi benytter decimaler (f.eks. 8,3) for bedre at kunne adskille produkter, der ligger tæt.
            </p>
            
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="flex items-start gap-4 p-4 rounded-xl border border-slate-100 bg-slate-50">
                <div className="w-14 h-14 rounded-lg bg-green-100 text-green-700 font-bold flex items-center justify-center text-lg shrink-0">9-10</div>
                <div>
                  <h3 className="font-bold text-slate-900 mb-1">Fremragende</h3>
                  <p className="text-sm text-slate-600">Topklasse i kategorien. Et produkt der leverer på alle fronter: indhold, pris og kvalitet.</p>
                </div>
              </div>
              <div className="flex items-start gap-4 p-4 rounded-xl border border-slate-100 bg-slate-50">
                <div className="w-14 h-14 rounded-lg bg-emerald-100 text-emerald-700 font-bold flex items-center justify-center text-lg shrink-0">7-8.9</div>
                <div>
                  <h3 className="font-bold text-slate-900 mb-1">God</h3>
                  <p className="text-sm text-slate-600">Et solidt og sikkert valg, som vil være det helt rigtige for de langt de fleste.</p>
                </div>
              </div>
              <div className="flex items-start gap-4 p-4 rounded-xl border border-slate-100 bg-slate-50">
                <div className="w-14 h-14 rounded-lg bg-amber-100 text-amber-700 font-bold flex items-center justify-center text-lg shrink-0">5-6.9</div>
                <div>
                  <h3 className="font-bold text-slate-900 mb-1">Middel</h3>
                  <p className="text-sm text-slate-600">Produktet fejler ikke nødvendigvis noget, men der findes oftest bedre eller billigere alternativer.</p>
                </div>
              </div>
              <div className="flex items-start gap-4 p-4 rounded-xl border border-slate-100 bg-slate-50">
                <div className="w-14 h-14 rounded-lg bg-red-100 text-red-700 font-bold flex items-center justify-center text-lg shrink-0">&lt;5</div>
                <div>
                  <h3 className="font-bold text-slate-900 mb-1">Svag</h3>
                  <p className="text-sm text-slate-600">Produktet lever ikke op til vores standarder (typisk pga. vildledende dosering, overpris eller dårlig kvalitet) og frarådes.</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 4. Kilder */}
        <section className="scroll-mt-24">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-amber-50 text-amber-600">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-slate-900">4. Kilder & Faktacheck</h2>
          </div>
          <div className="bg-white rounded-2xl border border-slate-200 p-6 md:p-8 shadow-sm prose prose-slate max-w-none prose-p:text-slate-600">
            <p>
              I en industri præget af marketing-hype er evidens vores stærkeste værktøj. Vi baserer vores konklusioner på et strengt kilde-hierarki. For en fuld gennemgang, se vores dedikerede <Link href="/kilder-og-faktacheck" className="text-green-700 hover:underline font-semibold">Kilder & faktacheck</Link> side.
            </p>
            <ol className="mt-4">
              <li><strong>Myndigheder:</strong> Fødevarestyrelsen, EFSA (Den Europæiske Fødevaresikkerhedsautoritet) og Sundhedsstyrelsen udgør vores absolutte fundament for sundhedsanprisninger.</li>
              <li><strong>Videnskab:</strong> Peer-reviewed kliniske studier, metaanalyser fra PubMed og uafhængige databaser som Examine.com bruges til at validere ingrediensers effekt.</li>
              <li><strong>Producentdata:</strong> Vi gransker produktetiketter for at afsløre "proprietære blends", tjekke den reelle dosering og finde evt. uønskede tilsætningsstoffer.</li>
              <li><strong>Forbrugerdata:</strong> Vi aggregerer tusindvis af verificerede brugeranmeldelser på tværs af nettet for at identificere tendenser omkring smag, maveproblemer og generel tilfredshed.</li>
            </ol>
          </div>
        </section>

        {/* 5. Opdateringer & Uafhængighed i grid */}
        <div className="grid md:grid-cols-2 gap-8">
          <section className="scroll-mt-24">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-purple-50 text-purple-600">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-slate-900">5. Opdateringspolitik</h2>
            </div>
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm h-full">
              <p className="text-slate-600 text-sm leading-relaxed">
                Kosttilskudsmarkedet ændrer sig hurtigt. Vi gennemgår priser løbende og foretager en større revision af vores toplister mindst hvert kvartal, eller når der sker markante ændringer (som fx når et produkt skifter formel, eller et spændende nyt produkt rammer markedet).
                <br /><br />
                Hver test har en tydelig <strong>"Opdateret"</strong>-dato og en synlig opdateringslog, så du altid ved, hvor frisk informationen er.
              </p>
            </div>
          </section>

          <section className="scroll-mt-24">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-rose-50 text-rose-600">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-slate-900">6. Vores Uafhængighed</h2>
            </div>
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm h-full">
              <p className="text-slate-600 text-sm leading-relaxed">
                <strong>Ingen producent, brand eller forhandler kan købe sig til en placering på vores toplister.</strong>
                <br /><br />
                Vores scores genereres ud fra vores analysemodel. Vi finansieres primært gennem <Link href="/annoncer-og-affiliate" className="text-green-700 hover:underline font-semibold">affiliate-links</Link>, men disse tilføjes først <em>efter</em> vurderingerne og placeringerne er låst. Det sikrer, at vores loyalitet altid ligger hos dig.
              </p>
            </div>
          </section>
        </div>

        {/* Disclaimer */}
        <section className="mt-12">
          <div className="bg-slate-50 rounded-2xl border border-slate-200 p-6 md:p-8">
            <div className="flex items-center gap-2 mb-2">
              <svg className="w-5 h-5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <h2 id="disclaimer" className="text-lg font-bold text-slate-900">Medicinsk disclaimer</h2>
            </div>
            <p className="text-sm text-slate-600">
              Indholdet på Kosttilskudsvalg er <strong>ikke</strong> medicinsk rådgivning. Kosttilskud er ikke en erstatning for en varieret og balanceret kost. Tal altid med din læge eller en autoriseret diætist, inden du starter på et nyt kosttilskud &ndash; særligt hvis du er gravid, ammer, tager medicin eller har kroniske sygdomme.
            </p>
          </div>
        </section>

      </div>
    </div>
  )
}
