interface UpdateEntry {
  date: string
  description: string
}

interface UpdateLogProps {
  entries: UpdateEntry[]
  title?: string
}

export function UpdateLog({ entries, title = "Opdateringslog" }: UpdateLogProps) {
  if (!entries || entries.length === 0) return null

  return (
    <div className="my-6 rounded-xl border border-slate-200 bg-white">
      <div className="border-b border-slate-100 px-5 py-3">
        <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
      </div>
      <div className="divide-y divide-slate-100">
        {entries.map((entry, i) => (
          <div key={i} className="flex gap-4 px-5 py-3">
            <span className="shrink-0 text-xs font-medium text-slate-400 tabular-nums">
              {entry.date}
            </span>
            <p className="text-sm text-slate-700">{entry.description}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
