import { NextRequest, NextResponse } from 'next/server'
import { requireAccess } from '@/lib/admin-api'
import { createSupabaseServerClient } from '@/lib/supabase-server'

type DraftAssetInput = {
  source_url?: string
  sort_order?: number
}

type CreateDraftPayload = {
  galleryId?: string
  preset?: '4:5' | '3:4' | '1:1' | '1.91:1'
  assets?: DraftAssetInput[]
}

export async function POST(request: NextRequest) {
  const access = await requireAccess(request, { pageKey: 'instagram', action: 'create' })
  if (!access.ok) return access.response
  const db = createSupabaseServerClient(request)

  const body = (await request.json().catch(() => ({}))) as CreateDraftPayload
  const galleryId = typeof body.galleryId === 'string' ? body.galleryId : ''
  const preset = body.preset || '4:5'
  const assets = Array.isArray(body.assets) ? body.assets : []

  if (!galleryId) {
    return NextResponse.json({ error: 'galleryId é obrigatório.' }, { status: 400 })
  }
  if (assets.length < 1 || assets.length > 10) {
    return NextResponse.json({ error: 'Selecione entre 1 e 10 imagens.' }, { status: 400 })
  }

  const { data: draft, error: draftError } = await db
    .from('instagram_post_drafts')
    .insert({
      gallery_id: galleryId,
      created_by: access.snapshot.userId,
      status: 'draft',
      preset,
      updated_at: new Date().toISOString(),
    })
    .select('*')
    .single()

  if (draftError || !draft?.id) {
    return NextResponse.json({ error: draftError?.message || 'Erro ao criar draft.' }, { status: 500 })
  }

  const mappedAssets = assets.map((item, index) => {
    const sourceUrl = typeof item.source_url === 'string' ? item.source_url : ''
    return {
      draft_id: draft.id,
      source_url: sourceUrl,
      sort_order: typeof item.sort_order === 'number' ? item.sort_order : index,
      status: 'pending',
      updated_at: new Date().toISOString(),
    }
  })

  const { data: insertedAssets, error: assetsError } = await db
    .from('instagram_post_assets')
    .insert(mappedAssets)
    .select('*')

  if (assetsError) {
    await db.from('instagram_post_drafts').delete().eq('id', draft.id)
    return NextResponse.json({ error: assetsError.message }, { status: 500 })
  }

  return NextResponse.json({ draft, assets: insertedAssets || [] }, { status: 201 })
}
