import { NextRequest, NextResponse } from 'next/server'
import { listFolderImages } from '@/lib/drive'
import { supabaseServer } from '@/lib/supabase-server'

type CacheEntry = { expiresAt: number; data: unknown[] }
const CACHE_MS = 5 * 60 * 1000
const cache = new Map<string, CacheEntry>()

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const cached = cache.get(params.id)
  if (cached && cached.expiresAt > Date.now()) {
    return NextResponse.json(cached.data)
  }

  const { data: gallery, error } = await supabaseServer
    .from('galleries')
    .select('id, drive_folder_id')
    .eq('id', params.id)
    .single()

  if (error || !gallery) return NextResponse.json({ error: 'Galeria não encontrada.' }, { status: 404 })

  const files = await listFolderImages(gallery.drive_folder_id)

  for (const file of files) {
    await supabaseServer
      .from('gallery_files')
      .upsert({
        gallery_id: gallery.id,
        drive_file_id: file.id,
        name: file.name,
        web_view_link: file.webViewLink,
        thumbnail_link: file.thumbnailLink,
        mime_type: file.mimeType,
        created_time: file.createdTime,
      }, { onConflict: 'drive_file_id' })
  }

  cache.set(params.id, { expiresAt: Date.now() + CACHE_MS, data: files })
  return NextResponse.json(files)
}

