'use client'

import { useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { fetchApi } from '../../lib/api'
import { getErrorMessage } from '../../lib/errors'

type Room = {
  id: string
  nombre: string
  codigo_invitacion: string
  inviteUrl: string
}

type CreateRoomResponse = {
  sala: Room
}

type CreateRoomModalProps = {
  onRoomCreated: (room: Room) => void
}

export default function CreateRoomModal({ onRoomCreated }: CreateRoomModalProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [roomName, setRoomName] = useState('')
  const [createdRoom, setCreatedRoom] = useState<Room | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleCreateRoom(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setMessage(null)
    setIsSubmitting(true)

    try {
      const { data: userData, error: userError } = await supabase.auth.getUser()
      if (userError || !userData.user) {
        throw new Error('Debes iniciar sesión para crear una sala')
      }

      const response = await fetchApi<CreateRoomResponse>('/api/salas', {
        method: 'POST',
        body: JSON.stringify({
          nombre: roomName,
          creador_id: userData.user.id,
        }),
      })

      setCreatedRoom(response.sala)
      onRoomCreated(response.sala)
      setRoomName('')
      setMessage('Sala creada. Comparte el enlace de invitación.')
    } catch (error: unknown) {
      setMessage(getErrorMessage(error, 'No se pudo crear la sala'))
    } finally {
      setIsSubmitting(false)
    }
  }

  async function copyInviteUrl() {
    if (!createdRoom) return

    await navigator.clipboard.writeText(createdRoom.inviteUrl)
    setMessage('Enlace copiado al portapapeles')
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="inline-flex h-10 items-center justify-center rounded-md bg-emerald-600 px-4 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-60"
      >
        Crear Sala
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-lg rounded-lg bg-white p-6 shadow-xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold text-zinc-950">Crear Sala</h2>
                <p className="mt-1 text-sm text-zinc-600">Crea un grupo privado y comparte el enlace de invitación.</p>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="rounded-md px-2 py-1 text-xl leading-none text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900"
                aria-label="Cerrar modal"
              >
                x
              </button>
            </div>

            <form onSubmit={handleCreateRoom} className="mt-6 space-y-4">
              <div>
                <label htmlFor="room-name" className="block text-sm font-medium text-zinc-800">
                  Nombre de la sala
                </label>
                <input
                  id="room-name"
                  type="text"
                  required
                  minLength={3}
                  maxLength={80}
                  value={roomName}
                  onChange={(event) => setRoomName(event.target.value)}
                  className="mt-2 h-11 w-full rounded-md border border-zinc-300 px-3 text-sm outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
                  placeholder="Promo Tecsup 2026"
                />
              </div>

              {createdRoom && (
                <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3">
                  <p className="text-sm font-medium text-emerald-950">{createdRoom.nombre}</p>
                  <div className="mt-2 flex gap-2">
                    <input
                      readOnly
                      value={createdRoom.inviteUrl}
                      className="h-10 min-w-0 flex-1 rounded-md border border-emerald-200 bg-white px-3 text-sm text-zinc-700"
                    />
                    <button
                      type="button"
                      onClick={copyInviteUrl}
                      className="h-10 rounded-md bg-zinc-950 px-3 text-sm font-medium text-white hover:bg-zinc-800"
                    >
                      Copiar
                    </button>
                  </div>
                </div>
              )}

              {message && (
                <p className="rounded-md bg-zinc-100 px-3 py-2 text-sm text-zinc-700">
                  {message}
                </p>
              )}

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="h-10 rounded-md border border-zinc-300 px-4 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
                >
                  Cerrar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="h-10 rounded-md bg-emerald-600 px-4 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
                >
                  {isSubmitting ? 'Creando...' : 'Crear'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
