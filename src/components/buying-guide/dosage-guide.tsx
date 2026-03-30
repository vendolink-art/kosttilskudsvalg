interface DosageStep {
  step: number
  title: string
  description: string
  tip?: string
}

interface DosageGuideProps {
  title?: string
  steps: DosageStep[]
  warnings?: string[]
}

export function DosageGuide({
  title = "Doseringsguide – sådan tager du tilskuddet",
  steps,
  warnings,
}: DosageGuideProps) {
  return (
    <div className="my-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-5 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-100">
          <svg className="h-5 w-5 text-teal-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
          </svg>
        </div>
        <h3 className="text-lg font-bold text-slate-900">{title}</h3>
      </div>

      <div className="space-y-4">
        {steps.map((step) => (
          <div key={step.step} className="flex gap-4">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-teal-600 text-sm font-bold text-white">
              {step.step}
            </div>
            <div className="flex-1">
              <h4 className="text-sm font-semibold text-slate-900">{step.title}</h4>
              <p className="mt-0.5 text-sm text-slate-600 leading-relaxed">{step.description}</p>
              {step.tip && (
                <p className="mt-1 text-xs text-teal-600 italic">💡 {step.tip}</p>
              )}
            </div>
          </div>
        ))}
      </div>

      {warnings && warnings.length > 0 && (
        <div className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4">
          <p className="mb-2 text-xs font-bold uppercase tracking-wider text-red-700">Vigtigt at huske</p>
          <ul className="space-y-1">
            {warnings.map((w, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-red-800">
                <span className="mt-0.5 text-red-500">⚠</span>
                {w}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
