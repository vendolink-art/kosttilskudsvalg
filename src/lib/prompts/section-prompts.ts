import type { ArticleInput } from "./types";

/**
 * Modulära section-prompts.
 * Varje funktion returnerar en user-prompt-sträng.
 * AI-motorn kör dem i sekvens med SYSTEM_PROMPT som system message.
 */

// ─── 1. HERO + H1 ───────────────────────────────────────────
export function promptHero(input: ArticleInput): string {
  return `OPGAVE: Skriv H1 + hero-intro for en "bedst i test"-artikel.

KEYWORD: ${input.keyword}
ÅR: ${input.year}
ANTAL PRODUKTER: ${input.products.length}

KRAV:
- H1: "Bedste ${input.keyword} – bedst i test ${input.year}"
- Intro: max 3 sætninger
- Nævn antal produkter og hovedkriterier (ingredienser, dosering, pris pr. dagsdosis, dokumentation)
- Inkludér "Sidst opdateret: {måned} ${input.year}"
- UNDGÅ markedsføring og tomme superlativer

FORMAT: Markdown (H1 + paragraf + opdateringsdato)`;
}

// ─── 2. HURTIGT OVERBLIK (TESTVINDER) ───────────────────────
export function promptQuickOverview(input: ArticleInput): string {
  const winners = [
    input.bestOverall ? `🏆 Bedst i test: ${input.bestOverall}` : null,
    input.bestBudget ? `💰 Bedste budgetvalg: ${input.bestBudget}` : null,
    input.bestPremium ? `⭐ Bedste premiumvalg: ${input.bestPremium}` : null,
    input.bestAlternative ? `🌱 ${input.alternativeLabel || "Bedste alternativ"}: ${input.bestAlternative}` : null,
  ].filter(Boolean);

  return `OPGAVE: Skriv et "Hurtigt overblik"-block med testvindere.

KEYWORD: ${input.keyword}
VINDERE:
${winners.join("\n")}

PRODUKTDATA (til motivering):
${input.products.map(p => `- ${p.name}: ${p.activeIngredients}, ${p.dosePerServing}, ${p.type}`).join("\n")}

KRAV:
- For HVER vinder: 1–2 sætninger der konkret motiverer valget
- Motivering skal baseres på data (dosering, pris pr. dagsdosis, ingredienser)
- Ingen fluff-ord
- Afslut hver med: "Læs vurdering ↓"

FORMAT: Markdown med H2 "Hurtigt overblik" + kort boks-layout`;
}

// ─── 3. SÅDAN HAR VI TESTET ─────────────────────────────────
export function promptMethodBlock(input: ArticleInput): string {
  return `OPGAVE: Skriv afsnittet "Sådan har vi testet og vurderet".

KEYWORD: ${input.keyword}
ANTAL PRODUKTER: ${input.products.length}

KRAV:
- H2: "Sådan har vi testet og vurderet"
- 120–150 ord
- Beskriv de 5–6 kriterier vi har brugt (tilpas til ${input.keyword}):
  • ingredienser og dokumenteret dosis
  • pris pr. dagsdosis
  • produktkvalitet og tilsætningsstoffer
  • brugervenlighed og målgruppe
  • tilgængelighed i Danmark
  • tredjepartscertificering (hvis relevant)
- Forklar at vurderingen bygger på:
  • produktdata og etiketter
  • offentligt tilgængelig dokumentation
  • redaktionel analyse
- Afslut med: "Læs vores fulde metodik"
- ALDRIG påstå at vi har udført laboratorietests

FORMAT: Markdown H2 + brødtekst + link-placeholder`;
}

// ─── 4. PRODUKT FOR PRODUKT ─────────────────────────────────
export function promptProductSections(input: ArticleInput): string {
  const productBlocks = input.products.map((p, i) => {
    return `PRODUKT ${i + 1}:
- Navn: ${p.name}
- Type: ${p.type}
- Aktive ingredienser: ${p.activeIngredients}
- Dosering pr. portion: ${p.dosePerServing}
- Portioner pr. pakke: ${p.servingsPerPackage}
- Pris pr. dagsdosis: ${p.pricePerDailyDose || "ikke angivet"}
- Pris: ${p.price || "ikke angivet"}
- Målgruppe: ${p.targetGroup || "generel"}
- Certificeringer: ${p.certifications || "ingen angivet"}
- Fordele (hint): ${p.pros?.join(", ") || "ingen angivet"}
- Ulemper (hint): ${p.cons?.join(", ") || "ingen angivet"}`;
  });

  return `OPGAVE: Skriv en unik produktsektion for HVERT af de ${input.products.length} produkter.

KEYWORD: ${input.keyword}

PRODUKTER:
${productBlocks.join("\n\n")}

FOR HVERT PRODUKT SKAL DU SKRIVE:
1. H2: "{Produktnavn}"
2. Kort dom (1–2 sætninger: hvad gør det godt/skidt, konkret)
3. "Nøgledata" (som punktliste):
   - Aktiv ingrediens:
   - Dosering pr. portion:
   - Portioner pr. pakke:
   - Pris pr. dagsdosis:
4. "Derfor er det et godt valg" (2–3 punkter, konkrete)
5. "Ulemper" (1–2 punkter, ærlige)

KRAV:
- Hver produkttekst SKAL være semantisk unik (ingen copy-paste mellem produkter)
- Sammenlign implicit mod andre produkter i listen
- Undgå generiske formuleringer som "god kvalitet" eller "populært valg"
- Undgå at sige "ingen anmeldelser tilgængelige"

FORMAT: Markdown H2 + underafsnit for hvert produkt`;
}

// ─── 5. SAMMENLIGNINGSTABEL ─────────────────────────────────
export function promptComparisonTable(input: ArticleInput): string {
  const isSupplementCategory = ["led", "kollagen", "omega", "vitamin", "mineral", "probiotika"]
    .some(k => input.keyword.toLowerCase().includes(k));

  const columns = isSupplementCategory
    ? "Produkt | Aktiv ingrediens | Dosering pr. portion | Evidensniveau (A/B/C) | Pris pr. dagsdosis | Primært formål"
    : "Produkt | Type/kilde | Protein/aktiv pr. portion | Portioner pr. pakke | Pris pr. dagsdosis | Vurdering";

  return `OPGAVE: Opret en sammenligningstabel for ${input.keyword}.

PRODUKTER:
${input.products.map(p => `- ${p.name}: ${p.activeIngredients}, ${p.dosePerServing}, ${p.servingsPerPackage} portioner, pris/dagsdosis: ${p.pricePerDailyDose || "?"}`).join("\n")}

KOLUMNER:
${columns}

KRAV:
- Tabellen skal summere testen objektivt
- Ingen værdiladede ord i tabellen
- "Vurdering" skal være en kort tekst (fx "Stærk ingrediensprofil") — IKKE stjerner
- Hvis data mangler, skriv "Ikke oplyst"
- Sortér med bedst-i-test-vinder øverst

FORMAT: Markdown-tabel (GFM)`;
}

// ─── 6. KØBERGUIDE ──────────────────────────────────────────
export function promptBuyersGuide(input: ArticleInput): string {
  return `OPGAVE: Skriv afsnittet "Sådan vælger du det bedste ${input.keyword}".

KRAV:
- H2: "Sådan vælger du det bedste ${input.keyword}"
- Max 5 punkter i en nummereret liste
- Fokus:
  1. Formål (hvad vil du opnå?)
  2. Ingredienser (hvad skal du se efter?)
  3. Dosering (hvilken dosis giver mening?)
  4. Tilsætningsstoffer (hvad skal du undgå?)
  5. Budget vs. kvalitet
- Hvert punkt: 2–3 sætninger
- Ingen medicinske løfter
- Hvis relevant, link-placeholders til guider

FORMAT: Markdown H2 + nummereret liste`;
}

// ─── 7. SIKKERHED & YMYL ────────────────────────────────────
export function promptSafety(input: ArticleInput): string {
  return `OPGAVE: Skriv sikkerhedsblokken for ${input.keyword}.

KRAV:
- H2: "Sikkerhed og vigtige overvejelser"
- Saglig, rolig tone – IKKE skræmmende
- Nævn typiske bivirkninger (mave, allergi osv.) relevant for ${input.keyword}
- Liste: "Tal med din læge, hvis du:"
  • er gravid eller ammer
  • tager medicin (nævn evt. specifikke interaktioner for ${input.keyword})
  • har kronisk sygdom
  • oplever bivirkninger
- Afslut med: "Kosttilskud er ikke erstatning for en varieret kost."
- Max 150 ord

FORMAT: Markdown H2 + brødtekst + punktliste`;
}

// ─── 8. FAQ ─────────────────────────────────────────────────
export function promptFAQ(input: ArticleInput): string {
  return `OPGAVE: Skriv 5–7 FAQ-spørgsmål til en "bedst i test"-artikel om ${input.keyword}.

SEKUNDÆRE KEYWORDS: ${input.secondaryKeywords.join(", ")}

KRAV:
- Spørgsmålene skal matche typiske søgeintentioner:
  • "Hvad er det bedste ${input.keyword}?"
  • "Hvad betyder bedst i test?"
  • "Er dyrere ${input.keyword} bedre?"
  • "Virker ${input.keyword}?"
  • "Hvilken ${input.keyword} er bedst for begyndere?"
  • (tilpas til ${input.keyword})
- Korte, tydelige svar (2–4 sætninger)
- Ingen absolutter ("altid", "aldrig")
- Optimeret til FAQPage-schema

FORMAT: Markdown med H2 "Ofte stillede spørgsmål" + H3 for hvert spørgsmål + svar`;
}

// ─── 9. EEAT & REDAKTIONEL SIGNOFF ──────────────────────────
export function promptEEATSignoff(input: ArticleInput): string {
  return `OPGAVE: Skriv det afsluttende EEAT- og kildeblok.

KRAV:
1. H2: "Metode, kilder og redaktion"
2. Kort metodebeskrivelse (3–4 linjer) + link-placeholder til /metodik
3. Kildeliste: angiv 6–10 TYPER af kilder der er relevante for ${input.keyword}:
   - Danske myndigheder (Fødevarestyrelsen, Sundhedsstyrelsen)
   - Europæiske myndigheder (EFSA)
   - Peer-reviewed studier
   - Systematiske reviews
   - Produktdata og etiketter
   - Anerkendte ernæringshåndbøger
4. Redaktionel signoff:
   - "Skrevet af: {AUTHOR_NAME}, {AUTHOR_TITLE}"
   - "Fagligt gennemgået af: {REVIEWER_NAME}, {REVIEWER_TITLE}"
5. Link-placeholders til /metodik, /kilder-og-faktacheck, /annoncer-og-affiliate

FORMAT: Markdown H2 + underafsnit`;
}

// ─── NY STRUKTUR (SV-MODEL → DK) ─────────────────────────────
export function promptIntroDk(input: ArticleInput): string {
  const topPick = input.bestOverall || input.products[0]?.name || "vores topvalg"
  return `OPGAVE: Skriv introduktionen til en dansk "bedst i test"-artikel om ${input.keyword}.

KRAV:
- Præcis 3 afsnit i HTML-format: <p>...</p>
- Hvert afsnit ca. 45-65 ord
- Varm, faglig, people-first tone
- Ingen "velkommen", ingen fluff
- Undgå påstande om egne laboratorietests

INDHOLD:
1) Hvad ${input.keyword} bruges til i dansk hverdag + kort problem/behøv.
2) Hvad der typisk adskiller gode/dårlige valg i kategorien (konkret, uden buzzwords).
3) Forklar at vurderingen bygger på oberoende tests, verificerede kundeomtaler og produktdata for danske forhold.
   Afslut med en naturlig konklusion hvor ${topPick} nævnes som topvalg.

OUTPUT:
- Kun tre <p>...</p> blokke.`;
}

export function promptMethodDk(input: ArticleInput): string {
  return `OPGAVE: Skriv metodesektionen for ${input.keyword} til dansk marked.

OUTPUTFORMAT (skal følges):
<h2>Sådan har vi lavet vores test af ${input.keyword}</h2>
<p>Kort introduktion om metode og datagrundlag.</p>

<h3>Sådan indsamler vi data</h3>
<p>2-3 sætninger.</p>
<ul>
  <li><strong>Uafhængige tests:</strong> hvilke datapunkter vi henter.</li>
  <li><strong>Verificerede kundeomtaler:</strong> hvordan vi filtrerer støj.</li>
  <li><strong>Produktdata:</strong> specifikationer, dosering, certifikater, garanti.</li>
</ul>

<h3>Hvad vi vægter i ${input.keyword}</h3>
<p>2-3 sætninger.</p>
<table class="table-default">
  <thead><tr><th>Kriterium</th><th>Vægt</th><th>Typiske datapunkter</th><th>Eksempler på kilder</th></tr></thead>
  <tbody>
    <tr><td>Ingrediensprofil</td><td>25%</td><td>aktive stoffer, styrke, renhed</td><td>etiket, datablad</td></tr>
    <tr><td>Dosering</td><td>20%</td><td>dosis pr. portion/dag</td><td>etiket, producentdata</td></tr>
    <tr><td>Prisværdi</td><td>20%</td><td>pris pr. dagsdosis</td><td>forhandlerdata</td></tr>
    <tr><td>Kvalitet/sikkerhed</td><td>15%</td><td>tilsætningsstoffer, allergener</td><td>etiket, dokumentation</td></tr>
    <tr><td>Brugeroplevelse</td><td>10%</td><td>smag, opløselighed, anvendelse</td><td>verificerede omtaler</td></tr>
    <tr><td>Tilgængelighed</td><td>10%</td><td>lager, varianter, stabilitet</td><td>danske butikker</td></tr>
  </tbody>
</table>

<h3>Begrænsninger og transparens</h3>
<p>Nævn tydeligt at gennemgangen ikke er egne laboratoriemålinger, men en redaktionel sammenstilling af verificerbare kilder.</p>
<p>Afslut med intern henvisning: <a href="/om-vara-tester">Om vores tests</a>.</p>

REGLER:
- Ingen eksterne links her.
- Korrekt dansk.
- Ingen placeholders eller metakommentarer.`;
}

export function promptBuyersGuideDk(input: ArticleInput): string {
  return `OPGAVE: Skriv købeguide for ${input.keyword}.

STRUKTUR:
<h2>Købeguide: sådan vælger du den rigtige ${input.keyword}</h2>
<p>Kort intro.</p>

Lav mindst 7 stk <h3>-afsnit.
For hvert afsnit:
- 1-2 korte <p>
- enten <ul>, <ol> eller <table class="table-default">
- afsluttende praktisk råd i et <p>

KRAV:
- Mindst ét afsnit med to <h4>-underrubrikker.
- Mindst én <ol>-liste.
- Konkret dansk kontekst, ingen fluff.
- Ingen påstand om egne laboratorietests.
`;
}

export function promptBenefitsDk(input: ArticleInput): string {
  return `OPGAVE: Skriv nytte-/anvendelsessektion for ${input.keyword}.

STRUKTUR:
<h2>Sådan får du mest ud af ${input.keyword}</h2>
<p>Kort introduktion.</p>

Mindst 5 stk <h3>-punkter. Under hver:
- 1 kort <p> med praktisk nytte
- 1 <ul>/<ol>/<table class="table-default">
- 1 afsluttende <p> med konkret tip

KRAV:
- Dæk forskellige scenarier (hverdag, træning, rejse, budget).
- Variation i struktur (mindst én tabel og én nummereret liste).
- Korrekt dansk, konkret sprog.
`;
}

export function promptCaveatsDk(input: ArticleInput): string {
  return `OPGAVE: Skriv sektionen "Tænk over dette før køb" om ${input.keyword}.

STRUKTUR:
<h2>Tænk over dette før du køber ${input.keyword}</h2>
<p>Introduktion.</p>

Mindst 5 stk <h3>-punkter om faldgruber/risici.
For hvert punkt:
- 1 kort forklarende <p>
- 1 <ul>/<ol>/<table class="table-default"> med detaljer
- 1 kort <p> med hvordan risikoen håndteres

KRAV:
- Mindst ét <h3> med to <h4>-underrubrikker.
- Ved YMYL/helbred: brug forsigtig formulering og undgå absolutte løfter.
- Ingen skræmmende tone; vær saglig.
`;
}

export function promptFaqDk(input: ArticleInput): string {
  return `OPGAVE: Skriv FAQ for ${input.keyword}.

STRUKTUR:
<h2>FAQ om ${input.keyword}</h2>
Mindst 5 spørgsmål.
Hvert spørgsmål som <h3>, svar i 1-2 <p>.

KRAV:
- Spørgsmål skal ligne reelle søgninger.
- Svar skal være korte, konkrete og selvstændige.
- Variation: køb, brug, sammenligning, fejlvalg, sikkerhed.
- Korrekt dansk og ingen tomme standardfraser.
`;
}

export function promptSourcesDk(input: ArticleInput): string {
  return `OPGAVE: Skriv en sektion med videnskabelige kilder og forskning for ${input.keyword}.

STRUKTUR:
<h2>Kilder & Forskning</h2>
<p>Her er et udvalg af de videnskabelige studier og officielle anbefalinger, der ligger til grund for vores vurdering af ${input.keyword}.</p>

<ul class="sources-list">
  <li><strong>[Kildens navn/Titel på studie]</strong>: Kort beskrivelse af hvad studiet/kilden viser om ${input.keyword}. <a href="[URL]" rel="nofollow" target="_blank">Læs mere her</a>.</li>
</ul>

KRAV:
- Find på 3-5 VERKELIGE, anerkendte videnskabelige kilder (f.eks. PubMed, EFSA, ISSN, Examine.com) der er specifikke for ${input.keyword}.
- URL'erne skal være realistiske og pege på den faktiske kilde (eller roden af databasen).
- Skriv på dansk.
- Hold det akademisk, objektivt og troværdigt (E-E-A-T).
`;
}
