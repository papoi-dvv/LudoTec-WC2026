"use client"

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabaseClient'

const DOMAIN = '@tecsup.edu.pe'

export default function AuthPage() {
  const [isRegister, setIsRegister] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const validateDomain = (e: string) => {
    return e.trim().toLowerCase().endsWith(DOMAIN)
  }

  const handleSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault()
    setMessage(null)
    if (!validateDomain(email)) {
      setMessage('Solo se permiten correos con dominio @tecsup.edu.pe')
      return
    }
    setLoading(true)
    try {
      if (isRegister) {
        const res = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
        })
        const json = await res.json()
        if (!res.ok) setMessage(json.error || 'Error en el registro')
        else setMessage('Registro exitoso. Revisa tu correo para confirmar la cuenta.')
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) setMessage(error.message)
        else {
          const token = data?.session?.access_token
          if (token) {
            const setRes = await fetch('/api/auth/set-session', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ access_token: token }),
            })
            if (setRes.ok) {
              router.push('/dashboard')
            } else {
              setMessage('Ingreso exitoso, pero falló la creación de la sesión server-side')
            }
          } else {
            setMessage('Ingreso exitoso.')
          }
        }
      }
    } catch (err: any) {
      setMessage(err?.message ?? 'Ocurrió un error inesperado')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full bg-white shadow-md rounded-lg p-8">
        <h1 className="text-2xl font-semibold mb-4">LudoTec WC 2026</h1>
        <p className="text-sm text-gray-600 mb-6">{isRegister ? 'Registrar nueva cuenta' : 'Iniciar sesión'}</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Correo</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="usuario@tecsup.edu.pe"
            />
            <p className="text-xs text-gray-500 mt-1">Solo se permiten cuentas @tecsup.edu.pe</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Contraseña</label>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {message && <div className="text-sm text-center text-red-600">{message}</div>}

          <div className="flex items-center justify-between">
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50"
            >
              {loading ? 'Procesando...' : isRegister ? 'Registrar' : 'Ingresar'}
            </button>

            <button
              type="button"
              onClick={() => setIsRegister(!isRegister)}
              className="text-sm text-indigo-600 hover:underline"
            >
              {isRegister ? '¿Ya tienes cuenta? Ingresar' : '¿No tienes cuenta? Registrar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
