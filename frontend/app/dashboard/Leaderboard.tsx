'use client'

import { useEffect, useState } from 'react'
import { fetchApi } from '../../lib/api'

type LeaderboardRow = {
  id: string
  posicion: number
  nombre: string
  email: string
  puntaje_total: number
}

type LeaderboardResponse = {
  source: 'redis' | 'database' | 'database-no-cache'
  rows: LeaderboardRow[]
  ttlSeconds: number
}

type LeaderboardProps = {
  salaId: string | null
}

export default function Leaderboard({ salaId }: LeaderboardProps) {
  const [leaderboard, setLeaderboard] = useState<LeaderboardResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (!salaId) {
      return
    }

    let isActive = true

    async function loadLeaderboard() {
      setIsLoading(true)
      setError(null)

      try {
        const response = await fetchApi<LeaderboardResponse>(`/api/salas/${salaId}/leaderboard`)
        if (isActive) setLeaderboard(response)
      } catch (requestError) {
        if (isActive) {
          setError(requestError instanceof Error ? requestError.message : 'No se pudo cargar la tabla')
        }
      } finally {
        if (isActive) setIsLoading(false)
      }
    }

    loadLeaderboard()
    const intervalId = window.setInterval(loadLeaderboard, 30000)

    return () => {
      isActive = false
      window.clearInterval(intervalId)
    }
  }, [salaId])

  return (
    <section className="rounded-lg border border-zinc-200 bg-white">
      <div className="flex items-center justify-between border-b border-zinc-200 px-5 py-4">
        <div>
          <h2 className="text-lg font-semibold text-zinc-950">Leaderboard</h2>
          <p className="text-sm text-zinc-500">
            {leaderboard ? `Fuente: ${leaderboard.source === 'redis' ? 'Redis cache' : 'base de datos'}` : 'Selecciona una sala'}
          </p>
        </div>
        {isLoading && <span className="text-sm text-zinc-500">Actualizando...</span>}
      </div>

      {!salaId && (
        <div className="px-5 py-8 text-sm text-zinc-500">
          Crea una sala para ver la tabla de posiciones.
        </div>
      )}

      {error && (
        <div className="px-5 py-4 text-sm text-red-600">
          {error}
        </div>
      )}

      {salaId && !error && (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[520px] text-left text-sm">
            <thead className="bg-zinc-50 text-xs uppercase tracking-wide text-zinc-500">
              <tr>
                <th className="px-5 py-3">Pos.</th>
                <th className="px-5 py-3">Participante</th>
                <th className="px-5 py-3 text-right">Puntaje</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {leaderboard?.rows.map((row) => (
                <tr key={row.id}>
                  <td className="px-5 py-4 font-semibold text-zinc-900">{row.posicion}</td>
                  <td className="px-5 py-4">
                    <div className="font-medium text-zinc-950">{row.nombre}</div>
                    <div className="text-xs text-zinc-500">{row.email}</div>
                  </td>
                  <td className="px-5 py-4 text-right font-semibold text-zinc-950">{row.puntaje_total}</td>
                </tr>
              ))}

              {leaderboard?.rows.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-5 py-8 text-center text-zinc-500">
                    Todavia no hay participantes en esta sala.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
