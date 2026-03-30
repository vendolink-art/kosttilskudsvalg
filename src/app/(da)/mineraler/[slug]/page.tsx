import type { Metadata } from "next"
import { generateSiloPageMetadata, SiloCategoryPage } from "@/lib/category-page-handler"
import { getSiloCategorySlugs } from "@/lib/static-params"

export async function generateStaticParams() {
  const slugs = await getSiloCategorySlugs("mineraler")
  return slugs.map((slug) => ({ slug }))
}

interface PageProps { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  return generateSiloPageMetadata(slug, "mineraler")
}

export default async function Page({ params }: PageProps) {
  const { slug } = await params
  return <SiloCategoryPage slug={slug} siloId="mineraler" />
}
