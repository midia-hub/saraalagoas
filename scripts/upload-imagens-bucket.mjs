/**
 * Envia todas as imagens e o vídeo da página inicial para o bucket "imagens" do Supabase.
 * Requer: 1) Rodar supabase-bucket-imagens.sql no SQL Editor do Supabase
 *         2) .env com NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY
 * Uso: node scripts/upload-imagens-bucket.mjs
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')
const publicDir = join(root, 'public')

// Carregar .env
const envPath = join(root, '.env')
if (existsSync(envPath)) {
  const content = readFileSync(envPath, 'utf8')
  content.split('\n').forEach((line) => {
    const m = line.match(/^([^#=]+)=(.*)$/)
    if (m) {
      const v = m[2].trim().replace(/^["']|["']$/g, '')
      process.env[m[1].trim()] = v
    }
  })
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
if (!url || !key) {
  console.error('Defina NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY no .env')
  process.exit(1)
}

const supabase = createClient(url, key)
const BUCKET = 'imagens'

// Paths relativos ao public/ que são usados na página inicial (mesmo path no bucket)
const ASSETS = [
  'brand/logo.png',
  'hero-video.mp4',
  'kids/photo-1.jpg',
  'kids/photo-2.jpg',
  'leadership/frank.jpg',
  'leadership/betania.jpg',
  'revisao/photo-1.JPG',
  'revisao/photo-2.JPG',
  'revisao/photo-3.JPG',
  'revisao/photo-4.JPG',
  'revisao/photo-5.JPG',
  'revisao/photo-6.JPG',
]

async function upload() {
  console.log('Enviando mídias para o bucket "%s"...\n', BUCKET)
  for (const rel of ASSETS) {
    const localPath = join(publicDir, rel)
    if (!existsSync(localPath)) {
      console.warn('  [pulado] não encontrado: %s', rel)
      continue
    }
    const buffer = readFileSync(localPath)
    const contentType =
      rel.endsWith('.mp4') ? 'video/mp4' :
      rel.endsWith('.png') ? 'image/png' :
      rel.match(/\.(jpg|jpeg|JPG|JPEG)$/i) ? 'image/jpeg' : 'application/octet-stream'
    const { data, error } = await supabase.storage
      .from(BUCKET)
      .upload(rel, buffer, { contentType, upsert: true })
    if (error) {
      console.error('  [erro] %s: %s', rel, error.message)
      continue
    }
    console.log('  [ok] %s', rel)
  }
  console.log('\nConcluído.')
}

upload().catch((err) => {
  console.error(err)
  process.exit(1)
})
