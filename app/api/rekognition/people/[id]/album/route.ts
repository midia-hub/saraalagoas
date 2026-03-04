/**
 * GET /api/rekognition/people/[id]/album
 *
 * Retorna todas as fotos onde o rosto da pessoa foi detectado,
 * enriquecidas com dados das galleries.
 */
import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'
import { requireAccess } from '@/lib/admin-api'

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const access = await requireAccess(request, { pageKey: 'galeria', action: 'view' })
  if (!access.ok) return access.response

  const { id: personId } = await context.params

  // Busca dados da pessoa
  const { data: person, error: personError } = await supabaseServer
    .from('rekognition_people')
    .select('id, name, reference_url, status, face_id, created_at')
    .eq('id', personId)
    .single()

  if (personError || !person)
    return NextResponse.json({ error: 'Pessoa não encontrada.' }, { status: 404 })

  // Busca todas as matches
  const { data: matches, error: matchesError } = await supabaseServer
    .from('rekognition_face_matches')
    .select('drive_file_id, gallery_id, similarity, created_at')
    .eq('person_id', personId)
    .order('similarity', { ascending: false })

  if (matchesError)
    return NextResponse.json({ error: matchesError.message }, { status: 500 })

  if (!matches || matches.length === 0) {
    return NextResponse.json({ person, photos: [], total: 0 })
  }

  // Enriquece com dados dos gallery_files
  const driveIds = matches.map((m) => m.drive_file_id)
  const { data: galleryFiles } = await supabaseServer
    .from('gallery_files')
    .select('drive_file_id, name, thumbnail_link, web_view_link, gallery_id')
    .in('drive_file_id', driveIds)

  const fileMap = new Map(
    (galleryFiles ?? []).map((f) => [f.drive_file_id, f])
  )

  // Busca dados das galleries (de forma única)
  const galleryIds = [...new Set(matches.map((m) => m.gallery_id).filter(Boolean))]
  const { data: galleries } = await supabaseServer
    .from('galleries')
    .select('id, title, date, slug, type')
    .in('id', galleryIds as string[])

  const galleryMap = new Map((galleries ?? []).map((g) => [g.id, g]))

  // Monta array final
  const photos = matches.map((match) => {
    const file = fileMap.get(match.drive_file_id)
    const gallery = match.gallery_id ? galleryMap.get(match.gallery_id) : null

    return {
      driveFileId: match.drive_file_id,
      similarity: match.similarity,
      matchedAt: match.created_at,
      // Usa proxy interno para evitar 429/403: o servidor faz a requisição ao
      // Drive sem os cookies do usuário, e o browser recebe a imagem cacheada.
      thumbnailUrl: `/api/drive-thumb?id=${match.drive_file_id}&sz=w480`,
      viewUrl: `https://drive.google.com/uc?export=view&id=${match.drive_file_id}`,
      webViewLink: file?.web_view_link ?? null,
      fileName: file?.name ?? match.drive_file_id,
      gallery: gallery
        ? {
            id: gallery.id,
            title: gallery.title,
            date: gallery.date,
            slug: gallery.slug,
            type: gallery.type,
          }
        : null,
    }
  })

  return NextResponse.json({ person, photos, total: photos.length })
}
