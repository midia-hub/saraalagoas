import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { requireAccess } from '@/lib/admin-api'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

const BUCKET = 'demanda-materiais'

// ---------------------------------------------------------------------------
// GET — lista arquivos de um step
// ---------------------------------------------------------------------------
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string; stepId: string } },
) {
  const access = await requireAccess(request, { pageKey: 'instagram', action: 'view' })
  if (!access.ok) return access.response

  const { data, error } = await supabaseAdmin
    .from('media_demand_step_files')
    .select('*')
    .eq('step_id', params.stepId)
    .eq('demand_id', params.id)
    .order('created_at', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ files: data ?? [] })
}

// ---------------------------------------------------------------------------
// POST — faz upload de arquivo para o bucket e registra no banco
// ---------------------------------------------------------------------------
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string; stepId: string } },
) {
  const access = await requireAccess(request, { pageKey: 'instagram', action: 'create' })
  if (!access.ok) return access.response

  const contentType = request.headers.get('content-type') ?? ''
  let fileName: string
  let fileBuffer: Buffer
  let mimeType: string
  let sourceType: string = 'upload'

  if (contentType.includes('application/json')) {
    // Salvar URL gerada por DALL-E (source_type='dalle')
    const body = await request.json().catch(() => ({}))
    if (!body.url || !body.file_name) {
      return NextResponse.json({ error: 'Informe url e file_name.' }, { status: 400 })
    }

    // Baixa a imagem da URL temporária do OpenAI
    const imgRes = await fetch(body.url)
    if (!imgRes.ok) {
      return NextResponse.json({ error: 'Não foi possível baixar a imagem gerada.' }, { status: 502 })
    }
    const arrayBuffer = await imgRes.arrayBuffer()
    fileBuffer = Buffer.from(arrayBuffer)
    fileName   = body.file_name
    mimeType   = 'image/png'
    sourceType = 'dalle'
  } else if (contentType.includes('multipart/form-data')) {
    // Upload de arquivo real
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    if (!file) return NextResponse.json({ error: 'Arquivo não encontrado no form.' }, { status: 400 })

    const arrayBuffer = await file.arrayBuffer()
    fileBuffer = Buffer.from(arrayBuffer)
    fileName   = file.name
    mimeType   = file.type || 'application/octet-stream'
    sourceType = (formData.get('source_type') as string) || 'upload'
  } else {
    return NextResponse.json({ error: 'Content-Type deve ser multipart/form-data ou application/json.' }, { status: 415 })
  }

  // Armazena no Supabase Storage
  const storagePath = `${params.id}/${params.stepId}/${Date.now()}_${fileName}`
  const { error: storageErr } = await supabaseAdmin.storage
    .from(BUCKET)
    .upload(storagePath, fileBuffer, { contentType: mimeType, upsert: false })

  if (storageErr) {
    return NextResponse.json({ error: `Erro no upload: ${storageErr.message}` }, { status: 500 })
  }

  const { data: publicUrlData } = supabaseAdmin.storage
    .from(BUCKET)
    .getPublicUrl(storagePath)

  const { data: row, error: dbErr } = await supabaseAdmin
    .from('media_demand_step_files')
    .insert({
      step_id:     params.stepId,
      demand_id:   params.id,
      file_name:   fileName,
      file_path:   storagePath,
      file_url:    publicUrlData?.publicUrl ?? '',
      file_size:   fileBuffer.byteLength,
      mime_type:   mimeType,
      source_type: sourceType,
      approved:    false,
    })
    .select()
    .single()

  if (dbErr) return NextResponse.json({ error: dbErr.message }, { status: 500 })
  return NextResponse.json({ file: row }, { status: 201 })
}

// ---------------------------------------------------------------------------
// PATCH — atualiza campo `approved` de um arquivo
// Body: { file_id: string, approved: boolean }
// ---------------------------------------------------------------------------
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string; stepId: string } },
) {
  const access = await requireAccess(request, { pageKey: 'instagram', action: 'create' })
  if (!access.ok) return access.response

  const body = await request.json().catch(() => ({}))
  const { file_id, approved } = body
  if (!file_id) return NextResponse.json({ error: 'Informe file_id.' }, { status: 400 })

  const { data, error } = await supabaseAdmin
    .from('media_demand_step_files')
    .update({ approved: Boolean(approved) })
    .eq('id', file_id)
    .eq('step_id', params.stepId)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ file: data })
}

// ---------------------------------------------------------------------------
// DELETE — ?file_id=X → remove storage + row
// ---------------------------------------------------------------------------
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; stepId: string } },
) {
  const access = await requireAccess(request, { pageKey: 'instagram', action: 'delete' })
  if (!access.ok) return access.response

  const fileId = new URL(request.url).searchParams.get('file_id')
  if (!fileId) return NextResponse.json({ error: 'Informe file_id.' }, { status: 400 })

  const { data: file, error: fetchErr } = await supabaseAdmin
    .from('media_demand_step_files')
    .select('file_path')
    .eq('id', fileId)
    .eq('step_id', params.stepId)
    .single()

  if (fetchErr || !file) {
    return NextResponse.json({ error: 'Arquivo não encontrado.' }, { status: 404 })
  }

  await supabaseAdmin.storage.from(BUCKET).remove([file.file_path])

  const { error: delErr } = await supabaseAdmin
    .from('media_demand_step_files')
    .delete()
    .eq('id', fileId)

  if (delErr) return NextResponse.json({ error: delErr.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
