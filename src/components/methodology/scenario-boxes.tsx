interface Scenario {
  title: string
  description: string
  what: string
  why: string
  icon?: string
}

interface ScenarioBoxesProps {
  title?: string
  scenarios: Scenario[]
}

export function ScenarioBoxes({
  title = "Testscenarier",
  scenarios,
}: ScenarioBoxesProps) {
  return (
    <div className="my-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h3 className="mb-5 text-lg font-bold text-slate-900">{title}</h3>
      <div className="grid gap-4 sm:grid-cols-2">
        {scenarios.map((s, i) => (
          <div key={i} className="rounded-xl border border-slate-200 bg-gradient-to-br from-white to-slate-50 p-5">
            <div className="mb-2 flex items-center gap-2">
              <span className="text-xl">{s.icon || "🔬"}</span>
              <h4 className="text-sm font-bold text-slate-900">{s.title}</h4>
            </div>
            <p className="mb-3 text-xs text-slate-500">{s.description}</p>
            <div className="space-y-2 text-xs">
              <div className="rounded-lg bg-blue-50 p-2">
                <span className="font-semibold text-blue-700">Hvad: </span>
                <span className="text-blue-600">{s.what}</span>
              </div>
              <div className="rounded-lg bg-green-50 p-2">
                <span className="font-semibold text-green-700">Hvorfor: </span>
                <span className="text-green-600">{s.why}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
