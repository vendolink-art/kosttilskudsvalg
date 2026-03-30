"use client"

import { useEffect, useState } from "react"

interface TocItem {
  id: string
  text: string
  level: number
}

export function GuideToc() {
  const [headings, setHeadings] = useState<TocItem[]>([])
  const [activeId, setActiveId] = useState<string>("")
  const [isOpen, setIsOpen] = useState(true)

  useEffect(() => {
    const scope = document.querySelector("[data-guide-body]") || document
    const els = scope.querySelectorAll("h2, h3")
    const items: TocItem[] = []

    els.forEach((el) => {
      const text = (el.textContent || "").trim()
      if (!text || /^indhold$/i.test(text)) return
      const id = (el as HTMLElement).id
      if (!id) return
      const level = el.tagName === "H2" ? 2 : 3
      items.push({ id, text, level })
    })

    setHeadings(items)
  }, [])

  useEffect(() => {
    if (headings.length === 0) return
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter(e => e.isIntersecting)
        if (visible.length > 0) {
          setActiveId(visible[0].target.id)
        }
      },
      { rootMargin: "-80px 0px -70% 0px", threshold: 0.1 }
    )

    headings.forEach(h => {
      const el = document.getElementById(h.id)
      if (el) observer.observe(el)
    })

    return () => observer.disconnect()
  }, [headings])

  if (headings.length === 0) return null

  const h2Only = headings.filter(h => h.level === 2)

  return (
    <nav className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-5 text-left hover:bg-slate-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h7" />
            </svg>
          </div>
          <span className="text-sm font-bold text-slate-900">Indhold</span>
          <span className="text-xs text-slate-400 font-medium">{h2Only.length} afsnit</span>
        </div>
        <svg
          className={`w-4 h-4 text-slate-400 transition-transform ${isOpen ? "rotate-180" : ""}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="px-5 pb-5 pt-0">
          <div className="border-t border-slate-100 pt-4">
            <ol className="space-y-0.5">
              {headings.map((h) => (
                <li key={h.id}>
                  <a
                    href={`#${h.id}`}
                    className={`flex items-start gap-2.5 rounded-lg px-3 py-2 text-sm transition-all ${
                      h.level === 3 ? "pl-8" : ""
                    } ${
                      activeId === h.id
                        ? "bg-emerald-50 text-emerald-800 font-medium"
                        : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                    }`}
                  >
                    {h.level === 2 && (
                      <span className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md text-[10px] font-bold ${
                        activeId === h.id
                          ? "bg-emerald-200 text-emerald-800"
                          : "bg-slate-100 text-slate-500"
                      }`}>
                        {headings.filter(x => x.level === 2).indexOf(h) + 1}
                      </span>
                    )}
                    {h.level === 3 && (
                      <span className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${
                        activeId === h.id ? "bg-emerald-400" : "bg-slate-300"
                      }`} />
                    )}
                    <span className="leading-snug">{h.text}</span>
                  </a>
                </li>
              ))}
            </ol>
          </div>
        </div>
      )}
    </nav>
  )
}
