type StackItem = string | { label: string; href?: string }

interface StackCombo {
  supplements: StackItem[]
  benefit: string
  timing?: string
  note?: string
}

interface SupplementStackingProps {
  title?: string
  combos: StackCombo[]
  warnings?: string[]
}

export function SupplementStacking({
  title = "Tilskudssynergier – hvad fungerer godt sammen",
  combos,
  warnings,
}: SupplementStackingProps) {
  return (
    <div className="my-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-5 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-100">
          <svg className="h-5 w-5 text-purple-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        </div>
        <h3 className="text-lg font-bold text-slate-900">{title}</h3>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {combos.map((combo, i) => (
          <div key={i} className="rounded-xl border border-slate-100 bg-slate-50 p-4 transition hover:border-purple-200 hover:bg-purple-50/30">
            <div className="mb-2 flex flex-wrap gap-1.5">
              {combo.supplements.map((item, j) => (
                <span key={j}>
                  {typeof item === "string" || !item.href ? (
                    <span className="inline-block rounded-full bg-purple-100 px-2.5 py-0.5 text-xs font-semibold text-purple-800">
                      {typeof item === "string" ? item : item.label}
                    </span>
                  ) : (
                    <a
                      href={item.href}
                      className="inline-block rounded-full bg-purple-100 px-2.5 py-0.5 text-xs font-semibold text-purple-800 underline decoration-purple-400 underline-offset-2 transition hover:bg-purple-200"
                    >
                      {item.label}
                    </a>
                  )}
                  {j < combo.supplements.length - 1 && (
                    <span className="mx-1 text-slate-400">+</span>
                  )}
                </span>
              ))}
            </div>
            <p className="text-sm font-medium text-slate-800">{combo.benefit}</p>
            {combo.timing && (
              <p className="mt-1 text-xs text-slate-500">⏱ {combo.timing}</p>
            )}
            {combo.note && (
              <p className="mt-1 text-xs text-slate-400 italic">{combo.note}</p>
            )}
          </div>
        ))}
      </div>

      {warnings && warnings.length > 0 && (
        <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-amber-700">Undgå at kombinere</p>
          <ul className="space-y-1">
            {warnings.map((w, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-amber-800">
                <svg className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-500" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                {w}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
