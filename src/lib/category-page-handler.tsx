/**
 * category-page-handler.tsx
 *
 * Shared logic for all 5 silo route handlers.
 * Reads MDX from the original kosttilskud/ directory (content stays there),
 * but renders under the new silo URLs.
 */

import { notFound } from "next/navigation"
import { promises as fs } from "fs"
import path from "path"
import matter from "gray-matter"
import { compileMDX } from "next-mdx-remote/rsc"
import remarkGfm from "remark-gfm"
import rehypeSlug from "rehype-slug"
import rehypeAutolinkHeadings from "rehype-autolink-headings"
import type { Metadata } from "next"
import type { Frontmatter } from "@/lib/mdx"
import { SLUG_TO_SILO, SILOS, type SiloId } from "@/lib/silo-config"
import { getAuthor } from "@/config/authors"

// ── Components ────────────────────────────────────────────────────
import { Breadcrumbs } from "@/components/breadcrumbs"
import { ProductCard } from "@/components/product-card"
import { ProsCons } from "@/components/pros-cons"
import { FAQ } from "@/components/faq"
import { ProductRating, RatingBar } from "@/components/product-rating"
import { ComparisonTable } from "@/components/comparison-table"
import { EditorialSignoff } from "@/components/editorial-signoff"
import { MethodBox } from "@/components/method-box"
import { SafetyBlock } from "@/components/safety-block"
import { AffiliateDisclosure } from "@/components/affiliate-disclosure"
import { UpdateLog } from "@/components/update-log"
import { SourceList } from "@/components/source-list"
import { EvidenceTable } from "@/components/evidence-table"
import { SegmentPicker } from "@/components/segment-picker"
import { ProductFit } from "@/components/product-fit"
import { Toc } from "@/components/toc"
import { CriteriaWeightBars } from "@/components/criteria-weight-bars"
import { TestSummary } from "@/components/test-summary"
import { EEATBox } from "@/components/eeat-box"
import { QuickGuideCards } from "@/components/quick-guide-cards"
import { RelatedArticles } from "@/components/related-articles"
import { QuickVerdict } from "@/components/quick-verdict"
import { QuickFactsGrid } from "@/components/quick-facts-grid"
import { SeoJsonLd } from "@/components/seo-jsonld"
import { DecisionMap } from "@/components/buying-guide/decision-map"
import { IngredientComparisonTable } from "@/components/buying-guide/ingredient-comparison-table"
import { PriceEconomyGraph } from "@/components/buying-guide/price-economy-graph"
import { SupplementStacking } from "@/components/buying-guide/supplement-stacking"
import { SupplementRoutine } from "@/components/buying-guide/supplement-routine"
import { ConsumerProfiles } from "@/components/buying-guide/consumer-profiles"
import { DosageGuide } from "@/components/buying-guide/dosage-guide"
import { CommonMistakes } from "@/components/buying-guide/common-mistakes"
import { TestSteps } from "@/components/methodology/test-steps"
import { MeasurementPoints } from "@/components/methodology/measurement-points"
import { ScenarioBoxes } from "@/components/methodology/scenario-boxes"
import { DifferenceHighlights } from "@/components/methodology/difference-highlights"

const MDX_COMPONENTS = {
  ProductCard, ProsCons, FAQ, ProductRating, RatingBar, ComparisonTable, Breadcrumbs,
  EditorialSignoff, MethodBox, SafetyBlock, AffiliateDisclosure, UpdateLog,
  SourceList, EvidenceTable, SegmentPicker, ProductFit, Toc,
  CriteriaWeightBars, TestSummary, EEATBox, EeatBox: EEATBox,
  QuickGuideCards, RelatedArticles, QuickVerdict, QuickFactsGrid, SeoJsonLd,
  DecisionMap, IngredientComparisonTable, PriceEconomyGraph,
  SupplementStacking, SupplementRoutine, ConsumerProfiles,
  DosageGuide, CommonMistakes, TestSteps, MeasurementPoints,
  ScenarioBoxes, DifferenceHighlights,
}

/** Read & compile MDX from the original kosttilskud directory */
async function getCategoryContent(slug: string) {
  const mdxPath = path.join(process.cwd(), "src", "app", "(da)", "kosttilskud", slug, "page.mdx")
  try {
    const raw = await fs.readFile(mdxPath, "utf8")
    const { data } = matter(raw)
    const { content } = await compileMDX<Frontmatter>({
      source: raw,
      options: {
        parseFrontmatter: true,
        mdxOptions: {
          remarkPlugins: [remarkGfm],
          rehypePlugins: [rehypeSlug, [rehypeAutolinkHeadings, { behavior: "wrap" }] as any],
        },
      },
      components: MDX_COMPONENTS,
    })
    return { frontmatter: data as any, Content: content, exists: true }
  } catch (err) {
    console.error("MDX Compile Error for slug:", slug, err)
    return { frontmatter: null, Content: null, exists: false }
  }
}

/** Generate metadata for a category page within a specific silo */
export async function generateSiloPageMetadata(
  slug: string,
  siloId: SiloId,
  contentSlug?: string
): Promise<Metadata> {
  const sourceSlug = contentSlug || slug
  const { frontmatter } = await getCategoryContent(sourceSlug)
  if (!frontmatter) return { title: "Ikke fundet" }

  const silo = SILOS[siloId]
  const title = frontmatter.meta_title || frontmatter.title
  const description = frontmatter.description ||
    `Uafhængig analyse og sammenligning af ${frontmatter.title?.toLowerCase()} på det danske marked.`

  return {
    title,
    description,
    alternates: { canonical: `https://www.kosttilskudsvalg.dk/${siloId}/${slug}` },
    openGraph: {
      title,
      description,
      url: `https://www.kosttilskudsvalg.dk/${siloId}/${slug}`,
      type: "article",
      locale: "da_DK",
      siteName: "Kosttilskudsvalg",
    },
  }
}

/** Render a category page within a specific silo */
export async function SiloCategoryPage({
  slug,
  siloId,
  contentSlug,
}: {
  slug: string
  siloId: SiloId
  contentSlug?: string
}) {
  const sourceSlug = contentSlug || slug
  // Validate slug belongs to this silo
  const expectedSilo = SLUG_TO_SILO[sourceSlug] || SLUG_TO_SILO[slug]
  if (expectedSilo && expectedSilo !== siloId) {
    // Slug exists but belongs to a different silo → 404
    notFound()
  }

  const { frontmatter, Content, exists } = await getCategoryContent(sourceSlug)
  if (!exists || !frontmatter || !Content) {
    notFound()
  }

  const silo = SILOS[siloId]
  const updated = frontmatter.updated || frontmatter.date || ""
  const author = frontmatter.author || "line-kragelund"
  const authorData = getAuthor(author)
  const visibleH1 = frontmatter.h1 || frontmatter.title
  const slogan = frontmatter.tagline || frontmatter.slogan || ""
  const bannerFromMeta = frontmatter.banner as string | undefined
  const fallbackBanner = `/images/heroes/${sourceSlug}-banner.webp`
  let banner: string | undefined = bannerFromMeta
  if (!bannerFromMeta) {
    try {
      const abs = path.join(process.cwd(), "public", "images", "heroes", `${sourceSlug}-banner.webp`)
      await fs.access(abs)
      banner = fallbackBanner
    } catch {}
  }

  return (
    <>
      {/* ─── HERO BANNER ─── */}
      <div className="hero-banner not-prose relative left-1/2 right-1/2 -mx-[50vw] w-screen max-w-[100vw]">
        {banner ? (
          <>
            <img
              src={banner}
              alt=""
              className="hero-img h-[210px] w-full object-cover blur-[1px] md:blur-[1.5px] sm:h-[280px] md:h-[360px] lg:h-[420px]"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/45 to-black/30" />
          </>
        ) : (
          <div className="h-[210px] w-full bg-gradient-to-br from-green-800 via-green-700 to-emerald-600 sm:h-[280px] md:h-[360px] lg:h-[420px]" />
        )}
        <div className="absolute inset-0 z-10 flex h-full flex-col items-center justify-center px-4 text-center">
          <div className="mb-4 hidden sm:block">
            <Breadcrumbs variant="dark" items={[
              { name: silo.label, href: silo.href },
              { name: frontmatter.title, href: `/${siloId}/${slug}` },
            ]} />
          </div>
          <h1 className="max-w-3xl text-lg font-extrabold leading-tight text-white drop-shadow-lg sm:text-2xl md:text-4xl lg:text-5xl">
            {visibleH1}
          </h1>
          {slogan && (
            <span className="mt-2 block max-w-2xl text-xs italic text-white/85 sm:text-sm md:text-base lg:text-lg">
              {slogan}
            </span>
          )}
        </div>
      </div>

      {/* ─── MAIN CONTENT ─── */}
      <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 lg:px-8">
        <EEATBox
          authorSlug={author}
          reviewerSlug="mikkel-rasmussen"
          updated={updated}
        />
        {/* Must appear before the "small toplist" in MDX content */}
        <AffiliateDisclosure />
        <article className="category-test prose prose-slate max-w-none">
          {Content}
        </article>

        {/* BreadcrumbList Schema */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "BreadcrumbList",
              itemListElement: [
                { "@type": "ListItem", position: 1, name: "Forside", item: "https://www.kosttilskudsvalg.dk/" },
                { "@type": "ListItem", position: 2, name: silo.label, item: `https://www.kosttilskudsvalg.dk${silo.href}` },
                { "@type": "ListItem", position: 3, name: frontmatter.title, item: `https://www.kosttilskudsvalg.dk/${siloId}/${slug}` },
              ],
            }),
          }}
        />
        {/* Article Schema */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Article",
              headline: frontmatter.title,
              description: frontmatter.description || `Uafhængig analyse og sammenligning af ${(frontmatter.title || "").toLowerCase()} på det danske marked.`,
              url: `https://www.kosttilskudsvalg.dk/${siloId}/${slug}`,
              datePublished: frontmatter.date,
              dateModified: updated,
              author: {
                "@type": "Person",
                name: authorData?.name || "Line Kragelund",
                url: "https://www.kosttilskudsvalg.dk/redaktion",
              },
              publisher: {
                "@type": "Organization",
                name: "Kosttilskudsvalg",
                url: "https://www.kosttilskudsvalg.dk",
              },
            }),
          }}
        />
      </div>
    </>
  )
}
