export function Logo({ withWordmark = true }: { withWordmark?: boolean }) {
  return (
    <div className="flex items-center gap-2">
      {/* Ikon: blad/sundhed */}
      <svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M14 3C14 3 6 8 6 16C6 20.4183 9.58172 24 14 24C18.4183 24 22 20.4183 22 16C22 8 14 3 14 3Z" fill="#16a34a" opacity="0.15"/>
        <path d="M14 3C14 3 6 8 6 16C6 20.4183 9.58172 24 14 24C18.4183 24 22 20.4183 22 16C22 8 14 3 14 3Z" stroke="#16a34a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M14 10V20M14 20C12 18 10 16 10 14" stroke="#16a34a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
      {withWordmark && (
        <span className="text-lg font-bold tracking-tight text-slate-900" style={{ letterSpacing: "-0.02em" }}>
          Kosttilskudsvalg
        </span>
      )}
    </div>
  )
}
