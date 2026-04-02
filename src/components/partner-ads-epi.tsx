"use client"

import { useEffect } from "react"

/**
 * Intercepts clicks on partner-ads.com links and appends a uid (EPI)
 * parameter so sales from kosttilskudsvalg.dk can be distinguished
 * from other sites sharing the same Partner-ads account.
 *
 * EPI format: ktv--{page-slug}--{ga-client-id}
 */
export function PartnerAdsEpi() {
  useEffect(() => {
    function getGaClientId(): string {
      try {
        const match = document.cookie.match(/_ga=GA\d+\.\d+\.(.+)/)
        if (match) return match[1]
      } catch {}
      return String(Date.now())
    }

    function handleClick(e: MouseEvent) {
      const anchor = (e.target as HTMLElement).closest?.("a[href*='partner-ads.com']") as HTMLAnchorElement | null
      if (!anchor) return

      try {
        const url = new URL(anchor.href)
        if (url.searchParams.has("uid")) return

        const slug = window.location.pathname.split("/").filter(Boolean).pop() || "home"
        const clientId = getGaClientId()
        url.searchParams.set("uid", `ktv--${slug}--${clientId}`)
        anchor.href = url.toString()
      } catch {}
    }

    document.addEventListener("click", handleClick, true)
    return () => document.removeEventListener("click", handleClick, true)
  }, [])

  return null
}
