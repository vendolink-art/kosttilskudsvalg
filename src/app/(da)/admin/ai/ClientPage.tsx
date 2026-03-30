"use client"

import { useState, useRef } from "react"
import Link from "next/link"
import type { ProductInput, ArticleInput } from "@/lib/prompts/types"

type Step = { id: string; heading: string; status: "pending" | "running" | "done" | "error"; content?: string }

const EMPTY_PRODUCT: ProductInput = {
  name: "",
  type: "",
  activeIngredients: "",
  dosePerServing: "",
  servingsPerPackage: 30,
  pricePerDailyDose: "",
  price: "",
  targetGroup: "",
  certifications: "",
  pros: [""],
  cons: [""],
}

const SECTION_IDS = [
  { id: "hero", heading: "Hero & H1" },
  { id: "overview", heading: "Snabb överblick" },
  { id: "method", heading: "Så här har vi testat" },
  { id: "products", heading: "Produkt för produkt" },
  { id: "table", heading: "Jämförelsetabell" },
  { id: "buyers-guide", heading: "Så väljer du" },
  { id: "safety", heading: "Säkerhet & YMYL" },
  { id: "faq", heading: "FAQ" },
  { id: "eeat", heading: "Metod & redaktion" },
]

export default function ClientPage() {
  // ─── STATE ───
  const [keyword, setKeyword] = useState("")
  const [category, setCategory] = useState("Kosttilskud")
  const [categorySlug, setCategorySlug] = useState("kosttilskud")
  const [products, setProducts] = useState<ProductInput[]>([{ ...EMPTY_PRODUCT }])
  const [bestOverall, setBestOverall] = useState("")
  const [bestBudget, setBestBudget] = useState("")
  const [bestPremium, setBestPremium] = useState("")
  const [bestAlternative, setBestAlternative] = useState("")
  const [alternativeLabel, setAlternativeLabel] = useState("Bedste veganske valg")

  const [generating, setGenerating] = useState(false)
  const [steps, setSteps] = useState<Step[]>([])
  const [fullMdx, setFullMdx] = useState("")
  const [publishing, setPublishing] = useState(false)
  const [publishSlug, setPublishSlug] = useState("")
  const [publishResult, setPublishResult] = useState("")

  const [activeTab, setActiveTab] = useState<"input" | "progress" | "preview">("input")
  const abortRef = useRef<AbortController | null>(null)

  // ─── PRODUCT HELPERS ───
  function updateProduct(idx: number, field: keyof ProductInput, value: any) {
    setProducts(prev => {
      const copy = [...prev]
      copy[idx] = { ...copy[idx], [field]: value }
      return copy
    })
  }

  function addProduct() {
    setProducts(prev => [...prev, { ...EMPTY_PRODUCT }])
  }

  function removeProduct(idx: number) {
    setProducts(prev => prev.filter((_, i) => i !== idx))
  }

  // ─── GENERATE ───
  async function handleGenerate() {
    if (!keyword.trim() || products.length === 0) return

    setGenerating(true)
    setFullMdx("")
    setActiveTab("progress")
    setSteps(SECTION_IDS.map(s => ({ ...s, status: "pending" })))

    const input: ArticleInput = {
      keyword: keyword.trim(),
      secondaryKeywords: [`bedste ${keyword.trim()}`, `${keyword.trim()} bedst i test`, `${keyword.trim()} test`],
      category,
      categorySlug,
      year: new Date().getFullYear(),
      products: products.filter(p => p.name.trim()),
      bestOverall: bestOverall || undefined,
      bestBudget: bestBudget || undefined,
      bestPremium: bestPremium || undefined,
      bestAlternative: bestAlternative || undefined,
      alternativeLabel: alternativeLabel || undefined,
    }

    abortRef.current = new AbortController()

    try {
      const res = await fetch("/api/ai/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
        signal: abortRef.current.signal,
      })

      if (!res.ok || !res.body) {
        setGenerating(false)
        return
      }

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ""

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split("\n\n")
        buffer = lines.pop() || ""

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue
          try {
            const event = JSON.parse(line.slice(6))

            if (event.type === "progress") {
              setSteps(prev => prev.map(s =>
                s.id === event.section ? { ...s, status: "running" } : s
              ))
            }

            if (event.type === "section") {
              setSteps(prev => prev.map(s =>
                s.id === event.section ? { ...s, status: "done", content: event.content } : s
              ))
            }

            if (event.type === "error") {
              setSteps(prev => prev.map(s =>
                s.id === event.section ? { ...s, status: "error", content: event.error } : s
              ))
            }

            if (event.type === "complete") {
              setFullMdx(event.fullMdx)
              setActiveTab("preview")
            }
          } catch { /* ignore parse errors */ }
        }
      }
    } catch (err: any) {
      if (err.name !== "AbortError") {
        console.error("Generate error:", err)
      }
    } finally {
      setGenerating(false)
    }
  }

  function handleAbort() {
    abortRef.current?.abort()
    setGenerating(false)
  }

  // ─── PUBLISH ───
  async function handlePublish() {
    if (!publishSlug.trim() || !fullMdx) return
    setPublishing(true)
    setPublishResult("")

    try {
      const res = await fetch("/api/category-page/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug: publishSlug.trim(), content: fullMdx }),
      })
      if (res.ok) {
        setPublishResult(`Publicerad: /kosttilskud/${publishSlug.trim()}`)
      } else {
        const data = await res.json()
        setPublishResult(`Fel: ${data.error || "Okänt fel"}`)
      }
    } catch {
      setPublishResult("Fel: Nätverksfel")
    } finally {
      setPublishing(false)
    }
  }

  // ─── RENDER ───
  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Bäst i test — artikelmotor</h1>
        <Link href="/admin" className="text-sm text-slate-500 hover:text-slate-700">&larr; Tillbaka</Link>
      </div>

      {/* Tabs */}
      <div className="mb-6 flex gap-1 rounded-lg bg-slate-100 p-1">
        {(["input", "progress", "preview"] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition ${
              activeTab === tab ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
            }`}
          >
            {tab === "input" ? "1. Inmatning" : tab === "progress" ? "2. Generering" : "3. Resultat"}
          </button>
        ))}
      </div>

      {/* ═══ TAB: INPUT ═══ */}
      {activeTab === "input" && (
        <div className="space-y-6">
          {/* Keyword + kategori */}
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-slate-500">Artikelinfo</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Primärt nyckelord</label>
                <input value={keyword} onChange={e => setKeyword(e.target.value)} placeholder="proteinpulver" className="input-field" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Kategori</label>
                <input value={category} onChange={e => setCategory(e.target.value)} placeholder="Protein" className="input-field" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Kategori-slug</label>
                <input value={categorySlug} onChange={e => setCategorySlug(e.target.value)} placeholder="protein" className="input-field" />
              </div>
            </div>
          </div>

          {/* Vindere */}
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-slate-500">Testvinnare</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Bäst i test</label>
                <input value={bestOverall} onChange={e => setBestOverall(e.target.value)} placeholder="Produktnavn" className="input-field" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Bästa budgetval</label>
                <input value={bestBudget} onChange={e => setBestBudget(e.target.value)} placeholder="Produktnavn" className="input-field" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Bästa premiumval</label>
                <input value={bestPremium} onChange={e => setBestPremium(e.target.value)} placeholder="Produktnavn" className="input-field" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">{alternativeLabel}</label>
                <input value={bestAlternative} onChange={e => setBestAlternative(e.target.value)} placeholder="Produktnavn" className="input-field" />
                <input value={alternativeLabel} onChange={e => setAlternativeLabel(e.target.value)} placeholder="Label" className="input-field mt-1 text-xs" />
              </div>
            </div>
          </div>

          {/* Produkter */}
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500">
                Produkter ({products.length})
              </h2>
              <button onClick={addProduct} className="rounded-lg bg-green-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-800">
                + Lägg till produkt
              </button>
            </div>

            <div className="space-y-4">
              {products.map((p, idx) => (
                <div key={idx} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-400">Produkt {idx + 1}</span>
                    {products.length > 1 && (
                      <button onClick={() => removeProduct(idx)} className="text-xs text-red-500 hover:text-red-700">Ta bort</button>
                    )}
                  </div>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    <div>
                      <label className="lbl">Namn</label>
                      <input value={p.name} onChange={e => updateProduct(idx, "name", e.target.value)} placeholder="Bodylab Whey 100" className="input-field" />
                    </div>
                    <div>
                      <label className="lbl">Type</label>
                      <input value={p.type} onChange={e => updateProduct(idx, "type", e.target.value)} placeholder="Whey koncentrat" className="input-field" />
                    </div>
                    <div>
                      <label className="lbl">Aktive ingredienser</label>
                      <input value={p.activeIngredients} onChange={e => updateProduct(idx, "activeIngredients", e.target.value)} placeholder="24g whey protein" className="input-field" />
                    </div>
                    <div>
                      <label className="lbl">Dosis pr. portion</label>
                      <input value={p.dosePerServing} onChange={e => updateProduct(idx, "dosePerServing", e.target.value)} placeholder="30g (1 scoop)" className="input-field" />
                    </div>
                    <div>
                      <label className="lbl">Portioner pr. pakke</label>
                      <input type="number" value={p.servingsPerPackage} onChange={e => updateProduct(idx, "servingsPerPackage", Number(e.target.value))} className="input-field" />
                    </div>
                    <div>
                      <label className="lbl">Pris pr. dagsdosis</label>
                      <input value={p.pricePerDailyDose} onChange={e => updateProduct(idx, "pricePerDailyDose", e.target.value)} placeholder="5,50 kr" className="input-field" />
                    </div>
                    <div>
                      <label className="lbl">Pris</label>
                      <input value={p.price} onChange={e => updateProduct(idx, "price", e.target.value)} placeholder="249 kr" className="input-field" />
                    </div>
                    <div>
                      <label className="lbl">Målgrupp</label>
                      <input value={p.targetGroup} onChange={e => updateProduct(idx, "targetGroup", e.target.value)} placeholder="Muskelopbygning" className="input-field" />
                    </div>
                    <div>
                      <label className="lbl">Certifieringar</label>
                      <input value={p.certifications} onChange={e => updateProduct(idx, "certifications", e.target.value)} placeholder="Informed Sport, GMP" className="input-field" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Generera-knapp */}
          <div className="flex justify-end gap-3">
            <button
              onClick={handleGenerate}
              disabled={generating || !keyword.trim() || products.every(p => !p.name.trim())}
              className="rounded-lg bg-green-700 px-8 py-2.5 text-sm font-semibold text-white transition hover:bg-green-800 disabled:opacity-50"
            >
              {generating ? "Genererar..." : "Generera artikel"}
            </button>
          </div>
        </div>
      )}

      {/* ═══ TAB: PROGRESS ═══ */}
      {activeTab === "progress" && (
        <div className="space-y-3">
          {steps.map(step => (
            <div
              key={step.id}
              className={`flex items-center gap-3 rounded-lg border p-4 ${
                step.status === "done" ? "border-green-200 bg-green-50" :
                step.status === "running" ? "border-blue-200 bg-blue-50" :
                step.status === "error" ? "border-red-200 bg-red-50" :
                "border-slate-200 bg-white"
              }`}
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold">
                {step.status === "done" && <span className="text-green-600">&#10003;</span>}
                {step.status === "running" && <span className="animate-spin text-blue-600">&#9696;</span>}
                {step.status === "error" && <span className="text-red-600">&#10007;</span>}
                {step.status === "pending" && <span className="text-slate-300">&#9679;</span>}
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-slate-900">{step.heading}</p>
                {step.status === "running" && <p className="text-xs text-blue-600">Genererar...</p>}
                {step.status === "done" && <p className="text-xs text-green-600">Klar</p>}
                {step.status === "error" && <p className="text-xs text-red-600">{step.content}</p>}
              </div>
            </div>
          ))}

          {generating && (
            <button onClick={handleAbort} className="mt-4 rounded-lg border border-red-300 px-4 py-2 text-sm text-red-700 hover:bg-red-50">
              Avbryt
            </button>
          )}
        </div>
      )}

      {/* ═══ TAB: PREVIEW ═══ */}
      {activeTab === "preview" && (
        <div className="space-y-6">
          {/* MDX preview */}
          <div className="rounded-xl border border-slate-200 bg-white">
            <div className="border-b border-slate-100 px-4 py-3">
              <h3 className="text-sm font-semibold text-slate-700">Genererad MDX</h3>
            </div>
            <div className="max-h-[600px] overflow-auto p-4">
              <pre className="whitespace-pre-wrap text-xs text-slate-600 font-mono leading-relaxed">
                {fullMdx || "Inget genererat innehåll ännu."}
              </pre>
            </div>
          </div>

          {/* Publicera */}
          {fullMdx && (
            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <h3 className="mb-3 text-sm font-semibold text-slate-700">Publicera som kategorisida</h3>
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="block text-xs font-medium text-slate-500 mb-1">Slug (mapp under /kosttilskud/)</label>
                  <input
                    value={publishSlug}
                    onChange={e => setPublishSlug(e.target.value)}
                    placeholder="proteinpulver"
                    className="input-field"
                  />
                </div>
                <button
                  onClick={handlePublish}
                  disabled={publishing || !publishSlug.trim()}
                  className="self-end rounded-lg bg-green-700 px-6 py-2 text-sm font-medium text-white hover:bg-green-800 disabled:opacity-50"
                >
                  {publishing ? "Publicerar..." : "Publicera"}
                </button>
              </div>
              {publishResult && (
                <p className={`mt-3 text-sm ${publishResult.startsWith("Fel") ? "text-red-600" : "text-green-600"}`}>
                  {publishResult}
                </p>
              )}
            </div>
          )}

          {/* Kopiera */}
          {fullMdx && (
            <button
              onClick={() => navigator.clipboard.writeText(fullMdx)}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
            >
              Kopiera MDX till urklipp
            </button>
          )}

          {/* Sektioner var för sig */}
          {steps.filter(s => s.status === "done" && s.content).length > 0 && (
            <div className="rounded-xl border border-slate-200 bg-white">
              <div className="border-b border-slate-100 px-4 py-3">
                <h3 className="text-sm font-semibold text-slate-700">Sektioner (individuella)</h3>
              </div>
              <div className="divide-y divide-slate-100">
                {steps.filter(s => s.status === "done" && s.content).map(s => (
                  <details key={s.id} className="group">
                    <summary className="cursor-pointer px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50">
                      {s.heading}
                    </summary>
                    <div className="border-t border-slate-100 bg-slate-50 px-4 py-3">
                      <pre className="whitespace-pre-wrap text-xs text-slate-600 font-mono">{s.content}</pre>
                    </div>
                  </details>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

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
          transition: border-color 0.15s;
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
