"use client"

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabaseClient'
import { fetchApi } from '../../lib/api'
import { isAllowedEmailDomain, normalizeEmail } from '../../lib/authDomain'
import { getErrorMessage } from '../../lib/errors'

export default function AuthPage() {
  const router = useRouter()
  const [isRegister, setIsRegister] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault()
    setMessage(null)
    const normalizedEmail = normalizeEmail(email)

    if (!isAllowedEmailDomain(normalizedEmail)) {
      setMessage('Solo se permiten correos con dominio @tecsup.edu.pe')
      return
    }

    setLoading(true)
    try {
      if (isRegister) {
        await fetchApi('/api/auth/register', {
          method: 'POST',
          body: JSON.stringify({ email: normalizedEmail, password }),
        })
        setMessage('Registro exitoso. Ya puedes iniciar sesion.')
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({ email: normalizedEmail, password })
        if (error) setMessage(error.message)
        else {
          const token = data?.session?.access_token
          if (token) {
            await fetchApi('/api/auth/set-session', {
              method: 'POST',
              body: JSON.stringify({ access_token: token }),
            })
            router.push('/dashboard')
          } else {
            setMessage('Ingreso exitoso.')
          }
        }
      }
    } catch (err: unknown) {
      setMessage(getErrorMessage(err, 'Ocurrio un error inesperado'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-[#f6f8f4] text-zinc-950">
      <div className="grid min-h-screen lg:grid-cols-[1.05fr_0.95fr]">
        <section className="relative hidden overflow-hidden bg-[#10231f] px-12 py-10 text-white lg:flex lg:flex-col lg:justify-between">
          <div className="absolute inset-0 opacity-20">
            <div className="absolute left-[-10%] top-[-10%] h-80 w-80 rounded-full bg-emerald-300 blur-3xl" />
            <div className="absolute bottom-[-15%] right-[-10%] h-96 w-96 rounded-full bg-lime-200 blur-3xl" />
          </div>

          <div className="relative">
            <div className="inline-flex items-center rounded-md border border-white/15 bg-white/10 px-3 py-1 text-sm font-medium">
              LudoTec WC 2026
            </div>
            <h1 className="mt-10 max-w-2xl text-5xl font-semibold leading-tight">
              Predicciones, salas privadas y ranking para vivir el Mundial con tu comunidad.
            </h1>
            <p className="mt-5 max-w-xl text-base leading-7 text-emerald-50/80">
              Acceso restringido para correos Tecsup, puntajes automatizados, leaderboard cacheado y analisis IA para partidos clave.
            </p>
          </div>

          <div className="relative grid grid-cols-3 gap-3">
            <div className="rounded-lg border border-white/10 bg-white/10 p-4">
              <div className="text-2xl font-semibold">5 pts</div>
              <div className="mt-1 text-xs text-emerald-50/70">Marcador exacto</div>
            </div>
            <div className="rounded-lg border border-white/10 bg-white/10 p-4">
              <div className="text-2xl font-semibold">+2</div>
              <div className="mt-1 text-xs text-emerald-50/70">Bonus por racha</div>
            </div>
            <div className="rounded-lg border border-white/10 bg-white/10 p-4">
              <div className="text-2xl font-semibold">Redis</div>
              <div className="mt-1 text-xs text-emerald-50/70">Ranking rapido</div>
            </div>
          </div>
        </section>

        <section className="flex items-center justify-center px-5 py-10 sm:px-8">
          <div className="w-full max-w-md">
            <div className="mb-8 lg:hidden">
              <div className="text-sm font-semibold text-emerald-700">LudoTec WC 2026</div>
              <h1 className="mt-2 text-3xl font-semibold">Predicciones mundialistas Tecsup</h1>
            </div>

            <div className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm">
              <div className="mb-6">
                <div className="flex rounded-md bg-zinc-100 p-1">
                  <button
                    type="button"
                    onClick={() => setIsRegister(false)}
                    className={`h-10 flex-1 rounded-md text-sm font-semibold transition ${
                      !isRegister ? 'bg-white text-zinc-950 shadow-sm' : 'text-zinc-500 hover:text-zinc-900'
                    }`}
                  >
                    Ingresar
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsRegister(true)}
                    className={`h-10 flex-1 rounded-md text-sm font-semibold transition ${
                      isRegister ? 'bg-white text-zinc-950 shadow-sm' : 'text-zinc-500 hover:text-zinc-900'
                    }`}
                  >
                    Crear cuenta
                  </button>
                </div>

                <h2 className="mt-6 text-2xl font-semibold">
                  {isRegister ? 'Registra tu cuenta' : 'Bienvenido de vuelta'}
                </h2>
                <p className="mt-2 text-sm text-zinc-500">
                  Usa tu correo institucional terminado exactamente en @tecsup.edu.pe.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-800">Correo</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="mt-2 h-11 w-full rounded-md border border-zinc-300 px-3 text-sm outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
                    placeholder="usuario@tecsup.edu.pe"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-zinc-800">Contrasena</label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="mt-2 h-11 w-full rounded-md border border-zinc-300 px-3 text-sm outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
                  />
                </div>

                {message && (
                  <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                    {message}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="h-11 w-full rounded-md bg-emerald-700 px-4 text-sm font-semibold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading ? 'Procesando...' : isRegister ? 'Crear cuenta' : 'Entrar al dashboard'}
                </button>
              </form>
            </div>
          </div>
        </section>
      </div>
    </main>
  )
}
