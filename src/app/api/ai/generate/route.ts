import { NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import { checkRateLimit } from "@/lib/rate-limit";
import {
  buildPromptPipeline,
  assembleMdx,
  getSystemPrompt,
} from "@/lib/prompts";
import type { ArticleInput } from "@/lib/prompts";

export async function POST(request: Request) {
  const authenticated = await isAuthenticated();
  if (!authenticated) {
    return NextResponse.json({ error: "Ikke autoriseret" }, { status: 401 });
  }

  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const rl = checkRateLimit(`ai-generate:${ip}`, 10, 60 * 1000);
  if (!rl.ok) {
    return NextResponse.json(
      { error: "For mange anmodninger. Vent venligst." },
      {
        status: 429,
        headers: { "Retry-After": String(Math.ceil(rl.retryAfterMs / 1000)) },
      },
    );
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "OPENAI_API_KEY ikke konfigureret i .env.local" },
      { status: 500 }
    );
  }

  let input: ArticleInput;
  try {
    input = await request.json();
  } catch {
    return NextResponse.json({ error: "Ugyldig JSON" }, { status: 400 });
  }

  if (!input.keyword || !input.products || input.products.length === 0) {
    return NextResponse.json(
      { error: "keyword og mindst 1 produkt er påkrævet" },
      { status: 400 }
    );
  }

  // Default values
  input.year = input.year || new Date().getFullYear();
  input.secondaryKeywords = input.secondaryKeywords || [
    `bedste ${input.keyword}`,
    `${input.keyword} bedst i test`,
    `${input.keyword} test`,
  ];
  input.category = input.category || "Kosttilskud";
  input.categorySlug = input.categorySlug || "kosttilskud";

  const pipeline = buildPromptPipeline(input);
  const systemPrompt = getSystemPrompt();
  const model = process.env.OPENAI_MODEL || "gpt-5.4";

  // Streaming response
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const sectionOutputs: { id: string; content: string }[] = [];

      for (const step of pipeline) {
        // Send progress event
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({ type: "progress", section: step.id, heading: step.heading })}\n\n`
          )
        );

        try {
          const maxTokensBySection: Record<string, number> = {
            intro: 1200,
            method: 2600,
            "buyers-guide": 3200,
            benefits: 2600,
            caveats: 2600,
            faq: 1800,
            sources: 1800,
          };
          const response = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${apiKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model,
              messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: step.prompt },
              ],
              temperature: 0.7,
              max_completion_tokens: maxTokensBySection[step.id] || 1600,
            }),
          });

          if (!response.ok) {
            const errorText = await response.text();
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({ type: "error", section: step.id, error: `API-fejl: ${response.status}` })}\n\n`
              )
            );
            sectionOutputs.push({ id: step.id, content: `<!-- Fejl ved generering af ${step.heading} -->` });
            continue;
          }

          const data = await response.json();
          const content = data.choices?.[0]?.message?.content || "";

          sectionOutputs.push({ id: step.id, content });

          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ type: "section", section: step.id, heading: step.heading, content })}\n\n`
            )
          );
        } catch (err) {
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ type: "error", section: step.id, error: "Netværksfejl" })}\n\n`
            )
          );
          sectionOutputs.push({ id: step.id, content: `<!-- Fejl ved generering af ${step.heading} -->` });
        }
      }

      // Assemble full MDX
      const fullMdx = assembleMdx(input, sectionOutputs);

      controller.enqueue(
        encoder.encode(
          `data: ${JSON.stringify({ type: "complete", fullMdx })}\n\n`
        )
      );

      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
