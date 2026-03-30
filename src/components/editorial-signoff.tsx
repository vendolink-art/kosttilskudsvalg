import Link from "next/link"
import { getAuthor, getReviewer } from "@/config/authors"

interface EditorialSignoffProps {
  author: string
  reviewer?: string
  lastUpdated: string
  sources?: string
}

export function EditorialSignoff({ author, reviewer, lastUpdated, sources }: EditorialSignoffProps) {
  const authorData = getAuthor(author)
  const reviewerData = reviewer ? getAuthor(reviewer) : getReviewer()
  const authorSpecialties = authorData?.specialties?.slice(0, 2).join(" • ")
  const reviewerSpecialties = reviewerData?.specialties?.slice(0, 2).join(" • ")

  return (
    <div className="not-prose mt-8 rounded-xl border border-slate-200 bg-slate-50 p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-4">
          {/* Skrevet af */}
          {authorData && (
            <div className="flex items-start gap-3">
              {authorData.avatar ? (
                <img
                  src={authorData.avatar}
                  alt={authorData.name}
                  width={56}
                  height={56}
                  className="eeat-avatar h-14 w-14 shrink-0 rounded-full object-cover ring-1 ring-slate-200"
                  loading="lazy"
                />
              ) : (
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-green-100 text-sm font-bold text-green-700">
                  {authorData.name.split(" ").map(n => n[0]).join("")}
                </div>
              )}
              <div className="max-w-xl">
                <p className="text-xs text-slate-500">Skrevet af</p>
                <p className="text-sm font-medium text-slate-900">{authorData.name}</p>
                <p className="text-xs text-green-700">{authorData.title}</p>
                <p className="mt-1 text-xs leading-relaxed text-slate-600">{authorData.bio}</p>
                {authorSpecialties && <p className="mt-1 text-[11px] text-slate-500">Fokus: {authorSpecialties}</p>}
              </div>
            </div>
          )}

          {/* Faktatjekket af */}
          {reviewerData && (
            <div className="flex items-start gap-3">
              {reviewerData.avatar ? (
                <img
                  src={reviewerData.avatar}
                  alt={reviewerData.name}
                  width={56}
                  height={56}
                  className="eeat-avatar h-14 w-14 shrink-0 rounded-full object-cover ring-1 ring-slate-200"
                  loading="lazy"
                />
              ) : (
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-blue-100 text-sm font-bold text-blue-700">
                  {reviewerData.name.split(" ").map(n => n[0]).join("")}
                </div>
              )}
              <div className="max-w-xl">
                <p className="text-xs text-slate-500">Faktatjekket af</p>
                <p className="text-sm font-medium text-slate-900">{reviewerData.name}</p>
                <p className="text-xs text-blue-700">{reviewerData.title}</p>
                <p className="mt-1 text-xs leading-relaxed text-slate-600">{reviewerData.bio}</p>
                {reviewerSpecialties && <p className="mt-1 text-[11px] text-slate-500">Fagligt fokus: {reviewerSpecialties}</p>}
              </div>
            </div>
          )}
        </div>

        {/* Meta */}
        <div className="flex flex-wrap gap-3 text-xs text-slate-500 lg:flex-col lg:items-end lg:text-right">
          <span>Sidst opdateret: {lastUpdated}</span>
          <Link href="/metodik" className="text-green-700 underline hover:text-green-800">
            Metodik
          </Link>
          <Link href="/kilder-og-faktacheck" className="text-green-700 underline hover:text-green-800">
            Kildepolitik
          </Link>
          {sources && (
            <a href={sources} className="text-green-700 underline hover:text-green-800">
              Kilder
            </a>
          )}
        </div>
      </div>
    </div>
  )
}
