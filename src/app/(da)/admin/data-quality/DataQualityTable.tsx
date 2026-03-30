"use client"

import { Fragment, useMemo, useState } from "react"

type Row = {
  category: string
  slug: string
  title: string
  confidence: number
  panelOverall: number | null
  missing: string[]
  buyUrl?: string
  categoryPath?: string
  manualInfo?: string
  isBroken404?: boolean
  currentData?: Record<string, unknown>
}

function fmtPct(value: number | undefined) {
  if (value == null || !Number.isFinite(value)) return "-"
  return `${Math.round(value * 100)}%`
}

function prettyMissing(key: string): string {
  if (key === "outgoingLink404") return "Utgående länk returnerar 404"
  return key
}

export function DataQualityTable({ rows }: { rows: Row[] }) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const [draft, setDraft] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState<Record<string, boolean>>({})
  const [status, setStatus] = useState<Record<string, string>>({})
  const [visibleCount, setVisibleCount] = useState(20)

  const keyFor = (row: Row) => `${row.category}:${row.slug}`
  const sorted = useMemo(() => [...rows].sort((a, b) => a.confidence - b.confidence), [rows])
  const visibleRows = useMemo(() => sorted.slice(0, visibleCount), [sorted, visibleCount])

  async function saveRow(row: Row) {
    const key = keyFor(row)
    const info = (draft[key] || "").trim()
    if (!info) {
      setStatus((s) => ({ ...s, [key]: "Skriv något först." }))
      return
    }

    setSaving((s) => ({ ...s, [key]: true }))
    setStatus((s) => ({ ...s, [key]: "Sparar och uppdaterar kategori..." }))
    try {
      const res = await fetch("/api/admin/data-quality/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category: row.category,
          slug: row.slug,
          info,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setStatus((s) => ({ ...s, [key]: data?.error || "Misslyckades" }))
      } else {
        setStatus((s) => ({ ...s, [key]: "Klart! Sidan laddas om..." }))
        setTimeout(() => window.location.reload(), 800)
      }
    } catch (e: any) {
      setStatus((s) => ({ ...s, [key]: e?.message || "Nätverksfel" }))
    } finally {
      setSaving((s) => ({ ...s, [key]: false }))
    }
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
      <table className="min-w-full divide-y divide-slate-200 text-sm">
        <thead className="bg-slate-50">
          <tr>
            <th className="w-12 px-3 py-3 text-left font-semibold text-slate-700"></th>
            <th className="px-4 py-3 text-left font-semibold text-slate-700">Kategori</th>
            <th className="px-4 py-3 text-left font-semibold text-slate-700">Produkt</th>
            <th className="px-4 py-3 text-left font-semibold text-slate-700">Länkstatus</th>
            <th className="px-4 py-3 text-left font-semibold text-slate-700">Confidence</th>
            <th className="px-4 py-3 text-left font-semibold text-slate-700">Panelscore</th>
            <th className="px-4 py-3 text-left font-semibold text-slate-700">Saknade signaler</th>
            <th className="px-4 py-3 text-left font-semibold text-slate-700">Länkar</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {visibleRows.length === 0 ? (
            <tr>
              <td colSpan={8} className="px-4 py-8 text-center text-slate-500">
                Ingen signalcache hittades ännu. Kör rebuild-scriptet först.
              </td>
            </tr>
          ) : (
            visibleRows.map((row) => {
              const key = keyFor(row)
              const isOpen = !!expanded[key]
              const textValue = draft[key] ?? ""
              return (
                <Fragment key={key}>
                  <tr key={key}>
                    <td className="px-3 py-3">
                      <button
                        type="button"
                        onClick={() => setExpanded((e) => ({ ...e, [key]: !isOpen }))}
                        className="rounded border border-slate-300 px-2 py-1 text-xs text-slate-700 hover:bg-slate-50"
                        title="Visa redigering"
                      >
                        {isOpen ? "▾" : "▸"}
                      </button>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      {row.categoryPath ? (
                        <a
                          href={row.categoryPath}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-slate-700 underline hover:text-slate-900"
                        >
                          {row.category}
                        </a>
                      ) : (
                        <span className="text-slate-700">{row.category}</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-900">
                        {row.categoryPath ? (
                          <a
                            href={`${row.categoryPath}#product-${row.slug}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="underline hover:text-slate-700"
                          >
                            {row.title}
                          </a>
                        ) : (
                          row.title
                        )}
                      </div>
                      <div className="text-xs text-slate-500">{row.slug}</div>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      {row.isBroken404 ? (
                        <span className="rounded bg-rose-100 px-2 py-1 text-xs font-semibold text-rose-700">404</span>
                      ) : (
                        <span className="rounded bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-700">OK</span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <span
                        className={`rounded px-2 py-1 text-xs font-semibold ${
                          row.confidence < 0.5
                            ? "bg-rose-100 text-rose-700"
                            : row.confidence < 0.75
                              ? "bg-amber-100 text-amber-800"
                              : "bg-emerald-100 text-emerald-800"
                        }`}
                      >
                        {fmtPct(row.confidence)}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-slate-700">
                      {row.panelOverall != null ? row.panelOverall.toFixed(1) : "-"}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {row.missing.length === 0 ? "Inga större luckor" : row.missing.map(prettyMissing).join(", ")}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-1">
                        {row.buyUrl ? (
                          <a href={row.buyUrl} target="_blank" rel="noopener noreferrer" className="text-green-700 underline hover:text-green-800">
                            E-handlare
                          </a>
                        ) : (
                          <span className="text-slate-400">E-handlare saknas</span>
                        )}
                        {row.categoryPath ? (
                          <a href={row.categoryPath} target="_blank" rel="noopener noreferrer" className="text-green-700 underline hover:text-green-800">
                            Kategorisida
                          </a>
                        ) : (
                          <span className="text-slate-400">Kategori saknas</span>
                        )}
                      </div>
                    </td>
                  </tr>
                  {isOpen && (
                    <tr className="bg-slate-50/70">
                      <td colSpan={8} className="px-4 py-4">
                        <div className="grid gap-3">
                          <label className="text-sm font-medium text-slate-800">
                            Lägg till mer produktinfo (appendas till befintlig info)
                          </label>
                          <textarea
                            value={textValue}
                            onChange={(e) => setDraft((d) => ({ ...d, [key]: e.target.value }))}
                            rows={5}
                            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800"
                            placeholder="Klistra in ny data här..."
                          />
                          {row.manualInfo ? (
                            <div className="rounded border border-slate-200 bg-white p-3 text-xs text-slate-600">
                              <div className="mb-1 font-semibold text-slate-800">Tidigare sparad info</div>
                              <div className="whitespace-pre-wrap">{row.manualInfo}</div>
                            </div>
                          ) : null}
                          <div className="rounded border border-slate-200 bg-white p-3">
                            <div className="mb-2 text-xs font-semibold text-slate-800">
                              Nuvarande produktdata (det motorn arbetar med)
                            </div>
                            <textarea
                              readOnly
                              value={JSON.stringify(row.currentData || {}, null, 2)}
                              rows={12}
                              className="w-full rounded border border-slate-200 bg-slate-50 px-3 py-2 font-mono text-xs text-slate-700"
                            />
                          </div>
                          <div className="flex items-center gap-3">
                            <button
                              type="button"
                              onClick={() => saveRow(row)}
                              disabled={!!saving[key]}
                              className="rounded-lg bg-green-700 px-4 py-2 text-sm font-semibold text-white hover:bg-green-800 disabled:opacity-60"
                            >
                              {saving[key] ? "Uppdaterar..." : "Spara & uppdatera kategori"}
                            </button>
                            {status[key] ? <span className="text-xs text-slate-600">{status[key]}</span> : null}
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              )
            })
          )}
        </tbody>
      </table>
      {sorted.length > visibleRows.length ? (
        <div className="border-t border-slate-200 px-4 py-4">
          <button
            type="button"
            onClick={() => setVisibleCount((c) => c + 20)}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Visa mer (+20)
          </button>
          <span className="ml-3 text-xs text-slate-500">
            Visar {visibleRows.length} av {sorted.length}
          </span>
        </div>
      ) : sorted.length > 0 ? (
        <div className="border-t border-slate-200 px-4 py-3 text-xs text-slate-500">
          Visar alla {sorted.length} produkter
        </div>
      ) : null}
    </div>
  )
}

