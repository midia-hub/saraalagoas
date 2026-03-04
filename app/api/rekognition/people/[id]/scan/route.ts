/**
 * POST /api/rekognition/people/[id]/scan
 *
 * Varre fotos da galeria procurando o rosto da pessoa.
 * Estratégia de economia máxima:
 *   - SearchFacesByImage já retorna matches para TODAS as pessoas da collection.
 *   - Ao escanear uma foto, salvamos resultados para TODAS as pessoas encontradas.
 *   - Marcamos o cache para TODAS as pessoas indexadas — não só a pessoa atual.
 *   - Resultado: escanear para Frank também cobre Betânia; adicionar uma nova
 *     pessoa só exige escanear fotos ainda não cobertas por ela, sem re-escanear
 *     fotos que já têm cache para outras pessoas.
 */
import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'
import { requireAccess } from '@/lib/admin-api'
import { searchFacesInPhoto } from '@/lib/rekognition'
import { checkApiQuota, REKOGNITION_LIMITS } from '@/lib/rekognition-limits'
import { getFileDownloadBuffer, getFileThumbnailBuffer, listFolderImages } from '@/lib/drive'

// Busca thumbnail (menor); se não existir baixa o arquivo original
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

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const access = await requireAccess(request, { pageKey: 'galeria', action: 'create' })
  if (!access.ok) return access.response

  const { id: personId } = await context.params

  // Valida que a pessoa existe e está indexada
  const { data: person, error: personError } = await supabaseServer
    .from('rekognition_people')
    .select('id, name, face_id, external_image_id, collection_id, status')
    .eq('id', personId)
    .single()

  if (personError || !person)
    return NextResponse.json({ error: 'Pessoa não encontrada.' }, { status: 404 })

  if (person.status !== 'indexed' || !person.face_id)
    return NextResponse.json(
      { error: 'Esta pessoa ainda não foi indexada no Rekognition. Aguarde ou recadastre a imagem de referência.' },
      { status: 400 }
    )

  // Carrega TODAS as pessoas indexadas para aproveitar os resultados do SearchFacesByImage
  // (a API já retorna matches para toda a collection — não desperdiçamos chamadas)
  const { data: allPeople } = await supabaseServer
    .from('rekognition_people')
    .select('id, external_image_id')
    .eq('status', 'indexed')
    .eq('collection_id', person.collection_id)

  const allPeopleList = allPeople ?? []
  // Mapa externalImageId → { id, external_image_id } para todas as pessoas
  const extIdToPersonId = new Map(allPeopleList.map((p) => [p.external_image_id as string, p.id]))

  // Busca todas as fotos da galeria que ainda não foram analisadas para esta pessoa
  const body = await request.json().catch(() => null)
  const galleryId: string | null = (body as Record<string, unknown> | null)?.gallery_id as string | null ?? null
  /** force=true ignora o cache — útil após adicionar nova pessoa de referência */
  const force: boolean = Boolean((body as Record<string, unknown> | null)?.force) ?? false

  let query = supabaseServer
    .from('gallery_files')
    .select('id, drive_file_id, gallery_id')
    .order('created_at', { ascending: false })

  if (galleryId) {
    query = query.eq('gallery_id', galleryId)
  }

  // Limita a MAX_SCAN_PHOTOS_PER_CALL fotos por chamada (free tier)
  const { data: initialFiles, error: filesError } = await query.limit(REKOGNITION_LIMITS.MAX_SCAN_PHOTOS_PER_CALL)

  if (filesError)
    return NextResponse.json({ error: `Falha ao buscar fotos: ${filesError.message}` }, { status: 500 })

  let files = initialFiles

  // Se não há arquivos no banco para o álbum selecionado, sincroniza do Drive antes de continuar
  if ((!files || files.length === 0) && galleryId) {
    try {
      const { data: gallery } = await supabaseServer
        .from('galleries')
        .select('id, drive_folder_id')
        .eq('id', galleryId)
        .single()

      if (gallery?.drive_folder_id) {
        const driveFiles = await listFolderImages(gallery.drive_folder_id)
        if (driveFiles.length > 0) {
          const payload = driveFiles.map((f) => ({
            gallery_id: gallery.id,
            drive_file_id: f.id,
            name: f.name,
            web_view_link: f.webViewLink ?? null,
            thumbnail_link: f.thumbnailLink ?? null,
            mime_type: f.mimeType,
            created_time: f.createdTime ?? null,
          }))
          await supabaseServer
            .from('gallery_files')
            .upsert(payload, { onConflict: 'gallery_id,drive_file_id' })
        }
        // Re-executa a query após o sync
        const { data: refreshed, error: refreshErr } = await supabaseServer
          .from('gallery_files')
          .select('id, drive_file_id, gallery_id')
          .eq('gallery_id', galleryId)
          .order('created_at', { ascending: false })
          .limit(REKOGNITION_LIMITS.MAX_SCAN_PHOTOS_PER_CALL)
        if (!refreshErr && refreshed) {
          files = refreshed
        }
      }
    } catch (syncErr) {
      console.error('[rekognition scan] Erro ao sincronizar galeria do Drive:', syncErr)
    }
  }

  if (!files || files.length === 0)
    return NextResponse.json({ scanned: 0, matched: 0, errors: 0 })

  // ── Cache por pessoa: pula fotos já escaneadas especificamente para esta pessoa ──
  // Cada pessoa tem seu próprio histórico de scans — adicionar uma nova pessoa
  // não invalida o cache das demais, evitando re-escaneamentos desnecessários.
  const driveIds = files.map((f) => f.drive_file_id)

  let alreadyScannedSet = new Set<string>()
  if (!force) {
    const { data: cachedForPerson } = await supabaseServer
      .from('rekognition_person_scanned_files')
      .select('drive_file_id')
      .eq('person_id', personId)
      .in('drive_file_id', driveIds)

    alreadyScannedSet = new Set((cachedForPerson ?? []).map((r) => r.drive_file_id))
  }

  const cacheHits = alreadyScannedSet.size

  // Fotos ainda não escaneadas para esta pessoa
  let toProcess = files.filter((f) => !alreadyScannedSet.has(f.drive_file_id))

  // Verifica quota mensal e limita o lote ao que ainda cabe
  const quotaCheck = await checkApiQuota('SearchFacesByImage', 1)
  if (!quotaCheck.allowed) {
    return NextResponse.json(
      { error: quotaCheck.errorMessage, scanned: 0, matched: 0, errors: 0, skipped: files.length },
      { status: 429 }
    )
  }
  // Reduz lote se não houver cota suficiente para todos
  if (toProcess.length > quotaCheck.usage.remaining) {
    toProcess = toProcess.slice(0, quotaCheck.usage.remaining)
  }

  let scanned = 0
  let matched = 0
  let errors = 0

  const BATCH = 5 // paralelismo conservador para não sobrecarregar Drive e Rekognition

  for (let i = 0; i < toProcess.length; i += BATCH) {
    const batch = toProcess.slice(i, i + BATCH)

    await Promise.all(
      batch.map(async (file) => {
        try {
          const imageBuffer = await getImageBuffer(file.drive_file_id)
          if (!imageBuffer) {
            errors++
            return
          }

          const faceMatches = await searchFacesInPhoto(imageBuffer, {
            collectionId: person.collection_id,
            threshold: 80,
          })

          scanned++

          // Marca cache para TODAS as pessoas indexadas (esta foto já foi verificada para todas)
          // Escanear para Frank também cobre Betânia — zero chamadas redundantes no futuro
          if (allPeopleList.length > 0) {
            await supabaseServer
              .from('rekognition_person_scanned_files')
              .upsert(
                allPeopleList.map((p) => ({ person_id: p.id, drive_file_id: file.drive_file_id })),
                { onConflict: 'person_id,drive_file_id', ignoreDuplicates: true }
              )
          }

          // Salva matches para TODAS as pessoas encontradas (não só a pessoa atual)
          for (const match of faceMatches) {
            if (!match.externalImageId) continue
            const matchedPersonId = extIdToPersonId.get(match.externalImageId)
            if (!matchedPersonId) continue

            await supabaseServer
              .from('rekognition_face_matches')
              .upsert(
                {
                  person_id: matchedPersonId,
                  drive_file_id: file.drive_file_id,
                  gallery_id: file.gallery_id,
                  similarity: Math.round(match.similarity * 100) / 100,
                },
                { onConflict: 'person_id,drive_file_id', ignoreDuplicates: true }
              )

            if (matchedPersonId === personId) matched++
          }
        } catch (err) {
          console.error('[rekognition scan] Erro em', file.drive_file_id, err)
          errors++
        }
      })
    )
  }

  return NextResponse.json({
    scanned,
    matched,
    errors,
    skipped: files.length - toProcess.length - cacheHits,
    cacheHits,
    total: files.length,
    quota: {
      remaining: Math.max(0, quotaCheck.usage.remaining - scanned),
      limit: REKOGNITION_LIMITS.FREE_TIER_API_CALLS_PER_MONTH,
    },
  })
}
