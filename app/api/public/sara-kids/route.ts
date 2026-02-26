import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServiceClient } from '@/lib/supabase-server'

function normalizePhone(v?: string | null): string | null {
  if (!v) return null
  const digits = v.replace(/\D/g, '')
  return digits || null
}

function yesNoValue(val: string, detail?: string | null): string | null {
  if (!val || val === 'Não') return 'Não'
  if (val === 'Sim' && detail?.trim()) return `Sim - ${detail.trim()}`
  return 'Sim'
}

/**
 * POST /api/public/sara-kids
 * Cadastro público de criança no Sara Kids.
 * Sem autenticação — usa service role server-side.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))

    const adult = body.adult ?? {}
    const child = body.child ?? {}

    // ── Validações obrigatórias ──────────────────────────────────
    const errors: string[] = []
    if (!adult.full_name?.trim())     errors.push('Nome do responsável é obrigatório')
    if (!adult.mobile_phone?.trim())  errors.push('Celular do responsável é obrigatório')
    if (!adult.sex?.trim())           errors.push('Sexo do responsável é obrigatório')
    if (!adult.relationship_type?.trim()) errors.push('Parentesco com a criança é obrigatório')
    if (!child.child_name?.trim())    errors.push('Nome da criança é obrigatório')
    if (!child.birth_date?.trim())    errors.push('Data de nascimento da criança é obrigatória')
    if (!child.sex?.trim())           errors.push('Sexo da criança é obrigatório')

    if (errors.length > 0) {
      return NextResponse.json({ error: errors.join('; ') }, { status: 400 })
    }

    const supabase = createSupabaseServiceClient()

    // ── 1. Criar cadastro do adulto responsável ──────────────────
    const { data: adultPerson, error: adultErr } = await supabase
      .from('people')
      .insert({
        full_name: adult.full_name.trim(),
        mobile_phone: normalizePhone(adult.mobile_phone),
        email: adult.email?.trim() || null,
        sex: adult.sex || null,
        church_name: adult.church_name?.trim() || null,
        church_profile: 'Frequentador',
        church_situation: 'Ativo',
      })
      .select('id, mobile_phone, phone')
      .single()

    if (adultErr || !adultPerson) {
      console.error('sara-kids POST adult:', adultErr)
      return NextResponse.json({ error: 'Erro ao salvar responsável' }, { status: 500 })
    }

    // ── 2. Criar cadastro da criança ─────────────────────────────
    const { data: childPerson, error: childErr } = await supabase
      .from('people')
      .insert({
        full_name: child.child_name.trim(),
        birth_date: child.birth_date || null,
        sex: child.sex || null,
        church_profile: 'Frequentador',
        church_situation: 'Ativo',
      })
      .select('id')
      .single()

    if (childErr || !childPerson) {
      console.error('sara-kids POST child:', childErr)
      return NextResponse.json({ error: 'Erro ao salvar cadastro da criança' }, { status: 500 })
    }

    // ── 3. Contato do adulto para derivação automática ───────────
    const adultContact = (adultPerson.mobile_phone || adultPerson.phone || '').trim() || null
    const relType: string = adult.relationship_type || 'Responsável'

    // ── 4. Inserir vínculo ───────────────────────────────────────
    const { error: linkErr } = await supabase
      .from('people_kids_links')
      .insert({
        adult_id: adultPerson.id,
        child_id: childPerson.id,
        relationship_type: relType,
        kids_father_name: child.kids_father_name?.trim() || null,
        kids_mother_name: child.kids_mother_name?.trim() || null,
        kids_father_contact: relType === 'Pai' ? (adultContact ?? child.kids_father_contact ?? null) : (child.kids_father_contact?.trim() || null),
        kids_mother_contact: relType === 'Mãe' ? (adultContact ?? child.kids_mother_contact ?? null) : (child.kids_mother_contact?.trim() || null),
        kids_guardian_kinship: child.kids_guardian_kinship?.trim() || null,
        kids_contact_1: child.kids_contact_1?.trim() || null,
        kids_contact_2: child.kids_contact_2?.trim() || null,
        kids_disability:           yesNoValue(child.kids_disability,           child.kids_disability_detail),
        kids_food_restriction:     yesNoValue(child.kids_food_restriction,     child.kids_food_restriction_detail),
        kids_language_difficulty:  yesNoValue(child.kids_language_difficulty,  child.kids_language_difficulty_detail),
        kids_noise_sensitivity:    yesNoValue(child.kids_noise_sensitivity,    child.kids_noise_sensitivity_detail),
        kids_material_allergy:     yesNoValue(child.kids_material_allergy,     child.kids_material_allergy_detail),
        kids_ministry_network:     yesNoValue(child.kids_ministry_network,     child.kids_ministry_network_detail),
        kids_medication:           yesNoValue(child.kids_medication,           child.kids_medication_detail),
        kids_health_issues:        yesNoValue(child.kids_health_issues,        child.kids_health_issues_detail),
        kids_bathroom_use:         child.kids_bathroom_use || null,
        kids_favorite_toy:         child.kids_favorite_toy?.trim() || null,
        kids_calming_mechanism:    child.kids_calming_mechanism?.trim() || null,
      })

    if (linkErr) {
      console.error('sara-kids POST link:', linkErr)
      return NextResponse.json({ error: 'Erro ao salvar vínculo' }, { status: 500 })
    }

    return NextResponse.json({ ok: true, adult_id: adultPerson.id, child_id: childPerson.id })
  } catch (err) {
    console.error('sara-kids POST:', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
