"use client"

import Script from "next/script"
import { useState, useEffect } from "react"

const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID
const COOKIE_CONSENT_KEY = "cookie-consent"

export function GoogleAnalytics() {
  const [hasConsent, setHasConsent] = useState(false)

  useEffect(() => {
    const check = () => {
      setHasConsent(localStorage.getItem(COOKIE_CONSENT_KEY) === "accepted")
    }
    check()

    const onStorage = (e: StorageEvent) => {
      if (e.key === COOKIE_CONSENT_KEY) check()
    }
    window.addEventListener("storage", onStorage)

    const interval = setInterval(check, 1000)

    return () => {
      window.removeEventListener("storage", onStorage)
      clearInterval(interval)
    }
  }, [])

  if (!GA_MEASUREMENT_ID || !hasConsent) return null

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
        strategy="afterInteractive"
      />
      <Script id="google-analytics" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${GA_MEASUREMENT_ID}', {
            page_path: window.location.pathname,
            anonymize_ip: true
          });
        `}
      </Script>
    </>
  )
}

export function trackEvent(action: string, category: string, label?: string, value?: number) {
  if (typeof window !== "undefined" && (window as any).gtag) {
    (window as any).gtag("event", action, {
      event_category: category,
      event_label: label,
      value: value,
    })
  }
}
