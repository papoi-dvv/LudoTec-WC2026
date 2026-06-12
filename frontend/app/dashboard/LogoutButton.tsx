'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { fetchApi } from '../../lib/api'
import { supabase } from '../../lib/supabaseClient'

function clearStoredRooms() {
  const keysToRemove: string[] = []

  for (let index = 0; index < window.localStorage.length; index += 1) {
    const key = window.localStorage.key(index)
    if (key?.startsWith('ludotec.activeRoom')) {
      keysToRemove.push(key)
    }
  }

  for (const key of keysToRemove) {
    window.localStorage.removeItem(key)
  }
}

export default function LogoutButton() {
  const router = useRouter()
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  async function handleLogout() {
    setIsLoggingOut(true)

    try {
      await supabase.auth.signOut()
      await fetchApi('/api/auth/logout', { method: 'POST' })
      clearStoredRooms()
      router.replace('/login')
      router.refresh()
    } finally {
      setIsLoggingOut(false)
    }
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      disabled={isLoggingOut}
      className="h-10 rounded-lg border border-white/15 bg-[#0e2a47] px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-[#173a5d] disabled:opacity-60"
    >
      {isLoggingOut ? 'Cerrando...' : 'Cerrar sesión'}
    </button>
  )
}
