import fs from 'fs'
import path from 'path'
import { Readable } from 'stream'
import { google } from 'googleapis'

export interface DriveImageFile {
  id: string
  name: string
  mimeType: string
  webViewLink: string | null
  thumbnailLink: string | null
  createdTime: string | null
  viewUrl: string
}

function getRootFolderId(): string {
  const rootId = process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID || process.env.GOOGLE_DRIVE_FOLDER_ID
  if (!rootId) throw new Error('Defina GOOGLE_DRIVE_ROOT_FOLDER_ID no servidor.')
  return rootId
}

const DRIVE_SCOPES = ['https://www.googleapis.com/auth/drive']

function parseCredentialsJson(jsonRaw: string): unknown {
  const trimmed = jsonRaw.trim()
  return trimmed.startsWith('{')
    ? JSON.parse(trimmed)
    : JSON.parse(Buffer.from(trimmed, 'base64').toString('utf8'))
}

function loadCredentialsFromJson(jsonRaw: string): { client_email: string; private_key: string } {
  try {
    const parsed = parseCredentialsJson(jsonRaw) as Record<string, unknown>
    if (parsed && typeof parsed.client_email === 'string' && typeof parsed.private_key === 'string') {
      return { client_email: parsed.client_email, private_key: parsed.private_key }
    }
  } catch {
    // ignore
  }
  throw new Error('GOOGLE_SERVICE_ACCOUNT_JSON inválido. Use o JSON da chave da API (Service Account).')
}

function getAuth(): import('google-auth-library').GoogleAuth {
  let clientEmail: string | undefined
  let privateKey: string | undefined

  // 1) GOOGLE_SERVICE_ACCOUNT_JSON (Vercel e produção) — JSON da Service Account minificado em uma linha
  const jsonEnv = process.env.GOOGLE_SERVICE_ACCOUNT_JSON
  if (jsonEnv && jsonEnv.trim()) {
    try {
      const creds = loadCredentialsFromJson(jsonEnv)
      clientEmail = creds.client_email
      privateKey = creds.private_key
    } catch {
      // JSON inválido; seguir para arquivo ou e-mail+chave
    }
  }

  // 2) Arquivo no servidor (desenvolvimento local)
  const credentialsPath =
    process.env.GOOGLE_APPLICATION_CREDENTIALS || process.env.GOOGLE_SERVICE_ACCOUNT_JSON_FILE
  if ((!clientEmail || !privateKey) && credentialsPath) {
    try {
      const resolved = path.isAbsolute(credentialsPath)
        ? credentialsPath
        : path.resolve(process.cwd(), credentialsPath)
      const jsonRaw = fs.readFileSync(resolved, 'utf8')
      const creds = loadCredentialsFromJson(jsonRaw)
      clientEmail = creds.client_email
      privateKey = creds.private_key
    } catch {
      // Arquivo não encontrado (ex.: Vercel) — seguir para e-mail + chave
    }
  }

  // 3) E-mail e chave separados
  if (!clientEmail || !privateKey) {
    clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || process.env.GOOGLE_CLIENT_EMAIL
    privateKey = process.env.GOOGLE_PRIVATE_KEY
  }

  if (!clientEmail || !privateKey) {
    throw new Error(
      'Credenciais do Google Drive ausentes. Defina GOOGLE_SERVICE_ACCOUNT_JSON (JSON da Service Account minificado) na Vercel. Veja docs/VERCEL-DRIVE-ENV.md.'
    )
  }

  return new google.auth.GoogleAuth({
    credentials: {
      client_email: clientEmail,
      private_key: privateKey.replace(/\\n/g, '\n'),
    },
    scopes: DRIVE_SCOPES,
  })
}

async function getDriveClient() {
  const auth = getAuth()
  return google.drive({ version: 'v3', auth })
}

async function findFolderByName(parentId: string, name: string): Promise<string | null> {
  const drive = await getDriveClient()
  const escaped = name.replace(/'/g, "\\'")
  const { data } = await drive.files.list({
    q: `'${parentId}' in parents and name = '${escaped}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
    fields: 'files(id, name)',
    pageSize: 1,
    supportsAllDrives: true,
    includeItemsFromAllDrives: true,
  })
  return data.files?.[0]?.id || null
}

async function createFolder(parentId: string, name: string): Promise<string> {
  const drive = await getDriveClient()
  const { data } = await drive.files.create({
    requestBody: {
      name,
      mimeType: 'application/vnd.google-apps.folder',
      parents: [parentId],
    },
    fields: 'id',
    supportsAllDrives: true,
  })
  if (!data.id) throw new Error(`Falha ao criar pasta "${name}" no Drive.`)
  return data.id
}

export async function getOrCreateFolder(parentId: string, name: string): Promise<string> {
  const existing = await findFolderByName(parentId, name)
  if (existing) return existing
  return createFolder(parentId, name)
}

/** Remove um arquivo do Drive (por ID). Não lança se o arquivo já não existir. */
export async function deleteFileFromDrive(fileId: string): Promise<void> {
  const drive = await getDriveClient()
  try {
    await drive.files.delete({
      fileId,
      supportsAllDrives: true,
    })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    if (msg.includes('404') || msg.includes('not found') || msg.includes('File not found')) {
      return
    }
    throw e
  }
}

/** Verifica se a pasta existe e a service account tem acesso (pastas compartilhadas exigem supportsAllDrives). */
async function checkFolderAccessible(folderId: string): Promise<void> {
  const drive = await getDriveClient()
  try {
    await drive.files.get({
      fileId: folderId,
      fields: 'id, name, mimeType',
      supportsAllDrives: true,
    })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    if (msg.includes('404') || msg.includes('File not found') || msg.includes('not found')) {
      throw new Error(
        `Pasta do Drive não encontrada ou sem acesso (ID: ${folderId}). Compartilhe a pasta com o e-mail da service account (Editor) e use GOOGLE_DRIVE_ROOT_FOLDER_ID com o ID da pasta.`
      )
    }
    throw e
  }
}

export async function ensureDrivePath(parts: string[]): Promise<string> {
  const rootId = getRootFolderId()
  await checkFolderAccessible(rootId)
  let currentId = rootId
  for (const part of parts) {
    currentId = await getOrCreateFolder(currentId, part)
  }
  return currentId
}

export async function uploadImageToFolder(
  folderId: string,
  file: { name: string; mimeType: string; buffer: Buffer }
): Promise<DriveImageFile> {
  const drive = await getDriveClient()

  const created = await drive.files.create({
    requestBody: {
      name: file.name,
      parents: [folderId],
    },
    media: {
      mimeType: file.mimeType,
      body: Readable.from(file.buffer),
    },
    fields: 'id',
    supportsAllDrives: true,
  })

  if (!created.data.id) throw new Error('Upload no Drive não retornou ID.')

  const detail = await drive.files.get({
    fileId: created.data.id,
    fields: 'id, name, mimeType, webViewLink, thumbnailLink, createdTime',
    supportsAllDrives: true,
  })

  const d = detail.data
  return {
    id: d.id || created.data.id,
    name: d.name || file.name,
    mimeType: d.mimeType || file.mimeType,
    webViewLink: d.webViewLink || null,
    thumbnailLink: d.thumbnailLink || null,
    createdTime: d.createdTime || null,
    viewUrl: `https://drive.google.com/uc?export=view&id=${created.data.id}`,
  }
}

export async function listFolderImages(folderId: string): Promise<DriveImageFile[]> {
  const drive = await getDriveClient()

  const { data } = await drive.files.list({
    q: `'${folderId}' in parents and mimeType contains 'image/' and trashed = false`,
    fields: 'files(id, name, mimeType, webViewLink, thumbnailLink, createdTime)',
    orderBy: 'createdTime desc',
    pageSize: 500,
    supportsAllDrives: true,
    includeItemsFromAllDrives: true,
  })

  return (data.files || [])
    .filter((f) => f.id && f.name)
    .map((f) => ({
      id: f.id || '',
      name: f.name || '',
      mimeType: f.mimeType || '',
      webViewLink: f.webViewLink || null,
      thumbnailLink: f.thumbnailLink || null,
      createdTime: f.createdTime || null,
      viewUrl: `https://drive.google.com/uc?export=view&id=${f.id}`,
    }))
}

/** Baixa o conteúdo de um arquivo do Drive (para proxy de imagens). Retorna stream e contentType. */
export async function getFileDownloadStream(fileId: string): Promise<{
  stream: import('stream').Readable
  contentType: string
}> {
  const drive = await getDriveClient()
  const meta = await drive.files.get({
    fileId,
    fields: 'mimeType',
    supportsAllDrives: true,
  })
  const mimeType = meta.data.mimeType || 'application/octet-stream'
  const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
  const contentType = allowed.includes(mimeType) ? mimeType : 'image/jpeg'

  const res = await drive.files.get(
    { fileId, alt: 'media', supportsAllDrives: true },
    { responseType: 'stream' }
  )
  const stream = res.data as import('stream').Readable
  return { stream, contentType }
}

/** Baixa o arquivo do Drive como buffer (útil para upload em outros serviços). */
export async function getFileDownloadBuffer(fileId: string): Promise<{
  buffer: Buffer
  contentType: string
}> {
  const { stream, contentType } = await getFileDownloadStream(fileId)
  const chunks: Buffer[] = []
  for await (const chunk of stream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
  }
  return { buffer: Buffer.concat(chunks), contentType }
}

function resizeThumbnailUrl(thumbnailUrl: string, size: number): string {
  const safeSize = Math.max(120, Math.min(size, 1024))
  if (/=s\d+/.test(thumbnailUrl)) {
    return thumbnailUrl.replace(/=s\d+/, `=s${safeSize}`)
  }
  return `${thumbnailUrl}=s${safeSize}`
}

async function getDriveAccessToken(): Promise<string> {
  const auth = getAuth()
  const token = await auth.getAccessToken()
  if (!token) throw new Error('Não foi possível obter access token do Google Drive.')
  if (typeof token === 'string') return token
  if (typeof token === 'object' && token && 'token' in token) {
    const typed = token as { token?: string }
    if (typed.token) return typed.token
  }
  throw new Error('Token de acesso do Google Drive inválido.')
}

/**
 * Busca thumbnail via Drive (bem menor que o arquivo original), útil para grades.
 * Retorna null quando o Drive não fornece thumbnail ou em qualquer erro (para permitir fallback para download completo).
 */
export async function getFileThumbnailBuffer(
  fileId: string,
  size = 480
): Promise<{ buffer: Buffer; contentType: string } | null> {
  try {
    const drive = await getDriveClient()
    const meta = await drive.files.get({
      fileId,
      fields: 'thumbnailLink',
      supportsAllDrives: true,
    })

    const thumbnailLink = meta.data.thumbnailLink
    if (!thumbnailLink) return null

    const accessToken = await getDriveAccessToken()
    const response = await fetch(resizeThumbnailUrl(thumbnailLink, size), {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    })
    if (!response.ok) return null

    const contentType = response.headers.get('content-type') || 'image/jpeg'
    const buffer = Buffer.from(await response.arrayBuffer())
    return { buffer, contentType }
  } catch {
    return null
  }
}

