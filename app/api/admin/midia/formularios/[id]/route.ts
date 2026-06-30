import { NextRequest, NextResponse } from 'next/server'
import { requireAccess } from '@/lib/admin-api'
import { createSupabaseAdminClient } from '@/lib/supabase-server'
import type { SchemaFormulario, ConfigFormulario } from '@/lib/formularios'

type Params = { params: Promise<{ id: string }> }

export async function GET(request: NextRequest, { params }: Params) {
  const access = await requireAccess(request, { pageKey: 'instagram', action: 'view' })
  if (!access.ok) return access.response

  const { id } = await params
  const db = createSupabaseAdminClient(request)

  const { data, error } = await db
    .from('formularios')
    .select('*')
    .eq('id', id)
    .maybeSingle()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!data) return NextResponse.json({ error: 'Formulário não encontrado.' }, { status: 404 })

  return NextResponse.json({ formulario: data })
}

export async function PUT(request: NextRequest, { params }: Params) {
  const access = await requireAccess(request, { pageKey: 'instagram', action: 'edit' })
  if (!access.ok) return access.response

  const { id } = await params
  const db = createSupabaseAdminClient(request)
  const body = (await request.json().catch(() => ({}))) as {
    titulo?: string
    descricao?: string
    slug?: string
    schema?: SchemaFormulario
    config?: ConfigFormulario
    ativo?: boolean
  }

  const updates: Record<string, unknown> = {}

  if (typeof body.titulo === 'string') updates.titulo = body.titulo.trim()
  if ('descricao' in body) updates.descricao = typeof body.descricao === 'string' ? body.descricao.trim() || null : null
  if (typeof body.slug === 'string' && body.slug.trim()) updates.slug = body.slug.trim()
  if (body.schema) updates.schema = body.schema
  if (body.config) updates.config = body.config
  if (typeof body.ativo === 'boolean') updates.ativo = body.ativo

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'Nenhum campo para atualizar.' }, { status: 400 })
  }

  const { data, error } = await db
    .from('formularios')
    .update(updates)
    .eq('id', id)
    .select('*')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ formulario: data })
}

export async function DELETE(request: NextRequest, { params }: Params) {
  const access = await requireAccess(request, { pageKey: 'instagram', action: 'delete' })
  if (!access.ok) return access.response

  const { id } = await params
  const db = createSupabaseAdminClient(request)

  const { error } = await db.from('formularios').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
