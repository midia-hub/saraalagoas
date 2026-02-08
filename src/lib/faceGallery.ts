/**
 * Registro de imagens na tabela face_gallery (candidatas para facial scan).
 * Chamado após upload bem-sucedido no Storage.
 */

import { supabase } from './supabaseClient';
import { FACES_BUCKET } from './constants';

export interface FaceGalleryInsert {
  person_id: string;
  org_id: string;
  storage_path: string;
  active?: boolean;
}

/**
 * Registra uma nova imagem na face_gallery após o upload.
 * storage_path deve ser no formato "faces/pending/org_id/person_id/arquivo" (bucket + path).
 */
export async function insertFaceGalleryRecord(
  params: FaceGalleryInsert
): Promise<{ id: string }> {
  if (!supabase) {
    throw new Error(
      'Supabase não configurado. Crie o arquivo .env com VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY.'
    );
  }

  const { person_id, org_id, storage_path, active = true } = params;

  const { data, error } = await supabase
    .from('face_gallery')
    .insert({
      person_id,
      org_id,
      storage_path,
      active,
    })
    .select('id')
    .single();

  if (error) {
    throw new Error(
      `Falha ao registrar na face_gallery: ${error.message}. ` +
        'Verifique se a tabela existe e se as políticas RLS permitem INSERT (veja supabase-face-gallery.sql).'
    );
  }

  if (!data?.id) {
    throw new Error('Inserção na face_gallery não retornou id.');
  }

  return { id: data.id };
}

/**
 * Monta o storage_path no formato esperado: bucket/path (ex: faces/pending/org_demo/contact_demo/123-file.jpg).
 */
export function buildFaceGalleryStoragePath(bucket: string, pathInBucket: string): string {
  return `${bucket}/${pathInBucket}`;
}
