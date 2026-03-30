"use client"

interface Criterion {
  label: string
  weight: number // percent 0-100
  description?: string
}

export function CriteriaWeightBars({ criteria }: { criteria: Criterion[] }) {
  return (
    <div className="my-8 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <h4 className="mb-4 text-base font-semibold text-slate-900">
        Vores vurderingskriterier
      </h4>
      <div className="space-y-4">
        {criteria.map((c, i) => (
          <div key={i}>
            <div className="mb-1 flex items-center justify-between">
              <span className="text-sm font-medium text-slate-700">{c.label}</span>
              <span className="text-sm font-bold text-slate-800">{c.weight}%</span>
            </div>
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-gradient-to-r from-green-600 to-green-400 transition-all duration-500"
                style={{ width: `${c.weight}%` }}
              />
            </div>
            {c.description && (
              <p className="mt-1 text-xs text-slate-500">{c.description}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
