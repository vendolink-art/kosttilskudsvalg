import { Inter } from "next/font/google"
import "./globals.css"
import type { ReactNode } from "react"
import type { Metadata } from "next"
import { SiteHeader } from "@/components/site-header"
import { SiteFooter } from "@/components/site-footer"
import { CookieBanner } from "@/components/cookie-banner"
import { GoogleAnalytics } from "@/components/google-analytics"

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
})

export const metadata: Metadata = {
  metadataBase: new URL("https://www.kosttilskudsvalg.dk"),
  title: {
    default: "Kosttilskudsvalg",
    template: "%s | Kosttilskudsvalg",
  },
  description:
    "Uafhængige tests og anmeldelser af kosttilskud. Find de bedste produkter med vores ekspertguider.",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "da_DK",
    siteName: "Kosttilskudsvalg",
    url: "https://www.kosttilskudsvalg.dk/",
    title: "Kosttilskudsvalg – Uafhængige tests af kosttilskud",
    description:
      "Find de bedste kosttilskud med vores uafhængige tests, sammenligninger og ekspertguider.",
    images: [
      {
        url: "/images/og-default.jpg",
        width: 1200,
        height: 630,
        alt: "Kosttilskudsvalg – Uafhængige tests af kosttilskud",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Kosttilskudsvalg – Uafhængige tests af kosttilskud",
    description:
      "Find de bedste kosttilskud med vores uafhængige tests, sammenligninger og ekspertguider.",
    images: ["/images/og-default.jpg"],
  },
  verification: {
    google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION,
  },
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="da" className={`${inter.variable} font-sans`}>
      <head>
        <link rel="preconnect" href="https://www.googletagmanager.com" />
        <link rel="preconnect" href="https://www.google-analytics.com" />
      </head>
      <body className="min-h-screen bg-white text-slate-900 antialiased" suppressHydrationWarning>
        <GoogleAnalytics />
        <SiteHeader />
        <main className="pb-16">{children}</main>
        <SiteFooter />
        <CookieBanner />
      </body>
    </html>
  )
}
