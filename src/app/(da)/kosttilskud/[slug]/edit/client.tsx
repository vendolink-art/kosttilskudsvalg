"use client"

import { useState } from "react"
import Link from "next/link"

interface CategoryEditClientProps {
  slug: string
  title: string
  content: string
  frontmatter: Record<string, any>
}

export function CategoryEditClient({ slug, title, content, frontmatter }: CategoryEditClientProps) {
  const [mdxContent, setMdxContent] = useState(content)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState("")

  const handleSave = async () => {
    setSaving(true)
    setMessage("")

    try {
      // Reconstruct the full MDX with frontmatter
      const frontmatterStr = Object.entries(frontmatter)
        .map(([key, value]) => {
          if (Array.isArray(value)) {
            return `${key}:\n${value.map(v => `  - "${v}"`).join("\n")}`
          }
          if (typeof value === "boolean") return `${key}: ${value}`
          return `${key}: "${value}"`
        })
        .join("\n")

      const fullContent = `---\n${frontmatterStr}\n---\n\n${mdxContent}`

      const res = await fetch("/api/category-page/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, content: fullContent }),
      })

      if (res.ok) {
        setMessage("Gemt!")
      } else {
        setMessage("Fejl ved gemning")
      }
    } catch {
      setMessage("Netværksfejl")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <Link
            href={`/kosttilskud/${slug}`}
            className="text-sm text-slate-500 hover:text-slate-700"
          >
            &larr; Tilbage til {title}
          </Link>
          <h1 className="mt-1 text-2xl font-bold text-slate-900">
            Rediger: {title}
          </h1>
        </div>
        <div className="flex items-center gap-3">
          {message && (
            <span className={`text-sm ${message === "Gemt!" ? "text-green-600" : "text-red-600"}`}>
              {message}
            </span>
          )}
          <button
            onClick={handleSave}
            disabled={saving}
            className="rounded-lg bg-green-700 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-green-800 disabled:opacity-50"
          >
            {saving ? "Gemmer..." : "Gem ændringer"}
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-1">
        <textarea
          value={mdxContent}
          onChange={(e) => setMdxContent(e.target.value)}
          className="h-[70vh] w-full resize-none rounded-lg border-0 p-4 font-mono text-sm text-slate-800 focus:ring-0"
          spellCheck={false}
        />
      </div>
    </div>
  )
}
