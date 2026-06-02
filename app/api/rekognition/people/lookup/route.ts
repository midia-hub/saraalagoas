import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'
import { requireAccess } from '@/lib/admin-api'

export async function GET(request: NextRequest) {
  const access = await requireAccess(request, { pageKey: 'galeria', action: 'view' })
  if (!access.ok) return access.response

  const name = request.nextUrl.searchParams.get('name')?.trim()
  if (!name) return NextResponse.json({ person: null })

  const { data } = await supabaseServer
    .from('rekognition_people')
    .select('id, name, status')
    .ilike('name', name)
    .limit(1)
    .maybeSingle()

  return NextResponse.json({ person: data ?? null })
}
