import { ReactNode } from "react"
import { AdminRouteClientCleanup } from "./AdminRouteClientCleanup"

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <AdminRouteClientCleanup />
      {children}
    </>
  )
}
