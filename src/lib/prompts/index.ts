export { SYSTEM_PROMPT } from "./system";
export type { ArticleInput, ProductInput, GeneratedArticle, GeneratedSection } from "./types";
export {
  promptHero,
  promptQuickOverview,
  promptMethodBlock,
  promptProductSections,
  promptComparisonTable,
  promptBuyersGuide,
  promptSafety,
  promptFAQ,
  promptEEATSignoff,
  promptIntroDk,
  promptMethodDk,
  promptBuyersGuideDk,
  promptBenefitsDk,
  promptCaveatsDk,
  promptFaqDk,
} from "./section-prompts";
export { buildPromptPipeline, assembleMdx, getSystemPrompt } from "./assembler";
