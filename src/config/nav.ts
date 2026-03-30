// ─── NAVIGATION CONFIG ──────────────────────────────────────────
// 5 main silos med mega-menu dropdowns.
// ALLA kategorisidor finns med i dropdowns för intern länkstyrka.

export interface NavChild {
  label: string
  href: string
}

export interface NavGroup {
  heading: string
  items: NavChild[]
}

export interface NavSection {
  label: string
  href: string
  children?: NavChild[]
  groups?: NavGroup[]
  cta?: { label: string; href: string }
}

export const MAIN_SECTIONS: NavSection[] = [
  // ══════════════════════════════════════════════════
  // 1. PROTEIN & TRÆNING
  // ══════════════════════════════════════════════════
  {
    label: "Protein & Træning",
    href: "/protein-traening",
    groups: [
      {
        heading: "Proteintilskud",
        items: [
          { label: "Proteinpulver", href: "/protein-traening/proteinpulver" },
          { label: "Vegansk protein", href: "/protein-traening/vegansk-proteinpulver" },
          { label: "Kasein", href: "/protein-traening/kasein" },
          { label: "Weight Gainer", href: "/protein-traening/weight-gainer" },
          { label: "Proteinbarer", href: "/protein-traening/proteinbarer" },
          { label: "Veganske proteinbarer", href: "/protein-traening/veganske-proteinbarer" },
          { label: "Proteinbar lavt sukker", href: "/protein-traening/proteinbar-med-lavt-sukkerindhold" },
          { label: "Laktosefri protein", href: "/protein-traening/laktosefrit-proteinpulver" },
          { label: "Hamp-protein", href: "/protein-traening/hamp-protein" },
          { label: "Risprotein", href: "/protein-traening/risprotein" },
          { label: "Sojaprotein", href: "/protein-traening/sojaprotein" },
          { label: "Æggeprotein", href: "/protein-traening/aggeprotein" },
          { label: "Arteprotein", href: "/protein-traening/arteprotein" },
          { label: "Protein til restitution", href: "/protein-traening/proteinpulver-til-restitution" },
          { label: "Protein til vægttab", href: "/protein-traening/proteinpulver-til-vaegttab" },
          { label: "Protein uden sødestoffer", href: "/protein-traening/proteinpulver-uden-sodestoffer" },
          { label: "Protein uden tilsat sukker", href: "/protein-traening/proteinpulver-uden-tilsat-sukker" },
        ],
      },
      {
        heading: "Performance & Styrke",
        items: [
          { label: "Kreatin", href: "/protein-traening/kreatin" },
          { label: "Pre-workout", href: "/protein-traening/pre-workout" },
          { label: "PWO med koffein", href: "/protein-traening/pwo-med-koffein" },
          { label: "PWO med kreatin", href: "/protein-traening/pwo-med-kreatin" },
          { label: "Koffeinfri PWO", href: "/protein-traening/koffeinfri-pwo" },
          { label: "BCAA", href: "/protein-traening/bcaa" },
          { label: "EAA", href: "/protein-traening/eaa" },
          { label: "Beta-alanin", href: "/protein-traening/beta-alanin" },
          { label: "ZMA", href: "/protein-traening/zma" },
          { label: "Testo Booster", href: "/protein-traening/testo-booster" },
          { label: "Elektrolytter", href: "/protein-traening/elektrolytter" },
        ],
      },
      {
        heading: "Aminosyrer",
        items: [
          { label: "Glutamin", href: "/protein-traening/glutamin" },
          { label: "L-Leucin", href: "/protein-traening/l-leucin" },
          { label: "Taurin", href: "/protein-traening/taurin" },
          { label: "Arginin", href: "/protein-traening/arginin" },
          { label: "Glycin", href: "/protein-traening/glycin" },
          { label: "Lysin", href: "/protein-traening/lysin" },
          { label: "Tyrosin", href: "/protein-traening/tyrosin" },
        ],
      },
      {
        heading: "Energi & Restitution",
        items: [
          { label: "Kulhydratpulver", href: "/protein-traening/kulhydratpulver" },
          { label: "Sportsdrik", href: "/protein-traening/sportsdrik" },
          { label: "Energibarer", href: "/protein-traening/energibarer" },
          { label: "Energidrik", href: "/protein-traening/energi-drik" },
          { label: "Koffeintabletter", href: "/protein-traening/koffeintabletter" },
          { label: "Peanut Butter", href: "/protein-traening/peanut-butter" },
        ],
      },
    ],
    cta: { label: "Se alle i Protein & Træning →", href: "/protein-traening" },
  },

  // ══════════════════════════════════════════════════
  // 2. VITAMINER
  // ══════════════════════════════════════════════════
  {
    label: "Vitaminer",
    href: "/vitaminer",
    groups: [
      {
        heading: "Klassiske vitaminer",
        items: [
          { label: "D-vitamin", href: "/vitaminer/d-vitamin" },
          { label: "C-vitamin", href: "/vitaminer/c-vitamin" },
          { label: "E-vitamin", href: "/vitaminer/e-vitamin" },
          { label: "Multivitamin", href: "/vitaminer/multivitamin" },
          { label: "Vitamin D3 + K2", href: "/vitaminer/vitamin-d3-k2" },
          { label: "Vitamin K2", href: "/vitaminer/vitamin-k2" },
          { label: "Betacaroten", href: "/vitaminer/betacaroten" },
          { label: "Lutein", href: "/vitaminer/lutein" },
          { label: "Lycopen", href: "/vitaminer/lycopen" },
        ],
      },
      {
        heading: "B-vitaminer",
        items: [
          { label: "B-vitamin", href: "/vitaminer/b-vitamin" },
          { label: "B1", href: "/vitaminer/vitamin-b1" },
          { label: "B2 (Riboflavin)", href: "/vitaminer/vitamin-b2-riboflavin" },
          { label: "B6", href: "/vitaminer/vitamin-b6" },
          { label: "B12", href: "/vitaminer/vitamin-b12" },
          { label: "Folinsyre", href: "/vitaminer/folinsyre" },
          { label: "Niacin", href: "/vitaminer/niacin" },
          { label: "Pantotensyre", href: "/vitaminer/pantotensyre" },
          { label: "Biotin", href: "/vitaminer/biotin" },
        ],
      },
      {
        heading: "Målgrupper",
        items: [
          { label: "Multivitamin kvinde", href: "/vitaminer/multivitamin-kvinde" },
          { label: "Multivitamin mænd", href: "/vitaminer/multivitamin-til-maend" },
          { label: "Multivitamin børn", href: "/vitaminer/multivitamin-born" },
          { label: "Gravid / amning", href: "/vitaminer/multivitamin-gravid-amning" },
          { label: "Vegansk vitamin D", href: "/vitaminer/vegansk-vitamin-d" },
          { label: "Vitaminer til hår", href: "/vitaminer/vitaminer-til-har" },
          { label: "Vitaminer til øjne", href: "/vitaminer/vitaminer-til-ojnene" },
        ],
      },
    ],
    cta: { label: "Se alle vitaminer →", href: "/vitaminer" },
  },

  // ══════════════════════════════════════════════════
  // 3. MINERALER (already complete)
  // ══════════════════════════════════════════════════
  {
    label: "Mineraler",
    href: "/mineraler",
    groups: [
      {
        heading: "Basale mineraler",
        items: [
          { label: "Magnesium", href: "/mineraler/magnesium" },
          { label: "Zink", href: "/mineraler/zink" },
          { label: "Jern", href: "/mineraler/jern-tabletter" },
          { label: "Calcium", href: "/mineraler/calcium" },
          { label: "Kalium", href: "/mineraler/kalium" },
          { label: "Kalktabletter", href: "/mineraler/kalktabletter" },
        ],
      },
      {
        heading: "Sporstoffer",
        items: [
          { label: "Selen", href: "/mineraler/selen" },
          { label: "Krom", href: "/mineraler/krom" },
          { label: "Kobber", href: "/mineraler/kobber-tabletter" },
          { label: "Mangan", href: "/mineraler/mangan" },
          { label: "Jod", href: "/mineraler/jod-tabletter" },
        ],
      },
      {
        heading: "Kombinationer",
        items: [
          { label: "Silica", href: "/mineraler/silica" },
          { label: "MSM", href: "/mineraler/msm" },
        ],
      },
    ],
    cta: { label: "Se alle mineraler →", href: "/mineraler" },
  },

  // ══════════════════════════════════════════════════
  // 4. OMEGA & FEDTSYRER (already complete)
  // ══════════════════════════════════════════════════
  {
    label: "Omega & Fedtsyrer",
    href: "/omega-fedtsyrer",
    groups: [
      {
        heading: "Omega-3",
        items: [
          { label: "Omega-3", href: "/omega-fedtsyrer/omega-3" },
          { label: "Fiskeolie", href: "/omega-fedtsyrer/fiskeolie" },
          { label: "Krillolie", href: "/omega-fedtsyrer/krillolie" },
          { label: "Vegansk Omega-3", href: "/omega-fedtsyrer/vegansk-omega-3" },
        ],
      },
      {
        heading: "Andre fedtsyrer",
        items: [
          { label: "MCT-olie", href: "/omega-fedtsyrer/mct-olie" },
          { label: "Kæmpenatlysolie", href: "/omega-fedtsyrer/kaempenatlysolie" },
          { label: "CLA", href: "/omega-fedtsyrer/cla" },
          { label: "Lecithin", href: "/omega-fedtsyrer/lecithin" },
          { label: "Kokosolie", href: "/omega-fedtsyrer/kokosolie" },
        ],
      },
    ],
    cta: { label: "Se alle omega & fedtsyrer →", href: "/omega-fedtsyrer" },
  },

  // ══════════════════════════════════════════════════
  // 5. SUNDHED & VELVÆRE
  // ══════════════════════════════════════════════════
  {
    label: "Sundhed & Velvære",
    href: "/sundhed-velvaere",
    groups: [
      {
        heading: "Hud, hår & led",
        items: [
          { label: "Kollagenpulver", href: "/sundhed-velvaere/kollagenpulver" },
          { label: "Collagen kapsler", href: "/sundhed-velvaere/collagen-kapsler" },
          { label: "Hyaluronsyre", href: "/sundhed-velvaere/hyaluronsyre" },
          { label: "Kosttilskud til led", href: "/sundhed-velvaere/kosttilskud-til-led" },
          { label: "Vitaminer til hår", href: "/vitaminer/vitaminer-til-har" },
        ],
      },
      {
        heading: "Mave & Fordøjelse",
        items: [
          { label: "Probiotika", href: "/sundhed-velvaere/probiotika" },
          { label: "Mælkesyrebakterier", href: "/sundhed-velvaere/maelkesyrebakterier" },
          { label: "Loppefrøskaller", href: "/sundhed-velvaere/loppefroskaller" },
          { label: "Fibertabletter", href: "/sundhed-velvaere/fibertabletter" },
          { label: "Fordøjelsesenzym", href: "/sundhed-velvaere/fordojelsesenzym" },
          { label: "Glucomannan", href: "/sundhed-velvaere/glucomannan" },
          { label: "Aloe vera juice", href: "/sundhed-velvaere/aloe-vera-juice" },
        ],
      },
      {
        heading: "Stress & Hormonel balance",
        items: [
          { label: "Ashwagandha", href: "/sundhed-velvaere/ashwagandha" },
          { label: "L-Theanin", href: "/sundhed-velvaere/l-theanin" },
          { label: "GABA", href: "/sundhed-velvaere/gaba" },
          { label: "Inositol", href: "/sundhed-velvaere/inositol" },
          { label: "Cholin", href: "/sundhed-velvaere/cholin" },
          { label: "Mod stress", href: "/sundhed-velvaere/kosttilskud-mod-stress" },
          { label: "Hormonel balance kvinder", href: "/sundhed-velvaere/hormonel-balance-hos-kvinder" },
          { label: "Hormonel balance mænd", href: "/sundhed-velvaere/hormonel-balance-hos-maend" },
          { label: "Overgangsalder", href: "/sundhed-velvaere/kosttilskud-til-overgangsalderen" },
        ],
      },
      {
        heading: "Hjerte, lever & generelt",
        items: [
          { label: "Q10", href: "/sundhed-velvaere/q10" },
          { label: "NAC", href: "/sundhed-velvaere/nac" },
          { label: "NAD", href: "/sundhed-velvaere/nad" },
          { label: "Resveratrol", href: "/sundhed-velvaere/resveratrol" },
          { label: "Quercetin", href: "/sundhed-velvaere/quercetin" },
          { label: "Glutathion", href: "/sundhed-velvaere/glutathion" },
          { label: "Alfa-liponsyre", href: "/sundhed-velvaere/alfa-liponsyre" },
          { label: "Til hjertet", href: "/sundhed-velvaere/kosttilskud-til-hjertet" },
          { label: "Til leveren", href: "/sundhed-velvaere/kosttilskud-til-leveren" },
        ],
      },
      {
        heading: "Svampe & Adaptogener",
        items: [
          { label: "Lion's Mane", href: "/sundhed-velvaere/lions-mane" },
          { label: "Reishi", href: "/sundhed-velvaere/reishi" },
          { label: "Chaga", href: "/sundhed-velvaere/chaga" },
          { label: "Shiitake", href: "/sundhed-velvaere/shiitake" },
          { label: "Ginseng", href: "/sundhed-velvaere/ginseng" },
          { label: "Astragalus", href: "/sundhed-velvaere/astragalus" },
          { label: "Schisandra", href: "/sundhed-velvaere/schisandra" },
        ],
      },
      {
        heading: "Urter & Planteekstrakter",
        items: [
          { label: "Gurkmeje", href: "/sundhed-velvaere/gurkmeje" },
          { label: "Ingefær piller", href: "/sundhed-velvaere/ingefaer-piller" },
          { label: "Ingefær pulver", href: "/sundhed-velvaere/ingefaer-pulver" },
          { label: "Hvidløgspiller", href: "/sundhed-velvaere/hvidlogspiller" },
          { label: "Hyben kapsler", href: "/sundhed-velvaere/hyben-kapsler" },
          { label: "Hybenpulver", href: "/sundhed-velvaere/hybenpulver" },
          { label: "Tranebærkapsler", href: "/sundhed-velvaere/tranebaerkapsler" },
          { label: "Olivenbladsekstrakt", href: "/sundhed-velvaere/olivenbladsekstrakt" },
          { label: "Brændenælde", href: "/sundhed-velvaere/braendenaelde-pulver" },
          { label: "Boswellia", href: "/sundhed-velvaere/boswellia" },
          { label: "Bromelain", href: "/sundhed-velvaere/bromelain" },
          { label: "Bukkehornskløver", href: "/sundhed-velvaere/bukkehornsklover" },
          { label: "Gelé Royal", href: "/sundhed-velvaere/gele-royal" },
          { label: "Blåbærtilskud", href: "/sundhed-velvaere/blabaertilskud" },
          { label: "Granatæble", href: "/sundhed-velvaere/granataebletilskud" },
          { label: "Betain", href: "/sundhed-velvaere/betain" },
        ],
      },
      {
        heading: "Superfoods",
        items: [
          { label: "Spirulina", href: "/sundhed-velvaere/spirulina" },
          { label: "Chlorella", href: "/sundhed-velvaere/chlorella" },
          { label: "Bygræs", href: "/sundhed-velvaere/byggraes" },
          { label: "Hvedegræs", href: "/sundhed-velvaere/hvedegraes-pulver" },
          { label: "Super Greens", href: "/sundhed-velvaere/super-greens-pulver" },
          { label: "Acai", href: "/sundhed-velvaere/acai" },
          { label: "Moringa", href: "/sundhed-velvaere/moringa-tilskud" },
          { label: "Matcha", href: "/sundhed-velvaere/matchatilskud" },
          { label: "Chiafrø", href: "/sundhed-velvaere/chiafro" },
          { label: "Rødbedepulver", href: "/sundhed-velvaere/rodbedepulver" },
          { label: "Astaxanthin", href: "/sundhed-velvaere/astaxanthin" },
        ],
      },
      {
        heading: "Vægttab & Detox",
        items: [
          { label: "Fedtforbrænder", href: "/sundhed-velvaere/bedste-fedtforbraender" },
          { label: "Måltidserstatning", href: "/sundhed-velvaere/bedste-maltidserstatning" },
          { label: "Slankepiller", href: "/sundhed-velvaere/slankepiller" },
          { label: "Grøn te", href: "/sundhed-velvaere/gron-te" },
          { label: "Grøn te piller", href: "/sundhed-velvaere/gron-te-piller" },
          { label: "Guarana", href: "/sundhed-velvaere/guarana" },
          { label: "Vanddrivende piller", href: "/sundhed-velvaere/vanddrivende-piller" },
          { label: "Acetyl-L-Carnitin", href: "/sundhed-velvaere/acetyl-l-carnitin" },
          { label: "Detox", href: "/sundhed-velvaere/kosttilskud-til-detox" },
        ],
      },
      {
        heading: "Øvrige tilskud",
        items: [
          { label: "Til løb", href: "/sundhed-velvaere/kosttilskud-til-lob" },
          { label: "Til veganere", href: "/sundhed-velvaere/kosttilskud-til-veganere" },
          { label: "Til keto", href: "/sundhed-velvaere/kosttilskud-til-keto-diaet" },
          { label: "Gummier", href: "/sundhed-velvaere/kosttilskud-gummier" },
          { label: "Animalske tilskud", href: "/sundhed-velvaere/animalske-kosttilskud" },
          { label: "Shirataki nudler", href: "/sundhed-velvaere/shirataki-nudler" },
        ],
      },
    ],
    cta: { label: "Se alle i Sundhed & Velvære →", href: "/sundhed-velvaere" },
  },

  // ══════════════════════════════════════════════════
  // OM OS
  // ══════════════════════════════════════════════════
  {
    label: "Om os",
    href: "/om-os",
    children: [
      { label: "Redaktion", href: "/redaktion" },
      { label: "Sådan vurderer vi", href: "/metodik" },
      { label: "Annonce- & affiliatepolitik", href: "/annoncer-og-affiliate" },
      { label: "Kontakt", href: "/kontakt" },
    ],
  },
]

// Flat for mobile
export const MAIN_SECTIONS_FLAT = MAIN_SECTIONS.map((s) => ({
  label: s.label,
  href: s.href,
}))

// ─── KATEGORI PATH MAPPING ──────────────────────────────────────────
export const CATEGORY_PATHS: Record<string, string> = {
  Kosttilskud: "kosttilskud",
  Protein: "protein-traening",
  Proteintilskud: "protein-traening",
  Proteinpulver: "protein-traening",
  Vitaminer: "vitaminer",
  Mineraler: "mineraler",
  Superfoods: "sundhed-velvaere",
  "Pre-workout": "protein-traening",
  Aminosyrer: "protein-traening",
  Sundhed: "sundhed-velvaere",
  Vægttab: "sundhed-velvaere",
  Guider: "guider",
  Guide: "guider",
}

export function categoryToPath(category: string): string {
  if (!category) return "sundhed-velvaere"
  if (CATEGORY_PATHS[category]) return CATEGORY_PATHS[category]
  return "sundhed-velvaere"
}
