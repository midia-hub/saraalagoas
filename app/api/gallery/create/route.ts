/**
 * API Route: POST /api/gallery/create
 * Cria uma galeria e faz upload de imagens para o Google Drive
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createGalleryFolderStructure, uploadFile, makeFolderPublic } from '@/lib/drive'
import { slugify, formatDateForSlug, generateGalleryPath } from '@/lib/slug'

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
const MAX_FILES = 20
const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']

export async function POST(request: NextRequest) {
  try {
    // Autenticação
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseAnonKey) {
      return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 })
    }

    const authHeader = request.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '')

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    })

    const { data: { user }, error: authError } = await supabase.auth.getUser(token)

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Parse form data
    const formData = await request.formData()
    const type = formData.get('type') as 'culto' | 'evento'
    const title = formData.get('title') as string
    const date = formData.get('date') as string
    const description = formData.get('description') as string | null
    const serviceId = formData.get('serviceId') as string | null

    // Validações
    if (!type || !['culto', 'evento'].includes(type)) {
      return NextResponse.json({ error: 'Invalid type' }, { status: 400 })
    }

    if (!title || !date) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Gerar slug
    let slug: string
    if (type === 'culto' && serviceId) {
      // Buscar slug do culto
      const { data: service, error: serviceError } = await supabase
        .from('worship_services')
        .select('slug')
        .eq('id', serviceId)
        .single()

      if (serviceError || !service) {
        return NextResponse.json({ error: 'Worship service not found' }, { status: 404 })
      }
      slug = service.slug
    } else {
      slug = slugify(title)
    }

    // Coletar arquivos (Array.from evita erro de downlevelIteration no build)
    const files: File[] = []
    const entries = Array.from(formData.entries())
    for (const [key, value] of entries) {
      if (key.startsWith('file_') && value instanceof File) {
        files.push(value)
      }
    }

    if (files.length === 0) {
      return NextResponse.json({ error: 'No files provided' }, { status: 400 })
    }

    if (files.length > MAX_FILES) {
      return NextResponse.json({ error: `Maximum ${MAX_FILES} files allowed` }, { status: 400 })
    }

    // Validar arquivos
    for (const file of files) {
      if (file.size > MAX_FILE_SIZE) {
        return NextResponse.json(
          { error: `File ${file.name} exceeds maximum size of 10MB` },
          { status: 400 }
        )
      }

      if (!ALLOWED_TYPES.includes(file.type)) {
        return NextResponse.json(
          { error: `File ${file.name} has invalid type. Only images are allowed.` },
          { status: 400 }
        )
      }
    }

    // Criar estrutura de pastas no Drive
    const dateObj = new Date(date)
    let driveFolder: { id: string; name: string; webViewLink?: string }
    try {
      driveFolder = await createGalleryFolderStructure(type, slug, dateObj)
    } catch (driveErr) {
      const msg = driveErr instanceof Error ? driveErr.message : String(driveErr)
      console.error('Drive createGalleryFolderStructure error:', driveErr)
      const hint = 'Abra a pasta no Google Drive (ex.: "teste"), copie o ID da URL (a parte depois de /folders/) e use em GOOGLE_DRIVE_ROOT_FOLDER_ID no .env.'
      return NextResponse.json(
        { error: `Google Drive: ${msg}. ${hint} A pasta deve estar compartilhada com o e-mail da conta de serviço (no JSON) como Editor.` },
        { status: 503 }
      )
    }

    // Tornar pasta pública
    try {
      await makeFolderPublic(driveFolder.id)
    } catch (makePublicErr) {
      console.error('Drive makeFolderPublic error:', makePublicErr)
      // Continua mesmo se falhar (a pasta já foi criada)
    }

    // Criar registro da galeria no banco
    const { data: gallery, error: galleryError } = await supabase
      .from('galleries')
      .insert({
        type,
        title,
        slug,
        date: formatDateForSlug(dateObj),
        description,
        drive_folder_id: driveFolder.id,
        created_by: user.id,
      })
      .select()
      .single()

    if (galleryError || !gallery) {
      const msg = galleryError?.message || 'Falha ao salvar galeria no banco. Verifique se a tabela galleries existe e as migrations foram executadas.'
      const detail = galleryError?.details ? ` (${String(galleryError.details)})` : (galleryError?.hint ? ` (${galleryError.hint})` : '')
      console.error('Supabase galleries insert error:', galleryError)
      return NextResponse.json({ error: msg + detail }, { status: 500 })
    }

    // Upload dos arquivos na pasta que acabamos de criar (driveFolder = pasta da data, dentro da sua pasta raiz)
    const uploadedFiles: Array<{
      drive_file_id: string
      name: string
      web_view_link?: string
      thumbnail_link?: string
      mime_type?: string
      created_time?: string
    }> = []

    const failedFiles: Array<{ name: string; error: string }> = []

    for (const file of files) {
      try {
        const buffer = Buffer.from(await file.arrayBuffer())
        const driveFile = await uploadFile(buffer, file.name, file.type, driveFolder.id)

        uploadedFiles.push({
          drive_file_id: driveFile.id,
          name: driveFile.name,
          web_view_link: driveFile.webViewLink,
          thumbnail_link: driveFile.thumbnailLink,
          mime_type: driveFile.mimeType,
          created_time: driveFile.createdTime,
        })
      } catch (error) {
        console.error(`Failed to upload ${file.name}:`, error)
        let errorMsg = error instanceof Error ? error.message : 'Unknown error'
        if (errorMsg.includes('storage quota') || errorMsg.includes('do not have storage quota')) {
          errorMsg =
            'Conta de serviço não tem cota. Use: (1) Uma pasta no SEU Drive compartilhada com o e-mail da conta como Editor, ou (2) Um Drive compartilhado — adicione a conta como membro (Gerenciador de conteúdo ou Gerenciador). Confira docs/CONFIGURAR-DRIVE-RAPIDO.md'
        }
        failedFiles.push({ name: file.name, error: errorMsg })
      }
    }

    // Salvar metadados dos arquivos no banco
    if (uploadedFiles.length > 0) {
      const fileRecords = uploadedFiles.map((file) => ({
        gallery_id: gallery.id,
        drive_file_id: file.drive_file_id,
        name: file.name,
        web_view_link: file.web_view_link,
        thumbnail_link: file.thumbnail_link,
        mime_type: file.mime_type,
        created_time: file.created_time,
      }))

      const { error: filesError } = await supabase.from('gallery_files').insert(fileRecords)

      if (filesError) {
        console.error('Failed to save file metadata:', filesError)
      }
    }

    // Gerar rota da galeria
    const galleryRoute = generateGalleryPath(type, slug, dateObj)

    return NextResponse.json({
      success: true,
      gallery: {
        id: gallery.id,
        route: galleryRoute,
      },
      uploaded: uploadedFiles.length,
      failed: failedFiles.length,
      failedFiles,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    const stack = error instanceof Error ? error.stack : undefined
    console.error('Gallery creation error:', message, stack)
    if (message.includes('GOOGLE_DRIVE_ROOT_FOLDER_ID') || message.includes('credentials not configured')) {
      return NextResponse.json(
        { error: 'Google Drive não configurado. Configure as variáveis de ambiente (GOOGLE_DRIVE_ROOT_FOLDER_ID e credenciais).' },
        { status: 503 }
      )
    }
    if (message.includes('Worship service not found')) {
      return NextResponse.json({ error: 'Culto não encontrado.' }, { status: 404 })
    }
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
