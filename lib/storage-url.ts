/**
 * URL pública de arquivos no bucket "imagens" do Supabase Storage.
 * Use para exibir na página inicial imagens e vídeos que estão no bucket.
 */

const BUCKET = 'imagens'

export function getStorageUrl(path: string): string {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL
  const cleanPath = path.replace(/^\//, '')
  if (!base) return `/${cleanPath}` // fallback: arquivos em public/
  return `${base}/storage/v1/object/public/${BUCKET}/${cleanPath}`
}

export function getStorageBucket(): string {
  return BUCKET
}
