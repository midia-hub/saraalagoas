/**
 * API Route: GET /api/gallery/list
 * Lista galerias com filtros opcionais
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET(request: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseAnonKey) {
      return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 })
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey)

    // Parâmetros de filtro
    const { searchParams } = request.nextUrl
    const type = searchParams.get('type')
    const slug = searchParams.get('slug')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    // Construir query
    let query = supabase
      .from('galleries')
      .select('*, gallery_files(count)', { count: 'exact' })
      .order('date', { ascending: false })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (type) {
      query = query.eq('type', type)
    }

    if (slug) {
      query = query.eq('slug', slug)
    }

    const { data: galleries, error, count } = await query

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch galleries', details: error }, { status: 500 })
    }

    const list = galleries || []
    const galleryIds = list.map((g: { id: string }) => g.id)

    // Primeiros 5 arquivos de cada galeria (para miniaturas no grid)
    let thumbnailsByGallery: Record<string, string[]> = {}
    if (galleryIds.length > 0) {
      const { data: files } = await supabase
        .from('gallery_files')
        .select('gallery_id, drive_file_id, created_time')
        .in('gallery_id', galleryIds)
        .order('created_time', { ascending: true })

      const byGallery: Record<string, string[]> = {}
      for (const f of files || []) {
        const id = (f as { gallery_id: string }).gallery_id
        const driveId = (f as { drive_file_id: string }).drive_file_id
        if (!byGallery[id]) byGallery[id] = []
        if (byGallery[id].length < 5) byGallery[id].push(driveId)
      }
      thumbnailsByGallery = byGallery
    }

    const galleriesWithThumbnails = list.map((g: { id: string; gallery_files?: Array<{ count: number }> }) => {
      const { gallery_files, ...rest } = g
      const fileCount = gallery_files?.[0]?.count ?? 0
      return {
        ...rest,
        gallery_files: gallery_files,
        thumbnail_file_ids: thumbnailsByGallery[g.id] || [],
      }
    })

    return NextResponse.json({
      galleries: galleriesWithThumbnails,
      total: count || 0,
      limit,
      offset,
    })
  } catch (error) {
    console.error('Gallery list error:', error)
    return NextResponse.json(
      {
        error: 'Failed to list galleries',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
