'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'

export type CropMode = 'original' | '1:1' | '1.91:1' | '4:5'

export type PostDraft = {
  albumId: string
  /** IDs das instâncias (ex.: Instagram) selecionadas para publicar */
  selectedInstanceIds: string[]
  text: string
  media: Array<{
    id: string
    url: string
    thumbnailUrl?: string
    filename?: string
    cropMode?: CropMode
    altText?: string
    croppedUrl?: string
  }>
  updatedAt: string
}

/** Versão do rascunho para localStorage: sem URLs de imagem (data: ou longas) para não estourar quota */
type StoredDraft = {
  albumId: string
  selectedInstanceIds: string[]
  text: string
  media: Array<{
    id: string
    filename?: string
    cropMode?: CropMode
    altText?: string
  }>
  updatedAt: string
}

const EMPTY_DRAFT = (albumId: string): PostDraft => ({
  albumId,
  selectedInstanceIds: [],
  text: '',
  media: [],
  updatedAt: new Date().toISOString(),
})

/** URLs da galeria a partir do id do arquivo (não persistimos as URLs no storage) */
function galleryUrls(fileId: string) {
  const q = `fileId=${encodeURIComponent(fileId)}`
  return {
    url: `/api/gallery/image?${q}&mode=full`,
    thumbnailUrl: `/api/gallery/image?${q}&mode=thumb`,
  }
}

/** Reduz o draft para apenas o que cabe no localStorage (sem data URLs) */
function toStoredDraft(draft: PostDraft): StoredDraft {
  return {
    albumId: draft.albumId,
    selectedInstanceIds: draft.selectedInstanceIds,
    text: draft.text.length > 50000 ? draft.text.slice(0, 50000) : draft.text,
    media: draft.media.map((m) => ({
      id: m.id,
      filename: m.filename,
      cropMode: m.cropMode,
      altText: m.altText,
    })),
    updatedAt: draft.updatedAt,
  }
}

function parseDraft(raw: string | null, albumId: string): PostDraft {
  if (!raw) return EMPTY_DRAFT(albumId)
  try {
    const data = JSON.parse(raw) as Partial<StoredDraft> & { destination?: { facebook?: boolean; instagram?: boolean }; media?: Array<{ id: string; url?: string; thumbnailUrl?: string; filename?: string; cropMode?: CropMode; altText?: string }> }
    if (!data || data.albumId !== albumId) return EMPTY_DRAFT(albumId)
    const selectedInstanceIds = Array.isArray(data.selectedInstanceIds) ? data.selectedInstanceIds : []
    const text = typeof data.text === 'string' ? data.text : ''
    const updatedAt = typeof data.updatedAt === 'string' ? data.updatedAt : new Date().toISOString()
    const media = Array.isArray(data.media)
      ? data.media.map((m) => {
          const { url, thumbnailUrl } = galleryUrls(m.id)
          return {
            id: m.id,
            url: typeof m.url === 'string' && !m.url.startsWith('data:') ? m.url : url,
            thumbnailUrl: typeof m.thumbnailUrl === 'string' && !m.thumbnailUrl.startsWith('data:') ? m.thumbnailUrl : thumbnailUrl,
            filename: m.filename,
            cropMode: m.cropMode,
            altText: m.altText,
          }
        })
      : []
    return {
      albumId,
      selectedInstanceIds,
      text,
      media,
      updatedAt,
    }
  } catch {
    return EMPTY_DRAFT(albumId)
  }
}

function safeSetItem(key: string, value: string): boolean {
  try {
    window.localStorage.setItem(key, value)
    return true
  } catch (e) {
    if (e instanceof DOMException && (e.name === 'QuotaExceededError' || e.code === 22)) {
      try {
        window.localStorage.removeItem(key)
        window.localStorage.setItem(key, value)
        return true
      } catch {
        return false
      }
    }
    return false
  }
}

export function usePostDraft(albumId: string) {
  const storageKey = useMemo(() => `postDraft:${albumId}`, [albumId])
  const [ready, setReady] = useState(false)
  const [draft, setDraft] = useState<PostDraft>(() => EMPTY_DRAFT(albumId))

  useEffect(() => {
    if (!albumId) return
    const loaded = parseDraft(window.localStorage.getItem(storageKey), albumId)
    setDraft(loaded)
    setReady(true)
  }, [albumId, storageKey])

  const saveDraft = useCallback(
    (next: PostDraft) => {
      const value: PostDraft = { ...next, updatedAt: new Date().toISOString() }
      setDraft(value)
      const stored = toStoredDraft(value)
      safeSetItem(storageKey, JSON.stringify(stored))
    },
    [storageKey]
  )

  const patchDraft = useCallback(
    (patch: Partial<PostDraft>) => {
      setDraft((prev) => {
        const next: PostDraft = {
          ...prev,
          ...patch,
          albumId,
          updatedAt: new Date().toISOString(),
        }
        const stored = toStoredDraft(next)
        safeSetItem(storageKey, JSON.stringify(stored))
        return next
      })
    },
    [albumId, storageKey]
  )

  const clearDraft = useCallback(() => {
    window.localStorage.removeItem(storageKey)
    setDraft(EMPTY_DRAFT(albumId))
  }, [albumId, storageKey])

  return { ready, draft, setDraft: saveDraft, patchDraft, clearDraft }
}

