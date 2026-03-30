interface Step {
  step: number
  title: string
  description: string
  duration?: string
}

interface TestStepsProps {
  title?: string
  steps: Step[]
}

export function TestSteps({
  title = "Vores testproces – trin for trin",
  steps,
}: TestStepsProps) {
  return (
    <div className="my-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h3 className="mb-5 text-lg font-bold text-slate-900">{title}</h3>
      <div className="relative space-y-6">
        {steps.map((step, i) => (
          <div key={i} className="relative flex gap-4">
            {i < steps.length - 1 && (
              <div className="absolute left-5 top-12 bottom-0 w-0.5 bg-gradient-to-b from-green-300 to-slate-200" />
            )}
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-green-600 text-sm font-bold text-white shadow-sm">
              {step.step}
            </div>
            <div className="flex-1 pb-2">
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-bold text-slate-900">{step.title}</h4>
                {step.duration && (
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-500">{step.duration}</span>
                )}
              </div>
              <p className="mt-1 text-sm text-slate-600 leading-relaxed">{step.description}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
