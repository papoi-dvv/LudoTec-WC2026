'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import DashboardNav from '../dashboard/DashboardNav'
import { fetchApi } from '../../lib/api'
import { isAdminUser } from '../../lib/adminAuth'
import { getErrorMessage } from '../../lib/errors'
import { supabase } from '../../lib/supabaseClient'

type Match = {
  id: string
  equipo_local: string
  equipo_visitante: string
  fecha_partido: string
  estado: string
  goles_local: number | null
  goles_visitante: number | null
}

type ScoreForm = {
  goles_local: string
  goles_visitante: string
}

type FinalizeResponse = {
  partido: Match
  scoringResult?: {
    partidoId: string
    processed: number
    skipped: number
  }
  scoringJob?: {
    id: string
    name: string
  }
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('es-PE', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

function getInitialForm(match: Match): ScoreForm {
  return {
    goles_local: match.goles_local === null ? '' : String(match.goles_local),
    goles_visitante: match.goles_visitante === null ? '' : String(match.goles_visitante),
  }
}

export default function AdminPage() {
  const router = useRouter()
  const [isCheckingAccess, setIsCheckingAccess] = useState(true)
  const [hasAccess, setHasAccess] = useState(false)
  const [matches, setMatches] = useState<Match[]>([])
  const [forms, setForms] = useState<Record<string, ScoreForm>>({})
  const [message, setMessage] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [savingMatchId, setSavingMatchId] = useState<string | null>(null)

  const stats = useMemo(() => {
    const finished = matches.filter((match) => match.estado === 'FINALIZADO').length

    return {
      total: matches.length,
      finished,
      open: matches.length - finished,
    }
  }, [matches])

  useEffect(() => {
    let isActive = true

    async function loadAdminPage() {
      try {
        const { data } = await supabase.auth.getUser()
        const canAccess = isAdminUser(data.user)

        if (!canAccess) {
          if (isActive) {
            setHasAccess(false)
            router.replace('/dashboard')
          }
          return
        }

        if (isActive) {
          setHasAccess(true)
          setIsCheckingAccess(false)
        }

        const response = await fetchApi<{ partidos: Match[] }>('/api/admin/partidos')
        if (!isActive) return

        setMatches(response.partidos)
        setForms(Object.fromEntries(response.partidos.map((match) => [match.id, getInitialForm(match)])))
      } catch (error: unknown) {
        if (isActive) setMessage(getErrorMessage(error, 'No se pudieron cargar los partidos'))
      } finally {
        if (isActive) {
          setIsLoading(false)
          setIsCheckingAccess(false)
        }
      }
    }

    loadAdminPage()

    return () => {
      isActive = false
    }
  }, [router])

  function updateScore(matchId: string, field: keyof ScoreForm, value: string) {
    setForms((current) => ({
      ...current,
      [matchId]: {
        ...current[matchId],
        [field]: value,
      },
    }))
  }

  async function finalizeMatch(match: Match) {
    const form = forms[match.id]
    const golesLocal = Number(form?.goles_local)
    const golesVisitante = Number(form?.goles_visitante)

    if (!Number.isInteger(golesLocal) || !Number.isInteger(golesVisitante) || golesLocal < 0 || golesVisitante < 0) {
      setMessage('Ingresa marcadores enteros y no negativos.')
      return
    }

    setSavingMatchId(match.id)
    setMessage(null)

    try {
      const response = await fetchApi<FinalizeResponse>(`/api/admin/partidos/${match.id}/finalizar`, {
        method: 'POST',
        body: JSON.stringify({
          goles_local: golesLocal,
          goles_visitante: golesVisitante,
          procesar_ahora: true,
        }),
      })

      setMatches((current) => current.map((item) => (item.id === match.id ? response.partido : item)))
      const processed = response.scoringResult?.processed ?? 0
      const skipped = response.scoringResult?.skipped ?? 0
      setMessage(`Simulado aplicado: ${processed} predicciones procesadas, ${skipped} ya estaban procesadas.`)
    } catch (error: unknown) {
      setMessage(getErrorMessage(error, 'No se pudo simular el puntaje'))
    } finally {
      setSavingMatchId(null)
    }
  }

  return (
    <div className="min-h-screen bg-[#f6f8f4]">
      <DashboardNav />

      <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        {isCheckingAccess && (
          <section className="rounded-lg border border-zinc-200 bg-white px-5 py-12 text-center text-sm text-zinc-500 shadow-sm">
            Validando permisos...
          </section>
        )}

        {!isCheckingAccess && !hasAccess && (
          <section className="rounded-lg border border-zinc-200 bg-white px-5 py-12 text-center text-sm text-zinc-500 shadow-sm">
            Redirigiendo al dashboard...
          </section>
        )}

        {hasAccess && (
        <section className="overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-sm">
          <div className="bg-[#082845] px-5 py-5 text-white">
            <p className="text-xs font-semibold uppercase tracking-wide text-blue-100">Administración</p>
            <h1 className="mt-1 text-2xl font-bold">Simular resultados y puntajes</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-200">
              Carga el marcador final de un partido para finalizarlo y ejecutar el motor de puntajes ya desarrollado.
            </p>
          </div>

          <div className="grid gap-3 border-b border-zinc-200 p-5 sm:grid-cols-3">
            <div className="rounded-md bg-zinc-50 p-4">
              <div className="text-2xl font-semibold text-zinc-950">{stats.total}</div>
              <div className="text-sm text-zinc-500">Partidos</div>
            </div>
            <div className="rounded-md bg-emerald-50 p-4">
              <div className="text-2xl font-semibold text-emerald-800">{stats.finished}</div>
              <div className="text-sm text-emerald-700">Finalizados</div>
            </div>
            <div className="rounded-md bg-amber-50 p-4">
              <div className="text-2xl font-semibold text-amber-800">{stats.open}</div>
              <div className="text-sm text-amber-700">Pendientes</div>
            </div>
          </div>

          {message && (
            <div className="border-b border-zinc-200 bg-zinc-50 px-5 py-3 text-sm text-zinc-800">
              {message}
            </div>
          )}

          {isLoading ? (
            <div className="px-5 py-12 text-center text-sm text-zinc-500">Cargando partidos...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[820px] text-left text-sm">
                <thead className="bg-zinc-50 text-xs uppercase tracking-wide text-zinc-500">
                  <tr>
                    <th className="px-5 py-3">Partido</th>
                    <th className="px-5 py-3">Fecha</th>
                    <th className="px-5 py-3">Estado</th>
                    <th className="px-5 py-3 text-center">Marcador</th>
                    <th className="px-5 py-3 text-right">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {matches.map((match) => {
                    const form = forms[match.id] || getInitialForm(match)
                    const isSaving = savingMatchId === match.id

                    return (
                      <tr key={match.id} className="align-middle">
                        <td className="px-5 py-4">
                          <div className="font-semibold text-zinc-950">
                            {match.equipo_local} vs {match.equipo_visitante}
                          </div>
                          <div className="text-xs text-zinc-500">{match.id}</div>
                        </td>
                        <td className="px-5 py-4 text-zinc-600">{formatDate(match.fecha_partido)}</td>
                        <td className="px-5 py-4">
                          <span className={`rounded-md px-2 py-1 text-xs font-semibold ${
                            match.estado === 'FINALIZADO'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                          >
                            {match.estado}
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          <div className="mx-auto grid max-w-[180px] grid-cols-[1fr_auto_1fr] items-center gap-2">
                            <input
                              type="number"
                              min={0}
                              value={form.goles_local}
                              onChange={(event) => updateScore(match.id, 'goles_local', event.target.value)}
                              className="h-10 rounded-md border border-zinc-300 px-2 text-center text-sm font-semibold outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
                              aria-label={`Goles de ${match.equipo_local}`}
                            />
                            <span className="text-xs font-semibold text-zinc-400">-</span>
                            <input
                              type="number"
                              min={0}
                              value={form.goles_visitante}
                              onChange={(event) => updateScore(match.id, 'goles_visitante', event.target.value)}
                              className="h-10 rounded-md border border-zinc-300 px-2 text-center text-sm font-semibold outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
                              aria-label={`Goles de ${match.equipo_visitante}`}
                            />
                          </div>
                        </td>
                        <td className="px-5 py-4 text-right">
                          <button
                            type="button"
                            onClick={() => void finalizeMatch(match)}
                            disabled={isSaving}
                            className="h-10 rounded-md bg-zinc-950 px-4 text-sm font-semibold text-white transition hover:bg-zinc-800 disabled:opacity-60"
                          >
                            {isSaving ? 'Procesando...' : 'Simular puntaje'}
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
        )}
      </main>
    </div>
  )
}
