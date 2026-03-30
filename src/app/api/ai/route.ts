import { NextResponse } from "next/server"
import { isAuthenticated } from "@/lib/auth"

export async function POST(request: Request) {
  const authenticated = await isAuthenticated()
  if (!authenticated) {
    return NextResponse.json({ error: "Ikke autoriseret" }, { status: 401 })
  }

  try {
    const { contentType, title } = await request.json()

    // Placeholder – integrer med OpenAI/Gemini her
    const content = `---
title: "${title}"
description: "En guide om ${title}"
date: "${new Date().toISOString().split("T")[0]}"
updated: "${new Date().toISOString().split("T")[0]}"
author: "redaktionen"
category: "Kosttilskud"
tags: ["${contentType}"]
affiliate_disclosure: true
---

# ${title}

Indhold genereres snart via AI...
`

    return NextResponse.json({ content, contentType })
  } catch {
    return NextResponse.json({ error: "Fejl ved generering" }, { status: 500 })
  }
}
