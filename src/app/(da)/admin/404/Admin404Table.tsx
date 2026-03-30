"use client"

import { Fragment, useEffect, useMemo, useState } from "react"
import {
  ADMIN_404_STICKY_ROWS_KEY,
  getAdmin404RowKey,
  type Admin404StickyRow,
} from "@/lib/admin-404-client-state"

type Row = {
  productSlug: string
  outgoingUrl: string
  statusCode: number
  testPageUrl: string | null
  testPosition: number | null
  categoryPageUrls: string[]
}

function readStickyRows(): Admin404StickyRow[] {
  if (typeof window === "undefined") return []
  try {
    const raw = sessionStorage.getItem(ADMIN_404_STICKY_ROWS_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? (parsed as Admin404StickyRow[]) : []
  } catch {
    return []
  }
}

function writeStickyRows(rows: Admin404StickyRow[]) {
  if (typeof window === "undefined") return
  try {
    sessionStorage.setItem(ADMIN_404_STICKY_ROWS_KEY, JSON.stringify(rows))
  } catch {
    // ignore storage failures
  }
}

function mergeRows(baseRows: Row[], stickyRows: Admin404StickyRow[]): Row[] {
  const merged = new Map<string, Row>()
  for (const row of baseRows) {
    merged.set(getAdmin404RowKey(row), row)
  }
  for (const row of stickyRows) {
    const key = getAdmin404RowKey(row)
    if (!merged.has(key)) merged.set(key, row)
  }
  return Array.from(merged.values())
}

export function Admin404Table({ rows }: { rows: Row[] }) {
  const [localRows, setLocalRows] = useState<Row[]>(rows)
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const [newUrl, setNewUrl] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState<Record<string, boolean>>({})
  const [status, setStatus] = useState<Record<string, string>>({})
  const [customImage, setCustomImage] = useState<Record<string, { base64: string; name: string }>>({})
  const [completed, setCompleted] = useState<Record<string, boolean>>({})
  const [activeKey, setActiveKey] = useState<string | null>(null)
  const [queued, setQueued] = useState<Record<string, Row>>({})
  const [queueOrder, setQueueOrder] = useState<string[]>([])
  const [jobIds, setJobIds] = useState<Record<string, string>>({})

  const rowCount = useMemo(() => localRows.length, [localRows])
  const rowByKey = useMemo(() => {
    const map = new Map<string, Row>()
    for (const row of localRows) map.set(getAdmin404RowKey(row), row)
    return map
  }, [localRows])

  useEffect(() => {
    const stickyRows = readStickyRows()
    const nextCompleted: Record<string, boolean> = {}
    const nextStatus: Record<string, string> = {}
    for (const row of stickyRows) {
      const key = getAdmin404RowKey(row)
      nextCompleted[key] = true
      nextStatus[key] = row.statusMessage
    }
    setLocalRows(mergeRows(rows, stickyRows))
    setCompleted(nextCompleted)
    setStatus((current) => ({ ...nextStatus, ...current }))
  }, [rows])

  const persistCompletedRow = (row: Row, statusMessage: string) => {
    const key = getAdmin404RowKey(row)
    const stickyRows = readStickyRows().filter((entry) => getAdmin404RowKey(entry) !== key)
    stickyRows.push({
      ...row,
      statusMessage,
      completedAt: Date.now(),
    })
    writeStickyRows(stickyRows)
  }

  const removeCompletedRow = (row: Row) => {
    const key = getAdmin404RowKey(row)
    const stickyRows = readStickyRows().filter((entry) => getAdmin404RowKey(entry) !== key)
    writeStickyRows(stickyRows)
  }

  const hideRow = (row: Row) => {
    const key = getAdmin404RowKey(row)
    removeCompletedRow(row)
    setLocalRows((prev) => prev.filter((entry) => getAdmin404RowKey(entry) !== key))
    setCompleted((prev) => {
      const next = { ...prev }
      delete next[key]
      return next
    })
    setExpanded((prev) => {
      const next = { ...prev }
      delete next[key]
      return next
    })
    setStatus((prev) => {
      const next = { ...prev }
      delete next[key]
      return next
    })
    setSaving((prev) => {
      const next = { ...prev }
      delete next[key]
      return next
    })
    setNewUrl((prev) => {
      const next = { ...prev }
      delete next[key]
      return next
    })
    setCustomImage((prev) => {
      const next = { ...prev }
      delete next[key]
      return next
    })
    setJobIds((prev) => {
      const next = { ...prev }
      delete next[key]
      return next
    })
    setQueued((prev) => {
      const next = { ...prev }
      delete next[key]
      return next
    })
    setQueueOrder((prev) => prev.filter((entry) => entry !== key))
  }

  const handleFileChange = (key: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) {
      setCustomImage((s) => {
        const next = { ...s }
        delete next[key]
        return next
      })
      return
    }
    const reader = new FileReader()
    reader.onload = (event) => {
      const base64 = event.target?.result as string
      setCustomImage((s) => ({ ...s, [key]: { base64, name: file.name } }))
    }
    reader.readAsDataURL(file)
  }

  async function runReplace(row: Row) {
    const key = getAdmin404RowKey(row)
    const candidate = (newUrl[key] || "").trim()
    if (!/^https?:\/\//i.test(candidate)) {
      setStatus((s) => ({ ...s, [key]: "Ange en giltig URL (http/https)." }))
      return
    }

    // Check if it's Bodystore or Gymgrossisten and require manual image upload
    const isBlockedStore = candidate.includes("bodystore.dk") || candidate.includes("gymgrossisten.com") || candidate.includes("bodystore.com")
    if (isBlockedStore && !customImage[key]) {
      setStatus((s) => ({ ...s, [key]: "⚠️ Denna butik blockerar automatisk nedladdning av bilder. Du måste spara bilden från deras sida och ladda upp den manuellt ovan." }))
      return
    }

    setActiveKey(key)
    setSaving((s) => ({ ...s, [key]: true }))
    setStatus((s) => ({ ...s, [key]: "Startar uppdatering..." }))
    let startedAsyncJob = false
    try {
      const res = await fetch("/api/admin/404/replace", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productSlug: row.productSlug,
          newUrl: candidate,
          oldOutgoingUrl: row.outgoingUrl,
          testPageUrl: row.testPageUrl,
          testPosition: row.testPosition,
          categoryPageUrls: row.categoryPageUrls,
          customImage: customImage[key],
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        const errorMessage =
          res.status === 401
            ? "Sessionen har gått ut. Logga in igen i admin och försök på nytt."
            : data?.error || "Misslyckades."
        setStatus((s) => ({ ...s, [key]: errorMessage }))
      } else {
        startedAsyncJob = true
        setJobIds((s) => ({ ...s, [key]: String(data?.jobId || "") }))
        setStatus((s) => ({ ...s, [key]: data?.message || "Uppdatering startad..." }))
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Nätverksfel"
      setStatus((s) => ({ ...s, [key]: msg }))
    } finally {
      if (!startedAsyncJob) {
        setSaving((s) => ({ ...s, [key]: false }))
        setActiveKey((current) => (current === key ? null : current))
      }
    }
  }

  function replaceBroken(row: Row) {
    const key = getAdmin404RowKey(row)
    if (saving[key]) return

    if (activeKey && activeKey !== key) {
      if (queueOrder.includes(key)) {
        setStatus((s) => ({ ...s, [key]: "⏳ Redan i kö." }))
        return
      }
      setQueued((prev) => ({ ...prev, [key]: row }))
      setQueueOrder((prev) => [...prev, key])
      setStatus((s) => ({ ...s, [key]: "⏳ I kö. Startar automatiskt när nuvarande uppdatering är klar." }))
      return
    }

    void runReplace(row)
  }

  useEffect(() => {
    if (activeKey) return
    const nextKey = queueOrder[0]
    if (!nextKey) return
    const nextRow = queued[nextKey]
    setQueueOrder((prev) => prev.filter((entry) => entry !== nextKey))
    setQueued((prev) => {
      const next = { ...prev }
      delete next[nextKey]
      return next
    })
    if (nextRow) void runReplace(nextRow)
  }, [activeKey, queueOrder, queued])

  useEffect(() => {
    const entries = Object.entries(jobIds).filter(([, jobId]) => Boolean(jobId))
    if (entries.length === 0) return

    let cancelled = false
    let isPolling = false

    const pollJobs = async () => {
      if (cancelled || isPolling) return
      isPolling = true
      try {
        for (const [key, jobId] of entries) {
          try {
            const res = await fetch(`/api/admin/404/replace?jobId=${encodeURIComponent(jobId)}`, {
              credentials: "same-origin",
              cache: "no-store",
            })
            const data = await res.json()

            if (!res.ok) {
              const message = data?.error || "Kunde inte läsa jobbstatus."
              if (!cancelled) {
                setStatus((s) => ({ ...s, [key]: message }))
                setSaving((s) => ({ ...s, [key]: false }))
                setJobIds((s) => {
                  const next = { ...s }
                  delete next[key]
                  return next
                })
                setActiveKey((current) => (current === key ? null : current))
              }
              continue
            }

            const elapsedSuffix =
              data?.phase === "queued" || data?.phase === "running"
                ? ` (${Math.max(1, Number(data?.elapsedSeconds || 0))} s)`
                : ""
            const nextMessage = `${data?.message || "Uppdatering pågår..."}${elapsedSuffix}`

            if (!cancelled) {
              setStatus((s) => ({ ...s, [key]: nextMessage }))
            }

            if (data?.phase === "completed") {
              const row = rowByKey.get(key)
              if (!cancelled) {
                setCompleted((s) => ({ ...s, [key]: true }))
                setSaving((s) => ({ ...s, [key]: false }))
                setJobIds((s) => {
                  const next = { ...s }
                  delete next[key]
                  return next
                })
                setActiveKey((current) => (current === key ? null : current))
                if (row) persistCompletedRow(row, String(data?.message || "✅ DONE!"))
              }
            } else if (data?.phase === "failed") {
              if (!cancelled) {
                setSaving((s) => ({ ...s, [key]: false }))
                setJobIds((s) => {
                  const next = { ...s }
                  delete next[key]
                  return next
                })
                setActiveKey((current) => (current === key ? null : current))
              }
            }
          } catch (error: unknown) {
            const message = error instanceof Error ? error.message : "Kunde inte läsa jobbstatus."
            if (!cancelled) {
              setStatus((s) => ({ ...s, [key]: message }))
            }
          }
        }
      } finally {
        isPolling = false
      }
    }

    void pollJobs()
    const intervalId = window.setInterval(() => {
      void pollJobs()
    }, 2000)

    return () => {
      cancelled = true
      window.clearInterval(intervalId)
    }
  }, [jobIds, rowByKey])

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between gap-4 border-b border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-600">
        <div className="flex flex-wrap items-center gap-3">
          <span>
            Visar <strong>{rowCount}</strong> rader i denna vy.
          </span>
          <span>Uppdaterade rader ligger kvar tills du laddar om eller lämnar sidan.</span>
          {activeKey ? <span>En uppdatering körs nu.</span> : null}
          {queueOrder.length > 0 ? <span>{queueOrder.length} väntar i kö.</span> : null}
        </div>
      </div>
      <table className="min-w-full divide-y divide-slate-200 text-sm">
        <thead className="bg-slate-50">
          <tr>
            <th className="w-12 px-3 py-3 text-left font-semibold text-slate-700"></th>
            <th className="px-4 py-3 text-left font-semibold text-slate-700">Produkt</th>
            <th className="px-4 py-3 text-left font-semibold text-slate-700">Status</th>
            <th className="px-4 py-3 text-left font-semibold text-slate-700">Placering</th>
            <th className="px-4 py-3 text-left font-semibold text-slate-700">Testsida</th>
            <th className="px-4 py-3 text-left font-semibold text-slate-700">Kostmag-undersidor</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {localRows.length === 0 ? (
            <tr>
              <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                Inga 404-länkar hittades.
              </td>
            </tr>
          ) : (
            localRows.map((row) => {
              const key = getAdmin404RowKey(row)
              const open = !!expanded[key]
              const isQueued = queueOrder.includes(key)
              const isCompleted = !!completed[key]
              const canQueue = Boolean(activeKey && activeKey !== key)
              return (
                <Fragment key={key}>
                  <tr>
                    <td className="px-3 py-3">
                      <button
                        type="button"
                        onClick={() => setExpanded((s) => ({ ...s, [key]: !open }))}
                        className="rounded border border-slate-300 px-2 py-1 text-xs text-slate-700 hover:bg-slate-50"
                        title="Byt ut 404-länk"
                      >
                        {open ? "▾" : "▸"}
                      </button>
                    </td>
                    <td className="max-w-[420px] px-4 py-3 font-medium">
                      <a
                        href={row.outgoingUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="break-all text-green-700 underline hover:text-green-800"
                      >
                        {row.productSlug}
                      </a>
                    </td>
                    <td className={`whitespace-nowrap px-4 py-3 font-medium ${isCompleted ? "text-green-700" : "text-red-600"}`}>
                      {isCompleted ? "Uppdaterad" : row.statusCode}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 font-medium text-slate-800">
                      {row.testPosition ? `#${row.testPosition}` : "-"}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      {row.testPageUrl || row.categoryPageUrls[0] ? (
                        <a
                          href={row.testPageUrl || row.categoryPageUrls[0]}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-green-700 underline hover:text-green-800"
                        >
                          {row.testPageUrl || row.categoryPageUrls[0]}
                        </a>
                      ) : (
                        <span className="text-slate-400">Inte hittad</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {row.categoryPageUrls.length === 0 ? (
                        <span className="text-slate-400">Inte hittad</span>
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          {row.categoryPageUrls.map((u) => (
                            <a
                              key={`${row.productSlug}-${u}`}
                              href={u}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="rounded border border-slate-200 px-2 py-1 text-xs text-slate-700 hover:bg-slate-50"
                            >
                              {u}
                            </a>
                          ))}
                        </div>
                      )}
                    </td>
                  </tr>
                  {open && (
                    <tr className="bg-slate-50/70">
                      <td colSpan={6} className="px-4 py-4">
                        <div className="grid gap-3">
                          <label className="text-sm font-medium text-slate-800">
                            Ny produkt-URL (ersätter nuvarande 404-länk för denna produkt)
                          </label>
                          <input
                            type="url"
                            value={newUrl[key] || ""}
                            onChange={(e) => setNewUrl((s) => ({ ...s, [key]: e.target.value }))}
                            placeholder="https://..."
                            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                          />
                          <div className="mt-1">
                            <label className="text-sm font-medium text-slate-800 block mb-1">
                              Bifoga produktbild manuellt (Valfritt - används om butiken blockerar nedladdning)
                            </label>
                            <input
                              type="file"
                              accept="image/*"
                              onChange={(e) => handleFileChange(key, e)}
                              className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-green-50 file:text-green-700 hover:file:bg-green-100"
                            />
                          </div>
                          <div className="flex items-center gap-3 mt-2">
                            <button
                              type="button"
                              onClick={() => replaceBroken(row)}
                              disabled={!!saving[key] || isQueued}
                              className="rounded-lg bg-green-700 px-4 py-2 text-sm font-semibold text-white hover:bg-green-800 disabled:opacity-60"
                            >
                              {saving[key]
                                ? "Uppdaterar..."
                                : isQueued
                                  ? "I kö..."
                                  : canQueue
                                    ? "Lägg i kö"
                                    : "Byt länk, parsa data & uppdatera test"}
                            </button>
                            {status[key] && status[key].includes("DONE") && (
                              <button
                                type="button"
                                onClick={() => hideRow(row)}
                                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                              >
                                Dölj rad
                              </button>
                            )}
                            {status[key] ? <span className="text-xs text-slate-600 font-medium">{status[key]}</span> : null}
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
    </div>
  )
}

