import { Metadata } from "next"
import { notFound, redirect } from "next/navigation"
import { promises as fs } from "fs"
import path from "path"
import matter from "gray-matter"
import { isAuthenticated } from "@/lib/auth"
import { CategoryEditClient } from "./client"

interface PageProps {
  params: Promise<{ slug: string }>
}

export const metadata: Metadata = {
  robots: { index: false, follow: false, nocache: true },
}

async function getCategoryData(slug: string) {
  const mdxPath = path.join(process.cwd(), "src", "app", "(da)", "kosttilskud", slug, "page.mdx")
  try {
    const fileContent = await fs.readFile(mdxPath, "utf-8")
    const { data: frontmatter, content } = matter(fileContent)
    return { frontmatter, content, exists: true }
  } catch {
    return { frontmatter: null, content: null, exists: false }
  }
}

export default async function CategoryEditPage({ params }: PageProps) {
  const { slug } = await params

  const authenticated = await isAuthenticated()
  if (!authenticated) {
    redirect(`/admin/login?redirect=/kosttilskud/${slug}/edit`)
  }

  const { frontmatter, content, exists } = await getCategoryData(slug)
  if (!exists || !frontmatter) {
    notFound()
  }

  return (
    <CategoryEditClient
      slug={slug}
      title={frontmatter.title || slug}
      content={content || ""}
      frontmatter={frontmatter}
    />
  )
}
