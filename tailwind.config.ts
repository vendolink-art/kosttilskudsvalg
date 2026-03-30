import type { Config } from "tailwindcss"
import typography from "@tailwindcss/typography"

export default {
  content: ["./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx,mdx}"],
  theme: { extend: {} },
  plugins: [typography],
} satisfies Config
