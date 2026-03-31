"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"

interface Reply {
  id: string
  name: string
  text: string
  createdAt: string
}

interface Comment {
  id: string
  slug: string
  name: string
  email: string
  text: string
  status: "pending" | "approved" | "rejected"
  createdAt: string
  replies: Reply[]
}

type Tab = "pending" | "approved" | "rejected"

export default function AdminCommentsPage() {
  const [comments, setComments] = useState<Comment[]>([])
  const [tab, setTab] = useState<Tab>("pending")
  const [loading, setLoading] = useState(true)
  const [replyingTo, setReplyingTo] = useState<string | null>(null)
  const [replyText, setReplyText] = useState("")
  const [replySubmitting, setReplySubmitting] = useState(false)

  const fetchComments = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/comments")
      if (res.ok) setComments(await res.json())
    } catch { /* ignore */ }
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchComments()
  }, [fetchComments])

  const handleAction = async (id: string, action: "approve" | "reject") => {
    await fetch(`/api/admin/comments/${id}/${action}`, { method: "POST" })
    fetchComments()
  }

  const handleReply = async (commentId: string) => {
    if (!replyText.trim()) return
    setReplySubmitting(true)
    await fetch(`/api/admin/comments/${commentId}/reply`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Redaktionen", text: replyText }),
    })
    setReplyText("")
    setReplyingTo(null)
    setReplySubmitting(false)
    fetchComments()
  }

  const filtered = comments.filter((c) => c.status === tab)
  const counts = {
    pending: comments.filter((c) => c.status === "pending").length,
    approved: comments.filter((c) => c.status === "approved").length,
    rejected: comments.filter((c) => c.status === "rejected").length,
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Kommentarer</h1>
        <Link href="/admin" className="text-sm text-slate-500 hover:text-slate-700">
          ← Tilbage til admin
        </Link>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 rounded-lg bg-slate-100 p-1">
        {(["pending", "approved", "rejected"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
              tab === t
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            {t === "pending" ? "Afventer" : t === "approved" ? "Godkendt" : "Afvist"}
            {counts[t] > 0 && (
              <span className={`ml-1.5 inline-flex h-5 min-w-[20px] items-center justify-center rounded-full px-1.5 text-xs font-bold ${
                t === "pending" ? "bg-amber-100 text-amber-700" : "bg-slate-200 text-slate-600"
              }`}>
                {counts[t]}
              </span>
            )}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-sm text-slate-400 text-center py-12">Indlæser…</p>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-slate-400 text-center py-12">Ingen kommentarer i denne kategori.</p>
      ) : (
        <div className="space-y-4">
          {filtered.map((c) => (
            <div key={c.id} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              {/* Header */}
              <div className="flex items-start justify-between gap-4 mb-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100 text-sm font-bold text-green-700">
                    {c.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-800">{c.name}</p>
                    <p className="text-xs text-slate-400">{c.email}</p>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <span className="inline-block rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-medium text-slate-600">
                    {c.slug}
                  </span>
                  <p className="mt-0.5 text-[11px] text-slate-400">
                    {new Date(c.createdAt).toLocaleString("da-DK")}
                  </p>
                </div>
              </div>

              {/* Comment text */}
              <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line bg-slate-50 rounded-lg p-3 mb-3">
                {c.text}
              </p>

              {/* Replies */}
              {c.replies.length > 0 && (
                <div className="mb-3 space-y-2 border-l-2 border-green-200 pl-4">
                  {c.replies.map((r) => (
                    <div key={r.id} className="bg-green-50 rounded-lg p-3">
                      <p className="text-xs font-semibold text-green-800 mb-1">
                        {r.name} · {new Date(r.createdAt).toLocaleString("da-DK")}
                      </p>
                      <p className="text-sm text-slate-700 whitespace-pre-line">{r.text}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Actions */}
              <div className="flex flex-wrap gap-2">
                {c.status === "pending" && (
                  <>
                    <button
                      onClick={() => handleAction(c.id, "approve")}
                      className="rounded-lg bg-green-700 px-4 py-2 text-xs font-semibold text-white hover:bg-green-800 transition-colors"
                    >
                      Godkend
                    </button>
                    <button
                      onClick={() => handleAction(c.id, "reject")}
                      className="rounded-lg border border-red-200 bg-white px-4 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 transition-colors"
                    >
                      Afvis
                    </button>
                  </>
                )}
                {c.status === "approved" && (
                  <button
                    onClick={() => setReplyingTo(replyingTo === c.id ? null : c.id)}
                    className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                  >
                    {replyingTo === c.id ? "Annuller" : "Svar"}
                  </button>
                )}
              </div>

              {/* Reply form */}
              {replyingTo === c.id && (
                <div className="mt-3 flex gap-2">
                  <textarea
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    rows={2}
                    className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500 resize-none"
                    placeholder="Skriv dit svar…"
                  />
                  <button
                    onClick={() => handleReply(c.id)}
                    disabled={replySubmitting || !replyText.trim()}
                    className="self-end rounded-lg bg-slate-800 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-900 disabled:opacity-50 transition-colors"
                  >
                    Send
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
