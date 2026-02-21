import { NextRequest, NextResponse } from 'next/server'
import { requireAccess } from '@/lib/admin-api'
import { createSupabaseAdminClient } from '@/lib/supabase-server'

/**
 * GET /api/admin/dashboard/stats
 * Retorna estatísticas resumidas por módulo.
 * Cada bloco só é calculado se o usuário tiver permissão de visualização no módulo.
 */
export async function GET(request: NextRequest) {
  const access = await requireAccess(request, { pageKey: 'dashboard', action: 'view' })
  if (!access.ok) return access.response

  const { snapshot } = access
  const perms = snapshot.permissions ?? {}
  const isAdmin = snapshot.isAdmin

  const can = (...keys: string[]) =>
    isAdmin || keys.some((k) => perms[k]?.view || perms[k]?.manage)

  const supabase = createSupabaseAdminClient(request)

  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString()
  const todayStr = now.toISOString().slice(0, 10)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tasks: Array<{ key: string; field: string; query: () => PromiseLike<any> } | null> = [
    can('consolidacao')
      ? { key: 'consolidacao', field: 'conversoes_mes', query: () => supabase.from('conversoes').select('id', { count: 'exact', head: true }).gte('created_at', startOfMonth) }
      : null,
    can('consolidacao')
      ? { key: 'consolidacao', field: 'acompanhamentos_pendentes', query: () => supabase.from('consolidacao_followups').select('id', { count: 'exact', head: true }).is('completed_at', null) }
      : null,
    can('pessoas')
      ? { key: 'pessoas', field: 'total', query: () => supabase.from('people').select('id', { count: 'exact', head: true }) }
      : null,
    can('pessoas')
      ? { key: 'pessoas', field: 'novos_mes', query: () => supabase.from('people').select('id', { count: 'exact', head: true }).gte('created_at', startOfMonth) }
      : null,
    can('celulas')
      ? { key: 'celulas', field: 'celulas_ativas', query: () => supabase.from('cells').select('id', { count: 'exact', head: true }).eq('is_active', true) }
      : null,
    can('celulas')
      ? { key: 'celulas', field: 'total_membros', query: () => supabase.from('cell_members').select('id', { count: 'exact', head: true }) }
      : null,
    can('revisao_vidas')
      ? { key: 'revisao_vidas', field: 'eventos_ativos', query: () => supabase.from('revisao_vidas_events').select('id', { count: 'exact', head: true }).eq('active', true) }
      : null,
    can('revisao_vidas')
      ? { key: 'revisao_vidas', field: 'inscricoes_30d', query: () => supabase.from('revisao_vidas_registrations').select('id', { count: 'exact', head: true }).gte('created_at', thirtyDaysAgo) }
      : null,
    can('livraria_dashboard', 'livraria_vendas')
      ? { key: 'livraria', field: '__sales_data', query: () => supabase.from('bookstore_sales').select('total_amount', { count: 'exact' }).eq('status', 'PAID').gte('created_at', startOfMonth) }
      : null,
    can('livraria_dashboard', 'livraria_produtos')
      ? { key: 'livraria', field: 'produtos_estoque_baixo', query: () => supabase.from('bookstore_products').select('id', { count: 'exact', head: true }).eq('active', true).lte('current_stock', 5) }
      : null,
    can('galeria')
      ? { key: 'galeria', field: 'total_galerias', query: () => supabase.from('galleries').select('id', { count: 'exact', head: true }) }
      : null,
    can('galeria')
      ? { key: 'galeria', field: 'total_fotos', query: () => supabase.from('gallery_files').select('id', { count: 'exact', head: true }) }
      : null,
    can('usuarios')
      ? { key: 'usuarios', field: 'total_usuarios', query: () => supabase.from('profiles').select('id', { count: 'exact', head: true }) }
      : null,
    can('instagram')
      ? { key: 'instagram', field: 'integracoes_ativas', query: () => supabase.from('meta_integrations').select('id', { count: 'exact', head: true }).eq('is_active', true) }
      : null,
    can('lideranca', 'cultos')
      ? { key: 'cultos', field: 'presencas_hoje', query: () => supabase.from('worship_attendance').select('id', { count: 'exact', head: true }).eq('attended_on', todayStr) }
      : null,
    can('lideranca', 'cultos')
      ? { key: 'cultos', field: 'cultos_ativos', query: () => supabase.from('worship_services').select('id', { count: 'exact', head: true }).eq('active', true) }
      : null,
  ]

  const activeTasks = tasks.filter(Boolean) as NonNullable<(typeof tasks)[number]>[]
  const settled = await Promise.allSettled(activeTasks.map((t) => Promise.resolve(t.query())))

  const result: Record<string, Record<string, unknown>> = {}

  activeTasks.forEach((task, i) => {
    const outcome = settled[i]
    if (outcome.status !== 'fulfilled') return
    const { key, field } = task
    if (!result[key]) result[key] = {}

    if (field === '__sales_data') {
      const r = outcome.value as { data?: Array<{ total_amount: string | number }> | null; count?: number | null }
      result[key]['vendas_mes'] = r.count ?? null
      result[key]['receita_mes'] = r.data
        ? r.data.reduce((s, row) => s + Number(row.total_amount || 0), 0)
        : null
    } else {
      const r = outcome.value as { count?: number | null }
      result[key][field] = r.count ?? null
    }
  })

  return NextResponse.json(result)
}
