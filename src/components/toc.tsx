"use client"

import { useEffect, useState } from "react"

interface TocItem {
  id: string
  text: string
}

export function Toc() {
  const [headings, setHeadings] = useState<TocItem[]>([])

  useEffect(() => {
    const slugify = (input: string): string =>
      input
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")

    const scope = document.querySelector("article.category-test") || document
    const els = scope.querySelectorAll("h2")
    const used = new Set<string>()
    const items: TocItem[] = []

    els.forEach((el) => {
      const text = (el.textContent || "").trim()
      if (!text) return
      // Ignore the TOC heading itself.
      if (/^indhold$/i.test(text)) return

      let id = (el as HTMLElement).id?.trim()
      if (!id) {
        const base = slugify(text) || "section"
        id = base
        let suffix = 2
        while (used.has(id) || scope.querySelector(`#${CSS.escape(id)}`)) {
          id = `${base}-${suffix}`
          suffix++
        }
        ;(el as HTMLElement).id = id
      }

      used.add(id)
      items.push({ id, text })
    })

    setHeadings(items)
  }, [])

  if (headings.length === 0) return null

  return (
    <nav className="my-8 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-slate-500">
        Indhold
      </h2>
      <ol className="space-y-1.5">
        {headings.map((h, i) => (
          <li key={h.id}>
            <a
              href={`#${h.id}`}
              className="flex items-start gap-2 text-sm text-slate-600 transition-colors hover:text-green-700"
            >
              <span className="mt-px flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-medium text-slate-500">
                {i + 1}
              </span>
              <span className="leading-snug">{h.text}</span>
            </a>
          </li>
        ))}
      </ol>
    </nav>
  )
}
