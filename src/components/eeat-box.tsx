import { AUTHORS } from "@/config/authors"
import Link from "next/link"

interface EEATBoxProps {
  authorSlug?: string
  reviewerSlug?: string
  updated?: string
}

export function EEATBox({ authorSlug = "line-kragelund", reviewerSlug, updated }: EEATBoxProps) {
  const author = AUTHORS.find((a) => a.slug === authorSlug) || AUTHORS[0]
  const reviewer = reviewerSlug ? AUTHORS.find((a) => a.slug === reviewerSlug) : null

  const authorHref = `/redaktion#${author.slug}`
  const reviewerHref = reviewer ? `/redaktion#${reviewer.slug}` : ""

  return (
    <div className="my-6 flex flex-wrap items-center gap-4 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
      {/* Author */}
      <div className="flex items-center gap-3">
        <Link href={authorHref} aria-label={`Gå til redaktionen: ${author.name}`} className="shrink-0">
          <img
            src={author.avatar || "/authors/placeholder.png"}
            alt={author.name}
            className="h-10 w-10 rounded-full object-cover ring-2 ring-slate-100"
            loading="lazy"
          />
        </Link>
        <div>
          <span className="text-xs text-slate-500 block">Skrevet af</span>
          <Link
            href={authorHref}
            className="text-sm font-semibold text-slate-900 block hover:underline underline-offset-2"
          >
            {author.name}
          </Link>
          <span className="text-xs text-slate-500 block">{author.title}</span>
        </div>
      </div>

      {/* Reviewer */}
      {reviewer && (
        <>
          <div className="hidden h-8 w-px bg-slate-200 sm:block" />
          <div className="flex items-center gap-3">
            <Link href={reviewerHref} aria-label={`Gå til redaktionen: ${reviewer.name}`} className="shrink-0">
              <img
                src={reviewer.avatar || "/authors/placeholder.png"}
                alt={reviewer.name}
                className="h-10 w-10 rounded-full object-cover ring-2 ring-slate-100"
                loading="lazy"
              />
            </Link>
            <div>
              <span className="text-xs text-slate-500 block">Faktatjekket af</span>
              <Link
                href={reviewerHref}
                className="text-sm font-semibold text-slate-900 block hover:underline underline-offset-2"
              >
                {reviewer.name}
              </Link>
              <span className="text-xs text-slate-500 block">{reviewer.title}</span>
            </div>
          </div>
        </>
      )}

      {/* Updated date */}
      {updated && (
        <>
          <div className="hidden h-8 w-px bg-slate-200 sm:block" />
          <div>
            <span className="text-xs text-slate-500 block">Opdateret</span>
            <span className="text-sm font-semibold text-slate-900 block">{updated}</span>
          </div>
        </>
      )}
    </div>
  )
}
