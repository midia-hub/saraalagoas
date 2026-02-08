/**
 * Funções de Storage do Supabase para upload e obtenção de URL de imagens faciais.
 * Suporta bucket público (getPublicUrl) e bucket privado (createSignedUrl).
 */

import { supabase } from './supabaseClient';
import { FACES_BUCKET, SIGNED_URL_EXPIRES_IN } from './constants';

/** Resultado do upload com path e URL (quando disponível) */
export interface UploadResult {
  path: string;
  /** URL pública (bucket público) ou signed URL (bucket privado). Null se falhou ao gerar. */
  url: string | null;
  /** true se o upload foi feito mas a geração da URL falhou (sucesso parcial) */
  urlGenerationFailed?: boolean;
}

/** Opções para upload */
export interface UploadOptions {
  orgId: string;
  contactId: string;
  file: File;
  /** Se true, bucket é tratado como privado e usamos signed URL */
  bucketIsPrivate?: boolean;
}

/**
 * Monta o path no bucket: pending/{orgId}/{contactId}/{timestamp}-{filename}
 * Usa o nome original do arquivo para facilitar debug; o timestamp evita colisão.
 */
function buildStoragePath(orgId: string, contactId: string, fileName: string): string {
  const timestamp = Date.now();
  const sanitized = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
  return `pending/${orgId}/${contactId}/${timestamp}-${sanitized}`;
}

/**
 * Faz upload da imagem para o bucket "faces" no Supabase Storage.
 * Retorna o path e a URL (pública ou signed, conforme configuração).
 */
export async function uploadFaceImage(options: UploadOptions): Promise<UploadResult> {
  if (!supabase) {
    throw new Error(
      'Supabase não configurado. Crie o arquivo .env com VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY (veja .env.example).'
    );
  }

  const { orgId, contactId, file, bucketIsPrivate = true } = options;
  const path = buildStoragePath(orgId, contactId, file.name);
  const contentType = file.type;

  const { data, error } = await supabase.storage
    .from(FACES_BUCKET)
    .upload(path, file, {
      upsert: false,
      contentType,
    });

  if (error) {
    throw new Error(
      `Falha no upload: ${error.message}. ` +
        (error.message.includes('Bucket not found')
          ? 'Crie o bucket "' + FACES_BUCKET + '" no Supabase Storage.'
          : 'Verifique permissões e nome do bucket.')
    );
  }

  if (!data?.path) {
    throw new Error('Upload retornou sem path. Tente novamente.');
  }

  let url: string | null = null;
  let urlGenerationFailed = false;

  try {
    if (bucketIsPrivate) {
      const { data: signed, error: signedError } = await supabase.storage
        .from(FACES_BUCKET)
        .createSignedUrl(data.path, SIGNED_URL_EXPIRES_IN);

      if (signedError) {
        urlGenerationFailed = true;
        console.warn('Signed URL falhou:', signedError.message);
      } else if (signed?.signedUrl) {
        url = signed.signedUrl;
      }
    } else {
      const { data: publicData } = supabase.storage
        .from(FACES_BUCKET)
        .getPublicUrl(data.path);
      url = publicData?.publicUrl ?? null;
    }
  } catch (e) {
    urlGenerationFailed = true;
    console.warn('Erro ao gerar URL:', e);
  }

  return {
    path: data.path,
    url,
    urlGenerationFailed: urlGenerationFailed || (bucketIsPrivate && !url),
  };
}

/**
 * Obtém URL para uma imagem já armazenada.
 * - Bucket público: retorna getPublicUrl(path).
 * - Bucket privado: retorna createSignedUrl(path, expiresIn) (assíncrono).
 */
export async function getFaceImageUrl(
  path: string,
  options: { bucketIsPrivate?: boolean; expiresIn?: number } = {}
): Promise<string> {
  if (!supabase) {
    throw new Error('Supabase não configurado. Configure o .env.');
  }

  const { bucketIsPrivate = true, expiresIn = SIGNED_URL_EXPIRES_IN } = options;

  if (bucketIsPrivate) {
    const { data } = await supabase.storage
      .from(FACES_BUCKET)
      .createSignedUrl(path, expiresIn);
    return data?.signedUrl ?? '';
  }

  const { data } = supabase.storage.from(FACES_BUCKET).getPublicUrl(path);
  return data?.publicUrl ?? '';
}
