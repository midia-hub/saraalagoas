import { NextRequest, NextResponse } from 'next/server'
import { requireAccess } from '@/lib/admin-api'
import { createSupabaseServerClient } from '@/lib/supabase-server'

const DRIVE_PREFIX = 'drive:'

/**
 * Publicação a partir da galeria. Cria draft, assets (source_url = drive:fileId) e jobs na fila.
 * Para não perder qualidade: ao processar, o job usa a imagem original (Drive) e envia para a rede.
 */
export async function POST(request: NextRequest) {
  const access = await requireAccess(request, { pageKey: 'galeria', action: 'view' })
  if (!access.ok) return access.response

  const body = await request.json().catch(() => ({}))
  const albumId = typeof body.albumId === 'string' ? body.albumId.trim() : ''
  const instanceIds = Array.isArray(body.instanceIds)
    ? (body.instanceIds as string[]).filter((id): id is string => typeof id === 'string')
    : []
  const text = typeof body.text === 'string' ? body.text : ''
  const mediaEdits = Array.isArray(body.mediaEdits) ? body.mediaEdits : []

  if (!albumId) {
    return NextResponse.json({ error: 'albumId é obrigatório.' }, { status: 400 })
  }
  if (instanceIds.length === 0) {
    return NextResponse.json({ error: 'Selecione ao menos uma conta em "Postar em".' }, { status: 400 })
  }
  if (mediaEdits.length === 0) {
    return NextResponse.json({ error: 'Selecione ao menos uma mídia para publicar.' }, { status: 400 })
  }

  const db = createSupabaseServerClient(request)
  const userId = access.snapshot.userId
  const now = new Date().toISOString()

  // Garantir que a galeria existe
  const { data: gallery, error: galleryError } = await db
    .from('galleries')
    .select('id')
    .eq('id', albumId)
    .maybeSingle()

  if (galleryError || !gallery) {
    return NextResponse.json({ error: 'Galeria não encontrada.' }, { status: 404 })
  }

  // Criar draft
  const { data: draft, error: draftError } = await db
    .from('instagram_post_drafts')
    .insert({
      gallery_id: albumId,
      created_by: userId,
      status: 'ready',
      caption: text,
      preset: '4:5',
      publish_mode: 'now',
      scheduled_at: null,
      created_at: now,
      updated_at: now,
    })
    .select('id')
    .single()

  if (draftError || !draft?.id) {
    return NextResponse.json(
      { error: draftError?.message ?? 'Falha ao criar o rascunho da postagem.' },
      { status: 500 }
    )
  }

  const draftId = draft.id

  // Criar assets: source_url = drive:fileId (o job run-due resolve para URL pública)
  const assetRows = mediaEdits.map((item: { id?: string }, index: number) => {
    const fileId = typeof item?.id === 'string' ? item.id.trim() : ''
    return {
      draft_id: draftId,
      source_url: fileId ? `${DRIVE_PREFIX}${fileId}` : '',
      sort_order: index,
      status: 'pending',
      created_at: now,
      updated_at: now,
    }
  }).filter((row: { source_url: string }) => row.source_url.startsWith(DRIVE_PREFIX))

  if (assetRows.length === 0) {
    await db.from('instagram_post_drafts').delete().eq('id', draftId)
    return NextResponse.json({ error: 'Nenhuma mídia válida (id de arquivo obrigatório).' }, { status: 400 })
  }

  const { error: assetsError } = await db.from('instagram_post_assets').insert(assetRows)
  if (assetsError) {
    await db.from('instagram_post_drafts').delete().eq('id', draftId)
    return NextResponse.json({ error: assetsError.message }, { status: 500 })
  }

  // Criar um job por instância (filas para cada conta)
  const jobRows = instanceIds.map((instanceId: string) => ({
    draft_id: draftId,
    instance_id: instanceId,
    status: 'queued',
    run_at: null,
    created_by: userId,
    created_at: now,
    updated_at: now,
  }))

  const { error: jobsError } = await db.from('instagram_post_jobs').insert(jobRows)
  if (jobsError) {
    return NextResponse.json({ error: jobsError.message }, { status: 500 })
  }

  // Disparar processamento imediato (run-due) para publicar agora
  const baseUrl = request.nextUrl?.origin ?? process.env.NEXT_PUBLIC_VERCEL_URL ?? process.env.VERCEL_URL
  const token = request.headers.get('authorization') || request.headers.get('Authorization')
  if (baseUrl && token) {
    try {
      await fetch(`${baseUrl}/api/admin/instagram/jobs/run-due`, {
        method: 'POST',
        headers: { Authorization: token, 'Content-Type': 'application/json' },
      })
    } catch {
      // Ignora falha ao chamar run-due; os jobs continuam na fila e podem ser processados depois
    }
  }

  return NextResponse.json({
    ok: true,
    message: 'Post enviado para a fila. Aparecerá no Painel de publicações e será publicado nas contas selecionadas.',
    draftId,
    jobCount: jobRows.length,
  })
}
