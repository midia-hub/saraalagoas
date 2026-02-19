import { NextRequest, NextResponse } from 'next/server'
import { requireAccess } from '@/lib/admin-api'
import { createSupabaseAdminClient } from '@/lib/supabase-server'
import { personCreateSchema } from '@/lib/validators/person'
import { normalizeCpf, normalizePhone, normalizeDate } from '@/lib/validators/person'
import { normalizeForSearch } from '@/lib/normalize-text'

const isDev = process.env.NODE_ENV === 'development'

/**
 * GET /api/admin/people
 * Lista pessoas com busca e filtros (query: q, church_profile, church_situation, church_role)
 */
export async function GET(request: NextRequest) {
  try {
    const access = await requireAccess(request, { pageKey: 'pessoas', action: 'view' })
    if (!access.ok) return access.response

    const { searchParams } = new URL(request.url)
    const q = searchParams.get('q')?.trim() || ''
    const churchProfile = searchParams.get('church_profile') || ''
    const churchSituation = searchParams.get('church_situation') || ''
    const churchRole = searchParams.get('church_role') || ''

    const supabase = createSupabaseAdminClient(request)
    let query = supabase
      .from('people')
      .select('*')
      .order('updated_at', { ascending: false })

    if (churchProfile) {
      query = query.eq('church_profile', churchProfile)
    }
    if (churchSituation) {
      query = query.eq('church_situation', churchSituation)
    }
    if (churchRole) {
      query = query.eq('church_role', churchRole)
    }

    if (q) {
      const digits = q.replace(/\D/g, '')
      const qNorm = normalizeForSearch(q)
      const orParts = [
        `full_name_normalized.ilike.%${qNorm}%`,
        `email.ilike.%${q}%`,
        `mobile_phone.ilike.%${q}%`,
        `phone.ilike.%${q}%`,
      ]
      if (digits.length >= 11) orParts.push(`cpf.eq.${digits}`)
      query = query.or(orParts.join(','))
    }

    const { data: people, error } = await query

    if (error) {
      console.error('Erro ao listar pessoas:', error)
      // Tabela people ainda não existe (migração não aplicada) → retorna vazio para a página carregar
      const isMissingTable =
        error.code === '42P01' ||
        (typeof error.message === 'string' && error.message.includes('does not exist'))
      if (isMissingTable) {
        return NextResponse.json({
          people: [],
          _warning: 'Tabela people não encontrada. Execute a migração 20260214_01_create_people_and_link_consolidacao.sql',
        })
      }
      const message =
        isDev && error?.message
          ? `${error.message}${error.code ? ` (código: ${error.code})` : ''}`
          : 'Erro ao listar pessoas'
      return NextResponse.json({ error: message }, { status: 500 })
    }

    return NextResponse.json({ people: people || [] })
  } catch (err) {
    console.error('Erro em GET /api/admin/people:', err)
    const message =
      err instanceof Error ? err.message : 'Erro interno do servidor'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

/**
 * POST /api/admin/people
 * Cria uma nova pessoa
 */
export async function POST(request: NextRequest) {
  const access = await requireAccess(request, { pageKey: 'pessoas', action: 'create' })
  if (!access.ok) return access.response

  try {
    const body = await request.json().catch(() => ({}))
    const parsed = personCreateSchema.safeParse(body)
    if (!parsed.success) {
      const msg = parsed.error.flatten().fieldErrors
        ? Object.values(parsed.error.flatten().fieldErrors).flat().join('; ')
        : 'Dados inválidos'
      return NextResponse.json({ error: msg }, { status: 400 })
    }

    const row = parsed.data
    const payload = {
      leader_person_id: row.leader_person_id ?? null,
      full_name: row.full_name,
      church_profile: row.church_profile,
      church_situation: row.church_situation,
      church_role: row.church_role ?? null,
      sex: row.sex ?? null,
      birth_date: normalizeDate(row.birth_date) ?? null,
      marital_status: row.marital_status ?? null,
      marriage_date: normalizeDate(row.marriage_date) ?? null,
      rg: row.rg ?? null,
      cpf: normalizeCpf(row.cpf) ?? null,
      special_needs: row.special_needs ?? null,
      cep: row.cep ?? null,
      city: row.city ?? null,
      state: row.state ?? null,
      neighborhood: row.neighborhood ?? null,
      address_line: row.address_line ?? null,
      email: (row.email && row.email.trim()) ? row.email.trim() : null,
      mobile_phone: normalizePhone(row.mobile_phone) ?? null,
      phone: normalizePhone(row.phone) ?? null,
      entry_by: row.entry_by ?? null,
      entry_date: normalizeDate(row.entry_date) ?? null,
      status_in_church: row.status_in_church ?? null,
      conversion_date: normalizeDate(row.conversion_date) ?? null,
      is_baptized: row.is_baptized ?? null,
      baptism_date: normalizeDate(row.baptism_date) ?? null,
      is_leader: row.is_leader ?? null,
      is_pastor: row.is_pastor ?? null,
      education_level: row.education_level ?? null,
      profession: row.profession ?? null,
      nationality: row.nationality ?? null,
      birthplace: row.birthplace ?? null,
      interviewed_by: row.interviewed_by ?? null,
      registered_by: row.registered_by ?? null,
      blood_type: row.blood_type ?? null,
    }

    const supabase = createSupabaseAdminClient(request)
    const { data: person, error } = await supabase
      .from('people')
      .insert(payload)
      .select()
      .single()

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ error: 'CPF já cadastrado para outra pessoa.' }, { status: 409 })
      }
      console.error('Erro ao criar pessoa:', error)
      const message = isDev && error?.message ? error.message : 'Erro ao criar pessoa'
      return NextResponse.json({ error: message }, { status: 500 })
    }

    return NextResponse.json({ person })
  } catch (err) {
    console.error('Erro em POST /api/admin/people:', err)
    const message =
      isDev && err instanceof Error ? err.message : 'Erro interno do servidor'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
