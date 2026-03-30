import type { LucideIcon } from "lucide-react"

interface FeatureCardProps {
  title: string
  desc: string
  icon: LucideIcon
  iconColor?: "primary" | "default"
}

export function FeatureCard({ title, desc, icon: Icon, iconColor = "default" }: FeatureCardProps) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div
        className={`mb-3 inline-flex rounded-lg p-2 ${
          iconColor === "primary" ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-600"
        }`}
      >
        <Icon className="h-5 w-5" />
      </div>
      <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
      <p className="mt-1 text-sm leading-relaxed text-slate-600">{desc}</p>
    </div>
  )
}
