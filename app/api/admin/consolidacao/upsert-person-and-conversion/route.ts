import { NextRequest, NextResponse } from 'next/server'
import { requireAccess } from '@/lib/admin-api'
import { createSupabaseAdminClient } from '@/lib/supabase-server'
import { personUpsertFromConversionSchema } from '@/lib/validators/person'
import { normalizePhone, normalizeDate } from '@/lib/validators/person'
import { getTodayBrasilia } from '@/lib/date-utils'

/**
 * POST /api/admin/consolidacao/upsert-person-and-conversion
 * 1) Upsert pessoa (busca por CPF → email → mobile_phone; senão cria nova)
 * 2) Cria registro em conversoes com person_id
 * Body: person (nome, email, telefone, etc.) + conversion (data_conversao, culto, quem_indicou, observacoes)
 */
export async function POST(request: NextRequest) {
  const access = await requireAccess(request, { pageKey: 'consolidacao', action: 'create' })
  if (!access.ok) return access.response

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

    const supabase = createSupabaseAdminClient(request)
    const userId = access.snapshot.userId

    const p = parsedPerson.data
    const cpf = body.cpf ? String(body.cpf).replace(/\D/g, '') : null
    const email = (p.email && p.email.trim()) ? p.email.trim() : null
    const mobile = normalizePhone(p.mobile_phone) ?? null

    let personId: string
    let person: Record<string, unknown>

    if (cpf && cpf.length >= 11) {
      const { data: existing } = await supabase
        .from('people')
        .select('*')
        .eq('cpf', cpf)
        .maybeSingle()
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
        const { data: updated, error: errUpdate } = await supabase
          .from('people')
          .update(updatePayload)
          .eq('id', personId)
          .select()
          .single()
        if (errUpdate) {
          console.error('Erro ao atualizar pessoa no upsert:', errUpdate)
          return NextResponse.json({ error: 'Erro ao atualizar pessoa' }, { status: 500 })
        }
        person = updated as Record<string, unknown>
      } else {
        const insertPayload = {
          full_name: p.full_name,
          church_profile: 'Visitante',
          church_situation: 'Ativo',
          cpf: cpf,
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
        const { data: created, error: errInsert } = await supabase
          .from('people')
          .insert(insertPayload)
          .select()
          .single()
        if (errInsert) {
          console.error('Erro ao criar pessoa (por CPF):', errInsert)
          return NextResponse.json({ error: 'Erro ao criar pessoa' }, { status: 500 })
        }
        person = created as Record<string, unknown>
        personId = (created as { id: string }).id
      }
    } else if (email) {
      const { data: existing } = await supabase
        .from('people')
        .select('*')
        .eq('email', email)
        .maybeSingle()
      if (existing) {
        personId = existing.id
        const updatePayload: Record<string, unknown> = {
          full_name: p.full_name,
          updated_at: new Date().toISOString(),
        }
        if (mobile != null) updatePayload.mobile_phone = mobile
        if (p.birth_date != null) updatePayload.birth_date = normalizeDate(p.birth_date)
        if (p.cep != null) updatePayload.cep = p.cep
        if (p.city != null) updatePayload.city = p.city
        if (p.state != null) updatePayload.state = p.state
        if (p.neighborhood != null) updatePayload.neighborhood = p.neighborhood
        if (p.address_line != null) updatePayload.address_line = p.address_line
        if (p.conversion_date != null) updatePayload.conversion_date = normalizeDate(p.conversion_date)
        const { data: updated, error: errUpdate } = await supabase
          .from('people')
          .update(updatePayload)
          .eq('id', personId)
          .select()
          .single()
        if (errUpdate) {
          console.error('Erro ao atualizar pessoa no upsert:', errUpdate)
          return NextResponse.json({ error: 'Erro ao atualizar pessoa' }, { status: 500 })
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
        const { data: created, error: errInsert } = await supabase
          .from('people')
          .insert(insertPayload)
          .select()
          .single()
        if (errInsert) {
          console.error('Erro ao criar pessoa (por email):', errInsert)
          return NextResponse.json({ error: 'Erro ao criar pessoa' }, { status: 500 })
        }
        person = created as Record<string, unknown>
        personId = (created as { id: string }).id
      }
    } else if (mobile) {
      const { data: existing } = await supabase
        .from('people')
        .select('*')
        .eq('mobile_phone', mobile)
        .maybeSingle()
      if (existing) {
        personId = existing.id
        const updatePayload: Record<string, unknown> = {
          full_name: p.full_name,
          updated_at: new Date().toISOString(),
        }
        if (email != null) updatePayload.email = email
        if (p.birth_date != null) updatePayload.birth_date = normalizeDate(p.birth_date)
        if (p.cep != null) updatePayload.cep = p.cep
        if (p.city != null) updatePayload.city = p.city
        if (p.state != null) updatePayload.state = p.state
        if (p.neighborhood != null) updatePayload.neighborhood = p.neighborhood
        if (p.address_line != null) updatePayload.address_line = p.address_line
        if (p.conversion_date != null) updatePayload.conversion_date = normalizeDate(p.conversion_date)
        const { data: updated, error: errUpdate } = await supabase
          .from('people')
          .update(updatePayload)
          .eq('id', personId)
          .select()
          .single()
        if (errUpdate) {
          console.error('Erro ao atualizar pessoa no upsert:', errUpdate)
          return NextResponse.json({ error: 'Erro ao atualizar pessoa' }, { status: 500 })
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
        const { data: created, error: errInsert } = await supabase
          .from('people')
          .insert(insertPayload)
          .select()
          .single()
        if (errInsert) {
          console.error('Erro ao criar pessoa (por telefone):', errInsert)
          return NextResponse.json({ error: 'Erro ao criar pessoa' }, { status: 500 })
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
      const { data: created, error: errInsert } = await supabase
        .from('people')
        .insert(insertPayload)
        .select()
        .single()
      if (errInsert) {
        console.error('Erro ao criar pessoa:', errInsert)
        return NextResponse.json({ error: 'Erro ao criar pessoa' }, { status: 500 })
      }
      person = created as Record<string, unknown>
      personId = (created as { id: string }).id
    }

    const conversaoDate = normalizeDate(dataConversao) || getTodayBrasilia()
    const conversaoPayload: Record<string, unknown> = {
      person_id: personId,
      nome: p.full_name,
      email: email ?? null,
      telefone: mobile ?? p.mobile_phone ?? '',
      data_nascimento: normalizeDate(p.birth_date) ?? null,
      endereco: p.address_line ?? null,
      cidade: p.city ?? null,
      estado: p.state ?? null,
      cep: p.cep ?? null,
      data_conversao: conversaoDate,
      culto: culto ?? null,
      quem_indicou: quemIndicou ?? null,
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

    const { data: conversion, error: errConv } = await supabase
      .from('conversoes')
      .insert(conversaoPayload)
      .select()
      .single()

    if (errConv) {
      console.error('Erro ao criar conversão:', errConv)
      return NextResponse.json({ error: 'Erro ao registrar conversão' }, { status: 500 })
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
    console.error('Erro em upsert-person-and-conversion:', err)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
