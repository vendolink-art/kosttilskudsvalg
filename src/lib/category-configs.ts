/**
 * Category-level content configuration for supplement/fitness/health categories.
 * Used by rebuild-category-pages.ts to generate rich MDX sections.
 *
 * Each config provides data for:
 * - Decision map (interactive product picker)
 * - Measurement points (what we test)
 * - Test steps (our process)
 * - Test scenarios (how we test)
 * - Consumer profiles (target audiences)
 * - Common mistakes
 * - Supplement stacking (synergies)
 * - Dosage guide
 */

// ─── DECISION MAP TEMPLATES ─────────────────────────────────
export interface DecisionNode {
  question: string
  options: { label: string; next?: string; recommendation?: string; anchor?: string }[]
}

export type DecisionMapConfig = Record<string, DecisionNode>

type DecisionProduct = {
  name: string
  slug: string
  price: string
  rating: number
  note?: string
  comparisonValue?: string
}

// ─── MEASUREMENT POINTS ─────────────────────────────────────
export interface MeasurementPointConfig {
  label: string
  description: string
  weight: number
  icon: string
}

// ─── TEST STEPS ─────────────────────────────────────────────
export interface TestStepConfig {
  step: number
  title: string
  description: string
  duration?: string
}

// ─── TEST SCENARIOS ─────────────────────────────────────────
export interface TestScenarioConfig {
  title: string
  description: string
  what: string
  why: string
  icon: string
}

// ─── CONSUMER PROFILES ──────────────────────────────────────
export interface ConsumerProfileConfig {
  name: string
  icon: string
  description: string
  priority: string[]
}

// ─── COMMON MISTAKES ────────────────────────────────────────
export interface MistakeConfig {
  mistake: string
  consequence: string
  solution: string
}

// ─── STACKING ───────────────────────────────────────────────
export interface StackConfig {
  supplements: string[]
  benefit: string
  timing?: string
}

// ─── FULL CATEGORY CONFIG ───────────────────────────────────
export interface CategoryContentConfig {
  measurementPoints: MeasurementPointConfig[]
  testSteps: TestStepConfig[]
  testScenarios: TestScenarioConfig[]
  consumerProfiles: ConsumerProfileConfig[]
  commonMistakes: MistakeConfig[]
  supplementStacking: StackConfig[]
  stackingWarnings?: string[]
}

// ─── DEFAULT CONFIG (used when no category-specific config exists) ───
const DEFAULT_CONFIG: CategoryContentConfig = {
  measurementPoints: [
    { label: "Ingredienskvalitet", description: "Renhed, biotilgængelighed og form af aktive ingredienser", weight: 30, icon: "🧪" },
    { label: "Dosering", description: "Korrekt dosering i forhold til videnskabelige anbefalinger", weight: 25, icon: "⚖️" },
    { label: "Pris & værdi", description: "Pris per dagsdosis og samlet værdi for pengene", weight: 20, icon: "💰" },
    { label: "Renhed & sikkerhed", description: "Fravær af tilsætningsstoffer, allergener og urenheder", weight: 15, icon: "🛡️" },
    { label: "Brugeroplevelse", description: "Smag, opløselighed, slugning og daglig brugervenlighed", weight: 10, icon: "👤" },
  ],
  testSteps: [
    { step: 1, title: "Indkøb & modtagelse", description: "Vi køber alle produkter anonymt via officielle forhandlere – ingen sponsorerede prøver.", duration: "1-3 dage" },
    { step: 2, title: "Ingrediensanalyse", description: "Gennemgang af indholdsliste, aktive ingredienser, doseringsform og eventuelle tilsætningsstoffer.", duration: "2-4 timer" },
    { step: 3, title: "Doseringscheck", description: "Sammenligning af deklareret dosering med videnskabelige anbefalinger og studier.", duration: "1-2 timer" },
    { step: 4, title: "Brugervurdering", description: "Test af smag, opløselighed, konsistens og daglig brugervenlighed over minimum 2 uger.", duration: "14+ dage" },
    { step: 5, title: "Prissammenligning", description: "Beregning af pris per portion og sammenligning med markedet.", duration: "1 time" },
    { step: 6, title: "Samlet vurdering", description: "Vægtning af alle faktorer til en samlet score baseret på vores kriterier.", duration: "2-3 timer" },
  ],
  testScenarios: [
    { title: "Daglig brug", description: "Simulering af typisk dagligt forbrug over 2+ uger", what: "Opløselighed, smag og brugervenlighed i hverdagen", why: "De fleste brugere tager tilskud dagligt – det skal fungere i praksis", icon: "☀️" },
    { title: "Ingrediensverifikation", description: "Kontrol af deklarerede ingredienser mod uafhængige kilder", what: "Sammenligning med certifikater og tredjepartsanalyser", why: "Sikrer at produktet indeholder hvad det lover", icon: "🔬" },
    { title: "Prisværdi-analyse", description: "Beregning af reel værdi per aktiv ingrediens", what: "Pris per mg aktiv ingrediens, ikke bare per portion", why: "Giver retfærdigt sammenligningsgrundlag på tværs af produkter", icon: "📊" },
  ],
  consumerProfiles: [
    { name: "Motionisten", icon: "🏃", description: "Træner regelmæssigt og ønsker at optimere restitution og ydeevne", priority: ["Dosering", "Kvalitet", "Biotilgængelighed"] },
    { name: "Sundhedsbevidste", icon: "🥗", description: "Fokuserer på generelt helbred og forebyggelse", priority: ["Renhed", "Ingredienser", "Sikkerhed"] },
    { name: "Budgetbevidste", icon: "💵", description: "Vil have mest mulig værdi for pengene", priority: ["Pris/portion", "Antal portioner", "Værdi"] },
    { name: "Senioren", icon: "👴", description: "Fokus på led, knogler og generelt velvære", priority: ["Evidens", "Sikkerhed", "Kvalitet"] },
  ],
  commonMistakes: [
    { mistake: "Tager tilskuddet på tom mave", consequence: "Dårligere absorption og mulig maveirritation", solution: "Tag med et måltid medmindre produktet siger andet" },
    { mistake: "Underdosering", consequence: "Ingen mærkbar effekt trods daglig brug", solution: "Følg anbefalingen eller tjek videnskabelige doser" },
    { mistake: "Blander uforligelige tilskud", consequence: "Hæmmet absorption (f.eks. jern + calcium)", solution: "Tag med minimum 2 timers mellemrum" },
    { mistake: "Forventer resultater efter få dage", consequence: "Stopper for tidligt og går glip af effekten", solution: "Giv det minimum 4-8 uger ved daglig brug" },
  ],
  supplementStacking: [
    { supplements: ["D-vitamin", "K2-vitamin"], benefit: "D-vitamin øger calciumoptagelsen, K2 sikrer det deponeres i knoglerne", timing: "Tag sammen med fedtholdigt måltid" },
    { supplements: ["Kollagen", "C-vitamin"], benefit: "C-vitamin er nødvendigt for kroppens kollagendannelse", timing: "Tag sammen" },
    { supplements: ["Jern", "C-vitamin"], benefit: "C-vitamin øger jernabsorptionen markant", timing: "Tag C-vitamin sammen med jerntilskud" },
  ],
  stackingWarnings: [
    "Jern og calcium – tag med mindst 2 timers mellemrum",
    "Zink og kobber – høje doser af zink hæmmer kobberoptagelsen",
    "D-vitamin og magnesium – magnesium er nødvendig for D-vitamin aktivering, men overdreven magnesium kan give mavebesvær",
  ],
}

// ─── CATEGORY-SPECIFIC OVERRIDES ────────────────────────────
const CATEGORY_OVERRIDES: Record<string, Partial<CategoryContentConfig>> = {
  proteinpulver: {
    measurementPoints: [
      { label: "Proteinindhold", description: "Gram protein per portion og proteinkvalitet (aminosyreprofil)", weight: 30, icon: "💪" },
      { label: "Smag & opløselighed", description: "Smag, konsistens og hvor let det blandes", weight: 25, icon: "🥤" },
      { label: "Pris per portion", description: "Pris per 25g protein og samlet pakkeværdi", weight: 20, icon: "💰" },
      { label: "Renhed", description: "Fravær af fyldstoffer, kunstige sødestoffer og allergener", weight: 15, icon: "🛡️" },
      { label: "Næringsværdi", description: "Fedt, kulhydrat og kalorieindhold per portion", weight: 10, icon: "📊" },
    ],
    commonMistakes: [
      { mistake: "For meget protein per dag", consequence: "Overskydende udskilles og belaster nyrerne unødigt", solution: "1,6-2,2g/kg kropsvægt er nok for de fleste motionister" },
      { mistake: "Erstatter måltider med shakes", consequence: "Mangler fiber, vitaminer og mineraler fra rigtig mad", solution: "Brug som supplement, ikke erstatning for måltider" },
      { mistake: "Blander med kogende vand", consequence: "Proteinet denaturerer og klumper", solution: "Brug koldt eller lunkent vand/mælk" },
      { mistake: "Vælger kun på smag", consequence: "Kan ende med dårlig proteinkvalitet eller mange tilsætningsstoffer", solution: "Tjek aminosyreprofil og ingrediensliste først" },
    ],
  },
  kollagenpulver: {
    commonMistakes: [
      { mistake: "Tager for lav dosis", consequence: "Under 5g/dag giver sjældent mærkbar effekt", solution: "Sigt efter 5-10g dagligt for hud- og ledeffekt" },
      { mistake: "Forventer resultater efter 1 uge", consequence: "Kollagen kræver tid for at integreres i vævet", solution: "Giv det minimum 8-12 uger daglig brug" },
      { mistake: "Glemmer C-vitamin", consequence: "Kroppen kan ikke danne kollagen uden C-vitamin", solution: "Vælg kollagen med tilsat C-vitamin eller tag det separat" },
      { mistake: "Blander med meget varm drik", consequence: "Kan nedbryde kollagenpeptiderne", solution: "Tilsæt i lunkent vand eller kold smoothie" },
    ],
    supplementStacking: [
      { supplements: ["Kollagen", "C-vitamin"], benefit: "C-vitamin er essentiel cofaktor for kollagensyntese", timing: "Tag sammen" },
      { supplements: ["Kollagen", "Hyaluronsyre"], benefit: "Synergi for hudens fugt og elasticitet", timing: "Tag sammen med et måltid" },
      { supplements: ["Kollagen", "D-vitamin + K2"], benefit: "Kollagen for brusk + D3/K2 for knogler = komplet ledstøtte" },
    ],
  },
  kreatin: {
    commonMistakes: [
      { mistake: "Springer loading-fase over med utålmodighed", consequence: "Tager 4-6 uger at opnå fuldt kreatin-depot", solution: "Enten 20g/dag i 5 dage (loading) eller 3-5g/dag tålmodigt" },
      { mistake: "Drikker for lidt vand", consequence: "Kreatin trækker vand ind i musklerne – dehydrering kan opstå", solution: "Drik mindst 2-3 liter vand dagligt" },
      { mistake: "Vælger fancy kreatin-former", consequence: "Dyrere uden dokumenteret ekstra effekt", solution: "Kreatin monohydrat er billigst og bedst dokumenteret" },
    ],
  },
}

/** Get the full config for a category, merging overrides with defaults */
export function getCategoryContentConfig(categorySlug: string): CategoryContentConfig {
  const override = CATEGORY_OVERRIDES[categorySlug]
  if (!override) return DEFAULT_CONFIG
  return {
    ...DEFAULT_CONFIG,
    ...override,
  }
}

function parseNumber(value: string | undefined): number | null {
  if (!value) return null
  const cleaned = value.replace(/\./g, "").replace(",", ".")
  const m = cleaned.match(/(\d+(?:\.\d+)?)/)
  if (!m) return null
  const n = Number(m[1])
  return Number.isFinite(n) ? n : null
}

function pickDistinct(primary: DecisionProduct | undefined, fallback: DecisionProduct | undefined, disallowSlug?: string) {
  if (primary && primary.slug !== disallowSlug) return primary
  if (fallback && fallback.slug !== disallowSlug) return fallback
  return primary || fallback
}

function recommendationText(product: DecisionProduct | undefined, reason: string): string {
  if (!product) return "Ingen tydelig anbefaling fundet – se topplaceringerne ovenfor."
  const note = product.note ? ` • ${product.note}` : ""
  return `${product.name} (${product.rating.toFixed(1)}/10${note}) – ${reason}`
}

/** Build an actionable decision map per category */
export function buildDecisionMap(
  categoryName: string,
  products: DecisionProduct[],
  context?: { categorySlug?: string; comparisonMetricLabel?: string },
): DecisionMapConfig {
  const sorted = [...products].sort((a, b) => b.rating - a.rating)
  const best = sorted[0]

  const byPrice = [...products]
    .map((p) => ({ p, v: parseNumber(p.price) }))
    .filter((x): x is { p: DecisionProduct; v: number } => x.v != null)
    .sort((a, b) => a.v - b.v)
    .map((x) => x.p)
  const cheapest = byPrice[0]

  const metricLabel = context?.comparisonMetricLabel || "Pris"
  const byMetric = [...products]
    .map((p) => ({ p, v: parseNumber(p.comparisonValue) }))
    .filter((x): x is { p: DecisionProduct; v: number } => x.v != null)
    .sort((a, b) => a.v - b.v)
    .map((x) => x.p)

  const metricCheapest = byMetric[0]
  const lowPricePool = byPrice.length >= 3 ? byPrice.slice(0, Math.ceil(byPrice.length * 0.6)) : byPrice
  const bestBudget = lowPricePool.slice().sort((a, b) => b.rating - a.rating)[0]

  const premiumFromNote = sorted.find((p) => /premium/i.test(p.note || ""))
  const premiumByPrice = byPrice.length > 0 ? byPrice[byPrice.length - 1] : undefined
  const premium = pickDistinct(premiumFromNote, premiumByPrice, best?.slug)

  const purityCandidate =
    sorted.find((p) => /(vegansk|laktosefri|sukkerfri|koffeinfri|renhed)/i.test(p.note || "")) ||
    sorted.find((p) => p.slug !== best?.slug) ||
    best

  const dailyCandidate =
    sorted.find((p) => /værdi|kvalitet til prisen|stærkt kvalitetsvalg/i.test(p.note || "")) ||
    bestBudget ||
    sorted[1] ||
    best

  const evidenceTop = best
  const evidenceSteady = sorted.find((p) => p.slug !== evidenceTop?.slug) || evidenceTop

  const categoryHint = context?.categorySlug && /(omega|krill|fiskeolie)/i.test(context.categorySlug)
    ? "med fokus på EPA/DHA, optagelighed og renhed"
    : "med fokus på dokumenteret effekt, kvalitet og daglig brug"

  return {
    start: {
      question: `Hvad er vigtigst for dig i et ${categoryName}?`,
      options: [
        { label: "🏆 Højeste samlede kvalitet", next: "quality" },
        { label: "💰 Mest værdi for pengene", next: "budget" },
        { label: "🌿 Ren profil og færre kompromiser", next: "purity" },
        { label: "⚡ Maksimal dokumenteret effekt", next: "effect" },
      ],
    },
    quality: {
      question: `Vil du gå efter topresultatet eller et stærkt premium-alternativ ${categoryHint}?`,
      options: [
        {
          label: "🥇 Giv mig den stærkeste totalvinder",
          recommendation: recommendationText(evidenceTop, "bedste samlede testresultat i kategorien."),
          anchor: evidenceTop ? `#product-${evidenceTop.slug}` : undefined,
        },
        {
          label: "✨ Jeg vil hellere have et premiumvalg",
          recommendation: recommendationText(premium, "premium-profil med høj kvalitet og stærk placering."),
          anchor: premium ? `#product-${premium.slug}` : undefined,
        },
      ],
    },
    budget: {
      question: `Hvilken prisstrategi passer bedst: laveste ${metricLabel.toLowerCase()} eller bedst score i budgetfeltet?`,
      options: [
        {
          label: `📉 Laveste ${metricLabel.toLowerCase()}`,
          recommendation: recommendationText(metricCheapest || cheapest, `laveste målte ${metricLabel.toLowerCase()} i feltet.`),
          anchor: (metricCheapest || cheapest) ? `#product-${(metricCheapest || cheapest)!.slug}` : undefined,
        },
        {
          label: "⚖️ Bedst balance mellem pris og score",
          recommendation: recommendationText(bestBudget || dailyCandidate, "stærk kombination af prisniveau og testscore."),
          anchor: (bestBudget || dailyCandidate) ? `#product-${(bestBudget || dailyCandidate)!.slug}` : undefined,
        },
      ],
    },
    purity: {
      question: "Har du specifikke krav til indhold eller tolerabilitet?",
      options: [
        {
          label: "🌱 Ja, jeg prioriterer ren/vegansk/fri-for profil",
          recommendation: recommendationText(purityCandidate, "fremhævet for renere eller mere målrettet profil."),
          anchor: purityCandidate ? `#product-${purityCandidate.slug}` : undefined,
        },
        {
          label: "👌 Nej, jeg vil bare have et stabilt dagligt valg",
          recommendation: recommendationText(dailyCandidate, "solid allround-løsning til daglig brug."),
          anchor: dailyCandidate ? `#product-${dailyCandidate.slug}` : undefined,
        },
      ],
    },
    effect: {
      question: "Vil du prioritere maksimal top-effekt eller et mere stabilt allround-valg?",
      options: [
        {
          label: "🚀 Maksimal effekt",
          recommendation: recommendationText(evidenceTop, "højeste samlede performance i testen."),
          anchor: evidenceTop ? `#product-${evidenceTop.slug}` : undefined,
        },
        {
          label: "🛡️ Stabil effekt + høj brugervenlighed",
          recommendation: recommendationText(evidenceSteady, "stærk score med mere balanceret hverdagsprofil."),
          anchor: evidenceSteady ? `#product-${evidenceSteady.slug}` : undefined,
        },
      ],
    },
  }
}
