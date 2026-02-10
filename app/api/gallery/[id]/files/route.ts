import { NextRequest, NextResponse } from 'next/server'
import { listFolderImages } from '@/lib/drive'
import { supabaseServer } from '@/lib/supabase-server'
import {
  getCachedFiles,
  setCachedFiles,
} from '@/lib/gallery-files-cache'

/** Formato esperado pelo frontend (compatível com DriveImageFile). */
type FileItem = {
  id: string
  name: string
  mimeType: string
  webViewLink: string | null
  thumbnailLink: string | null
  createdTime: string | null
  viewUrl: string
}

function rowToFileItem(row: {
  drive_file_id: string
  name: string
  mime_type: string
  web_view_link: string | null
  thumbnail_link: string | null
  created_time: string | null
}): FileItem {
  return {
    id: row.drive_file_id,
    name: row.name,
    mimeType: row.mime_type,
    webViewLink: row.web_view_link,
    thumbnailLink: row.thumbnail_link,
    createdTime: row.created_time,
    viewUrl: `https://drive.google.com/uc?export=view&id=${row.drive_file_id}`,
  }
}

/** Busca arquivos apenas do Supabase (fallback quando o Drive falha). */
async function getFilesFromDb(galleryId: string): Promise<FileItem[]> {
  const { data, error } = await supabaseServer
    .from('gallery_files')
    .select('drive_file_id, name, mime_type, web_view_link, thumbnail_link, created_time')
    .eq('gallery_id', galleryId)
    .order('created_time', { ascending: false })

  if (error) return []
  return (data || []).map(rowToFileItem)
}

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> | { id: string } }
) {
  const params = await Promise.resolve(context.params)
  const galleryId = params.id

  const cached = getCachedFiles(galleryId)
  if (cached) return NextResponse.json(cached)

  const { data: gallery, error } = await supabaseServer
    .from('galleries')
    .select('id, drive_folder_id')
    .eq('id', galleryId)
    .single()

  if (error || !gallery) {
    return NextResponse.json({ error: 'Galeria não encontrada.' }, { status: 404 })
  }

  try {
    const files = await listFolderImages(gallery.drive_folder_id)

    for (const file of files) {
      const { error: upsertError } = await supabaseServer
        .from('gallery_files')
        .upsert(
          {
            gallery_id: gallery.id,
            drive_file_id: file.id,
            name: file.name,
            web_view_link: file.webViewLink,
            thumbnail_link: file.thumbnailLink,
            mime_type: file.mimeType,
            created_time: file.createdTime,
          },
          { onConflict: 'drive_file_id' }
        )
      if (upsertError) {
        console.warn('[gallery/files] upsert error for', file.id, upsertError.message)
      }
    }

    setCachedFiles(galleryId, files)
    return NextResponse.json(files)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[gallery/files] Drive error, using DB fallback:', message)

    const fallback = await getFilesFromDb(galleryId)
    setCachedFiles(galleryId, fallback)
    return NextResponse.json(fallback)
  }
}

