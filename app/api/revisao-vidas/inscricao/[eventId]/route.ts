import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdminClient } from '@/lib/supabase-server'

function normalizePhone(raw: string): string {
  return raw.replace(/\D/g, '')
}

function generateAnamneseToken() {
  return `${crypto.randomUUID().replace(/-/g, '')}${Date.now().toString(36)}`
}

/**
 * GET /api/revisao-vidas/inscricao/[eventId]
 * Público – retorna dados básicos do evento para exibir no formulário.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: { eventId: string } }
) {
  const supabase = createSupabaseAdminClient()

  const { data: event, error } = await supabase
    .from('revisao_vidas_events')
    .select('id, name, start_date, end_date, active')
    .eq('id', params.eventId)
    .single()

  if (error || !event) {
    return NextResponse.json({ error: 'Evento não encontrado' }, { status: 404 })
  }

  return NextResponse.json({ event })
}

/**
 * POST /api/revisao-vidas/inscricao/[eventId]
 * Público – cria ou recupera inscrição para a pessoa identificada pelo telefone.
 *
 * Body: { full_name, mobile_phone, email?, birth_date? }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { eventId: string } }
) {
  const supabase = createSupabaseAdminClient()

  // 1. Validar evento
  const { data: event, error: evErr } = await supabase
    .from('revisao_vidas_events')
    .select('id, name, active')
    .eq('id', params.eventId)
    .single()

  if (evErr || !event) {
    return NextResponse.json({ error: 'Evento não encontrado' }, { status: 404 })
  }

  if (!event.active) {
    return NextResponse.json({ error: 'Este evento não está aceitando inscrições no momento.' }, { status: 400 })
  }

  // 2. Dados do formulário
  const body = await request.json().catch(() => ({}))
  const fullName = (body.full_name ?? '').trim()
  const rawPhone = (body.mobile_phone ?? '').trim()
  const email = (body.email ?? '').trim() || null
  const birthDate = (body.birth_date ?? '').trim() || null
  const sex = (body.sex ?? '').trim() || null                          // 'Masculino' | 'Feminino'
  const decisionType = (body.decision_type ?? '').trim() || null       // 'aceitou' | 'reconciliou'
  const leaderName = (body.leader_name ?? '').trim() || null           // texto livre
  const team = (body.team ?? '').trim() || null                        // texto livre
  const preRevisao = body.pre_revisao === true || body.pre_revisao === 'true' // boolean

  if (!fullName) return NextResponse.json({ error: 'Informe seu nome completo.' }, { status: 400 })
  if (!rawPhone) return NextResponse.json({ error: 'Informe seu telefone/WhatsApp.' }, { status: 400 })

  const phone = normalizePhone(rawPhone)
  if (phone.length < 10) {
    return NextResponse.json({ error: 'Telefone inválido. Informe com DDD.' }, { status: 400 })
  }

  // 3. Localizar ou criar pessoa pelo telefone
  const phoneSearch = phone.startsWith('55') ? phone.slice(2) : phone
  const { data: existingPeople, error: searchErr } = await supabase
    .from('people')
    .select('id, full_name, email, birth_date, sex')
    .or(`mobile_phone.eq.${phone},mobile_phone.eq.+55${phone},mobile_phone.eq.${phoneSearch},mobile_phone.eq.+55${phoneSearch}`)
    .limit(1)

  if (searchErr) {
    console.error('inscricao: erro ao buscar pessoa:', searchErr)
    return NextResponse.json({ 
      error: 'Erro ao processar cadastro. Tente novamente.',
      details: searchErr.message 
    }, { status: 500 })
  }

  let personId: string

  if (existingPeople && existingPeople.length > 0) {
    personId = existingPeople[0].id
    const pData = existingPeople[0]

    // Atualizar e-mail / data de nascimento / sexo se informados e ausentes no cadastro central
    const updates: Record<string, string> = {}
    if (email && !pData.email) updates.email = email
    if (birthDate && !pData.birth_date) updates.birth_date = birthDate
    if (sex && !pData.sex) updates.sex = sex
    
    if (Object.keys(updates).length > 0) {
      await supabase.from('people').update(updates).eq('id', personId)
    }
  } else {
    // Criar nova pessoa
    const { data: newPerson, error: createErr } = await supabase
      .from('people')
      .insert({
        full_name: fullName,
        mobile_phone: phone,
        email: email ?? null,
        birth_date: birthDate ?? null,
        sex: sex ?? null,
        // Campos obrigatórios no banco (NOT NULL) que estavam falhando o cadastro
        church_profile: 'Visitante',
        church_situation: 'Ativo',
      })
      .select('id')
      .single()

    if (createErr || !newPerson) {
      console.error('inscricao: criar pessoa:', createErr)
      return NextResponse.json({ 
        error: 'Erro ao processar cadastro. Tente novamente.',
        details: createErr?.message || 'Erro ao registrar nova pessoa no banco de dados'
      }, { status: 500 })
    }

    personId = newPerson.id
  }

  // 4. Verificar se já tem inscrição
  const { data: existing } = await supabase
    .from('revisao_vidas_registrations')
    .select('id, status, anamnese_token')
    .eq('event_id', params.eventId)
    .eq('person_id', personId)
    .maybeSingle()

  if (existing) {
    return NextResponse.json({
      alreadyRegistered: true,
      registrationId: existing.id,
      status: existing.status,
      anamneseToken: existing.anamnese_token ?? null,
      personId,
      eventName: event.name,
    })
  }

  // 5. Criar inscrição
  const anamneseToken = generateAnamneseToken()
  const { data: reg, error: regErr } = await supabase
    .from('revisao_vidas_registrations')
    .insert({
      event_id: params.eventId,
      person_id: personId,
      status: 'inscrito',
      anamnese_token: anamneseToken,
      decision_type: decisionType ?? null,
      leader_name: leaderName ?? null,
      team: team ?? null,
      pre_revisao_aplicado: preRevisao,
    })
    .select('id')
    .single()

  if (regErr || !reg) {
    console.error('inscricao: criar registro:', regErr)
    return NextResponse.json({ error: 'Erro ao criar inscrição. Tente novamente.' }, { status: 500 })
  }

  return NextResponse.json({
    alreadyRegistered: false,
    registrationId: reg.id,
    anamneseToken,
    personId,
    eventName: event.name,
  }, { status: 201 })
}
