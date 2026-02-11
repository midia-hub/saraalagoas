'use client'

import { useEffect, useState } from 'react'
import Lightbox from 'yet-another-react-lightbox'
import 'yet-another-react-lightbox/styles.css'
import type { PostDraft } from '../_lib/usePostDraft'

type DraftMedia = PostDraft['media'][number]

type ImageLightboxProps = {
  media: DraftMedia[]
  currentMedia: DraftMedia | null
  isOpen: boolean
  onClose: () => void
}

export function ImageLightbox({ media, currentMedia, isOpen, onClose }: ImageLightboxProps) {
  const [currentIndex, setCurrentIndex] = useState(0)

  useEffect(() => {
    if (currentMedia) {
      const index = media.findIndex((m) => m.id === currentMedia.id)
      if (index !== -1) {
        setCurrentIndex(index)
      }
    }
  }, [currentMedia, media])

  const slides = media.map((item) => ({
    src: item.url,
    alt: item.altText || item.filename || 'Imagem',
    title: item.filename,
    description: item.altText ? `Alt: ${item.altText}` : undefined,
  }))

  return (
    <Lightbox
      open={isOpen}
      close={onClose}
      slides={slides}
      index={currentIndex}
      on={{
        view: ({ index }) => setCurrentIndex(index),
      }}
      carousel={{
        finite: media.length <= 1,
      }}
      render={{
        buttonPrev: media.length <= 1 ? () => null : undefined,
        buttonNext: media.length <= 1 ? () => null : undefined,
      }}
      styles={{
        container: { backgroundColor: 'rgba(0, 0, 0, 0.9)' },
      }}
      controller={{
        closeOnBackdropClick: true,
      }}
    />
  )
}
