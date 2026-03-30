import { permanentRedirect } from "next/navigation"
import { getSiloForSlug } from "@/lib/silo-config"
import { getCategorySlugs } from "@/lib/static-params"

export async function generateStaticParams() {
  const slugs = await getCategorySlugs()
  return slugs.map((slug) => ({ slug }))
}

interface PageProps {
  params: Promise<{ slug: string }>
}

export default async function CategoryRedirect({ params }: PageProps) {
  const { slug } = await params
  const silo = getSiloForSlug(slug)
  permanentRedirect(`${silo.href}/${slug}`)
}
