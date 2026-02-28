import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'

export async function GET(request: NextRequest) {
  const url = new URL(request.url)
  const type = url.searchParams.get('type')
  const slug = url.searchParams.get('slug')
  const date = url.searchParams.get('date')
  const limitParam = Number(url.searchParams.get('limit') || 100)
  const limit = Number.isFinite(limitParam) ? Math.min(Math.max(limitParam, 1), 200) : 100

  let query = supabaseServer
    .from('galleries')
    .select('id, type, title, slug, date, created_at, drive_folder_id, hidden_from_public')
    .order('date', { ascending: false })
    .order('created_at', { ascending: false })

  if (type) query = query.eq('type', type)
  if (slug) query = query.eq('slug', slug)
  if (date) query = query.eq('date', date)

  const { data, error } = await query.limit(limit)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data || [], {
    headers: {
      'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
    },
  })
}

