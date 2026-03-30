import { permanentRedirect } from "next/navigation"
import { getSiloForSlug } from "@/lib/silo-config"

export const dynamic = "force-dynamic"

interface PageProps {
  params: Promise<{ slug: string }>
}

export default async function CategoryRedirect({ params }: PageProps) {
  const { slug } = await params
  const silo = getSiloForSlug(slug)
  permanentRedirect(`${silo.href}/${slug}`)
}
