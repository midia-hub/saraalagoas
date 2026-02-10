'use client'

import React from 'react'
import Link from 'next/link'
import { Camera } from 'lucide-react'
import SectionWrapper from './SectionWrapper'

export default function GallerySection() {
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
