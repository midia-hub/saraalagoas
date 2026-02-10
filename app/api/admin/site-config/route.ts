import { NextRequest, NextResponse } from 'next/server'
import { requireAccess } from '@/lib/admin-api'
import { supabaseServer } from '@/lib/supabase-server'

export async function GET(request: NextRequest) {
  const access = await requireAccess(request, { pageKey: 'configuracoes', action: 'view' })
  if (!access.ok) return access.response

  const { data, error } = await supabaseServer
    .from('site_config')
    .select('value')
    .eq('key', 'main')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ value: data?.value || {} })
}

export async function PUT(request: NextRequest) {
  const access = await requireAccess(request, { pageKey: 'configuracoes', action: 'edit' })
  if (!access.ok) return access.response

  const body = await request.json().catch(() => ({}))
  const value = body?.value
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return NextResponse.json({ error: 'Payload inválido.' }, { status: 400 })
  }

  const { error } = await supabaseServer
    .from('site_config')
    .upsert(
      { key: 'main', value, updated_at: new Date().toISOString() },
      { onConflict: 'key' }
    )

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
