interface Insight {
  title: string
  description: string
  icon: string
}

interface TestInsightsProps {
  insights: Insight[]
  title?: string
}

export function TestInsights({
  insights,
  title = "Hvad vi har lært af vores tests",
}: TestInsightsProps) {
  return (
    <section className="my-12">
      <h2 className="mb-6 text-2xl font-bold text-slate-900">{title}</h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {insights.map((insight, i) => (
          <div key={i} className="rounded-xl border border-slate-200 bg-gradient-to-br from-white to-slate-50 p-5 shadow-sm">
            <div className="mb-3 text-2xl">{insight.icon}</div>
            <h3 className="text-sm font-bold text-slate-900">{insight.title}</h3>
            <p className="mt-1 text-xs text-slate-500 leading-relaxed">{insight.description}</p>
          </div>
        ))}
      </div>
    </section>
  )
}
