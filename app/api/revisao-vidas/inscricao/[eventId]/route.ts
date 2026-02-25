import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdminClient } from '@/lib/supabase-server'

type InscricaoLogAction =
  | 'attempt'
  | 'person_reused'
  | 'person_created'
  | 'registration_exists'
  | 'registration_created'
  | 'registration_error'

function normalizePhone(raw: string): string {
  return raw.replace(/\D/g, '')
}

function normalizeName(raw: string): string {
  return raw
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')
}

function maskPhoneForLog(raw: string): string {
  const digits = raw.replace(/\D/g, '')
  if (digits.length <= 4) return digits
  return `${digits.slice(0, 2)}***${digits.slice(-2)}`
}

async function writeInscricaoLog(
  supabase: ReturnType<typeof createSupabaseAdminClient>,
  input: {
    eventId: string
    action: InscricaoLogAction
    personId?: string | null
    registrationId?: string | null
    personName?: string | null
    phoneMasked?: string | null
    payload?: Record<string, unknown>
  }
) {
  try {
    await supabase.from('revisao_vidas_inscricao_logs').insert({
      event_id: input.eventId,
      person_id: input.personId ?? null,
      registration_id: input.registrationId ?? null,
      person_name: input.personName ?? null,
      phone_masked: input.phoneMasked ?? null,
      action: input.action,
      payload: input.payload ?? {},
    })
  } catch (error) {
    console.error('[revisao-inscricao] falha ao gravar log:', error)
  }
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
    .select('id, name, start_date, end_date, active, church_id')
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
  const maskedPhone = maskPhoneForLog(rawPhone)

  console.info('[revisao-inscricao] nova tentativa', {
    eventId: params.eventId,
    fullName,
    phone: maskedPhone,
  })

  await writeInscricaoLog(supabase, {
    eventId: params.eventId,
    action: 'attempt',
    personName: fullName,
    phoneMasked: maskedPhone,
  })

  if (!fullName) return NextResponse.json({ error: 'Informe seu nome completo.' }, { status: 400 })
  if (!rawPhone) return NextResponse.json({ error: 'Informe seu telefone/WhatsApp.' }, { status: 400 })

  const phone = normalizePhone(rawPhone)
  if (phone.length < 10) {
    return NextResponse.json({ error: 'Telefone inválido. Informe com DDD.' }, { status: 400 })
  }

  // 3. Localizar ou criar pessoa (telefone + nome)
  const phoneSearch = phone.startsWith('55') ? phone.slice(2) : phone
  const { data: existingPeople, error: searchErr } = await supabase
    .from('people')
    .select('id, full_name, email, birth_date, sex, created_at')
    .or(`mobile_phone.eq.${phone},mobile_phone.eq.+55${phone},mobile_phone.eq.${phoneSearch},mobile_phone.eq.+55${phoneSearch}`)
    .order('created_at', { ascending: false })

  if (searchErr) {
    console.error('inscricao: erro ao buscar pessoa:', searchErr)
    return NextResponse.json({ 
      error: 'Erro ao processar cadastro. Tente novamente.',
      details: searchErr.message 
    }, { status: 500 })
  }

  let personId: string
  const incomingName = normalizeName(fullName)
  const matchedPerson = (existingPeople ?? []).find((person) => normalizeName(person.full_name ?? '') === incomingName)

  if (matchedPerson) {
    personId = matchedPerson.id
    const pData = matchedPerson

    // Atualizar e-mail / data de nascimento / sexo se informados e ausentes no cadastro central
    const updates: Record<string, string> = {}
    if (email && !pData.email) updates.email = email
    if (birthDate && !pData.birth_date) updates.birth_date = birthDate
    if (sex && !pData.sex) updates.sex = sex
    
    if (Object.keys(updates).length > 0) {
      await supabase.from('people').update(updates).eq('id', personId)
    }

    console.info('[revisao-inscricao] pessoa reaproveitada', {
      eventId: params.eventId,
      personId,
      fullName,
      phone: maskedPhone,
      samePhoneCandidates: existingPeople?.length ?? 0,
    })

    await writeInscricaoLog(supabase, {
      eventId: params.eventId,
      action: 'person_reused',
      personId,
      personName: fullName,
      phoneMasked: maskedPhone,
      payload: { samePhoneCandidates: existingPeople?.length ?? 0 },
    })
  } else {
    // Criar nova pessoa (inclusive quando o telefone já existe, mas para outro nome)
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

    console.info('[revisao-inscricao] nova pessoa criada', {
      eventId: params.eventId,
      personId,
      fullName,
      phone: maskedPhone,
      samePhoneCandidates: existingPeople?.length ?? 0,
    })

    await writeInscricaoLog(supabase, {
      eventId: params.eventId,
      action: 'person_created',
      personId,
      personName: fullName,
      phoneMasked: maskedPhone,
      payload: { samePhoneCandidates: existingPeople?.length ?? 0 },
    })
  }

  // 4. Verificar se já tem inscrição
  const { data: existing } = await supabase
    .from('revisao_vidas_registrations')
    .select('id, status, anamnese_token')
    .eq('event_id', params.eventId)
    .eq('person_id', personId)
    .maybeSingle()

  if (existing) {
    console.info('[revisao-inscricao] inscrição já existente', {
      eventId: params.eventId,
      personId,
      registrationId: existing.id,
      status: existing.status,
    })

    await writeInscricaoLog(supabase, {
      eventId: params.eventId,
      action: 'registration_exists',
      personId,
      registrationId: existing.id,
      personName: fullName,
      phoneMasked: maskedPhone,
      payload: { status: existing.status },
    })

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

    await writeInscricaoLog(supabase, {
      eventId: params.eventId,
      action: 'registration_error',
      personId,
      personName: fullName,
      phoneMasked: maskedPhone,
      payload: { error: regErr?.message ?? 'unknown' },
    })

    return NextResponse.json({ error: 'Erro ao criar inscrição. Tente novamente.' }, { status: 500 })
  }

  console.info('[revisao-inscricao] inscrição criada', {
    eventId: params.eventId,
    personId,
    registrationId: reg.id,
    fullName,
    phone: maskedPhone,
  })

  await writeInscricaoLog(supabase, {
    eventId: params.eventId,
    action: 'registration_created',
    personId,
    registrationId: reg.id,
    personName: fullName,
    phoneMasked: maskedPhone,
  })

  return NextResponse.json({
    alreadyRegistered: false,
    registrationId: reg.id,
    anamneseToken,
    personId,
    eventName: event.name,
  }, { status: 201 })
}
