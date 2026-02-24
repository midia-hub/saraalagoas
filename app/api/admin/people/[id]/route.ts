import { NextRequest, NextResponse } from 'next/server'
import { requireAccess } from '@/lib/admin-api'
import { createSupabaseAdminClient } from '@/lib/supabase-server'
import { personUpdateSchema } from '@/lib/validators/person'
import { normalizeCpf, normalizePhone, normalizeDate } from '@/lib/validators/person'
import { canAccessPerson, getLeadershipTree } from '@/lib/people-access'

type RouteContext = { params: Promise<{ id: string }> }

/**
 * GET /api/admin/people/[id]
 */
export async function GET(request: NextRequest, context: RouteContext) {
  const access = await requireAccess(request, { pageKey: 'pessoas', action: 'view' })
  if (!access.ok) return access.response

  const { id } = await context.params
  if (!id) {
    return NextResponse.json({ error: 'ID é obrigatório' }, { status: 400 })
  }

  const allowed = await canAccessPerson(access.snapshot, id)
  if (!allowed) {
    return NextResponse.json({ error: 'Acesso negado para esta pessoa.' }, { status: 403 })
  }

  const supabase = createSupabaseAdminClient(request)
  const { data: person, error } = await supabase
    .from('people')
    .select('*')
    .eq('id', id)
    .maybeSingle()

  if (error) {
    console.error('Erro ao buscar pessoa:', error)
    return NextResponse.json({ error: 'Erro ao buscar pessoa' }, { status: 500 })
  }
  if (!person) {
    return NextResponse.json({ error: 'Pessoa não encontrada' }, { status: 404 })
  }

  let avatarUrl: string | null = null
  try {
    const { data: linkedProfile } = await supabase
      .from('profiles')
      .select('id')
      .eq('person_id', id)
      .maybeSingle()

    if (linkedProfile?.id) {
      const { data: authUserData, error: authUserError } = await supabase.auth.admin.getUserById(linkedProfile.id)
      if (!authUserError) {
        const metadataAvatar = authUserData.user?.user_metadata?.avatar_url
        if (typeof metadataAvatar === 'string' && metadataAvatar.trim()) {
          avatarUrl = metadataAvatar.trim()
        }
      }
    }
  } catch {
    // Sem bloqueio: se não conseguir buscar avatar no Auth, retorna pessoa normalmente.
  }

  return NextResponse.json({ person: { ...person, avatar_url: avatarUrl } })
}

/**
 * PATCH /api/admin/people/[id]
 * Atualização parcial
 */
export async function PATCH(request: NextRequest, context: RouteContext) {
  const access = await requireAccess(request, { pageKey: 'pessoas', action: 'edit' })
  if (!access.ok) return access.response

  const { id } = await context.params
  if (!id) {
    return NextResponse.json({ error: 'ID é obrigatório' }, { status: 400 })
  }

  const allowed = await canAccessPerson(access.snapshot, id)
  if (!allowed) {
    return NextResponse.json({ error: 'Acesso negado para esta pessoa.' }, { status: 403 })
  }

  const body = await request.json().catch(() => ({}))
  const parsed = personUpdateSchema.safeParse(body)
  if (!parsed.success) {
    const msg = parsed.error.flatten().fieldErrors
      ? Object.values(parsed.error.flatten().fieldErrors).flat().join('; ')
      : 'Dados inválidos'
    return NextResponse.json({ error: msg }, { status: 400 })
  }

  const row = parsed.data
  const payload: Record<string, unknown> = {}

  if (row.full_name !== undefined) payload.full_name = row.full_name
  if (row.church_name !== undefined) payload.church_name = row.church_name ?? null
  if (row.church_profile !== undefined) payload.church_profile = row.church_profile
  if (row.church_situation !== undefined) payload.church_situation = row.church_situation
  if (row.church_role !== undefined) payload.church_role = row.church_role ?? null
  if (row.sex !== undefined) payload.sex = row.sex ?? null
  if (row.birth_date !== undefined) payload.birth_date = normalizeDate(row.birth_date) ?? null
  if (row.marital_status !== undefined) payload.marital_status = row.marital_status ?? null
  if (row.marriage_date !== undefined) payload.marriage_date = normalizeDate(row.marriage_date) ?? null
  if (row.rg !== undefined) payload.rg = row.rg ?? null
  if (row.rg_issuing_agency !== undefined) payload.rg_issuing_agency = row.rg_issuing_agency ?? null
  if (row.rg_uf !== undefined) payload.rg_uf = row.rg_uf ?? null
  if (row.cpf !== undefined) payload.cpf = normalizeCpf(row.cpf) ?? null
  if (row.special_needs !== undefined) payload.special_needs = row.special_needs ?? null
  if (row.cep !== undefined) payload.cep = row.cep ?? null
  if (row.city !== undefined) payload.city = row.city ?? null
  if (row.state !== undefined) payload.state = row.state ?? null
  if (row.neighborhood !== undefined) payload.neighborhood = row.neighborhood ?? null
  if (row.address_line !== undefined) payload.address_line = row.address_line ?? null
  if (row.address_number !== undefined) payload.address_number = row.address_number ?? null
  if (row.address_complement !== undefined) payload.address_complement = row.address_complement ?? null
  if (row.email !== undefined) payload.email = (row.email && String(row.email).trim()) ? String(row.email).trim() : null
  if (row.mobile_phone !== undefined) payload.mobile_phone = normalizePhone(row.mobile_phone) ?? null
  if (row.phone !== undefined) payload.phone = normalizePhone(row.phone) ?? null
  if (row.entry_by !== undefined) payload.entry_by = row.entry_by ?? null
  if (row.entry_date !== undefined) payload.entry_date = normalizeDate(row.entry_date) ?? null
  if (row.status_in_church !== undefined) payload.status_in_church = row.status_in_church ?? null
  if (row.is_new_convert !== undefined) payload.is_new_convert = row.is_new_convert ?? null
  if (row.accepted_jesus !== undefined) payload.accepted_jesus = row.accepted_jesus ?? null
  if (row.accepted_jesus_at !== undefined) payload.accepted_jesus_at = row.accepted_jesus_at ?? null
  if (row.conversion_date !== undefined) payload.conversion_date = normalizeDate(row.conversion_date) ?? null
  if (row.is_baptized !== undefined) payload.is_baptized = row.is_baptized ?? null
  if (row.baptism_date !== undefined) payload.baptism_date = normalizeDate(row.baptism_date) ?? null
  if (row.is_leader !== undefined) payload.is_leader = row.is_leader ?? null
  if (row.is_pastor !== undefined) payload.is_pastor = row.is_pastor ?? null
  if (row.education_level !== undefined) payload.education_level = row.education_level ?? null
  if (row.profession !== undefined) payload.profession = row.profession ?? null
  if (row.nationality !== undefined) payload.nationality = row.nationality ?? null
  if (row.birthplace !== undefined) payload.birthplace = row.birthplace ?? null
  if (row.origin_church !== undefined) payload.origin_church = row.origin_church ?? null
  if (row.interviewed_by !== undefined) payload.interviewed_by = row.interviewed_by ?? null
  if (row.registered_by !== undefined) payload.registered_by = row.registered_by ?? null
  if (row.blood_type !== undefined) payload.blood_type = row.blood_type ?? null
  if (row.leader_person_id !== undefined) payload.leader_person_id = row.leader_person_id ?? null
  if (row.spouse_person_id !== undefined) payload.spouse_person_id = row.spouse_person_id ?? null

  if (row.leader_person_id !== undefined) {
    const nextLeaderId = row.leader_person_id ?? null

    if (nextLeaderId === id) {
      return NextResponse.json({ error: 'A pessoa não pode ser líder dela mesma.' }, { status: 400 })
    }

    if (nextLeaderId && !access.snapshot.isAdmin) {
      const canUseAsLeader = await canAccessPerson(access.snapshot, nextLeaderId)
      if (!canUseAsLeader) {
        return NextResponse.json({ error: 'Acesso negado para definir este líder.' }, { status: 403 })
      }
    }

    if (nextLeaderId) {
      const tree = await getLeadershipTree(id)
      const descendantIds = new Set(tree.map((item) => item.id))
      if (descendantIds.has(nextLeaderId)) {
        return NextResponse.json(
          { error: 'Não é possível definir este líder pois criaria um ciclo na liderança.' },
          { status: 400 }
        )
      }
    }
  }

  // Sempre registrar quem fez a última atualização
  if (access.snapshot.displayName) {
    payload.registered_by = access.snapshot.displayName
  } else if (access.snapshot.email) {
    payload.registered_by = access.snapshot.email
  }

  if (Object.keys(payload).length === 0) {
    const supabase = createSupabaseAdminClient(request)
    const { data: person } = await supabase.from('people').select('*').eq('id', id).single()
    return NextResponse.json({ person: person || null })
  }

  const supabase = createSupabaseAdminClient(request)

  let previousSpouseId: string | null = null
  if (row.spouse_person_id !== undefined) {
    const newSpouseId = row.spouse_person_id ?? null
    if (newSpouseId === id) {
      return NextResponse.json({ error: 'A pessoa não pode ser cônjuge dela mesma.' }, { status: 400 })
    }
    if (newSpouseId && !access.snapshot.isAdmin) {
      const canAccessSpouse = await canAccessPerson(access.snapshot, newSpouseId)
      if (!canAccessSpouse) {
        return NextResponse.json({ error: 'Acesso negado para vincular este cônjuge.' }, { status: 403 })
      }
    }
    if (newSpouseId) {
      const { data: spouseRow } = await supabase.from('people').select('id, sex').eq('id', newSpouseId).maybeSingle()
      if (!spouseRow) {
        return NextResponse.json({ error: 'Cônjuge não encontrado.' }, { status: 404 })
      }
      const { data: currentRow } = await supabase.from('people').select('sex').eq('id', id).maybeSingle()
      const currentSex = currentRow?.sex
      const spouseSex = spouseRow?.sex
      if (currentSex && spouseSex) {
        const valid = (currentSex === 'Masculino' && spouseSex === 'Feminino') || (currentSex === 'Feminino' && spouseSex === 'Masculino')
        if (!valid) {
          return NextResponse.json(
            { error: 'Cônjuge deve ser do sexo oposto: homem seleciona mulher, mulher seleciona homem.' },
            { status: 400 }
          )
        }
      }
    }
    const { data: currentPerson } = await supabase.from('people').select('spouse_person_id').eq('id', id).maybeSingle()
    previousSpouseId = currentPerson?.spouse_person_id ?? null
  }

  const { data: person, error } = await supabase
    .from('people')
    .update(payload)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ error: 'CPF já cadastrado para outra pessoa.' }, { status: 409 })
    }
    console.error('Erro ao atualizar pessoa:', error)
    return NextResponse.json({ error: 'Erro ao atualizar pessoa' }, { status: 500 })
  }

  // Atualizar o outro cônjuge para manter vínculo bidirecional (e estado civil consistente)
  const newSpouseId = payload.spouse_person_id as string | null | undefined
  if (row.spouse_person_id !== undefined && person) {
    if (newSpouseId) {
      const spousePayload: Record<string, unknown> = { spouse_person_id: id }
      if (row.marital_status === 'Casado(a)') {
        spousePayload.marital_status = 'Casado(a)'
        if (payload.marriage_date) spousePayload.marriage_date = payload.marriage_date
      }
      await supabase.from('people').update(spousePayload).eq('id', newSpouseId)
    } else if (previousSpouseId) {
      await supabase.from('people').update({ spouse_person_id: null }).eq('id', previousSpouseId)
    }
  }

  // Se church_situation mudou, ban/unban o usuário vinculado
  if (payload.church_situation) {
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('person_id', id)
        .maybeSingle()

      if (profile?.id) {
        const shouldBan = payload.church_situation === 'Inativo'
        const { error: authError } = await supabase.auth.admin.updateUserById(
          profile.id,
          { ban_duration: shouldBan ? 'none' : '0' }
          // 'none' = ban permanente, '0' = remove ban
        )
        if (authError) {
          console.error(`Erro ao ${shouldBan ? 'desativar' : 'reativar'} usuário:`, authError)
        }
      }
    } catch (e) {
      console.error('Erro ao sincronizar status do usuário:', e)
    }
  }

  return NextResponse.json({ person })
}

/**
 * DELETE /api/admin/people/[id]
 */
export async function DELETE(request: NextRequest, context: RouteContext) {
  const access = await requireAccess(request, { pageKey: 'pessoas', action: 'delete' })
  if (!access.ok) return access.response

  const { id } = await context.params
  if (!id) {
    return NextResponse.json({ error: 'ID é obrigatório' }, { status: 400 })
  }

  const allowed = await canAccessPerson(access.snapshot, id)
  if (!allowed) {
    return NextResponse.json({ error: 'Acesso negado para esta pessoa.' }, { status: 403 })
  }

  const supabase = createSupabaseAdminClient(request)
  const { error } = await supabase.from('people').delete().eq('id', id)

  if (error) {
    if (error.code === '23503') {
      return NextResponse.json(
        { error: 'Não é possível excluir: pessoa está vinculada a usuário ou conversões.' },
        { status: 409 }
      )
    }
    console.error('Erro ao excluir pessoa:', error)
    return NextResponse.json({ error: 'Erro ao excluir pessoa' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
