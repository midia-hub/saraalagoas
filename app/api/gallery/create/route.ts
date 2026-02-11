import { NextRequest, NextResponse } from 'next/server'
import { ensureDrivePath, uploadImageToFolder } from '@/lib/drive'
import { slugify } from '@/lib/slug'
import { supabaseServer } from '@/lib/supabase-server'
import { getSiteConfig } from '@/lib/site-config-server'
import { requireAccess } from '@/lib/admin-api'

const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif']
// Padrão 4 MB para evitar 413 em serverless. Defina MAX_UPLOAD_MB no .env se o servidor permitir mais.
const MAX_MB = process.env.MAX_UPLOAD_MB ? Math.max(1, Math.min(50, parseInt(process.env.MAX_UPLOAD_MB, 10) || 4)) : 4
const MAX_SIZE = MAX_MB * 1024 * 1024

export async function POST(request: NextRequest) {
  const access = await requireAccess(request, { pageKey: 'upload', action: 'create' })
  if (!access.ok) return access.response

  const uploadedByUserId = access.snapshot.userId
  const uploadedByName = access.snapshot.displayName ?? access.snapshot.email ?? null

  const formData = await request.formData().catch(() => null)
  if (!formData) return NextResponse.json({ error: 'FormData inválido.' }, { status: 400 })

  const type = String(formData.get('type') || '').toLowerCase()
  const date = String(formData.get('date') || '')
  const description = String(formData.get('description') || '')

  if (type !== 'culto' && type !== 'evento') {
    return NextResponse.json({ error: 'Tipo inválido.' }, { status: 400 })
  }
  if (!date) return NextResponse.json({ error: 'Data obrigatória.' }, { status: 400 })

  let title = ''
  let slug = ''

  if (type === 'culto') {
    const serviceId = String(formData.get('serviceId') || '')
    if (!serviceId) {
      return NextResponse.json({ error: 'Selecione o culto.' }, { status: 400 })
    }
    const config = await getSiteConfig()
    const service = config.services?.find((s) => s.id === serviceId)
    if (!service) return NextResponse.json({ error: 'Culto não encontrado.' }, { status: 404 })
    title = service.name
    slug = slugify(service.name)
  } else {
    const eventName = String(formData.get('eventName') || '').trim()
    if (!eventName) return NextResponse.json({ error: 'Informe o nome do evento.' }, { status: 400 })
    title = eventName
    slug = slugify(eventName)
  }

  const files = formData.getAll('files').filter((f): f is File => f instanceof File)
  if (!files.length) return NextResponse.json({ error: 'Envie ao menos uma imagem.' }, { status: 400 })

  for (const file of files) {
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json({ error: `Arquivo ${file.name} com tipo inválido.` }, { status: 400 })
    }
    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: `Arquivo ${file.name} excede o limite de ${MAX_MB} MB. Reduza o tamanho da imagem.` },
        { status: 400 }
      )
    }
  }

  const year = date.slice(0, 4)
  const folderId = await ensureDrivePath([year, type, slug, date])

  let galleryId: string
  const { data: existing } = await supabaseServer
    .from('galleries')
    .select('id')
    .eq('type', type)
    .eq('slug', slug)
    .eq('date', date)
    .maybeSingle()

  if (existing?.id) {
    galleryId = existing.id
  } else {
    const { data: created, error: createError } = await supabaseServer
      .from('galleries')
      .insert({
        type,
        title,
        slug,
        date,
        description: description || null,
        drive_folder_id: folderId,
      })
      .select('id')
      .single()
    if (createError || !created?.id) {
      return NextResponse.json({ error: createError?.message || 'Falha ao criar galeria.' }, { status: 500 })
    }
    galleryId = created.id
  }

  const uploaded: Array<{ name: string; id: string }> = []
  const failed: Array<{ name: string; error: string }> = []

  for (const file of files) {
    try {
      const buffer = Buffer.from(await file.arrayBuffer())
      const uploadedFile = await uploadImageToFolder(folderId, {
        name: file.name,
        mimeType: file.type,
        buffer,
      })

      await supabaseServer
        .from('gallery_files')
        .upsert({
          gallery_id: galleryId,
          drive_file_id: uploadedFile.id,
          name: uploadedFile.name,
          web_view_link: uploadedFile.webViewLink,
          thumbnail_link: uploadedFile.thumbnailLink,
          mime_type: uploadedFile.mimeType,
          created_time: uploadedFile.createdTime,
          uploaded_by_user_id: uploadedByUserId,
          uploaded_by_name: uploadedByName,
        }, { onConflict: 'drive_file_id' })

      uploaded.push({ name: uploadedFile.name, id: uploadedFile.id })
    } catch (err) {
      failed.push({
        name: file.name,
        error: err instanceof Error ? err.message : 'Falha no upload',
      })
    }
  }

  return NextResponse.json({
    galleryRoute: `/galeria/${type}/${slug}/${date}`,
    galleryId,
    uploadedCount: uploaded.length,
    failed,
  })
}

