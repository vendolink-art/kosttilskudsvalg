/**
 * silo-config.ts
 *
 * Central silo-mapping: maps every category slug to one of
 * 5 main silos. Used by routing, nav, breadcrumbs, redirects, etc.
 */

export type SiloId =
  | "protein-traening"
  | "vitaminer"
  | "mineraler"
  | "omega-fedtsyrer"
  | "sundhed-velvaere"

export interface SiloMeta {
  id: SiloId
  label: string
  href: string
  description: string
}

export const SILOS: Record<SiloId, SiloMeta> = {
  "protein-traening": {
    id: "protein-traening",
    label: "Protein & Træning",
    href: "/protein-traening",
    description: "Proteinpulver, kreatin, pre-workout og andre tilskud til styrke, muskelopbygning og restitution.",
  },
  vitaminer: {
    id: "vitaminer",
    label: "Vitaminer",
    href: "/vitaminer",
    description: "D-vitamin, C-vitamin, B-vitaminer, multivitaminer og andre vitamintilskud sammenlignet og testet.",
  },
  mineraler: {
    id: "mineraler",
    label: "Mineraler",
    href: "/mineraler",
    description: "Magnesium, zink, jern, calcium og andre mineraltilskud analyseret på dosering, form og pris.",
  },
  "omega-fedtsyrer": {
    id: "omega-fedtsyrer",
    label: "Omega & Fedtsyrer",
    href: "/omega-fedtsyrer",
    description: "Omega-3, fiskeolie, krillolie og andre fedtsyretilskud sammenlignet på EPA/DHA-indhold og renhed.",
  },
  "sundhed-velvaere": {
    id: "sundhed-velvaere",
    label: "Sundhed & Velvære",
    href: "/sundhed-velvaere",
    description: "Probiotika, kollagen, ashwagandha, urter og tilskud til led, hud, hår, fordøjelse og generel sundhed.",
  },
}

/** Complete mapping of every category slug → silo */
export const SLUG_TO_SILO: Record<string, SiloId> = {
  // ── Protein & Træning ──────────────────────────────
  // Proteintilskud
  "proteinpulver": "protein-traening",
  "vegansk-proteinpulver": "protein-traening",
  "kasein": "protein-traening",
  "weight-gainer": "protein-traening",
  "proteinbarer": "protein-traening",
  "laktosefrit-proteinpulver": "protein-traening",
  "hamp-protein": "protein-traening",
  "risprotein": "protein-traening",
  "sojaprotein": "protein-traening",
  "aggeprotein": "protein-traening",
  "arteprotein": "protein-traening",
  "proteinpulver-til-restitution": "protein-traening",
  "proteinpulver-til-vaegttab": "protein-traening",
  "proteinpulver-uden-sodestoffer": "protein-traening",
  "proteinpulver-uden-tilsat-sukker": "protein-traening",
  "proteinbar-med-lavt-sukkerindhold": "protein-traening",
  "veganske-proteinbarer": "protein-traening",
  // Performance & Styrke
  "kreatin": "protein-traening",
  "pre-workout": "protein-traening",
  "bcaa": "protein-traening",
  "eaa": "protein-traening",
  "beta-alanin": "protein-traening",
  "elektrolytter": "protein-traening",
  "zma": "protein-traening",
  "testo-booster": "protein-traening",
  "pwo-med-koffein": "protein-traening",
  "pwo-med-kreatin": "protein-traening",
  "koffeinfri-pwo": "protein-traening",
  // Energi & Restitution
  "kulhydratpulver": "protein-traening",
  "sportsdrik": "protein-traening",
  "energibarer": "protein-traening",
  "energi-drik": "protein-traening",
  "koffeintabletter": "protein-traening",
  "glutamin": "protein-traening",
  "l-leucin": "protein-traening",
  "taurin": "protein-traening",
  "arginin": "protein-traening",
  "glycin": "protein-traening",
  "lysin": "protein-traening",
  "tyrosin": "protein-traening",
  "peanut-butter": "protein-traening",

  // ── Vitaminer ──────────────────────────────────────
  // Klassiske vitaminer
  "d-vitamin": "vitaminer",
  "c-vitamin": "vitaminer",
  "e-vitamin": "vitaminer",
  "multivitamin": "vitaminer",
  "vitamin-d3-k2": "vitaminer",
  "vitamin-k2": "vitaminer",
  // B-vitaminer
  "b-vitamin": "vitaminer",
  "vitamin-b1": "vitaminer",
  "vitamin-b2-riboflavin": "vitaminer",
  "vitamin-b6": "vitaminer",
  "vitamin-b12": "vitaminer",
  "folinsyre": "vitaminer",
  "niacin": "vitaminer",
  "pantotensyre": "vitaminer",
  "biotin": "vitaminer",
  // Målgrupper
  "multivitamin-kvinde": "vitaminer",
  "multivitamin-til-maend": "vitaminer",
  "multivitamin-born": "vitaminer",
  "multivitamin-gravid-amning": "vitaminer",
  "vegansk-vitamin-d": "vitaminer",
  "vitaminer-til-har": "vitaminer",
  "vitaminer-til-ojnene": "vitaminer",
  "betacaroten": "vitaminer",
  "lutein": "vitaminer",
  "lycopen": "vitaminer",

  // ── Mineraler ──────────────────────────────────────
  // Basale mineraler
  "magnesium": "mineraler",
  "zink": "mineraler",
  "jern-tabletter": "mineraler",
  "calcium": "mineraler",
  "kalium": "mineraler",
  "kalktabletter": "mineraler",
  // Sporstoffer
  "selen": "mineraler",
  "krom": "mineraler",
  "kobber-tabletter": "mineraler",
  "mangan": "mineraler",
  "jod-tabletter": "mineraler",
  // Kombinationer
  "silica": "mineraler",
  "msm": "mineraler",

  // ── Omega & Fedtsyrer ─────────────────────────────
  "omega-3": "omega-fedtsyrer",
  "fiskeolie": "omega-fedtsyrer",
  "krillolie": "omega-fedtsyrer",
  "vegansk-omega-3": "omega-fedtsyrer",
  "mct-olie": "omega-fedtsyrer",
  "kaempenatlysolie": "omega-fedtsyrer",
  "cla": "omega-fedtsyrer",
  "lecithin": "omega-fedtsyrer",
  "kokosolie": "omega-fedtsyrer",

  // ── Sundhed & Velvære ─────────────────────────────
  // Hud, hår & led
  "kollagenpulver": "sundhed-velvaere",
  "collagen-kapsler": "sundhed-velvaere",
  "hyaluronsyre": "sundhed-velvaere",
  "kosttilskud-til-led": "sundhed-velvaere",
  // Mave & Fordøjelse
  "probiotika": "sundhed-velvaere",
  "maelkesyrebakterier": "sundhed-velvaere",
  "loppefroskaller": "sundhed-velvaere",
  "fibertabletter": "sundhed-velvaere",
  "fordojelsesenzym": "sundhed-velvaere",
  "glucomannan": "sundhed-velvaere",
  "aloe-vera-juice": "sundhed-velvaere",
  // Stress & Hormonel balance
  "ashwagandha": "sundhed-velvaere",
  "l-theanin": "sundhed-velvaere",
  "gaba": "sundhed-velvaere",
  "inositol": "sundhed-velvaere",
  "cholin": "sundhed-velvaere",
  "hormonel-balance-hos-kvinder": "sundhed-velvaere",
  "hormonel-balance-hos-maend": "sundhed-velvaere",
  "kosttilskud-til-overgangsalderen": "sundhed-velvaere",
  "kosttilskud-mod-stress": "sundhed-velvaere",
  // Hjerte & Generel sundhed
  "q10": "sundhed-velvaere",
  "kosttilskud-til-hjertet": "sundhed-velvaere",
  "kosttilskud-til-leveren": "sundhed-velvaere",
  "nad": "sundhed-velvaere",
  "nac": "sundhed-velvaere",
  "resveratrol": "sundhed-velvaere",
  "quercetin": "sundhed-velvaere",
  "glutathion": "sundhed-velvaere",
  "alfa-liponsyre": "sundhed-velvaere",
  // Urter & Ekstrakter
  "gurkmeje": "sundhed-velvaere",
  "ingefaer-piller": "sundhed-velvaere",
  "ingefaer-pulver": "sundhed-velvaere",
  "lions-mane": "sundhed-velvaere",
  "reishi": "sundhed-velvaere",
  "chaga": "sundhed-velvaere",
  "shiitake": "sundhed-velvaere",
  "ginseng": "sundhed-velvaere",
  "astragalus": "sundhed-velvaere",
  "schisandra": "sundhed-velvaere",
  "boswellia": "sundhed-velvaere",
  "bromelain": "sundhed-velvaere",
  "bukkehornsklover": "sundhed-velvaere",
  "hyben-kapsler": "sundhed-velvaere",
  "hybenpulver": "sundhed-velvaere",
  "tranebaerkapsler": "sundhed-velvaere",
  "olivenbladsekstrakt": "sundhed-velvaere",
  "braendenaelde-pulver": "sundhed-velvaere",
  "gele-royal": "sundhed-velvaere",
  "blabaertilskud": "sundhed-velvaere",
  "granataebletilskud": "sundhed-velvaere",
  "betain": "sundhed-velvaere",
  "hvidlogspiller": "sundhed-velvaere",
  // Superfoods
  "spirulina": "sundhed-velvaere",
  "chlorella": "sundhed-velvaere",
  "byggraes": "sundhed-velvaere",
  "hvedegraes-pulver": "sundhed-velvaere",
  "super-greens-pulver": "sundhed-velvaere",
  "acai": "sundhed-velvaere",
  "moringa-tilskud": "sundhed-velvaere",
  "matchatilskud": "sundhed-velvaere",
  "chiafro": "sundhed-velvaere",
  "rodbedepulver": "sundhed-velvaere",
  "astaxanthin": "sundhed-velvaere",
  // Vægttab & Øvrigt
  "bedste-fedtforbraender": "sundhed-velvaere",
  "bedste-maltidserstatning": "sundhed-velvaere",
  "slankepiller": "sundhed-velvaere",
  "gron-te": "sundhed-velvaere",
  "gron-te-piller": "sundhed-velvaere",
  "guarana": "sundhed-velvaere",
  "vanddrivende-piller": "sundhed-velvaere",
  "acetyl-l-carnitin": "sundhed-velvaere",
  "kosttilskud-til-detox": "sundhed-velvaere",
  "kosttilskud-til-lob": "sundhed-velvaere",
  "kosttilskud-til-veganere": "sundhed-velvaere",
  "kosttilskud-til-keto-diaet": "sundhed-velvaere",
  "kosttilskud-gummier": "sundhed-velvaere",
  "animalske-kosttilskud": "sundhed-velvaere",
  "shirataki-nudler": "sundhed-velvaere",
}

/** Get the silo for a slug (falls back to sundhed-velvaere) */
export function getSiloForSlug(slug: string): SiloMeta {
  const siloId = SLUG_TO_SILO[slug] || "sundhed-velvaere"
  return SILOS[siloId]
}

/** Get all slugs that belong to a specific silo */
export function getSlugsForSilo(siloId: SiloId): string[] {
  return Object.entries(SLUG_TO_SILO)
    .filter(([, id]) => id === siloId)
    .map(([slug]) => slug)
}
