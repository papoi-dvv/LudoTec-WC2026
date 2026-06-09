import { NextResponse } from 'next/server'
import { supabaseAdmin } from '../../../../lib/supabaseServer'

export async function POST(req: Request) {
  try {
    const { access_token } = await req.json()
    if (!access_token) return NextResponse.json({ error: 'token missing' }, { status: 400 })

    const { data, error } = await supabaseAdmin.auth.getUser(access_token)
    if (error || !data?.user) return NextResponse.json({ error: 'invalid token' }, { status: 401 })

    const maxAge = 60 * 60 * 24 * 7 // 7 days
    const cookie = `sb-access-token=${access_token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`

    return NextResponse.json({ ok: true }, { status: 200, headers: { 'Set-Cookie': cookie } })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? 'internal error' }, { status: 500 })
  }
}
