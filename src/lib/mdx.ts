import path from "path";
import { promises as fs } from "fs";
import matter from "gray-matter";
import rehypeSlug from "rehype-slug";
import rehypeAutolinkHeadings from "rehype-autolink-headings";
import remarkGfm from "remark-gfm";
import { cache } from "react";
import { compileMDX } from "next-mdx-remote/rsc";

import { ProductCard } from "@/components/product-card";
import { ProsCons } from "@/components/pros-cons";
import { FAQ } from "@/components/faq";
import { ProductRating, RatingBar } from "@/components/product-rating";
import { ComparisonTable } from "@/components/comparison-table";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { ProductFit } from "@/components/product-fit";
import { EvidenceTable } from "@/components/evidence-table";
import { SegmentPicker } from "@/components/segment-picker";
import { EditorialSignoff } from "@/components/editorial-signoff";
import { SafetyBlock } from "@/components/safety-block";
import { SourceList } from "@/components/source-list";
import { UpdateLog } from "@/components/update-log";
import { MethodBox } from "@/components/method-box";
import { QuickGuideCards } from "@/components/quick-guide-cards";
import { TestSummary } from "@/components/test-summary";
import { CriteriaWeightBars } from "@/components/criteria-weight-bars";
import { EEATBox } from "@/components/eeat-box";
import { AuthorCard } from "@/components/author-card";
import { AffiliateDisclosure } from "@/components/affiliate-disclosure";
import { QuickVerdict } from "@/components/quick-verdict";
import { QuickFactsGrid } from "@/components/quick-facts-grid";
import { SeoJsonLd } from "@/components/seo-jsonld";
import { RelatedArticles } from "@/components/related-articles";
import { Toc } from "@/components/toc";
// Buying guide
import { DecisionMap } from "@/components/buying-guide/decision-map";
import { IngredientComparisonTable } from "@/components/buying-guide/ingredient-comparison-table";
import { PriceEconomyGraph } from "@/components/buying-guide/price-economy-graph";
import { SupplementStacking } from "@/components/buying-guide/supplement-stacking";
import { SupplementRoutine } from "@/components/buying-guide/supplement-routine";
import { ConsumerProfiles } from "@/components/buying-guide/consumer-profiles";
import { DosageGuide } from "@/components/buying-guide/dosage-guide";
import { CommonMistakes } from "@/components/buying-guide/common-mistakes";
// Methodology
import { TestSteps } from "@/components/methodology/test-steps";
import { MeasurementPoints } from "@/components/methodology/measurement-points";
import { ScenarioBoxes } from "@/components/methodology/scenario-boxes";
import { DifferenceHighlights } from "@/components/methodology/difference-highlights";

import { slugifyDa } from "@/lib/slugify";

export type Frontmatter = {
  title: string;
  meta_title?: string;
  description: string;
  date: string;
  updated: string;
  author: string;
  category: string;
  tags: string[];
  affiliate_disclosure?: boolean;
  banner?: string;
  slogan?: string;
  update_note?: string;
};

const CONTENT_DIR = path.join(process.cwd(), "content");
const GUIDES_DIR = path.join(CONTENT_DIR, "guides");
const APP_DA_DIR = path.join(process.cwd(), "src", "app", "(da)");
const APP_KOSTTILSKUD_DIR = path.join(APP_DA_DIR, "kosttilskud");
const APP_PRODUKTER_DIR = path.join(APP_KOSTTILSKUD_DIR, "produkter");

export const getGuideSlugs = cache(async (): Promise<string[]> => {
  try {
    const files = await fs.readdir(GUIDES_DIR);
    return files.filter((f) => f.endsWith(".mdx")).map((f) => f.replace(/\.mdx$/, ""));
  } catch {
    return [];
  }
});

export const readGuideFrontmatter = cache(
  async (slug: string): Promise<Frontmatter & { slug: string }> => {
    try {
      const filePath = path.join(GUIDES_DIR, `${slug}.mdx`);
      const raw = await fs.readFile(filePath, "utf8");
      const { data } = matter(raw);
      return { ...(data as Frontmatter), slug };
    } catch {
      return {
        title: slug,
        description: "",
        date: "",
        updated: "",
        author: "redaktionen",
        category: "",
        tags: [],
        affiliate_disclosure: false,
        slug,
      };
    }
  }
);

async function getAppKosttilskudFrontmatter(): Promise<(Frontmatter & { slug: string })[]> {
  const results: Array<Frontmatter & { slug: string }> = []
  try {
    const entries = await fs.readdir(APP_KOSTTILSKUD_DIR, { withFileTypes: true })
    for (const e of entries) {
      if (!e.isDirectory()) continue
      const slug = e.name
      const filePath = path.join(APP_KOSTTILSKUD_DIR, slug, "page.mdx")
      try {
        const raw = await fs.readFile(filePath, "utf8")
        const { data } = matter(raw)
        results.push({ ...(data as Frontmatter), slug })
      } catch {
        // ignore
      }
    }
  } catch {
    // no dir
  }
  return results
}

async function getAppProdukterFrontmatter(): Promise<(Frontmatter & { slug: string })[]> {
  const results: Array<Frontmatter & { slug: string }> = []
  try {
    const entries = await fs.readdir(APP_PRODUKTER_DIR, { withFileTypes: true })
    for (const e of entries) {
      if (!e.isDirectory()) continue
      const slug = e.name
      const filePath = path.join(APP_PRODUKTER_DIR, slug, "content.mdx")
      try {
        const raw = await fs.readFile(filePath, "utf8")
        const { data } = matter(raw)
        results.push({ ...(data as Frontmatter), slug })
      } catch {
        // ignore
      }
    }
  } catch {
    // no dir
  }
  return results
}

export const getAllGuides = cache(async (): Promise<(Frontmatter & { slug: string })[]> => {
  const slugs = await getGuideSlugs();
  const contentGuides = await Promise.all(slugs.map(readGuideFrontmatter));
  const appKosttilskud = await getAppKosttilskudFrontmatter();
  const all = [...contentGuides, ...appKosttilskud];
  return all.sort((a, b) => {
    const dateA = a.updated || a.date || "";
    const dateB = b.updated || b.date || "";
    return dateB.localeCompare(dateA);
  });
});

export async function getProductTests(): Promise<(Frontmatter & { slug: string })[]> {
  const appProdukter = await getAppProdukterFrontmatter();
  return appProdukter.sort((a, b) => {
    const dateA = a.updated || a.date || "";
    const dateB = b.updated || b.date || "";
    return dateB.localeCompare(dateA);
  });
}

export function filterByCategory(all: (Frontmatter & { slug: string })[], cat: string) {
  const c = (cat || "").toLowerCase();
  return all.filter((g) => (g.category || "").toLowerCase().includes(c));
}

export async function getRecentGuides(n = 6) {
  const all = await getAllGuides();
  return all.slice(0, n);
}

export const getGuideBySlug = cache(async (slug: string) => {
  const candidatePaths = [
    path.join(GUIDES_DIR, `${slug}.mdx`),
    path.join(APP_KOSTTILSKUD_DIR, slug, "page.mdx"),
    path.join(APP_PRODUKTER_DIR, slug, "content.mdx"),
  ];
  let source = "";
  let found = "";
  for (const p of candidatePaths) {
    try {
      source = await fs.readFile(p, "utf8");
      found = p;
      break;
    } catch { /* next */ }
  }
  if (!found) {
    const normalize = (value: string) => slugifyDa(value).replace(/-/g, "");
    const normalizedSlug = normalize(slug);
    const tryResolveDir = async (baseDir: string) => {
      try {
        const entries = await fs.readdir(baseDir, { withFileTypes: true });
        for (const entry of entries) {
          if (!entry.isDirectory()) continue;
          if (normalize(entry.name) !== normalizedSlug) continue;
          for (const fname of ["page.mdx", "content.mdx"]) {
            const filePath = path.join(baseDir, entry.name, fname);
            try {
              source = await fs.readFile(filePath, "utf8");
              found = filePath;
              return true;
            } catch { /* next */ }
          }
        }
      } catch { /* next */ }
      return false;
    };
    await tryResolveDir(APP_KOSTTILSKUD_DIR);
    if (!found) await tryResolveDir(APP_PRODUKTER_DIR);
  }
  if (!found) {
    throw new Error(`Guide not found for slug: ${slug}`);
  }

  const { content, frontmatter } = await compileMDX<Frontmatter>({
    source,
    options: {
      parseFrontmatter: true,
      mdxOptions: {
        remarkPlugins: [remarkGfm],
        rehypePlugins: [
          rehypeSlug,
          [rehypeAutolinkHeadings, { behavior: "wrap" }] as any,
        ],
      },
    },
    components: {
      // Core
      ProductCard,
      ProsCons,
      FAQ,
      ProductRating,
      RatingBar,
      ComparisonTable,
      Breadcrumbs,
      Toc,
      AffiliateDisclosure,
      RelatedArticles,
      // Product review
      ProductFit,
      QuickVerdict,
      QuickFactsGrid,
      // Health-specific
      EvidenceTable,
      SegmentPicker,
      SafetyBlock,
      SourceList,
      UpdateLog,
      MethodBox,
      // EEAT & editorial
      EditorialSignoff,
      EeatBox: EEATBox,
      AuthorCard,
      // Category page
      QuickGuideCards,
      TestSummary,
      CriteriaWeightBars,
      SeoJsonLd,
      // Buying guide
      DecisionMap,
      IngredientComparisonTable,
      PriceEconomyGraph,
      SupplementStacking,
      SupplementRoutine,
      ConsumerProfiles,
      DosageGuide,
      CommonMistakes,
      // Methodology
      TestSteps,
      MeasurementPoints,
      ScenarioBoxes,
      DifferenceHighlights,
    },
  });

  return { Content: content, meta: frontmatter };
});
