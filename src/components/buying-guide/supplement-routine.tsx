interface RoutineStep {
  time: string
  supplement: string
  dose: string
  withFood: boolean
  tip?: string
}

interface SupplementRoutineProps {
  title?: string
  steps: RoutineStep[]
  note?: string
}

export function SupplementRoutine({
  title = "Anbefalet daglig rutine",
  steps,
  note,
}: SupplementRoutineProps) {
  return (
    <div className="my-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-5 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100">
          <svg className="h-5 w-5 text-blue-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h3 className="text-lg font-bold text-slate-900">{title}</h3>
      </div>

      <div className="relative space-y-0">
        {steps.map((step, i) => (
          <div key={i} className="relative flex gap-4 pb-6 last:pb-0">
            {/* Timeline line */}
            {i < steps.length - 1 && (
              <div className="absolute left-[19px] top-10 bottom-0 w-0.5 bg-slate-200" />
            )}
            {/* Time dot */}
            <div className="flex flex-col items-center">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 border-blue-200 bg-blue-50 text-xs font-bold text-blue-700">
                {step.time}
              </div>
            </div>
            {/* Content */}
            <div className="flex-1 rounded-xl border border-slate-100 bg-slate-50 p-3">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-slate-900">{step.supplement}</span>
                <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs font-medium text-slate-600">{step.dose}</span>
              </div>
              <div className="mt-1 flex items-center gap-3 text-xs text-slate-500">
                <span>{step.withFood ? "🍽 Med mad" : "💧 På tom mave"}</span>
                {step.tip && <span className="text-slate-400">• {step.tip}</span>}
              </div>
            </div>
          </div>
        ))}
      </div>

      {note && (
        <p className="mt-4 rounded-lg bg-slate-50 p-3 text-xs text-slate-500 italic">{note}</p>
      )}
    </div>
  )
}
