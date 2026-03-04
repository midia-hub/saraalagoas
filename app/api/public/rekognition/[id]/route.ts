/**
 * GET /api/public/rekognition/[id]
 *
 * Versão pública (sem autenticação) do álbum de reconhecimento facial.
 * Retorna as fotos encontradas para a pessoa — apenas leitura.
 */
import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id: personId } = await context.params

  // Busca dados básicos da pessoa (sem dados sensíveis)
  const { data: person, error: personError } = await supabaseServer
    .from('rekognition_people')
    .select('id, name, reference_url')
    .eq('id', personId)
    .single()

  if (personError || !person)
    return NextResponse.json({ error: 'Não encontrado.' }, { status: 404 })

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

  const fileMap = new Map((galleryFiles ?? []).map((f) => [f.drive_file_id, f]))

  // Busca dados das galleries
  const galleryIds = [...new Set(matches.map((m) => m.gallery_id).filter(Boolean))]
  const { data: galleries } = await supabaseServer
    .from('galleries')
    .select('id, title, date, slug, type')
    .in('id', galleryIds as string[])

  const galleryMap = new Map((galleries ?? []).map((g) => [g.id, g]))

  const photos = matches.map((match) => {
    const file = fileMap.get(match.drive_file_id)
    const gallery = match.gallery_id ? galleryMap.get(match.gallery_id) : null

    return {
      driveFileId: match.drive_file_id,
      similarity: match.similarity,
      // Proxy autenticado — evita 403/429 do lh3.googleusercontent.com
      thumbnailUrl: `/api/public/drive-thumb/${match.drive_file_id}?w=400`,
      viewUrl: `/api/public/drive-thumb/${match.drive_file_id}?w=1600`,
      downloadUrl: `https://drive.google.com/uc?export=download&id=${match.drive_file_id}`,
      fileName: file?.name ?? `foto-${match.drive_file_id}.jpg`,
      gallery: gallery
        ? { id: gallery.id, title: gallery.title, date: gallery.date }
        : null,
    }
  })

  return NextResponse.json({ person, photos, total: photos.length })
}
