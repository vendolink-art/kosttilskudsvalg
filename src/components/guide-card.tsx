import Link from "next/link"

interface GuideCardProps {
  title: string
  href: string
  description?: string
  category?: string
  updated?: string
  banner?: string
  updateNote?: string
}

export function GuideCard({ title, href, description, category, updated, banner, updateNote }: GuideCardProps) {
  return (
    <li className="group list-none">
      <Link
        href={href}
        className="block h-full overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-all hover:shadow-md hover:border-slate-300 flex flex-col"
      >
        {banner ? (
          <div className="aspect-[16/9] overflow-hidden bg-slate-100">
            <img
              src={banner}
              alt={title}
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
              loading="lazy"
            />
          </div>
        ) : (
          <div className="aspect-[16/9] bg-gradient-to-br from-emerald-50 via-slate-50 to-teal-50 flex items-center justify-center">
            <svg className="w-12 h-12 text-emerald-200" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          </div>
        )}
        <div className="p-5 flex flex-col flex-1">
          {category && (
            <span className="mb-2 inline-block self-start rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wider text-emerald-700">
              {category}
            </span>
          )}
          <h3 className="text-base font-bold leading-snug text-slate-900 group-hover:text-emerald-700 transition-colors">
            {title}
          </h3>

          {description && (
            <p className="mt-2 text-sm text-slate-500 leading-relaxed line-clamp-2">
              {description}
            </p>
          )}
          
          {updateNote && (
            <div className="mt-3 mb-1 rounded-lg bg-emerald-50/50 p-2.5 border border-emerald-100/50">
              <p className="text-xs font-medium text-emerald-800 flex items-start gap-1.5">
                <svg className="w-3.5 h-3.5 shrink-0 mt-0.5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                <span className="leading-relaxed">{updateNote}</span>
              </p>
            </div>
          )}

          <div className="mt-auto pt-3 flex items-center justify-between">
            {updated && (
              <p className="text-xs text-slate-400">
                Opdateret: {updated}
              </p>
            )}
            <span className="text-xs font-medium text-emerald-600 group-hover:text-emerald-700 transition-colors flex items-center gap-1">
              Læs guide
              <svg className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </span>
          </div>
        </div>
      </Link>
    </li>
  )
}
