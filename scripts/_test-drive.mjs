import path from 'path'
import fs from 'fs'
import { google } from 'googleapis'

// Carregar .env
const envLines = fs.readFileSync('.env', 'utf8').split('\n')
const env = {}
for (const line of envLines) {
  const m = line.match(/^([A-Z_0-9]+)=(.+)$/)
  if (m) env[m[1]] = m[2].trim()
}

const credPath = path.resolve(process.cwd(), env.GOOGLE_APPLICATION_CREDENTIALS || 'config/midia-api-service-account.json')
const creds = JSON.parse(fs.readFileSync(credPath, 'utf8'))
const auth = new google.auth.GoogleAuth({ credentials: creds, scopes: ['https://www.googleapis.com/auth/drive'] })
const drive = google.drive({ version: 'v3', auth })

const rootId = env.GOOGLE_DRIVE_ROOT_FOLDER_ID
console.log('SA:', creds.client_email)
console.log('Root folder ID:', rootId)

try {
  const r = await drive.files.get({ fileId: rootId, fields: 'id,name,owners,permissions', supportsAllDrives: true })
  console.log('Pasta raiz OK:', r.data.name)
} catch (e) {
  console.log('ERRO pasta raiz:', e.code, e.message)
}

try {
  const r = await drive.files.list({
    q: `'${rootId}' in parents and trashed = false`,
    fields: 'files(id,name)',
    pageSize: 3,
    supportsAllDrives: true,
    includeItemsFromAllDrives: true,
  })
  console.log('Arquivos na pasta raiz:', JSON.stringify(r.data.files?.slice(0,3)))
} catch (e) {
  console.log('ERRO lista:', e.code, e.message)
}

// Testar thumbnail do arquivo recente com token
try {
  const token = await auth.getAccessToken()
  const tkStr = typeof token === 'string' ? token : token?.token
  console.log('Token obtido:', tkStr ? 'sim ('+tkStr.length+' chars)' : 'NAO')
  
  // Testar thumbnail_link do banco
  const thumbUrl = 'https://lh3.googleusercontent.com/drive-storage/AJQWtBPBilXmDNd-0P0V7w1KZzD7TwL9yd9aNyZo3qcXm6Lk7aR0AyusaW25jGKEpk3bGpGGgs29dcWbxiKM2SPfZ9vc_fY1sbui5TKA0S6uy0Lz2QH4AA=s220'
  const res = await fetch(thumbUrl, { headers: { Authorization: `Bearer ${tkStr}` } })
  console.log('Thumbnail com token:', res.status, res.headers.get('content-type'))
} catch (e) {
  console.log('ERRO token:', e.message)
}
