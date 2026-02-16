import { NextRequest, NextResponse } from 'next/server'
import { requireAccess } from '@/lib/admin-api'
import { createSupabaseAdminClient } from '@/lib/supabase-server'
import { getStorageUrl } from '@/lib/storage-url'
import { randomUUID } from 'crypto'

const BUCKET = 'imagens'
const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/jpg']
const MAX_MB = 5
const MAX_SIZE = MAX_MB * 1024 * 1024

/** POST - adiciona uma foto ao produto. Body: FormData com "file" (imagem). Retorna id, image_path, image_url, sort_order. */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const access = await requireAccess(request, { pageKey: 'livraria_produtos', action: 'edit' })
  if (!access.ok) return access.response
  const { id: productId } = await params
  try {
    const formData = await request.formData().catch(() => null)
    if (!formData) return NextResponse.json({ error: 'Envie um arquivo.' }, { status: 400 })
    const file = formData.get('file')
    if (!(file instanceof File)) return NextResponse.json({ error: 'Envie um arquivo de imagem.' }, { status: 400 })
    const type = file.type.toLowerCase()
    if (!ALLOWED_TYPES.some((t) => type.includes(t.replace('image/', '')))) {
      return NextResponse.json({ error: 'Tipo de arquivo não permitido. Use JPEG, PNG ou WebP.' }, { status: 400 })
    }
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: `Arquivo muito grande. Máximo ${MAX_MB} MB.` }, { status: 400 })
    }

    const supabase = createSupabaseAdminClient(request)
    const { data: product } = await supabase.from('bookstore_products').select('id').eq('id', productId).single()
    if (!product) return NextResponse.json({ error: 'Produto não encontrado' }, { status: 404 })

    const { data: maxOrder } = await supabase
      .from('bookstore_product_images')
      .select('sort_order')
      .eq('product_id', productId)
      .order('sort_order', { ascending: false })
      .limit(1)
      .single()
    const nextOrder = (maxOrder?.sort_order ?? -1) + 1

    const ext = type.includes('png') ? 'png' : type.includes('webp') ? 'webp' : 'jpg'
    const path = `livraria/produtos/${productId}/${randomUUID()}.${ext}`
    const buffer = Buffer.from(await file.arrayBuffer())

    const { error: uploadError } = await supabase.storage.from(BUCKET).upload(path, buffer, {
      upsert: false,
      contentType: file.type,
    })
    if (uploadError) {
      console.error('livraria upload-image:', uploadError)
      return NextResponse.json({ error: 'Falha ao enviar a imagem. Verifique se o bucket existe.' }, { status: 500 })
    }

    const { data: row, error: insertError } = await supabase
      .from('bookstore_product_images')
      .insert({ product_id: productId, image_path: path, sort_order: nextOrder })
      .select('id, image_path, sort_order')
      .single()
    if (insertError) {
      console.error('livraria upload-image insert:', insertError)
      return NextResponse.json({ error: 'Erro ao registrar imagem' }, { status: 500 })
    }
    const imageUrl = getStorageUrl(row.image_path)
    return NextResponse.json({ id: row.id, image_path: row.image_path, image_url: imageUrl, sort_order: row.sort_order })
  } catch (err) {
    console.error('POST livraria/produtos/[id]/upload-image:', err)
    return NextResponse.json({ error: 'Erro ao enviar imagem' }, { status: 500 })
  }
}
