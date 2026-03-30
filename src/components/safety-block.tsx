interface SafetyBlockProps {
  warnings?: string[]
  interactions?: string[]
  contraindications?: string[]
  title?: string
}

export function SafetyBlock({
  warnings,
  interactions,
  contraindications,
  title = "Sikkerhed & interaktioner"
}: SafetyBlockProps) {
  const hasContent = (warnings?.length || 0) + (interactions?.length || 0) + (contraindications?.length || 0) > 0
  if (!hasContent) return null

  return (
    <div className="my-6 rounded-xl border border-amber-200 bg-amber-50/50 p-5">
      <h3 className="flex items-center gap-2 text-sm font-semibold text-amber-900">
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
        {title}
      </h3>

      {warnings && warnings.length > 0 && (
        <div className="mt-3">
          <p className="text-xs font-medium uppercase tracking-wider text-amber-700">Advarsler</p>
          <ul className="mt-1 space-y-1">
            {warnings.map((w, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-amber-900">
                <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" />
                {w}
              </li>
            ))}
          </ul>
        </div>
      )}

      {interactions && interactions.length > 0 && (
        <div className="mt-3">
          <p className="text-xs font-medium uppercase tracking-wider text-amber-700">Interaktioner med medicin</p>
          <ul className="mt-1 space-y-1">
            {interactions.map((w, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-amber-900">
                <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" />
                {w}
              </li>
            ))}
          </ul>
        </div>
      )}

      {contraindications && contraindications.length > 0 && (
        <div className="mt-3">
          <p className="text-xs font-medium uppercase tracking-wider text-amber-700">Kontraindikationer</p>
          <ul className="mt-1 space-y-1">
            {contraindications.map((w, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-amber-900">
                <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-red-500" />
                {w}
              </li>
            ))}
          </ul>
        </div>
      )}

      <p className="mt-3 text-xs text-amber-700">
        Tal altid med din læge inden du starter på et nyt kosttilskud &ndash; særligt hvis du tager medicin.
      </p>
    </div>
  )
}
