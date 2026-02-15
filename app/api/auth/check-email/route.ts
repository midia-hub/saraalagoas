import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServiceClient } from '@/lib/supabase-server'

/**
 * POST /api/auth/check-email
 * Verifica se já existe conta com o e-mail informado (uso no fluxo "Primeiro login").
 * Body: { email: string }
 * Resposta: { exists: boolean }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
    if (!email) {
      return NextResponse.json({ error: 'E-mail é obrigatório.' }, { status: 400 })
    }

    const supabase = createSupabaseServiceClient()
    const { data, error } = await supabase.auth.admin.listUsers({ page: 1, perPage: 500 })
    if (error) {
      console.error('check-email listUsers error:', error)
      return NextResponse.json({ error: 'Não foi possível verificar o e-mail.' }, { status: 500 })
    }

    const exists = (data?.users ?? []).some(
      (u) => (u.email ?? '').toLowerCase() === email
    )
    return NextResponse.json({ exists })
  } catch (e) {
    console.error('check-email error:', e)
    return NextResponse.json(
      { error: 'Não foi possível verificar o e-mail.' },
      { status: 500 }
    )
  }
}
