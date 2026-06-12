'use client'

import { useEffect, useState } from 'react'
import CreateRoomModal from './CreateRoomModal'
import Leaderboard from './Leaderboard'
import RoomPredictions from './RoomPredictions'
import { fetchApi } from '../../lib/api'
import { getErrorMessage } from '../../lib/errors'
import { supabase } from '../../lib/supabaseClient'

type Room = {
  id: string
  nombre: string
  codigo_invitacion: string
  inviteUrl: string
}

const LEGACY_STORAGE_KEY = 'ludotec.activeRoom'

function getStorageKey(userId: string) {
  return `ludotec.activeRoom.${userId}`
}

export default function RoomsPanel() {
  const [userId, setUserId] = useState<string | null>(null)
  const [inviteCode, setInviteCode] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const [isJoining, setIsJoining] = useState(false)
  const [leaderboardRefreshToken, setLeaderboardRefreshToken] = useState(0)
  const [activeRoom, setActiveRoom] = useState<Room | null>(null)

  useEffect(() => {
    let isActive = true

    async function loadUser() {
      const { data } = await supabase.auth.getUser()
      if (isActive) setUserId(data.user?.id || null)
    }

    loadUser()

    return () => {
      isActive = false
    }
  }, [])

  useEffect(() => {
    if (!userId) return

    const timeoutId = window.setTimeout(() => {
      const storedRoom = window.localStorage.getItem(getStorageKey(userId))
      if (!storedRoom) return

      try {
        setActiveRoom(JSON.parse(storedRoom) as Room)
      } catch {
        window.localStorage.removeItem(getStorageKey(userId))
      }
    }, 0)

    return () => window.clearTimeout(timeoutId)
  }, [userId])

  function handleRoomCreated(room: Room) {
    setActiveRoom(room)
    if (userId) {
      window.localStorage.setItem(getStorageKey(userId), JSON.stringify(room))
      window.localStorage.removeItem(LEGACY_STORAGE_KEY)
    }
  }

  async function handleJoinRoom(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setMessage(null)
    setIsJoining(true)

    try {
      if (!userId) {
        throw new Error('Debes iniciar sesion para unirte a una sala')
      }

      const response = await fetchApi<{ sala: Room }>('/api/salas/join', {
        method: 'POST',
        body: JSON.stringify({
          codigo_invitacion: inviteCode,
          usuario_id: userId,
        }),
      })

      handleRoomCreated(response.sala)
      setInviteCode('')
      setMessage(`Te uniste a ${response.sala.nombre}.`)
    } catch (error: unknown) {
      setMessage(getErrorMessage(error, 'No se pudo unir a la sala'))
    } finally {
      setIsJoining(false)
    }
  }

  return (
    <div className="space-y-6">
      <section id="salas" className="scroll-mt-20 overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-sm">
        <div className="bg-gradient-to-r from-emerald-700 via-emerald-600 to-cyan-700 px-5 py-5 text-white">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-emerald-100">Salas privadas</p>
              <h2 className="mt-1 text-2xl font-bold">Compite con tu grupo</h2>
              <p className="mt-2 max-w-xl text-sm text-emerald-50">
                Crea una sala, comparte el codigo y registra predicciones visibles solo para sus miembros.
              </p>
            </div>
            <CreateRoomModal onRoomCreated={handleRoomCreated} />
          </div>
        </div>

        <div className="grid gap-5 p-5 lg:grid-cols-[1fr_1fr]">
          <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold text-zinc-950">Sala activa</h3>
                <p className="text-xs text-zinc-500">Tus picks se guardan dentro de esta sala.</p>
              </div>
              {activeRoom && (
                <span className="rounded-md bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-800">
                  Activa
                </span>
              )}
            </div>

            {activeRoom ? (
              <div className="mt-4 rounded-md bg-white p-4 shadow-sm ring-1 ring-zinc-200">
                <div className="text-base font-semibold text-zinc-950">{activeRoom.nombre}</div>
                <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
                  <span className="rounded-md bg-zinc-100 px-2 py-1 font-mono font-semibold text-zinc-800">
                    {activeRoom.codigo_invitacion}
                  </span>
                  <a
                    href={activeRoom.inviteUrl}
                    className="min-w-0 break-all font-medium text-emerald-700 hover:text-emerald-800"
                  >
                    {activeRoom.inviteUrl}
                  </a>
                </div>
              </div>
            ) : (
              <div className="mt-4 rounded-md border border-dashed border-zinc-300 bg-white px-4 py-6 text-sm text-zinc-500">
                Todavia no tienes una sala activa.
              </div>
            )}
          </div>

          <form onSubmit={handleJoinRoom} className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
            <h3 className="text-sm font-semibold text-zinc-950">Unirse a la sala</h3>
            <p className="mt-1 text-xs text-zinc-500">
              Ingresa el codigo de invitacion para activar esa sala en tu dashboard.
            </p>
            <div className="mt-4 flex flex-col gap-3 sm:flex-row">
              <input
                type="text"
                value={inviteCode}
                onChange={(event) => setInviteCode(event.target.value.toUpperCase())}
                minLength={4}
                required
                placeholder="ABC123"
                className="h-11 flex-1 rounded-md border border-zinc-300 px-3 font-mono text-sm uppercase outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
              />
              <button
                type="submit"
                disabled={isJoining}
                className="h-11 rounded-md bg-zinc-950 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-zinc-800 disabled:opacity-60"
              >
                {isJoining ? 'Uniendo...' : 'Unirse a la sala'}
              </button>
            </div>
            {message && (
              <p className="mt-3 rounded-md bg-zinc-100 px-3 py-2 text-sm text-zinc-700">
                {message}
              </p>
            )}
          </form>
        </div>
      </section>

      <RoomPredictions
        room={activeRoom}
        userId={userId}
        onPredictionSaved={() => setLeaderboardRefreshToken((current) => current + 1)}
      />

      <Leaderboard salaId={activeRoom?.id || null} refreshToken={leaderboardRefreshToken} />
    </div>
  )
}
