interface Source {
  id: number
  title: string
  url?: string
  type?: "myndighed" | "studie" | "retningslinje" | "producent" | "brugeranmeldelse"
}

interface SourceListProps {
  sources: Source[]
  title?: string
}

const TYPE_LABELS: Record<string, string> = {
  myndighed: "Myndighed",
  studie: "Studie",
  retningslinje: "Retningslinje",
  producent: "Producent",
  brugeranmeldelse: "Brugeranmeldelse",
}

export function SourceList({ sources, title = "Kilder" }: SourceListProps) {
  if (!sources || sources.length === 0) return null

  return (
    <div className="my-6 rounded-xl border border-slate-200 bg-white">
      <div className="border-b border-slate-100 px-5 py-3">
        <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
      </div>
      <ol className="divide-y divide-slate-100">
        {sources.map((source) => (
          <li key={source.id} className="flex gap-3 px-5 py-2.5">
            <span className="shrink-0 text-xs font-medium text-slate-400 tabular-nums">
              [{source.id}]
            </span>
            <div className="flex-1">
              {source.url ? (
                <a
                  href={source.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-green-700 underline hover:text-green-800"
                >
                  {source.title}
                </a>
              ) : (
                <span className="text-sm text-slate-700">{source.title}</span>
              )}
              {source.type && (
                <span className="ml-2 inline-block rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-500">
                  {TYPE_LABELS[source.type] || source.type}
                </span>
              )}
            </div>
          </li>
        ))}
      </ol>
    </div>
  )
}
