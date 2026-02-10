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

function parseDraft(raw: string | null, albumId: string): PostDraft {
  if (!raw) return EMPTY_DRAFT(albumId)
  try {
    const data = JSON.parse(raw) as Partial<PostDraft> & { destination?: { facebook?: boolean; instagram?: boolean } }
    if (!data || data.albumId !== albumId) return EMPTY_DRAFT(albumId)
    const selectedInstanceIds = Array.isArray(data.selectedInstanceIds) ? data.selectedInstanceIds : []
    return {
      ...EMPTY_DRAFT(albumId),
      ...data,
      albumId,
      selectedInstanceIds,
      media: Array.isArray(data.media) ? data.media : [],
      text: typeof data.text === 'string' ? data.text : '',
      updatedAt: typeof data.updatedAt === 'string' ? data.updatedAt : new Date().toISOString(),
    }
  } catch {
    return EMPTY_DRAFT(albumId)
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
      const value = { ...next, updatedAt: new Date().toISOString() }
      setDraft(value)
      window.localStorage.setItem(storageKey, JSON.stringify(value))
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
        window.localStorage.setItem(storageKey, JSON.stringify(next))
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

