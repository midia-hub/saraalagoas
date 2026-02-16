import { NextRequest, NextResponse } from 'next/server'
import { requireAccess } from '@/lib/admin-api'
import { createSupabaseAdminClient } from '@/lib/supabase-server'

/** DELETE - remove uma foto do produto. */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; imageId: string }> }
) {
  const access = await requireAccess(request, { pageKey: 'livraria_produtos', action: 'edit' })
  if (!access.ok) return access.response
  const { id: productId, imageId } = await params
  try {
    const supabase = createSupabaseAdminClient(request)
    const { data: img } = await supabase
      .from('bookstore_product_images')
      .select('id, image_path')
      .eq('id', imageId)
      .eq('product_id', productId)
      .single()
    if (!img) return NextResponse.json({ error: 'Imagem não encontrada' }, { status: 404 })

    const { error: delError } = await supabase.from('bookstore_product_images').delete().eq('id', imageId)
    if (delError) return NextResponse.json({ error: delError.message }, { status: 500 })
    await supabase.storage.from('imagens').remove([img.image_path]).catch(() => {})
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('DELETE livraria/produtos/[id]/images/[imageId]:', err)
    return NextResponse.json({ error: 'Erro ao remover imagem' }, { status: 500 })
  }
}
