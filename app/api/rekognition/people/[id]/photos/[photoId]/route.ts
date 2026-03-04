/**
 * DELETE /api/rekognition/people/[id]/photos/[photoId]
 *
 * Remove uma foto de referência específica de uma pessoa.
 * Não permite remover se for a única foto restante.
 */
import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'
import { requireAccess } from '@/lib/admin-api'
import { deleteFaceFromCollection } from '@/lib/rekognition'

const BUCKET = 'rekognition-references'

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string; photoId: string }> }
) {
  const access = await requireAccess(request, { pageKey: 'galeria', action: 'delete' })
  if (!access.ok) return access.response

  const { id: personId, photoId } = await context.params

  // Busca a foto a remover
  const { data: photo, error: photoError } = await supabaseServer
    .from('rekognition_people_photos')
    .select('id, face_id, storage_path, person_id')
    .eq('id', photoId)
    .eq('person_id', personId)
    .single()

  if (photoError || !photo)
    return NextResponse.json({ error: 'Foto não encontrada.' }, { status: 404 })

  // Não permite remover se for a única foto
  const { count } = await supabaseServer
    .from('rekognition_people_photos')
    .select('id', { count: 'exact', head: true })
    .eq('person_id', personId)

  if ((count ?? 0) <= 1)
    return NextResponse.json(
      { error: 'Não é possível remover a única foto de referência. Adicione outra primeiro.' },
      { status: 400 }
    )

  // Busca dados da pessoa para pegar collection_id
  const { data: person } = await supabaseServer
    .from('rekognition_people')
    .select('collection_id, reference_storage_path')
    .eq('id', personId)
    .single()

  // Remove do Rekognition
  await deleteFaceFromCollection(photo.face_id, person?.collection_id).catch(() => {})

  // Remove do Storage
  await supabaseServer.storage.from(BUCKET).remove([photo.storage_path]).catch(() => {})

  // Remove do banco
  const { error: deleteError } = await supabaseServer
    .from('rekognition_people_photos')
    .delete()
    .eq('id', photoId)

  if (deleteError)
    return NextResponse.json({ error: deleteError.message }, { status: 500 })

  // Se era a foto principal da pessoa, atualiza reference_url/face_id com a próxima disponível
  if (person?.reference_storage_path === photo.storage_path) {
    const { data: next } = await supabaseServer
      .from('rekognition_people_photos')
      .select('face_id, storage_path, photo_url')
      .eq('person_id', personId)
      .order('created_at', { ascending: true })
      .limit(1)
      .single()

    if (next) {
      await supabaseServer
        .from('rekognition_people')
        .update({
          face_id: next.face_id,
          reference_storage_path: next.storage_path,
          reference_url: next.photo_url,
          updated_at: new Date().toISOString(),
        })
        .eq('id', personId)
    }
  }

  return NextResponse.json({ ok: true })
}
