'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Camera } from 'lucide-react'
import SectionWrapper from './SectionWrapper'

const THUMB_SIZE = 280

export default function GallerySection() {
  const [photoIds, setPhotoIds] = useState<string[]>([])

  useEffect(() => {
    fetch('/api/gallery/recent-photos')
      .then((res) => res.json())
      .then((ids) => setPhotoIds(Array.isArray(ids) ? ids : []))
      .catch(() => setPhotoIds([]))
  }, [])

  return (
    <SectionWrapper id="galeria" bgColor="white">
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-sara-red/10 rounded-full mb-6">
          <Camera className="text-sara-red" size={32} />
        </div>
        <h2 className="text-4xl md:text-5xl font-bold text-sara-gray-dark mb-4">
          Galeria de Fotos
        </h2>
        <p className="text-lg text-sara-gray-light max-w-2xl mx-auto mb-8">
          Confira as fotos dos nossos cultos e eventos. Acesse os álbuns e reviva os momentos.
        </p>

        {photoIds.length > 0 && (
          <div className="mb-10 overflow-hidden">
            <div className="flex gap-3 animate-gallery-scroll w-max" style={{ animationDuration: `${Math.max(photoIds.length * 4, 24)}s` }}>
              {[...photoIds, ...photoIds].map((id, i) => (
                <div key={`${id}-${i}`} className="flex-shrink-0 rounded-lg overflow-hidden shadow-md">
                  <Image
                    src={`/api/gallery/image?fileId=${encodeURIComponent(id)}&mode=thumb&size=${THUMB_SIZE}`}
                    alt=""
                    width={THUMB_SIZE}
                    height={Math.round(THUMB_SIZE * 0.75)}
                    className="object-cover w-[180px] h-[135px] md:w-[220px] md:h-[165px]"
                    unoptimized
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        <Link
          href="/galeria"
          className="inline-flex items-center gap-2 rounded-lg bg-sara-red px-6 py-3 text-white font-semibold hover:bg-sara-red/90 transition-colors"
        >
          Ver galeria de fotos
        </Link>
      </div>
    </SectionWrapper>
  )
}
