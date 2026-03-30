import { notFound } from "next/navigation"
import { promises as fs } from "fs"
import path from "path"
import matter from "gray-matter"
import { compileMDX } from "next-mdx-remote/rsc"
import remarkGfm from "remark-gfm"
import rehypeSlug from "rehype-slug"
import rehypeAutolinkHeadings from "rehype-autolink-headings"
import { Breadcrumbs } from "@/components/breadcrumbs"
import { ProductCard } from "@/components/product-card"
import { ProsCons } from "@/components/pros-cons"
import { FAQ } from "@/components/faq"
import { ProductRating } from "@/components/product-rating"
import { ComparisonTable } from "@/components/comparison-table"
import { EditorialSignoff } from "@/components/editorial-signoff"
import { MethodBox } from "@/components/method-box"
import { SafetyBlock } from "@/components/safety-block"
import { AffiliateDisclosure } from "@/components/affiliate-disclosure"
import { UpdateLog } from "@/components/update-log"
import { SourceList } from "@/components/source-list"
import { EvidenceTable } from "@/components/evidence-table"
import { SegmentPicker } from "@/components/segment-picker"
import type { Metadata } from "next"
import type { Frontmatter } from "@/lib/mdx"

interface PageProps {
  params: Promise<{ slug: string }>
}

async function getProductContent(slug: string) {
  const mdxPath = path.join(
    process.cwd(), "src", "app", "(da)", "kosttilskud", "produkter", slug, "content.mdx"
  )
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
      components: {
        ProductCard,
        ProsCons,
        FAQ,
        ProductRating,
        ComparisonTable,
        Breadcrumbs,
        EditorialSignoff,
        MethodBox,
        SafetyBlock,
        AffiliateDisclosure,
        UpdateLog,
        SourceList,
        EvidenceTable,
        SegmentPicker,
      },
    })
    return { frontmatter: data as Frontmatter, Content: content, exists: true }
  } catch {
    return { frontmatter: null, Content: null, exists: false }
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const { frontmatter } = await getProductContent(slug)
  if (!frontmatter) return { title: "Ikke fundet" }

  const title = frontmatter.title
  const description = frontmatter.description || `Uafhængig analyse af ${frontmatter.title}.`

  return {
    title,
    description,
    alternates: { canonical: `https://www.kosttilskudsvalg.dk/kosttilskud/produkter/${slug}` },
    openGraph: {
      title,
      description,
      type: "article",
      locale: "da_DK",
      siteName: "Kosttilskudsvalg",
    },
  }
}

export default async function ProductPage({ params }: PageProps) {
  const { slug } = await params
  const { frontmatter, Content, exists } = await getProductContent(slug)

  if (!exists || !frontmatter || !Content) {
    notFound()
  }

  const updated = (frontmatter as any).updated || (frontmatter as any).date || ""
  const author = (frontmatter as any).author || "anna-vestergaard"
  const category = (frontmatter as any).category || "Kosttilskud"

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      <Breadcrumbs items={[
        { name: "Kosttilskud", href: "/kosttilskud" },
        ...(category !== "Kosttilskud" ? [{ name: category, href: `/kosttilskud/${slug.split("-")[0]}` }] : []),
        { name: frontmatter.title, href: `/kosttilskud/produkter/${slug}` },
      ]} />

      {/* Affiliate disclosure – YMYL krav: transparent ovanför fold */}
      <AffiliateDisclosure />

      <article className="category-test prose prose-slate max-w-none">
        {Content}
      </article>

      {/* Editorial signoff */}
      <EditorialSignoff
        author={author}
        lastUpdated={updated}
      />

      {/* BreadcrumbList schema */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
              { "@type": "ListItem", position: 1, name: "Forside", item: "https://www.kosttilskudsvalg.dk/" },
              { "@type": "ListItem", position: 2, name: "Kosttilskud", item: "https://www.kosttilskudsvalg.dk/kosttilskud" },
              { "@type": "ListItem", position: 3, name: frontmatter.title, item: `https://www.kosttilskudsvalg.dk/kosttilskud/produkter/${slug}` },
            ],
          }),
        }}
      />

      {/* Product JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Product",
            name: frontmatter.title,
            description: frontmatter.description || `Uafhængig analyse af ${frontmatter.title}.`,
            ...((frontmatter as any).source_image ? { image: (frontmatter as any).source_image } : {}),
            url: `https://www.kosttilskudsvalg.dk/kosttilskud/produkter/${slug}`,
            review: {
              "@type": "Review",
              author: { "@type": "Organization", name: "Kosttilskudsvalg" },
              datePublished: (frontmatter as any).date || updated,
              dateModified: updated,
              reviewBody: frontmatter.description,
            },
          }),
        }}
      />

      {/* Article schema */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Article",
            headline: frontmatter.title,
            description: frontmatter.description,
            url: `https://www.kosttilskudsvalg.dk/kosttilskud/produkter/${slug}`,
            ...((frontmatter as any).source_image ? { image: (frontmatter as any).source_image } : {}),
            datePublished: (frontmatter as any).date || updated,
            dateModified: updated,
            author: {
              "@type": "Person",
              name: "Anna Vestergaard",
              jobTitle: "Sportsernæring & produktanalytiker",
            },
            reviewer: {
              "@type": "Person",
              name: "Mikkel Rasmussen",
              jobTitle: "Klinisk diætist & faglig reviewer",
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
  )
}
