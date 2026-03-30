interface MeasurementPoint {
  label: string
  description: string
  weight: number
  icon?: string
}

interface MeasurementPointsProps {
  title?: string
  points: MeasurementPoint[]
}

export function MeasurementPoints({
  title = "Hvad vi måler og vurderer",
  points,
}: MeasurementPointsProps) {
  return (
    <div className="my-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h3 className="mb-5 text-lg font-bold text-slate-900">{title}</h3>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {points.map((point, i) => (
          <div key={i} className="rounded-xl border border-slate-100 bg-slate-50 p-4 transition hover:border-green-200 hover:bg-green-50/30">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-lg">{point.icon || "📊"}</span>
              <span className="rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-bold text-green-700">
                {point.weight}%
              </span>
            </div>
            <h4 className="text-sm font-bold text-slate-900">{point.label}</h4>
            <p className="mt-1 text-xs text-slate-500 leading-relaxed">{point.description}</p>
            <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
              <div className="h-full rounded-full bg-green-500" style={{ width: `${point.weight}%` }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
