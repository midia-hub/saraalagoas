import { NextRequest, NextResponse } from 'next/server'
import { uploadImageToFolder } from '@/lib/drive'
import { createSupabaseServiceClient } from '@/lib/supabase-server'
import { requireAccess } from '@/lib/admin-api'

const BUCKET = 'temp-gallery-uploads'
const ALLOWED_MIMES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif']

/**
 * Recebe o path de um arquivo já enviado ao bucket Supabase temp-gallery-uploads,
 * envia para o Google Drive da galeria e remove do bucket.
 * POST /api/gallery/[id]/upload-from-storage
 * Body: { path: string } — path no bucket (ex.: "userId/uuid/filename.jpg")
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const access = await requireAccess(request, { pageKey: 'upload', action: 'create' })
    if (!access.ok) return access.response

    const userId = access.snapshot.userId
    const uploadedByName = access.snapshot.displayName ?? access.snapshot.email ?? null
    if (!userId) {
      return NextResponse.json({ error: 'Usuário não identificado.' }, { status: 401 })
    }

    const { id: galleryId } = await context.params
    const body = await request.json().catch(() => ({}))
    const rawPath = typeof body.path === 'string' ? body.path.trim() : ''
    if (!rawPath) {
      return NextResponse.json({ error: 'Informe o path do arquivo no storage.' }, { status: 400 })
    }

    // Path deve ser userId/... para o usuário só acessar os próprios uploads
    const segments = rawPath.replace(/\\/g, '/').split('/').filter(Boolean)
    if (segments[0] !== userId) {
      return NextResponse.json({ error: 'Path inválido para este usuário.' }, { status: 403 })
    }

    const supabase = createSupabaseServiceClient()
    const { data: blob, error: downloadError } = await supabase.storage
      .from(BUCKET)
      .download(rawPath)

    if (downloadError || !blob) {
      console.error('[upload-from-storage] download error:', downloadError)
      return NextResponse.json(
        { error: downloadError?.message || 'Arquivo não encontrado no storage.' },
        { status: 404 }
      )
    }

    const buffer = Buffer.from(await blob.arrayBuffer())
    const fileName = segments[segments.length - 1] || 'image.jpg'
    const ext = fileName.includes('.') ? fileName.split('.').pop()?.toLowerCase() : ''
    const mimeType = ALLOWED_MIMES.find((m) => m.includes(ext || '')) || 'image/jpeg'

    const { data: gallery, error: galleryError } = await supabase
      .from('galleries')
      .select('drive_folder_id')
      .eq('id', galleryId)
      .single()

    if (galleryError || !gallery?.drive_folder_id) {
      return NextResponse.json({ error: 'Galeria não encontrada.' }, { status: 404 })
    }

    const uploadedFile = await uploadImageToFolder(gallery.drive_folder_id, {
      name: fileName,
      mimeType,
      buffer,
    })

    const { error: insertError } = await supabase.from('gallery_files').insert({
      gallery_id: galleryId,
      drive_file_id: uploadedFile.id,
      name: uploadedFile.name,
      web_view_link: uploadedFile.webViewLink ?? null,
      thumbnail_link: uploadedFile.thumbnailLink ?? null,
      mime_type: uploadedFile.mimeType,
      created_time: uploadedFile.createdTime ?? null,
      uploaded_by_user_id: userId,
      uploaded_by_name: uploadedByName,
    })

    if (insertError) {
      return NextResponse.json(
        { error: `Falha ao salvar no banco: ${insertError.message}` },
        { status: 500 }
      )
    }

    // Remove do bucket (não bloqueia a resposta se falhar)
    await supabase.storage.from(BUCKET).remove([rawPath]).then(() => {}).catch((e) => {
      console.warn('[upload-from-storage] delete from bucket failed:', e)
    })

    return NextResponse.json({ name: uploadedFile.name, id: uploadedFile.id })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro ao processar upload.'
    console.error('[upload-from-storage]', message, err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
