import { NextRequest, NextResponse } from 'next/server'
import { requireAccess } from '@/lib/admin-api'
import { invalidateGalleryFilesCache } from '@/lib/gallery-files-cache'
import { supabaseServer } from '@/lib/supabase-server'

/**
 * POST /api/gallery/[id]/merge
 * Move todas as fotos do álbum de origem (sourceId) para este álbum (destino).
 * Opcionalmente exclui o álbum de origem após a mesclagem.
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> | { id: string } }
) {
  const access = await requireAccess(request, { pageKey: 'galeria', action: 'edit' })
  if (!access.ok) return access.response

  const params = await Promise.resolve(context.params)
  const targetId = params.id
  if (!targetId) return NextResponse.json({ error: 'ID do álbum destino obrigatório.' }, { status: 400 })

  let body: { sourceId?: string; deleteSource?: boolean }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Body JSON inválido.' }, { status: 400 })
  }

  const { sourceId, deleteSource = false } = body
  if (!sourceId) return NextResponse.json({ error: 'ID do álbum de origem obrigatório.' }, { status: 400 })
  if (sourceId === targetId) return NextResponse.json({ error: 'Origem e destino não podem ser o mesmo álbum.' }, { status: 400 })

  // Verifica que ambos os álbuns existem
  const { data: albums, error: fetchErr } = await supabaseServer
    .from('galleries')
    .select('id')
    .in('id', [sourceId, targetId])

  if (fetchErr || !albums || albums.length < 2) {
    return NextResponse.json({ error: 'Um ou ambos os álbuns não foram encontrados.' }, { status: 404 })
  }

  // Move as fotos da origem para o destino
  const { error: updateErr, count } = await supabaseServer
    .from('gallery_files')
    .update({ gallery_id: targetId })
    .eq('gallery_id', sourceId)

  if (updateErr) {
    return NextResponse.json({ error: 'Não foi possível mover as fotos.' }, { status: 500 })
  }

  invalidateGalleryFilesCache(targetId)
  invalidateGalleryFilesCache(sourceId)

  if (deleteSource) {
    await supabaseServer.from('galleries').delete().eq('id', sourceId)
  }

  return NextResponse.json({ ok: true, moved: count ?? 0 })
}
