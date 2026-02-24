import { NextRequest, NextResponse } from 'next/server'
import { getAccessSnapshotFromRequest } from '@/lib/rbac'
import { supabaseServer } from '@/lib/supabase-server'
import { normalizeCpf, normalizeDate, normalizePhone, personUpdateSchema } from '@/lib/validators/person'

async function getSelfPersonIdByUserId(userId: string): Promise<string | null> {

  const { data: profile } = await supabaseServer
    .from('profiles')
    .select('person_id')
    .eq('id', userId)
    .maybeSingle()

  return profile?.person_id ?? null
}

export async function GET(request: NextRequest) {
  try {
    const snapshot = await getAccessSnapshotFromRequest(request)
    if (!snapshot.userId) {
      return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 })
    }

    const personId = await getSelfPersonIdByUserId(snapshot.userId)
    if (!personId) {
      return NextResponse.json({ error: 'Pessoa não vinculada ao usuário.' }, { status: 404 })
    }

    const { data: person, error } = await supabaseServer
      .from('people')
      .select('*')
      .eq('id', personId)
      .maybeSingle()

    if (error) {
      console.error('GET auth/self/person:', error)
      return NextResponse.json({ error: 'Erro ao carregar cadastro de pessoa.' }, { status: 500 })
    }

    if (!person) {
      return NextResponse.json({ error: 'Pessoa não encontrada.' }, { status: 404 })
    }

    return NextResponse.json({ person })
  } catch (err) {
    console.error('GET auth/self/person exception:', err)
    return NextResponse.json({ error: 'Erro interno do servidor.' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const snapshot = await getAccessSnapshotFromRequest(request)
    if (!snapshot.userId) {
      return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 })
    }

    const personId = await getSelfPersonIdByUserId(snapshot.userId)
    if (!personId) {
      return NextResponse.json({ error: 'Pessoa não vinculada ao usuário.' }, { status: 404 })
    }

    const body = await request.json().catch(() => ({}))
    const parsed = personUpdateSchema.safeParse(body)
    if (!parsed.success) {
      const message = Object.values(parsed.error.flatten().fieldErrors).flat().join('; ') || 'Dados inválidos.'
      return NextResponse.json({ error: message }, { status: 400 })
    }

    const row = parsed.data
    const payload: Record<string, unknown> = {}

    if (row.full_name !== undefined) payload.full_name = row.full_name
    if (row.sex !== undefined) payload.sex = row.sex ?? null
    if (row.birth_date !== undefined) payload.birth_date = normalizeDate(row.birth_date) ?? null
    if (row.marital_status !== undefined) payload.marital_status = row.marital_status ?? null
    if (row.marriage_date !== undefined) payload.marriage_date = normalizeDate(row.marriage_date) ?? null
    if (row.rg !== undefined) payload.rg = row.rg ?? null
    if (row.cpf !== undefined) payload.cpf = normalizeCpf(row.cpf) ?? null
    if (row.special_needs !== undefined) payload.special_needs = row.special_needs ?? null
    if (row.cep !== undefined) payload.cep = row.cep ?? null
    if (row.city !== undefined) payload.city = row.city ?? null
    if (row.state !== undefined) payload.state = row.state ?? null
    if (row.neighborhood !== undefined) payload.neighborhood = row.neighborhood ?? null
    if (row.address_line !== undefined) payload.address_line = row.address_line ?? null
    if (row.address_number !== undefined) payload.address_number = row.address_number ?? null
    if (row.address_complement !== undefined) payload.address_complement = row.address_complement ?? null
    if (row.email !== undefined) payload.email = row.email ? String(row.email).trim() : null
    if (row.mobile_phone !== undefined) payload.mobile_phone = normalizePhone(row.mobile_phone) ?? null
    if (row.phone !== undefined) payload.phone = normalizePhone(row.phone) ?? null
    if (row.nationality !== undefined) payload.nationality = row.nationality ?? null
    if (row.birthplace !== undefined) payload.birthplace = row.birthplace ?? null
    if (row.blood_type !== undefined) payload.blood_type = row.blood_type ?? null

    if (Object.keys(payload).length === 0) {
      const { data: person } = await supabaseServer
        .from('people')
        .select('*')
        .eq('id', personId)
        .maybeSingle()
      return NextResponse.json({ person })
    }

    const { data: person, error: updateError } = await supabaseServer
      .from('people')
      .update(payload)
      .eq('id', personId)
      .select('*')
      .single()

    if (updateError) {
      if (updateError.code === '23505') {
        return NextResponse.json({ error: 'CPF ou e-mail já cadastrado para outra pessoa.' }, { status: 409 })
      }
      console.error('PATCH auth/self/person:', updateError)
      return NextResponse.json({ error: 'Erro ao atualizar cadastro de pessoa.' }, { status: 500 })
    }

    const profilePayload: Record<string, unknown> = {}
    if (typeof payload.full_name === 'string' && payload.full_name.trim()) {
      profilePayload.full_name = payload.full_name
    }
    if (typeof payload.email === 'string' && payload.email.trim()) {
      profilePayload.email = payload.email
    }

    if (Object.keys(profilePayload).length > 0) {
      await supabaseServer
        .from('profiles')
        .update({ ...profilePayload, updated_at: new Date().toISOString() })
        .eq('id', snapshot.userId)
    }

    return NextResponse.json({ person })
  } catch (err) {
    console.error('PATCH auth/self/person exception:', err)
    return NextResponse.json({ error: 'Erro interno do servidor.' }, { status: 500 })
  }
}
