import { NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'

const PUBLIC_CACHE_HEADERS = {
  'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
}

/** Retorna IDs das fotos mais recentes (para carrossel na página inicial). Público. */
export async function GET() {
  if (!supabaseServer) return NextResponse.json([], { headers: PUBLIC_CACHE_HEADERS })
  const { data, error } = await supabaseServer
    .from('gallery_files')
    .select('drive_file_id')
    .order('created_time', { ascending: false, nullsFirst: false })
    .limit(12)
  if (error) return NextResponse.json([], { headers: PUBLIC_CACHE_HEADERS })
  const ids = (data || []).map((r: { drive_file_id: string }) => r.drive_file_id).filter(Boolean)
  return NextResponse.json(ids, { headers: PUBLIC_CACHE_HEADERS })
}
