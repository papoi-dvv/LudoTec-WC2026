'use client'

import { useState } from 'react'
import CreateRoomModal from './CreateRoomModal'
import Leaderboard from './Leaderboard'

type Room = {
  id: string
  nombre: string
  codigo_invitacion: string
  inviteUrl: string
}

const STORAGE_KEY = 'ludotec.activeRoom'

export default function RoomsPanel() {
  const [activeRoom, setActiveRoom] = useState<Room | null>(() => {
    if (typeof window === 'undefined') return null

    const storedRoom = window.localStorage.getItem(STORAGE_KEY)
    if (storedRoom) {
      return JSON.parse(storedRoom) as Room
    }

    return null
  })

  function handleRoomCreated(room: Room) {
    setActiveRoom(room)
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(room))
  }

  return (
    <div className="space-y-6">
      <section className="rounded-lg border border-zinc-200 bg-white p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-zinc-950">Salas</h2>
            <p className="mt-1 text-sm text-zinc-500">
              Organiza grupos privados para comparar predicciones.
            </p>
          </div>
          <CreateRoomModal onRoomCreated={handleRoomCreated} />
        </div>

        {activeRoom && (
          <div className="mt-5 rounded-md bg-zinc-50 p-4">
            <div className="text-sm font-semibold text-zinc-950">{activeRoom.nombre}</div>
            <div className="mt-1 text-sm text-zinc-600">Codigo: {activeRoom.codigo_invitacion}</div>
            <a
              href={activeRoom.inviteUrl}
              className="mt-2 block break-all text-sm font-medium text-emerald-700 hover:text-emerald-800"
            >
              {activeRoom.inviteUrl}
            </a>
          </div>
        )}
      </section>

      <Leaderboard salaId={activeRoom?.id || null} />
    </div>
  )
}
