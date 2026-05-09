import { NextRequest, NextResponse } from 'next/server'
import { requireAccess } from '@/lib/admin-api'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { uploadDataUrlToInstagramPostsBucket } from '@/lib/instagram-post-media-upload'

export const maxDuration = 60

/**
 * POST /api/midia/staging-upload
 * Envia uma única imagem (data URL) ao Storage e devolve a URL pública.
 * Reduz o tamanho do JSON em /api/midia/nova-postagem (evita 413 na borda da Vercel).
 */
export async function POST(request: NextRequest) {
  const access = await requireAccess(request, {
    pageKey: 'instagram',
    action: 'view',
  })
  if (!access.ok) return access.response

  let body: { dataUrl?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'JSON inválido.' }, { status: 400 })
  }

  const dataUrl = typeof body.dataUrl === 'string' ? body.dataUrl.trim() : ''
  if (!dataUrl.startsWith('data:image/')) {
    return NextResponse.json(
      { error: 'Envie uma imagem (data URL image/jpeg ou image/png).' },
      { status: 400 }
    )
  }

  const db = createSupabaseServerClient(request)
  const userId = access.snapshot.userId
  const path = `staging/${userId}/${Date.now()}-${Math.random().toString(36).slice(2, 10)}.jpg`

  try {
    const url = await uploadDataUrlToInstagramPostsBucket(db, dataUrl, path)
    return NextResponse.json({ url })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Falha no upload.'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
