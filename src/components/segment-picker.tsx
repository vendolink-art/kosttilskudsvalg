import Link from "next/link"

interface Segment {
  label: string
  product: string
  anchor?: string
}

interface SegmentPickerProps {
  segments: Segment[]
  title?: string
}

export function SegmentPicker({ segments, title = "Hurtig anbefaling" }: SegmentPickerProps) {
  return (
    <div className="my-6 rounded-xl border border-slate-200 bg-white p-5">
      <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
      <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {segments.map((seg, i) => (
          <a
            key={i}
            href={seg.anchor || "#"}
            className="group rounded-lg border border-slate-200 bg-slate-50 p-3 transition hover:border-green-300 hover:bg-green-50"
          >
            <p className="text-xs font-medium uppercase tracking-wider text-slate-400 group-hover:text-green-600">
              {seg.label}
            </p>
            <p className="mt-1 text-sm font-semibold text-slate-900 group-hover:text-green-800">
              {seg.product}
            </p>
          </a>
        ))}
      </div>
    </div>
  )
}
