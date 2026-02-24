import { NextRequest, NextResponse } from 'next/server'
import { requireAccess } from '@/lib/admin-api'
import { createSupabaseAdminClient } from '@/lib/supabase-server'

export interface DisparosLogEntry {
  id: string
  phone: string
  nome: string
  conversion_type: string
  status_code: number | null
  source: string
  created_at: string
}

/**
 * GET - lista os últimos registros do log de disparos (API de disparos)
 */
export async function GET(request: NextRequest) {
  const access = await requireAccess(request, { pageKey: 'consolidacao_config', action: 'view' })
  if (!access.ok) return access.response

  const limit = Math.min(Number(request.nextUrl.searchParams.get('limit')) || 100, 200)

  try {
    const supabase = createSupabaseAdminClient(request)
    const { data, error } = await supabase
      .from('disparos_log')
      .select('id, phone, nome, conversion_type, status_code, source, created_at')
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ items: (data ?? []) as DisparosLogEntry[] })
  } catch (err) {
    console.error('GET disparos-log:', err)
    return NextResponse.json({ error: 'Erro ao carregar log' }, { status: 500 })
  }
}
