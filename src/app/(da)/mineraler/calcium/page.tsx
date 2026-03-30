import type { Metadata } from "next"
import { generateSiloPageMetadata, SiloCategoryPage } from "@/lib/category-page-handler"

export async function generateMetadata(): Promise<Metadata> {
  return generateSiloPageMetadata("calcium", "mineraler", "kalktabletter")
}

export default function Page() {
  return <SiloCategoryPage slug="calcium" siloId="mineraler" contentSlug="kalktabletter" />
}
