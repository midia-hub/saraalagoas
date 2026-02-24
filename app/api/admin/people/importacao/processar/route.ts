import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-api'
import { createSupabaseAdminClient } from '@/lib/supabase-server'
import { parsePeopleWorkbook } from '@/lib/people-import'

export async function POST(request: NextRequest) {
  const access = await requireAdmin(request)
  if (!access.ok) return access.response

  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file || !(file instanceof Blob)) {
      return NextResponse.json({ error: 'Envie um arquivo XLSX em file.' }, { status: 400 })
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const parsed = parsePeopleWorkbook(buffer)

    if (parsed.missingRequiredFields.length > 0) {
      return NextResponse.json(
        {
          error: `Colunas obrigatórias ausentes: ${parsed.missingRequiredFields.join(', ')}`,
        },
        { status: 400 }
      )
    }

    if (parsed.errors.length > 0) {
      return NextResponse.json(
        {
          error: 'Arquivo possui erros de validação. Corrija antes de importar.',
          errors: parsed.errors,
        },
        { status: 400 }
      )
    }

    const supabase = createSupabaseAdminClient(request)


    // Buscar todos os registros existentes relevantes para evitar duplicidade
    // Coletar todos os valores únicos de nome, telefone, celular e email do arquivo
    const names = new Set(parsed.rows.map(r => r.full_name && r.full_name.trim() ? r.full_name.trim().toLowerCase() : null).filter(Boolean))
    const emails = new Set(parsed.rows.map(r => r.email && r.email.trim() ? r.email.trim().toLowerCase() : null).filter(Boolean))
    const phones = new Set(parsed.rows.map(r => r.phone && r.phone.trim() ? r.phone.trim() : null).filter(Boolean))
    const mobiles = new Set(parsed.rows.map(r => r.mobile_phone && r.mobile_phone.trim() ? r.mobile_phone.trim() : null).filter(Boolean))

    // Buscar pessoas existentes por nome, email, telefone ou celular
    const orFilters = []
    if (names.size > 0) orFilters.push(...[...names].map(n => `full_name.ilike.${n}`))
    if (emails.size > 0) orFilters.push(...[...emails].map(e => `email.ilike.${e}`))
    if (phones.size > 0) orFilters.push(...[...phones].map(p => `phone.ilike.${p}`))
    if (mobiles.size > 0) orFilters.push(...[...mobiles].map(m => `mobile_phone.ilike.${m}`))

    let existingPeople: any[] = []
    if (orFilters.length > 0) {
      // Supabase limita a 10 ORs por chamada, então pode ser necessário paginar
      const batchSize = 10
      for (let i = 0; i < orFilters.length; i += batchSize) {
        const batch = orFilters.slice(i, i + batchSize)
        const { data } = await supabase
          .from('people')
          .select('id,full_name,email,phone,mobile_phone')
          .or(batch.join(','))
        if (data) existingPeople = existingPeople.concat(data)
      }
    }

    // Normalizar para busca
    function norm(str: string | null | undefined) {
      return (str || '').normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().trim()
    }

    let created = 0
    let updated = 0
    const results: Array<{ row: number; full_name: string; success: boolean; action?: 'created' | 'updated'; error?: string }> = []

    for (const row of parsed.rows) {
      try {
        // Checar duplicidade por nome, telefone, celular ou email
        const rowName = norm(row.full_name)
        const rowEmail = norm(row.email)
        const rowPhone = norm(row.phone)
        const rowMobile = norm(row.mobile_phone)
        const found = existingPeople.find(p =>
          (rowName && norm(p.full_name) === rowName) ||
          (rowEmail && norm(p.email) === rowEmail) ||
          (rowPhone && norm(p.phone) === rowPhone) ||
          (rowMobile && norm(p.mobile_phone) === rowMobile)
        )
        if (found) {
          results.push({ row: row.row, full_name: row.full_name, success: false, error: 'Duplicidade detectada: já existe pessoa com mesmo nome, telefone, celular ou email.' })
          continue
        }

        let existingId: string | null = null
        if (row.cpf) {
          const { data: existingByCpf } = await supabase
            .from('people')
            .select('id')
            .eq('cpf', row.cpf)
            .maybeSingle()
          existingId = existingByCpf?.id ?? null
        }
        if (!existingId && row.email) {
          const { data: existingByEmail } = await supabase
            .from('people')
            .select('id')
            .eq('email', row.email)
            .maybeSingle()
          existingId = existingByEmail?.id ?? null
        }

        const payload = {
          full_name: row.full_name,
          sex: row.sex,
          church_profile: row.church_profile,
          church_name: row.church_name,
          church_situation: row.church_situation,
          status_in_church: row.status_in_church,
          is_pastor: row.is_pastor,
          is_leader: row.is_leader,
          is_new_convert: row.is_new_convert,
          accepted_jesus: row.accepted_jesus,
          accepted_jesus_at: row.accepted_jesus_at,
          conversion_date: row.conversion_date,
          email: row.email,
          phone: row.phone,
          mobile_phone: row.mobile_phone,
          marital_status: row.marital_status,
          is_baptized: row.is_baptized,
          entry_date: row.entry_date,
          entry_by: row.entry_by,
          birth_date: row.birth_date,
          marriage_date: row.marriage_date,
          baptism_date: row.baptism_date,
          cpf: row.cpf,
          rg: row.rg,
          rg_issuing_agency: row.rg_issuing_agency,
          rg_uf: row.rg_uf,
          address_line: row.address_line,
          address_number: row.address_number,
          address_complement: row.address_complement,
          neighborhood: row.neighborhood,
          cep: row.cep,
          city: row.city,
          state: row.state,
          education_level: row.education_level,
          profession: row.profession,
          blood_type: row.blood_type,
          nationality: row.nationality,
          birthplace: row.birthplace,
          origin_church: row.origin_church,
        }

        if (existingId) {
          const { error: updateError } = await supabase.from('people').update(payload).eq('id', existingId)
          if (updateError) throw updateError
          updated += 1
          results.push({ row: row.row, full_name: row.full_name, success: true, action: 'updated' })
        } else {
          const { error: insertError } = await supabase.from('people').insert(payload)
          if (insertError) throw insertError
          created += 1
          results.push({ row: row.row, full_name: row.full_name, success: true, action: 'created' })
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Erro desconhecido'
        results.push({ row: row.row, full_name: row.full_name, success: false, error: message })
      }
    }

    return NextResponse.json({
      created,
      updated,
      failed: results.filter((item) => !item.success).length,
      results,
    })
  } catch (error) {
    console.error('POST /api/admin/people/importacao/processar:', error)
    return NextResponse.json(
      { error: 'Erro ao processar importação de pessoas.' },
      { status: 500 }
    )
  }
}
