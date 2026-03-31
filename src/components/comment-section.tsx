"use client"

import { useState, useEffect, useCallback } from "react"
import { usePathname } from "next/navigation"

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
  text: string
  createdAt: string
  replies: Reply[]
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return "lige nu"
  if (mins < 60) return `${mins} min. siden`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours} time${hours > 1 ? "r" : ""} siden`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days} dag${days > 1 ? "e" : ""} siden`
  const months = Math.floor(days / 30)
  return `${months} måned${months > 1 ? "er" : ""} siden`
}

export function CommentSection() {
  const pathname = usePathname()
  const slug = pathname.split("/").pop() || ""

  const [open, setOpen] = useState(false)
  const [comments, setComments] = useState<Comment[]>([])
  const [loading, setLoading] = useState(true)

  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [text, setText] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState("")

  const fetchComments = useCallback(async () => {
    if (!slug) return
    try {
      const res = await fetch(`/api/comments?slug=${slug}`)
      if (res.ok) setComments(await res.json())
    } catch { /* ignore */ }
    setLoading(false)
  }, [slug])

  useEffect(() => {
    fetchComments()
  }, [fetchComments])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setSubmitting(true)

    try {
      const res = await fetch("/api/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, name, email, text }),
      })

      if (!res.ok) {
        const data = await res.json()
        setError(data.error || "Noget gik galt")
        setSubmitting(false)
        return
      }

      setSubmitted(true)
      setName("")
      setEmail("")
      setText("")
    } catch {
      setError("Netværksfejl – prøv igen")
    }
    setSubmitting(false)
  }

  return (
    <div className="mt-8 border-t border-slate-100 pt-6">
      {/* Approved comments */}
      {!loading && comments.length > 0 && (
        <div className="mb-6">
          <h3 className="text-base font-bold text-slate-900 mb-4">
            {comments.length} kommentar{comments.length !== 1 ? "er" : ""}
          </h3>
          <div className="space-y-4">
            {comments.map((c) => (
              <div key={c.id} className="rounded-xl border border-slate-200 bg-white p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-100 text-xs font-bold text-green-700">
                    {c.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-800">{c.name}</p>
                    <p className="text-xs text-slate-400">{timeAgo(c.createdAt)}</p>
                  </div>
                </div>
                <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-line">{c.text}</p>

                {c.replies.length > 0 && (
                  <div className="mt-3 space-y-3 border-l-2 border-green-200 pl-4">
                    {c.replies.map((r) => (
                      <div key={r.id}>
                        <div className="flex items-center gap-2 mb-1">
                          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-800 text-[10px] font-bold text-white">
                            R
                          </div>
                          <p className="text-xs font-semibold text-slate-700">{r.name}</p>
                          <p className="text-xs text-slate-400">{timeAgo(r.createdAt)}</p>
                        </div>
                        <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-line">{r.text}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Toggle button / form */}
      {!open && !submitted ? (
        <button
          onClick={() => setOpen(true)}
          className="w-full md:w-auto px-6 py-3 bg-white border border-slate-300 rounded-xl text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
        >
          Stil et spørgsmål
        </button>
      ) : submitted ? (
        <div className="rounded-xl border border-green-200 bg-green-50 p-5 text-center">
          <svg className="mx-auto mb-2 h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
          <p className="text-sm font-semibold text-green-800">Tak for din kommentar!</p>
          <p className="mt-1 text-xs text-green-600">
            Din kommentar gennemgås af redaktionen og publiceres, når den er godkendt.
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="text-base font-bold text-slate-900 mb-4">Skriv en kommentar</h3>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="comment-name" className="block text-xs font-medium text-slate-600 mb-1">
                Navn *
              </label>
              <input
                id="comment-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                minLength={2}
                maxLength={80}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
                placeholder="Dit navn"
              />
            </div>
            <div>
              <label htmlFor="comment-email" className="block text-xs font-medium text-slate-600 mb-1">
                E-mail * <span className="text-slate-400">(publiceres ikke)</span>
              </label>
              <input
                id="comment-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
                placeholder="din@email.dk"
              />
            </div>
          </div>

          <div className="mt-3">
            <label htmlFor="comment-text" className="block text-xs font-medium text-slate-600 mb-1">
              Kommentar *
            </label>
            <textarea
              id="comment-text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              required
              minLength={5}
              maxLength={2000}
              rows={4}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500 resize-y"
              placeholder="Skriv dit spørgsmål eller din kommentar her…"
            />
          </div>

          {error && (
            <p className="mt-2 text-xs text-red-600">{error}</p>
          )}

          <div className="mt-4 flex items-center gap-3">
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center justify-center rounded-xl bg-green-700 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-green-800 disabled:opacity-50"
            >
              {submitting ? "Sender…" : "Post kommentar"}
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-sm text-slate-500 hover:text-slate-700 transition-colors"
            >
              Annuller
            </button>
          </div>

          <p className="mt-3 text-[11px] text-slate-400">
            Alle kommentarer modereres af redaktionen inden publicering.
          </p>
        </form>
      )}
    </div>
  )
}
