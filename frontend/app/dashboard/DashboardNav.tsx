'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import LogoutButton from './LogoutButton'
import { isAdminUser } from '../../lib/adminAuth'
import { supabase } from '../../lib/supabaseClient'

const navItems = [
  { label: 'Inicio', href: '/dashboard#inicio', section: '#inicio' },
  { label: 'Salas', href: '/dashboard#salas', section: '#salas' },
  { label: 'Predicciones', href: '/dashboard#predicciones', section: '#predicciones' },
  { label: 'Clasificación', href: '/dashboard#clasificacion', section: '#clasificacion' },
  { label: 'Análisis IA', href: '/dashboard#analisis', section: '#analisis' },
  { label: 'Admin', href: '/admin', section: null },
]

export default function DashboardNav() {
  const pathname = usePathname()
  const [activeHash, setActiveHash] = useState('#inicio')
  const [canSeeAdmin, setCanSeeAdmin] = useState(false)

  useEffect(() => {
    function syncHash() {
      setActiveHash(window.location.hash || '#inicio')
    }

    syncHash()
    window.addEventListener('hashchange', syncHash)

    return () => window.removeEventListener('hashchange', syncHash)
  }, [])

  useEffect(() => {
    let isActive = true

    async function loadAdminState() {
      const { data } = await supabase.auth.getUser()
      if (isActive) setCanSeeAdmin(isAdminUser(data.user))
    }

    loadAdminState()

    return () => {
      isActive = false
    }
  }, [])

  return (
    <header className="sticky top-0 z-40 border-b border-[#123a5e] bg-[#082845] shadow-lg shadow-slate-950/10">
      <div className="mx-auto flex h-14 w-full max-w-7xl items-center gap-4 px-3 sm:px-4 lg:px-6">
        <nav className="min-w-0 flex-1 overflow-x-auto" aria-label="Dashboard">
          <div className="flex min-w-max items-center gap-2">
            {navItems.filter((item) => item.label !== 'Admin' || canSeeAdmin).map((item) => {
              const isActive = item.section
                ? pathname === '/dashboard' && activeHash === item.section
                : pathname === item.href

              return (
                <a
                  key={item.href}
                  href={item.href}
                  onClick={() => {
                    if (item.section) setActiveHash(item.section)
                  }}
                  className={`relative flex h-11 items-center rounded-lg px-3 text-sm font-semibold transition ${
                    isActive
                      ? 'bg-white text-[#082845] shadow-sm'
                      : 'text-slate-200 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  {item.label}
                  {isActive && (
                    <span className="absolute inset-x-3 bottom-1 h-0.5 rounded-full bg-blue-600" />
                  )}
                </a>
              )
            })}
          </div>
        </nav>

        <div className="flex shrink-0 items-center gap-3">
          <div
            className="flex h-8 w-8 items-center justify-center rounded-full bg-white/15 text-sm font-bold text-white"
            aria-label="Perfil"
            title="Perfil"
          >
            P
          </div>
          <LogoutButton />
        </div>
      </div>
    </header>
  )
}
