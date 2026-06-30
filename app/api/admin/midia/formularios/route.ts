import { NextRequest, NextResponse } from 'next/server'
import { requireAccess } from '@/lib/admin-api'
import { createSupabaseAdminClient } from '@/lib/supabase-server'
import { defaultConfig, defaultSchema, generateSlug } from '@/lib/formularios'

export async function GET(request: NextRequest) {
  const access = await requireAccess(request, { pageKey: 'instagram', action: 'view' })
  if (!access.ok) return access.response

  const db = createSupabaseAdminClient(request)

  const { data, error } = await db
    .from('formularios')
    .select('id, titulo, descricao, slug, ativo, config, created_at, updated_at')
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // conta respostas por formulário
  const ids = (data ?? []).map((f) => f.id as string)
  let counts: Record<string, number> = {}

  if (ids.length > 0) {
    const { data: countData } = await db
      .from('formulario_respostas')
      .select('formulario_id')
      .in('formulario_id', ids)

    if (countData) {
      for (const row of countData) {
        counts[row.formulario_id] = (counts[row.formulario_id] ?? 0) + 1
      }
    }
  }

  const items = (data ?? []).map((f) => ({
    ...f,
    total_respostas: counts[f.id as string] ?? 0,
  }))

  return NextResponse.json({ items })
}

export async function POST(request: NextRequest) {
  const access = await requireAccess(request, { pageKey: 'instagram', action: 'create' })
  if (!access.ok) return access.response

  const db = createSupabaseAdminClient(request)
  const body = (await request.json().catch(() => ({}))) as {
    titulo?: string
    descricao?: string
    slug?: string
  }

  const titulo = typeof body.titulo === 'string' ? body.titulo.trim() : ''
  if (!titulo) return NextResponse.json({ error: 'Título é obrigatório.' }, { status: 400 })

  let slug = typeof body.slug === 'string' && body.slug.trim() ? body.slug.trim() : generateSlug(titulo)

  // garante unicidade do slug
  const { data: existing } = await db.from('formularios').select('id').eq('slug', slug).maybeSingle()
  if (existing) {
    slug = `${slug}-${Date.now().toString(36)}`
  }

  const { data, error } = await db
    .from('formularios')
    .insert({
      titulo,
      descricao: typeof body.descricao === 'string' ? body.descricao.trim() || null : null,
      slug,
      schema: defaultSchema(),
      config: defaultConfig(),
      created_by: access.snapshot.userId,
    })
    .select('*')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ formulario: data }, { status: 201 })
}
