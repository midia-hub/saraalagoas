/**
 * Tela "Upload Facial" - MVP 1.
 * Fluxo: selecionar imagem → validar → enviar para bucket → exibir path/URL e payload.
 */

import { useCallback, useState } from 'react';
import {
  ALLOWED_MIME_TYPES,
  FACES_BUCKET,
  MAX_FILE_SIZE_BYTES,
  MIN_IMAGE_HEIGHT,
  MIN_IMAGE_WIDTH,
  N8N_WEBHOOK_URL,
} from '../lib/constants';
import {
  buildFaceGalleryStoragePath,
  insertFaceGalleryRecord,
} from '../lib/faceGallery';
import { sendImageToN8nWebhook } from '../lib/n8nWebhook';
import { isSupabaseConfigured } from '../lib/supabaseClient';
import { uploadFaceImage, type UploadResult } from '../lib/storage';

/** Destino do envio: Supabase (Storage + face_gallery) ou direto para n8n (webhook, sem banco) */
type UploadDestination = 'supabase' | 'n8n_webhook';

/** Estados possíveis do fluxo de upload */
type UploadState = 'idle' | 'selecionado' | 'enviando' | 'sucesso' | 'erro';

/** Payload para n8n (exibido após sucesso e enviado no placeholder) */
export interface N8nPayload {
  org_id: string;
  contact_id: string;
  bucket: string;
  path: string;
  file_name: string;
  mime_type: string;
  size_bytes: number;
  url: string | null;
  created_at_iso: string;
}

// Placeholders configuráveis (mock para MVP)
const ORG_ID = 'org_demo';
const CONTACT_ID = 'contact_demo';

/** Indica se o bucket é privado (usa signed URL). Altere conforme seu bucket no Supabase. */
const BUCKET_IS_PRIVATE = true;

/** Formata tamanho em bytes para KB ou MB */
function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

/** Valida dimensões mínimas da imagem via Image (opcional). Retorna mensagem de erro ou null. */
function validateImageDimensions(
  file: File,
  minW: number,
  minH: number
): Promise<string | null> {
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      if (img.naturalWidth < minW || img.naturalHeight < minH) {
        resolve(
          `Dimensões mínimas: ${minW}x${minH}px. Atual: ${img.naturalWidth}x${img.naturalHeight}px.`
        );
      } else {
        resolve(null);
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve('Não foi possível ler as dimensões da imagem.');
    };
    img.src = url;
  });
}

/** Validações síncronas: formato e tamanho. Retorna mensagem de erro ou null. */
function validateFile(file: File): string | null {
  if (!ALLOWED_MIME_TYPES.includes(file.type as (typeof ALLOWED_MIME_TYPES)[number])) {
    return `Formato não permitido. Use: ${ALLOWED_MIME_TYPES.join(', ')}`;
  }
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return `Arquivo muito grande. Máximo: ${formatSize(MAX_FILE_SIZE_BYTES)}`;
  }
  return null;
}

export default function UploadFacial() {
  const [destination, setDestination] = useState<UploadDestination>('supabase');
  const [webhookUrl, setWebhookUrl] = useState<string>(N8N_WEBHOOK_URL);
  const [state, setState] = useState<UploadState>('idle');
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [isError, setIsError] = useState(false);
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);
  const [payload, setPayload] = useState<N8nPayload | null>(null);
  const [n8nWebhookSuccess, setN8nWebhookSuccess] = useState(false);

  const clearPreview = useCallback(() => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
  }, [previewUrl]);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      clearPreview();
      setUploadResult(null);
      setPayload(null);
      setStatusMessage('');
      setIsError(false);

      const selected = e.target.files?.[0];
      if (!selected) {
        setFile(null);
        setState('idle');
        return;
      }

      const err = validateFile(selected);
      if (err) {
        setStatusMessage(err);
        setIsError(true);
        setFile(null);
        setState('idle');
        return;
      }

      setFile(selected);
      setPreviewUrl(URL.createObjectURL(selected));
      setState('selecionado');
    },
    [clearPreview]
  );

  const handleSend = useCallback(async () => {
    if (!file || state !== 'selecionado') return;

    setState('enviando');
    setStatusMessage('Enviando...');
    setIsError(false);
    setUploadResult(null);
    setPayload(null);
    setN8nWebhookSuccess(false);

    try {
      const dimErr = await validateImageDimensions(
        file,
        MIN_IMAGE_WIDTH,
        MIN_IMAGE_HEIGHT
      );
      if (dimErr) {
        setStatusMessage(dimErr);
        setIsError(true);
        setState('selecionado');
        return;
      }

      if (destination === 'n8n_webhook') {
        const url = webhookUrl.trim();
        if (!url) {
          setStatusMessage('Informe a URL do webhook n8n.');
          setIsError(true);
          setState('selecionado');
          return;
        }
        await sendImageToN8nWebhook(
          file,
          {
            org_id: ORG_ID,
            contact_id: CONTACT_ID,
            file_name: file.name,
            mime_type: file.type,
            size_bytes: file.size,
            created_at_iso: new Date().toISOString(),
          },
          url
        );
        setN8nWebhookSuccess(true);
        setStatusMessage('Imagem enviada para o n8n com sucesso (webhook).');
        setIsError(false);
        setState('sucesso');
        return;
      }

      // Fluxo Supabase: Storage + face_gallery
      const result = await uploadFaceImage({
        orgId: ORG_ID,
        contactId: CONTACT_ID,
        file,
        bucketIsPrivate: BUCKET_IS_PRIVATE,
      });

      const storagePath = buildFaceGalleryStoragePath(FACES_BUCKET, result.path);
      await insertFaceGalleryRecord({
        person_id: CONTACT_ID,
        org_id: ORG_ID,
        storage_path: storagePath,
        active: true,
      });

      setUploadResult(result);
      const created_at_iso = new Date().toISOString();
      const payloadData: N8nPayload = {
        org_id: ORG_ID,
        contact_id: CONTACT_ID,
        bucket: FACES_BUCKET,
        path: result.path,
        file_name: file.name,
        mime_type: file.type,
        size_bytes: file.size,
        url: result.url,
        created_at_iso,
      };
      setPayload(payloadData);

      if (result.urlGenerationFailed && !result.url) {
        setStatusMessage(
          'Upload concluído com sucesso. Path disponível; geração da URL falhou (sucesso parcial).'
        );
        setIsError(false);
      } else {
        setStatusMessage('Upload concluído com sucesso.');
        setIsError(false);
      }
      setState('sucesso');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro desconhecido no upload.';
      setStatusMessage(message);
      setIsError(true);
      setState('erro');
    }
  }, [file, state, destination, webhookUrl]);

  const copyToClipboard = useCallback((text: string) => {
    navigator.clipboard.writeText(text).then(
      () => setStatusMessage('Copiado para a área de transferência.'),
      () => setStatusMessage('Falha ao copiar.')
    );
  }, []);

  const sendToN8nPlaceholder = useCallback(() => {
    if (payload) {
      console.log('Payload para n8n (placeholder):', payload);
      setStatusMessage('Payload enviado para o console (placeholder n8n).');
    }
  }, [payload]);

  const handleReset = useCallback(() => {
    clearPreview();
    setFile(null);
    setUploadResult(null);
    setPayload(null);
    setN8nWebhookSuccess(false);
    setState('idle');
    setStatusMessage('');
    setIsError(false);
  }, [clearPreview]);

  const supabaseOk = isSupabaseConfigured();

  return (
    <div className="upload-facial">
      {!supabaseOk && (
        <div className="upload-facial-status upload-facial-status--error" role="alert">
          Supabase não configurado. Crie o arquivo <code>.env</code> na raiz do projeto com{' '}
          <code>VITE_SUPABASE_URL</code> e <code>VITE_SUPABASE_ANON_KEY</code> (copie do{' '}
          <code>.env.example</code>). Depois reinicie o servidor (<code>npm run dev</code>).
        </div>
      )}
      <h1>Upload Facial</h1>
      <p className="upload-facial-desc">
        Selecione uma imagem (PNG, JPEG ou WebP, até {formatSize(MAX_FILE_SIZE_BYTES)}).
      </p>

      <div className="upload-facial-destination">
        <span className="upload-facial-destination-label">Destino:</span>
        <label className="upload-facial-radio">
          <input
            type="radio"
            name="destination"
            checked={destination === 'supabase'}
            onChange={() => setDestination('supabase')}
            disabled={state === 'enviando'}
          />
          Supabase (Storage + face_gallery)
        </label>
        <label className="upload-facial-radio">
          <input
            type="radio"
            name="destination"
            checked={destination === 'n8n_webhook'}
            onChange={() => setDestination('n8n_webhook')}
            disabled={state === 'enviando'}
          />
          n8n webhook (sem banco, imagem em binary)
        </label>
      </div>

      {destination === 'n8n_webhook' && (
        <div className="upload-facial-webhook-url">
          <label htmlFor="webhook-url">URL do webhook:</label>
          <input
            id="webhook-url"
            type="url"
            value={webhookUrl}
            onChange={(e) => setWebhookUrl(e.target.value)}
            placeholder="https://n8n.../webhook/..."
            disabled={state === 'enviando'}
            className="upload-facial-webhook-input"
          />
        </div>
      )}

      <div className="upload-facial-zone">
        <input
          type="file"
          accept={ALLOWED_MIME_TYPES.join(',')}
          onChange={handleFileChange}
          disabled={state === 'enviando'}
          id="file-input"
          className="upload-facial-input"
        />
        <label htmlFor="file-input" className="upload-facial-label">
          {file ? `Arquivo: ${file.name}` : 'Clique para selecionar uma imagem'}
        </label>
      </div>

      {file && (
        <div className="upload-facial-info">
          <p><strong>Nome:</strong> {file.name}</p>
          <p><strong>Tamanho:</strong> {formatSize(file.size)}</p>
          <p><strong>Tipo (MIME):</strong> {file.type}</p>
        </div>
      )}

      {previewUrl && (
        <div className="upload-facial-preview">
          <p>Preview:</p>
          <img src={previewUrl} alt="Preview" className="upload-facial-preview-img" />
        </div>
      )}

      {(state === 'selecionado' || state === 'erro') &&
        (destination === 'n8n_webhook' || supabaseOk) && (
          <button
            type="button"
            onClick={handleSend}
            className="upload-facial-btn upload-facial-btn-primary"
          >
            Enviar
          </button>
        )}

      {state === 'enviando' && (
        <p className="upload-facial-status upload-facial-status--info">Enviando...</p>
      )}

      {statusMessage && (
        <div
          className={
            isError
              ? 'upload-facial-status upload-facial-status--error'
              : 'upload-facial-status upload-facial-status--success'
          }
          role="alert"
        >
          {statusMessage}
        </div>
      )}

      {state === 'sucesso' && n8nWebhookSuccess && (
        <p className="upload-facial-desc">
          Nenhum dado foi gravado no banco; a imagem foi enviada em binary para o webhook n8n.
        </p>
      )}

      {state === 'sucesso' && uploadResult && (
        <div className="upload-facial-result">
          <h2>Resultado do upload</h2>
          <div className="upload-facial-result-row">
            <strong>Path:</strong>
            <code>{uploadResult.path}</code>
            <button
              type="button"
              className="upload-facial-btn upload-facial-btn-small"
              onClick={() => copyToClipboard(uploadResult.path)}
            >
              Copiar path
            </button>
          </div>
          {uploadResult.url && (
            <div className="upload-facial-result-row">
              <strong>URL:</strong>
              <code className="upload-facial-url">{uploadResult.url}</code>
              <button
                type="button"
                className="upload-facial-btn upload-facial-btn-small"
                onClick={() => copyToClipboard(uploadResult.url!)}
              >
                Copiar URL
              </button>
            </div>
          )}
        </div>
      )}

      {state === 'sucesso' && payload && (
        <div className="upload-facial-payload">
          <h2>Payload (para n8n)</h2>
          <pre className="upload-facial-payload-json">
            {JSON.stringify(payload, null, 2)}
          </pre>
          <button
            type="button"
            className="upload-facial-btn upload-facial-btn-secondary"
            onClick={sendToN8nPlaceholder}
          >
            Enviar para n8n (placeholder)
          </button>
        </div>
      )}

      {state === 'sucesso' && (
        <button
          type="button"
          className="upload-facial-btn upload-facial-btn-outline"
          onClick={handleReset}
        >
          Novo upload
        </button>
      )}
    </div>
  );
}
