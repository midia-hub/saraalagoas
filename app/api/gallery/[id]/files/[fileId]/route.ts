import { NextRequest, NextResponse } from 'next/server'
import { requireAccess } from '@/lib/admin-api'
import { deleteFileFromDrive } from '@/lib/drive'
import { invalidateGalleryFilesCache } from '@/lib/gallery-files-cache'
import { supabaseServer } from '@/lib/supabase-server'

/**
 * DELETE /api/gallery/[id]/files/[fileId]
 * Remove a imagem do álbum (registro em gallery_files e, se configurado, do Drive).
 * Requer permissão galeria → Excluir nos perfis.
 */
export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ id: string; fileId: string }> | { id: string; fileId: string } }
) {
  const access = await requireAccess(
    _request as NextRequest,
    { pageKey: 'galeria', action: 'delete' }
  )
  if (!access.ok) return access.response

  const params = await Promise.resolve(context.params)
  const galleryId = params.id
  const fileId = params.fileId

  if (!galleryId || !fileId) {
    return NextResponse.json({ error: 'ID da galeria e do arquivo são obrigatórios.' }, { status: 400 })
  }

  const { data: gallery, error: galleryError } = await supabaseServer
    .from('galleries')
    .select('id')
    .eq('id', galleryId)
    .single()

  if (galleryError || !gallery) {
    return NextResponse.json({ error: 'Álbum não encontrado.' }, { status: 404 })
  }

  const { error: deleteError } = await supabaseServer
    .from('gallery_files')
    .delete()
    .eq('gallery_id', galleryId)
    .eq('drive_file_id', fileId)

  if (deleteError) {
    return NextResponse.json(
      { error: `Falha ao remover do álbum: ${deleteError.message}` },
      { status: 500 }
    )
  }

  invalidateGalleryFilesCache(galleryId)

  try {
    await deleteFileFromDrive(fileId)
  } catch {
    // Imagem já foi removida da galeria no banco; falha no Drive não retorna erro ao cliente
  }

  return NextResponse.json({ ok: true })
}
