import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-api'
import { supabaseServer } from '@/lib/supabase-server'

type PagePermissionPayload = {
  page_key: string
  can_view: boolean
  can_create: boolean
  can_edit: boolean
  can_delete: boolean
}

const FALLBACK_PAGES = [
  { key: 'dashboard', label: 'Dashboard', description: 'Visão geral do painel', sort_order: 10 },
  { key: 'configuracoes', label: 'Configurações', description: 'Configurações do site', sort_order: 20 },
  { key: 'upload', label: 'Upload', description: 'Upload de mídia', sort_order: 30 },
  { key: 'galeria', label: 'Galeria', description: 'Listagem de galerias', sort_order: 40 },
  { key: 'usuarios', label: 'Usuários', description: 'Gestão de usuários', sort_order: 50 },
  { key: 'perfis', label: 'Perfis', description: 'Gestão de perfis e permissões', sort_order: 60 },
  { key: 'instagram', label: 'Instagram', description: 'Postagens no Instagram', sort_order: 70 },
]

function normalizePermissions(input: unknown): PagePermissionPayload[] {
  if (!Array.isArray(input)) return []
  const rows: PagePermissionPayload[] = []
  for (const item of input) {
    if (!item || typeof item !== 'object') continue
    const row = item as Record<string, unknown>
    const pageKey = typeof row.page_key === 'string' ? row.page_key.trim() : ''
    if (!pageKey) continue
    rows.push({
      page_key: pageKey,
      can_view: !!row.can_view,
      can_create: !!row.can_create,
      can_edit: !!row.can_edit,
      can_delete: !!row.can_delete,
    })
  }
  return rows
}

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request)
  if (!auth.ok) return auth.response

  const { data: pagesData } = await supabaseServer
    .from('access_pages')
    .select('key, label, description, sort_order')
    .order('sort_order', { ascending: true })

  const pages = Array.isArray(pagesData) && pagesData.length > 0 ? pagesData : FALLBACK_PAGES

  const { data: profilesData, error: profilesError } = await supabaseServer
    .from('access_profiles')
    .select(
      `
      id,
      name,
      description,
      is_admin,
      is_system,
      created_at,
      access_profile_permissions (
        page_key,
        can_view,
        can_create,
        can_edit,
        can_delete
      )
    `
    )
    .order('is_admin', { ascending: false })
    .order('name', { ascending: true })

  if (profilesError) {
    return NextResponse.json({ error: profilesError.message }, { status: 500 })
  }

  const { data: usersData, error: usersError } = await supabaseServer
    .from('profiles')
    .select(
      `
      id,
      email,
      role,
      access_profile_id,
      created_at,
      access_profiles (
        id,
        name,
        is_admin
      )
    `
    )
    .order('created_at', { ascending: false })

  if (usersError) {
    return NextResponse.json({ error: usersError.message }, { status: 500 })
  }

  return NextResponse.json({
    pages,
    profiles: profilesData || [],
    users: usersData || [],
  })
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request)
  if (!auth.ok) return auth.response

  const body = await request.json().catch(() => ({}))
  const action = typeof body.action === 'string' ? body.action : ''

  if (action === 'createProfile') {
    const name = typeof body.name === 'string' ? body.name.trim() : ''
    const description = typeof body.description === 'string' ? body.description.trim() : ''
    const permissions = normalizePermissions(body.permissions)

    if (!name) return NextResponse.json({ error: 'Nome do perfil é obrigatório.' }, { status: 400 })
    if (!description) return NextResponse.json({ error: 'Descrição do perfil é obrigatória.' }, { status: 400 })
    if (!permissions.length) return NextResponse.json({ error: 'Informe ao menos uma permissão de página.' }, { status: 400 })

    const { data: createdProfile, error: createProfileError } = await supabaseServer
      .from('access_profiles')
      .insert({
        name,
        description,
        is_admin: false,
        is_system: false,
      })
      .select('id')
      .single()

    if (createProfileError || !createdProfile?.id) {
      return NextResponse.json({ error: createProfileError?.message || 'Falha ao criar perfil.' }, { status: 500 })
    }

    const insertRows = permissions.map((permission) => ({
      profile_id: createdProfile.id,
      ...permission,
    }))

    const { error: permissionError } = await supabaseServer
      .from('access_profile_permissions')
      .insert(insertRows)

    if (permissionError) {
      await supabaseServer.from('access_profiles').delete().eq('id', createdProfile.id)
      return NextResponse.json({ error: permissionError.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true, id: createdProfile.id })
  }

  if (action === 'updateProfile') {
    const profileId = typeof body.profileId === 'string' ? body.profileId : ''
    const name = typeof body.name === 'string' ? body.name.trim() : ''
    const description = typeof body.description === 'string' ? body.description.trim() : ''
    const permissions = normalizePermissions(body.permissions)

    if (!profileId) return NextResponse.json({ error: 'Perfil inválido.' }, { status: 400 })
    if (!name) return NextResponse.json({ error: 'Nome do perfil é obrigatório.' }, { status: 400 })
    if (!description) return NextResponse.json({ error: 'Descrição do perfil é obrigatória.' }, { status: 400 })
    if (!permissions.length) return NextResponse.json({ error: 'Informe ao menos uma permissão de página.' }, { status: 400 })

    const { data: currentProfile, error: currentProfileError } = await supabaseServer
      .from('access_profiles')
      .select('id, is_admin, is_system')
      .eq('id', profileId)
      .single()

    if (currentProfileError || !currentProfile) {
      return NextResponse.json({ error: 'Perfil não encontrado.' }, { status: 404 })
    }
    if (currentProfile.is_admin || currentProfile.is_system) {
      return NextResponse.json({ error: 'Perfis do sistema não podem ser alterados.' }, { status: 400 })
    }

    const { error: updateError } = await supabaseServer
      .from('access_profiles')
      .update({ name, description, updated_at: new Date().toISOString() })
      .eq('id', profileId)

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    await supabaseServer.from('access_profile_permissions').delete().eq('profile_id', profileId)
    const { error: permissionError } = await supabaseServer
      .from('access_profile_permissions')
      .insert(
        permissions.map((permission) => ({
          profile_id: profileId,
          ...permission,
        }))
      )

    if (permissionError) {
      return NextResponse.json({ error: permissionError.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  }

  if (action === 'deleteProfile') {
    const profileId = typeof body.profileId === 'string' ? body.profileId : ''
    if (!profileId) return NextResponse.json({ error: 'Perfil inválido.' }, { status: 400 })

    const { data: profileData, error: profileError } = await supabaseServer
      .from('access_profiles')
      .select('id, is_admin, is_system')
      .eq('id', profileId)
      .single()

    if (profileError || !profileData) {
      return NextResponse.json({ error: 'Perfil não encontrado.' }, { status: 404 })
    }
    if (profileData.is_admin || profileData.is_system) {
      return NextResponse.json({ error: 'Perfis do sistema não podem ser excluídos.' }, { status: 400 })
    }

    const { count: linkedUsersCount, error: countError } = await supabaseServer
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .eq('access_profile_id', profileId)

    if (countError) return NextResponse.json({ error: countError.message }, { status: 500 })
    if ((linkedUsersCount || 0) > 0) {
      return NextResponse.json(
        { error: 'Este perfil está vinculado a usuários e não pode ser removido.' },
        { status: 400 }
      )
    }

    await supabaseServer.from('access_profile_permissions').delete().eq('profile_id', profileId)
    const { error: deleteError } = await supabaseServer.from('access_profiles').delete().eq('id', profileId)
    if (deleteError) return NextResponse.json({ error: deleteError.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  }

  if (action === 'assignUserProfile') {
    const userId = typeof body.userId === 'string' ? body.userId : ''
    const profileId = typeof body.profileId === 'string' ? body.profileId : ''
    if (!userId || !profileId) {
      return NextResponse.json({ error: 'Usuário ou perfil inválido.' }, { status: 400 })
    }

    const { data: targetProfile, error: targetProfileError } = await supabaseServer
      .from('access_profiles')
      .select('id')
      .eq('id', profileId)
      .single()

    if (targetProfileError || !targetProfile) {
      return NextResponse.json({ error: 'Perfil não encontrado.' }, { status: 404 })
    }

    const { error: updateError } = await supabaseServer
      .from('profiles')
      .update({ access_profile_id: profileId, updated_at: new Date().toISOString() })
      .eq('id', userId)

    if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ error: 'Ação inválida.' }, { status: 400 })
}
