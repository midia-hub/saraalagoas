'use client'

import React from 'react'
import Image from 'next/image'
import { Sparkles } from 'lucide-react'
import Button from './Button'
import SectionWrapper from './SectionWrapper'
import { useSiteConfig } from '@/lib/site-config-context'
import { getWhatsAppUrl } from '@/lib/whatsapp'

export default function ImmersionSection() {
  const { config } = useSiteConfig()
  return (
    <SectionWrapper id="revisao" bgColor="white">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-sara-red/10 rounded-full mb-6">
            <Sparkles className="text-sara-red" size={40} />
          </div>
          
          <h2 className="text-4xl md:text-5xl font-bold text-sara-gray-dark mb-6">
            {config.immersion.title}
          </h2>
          
          <p className="text-lg text-gray-600 mb-8 max-w-3xl mx-auto">
            {config.immersion.description}
          </p>
        </div>
        
        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-12">
          {config.immersion.features.map((feature, index) => (
            <div
              key={index}
              className="flex items-center gap-3 bg-gray-50 px-4 py-3 rounded-lg"
            >
              <div className="w-2 h-2 bg-sara-red rounded-full flex-shrink-0" />
              <span className="text-sara-gray-dark font-medium">{feature}</span>
            </div>
          ))}
        </div>
        
        {/* Galeria de Fotos */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-12">
          {config.immersion.images.map((image, index) => (
            <div
              key={index}
              className="relative aspect-square rounded-lg overflow-hidden group"
            >
              <Image
                src={image}
                alt={`Revisão/Imersão foto ${index + 1}`}
                fill
                sizes="(max-width: 768px) 50vw, 33vw"
                className="object-cover group-hover:scale-110 transition-transform duration-300"
              />
            </div>
          ))}
        </div>
        
        <div className="text-center">
          <Button
            variant="primary"
            size="lg"
            asLink
            href={getWhatsAppUrl(config.whatsappNumber, config.whatsappMessages.immersion)}
          >
            QUERO SABER MAIS
          </Button>
        </div>
      </div>
    </SectionWrapper>
  )
}
