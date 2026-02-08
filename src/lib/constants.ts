/**
 * Constantes configuráveis do upload de imagens faciais.
 * Ajuste aqui bucket, tamanho máximo e formatos permitidos.
 */

/** Nome do bucket no Supabase Storage onde as imagens serão enviadas */
export const FACES_BUCKET = 'faces';

/** Tamanho máximo do arquivo em bytes (5MB padrão) */
export const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;

/** Dimensões mínimas da imagem (largura e altura em pixels) - validação opcional */
export const MIN_IMAGE_WIDTH = 256;
export const MIN_IMAGE_HEIGHT = 256;

/** Tipos MIME aceitos para upload */
export const ALLOWED_MIME_TYPES = [
  'image/png',
  'image/jpeg',
  'image/webp',
] as const;

export type AllowedMimeType = (typeof ALLOWED_MIME_TYPES)[number];

/** Extensões correspondentes (apenas para exibição/documentação) */
export const ALLOWED_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.webp'];

/** Tempo de expiração da signed URL em segundos (1 hora) */
export const SIGNED_URL_EXPIRES_IN = 3600;

/**
 * URL do webhook n8n para envio direto de imagem (sem Supabase).
 * Pode ser sobrescrita no .env com VITE_N8N_WEBHOOK_URL.
 */
export const N8N_WEBHOOK_URL =
  import.meta.env.VITE_N8N_WEBHOOK_URL ||
  'https://n8n.srv1344631.hstgr.cloud/webhook/f6b51638-d4cd-4d51-b14c-4fafa077eee4';
