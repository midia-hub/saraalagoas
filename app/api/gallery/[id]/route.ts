import { NextRequest, NextResponse } from 'next/server'
import { requireAccess } from '@/lib/admin-api'
import { invalidateGalleryFilesCache } from '@/lib/gallery-files-cache'
import { supabaseServer } from '@/lib/supabase-server'

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> | { id: string } }
) {
  const params = await Promise.resolve(context.params)
  const id = params.id
  if (!id) return NextResponse.json({ error: 'O ID é obrigatório. Por favor, informe-o.' }, { status: 400 })
  const { data, error } = await supabaseServer
    .from('galleries')
    .select('id, type, title, slug, date, drive_folder_id, created_at, hidden_from_public')
    .eq('id', id)
    .single()

  if (error || !data) {
    return NextResponse.json({ error: 'Não conseguimos localizar a galeria.' }, { status: 404 })
  }
  return NextResponse.json(data)
}

/**
 * DELETE /api/gallery/[id]
 * Exclui o álbum e todos os registros de imagens (gallery_files).
 * Requer permissão galeria → Excluir. Não remove arquivos do Drive.
 */
export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> | { id: string } }
) {
  const access = await requireAccess(_request, { pageKey: 'galeria', action: 'delete' })
  if (!access.ok) return access.response

  const params = await Promise.resolve(context.params)
  const id = params.id
  if (!id) {
    return NextResponse.json({ error: 'O ID do álbum é obrigatório.' }, { status: 400 })
  }

  const { data: gallery, error: fetchErr } = await supabaseServer
    .from('galleries')
    .select('id')
    .eq('id', id)
    .single()

  if (fetchErr || !gallery) {
    return NextResponse.json({ error: 'Álbum não encontrado.' }, { status: 404 })
  }

  const { error: deleteFilesErr } = await supabaseServer
    .from('gallery_files')
    .delete()
    .eq('gallery_id', id)

  if (deleteFilesErr) {
    return NextResponse.json(
      { error: 'Não foi possível remover as imagens do álbum.' },
      { status: 500 }
    )
  }

  const { error: deleteGalleryErr } = await supabaseServer.from('galleries').delete().eq('id', id)

  if (deleteGalleryErr) {
    const msg = deleteGalleryErr.message || ''
    if (/foreign key|violates|referenced/i.test(msg)) {
      return NextResponse.json(
        { error: 'Não é possível excluir: o álbum está vinculado a publicações. Remova as publicações primeiro.' },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: 'Não foi possível excluir o álbum.' },
      { status: 500 }
    )
  }

  invalidateGalleryFilesCache(id)
  return NextResponse.json({ ok: true })
}

/**
 * PATCH /api/gallery/[id]
 * Atualiza campos do álbum. Suporta: { hidden_from_public: boolean }
 * Requer permissão galeria → Editar.
 */
export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> | { id: string } }
) {
  const access = await requireAccess(request, { pageKey: 'galeria', action: 'edit' })
  if (!access.ok) return access.response

  const params = await Promise.resolve(context.params)
  const id = params.id
  if (!id) {
    return NextResponse.json({ error: 'O ID do álbum é obrigatório.' }, { status: 400 })
  }

  let body: { hidden_from_public?: boolean }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Body JSON inválido.' }, { status: 400 })
  }

  const updates: Record<string, unknown> = {}
  if (typeof body.hidden_from_public === 'boolean') {
    updates.hidden_from_public = body.hidden_from_public
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'Nenhum campo para atualizar.' }, { status: 400 })
  }

  const { error } = await supabaseServer
    .from('galleries')
    .update(updates)
    .eq('id', id)

  if (error) {
    return NextResponse.json({ error: 'Não foi possível atualizar o álbum.' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
