import Link from "next/link"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Side ikke fundet (404)",
  robots: { index: false, follow: false },
}

export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-[60vh] w-full max-w-xl flex-col items-center justify-center px-4 py-20 text-center">
      <p className="text-sm font-semibold uppercase tracking-wider text-green-700">404</p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
        Siden blev ikke fundet
      </h1>
      <p className="mt-4 text-base leading-relaxed text-slate-600">
        Den side, du leder efter, findes ikke eller er blevet flyttet.
        Prøv at starte forfra fra forsiden eller brug sideoversigten.
      </p>
      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <Link
          href="/"
          className="inline-flex items-center justify-center rounded-full bg-green-700 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-green-800"
        >
          Gå til forsiden
        </Link>
        <Link
          href="/sidekort"
          className="inline-flex items-center justify-center rounded-full border border-slate-300 bg-white px-5 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
        >
          Se sidekort
        </Link>
      </div>
    </div>
  )
}
