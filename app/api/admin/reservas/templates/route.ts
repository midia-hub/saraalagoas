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

export async function GET(request: NextRequest) {
  const access = await requireAccess(request, { pageKey: 'reservas', action: 'view' })
  if (!access.ok) return access.response

  try {
    const supabase = createSupabaseAdminClient(request)
    const { data, error } = await supabase
      .from('room_message_templates')
      .select('id, name, message_id, variables, active')
      .order('name')

    if (error) return NextResponse.json({ error: 'Erro ao listar templates' }, { status: 500 })
    return NextResponse.json({ templates: data ?? [] })
  } catch (err) {
    console.error('GET admin reservas/templates:', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const access = await requireAccess(request, { pageKey: 'reservas', action: 'create' })
  if (!access.ok) return access.response

  try {
    const body = (await request.json().catch(() => ({}))) as TemplateBody
    const name = (body.name ?? '').trim()
    const messageId = (body.message_id ?? '').trim()

    if (!name || !messageId) {
      return NextResponse.json({ error: 'Nome e message_id sao obrigatorios' }, { status: 400 })
    }

    const payload = {
      name,
      message_id: messageId,
      variables: sanitizeVariables(body.variables),
      active: body.active !== false,
    }

    const supabase = createSupabaseAdminClient(request)
    const { data, error } = await supabase
      .from('room_message_templates')
      .insert(payload)
      .select('id, name, message_id, variables, active')
      .single()

    if (error) return NextResponse.json({ error: 'Erro ao criar template' }, { status: 500 })
    return NextResponse.json({ template: data }, { status: 201 })
  } catch (err) {
    console.error('POST admin reservas/templates:', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
