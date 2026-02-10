import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'

export async function GET(request: NextRequest) {
  const url = new URL(request.url)
  const type = url.searchParams.get('type')
  const slug = url.searchParams.get('slug')
  const date = url.searchParams.get('date')

  let query = supabaseServer
    .from('galleries')
    .select('*')
    .order('date', { ascending: false })
    .order('created_at', { ascending: false })

  if (type) query = query.eq('type', type)
  if (slug) query = query.eq('slug', slug)
  if (date) query = query.eq('date', date)

  const { data, error } = await query.limit(100)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data || [])
}

