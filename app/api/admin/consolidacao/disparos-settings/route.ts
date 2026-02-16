import { NextRequest, NextResponse } from 'next/server'
import { requireAccess } from '@/lib/admin-api'
import { createSupabaseAdminClient } from '@/lib/supabase-server'

/**
 * GET - retorna se a API de disparos está ativa (para o painel de cadastro)
 */
export async function GET(request: NextRequest) {
  const access = await requireAccess(request, { pageKey: 'consolidacao', action: 'view' })
  if (!access.ok) return access.response

  try {
    const supabase = createSupabaseAdminClient(request)
    const { data, error } = await supabase
      .from('consolidation_settings')
      .select('disparos_api_enabled')
      .eq('id', 1)
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ disparos_api_enabled: data?.disparos_api_enabled ?? false })
  } catch (err) {
    console.error('GET disparos-settings:', err)
    return NextResponse.json({ error: 'Erro ao carregar configuração' }, { status: 500 })
  }
}

/**
 * PATCH - ativa ou desativa a API de disparos
 * Body: { disparos_api_enabled: boolean }
 */
export async function PATCH(request: NextRequest) {
  const access = await requireAccess(request, { pageKey: 'consolidacao', action: 'manage' })
  if (!access.ok) return access.response

  try {
    const body = await request.json().catch(() => ({}))
    const enabled = body.disparos_api_enabled === true

    const supabase = createSupabaseAdminClient(request)
    const { data, error } = await supabase
      .from('consolidation_settings')
      .update({ disparos_api_enabled: enabled, updated_at: new Date().toISOString() })
      .eq('id', 1)
      .select('disparos_api_enabled')
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ disparos_api_enabled: data?.disparos_api_enabled ?? false })
  } catch (err) {
    console.error('PATCH disparos-settings:', err)
    return NextResponse.json({ error: 'Erro ao salvar configuração' }, { status: 500 })
  }
}
