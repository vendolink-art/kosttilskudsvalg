/**
 * Typer for prompt-systemets input och output.
 */

export interface ProductInput {
  name: string;
  type: string;              // ex "whey isolat", "type I kollagen", "glucosamin + chondroitin"
  activeIngredients: string;  // ex "25g whey protein isolat"
  dosePerServing: string;     // ex "30g (1 scoop)"
  servingsPerPackage: number; // ex 30
  pricePerDailyDose?: string; // ex "5,50 kr" (valfritt, kan beräknas)
  price?: string;             // ex "249 kr"
  targetGroup?: string;       // ex "muskelopbygning", "ledsundhed"
  certifications?: string;    // ex "Informed Sport, GMP"
  pros?: string[];            // max 3
  cons?: string[];            // max 2
}

export interface ArticleInput {
  keyword: string;            // ex "proteinpulver"
  secondaryKeywords: string[];// ex ["proteinpulver bedst i test", "bedste proteinpulver"]
  category: string;           // ex "Protein" eller "Hud, hår & led"
  categorySlug: string;       // ex "protein" eller "hud-haar-og-led"
  year: number;               // ex 2026
  products: ProductInput[];   // 5–10 produkter
  bestOverall?: string;       // produktnavn
  bestBudget?: string;
  bestPremium?: string;
  bestAlternative?: string;   // ex "Bedste veganske"
  alternativeLabel?: string;  // ex "Bedste veganske valg"
}

export interface GeneratedSection {
  id: string;
  heading: string;
  content: string;
}

export interface GeneratedArticle {
  frontmatter: string;
  sections: GeneratedSection[];
  fullMdx: string;
}
