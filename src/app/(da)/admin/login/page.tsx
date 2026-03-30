import { Suspense } from "react"
import { LoginForm } from "./login-form"

export const metadata = {
  title: "Admininloggning – Kosttilskudsvalg",
  robots: { index: false, follow: false },
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="flex min-h-[60vh] items-center justify-center"><p className="text-slate-500">Laddar...</p></div>}>
      <LoginForm />
    </Suspense>
  )
}
