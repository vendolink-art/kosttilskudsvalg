export type TagDef = {
  slug: string
  title: string
  description?: string
  indexable?: boolean
  synonyms?: string[]
}

export const TAGS: Record<string, TagDef> = {
  // Indholdstyper
  "produkttest": {
    slug: "produkttest",
    title: "Produkttest",
    indexable: true,
    synonyms: ["produkt-test", "test"]
  },
  "sammenligning": {
    slug: "sammenligning",
    title: "Sammenligning",
    indexable: true,
    synonyms: ["bedst i test", "kategori-test"]
  },
  "koebsguide": {
    slug: "koebsguide",
    title: "Købsguide",
    indexable: true,
    synonyms: ["guide", "købs-guide"]
  },

  // Produktkategorier
  "protein": {
    slug: "protein",
    title: "Protein",
    indexable: true,
    synonyms: ["proteinpulver", "whey", "kasein"]
  },
  "kreatin": {
    slug: "kreatin",
    title: "Kreatin",
    indexable: true,
    synonyms: ["creatine", "kreatin-monohydrat"]
  },
  "vitaminer": {
    slug: "vitaminer",
    title: "Vitaminer",
    indexable: true,
    synonyms: ["vitamin"]
  },
  "mineraler": {
    slug: "mineraler",
    title: "Mineraler",
    indexable: true,
    synonyms: ["mineral"]
  },
  "omega-3": {
    slug: "omega-3",
    title: "Omega-3",
    indexable: true,
    synonyms: ["fiskeolie", "fish oil"]
  },
  "probiotika": {
    slug: "probiotika",
    title: "Probiotika",
    indexable: true,
    synonyms: ["mælkesyrebakterier"]
  },
  "kollagen": {
    slug: "kollagen",
    title: "Kollagen",
    indexable: true,
    synonyms: ["collagen"]
  },
  "superfoods": {
    slug: "superfoods",
    title: "Superfoods",
    indexable: true,
    synonyms: ["superfood"]
  },
  "pre-workout": {
    slug: "pre-workout",
    title: "Pre-workout",
    indexable: true,
    synonyms: ["pwo", "pre workout"]
  },
  "bcaa": {
    slug: "bcaa",
    title: "BCAA",
    indexable: true,
    synonyms: ["aminosyrer"]
  },
  "vaegtab": {
    slug: "vaegtab",
    title: "Vægttab",
    indexable: true,
    synonyms: ["slankemiddel", "fatburner"]
  },
  "maaltidserstatning": {
    slug: "maaltidserstatning",
    title: "Måltidserstatning",
    indexable: true,
    synonyms: ["meal replacement", "shake"]
  },
  "d-vitamin": {
    slug: "d-vitamin",
    title: "D-vitamin",
    indexable: true
  },
  "c-vitamin": {
    slug: "c-vitamin",
    title: "C-vitamin",
    indexable: true
  },
  "magnesium": {
    slug: "magnesium",
    title: "Magnesium",
    indexable: true
  },
  "zink": {
    slug: "zink",
    title: "Zink",
    indexable: true
  },
  "jern": {
    slug: "jern",
    title: "Jern",
    indexable: true
  },
  "melatonin": {
    slug: "melatonin",
    title: "Melatonin",
    indexable: true,
    synonyms: ["søvn", "sovemiddel"]
  },
}
