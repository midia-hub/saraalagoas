import { NextRequest, NextResponse } from 'next/server'
import { requireAccess } from '@/lib/admin-api'
import { createSupabaseAdminClient } from '@/lib/supabase-server'

type TemplateBody = {
  name?: string
  message_id?: string
  variables?: string[]
  active?: boolean
}

function sanitizeVariables(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  const unique = new Set<string>()
  for (const item of value) {
    const normalized = String(item).trim().replace(/[{}]/g, '')
    if (normalized) unique.add(normalized)
  }
  return [...unique]
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const access = await requireAccess(request, { pageKey: 'reservas', action: 'edit' })
  if (!access.ok) return access.response

  const { id } = await params
  const body = (await request.json().catch(() => ({}))) as TemplateBody

  const payload: Record<string, unknown> = {}
  if (body.name !== undefined) payload.name = String(body.name).trim()
  if (body.message_id !== undefined) payload.message_id = String(body.message_id).trim()
  if (body.variables !== undefined) payload.variables = sanitizeVariables(body.variables)
  if (body.active !== undefined) payload.active = !!body.active

  if (Object.keys(payload).length === 0) {
    return NextResponse.json({ error: 'Nenhum campo para atualizar' }, { status: 400 })
  }

  const supabase = createSupabaseAdminClient(request)
  const { data, error } = await supabase
    .from('room_message_templates')
    .update(payload)
    .eq('id', id)
    .select('id, name, message_id, variables, active')
    .single()

  if (error) return NextResponse.json({ error: 'Erro ao atualizar template' }, { status: 500 })
  return NextResponse.json({ template: data })
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const access = await requireAccess(request, { pageKey: 'reservas', action: 'delete' })
  if (!access.ok) return access.response

  const { id } = await params
  const supabase = createSupabaseAdminClient(request)
  const { error } = await supabase.from('room_message_templates').delete().eq('id', id)

  if (error) return NextResponse.json({ error: 'Erro ao remover template' }, { status: 500 })
  return NextResponse.json({ success: true })
}
