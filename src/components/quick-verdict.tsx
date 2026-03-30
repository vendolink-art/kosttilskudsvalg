interface QuickVerdictProps {
  productName: string
  rating: number
  verdict: string
  pros: string[]
  cons: string[]
}

export function QuickVerdict({ productName, rating, verdict, pros, cons }: QuickVerdictProps) {
  const ratingColor = rating >= 9 ? "text-green-700" : rating >= 7.5 ? "text-blue-700" : rating >= 6 ? "text-amber-700" : "text-red-700"
  const ratingBg = rating >= 9 ? "bg-green-100" : rating >= 7.5 ? "bg-blue-100" : rating >= 6 ? "bg-amber-100" : "bg-red-100"

  return (
    <div className="my-6 rounded-xl border border-slate-200 bg-gradient-to-r from-white to-slate-50 p-5 shadow-sm">
      <div className="flex items-start gap-4">
        <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-xl ${ratingBg}`}>
          <span className={`text-xl font-black ${ratingColor}`}>{rating}</span>
        </div>
        <div className="flex-1">
          <h4 className="text-sm font-bold text-slate-900">Hurtigt overblik – {productName}</h4>
          <p className="mt-1 text-sm text-slate-600 leading-relaxed">{verdict}</p>
        </div>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3">
        <div>
          <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-green-600">Fordele</p>
          <ul className="space-y-1">
            {pros.map((p, i) => (
              <li key={i} className="flex items-start gap-1.5 text-xs text-slate-600">
                <span className="mt-0.5 text-green-500">✓</span>
                {p}
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-red-500">Ulemper</p>
          <ul className="space-y-1">
            {cons.map((c, i) => (
              <li key={i} className="flex items-start gap-1.5 text-xs text-slate-600">
                <span className="mt-0.5 text-red-400">✗</span>
                {c}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}
