import type { Author } from "@/config/authors"

export function AuthorCard({ a }: { a: Author }) {
  return (
    <div className="flex items-start gap-4 rounded-xl border border-slate-200 bg-white p-4">
      {a.avatar && (
        <img
          src={a.avatar}
          alt={a.name}
          className="eeat-avatar h-14 w-14 shrink-0 rounded-full object-cover"
          loading="lazy"
        />
      )}
      <div>
        <h3 className="text-sm font-semibold text-slate-900">{a.name}</h3>
        <p className="text-xs font-medium text-green-700">{a.title}</p>
        <p className="mt-1 text-xs leading-relaxed text-slate-600">{a.bio}</p>
        {a.specialties.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {a.specialties.map((s) => (
              <span key={s} className="inline-block rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600">
                {s}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
