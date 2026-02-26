import { NextRequest, NextResponse } from 'next/server'
import { requireAccess } from '@/lib/admin-api'
import { createSupabaseAdminClient } from '@/lib/supabase-server'

type Params = { params: Promise<{ id: string }> }

/**
 * GET /api/admin/pessoas/[id]/kids-links
 * Lista os vínculos adulto → criança para uma pessoa.
 */
export async function GET(request: NextRequest, { params }: Params) {
  const access = await requireAccess(request, { pageKey: 'pessoas', action: 'view' })
  if (!access.ok) return access.response

  const { id: adultId } = await params
  const supabase = createSupabaseAdminClient(request)

  const { data, error } = await supabase
    .from('people_kids_links')
    .select('id, child_id, relationship_type, kids_father_name, kids_mother_name, kids_father_contact, kids_mother_contact, kids_guardian_kinship, kids_contact_1, kids_contact_2, kids_disability, kids_favorite_toy, kids_calming_mechanism, kids_food_restriction, kids_language_difficulty, kids_noise_sensitivity, kids_material_allergy, kids_ministry_network, kids_medication, kids_health_issues, kids_bathroom_use, child:people!child_id(id, full_name, birth_date)')
    .eq('adult_id', adultId)
    .order('created_at', { ascending: true })

  if (error) {
    console.error('GET kids-links:', error)
    return NextResponse.json({ error: 'Erro ao buscar vínculos' }, { status: 500 })
  }

  const items = (data ?? []).map((row: {
    id: string
    child_id: string
    relationship_type: string
    kids_father_name: string | null
    kids_mother_name: string | null
    kids_father_contact: string | null
    kids_mother_contact: string | null
    kids_guardian_kinship: string | null
    kids_contact_1: string | null
    kids_contact_2: string | null
    kids_disability: string | null
    kids_favorite_toy: string | null
    kids_calming_mechanism: string | null
    kids_food_restriction: string | null
    kids_language_difficulty: string | null
    kids_noise_sensitivity: string | null
    kids_material_allergy: string | null
    kids_ministry_network: string | null
    kids_medication: string | null
    kids_health_issues: string | null
    kids_bathroom_use: string | null
    child: Array<{ id: string; full_name: string; birth_date: string | null }> | { id: string; full_name: string; birth_date: string | null } | null
  }) => {
    const childRecord = Array.isArray(row.child) ? row.child[0] : row.child
    return {
      id: row.id,
      child_id: row.child_id,
      child_name: childRecord?.full_name ?? '',
      birth_date: childRecord?.birth_date ?? null,
      relationship_type: row.relationship_type,
      kids_father_name: row.kids_father_name,
      kids_mother_name: row.kids_mother_name,
      kids_father_contact: row.kids_father_contact,
      kids_mother_contact: row.kids_mother_contact,
      kids_guardian_kinship: row.kids_guardian_kinship,
      kids_contact_1: row.kids_contact_1,
      kids_contact_2: row.kids_contact_2,
      kids_disability: row.kids_disability,
      kids_favorite_toy: row.kids_favorite_toy,
      kids_calming_mechanism: row.kids_calming_mechanism,
      kids_food_restriction: row.kids_food_restriction,
      kids_language_difficulty: row.kids_language_difficulty,
      kids_noise_sensitivity: row.kids_noise_sensitivity,
      kids_material_allergy: row.kids_material_allergy,
      kids_ministry_network: row.kids_ministry_network,
      kids_medication: row.kids_medication,
      kids_health_issues: row.kids_health_issues,
      kids_bathroom_use: row.kids_bathroom_use,
    }
  })

  return NextResponse.json({ items })
}

/**
 * PUT /api/admin/pessoas/[id]/kids-links
 * Substitui todos os vínculos adulto → criança.
 * Body: { links: Array<{ child_id: string; relationship_type: string }> }
 */
export async function PUT(request: NextRequest, { params }: Params) {
  const access = await requireAccess(request, { pageKey: 'pessoas', action: 'edit' })
  if (!access.ok) return access.response

  const { id: adultId } = await params
  const body = await request.json()
  const links: Array<{
    child_id?: string | null
    child_name: string
    birth_date?: string | null
    sex?: string | null
    relationship_type: string
    kids_father_name?: string | null
    kids_mother_name?: string | null
    kids_father_contact?: string | null
    kids_mother_contact?: string | null
    kids_guardian_kinship?: string | null
    kids_contact_1?: string | null
    kids_contact_2?: string | null
    kids_disability?: string | null
    kids_favorite_toy?: string | null
    kids_calming_mechanism?: string | null
    kids_food_restriction?: string | null
    kids_language_difficulty?: string | null
    kids_noise_sensitivity?: string | null
    kids_material_allergy?: string | null
    kids_ministry_network?: string | null
    kids_medication?: string | null
    kids_health_issues?: string | null
    kids_bathroom_use?: string | null
  }> = body.links ?? []

  const supabase = createSupabaseAdminClient(request)

  // Deleta todos os vínculos existentes deste adulto
  const { error: delError } = await supabase
    .from('people_kids_links')
    .delete()
    .eq('adult_id', adultId)

  if (delError) {
    console.error('PUT kids-links delete:', delError)
    return NextResponse.json({ error: 'Erro ao atualizar vínculos' }, { status: 500 })
  }

  if (links.length > 0) {
    const { data: adultPerson } = await supabase
      .from('people')
      .select('mobile_phone, phone')
      .eq('id', adultId)
      .single()

    const adultContact = (adultPerson?.mobile_phone || adultPerson?.phone || '').trim() || null

    // Para cada vínculo sem child_id, cria primeiro o cadastro da criança
    const rows: Array<Record<string, unknown>> = []
    for (const l of links) {
      let childId = l.child_id ?? null

      if (!childId) {
        // Criar novo cadastro de pessoa para a criança
        const { data: newChild, error: createErr } = await supabase
          .from('people')
          .insert({
            full_name: l.child_name,
            birth_date: l.birth_date || null,
            sex: l.sex || null,
            church_profile: 'Frequentador',
            church_situation: 'Ativo',
            is_child: true,
          })
          .select('id')
          .single()

        if (createErr || !newChild) {
          console.error('PUT kids-links create child:', createErr)
          return NextResponse.json({ error: `Erro ao criar cadastro para "${l.child_name}"` }, { status: 500 })
        }
        childId = newChild.id
      }

      rows.push({
        adult_id: adultId,
        child_id: childId,
        relationship_type: l.relationship_type || 'Responsável',
        kids_father_name: l.kids_father_name ?? null,
        kids_mother_name: l.kids_mother_name ?? null,
        kids_father_contact: (l.relationship_type === 'Pai' ? (adultContact ?? l.kids_father_contact ?? null) : (l.kids_father_contact ?? null)),
        kids_mother_contact: (l.relationship_type === 'Mãe' ? (adultContact ?? l.kids_mother_contact ?? null) : (l.kids_mother_contact ?? null)),
        kids_guardian_kinship: l.kids_guardian_kinship ?? null,
        kids_contact_1: l.kids_contact_1 ?? null,
        kids_contact_2: l.kids_contact_2 ?? null,
        kids_disability: l.kids_disability ?? null,
        kids_favorite_toy: l.kids_favorite_toy ?? null,
        kids_calming_mechanism: l.kids_calming_mechanism ?? null,
        kids_food_restriction: l.kids_food_restriction ?? null,
        kids_language_difficulty: l.kids_language_difficulty ?? null,
        kids_noise_sensitivity: l.kids_noise_sensitivity ?? null,
        kids_material_allergy: l.kids_material_allergy ?? null,
        kids_ministry_network: l.kids_ministry_network ?? null,
        kids_medication: l.kids_medication ?? null,
        kids_health_issues: l.kids_health_issues ?? null,
        kids_bathroom_use: l.kids_bathroom_use ?? null,
      })
    }

    const { error: insError } = await supabase
      .from('people_kids_links')
      .insert(rows)

    if (insError) {
      console.error('PUT kids-links insert:', insError)
      return NextResponse.json({ error: 'Erro ao salvar vínculos' }, { status: 500 })
    }
  }

  return NextResponse.json({ ok: true })
}
