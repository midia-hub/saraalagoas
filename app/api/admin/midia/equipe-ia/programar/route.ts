import { NextRequest, NextResponse } from 'next/server'
import { requireAccess } from '@/lib/admin-api'
import { createSupabaseServerClient, supabaseServer } from '@/lib/supabase-server'

const BUCKET = 'equipe_ia_arts'

/**
 * POST /api/admin/midia/equipe-ia/programar
 *
 * Agenda ou publica imediatamente um post gerado pela equipe de IA.
 * Se imageUrl for uma URL temporária (ex.: OpenAI), faz download e persiste
 * no bucket Supabase antes de agendar.
 *
 * Body:
 * {
 *   imageUrl:       string   — URL pública da imagem (DALL-E ou storage)
 *   caption:        string   — legenda já pronta do Redator
 *   integrationIds: string[] — IDs das integrações Meta (meta_integrations.id)
 *   scheduledAt:    string   — ISO 8601 (pode ser agora para publicar imediatamente)
 *   postType?:      string   — "feed" | "reel" | "story" (default: "feed")
 *   destinations?:  { instagram: boolean; facebook: boolean }
 * }
 */
export async function POST(request: NextRequest) {
  const access = await requireAccess(request, { pageKey: 'instagram', action: 'create' })
  if (!access.ok) return access.response

  const body = await request.json().catch(() => ({}))

  const imageUrl       = typeof body.imageUrl === 'string'     ? body.imageUrl.trim()  : ''
  const caption        = typeof body.caption  === 'string'     ? body.caption.trim()   : ''
  const integrationIds = Array.isArray(body.integrationIds)
    ? (body.integrationIds as unknown[]).filter((id): id is string => typeof id === 'string')
    : []
  const scheduledAtRaw = typeof body.scheduledAt === 'string'  ? body.scheduledAt.trim() : ''
  const postType       = typeof body.postType    === 'string'  ? body.postType : 'feed'
  const destinations   = body.destinations && typeof body.destinations === 'object'
    ? {
        instagram: Boolean((body.destinations as { instagram?: boolean }).instagram ?? true),
        facebook:  Boolean((body.destinations as { facebook?: boolean }).facebook  ?? false),
      }
    : { instagram: true, facebook: false }

  if (!imageUrl)              return NextResponse.json({ error: 'imageUrl é obrigatório.' },                  { status: 400 })
  if (!caption)               return NextResponse.json({ error: 'caption é obrigatório.' },                   { status: 400 })
  if (!scheduledAtRaw)        return NextResponse.json({ error: 'scheduledAt é obrigatório.' },               { status: 400 })
  if (integrationIds.length === 0) return NextResponse.json({ error: 'Selecione ao menos uma conta.' },      { status: 400 })

  const scheduledAt = new Date(scheduledAtRaw)
  if (Number.isNaN(scheduledAt.getTime())) {
    return NextResponse.json({ error: 'scheduledAt é uma data inválida.' }, { status: 400 })
  }

  // ── Persistir imagem temporária no storage ───────────────────────────────────
  // URLs do OpenAI expiram; fazemos download e upload para storage permanente.
  let finalImageUrl = imageUrl

  const isTemporaryUrl =
    imageUrl.includes('oaidalleapiprodscus.blob.core.windows.net') ||
    imageUrl.includes('openai.com')

  if (isTemporaryUrl) {
    try {
      const imgRes = await fetch(imageUrl)
      if (!imgRes.ok) throw new Error(`Falha ao baixar imagem: HTTP ${imgRes.status}`)

      const buffer    = Buffer.from(await imgRes.arrayBuffer())
      const mimeType  = imgRes.headers.get('content-type') || 'image/png'
      const ext       = mimeType.includes('jpeg') ? 'jpg' : 'png'
      const fileName  = `equipe_ia_${Date.now()}.${ext}`
      const storagePath = `uploads/${fileName}`

      const { error: uploadError } = await supabaseServer.storage
        .from(BUCKET)
        .upload(storagePath, buffer, { contentType: mimeType, upsert: false })

      if (uploadError) throw new Error(`Falha no upload: ${uploadError.message}`)

      const { data: urlData } = supabaseServer.storage.from(BUCKET).getPublicUrl(storagePath)
      if (!urlData?.publicUrl) throw new Error('URL pública não gerada.')

      finalImageUrl = urlData.publicUrl
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      console.error('[programar] Upload de imagem falhou:', msg)
      return NextResponse.json(
        { error: `Não foi possível salvar a imagem permanentemente: ${msg}` },
        { status: 500 },
      )
    }
  }

  // ── Inserir em scheduled_social_posts ────────────────────────────────────────
  const db = createSupabaseServerClient(request)

  const { data, error } = await db
    .from('scheduled_social_posts')
    .insert({
      created_by:   access.snapshot.userId,
      scheduled_at: scheduledAt.toISOString(),
      instance_ids: integrationIds,
      destinations,
      post_type:    postType,
      caption,
      media_specs:  [{ url: finalImageUrl }],
      status:       'pending',
    })
    .select('id, scheduled_at, status')
    .single()

  if (error) {
    return NextResponse.json({ error: `Erro ao agendar publicação: ${error.message}` }, { status: 500 })
  }

  return NextResponse.json({ scheduled: data, imageUrl: finalImageUrl })
}
