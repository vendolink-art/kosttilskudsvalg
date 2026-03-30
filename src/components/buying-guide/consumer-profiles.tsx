interface Profile {
  name: string
  icon: string
  description: string
  recommended: string
  anchor?: string
  priority: string[]
}

interface ConsumerProfilesProps {
  title?: string
  profiles: Profile[]
}

export function ConsumerProfiles({
  title = "Hvilken type er du?",
  profiles,
}: ConsumerProfilesProps) {
  return (
    <div className="my-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-5 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100">
          <svg className="h-5 w-5 text-emerald-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </div>
        <h3 className="text-lg font-bold text-slate-900">{title}</h3>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {profiles.map((profile, i) => (
          <div key={i} className="rounded-xl border border-slate-100 bg-slate-50 p-4 transition hover:border-emerald-200 hover:shadow-sm">
            <div className="mb-2 text-2xl">{profile.icon}</div>
            <h4 className="text-sm font-bold text-slate-900">{profile.name}</h4>
            <p className="mt-1 text-xs text-slate-500 leading-relaxed">{profile.description}</p>
            <div className="mt-3 flex flex-wrap gap-1">
              {profile.priority.map((p, j) => (
                <span key={j} className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-medium text-emerald-700">
                  {p}
                </span>
              ))}
            </div>
            <div className="mt-3 border-t border-slate-200 pt-2">
              <p className="text-xs text-slate-400">Vores anbefaling:</p>
              {profile.anchor ? (
                <a href={profile.anchor} className="text-sm font-semibold text-green-700 hover:text-green-800">
                  {profile.recommended} →
                </a>
              ) : (
                <p className="text-sm font-semibold text-slate-900">{profile.recommended}</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
