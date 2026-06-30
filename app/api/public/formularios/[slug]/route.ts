import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdminClient } from '@/lib/supabase-server'
import type { Formulario } from '@/lib/formularios'

type Params = { params: Promise<{ slug: string }> }

export async function GET(request: NextRequest, { params }: Params) {
  const { slug } = await params
  const db = createSupabaseAdminClient()

  const { data, error } = await db
    .from('formularios')
    .select('id, titulo, descricao, slug, schema, config, ativo')
    .eq('slug', slug)
    .maybeSingle()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!data) return NextResponse.json({ error: 'Formulário não encontrado.' }, { status: 404 })

  const form = data as Pick<Formulario, 'id' | 'titulo' | 'descricao' | 'slug' | 'schema' | 'config' | 'ativo'>

  if (!form.ativo) {
    return NextResponse.json({ error: 'closed', message: 'Este formulário está fechado.' }, { status: 410 })
  }

  const config = form.config
  if (config.data_encerramento && new Date(config.data_encerramento) < new Date()) {
    return NextResponse.json({ error: 'expired', message: 'O prazo deste formulário encerrou.' }, { status: 410 })
  }

  if (config.limite_respostas != null) {
    const { count } = await db
      .from('formulario_respostas')
      .select('*', { count: 'exact', head: true })
      .eq('formulario_id', form.id)

    if ((count ?? 0) >= config.limite_respostas) {
      return NextResponse.json({ error: 'full', message: 'Este formulário atingiu o limite de respostas.' }, { status: 410 })
    }
  }

  return NextResponse.json({ formulario: form })
}

export async function POST(request: NextRequest, { params }: Params) {
  const { slug } = await params
  const db = createSupabaseAdminClient()

  const { data: formData, error: formError } = await db
    .from('formularios')
    .select('id, ativo, config')
    .eq('slug', slug)
    .maybeSingle()

  if (formError) return NextResponse.json({ error: formError.message }, { status: 500 })
  if (!formData) return NextResponse.json({ error: 'Formulário não encontrado.' }, { status: 404 })
  if (!formData.ativo) return NextResponse.json({ error: 'Formulário fechado.' }, { status: 410 })

  const config = formData.config as Formulario['config']

  if (config.data_encerramento && new Date(config.data_encerramento) < new Date()) {
    return NextResponse.json({ error: 'Prazo encerrado.' }, { status: 410 })
  }

  if (config.limite_respostas != null) {
    const { count } = await db
      .from('formulario_respostas')
      .select('*', { count: 'exact', head: true })
      .eq('formulario_id', formData.id)

    if ((count ?? 0) >= config.limite_respostas) {
      return NextResponse.json({ error: 'Limite de respostas atingido.' }, { status: 410 })
    }
  }

  const body = (await request.json().catch(() => ({}))) as { dados?: Record<string, unknown> }
  const dados = body.dados ?? {}

  const { data: resposta, error: insertError } = await db
    .from('formulario_respostas')
    .insert({ formulario_id: formData.id, dados })
    .select('id')
    .single()

  if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 })

  return NextResponse.json(
    { ok: true, id: resposta.id, mensagem: config.mensagem_sucesso },
    { status: 201 }
  )
}
