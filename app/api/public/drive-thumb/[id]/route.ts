/**
 * GET /api/public/drive-thumb/[id]?w=400
 *
 * Proxy autenticado para thumbnails do Google Drive.
 * Usa a service account para buscar o arquivo (que não é público)
 * e serve JPEG redimensionado com cache imutável de 1 ano.
 */
import { NextRequest, NextResponse } from 'next/server'
import { google } from 'googleapis'
import sharp from 'sharp'
import fs from 'fs'
import path from 'path'

// ─── Auth (mesmo padrão de lib/drive.ts) ─────────────────────────────────────

function normalizePem(key: string) {
  return key
    .replace(/-----BEGINPRIVATEKEY-----/g, '-----BEGIN PRIVATE KEY-----')
    .replace(/-----ENDPRIVATEKEY-----/g, '-----END PRIVATE KEY-----')
}

function loadCreds(): { client_email: string; private_key: string } {
  const jsonEnv = process.env.GOOGLE_SERVICE_ACCOUNT_JSON
  if (jsonEnv?.trim()) {
    try {
      const trimmed = jsonEnv.trim()
      const parsed = JSON.parse(
        trimmed.startsWith('{') ? trimmed : Buffer.from(trimmed, 'base64').toString('utf8')
      ) as Record<string, unknown>
      if (typeof parsed.client_email === 'string' && typeof parsed.private_key === 'string') {
        return {
          client_email: parsed.client_email,
          private_key: normalizePem(parsed.private_key),
        }
      }
    } catch { /* continua */ }
  }
  const credPath = process.env.GOOGLE_APPLICATION_CREDENTIALS || process.env.GOOGLE_SERVICE_ACCOUNT_JSON_FILE
  if (credPath) {
    const resolved = path.isAbsolute(credPath) ? credPath : path.resolve(process.cwd(), credPath)
    const raw = fs.readFileSync(resolved, 'utf8')
    const parsed = JSON.parse(raw) as Record<string, unknown>
    return {
      client_email: parsed.client_email as string,
      private_key: normalizePem(parsed.private_key as string),
    }
  }
  return {
    client_email: process.env.GOOGLE_CLIENT_EMAIL ?? '',
    private_key: process.env.GOOGLE_PRIVATE_KEY ?? '',
  }
}

function getDriveClient() {
  const { client_email, private_key } = loadCreds()
  const auth = new google.auth.GoogleAuth({
    credentials: { client_email, private_key: private_key.replace(/\\n/g, '\n') },
    scopes: ['https://www.googleapis.com/auth/drive.readonly'],
  })
  return google.drive({ version: 'v3', auth })
}

// ─── Route ────────────────────────────────────────────────────────────────────

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id: fileId } = await context.params
  if (!fileId) return new NextResponse('Missing id', { status: 400 })

  // Largura desejada — default 400, máximo 1600
  const wParam = Number(request.nextUrl.searchParams.get('w') ?? '400')
  const width = Math.min(Math.max(wParam || 400, 50), 1600)

  try {
    const drive = getDriveClient()

    // Faz download do arquivo via service account
    const res = await drive.files.get(
      { fileId, alt: 'media', supportsAllDrives: true },
      { responseType: 'arraybuffer' }
    )

    const buffer = Buffer.from(res.data as ArrayBuffer)

    // Redimensiona mantendo proporção, converte para JPEG com qualidade 85
    const resized = await sharp(buffer)
      .resize({ width, withoutEnlargement: true })
      .jpeg({ quality: 85, progressive: true })
      .toBuffer()

    return new NextResponse(new Uint8Array(resized), {
      status: 200,
      headers: {
        'Content-Type': 'image/jpeg',
        // Cache de 1 ano no browser + CDN — o fileId é imutável
        'Cache-Control': 'public, max-age=31536000, immutable',
        'X-Drive-File-Id': fileId,
      },
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erro desconhecido'
    console.error(`[drive-thumb] ${fileId}:`, msg)
    return new NextResponse('Erro ao buscar imagem', { status: 500 })
  }
}
