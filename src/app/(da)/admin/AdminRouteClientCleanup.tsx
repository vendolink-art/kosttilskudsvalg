"use client"

import { useEffect, useRef } from "react"
import { usePathname } from "next/navigation"
import {
  ADMIN_404_STICKY_ROWS_KEY,
  ADMIN_404_UNLOAD_MARKER_KEY,
} from "@/lib/admin-404-client-state"

function clearAdmin404StickyRows() {
  try {
    sessionStorage.removeItem(ADMIN_404_STICKY_ROWS_KEY)
  } catch {
    // ignore storage failures
  }
}

export function AdminRouteClientCleanup() {
  const pathname = usePathname()
  const previousPathname = useRef(pathname)

  useEffect(() => {
    const handleBeforeUnload = () => {
      try {
        sessionStorage.setItem(ADMIN_404_UNLOAD_MARKER_KEY, "1")
      } catch {
        // ignore storage failures
      }
    }

    window.addEventListener("beforeunload", handleBeforeUnload)
    return () => window.removeEventListener("beforeunload", handleBeforeUnload)
  }, [])

  useEffect(() => {
    try {
      const shouldClear = sessionStorage.getItem(ADMIN_404_UNLOAD_MARKER_KEY) === "1"
      if (pathname === "/admin/404" && shouldClear) {
        clearAdmin404StickyRows()
      }
      sessionStorage.removeItem(ADMIN_404_UNLOAD_MARKER_KEY)
    } catch {
      // ignore storage failures
    }
  }, [pathname])

  useEffect(() => {
    if (previousPathname.current === "/admin/404" && pathname !== "/admin/404") {
      clearAdmin404StickyRows()
    }
    previousPathname.current = pathname
  }, [pathname])

  return null
}
