'use client'

import { useState } from 'react'
import { fetchApi } from '../../lib/api'
import { getErrorMessage } from '../../lib/errors'

type MatchAnalysisResponse = {
  matchup: string
  analysis: string
  model: string
}

export default function MatchAnalysisCard() {
  const [equipoA, setEquipoA] = useState('Argentina')
  const [equipoB, setEquipoB] = useState('Brasil')
  const [analysis, setAnalysis] = useState<MatchAnalysisResponse | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  async function handleAnalyze(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setMessage(null)
    setIsLoading(true)

    try {
      const response = await fetchApi<MatchAnalysisResponse>('/api/ai/match-analysis', {
        method: 'POST',
        body: JSON.stringify({ equipoA, equipoB }),
      })

      setAnalysis(response)
    } catch (error: unknown) {
      setMessage(getErrorMessage(error, 'No se pudo generar el analisis'))
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <section id="analisis" className="scroll-mt-20 rounded-lg border border-zinc-200 bg-white p-5">
      <div className="flex flex-col gap-1">
        <h2 className="text-lg font-semibold text-zinc-950">Analisis IA de partido</h2>
        <p className="text-sm text-zinc-500">
          Gemini resume la probabilidad de victoria en maximo dos lineas.
        </p>
      </div>

      <form onSubmit={handleAnalyze} className="mt-5 grid gap-3 md:grid-cols-[1fr_1fr_auto] md:items-end">
        <div>
          <label htmlFor="team-a" className="block text-sm font-medium text-zinc-800">
            Equipo A
          </label>
          <input
            id="team-a"
            type="text"
            required
            value={equipoA}
            onChange={(event) => setEquipoA(event.target.value)}
            className="mt-2 h-10 w-full rounded-md border border-zinc-300 px-3 text-sm outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
          />
        </div>

        <div>
          <label htmlFor="team-b" className="block text-sm font-medium text-zinc-800">
            Equipo B
          </label>
          <input
            id="team-b"
            type="text"
            required
            value={equipoB}
            onChange={(event) => setEquipoB(event.target.value)}
            className="mt-2 h-10 w-full rounded-md border border-zinc-300 px-3 text-sm outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
          />
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="h-10 rounded-md bg-zinc-950 px-4 text-sm font-semibold text-white hover:bg-zinc-800 disabled:opacity-60"
        >
          {isLoading ? 'Analizando...' : 'Analizar'}
        </button>
      </form>

      {message && (
        <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {message}
        </p>
      )}

      {analysis && (
        <div className="mt-5 rounded-md border border-emerald-200 bg-emerald-50 p-4">
          <div className="text-sm font-semibold text-emerald-950">{analysis.matchup}</div>
          <p className="mt-2 whitespace-pre-line text-sm leading-6 text-zinc-800">{analysis.analysis}</p>
        </div>
      )}
    </section>
  )
}
