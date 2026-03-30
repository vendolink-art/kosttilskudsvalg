"use client"

import { useState, useEffect } from "react"
import Link from "next/link"

const COOKIE_CONSENT_KEY = "cookie-consent"
type ConsentValue = "accepted" | "declined" | null

export function CookieBanner() {
  const [consent, setConsent] = useState<ConsentValue>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    const stored = localStorage.getItem(COOKIE_CONSENT_KEY)
    if (stored === "accepted" || stored === "declined") {
      setConsent(stored)
    }
  }, [])

  const handleAccept = () => {
    localStorage.setItem(COOKIE_CONSENT_KEY, "accepted")
    setConsent("accepted")
  }

  const handleDecline = () => {
    localStorage.setItem(COOKIE_CONSENT_KEY, "declined")
    setConsent("declined")
  }

  if (!mounted) return null
  if (consent !== null) return null

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 sm:p-6">
      <div className="mx-auto max-w-xl rounded-xl border border-zinc-200 bg-white p-4 shadow-lg sm:p-5">
        <p className="text-sm text-zinc-600 leading-relaxed">
          Vi bruger cookies for at forbedre din oplevelse og måle trafik.{" "}
          <Link
            href="/integritet"
            className="text-green-700 underline underline-offset-2 hover:text-green-800"
          >
            Læs mere
          </Link>
        </p>
        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-end">
          <button
            onClick={handleDecline}
            className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50"
          >
            Kun nødvendige
          </button>
          <button
            onClick={handleAccept}
            className="rounded-lg bg-green-700 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-green-800"
          >
            Accepter alle
          </button>
        </div>
      </div>
    </div>
  )
}
