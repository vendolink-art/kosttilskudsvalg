interface Difference {
  factor: string
  range: string
  impact: "Høj" | "Middel" | "Lav"
  explanation: string
}

interface DifferenceHighlightsProps {
  title?: string
  differences: Difference[]
}

const IMPACT_STYLES = {
  "Høj": "bg-red-100 text-red-800",
  "Middel": "bg-amber-100 text-amber-800",
  "Lav": "bg-green-100 text-green-800",
}

export function DifferenceHighlights({
  title = "Nøgleforskelle mellem produkterne",
  differences,
}: DifferenceHighlightsProps) {
  return (
    <div className="my-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h3 className="mb-5 text-lg font-bold text-slate-900">{title}</h3>
      <div className="space-y-3">
        {differences.map((d, i) => (
          <div key={i} className="flex items-start gap-4 rounded-xl border border-slate-100 bg-slate-50 p-4 transition hover:bg-white hover:shadow-sm">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-bold text-slate-900">{d.factor}</h4>
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${IMPACT_STYLES[d.impact]}`}>
                  {d.impact} påvirkning
                </span>
              </div>
              <p className="mt-1 text-sm text-slate-600">{d.explanation}</p>
            </div>
            <div className="shrink-0 text-right">
              <span className="text-xs font-medium text-slate-400">Spredning</span>
              <p className="text-sm font-bold text-slate-900">{d.range}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
