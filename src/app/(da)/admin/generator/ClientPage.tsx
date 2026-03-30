"use client"

import { useState } from "react"
import Link from "next/link"

type GenerateResponse = {
  ok?: boolean
  error?: string
  model?: string
  sourceUrl?: string
  generatedHtml?: string
  saved?: boolean
}

type HybridCategoryResponse = {
  ok?: boolean
  error?: string
  categorySlug?: string
  sectionPath?: string
  productSlugs?: string[]
  logs?: string[]
}

export default function ClientPage() {
  const [slug, setSlug] = useState("")
  const [keyword, setKeyword] = useState("")
  const [comparisonTopic, setComparisonTopic] = useState("")
  const [awardContext, setAwardContext] = useState("")

  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<GenerateResponse | null>(null)
  const [status, setStatus] = useState("")
  const [categorySlug, setCategorySlug] = useState("")
  const [sectionPath, setSectionPath] = useState("protein-traening")
  const [categoryKeyword, setCategoryKeyword] = useState("")
  const [categoryProductSlugs, setCategoryProductSlugs] = useState("")
  const [categoryLoading, setCategoryLoading] = useState(false)
  const [categoryStatus, setCategoryStatus] = useState("")
  const [categoryResult, setCategoryResult] = useState<HybridCategoryResponse | null>(null)

  async function run(save: boolean) {
    if (!slug.trim()) return
    setLoading(true)
    setStatus(save ? "Genererer og gemmer..." : "Genererer preview...")
    setResult(null)

    try {
      const res = await fetch("/api/admin/generator/product", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug: slug.trim(),
          keyword: keyword.trim(),
          comparisonTopic: comparisonTopic.trim(),
          awardContext: awardContext.trim(),
          save,
        }),
      })
      const data = (await res.json()) as GenerateResponse
      setResult(data)
      setStatus(data.ok ? (save ? "Gemt til content.mdx" : "Preview klar") : `Fejl: ${data.error || "ukendt"}`)
    } catch {
      setStatus("Fejl: Netværksproblem")
    } finally {
      setLoading(false)
    }
  }

  async function runCategoryHybrid() {
    if (!categorySlug.trim() || !categoryProductSlugs.trim()) return
    const productSlugs = categoryProductSlugs
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
    if (productSlugs.length === 0) return

    setCategoryLoading(true)
    setCategoryStatus("Kører hybrid-flow...")
    setCategoryResult(null)
    try {
      const res = await fetch("/api/admin/generator/category-hybrid", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          categorySlug: categorySlug.trim(),
          sectionPath: sectionPath.trim(),
          keyword: categoryKeyword.trim() || categorySlug.trim(),
          productSlugs,
          recrawl: true,
          rewriteProducts: true,
        }),
      })
      const data = (await res.json()) as HybridCategoryResponse
      setCategoryResult(data)
      setCategoryStatus(data.ok ? "Hybrid-regenerering klar (legacy-layout bevaret)." : `Fejl: ${data.error || "ukendt"}`)
    } catch {
      setCategoryStatus("Fejl: Netværksproblem")
    } finally {
      setCategoryLoading(false)
    }
  }

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Generator</h1>
        <Link href="/admin" className="text-sm text-slate-500 hover:text-slate-700">
          &larr; Tilbage
        </Link>
      </div>

      <div className="mb-6 rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500">API-nøgle og model</h2>
        <p className="mt-2 text-sm text-slate-700">
          Generatoren læser <code>OPENAI_API_KEY</code> fra <code>.env.local</code> og bruger modellen{" "}
          <code>OPENAI_MODEL</code> (fallback: <code>gpt-5.4</code>).
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-slate-500">
            Regenerer produktside
          </h2>

          <div className="space-y-3">
            <div>
              <label className="lbl">Produkt-slug</label>
              <input
                value={slug}
                onChange={e => setSlug(e.target.value)}
                placeholder="fx bodylab-pre-workout-200-g-lemon"
                className="input-field"
              />
            </div>
            <div>
              <label className="lbl">Keyword (valgfri override)</label>
              <input
                value={keyword}
                onChange={e => setKeyword(e.target.value)}
                placeholder="fx pre workout"
                className="input-field"
              />
            </div>
            <div>
              <label className="lbl">Comparison topic (valgfri)</label>
              <input
                value={comparisonTopic}
                onChange={e => setComparisonTopic(e.target.value)}
                placeholder="fx pre-workout i Danmark"
                className="input-field"
              />
            </div>
            <div>
              <label className="lbl">Award context (valgfri)</label>
              <input
                value={awardContext}
                onChange={e => setAwardContext(e.target.value)}
                placeholder="fx Bedst i test 2026"
                className="input-field"
              />
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-3">
            <button
              onClick={() => run(false)}
              disabled={loading || !slug.trim()}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              {loading ? "Arbejder..." : "Generer preview"}
            </button>
            <button
              onClick={() => run(true)}
              disabled={loading || !slug.trim()}
              className="rounded-lg bg-green-700 px-4 py-2 text-sm font-medium text-white hover:bg-green-800 disabled:opacity-50"
            >
              {loading ? "Arbejder..." : "Generer + gem"}
            </button>
          </div>

          {status && <p className="mt-4 text-sm text-slate-700">{status}</p>}
          {result?.sourceUrl && (
            <p className="mt-2 break-all text-xs text-slate-500">
              Kilde: <code>{result.sourceUrl}</code>
            </p>
          )}
          {result?.model && (
            <p className="mt-1 text-xs text-slate-500">
              Model: <code>{result.model}</code>
            </p>
          )}
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-500">Kategorisider (hybrid)</h2>
          <p className="text-sm text-slate-700">
            Dette flow bevarer legacy-layout (small toplist, TOC, produktbokse), men opdaterer indhold via de nye generatorer.
          </p>
          <div className="mt-4 space-y-3">
            <div>
              <label className="lbl">Kategori-slug</label>
              <input
                value={categorySlug}
                onChange={e => setCategorySlug(e.target.value)}
                placeholder="fx kreatin"
                className="input-field"
              />
            </div>
            <div>
              <label className="lbl">Sektion-path</label>
              <input
                value={sectionPath}
                onChange={e => setSectionPath(e.target.value)}
                placeholder="fx protein-traening"
                className="input-field"
              />
            </div>
            <div>
              <label className="lbl">Keyword</label>
              <input
                value={categoryKeyword}
                onChange={e => setCategoryKeyword(e.target.value)}
                placeholder="fx kreatin"
                className="input-field"
              />
            </div>
            <div>
              <label className="lbl">Produkt-slugs (komma-separeret)</label>
              <input
                value={categoryProductSlugs}
                onChange={e => setCategoryProductSlugs(e.target.value)}
                placeholder="slug-1,slug-2,slug-3"
                className="input-field"
              />
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-3">
            <button
              onClick={runCategoryHybrid}
              disabled={categoryLoading || !categorySlug.trim() || !categoryProductSlugs.trim()}
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
            >
              {categoryLoading ? "Kører..." : "Regenerer kategori (hybrid)"}
            </button>
            <Link
              href="/admin/ai"
              className="inline-flex rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Åbn sektion-preview (/admin/ai)
            </Link>
          </div>
          {categoryStatus && <p className="mt-3 text-sm text-slate-700">{categoryStatus}</p>}
          {Array.isArray(categoryResult?.logs) && categoryResult?.logs?.length ? (
            <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
              <pre className="whitespace-pre-wrap text-xs font-mono text-slate-600">
                {categoryResult.logs.join("\n")}
              </pre>
            </div>
          ) : null}
        </div>
      </div>

      <div className="mt-6 rounded-xl border border-slate-200 bg-white">
        <div className="border-b border-slate-100 px-4 py-3">
          <h3 className="text-sm font-semibold text-slate-700">Preview (HTML)</h3>
        </div>
        <div className="max-h-[640px] overflow-auto p-4">
          <pre className="whitespace-pre-wrap text-xs font-mono leading-relaxed text-slate-600">
            {result?.generatedHtml || "Ingen preview endnu."}
          </pre>
        </div>
      </div>

      <style jsx>{`
        .input-field {
          display: block;
          width: 100%;
          border-radius: 0.5rem;
          border: 1px solid #e2e8f0;
          padding: 0.5rem 0.75rem;
          font-size: 0.875rem;
          color: #1e293b;
          background: #fff;
        }
        .input-field:focus {
          outline: none;
          border-color: #16a34a;
          box-shadow: 0 0 0 2px rgba(22, 163, 74, 0.15);
        }
        .lbl {
          display: block;
          font-size: 0.75rem;
          font-weight: 500;
          color: #64748b;
          margin-bottom: 0.25rem;
        }
      `}</style>
    </div>
  )
}

