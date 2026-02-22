import { NextRequest, NextResponse } from 'next/server'
import { getAccessSnapshotFromRequest, hasPermission } from '@/lib/rbac'
import { supabaseServer } from '@/lib/supabase-server'

type ProfileRow = {
  id: string
  email: string | null
  full_name: string | null
  person_id: string | null
}

/**
 * POST /api/admin/users/reconcile-person-links
 * Garante que usuários do sistema possuam people + vínculo profile.person_id.
 * Body opcional: { user_id?: string }
 */
export async function POST(request: NextRequest) {
  try {
    const snapshot = await getAccessSnapshotFromRequest(request)
    if (!hasPermission(snapshot, 'usuarios', 'edit')) {
      return NextResponse.json({ error: 'Sem permissão para regularizar usuários.' }, { status: 403 })
    }

    const body = await request.json().catch(() => ({})) as { user_id?: string }
    const userId = typeof body.user_id === 'string' && body.user_id.trim() ? body.user_id.trim() : null

    let query = supabaseServer
      .from('profiles')
      .select('id, email, full_name, person_id')
      .is('person_id', null)

    if (userId) {
      query = query.eq('id', userId)
    }

    const { data: profiles, error: profilesError } = await query

    if (profilesError) {
      return NextResponse.json({ error: 'Erro ao buscar usuários sem vínculo.' }, { status: 500 })
    }

    const rows = (profiles ?? []) as ProfileRow[]
    if (rows.length === 0) {
      return NextResponse.json({ ok: true, total: 0, fixed: 0, items: [] })
    }

    const items: Array<{ user_id: string; person_id?: string; status: 'linked_existing' | 'created_and_linked' | 'failed'; error?: string }> = []

    for (const profile of rows) {
      try {
        let personId: string | null = null

        const email = (profile.email ?? '').trim()
        if (email) {
          const { data: peopleByEmail } = await supabaseServer
            .from('people')
            .select('id')
            .ilike('email', email)
            .limit(1)

          personId = peopleByEmail?.[0]?.id ?? null
        }

        if (!personId) {
          const fullName = profile.full_name?.trim() || (email ? email.split('@')[0] : 'Usuário do Sistema')
          const { data: createdPerson, error: createError } = await supabaseServer
            .from('people')
            .insert({
              full_name: fullName,
              email: email || null,
              church_profile: 'Membro',
              church_situation: 'Ativo',
            })
            .select('id')
            .single()

          if (createError || !createdPerson?.id) {
            items.push({
              user_id: profile.id,
              status: 'failed',
              error: createError?.message || 'Erro ao criar pessoa',
            })
            continue
          }

          personId = createdPerson.id

          const { error: linkError } = await supabaseServer
            .from('profiles')
            .update({ person_id: personId, updated_at: new Date().toISOString() })
            .eq('id', profile.id)

          if (linkError) {
            items.push({
              user_id: profile.id,
              status: 'failed',
              error: linkError.message || 'Erro ao vincular perfil',
            })
            continue
          }

          items.push({ user_id: profile.id, person_id: personId ?? undefined, status: 'created_and_linked' })
          continue
        }

        const { error: linkExistingError } = await supabaseServer
          .from('profiles')
          .update({ person_id: personId, updated_at: new Date().toISOString() })
          .eq('id', profile.id)

        if (linkExistingError) {
          items.push({
            user_id: profile.id,
            status: 'failed',
            error: linkExistingError.message || 'Erro ao vincular pessoa existente',
          })
          continue
        }

        items.push({ user_id: profile.id, person_id: personId ?? undefined, status: 'linked_existing' })
      } catch (error) {
        items.push({
          user_id: profile.id,
          status: 'failed',
          error: error instanceof Error ? error.message : 'Erro inesperado',
        })
      }
    }

    const fixed = items.filter((i) => i.status !== 'failed').length
    return NextResponse.json({ ok: true, total: rows.length, fixed, items })
  } catch (error) {
    console.error('POST /api/admin/users/reconcile-person-links error:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
