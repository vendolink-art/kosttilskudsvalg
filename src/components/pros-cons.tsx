interface ProsConsProps {
  pros: string[]
  cons: string[]
  prosTitle?: string
  consTitle?: string
}

export function ProsCons({ pros, cons, prosTitle = "Fordele", consTitle = "Ulemper" }: ProsConsProps) {
  return (
    <div className="my-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
      {/* Pros */}
      <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-5">
        <h4 className="mb-3 flex items-center gap-2 text-sm font-semibold text-emerald-800">
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {prosTitle}
        </h4>
        <ul className="space-y-2">
          {pros.map((pro, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-emerald-900">
              <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
              {pro}
            </li>
          ))}
        </ul>
      </div>

      {/* Cons */}
      <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-5">
        <h4 className="mb-3 flex items-center gap-2 text-sm font-semibold text-amber-800">
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          {consTitle}
        </h4>
        <ul className="space-y-2">
          {cons.map((con, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-amber-900">
              <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" />
              {con}
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
