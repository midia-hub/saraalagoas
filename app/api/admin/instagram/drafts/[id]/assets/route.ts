import { NextRequest, NextResponse } from 'next/server'
import { requireAccess } from '@/lib/admin-api'
import { createSupabaseServerClient } from '@/lib/supabase-server'

type AssetUpdate = {
  id?: string
  sort_order?: number
  storage_path?: string | null
  final_url?: string | null
  width?: number | null
  height?: number | null
  status?: 'pending' | 'processed' | 'failed'
  error_message?: string | null
}

type UpdatePayload = {
  assets?: AssetUpdate[]
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const access = await requireAccess(request, { pageKey: 'instagram', action: 'edit' })
  if (!access.ok) return access.response
  const db = createSupabaseServerClient(request)

  const body = (await request.json().catch(() => ({}))) as UpdatePayload
  const assets = Array.isArray(body.assets) ? body.assets : []
  if (!assets.length) return NextResponse.json({ error: 'Lista de assets vazia.' }, { status: 400 })

  const updates = assets
    .filter((asset) => typeof asset.id === 'string' && asset.id)
    .map((asset) => ({
      id: asset.id as string,
      draft_id: params.id,
      sort_order: typeof asset.sort_order === 'number' ? asset.sort_order : 0,
      storage_path: asset.storage_path ?? null,
      final_url: asset.final_url ?? null,
      width: typeof asset.width === 'number' ? asset.width : null,
      height: typeof asset.height === 'number' ? asset.height : null,
      status: asset.status || 'processed',
      error_message: asset.error_message ?? null,
      updated_at: new Date().toISOString(),
    }))

  const { data, error } = await db
    .from('instagram_post_assets')
    .upsert(updates, { onConflict: 'id' })
    .select('*')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data || [])
}
