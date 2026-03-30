"use client"

type RatingBarProps = {
  label?: string
  title?: string
  value: number
  maxValue?: number
  showLabel?: boolean
  isOverall?: boolean
}

function getRatingLabel(value: number): string {
  if (value >= 9) return "Fremragende"
  if (value >= 8) return "Meget godt"
  if (value >= 6) return "Godt"
  if (value >= 4) return "Acceptabelt"
  return "Svagt"
}

function getRatingGradient(value: number): string {
  if (value >= 9) return "from-emerald-500 to-emerald-400"
  if (value >= 8) return "from-orange-500 to-amber-400"
  if (value >= 6) return "from-orange-400 to-amber-300"
  if (value >= 4) return "from-amber-400 to-yellow-300"
  return "from-slate-400 to-slate-300"
}

export function RatingBar({ label, title, value, maxValue = 10, showLabel = true, isOverall = false }: RatingBarProps) {
  const safeValue = Math.min(maxValue, Math.max(0, value))
  const widthPercent = `${(safeValue / maxValue) * 100}%`
  const gradientClass = getRatingGradient(safeValue)
  const ratingLabel = getRatingLabel(safeValue)
  const displayTitle = title || label || ""

  return (
    <div className="w-full">
      <div className="flex items-center justify-between gap-2 mb-1.5">
        {displayTitle && (
          <span className={`font-medium ${isOverall ? "text-base text-slate-900" : "text-xs text-slate-700"}`}>
            {displayTitle}
          </span>
        )}
        <div className="flex items-center gap-2">
          {showLabel && (
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
              safeValue >= 9 ? "bg-emerald-100 text-emerald-700" :
              safeValue >= 8 ? "bg-orange-100 text-orange-700" :
              safeValue >= 6 ? "bg-amber-100 text-amber-700" :
              "bg-slate-100 text-slate-600"
            }`}>
              {ratingLabel}
            </span>
          )}
          <span className={`font-bold tabular-nums ${isOverall ? "text-lg text-slate-900" : "text-xs text-slate-900"}`}>
            {safeValue.toFixed(1)}
          </span>
        </div>
      </div>
      <div
        className={`relative w-full overflow-hidden rounded-full bg-slate-100 ${isOverall ? "h-2.5" : "h-1.5"}`}
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={maxValue}
        aria-valuenow={safeValue}
        aria-label={displayTitle || "Bedømmelse"}
      >
        <div
          className={`h-full bg-gradient-to-r ${gradientClass} transition-all duration-500 ease-out rounded-full`}
          style={{ width: widthPercent }}
        />
      </div>
    </div>
  )
}

type ProductRatingProps = {
  ratings: Array<{ label: string; value: number }>
  overallRating: number
}

export function ProductRating({ ratings, overallRating }: ProductRatingProps) {
  return (
    <div className="my-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center mb-5 pb-4 border-b border-slate-100">
        <h4 className="text-base font-semibold text-slate-900">
          Bedømmelse & vurdering
        </h4>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4 mb-5">
        {ratings.map((rating, idx) => (
          <RatingBar key={idx} title={rating.label} value={rating.value} showLabel={false} />
        ))}
      </div>
      <div className="pt-4 border-t border-slate-100">
        <RatingBar 
          title="Helhedsbedømmelse" 
          value={overallRating} 
          showLabel={true}
          isOverall={true}
        />
      </div>
    </div>
  )
}
