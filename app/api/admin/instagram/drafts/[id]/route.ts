import { NextRequest, NextResponse } from 'next/server'
import { requireAccess } from '@/lib/admin-api'
import { createSupabaseServerClient } from '@/lib/supabase-server'

type UpdateDraftPayload = {
  caption?: string
  preset?: '4:5' | '3:4' | '1:1' | '1.91:1'
  status?: 'draft' | 'ready' | 'scheduled' | 'published' | 'failed'
  publish_mode?: 'now' | 'scheduled' | null
  scheduled_at?: string | null
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const access = await requireAccess(request, { pageKey: 'instagram', action: 'view' })
  if (!access.ok) return access.response
  const db = createSupabaseServerClient(request)

  const { data: draft, error } = await db
    .from('instagram_post_drafts')
    .select(`
      *,
      galleries (
        id,
        title,
        type,
        slug,
        date
      ),
      instagram_post_assets (
        *
      )
    `)
    .eq('id', params.id)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 404 })
  return NextResponse.json(draft)
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const access = await requireAccess(request, { pageKey: 'instagram', action: 'edit' })
  if (!access.ok) return access.response
  const db = createSupabaseServerClient(request)

  const body = (await request.json().catch(() => ({}))) as UpdateDraftPayload
  const updates: Record<string, string | null> = {
    updated_at: new Date().toISOString(),
  }

  if (typeof body.caption === 'string') updates.caption = body.caption
  if (body.preset) updates.preset = body.preset
  if (body.status) updates.status = body.status
  if (body.publish_mode === 'now' || body.publish_mode === 'scheduled' || body.publish_mode === null) {
    updates.publish_mode = body.publish_mode
  }
  if (body.scheduled_at === null || typeof body.scheduled_at === 'string') {
    updates.scheduled_at = body.scheduled_at
  }

  const { data, error } = await db
    .from('instagram_post_drafts')
    .update(updates)
    .eq('id', params.id)
    .select('*')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
