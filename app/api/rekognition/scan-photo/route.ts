/**
 * POST /api/rekognition/scan-photo
 *
 * Varre UMA foto (drive_file_id) contra todas as pessoas indexadas.
 * Chamado automaticamente após upload de nova foto.
 *
 * Body: { drive_file_id: string, gallery_id: string }
 */
import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'
import { searchFacesInPhoto } from '@/lib/rekognition'
import { checkApiQuota, incrementUsage } from '@/lib/rekognition-limits'
import { getFileThumbnailBuffer, getFileDownloadBuffer } from '@/lib/drive'

async function getImageBuffer(driveFileId: string): Promise<Buffer | null> {
  try {
    const thumb = await getFileThumbnailBuffer(driveFileId, 640)
    if (thumb) return thumb.buffer
    const full = await getFileDownloadBuffer(driveFileId)
    return full.buffer
  } catch {
    return null
  }
}

export async function POST(request: NextRequest) {
  // Esta rota é chamada internamente pelo upload — não exposta diretamente ao público
  const secret = request.headers.get('x-internal-secret')
  const expectedSecret = process.env.INTERNAL_API_SECRET || ''
  if (expectedSecret && secret !== expectedSecret) {
    return NextResponse.json({ error: 'Não autorizado.' }, { status: 403 })
  }

  const body = await request.json().catch(() => null)
  const driveFileId: string | null = body?.drive_file_id ?? null
  const galleryId: string | null = body?.gallery_id ?? null

  if (!driveFileId) return NextResponse.json({ error: 'drive_file_id obrigatório.' }, { status: 400 })

  // Busca todas as pessoas indexadas
  const { data: people, error: peopleError } = await supabaseServer
    .from('rekognition_people')
    .select('id, external_image_id, collection_id')
    .eq('status', 'indexed')

  if (peopleError || !people || people.length === 0) {
    return NextResponse.json({ matches: 0, message: 'Nenhuma pessoa indexada.' })
  }

  // ── Cache por pessoa: pula se TODAS as pessoas já foram verificadas nesta foto ──
  // Verifica quantas das pessoas atuais já têm entrada para este drive_file_id
  const { count: cachedCount } = await supabaseServer
    .from('rekognition_person_scanned_files')
    .select('person_id', { count: 'exact', head: true })
    .eq('drive_file_id', driveFileId)
    .in('person_id', people.map((p) => p.id))

  if ((cachedCount ?? 0) >= people.length) {
    return NextResponse.json({ matches: 0, message: 'Já escaneado (cache).' })
  }

  const imageBuffer = await getImageBuffer(driveFileId)
  if (!imageBuffer) return NextResponse.json({ matches: 0, message: 'Não foi possível baixar a foto.' })

  // Verifica quota antes de chamar a API (não bloqueia o upload, apenas pula o scan)
  const quotaCheck = await checkApiQuota('SearchFacesByImage', 1)
  if (!quotaCheck.allowed) {
    console.warn('[rekognition scan-photo] Cota mensal esgotada — scan ignorado:', quotaCheck.errorMessage)
    return NextResponse.json({ matches: 0, message: 'Cota mensal esgotada.' })
  }

  // Usa a collection da primeira pessoa (todas usam a mesma collection)
  const collectionId = people[0].collection_id

  const faceMatches = await searchFacesInPhoto(imageBuffer, {
    collectionId,
    threshold: 80,
    maxFaces: 20,
  })
  await incrementUsage('SearchFacesByImage', 1)

  // Grava no cache por pessoa: marca esta foto como verificada para TODAS as pessoas atuais.
  // Quando uma nova pessoa for adicionada, a entrada dela não existirá aqui → re-scan ocorrerá
  // apenas para a nova pessoa, sem invalidar o cache das demais.
  if (people.length > 0) {
    await supabaseServer
      .from('rekognition_person_scanned_files')
      .upsert(
        people.map((p) => ({ person_id: p.id, drive_file_id: driveFileId })),
        { onConflict: 'person_id,drive_file_id', ignoreDuplicates: true }
      )
  }

  if (faceMatches.length === 0) {
    return NextResponse.json({ matches: 0 })
  }

  // Mapeia externalImageId → personId (funciona com N fotos de referência por pessoa)
  const externalIdToPerson = new Map(people.map((p) => [p.external_image_id as string, p.id]))
  let insertedCount = 0

  for (const match of faceMatches) {
    const personId = match.externalImageId ? externalIdToPerson.get(match.externalImageId) : undefined
    if (!personId) continue

    const { error } = await supabaseServer
      .from('rekognition_face_matches')
      .upsert(
        {
          person_id: personId,
          drive_file_id: driveFileId,
          gallery_id: galleryId,
          similarity: Math.round(match.similarity * 100) / 100,
        },
        { onConflict: 'person_id,drive_file_id', ignoreDuplicates: true }
      )

    if (!error) insertedCount++
  }

  return NextResponse.json({ matches: insertedCount })
}
