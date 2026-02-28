import { NextRequest, NextResponse } from 'next/server'
import { requireAccess } from '@/lib/admin-api'
import { createSupabaseAdminClient } from '@/lib/supabase-server'

export async function GET(request: NextRequest) {
  const access = await requireAccess(request, { pageKey: 'instagram', action: 'view' })
  if (!access.ok) return access.response

  try {
    const status = request.nextUrl.searchParams.get('status') ?? ''
    const supabase = createSupabaseAdminClient(request)

    let query = supabase
      .from('media_demands')
      .select('id, source_type, title, description, status, due_date, church_id, created_at, churches(name)')
      .order('created_at', { ascending: false })

    if (status) query = query.eq('status', status)

    const { data, error } = await query
    if (error) return NextResponse.json({ error: 'Erro ao listar demandas.' }, { status: 500 })

    const items = (data ?? []).map((row: any) => ({
      id: row.id,
      sourceType: row.source_type,
      title: row.title,
      description: row.description ?? '',
      status: row.status,
      dueDate: row.due_date ?? null,
      churchId: row.church_id,
      churchName: row.churches?.name ?? 'Sem igreja',
      createdAt: row.created_at,
    }))

    return NextResponse.json({ items })
  } catch {
    return NextResponse.json({ error: 'Erro interno ao listar demandas.' }, { status: 500 })
  }
}
