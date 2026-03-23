import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { requireAccess } from '@/lib/admin-api'
import { supabaseServer } from '@/lib/supabase-server'
import {
  gerarMetaComVisao,
  isImageRepoFile,
  metaPathFromImagePath,
  mimeTypeFromRepoPath,
  parseRepoMetaJson,
  REPO_BUCKET,
  type RepoMeta,
  type RepoPublico,
} from '@/lib/equipe-ia-repositorio'

const BUCKET = REPO_BUCKET
const FOLDER = 'repositorio'

function decodeUploadBase64(body: { base64?: string; mimeType?: string }): { buffer: Buffer; mimeType: string } | null {
  const raw = typeof body.base64 === 'string' ? body.base64.trim() : ''
  if (!raw) return null

  const dataUri = raw.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9+.]+);base64,(.+)$/)
  if (dataUri) {
    return {
      mimeType: dataUri[1],
      buffer:   Buffer.from(dataUri[2], 'base64'),
    }
  }

  const mime = typeof body.mimeType === 'string' && body.mimeType.includes('/')
    ? body.mimeType
    : 'image/jpeg'
  try {
    return { buffer: Buffer.from(raw, 'base64'), mimeType: mime }
  } catch {
    return null
  }
}

async function fetchMetaForPath(metaPath: string): Promise<Partial<RepoMeta> | null> {
  const { data, error } = await supabaseServer.storage.from(BUCKET).download(metaPath)
  if (error || !data) return null
  const text = await data.text()
  return parseRepoMetaJson(text)
}

/**
 * GET /api/admin/midia/equipe-ia/repositorio
 * Lista imagens de referência com metadados (JSON lado a lado no bucket).
 */
export async function GET(request: NextRequest) {
  const access = await requireAccess(request, { pageKey: 'instagram', action: 'view' })
  if (!access.ok) return access.response

  const { data: files, error } = await supabaseServer.storage
    .from(BUCKET)
    .list(FOLDER, { limit: 200, sortBy: { column: 'created_at', order: 'desc' } })

  if (error) {
    return NextResponse.json({ error: `Erro ao listar repositório: ${error.message}` }, { status: 500 })
  }

  const rows = (files ?? []).filter((f) => f.name !== '.emptyFolderPlaceholder' && isImageRepoFile(f.name))

  const items = await Promise.all(
    rows.map(async (f) => {
      const storagePath = `${FOLDER}/${f.name}`
      const metaPath    = metaPathFromImagePath(storagePath)
      const { data: urlData } = supabaseServer.storage.from(BUCKET).getPublicUrl(storagePath)
      const meta = await fetchMetaForPath(metaPath)
      return {
        id:        f.name,
        path:      storagePath,
        nome:      f.name.replace(/^\d+_/, ''),
        url:       urlData?.publicUrl ?? '',
        createdAt: f.created_at ?? '',
        meta:      meta ?? null,
        metaPath,
      }
    }),
  )

  return NextResponse.json({ items })
}

/**
 * POST /api/admin/midia/equipe-ia/repositorio
 *
 * Upload + IA (visão):
 *   Body: { nome: string, base64: string, mimeType?: string }
 *
 * Reanalisar imagem já no bucket (regenera JSON com IA):
 *   Body: { action: "analisar", path: "repositorio/arquivo.jpg" }
 */
export async function POST(request: NextRequest) {
  const access = await requireAccess(request, { pageKey: 'instagram', action: 'create' })
  if (!access.ok) return access.response

  const openaiKey = process.env.OPENAI_API_KEY ?? ''
  if (!openaiKey) {
    return NextResponse.json({ error: 'OPENAI_API_KEY não configurada (necessária para descrever a imagem).' }, { status: 503 })
  }

  const body = await request.json().catch(() => ({}))

  if (body.action === 'analisar') {
    const imagePath = String(body.path ?? '').trim()
    if (!imagePath.startsWith(`${FOLDER}/`) || !isImageRepoFile(imagePath.split('/').pop() ?? '')) {
      return NextResponse.json({ error: 'path inválido.' }, { status: 400 })
    }

    const { data: imgBlob, error: dlErr } = await supabaseServer.storage.from(BUCKET).download(imagePath)
    if (dlErr || !imgBlob) {
      return NextResponse.json({ error: 'Não foi possível baixar a imagem do storage.' }, { status: 404 })
    }

    const buffer   = Buffer.from(await imgBlob.arrayBuffer())
    const mimeType = mimeTypeFromRepoPath(imagePath)
    const fileName = imagePath.split('/').pop() ?? 'ref'

    let metaOut: RepoMeta
    try {
      const client = new OpenAI({ apiKey: openaiKey })
      const generated = await gerarMetaComVisao(client, buffer.toString('base64'), mimeType, fileName)
      metaOut = {
        ...generated,
        gerado_em:      new Date().toISOString(),
        arquivo_imagem: imagePath,
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Erro ao analisar imagem.'
      return NextResponse.json({ error: msg }, { status: 500 })
    }

    const metaPath = metaPathFromImagePath(imagePath)
    const jsonBuf  = Buffer.from(JSON.stringify(metaOut, null, 2), 'utf8')
    const { error: upErr } = await supabaseServer.storage
      .from(BUCKET)
      .upload(metaPath, jsonBuf, { contentType: 'application/json', upsert: true })

    if (upErr) {
      return NextResponse.json({ error: `Falha ao gravar meta: ${upErr.message}` }, { status: 500 })
    }

    const { data: urlData } = supabaseServer.storage.from(BUCKET).getPublicUrl(imagePath)
    return NextResponse.json({
      item: {
        id:        fileName,
        path:      imagePath,
        nome:      fileName.replace(/^\d+_/, ''),
        url:       urlData?.publicUrl ?? '',
        meta:      metaOut,
        metaPath,
      },
    })
  }

  const nomeRaw = String(body.nome ?? 'referencia').replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 100)

  const decoded = decodeUploadBase64(body)
  if (!decoded) {
    return NextResponse.json({ error: 'base64 é obrigatório (ou formato inválido).' }, { status: 400 })
  }

  const { buffer, mimeType } = decoded
  const ext = mimeType.includes('png') ? 'png' : mimeType.includes('webp') ? 'webp' : 'jpg'
  const fileName    = `${Date.now()}_${nomeRaw}.${ext}`
  const storagePath = `${FOLDER}/${fileName}`
  const metaPath    = metaPathFromImagePath(storagePath)

  if (buffer.byteLength > 8 * 1024 * 1024) {
    return NextResponse.json({ error: 'Imagem muito grande. Máximo: 8 MB.' }, { status: 400 })
  }

  const { data: buckets } = await supabaseServer.storage.listBuckets()
  const bucketExists = buckets?.some((b) => b.name === BUCKET)
  if (!bucketExists) {
    const { error: bucketErr } = await supabaseServer.storage.createBucket(BUCKET, { public: true })
    if (bucketErr) return NextResponse.json({ error: `Falha ao criar bucket: ${bucketErr.message}` }, { status: 500 })
  }

  const { error: uploadError } = await supabaseServer.storage
    .from(BUCKET)
    .upload(storagePath, buffer, { contentType: mimeType, upsert: false })

  if (uploadError) {
    return NextResponse.json({ error: `Falha no upload: ${uploadError.message}` }, { status: 500 })
  }

  const { data: urlData } = supabaseServer.storage.from(BUCKET).getPublicUrl(storagePath)
  const publicUrl = urlData?.publicUrl ?? ''

  let metaOut: RepoMeta
  try {
    const client = new OpenAI({ apiKey: openaiKey })
    const base64ForVision = buffer.toString('base64')
    const generated = await gerarMetaComVisao(client, base64ForVision, mimeType, fileName)
    metaOut = {
      ...generated,
      gerado_em:      new Date().toISOString(),
      arquivo_imagem: storagePath,
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erro ao gerar descrição.'
    await supabaseServer.storage.from(BUCKET).remove([storagePath])
    return NextResponse.json({ error: `Upload ok, mas falha na IA: ${msg}` }, { status: 500 })
  }

  const jsonBuf = Buffer.from(JSON.stringify(metaOut, null, 2), 'utf8')
  const { error: metaErr } = await supabaseServer.storage
    .from(BUCKET)
    .upload(metaPath, jsonBuf, { contentType: 'application/json', upsert: true })

  if (metaErr) {
    await supabaseServer.storage.from(BUCKET).remove([storagePath])
    return NextResponse.json({ error: `Imagem salva, mas falha ao gravar descrição: ${metaErr.message}` }, { status: 500 })
  }

  return NextResponse.json({
    item: {
      id:        fileName,
      path:      storagePath,
      nome:      `${nomeRaw}.${ext}`,
      url:       publicUrl,
      meta:      metaOut,
      metaPath,
    },
  })
}

/**
 * PATCH /api/admin/midia/equipe-ia/repositorio
 * Atualiza metadados (edição manual).
 * Body: { path: string (repositorio/...jpg), meta: Partial<RepoMeta> }
 */
export async function PATCH(request: NextRequest) {
  const access = await requireAccess(request, { pageKey: 'instagram', action: 'create' })
  if (!access.ok) return access.response

  const body = await request.json().catch(() => ({}))
  const imagePath = String(body.path ?? '').trim()
  if (!imagePath.startsWith(`${FOLDER}/`) || !isImageRepoFile(imagePath.split('/').pop() ?? '')) {
    return NextResponse.json({ error: 'path inválido.' }, { status: 400 })
  }

  const { data: existing } = await supabaseServer.storage.from(BUCKET).download(metaPathFromImagePath(imagePath))
  const prev = existing ? (parseRepoMetaJson(await existing.text()) ?? {}) : {}

  const incoming = body.meta && typeof body.meta === 'object' ? (body.meta as Record<string, unknown>) : {}
  const publicoRaw = incoming.publico
  const publico: RepoPublico[] = Array.isArray(publicoRaw)
    ? (publicoRaw.filter((p) => p === 'diretor_arte' || p === 'designer') as RepoPublico[])
    : prev?.publico ?? ['diretor_arte', 'designer']

  const str = (k: keyof RepoMeta, fallback = '') =>
    typeof incoming[k] === 'string' ? (incoming[k] as string) : (prev?.[k] as string | undefined) ?? fallback

  const merged: RepoMeta = {
    descricao:                str('descricao'),
    categoria:                typeof incoming.categoria === 'string' ? incoming.categoria : (prev?.categoria ?? 'geral'),
    publico:                  publico.length > 0 ? publico : ['diretor_arte', 'designer'],
    palavras_chave:           Array.isArray(incoming.palavras_chave)
      ? (incoming.palavras_chave as unknown[]).map(String)
      : (prev?.palavras_chave ?? []),
    linha_criativa:           str('linha_criativa'),
    contexto_proximas_criacoes: str('contexto_proximas_criacoes', prev?.contexto_proximas_criacoes ?? ''),
    briefing_para_ia:         str('briefing_para_ia', prev?.briefing_para_ia ?? ''),
    prompt_sugerido_en:       str('prompt_sugerido_en', prev?.prompt_sugerido_en ?? ''),
    elementos_manter:         Array.isArray(incoming.elementos_manter)
      ? (incoming.elementos_manter as unknown[]).map(String)
      : (prev?.elementos_manter ?? []),
    evitar:                   Array.isArray(incoming.evitar)
      ? (incoming.evitar as unknown[]).map(String)
      : (prev?.evitar ?? []),
    gerado_em:                typeof prev?.gerado_em === 'string' ? prev.gerado_em! : new Date().toISOString(),
    arquivo_imagem:           imagePath,
  }

  if (!merged.contexto_proximas_criacoes) delete merged.contexto_proximas_criacoes
  if (!merged.briefing_para_ia) delete merged.briefing_para_ia
  if (!merged.prompt_sugerido_en) delete merged.prompt_sugerido_en
  if (!merged.elementos_manter?.length) delete merged.elementos_manter
  if (!merged.evitar?.length) delete merged.evitar

  const jsonBuf = Buffer.from(JSON.stringify(merged, null, 2), 'utf8')
  const metaPath = metaPathFromImagePath(imagePath)
  const { error } = await supabaseServer.storage
    .from(BUCKET)
    .upload(metaPath, jsonBuf, { contentType: 'application/json', upsert: true })

  if (error) {
    return NextResponse.json({ error: `Falha ao salvar meta: ${error.message}` }, { status: 500 })
  }

  return NextResponse.json({ ok: true, meta: merged, metaPath })
}

/**
 * DELETE /api/admin/midia/equipe-ia/repositorio
 * Remove imagem e arquivo de descrição (.json).
 * Query: ?path=repositorio/1234_nome.png
 */
export async function DELETE(request: NextRequest) {
  const access = await requireAccess(request, { pageKey: 'instagram', action: 'create' })
  if (!access.ok) return access.response

  const path = request.nextUrl.searchParams.get('path') ?? ''
  if (!path.startsWith(`${FOLDER}/`)) {
    return NextResponse.json({ error: 'Caminho inválido.' }, { status: 400 })
  }

  const metaPath = metaPathFromImagePath(path)
  const { error } = await supabaseServer.storage.from(BUCKET).remove([path, metaPath])
  if (error) {
    return NextResponse.json({ error: `Falha ao remover: ${error.message}` }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
