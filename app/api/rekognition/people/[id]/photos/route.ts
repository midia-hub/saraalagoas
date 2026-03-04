/**
 * GET  /api/rekognition/people/[id]/photos  — lista fotos de referência da pessoa
 * POST /api/rekognition/people/[id]/photos  — adiciona nova foto de referência
 */
import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'
import { requireAccess } from '@/lib/admin-api'
import { indexReferenceFace, ensureCollection } from '@/lib/rekognition'
import { checkApiQuota, checkStorageQuota, incrementUsage, REKOGNITION_LIMITS } from '@/lib/rekognition-limits'

const BUCKET = 'rekognition-references'
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const MAX_SIZE = 5 * 1024 * 1024

// ─── GET — lista fotos de referência ─────────────────────────────────────────

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const access = await requireAccess(request, { pageKey: 'galeria', action: 'view' })
  if (!access.ok) return access.response

  const { id: personId } = await context.params

  const { data, error } = await supabaseServer
    .from('rekognition_people_photos')
    .select('id, face_id, storage_path, photo_url, created_at')
    .eq('person_id', personId)
    .order('created_at', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Regenera URLs assinadas frescas a partir do storage_path.
  // O photo_url salvo no banco pode ter expirado (7 dias) ou ser uma
  // URL antiga do Google Drive (lh3.googleusercontent.com) que exige autenticação.
  const SIGNED_TTL = 60 * 60 * 24 * 30 // 30 dias
  const photos = await Promise.all(
    (data ?? []).map(async (row) => {
      if (!row.storage_path) return row
      const { data: signed } = await supabaseServer.storage
        .from(BUCKET)
        .createSignedUrl(row.storage_path, SIGNED_TTL)
      return { ...row, photo_url: signed?.signedUrl ?? row.photo_url }
    })
  )

  return NextResponse.json({ photos })
}

// ─── POST — adicionar foto de referência ─────────────────────────────────────

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const access = await requireAccess(request, { pageKey: 'galeria', action: 'create' })
  if (!access.ok) return access.response

  const { id: personId } = await context.params

  // Valida que a pessoa existe
  const { data: person, error: personError } = await supabaseServer
    .from('rekognition_people')
    .select('id, external_image_id, collection_id, status')
    .eq('id', personId)
    .single()

  if (personError || !person)
    return NextResponse.json({ error: 'Pessoa não encontrada.' }, { status: 404 })

  const formData = await request.formData().catch(() => null)
  if (!formData) return NextResponse.json({ error: 'FormData inválido.' }, { status: 400 })

  const file = formData.get('file')
  if (!(file instanceof File))
    return NextResponse.json({ error: 'Envie uma imagem.' }, { status: 400 })

  if (!ALLOWED_TYPES.includes(file.type))
    return NextResponse.json({ error: `Tipo inválido: ${file.type}. Use JPEG, PNG ou WebP.` }, { status: 400 })

  if (file.size > MAX_SIZE)
    return NextResponse.json({ error: 'A imagem deve ter no máximo 5 MB.' }, { status: 400 })

  const buffer = Buffer.from(await file.arrayBuffer())
  const storagePath = `${person.external_image_id}/extra-${Date.now()}-${file.name}`

  // Upload para Storage
  const { error: uploadError } = await supabaseServer.storage
    .from(BUCKET)
    .upload(storagePath, buffer, { contentType: file.type, upsert: false })

  if (uploadError)
    return NextResponse.json({ error: `Falha ao salvar imagem: ${uploadError.message}` }, { status: 500 })

  try {
    // URL assinada (7 dias)
    const { data: signedData } = await supabaseServer.storage
      .from(BUCKET)
      .createSignedUrl(storagePath, 60 * 60 * 24 * 7)
    const photoUrl = signedData?.signedUrl ?? null

    // Indexa rosto com o MESMO externalImageId da pessoa (Rekognition agrupa automaticamente)
    await ensureCollection(person.collection_id)
    const indexResult = await indexReferenceFace(buffer, person.external_image_id, person.collection_id)
    await incrementUsage('IndexFaces', 1)

    // Salva na tabela de fotos
    const { data: inserted, error: insertError } = await supabaseServer
      .from('rekognition_people_photos')
      .insert({
        person_id: personId,
        face_id: indexResult.faceId,
        storage_path: storagePath,
        photo_url: photoUrl,
      })
      .select('id, face_id, storage_path, photo_url, created_at')
      .single()

    if (insertError || !inserted)
      throw new Error(`Falha ao salvar: ${insertError?.message}`)

    // Atualiza status da pessoa para 'indexed' (caso estivesse com erro)
    await supabaseServer
      .from('rekognition_people')
      .update({ status: 'indexed', status_message: null, updated_at: new Date().toISOString() })
      .eq('id', personId)

    return NextResponse.json({ photo: inserted, confidence: indexResult.confidence })
  } catch (err: unknown) {
    // Remove arquivo do Storage em caso de erro
    await supabaseServer.storage.from(BUCKET).remove([storagePath]).catch(() => {})
    const message = err instanceof Error ? err.message : 'Erro desconhecido.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
