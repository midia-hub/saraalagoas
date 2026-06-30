import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdminClient } from '@/lib/supabase-server'
import type { Formulario } from '@/lib/formularios'

type Params = { params: Promise<{ slug: string }> }

function getClientIp(request: NextRequest): string | null {
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0].trim()
  return request.headers.get('x-real-ip')
}

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
    .select('id, ativo, config, schema')
    .eq('slug', slug)
    .maybeSingle()

  if (formError) return NextResponse.json({ error: formError.message }, { status: 500 })
  if (!formData) return NextResponse.json({ error: 'Formulário não encontrado.' }, { status: 404 })
  if (!formData.ativo) return NextResponse.json({ error: 'Formulário fechado.' }, { status: 410 })

  const config = formData.config as Formulario['config']
  const schema = formData.schema as Formulario['schema']

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
  const ip = getClientIp(request)

  // Check per-IP limit
  if (config.unico_por_ip && ip) {
    const { data: ipDup } = await db
      .from('formulario_respostas')
      .select('id')
      .eq('formulario_id', formData.id)
      .eq('ip', ip)
      .limit(1)
    if (ipDup && ipDup.length > 0) {
      return NextResponse.json(
        { error: 'duplicate_ip', message: 'Sua resposta já foi registrada anteriormente.' },
        { status: 409 }
      )
    }
  }

  // Check per-email limit
  if (config.unico_por_email) {
    const emailCampo = schema.campos.find((c) => c.tipo === 'email')
    if (emailCampo) {
      const emailValue = dados[emailCampo.id]
      if (emailValue && typeof emailValue === 'string' && emailValue.trim()) {
        const { data: emailDup } = await db
          .from('formulario_respostas')
          .select('id')
          .eq('formulario_id', formData.id)
          .filter(`dados->>${emailCampo.id}`, 'eq', emailValue.trim())
          .limit(1)
        if (emailDup && emailDup.length > 0) {
          return NextResponse.json(
            { error: 'duplicate_email', message: 'Este e-mail já foi utilizado para responder este formulário.' },
            { status: 409 }
          )
        }
      }
    }
  }

  const { data: resposta, error: insertError } = await db
    .from('formulario_respostas')
    .insert({ formulario_id: formData.id, dados, ip: ip ?? null })
    .select('id')
    .single()

  if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 })

  return NextResponse.json(
    { ok: true, id: resposta.id, mensagem: config.mensagem_sucesso },
    { status: 201 }
  )
}
