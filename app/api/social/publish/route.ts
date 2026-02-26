import { NextRequest, NextResponse } from 'next/server'
import { requireAccess } from '@/lib/admin-api'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { executeMetaPublish, type MediaEditInput } from '@/lib/publish-meta'

const DRIVE_PREFIX = 'drive:'

type MetaSelection = { type: 'instagram' | 'facebook'; integrationId: string }

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
  const destinations = body.destinations && typeof body.destinations === 'object'
    ? { 
        instagram: Boolean(body.destinations.instagram), 
        facebook: Boolean(body.destinations.facebook) 
      }
    : { instagram: true, facebook: false }
  const text = typeof body.text === 'string' ? body.text : ''
  const mediaEdits = Array.isArray(body.mediaEdits) ? (body.mediaEdits as MediaEditInput[]) : []
  const isUuid = (value: string) =>
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
  const extractIntegrationId = (rawValue: string): string => {
    let value = rawValue.trim()
    while (value.startsWith('meta_ig:') || value.startsWith('meta_fb:')) {
      value = value.slice(value.indexOf(':') + 1).trim()
    }
    return isUuid(value) ? value : ''
  }
  const scheduledAtRaw = body.scheduled_at
  const scheduledAt =
    typeof scheduledAtRaw === 'string' && scheduledAtRaw.trim()
      ? new Date(scheduledAtRaw.trim())
      : null
  const isScheduling = scheduledAt != null && !Number.isNaN(scheduledAt.getTime()) && scheduledAt.getTime() > Date.now()

  if (!albumId) {
    return NextResponse.json({ error: 'albumId é obrigatório.' }, { status: 400 })
  }
  if (instanceIds.length === 0) {
    return NextResponse.json({ error: 'Selecione ao menos uma conta em "Postar em".' }, { status: 400 })
  }
  if (mediaEdits.length === 0) {
    return NextResponse.json({ error: 'Selecione ao menos uma mídia para publicar.' }, { status: 400 })
  }
  if (!destinations.instagram && !destinations.facebook) {
    return NextResponse.json({ error: 'Escolha pelo menos uma plataforma para fazer a postagem.' }, { status: 400 })
  }

  const db = createSupabaseServerClient(request)
  const userId = access.snapshot.userId
  const now = new Date().toISOString()

  const mediaFileIds = mediaEdits
    .map((item: { id?: string }) => (typeof item?.id === 'string' ? item.id.trim() : ''))
    .filter(Boolean)
  const mediaEditsById = new Map<string, MediaEditInput>()
  for (const item of mediaEdits) {
    const id = typeof item?.id === 'string' ? item.id.trim() : ''
    if (id) mediaEditsById.set(id, item)
  }
  if (mediaFileIds.length === 0) {
    return NextResponse.json({ error: 'Nenhuma mídia válida (id de arquivo obrigatório).' }, { status: 400 })
  }

  // Extrair IDs de integração e criar seleções baseadas em destinations
  const integrationIds = instanceIds.map(extractIntegrationId).filter(Boolean)
  
  const uniqueIntegrationIds = Array.from(new Set(integrationIds))
  if (uniqueIntegrationIds.length === 0) {
    return NextResponse.json(
      { error: 'IDs de integrações Meta inválidos para publicação.' },
      { status: 400 }
    )
  }
  
  // Criar seleções Meta baseadas nos destinations
  const metaSelections: MetaSelection[] = []
  for (const integrationId of uniqueIntegrationIds) {
    if (destinations.instagram) {
      metaSelections.push({ type: 'instagram', integrationId })
    }
    if (destinations.facebook) {
      metaSelections.push({ type: 'facebook', integrationId })
    }
  }
  
  console.log('[publish] Destinations:', destinations)
  console.log('[publish] Meta Selections:', metaSelections)
  console.log('[publish] Integration IDs:', uniqueIntegrationIds)

  // Garantir que a galeria existe
  const { data: gallery, error: galleryError } = await db
    .from('galleries')
    .select('id')
    .eq('id', albumId)
    .maybeSingle()

  if (galleryError || !gallery) {
    return NextResponse.json({ error: 'Não conseguimos localizar a galeria.' }, { status: 404 })
  }

  const legacyInstanceIds = instanceIds.filter((id) => !extractIntegrationId(id))
  if (legacyInstanceIds.length > 0) {
    return NextResponse.json(
      { error: 'Somente integrações Meta são aceitas para publicação.' },
      { status: 400 }
    )
  }

  // Programar postagem: gravar em scheduled_social_posts e retornar
  if (isScheduling && instanceIds.length > 0) {
    const mediaSpecs = mediaEdits
      .filter((item: { id?: string }) => typeof item?.id === 'string' && (item.id as string).trim())
      .map((item: MediaEditInput) => ({
        id: (item.id as string).trim(),
        cropMode: item.cropMode || 'original',
        altText: typeof item.altText === 'string' ? item.altText : '',
      }))
    const { data: scheduled, error: scheduledError } = await db
      .from('scheduled_social_posts')
      .insert({
        album_id: albumId,
        created_by: userId,
        scheduled_at: scheduledAt.toISOString(),
        instance_ids: uniqueIntegrationIds,
        destinations: { instagram: destinations.instagram, facebook: destinations.facebook },
        caption: text,
        media_specs: mediaSpecs,
        status: 'pending',
        created_at: now,
        updated_at: now,
      })
      .select('id, scheduled_at')
      .single()

    if (scheduledError || !scheduled) {
      return NextResponse.json(
        { error: scheduledError?.message ?? 'Houve um erro ao tentar agendar a postagem. Tente novamente.' },
        { status: 500 }
      )
    }
    return NextResponse.json({
      ok: true,
      scheduled: true,
      scheduledAt: (scheduled as { scheduled_at: string }).scheduled_at,
      id: (scheduled as { id: string }).id,
      message: `Postagem programada para ${new Date((scheduled as { scheduled_at: string }).scheduled_at).toLocaleString('pt-BR')}.`,
    })
  }

  let draftId: string | null = null
  let jobCount = 0

  // Fluxo legado: mantém fila/jobs para instâncias da tabela instagram_instances.
  if (legacyInstanceIds.length > 0) {
    const { data: ownedLegacyRows, error: ownedLegacyError } = await db
      .from('instagram_instances')
      .select('id')
      .in('id', legacyInstanceIds)
      .eq('created_by', userId)
    if (ownedLegacyError) {
      return NextResponse.json({ error: ownedLegacyError.message }, { status: 500 })
    }
    const ownedLegacyIds = new Set((ownedLegacyRows || []).map((row) => row.id as string))
    const invalidLegacyIds = legacyInstanceIds.filter((id) => !ownedLegacyIds.has(id))
    if (invalidLegacyIds.length > 0) {
      return NextResponse.json(
        { error: 'Uma ou mais instâncias selecionadas não pertencem ao usuário atual.' },
        { status: 403 }
      )
    }

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

    draftId = draft.id

    const assetRows = mediaFileIds.map((fileId: string, index: number) => ({
      draft_id: draftId,
      source_url: `${DRIVE_PREFIX}${fileId}`,
      sort_order: index,
      status: 'pending',
      created_at: now,
      updated_at: now,
    }))

    const { error: assetsError } = await db.from('instagram_post_assets').insert(assetRows)
    if (assetsError) {
      await db.from('instagram_post_drafts').delete().eq('id', draftId)
      return NextResponse.json({ error: assetsError.message }, { status: 500 })
    }

    const jobRows = legacyInstanceIds.map((instanceId: string) => ({
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
    jobCount = jobRows.length

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
  }

  // Fluxo Meta: publica imediatamente para as instâncias virtuais (Instagram/Facebook via OAuth Meta).
  let metaResults: Array<{ instanceId: string; provider: 'instagram' | 'facebook'; ok: boolean; error?: string }> = []
  if (metaSelections.length > 0) {
    const result = await executeMetaPublish({
      db,
      userId,
      albumId,
      instanceIds: uniqueIntegrationIds,
      destinations,
      text,
      mediaEdits,
    })
    metaResults = result.metaResults
  }

  const metaSuccess = metaResults.filter((r) => r.ok).length
  const metaFailed = metaResults.length - metaSuccess

  let message = ''
  if (jobCount > 0) {
    message += `Post enviado para fila em ${jobCount} instância(s) legado. `
  }
  if (metaResults.length > 0) {
    const platformsPublished = []
    if (destinations.instagram && metaResults.some(r => r.provider === 'instagram' && r.ok)) {
      platformsPublished.push('Instagram')
    }
    if (destinations.facebook && metaResults.some(r => r.provider === 'facebook' && r.ok)) {
      platformsPublished.push('Facebook')
    }
    
    message += `Publicação Meta: ${metaSuccess} sucesso(s), ${metaFailed} falha(s). `
    if (platformsPublished.length > 0) {
      message += `Publicado em: ${platformsPublished.join(' e ')}. `
    }
    if (mediaFileIds.length > 1) {
      message += `${mediaFileIds.length} ${mediaFileIds.length === 1 ? 'imagem' : 'imagens'}.`
    } else {
      message += '1 imagem.'
    }
  }
  if (!message) {
    message = 'Nenhuma instância válida encontrada para publicação.'
  }

  if (metaResults.length > 0) {
    const metaErrors = metaResults.filter((r) => !r.ok).map((r) => r.error).filter(Boolean)
    const hasSuccess = metaResults.some((r) => r.ok)
    const mediaSpecs = mediaEdits
      .filter((item: { id?: string }) => typeof item?.id === 'string' && (item.id as string).trim())
      .map((item: MediaEditInput) => ({
        id: (item.id as string).trim(),
        cropMode: item.cropMode || 'original',
        altText: typeof item.altText === 'string' ? item.altText : '',
      }))
    const { error: logError } = await db.from('scheduled_social_posts').insert({
      album_id: albumId,
      created_by: userId,
      scheduled_at: now,
      instance_ids: uniqueIntegrationIds,
      destinations: { instagram: destinations.instagram, facebook: destinations.facebook },
      caption: text,
      media_specs: mediaSpecs,
      status: hasSuccess ? 'published' : 'failed',
      published_at: hasSuccess ? now : null,
      error_message: metaErrors.length > 0 ? metaErrors.join('; ') : null,
      created_at: now,
      updated_at: now,
    })
    if (logError) {
      console.error('[publish] falha ao registrar log da postagem imediata:', logError.message)
    }
  }

  console.log('[publish] Final results:', {
    metaSuccess,
    metaFailed,
    metaResults,
    destinations,
  })

  return NextResponse.json({
    ok: metaFailed === 0,
    message: message.trim(),
    draftId,
    jobCount,
    metaResults,
    mediaCount: mediaFileIds.length,
    destinations, // Retornar para debug no frontend
  })
}
