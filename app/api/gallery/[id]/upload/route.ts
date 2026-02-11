import { NextRequest, NextResponse } from 'next/server'
import { uploadImageToFolder } from '@/lib/drive'
import { supabaseServer } from '@/lib/supabase-server'
import { requireAccess } from '@/lib/admin-api'

const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif']
// Padrão 4 MB para evitar 413 em serverless (Vercel etc.). Defina MAX_UPLOAD_MB=10 no .env se o servidor permitir.
const MAX_MB = process.env.MAX_UPLOAD_MB ? Math.max(1, Math.min(50, parseInt(process.env.MAX_UPLOAD_MB, 10) || 4)) : 4
const MAX_SIZE = MAX_MB * 1024 * 1024

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const access = await requireAccess(request, { pageKey: 'upload', action: 'create' })
    if (!access.ok) return access.response

    const uploadedByUserId = access.snapshot.userId
    const uploadedByName = access.snapshot.displayName ?? access.snapshot.email ?? null

    const { id: galleryId } = await context.params
    const formData = await request.formData().catch(() => null)
    if (!formData) return NextResponse.json({ error: 'FormData inválido.' }, { status: 400 })

    const file = formData.get('file')
    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'Envie um arquivo.' }, { status: 400 })
    }
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json({ error: `Tipo inválido: ${file.name}` }, { status: 400 })
    }
    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: `Arquivo ${file.name} excede o limite de ${MAX_MB} MB. Reduza o tamanho da imagem e tente novamente.` },
        { status: 400 }
      )
    }

    const { data: gallery, error: galleryError } = await supabaseServer
      .from('galleries')
      .select('drive_folder_id')
      .eq('id', galleryId)
      .single()

    if (galleryError || !gallery?.drive_folder_id) {
      return NextResponse.json({ error: 'Galeria não encontrada.' }, { status: 404 })
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const uploadedFile = await uploadImageToFolder(gallery.drive_folder_id, {
      name: file.name,
      mimeType: file.type,
      buffer,
    })

    const { error: insertError } = await supabaseServer
      .from('gallery_files')
      .insert({
        gallery_id: galleryId,
        drive_file_id: uploadedFile.id,
        name: uploadedFile.name,
        web_view_link: uploadedFile.webViewLink ?? null,
        thumbnail_link: uploadedFile.thumbnailLink ?? null,
        mime_type: uploadedFile.mimeType,
        created_time: uploadedFile.createdTime ?? null,
        uploaded_by_user_id: uploadedByUserId,
        uploaded_by_name: uploadedByName,
      })

    if (insertError) {
      return NextResponse.json(
        { error: `Falha ao salvar no banco: ${insertError.message}` },
        { status: 500 }
      )
    }

    return NextResponse.json({ name: uploadedFile.name, id: uploadedFile.id })
  } catch (err: unknown) {
    const message = getErrorMessage(err)
    console.error('[gallery/upload]', message, err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

function getErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message
  if (err && typeof err === 'object') {
    const e = err as Record<string, unknown>
    if (typeof e.message === 'string') return e.message
    if (e.response && typeof e.response === 'object') {
      const res = e.response as Record<string, unknown>
      if (res.data && typeof res.data === 'object') {
        const data = res.data as Record<string, unknown>
        if (data.error && typeof data.error === 'object') {
          const errObj = data.error as Record<string, unknown>
          if (typeof errObj.message === 'string') return errObj.message
        }
      }
    }
  }
  return String(err)
}
