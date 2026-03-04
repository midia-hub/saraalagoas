/**
 * DELETE /api/rekognition/people/[id]  — remove pessoa e seu face da collection
 */
import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'
import { requireAccess } from '@/lib/admin-api'
import { deleteFaceFromCollection } from '@/lib/rekognition'

const BUCKET = 'rekognition-references'

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const access = await requireAccess(request, { pageKey: 'galeria', action: 'delete' })
  if (!access.ok) return access.response

  const { id } = await context.params

  // Busca dados da pessoa para poder deletar da collection e do storage
  const { data: person, error: fetchError } = await supabaseServer
    .from('rekognition_people')
    .select('face_id, collection_id, reference_storage_path')
    .eq('id', id)
    .single()

  if (fetchError || !person)
    return NextResponse.json({ error: 'Pessoa não encontrada.' }, { status: 404 })

  // Remove o rosto da collection do Rekognition
  if (person.face_id) {
    await deleteFaceFromCollection(person.face_id, person.collection_id).catch((err) => {
      console.error('[rekognition] Erro ao remover face da collection:', err)
    })
  }

  // Remove imagem de referência do Storage
  if (person.reference_storage_path) {
    await supabaseServer.storage
      .from(BUCKET)
      .remove([person.reference_storage_path])
      .catch(() => {})
  }

  // Remove do banco (cascata apaga matches)
  const { error: deleteError } = await supabaseServer
    .from('rekognition_people')
    .delete()
    .eq('id', id)

  if (deleteError)
    return NextResponse.json({ error: deleteError.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
