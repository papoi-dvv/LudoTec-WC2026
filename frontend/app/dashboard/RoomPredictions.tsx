'use client'

import { useEffect, useMemo, useState } from 'react'
import { fetchApi } from '../../lib/api'
import { getErrorMessage } from '../../lib/errors'

type Room = {
  id: string
  nombre: string
}

type MatchPrediction = {
  id: string
  tipo_prediccion?: PredictionMode
  prediccion_metadata?: PredictionMetadata
  marcador_local: number
  marcador_visitante: number
  puntos_obtenidos: number
  procesado: boolean
}

type Match = {
  id: string
  equipo_local: string
  equipo_visitante: string
  fecha_partido: string
  estado: string
  goles_local: number | null
  goles_visitante: number | null
  mi_prediccion: MatchPrediction | null
}

type ComparisonMember = {
  usuario_id: string
  nombre: string
  email: string
  prediccion: MatchPrediction | null
}

type Comparison = {
  partido: Omit<Match, 'mi_prediccion'> | null
  miembros: ComparisonMember[]
  resumen: Array<{
    marcador_local: number
    marcador_visitante: number
    cantidad: number
  }>
}

type RoomPredictionsProps = {
  room: Room | null
  userId: string | null
  onPredictionSaved: () => void
}

type PredictionMode = 'exact' | 'winner' | 'difference'
type OutcomePick = 'local' | 'draw' | 'visitor'
type PredictionMetadata = {
  outcome_pick?: OutcomePick
  diferencia_goles?: number
}

const SCORING_RULES = [
  { label: 'Resultado exacto', value: '5 pts', detail: 'Aciertas el marcador final completo.' },
  { label: 'Ganador correcto', value: '3 pts', detail: 'Aciertas local, empate o visitante.' },
  { label: 'Diferencia correcta', value: '2 pts', detail: 'Aciertas el margen de victoria.' },
  { label: 'Racha', value: '+2 pts', detail: 'Cada 3 aciertos consecutivos.' },
  { label: 'Prediccion anticipada', value: '+1 pt', detail: 'Mas de 24 horas antes del partido.' },
]

const PREDICTION_MODES: Array<{
  id: PredictionMode
  label: string
  points: string
  description: string
}> = [
  {
    id: 'exact',
    label: 'Marcador exacto',
    points: '5 pts',
    description: 'Ingresa el resultado que crees que termina el partido.',
  },
  {
    id: 'winner',
    label: 'Ganador / empate',
    points: '3 pts',
    description: 'Elige una seleccion o empate.',
  },
  {
    id: 'difference',
    label: 'Diferencia de goles',
    points: '2 pts',
    description: 'Indica solo el margen de goles.',
  },
]

function formatMatchDate(value: string) {
  return new Intl.DateTimeFormat('es-PE', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

function getInitials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('') || 'P'
}

function getPredictionTypeLabel(prediction: MatchPrediction, match: Pick<Match, 'equipo_local' | 'equipo_visitante'> | null) {
  const type = prediction.tipo_prediccion || 'exact'
  const metadata = prediction.prediccion_metadata || {}

  if (type === 'winner') {
    const pick = metadata.outcome_pick
    const label = pick === 'local'
      ? match?.equipo_local || 'Local'
      : pick === 'visitor'
        ? match?.equipo_visitante || 'Visitante'
        : 'Empate'

    return {
      title: 'Ganador / empate',
      detail: label,
    }
  }

  if (type === 'difference') {
    const difference = metadata.diferencia_goles || Math.abs(prediction.marcador_local - prediction.marcador_visitante)

    return {
      title: 'Diferencia de goles',
      detail: `${difference} ${difference === 1 ? 'gol' : 'goles'}`,
    }
  }

  return {
    title: 'Marcador exacto',
    detail: `${prediction.marcador_local}-${prediction.marcador_visitante}`,
  }
}

export default function RoomPredictions({ room, userId, onPredictionSaved }: RoomPredictionsProps) {
  const [matches, setMatches] = useState<Match[]>([])
  const [selectedMatchId, setSelectedMatchId] = useState('')
  const [predictionMode, setPredictionMode] = useState<PredictionMode>('exact')
  const [outcomePick, setOutcomePick] = useState<OutcomePick>('local')
  const [goalDifference, setGoalDifference] = useState('1')
  const [localScore, setLocalScore] = useState('1')
  const [visitorScore, setVisitorScore] = useState('0')
  const [comparison, setComparison] = useState<Comparison | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  const selectedMatch = useMemo(
    () => matches.find((match) => match.id === selectedMatchId) || null,
    [matches, selectedMatchId],
  )

  function applyScoreFields(match: Match | undefined) {
    if (match?.mi_prediccion) {
      const type = match.mi_prediccion.tipo_prediccion || 'exact'
      const metadata = match.mi_prediccion.prediccion_metadata || {}

      setPredictionMode(type)
      setOutcomePick(metadata.outcome_pick || 'local')
      setGoalDifference(String(metadata.diferencia_goles || 1))
      setLocalScore(String(match.mi_prediccion.marcador_local))
      setVisitorScore(String(match.mi_prediccion.marcador_visitante))
      return
    }

    setLocalScore('1')
    setVisitorScore('0')
  }

  function applyWinnerPick(nextOutcome: OutcomePick) {
    setOutcomePick(nextOutcome)

    if (nextOutcome === 'local') {
      setLocalScore('1')
      setVisitorScore('0')
    } else if (nextOutcome === 'visitor') {
      setLocalScore('0')
      setVisitorScore('1')
    } else {
      setLocalScore('0')
      setVisitorScore('0')
    }
  }

  function applyDifferencePick(nextDifference = goalDifference) {
    const safeDifference = Math.max(1, Number(nextDifference) || 1)
    setGoalDifference(String(safeDifference))
    setLocalScore(String(safeDifference))
    setVisitorScore('0')
  }

  function changePredictionMode(nextMode: PredictionMode) {
    setPredictionMode(nextMode)

    if (nextMode === 'winner') {
      applyWinnerPick(outcomePick)
    } else if (nextMode === 'difference') {
      applyDifferencePick()
    }
  }

  function getPredictionSummary() {
    if (!selectedMatch) return 'Elige un partido para preparar tu prediccion.'

    const score = `${selectedMatch.equipo_local} ${localScore || 0}-${visitorScore || 0} ${selectedMatch.equipo_visitante}`

    if (predictionMode === 'exact') {
      return `Vas por resultado exacto: ${score}.`
    }

    if (predictionMode === 'winner') {
      const winnerText = outcomePick === 'local'
        ? selectedMatch.equipo_local
        : outcomePick === 'visitor'
          ? selectedMatch.equipo_visitante
          : 'Empate'
      return `Vas por ganador/empate: ${winnerText}.`
    }

    return `Vas por diferencia de ${goalDifference} ${Number(goalDifference) === 1 ? 'gol' : 'goles'}.`
  }

  useEffect(() => {
    if (!room || !userId) {
      return
    }

    let isActive = true
    const roomId = room.id
    const currentUserId = userId

    async function loadMatches() {
      setIsLoading(true)
      setMessage(null)

      try {
        const response = await fetchApi<{ partidos: Match[] }>(
          `/api/salas/${roomId}/partidos?usuario_id=${encodeURIComponent(currentUserId)}`,
        )
        if (!isActive) return

        setMatches(response.partidos)
        const nextSelectedMatch = response.partidos[0]
        setSelectedMatchId(nextSelectedMatch?.id || '')
        applyScoreFields(nextSelectedMatch)
      } catch (error: unknown) {
        if (isActive) setMessage(getErrorMessage(error, 'No se pudieron cargar los partidos'))
      } finally {
        if (isActive) setIsLoading(false)
      }
    }

    loadMatches()

    return () => {
      isActive = false
    }
  }, [room, userId])

  async function loadComparison(matchId = selectedMatchId) {
    if (!room || !userId || !matchId) return

    try {
      const response = await fetchApi<Comparison>(
        `/api/salas/${room.id}/predicciones/comparar?usuario_id=${encodeURIComponent(userId)}&partido_id=${encodeURIComponent(matchId)}`,
      )
      setComparison(response)
    } catch (error: unknown) {
      setMessage(getErrorMessage(error, 'No se pudo cargar la comparacion'))
    }
  }

  async function handleSavePrediction(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!room || !userId || !selectedMatchId) return

    setIsSaving(true)
    setMessage(null)

    try {
      await fetchApi(`/api/salas/${room.id}/predicciones`, {
        method: 'POST',
        body: JSON.stringify({
          usuario_id: userId,
          partido_id: selectedMatchId,
          marcador_local: Number(localScore),
          marcador_visitante: Number(visitorScore),
          tipo_prediccion: predictionMode,
          prediccion_metadata: {
            outcome_pick: predictionMode === 'winner' ? outcomePick : undefined,
            diferencia_goles: predictionMode === 'difference' ? Number(goalDifference) : undefined,
          },
        }),
      })

      setMessage('Prediccion guardada dentro de esta sala.')
      onPredictionSaved()

      const response = await fetchApi<{ partidos: Match[] }>(
        `/api/salas/${room.id}/partidos?usuario_id=${encodeURIComponent(userId)}`,
      )
      setMatches(response.partidos)
      await loadComparison(selectedMatchId)
    } catch (error: unknown) {
      setMessage(getErrorMessage(error, 'No se pudo guardar la prediccion'))
    } finally {
      setIsSaving(false)
    }
  }

  if (!room) {
    return (
      <section id="predicciones" className="scroll-mt-20 rounded-lg border border-dashed border-zinc-300 bg-white/80 p-6 text-sm text-zinc-500">
        Selecciona, crea o unete a una sala para hacer predicciones.
      </section>
    )
  }

  return (
    <section id="predicciones" className="scroll-mt-20 overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-sm">
      <div className="border-b border-zinc-200 bg-zinc-50/70 px-5 py-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">{room.nombre}</p>
        <h2 className="mt-1 text-lg font-semibold text-zinc-950">Predicciones de la sala</h2>
      </div>

      <div className="grid gap-5 p-5 lg:grid-cols-[0.9fr_1.1fr]">
        <form onSubmit={handleSavePrediction} className="space-y-4 rounded-lg border border-zinc-200 bg-white p-4">
          <div>
            <label htmlFor="room-match" className="block text-sm font-medium text-zinc-800">
              Partido
            </label>
            <select
              id="room-match"
              value={selectedMatchId}
              onChange={(event) => {
                const nextMatchId = event.target.value
                setSelectedMatchId(nextMatchId)
                applyScoreFields(matches.find((match) => match.id === nextMatchId))
                void loadComparison(nextMatchId)
              }}
              className="mt-2 h-11 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
            >
              {matches.map((match) => (
                <option key={match.id} value={match.id}>
                  {match.equipo_local} vs {match.equipo_visitante}
                </option>
              ))}
            </select>
          </div>

          {selectedMatch && (
            <div className="rounded-md bg-zinc-50 p-3 text-sm text-zinc-600">
              <div className="font-medium text-zinc-900">{formatMatchDate(selectedMatch.fecha_partido)}</div>
              <div>Estado: {selectedMatch.estado}</div>
            </div>
          )}

          <div className="space-y-3">
            <div>
              <h3 className="text-sm font-semibold text-zinc-950">Tipo de prediccion</h3>
              <p className="mt-1 text-xs text-zinc-500">
                Elige como quieres jugarla; se guarda como marcador para usar el scoring oficial.
              </p>
            </div>
            <div className="grid gap-2">
              {PREDICTION_MODES.map((mode) => {
                const isActive = predictionMode === mode.id

                return (
                  <button
                    key={mode.id}
                    type="button"
                    onClick={() => changePredictionMode(mode.id)}
                    className={`rounded-lg border p-3 text-left transition ${
                      isActive
                        ? 'border-emerald-500 bg-emerald-50 shadow-sm'
                        : 'border-zinc-200 bg-white hover:border-zinc-300 hover:bg-zinc-50'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-sm font-semibold text-zinc-950">{mode.label}</span>
                      <span className={`rounded-md px-2 py-1 text-xs font-bold ${
                        isActive ? 'bg-emerald-600 text-white' : 'bg-zinc-100 text-zinc-700'
                      }`}
                      >
                        {mode.points}
                      </span>
                    </div>
                    <p className="mt-1 text-xs leading-5 text-zinc-500">{mode.description}</p>
                  </button>
                )
              })}
            </div>
          </div>

          {predictionMode === 'winner' && selectedMatch && (
            <div className="grid gap-2 sm:grid-cols-3">
              {[
                { id: 'local' as OutcomePick, label: selectedMatch.equipo_local },
                { id: 'draw' as OutcomePick, label: 'Empate' },
                { id: 'visitor' as OutcomePick, label: selectedMatch.equipo_visitante },
              ].map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => applyWinnerPick(option.id)}
                  className={`h-11 rounded-md border px-3 text-sm font-semibold transition ${
                    outcomePick === option.id
                      ? 'border-zinc-950 bg-zinc-950 text-white'
                      : 'border-zinc-300 bg-white text-zinc-800 hover:bg-zinc-50'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          )}

          {predictionMode === 'difference' && selectedMatch && (
            <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3">
              <label htmlFor="goal-difference" className="block text-sm font-semibold text-zinc-950">
                Conteo de diferencia de goles
              </label>
              <p className="mt-1 text-xs text-zinc-500">
                Solo indica por cuantos goles de diferencia crees que termina.
              </p>
              <div className="mt-3 flex max-w-[220px] items-center gap-2">
                <button
                  type="button"
                  onClick={() => applyDifferencePick(String(Math.max(1, Number(goalDifference || 1) - 1)))}
                  className="h-11 w-11 rounded-md border border-zinc-300 bg-white text-lg font-semibold text-zinc-800 hover:bg-zinc-50"
                  aria-label="Reducir diferencia"
                >
                  -
                </button>
                <input
                  id="goal-difference"
                  type="number"
                  min={1}
                  required
                  value={goalDifference}
                  onChange={(event) => applyDifferencePick(event.target.value)}
                  className="h-11 w-24 rounded-md border border-zinc-300 px-3 text-center text-lg font-semibold outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
                />
                <button
                  type="button"
                  onClick={() => applyDifferencePick(String(Number(goalDifference || 1) + 1))}
                  className="h-11 w-11 rounded-md border border-zinc-300 bg-white text-lg font-semibold text-zinc-800 hover:bg-zinc-50"
                  aria-label="Aumentar diferencia"
                >
                  +
                </button>
              </div>
            </div>
          )}

          {predictionMode === 'exact' && (
          <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3">
            <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-3">
              <div>
                <label htmlFor="local-score" className="block text-sm font-medium text-zinc-800">
                  Local
                </label>
                <input
                  id="local-score"
                  type="number"
                  min={0}
                  required
                  value={localScore}
                  onChange={(event) => setLocalScore(event.target.value)}
                  className="mt-2 h-12 w-full rounded-md border border-zinc-300 px-3 text-center text-lg font-semibold outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
                />
              </div>
              <div className="pb-3 text-sm font-semibold text-zinc-400">vs</div>
              <div>
                <label htmlFor="visitor-score" className="block text-sm font-medium text-zinc-800">
                  Visitante
                </label>
                <input
                  id="visitor-score"
                  type="number"
                  min={0}
                  required
                  value={visitorScore}
                  onChange={(event) => setVisitorScore(event.target.value)}
                  className="mt-2 h-12 w-full rounded-md border border-zinc-300 px-3 text-center text-lg font-semibold outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
                />
              </div>
            </div>
          </div>
          )}

          <div className="rounded-md bg-zinc-50 px-3 py-2 text-xs leading-5 text-zinc-600">
            {getPredictionSummary()}
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              type="submit"
              disabled={isSaving || isLoading || !selectedMatchId}
              className="h-11 flex-1 rounded-md bg-emerald-600 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:opacity-60"
            >
              {isSaving ? 'Guardando...' : 'Guardar prediccion'}
            </button>
            <button
              type="button"
              onClick={() => void loadComparison()}
              disabled={!selectedMatchId}
              className="h-11 rounded-md border border-zinc-300 px-4 text-sm font-semibold text-zinc-800 transition hover:bg-zinc-50 disabled:opacity-60"
            >
              Comparar
            </button>
          </div>

          {message && (
            <p className="rounded-md bg-zinc-100 px-3 py-2 text-sm text-zinc-700">
              {message}
            </p>
          )}
        </form>

        <div className="space-y-4">
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold text-emerald-950">Sistema de puntaje vigente</h3>
                <p className="mt-1 text-xs leading-5 text-emerald-800">
                  Se usa el motor ya implementado en backend y worker; las reglas externas del prompt no reemplazan este calculo.
                </p>
              </div>
              <span className="rounded-md bg-white px-2 py-1 text-xs font-semibold text-emerald-800 shadow-sm">
                Oficial
              </span>
            </div>
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              {SCORING_RULES.map((rule) => (
                <div key={rule.label} className="rounded-md bg-white px-3 py-2 text-sm shadow-sm">
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-medium text-zinc-800">{rule.label}</span>
                    <span className="font-semibold text-zinc-950">{rule.value}</span>
                  </div>
                  <p className="mt-1 text-xs leading-4 text-zinc-500">{rule.detail}</p>
                </div>
              ))}
            </div>
            <p className="mt-3 text-xs leading-5 text-emerald-800">
              En los ultimos 10 minutos antes del partido solo cuentan los puntos base.
            </p>
          </div>

          <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-sm">
            <div className="border-b border-zinc-200 bg-[#082845] px-4 py-4 text-white">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-sm font-semibold">Comparacion del partido</h3>
                  <p className="mt-1 text-xs text-slate-200">
                    {comparison?.partido ? `${comparison.partido.equipo_local} vs ${comparison.partido.equipo_visitante}` : 'Elige un partido para comparar'}
                  </p>
                </div>
                {comparison && (
                  <span className="rounded-md bg-white/15 px-2 py-1 text-xs font-semibold text-white">
                    {comparison.miembros.filter((member) => member.prediccion).length}/{comparison.miembros.length}
                  </span>
                )}
              </div>
            </div>

            {comparison?.resumen.length ? (
              <div className="border-b border-zinc-200 bg-zinc-50 px-4 py-3">
                <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                  Marcadores repetidos
                </div>
                <div className="flex flex-wrap gap-2">
                {comparison.resumen.map((item) => (
                  <span
                    key={`${item.marcador_local}-${item.marcador_visitante}`}
                    className="inline-flex items-center gap-2 rounded-md bg-emerald-50 px-3 py-1.5 text-sm font-semibold text-emerald-800 ring-1 ring-emerald-100"
                  >
                    <span>{item.marcador_local}-{item.marcador_visitante}</span>
                    <span className="rounded bg-white px-1.5 py-0.5 text-xs text-emerald-700">{item.cantidad}</span>
                  </span>
                ))}
                </div>
              </div>
            ) : null}

            <div className="max-h-[360px] overflow-y-auto">
              {(comparison?.miembros || []).map((member) => {
                const isCurrentUser = member.usuario_id === userId
                const predictionLabel = member.prediccion
                  ? getPredictionTypeLabel(member.prediccion, comparison?.partido || null)
                  : null

                return (
                <div key={member.usuario_id} className="flex items-center justify-between gap-3 border-b border-zinc-100 px-4 py-3 transition hover:bg-zinc-50 last:border-b-0">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                      member.prediccion ? 'bg-emerald-100 text-emerald-800' : 'bg-zinc-100 text-zinc-500'
                    }`}
                    >
                      {getInitials(member.nombre)}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <div className="truncate text-sm font-semibold text-zinc-950">{member.nombre}</div>
                        {isCurrentUser && (
                          <span className="rounded-md bg-blue-50 px-1.5 py-0.5 text-[11px] font-semibold text-blue-700">
                            Tu
                          </span>
                        )}
                      </div>
                      <div className="truncate text-xs text-zinc-500">{member.email}</div>
                    </div>
                  </div>
                  {member.prediccion ? (
                    <div className="shrink-0 text-right">
                      <div className="rounded-md bg-zinc-950 px-3 py-1.5 text-sm font-semibold text-white shadow-sm">
                        <div>{predictionLabel?.detail}</div>
                        <div className="mt-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-300">
                          {predictionLabel?.title}
                        </div>
                      </div>
                      {member.prediccion.procesado && (
                        <div className="mt-1 text-xs font-medium text-emerald-700">
                          {member.prediccion.puntos_obtenidos} pts
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="shrink-0 rounded-md bg-zinc-100 px-3 py-1 text-xs font-semibold text-zinc-500">
                      Sin pick
                    </div>
                  )}
                </div>
                )
              })}

              {!comparison && (
                <div className="px-4 py-10 text-center text-sm text-zinc-500">
                  Guarda o compara un partido para ver las predicciones de la sala.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
