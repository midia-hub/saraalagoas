import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServiceClient } from '@/lib/supabase-server'
import { personUpsertFromConversionSchema } from '@/lib/validators/person'
import { normalizePhone, normalizeDate } from '@/lib/validators/person'
import { getTodayBrasilia } from '@/lib/date-utils'

/** Em desenvolvimento, retorna a mensagem real do Supabase para debug. */
function apiError(message: string, supabaseError?: { message?: string; details?: string } | null): string {
  if (process.env.NODE_ENV === 'development' && supabaseError?.message) {
    return `${message}: ${supabaseError.message}${supabaseError.details ? ` (${supabaseError.details})` : ''}`
  }
  return message
}

/**
 * POST /api/public/consolidacao/conversao
 * Cadastro de conversão sem autenticação (formulário público).
 * Mesmo body do endpoint admin; created_by/updated_by ficam null.
 */
export async function POST(request: NextRequest) {
  let supabase: ReturnType<typeof createSupabaseServiceClient>
  try {
    supabase = createSupabaseServiceClient()
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Supabase não configurado. Verifique SUPABASE_SERVICE_ROLE_KEY no .env.local.'
    console.error('createSupabaseServiceClient:', msg)
    return NextResponse.json({ error: msg }, { status: 503 })
  }
  try {
    const body = await request.json().catch(() => ({}))
    const personPayload = {
      full_name: body.nome ?? body.full_name ?? '',
      email: body.email ?? null,
      mobile_phone: body.telefone ?? body.mobile_phone ?? null,
      birth_date: body.dataNascimento ?? body.birth_date ?? null,
      cep: body.cep ?? null,
      city: body.cidade ?? body.city ?? null,
      state: body.estado ?? body.state ?? null,
      neighborhood: body.bairro ?? body.neighborhood ?? null,
      address_line: body.endereco ?? body.address_line ?? null,
      conversion_date: body.dataConversao ?? body.conversion_date ?? null,
    }
    const parsedPerson = personUpsertFromConversionSchema.safeParse(personPayload)
    if (!parsedPerson.success) {
      const msg = parsedPerson.error.flatten().fieldErrors
        ? Object.values(parsedPerson.error.flatten().fieldErrors).flat().join('; ')
        : 'Dados da pessoa inválidos'
      return NextResponse.json({ error: msg }, { status: 400 })
    }

    const dataConversao = body.dataConversao ?? body.data_conversao
    const culto = body.culto ?? null
    const quemIndicou = body.quemIndicou ?? body.quem_indicou ?? null
    const observacoes = body.observacoes ?? null
    const consolidatorPersonId = body.consolidator_person_id ?? null
    const consolidatorNameText = body.consolidator_name_text ?? null
    const cellId = body.cell_id ?? null
    const cellNameText = body.cell_name_text ?? null
    const conversionType = body.conversion_type ?? null
    const instagram = body.instagram ?? null
    const churchId = body.church_id ?? null
    const teamId = body.team_id ?? null
    const gender = body.gender ?? null

    if (!dataConversao) {
      return NextResponse.json({ error: 'Data da conversão é obrigatória' }, { status: 400 })
    }
    const cultoTrim = culto && String(culto).trim()
    if (!cultoTrim) {
      return NextResponse.json({ error: 'Culto/Evento é obrigatório' }, { status: 400 })
    }
    if (!churchId) {
      return NextResponse.json({ error: 'Igreja é obrigatória' }, { status: 400 })
    }
    if (!conversionType) {
      return NextResponse.json({ error: 'Aceitou ou Reconciliou é obrigatório' }, { status: 400 })
    }
    if (!gender || (gender !== 'M' && gender !== 'F')) {
      return NextResponse.json({ error: 'Gênero é obrigatório (Masculino ou Feminino)' }, { status: 400 })
    }

    const userId = null

    const p = parsedPerson.data
    const cpf = body.cpf ? String(body.cpf).replace(/\D/g, '') : null
    const email = (p.email && p.email.trim()) ? p.email.trim() : null
    const mobile = normalizePhone(p.mobile_phone) ?? null

    let personId: string
    let person: Record<string, unknown>

    if (cpf && cpf.length >= 11) {
      const { data: existing } = await supabase.from('people').select('*').eq('cpf', cpf).maybeSingle()
      if (existing) {
        personId = existing.id
        const updatePayload: Record<string, unknown> = {
          full_name: p.full_name,
          updated_at: new Date().toISOString(),
        }
        if (email != null) updatePayload.email = email
        if (mobile != null) updatePayload.mobile_phone = mobile
        if (p.birth_date != null) updatePayload.birth_date = normalizeDate(p.birth_date)
        if (p.cep != null) updatePayload.cep = p.cep
        if (p.city != null) updatePayload.city = p.city
        if (p.state != null) updatePayload.state = p.state
        if (p.neighborhood != null) updatePayload.neighborhood = p.neighborhood
        if (p.address_line != null) updatePayload.address_line = p.address_line
        if (p.conversion_date != null) updatePayload.conversion_date = normalizeDate(p.conversion_date)
        const { data: updated, error: errUpdate } = await supabase.from('people').update(updatePayload).eq('id', personId).select().single()
        if (errUpdate) {
          console.error('Erro ao atualizar pessoa (cpf):', errUpdate)
          return NextResponse.json({ error: apiError('Erro ao atualizar pessoa', errUpdate) }, { status: 500 })
        }
        person = updated as Record<string, unknown>
      } else {
        const insertPayload = {
          full_name: p.full_name,
          church_profile: 'Visitante',
          church_situation: 'Ativo',
          cpf,
          email,
          mobile_phone: mobile,
          birth_date: normalizeDate(p.birth_date) ?? null,
          cep: p.cep ?? null,
          city: p.city ?? null,
          state: p.state ?? null,
          neighborhood: p.neighborhood ?? null,
          address_line: p.address_line ?? null,
          conversion_date: normalizeDate(p.conversion_date) ?? null,
        }
        const { data: created, error: errInsert } = await supabase.from('people').insert(insertPayload).select().single()
        if (errInsert) {
          console.error('Erro ao criar pessoa (cpf):', errInsert)
          return NextResponse.json({ error: apiError('Erro ao criar pessoa', errInsert) }, { status: 500 })
        }
        person = created as Record<string, unknown>
        personId = (created as { id: string }).id
      }
    } else if (email) {
      const { data: existing } = await supabase.from('people').select('*').eq('email', email).maybeSingle()
      if (existing) {
        personId = existing.id
        const updatePayload: Record<string, unknown> = { full_name: p.full_name, updated_at: new Date().toISOString() }
        if (mobile != null) updatePayload.mobile_phone = mobile
        if (p.birth_date != null) updatePayload.birth_date = normalizeDate(p.birth_date)
        if (p.cep != null) updatePayload.cep = p.cep
        if (p.city != null) updatePayload.city = p.city
        if (p.state != null) updatePayload.state = p.state
        if (p.neighborhood != null) updatePayload.neighborhood = p.neighborhood
        if (p.address_line != null) updatePayload.address_line = p.address_line
        if (p.conversion_date != null) updatePayload.conversion_date = normalizeDate(p.conversion_date)
        const { data: updated, error: errUpdate } = await supabase.from('people').update(updatePayload).eq('id', personId).select().single()
        if (errUpdate) {
          console.error('Erro ao atualizar pessoa (email):', errUpdate)
          return NextResponse.json({ error: apiError('Erro ao atualizar pessoa', errUpdate) }, { status: 500 })
        }
        person = updated as Record<string, unknown>
      } else {
        const insertPayload = {
          full_name: p.full_name,
          church_profile: 'Visitante',
          church_situation: 'Ativo',
          email,
          mobile_phone: mobile,
          birth_date: normalizeDate(p.birth_date) ?? null,
          cep: p.cep ?? null,
          city: p.city ?? null,
          state: p.state ?? null,
          neighborhood: p.neighborhood ?? null,
          address_line: p.address_line ?? null,
          conversion_date: normalizeDate(p.conversion_date) ?? null,
        }
        const { data: created, error: errInsert } = await supabase.from('people').insert(insertPayload).select().single()
        if (errInsert) {
          console.error('Erro ao criar pessoa (email):', errInsert)
          return NextResponse.json({ error: apiError('Erro ao criar pessoa', errInsert) }, { status: 500 })
        }
        person = created as Record<string, unknown>
        personId = (created as { id: string }).id
      }
    } else if (mobile) {
      const { data: existing } = await supabase.from('people').select('*').eq('mobile_phone', mobile).maybeSingle()
      if (existing) {
        personId = existing.id
        const updatePayload: Record<string, unknown> = { full_name: p.full_name, updated_at: new Date().toISOString() }
        if (email != null) updatePayload.email = email
        if (p.birth_date != null) updatePayload.birth_date = normalizeDate(p.birth_date)
        if (p.cep != null) updatePayload.cep = p.cep
        if (p.city != null) updatePayload.city = p.city
        if (p.state != null) updatePayload.state = p.state
        if (p.neighborhood != null) updatePayload.neighborhood = p.neighborhood
        if (p.address_line != null) updatePayload.address_line = p.address_line
        if (p.conversion_date != null) updatePayload.conversion_date = normalizeDate(p.conversion_date)
        const { data: updated, error: errUpdate } = await supabase.from('people').update(updatePayload).eq('id', personId).select().single()
        if (errUpdate) {
          console.error('Erro ao atualizar pessoa (mobile):', errUpdate)
          return NextResponse.json({ error: apiError('Erro ao atualizar pessoa', errUpdate) }, { status: 500 })
        }
        person = updated as Record<string, unknown>
      } else {
        const insertPayload = {
          full_name: p.full_name,
          church_profile: 'Visitante',
          church_situation: 'Ativo',
          mobile_phone: mobile,
          email,
          birth_date: normalizeDate(p.birth_date) ?? null,
          cep: p.cep ?? null,
          city: p.city ?? null,
          state: p.state ?? null,
          neighborhood: p.neighborhood ?? null,
          address_line: p.address_line ?? null,
          conversion_date: normalizeDate(p.conversion_date) ?? null,
        }
        const { data: created, error: errInsert } = await supabase.from('people').insert(insertPayload).select().single()
        if (errInsert) {
          console.error('Erro ao criar pessoa (mobile):', errInsert)
          return NextResponse.json({ error: apiError('Erro ao criar pessoa', errInsert) }, { status: 500 })
        }
        person = created as Record<string, unknown>
        personId = (created as { id: string }).id
      }
    } else {
      const insertPayload = {
        full_name: p.full_name,
        church_profile: 'Visitante',
        church_situation: 'Ativo',
        email,
        mobile_phone: mobile,
        birth_date: normalizeDate(p.birth_date) ?? null,
        cep: p.cep ?? null,
        city: p.city ?? null,
        state: p.state ?? null,
        neighborhood: p.neighborhood ?? null,
        address_line: p.address_line ?? null,
        conversion_date: normalizeDate(p.conversion_date) ?? null,
      }
      const { data: created, error: errInsert } = await supabase.from('people').insert(insertPayload).select().single()
      if (errInsert) {
        console.error('Erro ao criar pessoa (sem cpf/email/mobile):', errInsert)
        return NextResponse.json({ error: apiError('Erro ao criar pessoa', errInsert) }, { status: 500 })
      }
      person = created as Record<string, unknown>
      personId = (created as { id: string }).id
    }

    const conversaoDate = normalizeDate(dataConversao) || getTodayBrasilia()
    const truncate = (s: string | null | undefined, max: number) =>
      s != null && s.length > max ? s.slice(0, max) : (s ?? null)
    const conversaoPayload: Record<string, unknown> = {
      person_id: personId,
      nome: truncate(p.full_name, 255) ?? '',
      email: truncate(email ?? null, 255),
      telefone: truncate(mobile ?? p.mobile_phone ?? '', 20) || '',
      data_nascimento: normalizeDate(p.birth_date) ?? null,
      endereco: p.address_line ?? null,
      cidade: truncate(p.city ?? null, 100),
      estado: truncate(p.state ?? null, 2),
      cep: truncate(p.cep ?? null, 10),
      data_conversao: conversaoDate,
      culto: truncate(culto ?? null, 50),
      quem_indicou: truncate(quemIndicou ?? null, 255),
      observacoes: observacoes ?? null,
      created_by: userId,
      updated_by: userId,
    }
    if (consolidatorPersonId) conversaoPayload.consolidator_person_id = consolidatorPersonId
    else if (consolidatorNameText !== null) conversaoPayload.consolidator_name_text = consolidatorNameText
    if (cellId) conversaoPayload.cell_id = cellId
    else if (cellNameText !== null) conversaoPayload.cell_name_text = cellNameText
    if (conversionType) conversaoPayload.conversion_type = conversionType
    if (instagram !== null) conversaoPayload.instagram = instagram
    if (churchId) conversaoPayload.church_id = churchId
    if (teamId) conversaoPayload.team_id = teamId
    conversaoPayload.gender = gender

    const { data: conversion, error: errConv } = await supabase.from('conversoes').insert(conversaoPayload).select().single()
    if (errConv) {
      console.error('Erro ao criar conversão (público):', errConv)
      return NextResponse.json({ error: apiError('Erro ao registrar conversão', errConv) }, { status: 500 })
    }

    const telefoneFinal = (conversaoPayload.telefone as string) || (person?.mobile_phone as string) || ''
    if (telefoneFinal) {
      const { data: settings } = await supabase.from('consolidation_settings').select('disparos_api_enabled').eq('id', 1).single()
      if (settings?.disparos_api_enabled) {
        const { callDisparosWebhook } = await import('@/lib/disparos-webhook')
        const tipo = (conversionType === 'reconciled' ? 'reconciled' : 'accepted') as 'accepted' | 'reconciled'
        callDisparosWebhook({
          phone: telefoneFinal,
          nome: (conversaoPayload.nome as string) || (person?.full_name as string) || '',
          conversionType: tipo,
        }).catch(() => {})
      }
    }

    return NextResponse.json({ person, conversion })
  } catch (err) {
    console.error('Erro em public conversao:', err)
    const message = err instanceof Error ? err.message : 'Erro interno do servidor'
    return NextResponse.json(
      { error: process.env.NODE_ENV === 'development' ? message : 'Erro ao registrar conversão. Tente novamente.' },
      { status: 500 }
    )
  }
}
