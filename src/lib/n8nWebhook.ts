/**
 * Envio de imagem direto para o webhook n8n (sem usar Supabase).
 * A imagem é enviada em binary via multipart/form-data junto com metadados.
 */

import { N8N_WEBHOOK_URL } from './constants';

export interface N8nWebhookMetadata {
  org_id: string;
  contact_id: string;
  file_name: string;
  mime_type: string;
  size_bytes: number;
  created_at_iso: string;
}

/**
 * Envia a imagem para o webhook n8n em multipart/form-data:
 * - Campo "file": arquivo em binary (imagem)
 * - Campos de texto: org_id, contact_id, file_name, mime_type, size_bytes, created_at_iso
 * @param webhookUrl URL do webhook (se vazia, usa N8N_WEBHOOK_URL das constantes)
 */
export async function sendImageToN8nWebhook(
  file: File,
  metadata: N8nWebhookMetadata,
  webhookUrl?: string
): Promise<void> {
  const url = (webhookUrl && webhookUrl.trim()) || N8N_WEBHOOK_URL;
  const form = new FormData();
  form.append('file', file, file.name);
  form.append('org_id', metadata.org_id);
  form.append('contact_id', metadata.contact_id);
  form.append('file_name', metadata.file_name);
  form.append('mime_type', metadata.mime_type);
  form.append('size_bytes', String(metadata.size_bytes));
  form.append('created_at_iso', metadata.created_at_iso);

  const res = await fetch(url, {
    method: 'POST',
    body: form,
    // Não definir Content-Type; o browser define multipart/form-data com boundary
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(
      `Webhook n8n respondeu com ${res.status}: ${text || res.statusText}. Verifique a URL e se o workflow está ativo.`
    );
  }
}
