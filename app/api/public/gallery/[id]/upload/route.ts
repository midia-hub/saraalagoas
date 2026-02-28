import { NextRequest, NextResponse } from 'next/server'
import { uploadImageToFolder } from '@/lib/drive'
import { supabaseServer } from '@/lib/supabase-server'

const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif']
const MAX_MB = process.env.MAX_UPLOAD_MB
  ? Math.max(1, Math.min(50, parseInt(process.env.MAX_UPLOAD_MB, 10) || 10))
  : 10
const MAX_SIZE = MAX_MB * 1024 * 1024

/**
 * POST /api/public/gallery/[id]/upload
 * Faz upload de uma foto para um álbum sem exigir login.
 * O álbum deve ter sido criado via /api/public/gallery/prepare.
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: galleryId } = await context.params
    const formData = await request.formData().catch(() => null)
    if (!formData) {
      return NextResponse.json({ error: 'Arquivo inválido. Tente novamente.' }, { status: 400 })
    }

    const file = formData.get('file')
    const uploaderName = String(formData.get('uploaderName') || '').trim() || null

    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'Envie um arquivo de imagem.' }, { status: 400 })
    }
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json({ error: `Formato não suportado: ${file.name}` }, { status: 400 })
    }
    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: `Arquivo muito grande (máx. ${MAX_MB} MB). Comprima a imagem e tente novamente.` },
        { status: 400 }
      )
    }

    if (!supabaseServer) {
      return NextResponse.json({ error: 'Serviço indisponível. Tente novamente.' }, { status: 500 })
    }

    const { data: gallery, error: galleryError } = await supabaseServer
      .from('galleries')
      .select('drive_folder_id')
      .eq('id', galleryId)
      .single()

    if (galleryError || !gallery?.drive_folder_id) {
      return NextResponse.json({ error: 'Álbum não encontrado.' }, { status: 404 })
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const uploadedFile = await uploadImageToFolder(gallery.drive_folder_id, {
      name: file.name,
      mimeType: file.type,
      buffer,
    })

    const { error: insertError } = await supabaseServer.from('gallery_files').insert({
      gallery_id: galleryId,
      drive_file_id: uploadedFile.id,
      name: uploadedFile.name,
      web_view_link: uploadedFile.webViewLink ?? null,
      thumbnail_link: uploadedFile.thumbnailLink ?? null,
      mime_type: uploadedFile.mimeType,
      created_time: uploadedFile.createdTime ?? null,
      uploaded_by_user_id: null,
      uploaded_by_name: uploaderName,
    })

    if (insertError) {
      return NextResponse.json({ error: `Falha ao registrar arquivo: ${insertError.message}` }, { status: 500 })
    }

    return NextResponse.json({ name: uploadedFile.name, id: uploadedFile.id })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erro inesperado no upload.'
    console.error('[public/gallery/upload]', msg, err)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
