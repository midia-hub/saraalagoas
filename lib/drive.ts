/**
 * Cliente Google Drive para upload e gerenciamento de fotos
 */

import { google } from 'googleapis'
import type { drive_v3 } from 'googleapis'

// Tipos
export interface DriveFile {
  id: string
  name: string
  webViewLink?: string | null
  thumbnailLink?: string | null
  mimeType?: string | null
  createdTime?: string | null
}

export interface DriveFolder {
  id: string
  name: string
  webViewLink?: string | null
}

// Configuração do cliente Google Drive
let driveClient: drive_v3.Drive | null = null

async function getDriveClient(): Promise<drive_v3.Drive> {
  if (driveClient) {
    return driveClient
  }

  const scope = ['https://www.googleapis.com/auth/drive']

  // E-mail do usuário em nome de quem a conta de serviço age (Domain-Wide Delegation).
  // Quando definido, os arquivos usam a cota desse usuário e o erro de "storage quota" some.
  const impersonateEmail = process.env.GOOGLE_DRIVE_IMPERSONATE_EMAIL?.trim() || undefined

  // Opção 1: JSON completo da conta de serviço
  const serviceAccountJson = process.env.GOOGLE_SERVICE_ACCOUNT_JSON?.trim()
  if (serviceAccountJson) {
    try {
      const credentials = JSON.parse(serviceAccountJson)
      if (!credentials.client_email || !credentials.private_key) {
        throw new Error('JSON inválido: faltam client_email ou private_key.')
      }
      const auth = new google.auth.JWT({
        email: credentials.client_email,
        key: credentials.private_key,
        scopes: scope,
        subject: impersonateEmail,
      })
      driveClient = google.drive({ version: 'v3', auth })
      return driveClient
    } catch (error) {
      if (error instanceof SyntaxError) {
        throw new Error('GOOGLE_SERVICE_ACCOUNT_JSON não é um JSON válido.')
      }
      throw error
    }
  }

  // Opção 2: E-mail + chave privada (variáveis separadas no .env)
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL?.trim()
  const privateKey = process.env.GOOGLE_PRIVATE_KEY?.trim()
  if (email && privateKey) {
    const formattedKey = privateKey.includes('\\n') ? privateKey.replace(/\\n/g, '\n') : privateKey
    const auth = new google.auth.JWT({
      email,
      key: formattedKey,
      scopes: scope,
      subject: impersonateEmail,
    })
    driveClient = google.drive({ version: 'v3', auth })
    return driveClient
  }

  throw new Error(
    'Configure no .env: GOOGLE_SERVICE_ACCOUNT_JSON (JSON completo) ou GOOGLE_SERVICE_ACCOUNT_EMAIL + GOOGLE_PRIVATE_KEY. E também GOOGLE_DRIVE_ROOT_FOLDER_ID.'
  )
}

/**
 * Cria uma pasta no Google Drive.
 * Se driveId for passado (Shared Drive), usa corpora/driveId na listagem.
 */
export async function createFolder(
  folderName: string,
  parentFolderId: string,
  sharedDriveId?: string | null
): Promise<DriveFolder> {
  const drive = await getDriveClient()

  const listParams: drive_v3.Params$Resource$Files$List = {
    q: `name='${folderName.replace(/'/g, "\\'")}' and '${parentFolderId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`,
    fields: 'files(id, name, webViewLink)',
    spaces: 'drive',
    supportsAllDrives: true,
    includeItemsFromAllDrives: true,
  }
  if (sharedDriveId) {
    listParams.corpora = 'drive'
    listParams.driveId = sharedDriveId
  }

  const existingFolderResponse = await drive.files.list(listParams)

  if (existingFolderResponse.data.files && existingFolderResponse.data.files.length > 0) {
    const folder = existingFolderResponse.data.files[0]
    return {
      id: folder.id!,
      name: folder.name!,
      webViewLink: folder.webViewLink,
    }
  }

  // Criar nova pasta
  const folderMetadata: drive_v3.Schema$File = {
    name: folderName,
    mimeType: 'application/vnd.google-apps.folder',
    parents: [parentFolderId],
  }

  const response = await drive.files.create({
    requestBody: folderMetadata,
    fields: 'id, name, webViewLink',
    supportsAllDrives: true,
  })

  return {
    id: response.data.id!,
    name: response.data.name!,
    webViewLink: response.data.webViewLink,
  }
}

/**
 * Obtém o driveId da pasta (quando a pasta está em um Shared Drive).
 */
async function getDriveIdOfFolder(folderId: string): Promise<string | null> {
  const drive = await getDriveClient()
  try {
    const res = await drive.files.get({
      fileId: folderId,
      fields: 'driveId',
      supportsAllDrives: true,
    })
    return (res.data as { driveId?: string }).driveId ?? null
  } catch {
    return null
  }
}

/**
 * Cria a estrutura de pastas para uma galeria
 * Formato: /{DRIVE_ROOT_FOLDER}/{ANO}/{tipo}/{slug}/{YYYY-MM-DD}
 * Suporta pasta no "Meu Drive" (compartilhada) ou pasta em Drive compartilhado.
 */
export async function createGalleryFolderStructure(
  type: 'culto' | 'evento',
  slug: string,
  date: Date
): Promise<DriveFolder> {
  const rootFolderId = (process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID || '').trim()
  if (!rootFolderId || rootFolderId.length < 10 || rootFolderId.includes('..')) {
    throw new Error(
      'GOOGLE_DRIVE_ROOT_FOLDER_ID inválido ou vazio. Use o ID da pasta do Drive (URL: .../folders/ID).'
    )
  }

  // Se a pasta raiz está em um Shared Drive, obter driveId para as operações
  const sharedDriveId = await getDriveIdOfFolder(rootFolderId) ?? undefined

  const slugName = (slug || '').trim() || 'galeria'
  const year = date.getFullYear().toString()
  const dateStr = date.toISOString().split('T')[0] // YYYY-MM-DD

  const yearFolder = await createFolder(year, rootFolderId, sharedDriveId)
  const typeFolder = await createFolder(type, yearFolder.id, sharedDriveId)
  const slugFolder = await createFolder(slugName, typeFolder.id, sharedDriveId)
  const dateFolder = await createFolder(dateStr, slugFolder.id, sharedDriveId)

  return dateFolder
}

/** MIME types aceitos para imagens; fallback se o cliente não enviar. */
const FALLBACK_MIME = 'application/octet-stream'
const IMAGE_MIMES: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  gif: 'image/gif',
  webp: 'image/webp',
}

/**
 * Faz upload de um arquivo para o Google Drive.
 * A API do Google espera um stream com .pipe(); convertemos o Buffer em Readable.
 */
export async function uploadFile(
  fileBuffer: Buffer,
  fileName: string,
  mimeType: string,
  folderId: string
): Promise<DriveFile> {
  const drive = await getDriveClient()
  const { Readable } = require('stream') as typeof import('stream')

  const resolvedMime =
    mimeType && mimeType !== ''
      ? mimeType
      : (() => {
          const ext = fileName.split('.').pop()?.toLowerCase()
          return (ext && IMAGE_MIMES[ext]) || FALLBACK_MIME
        })()

  const fileMetadata: drive_v3.Schema$File = {
    name: fileName,
    parents: [folderId],
  }

  const media = {
    mimeType: resolvedMime,
    body: Readable.from(fileBuffer),
  }

  const response = await drive.files.create({
    requestBody: fileMetadata,
    media,
    fields: 'id, name, webViewLink, thumbnailLink, mimeType, createdTime',
    supportsAllDrives: true,
  })

  return {
    id: response.data.id!,
    name: response.data.name!,
    webViewLink: response.data.webViewLink,
    thumbnailLink: response.data.thumbnailLink,
    mimeType: response.data.mimeType,
    createdTime: response.data.createdTime,
  }
}

/**
 * Lista arquivos de uma pasta no Google Drive
 */
export async function listFilesInFolder(folderId: string): Promise<DriveFile[]> {
  const drive = await getDriveClient()

  const response = await drive.files.list({
    q: `'${folderId}' in parents and mimeType contains 'image/' and trashed=false`,
    fields: 'files(id, name, webViewLink, thumbnailLink, mimeType, createdTime)',
    orderBy: 'createdTime',
    spaces: 'drive',
    supportsAllDrives: true,
    includeItemsFromAllDrives: true,
  })

  return (response.data.files || []).map((file) => ({
    id: file.id!,
    name: file.name!,
    webViewLink: file.webViewLink,
    thumbnailLink: file.thumbnailLink,
    mimeType: file.mimeType,
    createdTime: file.createdTime,
  }))
}

/**
 * Torna uma pasta pública (qualquer pessoa com o link pode visualizar)
 */
export async function makeFolderPublic(folderId: string): Promise<void> {
  const drive = await getDriveClient()

  await drive.permissions.create({
    fileId: folderId,
    requestBody: {
      role: 'reader',
      type: 'anyone',
    },
    supportsAllDrives: true,
  })
}

/**
 * Obtém informações de um arquivo
 */
export async function getFileInfo(fileId: string): Promise<DriveFile> {
  const drive = await getDriveClient()

  const response = await drive.files.get({
    fileId,
    fields: 'id, name, webViewLink, thumbnailLink, mimeType, createdTime',
    supportsAllDrives: true,
  })

  return {
    id: response.data.id!,
    name: response.data.name!,
    webViewLink: response.data.webViewLink,
    thumbnailLink: response.data.thumbnailLink,
    mimeType: response.data.mimeType,
    createdTime: response.data.createdTime,
  }
}

/**
 * Retorna o conteúdo (stream) de um arquivo do Drive para exibição (ex.: imagens na galeria).
 * Use alt: 'media' para obter o binário; o navegador não consegue exibir webViewLink em <img>.
 */
export async function getFileContentStream(fileId: string): Promise<{
  stream: NodeJS.ReadableStream
  mimeType: string
}> {
  const drive = await getDriveClient()
  const info = await getFileInfo(fileId)
  const mimeType = info.mimeType || 'image/jpeg'

  const response = await drive.files.get(
    { fileId, alt: 'media', supportsAllDrives: true },
    { responseType: 'stream' }
  )

  return {
    stream: response.data as NodeJS.ReadableStream,
    mimeType,
  }
}
