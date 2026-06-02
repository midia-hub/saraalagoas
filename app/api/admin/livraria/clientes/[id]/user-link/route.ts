import { NextRequest, NextResponse } from 'next/server'
import { requireAccess } from '@/lib/admin-api'
import { createSupabaseAdminClient } from '@/lib/supabase-server'

type Ctx = { params: Promise<{ id: string }> }

export async function GET(request: NextRequest, ctx: Ctx) {
  const access = await requireAccess(request, { pageKey: 'livraria_clientes', action: 'view' })
  if (!access.ok) return access.response
  const { id } = await ctx.params
  if (!id) return NextResponse.json({ error: 'ID inválido' }, { status: 400 })

  const supabase = createSupabaseAdminClient(request)

  const { data: customer } = await supabase
    .from('bookstore_customers')
    .select('id, name, email')
    .eq('id', id)
    .maybeSingle()

  if (!customer) return NextResponse.json({ error: 'Cliente não encontrado' }, { status: 404 })
  if (!customer.email?.trim()) return NextResponse.json({ linked: false, user: null, email: null })

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, email, full_name, role_id, access_profile_id')
    .ilike('email', customer.email.trim())
    .maybeSingle()

  return NextResponse.json({
    linked: !!profile,
    user: profile ?? null,
    email: customer.email,
  })
}

export async function POST(request: NextRequest, ctx: Ctx) {
  const access = await requireAccess(request, { pageKey: 'livraria_clientes', action: 'manage' })
  if (!access.ok) return access.response
  const { id } = await ctx.params
  if (!id) return NextResponse.json({ error: 'ID inválido' }, { status: 400 })

  const supabase = createSupabaseAdminClient(request)

  const body = await request.json().catch(() => ({}))
  const email = ((body.email as string) ?? '').trim()
  const profile = ((body.profile as string) ?? '').trim()

  if (!email) return NextResponse.json({ error: 'E-mail obrigatório' }, { status: 400 })

  const { data: existing } = await supabase
    .from('profiles')
    .select('id, email')
    .ilike('email', email)
    .maybeSingle()

  if (existing) {
    return NextResponse.json({
      ok: true,
      linkedExisting: true,
      message: `Usuário com e-mail ${email} já possui acesso ao sistema.`,
    })
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const { error: inviteError } = await supabase.auth.admin.inviteUserByEmail(email, {
    redirectTo: `${appUrl.replace(/\/$/, '')}/admin`,
    data: { profile },
  })

  if (inviteError) {
    console.error('POST livraria/clientes/[id]/user-link invite error:', inviteError)
    if (inviteError.message.includes('already') || inviteError.message.includes('User already registered')) {
      return NextResponse.json({ error: 'Este e-mail já está registrado.' }, { status: 400 })
    }
    return NextResponse.json({ error: 'Erro ao enviar convite.' }, { status: 500 })
  }

  return NextResponse.json({
    ok: true,
    message: `Convite enviado para ${email}.`,
  })
}
