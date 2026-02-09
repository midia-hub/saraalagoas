/**
 * API Route: GET /api/gallery/[id]/files
 * Lista arquivos de uma galeria específica, sincronizando com o Drive
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { listFilesInFolder } from '@/lib/drive'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseAnonKey) {
      return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 })
    }

    const { id: galleryId } = await params
    if (!galleryId) {
      return NextResponse.json({ error: 'Gallery id required' }, { status: 400 })
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey)

    // Buscar galeria
    const { data: gallery, error: galleryError } = await supabase
      .from('galleries')
      .select('*')
      .eq('id', galleryId)
      .single()

    if (galleryError || !gallery) {
      return NextResponse.json({ error: 'Gallery not found' }, { status: 404 })
    }

    // Verificar se deve sincronizar com o Drive
    const syncParam = request.nextUrl.searchParams.get('sync')
    const shouldSync = syncParam === 'true'

    if (shouldSync) {
      try {
        // Buscar arquivos do Drive
        const driveFiles = await listFilesInFolder(gallery.drive_folder_id)

        // Buscar IDs já salvos no banco
        const { data: existingFiles } = await supabase
          .from('gallery_files')
          .select('drive_file_id')
          .eq('gallery_id', galleryId)

        const existingFileIds = new Set(existingFiles?.map((f) => f.drive_file_id) || [])

        // Inserir novos arquivos no banco
        const newFiles = driveFiles.filter((f) => !existingFileIds.has(f.id))

        if (newFiles.length > 0) {
          const fileRecords = newFiles.map((file) => ({
            gallery_id: galleryId,
            drive_file_id: file.id,
            name: file.name,
            web_view_link: file.webViewLink,
            thumbnail_link: file.thumbnailLink,
            mime_type: file.mimeType,
            created_time: file.createdTime,
          }))

          await supabase.from('gallery_files').insert(fileRecords)
        }
      } catch (driveError) {
        console.error('Drive sync error:', driveError)
        // Continuar mesmo se falhar a sincronização
      }
    }

    // Buscar arquivos do banco
    const { data: files, error: filesError } = await supabase
      .from('gallery_files')
      .select('*')
      .eq('gallery_id', galleryId)
      .order('created_time', { ascending: true })

    if (filesError) {
      return NextResponse.json({ error: 'Failed to fetch files', details: filesError }, { status: 500 })
    }

    return NextResponse.json({
      gallery: {
        id: gallery.id,
        type: gallery.type,
        title: gallery.title,
        slug: gallery.slug,
        date: gallery.date,
        description: gallery.description,
      },
      files: files || [],
    })
  } catch (error) {
    console.error('Gallery files error:', error)
    return NextResponse.json(
      {
        error: 'Failed to fetch gallery files',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
