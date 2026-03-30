"use client"

interface DecisionNode {
  question: string
  options: {
    label: string
    next?: string // ID of next node, or null for a recommendation
    recommendation?: string
    anchor?: string
  }[]
}

interface DecisionMapProps {
  title?: string
  nodes: Record<string, DecisionNode>
  startNode?: string
}

import { useState } from "react"

export function DecisionMap({
  title = "Hvilket produkt passer til dig?",
  nodes,
  startNode = "start",
}: DecisionMapProps) {
  const [path, setPath] = useState<string[]>([startNode])
  const [recommendation, setRecommendation] = useState<{ text: string; anchor?: string } | null>(null)

  const currentNodeId = path[path.length - 1]
  const currentNode = nodes[currentNodeId]

  function handleChoice(option: DecisionNode["options"][number]) {
    if (option.recommendation) {
      setRecommendation({ text: option.recommendation, anchor: option.anchor })
    } else if (option.next) {
      setPath([...path, option.next])
    }
  }

  function handleReset() {
    setPath([startNode])
    setRecommendation(null)
  }

  function handleBack() {
    if (path.length > 1) {
      setPath(path.slice(0, -1))
      setRecommendation(null)
    }
  }

  return (
    <div className="my-8 rounded-2xl border border-slate-200 bg-gradient-to-br from-white to-slate-50 p-6 shadow-sm">
      <div className="mb-4 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-100">
          <svg className="h-5 w-5 text-green-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
          </svg>
        </div>
        <h3 className="text-lg font-bold text-slate-900">{title}</h3>
      </div>

      {/* Progress */}
      <div className="mb-4 flex items-center gap-1.5">
        {path.map((_, i) => (
          <div key={i} className={`h-1.5 flex-1 rounded-full ${i < path.length ? "bg-green-500" : "bg-slate-200"}`} />
        ))}
        {!recommendation && <div className="h-1.5 flex-1 rounded-full bg-slate-200" />}
      </div>

      {recommendation ? (
        <div className="rounded-xl border border-green-200 bg-green-50 p-5 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
            <svg className="h-6 w-6 text-green-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <p className="text-sm font-medium text-green-800">Vores anbefaling til dig:</p>
          <p className="mt-1 text-lg font-bold text-green-900">{recommendation.text}</p>
          {recommendation.anchor && (
            <a href={recommendation.anchor} className="mt-3 inline-block rounded-lg bg-green-700 px-4 py-2 text-sm font-semibold text-white hover:bg-green-800">
              Se produkt →
            </a>
          )}
          <button onClick={handleReset} className="mt-3 block mx-auto text-xs text-green-600 underline hover:text-green-700">
            Start forfra
          </button>
        </div>
      ) : currentNode ? (
        <div>
          <p className="mb-4 text-base font-semibold text-slate-800">{currentNode.question}</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {currentNode.options.map((opt, i) => (
              <button
                key={i}
                onClick={() => handleChoice(opt)}
                className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-left text-sm font-medium text-slate-700 shadow-sm transition hover:border-green-300 hover:bg-green-50 hover:text-green-800"
              >
                {opt.label}
              </button>
            ))}
          </div>
          {path.length > 1 && (
            <button onClick={handleBack} className="mt-3 text-xs text-slate-400 underline hover:text-slate-600">
              ← Gå tilbage
            </button>
          )}
        </div>
      ) : (
        <p className="text-sm text-slate-500">Kunne ikke finde næste spørgsmål.</p>
      )}
    </div>
  )
}
