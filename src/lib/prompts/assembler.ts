import type { ArticleInput, GeneratedArticle } from "./types";
import { SYSTEM_PROMPT } from "./system";
import {
  promptIntroDk,
  promptMethodDk,
  promptBuyersGuideDk,
  promptBenefitsDk,
  promptCaveatsDk,
  promptFaqDk,
  promptSourcesDk,
} from "./section-prompts";
import { AUTHORS } from "@/config/authors";

/**
 * Bygger frontmatter för den genererade artikeln.
 */
function buildFrontmatter(input: ArticleInput): string {
  const author = AUTHORS.find(a => a.role === "skribent") || AUTHORS[0];
  const now = new Date().toISOString().split("T")[0];
  const month = new Date().toLocaleString("da-DK", { month: "long" });

  return `---
title: "Bedste ${input.keyword} – bedst i test ${input.year}"
description: "Vi har analyseret og sammenlignet ${input.products.length} ${input.keyword} ud fra ingredienser, dosering, pris pr. dagsdosis og dokumentation. Se hvem der vinder."
date: "${now}"
updated: "${now}"
author: "${author.slug}"
category: "${input.category}"
tags: ["${input.keyword}", "bedst i test", "${input.categorySlug}"]
affiliate_disclosure: true
---`;
}

/**
 * Bygger alla section-prompts i ordning.
 * Returnerar en array av { id, heading, prompt }.
 */
export function buildPromptPipeline(input: ArticleInput) {
  return [
    { id: "intro",          heading: "Introduktion",                    prompt: promptIntroDk(input) },
    { id: "method",         heading: "Metode",                          prompt: promptMethodDk(input) },
    { id: "buyers-guide",   heading: "Købeguide",                       prompt: promptBuyersGuideDk(input) },
    { id: "benefits",       heading: "Nytte og anvendelse",             prompt: promptBenefitsDk(input) },
    { id: "caveats",        heading: "Tænk før køb",                    prompt: promptCaveatsDk(input) },
    { id: "faq",            heading: "FAQ",                             prompt: promptFaqDk(input) },
    { id: "sources",        heading: "Kilder & Forskning",              prompt: promptSourcesDk(input) },
  ];
}

/**
 * Sammanställer de genererade sektionerna till fullständig MDX.
 */
export function assembleMdx(
  input: ArticleInput,
  sectionOutputs: { id: string; content: string }[]
): string {
  const frontmatter = buildFrontmatter(input);
  const author = AUTHORS.find(a => a.role === "skribent") || AUTHORS[0];
  const reviewer = AUTHORS.find(a => a.role === "faglig-reviewer");

  // Bygg MDX-komponenter som ska inkluderas
  const affiliateDisclosure = `<AffiliateDisclosure />`;

  const updateLog = `<UpdateLog entries={[
  { date: "${new Date().toISOString().split("T")[0]}", description: "Artikel oprettet med ${input.products.length} produkter sammenlignet" }
]} />`;

  // Bygg source list placeholder
  const sourceList = `<SourceList sources={[
  { id: 1, title: "Fødevarestyrelsen – Regler for kosttilskud", url: "https://www.foedevarestyrelsen.dk", type: "myndighed" },
  { id: 2, title: "EFSA – Scientific opinions on health claims", url: "https://www.efsa.europa.eu", type: "myndighed" },
  { id: 3, title: "Sundhedsstyrelsen – Anbefalinger", url: "https://www.sst.dk", type: "myndighed" },
  { id: 4, title: "PubMed – Systematisk review", url: "https://pubmed.ncbi.nlm.nih.gov", type: "studie" },
  { id: 5, title: "Nordic Nutrition Recommendations 2023", type: "retningslinje" },
  { id: 6, title: "Produktetiketter og næringsdeklarationer", type: "producent" }
]} />`;

  // Bygg editorial signoff component
  const editorialSignoff = `<EditorialSignoff
  author="${author.slug}"
  lastUpdated="${new Date().toLocaleString("da-DK", { month: "long", year: "numeric" })}"
/>`;

  // Sammansätt hela MDX
  const contentById = new Map(sectionOutputs.map(s => [s.id, s.content]));

  const parts = [
    frontmatter,
    "",
    affiliateDisclosure,
    "",
    contentById.get("intro") || "",
    "",
    contentById.get("method") || "",
    "",
    contentById.get("buyers-guide") || "",
    "",
    contentById.get("benefits") || "",
    "",
    contentById.get("caveats") || "",
    "",
    contentById.get("faq") || "",
    "",
    contentById.get("sources") || "",
    "",
    updateLog,
    "",
    editorialSignoff,
  ];

  return parts.join("\n");
}

export function getSystemPrompt(): string {
  return SYSTEM_PROMPT;
}

function slugify(str: string): string {
  return str
    .toLowerCase()
    .replace(/æ/g, "ae").replace(/ø/g, "oe").replace(/å/g, "aa")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}
