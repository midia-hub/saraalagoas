/** Cache em memória para listagem de arquivos por galeria (GET /api/gallery/[id]/files). */
type CacheEntry = { expiresAt: number; data: unknown[] }
const CACHE_MS = 5 * 60 * 1000
const cache = new Map<string, CacheEntry>()

export function getCachedFiles(galleryId: string): unknown[] | null {
  const entry = cache.get(galleryId)
  if (!entry || entry.expiresAt <= Date.now()) return null
  return entry.data
}

export function setCachedFiles(galleryId: string, data: unknown[]): void {
  cache.set(galleryId, { expiresAt: Date.now() + CACHE_MS, data })
}

export function invalidateGalleryFilesCache(galleryId: string): void {
  cache.delete(galleryId)
}
