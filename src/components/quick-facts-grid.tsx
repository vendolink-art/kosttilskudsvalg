interface Fact {
  label: string
  value: string
  icon?: string
}

interface QuickFactsGridProps {
  facts: Fact[]
  title?: string
}

export function QuickFactsGrid({ facts, title }: QuickFactsGridProps) {
  return (
    <div className="my-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
      {title && <h4 className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-500">{title}</h4>}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
        {facts.map((fact, i) => (
          <div key={i} className="rounded-lg bg-white p-2.5 shadow-sm">
            <div className="flex items-center gap-1.5">
              {fact.icon && <span className="text-sm">{fact.icon}</span>}
              <span className="text-[10px] font-medium uppercase tracking-wider text-slate-400">{fact.label}</span>
            </div>
            <p className="mt-0.5 text-sm font-bold text-slate-900">{fact.value}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
