import { NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'

/** Retorna IDs das fotos mais recentes (para carrossel na página inicial). Público. */
export async function GET() {
  if (!supabaseServer) return NextResponse.json([])
  const { data, error } = await supabaseServer
    .from('gallery_files')
    .select('drive_file_id')
    .order('created_time', { ascending: false, nullsFirst: false })
    .limit(12)
  if (error) return NextResponse.json([])
  const ids = (data || []).map((r: { drive_file_id: string }) => r.drive_file_id).filter(Boolean)
  return NextResponse.json(ids)
}
