import type { MDXComponents } from "mdx/types"
import Image from "next/image"

// Core
import { ProductCard } from "@/components/product-card"
import { ProsCons } from "@/components/pros-cons"
import { FAQ } from "@/components/faq"
import { ProductRating, RatingBar } from "@/components/product-rating"
import { ComparisonTable } from "@/components/comparison-table"
import { Breadcrumbs } from "@/components/breadcrumbs"
import { Toc } from "@/components/toc"
import { AffiliateDisclosure } from "@/components/affiliate-disclosure"
import { RelatedArticles } from "@/components/related-articles"

// Product review
import { ProductFit } from "@/components/product-fit"
import { QuickVerdict } from "@/components/quick-verdict"
import { QuickFactsGrid } from "@/components/quick-facts-grid"

// Health-specific
import { EvidenceTable } from "@/components/evidence-table"
import { SegmentPicker } from "@/components/segment-picker"
import { SafetyBlock } from "@/components/safety-block"
import { SourceList } from "@/components/source-list"
import { UpdateLog } from "@/components/update-log"
import { MethodBox } from "@/components/method-box"

// EEAT & editorial
import { EditorialSignoff } from "@/components/editorial-signoff"
import { EEATBox } from "@/components/eeat-box"
import { AuthorCard } from "@/components/author-card"

// Category page
import { QuickGuideCards } from "@/components/quick-guide-cards"
import { TestSummary } from "@/components/test-summary"
import { CriteriaWeightBars } from "@/components/criteria-weight-bars"
import { SeoJsonLd } from "@/components/seo-jsonld"

// Buying guide
import { DecisionMap } from "@/components/buying-guide/decision-map"
import { IngredientComparisonTable } from "@/components/buying-guide/ingredient-comparison-table"
import { PriceEconomyGraph } from "@/components/buying-guide/price-economy-graph"
import { SupplementStacking } from "@/components/buying-guide/supplement-stacking"
import { SupplementRoutine } from "@/components/buying-guide/supplement-routine"
import { ConsumerProfiles } from "@/components/buying-guide/consumer-profiles"
import { DosageGuide } from "@/components/buying-guide/dosage-guide"
import { CommonMistakes } from "@/components/buying-guide/common-mistakes"

// Methodology
import { TestSteps } from "@/components/methodology/test-steps"
import { MeasurementPoints } from "@/components/methodology/measurement-points"
import { ScenarioBoxes } from "@/components/methodology/scenario-boxes"
import { DifferenceHighlights } from "@/components/methodology/difference-highlights"

export function useMDXComponents(components: MDXComponents): MDXComponents {
  return {
    ...components,
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
    img: (props) => {
      const width = props.width ? Number(props.width) : 800
      const height = props.height ? Number(props.height) : 800
      return (
        <Image
          src={props.src as string}
          alt={props.alt || ""}
          width={width}
          height={height}
          className={props.className}
        />
      )
    },
  }
}
