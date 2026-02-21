import { NextRequest, NextResponse } from 'next/server'
import { requireAccess } from '@/lib/admin-api'
import { supabaseServer } from '@/lib/supabase-server'

const ALLOWED_HOME_ROUTES = ['/', '/upload', '/galeria', '/cultos', '/eventos']

export async function GET(request: NextRequest) {
  const access = await requireAccess(request, { pageKey: 'configuracoes', action: 'view' })
  if (!access.ok) return access.response

  const { data, error } = await supabaseServer
    .from('settings')
    .select('id, home_route')
    .eq('id', 1)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function PUT(request: NextRequest) {
  const access = await requireAccess(request, { pageKey: 'configuracoes', action: 'edit' })
  if (!access.ok) return access.response

  const body = await request.json().catch(() => ({}))
  const homeRoute = typeof body.home_route === 'string' ? body.home_route : '/'
  if (!ALLOWED_HOME_ROUTES.includes(homeRoute)) {
    return NextResponse.json({ error: 'home_route inválida.' }, { status: 400 })
  }

  const { data, error } = await supabaseServer
    .from('settings')
    .upsert({ id: 1, home_route: homeRoute }, { onConflict: 'id' })
    .select('id, home_route')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

