/**
 * GET  /api/rekognition/people  — lista todas as pessoas cadastradas
 * POST /api/rekognition/people  — cadastra nova pessoa com imagem de referência
 */
import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'
import { requireAccess } from '@/lib/admin-api'
import { indexReferenceFace, getCollectionId, ensureCollection } from '@/lib/rekognition'
import { checkApiQuota, checkStorageQuota, incrementUsage } from '@/lib/rekognition-limits'

const BUCKET = 'rekognition-references'
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const MAX_SIZE = 5 * 1024 * 1024 // 5 MB

// ─── GET — lista pessoas ──────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const access = await requireAccess(request, { pageKey: 'galeria', action: 'view' })
  if (!access.ok) return access.response

  const { data, error } = await supabaseServer
    .from('rekognition_people')
    .select('id, name, reference_url, reference_storage_path, status, status_message, face_id, collection_id, created_at')
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Regenera URLs assinadas frescas para evitar expiração e URLs antigas do Google Drive
  const SIGNED_TTL = 60 * 60 * 24 * 30 // 30 dias
  const people = await Promise.all(
    (data ?? []).map(async (person) => {
      if (!person.reference_storage_path) return person
      const { data: signed } = await supabaseServer.storage
        .from('rekognition-references')
        .createSignedUrl(person.reference_storage_path, SIGNED_TTL)
      return { ...person, reference_url: signed?.signedUrl ?? person.reference_url }
    })
  )

  return NextResponse.json({ people })
}

// ─── POST — cadastrar pessoa ──────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  const access = await requireAccess(request, { pageKey: 'galeria', action: 'create' })
  if (!access.ok) return access.response

  const formData = await request.formData().catch(() => null)
  if (!formData) return NextResponse.json({ error: 'FormData inválido.' }, { status: 400 })

  const name = (formData.get('name') as string | null)?.trim()
  if (!name) return NextResponse.json({ error: 'Nome é obrigatório.' }, { status: 400 })

  const file = formData.get('file')
  if (!(file instanceof File))
    return NextResponse.json({ error: 'Envie uma imagem de referência.' }, { status: 400 })

  if (!ALLOWED_TYPES.includes(file.type))
    return NextResponse.json(
      { error: `Tipo de arquivo inválido: ${file.type}. Use JPEG, PNG ou WebP.` },
      { status: 400 }
    )

  if (file.size > MAX_SIZE)
    return NextResponse.json({ error: 'A imagem deve ter no máximo 5 MB.' }, { status: 400 })

  // ── Verifica limites do free tier ────────────────────────────────────────


  const storageCheck = await checkStorageQuota(1)
  if (!storageCheck.allowed)
    return NextResponse.json({ error: storageCheck.errorMessage }, { status: 429 })

  const quotaCheck = await checkApiQuota('IndexFaces', 1)
  if (!quotaCheck.allowed)
    return NextResponse.json({ error: quotaCheck.errorMessage }, { status: 429 })

  // ─────────────────────────────────────────────────────────────────────────

  const buffer = Buffer.from(await file.arrayBuffer())

  // Cria registro com status 'pending' para garantir rollback em caso de erro
  const externalImageId = `person-${Date.now()}`
  const storagePath = `${externalImageId}/${file.name}`

  const { data: person, error: insertError } = await supabaseServer
    .from('rekognition_people')
    .insert({
      name,
      collection_id: getCollectionId(),
      external_image_id: externalImageId,
      status: 'pending',
      created_by: access.snapshot.userId ?? null,
    })
    .select('id')
    .single()

  if (insertError || !person)
    return NextResponse.json(
      { error: `Falha ao criar registro: ${insertError?.message}` },
      { status: 500 }
    )

  const personId = person.id

  try {
    // Upload da imagem para Supabase Storage
    const { error: uploadError } = await supabaseServer.storage
      .from(BUCKET)
      .upload(storagePath, buffer, { contentType: file.type, upsert: false })

    if (uploadError) throw new Error(`Falha ao salvar imagem: ${uploadError.message}`)

    // URL pública assinada (7 dias — suficiente para exibição no admin)
    const { data: signedData } = await supabaseServer.storage
      .from(BUCKET)
      .createSignedUrl(storagePath, 60 * 60 * 24 * 7)

    const referenceUrl = signedData?.signedUrl ?? null

    // Garante que a collection existe e indexa o rosto
    await ensureCollection()
    const indexResult = await indexReferenceFace(buffer, externalImageId)
    await incrementUsage('IndexFaces', 1)

    // Atualiza registro com dados do Rekognition
    await supabaseServer
      .from('rekognition_people')
      .update({
        face_id: indexResult.faceId,
        reference_storage_path: storagePath,
        reference_url: referenceUrl,
        status: 'indexed',
        status_message: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', personId)

    return NextResponse.json({
      id: personId,
      name,
      faceId: indexResult.faceId,
      confidence: indexResult.confidence,
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erro desconhecido.'

    // Marca como erro mas mantém o registro
    await supabaseServer
      .from('rekognition_people')
      .update({ status: 'error', status_message: message, updated_at: new Date().toISOString() })
      .eq('id', personId)

    return NextResponse.json({ error: message }, { status: 500 })
  }
}
