import { NextRequest, NextResponse } from 'next/server'
import { requireAccess } from '@/lib/admin-api'
import { createSupabaseAdminClient } from '@/lib/supabase-server'

/**
 * GET    /api/admin/consolidacao/worship-services/[id]
 * PATCH  /api/admin/consolidacao/worship-services/[id]
 * DELETE /api/admin/consolidacao/worship-services/[id]
 */

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const access = await requireAccess(request, { pageKey: 'consolidacao', action: 'view' })
  if (!access.ok) return access.response

  try {
    const supabase = createSupabaseAdminClient(request)
    const { data, error } = await supabase.from('worship_services').select('*').eq('id', params.id).single()
    if (error || !data) return NextResponse.json({ error: 'Culto não encontrado' }, { status: 404 })
    return NextResponse.json({ item: data })
  } catch (err) {
    console.error('GET worship-services [id]:', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const access = await requireAccess(request, { pageKey: 'consolidacao', action: 'edit' })
  if (!access.ok) return access.response

  try {
    const body = await request.json().catch(() => ({}))
    const supabase = createSupabaseAdminClient(request)

    const allowed = ['name', 'day_of_week', 'time_of_day', 'active', 'church_id']
    const patch: Record<string, unknown> = {}
    for (const key of allowed) {
      if (key in body) patch[key] = body[key]
    }
    if (patch.name) patch.name = String(patch.name).trim()
    if (patch.day_of_week != null) patch.day_of_week = Number(patch.day_of_week)

    const { data, error } = await supabase
      .from('worship_services')
      .update(patch)
      .eq('id', params.id)
      .select()
      .single()

    if (error) {
      console.error('PATCH worship-services error:', {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
        patch
      })
      return NextResponse.json({ 
        error: 'Erro ao atualizar culto',
        details: error.message,
        hint: error.hint
      }, { status: 500 })
    }
    return NextResponse.json({ item: data })
  } catch (err) {
    console.error('PATCH worship-services [id]:', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const access = await requireAccess(request, { pageKey: 'consolidacao', action: 'delete' })
  if (!access.ok) return access.response

  try {
    const supabase = createSupabaseAdminClient(request)
    const { error } = await supabase.from('worship_services').delete().eq('id', params.id)
    if (error) {
      console.error('DELETE worship-services:', error)
      return NextResponse.json({ error: 'Erro ao remover culto' }, { status: 500 })
    }
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('DELETE worship-services [id]:', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
