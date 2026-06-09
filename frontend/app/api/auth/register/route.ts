import { NextResponse } from 'next/server'
import { supabaseAdmin } from '../../../../lib/supabaseServer'

const DOMAIN = '@tecsup.edu.pe'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const email = String(body.email || '')
    const password = String(body.password || '')

    if (!email.toLowerCase().endsWith(DOMAIN)) {
      return NextResponse.json({ error: 'El correo debe pertenecer al dominio @tecsup.edu.pe' }, { status: 400 })
    }

    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: false,
    } as any)

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })

    return NextResponse.json({ user: data.user }, { status: 201 })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? 'Error interno' }, { status: 500 })
  }
}
